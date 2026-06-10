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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  TextField,
  Paper,
  Divider,
  Chip
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'

import { GovernanceReadinessService, fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import { submitWorkflowDecision } from '@/services/workflow.service'
import type { ProjectReadinessReport } from '@/services/governance-readiness.service'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'

interface PmoReadinessTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  /** The workflow approval step ID for submitting the decision */
  approvalStepId?: string
}

export const PmoReadinessTaskModal: React.FC<PmoReadinessTaskModalProps> = ({
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
  const [readiness, setReadiness] = useState<ProjectReadinessReport | null>(null)

  // Override state: Record<checkId, rationale>
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [editingOverride, setEditingOverride] = useState<string | null>(null)
  const [overrideText, setOverrideText] = useState('')
  const [pmoNotes, setPmoNotes] = useState('')

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
      
      // Look across all possible property names that Dataverse might use to return the project lookup
      const projectId = gr._pm_project_value ||
                        (gr as any)._pm_projectlookup_value ||
                        (gr as any).pm_project ||
                        gr.pm_projectcode
      
      if (!projectId) {
        console.warn('PmoReadinessTaskModal: No project ID found on gate review:', gr)
        setLoading(false)
        return
      }
      
      const proj = await fetchProjectDetails(projectId)
      const report = await GovernanceReadinessService.checkProjectReadiness(projectId, Number(gr.pm_gatestage ?? 0))
      
      setProject(proj)
      setReadiness(report)
      
          // Notes field always starts fresh — previous notes are shown read-only above
      
    } catch (err) {
      console.error('Failed to load PMO task data', err)
      onError('Failed to load project details for readiness check.')
    } finally {
      setLoading(false)
    }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) {
      loadData()
      setOverrides({})
      setEditingOverride(null)
    }
  }, [open, loadData])

  const handleSaveOverride = () => {
    if (editingOverride && overrideText.trim()) {
      setOverrides(prev => ({ ...prev, [editingOverride]: overrideText.trim() }))
    }
    setEditingOverride(null)
    setOverrideText('')
  }

  const handleRemoveOverride = (id: string) => {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Calculate dynamic status accounting for overrides (must be before saveTaskData)
  const getDynamicStatus = (item: any) => {
    if (overrides[item.id]) return 'waived'
    return item.status
  }

  const allClear = readiness?.items.every(i => getDynamicStatus(i) === 'passed' || getDynamicStatus(i) === 'waived' || getDynamicStatus(i) === 'warning')

  /**
   * Save task-specific data to the gate review before the workflow decision is submitted.
   * Called by the submit handler before submitting the workflow decision.
   */
  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    console.log('[PmoTask] 🎯 saveTaskData called with workflowDecision:', workflowDecision, '| gateReview:', gateReview?.pm_projectgatereviewid)
    
    // If approving, validate all readiness items are passed/waived/warning
    if (workflowDecision === 0 && !allClear) {
      console.warn('[PmoTask] ⛔ All failed checks must be resolved before approving')
      onError('All failed readiness checks must be resolved or overridden before approving.')
      return false
    }

    if (!gateReview?.pm_projectgatereviewid) {
      console.warn('[PmoTask] ❌ gateReview or ID is null — cannot save')
      return false
    }
    setSaving(true)
    try {
      const isApproved = workflowDecision === 0
      const decisionLabel = isApproved ? 'Approved' : 'Rejected'
      
      // Build a new entry to append to existing gate review notes
      const existingNotes = gateReview.pm_reviewnotes || ''
      let newEntry = `--- PMO Readiness Task ---\nDecision: ${decisionLabel}\nDate: ${new Date().toLocaleDateString()}\n\nNotes:\n${pmoNotes || 'No additional notes.'}\n`
      
      if (Object.keys(overrides).length > 0) {
        newEntry += `\n--- Overrides Applied ---\n`
        Object.entries(overrides).forEach(([id, rationale]) => {
          const checkLabel = readiness?.items.find(i => i.id === id)?.label || id
          newEntry += `- ${checkLabel}: ${rationale}\n`
        })
      }

      const updatePayload = {
        pm_reviewoutcome: isApproved ? 3 : 4, // 3=In Progress, 4=Rejected
        pm_reviewnotes: existingNotes ? existingNotes + `\n\n` + newEntry : newEntry,
      }

      console.log('[PmoTask] 🚀 Calling updateGateReview:', {
        id: gateReview.pm_projectgatereviewid,
        payload: {
          pm_reviewoutcome: updatePayload.pm_reviewoutcome,
          pm_reviewnotes_length: updatePayload.pm_reviewnotes?.length,
        },
      })

      const updateResult = await updateGateReview(gateReview.pm_projectgatereviewid!, updatePayload as any)

      console.log('[PmoTask] ✅ updateGateReview returned:', updateResult)
      if (updateResult === null) {
        console.log('[PmoTask] ℹ️ updateGateReview returned null (204 No Content — expected)')
      }

      onSuccess(`PMO Task completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      console.error('[PmoTask] ❌ Decision record error:', err)
      onError('Failed to save PMO decision.')
      return false
    } finally {
      setSaving(false)
    }
  }, [gateReview, pmoNotes, overrides, readiness, allClear, onSuccess, onError])

  /** Legacy decision handler for direct usage (not via FormDialog/workflow). */
  const handleLegacyDecision = useCallback(async (decision: 'Approve' | 'Reject') => {
    if (!gateReview?.pm_projectgatereviewid) return
    setSaving(true)
    try {
      const existingNotes = gateReview.pm_reviewnotes || ''
      let newEntry = `--- PMO Readiness Task ---\nDecision: ${decision}\nDate: ${new Date().toLocaleDateString()}\n\nNotes:\n${pmoNotes || 'No additional notes.'}\n`
      
      if (Object.keys(overrides).length > 0) {
        newEntry += `\n--- Overrides Applied ---\n`
        Object.entries(overrides).forEach(([id, rationale]) => {
          const checkLabel = readiness?.items.find(i => i.id === id)?.label || id
          newEntry += `- ${checkLabel}: ${rationale}\n`
        })
      }

      const isApprovedLegacy = decision === 'Approve'

      await updateGateReview(gateReview.pm_projectgatereviewid!, {
        pm_reviewoutcome: isApprovedLegacy ? 3 : 4, // 3=In Progress, 4=Rejected
        pm_reviewnotes: existingNotes ? existingNotes + `\n\n` + newEntry : newEntry,
      } as any)

      onSuccess(`PMO Task completed. Decision: ${decision}.`)
      onClose()
    } catch (err) {
      onError('Failed to save PMO decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, pmoNotes, overrides, readiness, onSuccess, onClose, onError])

  /**
   * Handle PMO readiness submission via FormDialog/workflow path.
   * Uses a single submit button that derives the workflow decision from
   * the readiness check results: allClear → approve (0), otherwise blocked.
   */
  const handleSubmitPmoDecision = useCallback(async () => {
    if (!gateReview?.pm_projectgatereviewid || !approvalStepId) return

    // If not allClear, saveTaskData will show error and return false
    const workflowDecision = allClear ? 0 : 3

    setSaving(true)
    try {
      const taskSaved = await saveTaskData(workflowDecision)
      if (!taskSaved) {
        setSaving(false)
        return
      }

      const success = await submitWorkflowDecision(approvalStepId, workflowDecision, pmoNotes)

      if (success) {
        console.log('[PmoTask] ✅ Workflow decision submitted successfully')
        onClose()
      } else {
        onError('Workflow routing handler did not return success.')
      }
    } catch (err) {
      console.error('[PmoTask] ❌ Error submitting decision:', err)
      onError('Failed to submit PMO decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, approvalStepId, allClear, saveTaskData, pmoNotes, onClose, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'primary.contrastText', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssignmentTurnedInIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>PMO Readiness Task</Typography>
        </Box>
        <Chip label="Pending PMO Review" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container sx={{ height: '100%' }}>
            {/* Left Panel: Project Context */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Project Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{project?.pm_projectname || 'Loading...'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{project?.pm_projectcode}</Typography>
              
              {/* Show previous endorsements/notes in read-only panel */}
              {gateReview?.pm_reviewnotes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <FactCheckIcon fontSize="small" /> Previous Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                    {gateReview.pm_reviewnotes}
                  </Paper>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Target Gate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{gateReview?.pm_gatename}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Project Manager</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_projectmanagername || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_portfolioname || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Progress</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_percentcomplete || 0}% Complete</Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 4, p: 2, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.100' }}>
                <Typography variant="caption" color="primary.900" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FactCheckIcon sx={{ fontSize: 16 }} /> PMO Instructions
                </Typography>
                <Typography variant="body2" color="primary.800" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Verify the automated readiness checks. If a check has failed but the deviation is approved by the portfolio director, you may manually override it by providing a rationale.
                </Typography>
              </Box>
            </Grid>

            {/* Right Panel: Checklist & Overrides */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Automated Readiness Assessment</Typography>
              
              <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {readiness?.items.map((item) => {
                  const currentStatus = getDynamicStatus(item)
                  const isOverridden = currentStatus === 'waived'
                  
                  return (
                    <Paper key={item.id} variant="outlined" sx={{ 
                      p: 2, borderRadius: 1.5, 
                      borderColor: currentStatus === 'passed' ? 'success.light' : currentStatus === 'failed' ? 'error.light' : 'warning.light',
                      bgcolor: currentStatus === 'passed' ? 'success.50' : currentStatus === 'failed' ? 'error.50' : 'warning.50'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          {currentStatus === 'passed' && <CheckCircleIcon color="success" sx={{ mt: 0.25 }} />}
                          {currentStatus === 'failed' && <ErrorIcon color="error" sx={{ mt: 0.25 }} />}
                          {currentStatus === 'warning' && <WarningIcon color="warning" sx={{ mt: 0.25 }} />}
                          {currentStatus === 'waived' && <AssignmentTurnedInIcon color="info" sx={{ mt: 0.25 }} />}
                          
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {item.label}
                              {isOverridden && <Chip label="Overridden" size="small" color="info" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                            </Typography>
                            {!isOverridden && item.message && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{item.message}</Typography>}
                            {isOverridden && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}><strong>Rationale:</strong> {overrides[item.id]}</Typography>}
                          </Box>
                        </Box>
                        
                        <Box>
                          {item.status === 'failed' && !isOverridden && editingOverride !== item.id && (
                            <Button size="small" variant="outlined" color="inherit" onClick={() => setEditingOverride(item.id)} startIcon={<EditIcon />}>
                              Override
                            </Button>
                          )}
                          {isOverridden && (
                            <Tooltip title="Remove Override">
                              <IconButton size="small" onClick={() => handleRemoveOverride(item.id)}><UndoIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      {/* Override Input Area */}
                      {editingOverride === item.id && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <TextField 
                            fullWidth size="small" 
                            placeholder="Enter business rationale for waiving this requirement..." 
                            value={overrideText}
                            onChange={(e) => setOverrideText(e.target.value)}
                            autoFocus
                          />
                          <IconButton color="success" onClick={handleSaveOverride} disabled={!overrideText.trim()}><SaveIcon /></IconButton>
                          <IconButton onClick={() => { setEditingOverride(null); setOverrideText('') }}><CloseIcon /></IconButton>
                        </Box>
                      )}
                    </Paper>
                  )
                })}
              </List>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>PMO Review Notes</Typography>
              <TextField 
                fullWidth multiline rows={3} 
                placeholder="Enter new PMO notes or conditions for the governance board..."
                value={pmoNotes}
                onChange={(e) => setPmoNotes(e.target.value)}
                helperText={gateReview?.pm_reviewnotes ? 'Previous notes shown on left — your new notes will be appended.' : ''}
              />

            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
        {approvalStepId ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={onClose} disabled={saving}>Close</Button>
              <Button 
                variant="contained" 
                color="success" 
                disabled={loading || saving || !allClear}
                onClick={handleSubmitPmoDecision}
                sx={{ fontWeight: 600 }}
              >
                {saving ? 'Processing...' : 'Endorse & Submit'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving} sx={{ alignSelf: 'flex-start' }}>Close</Button>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button 
                variant="contained" 
                color="error" 
                disabled={loading || saving}
                onClick={() => handleLegacyDecision('Reject')}
              >
                Reject Submission
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                disabled={loading || saving || !allClear}
                onClick={() => handleLegacyDecision('Approve')}
              >
                {saving ? 'Processing...' : 'Endorse & Approve'}
              </Button>
            </Box>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
