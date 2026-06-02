import {
  Pm_initiativesService,
  Pm_portfoliosService,
  Pm_projectsService,
} from '@/generated'
import type { Pm_initiatives } from '@/generated/models/Pm_initiativesModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { InitiativeModel } from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export const mapInitiative = (item: Pm_initiatives): InitiativeModel => ({
  pm_initiativeid: item.pm_initiativeid,
  pm_name: item.pm_initiativename,
  pm_businesscase: item.pm_businesscasedescription,
  pm_estimatedcost: item.pm_estimatedcosteur,
  pm_estimatedbenefits: item.pm_estimatedbenefitseur,
  pm_priorityscore: (item as any).pm_priorityscore,
  pm_strategicalignmentscore: (item as any).pm_strategicalignmentscore,
  pm_pipelinestatus: item.pm_pipelinestatus,
  pm_requestorname: item.pm_requestorname,
  pm_submissiondate: item.pm_submissiondate,
  pm_portfolioname: item.pm_portfolioname,
  _pm_portfolio_value: (item as any)._pm_portfolio_value,
})

export async function fetchInitiatives(status?: number): Promise<InitiativeModel[]> {
  const select = ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_estimatedbenefitseur', 'pm_priorityscore', 'pm_strategicalignmentscore', 'pm_pipelinestatus', 'pm_requestorname', 'pm_submissiondate', '_pm_portfolio_value']
  const options: any = { select, orderBy: ['pm_initiativename asc'], top: 200 }
  if (typeof status === 'number') options.filter = `pm_pipelinestatus eq ${status}`
  const result = await Pm_initiativesService.getAll(options)
  try { console.debug('[dataverseService] fetchInitiatives result raw:', result, 'select:', select, 'filter:', options.filter) } catch (e) {}
  const list = unwrapList<Pm_initiatives>(result).map(mapInitiative)

  if (list.length === 0) {
    try {
      console.warn('[dataverseService] fetchInitiatives: empty result, raw response:', result)
    } catch (e) {
      console.warn('[dataverseService] fetchInitiatives: unable to stringify response')
    }
  }

  try {
    const portfolioIds = Array.from(new Set(list.map((i) => (i as any)._pm_portfolio_value).filter(Boolean))) as string[]
    if (portfolioIds.length > 0) {
      const portfolios = await Promise.all(portfolioIds.map((id) => Pm_portfoliosService.get(id, { select: ['pm_portfolioid', 'pm_portfolioname'] })))
      try { console.debug('[dataverseService] fetchInitiatives portfolio fetch raw:', portfolios) } catch (e) {}
      const pMap: Record<string, string> = {}
      portfolios.forEach((res) => {
        const item = unwrapSingle<Pm_portfolios>(res)
        if (item && item.pm_portfolioid) pMap[item.pm_portfolioid] = item.pm_portfolioname ?? ''
      })
      for (const init of list) {
        const pid = (init as any)._pm_portfolio_value as string | undefined
        if (pid && pMap[pid]) init.pm_portfolioname = pMap[pid]
      }
    }
  } catch (err) {
    console.warn('[dataverseService] fetchInitiatives: failed to resolve portfolio names', err)
  }

  return list
}

export async function fetchPendingApprovalRequests(): Promise<InitiativeModel[]> {
  const result = await Pm_initiativesService.getAll({
    filter: "pm_pipelinestatus eq 1",
    select: ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_pipelinestatus', 'pm_requestorname', 'pm_submissiondate', 'pm_portfolioname'],
    orderBy: ['pm_submissiondate desc'],
    top: 100,
  })
  try { console.debug('[dataverseService] fetchPendingApprovalRequests result raw:', result) } catch (e) {}
  return unwrapList<Pm_initiatives>(result).map(mapInitiative)
}

export async function updateInitiativeStatus(initiativeId: string, status: number): Promise<void> {
  try { console.debug('[dataverseService] updateInitiativeStatus updating:', { initiativeId, status }) } catch (e) {}
  const res = await Pm_initiativesService.update(initiativeId, { pm_pipelinestatus: status } as any)
  try { console.debug('[dataverseService] updateInitiativeStatus result raw:', res) } catch (e) {}
}

export async function convertInitiativeToProject(initiative: InitiativeModel): Promise<string | null> {
  try {
    console.debug('[dataverseService] convertInitiativeToProject: starting conversion for', initiative.pm_initiativeid)
    const payload: any = { pm_projectname: initiative.pm_name }
    if ((initiative as any)._pm_portfolio_value) {
      payload['pm_portfolio@odata.bind'] = `/pm_portfolios(${(initiative as any)._pm_portfolio_value})`
    }
    const created = await Pm_projectsService.create(payload as any)
    try { console.debug('[dataverseService] convertInitiativeToProject create result raw:', created) } catch (e) {}
    const createdItem = unwrapSingle<Pm_projects>(created)
    if (createdItem && createdItem.pm_projectid) {
      try {
        const updateRes = await Pm_initiativesService.update(initiative.pm_initiativeid!, { pm_convertedtoreference: createdItem.pm_projectid } as any)
        try { console.debug('[dataverseService] convertInitiativeToProject update initiative result raw:', updateRes) } catch (e) {}
      } catch (e) {
        console.warn('[dataverseService] convertInitiativeToProject: failed to update initiative conversion reference', e)
      }
      return createdItem.pm_projectid
    }
  } catch (err) {
    console.warn('[dataverseService] convertInitiativeToProject failed', err)
  }
  return null
}

export async function createInitiative(payload: Partial<InitiativeModel> & { _pm_portfolio_value?: string }): Promise<InitiativeModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && key !== '_pm_portfolio_value') {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_portfolio_value) {
    const portfolioId = normalizeLookupId(payload._pm_portfolio_value)
    if (portfolioId) {
      cleanPayload['pm_portfolio@odata.bind'] = `/pm_portfolios(${portfolioId})`
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_initiativesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createInitiative payload/result:', payload, result) } catch (e) {}
  const item = unwrapSingle<Pm_initiatives>(result)
  return item ? mapInitiative(item) : null
}

export async function updateInitiative(id: string, changes: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  const result = await Pm_initiativesService.update(id, changes as any)
  try { console.debug('[dataverseService] updateInitiative id/changes/result:', id, changes, result) } catch (e) {}
  const item = unwrapSingle<Pm_initiatives>(result)
  return item ? mapInitiative(item) : null
}

export interface PipelineKpis {
  totalActiveInitiatives: number
  pendingApprovals: number
  totalEstimatedCost: number
  approvedThisMonth: number
}

export async function fetchPipelineKpis(): Promise<PipelineKpis> {
  const [allResult, pendingResult, approvedThisMonthResult] = await Promise.all([
    Pm_initiativesService.getAll({
      filter: "pm_pipelinestatus ne 3",
      select: ['pm_initiativeid', 'pm_estimatedcosteur', 'pm_pipelinestatus', 'pm_submissiondate', 'pm_decisiondate'],
      top: 500,
    }),
    Pm_initiativesService.getAll({
      filter: "pm_pipelinestatus eq 1",
      select: ['pm_initiativeid'],
      top: 500,
    }),
    Pm_initiativesService.getAll({
      filter: "pm_pipelinestatus eq 0",
      select: ['pm_initiativeid', 'pm_decisiondate'],
      top: 500,
    }),
  ])

  const all = unwrapList<Pm_initiatives>(allResult)
  const pending = unwrapList<Pm_initiatives>(pendingResult)
  const approvedThisMonth = unwrapList<Pm_initiatives>(approvedThisMonthResult)

  const now = new Date()
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const approvedThisMonthCount = approvedThisMonth.filter((i) => {
    const d = i.pm_decisiondate ?? i.pm_submissiondate
    if (!d) return false
    return d >= currentMonthStart
  }).length

  return {
    totalActiveInitiatives: all.length,
    pendingApprovals: pending.length,
    totalEstimatedCost: all.reduce((s, i) => s + (i.pm_estimatedcosteur ?? 0), 0),
    approvedThisMonth: approvedThisMonthCount,
  }
}
