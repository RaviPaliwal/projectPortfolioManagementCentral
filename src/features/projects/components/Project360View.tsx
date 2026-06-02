import React, { useState } from 'react'
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

import { StatusChip, StatusTag } from '@/components/common'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel, BudgetLineModel, BenefitModel, ProjectTaskModel, GateReviewModel } from '@/types/dataverse'
import { RAG_COLORS, phaseLabel, currency } from '../constants'
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
  onBack: () => void
  onAddMilestone: () => void
  onLogRisk: () => void
  onLogIssue: () => void
  onAssignResource: () => void
  onAddBudgetLine: () => void
  onAddBenefit: () => void
  onAddTask: () => void
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
  onAddBudgetLine,
  onAddBenefit,
  onAddTask
}) => {
  const theme = useTheme()
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

  return (
    <Box sx={{ mb: 3 }}>
      {/* Back button + header */}
      <Paper sx={{ mb: 2.5, borderRadius: 1.15, overflow: 'hidden' }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <IconButton onClick={onBack} size="small" sx={{ mt: 0.5, borderRadius: 1.15 }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{project.pm_projectname}</Typography>
                <StatusChip status={project.pm_ragstatus} type="rag" />
                <StatusTag label={phaseLabel(project.pm_projectphase)} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {project.pm_projectcode}
                {project.pm_projectmanager ? ` · Manager: ${project.pm_projectmanager}` : ''}
                {project.pm_projectsponsor ? ` · Sponsor: ${project.pm_projectsponsor}` : ''}
                {project.pm_businessunit ? ` · ${project.pm_businessunit}` : ''}
                {project.pm_portfolioname ? ` · Portfolio: ${project.pm_portfolioname}` : ''}
                {project.pm_programmename ? ` · Programme: ${project.pm_programmename}` : ''}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Quick Info Cards ──────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2.5 }}>
        <Paper sx={{ p: 2, borderRadius: 1.15, borderLeft: '3px solid #3b82f6' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Budget</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{currency(project.pm_approvedbudgeteur)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 1.15, borderLeft: '3px solid #f59e0b' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actual Spend</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{currency(project.pm_actualcosteur)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 1.15, borderLeft: '3px solid #22c55e' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>% Complete</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{project.pm_percentcomplete ?? 0}%</Typography>
          <LinearProgress
            variant="determinate"
            value={project.pm_percentcomplete ?? 0}
            sx={{ mt: 0.5, height: 4, borderRadius: 1.15, bgcolor: theme.palette.action.hover }}
          />
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 1.15, borderLeft: `3px solid ${RAG_COLORS[String(project.pm_ragstatus)] ?? '#6b7280'}` }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Schedule</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {project.pm_plannedenddate
              ? new Date(project.pm_plannedenddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </Typography>
        </Paper>
      </Box>

      {/* ── Action Buttons Bar ────────────────────────────────── */}
      <Paper sx={{ px: 2.5, py: 1.5, mb: 2.5, borderRadius: 1.15, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions:</Typography>
        <Button size="small" variant="outlined" startIcon={<FlagIcon />} onClick={onAddMilestone}>Milestone</Button>
        <Button size="small" variant="outlined" color="error" startIcon={<ErrorIcon />} onClick={onLogRisk}>Risk</Button>
        <Button size="small" variant="outlined" color="warning" startIcon={<WarningAmberIcon />} onClick={onLogIssue}>Issue</Button>
        <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={onAssignResource}>Resource</Button>
        <Button size="small" variant="outlined" startIcon={<AttachMoneyIcon />} onClick={onAddBudgetLine}>Budget</Button>
        <Button size="small" variant="outlined" startIcon={<EmojiEventsIcon />} onClick={onAddBenefit}>Benefit</Button>
        <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={onAddTask}>Task</Button>
      </Paper>

      {/* ── Tabbed Content ────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 1.15, overflow: 'hidden' }}>
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
              {activeTab === 0 && <ProjectOverviewTab project={project} />}
              {activeTab === 1 && <ProjectScheduleTab milestones={milestones} tasks={tasks} />}
              {activeTab === 2 && <ProjectFinancialsTab budgetLines={budgetLines} />}
              {activeTab === 3 && <ProjectRisksIssuesTab risks={risks} issues={issues} />}
              {activeTab === 4 && <ProjectTeamTab resources={resources} />}
              {activeTab === 5 && <ProjectBenefitsTab benefits={benefits} />}
              {activeTab === 6 && <ProjectGovernanceTab gateReviews={gateReviews} />}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
