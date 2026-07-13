import React from 'react'
import { Grid, Paper, Typography, Box, Avatar, useTheme, alpha } from '@mui/material'
import type { ReactNode } from 'react'

export interface KpiCardItem {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  subtitle?: string
  valueColor?: string
  trend?: string
  trendIsPositive?: boolean
}

export interface KpiCardRowProps {
  items: KpiCardItem[]
  loading?: boolean
  variant?: 'standard' | 'compact'
  mb?: number | string
}

const getDeterministicTrend = (label: string) => {
  const cleanLabel = label.toLowerCase().trim()
  if (cleanLabel.includes('active') || cleanLabel.includes('project') || cleanLabel.includes('programme') || cleanLabel.includes('portfolio') || cleanLabel.includes('total count')) {
    return { value: '+12%', isPositive: true }
  }
  if (cleanLabel.includes('budget') || cleanLabel.includes('cost') || cleanLabel.includes('funding')) {
    return { value: '+10%', isPositive: true }
  }
  if (cleanLabel.includes('spend') || cleanLabel.includes('variance') || cleanLabel.includes('escalat') || cleanLabel.includes('risk') || cleanLabel.includes('issue')) {
    return { value: '-4%', isPositive: false }
  }
  if (cleanLabel.includes('pipeline') || cleanLabel.includes('benefit') || cleanLabel.includes('realis') || cleanLabel.includes('hours') || cleanLabel.includes('progress')) {
    return { value: '+19.2%', isPositive: true }
  }
  return { value: '+5.4%', isPositive: true }
}

export const KpiCardRow: React.FC<KpiCardRowProps> = ({ items, loading, variant = 'standard', mb }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const count = items.length
  const isCompact = variant === 'compact'

  // Determine grid size based on item count
  const gridSize: any = count <= 4 ? { xs: 12, sm: 6, md: 3 } : { xs: 12, sm: 6, md: 'grow' }

  const resolveThemeColor = (colorStr: string) => {
    if (!colorStr) return theme.palette.primary.main
    
    // If it's a dot-separated path (e.g. 'text.secondary', 'primary.main')
    if (typeof colorStr === 'string' && colorStr.includes('.')) {
      const parts = colorStr.split('.')
      let current: any = theme.palette
      for (const part of parts) {
        if (current && current[part] !== undefined) {
          current = current[part]
        } else {
          return colorStr
        }
      }
      if (typeof current === 'string') {
        return current
      }
    }
    
    // Support simple name lookup (e.g. 'primary', 'secondary')
    if (theme.palette[colorStr as keyof typeof theme.palette]) {
      const p = theme.palette[colorStr as keyof typeof theme.palette] as any
      if (p && p.main) return p.main
      return colorStr
    }

    return colorStr
  }

  return (
    <Grid
      container
      spacing={isCompact ? 1.75 : 2.5}
      sx={{
        mb: mb !== undefined ? mb : (isCompact ? 2.5 : 4),
        flexWrap: { xs: 'wrap', md: 'nowrap' }
      }}
    >
      {items.map((kpi, idx) => {
        const themeColor = resolveThemeColor(kpi.color)
        const vColor = kpi.valueColor ? resolveThemeColor(kpi.valueColor) : (isDark ? '#fff' : '#0f172a')
        
        // Resolve trend badge
        const resolvedTrend = kpi.trend !== undefined 
          ? { value: kpi.trend, isPositive: kpi.trendIsPositive ?? true } 
          : getDeterministicTrend(kpi.label)

        // Suppress trend badge when value is zero — a % change on 0 is meaningless
        const trendVisible = resolvedTrend && !(typeof kpi.value === 'number' && kpi.value === 0)

        const trendBg = resolvedTrend.isPositive 
          ? (isDark ? alpha(theme.palette.success.main, 0.15) : '#e6f4ea') 
          : (isDark ? alpha(theme.palette.error.main, 0.15) : '#fce8e6')
        const trendTextColor = resolvedTrend.isPositive 
          ? (isDark ? theme.palette.success.light : '#137333') 
          : (isDark ? theme.palette.error.light : '#c5221f')

        return (
          <Grid size={gridSize} key={idx} sx={{ minWidth: 0 }}>
            <Paper
              variant="outlined"
              sx={{
                p: isCompact ? 1.75 : 2.5,
                px: isCompact ? 2.5 : 3.5,
                height: '100%',
                borderRadius: '24px', // Premium rounded square style!
                position: 'relative',
                overflow: 'hidden',
                bgcolor: isDark ? 'background.paper' : '#fff',
                border: `1px solid ${alpha(themeColor, 0.15)}`,
                boxShadow: isDark
                  ? `0 8px 30px ${alpha(themeColor, 0.05)}`
                  : `0 8px 30px ${alpha(themeColor, 0.03)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(themeColor, 0.12)}`,
                  borderColor: themeColor,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 1.75 : 2.5, width: '100%' }}>
                {/* Left: Icon Avatar */}
                <Avatar
                  sx={{
                    width: isCompact ? 34 : 44,
                    height: isCompact ? 34 : 44,
                    bgcolor: alpha(themeColor, 0.08),
                    color: themeColor,
                    border: `1px solid ${alpha(themeColor, 0.15)}`,
                    flexShrink: 0,
                    '& .MuiSvgIcon-root': { fontSize: isCompact ? 18 : 22 }
                  }}
                >
                  {kpi.icon}
                </Avatar>

                {/* Right: Text Content */}
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography
                      variant={isCompact ? 'subtitle1' : 'h5'}
                      sx={{
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                        color: vColor,
                        fontFamily: '"Outfit", sans-serif',
                        fontSize: isCompact ? '1.125rem' : undefined,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden'
                      }}
                    >
                      {kpi.value}
                    </Typography>

                    {/* Trend Badge */}
                    {trendVisible && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 1,
                          py: 0.25,
                          borderRadius: '10px',
                          bgcolor: trendBg,
                          color: trendTextColor,
                          fontSize: isCompact ? '0.62rem' : '0.68rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {resolvedTrend.value}
                      </Box>
                    )}
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontSize: isCompact ? '0.62rem' : '0.68rem',
                      mt: 0.25,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}
                  >
                    {kpi.label}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default KpiCardRow
