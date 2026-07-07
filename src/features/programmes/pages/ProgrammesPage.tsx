import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  alpha,
} from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AddIcon from '@mui/icons-material/Add'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import DescriptionIcon from '@mui/icons-material/Description'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import FolderIcon from '@mui/icons-material/Folder'

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'

import { fetchProgrammeDetails, fetchPortfolioHierarchy, deleteProgramme, fetchEscalatedRisksByProgramme } from '@/services'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  StatusChip,
  StatusTag,
  PageHeader,
  KpiCardRow,
  HealthSplitBar,
  VarianceDisplay,
  SearchFilterBar,
  TabPanel,
  TableFooter,
  TableShell,
  ExportButton,
  Breadcrumbs,
  ActionIcon,
  EntityDocumentsTab,
  DataverseTable,
  ConfirmDialog,
  MasterScheduleTab,
  StatusProgressBar,
} from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'
import { fontSizes } from '@/styles'
import type { ProgrammeModel, ProjectModel, RiskModel, IssueModel } from '@/types/dataverse'
import type { KpiCardItem, FilterOption } from '@/components/common'

// Sub-components
import { ProgrammeFormDialog } from '../components/ProgrammeFormDialog'
import { navigateToProject, navigateToRisk, navigateToIssue } from '@/utils/navigation'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { normalizeLookupId } from '@/services'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// ── Export Columns ────────────────────────────────────────────────────────────────
const programmeExportColumns: ExportColumn[] = [
  { key: 'pm_programmename', label: 'Programme Name' },
  { key: 'pm_programmemanagername', label: 'Manager' },
  { key: 'pm_sponsorname', label: 'Sponsor' },
  { key: 'pm_portfolioname', label: 'Portfolio' },
  { key: 'pm_businessunit', label: 'Business Unit' },
  { key: 'pm_programmephase', label: 'Phase', format: (v) => ['Delivery', 'Planning', 'Initiation'][Number(v)] ?? '' },
  { key: 'pm_ragstatus', label: 'RAG', format: (v) => ['Medium', 'Low', 'High'][Number(v)] ?? '' },
  { key: 'pm_budgeteur', label: 'Budget', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_actualspendeur', label: 'Actual Spend', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_startdate', label: 'Start Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'pm_enddate', label: 'End Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
]

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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProgrammesPage() {
  const { allowed: canCreate } = useAuthorization('PROGRAMMES', 'create')
  const { allowed: canEdit } = useAuthorization('PROGRAMMES', 'update')
  const { allowed: canDelete } = useAuthorization('PROGRAMMES', 'delete')
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ── Data State ─────────────────────────────────────────────────────────────
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [portfolios, setPortfolios] = useState<{ id: string; name: string; budget: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── List View State ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [ragFilter, setRagFilter] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  type SortField = 'name' | 'phase' | 'rag' | 'sponsor' | 'manager' | 'portfolio' | 'budget' | 'actual' | 'variance' | 'bizunit'
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'name', dir: 'asc' })

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

  // ── Create/Edit Modal State ────────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingProgramme, setEditingProgramme] = useState<ProgrammeModel | null>(null)

  // ── Delete State ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ProgrammeModel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const hierarchy = await fetchPortfolioHierarchy()
      setProgrammes(hierarchy.programmes)
      setPortfolios(
        hierarchy.portfolios
          .filter((p) => p.pm_portfolioid && p.pm_portfolioname)
          .map((p) => ({
            id: p.pm_portfolioid!,
            name: p.pm_portfolioname!,
            budget: p.pm_approvedbudgeteur ?? 0,
            startDate: p.pm_startdate ?? '',
            endDate: p.pm_enddate ?? '',
          }))
      )
    } catch {
      setError('Unable to load programme data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  // Auto-navigate to preselected programme from cross-linking
  useEffect(() => {
    if (!loading && programmes.length > 0) {
      const preselectedId = sessionStorage.getItem('preselectProgrammeId')
      if (preselectedId) {
        sessionStorage.removeItem('preselectProgrammeId')
        const programme = programmes.find(p => normalizeLookupId(p.pm_programmeid) === normalizeLookupId(preselectedId))
        if (programme?.pm_programmeid) openDetail(programme.pm_programmeid)
      }
    }
  }, [loading, programmes, openDetail])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSuccess = (freshProgrammes: ProgrammeModel[]) => {
    setProgrammes(freshProgrammes)
    if (selectedProgrammeId) {
      openDetail(selectedProgrammeId)
    }
  }

  const openCreateForm = () => {
    setEditingProgramme(null)
    setShowFormModal(true)
  }

  const openEditForm = (programme: ProgrammeModel) => {
    setEditingProgramme(programme)
    setShowFormModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_programmeid) return
    setDeleteLoading(true)
    setError(null)
    try {
      await deleteProgramme(deleteTarget.pm_programmeid)
      setProgrammes(prev => prev.filter(p => p.pm_programmeid !== deleteTarget.pm_programmeid))
      setSuccessMsg('Programme deleted.')
      if (selectedProgrammeId === deleteTarget.pm_programmeid) {
        closeDetail()
      }
      setDeleteTarget(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete programme.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
    }))
  }

  const hasActiveFilters = !!(searchQuery || portfolioFilter !== 'all' || phaseFilter || ragFilter || minBudget || maxBudget)

  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    setPortfolioFilter('all')
    setPhaseFilter('')
    setRagFilter('')
    setMinBudget('')
    setMaxBudget('')
    setPage(0)
  }, [])

  // ── Derived Data ──────────────────────────────────────────────────────────
  const filteredProgrammes = useMemo(() => {
    let list = programmes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.pm_programmename?.toLowerCase().includes(q) ||
        p.pm_programmemanagername?.toLowerCase().includes(q) ||
        p.pm_sponsorname?.toLowerCase().includes(q) ||
        p.pm_portfolioname?.toLowerCase().includes(q)
      )
    }
    if (portfolioFilter !== 'all') {
      list = list.filter(p => p._pm_portfolio_value === portfolioFilter)
    }
    if (phaseFilter) {
      list = list.filter(p => String(p.pm_programmephase ?? '') === phaseFilter)
    }
    if (ragFilter) {
      list = list.filter(p => String(p.pm_ragstatus ?? '') === ragFilter)
    }
    if (minBudget) {
      const min = parseFloat(minBudget)
      if (!isNaN(min)) list = list.filter(p => (p.pm_budgeteur ?? 0) >= min)
    }
    if (maxBudget) {
      const max = parseFloat(maxBudget)
      if (!isNaN(max)) list = list.filter(p => (p.pm_budgeteur ?? 0) <= max)
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name': cmp = (a.pm_programmename ?? '').localeCompare(b.pm_programmename ?? ''); break
        case 'phase': cmp = Number(a.pm_programmephase ?? 0) - Number(b.pm_programmephase ?? 0); break
        case 'rag': cmp = Number(a.pm_ragstatus ?? 0) - Number(b.pm_ragstatus ?? 0); break
        case 'manager': cmp = (a.pm_programmemanagername ?? '').localeCompare(b.pm_programmemanagername ?? ''); break
        case 'portfolio': cmp = (a.pm_portfolioname ?? '').localeCompare(b.pm_portfolioname ?? ''); break
        case 'budget': cmp = (a.pm_budgeteur ?? 0) - (b.pm_budgeteur ?? 0); break
        case 'actual': cmp = (a.pm_actualspendeur ?? 0) - (b.pm_actualspendeur ?? 0); break
        case 'variance': cmp = ((a.pm_budgeteur ?? 0) - (a.pm_actualspendeur ?? 0)) - ((b.pm_budgeteur ?? 0) - (b.pm_actualspendeur ?? 0)); break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [programmes, searchQuery, portfolioFilter, phaseFilter, ragFilter, minBudget, maxBudget, sort])

  const paginatedProgrammes = useMemo(() =>
    filteredProgrammes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    , [filteredProgrammes, page, rowsPerPage])

  const kpiData = useMemo(() => {
    const totalBudget = programmes.reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)
    const totalActual = programmes.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)
    let green = 0, amber = 0, red = 0
    for (const p of programmes) {
      const rag = String(p.pm_ragstatus)
      if (rag === '1') green++
      else if (rag === '0') amber++
      else if (rag === '2') red++
    }
    return { totalBudget, totalActual, green, amber, red, count: programmes.length }
  }, [programmes])

  const kpiItems: KpiCardItem[] = [
    { label: 'Total Programmes', value: kpiData.count, icon: <AccountTreeIcon />, color: 'primary.main' },
    { label: 'Low Risk', value: kpiData.green, icon: <CheckCircleIcon />, color: 'success.main' },
    { label: 'Medium Risk', value: kpiData.amber, icon: <WarningAmberIcon />, color: 'warning.main' },
    { label: 'High Risk', value: kpiData.red, icon: <ErrorIcon />, color: 'error.main' },
    { label: 'Total Budget', value: currencyFormatter.format(kpiData.totalBudget), icon: <AccountBalanceWalletIcon />, color: 'primary.main' },
    { label: 'Total Actual', value: currencyFormatter.format(kpiData.totalActual), icon: <TrendingDownIcon />, color: 'warning.main' },
  ]

  const detailKpiItems = useMemo(() => {
    if (!detailData) return []
    const prog = detailData.programme
    const detailProjects = detailData.projects
    const detailRisks = detailData.risks
    const detailIssues = detailData.issues

    const escalatedRisks = detailRisks.filter((r) => r.pm_escalated)
    const escalatedIssues = detailIssues.filter((i) => i.pm_escalationstatus)

    let specificGreen = 0, specificAmber = 0, specificRed = 0
    for (const p of detailProjects) {
      if (String(p.pm_ragstatus) === '1') specificGreen++
      else if (String(p.pm_ragstatus) === '0') specificAmber++
      else if (String(p.pm_ragstatus) === '2') specificRed++
    }

    return [
      {
        label: "Projects",
        value: detailProjects.length,
        subtitle: "In this programme",
        icon: <AccountTreeIcon />,
        color: theme.palette.primary.main
      },
      {
        label: "Escalated Risks",
        value: escalatedRisks.length,
        subtitle: "High priority risks",
        icon: <WarningAmberIcon />,
        color: escalatedRisks.length > 0 ? theme.palette.error.main : theme.palette.success.main
      },
      {
        label: "Escalated Issues",
        value: escalatedIssues.length,
        subtitle: "Requires attention",
        icon: <ErrorIcon />,
        color: escalatedIssues.length > 0 ? theme.palette.error.main : theme.palette.success.main
      },
      {
        label: "On Track Projects",
        value: specificGreen,
        subtitle: `${specificAmber} Amber, ${specificRed} Red`,
        icon: <CheckCircleIcon />,
        color: theme.palette.success.main
      },
      {
        label: "Approved Budget",
        value: currencyFormatter.format(prog?.pm_budgeteur ?? 0),
        subtitle: "Total approved budget",
        icon: <AccountBalanceWalletIcon />,
        color: theme.palette.primary.main
      },
      {
        label: "Actual Spend",
        value: currencyFormatter.format(prog?.pm_actualspendeur ?? 0),
        subtitle: (prog?.pm_budgeteur ?? 0) > 0
          ? `${(((prog?.pm_actualspendeur ?? 0) / (prog?.pm_budgeteur ?? 0)) * 100).toFixed(1)}% consumed`
          : 'No budget data',
        icon: <TrendingDownIcon />,
        color: theme.palette.warning.main
      }
    ]
  }, [detailData, theme])

  // ── Render ───────────────────────────────────────────────────────────────────
  if (selectedProgrammeId && detailData) {
    const prog = detailData.programme
    const detailProjects = detailData.projects
    const detailRisks = detailData.risks
    const detailIssues = detailData.issues

    const escalatedRisks = detailRisks.filter((r) => r.pm_escalated)
    const escalatedIssues = detailIssues.filter((i) => i.pm_escalationstatus)

    const severityDistribution = {
      high: detailRisks.filter((r) => String(r.pm_ragstatus ?? '') === '2').length,
      medium: detailRisks.filter((r) => String(r.pm_ragstatus ?? '') === '0').length,
      low: detailRisks.filter((r) => String(r.pm_ragstatus ?? '') === '1').length,
    }

    let specificGreen = 0, specificAmber = 0, specificRed = 0
    for (const p of detailProjects) {
      if (String(p.pm_ragstatus) === '1') specificGreen++
      else if (String(p.pm_ragstatus) === '0') specificAmber++
      else if (String(p.pm_ragstatus) === '2') specificRed++
    }

    const projectColumns = [
      {
        key: 'pm_projectname',
        label: 'Project Name',
        format: (val: any, item: ProjectModel) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => item.pm_projectid && navigateToProject(item.pm_projectid)}
          >
            {val}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Typography>
        )
      },
      {
        key: 'pm_projectphase',
        label: 'Phase',
        format: (val: any) => <StatusChip status={val} type="phase" size="small" />
      },
      {
        key: 'pm_ragstatus',
        label: 'RAG',
        format: (val: any) => <StatusChip status={val} type="rag" size="small" />
      },
      {
        key: 'pm_percentcomplete',
        label: '% Complete',
        align: 'right' as const,
        format: (val: any) => `${val ?? 0}%`
      },
      {
        key: 'pm_approvedbudgeteur',
        label: 'Budget',
        align: 'right' as const,
        format: (val: any) => currencyFormatter.format(val ?? 0)
      }
    ]

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Breadcrumbs
          items={[{ label: 'Programmes', path: 'list' }, { label: prog?.pm_programmename ?? 'Detail' }]}
          onNavigate={() => closeDetail()}
        />

        <PageHeader
          title={prog?.pm_programmename ?? 'Programme Detail'}
          subtitle={prog?.pm_programmemanagername ? `Manager: ${prog.pm_programmemanagername}` : undefined}
          actionElement={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {canEdit && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => prog && openEditForm(prog)}
                  sx={{ borderRadius: 1.5 }}
                >
                  Edit Programme
                </Button>
              )}
              {canDelete && prog && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteTarget(prog)}
                  sx={{ borderRadius: 1.5 }}
                >
                  Delete Programme
                </Button>
              )}
            </Box>
          }
        />

        <Tabs
          value={detailTab}
          onChange={(_, v) => setDetailTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mt: -2, mb: 1 }}
        >
          <Tab label="Overview & Projects" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Master Schedule" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {detailTab === 0 && (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Overview - Full Width */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3, borderRadius: '24px', border: 'none', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Overview
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Phase</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>
                            {prog?.pm_programmephase !== undefined && prog?.pm_programmephase !== null
                              ? ({ 0: 'Delivery', 1: 'Planning', 2: 'Initiation', 3: 'Under Approval' }[prog.pm_programmephase as number] ?? '—')
                              : '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Manager</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{prog?.pm_programmemanagername || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Sponsor</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{prog?.pm_sponsorname || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Business Unit</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{prog?.pm_businessunit || '—'}</Typography>
                        </Box>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', mb: 0.5 }}>Objectives</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.825rem' }}>{prog?.pm_programmedescription || 'No description provided.'}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Box sx={{ p: 2, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        OVERALL HEALTH
                      </Typography>
                      {detailProjects.length > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 120 }}>
                          <Box sx={{ width: 120, height: 120, position: 'relative', flexShrink: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Low Risk', value: specificGreen, color: '#22c55e' },
                                    { name: 'Medium Risk', value: specificAmber, color: '#f59e0b' },
                                    { name: 'High Risk', value: specificRed, color: '#ef4444' },
                                  ].filter(d => d.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={30}
                                  outerRadius={45}
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {[
                                    { name: 'Low Risk', value: specificGreen, color: '#22c55e' },
                                    { name: 'Medium Risk', value: specificAmber, color: '#f59e0b' },
                                    { name: 'High Risk', value: specificRed, color: '#ef4444' },
                                  ].filter(d => d.value > 0).map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip formatter={(value) => [value, 'Projects']} />
                              </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1 }}>
                                {detailProjects.length}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} /> Low Risk
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>{specificGreen}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} /> Medium Risk
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>{specificAmber}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} /> High Risk
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>{specificRed}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                          No project data to analyze health
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        {detailProjects.length} entities tracked
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Left Column: Tables and Risks */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Projects Table */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountTreeIcon sx={{ color: 'success.main', fontSize: 18 }} /> Linked Projects
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', '& .MuiPaper-root': { boxShadow: 'none', border: 'none', bgcolor: 'transparent', backgroundImage: 'none', borderRadius: 0, mb: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' } }}>
                  <DataverseTable
                    showExport={false}
                    minHeight={"auto"}
                    data={detailProjects}
                    columns={projectColumns}
                    loading={detailLoading}
                    emptyIcon={<AccountTreeIcon />}
                    emptyTitle="No projects linked to this programme."
                    searchPlaceholder="Search projects..."
                    searchFields={['pm_projectname', 'pm_projectcode']}
                  />
                </Box>
              </Paper>

              {/* Documents */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <FolderIcon sx={{ fontSize: 18, color: 'success.main' }} /> Documents
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <EntityDocumentsTab
                    entityId={selectedProgrammeId}
                    moduleName={MODULE_NAMES.PROGRAMMES.value}
                    canEdit={canEdit}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Right Column: Cards */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Financials Card */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'success.main' }} /> Financials
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Budget</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{currencyFormatter.format(prog?.pm_budgeteur ?? 0)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{currencyFormatter.format(prog?.pm_actualspendeur ?? 0)}</Typography>
                    </Box>
                  </Box>

                  <Box>
                    <StatusProgressBar value={prog?.pm_actualspendeur ?? 0} total={prog?.pm_budgeteur ?? 0} label="Budget Utilization" />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                      {prog?.pm_budgeteur && prog?.pm_budgeteur > 0 ? `${((prog?.pm_actualspendeur ?? 0) / prog?.pm_budgeteur * 100).toFixed(1)}% consumed` : ''}
                    </Typography>
                  </Box>

                  <Box sx={{ height: 135, mt: -1.5, mb: -1.5 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Approved', amount: prog?.pm_budgeteur ?? 0, color: theme.palette.primary.main },
                          { name: 'Spend', amount: prog?.pm_actualspendeur ?? 0, color: theme.palette.warning.main },
                          { name: 'Variance', amount: Math.max(0, (prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0)), color: theme.palette.success.main }
                        ]}
                        margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke={theme.palette.divider} />
                        <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke={theme.palette.divider} tickFormatter={(v) => `€${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v}`} />
                        <RechartsTooltip formatter={(value) => [`€${new Intl.NumberFormat('en-GB').format(Number(value))}`]} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={20}>
                          {[
                            { color: theme.palette.primary.main },
                            { color: theme.palette.warning.main },
                            { color: theme.palette.success.main }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Variance</Typography>
                    <VarianceDisplay budget={prog?.pm_budgeteur} consumed={prog?.pm_actualspendeur} />
                  </Box>
                </Box>
              </Paper>

              {/* Escalated Risks & Issues */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <GppMaybeIcon sx={{ fontSize: 18, color: 'success.main' }} /> Escalated Risks & Issues
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', display: 'block', textTransform: 'uppercase' }}>
                      Severity Distribution
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Paper sx={{ p: 1.5, borderRadius: '16px', border: 'none', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(211,47,47,0.1)' : '#fee2e2', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>High</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>{severityDistribution.high}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Paper sx={{ p: 1.5, borderRadius: '16px', border: 'none', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.1)' : '#fef3c7', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>Medium</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{severityDistribution.medium}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Paper sx={{ p: 1.5, borderRadius: '16px', border: 'none', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46,125,50,0.1)' : '#dcfce7', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>Low</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{severityDistribution.low}</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'error.main' }}>
                        Risks ({escalatedRisks.length})
                      </Typography>
                      {escalatedRisks.length > 0 ? (
                        escalatedRisks.map(r => (
                          <Paper
                            key={r.pm_riskid}
                            sx={{ p: 1.5, mb: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'action.hover', borderColor: 'error.main' } }}
                            onClick={() => r.pm_riskid && navigateToRisk(r.pm_riskid)}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {r.pm_risktitle} <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Typography>
                          </Paper>
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">No escalated risks.</Typography>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'warning.main' }}>
                        Issues ({escalatedIssues.length})
                      </Typography>
                      {escalatedIssues.length > 0 ? (
                        escalatedIssues.map(i => (
                          <Paper
                            key={i.pm_issueid}
                            sx={{ p: 1.5, mb: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'action.hover', borderColor: 'warning.main' } }}
                            onClick={() => i.pm_issueid && navigateToIssue(i.pm_issueid)}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {i.pm_issuetitle} <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Typography>
                          </Paper>
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">No escalated issues.</Typography>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              {/* Approval Tasks */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <TaskAltIcon sx={{ fontSize: 18, color: 'success.main' }} /> Approval Tasks
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <EntityApprovalTasks
                    entityId={selectedProgrammeId}
                    moduleName={MODULE_NAMES.PROGRAMMES.value}
                    entityLabel="Programme"
                    tabValue={0}
                    index={0}
                  />
                </Box>
              </Paper>


            </Grid>
          </Grid>
        )}

        {detailTab === 1 && (
          <MasterScheduleTab projects={detailProjects} />
        )}

        <ProgrammeFormDialog
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleSuccess}
          onError={(msg) => setError(msg)}
          initialData={editingProgramme}
          portfolios={portfolios}
          allProgrammes={programmes}
        />
      </Box>
    )

  }

  return (
    <Box>
      <PageHeader
        title="Programmes"
        subtitle="Searchable directory of all programmes with aggregated health and financials."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>New Programme</Button>
            )}
            <ExportButton filename="programmes" columns={programmeExportColumns} data={filteredProgrammes} />
          </Box>
        }
      />
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!loading && (
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {kpiItems.map((kpi, idx) => {
            const themeColor = kpi.color === 'primary.main' ? theme.palette.primary.main
              : kpi.color === 'success.main' ? theme.palette.success.main
                : kpi.color === 'warning.main' ? theme.palette.warning.main
                  : kpi.color === 'error.main' ? theme.palette.error.main
                    : theme.palette.primary.main;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={idx}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    height: '100%',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: isDark ? 'background.paper' : '#fff',
                    border: `1px solid ${alpha(themeColor, 0.15)}`,
                    boxShadow: isDark
                      ? `0 8px 30px ${alpha(themeColor, 0.05)}`
                      : `0 8px 30px ${alpha(themeColor, 0.03)}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${alpha(themeColor, 0.12)}`,
                      borderColor: themeColor,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '0.68rem',
                      }}
                    >
                      {kpi.label}
                    </Typography>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: alpha(themeColor, 0.1),
                        color: themeColor,
                        border: `1px solid ${alpha(themeColor, 0.2)}`,
                        '& .MuiSvgIcon-root': { fontSize: 18 }
                      }}
                    >
                      {kpi.icon}
                    </Avatar>
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      color: isDark ? '#fff' : '#0f172a',
                      fontFamily: '"Outfit", sans-serif',
                      mb: 0.5,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}
                  >
                    {kpi.value}
                  </Typography>

                  {kpi.subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>
                      {kpi.subtitle}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '4px',
                      background: `linear-gradient(90deg, ${themeColor}, ${alpha(themeColor, 0.3)})`,
                    }}
                  />
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      )}

      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={(v) => { setSearchQuery(v); setPage(0) }}
          searchPlaceholder="Search by name, manager, sponsor..."
          filterValue={portfolioFilter}
          onFilterChange={(v) => { setPortfolioFilter(v); setPage(0) }}
          filterLabel="Portfolio"
          filterOptions={[{ value: 'all', label: 'All Portfolios' }, ...portfolios.map(p => ({ value: p.id, label: p.name }))]}
          secondaryFilterValue={phaseFilter}
          onSecondaryFilterChange={(v) => { setPhaseFilter(v); setPage(0) }}
          secondaryFilterLabel="Phase"
          secondaryFilterOptions={[
            { value: '', label: 'All Phases' },
            { value: '0', label: 'Delivery' },
            { value: '1', label: 'Planning' },
            { value: '2', label: 'Initiation' },
          ]}
          extraFilters={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="programme-rag-filter-label">RAG</InputLabel>
                <Select
                  id="programme-rag-filter-select"
                  labelId="programme-rag-filter-label"
                  value={ragFilter}
                  label="RAG"
                  onChange={(e) => { setRagFilter(e.target.value); setPage(0) }}
                  sx={{ borderRadius: 1.15, fontSize: fontSizes.base }}
                >
                  <MenuItem value="">All RAG</MenuItem>
                  <MenuItem value="1">Low</MenuItem>
                  <MenuItem value="0">Medium</MenuItem>
                  <MenuItem value="2">High</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Min budget"
                value={minBudget}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    setMinBudget(val)
                    setPage(0)
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                    sx: { borderRadius: 1.15, fontSize: fontSizes.base },
                  },
                }}
                sx={{ maxWidth: 140 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ userSelect: 'none' }}>—</Typography>
              <TextField
                size="small"
                placeholder="Max budget"
                value={maxBudget}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    setMaxBudget(val)
                    setPage(0)
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                    sx: { borderRadius: 1.15, fontSize: fontSizes.base },
                  },
                }}
                sx={{ maxWidth: 140 }}
              />
            </Box>
          }
          showClear={hasActiveFilters}
          onClear={handleClearAll}
        />
        <TableShell loading={loading} empty={filteredProgrammes.length === 0} emptyIcon={<AccountTreeIcon />}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 480px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'name'}
                      direction={sort.field === 'name' ? sort.dir : 'asc'}
                      onClick={() => handleSort('name')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'phase'}
                      direction={sort.field === 'phase' ? sort.dir : 'asc'}
                      onClick={() => handleSort('phase')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Phase
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'rag'}
                      direction={sort.field === 'rag' ? sort.dir : 'asc'}
                      onClick={() => handleSort('rag')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      RAG
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'manager'}
                      direction={sort.field === 'manager' ? sort.dir : 'asc'}
                      onClick={() => handleSort('manager')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Manager
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'portfolio'}
                      direction={sort.field === 'portfolio' ? sort.dir : 'asc'}
                      onClick={() => handleSort('portfolio')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Portfolio
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'budget'}
                      direction={sort.field === 'budget' ? sort.dir : 'asc'}
                      onClick={() => handleSort('budget')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Budget
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'actual'}
                      direction={sort.field === 'actual' ? sort.dir : 'asc'}
                      onClick={() => handleSort('actual')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Actual
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Actions</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProgrammes.map((p, idx) => (
                  <TableRow
                    key={p.pm_programmeid}
                    hover
                    onClick={() => p.pm_programmeid && openDetail(p.pm_programmeid)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                      '&:hover': { bgcolor: 'action.selected' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.pm_programmename}</Typography></TableCell>
                    <TableCell><StatusChip status={p.pm_programmephase} type="prog_phase" size="small" /></TableCell>
                    <TableCell><StatusChip status={p.pm_ragstatus} type="rag" size="small" /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{p.pm_programmemanagername || '—'}</Typography></TableCell>
                    <TableCell><StatusTag label={p.pm_portfolioname || '—'} size="small" variant="outlined" color="primary" /></TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{currencyFormatter.format(p.pm_budgeteur ?? 0)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{currencyFormatter.format(p.pm_actualspendeur ?? 0)}</Typography></TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditForm(p)} sx={{ color: 'primary.main' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canDelete && (
                          <Tooltip title="Delete Programme">
                            <IconButton size="small" onClick={() => setDeleteTarget(p)} sx={{ color: 'error.main' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableShell>
        {!loading && filteredProgrammes.length > 0 && (
          <TableFooter
            filteredCount={filteredProgrammes.length}
            totalCount={programmes.length}
            itemLabel="programme"
            totals={[
              { label: 'Total budget', value: currencyFormatter.format(filteredProgrammes.reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)) },
              { label: 'Total actual', value: currencyFormatter.format(filteredProgrammes.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)) },
            ]}
          />
        )}
        <TablePagination component="div" count={filteredProgrammes.length} page={page} onPageChange={(_, v) => setPage(v)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))} />
      </Paper>

      <ProgrammeFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
        initialData={editingProgramme}
        portfolios={portfolios}
        allProgrammes={programmes}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Programme"
        message={`Are you sure you want to delete ${deleteTarget?.pm_programmename || 'this programme'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </Box>
  )
}
