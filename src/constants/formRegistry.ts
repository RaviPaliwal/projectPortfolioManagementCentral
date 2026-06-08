import type { TabKey } from '@/components/layout/PrimaryShell'
import { navigateToTab, navigateToProject, navigateToRisk, navigateToIssue, navigateToProgramme } from '@/utils/navigation'

/**
 * A registry of all forms/pages in the application.
 * Each entry defines a unique form key, the module it belongs to,
 * the tab it maps to, and how to navigate to it with an optional entity pre-selection.
 *
 * Usage:
 * - Workflow step templates reference a formKey from this registry
 * - At runtime, the engine calls `entry.navigate(entityId)` to open the correct form
 * - The WorkflowStepConfigPage uses this registry to let users pick a form key
 */

export interface FormRegistryEntry {
  /** Unique identifier for this form (e.g. "project_view", "portfolio_edit") */
  key: string
  /** The module/category this form belongs to (e.g. "Projects", "Portfolios") */
  moduleName: string
  /** The tab key in the shell that this form lives under */
  tabKey: TabKey
  /** Human-readable display name shown in dropdowns */
  displayName: string
  /** Short description of what this form is for */
  description?: string
  /** Navigate to this form, optionally pre-selecting an entity by ID */
  navigate: (entityId?: string) => void
}

export const FORM_REGISTRY: FormRegistryEntry[] = [
  // ─── Dashboard ───
  {
    key: 'dashboard',
    moduleName: 'Dashboard',
    tabKey: 'dashboard',
    displayName: 'Dashboard',
    description: 'Main PPM dashboard',
    navigate: () => navigateToTab('dashboard'),
  },

  // ─── Portfolios ───
  {
    key: 'portfolio_view',
    moduleName: 'Portfolios',
    tabKey: 'portfolios',
    displayName: 'Portfolio View',
    description: 'View and manage portfolios',
    navigate: (id) => {
      if (id) sessionStorage.setItem('preselectPortfolioId', id)
      navigateToTab('portfolios')
    },
  },

  // ─── Programmes ───
  {
    key: 'programme_view',
    moduleName: 'Programmes',
    tabKey: 'programmes',
    displayName: 'Programme View',
    description: 'View and manage programmes',
    navigate: (id) => {
      if (id) sessionStorage.setItem('preselectProgrammeId', id)
      navigateToTab('programmes')
    },
  },

  // ─── Projects ───
  {
    key: 'project_view',
    moduleName: 'Projects',
    tabKey: 'projects',
    displayName: 'Project 360° View',
    description: 'Full project detail with all sub-tabs',
    navigate: (id) => id ? navigateToProject(id) : navigateToTab('projects'),
  },

  // ─── Pipeline ───
  {
    key: 'pipeline_view',
    moduleName: 'Pipeline',
    tabKey: 'pipeline',
    displayName: 'Pipeline View',
    description: 'Initiative pipeline and conversion',
    navigate: () => navigateToTab('pipeline'),
  },

  // ─── Resources ───
  {
    key: 'resource_view',
    moduleName: 'Resources',
    tabKey: 'resources',
    displayName: 'Resource Management',
    description: 'Manage resources and allocations',
    navigate: () => navigateToTab('resources'),
  },

  // ─── Timesheets ───
  {
    key: 'timesheet_view',
    moduleName: 'Timesheets',
    tabKey: 'timesheets',
    displayName: 'Timesheets',
    description: 'Timesheet management and approval',
    navigate: () => navigateToTab('timesheets'),
  },

  // ─── Budgets ───
  {
    key: 'budget_view',
    moduleName: 'Budgets',
    tabKey: 'budgets',
    displayName: 'Budget Management',
    description: 'Budget lines and financial tracking',
    navigate: () => navigateToTab('budgets'),
  },

  // ─── Gate Reviews ───
  {
    key: 'gatereview_view',
    moduleName: 'Gate Reviews',
    tabKey: 'gatereviews',
    displayName: 'Gate Reviews',
    description: 'Project gate review management',
    navigate: () => navigateToTab('gatereviews'),
  },
  {
    key: 'pmo_readiness',
    moduleName: 'Gate Reviews',
    tabKey: 'gatereviews',
    displayName: 'PMO Readiness Task',
    description: 'Automated readiness assessment with override capability for PMO review',
    navigate: (id) => {
      if (id) sessionStorage.setItem('preselectGateReviewId', id)
      sessionStorage.setItem('gateReviewTaskType', 'pmo_readiness')
      navigateToTab('gatereviews')
    },
  },
  {
    key: 'financial_review',
    moduleName: 'Gate Reviews',
    tabKey: 'gatereviews',
    displayName: 'Financial Review Task',
    description: 'Financial health assessment and endorsement for gate progression',
    navigate: (id) => {
      if (id) sessionStorage.setItem('preselectGateReviewId', id)
      sessionStorage.setItem('gateReviewTaskType', 'financial_review')
      navigateToTab('gatereviews')
    },
  },
  {
    key: 'board_decision',
    moduleName: 'Gate Reviews',
    tabKey: 'gatereviews',
    displayName: 'Governance Board Decision',
    description: 'Final board decision recording with outcome, conditions, and endorsement history',
    navigate: (id) => {
      if (id) sessionStorage.setItem('preselectGateReviewId', id)
      sessionStorage.setItem('gateReviewTaskType', 'board_decision')
      navigateToTab('gatereviews')
    },
  },

  // ─── Benefits ───
  {
    key: 'benefit_view',
    moduleName: 'Benefits',
    tabKey: 'benefits',
    displayName: 'Benefits Management',
    description: 'Benefits realisation and measures',
    navigate: () => navigateToTab('benefits'),
  },

  // ─── Schedule ───
  {
    key: 'schedule_view',
    moduleName: 'Schedule',
    tabKey: 'schedule',
    displayName: 'Project Schedule',
    description: 'Task and milestone schedule',
    navigate: () => navigateToTab('schedule'),
  },

  // ─── Risks ───
  {
    key: 'risk_view',
    moduleName: 'Risks',
    tabKey: 'risks',
    displayName: 'Risk Register',
    description: 'Risk identification and mitigation',
    navigate: (id) => id ? navigateToRisk(id) : navigateToTab('risks'),
  },

  // ─── Issues ───
  {
    key: 'issue_view',
    moduleName: 'Issues',
    tabKey: 'issues',
    displayName: 'Issue Register',
    description: 'Issue tracking and resolution',
    navigate: (id) => id ? navigateToIssue(id) : navigateToTab('issues'),
  },

  // ─── Change Requests ───
  {
    key: 'changerequest_view',
    moduleName: 'Change Requests',
    tabKey: 'changerequests',
    displayName: 'Change Requests',
    description: 'Change request management',
    navigate: () => navigateToTab('changerequests'),
  },

  // ─── Cashflow ───
  {
    key: 'cashflow_view',
    moduleName: 'Cashflow',
    tabKey: 'cashflow',
    displayName: 'Cashflow Entries',
    description: 'Cashflow transaction tracking',
    navigate: () => navigateToTab('cashflow'),
  },

  // ─── Approval Requests ───
  {
    key: 'approval_view',
    moduleName: 'Approvals',
    tabKey: 'approvalrequests',
    displayName: 'Approval Requests',
    description: 'Project approval request management',
    navigate: () => navigateToTab('approvalrequests'),
  },

  // ─── Funding Sources ───
  {
    key: 'fundingsource_view',
    moduleName: 'Funding Sources',
    tabKey: 'fundingsources',
    displayName: 'Funding Sources',
    description: 'Funding source management',
    navigate: () => navigateToTab('fundingsources'),
  },

  // ─── Workflows ───
  {
    key: 'workflow_view',
    moduleName: 'Workflows',
    tabKey: 'workflows',
    displayName: 'Workflow Automation',
    description: 'Workflow templates and instances',
    navigate: () => navigateToTab('workflows'),
  },

  // ─── Pending Approvals ───
  {
    key: 'pendingapproval_view',
    moduleName: 'Approvals Queue',
    tabKey: 'pendingapprovals',
    displayName: 'Pending Approvals Queue',
    description: 'My pending approval tasks',
    navigate: () => navigateToTab('pendingapprovals'),
  },

  // ─── Status Snapshots ───
  {
    key: 'statussnapshot_view',
    moduleName: 'Status Snapshots',
    tabKey: 'statussnapshots',
    displayName: 'Status Snapshots',
    description: 'Project status snapshot reporting',
    navigate: () => navigateToTab('statussnapshots'),
  },

  // ─── Skills ───
  {
    key: 'skill_view',
    moduleName: 'Skills',
    tabKey: 'skills',
    displayName: 'Skills & Mapping',
    description: 'Skill taxonomy and resource mapping',
    navigate: () => navigateToTab('skills'),
  },

  // ─── Team Admin ───
  {
    key: 'teamadmin_view',
    moduleName: 'Team Admin',
    tabKey: 'teamadmin',
    displayName: 'Team & User Management',
    description: 'Manage teams and user assignments',
    navigate: () => navigateToTab('teamadmin'),
  },

  // ─── Holidays ───
  {
    key: 'holiday_view',
    moduleName: 'Holidays',
    tabKey: 'holidays',
    displayName: 'Holiday Calendar',
    description: 'Holiday schedule and country rules',
    navigate: () => navigateToTab('holidays'),
  },

  // ─── Configurations ───
  {
    key: 'configuration_view',
    moduleName: 'Configurations',
    tabKey: 'configurations',
    displayName: 'System Configurations',
    description: 'Application settings and tools',
    navigate: () => navigateToTab('configurations'),
  },
]

/**
 * Look up a form registry entry by its key.
 * Returns undefined if not found.
 */
export function getFormByKey(key: string): FormRegistryEntry | undefined {
  return FORM_REGISTRY.find((entry) => entry.key === key)
}

/**
 * Get all form keys grouped by module name.
 * Useful for rendering grouped dropdowns.
 */
export function getFormsGroupedByModule(): Record<string, FormRegistryEntry[]> {
  const grouped: Record<string, FormRegistryEntry[]> = {}
  for (const entry of FORM_REGISTRY) {
    if (!grouped[entry.moduleName]) {
      grouped[entry.moduleName] = []
    }
    grouped[entry.moduleName].push(entry)
  }
  return grouped
}

/**
 * Get all unique module names from the registry.
 */
export function getModuleNames(): string[] {
  const modules = new Set(FORM_REGISTRY.map((e) => e.moduleName))
  return Array.from(modules).sort()
}
