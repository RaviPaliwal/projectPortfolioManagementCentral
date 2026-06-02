import {
  Pm_portfoliosService,
  Pm_programmesService,
  Pm_projectsService,
} from '@/generated'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { PortfolioModel } from '@/types/dataverse'
import {
  unwrapList,
  unwrapSingle,
  normalizeLookupId,
} from '@/services/common'
import type { ProjectHierarchy } from '@/services/common'
import { mapProgramme } from './programme.service'
import { mapProject } from './project.service'

export const mapPortfolio = (item: Pm_portfolios): PortfolioModel => ({
  pm_portfolioid: item.pm_portfolioid,
  pm_portfolioname: item.pm_portfolioname,
  pm_portfolioowner: item.pm_portfolioowner,
  pm_portfoliostatus: item.pm_portfoliostatus,
  pm_ragstatus: item.pm_ragstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_approvedbudgeteur: item.pm_approvedbudgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_portfoliodescription: item.pm_portfoliodescription,
  pm_strategicobjective: item.pm_strategicobjective,
  pm_prioritylevel: item.pm_prioritylevel,
  pm_businessunit: item.pm_businessunit,
  pm_createdon: item.pm_createdon,
})

export async function fetchPortfolioHierarchy(): Promise<ProjectHierarchy> {
  const [portfoliosResult, programmesResult, projectsResult] = await Promise.all([
    Pm_portfoliosService.getAll({ select: ['pm_portfolioid', 'pm_portfolioname', 'pm_portfolioowner', 'pm_portfoliostatus', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_portfoliodescription', 'pm_strategicobjective', 'pm_prioritylevel', 'pm_businessunit', 'pm_createdon'], top: 200 }),
    Pm_programmesService.getAll({ select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_programmemanager', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'], top: 500 }),
    Pm_projectsService.getAll({ select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_portfolio_value', '_pm_programme_value', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_plannedstartdate', 'pm_plannedenddate'], top: 1000 }),
  ])

  const portfolios = unwrapList<Pm_portfolios>(portfoliosResult).map(mapPortfolio)
  const programmes = unwrapList<Pm_programmes>(programmesResult)
  const projects = unwrapList<Pm_projects>(projectsResult)

  const portfolioNameById = new Map<string, string>()
  for (const p of portfolios) {
    if (p.pm_portfolioid && p.pm_portfolioname) {
      const portfolioId = normalizeLookupId(p.pm_portfolioid)
      if (portfolioId) portfolioNameById.set(portfolioId, p.pm_portfolioname)
    }
  }

  const mappedProgrammes = programmes.map((programme) => {
    const mapped = mapProgramme(programme)
    const portfolioId = normalizeLookupId(programme._pm_portfolio_value)
    if (!mapped.pm_portfolioname && portfolioId && portfolioNameById.has(portfolioId)) {
      mapped.pm_portfolioname = portfolioNameById.get(portfolioId)
    }
    return mapped
  })

  try {
    console.debug('[dataverseService] fetchPortfolioHierarchy raw results:', { portfoliosResult, programmesResult, projectsResult })
  } catch (e) {
    console.debug('[dataverseService] fetchPortfolioHierarchy: unable to log raw results')
  }

  return {
    portfolios,
    programmes: mappedProgrammes,
    projects: projects.map(mapProject),
  }
}

export async function createPortfolio(payload: Partial<PortfolioModel>): Promise<PortfolioModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_portfoliosService.create({ ...defaults, ...cleanPayload } as any)
    try { console.debug('[dataverseService] createPortfolio payload/result:', cleanPayload, result) } catch (e) {}
    const item = unwrapSingle<Pm_portfolios>(result)
    if (item) {
      return mapPortfolio(item)
    }
    try {
      console.warn('[dataverseService] createPortfolio: unwrapSingle returned null. Raw result:', JSON.stringify(result, null, 2))
    } catch (e) {
      console.warn('[dataverseService] createPortfolio: unwrapSingle returned null. Raw result (non-serializable):', result)
    }
    return null
  } catch (err: any) {
    try {
      console.error('[dataverseService] createPortfolio: API call failed:', err?.message || err, '| payload:', JSON.stringify(cleanPayload))
    } catch (e) {
      console.error('[dataverseService] createPortfolio: API call failed (unable to serialize):', err)
    }
    throw err
  }
}
