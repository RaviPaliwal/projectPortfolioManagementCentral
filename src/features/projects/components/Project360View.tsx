import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  LinearProgress,
  Tabs,
  Tab,
  Button,
  Skeleton,
  useTheme,
  Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
import RefreshIcon from '@mui/icons-material/Refresh'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'

import { StatusChip, StatusTag, TabPanel, Breadcrumbs, PageHeader, ActionIcon, EntityDocumentsTab, WorkflowMilestone } from '@/components/common'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel, BudgetLineModel, BenefitModel, ProjectTaskModel, GateReviewModel } from '@/types/dataverse'
import { RAG_COLORS, phaseLabel, currency } from '../constants'
import { fontSizes } from '@/styles'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'

import { ProjectOverviewTab } from './tabs/ProjectOverviewTab'
import { ProjectFinancialsTab } from './tabs/ProjectFinancialsTab'
import { ProjectScheduleTab } from './tabs/ProjectScheduleTab'
import { ProjectRisksIssuesTab } from './tabs/ProjectRisksIssuesTab'
import { ProjectTeamTab } from './tabs/ProjectTeamTab'
import { ProjectGovernanceTab } from './tabs/ProjectGovernanceTab'
import { ProjectBenefitsTab } from './tabs/ProjectBenefitsTab'
import { ProjectTasksTab } from './tabs/ProjectTasksTab'

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
  onBack: () => void
  onAddMilestone: () => void
  onLogRisk: () => void
  onLogIssue: () => void
  onAssignResource: () => void
  onEditResource?: (resource: any) => void
  onCompleteResource?: (resource: any) => void
  onAddBudgetLine: () => void
  onAddBenefit: () => void
  onAddTask: () => void
  onNavigateToGateReview?: (gateReview?: GateReviewModel) => void
  onDeleteProject?: (project: ProjectModel) => void
  onEditProject: (project: ProjectModel) => void
  canEdit?: boolean
  canDelete?: boolean
  onMarkTaskAsDone?: (taskId: string) => Promise<void>
  onEditMilestone?: (milestone: ProjectMilestoneModel) => void
  onEditTask?: (task: ProjectTaskModel) => void
  onUpdateTaskStatus?: (taskId: string, status: string, percent: number) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
  onDeleteMilestone?: (milestoneId: string) => Promise<void>
  onEditBudgetLine?: (budget: BudgetLineModel) => void
  onRefresh?: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
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
  onBack,
  onAddMilestone,
  onLogRisk,
  onLogIssue,
  onAssignResource,
  onEditResource,
  onCompleteResource,
  onAddBudgetLine,
  onAddBenefit,
  onAddTask,
  onNavigateToGateReview,
  onDeleteProject,
  onEditProject,
  canEdit = false,
  canDelete = false,
  onMarkTaskAsDone,
  onEditMilestone,
  onEditTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onDeleteMilestone,
  onEditBudgetLine,
  onRefresh,
  onSuccess,
  onError,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [activeTab, setActiveTab] = useState(0)
  const [activeRisk, setActiveRisk] = useState<RiskModel | null>(null)
  const [activeIssue, setActiveIssue] = useState<IssueModel | null>(null)
  const [activeBenefit, setActiveBenefit] = useState<BenefitModel | null>(null)
  const [activeBudgetLine, setActiveBudgetLine] = useState<BudgetLineModel | null>(null)
  const [activeGateReview, setActiveGateReview] = useState<GateReviewModel | null>(null)

  useEffect(() => {
    setActiveRisk(null)
    setActiveIssue(null)
    setActiveBenefit(null)
    setActiveBudgetLine(null)
    setActiveGateReview(null)
  }, [activeTab])

  const tabs = [
    { label: 'Overview', icon: <AnalyticsIcon fontSize="small" /> },
    { label: 'Schedule', icon: <FlagIcon fontSize="small" /> },
    { label: 'Financials', icon: <AccountBalanceWalletIcon fontSize="small" /> },
    { label: 'Risks & Issues', icon: <BugReportIcon fontSize="small" /> },
    { label: 'Team', icon: <PersonAddIcon fontSize="small" /> },
    { label: 'Benefits', icon: <EmojiEventsIcon fontSize="small" /> },
    { label: 'Governance', icon: <HowToRegIcon fontSize="small" /> },
    { label: 'Tasks', icon: <AssignmentIcon fontSize="small" /> },
    { label: 'Documents', icon: <InsertDriveFileIcon fontSize="small" /> },
  ]

  // RAG color for accent bar
  const ragVal = project.pm_ragstatus?.toString()
  const accentColor = ragVal === '2' ? 'error.main' : ragVal === '0' ? 'warning.main' : 'success.main'

  const isInspectingRiskOrIssue = activeTab === 3 && (activeRisk || activeIssue)
  const isInspectingBenefit = activeTab === 5 && activeBenefit
  const isInspectingBudget = activeTab === 2 && activeBudgetLine
  const isInspectingGateReview = activeTab === 6 && activeGateReview
  const breadcrumbItems = isInspectingRiskOrIssue
    ? [
        { label: 'Project Portfolio', path: 'list' },
        { label: project.pm_projectname ?? 'Detail', path: 'project-detail' },
        { label: 'Risks & Issues', path: 'risks-issues' },
        { label: activeRisk ? (activeRisk.pm_risktitle ?? 'Risk') : (activeIssue?.pm_issuetitle ?? 'Issue') }
      ]
    : isInspectingBenefit
    ? [
        { label: 'Project Portfolio', path: 'list' },
        { label: project.pm_projectname ?? 'Detail', path: 'project-detail' },
        { label: 'Benefits', path: 'benefits' },
        { label: activeBenefit?.pm_benefitname ?? 'Benefit' }
      ]
    : isInspectingBudget
    ? [
        { label: 'Project Portfolio', path: 'list' },
        { label: project.pm_projectname ?? 'Detail', path: 'project-detail' },
        { label: 'Financials', path: 'financials' },
        { label: activeBudgetLine?.pm_budgetlinename ?? 'Budget Line' }
      ]
    : isInspectingGateReview
    ? [
        { label: 'Project Portfolio', path: 'list' },
        { label: project.pm_projectname ?? 'Detail', path: 'project-detail' },
        { label: 'Governance', path: 'governance' },
        { label: activeGateReview.pm_gatename ?? 'Gate Review' }
      ]
    : [
        { label: 'Project Portfolio', path: 'list' },
        { label: project.pm_projectname ?? 'Detail' }
      ]

  const handleBreadcrumbNavigate = (path: string) => {
    if (path === 'list') {
      onBack()
    } else if (path === 'project-detail' || path === 'risks-issues' || path === 'benefits' || path === 'financials' || path === 'governance') {
      setActiveRisk(null)
      setActiveIssue(null)
      setActiveBenefit(null)
      setActiveBudgetLine(null)
      setActiveGateReview(null)
    }
  }

  return (
    <Box>
      <Breadcrumbs 
        items={breadcrumbItems} 
        onNavigate={handleBreadcrumbNavigate}
      />

      <PageHeader
        title={project.pm_projectname ?? 'Project Detail'}
        subtitle={project.pm_projectmanager ? `Manager: ${project.pm_projectmanagername}` : project.pm_projectcode ? `Code: ${project.pm_projectcode}` : undefined}
        actionElement={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {canEdit && (
              <ActionIcon
                icon={<EditIcon />}
                onClick={() => onEditProject(project)}
                label="Edit Project"
                color="primary"
              />
            )}
            {canDelete && (
              <ActionIcon
                icon={<DeleteIcon />}
                onClick={() => onDeleteProject?.(project)}
                label="Delete Project"
                color="error"
              />
            )}
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

      <Box sx={{ mb: 3 }}>
        <WorkflowMilestone
          moduleName={MODULE_NAMES.PROJECTS.value}
          entityId={project.pm_projectid}
        />
      </Box>

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
              {activeTab === 0 && (
                <ProjectOverviewTab 
                  project={project} 
                  milestones={milestones}
                  tasks={tasks}
                  risks={risks}
                  issues={issues}
                  benefits={benefits}
                />
              )}
              {activeTab === 1 && (
                <ProjectScheduleTab 
                  projectId={project.pm_projectid}
                  milestones={milestones} 
                  tasks={tasks} 
                  onEditMilestone={onEditMilestone} 
                  onEditTask={onEditTask}
                  onDeleteMilestone={onDeleteMilestone}
                  canEdit={canEdit}
                  onRefresh={onRefresh}
                  onSuccess={onSuccess}
                  onError={onError}
                  onAddMilestone={canEdit ? onAddMilestone : undefined}
                />
              )}
              {activeTab === 2 && (
                <ProjectFinancialsTab 
                  budgetLines={budgetLines} 
                  project={project}
                  onEditBudgetLine={onEditBudgetLine}
                  canEdit={canEdit}
                  onAddBudgetLine={canEdit ? onAddBudgetLine : undefined}
                  selectedBudgetLine={activeBudgetLine}
                  setSelectedBudgetLine={setActiveBudgetLine}
                />
              )}
              {activeTab === 3 && (
                <ProjectRisksIssuesTab 
                  risks={risks} 
                  issues={issues}
                  project={project}
                  onLogRisk={canEdit ? onLogRisk : undefined}
                  onLogIssue={canEdit ? onLogIssue : undefined}
                  selectedRisk={activeRisk}
                  setSelectedRisk={setActiveRisk}
                  selectedIssue={activeIssue}
                  setSelectedIssue={setActiveIssue}
                />
              )}
              {activeTab === 4 && (
                <ProjectTeamTab 
                  resources={resources} 
                  tasks={tasks} 
                  onEdit={onEditResource} 
                  onComplete={onCompleteResource} 
                  onEditTask={onEditTask}
                  onUpdateTaskStatus={onUpdateTaskStatus}
                  onAssignResource={canEdit ? onAssignResource : undefined}
                />
              )}
              {activeTab === 5 && (
                <ProjectBenefitsTab 
                  benefits={benefits} 
                  onAddBenefit={canEdit ? onAddBenefit : undefined}
                  selectedBenefit={activeBenefit}
                  setSelectedBenefit={setActiveBenefit}
                />
              )}
              {activeTab === 6 && (
                <ProjectGovernanceTab 
                  gateReviews={gateReviews} 
                  onNavigateToGateReview={(gr) => setActiveGateReview(gr || null)} 
                  onAddGateReview={canEdit ? onNavigateToGateReview : undefined}
                  selectedGateReview={activeGateReview}
                  setSelectedGateReview={setActiveGateReview}
                />
              )}
              {activeTab === 7 && (
                <ProjectTasksTab
                  project={project}
                  tasks={tasks}
                  onMarkTaskAsDone={onMarkTaskAsDone}
                  onEditTask={onEditTask}
                  onUpdateTaskStatus={onUpdateTaskStatus}
                  onDeleteTask={onDeleteTask}
                  onAddTask={canEdit ? onAddTask : undefined}
                />
              )}
              {activeTab === 8 && project.pm_projectid && (
                <EntityDocumentsTab
                  entityId={project.pm_projectid}
                  moduleName={MODULE_NAMES.PROJECTS.value}
                  canEdit={canEdit}
                />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
