import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { PipelineReviewTaskModal } from './PipelineReviewTaskModal'
import { PipelineDecisionTaskModal } from './PipelineDecisionTaskModal'

interface ApprovalStepResolverProps {
  approvalStepId: string
  /** Pre-resolved entity ID (initiative GUID) — if provided, skips re-resolution */
  entityId?: string | null
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  children: (entityId: string) => React.ReactNode
}

function ApprovalStepResolver({ approvalStepId, entityId: preResolvedEntityId, onClose, onSuccess, onError, children }: ApprovalStepResolverProps) {
  const [entityId, setEntityId] = useState<string | null>(() => preResolvedEntityId ?? null)
  const [loading, setLoading] = useState(!preResolvedEntityId)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (preResolvedEntityId) {
      return
    }
    setLoading(true); setError(null)
    try {
      const id = await resolveEntityIdFromApprovalStep(approvalStepId)
      if (id) { setEntityId(id) }
      else { setError('Could not resolve initiative from approval step.'); onError?.('Could not resolve initiative from approval step.') }
    } catch (err) { const msg = 'Failed to resolve approval step.'; setError(msg); onError?.(msg)
    } finally { setLoading(false) }
  }, [approvalStepId, preResolvedEntityId, onError])

  useEffect(() => {
    load()
  }, [load])

  if (loading) { return (<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={32} /><Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Resolving initiative...</Typography></Box>) }
  if (error || !entityId) { return (<Box sx={{ p: 3 }}><Alert severity="error">{error || 'Unable to resolve initiative for this task.'}</Alert></Box>) }
  return <>{children(entityId)}</>
}

export interface PipelineReviewTaskModalWrapperProps {
  approvalStepId: string
  /** Pre-resolved initiative GUID — skips re-resolution if provided */
  entityId?: string | null
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const PipelineReviewTaskModalWrapper: React.FC<PipelineReviewTaskModalWrapperProps> = ({
  approvalStepId, entityId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} entityId={entityId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(initiativeId) => (
        <PipelineReviewTaskModal
          open={open}
          onClose={handleClose}
          initiativeId={initiativeId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

export interface PipelineDecisionTaskModalWrapperProps {
  approvalStepId: string
  /** Pre-resolved initiative GUID — skips re-resolution if provided */
  entityId?: string | null
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const PipelineDecisionTaskModalWrapper: React.FC<PipelineDecisionTaskModalWrapperProps> = ({
  approvalStepId, entityId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} entityId={entityId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(initiativeId) => (
        <PipelineDecisionTaskModal
          open={open}
          onClose={handleClose}
          initiativeId={initiativeId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}