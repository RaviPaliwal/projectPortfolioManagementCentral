import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Chip,
  useTheme,
} from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import GroupIcon from '@mui/icons-material/Group'
import ErrorIcon from '@mui/icons-material/Error'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { navigateToGateReview } from '@/utils/navigation'

import type { ProjectModel, ProjectMilestoneModel, ProjectTaskModel, RiskModel, IssueModel, BudgetLineModel, GateReviewModel, BenefitModel, AgentInsightModel } from '@/types/dataverse'
import { StatusChip, StatusTag } from '@/components/common'
import { currency } from '../../constants'
import { fontSizes } from '@/styles'

interface ProjectOverviewTabProps {
  project: ProjectModel
  milestones?: ProjectMilestoneModel[]
  tasks?: ProjectTaskModel[]
  risks?: RiskModel[]
  issues?: IssueModel[]
  budgetLines?: BudgetLineModel[]
  gateReviews?: GateReviewModel[]
  benefits?: BenefitModel[]
  resources?: any[]
  insights?: AgentInsightModel[]
}

// ─── Gate Labels ───────────────────────────────────────────────────
const GATE_STAGE_LABELS: Record<string, string> = {
  '0': 'Gate 1', '1': 'Gate 2', '2': 'Gate 3', '3': 'Gate 4',
}
const OUTCOME_LABELS: Record<string, string> = {
  '0': 'Approved', '1': 'Conditional', '2': 'Not Yet Reviewed', '3': 'In Progress', '4': 'Rejected',
}
const OUTCOME_COLORS: Record<string, 'success' | 'warning' | 'default' | 'info' | 'error'> = {
  '0': 'success', '1': 'warning', '2': 'default', '3': 'info', '4': 'error',
}

// ─── Milestone Timeline Item ───────────────────────────────────────
const MilestoneItem: React.FC<{ milestone: ProjectMilestoneModel }> = ({ milestone }) => {
  const isOverdue = milestone.pm_planneddate && new Date(milestone.pm_planneddate) < new Date() && milestone.pm_status !== '0'
  const isCompleted = milestone.pm_status === '0' || milestone.pm_ragstatus === '1'

  return (
    <Box sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
        <Box
          sx={{
            width: 14, height: 14, borderRadius: '50%',
            bgcolor: isCompleted ? 'success.main' : isOverdue ? 'error.main' : 'primary.main',
            border: '2px solid',
            borderColor: isCompleted ? 'success.light' : isOverdue ? 'error.light' : 'primary.light',
            boxSizing: 'border-box',
            flexShrink: 0,
            zIndex: 1,
          }}
        />
      </Box>
      <Box sx={{ flex: 1, pb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{milestone.pm_milestonename}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            {milestone.pm_planneddate ? new Date(milestone.pm_planneddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
          </Typography>
          {milestone.pm_ragstatus && <StatusChip status={milestone.pm_ragstatus} type="rag" size="small" />}
          {milestone.pm_actualdate && (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ✓ {new Date(milestone.pm_actualdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Typography>
          )}
          {isOverdue && <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>OVERDUE</Typography>}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────
export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({
  project,
  milestones = [],
  tasks = [],
  risks = [],
  issues = [],
  budgetLines = [],
  gateReviews = [],
  benefits = [],
  resources = [],
  insights = [],
}) => {
  const theme = useTheme()

  // ── Compute Metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
    const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)
    const completedTasks = tasks.filter(t => (t.pm_percentcomplete ?? 0) >= 100).length
    const inProgressTasks = tasks.filter(t => (t.pm_percentcomplete ?? 0) > 0 && (t.pm_percentcomplete ?? 0) < 100).length
    const escalatedRisks = risks.filter(r => r.pm_ragstatus === '2' || r.pm_ragstatus === 2).length
    const openRisks = risks.filter(r => r.pm_ragstatus !== '1').length
    const openIssues = issues.filter((i: any) => i.pm_issuestatus !== '1' && i.pm_issuestatus !== 1).length
    const highPriorityIssues = issues.filter((i: any) => i.pm_prioritylevel === '1' || i.pm_prioritylevel === 1).length
    const overdueMilestones = milestones.filter(m => m.pm_planneddate && new Date(m.pm_planneddate) < new Date() && m.pm_status !== '0' && m.pm_status !== 0).length
    const pendingGates = gateReviews.filter(g => String(g.pm_reviewstatus) === '1').length
    const completedMilestones = milestones.filter(m => m.pm_status === '0' || m.pm_status === 0 || m.pm_ragstatus === '1').length
    const achievedBenefits = benefits.filter(b => String(b.pm_benefitstatus) === '2' || b.pm_benefitstatus === 2).length
    const totalAllocatedHours = resources.reduce((s: number, r: any) => s + (r.pm_allocatedhours ?? 0), 0)
    const overallProgress = tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / tasks.length)
      : (project.pm_percentcomplete ?? 0)

    return {
      totalBudget, totalSpent, completedTasks, inProgressTasks,
      escalatedRisks, openRisks, openIssues, highPriorityIssues,
      overdueMilestones, pendingGates, completedMilestones,
      achievedBenefits, totalAllocatedHours, overallProgress,
    }
  }, [project, milestones, tasks, risks, issues, budgetLines, gateReviews, benefits, resources])

  // ── Upcoming milestones ──────────────────────────────────────────
  const upcomingMilestones = useMemo(() => {
    return [...milestones]
      .filter(m => m.pm_status !== '0' && m.pm_status !== 0 && m.pm_ragstatus !== '1')
      .sort((a, b) => {
        const dateA = a.pm_planneddate ? new Date(a.pm_planneddate).getTime() : 0
        const dateB = b.pm_planneddate ? new Date(b.pm_planneddate).getTime() : 0
        return dateA - dateB
      })
      .slice(0, 4)
  }, [milestones])

  // ── Recent gate reviews ──────────────────────────────────────────
  const recentGates = useMemo(() => {
    return [...gateReviews].sort((a, b) => {
      const dateA = a.pm_actualreviewdate ? new Date(a.pm_actualreviewdate).getTime() : a.pm_plannedreviewdate ? new Date(a.pm_plannedreviewdate).getTime() : 0
      const dateB = b.pm_actualreviewdate ? new Date(b.pm_actualreviewdate).getTime() : b.pm_plannedreviewdate ? new Date(b.pm_plannedreviewdate).getTime() : 0
      return dateB - dateA
    }).slice(0, 3)
  }, [gateReviews])

  const budgetUtilPct = metrics.totalBudget > 0 ? Math.round((metrics.totalSpent / metrics.totalBudget) * 100) : 0
  // ── Agent Insights ────────────────────────────────────────────
  const alertInsights = insights.filter(i => String(i.pm_insighttype) === '125570000')
  const suggestionInsights = insights.filter(i => String(i.pm_insighttype) === '125570001')
  const unreviewedInsights = insights.filter(i => String(i.pm_actionstatus) === '125570000')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
      {/* ━━ Row 1: Quick Identity Cards ━━ */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>RAG</Typography>
            <Box sx={{ mt: 0.5 }}><StatusChip status={project.pm_ragstatus} type="rag" size="medium" /></Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>Phase</Typography>
            <Box sx={{ mt: 0.5 }}><StatusTag label={['Execution','Planning','Closure'][Number(project.pm_projectphase)] || 'Unknown'} color={(['success','info','secondary'][Number(project.pm_projectphase)] || 'default') as any} size="small" /></Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>Manager</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontSize: fontSizes.smMd }}>{project.pm_projectmanagername || '—'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>Sponsor</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontSize: fontSizes.smMd }}>{project.pm_projectsponsor || '—'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>Portfolio</Typography>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, mt: 0.5, fontSize: fontSizes.smMd, maxWidth: 130 }}>{project.pm_portfolioname || '—'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 }}>Programme</Typography>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, mt: 0.5, fontSize: fontSizes.smMd, maxWidth: 130 }}>{project.pm_programmename || '—'}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ━━ Row 3: Agent Insights ━━ */}
      {insights.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LightbulbIcon sx={{ fontSize: 18, color: 'info.main' }} />
              AI Agent Insights
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatusTag label={`${alertInsights.length} alerts`} size="small" color={alertInsights.length > 0 ? 'error' : 'success'} variant="outlined" />
              <StatusTag label={`${suggestionInsights.length} suggestions`} size="small" color={suggestionInsights.length > 0 ? 'info' : 'default'} variant="outlined" />
              {unreviewedInsights.length > 0 && (
                <StatusTag label={`${unreviewedInsights.length} unreviewed`} size="small" color="warning" variant="outlined" />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {insights.slice(0, 4).map((insight) => {
              const isAlert = String(insight.pm_insighttype) === '125570000'
              const isUnreviewed = String(insight.pm_actionstatus) === '125570000'
              const priorityColor = String(insight.pm_priority) === '2' ? 'error.main'
                : String(insight.pm_priority) === '1' ? 'warning.main'
                : 'info.main'

              return (
                <Box
                  key={insight.pm_agentinsightid}
                  sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.25,
                    borderRadius: 1.15,
                    bgcolor: isAlert ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)',
                    borderLeft: `3px solid ${isAlert ? 'error.main' : 'info.main'}`,
                    transition: 'background-color 0.15s',
                    '&:hover': { bgcolor: isAlert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)' },
                  }}
                >
                  <Box sx={{ color: isAlert ? 'error.main' : 'info.main', mt: 0.25, flexShrink: 0 }}>
                    {isAlert ? <ErrorIcon sx={{ fontSize: 18 }} /> : <LightbulbIcon sx={{ fontSize: 18 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {insight.pm_insighttitle ?? (isAlert ? 'Alert' : 'Suggestion')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {isUnreviewed && (
                          <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700, fontSize: 9 }}>NEW</Typography>
                        )}
                        {insight.pm_confidencescore && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                            {Math.round(insight.pm_confidencescore * 100)}% confidence
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {insight.pm_insightdescription && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, mt: 0.15 }}>
                        {insight.pm_insightdescription}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      {insight.pm_sourceagent && (
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
                          Source: {insight.pm_sourceagent}
                        </Typography>
                      )}
                      {insight.createdon && (
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
                          {new Date(insight.createdon).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Typography>
                      )}
                      {insight.pm_priorityname && (
                        <Chip label={insight.pm_priorityname} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 8, height: 18, color: priorityColor }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}

      {/* ━━ Row 5: Milestones + Gate Reviews ━━ */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <FlagIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Live Milestones
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {metrics.completedMilestones}/{milestones.length} completed
              </Typography>
            </Box>
            {upcomingMilestones.length > 0 ? (
              <Box>
                {upcomingMilestones.map((ms, idx) => (
                  <React.Fragment key={ms.pm_projectmilestoneid}>
                    <MilestoneItem milestone={ms} />
                    {idx < upcomingMilestones.length - 1 && (
                      <Box sx={{ borderLeft: `2px dashed ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, ml: 0.65, height: 8 }} />
                    )}
                  </React.Fragment>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                {milestones.length === 0 ? 'No milestones defined yet.' : 'All milestones completed.'}
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <HowToRegIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Gate Reviews
              </Typography>
              <StatusTag label={`${metrics.pendingGates} pending`} size="small" color={metrics.pendingGates > 0 ? 'warning' : 'success'} />
            </Box>
            {recentGates.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentGates.map((g) => (
                  <Box
                    key={g.pm_projectgatereviewid}
                    onClick={() => g.pm_projectgatereviewid && navigateToGateReview(g.pm_projectgatereviewid)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1.15, bgcolor: 'action.hover', cursor: 'pointer', transition: 'background-color 0.15s', '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' } }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.pm_gatename ?? GATE_STAGE_LABELS[String(g.pm_gatestage)] ?? 'Gate Review'}</Typography>
                        <OpenInNewIcon sx={{ fontSize: 13, opacity: 0.35 }} />
                        <Chip label={GATE_STAGE_LABELS[String(g.pm_gatestage)] ?? `Stage ${g.pm_gatestage}`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 9, height: 18 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {g.pm_leadreviewer ? `Reviewer: ${g.pm_leadreviewer}` : ''}
                        {g.pm_plannedreviewdate ? ` · ${new Date(g.pm_plannedreviewdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      </Typography>
                    </Box>
                    <StatusTag
                      label={String(g.pm_reviewstatus) === '1' ? 'Scheduled' : OUTCOME_LABELS[String(g.pm_reviewoutcome)] ?? 'Complete'}
                      size="small"
                      color={String(g.pm_reviewstatus) === '1' ? 'info' : OUTCOME_COLORS[String(g.pm_reviewoutcome)] ?? 'success'}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No gate reviews yet.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ━━ Row 6: Bottom Summary Cards ━━ */}
      <Grid container spacing={2}>
        {/* Resource & Benefit */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Resources & Benefits
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{resources.length}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Resources</Typography>
                {metrics.totalAllocatedHours > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs }}>
                    {metrics.totalAllocatedHours}h allocated
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>{metrics.achievedBenefits}/{benefits.length}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Benefits</Typography>
                {benefits.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs }}>
                    {Math.round((metrics.achievedBenefits / benefits.length) * 100) || 0}% realized
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Budget & Schedule */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'success.main' }} /> Budget & Schedule
            </Typography>

            {/* Budget row */}
            {metrics.totalBudget > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{currency(metrics.totalSpent)} / {currency(metrics.totalBudget)}</Typography>
                  <Typography variant="caption" color={budgetUtilPct > 90 ? 'error.main' : budgetUtilPct > 70 ? 'warning.main' : 'success.main'} sx={{ fontWeight: 700 }}>{budgetUtilPct}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate" value={budgetUtilPct}
                  sx={{ height: 6, borderRadius: 1.5, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { borderRadius: 1.5, bgcolor: budgetUtilPct > 90 ? 'error.main' : budgetUtilPct > 70 ? 'warning.main' : 'success.main' },
                  }}
                />
              </Box>
            )}

            {/* Schedule row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: metrics.totalBudget > 0 ? 0 : 0 }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Schedule</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                  {project.pm_plannedstartdate ? new Date(project.pm_plannedstartdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  {' — '}
                  {project.pm_plannedenddate ? new Date(project.pm_plannedenddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </Typography>
              </Box>
              <StatusChip status={project.pm_ragstatus} type="rag" size="small" />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

