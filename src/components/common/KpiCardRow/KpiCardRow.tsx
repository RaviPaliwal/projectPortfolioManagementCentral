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
  const gridSize: any = count <= 4 ? { xs: 12, sm: 6, md: 3 } : { xs: 12, sm: 6, md: 'grow' }

  return (
    <Grid container spacing={2} sx={{ mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
      {items.map((kpi, idx) => (
        <Grid size={gridSize} key={idx} sx={{ minWidth: 0 }}>
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
