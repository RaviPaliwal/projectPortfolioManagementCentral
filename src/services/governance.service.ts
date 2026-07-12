import {
  Pm_projectgatereviewsService,
  Pm_benefitsService,
  Pm_performancemeasuresService,
} from '@/generated'
import type { Pm_projectgatereviews } from '@/generated/models/Pm_projectgatereviewsModel'
import type { Pm_benefits } from '@/generated/models/Pm_benefitsModel'
import type { Pm_performancemeasures } from '@/generated/models/Pm_performancemeasuresModel'
import type {
  GateReviewModel,
  BenefitModel,
  PerformanceMeasureModel,
} from '@/types/dataverse'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { fetchProjectDetails, fetchProjectsFull, updateProject, fetchProjectMilestones } from './project.service'
import { fetchAllocatedResourcesByProject } from './resource.service'
import { fetchWorkflows, startWorkflowForEntity } from './workflow.service'
import { writeAuditLog } from './changelog.service'

export const mapGateReview = (item: Pm_projectgatereviews): GateReviewModel => ({
  pm_projectgatereviewid: item.pm_projectgatereviewid,
  pm_gatename: item.pm_gatename,
  pm_gatestage: item.pm_gatestage,
  pm_reviewoutcome: item.pm_reviewoutcome,
  pm_reviewstatus: (item.pm_reviewoutcome !== undefined && item.pm_reviewoutcome !== null) ? 0 : 1,
  pm_plannedreviewdate: item.pm_plannedreviewdate,
  pm_actualreviewdate: item.pm_actualreviewdate,
  pm_leadreviewer: undefined,
  pm_reviewnotes: item.pm_reviewnotes,
  pm_reviewconditions: item.pm_reviewconditions,
  pm_documentsurl: undefined,
  pm_projectcode: undefined,
  pm_programmename: undefined,
  _pm_project_value: item._pm_project_value,
  _pm_programmelookup_value: undefined,
  statecode: item.statecode,
})

export const mapBenefit = (item: Pm_benefits): BenefitModel => ({
  pm_benefitid: item.pm_benefitid,
  pm_benefitname: item.pm_benefitname,
  pm_benefitcategory: item.pm_benefitcategory,
  pm_benefitdescription: item.pm_benefitdescription,
  pm_benefitstatus: item.pm_benefitstatus,
  pm_benefittype: item.pm_benefittype,
  pm_benefitreference: item.pm_benefitreference,
  pm_baselinevalue: item.pm_baselinevalue,
  pm_targetvalue: item.pm_targetvalue,
  pm_unitofmeasure: item.pm_unitofmeasure,
  pm_ragstatus: item.pm_ragstatus,
  pm_realisationstartdate: item.pm_realisationstartdate,
  pm_realisationenddate: item.pm_realisationenddate,
  pm_programmename: item.pm_programmelookupname,
  pm_projectcode: item._pm_project_value ? undefined : item.pm_projectname,
  pm_benifitownername: item.pm_benifitownername || (item as unknown as Record<string, unknown>)['_pm_benifitowner_value@OData.Community.Display.V1.FormattedValue'] as string,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  _pm_benifitowner_value: item._pm_benifitowner_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  _pm_project_value: item._pm_project_value,
  statecode: item.statecode,
})

export const mapPerformanceMeasure = (item: Pm_performancemeasures): PerformanceMeasureModel => ({
  pm_performancemeasureid: item.pm_performancemeasureid,
  pm_measurename: item.pm_measurename,
  pm_benefitname: item.pm_benefitname,
  pm_plannedvalue: item.pm_plannedvalue,
  pm_actualvalue: item.pm_actualvalue,
  pm_cumulativeplanned: item.pm_cumulativeplanned,
  pm_cumulativeactual: item.pm_cumulativeactual,
  pm_variance: item.pm_variance,
  pm_reportingperiod: item.pm_reportingperiod,
  pm_evidenced: item.pm_evidenced,
  pm_notes: item.pm_notes,
  _pm_benefit_value: item._pm_benefit_value,
  statecode: item.statecode,
})

export async function fetchGateReviewById(id: string): Promise<GateReviewModel | null> {
  try {
    const result = await Pm_projectgatereviewsService.get(id, {
      select: [
        'pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage',
        'pm_reviewoutcome', 'pm_plannedreviewdate',
        'pm_actualreviewdate', 'pm_reviewnotes',
        'pm_reviewconditions', '_pm_project_value',
      ],
    })
    if (!result.success) {
      console.error('[GovernanceService] fetchGateReviewById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_projectgatereviews>(result)
    if (!item) return null
    const review = mapGateReview(item)

    try {
      const projId = normalizeLookupId(review._pm_project_value)
      if (projId) {
        const proj = await fetchProjectDetails(projId)
        if (proj) {
          review.pm_projectcode = proj.pm_projectname
          review.pm_projectname = proj.pm_projectname
          review.pm_programmename = proj.pm_programmename
          review.pm_portfolioname = proj.pm_portfolioname
        }
      }
    } catch (err) {
      console.error('[GovernanceService] fetchGateReviewById project details resolution exception:', err)
    }

    return review
  } catch (err) {
    console.error('[GovernanceService] fetchGateReviewById exception:', err)
    return null
  }
}

export async function fetchGateReviews(): Promise<GateReviewModel[]> {
  try {
    const options: IGetAllOptions = {
      filter: 'statecode eq 0',
      select: [
        'pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage',
        'pm_reviewoutcome', 'pm_plannedreviewdate',
        'pm_actualreviewdate', 'pm_reviewnotes',
        'pm_reviewconditions', '_pm_project_value',
      ],
      orderBy: ['createdon desc'],
      top: 500,
    }
    const result = await Pm_projectgatereviewsService.getAll(options)
    if (!result.success) {
      console.error('[GovernanceService] fetchGateReviews failed:', result.error)
      return []
    }
    const list = unwrapList<Pm_projectgatereviews>(result).map(mapGateReview)

    try {
      const projects = await fetchProjectsFull()
      const projectMap = new Map<string, typeof projects[0]>()
      for (const p of projects) {
        if (p.pm_projectid) {
          projectMap.set(normalizeLookupId(p.pm_projectid)!, p)
        }
      }
      for (const r of list) {
        const projId = normalizeLookupId(r._pm_project_value)
        if (projId && projectMap.has(projId)) {
          const p = projectMap.get(projId)!
          r.pm_projectcode = p.pm_projectname
          r.pm_projectname = p.pm_projectname
          r.pm_programmename = p.pm_programmename
          r.pm_portfolioname = p.pm_portfolioname
        }
      }
    } catch (err) {
      console.error('[GovernanceService] fetchGateReviews projects resolution exception:', err)
    }

    return list
  } catch (err) {
    console.error('[GovernanceService] fetchGateReviews exception:', err)
    return []
  }
}

export async function createGateReview(payload: Partial<GateReviewModel>): Promise<GateReviewModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_programmelookup_value' &&
        key !== 'pm_reviewstatus' && key !== 'pm_leadreviewer' && key !== 'pm_documentsurl' &&
        key !== 'pm_projectcode' && key !== 'pm_programmename') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, unknown> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  try {
    const result = await Pm_projectgatereviewsService.create({ ...defaults, ...cleanPayload } as any)
    if (!result.success) {
      console.error('[GovernanceService] createGateReview failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_projectgatereviews>(result)
    const mapped = item ? mapGateReview(item) : null
    
    if (mapped && mapped.pm_projectgatereviewid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_projectgatereviews',
        recordId: mapped.pm_projectgatereviewid,
        recordName: mapped.pm_gatename || 'Gate Review',
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] createGateReview exception:', err)
    return null
  }
}

export async function updateGateReview(id: string, changes: Partial<GateReviewModel>): Promise<GateReviewModel | null> {
  try {
    const cleanChanges: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && key !== 'pm_projectgatereviewid' &&
          key !== 'pm_reviewstatus' && key !== 'pm_leadreviewer' && key !== 'pm_documentsurl' &&
          key !== 'pm_projectcode' && key !== 'pm_programmename' && key !== '_pm_programmelookup_value') {
        cleanChanges[key] = value
      }
    }
    const result = await Pm_projectgatereviewsService.update(id, cleanChanges as any)
    if (!result.success) {
      console.error('[GovernanceService] updateGateReview failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_projectgatereviews>(result)
    const mapped = item ? mapGateReview(item) : null
    
    if (mapped && mapped.pm_projectgatereviewid) {
      Object.keys(changes).forEach((key) => {
        const val = (changes as any)[key]
        if (val !== undefined && key !== 'pm_projectgatereviewid') {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_projectgatereviews',
            recordId: id,
            recordName: mapped.pm_gatename || 'Gate Review',
            fieldName: key,
            newValue: String(val),
          })
        }
      })

      // Auto-transition project phase when gate review is Approved (statuscode/reviewstatus = 0)
      // reviewstatus option set values: 0 = Approved, 1 = Deferred, 2 = Rejected, 3 = Pending Review
      if (mapped.pm_reviewstatus === 0 && mapped._pm_project_value) {
        const projectId = normalizeLookupId(mapped._pm_project_value)
        if (projectId) {
          // Gate Stage options: e.g. "Gate 1: Initiation to Planning" -> Move Project to Planning
          // "Gate 2: Planning to Execution" -> Move Project to Execution
          // "Gate 3: Execution to Closeout" -> Move Project to Closeout/Closure
          let targetPhase: number | null = null
          const gateStage = String(mapped.pm_gatestage || '').toLowerCase()

          if (gateStage.includes('gate 1') || gateStage.includes('initiation')) {
            targetPhase = 1 // Planning
          } else if (gateStage.includes('gate 2') || gateStage.includes('planning')) {
            targetPhase = 0 // Execution
          } else if (gateStage.includes('gate 3') || gateStage.includes('execution')) {
            targetPhase = 2 // Closure
          }

          if (targetPhase !== null) {
            console.log(`[GovernanceService] Auto-transitioning project ${projectId} to phase ${targetPhase} due to gate approval.`)
            await updateProject(projectId, { pm_projectphase: targetPhase } as any)
          }
        }
      }
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] updateGateReview exception:', err)
    return null
  }
}

export async function deleteGateReview(id: string): Promise<void> {
  try {
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_projectgatereviews',
      recordId: id,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted',
    })
    await Pm_projectgatereviewsService.delete(id)
  } catch (err) {
    console.error('[GovernanceService] deleteGateReview exception:', err)
    throw err
  }
}

export async function fetchBenefits(): Promise<BenefitModel[]> {
  try {
    const selectFields = [
      'pm_benefitid', 'pm_benefitname', 'pm_benefitcategory',
      'pm_benefitdescription', 'pm_benefitstatus', 'pm_benefittype',
      'pm_benefitreference', 'pm_baselinevalue', 'pm_targetvalue',
      'pm_unitofmeasure', 'pm_ragstatus', 'pm_realisationstartdate',
      'pm_realisationenddate',
      '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['createdon desc'],
      top: 500,
    }
    const result = await Pm_benefitsService.getAll({ ...options, filter: 'statecode eq 0' })
    if (!result.success) {
      console.error('[GovernanceService] fetchBenefits failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_benefits>(result).map(mapBenefit)
    if (list.length === 0) {
      const fallbackResult = await Pm_benefitsService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_benefits>(fallbackResult).map(mapBenefit)
      }
    }
    return list
  } catch (err) {
    console.error('[GovernanceService] fetchBenefits exception:', err)
    return []
  }
}

export async function fetchBenefitsByProject(projectId: string): Promise<BenefitModel[]> {
  try {
    const selectFields = [
      'pm_benefitid', 'pm_benefitname', 'pm_benefitcategory',
      'pm_benefitdescription', 'pm_benefitstatus', 'pm_benefittype',
      'pm_benefitreference', 'pm_baselinevalue', 'pm_targetvalue',
      'pm_unitofmeasure', 'pm_ragstatus', 'pm_realisationstartdate',
      'pm_realisationenddate',
      '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value',
    ]
    const result = await Pm_benefitsService.getAll({
      filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
      select: selectFields,
      top: 100,
    })
    if (!result.success) {
      console.error('[GovernanceService] fetchBenefitsByProject failed:', result.error)
      return []
    }
    return unwrapList<Pm_benefits>(result).map(mapBenefit)
  } catch (err) {
    console.error('[GovernanceService] fetchBenefitsByProject exception:', err)
    return []
  }
}

export async function createBenefit(payload: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  const banned = ['pm_benefitid', '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value', 'pm_benifitownername', 'pm_projectname', 'pm_programmename', 'pm_programmelookupname', 'pm_projectcode', 'createdon', 'modifiedon']
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && !banned.includes(key)) {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, unknown> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_benefitsService.create({ ...defaults, ...cleanPayload } as any)
    if (!result.success) {
      console.error('[GovernanceService] createBenefit failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_benefits>(result)
    const mapped = item ? mapBenefit(item) : null
    
    if (mapped && mapped.pm_benefitid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_benefits',
        recordId: mapped.pm_benefitid,
        recordName: mapped.pm_benefitname,
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] createBenefit exception:', err)
    return null
  }
}

export async function updateBenefit(id: string, changes: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  const banned = ['pm_benefitid', '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value', 'pm_benifitownername', 'pm_projectname', 'pm_programmename', 'pm_programmelookupname', 'pm_projectcode', 'createdon', 'modifiedon']
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && !banned.includes(key)) {
      cleanPayload[key] = value
    }
  }
  try {
    const result = await Pm_benefitsService.update(id, cleanPayload as any)
    if (!result.success) {
      console.error('[GovernanceService] updateBenefit failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_benefits>(result)
    const mapped = item ? mapBenefit(item) : null
    
    if (mapped && mapped.pm_benefitid) {
      Object.keys(changes).forEach((key) => {
        const val = (changes as any)[key]
        if (val !== undefined && key !== 'pm_benefitid') {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_benefits',
            recordId: id,
            recordName: mapped.pm_benefitname,
            fieldName: key,
            newValue: String(val),
          })
        }
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] updateBenefit exception:', err)
    return null
  }
}

export async function createBenefitFull(payload: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  const banned = ['pm_benefitid', '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value', 'pm_benifitownername', 'pm_projectname', 'pm_programmename', 'pm_programmelookupname', 'pm_projectcode', 'createdon', 'modifiedon']
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && !banned.includes(key)) {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, unknown> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_benifitowner_value) {
    const ownerId = normalizeLookupId(payload._pm_benifitowner_value)
    if (ownerId) {
      cleanPayload['pm_BenifitOwner@odata.bind'] = `/systemusers(${ownerId})`
    }
  }
  if (payload._pm_programmelookup_value) {
    const programmeId = normalizeLookupId(payload._pm_programmelookup_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeLookup@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  if (payload._pm_project_value) {
    const projectId = normalizeLookupId(payload._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  try {
    const result = await Pm_benefitsService.create({ ...defaults, ...cleanPayload } as any)
    if (!result.success) {
      console.error('[GovernanceService] createBenefitFull failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_benefits>(result)
    const mapped = item ? mapBenefit(item) : null
    
    if (mapped && mapped.pm_benefitid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_benefits',
        recordId: mapped.pm_benefitid,
        recordName: mapped.pm_benefitname,
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] createBenefitFull exception:', err)
    return null
  }
}

export async function updateBenefitFull(id: string, changes: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  const banned = ['pm_benefitid', '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value', 'pm_benifitownername', 'pm_projectname', 'pm_programmename', 'pm_programmelookupname', 'pm_projectcode', 'createdon', 'modifiedon']
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && !banned.includes(key)) {
      cleanPayload[key] = value
    }
  }
  if (changes._pm_benifitowner_value) {
    const ownerId = normalizeLookupId(changes._pm_benifitowner_value)
    if (ownerId) {
      cleanPayload['pm_BenifitOwner@odata.bind'] = `/systemusers(${ownerId})`
    }
  }
  if (changes._pm_programmelookup_value) {
    const programmeId = normalizeLookupId(changes._pm_programmelookup_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeLookup@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  if (changes._pm_project_value) {
    const projectId = normalizeLookupId(changes._pm_project_value)
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  try {
    const result = await Pm_benefitsService.update(id, cleanPayload as any)
    if (!result.success) {
      console.error('[GovernanceService] updateBenefitFull failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_benefits>(result)
    const mapped = item ? mapBenefit(item) : null
    
    if (mapped && mapped.pm_benefitid) {
      Object.keys(changes).forEach((key) => {
        const val = (changes as any)[key]
        if (val !== undefined && key !== 'pm_benefitid') {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_benefits',
            recordId: id,
            recordName: mapped.pm_benefitname,
            fieldName: key,
            newValue: String(val),
          })
        }
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] updateBenefitFull exception:', err)
    return null
  }
}

export async function deleteBenefit(id: string): Promise<void> {
  try {
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_benefits',
      recordId: id,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted',
    })
    await Pm_benefitsService.delete(id)
  } catch (err) {
    console.error('[GovernanceService] deleteBenefit exception:', err)
    throw err
  }
}

export async function fetchPerformanceMeasures(benefitId?: string): Promise<PerformanceMeasureModel[]> {
  try {
    const filter = benefitId ? `_pm_benefit_value eq '${benefitId}' and statecode eq 0` : 'statecode eq 0'
    const options: IGetAllOptions = {
      filter,
      select: [
        'pm_performancemeasureid', 'pm_measurename', 'pm_benefitname',
        'pm_plannedvalue', 'pm_actualvalue', 'pm_cumulativeplanned',
        'pm_cumulativeactual', 'pm_variance', 'pm_reportingperiod',
        'pm_evidenced', 'pm_notes',
      ],
      orderBy: ['pm_reportingperiod asc'],
      top: 500,
    }
    const result = await Pm_performancemeasuresService.getAll(options)
    if (!result.success) {
      console.error('[GovernanceService] fetchPerformanceMeasures failed:', result.error)
      return []
    }
    return unwrapList<Pm_performancemeasures>(result).map(mapPerformanceMeasure)
  } catch (err) {
    console.error('[GovernanceService] fetchPerformanceMeasures exception:', err)
    return []
  }
}

export async function createPerformanceMeasure(payload: Partial<PerformanceMeasureModel> & { _pm_benefit_value?: string }): Promise<PerformanceMeasureModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_benefit_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, unknown> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_benefit_value) {
    const benefitId = normalizeLookupId(payload._pm_benefit_value)
    if (benefitId) {
      cleanPayload['pm_benefit@odata.bind'] = `/pm_benefits(${benefitId})`
    }
  }
  try {
    const result = await Pm_performancemeasuresService.create({ ...defaults, ...cleanPayload } as any)
    if (!result.success) {
      console.error('[GovernanceService] createPerformanceMeasure failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_performancemeasures>(result)
    const mapped = item ? mapPerformanceMeasure(item) : null
    
    if (mapped && mapped.pm_performancemeasureid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_performancemeasures',
        recordId: mapped.pm_performancemeasureid,
        recordName: mapped.pm_measurename,
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] createPerformanceMeasure exception:', err)
    return null
  }
}

export async function updatePerformanceMeasure(id: string, changes: Partial<PerformanceMeasureModel>): Promise<PerformanceMeasureModel | null> {
  try {
    const result = await Pm_performancemeasuresService.update(id, changes as any)
    if (!result.success) {
      console.error('[GovernanceService] updatePerformanceMeasure failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_performancemeasures>(result)
    const mapped = item ? mapPerformanceMeasure(item) : null
    
    if (mapped && mapped.pm_performancemeasureid) {
      Object.keys(changes).forEach((key) => {
        const val = (changes as any)[key]
        if (val !== undefined && key !== 'pm_performancemeasureid') {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_performancemeasures',
            recordId: id,
            recordName: mapped.pm_measurename,
            fieldName: key,
            newValue: String(val),
          })
        }
      })
    }
    return mapped
  } catch (err) {
    console.error('[GovernanceService] updatePerformanceMeasure exception:', err)
    return null
  }
}

export async function deletePerformanceMeasure(id: string): Promise<void> {
  try {
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_performancemeasures',
      recordId: id,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted',
    })
    await Pm_performancemeasuresService.delete(id)
  } catch (err) {
    console.error('[GovernanceService] deletePerformanceMeasure exception:', err)
    throw err
  }
}

export async function fetchGateReviewsByProject(projectId: string): Promise<GateReviewModel[]> {
  try {
    const normProjId = normalizeLookupId(projectId)
    if (!normProjId) return []
    const options: IGetAllOptions = {
      filter: `_pm_project_value eq '${normProjId}' and statecode eq 0`,
      select: [
        'pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage',
        'pm_reviewoutcome', 'pm_plannedreviewdate',
        'pm_actualreviewdate', 'pm_reviewnotes',
        'pm_reviewconditions', '_pm_project_value',
      ],
      orderBy: ['createdon desc'],
      top: 100,
    }
    const result = await Pm_projectgatereviewsService.getAll(options)
    if (!result.success) {
      console.error('[GovernanceService] fetchGateReviewsByProject failed:', result.error)
      return []
    }
    return unwrapList<Pm_projectgatereviews>(result).map(mapGateReview)
  } catch (err) {
    console.error('[GovernanceService] fetchGateReviewsByProject exception:', err)
    return []
  }
}
