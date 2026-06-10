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
  Paper
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import FactCheckIcon from '@mui/icons-material/FactCheck'

import { fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import { submitWorkflowDecision } from '@/services/workflow.service'

interface FinancialReviewTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  approvalStepId?: string
}

export const FinancialReviewTaskModal: React.FC<FinancialReviewTaskModalProps> = ({
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
  
  const [financeNotes, setFinanceNotes] = useState('')

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
      
      const projectId = gr._pm_project_value ||
                        (gr as any)._pm_projectlookup_value ||
                        (gr as any).pm_project ||
                        gr.pm_projectcode
      
      if (!projectId) {
        console.warn('FinancialReviewTaskModal: No project ID found on gate review:', gr)
        setLoading(false)
        return
      }
      
      const proj = await fetchProjectDetails(projectId)
      setProject(proj)
    } catch (err) {
      console.error('Failed to load Financial task data', err)
      onError('Failed to load project details for financial review.')
    } finally {
      setLoading(false)
    }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) {
      loadData()
      setFinanceNotes('')
    }
  }, [open, loadData])

  /**
   * Save task-specific data to the gate review before the workflow decision is submitted.
   * Called by the submit handler before submitting the workflow decision.
   */
  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    console.log('[FinancialTask] 🎯 saveTaskData called with workflowDecision:', workflowDecision, '| gateReview:', gateReview?.pm_projectgatereviewid)
    if (!gateReview?.pm_projectgatereviewid) {
      console.warn('[FinancialTask] ❌ gateReview or ID is null — cannot save')
      return false
    }
    setSaving(true)
    try {
      const isApproved = workflowDecision === 0
      const decisionLabel = isApproved ? 'Endorsed' : 'Rejected'
      const existingNotes = gateReview.pm_reviewnotes || ''
      const newEntry = `\n\n--- Financial Review Task ---\nDecision: ${decisionLabel}\nDate: ${new Date().toLocaleDateString()}\nNotes:\n${financeNotes || 'No additional notes provided.'}`
      
      const updatePayload = {
        pm_reviewoutcome: isApproved ? 3 : 4, // 3=In Progress, 4=Rejected
        pm_reviewnotes: existingNotes + newEntry,
      }

      console.log('[FinancialTask] 🚀 Calling updateGateReview:', {
        id: gateReview.pm_projectgatereviewid,
        payload: {
          pm_reviewoutcome: updatePayload.pm_reviewoutcome,
          pm_reviewnotes_length: updatePayload.pm_reviewnotes?.length,
        },
      })

      const updateResult = await updateGateReview(gateReview.pm_projectgatereviewid, updatePayload as any)
      
      console.log('[FinancialTask] ✅ updateGateReview returned:', updateResult)
      if (updateResult === null) {
        console.log('[FinancialTask] ℹ️ updateGateReview returned null (204 No Content — expected)')
      }

      onSuccess(`Financial Task completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      console.error('[FinancialTask] ❌ Decision record error:', err)
      onError('Failed to save Financial decision.')
      return false
    } finally {
      setSaving(false)
    }
  }, [gateReview, financeNotes, onSuccess, onError])

  /** Legacy decision handler for direct usage (not via FormDialog/workflow). */
  const handleLegacyDecision = useCallback(async (decision: 'Endorsed' | 'Rejected') => {
    if (!gateReview?.pm_projectgatereviewid) return
    setSaving(true)
    try {
      const existingNotes = gateReview.pm_reviewnotes || ''
      const newEntry = `\n\n--- Financial Review Task ---\nDecision: ${decision}\nDate: ${new Date().toLocaleDateString()}\nNotes:\n${financeNotes || 'No additional notes provided.'}`
      
      await updateGateReview(gateReview.pm_projectgatereviewid, {
        pm_reviewoutcome: decision === 'Endorsed' ? 3 : 4, // 3=In Progress, 4=Rejected
        pm_reviewnotes: existingNotes + newEntry,
      } as any)

      onSuccess(`Financial Task completed. Decision: ${decision}.`)
      onClose()
    } catch (err) {
      onError('Failed to save Financial decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, financeNotes, onSuccess, onClose, onError])

  /**
   * Handle Financial review submission via FormDialog/workflow path.
   * Uses a single submit button that derives the workflow decision from
   * the financial assessment: has notes → endorse (0), no notes → reject (3).
   */
  const handleSubmitFinancialDecision = useCallback(async () => {
    if (!gateReview?.pm_projectgatereviewid || !approvalStepId) return

    // Button is disabled without notes, so always endorse
    const workflowDecision = 0

    setSaving(true)
    try {
      const taskSaved = await saveTaskData(workflowDecision)
      if (!taskSaved) {
        setSaving(false)
        return
      }

      const success = await submitWorkflowDecision(approvalStepId, workflowDecision, financeNotes)

      if (success) {
        console.log('[FinancialTask] ✅ Workflow decision submitted successfully')
        onClose()
      } else {
        onError('Workflow routing handler did not return success.')
      }
    } catch (err) {
      console.error('[FinancialTask] ❌ Error submitting decision:', err)
      onError('Failed to submit Financial decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, approvalStepId, financeNotes, saveTaskData, onClose, onError])

  const budget = project?.pm_approvedbudgeteur ?? 0
  const spend = project?.pm_actualcosteur ?? 0
  const remaining = budget - spend

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'secondary.main', color: 'secondary.contrastText', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Financial Review Task</Typography>
        </Box>
        <Chip label="Pending Financial Review" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container sx={{ height: '100%' }}>
            {/* Left Panel: Project & Financial Context */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Project Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{project?.pm_projectname || 'Loading...'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{project?.pm_projectcode}</Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><AttachMoneyIcon fontSize="small"/> Approved Budget</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>{currencyFormatter.format(budget)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{currencyFormatter.format(spend)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Remaining</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: remaining < 0 ? 'error.main' : 'success.main' }}>{currencyFormatter.format(remaining)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Financial RAG</Typography>
                  <Box sx={{ mt: 0.5 }}>
                     {/* Placeholder for actual RAG tag if cost rag exists, falling back to overall for now or simple tag */}
                    <StatusTag label={String(project?.pm_ragstatus) === '1' ? 'On Track' : String(project?.pm_ragstatus) === '0' ? 'At Risk' : 'Critical'} color={String(project?.pm_ragstatus) === '1' ? 'success' : String(project?.pm_ragstatus) === '0' ? 'warning' : 'error'} />
                  </Box>
                </Box>
              </Box>

              {/* Show previous endorsements/notes in read-only panel */}
              {gateReview?.pm_reviewnotes && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <FactCheckIcon fontSize="small" /> Previous Endorsements & Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                    {gateReview.pm_reviewnotes}
                  </Paper>
                </Box>
              )}
            </Grid>

            {/* Right Panel: Assessment */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Financial Assessment</Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Review the project's financial health. Ensure that the budget requested for the upcoming phase is realistic and that previous phase spending is accounted for.
              </Typography>

              <TextField 
                fullWidth multiline rows={6} 
                label="Financial Assessment Notes"
                placeholder="Enter new financial clearance notes, concerns, or budget conditions..."
                helperText={gateReview?.pm_reviewnotes ? 'Previous endorsement notes shown on left — your new notes will be appended.' : ''}
                value={financeNotes}
                onChange={(e) => setFinanceNotes(e.target.value)}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />

              <Box sx={{ mt: 4, p: 2, bgcolor: 'warning.50', borderRadius: 1.5, border: '1px solid', borderColor: 'warning.100' }}>
                 <Typography variant="body2" color="warning.900" sx={{ fontSize: '0.8rem' }}>
                  <strong>Note:</strong> Endorsing the financials does not approve the gate review. It provides clearance for the Governance Board to make the final decision.
                </Typography>
              </Box>
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
                disabled={loading || saving || !financeNotes.trim()}
                onClick={handleSubmitFinancialDecision}
                sx={{ fontWeight: 600 }}
              >
                {saving ? 'Processing...' : 'Endorse & Submit'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving} sx={{ alignSelf: 'flex-start' }}>Cancel</Button>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button 
                variant="outlined" 
                color="error" 
                disabled={loading || saving}
                onClick={() => handleLegacyDecision('Rejected')}
              >
                Reject Financials
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                disabled={loading || saving || !financeNotes.trim()}
                onClick={() => handleLegacyDecision('Endorsed')}
              >
                {saving ? 'Processing...' : 'Endorse Financials'}
              </Button>
            </Box>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
