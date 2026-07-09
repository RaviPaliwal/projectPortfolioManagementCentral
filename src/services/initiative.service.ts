import {
  Pm_initiativesService,
  Pm_portfoliosService,
  Pm_projectsService,
  SystemusersService,
  Pm_programmesService,
} from '@/generated'
import type { Pm_initiatives } from '@/generated/models/Pm_initiativesModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { InitiativeModel } from '@/types/dataverse'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'

import { applySecurityMasking } from './security'
import { generateNextProjectCode } from './project.service'

export const mapInitiative = (item: Pm_initiatives): InitiativeModel => {
  const mapped: InitiativeModel = {
    pm_initiativeid: item.pm_initiativeid,
    pm_name: item.pm_initiativename,
    pm_businesscase: item.pm_businesscasedescription,
    pm_estimatedcost: item.pm_estimatedcosteur,
    pm_estimatedbenefits: item.pm_estimatedbenefitseur,
    pm_priorityscore: (item as unknown as Record<string, unknown>).pm_priorityscore as number,
    pm_strategicalignmentscore: (item as unknown as Record<string, unknown>).pm_strategicalignmentscore as number,
    pm_pipelinestatus: item.pm_pipelinestatus,
    pm_requestedbyname: item.pm_requestedbyname,
    _pm_requestedby_value: (item as unknown as Record<string, unknown>)._pm_requestedby_value as string,
    pm_programmename: item.pm_programmename,
    _pm_programme_value: (item as unknown as Record<string, unknown>)._pm_programme_value as string,
    pm_submissiondate: item.pm_submissiondate || (item as any).createdon,
    pm_portfolioname: item.pm_portfolioname,
    pm_initiativetype: (item as unknown as Record<string, unknown>).pm_initiativetype as number,
    pm_decisiondate: item.pm_decisiondate,
    pm_createdbyname: undefined,
    _pm_portfolio_value: (item as unknown as Record<string, unknown>)._pm_portfolio_value as string,
    pm_convertedtoreference: item.pm_convertedtoreference,
  }
  return applySecurityMasking(mapped, 'initiative')
}

export async function fetchInitiatives(status?: number): Promise<InitiativeModel[]> {
  try {
    const select = ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_estimatedbenefitseur', 'pm_priorityscore', 'pm_strategicalignmentscore', 'pm_pipelinestatus', '_pm_requestedby_value', '_pm_programme_value', 'pm_submissiondate', 'createdon', '_pm_portfolio_value', 'pm_initiativetype', 'pm_convertedtoreference']
    const options: IGetAllOptions = { select, orderBy: ['pm_initiativename asc'], top: 200 }
    if (typeof status === 'number') options.filter = `pm_pipelinestatus eq ${status}`
    const result = await Pm_initiativesService.getAll(options)
    if (!result.success) {
      console.error('[InitiativeService] fetchInitiatives failed:', result.error)
      return []
    }
    const list = unwrapList<Pm_initiatives>(result).map(mapInitiative)

    try {
      // 1. Resolve Portfolios
      const portfolioIds = Array.from(new Set(list.map((i) => i._pm_portfolio_value).filter(Boolean))) as string[]
      const portfoliosPromise = portfolioIds.length > 0
        ? Promise.all(portfolioIds.map((id) => Pm_portfoliosService.get(id, { select: ['pm_portfolioid', 'pm_portfolioname'] })))
        : Promise.resolve([])

      // 2. Resolve Programmes
      const programmeIds = Array.from(new Set(list.map((i) => i._pm_programme_value).filter(Boolean))) as string[]
      const programmesPromise = programmeIds.length > 0
        ? Promise.all(programmeIds.map((id) => Pm_programmesService.get(id, { select: ['pm_programmeid', 'pm_programmename'] })))
        : Promise.resolve([])

      // 3. Resolve Requested By Users
      const userIds = Array.from(new Set(list.map((i) => i._pm_requestedby_value).filter(Boolean))) as string[]
      const usersPromise = userIds.length > 0
        ? Promise.all(userIds.map((id) => SystemusersService.get(id, { select: ['systemuserid', 'fullname'] })))
        : Promise.resolve([])

      const [portfolios, programmes, users] = await Promise.all([
        portfoliosPromise,
        programmesPromise,
        usersPromise
      ])

      const pMap: Record<string, string> = {}
      portfolios.forEach((res) => {
        if (res.success) {
          const item = unwrapSingle<Pm_portfolios>(res)
          if (item && item.pm_portfolioid) pMap[item.pm_portfolioid] = item.pm_portfolioname ?? ''
        }
      })

      const progMap: Record<string, string> = {}
      programmes.forEach((res) => {
        if (res.success) {
          const item = unwrapSingle<Pm_programmes>(res)
          if (item && item.pm_programmeid) progMap[item.pm_programmeid] = item.pm_programmename ?? ''
        }
      })

      const uMap: Record<string, string> = {}
      users.forEach((res) => {
        if (res.success) {
          const item = unwrapSingle<Systemusers>(res)
          if (item && item.systemuserid) uMap[item.systemuserid] = item.fullname ?? ''
        }
      })

      for (const init of list) {
        if (init._pm_portfolio_value && pMap[init._pm_portfolio_value]) {
          init.pm_portfolioname = pMap[init._pm_portfolio_value]
        }
        if (init._pm_programme_value && progMap[init._pm_programme_value]) {
          init.pm_programmename = progMap[init._pm_programme_value]
        }
        if (init._pm_requestedby_value && uMap[init._pm_requestedby_value]) {
          init.pm_requestedbyname = uMap[init._pm_requestedby_value]
        }
      }
    } catch (err) {
      console.error('[InitiativeService] fetchInitiatives lookups resolution exception:', err)
    }

    return list
  } catch (err) {
    console.error('[InitiativeService] fetchInitiatives exception:', err)
    return []
  }
}

export async function fetchInitiativeById(id: string): Promise<InitiativeModel | null> {
  try {
    const select = ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_estimatedbenefitseur', 'pm_priorityscore', 'pm_strategicalignmentscore', 'pm_pipelinestatus', '_pm_requestedby_value', '_pm_programme_value', 'pm_submissiondate', 'createdon', 'pm_initiativetype', 'pm_decisiondate', '_pm_portfolio_value', '_createdby_value', 'pm_convertedtoreference']
    const result = await Pm_initiativesService.get(id, { select })
    if (!result.success) {
      console.error('[InitiativeService] fetchInitiativeById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_initiatives>(result)

    if (!item) return null

    const mapped = mapInitiative(item)
    const portfolioId = (item as unknown as Record<string, unknown>)._pm_portfolio_value as string | undefined
    if (portfolioId) {
      try {
        const portfolioResult = await Pm_portfoliosService.get(portfolioId, { select: ['pm_portfolioid', 'pm_portfolioname'] })
        if (portfolioResult.success) {
          const portfolio = unwrapSingle<Pm_portfolios>(portfolioResult)
          if (portfolio && portfolio.pm_portfolioname) {
            mapped.pm_portfolioname = portfolio.pm_portfolioname
          }
        }
      } catch (e) {
        console.error('[InitiativeService] fetchInitiativeById portfolio lookup exception:', e)
      }
    }

    const programmeId = (item as unknown as Record<string, unknown>)._pm_programme_value as string | undefined
    if (programmeId) {
      try {
        const progResult = await Pm_programmesService.get(programmeId, { select: ['pm_programmeid', 'pm_programmename'] })
        if (progResult.success) {
          const prog = unwrapSingle<Pm_programmes>(progResult)
          if (prog && prog.pm_programmename) {
            mapped.pm_programmename = prog.pm_programmename
          }
        }
      } catch (e) {
        console.error('[InitiativeService] fetchInitiativeById programme lookup exception:', e)
      }
    }

    const requestedById = (item as unknown as Record<string, unknown>)._pm_requestedby_value as string | undefined
    if (requestedById) {
      try {
        const userResult = await SystemusersService.get(requestedById, { select: ['systemuserid', 'fullname'] })
        if (userResult.success) {
          const user = unwrapSingle<Systemusers>(userResult)
          if (user?.fullname) {
            mapped.pm_requestedbyname = user.fullname
          }
        }
      } catch (e) {
        console.error('[InitiativeService] fetchInitiativeById requestedby lookup exception:', e)
      }
    }

    // Resolve created by user name from lookup
    const createdByValue = (item as unknown as Record<string, unknown>)._createdby_value as string | undefined
    if (createdByValue) {
      try {
        const userResult = await SystemusersService.get(createdByValue, { select: ['systemuserid', 'fullname'] })
        if (userResult.success) {
          const user = unwrapSingle<Systemusers>(userResult)
          if (user?.fullname) {
            mapped.pm_createdbyname = user.fullname
          }
        }
      } catch (e) {
        console.error('[InitiativeService] fetchInitiativeById user lookup exception:', e)
      }
    }

    return mapped
  } catch (err) {
    console.error('[InitiativeService] fetchInitiativeById Exception:', err)
    return null
  }
}


export async function fetchPendingApprovalRequests(): Promise<InitiativeModel[]> {
  try {
    const options: IGetAllOptions = {
      filter: "pm_pipelinestatus eq 1",
      select: ['pm_initiativeid', 'pm_initiativename', 'pm_businesscasedescription', 'pm_estimatedcosteur', 'pm_pipelinestatus', '_pm_requestedby_value', '_pm_programme_value', 'pm_submissiondate', 'createdon', '_pm_portfolio_value', 'pm_initiativetype'],
      orderBy: ['pm_submissiondate desc'],
      top: 100,
    }
    const result = await Pm_initiativesService.getAll(options)
    if (!result.success) {
      console.error('[InitiativeService] fetchPendingApprovalRequests failed:', result.error)
      return []
    }
    const list = unwrapList<Pm_initiatives>(result).map(mapInitiative)

    try {
      // 1. Resolve Portfolios
      const portfolioIds = Array.from(new Set(list.map((i) => i._pm_portfolio_value).filter(Boolean))) as string[]
      const portfoliosPromise = portfolioIds.length > 0
        ? Promise.all(portfolioIds.map((id) => Pm_portfoliosService.get(id, { select: ['pm_portfolioid', 'pm_portfolioname'] })))
        : Promise.resolve([])

      // 2. Resolve Programmes
      const programmeIds = Array.from(new Set(list.map((i) => i._pm_programme_value).filter(Boolean))) as string[]
      const programmesPromise = programmeIds.length > 0
        ? Promise.all(programmeIds.map((id) => Pm_programmesService.get(id, { select: ['pm_programmeid', 'pm_programmename'] })))
        : Promise.resolve([])

      // 3. Resolve Requested By Users
      const userIds = Array.from(new Set(list.map((i) => i._pm_requestedby_value).filter(Boolean))) as string[]
      const usersPromise = userIds.length > 0
        ? Promise.all(userIds.map((id) => SystemusersService.get(id, { select: ['systemuserid', 'fullname'] })))
        : Promise.resolve([])

      const [portfolios, programmes, users] = await Promise.all([
        portfoliosPromise,
        programmesPromise,
        usersPromise
      ])

      const pMap: Record<string, string> = {}
      portfolios.forEach((res) => {
        if (res.success) {
          const item = unwrapSingle<Pm_portfolios>(res)
          if (item && item.pm_portfolioid) pMap[item.pm_portfolioid] = item.pm_portfolioname ?? ''
        }
      })

      const progMap: Record<string, string> = {}
      programmes.forEach((res) => {
        if (res.success) {
          const item = unwrapSingle<Pm_programmes>(res)
          if (item && item.pm_programmeid) progMap[item.pm_programmeid] = item.pm_programmename ?? ''
        }
      })

      const uMap: Record<string, string> = {}
      users.forEach((res) => {
        if (res.success) {
          const item = unwrapSingle<Systemusers>(res)
          if (item && item.systemuserid) uMap[item.systemuserid] = item.fullname ?? ''
        }
      })

      for (const init of list) {
        if (init._pm_portfolio_value && pMap[init._pm_portfolio_value]) {
          init.pm_portfolioname = pMap[init._pm_portfolio_value]
        }
        if (init._pm_programme_value && progMap[init._pm_programme_value]) {
          init.pm_programmename = progMap[init._pm_programme_value]
        }
        if (init._pm_requestedby_value && uMap[init._pm_requestedby_value]) {
          init.pm_requestedbyname = uMap[init._pm_requestedby_value]
        }
      }
    } catch (err) {
      console.error('[InitiativeService] fetchPendingApprovalRequests lookups resolution failed:', err)
    }

    return list
  } catch (err) {
    console.error('[InitiativeService] fetchPendingApprovalRequests exception:', err)
    return []
  }
}

export async function updateInitiativeStatus(initiativeId: string, status: number): Promise<void> {
  try {
    const res = await Pm_initiativesService.update(initiativeId, { pm_pipelinestatus: status } as any)
    if (!res.success) {
      console.error('[InitiativeService] updateInitiativeStatus failed:', res.error)
      throw new Error(`Failed to update status to ${status}`)
    }
    writeAuditLog({
      actionType: 'StatusChange',
      entityName: 'pm_initiatives',
      recordId: initiativeId,
      fieldName: 'pm_pipelinestatus',
      newValue: String(status),
    })
  } catch (err) {
    console.error('[InitiativeService] updateInitiativeStatus exception:', err)
    throw err
  }
}

export async function convertInitiativeToProject(initiative: InitiativeModel): Promise<string | null> {
  try {
    const projectCode = await generateNextProjectCode()
    const payload: Record<string, unknown> = { 
      pm_projectname: initiative.pm_name,
      pm_projectcode: projectCode
    }
    if ((initiative as Record<string, any>)._pm_portfolio_value) {
      payload['pm_portfolio@odata.bind'] = `/pm_portfolios(${(initiative as Record<string, any>)._pm_portfolio_value})`
    }
    if ((initiative as Record<string, any>)._pm_programme_value) {
      payload['pm_programme@odata.bind'] = `/pm_programmes(${(initiative as Record<string, any>)._pm_programme_value})`
    }
    const created = await Pm_projectsService.create(payload as any)
    if (!created.success) {
      console.error('[InitiativeService] convertInitiativeToProject failed to create project:', created.error)
      return null
    }
    const createdItem = unwrapSingle<Pm_projects>(created)
    if (createdItem && createdItem.pm_projectid) {
      try {
        const updateRes = await Pm_initiativesService.update(initiative.pm_initiativeid!, { pm_convertedtoreference: createdItem.pm_projectid } as any)
        if (!updateRes.success) {
          console.error('[InitiativeService] convertInitiativeToProject failed to update initiative ref:', updateRes.error)
        }
      } catch (e) {
        console.error('[InitiativeService] convertInitiativeToProject initiative update exception:', e)
      }

      // Log project creation audit
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_projects',
        recordId: createdItem.pm_projectid,
        recordName: createdItem.pm_projectname || initiative.pm_name || '',
        newValue: `Project created via conversion from Initiative: ${createdItem.pm_projectname || initiative.pm_name || ''}`
      })

      // Log initiative conversion reference update audit
      writeAuditLog({
        actionType: 'Update',
        entityName: 'pm_initiatives',
        recordId: initiative.pm_initiativeid!,
        recordName: initiative.pm_name,
        fieldName: 'pm_convertedtoreference',
        newValue: createdItem.pm_projectid,
      })

      return createdItem.pm_projectid
    }
  } catch (err) {
    console.error('[InitiativeService] convertInitiativeToProject exception:', err)
  }
  return null
}

export async function createInitiative(payload: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && !key.startsWith('_') && key !== 'pm_initiativeid') {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_portfolio_value) {
    const portfolioId = normalizeLookupId(payload._pm_portfolio_value)
    if (portfolioId) {
      cleanPayload['pm_portfolio@odata.bind'] = `/pm_portfolios(${portfolioId})`
    }
  }
  if (payload._pm_programme_value) {
    const programmeId = normalizeLookupId(payload._pm_programme_value)
    if (programmeId) {
      cleanPayload['pm_Programme@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  if (payload._pm_requestedby_value) {
    const userId = normalizeLookupId(payload._pm_requestedby_value)
    if (userId) {
      cleanPayload['pm_RequestedBy@odata.bind'] = `/systemusers(${userId})`
    }
  }
  const defaults: Record<string, unknown> = {
    statecode: 0,
    statuscode: 1,
    pm_submissiondate: new Date().toISOString(),
  }
  try {
    const result = await Pm_initiativesService.create({ ...defaults, ...cleanPayload } as any)
    if (!result.success) {
      console.error('[InitiativeService] createInitiative failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_initiatives>(result)
    const mapped = item ? mapInitiative(item) : null

    if (mapped && mapped.pm_initiativeid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_initiatives',
        recordId: mapped.pm_initiativeid,
        recordName: mapped.pm_name,
      })
    }

    return mapped
  } catch (err) {
    console.error('[InitiativeService] createInitiative exception:', err)
    return null
  }
}

export async function updateInitiative(id: string, changes: Partial<InitiativeModel>): Promise<InitiativeModel | null> {
  try {
    const cleanChanges: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && !key.startsWith('_') && key !== 'pm_initiativeid') {
        if (key === 'pm_name') {
          cleanChanges.pm_initiativename = value
        } else if (key === 'pm_businesscase') {
          cleanChanges.pm_businesscasedescription = value
        } else if (key === 'pm_estimatedcost') {
          cleanChanges.pm_estimatedcosteur = value
        } else if (key === 'pm_estimatedbenefits') {
          cleanChanges.pm_estimatedbenefitseur = value
        } else {
          cleanChanges[key] = value
        }
      }
    }
    if (changes._pm_portfolio_value !== undefined) {
      const portfolioId = normalizeLookupId(changes._pm_portfolio_value)
      cleanChanges['pm_portfolio@odata.bind'] = portfolioId ? `/pm_portfolios(${portfolioId})` : null
    }
    if (changes._pm_programme_value !== undefined) {
      const programmeId = normalizeLookupId(changes._pm_programme_value)
      cleanChanges['pm_Programme@odata.bind'] = programmeId ? `/pm_programmes(${programmeId})` : null
    }
    if (changes._pm_requestedby_value !== undefined) {
      const userId = normalizeLookupId(changes._pm_requestedby_value)
      cleanChanges['pm_RequestedBy@odata.bind'] = userId ? `/systemusers(${userId})` : null
    }
    const result = await Pm_initiativesService.update(id, cleanChanges as any)
    if (!result.success) {
      console.error('[InitiativeService] updateInitiative failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_initiatives>(result)
    const mapped = item ? mapInitiative(item) : null

    if (mapped && mapped.pm_initiativeid) {
      Object.keys(changes).forEach((key) => {
        const val = (changes as any)[key]
        if (val !== undefined && key !== 'pm_initiativeid') {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_initiatives',
            recordId: id,
            recordName: mapped.pm_name,
            fieldName: key,
            newValue: String(val),
          })
        }
      })
    }

    return mapped
  } catch (err) {
    console.error('[InitiativeService] updateInitiative exception:', err)
    return null
  }
}

export interface PipelineKpis {
  totalActiveInitiatives: number
  pendingApprovals: number
  totalEstimatedCost: number
  approvedThisMonth: number
}


export async function deleteInitiative(id: string): Promise<void> {
  let recordName = id
  try {
    const details = await Pm_initiativesService.get(id, { select: ['pm_initiativename'] })
    if (details.success) {
      const item = unwrapSingle<Pm_initiatives>(details)
      if (item?.pm_initiativename) recordName = item.pm_initiativename
    }
  } catch (e) {
    console.error('[InitiativeService] deleteInitiative details fetch exception:', e)
  }

  try {
    await Pm_initiativesService.delete(id)

    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_initiatives',
      recordId: id,
      recordName: recordName,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted'
    })
  } catch (err) {
    console.error('[InitiativeService] deleteInitiative exception:', err)
    throw err
  }
}
export async function fetchPipelineKpis(): Promise<PipelineKpis> {
  try {
    const [allResult, pendingResult, approvedThisMonthResult] = await Promise.all([
      Pm_initiativesService.getAll({
        filter: "pm_pipelinestatus ne 3 and pm_pipelinestatus ne 4",
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

    if (!allResult.success) console.error('[InitiativeService] fetchPipelineKpis allResult failed:', allResult.error)
    if (!pendingResult.success) console.error('[InitiativeService] fetchPipelineKpis pendingResult failed:', pendingResult.error)
    if (!approvedThisMonthResult.success) console.error('[InitiativeService] fetchPipelineKpis approvedThisMonthResult failed:', approvedThisMonthResult.error)

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
  } catch (err) {
    console.error('[InitiativeService] fetchPipelineKpis exception:', err)
    return {
      totalActiveInitiatives: 0,
      pendingApprovals: 0,
      totalEstimatedCost: 0,
      approvedThisMonth: 0
    }
  }
}
