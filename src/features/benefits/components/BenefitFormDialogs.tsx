import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Button,
  Box,
  Typography,
  Paper,
  Divider,
} from '@mui/material'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import TimelineIcon from '@mui/icons-material/Timeline'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { BenefitModel, PerformanceMeasureModel } from '@/types/dataverse'

interface BenefitDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: BenefitModel | null
}

export const BenefitDialog: React.FC<BenefitDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const fields: FormField[] = [
    { name: 'pm_benefitname', label: 'Benefit Name', type: 'text', required: true, gridSize: 6 },
    { name: 'pm_benefitcategory', label: 'Category', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'Financial' }, { value: '1', label: 'Non Financial' }, { value: '2', label: 'Strategic' }
    ]},
    { name: 'pm_benefitreference', label: 'Reference / ID', type: 'text', gridSize: 6 },
    { name: 'pm_benefitstatus', label: 'Status', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'On Track' }, { value: '1', label: 'Planned' }, { value: '2', label: 'At Risk' }
    ]},
    { name: 'pm_ragstatus', label: 'Assessment (RAG)', type: 'select', defaultValue: 1, gridSize: 6, options: [
      { value: '1', label: 'Low — On Track' }, { value: '0', label: 'Medium — At Risk' }, { value: '2', label: 'High — Off Track' }
    ]},
    { name: 'pm_benefittype', label: 'Benefit Type', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'Cashable' }, { value: '1', label: 'Non Cashable' }, { value: '2', label: 'Avoided Cost' }
    ]},
    { name: '_pm_benifitowner_value', label: 'Benefit Owner', type: 'user-select-id', gridSize: 6 },
    { name: 'pm_baselinevalue', label: 'Baseline Value', type: 'number', defaultValue: 0, gridSize: 4 },
    { name: 'pm_targetvalue', label: 'Target Value', type: 'number', defaultValue: 0, gridSize: 4 },
    { name: 'pm_unitofmeasure', label: 'Unit of Measure', type: 'text', gridSize: 4 },
    { name: 'pm_realisationstartdate', label: 'Realisation Start Date', type: 'date', gridSize: 6 },
    { name: 'pm_realisationenddate', label: 'Realisation End Date', type: 'date', gridSize: 6 },
    { name: 'pm_benefitdescription', label: 'Benefit Description', type: 'multiline', rows: 3 }
  ]

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Benefit' : 'Register Benefit'}
      fields={fields}
      initialData={initialData || undefined}
      onClose={onClose}
      onSubmit={onSave}
      submitText={initialData ? 'Update Benefit' : 'Register Benefit'}
    />
  )
}

interface MeasureDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  benefitName?: string
  existingMeasures?: PerformanceMeasureModel[]
}

export const MeasureDialog: React.FC<MeasureDialogProps> = ({
  open,
  onClose,
  onSave,
  benefitName = '',
  existingMeasures = [],
}) => {
  const [form, setForm] = useState({
    pm_measurename: '',
    pm_reportingperiod: '',
    pm_evidenced: '0',
    pm_plannedvalue: '',
    pm_actualvalue: '',
    pm_notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0]
      setForm({
        pm_measurename: benefitName ? `${benefitName} Measure` : 'Performance Measure',
        pm_reportingperiod: today,
        pm_evidenced: '0',
        pm_plannedvalue: '0',
        pm_actualvalue: '0',
        pm_notes: '',
      })
      setSubmitting(false)
    }
  }, [open, benefitName])

  const existingSums = useMemo(() => {
    return existingMeasures.reduce(
      (acc, m) => {
        acc.planned += Number(m.pm_plannedvalue) || 0
        acc.actual += Number(m.pm_actualvalue) || 0
        return acc
      },
      { planned: 0, actual: 0 }
    )
  }, [existingMeasures])

  const plannedNum = Number(form.pm_plannedvalue) || 0
  const actualNum = Number(form.pm_actualvalue) || 0

  const cumulativePlanned = existingSums.planned + plannedNum
  const cumulativeActual = existingSums.actual + actualNum

  const variance = useMemo(() => {
    if (cumulativePlanned > 0) {
      return ((cumulativeActual - cumulativePlanned) / cumulativePlanned) * 100
    }
    return actualNum - plannedNum
  }, [cumulativePlanned, cumulativeActual, actualNum, plannedNum])

  const isFormValid = form.pm_measurename.trim() !== '' && form.pm_reportingperiod !== ''

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        pm_measurename: form.pm_measurename,
        pm_reportingperiod: form.pm_reportingperiod,
        pm_evidenced: Number(form.pm_evidenced),
        pm_plannedvalue: plannedNum,
        pm_actualvalue: actualNum,
        pm_cumulativeplanned: cumulativePlanned,
        pm_cumulativeactual: cumulativeActual,
        pm_notes: form.pm_notes,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrackChangesIcon color="primary" />
        Add Performance Measure
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              required
              label="Measure Name"
              value={form.pm_measurename}
              onChange={(e) => setForm((f) => ({ ...f, pm_measurename: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="date"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              label="Reporting Period"
              value={form.pm_reportingperiod}
              onChange={(e) => setForm((f) => ({ ...f, pm_reportingperiod: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              select
              fullWidth
              label="Evidenced"
              value={form.pm_evidenced}
              onChange={(e) => setForm((f) => ({ ...f, pm_evidenced: e.target.value }))}
            >
              <MenuItem value="0">No</MenuItem>
              <MenuItem value="1">Yes</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Planned Value (This Period)"
              value={form.pm_plannedvalue}
              onChange={(e) => setForm((f) => ({ ...f, pm_plannedvalue: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Actual Value (This Period)"
              value={form.pm_actualvalue}
              onChange={(e) => setForm((f) => ({ ...f, pm_actualvalue: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={form.pm_notes}
              onChange={(e) => setForm((f) => ({ ...f, pm_notes: e.target.value }))}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <TimelineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                Measure Progression & Variance
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Cumulative Planned</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cumulativePlanned.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Cumulative Actual</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cumulativeActual.toLocaleString()}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Overall Variance</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: variance >= 0 ? 'success.main' : 'error.main' }}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid || submitting}
          startIcon={<TrackChangesIcon />}
        >
          {submitting ? 'Saving...' : 'Add Measure'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
