import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Chip,
  Card,
  CardContent,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  Drawer,
  IconButton,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import BusinessIcon from '@mui/icons-material/Business'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import MoneyIcon from '@mui/icons-material/Money'
import { fetchPortfolioHierarchy, createPortfolio } from '../../services/dataverseService'
import { StatusChip } from '../common'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type SortField = 'name' | 'owner' | 'status' | 'rag' | 'budget' | 'consumed' | 'variance'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'On Hold',
}

// ─── Tab Panel Helper ─────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// ─── Health Split Bar ─────────────────────────────────────────────────────────
function HealthSplitBar({ green, amber, red }: { green: number; amber: number; red: number }) {
  const total = green + amber + red || 1
  const gPct = (green / total) * 100
  const aPct = (amber / total) * 100
  const rPct = (red / total) * 100

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 14, color: '#22c55e' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#22c55e' }}>{green}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <WarningAmberIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#f59e0b' }}>{amber}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ErrorIcon sx={{ fontSize: 14, color: '#ef4444' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#ef4444' }}>{red}</Typography>
        </Box>
      </Box>
      <Box
        sx={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          bgcolor: '#e2e8f0',
        }}
      >
        <Box sx={{ width: `${gPct}%`, bgcolor: '#22c55e', transition: 'width 0.6s ease' }} />
        <Box sx={{ width: `${aPct}%`, bgcolor: '#f59e0b', transition: 'width 0.6s ease' }} />
        <Box sx={{ width: `${rPct}%`, bgcolor: '#ef4444', transition: 'width 0.6s ease' }} />
      </Box>
    </Box>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfoliosPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [hierarchy, setHierarchy] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] }>({ portfolios: [], programmes: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })

  // Detail panel state
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)
  const [editInfo, setEditInfo] = useState<string | null>(null)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    pm_portfolioname: '',
    pm_portfolioowner: '',
    pm_portfoliostatus: 0,
    pm_ragstatus: 1,
    pm_approvedbudgeteur: 0,
    pm_startdate: '',
    pm_enddate: '',
    pm_portfoliodescription: '',
    pm_strategicobjective: '',
  })

  // ── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await fetchPortfolioHierarchy()
        if (mounted) setHierarchy(data)
      } catch {
        if (mounted) setError('Unable to load portfolio data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // ── Derived Data ──────────────────────────────────────────────────────────
  const portfolioList = hierarchy.portfolios

  const programmesByPortfolio = useMemo(() => {
    const map: Record<string, ProgrammeModel[]> = {}
    for (const prog of hierarchy.programmes) {
      const key = prog._pm_portfolio_value ?? ''
      if (!map[key]) map[key] = []
      map[key].push(prog)
    }
    return map
  }, [hierarchy.programmes])

  const projectsByPortfolio = useMemo(() => {
    const map: Record<string, ProjectModel[]> = {}
    for (const proj of hierarchy.projects) {
      const key = proj._pm_portfolio_value ?? ''
      if (!map[key]) map[key] = []
      map[key].push(proj)
    }
    return map
  }, [hierarchy.projects])

  // KPI data
  const kpiData = useMemo(() => {
    const totalBudget = portfolioList.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)
    const totalConsumed = portfolioList.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)
    let green = 0, amber = 0, red = 0
    for (const p of portfolioList) {
      const rag = p.pm_ragstatus?.toString()
      if (rag === '1') green++
      else if (rag === '0') amber++
      else if (rag === '2') red++
    }
    return { totalBudget, totalConsumed, green, amber, red, count: portfolioList.length }
  }, [portfolioList])

  // Filter & sort portfolios
  const filteredPortfolios = useMemo(() => {
    let list = portfolioList

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) =>
        p.pm_portfolioname?.toLowerCase().includes(q) ||
        p.pm_portfolioowner?.toLowerCase().includes(q) ||
        p.pm_businessunit?.toLowerCase().includes(q)
      )
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_portfolioname ?? '').localeCompare(b.pm_portfolioname ?? '')
          break
        case 'owner':
          cmp = (a.pm_portfolioowner ?? '').localeCompare(b.pm_portfolioowner ?? '')
          break
        case 'status':
          cmp = ((a.pm_portfoliostatus ?? '').toString()).localeCompare((b.pm_portfoliostatus ?? '').toString())
          break
        case 'rag':
          cmp = ((a.pm_ragstatus ?? '').toString()).localeCompare((b.pm_ragstatus ?? '').toString())
          break
        case 'budget':
          cmp = (a.pm_approvedbudgeteur ?? 0) - (b.pm_approvedbudgeteur ?? 0)
          break
        case 'consumed':
          cmp = (a.pm_actualspendeur ?? 0) - (b.pm_actualspendeur ?? 0)
          break
        case 'variance': {
          const vA = (a.pm_approvedbudgeteur ?? 0) - (a.pm_actualspendeur ?? 0)
          const vB = (b.pm_approvedbudgeteur ?? 0) - (b.pm_actualspendeur ?? 0)
          cmp = vA - vB
          break
        }
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [portfolioList, searchQuery, sort])

  // ── Detail panel data ─────────────────────────────────────────────────────
  const detailProgrammes = useMemo(() => {
    if (!selectedPortfolio?.pm_portfolioid) return []
    return programmesByPortfolio[selectedPortfolio.pm_portfolioid] ?? []
  }, [selectedPortfolio, programmesByPortfolio])

  const detailProjects = useMemo(() => {
    if (!selectedPortfolio?.pm_portfolioid) return []
    return projectsByPortfolio[selectedPortfolio.pm_portfolioid] ?? []
  }, [selectedPortfolio, projectsByPortfolio])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((portfolio: PortfolioModel) => {
    setSelectedPortfolio(portfolio)
    setDetailTab(0)
  }, [])

  const handleCreatePortfolio = async () => {
    if (!createForm.pm_portfolioname.trim()) return
    setActionLoading(true)
    try {
      const created = await createPortfolio({
        pm_portfolioname: createForm.pm_portfolioname,
        pm_portfolioowner: createForm.pm_portfolioowner || undefined,
        pm_portfoliostatus: createForm.pm_portfoliostatus,
        pm_ragstatus: createForm.pm_ragstatus,
        pm_approvedbudgeteur: createForm.pm_approvedbudgeteur || 0,
        pm_startdate: createForm.pm_startdate || undefined,
        pm_enddate: createForm.pm_enddate || undefined,
        pm_portfoliodescription: createForm.pm_portfoliodescription || undefined,
        pm_strategicobjective: createForm.pm_strategicobjective || undefined,
      })
      if (created) {
        // Refresh data and close modal
        const freshData = await fetchPortfolioHierarchy()
        setHierarchy(freshData)
        setShowCreateModal(false)
        setCreateForm({
          pm_portfolioname: '',
          pm_portfolioowner: '',
          pm_portfoliostatus: 0,
          pm_ragstatus: 1,
          pm_approvedbudgeteur: 0,
          pm_startdate: '',
          pm_enddate: '',
          pm_portfoliodescription: '',
          pm_strategicobjective: '',
        })
      }
    } catch {
      setError('Unable to create portfolio.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Variance display ──────────────────────────────────────────────────────
  const VarianceDisplay = ({ budget, consumed }: { budget?: number; consumed?: number }) => {
    const variance = (budget ?? 0) - (consumed ?? 0)
    const isNegative = variance < 0
    return (
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
          color: isNegative ? '#ef4444' : isDark ? '#e2e8f0' : '#0f172a',
        }}
      >
        {isNegative ? '−' : ''}{currencyFormatter.format(Math.abs(variance))}
      </Typography>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Portfolios</Typography>
          <Typography variant="body2" color="text.secondary">
            Master view of all portfolios — aggregate health, budget tracking, and drill-down details.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, px: 3 }}
        >
          New Portfolio
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── 1. Executive Roll-Up KPI Ribbon ─────────────────────────────── */}
      {!loading && (
        <Box sx={{ display: 'flex', gap: 2.5, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Box sx={{ flex: '1 1 0', minWidth: 200 }}>
            <Card sx={{ position: 'relative', overflow: 'visible', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      Total Portfolio Value
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {currencyFormatter.format(kpiData.totalBudget)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Across {kpiData.count} portfolio{kpiData.count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0ea5e915', color: '#0ea5e9' }}>
                    <AccountBalanceWalletIcon />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 0', minWidth: 200 }}>
            <Card sx={{ position: 'relative', overflow: 'visible', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      Total Consumed / Actuals
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {currencyFormatter.format(kpiData.totalConsumed)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpiData.totalBudget > 0
                        ? `${((kpiData.totalConsumed / kpiData.totalBudget) * 100).toFixed(1)}% of total budget consumed`
                        : 'No budget data'}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f59e0b15', color: '#f59e0b' }}>
                    <TrendingDownIcon />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 0', minWidth: 260 }}>
            <Card sx={{ position: 'relative', overflow: 'visible', height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
                  Overall Health Split
                </Typography>
                <HealthSplitBar green={kpiData.green} amber={kpiData.amber} red={kpiData.red} />
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* ── 2. Dense Master Portfolio Grid ───────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        {/* Search bar */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <TextField
            size="small"
            placeholder="Search portfolios by name, owner, or business unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, fontSize: '0.875rem' },
              },
            }}
            sx={{ maxWidth: 420 }}
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />)}
          </Box>
        ) : filteredPortfolios.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {searchQuery ? 'No portfolios match your search.' : 'No portfolios found.'}
            </Typography>
            {!searchQuery && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
                Create your first portfolio
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 460px)', minHeight: 300 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Portfolio Name</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'owner'} direction={sort.field === 'owner' ? sort.dir : 'asc'} onClick={() => handleSort('owner')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Owner / Sponsor</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'status'} direction={sort.field === 'status' ? sort.dir : 'asc'} onClick={() => handleSort('status')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Status</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'rag'} direction={sort.field === 'rag' ? sort.dir : 'asc'} onClick={() => handleSort('rag')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>RAG Status</TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'budget'} direction={sort.field === 'budget' ? sort.dir : 'asc'} onClick={() => handleSort('budget')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Total Budget</TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'consumed'} direction={sort.field === 'consumed' ? sort.dir : 'asc'} onClick={() => handleSort('consumed')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Consumed</TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'variance'} direction={sort.field === 'variance' ? sort.dir : 'asc'} onClick={() => handleSort('variance')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Variance</TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPortfolios.map((portfolio, idx) => {
                  const variance = (portfolio.pm_approvedbudgeteur ?? 0) - (portfolio.pm_actualspendeur ?? 0)
                  const isNegative = variance < 0
                  return (
                    <TableRow
                      key={portfolio.pm_portfolioid}
                      hover
                      onClick={() => handleRowClick(portfolio)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                        '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                        transition: 'background-color 0.15s ease',
                        '& td': { px: 2.5, py: 1.25 },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountTreeIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {portfolio.pm_portfolioname ?? 'Unnamed Portfolio'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {portfolio.pm_portfolioowner || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[portfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Unknown'}
                          size="small"
                          variant="outlined"
                          color={portfolio.pm_portfoliostatus === 0 || portfolio.pm_portfoliostatus === '0' ? 'success' : 'default'}
                          sx={{ fontWeight: 600, borderRadius: 8 }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={portfolio.pm_ragstatus} type="rag" size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: isDark ? '#94a3b8' : '#64748b' }}>
                          {currencyFormatter.format(portfolio.pm_actualspendeur ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <VarianceDisplay budget={portfolio.pm_approvedbudgeteur} consumed={portfolio.pm_actualspendeur} />
                        {isNegative && (
                          <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 500, display: 'block' }}>
                            Over budget
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Footer count */}
        {!loading && filteredPortfolios.length > 0 && (
          <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredPortfolios.length} of {portfolioList.length} portfolio{portfolioList.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total budget: {currencyFormatter.format(filteredPortfolios.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total consumed: {currencyFormatter.format(filteredPortfolios.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0))}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── 3. Slide-Out Detail Panel ─────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!selectedPortfolio}
        onClose={() => setSelectedPortfolio(null)}
        slotProps={{
          backdrop: { invisible: true },
          paper: {
            sx: {
              width: { xs: '100%', sm: 560, md: 640 },
              p: 0,
              bgcolor: 'background.paper',
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        {selectedPortfolio && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Panel Header */}
            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <AccountTreeIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {selectedPortfolio.pm_portfolioname ?? 'Unnamed Portfolio'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5 }}>
                    {selectedPortfolio.pm_portfolioowner && (
                      <Typography variant="body2" color="text.secondary">
                        <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {selectedPortfolio.pm_portfolioowner}
                      </Typography>
                    )}
                    {selectedPortfolio.pm_businessunit && (
                      <Typography variant="body2" color="text.secondary">
                        <BusinessIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {selectedPortfolio.pm_businessunit}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditInfo('Edit functionality will be available in a future update.')}
                    sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' } }}
                  >
                    Edit Portfolio
                  </Button>
                  <IconButton size="small" onClick={() => setSelectedPortfolio(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {/* Edit info banner */}
            {editInfo && (
              <Alert severity="info" onClose={() => setEditInfo(null)} sx={{ borderRadius: 0, px: 3 }}>
                {editInfo}
              </Alert>
            )}

            {/* Tabs */}
            <Tabs
              value={detailTab}
              onChange={(_, v) => setDetailTab(v)}
              variant="fullWidth"
              sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem', minHeight: 44 },
              }}
            >
              <Tab label="Summary" />
              <Tab label={`Programmes (${detailProgrammes.length})`} />
              <Tab label={`Projects (${detailProjects.length})`} />
              <Tab label="Financials" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
              {/* Summary Tab */}
              <TabPanel value={detailTab} index={0}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* RAG + Status */}
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <StatusChip status={selectedPortfolio.pm_ragstatus} type="rag" size="medium" />
                    <Chip
                      label={STATUS_LABELS[selectedPortfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Unknown'}
                      size="small"
                      variant="outlined"
                      color={selectedPortfolio.pm_portfoliostatus === 0 || selectedPortfolio.pm_portfoliostatus === '0' ? 'success' : 'default'}
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                    {selectedPortfolio.pm_prioritylevel !== undefined && (
                      <Chip
                        label={`Priority: ${selectedPortfolio.pm_prioritylevel}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 600, borderRadius: 8 }}
                      />
                    )}
                  </Box>

                  {/* Dates */}
                  {(selectedPortfolio.pm_startdate || selectedPortfolio.pm_enddate) && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {selectedPortfolio.pm_startdate ? new Date(selectedPortfolio.pm_startdate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}
                          {' → '}
                          {selectedPortfolio.pm_enddate ? new Date(selectedPortfolio.pm_enddate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Description */}
                  {selectedPortfolio.pm_portfoliodescription ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {selectedPortfolio.pm_portfoliodescription}
                      </Typography>
                    </Box>
                  ) : null}

                  {/* Strategic Objective */}
                  {selectedPortfolio.pm_strategicobjective ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LightbulbIcon sx={{ fontSize: 16 }} /> Strategic Objective
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {selectedPortfolio.pm_strategicobjective}
                      </Typography>
                    </Box>
                  ) : null}

                  {/* Quick Metrics */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {detailProgrammes.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Programmes</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                        {detailProjects.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Projects</Typography>
                    </Paper>
                  </Box>
                </Box>
              </TabPanel>

              {/* Programmes Tab */}
              <TabPanel value={detailTab} index={1}>
                {detailProgrammes.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {detailProgrammes.map((prog) => (
                      <Paper key={prog.pm_programmeid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {prog.pm_programmename ?? 'Untitled Programme'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {prog.pm_startdate ? new Date(prog.pm_startdate).toLocaleDateString() : 'No start date'}
                              {' → '}
                              {prog.pm_enddate ? new Date(prog.pm_enddate).toLocaleDateString() : 'No end date'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <StatusChip status={prog.pm_programmephase} type="prog_phase" size="small" />
                            <StatusChip status={prog.pm_ragstatus} type="rag" size="small" />
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                    No programmes linked to this portfolio.
                  </Typography>
                )}
              </TabPanel>

              {/* Projects Tab */}
              <TabPanel value={detailTab} index={2}>
                {detailProjects.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {detailProjects.map((proj) => (
                      <Paper key={proj.pm_projectid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {proj.pm_projectname ?? 'Untitled Project'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {proj.pm_projectcode ?? '—'}
                              {proj.pm_projectmanager ? ` · ${proj.pm_projectmanager}` : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <StatusChip status={proj.pm_projectphase} type="phase" size="small" />
                            <StatusChip status={proj.pm_ragstatus} type="rag" size="small" />
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                    No projects linked to this portfolio.
                  </Typography>
                )}
              </TabPanel>

              {/* Financials Tab */}
              <TabPanel value={detailTab} index={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Budget vs Actual */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MoneyIcon sx={{ fontSize: 18 }} /> Budget Overview
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {currencyFormatter.format(selectedPortfolio.pm_approvedbudgeteur ?? 0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                          {currencyFormatter.format(selectedPortfolio.pm_actualspendeur ?? 0)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Budget utilization bar */}
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Budget Utilization</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0
                            ? `${((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100).toFixed(1)}%`
                            : '0%'}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0
                          ? Math.min((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100, 100)
                          : 0}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: isDark ? '#334155' : '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            bgcolor: (() => {
                              const ratio = selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0
                                ? (selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur
                                : 0
                              return ratio > 0.9 ? '#ef4444' : ratio > 0.7 ? '#f59e0b' : '#22c55e'
                            })(),
                          },
                        }}
                      />
                    </Box>
                  </Paper>

                  {/* Variance */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Budget Variance
                    </Typography>
                    <VarianceDisplay budget={selectedPortfolio.pm_approvedbudgeteur} consumed={selectedPortfolio.pm_actualspendeur} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0
                        ? `${((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100).toFixed(1)}% of budget consumed`
                        : 'No budget data available'}
                    </Typography>
                  </Paper>
                </Box>
              </TabPanel>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── 4. Create Portfolio Modal ──────────────────────────────────────── */}
      <Dialog open={showCreateModal} onClose={() => !actionLoading && setShowCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          New Portfolio
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new portfolio record to begin tracking investments, programmes, and projects.
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Portfolio Name"
                required
                fullWidth
                size="small"
                value={createForm.pm_portfolioname}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfolioname: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Owner / Sponsor"
                fullWidth
                size="small"
                value={createForm.pm_portfolioowner}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfolioowner: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={createForm.pm_portfoliostatus}
                  label="Status"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfoliostatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Active</MenuItem>
                  <MenuItem value={1}>On Hold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>RAG Status</InputLabel>
                <Select
                  value={createForm.pm_ragstatus}
                  label="RAG Status"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={1}>Green</MenuItem>
                  <MenuItem value={0}>Amber</MenuItem>
                  <MenuItem value={2}>Red</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Approved Budget (EUR)"
                type="number"
                fullWidth
                size="small"
                value={createForm.pm_approvedbudgeteur}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                size="small"
                value={createForm.pm_startdate}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_startdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                size="small"
                value={createForm.pm_enddate}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_enddate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={createForm.pm_portfoliodescription}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfoliodescription: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Strategic Objective"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={createForm.pm_strategicobjective}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_strategicobjective: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setShowCreateModal(false)} variant="outlined" disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePortfolio}
            variant="contained"
            disabled={!createForm.pm_portfolioname.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' } }}
          >
            {actionLoading ? 'Creating...' : 'Create Portfolio'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
