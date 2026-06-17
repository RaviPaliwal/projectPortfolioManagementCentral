import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import { fetchPortfolioHierarchy, updatePortfolioStatus } from '@/services/portfolio.service'
import type { PortfolioModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface PortfolioApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  entityId?: string | null
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const OUTCOME_OPTIONS = [
  { value: 0, label: 'Approved', description: 'Portfolio is approved and set to Active status' },
  { value: 2, label: 'Rejected', description: 'Portfolio does not meet criteria for approval' },
]

const PORTFOLIO_STATUS_MAP: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  0: { label: 'Active', color: 'success' },
  1: { label: 'Under Approval', color: 'warning' },
  2: { label: 'Rejected', color: 'error' },
}

export const PortfolioApprovalTaskModal: React.FC<PortfolioApprovalTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [portfolio, setPortfolio] = useState<PortfolioModel | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0)
  const [conditions, setConditions] = useState('')

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const hierarchy = await fetchPortfolioHierarchy()
      const found = hierarchy.portfolios.find(p => p.pm_portfolioid === entityId)
      if (!found) { onError('Portfolio not found.'); setLoading(false); return }
      setPortfolio(found)
    } catch (err) {
      console.error('Failed to load portfolio', err)
      onError('Failed to load portfolio details.')
    } finally { setLoading(false) }
  }, [entityId, onError])

  useEffect(() => {
    if (open) { loadData(); setSelectedOutcome(0); setConditions('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (!entityId) return false
    setSaving(true)
    try {
      console.log('[PortfolioApprovalTaskModal] saveTaskData called', { workflowDecision, selectedOutcome, entityId })
      await updatePortfolioStatus(entityId, selectedOutcome)
      console.log('[PortfolioApprovalTaskModal] updatePortfolioStatus succeeded')
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess(`Portfolio Approval completed. Outcome: ${outcomeLabel}.`)
      return true
    } catch (err) {
      console.error('[PortfolioApprovalTaskModal] saveTaskData error:', err)
      onError('Failed to record portfolio decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, selectedOutcome, onSuccess, onError])

  const handleLegacyDecision = useCallback(async () => {
    if (!entityId) return
    setSaving(true)
    try {
      await updatePortfolioStatus(entityId, selectedOutcome)
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess(`Portfolio Approval completed. Outcome: ${outcomeLabel}.`)
      onClose()
    } catch (err) {
      onError('Failed to record portfolio decision.')
    } finally { setSaving(false) }
  }, [entityId, selectedOutcome, onSuccess, onClose, onError])

  if (!open) return null

  const currentStatus = portfolio?.pm_portfoliostatus != null ? PORTFOLIO_STATUS_MAP[Number(portfolio.pm_portfoliostatus)] : null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.dark', color: 'primary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Portfolio Approval</Typography>
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
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Portfolio Summary</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{portfolio?.pm_portfolioname || 'Loading...'}</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Current Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {currentStatus ? (
                      <StatusTag label={currentStatus.label} color={currentStatus.color} size="small" sx={{ fontWeight: 600 }} />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Unknown</Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14 }} /> Owner
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{portfolio?.pm_ownerlookupname || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 14 }} /> Business Unit
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{portfolio?.pm_businessunit || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {portfolio?.pm_prioritylevel != null
                      ? portfolio.pm_prioritylevel === 1 ? 'High'
                        : portfolio.pm_prioritylevel === 2 ? 'Medium'
                        : portfolio.pm_prioritylevel === 3 ? 'Low'
                        : 'Very Low'
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {portfolio?.pm_approvedbudgeteur != null ? currencyFormatter.format(portfolio.pm_approvedbudgeteur) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 14 }} /> Period
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {portfolio?.pm_startdate
                      ? `${new Date(portfolio.pm_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : '-'}
                    {portfolio?.pm_enddate
                      ? ` – ${new Date(portfolio.pm_enddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ''}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FactCheckIcon sx={{ fontSize: 16 }} /> Authority Required
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  As the approving authority, your decision will set the portfolio status. Approved portfolios become Active; rejected portfolios are marked as Rejected.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {portfolio?.pm_portfoliodescription && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3, bgcolor: 'background.paper', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {portfolio.pm_portfoliodescription}
                  </Paper>
                </>
              )}

              {portfolio?.pm_strategicobjective && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FactCheckIcon sx={{ fontSize: 16 }} /> Strategic Objective
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3, bgcolor: 'background.paper', maxHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {portfolio.pm_strategicobjective}
                  </Paper>
                </>
              )}

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Record Decision</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select the outcome for this portfolio. The portfolio status will be updated immediately upon submission.
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
                {selectedOutcome === 2 && (
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
                      placeholder="Why is this portfolio being rejected?"
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
