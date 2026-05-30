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

export const pageMap: Record<TabKey, ReactNode> = {
  dashboard: <DashboardPage />,
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
}
