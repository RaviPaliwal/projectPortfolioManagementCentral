import {
  Pm_timesheetsService,
  Pm_timesheetentriesService,
  Pm_resourcesService,
} from '@/generated'
import type { Pm_timesheets } from '@/generated/models/Pm_timesheetsModel'
import type { Pm_timesheetentries } from '@/generated/models/Pm_timesheetentriesModel'
import type {
  TimesheetModel,
  TimesheetEntryModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export const mapTimesheet = (item: Pm_timesheets): TimesheetModel => ({
  pm_timesheetid: item.pm_timesheetid,
  pm_timesheetname: item.pm_timesheetname,
  pm_ownername: item.owneridname,
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
    top: 500      
  }
  const result = await Pm_timesheetsService.getAll({ ...options, filter: "statecode eq 0" })
  try { console.debug('[dataverseService] fetchTimesheets result:', result) } catch (e) {}
  let list = unwrapList<Pm_timesheets>(result).map(mapTimesheet)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchTimesheets: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_timesheetsService.getAll(options)
    list = unwrapList<Pm_timesheets>(fallbackResult).map(mapTimesheet)
  }
 
  try {
    const resourceIds = Array.from(new Set(list.map((ts) => normalizeLookupId(ts._pm_resource_value)).filter(Boolean))) as string[]
    if (resourceIds.length > 0) {
      const resourcesResult = await Pm_resourcesService.getAll({
        filter: resourceIds.map((id) => `pm_resourceid eq '${id}'`).join(' or '),
        select: ['pm_resourceid', 'pm_fullname'],
        top: 500,
      })
      const resources = unwrapList<any>(resourcesResult)
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
          (ts as any).pm_resourcename = resourceNameById.get(normalizedValue)
        }
      }
    }
  } catch (err) {
    try { console.warn('[dataverseService] fetchTimesheets: failed to resolve resource names', err) } catch (e) {}
  }
 
  return list
}

/**
 * Fetch a single timesheet by ID with full details.
 */
export async function fetchTimesheetDetails(timesheetId: string): Promise<TimesheetModel | null> {
  try {
    const selectFields = [
      'pm_timesheetid', 'pm_timesheetname',
      'pm_ownername', 'pm_resourcename',
      'pm_periodstartdate', 'pm_periodenddate', 'pm_timesheetstatus',
      'pm_totalhours', 'pm_totalchargeablehours', 'pm_totalnonchargeablehours',
      'pm_submissiondate', 'pm_submittedby',
      'pm_approvaldate', 'pm_approvedby',
      'pm_rejectionreason', 'pm_reportingperiod', '_pm_resource_value',
    ]
    const result = await Pm_timesheetsService.get(timesheetId, { select: selectFields })
    const item = unwrapSingle<Pm_timesheets>(result)
    return item ? mapTimesheet(item) : null
  } catch (err) {
    console.error('[dataverseService] fetchTimesheetDetails failed:', err)
    return null
  }
}

export async function createTimesheet(payload: Partial<TimesheetModel>): Promise<TimesheetModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_resource_value' && key !== 'pm_timesheetid') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    pm_timesheetstatus: 3,
    pm_totalhours: 0,
    pm_totalchargeablehours: 0,
    pm_totalnonchargeablehours: 0,
    statecode: 0,
    statuscode: 1,
  }
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
  const result = await Pm_timesheetentriesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createTimesheetEntry payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_timesheetentries>(result)
  return item ? mapTimesheetEntry(item) : null
}

export async function deleteTimesheetEntry(entryId: string): Promise<void> {
  try { console.debug('[dataverseService] deleteTimesheetEntry id:', entryId) } catch (e) {}
  await Pm_timesheetentriesService.delete(entryId)
}
