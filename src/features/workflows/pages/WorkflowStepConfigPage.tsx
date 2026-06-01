import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, TextField, Button, Alert, Avatar, Chip,
  Divider, CircularProgress, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import TimerIcon from '@mui/icons-material/Timer'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { fontSizes } from '@/styles'
import {
  fetchWorkflowStepTemplates, createWorkflowStepTemplate,
  updateWorkflowStepTemplate, deleteWorkflowStepTemplate,
} from '@/lib/dataverseClient'
import { useUser } from '@/context/UserContext'
import type { WorkflowModel, WorkflowStepTemplateModel } from '@/types/dataverse'
 
interface Props {
  workflow: WorkflowModel
  onBack: () => void
}
 
export default function WorkflowStepConfigPage({ workflow, onBack }: Props) {
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
  const [formData, setFormData] = useState({
    pm_workflowname: '', pm_steporder: 1, pm_assignetype: 0, pm_assigneeid: '',
    pm_displayname: '', pm_description: '', pm_sladays: 5, pm_allowdelegation: false,
    pm_approvalrequired: true, pm_isparallel: false, pm_conditionsjson: '',
  })
 
  // Load steps
  const loadSteps = useCallback(async () => {
    setLoading(true)
    try {
      const all = await fetchWorkflowStepTemplates()
      setSteps(all.filter((s) => s.pm_module === workflow.pm_workflowid))
    } catch {
      setError('Failed to load step templates.')
    } finally {
      setLoading(false)
    }
  }, [workflow.pm_workflowid])
 
  // Init load
  useEffect(() => { loadSteps() }, [loadSteps])


 
  const sortedSteps = [...steps].sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))
 
  const openCreate = () => {
    setEditing(null)
    setFormData({
      pm_workflowname: '', pm_steporder: (steps.length) + 1, pm_assignetype: 0,
      pm_assigneeid: '', pm_displayname: '', pm_description: '', pm_sladays: 5,
      pm_allowdelegation: false, pm_approvalrequired: true, pm_isparallel: false,
      pm_conditionsjson: '',
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
      pm_displayname: step.pm_displayname ?? '',
      pm_description: step.pm_description ?? '',
      pm_sladays: step.pm_sladays ?? 5,
      pm_allowdelegation: step.pm_allowdelegation ?? false,
      pm_approvalrequired: step.pm_approvalrequired ?? true,
      pm_isparallel: step.pm_isparallel ?? false,
      pm_conditionsjson: step.pm_conditionsjson ?? '',
    })
    setShowForm(true)
  }
 
  const handleSave = async () => {
    if (!formData.pm_workflowname.trim()) { setError('Step name is required.'); return }
    setError(null)
    setActionLoading(true)
    try {
      const payload = { ...formData, pm_module: workflow.pm_workflowid }
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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ borderRadius: 2 }}>Back</Button>
        <Avatar sx={{ width: 40, height: 40, bgcolor: '#8b5cf6', borderRadius: 2 }}>
          <SettingsIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Step Configuration</Typography>
          <Typography variant="caption" color="text.secondary">
            {workflow.pm_workflowname} — {steps.length} step{steps.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, borderRadius: 2, fontWeight: 600 }}>
          Add Step
        </Button>
      </Box>
 
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
 
      {/* Empty State */}
      {!loading && sortedSteps.length === 0 && (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
          <SettingsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>No Steps Configured</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Define approval steps for this workflow.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 2 }}>
            Configure First Step
          </Button>
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
          {sortedSteps.map((step, idx) => (
            <Paper key={step.pm_workflowsteptemplateid} variant="outlined"
              sx={{ p: 2.5, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } }}>
              <Avatar sx={{
                width: 40, height: 40,
                bgcolor: idx === sortedSteps.length - 1 ? '#22c55e' : '#6366f1',
                fontSize: '0.85rem', fontWeight: 700,
              }}>
                {step.pm_steporder ?? idx + 1}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.pm_workflowname ?? 'Unnamed'}</Typography>
                  {step.pm_displayname && <Chip size="small" label={step.pm_displayname} sx={{ fontSize: '0.7rem', height: 20 }} />}
                  {step.pm_approvalrequired ? <Chip size="small" label="Approval" color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} /> : null}
                  {step.pm_isparallel ? <Chip size="small" label="Parallel" color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} /> : null}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 14, color: '#f59e0b' }} /> : <PersonIcon sx={{ fontSize: 14, color: '#0ea5e9' }} />}
                    <Typography variant="caption" color="text.secondary">
                      {Number(step.pm_assignetype) === 1 ? 'Team' : 'User'}: {(() => {
                        const found = assigneeList.find((u) => u.systemuserid === step.pm_assigneeid)
                        return found ? found.fullname : (step.pm_assigneeid || 'Not set')
                      })()}
                    </Typography>
                  </Box>
                  {step.pm_sladays != null && step.pm_sladays > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimerIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                      <Typography variant="caption" color="text.secondary">SLA: {step.pm_sladays}d</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => openEdit(step)} sx={{ borderRadius: 1.5 }}>
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => setDeleteConfirm(step.pm_workflowsteptemplateid!)} sx={{ borderRadius: 1.5 }}>
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
 
      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onClose={() => !actionLoading && setShowForm(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', borderRadius: 1.5 }}>
            {editing ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <SettingsIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editing ? 'Edit Step Template' : 'Create Step Template'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField label="Step Name" required fullWidth size="small" value={formData.pm_workflowname}
              onChange={(e) => setFormData((f) => ({ ...f, pm_workflowname: e.target.value }))}
              placeholder="e.g. PMO Review" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <TextField label="Description" fullWidth multiline rows={2} size="small" value={formData.pm_description}
              onChange={(e) => setFormData((f) => ({ ...f, pm_description: e.target.value }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Order" type="number" size="small" value={formData.pm_steporder}
                onChange={(e) => setFormData((f) => ({ ...f, pm_steporder: Number(e.target.value) }))}
                sx={{ minWidth: 80 }} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
              <TextField label="SLA Days" type="number" size="small" value={formData.pm_sladays}
                onChange={(e) => setFormData((f) => ({ ...f, pm_sladays: Number(e.target.value) }))}
                sx={{ minWidth: 100 }} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Assignee Type</InputLabel>
                <Select value={formData.pm_assignetype} label="Assignee Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_assignetype: e.target.value as number }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}>Individual User</MenuItem>
                  <MenuItem value={1}>Team / Group</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>{Number(formData.pm_assignetype) === 1 ? 'Team' : 'Assignee'}</InputLabel>
              <Select value={formData.pm_assigneeid} label={Number(formData.pm_assignetype) === 1 ? 'Team' : 'Assignee'}
                onChange={(e) => setFormData((f) => ({ ...f, pm_assigneeid: e.target.value as string }))} sx={{ borderRadius: 2 }}>
                {assigneeList.length === 0 && <MenuItem value="" disabled>No users found</MenuItem>}
                {assigneeList.map((u) => (
                  <MenuItem key={u.systemuserid} value={u.systemuserid}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#0ea5e9' }}>
                        {u.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.fullname}</Typography>
                        {u.jobtitle && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{u.jobtitle}</Typography>}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Display Name" fullWidth size="small" value={formData.pm_displayname}
              onChange={(e) => setFormData((f) => ({ ...f, pm_displayname: e.target.value }))}
              placeholder="Shown in task lists" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button size="small" variant={formData.pm_approvalrequired ? 'contained' : 'outlined'}
                onClick={() => setFormData((f) => ({ ...f, pm_approvalrequired: !f.pm_approvalrequired }))}
                sx={{ borderRadius: 2, textTransform: 'none' }}>
                {formData.pm_approvalrequired ? 'Approval Required' : 'Approval Optional'}
              </Button>
              <Button size="small" variant={formData.pm_isparallel ? 'contained' : 'outlined'} color="info"
                onClick={() => setFormData((f) => ({ ...f, pm_isparallel: !f.pm_isparallel }))}
                sx={{ borderRadius: 2, textTransform: 'none' }}>
                {formData.pm_isparallel ? 'Parallel' : 'Sequential'}
              </Button>
              <Button size="small" variant={formData.pm_allowdelegation ? 'contained' : 'outlined'} color="secondary"
                onClick={() => setFormData((f) => ({ ...f, pm_allowdelegation: !f.pm_allowdelegation }))}
                sx={{ borderRadius: 2, textTransform: 'none' }}>
                {formData.pm_allowdelegation ? 'Delegation OK' : 'No Delegation'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowForm(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.pm_workflowname.trim() || actionLoading}
            sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, borderRadius: 2, fontWeight: 600 }}>
            {actionLoading ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete Step Template</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Are you sure? This cannot be undone.</Typography></DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}