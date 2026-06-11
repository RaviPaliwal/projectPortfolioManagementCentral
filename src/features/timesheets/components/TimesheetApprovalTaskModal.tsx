import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Paper, Table, TableBody,
  TableCell, TableHead, TableRow,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import DateRangeIcon from '@mui/icons-material/DateRange'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import { fetchTimesheetDetails, fetchTimesheetEntries } from '@/services/timesheet.service'
import type { TimesheetModel, TimesheetEntryModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS } from '@/constants/mappings'

interface TimesheetApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  timesheetId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const TimesheetApprovalTaskModal: React.FC<TimesheetApprovalTaskModalProps> = ({
  open, onClose, timesheetId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timesheet, setTimesheet] = useState<TimesheetModel | null>(null)
  const [entries, setEntries] = useState<TimesheetEntryModel[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ts, entryList] = await Promise.all([
        fetchTimesheetDetails(timesheetId),
        fetchTimesheetEntries(timesheetId),
      ])
      if (!ts) { onError('Timesheet not found.'); setLoading(false); return }
      setTimesheet(ts)
      setEntries(entryList)
    } catch (err) {
      console.error('Failed to load timesheet', err)
      onError('Failed to load timesheet details.')
    } finally { setLoading(false) }
  }, [timesheetId, onError])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  if (!open) return null

  const statusKey = String(timesheet?.pm_timesheetstatus ?? '')
  const totalHours = entries.reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
  const chargeableHours = entries
    .filter((e) => e.pm_ischargeable)
    .reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'primary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EventNoteIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Timesheet Review</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container sx={{ height: '100%' }}>
            {/* Left Column - Timesheet Context */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Timesheet Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{timesheet?.pm_timesheetname || 'Loading...'}</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Owner</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14 }} />
                    {timesheet?.pm_ownername || timesheet?.pm_resourcename || '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Reporting Period</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DateRangeIcon sx={{ fontSize: 14 }} />
                    {timesheet?.pm_reportingperiod || '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Period Start</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {timesheet?.pm_periodstartdate ? dateFormatter.format(new Date(timesheet.pm_periodstartdate)) : '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Period End</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {timesheet?.pm_periodenddate ? dateFormatter.format(new Date(timesheet.pm_periodenddate)) : '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={TIMESHEET_STATUS_LABELS[statusKey] ?? 'Unknown'}
                      color={TIMESHEET_STATUS_COLORS[statusKey] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChecklistRtlIcon sx={{ fontSize: 16 }} /> Review Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Review the submitted timesheet entries to verify hours, chargeability, and project assignments before approving or rejecting.
                </Typography>
              </Box>
            </Grid>

            {/* Right Column - Entries Details */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} /> Hours Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Total Hours</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {totalHours.toFixed(1)}h
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Chargeable</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {chargeableHours.toFixed(1)}h
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Non-Chargeable</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {(totalHours - chargeableHours).toFixed(1)}h
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Approved</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {timesheet?.pm_approvaldate ? 'Yes' : 'No'}
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventNoteIcon sx={{ fontSize: 16 }} /> Time Entries ({entries.length})
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small" sx={{ minWidth: 400 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: 'background.default' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: 'background.default' }}>Hours</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: 'background.default' }}>Chargeable</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: 'background.default' }}>Project</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: 'background.default' }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No entries found for this timesheet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry, idx) => (
                        <TableRow key={entry.pm_timesheetentryid || idx} hover>
                          <TableCell>
                            {entry.pm_workdate ? dateFormatter.format(new Date(entry.pm_workdate)) : '\u2014'}
                          </TableCell>
                          <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                            {entry.pm_hoursworked != null ? entry.pm_hoursworked + 'h' : '\u2014'}
                          </TableCell>
                          <TableCell>
                            <StatusTag
                              label={entry.pm_ischargeable ? 'Yes' : 'No'}
                              color={entry.pm_ischargeable ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{entry.pm_projectname || '\u2014'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" sx={{
                              maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap',
                            }}>
                              {entry.pm_worknotes || '\u2014'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Paper>
              {entries.length > 0 && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Hours: {totalHours.toFixed(1)}h</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: timesheet?.pm_totalhours != null && Math.abs(totalHours - timesheet.pm_totalhours) > 0.01 ? 'warning.main' : 'inherit' }}>
                    {timesheet?.pm_totalhours != null ? '(Recorded: ' + timesheet.pm_totalhours + 'h)' : ''}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId && (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={async (decision) => {
              setSaving(true)
              try {
                const decisionLabel = decision === 0 ? 'Approved' : 'Rejected'
                onSuccess('Timesheet review completed. Decision: ' + decisionLabel + '.')
                return true
              } catch (err) {
                onError('Failed to save review decision.')
                return false
              } finally { setSaving(false) }
            }}
            onDecisionComplete={() => onClose()}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  )
}
