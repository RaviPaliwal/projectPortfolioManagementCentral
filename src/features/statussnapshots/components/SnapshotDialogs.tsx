import React from 'react'
import {
  Box, Typography, TextField, Select, MenuItem,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Grid, Divider, Avatar,
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
}) => {
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesomeIcon sx={{ fontSize: 18, color: 'primary.main' }} />
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
                <Select value={formData.pm_entitytype} label="Entity Type" onChange={(e) => setFormData((f: any) => ({ ...f, pm_entitytype: e.target.value }))} sx={{ borderRadius: 2 }}>
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
                <Select value={formData.pm_reportingperiod} label="Reporting Period" onChange={(e) => setFormData((f: any) => ({ ...f, pm_reportingperiod: e.target.value }))} sx={{ borderRadius: 2 }}>
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
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Green</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Amber</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} /> Red</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cost RAG</InputLabel>
                <Select value={formData.pm_costragstatus} label="Cost RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_costragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Green</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Amber</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Schedule RAG</InputLabel>
                <Select value={formData.pm_scheduleragstatus} label="Schedule RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_scheduleragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Green</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Amber</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} /> Red</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk RAG</InputLabel>
                <Select value={formData.pm_riskragstatus} label="Risk RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_riskragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Green</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Amber</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} /> Red</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource RAG</InputLabel>
                <Select value={formData.pm_resourceragstatus} label="Resource RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_resourceragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Green</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Amber</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Benefits RAG</InputLabel>
                <Select value={formData.pm_benefitsragstatus} label="Benefits RAG" onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitsragstatus: Number(e.target.value) }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Green</Box></MenuItem>
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
