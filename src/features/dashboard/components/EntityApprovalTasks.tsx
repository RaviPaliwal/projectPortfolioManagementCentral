import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  Alert,
  Chip,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'

import { TabPanel, Button } from '@/components/common'
import { fontSizes } from '@/styles'
import { useUser } from '@/context/UserContext'
import {
  fetchWorkflowInstancesForEntity,
  fetchWorkflowApprovalSteps,
  openApprovalStepTask,
} from '@/services'
import type { WorkflowInstanceModel, WorkflowApprovalStepModel } from '@/types/dataverse'

export interface StepCompletionInfo {
  outcome: 'approved' | 'rejected'
  approverName?: string
  decisionDate?: string
}

interface EntityApprovalTasksProps {
  entityId: string | null
  moduleName: string
  entityLabel: string
  tabValue: number
  index: number
  refreshTrigger?: number
  onAllStepsCompleted?: (info: StepCompletionInfo) => void
  hideHeader?: boolean
}

/** Check if a step is assigned to the given user */
function isStepAssignedToUser(
  step: WorkflowApprovalStepModel,
  userId: string,
  userName: string
): boolean {
  // Team assignment — always visible (no per-user filter for team-assigned tasks)
  if (String(step.pm_assigneetype) === '1') return true

  const assigneeDisplay = (step.pm_assigneedisplayname || '').toLowerCase()
  const assigneeName = ((step as any).pm_assigneename || '').toLowerCase()
  const approverName = (step.pm_approvername || '').toLowerCase()

  const uId = userId.toLowerCase()
  const uName = userName.toLowerCase()

  if (assigneeDisplay === uId || assigneeDisplay === uName) return true
  if (assigneeName === uId || assigneeName === uName) return true
  if (approverName === uId || approverName === uName) return true

  return false
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '—'

export function EntityApprovalTasks({ entityId, moduleName, entityLabel, tabValue, index, refreshTrigger, onAllStepsCompleted, hideHeader = false }: EntityApprovalTasksProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUser } = useUser()
  const [updatedInstances, setUpdatedInstances] = useState<WorkflowInstanceModel[]>([])
  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [allCompletedSteps, setAllCompletedSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingStep, setOpeningStep] = useState<string | null>(null)
  const prevPendingCount = useRef<number | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const detectCompletion = useCallback((pendingSteps: WorkflowApprovalStepModel[], completedSteps: WorkflowApprovalStepModel[]) => {
    const prev = prevPendingCount.current
    const curr = pendingSteps.length
    if (prev !== null && prev > 0 && curr === 0 && completedSteps.length > 0) {
      const rejected = completedSteps.find((s) => s.pm_decisionstatus === 3)
      const lastCompleted = completedSteps[completedSteps.length - 1]
      onAllStepsCompleted?.({
        outcome: rejected ? 'rejected' : 'approved',
        approverName: lastCompleted?.pm_approvername,
        decisionDate: lastCompleted?.pm_decisiondate,
      })
    }
    prevPendingCount.current = curr
  }, [onAllStepsCompleted])

  const loadData = useCallback(async (isBackground = false) => {
    if (!entityId) return
    if (!isBackground) setLoading(true)
    setError(null)
    try {
      const workflowInstances = await fetchWorkflowInstancesForEntity(moduleName, entityId as string)
      setUpdatedInstances(workflowInstances)

      const pendingSteps: WorkflowApprovalStepModel[] = []
      const completedSteps: WorkflowApprovalStepModel[] = []

      for (const instance of workflowInstances) {
        const instanceId = instance.pm_workflowinstanceid
        if (!instanceId) continue
        const instanceSteps = await fetchWorkflowApprovalSteps(instanceId)
        for (const s of instanceSteps) {
          // Only show steps that are actually Assigned (actionable), not Pending
          if (s.pm_decisionstatus === 2) {
            pendingSteps.push(s)
          } else if (s.pm_decisionstatus === 0 || s.pm_decisionstatus === 3) {
            completedSteps.push(s)
          }
          // Status 1 (Pending) — not yet actionable, skip entirely
        }
      }
      setSteps(pendingSteps)
      setAllCompletedSteps(completedSteps)
      detectCompletion(pendingSteps, completedSteps)
    } catch (err) {
      setError('Unable to load approval tasks.')
    } finally {
      setLoading(false)
    }
  }, [entityId, moduleName, detectCompletion, currentUser])

  useEffect(() => {
    if (entityId) {
      prevPendingCount.current = null
      loadData()
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [loadData, entityId, refreshTrigger])

  useEffect(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
    if (entityId && steps.length > 0) {
      pollTimer.current = setInterval(() => loadData(true), 8000)
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [entityId, steps.length, loadData])

  return (
    <TabPanel value={tabValue} index={index} pt={0}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 1.5 }} />
          ))}
        </Box>
      ) : steps.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
            No pending approvals
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {entityLabel} has no workflow approval steps requiring action.
          </Typography>

        </Box>
      ) : (
        <Box>
          {!hideHeader && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Pending Approval Tasks
              </Typography>
              <Chip label={`${steps.length} pending`} color="warning" size="small" sx={{ fontWeight: 700 }} />
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(() => {
              const workflowMap: Record<string, string> = {}
              for (const inst of updatedInstances) {
                const id = inst.pm_workflowinstanceid
                if (id) workflowMap[id] = inst.pm_workflowlookupname || inst.pm_instancename || ''
              }
              return steps.map((step) => {
                const isOverdue = step.pm_duedate && new Date(step.pm_duedate) < new Date()
                const workflowName = step._pm_workflowinstancelookup_value
                  ? workflowMap[step._pm_workflowinstancelookup_value] || null
                  : null
                const userId = currentUser?.systemuserid || ''
                const userName = currentUser?.fullname || ''
                const isAssignedToMe = isStepAssignedToUser(step, userId, userName)
                return (
                  <Paper
                    key={step.pm_workflowapprovalstepid}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: '4px',
                      borderLeft: '3px solid',
                      borderLeftColor: isOverdue ? 'error.main' : 'warning.main',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {step.pm_stepname || 'Approval Step'}
                          </Typography>
                          {workflowName && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, fontSize: fontSizes.xs }}>
                              {workflowName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                          {step.pm_duedate ? (isOverdue ? 'Overdue' : `Due ${formatDate(step.pm_duedate)}`) : 'No due date'}
                        </Typography>
                        <Tooltip title={!isAssignedToMe ? "Only the assignee can review this task" : ""}>
                          <Box component="span" sx={{ display: 'inline-flex' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={openingStep === step.pm_workflowapprovalstepid || !isAssignedToMe}
                              onClick={async () => {
                                const sid = step.pm_workflowapprovalstepid!
                                setOpeningStep(sid)
                                try {
                                  await openApprovalStepTask(sid)
                                  loadData()
                                } finally {
                                  setOpeningStep(null)
                                }
                              }}
                              sx={{ 
                                fontWeight: 600, 
                                fontSize: fontSizes.xs, 
                                py: 0.5, 
                                minWidth: 90,
                                ...(isDark && {
                                  color: 'primary.light',
                                  borderColor: alpha(theme.palette.primary.light, 0.5),
                                  '&:hover': {
                                    borderColor: 'primary.light',
                                    bgcolor: alpha(theme.palette.primary.light, 0.08)
                                  }
                                })
                              }}
                            >
                              {openingStep === step.pm_workflowapprovalstepid ? 'Opening...' : 'Review'}
                            </Button>
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {((step as any).pm_assigneename || step.pm_approvername) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {(step as any).pm_assigneename || step.pm_approvername}
                          </Typography>
                        </Box>
                      )}
                      {step.pm_steporder && (
                        <Typography variant="caption" color="text.disabled">
                          Step {step.pm_steporder}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                )
              })
            })()}
          </Box>

        </Box>
      )}
    </TabPanel>
  )
}

EntityApprovalTasks.displayName = 'EntityApprovalTasks'
export default EntityApprovalTasks
