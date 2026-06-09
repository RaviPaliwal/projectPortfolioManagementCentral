import { lazy } from 'react'
import type { ComponentType } from 'react'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

// Lazy-load modal components to avoid circular dependencies
const PmoReadinessTaskModalWrapper = lazy(() =>
  import('@/features/gatereviews/components').then((m) => ({ default: m.PmoReadinessTaskModalWrapper }))
)
const FinancialReviewTaskModalWrapper = lazy(() =>
  import('@/features/gatereviews/components').then((m) => ({ default: m.FinancialReviewTaskModalWrapper }))
)
const BoardDecisionTaskModalWrapper = lazy(() =>
  import('@/features/gatereviews/components').then((m) => ({ default: m.BoardDecisionTaskModalWrapper }))
)

/**
 * Registry of task forms that can be opened from workflow approval steps.
 *
 * Each entry defines a form key (stored on step templates as new_formkey)
 * and a modal component that renders the task UI when triggered from a step.
 *
 * To add a new task type:
 * 1. Create a modal component accepting { approvalStepId, onClose }
 * 2. Register it here with the formKey you'll set on step templates
 */

export interface FormRegistryEntry {
  /** Unique identifier for this form (e.g. "pmo_readiness", "project_task") */
  key: string
  /** The module/category this form belongs to (e.g. "Gate Reviews", "Projects") */
  moduleName: string
  /** Human-readable display name shown in step config */
  displayName: string
  /** Short description of what this task does */
  description?: string
  /**
   * Modal component that renders this task/decision form in a dialog.
   * Receives the approvalStepId so it can internally resolve the target entity.
   */
  /**
   * Modal component that renders this task/decision form in a dialog.
   * Receives the approvalStepId, close/success/error callbacks, and the
   * DecisionBox component to render in the footer.
   */
  modalComponent: ComponentType<{
    approvalStepId: string
    onClose: () => void
    onSuccess?: (msg: string) => void
    onError?: (msg: string) => void
    /**
     * Generic DecisionBox component pre-configured with approvalStepId.
     * Each task modal renders this in its footer to capture decision notes
     * and submit the workflow decision (approve/reject).
     */
    DecisionBox: ComponentType<DecisionBoxProps>
  }>
}

export const FORM_REGISTRY: FormRegistryEntry[] = [
  {
    key: 'pmo_readiness',
    moduleName: MODULE_NAMES.GATE_REVIEWS.label,
    displayName: 'PMO Readiness Task',
    description: 'Automated readiness assessment with override capability for PMO review',
    modalComponent: PmoReadinessTaskModalWrapper,
  },
  {
    key: 'financial_review',
    moduleName: MODULE_NAMES.GATE_REVIEWS.label,
    displayName: 'Financial Review Task',
    description: 'Financial health assessment and endorsement for gate progression',
    modalComponent: FinancialReviewTaskModalWrapper,
  },
  {
    key: 'board_decision',
    moduleName: MODULE_NAMES.GATE_REVIEWS.label,
    displayName: 'Governance Board Decision',
    description: 'Final board decision recording with outcome, conditions, and endorsement history',
    modalComponent: BoardDecisionTaskModalWrapper,
  },
]

/**
 * Look up a form registry entry by its key.
 * Returns undefined if not found.
 */
export function getFormByKey(key: string): FormRegistryEntry | undefined {
  return FORM_REGISTRY.find((entry) => entry.key === key)
}


