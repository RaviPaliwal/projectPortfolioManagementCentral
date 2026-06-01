import { useState, useCallback } from 'react'
import Chip from '@mui/material/Chip'
import {
  Box, Paper, Typography, TextField, Button, Stepper, Step, StepLabel,
  Alert, Avatar, Divider, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SettingsIcon from '@mui/icons-material/Settings'
import PublishIcon from '@mui/icons-material/Publish'

import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { fontSizes } from '@/styles'
import { updateWorkflow } from '@/lib/dataverseClient'
import type { WorkflowModel } from '@/types/dataverse'
 
const STEPS = ['Basic Information', 'Settings', 'Review & Save']
 


 
const MODULES = [
  { value: '', label: 'Select Module...' },
  { value: 'Pipeline', label: 'Pipeline' },
  { value: 'Projects', label: 'Projects' },
  { value: 'Portfolios', label: 'Portfolios' },
  { value: 'Programmes', label: 'Programmes' },
  { value: 'Risks', label: 'Risks & Issues' },
  { value: 'Budgets', label: 'Budgets & Finance' },
  { value: 'Resources', label: 'Resources' },
  { value: 'ChangeRequests', label: 'Change Requests' },
  { value: 'Approvals', label: 'Approvals' },
]
 
interface Props {
  workflow: WorkflowModel
  onBack: () => void
  onSaved?: () => void
}
 
export default function WorkflowEditPage({ workflow, onBack, onSaved }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [f, setF] = useState({
    pm_workflowname: workflow.pm_workflowname ?? '',
    pm_workflowdescription: (workflow as any).pm_workflowdescription ?? '',
    pm_module: (workflow as any).pm_module ?? '',
    pm_isactive: workflow.pm_isactive ?? true,
    pm_workflowstatus: Number(workflow.pm_workflowstatus) || 0,
    pm_triggerentity: (workflow as any).pm_triggerentity ?? '',
    pm_triggerevent: (workflow as any).pm_triggerevent ?? '',
    pm_version: Number((workflow as any).pm_version) || 1,
  })
 
  const u = useCallback((k: string, v: unknown) => setF((p) => ({ ...p, [k]: v })), [])
 
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateWorkflow(workflow.pm_workflowid!, {
        pm_workflowname: f.pm_workflowname,
        pm_workflowdescription: f.pm_workflowdescription,
        pm_module: f.pm_module,
        pm_isactive: f.pm_isactive,
        pm_workflowstatus: f.pm_isactive ? 0 : 1,
        pm_version: (Number((workflow as any).pm_version) || 1) + 1,
      } as any)
      setDone(true)
      setTimeout(() => onSaved?.(), 1500)
    } catch {
      setError('Failed to update workflow. Please try again.')
    } finally {
      setSaving(false)
    }
  }
 
  if (done) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Workflow Updated!</Typography>
        <Typography variant="body2" color="text.secondary">
          {f.pm_workflowname} updated successfully.
        </Typography>
      </Box>
    )
  }
 
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ borderRadius: 2 }}>Back</Button>
        <Avatar sx={{ width: 40, height: 40, bgcolor: '#6366f1', borderRadius: 2 }}>
          <EditIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Edit: {workflow.pm_workflowname}</Typography>
          <Typography variant="caption" color="text.secondary">
            Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep]}
          </Typography>
        </Box>
      </Box>
 
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
 
      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, idx) => (
            <Step key={label}>
              <StepLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: idx <= activeStep ? '#6366f1' : 'grey.300', color: '#fff', fontSize: fontSizes.sm }}>
                    {idx < activeStep ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : idx + 1}
                  </Avatar>
                  <Typography variant="caption" sx={{ fontWeight: idx === activeStep ? 700 : 400 }}>
                    {label}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
 
      {/* Step Content */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, minHeight: 300 }}>
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              <AccountTreeIcon sx={{ color: '#6366f1', mr: 1, verticalAlign: 'middle' }} />
              Basic Information
            </Typography>
            <Divider />
            <TextField label="Workflow Name" required fullWidth value={f.pm_workflowname} onChange={(e) => u('pm_workflowname', e.target.value)} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <TextField label="Description" fullWidth multiline rows={3} value={f.pm_workflowdescription} onChange={(e) => u('pm_workflowdescription', e.target.value)} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <FormControl fullWidth>
              <InputLabel>Module</InputLabel>
              <Select value={f.pm_module} label="Module" onChange={(e) => u('pm_module', e.target.value)} sx={{ borderRadius: 2 }}>
                {MODULES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        )}
 
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              <SettingsIcon sx={{ color: '#22c55e', mr: 1, verticalAlign: 'middle' }} />
              Settings
            </Typography>
            <Divider />
            <Chip label={'Version: v' + ((Number((workflow as any).pm_version) || 1) + 1) + ' (auto)'} size="small" sx={{ alignSelf: 'flex-start', fontWeight: 600 }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={f.pm_workflowstatus} label="Status" onChange={(e) => u('pm_workflowstatus', e.target.value as number)} sx={{ borderRadius: 2 }}>
                <MenuItem value={0}>Active</MenuItem>
                <MenuItem value={1}>Inactive</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={f.pm_isactive} onChange={(e) => { u('pm_isactive', e.target.checked); u('pm_workflowstatus', e.target.checked ? 0 : 1) }} color="primary" />}
              label={<Box><Typography variant="body2" sx={{ fontWeight: 600 }}>Enable Workflow</Typography><Typography variant="caption" color="text.secondary">{f.pm_isactive ? 'Active' : 'Paused'}</Typography></Box>}
              sx={{ m: 0 }}
            />
          </Box>
        )}
 
        {activeStep === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              <CheckCircleIcon sx={{ color: '#0ea5e9', mr: 1, verticalAlign: 'middle' }} />
              Review & Save
            </Typography>
            <Divider />
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary', mb: 2 }}>Basic Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Name</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{f.pm_workflowname || '\u2014'}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Module</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{f.pm_module || '\u2014'}</Typography></Box>
                <Box sx={{ gridColumn: 'span 2' }}><Typography variant="caption" color="text.secondary">Description</Typography><Typography variant="body2">{f.pm_workflowdescription || '\u2014'}</Typography></Box>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: fontSizes.xs, color: "text.secondary", mb: 2 }}>Settings</Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.pm_isactive ? "Active" : "Inactive"}</Typography>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary', mb: 2 }}>Settings</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>v{(Number((workflow as any).pm_version) || 1) + 1}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.pm_isactive ? 'Active' : 'Inactive'}</Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </Paper>
 
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => setActiveStep((s) => Math.max(0, s - 1))} disabled={activeStep === 0 || saving} sx={{ borderRadius: 2 }}>Previous</Button>
        <Typography variant="caption" color="text.secondary">{activeStep + 1} / {STEPS.length}</Typography>
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={() => setActiveStep((s) => s + 1)} disabled={!f.pm_workflowname.trim() && activeStep === 0}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, borderRadius: 2, fontWeight: 600, px: 4 }}>Next</Button>
        ) : (
          <Button variant="contained" onClick={handleSave} disabled={saving || !f.pm_workflowname.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : <PublishIcon />}
            sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, borderRadius: 2, fontWeight: 600, px: 4 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </Box>
    </Box>
  )
}