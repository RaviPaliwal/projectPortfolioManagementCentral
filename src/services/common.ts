import type { PortfolioModel, ProjectModel, ProgrammeModel } from '@/types/dataverse'
import type { IOperationResult } from '@microsoft/power-apps/data'

// ─── Type Guards ───────────────────────────────────────────────────────────

/** Check if a value is a non-null object */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** Check if a value is the Dataverse SDK IOperationResult wrapper (has success property) */
const isOperationResult = (v: unknown): v is IOperationResult<unknown> =>
  isObject(v) && 'success' in v

// ─── Unwrappers ────────────────────────────────────────────────────────────

/**
 * Standardized unwrapper for Dataverse SDK and OData list results.
 */
export const unwrapList = <T>(result: IOperationResult<T[]> | unknown): T[] => {
  if (!result) return []

  // Use unknown cast to access properties that may exist on different response shapes
  const obj = result as Record<string, unknown>

  // 1. Handle SDK wrapper (IOperationResult with .data array)
  if (obj.data && Array.isArray(obj.data)) return obj.data as T[]

  // 2. Handle OData wrapper: { value: [...] }
  if (obj.value && Array.isArray(obj.value)) return obj.value as T[]

  // 3. Fallback for raw arrays
  if (Array.isArray(result)) return result as T[]
  return []
}

/**
 * Standardized unwrapper for single Dataverse SDK or OData items.
 */
export const unwrapSingle = <T>(result: IOperationResult<T> | unknown): T | null => {
  if (!result) return null

  // Use unknown cast to access properties that may exist on different response shapes
  const obj = result as Record<string, unknown>

  // 1. Handle SDK wrapper — reject failed results early
  if (isOperationResult(result) && obj.success === false) return null

  // 2. Unwrap nested single items (IOperationResult.data or OData.value)
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return unwrapSingle<T>(obj.data)
  }
  if (obj.value && typeof obj.value === 'object' && !Array.isArray(obj.value)) {
    return unwrapSingle<T>(obj.value)
  }

  // 3. If it's an array, return first item
  if (Array.isArray(result)) return (result.length > 0 ? result[0] : null) as T | null

  // 4. Check for empty object
  if (typeof obj === 'object' && Object.keys(obj).length === 0) return null

  // 5. Return directly if it's a non-null object (likely the entity itself)
  if (isObject(result)) return result as T

  return null
}

/**
 * Extracts a user-friendly error message from a Dataverse IOperationResult.
 */
export const parseDataverseError = (result: IOperationResult<unknown>): string => {
  if (result.success) return ''

  const error = result.error
  if (!error) return 'An unknown error occurred.'

  // Handle common Dataverse error patterns
  if (typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string') {
    return (error as { message: string }).message
  }
  if (typeof error === 'object' && 'code' in error && (error as { code: string }).code === '0x80040265') {
    return 'A validation error occurred in Dataverse.'
  }

  return JSON.stringify(error)
}

export const ragLabel = (code?: string | number): string => {
  if (code === '2' || code === 2) return 'High'
  if (code === '1' || code === 1) return 'Low'
  if (code === '0' || code === 0) return 'Medium'
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
export const aggregateFinancials = <T,>(
  items: T[],
  budgetKey: keyof T,
  actualKey: keyof T
): { budget: number; actual: number; variance: number } => {
  const totals = items.reduce(
    (acc, item) => {
      const b = Number(item[budgetKey] ?? 0)
      const a = Number(item[actualKey] ?? 0)
      return {
        budget: acc.budget + b,
        actual: acc.actual + a,
      }
    },
    { budget: 0, actual: 0 },
  )

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
