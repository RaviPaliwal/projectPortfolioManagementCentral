/**
 * Form Dialog Events
 *
 * Event-based mechanism to open forms in a popup/dialog from anywhere in the app.
 * Service functions dispatch events, and the FormDialog component listens and renders.
 *
 * Usage:
 *   import { dispatchOpenFormDialog } from '@/utils/formDialogEvents'
 *   dispatchOpenFormDialog({ formDisplayName: 'PMO Readiness', entityId: '...', navigate: () => {...} })
 */

// ─── Event Types ──────────────────────────────────────────────────────

export interface FormDialogDetail {
  /** Display name of the form to open */
  formDisplayName: string | null
  /** Form description */
  formDescription?: string | null
  /** Module name this form belongs to */
  moduleName?: string | null
  /** Form key from the registry */
  formKey?: string | null
  /** The approval step ID that triggered this dialog — passed to modal components */
  approvalStepId?: string
  /** Business entity ID to pre-select */
  entityId?: string | null
  /** Business entity type name */
  entityType?: string | null
  /** Workflow instance name */
  workflowName?: string | null
  /** Step order number */
  stepOrder?: number | null
  /** Function to call when user clicks Open Form / Navigate */
  navigate: () => void
  /** Whether navigation was successful (set by listener) */
  navigationTriggered?: boolean
}

export const FORM_DIALOG_OPEN_EVENT = 'form:open-dialog'
export const FORM_DIALOG_DECISION_EVENT = 'form:decision-complete'

/**
 * Dispatch an event to open a form in a dialog popup.
 */
export function dispatchOpenFormDialog(detail: FormDialogDetail): void {
  const event = new CustomEvent<FormDialogDetail>(FORM_DIALOG_OPEN_EVENT, {
    detail,
    bubbles: false,
    cancelable: false,
  })
  window.dispatchEvent(event)
}

export interface FormDialogDecisionDetail {
  formKey: string | null | undefined
  approvalStepId?: string
  decision: number
}

export function dispatchFormDialogDecision(detail: FormDialogDecisionDetail): void {
  const event = new CustomEvent<FormDialogDecisionDetail>(FORM_DIALOG_DECISION_EVENT, {
    detail,
    bubbles: false,
    cancelable: false,
  })
  window.dispatchEvent(event)
}

/**
 * Subscribe to form-dialog-open events.
 * Returns an unsubscribe function.
 */
export function onOpenFormDialog(
  handler: (detail: FormDialogDetail) => void
): () => void {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<FormDialogDetail>
    handler(customEvent.detail)
  }
  window.addEventListener(FORM_DIALOG_OPEN_EVENT, listener)
  return () => window.removeEventListener(FORM_DIALOG_OPEN_EVENT, listener)
}
