import { Pm_financialreportconfigsService } from '@/generated/services/Pm_financialreportconfigsService'
import type { Pm_financialreportconfigs } from '@/generated/models/Pm_financialreportconfigsModel'
import { unwrapList, unwrapSingle } from './common'

export interface FinancialReportConfigModel {
  pm_financialreportconfigid: string
  pm_name: string
  pm_description?: string
  pm_groupby?: number // Option Set
  pm_charttype?: number // Option Set
  pm_hierarchylevel?: number // Option Set
  pm_categoriesfilter?: string
  pm_fiscalyearsfilter?: string
  pm_selectedcolumns?: string // JSON string
  pm_selectedfilters?: string // JSON string
  pm_ispublic?: boolean
  ownerid?: string
  owneridname?: string
}

export async function fetchReportConfigs(): Promise<FinancialReportConfigModel[]> {
  try {
    const result = await Pm_financialreportconfigsService.getAll({
      select: [
        'pm_financialreportconfigid',
        'pm_name',
        'pm_description',
        'pm_groupby',
        'pm_charttype',
        'pm_hierarchylevel',
        'pm_categoriesfilter',
        'pm_fiscalyearsfilter',
        'pm_selectedcolumns',
        'pm_selectedfilters',
        'pm_ispublic',
        'ownerid'
      ],
      filter: 'statecode eq 0',
      top: 100
    })

    if (!result.success) {
      console.error('[FinancialReportConfigService] fetchReportConfigs failed:', result.error)
      return []
    }

    const list = unwrapList<Pm_financialreportconfigs>(result)
    return list.map(item => ({
      pm_financialreportconfigid: item.pm_financialreportconfigid!,
      pm_name: item.pm_name,
      pm_description: item.pm_description,
      pm_groupby: item.pm_groupby ? Number(item.pm_groupby) : undefined,
      pm_charttype: item.pm_charttype ? Number(item.pm_charttype) : undefined,
      pm_hierarchylevel: item.pm_hierarchylevel ? Number(item.pm_hierarchylevel) : undefined,
      pm_categoriesfilter: item.pm_categoriesfilter,
      pm_fiscalyearsfilter: item.pm_fiscalyearsfilter,
      pm_selectedcolumns: item.pm_selectedcolumns,
      pm_selectedfilters: item.pm_selectedfilters,
      pm_ispublic: item.pm_ispublic,
      ownerid: item.ownerid,
      owneridname: item.owneridname
    }))
  } catch (err) {
    console.error('[FinancialReportConfigService] fetchReportConfigs exception:', err)
    return []
  }
}

export async function createReportConfig(payload: Partial<FinancialReportConfigModel> & { 'ownerid@odata.bind'?: string }): Promise<FinancialReportConfigModel | null> {
  try {
    const cleanPayload: Record<string, any> = {
      pm_name: payload.pm_name || 'New Financial Report',
      pm_description: payload.pm_description,
      pm_groupby: payload.pm_groupby,
      pm_charttype: payload.pm_charttype,
      pm_hierarchylevel: payload.pm_hierarchylevel,
      pm_categoriesfilter: payload.pm_categoriesfilter,
      pm_fiscalyearsfilter: payload.pm_fiscalyearsfilter,
      pm_selectedcolumns: payload.pm_selectedcolumns,
      pm_selectedfilters: payload.pm_selectedfilters,
      pm_ispublic: payload.pm_ispublic ?? false,
      statecode: 0
    }

    if (payload['ownerid@odata.bind']) {
      cleanPayload['ownerid@odata.bind'] = payload['ownerid@odata.bind']
    }

    const result = await Pm_financialreportconfigsService.create(cleanPayload as any)
    if (!result.success) {
      console.error('[FinancialReportConfigService] createReportConfig failed:', result.error)
      return null
    }

    const created = unwrapSingle<Pm_financialreportconfigs>(result)
    if (!created) return null

    return {
      pm_financialreportconfigid: created.pm_financialreportconfigid!,
      pm_name: created.pm_name,
      pm_description: created.pm_description,
      pm_groupby: created.pm_groupby ? Number(created.pm_groupby) : undefined,
      pm_charttype: created.pm_charttype ? Number(created.pm_charttype) : undefined,
      pm_hierarchylevel: created.pm_hierarchylevel ? Number(created.pm_hierarchylevel) : undefined,
      pm_categoriesfilter: created.pm_categoriesfilter,
      pm_fiscalyearsfilter: created.pm_fiscalyearsfilter,
      pm_selectedcolumns: created.pm_selectedcolumns,
      pm_selectedfilters: created.pm_selectedfilters,
      pm_ispublic: created.pm_ispublic,
      ownerid: created.ownerid,
      owneridname: created.owneridname
    }
  } catch (err) {
    console.error('[FinancialReportConfigService] createReportConfig exception:', err)
    return null
  }
}

export async function updateReportConfig(
  id: string,
  payload: Partial<FinancialReportConfigModel>
): Promise<FinancialReportConfigModel | null> {
  try {
    const cleanPayload: Record<string, any> = {}
    
    if (payload.pm_name !== undefined) cleanPayload.pm_name = payload.pm_name
    if (payload.pm_description !== undefined) cleanPayload.pm_description = payload.pm_description
    if (payload.pm_groupby !== undefined) cleanPayload.pm_groupby = payload.pm_groupby
    if (payload.pm_charttype !== undefined) cleanPayload.pm_charttype = payload.pm_charttype
    if (payload.pm_hierarchylevel !== undefined) cleanPayload.pm_hierarchylevel = payload.pm_hierarchylevel
    if (payload.pm_categoriesfilter !== undefined) cleanPayload.pm_categoriesfilter = payload.pm_categoriesfilter
    if (payload.pm_fiscalyearsfilter !== undefined) cleanPayload.pm_fiscalyearsfilter = payload.pm_fiscalyearsfilter
    if (payload.pm_selectedcolumns !== undefined) cleanPayload.pm_selectedcolumns = payload.pm_selectedcolumns
    if (payload.pm_selectedfilters !== undefined) cleanPayload.pm_selectedfilters = payload.pm_selectedfilters
    if (payload.pm_ispublic !== undefined) cleanPayload.pm_ispublic = payload.pm_ispublic

    const result = await Pm_financialreportconfigsService.update(id, cleanPayload)
    if (!result.success) {
      console.error('[FinancialReportConfigService] updateReportConfig failed:', result.error)
      return null
    }

    const updated = unwrapSingle<Pm_financialreportconfigs>(result)
    if (!updated) return null

    return {
      pm_financialreportconfigid: updated.pm_financialreportconfigid!,
      pm_name: updated.pm_name,
      pm_description: updated.pm_description,
      pm_groupby: updated.pm_groupby ? Number(updated.pm_groupby) : undefined,
      pm_charttype: updated.pm_charttype ? Number(updated.pm_charttype) : undefined,
      pm_hierarchylevel: updated.pm_hierarchylevel ? Number(updated.pm_hierarchylevel) : undefined,
      pm_categoriesfilter: updated.pm_categoriesfilter,
      pm_fiscalyearsfilter: updated.pm_fiscalyearsfilter,
      pm_selectedcolumns: updated.pm_selectedcolumns,
      pm_selectedfilters: updated.pm_selectedfilters,
      pm_ispublic: updated.pm_ispublic,
      ownerid: updated.ownerid,
      owneridname: updated.owneridname
    }
  } catch (err) {
    console.error('[FinancialReportConfigService] updateReportConfig exception:', err)
    return null
  }
}

export async function deleteReportConfig(id: string): Promise<boolean> {
  try {
    await Pm_financialreportconfigsService.delete(id)
    return true
  } catch (err) {
    console.error('[FinancialReportConfigService] deleteReportConfig exception:', err)
    return false
  }
}
