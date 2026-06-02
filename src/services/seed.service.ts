import { 
  Pm_resourcesService, 
  Pm_resourceallocationsService, 
  Pm_timesheetsService, 
  Pm_timesheetentriesService,
  Pm_projectsService
} from '@/generated'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import { unwrapList, unwrapSingle } from './common'

export interface SeedResult {
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
export async function truncateTable(
  tableName: string,
  service: { getAll: (options?: any) => Promise<any>; delete: (id: string) => Promise<void> },
  filter?: string
): Promise<{ deleted: number; failed: number; error?: string }> {
  const pkField = primaryKeyMap[tableName]
  if (!pkField) return { deleted: 0, failed: 0, error: `Unknown primary key for table: ${tableName}` }

  try {
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

  for (const res of resourceSeedData) {
    try {
      await Pm_resourcesService.create(res as any)
    } catch (err: any) {
      console.error('[seedAllResourceData] Create resource error:', err)
      results.push({ table: 'pm_resources', created: 0, error: err?.message || String(err) })
      return results
    }
  }

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

  const resourceNameToId = new Map<string, string>()
  for (const r of fetchedResources) {
    if (r.pm_fullname && r.pm_resourceid) resourceNameToId.set(r.pm_fullname.trim(), r.pm_resourceid)
  }

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
  for (const [mi, month] of months.entries()) {
    if (allocError) break 

    const startDate = month + '-01'
    const end = new Date(month + '-01')
    end.setMonth(end.getMonth() + 1)
    end.setDate(0)
    const endDate = end.toISOString().split('T')[0]

    const activeTemplates = allocationTemplates.filter((_, i) => (i + mi) % 3 !== 2)
    for (const tpl of activeTemplates) {
      const baseHours = 40 - mi * 4 + Math.floor(Math.random() * 15)
      const hours = Math.max(10, Math.min(80, baseHours))

      try {
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

  const allocResult = await Pm_resourceallocationsService.getAll({
    filter: "statecode eq 0 and pm_assignmentstatus eq 0",
    select: ['pm_resourceallocationid'],
    top: 5000,
  })
  const allocList = unwrapList<any>(allocResult)
  results.push({ table: 'pm_resourceallocations', created: allocList.length, error: allocError })
  if (allocError) return results

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

  const tsResult = await Pm_timesheetsService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_timesheetid', 'pm_ownername', 'pm_reportingperiod'],
    top: 500,
  })
  const tsList = unwrapList<any>(tsResult)
  const timesheetIds = tsList.map((t: any) => t.pm_timesheetid).filter(Boolean)
  results.push({ table: 'pm_timesheets', created: timesheetIds.length, error: tsError })
  if (tsError) return results

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
        const payload: any = {
          pm_hoursworked: hours,
          pm_workdate: workDate,
          pm_ischargeable: Math.random() > 0.2,
          pm_worknotes: `Work on ${projectName} - ${workDate}`,
          statecode: 0,
          statuscode: 1,
        }

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

  const entryResult = await Pm_timesheetentriesService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_timesheetentryid'],
    top: 5000,
  })
  const entryList = unwrapList<any>(entryResult)
  results.push({ table: 'pm_timesheetentries', created: entryList.length, error: entryError })

  return results
}
