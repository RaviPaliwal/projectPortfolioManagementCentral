import { Grid } from '@mui/material'
import type { ReactNode } from 'react'
import MetricTile from '../MetricTile/MetricTile'

export interface KpiCardItem {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  subtitle?: string
  valueColor?: string
}

export interface KpiCardRowProps {
  items: KpiCardItem[]
  loading?: boolean
}

export const KpiCardRow: React.FC<KpiCardRowProps> = ({ items, loading }) => {
  // Determine grid size based on item count
  const count = items.length
  const gridSize = count <= 4 ? { xs: 12, sm: 6, lg: 3 } : { xs: 12, sm: 6, md: 4, lg: 2 }

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      {items.map((kpi, idx) => (
        <Grid size={gridSize} key={idx}>
          <MetricTile
            label={kpi.label}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            color={kpi.color}
            valueColor={kpi.valueColor}
            loading={loading}
          />
        </Grid>
      ))}
    </Grid>
  )
}

export default KpiCardRow
