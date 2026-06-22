import {
  Pm_portfoliosService,
  Pm_programmesService,
  Pm_projectsService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import {
  unwrapList,
  unwrapSingle,
  normalizeLookupId,
  aggregateFinancials,
} from '@/services/common'
import type { ProjectHierarchy } from '@/services/common'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import { mapProgramme } from './programme.service'
import { mapProject } from './project.service'

export const mapPortfolio = (item: Pm_portfolios): PortfolioModel => ({
  pm_portfolioid: item.pm_portfolioid,
  pm_portfolioname: item.pm_portfolioname,
  pm_ownerlookup: item._pm_ownerlookup_value,
  pm_ownerlookupname: item.pm_ownerlookupname || (item as any)['_pm_ownerlookup_value@OData.Community.Display.V1.FormattedValue'],
  pm_portfoliostatus: item.pm_portfoliostatus,
  pm_ragstatus: item.pm_ragstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_approvedbudgeteur: item.pm_approvedbudgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_portfoliodescription: item.pm_portfoliodescription,
  pm_strategicobjective: item.pm_strategicobjective,
  pm_prioritylevel: item.pm_prioritylevel,
  pm_businessunit: item.pm_businessunit,
  pm_createdon: item.pm_createdon,
})

export async function fetchPortfolios(): Promise<PortfolioModel[]> {
  const result = await Pm_portfoliosService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_portfolioid', 'pm_portfolioname', 'pm_ragstatus', 'pm_approvedbudgeteur', 'pm_actualspendeur', '_pm_ownerlookup_value', 'pm_ownerlookupname'],
    top: 500,
  })
  return unwrapList<Pm_portfolios>(result).map(mapPortfolio)
}

export async function fetchPortfolioHierarchy(): Promise<ProjectHierarchy> {
  const [portfoliosResult, programmesResult, projectsResult] = await Promise.all([
    Pm_portfoliosService.getAll({ filter: 'statecode eq 0', select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value', 'pm_portfoliostatus', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_portfoliodescription', 'pm_strategicobjective', 'pm_prioritylevel', 'pm_businessunit', 'pm_createdon'], top: 200 }),
    Pm_programmesService.getAll({ filter: 'statecode eq 0', select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', '_pm_programmemanager_value', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'], top: 500 }),
    Pm_projectsService.getAll({ filter: 'statecode eq 0', select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', '_pm_projectmanager_value', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_approvedbudgeteur', 'pm_actualcosteur'], top: 1000 }),
  ])
  let projects = unwrapList<Pm_projects>(projectsResult).map(mapProject)

  // Fallback: if statecode eq 0 returns empty, try without filter (some environments don't support statecode)
  if (projects.length === 0) {
    const fallback = await Pm_projectsService.getAll({
      select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', '_pm_projectmanager_value', 'pm_projectmanagername', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_approvedbudgeteur', 'pm_actualcosteur'],
      top: 1000,
    })
    projects = unwrapList<Pm_projects>(fallback).map(mapProject)
  }

  const rawPortfolios = unwrapList<Pm_portfolios>(portfoliosResult).map(mapPortfolio)
  const rawProgrammes = unwrapList<Pm_programmes>(programmesResult).map(mapProgramme)

  const portfolioMap = new Map<string, PortfolioModel>()
  for (const p of rawPortfolios) {
    if (p.pm_portfolioid) portfolioMap.set(normalizeLookupId(p.pm_portfolioid)!, p)
  }

  const programmeMap = new Map<string, ProgrammeModel>()
  for (const pr of rawProgrammes) {
    if (pr.pm_programmeid) programmeMap.set(normalizeLookupId(pr.pm_programmeid)!, pr)
  }

  // 1. Roll up relationship names (Programmes -> Portfolios, Projects -> Programmes & Portfolios)
  for (const prog of rawProgrammes) {
    const portfolioId = normalizeLookupId(prog._pm_portfolio_value)
    if (portfolioId && portfolioMap.has(portfolioId)) {
      prog.pm_portfolioname = portfolioMap.get(portfolioId)!.pm_portfolioname
    }
  }

  for (const proj of projects) {
    const programmeId = normalizeLookupId(proj._pm_programme_value)
    const portfolioId = normalizeLookupId(proj._pm_portfolio_value)

    if (programmeId && programmeMap.has(programmeId)) {
      const prog = programmeMap.get(programmeId)!
      proj.pm_programmename = prog.pm_programmename
    }

    if (portfolioId && portfolioMap.has(portfolioId)) {
      const port = portfolioMap.get(portfolioId)!
      proj.pm_portfolioname = port.pm_portfolioname
    }
  }

  // 2. Perform Virtual Financial Aggregation for the hierarchy view
  // We will iterate through Portfolios and sum up their child Projects' financials
  const updatedPortfolios = rawPortfolios.map(port => {
    const portId = normalizeLookupId(port.pm_portfolioid)
    const childProjects = projects.filter(p => normalizeLookupId(p._pm_portfolio_value) === portId)

    if (childProjects.length > 0) {
      const aggregates = aggregateFinancials(childProjects, 'pm_approvedbudgeteur', 'pm_actualcosteur')
      // Only override if the original record has 0/null to avoid confusing manual entries, 
      // OR provide them as the source of truth for the dashboard.
      // Let's use the aggregated values for the UI consistency.
      return {
        ...port,
        pm_approvedbudgeteur: aggregates.budget > 0 ? aggregates.budget : port.pm_approvedbudgeteur,
        pm_actualspendeur: aggregates.actual > 0 ? aggregates.actual : port.pm_actualspendeur,
      }
    }
    return port
  })

  const updatedProgrammes = rawProgrammes.map(prog => prog)

  return {
    portfolios: updatedPortfolios,
    programmes: updatedProgrammes,
    projects: projects,
  }
}

export async function updatePortfolio(id: string, changes: Partial<PortfolioModel>): Promise<PortfolioModel | null> {
  const normalizedId = normalizeLookupId(id)
  if (!normalizedId) return null

  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && key !== 'pm_portfolioid') {
      if (key === 'pm_ownerlookup') {
        cleanPayload['pm_OwnerLookup@odata.bind'] = `/systemusers(${value})`
      } else {
        cleanPayload[key] = value
      }
    }
  }

  let original: PortfolioModel | null = null
  try {
    const details = await Pm_portfoliosService.get(normalizedId, {
      select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value', 'pm_portfoliostatus', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_portfoliodescription', 'pm_strategicobjective', 'pm_prioritylevel', 'pm_businessunit'],
    })
    const uItem = unwrapSingle<Pm_portfolios>(details)
    if (uItem) original = mapPortfolio(uItem)
  } catch (e) { }

  try {
    const result = await Pm_portfoliosService.update(normalizedId, cleanPayload as any)

    // Log audit entries for changed fields
    if (original) {
      const formatVal = (val: any): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }

      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_portfolioid') continue
        const oldVal = (original as any)[key]
        if (formatVal(oldVal) !== formatVal(value)) {
          const isStatus = key === 'pm_portfoliostatus' || key === 'statuscode' || key === 'statecode'
          writeAuditLog({
            actionType: isStatus ? 'StatusChange' : 'Update',
            entityName: 'pm_portfolios',
            recordId: normalizedId,
            recordName: original.pm_portfolioname || '',
            fieldName: key,
            oldValue: formatVal(oldVal),
            newValue: formatVal(value)
          })
        }
      }
    }

    // ALWAYS fetch fresh full details after update
    const fresh = await Pm_portfoliosService.get(normalizedId, {
      select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value', 'pm_portfoliostatus', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_portfoliodescription', 'pm_strategicobjective', 'pm_prioritylevel', 'pm_businessunit', 'pm_createdon'],
    })
    const item = unwrapSingle<Pm_portfolios>(fresh)
    return item ? mapPortfolio(item) : null
  } catch (err) {
    try { console.error('[dataverseService] updatePortfolio failed:', err) } catch (e) { }
    throw err
  }
}
export async function updatePortfolioStatus(id: string, status: number): Promise<void> {

  let recordName = id
  let oldStatusStr = ''
  try {
    const details = await Pm_portfoliosService.get(id, { select: ['pm_portfolioname', 'pm_portfoliostatus'] })
    const item = unwrapSingle<Pm_portfolios>(details)
    if (item) {
      if (item.pm_portfolioname) recordName = item.pm_portfolioname
      oldStatusStr = String(item.pm_portfoliostatus ?? '')
    }
  } catch (e) { }

  await Pm_portfoliosService.update(id, { pm_portfoliostatus: status } as any)

  writeAuditLog({
    actionType: 'StatusChange',
    entityName: 'pm_portfolios',
    recordId: id,
    recordName: recordName,
    fieldName: 'pm_portfoliostatus',
    oldValue: oldStatusStr,
    newValue: String(status)
  })
}

export async function createPortfolio(payload: Partial<PortfolioModel>): Promise<PortfolioModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      if (key === 'pm_ownerlookup') {
        cleanPayload['pm_OwnerLookup@odata.bind'] = `/systemusers(${value})`
      } else {
        cleanPayload[key] = value
      }
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_portfoliosService.create({ ...defaults, ...cleanPayload } as any)
    const item = unwrapSingle<Pm_portfolios>(result)
    if (item) {
      if (item.pm_portfolioid) {
        writeAuditLog({
          actionType: 'Create',
          entityName: 'pm_portfolios',
          recordId: item.pm_portfolioid,
          recordName: item.pm_portfolioname || '',
          newValue: `Portfolio created: ${item.pm_portfolioname || ''}`
        })
      }
      return mapPortfolio(item)
    }
    return null
  } catch (err: any) {
    try {
      console.error('[dataverseService] createPortfolio: API call failed:', err?.message || err, '| payload:', JSON.stringify(cleanPayload))
    } catch (e) {
      console.error('[dataverseService] createPortfolio: API call failed (unable to serialize):', err)
    }
    throw err
  }
}
