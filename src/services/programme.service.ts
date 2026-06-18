import {
  Pm_programmesService,
  Pm_portfoliosService,
  Pm_projectsService,
  Pm_risksService,
  Pm_issuesService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { Pm_risks } from '@/generated/models/Pm_risksModel'
import type { Pm_issues } from '@/generated/models/Pm_issuesModel'
import type {
  ProgrammeModel,
  ProjectModel,
  RiskModel,
  IssueModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { mapProject } from './project.service'

export const mapProgramme = (item: Pm_programmes): ProgrammeModel => ({
  pm_programmeid: item.pm_programmeid,
  pm_programmename: item.pm_programmename,
  _pm_portfolio_value: item._pm_portfolio_value,
  pm_programmephase: item.pm_programmephase,
  pm_ragstatus: item.pm_ragstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_portfolioname: item.pm_portfolioname || (item as any)['_pm_portfolio_value@OData.Community.Display.V1.FormattedValue'],
  pm_programmemanager: item._pm_programmemanager_value,
  pm_programmemanagername: item.pm_programmemanagername || (item as any)['_pm_programmemanager_value@OData.Community.Display.V1.FormattedValue'],
  _pm_programmemanager_value: item._pm_programmemanager_value,
  pm_sponsorname: item.pm_sponsorname,
  pm_programmedescription: item.pm_programmedescription,
  pm_budgeteur: item.pm_budgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_businessunit: item.pm_businessunit,
})

export async function createProgramme(payload: Partial<ProgrammeModel>): Promise<ProgrammeModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
      key !== 'pm_programmemanager' && key !== '_pm_portfolio_value') {
      cleanPayload[key] = value
    }
  }

  if (payload.pm_programmemanager) {
    cleanPayload['pm_ProgrammeManager@odata.bind'] = `/systemusers(${normalizeLookupId(payload.pm_programmemanager)})`
  }
  if (payload._pm_portfolio_value) {
    cleanPayload['pm_portfolio@odata.bind'] = `/pm_portfolios(${normalizeLookupId(payload._pm_portfolio_value)})`
  }

  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_programmesService.create({ ...defaults, ...cleanPayload } as any)
    const item = unwrapSingle<Pm_programmes>(result)
    if (item && item.pm_programmeid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_programmes',
        recordId: item.pm_programmeid,
        recordName: item.pm_programmename || '',
        newValue: `Programme created: ${item.pm_programmename || ''}`
      })
    }
    return item ? mapProgramme(item) : null
  } catch (err: any) {
    console.error('[dataverseService] createProgramme failed:', err)
    throw err
  }
}

export async function updateProgramme(id: string, changes: Partial<ProgrammeModel>): Promise<ProgrammeModel | null> {
  const normalizedId = normalizeLookupId(id)
  if (!normalizedId) return null

  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && key !== 'pm_programmeid' &&
      key !== 'pm_programmemanager' && key !== '_pm_portfolio_value') {
      cleanPayload[key] = value
    }
  }

  if (changes.pm_programmemanager) {
    cleanPayload['pm_ProgrammeManager@odata.bind'] = `/systemusers(${normalizeLookupId(changes.pm_programmemanager)})`
  }
  if (changes._pm_portfolio_value) {
    cleanPayload['pm_portfolio@odata.bind'] = `/pm_portfolios(${normalizeLookupId(changes._pm_portfolio_value)})`
  }

  let original: ProgrammeModel | null = null
  try {
    const details = await Pm_programmesService.get(normalizedId, {
      select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', '_pm_programmemanager_value', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'],
    })
    const uItem = unwrapSingle<Pm_programmes>(details)
    if (uItem) original = mapProgramme(uItem)
  } catch (e) { }

  try {
    const result = await Pm_programmesService.update(normalizedId, cleanPayload as any)
    try { console.debug('[dataverseService] updateProgramme result:', result) } catch (e) { }

    // Log audit entries for changed fields
    if (original) {
      const formatVal = (val: any): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }

      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_programmeid') continue
        const oldVal = (original as any)[key]
        if (formatVal(oldVal) !== formatVal(value)) {
          const isStatus = key === 'pm_programmephase' || key === 'statuscode' || key === 'statecode'
          writeAuditLog({
            actionType: isStatus ? 'StatusChange' : 'Update',
            entityName: 'pm_programmes',
            recordId: normalizedId,
            recordName: original.pm_programmename || '',
            fieldName: key,
            oldValue: formatVal(oldVal),
            newValue: formatVal(value)
          })
        }
      }
    }

    // ALWAYS fetch fresh full details after update
    const fresh = await Pm_programmesService.get(normalizedId, {
      select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', '_pm_programmemanager_value', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'],
    })
    const item = unwrapSingle<Pm_programmes>(fresh)
    return item ? mapProgramme(item) : null
  } catch (err) {
    try { console.error('[dataverseService] updateProgramme failed:', err) } catch (e) { }
    throw err
  }
}

export async function updateProgrammePhase(id: string, phase: number): Promise<void> {
  try { console.debug('[dataverseService] updateProgrammePhase:', { id, phase }) } catch (e) { }

  let recordName = id
  let oldPhaseStr = ''
  try {
    const details = await Pm_programmesService.get(id, { select: ['pm_programmename', 'pm_programmephase'] })
    const item = unwrapSingle<Pm_programmes>(details)
    if (item) {
      if (item.pm_programmename) recordName = item.pm_programmename
      oldPhaseStr = String(item.pm_programmephase ?? '')
    }
  } catch (e) { }

  await Pm_programmesService.update(id, { pm_programmephase: phase } as any)

  writeAuditLog({
    actionType: 'StatusChange',
    entityName: 'pm_programmes',
    recordId: id,
    recordName: recordName,
    fieldName: 'pm_programmephase',
    oldValue: oldPhaseStr,
    newValue: String(phase)
  })
}

export async function deleteProgramme(id: string): Promise<void> {
  let recordName = id
  try {
    const details = await Pm_programmesService.get(id, { select: ['pm_programmename'] })
    const item = unwrapSingle<Pm_programmes>(details)
    if (item?.pm_programmename) recordName = item.pm_programmename
  } catch (e) { }

  await Pm_programmesService.delete(id)

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_programmes',
    recordId: id,
    recordName: recordName,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted'
  })
}

export interface ProgrammeDetail {
  programme: ProgrammeModel | null
  projects: ProjectModel[]
  risks: RiskModel[]
  issues: IssueModel[]
}

const mapRisk = (item: Pm_risks): RiskModel => ({
  pm_riskid: item.pm_riskid,
  pm_risktitle: item.pm_risktitle,
  pm_riskcategory: item.pm_riskcategory,
  pm_riskdescription: item.pm_riskdescription,
  pm_ragstatus: item.pm_ragstatus,
  pm_riskownername: (item as any)['_pm_riskowner_value@OData.Community.Display.V1.FormattedValue'] ?? item.pm_riskownername,
  pm_riskstatus: item.pm_riskstatus,
  pm_escalated: item.pm_escalated,
  pm_identifieddate: item.pm_identifieddate,
  pm_targetclosedate: item.pm_targetclosedate,
  pm_inherentscore: item.pm_inherentscore,
  pm_residualscore: item.pm_residualscore,
  _pm_project_value: item._pm_project_value,
  _pm_riskowner_value: item._pm_riskowner_value,
})


const mapIssue = (item: Pm_issues): IssueModel => ({
  pm_issueid: item.pm_issueid,
  pm_issuetitle: item.pm_issuetitle,
  pm_issuedescription: item.pm_issuedescription,
  pm_issuecategory: item.pm_issuecategory,
  pm_ragstatus: item.pm_ragstatus,
  pm_issueowner: item.pm_issueownername ?? (typeof item.pm_issueowner === 'string' ? item.pm_issueowner : undefined),
  pm_issuestatus: item.pm_issuestatus,
  pm_escalationstatus: item.pm_escalationstatus,
  pm_prioritylevel: item.pm_prioritylevel,
  pm_dateraised: item.pm_dateraised,
  pm_targetresolutiondate: item.pm_targetresolutiondate,
})


export async function fetchProgrammeDetails(programmeId: string): Promise<ProgrammeDetail> {
  const normalizedId = normalizeLookupId(programmeId)
  if (!normalizedId) {
    return { programme: null, projects: [], risks: [], issues: [] }
  }

  const progResult = await Pm_programmesService.get(normalizedId, {
    select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', '_pm_programmemanager_value', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'],
  })
  console.log('fetchProgrammeDetails - raw programme result:', progResult)
  const programme = mapProgramme(unwrapSingle<Pm_programmes>(progResult) ?? ({} as Pm_programmes))

  if (!programme.pm_portfolioname && programme._pm_portfolio_value) {
    try {
      const portfolioId = normalizeLookupId(programme._pm_portfolio_value)
      if (portfolioId) {
        const portfolioResult = await Pm_portfoliosService.get(portfolioId, {
          select: ['pm_portfolioid', 'pm_portfolioname'],
        })
        const portfolio = unwrapSingle<Pm_portfolios>(portfolioResult)
        if (portfolio?.pm_portfolioname) {
          programme.pm_portfolioname = portfolio.pm_portfolioname
        }
      }
    } catch (e) {
      console.warn('[dataverseService] fetchProgrammeDetails: failed to resolve portfolio name', e)
    }
  }

  const projectsResult = await Pm_projectsService.getAll({
    filter: `_pm_programme_value eq '${normalizedId}'`,
    select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_projectmanager_value', 'pm_projectphase', 'pm_ragstatus', 'pm_percentcomplete', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_approvedbudgeteur', 'pm_actualcosteur'],
    top: 200,
  })
  console.log('fetchProgrammeDetails - raw projects result:', projectsResult)
  const projects = unwrapList<Pm_projects>(projectsResult).map(mapProject)
  const projectIds = projects.map(p => p.pm_projectid).filter(Boolean) as string[]

  // Fetch risks & issues linked through projects (programme FK removed from risk/issue schema)
  let risks: RiskModel[] = []
  let issues: IssueModel[] = []
  if (projectIds.length > 0) {
    const projectFilter = projectIds.map(id => `_pm_project_value eq '${id}'`).join(' or ')
    const [risksResult, issuesResult] = await Promise.all([
      Pm_risksService.getAll({
        filter: `(${projectFilter}) and statecode eq 0`,
        select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskstatus', 'pm_escalated', 'pm_identifieddate', 'pm_targetclosedate', 'pm_inherentscore', 'pm_residualscore', '_pm_project_value', '_pm_riskowner_value'],
        top: 200,
      }),
      Pm_issuesService.getAll({
        filter: `(${projectFilter}) and statecode eq 0`,
        select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel', 'pm_dateraised', 'pm_targetresolutiondate'],
        top: 200,
      }),
    ])
    risks = unwrapList<Pm_risks>(risksResult).map(mapRisk)
    issues = unwrapList<Pm_issues>(issuesResult).map(mapIssue)
  }

  return {
    programme,
    projects,
    risks,
    issues,
  }
}
