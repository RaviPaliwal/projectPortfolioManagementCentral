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
  Avatar,
  IconButton,
  Collapse,
  Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PersonIcon from '@mui/icons-material/Person'
import EventIcon from '@mui/icons-material/Event'
import TimelineIcon from '@mui/icons-material/Timeline'
import LayersIcon from '@mui/icons-material/Layers'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CreateIcon from '@mui/icons-material/Create'
import SecurityIcon from '@mui/icons-material/Security'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GroupIcon from '@mui/icons-material/Group'
import ShieldIcon from '@mui/icons-material/Shield'
import {
  fetchWorkflowInstancesForEntity,
  fetchWorkflowApprovalSteps,
  openApprovalStepTask,
  WORKFLOW_DECISION_EVENT,
  fetchWorkflowInstanceById,
  fetchWorkflowStepTemplates,
} from '@/services'
import type { WorkflowInstanceModel, WorkflowApprovalStepModel, WorkflowStepTemplateModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)).replace(/ /g, '-') : '—'

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
  ownerState: { completed?: boolean; active?: boolean; selected?: boolean }
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
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
  ...(ownerState.selected && {
    width: 48,
    height: 48,
    boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.25)}`,
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

/** Helper to map a running approval step to its phase name using step templates */
export const getStepPhase = (
  step: WorkflowApprovalStepModel,
  templates: WorkflowStepTemplateModel[]
): string => {
  const match = templates.find(
    (t) =>
      t.pm_steporder === step.pm_steporder ||
      (t.pm_workflowname &&
        step.pm_stepname &&
        t.pm_workflowname.trim().toLowerCase() === step.pm_stepname.trim().toLowerCase())
  )
  return match?.pm_workflowphase || 'Other'
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
  const [templatesByInstance, setTemplatesByInstance] = useState<Record<string, WorkflowStepTemplateModel[]>>({})
  const [selectedPhases, setSelectedPhases] = useState<Record<string, string>>({})
  const [collapsedInstances, setCollapsedInstances] = useState<Record<string, boolean>>({})
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
        const instance = await fetchWorkflowInstanceById(workflowInstanceId)
        if (instance) {
          workflowInstances = [instance]
        }
      } else if (moduleName && entityId) {
        // Fetch all instances for entity
        workflowInstances = await fetchWorkflowInstancesForEntity(moduleName, entityId)
      }
      
      setInstances(workflowInstances)

      const stepsMap: Record<string, WorkflowApprovalStepModel[]> = {}
      const templatesMap: Record<string, WorkflowStepTemplateModel[]> = {}

      if (workflowInstances.length > 0) {
        const results = await Promise.all(
          workflowInstances.map(async (inst) => {
            const steps = await fetchWorkflowApprovalSteps(inst.pm_workflowinstanceid!)
            let templates: WorkflowStepTemplateModel[] = []
            if (inst._pm_workflowlookup_value) {
              const res = await fetchWorkflowStepTemplates(inst._pm_workflowlookup_value)
              templates = res || []
            }
            return { instanceId: inst.pm_workflowinstanceid!, steps, templates }
          })
        )
        for (const result of results) {
          stepsMap[result.instanceId] = result.steps
          templatesMap[result.instanceId] = result.templates
        }
      }
      
      setStepsByInstance(stepsMap)
      setTemplatesByInstance(templatesMap)

      // Initialize default active phase for each instance
      setSelectedPhases((prev) => {
        const updated = { ...prev }
        for (const inst of workflowInstances) {
          const instId = inst.pm_workflowinstanceid!
          if (!updated[instId]) {
            const instSteps = stepsMap[instId] || []
            const instTemplates = templatesMap[instId] || []
            
            const phasesFromTemplates = Array.from(
              new Set(instTemplates.map((t) => t.pm_workflowphase).filter(Boolean))
            ) as string[]
            const hasOther = instSteps.some((s) => getStepPhase(s, instTemplates) === 'Other')
            const allPhases = [...phasesFromTemplates]
            if (hasOther && !allPhases.includes('Other')) allPhases.push('Other')
            if (allPhases.length === 0) allPhases.push('Workflow Steps')

            const activeStep = instSteps.find(
              (s) => String(s.pm_decisionstatus) === '1' || String(s.pm_decisionstatus) === '2'
            )
            let activePhase = activeStep ? getStepPhase(activeStep, instTemplates) : null
            if (!activePhase) {
              const firstUncompleted = allPhases.find(p => {
                const pSteps = instSteps.filter(s => getStepPhase(s, instTemplates) === p)
                return pSteps.length > 0 && !pSteps.every(s => String(s.pm_decisionstatus) === '0' || String(s.pm_decisionstatus) === '3')
              })
              activePhase = firstUncompleted || allPhases[0]
            }
            updated[instId] = activePhase
          }
        }
        return updated
      })
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
        const templates = templatesByInstance[instance.pm_workflowinstanceid!] || []
        const isCompleted = String(instance.pm_status) === '0'
        const hasActionableSteps = steps.some(s => String(s.pm_decisionstatus) === '2')

        // Resolve phases
        const phasesFromTemplates = Array.from(new Set(templates.map(t => t.pm_workflowphase).filter(Boolean))) as string[]
        const hasOther = steps.some(s => getStepPhase(s, templates) === 'Other')
        const allPhases = [...phasesFromTemplates]
        if (hasOther && !allPhases.includes('Other')) {
          allPhases.push('Other')
        }
        if (allPhases.length === 0) {
          allPhases.push('Workflow Steps')
        }

        // Active phase (where the active/pending step is)
        const activeStep = steps.find(
          (s) => String(s.pm_decisionstatus) === '1' || String(s.pm_decisionstatus) === '2'
        )
        const activePhaseName = activeStep ? getStepPhase(activeStep, templates) : null

        // Find the first phase that is not complete
        const firstUncompletedPhase = allPhases.find(p => {
          const pSteps = steps.filter(s => getStepPhase(s, templates) === p)
          return pSteps.length > 0 && !pSteps.every(s => String(s.pm_decisionstatus) === '0' || String(s.pm_decisionstatus) === '3')
        })
        const inferredActivePhase = activePhaseName || firstUncompletedPhase || null
        
        // Stepper active step index based on active phase
        const activePhaseStepperIndex = inferredActivePhase 
          ? allPhases.indexOf(inferredActivePhase) 
          : allPhases.length

        // Selected phase
        const defaultSelectedPhase = inferredActivePhase || allPhases[0]
        const selectedPhase = selectedPhases[instance.pm_workflowinstanceid!] || defaultSelectedPhase
        const selectedPhaseSteps = steps.filter(s => getStepPhase(s, templates) === selectedPhase)
        
        // Progress for details header
        const completedCount = selectedPhaseSteps.filter(s => String(s.pm_decisionstatus) === '0').length
        const totalCount = selectedPhaseSteps.length
        const isPhaseCompleted = totalCount > 0 && completedCount === totalCount
        const isSelectedActive = selectedPhase === inferredActivePhase
        const isCollapsed = collapsedInstances[instance.pm_workflowinstanceid!] ?? true

        const handlePhaseSelect = (instId: string, phaseName: string) => {
          setSelectedPhases(prev => {
            const currentSelected = prev[instId] || defaultSelectedPhase
            const isCurrentlyCollapsed = collapsedInstances[instId] ?? true
            if (currentSelected === phaseName) {
              setCollapsedInstances(cPrev => ({ ...cPrev, [instId]: !isCurrentlyCollapsed }))
            } else {
              setCollapsedInstances(cPrev => ({ ...cPrev, [instId]: false }))
            }
            return { ...prev, [instId]: phaseName }
          })
        }

        const handleToggleCollapse = (instId: string) => {
          setCollapsedInstances(prev => {
            const isCurrentlyCollapsed = prev[instId] ?? true
            return { ...prev, [instId]: !isCurrentlyCollapsed }
          })
        }

        return (
          <Paper key={instance.pm_workflowinstanceid} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* ── Phase-based Stepper ──────────────────────────── */}
            <Box sx={{ p: 4, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.01)' }}>
              <Stepper
                activeStep={activePhaseStepperIndex}
                alternativeLabel
                connector={<ColorlibConnector />}
                sx={{ flexWrap: 'wrap', gap: 0 }}
              >
                {allPhases.map((phase, index) => {
                  const pSteps = steps.filter(s => getStepPhase(s, templates) === phase)
                  const isPComplete = pSteps.length > 0 && pSteps.every(s => String(s.pm_decisionstatus) === '0' || String(s.pm_decisionstatus) === '3')
                  const isPActive = phase === inferredActivePhase
                  const isSelected = selectedPhase === phase

                  // Dynamic icon selection
                  let icon = <LayersIcon sx={{ fontSize: 20 }} />
                  const lower = phase.toLowerCase()
                  if (lower.includes('initiat') || lower.includes('setup') || lower.includes('plan')) {
                    icon = <AssignmentIcon sx={{ fontSize: 20 }} />
                  } else if (lower.includes('author') || lower.includes('execut') || lower.includes('design')) {
                    icon = <CreateIcon sx={{ fontSize: 20 }} />
                  } else if (lower.includes('review') || lower.includes('approv')) {
                    icon = <ShieldIcon sx={{ fontSize: 20 }} />
                  }

                  return (
                    <Step
                      key={phase}
                      completed={isPComplete}
                      active={isPActive}
                      onClick={() => handlePhaseSelect(instance.pm_workflowinstanceid!, phase)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <StepLabel
                        slots={{
                          stepIcon: () => (
                            <ColorlibStepIconRoot
                              ownerState={{ 
                                completed: isPComplete, 
                                active: isPActive,
                                selected: isSelected
                              }}
                              sx={{
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                ...(isSelected && {
                                  border: '3px solid',
                                  borderColor: 'primary.main',
                                }),
                                ...(isPComplete ? {
                                  backgroundColor: 'success.main',
                                  color: 'success.contrastText',
                                  boxShadow: `0 4px 10px 0 ${alpha(theme.palette.success.main, 0.3)}`,
                                } : isPActive ? {
                                  backgroundColor: 'info.main',
                                  color: 'info.contrastText',
                                  boxShadow: `0 4px 10px 0 ${alpha(theme.palette.info.main, 0.3)}`,
                                } : {
                                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
                                  color: '#fff',
                                })
                              }}
                            >
                              {icon}
                            </ColorlibStepIconRoot>
                          )
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isSelected || isPActive ? 800 : 500,
                            color: isPActive 
                              ? 'info.main' 
                              : isPComplete
                                ? 'success.main'
                                : 'text.secondary',
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: isSelected ? '0.85rem' : '0.8rem',
                          }}
                        >
                          {phase}
                        </Typography>
                      </StepLabel>
                    </Step>
                  )
                })}
              </Stepper>
            </Box>

            {/* ── Selected Phase steps details ─────────────────────────── */}
            <Box 
              sx={{ 
                m: 3, 
                borderRadius: '12px',
                border: isSelectedActive ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
                boxShadow: isSelectedActive 
                  ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`
                  : '0 2px 8px rgba(0,0,0,0.01)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Header Box */}
              <Box
                onClick={() => handleToggleCollapse(instance.pm_workflowinstanceid!)}
                sx={{
                  p: 2.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isSelectedActive
                    ? theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(219, 234, 254, 0.3) 0%, rgba(239, 246, 255, 0.4) 100%)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(30, 41, 59, 0.3)'
                      : 'rgba(247, 250, 252, 0.8)',
                  transition: 'background 0.2s',
                  '&:hover': {
                    background: isSelectedActive
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(239, 246, 255, 0.6) 100%)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.5)'
                        : 'rgba(241, 245, 249, 0.9)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Status Indicator Icon */}
                  {isPhaseCompleted ? (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                      <CheckCircleIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                  ) : isSelectedActive ? (
                    <CircularProgress size={24} thickness={5} sx={{ color: 'primary.main', p: 0.2 }} />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.grey[500], 0.1), color: 'text.disabled' }}>
                      <HourglassEmptyIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                      {selectedPhase}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isSelectedActive ? 'Active Phase' : isPhaseCompleted ? 'Completed Phase' : 'Expected'} · {completedCount} of {totalCount} steps completed
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  {isCollapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                </IconButton>
              </Box>

              {/* Collapsible Steps list */}
              <Collapse in={!isCollapsed}>
                <Box 
                  sx={{ 
                    borderTop: `1px solid ${theme.palette.divider}`, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.1)' : 'rgba(248, 250, 252, 0.4)', 
                    p: 3 
                  }}
                >
                  {selectedPhaseSteps.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                      No steps configured for this phase.
                    </Typography>
                  ) : (
                    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                      {selectedPhaseSteps.map((step, idx) => {
                        const decision = getDecisionConfig(step.pm_decisionstatus)
                        const isStepActionable = String(step.pm_decisionstatus) === '2'

                        let stepIcon = <HourglassEmptyIcon sx={{ fontSize: 16 }} />
                        if (String(step.pm_decisionstatus) === '0') {
                          stepIcon = <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        } else if (String(step.pm_decisionstatus) === '3') {
                          stepIcon = <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        }

                        return (
                          <Box
                            key={step.pm_workflowapprovalstepid || idx}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 3,
                              position: 'relative',
                              zIndex: 1,
                              ...(isStepActionable && {
                                cursor: 'pointer',
                                '&:hover .step-title-text': {
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                }
                              })
                            }}
                            onClick={() => isStepActionable && handleStepClick(step)}
                          >
                            {/* Vertical connector line segment to next step */}
                            {idx < selectedPhaseSteps.length - 1 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: 15,
                                  top: 32, // Starts from bottom of current avatar
                                  bottom: -28, // Spans gap down to top of next avatar
                                  width: 2,
                                  bgcolor: theme.palette.divider,
                                  zIndex: 0,
                                }}
                              />
                            )}
                            {/* Avatar Icon */}
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: String(step.pm_decisionstatus) === '0'
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : String(step.pm_decisionstatus) === '3'
                                    ? alpha(theme.palette.error.main, 0.1)
                                    : alpha(theme.palette.warning.main, 0.1),
                                color: String(step.pm_decisionstatus) === '0'
                                  ? 'success.main'
                                  : String(step.pm_decisionstatus) === '3'
                                    ? 'error.main'
                                    : 'warning.main',
                                border: '2px solid',
                                borderColor: 'background.paper',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              }}
                            >
                              {stepIcon}
                            </Avatar>

                            {/* Step Info */}
                            <Box sx={{ flex: 1, mt: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography className="step-title-text" variant="body2" sx={{ fontWeight: 700, color: 'text.primary', transition: 'color 0.2s' }}>
                                  {step.pm_stepname || `Step ${step.pm_steporder ?? idx + 1}`}
                                </Typography>
                                {isStepActionable && (
                                  <OpenInNewIcon sx={{ fontSize: 14, color: 'primary.main', opacity: 0.8 }} />
                                )}
                              </Box>
                              {step.pm_decisionnotes && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                  "{step.pm_decisionnotes}"
                                </Typography>
                              )}
                              {(step.pm_duedate || step.pm_decisiondate) && (
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                                  {step.pm_decisiondate
                                    ? `Decided: ${formatDate(step.pm_decisiondate)}`
                                    : step.pm_duedate
                                      ? `Due: ${formatDate(step.pm_duedate)}`
                                      : ''}
                                </Typography>
                              )}
                            </Box>

                            {/* Assignee display */}
                            {(step.pm_assigneedisplayname || step.pm_approvername) && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main', color: '#ffffff' }}>
                                  {(step.pm_assigneedisplayname || step.pm_approvername || '?')[0].toUpperCase()}
                                </Avatar>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                  {step.pm_assigneedisplayname || step.pm_approvername}
                                </Typography>
                              </Box>
                            )}

                            {/* Status Chip */}
                            <Box sx={{ minWidth: 90, display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                              <Chip
                                label={decision.label.toUpperCase()}
                                size="small"
                                color={decision.color}
                                variant="outlined"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.65rem',
                                  borderRadius: '4px',
                                  height: 22,
                                  px: 1,
                                }}
                              />
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>

            {!isCompleted && hasActionableSteps && (
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
