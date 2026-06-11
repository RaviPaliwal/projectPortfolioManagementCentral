import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import SavingsIcon from '@mui/icons-material/Savings'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import BusinessIcon from '@mui/icons-material/Business'
import DescriptionIcon from '@mui/icons-material/Description'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import EuroIcon from '@mui/icons-material/Euro'
import { fetchFundingSourceById } from '@/services/finance.service'
import type { FundingSourceModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface FundingSourceApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  fundingSourceId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const FUNDING_TYPE_LABELS: Record<string, string> = {
  '0': 'Capital', '1': 'EU', '2': 'Revenue', '3': 'Grant',
}

const FUNDING_TYPE_COLORS: Record<string, 'primary' | 'info' | 'success' | 'secondary'> = {
  '0': 'primary', '1': 'info', '2': 'success', '3': 'secondary',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active', '1': 'Exhausted',
}

const STATUS_COLORS: Record<string, 'success' | 'error'> = {
  '0': 'success', '1': 'error',
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const FundingSourceApprovalTaskModal: React.FC<FundingSourceApprovalTaskModalProps> = ({
  open, onClose, fundingSourceId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [source, setSource] = useState<FundingSourceModel | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const fs = await fetchFundingSourceById(fundingSourceId)
      if (!fs) { onError('Funding source not found.'); setLoading(false); return }
      setSource(fs)
    } catch (err) {
      console.error('Failed to load funding source', err)
      onError('Failed to load funding source details.')
    } finally { setLoading(false) }
  }, [fundingSourceId, onError])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  if (!open) return null

  const totalAmt = source?.pm_totalamounteur ?? 0
  const allocatedAmt = source?.pm_allocatedamounteur ?? 0
  const availableAmt = totalAmt - allocatedAmt
  const utilPct = totalAmt > 0 ? (allocatedAmt / totalAmt) * 100 : 0

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'secondary.main', color: 'secondary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Funding Source Review</Typography>
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
            {/* Left Column - Source Context */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Funding Source Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
                {source?.pm_fundingsourcename || 'Loading...'}
              </Typography>
              {source?.pm_referencecode && (
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {source.pm_referencecode}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={FUNDING_TYPE_LABELS[String(source?.pm_fundingtype ?? '')] ?? 'Unknown'}
                      color={FUNDING_TYPE_COLORS[String(source?.pm_fundingtype ?? '')] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={STATUS_LABELS[String(source?.pm_fundingstatus ?? '')] ?? 'Unknown'}
                      color={STATUS_COLORS[String(source?.pm_fundingstatus ?? '')] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Funding Body</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 14 }} />
                    {source?.pm_fundingbody || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Effective Period</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 14 }} />
                    {source?.pm_effectivefromdate ? new Date(source.pm_effectivefromdate).toLocaleDateString() : '—'}
                    {' → '}
                    {source?.pm_effectivetodate ? new Date(source.pm_effectivetodate).toLocaleDateString() : '—'}
                  </Typography>
                </Box>
                {source?.pm_portfolioname && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Portfolio</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{source.pm_portfolioname}</Typography>
                  </Box>
                )}
                {source?.pm_programmename && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Programme</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{source.pm_programmename}</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'secondary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'secondary.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChecklistRtlIcon sx={{ fontSize: 16 }} /> Review Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Review the funding source details — verify the type, allocation amounts, and effective dates before approving or rejecting.
                </Typography>
              </Box>
            </Grid>

            {/* Right Column - Funding Details */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EuroIcon sx={{ fontSize: 16 }} /> Funding Allocation
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {currencyFormatter.format(totalAmt)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Allocated</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {currencyFormatter.format(allocatedAmt)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Available</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: availableAmt > 0 ? 'success.main' : 'text.secondary' }}>
                    {currencyFormatter.format(Math.max(0, availableAmt))}
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SavingsIcon sx={{ fontSize: 16 }} /> Utilization
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Utilization Rate</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {utilPct.toFixed(1)}%
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 10, borderRadius: 1.5, bgcolor: 'grey.200', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${Math.min(utilPct, 100)}%`,
                      height: '100%',
                      bgcolor: utilPct > 90 ? 'error.main' : utilPct > 70 ? 'warning.main' : 'success.main',
                      borderRadius: 1.5,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DescriptionIcon sx={{ fontSize: 16 }} /> Source Details
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
                    <Typography variant="body2">{FUNDING_TYPE_LABELS[String(source?.pm_fundingtype ?? '')] ?? '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Status</Typography>
                    <Typography variant="body2">{STATUS_LABELS[String(source?.pm_fundingstatus ?? '')] ?? '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Funding Body</Typography>
                    <Typography variant="body2">{source?.pm_fundingbody || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reference Code</Typography>
                    <Typography variant="body2">{source?.pm_referencecode || '—'}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1.5, border: '1px solid', borderColor: 'success.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoneyIcon sx={{ fontSize: 16 }} /> Funding Note
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                  This funding source will be available for budget allocation across portfolios, programmes, and projects once approved.
                  Allocations against this source will reduce the available amount.
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
                onSuccess('Funding source review completed. Decision: ' + decisionLabel + '.')
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
