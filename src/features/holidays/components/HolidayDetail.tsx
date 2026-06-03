import { Box, Paper, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import PublicIcon from '@mui/icons-material/Public'
import { StatusTag } from '@/components/common'
import { formatDate } from '@/utils/formatters'
import { fontSizes } from '@/styles'
import type { HolidayModel } from '@/types/dataverse'

interface HolidayDetailProps {
  holiday: HolidayModel
}

export const HolidayDetail: React.FC<HolidayDetailProps> = ({ holiday }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 16, color: 'primary.main' }} /> Holiday Information
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Date</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(holiday.pm_holidaydate)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
            <StatusTag
              icon={<PublicIcon sx={{ fontSize: 14 }} />}
              label={holiday.pm_isfixeddate ? 'Fixed Date' : 'Variable Date'} 
              color={holiday.pm_isfixeddate ? 'primary' : 'warning'} 
              size="small" 
              sx={{ fontWeight: 600 }} 
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Country</Typography>
            <Typography variant="body2">{holiday.pm_country || '—'}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Year</Typography>
            <Typography variant="body2" sx={{ fontFamily: '"Plus Jakarta Sans", monospace', fontSize: fontSizes.sm }}>
              {holiday.pm_year || '—'}
            </Typography>
          </Box>
        </Box>

        {holiday.pm_notes && (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Notes</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {holiday.pm_notes}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
