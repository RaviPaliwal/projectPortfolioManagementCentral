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
  projectsInRed: number
  pipelineValue: number
}

export interface ProjectHierarchy {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [projectResult, redProjectResult, initiativeResult] = await Promise.all([
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
    Pm_initiativesService.getAll({ select: ['pm_estimatedcost'], top: 500 }),
  ])

  const activeProjects = unwrapList<Pm_projects>(projectResult)
  const redProjects = unwrapList<Pm_projects>(redProjectResult)
  const initiatives = unwrapList<Pm_initiatives>(initiativeResult)

  const pipelineValue = initiatives.reduce((sum, initiative) => sum + (initiative.pm_estimatedcosteur ?? 0), 0)

  return {
    totalActiveProjects: activeProjects.length,
    projectsInRed: redProjects.length,
    pipelineValue,
  }
}

export async function fetchMyActiveProjects(): Promise<ProjectModel[]> {
  const result = await Pm_projectsService.getAll({
    filter: "statecode eq 0",
    select: [
      'pm_projectid',
      'pm_projectname',
      'pm_projectcode',
      'pm_ragstatus',
      'pm_projectphase',
      'pm_portfolioname',
      'pm_programmename',
    ],
    orderBy: ['pm_projectname asc'],
    top: 50,
  })
  return unwrapList<Pm_projects>(result).map(mapProject)
}

export async function fetchPortfolioHierarchy(): Promise<ProjectHierarchy> {
  const [portfoliosResult, programmesResult, projectsResult] = await Promise.all([
    Pm_portfoliosService.getAll({ select: ['pm_portfolioid', 'pm_portfolioname', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur'], top: 200 }),
    Pm_programmesService.getAll({ select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_portfolioname'], top: 500 }),
    Pm_projectsService.getAll({ select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_portfolioname', 'pm_programmename'], top: 1000 }),
  ])

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
  return mapProject(unwrapSingle<Pm_projects>(result) ?? ({} as Pm_projects))
}

export async function fetchProjectTasks(projectId: string): Promise<ProjectTaskModel[]> {
  const result = await Pm_projecttasksService.getAll({
    filter: `_pm_project_value eq '${projectId}'`,
    select: ['pm_projecttaskid', 'pm_taskname', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_percentcomplete', 'pm_assignedresource'],
    orderBy: ['pm_taskname asc'],
    top: 200,
  })
  return unwrapList<Pm_projecttasks>(result).map(mapProjectTask)
}

export async function fetchProjectMilestones(projectId: string): Promise<ProjectMilestoneModel[]> {
  const result = await Pm_projectmilestonesService.getAll({
    filter: `_pm_project_value eq '${projectId}'`,
    select: ['pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype', 'pm_planneddate'],
    orderBy: ['pm_planneddate asc'],
    top: 200,
  })
  return unwrapList<Pm_projectmilestones>(result).map(mapProjectMilestone)
}

export async function fetchInitiatives(): Promise<InitiativeModel[]> {
  const result = await Pm_initiativesService.getAll({ select: ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur'], orderBy: ['pm_initiativename asc'], top: 200 })
  return unwrapList<Pm_initiatives>(result).map(mapInitiative)
}

export async function createProject(payload: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.create(payload as any)
  return unwrapSingle<Pm_projects>(result)
}

export async function updateProject(id: string, changes: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.update(id, changes as any)
  return unwrapSingle<Pm_projects>(result)
}

export async function deleteProject(id: string): Promise<void> {
  await Pm_projectsService.delete(id)
}

export async function createProjectTask(payload: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const result = await Pm_projecttasksService.create(payload as any)
  const item = unwrapSingle<Pm_projecttasks>(result)
  return item ? mapProjectTask(item) : null
}

export async function updateProjectTask(id: string, changes: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const result = await Pm_projecttasksService.update(id, changes as any)
  const item = unwrapSingle<Pm_projecttasks>(result)
  return item ? mapProjectTask(item) : null
}

export async function deleteProjectTask(id: string): Promise<void> {
  await Pm_projecttasksService.delete(id)
}

export async function createProjectMilestone(payload: Partial<ProjectMilestoneModel>): Promise<ProjectMilestoneModel | null> {
  const result = await Pm_projectmilestonesService.create(payload as any)
  const item = unwrapSingle<Pm_projectmilestones>(result)
  return item ? mapProjectMilestone(item) : null
}

export async function deleteProjectMilestone(id: string): Promise<void> {
  await Pm_projectmilestonesService.delete(id)
}

export async function createInitiative(payload: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  const result = await Pm_initiativesService.create(payload as any)
  return unwrapSingle<Pm_initiatives>(result)
}

export { ragLabel, projectPhaseLabel, programmePhaseLabel }
