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
  Pm_budgetlinesService,
  Pm_fundingsourcesService,
  Pm_cashflowentriesService,
  Pm_fiscalperiodsService,
  Pm_projectgatereviewsService,
  Pm_benefitsService,
  Pm_performancemeasuresService,
  Pm_riskmitigationactionsService,
} from '../generated'
import type { Pm_initiatives } from '../generated/models/Pm_initiativesModel'
import type { Pm_portfolios } from '../generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '../generated/models/Pm_programmesModel'
import type { Pm_projectmilestones } from '../generated/models/Pm_projectmilestonesModel'
import type { Pm_projects } from '../generated/models/Pm_projectsModel'
import type { Pm_projecttasks } from '../generated/models/Pm_projecttasksModel'
import type { Pm_resources } from '../generated/models/Pm_resourcesModel'
import type { Pm_riskmitigationactions } from '../generated/models/Pm_riskmitigationactionsModel' 
import type { Pm_resourceallocations } from '../generated/models/Pm_resourceallocationsModel'
import type { Pm_timesheets } from '../generated/models/Pm_timesheetsModel'
import type { Pm_timesheetentries } from '../generated/models/Pm_timesheetentriesModel'
import type { Pm_risks } from '../generated/models/Pm_risksModel'
import type { Pm_issues } from '../generated/models/Pm_issuesModel'
import type { Pm_budgetlines } from '../generated/models/Pm_budgetlinesModel'
import type { Pm_fundingsources } from '../generated/models/Pm_fundingsourcesModel'
import type { Pm_cashflowentries } from '../generated/models/Pm_cashflowentriesModel'
import type { Pm_fiscalperiods } from '../generated/models/Pm_fiscalperiodsModel'
import type { Pm_projectgatereviews } from '../generated/models/Pm_projectgatereviewsModel'
import type { Pm_benefits } from '../generated/models/Pm_benefitsModel'
import type { Pm_performancemeasures } from '../generated/models/Pm_performancemeasuresModel'
import type {
  InitiativeModel,
  PortfolioModel,
  ProgrammeModel,
  ProjectMilestoneModel,
  ProjectModel,
  ProjectTaskModel,
  RiskModel,
  IssueModel,
  ResourceModel,
  ResourceAllocationModel,
  TimesheetModel,
  TimesheetEntryModel,
  BudgetLineModel,
  FundingSourceModel,
  CashflowEntryModel,
  FinancialPeriodModel,
  GateReviewModel,
  BenefitModel,
  PerformanceMeasureModel,
  RiskMitigationActionModel,
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
  pm_taskdescription: item.pm_taskname ?? item.pm_projecttaskname,
  pm_tasklevel: item.pm_tasklevel,
  pm_parenttaskid: item.pm_parenttaskid,
  pm_wbsnumber: item.pm_wbsnumber,
  pm_durationdays: item.pm_durationdays,
  pm_lagdays: item.pm_lagdays,
  pm_plannedstartdate: item.pm_plannedstartdate,
  pm_plannedenddate: item.pm_plannedenddate,
  pm_actualstartdate: item.pm_actualstartdate,
  pm_actualenddate: item.pm_actualenddate,
  pm_percentcomplete: item.pm_percentcomplete,
  pm_taskstatus: item.pm_taskstatus,
  pm_assignedresource: item.pm_assignedresource,
  pm_ismilestone: item.pm_ismilestone,
  pm_oncriticalpath: item.pm_oncriticalpath,
  pm_predecessortaskid: item.pm_predecessortaskid,
  _pm_predecessortask_value: item._pm_predecessortask_value,
  _pm_project_value: item._pm_project_value,
})

const mapProjectMilestone = (item: Pm_projectmilestones): ProjectMilestoneModel => ({
  pm_projectmilestoneid: item.pm_projectmilestoneid,
  pm_milestonename: item.pm_milestonename,
  pm_milestonetype: item.pm_milestonetype,
  pm_planneddate: item.pm_planneddate,
  pm_actualdate: item.pm_actualdate,
  pm_ragstatus: item.pm_ragstatus,
  pm_status: item.pm_status,
  pm_owner: item.pm_owner,
  pm_description: item.pm_description,
  _pm_project_value: item._pm_project_value,
})

const mapResource = (item: Pm_resources): ResourceModel => ({
  pm_resourceid: item.pm_resourceid,
  pm_fullname: item.pm_fullname,
  pm_departmentname: item.pm_departmentname,
  pm_primaryrole: item.pm_primaryrole,
  pm_resourcecategory: item.pm_resourcecategory,
  pm_employmentstatus: item.pm_employmentstatus,
  pm_dailyworkcapacity: item.pm_dailyworkcapacity,
  pm_dailycostrate: item.pm_dailycostrate,
  pm_positiontitle: item.pm_positiontitle,
  pm_contactemail: item.pm_contactemail,
  pm_suppliercompany: item.pm_suppliercompany,
  pm_contractstartdate: item.pm_contractstartdate,
  pm_contractenddate: item.pm_contractenddate,
  statecode: item.statecode,
})

const mapResourceAllocation = (item: Pm_resourceallocations): ResourceAllocationModel => ({
  pm_resourceallocationid: item.pm_resourceallocationid,
  pm_allocatedhours: item.pm_allocatedhours,
  pm_allocationpercentage: item.pm_allocationpercentage,
  pm_assignmentrole: item.pm_assignmentrole,
  pm_assignmentstatus: item.pm_assignmentstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  _pm_resource_value: item._pm_resource_value,
  _pm_project_value: (item as any)._pm_project_value,
})

const mapTimesheet = (item: Pm_timesheets): TimesheetModel => ({
  pm_timesheetid: item.pm_timesheetid,
  pm_timesheetname: item.pm_timesheetname,
  pm_ownername: item.pm_ownername,
  pm_periodstartdate: item.pm_periodstartdate,
  pm_periodenddate: item.pm_periodenddate,
  pm_timesheetstatus: item.pm_timesheetstatus,
  pm_totalhours: item.pm_totalhours,
  pm_totalchargeablehours: item.pm_totalchargeablehours,
  pm_totalnonchargeablehours: item.pm_totalnonchargeablehours,
  pm_submissiondate: item.pm_submissiondate,
  pm_submittedby: item.pm_submittedby,
  pm_approvaldate: item.pm_approvaldate,
  pm_approvedby: item.pm_approvedby,
  pm_rejectionreason: item.pm_rejectionreason,
  pm_reportingperiod: item.pm_reportingperiod,
  pm_resourcename: item.pm_resourcename,
  _pm_resource_value: item._pm_resource_value,
})

const mapTimesheetEntry = (item: Pm_timesheetentries): TimesheetEntryModel => ({
  pm_timesheetentryid: item.pm_timesheetentryid,
  pm_timesheetid: item.pm_timesheetid,
  pm_hoursworked: item.pm_hoursworked,
  pm_workdate: item.pm_workdate,
  pm_worknotes: item.pm_worknotes,
  pm_ischargeable: item.pm_ischargeable,
  pm_isapproved: item.pm_isapproved,
  pm_isovertime: item.pm_isovertime,
  pm_nonchargeablereason: item.pm_nonchargeablereason,
  pm_projectname: item.pm_projectname,
  pm_projecttaskname: item.pm_projecttaskname,
  _pm_project_value: item._pm_project_value,
  _pm_projecttask_value: item._pm_projecttask_value,
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
    select: [
      'pm_projecttaskid', 'pm_taskname', 'pm_taskdescription',
      'pm_tasklevel', 'pm_parenttaskid', 'pm_wbsnumber',
      'pm_durationdays', 'pm_lagdays',
      'pm_plannedstartdate', 'pm_plannedenddate',
      'pm_actualstartdate', 'pm_actualenddate',
      'pm_percentcomplete', 'pm_taskstatus',
      'pm_assignedresource', 'pm_ismilestone', 'pm_oncriticalpath',
      'pm_predecessortaskid', '_pm_predecessortask_value',
    ],
    orderBy: ['pm_tasklevel asc', 'pm_wbsnumber asc', 'pm_taskname asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchProjectTasks result raw:', result, 'projectId:', projectId) } catch (e) {}
  return unwrapList<Pm_projecttasks>(result).map(mapProjectTask)
}

export interface ScheduleData {
  tasks: ProjectTaskModel[]
  milestones: ProjectMilestoneModel[]
  predecessorMap: Map<string, string> // taskId -> predecessorTaskId
}

export async function fetchScheduleData(projectId: string): Promise<ScheduleData> {
  const [tasksResult, milestonesResult] = await Promise.all([
    Pm_projecttasksService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      select: [
        'pm_projecttaskid', 'pm_taskname', 'pm_taskdescription',
        'pm_tasklevel', 'pm_parenttaskid', 'pm_wbsnumber',
        'pm_durationdays', 'pm_lagdays',
        'pm_plannedstartdate', 'pm_plannedenddate',
        'pm_actualstartdate', 'pm_actualenddate',
        'pm_percentcomplete', 'pm_taskstatus',
        'pm_assignedresource', 'pm_ismilestone', 'pm_oncriticalpath',
        'pm_predecessortaskid', '_pm_predecessortask_value',
      ],
      orderBy: ['pm_tasklevel asc', 'pm_wbsnumber asc', 'pm_taskname asc'],
      top: 500,
    }),
    Pm_projectmilestonesService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      select: [
        'pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype',
        'pm_planneddate', 'pm_actualdate', 'pm_ragstatus', 'pm_status',
        'pm_owner', 'pm_description',
      ],
      orderBy: ['pm_planneddate asc'],
      top: 200,
    }),
  ])

  const tasks = unwrapList<Pm_projecttasks>(tasksResult).map(mapProjectTask)
  const milestones = unwrapList<Pm_projectmilestones>(milestonesResult).map(mapProjectMilestone)

  // Build predecessor map: taskId -> predecessorTaskId
  const predecessorMap = new Map<string, string>()
  for (const task of tasks) {
    if (task._pm_predecessortask_value) {
      predecessorMap.set(task.pm_projecttaskid!, task._pm_predecessortask_value)
    }
  }

  try { console.debug('[dataverseService] fetchScheduleData:', { projectId, taskCount: tasks.length, milestoneCount: milestones.length }) } catch (e) {}

  return { tasks, milestones, predecessorMap }
}

export async function createScheduleTask(payload: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_predecessortask_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  // Project OData bind
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  // Predecessor OData bind
  if (payload._pm_predecessortask_value) {
    const predId = normalizeLookupId(payload._pm_predecessortask_value)
    if (predId) {
      cleanPayload['pm_PredecessorTask@odata.bind'] = `/pm_projecttasks(${predId})`
    }
  }
  const result = await Pm_projecttasksService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createScheduleTask payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_projecttasks>(result)
  return item ? mapProjectTask(item) : null
}

export async function updateScheduleTask(id: string, changes: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_projecttaskid' && key !== '_pm_project_value' && key !== '_pm_predecessortask_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_projecttasksService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateScheduleTask id/changes/result:', id, cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_projecttasks>(result)
  return item ? mapProjectTask(item) : null
}

export async function deleteScheduleTask(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteScheduleTask id:', id) } catch (e) {}
  await Pm_projecttasksService.delete(id)
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
  // Strip undefined values — Dataverse API rejects fields with null/undefined
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      cleanPayload[key] = value
    }
  }
  // Do NOT set ownerid/owneridtype explicitly — let the Power Apps client
  // auto-assign the current user to avoid 'invalid owner' errors.
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_programmesService.create({ ...defaults, ...cleanPayload } as any)
    try { console.debug('[dataverseService] createProgramme payload/result:', cleanPayload, result) } catch (e) {}
    const item = unwrapSingle<Pm_programmes>(result)
    if (item) {
      return mapProgramme(item)
    }
    // unwrapSingle returned null — log the raw response to aid debugging
    try {
      console.warn('[dataverseService] createProgramme: unwrapSingle returned null. Raw result:', JSON.stringify(result, null, 2))
    } catch (e) {
      console.warn('[dataverseService] createProgramme: unwrapSingle returned null. Raw result (non-serializable):', result)
    }
    return null
  } catch (err: any) {
    try {
      console.error('[dataverseService] createProgramme: API call failed:', err?.message || err, '| payload:', JSON.stringify(cleanPayload))
    } catch (e) {
      console.error('[dataverseService] createProgramme: API call failed (unable to serialize):', err)
    }
    throw err // re-throw so the caller can handle it
  }
}

export interface ProgrammeDetail {
  programme: ProgrammeModel | null
  projects: ProjectModel[]
  risks: RiskModel[]
  issues: IssueModel[]
}

export async function fetchProgrammeDetails(programmeId: string): Promise<ProgrammeDetail> {
  const progResult = await Pm_programmesService.get(programmeId, {
    // IMPORTANT: Do NOT include lookup alias fields (e.g. pm_portfolioname) in the select list
    // because Dataverse may return an error or unexpected result when they are requested.
    // Resolve the portfolio display name from the lookup GUID separately.
    select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_programmemanager', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'],
  })
  const programme = mapProgramme(unwrapSingle<Pm_programmes>(progResult) ?? ({} as Pm_programmes))

  // Resolve portfolio name from the lookup GUID if not already populated
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
  // Strip undefined values — Dataverse API rejects fields with null/undefined
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      cleanPayload[key] = value
    }
  }
  // Provide sensible defaults — do NOT set ownerid/owneridtype explicitly;
  // letting the Power Apps client auto-assign the current user avoids
  // 'invalid owner' errors that occur with a zero-GUID.
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
    // unwrapSingle returned null — log the raw response to aid debugging
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
    throw err // re-throw so the caller can handle it
  }
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

export async function createInitiative(payload: Partial<InitiativeModel> & { _pm_portfolio_value?: string }): Promise<InitiativeModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && key !== '_pm_portfolio_value') {
      cleanPayload[key] = value
    }
  }
  // Handle portfolio OData bind
  if (payload._pm_portfolio_value) {
    const portfolioId = normalizeLookupId(payload._pm_portfolio_value)
    if (portfolioId) {
      cleanPayload['pm_portfolio@odata.bind'] = `/pm_portfolios(${portfolioId})`
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_initiativesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createInitiative payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_initiatives>(result)
  return item ? mapInitiative(item) : null
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
  pm_projectgatereviews: Pm_projectgatereviewsService,
  pm_benefits: Pm_benefitsService,
  pm_performancemeasures: Pm_performancemeasuresService,
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

// ── Resource Data Functions ────────────────────────────────────────────────

export async function fetchResources(): Promise<ResourceModel[]> {
  const result = await Pm_resourcesService.getAll({
    filter: "statecode eq 0",
    select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', 'pm_contactemail', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate', 'pm_useremail'],
    orderBy: ['pm_fullname asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchResources result:', result) } catch (e) {}
  return unwrapList<Pm_resources>(result).map(mapResource)
}

export async function fetchResourceById(resourceId: string): Promise<ResourceModel | null> {
  const result = await Pm_resourcesService.get(resourceId, {
    select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', 'pm_contactemail', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate', 'pm_useremail'],
  })
  const item = unwrapSingle<Pm_resources>(result)
  return item ? mapResource(item) : null
}

export async function createResource(payload: Partial<ResourceModel>): Promise<ResourceModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_resourcesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createResource payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_resources>(result)
  return item ? mapResource(item) : null
}

export async function updateResource(id: string, changes: Partial<ResourceModel>): Promise<ResourceModel | null> {
  const result = await Pm_resourcesService.update(id, changes as any)
  try { console.debug('[dataverseService] updateResource id/changes/result:', id, changes, result) } catch (e) {}
  const item = unwrapSingle<Pm_resources>(result)
  return item ? mapResource(item) : null
}

export async function deleteResource(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteResource id:', id) } catch (e) {}
  await Pm_resourcesService.delete(id)
}

export async function fetchResourceAllocations(resourceId: string): Promise<ResourceAllocationModel[]> {
  const result = await Pm_resourceallocationsService.getAll({
    filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
    select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_assignmentrole', 'pm_assignmentstatus', 'pm_startdate', 'pm_enddate', '_pm_project_value'],
    orderBy: ['pm_startdate desc'],
    top: 200,
  })
  try { console.debug('[dataverseService] fetchResourceAllocations result:', result) } catch (e) {}
  return unwrapList<Pm_resourceallocations>(result).map(mapResourceAllocation)
}

// ── Timesheet Functions ────────────────────────────────────────────────────

export async function fetchTimesheets(): Promise<TimesheetModel[]> {
  const selectFields = [
    'pm_timesheetid', 'pm_timesheetname',
    'pm_periodstartdate', 'pm_periodenddate', 'pm_timesheetstatus',
    'pm_totalhours', 'pm_totalchargeablehours', 'pm_totalnonchargeablehours',
    'pm_submissiondate', 'pm_approvaldate',
    'pm_rejectionreason', 'pm_reportingperiod', '_pm_resource_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_periodenddate desc', 'pm_timesheetname asc'],
    top: 500,
  }
  const result = await Pm_timesheetsService.getAll({ ...options, filter: "statecode eq 0" })
  try { console.debug('[dataverseService] fetchTimesheets result:', result) } catch (e) {}
  let list = unwrapList<Pm_timesheets>(result).map(mapTimesheet)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchTimesheets: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_timesheetsService.getAll(options)
    list = unwrapList<Pm_timesheets>(fallbackResult).map(mapTimesheet)
  }
  return list
}

export async function createTimesheet(payload: Partial<TimesheetModel>): Promise<TimesheetModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_resource_value' && key !== 'pm_timesheetid') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    pm_timesheetstatus: 3, // Draft
    pm_totalhours: 0,
    pm_totalchargeablehours: 0,
    pm_totalnonchargeablehours: 0,
    statecode: 0,
    statuscode: 1,
  }
  // Handle resource OData bind
  if (payload._pm_resource_value) {
    const resourceId = normalizeLookupId(payload._pm_resource_value)
    if (resourceId) {
      cleanPayload['pm_resource@odata.bind'] = `/pm_resources(${resourceId})`
    }
  }
  const result = await Pm_timesheetsService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createTimesheet payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_timesheets>(result)
  return item ? mapTimesheet(item) : null
}

export async function updateTimesheetStatus(
  timesheetId: string,
  status: number,
  extra?: { pm_rejectionreason?: string }
): Promise<void> {
  const changes: Record<string, any> = { pm_timesheetstatus: status }
  if (status === 1) {
    changes.pm_submissiondate = new Date().toISOString()
    changes.pm_submittedby = 'Current User'
  }
  if (status === 0) {
    changes.pm_approvaldate = new Date().toISOString()
    changes.pm_approvedby = 'Current User'
  }
  if (status === 2 && extra?.pm_rejectionreason) {
    changes.pm_rejectionreason = extra.pm_rejectionreason
  }
  try { console.debug('[dataverseService] updateTimesheetStatus:', { timesheetId, changes }) } catch (e) {}
  await Pm_timesheetsService.update(timesheetId, changes as any)
}

export async function fetchTimesheetEntries(timesheetId: string): Promise<TimesheetEntryModel[]> {
  const selectFields = [
    'pm_timesheetentryid', 'pm_timesheetid', 'pm_hoursworked', 'pm_workdate',
    'pm_worknotes', 'pm_ischargeable', 'pm_isapproved', 'pm_isovertime',
    'pm_nonchargeablereason',
    '_pm_project_value', '_pm_projecttask_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_workdate asc'],
    top: 200,
  }
  const result = await Pm_timesheetentriesService.getAll({ ...options, filter: `_pm_timesheet_value eq '${timesheetId}' and statecode eq 0` })
  try { console.debug('[dataverseService] fetchTimesheetEntries result:', result) } catch (e) {}
  let list = unwrapList<Pm_timesheetentries>(result).map(mapTimesheetEntry)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchTimesheetEntries: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_timesheetentriesService.getAll({ ...options, filter: `_pm_timesheet_value eq '${timesheetId}'` })
    list = unwrapList<Pm_timesheetentries>(fallbackResult).map(mapTimesheetEntry)
  }
  return list
}
export async function createTimesheetEntry(payload: Partial<TimesheetEntryModel> & { pm_timesheetid: string }): Promise<TimesheetEntryModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_projecttask_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  // Timesheet OData bind
  const timesheetId = normalizeLookupId(payload.pm_timesheetid)
  if (timesheetId) {
    cleanPayload['pm_timesheet@odata.bind'] = `/pm_timesheets(${timesheetId})`
  }
  // Project OData bind
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  // Project task OData bind
  if (payload._pm_projecttask_value) {
    const taskId = normalizeLookupId(payload._pm_projecttask_value)
    if (taskId) {
      cleanPayload['pm_projecttask@odata.bind'] = `/pm_projecttasks(${taskId})`
    }
  }
  const result = await Pm_timesheetentriesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createTimesheetEntry payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_timesheetentries>(result)
  return item ? mapTimesheetEntry(item) : null
}

export async function deleteTimesheetEntry(entryId: string): Promise<void> {
  try { console.debug('[dataverseService] deleteTimesheetEntry id:', entryId) } catch (e) {}
  await Pm_timesheetentriesService.delete(entryId)
}

// ── Budget & Finance Functions ─────────────────────────────────────────────

const mapBudgetLine = (item: Pm_budgetlines): BudgetLineModel => ({
  pm_budgetlineid: item.pm_budgetlineid,
  pm_budgetlinename: item.pm_budgetlinename,
  pm_approvedbudgeteur: item.pm_approvedbudgeteur,
  pm_revisedbudgeteur: item.pm_revisedbudgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_committedspendeur: item.pm_committedspendeur,
  pm_forecastspendeur: item.pm_forecastspendeur,
  pm_varianceeur: item.pm_varianceeur,
  pm_estimateatcompletioneur: item.pm_estimateatcompletioneur,
  pm_estimatetocompleteeur: item.pm_estimatetocompleteeur,
  pm_costcategory: item.pm_costcategory,
  pm_costcategoryname: item.pm_costcategoryname,
  pm_fundingperiod: item.pm_fundingperiod,
  pm_fundingsourcecode: item.pm_fundingsourcecode,
  pm_notes: item.pm_notes,
  pm_portfolio: item.pm_portfolio,
  pm_programme: item.pm_programme,
  pm_projectcode: item.pm_projectcode,
  pm_fiscalperiodname: item.pm_fiscalperiodname,
  pm_fundingsourcename: item.pm_fundingsourcename,
  pm_portfoliolookupname: item.pm_portfoliolookupname,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  _pm_fiscalperiod_value: item._pm_fiscalperiod_value,
  _pm_fundingsource_value: item._pm_fundingsource_value,
  _pm_portfoliolookup_value: item._pm_portfoliolookup_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  _pm_project_value: item._pm_project_value,
  statecode: item.statecode,
})

const mapFundingSource = (item: Pm_fundingsources): FundingSourceModel => ({
  pm_fundingsourceid: item.pm_fundingsourceid,
  pm_fundingsourcename: item.pm_fundingsourcename,
  pm_fundingtype: item.pm_fundingtype,
  pm_fundingstatus: item.pm_fundingstatus,
  pm_totalamounteur: item.pm_totalamounteur,
  pm_allocatedamounteur: item.pm_allocatedamounteur,
  pm_availableamounteur: item.pm_availableamounteur,
  pm_fundingbody: item.pm_fundingbody,
  pm_referencecode: item.pm_referencecode,
  pm_effectivefromdate: item.pm_effectivefromdate,
  pm_effectivetodate: item.pm_effectivetodate,
  pm_portfolioname: item.pm_portfolioname,
  pm_programmename: item.pm_programmename,
  _pm_portfolio_value: item._pm_portfolio_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  statecode: item.statecode,
})

const mapCashflowEntry = (item: Pm_cashflowentries): CashflowEntryModel => ({
  pm_cashflowentryid: item.pm_cashflowentryid,
  pm_entryname: item.pm_entryname,
  pm_amounteur: item.pm_amounteur,
  pm_transactiondate: item.pm_transactiondate,
  pm_transactiondirection: item.pm_transactiondirection,
  pm_transactiontype: item.pm_transactiontype,
  pm_category: item.pm_category,
  pm_description: item.pm_description,
  pm_invoicenumber: item.pm_invoicenumber,
  pm_financialperiod: item.pm_financialperiod,
  pm_programme: item.pm_programme,
  pm_projectcode: item.pm_projectcode,
  pm_fiscalperiodname: item.pm_fiscalperiodname,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  _pm_fiscalperiod_value: item._pm_fiscalperiod_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  _pm_project_value: item._pm_project_value,
  statecode: item.statecode,
})

const mapGateReview = (item: Pm_projectgatereviews): GateReviewModel => ({
  pm_projectgatereviewid: item.pm_projectgatereviewid,
  pm_gatename: item.pm_gatename,
  pm_gatestage: item.pm_gatestage,
  pm_reviewoutcome: item.pm_reviewoutcome,
  pm_reviewstatus: item.pm_reviewstatus,
  pm_plannedreviewdate: item.pm_plannedreviewdate,
  pm_actualreviewdate: item.pm_actualreviewdate,
  pm_leadreviewer: item.pm_leadreviewer,
  pm_reviewnotes: item.pm_reviewnotes,
  pm_reviewconditions: item.pm_reviewconditions,
  pm_documentsurl: item.pm_documentsurl,
  pm_projectcode: item.pm_projectcode,
  pm_programmename: item.pm_programmename,
  _pm_project_value: item._pm_project_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  statecode: item.statecode,
})

const mapBenefit = (item: Pm_benefits): BenefitModel => ({
  pm_benefitid: item.pm_benefitid,
  pm_benefitname: item.pm_benefitname,
  pm_benefitcategory: item.pm_benefitcategory,
  pm_benefitdescription: item.pm_benefitdescription,
  pm_benefitstatus: item.pm_benefitstatus,
  pm_benefittype: item.pm_benefittype,
  pm_benefitreference: item.pm_benefitreference,
  pm_baselinevalue: item.pm_baselinevalue,
  pm_targetvalue: item.pm_targetvalue,
  pm_unitofmeasure: item.pm_unitofmeasure,
  pm_ragstatus: item.pm_ragstatus,
  pm_realisationstartdate: item.pm_realisationstartdate,
  pm_realisationenddate: item.pm_realisationenddate,
  pm_programmename: item.pm_programmename,
  pm_projectcode: item.pm_projectcode,
  pm_benifitownername: item.pm_benifitownername,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  _pm_benifitowner_value: item._pm_benifitowner_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  _pm_project_value: item._pm_project_value,
  statecode: item.statecode,
})

const mapPerformanceMeasure = (item: Pm_performancemeasures): PerformanceMeasureModel => ({
  pm_performancemeasureid: item.pm_performancemeasureid,
  pm_measurename: item.pm_measurename,
  pm_benefitname: item.pm_benefitname,
  pm_plannedvalue: item.pm_plannedvalue,
  pm_actualvalue: item.pm_actualvalue,
  pm_cumulativeplanned: item.pm_cumulativeplanned,
  pm_cumulativeactual: item.pm_cumulativeactual,
  pm_variance: item.pm_variance,
  pm_reportingperiod: item.pm_reportingperiod,
  pm_evidenced: item.pm_evidenced,
  pm_notes: item.pm_notes,
  _pm_benefit_value: item._pm_benefit_value,
  statecode: item.statecode,
})

const mapFinancialPeriod = (item: Pm_fiscalperiods): FinancialPeriodModel => ({
  pm_fiscalperiodid: item.pm_fiscalperiodid,
  pm_periodname: item.pm_periodname,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_fiscalyear: item.pm_fiscalyear,
  pm_periodnumber: item.pm_periodnumber,
  pm_isclosed: item.pm_isclosed,
  pm_iscurrentperiod: item.pm_iscurrentperiod,
  statecode: item.statecode,
})

export async function fetchBudgetLines(): Promise<BudgetLineModel[]> {
  const selectFields = [
    'pm_budgetlineid', 'pm_budgetlinename', 'pm_approvedbudgeteur',
    'pm_revisedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur',
    'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory',
    'pm_fundingperiod', 'pm_fundingsourcecode',
    'pm_notes',
    'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_budgetlinename asc'],
    top: 500,
  }
  const result = await Pm_budgetlinesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchBudgetLines result:', result) } catch (e) {}
  let list = unwrapList<Pm_budgetlines>(result).map(mapBudgetLine)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchBudgetLines: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_budgetlinesService.getAll(options)
    list = unwrapList<Pm_budgetlines>(fallbackResult).map(mapBudgetLine)
  }
  return list
}

export async function createBudgetLine(payload: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_budgetlinesService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_budgetlines>(result)
  return item ? mapBudgetLine(item) : null
}

export async function updateBudgetLine(id: string, changes: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  const result = await Pm_budgetlinesService.update(id, changes as any)
  const item = unwrapSingle<Pm_budgetlines>(result)
  return item ? mapBudgetLine(item) : null
}

export async function deleteBudgetLine(id: string): Promise<void> {
  await Pm_budgetlinesService.delete(id)
}

export async function fetchFundingSources(): Promise<FundingSourceModel[]> {
  const selectFields = [
    'pm_fundingsourceid', 'pm_fundingsourcename', 'pm_fundingtype',
    'pm_fundingstatus', 'pm_totalamounteur', 'pm_allocatedamounteur',
    'pm_availableamounteur', 'pm_fundingbody', 'pm_referencecode',
    'pm_effectivefromdate', 'pm_effectivetodate',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_fundingsourcename asc'],
    top: 500,
  }
  const result = await Pm_fundingsourcesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchFundingSources result:', result) } catch (e) {}
  let list = unwrapList<Pm_fundingsources>(result).map(mapFundingSource)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchFundingSources: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_fundingsourcesService.getAll(options)
    list = unwrapList<Pm_fundingsources>(fallbackResult).map(mapFundingSource)
  }
  return list
}

export async function fetchFinancialPeriods(): Promise<FinancialPeriodModel[]> {
  const result = await Pm_fiscalperiodsService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_fiscalperiodid', 'pm_periodname', 'pm_startdate', 'pm_enddate', 'pm_fiscalyear', 'pm_periodnumber', 'pm_isclosed', 'pm_iscurrentperiod'],
    orderBy: ['pm_startdate desc'],
    top: 200,
  })
  return unwrapList<Pm_fiscalperiods>(result).map(mapFinancialPeriod)
}

// ── Gate Review Functions ────────────────────────────────────────────────

export async function fetchGateReviews(): Promise<GateReviewModel[]> {
  const result = await Pm_projectgatereviewsService.getAll({
    filter: 'statecode eq 0',
    select: [
      'pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage',
      'pm_reviewoutcome', 'pm_reviewstatus', 'pm_plannedreviewdate',
      'pm_actualreviewdate', 'pm_leadreviewer', 'pm_reviewnotes',
      'pm_reviewconditions', 'pm_documentsurl', 'pm_projectcode',
      'pm_programmename', '_pm_project_value', '_pm_programmelookup_value',
    ],
    orderBy: ['pm_plannedreviewdate desc'],
    top: 500,
  })
  return unwrapList<Pm_projectgatereviews>(result).map(mapGateReview)
}

export async function createGateReview(payload: Partial<GateReviewModel>): Promise<GateReviewModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_programmelookup_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  // Handle project OData bind
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  // Handle programme OData bind
  if (payload._pm_programmelookup_value) {
    const programmeId = normalizeLookupId(payload._pm_programmelookup_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeLookup@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  const result = await Pm_projectgatereviewsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_projectgatereviews>(result)
  return item ? mapGateReview(item) : null
}

export async function updateGateReview(id: string, changes: Partial<GateReviewModel>): Promise<GateReviewModel | null> {
  const result = await Pm_projectgatereviewsService.update(id, changes as any)
  const item = unwrapSingle<Pm_projectgatereviews>(result)
  return item ? mapGateReview(item) : null
}

export async function deleteGateReview(id: string): Promise<void> {
  await Pm_projectgatereviewsService.delete(id)
}

// ── Benefit Functions ─────────────────────────────────────────────────────

export async function fetchBenefits(): Promise<BenefitModel[]> {
  const selectFields = [
    'pm_benefitid', 'pm_benefitname', 'pm_benefitcategory',
    'pm_benefitdescription', 'pm_benefitstatus', 'pm_benefittype',
    'pm_benefitreference', 'pm_baselinevalue', 'pm_targetvalue',
    'pm_unitofmeasure', 'pm_ragstatus', 'pm_realisationstartdate',
    'pm_realisationenddate',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_benefitname asc'],
    top: 500,
  }
  const result = await Pm_benefitsService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchBenefits result:', result) } catch (e) {}
  let list = unwrapList<Pm_benefits>(result).map(mapBenefit)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchBenefits: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_benefitsService.getAll(options)
    list = unwrapList<Pm_benefits>(fallbackResult).map(mapBenefit)
  }
  return list
}

export async function createBenefit(payload: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_benifitowner_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_benefitsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_benefits>(result)
  return item ? mapBenefit(item) : null
}

export async function updateBenefit(id: string, changes: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const result = await Pm_benefitsService.update(id, changes as any)
  const item = unwrapSingle<Pm_benefits>(result)
  return item ? mapBenefit(item) : null
}

export async function deleteBenefit(id: string): Promise<void> {
  await Pm_benefitsService.delete(id)
}

// ── Performance Measures Functions ─────────────────────────────────────────

export async function fetchPerformanceMeasures(benefitId?: string): Promise<PerformanceMeasureModel[]> {
  const filter = benefitId ? `_pm_benefit_value eq '${benefitId}' and statecode eq 0` : 'statecode eq 0'
  const result = await Pm_performancemeasuresService.getAll({
    filter,
    select: [
      'pm_performancemeasureid', 'pm_measurename', 'pm_benefitname',
      'pm_plannedvalue', 'pm_actualvalue', 'pm_cumulativeplanned',
      'pm_cumulativeactual', 'pm_variance', 'pm_reportingperiod',
      'pm_evidenced', 'pm_notes',
    ],
    orderBy: ['pm_reportingperiod asc'],
    top: 500,
  })
  return unwrapList<Pm_performancemeasures>(result).map(mapPerformanceMeasure)
}

export async function createPerformanceMeasure(payload: Partial<PerformanceMeasureModel> & { _pm_benefit_value?: string }): Promise<PerformanceMeasureModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_benefit_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_benefit_value) {
    const benefitId = normalizeLookupId(payload._pm_benefit_value)
    if (benefitId) {
      cleanPayload['pm_benefit@odata.bind'] = `/pm_benefits(${benefitId})`
    }
  }
  const result = await Pm_performancemeasuresService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_performancemeasures>(result)
  return item ? mapPerformanceMeasure(item) : null
}

export async function updatePerformanceMeasure(id: string, changes: Partial<PerformanceMeasureModel>): Promise<PerformanceMeasureModel | null> {
  const result = await Pm_performancemeasuresService.update(id, changes as any)
  const item = unwrapSingle<Pm_performancemeasures>(result)
  return item ? mapPerformanceMeasure(item) : null
}

export async function deletePerformanceMeasure(id: string): Promise<void> {
  await Pm_performancemeasuresService.delete(id)
}

export async function fetchCashflowEntries(): Promise<CashflowEntryModel[]> {
  const result = await Pm_cashflowentriesService.getAll({
    filter: 'statecode eq 0',
    select: [
      'pm_cashflowentryid', 'pm_entryname', 'pm_amounteur',
      'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
      'pm_category', 'pm_description', 'pm_invoicenumber',
      'pm_financialperiod', 'pm_programme', 'pm_projectcode',
      'pm_fiscalperiodname', 'pm_programmelookupname', 'pm_projectname',
    ],
    orderBy: ['pm_transactiondate desc'],
    top: 500,
  })
  return unwrapList<Pm_cashflowentries>(result).map(mapCashflowEntry)
}


// ── Risk Functions ────────────────────────────────────────────────────

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
  pm_inherentprobability: item.pm_inherentprobability,
  pm_inherentimpact: item.pm_inherentimpact,
  pm_inherentscore: item.pm_inherentscore,
  pm_residualprobability: item.pm_residualprobability,
  pm_residualimpact: item.pm_residualimpact,
  pm_residualscore: item.pm_residualscore,
  pm_responsestrategy: item.pm_responsestrategy,
  pm_riskcause: item.pm_riskcause,
  pm_riskeffect: item.pm_riskeffect,
  pm_riskreference: item.pm_riskreference,
  pm_programme: item.pm_programme,
  pm_projectcode: item.pm_projectcode,
  pm_programmename: item.pm_programmefkname,
  _pm_project_value: (item as any)._pm_project_value,
  _pm_programmefk_value: item._pm_programmefk_value,
  statecode: item.statecode,
})


const mapMitigationAction = (item: Pm_riskmitigationactions): RiskMitigationActionModel => ({
  pm_riskmitigationactionid: item.pm_riskmitigationactionid,
  pm_actiontitle: item.pm_actiontitle,
  pm_actiondescription: item.pm_actiondescription,
  pm_actionowner: item.pm_actionowner,
  pm_status: item.pm_status,
  pm_duedate: item.pm_duedate,
  pm_completiondate: item.pm_completiondate,
  pm_effectiveness: item.pm_effectiveness,
  pm_notes: item.pm_notes,
  _pm_risk_value: item._pm_risk_value,
  pm_riskidentifier: item.pm_riskidentifier,
  statecode: item.statecode,
})

export async function fetchMitigationActions(riskId: string): Promise<RiskMitigationActionModel[]> {
  const result = await Pm_riskmitigationactionsService.getAll({
    filter: `_pm_risk_value eq '${riskId}' and statecode eq 0`,
    select: [
      'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
      'pm_actionowner', 'pm_status', 'pm_duedate', 'pm_completiondate',
      'pm_effectiveness', 'pm_notes', '_pm_risk_value', 'pm_riskidentifier',
    ],
    orderBy: ['pm_duedate asc'],
    top: 100,
  })
  try { console.debug('[dataverseService] fetchMitigationActions result:', result, 'riskId:', riskId) } catch (e) {}
  let list = unwrapList<Pm_riskmitigationactions>(result).map(mapMitigationAction)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchMitigationActions: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_riskmitigationactionsService.getAll({
      select: [
        'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
        'pm_actionowner', 'pm_status', 'pm_duedate', 'pm_completiondate',
        'pm_effectiveness', 'pm_notes', '_pm_risk_value', 'pm_riskidentifier',
      ],
      orderBy: ['pm_duedate asc'],
      top: 100,
    })
    list = unwrapList<Pm_riskmitigationactions>(fallbackResult).map(mapMitigationAction)
  }
  return list
}

export async function fetchAllRisks(): Promise<RiskModel[]> {
  const selectFields = [
    'pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription',
    'pm_ragstatus', 'pm_riskowner', 'pm_riskstatus', 'pm_escalated',
    'pm_identifieddate', 'pm_targetclosedate',
    'pm_inherentprobability', 'pm_inherentimpact', 'pm_inherentscore',
    'pm_residualprobability', 'pm_residualimpact', 'pm_residualscore',
    'pm_responsestrategy', 'pm_riskcause', 'pm_riskeffect', 'pm_riskreference',
    '_pm_project_value', '_pm_programmefk_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_risktitle asc'],
    top: 500,
  }
  const result = await Pm_risksService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchAllRisks result:', result) } catch (e) {}
  let list = unwrapList<Pm_risks>(result).map(mapRisk)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchAllRisks: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_risksService.getAll(options)
    list = unwrapList<Pm_risks>(fallbackResult).map(mapRisk)
  }
  return list
}

export async function createRiskFull(payload: Partial<RiskModel>): Promise<RiskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_programmefk_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
    pm_riskstatus: 1, // Open
  }
  // Project OData bind
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  // Programme OData bind
  if (payload._pm_programmefk_value) {
    const programmeId = normalizeLookupId(payload._pm_programmefk_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeFK@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  const result = await Pm_risksService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_risks>(result)
  return item ? mapRisk(item) : null
}

export async function updateRiskFull(id: string, changes: Partial<RiskModel>): Promise<RiskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_riskid' && key !== '_pm_project_value' && key !== '_pm_programmefk_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_risksService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_risks>(result)
  return item ? mapRisk(item) : null
}

export async function deleteRisk(id: string): Promise<void> {
  await Pm_risksService.delete(id)
}
// ── Issue Functions ────────────────────────────────────────────────────

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
  pm_impactlevel: item.pm_impactlevel,
  pm_issuereference: item.pm_issuereference,
  pm_dateraised: item.pm_dateraised,
  pm_targetresolutiondate: item.pm_targetresolutiondate,
  pm_actualresolutiondate: item.pm_actualresolutiondate,
  pm_resolutiondetails: item.pm_resolutiondetails,
  pm_linkedrisk: item.pm_linkedrisk,
  _pm_project_value: item._pm_project_value,
  _pm_programmefk_value: item._pm_programmefk_value,
  statecode: item.statecode,
})

export async function fetchAllIssues(): Promise<IssueModel[]> {
  const selectFields = [
    'pm_issueid', 'pm_issuetitle', 'pm_issuedescription',
    'pm_issuecategory', 'pm_ragstatus', 'pm_issueowner',
    'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel',
    'pm_impactlevel', 'pm_issuereference',
    'pm_dateraised', 'pm_targetresolutiondate',
    'pm_actualresolutiondate', 'pm_resolutiondetails',
    'pm_linkedrisk', '_pm_project_value', '_pm_programmefk_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_dateraised desc'],
    top: 500,
  }
  const result = await Pm_issuesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchAllIssues result:', result) } catch (e) {}
  let list = unwrapList<Pm_issues>(result).map(mapIssue)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchAllIssues: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_issuesService.getAll(options)
    list = unwrapList<Pm_issues>(fallbackResult).map(mapIssue)
  }
  return list
}
export async function createIssueFull(payload: Partial<IssueModel>): Promise<IssueModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_programmefk_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  // Project OData bind
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  // Programme OData bind
  if (payload._pm_programmefk_value) {
    const programmeId = normalizeLookupId(payload._pm_programmefk_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeFK@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  const result = await Pm_issuesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createIssueFull payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_issues>(result)
  return item ? mapIssue(item) : null
}

export async function updateIssueFull(id: string, changes: Partial<IssueModel>): Promise<IssueModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_issueid' && key !== '_pm_project_value' && key !== '_pm_programmefk_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_issuesService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateIssueFull id/changes/result:', id, cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_issues>(result)
  return item ? mapIssue(item) : null
}

export async function deleteIssue(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteIssue id:', id) } catch (e) {}
  await Pm_issuesService.delete(id)
}

export { ragLabel, projectPhaseLabel, programmePhaseLabel }
