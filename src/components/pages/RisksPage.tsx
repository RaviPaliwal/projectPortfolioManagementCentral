import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Avatar,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  Switch,
  Grid,
  Card,
  CardContent,
  Divider,
  useTheme,
  TableSortLabel,
} from '@mui/material'
import Plot from 'react-plotly.js'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import GppGoodIcon from '@mui/icons-material/GppGood'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import FlagIcon from '@mui/icons-material/Flag'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import {
  fetchAllRisks,
  createRiskFull,
  updateRiskFull,
  deleteRisk,
  fetchMitigationActions,
} from '../../services/dataverseService'
import type { RiskModel, RiskMitigationActionModel } from '../../models/dataverse'
import { fontSizes } from '../../styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar } from '../common'
import type { KpiCardItem } from '../common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Resource',
  '1': 'Financial',
  '2': 'Legal',
  '3': 'Technical',
  '4': 'External',
}

const RISK_CATEGORY_COLORS: Record<string, string> = {
  '0': '#0ea5e9',
  '1': '#f59e0b',
  '2': '#8b5cf6',
  '3': '#10b981',
  '4': '#ef4444',
}

const RAG_LABELS: Record<string, string> = {
  '0': 'Amber',
  '1': 'Green',
  '2': 'Red',
}

const RAG_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  '0': 'warning',
  '1': 'success',
  '2': 'error',
}

const RISK_STATUS_LABELS: Record<string, string> = {
  '0': 'In Mitigation',
  '1': 'Open',
}

const RISK_STATUS_COLORS: Record<string, 'info' | 'default'> = {
  '0': 'info',
  '1': 'default',
}

const PROBABILITY_LABELS: Record<string, string> = {
  '3': 'Rare',
  '2': 'Unlikely',
  '0': 'Possible',
  '1': 'Likely',
}

const IMPACT_LABELS: Record<string, string> = {
  '1': 'Moderate',
  '0': 'Major',
  '2': 'Catastrophic',
}

const RESIDUAL_PROB_LABELS: Record<string, string> = {
  '0': 'Unlikely',
  '1': 'Possible',
  '2': 'Rare',
}

const RESIDUAL_IMPACT_LABELS: Record<string, string> = {
  '0': 'Moderate',
  '1': 'Minor',
  '2': 'Major',
}

const STRATEGY_LABELS: Record<string, string> = {
  '0': 'Mitigate',
  '1': 'Accept',
}

// Score helpers for heatmap
const probNumeric = (v: string | number | undefined): number => {
  const s = String(v ?? '')
  if (s === '3') return 1 // Rare
  if (s === '2') return 2 // Unlikely
  if (s === '0') return 3 // Possible
  if (s === '1') return 4 // Likely
  return 0
}

const impactNumeric = (v: string | number | undefined): number => {
  const s = String(v ?? '')
  if (s === '1') return 1 // Moderate
  if (s === '0') return 2 // Major
  if (s === '2') return 3 // Catastrophic
  return 0
}

const riskScore = (prob: string | number | undefined, impact: string | number | undefined): number => {
  return probNumeric(prob) * impactNumeric(impact)
}

const getScoreColor = (score: number): string => {
  if (score >= 8) return '#ef4444' // Red - high risk
  if (score >= 4) return '#f59e0b' // Amber - medium risk
  if (score >= 1) return '#22c55e' // Green - low risk
  return '#94a3b8' // Grey - no score
}

const getScoreLabel = (score: number): string => {
  if (score >= 8) return 'High'
  if (score >= 4) return 'Medium'
  if (score >= 1) return 'Low'
  return 'Unscored'
}

// ─── Sort Config ──────────────────────────────────────────────────────────────

type SortField = 'pm_risktitle' | 'pm_riskcategory' | 'pm_ragstatus' | 'pm_riskowner' | 'pm_inherentscore' | 'pm_riskstatus' | 'pm_identifieddate'
type SortDir = 'asc' | 'desc'

function sortRisks(risks: RiskModel[], field: SortField, dir: SortDir): RiskModel[] {
  return [...risks].sort((a, b) => {
    const aVal = (a[field] ?? '') as string | number
    const bVal = (b[field] ?? '') as string | number
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal))
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── Form Defaults ────────────────────────────────────────────────────────────

const emptyForm: Partial<RiskModel> = {
  pm_risktitle: '',
  pm_riskdescription: '',
  pm_riskcategory: '',
  pm_ragstatus: '',
  pm_riskowner: '',
  pm_riskstatus: 1,
  pm_escalated: false,
  pm_identifieddate: new Date().toISOString().split('T')[0],
  pm_targetclosedate: '',
  pm_inherentprobability: '',
  pm_inherentimpact: '',
  pm_residualprobability: '',
  pm_residualimpact: '',
  pm_responsestrategy: '',
  pm_riskcause: '',
  pm_riskeffect: '',
  pm_riskreference: '',
  _pm_project_value: '',
  _pm_programmefk_value: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RisksPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ── State ─────────────────────────────────────────────────────────────────
  const [risks, setRisks] = useState<RiskModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [ragFilter, setRagFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('pm_risktitle')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Drawer
  const [selectedRisk, setSelectedRisk] = useState<RiskModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<RiskModel | null>(null)
  const [form, setForm] = useState<Partial<RiskModel>>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RiskModel | null>(null)

  // Mitigation actions
  const [mitigationActions, setMitigationActions] = useState<RiskMitigationActionModel[]>([])
  const [mitigationLoading, setMitigationLoading] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadRisks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [RisksPage] Fetching data...')
      const data = await fetchAllRisks()
      console.log('🔍 [RisksPage] Risks loaded:', data?.length ?? 0, 'items')
      if (data?.length > 0) console.log('🔍 [RisksPage] Sample risk:', JSON.stringify(data[0], null, 2).slice(0, 500))
      setRisks(data)
    } catch (err) {
      console.error('[RisksPage] loadRisks error:', err)
      setError('Unable to load risks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRisks()
  }, [loadRisks])

  // ── Fetch mitigation actions when drawer tab changes ────────────────────────
  useEffect(() => {
    if (selectedRisk?.pm_riskid && drawerTab === 1) {
      setMitigationLoading(true)
      fetchMitigationActions(selectedRisk.pm_riskid)
        .then((actions) => setMitigationActions(actions))
        .catch(() => setMitigationActions([]))
        .finally(() => setMitigationLoading(false))
    } else if (drawerTab !== 1) {
      setMitigationActions([])
    }
  }, [selectedRisk?.pm_riskid, drawerTab])

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredRisks = useMemo(() => {
    let list = risks
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          (r.pm_risktitle ?? '').toLowerCase().includes(q) ||
          (r.pm_riskowner ?? '').toLowerCase().includes(q) ||
          (r.pm_riskreference ?? '').toLowerCase().includes(q) ||
          (r.pm_riskdescription ?? '').toLowerCase().includes(q) ||
          (r.pm_projectcode ?? '').toLowerCase().includes(q)
      )
    }
    if (categoryFilter) {
      list = list.filter((r) => String(r.pm_riskcategory ?? '') === categoryFilter)
    }
    if (ragFilter) {
      list = list.filter((r) => String(r.pm_ragstatus ?? '') === ragFilter)
    }
    if (statusFilter) {
      list = list.filter((r) => String(r.pm_riskstatus ?? '') === statusFilter)
    }
    return sortRisks(list, sortField, sortDir)
  }, [risks, searchQuery, categoryFilter, ragFilter, statusFilter, sortField, sortDir])

  const paginatedRisks = useMemo(
    () => filteredRisks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredRisks, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handleCategoryFilterChange = useCallback((value: string) => { setCategoryFilter(value); setPage(0) }, [])
  const handleRagFilterChange = useCallback((value: string) => { setRagFilter(value); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setPage(0) }, [])

  // KPIs
  const kpis: KpiCardItem[] = useMemo(() => {
    const openRisks = risks.filter((r) => String(r.pm_riskstatus ?? '') === '1')
    const highRisk = risks.filter((r) => {
      const score = riskScore(r.pm_inherentprobability, r.pm_inherentimpact)
      return score >= 8
    })
    const inMitigation = risks.filter((r) => String(r.pm_riskstatus ?? '') === '0')
    return [
      {
        label: 'Total Risks',
        value: risks.length,
        color: '#0ea5e9',
        icon: <WarningAmberIcon />,
      },
      {
        label: 'Open Risks',
        value: openRisks.length,
        color: '#f59e0b',
        icon: <GppMaybeIcon />,
        subtitle: openRisks.length > 0 ? `${Math.round((openRisks.length / Math.max(risks.length, 1)) * 100)}% of total` : 'None open',
      },
      {
        label: 'High / Critical',
        value: highRisk.length,
        color: '#ef4444',
        icon: <ArrowUpwardIcon />,
      },
      {
        label: 'In Mitigation',
        value: inMitigation.length,
        color: '#22c55e',
        icon: <GppGoodIcon />,
      },
    ]
  }, [risks])

  // Heatmap data for Nivo
  const heatmapData = useMemo(() => {
    const grid: Record<string, number> = {}
    for (const r of risks) {
      const p = probNumeric(r.pm_inherentprobability)
      const i = impactNumeric(r.pm_inherentimpact)
      if (p > 0 && i > 0) {
        const key = `${p}x${i}`
        grid[key] = (grid[key] ?? 0) + 1
      }
    }
    const y = ['Likely (4)', 'Possible (3)', 'Unlikely (2)', 'Rare (1)']
    const x = ['Mod (1)', 'Maj (2)', 'Cat (3)']
    const z = y.map((row) => {
      const prob = Number(row.match(/\((\d+)\)/)?.[1] ?? 0)
      return x.map((col) => {
        const impact = Number(col.match(/\((\d+)\)/)?.[1] ?? 0)
        return grid[`${prob}x${impact}`] ?? 0
      })
    })
    return { x, y, z }
  }, [risks])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const openCreate = () => {
    setEditingRisk(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (risk: RiskModel) => {
    setEditingRisk(risk)
    setForm({
      pm_risktitle: risk.pm_risktitle ?? '',
      pm_riskdescription: risk.pm_riskdescription ?? '',
      pm_riskcategory: risk.pm_riskcategory ?? '',
      pm_ragstatus: risk.pm_ragstatus ?? '',
      pm_riskowner: risk.pm_riskowner ?? '',
      pm_riskstatus: risk.pm_riskstatus ?? 1,
      pm_escalated: risk.pm_escalated ?? false,
      pm_identifieddate: risk.pm_identifieddate ?? '',
      pm_targetclosedate: risk.pm_targetclosedate ?? '',
      pm_inherentprobability: risk.pm_inherentprobability ?? '',
      pm_inherentimpact: risk.pm_inherentimpact ?? '',
      pm_residualprobability: risk.pm_residualprobability ?? '',
      pm_residualimpact: risk.pm_residualimpact ?? '',
      pm_responsestrategy: risk.pm_responsestrategy ?? '',
      pm_riskcause: risk.pm_riskcause ?? '',
      pm_riskeffect: risk.pm_riskeffect ?? '',
      pm_riskreference: risk.pm_riskreference ?? '',
      _pm_project_value: risk._pm_project_value ?? '',
      _pm_programmefk_value: risk._pm_programmefk_value ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.pm_risktitle?.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingRisk?.pm_riskid) {
        const updated = await updateRiskFull(editingRisk.pm_riskid, form)
        if (updated) {
          setRisks((prev) => prev.map((r) => (r.pm_riskid === updated.pm_riskid ? updated : r)))
          setSuccessMsg('Risk updated.')
        }
      } else {
        const created = await createRiskFull(form)
        if (created) {
          setRisks((prev) => [...prev, created])
          setSuccessMsg('Risk created.')
        }
      }
      setDialogOpen(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to save risk.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_riskid) return
    setError(null)
    try {
      await deleteRisk(deleteTarget.pm_riskid)
      setRisks((prev) => prev.filter((r) => r.pm_riskid !== deleteTarget.pm_riskid))
      setSuccessMsg('Risk deleted.')
      setDeleteTarget(null)
      if (selectedRisk?.pm_riskid === deleteTarget.pm_riskid) {
        setDrawerOpen(false)
        setSelectedRisk(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete risk.')
    }
  }

  // ── Inherent score calculation ────────────────────────────────────────────
  const inherentScore = useMemo(() => {
    return riskScore(form.pm_inherentprobability, form.pm_inherentimpact)
  }, [form.pm_inherentprobability, form.pm_inherentimpact])

  const residualScore = useMemo(() => {
    return riskScore(form.pm_residualprobability, form.pm_residualimpact)
  }, [form.pm_residualprobability, form.pm_residualimpact])

  const selectedRiskScore = useMemo(() => {
    if (!selectedRisk) return 0
    return riskScore(selectedRisk.pm_inherentprobability, selectedRisk.pm_inherentimpact)
  }, [selectedRisk])

  const selectedResidualScore = useMemo(() => {
    if (!selectedRisk) return 0
    return riskScore(selectedRisk.pm_residualprobability, selectedRisk.pm_residualimpact)
  }, [selectedRisk])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Success / Error alerts */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <PageHeader
        title="Risk Matrix"
        subtitle="Identify, assess, and manage project risks with probability/impact scoring"
        actionElement={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Risk
          </Button>
        }
      />

      <KpiCardRow items={kpis} />

      {/* ── Heatmap Section ─────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Inherent Risk Heatmap
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Probability × Impact matrix showing risk distribution. Cells are color-coded by severity and intensity shows risk count.
        </Typography>
            <Box sx={{ height: 340 }}>
              <Plot
                data={[
                  {
                    z: heatmapData.z,
                    x: heatmapData.x,
                    y: heatmapData.y,
                    type: 'heatmap',
                    colorscale: [
                      [0, '#dbeafe'],
                      [0.33, '#22c55e'],
                      [0.66, '#f59e0b'],
                      [1, '#ef4444'],
                    ],
                    hovertemplate: '%{y} × %{x}<br>Risks: %{z}<extra></extra>',
                    showscale: true,
                    colorbar: {
                      title: { text: 'Risk count' },
                      titleside: 'right',
                      tickfont: { size: 11, color: isDark ? '#cbd5e1' : '#475569' },
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 30, r: 30, b: 60, l: 90 },
                  xaxis: {
                    title: { text: 'Impact →' },
                    tickfont: { size: 11, color: isDark ? '#cbd5e1' : '#475569' },
                    titlefont: { size: 12, color: isDark ? '#cbd5e1' : '#475569' },
                  },
                  yaxis: {
                    title: { text: 'Probability →' },
                    autorange: 'reversed',
                    tickfont: { size: 11, color: isDark ? '#cbd5e1' : '#475569' },
                    titlefont: { size: 12, color: isDark ? '#cbd5e1' : '#475569' },
                  },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: isDark ? '#0f172a' : '#ffffff',
                  font: { color: isDark ? '#cbd5e1' : '#475569', family: 'inherit' },
                }}
                config={{ displayModeBar: false, responsive: true }}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
              />
            </Box>
      </Paper>

      {/* ── Search, Filter & Table ─────────────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by title, owner, reference, description, project…"
          onClear={() => { setSearchQuery(''); setCategoryFilter(''); setRagFilter(''); setStatusFilter(''); setPage(0) }}
          extraFilters={
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => handleCategoryFilterChange(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>RAG</InputLabel>
                <Select
                  value={ragFilter}
                  label="RAG"
                  onChange={(e) => handleRagFilterChange(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  {Object.entries(RAG_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          }
        />

        <TableShell
          loading={loading}
          empty={filteredRisks.length === 0}
          emptyIcon={<WarningAmberIcon />}
          emptyTitle={searchQuery || categoryFilter || ragFilter || statusFilter
            ? 'No risks match your criteria.'
            : 'No risks found.'}
          emptyAction={!searchQuery && !categoryFilter && !ragFilter && !statusFilter && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
              Add your first risk
            </Button>
          )}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5, width: 50 }}>
                  #
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_risktitle'} direction={sortField === 'pm_risktitle' ? sortDir : 'asc'} onClick={() => handleSort('pm_risktitle')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Risk Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_riskcategory'} direction={sortField === 'pm_riskcategory' ? sortDir : 'asc'} onClick={() => handleSort('pm_riskcategory')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_ragstatus'} direction={sortField === 'pm_ragstatus' ? sortDir : 'asc'} onClick={() => handleSort('pm_ragstatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    RAG
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Owner
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Probability
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Impact
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_inherentscore'} direction={sortField === 'pm_inherentscore' ? sortDir : 'asc'} onClick={() => handleSort('pm_inherentscore')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_riskstatus'} direction={sortField === 'pm_riskstatus' ? sortDir : 'asc'} onClick={() => handleSort('pm_riskstatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRisks.map((risk, idx) => {
                const score = riskScore(risk.pm_inherentprobability, risk.pm_inherentimpact)
                return (
                  <TableRow
                    key={risk.pm_riskid}
                    hover
                    onClick={() => { setSelectedRisk(risk); setDrawerOpen(true); setDrawerTab(0) }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell sx={{ color: 'text.secondary', fontSize: fontSizes.xs }}>{idx + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: getScoreColor(score),
                            fontSize: fontSizes.xs,
                            fontWeight: 700,
                          }}
                        >
                          {score > 0 ? score : '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {risk.pm_risktitle ?? '—'}
                          </Typography>
                          {risk.pm_riskreference && (
                            <Typography variant="caption" color="text.secondary">
                              {risk.pm_riskreference}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={RISK_CATEGORY_LABELS[String(risk.pm_riskcategory ?? '')] ?? '—'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: 8,
                          bgcolor: `${RISK_CATEGORY_COLORS[String(risk.pm_riskcategory ?? '')] ?? '#94a3b8'}20`,
                          color: RISK_CATEGORY_COLORS[String(risk.pm_riskcategory ?? '')] ?? '#94a3b8',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={RAG_LABELS[String(risk.pm_ragstatus ?? '')] ?? '—'}
                        color={RAG_COLORS[String(risk.pm_ragstatus ?? '')] ?? 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderRadius: 8 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{risk.pm_riskowner ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{PROBABILITY_LABELS[String(risk.pm_inherentprobability ?? '')] ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{IMPACT_LABELS[String(risk.pm_inherentimpact ?? '')] ?? '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={getScoreLabel(score)}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: 8,
                          bgcolor: `${getScoreColor(score)}20`,
                          color: getScoreColor(score),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={RISK_STATUS_LABELS[String(risk.pm_riskstatus ?? '')] ?? '—'}
                        color={RISK_STATUS_COLORS[String(risk.pm_riskstatus ?? '')] ?? 'default'}
                        size="small"
                        variant={String(risk.pm_riskstatus) === '0' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, borderRadius: 8 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {risk.pm_escalated && (
                          <Tooltip title="Escalated">
                            <FlagIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                          </Tooltip>
                        )}
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); openEdit(risk) }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(risk) }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredRisks.length > 0 && (
          <TableFooter
            filteredCount={filteredRisks.length}
            totalCount={risks.length}
            itemLabel="risk"
          />
        )}
        {!loading && filteredRisks.length > 0 && (
          <TablePagination
            component="div"
            count={filteredRisks.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>

      {/* ── Detail Drawer ──────────────────────────────────────────────── */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedRisk(null) }}
        title={selectedRisk?.pm_risktitle ?? ''}
        subtitle={selectedRisk && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              label={RISK_CATEGORY_LABELS[String(selectedRisk.pm_riskcategory ?? '')] ?? '—'}
              size="small"
              sx={{
                fontWeight: 600, borderRadius: 8,
                bgcolor: `${RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? '#94a3b8'}20`,
                color: RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? '#94a3b8',
              }}
            />
            <Chip
              label={RAG_LABELS[String(selectedRisk.pm_ragstatus ?? '')] ?? '—'}
              color={RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            <Chip
              label={RISK_STATUS_LABELS[String(selectedRisk.pm_riskstatus ?? '')] ?? '—'}
              color={RISK_STATUS_COLORS[String(selectedRisk.pm_riskstatus ?? '')] ?? 'default'}
              size="small"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            {selectedRisk.pm_escalated && (
              <Chip icon={<FlagIcon />} label="Escalated" color="error" size="small" sx={{ fontWeight: 600, borderRadius: 8 }} />
            )}
          </Box>
        )}
        tabs={[
          { label: 'Overview' },
          { label: 'Mitigation' },
        ]}
        tabValue={drawerTab}
        onTabChange={setDrawerTab}
        headerActions={
          selectedRisk && (
            <>
              <IconButton
                size="small"
                onClick={() => { openEdit(selectedRisk); setDrawerOpen(false) }}
                sx={{ borderRadius: 1.5 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => { setDeleteTarget(selectedRisk); setDrawerOpen(false) }}
                sx={{ borderRadius: 1.5, color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )
        }
      >
        {drawerTab === 0 && selectedRisk && (
          <Box>
            {/* Score cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Inherent Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: getScoreColor(selectedRiskScore) }}>
                        {selectedRiskScore > 0 ? selectedRiskScore : '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedRiskScore > 0 ? getScoreLabel(selectedRiskScore) : 'Unscored'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        P: {PROBABILITY_LABELS[String(selectedRisk.pm_inherentprobability ?? '')] ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        I: {IMPACT_LABELS[String(selectedRisk.pm_inherentimpact ?? '')] ?? '—'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Residual Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: getScoreColor(selectedResidualScore) }}>
                        {selectedResidualScore > 0 ? selectedResidualScore : '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedResidualScore > 0 ? getScoreLabel(selectedResidualScore) : 'Unscored'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        P: {RESIDUAL_PROB_LABELS[String(selectedRisk.pm_residualprobability ?? '')] ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        I: {RESIDUAL_IMPACT_LABELS[String(selectedRisk.pm_residualimpact ?? '')] ?? '—'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Info grid */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Risk Details</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Reference</Typography>
                <Typography variant="body2">{selectedRisk.pm_riskreference ?? '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Risk Owner</Typography>
                <Typography variant="body2">{selectedRisk.pm_riskowner ?? '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Identified Date</Typography>
                <Typography variant="body2">{selectedRisk.pm_identifieddate ?? '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Target Close Date</Typography>
                <Typography variant="body2">{selectedRisk.pm_targetclosedate ?? '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Programme</Typography>
                <Typography variant="body2">{selectedRisk.pm_programme ?? '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Project</Typography>
                <Typography variant="body2">{selectedRisk.pm_projectcode ?? '—'}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Cause / Effect */}
            {selectedRisk.pm_riskcause && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Cause</Typography>
                <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskcause}</Typography>
              </Box>
            )}
            {selectedRisk.pm_riskeffect && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Effect</Typography>
                <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskeffect}</Typography>
              </Box>
            )}
            {selectedRisk.pm_riskdescription && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Description</Typography>
                <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskdescription}</Typography>
              </Box>
            )}
          </Box>
        )}

        {drawerTab === 1 && selectedRisk && (
          <Box>
            {/* Strategy comparison */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: `${getScoreColor(selectedRiskScore)}10` }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Before
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: getScoreColor(selectedRiskScore), mt: 0.5 }}>
                      {selectedRiskScore > 0 ? selectedRiskScore : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      P: {PROBABILITY_LABELS[String(selectedRisk.pm_inherentprobability ?? '')] ?? '—'} / I: {IMPACT_LABELS[String(selectedRisk.pm_inherentimpact ?? '')] ?? '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={6}>
                <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: `${getScoreColor(selectedResidualScore)}10` }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      After
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: getScoreColor(selectedResidualScore), mt: 0.5 }}>
                      {selectedResidualScore > 0 ? selectedResidualScore : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      P: {RESIDUAL_PROB_LABELS[String(selectedRisk.pm_residualprobability ?? '')] ?? '—'} / I: {RESIDUAL_IMPACT_LABELS[String(selectedRisk.pm_residualimpact ?? '')] ?? '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Response Strategy */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Response Strategy</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {STRATEGY_LABELS[String(selectedRisk.pm_responsestrategy ?? '')] ?? 'Not Defined'}
              </Typography>
            </Box>

            {selectedRisk.pm_escalated && (
              <Alert severity="error" icon={<FlagIcon />} sx={{ borderRadius: 2, mb: 2 }}>
                This risk has been escalated.
              </Alert>
            )}

            {/* Mitigation Actions */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon fontSize="small" />
              Mitigation Actions
              {mitigationActions.length > 0 && (
                <Chip label={mitigationActions.length} size="small" sx={{ fontWeight: 700, borderRadius: 8 }} />
              )}
            </Typography>

            {mitigationLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : mitigationActions.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {mitigationActions.map((action) => {
                  const actionStatus = String(action.pm_status ?? '')
                  return (
                    <Card key={action.pm_riskmitigationactionid} variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'primary.light' } }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {action.pm_actiontitle || 'Untitled Action'}
                          </Typography>
                          <Chip
                            label={actionStatus === '0' ? 'Complete' : actionStatus === '1' ? 'In Progress' : '—'}
                            color={actionStatus === '0' ? 'success' : actionStatus === '1' ? 'info' : 'default'}
                            size="small"
                            icon={actionStatus === '0' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <HourglassEmptyIcon sx={{ fontSize: 14 }} />}
                            sx={{ fontWeight: 600, borderRadius: 8 }}
                          />
                        </Box>
                        {action.pm_actiondescription && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
                            {action.pm_actiondescription}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {action.pm_actionowner && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.secondary">{action.pm_actionowner}</Typography>
                            </Box>
                          )}
                          {action.pm_duedate && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.secondary">
                                Due: {new Date(action.pm_duedate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}
                          {action.pm_effectiveness !== undefined && action.pm_effectiveness !== '' && (
                            <Chip
                              label={{
                                '0': 'High Effectiveness',
                                '1': 'Medium Effectiveness',
                                '2': 'Not Assessed',
                              }[String(action.pm_effectiveness)] ?? '—'}
                              size="small"
                              variant="outlined"
                              sx={{ borderRadius: 8, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )
                })}
              </Box>
            ) : (
              <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50', textAlign: 'center', mb: 3 }}>
                <AssignmentIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No mitigation actions recorded for this risk.
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Mitigation actions help track and manage risk reduction activities.
                </Typography>
              </Box>
            )}

            {/* Strategy summary alert */}
            {selectedRisk.pm_responsestrategy === undefined || String(selectedRisk.pm_responsestrategy) === '' ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No mitigation strategy has been defined for this risk. Edit the risk to add a response strategy and residual scores.
              </Alert>
            ) : (
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
                Risk has a defined response strategy ({STRATEGY_LABELS[String(selectedRisk.pm_responsestrategy)] ?? '—'}).
                {selectedResidualScore > 0 && selectedRiskScore > 0 && selectedResidualScore < selectedRiskScore
                  ? ` Expected score reduction: ${selectedRiskScore} → ${selectedResidualScore}`
                  : ''}
              </Alert>
            )}
          </Box>
        )}
      </DetailDrawer>

      {/* ── Create / Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingRisk ? 'Edit Risk' : 'Add New Risk'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            {/* Basic Information */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Basic Information
              </Typography>
            </Grid>
            <Grid size={8}>
              <TextField
                label="Risk Title"
                value={form.pm_risktitle ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_risktitle: e.target.value }))}
                fullWidth
                required
                size="small"
              />
            </Grid>
            <Grid size={4}>
              <TextField
                label="Reference"
                value={form.pm_riskreference ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_riskreference: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={4}>
              <TextField
                label="Category"
                value={form.pm_riskcategory ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_riskcategory: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={4}>
              <TextField
                label="RAG Status"
                value={form.pm_ragstatus ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_ragstatus: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(RAG_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={4}>
              <TextField
                label="Risk Owner"
                value={form.pm_riskowner ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_riskowner: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Identified Date"
                type="date"
                value={form.pm_identifieddate ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_identifieddate: e.target.value }))}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Target Close Date"
                type="date"
                value={form.pm_targetclosedate ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_targetclosedate: e.target.value }))}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Cause"
                value={form.pm_riskcause ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_riskcause: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Effect"
                value={form.pm_riskeffect ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_riskeffect: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                value={form.pm_riskdescription ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_riskdescription: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                size="small"
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.pm_escalated ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, pm_escalated: e.target.checked }))}
                  />
                }
                label="Escalated"
              />
            </Grid>

            {/* Probability & Impact Scoring */}
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Inherent Risk Scoring
              </Typography>
            </Grid>
            <Grid size={4}>
              <TextField
                label="Inherent Probability"
                value={form.pm_inherentprobability ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_inherentprobability: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(PROBABILITY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v} ({probNumeric(k)})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={4}>
              <TextField
                label="Inherent Impact"
                value={form.pm_inherentimpact ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_inherentimpact: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(IMPACT_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v} ({impactNumeric(k)})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 1 }}>
                <Chip
                  label={`Score: ${inherentScore} — ${getScoreLabel(inherentScore)}`}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 8,
                    px: 1,
                    bgcolor: inherentScore > 0 ? `${getScoreColor(inherentScore)}20` : 'transparent',
                    color: inherentScore > 0 ? getScoreColor(inherentScore) : 'text.secondary',
                  }}
                />
              </Box>
            </Grid>

            {/* Residual Scoring */}
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Residual (Post-Mitigation) Scoring
              </Typography>
            </Grid>
            <Grid size={4}>
              <TextField
                label="Residual Probability"
                value={form.pm_residualprobability ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_residualprobability: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(RESIDUAL_PROB_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={4}>
              <TextField
                label="Residual Impact"
                value={form.pm_residualimpact ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_residualimpact: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(RESIDUAL_IMPACT_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 1 }}>
                <Chip
                  label={`Score: ${residualScore} — ${getScoreLabel(residualScore)}`}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 8,
                    px: 1,
                    bgcolor: residualScore > 0 ? `${getScoreColor(residualScore)}20` : 'transparent',
                    color: residualScore > 0 ? getScoreColor(residualScore) : 'text.secondary',
                  }}
                />
              </Box>
            </Grid>
            <Grid size={4}>
              <TextField
                label="Response Strategy"
                value={form.pm_responsestrategy ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pm_responsestrategy: e.target.value }))}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">— Select —</MenuItem>
                {Object.entries(STRATEGY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Entity References */}
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Entity References (Optional)
              </Typography>
            </Grid>
            <Grid size={6}>
              <TextField
                label="Programme FK (GUID)"
                value={form._pm_programmefk_value ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, _pm_programmefk_value: e.target.value }))}
                fullWidth
                size="small"
                placeholder="Programme GUID"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Project FK (GUID)"
                value={form._pm_project_value ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, _pm_project_value: e.target.value }))}
                fullWidth
                size="small"
                placeholder="Project GUID"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.pm_risktitle?.trim()}>
            {saving ? <CircularProgress size={20} /> : editingRisk ? 'Update Risk' : 'Create Risk'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Risk</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>{deleteTarget?.pm_risktitle}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
