import { useMemo } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import type { PerformanceMeasureModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { DataverseTable, StatusTag, Button, type Column } from '@/components/common'

interface PerformanceMeasuresTableProps {
  measures: PerformanceMeasureModel[]
  loading?: boolean
  onAddClick: () => void
  onDeleteClick: (id: string) => void
  isDark?: boolean
  canCreate?: boolean
  canDelete?: boolean
}

export const PerformanceMeasuresTable = ({
  measures,
  loading,
  onAddClick,
  onDeleteClick,
  isDark,
  canCreate = true,
  canDelete = true,
}: PerformanceMeasuresTableProps) => {

  const columns: Column<PerformanceMeasureModel>[] = [
    {
      key: 'pm_measurename',
      label: 'Measure',
      format: (val, item) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{val}</Typography>
          {item.pm_notes && <Typography variant="caption" color="text.secondary">{item.pm_notes}</Typography>}
        </Box>
      )
    },
    {
      key: 'pm_reportingperiod',
      label: 'Period',
      format: (val) => (
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
          {val || '—'}
        </Typography>
      )
    },
    { key: 'pm_plannedvalue', label: 'Planned', align: 'right' },
    { key: 'pm_actualvalue', label: 'Actual', align: 'right', format: (val) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{val ?? '—'}</Typography> },
    { key: 'pm_cumulativeplanned', label: 'Cumul. Planned', align: 'right' },
    { key: 'pm_cumulativeactual', label: 'Cumul. Actual', align: 'right', format: (val) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{val ?? '—'}</Typography> },
    {
      key: 'pm_variance',
      label: 'Variance',
      format: (val) => {
        const variance = Number(val) || 0
        const isPositive = variance >= 0
        return (
          <StatusTag
            label={isPositive ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`}
            color={isPositive ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontSize: fontSizes.xs }}
          />
        )
      }
    },
    {
      key: 'pm_evidenced',
      label: 'Evidenced',
      format: (val) => (
        <StatusTag
          label={String(val) === '1' ? 'Yes' : 'No'}
          color={String(val) === '1' ? 'success' : 'default'}
          variant="outlined"
        />
      )
    }
  ]

  const cumulativeFooter = useMemo(() => {
    if (measures.length === 0) return null
    const totalPlanned = measures.reduce((s, m) => s + (m.pm_cumulativeplanned ?? 0), 0)
    const totalActual = measures.reduce((s, m) => s + (m.pm_cumulativeactual ?? 0), 0)
    const overallVariance = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0

    return (
      <Box sx={{ p: 2, display: 'flex', gap: 4, bgcolor: isDark ? '#1a2332' : 'background.default' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Cumul. Planned</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalPlanned.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Cumul. Actual</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalActual.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Overall Variance</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: overallVariance >= 0 ? 'success.main' : 'error.main' }}>
            {overallVariance >= 0 ? '+' : ''}{overallVariance.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    )
  }, [measures, isDark])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TrackChangesIcon sx={{ fontSize: 16 }} /> Measures by Period
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddClick}
            sx={{ borderRadius: 1.5 }}
          >
            Add Measure
          </Button>
        )}
      </Box>

      <DataverseTable
        data={measures}
        columns={columns}
        loading={loading}
        emptyIcon={<TrackChangesIcon />}
        emptyTitle="No performance measures recorded."
        actions={(item) => (
          canDelete ? (
            <Tooltip title="Delete measure">
              <IconButton
                size="small"
                onClick={() => item.pm_performancemeasureid && onDeleteClick(item.pm_performancemeasureid)}
                color="error"
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null
        )}
        extraHeaderActions={cumulativeFooter}
      />
    </Box>
  )
}
