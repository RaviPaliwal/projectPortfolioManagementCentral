import type { ReactNode } from 'react'
import type { TabKey } from '@/components/layout/PrimaryShell'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import PortfoliosPage from '@/features/portfolios/pages/PortfoliosPage'
import ProgrammesPage from '@/features/programmes/pages/ProgrammesPage'
import ProjectsPage from '@/features/projects/pages/ProjectsPage'
import PipelinePage from '@/features/pipeline/pages/PipelinePage'
import ResourcesPage from '@/features/resources/pages/ResourcesPage'
import TimesheetsPage from '@/features/timesheets/pages/TimesheetsPage'
import BudgetsPage from '@/features/budgets/pages/BudgetsPage'
import GateReviewsPage from '@/features/gatereviews/pages/GateReviewsPage'
import BenefitsPage from '@/features/benefits/pages/BenefitsPage'
import SchedulePage from '@/features/schedule/pages/SchedulePage'
import RisksPage from '@/features/risks/pages/RisksPage'
import IssuesPage from '@/features/issues/pages/IssuesPage'
import DebugDataPage from '@/features/debugdata/pages/DebugDataPage'
import ChangeRequestsPage from '@/features/changerequests/pages/ChangeRequestsPage'
import CashflowPage from '@/features/cashflow/pages/CashflowPage'
import ApprovalRequestsPage from '@/features/approvalrequests/pages/ApprovalRequestsPage'
import FundingSourcesPage from '@/features/fundingsources/pages/FundingSourcesPage'
import SkillsPage from '@/features/skills/pages/SkillsPage'
import WorkflowsPage from '@/features/workflows/pages/WorkflowsPage'
import HolidaysPage from '@/features/holidays/pages/HolidaysPage'
import StatusSnapshotsPage from '@/features/statussnapshots/pages/StatusSnapshotsPage'
import TeamUserManagementPage from '@/features/teamadmin/pages/TeamUserManagementPage'

export const pageMap: Record<TabKey, ReactNode> = {
  dashboard: <DashboardPage />,
  cashflow: <CashflowPage />,
  portfolios: <PortfoliosPage />,
  programmes: <ProgrammesPage />,
  projects: <ProjectsPage />,
  pipeline: <PipelinePage />,
  resources: <ResourcesPage />,
  timesheets: <TimesheetsPage />,
  budgets: <BudgetsPage />,
  gatereviews: <GateReviewsPage />,
  benefits: <BenefitsPage />,
  schedule: <SchedulePage />,
  risks: <RisksPage />,
  issues: <IssuesPage />,
  debug: <DebugDataPage />,
  changerequests: <ChangeRequestsPage />,
  approvalrequests: <ApprovalRequestsPage />,
  fundingsources: <FundingSourcesPage />,
  workflows: <WorkflowsPage />,
  skills: <SkillsPage />,
  teamadmin: <TeamUserManagementPage />,
  holidays: <HolidaysPage />,
  statussnapshots: <StatusSnapshotsPage />,
}
