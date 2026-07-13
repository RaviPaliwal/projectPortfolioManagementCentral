import {
  Pm_risksService,
  Pm_issuesService,
  Pm_riskmitigationactionsService,
  Pm_projectsService,
  Pm_programmesService,
  Pm_portfoliosService,
} from '@/generated'
import { sendNotificationToUser } from './notification.service'
import { writeAuditLog } from './changelog.service'
import { fetchResourceBySystemUserId } from './resource.service'
import type { Pm_risks } from '@/generated/models/Pm_risksModel'
import type { Pm_issues } from '@/generated/models/Pm_issuesModel'
import type { Pm_riskmitigationactions } from '@/generated/models/Pm_riskmitigationactionsModel'
import type { Pm_resources } from '@/generated/models/Pm_resourcesModel'
import type {
  RiskModel,
  IssueModel,
  RiskMitigationActionModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId, resolveResourceIdForSystemUser } from './common'
import type { IGetAllOptions } from '@/generated/models/CommonModels'

/**
 * Resolve a risk owner identifier to a resource GUID.
 * The input may be either a systemuserid (from user-select-id form field)
 * or a pm_resourceid. This function ensures we always bind to the resources table.
 */
async function resolveRiskOwnerResourceId(id: string): Promise<string | null> {
  // Try 1: see if it's already a resource ID
  try {
    const { Pm_resourcesService: LocalResourcesService } = await import('@/generated')
    const byId = await LocalResourcesService.get(id, {
      select: ['pm_resourceid'],
    })
    if (byId.success) {
      const direct = unwrapSingle<Pm_resources>(byId)
      if (direct?.pm_resourceid) {
        return direct.pm_resourceid
      }
    }
  } catch (err) {
    console.error('[RiskIssueService] resolveRiskOwnerResourceId Try 1 failed:', err)
  }

  // Try 2: resolve systemuser → resource
  try {
    const resource = await fetchResourceBySystemUserId(id)
    if (resource?.pm_resourceid) {
      return resource.pm_resourceid
    }
  } catch (err) {
    console.error('[RiskIssueService] resolveRiskOwnerResourceId Try 2 failed:', err)
  }

  return null
}

import { applySecurityMasking } from './security'

export const mapRisk = (item: Pm_risks): RiskModel => {
  const rawItem = item as unknown as Record<string, unknown>
  const logicalName = rawItem['_pm_regardingid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] as string | undefined
  const navProp = rawItem['_pm_regardingid_value@Microsoft.Dynamics.CRM.associatednavigationproperty'] as string | undefined
  const targetType = logicalName || navProp
  const regardingType = (targetType === 'pm_project' || targetType === 'pm_projects')
    ? 'pm_projects'
    : (targetType === 'pm_programme' || targetType === 'pm_programmes' || targetType === 'pm_ProgrammeFK')
    ? 'pm_programmes'
    : (targetType === 'pm_portfolio' || targetType === 'pm_portfolios')
    ? 'pm_portfolios'
    : undefined

  const mapped: RiskModel = {
    pm_riskid: item.pm_riskid,
    pm_risktitle: item.pm_risktitle,
    pm_riskcategory: item.pm_riskcategory,
    pm_riskdescription: item.pm_riskdescription,
    pm_ragstatus: item.pm_ragstatus,
    pm_riskownername: (rawItem['_pm_riskowner_value@OData.Community.Display.V1.FormattedValue'] as string | undefined) ?? item.pm_riskownername,
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
    pm_projectname: rawItem['_pm_regardingid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined,
    _pm_project_value: item._pm_regardingid_value && regardingType === 'pm_projects' ? item._pm_regardingid_value : item._pm_project_value,
    _pm_regardingid_value: item._pm_regardingid_value,
    pm_regardingidtype: regardingType,
    _pm_riskowner_value: item._pm_riskowner_value,
    statecode: item.statecode,
  }
  return applySecurityMasking(mapped, 'risk')
}

export const mapIssue = (item: Pm_issues): IssueModel => {
  const rawItem = item as unknown as Record<string, unknown>
  const logicalName = rawItem['_pm_regardingid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] as string | undefined
  const navProp = rawItem['_pm_regardingid_value@Microsoft.Dynamics.CRM.associatednavigationproperty'] as string | undefined
  const targetType = logicalName || navProp
  const regardingType = (targetType === 'pm_project' || targetType === 'pm_projects')
    ? 'pm_projects'
    : (targetType === 'pm_programme' || targetType === 'pm_programmes' || targetType === 'pm_ProgrammeFK')
    ? 'pm_programmes'
    : (targetType === 'pm_portfolio' || targetType === 'pm_portfolios')
    ? 'pm_portfolios'
    : undefined

  return {
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
    _pm_project_value: item._pm_regardingid_value && regardingType === 'pm_projects' ? item._pm_regardingid_value : item._pm_project_value,
    _pm_programmefk_value: item._pm_regardingid_value && regardingType === 'pm_programmes' ? item._pm_regardingid_value : item._pm_programmefk_value,
    _pm_regardingid_value: item._pm_regardingid_value,
    pm_regardingidtype: regardingType,
    _pm_issueowner_value: item._pm_issueowner_value,
    statecode: item.statecode,
    modifiedon: item.modifiedon,
  }
}

export const mapMitigationAction = (item: Pm_riskmitigationactions): RiskMitigationActionModel => ({
  pm_riskmitigationactionid: item.pm_riskmitigationactionid,
  pm_actiontitle: item.pm_actiontitle,
  pm_actiondescription: item.pm_actiondescription,
  pm_actionowner: item.owneridname,
  pm_status: item.pm_status,
  pm_duedate: item.pm_duedate,
  pm_completiondate: item.pm_completiondate,
  pm_effectiveness: item.pm_effectiveness,
  pm_notes: item.pm_notes,
  _pm_risk_value: item._pm_risk_value,
  pm_riskidentifier: item.pm_riskname,
  statecode: item.statecode,
})

export async function createRisk(payload: Partial<RiskModel> & { pm_projectid: string }): Promise<RiskModel | null> {
  try {
    const createPayload: Record<string, unknown> = {
      pm_risktitle: payload.pm_risktitle,
      pm_riskdescription: payload.pm_riskdescription,
      pm_riskcategory: payload.pm_riskcategory,
      pm_ragstatus: payload.pm_ragstatus,
      pm_riskstatus: 1,
      pm_identifieddate: new Date().toISOString().split('T')[0],
      pm_targetclosedate: payload.pm_targetclosedate,
      "pm_RegardingId_pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
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
    const result = await Pm_risksService.create(createPayload as unknown as Pm_risks)
    if (!result.success) {
      console.error('[RiskIssueService] createRisk failed:', result.error)
      throw new Error(`Failed to create risk: ${result.error?.message || 'Unknown error'}`)
    }
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
      pm_riskownername: ((item as unknown as Record<string, unknown>)['_pm_riskowner_value@OData.Community.Display.V1.FormattedValue'] as string | undefined) ?? item.pm_riskownername,
      pm_riskstatus: item.pm_riskstatus,
      pm_identifieddate: item.pm_identifieddate,
      pm_targetclosedate: item.pm_targetclosedate,
      pm_escalated: item.pm_escalated,
    } : null
  } catch (err) {
    console.error('[RiskIssueService] createRisk exception:', err)
    throw err
  }
}

export async function createIssue(payload: Partial<IssueModel> & { pm_projectid: string }): Promise<IssueModel | null> {
  try {
    const rawPayload = payload as Record<string, unknown>
    const result = await Pm_issuesService.create({
      pm_issuetitle: payload.pm_issuetitle,
      pm_issuedescription: payload.pm_issuedescription,
      pm_issuecategory: payload.pm_issuecategory,
      pm_prioritylevel: payload.pm_prioritylevel,
      pm_ragstatus: payload.pm_ragstatus,
      "pm_issueOwner@odata.bind": rawPayload.pm_issueownerid ? `/pm_resources(${rawPayload.pm_issueownerid})` : undefined,
      pm_issuestatus: 0,
      pm_dateraised: new Date().toISOString().split('T')[0],
      pm_targetresolutiondate: payload.pm_targetresolutiondate,
      "pm_RegardingId_pm_project@odata.bind": `/pm_projects(${payload.pm_projectid})`,
      statecode: 0,
      statuscode: 1,
    } as unknown as Pm_issues)

    if (!result.success) {
      console.error('[RiskIssueService] createIssue failed:', result.error)
      throw new Error(`Failed to create issue: ${result.error?.message || 'Unknown error'}`)
    }

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
  } catch (err) {
    console.error('[RiskIssueService] createIssue exception:', err)
    throw err
  }
}

export async function fetchMitigationActions(riskId: string): Promise<RiskMitigationActionModel[]> {
  try {
    const options: IGetAllOptions = {
      select: [
        'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
        'ownerid', 'pm_status', 'pm_duedate', 'pm_completiondate',
        'pm_effectiveness', 'pm_notes', '_pm_risk_value',
      ],
      orderBy: ['pm_duedate asc'],
      top: 100,
    }
    const result = await Pm_riskmitigationactionsService.getAll({
      ...options,
      filter: `_pm_risk_value eq '${riskId}' and statecode eq 0`,
    })
    if (!result.success) {
      console.error('[RiskIssueService] fetchMitigationActions failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_riskmitigationactions>(result).map(mapMitigationAction)
    if (list.length === 0) {
      const fallbackResult = await Pm_riskmitigationactionsService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_riskmitigationactions>(fallbackResult).map(mapMitigationAction)
      }
    }
    return list
  } catch (err) {
    console.error('[RiskIssueService] fetchMitigationActions exception:', err)
    return []
  }
}

export async function fetchAllRisks(): Promise<RiskModel[]> {
  try {
    const selectFields = [
      'pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription',
      'pm_ragstatus', 'pm_riskstatus', 'pm_escalated',
      'pm_identifieddate', 'pm_targetclosedate',
      'pm_inherentprobability', 'pm_inherentimpact', 'pm_inherentscore',
      'pm_residualprobability', 'pm_residualimpact', 'pm_residualscore',
      'pm_responsestrategy', 'pm_riskcause', 'pm_riskeffect',
      '_pm_regardingid_value', '_pm_riskowner_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['createdon desc'],
      top: 500,
    }
    const result = await Pm_risksService.getAll({ ...options, filter: 'statecode eq 0' })
    if (!result.success) {
      console.error('[RiskIssueService] fetchAllRisks failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_risks>(result).map(mapRisk)
    if (list.length === 0) {
      const fallbackResult = await Pm_risksService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_risks>(fallbackResult).map(mapRisk)
      }
    }
    return list
  } catch (err) {
    console.error('[RiskIssueService] fetchAllRisks exception:', err)
    return []
  }
}

/**
 * Fetch risks for a system user based on their own allocations or owned risks.
 */
export async function fetchRisksForSystemUser(systemUserId: string): Promise<RiskModel[]> {
  try {
    const resourceId = await resolveResourceIdForSystemUser(systemUserId)
    if (!resourceId) return []

    // 1. Fetch allocated project IDs
    const { Pm_resourceallocationsService } = await import('@/generated')
    const allocResult = await Pm_resourceallocationsService.getAll({
      filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
      select: ['_pm_project_value'],
      top: 500,
    })
    const allocations = allocResult.success ? unwrapList<any>(allocResult) : []
    const projectIds = Array.from(new Set(allocations.map(a => a._pm_project_value).filter(Boolean))) as string[]

    // 2. Build filters: (projects allocated) OR (owned risks)
    const conditions: string[] = [`_pm_riskowner_value eq '${resourceId}'`]
    if (projectIds.length > 0) {
      const projectConditions = projectIds.map(id => `_pm_regardingid_value eq '${id}'`).join(' or ')
      conditions.push(`(${projectConditions})`)
    }
    const filterStr = `statecode eq 0 and (${conditions.join(' or ')})`

    const selectFields = [
      'pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription',
      'pm_ragstatus', 'pm_riskstatus', 'pm_escalated',
      'pm_identifieddate', 'pm_targetclosedate',
      'pm_inherentprobability', 'pm_inherentimpact', 'pm_inherentscore',
      'pm_residualprobability', 'pm_residualimpact', 'pm_residualscore',
      'pm_responsestrategy', 'pm_riskcause', 'pm_riskeffect',
      '_pm_regardingid_value', '_pm_riskowner_value',
    ]

    const result = await Pm_risksService.getAll({
      filter: filterStr,
      select: selectFields,
      orderBy: ['createdon desc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[RiskIssueService] fetchRisksForSystemUser failed:', result.error)
      return []
    }
    return unwrapList<Pm_risks>(result).map(mapRisk)
  } catch (err) {
    console.error('[RiskIssueService] fetchRisksForSystemUser exception:', err)
    return []
  }
}

export async function createRiskFull(payload: Partial<RiskModel>): Promise<RiskModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_riskowner_value' && key !== 'pm_riskowner' &&
        key !== '_pm_regardingid_value' && key !== 'pm_regardingidtype') {
        cleanPayload[key] = value
      }
    }
    const defaults: Record<string, unknown> = {
      statecode: 0,
      statuscode: 1,
      pm_riskstatus: 1,
    }
    const regardingId = normalizeLookupId(payload._pm_regardingid_value || payload._pm_project_value)
    const regardingType = payload.pm_regardingidtype || 'pm_projects'
    if (regardingId) {
      const typeSuffix = regardingType === 'pm_projects' ? 'pm_project' :
                         regardingType === 'pm_programmes' ? 'pm_programme' : 'pm_portfolio'
      cleanPayload[`pm_RegardingId_${typeSuffix}@odata.bind`] = `/${regardingType}(${regardingId})`
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
    const result = await Pm_risksService.create({ ...defaults, ...cleanPayload } as unknown as Pm_risks)
    if (!result.success) {
      console.error('[RiskIssueService] createRiskFull failed:', result.error)
      throw new Error(`Failed to create risk: ${result.error?.message || 'Unknown error'}`)
    }
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
  } catch (err) {
    console.error('[RiskIssueService] createRiskFull exception:', err)
    throw err
  }
}

export async function updateRiskFull(id: string, changes: Partial<RiskModel>): Promise<RiskModel | null> {
  try {
    let original: RiskModel | null = null
    try {
      const details = await Pm_risksService.get(id, {
        select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskstatus', 'pm_escalated', 'pm_identifieddate', 'pm_targetclosedate', '_pm_riskowner_value', '_pm_regardingid_value']
      })
      if (details.success) {
        const uItem = unwrapSingle<Pm_risks>(details)
        if (uItem) original = mapRisk(uItem)
      }
    } catch (e) {
      console.error('[RiskIssueService] updateRiskFull oldRecord fetch failed:', e)
    }

    const SKIP_READONLY = new Set([
      'pm_riskid', '_pm_project_value', '_pm_riskowner_value', 'pm_riskowner',
      '_pm_regardingid_value', 'pm_regardingidtype',
      // Read-only display names that Dataverse rejects on update
      'pm_riskownername', 'pm_projectname', 'pm_riskcategoryname', 'pm_ragstatusname',
      'pm_riskstatusname', 'pm_inherentprobabilityname', 'pm_inherentimpactname',
      'pm_residualprobabilityname', 'pm_residualimpactname', 'pm_responsestrategyname',
      'statecodename', 'statuscodename', 'pm_escalatedname',
    ])
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null && !SKIP_READONLY.has(key)) {
        cleanPayload[key] = value
      }
    }
    const regardingId = normalizeLookupId(changes._pm_regardingid_value || changes._pm_project_value)
    const regardingType = changes.pm_regardingidtype || (changes._pm_project_value ? 'pm_projects' : undefined)
    if (regardingId && regardingType) {
      const typeSuffix = regardingType === 'pm_projects' ? 'pm_project' :
                         regardingType === 'pm_programmes' ? 'pm_programme' : 'pm_portfolio'
      cleanPayload[`pm_RegardingId_${typeSuffix}@odata.bind`] = `/${regardingType}(${regardingId})`
    }
    if (changes._pm_riskowner_value) {
      const ownerId = normalizeLookupId(changes._pm_riskowner_value)
      if (ownerId) {
        // Resolve systemuserid → resourceid if needed
        const resolvedId = await resolveRiskOwnerResourceId(ownerId)
        if (resolvedId) {
          // Use navigation property — Dataverse rejects direct _pm_riskowner_value updates
          cleanPayload['pm_RiskOwner@odata.bind'] = `/pm_resources(${resolvedId})`
        }
      }
    }

    const result = await Pm_risksService.update(id, cleanPayload as unknown as Pm_risks)
    if (!result.success) {
      console.error('[RiskIssueService] updateRiskFull failed:', result.error)
      throw new Error(`Failed to update risk: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_risks>(result)

    // Log audit entries for changed fields
    if (original) {
      const formatVal = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }


      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_riskid') continue
        const oldVal = (original as Record<string, unknown>)[key]
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

    if (changes.pm_escalated === true && original && original.pm_escalated !== true) {
      try {
        const regardingId = normalizeLookupId(original._pm_regardingid_value)
        const regardingType = original.pm_regardingidtype

        if (regardingId && regardingType) {
          if (regardingType === 'pm_projects') {
            const projRes = await Pm_projectsService.get(regardingId, { select: ['pm_projectid', 'pm_projectname', '_pm_projectmanager_value'] })
            if (projRes.success) {
              const proj = unwrapSingle<any>(projRes)
              if (proj && proj._pm_projectmanager_value) {
                await sendNotificationToUser(
                  proj._pm_projectmanager_value,
                  'Teams',
                  'CRITICAL: Risk Escalation Alert',
                  `CRITICAL: Risk "${original.pm_risktitle || 'Risk'}" has been escalated for project "${proj.pm_projectname || ''}". Please review details immediately.`
                )
              }
            }
          } else if (regardingType === 'pm_programmes') {
            const progRes = await Pm_programmesService.get(regardingId, { select: ['pm_programmeid', 'pm_programmename', '_pm_programmemanager_value'] })
            if (progRes.success) {
              const prog = unwrapSingle<any>(progRes)
              if (prog && prog._pm_programmemanager_value) {
                await sendNotificationToUser(
                  prog._pm_programmemanager_value,
                  'Teams',
                  'CRITICAL: Risk Escalation Alert',
                  `CRITICAL: Risk "${original.pm_risktitle || 'Risk'}" has been escalated for programme "${prog.pm_programmename || ''}". Please review details immediately.`
                )
              }
            }
          } else if (regardingType === 'pm_portfolios') {
            const portRes = await Pm_portfoliosService.get(regardingId, { select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value'] })
            if (portRes.success) {
              const port = unwrapSingle<any>(portRes)
              if (port && port._pm_ownerlookup_value) {
                await sendNotificationToUser(
                  port._pm_ownerlookup_value,
                  'Teams',
                  'CRITICAL: Risk Escalation Alert',
                  `CRITICAL: Risk "${original.pm_risktitle || 'Risk'}" has been escalated for portfolio "${port.pm_portfolioname || ''}". Please review details immediately.`
                )
              }
            }
          }
        }
      } catch (notifErr) {
        console.error('[RiskIssueService] Failed to send risk escalation notification:', notifErr)
      }
    }

    return item ? mapRisk(item) : null
  } catch (err) {
    console.error('[RiskIssueService] updateRiskFull exception:', err)
    throw err
  }
}

export async function deleteRisk(id: string): Promise<void> {
  try {
    let recordName = id
    try {
      const details = await Pm_risksService.get(id, { select: ['pm_risktitle'] })
      if (details.success) {
        const uItem = unwrapSingle<Pm_risks>(details)
        if (uItem?.pm_risktitle) recordName = uItem.pm_risktitle
      }
    } catch (e) {
      console.error('[RiskIssueService] deleteRisk details fetch exception:', e)
    }

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
  } catch (err) {
    console.error('[RiskIssueService] deleteRisk exception:', err)
    throw err
  }
}

/**
 * Fetch issues where the issue owner (resource lookup) matches the resource
 * linked to the given system user ID.
 * Chain: systemuser → pm_resources._pm_systemuser_value → pm_issues._pm_issueowner_value
 */
export async function fetchIssuesForSystemUser(systemUserId: string): Promise<IssueModel[]> {
  try {
    // Step 1: Find the resource linked to this system user
    const { Pm_resourcesService: LocalResourcesService } = await import('@/generated')
    const resourcesResult = await LocalResourcesService.getAll({
      filter: `_pm_systemuser_value eq '${systemUserId}' and statecode eq 0`,
      select: ['pm_resourceid', 'pm_fullname'],
      top: 1,
    })
    if (!resourcesResult.success) {
      console.error('[RiskIssueService] fetchIssuesForSystemUser resources failed:', resourcesResult.error)
      return []
    }
    const resources = unwrapList<Pm_resources>(resourcesResult)
    if (resources.length === 0) return []
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
      'pm_linkedrisk', '_pm_regardingid_value',
      '_pm_issueowner_value',
    ]
    const result = await Pm_issuesService.getAll({
      filter: `_pm_issueowner_value eq '${resourceId}' and statecode eq 0`,
      select: selectFields,
      orderBy: ['createdon desc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[RiskIssueService] fetchIssuesForSystemUser issues failed:', result.error)
      return []
    }
    return unwrapList<Pm_issues>(result).map(mapIssue)
  } catch (err) {
    console.error('[risk-issue.service] fetchIssuesForSystemUser failed:', err)
    return []
  }
}

export async function fetchAllIssues(): Promise<IssueModel[]> {
  try {
    const selectFields = [
      'pm_issueid', 'pm_issuetitle', 'pm_issuedescription',
      'pm_issuecategory', 'pm_ragstatus',
      'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel',
      'pm_impactlevel', 'pm_issuereference',
      'pm_dateraised', 'pm_targetresolutiondate',
      'pm_actualresolutiondate', 'pm_resolutiondetails', 'pm_linkedrisk',
      '_pm_regardingid_value',
      '_pm_issueowner_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['createdon desc'],
      top: 500,
    }
    const result = await Pm_issuesService.getAll({ ...options, filter: 'statecode eq 0' })
    if (!result.success) {
      console.error('[RiskIssueService] fetchAllIssues failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_issues>(result).map(mapIssue)
    if (list.length === 0) {
      const fallbackResult = await Pm_issuesService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_issues>(fallbackResult).map(mapIssue)
      }
    }
    return list
  } catch (err) {
    console.error('[RiskIssueService] fetchAllIssues exception:', err)
    return []
  }
}

const SKIP_FIELDS = new Set([
  'pm_issueid',
  'pm_project',
  '_pm_project_value',
  'pm_programmefk',
  '_pm_programmefk_value',
  'pm_issueowner',
  '_pm_issueowner_value',
  'pm_risk',
  '_pm_risk_value',
  'pm_regardingid',
  '_pm_regardingid_value',
  'pm_regardingidtype',
  'pm_projectname',
  'pm_programmefkname',
  'pm_issueownername',
  'pm_riskname',
  'pm_regardingidname',
  'ownerid',
  'owneridtype',
  'owneridname',
  'createdon',
  'createdby',
  'modifiedon',
  'modifiedby',
  'owningbusinessunit',
  '_owningbusinessunit_value',
  'owningteam',
  '_owningteam_value',
  'owninguser',
  '_owninguser_value',
  'pm_linkedrisk',
  'pm_linkedriskname',
])

export async function createIssueFull(payload: Partial<IssueModel>): Promise<IssueModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' && !SKIP_FIELDS.has(key) && !key.startsWith('_') && !key.endsWith('name') && typeof value !== 'object') {
        if (key === 'pm_escalationstatus') {
          cleanPayload[key] = value === 'true' || value === '1' || value === 1 || value === true
        } else if (['pm_issuecategory', 'pm_issuestatus', 'pm_prioritylevel', 'pm_impactlevel', 'pm_ragstatus'].includes(key)) {
          cleanPayload[key] = typeof value === 'string' ? Number(value) : value
        } else {
          cleanPayload[key] = value
        }
      }
    }
    const defaults: Record<string, unknown> = {
      statecode: 0,
      statuscode: 1,
    }
    if (payload._pm_regardingid_value && payload.pm_regardingidtype) {
      const regardingId = normalizeLookupId(payload._pm_regardingid_value)
      if (regardingId) {
        const typeSuffix = payload.pm_regardingidtype === 'pm_projects'
          ? 'pm_project'
          : payload.pm_regardingidtype === 'pm_programmes'
          ? 'pm_programme'
          : 'pm_portfolio'
        cleanPayload[`pm_RegardingId_${typeSuffix}@odata.bind`] = `/${payload.pm_regardingidtype}(${regardingId})`
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
    const result = await Pm_issuesService.create({ ...defaults, ...cleanPayload } as unknown as Pm_issues)
    if (!result.success) {
      console.error('[RiskIssueService] createIssueFull failed:', result.error)
      throw new Error(`Failed to create issue: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_issues>(result)
    if (item && item.pm_issueid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_issues',
        recordId: item.pm_issueid,
        recordName: item.pm_issuetitle || 'Issue',
      })
    }
    return item ? mapIssue(item) : null
  } catch (err) {
    console.error('[RiskIssueService] createIssueFull exception:', err)
    throw err
  }
}

export async function updateIssueFull(id: string, changes: Partial<IssueModel>): Promise<IssueModel | null> {
  try {
    let original: IssueModel | null = null
    try {
      const details = await Pm_issuesService.get(id, {
        select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel', 'pm_impactlevel', 'pm_issuereference', 'pm_dateraised', 'pm_targetresolutiondate']
      })
      if (details.success) {
        const uItem = unwrapSingle<Pm_issues>(details)
        if (uItem) original = mapIssue(uItem)
      }
    } catch (e) {
      console.error('[RiskIssueService] updateIssueFull oldRecord fetch failed:', e)
    }

    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null && !SKIP_FIELDS.has(key) && !key.startsWith('_') && !key.endsWith('name') && typeof value !== 'object') {
        if (key === 'pm_escalationstatus') {
          cleanPayload[key] = value === 'true' || value === '1' || value === 1 || value === true
        } else if (['pm_issuecategory', 'pm_issuestatus', 'pm_prioritylevel', 'pm_impactlevel', 'pm_ragstatus'].includes(key)) {
          cleanPayload[key] = typeof value === 'string' ? Number(value) : value
        } else {
          cleanPayload[key] = value
        }
      }
    }
    if (changes._pm_regardingid_value && changes.pm_regardingidtype) {
      const regardingId = normalizeLookupId(changes._pm_regardingid_value)
      if (regardingId) {
        const typeSuffix = changes.pm_regardingidtype === 'pm_projects'
          ? 'pm_project'
          : changes.pm_regardingidtype === 'pm_programmes'
          ? 'pm_programme'
          : 'pm_portfolio'
        cleanPayload[`pm_RegardingId_${typeSuffix}@odata.bind`] = `/${changes.pm_regardingidtype}(${regardingId})`
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
    console.log('[RiskIssueService] updateIssueFull cleanPayload:', cleanPayload)
    const result = await Pm_issuesService.update(id, cleanPayload as unknown as Pm_issues)
    if (!result.success) {
      console.error('[RiskIssueService] updateIssueFull failed:', result.error)
      throw new Error(`Failed to update issue: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_issues>(result)

    // Log audit entries for changed fields
    if (original) {
      const formatVal = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }


      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_issueid') continue
        const oldVal = (original as Record<string, unknown>)[key]
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

    if (changes.pm_escalationstatus === true && original && original.pm_escalationstatus !== true) {
      try {
        const regardingId = normalizeLookupId(original._pm_regardingid_value)
        const regardingType = original.pm_regardingidtype

        if (regardingId && regardingType) {
          if (regardingType === 'pm_projects') {
            const projRes = await Pm_projectsService.get(regardingId, { select: ['pm_projectid', 'pm_projectname', '_pm_projectmanager_value'] })
            if (projRes.success) {
              const proj = unwrapSingle<any>(projRes)
              if (proj && proj._pm_projectmanager_value) {
                await sendNotificationToUser(
                  proj._pm_projectmanager_value,
                  'Teams',
                  'CRITICAL: Issue Escalation Alert',
                  `CRITICAL: Issue "${original.pm_issuetitle || 'Issue'}" has been escalated for project "${proj.pm_projectname || ''}". Please review details immediately.`
                )
              }
            }
          } else if (regardingType === 'pm_programmes') {
            const progRes = await Pm_programmesService.get(regardingId, { select: ['pm_programmeid', 'pm_programmename', '_pm_programmemanager_value'] })
            if (progRes.success) {
              const prog = unwrapSingle<any>(progRes)
              if (prog && prog._pm_programmemanager_value) {
                await sendNotificationToUser(
                  prog._pm_programmemanager_value,
                  'Teams',
                  'CRITICAL: Issue Escalation Alert',
                  `CRITICAL: Issue "${original.pm_issuetitle || 'Issue'}" has been escalated for programme "${prog.pm_programmename || ''}". Please review details immediately.`
                )
              }
            }
          } else if (regardingType === 'pm_portfolios') {
            const portRes = await Pm_portfoliosService.get(regardingId, { select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value'] })
            if (portRes.success) {
              const port = unwrapSingle<any>(portRes)
              if (port && port._pm_ownerlookup_value) {
                await sendNotificationToUser(
                  port._pm_ownerlookup_value,
                  'Teams',
                  'CRITICAL: Issue Escalation Alert',
                  `CRITICAL: Issue "${original.pm_issuetitle || 'Issue'}" has been escalated for portfolio "${port.pm_portfolioname || ''}". Please review details immediately.`
                )
              }
            }
          }
        }
      } catch (notifErr) {
        console.error('[RiskIssueService] Failed to send issue escalation notification:', notifErr)
      }
    }

    return item ? mapIssue(item) : null
  } catch (err) {
    console.error('[RiskIssueService] updateIssueFull exception:', err)
    throw err
  }
}

export async function deleteIssue(id: string): Promise<void> {
  try {
    let recordName = id
    try {
      const details = await Pm_issuesService.get(id, { select: ['pm_issuetitle'] })
      if (details.success) {
        const uItem = unwrapSingle<Pm_issues>(details)
        if (uItem?.pm_issuetitle) recordName = uItem.pm_issuetitle
      }
    } catch (e) {
      console.error('[RiskIssueService] deleteIssue details fetch exception:', e)
    }

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
  } catch (err) {
    console.error('[RiskIssueService] deleteIssue exception:', err)
    throw err
  }
}
