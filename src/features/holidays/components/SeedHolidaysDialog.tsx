import { Box, Typography } from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import type { HolidayModel } from '@/types/dataverse'
import { Dialog } from '@/components/common/Dialog/Dialog'

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
      title="Seed Irish Holidays"
      onClose={() => !loading && onClose()}
      onConfirm={onConfirm}
      confirmText={loading ? 'Adding...' : 'Add 9 Holidays'}
      confirmDisabled={loading}
      isLoading={loading}
      content={
        <Box>
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
        </Box>
      }
    />
  )
}
