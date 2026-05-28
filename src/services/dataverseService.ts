import {
  Pm_initiativesService,
  Pm_portfoliosService,
  Pm_programmesService,
  Pm_projectmilestonesService,
  Pm_projectsService,
  Pm_projecttasksService,
  Pm_resourcesService,
  Pm_resourceallocationsService,
  Pm_timesheetsService,
  Pm_timesheetentriesService,
  Pm_risksService,
  Pm_issuesService,
} from '../generated'
import type { Pm_initiatives } from '../generated/models/Pm_initiativesModel'
import type { Pm_portfolios } from '../generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '../generated/models/Pm_programmesModel'
import type { Pm_projectmilestones } from '../generated/models/Pm_projectmilestonesModel'
import type { Pm_projects } from '../generated/models/Pm_projectsModel'
import type { Pm_projecttasks } from '../generated/models/Pm_projecttasksModel'
import type { Pm_resources } from '../generated/models/Pm_resourcesModel'
import type { Pm_resourceallocations } from '../generated/models/Pm_resourceallocationsModel'
import type { Pm_timesheetentries } from '../generated/models/Pm_timesheetentriesModel'
import type { Pm_risks } from '../generated/models/Pm_risksModel'
import type { Pm_issues } from '../generated/models/Pm_issuesModel'
import type {
  InitiativeModel,
  PortfolioModel,
  ProgrammeModel,
  ProjectMilestoneModel,
  ProjectModel,
  ProjectTaskModel,
  RiskModel,
  IssueModel,
} from '../models/dataverse'

const unwrapList = <T>(result: any): T[] => {
  if (!result) return []
  if ('value' in result) return result.value as T[]
  if ('data' in result) return result.data as T[]
  if (Array.isArray(result)) return result
  return []
}

const unwrapSingle = <T>(result: any): T | null => {
  if (!result) return null
  if ('value' in result) return result.value as T
  if ('data' in result) return result.data as T
  return result as T
}

const ragLabel = (code?: string | number): string => {
  if (code === '2' || code === 2) return 'Red'
  if (code === '1' || code === 1) return 'Green'
  if (code === '0' || code === 0) return 'Amber'
  return 'NotSet'
}

const projectPhaseLabel = (code?: string | number): string => {
  if (code === '0' || code === 0) return 'Execution'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Closure'
  return 'Unknown'
}

const programmePhaseLabel = (code?: string | number): string => {
  if (code === '0' || code === 0) return 'Delivery'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Initiation'
  return 'Unknown'
}

const normalizeLookupId = (id?: string): string | undefined => {
  if (!id) return undefined
  return id.replace(/[{}]/g, '').trim().toLowerCase()
}

const normalizeLookupName = (name?: string): string | undefined => {
  return name?.trim().toLowerCase()
}

const mapPortfolio = (item: Pm_portfolios): PortfolioModel => ({
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

const mapProgramme = (item: Pm_programmes): ProgrammeModel => ({
  pm_programmeid: item.pm_programmeid,
  pm_programmename: item.pm_programmename,
  _pm_portfolio_value: item._pm_portfolio_value,
  pm_programmephase: item.pm_programmephase,
  pm_ragstatus: item.pm_ragstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_portfolioname: item.pm_portfolioname,
  pm_programmemanager: item.pm_programmemanager,
  pm_sponsorname: item.pm_sponsorname,
  pm_programmedescription: item.pm_programmedescription,
  pm_budgeteur: item.pm_budgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_businessunit: item.pm_businessunit,
})

const mapProject = (item: Pm_projects): ProjectModel => ({
  pm_projectid: item.pm_projectid,
  pm_projectname: item.pm_projectname,
  pm_projectcode: item.pm_projectcode,
  _pm_portfolio_value: item._pm_portfolio_value,
  _pm_programme_value: item._pm_programme_value,
  pm_projectmanager: item.pm_projectmanager,
  pm_projectphase: item.pm_projectphase,
  pm_ragstatus: item.pm_ragstatus,
  pm_plannedstartdate: item.pm_plannedstartdate,
  pm_plannedenddate: item.pm_plannedenddate,
  pm_actualstartdate: item.pm_actualstartdate,
  pm_actualenddate: item.pm_actualenddate,
  pm_approvedbudgeteur: item.pm_approvedbudgeteur,
  pm_actualcosteur: item.pm_actualcosteur,
  pm_percentcomplete: item.pm_percentcomplete,
  pm_businessunit: item.pm_businessunit,
  pm_projectsponsor: item.pm_projectsponsor,
  pm_portfolioname: item.pm_portfolioname,
  pm_programmename: item.pm_programmename,
})

const mapInitiative = (item: Pm_initiatives): InitiativeModel => ({
  pm_initiativeid: item.pm_initiativeid,
  pm_name: item.pm_initiativename,
  pm_businesscase: item.pm_businesscasedescription,
  pm_estimatedcost: item.pm_estimatedcosteur,
  pm_estimatedbenefits: item.pm_estimatedbenefitseur,
  pm_priorityscore: (item as any).pm_priorityscore,
  pm_strategicalignmentscore: (item as any).pm_strategicalignmentscore,
  pm_pipelinestatus: item.pm_pipelinestatus,
  pm_requestorname: item.pm_requestorname,
  pm_submissiondate: item.pm_submissiondate,
  pm_portfolioname: item.pm_portfolioname,
  _pm_portfolio_value: (item as any)._pm_portfolio_value,
})

const mapProjectTask = (item: Pm_projecttasks): ProjectTaskModel => ({
  pm_projecttaskid: item.pm_projecttaskid,
  pm_taskname: item.pm_taskname,
  _pm_project_value: item._pm_project_value,
  pm_plannedstartdate: item.pm_plannedstartdate,
  pm_plannedenddate: item.pm_plannedenddate,
  pm_percentcomplete: item.pm_percentcomplete,
  pm_assignedresource: item.pm_assignedresource,
})

const mapProjectMilestone = (item: Pm_projectmilestones): ProjectMilestoneModel => ({
  pm_projectmilestoneid: item.pm_projectmilestoneid,
  pm_milestonename: item.pm_milestonename,
  pm_milestonetype: item.pm_milestonetype,
  pm_planneddate: item.pm_planneddate,
  _pm_project_value: item._pm_project_value,
})

export interface DashboardMetrics {
  totalActiveProjects: number
  totalActivePortfolios: number
  totalApprovedBudget: number
  totalActualSpend: number
  projectsInRed: number
  projectsInAmber: number
  projectsInGreen: number
  pipelineValue: number
}

export interface ProjectHierarchy {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [activeProjectResult, redProjectResult, amberProjectResult, greenProjectResult, portfolioResult, initiativeResult] = await Promise.all([
    Pm_projectsService.getAll({
      filter: "statecode eq 0",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_projectsService.getAll({
      filter: "statecode eq 0 and pm_ragstatus eq 2",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_projectsService.getAll({
      filter: "statecode eq 0 and pm_ragstatus eq 0",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_projectsService.getAll({
      filter: "statecode eq 0 and pm_ragstatus eq 1",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_portfoliosService.getAll({
      filter: "statecode eq 0",
      select: ['pm_portfolioid', 'pm_approvedbudgeteur', 'pm_actualspendeur'],
      top: 500,
    }),
    Pm_initiativesService.getAll({ select: ['pm_estimatedcosteur'], top: 500 }),
  ])

  try {
    console.debug('[dataverseService] fetchDashboardMetrics raw results:', {
      activeProjectResult,
      redProjectResult,
      amberProjectResult,
      greenProjectResult,
      portfolioResult,
      initiativeResult,
    })
  } catch (e) {
    console.debug('[dataverseService] fetchDashboardMetrics: unable to log raw results')
  }

  const activeProjects = unwrapList<Pm_projects>(activeProjectResult)
  const redProjects = unwrapList<Pm_projects>(redProjectResult)
  const amberProjects = unwrapList<Pm_projects>(amberProjectResult)
  const greenProjects = unwrapList<Pm_projects>(greenProjectResult)
  const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
  const initiatives = unwrapList<Pm_initiatives>(initiativeResult)

  const approvedBudget = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_approvedbudgeteur ?? 0), 0)
  const actualSpend = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_actualspendeur ?? 0), 0)
  const pipelineValue = initiatives.reduce((sum, initiative) => sum + (initiative.pm_estimatedcosteur ?? 0), 0)

  return {
    totalActiveProjects: activeProjects.length,
    totalActivePortfolios: portfolios.length,
    totalApprovedBudget: approvedBudget,
    totalActualSpend: actualSpend,
    projectsInRed: redProjects.length,
    projectsInAmber: amberProjects.length,
    projectsInGreen: greenProjects.length,
    pipelineValue,
  }
}

export async function fetchMyActiveProjects(): Promise<ProjectModel[]> {
  const selectFields = [
    'pm_projectid',
    'pm_projectname',
    'pm_projectcode',
    'pm_ragstatus',
    'pm_projectphase',
    '_pm_portfolio_value',
    '_pm_programme_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_projectname asc'],
    top: 50,
  }

  const activeResult = await Pm_projectsService.getAll({
    ...options,
    filter: 'statecode eq 0',
  })

  try {
    console.debug('[dataverseService] fetchMyActiveProjects activeResult raw:', activeResult, 'options:', options)
  } catch (e) {
    console.debug('[dataverseService] fetchMyActiveProjects: unable to log activeResult')
  }

  let projects = unwrapList<Pm_projects>(activeResult)
  if (projects.length === 0) {
    // Diagnostic: log the upstream result to help identify 304 / caching responses
    try {
      console.warn('[dataverseService] fetchMyActiveProjects: activeResult had no value, raw response:', activeResult)
    } catch (e) {
      console.warn('[dataverseService] fetchMyActiveProjects: unable to stringify activeResult')
    }

    const fallbackResult = await Pm_projectsService.getAll(options)
    const fallbackProjects = unwrapList<Pm_projects>(fallbackResult)
    if (fallbackProjects.length > 0) {
      console.warn('[dataverseService] fetchMyActiveProjects: no active projects returned for statecode eq 0, falling back to all projects')
      projects = fallbackProjects
    }
  }

  // Map to ProjectModel first
  const mapped = projects.map(mapProject)

  // Resolve lookup names for portfolio and programme
  try {
    const portfolioIds = Array.from(new Set(mapped.map((p) => (p as any)._pm_portfolio_value).filter(Boolean))) as string[]
    const programmeIds = Array.from(new Set(mapped.map((p) => (p as any)._pm_programme_value).filter(Boolean))) as string[]

    const portfolioMap: Record<string, string> = {}
    if (portfolioIds.length > 0) {
      const portfolioFetches = await Promise.all(
        portfolioIds.map((id) => Pm_portfoliosService.get(id, { select: ['pm_portfolioid', 'pm_portfolioname'] }))
      )
      try { console.debug('[dataverseService] fetchMyActiveProjects portfolioFetches raw:', portfolioFetches) } catch (e) {}
      portfolioFetches.forEach((res) => {
        const item = unwrapSingle<Pm_portfolios>(res)
        if (item && item.pm_portfolioid) portfolioMap[item.pm_portfolioid] = item.pm_portfolioname ?? ''
      })
    }

    const programmeMap: Record<string, string> = {}
    if (programmeIds.length > 0) {
      const programmeFetches = await Promise.all(
        programmeIds.map((id) => Pm_programmesService.get(id, { select: ['pm_programmeid', 'pm_programmename'] }))
      )
      try { console.debug('[dataverseService] fetchMyActiveProjects programmeFetches raw:', programmeFetches) } catch (e) {}
      programmeFetches.forEach((res) => {
        const item = unwrapSingle<Pm_programmes>(res)
        if (item && item.pm_programmeid) programmeMap[item.pm_programmeid] = item.pm_programmename ?? ''
      })
    }

    // Attach resolved names where available
    for (const proj of mapped) {
      const pid = (proj as any)._pm_portfolio_value as string | undefined
      const prid = (proj as any)._pm_programme_value as string | undefined
      if (pid && portfolioMap[pid]) proj.pm_portfolioname = portfolioMap[pid]
      if (prid && programmeMap[prid]) proj.pm_programmename = programmeMap[prid]
    }
  } catch (err) {
    console.warn('[dataverseService] fetchMyActiveProjects: failed to resolve lookup names', err)
  }

  return mapped
}

export async function fetchPortfolioHierarchy(): Promise<ProjectHierarchy> {
  const [portfoliosResult, programmesResult, projectsResult] = await Promise.all([
    Pm_portfoliosService.getAll({ select: ['pm_portfolioid', 'pm_portfolioname', 'pm_portfolioowner', 'pm_portfoliostatus', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_portfoliodescription', 'pm_strategicobjective', 'pm_prioritylevel', 'pm_businessunit', 'pm_createdon'], top: 200 }),
    // Avoid selecting lookup alias fields on programmes because Dataverse getAll() may
    // return no rows when alias fields are included. Use the lookup GUID and resolve
    // the portfolio display name from the portfolios list instead.
    Pm_programmesService.getAll({ select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_programmemanager', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'], top: 500 }),
    Pm_projectsService.getAll({ select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate'], top: 1000 }),
  ])

  const portfolios = unwrapList<Pm_portfolios>(portfoliosResult).map(mapPortfolio)
  const programmes = unwrapList<Pm_programmes>(programmesResult)
  const projects = unwrapList<Pm_projects>(projectsResult)

  const portfolioNameById = new Map<string, string>()
  for (const p of portfolios) {
    if (p.pm_portfolioid && p.pm_portfolioname) {
      const portfolioId = normalizeLookupId(p.pm_portfolioid)
      if (portfolioId) portfolioNameById.set(portfolioId, p.pm_portfolioname)
    }
  }

  const mappedProgrammes = programmes.map((programme) => {
    const mapped = mapProgramme(programme)
    const portfolioId = normalizeLookupId(programme._pm_portfolio_value)
    if (!mapped.pm_portfolioname && portfolioId && portfolioNameById.has(portfolioId)) {
      mapped.pm_portfolioname = portfolioNameById.get(portfolioId)
    }
    return mapped
  })

  try {
    console.debug('[dataverseService] fetchPortfolioHierarchy raw results:', { portfoliosResult, programmesResult, projectsResult })
  } catch (e) {
    console.debug('[dataverseService] fetchPortfolioHierarchy: unable to log raw results')
  }

  return {
    portfolios,
    programmes: mappedProgrammes,
    projects: projects.map(mapProject),
  }
}

export async function fetchProjectDetails(projectId: string): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.get(projectId, {
    select: [
      'pm_projectid',
      'pm_projectname',
      'pm_projectcode',
      '_pm_portfolio_value',
      '_pm_programme_value',
      'pm_projectmanager',
      'pm_projectphase',
      'pm_ragstatus',
      'pm_plannedstartdate',
      'pm_plannedenddate',
      'pm_actualstartdate',
      'pm_actualenddate',
      'pm_portfolioname',
      'pm_programmename',
    ],
  })
  try { console.debug('[dataverseService] fetchProjectDetails result raw:', result, 'projectId:', projectId) } catch (e) {}
  return mapProject(unwrapSingle<Pm_projects>(result) ?? ({} as Pm_projects))
}

export async function fetchProjectTasks(projectId: string): Promise<ProjectTaskModel[]> {
  const result = await Pm_projecttasksService.getAll({
    filter: `_pm_project_value eq '${projectId}'`,
    select: ['pm_projecttaskid', 'pm_taskname', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_percentcomplete', 'pm_assignedresource'],
    orderBy: ['pm_taskname asc'],
    top: 200,
  })
  try { console.debug('[dataverseService] fetchProjectTasks result raw:', result, 'projectId:', projectId) } catch (e) {}
  return unwrapList<Pm_projecttasks>(result).map(mapProjectTask)
}

export async function fetchProjectMilestones(projectId: string): Promise<ProjectMilestoneModel[]> {
  const result = await Pm_projectmilestonesService.getAll({
    filter: `_pm_project_value eq '${projectId}'`,
    select: ['pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype', 'pm_planneddate'],
    orderBy: ['pm_planneddate asc'],
    top: 200,
  })
  try { console.debug('[dataverseService] fetchProjectMilestones result raw:', result, 'projectId:', projectId) } catch (e) {}
  return unwrapList<Pm_projectmilestones>(result).map(mapProjectMilestone)
}

export async function fetchInitiatives(status?: number): Promise<InitiativeModel[]> {
  const select = ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_estimatedbenefitseur', 'pm_priorityscore', 'pm_strategicalignmentscore', 'pm_pipelinestatus', 'pm_requestorname', 'pm_submissiondate', '_pm_portfolio_value']
  const options: any = { select, orderBy: ['pm_initiativename asc'], top: 200 }
  if (typeof status === 'number') options.filter = `pm_pipelinestatus eq ${status}`
  const result = await Pm_initiativesService.getAll(options)
  try { console.debug('[dataverseService] fetchInitiatives result raw:', result, 'select:', select, 'filter:', options.filter) } catch (e) {}
  const list = unwrapList<Pm_initiatives>(result).map(mapInitiative)

  if (list.length === 0) {
    try {
      console.warn('[dataverseService] fetchInitiatives: empty result, raw response:', result)
    } catch (e) {
      console.warn('[dataverseService] fetchInitiatives: unable to stringify response')
    }
  }

  // Resolve portfolio names for initiatives that have a lookup
  try {
    const portfolioIds = Array.from(new Set(list.map((i) => (i as any)._pm_portfolio_value).filter(Boolean))) as string[]
    if (portfolioIds.length > 0) {
      const portfolios = await Promise.all(portfolioIds.map((id) => Pm_portfoliosService.get(id, { select: ['pm_portfolioid', 'pm_portfolioname'] })))
      try { console.debug('[dataverseService] fetchInitiatives portfolio fetch raw:', portfolios) } catch (e) {}
      const pMap: Record<string, string> = {}
      portfolios.forEach((res) => {
        const item = unwrapSingle<Pm_portfolios>(res)
        if (item && item.pm_portfolioid) pMap[item.pm_portfolioid] = item.pm_portfolioname ?? ''
      })
      for (const init of list) {
        const pid = (init as any)._pm_portfolio_value as string | undefined
        if (pid && pMap[pid]) init.pm_portfolioname = pMap[pid]
      }
    }
  } catch (err) {
    console.warn('[dataverseService] fetchInitiatives: failed to resolve portfolio names', err)
  }

  return list
}

export async function fetchPendingApprovalRequests(): Promise<InitiativeModel[]> {
  const result = await Pm_initiativesService.getAll({
    filter: "pm_pipelinestatus eq 1",
    select: ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_pipelinestatus', 'pm_requestorname', 'pm_submissiondate', 'pm_portfolioname'],
    orderBy: ['pm_submissiondate desc'],
    top: 100,
  })
  try { console.debug('[dataverseService] fetchPendingApprovalRequests result raw:', result) } catch (e) {}
  return unwrapList<Pm_initiatives>(result).map(mapInitiative)
}

export async function updateInitiativeStatus(initiativeId: string, status: number): Promise<void> {
  try { console.debug('[dataverseService] updateInitiativeStatus updating:', { initiativeId, status }) } catch (e) {}
  const res = await Pm_initiativesService.update(initiativeId, { pm_pipelinestatus: status } as any)
  try { console.debug('[dataverseService] updateInitiativeStatus result raw:', res) } catch (e) {}
}

export async function convertInitiativeToProject(initiative: InitiativeModel): Promise<string | null> {
  try {
    console.debug('[dataverseService] convertInitiativeToProject: starting conversion for', initiative.pm_initiativeid)
    const payload: any = { pm_projectname: initiative.pm_name }
    if ((initiative as any)._pm_portfolio_value) {
      // Use OData bind to link portfolio if available
      payload['pm_portfolio@odata.bind'] = `/pm_portfolios(${(initiative as any)._pm_portfolio_value})`
    }
    const created = await Pm_projectsService.create(payload as any)
    try { console.debug('[dataverseService] convertInitiativeToProject create result raw:', created) } catch (e) {}
    const createdItem = unwrapSingle<Pm_projects>(created)
    if (createdItem && createdItem.pm_projectid) {
      // Update initiative to record conversion reference
      try {
        const updateRes = await Pm_initiativesService.update(initiative.pm_initiativeid!, { pm_convertedtoreference: createdItem.pm_projectid } as any)
        try { console.debug('[dataverseService] convertInitiativeToProject update initiative result raw:', updateRes) } catch (e) {}
      } catch (e) {
        console.warn('[dataverseService] convertInitiativeToProject: failed to update initiative conversion reference', e)
      }
      return createdItem.pm_projectid
    }
  } catch (err) {
    console.warn('[dataverseService] convertInitiativeToProject failed', err)
  }
  return null
}

export async function createProgramme(payload: Partial<ProgrammeModel>): Promise<ProgrammeModel | null> {
  const defaults = {
    ownerid: '00000000-0000-0000-0000-000000000000',
    owneridtype: 'systemuser',
    statecode: 0 as const,
    statuscode: 1 as const,
  }
  const result = await Pm_programmesService.create({ ...defaults, ...payload } as any)
  try { console.debug('[dataverseService] createProgramme payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_programmes>(result)
  return item ? mapProgramme(item) : null
}

export interface ProgrammeDetail {
  programme: ProgrammeModel | null
  projects: ProjectModel[]
  risks: RiskModel[]
  issues: IssueModel[]
}

export async function fetchProgrammeDetails(programmeId: string): Promise<ProgrammeDetail> {
  const progResult = await Pm_programmesService.get(programmeId, {
    select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_portfolioname', 'pm_programmemanager', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'],
  })
  const programme = mapProgramme(unwrapSingle<Pm_programmes>(progResult) ?? ({} as Pm_programmes))

  const [projectsResult, risksResult, issuesResult] = await Promise.all([
    Pm_projectsService.getAll({
      filter: `_pm_programme_value eq '${programmeId}'`,
      select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_percentcomplete', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_approvedbudgeteur', 'pm_actualcosteur'],
      top: 200,
    }),
    Pm_risksService.getAll({
      filter: `_pm_programmefk_value eq '${programmeId}'`,
      select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskowner', 'pm_riskstatus', 'pm_escalated', 'pm_identifieddate', 'pm_targetclosedate', 'pm_inherentscore', 'pm_residualscore'],
      top: 200,
    }),
    Pm_issuesService.getAll({
      filter: `_pm_programmefk_value eq '${programmeId}'`,
      select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issueowner', 'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel', 'pm_dateraised', 'pm_targetresolutiondate'],
      top: 200,
    }),
  ])

  const mapRisk = (item: Pm_risks): RiskModel => ({
    pm_riskid: item.pm_riskid,
    pm_risktitle: item.pm_risktitle,
    pm_riskcategory: item.pm_riskcategory,
    pm_riskdescription: item.pm_riskdescription,
    pm_ragstatus: item.pm_ragstatus,
    pm_riskowner: item.pm_riskowner,
    pm_riskstatus: item.pm_riskstatus,
    pm_escalated: item.pm_escalated,
    pm_identifieddate: item.pm_identifieddate,
    pm_targetclosedate: item.pm_targetclosedate,
    pm_inherentscore: item.pm_inherentscore,
    pm_residualscore: item.pm_residualscore,
    _pm_programmefk_value: item._pm_programmefk_value,
  })

  const mapIssue = (item: Pm_issues): IssueModel => ({
    pm_issueid: item.pm_issueid,
    pm_issuetitle: item.pm_issuetitle,
    pm_issuedescription: item.pm_issuedescription,
    pm_issuecategory: item.pm_issuecategory,
    pm_ragstatus: item.pm_ragstatus,
    pm_issueowner: item.pm_issueowner,
    pm_issuestatus: item.pm_issuestatus,
    pm_escalationstatus: item.pm_escalationstatus,
    pm_prioritylevel: item.pm_prioritylevel,
    pm_dateraised: item.pm_dateraised,
    pm_targetresolutiondate: item.pm_targetresolutiondate,
    _pm_programmefk_value: item._pm_programmefk_value,
  })

  return {
    programme,
    projects: unwrapList<Pm_projects>(projectsResult).map(mapProject),
    risks: unwrapList<Pm_risks>(risksResult).map(mapRisk),
    issues: unwrapList<Pm_issues>(issuesResult).map(mapIssue),
  }
}

export async function createPortfolio(payload: Partial<PortfolioModel>): Promise<PortfolioModel | null> {
  // Provide sensible defaults for required owner fields
  const defaults = {
    ownerid: '00000000-0000-0000-0000-000000000000',
    owneridtype: 'systemuser',
    statecode: 0 as const,
    statuscode: 1 as const,
  }
  const result = await Pm_portfoliosService.create({ ...defaults, ...payload } as any)
  try { console.debug('[dataverseService] createPortfolio payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_portfolios>(result)
  return item ? mapPortfolio(item) : null
}

export async function createProject(payload: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.create(payload as any)
  try { console.debug('[dataverseService] createProject payload/result:', payload, result) } catch (e) {}
  return unwrapSingle<Pm_projects>(result)
}

export async function updateProject(id: string, changes: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.update(id, changes as any)
  try { console.debug('[dataverseService] updateProject id/changes/result:', id, changes, result) } catch (e) {}
  return unwrapSingle<Pm_projects>(result)
}

export async function deleteProject(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteProject id:', id) } catch (e) {}
  await Pm_projectsService.delete(id)
}

export async function createProjectTask(payload: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const result = await Pm_projecttasksService.create(payload as any)
  const item = unwrapSingle<Pm_projecttasks>(result)
  try { console.debug('[dataverseService] createProjectTask payload/result:', payload, result) } catch (e) {}
  return item ? mapProjectTask(item) : null
}

export async function updateProjectTask(id: string, changes: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const result = await Pm_projecttasksService.update(id, changes as any)
  const item = unwrapSingle<Pm_projecttasks>(result)
  try { console.debug('[dataverseService] updateProjectTask id/changes/result:', id, changes, result) } catch (e) {}
  return item ? mapProjectTask(item) : null
}

export async function deleteProjectTask(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteProjectTask id:', id) } catch (e) {}
  await Pm_projecttasksService.delete(id)
}

export async function createProjectMilestone(payload: Partial<ProjectMilestoneModel>): Promise<ProjectMilestoneModel | null> {
  const result = await Pm_projectmilestonesService.create(payload as any)
  const item = unwrapSingle<Pm_projectmilestones>(result)
  try { console.debug('[dataverseService] createProjectMilestone payload/result:', payload, result) } catch (e) {}
  return item ? mapProjectMilestone(item) : null
}

export async function deleteProjectMilestone(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteProjectMilestone id:', id) } catch (e) {}
  await Pm_projectmilestonesService.delete(id)
}

export async function fetchProjectsFull(): Promise<ProjectModel[]> {
  // IMPORTANT: Do NOT include lookup alias fields (pm_portfolioname, pm_programmename)
  // in the getAll select list — they cause Dataverse to return zero rows.
  // Resolve them separately from the lookup GUIDs.
  const result = await Pm_projectsService.getAll({
    filter: "statecode eq 0",
    select: [
      'pm_projectid', 'pm_projectname', 'pm_projectcode',
      '_pm_portfolio_value', '_pm_programme_value',
      'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus',
      'pm_plannedstartdate', 'pm_plannedenddate',
      'pm_actualstartdate', 'pm_actualenddate',
      'pm_approvedbudgeteur', 'pm_actualcosteur',
      'pm_percentcomplete', 'pm_businessunit', 'pm_projectsponsor',
    ],
    orderBy: ['pm_projectname asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchProjectsFull result raw:', result) } catch (e) {}

  let projects = unwrapList<Pm_projects>(result).map(mapProject)

  // Fallback: if no active projects returned due to caching/alias issues, try without filter
  if (projects.length === 0) {
    try {
      console.warn('[dataverseService] fetchProjectsFull: empty result, attempting fallback without filter')
    } catch (e) {}
    const fallbackResult = await Pm_projectsService.getAll({
      select: [
        'pm_projectid', 'pm_projectname', 'pm_projectcode',
        '_pm_portfolio_value', '_pm_programme_value',
        'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus',
        'pm_plannedstartdate', 'pm_plannedenddate',
        'pm_actualstartdate', 'pm_actualenddate',
        'pm_approvedbudgeteur', 'pm_actualcosteur',
        'pm_percentcomplete', 'pm_businessunit', 'pm_projectsponsor',
      ],
      orderBy: ['pm_projectname asc'],
      top: 500,
    })
    projects = unwrapList<Pm_projects>(fallbackResult).map(mapProject)
  }

  // Resolve portfolio and programme names from lookup GUIDs
  try {
    const portfolioIds = Array.from(new Set(projects.map((p) => p._pm_portfolio_value).filter(Boolean))) as string[]
    const programmeIds = Array.from(new Set(projects.map((p) => p._pm_programme_value).filter(Boolean))) as string[]

    const portfolioNameById = new Map<string, string>()
    if (portfolioIds.length > 0) {
      const portResults = await Promise.all(
        portfolioIds.map((id) => Pm_portfoliosService.get(id, { select: ['pm_portfolioid', 'pm_portfolioname'] }))
      )
      for (const res of portResults) {
        const item = unwrapSingle<Pm_portfolios>(res)
        if (item && item.pm_portfolioid && item.pm_portfolioname) {
          portfolioNameById.set(item.pm_portfolioid, item.pm_portfolioname)
        }
      }
    }

    const programmeNameById = new Map<string, string>()
    if (programmeIds.length > 0) {
      const progResults = await Promise.all(
        programmeIds.map((id) => Pm_programmesService.get(id, { select: ['pm_programmeid', 'pm_programmename'] }))
      )
      for (const res of progResults) {
        const item = unwrapSingle<Pm_programmes>(res)
        if (item && item.pm_programmeid && item.pm_programmename) {
          programmeNameById.set(item.pm_programmeid, item.pm_programmename)
        }
      }
    }

    for (const proj of projects) {
      if (proj._pm_portfolio_value && portfolioNameById.has(proj._pm_portfolio_value)) {
        proj.pm_portfolioname = portfolioNameById.get(proj._pm_portfolio_value)
      }
      if (proj._pm_programme_value && programmeNameById.has(proj._pm_programme_value)) {
        proj.pm_programmename = programmeNameById.get(proj._pm_programme_value)
      }
    }
  } catch (err) {
    try { console.warn('[dataverseService] fetchProjectsFull: failed to resolve lookup names', err) } catch (e) {}
  }

  return projects
}

export async function fetchMilestonesDueThisMonth(): Promise<number> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const firstDay = `${year}-${month}-01`
  const lastDay = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`

  const result = await Pm_projectmilestonesService.getAll({
    filter: `pm_planneddate ge ${firstDay} and pm_planneddate le ${lastDay} and pm_status ne 2`,
    select: ['pm_projectmilestoneid'],
    top: 1000,
  })
  try { console.debug('[dataverseService] fetchMilestonesDueThisMonth result raw:', result) } catch (e) {}
  return unwrapList<any>(result).length
}

export async function createRisk(payload: Partial<RiskModel> & { pm_projectid: string }): Promise<RiskModel | null> {
  const result = await Pm_risksService.create({
    pm_risktitle: payload.pm_risktitle,
    pm_riskdescription: payload.pm_riskdescription,
    pm_riskcategory: payload.pm_riskcategory as any,
    pm_ragstatus: payload.pm_ragstatus as any,
    pm_riskowner: payload.pm_riskowner,
    pm_riskstatus: 1, // Open
    pm_identifieddate: new Date().toISOString().split('T')[0],
    pm_targetclosedate: payload.pm_targetclosedate,
    "pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
    statecode: 0,
    statuscode: 1,
    ownerid: '00000000-0000-0000-0000-000000000000',
    owneridtype: 'systemuser',
  } as any)
  try { console.debug('[dataverseService] createRisk payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_risks>(result)
  return item ? {
    pm_riskid: item.pm_riskid,
    pm_risktitle: item.pm_risktitle,
    pm_riskcategory: item.pm_riskcategory,
    pm_riskdescription: item.pm_riskdescription,
    pm_ragstatus: item.pm_ragstatus,
    pm_riskowner: item.pm_riskowner,
    pm_riskstatus: item.pm_riskstatus,
    pm_identifieddate: item.pm_identifieddate,
    pm_targetclosedate: item.pm_targetclosedate,
    pm_escalated: item.pm_escalated,
  } : null
}

export async function createIssue(payload: Partial<IssueModel> & { pm_projectid: string }): Promise<IssueModel | null> {
  const result = await Pm_issuesService.create({
    pm_issuetitle: payload.pm_issuetitle,
    pm_issuedescription: payload.pm_issuedescription,
    pm_issuecategory: payload.pm_issuecategory as any,
    pm_prioritylevel: payload.pm_prioritylevel as any,
    pm_ragstatus: payload.pm_ragstatus as any,
    pm_issueowner: payload.pm_issueowner,
    pm_issuestatus: 0, // InProgress
    pm_dateraised: new Date().toISOString().split('T')[0],
    pm_targetresolutiondate: payload.pm_targetresolutiondate,
    "pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
    statecode: 0,
    statuscode: 1,
    ownerid: '00000000-0000-0000-0000-000000000000',
    owneridtype: 'systemuser',
  } as any)
  try { console.debug('[dataverseService] createIssue payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_issues>(result)
  return item ? {
    pm_issueid: item.pm_issueid,
    pm_issuetitle: item.pm_issuetitle,
    pm_issuedescription: item.pm_issuedescription,
    pm_issuecategory: item.pm_issuecategory,
    pm_prioritylevel: item.pm_prioritylevel,
    pm_ragstatus: item.pm_ragstatus,
    pm_issueowner: item.pm_issueowner,
    pm_issuestatus: item.pm_issuestatus,
    pm_dateraised: item.pm_dateraised,
    pm_targetresolutiondate: item.pm_targetresolutiondate,
  } : null
}

export async function assignResource(payload: {
  pm_projectid: string
  pm_resourceid: string
  pm_allocatedhours: number
  pm_assignmentrole: string
  pm_startdate: string
  pm_enddate: string
}): Promise<any> {
  const result = await Pm_resourceallocationsService.create({
    pm_allocatedhours: payload.pm_allocatedhours,
    pm_allocationpercentage: Math.min(100, Math.round((payload.pm_allocatedhours / 160) * 100)),
    pm_assignmentrole: payload.pm_assignmentrole,
    pm_assignmentstatus: 0, // Active
    pm_startdate: payload.pm_startdate,
    pm_enddate: payload.pm_enddate,
    "pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
    "pm_resource@odata.bind": `/pm_resources(${payload.pm_resourceid})`,
    statecode: 0,
    statuscode: 1,
    ownerid: '00000000-0000-0000-0000-000000000000',
    owneridtype: 'systemuser',
  } as any)
  try { console.debug('[dataverseService] assignResource payload/result:', payload, result) } catch (e) {}
  return unwrapSingle<any>(result)
}

export async function createInitiative(payload: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  const result = await Pm_initiativesService.create(payload as any)
  try { console.debug('[dataverseService] createInitiative payload/result:', payload, result) } catch (e) {}
  return unwrapSingle<Pm_initiatives>(result)
}

export async function updateInitiative(id: string, changes: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  const result = await Pm_initiativesService.update(id, changes as any)
  try { console.debug('[dataverseService] updateInitiative id/changes/result:', id, changes, result) } catch (e) {}
  return unwrapSingle<Pm_initiatives>(result)
}

export interface PipelineKpis {
  totalActiveInitiatives: number
  pendingApprovals: number
  totalEstimatedCost: number
  approvedThisMonth: number
}

export async function fetchPipelineKpis(): Promise<PipelineKpis> {
  const [allResult, pendingResult, approvedThisMonthResult] = await Promise.all([
    Pm_initiativesService.getAll({
      filter: "pm_pipelinestatus ne 3", // Not Rejected — simplified; Cancelled/Converted not mappable easily
      select: ['pm_initiativeid', 'pm_estimatedcosteur', 'pm_pipelinestatus', 'pm_submissiondate', 'pm_decisiondate'],
      top: 500,
    }),
    Pm_initiativesService.getAll({
      filter: "pm_pipelinestatus eq 1", // Under Review
      select: ['pm_initiativeid'],
      top: 500,
    }),
    Pm_initiativesService.getAll({
      filter: "pm_pipelinestatus eq 0", // Approved
      select: ['pm_initiativeid', 'pm_decisiondate'],
      top: 500,
    }),
  ])

  const all = unwrapList<Pm_initiatives>(allResult)
  const pending = unwrapList<Pm_initiatives>(pendingResult)
  const approvedThisMonth = unwrapList<Pm_initiatives>(approvedThisMonthResult)

  const now = new Date()
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const approvedThisMonthCount = approvedThisMonth.filter((i) => {
    const d = i.pm_decisiondate ?? i.pm_submissiondate
    if (!d) return false
    return d >= currentMonthStart
  }).length

  return {
    totalActiveInitiatives: all.length,
    pendingApprovals: pending.length,
    totalEstimatedCost: all.reduce((s, i) => s + (i.pm_estimatedcosteur ?? 0), 0),
    approvedThisMonth: approvedThisMonthCount,
  }
}

// ── Resource Utilization Charts Data ──────────────────────────────────────
// NOTE: Dataverse lookup alias fields like pm_resourcename or pm_projectname may not be
// reliably returned in getAll() results for related records. Always query the lookup
// GUID field (_pm_resource_value, _pm_project_value, pm_resourceid, etc.) and resolve
// the display name from the related entity when building chart datasets.
// 1. Capacity vs. Allocation Heatmap (Stacked Bar)
export async function fetchCapacityAllocationData(): Promise<
  { resource: string; capacity: number; allocated: number; percentage: number }[]
> {
  const [resourcesResult, allocationsResult] = await Promise.all([
    Pm_resourcesService.getAll({
      filter: "statecode eq 0",
      select: ['pm_resourceid', 'pm_fullname', 'pm_dailyworkcapacity'],
      top: 500,
    }),
    Pm_resourceallocationsService.getAll({
      filter: "statecode eq 0",
      select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_startdate', 'pm_enddate', '_pm_resource_value', 'pm_resourceid'],
      top: 2000,
    }),
  ])

  const resources = unwrapList<Pm_resources>(resourcesResult)
  const allocations = unwrapList<Pm_resourceallocations>(allocationsResult)

  // Build resource lookups: normalized name and normalized GUID/resource ID -> canonical resource info
  const resourceByName = new Map<string, { name: string; capacity: number }>()
  const resourceByGuid = new Map<string, { name: string; capacity: number }>()
  for (const r of resources) {
    const normalizedName = normalizeLookupName(r.pm_fullname)
    if (normalizedName) {
      resourceByName.set(normalizedName, {
        name: r.pm_fullname!.trim(),
        capacity: r.pm_dailyworkcapacity ?? 8,
      })
    }
    const normalizedGuid = normalizeLookupId(r.pm_resourceid)
    if (normalizedGuid) {
      resourceByGuid.set(normalizedGuid, {
        name: r.pm_fullname?.trim() || 'Unknown',
        capacity: r.pm_dailyworkcapacity ?? 8,
      })
    }
  }

  const resolveResourceName = (a: Pm_resourceallocations): string | undefined => {
    const normalizedResourceName = normalizeLookupName(a.pm_resourcename)
    if (normalizedResourceName && resourceByName.has(normalizedResourceName)) {
      return resourceByName.get(normalizedResourceName)!.name
    }
    const normalizedGuid = normalizeLookupId(((a as any)._pm_resource_value as string) || a.pm_resourceid)
    if (normalizedGuid && resourceByGuid.has(normalizedGuid)) {
      return resourceByGuid.get(normalizedGuid)!.name
    }
    return undefined
  }

  const allocationMap = new Map<string, number>()
  let unmatchedAllocations = 0
  for (const a of allocations) {
    const name = resolveResourceName(a)
    if (!name) {
      unmatchedAllocations += 1
      continue
    }
    const totalAlloc = a.pm_allocatedhours ?? 0
    allocationMap.set(name, (allocationMap.get(name) ?? 0) + totalAlloc)
  }

  for (const resourceInfo of resourceByName.values()) {
    if (!allocationMap.has(resourceInfo.name)) {
      allocationMap.set(resourceInfo.name, 0)
    }
  }

  const resourceCapacityByName = new Map<string, number>()
  for (const resourceInfo of resourceByName.values()) {
    resourceCapacityByName.set(resourceInfo.name, resourceInfo.capacity)
  }

  const result: { resource: string; capacity: number; allocated: number; percentage: number }[] = []
  for (const [resource, allocated] of allocationMap) {
    const capacity = resourceCapacityByName.get(resource) ?? 8
    const monthlyCapacity = capacity * 20
    const percentage = monthlyCapacity > 0 ? Math.round((allocated / monthlyCapacity) * 100) : 0
    result.push({
      resource,
      capacity: monthlyCapacity,
      allocated,
      percentage,
    })
  }

  result.sort((a, b) => b.percentage - a.percentage)
  return result.slice(0, 12)
}

// 2. Planned vs. Actual Effort (Clustered Column by Month)
export async function fetchPlannedVsActualData(): Promise<
  { month: string; planned: number; actual: number }[]
> {
  const [allocationsResult, entriesResult] = await Promise.all([
    Pm_resourceallocationsService.getAll({
      filter: "statecode eq 0",
      select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_startdate', 'pm_enddate', '_pm_resource_value', 'pm_resourceid'],
      top: 2000,
    }),
    Pm_timesheetentriesService.getAll({
      filter: "statecode eq 0",
      select: ['pm_timesheetentryid', 'pm_hoursworked', 'pm_workdate'],
      top: 2000,
    }),
  ])

  const allocations = unwrapList<Pm_resourceallocations>(allocationsResult)
  const entries = unwrapList<Pm_timesheetentries>(entriesResult)

  // Group planned by month using YYYY-MM keys
  const plannedByMonth = new Map<string, number>()
  for (const a of allocations) {
    if (!a.pm_startdate) continue
    const monthKey = a.pm_startdate.substring(0, 7)
    plannedByMonth.set(monthKey, (plannedByMonth.get(monthKey) ?? 0) + (a.pm_allocatedhours ?? 0))
  }

  // Group actual by month using YYYY-MM keys
  const actualByMonth = new Map<string, number>()
  for (const e of entries) {
    if (!e.pm_workdate) continue
    const monthKey = e.pm_workdate.substring(0, 7)
    actualByMonth.set(monthKey, (actualByMonth.get(monthKey) ?? 0) + (e.pm_hoursworked ?? 0))
  }

  // Combine all months — sort by YYYY-MM before converting to display labels
  const allMonths = Array.from(new Set([...plannedByMonth.keys(), ...actualByMonth.keys()])).sort()
  const result: { month: string; planned: number; actual: number }[] = []
  for (const yyyymm of allMonths) {
    const date = new Date(yyyymm + '-01')
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    result.push({
      month: monthLabel,
      planned: plannedByMonth.get(yyyymm) ?? 0,
      actual: actualByMonth.get(yyyymm) ?? 0,
    })
  }

  return result
}

// 3. Utilization by Project (Donut Chart)
export async function fetchUtilizationByProjectData(): Promise<
  { name: string; hours: number }[]
> {
  const entriesResult = await Pm_timesheetentriesService.getAll({
    filter: "statecode eq 0",
    select: ['pm_timesheetentryid', 'pm_hoursworked', 'pm_worknotes', '_pm_project_value'],
    top: 2000,
  })

  const entries = unwrapList<Pm_timesheetentries>(entriesResult)

  const projectIds = Array.from(new Set(entries
    .map((entry) => normalizeLookupId((entry as any)._pm_project_value as string))
    .filter((id): id is string => Boolean(id))))
  const projectNamesById = new Map<string, string>()
  if (projectIds.length > 0) {
    const projectsResult = await Pm_projectsService.getAll({
      filter: 'statecode eq 0',
      select: ['pm_projectid', 'pm_projectname'],
      top: 2000,
    })
    const projects = unwrapList<Pm_projects>(projectsResult)
    for (const project of projects) {
      const projectId = normalizeLookupId(project.pm_projectid)
      if (projectId && project.pm_projectname) {
        projectNamesById.set(projectId, project.pm_projectname.trim())
      }
    }
  }

  // Helper to extract project name from work notes (e.g. "Work on ERP Implementation - 2026-01-15")
  const extractProjectFromNotes = (notes: string): string | undefined => {
    const normalized = notes?.trim()
    if (!normalized) return undefined
    const match = normalized.match(/^Work on (.+?) - \d{4}-\d{2}-\d{2}/)
    return match ? match[1].trim() : undefined
  }

  // Group by project name
  const projectMap = new Map<string, number>()
  for (const e of entries) {
    const projectId = normalizeLookupId((e as any)._pm_project_value as string)
    let project = projectId ? projectNamesById.get(projectId) : undefined
    if (!project && e.pm_worknotes) {
      project = extractProjectFromNotes(e.pm_worknotes)
    }
    project = project || 'Unassigned'
    projectMap.set(project, (projectMap.get(project) ?? 0) + (e.pm_hoursworked ?? 0))
  }

  const result: { name: string; hours: number }[] = []
  for (const [name, hours] of projectMap) {
    result.push({ name, hours })
  }

  // Sort descending by hours and take top 8 + "Other"
  result.sort((a, b) => b.hours - a.hours)
  const topResults = result.length > 8 ? result.slice(0, 8) : result
  const other = result.length > 8 ? result.slice(8).reduce((sum, item) => sum + item.hours, 0) : 0
  const finalResult = result.length > 8 && other > 0 ? [...topResults, { name: 'Other', hours: other }] : topResults
  return finalResult
}

// 4. Department / Role Demand Forecasting (Line/Area Chart)
export async function fetchDepartmentDemandData(): Promise<
  { month: string; role: string; hours: number }[]
> {
  // Fetch resources to get department/role mapping
  const [resourcesResult, allocationsResult] = await Promise.all([
    Pm_resourcesService.getAll({
      filter: "statecode eq 0",
      select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole'],
      top: 500,
    }),
    Pm_resourceallocationsService.getAll({
      filter: "statecode eq 0",
      select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_assignmentrole', 'pm_startdate', 'pm_enddate', '_pm_resource_value', 'pm_resourceid'],
      top: 2000,
    }),
  ])

  const resources = unwrapList<Pm_resources>(resourcesResult)
  const allocations = unwrapList<Pm_resourceallocations>(allocationsResult)

  // Build resource-to-department/role lookup: by normalized name and normalized GUID/resource ID
  const resourceDeptByName = new Map<string, string>()
  const resourceDeptByGuid = new Map<string, { name: string; dept: string; role: string }>()
  for (const r of resources) {
    const normalizedName = normalizeLookupName(r.pm_fullname)
    if (normalizedName) {
      resourceDeptByName.set(normalizedName, r.pm_departmentname?.trim() || 'Unspecified')
    }
    const normalizedGuid = normalizeLookupId(r.pm_resourceid)
    if (normalizedGuid) {
      resourceDeptByGuid.set(normalizedGuid, {
        name: r.pm_fullname?.trim() || 'Unknown',
        dept: r.pm_departmentname?.trim() || 'Unspecified',
        role: r.pm_primaryrole?.trim() || 'Unspecified',
      })
    }
  }
  const resolveDept = (a: Pm_resourceallocations): string => {
    const normalizedResName = normalizeLookupName(a.pm_resourcename)
    if (normalizedResName && resourceDeptByName.has(normalizedResName)) {
      return resourceDeptByName.get(normalizedResName)!
    }
    const normalizedGuid = normalizeLookupId(((a as any)._pm_resource_value as string) || a.pm_resourceid)
    if (normalizedGuid && resourceDeptByGuid.has(normalizedGuid)) {
      return resourceDeptByGuid.get(normalizedGuid)!.dept
    }
    if (a.pm_assignmentrole?.trim()) return a.pm_assignmentrole.trim()
    return 'Unspecified'
  }

  // Group allocations by month and department (using YYYY-MM keys for sorting)
  const demandByMonth = new Map<string, Map<string, number>>()
  for (const a of allocations) {
    if (!a.pm_startdate) continue
    const monthKey = a.pm_startdate.substring(0, 7)
    const dept = resolveDept(a)

    if (!demandByMonth.has(monthKey)) {
      demandByMonth.set(monthKey, new Map())
    }
    const deptMap = demandByMonth.get(monthKey)!
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + (a.pm_allocatedhours ?? 0))
  }

  // Flatten to array sorted by YYYY-MM, then convert to display labels
  const sortedMonths = Array.from(demandByMonth.keys()).sort()
  const result: { month: string; role: string; hours: number }[] = []
  for (const yyyymm of sortedMonths) {
    const date = new Date(yyyymm + '-01')
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const deptMap = demandByMonth.get(yyyymm)!
    for (const [role, hours] of deptMap) {
      result.push({ month: monthLabel, role, hours })
    }
  }

  return result
}

// ── Generic Debug Query ───────────────────────────────────────────────────
// Map of table name → service reference for debug queries
const tableServices: Record<string, { getAll: (options?: any) => Promise<any> }> = {
  pm_portfolios: Pm_portfoliosService,
  pm_programmes: Pm_programmesService,
  pm_projects: Pm_projectsService,
  pm_initiatives: Pm_initiativesService,
  pm_projecttasks: Pm_projecttasksService,
  pm_projectmilestones: Pm_projectmilestonesService,
  pm_resources: Pm_resourcesService,
  pm_resourceallocations: Pm_resourceallocationsService,
  pm_timesheets: Pm_timesheetsService,
  pm_timesheetentries: Pm_timesheetentriesService,
  pm_risks: Pm_risksService,
  pm_issues: Pm_issuesService,
}

export interface DebugQueryOptions {
  table: string
  filter?: string
  top?: number
  select?: string[]
  orderBy?: string[]
}

export async function debugQueryTable(options: DebugQueryOptions): Promise<{
  columns: string[]
  rows: Record<string, any>[]
  rawResponse: any
  count: number
  error?: string
}> {
  const service = tableServices[options.table]
  if (!service) {
    return { columns: [], rows: [], rawResponse: null, count: 0, error: `Unknown table: ${options.table}` }
  }

  try {
    const result = await service.getAll({
      filter: options.filter || undefined,
      top: options.top || 100,
      select: options.select?.length ? options.select : undefined,
      orderBy: options.orderBy?.length ? options.orderBy : undefined,
    })

    const rows: Record<string, any>[] = unwrapList<any>(result)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    return { columns, rows, rawResponse: result, count: rows.length }
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      rawResponse: null,
      count: 0,
      error: err?.message || String(err),
    }
  }
}

// Return all available table names for debug page
export function getAvailableTables(): string[] {
  return Object.keys(tableServices)
}

// ── Seed Data for Charts ──────────────────────────────────────────────────────
interface SeedResult {
  table: string
  created: number
  error?: string
}

/** Known primary key fields for each resource table */
const primaryKeyMap: Record<string, string> = {
  pm_resources: 'pm_resourceid',
  pm_resourceallocations: 'pm_resourceallocationid',
  pm_timesheets: 'pm_timesheetid',
  pm_timesheetentries: 'pm_timesheetentryid',
}

/**
 * Helper to delete all records from a given table using its service.
 */
async function truncateTable(
  tableName: string,
  service: { getAll: (options?: any) => Promise<any>; delete: (id: string) => Promise<void> },
  filter?: string
): Promise<{ deleted: number; failed: number; error?: string }> {
  const pkField = primaryKeyMap[tableName]
  if (!pkField) return { deleted: 0, failed: 0, error: `Unknown primary key for table: ${tableName}` }

  try {
    // No default filter — fetch ALL records regardless of statecode
    const queryFilter = filter || undefined
    const result = await service.getAll({
      ...(queryFilter ? { filter: queryFilter } : {}),
      select: [pkField],
      top: 5000,
    })
    const records = unwrapList<any>(result)
    let deleted = 0
    let failed = 0
    for (const rec of records) {
      const id = rec[pkField]
      if (id) {
        try {
          await service.delete(id)
          deleted++
        } catch {
          failed++
        }
      }
    }
    return { deleted, failed }
  } catch (err: any) {
    return { deleted: 0, failed: 0, error: err?.message || String(err) }
  }
}

/**
 * Truncates (deletes all records from) the resource-related tables.
 * Deletes in reverse dependency order (entries → timesheets → allocations → resources).
 */
export async function truncateResourceData(): Promise<SeedResult[]> {
  const results: SeedResult[] = []

  const tables = [
    { name: 'pm_timesheetentries', service: Pm_timesheetentriesService },
    { name: 'pm_timesheets', service: Pm_timesheetsService },
    { name: 'pm_resourceallocations', service: Pm_resourceallocationsService },
    { name: 'pm_resources', service: Pm_resourcesService },
  ]

  for (const { name, service } of tables) {
    const { deleted, failed, error } = await truncateTable(name, service as any)
    results.push({ table: name, created: deleted, error: error || (failed > 0 ? `${failed} delete(s) failed` : undefined) })
  }

  return results
}

/**
 * Creates sample data across pm_resources, pm_resourceallocations, pm_timesheets,
 * and pm_timesheetentries so the resource utilization charts have data to display.
 */
export async function seedAllResourceData(): Promise<SeedResult[]> {
  const results: SeedResult[] = []

  // ── 1. Create Resources ─────────────────────────────────────────────────────
  const resourceSeedData = [
    { pm_fullname: 'Alice Johnson', pm_departmentname: 'Engineering', pm_primaryrole: 'Senior Developer', pm_dailyworkcapacity: 8, pm_positiontitle: 'Senior Developer', pm_contactemail: 'alice@ppmcentral.com', statecode: 0, statuscode: 1 },
    { pm_fullname: 'Bob Smith', pm_departmentname: 'Engineering', pm_primaryrole: 'Developer', pm_dailyworkcapacity: 8, pm_positiontitle: 'Developer', pm_contactemail: 'bob@ppmcentral.com', statecode: 0, statuscode: 1 },
    { pm_fullname: 'Carol Williams', pm_departmentname: 'Design', pm_primaryrole: 'UI Designer', pm_dailyworkcapacity: 8, pm_positiontitle: 'UI/UX Designer', pm_contactemail: 'carol@ppmcentral.com', statecode: 0, statuscode: 1 },
    { pm_fullname: 'David Brown', pm_departmentname: 'QA', pm_primaryrole: 'Test Lead', pm_dailyworkcapacity: 8, pm_positiontitle: 'QA Lead', pm_contactemail: 'david@ppmcentral.com', statecode: 0, statuscode: 1 },
    { pm_fullname: 'Eva Davis', pm_departmentname: 'Product', pm_primaryrole: 'Product Manager', pm_dailyworkcapacity: 8, pm_positiontitle: 'Product Manager', pm_contactemail: 'eva@ppmcentral.com', statecode: 0, statuscode: 1 },
    { pm_fullname: 'Frank Miller', pm_departmentname: 'Engineering', pm_primaryrole: 'DevOps Engineer', pm_dailyworkcapacity: 8, pm_positiontitle: 'DevOps Engineer', pm_contactemail: 'frank@ppmcentral.com', statecode: 0, statuscode: 1 },
  ]

  // Create resources, no need to parse response — catch errors only
  for (const res of resourceSeedData) {
    try {
      await Pm_resourcesService.create(res as any)
    } catch (err: any) {
      console.error('[seedAllResourceData] Create resource error:', err)
      results.push({ table: 'pm_resources', created: 0, error: err?.message || String(err) })
      return results
    }
  }

  // Fetch back to verify count and get GUIDs for linking
  const resourcesResult = await Pm_resourcesService.getAll({
    filter: "statecode eq 0",
    select: ['pm_resourceid', 'pm_fullname'],
    top: 500,
  })
  const fetchedResources = unwrapList<any>(resourcesResult)
  const resourceCount = fetchedResources.length
  results.push({ table: 'pm_resources', created: resourceCount })
  if (resourceCount === 0) {
    results.push({ table: 'pm_resources', created: 0, error: 'No resources were created — cannot continue' })
    return results
  }

  // Build name → GUID map
  const resourceNameToId = new Map<string, string>()
  for (const r of fetchedResources) {
    if (r.pm_fullname && r.pm_resourceid) resourceNameToId.set(r.pm_fullname.trim(), r.pm_resourceid)
  }

  // Ensure project records exist for seeded timesheet entries
  const projectNames = [
    'ERP Implementation',
    'Mobile App Redesign',
    'Cloud Migration',
    'Data Analytics Platform',
    'Customer Portal',
    'Security Audit',
  ]
  const projectNameToId = new Map<string, string>()

  const existingProjectFilter = projectNames
    .map((name) => `pm_projectname eq '${name.replace(/'/g, "''")}'`)
    .join(' or ')
  if (existingProjectFilter) {
    const existingProjectsResult = await Pm_projectsService.getAll({
      filter: `statecode eq 0 and (${existingProjectFilter})`,
      select: ['pm_projectid', 'pm_projectname'],
      top: 500,
    })
    const existingProjects = unwrapList<any>(existingProjectsResult)
    for (const project of existingProjects) {
      if (project.pm_projectname && project.pm_projectid) {
        projectNameToId.set(project.pm_projectname.trim(), project.pm_projectid)
      }
    }
  }

  for (const projectName of projectNames) {
    if (projectNameToId.has(projectName)) continue
    try {
      const createdProject = unwrapSingle<Pm_projects>(
        await Pm_projectsService.create({
          pm_projectname: projectName,
          pm_projectcode: `PRJ-${projectName.substring(0, 3).toUpperCase()}`,
          statecode: 0,
          statuscode: 1,
        } as any)
      )
      if (createdProject?.pm_projectid) {
        projectNameToId.set(projectName, createdProject.pm_projectid)
      }
    } catch (err: any) {
      console.error('[seedAllResourceData] Create project error:', err)
      results.push({ table: 'pm_projects', created: projectNameToId.size, error: err?.message || String(err) })
      break
    }
  }
  results.push({ table: 'pm_projects', created: projectNameToId.size })

  // ── 3. Create Resource Allocations ──────────────────────────────────────────
  // Spread allocations across 6 months: Nov '25 – Apr '26
  const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04']
  const allocationTemplates = [
    { name: 'Alice Johnson', dept: 'Engineering', role: 'Backend Architecture' },
    { name: 'Alice Johnson', dept: 'Engineering', role: 'Code Review' },
    { name: 'Bob Smith', dept: 'Engineering', role: 'Frontend Development' },
    { name: 'Bob Smith', dept: 'Engineering', role: 'API Integration' },
    { name: 'Carol Williams', dept: 'Design', role: 'UI Design' },
    { name: 'Carol Williams', dept: 'Design', role: 'Prototyping' },
    { name: 'David Brown', dept: 'QA', role: 'Test Automation' },
    { name: 'David Brown', dept: 'QA', role: 'Manual Testing' },
    { name: 'Eva Davis', dept: 'Product', role: 'Requirements' },
    { name: 'Eva Davis', dept: 'Product', role: 'Stakeholder Mgmt' },
    { name: 'Frank Miller', dept: 'Engineering', role: 'Infrastructure' },
    { name: 'Frank Miller', dept: 'Engineering', role: 'CI/CD Pipeline' },
  ]

  let allocError: string | undefined
  // For each month, create allocations with varying hours
  for (const [mi, month] of months.entries()) {
    if (allocError) break // stop if we already hit an error

    const startDate = month + '-01'
    const end = new Date(month + '-01')
    end.setMonth(end.getMonth() + 1)
    end.setDate(0)
    const endDate = end.toISOString().split('T')[0]

    // Each month assign a subset of allocation templates
    const activeTemplates = allocationTemplates.filter((_, i) => (i + mi) % 3 !== 2)
    for (const tpl of activeTemplates) {
      const baseHours = 40 - mi * 4 + Math.floor(Math.random() * 15)
      const hours = Math.max(10, Math.min(80, baseHours))

      try {
        // Build resource lookup binding
        const payload: any = {
          pm_assignmentrole: tpl.role,
          pm_allocatedhours: hours,
          pm_allocationpercentage: Math.min(100, Math.round((hours / 160) * 100)),
          pm_assignmentstatus: 0,
          statecode: 0,
          statuscode: 1,
          pm_startdate: startDate,
          pm_enddate: endDate,
        }

        // Link to resource via OData bind syntax (as typed in Pm_resourceallocationsBase)
        const resourceId = resourceNameToId.get(tpl.name)
        if (resourceId) {
          payload["pm_resource@odata.bind"] = `/pm_resources(${resourceId})`
        }

        await Pm_resourceallocationsService.create(payload)
      } catch (err: any) {
        console.error('[seedAllResourceData] Create allocation error:', err)
        allocError = err?.message || String(err)
        break
      }
    }
  }

  // Fetch back to verify allocation count
  const allocResult = await Pm_resourceallocationsService.getAll({
    filter: "statecode eq 0 and pm_assignmentstatus eq 0",
    select: ['pm_resourceallocationid'],
    top: 5000,
  })
  const allocList = unwrapList<any>(allocResult)
  results.push({ table: 'pm_resourceallocations', created: allocList.length, error: allocError })
  if (allocError) return results

  // ── 4. Create Timesheets ───────────────────────────────────────────────────
  const timesheetResources = [
    { name: 'Alice Johnson', period: '2026-01', status: 0 },
    { name: 'Bob Smith', period: '2026-01', status: 1 },
    { name: 'Carol Williams', period: '2026-02', status: 0 },
  ]

  let tsError: string | undefined
  for (const ts of timesheetResources) {
    const startDate = ts.period + '-01'
    const end = new Date(ts.period + '-01')
    end.setMonth(end.getMonth() + 1)
    end.setDate(0)
    const endDate = end.toISOString().split('T')[0]

    try {
      const timesheetPayload: any = {
        pm_timesheetname: `${ts.name} - ${ts.period}`,
        pm_ownername: ts.name,
        pm_reportingperiod: ts.period,
        pm_periodstartdate: startDate,
        pm_periodenddate: endDate,
        pm_timesheetstatus: ts.status,
        pm_totalhours: 0,
        statecode: 0,
        statuscode: 1,
      }
      const resourceId = resourceNameToId.get(ts.name)
      if (resourceId) {
        timesheetPayload["pm_resource@odata.bind"] = `/pm_resources(${resourceId})`
      }
      await Pm_timesheetsService.create(timesheetPayload as any)
    } catch (err: any) {
      tsError = err?.message || String(err)
      break
    }
  }

  // Fetch back to verify timesheet count and get IDs for linking
  const tsResult = await Pm_timesheetsService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_timesheetid', 'pm_ownername', 'pm_reportingperiod'],
    top: 500,
  })
  const tsList = unwrapList<any>(tsResult)
  const timesheetIds = tsList.map((t: any) => t.pm_timesheetid).filter(Boolean)
  results.push({ table: 'pm_timesheets', created: timesheetIds.length, error: tsError })
  if (tsError) return results

  // ── 5. Create Timesheet Entries (actual hours logged) ───────────────────────
  let entryError: string | undefined

  for (const [mi, month] of months.entries()) {
    if (entryError) break

    const numEntries = 3 + Math.floor(Math.random() * 4)
    for (let ei = 0; ei < numEntries; ei++) {
      const projectName = projectNames[(mi + ei) % projectNames.length]
      const day = 1 + Math.floor(Math.random() * 25)
      const workDate = `${month}-${String(day).padStart(2, '0')}`
      const hours = 4 + Math.floor(Math.random() * 12)

      try {
        // NOTE: pm_projectname is a read-only computed field from a lookup,
        // so we do NOT send it in create. Use pm_worknotes to describe the project.
        const payload: any = {
          pm_hoursworked: hours,
          pm_workdate: workDate,
          pm_ischargeable: Math.random() > 0.2,
          pm_worknotes: `Work on ${projectName} - ${workDate}`,
          statecode: 0,
          statuscode: 1,
        }

        // Link to a timesheet via OData bind syntax (as typed in Pm_timesheetentriesBase)
        if (timesheetIds.length > 0) {
          const tsId = timesheetIds[mi % timesheetIds.length]
          payload["pm_timesheet@odata.bind"] = `/pm_timesheets(${tsId})`
        }

        const projectId = projectNameToId.get(projectName)
        if (projectId) {
          payload["pm_project@odata.bind"] = `/pm_projects(${projectId})`
        }

        await Pm_timesheetentriesService.create(payload)
      } catch (err: any) {
        console.error('[seedAllResourceData] Create timesheet entry error:', err)
        entryError = err?.message || String(err)
        break
      }
    }
  }

  // Fetch back to verify entry count
  const entryResult = await Pm_timesheetentriesService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_timesheetentryid'],
    top: 5000,
  })
  const entryList = unwrapList<any>(entryResult)
  results.push({ table: 'pm_timesheetentries', created: entryList.length, error: entryError })

  return results
}

export { ragLabel, projectPhaseLabel, programmePhaseLabel }
