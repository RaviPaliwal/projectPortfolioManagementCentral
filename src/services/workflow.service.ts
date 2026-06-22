import {
  Pm_workflowsService,
  Pm_workflowinstancesService,
  Pm_workflowapprovalstepsService,
  Pm_workflowsteptemplatesService,
  SystemusersService,
  TeamsService,
} from '@/generated'
import { InitiateWorkflowService } from '@/generated/services/InitiateWorkflowService'
import { WorkflowRoutingHandlerService } from '@/generated/services/WorkflowRoutingHandlerService'
import type { Pm_workflows } from '@/generated/models/Pm_workflowsModel'
import type { Pm_workflowinstances } from '@/generated/models/Pm_workflowinstancesModel'
import type { Pm_workflowapprovalsteps } from '@/generated/models/Pm_workflowapprovalstepsModel'
import type { Pm_workflowsteptemplates } from '@/generated/models/Pm_workflowsteptemplatesModel'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import type { Teams } from '@/generated/models/TeamsModel'
import type {
  WorkflowModel,
  WorkflowInstanceModel,
  WorkflowApprovalStepModel,
  WorkflowStepTemplateModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from '@/services/common'
import { MODULE_NAMES } from '@/constants/moduleNames'

// ─── Mappers ────────────────────────────────────────────────────────────

export const mapWorkflow = (item: Pm_workflows): WorkflowModel => {
  return {
    pm_workflowid: item.pm_workflowid,
    pm_workflowname: item.pm_workflowname,
    pm_workflowdescription: item.pm_description,
    pm_workflowstatus: item.pm_isactive === false ? 1 : Number(item.statecode ?? 0),
    pm_workflowstatusname: item.statecode === 0 ? 'Active' : 'Inactive',
    pm_module: item.pm_module,
    pm_isactive: item.pm_isactive ?? (item.statecode === 0),
    pm_version: item.pm_version,
    statecode: item.statecode,
    statuscode: item.statuscode,
  }
}

export const mapWorkflowInstance = (item: Pm_workflowinstances): WorkflowInstanceModel => {
  return {
    pm_workflowinstanceid: item.pm_workflowinstanceid,
    pm_instancename: item.pm_instancename,
    pm_workflowlookupname: (item as any)['_pm_workflowlookup_value@OData.Community.Display.V1.FormattedValue'],
    pm_entityid: item.pm_entityid,
    pm_entityname: item.pm_entityname,
    pm_entitytype: item.pm_entitytype,
    pm_initiatedby: (item as any)['_pm_initiatedbylookup_value@OData.Community.Display.V1.FormattedValue'],
    pm_status: item.pm_status,
    pm_startdate: item.pm_startdate,
    pm_completeddate: item.pm_completeddate,
    pm_currentstep: item.pm_currentstep,
    _pm_workflowlookup_value: item._pm_workflowlookup_value,
    statecode: item.statecode,
  }
}

export const mapWorkflowApprovalStep = (item: Pm_workflowapprovalsteps): WorkflowApprovalStepModel => {
  return {
    pm_workflowapprovalstepid: item.pm_workflowapprovalstepid,
    pm_steporder: item.pm_steporder,
    pm_approvername: item.pm_approvername,
    pm_assigneetype: item.pm_assigneetype,
    pm_assigneedisplayname: item.pm_assigneedisplayname,
    pm_decisionstatus: item.pm_decisionstatus,
    pm_decisiondate: item.pm_decisiondate,
    pm_decisionnotes: item.pm_decisionnotes,
    pm_duedate: item.pm_duedate,
    pm_isparallelstep: item.pm_isparallelstep,
    pm_notificationtimestamp: item.pm_notificationtimestamp,
    _pm_workflowinstance_value: item._pm_workflowinstancelookup_value,
    _pm_workflowinstancelookup_value: item._pm_workflowinstancelookup_value,
    _pm_workflowtemplate_value: item._pm_workflowtemplate_value,
    statecode: item.statecode,
    pm_stepname: item.pm_stepname,
  }
}

export const mapWorkflowStepTemplate = (item: Pm_workflowsteptemplates): WorkflowStepTemplateModel => ({
  pm_workflowsteptemplateid: item.pm_workflowsteptemplateid,
  pm_workflowname: item.pm_workflowname,
  pm_steporder: item.pm_steporder,
  pm_assignetype: item.pm_assignetype,
  pm_assigneeid: item.pm_assigneeid,
  pm_description: item.pm_description,
  pm_sladays: item.pm_sladays,
  new_formkey: item.new_formkey,
  _pm_workflowlookup_value: (item as any)._pm_workflowlookup_value,
  statecode: item.statecode,
})

// ─── CRUD: Workflow Templates ───────────────────────────────────────────

export async function fetchWorkflows(): Promise<WorkflowModel[]> {
  const result = await Pm_workflowsService.getAll({
    select: [
      'pm_workflowid', 'pm_workflowname', 'pm_description',
      'pm_module', 'pm_version', 'pm_isactive',
      'statecode', 'statuscode',
    ],
    orderBy: ['pm_workflowname asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchWorkflows result:', result) } catch (e) { }
  return unwrapList<Pm_workflows>(result).map(mapWorkflow)
}

export async function createWorkflow(payload: Partial<WorkflowModel>): Promise<WorkflowModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if ('pm_workflowdescription' in cleanPayload) {
    cleanPayload.pm_description = cleanPayload.pm_workflowdescription
    delete cleanPayload.pm_workflowdescription
  }
  if ('pm_workflowstatus' in cleanPayload) {
    cleanPayload.statecode = cleanPayload.pm_workflowstatus
    delete cleanPayload.pm_workflowstatus
  }
  // Strip removed fields
  for (const removed of ['pm_triggercondition', 'pm_workflowtype', 'pm_triggerentity', 'pm_triggerevent']) {
    delete cleanPayload[removed]
  }
  const result = await Pm_workflowsService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createWorkflow payload/result:', cleanPayload, result) } catch (e) { }
  const item = unwrapSingle<Pm_workflows>(result)
  return item ? mapWorkflow(item) : null
}

export async function updateWorkflow(id: string, changes: Partial<WorkflowModel>): Promise<WorkflowModel | null> {
  const payload: Record<string, any> = { ...changes }
  if ('pm_workflowdescription' in payload) {
    payload.pm_description = payload.pm_workflowdescription
    delete payload.pm_workflowdescription
  }
  if ('pm_workflowstatus' in payload) {
    payload.statecode = payload.pm_workflowstatus
    delete payload.pm_workflowstatus
  }
  // Strip removed fields
  for (const removed of ['pm_triggercondition', 'pm_workflowtype', 'pm_triggerentity', 'pm_triggerevent']) {
    delete payload[removed]
  }
  const result = await Pm_workflowsService.update(id, payload as any)
  try { console.debug('[dataverseService] updateWorkflow id/changes/result:', id, changes, result) } catch (e) { }
  const item = unwrapSingle<Pm_workflows>(result)
  return item ? mapWorkflow(item) : null
}

export async function deleteWorkflow(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteWorkflow id:', id) } catch (e) { }
  await Pm_workflowsService.delete(id)
}

// ─── CRUD: Step Templates ──────────────────────────────────────────────

export async function fetchWorkflowStepTemplates(workflowId?: string): Promise<WorkflowStepTemplateModel[]> {
  const options: any = {
    select: ['pm_workflowsteptemplateid', 'pm_workflowname', 'pm_steporder', 'pm_assignetype', 'pm_assigneeid', 'pm_description', 'pm_sladays', 'new_formkey', '_pm_workflowlookup_value'],
    orderBy: ['pm_steporder asc'],
    top: 200,
  }
  if (workflowId) {
    options.filter = "_pm_workflowlookup_value eq '" + workflowId + "'"
  }
  const result = await Pm_workflowsteptemplatesService.getAll(options)
  const items = unwrapList<Pm_workflowsteptemplates>(result)
  return items.map(mapWorkflowStepTemplate)
}

export async function createWorkflowStepTemplate(payload: Partial<WorkflowStepTemplateModel>): Promise<WorkflowStepTemplateModel | null> {
  const cleanPayload: Record<string, any> = {}
  let workflowBindValue: string | undefined
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && key !== 'pm_workflowsteptemplateid' && key !== 'pm_module') {
      if (key === '_pm_workflowlookup_value') {
        const lookupId = String(value).replace(/[{}]/g, '').trim().toLowerCase()
        if (lookupId) {
          workflowBindValue = lookupId
        }
      } else {
        cleanPayload[key] = value
      }
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (workflowBindValue) {
    cleanPayload['pm_workflowLookup@odata.bind'] = `/pm_workflows(${workflowBindValue})`
  }
  const result = await Pm_workflowsteptemplatesService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_workflowsteptemplates>(result)
  return item ? mapWorkflowStepTemplate(item) : null
}

export async function updateWorkflowStepTemplate(id: string, changes: Partial<WorkflowStepTemplateModel>): Promise<WorkflowStepTemplateModel | null> {
  const cleanPayload: Record<string, any> = {}
  let workflowBindValue: string | undefined
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && key !== 'pm_workflowsteptemplateid' && key !== 'pm_module') {
      if (key === '_pm_workflowlookup_value') {
        const lookupId = String(value).replace(/[{}]/g, '').trim().toLowerCase()
        if (lookupId) {
          workflowBindValue = lookupId
        }
      } else {
        cleanPayload[key] = value
      }
    }
  }
  if (workflowBindValue) {
    cleanPayload['pm_workflowLookup@odata.bind'] = `/pm_workflows(${workflowBindValue})`
  }
  const result = await Pm_workflowsteptemplatesService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_workflowsteptemplates>(result)
  return item ? mapWorkflowStepTemplate(item) : null
}

export async function deleteWorkflowStepTemplate(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteWorkflowStepTemplate id:', id) } catch (e) { }
  await Pm_workflowsteptemplatesService.delete(id)
}

export async function fetchStepTemplateById(id: string): Promise<WorkflowStepTemplateModel | null> {
  try {
    console.debug('[dataverseService] fetchStepTemplateById — template ID:', id)
    const result = await Pm_workflowsteptemplatesService.get(id, {
      select: ['pm_workflowsteptemplateid', 'pm_workflowname', 'pm_steporder', 'pm_assignetype', 'pm_assigneeid', 'pm_description', 'pm_sladays', 'new_formkey', '_pm_workflowlookup_value'],
    })
    console.debug('[dataverseService] fetchStepTemplateById — raw result:', JSON.stringify(result))
    const item = unwrapSingle<Pm_workflowsteptemplates>(result)
    console.debug('[dataverseService] fetchStepTemplateById — unwrapped:', item ? 'found' : 'null')
    return item ? mapWorkflowStepTemplate(item) : null
  } catch (err) {
    console.error('[dataverseService] fetchStepTemplateById failed:', err)
    return null
  }
}

/**
 * Custom event dispatched after a successful workflow decision submission.
 * WorkflowMilestone listens for this to refresh its data automatically.
 */
export const WORKFLOW_DECISION_EVENT = 'workflow:decision-submitted'

/**
 * Submit a decision for a workflow approval step.
 * Updates the step status in Dataverse and triggers the WorkflowRoutingHandler flow.
 * On success, dispatches a custom event so milestone components refresh.
 */
export async function submitWorkflowDecision(
  stepId: string,
  decision: number,
  decisionNotes?: string,
): Promise<boolean> {
  try {
    const now = new Date().toISOString()

    // Update step decision status in Dataverse
    await Pm_workflowapprovalstepsService.update(stepId, {
      pm_decisionstatus: decision,
      pm_decisiondate: now,
      pm_decisionnotes: decisionNotes || undefined,
    } as any)

    // Trigger workflowrouter flow
    const result = await WorkflowRoutingHandlerService.Run({
      text_2: stepId,
      text_3: '{}', // Teams config — empty per user request
      text_4: '{}', // Email config — empty per user request
      number: decision,
      text: decisionNotes || '',
    })

    const success = result?.success !== false

    if (success) {
      // Dispatch event so all WorkflowMilestone components on the page refresh
      window.dispatchEvent(new CustomEvent(WORKFLOW_DECISION_EVENT, {
        detail: { stepId, decision },
      }))
    }

    console.debug('[WorkflowEngine] workflowrouter triggered:', { stepId, decision, result })
    return success
  } catch (err) {
    console.error('[WorkflowEngine] submitWorkflowDecision failed:', err)
    return false
  }
}

// ─── CRUD: Workflow Instances ───────────────────────────────────────────

export async function fetchWorkflowInstances(): Promise<WorkflowInstanceModel[]> {
  const result = await Pm_workflowinstancesService.getAll({
    select: [
      'pm_workflowinstanceid', 'pm_instancename',
      'pm_entityid', 'pm_entitytype', 'pm_entityname',
      'pm_status',
      'pm_startdate', 'pm_completeddate',
      'pm_currentstep',
      '_pm_workflowlookup_value', '_pm_initiatedbylookup_value',
    ],
    orderBy: ['pm_startdate desc'],
    top: 500,
  })

  return unwrapList<Pm_workflowinstances>(result).map(mapWorkflowInstance)
}

export async function deleteWorkflowInstance(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteWorkflowInstance id:', id) } catch (e) { }
  await Pm_workflowinstancesService.delete(id)
}

/**
 * Fetch workflow instances for a specific entity by module name and entity ID.
 * Generic — can be used by GateReview, Project, or any other module.
 */
export async function fetchWorkflowInstancesForEntity(
  moduleName: string,
  entityId: string
): Promise<WorkflowInstanceModel[]> {
  const filter = `pm_entitytype eq '${moduleName}' and pm_entityid eq '${entityId}'`
  const result = await Pm_workflowinstancesService.getAll({
    filter,
    select: [
      'pm_workflowinstanceid', 'pm_instancename',
      'pm_entityid', 'pm_entitytype', 'pm_entityname',
      'pm_status',
      'pm_startdate', 'pm_completeddate',
      'pm_currentstep',
      '_pm_workflowlookup_value', '_pm_initiatedbylookup_value',
    ],
    orderBy: ['pm_startdate desc'],
    top: 50,
  })
  return unwrapList<Pm_workflowinstances>(result).map(mapWorkflowInstance)
}

// ─── CRUD: Approval Steps ──────────────────────────────────────────────

export async function fetchWorkflowApprovalSteps(instanceId: string): Promise<WorkflowApprovalStepModel[]> {
  const result = await Pm_workflowapprovalstepsService.getAll({
    filter: `_pm_workflowinstancelookup_value eq '${instanceId}'`,
    select: [
      'pm_stepname',
      'pm_workflowapprovalstepid', 'pm_steporder',
      'pm_approvername', 'pm_assigneedisplayname', 'pm_assigneetype',
      'pm_decisionstatus',
      'pm_decisionnotes', 'pm_decisiondate',
      'pm_duedate', 'pm_isparallelstep',
      '_pm_workflowinstancelookup_value', '_pm_workflowtemplate_value',
    ],
    orderBy: ['pm_steporder asc'],
    top: 200,
  })
  const steps = unwrapList<Pm_workflowapprovalsteps>(result)
  const mapped = steps.map(mapWorkflowApprovalStep)

  // Resolve assignee names and enrich with workflow instance data
  await enrichApprovalSteps(mapped)

  return mapped
}

/**
 * Enrich a list of approval steps with workflow instance metadata and resolved assignee names.
 */
async function enrichApprovalSteps(steps: WorkflowApprovalStepModel[]): Promise<void> {
  for (const step of steps) {
    const instanceLookup = step._pm_workflowinstancelookup_value
    if (instanceLookup) {
      try {
        const instanceResult = await Pm_workflowinstancesService.get(instanceLookup, {
          select: ['pm_workflowinstanceid', 'pm_instancename', '_pm_workflowlookup_value'],
        })
        const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
        if (instance) {
          const workflowTemplateName = (instance as any)['_pm_workflowlookup_value@OData.Community.Display.V1.FormattedValue']
            ; (step as any).pm_workflowname = workflowTemplateName || instance.pm_instancename
        }
      } catch { }
    }

    // Resolve assignee name based on assignee type
    const assigneeDisplayName = step.pm_assigneedisplayname
    const assigneeType = Number(step.pm_assigneetype)
    if (assigneeDisplayName && isGuid(assigneeDisplayName)) {
      try {
        if (assigneeType === 0) {
          const userResult = await SystemusersService.get(assigneeDisplayName, {
            select: ['systemuserid', 'fullname'],
          })
          const user = unwrapSingle<Systemusers>(userResult)
            ; (step as any).pm_assigneename = user?.fullname || assigneeDisplayName
        } else if (assigneeType === 1) {
          const teamResult = await TeamsService.get(assigneeDisplayName, {
            select: ['teamid', 'name'],
          })
          const team = unwrapSingle<Teams>(teamResult)
            ; (step as any).pm_assigneename = team?.name || assigneeDisplayName
        } else {
          ; (step as any).pm_assigneename = assigneeDisplayName
        }
      } catch {
        ; (step as any).pm_assigneename = assigneeDisplayName
      }
    } else {
      ; (step as any).pm_assigneename = assigneeDisplayName || step.pm_approvername || ''
    }
  }
}

export async function createWorkflowApprovalStep(payload: Partial<WorkflowApprovalStepModel>): Promise<WorkflowApprovalStepModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
      key !== '_pm_workflowinstance_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_workflowinstance_value) {
    const instanceId = payload._pm_workflowinstance_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (instanceId) {
      cleanPayload['pm_WorkflowInstanceLookup@odata.bind'] = '/pm_workflowinstances(' + instanceId + ')'
    }
  }
  const result = await Pm_workflowapprovalstepsService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createWorkflowApprovalStep payload/result:', cleanPayload, result) } catch (e) { }
  const item = unwrapSingle<Pm_workflowapprovalsteps>(result)
  return item ? mapWorkflowApprovalStep(item) : null
}

// ─── Power Automate Integration ─────────────────────────────────────────

// The initiateworkflow Power Automate flow automatically creates the
// workflow instance + approval steps. We just need to trigger it.

export async function startWorkflowForEntity(
  templateId: string,
  entityId: string,
  entityType: string,
  initiatedBy: string
): Promise<boolean> {
  try {
    // Map entity type names to the values InitiateWorkflow expects using central registry
    const lower = entityType.toLowerCase()
    const matched = Object.values(MODULE_NAMES).find(
      (m) => m.value.toLowerCase() === lower || m.label.toLowerCase() === lower || m.tabKey.toLowerCase() === lower
    )
    const module = matched?.value || entityType

    const result = await InitiateWorkflowService.Run({
      text: module as any,
      text_1: entityId,
    })

    console.debug('[WorkflowEngine] initiateworkflow triggered:', { module, entityId, result })
    return result?.success !== false
  } catch (err) {
    console.error('[WorkflowEngine] Failed to trigger initiateworkflow:', err)
    return false
  }
}

// The workflowrouter Power Automate flow handles step routing:
// marks current step completed, updates next step, and sends notifications.

export async function approveWorkflowStep(
  stepId: string,
  approverName: string,
  notes?: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString()

    // Guard against double-approval
    const preCheck = await Pm_workflowapprovalstepsService.get(stepId, {
      select: ['pm_workflowapprovalstepid', 'pm_decisionstatus'],
    })
    const preStep = unwrapSingle<Pm_workflowapprovalsteps>(preCheck)
    if (preStep && preStep.pm_decisionstatus === 0) {
      return true // Already approved
    }

    // Update step decision status
    await Pm_workflowapprovalstepsService.update(stepId, {
      pm_decisionstatus: 0,
      pm_decisiondate: now,
      pm_decisionnotes: notes || undefined,
      pm_approvername: approverName,
    } as any)

    // Trigger workflowrouter flow
    const result = await WorkflowRoutingHandlerService.Run({
      text_2: stepId,
      text_3: '{}', // Email config — managed by Power Automate
      text_4: '{}', // Teams config — managed by Power Automate
      number: 0,    // 0 = Approved
      text: notes || '',
    })

    console.debug('[WorkflowEngine] workflowrouter triggered for approve:', { stepId, result })
    return result?.success !== false
  } catch (err) {
    console.error('[WorkflowEngine] approveWorkflowStep failed:', err)
    return false
  }
}

export async function rejectWorkflowStep(
  stepId: string,
  approverName: string,
  reason: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString()

    // Update step decision status
    await Pm_workflowapprovalstepsService.update(stepId, {
      pm_decisionstatus: 3, // Rejected
      pm_decisiondate: now,
      pm_decisionnotes: reason,
      pm_approvername: approverName,
    } as any)

    // Trigger workflowrouter flow
    const result = await WorkflowRoutingHandlerService.Run({
      text_2: stepId,
      text_3: '{}', // Email config — managed by Power Automate
      text_4: '{}', // Teams config — managed by Power Automate
      number: 3,    // 3 = Rejected
      text: reason || '',
    })

    console.debug('[WorkflowEngine] workflowrouter triggered for reject:', { stepId, result })
    return result?.success !== false
  } catch (err) {
    console.error('[WorkflowEngine] rejectWorkflowStep failed:', err)
    return false
  }
}

// ─── Pending Approvals ──────────────────────────────────────────────────

/** Simple check if a string looks like a GUID */
function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
}

export async function fetchPendingWorkflowApprovals(
  userId: string,
  userName?: string,
): Promise<WorkflowApprovalStepModel[]> {
  try {
    const allPendingResult = await Pm_workflowapprovalstepsService.getAll({
      filter: "pm_decisionstatus eq 2", // Only Assigned (actionable) steps
      select: [
        'pm_workflowapprovalstepid', 'pm_steporder',
        'pm_approvername', 'pm_assigneedisplayname', 'pm_assigneetype',
        'pm_decisionstatus', 'pm_stepname',
        'pm_decisiondate', 'pm_decisionnotes',
        'pm_duedate', 'pm_isparallelstep',
        '_pm_workflowinstancelookup_value', '_pm_workflowtemplate_value',
      ],
      orderBy: ['pm_duedate asc'],
      top: 500,
    })
    const allPending = unwrapList<Pm_workflowapprovalsteps>(allPendingResult)

    const filtered = allPending.filter((step) => {
      const approver = (step.pm_approvername || '').toLowerCase()
      const assigneeDisplay = (step.pm_assigneedisplayname || '').toLowerCase()
      const userIdLower = userId.toLowerCase()
      if (approver === userIdLower) return true
      if (assigneeDisplay === userIdLower) return true
      if (userName) {
        const nameLower = userName.toLowerCase()
        if (approver === nameLower) return true
        if (assigneeDisplay === nameLower) return true
      }
      return false
    })

    const result = filtered.map(mapWorkflowApprovalStep)

    // Enrich with instance metadata and resolve names
    for (const step of result) {
      const instanceLookup = step._pm_workflowinstancelookup_value
      if (instanceLookup) {
        try {
          const instanceResult = await Pm_workflowinstancesService.get(instanceLookup, {
            select: ['pm_workflowinstanceid', 'pm_instancename', 'pm_entityid', 'pm_entitytype', '_pm_initiatedbylookup_value', '_pm_workflowlookup_value'],
          })
          const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
          if (instance) {
            // Workflow template name (formatted value of the lookup to pm_workflows)
            const workflowTemplateName = (instance as any)['_pm_workflowlookup_value@OData.Community.Display.V1.FormattedValue']
              ; (step as any).pm_workflowinstancelookupname = instance.pm_instancename
              ; (step as any).pm_workflowname = workflowTemplateName || instance.pm_instancename
              ; (step as any).pm_entityid = instance.pm_entityid
              ; (step as any).pm_entitytype = instance.pm_entitytype
              ; (step as any).pm_initiatedby = instance.pm_initiatedbylookupname || instance._pm_initiatedbylookup_value
          }
        } catch { }
      }

      // Resolve assignee name based on assignee type
      const assigneeDisplayName = step.pm_assigneedisplayname
      const assigneeType = Number(step.pm_assigneetype)
      if (assigneeDisplayName && isGuid(assigneeDisplayName)) {
        try {
          if (assigneeType === 0) {
            // User type — lookup from SystemUser
            const userResult = await SystemusersService.get(assigneeDisplayName, {
              select: ['systemuserid', 'fullname'],
            })
            const user = unwrapSingle<Systemusers>(userResult)
              ; (step as any).pm_assigneename = user?.fullname || assigneeDisplayName
          } else if (assigneeType === 1) {
            // Team type — lookup from Team
            const teamResult = await TeamsService.get(assigneeDisplayName, {
              select: ['teamid', 'name'],
            })
            const team = unwrapSingle<Teams>(teamResult)
              ; (step as any).pm_assigneename = team?.name || assigneeDisplayName
          } else {
            ; (step as any).pm_assigneename = assigneeDisplayName
          }
        } catch {
          ; (step as any).pm_assigneename = assigneeDisplayName
        }
      } else {
        // Already a display name or fallback to approvername
        ; (step as any).pm_assigneename = assigneeDisplayName || step.pm_approvername || ''
      }
    }

    return result
  } catch (err) {
    console.error('[dataverseService] fetchPendingWorkflowApprovals failed:', err)
    return []
  }
}

export async function fetchWorkflowApprovalStepsExtended(instanceId: string): Promise<WorkflowApprovalStepModel[]> {
  return fetchWorkflowApprovalSteps(instanceId)
}
