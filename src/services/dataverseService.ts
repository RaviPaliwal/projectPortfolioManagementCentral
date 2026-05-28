import {
  Pm_initiativesService,
  Pm_portfoliosService,
  Pm_programmesService,
  Pm_projectmilestonesService,
  Pm_projectsService,
  Pm_projecttasksService,
} from '../generated'
import type { Pm_initiatives } from '../generated/models/Pm_initiativesModel'
import type { Pm_portfolios } from '../generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '../generated/models/Pm_programmesModel'
import type { Pm_projectmilestones } from '../generated/models/Pm_projectmilestonesModel'
import type { Pm_projects } from '../generated/models/Pm_projectsModel'
import type { Pm_projecttasks } from '../generated/models/Pm_projecttasksModel'
import type {
  InitiativeModel,
  PortfolioModel,
  ProgrammeModel,
  ProjectMilestoneModel,
  ProjectModel,
  ProjectTaskModel,
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

const mapPortfolio = (item: Pm_portfolios): PortfolioModel => ({
  pm_portfolioid: item.pm_portfolioid,
  pm_portfolioname: item.pm_portfolioname,
  pm_portfoliostatus: item.pm_portfoliostatus,
  pm_ragstatus: item.pm_ragstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_approvedbudgeteur: item.pm_approvedbudgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
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
  pipelineValue: number
}

export interface ProjectHierarchy {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [activeProjectResult, redProjectResult, amberProjectResult, portfolioResult, initiativeResult] = await Promise.all([
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
      portfolioResult,
      initiativeResult,
    })
  } catch (e) {
    console.debug('[dataverseService] fetchDashboardMetrics: unable to log raw results')
  }

  const activeProjects = unwrapList<Pm_projects>(activeProjectResult)
  const redProjects = unwrapList<Pm_projects>(redProjectResult)
  const amberProjects = unwrapList<Pm_projects>(amberProjectResult)
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
    Pm_portfoliosService.getAll({ select: ['pm_portfolioid', 'pm_portfolioname', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur'], top: 200 }),
    Pm_programmesService.getAll({ select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_portfolioname'], top: 500 }),
    Pm_projectsService.getAll({ select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate'], top: 1000 }),
  ])

  try {
    console.debug('[dataverseService] fetchPortfolioHierarchy raw results:', { portfoliosResult, programmesResult, projectsResult })
  } catch (e) {
    console.debug('[dataverseService] fetchPortfolioHierarchy: unable to log raw results')
  }

  return {
    portfolios: unwrapList<Pm_portfolios>(portfoliosResult).map(mapPortfolio),
    programmes: unwrapList<Pm_programmes>(programmesResult).map(mapProgramme),
    projects: unwrapList<Pm_projects>(projectsResult).map(mapProject),
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

export async function createInitiative(payload: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  const result = await Pm_initiativesService.create(payload as any)
  try { console.debug('[dataverseService] createInitiative payload/result:', payload, result) } catch (e) {}
  return unwrapSingle<Pm_initiatives>(result)
}

export { ragLabel, projectPhaseLabel, programmePhaseLabel }
