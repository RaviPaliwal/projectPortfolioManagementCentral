import type { ReactNode } from 'react'
import type { TabKey } from '@/components/layout/PrimaryShell'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import PortfoliosPage from '@/features/portfolios/pages/PortfoliosPage'
import ProgrammesPage from '@/features/programmes/pages/ProgrammesPage'
import ProjectsPage from '@/features/projects/pages/ProjectsPage'
import PipelinePage from '@/features/pipeline/pages/PipelinePage'
import ResourcesPage from '@/features/resources/pages/ResourcesPage'
import TeamMemberTimesheetPage from '@/features/timesheets/pages/TeamMemberTimesheetPage'
import BudgetsPage from '@/features/budgets/pages/BudgetsPage'
import GateReviewsPage from '@/features/gatereviews/pages/GateReviewsPage'
import BenefitsPage from '@/features/benefits/pages/BenefitsPage'
import RisksPage from '@/features/risks/pages/RisksPage'
import IssuesPage from '@/features/issues/pages/IssuesPage'
import ChangeRequestsPage from '@/features/changerequests/pages/ChangeRequestsPage'
import CashflowPage from '@/features/cashflow/pages/CashflowPage'
import TasksPage from '@/features/tasks/pages/TasksPage'
import FundingSourcesPage from '@/features/fundingsources/pages/FundingSourcesPage'
import SkillsPage from '@/features/skills/pages/SkillsPage'
import WorkflowsPage from '@/features/workflows/pages/WorkflowsPage'

import HolidaysPage from '@/features/holidays/pages/HolidaysPage'
import StatusSnapshotsPage from '@/features/statussnapshots/pages/StatusSnapshotsPage'
import TeamUserManagementPage from '@/features/teamadmin/pages/TeamUserManagementPage'
import ConfigurationsPage from '@/features/configurations/pages/ConfigurationsPage'
export const getPageMap = (onNavigate: (tab: TabKey) => void): Record<TabKey, ReactNode> => ({
  dashboard: <DashboardPage />,
  cashflow: <CashflowPage />,
  portfolios: <PortfoliosPage />,
  programmes: <ProgrammesPage />,
  projects: <ProjectsPage />,
  pipeline: <PipelinePage />,
  resources: <ResourcesPage />,
  timesheets: <TeamMemberTimesheetPage />,
  budgets: <BudgetsPage />,
  gatereviews: <GateReviewsPage />,
  benefits: <BenefitsPage />,
  risks: <RisksPage />,
  issues: <IssuesPage />,
  changerequests: <ChangeRequestsPage />,
  tasks: <TasksPage />,
  fundingsources: <FundingSourcesPage />,
  workflows: <WorkflowsPage />,
  skills: <SkillsPage />,
  teamadmin: <TeamUserManagementPage />,
  holidays: <HolidaysPage />,
  statussnapshots: <StatusSnapshotsPage />,
  configurations: <ConfigurationsPage onNavigate={onNavigate} />,
})
