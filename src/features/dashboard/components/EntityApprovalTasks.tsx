import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  Alert,
  Chip,
  Button,
  Tooltip,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'
import LockIcon from '@mui/icons-material/Lock'

import { TabPanel } from '@/components/common'
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
  const approverName = (step.pm_approvername || '').toLowerCase()

  if (assigneeDisplay === userId.toLowerCase()) return true
  if (assigneeDisplay === userName.toLowerCase()) return true
  if (approverName === userId.toLowerCase()) return true
  if (approverName === userName.toLowerCase()) return true

  return false
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '—'

export function EntityApprovalTasks({ entityId, moduleName, entityLabel, tabValue, index, refreshTrigger, onAllStepsCompleted }: EntityApprovalTasksProps) {
  const { currentUser } = useUser()
  const [instances, setInstances] = useState<WorkflowInstanceModel[]>([])
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

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const workflowInstances = await fetchWorkflowInstancesForEntity(moduleName, entityId as string)
      setUpdatedInstances(workflowInstances)

      const pendingSteps: WorkflowApprovalStepModel[] = []
      const completedSteps: WorkflowApprovalStepModel[] = []
      const userId = currentUser?.systemuserid || ''
      const userName = currentUser?.fullname || ''

      for (const instance of workflowInstances) {
        const instanceId = instance.pm_workflowinstanceid
        if (!instanceId) continue
        const instanceSteps = await fetchWorkflowApprovalSteps(instanceId)
        for (const s of instanceSteps) {
          // Only show steps that are actually Assigned (actionable), not Pending
          if (s.pm_decisionstatus === 2) {
            // Only add to pending if assigned to the current user
            if (isStepAssignedToUser(s, userId, userName)) {
              pendingSteps.push(s)
            }
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
      console.error('[EntityApprovalTasks] load error:', err)
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
      pollTimer.current = setInterval(loadData, 8000)
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
          <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
            No pending approvals
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {entityLabel} has no workflow approval steps requiring action.
          </Typography>
          {updatedInstances.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Workflow Instances
              </Typography>
              {updatedInstances.map((inst) => {
                const statusLabel = inst.pm_status === 0 ? 'Completed' : inst.pm_status === 1 ? 'In Progress' : 'Cancelled'
                const statusColor = inst.pm_status === 0 ? 'success' : inst.pm_status === 1 ? 'info' : 'default'
                return (
                  <Paper key={inst.pm_workflowinstanceid} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {inst.pm_instancename || 'Workflow Instance'}
                      </Typography>
                      <Chip label={statusLabel} size="small" color={statusColor as any} variant="outlined" sx={{ fontWeight: 600 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                      Started: {formatDate(inst.pm_startdate)}
                      {inst.pm_completeddate ? ` • Completed: ${formatDate(inst.pm_completeddate)}` : ''}
                    </Typography>
                  </Paper>
                )
              })}
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Pending Approval Tasks
            </Typography>
            <Chip label={`${steps.length} pending`} color="warning" size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
          </Box>
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
              return (
                <Paper
                  key={step.pm_workflowapprovalstepid}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    borderLeft: '3px solid',
                    borderLeftColor: isOverdue ? 'error.main' : 'warning.main',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                      <Box sx={{ mt: 0.25 }}>
                        <AssignmentIcon sx={{ fontSize: 16, color: isOverdue ? 'error.main' : 'warning.main' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {step.pm_stepname || 'Approval Step'}
                        </Typography>
                        {workflowName && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, fontSize: 11 }}>
                            {workflowName}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                        {step.pm_duedate ? (isOverdue ? 'Overdue' : `Due ${formatDate(step.pm_duedate)}`) : 'No due date'}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        disabled={openingStep === step.pm_workflowapprovalstepid}
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
                        sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 11, py: 0.5, minWidth: 90 }}
                      >
                        {openingStep === step.pm_workflowapprovalstepid ? 'Opening...' : 'Review'}
                      </Button>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {((step as any).pm_assigneename || step.pm_approvername) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
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
            })})()}
          </Box>
          {updatedInstances.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Workflow Instances ({updatedInstances.length})
              </Typography>
              {updatedInstances.map((inst) => (
                <Paper key={inst.pm_workflowinstanceid} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {inst.pm_instancename || 'Workflow Instance'}
                    </Typography>
                    <Chip
                      label={inst.pm_status === 0 ? 'Completed' : inst.pm_status === 1 ? 'In Progress' : 'Cancelled'}
                      size="small"
                      color={inst.pm_status === 0 ? 'success' : inst.pm_status === 1 ? 'info' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(inst.pm_startdate)}
                    {inst.pm_completeddate ? ` — ${formatDate(inst.pm_completeddate)}` : ' — In progress'}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}
    </TabPanel>
  )
}

EntityApprovalTasks.displayName = 'EntityApprovalTasks'
export default EntityApprovalTasks
