import {
  Pm_resourcesService,
  Pm_resourceallocationsService,
} from '@/generated'
import type { Pm_resources } from '@/generated/models/Pm_resourcesModel'
import type { Pm_resourceallocations } from '@/generated/models/Pm_resourceallocationsModel'
import type {
  ResourceModel,
  ResourceAllocationModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export const mapResource = (item: Pm_resources): ResourceModel => ({
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

export const mapResourceAllocation = (item: Pm_resourceallocations): ResourceAllocationModel => ({
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
    pm_assignmentstatus: 0,
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
