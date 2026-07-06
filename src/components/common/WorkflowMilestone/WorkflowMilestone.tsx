import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  type StepIconProps,
  StepConnector,
  stepConnectorClasses,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  styled,
  alpha,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PersonIcon from '@mui/icons-material/Person'
import EventIcon from '@mui/icons-material/Event'
import TimelineIcon from '@mui/icons-material/Timeline'
import {
  fetchWorkflowInstancesForEntity,
  fetchWorkflowApprovalSteps,
  openApprovalStepTask,
  WORKFLOW_DECISION_EVENT,
} from '@/services'
import type { WorkflowInstanceModel, WorkflowApprovalStepModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'

// ─── Styled Step Connector ────────────────────────────────────────────────

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 20,
    left: 'calc(-50% + 20px)',
    right: 'calc(50% + 20px)',
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: theme.palette.info.main,
      opacity: 0.8,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: theme.palette.success.main,
      opacity: 0.8,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[300],
    borderRadius: 1,
  },
}))

const ColorlibStepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean }
}>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
  zIndex: 1,
  color: '#fff',
  width: 40,
  height: 40,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.2s ease',
  ...(ownerState.active && {
    backgroundColor: theme.palette.info.main,
    color: theme.palette.info.contrastText,
    boxShadow: `0 4px 10px 0 ${alpha(theme.palette.info.main, 0.3)}`,
  }),
  ...(ownerState.completed && {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    boxShadow: `0 4px 10px 0 ${alpha(theme.palette.success.main, 0.3)}`,
  }),
}))

function ColorlibStepIcon(props: StepIconProps) {
  const { active, completed, icon } = props

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }}>
      {completed ? (
        <CheckCircleIcon sx={{ fontSize: 22 }} />
      ) : active ? (
        <HourglassEmptyIcon sx={{ fontSize: 20 }} />
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
          {icon}
        </Typography>
      )}
    </ColorlibStepIconRoot>
  )
}

// ─── Decision Status Helpers ─────────────────────────────────────────────

interface DecisionConfig {
  label: string
  color: 'success' | 'error' | 'warning' | 'info' | 'default'
  icon: React.ReactNode
}

const DECISION_CONFIG: Record<string, DecisionConfig> = {
  '0': { label: 'Approved', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  '1': { label: 'Pending', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  '2': { label: 'Assigned', color: 'info', icon: <PersonIcon fontSize="small" /> },
  '3': { label: 'Rejected', color: 'error', icon: <CancelIcon fontSize="small" /> },
}

function getDecisionConfig(status: string | number | undefined): DecisionConfig {
  return DECISION_CONFIG[String(status ?? '1')] || DECISION_CONFIG['1']
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

// ─── Props ────────────────────────────────────────────────────────────────

export interface WorkflowMilestoneProps {
  /** Optional explicit Workflow Instance ID. If provided, fetches only this workflow. */
  workflowInstanceId?: string
  /** Module/entity type name, e.g. "GateReview", "Project", "Portfolio". Used if workflowInstanceId is not provided. */
  moduleName?: string
  /** Entity GUID to fetch workflow instances for. Used if workflowInstanceId is not provided. */
  entityId?: string
  /** Optional class name override */
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────

export function WorkflowMilestone({ workflowInstanceId, moduleName, entityId, className }: WorkflowMilestoneProps) {
  const theme = useTheme()

  const [instances, setInstances] = useState<WorkflowInstanceModel[]>([])
  const [stepsByInstance, setStepsByInstance] = useState<Record<string, WorkflowApprovalStepModel[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!workflowInstanceId && (!moduleName || !entityId)) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      let workflowInstances: WorkflowInstanceModel[] = []
      
      if (workflowInstanceId) {
        // Fetch single instance by ID
        // Note: fetchWorkflowInstanceById needs to be imported if not already
        const instance = await import('@/services').then(m => m.fetchWorkflowInstanceById(workflowInstanceId))
        if (instance) {
          workflowInstances = [instance]
        }
      } else if (moduleName && entityId) {
        // Fetch all instances for entity
        workflowInstances = await fetchWorkflowInstancesForEntity(moduleName, entityId)
      }
      
      setInstances(workflowInstances)

      const stepsMap: Record<string, WorkflowApprovalStepModel[]> = {}
      if (workflowInstances.length > 0) {
        const stepsResults = await Promise.all(
          workflowInstances.map(async (inst) => {
            const steps = await fetchWorkflowApprovalSteps(inst.pm_workflowinstanceid!)
            return { instanceId: inst.pm_workflowinstanceid!, steps }
          })
        )
        for (const result of stepsResults) {
          stepsMap[result.instanceId] = result.steps
        }
      }
      setStepsByInstance(stepsMap)
    } catch (err) {
      setError('Unable to load workflow milestone data.')
    } finally {
      setLoading(false)
    }
  }, [workflowInstanceId, moduleName, entityId])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh whenever a workflow decision is submitted (any task modal completes)
  useEffect(() => {
    const handler = () => {
      loadData()
    }
    window.addEventListener(WORKFLOW_DECISION_EVENT, handler)
    return () => window.removeEventListener(WORKFLOW_DECISION_EVENT, handler)
  }, [loadData])

  // ── Open Configured Form Directly ────────────────────────────────────

  const handleStepClick = useCallback(async (step: WorkflowApprovalStepModel) => {
    // Only assigned steps (decision status = 2) are actionable
    if (String(step.pm_decisionstatus) !== '2' || !step.pm_workflowapprovalstepid) return

    // Directly navigate to the configured form for this approval step
    const opened = await openApprovalStepTask(step.pm_workflowapprovalstepid)
    if (!opened) {
      // Failed to open form
    }
  }, [])

  // ── Empty / Loading States ──────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>
  }

  if (instances.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
          No Workflow Milestones
        </Typography>
        <Typography variant="body2" color="text.disabled">
          No workflow instances have been initiated for this entity yet.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {instances.map((instance) => {
        const steps = stepsByInstance[instance.pm_workflowinstanceid!] || []
        const activeStepIndex = steps.findIndex(
          (s) => String(s.pm_decisionstatus) === '1' || String(s.pm_decisionstatus) === '2'
        )
        const isCompleted = String(instance.pm_status) === '0'
        const currentStep = activeStepIndex >= 0 ? activeStepIndex : (isCompleted ? steps.length : 0)

        return (
          <Paper key={instance.pm_workflowinstanceid} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* ── Instance Header ──────────────────────────────────── */}
            <Box
              sx={{
                p: 2.5,
                bgcolor: isCompleted ? 'success.50' : 'primary.50',
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {(instance.pm_instancename || instance.pm_workflowlookupname || 'Workflow Instance').split('#')[0].trim()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {instance.pm_workflowlookupname && `Template: ${instance.pm_workflowlookupname.split('#')[0].trim()}`}
                  {instance.pm_initiatedby && ` · Initiated by: ${instance.pm_initiatedby}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {instance.pm_startdate && (
                  <Tooltip title={`Started: ${new Date(instance.pm_startdate).toLocaleDateString()}`}>
                    <Chip
                      icon={<EventIcon sx={{ fontSize: 14 }} />}
                      label={new Date(instance.pm_startdate).toLocaleDateString()}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  </Tooltip>
                )}
                <Chip
                  label={
                    isCompleted
                      ? 'Completed'
                      : String(instance.pm_statusname || instance.pm_status || 'Active')
                  }
                  size="small"
                  color={isCompleted ? 'success' : 'primary'}
                  sx={{ fontWeight: 600, borderRadius: 1 }}
                />
              </Box>
            </Box>

            {/* ── Approval Steps Timeline ──────────────────────────── */}
            <Box sx={{ p: 3 }}>
              {steps.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No approval steps configured for this workflow instance.
                </Typography>
              ) : (
                <Stepper
                  activeStep={currentStep}
                  alternativeLabel
                  connector={<ColorlibConnector />}
                  sx={{ flexWrap: 'wrap', gap: 0 }}
                >
                  {steps.map((step, index) => {
                    const decision = getDecisionConfig(step.pm_decisionstatus)
                    const isPast = index < currentStep || isCompleted
                    const isCurrent = index === currentStep && !isCompleted
                    const isActionable = String(step.pm_decisionstatus) === '2' // Assigned — can take action

                    return (
                      <Step
                        key={step.pm_workflowapprovalstepid || index}
                        active={isCurrent}
                        completed={step.pm_decisionstatus === 0 || index < currentStep}
                      >
                        <StepLabel slots={{ stepIcon: ColorlibStepIcon }}>
                          {/* Step header */}
                          <Box
                            sx={{
                              mt: 1,
                              textAlign: 'center',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: isPast
                                  ? 'text.secondary'
                                  : isCurrent
                                    ? 'info.main'
                                    : 'text.primary',
                              }}
                            >
                              {step.pm_stepname || `Step ${step.pm_steporder ?? index + 1}`}
                            </Typography>

                            {/* Assignee */}
                            {(step.pm_assigneedisplayname || step.pm_assigneetypename) && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mt: 0.3 }}
                              >
                                <PersonIcon sx={{ fontSize: 11 }} />
                                {step.pm_assigneedisplayname || step.pm_assigneetypename}
                              </Typography>
                            )}

                            {/* Decision Status Chip */}
                            <Box sx={{ mt: 0.8, display: 'flex', justifyContent: 'center' }}>
                              <Chip
                                icon={decision.icon as React.ReactElement}
                                label={decision.label}
                                size="small"
                                color={decision.color}
                                variant={isCurrent ? 'filled' : 'outlined'}
                                sx={{
                                  fontWeight: 600,
                                  height: 22,
                                  fontSize: '0.65rem',
                                  borderRadius: 1,
                                  '& .MuiChip-icon': { fontSize: 13, ml: 0.5 },
                                }}
                              />
                            </Box>

                            {/* Due Date / Decision Date */}
                            {(step.pm_duedate || step.pm_decisiondate) && (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ display: 'block', mt: 0.5, fontSize: '0.6rem' }}
                              >
                                {step.pm_decisiondate
                                  ? `Decided: ${new Date(step.pm_decisiondate).toLocaleDateString()}`
                                  : step.pm_duedate
                                    ? `Due: ${new Date(step.pm_duedate).toLocaleDateString()}`
                                    : ''}
                              </Typography>
                            )}
                          </Box>
                        </StepLabel>
                      </Step>
                    )
                  })}
                </Stepper>
              )}
            </Box>

            {!isCompleted && (
              <Box sx={{ px: 3, pb: 3, borderTop: `1px solid ${theme.palette.divider}`, pt: 2 }}>
                <EntityApprovalTasks
                  entityId={entityId || instance.pm_entityid!}
                  moduleName={moduleName || instance.pm_entitytype || ''}
                  entityLabel=""
                  tabValue={0}
                  index={0}
                />
              </Box>
            )}
          </Paper>
        )
      })}
    </Box>
  )
}

export default WorkflowMilestone
