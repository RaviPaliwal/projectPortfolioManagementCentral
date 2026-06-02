import { 
  Pm_portfoliosService, 
  Pm_programmesService, 
  Pm_projectsService, 
  Pm_initiativesService, 
  Pm_projecttasksService, 
  Pm_projectmilestonesService, 
  Pm_resourcesService, 
  Pm_resourceallocationsService, 
  Pm_timesheetsService, 
  Pm_timesheetentriesService, 
  Pm_risksService, 
  Pm_issuesService, 
  Pm_projectgatereviewsService, 
  Pm_benefitsService, 
  Pm_performancemeasuresService 
} from '@/generated'
import { unwrapList } from './common'

// Map of table name → service reference for debug queries
const tableServices: Record<string, { getAll: (options?: any) => Promise<any> }> = {
  pm_portfolios: Pm_portfoliosService,
  pm_programmes: Pm_programmesService,
  pm_projects: Pm_projectsService,
  pm_initiatives: Pm_initiativesService,
  pm_projecttasks: Pm_projecttasksService,
  pm_projectmilestones: Pm_projectmilestonesService,
  pm_resources: Pm_resourcesService,
  pm_resourceallocations: Pm_resourceallocationsService,
  pm_timesheets: Pm_timesheetsService,
  pm_timesheetentries: Pm_timesheetentriesService,
  pm_risks: Pm_risksService,
  pm_issues: Pm_issuesService,
  pm_projectgatereviews: Pm_projectgatereviewsService,
  pm_benefits: Pm_benefitsService,
  pm_performancemeasures: Pm_performancemeasuresService,
}

export interface DebugQueryOptions {
  table: string
  filter?: string
  top?: number
  select?: string[]
  orderBy?: string[]
}

export async function debugQueryTable(options: DebugQueryOptions): Promise<{
  columns: string[]
  rows: Record<string, any>[]
  rawResponse: any
  count: number
  error?: string
}> {
  const service = tableServices[options.table]
  if (!service) {
    return { columns: [], rows: [], rawResponse: null, count: 0, error: `Unknown table: ${options.table}` }
  }

  try {
    const result = await service.getAll({
      filter: options.filter || undefined,
      top: options.top || 100,
      select: options.select?.length ? options.select : undefined,
      orderBy: options.orderBy?.length ? options.orderBy : undefined,
    })

    const rows: Record<string, any>[] = unwrapList<any>(result)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    return { columns, rows, rawResponse: result, count: rows.length }
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      rawResponse: null,
      count: 0,
      error: err?.message || String(err),
    }
  }
}

// Return all available table names for debug page
export function getAvailableTables(): string[] {
  return Object.keys(tableServices)
}
