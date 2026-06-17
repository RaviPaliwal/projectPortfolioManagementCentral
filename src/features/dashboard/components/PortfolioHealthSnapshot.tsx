import { Box, Paper, Typography, Skeleton, Divider, useTheme } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { StatusChip, HealthSplitBar, StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { PortfolioModel, ProgrammeModel } from '@/types/dataverse'

interface PortfolioHealthSnapshotProps {
  metrics: {
    projectsInGreen: number
    projectsInAmber: number
    projectsInRed: number
  }
  portfolioSnapshot: PortfolioModel[]
  programmeSnapshot: ProgrammeModel[]
  milestonesDue: number
  loading: boolean
}

export const PortfolioHealthSnapshot = ({
  metrics,
  portfolioSnapshot,
  programmeSnapshot,
  milestonesDue,
  loading,
}: PortfolioHealthSnapshotProps) => {
  const theme = useTheme()

  return (
    <Paper
      sx={{
        p: 3,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 12px 20px rgba(0,0,0,0.5)'
            : '0 8px 16px rgba(99,102,241,0.06)',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>Health Snapshot</Typography>
        {!loading && (
          <StatusTag
            icon={<CalendarMonthIcon />}
            label={`${milestonesDue} due`}
            color={milestonesDue > 0 ? 'warning' : 'default'}
            variant="outlined"
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Portfolio/programme RAG breakdown and upcoming milestones.
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={260} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* RAG Health Split Bar */}
          <HealthSplitBar
            green={metrics.projectsInGreen}
            amber={metrics.projectsInAmber}
            red={metrics.projectsInRed}
          />

          <Divider />

          {/* Portfolio Snapshot */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.03em', mb: 1, display: 'block' }}>
              Portfolio Health
            </Typography>
            {portfolioSnapshot.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {portfolioSnapshot.map((portfolio) => (
                  <Box key={portfolio.pm_portfolioid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {portfolio.pm_portfolioname ?? 'Unnamed'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}
                      </Typography>
                    </Box>
                    <StatusChip status={portfolio.pm_ragstatus} type="rag" />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">No portfolio data.</Typography>
            )}
          </Box>

          {/* Programme Snapshot */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', textTransform: 'uppercase', letterSpacing: '0.03em', mb: 1, display: 'block' }}>
              Programme Health
            </Typography>
            {programmeSnapshot.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {programmeSnapshot.map((programme) => (
                  <Box key={programme.pm_programmeid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {programme.pm_programmename ?? 'Unnamed'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{programme.pm_portfolioname ?? 'No portfolio'}</Typography>
                    </Box>
                    <StatusChip status={programme.pm_ragstatus} type="rag" />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">No programme data.</Typography>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  )
}

export default PortfolioHealthSnapshot
