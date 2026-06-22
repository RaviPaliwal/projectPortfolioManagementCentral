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
import { fetchStepTemplateById } from '@/services/workflow.service'
import { getFormByKey, FORM_REGISTRY } from '@/constants/formRegistry'
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
    console.debug('[TaskResolver] fetchApprovalStepById — stepId:', stepId)
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
    console.debug('[TaskResolver] fetchApprovalStepById — raw result:', result)
    const unwrapped = unwrapSingle<Pm_workflowapprovalsteps>(result)
    console.debug('[TaskResolver] fetchApprovalStepById — unwrapped:', unwrapped)
    return unwrapped
  } catch (err) {
    console.error('[TaskResolver] fetchApprovalStepById failed:', err)
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
  console.debug('[TaskResolver] ===== resolveApprovalStepTask START ===== stepId:', stepId)

  try {
    // Step 1: Fetch the approval step
    console.debug('[TaskResolver] Step 1: Fetching approval step...')
    const step = await fetchApprovalStepById(stepId)
    if (!step) {
      console.warn('[TaskResolver] ⛔ Step 1 FAILED — step not found for ID:', stepId)
      return null
    }
    if (!step._pm_workflowinstancelookup_value) {
      console.warn('[TaskResolver] ⛔ Step 1 FAILED — step has no _pm_workflowinstancelookup_value:', step)
      return null
    }
    console.debug('[TaskResolver] ✅ Step 1 OK — step ID:', step.pm_workflowapprovalstepid,
      '| instance lookup:', step._pm_workflowinstancelookup_value,
      '| template lookup:', step._pm_workflowtemplate_value)

    const workflowInstanceId = step._pm_workflowinstancelookup_value

    // Step 2: Fetch the workflow instance to get business entity context
    console.debug('[TaskResolver] Step 2: Fetching workflow instance:', workflowInstanceId)
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
      console.debug('[TaskResolver] Step 2 — raw instance result:', instanceResult)
      const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
      if (instance) {
        entityId = instance.pm_entityid || null
        entityType = instance.pm_entitytype || null
        workflowName = instance.pm_instancename ||
          (instance as any).pm_workflowlookupname ||
          null
        console.debug('[TaskResolver] ✅ Step 2 OK — entityId:', entityId, '| entityType:', entityType, '| name:', workflowName)
      } else {
        console.warn('[TaskResolver] ⚠️ Step 2 — instance not unwrapped (entity context lost)')
      }
    } catch (err) {
      console.warn('[TaskResolver] ⚠️ Step 2 FAILED — Cannot fetch workflow instance:', err)
    }

    // Step 3: Resolve formKey — try step's own new_formkey first, then fall back to template
    console.debug('[TaskResolver] Step 3: Resolving formKey...')
    let formKey: string | null = null
    let formEntry: FormRegistryEntry | null = null

    // Primary source: new_formkey on the approval step itself
    if (step.new_formkey) {
      formKey = step.new_formkey
      console.debug('[TaskResolver] ✅ Step 3 — formKey found directly on step:', formKey)
    }
    // Fallback: fetch from the step template
    else if (step._pm_workflowtemplate_value) {
      console.debug('[TaskResolver] Step 3 — no formKey on step, trying template:', step._pm_workflowtemplate_value)
      try {
        const template = await fetchStepTemplateById(step._pm_workflowtemplate_value)
        if (!template) {
          console.warn('[TaskResolver] ⛔ Step 3 — template not found for ID:', step._pm_workflowtemplate_value)
        } else if (!template.new_formkey) {
          console.warn('[TaskResolver] ⛔ Step 3 — template found but new_formkey is empty/null:', template)
        } else {
          formKey = template.new_formkey
          console.debug('[TaskResolver] ✅ Step 3 — formKey resolved from template:', formKey)
        }
      } catch (err) {
        console.warn('[TaskResolver] ⛔ Step 3 FAILED — fetchStepTemplateById threw:', err)
      }
    } else {
      console.warn('[TaskResolver] ⛔ Step 3 FAILED — no formKey on step and no template reference (_pm_workflowtemplate_value)')
    }

    // Step 4: Look up the form registry entry
    if (formKey) {
      console.debug('[TaskResolver] Step 4: Looking up formKey in FORM_REGISTRY:', formKey)
      formEntry = getFormByKey(formKey) ?? null
      if (formEntry) {
        console.debug('[TaskResolver] ✅ Step 4 OK — form found:', formEntry.key, '| display:', formEntry.displayName)
      } else {
        console.warn('[TaskResolver] ⛔ Step 4 FAILED — no form entry found for formKey:', formKey,
          '| Available keys:', FORM_REGISTRY.map(e => e.key))
      }
    }

    // If no formEntry found, return null — no form to navigate to
    if (!formEntry) {
      console.warn('[TaskResolver] ⛔ Cannot navigate — no formEntry resolved.',
        'formKey:', formKey,
        '| templateRef:', step._pm_workflowtemplate_value)
      return null
    }

    // Build the navigate function — dispatches the form dialog (task modals)
    const navigate = () => {
      dispatchOpenFormDialog({
        formDisplayName: formEntry.displayName,
        formDescription: formEntry.description,
        moduleName: formEntry.moduleName,
        formKey: formEntry.key,
        entityId,
        entityType,
        workflowName,
        approvalStepId: stepId,
        stepOrder: undefined,
        navigate: () => { }, // No-op — modalComponent handles the UI
      })
    }

    console.debug('[TaskResolver] ===== resolveApprovalStepTask SUCCESS =====',
      '| form:', formEntry.displayName,
      '| entityId:', entityId,
      '| entityType:', entityType)

    return {
      formEntry,
      step: {
        pm_workflowapprovalstepid: step.pm_workflowapprovalstepid,
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
    const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
    const result = instance?.pm_entityid ?? null
    return result
  } catch (err) {
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
      console.warn('[resolveEntityInfoFromApprovalStep] ❌ No workflow instance lookup on step')
      return { entityId: null, entityType: undefined, entityName: undefined }
    }

    const instanceResult = await Pm_workflowinstancesService.get(step._pm_workflowinstancelookup_value, {
      select: ['pm_workflowinstanceid', 'pm_entityid', 'pm_entitytype', 'pm_entityname', 'pm_instancename'],
    })
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
  console.debug('[TaskResolver] openApprovalStepTask — stepId:', stepId)
  const task = await resolveApprovalStepTask(stepId)
  if (task) {
    console.debug('[TaskResolver] openApprovalStepTask — resolved OK, dispatching form dialog...')
    // Dispatch a dialog popup event instead of navigating directly
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
  console.warn('[TaskResolver] openApprovalStepTask — could not resolve task, no dialog shown')
  return false
}
