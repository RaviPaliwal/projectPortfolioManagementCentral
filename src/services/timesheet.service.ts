import {
  Pm_timesheetsService,
  Pm_timesheetentriesService,
  Pm_resourcesService,
  Pm_projectsService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
import type { Pm_timesheets } from '@/generated/models/Pm_timesheetsModel'
import type { Pm_timesheetentries } from '@/generated/models/Pm_timesheetentriesModel'
import type { Pm_resources } from '@/generated/models/Pm_resourcesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type {
  TimesheetModel,
  TimesheetEntryModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { recalculateRealFinancialsForProject } from './finance.service'
import type { IGetAllOptions } from '@/generated/models/CommonModels'

export const mapTimesheet = (item: Pm_timesheets): TimesheetModel => ({
  pm_timesheetid: item.pm_timesheetid,
  pm_timesheetname: item.pm_timesheetname,
  pm_ownername: item.pm_resourcename,
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
  pm_resourcename: item.pm_resourcename,
  _pm_resource_value: item._pm_resource_value,
})

export const mapTimesheetEntry = (item: Pm_timesheetentries): TimesheetEntryModel => ({
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

export async function fetchTimesheets(resourceId?: string): Promise<TimesheetModel[]> {
  try {
    const selectFields = [
      'pm_timesheetid', 'pm_timesheetname',
      'pm_periodstartdate', 'pm_periodenddate', 'pm_timesheetstatus',
      'pm_totalhours', 'pm_totalchargeablehours', 'pm_totalnonchargeablehours',
      'pm_submissiondate', 'pm_submittedby',
      'pm_approvaldate', 'pm_approvedby',
      'pm_rejectionreason', '_pm_resource_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['pm_periodenddate desc', 'pm_timesheetname asc'],
      top: 500
    }
    const filters = ["statecode eq 0"]
    if (resourceId) {
      filters.push(`_pm_resource_value eq '${normalizeLookupId(resourceId)}'`)
    }
    const result = await Pm_timesheetsService.getAll({ ...options, filter: filters.join(" and ") })
    if (!result.success) {
      console.error('[TimesheetService] fetchTimesheets failed:', result.error)
      return []
    }
    const list = unwrapList<Pm_timesheets>(result).map(mapTimesheet)

    try {
      const resourceIds = Array.from(new Set(list.map((ts) => normalizeLookupId(ts._pm_resource_value)).filter(Boolean))) as string[]
      if (resourceIds.length > 0) {
        const resourcesResult = await Pm_resourcesService.getAll({
          filter: resourceIds.map((id) => `pm_resourceid eq '${id}'`).join(' or '),
          select: ['pm_resourceid', 'pm_fullname'],
          top: 500,
        })
        if (resourcesResult.success) {
          const resources = unwrapList<Pm_resources>(resourcesResult)
          const resourceNameById = new Map<string, string>()
          for (const res of resources) {
            if (res.pm_resourceid && res.pm_fullname) {
              const normalizedId = normalizeLookupId(res.pm_resourceid)
              if (normalizedId) {
                resourceNameById.set(normalizedId, res.pm_fullname.trim())
              }
            }
          }
          for (const ts of list) {
            const normalizedValue = normalizeLookupId(ts._pm_resource_value)
            if (normalizedValue && resourceNameById.has(normalizedValue)) {
              ts.pm_resourcename = resourceNameById.get(normalizedValue)
            }
          }
        }
      }
    } catch (err) {
      console.error('[TimesheetService] fetchTimesheets resource resolution failed:', err)
    }

    return list
  } catch (err) {
    console.error('[TimesheetService] fetchTimesheets exception:', err)
    return []
  }
}

/**
 * Fetch a single timesheet by ID with full details.
 */
export async function fetchTimesheetDetails(timesheetId: string): Promise<TimesheetModel | null> {
  try {
    const selectFields = [
      'pm_timesheetid', 'pm_timesheetname',
      'pm_periodstartdate', 'pm_periodenddate', 'pm_timesheetstatus',
      'pm_totalhours', 'pm_totalchargeablehours', 'pm_totalnonchargeablehours',
      'pm_submissiondate', 'pm_submittedby',
      'pm_approvaldate', 'pm_approvedby',
      'pm_rejectionreason', '_pm_resource_value',
    ]
    const result = await Pm_timesheetsService.get(timesheetId, { select: selectFields })
    if (!result.success) {
      console.error('[TimesheetService] fetchTimesheetDetails failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_timesheets>(result)
    if (!item) return null
    const mapped = mapTimesheet(item)
    try {
      const resourceId = normalizeLookupId(item._pm_resource_value)
      if (resourceId) {
        const resResult = await Pm_resourcesService.get(resourceId, { select: ['pm_resourceid', 'pm_fullname'] })
        if (resResult.success) {
          const res = unwrapSingle<Pm_resources>(resResult)
          if (res?.pm_fullname) {
            mapped.pm_resourcename = res.pm_fullname.trim()
            mapped.pm_ownername = res.pm_fullname.trim()
          }
        }
      }
    } catch (err) {
      console.error('[TimesheetService] fetchTimesheetDetails resource fetch failed:', err)
    }
    return mapped
  } catch (err) {
    console.error('[TimesheetService] fetchTimesheetDetails failed:', err)
    return null
  }
}

export async function createTimesheet(payload: Partial<TimesheetModel>): Promise<TimesheetModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' && key !== '_pm_resource_value' && key !== 'pm_timesheetid' && key !== 'pm_ownername' && key !== 'pm_resourcename' && key !== 'ownerid' && key !== 'owneridtype') {
        cleanPayload[key] = value
      }
    }
    const defaults: Record<string, unknown> = {
      pm_timesheetstatus: 3,
      pm_totalhours: 0,
      pm_totalchargeablehours: 0,
      pm_totalnonchargeablehours: 0,
      statecode: 0,
      statuscode: 1,
    }
    if (payload.ownerid) {
      const ownerId = normalizeLookupId(payload.ownerid)
      if (ownerId) {
        cleanPayload['ownerid@odata.bind'] = `/systemusers(${ownerId})`
      }
    }
    if (payload._pm_resource_value) {
      const resourceId = normalizeLookupId(payload._pm_resource_value)
      if (resourceId) {
        cleanPayload['pm_resource@odata.bind'] = `/pm_resources(${resourceId})`
      }
    }
    const result = await Pm_timesheetsService.create({ ...defaults, ...cleanPayload } as unknown as Pm_timesheets)
    if (!result.success) {
      console.error('[TimesheetService] createTimesheet failed:', result.error)
      throw new Error(`Failed to create timesheet: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_timesheets>(result)
    if (item && item.pm_timesheetid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_timesheets',
        recordId: item.pm_timesheetid,
        recordName: item.pm_timesheetname || '',
        newValue: `Timesheet created: ${item.pm_timesheetname || ''}`
      })
    }
    return item ? mapTimesheet(item) : null
  } catch (err) {
    console.error('[TimesheetService] createTimesheet exception:', err)
    throw err
  }
}

export async function updateTimesheetStatus(
  timesheetId: string,
  status: number,
  extra?: { pm_rejectionreason?: string },
  currentUserName?: string
): Promise<void> {
  try {
    const userName = currentUserName || 'System'
    const changes: Record<string, unknown> = { pm_timesheetstatus: status }
    if (status === 1) {
      changes.pm_submissiondate = new Date().toISOString()
      changes.pm_submittedby = userName
    }
    if (status === 0) {
      changes.pm_approvaldate = new Date().toISOString()
      changes.pm_approvedby = userName
    }
    if (status === 2 && extra?.pm_rejectionreason) {
      changes.pm_rejectionreason = extra.pm_rejectionreason
    }

    let recordName = timesheetId
    let oldStatusStr = ''
    try {
      const details = await fetchTimesheetDetails(timesheetId)
      if (details) {
        if (details.pm_timesheetname) recordName = details.pm_timesheetname
        oldStatusStr = String(details.pm_timesheetstatus ?? '')
      }
    } catch (e) {
      console.error('[TimesheetService] updateTimesheetStatus details fetch failed:', e)
    }

    const result = await Pm_timesheetsService.update(timesheetId, changes as unknown as Pm_timesheets)
    if (!result.success) {
      console.error('[TimesheetService] updateTimesheetStatus failed:', result.error)
      throw new Error(`Failed to update timesheet status: ${result.error?.message || 'Unknown error'}`)
    }

    if (status === 0) {
      try {
        const entries = await fetchTimesheetEntries(timesheetId)
        const projectIds = new Set<string>()
        for (const entry of entries) {
          if (entry.pm_timesheetentryid) {
            const entryRes = await Pm_timesheetentriesService.update(entry.pm_timesheetentryid, {
              pm_isapproved: true,
            } as unknown as Pm_timesheetentries)
            if (!entryRes.success) {
              console.error(`[TimesheetService] updateTimesheetStatus entry approval failed for ${entry.pm_timesheetentryid}:`, entryRes.error)
            }
          }
          const projId = normalizeLookupId(entry._pm_project_value)
          if (projId) {
            projectIds.add(projId)
          }
        }
        if (projectIds.size > 0) {
          for (const projId of projectIds) {
            await recalculateRealFinancialsForProject(projId)
          }
        }
      } catch (err) {
        console.error('[updateTimesheetStatus] Failed to approve entries and recalculate financials:', err)
      }
    }

    writeAuditLog({
      actionType: 'StatusChange',
      entityName: 'pm_timesheets',
      recordId: timesheetId,
      recordName: recordName,
      fieldName: 'pm_timesheetstatus',
      oldValue: oldStatusStr,
      newValue: String(status)
    })
  } catch (err) {
    console.error('[TimesheetService] updateTimesheetStatus exception:', err)
    throw err
  }
}

export async function recalculateTimesheetHours(timesheetId: string): Promise<{
  pm_totalhours: number
  pm_totalchargeablehours: number
  pm_totalnonchargeablehours: number
} | null> {
  try {
    const entries = await fetchTimesheetEntries(timesheetId)
    const pm_totalhours = entries.reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
    const pm_totalchargeablehours = entries.filter((e) => e.pm_ischargeable).reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
    const pm_totalnonchargeablehours = entries.filter((e) => !e.pm_ischargeable).reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
    const result = await Pm_timesheetsService.update(timesheetId, {
      pm_totalhours,
      pm_totalchargeablehours,
      pm_totalnonchargeablehours,
    } as unknown as Pm_timesheets)
    if (!result.success) {
      console.error('[TimesheetService] recalculateTimesheetHours update failed:', result.error)
      return null
    }
    return { pm_totalhours, pm_totalchargeablehours, pm_totalnonchargeablehours }
  } catch (err) {
    console.error('[TimesheetService] recalculateTimesheetHours failed:', err)
    return null
  }
}

export async function fetchTimesheetEntries(timesheetId: string): Promise<TimesheetEntryModel[]> {
  try {
    const selectFields = [
      'pm_timesheetentryid', 'pm_timesheetid', 'pm_hoursworked', 'pm_workdate',
      'pm_worknotes', 'pm_ischargeable', 'pm_isapproved', 'pm_isovertime',
      'pm_nonchargeablereason',
      '_pm_project_value', '_pm_projecttask_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['pm_workdate asc'],
      top: 200,
    }
    const result = await Pm_timesheetentriesService.getAll({ ...options, filter: `_pm_timesheet_value eq '${timesheetId}' and statecode eq 0` })
    if (!result.success) {
      console.error('[TimesheetService] fetchTimesheetEntries failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_timesheetentries>(result).map(mapTimesheetEntry)
    if (list.length === 0) {
      const fallbackResult = await Pm_timesheetentriesService.getAll({ ...options, filter: `_pm_timesheet_value eq '${timesheetId}'` })
      if (fallbackResult.success) {
        list = unwrapList<Pm_timesheetentries>(fallbackResult).map(mapTimesheetEntry)
      }
    }

    try {
      const projectIds = Array.from(new Set(list.map((e) => normalizeLookupId(e._pm_project_value)).filter(Boolean))) as string[]
      if (projectIds.length > 0) {
        const projectsResult = await Pm_projectsService.getAll({
          filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '),
          select: ['pm_projectid', 'pm_projectname'],
          top: 500,
        })
        if (projectsResult.success) {
          const projects = unwrapList<Pm_projects>(projectsResult)
          const projectNameById = new Map<string, string>()
          for (const p of projects) {
            const normalizedId = normalizeLookupId(p.pm_projectid)
            if (normalizedId && p.pm_projectname) {
              projectNameById.set(normalizedId, p.pm_projectname)
            }
          }
          for (const entry of list) {
            const normalizedValue = normalizeLookupId(entry._pm_project_value)
            if (normalizedValue && projectNameById.has(normalizedValue)) {
              entry.pm_projectname = projectNameById.get(normalizedValue)
            }
          }
        }
      }
    } catch (err) {
      console.error('[TimesheetService] fetchTimesheetEntries projects resolution failed:', err)
    }

    return list
  } catch (err) {
    console.error('[TimesheetService] fetchTimesheetEntries exception:', err)
    return []
  }
}

export async function createTimesheetEntry(payload: Partial<TimesheetEntryModel> & { pm_timesheetid: string }): Promise<TimesheetEntryModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_projecttask_value') {
        cleanPayload[key] = value
      }
    }
    const defaults: Record<string, unknown> = {
      statecode: 0,
      statuscode: 1,
    }
    const timesheetId = normalizeLookupId(payload.pm_timesheetid)
    if (timesheetId) {
      cleanPayload['pm_timesheet@odata.bind'] = `/pm_timesheets(${timesheetId})`
    }
    if (payload._pm_project_value) {
      const projectId = normalizeLookupId(payload._pm_project_value)
      if (projectId) {
        cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
      }
    }
    if (payload._pm_projecttask_value) {
      const taskId = normalizeLookupId(payload._pm_projecttask_value)
      if (taskId) {
        cleanPayload['pm_projecttask@odata.bind'] = `/pm_projecttasks(${taskId})`
      }
    }
    const result = await Pm_timesheetentriesService.create({ ...defaults, ...cleanPayload } as unknown as Pm_timesheetentries)
    if (!result.success) {
      console.error('[TimesheetService] createTimesheetEntry failed:', result.error)
      throw new Error(`Failed to create timesheet entry: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_timesheetentries>(result)
    return item ? mapTimesheetEntry(item) : null
  } catch (err) {
    console.error('[TimesheetService] createTimesheetEntry exception:', err)
    throw err
  }
}

export async function fetchResourceTimesheets(resourceId: string): Promise<TimesheetModel[]> {
  return fetchTimesheets(resourceId)
}

export async function updateTimesheetEntry(entryId: string, payload: Partial<TimesheetEntryModel>): Promise<TimesheetEntryModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_projecttask_value') {
        cleanPayload[key] = value
      }
    }
    if (payload._pm_project_value) {
      const projectId = normalizeLookupId(payload._pm_project_value)
      if (projectId) {
        cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
      }
    }
    if (payload._pm_projecttask_value) {
      const taskId = normalizeLookupId(payload._pm_projecttask_value)
      if (taskId) {
        cleanPayload['pm_projecttask@odata.bind'] = `/pm_projecttasks(${taskId})`
      }
    }
    const result = await Pm_timesheetentriesService.update(entryId, cleanPayload as unknown as Pm_timesheetentries)
    if (!result.success) {
      console.error('[TimesheetService] updateTimesheetEntry failed:', result.error)
      throw new Error(`Failed to update timesheet entry: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_timesheetentries>(result)
    return item ? mapTimesheetEntry(item) : null
  } catch (err) {
    console.error('[TimesheetService] updateTimesheetEntry exception:', err)
    throw err
  }
}

export async function checkTimesheetOverlap(
  resourceId: string,
  startDate: string,
  endDate: string,
  excludeTimesheetId?: string
): Promise<{ overlaps: boolean; timesheetName?: string; pm_periodstartdate?: string; pm_periodenddate?: string }> {
  try {
    const id = normalizeLookupId(resourceId)
    if (!id) return { overlaps: false }
    let filter = `_pm_resource_value eq '${id}' and statecode eq 0 and pm_periodstartdate le '${endDate}' and pm_periodenddate ge '${startDate}'`
    if (excludeTimesheetId) {
      filter += ` and pm_timesheetid ne '${excludeTimesheetId}'`
    }
    const result = await Pm_timesheetsService.getAll({
      filter,
      select: ['pm_timesheetid', 'pm_timesheetname', 'pm_periodstartdate', 'pm_periodenddate'],
      top: 1,
    })
    if (!result.success) {
      console.error('[TimesheetService] checkTimesheetOverlap failed:', result.error)
      return { overlaps: false }
    }
    const list = unwrapList<Pm_timesheets>(result)
    if (list.length === 0) return { overlaps: false }
    const ts = list[0]
    return {
      overlaps: true,
      timesheetName: ts.pm_timesheetname,
      pm_periodstartdate: ts.pm_periodstartdate,
      pm_periodenddate: ts.pm_periodenddate,
    }
  } catch (err) {
    console.error('[TimesheetService] checkTimesheetOverlap exception:', err)
    return { overlaps: false }
  }
}

export async function deleteTimesheet(timesheetId: string): Promise<void> {
  try {
    let recordName = timesheetId
    try {
      const details = await fetchTimesheetDetails(timesheetId)
      if (details?.pm_timesheetname) recordName = details.pm_timesheetname
    } catch (e) {
      console.error('[TimesheetService] deleteTimesheet details fetch failed:', e)
    }

    await Pm_timesheetsService.delete(timesheetId)

    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_timesheets',
      recordId: timesheetId,
      recordName: recordName,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted'
    })
  } catch (err) {
    console.error('[TimesheetService] deleteTimesheet exception:', err)
    throw err
  }
}

export async function deleteTimesheetEntry(entryId: string): Promise<void> {
  try {
    await Pm_timesheetentriesService.delete(entryId)
  } catch (err) {
    console.error('[TimesheetService] deleteTimesheetEntry exception:', err)
    throw err
  }
}
