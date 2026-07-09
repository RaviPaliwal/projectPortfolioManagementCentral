import type { Persona } from '@/constants/permissions'

/**
 * Gets the current user persona from session storage.
 * Synchronized automatically by UserContext.tsx.
 */
export function getCurrentPersona(): Persona {
  try {
    const persona = sessionStorage.getItem('ppm_current_user_persona')
    return (persona as Persona) || 'TeamMember'
  } catch {
    return 'TeamMember'
  }
}

/**
 * Applies column-level security masking rules on a single Dataverse record.
 * Sets restricted fields to 0 or null depending on the persona level.
 */
export function applySecurityMasking<T = any>(record: T, entityType: 'project' | 'resource' | 'risk' | 'initiative'): T {
  if (!record) return record

  const persona = getCurrentPersona()
  const result = { ...record } as any

  if (entityType === 'project') {
    if (persona === 'TeamMember' || persona === 'Planner') {
      result.pm_approvedbudget = 0
      result.pm_actualcost = 0
    }
  }

  if (entityType === 'resource') {
    if (persona === 'TeamMember' || persona === 'Planner') {
      result.pm_dailycostrate = 0
    }
  }

  if (entityType === 'risk') {
    if (persona === 'TeamMember') {
      result.pm_financialexposureamount = 0
    }
  }

  if (entityType === 'initiative') {
    if (persona === 'TeamMember') {
      result.pm_estimatedcost = 0
      result.pm_estimatedbenefits = 0
    }
  }

  return result as T
}

/**
 * Helper to apply masking to an array of records.
 */
export function applySecurityMaskingArray<T = any>(records: T[], entityType: 'project' | 'resource' | 'risk' | 'initiative'): T[] {
  if (!records || !Array.isArray(records)) return []
  return records.map(record => applySecurityMasking(record, entityType))
}
