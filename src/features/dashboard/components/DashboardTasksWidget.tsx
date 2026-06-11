import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Skeleton,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PersonIcon from '@mui/icons-material/Person'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RefreshIcon from '@mui/icons-material/Refresh'

import { useUser } from '@/context/UserContext'
import { StatusTag } from '@/components/common'
import {
  fetchPendingWorkflowApprovals,
  fetchAgentInsights,
  openApprovalStepTask,
} from '@/services'
import type { WorkflowApprovalStepModel } from '@/types/dataverse'
import type { AgentInsightModel } from '@/services/agent-insights.service'

function getEntityLabel(entityType?: string): string {
  if (!entityType) return 'Unknown'
  const labels: Record<string, string> = {
    project: 'Project', projects: 'Project',
    budget: 'Budget', budgets: 'Budget',
    timesheet: 'Timesheet', timesheets: 'Timesheet',
    resource: 'Resource', resources: 'Resource',
    gatereview: 'Gate Review', 'gate review': 'Gate Review',
    changerequest: 'Change Request', changerequests: 'Change Request',
    pipeline: 'Initiative',
    fundingsource: 'Funding Source', fundingsources: 'Funding Source',
    programme: 'Programme', programmes: 'Programme',
    portfolio: 'Portfolio', portfolios: 'Portfolio',
  }
  return labels[entityType.toLowerCase()] || entityType
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '—'

export default function DashboardTasksWidget() {
  const { currentUser } = useUser()
  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [insights, setInsights] = useState<AgentInsightModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(true)
  const [openingStep, setOpeningStep] = useState<string | null>(null)

  const navigateToPending = useCallback(() => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'tasks' } }))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [workflowSteps, agentInsights] = await Promise.all([
        currentUser?.fullname
          ? fetchPendingWorkflowApprovals(currentUser.systemuserid ?? '')
          : Promise.resolve<WorkflowApprovalStepModel[]>([]),
        fetchAgentInsights(),
      ])
      setSteps(workflowSteps)
      setInsights(agentInsights)
    } catch (err) {
      console.error('[DashboardTasksWidget] load error:', err)
      setError('Unable to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { loadData() }, [loadData])

  const totalTasks = steps.length
  const overdueTasks = steps.filter((s) => s.pm_duedate && new Date(s.pm_duedate) < new Date()).length
  const urgentTasks = steps.filter(
    (s) => s.pm_duedate && !(new Date(s.pm_duedate) < new Date()) && new Date(s.pm_duedate).getTime() - Date.now() < 86400000 * 2
  ).length

  if (!currentUser) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">No user selected</Typography>
          <Typography variant="caption" color="text.disabled">Use the user selector in the top bar to switch users</Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Tasks Section */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, pb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon sx={{ color: '#6366f1' }} />
                My Tasks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Workflow approvals requiring your decision
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={loadData} sx={{ color: 'text.secondary' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              {totalTasks > 0 && (
                <Chip
                  label={`${totalTasks} pending`}
                  color={overdueTasks > 0 ? 'error' : urgentTasks > 0 ? 'warning' : 'primary'}
                  size="small"
                  sx={{ fontWeight: 700, borderRadius: 1 }}
                />
              )}
            </Box>
          </Box>

          {/* Summary chips */}
          {totalTasks > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
              {overdueTasks > 0 && (
                <Chip icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={`${overdueTasks} overdue`} color="error" size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
              )}
              {urgentTasks > 0 && (
                <Chip icon={<ScheduleIcon sx={{ fontSize: 14 }} />} label={`${urgentTasks} urgent`} color="warning" size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
              )}
              <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={`${totalTasks - overdueTasks - urgentTasks} on time`} color="success" size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
            </Box>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mx: 2.5, mb: 1.5 }}>{error}</Alert>}

        <Box sx={{ px: 2.5, pb: 2.5 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 1.5 }} />
              ))}
            </Box>
          ) : totalTasks === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#22c55e', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No pending approvals</Typography>
              <Typography variant="caption" color="text.disabled">All caught up! You have no tasks requiring action.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {steps.slice(0, 10).map((step) => {
                const isOverdue = step.pm_duedate && new Date(step.pm_duedate) < new Date()
                return (
                  <Paper
                    key={step.pm_workflowapprovalstepid}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      borderLeft: '3px solid',
                      borderLeftColor: isOverdue ? 'error.main' : 'primary.main',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <AssignmentIcon sx={{ fontSize: 16, color: isOverdue ? 'error.main' : '#6366f1' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                            {step.pm_stepname || 'Approval Step'}
                          </Typography>
                          {(step as any).pm_workflowinstancelookupname && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                              {(step as any).pm_workflowinstancelookupname}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'} sx={{ whiteSpace: 'nowrap', ml: 1, fontWeight: isOverdue ? 700 : 400 }}>
                        {step.pm_duedate ? (isOverdue ? 'Overdue' : formatDate(step.pm_duedate)) : 'No due date'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {(step as any).pm_entitytype && (
                          <StatusTag
                            label={getEntityLabel((step as any).pm_entitytype)}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        )}
                        {step.pm_approvername && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">{step.pm_approvername}</Typography>
                          </Box>
                        )}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        disabled={openingStep === step.pm_workflowapprovalstepid}
                        onClick={async () => {
                          const stepId = step.pm_workflowapprovalstepid!
                          setOpeningStep(stepId)
                          try {
                            await openApprovalStepTask(stepId)
                          } finally {
                            setOpeningStep(null)
                          }
                        }}
                        sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 11, py: 0.5, minWidth: 90 }}
                      >
                        {openingStep === step.pm_workflowapprovalstepid ? 'Opening...' : 'Review'}
                      </Button>
                    </Box>
                  </Paper>
                )
              })}
              {totalTasks > 10 && (
                <Button
                  variant="text"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={navigateToPending}
                  sx={{ alignSelf: 'center', mt: 0.5, fontWeight: 600 }}
                >
                  View all {totalTasks} tasks
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* AI Insights Section */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2.5, pb: 1.5,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setShowInsights(!showInsights)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>AI Insights</Typography>
              <Typography variant="caption" color="text.secondary">
                {insights.length > 0
                  ? `${insights.length} actionable insight${insights.length !== 1 ? 's' : ''}`
                  : 'Automated analysis from agent data'}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            {showInsights ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Collapse in={showInsights}>
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 1.5 }} />
                ))}
              </Box>
            ) : insights.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No unreviewed insights at this time.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {insights.slice(0, 5).map((insight) => (
                  <Paper
                    key={insight.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      borderLeft: '3px solid',
                      borderLeftColor: insight.priorityCode === 2 ? 'error.main' : insight.priorityCode === 1 ? 'warning.main' : 'info.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ mt: 0.25 }}>
                        {insight.type === 'Alert' ? (
                          <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        ) : (
                          <LightbulbIcon sx={{ fontSize: 16, color: 'info.main' }} />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                          {insight.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block', mt: 0.25 }}>
                          {insight.description.length > 150 ? insight.description.substring(0, 150) + '...' : insight.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={insight.type} size="small" color={insight.type === 'Alert' ? 'warning' : 'info'} variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />
                          <Chip label={insight.priority} size="small" color={insight.priority === 'High' ? 'error' : insight.priority === 'Medium' ? 'warning' : 'default'} variant="filled" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />
                          {insight.confidenceScore > 0 && (
                            <Chip label={`${Math.round(insight.confidenceScore * 100)}% confidence`} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
                {insights.length > 5 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5 }}>
                    + {insights.length - 5} more insight{insights.length - 5 !== 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  )
}
