import {
  Pm_resourcesService,
  Pm_resourceallocationsService,
  Pm_projectsService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
import type { Pm_resources } from '@/generated/models/Pm_resourcesModel'
import type { Pm_resourceallocations } from '@/generated/models/Pm_resourceallocationsModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type {
  ResourceModel,
  ResourceAllocationModel,
  ProjectModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { mapProject } from './project.service'


import { applySecurityMasking } from './security'

export const mapResource = (item: Pm_resources): ResourceModel => {
  const mapped: ResourceModel = {
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
  }
  return applySecurityMasking(mapped, 'resource')
}

export const mapResourceAllocation = (item: Pm_resourceallocations): ResourceAllocationModel => {
  const rawItem = item as unknown as Record<string, unknown>
  return {
    pm_resourceallocationid: item.pm_resourceallocationid,
    pm_allocatedhours: item.pm_allocatedhours,
    pm_allocationpercentage: item.pm_allocationpercentage,
    pm_assignmentrole: item.pm_assignmentrole,
    pm_assignmentstatus: item.pm_assignmentstatus,
    pm_startdate: item.pm_startdate,
    pm_enddate: item.pm_enddate,
    _pm_resource_value: item._pm_resource_value,
    _pm_project_value: rawItem._pm_project_value as string | undefined,
  }
}

export async function fetchResources(): Promise<ResourceModel[]> {
  try {
    const result = await Pm_resourcesService.getAll({
      filter: "statecode eq 0",
      select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
      orderBy: ['pm_fullname asc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[ResourceService] fetchResources failed:', result.error)
      return []
    }
    return unwrapList<Pm_resources>(result).map(mapResource)
  } catch (err) {
    console.error('[ResourceService] fetchResources exception:', err)
    return []
  }
}

export async function fetchResourceById(resourceId: string): Promise<ResourceModel | null> {
  try {
    const result = await Pm_resourcesService.get(resourceId, {
      select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
    })
    if (!result.success) {
      console.error('[ResourceService] fetchResourceById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_resources>(result)
    return item ? mapResource(item) : null
  } catch (err) {
    console.error('[ResourceService] fetchResourceById exception:', err)
    return null
  }
}

export async function createResource(payload: Partial<ResourceModel>): Promise<ResourceModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null &&
          key !== '_pm_systemuser_value') {
        cleanPayload[key] = value === '' ? null : value
      }
    }
    const defaults: Record<string, unknown> = {
      statecode: 0,
      statuscode: 1,
    }
    if (payload._pm_systemuser_value) {
      const systemUserId = normalizeLookupId(payload._pm_systemuser_value)
      if (systemUserId) {
        cleanPayload['pm_SystemUser@odata.bind'] = `/systemusers(${systemUserId})`
      }
    }
    const result = await Pm_resourcesService.create({ ...defaults, ...cleanPayload } as unknown as Pm_resources)
    if (!result.success) {
      console.error('[ResourceService] createResource failed:', result.error)
      throw new Error(`Failed to create resource: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_resources>(result)
    if (item && item.pm_resourceid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_resources',
        recordId: item.pm_resourceid,
        recordName: item.pm_fullname || '',
        newValue: `Resource created: ${item.pm_fullname || ''}`
      })
    }
    return item ? mapResource(item) : null
  } catch (err) {
    console.error('[ResourceService] createResource exception:', err)
    throw err
  }
}

export async function updateResource(id: string, changes: Partial<ResourceModel>): Promise<ResourceModel | null> {
  try {
    let original: ResourceModel | null = null
    try {
      original = await fetchResourceById(id)
    } catch (e) {
      console.error('[ResourceService] updateResource failed to fetch original:', e)
    }

    const cleanChanges: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null &&
          key !== '_pm_systemuser_value') {
        cleanChanges[key] = value === '' ? null : value
      }
    }
    if (changes._pm_systemuser_value) {
      const systemUserId = normalizeLookupId(changes._pm_systemuser_value)
      if (systemUserId) {
        cleanChanges['pm_SystemUser@odata.bind'] = `/systemusers(${systemUserId})`
      }
    }
    const result = await Pm_resourcesService.update(id, cleanChanges as unknown as Pm_resources)
    if (!result.success) {
      console.error('[ResourceService] updateResource failed:', result.error)
      throw new Error(`Failed to update resource: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_resources>(result)
    
    if (item && original) {
      const formatVal = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }

      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_resourceid') continue
        const oldVal = (original as Record<string, unknown>)[key]
        if (formatVal(oldVal) !== formatVal(value)) {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_resources',
            recordId: id,
            recordName: original.pm_fullname || '',
            fieldName: key,
            oldValue: formatVal(oldVal),
            newValue: formatVal(value)
          })
        }
      }
    }
    return item ? mapResource(item) : null
  } catch (err) {
    console.error('[ResourceService] updateResource exception:', err)
    throw err
  }
}

export async function deleteResource(id: string): Promise<void> {
  try {
    let recordName = id
    try {
      const original = await fetchResourceById(id)
      if (original?.pm_fullname) {
        recordName = original.pm_fullname
      }
    } catch (e) {
      console.error('[ResourceService] deleteResource details fetch failed:', e)
    }

    await Pm_resourcesService.delete(id)

    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_resources',
      recordId: id,
      recordName: recordName,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted'
    })
  } catch (err) {
    console.error('[ResourceService] deleteResource exception:', err)
    throw err
  }
}

export async function fetchResourceBySystemUserId(systemUserId: string): Promise<ResourceModel | null> {
  const normalizedId = normalizeLookupId(systemUserId)
  if (!normalizedId) return null
  try {
    const result = await Pm_resourcesService.getAll({
      filter: "_pm_systemuser_value eq '" + normalizedId + "' and statecode eq 0",
      select: ['pm_resourceid', 'pm_fullname', 'pm_departmentname', 'pm_primaryrole', 'pm_resourcecategory', 'pm_employmentstatus', 'pm_dailyworkcapacity', 'pm_dailycostrate', 'pm_positiontitle', '_pm_systemuser_value', 'pm_suppliercompany', 'pm_contractstartdate', 'pm_contractenddate'],
      top: 1,
    })
    if (!result.success) {
      console.error('[ResourceService] fetchResourceBySystemUserId failed:', result.error)
      return null
    }
    const items = unwrapList<Pm_resources>(result)
    return items.length > 0 ? mapResource(items[0]) : null
  } catch (err) {
    console.error('[ResourceService] fetchResourceBySystemUserId exception:', err)
    return null
  }
}

export async function fetchResourceAllocations(resourceId: string): Promise<ResourceAllocationModel[]> {
  try {
    const result = await Pm_resourceallocationsService.getAll({
      filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
      select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_assignmentrole', 'pm_assignmentstatus', 'pm_startdate', 'pm_enddate', '_pm_project_value'],
      orderBy: ['pm_startdate desc'],
      top: 200,
    })
    if (!result.success) {
      console.error('[ResourceService] fetchResourceAllocations failed:', result.error)
      return []
    }
    return unwrapList<Pm_resourceallocations>(result).map(mapResourceAllocation)
  } catch (err) {
    console.error('[ResourceService] fetchResourceAllocations exception:', err)
    return []
  }
}

export async function fetchResourceAllocationById(allocationId: string): Promise<ResourceAllocationModel | null> {
  try {
    const result = await Pm_resourceallocationsService.get(allocationId, {
      select: [
        'pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage',
        'pm_assignmentrole', 'pm_assignmentstatus', 'pm_startdate', 'pm_enddate',
        '_pm_resource_value', '_pm_project_value',
      ],
    })
    if (!result.success) {
      console.error('[ResourceService] fetchResourceAllocationById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_resourceallocations>(result)
    return item ? mapResourceAllocation(item) : null
  } catch (err) {
    console.error('[ResourceService] fetchResourceAllocationById exception:', err)
    return null
  }
}

export async function fetchAllocatedProjectsForResource(resourceId: string): Promise<{ id: string; name: string }[]> {
  try {
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
      select: ['_pm_project_value', 'pm_resourceallocationid'],
      top: 200,
    })
    if (!allocResult.success) {
      console.error('[ResourceService] fetchAllocatedProjectsForResource allocations failed:', allocResult.error)
      return []
    }
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
    if (!projectResult.success) {
      console.error('[ResourceService] fetchAllocatedProjectsForResource projects failed:', projectResult.error)
      return []
    }
    const projects = unwrapList<Pm_projects>(projectResult)
    return projects.map((p) => ({
      id: p.pm_projectid!,
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
export async function fetchProjectsForSystemUser(systemUserId: string): Promise<ProjectModel[]> {
  try {
    // Step 1: Find the resource linked to this system user
    const resourcesResult = await Pm_resourcesService.getAll({
      filter: `_pm_systemuser_value eq '${systemUserId}' and statecode eq 0`,
      select: ['pm_resourceid', 'pm_fullname'],
      top: 1,
    })
    if (!resourcesResult.success) {
      console.error('[ResourceService] fetchProjectsForSystemUser resources failed:', resourcesResult.error)
      return []
    }
    const resources = unwrapList<Pm_resources>(resourcesResult)
    if (resources.length === 0) return []
    const resourceId = resources[0].pm_resourceid

    // Step 2: Get allocations for this resource
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
      select: ['_pm_project_value', 'pm_resourceallocationid'],
      top: 200,
    })
    if (!allocResult.success) {
      console.error('[ResourceService] fetchProjectsForSystemUser allocations failed:', allocResult.error)
      return []
    }
    const allocations = unwrapList<Pm_resourceallocations>(allocResult)
    const projectIds = Array.from(new Set(
      allocations.map((a) => normalizeLookupId(a._pm_project_value)).filter(Boolean) as string[]
    ))
    if (projectIds.length === 0) return []

    // Step 3: Fetch the actual project records
    const projectResult = await Pm_projectsService.getAll({
      filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '),
      select: [
        'pm_projectid', 'pm_projectname',
        '_pm_programme_value', '_pm_portfolio_value',
        'pm_ragstatus', 'pm_projectphase',
        'pm_costragstatus', 'pm_scheduleragstatus', 'pm_benefitsragstatus',
      ],
      top: 200,
    })
    if (!projectResult.success) {
      console.error('[ResourceService] fetchProjectsForSystemUser projects failed:', projectResult.error)
      return []
    }
    return unwrapList<Pm_projects>(projectResult).map(mapProject)
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
  pm_allocationpercentage?: number
}): Promise<ResourceAllocationModel | null> {
  try {
    const cleanPayload = {
      pm_allocatedhours: payload.pm_allocatedhours,
      pm_allocationpercentage: payload.pm_allocationpercentage ?? Math.min(100, Math.round((payload.pm_allocatedhours / 160) * 100)),
      pm_assignmentrole: payload.pm_assignmentrole,
      pm_assignmentstatus: 0,
      pm_startdate: payload.pm_startdate,
      pm_enddate: payload.pm_enddate,
      "pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
      "pm_resource@odata.bind": `/pm_resources(${payload.pm_resourceid})`,
      statecode: 0,
      statuscode: 1,
    }
    const result = await Pm_resourceallocationsService.create(cleanPayload as unknown as Pm_resourceallocations)
    if (!result.success) {
      console.error('[ResourceService] assignResource failed:', result.error)
      throw new Error(`Failed to assign resource: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_resourceallocations>(result)
    if (item && item.pm_resourceallocationid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_resourceallocations',
        recordId: item.pm_resourceallocationid,
        recordName: `Resource Allocation for Project ${payload.pm_projectid}`,
        newValue: `Allocated ${payload.pm_allocatedhours} hours as ${payload.pm_assignmentrole}`
      })
    }
    return item ? mapResourceAllocation(item) : null
  } catch (err) {
    console.error('[ResourceService] assignResource exception:', err)
    throw err
  }
}

export async function fetchAllocatedResourcesByProject(projectId: string): Promise<ResourceModel[]> {
  try {
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      select: ['_pm_resource_value', 'pm_resourceallocationid'],
      top: 500,
    })
    if (!allocResult.success) {
      console.error('[ResourceService] fetchAllocatedResourcesByProject allocations failed:', allocResult.error)
      return []
    }
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
    if (!resourceResult.success) {
      console.error('[ResourceService] fetchAllocatedResourcesByProject resources failed:', resourceResult.error)
      return []
    }
    return unwrapList<Pm_resources>(resourceResult).map(mapResource)
  } catch (err) {
    console.error('[resourceService] fetchAllocatedResourcesByProject failed:', err)
    return []
  }
}

export async function updateResourceAllocation(id: string, changes: Partial<ResourceAllocationModel>): Promise<ResourceAllocationModel | null> {
  try {
    let original: ResourceAllocationModel | null = null
    try {
      const details = await fetchResourceAllocationById(id)
      if (details) original = details
    } catch (e) {
      console.error('[ResourceService] updateResourceAllocation oldRecord fetch failed:', e)
    }

    const result = await Pm_resourceallocationsService.update(id, changes as unknown as Pm_resourceallocations)
    if (!result.success) {
      console.error('[ResourceService] updateResourceAllocation failed:', result.error)
      throw new Error(`Failed to update resource allocation: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_resourceallocations>(result)

    // Log audit entries for changed fields
    if (original) {
      const formatVal = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }


      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_resourceallocationid') continue
        const oldVal = (original as Record<string, unknown>)[key]
        if (formatVal(oldVal) !== formatVal(value)) {
          const isStatus = key === 'pm_assignmentstatus' || key === 'statecode'
          writeAuditLog({
            actionType: isStatus ? 'StatusChange' : 'Update',
            entityName: 'pm_resourceallocations',
            recordId: id,
            recordName: `Resource Allocation ${id}`,
            fieldName: key,
            oldValue: formatVal(oldVal),
            newValue: formatVal(value)
          })
        }
      }
    }

    return item ? mapResourceAllocation(item) : null
  } catch (err) {
    console.error('[ResourceService] updateResourceAllocation exception:', err)
    throw err
  }
}
