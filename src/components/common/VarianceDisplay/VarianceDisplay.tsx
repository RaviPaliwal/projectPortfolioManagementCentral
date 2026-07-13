import { Typography, useTheme, type TypographyVariant } from '@mui/material'
import { currencyFormatter } from '@/utils/formatters'

export interface VarianceDisplayProps {
  budget?: number
  consumed?: number
  showLabel?: boolean
  variant?: TypographyVariant
}

export const VarianceDisplay: React.FC<VarianceDisplayProps> = ({ 
  budget = 0, 
  consumed = 0, 
  showLabel = true,
  variant = 'body2'
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const variance = (budget ?? 0) - (consumed ?? 0)
  const isNegative = variance < 0

  // Color conditions:
  // - Over budget (negative variance): Red
  // - Warning threshold (remaining variance <= 10% of budget): Amber/Yellow
  // - On Track / Healthy (remaining variance > 10% of budget): Green
  let color = isDark ? '#e2e8f0' : '#0f172a'
  if (isNegative) {
    color = '#ef4444' // Red
  } else if (budget > 0) {
    const ratio = variance / budget
    if (ratio <= 0.1) {
      color = '#f59e0b' // Amber/Yellow
    } else {
      color = '#22c55e' // Green
    }
  } else {
    color = '#22c55e'
  }

  return (
    <>
      <Typography
        variant={variant}
        sx={{
          fontWeight: 700,
          color: color,
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
