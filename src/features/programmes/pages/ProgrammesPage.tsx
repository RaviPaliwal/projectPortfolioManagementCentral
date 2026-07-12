import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from 'react'
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
  Collapse,
  LinearProgress,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import SearchIcon from '@mui/icons-material/Search'
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
  WorkflowMilestone,
} from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'
import { fontSizes } from '@/styles'
import type { ProgrammeModel, ProjectModel, RiskModel, IssueModel } from '@/types/dataverse'
import type { KpiCardItem, FilterOption } from '@/components/common'

import PsychologyIcon from '@mui/icons-material/Psychology'
import { ProgrammeFormDialog, ProgrammeAICreateDialog } from '../components'
import { navigateToProject, navigateToRisk, navigateToIssue } from '@/utils/navigation'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { normalizeLookupId } from '@/services'
import { EntityFundingSourcesTab } from '@/features/fundingsources/components'
import { fetchFundingSourcesByRegarding } from '@/services'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// ── Programme Hierarchy Table ────────────────────────────────────────────────
interface ProgrammeHierarchyTableProps {
  projects: ProjectModel[]
  searchTerm: string
  loading: boolean
}

function ProgrammeHierarchyTable({ projects, searchTerm, loading }: ProgrammeHierarchyTableProps) {
  const theme = useTheme()

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects
    const term = searchTerm.toLowerCase()
    return projects.filter((p) => p.pm_projectname?.toLowerCase().includes(term))
  }, [projects, searchTerm])

  return (
    <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '40%' }}>
              Project Name
            </TableCell>
            <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%' }}>
              Phase
            </TableCell>
            <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%' }}>
              RAG
            </TableCell>
            <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%', textAlign: 'center' }}>
              % Complete
            </TableCell>
            <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%', textAlign: 'right' }}>
              Budget
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProjects.map((proj) => (
            <TableRow
              key={proj.pm_projectid}
              hover
              sx={{
                '& td': { borderBottom: '1px solid', borderColor: 'divider' },
              }}
            >
              <TableCell sx={{ pl: 3, py: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTreeIcon sx={{ color: theme.palette.primary.main, fontSize: 16 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'primary.main',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={() => proj.pm_projectid && navigateToProject(proj.pm_projectid)}
                  >
                    {proj.pm_projectname}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <StatusChip status={proj.pm_projectphase} type="phase" size="small" />
              </TableCell>
              <TableCell>
                <StatusChip status={proj.pm_ragstatus} type="rag" size="small" />
              </TableCell>
              <TableCell sx={{ textAlign: 'center' }}>
                {proj.pm_percentcomplete !== undefined ? `${proj.pm_percentcomplete}%` : '0%'}
              </TableCell>
              <TableCell sx={{ textAlign: 'right' }}>
                {currencyFormatter.format(proj.pm_approvedbudget ?? 0)}
              </TableCell>
            </TableRow>
          ))}

          {filteredProjects.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                No projects linked to this programme.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

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

  type SortField = 'name' | 'phase' | 'rag' | 'sponsor' | 'manager' | 'portfolio' | 'budget' | 'actual' | 'variance' | 'bizunit' | 'createdon'
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'createdon', dir: 'desc' })

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
  const [programmeDocCount, setProgrammeDocCount] = useState(0)
  const [projectsSearch, setProjectsSearch] = useState('')
  const [todayHover, setTodayHover] = useState(false)
  const documentsTabRef = useRef<{ triggerUpload: () => void } | null>(null)
  const fundingTabRef = useRef<{ triggerCreate: () => void } | null>(null)
  const { allowed: canReadFunding } = useAuthorization('FUNDING_SOURCES', 'read')
  const [unallocatedReserve, setUnallocatedReserve] = useState(0)

  const loadUnallocatedReserve = useCallback(async () => {
    if (!selectedProgrammeId) {
      setUnallocatedReserve(0)
      return
    }
    try {
      const list = await fetchFundingSourcesByRegarding(selectedProgrammeId, 'pm_programmes')
      const total = list.reduce((sum, s) => sum + (s.pm_totalamounteur ?? 0), 0)
      const budget = detailData?.programme?.pm_budgeteur ?? 0
      setUnallocatedReserve(total > budget ? total - budget : 0)
    } catch {
      setUnallocatedReserve(0)
    }
  }, [selectedProgrammeId, detailData?.programme])

  useEffect(() => {
    loadUnallocatedReserve()
  }, [loadUnallocatedReserve])

  // ── Create/Edit Modal State ────────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
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
        case 'createdon': cmp = new Date(a.createdon ?? 0).getTime() - new Date(b.createdon ?? 0).getTime(); break
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
      },
      {
        label: "Unallocated Reserve",
        value: currencyFormatter.format(unallocatedReserve),
        subtitle: "Excess funding reserve",
        icon: <AccountBalanceWalletIcon />,
        color: theme.palette.info.main
      }
    ]
  }, [detailData, theme, unallocatedReserve])

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
          <Tab label="Documents" sx={{ textTransform: 'none', fontWeight: 600 }} />
          {canReadFunding && <Tab label="Funding Sources" sx={{ textTransform: 'none', fontWeight: 600 }} />}
        </Tabs>

        {detailTab === 0 && (
          <>
            <WorkflowMilestone
              entityId={selectedProgrammeId ?? ''}
              moduleName={MODULE_NAMES.PROGRAMMES.value}
            />
            <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Overview - 6/12 Width */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'success.main' }} /> Overview
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2.5 }}>
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

                    {/* Visual Milestone Timeline */}
                    <Box sx={{ gridColumn: 'span 4', mt: 1.5 }}>
                      {(() => {
                        const start = prog?.pm_startdate ? new Date(prog.pm_startdate) : null;
                        const end = prog?.pm_enddate ? new Date(prog.pm_enddate) : null;
                        if (!start || !end) {
                          return (
                            <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
                              Start and End dates are required for timeline pathway
                            </Typography>
                          );
                        }
                        const today = new Date();
                        const totalDuration = end.getTime() - start.getTime();
                        if (totalDuration <= 0) return null;
                        const elapsed = today.getTime() - start.getTime();
                        const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                        
                        const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
                        const elapsedDays = Math.max(0, Math.ceil(elapsed / (1000 * 60 * 60 * 24)));
                        const remainingDays = Math.max(0, totalDays - elapsedDays);
                        
                        const startStr = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        const endStr = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        const todayStr = today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        const isEnded = today > end;
                        const isNotStarted = today < start;
                        
                        return (
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                Timeline Pathway
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', px: 1.25, py: 0.5, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                                {isEnded ? 'Completed' : isNotStarted ? 'Not Started' : `${remainingDays} days remaining`}
                              </Typography>
                            </Box>

                            {/* Pathway Line container */}
                            <Box sx={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', px: 1.5, mb: 1 }}>
                              {/* Track Line */}
                              <Box sx={{ position: 'absolute', left: 16, right: 16, height: 6, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
                                {/* Filled Progress Line */}
                                <Box sx={{ 
                                  width: `${percent}%`, 
                                  height: '100%', 
                                  borderRadius: 3, 
                                  background: (theme) => `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: (theme) => `0 0 8px ${alpha(theme.palette.primary.main, 0.4)}`
                                }} />
                              </Box>

                              {/* Start Dot */}
                              <Box sx={{ position: 'absolute', left: 16, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'success.main', border: '3px solid', borderColor: 'background.paper', boxShadow: (theme) => theme.shadows[1] }} />
                              </Box>

                              {/* Current Node Pin */}
                              {!isEnded && !isNotStarted && (() => {
                                const visualPercent = Math.min(94, Math.max(6, percent));
                                return (
                                  <Box sx={{ 
                                    position: 'absolute', 
                                    left: `calc(16px + ${visualPercent}% - ${visualPercent * 0.32}px)`,
                                    transform: 'translateX(-50%)', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    zIndex: 3
                                  }}>
                                    {/* Pulsing Outer Ring */}
                                    <Box sx={{
                                      position: 'absolute',
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      border: '2px solid',
                                      borderColor: 'primary.main',
                                      animation: 'pulse 2s infinite ease-in-out',
                                      '@keyframes pulse': {
                                        '0%': { transform: 'scale(0.6)', opacity: 0.8 },
                                        '100%': { transform: 'scale(1.3)', opacity: 0 }
                                      }
                                    }} />
                                    {/* Center Thumb */}
                                    <Tooltip 
                                      title={`Today: ${todayStr} (${percent.toFixed(1)}% elapsed)`} 
                                      arrow
                                      open={todayHover ? true : undefined}
                                    >
                                      <Box 
                                        onMouseEnter={() => setTodayHover(true)}
                                        onMouseLeave={() => setTodayHover(false)}
                                        sx={{ 
                                          width: 14, 
                                          height: 14, 
                                          borderRadius: '50%', 
                                          bgcolor: 'primary.main', 
                                          border: '3px solid', 
                                          borderColor: 'background.paper', 
                                          boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                                          transition: 'transform 0.15s ease',
                                          cursor: 'pointer',
                                          transform: todayHover ? 'scale(1.2)' : 'scale(1)',
                                          '&:hover': {
                                            transform: 'scale(1.2)'
                                          }
                                        }} 
                                      />
                                    </Tooltip>
                                  </Box>
                                );
                              })()}

                              {/* End Dot */}
                              <Box sx={{ position: 'absolute', right: 16, transform: 'translateX(50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: isEnded ? 'primary.main' : 'action.disabled', border: '3px solid', borderColor: 'background.paper', boxShadow: (theme) => theme.shadows[1] }} />
                              </Box>
                            </Box>

                            {/* Grid details under pathway */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 1, mt: 0.5, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                              {/* Start Date Card */}
                              <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: 0.3, fontSize: '0.62rem' }}>
                                  Start Date
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25, display: 'block' }}>
                                  {startStr}
                                </Typography>
                              </Box>

                              {/* Today/Progress Card */}
                              <Box 
                                onMouseEnter={() => setTodayHover(true)}
                                onMouseLeave={() => setTodayHover(false)}
                                sx={{ 
                                  textAlign: 'center', 
                                  cursor: 'pointer', 
                                  transition: 'transform 0.2s', 
                                  transform: todayHover ? 'scale(1.05)' : 'scale(1)' 
                                }}
                              >
                                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block', letterSpacing: 0.3, fontSize: '0.62rem' }}>
                                  Today ({todayStr})
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mt: 0.25, fontWeight: 700 }}>
                                  {percent.toFixed(1)}% elapsed
                                </Typography>
                              </Box>

                              {/* Target Date Card */}
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: 0.3, fontSize: '0.62rem' }}>
                                  Target Date
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25, display: 'block' }}>
                                  {endStr}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })()}
                    </Box>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', mb: 0.5 }}>Objectives</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.825rem' }}>{prog?.pm_programmedescription || 'No description provided.'}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Financials Section */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'success.main' }} /> Financials
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                  {/* KPIs - 2 per row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    {/* Approved Budget */}
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5, fontSize: '0.62rem' }}>
                        Approved
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontFamily: '"Outfit", sans-serif', fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' } }}>
                        {currencyFormatter.format(prog?.pm_budgeteur ?? 0)}
                      </Typography>
                    </Box>

                    {/* Actual Spend */}
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5, fontSize: '0.62rem' }}>
                        Spend
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: 'warning.main', fontFamily: '"Outfit", sans-serif', fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' } }}>
                        {currencyFormatter.format(prog?.pm_actualspendeur ?? 0)}
                      </Typography>
                    </Box>

                    {/* Variance */}
                    {(() => {
                      const budget = prog?.pm_budgeteur ?? 0
                      const spend = prog?.pm_actualspendeur ?? 0
                      const remaining = budget - spend
                      return (
                        <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5, fontSize: '0.62rem' }}>
                            Variance
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: remaining < 0 ? 'error.main' : 'success.main', fontFamily: '"Outfit", sans-serif', fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' } }}>
                            {currencyFormatter.format(remaining)}
                          </Typography>
                        </Box>
                      )
                    })()}

                    {/* Unallocated Reserve */}
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5, fontSize: '0.62rem' }}>
                        Unallocated Reserve
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: unallocatedReserve > 0 ? 'warning.main' : 'text.primary', fontFamily: '"Outfit", sans-serif', fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' } }}>
                        {currencyFormatter.format(unallocatedReserve)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Budget Utilization Progress Bar */}
                  {(() => {
                    const budget = prog?.pm_budgeteur ?? 0
                    const spend = prog?.pm_actualspendeur ?? 0
                    const consumedPct = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0
                    return (
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                            Budget Utilization
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: consumedPct > 90 ? 'error.main' : consumedPct > 75 ? 'warning.main' : 'success.main' }}>
                            {consumedPct}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={consumedPct}
                          color={consumedPct > 90 ? 'error' : consumedPct > 75 ? 'warning' : 'success'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )
                  })()}
                </Box>
              </Paper>
            </Grid>

            {/* Left Column: Linked Projects */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountTreeIcon sx={{ color: 'success.main', fontSize: 18 }} /> Linked Projects
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search projects..."
                    value={projectsSearch}
                    onChange={(e) => setProjectsSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 1.5, height: 36, width: 240, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1, py: 1.5 }}>
                  <ProgrammeHierarchyTable
                    projects={detailProjects}
                    searchTerm={projectsSearch}
                    loading={detailLoading}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Row 3: Detail Cards (3 columns side-by-side to avoid whitespace/empty grid columns) */}
            {/* Overall Health - 6/12 Width */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <LightbulbIcon sx={{ fontSize: 18, color: 'success.main' }} /> Overall Health
                  </Typography>
                </Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 1.5 }}>
                  {detailProjects.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, justifyContent: 'center' }}>
                        <Box sx={{ width: 140, height: 140, position: 'relative', flexShrink: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Low Risk', value: specificGreen, color: theme.palette.success.main },
                                  { name: 'Medium Risk', value: specificAmber, color: '#f59e0b' },
                                  { name: 'High Risk', value: specificRed, color: '#ef4444' },
                                ].filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={58}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                              >
                                {[
                                  { name: 'Low Risk', value: specificGreen, color: theme.palette.success.main },
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
                            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1, fontFamily: '"Outfit", sans-serif' }}>
                              {detailProjects.length}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Projects
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.75, borderRadius: '8px', bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.success.main, 0.05), border: '1px solid', borderColor: (theme) => alpha(theme.palette.success.main, 0.2) }}>
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.dark', fontWeight: 800 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} /> Low
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'success.dark', fontFamily: '"Outfit", sans-serif' }}>{specificGreen}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.75, borderRadius: '8px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.2)' }}>
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#92400e', fontWeight: 800 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} /> Med
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: '#92400e', fontFamily: '"Outfit", sans-serif' }}>{specificAmber}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.75, borderRadius: '8px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.08)' : '#fef2f2', border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.2)' }}>
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#991b1b', fontWeight: 800 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} /> High
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: '#991b1b', fontFamily: '"Outfit", sans-serif' }}>{specificRed}</Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ p: 1.5, borderRadius: '12px', border: '1px dashed', borderColor: 'divider', bgcolor: 'background.default' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Delivery Confidence
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, height: 8, borderRadius: '4px', overflow: 'hidden', bgcolor: 'action.disabledBackground' }}>
                          {specificGreen > 0 && <Box sx={{ width: `${(specificGreen / detailProjects.length) * 100}%`, bgcolor: theme.palette.success.main }} />}
                          {specificAmber > 0 && <Box sx={{ width: `${(specificAmber / detailProjects.length) * 100}%`, bgcolor: '#f59e0b' }} />}
                          {specificRed > 0 && <Box sx={{ width: `${(specificRed / detailProjects.length) * 100}%`, bgcolor: '#ef4444' }} />}
                        </Box>
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </Paper>
            </Grid>



            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Escalated Risks & Issues */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <GppMaybeIcon sx={{ fontSize: 18, color: 'success.main' }} /> Escalated Risks & Issues
                  </Typography>
                </Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', display: 'block', textTransform: 'uppercase' }}>
                      Severity Distribution
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Paper sx={{ p: 1, borderRadius: '16px', border: 'none', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(211,47,47,0.1)' : '#fee2e2', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>High</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>{severityDistribution.high}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Paper sx={{ p: 1, borderRadius: '16px', border: 'none', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(237,108,2,0.1)' : '#fef3c7', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>Medium</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{severityDistribution.medium}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Paper sx={{ p: 1, borderRadius: '16px', border: 'none', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46,125,50,0.1)' : '#dcfce7', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>Low</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{severityDistribution.low}</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', display: 'block', textTransform: 'uppercase' }}>
                      Escalated Risks
                    </Typography>
                    {escalatedRisks.length > 0 ? (
                      escalatedRisks.map((r) => (
                        <Paper
                          key={r.pm_riskid}
                          sx={{ p: 1, mb: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'action.hover', borderColor: 'error.main' } }}
                          onClick={() => r.pm_riskid && navigateToRisk(r.pm_riskid)}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}>
                            {r.pm_risktitle} <OpenInNewIcon sx={{ fontSize: 11 }} />
                          </Typography>
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">No escalated risks.</Typography>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', display: 'block', textTransform: 'uppercase' }}>
                      Escalated Issues
                    </Typography>
                    {escalatedIssues.length > 0 ? (
                      escalatedIssues.map((i) => (
                        <Paper
                          key={i.pm_issueid}
                          sx={{ p: 1, mb: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'action.hover', borderColor: 'warning.main' } }}
                          onClick={() => i.pm_issueid && navigateToIssue(i.pm_issueid)}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}>
                            {i.pm_issuetitle} <OpenInNewIcon sx={{ fontSize: 11 }} />
                          </Typography>
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">No escalated issues.</Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

        {detailTab === 1 && (
          <MasterScheduleTab projects={detailProjects} />
        )}

        {detailTab === 2 && (
          <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <FolderIcon sx={{ fontSize: 18, color: 'success.main' }} /> Documents
              </Typography>
              {canEdit && programmeDocCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => documentsTabRef.current?.triggerUpload()}
                  sx={{ borderRadius: 1.5 }}
                >
                  Add Document
                </Button>
              )}
            </Box>
            <Box sx={{ p: 3 }}>
              <EntityDocumentsTab
                ref={documentsTabRef}
                entityId={selectedProgrammeId ?? ''}
                moduleName={MODULE_NAMES.PROGRAMMES.value}
                canEdit={canEdit}
                hideUploadIfNotEmpty={true}
                onDocumentsChange={(docs) => setProgrammeDocCount(docs.length)}
              />
            </Box>
          </Paper>
        )}

        {detailTab === 3 && canReadFunding && selectedProgrammeId && (
          <EntityFundingSourcesTab
            ref={fundingTabRef}
            entityId={selectedProgrammeId}
            entityType="pm_programmes"
            onFundingSourcesChanged={loadUnallocatedReserve}
          />
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
              <>
                <Button
                  variant="outlined"
                  startIcon={<PsychologyIcon />}
                  onClick={() => setShowAIModal(true)}
                  color="secondary"
                  sx={{ borderRadius: 2 }}
                >
                  Create with AI
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateForm}
                  sx={{ borderRadius: 2 }}
                >
                  New Programme
                </Button>
              </>
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
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{p.pm_portfolioname || '—'}</Typography></TableCell>
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
            page={page}
            onPageChange={(_, v) => setPage(v)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          />
        )}
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

      <ProgrammeAICreateDialog
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
        portfolios={portfolios}
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
