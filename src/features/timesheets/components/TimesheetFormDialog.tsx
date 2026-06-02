import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
} from '@mui/material'
import EventNoteIcon from '@mui/icons-material/EventNote'
import type { ResourceModel } from '@/types/dataverse'

interface TimesheetFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  resources: ResourceModel[]
  loading?: boolean
}

export function TimesheetFormDialog({
  open,
  onClose,
  onSubmit,
  resources,
  loading,
}: TimesheetFormDialogProps) {
  const [form, setForm] = useState({
    pm_ownername: '',
    pm_periodstartdate: '',
    pm_periodenddate: '',
    pm_reportingperiod: '',
    _pm_resource_value: '',
  })

  const resourceOptions = useMemo(() => {
    return resources
      .filter((r) => r.pm_fullname)
      .map((r) => ({ value: r.pm_resourceid ?? '', label: r.pm_fullname! }))
  }, [resources])

  const handleSubmit = async () => {
    await onSubmit(form)
    setForm({
      pm_ownername: '',
      pm_periodstartdate: '',
      pm_periodenddate: '',
      pm_reportingperiod: '',
      _pm_resource_value: '',
    })
  }

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', borderRadius: 1.5 }}>
          <EventNoteIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Avatar>
        New Timesheet
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a new timesheet for a resource and time period. Entries can be added after creation.
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Resource</InputLabel>
              <Select
                value={form._pm_resource_value}
                label="Resource"
                onChange={(e) => setForm((f) => ({ ...f, _pm_resource_value: e.target.value }))}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">None (enter name manually)</MenuItem>
                {resourceOptions.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Owner / Name"
              fullWidth
              size="small"
              value={form.pm_ownername}
              onChange={(e) => setForm((f) => ({ ...f, pm_ownername: e.target.value }))}
              placeholder="Leave blank to use resource name"
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Period Start"
              type="date"
              required
              fullWidth
              size="small"
              value={form.pm_periodstartdate}
              onChange={(e) => setForm((f) => ({ ...f, pm_periodstartdate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Period End"
              type="date"
              required
              fullWidth
              size="small"
              value={form.pm_periodenddate}
              onChange={(e) => setForm((f) => ({ ...f, pm_periodenddate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!form.pm_periodstartdate || !form.pm_periodenddate || loading}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
        >
          {loading ? 'Creating...' : 'Create Timesheet'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
