import { Box, Typography, Grid, CardContent, useTheme } from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import { ActionIcon, TableShell, StatusTag, Card } from '@/components/common'
import { fontSizes } from '@/styles'
import { formatDate } from '@/utils/formatters'
import type { HolidayModel } from '@/types/dataverse'

interface HolidayMonth {
  index: number
  name: string
  holidays: HolidayModel[]
}

interface HolidayCalendarProps {
  calendarYear: number
  onNavigateYear: (step: number) => void
  loading: boolean
  calendarMonthData: HolidayMonth[]
  onSelectHoliday: (holiday: HolidayModel) => void
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({
  calendarYear,
  onNavigateYear,
  loading,
  calendarMonthData,
  onSelectHoliday,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 4 }}>
        <ActionIcon
          icon={<NavigateBeforeIcon />}
          onClick={() => onNavigateYear(-1)}
          label="Previous Year"
          size={24}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, minWidth: 120, textAlign: 'center', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          {calendarYear}
        </Typography>
        <ActionIcon
          icon={<NavigateNextIcon />}
          onClick={() => onNavigateYear(1)}
          label="Next Year"
          size={24}
        />
      </Box>

      {loading ? (
        <TableShell loading={true} empty={false}>
          <Box sx={{ height: 400 }} />
        </TableShell>
      ) : (
        <Grid container spacing={2.5}>
          {calendarMonthData.map((month) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={month.index}>
              <Card variant="outlined" sx={{
                borderRadius: 2,
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: theme.shadows[isDark ? 8 : 2],
                  transform: 'translateY(-2px)',
                },
              }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: fontSizes.base }}>
                      {month.name}
                    </Typography>
                    <StatusTag
                      label={month.holidays.length}
                      size="small"
                      color={month.holidays.length > 0 ? 'primary' : 'default'}
                      variant={month.holidays.length > 0 ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700, minWidth: 28 }}
                    />
                  </Box>

                  {month.holidays.length === 0 ? (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      No holidays
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {month.holidays.map((h) => (
                        <Box
                          key={h.pm_holidayid}
                          onClick={() => onSelectHoliday(h)}
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: 'background.default',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            '&:hover': { 
                              bgcolor: isDark ? 'primary.dark' : 'primary.light',
                              color: 'primary.contrastText',
                              '& .MuiTypography-root': { color: 'inherit' },
                              '& .MuiSvgIcon-root': { color: 'inherit' }
                            },
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EventBusyIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: fontSizes.xs }}>
                              {h.pm_holidayname || 'Unnamed'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.25, ml: 3 }}>
                            {formatDate(h.pm_holidaydate)}
                            {h.pm_country ? ` \u00B7 ${h.pm_country}` : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  )
}
