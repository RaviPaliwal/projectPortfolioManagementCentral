import {
  Pm_resourcesService,
  Pm_resourceallocationsService,
  Pm_projectsService,
} from '@/generated'
import type { Pm_resources } from '@/generated/models/Pm_resourcesModel'
import type { Pm_resourceallocations } from '@/generated/models/Pm_resourceallocationsModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
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
  _pm_systemuser_value: item._pm_systemuser_value,
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
    select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
    orderBy: ['pm_fullname asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchResources result:', result) } catch (e) {}
  return unwrapList<Pm_resources>(result).map(mapResource)
}

export async function fetchResourceById(resourceId: string): Promise<ResourceModel | null> {
  const result = await Pm_resourcesService.get(resourceId, {
    select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
  })
  const item = unwrapSingle<Pm_resources>(result)
  return item ? mapResource(item) : null
}

export async function createResource(payload: Partial<ResourceModel>): Promise<ResourceModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_systemuser_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_systemuser_value) {
    const systemUserId = normalizeLookupId(payload._pm_systemuser_value)
    if (systemUserId) {
      cleanPayload['pm_SystemUser@odata.bind'] = `/systemusers(${systemUserId})`
    }
  }
  const result = await Pm_resourcesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createResource payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_resources>(result)
  if (!item) {
    console.error('[dataverseService] createResource: unwrapSingle returned null, raw result:', JSON.stringify(result).slice(0, 1000))
  }
  return item ? mapResource(item) : null
}

export async function updateResource(id: string, changes: Partial<ResourceModel>): Promise<ResourceModel | null> {
  const cleanChanges: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== '_pm_systemuser_value') {
      cleanChanges[key] = value
    }
  }
  if (changes._pm_systemuser_value) {
    const systemUserId = normalizeLookupId(changes._pm_systemuser_value)
    if (systemUserId) {
      cleanChanges['pm_SystemUser@odata.bind'] = `/systemusers(${systemUserId})`
    }
  }
  const result = await Pm_resourcesService.update(id, cleanChanges as any)
  try { console.debug('[dataverseService] updateResource id/changes/result:', id, cleanChanges, result) } catch (e) {}
  const item = unwrapSingle<Pm_resources>(result)
  if (!item) {
    console.error('[dataverseService] updateResource: unwrapSingle returned null, raw result:', JSON.stringify(result).slice(0, 1000))
  }
  return item ? mapResource(item) : null
}

export async function deleteResource(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteResource id:', id) } catch (e) {}
  await Pm_resourcesService.delete(id)
}

export async function fetchResourceBySystemUserId(systemUserId: string): Promise<ResourceModel | null> {
  const normalizedId = normalizeLookupId(systemUserId)
  if (!normalizedId) return null
  const result = await Pm_resourcesService.getAll({
    filter: "_pm_systemuser_value eq '" + normalizedId + "' and statecode eq 0",
    select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
    top: 1,
  })
  const items = unwrapList<Pm_resources>(result)
  return items.length > 0 ? mapResource(items[0]) : null
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

export async function fetchResourceAllocationById(allocationId: string): Promise<ResourceAllocationModel | null> {
  const result = await Pm_resourceallocationsService.get(allocationId, {
    select: [
      'pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage',
      'pm_assignmentrole', 'pm_assignmentstatus', 'pm_startdate', 'pm_enddate',
      '_pm_resource_value', '_pm_project_value',
    ],
  })
  try { console.debug('[dataverseService] fetchResourceAllocationById result:', result) } catch (e) {}
  const item = unwrapSingle<Pm_resourceallocations>(result)
  return item ? mapResourceAllocation(item) : null
}

export async function fetchAllocatedProjectsForResource(resourceId: string): Promise<{ id: string; name: string }[]> {
  try {
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
      select: ['_pm_project_value', 'pm_resourceallocationid'],
      top: 200,
    })
    const allocations = unwrapList<Pm_resourceallocations>(allocResult)
    const projectIds = Array.from(new Set(
      allocations.map((a) => normalizeLookupId(a._pm_project_value)).filter(Boolean) as string[]
    ))
    if (projectIds.length === 0) return []
    const projectResult = await Pm_projectsService.getAll({
      filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '),
      select: ['pm_projectid', 'pm_projectname', 'pm_projectcode'],
      top: 200,
    })
    const projects = unwrapList<Pm_projects>(projectResult)
    return projects.map((p) => ({
      id: p.pm_projectid,
      name: p.pm_projectcode
        ? `${p.pm_projectname || 'Unknown'} (${p.pm_projectcode})`
        : (p.pm_projectname || 'Unknown Project'),
    }))
  } catch (err) {
    console.error('[resourceService] fetchAllocatedProjectsForResource failed:', err)
    return []
  }
}

/**
 * Fetch all active projects that a system user is allocated to.
 * 1. Finds the resource record linked to the system user
 * 2. Gets all allocations for that resource
 * 3. Returns the full project records (including programme FK for auto-population)
 */
export async function fetchProjectsForSystemUser(systemUserId: string): Promise<Pm_projects[]> {
  try {
    // Step 1: Find the resource linked to this system user
    const resourcesResult = await Pm_resourcesService.getAll({
      filter: `_pm_systemuser_value eq '${systemUserId}' and statecode eq 0`,
      select: ['pm_resourceid', 'pm_fullname'],
      top: 1,
    })
    const resources = unwrapList<Pm_resources>(resourcesResult)
    if (resources.length === 0) return []
    const resourceId = resources[0].pm_resourceid

    // Step 2: Get allocations for this resource
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
      select: ['_pm_project_value', 'pm_resourceallocationid'],
      top: 200,
    })
    const allocations = unwrapList<Pm_resourceallocations>(allocResult)
    const projectIds = Array.from(new Set(
      allocations.map((a) => normalizeLookupId(a._pm_project_value)).filter(Boolean) as string[]
    ))
    if (projectIds.length === 0) return []

    // Step 3: Fetch the actual project records
    const projectResult = await Pm_projectsService.getAll({
      filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '),
      select: [
        'pm_projectid', 'pm_projectname', 'pm_projectcode',
        '_pm_programme_value', '_pm_portfolio_value',
        'pm_ragstatus', 'pm_projectphase',
      ],
      top: 200,
    })
    return unwrapList<Pm_projects>(projectResult)
  } catch (err) {
    console.error('[resourceService] fetchProjectsForSystemUser failed:', err)
    return []
  }
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
  } as any)
  try { console.debug('[dataverseService] assignResource payload/result:', payload, result) } catch (e) {}
  return unwrapSingle<any>(result)
}

export async function fetchAllocatedResourcesByProject(projectId: string): Promise<ResourceModel[]> {
  try {
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      select: ['_pm_resource_value', 'pm_resourceallocationid'],
      top: 500,
    })
    const allocations = unwrapList<Pm_resourceallocations>(allocResult)
    const resourceIds = Array.from(new Set(
      allocations.map((a) => normalizeLookupId(a._pm_resource_value)).filter(Boolean) as string[]
    ))
    if (resourceIds.length === 0) return []
    const resourceResult = await Pm_resourcesService.getAll({
      filter: resourceIds.map((id) => `pm_resourceid eq '${id}'`).join(' or '),
      select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
      orderBy: ['pm_fullname asc'],
      top: 500,
    })
    return unwrapList<Pm_resources>(resourceResult).map(mapResource)
  } catch (err) {
    console.error('[resourceService] fetchAllocatedResourcesByProject failed:', err)
    return []
  }
}

export async function updateResourceAllocation(id: string, changes: Partial<ResourceAllocationModel>): Promise<ResourceAllocationModel | null> {
  const result = await Pm_resourceallocationsService.update(id, changes as any)
  const item = unwrapSingle<Pm_resourceallocations>(result)
  return item ? mapResourceAllocation(item) : null
}

