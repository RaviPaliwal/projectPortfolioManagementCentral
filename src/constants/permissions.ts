import type { TabKey } from '@/components/layout/PrimaryShell'

export type Persona =
  | 'SystemAdministrator'
  | 'PortfolioExecutive'
  | 'PMO'
  | 'ProjectManager'
  | 'FinancialController'
  | 'Planner'
  | 'TeamMember'

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
