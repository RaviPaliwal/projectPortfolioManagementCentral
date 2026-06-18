import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  MenuItem as MuiMenuItem, // just in case
  Divider,
  Avatar,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DescriptionIcon from '@mui/icons-material/Description'
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown'
import RateReviewIcon from '@mui/icons-material/RateReview'
import CancelIcon from '@mui/icons-material/Cancel'
import TransformIcon from '@mui/icons-material/Transform'

import AccountTreeIcon from '@mui/icons-material/AccountTree'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssignmentIcon from '@mui/icons-material/Assignment'

import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import ScienceIcon from '@mui/icons-material/Science'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import InfoIcon from '@mui/icons-material/Info'

import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'

import {
  fetchInitiatives,
  createInitiative,
  updateInitiative,
  updateInitiativeStatus,
  fetchPipelineKpis,
  fetchPortfolioHierarchy,
  startWorkflowForEntity,
  uploadDocument,
} from '@/services'

import { useUser } from '@/context/UserContext'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { PipelineKpis } from '@/services'
import { fontSizes } from '@/styles'
import {
  PageHeader,
  KpiCardRow,
  TabPanel,
  TableFooter,
  TableShell,
  DetailDrawer,
  SearchFilterBar,
  ExportButton,
  StatusTag,
  EntityDocumentsTab,
  DocumentPreviewDialog,
} from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'
import { WORKFLOW_DECISION_EVENT } from '@/services/workflow.service'
import { ConvertToProjectDialog } from '../components/ConvertToProjectDialog'
import { createProject } from '@/services'

// ── Export columns ────────────────────────────────────────────────────────────
const pipelineExportColumns: ExportColumn[] = [
  { key: 'pm_initiativetitle', label: 'Initiative Title' },
  { key: 'pm_initiativestatus', label: 'Status' },
  { key: 'pm_initiativeowner', label: 'Owner' },
  { key: 'pm_estimatedbudget', label: 'Est. Budget (EUR)' },
  { key: 'pm_initiativecategory', label: 'Category' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'default' }> = {
  '0': { label: 'Approved', color: 'success' },
  '1': { label: 'Under Review', color: 'info' },
  '2': { label: 'Deferred', color: 'warning' },
  '3': { label: 'Rejected', color: 'error' },
  '4': { label: 'Converted', color: 'secondary' },
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'Approved' },
  { value: '1', label: 'Under Review' },
  { value: '2', label: 'Deferred' },
  { value: '3', label: 'Rejected' },
  { value: '4', label: 'Converted' },
]

type SortField = 'name' | 'sponsor' | 'strategicScore' | 'estimatedCost' | 'status'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

// ─── Strategic Score Visual ────────────────────────────────────────────────────

function StrategicScoreDisplay({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return <Typography variant="caption" color="text.secondary">—</Typography>
  }
  if (score >= 4) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Rating value={score} readOnly size="small" precision={0.5} max={5} sx={{ fontSize: fontSizes.smMd }} />
        <StatusTag label="High" size="small" color="success" variant="outlined" sx={{ fontWeight: 600, fontSize: fontSizes.xs, height: 20 }} />
      </Box>
    )
  }
  if (score >= 2.5) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Rating value={score} readOnly size="small" precision={0.5} max={5} sx={{ fontSize: fontSizes.smMd }} />
        <StatusTag label="Medium" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, fontSize: fontSizes.xs, height: 20 }} />
      </Box>
    )
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>        <Rating value={score} readOnly size="small" precision={0.5} max={5} sx={{ fontSize: fontSizes.smMd }} />
      <StatusTag label="Low" size="small" color="default" variant="outlined" sx={{ fontWeight: 600, fontSize: fontSizes.xs, height: 20 }} />
    </Box>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ── Data State ─────────────────────────────────────────────────────────────
  const [initiatives, setInitiatives] = useState<InitiativeModel[]>([])
  const [kpis, setKpis] = useState<PipelineKpis>({
    totalActiveInitiatives: 0,
    pendingApprovals: 0,
    totalEstimatedCost: 0,
    approvedThisMonth: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ── Grid State ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // ── Detail Panel State ─────────────────────────────────────────────────────
  const [selectedInitiative, setSelectedInitiative] = useState<InitiativeModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // ── Create Modal State ─────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null)
  const [createForm, setCreateForm] = useState({
    pm_initiativename: '',
    pm_businesscasedescription: '',
    pm_estimatedcosteur: 0,
    pm_estimatedbenefitseur: 0,
    pm_requestorname: '',
    pm_initiativetype: 2,
    pm_pipelinestatus: 1,
    _pm_portfolio_value: '',
  })

  // ── Confirmation Dialog State ─────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' })

  // ── Score Edit State ───────────────────────────────────────────────────────
  const [editScoreMode, setEditScoreMode] = useState(false)
  const [editScore, setEditScore] = useState(0)

  const { currentUser } = useUser()

  const { allowed: canCreate } = useAuthorization('PIPELINE', 'create')
  const { allowed: canEdit } = useAuthorization('PIPELINE', 'update')

  // ── Portfolio options for create modal ──────────────────────────────────
  const [portfolios, setPortfolios] = useState<PortfolioModel[]>([])
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  // ── Portfolio budget info for create modal ──────────────────────────────
  const portfolioBudgetInfo = useMemo(() => {
    if (!createForm._pm_portfolio_value) return null
    const selectedPortfolio = portfolios.find((p) => p.pm_portfolioid === createForm._pm_portfolio_value)
    if (!selectedPortfolio) return null

    const portfolioBudget = selectedPortfolio.pm_approvedbudgeteur ?? 0
    // Sum of programme budgets under this portfolio
    const programmeBudgets = programmes
      .filter((p) => p._pm_portfolio_value === createForm._pm_portfolio_value)
      .reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)
    // Sum of other initiative estimated costs under this portfolio (exclude current if being edited)
    const initiativeCosts = initiatives
      .filter((i) => i._pm_portfolio_value === createForm._pm_portfolio_value)
      .reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)
    const usedBudget = programmeBudgets + initiativeCosts
    const availableBudget = Math.max(0, portfolioBudget - usedBudget)
    return { portfolioBudget, usedBudget, availableBudget }
  }, [createForm._pm_portfolio_value, portfolios, programmes, initiatives])

  const hasBudgetError = portfolioBudgetInfo !== null && createForm.pm_estimatedcosteur > portfolioBudgetInfo.availableBudget

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, kpiData, hierarchy] = await Promise.all([
        fetchInitiatives(),
        fetchPipelineKpis(),
        fetchPortfolioHierarchy(),
      ])
      setInitiatives(list)
      setKpis(kpiData)
      setPortfolios(hierarchy.portfolios)
      setProgrammes(hierarchy.programmes)
      setProjects(hierarchy.projects)
    } catch {
      setError('Unable to load pipeline data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reload data when a workflow decision is submitted (e.g., Pipeline Review, Pipeline Decision)
  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener(WORKFLOW_DECISION_EVENT, handler)
    return () => window.removeEventListener(WORKFLOW_DECISION_EVENT, handler)
  }, [loadData])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems: KpiCardItem[] = [
    {
      label: 'Total Active Initiatives',
      value: kpis.totalActiveInitiatives,
      subtitle: 'Ideas in the hopper',
      icon: <LightbulbIcon />,
      color: 'primary.main',
    },
    {
      label: 'Pending Approvals',
      value: kpis.pendingApprovals,
      subtitle: 'Awaiting decision',
      icon: <WarningAmberIcon />,
      color: 'warning.main',
      valueColor: 'warning.main',
    },
    {
      label: 'Total Est. Pipeline Cost',
      value: currencyFormatter.format(kpis.totalEstimatedCost),
      subtitle: 'Potential financial demand',
      icon: <CurrencyExchangeIcon />,
      color: 'success.main',
    },
    {
      label: 'Approved This Month',
      value: kpis.approvedThisMonth,
      subtitle: 'Intake velocity',
      icon: <TrendingUpIcon />,
      color: 'secondary.main',
    },
    {
      label: 'Deferred',
      value: initiatives.filter((i) => String(i.pm_pipelinestatus) === '2').length,
      subtitle: 'On hold',
      icon: <PauseCircleFilledIcon />,
      color: 'warning.main',
    },
    {
      label: 'Rejected',
      value: initiatives.filter((i) => String(i.pm_pipelinestatus) === '3').length,
      subtitle: 'Not proceeding',
      icon: <CancelIcon />,
      color: 'error.main',
    },
    {
      label: 'Converted',
      value: initiatives.filter((i) => String(i.pm_pipelinestatus) === '4').length,
      subtitle: 'Became projects',
      icon: <TransformIcon />,
      color: 'secondary.main',
    },
  ]

  // ── Sort Handler ─────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  // ── Filtered & Sorted Initiatives ──────────────────────────────────────────
  const filteredInitiatives = useMemo(() => {
    let list = [...initiatives]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (i) =>
          i.pm_name?.toLowerCase().includes(q) ||
          i.pm_requestorname?.toLowerCase().includes(q) ||
          i.pm_businesscase?.toLowerCase().includes(q) ||
          i.pm_portfolioname?.toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      list = list.filter((i) => String(i.pm_pipelinestatus) === statusFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_name ?? '').localeCompare(b.pm_name ?? '')
          break
        case 'sponsor':
          cmp = (a.pm_requestorname ?? '').localeCompare(b.pm_requestorname ?? '')
          break
        case 'strategicScore':
          cmp = (a.pm_strategicalignmentscore ?? 0) - (b.pm_strategicalignmentscore ?? 0)
          break
        case 'estimatedCost':
          cmp = (a.pm_estimatedcost ?? 0) - (b.pm_estimatedcost ?? 0)
          break
        case 'status':
          cmp = (String(a.pm_pipelinestatus ?? '')).localeCompare(String(b.pm_pipelinestatus ?? ''))
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [initiatives, searchQuery, statusFilter, sort])

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginatedInitiatives = useMemo(
    () => filteredInitiatives.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredInitiatives, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setPage(0) }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRowClick = useCallback((initiative: InitiativeModel) => {
    setSelectedInitiative(initiative)
    setDetailTab(0)
    setEditScoreMode(false)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedInitiative(null)
    setDetailTab(0)
    setEditScoreMode(false)
  }, [])

  const handleCreateInitiative = async () => {
    if (!createForm.pm_initiativename.trim()) {
      setError('Initiative name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const created = await createInitiative(createForm as any)
      if (created) {
        const initiativeName = created.pm_name || createForm.pm_initiativename
        const initiativeId = created.pm_initiativeid

        // Upload any staged files
        if (initiativeId && stagedFiles.length > 0) {
          const ownerId = currentUser?.systemuserid || ''
          await Promise.all(
            stagedFiles.map((file) =>
              uploadDocument(MODULE_NAMES.PIPELINE.value, initiativeId, file, ownerId)
            )
          )
        }

        setShowCreateModal(false)
        setConfirmDialog({ open: true, name: initiativeName })
        setCreateForm({
          pm_initiativename: '',
          pm_businesscasedescription: '',
          pm_estimatedcosteur: 0,
          pm_estimatedbenefitseur: 0,
          pm_requestorname: '',
          pm_initiativetype: 2,
          pm_pipelinestatus: 1,
          _pm_portfolio_value: '',
        })
        setStagedFiles([])
        await loadData()
        if (created.pm_initiativeid) {
          startWorkflowForEntity('default-template', created.pm_initiativeid, MODULE_NAMES.PIPELINE.value, currentUser?.fullname ?? 'System')
        }
      }
    } catch {
      setError('Unable to create initiative.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveScore = async () => {
    if (!selectedInitiative?.pm_initiativeid) return
    setActionLoading(true)
    try {
      await updateInitiative(selectedInitiative.pm_initiativeid, {
        pm_strategicalignmentscore: editScore,
      } as any)
      setSelectedInitiative({ ...selectedInitiative, pm_strategicalignmentscore: editScore })
      setEditScoreMode(false)
      setSuccessMsg('Strategic alignment score updated.')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to update score.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResubmitForApproval = async () => {
    if (!selectedInitiative?.pm_initiativeid) return
    setActionLoading(true)
    try {
      await updateInitiativeStatus(selectedInitiative.pm_initiativeid, 1)
      startWorkflowForEntity('default-template', selectedInitiative.pm_initiativeid, MODULE_NAMES.PIPELINE.value, currentUser?.fullname ?? 'System')
      setSelectedInitiative({ ...selectedInitiative, pm_pipelinestatus: 1 })
      await loadData()
      setSuccessMsg('Initiative re-submitted for approval.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to submit for approval.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConvertToProject = () => {
    setShowConvertDialog(true)
  }

  const handleCreateProjectFromInitiative = async (projectData: Partial<any>, files: File[] = []) => {
    if (!selectedInitiative) return
    setActionLoading(true)
    setError(null)
    try {
      const created = await createProject(projectData)
      if (created && created.pm_projectid) {
        // Upload any staged files linked to the new project ID
        if (files.length > 0) {
          const ownerId = currentUser?.systemuserid || ''
          await Promise.all(
            files.map((file) =>
              uploadDocument(MODULE_NAMES.PROJECTS.value, created.pm_projectid!, file, ownerId)
            )
          )
        }

        // Update the initiative's conversion reference
        try {
          await updateInitiative(selectedInitiative.pm_initiativeid!, {
            pm_convertedtoreference: created.pm_projectid,
          } as any)
          await updateInitiativeStatus(selectedInitiative.pm_initiativeid!, 4)
        } catch (e) {
          console.warn('[PipelinePage] Failed to update initiative conversion reference:', e)
        }
        setShowConvertDialog(false)
        setSuccessMsg(`Project "${created.pm_projectname}" created successfully.`)
        await loadData()
        setSelectedInitiative(null)
        if (created.pm_projectid) {
          startWorkflowForEntity('default-template', created.pm_projectid, MODULE_NAMES.PROJECTS.value, currentUser?.fullname ?? 'System')
        }
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setError('Conversion failed. Please try again.')
      }
    } catch {
      setError('Unable to convert initiative to project.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDefer = async () => {
    if (!selectedInitiative?.pm_initiativeid) return
    setActionLoading(true)
    try {
      await updateInitiativeStatus(selectedInitiative.pm_initiativeid, 2)
      setSelectedInitiative({ ...selectedInitiative, pm_pipelinestatus: 2 })
      await loadData()
      setSuccessMsg('Initiative deferred.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to defer initiative.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedInitiative?.pm_initiativeid) return
    setActionLoading(true)
    try {
      await updateInitiativeStatus(selectedInitiative.pm_initiativeid, 3)
      setSelectedInitiative({ ...selectedInitiative, pm_pipelinestatus: 3 })
      await loadData()
      setSuccessMsg('Initiative rejected.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to reject initiative.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Detail Drawer subtitle ────────────────────────────────────────────────
  const drawerSubtitle = selectedInitiative && (
    <>
      {selectedInitiative.pm_requestorname && (
        <Typography variant="body2" color="text.secondary">
          <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
          {selectedInitiative.pm_requestorname}
        </Typography>
      )}
      {selectedInitiative.pm_portfolioname && (
        <StatusTag
          label={selectedInitiative.pm_portfolioname}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: fontSizes.xs, height: 22 }}
        />
      )}

      {selectedInitiative.pm_submissiondate && (
        <Typography variant="body2" color="text.secondary">
          <CalendarTodayIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'text-bottom' }} />
          Submitted: {new Date(selectedInitiative.pm_submissiondate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>
      )}
      <StatusTag
        label={STATUS_CONFIG[String(selectedInitiative.pm_pipelinestatus ?? '')]?.label ?? 'Draft'}
        color={STATUS_CONFIG[String(selectedInitiative.pm_pipelinestatus ?? '')]?.color ?? 'default'}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
    </>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Pipeline"
        subtitle="Pre-project initiative pipeline — triage, score, and convert ideas into authorised projects."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
                New Initiative
              </Button>
            )}
            <ExportButton filename="pipeline" columns={pipelineExportColumns} data={filteredInitiatives} />
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── 1. 4-Column KPI Header ──────────────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── 2. Master Pipeline Grid ──────────────────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name, sponsor, portfolio..."
          filterValue={statusFilter}
          onFilterChange={handleStatusFilterChange}
          filterLabel="Status"
          filterOptions={STATUS_FILTER_OPTIONS}
          onClear={() => { setSearchQuery(''); setStatusFilter(''); setPage(0) }}
        />

        <TableShell
          loading={loading}
          empty={filteredInitiatives.length === 0}
          emptyIcon={<LightbulbIcon />}
          emptyTitle={searchQuery || statusFilter ? 'No initiatives match your search criteria.' : 'No initiatives found.'}
          emptyAction={(!searchQuery && !statusFilter && canCreate) ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
              Create your first initiative
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Initiative Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'sponsor'} direction={sort.field === 'sponsor' ? sort.dir : 'asc'} onClick={() => handleSort('sponsor')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Business Sponsor
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'strategicScore'} direction={sort.field === 'strategicScore' ? sort.dir : 'asc'} onClick={() => handleSort('strategicScore')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Strategic Alignment
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'estimatedCost'} direction={sort.field === 'estimatedCost' ? sort.dir : 'asc'} onClick={() => handleSort('estimatedCost')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Estimated Cost
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'status'} direction={sort.field === 'status' ? sort.dir : 'asc'} onClick={() => handleSort('status')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Status
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInitiatives.map((initiative, idx) => {
                const statusCfg = STATUS_CONFIG[String(initiative.pm_pipelinestatus ?? '')] ?? { label: 'Draft', color: 'default' as const }
                return (
                  <TableRow
                    key={initiative.pm_initiativeid}
                    hover
                    onClick={() => handleRowClick(initiative)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LightbulbIcon sx={{ fontSize: 18, color: 'warning.main', opacity: 0.7 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {initiative.pm_name ?? 'Untitled Initiative'}
                          </Typography>
                          {initiative.pm_portfolioname && (
                            <Typography variant="caption" color="text.secondary">
                              {initiative.pm_portfolioname}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {initiative.pm_requestorname || '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StrategicScoreDisplay score={initiative.pm_strategicalignmentscore} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {initiative.pm_estimatedcost ? currencyFormatter.format(initiative.pm_estimatedcost) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={statusCfg.label}
                        color={statusCfg.color}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredInitiatives.length > 0 && (
          <TableFooter
            filteredCount={filteredInitiatives.length}
            totalCount={initiatives.length}
            itemLabel="initiative"
            totals={[
              { label: 'Est. pipeline', value: currencyFormatter.format(filteredInitiatives.reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)) },
            ]}
          />
        )}
        {!loading && filteredInitiatives.length > 0 && (
          <TablePagination
            component="div"
            count={filteredInitiatives.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>

      {/* ── 3. Slide-Out Detail Panel ────────────────────────────────────────── */}
      <DetailDrawer
        open={!!selectedInitiative}
        onClose={handleCloseDetail}
        icon={<LightbulbIcon sx={{ color: 'warning.main', fontSize: 22 }} />}
        title={selectedInitiative?.pm_name ?? ''}
        subtitle={drawerSubtitle}
        tabs={[
          { label: 'Overview' },
          { label: 'Score & Triage' },
          { label: 'Actions' },
          { label: 'Tasks' },
          { label: 'Documents' },
        ]}
        tabValue={detailTab}
        onTabChange={(v) => { setDetailTab(v); setEditScoreMode(false) }}
      >
        {/* ═══ Tab 0: Overview ═══ */}
        <TabPanel value={detailTab} index={0} pt={0}>
          {selectedInitiative && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {selectedInitiative.pm_businesscase ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Business Case
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? 'background.paper' : 'background.default' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {selectedInitiative.pm_businesscase}
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No business case provided.</Typography>
                </Paper>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>Est. Cost</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{selectedInitiative.pm_estimatedcost ? currencyFormatter.format(selectedInitiative.pm_estimatedcost) : '—'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'success.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>Est. Benefits</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{selectedInitiative.pm_estimatedbenefits ? currencyFormatter.format(selectedInitiative.pm_estimatedbenefits) : '—'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'warning.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>Priority Score</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedInitiative.pm_priorityscore ?? '—'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'secondary.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>Strategic Alignment</Typography>
                  <Box sx={{ mt: 0.5 }}><StrategicScoreDisplay score={selectedInitiative.pm_strategicalignmentscore} /></Box>
                </Paper>
              </Box>

              {selectedInitiative.pm_submissiondate && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16 }} /> Timeline
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Submitted: {new Date(selectedInitiative.pm_submissiondate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </TabPanel>

        {/* ═══ Tab 1: Score & Triage ═══ */}
        <TabPanel value={detailTab} index={1} pt={0}>
          {selectedInitiative && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <ThumbsUpDownIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Strategic Alignment Score
                </Typography>
                {editScoreMode ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Rate this initiative against strategic pillars (1–5).</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Rating value={editScore} onChange={(_, v) => setEditScore(v ?? 0)} precision={0.5} max={5} size="large" sx={{ fontSize: '2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{editScore.toFixed(1)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" size="small" onClick={handleSaveScore} disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
                        {actionLoading ? 'Saving...' : 'Save Score'}
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => setEditScoreMode(false)} sx={{ borderRadius: 1.5 }}>Cancel</Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                      <Rating value={selectedInitiative.pm_strategicalignmentscore ?? 0} readOnly precision={0.5} max={5} size="large" sx={{ fontSize: '1.75rem' }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                        {selectedInitiative.pm_strategicalignmentscore?.toFixed(1) ?? '—'}
                      </Typography>
                      {selectedInitiative.pm_strategicalignmentscore != null && (
                        <StatusTag
                          label={selectedInitiative.pm_strategicalignmentscore >= 4 ? 'High' : selectedInitiative.pm_strategicalignmentscore >= 2.5 ? 'Medium' : 'Low'}
                          color={selectedInitiative.pm_strategicalignmentscore >= 4 ? 'success' : selectedInitiative.pm_strategicalignmentscore >= 2.5 ? 'warning' : 'default'}
                          size="small" variant="filled"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Box>
                    {canEdit && (
                      <Button variant="outlined" size="small" startIcon={<EditIcon />}
                        onClick={() => { setEditScore(selectedInitiative.pm_strategicalignmentscore ?? 0); setEditScoreMode(true) }}
                        sx={{ borderRadius: 1.5 }}>
                        Edit Score
                      </Button>
                    )}
                  </Box>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <TrendingUpIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Priority Score
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                  {selectedInitiative.pm_priorityscore ?? '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Higher scores indicate greater urgency and business impact.
                </Typography>
              </Paper>
            </Box>
          )}
        </TabPanel>

        {/* ═══ Tab 2: Actions ═══ */}
        <TabPanel value={detailTab} index={2} pt={0}>
          {selectedInitiative && canEdit && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { icon: <RateReviewIcon sx={{ fontSize: 18, color: 'primary.main' }} />, title: 'Request Approval', desc: 'Submit to the investment board for review.', color: 'primary.main', btnLabel: 'Submit for Approval', btnVariant: 'contained' as const, btnColor: 'primary' as const, onClick: handleResubmitForApproval, btnDisabled: String(selectedInitiative.pm_pipelinestatus) !== '2' },
                { icon: <TransformIcon sx={{ fontSize: 18, color: 'success.main' }} />, title: 'Convert to Project', desc: 'Create a new project from this approved initiative.', color: 'success.main', btnLabel: 'Convert to Project', btnVariant: 'contained' as const, btnColor: 'success' as const, onClick: handleConvertToProject, btnDisabled: String(selectedInitiative.pm_pipelinestatus) !== '0' },
              ]
                .filter((a) => !a.btnDisabled)
                .map((action, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, borderLeft: `3px solid ${action.color}`, transition: 'all 0.2s', '&:hover': { bgcolor: isDark ? 'background.paper' : 'background.default' } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {action.icon} {action.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0, fontSize: fontSizes.smMd }}>{action.desc}</Typography>
                    </Box>
                    <Button variant={action.btnVariant} size="small" color={action.btnColor}
                      onClick={action.onClick} disabled={actionLoading}
                      sx={{ borderRadius: 1.5, whiteSpace: 'nowrap', ml: 2 }}>
                      {actionLoading ? 'Processing...' : action.btnLabel}
                    </Button>
                  </Box>
                </Paper>
              ))}
              {canEdit && [
                { icon: <RateReviewIcon sx={{ fontSize: 18, color: 'primary.main' }} />, title: 'Request Approval', desc: 'Submit to the investment board for review.', color: 'primary.main', btnLabel: 'Submit for Approval', btnVariant: 'contained' as const, btnColor: 'primary' as const, onClick: handleResubmitForApproval, btnDisabled: String(selectedInitiative.pm_pipelinestatus) !== '2' },
                { icon: <TransformIcon sx={{ fontSize: 18, color: 'success.main' }} />, title: 'Convert to Project', desc: 'Create a new project from this approved initiative.', color: 'success.main', btnLabel: 'Convert to Project', btnVariant: 'contained' as const, btnColor: 'success' as const, onClick: handleConvertToProject, btnDisabled: String(selectedInitiative.pm_pipelinestatus) !== '0' },
              ].filter((a) => a.btnDisabled).length === 2 && (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No actions available for this initiative in its current status.
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </TabPanel>

        {/* ═══ Tab 3: Tasks ═══ */}
        <TabPanel value={detailTab} index={3} pt={0}>
          {selectedInitiative?.pm_initiativeid && (
            <EntityApprovalTasks
              entityId={selectedInitiative.pm_initiativeid}
              moduleName={MODULE_NAMES.PIPELINE.value}
              entityLabel="Initiative"
              tabValue={detailTab}
              index={3}
            />
          )}
        </TabPanel>

        {/* ═══ Tab 4: Documents ═══ */}
        <TabPanel value={detailTab} index={4} pt={0}>
          {selectedInitiative?.pm_initiativeid && (
            <EntityDocumentsTab
              entityId={selectedInitiative.pm_initiativeid}
              moduleName={MODULE_NAMES.PIPELINE.value}
              canEdit={canEdit}
            />
          )}
        </TabPanel>
      </DetailDrawer>

      {/* ── 4. Create Initiative Modal ────────────────────────────────────────── */}
      <Dialog
        open={showCreateModal}
        onClose={() => !actionLoading && setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 1.5 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.main', borderRadius: 1.5 }}>
            <LightbulbIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          New Initiative
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 0 }}>
            Submit a new idea to the pipeline for executive review and triage. Initiatives default to <strong>Under Review</strong> status.
          </Typography>

          {/* ── Section: Basic Information ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Initiative Name"
                required
                fullWidth
                size="small"
                value={createForm.pm_initiativename}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_initiativename: e.target.value }))}
                slotProps={{
                  input: { sx: { borderRadius: 1.5 } },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Requester / Sponsor"
                fullWidth
                size="small"
                value={createForm.pm_requestorname}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_requestorname: e.target.value }))}
                slotProps={{ input: { startAdornment: <PersonIcon sx={{ fontSize: 18, mr: 0.75, color: 'action.active' }} />, sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Portfolio (optional)</InputLabel>
                <Select
                  value={createForm._pm_portfolio_value}
                  label="Portfolio (optional)"
                  onChange={(e) => setCreateForm((f) => ({ ...f, _pm_portfolio_value: e.target.value }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">
                    <em style={{ color: 'text.disabled' }}>No portfolio</em>
                  </MenuItem>
                  {portfolios.map((p) => (
                    <MenuItem key={p.pm_portfolioid} value={p.pm_portfolioid}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountTreeIcon sx={{ fontSize: 16, color: 'primary.main', opacity: 0.6 }} />
                        {p.pm_portfolioname}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Initiative Type</InputLabel>
                <Select
                  value={createForm.pm_initiativetype}
                  label="Initiative Type"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_initiativetype: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={2}>Initiative</MenuItem>
                  <MenuItem value={0}>Project</MenuItem>
                  <MenuItem value={1}>Programme</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* ── Section: Financial Estimates ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <MonetizationOnIcon sx={{ fontSize: 18, color: 'success.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Financial Estimates
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Estimated Cost (EUR)"
                type="number"
                fullWidth
                size="small"
                value={createForm.pm_estimatedcosteur}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_estimatedcosteur: Number(e.target.value) }))}
                error={hasBudgetError}
                helperText={hasBudgetError ? `Exceeds remaining portfolio budget by ${currencyFormatter.format(createForm.pm_estimatedcosteur - portfolioBudgetInfo!.availableBudget)}` : ''}
                slotProps={{
                  input: { startAdornment: <CurrencyExchangeIcon sx={{ fontSize: 16, mr: 0.75, color: 'action.active' }} />, sx: { borderRadius: 1.5 } },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Estimated Benefits (EUR)"
                type="number"
                fullWidth
                size="small"
                value={createForm.pm_estimatedbenefitseur}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_estimatedbenefitseur: Number(e.target.value) }))}
                slotProps={{
                  input: { startAdornment: <TrendingUpIcon sx={{ fontSize: 16, mr: 0.75, color: 'action.active' }} />, sx: { borderRadius: 1.5 } },
                }}
              />
            </Grid>
          </Grid>

          {portfolioBudgetInfo && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 3, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> Portfolio Budget Allocation
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Portfolio Budget</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{currencyFormatter.format(portfolioBudgetInfo.portfolioBudget)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Allocated to programmes & other initiatives</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'warning.main' }}>{currencyFormatter.format(portfolioBudgetInfo.usedBudget)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Available</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', color: portfolioBudgetInfo.availableBudget <= 0 ? 'error.main' : 'success.main' }}>{currencyFormatter.format(portfolioBudgetInfo.availableBudget)}</Typography>
              </Box>
              {portfolioBudgetInfo.availableBudget <= 0 && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>No remaining budget in this portfolio.</Typography>
              )}
            </Paper>
          )}

          {hasBudgetError && (
            <Box sx={{ mb: 2, p: 1.25, borderRadius: 1.5, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main', flexShrink: 0 }} />
              <Typography variant="caption" color="error.dark" sx={{ fontWeight: 600 }}>
                Estimated cost exceeds available portfolio budget by {currencyFormatter.format(createForm.pm_estimatedcosteur - portfolioBudgetInfo!.availableBudget)}.
              </Typography>
            </Box>
          )}

          {/* ── Section: Business Case ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ScienceIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Business Case
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Business Case / Description"
                fullWidth
                size="small"
                multiline
                rows={4}
                value={createForm.pm_businesscasedescription}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_businesscasedescription: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                placeholder="Describe the problem, opportunity, and strategic rationale for this initiative..."
              />
            </Grid>
          </Grid>

          {/* ── Section: Supporting Documents ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
            <AttachFileIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Supporting Documents
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ p: 2.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, textAlign: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
              sx={{ borderRadius: 1.5, mb: stagedFiles.length > 0 ? 2 : 0 }}
            >
              Select Files
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) {
                    const filesArray = Array.from(e.target.files)
                    // Validate file sizes
                    const largeFiles = filesArray.filter((f) => f.size > 32 * 1024 * 1024)
                    if (largeFiles.length > 0) {
                      setError(`Some files exceed the maximum 32MB limit.`)
                      return
                    }
                    setStagedFiles((prev) => [...prev, ...filesArray])
                  }
                }}
              />
            </Button>
            {stagedFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {stagedFiles.map((file, idx) => (
                  <Chip
                    key={idx}
                    label={`${file.name} (${formatBytes(file.size)})`}
                    onDelete={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                    onClick={() => {
                      const url = URL.createObjectURL(file)
                      setPreviewFile({ name: file.name, url })
                    }}
                    title="Click to preview file"
                    sx={{ borderRadius: 1.5, fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* ── Status badge ── */}
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: isDark ? 'background.paper' : '#f0f9ff', borderRadius: 1.5, border: '1px solid', borderColor: isDark ? '#334155' : '#bae6fd' }}>
            <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Status will be set to{' '}
              <StatusTag label="Under Review" size="small" color="info" variant="outlined" sx={{ fontWeight: 600, height: 22 }} />
              {' '}by default. This can be changed later from the initiative detail panel.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => setShowCreateModal(false)}
            variant="outlined"
            disabled={actionLoading}
            sx={{ borderRadius: 1.5 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInitiative}
            variant="contained"
            disabled={!createForm.pm_initiativename.trim() || actionLoading || hasBudgetError}
            startIcon={actionLoading ? undefined : <AddIcon />}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
              borderRadius: 1.5,
              fontWeight: 600,
            }}
          >
            {actionLoading ? 'Creating...' : 'Create Initiative'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 5. Convert to Project Dialog ──────────────────────────────────── */}
      <ConvertToProjectDialog
        open={showConvertDialog}
        onClose={() => !actionLoading && setShowConvertDialog(false)}
        initiative={selectedInitiative}
        portfolios={portfolios}
        programmes={programmes}
        allProjects={projects}
        onConvert={handleCreateProjectFromInitiative}
        converting={actionLoading}
      />

      {/* ── 6. Success Confirmation Dialog ─────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, name: '' })}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 1.5, overflow: 'visible' },
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 32, color: '#fff' }} />
        </Box>
        <DialogTitle sx={{ textAlign: 'center', pt: 5, pb: 1, fontWeight: 700, fontSize: 20 }}>
          Initiative Created
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{confirmDialog.name}</strong> has been successfully submitted to the pipeline.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The initiative is now <strong>Under Review</strong>. You can triage, score, and convert it to a project from the detail panel.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1.5 }}>
          <Button
            variant="contained"
            onClick={() => setConfirmDialog({ open: false, name: '' })}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
              borderRadius: 1.5,
              px: 4,
              fontWeight: 600,
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {previewFile && (
        <DocumentPreviewDialog
          open={!!previewFile}
          onClose={() => {
            URL.revokeObjectURL(previewFile.url)
            setPreviewFile(null)
          }}
          fileName={previewFile.name}
          fileUrl={previewFile.url}
        />
      )}
    </Box>
  )
}