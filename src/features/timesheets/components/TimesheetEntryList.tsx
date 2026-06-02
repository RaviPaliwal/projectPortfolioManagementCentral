import { Box, Typography, Button, Paper, IconButton, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DeleteIcon from '@mui/icons-material/Delete'
import type { TimesheetEntryModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { formatDateShort } from '@/utils/formatters'
import { StatusTag } from '@/components/common'

interface TimesheetEntryListProps {
  entries: TimesheetEntryModel[]
  loading: boolean
  isDraft: boolean
  onAddEntry: () => void
  onDeleteEntry: (entryId: string) => void
  actionLoading?: boolean
}

export function TimesheetEntryList({
  entries,
  loading,
  isDraft,
  onAddEntry,
  onDeleteEntry,
  actionLoading,
}: TimesheetEntryListProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const totalHours = entries.reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
  const chargeableHours = entries.filter((e) => e.pm_ischargeable).reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
  const nonChargeableHours = entries.filter((e) => !e.pm_ischargeable).reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)

  if (loading) {
    return <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Loading entries...</Typography>
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTimeIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
          Time Entries
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 400 }}>
            ({totalHours.toFixed(1)}h total)
          </Typography>
        </Typography>
        {isDraft && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddEntry}
            disabled={actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}
          >
            Add Entry
          </Button>
        )}
      </Box>

      {entries.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {entries.map((entry) => (
            <Paper key={entry.pm_timesheetentryid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {entry.pm_workdate ? new Date(entry.pm_workdate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                    </Typography>
                    <StatusTag
                      label={entry.pm_ischargeable ? 'Chargeable' : 'Non-Chargeable'}
                      size="small"
                      color={entry.pm_ischargeable ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600, height: 20, fontSize: fontSizes.xs }}
                    />
                    {entry.pm_isovertime && (
                      <StatusTag label="OT" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: fontSizes.xs }} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    {entry.pm_projectname || 'No project'}
                    {entry.pm_projecttaskname ? ` / ${entry.pm_projecttaskname}` : ''}
                  </Typography>
                  {entry.pm_worknotes && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      {entry.pm_worknotes}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', lineHeight: 1 }}>
                      {entry.pm_hoursworked ?? 0}h
                    </Typography>
                  </Box>
                  {isDraft && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => entry.pm_timesheetentryid && onDeleteEntry(entry.pm_timesheetentryid)}
                      disabled={actionLoading}
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AccessTimeIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No entries logged yet.
          </Typography>
          {isDraft && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddEntry}
              sx={{ borderRadius: 1.15 }}
            >
              Log your first entry
            </Button>
          )}
        </Box>
      )}

      {/* Summary */}
      {entries.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 1.15, bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
            Period Summary
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#22c55e' }}>
                {totalHours.toFixed(1)}h
              </Typography>
              <Typography variant="caption" color="text.secondary">Total</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#0ea5e9' }}>
                {chargeableHours.toFixed(1)}h
              </Typography>
              <Typography variant="caption" color="text.secondary">Chargeable</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#f59e0b' }}>
                {nonChargeableHours.toFixed(1)}h
              </Typography>
              <Typography variant="caption" color="text.secondary">Non-Chargeable</Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  )
}
