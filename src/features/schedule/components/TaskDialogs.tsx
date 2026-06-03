import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material'
import type { ProjectTaskModel } from '@/types/dataverse'

interface TaskDialogsProps {
  showForm: boolean
  isEditing: boolean
  onClose: () => void
  formData: Partial<ProjectTaskModel>
  onFieldChange: (field: keyof ProjectTaskModel, value: any) => void
  onSave: () => void
  loading: boolean
  statusOptions: any[]
  tasks: ProjectTaskModel[]
}

export const TaskDialogs: React.FC<TaskDialogsProps> = ({
  showForm,
  isEditing,
  onClose,
  formData,
  onFieldChange,
  onSave,
  loading,
  statusOptions,
  tasks,
}) => {
  return (
    <Dialog 
      open={showForm} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEditing ? 'Edit Task' : 'Add New Task'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Task Name"
              required
              fullWidth
              size="small"
              value={formData.pm_taskname || ''}
              onChange={(e) => onFieldChange('pm_taskname', e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="WBS Number"
              fullWidth
              size="small"
              placeholder="e.g. 1.2.3"
              value={formData.pm_wbsnumber || ''}
              onChange={(e) => onFieldChange('pm_wbsnumber', e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={formData.pm_taskdescription || ''}
              onChange={(e) => onFieldChange('pm_taskdescription', e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
             <FormControl fullWidth size="small">
              <InputLabel>Level</InputLabel>
              <Select
                value={String(formData.pm_tasklevel ?? '1')}
                label="Level"
                onChange={(e) => onFieldChange('pm_tasklevel', Number(e.target.value))}
                sx={{ borderRadius: 1.5 }}
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <MenuItem key={l} value={String(l)}>Level {l}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              label="Duration (days)"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_durationdays ?? 5}
              onChange={(e) => onFieldChange('pm_durationdays', Number(e.target.value))}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              label="Lag (days)"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_lagdays ?? 0}
              onChange={(e) => onFieldChange('pm_lagdays', Number(e.target.value))}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={String(formData.pm_taskstatus ?? '1')}
                label="Status"
                onChange={(e) => onFieldChange('pm_taskstatus', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {statusOptions.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Planned Start"
              type="date"
              fullWidth
              size="small"
              value={formData.pm_plannedstartdate ? (formData.pm_plannedstartdate as string).split('T')[0] : ''}
              onChange={(e) => onFieldChange('pm_plannedstartdate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Planned End"
              type="date"
              fullWidth
              size="small"
              value={formData.pm_plannedenddate ? (formData.pm_plannedenddate as string).split('T')[0] : ''}
              onChange={(e) => onFieldChange('pm_plannedenddate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Progress (%)"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_percentcomplete ?? 0}
              onChange={(e) => onFieldChange('pm_percentcomplete', Number(e.target.value))}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Assigned Resource"
              fullWidth
              size="small"
              value={formData.pm_assignedresource || ''}
              onChange={(e) => onFieldChange('pm_assignedresource', e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
             <FormControl fullWidth size="small">
              <InputLabel>Predecessor Task</InputLabel>
              <Select
                value={formData._pm_predecessortask_value || ''}
                label="Predecessor Task"
                onChange={(e) => onFieldChange('_pm_predecessortask_value', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="">None</MenuItem>
                {tasks.filter(t => t.pm_projecttaskid !== formData.pm_projecttaskid).map(t => (
                  <MenuItem key={t.pm_projecttaskid} value={t.pm_projecttaskid}>{t.pm_wbsnumber ? `${t.pm_wbsnumber} - ` : ''}{t.pm_taskname}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.pm_ismilestone}
                  onChange={(e) => onFieldChange('pm_ismilestone', e.target.checked)}
                />
              }
              label="Mark as Milestone"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.pm_oncriticalpath}
                  onChange={(e) => onFieldChange('pm_oncriticalpath', e.target.checked)}
                />
              }
              label="On Critical Path"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Task'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
