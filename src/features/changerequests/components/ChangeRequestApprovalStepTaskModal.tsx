import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { ChangeRequestApprovalTaskModal } from './ChangeRequestApprovalTaskModal'

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

  const resolve = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const id = await resolveEntityIdFromApprovalStep(approvalStepId)
      if (!id) {
        const msg = 'Unable to resolve the entity for this approval step.'
        setError(msg)
        onError?.(msg)
      } else {
        setEntityId(id)
      }
    } catch (err) {
      const msg = 'Failed to resolve approval step: ' + (err instanceof Error ? err.message : 'unknown error')
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [approvalStepId, onError])

  useEffect(() => { resolve() }, [resolve])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}><CircularProgress /></Box>
  }

  if (error || !entityId) {
    return <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error">{error || 'Unable to resolve entity ID.'}</Typography></Box>
  }

  return <>{children(entityId)}</>
}

export interface ChangeRequestApprovalStepTaskModalProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const ChangeRequestApprovalStepTaskModal: React.FC<ChangeRequestApprovalStepTaskModalProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  return (
    <ApprovalStepResolver
      approvalStepId={approvalStepId}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    >
      {(entityId) => (
        <ChangeRequestApprovalTaskModal
          open={true}
          onClose={onClose}
          changeRequestId={entityId}
          onSuccess={onSuccess || ((msg: string) => {})}
          onError={onError || ((msg: string) => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

export const ChangeRequestApprovalTaskModalWrapper: React.FC<{
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}> = (props) => {
  return <ChangeRequestApprovalStepTaskModal {...props} />
}
