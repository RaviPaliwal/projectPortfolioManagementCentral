import React, { useState, useEffect, useRef, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  IconButton, CircularProgress, Divider, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import DateRangeIcon from '@mui/icons-material/DateRange'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { fetchTimesheetDetails, fetchTimesheetEntries, updateTimesheetStatus } from '@/services/timesheet.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { TimesheetModel, TimesheetEntryModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { LedgerCalendar } from '@/components/common'
import type { CalendarEntry } from '@/components/common/LedgerCalendar/LedgerCalendar'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles'

interface TimesheetApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  timesheetId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const ACTIVITY_COLORS: Record<string, string> = {
  chargeable: 'success.main',
  admin: 'grey.500',
  leave: 'warning.main',
  sick: 'error.main',
}

function getActivity(entry: TimesheetEntryModel): string {
  if (entry.pm_ischargeable) return 'chargeable'
  const reason = String(entry.pm_nonchargeablereason ?? '')
  if (reason === '100000001') return 'leave'
  if (reason === '100000002') return 'sick'
  return 'admin'
}

export const TimesheetApprovalTaskModal: React.FC<TimesheetApprovalTaskModalProps> = ({
  open, onClose, timesheetId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timesheet, setTimesheet] = useState<TimesheetModel | null>(null)
  const [entries, setEntries] = useState<TimesheetEntryModel[]>([])
  const mountedRef = useRef(true)
  const { currentUser } = useUser()

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!open || !timesheetId) return
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      fetchTimesheetDetails(timesheetId),
      fetchTimesheetEntries(timesheetId),
    ]).then(([ts, entryList]) => {
      if (!mountedRef.current) return
      if (!ts) { onError('Timesheet not found.'); setLoading(false); return }
      setTimesheet(ts)
      setEntries(entryList)
      setLoading(false)
    }).catch((err) => {
      console.error('[TimesheetApprovalTaskModal] Fetch failed:', err)
      if (!mountedRef.current) return
      onError('Failed to load timesheet details: ' + (err?.message || 'unknown error'))
      setLoading(false)
    })
  }, [open, timesheetId, onError])

  if (!open) return null

  const statusKey = String(timesheet?.pm_timesheetstatus ?? '')
  const totalHours = entries.reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
  const chargeableHours = entries
    .filter((e) => e.pm_ischargeable)
    .reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0)
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'primary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EventNoteIcon />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Timesheet Review</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {timesheet?.pm_resourcename || timesheet?.pm_ownername || ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'common.white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : !timesheet ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No data</Typography></Box>
        ) : (
          <Box>
            {/* Resource & Period Info Bar */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', p: 3, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resource</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{timesheet.pm_resourcename || timesheet.pm_ownername || '\u2014'}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <DateRangeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Period</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {timesheet.pm_periodstartdate ? dateFormatter.format(new Date(timesheet.pm_periodstartdate)) : '\u2014'}
                    {' \u2013 '}
                    {timesheet.pm_periodenddate ? dateFormatter.format(new Date(timesheet.pm_periodenddate)) : '\u2014'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Timesheet</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{timesheet.pm_timesheetname || '\u2014'}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, pb: 0 }}>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                <AccessTimeIcon sx={{ fontSize: 20, color: 'primary.main', mb: 0.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{totalHours.toFixed(1)}</Typography>
                <Typography variant="caption" color="text.secondary">Total Hours</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main', mb: 0.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'success.main' }}>{chargeableHours.toFixed(1)}</Typography>
                <Typography variant="caption" color="text.secondary">Chargeable</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                <CancelIcon sx={{ fontSize: 20, color: 'text.disabled', mb: 0.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>{(totalHours - chargeableHours).toFixed(1)}</Typography>
                <Typography variant="caption" color="text.secondary">Non-Chargeable</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                <EventNoteIcon sx={{ fontSize: 20, color: 'info.main', mb: 0.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{entries.length}</Typography>
                <Typography variant="caption" color="text.secondary">Entries</Typography>
              </Paper>
            </Box>

            {/* Ledger Calendar */}
            {entries.length > 0 && timesheet.pm_periodstartdate && timesheet.pm_periodenddate && (
              <Box sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EventNoteIcon sx={{ fontSize: 16 }} /> Time Entries
                </Typography>
                {(() => {
                  const start = new Date(timesheet.pm_periodstartdate!)
                  const end = new Date(timesheet.pm_periodenddate!)
                  const calEntries: CalendarEntry[] = entries.map((e) => {
                    const activity = getActivity(e)
                    return {
                      date: e.pm_workdate?.split('T')[0] || '',
                      hours: e.pm_hoursworked ?? 0,
                      type: activity,
                      projectName: e.pm_projectname,
                      comment: e.pm_worknotes,
                    }
                  })
                  return (
                    <LedgerCalendar
                      year={start.getFullYear()}
                      month={start.getMonth()}
                      entries={calEntries}
                      hideLegend
                      colorMap={ACTIVITY_COLORS}
                    />
                  )
                })()}
                {/* Total Bar */}
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.default', display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Total: {totalHours.toFixed(1)}h</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: timesheet?.pm_totalhours != null && Math.abs(totalHours - timesheet.pm_totalhours) > 0.01 ? 'warning.main' : 'inherit' }}>
                    {timesheet?.pm_totalhours != null ? '(Recorded: ' + timesheet.pm_totalhours + 'h)' : ''}
                  </Typography>
                </Box>
              </Box>
            )}
            {entries.length === 0 && (
              <Box sx={{ p: 2.5 }}>
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No entries found for this timesheet.</Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2.5, bgcolor: 'background.paper', flexDirection: 'column', alignItems: 'stretch' }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
              onBeforeDecision={async (decision) => {
              setSaving(true)
              try {
                const newStatus = decision === 0 ? 0 : 2
                const approverName = currentUser?.fullname ?? 'System'
                await updateTimesheetStatus(timesheetId, newStatus, undefined, approverName)
                const decisionLabel = decision === 0 ? 'Approved' : 'Rejected'
                onSuccess('Timesheet review completed. Decision: ' + decisionLabel + '.')
                return true
              } catch (err) {
                onError('Failed to save review decision: ' + ((err as Error)?.message || 'unknown error'))
                return false
              } finally { setSaving(false) }
            }}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'timesheet_approval', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            No decision options available for this step.
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  )
}
