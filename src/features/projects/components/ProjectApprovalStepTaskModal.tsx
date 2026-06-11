import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { ProjectCreationTaskModal } from './ProjectCreationTaskModal'
import { MilestoneDefinitionTaskModal } from './MilestoneDefinitionTaskModal'
import { TeamAssemblyTaskModal } from './TeamAssemblyTaskModal'
import { ResourceBudgetPlanningTaskModal } from './ResourceBudgetPlanningTaskModal'
import { RiskIssueSetupTaskModal } from './RiskIssueSetupTaskModal'

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
      else { setError('Could not resolve project from approval step.'); onError?.('Could not resolve project from approval step.') }
    } catch (err) { const msg = 'Failed to resolve approval step.'; setError(msg); onError?.(msg)
    } finally { setLoading(false) }
  }, [approvalStepId, onError])

  useEffect(() => { load() }, [load])

  if (loading) { return (<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={32} /><Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Resolving project...</Typography></Box>) }
  if (error || !entityId) { return (<Box sx={{ p: 3 }}><Alert severity="error" sx={{ borderRadius: 1.5 }}>{error || 'Unable to resolve project for this task.'}</Alert></Box>) }
  return <>{children(entityId)}</>
}

export interface ProjectCreationTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const ProjectCreationTaskModalWrapper: React.FC<ProjectCreationTaskModalWrapperProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(projectId) => (
        <ProjectCreationTaskModal
          open={open}
          onClose={handleClose}
          projectId={projectId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

// ——— Milestone Definition ————————————————————————————————————————

export interface MilestoneDefinitionTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const MilestoneDefinitionTaskModalWrapper: React.FC<MilestoneDefinitionTaskModalWrapperProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(projectId) => (
        <MilestoneDefinitionTaskModal
          open={open}
          onClose={handleClose}
          projectId={projectId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

// ——— Team Assembly ———————————————————————————————————————————————

export interface TeamAssemblyTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const TeamAssemblyTaskModalWrapper: React.FC<TeamAssemblyTaskModalWrapperProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(projectId) => (
        <TeamAssemblyTaskModal
          open={open}
          onClose={handleClose}
          projectId={projectId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

// ——— Resource & Budget Planning ——————————————————————————————————

export interface ResourceBudgetPlanningTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const ResourceBudgetPlanningTaskModalWrapper: React.FC<ResourceBudgetPlanningTaskModalWrapperProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(projectId) => (
        <ResourceBudgetPlanningTaskModal
          open={open}
          onClose={handleClose}
          projectId={projectId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}

// ——— Risk & Issue Register Setup —————————————————————————

export interface RiskIssueSetupTaskModalWrapperProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const RiskIssueSetupTaskModalWrapper: React.FC<RiskIssueSetupTaskModalWrapperProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = useCallback(() => { setOpen(false); setTimeout(() => onClose(), 150) }, [onClose])
  return (
    <ApprovalStepResolver approvalStepId={approvalStepId} onClose={onClose} onSuccess={onSuccess} onError={onError}>
      {(projectId) => (
        <RiskIssueSetupTaskModal
          open={open}
          onClose={handleClose}
          projectId={projectId}
          onSuccess={onSuccess || (() => {})}
          onError={onError || (() => {})}
          DecisionBox={DecisionBox}
          approvalStepId={approvalStepId}
        />
      )}
    </ApprovalStepResolver>
  )
}
