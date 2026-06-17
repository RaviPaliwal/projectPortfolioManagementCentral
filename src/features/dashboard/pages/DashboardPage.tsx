import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarningIcon from '@mui/icons-material/Warning'
import ViewsIcon from '@mui/icons-material/GridView'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TimelineIcon from '@mui/icons-material/Timeline'
import ScheduleIcon from '@mui/icons-material/Schedule'

import {
  fetchDashboardMetrics,
  fetchProjectsFull,
  fetchPortfolioHierarchy,
  fetchApprovalRequests,
  fetchCapacityAllocationData,
  fetchPlannedVsActualData,
  fetchUtilizationByProjectData,
  fetchDepartmentDemandData,
  fetchInitiatives,
  fetchPipelineKpis,
  fetchMilestonesDueThisMonth,
  fetchAllRisks,
  fetchAllIssues,
  fetchFinancialPeriods,
  fetchPortfolioTrendData,
} from '@/services'
import {
  StatusChip,
  DashboardCharts,
  PageHeader,
  KpiCardRow,
} from '@/components/common'
import { fontSizes } from '@/styles'
import type { InitiativeModel, ApprovalRequestModel, PortfolioModel, ProgrammeModel, ProjectModel, RiskModel, IssueModel } from '@/types/dataverse'
import type { PipelineKpis } from '@/services'
import { DashboardTasksWidget, BudgetHealthPanel, PipelineStageSummary, PortfolioHealthSnapshot } from '../components'
import { currencyFormatter, formatDateTime } from '@/utils/formatters'

export default function DashboardPage() {
  const theme = useTheme()
  const [metrics, setMetrics] = useState({
    totalActiveProjects: 0,
    totalActivePortfolios: 0,
    totalApprovedBudget: 0,
    totalActualSpend: 0,
    projectsInRed: 0,
    projectsInAmber: 0,
    projectsInGreen: 0,
    pipelineValue: 0,
  })
  // Separate state for filtered budget card data
  const [budgetMetrics, setBudgetMetrics] = useState({ approved: 0, actual: 0 })
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioModel[]>([])
  const [programmeSnapshot, setProgrammeSnapshot] = useState<ProgrammeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  
  // Chart data
  const [capacityAllocationData, setCapacityAllocationData] = useState<{ resource: string; capacity: number; allocated: number; percentage: number }[]>([])
  const [plannedVsActualData, setPlannedVsActualData] = useState<{ month: string; planned: number; actual: number }[]>([])
  const [utilizationByProjectData, setUtilizationByProjectData] = useState<{ name: string; hours: number }[]>([])
  const [departmentDemandData, setDepartmentDemandData] = useState<{ month: string; role: string; hours: number }[]>([])
  const [portfolioTrendData, setPortfolioTrendData] = useState<{ month: string; active: number; completed: number; delayed: number }[]>([])
  
  // New data
  const [pipelineKpis, setPipelineKpis] = useState<PipelineKpis>({ totalActiveInitiatives: 0, pendingApprovals: 0, totalEstimatedCost: 0, approvedThisMonth: 0 })
  const [initiatives, setInitiatives] = useState<InitiativeModel[]>([])
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestModel[]>([])
  const [milestonesDue, setMilestonesDue] = useState(0)
  const [risks, setRisks] = useState<RiskModel[]>([])
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [showAllProjects, setShowAllProjects] = useState(false)

  // Budget Filter State
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [budgetYear, setBudgetYear] = useState<number | 'all'>('all')

  const sortByRag = <T extends { pm_ragstatus?: string | number }>(a: T, b: T) => {
    const rank = (status?: string | number) => (status === '2' || status === 2 ? 0 : status === '0' || status === 0 ? 1 : 2)
    return rank(a.pm_ragstatus) - rank(b.pm_ragstatus)
  }

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      // Global metrics for the whole dashboard (non-filtered)
      const [dashboard, activeProjects, hierarchy, capacityAlloc, plannedActual, utilByProject, deptDemand, pipeline, initiativesData, allApprovalRequests, milestones, risksData, issuesData, periods, portfolioTrend] = await Promise.all([
        fetchDashboardMetrics({}), 
        fetchProjectsFull(),
        fetchPortfolioHierarchy(),
        fetchCapacityAllocationData(),
        fetchPlannedVsActualData(),
        fetchUtilizationByProjectData(),
        fetchDepartmentDemandData(),
        fetchPipelineKpis(),
        fetchInitiatives(),
        fetchApprovalRequests(),
        fetchMilestonesDueThisMonth(),
        fetchAllRisks(),
        fetchAllIssues(),
        fetchFinancialPeriods(),
        fetchPortfolioTrendData(),
      ])

      // Extract unique years (Current + Last 5)
      const currentYear = new Date().getFullYear()
      const yearRange = Array.from({ length: 6 }, (_, i) => currentYear - i)
      const dataYears = periods.map(p => p.pm_fiscalyear).filter(Boolean) as number[]
      const combinedYears = Array.from(new Set([...yearRange, ...dataYears])).sort((a, b) => b - a)
      
      setAvailableYears(combinedYears)
      setMetrics(dashboard)
      
      // Initialize budget metrics with global data if no year selected
      if (budgetYear === 'all') {
        setBudgetMetrics({ approved: dashboard.totalApprovedBudget, actual: dashboard.totalActualSpend })
      }
      
      setProjects(activeProjects.slice(0, 6))
      setCapacityAllocationData(capacityAlloc)
      setPlannedVsActualData(plannedActual)
      setUtilizationByProjectData(utilByProject)
      setDepartmentDemandData(deptDemand)
      setPortfolioTrendData(portfolioTrend)
      setPortfolioSnapshot(hierarchy.portfolios.slice().sort(sortByRag).slice(0, 4))
      setProgrammeSnapshot(hierarchy.programmes.slice().sort(sortByRag).slice(0, 4))
      setPipelineKpis(pipeline)
      setInitiatives(initiativesData)
      setApprovalRequests(allApprovalRequests)
      setMilestonesDue(milestones)
      setRisks(risksData)
      setIssues(issuesData)
      setLastRefreshed(new Date())
      setError(null)
    } catch (error) {
      console.error('[DashboardPage] load data failed', error)
      setError('Unable to load dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [budgetYear])

  // Specialized effect for budget-only filtering
  const handleBudgetYearChange = async (year: number | 'all') => {
    setBudgetYear(year)
    setBudgetLoading(true)
    try {
      const budgetData = await fetchDashboardMetrics({ 
        fiscalYear: year === 'all' ? undefined : year 
      })
      setBudgetMetrics({ 
        approved: budgetData.totalApprovedBudget, 
        actual: budgetData.totalActualSpend 
      })
    } catch (e) {
      console.error('[DashboardPage] budget update failed', e)
    } finally {
      setBudgetLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Build chart data from real metrics
  const projectStatusData = useMemo(() => [
    { name: 'Green', value: metrics.projectsInGreen },
    { name: 'Amber', value: metrics.projectsInAmber },
    { name: 'Red', value: metrics.projectsInRed },
  ], [metrics])

  // Budget health
  const budgetPct = metrics.totalApprovedBudget > 0
    ? ((metrics.totalActualSpend / metrics.totalApprovedBudget) * 100).toFixed(1)
    : '0'

  const kpiItems = [
    { label: 'Active Portfolios', value: metrics.totalActivePortfolios, icon: <ViewsIcon />, color: 'primary.main', subtitle: `${metrics.totalActiveProjects} active projects` },
    { label: 'Approved Budget', value: currencyFormatter.format(metrics.totalApprovedBudget), icon: <AccountBalanceWalletIcon />, color: 'success.main', subtitle: `Pipeline: ${currencyFormatter.format(pipelineKpis.totalEstimatedCost)}` },
    { label: 'Actual Spend', value: currencyFormatter.format(metrics.totalActualSpend), icon: <TrendingDownIcon />, color: 'warning.main', subtitle: `${budgetPct}% of budget consumed` },
    { label: 'Red / Amber', value: metrics.projectsInRed + metrics.projectsInAmber, icon: <WarningIcon />, color: 'error.main', subtitle: `${pipelineKpis.pendingApprovals} pending approvals` },
    { label: 'Pipeline Value', value: currencyFormatter.format(metrics.pipelineValue), icon: <TimelineIcon />, color: 'secondary.main', subtitle: `${pipelineKpis.totalActiveInitiatives} initiatives` },
    { label: 'RAG Health', value: `${metrics.projectsInGreen}/${metrics.projectsInAmber}/${metrics.projectsInRed}`, icon: <CheckCircleIcon />, color: 'success.main', subtitle: 'G / A / R ratio' },
  ]

  return (
    <Box>
      <PageHeader
        title="Executive Portfolio Dashboard"
        subtitle="Top-line portfolio KPIs, budget health, and pending approvals in one executive view."
        actionElement={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {lastRefreshed && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }}>
                  {formatDateTime(lastRefreshed)}
                </Typography>
              </Box>
            )}
            
            <Tooltip title="Refresh dashboard data">
              <IconButton size="small" onClick={() => loadData(true)} disabled={refreshing} sx={{ color: 'text.secondary' }}>
                <RefreshIcon sx={{ opacity: refreshing ? 0.5 : 1 }} />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {/* Refreshing overlay */}
      {refreshing && <LinearProgress sx={{ mb: 1.5, borderRadius: 1.5 }} />}

      {/* KPI Cards — Standardized Row */}
      <KpiCardRow items={kpiItems} loading={loading} />

      {/* Dashboard Charts */}
      <Box sx={{ mb: 3 }}>
        <DashboardCharts
          projectStatusData={projectStatusData}
          portfolioTrendData={portfolioTrendData}
          capacityAllocationData={capacityAllocationData}
          plannedVsActualData={plannedVsActualData}
          utilizationByProjectData={utilizationByProjectData}
          departmentDemandData={departmentDemandData}
        />
      </Box>

      {/* Main grid */}
      <Grid container spacing={2.5}>
        {/* Left column — Budget Health + Portfolio Health Snapshot */}
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <BudgetHealthPanel
            totalApprovedBudget={budgetMetrics.approved}
            totalActualSpend={budgetMetrics.actual}
            loading={loading || budgetLoading}
            selectedYear={budgetYear}
            availableYears={availableYears}
            onYearChange={handleBudgetYearChange}
          />
          <PortfolioHealthSnapshot
            metrics={metrics}
            portfolioSnapshot={portfolioSnapshot}
            programmeSnapshot={programmeSnapshot}
            milestonesDue={milestonesDue}
            loading={loading}
          />
        </Grid>

        {/* Right column — Tasks + AI Insights + Pipeline Stage Summary */}
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <DashboardTasksWidget variant="tasks" />
          <DashboardTasksWidget variant="insights" />
          <PipelineStageSummary
            initiatives={initiatives}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {/* All Projects Dialog */}
      <Dialog open={showAllProjects} onClose={() => setShowAllProjects(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>All Active Projects</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Live project list powered by the portfolio model.
          </Typography>
          {loading ? (
            <Typography variant="body2" color="text.secondary">Loading full project list…</Typography>
          ) : projects.length > 0 ? (
            <Grid container spacing={1.5}>
              {projects.map((project) => (
                <Grid size={{ xs: 12, sm: 6 }} key={project.pm_projectid}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{project.pm_projectname ?? 'Untitled'}</Typography>
                      <StatusChip status={project.pm_ragstatus} type="rag" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{project.pm_projectcode ?? '—'}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <StatusChip status={project.pm_projectphase} type="phase" />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">No active projects found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAllProjects(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
