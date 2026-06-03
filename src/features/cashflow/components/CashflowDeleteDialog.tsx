import { Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import type { CashflowEntryModel } from '@/types/dataverse'

interface CashflowDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
  entryName: string
}

export const CashflowDeleteDialog: React.FC<CashflowDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
  entryName,
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()} 
      maxWidth="xs" 
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Delete Entry</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete <strong>{entryName}</strong>? This action cannot be undone and will affect financial reports.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" disabled={loading}>
          {loading ? 'Deleting...' : 'Delete Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
