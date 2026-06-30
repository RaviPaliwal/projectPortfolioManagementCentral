import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Box,
  Alert,
  FormHelperText,
} from '@mui/material'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import type { ResourceModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { Button } from '@/components/common'

interface TimesheetFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  resources: ResourceModel[]
  loading?: boolean
  draftMode?: boolean
  overlapError?: string | null
}

function getDefaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    pm_periodstartdate: start.toISOString().split('T')[0],
    pm_periodenddate: end.toISOString().split('T')[0],
    pm_reportingperiod: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
  }
}

export function TimesheetFormDialog({
  open,
  onClose,
  onSubmit,
  resources,
  loading,
  draftMode = false,
  overlapError = null,
}: TimesheetFormDialogProps) {
  const { currentUser } = useUser()
  const defaultRange = getDefaultDateRange()
  const defaultResId = useMemo(() => {
    if (!draftMode || !currentUser?.fullname) return ''
    const match = resources.find(
      (r) => r.pm_fullname?.toLowerCase() === currentUser.fullname?.toLowerCase()
    )
    return match?.pm_resourceid ?? ''
  }, [draftMode, currentUser, resources])
  const [form, setForm] = useState({
    ownerid: currentUser?.systemuserid ?? '',
    owneridtype: 'systemuser' as string,
    pm_periodstartdate: draftMode ? defaultRange.pm_periodstartdate : '',
    pm_periodenddate: draftMode ? defaultRange.pm_periodenddate : '',
    pm_reportingperiod: draftMode ? defaultRange.pm_reportingperiod : '',
    _pm_resource_value: defaultResId,
  })
  const [periodError, setPeriodError] = useState<string | null>(null)

  const resourceOptions = useMemo(() => {
    return resources
      .filter((r) => r.pm_fullname)
      .map((r) => ({ value: r.pm_resourceid ?? '', label: r.pm_fullname! }))
  }, [resources])

  const periodDurationDays = useMemo(() => {
    if (!form.pm_periodstartdate || !form.pm_periodenddate) return 0
    const start = new Date(form.pm_periodstartdate)
    const end = new Date(form.pm_periodenddate)
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }, [form.pm_periodstartdate, form.pm_periodenddate])

  const periodValidationError = useMemo(() => {
    if (!form.pm_periodstartdate || !form.pm_periodenddate) return null
    if (form.pm_periodenddate < form.pm_periodstartdate) {
      return 'Period End must be on or after Period Start.'
    }
    if (periodDurationDays > 370) {
      return 'Period cannot exceed 370 days. Please select a shorter range.'
    }
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const start = new Date(form.pm_periodstartdate + 'T00:00:00')
    const futureLimit = new Date(now.getFullYear() + 1, now.getMonth(), 1)
    if (start > futureLimit) {
      return 'Start date cannot be more than 12 months in the future.'
    }
    return null
  }, [form.pm_periodstartdate, form.pm_periodenddate, periodDurationDays])

  const handleSubmit = async () => {
    if (periodValidationError) {
      setPeriodError(periodValidationError)
      return
    }
    if (!form._pm_resource_value && !form.ownerid) {
      setPeriodError('Please select a resource.')
      return
    }
    setPeriodError(null)
    await onSubmit(form)
    const range = getDefaultDateRange()
    setForm({
      ownerid: currentUser?.systemuserid ?? '',
      owneridtype: 'systemuser',
      pm_periodstartdate: draftMode ? range.pm_periodstartdate : '',
      pm_periodenddate: draftMode ? range.pm_periodenddate : '',
      pm_reportingperiod: draftMode ? range.pm_reportingperiod : '',
      _pm_resource_value: '',
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
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
          <EventNoteIcon sx={{ fontSize: 18, color: 'common.white' }} />
        </Avatar>
        {draftMode ? 'New Timesheet Entry' : 'New Timesheet'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {draftMode
            ? 'Create a new timesheet for yourself. Date range defaults to the current month.'
            : 'Create a new timesheet for a resource and time period. Entries can be added after creation.'}
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small" required error={!form._pm_resource_value}>
              <InputLabel id="resource-select-label">Resource</InputLabel>
              <Select
                id="resource-select"
                labelId="resource-select-label"
                value={form._pm_resource_value}
                label="Resource"
                aria-describedby="resource-select-helper"
                onChange={(e) => setForm((f) => ({ ...f, _pm_resource_value: e.target.value }))}
              >
                {resourceOptions.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
              {!form._pm_resource_value && (
                <FormHelperText id="resource-select-helper">Resource is required</FormHelperText>
              )}
            </FormControl>
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
              slotProps={{ inputLabel: { shrink: true } }}
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
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          {periodDurationDays > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <CalendarMonthIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                  Period duration: <strong>{periodDurationDays} day{periodDurationDays !== 1 ? 's' : ''}</strong>
                </Typography>
              </Box>
            </Grid>
          )}

          {periodError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error" onClose={() => setPeriodError(null)}>
                {periodError}
              </Alert>
            </Grid>
          )}
          {overlapError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning">
                {overlapError}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!form.pm_periodstartdate || !form.pm_periodenddate || !form._pm_resource_value || !!periodValidationError || loading}
        >
          {loading ? 'Creating...' : draftMode ? 'Create Entry' : 'Create Timesheet'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
