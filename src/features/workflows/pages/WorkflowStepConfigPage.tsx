import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, TextField, Alert, Avatar,
  CircularProgress, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Autocomplete,
  useTheme,
  alpha,
} from '@mui/material'

import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import TimerIcon from '@mui/icons-material/Timer'
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
 
  // Dialog state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WorkflowStepTemplateModel | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { users: assigneeList } = useUser()
  const [teams, setTeams] = useState<DataverseTeamOption[]>([])
  const [formData, setFormData] = useState({
    pm_workflowname: '', pm_steporder: 1, pm_assignetype: 0, pm_assigneeid: '',
    pm_description: '', pm_sladays: 5, new_formkey: '', pm_tasktype: 1,
  })
 
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
 
  const openCreate = () => {
    setEditing(null)
    setFormData({
      pm_workflowname: '', pm_steporder: (steps.length) + 1, pm_assignetype: 0,
      pm_assigneeid: '', pm_description: '', pm_sladays: 5, new_formkey: '', pm_tasktype: 1,
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
              Sorted by order
            </Typography>
          )}
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, fontWeight: 600, textTransform: 'none', px: 2.5, boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
            Add Step
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
 
      {/* Empty State */}
      {!loading && sortedSteps.length === 0 && (
        <Paper sx={{
          p: 6, textAlign: 'center', borderRadius: 1.5,
          border: '2px dashed', borderColor: 'divider',
          bgcolor: 'transparent',
        }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#f3e8ff', borderRadius: 1.5 }}>
            <SettingsIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
          </Avatar>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>No Steps Configured</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
            Define approval steps for this workflow. Each step represents a stage in the approval process.
          </Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, fontWeight: 600, textTransform: 'none', px: 3, boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
              Configure First Step
            </Button>
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
 
      {!loading && sortedSteps.length > 0 && (
        <Box>
          {sortedSteps.map((step, idx) => {
            const isLast = idx === sortedSteps.length - 1
            return (
            <Paper key={step.pm_workflowsteptemplateid} variant="outlined"
              sx={{
                p: 2.5, mb: 1.5,
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'all 0.2s ease',
                borderLeft: '3px solid',
                borderLeftColor: isLast ? 'success.main' : 'secondary.main',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  transform: 'translateX(4px)',
                  borderLeftColor: 'secondary.main',
                },
              }}>
              <Avatar sx={{
                width: 44, height: 44,
                bgcolor: idx === sortedSteps.length - 1 ? 'success.main' : 'secondary.main',
                fontSize: '0.9rem', fontWeight: 700,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                zIndex: 1,
              }}>
                {step.pm_steporder ?? idx + 1}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.pm_workflowname ?? 'Unnamed'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 14, color: 'warning.main' }} /> : <PersonIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                    <Typography variant="caption" color="text.secondary">
                      {Number(step.pm_assignetype) === 1 ? 'Team' : 'User'}: {(() => {
                        if (Number(step.pm_assignetype) === 1) {
                          const found = teams.find((t) => t.id === step.pm_assigneeid)
                          return found ? found.name : (step.pm_assigneeid || 'Not set')
                        }
                        const found = assigneeList.find((u) => u.systemuserid === step.pm_assigneeid)
                        return found ? found.fullname : (step.pm_assigneeid || 'Not set')
                      })()}
                    </Typography>
                  </Box>
                  {step.pm_sladays != null && step.pm_sladays > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimerIcon sx={{ fontSize: 14, color: 'error.main' }} />
                      <Typography variant="caption" color="text.secondary">SLA: {step.pm_sladays}d</Typography>
                    </Box>
                  )}
                  {step.new_formkey && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <OpenInNewIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                      <Typography variant="caption" color="text.secondary">
                        Form: {(() => {
                          const formEntry = FORM_REGISTRY.find(f => f.key === step.new_formkey)
                          return formEntry ? formEntry.displayName : step.new_formkey
                        })()}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {canEdit && (
                  <IconButton size="small" onClick={() => openEdit(step)}>
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton size="small" color="error" onClick={() => setDeleteConfirm(step.pm_workflowsteptemplateid!)}>
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Box>
            </Paper>
          )})}
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

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
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
    </Box>
  )
}