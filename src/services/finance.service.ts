import {
  Pm_budgetlinesService,
  Pm_fundingsourcesService,
  Pm_cashflowentriesService,
  Pm_fiscalperiodsService,
  Pm_programmesService,
  Pm_projectsService,
} from '@/generated'
import type { Pm_budgetlines } from '@/generated/models/Pm_budgetlinesModel'
import type { Pm_fundingsources } from '@/generated/models/Pm_fundingsourcesModel'
import type { Pm_cashflowentries } from '@/generated/models/Pm_cashflowentriesModel'
import type { Pm_fiscalperiods } from '@/generated/models/Pm_fiscalperiodsModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type {
  BudgetLineModel,
  FundingSourceModel,
  CashflowEntryModel,
  FinancialPeriodModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export const mapBudgetLine = (item: Pm_budgetlines): BudgetLineModel => ({
  pm_budgetlineid: item.pm_budgetlineid,
  pm_budgetlinename: item.pm_budgetlinename,
  pm_approvedbudgeteur: item.pm_approvedbudgeteur,
  pm_revisedbudgeteur: item.pm_revisedbudgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_committedspendeur: item.pm_committedspendeur,
  pm_forecastspendeur: item.pm_forecastspendeur,
  pm_varianceeur: item.pm_varianceeur,
  pm_estimateatcompletioneur: item.pm_estimateatcompletioneur,
  pm_estimatetocompleteeur: item.pm_estimatetocompleteeur,
  pm_costcategory: item.pm_costcategory,
  pm_costcategoryname: item.pm_costcategoryname,
  pm_fundingperiod: item.pm_fundingperiod,
  pm_fundingsourcecode: item.pm_fundingsourcecode,
  pm_notes: item.pm_notes,
  pm_portfolio: item.pm_portfolio,
  pm_programme: item.pm_programme,
  pm_projectcode: item.pm_projectcode,
  pm_fiscalperiodname: item.pm_fiscalperiodname,
  pm_fundingsourcename: item.pm_fundingsourcename,
  pm_portfoliolookupname: item.pm_portfoliolookupname,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  _pm_fiscalperiod_value: item._pm_fiscalperiod_value,
  _pm_fundingsource_value: item._pm_fundingsource_value,
  _pm_portfoliolookup_value: item._pm_portfoliolookup_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  _pm_project_value: item._pm_project_value,
  statecode: item.statecode,
})

export const mapFundingSource = (item: Pm_fundingsources): FundingSourceModel => ({
  pm_fundingsourceid: item.pm_fundingsourceid,
  pm_fundingsourcename: item.pm_fundingsourcename,
  pm_fundingtype: item.pm_fundingtype,
  pm_fundingstatus: item.pm_fundingstatus,
  pm_totalamounteur: item.pm_totalamounteur,
  pm_allocatedamounteur: item.pm_allocatedamounteur,
  pm_availableamounteur: item.pm_availableamounteur,
  pm_fundingbody: item.pm_fundingbody,
  pm_referencecode: item.pm_referencecode,
  pm_effectivefromdate: item.pm_effectivefromdate,
  pm_effectivetodate: item.pm_effectivetodate,
  pm_portfolioname: item.pm_portfolioname,
  pm_programmename: item.pm_programmename,
  _pm_portfolio_value: item._pm_portfolio_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  statecode: item.statecode,
})

export const mapCashflowEntry = (item: Pm_cashflowentries): CashflowEntryModel => ({
  pm_cashflowentryid: item.pm_cashflowentryid,
  pm_entryname: item.pm_entryname,
  pm_amounteur: item.pm_amounteur,
  pm_transactiondate: item.pm_transactiondate,
  pm_transactiondirection: item.pm_transactiondirection,
  pm_transactiontype: item.pm_transactiontype,
  pm_category: item.pm_category,
  pm_description: item.pm_description,
  pm_invoicenumber: item.pm_invoicenumber,
  pm_financialperiod: item.pm_financialperiod,
  pm_programme: item.pm_programme,
  pm_projectcode: item.pm_projectcode,
  pm_fiscalperiodname: item.pm_fiscalperiodname,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  _pm_fiscalperiod_value: item._pm_fiscalperiod_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  _pm_project_value: item._pm_project_value,
  statecode: item.statecode,
})

export const mapFinancialPeriod = (item: Pm_fiscalperiods): FinancialPeriodModel => ({
  pm_fiscalperiodid: item.pm_fiscalperiodid,
  pm_periodname: item.pm_periodname,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_fiscalyear: item.pm_fiscalyear,
  pm_periodnumber: item.pm_periodnumber,
  pm_isclosed: item.pm_isclosed,
  pm_iscurrentperiod: item.pm_iscurrentperiod,
  statecode: item.statecode,
})

export async function fetchBudgetLines(): Promise<BudgetLineModel[]> {
  const selectFields = [
    'pm_budgetlineid', 'pm_budgetlinename', 'pm_approvedbudgeteur',
    'pm_revisedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur',
    'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory',
    'pm_fundingperiod', 'pm_fundingsourcecode',
    'pm_notes',
    'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_budgetlinename asc'],
    top: 500,
  }
  const result = await Pm_budgetlinesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchBudgetLines result:', result) } catch (e) {}
  let list = unwrapList<Pm_budgetlines>(result).map(mapBudgetLine)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchBudgetLines: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_budgetlinesService.getAll(options)
    list = unwrapList<Pm_budgetlines>(fallbackResult).map(mapBudgetLine)
  }
  return list
}

export async function fetchBudgetLineById(budgetLineId: string): Promise<BudgetLineModel | null> {
  const result = await Pm_budgetlinesService.get(budgetLineId, {
    select: [
      'pm_budgetlineid', 'pm_budgetlinename', 'pm_approvedbudgeteur',
      'pm_revisedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur',
      'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory',
      'pm_costcategoryname', 'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
      'pm_fundingperiod', 'pm_fundingsourcecode', 'pm_fundingsourcename',
      'pm_fiscalperiodname', 'pm_portfolio', 'pm_programme', 'pm_projectcode',
      'pm_projectname', 'pm_portfoliolookupname', 'pm_programmelookupname',
      'pm_notes',
    ],
  })
  try { console.debug('[dataverseService] fetchBudgetLineById result:', result) } catch (e) {}
  const item = unwrapSingle<Pm_budgetlines>(result)
  return item ? mapBudgetLine(item) : null
}

export async function createBudgetLine(payload: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
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
  const result = await Pm_budgetlinesService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_budgetlines>(result)
  return item ? mapBudgetLine(item) : null
}

export async function updateBudgetLine(id: string, changes: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  const result = await Pm_budgetlinesService.update(id, changes as any)
  const item = unwrapSingle<Pm_budgetlines>(result)
  return item ? mapBudgetLine(item) : null
}

export async function deleteBudgetLine(id: string): Promise<void> {
  await Pm_budgetlinesService.delete(id)
}

export async function fetchFundingSources(): Promise<FundingSourceModel[]> {
  const selectFields = [
    'pm_fundingsourceid', 'pm_fundingsourcename', 'pm_fundingtype',
    'pm_fundingstatus', 'pm_totalamounteur', 'pm_allocatedamounteur',
    'pm_availableamounteur', 'pm_fundingbody', 'pm_referencecode',
    'pm_effectivefromdate', 'pm_effectivetodate',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_fundingsourcename asc'],
    top: 500,
  }
  const result = await Pm_fundingsourcesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchFundingSources result:', result) } catch (e) {}
  let list = unwrapList<Pm_fundingsources>(result).map(mapFundingSource)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchFundingSources: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_fundingsourcesService.getAll(options)
    list = unwrapList<Pm_fundingsources>(fallbackResult).map(mapFundingSource)
  }
  return list
}

export async function fetchFundingSourceById(fundingSourceId: string): Promise<FundingSourceModel | null> {
  const result = await Pm_fundingsourcesService.get(fundingSourceId, {
    select: [
      'pm_fundingsourceid', 'pm_fundingsourcename', 'pm_fundingtype',
      'pm_fundingstatus', 'pm_totalamounteur', 'pm_allocatedamounteur',
      'pm_availableamounteur', 'pm_fundingbody', 'pm_referencecode',
      'pm_effectivefromdate', 'pm_effectivetodate',
      'pm_portfolioname', 'pm_programmename',
    ],
  })
  try { console.debug('[dataverseService] fetchFundingSourceById result:', result) } catch (e) {}
  const item = unwrapSingle<Pm_fundingsources>(result)
  return item ? mapFundingSource(item) : null
}

export async function createFundingSource(payload: Partial<FundingSourceModel>): Promise<FundingSourceModel | null> {
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
  const result = await Pm_fundingsourcesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createFundingSource payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_fundingsources>(result)
  return item ? mapFundingSource(item) : null
}

export async function updateFundingSource(id: string, changes: Partial<FundingSourceModel>): Promise<FundingSourceModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && key !== 'pm_fundingsourceid') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_fundingsourcesService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateFundingSource id/changes/result:', id, cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_fundingsources>(result)
  return item ? mapFundingSource(item) : null
}

export async function deleteFundingSource(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteFundingSource id:', id) } catch (e) {}
  await Pm_fundingsourcesService.delete(id)
}

export async function fetchFinancialPeriods(): Promise<FinancialPeriodModel[]> {
  const result = await Pm_fiscalperiodsService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_fiscalperiodid', 'pm_periodname', 'pm_startdate', 'pm_enddate', 'pm_fiscalyear', 'pm_periodnumber', 'pm_isclosed', 'pm_iscurrentperiod'],
    orderBy: ['pm_startdate desc'],
    top: 200,
  })
  return unwrapList<Pm_fiscalperiods>(result).map(mapFinancialPeriod)
}

export async function fetchCashflowEntries(): Promise<CashflowEntryModel[]> {
  const result = await Pm_cashflowentriesService.getAll({
    filter: 'statecode eq 0',
    select: [
      'pm_cashflowentryid', 'pm_entryname', 'pm_amounteur',
      'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
      'pm_category', 'pm_description', 'pm_invoicenumber',
      'pm_financialperiod', 'pm_programme', 'pm_projectcode',
      '_pm_fiscalperiod_value', '_pm_programmelookup_value', '_pm_project_value',
    ],
    orderBy: ['pm_transactiondate desc'],
    top: 500,
  })
  const list = unwrapList<Pm_cashflowentries>(result).map(mapCashflowEntry)

  try {
    const programmeIds = Array.from(new Set(list.map((e) => e._pm_programmelookup_value).filter(Boolean))) as string[]
    const projectIds = Array.from(new Set(list.map((e) => e._pm_project_value).filter(Boolean))) as string[]
    const fiscalPeriodIds = Array.from(new Set(list.map((e) => e._pm_fiscalperiod_value).filter(Boolean))) as string[]

    const [programmesResult, projectsResult, fiscalPeriodsResult] = await Promise.all([
      programmeIds.length > 0
        ? Pm_programmesService.getAll({ filter: programmeIds.map((id) => `pm_programmeid eq '${id}'`).join(' or '), select: ['pm_programmeid', 'pm_programmename'], top: 500 })
        : Promise.resolve(null),
      projectIds.length > 0
        ? Pm_projectsService.getAll({ filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '), select: ['pm_projectid', 'pm_projectname'], top: 500 })
        : Promise.resolve(null),
      fiscalPeriodIds.length > 0
        ? Pm_fiscalperiodsService.getAll({ filter: fiscalPeriodIds.map((id) => `pm_fiscalperiodid eq '${id}'`).join(' or '), select: ['pm_fiscalperiodid', 'pm_periodname'], top: 500 })
        : Promise.resolve(null),
    ])

    const programmeNameById = new Map<string, string>()
    if (programmesResult) {
      const programmes = unwrapList<Pm_programmes>(programmesResult)
      for (const p of programmes) {
        if (p.pm_programmeid && p.pm_programmename) programmeNameById.set(p.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_programmename)
      }
    }

    const projectNameById = new Map<string, string>()
    if (projectsResult) {
      const projects = unwrapList<Pm_projects>(projectsResult)
      for (const p of projects) {
        if (p.pm_projectid && p.pm_projectname) projectNameById.set(p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_projectname)
      }
    }

    const fiscalPeriodNameById = new Map<string, string>()
    if (fiscalPeriodsResult) {
      const fPeriods = unwrapList<Pm_fiscalperiods>(fiscalPeriodsResult)
      for (const fp of fPeriods) {
        if (fp.pm_fiscalperiodid && fp.pm_periodname) fiscalPeriodNameById.set(fp.pm_fiscalperiodid.replace(/[{}]/g, '').trim().toLowerCase(), fp.pm_periodname)
      }
    }

    for (const entry of list) {
      const normProgId = entry._pm_programmelookup_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normProjId = entry._pm_project_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normFiscId = entry._pm_fiscalperiod_value?.replace(/[{}]/g, '').trim().toLowerCase()
      if (normProgId && programmeNameById.has(normProgId)) entry.pm_programmelookupname = programmeNameById.get(normProgId)
      if (normProjId && projectNameById.has(normProjId)) entry.pm_projectname = projectNameById.get(normProjId)
      if (normFiscId && fiscalPeriodNameById.has(normFiscId)) entry.pm_fiscalperiodname = fiscalPeriodNameById.get(normFiscId)
    }
  } catch (err) {
    try { console.warn('[dataverseService] fetchCashflowEntries: failed to resolve lookup names', err) } catch (e) {}
  }

  return list
}

export interface ProgrammeLookupItem {
  pm_programmeid: string
  pm_programmename: string
}

export interface ProjectLookupItem {
  pm_projectid: string
  pm_projectname: string
  pm_projectcode?: string
  _pm_programme_value?: string
}

export async function fetchProgrammesForLookup(): Promise<ProgrammeLookupItem[]> {
  const result = await Pm_programmesService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_programmeid', 'pm_programmename'],
    orderBy: ['pm_programmename asc'],
    top: 500,
  })
  return unwrapList<Pm_programmes>(result).map((item) => ({
    pm_programmeid: item.pm_programmeid,
    pm_programmename: item.pm_programmename || '',
  }))
}

export async function fetchProjectsForLookup(): Promise<ProjectLookupItem[]> {
  const result = await Pm_projectsService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_programme_value'],
    orderBy: ['pm_projectname asc'],
    top: 500,
  })
  return unwrapList<Pm_projects>(result).map((item) => ({
    pm_projectid: item.pm_projectid,
    pm_projectname: item.pm_projectname || '',
    pm_projectcode: item.pm_projectcode || '',
    _pm_programme_value: item._pm_programme_value,
  }))
}

export async function createCashflowEntry(payload: Partial<CashflowEntryModel>): Promise<CashflowEntryModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_fiscalperiod_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_fiscalperiod_value) {
    const fiscalPeriodId = payload._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (fiscalPeriodId) {
      cleanPayload['pm_fiscalperiod@odata.bind'] = '/pm_fiscalperiods(' + fiscalPeriodId + ')'
    }
  }
  if (payload._pm_programmelookup_value) {
    const programmeId = payload._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (programmeId) {
      cleanPayload['pm_programmeLookup@odata.bind'] = '/pm_programmes(' + programmeId + ')'
    }
  }
  if (payload._pm_project_value) {
    const projectId = payload._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = '/pm_projects(' + projectId + ')'
    }
  }
  const result = await Pm_cashflowentriesService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_cashflowentries>(result)
  return item ? mapCashflowEntry(item) : null
}

export async function updateCashflowEntry(id: string, changes: Partial<CashflowEntryModel>): Promise<CashflowEntryModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_cashflowentryid' && key !== '_pm_fiscalperiod_value' && key !== '_pm_programmelookup_value' && key !== '_pm_project_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_cashflowentriesService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_cashflowentries>(result)
  return item ? mapCashflowEntry(item) : null
}

export async function deleteCashflowEntry(id: string): Promise<void> {
  await Pm_cashflowentriesService.delete(id)
}
