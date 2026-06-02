import {
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
  Avatar,
} from '@mui/material'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'

interface MeasureFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  formData: any
  setFormData: (data: any) => void
  actionLoading: boolean
}

export const MeasureFormDialog = ({
  open,
  onClose,
  onSave,
  formData,
  setFormData,
  actionLoading,
}: MeasureFormDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={() => !actionLoading && onClose()}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#22c55e', borderRadius: 1.5 }}>
          <TrackChangesIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Avatar>
        Add Performance Measure
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Record a performance measure for this period. Variance will be calculated automatically.
        </Typography>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Measure Name"
              required
              fullWidth
              size="small"
              value={formData.pm_measurename}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_measurename: e.target.value }))}
              placeholder="e.g., Q1 2026 Cost Savings"
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Reporting Period"
              type="month"
              fullWidth
              size="small"
              value={formData.pm_reportingperiod}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_reportingperiod: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Evidenced</InputLabel>
              <Select
                value={formData.pm_evidenced}
                label="Evidenced"
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_evidenced: e.target.value as number }))}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value={0}>No</MenuItem>
                <MenuItem value={1}>Yes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Planned Value (This Period)"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_plannedvalue}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_plannedvalue: Number(e.target.value) || 0 }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Actual Value (This Period)"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_actualvalue}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_actualvalue: Number(e.target.value) || 0 }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Cumulative Planned"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_cumulativeplanned}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_cumulativeplanned: Number(e.target.value) || 0 }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Cumulative Actual"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_cumulativeactual}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_cumulativeactual: Number(e.target.value) || 0 }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={formData.pm_notes}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_notes: e.target.value }))}
              placeholder="Any additional context about this measure..."
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={!formData.pm_measurename.trim() || actionLoading}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
        >
          {actionLoading ? 'Adding...' : 'Add Measure'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
