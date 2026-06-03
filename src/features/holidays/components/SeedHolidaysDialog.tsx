import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import type { HolidayModel } from '@/types/dataverse'

interface SeedHolidaysDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
  calendarYear: number
  holidays: Array<Omit<HolidayModel, 'pm_holidayid' | 'statecode'>>
}

export const SeedHolidaysDialog: React.FC<SeedHolidaysDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
  calendarYear,
  holidays,
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && onClose()} 
      maxWidth="xs" 
      fullWidth 
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FlagIcon sx={{ color: 'success.main' }} />
        Seed Irish Holidays
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This will add the 9 Irish public holidays for the year <strong>{calendarYear}</strong> to the calendar:
        </Typography>
        
        <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
          {holidays.map((h, i) => (
            <Box component="li" key={i} sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {h.pm_holidayname}{h.pm_isfixeddate ? '' : ' (Variable)'}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="success" 
          disabled={loading} 
          startIcon={<FlagIcon />} 
          sx={{ fontWeight: 600 }}
        >
          {loading ? 'Adding...' : 'Add 9 Holidays'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
