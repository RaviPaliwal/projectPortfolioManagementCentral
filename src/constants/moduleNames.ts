/**
 * Central Module Names Registry
 *
 * Single source of truth for all module names throughout the application.
 * Every module has multiple representations:
 *   - value:       Stored in Dataverse (pm_module, pm_entitytype)
 *   - label:       Human-readable display label (for dropdowns, formRegistry.moduleName)
 *   - tabKey:      Navigation tab key (PrimaryShell routing)
 *   - entityCode:  Numeric code for approval requests entity type (0-5)
 *   - entityName:  Dataverse logical table name (stored in pm_entityname on workflow instances)
 *
 * Usage:
 *   import { MODULE_NAMES, getModuleByValue, getModuleOptions } from '@/constants/moduleNames'
 */

import type { TabKey } from '@/components/layout/PrimaryShell'

// ─── Module Name Definition ─────────────────────────────────────────────

export interface ModuleNameDefinition {
  /** Dataverse value for pm_module / pm_entitytype / filter values */
  value: string
  /** Human-readable display label */
  label: string
  /** Navigation tab key in PrimaryShell */
  tabKey: TabKey
  /** Numeric entity type code for approval requests (0-based) */
  entityCode?: number
  /** Dataverse logical table name for pm_entityname on workflow instances */
  entityName?: string
}

export const MODULE_NAMES = {
  DASHBOARD: {
    value: 'Dashboard',
    label: 'Dashboard',
    tabKey: 'dashboard' as const,
  },
  PORTFOLIOS: {
    value: 'Portfolio',
    label: 'Portfolios',
    tabKey: 'portfolios' as const,
    entityCode: 2,
    entityName: 'pm_portfolio',
  },
  PROGRAMMES: {
    value: 'Programme',
    label: 'Programmes',
    tabKey: 'programmes' as const,
    entityCode: 1,
    entityName: 'pm_programme',
  },
  PROJECTS: {
    value: 'Project',
    label: 'Projects',
    tabKey: 'projects' as const,
    entityCode: 0,
    entityName: 'pm_project',
  },
  PIPELINE: {
    value: 'Pipeline',
    label: 'Pipeline',
    tabKey: 'pipeline' as const,
    entityName: 'pm_initiative',
  },
  RESOURCES: {
    value: 'Resources',
    label: 'Resources',
    tabKey: 'resources' as const,
    entityName: 'pm_resource',
  },
  TIMESHEETS: {
    value: 'Timesheets',
    label: 'Timesheets',
    tabKey: 'timesheets' as const,
    entityName: 'pm_timesheet',
  },
  BUDGETS: {
    value: 'Budgets',
    label: 'Budgets',
    tabKey: 'budgets' as const,
    entityName: 'pm_budgetline',
  },
  GATE_REVIEWS: {
    value: 'GateReview',
    label: 'Gate Reviews',
    tabKey: 'gatereviews' as const,
    entityName: 'pm_projectgatereview',
  },
  BENEFITS: {
    value: 'Benefits',
    label: 'Benefits',
    tabKey: 'benefits' as const,
    entityName: 'pm_benefit',
  },
  RISKS: {
    value: 'Risks',
    label: 'Risks & Issues',
    tabKey: 'risks' as const,
    entityName: 'pm_risk',
  },
  ISSUES: {
    value: 'Issues',
    label: 'Issues',
    tabKey: 'issues' as const,
    entityName: 'pm_issue',
  },
  CHANGE_REQUESTS: {
    value: 'ChangeRequests',
    label: 'Change Requests',
    tabKey: 'changerequests' as const,
    entityName: 'pm_changerequest',
  },
  CASHFLOW: {
    value: 'Cashflow',
    label: 'Cashflow',
    tabKey: 'cashflow' as const,
    entityName: 'pm_cashflowentry',
  },
  APPROVALS: {
    value: 'Approvals',
    label: 'Approvals',
    tabKey: 'approvalrequests' as const,
    entityName: 'pm_projectapprovalrequest',
  },
  FUNDING_SOURCES: {
    value: 'FundingSources',
    label: 'Funding Sources',
    tabKey: 'fundingsources' as const,
    entityName: 'pm_fundingsource',
  },
  WORKFLOWS: {
    value: 'Workflows',
    label: 'Workflows',
    tabKey: 'workflows' as const,
    entityName: 'pm_workflow',
  },
  PENDING_APPROVALS: {
    value: 'PendingApprovals',
    label: 'Approvals Queue',
    tabKey: 'pendingapprovals' as const,
    entityName: 'pm_workflowapprovalstep',
  },
  STATUS_SNAPSHOTS: {
    value: 'StatusSnapshots',
    label: 'Status Snapshots',
    tabKey: 'statussnapshots' as const,
    entityName: 'pm_projectstatussnapshot',
  },
  SKILLS: {
    value: 'Skills',
    label: 'Skills & Mapping',
    tabKey: 'skills' as const,
    entityName: 'pm_skill',
  },
  TEAM_ADMIN: {
    value: 'TeamAdmin',
    label: 'Team Admin',
    tabKey: 'teamadmin' as const,
    entityName: 'systemuser',
  },
  HOLIDAYS: {
    value: 'Holidays',
    label: 'Holiday Calendar',
    tabKey: 'holidays' as const,
    entityName: 'pm_holiday',
  },
  WORKSPACE: {
    value: 'Workspace',
    label: 'My Workspace',
    tabKey: 'workspace' as const,
  },
  CONFIGURATIONS: {
    value: 'Configurations',
    label: 'Configurations',
    tabKey: 'configurations' as const,
  },
} as const

// ─── Types ────────────────────────────────────────────────────────────────

export type ModuleNameKey = keyof typeof MODULE_NAMES

/** @deprecated Use ModuleNameEntry directly */
export type ModuleDefinition = ModuleNameEntry

export interface ModuleNameEntry {
  value: string
  label: string
  tabKey: string
  entityCode?: number
  entityName?: string
}

// ─── All entries as an array ────────────────────────────────────────────

export const MODULE_NAME_LIST: ModuleNameEntry[] = Object.values(MODULE_NAMES).map((m) => ({
  value: m.value,
  label: m.label,
  tabKey: m.tabKey,
  entityCode: (m as any).entityCode,
  entityName: (m as any).entityName,
}))

// ─── Lookup Utilities ───────────────────────────────────────────────────

/**
 * Find a module definition by its Dataverse value (e.g. 'Project', 'GateReview').
 */
export function getModuleByValue(value: string): ModuleNameEntry | undefined {
  return MODULE_NAME_LIST.find((m) => m.value === value)
}

/**
 * Find a module definition by its tab key (e.g. 'projects', 'gatereviews').
 */
export function getModuleByTabKey(tabKey: string): ModuleNameEntry | undefined {
  return MODULE_NAME_LIST.find((m) => m.tabKey === tabKey)
}

/**
 * Find a module definition by its entity code (approval requests numeric type).
 */
export function getModuleByEntityCode(code: number): ModuleNameEntry | undefined {
  return MODULE_NAME_LIST.find((m) => m.entityCode === code)
}

/**
 * Find a module definition by its Dataverse logical table name (pm_entityname value).
 */
export function getModuleByEntityName(entityName: string): ModuleNameEntry | undefined {
  return MODULE_NAME_LIST.find((m) => m.entityName?.toLowerCase() === entityName.toLowerCase())
}

/**
 * Resolve a module value from any known representation (value, label, tabKey, entityName, or lowercase).
 * Useful for normalising inconsistent user input or legacy data.
 */
export function resolveModule(input: string): ModuleNameEntry | undefined {
  const lower = input.toLowerCase()
  return MODULE_NAME_LIST.find(
    (m) =>
      m.value.toLowerCase() === lower ||
      m.label.toLowerCase() === lower ||
      m.tabKey.toLowerCase() === lower ||
      (m.entityCode !== undefined && String(m.entityCode) === input) ||
      (m.entityName !== undefined && m.entityName.toLowerCase() === lower)
  )
}

/**
 * Get a flat list of { value, label } pairs for Select/Autocomplete dropdowns.
 * Optionally includes a placeholder entry at index 0.
 */
export function getModuleOptions(includePlaceholder = false): Array<{ value: string; label: string }> {
  const options = MODULE_NAME_LIST.map((m) => ({ value: m.value as string, label: m.label as string }))
  if (includePlaceholder) {
    options.unshift({ value: '', label: 'Select Module...' })
  }
  return options
}

/**
 * Get dropdown options with a placeholder for workflow selectors.
 */
export function getModuleOptionsForWorkflow(): Array<{ value: string; label: string }> {
  return [
    { value: '', label: 'Select Module...' },
    ...MODULE_NAME_LIST.map((m) => ({ value: m.value as string, label: m.label as string })),
  ]
}

/**
 * Get the entity code labels map used by ApprovalRequestsPage.
 */
export function getEntityTypeLabels(): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const m of MODULE_NAME_LIST) {
    if (m.entityCode !== undefined) {
      labels[String(m.entityCode)] = m.label
    }
  }
  return labels
}

/**
 * Get entity type filter options for dropdowns.
 */
export function getEntityTypeOptions(includeAll = true): Array<{ value: string; label: string }> {
  const options = MODULE_NAME_LIST
    .filter((m) => m.entityCode !== undefined)
    .map((m) => ({ value: m.value as string, label: m.label as string }))
  if (includeAll) {
    options.unshift({ value: '', label: 'All Entity Types' })
  }
  return options
}
