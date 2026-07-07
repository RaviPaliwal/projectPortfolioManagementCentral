import { Box, Typography, LinearProgress, useTheme } from '@mui/material'
import { fontSizes } from '../../../styles'

export interface StatusProgressBarProps {
  value: number
  total?: number
  label?: string
  showPercentage?: boolean
  thresholds?: {
    warning: number
    error: number
  }
  height?: number
  sx?: any
}

export const StatusProgressBar = ({
  value,
  total,
  label,
  showPercentage = true,
  thresholds = { warning: 70, error: 90 },
  height = 10,
  sx = {},
}: StatusProgressBarProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const percentage = total && total > 0 ? Math.round((value / total) * 100) : value
  const clampedPercentage = Math.min(100, Math.max(0, percentage))

  const getBarColor = () => {
    if (percentage >= thresholds.error) return theme.palette.error.main
    if (percentage >= thresholds.warning) return theme.palette.warning.main
    return theme.palette.success.main
  }

  return (
    <Box sx={{ width: '100%', ...sx }}>
      {(label || showPercentage) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          {label && (
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          )}
          {showPercentage && (
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: getBarColor() }}
            >
              {percentage}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant="determinate"
        value={clampedPercentage}
        sx={{
          height,
          borderRadius: height / 2,
          bgcolor: isDark ? '#334155' : '#e2e8f0',
          '& .MuiLinearProgress-bar': {
            borderRadius: height / 2,
            bgcolor: getBarColor(),
            transition: 'transform 0.4s ease',
          },
        }}
      />
    </Box>
  )
}

export default StatusProgressBar
