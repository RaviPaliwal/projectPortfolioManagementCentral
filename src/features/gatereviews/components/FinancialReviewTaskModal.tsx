import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
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
  Chip
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

import { fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface FinancialReviewTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const FinancialReviewTaskModal: React.FC<FinancialReviewTaskModalProps> = ({
  open,
  onClose,
  gateReviewId,
  onSuccess,
  onError,
  DecisionBox: DecisionBoxProp,
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
   */
  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (!gateReview?.pm_projectgatereviewid) return false
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Endorsed' : 'Rejected'
      const existingNotes = gateReview.pm_reviewnotes || ''
      const newEntry = `\n\n--- Financial Review Task ---\nDecision: ${decisionLabel}\nDate: ${new Date().toLocaleDateString()}\nNotes:\n${financeNotes || 'No additional notes provided.'}`
      
      await updateGateReview(gateReview.pm_projectgatereviewid, {
        pm_reviewnotes: existingNotes + newEntry,
      } as any)

      onSuccess(`Financial Task completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
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
                placeholder="Enter financial clearance notes, concerns, or budget conditions..."
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
        {DecisionBoxProp && approvalStepId ? (
          <>
            <Button onClick={onClose} disabled={saving} sx={{ alignSelf: 'flex-start' }}>Cancel</Button>
            <DecisionBoxProp
              approvalStepId={approvalStepId}
              onBeforeDecision={saveTaskData}
              onDecisionComplete={() => onClose()}
              onDecisionError={(msg) => onError(msg)}
              disabled={loading}
            />
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving} sx={{ mr: 'auto' }}>Cancel</Button>
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
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
