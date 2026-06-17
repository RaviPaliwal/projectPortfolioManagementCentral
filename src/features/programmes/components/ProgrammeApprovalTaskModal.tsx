import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { fetchProgrammeDetails, updateProgrammePhase } from '@/services/programme.service'
import type { ProgrammeModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface ProgrammeApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  entityId?: string | null
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const OUTCOME_OPTIONS = [
  { value: 2, label: 'Approved', description: 'Programme is approved and set to Initiation phase' },
  { value: 1, label: 'Rejected', description: 'Programme does not meet criteria for approval' },
]

const PHASE_LABELS: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  0: { label: 'Delivery', color: 'success' },
  1: { label: 'Planning', color: 'warning' },
  2: { label: 'Initiation', color: 'info' },
  3: { label: 'Under Approval', color: 'warning' },
}

export const ProgrammeApprovalTaskModal: React.FC<ProgrammeApprovalTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [programme, setProgramme] = useState<ProgrammeModel | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<number>(2)
  const [conditions, setConditions] = useState('')

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const detail = await fetchProgrammeDetails(entityId)
      if (!detail.programme) { onError('Programme not found.'); setLoading(false); return }
      setProgramme(detail.programme)
    } catch (err) {
      console.error('Failed to load programme', err)
      onError('Failed to load programme details.')
    } finally { setLoading(false) }
  }, [entityId, onError])

  useEffect(() => {
    if (open) { loadData(); setSelectedOutcome(2); setConditions('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (!entityId) return false
    setSaving(true)
    try {
      const targetPhase = selectedOutcome === 2 ? 2 : 1
      console.log('[ProgrammeApprovalTaskModal] saveTaskData called', { workflowDecision, selectedOutcome, targetPhase, entityId })
      await updateProgrammePhase(entityId, targetPhase)
      console.log('[ProgrammeApprovalTaskModal] updateProgrammePhase succeeded')
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess('Programme Approval completed. Outcome: ' + outcomeLabel + '.')
      return true
    } catch (err) {
      console.error('[ProgrammeApprovalTaskModal] saveTaskData error:', err)
      onError('Failed to record programme decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, selectedOutcome, onSuccess, onError])

  const handleLegacyDecision = useCallback(async () => {
    if (!entityId) return
    setSaving(true)
    try {
      const targetPhase = selectedOutcome === 2 ? 2 : 1
      await updateProgrammePhase(entityId, targetPhase)
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess('Programme Approval completed. Outcome: ' + outcomeLabel + '.')
      onClose()
    } catch (err) {
      onError('Failed to record programme decision.')
    } finally { setSaving(false) }
  }, [entityId, selectedOutcome, onSuccess, onClose, onError])

  if (!open) return null

  const currentPhase = programme?.pm_programmephase != null ? PHASE_LABELS[Number(programme.pm_programmephase)] : null

  const formatDate = (d?: string | null): string => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.dark', color: 'primary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountTreeIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Programme Approval</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Approval" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
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
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Programme Summary</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{programme?.pm_programmename || 'Loading...'}</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Current Phase</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {currentPhase ? (
                      <StatusTag label={currentPhase.label} color={currentPhase.color} size="small" sx={{ fontWeight: 600 }} />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Unknown</Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14 }} /> Manager
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{programme?.pm_programmemanagername || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Sponsor</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{programme?.pm_sponsorname || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 14 }} /> Portfolio
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{programme?.pm_portfolioname || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Business Unit</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{programme?.pm_businessunit || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AttachMoneyIcon sx={{ fontSize: 14 }} /> Budget
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {programme?.pm_budgeteur != null ? currencyFormatter.format(programme.pm_budgeteur) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 14 }} /> Period
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(programme?.pm_startdate)}
                    {programme?.pm_enddate ? ' - ' + formatDate(programme.pm_enddate) : ''}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FactCheckIcon sx={{ fontSize: 16 }} /> Authority Required
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  As the approving authority, your decision will set the programme phase. Approved programmes move to Initiation; rejected programmes return to Planning.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {programme?.pm_programmedescription && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3, bgcolor: 'background.paper', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {programme.pm_programmedescription}
                  </Paper>
                </>
              )}

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Record Decision</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select the outcome for this programme. The programme phase will be updated immediately upon submission.
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Outcome</InputLabel>
                    <Select
                      value={selectedOutcome}
                      label="Outcome"
                      onChange={(e) => setSelectedOutcome(Number(e.target.value))}
                      sx={{ borderRadius: 1.5 }}
                    >
                      {OUTCOME_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{opt.label}</Typography>
                            <Typography variant="caption" color="text.secondary">{opt.description}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {selectedOutcome === 1 && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Rejection Reason"
                      multiline rows={3}
                      fullWidth
                      size="small"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      slotProps={{
                        input: {
                          sx: { borderRadius: 1.5 },
                        },
                      }}
                      placeholder="Why is this programme being rejected?"
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'error.main' } } }}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={() => onClose()}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="contained" color="success" disabled={loading || saving} onClick={handleLegacyDecision} sx={{ fontWeight: 600 }}>
              {saving ? 'Processing...' : 'Submit Decision'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  )
}
