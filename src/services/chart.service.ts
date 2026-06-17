import {
  Pm_resourcesService,
  Pm_resourceallocationsService,
  Pm_timesheetentriesService,
  Pm_projectsService,
} from '@/generated'
import type { Pm_resources } from '@/generated/models/Pm_resourcesModel'
import type { Pm_resourceallocations } from '@/generated/models/Pm_resourceallocationsModel'
import type { Pm_timesheetentries } from '@/generated/models/Pm_timesheetentriesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import {
  unwrapList,
  normalizeLookupId,
  normalizeLookupName,
} from './common'

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
  for (const a of allocations) {
    const name = resolveResourceName(a)
    if (!name) continue
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

  const plannedByMonth = new Map<string, number>()
  for (const a of allocations) {
    if (!a.pm_startdate) continue
    const monthKey = a.pm_startdate.substring(0, 7)
    plannedByMonth.set(monthKey, (plannedByMonth.get(monthKey) ?? 0) + (a.pm_allocatedhours ?? 0))
  }

  const actualByMonth = new Map<string, number>()
  for (const e of entries) {
    if (!e.pm_workdate) continue
    const monthKey = e.pm_workdate.substring(0, 7)
    actualByMonth.set(monthKey, (actualByMonth.get(monthKey) ?? 0) + (e.pm_hoursworked ?? 0))
  }

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

  const extractProjectFromNotes = (notes: string): string | undefined => {
    const normalized = notes?.trim()
    if (!normalized) return undefined
    const match = normalized.match(/^Work on (.+?) - \d{4}-\d{2}-\d{2}/)
    return match ? match[1].trim() : undefined
  }

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

  result.sort((a, b) => b.hours - a.hours)
  const topResults = result.length > 8 ? result.slice(0, 8) : result
  const other = result.length > 8 ? result.slice(8).reduce((sum, item) => sum + item.hours, 0) : 0
  const finalResult = result.length > 8 && other > 0 ? [...topResults, { name: 'Other', hours: other }] : topResults
  return finalResult
}

export async function fetchDepartmentDemandData(): Promise<
  { month: string; role: string; hours: number }[]
> {
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

export async function fetchPortfolioTrendData(): Promise<
  { month: string; active: number; completed: number; delayed: number }[]
> {
  const result = await Pm_projectsService.getAll({
    select: ['createdon', 'pm_actualenddate', 'pm_plannedenddate', 'pm_projectphase', 'pm_projectname'],
    top: 5000,
  })

  const projects = unwrapList<Pm_projects>(result)

  const months: { month: string; active: number; completed: number; delayed: number }[] = []
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short' })

    let active = 0
    let completed = 0
    let delayed = 0

    for (const p of projects) {
      if (p.pm_projectphase === 4) continue

      const createdOn = p.createdon ? new Date(p.createdon) : null
      if (!createdOn || createdOn > monthEnd) continue

      const actualEndDate = p.pm_actualenddate ? new Date(p.pm_actualenddate) : null
      const plannedEndDate = p.pm_plannedenddate ? new Date(p.pm_plannedenddate) : null

      if ((actualEndDate && actualEndDate <= monthEnd) || p.pm_projectphase === 5) {
        completed++
        continue
      }

      active++
      if (plannedEndDate && plannedEndDate <= monthEnd) {
        delayed++
      }
    }

    months.push({ month: monthLabel, active, completed, delayed })
  }

  return months
}
