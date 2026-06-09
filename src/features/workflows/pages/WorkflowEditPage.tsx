import { useState, useCallback, useMemo } from 'react'
import {
  Box, Paper, Typography, TextField, Button, Stepper, Step, StepLabel,
  Alert, Avatar, Divider, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Stack,
  useTheme,
  Grid,
  IconButton,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'

import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SettingsIcon from '@mui/icons-material/Settings'
import PublishIcon from '@mui/icons-material/Publish'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import LayersIcon from '@mui/icons-material/Layers'
import HistoryIcon from '@mui/icons-material/History'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import TimerIcon from '@mui/icons-material/Timer'

import { useEffect } from 'react'
import { fontSizes } from '@/styles'
import { 
  updateWorkflow, 
  fetchWorkflowStepTemplates, 
  createWorkflowStepTemplate,
  updateWorkflowStepTemplate,
  deleteWorkflowStepTemplate,
  fetchOwnerTeams
} from '@/services'
import type { TeamOption } from '@/services'
import { useUser } from '@/context/UserContext'
import type { WorkflowModel, WorkflowStepTemplateModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { getModuleOptionsForWorkflow } from '@/constants/moduleNames'
 
const STEPS = ['Basic Information', 'Approval Steps', 'Workflow Settings', 'Review & Save']
 
const MODULES = getModuleOptionsForWorkflow()

type AssigneeOption = { value: string; label: string; type: 'user' | 'team'; jobtitle?: string; email?: string }
 
interface Props {
  workflow: WorkflowModel
  onStepChange?: (step: number) => void
  onSaved?: () => void
}
 
export default function WorkflowEditPage({ workflow, onStepChange, onSaved }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users: assigneeList } = useUser()
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  
  const currentVersion = Number((workflow as any).pm_version) || 1
  const nextVersion = currentVersion + 1

  // Form State
  const [f, setF] = useState({
    pm_workflowname: workflow.pm_workflowname ?? '',
    pm_workflowdescription: (workflow as any).pm_workflowdescription ?? '',
    pm_module: (workflow as any).pm_module ?? '',
    pm_isactive: workflow.pm_isactive ?? true,
    pm_workflowstatus: Number(workflow.pm_workflowstatus) || 0,
  })

  // Steps State
  const [stepTemplates, setStepTemplates] = useState<WorkflowStepTemplateModel[]>([])
  const [originalStepIds, setOriginalStepIds] = useState<Set<string>>(new Set())
  const [showStepForm, setShowStepForm] = useState(false)
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null)
  const [stepFormData, setStepFormData] = useState({
    pm_workflowname: '', pm_steporder: 1, pm_assignetype: 0, pm_assigneeid: '',
    pm_description: '', pm_sladays: 5, new_formkey: '',
  })
 
  const u = useCallback((k: string, v: unknown) => setF((p) => ({ ...p, [k]: v })), [])

  useEffect(() => { onStepChange?.(activeStep) }, [activeStep, onStepChange])
  
  useEffect(() => {
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
  }, [workflow.pm_workflowid])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // 1. Update Workflow
      await updateWorkflow(workflow.pm_workflowid!, {
        pm_workflowname: f.pm_workflowname,
        pm_workflowdescription: f.pm_workflowdescription,
        pm_module: f.pm_module,
        pm_isactive: f.pm_isactive,
        pm_workflowstatus: f.pm_isactive ? 0 : 1,
        pm_version: nextVersion,
      } as any)

      // 2. Manage Steps
      const currentStepIds = new Set(stepTemplates.map(s => s.pm_workflowsteptemplateid).filter(Boolean))
      
      // Delete removed steps
      const toDelete = Array.from(originalStepIds).filter(id => !currentStepIds.has(id))
      await Promise.all(toDelete.map(id => deleteWorkflowStepTemplate(id)))

      // Create or Update remaining steps
      await Promise.all(stepTemplates.map((step, idx) => {
        const payload = {
          ...step,
          pm_steporder: idx + 1,
          _pm_workflowlookup_value: workflow.pm_workflowid,
        }
        if (step.pm_workflowsteptemplateid) {
          return updateWorkflowStepTemplate(step.pm_workflowsteptemplateid, payload as any)
        } else {
          return createWorkflowStepTemplate(payload as any)
        }
      }))

      setDone(true)
      setTimeout(() => onSaved?.(), 1500)
    } catch {
      setError('Failed to update workflow. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openAddStep = () => {
    setEditingStepIdx(null)
    setStepFormData({
      pm_workflowname: '', pm_steporder: stepTemplates.length + 1, pm_assignetype: 0,
      pm_assigneeid: '', pm_description: '', pm_sladays: 5, new_formkey: '',
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
    })
    setShowStepForm(true)
  }

  const saveStep = () => {
    if (!stepFormData.pm_workflowname.trim()) return
    const newSteps = [...stepTemplates]
    if (editingStepIdx !== null) {
      newSteps[editingStepIdx] = { ...newSteps[editingStepIdx], ...stepFormData }
    } else {
      newSteps.push({ ...stepFormData } as any)
    }
    setStepTemplates(newSteps.sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0)))
    setShowStepForm(false)
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
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Changes Saved!</Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>{f.pm_workflowname}</strong> has been updated successfully.
        </Typography>
      </Box>
    )
  }
 
  return (
    <Box sx={{ pt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
 
      {/* Stepper */}
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
 
      {/* Step Content */}
      <Box sx={{ minHeight: 450 }}>
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccountTreeIcon sx={{ fontSize: 18 }} />
                </Box>
                General Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update the template name, description, and governing module.
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <TextField 
                label="Workflow Name" required fullWidth 
                value={f.pm_workflowname} 
                onChange={(e) => u('pm_workflowname', e.target.value)} 
                slotProps={{ input: { sx: { borderRadius: 1.5, fontWeight: 600 } } }} 
              />
              <FormControl fullWidth>
                <InputLabel sx={{ fontWeight: 500 }}>Target Module</InputLabel>
                <Select value={f.pm_module} label="Target Module" onChange={(e) => u('pm_module', e.target.value)} sx={{ borderRadius: 1.5, fontWeight: 600 }}>
                  {MODULES.map((o) => <MenuItem key={o.value} value={o.value} disabled={!o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField 
                label="Description" fullWidth multiline rows={5} 
                value={f.pm_workflowdescription} 
                onChange={(e) => u('pm_workflowdescription', e.target.value)} 
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }} 
              />
            </Stack>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, bgcolor: '#f5f3ff', color: 'secondary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LayersIcon sx={{ fontSize: 18 }} />
                  </Box>
                  Approval Chain
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage the sequence of approvers for this workflow.
                </Typography>
              </Stack>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={openAddStep} 
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, bgcolor: 'secondary.main', '&:hover': { bgcolor: '#7c3aed' }, boxShadow: 'none' }}
              >
                Add Step
              </Button>
            </Box>

            <Divider />

            {loadingSteps ? (
              <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
            ) : stepTemplates.length === 0 ? (
              <Box sx={{ py: 12, textAlign: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 1.5, border: '1px dashed', borderColor: 'divider' }}>
                <LayersIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>No steps defined. Click "Add Step" to begin.</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {stepTemplates.map((step, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 3, borderLeft: '4px solid', borderLeftColor: 'primary.main', bgcolor: isDark ? 'rgba(255,255,255,0.01)' : '#fff' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontWeight: 800, fontSize: 14 }}>{idx + 1}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>{step.pm_workflowname}</Typography>
                      <Stack direction="row" spacing={3} sx={{ mt: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> : <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {(() => {
                              if (Number(step.pm_assignetype) === 1) return teams.find(t => t.id === step.pm_assigneeid)?.name || 'Unknown Team'
                              return assigneeList.find(u => u.systemuserid === step.pm_assigneeid)?.fullname || 'Unknown User'
                            })()}
                          </Typography>
                        </Box>
                        {step.pm_sladays && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <TimerIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{step.pm_sladays}d SLA</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => openEditStep(idx)} sx={{ borderRadius: 1.5, bgcolor: 'action.hover' }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteStep(idx)} sx={{ borderRadius: 1.5, bgcolor: 'error.lighter' }}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}
 
        {activeStep === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: 'success.lighter', color: 'success.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon sx={{ fontSize: 18 }} />
                </Box>
                Workflow Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Adjust activation and version properties.
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>Version Update</Typography>
                  <Typography variant="caption" color="text.secondary">Versioning is auto-incremented on save</Typography>
                </Box>
                <Stack component="div" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>v{currentVersion}.0</Typography>
                  <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <StatusTag label={`v${nextVersion}.0`} color="info" sx={{ fontWeight: 800, px: 2 }} />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch checked={f.pm_isactive} onChange={(e) => u('pm_isactive', e.target.checked)} color="primary" />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>Enable Workflow</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {f.pm_isactive 
                          ? 'This template is active and processing records.' 
                          : 'This template is paused. Records will not trigger this workflow.'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, alignItems: 'flex-start' }}
                />
              </Paper>
              
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
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
                <Box sx={{ width: 32, height: 32, bgcolor: 'info.lighter', color: 'info.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 18 }} />
                </Box>
                Detailed Configuration Review
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review all changes and the updated approval chain.
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={3}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : '#fcfcfc' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, color: 'text.disabled', mb: 2.5, display: 'block' }}>
                      Template Details
                    </Typography>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>NAME</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>{f.pm_workflowname || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>MODULE</Typography>
                        <StatusTag label={f.pm_module || 'None'} color="primary" sx={{ fontWeight: 700 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>DESCRIPTION</Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{f.pm_workflowdescription || '—'}</Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>STATUS</Typography>
                          <StatusTag label={f.pm_isactive ? 'ACTIVE' : 'DRAFT'} color={f.pm_isactive ? 'success' : 'default'} size="small" sx={{ fontWeight: 800, mt: 0.5 }} />
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>NEXT VERSION</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'info.main' }}>{nextVersion}.0</Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 7 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, color: 'text.disabled', display: 'block' }}>
                      Approval Chain ({stepTemplates.length})
                    </Typography>
                  </Box>

                  <Box sx={{ position: 'relative' }}>
                    {stepTemplates.map((step, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 2.5, mb: idx === stepTemplates.length - 1 ? 0 : 3, position: 'relative' }}>
                        {idx !== stepTemplates.length - 1 && (
                          <Box sx={{ position: 'absolute', left: 15, top: 32, bottom: -24, width: 2, bgcolor: 'divider' }} />
                        )}
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', border: '4px solid', borderColor: theme.palette.background.paper, boxShadow: `0 0 0 1px ${theme.palette.divider}`, zIndex: 1, fontSize: 14, fontWeight: 800 }}>
                          {idx + 1}
                        </Avatar>
                        <Box sx={{ flex: 1, mt: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>{step.pm_workflowname}</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {(() => {
                                  if (Number(step.pm_assignetype) === 1) return teams.find(t => t.id === step.pm_assigneeid)?.name
                                  return assigneeList.find(u => u.systemuserid === step.pm_assigneeid)?.fullname
                                })()}
                              </Typography>
                            </Box>
                            {step.pm_sladays && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TimerIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>{step.pm_sladays} Day SLA</Typography>
                              </Box>
                            )}
                            <StatusTag label={step.pm_assignetype === 1 ? 'TEAM' : 'USER'} color={step.pm_assignetype === 1 ? 'warning' : 'primary'} size="small" sx={{ height: 16, fontSize: 8, fontWeight: 900 }} />
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
 
      {/* Navigation */}
      <Divider sx={{ my: 4 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          variant="text" 
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))} 
          disabled={activeStep === 0 || saving} 
          sx={{ borderRadius: 1.5, px: 3, fontWeight: 800, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
        >
          Back
        </Button>
        
        <Stack component="div" direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {activeStep < STEPS.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={() => setActiveStep((s) => s + 1)} 
              disabled={!f.pm_workflowname.trim() || !f.pm_module || (activeStep === 1 && stepTemplates.length === 0)}
              sx={{ borderRadius: 1.5, fontWeight: 800, px: 6, py: 1.25, boxShadow: 'none', '&:hover': { boxShadow: 'none', bgcolor: 'primary.dark' } }}
            >
              Continue
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSave} 
              disabled={saving || !f.pm_workflowname.trim()}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <PublishIcon />}
              sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, borderRadius: 1.5, fontWeight: 800, px: 6, py: 1.25, boxShadow: 'none' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Step Add/Edit Dialog */}
      <Dialog open={showStepForm} onClose={() => setShowStepForm(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingStepIdx !== null ? 'Edit Step' : 'Add Approval Step'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Step Name" fullWidth size="small" value={stepFormData.pm_workflowname} onChange={(e) => setStepFormData(p => ({ ...p, pm_workflowname: e.target.value }))} placeholder="e.g. Finance Review" />
            <TextField label="Description" fullWidth multiline rows={2} size="small" value={stepFormData.pm_description} onChange={(e) => setStepFormData(p => ({ ...p, pm_description: e.target.value }))} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl size="small">
                <InputLabel>Assignee Type</InputLabel>
                <Select label="Assignee Type" value={stepFormData.pm_assignetype} onChange={(e) => setStepFormData(p => ({ ...p, pm_assignetype: e.target.value as number, pm_assigneeid: '' }))}>
                  <MenuItem value={0}>Individual User</MenuItem>
                  <MenuItem value={1}>Team / Group</MenuItem>
                </Select>
              </FormControl>
              <TextField label="SLA (Days)" type="number" size="small" value={stepFormData.pm_sladays} onChange={(e) => setStepFormData(p => ({ ...p, pm_sladays: Number(e.target.value) }))} />
            </Box>

            {(() => {
              const isTeam = Number(stepFormData.pm_assignetype) === 1
              const options: AssigneeOption[] = isTeam
                ? teams.map(t => ({ value: t.id, label: t.name, type: 'team' as const }))
                : assigneeList.map(u => ({ value: u.systemuserid, label: u.fullname || '', type: 'user' as const, email: u.internalemailaddress }))
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
            
            <TextField
              fullWidth
              size="small"
              label="Form Key"
              placeholder="e.g. gate-review-form"
              value={stepFormData.new_formkey}
              onChange={(e) => setStepFormData((f) => ({ ...f, new_formkey: e.target.value }))}
            />

          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setShowStepForm(false)} variant="outlined" sx={{ borderRadius: 1.5 }}>Cancel</Button>
          <Button onClick={saveStep} variant="contained" disabled={!stepFormData.pm_workflowname || !stepFormData.pm_assigneeid} sx={{ borderRadius: 1.5 }}>{editingStepIdx !== null ? 'Update Step' : 'Add Step'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
