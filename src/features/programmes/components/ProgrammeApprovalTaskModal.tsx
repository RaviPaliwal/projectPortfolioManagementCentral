import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import GroupsIcon from '@mui/icons-material/Groups'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { fetchProgrammeDetails, updateProgrammePhase } from '@/services/programme.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
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

const PHASE_LABELS: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  0: { label: 'Delivery', color: 'success' },
  1: { label: 'Planning', color: 'warning' },
  2: { label: 'Initiation', color: 'info' },
  3: { label: 'Under Approval', color: 'warning' },
}

const RAG_LABELS: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  0: { label: 'Medium', color: 'warning' },
  1: { label: 'Low', color: 'success' },
  2: { label: 'High', color: 'error' },
}

export const ProgrammeApprovalTaskModal: React.FC<ProgrammeApprovalTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [programme, setProgramme] = useState<ProgrammeModel | null>(null)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [riskCount, setRiskCount] = useState<number>(0)
  const [issueCount, setIssueCount] = useState<number>(0)

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const detail = await fetchProgrammeDetails(entityId)
      if (!detail.programme) { onError('Programme not found.'); setLoading(false); return }
      setProgramme(detail.programme)
      setProjectCount(detail.projects.length)
      setRiskCount(detail.risks.length)
      setIssueCount(detail.issues.length)
    } catch (err) {
      console.error('Failed to load programme', err)
      onError('Failed to load programme details.')
    } finally { setLoading(false) }
  }, [entityId, onError])

  useEffect(() => {
    if (open) { loadData() }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (!entityId) return false
    setSaving(true)
    try {
      // DecisionBox values: 0 = Approve, 3 = Reject
      const targetPhase = workflowDecision === 0 ? 2 : 1
      await updateProgrammePhase(entityId, targetPhase)
      const outcomeLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess('Programme Approval completed. Outcome: ' + outcomeLabel + '.')
      return true
    } catch (err) {
      console.error('[ProgrammeApprovalTaskModal] saveTaskData error:', err)
      onError('Failed to record programme decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, onSuccess, onError])

  if (!open) return null

  const currentPhase = programme?.pm_programmephase != null ? PHASE_LABELS[Number(programme.pm_programmephase)] : null
  const rag = programme?.pm_ragstatus != null ? RAG_LABELS[Number(programme.pm_ragstatus)] : null
  const variance = (programme?.pm_budgeteur ?? 0) - (programme?.pm_actualspendeur ?? 0)

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {currentPhase && <StatusTag label={currentPhase.label} color={currentPhase.color} size="small" sx={{ fontWeight: 600 }} />}
                  {rag && <StatusTag label={rag.label} color={rag.color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />}
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
              {/* Description */}
              {programme?.pm_programmedescription && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3, bgcolor: 'background.paper', maxHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {programme.pm_programmedescription}
                  </Paper>
                </>
              )}

              {/* Quick Stats */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FactCheckIcon sx={{ fontSize: 16 }} /> Overview
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <GroupsIcon sx={{ fontSize: 20, color: 'primary.main', mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{projectCount}</Typography>
                    <Typography variant="caption" color="text.secondary">Projects</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <WarningAmberIcon sx={{ fontSize: 20, color: riskCount > 0 ? 'warning.main' : 'text.disabled', mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{riskCount}</Typography>
                    <Typography variant="caption" color="text.secondary">Risks</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <WarningAmberIcon sx={{ fontSize: 20, color: issueCount > 0 ? 'error.main' : 'text.disabled', mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{issueCount}</Typography>
                    <Typography variant="caption" color="text.secondary">Issues</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Financial Summary */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AttachMoneyIcon sx={{ fontSize: 16 }} /> Financial Summary
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Budget</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {programme?.pm_budgeteur != null ? currencyFormatter.format(programme.pm_budgeteur) : '-'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {programme?.pm_actualspendeur != null ? currencyFormatter.format(programme.pm_actualspendeur) : '-'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Variance</Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, fontFamily: 'monospace', color: variance < 0 ? 'error.main' : 'success.main' }}
                    >
                      {programme?.pm_budgeteur != null ? currencyFormatter.format(variance) : '-'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* What happens next */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>After Your Decision</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  <strong>Approved:</strong> Programme phase changes to <em>Initiation</em>, enabling project creation and resource allocation.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  <strong>Rejected:</strong> Programme returns to <em>Planning</em> phase. The programme manager will be notified with the decision notes.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'programme_approval', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="contained" color="success" disabled={loading || saving} onClick={async () => { await saveTaskData(0); onClose() }} sx={{ fontWeight: 600 }}>
              {saving ? 'Processing...' : 'Approve'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  )
}
