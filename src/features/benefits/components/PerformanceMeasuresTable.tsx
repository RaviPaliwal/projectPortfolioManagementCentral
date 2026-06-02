import {
  Box,
  Typography,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import type { PerformanceMeasureModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { StatusTag } from '@/components/common'

interface PerformanceMeasuresTableProps {
  measures: PerformanceMeasureModel[]
  onAddClick: () => void
  onDeleteClick: (id: string) => void
  isDark?: boolean
}

export const PerformanceMeasuresTable = ({
  measures,
  onAddClick,
  onDeleteClick,
  isDark,
}: PerformanceMeasuresTableProps) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TrackChangesIcon sx={{ fontSize: 16 }} /> Measures by Period
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddClick}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}
        >
          Add Measure
        </Button>
      </Box>

      {measures.length === 0 ? (
        <Paper variant="outlined" sx={{ textAlign: 'center', py: 6, borderRadius: 1.15 }}>
          <TrackChangesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No performance measures recorded.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Add measures to track progress against this benefit's target values per reporting period.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddClick} sx={{ borderRadius: 1.15 }}>
              Add first measure
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 1.15, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Measure</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Planned</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actual</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cumul. Planned</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cumul. Actual</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Variance</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Evidenced</TableCell>
                <TableCell sx={{ width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {measures.map((m) => {
                const variance = m.pm_variance ?? 0
                const isPositive = variance >= 0
                return (
                  <TableRow key={m.pm_performancemeasureid} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_measurename}</Typography>
                      {m.pm_notes && <Typography variant="caption" color="text.secondary">{m.pm_notes}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                        {m.pm_reportingperiod || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{m.pm_plannedvalue ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_actualvalue ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{m.pm_cumulativeplanned ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_cumulativeactual ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={isPositive ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`}
                        color={isPositive ? 'success' : 'error'}
                        variant="outlined"
                        sx={{ fontSize: fontSizes.xs }}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={String(m.pm_evidenced) === '1' ? 'Yes' : 'No'}
                        color={String(m.pm_evidenced) === '1' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete measure">
                        <IconButton
                          size="small"
                          onClick={() => m.pm_performancemeasureid && onDeleteClick(m.pm_performancemeasureid)}
                          color="error"
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {/* Cumulative summary */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#1a2332' : '#f8fafc' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary', mb: 1, display: 'block' }}>
              Cumulative Performance
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              {(() => {
                const totalPlanned = measures.reduce((s, m) => s + (m.pm_cumulativeplanned ?? 0), 0)
                const totalActual = measures.reduce((s, m) => s + (m.pm_cumulativeactual ?? 0), 0)
                const overallVariance = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0
                return (
                  <>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Cumulative Planned</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalPlanned.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Cumulative Actual</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalActual.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Overall Variance</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: overallVariance >= 0 ? '#22c55e' : '#ef4444' }}>
                        {overallVariance >= 0 ? '+' : ''}{overallVariance.toFixed(1)}%
                      </Typography>
                    </Box>
                  </>
                )
              })()}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  )
}
