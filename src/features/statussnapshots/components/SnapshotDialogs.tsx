import React from 'react'
import {
  Box, Typography, TextField, Select, MenuItem,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Grid, Divider, Avatar, Paper,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AssessmentIcon from '@mui/icons-material/Assessment'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import ChecklistIcon from '@mui/icons-material/Checklist'
import AssignmentIcon from '@mui/icons-material/Assignment'
import type { ProjectStatusSnapshotModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface SnapshotDialogsProps {
  showForm: boolean
  onCloseForm: () => void
  editingSnapshot: ProjectStatusSnapshotModel | null
  formData: any
  setFormData: (val: any) => void
  handleSave: () => Promise<void>
  actionLoading: boolean
  deleteConfirm: string | null
  setDeleteConfirm: (val: string | null) => void
  handleDelete: () => Promise<void>
  entityTypeOptions: { value: string; label: string }[]
  fiscalPeriodOptions: { value: string; label: string }[]
  activePortfolios?: any[]
  activeProgrammes?: any[]
  activeProjects?: any[]
}

export const SnapshotDialogs: React.FC<SnapshotDialogsProps> = ({
  showForm,
  onCloseForm,
  editingSnapshot,
  formData,
  setFormData,
  handleSave,
  actionLoading,
  deleteConfirm,
  setDeleteConfirm,
  handleDelete,
  entityTypeOptions,
  fiscalPeriodOptions,
  activePortfolios = [],
  activeProgrammes = [],
  activeProjects = [],
}) => {
  const handleEntityTypeChange = (type: string) => {
    setFormData((f: any) => ({
      ...f,
      pm_entitytype: type,
      selectedEntityId: '',
      pm_projectcode: '',
      pm_snapshotname: '',
    }))
  }

  const handleEntitySelect = (entityId: string) => {
    if (!entityId) {
      setFormData((f: any) => ({
        ...f,
        selectedEntityId: '',
        pm_projectcode: '',
        pm_snapshotname: '',
      }))
      return
    }

    let name = ''
    let code = ''
    let overallRag = 1
    let costRag = 0
    let scheduleRag = 1
    let benefitsRag = 0
    let riskRag = 1
    let resourceRag = 0

    if (formData.pm_entitytype === 'Project') {
      const proj = activeProjects.find((p) => p.pm_projectid === entityId)
      if (proj) {
        name = proj.pm_projectname || ''
        code = proj.pm_projectcode || ''
        
        const oRag = Number(proj.pm_ragstatus)
        if (oRag === 0) overallRag = 0
        else if (oRag === 1) overallRag = 1
        else if (oRag === 2) overallRag = 2

        const cRag = Number(proj.pm_costragstatus)
        if (cRag === 0) costRag = 0
        else if (cRag === 1 || cRag === 2) costRag = 1

        const sRag = Number(proj.pm_scheduleragstatus)
        if (sRag === 0) scheduleRag = 0
        else if (sRag === 1) scheduleRag = 1
        else if (sRag === 2) scheduleRag = 2

        const bRag = Number(proj.pm_benefitsragstatus)
        if (bRag === 0) benefitsRag = 0
        else benefitsRag = 1
      }
    } else if (formData.pm_entitytype === 'Programme') {
      const prog = activeProgrammes.find((p) => p.pm_programmeid === entityId)
      if (prog) {
        name = prog.pm_programmename || ''
        
        const oRag = Number(prog.pm_ragstatus)
        if (oRag === 0) overallRag = 0
        else if (oRag === 1) overallRag = 1
        else if (oRag === 2) overallRag = 2
      }
    } else if (formData.pm_entitytype === 'Portfolio') {
      const port = activePortfolios.find((p) => p.pm_portfolioid === entityId)
      if (port) {
        name = port.pm_portfolioname || ''

        const oRag = Number(port.pm_ragstatus)
        if (oRag === 0) overallRag = 0
        else if (oRag === 1) overallRag = 1
        else if (oRag === 2) overallRag = 2
      }
    }

    const periodPart = formData.pm_reportingperiod ? ` ${formData.pm_reportingperiod}` : ''
    const generatedName = `${name}${periodPart} Snapshot`

    setFormData((f: any) => ({
      ...f,
      selectedEntityId: entityId,
      pm_projectcode: code,
      pm_snapshotname: generatedName,
      pm_overallragstatus: overallRag,
      pm_costragstatus: costRag,
      pm_scheduleragstatus: scheduleRag,
      pm_benefitsragstatus: benefitsRag,
      pm_riskragstatus: riskRag,
      pm_resourceragstatus: resourceRag,
    }))
  }

  const handlePeriodChange = (period: string) => {
    let newName = formData.pm_snapshotname
    if (formData.selectedEntityId) {
      let entityName = ''
      if (formData.pm_entitytype === 'Project') {
        entityName = activeProjects.find(p => p.pm_projectid === formData.selectedEntityId)?.pm_projectname ?? ''
      } else if (formData.pm_entitytype === 'Programme') {
        entityName = activeProgrammes.find(p => p.pm_programmeid === formData.selectedEntityId)?.pm_programmename ?? ''
      } else if (formData.pm_entitytype === 'Portfolio') {
        entityName = activePortfolios.find(p => p.pm_portfolioid === formData.selectedEntityId)?.pm_portfolioname ?? ''
      }
      if (entityName) {
        const periodPart = period ? ` ${period}` : ''
        newName = `${entityName}${periodPart} Snapshot`
      }
    }
    setFormData((f: any) => ({
      ...f,
      pm_reportingperiod: period,
      pm_snapshotname: newName,
    }))
  }
  return (
    <>
      {/* Create/Edit Dialog */}
      <Dialog 
        open={showForm} 
        onClose={() => !actionLoading && onCloseForm()} 
        maxWidth="md" 
        fullWidth 
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 2 }}>
            {editingSnapshot ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AssessmentIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingSnapshot ? 'Edit Status Snapshot' : 'Add New Status Snapshot'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingSnapshot ? 'Update RAG status ratings and details for ' + editingSnapshot.pm_snapshotname + '.' : 'Create a new status snapshot with multi-dimensional RAG ratings across the 13-period fiscal year.'}
          </Typography>

          {!editingSnapshot && (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                border: '1px dashed',
                borderColor: 'primary.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Auto-Generate Snapshot from Active Entity
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Select an active Project, Programme, or Portfolio to auto-fill its name, code, and current live RAG status ratings.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Entity Type</InputLabel>
                    <Select
                      value={formData.pm_entitytype}
                      label="Entity Type"
                      onChange={(e) => handleEntityTypeChange(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {entityTypeOptions.filter((o) => o.value).map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small" disabled={!formData.pm_entitytype}>
                    <InputLabel>Select Active {formData.pm_entitytype}</InputLabel>
                    <Select
                      value={formData.selectedEntityId || ''}
                      label={`Select Active ${formData.pm_entitytype}`}
                      onChange={(e) => handleEntitySelect(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">-- Select Active {formData.pm_entitytype} --</MenuItem>
                      {formData.pm_entitytype === 'Project' && activeProjects.map((p) => (
                        <MenuItem key={p.pm_projectid} value={p.pm_projectid}>{p.pm_projectname} ({p.pm_projectcode || 'No Code'})</MenuItem>
                      ))}
                      {formData.pm_entitytype === 'Programme' && activeProgrammes.map((p) => (
                        <MenuItem key={p.pm_programmeid} value={p.pm_programmeid}>{p.pm_programmename}</MenuItem>
                      ))}
                      {formData.pm_entitytype === 'Portfolio' && activePortfolios.map((p) => (
                        <MenuItem key={p.pm_portfolioid} value={p.pm_portfolioid}>{p.pm_portfolioname}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssignmentIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Snapshot Name" required fullWidth size="small" value={formData.pm_snapshotname}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_snapshotname: e.target.value }))}
                placeholder="e.g., Q1 2026 Status Report" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Entity Type</InputLabel>
                <Select value={formData.pm_entitytype} label="Entity Type" onChange={(e) => handleEntityTypeChange(e.target.value)} sx={{ borderRadius: 2 }} disabled={!editingSnapshot && !!formData.selectedEntityId}>
                  {entityTypeOptions.filter((o) => o.value).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Project Code" fullWidth size="small" value={formData.pm_projectcode}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_projectcode: e.target.value }))}
                placeholder="e.g., PROJ-001" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Reporting Period</InputLabel>
                <Select value={formData.pm_reportingperiod} label="Reporting Period" onChange={(e) => handlePeriodChange(e.target.value)} sx={{ borderRadius: 2 }}>
                  {fiscalPeriodOptions.filter((o) => o.value).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssessmentIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              RAG Status Ratings
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Overall RAG</InputLabel>
                <Select value={formData.pm_overallragstatus} label="Overall RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_overallragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Low</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Medium</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} /> High</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cost RAG</InputLabel>
                <Select value={formData.pm_costragstatus} label="Cost RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_costragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Low</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Medium</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Schedule RAG</InputLabel>
                <Select value={formData.pm_scheduleragstatus} label="Schedule RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_scheduleragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Low</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Medium</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} /> High</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk RAG</InputLabel>
                <Select value={formData.pm_riskragstatus} label="Risk RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_riskragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Low</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Medium</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} /> High</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource RAG</InputLabel>
                <Select value={formData.pm_resourceragstatus} label="Resource RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_resourceragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Low</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Medium</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Benefits RAG</InputLabel>
                <Select value={formData.pm_benefitsragstatus} label="Benefits RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitsragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Low</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ChecklistIcon sx={{ fontSize: 16, color: 'text.disabled' }} /> Not Set</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssignmentIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Submission & Notes
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Submitted Date" type="date" fullWidth size="small" value={formData.pm_submissiondate}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_submissiondate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Submitted By" fullWidth size="small" value={formData.pm_submittedby}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_submittedby: e.target.value }))}
                placeholder="e.g., John Smith" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Highlights" fullWidth multiline rows={2} size="small" value={formData.pm_projecthighlights}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_projecthighlights: e.target.value }))}
                placeholder="Key achievements and positive developments..." slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Lowlights" fullWidth multiline rows={2} size="small" value={formData.pm_projectlowlights}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_projectlowlights: e.target.value }))}
                placeholder="Issues, risks, or areas needing attention..." slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Action Items" fullWidth multiline rows={2} size="small" value={formData.pm_actionitems}
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_actionitems: e.target.value }))}
                placeholder="Follow-up actions required..." slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onCloseForm} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained"
            disabled={!formData.pm_snapshotname.trim() || actionLoading}
            sx={{ borderRadius: 2, fontWeight: 600 }}>
            {actionLoading ? 'Saving...' : editingSnapshot ? 'Update Snapshot' : 'Create Snapshot'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Snapshot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this status snapshot? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
