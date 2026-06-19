import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import SavingsIcon from '@mui/icons-material/Savings'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import CategoryIcon from '@mui/icons-material/Category'
import SourceIcon from '@mui/icons-material/Source'
import NotesIcon from '@mui/icons-material/Notes'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import { fetchBudgetLineById } from '@/services/finance.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { BudgetLineModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface BudgetLineApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  budgetLineId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff', '1': 'Contractors', '2': 'Licences', '3': 'Infrastructure',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'warning' | 'info' | 'secondary'> = {
  '0': 'primary', '1': 'warning', '2': 'info', '3': 'secondary',
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const BudgetLineApprovalTaskModal: React.FC<BudgetLineApprovalTaskModalProps> = ({
  open, onClose, budgetLineId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [budgetLine, setBudgetLine] = useState<BudgetLineModel | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const bl = await fetchBudgetLineById(budgetLineId)
      if (!bl) { onError('Budget line not found.'); setLoading(false); return }
      setBudgetLine(bl)
    } catch (err) {
      console.error('Failed to load budget line', err)
      onError('Failed to load budget line details.')
    } finally { setLoading(false) }
  }, [budgetLineId, onError])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  if (!open) return null

  const variance = budgetLine?.pm_varianceeur
  const isOverBudget = variance != null && variance < 0

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'primary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Budget Line Review</Typography>
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
            {/* Left Column - Budget Context */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Budget Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
                {budgetLine?.pm_budgetlinename || 'Loading...'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Category</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={CATEGORY_LABELS[String(budgetLine?.pm_costcategory ?? '')] ?? 'Unknown'}
                      color={CATEGORY_COLORS[String(budgetLine?.pm_costcategory ?? '')] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Funding Source</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SourceIcon sx={{ fontSize: 14 }} />
                    {budgetLine?.pm_fundingsourcename || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fiscal Period</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {budgetLine?.pm_fiscalperiodname || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Entity</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {budgetLine?.pm_portfolio || budgetLine?.pm_programme || budgetLine?.pm_projectcode || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Variance Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {variance != null ? (
                      <StatusTag
                        label={isOverBudget ? 'Over Budget' : 'On Track'}
                        color={isOverBudget ? 'error' : 'success'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not set</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              {budgetLine?.pm_notes && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <NotesIcon sx={{ fontSize: 16 }} /> Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                    {budgetLine.pm_notes}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChecklistRtlIcon sx={{ fontSize: 16 }} /> Review Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Review the budget line details — verify approved amounts, actual spend, and variance before approving or rejecting.
                </Typography>
              </Box>
            </Grid>

            {/* Right Column - Financial Details */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SavingsIcon sx={{ fontSize: 16 }} /> Budget Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {budgetLine?.pm_approvedbudgeteur != null ? currencyFormatter.format(budgetLine.pm_approvedbudgeteur) : '—'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Revised Budget</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {budgetLine?.pm_revisedbudgeteur != null ? currencyFormatter.format(budgetLine.pm_revisedbudgeteur) : '—'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {budgetLine?.pm_actualspendeur != null ? currencyFormatter.format(budgetLine.pm_actualspendeur) : '—'}
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingDownIcon sx={{ fontSize: 16 }} /> Spend Breakdown
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Committed Spend</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {budgetLine?.pm_committedspendeur != null ? currencyFormatter.format(budgetLine.pm_committedspendeur) : '—'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Forecast</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {budgetLine?.pm_forecastspendeur != null ? currencyFormatter.format(budgetLine.pm_forecastspendeur) : '—'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">EAC</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {budgetLine?.pm_estimateatcompletioneur != null ? currencyFormatter.format(budgetLine.pm_estimateatcompletioneur) : '—'}
                  </Typography>
                </Paper>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CurrencyExchangeIcon sx={{ fontSize: 16 }} /> Variance Analysis
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2, borderRadius: 1.5,
                  borderColor: isOverBudget ? 'error.main' : 'success.main',
                  bgcolor: isOverBudget ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {isOverBudget
                    ? <WarningAmberIcon sx={{ fontSize: 28, color: 'error.main' }} />
                    : <VerifiedIcon sx={{ fontSize: 28, color: 'success.main' }} />
                  }
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: isOverBudget ? 'error.main' : 'success.main' }}>
                      {variance != null ? `${variance >= 0 ? '+' : ''}${currencyFormatter.format(variance)}` : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isOverBudget
                        ? 'Over budget — variance is negative. Review required.'
                        : variance != null && variance >= 0
                          ? 'Under budget — variance is positive.'
                          : 'Variance not calculated yet.'
                      }
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1.5, border: '1px solid', borderColor: 'info.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CategoryIcon sx={{ fontSize: 16 }} /> Budget Note
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                  This budget line will be reflected in portfolio/programme/project financial reports once approved.
                  Spending against this budget will be tracked and variance monitored.
                </Typography>
              </Box>
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
                onSuccess('Budget line review completed. Decision: ' + decisionLabel + '.')
                return true
              } catch (err) {
                onError('Failed to save review decision.')
                return false
              } finally { setSaving(false) }
            }}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'budget_approval', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  )
}
