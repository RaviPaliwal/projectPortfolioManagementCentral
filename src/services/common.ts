import type { PortfolioModel, ProjectModel, ProgrammeModel } from '@/types/dataverse'
import type { IOperationResult } from '@microsoft/power-apps/data'

/**
 * Standardized unwrapper for Dataverse SDK and OData results.
 * Reduces the need for 'any' in feature components.
 */
export const unwrapList = <T>(result: IOperationResult<T[]> | any): T[] => {
  if (!result) return []
  
  // 1. Handle SDK wrapper
  if (typeof result === 'object' && 'success' in result) {
    if (Array.isArray(result.data)) return result.data as T[]
    if (Array.isArray(result.value)) return result.value as T[]
    return []
  }

  // 2. Handle OData/Standard wrapper
  if ('value' in result && Array.isArray(result.value)) return result.value as T[]
  if ('data' in result && Array.isArray(result.data)) return result.data as T[]
  
  // 3. Fallback for raw arrays
  if (Array.isArray(result)) return result
  return []
}

/**
 * Standardized unwrapper for single Dataverse SDK or OData items.
 */
export const unwrapSingle = <T>(result: IOperationResult<T> | any): T | null => {
  if (!result) return null
  
  // 1. Handle SDK wrapper
  if (typeof result === 'object' && 'success' in result) {
    if (result.success) {
      if (result.data) return unwrapSingle<T>(result.data)
      if (result.value) return unwrapSingle<T>(result.value)
      return null
    }
    return null
  }

  // 2. Handle OData/Internal wrappers
  if (result.value && typeof result.value === 'object' && !Array.isArray(result.value)) return result.value as T
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) return result.data as T
  
  // 3. If it's an array, return first item
  if (Array.isArray(result)) return result.length > 0 ? result[0] as T : null

  // 4. Check for empty object
  if (typeof result === 'object' && Object.keys(result).length === 0) return null

  // 5. Return directly if it's the object itself
  return result as T
}

/**
 * Extracts a user-friendly error message from a Dataverse IOperationResult.
 */
export const parseDataverseError = (result: IOperationResult<any>): string => {
  if (result.success) return ''
  
  const error = result.error
  if (!error) return 'An unknown error occurred.'

  // Handle common Dataverse error patterns
  if (error.message) return error.message
  if ((error as any).code === '0x80040265') return 'A validation error occurred in Dataverse.'
  
  return JSON.stringify(error)
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
    if (code === '3' || code === 3) return 'Initiation'
    if (code === '4' || code === 4) return 'Rejected'
    if (code === '5' || code === 5) return 'Completed'
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
