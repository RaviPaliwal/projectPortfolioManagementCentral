import type { PortfolioModel, ProjectModel, ProgrammeModel } from '@/types/dataverse'

export const unwrapList = <T>(result: any): T[] => {
  if (!result) return []
  if ('value' in result) return result.value as T[]
  if ('data' in result) return result.data as T[]
  if (Array.isArray(result)) return result
  return []
}

export const unwrapSingle = <T>(result: any): T | null => {
  if (!result) return null
  if ('value' in result) return result.value as T
  if ('data' in result) return result.data as T
  return result as T
}

export const ragLabel = (code?: string | number): string => {
  if (code === '2' || code === 2) return 'Red'
  if (code === '1' || code === 1) return 'Green'
  if (code === '0' || code === 0) return 'Amber'
  return 'NotSet'
}

export const projectPhaseLabel = (code?: string | number): string => {
  if (code === '0' || code === 0) return 'Execution'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Closure'
  return 'Unknown'
}

export const programmePhaseLabel = (code?: string | number): string => {
  if (code === '0' || code === 0) return 'Delivery'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Initiation'
  return 'Unknown'
}

export const normalizeLookupId = (id?: string): string | undefined => {
  if (!id) return undefined
  return id.replace(/[{}]/g, '').trim().toLowerCase()
}

export const normalizeLookupName = (name?: string): string | undefined => {
  return name?.trim().toLowerCase()
}

/**
 * Aggregates budget data from a list of objects.
 * Useful for summing Project Budget Lines, or Project totals into Programmes.
 */
export const aggregateFinancials = <T extends Record<string, any>>(
  items: T[], 
  budgetKey: keyof T, 
  actualKey: keyof T
): { budget: number, actual: number, variance: number } => {
  const totals = items.reduce((acc, item) => {
    const b = Number(item[budgetKey] || 0)
    const a = Number(item[actualKey] || 0)
    return {
      budget: acc.budget + b,
      actual: acc.actual + a,
    }
  }, { budget: 0, actual: 0 })

  return {
    ...totals,
    variance: totals.budget - totals.actual,
  }
}

export interface DashboardMetrics {
  totalActiveProjects: number
  totalActivePortfolios: number
  totalApprovedBudget: number
  totalActualSpend: number
  projectsInRed: number
  projectsInAmber: number
  projectsInGreen: number
  pipelineValue: number
}

export interface ProjectHierarchy {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
}
