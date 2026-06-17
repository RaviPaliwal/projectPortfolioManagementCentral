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
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { fetchProjectDetails, fetchProjectsFull } from './project.service'

export const mapGateReview = (item: Pm_projectgatereviews): GateReviewModel => ({
  pm_projectgatereviewid: item.pm_projectgatereviewid,
  pm_gatename: item.pm_gatename,
  pm_gatestage: item.pm_gatestage,
  pm_reviewoutcome: item.pm_reviewoutcome,
  pm_reviewstatus: item.pm_reviewstatus,
  pm_plannedreviewdate: item.pm_plannedreviewdate,
  pm_actualreviewdate: item.pm_actualreviewdate,
  pm_leadreviewer: item.pm_leadreviewer,
  pm_reviewnotes: item.pm_reviewnotes,
  pm_reviewconditions: item.pm_reviewconditions,
  pm_documentsurl: item.pm_documentsurl,
  pm_projectcode: item.pm_projectcode,
  pm_programmename: item.pm_programmename,
  _pm_project_value: item._pm_project_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
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
  pm_benifitownername: item.pm_benifitownername || (item as any)['_pm_benifitowner_value@OData.Community.Display.V1.FormattedValue'],
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
  const result = await Pm_projectgatereviewsService.get(id, {
    select: [
      'pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage',
      'pm_reviewoutcome', 'pm_reviewstatus', 'pm_plannedreviewdate',
      'pm_actualreviewdate', 'pm_leadreviewer', 'pm_reviewnotes',
      'pm_reviewconditions', 'pm_documentsurl', 'pm_projectcode',
      'pm_programmename', '_pm_project_value', '_pm_programmelookup_value',
    ],
  })
  const item = unwrapSingle<Pm_projectgatereviews>(result)
  if (!item) return null
  const review = mapGateReview(item)

  try {
    const projId = normalizeLookupId(review._pm_project_value)
    if (projId) {
      const proj = await fetchProjectDetails(projId)
      if (proj) {
        review.pm_projectcode = proj.pm_projectcode ? `[${proj.pm_projectcode}] ${proj.pm_projectname || ''}` : proj.pm_projectname
        review.pm_projectname = proj.pm_projectname
        review.pm_programmename = proj.pm_programmename
        review.pm_portfolioname = proj.pm_portfolioname
      }
    }
  } catch (err) {
    console.warn('[governanceService] fetchGateReviewById project resolution failed:', err)
  }

  return review
}

export async function fetchGateReviews(): Promise<GateReviewModel[]> {
  const result = await Pm_projectgatereviewsService.getAll({
    filter: 'statecode eq 0',
    select: [
      'pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage',
      'pm_reviewoutcome', 'pm_reviewstatus', 'pm_plannedreviewdate',
      'pm_actualreviewdate', 'pm_leadreviewer', 'pm_reviewnotes',
      'pm_reviewconditions', 'pm_documentsurl', 'pm_projectcode',
      'pm_programmename', '_pm_project_value', '_pm_programmelookup_value',
    ],
    orderBy: ['pm_plannedreviewdate desc'],
    top: 500,
  })
  const list = unwrapList<Pm_projectgatereviews>(result).map(mapGateReview)

  try {
    const projects = await fetchProjectsFull()
    const projectMap = new Map<string, any>()
    for (const p of projects) {
      if (p.pm_projectid) {
        projectMap.set(normalizeLookupId(p.pm_projectid)!, p)
      }
    }
    for (const r of list) {
      const projId = normalizeLookupId(r._pm_project_value)
      if (projId && projectMap.has(projId)) {
        const p = projectMap.get(projId)!
        r.pm_projectcode = p.pm_projectcode ? `[${p.pm_projectcode}] ${p.pm_projectname || ''}` : p.pm_projectname
        r.pm_projectname = p.pm_projectname
        r.pm_programmename = p.pm_programmename
        r.pm_portfolioname = p.pm_portfolioname
      }
    }
  } catch (err) {
    console.warn('[governanceService] fetchGateReviews project resolution failed:', err)
  }

  return list
}

export async function createGateReview(payload: Partial<GateReviewModel>): Promise<GateReviewModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_programmelookup_value') {
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
  if (payload._pm_programmelookup_value) {
    const programmeId = normalizeLookupId(payload._pm_programmelookup_value)
    if (programmeId) {
      cleanPayload['pm_ProgrammeLookup@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  const result = await Pm_projectgatereviewsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_projectgatereviews>(result)
  return item ? mapGateReview(item) : null
}

export async function updateGateReview(id: string, changes: Partial<GateReviewModel>): Promise<GateReviewModel | null> {
  const result = await Pm_projectgatereviewsService.update(id, changes as any)
  const item = unwrapSingle<Pm_projectgatereviews>(result)
  return item ? mapGateReview(item) : null
}

export async function deleteGateReview(id: string): Promise<void> {
  await Pm_projectgatereviewsService.delete(id)
}

export async function fetchBenefits(): Promise<BenefitModel[]> {
  const selectFields = [
    'pm_benefitid', 'pm_benefitname', 'pm_benefitcategory',
    'pm_benefitdescription', 'pm_benefitstatus', 'pm_benefittype',
    'pm_benefitreference', 'pm_baselinevalue', 'pm_targetvalue',
    'pm_unitofmeasure', 'pm_ragstatus', 'pm_realisationstartdate',
    'pm_realisationenddate',
    '_pm_benifitowner_value', '_pm_programmelookup_value', '_pm_project_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_benefitname asc'],
    top: 500,
  }
  const result = await Pm_benefitsService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchBenefits result:', result) } catch (e) {}
  let list = unwrapList<Pm_benefits>(result).map(mapBenefit)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchBenefits: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_benefitsService.getAll(options)
    list = unwrapList<Pm_benefits>(fallbackResult).map(mapBenefit)
  }
  return list
}

export async function createBenefit(payload: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_benifitowner_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_benefitsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_benefits>(result)
  return item ? mapBenefit(item) : null
}

export async function updateBenefit(id: string, changes: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_benefitid' && key !== '_pm_benifitowner_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_benefitsService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_benefits>(result)
  return item ? mapBenefit(item) : null
}

export async function createBenefitFull(payload: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_benifitowner_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
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
  const result = await Pm_benefitsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_benefits>(result)
  return item ? mapBenefit(item) : null
}

export async function updateBenefitFull(id: string, changes: Partial<BenefitModel>): Promise<BenefitModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_benefitid' && key !== '_pm_benifitowner_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
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
  const result = await Pm_benefitsService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_benefits>(result)
  return item ? mapBenefit(item) : null
}

export async function deleteBenefit(id: string): Promise<void> {
  await Pm_benefitsService.delete(id)
}

export async function fetchPerformanceMeasures(benefitId?: string): Promise<PerformanceMeasureModel[]> {
  const filter = benefitId ? `_pm_benefit_value eq '${benefitId}' and statecode eq 0` : 'statecode eq 0'
  const result = await Pm_performancemeasuresService.getAll({
    filter,
    select: [
      'pm_performancemeasureid', 'pm_measurename', 'pm_benefitname',
      'pm_plannedvalue', 'pm_actualvalue', 'pm_cumulativeplanned',
      'pm_cumulativeactual', 'pm_variance', 'pm_reportingperiod',
      'pm_evidenced', 'pm_notes',
    ],
    orderBy: ['pm_reportingperiod asc'],
    top: 500,
  })
  return unwrapList<Pm_performancemeasures>(result).map(mapPerformanceMeasure)
}

export async function createPerformanceMeasure(payload: Partial<PerformanceMeasureModel> & { _pm_benefit_value?: string }): Promise<PerformanceMeasureModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && key !== '_pm_benefit_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_benefit_value) {
    const benefitId = normalizeLookupId(payload._pm_benefit_value)
    if (benefitId) {
      cleanPayload['pm_benefit@odata.bind'] = `/pm_benefits(${benefitId})`
    }
  }
  const result = await Pm_performancemeasuresService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_performancemeasures>(result)
  return item ? mapPerformanceMeasure(item) : null
}

export async function updatePerformanceMeasure(id: string, changes: Partial<PerformanceMeasureModel>): Promise<PerformanceMeasureModel | null> {
  const result = await Pm_performancemeasuresService.update(id, changes as any)
  const item = unwrapSingle<Pm_performancemeasures>(result)
  return item ? mapPerformanceMeasure(item) : null
}

export async function deletePerformanceMeasure(id: string): Promise<void> {
  await Pm_performancemeasuresService.delete(id)
}
