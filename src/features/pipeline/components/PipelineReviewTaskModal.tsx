import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  useTheme,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import DescriptionIcon from '@mui/icons-material/Description'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import { fetchInitiativeById } from '@/services/initiative.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { InitiativeModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface PipelineReviewTaskModalProps {
  open: boolean
  onClose: () => void
  initiativeId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const PipelineReviewTaskModal: React.FC<PipelineReviewTaskModalProps> = ({
  open, onClose, initiativeId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initiative, setInitiative] = useState<InitiativeModel | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const init = await fetchInitiativeById(initiativeId)
      if (!init) { onError('Initiative not found.'); setLoading(false); return }
      setInitiative(init)
    } catch (err) {
      console.error('Failed to load initiative', err)
      onError('Failed to load initiative details.')
    } finally { setLoading(false) }
  }, [initiativeId, onError])

  useEffect(() => {
    if (open) { loadData() }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Pipeline Review completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      onError('Failed to save review decision.')
      return false
    } finally { setSaving(false) }
  }, [onSuccess, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LightbulbIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Pipeline Review Task</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: '24px !important', bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Initiative Details Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Initiative Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                {initiative?.pm_name || 'Loading...'}
              </Typography>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Business Sponsor</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{initiative?.pm_requestedbyname || 'Unassigned'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Submitted Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {initiative?.pm_submissiondate ? new Date(initiative.pm_submissiondate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </Typography>
                </Grid>
                {initiative?.pm_initiativetype !== 2 && (
                  <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Target Portfolio</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{initiative?.pm_portfolioname || '-'}</Typography>
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Initiative Type</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {initiative?.pm_initiativetype != null ? (
                      <StatusTag
                        label={initiative.pm_initiativetype === 0 ? 'Project' : initiative.pm_initiativetype === 1 ? 'Programme' : initiative.pm_initiativetype === 2 ? 'Portfolio' : 'Unknown'}
                        color={initiative.pm_initiativetype === 0 ? 'primary' : initiative.pm_initiativetype === 1 ? 'secondary' : 'info'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not specified</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Business Case Paper */}
            {initiative?.pm_businesscase && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DescriptionIcon sx={{ fontSize: 16 }} /> Business Case
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                  {initiative.pm_businesscase}
                </Paper>
              </Box>
            )}

            {/* Financial Summary */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MonetizationOnIcon sx={{ fontSize: 16 }} /> Financial Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Est. Budget</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {initiative?.pm_estimatedcost != null ? currencyFormatter.format(initiative.pm_estimatedcost) : '-'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Est. Benefits</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {initiative?.pm_estimatedbenefits != null ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '-'}
                    </Typography>
                  </Paper>
                </Grid>
                {initiative?.pm_estimatedbenefits != null && initiative?.pm_estimatedcost != null && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderColor: alpha(theme.palette.success.main, 0.1) }}>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>Net Benefit</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace', color: initiative.pm_estimatedbenefits - initiative.pm_estimatedcost >= 0 ? 'success.main' : 'error.main' }}>
                        {currencyFormatter.format(initiative.pm_estimatedbenefits - initiative.pm_estimatedcost)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Review Instructions Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
                <FactCheckIcon sx={{ fontSize: 16 }} /> Review Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Assess the initiative's alignment, feasibility, and readiness. Provide your decision and notes using the options in the footer.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId && (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'pipeline_review', decision })
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