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
import { unwrapList } from '@/services/common'
import type { DashboardMetrics } from '@/services/common'

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
        const periods = unwrapList<any>(periodsResult)
        const periodIds = periods.map((p) => p.pm_fiscalperiodid)

        if (periodIds.length > 0) {
          const periodFilter = periodIds.map((id) => `_pm_fiscalperiod_value eq '${id}'`).join(' or ')
          budgetLineFilter += ` and (${periodFilter})`
        }
      } else if (startDate || endDate) {
        // Simple date range check if available on budget line or related entity
        // Note: For now we'll prioritize fiscal year as requested
      }

      const budgetLinesResult = await Pm_budgetlinesService.getAll({
        filter: budgetLineFilter,
        select: ['pm_approvedbudgeteur', 'pm_actualspendeur'],
        top: 5000,
      })
      const budgetLines = unwrapList<any>(budgetLinesResult)
      approvedBudget = budgetLines.reduce((sum, bl) => sum + (bl.pm_approvedbudgeteur ?? 0), 0)
      actualSpend = budgetLines.reduce((sum, bl) => sum + (bl.pm_actualspendeur ?? 0), 0)
    } catch (e) {
      console.error('[dashboardService] year-specific budget fetch failed', e)
      const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
      approvedBudget = portfolios.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)
      actualSpend = portfolios.reduce((sum, p) => sum + (p.pm_actualspendeur ?? 0), 0)
    }
  } else {
    const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
    approvedBudget = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_approvedbudgeteur ?? 0), 0)
    actualSpend = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_actualspendeur ?? 0), 0)
  }



  const activeProjects = unwrapList<Pm_projects>(activeProjectResult)
  const redProjects = unwrapList<Pm_projects>(redProjectResult)
  const amberProjects = unwrapList<Pm_projects>(amberProjectResult)
  const greenProjects = unwrapList<Pm_projects>(greenProjectResult)
  const initiatives = unwrapList<Pm_initiatives>(initiativeResult)

  const pipelineValue = initiatives.reduce((sum, initiative) => sum + (initiative.pm_estimatedcosteur ?? 0), 0)

  return {
    totalActiveProjects: activeProjects.length,
    totalActivePortfolios: unwrapList(portfolioResult).length,
    totalApprovedBudget: approvedBudget,
    totalActualSpend: actualSpend,
    projectsInRed: redProjects.length,
    projectsInAmber: amberProjects.length,
    projectsInGreen: greenProjects.length,
    pipelineValue,
  }
}

export async function fetchMilestonesDueThisMonth(): Promise<number> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const firstDay = `${year}-${month}-01`
  const lastDay = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`

  const result = await Pm_projectmilestonesService.getAll({
    filter: `pm_planneddate ge ${firstDay} and pm_planneddate le ${lastDay} and pm_status ne 2`,
    select: ['pm_projectmilestoneid'],
    top: 1000,
  })
  return unwrapList<any>(result).length
}
