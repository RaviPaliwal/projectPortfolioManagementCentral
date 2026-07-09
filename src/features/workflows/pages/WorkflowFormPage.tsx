import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Box, Paper, Typography, TextField, Stepper, Step, StepLabel,
  Alert, Avatar, Divider, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Stack, Chip, Accordion, AccordionSummary, AccordionDetails,
  useTheme,
  Grid,
  IconButton,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Menu,
} from '@mui/material'
 
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SettingsIcon from '@mui/icons-material/Settings'
import PublishIcon from '@mui/icons-material/Publish'
import DescriptionIcon from '@mui/icons-material/Description'
import LayersIcon from '@mui/icons-material/Layers'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import TimerIcon from '@mui/icons-material/Timer'
import HistoryIcon from '@mui/icons-material/History'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TimelineIcon from '@mui/icons-material/Timeline'
import LockIcon from '@mui/icons-material/Lock'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LinkIcon from '@mui/icons-material/Link'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

import { fontSizes } from '@/styles'
import {
  createWorkflow, updateWorkflow,
  fetchWorkflowStepTemplates, createWorkflowStepTemplate,
  updateWorkflowStepTemplate, deleteWorkflowStepTemplate,
  fetchOwnerTeams,
} from '@/services'
import type { TeamOption } from '@/services'
import { useUser } from '@/context/UserContext'
import type { WorkflowModel, WorkflowStepTemplateModel } from '@/types/dataverse'
import { StatusTag, Button } from '@/components/common'
import { getModuleOptionsForWorkflow } from '@/constants/moduleNames'
import { FORM_REGISTRY } from '@/constants/formRegistry'
import { ChecklistConfigurationPanel } from './../components/ChecklistConfigurationPanel'

const STEPS_CREATE = ['Basic Information', 'Approval Steps', 'Workflow Settings', 'Review & Create']
const STEPS_EDIT = ['Basic Information', 'Approval Steps', 'Workflow Settings', 'Review & Save']

const MODULES = getModuleOptionsForWorkflow()

type AssigneeOption = { value: string; label: string; type: 'user' | 'team'; jobtitle?: string; email?: string }

interface Props {
  workflow?: WorkflowModel
  onStepChange?: (step: number) => void
  onCreated?: () => void
  onSaved?: () => void
}
export default function WorkflowFormPage({ workflow, onStepChange, onCreated, onSaved }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users: assigneeList } = useUser()
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isEdit = !!workflow
  const STEPS = isEdit ? STEPS_EDIT : STEPS_CREATE
  const currentVersion = isEdit ? Number((workflow as any).pm_version) || 1 : 1
  const nextVersion = currentVersion + 1

  const [f, setF] = useState({
    pm_workflowname: workflow?.pm_workflowname ?? '',
    pm_workflowdescription: (workflow as any)?.pm_workflowdescription ?? '',
    pm_module: (workflow as any)?.pm_module ?? '',
    pm_isactive: workflow?.pm_isactive ?? true,
    pm_workflowstatus: isEdit ? Number(workflow!.pm_workflowstatus) || 0 : 0,
  })

  const [stepTemplates, setStepTemplates] = useState<WorkflowStepTemplateModel[]>([])
  const [userPhases, setUserPhases] = useState<string[]>([])
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [originalStepIds, setOriginalStepIds] = useState<Set<string>>(new Set())
  const [showStepForm, setShowStepForm] = useState(false)
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null)
  const [stepFormData, setStepFormData] = useState({
    pm_workflowname: '', pm_steporder: 1, pm_assignetype: 0, pm_assigneeid: '',
    pm_description: '', pm_sladays: 5, new_formkey: '', pm_tasktype: 1,
    pm_workflowphase: '',
  })

  // Link to Phase state & handlers for wizard
  const [linkMenuAnchor, setLinkMenuAnchor] = useState<null | HTMLElement>(null)
  const [linkingStepIdx, setLinkingStepIdx] = useState<number | null>(null)

  const handleLinkMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, idx: number) => {
    setLinkMenuAnchor(event.currentTarget)
    setLinkingStepIdx(idx)
  }

  const handleLinkMenuClose = () => {
    setLinkMenuAnchor(null)
    setLinkingStepIdx(null)
  }

  const handleLinkStepToPhase = (phase: string) => {
    if (linkingStepIdx === null) return
    const updated = [...stepTemplates]
    updated[linkingStepIdx] = {
      ...updated[linkingStepIdx],
      pm_workflowphase: phase
    }
    setStepTemplates(updated)
    handleLinkMenuClose()
  }

  // Rename Phase state & handlers for wizard
  const [showRenamePhaseDialog, setShowRenamePhaseDialog] = useState(false)
  const [renameOldPhaseName, setRenameOldPhaseName] = useState('')
  const [renameNewPhaseName, setRenameNewPhaseName] = useState('')

  const openRenamePhase = (phaseName: string) => {
    setRenameOldPhaseName(phaseName)
    setRenameNewPhaseName(phaseName)
    setShowRenamePhaseDialog(true)
  }

  const handleRenamePhase = () => {
    const oldName = renameOldPhaseName.trim()
    const newName = renameNewPhaseName.trim()
    if (!oldName || !newName || oldName === newName) {
      setShowRenamePhaseDialog(false)
      return
    }

    // Update all step templates with this phase locally
    const updated = stepTemplates.map(s => 
      s.pm_workflowphase === oldName 
        ? { ...s, pm_workflowphase: newName } 
        : s
    )
    setStepTemplates(updated)

    // Update userPhases if present
    if (userPhases.includes(oldName)) {
      setUserPhases(p => p.map(x => x === oldName ? newName : x))
    }

    setShowRenamePhaseDialog(false)
  }
  const u = useCallback((k: string, v: unknown) => setF((p) => ({ ...p, [k]: v })), [])

  useEffect(() => { onStepChange?.(activeStep) }, [activeStep, onStepChange])
  useEffect(() => {
    if (isEdit && workflow) {
      const loadData = async () => {
        setLoadingSteps(true)
        try {
          const [stList, teamList] = await Promise.all([
            fetchWorkflowStepTemplates(workflow.pm_workflowid),
            fetchOwnerTeams()
          ])
          setStepTemplates(stList)
          setOriginalStepIds(new Set(stList.map(s => s.pm_workflowsteptemplateid!).filter(Boolean)))
          setTeams(teamList)
        } catch {
          setError('Failed to load workflow steps.')
        } finally {
          setLoadingSteps(false)
        }
      }
      loadData()
    } else {
      fetchOwnerTeams().then(setTeams).catch(() => { })
    }
  }, [isEdit, workflow])
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (isEdit && workflow) {
        await updateWorkflow(workflow.pm_workflowid!, {
          pm_workflowname: f.pm_workflowname,
          pm_workflowdescription: f.pm_workflowdescription,
          pm_module: f.pm_module,
          pm_isactive: f.pm_isactive,
          pm_workflowstatus: f.pm_isactive ? 0 : 1,
          pm_version: nextVersion,
        } as any)

        const currentStepIds = new Set(stepTemplates.map(s => s.pm_workflowsteptemplateid).filter(Boolean))
        const toDelete = Array.from(originalStepIds).filter(id => !currentStepIds.has(id))
        await Promise.all(toDelete.map(id => deleteWorkflowStepTemplate(id)))

        await Promise.all(stepTemplates.map((step, idx) => {
          const payload = { ...step, pm_steporder: idx + 1, _pm_workflowlookup_value: workflow.pm_workflowid }
          if (step.pm_workflowsteptemplateid) {
            return updateWorkflowStepTemplate(step.pm_workflowsteptemplateid, payload as any)
          }
          return createWorkflowStepTemplate(payload as any)
        }))

        setDone(true)
        setTimeout(() => onSaved?.(), 1500)
      } else {
        const payload = {
          pm_workflowname: f.pm_workflowname,
          pm_workflowdescription: f.pm_workflowdescription,
          pm_module: f.pm_module,
          pm_isactive: f.pm_isactive,
          pm_workflowstatus: f.pm_isactive ? 0 : 1,
          pm_version: 1,
        }
        const result = await createWorkflow(payload as any)
        if (!result?.pm_workflowid) {
          setError('Workflow creation failed.')
          setSaving(false)
          return
        }
        await Promise.all(stepTemplates.map((step, idx) => {
          return createWorkflowStepTemplate({
            ...step, pm_steporder: idx + 1, _pm_workflowlookup_value: result.pm_workflowid,
          } as any)
        }))
        setDone(true)
        setTimeout(() => onCreated?.(), 1500)
      }
    } catch {
      setError(isEdit ? 'Failed to update workflow.' : 'Failed to create workflow.')
    } finally {
      setSaving(false)
    }
  }

  const activePhases = useMemo(() => {
    const fromSteps = stepTemplates
      .map(s => s.pm_workflowphase?.trim())
      .filter((v): v is string => !!v && v !== '')
    return Array.from(new Set([...fromSteps, ...userPhases]))
  }, [stepTemplates, userPhases])

  const groupedSteps = useMemo(() => {
    const groups: Record<string, WorkflowStepTemplateModel[]> = {}
    activePhases.forEach(p => {
      groups[p] = []
    })
    groups.Other = []

    stepTemplates.forEach((step) => {
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
  }, [stepTemplates, activePhases])

  const openAddStep = (defaultPhase?: string) => {
    setEditingStepIdx(null)
    setStepFormData({
      pm_workflowname: '', pm_steporder: stepTemplates.length + 1, pm_assignetype: 0,
      pm_assigneeid: '', pm_description: '', pm_sladays: 5, new_formkey: '', pm_tasktype: 1,
      pm_workflowphase: defaultPhase || '',
    })
    setShowStepForm(true)
  }

  const openEditStep = (idx: number) => {
    const s = stepTemplates[idx]
    setEditingStepIdx(idx)
    setStepFormData({
      pm_workflowname: s.pm_workflowname || '',
      pm_steporder: s.pm_steporder || (idx + 1),
      pm_assignetype: Number(s.pm_assignetype) || 0,
      pm_assigneeid: s.pm_assigneeid || '',
      pm_description: s.pm_description || '',
      pm_sladays: s.pm_sladays || 5,
      new_formkey: s.new_formkey || '',
      pm_tasktype: Number(s.pm_tasktype) || 1,
      pm_workflowphase: s.pm_workflowphase || '',
    })
    setShowStepForm(true)
  }

  const saveStep = () => {
    if (!stepFormData.pm_workflowname.trim()) return
    const newSteps = [...stepTemplates] as any[]
    if (editingStepIdx !== null) {
      newSteps[editingStepIdx] = { ...newSteps[editingStepIdx], ...stepFormData }
    } else {
      newSteps.push({ ...stepFormData })
    }
    setStepTemplates(newSteps.sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0)))
    setShowStepForm(false)
  }

  const handleMovePhase = (phaseName: string, direction: 'up' | 'down') => {
    const idx = activePhases.indexOf(phaseName)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= activePhases.length) return

    // Swap phases in the activePhases list
    const newPhasesOrder = [...activePhases]
    const temp = newPhasesOrder[idx]
    newPhasesOrder[idx] = newPhasesOrder[targetIdx]
    newPhasesOrder[targetIdx] = temp

    // 1. Group steps by their phase (using current steps list)
    const stepsByPhase: Record<string, WorkflowStepTemplateModel[]> = {}
    activePhases.forEach(p => {
      stepsByPhase[p] = stepTemplates.filter(s => s.pm_workflowphase?.trim() === p)
        .sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))
    })

    // 2. Build the new ordered flat list of steps
    const newOrderedSteps: WorkflowStepTemplateModel[] = []
    newPhasesOrder.forEach(p => {
      if (stepsByPhase[p]) {
        newOrderedSteps.push(...stepsByPhase[p])
      }
    })

    // 3. Assign new sequential step order numbers
    const updatedSteps = newOrderedSteps.map((step, sIdx) => ({
      ...step,
      pm_steporder: sIdx + 1
    }))

    // 4. Update the userPhases state order (only empty phases)
    const emptyPhasesInNewOrder = newPhasesOrder.filter(p => !stepsByPhase[p] || stepsByPhase[p].length === 0)
    setUserPhases(emptyPhasesInNewOrder)

    setStepTemplates(updatedSteps)
  }

  const deleteStep = (idx: number) => {
    setStepTemplates(stepTemplates.filter((_, i) => i !== idx))
  }
  if (done) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: 'success.lighter', color: 'success.main', mx: 'auto', mb: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 48 }} />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          {isEdit ? 'Changes Saved!' : 'Workflow Created!'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>{f.pm_workflowname}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
        </Typography>
      </Box>
    )
  }

  const stepListContent = (
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
                  <Chip 
                    label={`${phaseSteps.length} step${phaseSteps.length !== 1 ? 's' : ''}`}
                    size="small" 
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                  />
                </Box>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={(e) => {
                    e.stopPropagation()
                    openAddStep(phaseName)
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}
                >
                  Add Step
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.2)' : 'rgba(248, 250, 252, 0.5)' }}>
              {phaseSteps.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic' }}>
                  No steps configured for this phase. Click "Add Step" to add one.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {phaseSteps.map((step: any, idx: number) => (
                    <Paper 
                      key={idx} 
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
                              if (Number(step.pm_assignetype) === 1) return teams.find((t: any) => t.id === step.pm_assigneeid)?.name || 'Unknown Team'
                              return assigneeList.find((u: any) => u.systemuserid === step.pm_assigneeid)?.fullname || 'Unknown User'
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
                        <IconButton size="small" title="Link to Phase" onClick={(e) => handleLinkMenuOpen(e, stepTemplates.indexOf(step))} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                          <LinkIcon fontSize="small" sx={{ color: 'primary.main' }} />
                        </IconButton>
                        <IconButton size="small" title="Edit Step" onClick={() => openEditStep(stepTemplates.indexOf(step))} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Delete Step" color="error" onClick={() => deleteStep(stepTemplates.indexOf(step))} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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
              {groupedSteps.Other.map((step: any, idx: number) => (
                <Paper 
                  key={idx} 
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
                          if (Number(step.pm_assignetype) === 1) return teams.find((t: any) => t.id === step.pm_assigneeid)?.name || 'Unknown Team'
                          return assigneeList.find((u: any) => u.systemuserid === step.pm_assigneeid)?.fullname || 'Unknown User'
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
                    <IconButton size="small" title="Link to Phase" onClick={(e) => handleLinkMenuOpen(e, stepTemplates.indexOf(step))} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      <LinkIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    </IconButton>
                    <IconButton size="small" title="Edit Step" onClick={() => openEditStep(stepTemplates.indexOf(step))} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Delete Step" color="error" onClick={() => deleteStep(stepTemplates.indexOf(step))} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  )
  const stepDialog = (
    <Dialog open={showStepForm} onClose={() => setShowStepForm(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{editingStepIdx !== null ? 'Edit Step' : 'Add Approval Step'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField label="Step Name" fullWidth size="small" value={stepFormData.pm_workflowname} onChange={(e) => setStepFormData(p => ({ ...p, pm_workflowname: e.target.value }))} placeholder="e.g. Finance Review" />
          <TextField label="Description" fullWidth multiline rows={2} size="small" value={stepFormData.pm_description} onChange={(e) => setStepFormData(p => ({ ...p, pm_description: e.target.value }))} placeholder="Optional step description" />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <FormControl size="small">
              <InputLabel id="workflow-step-assignee-type-label">Assignee Type</InputLabel>
              <Select
                id="workflow-step-assignee-type-select"
                labelId="workflow-step-assignee-type-label"
                label="Assignee Type"
                value={stepFormData.pm_assignetype}
                onChange={(e) => setStepFormData(p => ({ ...p, pm_assignetype: e.target.value as number, pm_assigneeid: '' }))}
              >
                <MenuItem value={0}>Individual User</MenuItem>
                <MenuItem value={1}>Team / Group</MenuItem>
              </Select>
            </FormControl>
            <TextField label="SLA (Days)" type="number" size="small" value={stepFormData.pm_sladays} onChange={(e) => setStepFormData(p => ({ ...p, pm_sladays: Number(e.target.value) }))} />
            <Autocomplete
              freeSolo
              size="small"
              options={activePhases}
              value={stepFormData.pm_workflowphase || ''}
              onChange={(_, newValue) => {
                setStepFormData(p => ({ ...p, pm_workflowphase: newValue || '' }))
              }}
              onInputChange={(_, newInputValue) => {
                setStepFormData(p => ({ ...p, pm_workflowphase: newInputValue || '' }))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Workflow Phase" placeholder="Select or type a phase..." />
              )}
            />
          </Box>

          {(() => {
            const isTeam = Number(stepFormData.pm_assignetype) === 1
            const options: AssigneeOption[] = isTeam
              ? teams.map((t: any) => ({ value: t.id, label: t.name, type: 'team' as const }))
              : assigneeList.map((u: any) => ({ value: u.systemuserid, label: u.fullname || '', type: 'user' as const, email: u.internalemailaddress }))
            const selected = options.find(o => o.value === stepFormData.pm_assigneeid) || null

            return (
              <Autocomplete
                size="small"
                options={options}
                value={selected}
                getOptionLabel={(o) => o.label}
                onChange={(_, v) => setStepFormData(p => ({ ...p, pm_assigneeid: v?.value || '' }))}
                renderInput={(params) => <TextField {...params} label={isTeam ? 'Select Team' : 'Select User'} />}
              />
            )
          })()}

          <FormControl fullWidth size="small">
            <InputLabel id="workflow-form-tasktype-label">Task Type</InputLabel>
            <Select
              id="workflow-form-tasktype-select"
              labelId="workflow-form-tasktype-label"
              value={stepFormData.pm_tasktype}
              label="Task Type"
              onChange={(e) => setStepFormData(p => ({ ...p, pm_tasktype: Number(e.target.value) }))}
            >
              <MenuItem value={1}>Custom (Form)</MenuItem>
              <MenuItem value={2}>Checklist</MenuItem>
            </Select>
          </FormControl>

          {stepFormData.pm_tasktype === 1 && (
            <Autocomplete
            size="small"
            options={FORM_REGISTRY}
            value={FORM_REGISTRY.find((f) => f.key === stepFormData.new_formkey) ?? null}
            getOptionLabel={(o) => `${o.displayName} (${o.key})`}
            onChange={(_, v) => setStepFormData(p => ({ ...p, new_formkey: v?.key ?? '' }))}
            isOptionEqualToValue={(o, v) => o.key === v.key}
            renderOption={(props, option) => {
              const { key, ...rest } = props
              return (
                <Box component="li" key={key} {...rest} sx={{ py: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.displayName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <OpenInNewIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">{option.key}</Typography>
                    </Box>
                    {option.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{option.description}</Typography>
                    )}
                  </Box>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField {...params} label="Form Key (optional)" placeholder="Select a task form..." />
            )}
            clearText="Clear"
          />
          )}

          {stepFormData.pm_tasktype === 2 && (
            <Box sx={{ mt: 1 }}>
              {editingStepIdx !== null && (stepTemplates[editingStepIdx] as any)?.pm_workflowsteptemplateid ? (
                <ChecklistConfigurationPanel stepTemplateId={(stepTemplates[editingStepIdx] as any).pm_workflowsteptemplateid} />
              ) : (
                <Alert severity="info">
                  Please save the workflow first to generate this step before configuring checklist items.
                </Alert>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={() => setShowStepForm(false)} variant="outlined">Cancel</Button>
        <Button onClick={saveStep} variant="contained" disabled={!stepFormData.pm_workflowname || !stepFormData.pm_assigneeid}>{editingStepIdx !== null ? 'Update Step' : 'Add Step'}</Button>
      </DialogActions>
    </Dialog>
  )
  const reviewContent = (
    <Grid container spacing={3.5}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, color: 'text.disabled', mb: 2.5, display: 'block' }}>
              Template Details
            </Typography>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>NAME</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{f.pm_workflowname || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>MODULE</Typography>
                <StatusTag label={f.pm_module || 'None'} color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{f.pm_workflowdescription || 'No description provided.'}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>STATUS</Typography>
                  <StatusTag label={f.pm_isactive ? 'ACTIVE' : 'DRAFT'} color={f.pm_isactive ? 'success' : 'default'} size="small" sx={{ fontWeight: 800, mt: 0.5 }} />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    {isEdit ? 'NEXT VERSION' : 'VERSION'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'info.main' }}>
                    {isEdit ? `v${nextVersion}.0` : '1.0.0'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, color: 'text.disabled', display: 'block' }}>
              Approval Chain ({stepTemplates.length})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {(stepTemplates as any[]).map((step: any, idx: number) => {
              const isTeam = Number(step.pm_assignetype) === 1
              const assigneeName = isTeam 
                ? teams.find((t: any) => t.id === step.pm_assigneeid)?.name
                : assigneeList.find((u: any) => u.systemuserid === step.pm_assigneeid)?.fullname

              return (
                <Box 
                  key={idx} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2.5, 
                    p: 2, 
                    borderRadius: '8px', 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  {/* Step Index Avatar */}
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'primary.main', 
                      color: 'primary.contrastText',
                      fontSize: '0.85rem', 
                      fontWeight: 800 
                    }}
                  >
                    {idx + 1}
                  </Avatar>

                  {/* Step Content */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {step.pm_workflowname}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isTeam ? <GroupIcon sx={{ fontSize: 13, color: 'text.secondary' }} /> : <PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {assigneeName || 'Unassigned'}
                        </Typography>
                      </Box>
                      {step.pm_sladays && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimerIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {step.pm_sladays} Day SLA
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Type Tag */}
                  <StatusTag 
                    label={isTeam ? 'TEAM' : 'USER'} 
                    color={isTeam ? 'warning' : 'primary'} 
                    size="small" 
                    sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                  />
                </Box>
              )
            })}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
  return (
    <Box sx={{ pt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ mb: 6 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, idx) => (
            <Step key={label}>
              <StepLabel
                slotProps={{
                  stepIcon: {
                    sx: {
                      '&.Mui-active': { color: 'primary.main' },
                      '&.Mui-completed': { color: 'success.main' },
                    }
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: idx === activeStep ? 800 : 500, color: idx === activeStep ? 'text.primary' : 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      <Box sx={{ minHeight: 450 }}>
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccountTreeIcon sx={{ fontSize: 18 }} />
                </Box>
                {isEdit ? 'General Information' : 'Template Identity'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEdit ? 'Update the template name, description, and governing module.' : 'Provide a unique name and select the module this workflow will govern.'}
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <TextField
                label="Workflow Name" required fullWidth
                value={f.pm_workflowname}
                onChange={(e) => u('pm_workflowname', e.target.value)}
                placeholder={isEdit ? '' : 'e.g. Project Approval Process'}
                slotProps={{ input: { sx: { fontWeight: 600 } } }}
                autoFocus={!isEdit}
              />
              <FormControl fullWidth>
                <InputLabel id="workflow-target-module-label" sx={{ fontWeight: 500 }}>Target Module</InputLabel>
                <Select
                  id="workflow-target-module-select"
                  labelId="workflow-target-module-label"
                  value={f.pm_module}
                  label="Target Module"
                  onChange={(e) => u('pm_module', e.target.value)}
                  sx={{ fontWeight: 600 }}
                >
                  {MODULES.map((o) => <MenuItem key={o.value} value={o.value} disabled={!o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Description" fullWidth multiline rows={5}
                value={f.pm_workflowdescription}
                onChange={(e) => u('pm_workflowdescription', e.target.value)}
                placeholder={isEdit ? '' : 'Optional purpose of this workflow...'}
              />
            </Stack>
          </Box>
        )}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LayersIcon sx={{ fontSize: 18 }} />
                  </Box>
                  Approval Chain
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isEdit ? 'Manage the sequence of approvers for this workflow.' : 'Define the sequential steps and responsible parties.'}
                </Typography>
              </Stack>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddPhaseDialog(true)}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Add Phase
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openAddStep('')}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, boxShadow: 'none' }}
                >
                  Add Step
                </Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {loadingSteps ? (
              <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
            ) : stepTemplates.length === 0 ? (
              <Box sx={{ py: 12, textAlign: 'center', bgcolor: 'background.default', border: '2px dashed', borderColor: 'divider' }}>
                <LayersIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>No approval steps defined yet.</Typography>
                <Button size="small" onClick={() => openAddStep('')} sx={{ mt: 2, fontWeight: 700 }}>Add your first step</Button>
              </Box>
            ) : (
              stepListContent
            )}
          </Box>
        )}
        {activeStep === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: 'success.lighter', color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon sx={{ fontSize: 18 }} />
                </Box>
                {isEdit ? 'Workflow Settings' : 'Operational Settings'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEdit ? 'Adjust activation and version properties.' : 'Control the template activation and versioning.'}
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {isEdit ? 'Version Update' : 'Initial Version'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isEdit ? 'Versioning is auto-incremented on save' : 'Default version for new templates'}
                  </Typography>
                </Box>
                {isEdit ? (
                  <Stack component="div" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>v{currentVersion}.0</Typography>
                    <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <StatusTag label={`v${nextVersion}.0`} color="info" sx={{ fontWeight: 800, px: 2 }} />
                  </Stack>
                ) : (
                  <StatusTag label="v1.0.0" color="info" sx={{ fontWeight: 800, px: 2 }} />
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <FormControlLabel
                  control={
                    <Switch checked={f.pm_isactive} onChange={(e) => u('pm_isactive', e.target.checked)} color="primary" />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {isEdit ? 'Enable Workflow' : 'Enable Workflow Immediately'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {f.pm_isactive
                          ? (isEdit ? 'This template is active and processing records.' : 'This workflow will be active and visible for new records.')
                          : (isEdit ? 'This template is paused. Records will not trigger this workflow.' : 'This workflow will be created in an inactive (Draft) state.')}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, alignItems: 'flex-start' }}
                />
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>Post-Approval Actions</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Post-approval actions are now managed by the Power Automate workflow router flow.
                </Typography>
              </Paper>
            </Stack>
          </Box>
        )}
        {activeStep === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: 'info.lighter', color: 'info.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 18 }} />
                </Box>
                Detailed Configuration Review
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEdit ? 'Review all changes and the updated approval chain.' : 'Review all settings and the approval sequence before final commitment.'}
              </Typography>
            </Stack>

            {reviewContent}
          </Box>
        )}
      </Box>
      <Divider sx={{ my: 4 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="text"
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          disabled={activeStep === 0 || saving}
          sx={{ px: 3, fontWeight: 800, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
        >
          Back
        </Button>
        <Stack component="div" direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => setActiveStep((s) => s + 1)}
              disabled={!f.pm_workflowname.trim() || !f.pm_module || (activeStep === 1 && stepTemplates.length === 0)}
              sx={{ fontWeight: 800, px: 6, py: 1.25, boxShadow: 'none', '&:hover': { boxShadow: 'none', bgcolor: 'primary.dark' } }}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !f.pm_workflowname.trim()}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <PublishIcon />}
              sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, fontWeight: 800, px: 6, py: 1.25, boxShadow: 'none' }}
            >
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Finalize & Create')}
            </Button>
          )}
        </Stack>
      </Box>
      {stepDialog}

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
        open={Boolean(linkMenuAnchor) && linkingStepIdx !== null}
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
