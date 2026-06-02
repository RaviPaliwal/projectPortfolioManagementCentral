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
import type {
  ProjectModel,
  ProjectTaskModel,
  ProjectMilestoneModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export const mapProject = (item: Pm_projects): ProjectModel => ({
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
  pm_assignedresource: item.pm_assignedresource,
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

  const mapped = projects.map(mapProject)

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
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
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

export async function createProject(payload: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.create(payload as any)
  try { console.debug('[dataverseService] createProject payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_projects>(result)
  return item ? mapProject(item) : null
}

export async function updateProject(id: string, changes: Partial<ProjectModel>): Promise<ProjectModel | null> {
  const result = await Pm_projectsService.update(id, changes as any)
  try { console.debug('[dataverseService] updateProject id/changes/result:', id, changes, result) } catch (e) {}
  const item = unwrapSingle<Pm_projects>(result)
  return item ? mapProject(item) : null
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
