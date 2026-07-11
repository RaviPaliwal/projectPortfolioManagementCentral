import { useState, useMemo, useEffect } from 'react'
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
  financialPeriods?: any[]
}

function getDefaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    pm_periodstartdate: start.toISOString().split('T')[0],
    pm_periodenddate: end.toISOString().split('T')[0],
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
  financialPeriods = [],
}: TimesheetFormDialogProps) {
  const { currentUser } = useUser()
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
    _pm_financialperiod_value: '',
    _pm_resource_value: defaultResId,
  })
  const [periodError, setPeriodError] = useState<string | null>(null)

  const selectedPeriod = useMemo(() => {
    if (!form._pm_financialperiod_value) return null
    return financialPeriods.find(p => p.pm_fiscalperiodid === form._pm_financialperiod_value)
  }, [form._pm_financialperiod_value, financialPeriods])

  useEffect(() => {
    if (open && financialPeriods && financialPeriods.length > 0) {
      const sorted = [...financialPeriods].sort((a, b) => new Date(a.pm_startdate || '').getTime() - new Date(b.pm_startdate || '').getTime())
      const defaultPeriod = sorted.find(p => !p.pm_isclosed) || sorted[0]
      if (defaultPeriod) {
        setForm(prev => ({
          ...prev,
          _pm_financialperiod_value: defaultPeriod.pm_fiscalperiodid,
        }))
      }
    }
  }, [open, financialPeriods])

  const resourceOptions = useMemo(() => {
    return resources
      .filter((r) => r.pm_fullname)
      .map((r) => ({ value: r.pm_resourceid ?? '', label: r.pm_fullname! }))
  }, [resources])

  const periodDurationDays = useMemo(() => {
    if (!selectedPeriod?.pm_startdate || !selectedPeriod?.pm_enddate) return 0
    const start = new Date(selectedPeriod.pm_startdate)
    const end = new Date(selectedPeriod.pm_enddate)
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }, [selectedPeriod])

  const periodValidationError = useMemo(() => {
    if (!selectedPeriod) return 'Please select a financial period.'
    if (selectedPeriod.pm_isclosed) {
      return 'The selected period is closed.'
    }
    return null
  }, [selectedPeriod])

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
    await onSubmit({
      ...form,
      pm_periodstartdate: selectedPeriod?.pm_startdate,
      pm_periodenddate: selectedPeriod?.pm_enddate,
    })
    setForm(prev => ({
      ...prev,
      _pm_financialperiod_value: '',
      _pm_resource_value: '',
    }))
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

          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small" required error={!form._pm_financialperiod_value}>
              <InputLabel id="financial-period-select-label">Financial Period</InputLabel>
              <Select
                id="financial-period-select"
                labelId="financial-period-select-label"
                value={form._pm_financialperiod_value}
                label="Financial Period"
                onChange={(e) => setForm((f) => ({ ...f, _pm_financialperiod_value: e.target.value }))}
              >
                {financialPeriods.map((p) => {
                  const startStr = p.pm_startdate ? new Date(p.pm_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                  const endStr = p.pm_enddate ? new Date(p.pm_enddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                  return (
                    <MenuItem key={p.pm_fiscalperiodid} value={p.pm_fiscalperiodid}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Period {p.pm_periodnumber} • FY{p.pm_fiscalyear} {p.pm_isclosed ? ' (Closed)' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {startStr} - {endStr}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
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
          disabled={!selectedPeriod?.pm_startdate || !selectedPeriod?.pm_enddate || !form._pm_resource_value || !!periodValidationError || loading}
        >
          {loading ? 'Creating...' : draftMode ? 'Create Entry' : 'Create Timesheet'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
