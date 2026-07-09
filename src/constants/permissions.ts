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
    'statussnapshots', 'configurations', 'workflows', 'teamadmin', 'skills', 'holidays', 'calendar', 'activitylog',
    'reportConfigs'
  ],
  PortfolioExecutive: [
    'dashboard', 'strategicRoster', 'portfolios', 'programmes', 'projects', 'pipeline',
    'gatereviews', 'benefits', 'changerequests', 'statussnapshots', 'calendar'
  ],
  PMO: [
    'dashboard', 'strategicRoster', 'portfolios', 'programmes', 'projects', 'pipeline',
    'gatereviews', 'changerequests', 'tasks', 'statussnapshots',
    'workflows', 'teamadmin', 'calendar', 'activitylog', 'resources', 'reportConfigs'
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
    'timesheets', 'tasks', 'risks', 'issues', 'calendar'
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
  | 'FINANCIAL_REPORT_CONFIGS'

/**
 * CRUD Permission Matrix
 * Defines which personas can perform each CRUD action on each module.
 * If a persona is not listed for an action, they are denied that action.
 */
export const CRUD_PERMISSIONS: Record<CrudModule, Partial<Record<CrudAction, Persona[]>>> = {
  DASHBOARD: { read: ALL_PERSONAS },
  FINANCIAL_REPORT_CONFIGS: {
    create: ['PMO', 'SystemAdministrator'],
    read: ['SystemAdministrator', 'PortfolioExecutive', 'PMO', 'ProjectManager', 'FinancialController'],
    update: ['PMO', 'SystemAdministrator'],
    delete: ['SystemAdministrator'],
  },
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

/**
 * Convert a Persona enum value to a human-readable display name.
 * e.g. "SystemAdministrator" -> "System Administrator", "TeamMember" -> "Team Member"
 */
export function formatPersonaName(persona: Persona): string {
  // All-caps acronym like "PMO" should stay as-is
  if (persona === 'PMO') return 'PMO'
  // PascalCase -> split words: "TeamMember" -> "Team Member"
  return persona.replace(/([A-Z])/g, ' $1').trim()
}

/**
 * Derive a persona from a single team name using the same keyword matching
 * priority order as getPersonaFromUser().
 */
export function getPersonaFromTeamName(teamName: string): Persona {
  const name = String(teamName).toLowerCase()

  const containsKeyword = (keywords: string[]) =>
    keywords.some(keyword => {
      const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(name)
    })

  if (containsKeyword(['admin', 'platform owner', 'sysadmin', 'administrator'])) return 'SystemAdministrator'
  if (containsKeyword(['executive', 'sponsor', 'director', 'vp', 'chief', 'president'])) return 'PortfolioExecutive'
  if (containsKeyword(['pmo', 'governance', 'compliance', 'audit'])) return 'PMO'
  if (containsKeyword(['financial', 'commercial', 'controller', 'finance', 'accountant', 'budget', 'financial controller'])) return 'FinancialController'
  if (containsKeyword(['planner', 'scheduler', 'planning'])) return 'Planner'
  if (containsKeyword(['project manager', 'programme manager', 'delivery', 'pm', 'lead', 'scrum master'])) return 'ProjectManager'

  return 'TeamMember'
}

/**
 * ── Persona Override Storage ──────────────────────────────────────────────
 * Stores manual persona overrides in localStorage so admins can
 * override the keyword-based resolution for specific users.
 *
 * Override key: `ppm_persona_override:<normalizedUserId>`
 * Override value: Persona name or empty string (to clear)
 */

const OVERRIDE_PREFIX = 'ppm_persona_override:'

function normalizeUserId(id: string): string {
  return id.replace(/[{}]/g, '').trim().toLowerCase()
}

/** Get the manual persona override for a user, or null if none set. */
export function getPersonaOverride(userId: string): Persona | null {
  // Security check: Only allow persona overrides in development mode
  const isDev = (typeof window !== 'undefined' && (window as any).process?.env?.NODE_ENV === 'development') || 
                (import.meta as any).env?.DEV || 
                (import.meta as any).env?.VITE_ALLOW_PERSONA_OVERRIDE === 'true';
  if (!isDev) return null;

  try {
    const key = OVERRIDE_PREFIX + normalizeUserId(userId)
    const stored = localStorage.getItem(key)
    if (stored && ALL_PERSONAS.includes(stored as Persona)) {
      return stored as Persona
    }
  } catch { /* localStorage may be unavailable */ }
  return null;
}

/** Set a manual persona override for a user. Pass null to clear. */
export function setPersonaOverride(userId: string, persona: Persona | null): void {
  try {
    const key = OVERRIDE_PREFIX + normalizeUserId(userId)
    if (persona) {
      localStorage.setItem(key, persona)
    } else {
      localStorage.removeItem(key)
    }
  } catch { /* localStorage may be unavailable */ }
}

/** Get all persona overrides as a record of userId → persona. */
export function getAllPersonaOverrides(): Record<string, Persona> {
  const overrides: Record<string, Persona> = {}
  // Security check: Only allow persona overrides in development mode
  const isDev = (typeof window !== 'undefined' && (window as any).process?.env?.NODE_ENV === 'development') || 
                (import.meta as any).env?.DEV || 
                (import.meta as any).env?.VITE_ALLOW_PERSONA_OVERRIDE === 'true';
  if (!isDev) return overrides;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(OVERRIDE_PREFIX)) {
        const userId = key.slice(OVERRIDE_PREFIX.length)
        const persona = localStorage.getItem(key)
        if (persona && ALL_PERSONAS.includes(persona as Persona)) {
          overrides[userId] = persona as Persona
        }
      }
    }
  } catch { /* localStorage may be unavailable */ }
  return overrides;
}

/**
 * Determine a user's persona.
 *
 * Resolution order:
 * 1. If a manual override exists for the user's systemuserid, use it.
 * 2. Otherwise, use keyword matching against job title, full name,
 *    team names, and role names.
 *
 * Keyword matching uses a refined priority order:
 *   SystemAdministrator → PortfolioExecutive → PMO →
 *   ProjectManager → FinancialController → Planner → TeamMember
 *
 * This fixes the "PMO Director" conflict: "director" now matches
 * PortfolioExecutive (the more senior persona) before PMO.
 */
export function getPersonaFromUser(
  user: { systemuserid?: string; jobtitle?: string; fullname?: string } | null,
  userTeamNames: string[] = [],
  userRoleNames: string[] = []
): Persona {
  if (!user) return 'TeamMember'

  // 1. Check for manual override first
  if (user.systemuserid) {
    const override = getPersonaOverride(user.systemuserid)
    if (override) return override
  }

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

  // Refined priority order: more senior/specific roles checked first
  // to avoid conflicts like "PMO Director" being classified as PMO

  // 1. System Administrator (highest privilege — keep first)
  if (matches(['admin', 'platform owner', 'sysadmin', 'administrator'])) {
    return 'SystemAdministrator'
  }

  // 2. Portfolio Executive / Sponsor (senior leadership — moved up from #3)
  if (matches(['executive', 'sponsor', 'director', 'vp', 'chief', 'president'])) {
    return 'PortfolioExecutive'
  }

  // 3. PMO / Governance Lead (moved down from #2)
  if (matches(['pmo', 'governance', 'compliance', 'audit'])) {
    return 'PMO'
  }

  // 4. Financial / Commercial Controller
  if (matches(['financial', 'commercial', 'controller', 'finance', 'accountant', 'budget', 'financial controller'])) {
    return 'FinancialController'
  }

  // 5. Planner / Scheduler
  if (matches(['planner', 'scheduler', 'planning'])) {
    return 'Planner'
  }

  // 6. Project / Programme Manager
  if (matches(['project manager', 'programme manager', 'delivery', 'pm', 'lead', 'scrum master'])) {
    return 'ProjectManager'
  }

  // Default: Team Member / Contributor
  return 'TeamMember'
}
