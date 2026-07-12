import { lazy } from 'react'
import type { ComponentType } from 'react'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

// Lazy-load modal components to avoid circular dependencies
const PortfolioApprovalTaskModalWrapper = lazy(() =>
  import('@/features/portfolios/components').then((m) => ({ default: m.PortfolioApprovalTaskModalWrapper }))
)
const PortfolioFinanceTaskModalWrapper = lazy(() =>
  import('@/features/portfolios/components').then((m) => ({ default: m.PortfolioFinanceTaskModalWrapper }))
)
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
const TimesheetApprovalTaskModalWrapper = lazy(() =>
  import('@/features/timesheets/components').then((m) => ({ default: m.TimesheetApprovalTaskModalWrapper }))
)
const ResourceAllocationApprovalTaskModalWrapper = lazy(() =>
  import('@/features/resources/components').then((m) => ({ default: m.ResourceAllocationApprovalTaskModalWrapper }))
)
const BudgetLineApprovalTaskModalWrapper = lazy(() =>
  import('@/features/budgets/components').then((m) => ({ default: m.BudgetLineApprovalTaskModalWrapper }))
)
const FundingSourceApprovalTaskModalWrapper = lazy(() =>
  import('@/features/fundingsources/components').then((m) => ({ default: m.FundingSourceApprovalTaskModalWrapper }))
)
const ChangeRequestApprovalTaskModalWrapper = lazy(() =>
  import('@/features/changerequests/components').then((m) => ({ default: m.ChangeRequestApprovalTaskModalWrapper }))
)
const ChangeRequestImpactAssessmentTaskModalWrapper = lazy(() =>
  import('@/features/changerequests/components').then((m) => ({ default: m.ChangeRequestImpactAssessmentTaskModalWrapper }))
)
const ProgrammeApprovalTaskModalWrapper = lazy(() =>
  import('@/features/programmes/components').then((m) => ({ default: m.ProgrammeApprovalTaskModalWrapper }))
)
const ProgrammeFinanceTaskModalWrapper = lazy(() =>
  import('@/features/programmes/components').then((m) => ({ default: m.ProgrammeFinanceTaskModalWrapper }))
)
const ChecklistTaskModal = lazy(() =>
  import('@/features/dashboard/components').then((m) => ({ default: m.ChecklistTaskModal }))
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
    /** The pre-resolved business entity GUID (e.g. initiative ID, timesheet ID) */
    entityId?: string | null
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
    displayName: 'Budget Planning',
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
  {
    key: 'timesheet_approval',
    moduleName: MODULE_NAMES.TIMESHEETS.label,
    displayName: 'Timesheet Approval',
    description: 'Review submitted timesheet entries — verify hours, chargeability, and project assignments before approving or rejecting',
    modalComponent: TimesheetApprovalTaskModalWrapper,
  },
  {
    key: 'resource_allocation',
    moduleName: MODULE_NAMES.RESOURCES.label,
    displayName: 'Resource Allocation Approval',
    description: 'Review resource allocation details — verify allocated hours, role, and project alignment before approving or rejecting',
    modalComponent: ResourceAllocationApprovalTaskModalWrapper,
  },
  {
    key: 'budget_approval',
    moduleName: MODULE_NAMES.BUDGETS.label,
    displayName: 'Budget Line Approval',
    description: 'Review budget line details — verify approved amounts, actual spend, committed spend, and variance before approving or rejecting',
    modalComponent: BudgetLineApprovalTaskModalWrapper,
  },
  {
    key: 'funding_source_approval',
    moduleName: MODULE_NAMES.FUNDING_SOURCES.label,
    displayName: 'Funding Source Approval',
    description: 'Review funding source details — verify type, allocation amounts, utilization, and effective dates before approving or rejecting',
    modalComponent: FundingSourceApprovalTaskModalWrapper,
  },
  {
    key: 'change_request_approval',
    moduleName: MODULE_NAMES.CHANGE_REQUESTS.label,
    displayName: 'Change Request Approval',
    description: 'Review change request details — verify cost/schedule impacts, justification, and linked project data before approving or rejecting. On approval, dynamically updates project budget and schedule.',
    modalComponent: ChangeRequestApprovalTaskModalWrapper,
  },
  {
    key: 'change_request_impact_assessment',
    moduleName: MODULE_NAMES.CHANGE_REQUESTS.label,
    displayName: 'Change Request Impact Assessment',
    description: 'Conduct impact assessment on the change request across Schedule, Cost, Quality, and Benefits categories before submitting for approval.',
    modalComponent: ChangeRequestImpactAssessmentTaskModalWrapper,
  },
  {
    key: 'portfolio_approval',
    moduleName: MODULE_NAMES.PORTFOLIOS.label,
    displayName: 'Portfolio Approval',
    description: 'Approve or reject a newly created portfolio — set status to Active or Rejected',
    modalComponent: PortfolioApprovalTaskModalWrapper,
  },
  {
    key: 'portfolio_finance_decision',
    moduleName: MODULE_NAMES.PORTFOLIOS.label,
    displayName: 'Portfolio Finance Decision',
    description: 'Review portfolio budget details — verify estimated cost from the source pipeline initiative, and decide the final approved budget for this portfolio.',
    modalComponent: PortfolioFinanceTaskModalWrapper,
  },
  {
    key: 'programme_approval',
    moduleName: 'Programmes',
    displayName: 'Programme Approval',
    description: 'Review and approve programme creation or stage transition.',
    modalComponent: ProgrammeApprovalTaskModalWrapper,
  },
  {
    key: 'programme_finance_decision',
    moduleName: 'Programmes',
    displayName: 'Programme Finance Decision',
    description: 'Review programme budget details — verify budget/cost from parent portfolio, and decide the final approved budget for this programme.',
    modalComponent: ProgrammeFinanceTaskModalWrapper,
  },
  {
    key: 'CHECKLIST_APPROVAL_TASK',
    moduleName: 'System',
    displayName: 'Checklist Task',
    description: 'Dynamic checklist approval task based on step template configuration',
    modalComponent: ChecklistTaskModal,
  },
]

/**
 * Look up a form registry entry by its key.
 * Returns undefined if not found.
 */
export function getFormByKey(key: string): FormRegistryEntry | undefined {
  return FORM_REGISTRY.find((entry) => entry.key === key)
}


