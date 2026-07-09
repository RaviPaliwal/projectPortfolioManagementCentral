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
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarningIcon from '@mui/icons-material/Warning'
import ViewsIcon from '@mui/icons-material/GridView'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TimelineIcon from '@mui/icons-material/Timeline'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import LaunchIcon from '@mui/icons-material/Launch'
import FinancialReportsPage from '@/features/financialreports/pages/FinancialReportsPage'
import type { TabKey } from '@/components/layout/PrimaryShell'

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
import { DashboardTasksWidget, BudgetHealthPanel, PipelineStageSummary, PortfolioHealthSnapshot, PpmCopilotWidget } from '../components'
import { currencyFormatter, formatDateTime } from '@/utils/formatters'
import { useUser } from '@/context/UserContext'

export interface DashboardPageProps {
  onNavigate?: (tab: TabKey) => void
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const theme = useTheme()
  const { currentUserPersona } = useUser()
  const [dashboardTab, setDashboardTab] = useState<number>(0)
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
  const [allPortfolios, setAllPortfolios] = useState<PortfolioModel[]>([])
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
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [isTabIframeLoading, setIsTabIframeLoading] = useState(true)
  const [tabIframeKey, setTabIframeKey] = useState(0)

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
      setAllPortfolios(hierarchy.portfolios)
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
    { name: 'Low', value: metrics.projectsInGreen },
    { name: 'Medium', value: metrics.projectsInAmber },
    { name: 'High', value: metrics.projectsInRed },
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

      {/* Tab Switcher */}
      {(() => {
        const showFinancialTab = currentUserPersona === 'FinancialController' || currentUserPersona === 'SystemAdministrator'
        return (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={dashboardTab}
              onChange={(_, newVal) => setDashboardTab(newVal)}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Portfolio Overview" sx={{ fontWeight: 600 }} />
              <Tab label="AI Copilot" sx={{ fontWeight: 600 }} />
              {showFinancialTab && <Tab label="Financial Reports" sx={{ fontWeight: 600 }} />}
            </Tabs>
          </Box>
        )
      })()}

      {dashboardTab === 0 && (
        <>
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
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            {/* Row 1: Budget Health + Tasks */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex' }}>
              <BudgetHealthPanel
                totalApprovedBudget={budgetMetrics.approved}
                totalActualSpend={budgetMetrics.actual}
                loading={loading || budgetLoading}
                selectedYear={budgetYear}
                availableYears={availableYears}
                onYearChange={handleBudgetYearChange}
                portfolios={allPortfolios}
                sx={{ flex: 1, height: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex' }}>
              <DashboardTasksWidget variant="tasks" sx={{ flex: 1, height: '100%' }} />
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            {/* Left column — Portfolio Health Snapshot */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex' }}>
              <PortfolioHealthSnapshot
                metrics={metrics}
                portfolioSnapshot={portfolioSnapshot}
                programmeSnapshot={programmeSnapshot}
                milestonesDue={milestonesDue}
                loading={loading}
                sx={{ flex: 1, height: '100%' }}
              />
            </Grid>

            {/* Right column — AI Insights + Pipeline Stage Summary */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <DashboardTasksWidget variant="insights" />
              <PipelineStageSummary
                initiatives={initiatives}
                loading={loading}
                sx={{ flex: 1 }}
              />

              {/* Premium Copilot Card Banner */}
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                    : 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 70%)',
                    zIndex: 0,
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, zIndex: 1 }}>
                  <SmartToyIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    Interactive PPM Copilot
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ zIndex: 1 }}>
                  Have questions about project status, resource capacity, or budget allocations? Ask our AI assistant for real-time summaries and analysis.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setIsCopilotOpen(true)}
                  startIcon={<SmartToyIcon />}
                  sx={{
                    alignSelf: 'flex-start',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                    zIndex: 1,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                      boxShadow: '0 6px 16px rgba(139, 92, 246, 0.35)',
                    }
                  }}
                >
                  Start Chatting
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {dashboardTab === 1 && (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          {/* Left panel: Info & Help */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.08)',
                    p: 1,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SmartToyIcon color="primary" sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    PPM AI Assistant
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    Powered by Copilot Studio
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Meet the Project Portfolio Management AI Assistant. It can help you search projects, query timelines, analyze budgets, and review active approvals.
              </Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🚀</span> Key Capabilities
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { title: 'Project Health Auditing', desc: 'Instantly query RAG statuses, delays, and phase progress.' },
                    { title: 'Resource Allocation Analysis', desc: 'Identify bottlenecks, over-allocations, and daily work capacities.' },
                    { title: 'Budget & Cost Tracking', desc: 'Compare actual spend vs. approved budgets and pipeline costs.' },
                    { title: 'Governance & Risks', desc: 'Summarize risk severities and pending workflow approval tasks.' }
                  ].map((cap, idx) => (
                    <Box key={idx} sx={{ pl: 1.5, borderLeft: '2px solid', borderLeftColor: 'primary.light' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{cap.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{cap.desc}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>💡</span> Try Asking
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    'Show me all active projects in the RED status.',
                    'Which resources are over-allocated this month?',
                    'What is the budget consumption percentage of our portfolio?',
                    'Summarize the top risks for the EMEA Programme.'
                  ].map((prompt, idx) => (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        fontSize: '0.8rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        bgcolor: 'action.hover',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          transform: 'translateX(3px)'
                        }
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(prompt)
                      }}
                    >
                      <Tooltip title="Click to copy to clipboard" placement="top">
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="inherit" sx={{ pr: 1 }}>"{prompt}"</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>Copy</Typography>
                        </Box>
                      </Tooltip>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right panel: Chat interface */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              variant="outlined"
              sx={{
                height: 650,
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(14, 165, 233, 0.05)',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Active Chat Session</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="Reset Chat">
                    <IconButton size="small" onClick={() => { setIsTabIframeLoading(true); setTabIframeKey(k => k + 1) }}>
                      <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open in new window">
                    <IconButton
                      size="small"
                      component="a"
                      href="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LaunchIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Chat Canvas */}
              <Box sx={{ flex: 1, position: 'relative', bgcolor: '#ffffff' }}>
                {isTabIframeLoading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                      zIndex: 2,
                      gap: 2
                    }}
                  >
                    <CircularProgress size={32} thickness={4} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Loading Copilot Workspace...
                    </Typography>
                  </Box>
                )}
                <iframe
                  key={tabIframeKey}
                  src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
                  onLoad={() => setIsTabIframeLoading(false)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                  }}
                  title="PPM Copilot Workspace"
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {(() => {
        const showFinancialTab = currentUserPersona === 'FinancialController' || currentUserPersona === 'SystemAdministrator'
        if (dashboardTab === 2 && showFinancialTab) {
          return <FinancialReportsPage onNavigate={onNavigate} />
        }
        return null
      })()}

      {dashboardTab !== 1 && (
        <PpmCopilotWidget isOpen={isCopilotOpen} setIsOpen={setIsCopilotOpen} />
      )}

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
