import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import DescriptionIcon from '@mui/icons-material/Description'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import { fetchInitiativeById } from '@/services/initiative.service'
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initiative, setInitiative] = useState<InitiativeModel | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [recommendation, setRecommendation] = useState('')

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
    if (open) { loadData(); setReviewNotes(''); setRecommendation('') }
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
  }, [initiative, onSuccess, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'warning.main', color: 'warning.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LightbulbIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Pipeline Review Task</Typography>
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
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Initiative Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{initiative?.pm_name || 'Loading...'}</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Requester</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{initiative?.pm_requestorname || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{initiative?.pm_portfolioname || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Est. Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {initiative?.pm_estimatedcost ? currencyFormatter.format(initiative.pm_estimatedcost) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Strategic Alignment</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {initiative?.pm_strategicalignmentscore != null ? (
                      <StatusTag
                        label={`${initiative.pm_strategicalignmentscore.toFixed(1)} / 5.0`}
                        color={initiative.pm_strategicalignmentscore >= 4 ? 'success' : initiative.pm_strategicalignmentscore >= 2.5 ? 'warning' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not scored</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'warning.50', borderRadius: 1.5, border: '1px solid', borderColor: 'warning.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FactCheckIcon sx={{ fontSize: 16 }} /> Review Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Assess the initiative's alignment, feasibility, and readiness. Provide your recommendation for the next stage of the pipeline.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {initiative?.pm_businesscase && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Business Case
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, mb: 3, bgcolor: 'background.paper', maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {initiative.pm_businesscase}
                  </Paper>
                </>
              )}

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MonetizationOnIcon sx={{ fontSize: 16 }} /> Financial Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Est. Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {initiative?.pm_estimatedcost ? currencyFormatter.format(initiative.pm_estimatedcost) : '-'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Est. Benefits</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {initiative?.pm_estimatedbenefits ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '-'}
                  </Typography>
                </Paper>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Review Assessment</Typography>
              <TextField
                fullWidth multiline rows={2} size="small"
                label="Recommendation"
                placeholder="Summarize your recommendation (e.g., 'Proceed to financial review', 'Needs more information')"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth multiline rows={4} size="small"
                label="Review Notes"
                placeholder="Enter detailed review notes, concerns, or observations about this initiative..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId && (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={() => onClose()}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  )
}