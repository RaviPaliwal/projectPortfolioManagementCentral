/**
 * Task Resolver Service
 *
 * Resolves a workflow approval step ID to the configured form in the form registry.
 * Provides reusable utilities for opening tasks (approval steps) throughout the app.
 *
 * Flow:
 *   approvalStepId → fetch step → get template formKey → look up FormRegistryEntry → navigate
 *
 * Usage:
 *   import { resolveApprovalStepTask } from '@/services'
 *   const task = await resolveApprovalStepTask(stepId)
 *   if (task) task.navigate()
 */

import { Pm_workflowapprovalstepsService, Pm_workflowinstancesService } from '@/generated'
import type { Pm_workflowapprovalsteps } from '@/generated/models/Pm_workflowapprovalstepsModel'
import type { Pm_workflowinstances } from '@/generated/models/Pm_workflowinstancesModel'
import { fetchStepTemplateById, fetchWorkflowStepTemplates } from '@/services/workflow.service'
import { getFormByKey } from '@/constants/formRegistry'
import type { FormRegistryEntry } from '@/constants/formRegistry'
import { unwrapSingle } from '@/services/common'
import { dispatchOpenFormDialog } from '@/utils/formDialogEvents'

// ─── Types ────────────────────────────────────────────────────────────

export interface ResolvedTaskInfo {
  /** The resolved form registry entry (the form to open) */
  formEntry: FormRegistryEntry
  /** The approval step model with enriched entity context */
  step: {
    pm_workflowapprovalstepid: string
    pm_steporder?: number
    pm_approvername?: string
    pm_duedate?: string
    pm_decisionstatus?: number | string
    pm_stepname?: string
    pm_assigneedisplayname?: string
    pm_assigneetype?: number | string
  }
  /** The workflow instance GUID that this step belongs to */
  workflowInstanceId: string
  /** The business entity GUID (e.g. project ID, gate review ID) to pre-select when opening the form */
  entityId: string | null
  /** The business entity type name (e.g. 'Project', 'GateReview') */
  entityType: string | null
  /** The workflow instance display name */
  workflowName: string | null
  /** Navigate to the configured form with the entity pre-selected */
  navigate: () => void
  /** The form key resolved from the step template */
  formKey: string | null
  /** The form display name from the registry */
  formDisplayName: string | null
}

// ─── Service Functions ────────────────────────────────────────────────

/**
 * Fetch a single approval step by its ID with essential fields.
 */
export async function fetchApprovalStepById(stepId: string): Promise<Pm_workflowapprovalsteps | null> {
  try {
    const result = await Pm_workflowapprovalstepsService.get(stepId, {
      select: [
        'pm_workflowapprovalstepid',
        'pm_steporder',
        'pm_stepname',
        'pm_approvername',
        'pm_assigneedisplayname',
        'pm_assigneetype',
        'pm_decisionstatus',
        'pm_decisiondate',
        'pm_decisionnotes',
        'pm_duedate',
        'pm_isparallelstep',
        'new_formkey',
        '_pm_workflowinstancelookup_value',
        '_pm_workflowtemplate_value',
      ],
    })
    if (!result.success) {
      console.error('[TaskResolver] fetchApprovalStepById failed:', result.error)
      return null
    }
    return unwrapSingle<Pm_workflowapprovalsteps>(result)
  } catch (err) {
    console.error('[TaskResolver] fetchApprovalStepById exception:', err)
    return null
  }
}

/**
 * Resolve a workflow approval step ID to its configured form and navigation info.
 *
 * This is the main entry point — given any approval step ID, it:
 * 1. Fetches the step to get its workflow instance + template references
 * 2. Fetches the workflow instance to get the business entity ID/type
 * 3. Fetches the step template to get the new_formkey
 * 4. Looks up the form registry entry
 * 5. Returns all the resolved information including a navigate() shortcut
 */
export async function resolveApprovalStepTask(stepId: string): Promise<ResolvedTaskInfo | null> {
  try {
    // Step 1: Fetch the approval step
    const step = await fetchApprovalStepById(stepId)
    if (!step) return null
    if (!step._pm_workflowinstancelookup_value) return null

    const workflowInstanceId = step._pm_workflowinstancelookup_value

    // Step 2: Fetch the workflow instance to get business entity context
    let entityId: string | null = null
    let entityType: string | null = null
    let workflowName: string | null = null

    try {
      const instanceResult = await Pm_workflowinstancesService.get(workflowInstanceId, {
        select: [
          'pm_workflowinstanceid',
          'pm_instancename',
          'pm_entityid',
          'pm_entitytype',
          'pm_entityname',
          '_pm_workflowlookup_value',
        ],
      })
      if (!instanceResult.success) {
        console.error('[TaskResolver] resolveApprovalStepTask - fetch workflow instance failed:', instanceResult.error)
      } else {
        const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
        if (instance) {
          entityId = instance.pm_entityid || null
          entityType = instance.pm_entitytype || null
          workflowName = instance.pm_instancename ||
            (instance as unknown as Record<string, unknown>).pm_workflowlookupname as string ||
            null
        }
      }
    } catch (err) {
      console.error('[TaskResolver] resolveApprovalStepTask - fetch workflow instance exception:', err)
    }

    // Step 3: Resolve formKey — try step's own new_formkey first, then fall back to template
    let formKey: string | null = null
    let formEntry: FormRegistryEntry | null = null

    // Primary source: new_formkey on the approval step itself
    if (step.new_formkey) {
      formKey = step.new_formkey
    }
    // Fallback: fetch from the step template (by matching workflow ID and step name)
    else if (step._pm_workflowtemplate_value && step.pm_stepname) {
      try {
        const templates = await fetchWorkflowStepTemplates(step._pm_workflowtemplate_value)
        const template = templates.find((t) => t.pm_workflowname === step.pm_stepname)
        if (template) {
          // Task Type 2 = Checklist
          if (String(template.pm_tasktype) === '2') {
            formKey = 'CHECKLIST_APPROVAL_TASK'
          } else if (template.new_formkey) {
            formKey = template.new_formkey
          }
        } else {
           console.warn(`[TaskResolver] Step Template for ${step.pm_stepname} not found`)
        }
      } catch (err) {
        console.error('[TaskResolver] resolveApprovalStepTask - fetch step template exception:', err)
      }
    }

    // Step 4: Look up the form registry entry
    if (formKey) {
      formEntry = getFormByKey(formKey) ?? null
    }

    // If no formEntry found, return null — no form to navigate to
    if (!formEntry) return null

    // Build the navigate function — dispatches the form dialog (task modals)
    const navigate = () => {
      dispatchOpenFormDialog({
        formDisplayName: formEntry!.displayName,
        formDescription: formEntry!.description,
        moduleName: formEntry!.moduleName,
        formKey: formEntry!.key,
        entityId,
        entityType,
        workflowName,
        approvalStepId: stepId,
        stepOrder: undefined,
        navigate: () => { }, // No-op — modalComponent handles the UI
      })
    }

    return {
      formEntry,
      step: {
        pm_workflowapprovalstepid: step.pm_workflowapprovalstepid!,
        pm_steporder: step.pm_steporder,
        pm_approvername: step.pm_approvername || step.pm_assigneedisplayname,
        pm_duedate: step.pm_duedate,
        pm_decisionstatus: step.pm_decisionstatus,
        pm_stepname: step.pm_stepname,
        pm_assigneedisplayname: step.pm_assigneedisplayname,
        pm_assigneetype: step.pm_assigneetype,
      },
      workflowInstanceId,
      entityId,
      entityType,
      workflowName,
      navigate,
      formKey,
      formDisplayName: formEntry.displayName,
    }
  } catch (err) {
    console.error('[TaskResolver] resolveApprovalStepTask FAILED with exception:', err)
    return null
  }
}

/**
 * Utility: resolve a business entity ID from an approval step.
 *
 * For task modals that need the target entity (e.g. gateReviewId), this utility
 * resolves: approvalStepId → fetch step → get workflow instance → return pm_entityid.
 *
 * Returns null if any step in the resolution fails.
 */
export async function resolveEntityIdFromApprovalStep(stepId: string): Promise<string | null> {
  try {
    const step = await fetchApprovalStepById(stepId)
    if (!step?._pm_workflowinstancelookup_value) {
      return null
    }

    const instanceResult = await Pm_workflowinstancesService.get(step._pm_workflowinstancelookup_value, {
      select: ['pm_workflowinstanceid', 'pm_entityid', 'pm_entitytype', 'pm_entityname', 'pm_instancename'],
    })
    if (!instanceResult.success) {
      console.error('[TaskResolver] resolveEntityIdFromApprovalStep failed to get instance:', instanceResult.error)
      return null
    }
    const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
    const result = instance?.pm_entityid ?? null
    return result
  } catch (err) {
    console.error('[TaskResolver] resolveEntityIdFromApprovalStep exception:', err)
    return null
  }
}

export interface EntityInfo {
  entityId: string | null
  entityType: string | undefined
  entityName: string | undefined
}

export async function resolveEntityInfoFromApprovalStep(stepId: string): Promise<EntityInfo> {
  try {
    const step = await fetchApprovalStepById(stepId)

    if (!step?._pm_workflowinstancelookup_value) {
      return { entityId: null, entityType: undefined, entityName: undefined }
    }

    const instanceResult = await Pm_workflowinstancesService.get(step._pm_workflowinstancelookup_value, {
      select: ['pm_workflowinstanceid', 'pm_entityid', 'pm_entitytype', 'pm_entityname', 'pm_instancename'],
    })
    if (!instanceResult.success) {
      console.error('[TaskResolver] resolveEntityInfoFromApprovalStep failed to get instance:', instanceResult.error)
      return { entityId: null, entityType: undefined, entityName: undefined }
    }
    const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)

    const result: EntityInfo = {
      entityId: instance?.pm_entityid ?? null,
      entityType: instance?.pm_entitytype,
      entityName: instance?.pm_entityname,
    }
    return result
  } catch (err) {
    console.error('[resolveEntityInfoFromApprovalStep] ❌ Exception:', err)
    return { entityId: null, entityType: undefined, entityName: undefined }
  }
}

/**
 * Convenience function: resolve a workflow approval step and open its configured
 * form in a popup/dialog instead of navigating the full page.
 *
 * Dispatches a form:open-dialog event that the FormDialog component picks up
 * and renders in a MUI Dialog. The user can then click "Open Form" to navigate.
 * Returns true if the dialog was triggered.
 */
export async function openApprovalStepTask(stepId: string): Promise<boolean> {
  try {
    const task = await resolveApprovalStepTask(stepId)
    if (task) {
      dispatchOpenFormDialog({
        formDisplayName: task.formDisplayName,
        formDescription: task.formEntry?.description,
        moduleName: task.formEntry?.moduleName,
        formKey: task.formKey || undefined,
        entityId: task.entityId,
        entityType: task.entityType,
        workflowName: task.workflowName,
        stepOrder: task.step.pm_steporder,
        approvalStepId: stepId,
        navigate: task.navigate,
      })
      return true
    }
    return false
  } catch (err) {
    console.error('[TaskResolver] openApprovalStepTask exception:', err)
    return false
  }
}

