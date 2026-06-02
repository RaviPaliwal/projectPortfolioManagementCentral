import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Avatar,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

interface TimesheetEntryFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  timesheetName?: string
  loading?: boolean
}

export function TimesheetEntryFormDialog({
  open,
  onClose,
  onSubmit,
  timesheetName,
  loading,
}: TimesheetEntryFormDialogProps) {
  const [form, setForm] = useState({
    pm_workdate: new Date().toISOString().split('T')[0],
    pm_hoursworked: 8,
    pm_worknotes: '',
    pm_ischargeable: true,
    _pm_project_value: '',
  })

  const handleSubmit = async () => {
    await onSubmit(form)
    setForm({
      pm_workdate: new Date().toISOString().split('T')[0],
      pm_hoursworked: 8,
      pm_worknotes: '',
      pm_ischargeable: true,
      _pm_project_value: '',
    })
  }

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', borderRadius: 1.15 }}>
          <AccessTimeIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Avatar>
        Log Time Entry
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add a time entry to {timesheetName || 'this timesheet'}.
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Work Date"
              type="date"
              required
              fullWidth
              size="small"
              value={form.pm_workdate}
              onChange={(e) => setForm((f) => ({ ...f, pm_workdate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.15 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Hours Worked"
              type="number"
              required
              fullWidth
              size="small"
              value={form.pm_hoursworked}
              onChange={(e) => setForm((f) => ({ ...f, pm_hoursworked: Number(e.target.value) }))}
              slotProps={{ input: { sx: { borderRadius: 1.15 }, inputProps: { min: 0, max: 24, step: 0.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Project ID / Name (Optional)"
              fullWidth
              size="small"
              value={form._pm_project_value}
              onChange={(e) => setForm((f) => ({ ...f, _pm_project_value: e.target.value }))}
              placeholder="Enter project ID or GUID"
              slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={form.pm_worknotes}
              onChange={(e) => setForm((f) => ({ ...f, pm_worknotes: e.target.value }))}
              placeholder="What did you work on?"
              slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pm_ischargeable}
                  onChange={(e) => setForm((f) => ({ ...f, pm_ischargeable: e.target.checked }))}
                  color="primary"
                />
              }
              label={<Typography variant="body2">This entry is chargeable to the project</Typography>}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 1.15 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!form.pm_workdate || form.pm_hoursworked <= 0 || loading}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}
        >
          {loading ? 'Adding...' : 'Add Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
