import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Skeleton,
  useTheme,
} from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import BugReportIcon from '@mui/icons-material/BugReport'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ErrorIcon from '@mui/icons-material/Error'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import EditIcon from '@mui/icons-material/Edit'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import EditNoteIcon from '@mui/icons-material/EditNote'
import PeopleIcon from '@mui/icons-material/People'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import FlagCircleIcon from '@mui/icons-material/FlagCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import CelebrationIcon from '@mui/icons-material/Celebration'
import { StatusChip, StatusTag, Breadcrumbs, PageHeader, ActionIcon } from '@/components/common'
import { ProjectLifecycleStepper } from './ProjectLifecycleStepper'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel, BudgetLineModel, BenefitModel, ProjectTaskModel, GateReviewModel, AgentInsightModel } from '@/types/dataverse'
import { phaseLabel } from '../constants'
import { fontSizes } from '@/styles'

import { ProjectOverviewTab } from './tabs/ProjectOverviewTab'
import { ProjectFinancialsTab } from './tabs/ProjectFinancialsTab'
import { ProjectScheduleTab } from './tabs/ProjectScheduleTab'
import { ProjectRisksIssuesTab } from './tabs/ProjectRisksIssuesTab'
import { ProjectTeamTab } from './tabs/ProjectTeamTab'
import { ProjectGovernanceTab } from './tabs/ProjectGovernanceTab'
import { ProjectBenefitsTab } from './tabs/ProjectBenefitsTab'

interface Project360ViewProps {
  project: ProjectModel
  loading: boolean
  milestones: ProjectMilestoneModel[]
  risks: RiskModel[]
  issues: IssueModel[]
  resources: any[]
  budgetLines: BudgetLineModel[]
  benefits: BenefitModel[]
  tasks: ProjectTaskModel[]
  gateReviews: GateReviewModel[]
  insights?: AgentInsightModel[]
  onBack: () => void
  onAddMilestone: () => void
  onLogRisk: () => void
  onLogIssue: () => void
  onAssignResource: () => void
  onAddBudgetLine: () => void
  onAddBenefit: () => void
  onAddTask: () => void
  onSubmitGateReview: () => void
  onEditProject: (project: ProjectModel) => void
}

export const Project360View: React.FC<Project360ViewProps> = ({
  project,
  loading,
  milestones,
  risks,
  issues,
  resources,
  budgetLines,
  benefits,
  tasks,
  gateReviews,
  insights = [],
  onBack,
  onAddMilestone,
  onLogRisk,
  onLogIssue,
  onAssignResource,
  onAddBudgetLine,
  onAddBenefit,
  onAddTask,
  onSubmitGateReview,
  onEditProject
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    { label: 'Overview', icon: <AnalyticsIcon fontSize="small" /> },
    { label: 'Schedule', icon: <FlagIcon fontSize="small" /> },
    { label: 'Financials', icon: <AccountBalanceWalletIcon fontSize="small" /> },
    { label: 'Risks & Issues', icon: <BugReportIcon fontSize="small" /> },
    { label: 'Team', icon: <PersonAddIcon fontSize="small" /> },
    { label: 'Benefits', icon: <EmojiEventsIcon fontSize="small" /> },
    { label: 'Governance', icon: <HowToRegIcon fontSize="small" /> },
  ]

  // RAG color for accent bar
  const ragVal = project.pm_ragstatus?.toString()
  const accentColor = ragVal === '2' ? 'error.main' : ragVal === '0' ? 'warning.main' : 'success.main'

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: 'Project Portfolio', path: 'list' },
          { label: project.pm_projectname ?? 'Detail' }
        ]}
        onNavigate={() => onBack()}
      />

      <PageHeader
        title={project.pm_projectname ?? 'Project Detail'}
        subtitle={project.pm_projectmanager ? `Manager: ${project.pm_projectmanagername}` : project.pm_projectcode ? `Code: ${project.pm_projectcode}` : undefined}
        actionElement={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <ActionIcon
              icon={<EditIcon />}
              onClick={() => onEditProject(project)}
              label="Edit Project"
              color="primary"
            />
            <StatusChip status={project.pm_ragstatus} type="rag" size="small" />
            <StatusTag label={phaseLabel(project.pm_projectphase)} size="small" variant="outlined" />
            {project.pm_projectcode && (
              <StatusTag
                label={project.pm_projectcode}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}
              />
            )}
          </Box>
        }
      />



      {/* ── Project Lifecycle Stepper (above tabs) ─────────── */}
      {(() => {
        const phases = (() => {
          const anyGateCompleted = gateReviews.some((g: GateReviewModel) => String(g.pm_reviewstatus) === '0')
          const completedMilestoneCount = milestones.filter(
            (m: ProjectMilestoneModel) => m.pm_status === '0' || m.pm_status === 0 || m.pm_ragstatus === '1'
          ).length

          return [
            {
              key: 'initiation', code: '3', label: 'Initiation', icon: <LightbulbIcon />,
              description: 'Define scope, stakeholders, and business case',
              substeps: [
                { label: 'Business case defined', icon: <EditNoteIcon fontSize="small" />, isDone: true, detail: 'Project created in system' },
                { label: 'Stakeholders identified', icon: <PeopleIcon fontSize="small" />, isDone: Boolean(project.pm_projectsponsor), detail: project.pm_projectsponsor ? `Sponsor: ${project.pm_projectsponsor}` : undefined },
                { label: 'Project charter created', icon: <EditNoteIcon fontSize="small" />, isDone: Boolean(project.pm_projectcode), detail: project.pm_projectcode ? `Code: ${project.pm_projectcode}` : undefined },
                { label: 'Kickoff completed', icon: <RocketLaunchIcon fontSize="small" />, isDone: Boolean(project.pm_plannedstartdate), detail: project.pm_plannedstartdate ? `Planned: ${new Date(project.pm_plannedstartdate).toLocaleDateString()}` : undefined },
              ],
            },
            {
              key: 'planning', code: '1', label: 'Planning', icon: <BuildCircleIcon />,
              description: 'Detailed planning, budgeting, and risk assessment',
              substeps: [
                { label: 'Requirements gathered', icon: <EditNoteIcon fontSize="small" />, isDone: tasks.length > 0, detail: tasks.length > 0 ? `${tasks.length} tasks defined` : undefined },
                { label: 'Resource planning', icon: <PeopleIcon fontSize="small" />, isDone: false },
                { label: 'Timeline & schedule', icon: <ScheduleIcon fontSize="small" />, isDone: Boolean(project.pm_plannedstartdate && project.pm_plannedenddate), detail: project.pm_plannedenddate ? `Target: ${new Date(project.pm_plannedenddate).toLocaleDateString()}` : undefined },
                { label: 'Budget approved', icon: <AccountBalanceWalletIcon fontSize="small" />, isDone: (project.pm_approvedbudgeteur ?? 0) > 0, detail: (project.pm_approvedbudgeteur ?? 0) > 0 ? `Budget: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.pm_approvedbudgeteur ?? 0)}` : undefined },
                { label: 'Risk assessment', icon: <BugReportIcon fontSize="small" />, isDone: false },
                { label: 'Milestones defined', icon: <FlagIcon fontSize="small" />, isDone: milestones.length > 0, detail: milestones.length > 0 ? `${milestones.length} milestones` : undefined },
              ],
            },
            {
              key: 'execution', code: '0', label: 'Execution', icon: <FlagCircleIcon />,
              description: 'Active delivery, monitoring, and governance',
              substeps: [
                { label: 'Development / Implementation', icon: <BuildCircleIcon fontSize="small" />, isDone: (project.pm_percentcomplete ?? 0) > 0, detail: project.pm_percentcomplete ? `${project.pm_percentcomplete}% complete` : undefined },
                { label: 'Testing & QA', icon: <CheckCircleOutlineIcon fontSize="small" />, isDone: false },
                { label: 'Status reporting', icon: <EditNoteIcon fontSize="small" />, isDone: anyGateCompleted, detail: anyGateCompleted ? 'Gate reviews completed' : undefined },
                { label: 'Milestones achieved', icon: <FlagIcon fontSize="small" />, isDone: completedMilestoneCount > 0, detail: completedMilestoneCount > 0 ? `${completedMilestoneCount} completed` : undefined },
                { label: 'Risk mitigation', icon: <BugReportIcon fontSize="small" />, isDone: false },
              ],
            },
            {
              key: 'closure', code: '2', label: 'Closure', icon: <CelebrationIcon />,
              description: 'Project handover, lessons learned, and closure',
              substeps: [
                { label: 'Final delivery', icon: <RocketLaunchIcon fontSize="small" />, isDone: (project.pm_percentcomplete ?? 0) >= 100, detail: (project.pm_percentcomplete ?? 0) >= 100 ? '100% complete' : undefined },
                { label: 'Lessons learned', icon: <EditNoteIcon fontSize="small" />, isDone: false },
                { label: 'Project handover', icon: <PeopleIcon fontSize="small" />, isDone: false },
                { label: 'Financial closure', icon: <AccountBalanceWalletIcon fontSize="small" />, isDone: false },
                { label: 'Benefits realization', icon: <EmojiEventsIcon fontSize="small" />, isDone: false },
              ],
            },
          ]
        })()
        return (
          <Box sx={{ mb: 2.5 }}>
            <ProjectLifecycleStepper
              phases={phases}
              currentPhaseCode={String(project.pm_projectphase ?? '')}
            />
          </Box>
        )
      })()}

      {/* ── Tabbed Content ────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2, pt: 1,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48, borderRadius: '8px 8px 0 0', fontSize: fontSizes.smMd },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={80} />)}
            </Box>
          ) : (
            <>
              {activeTab === 0 && <ProjectOverviewTab project={project} milestones={milestones} tasks={tasks} risks={risks} issues={issues} budgetLines={budgetLines} gateReviews={gateReviews} benefits={benefits} resources={resources} insights={insights} />}
              {activeTab === 1 && <ProjectScheduleTab milestones={milestones} tasks={tasks} onAddMilestone={onAddMilestone} onAddTask={onAddTask} />}
              {activeTab === 2 && <ProjectFinancialsTab budgetLines={budgetLines} onAddBudgetLine={onAddBudgetLine} />}
              {activeTab === 3 && <ProjectRisksIssuesTab risks={risks} issues={issues} onLogRisk={onLogRisk} onLogIssue={onLogIssue} />}
              {activeTab === 4 && <ProjectTeamTab resources={resources} onAssignResource={onAssignResource} />}
              {activeTab === 5 && <ProjectBenefitsTab benefits={benefits} onAddBenefit={onAddBenefit} />}
              {activeTab === 6 && <ProjectGovernanceTab gateReviews={gateReviews} onSubmitReview={onSubmitGateReview} />}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
