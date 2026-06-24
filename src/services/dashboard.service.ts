import {
  Pm_projectsService,
  Pm_portfoliosService,
  Pm_initiativesService,
  Pm_projectmilestonesService,
  Pm_budgetlinesService,
  Pm_fiscalperiodsService,
} from '@/generated'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_initiatives } from '@/generated/models/Pm_initiativesModel'
import type { Pm_fiscalperiods } from '@/generated/models/Pm_fiscalperiodsModel'
import type { Pm_budgetlines } from '@/generated/models/Pm_budgetlinesModel'
import type { Pm_projectmilestones } from '@/generated/models/Pm_projectmilestonesModel'
import { unwrapList } from '@/services/common'
import type { DashboardMetrics } from '@/services/common'
import type { IGetAllOptions } from '@/generated/models/CommonModels'

export interface DashboardFilterOptions {
  fiscalYear?: number
  portfolioId?: string
  startDate?: string
  endDate?: string
}

export async function fetchDashboardMetrics(options: DashboardFilterOptions = {}): Promise<DashboardMetrics> {
  const { fiscalYear, portfolioId, startDate, endDate } = options

  // Build filters
  let projectFilter = "statecode eq 0"
  let portfolioFilter = "statecode eq 0"

  if (portfolioId && portfolioId !== 'all') {
    projectFilter += ` and _pm_portfolio_value eq '${portfolioId}'`
    portfolioFilter += ` and pm_portfolioid eq '${portfolioId}'`
  }

  try {
    const [activeProjectResult, redProjectResult, amberProjectResult, greenProjectResult, portfolioResult, initiativeResult] = await Promise.all([
      Pm_projectsService.getAll({
        filter: projectFilter,
        select: ['pm_projectname', 'pm_ragstatus'],
        top: 500,
      }),
      Pm_projectsService.getAll({
        filter: `${projectFilter} and pm_ragstatus eq 2`,
        select: ['pm_projectname', 'pm_ragstatus'],
        top: 500,
      }),
      Pm_projectsService.getAll({
        filter: `${projectFilter} and pm_ragstatus eq 0`,
        select: ['pm_projectname', 'pm_ragstatus'],
        top: 500,
      }),
      Pm_projectsService.getAll({
        filter: `${projectFilter} and pm_ragstatus eq 1`,
        select: ['pm_projectname', 'pm_ragstatus'],
        top: 500,
      }),
      Pm_portfoliosService.getAll({
        filter: portfolioFilter,
        select: ['pm_portfolioid', 'pm_approvedbudgeteur', 'pm_actualspendeur'],
        top: 500,
      }),
      Pm_initiativesService.getAll({ select: ['pm_estimatedcosteur'], top: 500 }),
    ])

    if (!activeProjectResult.success) {
      console.error('[DashboardService] fetchDashboardMetrics activeProjects failed:', activeProjectResult.error)
    }
    if (!redProjectResult.success) {
      console.error('[DashboardService] fetchDashboardMetrics redProjects failed:', redProjectResult.error)
    }
    if (!amberProjectResult.success) {
      console.error('[DashboardService] fetchDashboardMetrics amberProjects failed:', amberProjectResult.error)
    }
    if (!greenProjectResult.success) {
      console.error('[DashboardService] fetchDashboardMetrics greenProjects failed:', greenProjectResult.error)
    }
    if (!portfolioResult.success) {
      console.error('[DashboardService] fetchDashboardMetrics portfolios failed:', portfolioResult.error)
    }
    if (!initiativeResult.success) {
      console.error('[DashboardService] fetchDashboardMetrics initiatives failed:', initiativeResult.error)
    }

    let approvedBudget = 0
    let actualSpend = 0

    // 1. Fiscal Year or Date Range filtering logic
    if (fiscalYear || startDate || endDate) {
      try {
        let budgetLineFilter = "statecode eq 0"

        if (portfolioId && portfolioId !== 'all') {
          budgetLineFilter += ` and _pm_portfolio_value eq '${portfolioId}'`
        }

        if (fiscalYear) {
          const periodsResult = await Pm_fiscalperiodsService.getAll({
            filter: `pm_fiscalyear eq ${fiscalYear} and statecode eq 0`,
            select: ['pm_fiscalperiodid'],
          })
          if (periodsResult.success) {
            const periods = unwrapList<Pm_fiscalperiods>(periodsResult)
            const periodIds = periods.map((p) => p.pm_fiscalperiodid).filter(Boolean) as string[]

            if (periodIds.length > 0) {
              const periodFilter = periodIds.map((id) => `_pm_fiscalperiod_value eq '${id}'`).join(' or ')
              budgetLineFilter += ` and (${periodFilter})`
            }
          } else {
            console.error('[DashboardService] fetchDashboardMetrics fiscal periods failed:', periodsResult.error)
          }
        }

        const budgetLinesResult = await Pm_budgetlinesService.getAll({
          filter: budgetLineFilter,
          select: ['pm_approvedbudgeteur', 'pm_actualspendeur'],
          top: 5000,
        })
        if (budgetLinesResult.success) {
          const budgetLines = unwrapList<Pm_budgetlines>(budgetLinesResult)
          approvedBudget = budgetLines.reduce((sum, bl) => sum + (bl.pm_approvedbudgeteur ?? 0), 0)
          actualSpend = budgetLines.reduce((sum, bl) => sum + (bl.pm_actualspendeur ?? 0), 0)
        } else {
          console.error('[DashboardService] fetchDashboardMetrics budget lines failed:', budgetLinesResult.error)
          if (portfolioResult.success) {
            const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
            approvedBudget = portfolios.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)
            actualSpend = portfolios.reduce((sum, p) => sum + (p.pm_actualspendeur ?? 0), 0)
          }
        }
      } catch (e) {
        console.error('[DashboardService] year-specific budget fetch failed', e)
        if (portfolioResult.success) {
          const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
          approvedBudget = portfolios.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)
          actualSpend = portfolios.reduce((sum, p) => sum + (p.pm_actualspendeur ?? 0), 0)
        }
      }
    } else {
      if (portfolioResult.success) {
        const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
        approvedBudget = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_approvedbudgeteur ?? 0), 0)
        actualSpend = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_actualspendeur ?? 0), 0)
      }
    }

    const activeProjects = activeProjectResult.success ? unwrapList<Pm_projects>(activeProjectResult) : []
    const redProjects = redProjectResult.success ? unwrapList<Pm_projects>(redProjectResult) : []
    const amberProjects = amberProjectResult.success ? unwrapList<Pm_projects>(amberProjectResult) : []
    const greenProjects = greenProjectResult.success ? unwrapList<Pm_projects>(greenProjectResult) : []
    const initiatives = initiativeResult.success ? unwrapList<Pm_initiatives>(initiativeResult) : []

    const pipelineValue = initiatives.reduce((sum, initiative) => sum + (initiative.pm_estimatedcosteur ?? 0), 0)
    const totalActivePortfolios = portfolioResult.success ? unwrapList<Pm_portfolios>(portfolioResult).length : 0

    return {
      totalActiveProjects: activeProjects.length,
      totalActivePortfolios,
      totalApprovedBudget: approvedBudget,
      totalActualSpend: actualSpend,
      projectsInRed: redProjects.length,
      projectsInAmber: amberProjects.length,
      projectsInGreen: greenProjects.length,
      pipelineValue,
    }
  } catch (err) {
    console.error('[DashboardService] fetchDashboardMetrics exception:', err)
    return {
      totalActiveProjects: 0,
      totalActivePortfolios: 0,
      totalApprovedBudget: 0,
      totalActualSpend: 0,
      projectsInRed: 0,
      projectsInAmber: 0,
      projectsInGreen: 0,
      pipelineValue: 0,
    }
  }
}

export async function fetchMilestonesDueThisMonth(): Promise<number> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const firstDay = `${year}-${month}-01`
    const lastDay = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`

    const options: IGetAllOptions = {
      filter: `pm_planneddate ge ${firstDay} and pm_planneddate le ${lastDay} and pm_status ne 2`,
      select: ['pm_projectmilestoneid'],
      top: 1000,
    }

    const result = await Pm_projectmilestonesService.getAll(options)
    if (!result.success) {
      console.error('[DashboardService] fetchMilestonesDueThisMonth failed:', result.error)
      return 0
    }
    return unwrapList<Pm_projectmilestones>(result).length
  } catch (err) {
    console.error('[DashboardService] fetchMilestonesDueThisMonth exception:', err)
    return 0
  }
}
