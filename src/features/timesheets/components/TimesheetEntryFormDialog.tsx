import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Avatar,
  Autocomplete,
  Alert,
} from '@mui/material'
import { Button } from '@/components/common'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

interface ProjectOption {
  id: string
  name: string
}

interface TimesheetEntryFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  timesheetName?: string
  loading?: boolean
  allocatedProjects?: ProjectOption[]
  projectsLoading?: boolean
  existingEntryDates?: string[]
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function TimesheetEntryFormDialog({
  open,
  onClose,
  onSubmit,
  timesheetName,
  loading,
  allocatedProjects = [],
  projectsLoading = false,
  existingEntryDates = [],
}: TimesheetEntryFormDialogProps) {
  const [form, setForm] = useState({
    pm_workdate: todayStr(),
    pm_hoursworked: 8,
    pm_worknotes: '',
    pm_ischargeable: true,
    _pm_project_value: '',
  })

  const isFuture = form.pm_workdate > todayStr()
  const isDuplicate = existingEntryDates.includes(form.pm_workdate)

  const validationError = useMemo(() => {
    if (isFuture) return 'Cannot log time for a future date.'
    if (isDuplicate) return 'An entry already exists for this date. Edit the existing entry instead.'
    return ''
  }, [isFuture, isDuplicate])

  const handleSubmit = async () => {
    if (validationError) return
    await onSubmit(form)
    setForm({
      pm_workdate: todayStr(),
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
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          <AccessTimeIcon sx={{ fontSize: 18, color: 'common.white' }} />
        </Avatar>
        Log Time Entry
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add a time entry to {timesheetName || 'this timesheet'}.
        </Typography>

        {validationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}

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
              slotProps={{
                inputLabel: { shrink: true },
                input: { inputProps: { max: todayStr() } },
              }}
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
              slotProps={{ input: { inputProps: { min: 0, max: 24, step: 0.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              fullWidth
              size="small"
              options={allocatedProjects}
              loading={projectsLoading}
              loadingText="Loading projects..."
              noOptionsText="No allocated projects found"
              getOptionLabel={(option) => option.name}
              value={allocatedProjects.find((p) => p.id === form._pm_project_value) || null}
              onChange={(_event, newValue) =>
                setForm((f) => ({ ...f, _pm_project_value: newValue?.id || '' }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Project"
                  placeholder="Select allocated project"
                />
              )}
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
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!form.pm_workdate || form.pm_hoursworked <= 0 || loading || !!validationError}
        >
          {loading ? 'Adding...' : 'Add Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
