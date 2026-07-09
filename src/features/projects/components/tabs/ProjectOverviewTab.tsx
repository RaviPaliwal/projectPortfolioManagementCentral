import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  LinearProgress,
  useTheme,
  Tooltip,
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TimerIcon from '@mui/icons-material/Timer'
import SpeedIcon from '@mui/icons-material/Speed'
import FlagIcon from '@mui/icons-material/Flag'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import BugReportIcon from '@mui/icons-material/BugReport'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import ShieldAlertIcon from '@mui/icons-material/Security'

import type { ProjectModel, ProjectMilestoneModel, ProjectTaskModel, RiskModel, IssueModel, BenefitModel } from '@/types/dataverse'
import { phaseLabel, currency } from '../../constants'
import { StatusChip, MetricTile, StatusTag, WorkflowMilestone, KpiCardRow } from '@/components/common'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { fontSizes } from '@/styles'

interface ProjectOverviewTabProps {
  project: ProjectModel
  milestones?: ProjectMilestoneModel[]
  tasks?: ProjectTaskModel[]
  risks?: RiskModel[]
  issues?: IssueModel[]
  benefits?: BenefitModel[]
}

const getRagDetails = (ragVal?: string | number | null) => {
  const statusStr = ragVal?.toString() ?? ''
  switch (statusStr) {
    case '1':
      return { label: 'Low', color: 'success.main', bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)' }
    case '0':
      return { label: 'Medium', color: 'warning.main', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)' }
    case '2':
      return { label: 'High', color: 'error.main', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)' }
    default:
      return { label: 'Not Set', color: 'text.disabled', bg: 'action.hover', border: 'divider' }
  }
}

const getBenefitsRagDetails = (ragVal?: string | number | null) => {
  const statusStr = ragVal?.toString() ?? ''
  switch (statusStr) {
    case '0':
      return { label: 'Low', color: 'success.main', bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.3)' }
    case '1':
      return { label: 'Medium', color: 'warning.main', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)' }
    default:
      return { label: 'Not Set', color: 'text.disabled', bg: 'action.hover', border: 'divider' }
  }
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ 
  project,
  milestones = [],
  tasks = [],
  risks = [],
  issues = [],
  benefits = [],
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Milestones Stats
  const milestoneStats = useMemo(() => {
    const total = milestones.length
    const completed = milestones.filter(m => String(m.pm_status) === '2').length
    const pending = total - completed
    const upcoming = milestones
      .filter(m => String(m.pm_status) !== '2' && m.pm_planneddate)
      .sort((a, b) => new Date(a.pm_planneddate!).getTime() - new Date(b.pm_planneddate!).getTime())
    
    return {
      total,
      completed,
      pending,
      next: upcoming[0] || null
    }
  }, [milestones])

  // Tasks Stats
  const taskStats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => String(t.pm_taskstatus) === '0').length
    const pending = total - completed
    const avgProgress = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.pm_percentcomplete ?? 0), 0) / total) : 0
    return { total, completed, pending, avgProgress }
  }, [tasks])

  // Risks & Issues Stats
  const riskStats = useMemo(() => {
    const activeRisks = risks.filter(r => r.statecode === 0).length
    const criticalRisks = risks.filter(r => r.statecode === 0 && String(r.pm_ragstatus) === '2').length
    const openIssues = issues.filter(i => i.statecode === 0).length
    const criticalIssues = issues.filter(i => i.statecode === 0 && String(i.pm_prioritylevel) === '2').length
    return { activeRisks, criticalRisks, openIssues, criticalIssues }
  }, [risks, issues])

  // Financial Stats
  const budget = project.pm_approvedbudget ?? 0
  const actual = project.pm_actualcost ?? 0
  const variance = budget - actual
  const percentSpent = budget > 0 ? Math.round((actual / budget) * 100) : 0

  const overallRag = getRagDetails(project.pm_ragstatus)
  const costRag = getRagDetails(project.pm_costragstatus)
  const scheduleRag = getRagDetails(project.pm_scheduleragstatus)
  const benefitsRag = getBenefitsRagDetails(project.pm_benefitsragstatus)

  const kpiItems = useMemo(() => [
    {
      label: 'Total Progress',
      value: `${taskStats.avgProgress}%`,
      subtitle: 'Average task completion',
      icon: <SpeedIcon />,
      color: taskStats.avgProgress >= 100 ? 'success.main' : 'primary.main',
    },
    {
      label: 'Budget Burn Rate',
      value: `${percentSpent}%`,
      subtitle: 'Proportion of budget spent',
      icon: <TrendingUpIcon />,
      color: percentSpent > 100 ? 'error.main' : percentSpent > 85 ? 'warning.main' : 'success.main',
    },
    {
      label: 'Active Risks & Issues',
      value: riskStats.activeRisks + riskStats.openIssues,
      subtitle: `${riskStats.criticalRisks + riskStats.criticalIssues} critical items`,
      icon: <BugReportIcon />,
      color: riskStats.criticalIssues + riskStats.criticalRisks > 0 ? 'error.main' : 'warning.main',
    },
    {
      label: 'Milestones Achieved',
      value: `${milestoneStats.completed}/${milestoneStats.total}`,
      subtitle: `${milestoneStats.pending} pending milestone${milestoneStats.pending !== 1 ? 's' : ''}`,
      icon: <FlagIcon />,
      color: 'secondary.main',
    }
  ], [taskStats.avgProgress, percentSpent, riskStats.activeRisks, riskStats.openIssues, riskStats.criticalRisks, riskStats.criticalIssues, milestoneStats.completed, milestoneStats.total, milestoneStats.pending])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* ── KPI Row ── */}
      <Box sx={{ mb: -2.5 }}>
        <KpiCardRow items={kpiItems} />
      </Box>
 
      {/* ── Main Layout Grid ── */}
      <Grid container spacing={3}>
        {/* Left Column — Project Info, Business Summary */}
        <Grid size={{ xs: 12, md: 7.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Executive Summary */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.03 }}>
                <DescriptionIcon sx={{ fontSize: 160 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LightbulbIcon sx={{ color: 'warning.main' }} /> Executive Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3, fontSize: '0.92rem' }}>
                <strong>{project.pm_projectname}</strong> is currently in the **{phaseLabel(project.pm_projectphase)}** stage. This project is structured to achieve strategic corporate goals, delivering direct value for the **{project.pm_businessunit || 'General'}** division. Under active tracking of delivery timelines and resource allocations, current progress is logged at **{taskStats.avgProgress}%**.
              </Typography>
              
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>Target Timeline</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TimerIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {project.pm_plannedstartdate ? new Date(project.pm_plannedstartdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Projected Start</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>Delivery Goal</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FlagIcon sx={{ color: 'success.main', fontSize: 22 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {project.pm_plannedenddate ? new Date(project.pm_plannedenddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Target Completion</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Financial Burn Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                <AttachMoneyIcon color="primary" /> Financial Burn & Budget Status
              </Typography>
              
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'baseline' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Total Budget Consumed</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: percentSpent > 100 ? 'error.main' : 'primary.main' }}>
                    {percentSpent}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, percentSpent)} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 3, 
                    bgcolor: isDark ? 'grey.800' : 'grey.100',
                    '& .MuiLinearProgress-bar': { 
                      borderRadius: 3, 
                      bgcolor: percentSpent > 100 ? 'error.main' : percentSpent > 85 ? 'warning.main' : 'success.main' 
                    } 
                  }} 
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Approved Budget</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{currency(budget)}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Actual Spend</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'info.main' }}>{currency(actual)}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Variance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: variance >= 0 ? 'success.main' : 'error.main' }}>
                      {currency(variance)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>

            {/* Delivery & Milestones Progress */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                <AssignmentTurnedInIcon color="success" /> Delivery Progress & Milestones
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>Tasks Summary</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Total tasks</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{taskStats.total}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Completed tasks</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>{taskStats.completed}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Pending tasks</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{taskStats.pending}</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>Next Critical Milestone</Typography>
                  {milestoneStats.next ? (
                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <FlagIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {milestoneStats.next.pm_milestonename}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Target: {milestoneStats.next.pm_planneddate ? new Date(milestoneStats.next.pm_planneddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <StatusChip status={milestoneStats.next.pm_ragstatus} type="rag" size="small" />
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', pt: 1 }}>
                      No upcoming milestones scheduled.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>

          </Box>
        </Grid>

        {/* Right Column — Governance Indicators, Ownership Metadata */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Strategic RAG Risk Check */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                Risk Check Indicators
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                {/* Overall */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1.5, bgcolor: overallRag.bg, border: '1px solid', borderColor: overallRag.border }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Overall RAG</Typography>
                    <Typography variant="caption" color="text.secondary">Combined project status</Typography>
                  </Box>
                  <StatusTag label={overallRag.label} color={project.pm_ragstatus === 1 ? 'success' : project.pm_ragstatus === 0 ? 'warning' : project.pm_ragstatus === 2 ? 'error' : 'default'} size="small" />
                </Box>

                {/* Schedule */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1.5, bgcolor: scheduleRag.bg, border: '1px solid', borderColor: scheduleRag.border }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Schedule Risk</Typography>
                    <Typography variant="caption" color="text.secondary">Timeline & milestone alignment</Typography>
                  </Box>
                  <StatusTag label={scheduleRag.label} color={project.pm_scheduleragstatus === 1 ? 'success' : project.pm_scheduleragstatus === 0 ? 'warning' : project.pm_scheduleragstatus === 2 ? 'error' : 'default'} size="small" />
                </Box>

                {/* Cost */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1.5, bgcolor: costRag.bg, border: '1px solid', borderColor: costRag.border }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Cost Risk</Typography>
                    <Typography variant="caption" color="text.secondary">Actual spend vs budget</Typography>
                  </Box>
                  <StatusTag label={costRag.label} color={project.pm_costragstatus === 1 ? 'success' : project.pm_costragstatus === 0 ? 'warning' : project.pm_costragstatus === 2 ? 'error' : 'default'} size="small" />
                </Box>

                {/* Benefits */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1.5, bgcolor: benefitsRag.bg, border: '1px solid', borderColor: benefitsRag.border }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Benefits Risk</Typography>
                    <Typography variant="caption" color="text.secondary">Strategic value delivery</Typography>
                  </Box>
                  <StatusTag label={benefitsRag.label} color={project.pm_benefitsragstatus === 0 ? 'success' : project.pm_benefitsragstatus === 1 ? 'warning' : 'default'} size="small" />
                </Box>

              </Box>
            </Paper>

            {/* Risk & Issue Density Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                <ShieldAlertIcon color="error" /> Risk & Issue density
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderLeft: '3px solid', borderLeftColor: riskStats.criticalRisks > 0 ? 'error.main' : 'warning.main' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{riskStats.activeRisks}</Typography>
                    <Typography variant="caption" color="text.secondary">Active Risks</Typography>
                    {riskStats.criticalRisks > 0 && (
                      <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                        {riskStats.criticalRisks} High RAG
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderLeft: '3px solid', borderLeftColor: riskStats.criticalIssues > 0 ? 'error.main' : 'info.main' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{riskStats.openIssues}</Typography>
                    <Typography variant="caption" color="text.secondary">Open Issues</Typography>
                    {riskStats.criticalIssues > 0 && (
                      <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                        {riskStats.criticalIssues} Critical
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Paper>

            {/* Ownership & Metadata */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 0.5, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                Governance & Metadata
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Phase</Typography>
                <StatusChip status={project.pm_projectphase} type="phase" size="medium" />
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Project Manager</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.825rem' }}>{project.pm_projectmanagername || 'Unassigned'}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Business Sponsor</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.825rem' }}>{project.pm_projectsponsor || '—'}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Portfolio</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.825rem' }}>{project.pm_portfolioname || '—'}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Programme</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.825rem' }}>{project.pm_programmename || '—'}</Typography>
              </Paper>
            </Box>

          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
