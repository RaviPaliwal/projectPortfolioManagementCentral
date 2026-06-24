import {
    Pm_projectsService,
    Pm_projecttasksService,
    Pm_projectmilestonesService,
    Pm_portfoliosService,
    Pm_programmesService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
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

export const mapProjectTask = (item: Pm_projecttasks): ProjectTaskModel => {
    return {
        pm_projecttaskid: item.pm_projecttaskid,
        pm_taskname: item.pm_taskname,
        pm_taskdescription: item.pm_taskname ?? item.pm_projecttaskname,
        pm_tasklevel: item.pm_tasklevel,
        pm_parenttaskid: item._pm_projecttask_value || undefined,
        pm_wbsnumber: item.pm_wbsnumber,
        pm_durationdays: item.pm_durationdays,
        pm_lagdays: item.pm_lagdays,
        pm_plannedstartdate: item.pm_plannedstartdate,
        pm_plannedenddate: item.pm_plannedenddate,
        pm_actualstartdate: item.pm_actualstartdate,
        pm_actualenddate: item.pm_actualenddate,
        pm_percentcomplete: item.pm_percentcomplete,
        pm_taskstatus: item.pm_taskstatus,
        pm_assignedresource: item.pm_assignedtoresourcename || (item as any)['_pm_assignedtoresource_value@OData.Community.Display.V1.FormattedValue'] || (item as any).pm_assignedresource,
        pm_ismilestone: (item as any).pm_ismilestone,
        pm_oncriticalpath: item.pm_oncriticalpath,
        pm_predecessortaskid: (item as any).pm_predecessortaskid,
        _pm_predecessortask_value: item._pm_predecessortask_value,
        _pm_project_value: item._pm_project_value,
        _pm_assignedtoresource_value: item._pm_assignedtoresource_value,
    }
}

export const mapProjectMilestone = (item: Pm_projectmilestones): ProjectMilestoneModel => {
    return {
        pm_projectmilestoneid: item.pm_projectmilestoneid,
        pm_milestonename: item.pm_milestonename,
        pm_milestonetype: item.pm_milestonetype,
        pm_planneddate: item.pm_planneddate,
        pm_actualdate: item.pm_actualdate,
        pm_ragstatus: item.pm_ragstatus,
        pm_status: item.pm_status,
        pm_owner: (item as any).pm_owner,
        pm_description: item.pm_description,
        _pm_project_value: item._pm_project_value,
        _pm_responsible_value: item._pm_responsible_value,
        pm_responsible: item.pm_responsiblename || (item as any)['_pm_responsible_value@OData.Community.Display.V1.FormattedValue'] || (item as any).pm_responsible,
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
                'pm_actualstartdate', 'pm_actualenddate',
                'pm_approvedbudgeteur', 'pm_actualcosteur',
                'pm_percentcomplete', 'pm_businessunit',
                'pm_projectsponsor', 'pm_costragstatus',
                'pm_scheduleragstatus', 'pm_benefitsragstatus',
                'pm_isactive', 'pm_projectpriority'
            ]
        })

        if (result && typeof result === 'object' && 'success' in result && result.success === false) {
            console.error('[dataverseService] fetchProjectDetails API Error:', result)
            return null
        }

        const item = unwrapSingle<Pm_projects>(result)

        if (!item || !item.pm_projectid) return null

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
        console.error('[dataverseService] fetchProjectDetails exception for ID:', normalizedId, err)
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
    } catch (err) { }

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
    if (item && item.pm_projectid) {
        writeAuditLog({
            actionType: 'Create',
            entityName: 'pm_projects',
            recordId: item.pm_projectid,
            recordName: item.pm_projectname || '',
            newValue: `Project created: ${item.pm_projectname || ''}`
        })
    }
    return item ? mapProject(item) : null
}

export async function updateProject(id: string, changes: Partial<ProjectModel>): Promise<ProjectModel | null> {
    const normalizedId = normalizeLookupId(id)
    if (!normalizedId) return null

    let original: ProjectModel | null = null
    try {
        original = await fetchProjectDetails(normalizedId)
    } catch (e) {
        console.error('[updateProject] Failed to fetch original project details:', e)
    }

    const hasChanged = (key: string, newVal: any): boolean => {
        if (original === null) return true
        const oldVal = (original as any)[key]

        const formatCompare = (val: any): string => {
            if (val === undefined || val === null) return ''
            // Normalize dates: if ISO string containing T, extract only YYYY-MM-DD
            if (typeof val === 'string' && val.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
                return val.split('T')[0]
            }
            if (typeof val === 'object') return JSON.stringify(val)
            return String(val).trim()
        }

        return formatCompare(oldVal) !== formatCompare(newVal)
    }

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
        if (value !== undefined && value !== null && !exclude.includes(key)) {
            if (hasChanged(key, value)) {
                cleanPayload[key] = value
            }
        }
    }

    // Handle lookup bindings only if they have changed
    if (changes._pm_portfolio_value !== undefined && hasChanged('_pm_portfolio_value', changes._pm_portfolio_value)) {
        cleanPayload['pm_portfolio@odata.bind'] = changes._pm_portfolio_value
            ? `/pm_portfolios(${normalizeLookupId(changes._pm_portfolio_value)})`
            : null
    }
    if (changes._pm_programme_value !== undefined && hasChanged('_pm_programme_value', changes._pm_programme_value)) {
        cleanPayload['pm_programme@odata.bind'] = changes._pm_programme_value
            ? `/pm_programmes(${normalizeLookupId(changes._pm_programme_value)})`
            : null
    }
    if (changes.pm_projectmanager !== undefined) {
        const oldManager = normalizeLookupId(original?._pm_projectmanager_value)
        const newManager = normalizeLookupId(changes.pm_projectmanager)
        if (oldManager !== newManager) {
            cleanPayload['pm_ProjectManager@odata.bind'] = newManager
                ? `/systemusers(${newManager})`
                : null
        }
    }

    if (Object.keys(cleanPayload).length === 0) {
        return original
    }

    try {
        const result = await Pm_projectsService.update(normalizedId, cleanPayload as any)

        // Log audit entries for changed fields
        if (original) {
            const formatVal = (val: any): string => {
                if (val === undefined || val === null) return ''
                if (typeof val === 'object') return JSON.stringify(val)
                return String(val)
            }

            // Log standard fields in cleanPayload (excluding lookup bind keys)
            for (const [key, value] of Object.entries(cleanPayload)) {
                if (key.includes('@odata.bind')) continue
                const oldVal = (original as any)[key]
                const isStatus = key === 'pm_projectstatus' || key === 'statuscode' || key === 'statecode'
                writeAuditLog({
                    actionType: isStatus ? 'StatusChange' : 'Update',
                    entityName: 'pm_projects',
                    recordId: normalizedId,
                    recordName: original.pm_projectname || '',
                    fieldName: key,
                    oldValue: formatVal(oldVal),
                    newValue: formatVal(value)
                })
            }

            // Log lookup field updates if any
            if (changes._pm_portfolio_value !== undefined && hasChanged('_pm_portfolio_value', changes._pm_portfolio_value)) {
                writeAuditLog({
                    actionType: 'Update',
                    entityName: 'pm_projects',
                    recordId: normalizedId,
                    recordName: original.pm_projectname || '',
                    fieldName: 'pm_portfolio',
                    oldValue: original._pm_portfolio_value || '',
                    newValue: changes._pm_portfolio_value || ''
                })
            }
            if (changes._pm_programme_value !== undefined && hasChanged('_pm_programme_value', changes._pm_programme_value)) {
                writeAuditLog({
                    actionType: 'Update',
                    entityName: 'pm_projects',
                    recordId: normalizedId,
                    recordName: original.pm_projectname || '',
                    fieldName: 'pm_programme',
                    oldValue: original._pm_programme_value || '',
                    newValue: changes._pm_programme_value || ''
                })
            }
            if (changes.pm_projectmanager !== undefined && hasChanged('_pm_projectmanager_value', changes.pm_projectmanager)) {
                writeAuditLog({
                    actionType: 'Update',
                    entityName: 'pm_projects',
                    recordId: normalizedId,
                    recordName: original.pm_projectname || '',
                    fieldName: 'pm_projectmanager',
                    oldValue: original._pm_projectmanager_value || '',
                    newValue: changes.pm_projectmanager || ''
                })
            }
        } else { }

        // Dataverse update often returns empty. We ALWAYS fetch fresh full details 
        // to ensure the UI gets the complete record with all computed/lookup fields.
        return fetchProjectDetails(normalizedId)
    } catch (err) {
        console.error('[updateProject] ❌ updateProject failed:', err)
        throw err
    }
}

export async function deleteProject(id: string): Promise<void> {
    let recordName = id
    try {
        const details = await fetchProjectDetails(id)
        if (details?.pm_projectname) recordName = details.pm_projectname
    } catch (e) { }

    await Pm_projectsService.delete(id)

    writeAuditLog({
        actionType: 'Update',
        entityName: 'pm_projects',
        recordId: id,
        recordName: recordName,
        fieldName: 'deleted',
        oldValue: 'Active',
        newValue: 'Deleted'
    })
}

export async function fetchProjectTasks(projectId: string): Promise<ProjectTaskModel[]> {
    const result = await Pm_projecttasksService.getAll({
        filter: `_pm_project_value eq '${projectId}'`,
        select: [
            'pm_projecttaskid', 'pm_taskname',
            'pm_tasklevel', 'pm_wbsnumber',
            'pm_durationdays',
            'pm_plannedstartdate', 'pm_plannedenddate',
            'pm_actualstartdate', 'pm_actualenddate',
            'pm_percentcomplete', 'pm_taskstatus',
            '_pm_assignedtoresource_value', 'pm_oncriticalpath',
            '_pm_predecessortask_value',
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
                'pm_projecttaskid', 'pm_taskname',
                'pm_tasklevel', 'pm_wbsnumber',
                'pm_durationdays',
                'pm_plannedstartdate', 'pm_plannedenddate',
                'pm_actualstartdate', 'pm_actualenddate',
                'pm_percentcomplete', 'pm_taskstatus',
                '_pm_assignedtoresource_value', 'pm_oncriticalpath',
                '_pm_predecessortask_value',
            ],
            orderBy: ['pm_tasklevel asc', 'pm_wbsnumber asc', 'pm_taskname asc'],
            top: 500,
        }),
        Pm_projectmilestonesService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: [
                'pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype',
                'pm_planneddate', 'pm_actualdate', 'pm_ragstatus', 'pm_status',
                'pm_description', '_pm_responsible_value',
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
        select: [
            'pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype',
            'pm_planneddate', 'pm_actualdate', 'pm_description',
            'pm_status', 'pm_ragstatus', '_pm_project_value',
            '_pm_responsible_value',
        ],
        orderBy: ['pm_planneddate asc'],
        top: 200,
    })
    return unwrapList<Pm_projectmilestones>(result).map(mapProjectMilestone)
}

const WRITABLE_TASK_KEYS = [
    'pm_taskname',
    'pm_tasklevel',
    'pm_wbsnumber',
    'pm_durationdays',
    'pm_lagdays',
    'pm_plannedstartdate',
    'pm_plannedenddate',
    'pm_actualstartdate',
    'pm_actualenddate',
    'pm_percentcomplete',
    'pm_taskstatus',
    'pm_ismilestone',
    'pm_oncriticalpath',
]

const WRITABLE_MILESTONE_KEYS = [
    'pm_milestonename',
    'pm_planneddate',
    'pm_actualdate',
    'pm_milestonetype',
    'pm_ragstatus',
    'pm_status',
    'pm_description',
]


export async function createProjectTask(payload: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
    try {
        const cleanPayload: Record<string, any> = {}
        for (const [key, value] of Object.entries(payload)) {
            if (
                value !== undefined &&
                value !== null &&
                value !== '' &&
                WRITABLE_TASK_KEYS.includes(key)
            ) {
                cleanPayload[key] = value
            }
        }
        if (payload._pm_project_value) {
            cleanPayload['pm_project@odata.bind'] = `/pm_projects(${normalizeLookupId(payload._pm_project_value)})`
        }
        if (payload._pm_predecessortask_value) {
            cleanPayload['pm_PredecessorTask@odata.bind'] = `/pm_projecttasks(${normalizeLookupId(payload._pm_predecessortask_value)})`
        }
        if (payload.pm_assignedresource) {
            cleanPayload['pm_AssignedToResource@odata.bind'] = `/pm_resources(${normalizeLookupId(payload.pm_assignedresource)})`
        }
        if (payload.pm_parenttaskid) {
            cleanPayload['pm_projecttask@odata.bind'] = `/pm_projecttasks(${normalizeLookupId(payload.pm_parenttaskid)})`
        }
        const result = await Pm_projecttasksService.create({ statecode: 0, statuscode: 1, ...cleanPayload } as any)
        const item = unwrapSingle<Pm_projecttasks>(result)
        return item ? mapProjectTask(item) : null
    } catch (err) {
        console.error('[createProjectTask] error caught:', err)
        throw err
    }
}

export async function updateProjectTask(id: string, changes: Partial<ProjectTaskModel>): Promise<ProjectTaskModel | null> {
    try {
        const cleanPayload: Record<string, any> = {}
        for (const [key, value] of Object.entries(changes)) {
            if (
                value !== undefined &&
                value !== null &&
                WRITABLE_TASK_KEYS.includes(key)
            ) {
                cleanPayload[key] = value
            }
        }

        if (changes._pm_project_value !== undefined) {
            cleanPayload['pm_project@odata.bind'] = changes._pm_project_value
                ? `/pm_projects(${normalizeLookupId(changes._pm_project_value)})`
                : null
        }
        if (changes._pm_predecessortask_value !== undefined) {
            cleanPayload['pm_PredecessorTask@odata.bind'] = changes._pm_predecessortask_value
                ? `/pm_projecttasks(${normalizeLookupId(changes._pm_predecessortask_value)})`
                : null
        }
        if (changes.pm_assignedresource !== undefined) {
            cleanPayload['pm_AssignedToResource@odata.bind'] = changes.pm_assignedresource
                ? `/pm_resources(${normalizeLookupId(changes.pm_assignedresource)})`
                : null
        }
        if (changes.pm_parenttaskid !== undefined) {
            cleanPayload['pm_projecttask@odata.bind'] = changes.pm_parenttaskid
                ? `/pm_projecttasks(${normalizeLookupId(changes.pm_parenttaskid)})`
                : null
        }
        const result = await Pm_projecttasksService.update(id, cleanPayload as any)
        const item = unwrapSingle<Pm_projecttasks>(result)
        return item ? mapProjectTask(item) : null
    } catch (err) {
        console.error('[updateProjectTask] error caught:', err)
        throw err
    }
}

export async function deleteProjectTask(id: string): Promise<void> {
    await Pm_projecttasksService.delete(id)
}

export async function deleteProjectMilestone(id: string): Promise<void> {
    await Pm_projectmilestonesService.delete(id)
}

export async function createProjectMilestone(payload: Partial<ProjectMilestoneModel>): Promise<ProjectMilestoneModel | null> {
    try {
        const cleanPayload: Record<string, any> = {}
        for (const [key, value] of Object.entries(payload)) {
            if (
                value !== undefined &&
                value !== null &&
                value !== '' &&
                WRITABLE_MILESTONE_KEYS.includes(key)
            ) {
                cleanPayload[key] = value
            }
        }
        if (payload._pm_project_value) {
            cleanPayload['pm_project@odata.bind'] = `/pm_projects(${normalizeLookupId(payload._pm_project_value)})`
        }
        if (payload.pm_responsible) {
            cleanPayload['pm_Responsible@odata.bind'] = `/pm_resources(${normalizeLookupId(payload.pm_responsible)})`
        }

        const result = await Pm_projectmilestonesService.create({ statecode: 0, statuscode: 1, ...cleanPayload } as any)
        if (result && !result.success) {
            console.error('[createProjectMilestone] API Error:', result.error || result)
            throw new Error(result.error?.message || 'API request failed')
        }
        const item = unwrapSingle<Pm_projectmilestones>(result)
        return item ? mapProjectMilestone(item) : null
    } catch (err) {
        console.error('[createProjectMilestone] error caught:', err)
        throw err
    }
}

export async function updateProjectMilestone(id: string, changes: Partial<ProjectMilestoneModel>): Promise<ProjectMilestoneModel | null> {
    try {
        const cleanPayload: Record<string, any> = {}
        for (const [key, value] of Object.entries(changes)) {
            if (
                value !== undefined &&
                value !== null &&
                WRITABLE_MILESTONE_KEYS.includes(key)
            ) {
                cleanPayload[key] = value
            }
        }

        let result: any = null;
        if (changes.pm_responsible !== undefined) {
            const payloadToTry = { ...cleanPayload };
            payloadToTry['pm_Responsible@odata.bind'] = changes.pm_responsible
                ? `/pm_resources(${normalizeLookupId(changes.pm_responsible)})`
                : null;
            result = await Pm_projectmilestonesService.update(id, payloadToTry as any);
        } else {
            result = await Pm_projectmilestonesService.update(id, cleanPayload as any);
        }

        if (result && !result.success) {
            console.error('[updateProjectMilestone] API Error:', result.error || result)
            throw new Error(result.error?.message || 'API request failed')
        }
        const item = unwrapSingle<Pm_projectmilestones>(result)
        return item ? mapProjectMilestone(item) : null
    } catch (err) {
        console.error('[updateProjectMilestone] error caught:', err)
        throw err
    }
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
