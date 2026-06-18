import {
  Pm_risksService,
  Pm_issuesService,
  Pm_riskmitigationactionsService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
import type { Pm_risks } from '@/generated/models/Pm_risksModel'
import type { Pm_issues } from '@/generated/models/Pm_issuesModel'
import type { Pm_riskmitigationactions } from '@/generated/models/Pm_riskmitigationactionsModel'
import type {
  RiskModel,
  IssueModel,
  RiskMitigationActionModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

/**
 * Resolve a risk owner identifier to a resource GUID.
 * The input may be either a systemuserid (from user-select-id form field)
 * or a pm_resourceid. This function ensures we always bind to the resources table.
 */
async function resolveRiskOwnerResourceId(id: string): Promise<string | null> {
  console.log('[resolveRiskOwnerResourceId] Attempting to resolve ID:', id)
  
  // Try 1: see if it's already a resource ID
  try {
    const { Pm_resourcesService } = await import('@/generated')
    const byId = await Pm_resourcesService.get(id, {
      select: ['pm_resourceid'],
    })
    console.log('[resolveRiskOwnerResourceId] Try 1 - direct GET result:', JSON.stringify(byId))
    const direct = unwrapSingle<any>(byId)
    if (direct?.pm_resourceid) {
      console.log('[resolveRiskOwnerResourceId] ✓ Resolved directly as resource ID:', direct.pm_resourceid)
      return direct.pm_resourceid
    }
    console.log('[resolveRiskOwnerResourceId] Try 1 - not a direct resource ID, falling through')
  } catch (err) {
    console.log('[resolveRiskOwnerResourceId] Try 1 - GET threw (expected for systemuser GUID):', err)
  }
  
  // Try 2: resolve systemuser → resource
  try {
    const { fetchResourceBySystemUserId } = await import('./resource.service')
    const resource = await fetchResourceBySystemUserId(id)
    console.log('[resolveRiskOwnerResourceId] Try 2 - fetchResourceBySystemUserId result:', resource ? JSON.stringify({ pm_resourceid: resource.pm_resourceid, pm_fullname: resource.pm_fullname }) : null)
    if (resource?.pm_resourceid) {
      console.log('[resolveRiskOwnerResourceId] ✓ Resolved via systemuser → resource:', resource.pm_resourceid)
      return resource.pm_resourceid
    }
    console.log('[resolveRiskOwnerResourceId] Try 2 - no resource found for system user ID')
  } catch (err) {
    console.log('[resolveRiskOwnerResourceId] Try 2 - fetchResourceBySystemUserId threw:', err)
  }
  
  console.warn('[resolveRiskOwnerResourceId] ✗ FAILED - Could not resolve risk owner ID to a resource:', id)
  return null
}

export const mapRisk = (item: Pm_risks): RiskModel => ({
  pm_riskid: item.pm_riskid,
  pm_risktitle: item.pm_risktitle,
  pm_riskcategory: item.pm_riskcategory,
  pm_riskdescription: item.pm_riskdescription,
  pm_ragstatus: item.pm_ragstatus,
  pm_riskownername: (item as any)['_pm_riskowner_value@OData.Community.Display.V1.FormattedValue'] ?? item.pm_riskownername,
  pm_riskstatus: item.pm_riskstatus,
  pm_escalated: item.pm_escalated,
  pm_identifieddate: item.pm_identifieddate,
  pm_targetclosedate: item.pm_targetclosedate,
  pm_inherentprobability: item.pm_inherentprobability,
  pm_inherentimpact: item.pm_inherentimpact,
  pm_inherentscore: item.pm_inherentscore,
  pm_residualprobability: item.pm_residualprobability,
  pm_residualimpact: item.pm_residualimpact,
  pm_residualscore: item.pm_residualscore,
  pm_responsestrategy: item.pm_responsestrategy,
  pm_riskcause: item.pm_riskcause,
  pm_riskeffect: item.pm_riskeffect,
  pm_projectname: (item as any)['_pm_project_value@OData.Community.Display.V1.FormattedValue'],
  _pm_project_value: (item as any)._pm_project_value,
  _pm_riskowner_value: item._pm_riskowner_value,
  statecode: item.statecode,
})

export const mapIssue = (item: Pm_issues): IssueModel => ({
  pm_issueid: item.pm_issueid,
  pm_issuetitle: item.pm_issuetitle,
  pm_issuedescription: item.pm_issuedescription,
  pm_issuecategory: item.pm_issuecategory,
  pm_ragstatus: item.pm_ragstatus,
  pm_issueowner: item.pm_issueownername ?? (typeof item.pm_issueowner === 'string' ? item.pm_issueowner : undefined),
  pm_issuestatus: item.pm_issuestatus,
  pm_escalationstatus: item.pm_escalationstatus,
  pm_prioritylevel: item.pm_prioritylevel,
  pm_impactlevel: item.pm_impactlevel,
  pm_issuereference: item.pm_issuereference,
  pm_dateraised: item.pm_dateraised,
  pm_targetresolutiondate: item.pm_targetresolutiondate,
  pm_actualresolutiondate: item.pm_actualresolutiondate,
  pm_resolutiondetails: item.pm_resolutiondetails,
  pm_linkedrisk: item.pm_linkedrisk,
  _pm_project_value: item._pm_project_value,
  _pm_programmefk_value: item._pm_programmefk_value,
  _pm_risk_value: item._pm_risk_value,
  _pm_issueowner_value: item._pm_issueowner_value,
  statecode: item.statecode,
})

export const mapMitigationAction = (item: Pm_riskmitigationactions): RiskMitigationActionModel => ({
  pm_riskmitigationactionid: item.pm_riskmitigationactionid,
  pm_actiontitle: item.pm_actiontitle,
  pm_actiondescription: item.pm_actiondescription,
  pm_actionowner: item.pm_actionowner,
  pm_status: item.pm_status,
  pm_duedate: item.pm_duedate,
  pm_completiondate: item.pm_completiondate,
  pm_effectiveness: item.pm_effectiveness,
  pm_notes: item.pm_notes,
  _pm_risk_value: item._pm_risk_value,
  pm_riskidentifier: item.pm_riskidentifier,
  statecode: item.statecode,
})

export async function createRisk(payload: Partial<RiskModel> & { pm_projectid: string }): Promise<RiskModel | null> {
  const createPayload: Record<string, any> = {
    pm_risktitle: payload.pm_risktitle,
    pm_riskdescription: payload.pm_riskdescription,
    pm_riskcategory: payload.pm_riskcategory as any,
    pm_ragstatus: payload.pm_ragstatus as any,
    pm_riskstatus: 1,
    pm_identifieddate: new Date().toISOString().split('T')[0],
    pm_targetclosedate: payload.pm_targetclosedate,
    "pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_riskowner_value) {
    const ownerId = normalizeLookupId(payload._pm_riskowner_value)
    if (ownerId) {
      const resolvedId = await resolveRiskOwnerResourceId(ownerId)
      if (resolvedId) {
        createPayload['pm_RiskOwner@odata.bind'] = `/pm_resources(${resolvedId})`
      }
    }
  }
  const result = await Pm_risksService.create(createPayload as any)
  try { console.debug('[dataverseService] createRisk payload/result:', payload, result) } catch (e) { }
  const item = unwrapSingle<Pm_risks>(result)
  if (item && item.pm_riskid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_risks',
      recordId: item.pm_riskid,
      recordName: item.pm_risktitle || '',
      newValue: `Risk created: ${item.pm_risktitle || ''}`
    })
  }
  return item ? {
    pm_riskid: item.pm_riskid,
    pm_risktitle: item.pm_risktitle,
    pm_riskcategory: item.pm_riskcategory,
    pm_riskdescription: item.pm_riskdescription,
    pm_ragstatus: item.pm_ragstatus,
    pm_riskownername: (item as any)['_pm_riskowner_value@OData.Community.Display.V1.FormattedValue'] ?? item.pm_riskownername,
    pm_riskstatus: item.pm_riskstatus,
    pm_identifieddate: item.pm_identifieddate,
    pm_targetclosedate: item.pm_targetclosedate,
    pm_escalated: item.pm_escalated,
  } : null
}

export async function createIssue(payload: Partial<IssueModel> & { pm_projectid: string }): Promise<IssueModel | null> {
  const result = await Pm_issuesService.create({
    pm_issuetitle: payload.pm_issuetitle,
    pm_issuedescription: payload.pm_issuedescription,
    pm_issuecategory: payload.pm_issuecategory as any,
    pm_prioritylevel: payload.pm_prioritylevel as any,
    pm_ragstatus: payload.pm_ragstatus as any,
    "pm_issueOwner@odata.bind": (payload as any).pm_issueownerid ? `/pm_resources(${(payload as any).pm_issueownerid})` : undefined,
    pm_issuestatus: 0,
    pm_dateraised: new Date().toISOString().split('T')[0],
    pm_targetresolutiondate: payload.pm_targetresolutiondate,
    "pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
    statecode: 0,
    statuscode: 1,
  } as any)
  try { console.log('[dataverseService] createIssue RAW result:', JSON.stringify(result), 'isArray:', Array.isArray(result), 'dataIsArray:', Array.isArray((result as any)?.data)) } catch (e) { }
  const item = unwrapSingle<Pm_issues>(result)
  if (item && item.pm_issueid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_issues',
      recordId: item.pm_issueid,
      recordName: item.pm_issuetitle || '',
      newValue: `Issue created: ${item.pm_issuetitle || ''}`
    })
  }
  return item ? {
    pm_issueid: item.pm_issueid,
    pm_issuetitle: item.pm_issuetitle,
    pm_issuedescription: item.pm_issuedescription,
    pm_issuecategory: item.pm_issuecategory,
    pm_prioritylevel: item.pm_prioritylevel,
    pm_ragstatus: item.pm_ragstatus,
    pm_issueowner: item.pm_issueownername ?? (typeof item.pm_issueowner === 'string' ? item.pm_issueowner : undefined),
    pm_issuestatus: item.pm_issuestatus,
    pm_dateraised: item.pm_dateraised,
    pm_targetresolutiondate: item.pm_targetresolutiondate,
  } : null
}

export async function fetchMitigationActions(riskId: string): Promise<RiskMitigationActionModel[]> {
  const result = await Pm_riskmitigationactionsService.getAll({
    filter: `_pm_risk_value eq '${riskId}' and statecode eq 0`,
    select: [
      'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
      'pm_actionowner', 'pm_status', 'pm_duedate', 'pm_completiondate',
      'pm_effectiveness', 'pm_notes', '_pm_risk_value', 'pm_riskidentifier',
    ],
    orderBy: ['pm_duedate asc'],
    top: 100,
  })
  try { console.debug('[dataverseService] fetchMitigationActions result:', result, 'riskId:', riskId) } catch (e) { }
  let list = unwrapList<Pm_riskmitigationactions>(result).map(mapMitigationAction)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchMitigationActions: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) { }
    const fallbackResult = await Pm_riskmitigationactionsService.getAll({
      select: [
        'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
        'pm_actionowner', 'pm_status', 'pm_duedate', 'pm_completiondate',
        'pm_effectiveness', 'pm_notes', '_pm_risk_value', 'pm_riskidentifier',
      ],
      orderBy: ['pm_duedate asc'],
      top: 100,
    })
    list = unwrapList<Pm_riskmitigationactions>(fallbackResult).map(mapMitigationAction)
  }
  return list
}

export async function fetchAllRisks(): Promise<RiskModel[]> {
  const selectFields = [
    'pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription',
    'pm_ragstatus', 'pm_riskstatus', 'pm_escalated',
    'pm_identifieddate', 'pm_targetclosedate',
    'pm_inherentprobability', 'pm_inherentimpact', 'pm_inherentscore',
    'pm_residualprobability', 'pm_residualimpact', 'pm_residualscore',
    'pm_responsestrategy', 'pm_riskcause', 'pm_riskeffect',
    '_pm_project_value', '_pm_riskowner_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_risktitle asc'],
    top: 500,
  }
  const result = await Pm_risksService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchAllRisks result:', result) } catch (e) { }
  let list = unwrapList<Pm_risks>(result).map(mapRisk)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchAllRisks: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) { }
    const fallbackResult = await Pm_risksService.getAll(options)
    list = unwrapList<Pm_risks>(fallbackResult).map(mapRisk)
  }
  return list
}

export async function createRiskFull(payload: Partial<RiskModel>): Promise<RiskModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
      key !== '_pm_project_value' && key !== '_pm_riskowner_value' && key !== 'pm_riskowner') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
    pm_riskstatus: 1,
  }
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  if (payload._pm_riskowner_value) {
    const ownerId = normalizeLookupId(payload._pm_riskowner_value)
    if (ownerId) {
      // Resolve systemuserid → resourceid if needed
      const resolvedId = await resolveRiskOwnerResourceId(ownerId)
      if (resolvedId) {
        // Use navigation property — Dataverse rejects direct _pm_riskowner_value updates
        cleanPayload['pm_RiskOwner@odata.bind'] = `/pm_resources(${resolvedId})`
      }
    }
  }
  const result = await Pm_risksService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_risks>(result)
  if (item && item.pm_riskid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_risks',
      recordId: item.pm_riskid,
      recordName: item.pm_risktitle || '',
      newValue: `Risk created: ${item.pm_risktitle || ''}`
    })
  }
  return item ? mapRisk(item) : null
}

export async function updateRiskFull(id: string, changes: Partial<RiskModel>): Promise<RiskModel | null> {
  let original: RiskModel | null = null
  try {
    const details = await Pm_risksService.get(id, {
      select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskstatus', 'pm_escalated', 'pm_identifieddate', 'pm_targetclosedate', '_pm_riskowner_value']
    })
    const uItem = unwrapSingle<Pm_risks>(details)
    if (uItem) original = mapRisk(uItem)
  } catch (e) { }

  const SKIP_READONLY = new Set([
    'pm_riskid', '_pm_project_value', '_pm_riskowner_value', 'pm_riskowner',
    // Read-only display names that Dataverse rejects on update
    'pm_riskownername', 'pm_projectname', 'pm_riskcategoryname', 'pm_ragstatusname',
    'pm_riskstatusname', 'pm_inherentprobabilityname', 'pm_inherentimpactname',
    'pm_residualprobabilityname', 'pm_residualimpactname', 'pm_responsestrategyname',
    'statecodename', 'statuscodename', 'pm_escalatedname',
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && !SKIP_READONLY.has(key)) {
      cleanPayload[key] = value
    }
  }
  console.log('[updateRiskFull] changes._pm_riskowner_value:', changes._pm_riskowner_value)
  if (changes._pm_riskowner_value) {
    const ownerId = normalizeLookupId(changes._pm_riskowner_value)
    console.log('[updateRiskFull] normalized ownerId:', ownerId)
    if (ownerId) {
      // Resolve systemuserid → resourceid if needed
      const resolvedId = await resolveRiskOwnerResourceId(ownerId)
      console.log('[updateRiskFull] resolvedId to use:', resolvedId)
      if (resolvedId) {
        // Use navigation property — Dataverse rejects direct _pm_riskowner_value updates
        cleanPayload['pm_RiskOwner@odata.bind'] = `/pm_resources(${resolvedId})`
        console.log('[updateRiskFull] Added risk owner to cleanPayload via @odata.bind')
      } else {
        console.warn('[updateRiskFull] ✗ resolveRiskOwnerResourceId returned null - risk owner will NOT be in payload!')
      }
    }
  } else {
    console.log('[updateRiskFull] No _pm_riskowner_value in changes, skipping owner resolution')
  }
  
  console.log('[updateRiskFull] Final cleanPayload being sent:', JSON.stringify(cleanPayload))
  const result = await Pm_risksService.update(id, cleanPayload as any)
  console.log('[updateRiskFull] Pm_risksService.update result:', JSON.stringify(result))
  const item = unwrapSingle<Pm_risks>(result)
  console.log('[updateRiskFull] unwrapped item:', item ? 'found' : 'null')

  // Log audit entries for changed fields
  if (original) {
    const formatVal = (val: any): string => {
      if (val === undefined || val === null) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
    }

    for (const [key, value] of Object.entries(changes)) {
      if (key === 'pm_riskid') continue
      const oldVal = (original as any)[key]
      if (formatVal(oldVal) !== formatVal(value)) {
        const isStatus = key === 'pm_riskstatus' || key === 'statecode'
        writeAuditLog({
          actionType: isStatus ? 'StatusChange' : 'Update',
          entityName: 'pm_risks',
          recordId: id,
          recordName: original.pm_risktitle || '',
          fieldName: key,
          oldValue: formatVal(oldVal),
          newValue: formatVal(value)
        })
      }
    }
  }

  return item ? mapRisk(item) : null
}

export async function deleteRisk(id: string): Promise<void> {
  let recordName = id
  try {
    const details = await Pm_risksService.get(id, { select: ['pm_risktitle'] })
    const uItem = unwrapSingle<Pm_risks>(details)
    if (uItem?.pm_risktitle) recordName = uItem.pm_risktitle
  } catch (e) { }

  await Pm_risksService.delete(id)

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_risks',
    recordId: id,
    recordName: recordName,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted'
  })
}

/**
 * Fetch issues where the issue owner (resource lookup) matches the resource
 * linked to the given system user ID.
 * Chain: systemuser → pm_resources._pm_systemuser_value → pm_issues._pm_issueowner_value
 */
export async function fetchIssuesForSystemUser(systemUserId: string): Promise<IssueModel[]> {
  try {
    // Step 1: Find the resource linked to this system user
    const { Pm_resourcesService } = await import('@/generated')
    const resourcesResult = await Pm_resourcesService.getAll({
      filter: `_pm_systemuser_value eq '${systemUserId}' and statecode eq 0`,
      select: ['pm_resourceid', 'pm_fullname'],
      top: 1,
    })
    const resources = unwrapList<any>(resourcesResult)
    if (resources.length === 0) {
      console.warn('[risk-issue.service] fetchIssuesForSystemUser: no resource found for system user', systemUserId)
      return []
    }
    const resourceId = resources[0].pm_resourceid
    if (!resourceId) return []

    // Step 2: Fetch issues where _pm_issueowner_value matches this resource
    const selectFields = [
      'pm_issueid', 'pm_issuetitle', 'pm_issuedescription',
      'pm_issuecategory', 'pm_ragstatus',
      'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel',
      'pm_impactlevel', 'pm_issuereference',
      'pm_dateraised', 'pm_targetresolutiondate',
      'pm_actualresolutiondate', 'pm_resolutiondetails',
      'pm_linkedrisk', '_pm_project_value', '_pm_programmefk_value',
      '_pm_issueowner_value',
    ]
    const result = await Pm_issuesService.getAll({
      filter: `_pm_issueowner_value eq '${resourceId}' and statecode eq 0`,
      select: selectFields,
      orderBy: ['pm_dateraised desc'],
      top: 500,
    })
    try { console.debug('[dataverseService] fetchIssuesForSystemUser result:', result, 'resourceId:', resourceId) } catch (e) { }
    return unwrapList<Pm_issues>(result).map(mapIssue)
  } catch (err) {
    console.error('[risk-issue.service] fetchIssuesForSystemUser failed:', err)
    return []
  }
}

export async function fetchAllIssues(): Promise<IssueModel[]> {
  const selectFields = [
    'pm_issueid', 'pm_issuetitle', 'pm_issuedescription',
    'pm_issuecategory', 'pm_ragstatus',
    'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel',
    'pm_impactlevel', 'pm_issuereference',
    'pm_dateraised', 'pm_targetresolutiondate',
    'pm_actualresolutiondate', 'pm_resolutiondetails', 'pm_linkedrisk', '_pm_project_value', '_pm_programmefk_value',
    '_pm_issueowner_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_dateraised desc'],
    top: 500,
  }
  const result = await Pm_issuesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchAllIssues result:', result) } catch (e) { }
  let list = unwrapList<Pm_issues>(result).map(mapIssue)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchAllIssues: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) { }
    const fallbackResult = await Pm_issuesService.getAll(options)
    list = unwrapList<Pm_issues>(fallbackResult).map(mapIssue)
  }
  return list
}

export async function createIssueFull(payload: Partial<IssueModel>): Promise<IssueModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
      key !== '_pm_project_value' && key !== '_pm_programmefk_value' && key !== '_pm_issueowner_value' && key !== '_pm_risk_value' && key !== 'pm_issueowner') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  if (payload._pm_programmefk_value) {
    const programmeId = normalizeLookupId(payload._pm_programmefk_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeFK@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  if (payload._pm_issueowner_value) {
    const resourceId = normalizeLookupId(payload._pm_issueowner_value)
    if (resourceId) {
      cleanPayload['pm_issueOwner@odata.bind'] = `/pm_resources(${resourceId})`
    }
  }
  if (payload._pm_risk_value) {
    const riskId = normalizeLookupId(payload._pm_risk_value)
    if (riskId) {
      cleanPayload['pm_risk@odata.bind'] = `/pm_risks(${riskId})`
    }
  }
  const result = await Pm_issuesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createIssueFull payload/result:', cleanPayload, result) } catch (e) { }
  const item = unwrapSingle<Pm_issues>(result)
  if (item && item.pm_issueid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_issues',
      recordId: item.pm_issueid,
      recordName: item.pm_issuetitle || '',
      newValue: `Issue created: ${item.pm_issuetitle || ''}`
    })
  }
  return item ? mapIssue(item) : null
}

export async function updateIssueFull(id: string, changes: Partial<IssueModel>): Promise<IssueModel | null> {
  let original: IssueModel | null = null
  try {
    const details = await Pm_issuesService.get(id, {
      select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel', 'pm_impactlevel', 'pm_issuereference', 'pm_dateraised', 'pm_targetresolutiondate']
    })
    const uItem = unwrapSingle<Pm_issues>(details)
    if (uItem) original = mapIssue(uItem)
  } catch (e) { }

  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
      key !== 'pm_issueid' && key !== '_pm_project_value' && key !== '_pm_programmefk_value' && key !== '_pm_issueowner_value' && key !== '_pm_risk_value' && key !== 'pm_issueowner') {
      cleanPayload[key] = value
    }
  }
  if (changes._pm_project_value) {
    const projectId = normalizeLookupId(changes._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  if (changes._pm_programmefk_value) {
    const programmeId = normalizeLookupId(changes._pm_programmefk_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeFK@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  if (changes._pm_issueowner_value) {
    const resourceId = normalizeLookupId(changes._pm_issueowner_value)
    if (resourceId) {
      cleanPayload['pm_issueOwner@odata.bind'] = `/pm_resources(${resourceId})`
    }
  }
  if (changes._pm_risk_value) {
    const riskId = normalizeLookupId(changes._pm_risk_value)
    if (riskId) {
      cleanPayload['pm_risk@odata.bind'] = `/pm_risks(${riskId})`
    }
  }
  const result = await Pm_issuesService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateIssueFull id/changes/result:', id, cleanPayload, result) } catch (e) { }
  const item = unwrapSingle<Pm_issues>(result)

  // Log audit entries for changed fields
  if (original) {
    const formatVal = (val: any): string => {
      if (val === undefined || val === null) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
    }

    for (const [key, value] of Object.entries(changes)) {
      if (key === 'pm_issueid') continue
      const oldVal = (original as any)[key]
      if (formatVal(oldVal) !== formatVal(value)) {
        const isStatus = key === 'pm_issuestatus' || key === 'statecode'
        writeAuditLog({
          actionType: isStatus ? 'StatusChange' : 'Update',
          entityName: 'pm_issues',
          recordId: id,
          recordName: original.pm_issuetitle || '',
          fieldName: key,
          oldValue: formatVal(oldVal),
          newValue: formatVal(value)
        })
      }
    }
  }

  return item ? mapIssue(item) : null
}

export async function deleteIssue(id: string): Promise<void> {
  let recordName = id
  try {
    const details = await Pm_issuesService.get(id, { select: ['pm_issuetitle'] })
    const uItem = unwrapSingle<Pm_issues>(details)
    if (uItem?.pm_issuetitle) recordName = uItem.pm_issuetitle
  } catch (e) { }

  try { console.debug('[dataverseService] deleteIssue id:', id) } catch (e) { }
  await Pm_issuesService.delete(id)

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_issues',
    recordId: id,
    recordName: recordName,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted'
  })
}
