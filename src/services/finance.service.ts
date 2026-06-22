import {
  Pm_budgetlinesService,
  Pm_fundingsourcesService,
  Pm_cashflowentriesService,
  Pm_fiscalperiodsService,
  Pm_portfoliosService,
  Pm_programmesService,
  Pm_projectsService,
  Pm_timesheetentriesService,
} from '@/generated'
import type { Pm_budgetlines } from '@/generated/models/Pm_budgetlinesModel'
import type { Pm_fundingsources } from '@/generated/models/Pm_fundingsourcesModel'
import type { Pm_cashflowentries } from '@/generated/models/Pm_cashflowentriesModel'
import type { Pm_fiscalperiods } from '@/generated/models/Pm_fiscalperiodsModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type {
  BudgetLineModel,
  FundingSourceModel,
  CashflowEntryModel,
  FinancialPeriodModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'

export const mapBudgetLine = (item: Pm_budgetlines): BudgetLineModel => {
  let calculatedTotal = 0
  if (item.pm_jsonrawcalculation) {
    try {
      const parsed = JSON.parse(item.pm_jsonrawcalculation)
      calculatedTotal = parsed.totalAmount || 0
    } catch (e) { }
  }

  return {
    pm_budgetlineid: item.pm_budgetlineid ? item.pm_budgetlineid.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
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
    pm_expencecatagory: item.pm_expencecatagory,
    pm_costinglevelcode: (item as any).pm_costinglevelcode,
    pm_unitcosteur: (item as any).pm_unitcosteur,
    pm_quantity: (item as any).pm_quantity,
    pm_totalamounteur: calculatedTotal,
    pm_jsonrawcalculation: item.pm_jsonrawcalculation,
    pm_notes: item.pm_notes,
    pm_portfolio: item.pm_portfoliolookupname,
    pm_programme: item.pm_programmelookupname,
    pm_projectcode: item.pm_projectname,
    pm_fiscalperiodname: item.pm_fiscalperiodname,
    pm_fundingsourcename: item.pm_fundingsourcename,
    pm_portfoliolookupname: item.pm_portfoliolookupname,
    pm_programmelookupname: item.pm_programmelookupname,
    pm_projectname: item.pm_projectname,
    _pm_fiscalperiod_value: item._pm_fiscalperiod_value ? item._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    _pm_fundingsource_value: item._pm_fundingsource_value ? item._pm_fundingsource_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    _pm_portfoliolookup_value: item._pm_portfoliolookup_value ? item._pm_portfoliolookup_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    _pm_programmelookup_value: item._pm_programmelookup_value ? item._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    _pm_project_value: item._pm_project_value ? item._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    statecode: item.statecode,
  }
}

export const mapFundingSource = (item: Pm_fundingsources): FundingSourceModel => ({
  pm_fundingsourceid: item.pm_fundingsourceid,
  pm_fundingsourcename: item.pm_fundingsourcename,
  pm_fundingtype: item.pm_fundingtype,
  pm_fundingstatus: item.pm_fundingstatus,
  pm_totalamounteur: item.pm_totalamounteur,
  pm_allocatedamounteur: item.pm_allocatedamounteur,
  pm_availableamounteur: item.pm_availableamounteur,
  pm_fundingbody: item.pm_fundingbody,
  pm_effectivefromdate: item.pm_effectivefromdate,
  pm_effectivetodate: item.pm_effectivetodate,
  pm_portfolioname: item.pm_portfolioname,
  pm_programmelookupname: item.pm_programmelookupname,
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
  pm_fiscalperiodname: item.pm_fiscalperiodname,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_projectname: item.pm_projectname,
  pm_budgetlinename: item.pm_budgetlinename,
  _pm_fiscalperiod_value: item._pm_fiscalperiod_value ? item._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
  _pm_programmelookup_value: item._pm_programmelookup_value ? item._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
  _pm_project_value: item._pm_project_value ? item._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
  _pm_budgetline_value: item._pm_budgetline_value ? item._pm_budgetline_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
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
    'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory', 'pm_expencecatagory',
    'pm_notes',
    'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
    'pm_jsonrawcalculation',
    '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_budgetlinename asc'],
    top: 500,
  }
  const result = await Pm_budgetlinesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchBudgetLines result:', result) } catch (e) { }
  let list = unwrapList<Pm_budgetlines>(result).map(mapBudgetLine)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchBudgetLines: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) { }
    const fallbackResult = await Pm_budgetlinesService.getAll(options)
    list = unwrapList<Pm_budgetlines>(fallbackResult).map(mapBudgetLine)
  }
  return list
}

export async function fetchBudgetLineById(budgetLineId: string): Promise<BudgetLineModel | null> {
  try {
    const result = await Pm_budgetlinesService.get(budgetLineId, {
      select: [
        'pm_budgetlineid', 'pm_budgetlinename', 'pm_approvedbudgeteur',
        'pm_revisedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur',
        'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory', 'pm_expencecatagory',
        'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
        'pm_jsonrawcalculation',
        '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
        '_pm_fundingsource_value', '_pm_fiscalperiod_value',
        'pm_notes',
      ],
    })
    try { console.debug('[dataverseService] fetchBudgetLineById result:', result) } catch (e) { }
    const item = unwrapSingle<Pm_budgetlines>(result)
    if (!item) return null
    const mapped = mapBudgetLine(item)

    // Resolve lookup names manually to prevent 400 Bad Request on virtual relationship columns
    try {
      const portId = normalizeLookupId(item._pm_portfoliolookup_value)
      if (portId) {
        const portRes = await Pm_portfoliosService.get(portId, { select: ['pm_portfolioid', 'pm_portfolioname'] })
        const port = unwrapSingle<any>(portRes)
        if (port?.pm_portfolioname) {
          mapped.pm_portfolio = port.pm_portfolioname.trim()
          mapped.pm_portfoliolookupname = port.pm_portfolioname.trim()
        }
      }
    } catch (err) {
      console.warn('Failed to resolve portfolio name for budget line', err)
    }

    try {
      const progId = normalizeLookupId(item._pm_programmelookup_value)
      if (progId) {
        const progRes = await Pm_programmesService.get(progId, { select: ['pm_programmeid', 'pm_programmename'] })
        const prog = unwrapSingle<any>(progRes)
        if (prog?.pm_programmename) {
          mapped.pm_programme = prog.pm_programmename.trim()
          mapped.pm_programmelookupname = prog.pm_programmename.trim()
        }
      }
    } catch (err) {
      console.warn('Failed to resolve programme name for budget line', err)
    }

    try {
      const projId = normalizeLookupId(item._pm_project_value)
      if (projId) {
        const projRes = await Pm_projectsService.get(projId, { select: ['pm_projectid', 'pm_projectname'] })
        const proj = unwrapSingle<any>(projRes)
        if (proj?.pm_projectname) {
          mapped.pm_projectcode = proj.pm_projectname.trim()
          mapped.pm_projectname = proj.pm_projectname.trim()
        }
      }
    } catch (err) {
      console.warn('Failed to resolve project name for budget line', err)
    }

    try {
      const sourceId = normalizeLookupId(item._pm_fundingsource_value)
      if (sourceId) {
        const sourceRes = await Pm_fundingsourcesService.get(sourceId, { select: ['pm_fundingsourceid', 'pm_fundingsourcename'] })
        const source = unwrapSingle<any>(sourceRes)
        if (source?.pm_fundingsourcename) {
          mapped.pm_fundingsourcename = source.pm_fundingsourcename.trim()
        }
      }
    } catch (err) {
      console.warn('Failed to resolve funding source name for budget line', err)
    }

    try {
      const fpId = normalizeLookupId(item._pm_fiscalperiod_value)
      if (fpId) {
        const fpRes = await Pm_fiscalperiodsService.get(fpId, { select: ['pm_fiscalperiodid', 'pm_periodname'] })
        const fp = unwrapSingle<any>(fpRes)
        if (fp?.pm_periodname) {
          mapped.pm_fiscalperiodname = fp.pm_periodname.trim()
        }
      }
    } catch (err) {
      console.warn('Failed to resolve fiscal period name for budget line', err)
    }

    return mapped
  } catch (err) {
    console.error('[dataverseService] fetchBudgetLineById failed:', err)
    return null
  }
} export async function createBudgetLine(payload: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  const SKIP_VIRTUAL = new Set([
    'pm_fiscalperiodname', 'pm_fundingsourcename',
    'pm_portfoliolookupname', 'pm_programmelookupname', 'pm_projectname',
    'pm_portfolio', 'pm_programme', 'pm_projectcode',
    'pm_costinglevelcode', 'pm_unitcosteur', 'pm_quantity', 'pm_totalamounteur',
    '_pm_fiscalperiod_value', '_pm_fundingsource_value',
    '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && !SKIP_VIRTUAL.has(key)) {
      cleanPayload[key] = value
    }
  }
  if (payload._pm_portfoliolookup_value) {
    const id = payload._pm_portfoliolookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_portfolioLookup@odata.bind'] = `/pm_portfolios(${id})`
  }
  if (payload._pm_programmelookup_value) {
    const id = payload._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_programmeLookup@odata.bind'] = `/pm_programmes(${id})`
  }
  if (payload._pm_project_value) {
    const id = payload._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_project@odata.bind'] = `/pm_projects(${id})`
  }
  if (payload._pm_fundingsource_value) {
    const id = payload._pm_fundingsource_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_fundingsource@odata.bind'] = `/pm_fundingsources(${id})`
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_budgetlinesService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_budgetlines>(result)
  const mapped = item ? mapBudgetLine(item) : null

  if (mapped && mapped.pm_budgetlineid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_budgetlines',
      recordId: mapped.pm_budgetlineid,
      recordName: mapped.pm_budgetlinename || 'Budget Line',
    })
    if (mapped._pm_project_value) {
      await recalculateRealFinancialsForProject(mapped._pm_project_value)
    }
  }

  return mapped
} export async function updateBudgetLine(id: string, changes: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  const SKIP_VIRTUAL = new Set([
    'pm_budgetlineid',
    'pm_fiscalperiodname', 'pm_fundingsourcename',
    'pm_portfoliolookupname', 'pm_programmelookupname', 'pm_projectname',
    'pm_portfolio', 'pm_programme', 'pm_projectcode',
    'pm_costinglevelcode', 'pm_unitcosteur', 'pm_quantity', 'pm_totalamounteur',
    '_pm_fiscalperiod_value', '_pm_fundingsource_value',
    '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && !SKIP_VIRTUAL.has(key)) {
      cleanPayload[key] = value
    }
  }
  if (changes._pm_portfoliolookup_value) {
    const id = changes._pm_portfoliolookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_portfolioLookup@odata.bind'] = `/pm_portfolios(${id})`
  }
  if (changes._pm_programmelookup_value) {
    const id = changes._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_programmeLookup@odata.bind'] = `/pm_programmes(${id})`
  }
  if (changes._pm_project_value) {
    const id = changes._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_project@odata.bind'] = `/pm_projects(${id})`
  }
  if (changes._pm_fundingsource_value) {
    const id = changes._pm_fundingsource_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (id) cleanPayload['pm_fundingsource@odata.bind'] = `/pm_fundingsources(${id})`
  }
  console.log('[updateBudgetLine] Updating budget line ID:', id, 'with changes:', changes)
  try {
    await Pm_budgetlinesService.update(id, cleanPayload as any)
    console.log('[updateBudgetLine] API Update successful. Fetching updated budget line record...')
    const mapped = await fetchBudgetLineById(id)
    console.log('[updateBudgetLine] Fetched updated budget line record:', mapped)

    if (mapped && mapped.pm_budgetlineid) {
      Object.keys(changes).forEach((key) => {
        const val = (changes as any)[key]
        if (val !== undefined && key !== 'pm_budgetlineid') {
          writeAuditLog({
            actionType: 'Update',
            entityName: 'pm_budgetlines',
            recordId: id,
            recordName: mapped.pm_budgetlinename || 'Budget Line',
            fieldName: key,
            newValue: String(val),
          })
        }
      })
      if (mapped._pm_project_value) {
        console.log('[updateBudgetLine] Recalculating financials for project ID:', mapped._pm_project_value)
        await recalculateRealFinancialsForProject(mapped._pm_project_value)
      } else {
        console.log('[updateBudgetLine] No project lookup ID (_pm_project_value) present on budget line. Recalculation skipped.')
      }
    } else {
      console.warn('[updateBudgetLine] Mapped record is null or missing ID after refresh fetch.')
    }
    return mapped
  } catch (err) {
    console.error('[updateBudgetLine] Failed inside updateBudgetLine service:', err)
    throw err
  }
}

export async function deleteBudgetLine(id: string): Promise<void> {
  let projectId: string | undefined
  try {
    const details = await fetchBudgetLineById(id)
    if (details?._pm_project_value) projectId = details._pm_project_value
  } catch (e) { }

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_budgetlines',
    recordId: id,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted',
  })
  await Pm_budgetlinesService.delete(id)

  if (projectId) {
    await recalculateRealFinancialsForProject(projectId)
  }
}

export async function fetchFundingSources(): Promise<FundingSourceModel[]> {
  const selectFields = [
    'pm_fundingsourceid', 'pm_fundingsourcename', 'pm_fundingtype',
    'pm_fundingstatus', 'pm_totalamounteur', 'pm_allocatedamounteur',
    'pm_availableamounteur', 'pm_fundingbody',
    'pm_effectivefromdate', 'pm_effectivetodate',
    '_pm_portfolio_value', '_pm_programmelookup_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_fundingsourcename asc'],
    top: 500,
  }
  const result = await Pm_fundingsourcesService.getAll({ ...options, filter: 'statecode eq 0' })
  try { console.debug('[dataverseService] fetchFundingSources result:', result) } catch (e) { }
  let list = unwrapList<Pm_fundingsources>(result).map(mapFundingSource)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchFundingSources: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) { }
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
      'pm_availableamounteur', 'pm_fundingbody',
      'pm_effectivefromdate', 'pm_effectivetodate',
      '_pm_portfolio_value', '_pm_programmelookup_value',
    ],
  })
  try { console.debug('[dataverseService] fetchFundingSourceById result:', result) } catch (e) { }
  const item = unwrapSingle<Pm_fundingsources>(result)
  return item ? mapFundingSource(item) : null
}

export async function createFundingSource(payload: Partial<FundingSourceModel>): Promise<FundingSourceModel | null> {
  const SKIP_VIRTUAL = new Set([
    'pm_referencecode', 'pm_programmename',
    'pm_portfolioname', 'pm_programmelookupname',
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && !SKIP_VIRTUAL.has(key)) {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_fundingsourcesService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createFundingSource payload/result:', cleanPayload, result) } catch (e) { }
  const item = unwrapSingle<Pm_fundingsources>(result)
  const mapped = item ? mapFundingSource(item) : null

  if (mapped && mapped.pm_fundingsourceid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_fundingsources',
      recordId: mapped.pm_fundingsourceid,
      recordName: mapped.pm_fundingsourcename || 'Funding Source',
    })
  }

  return mapped
}

export async function updateFundingSource(id: string, changes: Partial<FundingSourceModel>): Promise<FundingSourceModel | null> {
  const SKIP_VIRTUAL = new Set([
    'pm_fundingsourceid',
    'pm_referencecode', 'pm_programmename',
    'pm_portfolioname', 'pm_programmelookupname',
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && !SKIP_VIRTUAL.has(key)) {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_fundingsourcesService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateFundingSource id/changes/result:', id, cleanPayload, result) } catch (e) { }
  const mapped = await fetchFundingSourceById(id)

  if (mapped && mapped.pm_fundingsourceid) {
    Object.keys(changes).forEach((key) => {
      const val = (changes as any)[key]
      if (val !== undefined && key !== 'pm_fundingsourceid') {
        writeAuditLog({
          actionType: 'Update',
          entityName: 'pm_fundingsources',
          recordId: id,
          recordName: mapped.pm_fundingsourcename || 'Funding Source',
          fieldName: key,
          newValue: String(val),
        })
      }
    })
  }

  return mapped
}

export async function deleteFundingSource(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteFundingSource id:', id) } catch (e) { }
  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_fundingsources',
    recordId: id,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted',
  })
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

export async function resolveCashflowLookupNames(list: CashflowEntryModel[]): Promise<void> {
  try {
    const programmeIds = Array.from(new Set(list.map((e) => e._pm_programmelookup_value).filter(Boolean))) as string[]
    const projectIds = Array.from(new Set(list.map((e) => e._pm_project_value).filter(Boolean))) as string[]
    const fiscalPeriodIds = Array.from(new Set(list.map((e) => e._pm_fiscalperiod_value).filter(Boolean))) as string[]
    const budgetLineIds = Array.from(new Set(list.map((e) => e._pm_budgetline_value).filter(Boolean))) as string[]

    const [programmesResult, projectsResult, fiscalPeriodsResult, budgetLinesResult] = await Promise.all([
      programmeIds.length > 0
        ? Pm_programmesService.getAll({ filter: programmeIds.map((id) => `pm_programmeid eq '${id}'`).join(' or '), select: ['pm_programmeid', 'pm_programmename'], top: 500 })
        : Promise.resolve(null),
      projectIds.length > 0
        ? Pm_projectsService.getAll({ filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '), select: ['pm_projectid', 'pm_projectname'], top: 500 })
        : Promise.resolve(null),
      fiscalPeriodIds.length > 0
        ? Pm_fiscalperiodsService.getAll({ filter: fiscalPeriodIds.map((id) => `pm_fiscalperiodid eq '${id}'`).join(' or '), select: ['pm_fiscalperiodid', 'pm_periodname'], top: 500 })
        : Promise.resolve(null),
      budgetLineIds.length > 0
        ? Pm_budgetlinesService.getAll({ filter: budgetLineIds.map((id) => `pm_budgetlineid eq '${id}'`).join(' or '), select: ['pm_budgetlineid', 'pm_budgetlinename'], top: 500 })
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

    const budgetLineNameById = new Map<string, string>()
    if (budgetLinesResult) {
      const budgetLines = unwrapList<Pm_budgetlines>(budgetLinesResult)
      for (const bl of budgetLines) {
        if (bl.pm_budgetlineid && bl.pm_budgetlinename) budgetLineNameById.set(bl.pm_budgetlineid.replace(/[{}]/g, '').trim().toLowerCase(), bl.pm_budgetlinename)
      }
    }

    for (const entry of list) {
      const normProgId = entry._pm_programmelookup_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normProjId = entry._pm_project_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normFiscId = entry._pm_fiscalperiod_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normBudgetLineId = entry._pm_budgetline_value?.replace(/[{}]/g, '').trim().toLowerCase()
      if (normProgId && programmeNameById.has(normProgId)) entry.pm_programmelookupname = programmeNameById.get(normProgId)
      if (normProjId && projectNameById.has(normProjId)) entry.pm_projectname = projectNameById.get(normProjId)
      if (normFiscId && fiscalPeriodNameById.has(normFiscId)) entry.pm_fiscalperiodname = fiscalPeriodNameById.get(normFiscId)
      if (normBudgetLineId && budgetLineNameById.has(normBudgetLineId)) entry.pm_budgetlinename = budgetLineNameById.get(normBudgetLineId)
    }
  } catch (err) {
    try { console.warn('[dataverseService] resolveCashflowLookupNames: failed to resolve lookup names', err) } catch (e) { }
  }
}

export async function fetchCashflowEntries(): Promise<CashflowEntryModel[]> {
  const result = await Pm_cashflowentriesService.getAll({
    filter: 'statecode eq 0',
    select: [
      'pm_cashflowentryid', 'pm_entryname', 'pm_amounteur',
      'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
      'pm_category', 'pm_description', 'pm_invoicenumber',
      '_pm_fiscalperiod_value', '_pm_programmelookup_value', '_pm_project_value',
      '_pm_budgetline_value',
    ],
    orderBy: ['pm_transactiondate desc'],
    top: 500,
  })
  const list = unwrapList<Pm_cashflowentries>(result).map(mapCashflowEntry)
  await resolveCashflowLookupNames(list)
  return list
}

export interface PortfolioLookupItem {
  pm_portfolioid: string
  pm_portfolioname: string
}

export interface ProgrammeLookupItem {
  pm_programmeid: string
  pm_programmename: string
  _pm_portfolio_value?: string
}

export interface ProjectLookupItem {
  pm_projectid: string
  pm_projectname: string
  pm_projectcode?: string
  _pm_programme_value?: string
}

export async function fetchPortfoliosForLookup(): Promise<PortfolioLookupItem[]> {
  const result = await Pm_portfoliosService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_portfolioid', 'pm_portfolioname'],
    orderBy: ['pm_portfolioname asc'],
    top: 500,
  })
  return unwrapList<Pm_portfolios>(result).map((item) => ({
    pm_portfolioid: item.pm_portfolioid ? item.pm_portfolioid.replace(/[{}]/g, '').trim().toLowerCase() : '',
    pm_portfolioname: item.pm_portfolioname || '',
  }))
}

export async function fetchProgrammesForLookup(): Promise<ProgrammeLookupItem[]> {
  const result = await Pm_programmesService.getAll({
    filter: 'statecode eq 0',
    select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value'],
    orderBy: ['pm_programmename asc'],
    top: 500,
  })
  return unwrapList<Pm_programmes>(result).map((item) => ({
    pm_programmeid: item.pm_programmeid ? item.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase() : '',
    pm_programmename: item.pm_programmename || '',
    _pm_portfolio_value: item._pm_portfolio_value ? item._pm_portfolio_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
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
    pm_projectid: item.pm_projectid ? item.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase() : '',
    pm_projectname: item.pm_projectname || '',
    pm_projectcode: item.pm_projectcode || '',
    _pm_programme_value: item._pm_programme_value ? item._pm_programme_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
  }))
}

export async function createCashflowEntry(payload: Partial<CashflowEntryModel>): Promise<CashflowEntryModel | null> {
  const SKIP_FIELDS = new Set([
    'pm_cashflowentryid',
    'pm_fiscalperiodname',
    'pm_programmelookupname',
    'pm_projectname',
    'pm_budgetlinename',
    '_pm_fiscalperiod_value',
    '_pm_programmelookup_value',
    '_pm_project_value',
    '_pm_budgetline_value',
    'statecode'
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' && !SKIP_FIELDS.has(key)) {
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
  if (payload._pm_budgetline_value) {
    const budgetLineId = payload._pm_budgetline_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (budgetLineId) {
      cleanPayload['pm_budgetline@odata.bind'] = '/pm_budgetlines(' + budgetLineId + ')'
    }
  }
  const result = await Pm_cashflowentriesService.create({ ...defaults, ...cleanPayload } as any)
  if (!result.success) {
    console.error('[finance.service] createCashflowEntry: OData create failed! Errors:', result.error)
    throw new Error(result.error ? JSON.stringify(result.error) : 'Failed to create cashflow entry in Dataverse')
  }
  const item = unwrapSingle<Pm_cashflowentries>(result)
  const mapped = item ? mapCashflowEntry(item) : null

  if (mapped && mapped.pm_cashflowentryid) {
    await resolveCashflowLookupNames([mapped])
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_cashflowentries',
      recordId: mapped.pm_cashflowentryid,
      recordName: mapped.pm_entryname || 'Cash Flow Entry',
    })
    if (mapped._pm_project_value) {
      await recalculateRealFinancialsForProject(mapped._pm_project_value)
    }
  }

  return mapped
}

export async function updateCashflowEntry(id: string, changes: Partial<CashflowEntryModel>): Promise<CashflowEntryModel | null> {
  console.log('[finance.service] updateCashflowEntry: editing entry id:', id)
  try {
    console.log('[finance.service] updateCashflowEntry: raw changes payload:', JSON.stringify(changes))
  } catch (e) {
    console.log('[finance.service] updateCashflowEntry: raw changes payload (fallback):', changes)
  }

  // Fetch old record for audit log comparison before we perform update
  let oldRecord: CashflowEntryModel | null = null
  try {
    const details = await Pm_cashflowentriesService.get(id, {
      select: [
        'pm_cashflowentryid', 'pm_entryname', 'pm_amounteur',
        'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
        'pm_category', 'pm_description', 'pm_invoicenumber',
        '_pm_fiscalperiod_value', '_pm_programmelookup_value', '_pm_project_value',
        '_pm_budgetline_value',
      ]
    })
    const item = unwrapSingle<Pm_cashflowentries>(details)
    oldRecord = item ? mapCashflowEntry(item) : null
  } catch (e) {
    console.warn('[finance.service] updateCashflowEntry: failed to fetch old record for audit logging', e)
  }

  const SKIP_FIELDS = new Set([
    'pm_cashflowentryid',
    'pm_fiscalperiodname',
    'pm_programmelookupname',
    'pm_projectname',
    'pm_budgetlinename',
    '_pm_fiscalperiod_value',
    '_pm_programmelookup_value',
    '_pm_project_value',
    '_pm_budgetline_value',
    'statecode'
  ])
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && !SKIP_FIELDS.has(key)) {
      cleanPayload[key] = value
    }
  }
  if (changes._pm_fiscalperiod_value) {
    const fiscalPeriodId = changes._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (fiscalPeriodId) {
      cleanPayload['pm_fiscalperiod@odata.bind'] = `/pm_fiscalperiods(${fiscalPeriodId})`
    }
  }
  if (changes._pm_programmelookup_value) {
    const programmeId = changes._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (programmeId) {
      cleanPayload['pm_programmeLookup@odata.bind'] = `/pm_programmes(${programmeId})`
    }
  }
  if (changes._pm_project_value) {
    const projectId = changes._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = `/pm_projects(${projectId})`
    }
  }
  if (changes._pm_budgetline_value) {
    const budgetLineId = changes._pm_budgetline_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (budgetLineId) {
      cleanPayload['pm_budgetline@odata.bind'] = `/pm_budgetlines(${budgetLineId})`
    }
  }
  console.log('[finance.service] updateCashflowEntry: final cleanPayload for OData:', cleanPayload)
  try {
    const result = await Pm_cashflowentriesService.update(id, cleanPayload as any)
    if (!result.success) {
      console.error('[finance.service] updateCashflowEntry: OData update failed! Errors:', result.error)
      throw new Error(result.error ? JSON.stringify(result.error) : 'Failed to update cashflow entry in Dataverse')
    }
    console.log('[finance.service] updateCashflowEntry: OData update successful')
  } catch (error) {
    console.error('[finance.service] updateCashflowEntry: OData update failed with exception!', error)
    throw error
  }
  const details = await Pm_cashflowentriesService.get(id, {
    select: [
      'pm_cashflowentryid', 'pm_entryname', 'pm_amounteur',
      'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
      'pm_category', 'pm_description', 'pm_invoicenumber',
      '_pm_fiscalperiod_value', '_pm_programmelookup_value', '_pm_project_value',
      '_pm_budgetline_value',
    ]
  })
  const item = unwrapSingle<Pm_cashflowentries>(details)
  const mapped = item ? mapCashflowEntry(item) : null

  if (mapped && mapped.pm_cashflowentryid) {
    await resolveCashflowLookupNames([mapped])
    Object.keys(changes).forEach((key) => {
      const val = (changes as any)[key]
      if (val !== undefined && key !== 'pm_cashflowentryid') {
        const rawOldVal = oldRecord ? (oldRecord as any)[key] : undefined
        // Skip logging if value hasn't changed (compare as strings case-insensitively/trimmed)
        const strOld = rawOldVal !== undefined && rawOldVal !== null ? String(rawOldVal).trim().toLowerCase() : ''
        const strNew = val !== null ? String(val).trim().toLowerCase() : ''
        if (strOld === strNew) {
          return
        }

        writeAuditLog({
          actionType: 'Update',
          entityName: 'pm_cashflowentries',
          recordId: id,
          recordName: mapped.pm_entryname || 'Cash Flow Entry',
          fieldName: key,
          oldValue: rawOldVal !== undefined && rawOldVal !== null ? String(rawOldVal) : '',
          newValue: String(val),
        })
      }
    })
    if (mapped._pm_project_value) {
      await recalculateRealFinancialsForProject(mapped._pm_project_value)
    }
  }

  return mapped
}

export async function deleteCashflowEntry(id: string): Promise<void> {
  let projectId: string | undefined
  try {
    const details = await Pm_cashflowentriesService.get(id, { select: ['_pm_project_value'] })
    const item = unwrapSingle<Pm_cashflowentries>(details)
    if (item?._pm_project_value) projectId = item._pm_project_value
  } catch (e) { }

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_cashflowentries',
    recordId: id,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted',
  })
  await Pm_cashflowentriesService.delete(id)

  if (projectId) {
    await recalculateRealFinancialsForProject(projectId)
  }
}

export async function recalculateRealFinancialsForProject(projectId: string | null | undefined): Promise<void> {
  const normProjId = normalizeLookupId(projectId || undefined)
  console.log('[recalculateRealFinancialsForProject] Triggered for project ID:', projectId, 'normalized:', normProjId)
  if (!normProjId) {
    console.warn('[recalculateRealFinancialsForProject] Normalized project ID is empty, aborting rollup.')
    return
  }

  try {
    // 1. Fetch active budget lines for this project
    console.log('[recalculateRealFinancialsForProject] Fetching active budget lines for project...')
    const budgetResult = await Pm_budgetlinesService.getAll({
      filter: `_pm_project_value eq '${normProjId}' and statecode eq 0`,
      select: ['pm_budgetlineid', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_estimatetocompleteeur', 'pm_costcategory'],
      top: 500,
    })
    const projectLines = unwrapList<any>(budgetResult)
    console.log('[recalculateRealFinancialsForProject] Found budget lines count:', projectLines.length, 'Lines details:', projectLines)

    if (projectLines.length === 0) {
      console.warn(`[recalculateRealFinancialsForProject] No budget lines found for project ${normProjId}`)
      return
    }

    // 2. Fetch active cashflow outflow actual entries for this project
    console.log('[recalculateRealFinancialsForProject] Fetching cash flow outflows for project...')
    const cashflowResult = await Pm_cashflowentriesService.getAll({
      filter: `_pm_project_value eq '${normProjId}' and statecode eq 0 and pm_transactiondirection eq 0 and pm_transactiontype eq 0`,
      select: ['pm_cashflowentryid', 'pm_amounteur', 'pm_category'],
      top: 500,
    })
    const projectCashflows = unwrapList<any>(cashflowResult)
    console.log('[recalculateRealFinancialsForProject] Cash flows count:', projectCashflows.length, 'details:', projectCashflows)

    // 3. Fetch approved/chargeable timesheet entries for this project
    console.log('[recalculateRealFinancialsForProject] Fetching timesheet entries for project...')
    let projectTimesheets: any[] = []
    try {
      const tsResult = await Pm_timesheetentriesService.getAll({
        filter: `_pm_project_value eq '${normProjId}' and statecode eq 0`,
        select: ['pm_timesheetentryid', 'pm_hoursworked', 'pm_workdate', 'pm_ischargeable', 'pm_isapproved', '_pm_project_value'],
        top: 1000,
      })
      projectTimesheets = unwrapList<any>(tsResult).filter((e) => e.pm_isapproved || e.pm_ischargeable)
      console.log('[recalculateRealFinancialsForProject] Timesheet entries count (approved/chargeable):', projectTimesheets.length)
    } catch (err) {
      console.warn('[recalculateRealFinancialsForProject] Failed to fetch timesheet entries:', err)
    }

    // 4. Recalculate each budget line
    let totalProjectBudget = 0
    let totalProjectActuals = 0

    for (const bl of projectLines) {
      if (!bl.pm_budgetlineid) continue

      const category = String(bl.pm_costcategory ?? '')

      // Calculate cashflow sum for this category
      const blCashflows = projectCashflows.filter((cf) => {
        const cfCategory = String(cf.pm_category ?? '')
        return cfCategory === category
      })
      const cashflowsSum = blCashflows.reduce((sum, cf) => sum + (cf.pm_amounteur || 0), 0)

      // Calculate timesheet sum for this category
      const blTimesheets = projectTimesheets.filter((e) => {
        const expectedCat = e.pm_ischargeable ? '0' : '1'
        return expectedCat === category
      })
      const timesheetsSum = blTimesheets.reduce((sum, e) => sum + (e.pm_hoursworked || 0) * 50, 0)

      const lineActuals = cashflowsSum + timesheetsSum
      const approvedBudget = bl.pm_approvedbudgeteur || 0
      const variance = approvedBudget - lineActuals
      const etc = bl.pm_estimatetocompleteeur || 0
      const eac = lineActuals + etc

      console.log(`[recalculateRealFinancialsForProject] Line ${bl.pm_budgetlineid} recalculation result:`, {
        approvedBudget,
        lineActuals,
        variance,
        etc,
        eac,
        cashflowsSum,
        timesheetsSum
      })

      totalProjectBudget += approvedBudget
      totalProjectActuals += lineActuals

      // Update the budget line record directly in Dataverse (bypass recalculation recursion)
      console.log(`[recalculateRealFinancialsForProject] Direct update on budget line ${bl.pm_budgetlineid} to Dataverse:`, {
        pm_actualspendeur: lineActuals,
        pm_varianceeur: variance,
        pm_estimateatcompletioneur: eac
      })
      await Pm_budgetlinesService.update(bl.pm_budgetlineid, {
        pm_actualspendeur: lineActuals,
        pm_varianceeur: variance,
        pm_estimateatcompletioneur: eac,
      } as any)
    }

    console.log('[recalculateRealFinancialsForProject] Aggregated project totals calculated:', { totalProjectBudget, totalProjectActuals })

    // 5. Update the project record
    console.log('[recalculateRealFinancialsForProject] Fetching project info to resolve parents...')
    const projectDetailsResult = await Pm_projectsService.get(normProjId, {
      select: ['pm_projectid', '_pm_portfolio_value', '_pm_programme_value'],
    })
    const projectDetails = unwrapSingle<Pm_projects>(projectDetailsResult)
    console.log('[recalculateRealFinancialsForProject] Project details fetched:', projectDetails)

    console.log('[recalculateRealFinancialsForProject] Updating project ID:', normProjId, 'with totals:', {
      pm_approvedbudgeteur: totalProjectBudget,
      pm_actualcosteur: totalProjectActuals
    })
    await Pm_projectsService.update(normProjId, {
      pm_approvedbudgeteur: totalProjectBudget,
      pm_actualcosteur: totalProjectActuals,
    } as any)
    console.log('[recalculateRealFinancialsForProject] Project record updated successfully.')

    // 6. Recalculate Programme actual spend
    const programmeId = normalizeLookupId(projectDetails?._pm_programme_value)
    if (programmeId) {
      try {
        console.log('[recalculateRealFinancialsForProject] Fetching projects of parent programme:', programmeId)
        const progProjectsResult = await Pm_projectsService.getAll({
          filter: `_pm_programme_value eq '${programmeId}' and statecode eq 0`,
          select: ['pm_projectid', 'pm_actualcosteur'],
          top: 500,
        })
        const progProjects = unwrapList<any>(progProjectsResult)
        const totalProgActuals = progProjects.reduce((sum, p) => sum + (p.pm_actualcosteur || 0), 0)

        console.log('[recalculateRealFinancialsForProject] Updating Programme ID:', programmeId, 'actual spend:', totalProgActuals)
        await Pm_programmesService.update(programmeId, {
          pm_actualspendeur: totalProgActuals,
        } as any)
        console.log('[recalculateRealFinancialsForProject] Programme updated successfully.')
      } catch (err) {
        console.warn(`[recalculateRealFinancialsForProject] Failed to update programme ${programmeId}:`, err)
      }
    }

    // 7. Recalculate Portfolio budget & actual spend
    const portfolioId = normalizeLookupId(projectDetails?._pm_portfolio_value)
    if (portfolioId) {
      try {
        console.log('[recalculateRealFinancialsForProject] Fetching projects of parent portfolio:', portfolioId)
        const portProjectsResult = await Pm_projectsService.getAll({
          filter: `_pm_portfolio_value eq '${portfolioId}' and statecode eq 0`,
          select: ['pm_projectid', 'pm_approvedbudgeteur', 'pm_actualcosteur'],
          top: 500,
        })
        const portProjects = unwrapList<any>(portProjectsResult)
        const totalPortBudget = portProjects.reduce((sum, p) => sum + (p.pm_approvedbudgeteur || 0), 0)
        const totalPortActuals = portProjects.reduce((sum, p) => sum + (p.pm_actualcosteur || 0), 0)

        console.log('[recalculateRealFinancialsForProject] Updating Portfolio ID:', portfolioId, {
          pm_approvedbudgeteur: totalPortBudget,
          pm_actualspendeur: totalPortActuals
        })
        await Pm_portfoliosService.update(portfolioId, {
          pm_approvedbudgeteur: totalPortBudget,
          pm_actualspendeur: totalPortActuals,
        } as any)
        console.log('[recalculateRealFinancialsForProject] Portfolio updated successfully.')
      } catch (err) {
        console.warn(`[recalculateRealFinancialsForProject] Failed to update portfolio ${portfolioId}:`, err)
      }
    }

    console.log(`[recalculateRealFinancialsForProject] Successfully completed rollup for project ${normProjId}`)
  } catch (err) {
    console.error(`[recalculateRealFinancialsForProject] Error rollup for project ${normProjId}:`, err)
  }
}
