/**
 * DecisionBox Component
 *
 * A generic decision-making UI for workflow approval steps.
 * Renders a decision notes text field + Approve (0) and Reject (3) buttons.
 *
 * When a decision button is clicked:
 * 1. Calls onBeforeDecision(decision) — the parent can save task-specific data here
 * 2. Calls submitWorkflowDecision(approvalStepId, decision, notes) — updates step status + triggers workflow router
 * 3. Calls onDecisionComplete or onDecisionError
 *
 * Usage in a task modal:
 *   <DecisionBox
 *     approvalStepId={stepId}
 *     onBeforeDecision={async (decision) => { await saveMyTaskData() }}
 *     onDecisionComplete={() => onClose()}
 *     onDecisionError={(msg) => onError(msg)}
 *   />
 */

import { useState, useCallback } from 'react'
import { Box, TextField, Button, CircularProgress } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { submitWorkflowDecision } from '@/services/workflow.service'

// ─── Props ──────────────────────────────────────────────────────────────

export interface DecisionBoxProps {
  /** The workflow approval step ID to submit the decision for */
  approvalStepId: string
  /** Called BEFORE the workflow decision is submitted. Return false to cancel. */
  onBeforeDecision?: (decision: number) => Promise<boolean | void> | boolean | void
  /** Called after the workflow decision is successfully submitted */
  onDecisionComplete?: (decision: number) => void
  /** Called if the workflow decision submission fails */
  onDecisionError?: (message: string) => void
  /** Disable the buttons (e.g. while saving task data) */
  disabled?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────

export const DecisionBox: React.FC<DecisionBoxProps> = ({
  approvalStepId,
  onBeforeDecision,
  onDecisionComplete,
  onDecisionError,
  disabled = false,
}) => {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const handleDecision = useCallback(async (decision: number) => {
    console.log('[DecisionBox] 🖱️ handleDecision called with decision:', decision, '| approvalStepId:', approvalStepId)
    setSubmitting(true)
    setLastError(null)

    try {
      // Step 1: Allow the parent (task modal) to save its data first
      if (onBeforeDecision) {
        console.log('[DecisionBox] ⏳ Calling onBeforeDecision...')
        const shouldContinue = await onBeforeDecision(decision)
        console.log('[DecisionBox] ✅ onBeforeDecision returned:', shouldContinue)
        if (shouldContinue === false) {
          console.warn('[DecisionBox] ⛔ onBeforeDecision returned false — cancelling workflow submission')
          setSubmitting(false)
          return // Parent cancelled the decision
        }
      }

      // Step 2: Submit the workflow decision (updates step status + triggers routing handler)
      console.log('[DecisionBox] 🚀 Calling submitWorkflowDecision...')
      const success = await submitWorkflowDecision(approvalStepId, decision, notes)
      console.log('[DecisionBox] ✅ submitWorkflowDecision result:', success)
      if (success) {
        onDecisionComplete?.(decision)
      } else {
        const msg = 'Workflow routing handler did not return success.'
        setLastError(msg)
        onDecisionError?.(msg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit workflow decision.'
      console.error('[DecisionBox] ❌ Error:', msg, err)
      setLastError(msg)
      onDecisionError?.(msg)
    } finally {
      setSubmitting(false)
    }
  }, [approvalStepId, notes, onBeforeDecision, onDecisionComplete, onDecisionError])

  const isLoading = submitting

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {lastError && (
        <Box sx={{ color: 'error.main', fontSize: '0.8rem', bgcolor: 'error.50', p: 1.5, borderRadius: 1 }}>
          {lastError}
        </Box>
      )}

      <TextField
        label="Decision Notes"
        placeholder="Enter rationale for this decision..."
        multiline
        rows={2}
        size="small"
        fullWidth
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={isLoading || disabled}
        slotProps={{
          input: { sx: { borderRadius: 1.5 } },
          inputLabel: { shrink: true },
        }}
      />

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="error"
          disabled={isLoading || disabled}
          onClick={() => handleDecision(3)}
          startIcon={isLoading ? <CircularProgress size={16} /> : <CancelIcon />}
          sx={{ fontWeight: 600, minWidth: 140 }}
        >
          {isLoading ? 'Processing...' : 'Reject'}
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={isLoading || disabled}
          onClick={() => handleDecision(0)}
          startIcon={isLoading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          sx={{ fontWeight: 600, minWidth: 140 }}
        >
          {isLoading ? 'Processing...' : 'Approve'}
        </Button>
      </Box>
    </Box>
  )
}

export default DecisionBox
