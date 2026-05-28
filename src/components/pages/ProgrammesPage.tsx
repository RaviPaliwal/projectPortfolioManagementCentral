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
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Tab,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DescriptionIcon from '@mui/icons-material/Description'
import FlagIcon from '@mui/icons-material/Flag'
import MoneyIcon from '@mui/icons-material/Money'
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { fetchPortfolioHierarchy, fetchProgrammeDetails, createProgramme } from '../../services/dataverseService'
import { StatusChip } from '../common'
import type { ProgrammeModel, ProjectModel, RiskModel, IssueModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RISK_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Resource',
  '1': 'Financial',
  '2': 'Legal',
  '3': 'Technical',
  '4': 'External',
}

const ISSUE_PRIORITY_LABELS: Record<string, string> = {
  '0': 'High',
  '1': 'Critical',
  '2': 'Medium',
}

// ─── Tab Panel ─────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box>{children}</Box> : null
}

// ─── Health Split Bar ──────────────────────────────────────────────────────────
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
      <Box sx={{ width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', bgcolor: '#e2e8f0' }}>
        <Box sx={{ width: `${gPct}%`, bgcolor: '#22c55e', transition: 'width 0.6s ease' }} />
        <Box sx={{ width: `${aPct}%`, bgcolor: '#f59e0b', transition: 'width 0.6s ease' }} />
        <Box sx={{ width: `${rPct}%`, bgcolor: '#ef4444', transition: 'width 0.6s ease' }} />
      </Box>
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProgrammesPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ── Data State ─────────────────────────────────────────────────────────────
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [portfolios, setPortfolios] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ── List View State ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')

  type SortField = 'name' | 'phase' | 'rag' | 'sponsor' | 'manager' | 'portfolio' | 'budget' | 'actual' | 'variance' | 'bizunit'
  type SortDir = 'asc' | 'desc'
  interface SortState { field: SortField; dir: SortDir }
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })

  // ── Detail View State ──────────────────────────────────────────────────────
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<{
    programme: ProgrammeModel | null
    projects: ProjectModel[]
    risks: RiskModel[]
    issues: IssueModel[]
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState(0)

  // ── Create Modal State ─────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    pm_programmename: '',
    pm_programmemanager: '',
    pm_sponsorname: '',
    pm_programmephase: 1,
    pm_ragstatus: 1,
    pm_budgeteur: 0,
    pm_businessunit: '',
    pm_startdate: '',
    pm_enddate: '',
    pm_programmedescription: '',
    pm_portfolioValue: '',
  })

  // ── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const hierarchy = await fetchPortfolioHierarchy()
        if (mounted) {
          setProgrammes(hierarchy.programmes)
          setPortfolios(
            hierarchy.portfolios
              .filter((p) => p.pm_portfolioid && p.pm_portfolioname)
              .map((p) => ({ id: p.pm_portfolioid!, name: p.pm_portfolioname! }))
          )
        }
      } catch {
        if (mounted) setError('Unable to load programme data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // ── Detail Loading ────────────────────────────────────────────────────────
  const openDetail = useCallback(async (programmeId: string) => {
    setSelectedProgrammeId(programmeId)
    setDetailLoading(true)
    setDetailTab(0)
    try {
      const detail = await fetchProgrammeDetails(programmeId)
      setDetailData(detail)
    } catch {
      setError('Unable to load programme details.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setSelectedProgrammeId(null)
    setDetailData(null)
    setDetailTab(0)
  }, [])

  // ── KPI Data ──────────────────────────────────────────────────────────────
  const kpiData = useMemo(() => {
    const totalBudget = programmes.reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)
    const totalActual = programmes.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)
    let green = 0, amber = 0, red = 0
    for (const p of programmes) {
      const rag = p.pm_ragstatus?.toString()
      if (rag === '1') green++
      else if (rag === '0') amber++
      else if (rag === '2') red++
    }
    return { totalBudget, totalActual, green, amber, red, count: programmes.length }
  }, [programmes])

  // ── Sort Handler ─────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  // ── Filtered & Sorted Programmes ──────────────────────────────────────────
  const filteredProgrammes = useMemo(() => {
    let list = programmes

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.pm_programmename?.toLowerCase().includes(q) ||
          p.pm_programmemanager?.toLowerCase().includes(q) ||
          p.pm_sponsorname?.toLowerCase().includes(q) ||
          p.pm_portfolioname?.toLowerCase().includes(q)
      )
    }

    // Portfolio filter
    if (portfolioFilter !== 'all') {
      list = list.filter((p) => p._pm_portfolio_value === portfolioFilter)
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_programmename ?? '').localeCompare(b.pm_programmename ?? '')
          break
        case 'phase':
          cmp = (a.pm_programmephase?.toString() ?? '').localeCompare(b.pm_programmephase?.toString() ?? '')
          break
        case 'rag':
          cmp = (a.pm_ragstatus?.toString() ?? '').localeCompare(b.pm_ragstatus?.toString() ?? '')
          break
        case 'sponsor':
          cmp = (a.pm_sponsorname ?? '').localeCompare(b.pm_sponsorname ?? '')
          break
        case 'manager':
          cmp = (a.pm_programmemanager ?? '').localeCompare(b.pm_programmemanager ?? '')
          break
        case 'portfolio':
          cmp = (a.pm_portfolioname ?? '').localeCompare(b.pm_portfolioname ?? '')
          break
        case 'budget':
          cmp = (a.pm_budgeteur ?? 0) - (b.pm_budgeteur ?? 0)
          break
        case 'actual':
          cmp = (a.pm_actualspendeur ?? 0) - (b.pm_actualspendeur ?? 0)
          break
        case 'variance': {
          const vA = (a.pm_budgeteur ?? 0) - (a.pm_actualspendeur ?? 0)
          const vB = (b.pm_budgeteur ?? 0) - (b.pm_actualspendeur ?? 0)
          cmp = vA - vB
          break
        }
        case 'bizunit':
          cmp = (a.pm_businessunit ?? '').localeCompare(b.pm_businessunit ?? '')
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [programmes, searchQuery, portfolioFilter, sort])

  // ── Create Programme ───────────────────────────────────────────────────────
  const handleCreateProgramme = async () => {
    if (!createForm.pm_programmename.trim()) return
    setActionLoading(true)
    try {
      const payload: any = {
        pm_programmename: createForm.pm_programmename,
        pm_programmemanager: createForm.pm_programmemanager || undefined,
        pm_sponsorname: createForm.pm_sponsorname || undefined,
        pm_programmephase: createForm.pm_programmephase,
        pm_ragstatus: createForm.pm_ragstatus,
        pm_budgeteur: createForm.pm_budgeteur || 0,
        pm_businessunit: createForm.pm_businessunit || undefined,
        pm_startdate: createForm.pm_startdate || undefined,
        pm_enddate: createForm.pm_enddate || undefined,
        pm_programmedescription: createForm.pm_programmedescription || undefined,
      }
      if (createForm.pm_portfolioValue) {
        payload['pm_portfolio@odata.bind'] = `/pm_portfolios(${createForm.pm_portfolioValue})`
      }
      const created = await createProgramme(payload)
      if (created) {
        const hierarchy = await fetchPortfolioHierarchy()
        setProgrammes(hierarchy.programmes)
        setShowCreateModal(false)
        setCreateForm({
          pm_programmename: '',
          pm_programmemanager: '',
          pm_sponsorname: '',
          pm_programmephase: 1,
          pm_ragstatus: 1,
          pm_budgeteur: 0,
          pm_businessunit: '',
          pm_startdate: '',
          pm_enddate: '',
          pm_programmedescription: '',
          pm_portfolioValue: '',
        })
      }
    } catch {
      setError('Unable to create programme.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Variance Display ──────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
  // If detail view is active, show it instead of the list
  if (selectedProgrammeId && detailData) {
    const prog = detailData.programme
    const detailProjects = detailData.projects
    const detailRisks = detailData.risks
    const detailIssues = detailData.issues

    // RAG color for accent bar
    const ragVal = prog?.pm_ragstatus?.toString()
    const accentColor = ragVal === '2' ? '#ef4444' : ragVal === '0' ? '#f59e0b' : '#22c55e'

    return (
      <Box>
        {/* ── Detail View ─────────────────────────────────────────────────── */}

        {/* Back button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={closeDetail}
          variant="text"
          size="small"
          sx={{ mb: 1.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          Back to Programmes
        </Button>

        {/* ═══ Header Container (Hero Banner) ═══ */}
        <Paper
          sx={{
            mb: 3,
            borderRadius: 1.5,
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            bgcolor: isDark ? '#0f172a' : '#ffffff',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Left accent bar colored by RAG */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 5,
              bgcolor: accentColor,
            }}
          />

          <Box sx={{ pl: 4, pr: 3, py: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                  <AccountTreeIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.35rem' }}>
                    {prog?.pm_programmename ?? 'Programme'}
                  </Typography>
                  <StatusChip status={prog?.pm_ragstatus} type="rag" size="small" />
                  <StatusChip status={prog?.pm_programmephase} type="prog_phase" size="small" />
                </Box>
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {prog?.pm_programmemanager && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">{prog.pm_programmemanager}</Typography>
                    </Box>
                  )}
                  {prog?.pm_sponsorname && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FlagIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">Sponsor: {prog.pm_sponsorname}</Typography>
                    </Box>
                  )}
                  {prog?.pm_portfolioname && (
                    <Chip
                      label={prog.pm_portfolioname}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 1, height: 24, fontSize: '0.7rem' }}
                    />
                  )}
                  {prog?.pm_startdate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {new Date(prog.pm_startdate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {prog?.pm_enddate ? ` – ${new Date(prog.pm_enddate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Quick stats mini-cards */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Budget
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: '"JetBrains Mono", monospace' }}>
                    {currencyFormatter.format(prog?.pm_budgeteur ?? 0)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Actual Spend
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {currencyFormatter.format(prog?.pm_actualspendeur ?? 0)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1, textAlign: 'center', bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Projects
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {detailProjects.length}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* ═══ Tabs ═══ */}
        <Paper sx={{ borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
          <Tabs
            value={detailTab}
            onChange={(_, v) => setDetailTab(v)}
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? '#0f172a' : '#ffffff',
              px: 1,
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.8125rem',
                minHeight: 44,
                py: 1.5,
                px: 2.5,
                borderRadius: 1,
                mx: 0.25,
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: isDark ? '#1e293b' : '#f1f5f9' },
              },
              '& .Mui-selected': {
                color: 'primary.main',
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: 1.5,
              },
            }}
          >
            <Tab label="Overview & Governance" />
            <Tab label={`Projects (${detailProjects.length})`} />
            <Tab label="Financial Roll-Up" />
            <Tab label={`Risks & Issues (${detailRisks.length + detailIssues.length})`} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* ═══ Tab 1: Overview & Governance ═══ */}
            <TabPanel value={detailTab} index={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Two-column layout for metadata */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {/* Left column — Key Details */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.primary' }}>
                      <DescriptionIcon sx={{ fontSize: 16, color: 'primary.main' }} /> Key Details
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          Phase
                        </Typography>
                        <StatusChip status={prog?.pm_programmephase} type="prog_phase" size="medium" />
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          Programme Manager
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_programmemanager || '—'}</Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          Sponsor
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_sponsorname || '—'}</Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          Business Unit
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_businessunit || '—'}</Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          Parent Portfolio
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_portfolioname || '—'}</Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          Budget
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: '"JetBrains Mono", monospace' }}>{currencyFormatter.format(prog?.pm_budgeteur ?? 0)}</Typography>
                      </Paper>
                    </Box>
                  </Box>

                  {/* Right column — Description & Actions */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {prog?.pm_programmedescription && (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LightbulbIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Business Objectives
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: '0.8125rem' }}>
                          {prog.pm_programmedescription}
                        </Typography>
                      </Paper>
                    )}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <TrackChangesIcon sx={{ fontSize: 16, color: 'primary.main' }} /> Actions
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button variant="outlined" size="small" disabled sx={{ borderRadius: 1, textTransform: 'none', fontSize: '0.75rem' }}>
                          Update Phase
                        </Button>
                        <Button variant="outlined" size="small" disabled sx={{ borderRadius: 1, textTransform: 'none', fontSize: '0.75rem' }}>
                          Request Gate Review
                        </Button>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '0.7rem' }}>
                        Phase updates and gate review requests coming soon.
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              </Box>
            </TabPanel>

            {/* ═══ Tab 2: Project Portfolio ═══ */}
            <TabPanel value={detailTab} index={1}>
              {detailProjects.length > 0 ? (
                <TableContainer sx={{ maxHeight: 420, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Project Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Phase</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>RAG</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Project Manager</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>% Complete</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#0f172a' : '#f8fafc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Budget</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailProjects.map((proj, idx) => (
                        <TableRow
                          key={proj.pm_projectid}
                          hover
                          sx={{
                            bgcolor: idx % 2 === 1 ? (isDark ? '#1e293b' : '#fafafa') : 'transparent',
                            '& td': { py: 0.75, px: 2 },
                            '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#f0f4ff !important' },
                            transition: 'background-color 0.12s ease',
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{proj.pm_projectname ?? 'Untitled'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{proj.pm_projectcode || '—'}</Typography>
                          </TableCell>
                          <TableCell><StatusChip status={proj.pm_projectphase} type="phase" size="small" /></TableCell>
                          <TableCell><StatusChip status={proj.pm_ragstatus} type="rag" size="small" /></TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{proj.pm_projectmanager || '—'}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                                {proj.pm_percentcomplete ?? 0}%
                              </Typography>
                              <Box
                                sx={{
                                  width: 60,
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: isDark ? '#334155' : '#e2e8f0',
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${Math.min(proj.pm_percentcomplete ?? 0, 100)}%`,
                                    height: '100%',
                                    borderRadius: 3,
                                    bgcolor: (proj.pm_percentcomplete ?? 0) >= 100 ? '#22c55e' : '#0ea5e9',
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                              {currencyFormatter.format(proj.pm_approvedbudgeteur ?? 0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <AccountTreeIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>No projects linked to this programme.</Typography>
                  <Typography variant="caption" color="text.disabled">Projects will appear here once they are associated with this programme.</Typography>
                </Box>
              )}
            </TabPanel>

            {/* ═══ Tab 3: Financial Roll-Up ═══ */}
            <TabPanel value={detailTab} index={2}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Summary cards row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, borderLeft: `3px solid #0ea5e9` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Programme Budget</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: '"JetBrains Mono", monospace' }}>{currencyFormatter.format(prog?.pm_budgeteur ?? 0)}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, borderLeft: `3px solid #f59e0b` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Actual Spend</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currencyFormatter.format(prog?.pm_actualspendeur ?? 0)}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, borderLeft: `3px solid #22c55e` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Child Projects Budget</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currencyFormatter.format(detailProjects.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0))}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, borderLeft: `3px solid ${((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0)) < 0 ? '#ef4444' : '#22c55e'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Variance</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: ((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0)) < 0 ? '#ef4444' : '#22c55e', fontFamily: '"JetBrains Mono", monospace' }}>
                      {currencyFormatter.format((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0))}
                    </Typography>
                  </Paper>
                </Box>

                {/* Budget utilization bar */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <MoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Budget Utilization
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                      {prog?.pm_budgeteur && prog.pm_budgeteur > 0
                        ? `${((prog.pm_actualspendeur ?? 0) / prog.pm_budgeteur * 100).toFixed(1)}% consumed`
                        : '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total Budget</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currencyFormatter.format(prog?.pm_budgeteur ?? 0)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total Spend</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currencyFormatter.format(prog?.pm_actualspendeur ?? 0)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>Variance</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: ((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0)) < 0 ? '#ef4444' : '#22c55e' }}>
                        {currencyFormatter.format((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0))}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 10,
                      borderRadius: 5,
                      bgcolor: isDark ? '#1e293b' : '#e2e8f0',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${prog?.pm_budgeteur && prog.pm_budgeteur > 0 ? Math.min(((prog.pm_actualspendeur ?? 0) / prog.pm_budgeteur) * 100, 100) : 0}%`,
                        height: '100%',
                        borderRadius: 5,
                        bgcolor: (() => {
                          const ratio = prog?.pm_budgeteur && prog.pm_budgeteur > 0 ? (prog.pm_actualspendeur ?? 0) / prog.pm_budgeteur : 0
                          return ratio > 0.9 ? '#ef4444' : ratio > 0.7 ? '#f59e0b' : '#22c55e'
                        })(),
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </Box>
                </Paper>

                {/* Two-column: Project Breakdown + Funding */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {/* Project-level financial breakdown */}
                  {detailProjects.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Project Budget Breakdown</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {detailProjects.map((proj) => (
                          <Paper key={proj.pm_projectid} variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>{proj.pm_projectname ?? 'Untitled'}</Typography>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', display: 'block' }}>{currencyFormatter.format(proj.pm_approvedbudgeteur ?? 0)}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem' }}>{currencyFormatter.format(proj.pm_actualcosteur ?? 0)}</Typography>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    </Paper>
                  )}

                  {/* Funding source placeholder */}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: isDark ? '#1e293b' : '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 150 }}>
                    <MoneyIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Funding Allocation</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                      Allocate top-level funding from sources.
                    </Typography>
                    <Button variant="outlined" size="small" disabled sx={{ borderRadius: 1, textTransform: 'none' }}>
                      Allocate Funding
                    </Button>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, fontSize: '0.65rem' }}>
                      Coming in a future update.
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </TabPanel>

            {/* ═══ Tab 4: Escalated Risks & Issues ═══ */}
            <TabPanel value={detailTab} index={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Left column: Risks */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <ErrorIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Escalated Risks
                      </Typography>
                      <Chip label={detailRisks.filter((r) => r.pm_escalated).length} size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem', borderRadius: 1, height: 20 }} />
                    </Box>
                    {detailRisks.filter((r) => r.pm_escalated).length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {detailRisks.filter((r) => r.pm_escalated).map((risk) => (
                          <Paper key={risk.pm_riskid} variant="outlined" sx={{ p: 1.75, borderRadius: 1, borderLeft: '3px solid #ef4444' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{risk.pm_risktitle ?? 'Untitled Risk'}</Typography>
                              <StatusChip status={risk.pm_ragstatus} type="rag" size="small" />
                            </Box>
                            {risk.pm_riskdescription && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>{risk.pm_riskdescription}</Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                              {risk.pm_riskowner && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Owner: {risk.pm_riskowner}</Typography>}
                              {risk.pm_inherentscore !== undefined && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Score: {risk.pm_inherentscore}</Typography>}
                              <Chip
                                label={RISK_CATEGORY_LABELS[risk.pm_riskcategory?.toString() ?? ''] ?? 'Unknown'}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', fontWeight: 600, borderRadius: 1, height: 20 }}
                              />
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No escalated risks.</Typography>
                      </Paper>
                    )}
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <AssignmentLateIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Programme Risks
                      </Typography>
                      <Chip label={detailRisks.filter((r) => !r.pm_escalated).length} size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.65rem', borderRadius: 1, height: 20 }} />
                    </Box>
                    {detailRisks.filter((r) => !r.pm_escalated).length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {detailRisks.filter((r) => !r.pm_escalated).map((risk) => (
                          <Paper key={risk.pm_riskid} variant="outlined" sx={{ p: 1.75, borderRadius: 1, borderLeft: '3px solid #f59e0b' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{risk.pm_risktitle ?? 'Untitled Risk'}</Typography>
                              <StatusChip status={risk.pm_ragstatus} type="rag" size="small" />
                              <Chip
                                label={RISK_CATEGORY_LABELS[risk.pm_riskcategory?.toString() ?? ''] ?? 'Unknown'}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', fontWeight: 600, borderRadius: 1, height: 20 }}
                              />
                            </Box>
                            {risk.pm_riskowner && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Owner: {risk.pm_riskowner}</Typography>}
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No programme-level risks.</Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>

                {/* Right column: Issues */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Issues
                    </Typography>
                    <Chip label={detailIssues.length} size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.65rem', borderRadius: 1, height: 20 }} />
                  </Box>
                  {detailIssues.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {detailIssues.map((issue) => (
                        <Paper key={issue.pm_issueid} variant="outlined" sx={{ p: 1.75, borderRadius: 1, borderLeft: `3px solid ${issue.pm_prioritylevel === 1 ? '#ef4444' : issue.pm_prioritylevel === 0 ? '#f59e0b' : '#0ea5e9'}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{issue.pm_issuetitle ?? 'Untitled Issue'}</Typography>
                            <StatusChip status={issue.pm_ragstatus} type="rag" size="small" />
                            <Chip
                              label={ISSUE_PRIORITY_LABELS[issue.pm_prioritylevel?.toString() ?? ''] ?? 'Unknown'}
                              size="small"
                              color={issue.pm_prioritylevel === 1 ? 'error' : issue.pm_prioritylevel === 0 ? 'warning' : 'default'}
                              sx={{ fontSize: '0.6rem', fontWeight: 600, borderRadius: 1, height: 20 }}
                            />
                            {issue.pm_escalationstatus && (
                              <Chip label="Escalated" size="small" color="error" sx={{ fontSize: '0.6rem', fontWeight: 600, borderRadius: 1, height: 20 }} />
                            )}
                          </Box>
                          {issue.pm_issuedescription && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>{issue.pm_issuedescription}</Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                            {issue.pm_issueowner && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Owner: {issue.pm_issueowner}</Typography>}
                            {issue.pm_targetresolutiondate && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                Target: {new Date(issue.pm_targetresolutiondate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No issues reported.</Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    )
  }

  // ── MAIN LIST VIEW ──────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Programmes</Typography>
          <Typography variant="body2" color="text.secondary">
            Searchable directory of all programmes with aggregated health and financials.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, px: 3 }}
        >
          + New Programme
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── 1. KPI Ribbon ──────────────────────────────────────────────────── */}
      {!loading && (
        <Box sx={{ display: 'flex', gap: 2.5, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {/* KPI 1: Total Programmes */}
          <Box sx={{ flex: '1 1 0', minWidth: 180 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      Total Programmes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {kpiData.count}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0ea5e915', color: '#0ea5e9' }}>
                    <AccountTreeIcon />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* KPI 2: Total Budget */}
          <Box sx={{ flex: '1 1 0', minWidth: 180 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      Total Budget
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {currencyFormatter.format(kpiData.totalBudget)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#22c55e15', color: '#22c55e' }}>
                    <AccountBalanceWalletIcon />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* KPI 3: Total Actual Spend */}
          <Box sx={{ flex: '1 1 0', minWidth: 180 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      Total Actual Spend
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {currencyFormatter.format(kpiData.totalActual)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpiData.totalBudget > 0
                        ? `${((kpiData.totalActual / kpiData.totalBudget) * 100).toFixed(1)}% of budget`
                        : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f59e0b15', color: '#f59e0b' }}>
                    <TrendingDownIcon />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* KPI 4: Health Split */}
          <Box sx={{ flex: '1 1 0', minWidth: 220 }}>
            <Card sx={{ height: '100%' }}>
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

      {/* ── 2. Master Programme Directory ──────────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        {/* Top Bar: Search + Filter + Controls */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search by name, manager, sponsor, portfolio..."
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
            sx={{ flex: '1 1 260px', maxWidth: 420 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Portfolio</InputLabel>
            <Select
              value={portfolioFilter}
              label="Portfolio"
              onChange={(e) => setPortfolioFilter(e.target.value)}
              sx={{ borderRadius: 2, fontSize: '0.875rem' }}
            >
              <MenuItem value="all">All Portfolios</MenuItem>
              {portfolios.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {searchQuery || portfolioFilter !== 'all' ? (
            <Button
              size="small"
              variant="text"
              onClick={() => { setSearchQuery(''); setPortfolioFilter('all') }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Clear filters
            </Button>
          ) : null}
        </Box>

        {/* Loading skeleton */}
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(8)].map((_, i) => <Skeleton key={i} variant="rounded" height={36} sx={{ mb: 1 }} />)}
          </Box>
        ) : filteredProgrammes.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {searchQuery || portfolioFilter !== 'all'
                ? 'No programmes match your search criteria.'
                : 'No programmes found.'}
            </Typography>
            {!searchQuery && portfolioFilter === 'all' && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
                Create your first programme
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ p: 0 }}>
            {/* Dense Data Grid */}
            <TableContainer sx={{ maxHeight: 'calc(100vh - 480px)', minHeight: 300 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1400 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Programme Name</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'phase'} direction={sort.field === 'phase' ? sort.dir : 'asc'} onClick={() => handleSort('phase')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Phase</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'rag'} direction={sort.field === 'rag' ? sort.dir : 'asc'} onClick={() => handleSort('rag')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>RAG</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'sponsor'} direction={sort.field === 'sponsor' ? sort.dir : 'asc'} onClick={() => handleSort('sponsor')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Sponsor</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'manager'} direction={sort.field === 'manager' ? sort.dir : 'asc'} onClick={() => handleSort('manager')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Programme Manager</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'portfolio'} direction={sort.field === 'portfolio' ? sort.dir : 'asc'} onClick={() => handleSort('portfolio')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Parent Portfolio</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'bizunit'} direction={sort.field === 'bizunit' ? sort.dir : 'asc'} onClick={() => handleSort('bizunit')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Business Unit</TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'budget'} direction={sort.field === 'budget' ? sort.dir : 'asc'} onClick={() => handleSort('budget')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Total Budget</TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'actual'} direction={sort.field === 'actual' ? sort.dir : 'asc'} onClick={() => handleSort('actual')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Actual Spend</TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'variance'} direction={sort.field === 'variance' ? sort.dir : 'asc'} onClick={() => handleSort('variance')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Variance</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      Start Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
                      End Date
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProgrammes.map((programme, idx) => {
                    const variance = (programme.pm_budgeteur ?? 0) - (programme.pm_actualspendeur ?? 0)
                    const isNegative = variance < 0
                    return (
                      <TableRow
                        key={programme.pm_programmeid}
                        hover
                        onClick={() => programme.pm_programmeid && openDetail(programme.pm_programmeid)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                          '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                          transition: 'background-color 0.15s ease',
                          '& td': { px: 2, py: 1 },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountTreeIcon sx={{ fontSize: 16, color: 'primary.main', opacity: 0.7 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {programme.pm_programmename ?? 'Untitled Programme'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={programme.pm_programmephase} type="prog_phase" size="small" />
                        </TableCell>
                        <TableCell>
                          <StatusChip status={programme.pm_ragstatus} type="rag" size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {programme.pm_sponsorname || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {programme.pm_programmemanager || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={programme.pm_portfolioname || '—'}
                            size="small"
                            variant="outlined"
                            color={programme.pm_portfolioname ? 'primary' : 'default'}
                            sx={{ fontWeight: 600, borderRadius: 8, fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {programme.pm_businessunit || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                            {currencyFormatter.format(programme.pm_budgeteur ?? 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: isDark ? '#94a3b8' : '#64748b' }}>
                            {currencyFormatter.format(programme.pm_actualspendeur ?? 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <VarianceDisplay budget={programme.pm_budgeteur} consumed={programme.pm_actualspendeur} />
                          {isNegative && (
                            <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 500, display: 'block' }}>
                              Overspent
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {programme.pm_startdate ? new Date(programme.pm_startdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {programme.pm_enddate ? new Date(programme.pm_enddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer */}
            <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Showing {filteredProgrammes.length} of {programmes.length} programme{programmes.length !== 1 ? 's' : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total budget: {currencyFormatter.format(filteredProgrammes.reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total actual: {currencyFormatter.format(filteredProgrammes.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0))}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── Detail Loading Overlay (when navigating to detail) ─────────────── */}
      {selectedProgrammeId && detailLoading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Skeleton variant="rounded" height={80} sx={{ mb: 2, borderRadius: 3 }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
        </Box>
      )}

      {/* ── 4. Create Programme Modal ──────────────────────────────────────── */}
      <Dialog open={showCreateModal} onClose={() => !actionLoading && setShowCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          New Programme
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new programme record. Programmes act as containers for multiple projects within a portfolio.
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Programme Name"
                required
                fullWidth
                size="small"
                value={createForm.pm_programmename}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_programmename: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Parent Portfolio</InputLabel>
                <Select
                  value={createForm.pm_portfolioValue}
                  label="Parent Portfolio"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfolioValue: e.target.value }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">None</MenuItem>
                  {portfolios.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Programme Manager"
                fullWidth
                size="small"
                value={createForm.pm_programmemanager}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_programmemanager: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Sponsor"
                fullWidth
                size="small"
                value={createForm.pm_sponsorname}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_sponsorname: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Phase</InputLabel>
                <Select
                  value={createForm.pm_programmephase}
                  label="Phase"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_programmephase: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Delivery</MenuItem>
                  <MenuItem value={1}>Planning</MenuItem>
                  <MenuItem value={2}>Initiation</MenuItem>
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
                label="Budget (EUR)"
                type="number"
                fullWidth
                size="small"
                value={createForm.pm_budgeteur}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_budgeteur: Number(e.target.value) }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Business Unit"
                fullWidth
                size="small"
                value={createForm.pm_businessunit}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_businessunit: e.target.value }))}
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
                label="Description / Business Objectives"
                fullWidth
                size="small"
                multiline
                rows={3}
                value={createForm.pm_programmedescription}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_programmedescription: e.target.value }))}
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
            onClick={handleCreateProgramme}
            variant="contained"
            disabled={!createForm.pm_programmename.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' } }}
          >
            {actionLoading ? 'Creating...' : 'Create Programme'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
