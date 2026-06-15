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
    'dashboard', 'portfolios', 'programmes', 'projects', 'pipeline', 'resources', 
    'timesheets', 'budgets', 'gatereviews', 'benefits', 'schedule', 'risks', 
    'issues', 'changerequests', 'cashflow', 'tasks', 'fundingsources', 
    'statussnapshots', 'configurations', 'workflows', 'teamadmin', 'skills', 'holidays'
  ],
  PortfolioExecutive: [
    'dashboard', 'portfolios', 'programmes', 'projects', 'pipeline', 
    'gatereviews', 'benefits', 'changerequests', 'statussnapshots'
  ],
  PMO: [
    'dashboard', 'portfolios', 'programmes', 'projects', 'pipeline', 
    'gatereviews', 'changerequests', 'tasks', 'statussnapshots', 
    'workflows', 'teamadmin'
  ],
  ProjectManager: [
    'dashboard', 'projects', 'resources', 'timesheets', 'gatereviews', 
    'schedule', 'risks', 'issues', 'changerequests', 'tasks', 'statussnapshots'
  ],
  FinancialController: [
    'dashboard', 'projects', 'budgets', 'cashflow', 'fundingsources'
  ],
  Planner: [
    'dashboard', 'projects', 'schedule', 'tasks'
  ],
  TeamMember: [
    'dashboard', 'timesheets', 'tasks', 'risks', 'issues'
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
    return keywords.some(keyword => 
      title.includes(keyword) || 
      name.includes(keyword) || 
      teams.some(t => t.includes(keyword)) || 
      roles.some(r => r.includes(keyword))
    )
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
  if (matches(['project manager', 'programme manager', 'delivery', 'pm', 'lead'])) {
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
