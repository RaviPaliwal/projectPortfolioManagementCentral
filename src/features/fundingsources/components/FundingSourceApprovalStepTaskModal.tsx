import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { FundingSourceApprovalTaskModal } from './FundingSourceApprovalTaskModal'

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
    setLoading(true); setError(null)
    try {
      const id = await resolveEntityIdFromApprovalStep(approvalStepId)
      if (id) { setEntityId(id) }
      else { setError('Could not resolve funding source from approval step.'); onError?.('Could not resolve funding source from approval step.') }
    } catch (err) { const msg = 'Failed to resolve approval step.'; setError(msg); onError?.(msg)
    } finally { setLoading(false) }
  }, [approvalStepId, onError])

  useEffect(() => { load() }, [load])

  if (loading) { return (<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={32} /><Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Resolving funding source...</Typography></Box>) }
  if (error || !entityId) { return (<Box sx={{ p: 3 }}><Alert severity="error" sx={{ borderRadius: 1.5 }}>{error || 'Unable to resolve funding source for this task.'}</Alert></Box>) }
  return <>{children(entityId)}</>
}

export interface FundingSourceApprovalTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const FundingSourceApprovalTaskModalWrapper: React.FC<FundingSourceApprovalTaskModalWrapperProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(fundingSourceId) => (
        <FundingSourceApprovalTaskModal
          open={open}
          onClose={handleClose}
          fundingSourceId={fundingSourceId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}
