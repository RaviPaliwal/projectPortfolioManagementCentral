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
import type { Pm_timesheetentries } from '@/generated/models/Pm_timesheetentriesModel'
import type {
  BudgetLineModel,
  FundingSourceModel,
  CashflowEntryModel,
  FinancialPeriodModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'
import type { IGetAllOptions } from '@/generated/models/CommonModels'

export const mapBudgetLine = (item: Pm_budgetlines): BudgetLineModel => {
  let calculatedTotal = 0
  if (item.pm_jsonrawcalculation) {
    try {
      const parsed = JSON.parse(item.pm_jsonrawcalculation)
      calculatedTotal = parsed.totalAmount || 0
    } catch {
      calculatedTotal = 0
    }
  }

  const rawItem = item as unknown as Record<string, unknown>

  return {
    pm_budgetlineid: item.pm_budgetlineid ? item.pm_budgetlineid.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    pm_budgetlinename: item.pm_budgetlinename,
    pm_budgetlinestatus: item.pm_budgetlinestatus,
    pm_budgetlinestatusname: item.pm_budgetlinestatusname,
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
    pm_costinglevelcode: rawItem.pm_costinglevelcode as number | undefined,
    pm_unitcosteur: rawItem.pm_unitcosteur as number | undefined,
    pm_quantity: rawItem.pm_quantity as number | undefined,
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
  pm_amount: item.pm_amount,
  pm_transactiondate: item.pm_transactiondate,
  pm_transactiondirection: item.pm_transactiondirection,
  pm_transactiontype: item.pm_transactiontype,
  pm_description: item.pm_description,
  pm_invoicenumber: item.pm_invoicenumber,
  pm_fiscalperiodname: item.pm_fiscalperiodname,
  pm_projectname: item.pm_projectname,
  pm_budgetlinename: item.pm_budgetlinename,
  _pm_fiscalperiod_value: item._pm_fiscalperiod_value ? item._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
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
  try {
    const selectFields = [
      'pm_budgetlineid', 'pm_budgetlinename', 'pm_budgetlinestatus', 'pm_approvedbudgeteur',
      'pm_revisedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur',
      'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory', 'pm_expencecatagory',
      'pm_notes',
      'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
      'pm_jsonrawcalculation',
      '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['pm_budgetlinename asc'],
      top: 500,
    }
    const result = await Pm_budgetlinesService.getAll({ ...options, filter: 'statecode eq 0' })
    if (!result.success) {
      console.error('[FinanceService] fetchBudgetLines failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_budgetlines>(result).map(mapBudgetLine)
    if (list.length === 0) {
      const fallbackResult = await Pm_budgetlinesService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_budgetlines>(fallbackResult).map(mapBudgetLine)
      }
    }
    return list
  } catch (err) {
    console.error('[FinanceService] fetchBudgetLines exception:', err)
    return []
  }
}

export async function fetchBudgetLineById(budgetLineId: string): Promise<BudgetLineModel | null> {
  try {
    const result = await Pm_budgetlinesService.get(budgetLineId, {
      select: [
        'pm_budgetlineid', 'pm_budgetlinename', 'pm_budgetlinestatus', 'pm_approvedbudgeteur',
        'pm_revisedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur',
        'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory', 'pm_expencecatagory',
        'pm_estimateatcompletioneur', 'pm_estimatetocompleteeur',
        'pm_jsonrawcalculation',
        '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
        '_pm_fundingsource_value', '_pm_fiscalperiod_value',
        'pm_notes',
      ],
    })
    if (!result.success) {
      console.error('[FinanceService] fetchBudgetLineById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_budgetlines>(result)
    if (!item) return null
    const mapped = mapBudgetLine(item)

    // Resolve lookup names manually to prevent 400 Bad Request on virtual relationship columns
    try {
      const portId = normalizeLookupId(item._pm_portfoliolookup_value)
      if (portId) {
        const portRes = await Pm_portfoliosService.get(portId, { select: ['pm_portfolioid', 'pm_portfolioname'] })
        if (portRes.success) {
          const port = unwrapSingle<Pm_portfolios>(portRes)
          if (port?.pm_portfolioname) {
            mapped.pm_portfolio = port.pm_portfolioname.trim()
            mapped.pm_portfoliolookupname = port.pm_portfolioname.trim()
          }
        }
      }
    } catch (err) {
      console.error('[FinanceService] fetchBudgetLineById portfolio lookup exception:', err)
    }

    try {
      const progId = normalizeLookupId(item._pm_programmelookup_value)
      if (progId) {
        const progRes = await Pm_programmesService.get(progId, { select: ['pm_programmeid', 'pm_programmename'] })
        if (progRes.success) {
          const prog = unwrapSingle<Pm_programmes>(progRes)
          if (prog?.pm_programmename) {
            mapped.pm_programme = prog.pm_programmename.trim()
            mapped.pm_programmelookupname = prog.pm_programmename.trim()
          }
        }
      }
    } catch (err) {
      console.error('[FinanceService] fetchBudgetLineById programme lookup exception:', err)
    }

    try {
      const projId = normalizeLookupId(item._pm_project_value)
      if (projId) {
        const projRes = await Pm_projectsService.get(projId, { select: ['pm_projectid', 'pm_projectname'] })
        if (projRes.success) {
          const proj = unwrapSingle<Pm_projects>(projRes)
          if (proj?.pm_projectname) {
            mapped.pm_projectcode = proj.pm_projectname.trim()
            mapped.pm_projectname = proj.pm_projectname.trim()
          }
        }
      }
    } catch (err) {
      console.error('[FinanceService] fetchBudgetLineById project lookup exception:', err)
    }

    try {
      const sourceId = normalizeLookupId(item._pm_fundingsource_value)
      if (sourceId) {
        const sourceRes = await Pm_fundingsourcesService.get(sourceId, { select: ['pm_fundingsourceid', 'pm_fundingsourcename'] })
        if (sourceRes.success) {
          const source = unwrapSingle<Pm_fundingsources>(sourceRes)
          if (source?.pm_fundingsourcename) {
            mapped.pm_fundingsourcename = source.pm_fundingsourcename.trim()
          }
        }
      }
    } catch (err) {
      console.error('[FinanceService] fetchBudgetLineById funding source lookup exception:', err)
    }

    try {
      const fpId = normalizeLookupId(item._pm_fiscalperiod_value)
      if (fpId) {
        const fpRes = await Pm_fiscalperiodsService.get(fpId, { select: ['pm_fiscalperiodid', 'pm_periodname'] })
        if (fpRes.success) {
          const fp = unwrapSingle<Pm_fiscalperiods>(fpRes)
          if (fp?.pm_periodname) {
            mapped.pm_fiscalperiodname = fp.pm_periodname.trim()
          }
        }
      }
    } catch (err) {
      console.error('[FinanceService] fetchBudgetLineById fiscal period lookup exception:', err)
    }

    return mapped
  } catch (err) {
    console.error('[FinanceService] fetchBudgetLineById failed:', err)
    return null
  }
}

export async function createBudgetLine(payload: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  try {
    const SKIP_VIRTUAL = new Set([
      'pm_fiscalperiodname', 'pm_fundingsourcename',
      'pm_portfoliolookupname', 'pm_programmelookupname', 'pm_projectname',
      'pm_portfolio', 'pm_programme', 'pm_projectcode',
      'pm_costinglevelcode', 'pm_unitcosteur', 'pm_quantity', 'pm_totalamounteur',
      '_pm_fiscalperiod_value', '_pm_fundingsource_value',
      '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
    ])
    const cleanPayload: Record<string, unknown> = {}
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
    const defaults: Record<string, unknown> = {
      pm_budgetlinestatus: 1,
      statecode: 0,
      statuscode: 1,
    }
    const result = await Pm_budgetlinesService.create({ ...defaults, ...cleanPayload } as unknown as Pm_budgetlines)
    if (!result.success) {
      console.error('[FinanceService] createBudgetLine failed:', result.error)
      throw new Error(`Failed to create budget line: ${result.error?.message || 'Unknown error'}`)
    }
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
  } catch (err) {
    console.error('[FinanceService] createBudgetLine exception:', err)
    throw err
  }
}

export async function updateBudgetLine(id: string, changes: Partial<BudgetLineModel>): Promise<BudgetLineModel | null> {
  try {
    const SKIP_VIRTUAL = new Set([
      'pm_budgetlineid',
      'pm_fiscalperiodname', 'pm_fundingsourcename',
      'pm_portfoliolookupname', 'pm_programmelookupname', 'pm_projectname',
      'pm_portfolio', 'pm_programme', 'pm_projectcode',
      'pm_costinglevelcode', 'pm_unitcosteur', 'pm_quantity', 'pm_totalamounteur',
      '_pm_fiscalperiod_value', '_pm_fundingsource_value',
      '_pm_portfoliolookup_value', '_pm_programmelookup_value', '_pm_project_value',
    ])
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null && !SKIP_VIRTUAL.has(key)) {
        cleanPayload[key] = value
      }
    }
    if (changes._pm_portfoliolookup_value) {
      const pid = changes._pm_portfoliolookup_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (pid) cleanPayload['pm_portfolioLookup@odata.bind'] = `/pm_portfolios(${pid})`
    }
    if (changes._pm_programmelookup_value) {
      const pid = changes._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (pid) cleanPayload['pm_programmeLookup@odata.bind'] = `/pm_programmes(${pid})`
    }
    if (changes._pm_project_value) {
      const pid = changes._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (pid) cleanPayload['pm_project@odata.bind'] = `/pm_projects(${pid})`
    }
    if (changes._pm_fundingsource_value) {
      const pid = changes._pm_fundingsource_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (pid) cleanPayload['pm_fundingsource@odata.bind'] = `/pm_fundingsources(${pid})`
    }

    const result = await Pm_budgetlinesService.update(id, cleanPayload as unknown as Pm_budgetlines)
    if (!result.success) {
      console.error('[FinanceService] updateBudgetLine failed:', result.error)
      throw new Error(`Failed to update budget line: ${result.error?.message || 'Unknown error'}`)
    }

    const mapped = await fetchBudgetLineById(id)

    if (mapped && mapped.pm_budgetlineid) {
      const changesRaw = changes as Record<string, unknown>
      Object.keys(changes).forEach((key) => {
        const val = changesRaw[key]
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
        await recalculateRealFinancialsForProject(mapped._pm_project_value)
      }
    }
    return mapped
  } catch (err) {
    console.error('[FinanceService] updateBudgetLine Failed:', err)
    throw err
  }
}

export async function deleteBudgetLine(id: string): Promise<void> {
  try {
    let projectId: string | undefined
    try {
      const details = await fetchBudgetLineById(id)
      if (details?._pm_project_value) projectId = details._pm_project_value
    } catch (e) {
      console.error('[FinanceService] deleteBudgetLine details fetch exception:', e)
    }

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
  } catch (err) {
    console.error('[FinanceService] deleteBudgetLine exception:', err)
    throw err
  }
}

export async function fetchFundingSources(): Promise<FundingSourceModel[]> {
  try {
    const selectFields = [
      'pm_fundingsourceid', 'pm_fundingsourcename', 'pm_fundingtype',
      'pm_fundingstatus', 'pm_totalamounteur', 'pm_allocatedamounteur',
      'pm_availableamounteur', 'pm_fundingbody',
      'pm_effectivefromdate', 'pm_effectivetodate',
      '_pm_portfolio_value', '_pm_programmelookup_value',
    ]
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['pm_fundingsourcename asc'],
      top: 500,
    }
    const result = await Pm_fundingsourcesService.getAll({ ...options, filter: 'statecode eq 0' })
    if (!result.success) {
      console.error('[FinanceService] fetchFundingSources failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_fundingsources>(result).map(mapFundingSource)
    if (list.length === 0) {
      const fallbackResult = await Pm_fundingsourcesService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_fundingsources>(fallbackResult).map(mapFundingSource)
      }
    }
    return list
  } catch (err) {
    console.error('[FinanceService] fetchFundingSources exception:', err)
    return []
  }
}

export async function fetchFundingSourceById(fundingSourceId: string): Promise<FundingSourceModel | null> {
  try {
    const result = await Pm_fundingsourcesService.get(fundingSourceId, {
      select: [
        'pm_fundingsourceid', 'pm_fundingsourcename', 'pm_fundingtype',
        'pm_fundingstatus', 'pm_totalamounteur', 'pm_allocatedamounteur',
        'pm_availableamounteur', 'pm_fundingbody',
        'pm_effectivefromdate', 'pm_effectivetodate',
        '_pm_portfolio_value', '_pm_programmelookup_value',
      ],
    })
    if (!result.success) {
      console.error('[FinanceService] fetchFundingSourceById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_fundingsources>(result)
    return item ? mapFundingSource(item) : null
  } catch (err) {
    console.error('[FinanceService] fetchFundingSourceById exception:', err)
    return null
  }
}

export async function createFundingSource(payload: Partial<FundingSourceModel>): Promise<FundingSourceModel | null> {
  try {
    const SKIP_VIRTUAL = new Set([
      'pm_referencecode', 'pm_programmename',
      'pm_portfolioname', 'pm_programmelookupname',
    ])
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' && !SKIP_VIRTUAL.has(key)) {
        cleanPayload[key] = value
      }
    }
    const defaults: Record<string, unknown> = {
      statecode: 0,
      statuscode: 1,
    }
    const result = await Pm_fundingsourcesService.create({ ...defaults, ...cleanPayload } as unknown as Pm_fundingsources)
    if (!result.success) {
      console.error('[FinanceService] createFundingSource failed:', result.error)
      throw new Error(`Failed to create funding source: ${result.error?.message || 'Unknown error'}`)
    }
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
  } catch (err) {
    console.error('[FinanceService] createFundingSource exception:', err)
    throw err
  }
}

export async function updateFundingSource(id: string, changes: Partial<FundingSourceModel>): Promise<FundingSourceModel | null> {
  try {
    const SKIP_VIRTUAL = new Set([
      'pm_fundingsourceid',
      'pm_referencecode', 'pm_programmename',
      'pm_portfolioname', 'pm_programmelookupname',
    ])
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null && !SKIP_VIRTUAL.has(key)) {
        cleanPayload[key] = value
      }
    }
    const result = await Pm_fundingsourcesService.update(id, cleanPayload as unknown as Pm_fundingsources)
    if (!result.success) {
      console.error('[FinanceService] updateFundingSource failed:', result.error)
      throw new Error(`Failed to update funding source: ${result.error?.message || 'Unknown error'}`)
    }
    const mapped = await fetchFundingSourceById(id)

    if (mapped && mapped.pm_fundingsourceid) {
      const changesRaw = changes as Record<string, unknown>
      Object.keys(changes).forEach((key) => {
        const val = changesRaw[key]
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
  } catch (err) {
    console.error('[FinanceService] updateFundingSource exception:', err)
    throw err
  }
}

export async function deleteFundingSource(id: string): Promise<void> {
  try {
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_fundingsources',
      recordId: id,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted',
    })
    await Pm_fundingsourcesService.delete(id)
  } catch (err) {
    console.error('[FinanceService] deleteFundingSource exception:', err)
    throw err
  }
}

export async function fetchFinancialPeriods(): Promise<FinancialPeriodModel[]> {
  try {
    const result = await Pm_fiscalperiodsService.getAll({
      filter: 'statecode eq 0',
      select: ['pm_fiscalperiodid', 'pm_periodname', 'pm_startdate', 'pm_enddate', 'pm_fiscalyear', 'pm_periodnumber', 'pm_isclosed', 'pm_iscurrentperiod'],
      orderBy: ['pm_startdate desc'],
      top: 200,
    })
    if (!result.success) {
      console.error('[FinanceService] fetchFinancialPeriods failed:', result.error)
      return []
    }
    return unwrapList<Pm_fiscalperiods>(result).map(mapFinancialPeriod)
  } catch (err) {
    console.error('[FinanceService] fetchFinancialPeriods exception:', err)
    return []
  }
}

export async function resolveCashflowLookupNames(list: CashflowEntryModel[]): Promise<void> {
  try {
    const projectIds = Array.from(new Set(list.map((e) => e._pm_project_value).filter(Boolean))) as string[]
    const fiscalPeriodIds = Array.from(new Set(list.map((e) => e._pm_fiscalperiod_value).filter(Boolean))) as string[]
    const budgetLineIds = Array.from(new Set(list.map((e) => e._pm_budgetline_value).filter(Boolean))) as string[]

    const [projectsResult, fiscalPeriodsResult, budgetLinesResult] = await Promise.all([
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

    const projectNameById = new Map<string, string>()
    if (projectsResult && projectsResult.success) {
      const projects = unwrapList<Pm_projects>(projectsResult)
      for (const p of projects) {
        if (p.pm_projectid && p.pm_projectname) projectNameById.set(p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_projectname)
      }
    }

    const fiscalPeriodNameById = new Map<string, string>()
    if (fiscalPeriodsResult && fiscalPeriodsResult.success) {
      const fPeriods = unwrapList<Pm_fiscalperiods>(fiscalPeriodsResult)
      for (const fp of fPeriods) {
        if (fp.pm_fiscalperiodid && fp.pm_periodname) fiscalPeriodNameById.set(fp.pm_fiscalperiodid.replace(/[{}]/g, '').trim().toLowerCase(), fp.pm_periodname)
      }
    }

    const budgetLineNameById = new Map<string, string>()
    if (budgetLinesResult && budgetLinesResult.success) {
      const budgetLines = unwrapList<Pm_budgetlines>(budgetLinesResult)
      for (const bl of budgetLines) {
        if (bl.pm_budgetlineid && bl.pm_budgetlinename) budgetLineNameById.set(bl.pm_budgetlineid.replace(/[{}]/g, '').trim().toLowerCase(), bl.pm_budgetlinename)
      }
    }

    for (const entry of list) {
      const normProjId = entry._pm_project_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normFiscId = entry._pm_fiscalperiod_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normBudgetLineId = entry._pm_budgetline_value?.replace(/[{}]/g, '').trim().toLowerCase()
      if (normProjId && projectNameById.has(normProjId)) entry.pm_projectname = projectNameById.get(normProjId)
      if (normFiscId && fiscalPeriodNameById.has(normFiscId)) entry.pm_fiscalperiodname = fiscalPeriodNameById.get(normFiscId)
      if (normBudgetLineId && budgetLineNameById.has(normBudgetLineId)) entry.pm_budgetlinename = budgetLineNameById.get(normBudgetLineId)
    }
  } catch (err) {
    console.error('[FinanceService] resolveCashflowLookupNames exception:', err)
  }
}

export async function fetchCashflowEntries(): Promise<CashflowEntryModel[]> {
  try {
    const result = await Pm_cashflowentriesService.getAll({
      filter: 'statecode eq 0',
      select: [
        'pm_cashflowentryid', 'pm_entryname', 'pm_amount',
        'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
        'pm_description', 'pm_invoicenumber',
        '_pm_fiscalperiod_value', '_pm_project_value',
        '_pm_budgetline_value',
      ],
      orderBy: ['pm_transactiondate desc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[FinanceService] fetchCashflowEntries failed:', result.error)
      return []
    }
    const list = unwrapList<Pm_cashflowentries>(result).map(mapCashflowEntry)
    await resolveCashflowLookupNames(list)
    return list
  } catch (err) {
    console.error('[FinanceService] fetchCashflowEntries exception:', err)
    return []
  }
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
  try {
    const result = await Pm_portfoliosService.getAll({
      filter: 'statecode eq 0',
      select: ['pm_portfolioid', 'pm_portfolioname'],
      orderBy: ['pm_portfolioname asc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[FinanceService] fetchPortfoliosForLookup failed:', result.error)
      return []
    }
    return unwrapList<Pm_portfolios>(result).map((item) => ({
      pm_portfolioid: item.pm_portfolioid ? item.pm_portfolioid.replace(/[{}]/g, '').trim().toLowerCase() : '',
      pm_portfolioname: item.pm_portfolioname || '',
    }))
  } catch (err) {
    console.error('[FinanceService] fetchPortfoliosForLookup exception:', err)
    return []
  }
}

export async function fetchProgrammesForLookup(): Promise<ProgrammeLookupItem[]> {
  try {
    const result = await Pm_programmesService.getAll({
      filter: 'statecode eq 0',
      select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value'],
      orderBy: ['pm_programmename asc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[FinanceService] fetchProgrammesForLookup failed:', result.error)
      return []
    }
    return unwrapList<Pm_programmes>(result).map((item) => ({
      pm_programmeid: item.pm_programmeid ? item.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase() : '',
      pm_programmename: item.pm_programmename || '',
      _pm_portfolio_value: item._pm_portfolio_value ? item._pm_portfolio_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    }))
  } catch (err) {
    console.error('[FinanceService] fetchProgrammesForLookup exception:', err)
    return []
  }
}

export async function fetchProjectsForLookup(): Promise<ProjectLookupItem[]> {
  try {
    const result = await Pm_projectsService.getAll({
      filter: 'statecode eq 0',
      select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_programme_value'],
      orderBy: ['pm_projectname asc'],
      top: 500,
    })
    if (!result.success) {
      console.error('[FinanceService] fetchProjectsForLookup failed:', result.error)
      return []
    }
    return unwrapList<Pm_projects>(result).map((item) => ({
      pm_projectid: item.pm_projectid ? item.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase() : '',
      pm_projectname: item.pm_projectname || '',
      pm_projectcode: item.pm_projectcode || '',
      _pm_programme_value: item._pm_programme_value ? item._pm_programme_value.replace(/[{}]/g, '').trim().toLowerCase() : undefined,
    }))
  } catch (err) {
    console.error('[FinanceService] fetchProjectsForLookup exception:', err)
    return []
  }
}

export async function createCashflowEntry(payload: Partial<CashflowEntryModel>): Promise<CashflowEntryModel | null> {
  try {
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
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' && !SKIP_FIELDS.has(key)) {
        cleanPayload[key] = value
      }
    }
    const defaults: Record<string, unknown> = {
      statecode: 0,
      statuscode: 1,
    }
    if (payload._pm_fiscalperiod_value) {
      const fiscalPeriodId = payload._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (fiscalPeriodId) {
        cleanPayload['pm_fiscalperiod@odata.bind'] = '/pm_fiscalperiods(' + fiscalPeriodId + ')'
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
    const result = await Pm_cashflowentriesService.create({ ...defaults, ...cleanPayload } as unknown as Pm_cashflowentries)
    if (!result.success) {
      console.error('[FinanceService] createCashflowEntry failed:', result.error)
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
  } catch (err) {
    console.error('[FinanceService] createCashflowEntry exception:', err)
    throw err
  }
}

export async function updateCashflowEntry(id: string, changes: Partial<CashflowEntryModel>): Promise<CashflowEntryModel | null> {
  try {
    // Fetch old record for audit log comparison before we perform update
    let oldRecord: CashflowEntryModel | null = null
    try {
      const details = await Pm_cashflowentriesService.get(id, {
        select: [
          'pm_cashflowentryid', 'pm_entryname', 'pm_amount',
          'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
          'pm_description', 'pm_invoicenumber',
          '_pm_fiscalperiod_value', '_pm_project_value',
          '_pm_budgetline_value',
        ]
      })
      if (details.success) {
        const item = unwrapSingle<Pm_cashflowentries>(details)
        oldRecord = item ? mapCashflowEntry(item) : null
      }
    } catch (e) {
      console.error('[FinanceService] updateCashflowEntry oldRecord fetch failed:', e)
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
    const cleanPayload: Record<string, unknown> = {}
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

    const result = await Pm_cashflowentriesService.update(id, cleanPayload as unknown as Pm_cashflowentries)
    if (!result.success) {
      console.error('[FinanceService] updateCashflowEntry failed:', result.error)
      throw new Error(result.error ? JSON.stringify(result.error) : 'Failed to update cashflow entry in Dataverse')
    }

    const details = await Pm_cashflowentriesService.get(id, {
      select: [
        'pm_cashflowentryid', 'pm_entryname', 'pm_amount',
        'pm_transactiondate', 'pm_transactiondirection', 'pm_transactiontype',
        'pm_description', 'pm_invoicenumber',
        '_pm_fiscalperiod_value', '_pm_project_value',
        '_pm_budgetline_value',
      ]
    })
    if (!details.success) {
      console.error('[FinanceService] updateCashflowEntry failed to retrieve updated item:', details.error)
      return null
    }
    const item = unwrapSingle<Pm_cashflowentries>(details)
    const mapped = item ? mapCashflowEntry(item) : null

    if (mapped && mapped.pm_cashflowentryid) {
      await resolveCashflowLookupNames([mapped])
      const changesRaw = changes as Record<string, unknown>
      Object.keys(changes).forEach((key) => {
        const val = changesRaw[key]
        if (val !== undefined && key !== 'pm_cashflowentryid') {
          const rawOldVal = oldRecord ? (oldRecord as Record<string, unknown>)[key] : undefined
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
  } catch (error) {
    console.error('[FinanceService] updateCashflowEntry exception:', error)
    throw error
  }
}

export async function deleteCashflowEntry(id: string): Promise<void> {
  try {
    let projectId: string | undefined
    try {
      const details = await Pm_cashflowentriesService.get(id, { select: ['_pm_project_value'] })
      if (details.success) {
        const item = unwrapSingle<Pm_cashflowentries>(details)
        if (item?._pm_project_value) projectId = item._pm_project_value
      }
    } catch (e) {
      console.error('[FinanceService] deleteCashflowEntry get details failed:', e)
    }

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
  } catch (err) {
    console.error('[FinanceService] deleteCashflowEntry exception:', err)
    throw err
  }
}

export async function recalculateRealFinancialsForProject(projectId: string | null | undefined): Promise<void> {
  const normProjId = normalizeLookupId(projectId || undefined)
  if (!normProjId) return

  try {
    // 1. Fetch active budget lines for this project
    const budgetResult = await Pm_budgetlinesService.getAll({
      filter: `_pm_project_value eq '${normProjId}' and statecode eq 0`,
      select: ['pm_budgetlineid', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_estimatetocompleteeur', 'pm_costcategory'],
      top: 500,
    })
    if (!budgetResult.success) {
      console.error('[FinanceService] recalculateRealFinancialsForProject budget lines failed:', budgetResult.error)
      return
    }
    const projectLines = unwrapList<Pm_budgetlines>(budgetResult)

    if (projectLines.length === 0) return

    // 2. Fetch active cashflow outflow actual entries for this project
    const cashflowResult = await Pm_cashflowentriesService.getAll({
      filter: `_pm_project_value eq '${normProjId}' and statecode eq 0 and pm_transactiondirection eq 0 and pm_transactiontype eq 0`,
      select: ['pm_cashflowentryid', 'pm_amount', '_pm_budgetline_value'],
      top: 500,
    })
    if (!cashflowResult.success) {
      console.error('[FinanceService] recalculateRealFinancialsForProject cashflows failed:', cashflowResult.error)
      return
    }
    const projectCashflows = unwrapList<Pm_cashflowentries>(cashflowResult)

    // 3. Fetch approved/chargeable timesheet entries for this project
    let projectTimesheets: Pm_timesheetentries[] = []
    try {
      const tsResult = await Pm_timesheetentriesService.getAll({
        filter: `_pm_project_value eq '${normProjId}' and statecode eq 0`,
        select: ['pm_timesheetentryid', 'pm_hoursworked', 'pm_workdate', 'pm_ischargeable', 'pm_isapproved', '_pm_project_value'],
        top: 1000,
      })
      if (tsResult.success) {
        projectTimesheets = unwrapList<Pm_timesheetentries>(tsResult).filter((e) => e.pm_isapproved || e.pm_ischargeable)
      } else {
        console.error('[FinanceService] recalculateRealFinancialsForProject timesheet entries failed:', tsResult.error)
      }
    } catch (err) {
      console.error('[FinanceService] recalculateRealFinancialsForProject timesheets exception:', err)
    }

    // 4. Recalculate each budget line
    let totalProjectBudget = 0
    let totalProjectActuals = 0

    for (const bl of projectLines) {
      if (!bl.pm_budgetlineid) continue

      const category = String(bl.pm_costcategory ?? '')

      // Calculate cashflow sum for this budget line
      const blCashflows = projectCashflows.filter((cf) => {
        const cfBudgetlineId = cf._pm_budgetline_value ? cf._pm_budgetline_value.replace(/[{}]/g, '').trim().toLowerCase() : ''
        const targetBudgetlineId = bl.pm_budgetlineid ? bl.pm_budgetlineid.replace(/[{}]/g, '').trim().toLowerCase() : ''
        return cfBudgetlineId === targetBudgetlineId
      })
      const cashflowsSum = blCashflows.reduce((sum, cf) => sum + (cf.pm_amount || 0), 0)

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

      totalProjectBudget += approvedBudget
      totalProjectActuals += lineActuals

      // Update the budget line record directly in Dataverse (bypass recalculation recursion)
      const updateRes = await Pm_budgetlinesService.update(bl.pm_budgetlineid, {
        pm_actualspendeur: lineActuals,
        pm_varianceeur: variance,
        pm_estimateatcompletioneur: eac,
      } as unknown as Pm_budgetlines)
      if (!updateRes.success) {
        console.error(`[FinanceService] recalculateRealFinancialsForProject budget line update failed for ${bl.pm_budgetlineid}:`, updateRes.error)
      }
    }

    // 5. Update the project record
    const projectDetailsResult = await Pm_projectsService.get(normProjId, {
      select: ['pm_projectid', '_pm_portfolio_value', '_pm_programme_value'],
    })
    if (!projectDetailsResult.success) {
      console.error(`[FinanceService] recalculateRealFinancialsForProject project details failed for ${normProjId}:`, projectDetailsResult.error)
      return
    }
    const projectDetails = unwrapSingle<Pm_projects>(projectDetailsResult)

    const projUpdateRes = await Pm_projectsService.update(normProjId, {
      pm_approvedbudget: totalProjectBudget,
      pm_actualcost: totalProjectActuals,
    } as unknown as Pm_projects)
    if (!projUpdateRes.success) {
      console.error(`[FinanceService] recalculateRealFinancialsForProject project update failed for ${normProjId}:`, projUpdateRes.error)
    }

    // 6. Recalculate Programme actual spend
    const programmeId = normalizeLookupId(projectDetails?._pm_programme_value)
    if (programmeId) {
      try {
        const progProjectsResult = await Pm_projectsService.getAll({
          filter: `_pm_programme_value eq '${programmeId}' and statecode eq 0`,
          select: ['pm_projectid', 'pm_actualcost'],
          top: 500,
        })
        if (progProjectsResult.success) {
          const progProjects = unwrapList<Pm_projects>(progProjectsResult)
          const totalProgActuals = progProjects.reduce((sum, p) => sum + (p.pm_actualcost || 0), 0)

          const progUpdateRes = await Pm_programmesService.update(programmeId, {
            pm_actualspendeur: totalProgActuals,
          } as unknown as Pm_programmes)
          if (!progUpdateRes.success) {
            console.error(`[FinanceService] recalculateRealFinancialsForProject programme update failed for ${programmeId}:`, progUpdateRes.error)
          }
        }
      } catch (err) {
        console.error('[FinanceService] recalculateRealFinancialsForProject programme rollup exception:', err)
      }
    }

    // 7. Recalculate Portfolio budget & actual spend
    const portfolioId = normalizeLookupId(projectDetails?._pm_portfolio_value)
    if (portfolioId) {
      try {
        const portProjectsResult = await Pm_projectsService.getAll({
          filter: `_pm_portfolio_value eq '${portfolioId}' and statecode eq 0`,
          select: ['pm_projectid', 'pm_approvedbudget', 'pm_actualcost'],
          top: 500,
        })
        if (portProjectsResult.success) {
          const portProjects = unwrapList<Pm_projects>(portProjectsResult)
          const totalPortBudget = portProjects.reduce((sum, p) => sum + (p.pm_approvedbudget || 0), 0)
          const totalPortActuals = portProjects.reduce((sum, p) => sum + (p.pm_actualcost || 0), 0)

          const portUpdateRes = await Pm_portfoliosService.update(portfolioId, {
            pm_approvedbudgeteur: totalPortBudget,
            pm_actualspendeur: totalPortActuals,
          } as unknown as Pm_portfolios)
          if (!portUpdateRes.success) {
            console.error(`[FinanceService] recalculateRealFinancialsForProject portfolio update failed for ${portfolioId}:`, portUpdateRes.error)
          }
        }
      } catch (err) {
        console.error('[FinanceService] recalculateRealFinancialsForProject portfolio rollup exception:', err)
      }
    }
  } catch (err) {
    console.error(`[recalculateRealFinancialsForProject] Error rollup for project ${normProjId}:`, err)
  }
}
