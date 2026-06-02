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
  fetchMyActiveProjects,
  fetchPortfolioHierarchy,
  fetchPendingApprovalRequests,
  fetchApprovalRequests,
  fetchCapacityAllocationData,
  fetchPlannedVsActualData,
  fetchUtilizationByProjectData,
  fetchDepartmentDemandData,
  updateInitiativeStatus,
  updateApprovalRequest,
  fetchInitiatives,
  fetchPipelineKpis,
  fetchMilestonesDueThisMonth,
  fetchAllRisks,
  fetchAllIssues,
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
import MyTasksWidget from '@/components/common/MyTasksWidget'
import { currencyFormatter, formatDateTime } from '@/utils/formatters'
import {
  BudgetHealthPanel,
  PipelineStageSummary,
  PortfolioHealthSnapshot,
  ActiveProjectsGrid,
} from '../components'

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
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestModel[]>([])
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
      const [dashboard, activeProjects, pendingApprovals, hierarchy, capacityAlloc, plannedActual, utilByProject, deptDemand, pipeline, initiativesData, allApprovalRequests, milestones, risksData, issuesData] = await Promise.all([
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
        fetchApprovalRequests(),
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
      setApprovalRequests(allApprovalRequests)
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
      // Also update the linked approval request's decision status
      const linkedRequest = approvalRequests.find(
        (r) => r.pm_entityid === initiativeId && String(r.pm_decisionstatus) === '1'
      )
      if (linkedRequest?.pm_projectapprovalrequestid) {
        await updateApprovalRequest(linkedRequest.pm_projectapprovalrequestid, {
          pm_decisionstatus: status === 0 ? 0 : 2,
          pm_decisiondate: new Date().toISOString().split('T')[0],
        })
      }
      setApprovals((current) => current.filter((item) => item.pm_initiativeid !== initiativeId))
    } catch {
      setError('Unable to update request.')
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

  // Budget health
  const budgetPct = metrics.totalApprovedBudget > 0
    ? ((metrics.totalActualSpend / metrics.totalApprovedBudget) * 100).toFixed(1)
    : '0'

  const kpiItems = [
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
      {refreshing && <LinearProgress sx={{ mb: 1.5, borderRadius: 1.15 }} />}

      {/* KPI Cards — Standardized Row */}
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
          <ActiveProjectsGrid
            projects={projects}
            loading={loading}
            onViewAll={() => setShowAllProjects(true)}
          />

          {/* Budget Health Panel */}
          <BudgetHealthPanel
            totalApprovedBudget={metrics.totalApprovedBudget}
            totalActualSpend={metrics.totalActualSpend}
            loading={loading}
          />
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* My Tasks Widget */}
          <MyTasksWidget />

          {/* Action Center / Pipeline Overview */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>My Action Center</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pending approvals assigned for executive review.
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[...Array(3)].map((_, i) => (
                  <Box key={i} sx={{ height: 120, bgcolor: 'action.hover', borderRadius: 1.15 }} />
                ))}
              </Box>
            ) : approvals.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {approvals.slice(0, 3).map((request) => (
                  <Paper key={request.pm_initiativeid} variant="outlined" sx={{ p: 2, borderRadius: 1.15 }}>
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
          <PipelineStageSummary
            initiatives={initiatives}
            loading={loading}
          />

          {/* Health Snapshot */}
          <PortfolioHealthSnapshot
            metrics={metrics}
            portfolioSnapshot={portfolioSnapshot}
            programmeSnapshot={programmeSnapshot}
            milestonesDue={milestonesDue}
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
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.15 }}>
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
