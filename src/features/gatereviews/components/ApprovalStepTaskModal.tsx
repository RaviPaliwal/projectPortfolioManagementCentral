/**
 * ApprovalStepTaskModal Wrappers
 *
 * These components wrap the existing gate review task modals (PmoReadinessTaskModal,
 * FinancialReviewTaskModal, BoardDecisionTaskModal) to accept an approvalStepId instead
 * of a gateReviewId. They internally resolve the entityId from the approval step,
 * then render the existing modal with the resolved gateReviewId.
 *
 * This allows the FormDialog system to open these modals generically by passing
 * only the approvalStepId — the wrapper handles the rest.
 *
 * Usage in formRegistry:
 *   modalComponent: PmoReadinessTaskModalWrapper
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'
import { PmoReadinessTaskModal } from './PmoReadinessTaskModal'
import { FinancialReviewTaskModal } from './FinancialReviewTaskModal'
import { BoardDecisionTaskModal } from './BoardDecisionTaskModal'

// ─── Shared Loading/Error State ──────────────────────────────────────────

interface ApprovalStepResolverProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  children: (entityId: string) => React.ReactNode
}

function ApprovalStepResolver({ approvalStepId, onClose, onSuccess, onError, children }: ApprovalStepResolverProps) {
  const [entityId, setEntityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const id = await resolveEntityIdFromApprovalStep(approvalStepId)
      if (id) {
        setEntityId(id)
      } else {
        setError('Could not resolve target entity from approval step.')
        onError?.('Could not resolve target entity from approval step.')
      }
    } catch (err) {
      const msg = 'Failed to resolve approval step.'
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [approvalStepId, onError])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Resolving task entity...
        </Typography>
      </Box>
    )
  }

  if (error || !entityId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 1.5 }}>
          {error || 'Unable to resolve entity for this task.'}
        </Alert>
      </Box>
    )
  }

  return <>{children(entityId)}</>
}

// ─── PMO Readiness ───────────────────────────────────────────────────────

export interface PmoReadinessTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export const PmoReadinessTaskModalWrapper: React.FC<PmoReadinessTaskModalWrapperProps> = ({
  approvalStepId,
  onClose,
  onSuccess,
  onError,
}) => {
  const [open, setOpen] = useState(true)

  const handleClose = useCallback(() => {
    setOpen(false)
    setTimeout(() => onClose(), 150)
  }, [onClose])

  return (
    <ApprovalStepResolver
      approvalStepId={approvalStepId}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    >
      {(gateReviewId) => (
        <PmoReadinessTaskModal
          open={open}
          onClose={handleClose}
          gateReviewId={gateReviewId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

// ─── Financial Review ────────────────────────────────────────────────────

export interface FinancialReviewTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export const FinancialReviewTaskModalWrapper: React.FC<FinancialReviewTaskModalWrapperProps> = ({
  approvalStepId,
  onClose,
  onSuccess,
  onError,
}) => {
  const [open, setOpen] = useState(true)

  const handleClose = useCallback(() => {
    setOpen(false)
    setTimeout(() => onClose(), 150)
  }, [onClose])

  return (
    <ApprovalStepResolver
      approvalStepId={approvalStepId}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    >
      {(gateReviewId) => (
        <FinancialReviewTaskModal
          open={open}
          onClose={handleClose}
          gateReviewId={gateReviewId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

// ─── Board Decision ──────────────────────────────────────────────────────

export interface BoardDecisionTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export const BoardDecisionTaskModalWrapper: React.FC<BoardDecisionTaskModalWrapperProps> = ({
  approvalStepId,
  onClose,
  onSuccess,
  onError,
}) => {
  const [open, setOpen] = useState(true)

  const handleClose = useCallback(() => {
    setOpen(false)
    setTimeout(() => onClose(), 150)
  }, [onClose])

  return (
    <ApprovalStepResolver
      approvalStepId={approvalStepId}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    >
      {(gateReviewId) => (
        <BoardDecisionTaskModal
          open={open}
          onClose={handleClose}
          gateReviewId={gateReviewId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

export default ApprovalStepResolver
