import { Box, Card, CardContent, Typography, Skeleton } from '@mui/material'
import type { ReactNode } from 'react'
import { fontSizes } from '../../../styles'

export interface KpiCardItem {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  subtitle?: string
  /** If set, the value text will use this color */
  valueColor?: string
}

export interface KpiCardRowProps {
  items: KpiCardItem[]
  loading?: boolean
  /** Min width per card before wrapping. Default 200 */
  minWidth?: number
}

export const KpiCardRow: React.FC<KpiCardRowProps> = ({ items, loading, minWidth = 200 }) => {
  return (
    <Box sx={{ display: 'flex', gap: 2.5, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
      {items.map((kpi, idx) => (
        <Box key={idx} sx={{ flex: '1 1 0', minWidth }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5, fontSize: fontSizes.sm }}>
                      {kpi.label}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        fontSize: fontSizes['2xl'],
                        color: kpi.valueColor ?? 'inherit',
                      }}
                    >
                      {loading ? <Skeleton width={80} /> : kpi.value}
                    </Typography>
                    {kpi.subtitle && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>
                      {kpi.subtitle}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${kpi.color}15`,
                    color: kpi.color,
                    flexShrink: 0,
                  }}
                >
                  {kpi.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  )
}

export default KpiCardRow
