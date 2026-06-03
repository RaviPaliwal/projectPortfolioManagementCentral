import {
  Pm_workflowsService,
  Pm_workflowinstancesService,
  Pm_workflowapprovalstepsService,
  Pm_workflowsteptemplatesService,
  Pm_projectsService,
  Pm_programmesService,
  Pm_portfoliosService,
  Pm_changerequestsService,
  Pm_budgetlinesService,
  Pm_initiativesService,
  Pm_risksService,
} from '@/generated'
import type { Pm_workflows } from '@/generated/models/Pm_workflowsModel'
import type { Pm_workflowinstances } from '@/generated/models/Pm_workflowinstancesModel'
import { Pm_workflowinstancespm_status } from '@/generated/models/Pm_workflowinstancesModel'
import type { Pm_workflowapprovalsteps } from '@/generated/models/Pm_workflowapprovalstepsModel'
import type { Pm_workflowsteptemplates } from '@/generated/models/Pm_workflowsteptemplatesModel'
import type {
  WorkflowModel,
  WorkflowInstanceModel,
  WorkflowApprovalStepModel,
  WorkflowStepTemplateModel,
  WorkflowConfig,
  WorkflowPostApprovalAction,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from '@/services/common'
import { fetchSystemUsers, fetchOwnerTeams } from '@/services/team.service'
import type { TeamOption } from '@/services/team.service'
import type { Systemusers } from '@/generated/models/SystemusersModel'

export async function fetchEntityMetadataForModule(moduleName: string): Promise<any> {
  // According to docs, schema.columns: 'all' fetches the AttributeMetadata which contains the fields
  const options = { 
    schema: { columns: 'all' } 
  } as any
  try {
    let result: any = null;
    switch (moduleName.toLowerCase()) {
      case 'projects':
      case 'project':
      case 'pm_project':
        result = await Pm_projectsService.getMetadata(options);
        break;
      case 'programmes':
      case 'programme':
      case 'pm_programme':
        result = await Pm_programmesService.getMetadata(options);
        break;
      case 'portfolios':
      case 'portfolio':
      case 'pm_portfolio':
        result = await Pm_portfoliosService.getMetadata(options);
        break;
      case 'changerequests':
      case 'changerequest':
      case 'pm_changerequest':
        result = await Pm_changerequestsService.getMetadata(options);
        break;
      case 'budgets':
      case 'budgetline':
      case 'pm_budgetline':
        result = await Pm_budgetlinesService.getMetadata(options);
        break;
      case 'risks':
      case 'issues':
      case 'pm_risk':
      case 'pm_issue':
        result = await Pm_risksService.getMetadata(options);
        break;
    }
    
    // TEMPORARY DEBUG: Dump the first Picklist attribute found to the console
    try {
      const rawData = result?.data || result;
      const attrs = rawData?.Attributes || rawData?.value?.Attributes || rawData?.EntityMetadata?.[0]?.Attributes || [];
      const samplePicklist = attrs.find((a: any) => a.AttributeType === 'Picklist' || a.AttributeType === 'Status' || a.AttributeType === 'State');
      if (samplePicklist) {
        console.warn(`[WorkflowEngine] Found Picklist Attribute: ${samplePicklist.LogicalName}`);
        console.warn(`[WorkflowEngine] Picklist Structure Dump:`, JSON.parse(JSON.stringify(samplePicklist)));
      }
    } catch (e) {}

    return result;
  } catch (err) {
    console.error('[WorkflowEngine] Failed to fetch metadata for module:', moduleName, err);
    return null;
  }
}

/**
 * Generic helper to update a field on any supported entity.
 */
async function updateEntityField(entityType: string, entityId: string, field: string, value: any): Promise<void> {
  const payload = { [field]: value }
  const normalizedId = normalizeLookupId(entityId)
  if (!normalizedId) return

  try {
    switch (entityType.toLowerCase()) {
      case 'project':
      case 'pm_project':
        await Pm_projectsService.update(normalizedId, payload as any)
        break
      case 'programme':
      case 'pm_programme':
        await Pm_programmesService.update(normalizedId, payload as any)
        break
      case 'portfolio':
      case 'pm_portfolio':
        await Pm_portfoliosService.update(normalizedId, payload as any)
        break
      case 'changerequest':
      case 'pm_changerequest':
        await Pm_changerequestsService.update(normalizedId, payload as any)
        break
      case 'budgetline':
      case 'pm_budgetline':
        await Pm_budgetlinesService.update(normalizedId, payload as any)
        break
      case 'initiative':
      case 'pm_initiative':
        await Pm_initiativesService.update(normalizedId, payload as any)
        break
      default:
        console.warn(`[WorkflowEngine] Unsupported entity type for automated update: ${entityType}`)
    }
  } catch (err) {
    console.error(`[WorkflowEngine] Failed to update ${entityType} ${entityId}:`, err)
  }
}

/**
 * Parses and executes actions defined in the workflow configuration.
 */
async function executePostApprovalActions(
  actions: WorkflowPostApprovalAction[] | undefined,
  entityType?: string,
  entityId?: string
): Promise<void> {
  if (!actions || !entityType || !entityId) return

  for (const action of actions) {
    if (action.field && action.value !== undefined) {
      await updateEntityField(entityType, entityId, action.field, action.value)
    }
  }
}

/**
 * Fetches the full data for any supported entity.
 */
async function fetchEntityData(entityType: string, entityId: string): Promise<any> {
  const normalizedId = normalizeLookupId(entityId)
  if (!normalizedId) return null

  try {
    let result: any
    switch (entityType.toLowerCase()) {
      case 'project':
      case 'pm_project':
        result = await Pm_projectsService.get(normalizedId)
        break
      case 'programme':
      case 'pm_programme':
        result = await Pm_programmesService.get(normalizedId)
        break
      case 'portfolio':
      case 'pm_portfolio':
        result = await Pm_portfoliosService.get(normalizedId)
        break
      case 'changerequest':
      case 'pm_changerequest':
        result = await Pm_changerequestsService.get(normalizedId)
        break
      case 'budgetline':
      case 'pm_budgetline':
        result = await Pm_budgetlinesService.get(normalizedId)
        break
      default:
        console.warn(`[WorkflowEngine] Unsupported entity type for data fetch: ${entityType}`)
        return null
    }
    return unwrapSingle<any>(result)
  } catch (err) {
    console.error(`[WorkflowEngine] Failed to fetch entity data for condition evaluation:`, err)
    return null
  }
}

function evaluateSingleRule(data: any, rule: any): boolean {
  if (!rule || !rule.field) return true
  const actualValue = data[rule.field]
  const targetValue = rule.value

  switch (rule.operator) {
    case 'eq': return String(actualValue) === String(targetValue)
    case 'ne': return String(actualValue) !== String(targetValue)
    case 'gt': return Number(actualValue) > Number(targetValue)
    case 'lt': return Number(actualValue) < Number(targetValue)
    case 'contains': return String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase())
    default: return true
  }
}

/**
 * Evaluates a JSON condition against entity data.
 */
function evaluateCondition(data: any, conditionJson?: string): boolean {
  if (!conditionJson || conditionJson.trim() === '') return true
  try {
    const config = JSON.parse(conditionJson)

    // Support new AND/OR group format
    if (config.logic && Array.isArray(config.rules)) {
      if (config.rules.length === 0) return true
      const results = config.rules.map((r: any) => evaluateSingleRule(data, r))
      return config.logic === 'AND' ? results.every((r: boolean) => r) : results.some((r: boolean) => r)
    }

    // Fallback for legacy single-rule format
    return evaluateSingleRule(data, config)
  } catch (e) {
    console.error('[WorkflowEngine] Condition evaluation error:', e)
    // Fail closed — return false so the step is skipped rather than incorrectly passed
    return false
  }
}

export const mapWorkflow = (item: Pm_workflows): WorkflowModel => {
  const raw = item as any
  return {
    pm_workflowid: item.pm_workflowid,
    pm_workflowname: item.pm_workflowname,
    pm_workflowdescription: item.pm_description,
    pm_workflowtype: raw.pm_workflowtype,
    pm_workflowtypename: raw.pm_workflowtypename,
    pm_workflowstatus: raw.pm_workflowstatus ?? item.statecode ?? item.statuscode,
    pm_workflowstatusname: raw.pm_workflowstatusname ?? (item.statecode === 0 ? 'Active' : 'Inactive'),
    pm_module: item.pm_module,
    pm_entitytype: raw.pm_entitytype,
    statecode: item.statecode,
  }
}

export const mapWorkflowInstance = (item: Pm_workflowinstances): WorkflowInstanceModel => {
  const raw = item as any
  return {
    pm_workflowinstanceid: item.pm_workflowinstanceid,
    pm_workflowname: item.pm_workflowlookupname ?? raw.pm_workflowname ?? raw.pm_workflowtemplate,
    pm_entityid: item.pm_entityid,
    pm_instanceidentifier: item.pm_instancename ?? raw.pm_instanceidentifier,
    pm_workflowstatus: raw.pm_workflowstatus ?? item.pm_status,
    pm_workflowstatusname: Pm_workflowinstancespm_status[Number(item.pm_status)] ?? item.pm_statusname,
    pm_initiatedby: item.pm_initiatedby,
    pm_initiationdate: raw.pm_initiationdate ?? item.pm_startdate,
    pm_completiondate: item.pm_completeddate ?? raw.pm_completiondate,
    _pm_workflow_value: raw._pm_workflow_value ?? item._pm_workflowlookup_value,
    statecode: item.statecode,
  }
}

export const mapWorkflowApprovalStep = (item: Pm_workflowapprovalsteps): WorkflowApprovalStepModel => {
  const raw = item as any
  return {
    pm_workflowapprovalstepid: item.pm_workflowapprovalstepid,
    pm_stepname: item.pm_stepname,
    pm_steporder: item.pm_steporder,
    pm_approvername: item.pm_approvername,
    pm_decisionstatus: item.pm_decisionstatus,
    pm_decisionstatusname: item.pm_decisionstatusname ?? raw.pm_decisionstatusname,
    pm_notes: raw.pm_notes,
    pm_decisiondate: item.pm_decisiondate,
    _pm_workflowinstance_value: item._pm_workflowinstancelookup_value ?? raw._pm_workflowinstance_value,
    statecode: item.statecode,
  }
}

export const mapWorkflowStepTemplate = (item: Pm_workflowsteptemplates): WorkflowStepTemplateModel => ({
  pm_workflowsteptemplateid: item.pm_workflowsteptemplateid,
  pm_workflowname: item.pm_workflowname,
  pm_steporder: item.pm_steporder,
  pm_assignetype: (item as any).pm_assignetype,
  pm_assigneeid: item.pm_assigneeid,
  pm_displayname: item.pm_displayname,
  pm_description: item.pm_description,
  pm_sladays: item.pm_sladays,
  pm_allowdelegation: item.pm_allowdelegation,
  pm_approvalrequired: item.pm_approvalrequired,
  pm_isparallel: item.pm_isparallel,
  pm_conditionsjson: item.pm_conditionsjson,
  pm_status: (item as any).pm_status,
  pm_statusreason: item.pm_statusreason,
  _pm_workflowlookup_value: (item as any)._pm_workflowlookup_value,
  statecode: (item as any).statecode,
})

export async function fetchWorkflows(): Promise<WorkflowModel[]> {
  const result = await Pm_workflowsService.getAll({
    select: [
      'pm_workflowid', 'pm_workflowname', 'pm_description',
      'pm_module', 'pm_triggerentity', 'pm_triggerevent',
      'pm_triggercondition', 'pm_version', 'pm_isactive',
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
  const result = await Pm_workflowsService.update(id, payload as any)
  try { console.debug('[dataverseService] updateWorkflow id/changes/result:', id, changes, result) } catch (e) { }
  const item = unwrapSingle<Pm_workflows>(result)
  return item ? mapWorkflow(item) : null
}

export async function deleteWorkflow(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteWorkflow id:', id) } catch (e) { }
  await Pm_workflowsService.delete(id)
}

export async function fetchWorkflowStepTemplates(workflowId?: string): Promise<WorkflowStepTemplateModel[]> {
  const options: any = {
    select: ['pm_workflowsteptemplateid', 'pm_workflowname', 'pm_steporder', 'pm_assignetype', 'pm_assigneeid', 'pm_displayname', 'pm_description', 'pm_sladays', 'pm_allowdelegation', 'pm_approvalrequired', 'pm_isparallel', 'pm_conditionsjson', 'pm_status', 'pm_statusreason', '_pm_workflowlookup_value'],
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
    pm_status: 1,
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

export async function fetchWorkflowInstances(): Promise<WorkflowInstanceModel[]> {
  const result = await Pm_workflowinstancesService.getAll({
    select: [
      'pm_workflowinstanceid', 'pm_instancename',
      'pm_entityid', 'pm_entitytype',
      'pm_entityname', 'pm_workflowtemplate',
      'pm_initiatedby', 'pm_status',
      'pm_completeddate', 'pm_startdate',
      '_pm_workflowlookup_value',
    ],
    orderBy: ['pm_startdate desc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchWorkflowInstances result:', result) } catch (e) { }
  return unwrapList<Pm_workflowinstances>(result).map(mapWorkflowInstance)
}

export async function fetchWorkflowApprovalSteps(instanceId: string): Promise<WorkflowApprovalStepModel[]> {
  const result = await Pm_workflowapprovalstepsService.getAll({
    filter: `_pm_workflowinstance_value eq '${instanceId}'`,
    select: [
      'pm_workflowapprovalstepid', 'pm_stepname', 'pm_steporder',
      'pm_approvername', 'pm_decisionstatus', 'pm_decisionstatusname',
      'pm_decisionnotes', 'pm_decisiondate',
      'pm_duedate', '_pm_workflowinstancelookup_value',
    ],
    orderBy: ['pm_steporder asc'],
    top: 200,
  })
  const steps = unwrapList<Pm_workflowapprovalsteps>(result)
  return steps.map(mapWorkflowApprovalStep)
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
      cleanPayload['pm_workflowinstance@odata.bind'] = '/pm_workflowinstances(' + instanceId + ')'
    }
  }
  const result = await Pm_workflowapprovalstepsService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createWorkflowApprovalStep payload/result:', cleanPayload, result) } catch (e) { }
  const item = unwrapSingle<Pm_workflowapprovalsteps>(result)
  return item ? mapWorkflowApprovalStep(item) : null
}

export async function deleteWorkflowInstance(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteWorkflowInstance id:', id) } catch (e) { }
  await Pm_workflowinstancesService.delete(id)
}

export async function startWorkflowForEntity(
  templateId: string,
  entityId: string,
  entityType: string,
  initiatedBy: string
): Promise<WorkflowInstanceModel | null> {
  const stepTemplates = await fetchWorkflowStepTemplates(templateId)
  const activeSteps = stepTemplates
    .filter((s) => s.pm_status === 1 || s.pm_status === '1')
    .sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))

  if (activeSteps.length === 0) {
    console.warn('[dataverseService] startWorkflowForEntity: no active step templates found')
    return null
  }

  const now = new Date().toISOString()

  const instancePayload: Record<string, any> = {
    pm_instancename: `${entityType} - ${entityId.substring(0, 8)}`,
    pm_entityid: entityId,
    pm_entitytype: entityType,
    pm_initiatedby: initiatedBy,
    pm_status: 1,
    pm_currentstep: 1,
    pm_startdate: now,
    statecode: 0,
    statuscode: 1,
  }
  const normalizedTemplateId = normalizeLookupId(templateId)
  if (normalizedTemplateId) {
    instancePayload['pm_workflowLookup@odata.bind'] = `/pm_workflows(${normalizedTemplateId})`
  }

  const instanceResult = await Pm_workflowinstancesService.create(instancePayload as any)
  const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
  if (!instance?.pm_workflowinstanceid) {
    console.error('[dataverseService] startWorkflowForEntity: failed to create instance')
    return null
  }

  const instanceId = instance.pm_workflowinstanceid

  let systemUsers: Systemusers[] = []
  let ownerTeams: TeamOption[] = []
  try {
    systemUsers = await fetchSystemUsers()
    ownerTeams = await fetchOwnerTeams()
  } catch { }

  const userById = new Map<string, string>()
  for (const u of systemUsers) {
    const uid = normalizeLookupId(u.systemuserid)
    if (uid && u.fullname) userById.set(uid, u.fullname)
  }
  const teamById = new Map<string, string>()
  for (const t of ownerTeams) {
    const tid = normalizeLookupId(t.id)
    if (tid) teamById.set(tid, t.name)
  }

  // Fetch entity data once for condition evaluation
  let entityData: any = null
  let entityDataFetched = false

  const createdStepIds: string[] = []
  let allStepsCreated = true
  let createdAnyStep = false
  for (let i = 0; i < activeSteps.length; i++) {
    const tpl = activeSteps[i]

    // Evaluate step condition before creating the approval step
    if (tpl.pm_conditionsjson && tpl.pm_conditionsjson.trim() !== '') {
      if (!entityDataFetched) {
        entityData = await fetchEntityData(entityType, entityId)
        entityDataFetched = true
      }
      const shouldCreate = evaluateCondition(entityData, tpl.pm_conditionsjson)
      if (!shouldCreate) {
        continue
      }
    }

    // Use a boolean flag instead of index so condition-skips don't break first-step logic
    const isFirstStep = !createdAnyStep

    let assigneeDisplayName = ''
    if (tpl.pm_assigneeid) {
      const normalizedId = normalizeLookupId(tpl.pm_assigneeid)
      if (tpl.pm_assignetype === 1 || tpl.pm_assignetype === '1') {
        assigneeDisplayName = teamById.get(normalizedId ?? '') ?? ''
      } else {
        assigneeDisplayName = userById.get(normalizedId ?? '') ?? ''
      }
    }

    const stepPayload: Record<string, any> = {
      pm_stepname: tpl.pm_displayname || `Step ${tpl.pm_steporder ?? i + 1}`,
      pm_steporder: i + 1,
      pm_assigneedisplayname: assigneeDisplayName,
      pm_approvername: tpl.pm_assigneeid || '',
      pm_assigneetype: tpl.pm_assignetype ?? 0,
      pm_isparallelstep: tpl.pm_isparallel ?? false,
      statecode: 0,
      statuscode: 1,
    }

    if (isFirstStep) {
      stepPayload.pm_decisionstatus = 1
    }

    if (tpl.pm_sladays) {
      stepPayload.pm_duedate = new Date(Date.now() + tpl.pm_sladays * 86400000).toISOString()
    }

    if (normalizedTemplateId) {
      stepPayload['pm_WorkflowTemplate@odata.bind'] = `/pm_workflows(${normalizedTemplateId})`
    }

    const normalizedInstanceId = normalizeLookupId(instanceId)
    if (normalizedInstanceId) {
      stepPayload['pm_WorkflowInstanceLookup@odata.bind'] = `/pm_workflowinstances(${normalizedInstanceId})`
    }

    try {
      const stepResult = await Pm_workflowapprovalstepsService.create(stepPayload as any)
      const createdStep = unwrapSingle<Pm_workflowapprovalsteps>(stepResult)
      if (createdStep?.pm_workflowapprovalstepid) {
        createdStepIds.push(createdStep.pm_workflowapprovalstepid)
        createdAnyStep = true
      } else {
        allStepsCreated = false
      }
    } catch (err) {
      allStepsCreated = false
    }
  }

  if (!allStepsCreated) {
    // Clean up: delete instance and any orphaned steps
    try {
      await Pm_workflowinstancesService.delete(instanceId)
    } catch { }
    for (const sid of createdStepIds) {
      try {
        await Pm_workflowapprovalstepsService.delete(sid)
      } catch { }
    }
    return null
  }

  // If no steps were created (all skipped by conditions), return null
  if (createdStepIds.length === 0) {
    try {
      await Pm_workflowinstancesService.delete(instanceId)
    } catch { }
    return null
  }

  return mapWorkflowInstance(instance)
}

export async function approveWorkflowStep(
  stepId: string,
  approverName: string,
  notes?: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString()

    // Guard against double-approval: check the step hasn't already been decided
    const preCheck = await Pm_workflowapprovalstepsService.get(stepId, {
      select: ['pm_workflowapprovalstepid', 'pm_decisionstatus'],
    })
    const preStep = unwrapSingle<Pm_workflowapprovalsteps>(preCheck)
    if (preStep && (preStep as any).pm_decisionstatus === 0) {
      // Already approved — skip
      return true
    }

    await Pm_workflowapprovalstepsService.update(stepId, {
      pm_decisionstatus: 0,
      pm_decisiondate: now,
      pm_decisionnotes: notes || undefined,
      pm_approvername: approverName,
    } as any)

    const stepResult = await Pm_workflowapprovalstepsService.get(stepId, {
      select: ['pm_workflowapprovalstepid', 'pm_steporder', 'pm_stepname',
        '_pm_workflowinstancelookup_value', '_pm_workflowtemplate_value'],
    })
    const step = unwrapSingle<Pm_workflowapprovalsteps>(stepResult)
    if (!step) return true

    const instanceLookup = step._pm_workflowinstancelookup_value
    if (!instanceLookup) return true

    const instanceResult = await Pm_workflowinstancesService.get(instanceLookup, {
      select: ['pm_workflowinstanceid', 'pm_currentstep', 'pm_status', 'pm_workflowtemplate'],
    })
    const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
    if (!instance) return true

    const currentStepOrder = step.pm_steporder ?? 1

    const nextStepsResult = await Pm_workflowapprovalstepsService.getAll({
      filter: `_pm_workflowinstancelookup_value eq '${normalizeLookupId(instanceLookup)}' and pm_steporder gt ${currentStepOrder}`,
      select: ['pm_workflowapprovalstepid', 'pm_steporder'],
      orderBy: ['pm_steporder asc'],
      top: 1,
    })
    const nextSteps = unwrapList<Pm_workflowapprovalsteps>(nextStepsResult)

    if (nextSteps.length > 0) {
      const nextStep = nextSteps[0]
      await Pm_workflowapprovalstepsService.update(nextStep.pm_workflowapprovalstepid!, {
        pm_decisionstatus: 1,
      } as any)

      await Pm_workflowinstancesService.update(instanceLookup, {
        pm_currentstep: currentStepOrder + 1,
      } as any)
    } else {
      await Pm_workflowinstancesService.update(instanceLookup, {
        pm_status: 0,
        pm_completeddate: now,
        pm_currentstep: currentStepOrder,
      } as any)

      // Execute "On Complete" Actions
      const templateId = step._pm_workflowtemplate_value || instance._pm_workflowlookup_value
      if (templateId) {
        try {
          const tplResult = await Pm_workflowsService.get(templateId, { select: ['pm_triggercondition'] })
          const tpl = unwrapSingle<Pm_workflows>(tplResult)
          if (tpl?.pm_triggercondition) {
            const config = JSON.parse(tpl.pm_triggercondition) as WorkflowConfig
            await executePostApprovalActions(config.onComplete, instance.pm_entitytype, instance.pm_entityid)
          }
        } catch (e) {
          console.warn('[WorkflowEngine] Failed to execute completion actions:', e)
        }
      }
    }

    return true
  } catch (err) {
    console.error('[dataverseService] approveWorkflowStep failed:', err)
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

    // Guard against double-rejection: check the step hasn't already been decided
    const preCheck = await Pm_workflowapprovalstepsService.get(stepId, {
      select: ['pm_workflowapprovalstepid', 'pm_decisionstatus', '_pm_workflowinstancelookup_value'],
    })
    const preStep = unwrapSingle<Pm_workflowapprovalsteps>(preCheck)
    if (!preStep) return true

    // Fetch instance for entity info needed by post-rejection actions
    const instanceLookup = preStep._pm_workflowinstancelookup_value
    let entityType: string | undefined
    let entityId: string | undefined
    if (instanceLookup) {
      try {
        const instResult = await Pm_workflowinstancesService.get(instanceLookup, {
          select: ['pm_workflowinstanceid', 'pm_entitytype', 'pm_entityid', 'pm_workflowtemplate', '_pm_workflowlookup_value'],
        })
        const instance = unwrapSingle<Pm_workflowinstances>(instResult)
        if (instance) {
          entityType = instance.pm_entitytype
          entityId = instance.pm_entityid
        }
      } catch { }
    }

    await Pm_workflowapprovalstepsService.update(stepId, {
      pm_decisionstatus: 1,
      pm_decisiondate: now,
      pm_decisionnotes: reason,
      pm_approvername: approverName,
      statecode: 1,
    } as any)

    if (instanceLookup) {
      await Pm_workflowinstancesService.update(instanceLookup, {
        pm_status: 0,
        pm_completeddate: now,
      } as any)
      await Pm_workflowinstancesService.update(instanceLookup, {
        statecode: 1,
      } as any)

      // Execute "On Reject" post-approval actions
      const stepResult = await Pm_workflowapprovalstepsService.get(stepId, {
        select: ['_pm_workflowtemplate_value'],
      })
      const step = unwrapSingle<Pm_workflowapprovalsteps>(stepResult)
      const templateId = step?._pm_workflowtemplate_value
      if (templateId && entityType && entityId) {
        try {
          const tplResult = await Pm_workflowsService.get(templateId, { select: ['pm_triggercondition'] })
          const tpl = unwrapSingle<Pm_workflows>(tplResult)
          if (tpl?.pm_triggercondition) {
            const config = JSON.parse(tpl.pm_triggercondition) as WorkflowConfig
            await executePostApprovalActions(config.onReject, entityType, entityId)
          }
        } catch (e) {
          console.warn('[WorkflowEngine] Failed to execute rejection actions:', e)
        }
      }
    }

    return true
  } catch (err) {
    console.error('[dataverseService] rejectWorkflowStep failed:', err)
    return false
  }
}

export async function fetchPendingWorkflowApprovals(
  userId: string,
): Promise<WorkflowApprovalStepModel[]> {
  try {
    const allPendingResult = await Pm_workflowapprovalstepsService.getAll({
      filter: "pm_decisionstatus eq 1",
      select: [
        'pm_workflowapprovalstepid', 'pm_stepname', 'pm_steporder',
        'pm_approvername', 'pm_assigneedisplayname', 'pm_assigneetype',
        'pm_decisionstatus',
        'pm_decisiondate', 'pm_decisionnotes',
        'pm_duedate', 'pm_isparallelstep',
        '_pm_workflowinstancelookup_value', '_pm_workflowtemplate_value',
      ],
      orderBy: ['pm_duedate asc'],
      top: 500,
    })

    const allPending = unwrapList<Pm_workflowapprovalsteps>(allPendingResult)
    const userLower = userId.toLowerCase()
    const userIdLower = normalizeLookupId(userId) ?? ''
    const filtered = allPending.filter((step) => {
      const assigneeName = (step.pm_approvername || step.pm_assigneedisplayname || '').toLowerCase()
      if (assigneeName === userLower) return true
      const rawStep = step as any
      if (rawStep._pm_assignee_value) {
        const stepAssigneeId = normalizeLookupId(rawStep._pm_assignee_value)
        if (stepAssigneeId === userIdLower) return true
      }
      return false
    })

    const result = filtered.map(mapWorkflowApprovalStep)

    for (const step of result) {
      const instanceLookup = step._pm_workflowinstance_value
      if (instanceLookup) {
        try {
          const instanceResult = await Pm_workflowinstancesService.get(instanceLookup, {
            select: ['pm_workflowinstanceid', 'pm_instancename', 'pm_entityid', 'pm_entitytype', 'pm_initiatedby', 'pm_workflowtemplate', 'pm_workflowlookupname'],
          })
          const instance = unwrapSingle<Pm_workflowinstances>(instanceResult)
          if (instance) {
            ; (step as any).pm_workflowinstancelookupname = instance.pm_workflowlookupname || instance.pm_instancename
              ; (step as any).pm_entityid = instance.pm_entityid
              ; (step as any).pm_entitytype = instance.pm_entitytype
              ; (step as any).pm_initiatedby = instance.pm_initiatedby
              ; (step as any).pm_workflowtemplate = instance.pm_workflowtemplate
          }
        } catch { }
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
