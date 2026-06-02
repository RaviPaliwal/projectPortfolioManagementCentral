import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material'
import type { RiskModel } from '@/types/dataverse'

interface RiskDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  target: RiskModel | null
}

export const RiskDeleteDialog = ({
  open,
  onClose,
  onConfirm,
  target,
}: RiskDeleteDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Delete Risk</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete <strong>{target?.pm_risktitle}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Placeholder for Add Mitigation Action Dialog as requested
interface MitigationActionFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

export const MitigationActionFormDialog = ({
  open,
  onClose,
  onSave,
}: MitigationActionFormDialogProps) => {
  // This is a placeholder as the original code didn't have this form
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Mitigation Action</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField label="Action Title" fullWidth size="small" />
          </Grid>
          <Grid size={12}>
            <TextField label="Description" multiline rows={2} fullWidth size="small" />
          </Grid>
          <Grid size={6}>
            <TextField label="Owner" fullWidth size="small" />
          </Grid>
          <Grid size={6}>
            <TextField label="Due Date" type="date" fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={12}>
            <TextField select label="Status" fullWidth size="small">
              <MenuItem value="1">In Progress</MenuItem>
              <MenuItem value="0">Complete</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave({})}>
          Save Action
        </Button>
      </DialogActions>
    </Dialog>
  )
}
