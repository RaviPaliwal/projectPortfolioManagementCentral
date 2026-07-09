import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Paper, Typography, TextField, Alert, Avatar,
  CircularProgress, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Autocomplete, Chip, Accordion, AccordionSummary, AccordionDetails,
  useTheme,
  alpha,
  Menu,
} from '@mui/material'

import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import TimerIcon from '@mui/icons-material/Timer'
import LayersIcon from '@mui/icons-material/Layers'
import TimelineIcon from '@mui/icons-material/Timeline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LockIcon from '@mui/icons-material/Lock'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LinkIcon from '@mui/icons-material/Link'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import { fontSizes } from '@/styles'
import {
  fetchWorkflowStepTemplates, createWorkflowStepTemplate,
  updateWorkflowStepTemplate, deleteWorkflowStepTemplate,
  fetchOwnerTeams,
} from '@/services'
import type { TeamOption as DataverseTeamOption } from '@/services'
import { useUser } from '@/context/UserContext'
import type { WorkflowModel, WorkflowStepTemplateModel } from '@/types/dataverse'
import { FORM_REGISTRY } from '@/constants/formRegistry'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Button, ConfirmDialog } from '@/components/common'
import { ChecklistConfigurationPanel } from '../components/ChecklistConfigurationPanel'
 
type TeamOptionUI = {
  value: string
  label: string
  description?: string
  type: 'team'
}

type UserOption = {
  value: string
  label: string
  jobtitle?: string
  email?: string
  type: 'user'
}

type AssigneeOption = TeamOptionUI | UserOption
 
interface Props {
  workflow: WorkflowModel
}
 
export default function WorkflowStepConfigPage({ workflow }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { allowed: canCreate } = useAuthorization('WORKFLOWS' as CrudModule, 'create')
  const { allowed: canEdit } = useAuthorization('WORKFLOWS' as CrudModule, 'update')
  const { allowed: canDelete } = useAuthorization('WORKFLOWS' as CrudModule, 'delete')

  const [steps, setSteps] = useState<WorkflowStepTemplateModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Custom phases added by user
  const [userPhases, setUserPhases] = useState<string[]>([])
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
 
  // Dialog state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WorkflowStepTemplateModel | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { users: assigneeList } = useUser()
  const [teams, setTeams] = useState<DataverseTeamOption[]>([])
  const [formData, setFormData] = useState({
    pm_workflowname: '', pm_steporder: 1, pm_assignetype: 0, pm_assigneeid: '',
    pm_description: '', pm_sladays: 5, new_formkey: '', pm_tasktype: 1,
    pm_workflowphase: '',
  })

  // Link to Phase state & handlers
  const [linkMenuAnchor, setLinkMenuAnchor] = useState<null | HTMLElement>(null)
  const [linkingStep, setLinkingStep] = useState<WorkflowStepTemplateModel | null>(null)

  const handleLinkMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, step: WorkflowStepTemplateModel) => {
    setLinkMenuAnchor(event.currentTarget)
    setLinkingStep(step)
  }

  const handleLinkMenuClose = () => {
    setLinkMenuAnchor(null)
    setLinkingStep(null)
  }

  const handleLinkStepToPhase = async (phase: string) => {
    if (!linkingStep?.pm_workflowsteptemplateid) return
    setActionLoading(true)
    try {
      const payload = {
        ...linkingStep,
        pm_workflowphase: phase,
        _pm_workflowlookup_value: workflow.pm_workflowid
      }
      await updateWorkflowStepTemplate(linkingStep.pm_workflowsteptemplateid, payload as any)
      setSuccessMsg(`Step linked to "${phase}" successfully.`)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadSteps()
    } catch {
      setError('Unable to link step to phase.')
    } finally {
      setActionLoading(false)
      handleLinkMenuClose()
    }
  }

  // Rearrange Phase handler
  const handleMovePhase = async (phaseName: string, direction: 'up' | 'down') => {
    const idx = activePhases.indexOf(phaseName)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= activePhases.length) return

    setLoading(true)
    setError(null)
    try {
      // Swap phases in the activePhases list
      const newPhasesOrder = [...activePhases]
      const temp = newPhasesOrder[idx]
      newPhasesOrder[idx] = newPhasesOrder[targetIdx]
      newPhasesOrder[targetIdx] = temp

      // 1. Group steps by their phase (using current steps list)
      const stepsByPhase: Record<string, WorkflowStepTemplateModel[]> = {}
      activePhases.forEach(p => {
        stepsByPhase[p] = steps.filter(s => s.pm_workflowphase?.trim() === p)
          .sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))
      })

      // 2. Build the new ordered flat list of steps
      const newOrderedSteps: WorkflowStepTemplateModel[] = []
      newPhasesOrder.forEach(p => {
        if (stepsByPhase[p]) {
          newOrderedSteps.push(...stepsByPhase[p])
        }
      })

      // 3. Update step orders in Dataverse
      let seq = 1
      const updatePromises = newOrderedSteps.map(async (step) => {
        if (step.pm_steporder !== seq && step.pm_workflowsteptemplateid) {
          await updateWorkflowStepTemplate(step.pm_workflowsteptemplateid, {
            pm_steporder: seq
          })
        }
        seq++
      })
      await Promise.all(updatePromises)

      // 4. Update the userPhases state order (only empty phases)
      const emptyPhasesInNewOrder = newPhasesOrder.filter(p => !stepsByPhase[p] || stepsByPhase[p].length === 0)
      setUserPhases(emptyPhasesInNewOrder)

      setSuccessMsg(`Phase "${phaseName}" moved ${direction} successfully.`)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadSteps()
    } catch (err) {
      console.error(err)
      setError(`Failed to move phase ${direction}.`)
    } finally {
      setLoading(false)
    }
  }

  // Rename Phase state & handlers
  const [showRenamePhaseDialog, setShowRenamePhaseDialog] = useState(false)
  const [renameOldPhaseName, setRenameOldPhaseName] = useState('')
  const [renameNewPhaseName, setRenameNewPhaseName] = useState('')

  const openRenamePhase = (phaseName: string) => {
    setRenameOldPhaseName(phaseName)
    setRenameNewPhaseName(phaseName)
    setShowRenamePhaseDialog(true)
  }

  const handleRenamePhase = async () => {
    const oldName = renameOldPhaseName.trim()
    const newName = renameNewPhaseName.trim()
    if (!oldName || !newName || oldName === newName) {
      setShowRenamePhaseDialog(false)
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      // Find all step templates with this phase
      const stepsToUpdate = steps.filter(s => s.pm_workflowphase === oldName)
      
      // Update each step template
      await Promise.all(stepsToUpdate.map(step => 
        updateWorkflowStepTemplate(step.pm_workflowsteptemplateid!, {
          ...step,
          pm_workflowphase: newName,
          _pm_workflowlookup_value: workflow.pm_workflowid
        } as any)
      ))

      // Update userPhases if present
      if (userPhases.includes(oldName)) {
        setUserPhases(p => p.map(x => x === oldName ? newName : x))
      }

      setSuccessMsg(`Phase "${oldName}" renamed to "${newName}" successfully.`)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadSteps()
    } catch {
      setError('Failed to rename phase.')
    } finally {
      setActionLoading(false)
      setShowRenamePhaseDialog(false)
    }
  }
 
  // Load steps
  const loadSteps = useCallback(async () => {
    setLoading(true)
    try {
      const all = await fetchWorkflowStepTemplates(workflow.pm_workflowid)
      setSteps(all)
    } catch {
      setError('Failed to load step templates.')
    } finally {
      setLoading(false)
    }
  }, [workflow.pm_workflowid])
 
  // Init load — reload steps each time the component mounts/re-renders
  useEffect(() => { loadSteps() }, [loadSteps])

  // Fetch teams for team-assignment dropdown
  useEffect(() => {
    fetchOwnerTeams().then(setTeams).catch(() => {})
  }, [])

 
  const sortedSteps = [...steps].sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))

  const activePhases = useMemo(() => {
    const fromSteps = steps
      .map(s => s.pm_workflowphase?.trim())
      .filter((v): v is string => !!v && v !== '')
    return Array.from(new Set([...fromSteps, ...userPhases]))
  }, [steps, userPhases])

  const groupedSteps = useMemo(() => {
    const groups: Record<string, WorkflowStepTemplateModel[]> = {}
    activePhases.forEach(p => {
      groups[p] = []
    })
    groups.Other = []

    steps.forEach((step) => {
      const phase = step.pm_workflowphase?.trim()
      if (phase && activePhases.includes(phase)) {
        groups[phase].push(step)
      } else {
        groups.Other.push(step)
      }
    })
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))
    })
    return groups
  }, [steps, activePhases])
 
  const openCreate = (defaultPhase?: string) => {
    setEditing(null)
    setFormData({
      pm_workflowname: '', pm_steporder: (steps.length) + 1, pm_assignetype: 0,
      pm_assigneeid: '', pm_description: '', pm_sladays: 5, new_formkey: '', pm_tasktype: 1,
      pm_workflowphase: defaultPhase || '',
    })
    setShowForm(true)
  }
 
  const openEdit = (step: WorkflowStepTemplateModel) => {
    setEditing(step)
    setFormData({
      pm_workflowname: step.pm_workflowname ?? '',
      pm_steporder: step.pm_steporder ?? 1,
      pm_assignetype: Number(step.pm_assignetype) || 0,
      pm_assigneeid: step.pm_assigneeid ?? '',
      pm_description: step.pm_description ?? '',
      pm_sladays: step.pm_sladays ?? 5,
      new_formkey: step.new_formkey ?? '',
      pm_tasktype: Number(step.pm_tasktype) || 1,
      pm_workflowphase: step.pm_workflowphase ?? '',
    })
    setShowForm(true)
  }
 
  const handleSave = async () => {
    if (!formData.pm_workflowname.trim()) { setError('Step name is required.'); return }
    setError(null)
    setActionLoading(true)
    try {
      const payload = { ...formData, _pm_workflowlookup_value: workflow.pm_workflowid }
      if (editing?.pm_workflowsteptemplateid) {
        await updateWorkflowStepTemplate(editing.pm_workflowsteptemplateid, payload as any)
        setSuccessMsg('Step updated successfully.')
      } else {
        await createWorkflowStepTemplate(payload as any)
        setSuccessMsg('Step created successfully.')
      }
      setShowForm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadSteps()
    } catch {
      setError('Unable to save step.')
    } finally {
      setActionLoading(false)
    }
  }
 
  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteWorkflowStepTemplate(deleteConfirm)
      setSuccessMsg('Step deleted successfully.')
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadSteps()
    } catch {
      setError('Unable to delete step.')
    } finally {
      setActionLoading(false)
    }
  }
 
  return (
    <Box>
      {/* Toolbar: step count and actions */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2, mb: 3,
        px: 0.5,
      }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {steps.length} step{steps.length !== 1 ? 's' : ''} configured
          </Typography>
          {steps.length > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 400 }}>
              Grouped by phase container
            </Typography>
          )}
        </Box>
        {canCreate && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowAddPhaseDialog(true)}
              sx={{ fontWeight: 600, textTransform: 'none', px: 2 }}>
              Add Phase
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate('')}
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, fontWeight: 600, textTransform: 'none', px: 2.5, boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
              Add Step
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
 
      {/* Empty State */}
      {!loading && activePhases.length === 0 && steps.length === 0 && (
        <Paper sx={{
          p: 6, textAlign: 'center', borderRadius: 1.5,
          border: '2px dashed', borderColor: 'divider',
          bgcolor: 'transparent',
        }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#f3e8ff', borderRadius: 1.5 }}>
            <SettingsIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
          </Avatar>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>No Phases or Steps Configured</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
            Add a phase container first, then configure step templates under it.
          </Typography>
          {canCreate && (
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowAddPhaseDialog(true)}
                sx={{ fontWeight: 600, textTransform: 'none', px: 2.5 }}>
                Add Phase
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate('')}
                sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, fontWeight: 600, textTransform: 'none', px: 3, boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
                Configure First Step
              </Button>
            </Box>
          )}
        </Paper>
      )}
 
      {/* Step List */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading steps...</Typography>
        </Box>
      )}
 
      {!loading && (activePhases.length > 0 || groupedSteps.Other.length > 0) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activePhases.map((phaseName) => {
            const phaseSteps = groupedSteps[phaseName] || []
            
            let color = '#8b5cf6'
            let icon = <LayersIcon sx={{ color: '#8b5cf6' }} />
            
            const lower = phaseName.toLowerCase()
            if (lower.includes('initiat')) {
              color = '#f59e0b'
              icon = <LayersIcon sx={{ color: '#f59e0b' }} />
            } else if (lower.includes('plann')) {
              color = '#0ea5e9'
              icon = <TimelineIcon sx={{ color: '#0ea5e9' }} />
            } else if (lower.includes('execut')) {
              color = '#22c55e'
              icon = <CheckCircleIcon sx={{ color: '#22c55e' }} />
            } else if (lower.includes('clos') || lower.includes('end')) {
              color = '#8b5cf6'
              icon = <LockIcon sx={{ color: '#8b5cf6' }} />
            }
            
            return (
              <Accordion 
                key={phaseName} 
                defaultExpanded={phaseSteps.length > 0 || userPhases.includes(phaseName)}
                sx={{
                  borderRadius: '12px !important',
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                  border: `1px solid ${theme.palette.divider}`,
                  borderLeft: `6px solid ${color}`,
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)' 
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 100%)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.45)' : '0 8px 24px rgba(139, 92, 246, 0.08)',
                    borderColor: alpha(color, 0.3)
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    borderBottom: phaseSteps.length > 0 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&.Mui-expanded': {
                      minHeight: 48,
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {icon}
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                        {phaseName}
                      </Typography>
                      {canEdit && (
                        <>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              openRenamePhase(phaseName)
                            }}
                            sx={{
                              opacity: 0.5,
                              transition: 'opacity 0.2s',
                              '&:hover': { opacity: 1, bgcolor: 'action.hover' },
                              p: 0.5,
                              ml: -0.5
                            }}
                            title="Rename Phase"
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={activePhases.indexOf(phaseName) === 0}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMovePhase(phaseName, 'up')
                            }}
                            sx={{
                              opacity: activePhases.indexOf(phaseName) === 0 ? 0.25 : 0.5,
                              transition: 'opacity 0.2s',
                              '&:hover': { opacity: 1, bgcolor: 'action.hover' },
                              p: 0.5,
                            }}
                            title="Move Phase Up"
                          >
                            <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={activePhases.indexOf(phaseName) === activePhases.length - 1}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMovePhase(phaseName, 'down')
                            }}
                            sx={{
                              opacity: activePhases.indexOf(phaseName) === activePhases.length - 1 ? 0.25 : 0.5,
                              transition: 'opacity 0.2s',
                              '&:hover': { opacity: 1, bgcolor: 'action.hover' },
                              p: 0.5,
                            }}
                            title="Move Phase Down"
                          >
                            <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </>
                      )}
                      <Chip 
                        label={`${phaseSteps.length} step${phaseSteps.length !== 1 ? 's' : ''}`}
                        size="small" 
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </Box>
                    {canCreate && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation()
                          openCreate(phaseName)
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}
                      >
                        Add Step
                      </Button>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.2)' : 'rgba(248, 250, 252, 0.5)' }}>
                  {phaseSteps.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic' }}>
                      No steps configured for this phase. Click "Add Step" to add one.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {phaseSteps.map((step, idx) => (
                        <Paper 
                          key={step.pm_workflowsteptemplateid} 
                          className="step-card"
                          variant="outlined"
                          sx={{
                            p: 2.25,
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2.5,
                            borderRadius: '10px',
                            border: `1px solid ${theme.palette.divider}`,
                            bgcolor: isDark ? 'background.paper' : '#ffffff',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 6px 18px rgba(0,0,0,0.04)',
                              borderColor: alpha(color, 0.5),
                              transform: 'translateY(-2px)',
                              bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
                            },
                          }}
                        >
                          <Avatar sx={{
                            width: 36, 
                            height: 36,
                            bgcolor: color,
                            color: '#ffffff',
                            fontSize: '0.85rem', 
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                          }}>
                            {step.pm_steporder ?? idx + 1}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {step.pm_workflowname ?? 'Unnamed'}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                icon={Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 14 }} /> : <PersonIcon sx={{ fontSize: 14 }} />}
                                label={`${Number(step.pm_assignetype) === 1 ? 'Team' : 'User'}: ${(() => {
                                  if (Number(step.pm_assignetype) === 1) {
                                    const found = teams.find((t) => t.id === step.pm_assigneeid)
                                    return found ? found.name : (step.pm_assigneeid || 'Not set')
                                  }
                                  const found = assigneeList.find((u) => u.systemuserid === step.pm_assigneeid)
                                  return found ? found.fullname : (step.pm_assigneeid || 'Not set')
                                })()}`}
                                sx={{
                                  height: 22,
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  bgcolor: Number(step.pm_assignetype) === 1 ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.primary.main, 0.06),
                                  color: Number(step.pm_assignetype) === 1 ? 'warning.dark' : 'primary.dark',
                                  border: '1px solid',
                                  borderColor: Number(step.pm_assignetype) === 1 ? alpha(theme.palette.warning.main, 0.15) : alpha(theme.palette.primary.main, 0.12),
                                }}
                              />
                              {step.pm_sladays != null && step.pm_sladays > 0 && (
                                <Chip
                                  size="small"
                                  icon={<TimerIcon sx={{ fontSize: 14 }} />}
                                  label={`${step.pm_sladays}d SLA`}
                                  sx={{
                                    height: 22,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    bgcolor: alpha(theme.palette.error.main, 0.06),
                                    color: 'error.main',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.error.main, 0.12),
                                  }}
                                />
                              )}
                              {step.new_formkey && (
                                <Chip
                                  size="small"
                                  icon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                                  label={`Form: ${(() => {
                                    const formEntry = FORM_REGISTRY.find(f => f.key === step.new_formkey)
                                    return formEntry ? formEntry.displayName : step.new_formkey
                                  })()}`}
                                  sx={{
                                    height: 22,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    bgcolor: alpha(theme.palette.info.main, 0.06),
                                    color: 'info.main',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.info.main, 0.12),
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 0.75, 
                            opacity: 0, 
                            transform: 'translateX(10px)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '.step-card:hover &': {
                              opacity: 1,
                              transform: 'translateX(0)',
                            }
                          }}>
                            {canEdit && (
                              <IconButton size="small" title="Link to Phase" onClick={(e) => handleLinkMenuOpen(e, step)} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                                <LinkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                              </IconButton>
                            )}
                            {canEdit && (
                              <IconButton size="small" title="Edit Step" onClick={() => openEdit(step)} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                            {canDelete && (
                              <IconButton size="small" title="Delete Step" color="error" onClick={() => setDeleteConfirm(step.pm_workflowsteptemplateid!)} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}

          {/* Unlinked Steps */}
          {groupedSteps.Other.length > 0 && (
            <Accordion 
              defaultExpanded
              sx={{
                borderRadius: '12px !important',
                overflow: 'hidden',
                '&:before': { display: 'none' },
                border: `1px solid ${theme.palette.divider}`,
                borderLeft: '6px solid #64748b',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)' 
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.45)' : '0 8px 24px rgba(100, 116, 139, 0.08)',
                  borderColor: 'rgba(100, 116, 139, 0.3)'
                }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <SettingsIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    General / Unlinked Steps
                  </Typography>
                  <Chip 
                    label={`${groupedSteps.Other.length} step${groupedSteps.Other.length !== 1 ? 's' : ''}`}
                    size="small" 
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.2)' : 'rgba(248, 250, 252, 0.5)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {groupedSteps.Other.map((step, idx) => (
                    <Paper 
                      key={step.pm_workflowsteptemplateid} 
                      className="step-card"
                      variant="outlined"
                      sx={{
                        p: 2.25,
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2.5,
                        borderRadius: '10px',
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: isDark ? 'background.paper' : '#ffffff',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 6px 18px rgba(0,0,0,0.04)',
                          borderColor: 'rgba(100, 116, 139, 0.5)',
                          transform: 'translateY(-2px)',
                          bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
                        },
                      }}
                    >
                      <Avatar sx={{
                        width: 36, 
                        height: 36,
                        bgcolor: '#64748b',
                        color: '#ffffff',
                        fontSize: '0.85rem', 
                        fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      }}>
                        {step.pm_steporder ?? idx + 1}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {step.pm_workflowname ?? 'Unnamed'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            icon={Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 14 }} /> : <PersonIcon sx={{ fontSize: 14 }} />}
                            label={`${Number(step.pm_assignetype) === 1 ? 'Team' : 'User'}: ${(() => {
                              if (Number(step.pm_assignetype) === 1) {
                                const found = teams.find((t) => t.id === step.pm_assigneeid)
                                return found ? found.name : (step.pm_assigneeid || 'Not set')
                              }
                              const found = assigneeList.find((u) => u.systemuserid === step.pm_assigneeid)
                              return found ? found.fullname : (step.pm_assigneeid || 'Not set')
                            })()}`}
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              bgcolor: Number(step.pm_assignetype) === 1 ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.primary.main, 0.06),
                              color: Number(step.pm_assignetype) === 1 ? 'warning.dark' : 'primary.dark',
                              border: '1px solid',
                              borderColor: Number(step.pm_assignetype) === 1 ? alpha(theme.palette.warning.main, 0.15) : alpha(theme.palette.primary.main, 0.12),
                            }}
                          />
                          {step.pm_sladays != null && step.pm_sladays > 0 && (
                            <Chip
                              size="small"
                              icon={<TimerIcon sx={{ fontSize: 14 }} />}
                              label={`${step.pm_sladays}d SLA`}
                              sx={{
                                height: 22,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                bgcolor: alpha(theme.palette.error.main, 0.06),
                                color: 'error.main',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.error.main, 0.12),
                              }}
                            />
                          )}
                          {step.new_formkey && (
                            <Chip
                              size="small"
                              icon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                              label={`Form: ${(() => {
                                const formEntry = FORM_REGISTRY.find(f => f.key === step.new_formkey)
                                return formEntry ? formEntry.displayName : step.new_formkey
                              })()}`}
                              sx={{
                                height: 22,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                bgcolor: alpha(theme.palette.info.main, 0.06),
                                color: 'info.main',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.info.main, 0.12),
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 0.75, 
                        opacity: 0, 
                        transform: 'translateX(10px)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        '.step-card:hover &': {
                          opacity: 1,
                          transform: 'translateX(0)',
                        }
                      }}>
                        {canEdit && (
                          <IconButton size="small" title="Link to Phase" onClick={(e) => handleLinkMenuOpen(e, step)} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                            <LinkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                          </IconButton>
                        )}
                        {canEdit && (
                          <IconButton size="small" title="Edit Step" onClick={() => openEdit(step)} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {canDelete && (
                          <IconButton size="small" title="Delete Step" color="error" onClick={() => setDeleteConfirm(step.pm_workflowsteptemplateid!)} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}
 
      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onClose={() => !actionLoading && setShowForm(false)} maxWidth="lg" fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
            },
          },
        }}>
        {/* Header */}
        <DialogTitle sx={{
          fontWeight: 700, fontSize: '1.1rem', pb: 1,
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: isDark ? 'linear-gradient(135deg, #1e1e2d 0%, #151521 100%)' : 'linear-gradient(135deg, #f8f9ff 0%, #fff 100%)',
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
            {editing ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <SettingsIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }}>
              {editing ? 'Edit Step Template' : 'Create Step Template'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400, fontSize: '0.75rem' }}>
              {workflow.pm_workflowname}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 0.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Step Name" required fullWidth size="small" value={formData.pm_workflowname}
                onChange={(e) => setFormData((f) => ({ ...f, pm_workflowname: e.target.value }))}
                placeholder="e.g. PMO Review" />

              <TextField label="Description" fullWidth multiline rows={2} size="small" value={formData.pm_description}
                onChange={(e) => setFormData((f) => ({ ...f, pm_description: e.target.value }))}
                sx={{ gridColumn: '1 / -1' }} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
              <TextField label="Order" type="number" size="small" value={formData.pm_steporder}
                onChange={(e) => setFormData((f) => ({ ...f, pm_steporder: Number(e.target.value) }))} />
              <TextField label="SLA Days" type="number" size="small" value={formData.pm_sladays}
                onChange={(e) => setFormData((f) => ({ ...f, pm_sladays: Number(e.target.value) }))} />
              <FormControl size="small">
                <InputLabel id="workflow-step-assignee-type-label">Assignee Type</InputLabel>
                <Select
                  id="workflow-step-assignee-type-select"
                  labelId="workflow-step-assignee-type-label"
                  value={formData.pm_assignetype}
                  label="Assignee Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_assignetype: e.target.value as number, pm_assigneeid: '' }))}>
                  <MenuItem value={0}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 16 }} /> Individual User
                    </Box>
                  </MenuItem>
                  <MenuItem value={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon sx={{ fontSize: 16 }} /> Team / Group
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <Autocomplete
                freeSolo
                size="small"
                options={activePhases}
                value={formData.pm_workflowphase || ''}
                onChange={(_, newValue) => {
                  setFormData(f => ({ ...f, pm_workflowphase: newValue || '' }))
                }}
                onInputChange={(_, newInputValue) => {
                  setFormData(f => ({ ...f, pm_workflowphase: newInputValue || '' }))
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Workflow Phase" placeholder="Select or type a phase..." />
                )}
              />
            </Box>

            {(() => {
              const isTeam = Number(formData.pm_assignetype) === 1
              const allOptions: AssigneeOption[] = isTeam
                ? teams.map(t => ({ value: t.id, label: t.name, description: t.description, type: 'team' as const }))
                : assigneeList.map(u => ({ value: u.systemuserid, label: u.fullname || '', jobtitle: u.jobtitle, email: u.internalemailaddress, type: 'user' as const }))
              const selected: AssigneeOption | null = allOptions.find(o => o.value === formData.pm_assigneeid) || null
              return (
                <Autocomplete<AssigneeOption, false, false, false>
                  fullWidth
                  size="small"
                  value={selected}
                  onChange={(_, newVal) => setFormData(f => ({ ...f, pm_assigneeid: newVal?.value || '' }))}
                  options={allOptions}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(o, v) => o.value === v.value}
                  noOptionsText={isTeam ? 'No teams found' : 'No users found'}
                  sx={{}}
                  renderInput={(params) => (
                    <TextField {...params} label={isTeam ? 'Team' : 'Assignee'} placeholder={isTeam ? 'Search teams...' : 'Search users...'} />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props
                    if (option.type === 'team') {
                      return (
                        <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'warning.main' }}>
                            <GroupIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{option.label}</Typography>
                            {option.description && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{option.description}</Typography>}
                          </Box>
                        </Box>
                      )
                    }
                    return (
                      <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'primary.main' }}>
                          {option.label?.charAt(0)?.toUpperCase() ?? '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{option.label}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            {(option as any).jobtitle && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{(option as any).jobtitle}</Typography>}
                            {(option as any).email && (
                              <>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>.</Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{(option as any).email}</Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )
                  }}
                />
              )
            })()}

            <FormControl fullWidth size="small">
              <InputLabel id="workflow-step-tasktype-label">Task Type</InputLabel>
              <Select
                id="workflow-step-tasktype-select"
                labelId="workflow-step-tasktype-label"
                value={formData.pm_tasktype}
                label="Task Type"
                onChange={(e) => setFormData((f) => ({ ...f, pm_tasktype: Number(e.target.value) }))}
              >
                <MenuItem value={1}>Custom (Form)</MenuItem>
                <MenuItem value={2}>Checklist</MenuItem>
              </Select>
            </FormControl>

            {/* Custom Form Key Input */}
            {formData.pm_tasktype === 1 && (
              <TextField
                fullWidth
                size="small"
                label="Form Key"
                placeholder="e.g. CHECKLIST_APPROVAL_TASK"
                value={formData.new_formkey}
                onChange={(e) => setFormData((f) => ({ ...f, new_formkey: e.target.value }))}
              />
            )}

            {formData.pm_tasktype === 2 && (
              <Box sx={{ mt: 1 }}>
                {editing?.pm_workflowsteptemplateid ? (
                  <ChecklistConfigurationPanel stepTemplateId={editing.pm_workflowsteptemplateid} />
                ) : (
                  <Alert severity="info">
                    Please save this step first before configuring checklist items.
                  </Alert>
                )}
              </Box>
            )}

          </Box>
        </DialogContent>

        <DialogActions sx={{
          p: 2.5, gap: 1,
          borderTop: '1px solid', borderColor: 'divider',
          bgcolor: isDark ? 'background.paper' : '#fafafa',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              {editing ? 'Modify the step details below.' : 'Fill in the details for the new step.'}
            </Typography>
          </Box>
          <Button onClick={() => setShowForm(false)} variant="outlined" disabled={actionLoading} sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.pm_workflowname.trim() || actionLoading}
            sx={{
              bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' },
              fontWeight: 600, textTransform: 'none', px: 3,
            }}>
            {actionLoading ? 'Saving...' : editing ? 'Update Step' : 'Create Step'}
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Step Template"
        message="Are you sure? This cannot be undone."
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
        loading={actionLoading}
        confirmColor="error"
      />

      {/* Add Phase Dialog */}
      <Dialog open={showAddPhaseDialog} onClose={() => setShowAddPhaseDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Phase</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label="Phase Name"
            fullWidth
            size="small"
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="e.g. Design Phase"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowAddPhaseDialog(false)} variant="outlined">Cancel</Button>
          <Button 
            onClick={() => {
              const name = newPhaseName.trim()
              if (name && !activePhases.includes(name)) {
                setUserPhases(p => [...p, name])
                setSuccessMsg(`Phase "${name}" added successfully.`)
                setTimeout(() => setSuccessMsg(null), 3000)
              }
              setNewPhaseName('')
              setShowAddPhaseDialog(false)
            }} 
            variant="contained" 
            disabled={!newPhaseName.trim()}
          >
            Add Phase
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link to Phase Menu */}
      <Menu
        anchorEl={linkMenuAnchor}
        open={Boolean(linkMenuAnchor) && !!linkingStep}
        onClose={handleLinkMenuClose}
      >
        <MenuItem disabled sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Link Step to Phase
        </MenuItem>
        {activePhases.length === 0 ? (
          <MenuItem disabled>No active phases. Add a phase first.</MenuItem>
        ) : (
          activePhases.map((phase) => (
            <MenuItem key={phase} onClick={() => handleLinkStepToPhase(phase)}>
              {phase}
            </MenuItem>
          ))
        )}
      </Menu>

      {/* Rename Phase Dialog */}
      <Dialog open={showRenamePhaseDialog} onClose={() => setShowRenamePhaseDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Rename Phase</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Renaming this phase will update all steps currently mapped to it.
          </Typography>
          <TextField
            autoFocus
            label="New Phase Name"
            fullWidth
            size="small"
            value={renameNewPhaseName}
            onChange={(e) => setRenameNewPhaseName(e.target.value)}
            placeholder="e.g. Analysis Phase"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowRenamePhaseDialog(false)} variant="outlined">Cancel</Button>
          <Button 
            onClick={handleRenamePhase} 
            variant="contained" 
            disabled={!renameNewPhaseName.trim() || renameNewPhaseName.trim() === renameOldPhaseName}
          >
            Rename Phase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}