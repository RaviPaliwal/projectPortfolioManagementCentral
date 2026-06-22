import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { fetchPortfolioHierarchy, updatePortfolioStatus } from '@/services/portfolio.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
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
  const [programmeCount, setProgrammeCount] = useState<number>(0)

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const hierarchy = await fetchPortfolioHierarchy()
      const found = hierarchy.portfolios.find(p => p.pm_portfolioid === entityId)
      if (!found) { onError('Portfolio not found.'); setLoading(false); return }
      setPortfolio(found)
      // Count programmes linked to this portfolio
      const linkedProgrammes = hierarchy.programmes.filter(p => p._pm_portfolio_value === entityId)
      setProgrammeCount(linkedProgrammes.length)
    } catch (err) {
      console.error('Failed to load portfolio', err)
      onError('Failed to load portfolio details.')
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
      const targetStatus = workflowDecision === 0 ? 0 : 2
      await updatePortfolioStatus(entityId, targetStatus)
      const outcomeLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess('Portfolio Approval completed. Outcome: ' + outcomeLabel + '.')
      return true
    } catch (err) {
      console.error('[PortfolioApprovalTaskModal] saveTaskData error:', err)
      onError('Failed to record portfolio decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, onSuccess, onError])

  if (!open) return null

  const currentStatus = portfolio?.pm_portfoliostatus != null ? PORTFOLIO_STATUS_MAP[Number(portfolio.pm_portfoliostatus)] : null
  const actualSpendPct = portfolio?.pm_approvedbudgeteur && portfolio.pm_approvedbudgeteur > 0
    ? Math.min(100, ((portfolio.pm_actualspendeur ?? 0) / portfolio.pm_approvedbudgeteur) * 100)
    : 0

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
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AttachMoneyIcon sx={{ fontSize: 14 }} /> Approved Budget
                  </Typography>
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
                      ? new Date(portfolio.pm_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                    {portfolio?.pm_enddate
                      ? ' - ' + new Date(portfolio.pm_enddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
              {/* Description */}
              {portfolio?.pm_portfoliodescription && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3, bgcolor: 'background.paper', maxHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {portfolio.pm_portfoliodescription}
                  </Paper>
                </>
              )}

              {/* Strategic Objective */}
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

              {/* Quick Stats */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> Portfolio at a Glance
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <AccountTreeIcon sx={{ fontSize: 20, color: 'primary.main', mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{programmeCount}</Typography>
                    <Typography variant="caption" color="text.secondary">Programmes</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <AttachMoneyIcon sx={{ fontSize: 20, color: 'primary.main', mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.2, fontSize: '1rem' }}>
                      {portfolio?.pm_approvedbudgeteur != null ? currencyFormatter.format(portfolio.pm_approvedbudgeteur) : '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Budget</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: 'center' }}>
                    <TrendingDownIcon sx={{ fontSize: 20, color: actualSpendPct > 90 ? 'warning.main' : 'primary.main', mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.2, fontSize: '1rem' }}>
                      {actualSpendPct.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Utilisation</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* What happens next */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>After Your Decision</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  <strong>Approved:</strong> Portfolio status changes to <em>Active</em>, enabling programme creation and budget allocation.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  <strong>Rejected:</strong> Portfolio status set to <em>Rejected</em>. The portfolio owner will be notified with the decision notes.
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
              dispatchFormDialogDecision({ formKey: 'portfolio_approval', decision })
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
