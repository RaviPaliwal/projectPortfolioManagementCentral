import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
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
import BusinessIcon from '@mui/icons-material/Business'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import GroupIcon from '@mui/icons-material/Group'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'

import { useUser } from '@/context/UserContext'
import { StatusTag, Button } from '@/components/common'
import { fontSizes } from '@/styles'
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

function getEntityIcon(entityType?: string) {
  if (!entityType) return <AssignmentIcon sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }} />
  const icons: Record<string, React.ReactNode> = {
    project: <AccountTreeIcon sx={{ fontSize: fontSizes.sm, color: 'primary.main' }} />,
    projects: <AccountTreeIcon sx={{ fontSize: fontSizes.sm, color: 'primary.main' }} />,
    budget: <AccountBalanceWalletIcon sx={{ fontSize: fontSizes.sm, color: 'success.main' }} />,
    budgets: <AccountBalanceWalletIcon sx={{ fontSize: fontSizes.sm, color: 'success.main' }} />,
    timesheet: <AccessTimeIcon sx={{ fontSize: fontSizes.sm, color: 'warning.main' }} />,
    timesheets: <AccessTimeIcon sx={{ fontSize: fontSizes.sm, color: 'warning.main' }} />,
    resource: <GroupIcon sx={{ fontSize: fontSizes.sm, color: 'info.main' }} />,
    resources: <GroupIcon sx={{ fontSize: fontSizes.sm, color: 'info.main' }} />,
    pipeline: <DescriptionIcon sx={{ fontSize: fontSizes.sm, color: 'secondary.main' }} />,
  }
  return icons[entityType.toLowerCase()] || <AssignmentIcon sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }} />
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '—'

import type { SxProps, Theme } from '@mui/material'

interface DashboardTasksWidgetProps {
  variant?: 'full' | 'tasks' | 'insights'
  sx?: SxProps<Theme>
}

export default function DashboardTasksWidget({ variant = 'full', sx }: DashboardTasksWidgetProps) {
  const { currentUser, userTeams } = useUser()
  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [insights, setInsights] = useState<AgentInsightModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(true)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const [openingStep, setOpeningStep] = useState<string | null>(null)

  const navigateToPending = useCallback(() => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'tasks' } }))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const shouldFetchTasks = variant === 'full' || variant === 'tasks'
      const shouldFetchInsights = variant === 'full' || variant === 'insights'
      const teams = userTeams.get(currentUser?.systemuserid ?? '') || []
      const [workflowSteps, agentInsights] = await Promise.all([
        shouldFetchTasks && currentUser?.fullname
          ? fetchPendingWorkflowApprovals(currentUser.systemuserid ?? '', currentUser.fullname, teams)
          : Promise.resolve<WorkflowApprovalStepModel[]>([]),
        shouldFetchInsights ? fetchAgentInsights() : Promise.resolve<AgentInsightModel[]>([]),
      ])
      if (shouldFetchTasks) setSteps(workflowSteps)
      if (shouldFetchInsights) setInsights(agentInsights)
    } catch (err) {
      setError('Unable to load data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, variant, userTeams])

  useEffect(() => { loadData() }, [loadData])

  const totalTasks = steps.length
  const overdueTasks = steps.filter((s) => s.pm_duedate && new Date(s.pm_duedate) < new Date()).length
  const urgentTasks = steps.filter(
    (s) => s.pm_duedate && !(new Date(s.pm_duedate) < new Date()) && new Date(s.pm_duedate).getTime() - Date.now() < 86400000 * 2
  ).length

  const taskDisplayCount = 5
  const insightDisplayCount = 2

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

  const showTasks = variant === 'full' || variant === 'tasks'
  const showAI = variant === 'full' || variant === 'insights'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
      {showTasks && (
        <Paper
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 12px 20px rgba(0,0,0,0.5)'
                : '0 8px 16px rgba(99,102,241,0.06)',
            }
          }}
        >
          <Box sx={{ p: 2.5, pb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon sx={{ color: 'primary.main' }} />
                  Tasks
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

          <Box sx={{ px: 2.5, pb: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 1.5 }} />
                ))}
              </Box>
            ) : totalTasks === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No pending approvals</Typography>
                <Typography variant="caption" color="text.disabled">All caught up! You have no tasks requiring action.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
                {steps.slice(0, 5).map((step) => {
                  const isOverdue = step.pm_duedate && new Date(step.pm_duedate) < new Date()
                  return (
                    <Paper
                      key={step.pm_workflowapprovalstepid}
                      variant="outlined"
                      className="activity-list-item"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeft: '4px solid',
                        borderLeftColor: isOverdue ? 'error.main' : 'warning.main',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        mb: 1.5,
                        '&:hover': { bgcolor: 'action.hover', boxShadow: 1 },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
                          <Box sx={{ mt: 0.25 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.50' }}>
                              {getEntityIcon((step as any).pm_entitytype)}
                            </Box>
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: fontSizes.sm, color: 'text.primary', mb: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {(step as any).pm_workflowname || step.pm_stepname || 'Approval Step'}
                            </Typography>
                            <Typography variant="body2" sx={{ display: 'block', color: 'primary.main', fontSize: fontSizes.xs, mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {step.pm_stepname || 'Step'}
                            </Typography>
                            {(step as any).pm_initiatedby && (
                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Requested by {(step as any).pm_initiatedby}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Chip
                          size="small"
                          label={step.pm_duedate ? (isOverdue ? 'Overdue' : formatDate(step.pm_duedate)) : 'No date'}
                          icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isOverdue ? 'error.main' : 'warning.main', ml: 1 }} />}
                          sx={{ 
                            height: 24, 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            bgcolor: isOverdue ? 'error.50' : 'warning.50',
                            color: isOverdue ? 'error.main' : 'warning.dark',
                            border: 'none'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 6.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {(step as any).pm_entitytype && (
                            <Chip
                              label={getEntityLabel((step as any).pm_entitytype).toUpperCase()}
                              size="small"
                              variant="outlined"
                              sx={{ height: 24, fontSize: '11px', fontWeight: 600, color: 'text.secondary', borderColor: 'divider', borderRadius: 1 }}
                            />
                          )}
                          {((step as any).pm_assigneename || step.pm_approvername) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                {((step as any).pm_assigneename || step.pm_approvername).substring(0, 2).toUpperCase()}
                              </Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {(step as any).pm_assigneename || step.pm_approvername}
                              </Typography>
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
                          sx={{ fontWeight: 600, fontSize: fontSizes.xs, py: 0.5, px: 2, borderRadius: 12, minWidth: 90 }}
                        >
                          {openingStep === step.pm_workflowapprovalstepid ? 'Opening...' : 'Review'}
                        </Button>
                      </Box>
                    </Paper>
                  )
                })}
                {totalTasks > taskDisplayCount && (
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
      )}

      {showAI && (
        <Paper
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 12px 20px rgba(0,0,0,0.5)'
                : '0 8px 16px rgba(99,102,241,0.06)',
            }
          }}
        >
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
              <AutoAwesomeIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>AI Insights</Typography>
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
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      maxHeight: 450,
                      overflowY: 'auto',
                      pr: 0.75,
                      // Custom scrollbar
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: theme => theme.palette.divider,
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: theme => theme.palette.action.active,
                      },
                    }}
                  >
                    {(showAllInsights ? insights : insights.slice(0, insightDisplayCount)).map((insight) => (
                      <Paper
                        key={insight.id}
                        variant="outlined"
                        className="activity-list-item"
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          borderLeft: '3px solid',
                          borderLeftColor: insight.type === 'Alert' ? 'warning.main' : 'info.main',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
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
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: fontSizes.sm }}>
                              {insight.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block', mt: 0.25 }}>
                              {insight.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={insight.type} size="small" color={insight.type === 'Alert' ? 'warning' : 'info'} variant="outlined" sx={{ height: 20, fontSize: fontSizes.xs, fontWeight: 600 }} />
                              <Chip label={insight.priority} size="small" color={insight.priority === 'High' ? 'error' : insight.priority === 'Medium' ? 'warning' : 'default'} variant="filled" sx={{ height: 20, fontSize: fontSizes.xs, fontWeight: 600 }} />
                              {insight.confidenceScore > 0 && (
                                <Chip label={`${Math.round(insight.confidenceScore)}% confidence`} size="small" variant="outlined" sx={{ height: 20, fontSize: fontSizes.xs, fontWeight: 600 }} />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                  {insights.length > insightDisplayCount && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setShowAllInsights(!showAllInsights)}
                      endIcon={showAllInsights ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ alignSelf: 'center', mt: 0.5, fontWeight: 600 }}
                    >
                      {showAllInsights
                        ? 'Show less'
                        : `Show all ${insights.length} insights`
                      }
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}
    </Box>
  )
}
