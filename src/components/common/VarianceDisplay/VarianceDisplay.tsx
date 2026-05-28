import { Typography, useTheme } from '@mui/material'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export interface VarianceDisplayProps {
  budget?: number
  consumed?: number
  showLabel?: boolean
}

export const VarianceDisplay: React.FC<VarianceDisplayProps> = ({ budget, consumed, showLabel = true }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const variance = (budget ?? 0) - (consumed ?? 0)
  const isNegative = variance < 0

  return (
    <>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
          color: isNegative ? '#ef4444' : isDark ? '#e2e8f0' : '#0f172a',
        }}
      >
        {isNegative ? '−' : ''}{currencyFormatter.format(Math.abs(variance))}
      </Typography>
      {showLabel && isNegative && (
        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 500, display: 'block' }}>
          Over budget
        </Typography>
      )}
    </>
  )
}

export default VarianceDisplay
