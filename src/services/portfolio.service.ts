import {
  Pm_portfoliosService,
  Pm_programmesService,
  Pm_projectsService,
} from '@/generated'
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
  pm_portfolioowner: item.pm_portfolioowner,
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

export async function fetchPortfolioHierarchy(): Promise<ProjectHierarchy> {
  const [portfoliosResult, programmesResult, projectsResult] = await Promise.all([
    Pm_portfoliosService.getAll({ select: ['pm_portfolioid', 'pm_portfolioname', 'pm_portfolioowner', 'pm_portfoliostatus', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_portfoliodescription', 'pm_strategicobjective', 'pm_prioritylevel', 'pm_businessunit', 'pm_createdon'], top: 200 }),
    Pm_programmesService.getAll({ select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_programmemanager', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'], top: 500 }),
    Pm_projectsService.getAll({ select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_approvedbudgeteur', 'pm_actualcosteur'], top: 1000 }),
  ])

  const rawPortfolios = unwrapList<Pm_portfolios>(portfoliosResult).map(mapPortfolio)
  const rawProgrammes = unwrapList<Pm_programmes>(programmesResult).map(mapProgramme)
  const projects = unwrapList<Pm_projects>(projectsResult).map(mapProject)

  const portfolioMap = new Map<string, PortfolioModel>()
  for (const p of rawPortfolios) {
    if (p.pm_portfolioid) portfolioMap.set(normalizeLookupId(p.pm_portfolioid)!, p)
  }

  const programmeMap = new Map<string, ProgrammeModel>()
  for (const pr of rawProgrammes) {
    if (pr.pm_programmeid) programmeMap.set(normalizeLookupId(pr.pm_programmeid)!, pr)
  }

  // 1. Roll up Projects -> Programmes & Portfolios
  for (const proj of projects) {
    const programmeId = normalizeLookupId(proj._pm_programme_value)
    const portfolioId = normalizeLookupId(proj._pm_portfolio_value)

    if (programmeId && programmeMap.has(programmeId)) {
      const prog = programmeMap.get(programmeId)!
      // In this app, we'll sum up Project "Approved Budget" and "Actual Cost" 
      // into the Programme's "Budget" and "Actual Spend" if the Programme fields are empty or for virtual rollup
      // Actually, let's keep the original fields but add "Calculated" fields if needed.
      // For now, let's ensure the links are correct
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

  const updatedProgrammes = rawProgrammes.map(prog => {
    const progId = normalizeLookupId(prog.pm_programmeid)
    const childProjects = projects.filter(p => normalizeLookupId(p._pm_programme_value) === progId)

    if (childProjects.length > 0) {
      const aggregates = aggregateFinancials(childProjects, 'pm_approvedbudgeteur', 'pm_actualcosteur')
      return {
        ...prog,
        pm_budgeteur: aggregates.budget > 0 ? aggregates.budget : prog.pm_budgeteur,
        pm_actualspendeur: aggregates.actual > 0 ? aggregates.actual : prog.pm_actualspendeur,
      }
    }
    return prog
  })

  try {
    console.debug('[dataverseService] fetchPortfolioHierarchy rollup complete:', { portfolios: updatedPortfolios.length, programmes: updatedProgrammes.length, projects: projects.length })
  } catch (e) {}

  return {
    portfolios: updatedPortfolios,
    programmes: updatedProgrammes,
    projects: projects,
  }
}

export async function createPortfolio(payload: Partial<PortfolioModel>): Promise<PortfolioModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_portfoliosService.create({ ...defaults, ...cleanPayload } as any)
    try { console.debug('[dataverseService] createPortfolio payload/result:', cleanPayload, result) } catch (e) {}
    const item = unwrapSingle<Pm_portfolios>(result)
    if (item) {
      return mapPortfolio(item)
    }
    try {
      console.warn('[dataverseService] createPortfolio: unwrapSingle returned null. Raw result:', JSON.stringify(result, null, 2))
    } catch (e) {
      console.warn('[dataverseService] createPortfolio: unwrapSingle returned null. Raw result (non-serializable):', result)
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
