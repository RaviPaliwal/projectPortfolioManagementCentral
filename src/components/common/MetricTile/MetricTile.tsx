import { Box, Paper, Typography, useTheme, Skeleton } from '@mui/material'
import type { ReactNode } from 'react'
import { fontSizes } from '../../../styles'

export interface MetricTileProps {
  label: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: string
  valueColor?: string
  loading?: boolean
}

export const MetricTile = ({ label, value, subtitle, icon, color, valueColor, loading }: MetricTileProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (loading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: '100%',
          borderRadius: 1.15,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: isDark ? 'background.paper' : '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="80%" height={20} />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: "5px",
            height: "100%",
            bgcolor: color || 'primary.main',
            opacity: 0.2,
          }}
        />
      </Paper>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 1.15,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: isDark ? 'background.paper' : '#fff',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: color || 'primary.main',
          boxShadow: isDark 
            ? '0 4px 12px rgba(0,0,0,0.4)' 
            : '0 4px 12px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: fontSizes.xs,
          }}
        >
          {label}
        </Typography>
        {icon && (
          <Box sx={{ color: color || 'primary.main', display: 'flex', opacity: 0.8 }}>
            {icon}
          </Box>
        )}
      </Box>

      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 800, 
          mb: 0.5, 
          letterSpacing: '-0.02em',
          color: valueColor || 'inherit'
        }}
      >
        {value}
      </Typography>

      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
          {subtitle}
        </Typography>
      )}

      {/* filled color accent at bottom */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: "5px",
          height: "100%",
          bgcolor: color || 'primary.main',
          opacity: 0.6,
        }}
      />
    </Paper>
  )
}

export default MetricTile
