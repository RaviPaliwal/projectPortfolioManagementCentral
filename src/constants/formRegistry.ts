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
const PipelineReviewTaskModalWrapper = lazy(() =>
  import('@/features/pipeline/components').then((m) => ({ default: m.PipelineReviewTaskModalWrapper }))
)
const PipelineDecisionTaskModalWrapper = lazy(() =>
  import('@/features/pipeline/components').then((m) => ({ default: m.PipelineDecisionTaskModalWrapper }))
)
const ProjectCreationTaskModalWrapper = lazy(() =>
  import('@/features/projects/components').then((m) => ({ default: m.ProjectCreationTaskModalWrapper }))
)
const MilestoneDefinitionTaskModalWrapper = lazy(() =>
  import('@/features/projects/components').then((m) => ({ default: m.MilestoneDefinitionTaskModalWrapper }))
)
const TeamAssemblyTaskModalWrapper = lazy(() =>
  import('@/features/projects/components').then((m) => ({ default: m.TeamAssemblyTaskModalWrapper }))
)
const ResourceBudgetPlanningTaskModalWrapper = lazy(() =>
  import('@/features/projects/components').then((m) => ({ default: m.ResourceBudgetPlanningTaskModalWrapper }))
)
const RiskIssueSetupTaskModalWrapper = lazy(() =>
  import('@/features/projects/components').then((m) => ({ default: m.RiskIssueSetupTaskModalWrapper }))
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
  {
    key: 'pipeline_review',
    moduleName: MODULE_NAMES.PIPELINE.label,
    displayName: 'Pipeline Review Task',
    description: 'Review initiative alignment, feasibility, and readiness for pipeline progression',
    modalComponent: PipelineReviewTaskModalWrapper,
  },
  {
    key: 'pipeline_decision',
    moduleName: MODULE_NAMES.PIPELINE.label,
    displayName: 'Pipeline Decision',
    description: 'Final decision on pipeline initiative — approve, defer, or reject',
    modalComponent: PipelineDecisionTaskModalWrapper,
  },
  {
    key: 'project_creation',
    moduleName: MODULE_NAMES.PROJECTS.label,
    displayName: 'Project Creation Review',
    description: 'Review newly created project details — assess scope, budget, timeline, and governance before approving for execution',
    modalComponent: ProjectCreationTaskModalWrapper,
  },
  {
    key: 'milestone_definition',
    moduleName: MODULE_NAMES.PROJECTS.label,
    displayName: 'Milestone Definition',
    description: 'Define project milestones, key dates, and deliverables for the project lifecycle',
    modalComponent: MilestoneDefinitionTaskModalWrapper,
  },
  {
    key: 'team_assembly',
    moduleName: MODULE_NAMES.PROJECTS.label,
    displayName: 'Team Assembly',
    description: 'Assign project team members with defined roles and responsibilities',
    modalComponent: TeamAssemblyTaskModalWrapper,
  },
  {
    key: 'resource_budget_planning',
    moduleName: MODULE_NAMES.PROJECTS.label,
    displayName: 'Resource & Budget Planning',
    description: 'Review resource allocation and budget requirements for project execution',
    modalComponent: ResourceBudgetPlanningTaskModalWrapper,
  },
  {
    key: 'risk_issue_setup',
    moduleName: MODULE_NAMES.PROJECTS.label,
    displayName: 'Risk & Issue Register Setup',
    description: 'Initialize the risk register and issue tracker for ongoing project monitoring',
    modalComponent: RiskIssueSetupTaskModalWrapper,
  },
]

/**
 * Look up a form registry entry by its key.
 * Returns undefined if not found.
 */
export function getFormByKey(key: string): FormRegistryEntry | undefined {
  return FORM_REGISTRY.find((entry) => entry.key === key)
}


