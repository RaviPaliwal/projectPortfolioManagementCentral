import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Chip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarningIcon from '@mui/icons-material/Warning'
import ViewsIcon from '@mui/icons-material/GridView'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TimelineIcon from '@mui/icons-material/Timeline'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import GppBadIcon from '@mui/icons-material/GppBad'
import ScheduleIcon from '@mui/icons-material/Schedule'

import {
  fetchDashboardMetrics,
  fetchMyActiveProjects,
  fetchPortfolioHierarchy,
  fetchPendingApprovalRequests,
  fetchCapacityAllocationData,
  fetchPlannedVsActualData,
  fetchUtilizationByProjectData,
  fetchDepartmentDemandData,
  updateInitiativeStatus,
  fetchInitiatives,
  fetchPipelineKpis,
  fetchMilestonesDueThisMonth,
  fetchAllRisks,
  fetchAllIssues,
} from '@/lib/dataverseClient'
import { StatusChip, DashboardCharts, PageHeader, KpiCardRow, HealthSplitBar, VarianceDisplay, ExportButton } from '@/components/common'
import { fontSizes } from '@/styles'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel, RiskModel, IssueModel } from '@/types/dataverse'
import type { KpiCardItem } from '@/components/common/KpiCardRow/KpiCardRow'
import type { PipelineKpis } from '@/lib/dataverseClient'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

// Pipeline status labels for initiative stages
const PIPELINE_STAGES: Record<number, { label: string; color: string }> = {
  1: { label: 'Under Review', color: '#f59e0b' },
  2: { label: 'Screening', color: '#0ea5e9' },
  0: { label: 'Approved', color: '#22c55e' },
  3: { label: 'Rejected', color: '#ef4444' },
}

export default function DashboardPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
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
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [approvals, setApprovals] = useState<InitiativeModel[]>([])
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioModel[]>([])
  const [programmeSnapshot, setProgrammeSnapshot] = useState<ProgrammeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  // Chart data
  const [capacityAllocationData, setCapacityAllocationData] = useState<{ resource: string; capacity: number; allocated: number; percentage: number }[]>([])
  const [plannedVsActualData, setPlannedVsActualData] = useState<{ month: string; planned: number; actual: number }[]>([])
  const [utilizationByProjectData, setUtilizationByProjectData] = useState<{ name: string; hours: number }[]>([])
  const [departmentDemandData, setDepartmentDemandData] = useState<{ month: string; role: string; hours: number }[]>([])
  // New data
  const [pipelineKpis, setPipelineKpis] = useState<PipelineKpis>({ totalActiveInitiatives: 0, pendingApprovals: 0, totalEstimatedCost: 0, approvedThisMonth: 0 })
  const [initiatives, setInitiatives] = useState<InitiativeModel[]>([])
  const [milestonesDue, setMilestonesDue] = useState(0)
  const [risks, setRisks] = useState<RiskModel[]>([])
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const sortByRag = <T extends { pm_ragstatus?: string | number }>(a: T, b: T) => {
    const rank = (status?: string | number) => (status === '2' || status === 2 ? 0 : status === '0' || status === 0 ? 1 : 2)
    return rank(a.pm_ragstatus) - rank(b.pm_ragstatus)
  }

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    console.log('[DashboardPage] load dashboard data start')
    try {
      const [dashboard, activeProjects, pendingApprovals, hierarchy, capacityAlloc, plannedActual, utilByProject, deptDemand, pipeline, initiativesData, milestones, risksData, issuesData] = await Promise.all([
        fetchDashboardMetrics(),
        fetchMyActiveProjects(),
        fetchPendingApprovalRequests(),
        fetchPortfolioHierarchy(),
        fetchCapacityAllocationData(),
        fetchPlannedVsActualData(),
        fetchUtilizationByProjectData(),
        fetchDepartmentDemandData(),
        fetchPipelineKpis(),
        fetchInitiatives(),
        fetchMilestonesDueThisMonth(),
        fetchAllRisks(),
        fetchAllIssues(),
      ])
      console.log('[DashboardPage] load dashboard data success')
      setMetrics(dashboard)
      setProjects(activeProjects.slice(0, 6))
      setApprovals(pendingApprovals)
      setCapacityAllocationData(capacityAlloc)
      setPlannedVsActualData(plannedActual)
      setUtilizationByProjectData(utilByProject)
      setDepartmentDemandData(deptDemand)
      setPortfolioSnapshot(hierarchy.portfolios.slice().sort(sortByRag).slice(0, 4))
      setProgrammeSnapshot(hierarchy.programmes.slice().sort(sortByRag).slice(0, 4))
      setPipelineKpis(pipeline)
      setInitiatives(initiativesData)
      setMilestonesDue(milestones)
      setRisks(risksData)
      setIssues(issuesData)
      setLastRefreshed(new Date())
      setError(null)
    } catch (error) {
      console.error('[DashboardPage] load dashboard data failed', error)
      setError('Unable to load dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRequestAction = async (initiativeId: string, status: number) => {
    setActionLoading(true)
    try {
      await updateInitiativeStatus(initiativeId, status)
      setApprovals((current) => current.filter((item) => item.pm_initiativeid !== initiativeId))
    } catch {
      setError('Unable to update approval request.')
    } finally {
      setActionLoading(false)
    }
  }

  // Build chart data from real metrics
  const projectStatusData = useMemo(() => [
    { name: 'Green', value: metrics.projectsInGreen },
    { name: 'Amber', value: metrics.projectsInAmber },
    { name: 'Red', value: metrics.projectsInRed },
  ], [metrics])

  // Alert conditions
  const alerts = useMemo(() => {
    const items: Array<{ severity: 'error' | 'warning' | 'info'; message: string }> = []
    const escalatedIssues = issues.filter((i) => i.pm_escalationstatus).length
    const redRisks = risks.filter((r) => String(r.pm_ragstatus) === '2').length
    const overdueIssues = issues.filter((i) => {
      if (String(i.pm_issuestatus ?? '') === '1') return false
      if (!i.pm_targetresolutiondate) return false
      return new Date(i.pm_targetresolutiondate) < new Date()
    }).length

    if (metrics.projectsInRed > 0) {
      items.push({ severity: 'error', message: `${metrics.projectsInRed} project(s) at Red (critical) status — immediate attention required.` })
    }
    if (escalatedIssues > 0) {
      items.push({ severity: 'error', message: `${escalatedIssues} issue(s) escalated — requires executive intervention.` })
    }
    if (overdueIssues > 0) {
      items.push({ severity: 'warning', message: `${overdueIssues} issue(s) past target resolution date.` })
    }
    if (redRisks > 0) {
      items.push({ severity: 'warning', message: `${redRisks} risk(s) at Critical level — monitor closely.` })
    }
    if (pipelineKpis.pendingApprovals > 0) {
      items.push({ severity: 'info', message: `${pipelineKpis.pendingApprovals} initiative(s) awaiting your review in the Action Center.` })
    }
    return items
  }, [metrics, issues, risks, pipelineKpis])

  // Pipeline stage counts
  const pipelineStages = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const init of initiatives) {
      const stage = typeof init.pm_pipelinestatus === 'number' ? init.pm_pipelinestatus : Number(init.pm_pipelinestatus)
      if (!isNaN(stage)) counts[stage] = (counts[stage] ?? 0) + 1
    }
    return Object.entries(PIPELINE_STAGES).map(([key, info]) => ({
      key: Number(key),
      label: info.label,
      color: info.color,
      count: counts[Number(key)] ?? 0,
    }))
  }, [initiatives])

  // Budget health
  const budgetVariance = metrics.totalApprovedBudget - metrics.totalActualSpend
  const budgetPct = metrics.totalApprovedBudget > 0
    ? ((metrics.totalActualSpend / metrics.totalApprovedBudget) * 100).toFixed(1)
    : '0'

  const kpiItems: KpiCardItem[] = [
    { label: 'Active Portfolios', value: metrics.totalActivePortfolios, icon: <ViewsIcon />, color: '#0ea5e9', subtitle: `${metrics.totalActiveProjects} active projects` },
    { label: 'Approved Budget', value: currencyFormatter.format(metrics.totalApprovedBudget), icon: <AccountBalanceWalletIcon />, color: '#22c55e', subtitle: `Pipeline: ${currencyFormatter.format(pipelineKpis.totalEstimatedCost)}` },
    { label: 'Actual Spend', value: currencyFormatter.format(metrics.totalActualSpend), icon: <TrendingDownIcon />, color: '#f59e0b', subtitle: `${budgetPct}% of budget consumed` },
    { label: 'Red / Amber', value: metrics.projectsInRed + metrics.projectsInAmber, icon: <WarningIcon />, color: '#ef4444', subtitle: `${pipelineKpis.pendingApprovals} pending approvals` },
    { label: 'Pipeline Value', value: currencyFormatter.format(metrics.pipelineValue), icon: <TimelineIcon />, color: '#8b5cf6', subtitle: `${pipelineKpis.totalActiveInitiatives} initiatives` },
    { label: 'RAG Health', value: `${metrics.projectsInGreen}/${metrics.projectsInAmber}/${metrics.projectsInRed}`, icon: <CheckCircleIcon />, color: '#22c55e', subtitle: 'G / A / R ratio' },
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
                  {lastRefreshed.toLocaleTimeString()}
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

      {/* Alert Banner */}
      {alerts.length > 0 && !loading && (
        <Box sx={{ mb: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {alerts.slice(0, 3).map((alert, idx) => (
            <Alert
              key={idx}
              severity={alert.severity}
              variant="filled"
              sx={{
                borderRadius: 1.5,
                py: 0.5,
                '& .MuiAlert-message': { fontWeight: 500, fontSize: fontSizes.sm },
              }}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Refreshing overlay */}
      {refreshing && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}

      {/* KPI Cards — 6 items */}
      <KpiCardRow items={kpiItems} loading={loading} />

      {/* Dashboard Charts */}
      <Box sx={{ mb: 3 }}>
        <DashboardCharts
          projectStatusData={projectStatusData}
          capacityAllocationData={capacityAllocationData}
          plannedVsActualData={plannedVsActualData}
          utilizationByProjectData={utilizationByProjectData}
          departmentDemandData={departmentDemandData}
        />
      </Box>

      {/* Main grid */}
      <Grid container spacing={2.5}>
        {/* Left column — Active Projects + Budget Health */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Active Projects */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>My Active Projects</Typography>
                <Typography variant="body2" color="text.secondary">
                  Projects currently in-flight with live status and delivery phase.
                </Typography>
              </Box>
              <Button variant="contained" size="small" onClick={() => setShowAllProjects(true)}>
                View all
              </Button>
            </Box>

            {loading ? (
              <Grid container spacing={2}>
                {[...Array(4)].map((_, i) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={i}>
                    <Skeleton variant="rounded" height={120} />
                  </Grid>
                ))}
              </Grid>
            ) : projects.length > 0 ? (
              <Grid container spacing={2}>
                {projects.map((project) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={project.pm_projectid}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {project.pm_projectname ?? 'Untitled project'}
                        </Typography>
                        <StatusChip status={project.pm_ragstatus} type="rag" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {project.pm_projectcode ?? '—'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <StatusChip status={project.pm_projectphase} type="phase" />
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                          {project.pm_programmename ?? project.pm_portfolioname ?? 'No parent'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No active projects found.
              </Typography>
            )}
          </Paper>

          {/* Budget Health Panel */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Budget Health</Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved budget vs. actual spend across all portfolios.
                </Typography>
              </Box>
              {!loading && (
                <Chip
                  icon={budgetVariance >= 0 ? <CheckCircleIcon /> : <GppBadIcon />}
                  label={budgetVariance >= 0 ? 'On Track' : 'Over Budget'}
                  size="small"
                  color={budgetVariance >= 0 ? 'success' : 'error'}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>

            {loading ? (
              <Skeleton variant="rounded" height={120} />
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 4, mb: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
                      Approved Budget
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {currencyFormatter.format(metrics.totalApprovedBudget)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
                      Actual Spend
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      {currencyFormatter.format(metrics.totalActualSpend)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
                      Variance
                    </Typography>
                    <VarianceDisplay budget={metrics.totalApprovedBudget} consumed={metrics.totalActualSpend} />
                  </Box>
                </Box>

                {/* Budget consumption bar */}
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Budget consumed</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: Number(budgetPct) > 80 ? '#ef4444' : Number(budgetPct) > 60 ? '#f59e0b' : '#22c55e' }}>
                      {budgetPct}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: isDark ? '#334155' : '#e2e8f0', display: 'flex' }}>
                    <Box
                      sx={{
                        width: `${Math.min(Number(budgetPct), 100)}%`,
                        bgcolor: Number(budgetPct) > 80 ? '#ef4444' : Number(budgetPct) > 60 ? '#f59e0b' : '#22c55e',
                        borderRadius: 5,
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Remaining: {currencyFormatter.format(Math.max(0, budgetVariance))}</Typography>
                    {budgetVariance < 0 && (
                      <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>
                        Overspent: {currencyFormatter.format(Math.abs(budgetVariance))}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Action Center / Pipeline Overview */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>My Action Center</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pending approvals assigned for executive review.
            </Typography>

            {loading ? (
              <Skeleton variant="rounded" height={200} />
            ) : approvals.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {approvals.slice(0, 3).map((request) => (
                  <Paper key={request.pm_initiativeid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{request.pm_name ?? 'Approval request'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {request.pm_portfolioname ?? 'Portfolio not set'} · {request.pm_requestorname ?? 'Unknown'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {request.pm_businesscase ?? 'No business case provided.'}
                    </Typography>
                    {request.pm_submissiondate && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Submitted {new Date(request.pm_submissiondate).toLocaleDateString()}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={actionLoading}
                        onClick={() => handleRequestAction(request.pm_initiativeid!, 0)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={actionLoading}
                        onClick={() => handleRequestAction(request.pm_initiativeid!, 3)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Paper>
                ))}
                {approvals.length > 3 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                    +{approvals.length - 3} more pending {approvals.length === 4 ? 'request' : 'requests'}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No pending approvals found.
              </Typography>
            )}
          </Paper>

          {/* Pipeline Stage Breakdown */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Pipeline Overview</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Initiative pipeline stage distribution.
            </Typography>

            {loading ? (
              <Skeleton variant="rounded" height={180} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {pipelineStages.map((stage) => (
                  <Box key={stage.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: stage.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                      {stage.label}
                    </Typography>
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: `${stage.color}18`,
                        minWidth: 32,
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: stage.color, fontSize: '0.85rem' }}
                      >
                        {stage.count}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
                    {pipelineStages.reduce((s, st) => s + st.count, 0)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Health Snapshot + Milestones */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Health Snapshot</Typography>
              {!loading && (
                <Chip
                  icon={<CalendarMonthIcon />}
                  label={`${milestonesDue} due`}
                  size="small"
                  color={milestonesDue > 0 ? 'warning' : 'default'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Portfolio/programme RAG breakdown and upcoming milestones.
            </Typography>

            {loading ? (
              <Skeleton variant="rounded" height={260} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* RAG Health Split Bar */}
                <HealthSplitBar
                  green={metrics.projectsInGreen}
                  amber={metrics.projectsInAmber}
                  red={metrics.projectsInRed}
                />

                <Divider />

                {/* Portfolio Snapshot */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.03em', mb: 1, display: 'block' }}>
                    Portfolio Health
                  </Typography>
                  {portfolioSnapshot.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {portfolioSnapshot.map((portfolio) => (
                        <Box key={portfolio.pm_portfolioid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {portfolio.pm_portfolioname ?? 'Unnamed'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}
                            </Typography>
                          </Box>
                          <StatusChip status={portfolio.pm_ragstatus} type="rag" />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No portfolio data.</Typography>
                  )}
                </Box>

                {/* Programme Snapshot */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', textTransform: 'uppercase', letterSpacing: '0.03em', mb: 1, display: 'block' }}>
                    Programme Health
                  </Typography>
                  {programmeSnapshot.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {programmeSnapshot.map((programme) => (
                        <Box key={programme.pm_programmeid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {programme.pm_programmename ?? 'Unnamed'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{programme.pm_portfolioname ?? 'No portfolio'}</Typography>
                          </Box>
                          <StatusChip status={programme.pm_ragstatus} type="rag" />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No programme data.</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Paper>
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
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
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
