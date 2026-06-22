import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  FormControl, InputLabel, Select, MenuItem,
  useTheme,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GavelIcon from '@mui/icons-material/Gavel'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { fetchInitiativeById, updateInitiativeStatus } from '@/services/initiative.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { InitiativeModel } from '@/types/dataverse'
import { StatusTag, Button } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import DescriptionIcon from '@mui/icons-material/Description'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface PipelineDecisionTaskModalProps {
  open: boolean
  onClose: () => void
  initiativeId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const OUTCOME_OPTIONS = [
  { value: 0, label: 'Approved', description: 'Initiative is approved for conversion to project' },
  { value: 2, label: 'Deferred', description: 'Postpone initiative for later reconsideration' },
  { value: 3, label: 'Rejected', description: 'Initiative does not meet criteria for progression' },
]

export const PipelineDecisionTaskModal: React.FC<PipelineDecisionTaskModalProps> = ({
  open, onClose, initiativeId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initiative, setInitiative] = useState<InitiativeModel | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [conditions, setConditions] = useState('')

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
    if (open) { loadData(); setSelectedOutcome(0); setDecisionNotes(''); setConditions('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      await updateInitiativeStatus(initiativeId, selectedOutcome)
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess(`Pipeline Decision recorded. Outcome: ${outcomeLabel}.`)
      return true
    } catch (err) {
      console.error('[PipelineDecisionTaskModal] saveTaskData error:', err)
      onError('Failed to record pipeline decision.')
      return false
    } finally { setSaving(false) }
  }, [initiativeId, selectedOutcome, onSuccess, onError])

  const handleLegacyDecision = useCallback(async () => {
    setSaving(true)
    try {
      await updateInitiativeStatus(initiativeId, selectedOutcome)
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess(`Pipeline Decision recorded. Outcome: ${outcomeLabel}.`)
      onClose()
    } catch (err) {
      onError('Failed to record pipeline decision.')
    } finally { setSaving(false) }
  }, [initiativeId, selectedOutcome, onSuccess, onClose, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'success.dark', color: 'success.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GavelIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Pipeline Decision</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Final Decision" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
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
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Initiative Summary</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{initiative?.pm_name || 'Loading...'}</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Requester</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{initiative?.pm_requestorname || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Submitted</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {initiative?.pm_submissiondate ? new Date(initiative.pm_submissiondate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Initiative Type</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {initiative?.pm_initiativetype != null ? (
                      <StatusTag
                        label={initiative.pm_initiativetype === 0 ? 'Project' : initiative.pm_initiativetype === 1 ? 'Programme' : initiative.pm_initiativetype === 2 ? 'Initiative' : 'Unknown'}
                        color={initiative.pm_initiativetype === 0 ? 'primary' : initiative.pm_initiativetype === 1 ? 'secondary' : 'info'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not specified</Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{initiative?.pm_portfolioname || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Est. Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {initiative?.pm_estimatedcost != null ? currencyFormatter.format(initiative.pm_estimatedcost) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Est. Benefits</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {initiative?.pm_estimatedbenefits != null ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Priority Score</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {initiative?.pm_priorityscore != null ? (
                      <StatusTag
                        label={`${initiative.pm_priorityscore.toFixed(1)} / 10.0`}
                        color={initiative.pm_priorityscore >= 7 ? 'success' : initiative.pm_priorityscore >= 4 ? 'warning' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not scored</Typography>
                    )}
                  </Box>
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
                <Box>
                  <Typography variant="caption" color="text.secondary">Current Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={initiative?.pm_pipelinestatus === 0 ? 'Approved' : initiative?.pm_pipelinestatus === 1 ? 'Under Review' : initiative?.pm_pipelinestatus === 2 ? 'Deferred' : initiative?.pm_pipelinestatus === 3 ? 'Rejected' : initiative?.pm_pipelinestatus === 4 ? 'Converted' : 'Draft'}
                      color={initiative?.pm_pipelinestatus === 0 ? 'success' : initiative?.pm_pipelinestatus === 1 ? 'info' : initiative?.pm_pipelinestatus === 2 ? 'warning' : initiative?.pm_pipelinestatus === 3 ? 'error' : 'secondary'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
              </Box>
              {initiative?.pm_decisiondate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Previous Decision</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {new Date(initiative.pm_decisiondate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mt: 4, p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2) }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FactCheckIcon sx={{ fontSize: 16 }} /> Authority Required
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  As the approving authority, your decision will set the initiative status. This determines whether it proceeds to project conversion.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {initiative?.pm_businesscase && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Business Case
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {initiative.pm_businesscase}
                  </Paper>
                </>
              )}

              {initiative?.pm_estimatedbenefits != null && initiative?.pm_estimatedcost != null && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2) }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>Net Business Value</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: initiative.pm_estimatedbenefits - initiative.pm_estimatedcost >= 0 ? 'success.main' : 'error.main' }}>
                    {currencyFormatter.format(initiative.pm_estimatedbenefits - initiative.pm_estimatedcost)}
                  </Typography>
                </Paper>
              )}

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Record Decision</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select the outcome for this pipeline initiative. The status will be updated immediately upon submission.
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Outcome</InputLabel>
                    <Select
                      value={selectedOutcome}
                      label="Outcome"
                      onChange={(e) => setSelectedOutcome(Number(e.target.value))}
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
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Decision Notes"
                    multiline rows={4}
                    fullWidth
                    size="small"
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Provide the rationale for this decision..."
                  />
                </Grid>
                {selectedOutcome === 2 && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Deferral Conditions"
                      multiline rows={3}
                      fullWidth
                      size="small"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      placeholder="What conditions must be met before this initiative can be reconsidered?"
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'warning.main' } } }}
                    />
                  </Grid>
                )}
                {selectedOutcome === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Approval Conditions (optional)"
                      multiline rows={2}
                      fullWidth
                      size="small"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      placeholder="Any conditions or prerequisites for conversion?"
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
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'pipeline_decision', decision })
              onClose()
            }}
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