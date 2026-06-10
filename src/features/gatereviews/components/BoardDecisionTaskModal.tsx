import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Box,
  Typography,
  Button,
  CircularProgress,
  TextField,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper
} from '@mui/material'
import GavelIcon from '@mui/icons-material/Gavel'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import { fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import { submitWorkflowDecision } from '@/services/workflow.service'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'

interface BoardDecisionTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  approvalStepId?: string
}

export const BoardDecisionTaskModal: React.FC<BoardDecisionTaskModalProps> = ({
  open,
  onClose,
  gateReviewId,
  onSuccess,
  onError,
  approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  
  const [decisionData, setDecisionData] = useState({
    pm_reviewoutcome: 0,
    pm_actualreviewdate: new Date().toISOString().split('T')[0],
    pm_reviewnotes: '',
    pm_reviewconditions: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const gr = await fetchGateReviewById(gateReviewId)
      if (!gr) {
        onError('Gate review not found.')
        setLoading(false)
        return
      }
      setGateReview(gr)
      
      if (!gr._pm_project_value) {
        setLoading(false)
        return
      }
      
      const proj = await fetchProjectDetails(gr._pm_project_value)
      setProject(proj)
      
      setDecisionData({
        pm_reviewoutcome: Number(gr.pm_reviewoutcome ?? 0),
        pm_actualreviewdate: gr.pm_actualreviewdate || new Date().toISOString().split('T')[0],
        pm_reviewnotes: '', // Fresh notes for final decision
        pm_reviewconditions: gr.pm_reviewconditions || '',
      })
    } catch (err) {
      console.error('Failed to load Board task data', err)
      onError('Failed to load project details for board decision.')
    } finally {
      setLoading(false)
    }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  /**
   * Save board decision data to the gate review before the workflow decision is submitted.
   * Called by the submit handler before submitting the workflow decision.
   * Updates the gate review status and preserves the board's outcome selection.
   */
  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    console.log('[BoardTask] 🎯 saveTaskData called with workflowDecision:', workflowDecision, '| gateReview:', gateReview?.pm_projectgatereviewid)
    if (!gateReview?.pm_projectgatereviewid) {
      console.warn('[BoardTask] ❌ gateReview or ID is null — cannot save')
      return false
    }
    setSaving(true)
    try {
      const existingNotes = gateReview.pm_reviewnotes || ''
      const isApproved = workflowDecision === 0
      const finalOutcomeText = isApproved ? 'APPROVED' : 'REJECTED'

      // Board finalizes the review — status always Complete (0)
      // Outcome differentiates: approved from dropdown, or Rejected (4)
      const resolvedStatus = 0 // Always Complete
      
      const outcomeLabels: Record<number, string> = { 0: 'Approved', 1: 'Conditional Approval', 2: 'Not Approved', 4: 'Rejected' }
      const outcomeLabel = outcomeLabels[decisionData.pm_reviewoutcome] ?? 'Unknown'
      
      const newEntry = `\n\n--- Final Board Decision ---\nWorkflow: ${finalOutcomeText} (${outcomeLabel})\nDate: ${decisionData.pm_actualreviewdate}\nComments:\n${decisionData.pm_reviewnotes || 'None provided.'}`

      const updatePayload = {
        ...decisionData,
        pm_reviewoutcome: isApproved ? decisionData.pm_reviewoutcome : 4, // 4=Rejected
        pm_reviewstatus: resolvedStatus,
        pm_reviewnotes: existingNotes + newEntry,
      }

      console.log('[BoardTask] 🚀 Calling updateGateReview:', {
        id: gateReview.pm_projectgatereviewid,
        payload: {
          pm_reviewoutcome: updatePayload.pm_reviewoutcome,
          pm_reviewoutcome_type: typeof updatePayload.pm_reviewoutcome,
          pm_reviewstatus: updatePayload.pm_reviewstatus,
          pm_reviewstatus_type: typeof updatePayload.pm_reviewstatus,
          pm_actualreviewdate: updatePayload.pm_actualreviewdate,
          pm_reviewconditions: updatePayload.pm_reviewconditions,
          pm_reviewnotes_length: updatePayload.pm_reviewnotes?.length,
        },
      })

      const updateResult = await updateGateReview(gateReview.pm_projectgatereviewid, updatePayload as any)

      console.log('[BoardTask] ✅ updateGateReview returned:', updateResult)
      
      if (updateResult === null) {
        // 204 No Content is normal for Dataverse updates — verify by fetching fresh
        console.log('[BoardTask] ℹ️ updateGateReview returned null (204 No Content — this is expected)')
      } else if (updateResult?.pm_projectgatereviewid) {
        console.log('[BoardTask] ✅ Update confirmed — returned gate review ID:', updateResult.pm_projectgatereviewid)
      }
      
      onSuccess(`Final Decision recorded. Outcome: ${outcomeLabel}`)
      return true
    } catch (err) {
      console.error('[BoardTask] ❌ Decision record error:', err)
      onError('Unable to record board decision.')
      return false
    } finally {
      setSaving(false)
    }
  }, [gateReview, decisionData, onSuccess, onError])

  /** Legacy decision handler for direct usage (not via FormDialog/workflow). */
  const handleLegacyRecordDecision = useCallback(async () => {
    if (!gateReview?.pm_projectgatereviewid) return
    setSaving(true)
    try {
      const existingNotes = gateReview.pm_reviewnotes || ''
      const outcomeLabel = decisionData.pm_reviewoutcome === 0 ? 'APPROVED' : decisionData.pm_reviewoutcome === 1 ? 'CONDITIONAL APPROVAL' : decisionData.pm_reviewoutcome === 4 ? 'REJECTED' : 'NOT APPROVED'
      
      const newEntry = `\n\n--- Final Board Decision ---\nOutcome: ${outcomeLabel}\nDate: ${decisionData.pm_actualreviewdate}\nComments:\n${decisionData.pm_reviewnotes || 'None provided.'}`

      const isApprovedLegacy = decisionData.pm_reviewoutcome === 0 || decisionData.pm_reviewoutcome === 1
      await updateGateReview(gateReview.pm_projectgatereviewid, {
        ...decisionData,
        pm_reviewoutcome: isApprovedLegacy ? decisionData.pm_reviewoutcome : 4, // 4=Rejected
        pm_reviewstatus: 0, // Always Complete
        pm_reviewnotes: existingNotes + newEntry,
      } as any)

      onSuccess(`Final Decision recorded. Outcome: ${outcomeLabel}`)
      onClose()
    } catch (err) {
      console.error('Decision record error:', err)
      onError('Unable to record board decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, decisionData, onSuccess, onClose, onError])

  /**
   * Handle final board decision submission via FormDialog/workflow path.
   * Derives the workflow decision (0=approve, 3=reject) from the outcome dropdown:
   * - Approved (0) or Conditional Approval (1) → workflow approves
   * - Not Approved / Return (2) → workflow rejects
   * Saves gate review data first, then submits the workflow decision.
   */
  const handleSubmitBoardDecision = useCallback(async () => {
    if (!gateReview?.pm_projectgatereviewid || !approvalStepId) return
    
    // Derive workflow decision from the outcome dropdown
    // Outcomes 0 (Approved) and 1 (Conditional) → workflow approves
    // Outcomes 2 (Not Approved) and 4 (Rejected) → workflow rejects
    const isApprovedOutcome = decisionData.pm_reviewoutcome === 0 || decisionData.pm_reviewoutcome === 1
    const workflowDecision = isApprovedOutcome ? 0 : 3

    setSaving(true)
    try {
      // Step 1: Save gate review data
      const taskSaved = await saveTaskData(workflowDecision)
      if (!taskSaved) {
        console.warn('[BoardTask] ⛔ saveTaskData returned false — aborting workflow submission')
        setSaving(false)
        return
      }

      // Step 2: Submit the workflow decision (updates step status + triggers routing handler)
      const success = await submitWorkflowDecision(approvalStepId, workflowDecision, decisionData.pm_reviewnotes)
      
      if (success) {
        console.log('[BoardTask] ✅ Workflow decision submitted successfully')
        onClose()
      } else {
        console.error('[BoardTask] ❌ Workflow decision submission failed')
        onError('Workflow routing handler did not return success.')
      }
    } catch (err) {
      console.error('[BoardTask] ❌ Error submitting board decision:', err)
      onError('Failed to submit board decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, approvalStepId, decisionData, saveTaskData, onClose, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'success.dark', color: 'success.contrastText', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GavelIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Governance Board Decision</Typography>
        </Box>
        <Chip label="Pending Final Decision" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container sx={{ height: '100%' }}>
            {/* Left Panel: Project Context & Previous Notes */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Project Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{project?.pm_projectname || 'Loading...'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Target: <strong>{gateReview?.pm_gatename}</strong></Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Overall Health</Typography>
                  <StatusTag label={String(project?.pm_ragstatus) === '1' ? 'On Track' : String(project?.pm_ragstatus) === '0' ? 'At Risk' : 'Critical'} color={String(project?.pm_ragstatus) === '1' ? 'success' : String(project?.pm_ragstatus) === '0' ? 'warning' : 'error'} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Progress</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_percentcomplete || 0}%</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <FactCheckIcon fontSize="small"/> Previous Endorsements & Notes
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 250, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                {gateReview?.pm_reviewnotes || 'No previous endorsements or notes recorded.'}
              </Paper>
            </Grid>

            {/* Right Panel: Final Decision Form */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Record Final Decision</Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                As the governance authority, your decision will dictate whether this project progresses to the next lifecycle stage.
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Outcome</InputLabel>
                    <Select
                      value={decisionData.pm_reviewoutcome}
                      label="Outcome"
                      onChange={(e) => setDecisionData(f => ({ ...f, pm_reviewoutcome: Number(e.target.value) }))}
                      sx={{ borderRadius: 1.5 }}
                    >
                      <MenuItem value={0}>Approved</MenuItem>
                      <MenuItem value={1}>Conditional Approval</MenuItem>
                      <MenuItem value={2}>Not Approved / Return</MenuItem>
                      <MenuItem value={4}>Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Actual Review Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={decisionData.pm_actualreviewdate}
                    onChange={(e) => setDecisionData(f => ({ ...f, pm_actualreviewdate: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
                
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Final Board Comments"
                    multiline
                    rows={4}
                    fullWidth
                    size="small"
                    value={decisionData.pm_reviewnotes}
                    onChange={(e) => setDecisionData(f => ({ ...f, pm_reviewnotes: e.target.value }))}
                    slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                    placeholder="Summarize the board's rationale..."
                  />
                </Grid>

                {decisionData.pm_reviewoutcome === 1 && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Mandatory Conditions for Progression"
                      multiline
                      rows={3}
                      fullWidth
                      size="small"
                      value={decisionData.pm_reviewconditions}
                      onChange={(e) => setDecisionData(f => ({ ...f, pm_reviewconditions: e.target.value }))}
                      slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                      placeholder="What specific conditions must the PM meet before the next phase?"
                      sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'warning.main' } } }}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
        {approvalStepId ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={onClose} disabled={saving}>Cancel</Button>
              <Button 
                variant="contained" 
                color="success" 
                disabled={loading || saving}
                onClick={handleSubmitBoardDecision}
                sx={{ fontWeight: 600 }}
              >
                {saving ? 'Processing...' : 'Submit Final Decision'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving} sx={{ alignSelf: 'flex-start' }}>Cancel</Button>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button 
                variant="contained" 
                color="success" 
                disabled={loading || saving}
                onClick={handleLegacyRecordDecision}
                sx={{ fontWeight: 600 }}
              >
                {saving ? 'Processing...' : 'Submit Final Decision'}
              </Button>
            </Box>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
