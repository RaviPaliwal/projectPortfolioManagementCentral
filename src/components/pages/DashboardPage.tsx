import { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material'
import ViewsIcon from '@mui/icons-material/GridView'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarningIcon from '@mui/icons-material/Warning'
import {
  fetchDashboardMetrics,
  fetchMyActiveProjects,
  fetchPortfolioHierarchy,
  fetchPendingApprovalRequests,
  updateInitiativeStatus,
  // projectPhaseLabel,
} from '../../services/dataverseService'
import { StatusChip, DashboardCharts } from '../common'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function DashboardPage() {
  const theme = useTheme()
  const [metrics, setMetrics] = useState({
    totalActiveProjects: 0,
    totalActivePortfolios: 0,
    totalApprovedBudget: 0,
    totalActualSpend: 0,
    projectsInRed: 0,
    projectsInAmber: 0,
    pipelineValue: 0,
  })
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [approvals, setApprovals] = useState<InitiativeModel[]>([])
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioModel[]>([])
  const [programmeSnapshot, setProgrammeSnapshot] = useState<ProgrammeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const sortByRag = <T extends { pm_ragstatus?: string | number }>(a: T, b: T) => {
    const rank = (status?: string | number) => (status === '2' || status === 2 ? 0 : status === '0' || status === 0 ? 1 : 2)
    return rank(a.pm_ragstatus) - rank(b.pm_ragstatus)
  }

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [dashboard, activeProjects, pendingApprovals, hierarchy] = await Promise.all([
          fetchDashboardMetrics(),
          fetchMyActiveProjects(),
          fetchPendingApprovalRequests(),
          fetchPortfolioHierarchy(),
        ])
        if (!isMounted) return
        setMetrics(dashboard)
        setProjects(activeProjects.slice(0, 6))
        setApprovals(pendingApprovals)
        setPortfolioSnapshot(hierarchy.portfolios.slice().sort(sortByRag).slice(0, 4))
        setProgrammeSnapshot(hierarchy.programmes.slice().sort(sortByRag).slice(0, 4))
      } catch {
        if (!isMounted) return
        setError('Unable to load dashboard data.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

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
    { name: 'Active', value: metrics.totalActiveProjects },
    { name: 'Red', value: metrics.projectsInRed },
    { name: 'Amber', value: metrics.projectsInAmber },
  ], [metrics])

  const resourceUtilizationData = useMemo(() => [
    { team: 'Projects', utilized: metrics.totalActiveProjects, available: Math.max(0, 50 - metrics.totalActiveProjects) },
    { team: 'Portfolios', utilized: metrics.totalActivePortfolios, available: Math.max(0, 20 - metrics.totalActivePortfolios) },
  ], [metrics])

  const kpiCards = [
    { title: 'Active Portfolios', value: metrics.totalActivePortfolios, icon: <ViewsIcon />, color: '#0ea5e9' },
    { title: 'Approved Budget', value: currencyFormatter.format(metrics.totalApprovedBudget), icon: <AccountBalanceWalletIcon />, color: '#22c55e' },
    { title: 'Actual Spend', value: currencyFormatter.format(metrics.totalActualSpend), icon: <TrendingDownIcon />, color: '#f59e0b' },
    { title: 'Red / Amber', value: metrics.projectsInRed + metrics.projectsInAmber, icon: <WarningIcon />, color: '#ef4444' },
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" color="primary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          PPM Central · Executive Dashboard
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.5, mb: 1 }}>Executive Portfolio Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Top-line portfolio KPIs, budget health, and pending approvals in one executive view.
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
            <Card sx={{ position: 'relative', overflow: 'visible' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {kpi.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {loading ? <Skeleton width={100} /> : kpi.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${kpi.color}15`,
                      color: kpi.color,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </Box>
                {idx === 3 && !loading && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <StatusChip status="2" type="rag" size="small" />
                    <StatusChip status="0" type="rag" size="small" />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dashboard Charts */}
      <Box sx={{ mb: 3 }}>
        <DashboardCharts
          projectStatusData={projectStatusData}
          resourceUtilizationData={resourceUtilizationData}
        />
      </Box>

      {/* Main grid */}
      <Grid container spacing={2.5}>
        {/* Active Projects */}
        <Grid size={{ xs: 12, md: 8 }}>
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
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Action Center */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>My Action Center</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pending approvals assigned for executive review.
            </Typography>

            {loading ? (
              <Skeleton variant="rounded" height={200} />
            ) : approvals.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {approvals.map((request) => (
                  <Paper key={request.pm_initiativeid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{request.pm_name ?? 'Approval request'}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {request.pm_portfolioname ?? 'Portfolio not set'} · {request.pm_requestorname ?? 'Unknown'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, mb: 1 }}>
                      {request.pm_businesscase ?? 'No business case provided.'}
                    </Typography>
                    {request.pm_submissiondate && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
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
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No pending approvals found.
              </Typography>
            )}
          </Paper>

          {/* RAG Snapshot */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>RAG Snapshot</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Current portfolio and programme health at a glance.
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>Portfolios</Typography>
              {portfolioSnapshot.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {portfolioSnapshot.map((portfolio) => (
                    <Box key={portfolio.pm_portfolioid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{portfolio.pm_portfolioname ?? 'Unnamed'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Budget {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}
                        </Typography>
                      </Box>
                      <StatusChip status={portfolio.pm_ragstatus} type="rag" />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">No portfolio snapshot available.</Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'secondary.main' }}>Programmes</Typography>
              {programmeSnapshot.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {programmeSnapshot.map((programme) => (
                    <Box key={programme.pm_programmeid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{programme.pm_programmename ?? 'Unnamed'}</Typography>
                        <Typography variant="caption" color="text.secondary">{programme.pm_portfolioname ?? 'No portfolio'}</Typography>
                      </Box>
                      <StatusChip status={programme.pm_ragstatus} type="rag" />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">No programme snapshot available.</Typography>
              )}
            </Box>
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
                    <Typography variant="caption" color="text.secondary" display="block">{project.pm_projectcode ?? '—'}</Typography>
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
