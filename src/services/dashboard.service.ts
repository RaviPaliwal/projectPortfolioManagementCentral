import {
  Pm_projectsService,
  Pm_portfoliosService,
  Pm_initiativesService,
  Pm_projectmilestonesService,
} from '@/generated'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_initiatives } from '@/generated/models/Pm_initiativesModel'
import  { unwrapList } from '@/services/common'
import type { DashboardMetrics } from  '@/services/common'

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [activeProjectResult, redProjectResult, amberProjectResult, greenProjectResult, portfolioResult, initiativeResult] = await Promise.all([
    Pm_projectsService.getAll({
      filter: "statecode eq 0",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_projectsService.getAll({
      filter: "statecode eq 0 and pm_ragstatus eq 2",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_projectsService.getAll({
      filter: "statecode eq 0 and pm_ragstatus eq 0",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_projectsService.getAll({
      filter: "statecode eq 0 and pm_ragstatus eq 1",
      select: ['pm_projectname', 'pm_ragstatus'],
      top: 500,
    }),
    Pm_portfoliosService.getAll({
      filter: "statecode eq 0",
      select: ['pm_portfolioid', 'pm_approvedbudgeteur', 'pm_actualspendeur'],
      top: 500,
    }),
    Pm_initiativesService.getAll({ select: ['pm_estimatedcosteur'], top: 500 }),
  ])

  try {
    console.debug('[dataverseService] fetchDashboardMetrics raw results:', {
      activeProjectResult,
      redProjectResult,
      amberProjectResult,
      greenProjectResult,
      portfolioResult,
      initiativeResult,
    })
  } catch (e) {
    console.debug('[dataverseService] fetchDashboardMetrics: unable to log raw results')
  }

  const activeProjects = unwrapList<Pm_projects>(activeProjectResult)
  const redProjects = unwrapList<Pm_projects>(redProjectResult)
  const amberProjects = unwrapList<Pm_projects>(amberProjectResult)
  const greenProjects = unwrapList<Pm_projects>(greenProjectResult)
  const portfolios = unwrapList<Pm_portfolios>(portfolioResult)
  const initiatives = unwrapList<Pm_initiatives>(initiativeResult)

  const approvedBudget = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_approvedbudgeteur ?? 0), 0)
  const actualSpend = portfolios.reduce((sum, portfolio) => sum + (portfolio.pm_actualspendeur ?? 0), 0)
  const pipelineValue = initiatives.reduce((sum, initiative) => sum + (initiative.pm_estimatedcosteur ?? 0), 0)

  return {
    totalActiveProjects: activeProjects.length,
    totalActivePortfolios: portfolios.length,
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
  try { console.debug('[dataverseService] fetchMilestonesDueThisMonth result raw:', result) } catch (e) {}
  return unwrapList<any>(result).length
}
