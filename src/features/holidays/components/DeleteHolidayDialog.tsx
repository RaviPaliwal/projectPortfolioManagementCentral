import { Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'

interface DeleteHolidayDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
}

export const DeleteHolidayDialog: React.FC<DeleteHolidayDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()} 
      maxWidth="xs" 
      fullWidth 
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Holiday</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to remove this holiday from the calendar? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" disabled={loading}>
          {loading ? 'Removing...' : 'Remove'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
