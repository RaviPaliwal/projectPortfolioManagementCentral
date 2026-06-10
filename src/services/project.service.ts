import {
  Pm_projectsService,
  Pm_projecttasksService,
  Pm_projectmilestonesService,
  Pm_portfoliosService,
  Pm_programmesService,
} from '@/generated'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { Pm_projecttasks } from '@/generated/models/Pm_projecttasksModel'
import type { Pm_projectmilestones } from '@/generated/models/Pm_projectmilestonesModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_agentinsights } from '@/generated/models/Pm_agentinsightsModel'
import type {
  ProjectModel,
  ProjectTaskModel,
  ProjectMilestoneModel,
  AgentInsightModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export const mapProject = (item: Pm_projects): ProjectModel => ({
  pm_projectid: item.pm_projectid,
  pm_projectname: item.pm_projectname,
  pm_projectcode: item.pm_projectcode,
  _pm_portfolio_value: item._pm_portfolio_value,
  _pm_programme_value: item._pm_programme_value,
  pm_projectmanager: item._pm_projectmanager_value,
  pm_projectmanagername: item.pm_projectmanagername || (item as any)['_pm_projectmanager_value@OData.Community.Display.V1.FormattedValue'],
  _pm_projectmanager_value: item._pm_projectmanager_value,
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
  pm_portfolioname: item.pm_portfolioname || (item as any)['_pm_portfolio_value@OData.Community.Display.V1.FormattedValue'],
  pm_programmename: item.pm_programmename || (item as any)['_pm_programme_value@OData.Community.Display.V1.FormattedValue'],
  pm_isactive: item.pm_isactive,
  pm_projectpriority: item.pm_projectpriority,
  pm_costragstatus: item.pm_costragstatus,
  pm_scheduleragstatus: item.pm_scheduleragstatus,
  pm_benefitsragstatus: item.pm_benefitsragstatus,
})

export const mapProjectTask = (item: Pm_projecttasks): ProjectTaskModel => ({
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
  pm_assignedresource: item.pm_resourcename ?? item.pm_assignedresource,
  _pm_resource_value: item._pm_resource_value,
  pm_ismilestone: item.pm_ismilestone,
  pm_oncriticalpath: item.pm_oncriticalpath,
  pm_predecessortaskid: item.pm_predecessortaskid,
  _pm_predecessortask_value: item._pm_predecessortask_value,
  _pm_project_value: item._pm_project_value,
})

export const mapProjectMilestone = (item: Pm_projectmilestones): ProjectMilestoneModel => ({
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

export async function fetchMyActiveProjects(): Promise<ProjectModel[]> {
  const selectFields = [
    'pm_projectid',
    'pm_projectname',
    'pm_projectcode',
    'pm_ragstatus',
    'pm_projectphase',
    '_pm_portfolio_value',
    '_pm_programme_value',
    '_pm_projectmanager_value',
    'pm_projectmanagername',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_projectname asc'],
    top: 50,
  }
  const activeResult = await Pm_projectsService.getAll({ ...options, filter: 'statecode eq 0' })
  let projects = unwrapList<Pm_projects>(activeResult)
  if (projects.length === 0) {
    const fallbackResult = await Pm_projectsService.getAll(options)
    projects = unwrapList<Pm_projects>(fallbackResult)
  }
  return projects.map(mapProject)
}

export async function fetchProjectDetails(projectId: string): Promise<ProjectModel | null> {
  const normalizedId = normalizeLookupId(projectId)
  if (!normalizedId) return null

  try {
    // Incrementally adding fields to find the one breaking the query
    const result = await Pm_projectsService.get(normalizedId, {
      select: [
        'pm_projectid', 'pm_projectname', 'pm_projectcode',
        '_pm_portfolio_value', '_pm_programme_value',
        '_pm_projectmanager_value', 'pm_projectphase', 'pm_ragstatus',
        'pm_plannedstartdate', 'pm_plannedenddate',
        'pm_approvedbudgeteur', 'pm_actualcosteur',
        'pm_percentcomplete', 'pm_businessunit'
      ]
    })
    
    if (result && typeof result === 'object' && 'success' in result && result.success === false) {
       console.error('[dataverseService] fetchProjectDetails API Error:', result)
       return null
    }

    const item = unwrapSingle<Pm_projects>(result)
    
    if (!item || !item.pm_projectid) {
      try { console.warn('[dataverseService] fetchProjectDetails: record not found or invalid response for ID:', normalizedId, result) } catch (e) {}
      return null
    }
    
    const mapped = mapProject(item)
    
    // Resolve lookup names safely
    try {
      if (mapped._pm_portfolio_value) {
        const pRes = await Pm_portfoliosService.get(mapped._pm_portfolio_value, { select: ['pm_portfolioname'] })
        const pItem = unwrapSingle<any>(pRes)
        if (pItem?.pm_portfolioname) mapped.pm_portfolioname = pItem.pm_portfolioname
      }
      if (mapped._pm_programme_value) {
        const prRes = await Pm_programmesService.get(mapped._pm_programme_value, { select: ['pm_programmename'] })
        const prItem = unwrapSingle<any>(prRes)
        if (prItem?.pm_programmename) mapped.pm_programmename = prItem.pm_programmename
      }
    } catch (e) {
      // Ignore lookup resolution failures
    }
    
    return mapped
  } catch (err) {
    try { console.error('[dataverseService] fetchProjectDetails exception for ID:', normalizedId, err) } catch (e) {}
    return null
  }
}

export async function fetchProjectsFull(): Promise<ProjectModel[]> {
  const result = await Pm_projectsService.getAll({
    filter: "statecode eq 0",
    select: [
      'pm_projectid', 'pm_projectname', 'pm_projectcode',
      '_pm_portfolio_value', '_pm_programme_value',
      '_pm_projectmanager_value', 'pm_projectphase', 'pm_ragstatus',
      'pm_plannedstartdate', 'pm_plannedenddate',
      'pm_actualstartdate', 'pm_actualenddate',
      'pm_approvedbudgeteur', 'pm_actualcosteur',
      'pm_percentcomplete', 'pm_businessunit', 'pm_projectsponsor',
    ],
    orderBy: ['pm_projectname asc'],
    top: 500,
  })
  let projects = unwrapList<Pm_projects>(result).map(mapProject)
  if (projects.length === 0) {
    const fallbackResult = await Pm_projectsService.getAll({
      select: [
        'pm_projectid', 'pm_projectname', 'pm_projectcode',
        '_pm_portfolio_value', '_pm_programme_value',
        '_pm_projectmanager_value', 'pm_projectmanagername', 'pm_projectphase', 'pm_ragstatus',
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

  // Resolve Names
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

export async function createProject(payload: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const cleanPayload: Record<string, any> = {}
  const exclude = ['_pm_portfolio_value', '_pm_programme_value', 'pm_projectmanager', 'pm_projectid']
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && !exclude.includes(key)) {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_portfolio_value) cleanPayload['pm_portfolio@odata.bind'] = `/pm_portfolios(${normalizeLookupId(payload._pm_portfolio_value)})`
  if (payload._pm_programme_value) cleanPayload['pm_programme@odata.bind'] = `/pm_programmes(${normalizeLookupId(payload._pm_programme_value)})`
  if (payload.pm_projectmanager) cleanPayload['pm_ProjectManager@odata.bind'] = `/systemusers(${normalizeLookupId(payload.pm_projectmanager)})`

  const defaults = { statecode: 0, statuscode: 1 }
  const result = await Pm_projectsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_projects>(result)
  return item ? mapProject(item) : null
}

export async function updateProject(id: string, changes: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const normalizedId = normalizeLookupId(id)
  if (!normalizedId) return null

  const cleanPayload: Record<string, any> = {}
  // Only include fields that are in Pm_projectsBase (the update schema).
  // Exclude computed/display-only fields that come from the initialData spread in the form
  // and would cause API errors if sent back during an update.
  const exclude = [
    '_pm_portfolio_value', '_pm_programme_value',
    'pm_projectmanager', 'pm_projectid',
    '_pm_projectmanager_value',
    'pm_projectmanagername',
    'pm_portfolioname',
    'pm_programmename',
  ]
  
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && value !== '' && !exclude.includes(key)) {
      cleanPayload[key] = value
    }
  }

  // Handle lookup bindings — always set them so clearing a lookup works too.
  // If the value is empty/falsy, set the odata.bind to null to clear it.
  if (changes._pm_portfolio_value !== undefined) {
    cleanPayload['pm_portfolio@odata.bind'] = changes._pm_portfolio_value
      ? `/pm_portfolios(${normalizeLookupId(changes._pm_portfolio_value)})`
      : null
  }
  if (changes._pm_programme_value !== undefined) {
    cleanPayload['pm_programme@odata.bind'] = changes._pm_programme_value
      ? `/pm_programmes(${normalizeLookupId(changes._pm_programme_value)})`
      : null
  }
  if (changes.pm_projectmanager !== undefined) {
    cleanPayload['pm_ProjectManager@odata.bind'] = changes.pm_projectmanager
      ? `/systemusers(${normalizeLookupId(changes.pm_projectmanager)})`
      : null
  }

  try {
    const result = await Pm_projectsService.update(normalizedId, cleanPayload as any)
    try { console.debug('[dataverseService] updateProject API response:', result) } catch (e) {}
    
    // Dataverse update often returns empty. We ALWAYS fetch fresh full details 
    // to ensure the UI gets the complete record with all computed/lookup fields.
    return fetchProjectDetails(normalizedId)
  } catch (err) {
    try { console.error('[dataverseService] updateProject failed:', err) } catch (e) {}
    throw err
  }
}

export async function deleteProject(id: string): Promise<void> {
  await Pm_projectsService.delete(id)
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
        'pm_resourcename', '_pm_resource_value', 'pm_assignedresource', 'pm_ismilestone', 'pm_oncriticalpath',
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
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_project_value' && key !== '_pm_predecessortask_value') {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_project_value) cleanPayload['pm_project@odata.bind'] = `/pm_projects(${normalizeLookupId(payload._pm_project_value)})`
  if (payload._pm_predecessortask_value) cleanPayload['pm_PredecessorTask@odata.bind'] = `/pm_projecttasks(${normalizeLookupId(payload._pm_predecessortask_value)})`
  const result = await Pm_projecttasksService.create({ statecode: 0, statuscode: 1, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_projecttasks>(result)
  return item ? mapProjectTask(item) : null
}

export async function updateScheduleTask(id: string, changes: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && key !== 'pm_projecttaskid' && key !== '_pm_project_value' && key !== '_pm_predecessortask_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_projecttasksService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_projecttasks>(result)
  return item ? mapProjectTask(item) : null
}

export async function deleteScheduleTask(id: string): Promise<void> {
  await Pm_projecttasksService.delete(id)
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

export async function createProjectTask(payload: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_project_value' && key !== '_pm_predecessortask_value' && key !== '_pm_resource_value') {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_project_value) cleanPayload['pm_project@odata.bind'] = `/pm_projects(${normalizeLookupId(payload._pm_project_value)})`
  if (payload._pm_predecessortask_value) cleanPayload['pm_PredecessorTask@odata.bind'] = `/pm_projecttasks(${normalizeLookupId(payload._pm_predecessortask_value)})`
  if (payload._pm_resource_value) cleanPayload['pm_resource@odata.bind'] = `/pm_resources(${normalizeLookupId(payload._pm_resource_value)})`
  const result = await Pm_projecttasksService.create({ statecode: 0, statuscode: 1, ...cleanPayload } as any)
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
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_project_value) cleanPayload['pm_project@odata.bind'] = `/pm_projects(${normalizeLookupId(payload._pm_project_value)})`
  const result = await Pm_projectmilestonesService.create({ statecode: 0, statuscode: 1, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_projectmilestones>(result)
  return item ? mapProjectMilestone(item) : null
}

export const mapAgentInsight = (item: Pm_agentinsights): AgentInsightModel => ({
  pm_agentinsightid: item.pm_agentinsightid,
  pm_insighttitle: item.pm_insighttitle,
  pm_insightdescription: item.pm_insightdescription,
  pm_insighttype: item.pm_insighttype,
  pm_priority: item.pm_priority,
  pm_actionstatus: item.pm_actionstatus,
  pm_confidencescore: item.pm_confidencescore,
  pm_sourceagent: item.pm_sourceagent,
  pm_projectname: item.pm_projectname,
  pm_insighttypename: item.pm_insighttypename,
  pm_actionstatusname: item.pm_actionstatusname,
  pm_priorityname: item.pm_priorityname,
  createdon: item.createdon,
})

export async function fetchProjectAgentInsights(projectId: string): Promise<AgentInsightModel[]> {
  try {
    const { Pm_agentinsightsService } = await import('@/generated')
    const result = await Pm_agentinsightsService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      top: 50,
      orderBy: ['createdon desc'],
    })
    if (!result) return []
    const data = result.success && Array.isArray(result.data) ? result.data
      : 'value' in result && Array.isArray((result as any).value) ? (result as any).value
      : Array.isArray(result) ? result : []
    return (data as Pm_agentinsights[]).map(mapAgentInsight)
  } catch {
    return []
  }
}

export async function deleteProjectMilestone(id: string): Promise<void> {
  await Pm_projectmilestonesService.delete(id)
}

export async function recalculateProjectFinancials(projectId: string): Promise<ProjectModel | null> {
  try {
    const { Pm_budgetlinesService } = await import('@/generated')
    const budgetResult = await Pm_budgetlinesService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      select: ['pm_approvedbudgeteur', 'pm_actualspendeur'],
      top: 500
    })
    const lines = unwrapList<any>(budgetResult)
    const totals = lines.reduce((acc, line) => ({
      budget: acc.budget + Number(line.pm_approvedbudgeteur || 0),
      actual: acc.actual + Number(line.pm_actualspendeur || 0),
    }), { budget: 0, actual: 0 })
    const updated = await Pm_projectsService.update(projectId, {
      pm_approvedbudgeteur: totals.budget,
      pm_actualcosteur: totals.actual,
    } as any)
    
    const item = unwrapSingle<Pm_projects>(updated)
    if (!item) {
      return fetchProjectDetails(projectId)
    }
    return mapProject(item)
  } catch (err) {
    console.error('[dataverseService] recalculateProjectFinancials failed:', err)
    return null
  }
}
