import type { TabKey } from '@/components/layout/PrimaryShell'

export type Persona =
  | 'SystemAdministrator'
  | 'PortfolioExecutive'
  | 'PMO'
  | 'ProjectManager'
  | 'FinancialController'
  | 'Planner'
  | 'TeamMember'

export type CrudAction = 'create' | 'read' | 'update' | 'delete'

export const ALL_PERSONAS: Persona[] = [
  'SystemAdministrator',
  'PortfolioExecutive',
  'PMO',
  'ProjectManager',
  'FinancialController',
  'Planner',
  'TeamMember',
]

export const PERSONA_PERMISSIONS: Record<Persona, TabKey[]> = {
  SystemAdministrator: [
    'dashboard', 'strategicRoster', 'portfolios', 'programmes', 'projects', 'pipeline', 'resources',
    'timesheets', 'budgets', 'gatereviews', 'benefits', 'risks',
    'issues', 'changerequests', 'cashflow', 'tasks', 'fundingsources',
    'statussnapshots', 'configurations', 'workflows', 'teamadmin', 'skills', 'holidays', 'calendar'
  ],
  PortfolioExecutive: [
    'dashboard', 'strategicRoster', 'portfolios', 'programmes', 'projects', 'pipeline',
    'gatereviews', 'benefits', 'changerequests', 'statussnapshots', 'calendar'
  ],
  PMO: [
    'dashboard', 'strategicRoster', 'portfolios', 'programmes', 'projects', 'pipeline',
    'gatereviews', 'changerequests', 'tasks', 'statussnapshots',
    'workflows', 'teamadmin', 'calendar'
  ],
  ProjectManager: [
    'dashboard', 'strategicRoster', 'projects', 'resources', 'timesheets', 'gatereviews',
    'risks', 'issues', 'changerequests', 'tasks', 'statussnapshots', 'calendar'
  ],
  FinancialController: [
    'dashboard', 'projects', 'budgets', 'cashflow', 'fundingsources', 'calendar'
  ],
  Planner: [
    'dashboard', 'projects', 'tasks', 'calendar'
  ],
  TeamMember: [
    'dashboard', 'timesheets', 'tasks', 'risks', 'issues', 'calendar'
  ]
}

export type CrudModule =
  | 'DASHBOARD'
  | 'PORTFOLIOS'
  | 'PROGRAMMES'
  | 'PROJECTS'
  | 'PIPELINE'
  | 'RESOURCES'
  | 'TIMESHEETS'
  | 'BUDGETS'
  | 'GATE_REVIEWS'
  | 'BENEFITS'
  | 'RISKS'
  | 'ISSUES'
  | 'CHANGE_REQUESTS'
  | 'CASHFLOW'
  | 'FUNDING_SOURCES'
  | 'WORKFLOWS'
  | 'STATUS_SNAPSHOTS'
  | 'SKILLS'
  | 'HOLIDAYS'
  | 'TEAM_ADMIN'
  | 'CONFIGURATIONS'

/**
 * CRUD Permission Matrix
 * Defines which personas can perform each CRUD action on each module.
 * If a persona is not listed for an action, they are denied that action.
 */
export const CRUD_PERMISSIONS: Record<CrudModule, Partial<Record<CrudAction, Persona[]>>> = {
  DASHBOARD: { read: ALL_PERSONAS },
  PORTFOLIOS: {
    create: ['PortfolioExecutive', 'PMO', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['PortfolioExecutive', 'PMO', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  PROGRAMMES: {
    create: ['PMO', 'ProjectManager', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['PMO', 'ProjectManager', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  PROJECTS: {
    create: ['ProjectManager', 'PMO', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['ProjectManager', 'PMO', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  PIPELINE: {
    create: ['PMO', 'PortfolioExecutive', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['PMO', 'PortfolioExecutive', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  RESOURCES: {
    create: ['SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  TIMESHEETS: {
    create: ['TeamMember', 'ProjectManager', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['TeamMember', 'ProjectManager', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  BUDGETS: {
    create: ['FinancialController', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['FinancialController', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  GATE_REVIEWS: {
    create: ['PMO', 'ProjectManager', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['PMO', 'ProjectManager', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  BENEFITS: {
    create: ['PortfolioExecutive', 'PMO', 'ProjectManager', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['PortfolioExecutive', 'PMO', 'ProjectManager', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  RISKS: {
    create: ['ProjectManager', 'TeamMember', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['ProjectManager', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  ISSUES: {
    create: ALL_PERSONAS,
    read: ALL_PERSONAS,
    update: ['ProjectManager', 'SystemAdministrator', 'TeamMember'],
    delete: ['SystemAdministrator'],
  },
  CHANGE_REQUESTS: {
    create: ['ProjectManager', 'TeamMember', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['ProjectManager', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  CASHFLOW: {
    create: ['FinancialController', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['FinancialController', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  FUNDING_SOURCES: {
    create: ['FinancialController', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['FinancialController', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  WORKFLOWS: {
    create: ['SystemAdministrator', 'PMO'],
    read: ['SystemAdministrator', 'PMO'],
    update: ['SystemAdministrator', 'PMO'],
    delete: ['SystemAdministrator'],
  },
  STATUS_SNAPSHOTS: {
    create: ['ProjectManager', 'PMO', 'SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['ProjectManager', 'PMO', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  SKILLS: {
    create: ['SystemAdministrator', 'PMO'],
    read: ALL_PERSONAS,
    update: ['SystemAdministrator', 'PMO'],
    delete: ['SystemAdministrator'],
  },
  HOLIDAYS: {
    create: ['SystemAdministrator'],
    read: ALL_PERSONAS,
    update: ['SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
  TEAM_ADMIN: {
    create: ['SystemAdministrator', 'PMO'],
    read: ['SystemAdministrator', 'PMO'],
    update: ['SystemAdministrator', 'PMO'],
    delete: ['SystemAdministrator'],
  },
  CONFIGURATIONS: {
    read: ['SystemAdministrator', 'PMO'],
  },
}

/**
 * Check if a given persona has permission for a CRUD action on a module.
 */
export function checkCrudPermission(
  persona: Persona,
  module: CrudModule,
  action: CrudAction
): boolean {
  const modulePerms = CRUD_PERMISSIONS[module]
  if (!modulePerms) return false
  const allowedPersonas = modulePerms[action]
  if (!allowedPersonas) return false
  return allowedPersonas.includes(persona)
}

export function getPersonaFromUser(
  user: { jobtitle?: string; fullname?: string } | null,
  userTeamNames: string[] = [],
  userRoleNames: string[] = []
): Persona {
  if (!user) return 'TeamMember'

  const title = (user.jobtitle || '').toLowerCase()
  const name = (user.fullname || '').toLowerCase()
  const teams = userTeamNames.filter(Boolean).map(t => String(t).toLowerCase())
  const roles = userRoleNames.filter(Boolean).map(r => String(r).toLowerCase())

  const matches = (keywords: string[]) => {
    return keywords.some(keyword => {
      const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'i')
      return (
        regex.test(title) ||
        regex.test(name) ||
        teams.some(t => regex.test(t)) ||
        roles.some(r => regex.test(r))
      )
    })
  }

  // 1. System Administrator
  if (matches(['admin', 'platform owner', 'sysadmin', 'administrator'])) {
    return 'SystemAdministrator'
  }

  // 2. PMO / Governance Lead
  if (matches(['pmo', 'governance', 'compliance', 'audit'])) {
    return 'PMO'
  }

  // 3. Portfolio Executive / Sponsor
  if (matches(['executive', 'sponsor', 'director', 'vp', 'chief', 'president'])) {
    return 'PortfolioExecutive'
  }

  // 4. Project / Programme Manager
  if (matches(['project manager', 'programme manager', 'delivery', 'pm', 'lead', 'scrum master'])) {
    return 'ProjectManager'
  }

  // 5. Financial / Commercial Controller
  if (matches(['financial', 'commercial', 'controller', 'finance', 'accountant', 'budget'])) {
    return 'FinancialController'
  }

  // 6. Planner / Scheduler
  if (matches(['planner', 'scheduler', 'planning'])) {
    return 'Planner'
  }

  // Default: Team Member / Contributor
  return 'TeamMember'
}
