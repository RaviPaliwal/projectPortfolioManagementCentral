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
  LinearProgress,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
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
  IconButton,
  Tooltip,
  alpha,
  Tabs,
  Tab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
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
import FolderIcon from '@mui/icons-material/Folder'

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
  deleteInitiative,
  fetchPipelineKpis,
  fetchPortfolioHierarchy,
  startWorkflowForEntity,
  uploadDocument,
  fetchSystemUsers,
} from '@/services'

import { useUser } from '@/context/UserContext'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import type { PipelineKpis } from '@/services'
import { fontSizes } from '@/styles'
import {
  PageHeader,
  KpiCardRow,
  TabPanel,
  TableFooter,
  TableShell,
  TableHeader,
  Breadcrumbs,
  SearchFilterBar,
  ExportButton,
  StatusTag,
  EntityDocumentsTab,
  DocumentPreviewDialog,
  Button,
  ConfirmDialog,
  WorkflowMilestone,
} from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'
import { WORKFLOW_DECISION_EVENT } from '@/services/workflow.service'
import { ConvertToProjectDialog } from '../components/ConvertToProjectDialog'
import { createProject, createProgramme, createPortfolio } from '@/services'

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

type SortField = 'name' | 'sponsor' | 'strategicScore' | 'type' | 'status'
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

export default function PipelinePage({ onNavigate }: { onNavigate?: (tab: any) => void }) {
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
  const [users, setUsers] = useState<Systemusers[]>([])

  // ── Grid State ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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
    _pm_requestedby_value: '',
    pm_initiativetype: 0,
    pm_pipelinestatus: 1,
    _pm_portfolio_value: '',
    _pm_programme_value: '',
  })

  // ── Confirmation Dialog State ─────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' })

  // ── Delete State ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<InitiativeModel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)



  const { currentUser } = useUser()

  const { allowed: canCreate } = useAuthorization('PIPELINE', 'create')
  const { allowed: canEdit } = useAuthorization('PIPELINE', 'update')
  const { allowed: canDelete } = useAuthorization('PIPELINE', 'delete')

  // ── Portfolio options for create modal ──────────────────────────────────
  const [portfolios, setPortfolios] = useState<PortfolioModel[]>([])
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showBudgetWarningDialog, setShowBudgetWarningDialog] = useState(false)

  // ── Parent budget info for create modal ─────────────────────────────────
  const parentBudgetInfo = useMemo(() => {
    const { pm_initiativetype, _pm_programme_value, _pm_portfolio_value } = createForm

    if (pm_initiativetype === 0) {
      // Initiative is a Project: parent is a Programme
      if (!_pm_programme_value) return null
      const selectedProg = programmes.find((p) => p.pm_programmeid === _pm_programme_value)
      if (!selectedProg) return null

      const parentBudget = selectedProg.pm_budgeteur ?? 0
      // Sum of child projects under this programme
      const childProjectBudgets = projects
        .filter((p) => p._pm_programme_value === _pm_programme_value)
        .reduce((s, p) => s + (p.pm_approvedbudget ?? 0), 0)
      // Sum of other Project initiatives under this programme
      const childInitiativeCosts = initiatives
        .filter((i) => i.pm_initiativetype === 0 && i._pm_programme_value === _pm_programme_value)
        .reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)

      const usedBudget = childProjectBudgets + childInitiativeCosts
      const availableBudget = Math.max(0, parentBudget - usedBudget)

      return {
        label: 'Programme',
        parentBudget,
        usedBudget,
        availableBudget,
      }
    } else if (pm_initiativetype === 1) {
      // Initiative is a Programme: parent is a Portfolio
      if (!_pm_portfolio_value) return null
      const selectedPortfolio = portfolios.find((p) => p.pm_portfolioid === _pm_portfolio_value)
      if (!selectedPortfolio) return null

      const parentBudget = selectedPortfolio.pm_approvedbudgeteur ?? 0
      // Sum of child programmes under this portfolio
      const childProgrammeBudgets = programmes
        .filter((p) => p._pm_portfolio_value === _pm_portfolio_value)
        .reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)
      // Sum of other Programme initiatives under this portfolio
      const childInitiativeCosts = initiatives
        .filter((i) => i.pm_initiativetype === 1 && i._pm_portfolio_value === _pm_portfolio_value)
        .reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)

      const usedBudget = childProgrammeBudgets + childInitiativeCosts
      const availableBudget = Math.max(0, parentBudget - usedBudget)

      return {
        label: 'Portfolio',
        parentBudget,
        usedBudget,
        availableBudget,
      }
    }

    return null
  }, [createForm.pm_initiativetype, createForm._pm_programme_value, createForm._pm_portfolio_value, portfolios, programmes, projects, initiatives])

  const hasBudgetError = parentBudgetInfo !== null && createForm.pm_estimatedcosteur > parentBudgetInfo.availableBudget

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, kpiData, hierarchy, systemUsers] = await Promise.all([
        fetchInitiatives(),
        fetchPipelineKpis(),
        fetchPortfolioHierarchy(),
        fetchSystemUsers(),
      ])
      setInitiatives(list)
      setKpis(kpiData)
      setPortfolios(hierarchy.portfolios)
      setProgrammes(hierarchy.programmes)
      setProjects(hierarchy.projects)
      setUsers(systemUsers)
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
      subtitle: 'Successfully converted',
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
          i.pm_requestedbyname?.toLowerCase().includes(q) ||
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
          cmp = (a.pm_requestedbyname ?? '').localeCompare(b.pm_requestedbyname ?? '')
          break
        case 'strategicScore':
          cmp = (a.pm_strategicalignmentscore ?? 0) - (b.pm_strategicalignmentscore ?? 0)
          break
        case 'type':
          cmp = Number(a.pm_initiativetype ?? 0) - Number(b.pm_initiativetype ?? 0)
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
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedInitiative(null)
    setDetailTab(0)
  }, [])

  const executeCreateInitiative = async () => {
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
          _pm_requestedby_value: '',
          pm_initiativetype: 0,
          pm_pipelinestatus: 1,
          _pm_portfolio_value: '',
          _pm_programme_value: '',
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

  const handleCreateInitiative = () => {
    if (!createForm.pm_initiativename.trim()) {
      setError('Initiative name is required.')
      return
    }
    if (hasBudgetError) {
      setShowBudgetWarningDialog(true)
    } else {
      executeCreateInitiative()
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
  const handleConvertInitiative = async (entityData: Partial<any>, files: File[] = [], triggerApproval: boolean = true) => {
    if (!selectedInitiative) return
    setActionLoading(true)
    setError(null)
    const type = selectedInitiative.pm_initiativetype
    try {
      let createdId = ''
      let createdName = ''
      let moduleName = ''

      if (type === 0) {
        const projPayload = {
          pm_projectname: entityData.pm_projectname,
          _pm_portfolio_value: entityData._pm_portfolio_value,
          _pm_programme_value: entityData._pm_programme_value,
          pm_projectmanager: entityData.pm_projectmanager,
          pm_projectsponsor: entityData.pm_projectsponsor,
          pm_projectphase: entityData.pm_projectphase,
          pm_ragstatus: entityData.pm_ragstatus,
          pm_approvedbudget: entityData.pm_approvedbudget,
          pm_actualcost: entityData.pm_actualcost,
          pm_plannedstartdate: entityData.pm_plannedstartdate,
          pm_plannedenddate: entityData.pm_plannedenddate,
          pm_actualstartdate: entityData.pm_actualstartdate,
          pm_actualenddate: entityData.pm_actualenddate,
          pm_businessunit: entityData.pm_businessunit,
          pm_projectpriority: entityData.pm_projectpriority,
          pm_percentcomplete: entityData.pm_percentcomplete,
          pm_costragstatus: entityData.pm_costragstatus,
          pm_scheduleragstatus: entityData.pm_scheduleragstatus,
          pm_benefitsragstatus: entityData.pm_benefitsragstatus,
        }
        const created = await createProject(projPayload)
        if (created && created.pm_projectid) {
          createdId = created.pm_projectid
          createdName = created.pm_projectname ?? 'New Project'
          moduleName = MODULE_NAMES.PROJECTS.value
        }
      } else if (type === 1) {
        const progPayload = {
          pm_programmename: entityData.pm_programmename,
          _pm_portfolio_value: entityData._pm_portfolio_value,
          pm_programmemanager: entityData.pm_programmemanager,
          pm_sponsorname: entityData.pm_sponsorname,
          pm_businessunit: entityData.pm_businessunit,
          pm_ragstatus: entityData.pm_ragstatus,
          pm_programmephase: entityData.pm_projectphase,
          pm_budgeteur: entityData.pm_approvedbudgeteur,
          pm_startdate: entityData.pm_plannedstartdate,
          pm_enddate: entityData.pm_plannedenddate,
          pm_programmedescription: entityData.pm_programmedescription,
        }
        const created = await createProgramme(progPayload)
        if (created && created.pm_programmeid) {
          createdId = created.pm_programmeid
          createdName = created.pm_programmename ?? 'New Programme'
          moduleName = MODULE_NAMES.PROGRAMMES.value
        }
      } else if (type === 2) {
        const portPayload = {
          pm_portfolioname: entityData.pm_portfolioname,
          pm_portfoliodescription: entityData.pm_portfoliodescription,
          pm_ownerlookup: entityData.pm_ownerlookup,
          pm_businessunit: entityData.pm_businessunit,
          pm_ragstatus: entityData.pm_ragstatus,
          pm_portfoliostatus: entityData.pm_projectphase,
          pm_approvedbudgeteur: entityData.pm_approvedbudgeteur,
          pm_startdate: entityData.pm_plannedstartdate,
          pm_enddate: entityData.pm_plannedenddate,
          pm_strategicobjective: entityData.pm_strategicobjective,
        }
        const created = await createPortfolio(portPayload)
        if (created && created.pm_portfolioid) {
          createdId = created.pm_portfolioid
          createdName = created.pm_portfolioname ?? 'New Portfolio'
          moduleName = MODULE_NAMES.PORTFOLIOS.value
        }
      }

      if (createdId) {
        if (files.length > 0) {
          const ownerId = currentUser?.systemuserid || ''
          await Promise.all(
            files.map((file) =>
              uploadDocument(moduleName, createdId, file, ownerId)
            )
          )
        }

        try {
          await updateInitiative(selectedInitiative.pm_initiativeid!, {
            pm_convertedtoreference: createdId,
          } as any)
          await updateInitiativeStatus(selectedInitiative.pm_initiativeid!, 4)
        } catch (e) {
          // Ignore initiative conversion reference update failure
        }
        setShowConvertDialog(false)
        setSuccessMsg(`Converted to ${type === 1 ? 'Programme' : type === 2 ? 'Portfolio' : 'Project'} "${createdName}" successfully.`)
        await loadData()
        setSelectedInitiative(null)
        if (triggerApproval) {
          await startWorkflowForEntity('default-template', createdId, moduleName, currentUser?.fullname ?? 'System')
        }
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setError('Conversion failed. Please try again.')
      }
    } catch (err: any) {
      console.error('[PipelinePage] handleConvertInitiative exception:', err)
      setError(`Unable to convert initiative to ${type === 1 ? 'programme' : type === 2 ? 'portfolio' : 'project'}.`)
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

  const handleDeleteInitiative = async () => {
    if (!deleteTarget?.pm_initiativeid) return
    setDeleteLoading(true)
    setError(null)
    try {
      await deleteInitiative(deleteTarget.pm_initiativeid)
      setInitiatives(prev => prev.filter(i => i.pm_initiativeid !== deleteTarget.pm_initiativeid))
      setSuccessMsg('Initiative deleted.')
      setDeleteTarget(null)
      if (selectedInitiative?.pm_initiativeid === deleteTarget.pm_initiativeid) {
        setSelectedInitiative(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete initiative.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Detail Drawer subtitle ────────────────────────────────────────────────


  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!selectedInitiative ? (
        <>
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
          {/* ── 1. 4-Column KPI Header ──────────────────────────────────────────── */}
          {/* ── 1. 4-Column KPI Header ──────────────────────────────────────────── */}
          {!loading && (
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {kpiItems.map((kpi, idx) => {
                const themeColor = kpi.color === 'primary.main' ? theme.palette.primary.main
                  : kpi.color === 'success.main' ? theme.palette.success.main
                    : kpi.color === 'warning.main' ? theme.palette.warning.main
                      : kpi.color === 'error.main' ? theme.palette.error.main
                        : kpi.color === 'secondary.main' ? theme.palette.secondary.main
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
                <TableHeader cells={[
                  { label: 'Initiative Name', sortable: true, active: sort.field === 'name', dir: sort.dir, onClick: () => handleSort('name') },
                  { label: 'Business Sponsor', sortable: true, active: sort.field === 'sponsor', dir: sort.dir, onClick: () => handleSort('sponsor') },
                  { label: 'Strategic Alignment', sortable: true, active: sort.field === 'strategicScore', dir: sort.dir, onClick: () => handleSort('strategicScore') },
                  { label: 'Initiative Type', sortable: true, active: sort.field === 'type', dir: sort.dir, onClick: () => handleSort('type') },
                  { label: 'Status', sortable: true, active: sort.field === 'status', dir: sort.dir, onClick: () => handleSort('status') },
                  { label: 'Actions', align: 'center' },
                ]} />
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
                          bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                          '&:hover': { bgcolor: 'action.selected' },
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                {initiative.pm_portfolioname && (
                                  <Typography variant="caption" color="text.secondary">
                                    {initiative.pm_portfolioname}
                                  </Typography>
                                )}
                                {initiative.pm_portfolioname && initiative.pm_programmename && (
                                  <Typography variant="caption" color="text.secondary">
                                    •
                                  </Typography>
                                )}
                                {initiative.pm_programmename && (
                                  <Typography variant="caption" color="text.secondary">
                                    {initiative.pm_programmename}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {initiative.pm_requestedbyname || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrendingUpIcon sx={{ fontSize: 14, color: 'primary.main', opacity: 0.7 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {initiative.pm_strategicalignmentscore ?? '—'} / 100
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {initiative.pm_initiativetype != null ? (
                            <StatusTag
                              label={initiative.pm_initiativetype === 0 ? 'Project' : initiative.pm_initiativetype === 1 ? 'Programme' : initiative.pm_initiativetype === 2 ? 'Portfolio' : 'Unknown'}
                              color={initiative.pm_initiativetype === 0 ? 'primary' : initiative.pm_initiativetype === 1 ? 'secondary' : 'info'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusTag label={statusCfg.label} color={statusCfg.color} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Delete">
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(initiative); }}
                                disabled={!canDelete}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableShell>

            {filteredInitiatives.length > 0 && (
              <TableFooter
                filteredCount={filteredInitiatives.length}
                totalCount={initiatives.length}
                itemLabel="initiative"
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10))
                  setPage(0)
                }}
              />
            )}
          </Paper>
        </>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, mb: 3 }}>
          <Breadcrumbs
            items={[
              { label: 'Pipeline', path: 'list' },
              { label: selectedInitiative.pm_name ?? 'Detail' }
            ]}
            onNavigate={() => handleCloseDetail()}
          />
          <PageHeader
            title={selectedInitiative?.pm_name ?? ''}
            subtitle={selectedInitiative?.pm_requestedbyname ? `Sponsor: ${selectedInitiative.pm_requestedbyname}` : undefined}
            action={selectedInitiative.pm_convertedtoreference ? {
              label: `Go to Converted ${selectedInitiative.pm_initiativetype === 1 ? 'Programme' : selectedInitiative.pm_initiativetype === 2 ? 'Portfolio' : 'Project'}`,
              onClick: () => {
                const targetRef = selectedInitiative.pm_convertedtoreference;
                if (!targetRef) return;
                if (selectedInitiative.pm_initiativetype === 1) {
                  sessionStorage.setItem('preselectProgrammeId', targetRef);
                  if (onNavigate) onNavigate('programmes');
                } else if (selectedInitiative.pm_initiativetype === 2) {
                  sessionStorage.setItem('preselectPortfolioId', targetRef);
                  if (onNavigate) onNavigate('portfolios');
                } else {
                  sessionStorage.setItem('preselectProjectId', targetRef);
                  if (onNavigate) onNavigate('projects');
                }
              },
              variant: 'contained',
              color: 'success'
            } : String(selectedInitiative.pm_pipelinestatus) === '2' ? {
              label: 'Submit for Approval',
              onClick: handleResubmitForApproval,
              disabled: actionLoading,
              variant: 'contained',
              color: 'primary'
            } : undefined}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: -2, mb: 1.5 }}>
            <StatusTag
              label={STATUS_CONFIG[String(selectedInitiative?.pm_pipelinestatus ?? '')]?.label ?? 'Draft'}
              color={STATUS_CONFIG[String(selectedInitiative?.pm_pipelinestatus ?? '')]?.color ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            {selectedInitiative?.pm_portfolioname && (
              <StatusTag label={selectedInitiative.pm_portfolioname} size="small" color="primary" variant="outlined" />
            )}
            {selectedInitiative?.pm_submissiondate && (
              <Chip
                icon={<CalendarTodayIcon sx={{ fontSize: '14px !important', ml: 0.5 }} />}
                label={`Submitted: ${new Date(selectedInitiative.pm_submissiondate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          {/* Workflow Step Milestones */}
          <WorkflowMilestone
            entityId={selectedInitiative.pm_initiativeid || ''}
            moduleName={MODULE_NAMES.PIPELINE.value}
          />



          {/* Approved Info Bar */}
          {String(selectedInitiative.pm_pipelinestatus) === '0' && !selectedInitiative.pm_convertedtoreference && (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: '16px',
                borderColor: 'success.main',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                mb: 3,
                boxShadow: (theme) => `0 2px 12px ${alpha(theme.palette.success.main, 0.08)}`
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', color: '#fff', width: 40, height: 40 }}>
                  <TransformIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
                    Pipeline Approved
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This initiative is approved. You can now execute it by converting it to a full {selectedInitiative.pm_initiativetype === 1 ? 'Programme' : selectedInitiative.pm_initiativetype === 2 ? 'Portfolio' : 'Project'}.
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleConvertToProject}
                disabled={actionLoading}
                sx={{ fontWeight: 600 }}
              >
                {actionLoading ? 'Processing...' : selectedInitiative.pm_initiativetype === 1 ? 'Convert to Programme' : selectedInitiative.pm_initiativetype === 2 ? 'Convert to Portfolio' : 'Convert to Project'}
              </Button>
            </Paper>
          )}

          {/* Deferred/Draft Info Bar */}
          {String(selectedInitiative.pm_pipelinestatus) === '2' && (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: '16px',
                borderColor: 'primary.main',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.05)' : 'rgba(25, 118, 210, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                mb: 3,
                boxShadow: (theme) => `0 2px 12px ${alpha(theme.palette.primary.main, 0.08)}`
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 40, height: 40 }}>
                  <RateReviewIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Submission Ready
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This initiative is currently in deferred/draft status. Submit it to the board to start the workflow review process.
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleResubmitForApproval}
                disabled={actionLoading}
                sx={{ fontWeight: 600 }}
              >
                {actionLoading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </Paper>
          )}

          {/* Main Grid Layout: Overview, Approval Tasks side-by-side; Supporting Documents below */}
          <Grid container spacing={3.5} sx={{ display: 'flex', alignItems: 'stretch', mt: 1.5 }}>
            {/* Overview - 6/12 Width */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'success.main' }} /> Overview
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Business Sponsor</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{selectedInitiative.pm_requestedbyname || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Target Portfolio</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{selectedInitiative.pm_portfolioname || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Initiative Type</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>
                        {selectedInitiative.pm_initiativetype === 0 ? 'Project' : selectedInitiative.pm_initiativetype === 1 ? 'Programme' : selectedInitiative.pm_initiativetype === 2 ? 'Portfolio' : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>RAG Status</Typography>
                      <Box sx={{ mt: 0.25 }}>
                        <StatusTag
                          label={STATUS_CONFIG[String(selectedInitiative?.pm_pipelinestatus ?? '')]?.label ?? 'Draft'}
                          color={STATUS_CONFIG[String(selectedInitiative?.pm_pipelinestatus ?? '')]?.color ?? 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>

                    {/* Cost, Benefits, Priority & Alignment boxes */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, gridColumn: 'span 2', mt: 1 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 40, height: 40, border: '1px solid', borderColor: (theme) => alpha(theme.palette.primary.main, 0.15) }}>
                          <MonetizationOnIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>Est. Cost</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.25, fontFamily: '"Outfit", sans-serif' }}>{selectedInitiative.pm_estimatedcost ? currencyFormatter.format(selectedInitiative.pm_estimatedcost) : '—'}</Typography>
                        </Box>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, 0.08), color: 'success.main', width: 40, height: 40, border: '1px solid', borderColor: (theme) => alpha(theme.palette.success.main, 0.15) }}>
                          <TrendingUpIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>Est. Benefits</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'success.main', mt: 0.25, fontFamily: '"Outfit", sans-serif' }}>{selectedInitiative.pm_estimatedbenefits ? currencyFormatter.format(selectedInitiative.pm_estimatedbenefits) : '—'}</Typography>
                        </Box>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08), color: 'warning.main', width: 40, height: 40, border: '1px solid', borderColor: (theme) => alpha(theme.palette.warning.main, 0.15) }}>
                          <LightbulbIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>Priority Score</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'warning.main', mt: 0.25, fontFamily: '"Outfit", sans-serif' }}>{selectedInitiative.pm_priorityscore ?? '—'}</Typography>
                        </Box>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08), color: 'secondary.main', width: 40, height: 40, border: '1px solid', borderColor: (theme) => alpha(theme.palette.secondary.main, 0.15) }}>
                          <AccountTreeIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>Strategic Alignment</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'secondary.main', mt: 0.25, fontFamily: '"Outfit", sans-serif' }}>{selectedInitiative.pm_strategicalignmentscore ?? '—'} / 100</Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                  <Divider />
                  {selectedInitiative.pm_businesscase && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', mb: 0.5 }}>Business Case</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.825rem' }}>{selectedInitiative.pm_businesscase}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Approval Tasks - 6/12 Width */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <TaskAltIcon sx={{ fontSize: 18, color: 'success.main' }} /> Approval Tasks
                  </Typography>
                </Box>
                <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                  <EntityApprovalTasks
                    entityId={selectedInitiative.pm_initiativeid ?? null}
                    moduleName={MODULE_NAMES.PIPELINE.value}
                    entityLabel="Initiative"
                    tabValue={0}
                    index={0}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Supporting Documents - Full Width */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <FolderIcon sx={{ fontSize: 18, color: 'success.main' }} /> Supporting Documents
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <EntityDocumentsTab
                    entityId={selectedInitiative.pm_initiativeid || ''}
                    moduleName={MODULE_NAMES.PIPELINE.value}
                    canEdit={canEdit}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── 4. Create Initiative Modal ────────────────────────────────────────── */}
      <Dialog
        open={showCreateModal}
        onClose={() => !actionLoading && setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.main' }}>
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
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="pipeline-requestedby-label">Requested By</InputLabel>
                <Select
                  id="pipeline-requestedby-select"
                  labelId="pipeline-requestedby-label"
                  value={createForm._pm_requestedby_value}
                  label="Requested By"
                  onChange={(e) => setCreateForm((f) => ({ ...f, _pm_requestedby_value: e.target.value }))}
                >
                  <MenuItem value="">
                    <em style={{ color: 'text.disabled' }}>Select User</em>
                  </MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.systemuserid} value={u.systemuserid}>
                      {u.fullname}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="pipeline-initiative-type-label">Initiative Type</InputLabel>
                <Select
                  id="pipeline-initiative-type-select"
                  labelId="pipeline-initiative-type-label"
                  value={createForm.pm_initiativetype}
                  label="Initiative Type"
                  onChange={(e) => {
                    const newType = e.target.value as number
                    setCreateForm((f) => {
                      const updated = { ...f, pm_initiativetype: newType }
                      if (newType !== 0) {
                        updated._pm_programme_value = ''
                      }
                      if (newType === 2) {
                        updated._pm_portfolio_value = ''
                        updated._pm_programme_value = ''
                      }
                      return updated
                    })
                  }}
                >
                  <MenuItem value={0}>Project</MenuItem>
                  <MenuItem value={1}>Programme</MenuItem>
                  <MenuItem value={2}>Portfolio</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {createForm.pm_initiativetype !== 2 && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pipeline-portfolio-label">Portfolio (optional)</InputLabel>
                  <Select
                    id="pipeline-portfolio-select"
                    labelId="pipeline-portfolio-label"
                    value={createForm._pm_portfolio_value}
                    label="Portfolio (optional)"
                    onChange={(e) => {
                      const newPortfolioId = e.target.value
                      setCreateForm((f) => {
                        const updated = { ...f, _pm_portfolio_value: newPortfolioId }
                        const selectedProg = programmes.find(p => p.pm_programmeid === f._pm_programme_value)
                        if (selectedProg && selectedProg._pm_portfolio_value !== newPortfolioId) {
                          updated._pm_programme_value = ''
                        }
                        return updated
                      })
                    }}
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
            )}

            {createForm.pm_initiativetype === 0 && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pipeline-programme-label">Programme (optional)</InputLabel>
                  <Select
                    id="pipeline-programme-select"
                    labelId="pipeline-programme-label"
                    value={createForm._pm_programme_value}
                    label="Programme (optional)"
                    onChange={(e) => setCreateForm((f) => ({ ...f, _pm_programme_value: e.target.value }))}
                  >
                    <MenuItem value="">
                      <em style={{ color: 'text.disabled' }}>No programme</em>
                    </MenuItem>
                    {programmes
                      .filter(p => !createForm._pm_portfolio_value || p._pm_portfolio_value === createForm._pm_portfolio_value)
                      .map((p) => (
                        <MenuItem key={p.pm_programmeid} value={p.pm_programmeid}>
                          {p.pm_programmename}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {/* ── Section: Financial Estimates ── */}
          {createForm.pm_initiativetype !== 2 && (
            <>
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
                    helperText={hasBudgetError && parentBudgetInfo ? `Exceeds remaining ${parentBudgetInfo.label.toLowerCase()} budget by ${currencyFormatter.format(createForm.pm_estimatedcosteur - parentBudgetInfo.availableBudget)}` : ''}
                    slotProps={{
                      input: { startAdornment: <CurrencyExchangeIcon sx={{ fontSize: 16, mr: 0.75, color: 'action.active' }} /> },
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
                      input: { startAdornment: <TrendingUpIcon sx={{ fontSize: 16, mr: 0.75, color: 'action.active' }} /> },
                    }}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {parentBudgetInfo && (() => {
            const allocatedPct = Math.min(100, Math.round((parentBudgetInfo.usedBudget / parentBudgetInfo.parentBudget) * 100))
            const isOverBudget = parentBudgetInfo.availableBudget <= 0
            return (
              <Paper variant="outlined" sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} /> {parentBudgetInfo.label} Budget Allocation
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>{parentBudgetInfo.label} Budget</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.md }}>
                      {currencyFormatter.format(parentBudgetInfo.parentBudget)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Allocated</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'warning.main', fontSize: fontSizes.md }}>
                      {currencyFormatter.format(parentBudgetInfo.usedBudget)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Available Remaining</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: isOverBudget ? 'error.main' : 'success.main', fontSize: fontSizes.lg }}>
                      {currencyFormatter.format(parentBudgetInfo.availableBudget)}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Allocation Usage</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{allocatedPct}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={allocatedPct}
                    color={isOverBudget ? 'error' : allocatedPct > 80 ? 'warning' : 'success'}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>

                {isOverBudget && (
                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
                    ⚠️ No remaining budget in this {parentBudgetInfo.label.toLowerCase()}.
                  </Typography>
                )}
              </Paper>
            )
          })()}

          {hasBudgetError && parentBudgetInfo && (
            <Box sx={{ mb: 2, p: 1.25, bgcolor: alpha(theme.palette.error.main, 0.1), border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.2), display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main', flexShrink: 0 }} />
              <Typography variant="caption" color="error.dark" sx={{ fontWeight: 600 }}>
                Estimated cost exceeds available {parentBudgetInfo.label.toLowerCase()} budget by {currencyFormatter.format(createForm.pm_estimatedcosteur - parentBudgetInfo.availableBudget)}.
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
          <Box sx={{ p: 2.5, border: '1px dashed', borderColor: 'divider', textAlign: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
              sx={{ mb: stagedFiles.length > 0 ? 2 : 0 }}
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
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* ── Status badge ── */}
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: isDark ? 'background.paper' : alpha(theme.palette.info.main, 0.1), border: '1px solid', borderColor: isDark ? 'divider' : alpha(theme.palette.info.main, 0.2) }}>
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
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInitiative}
            variant="contained"
            disabled={!createForm.pm_initiativename.trim() || actionLoading}
            startIcon={actionLoading ? undefined : <AddIcon />}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
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
        onConvert={handleConvertInitiative}
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
            sx: { overflow: 'visible' },
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

      {/* Budget Warning Dialog */}
      <Dialog
        open={showBudgetWarningDialog}
        onClose={() => setShowBudgetWarningDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main', fontWeight: 700 }}>
          <WarningAmberIcon color="warning" /> Budget Limit Warning
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            The estimated cost of this initiative exceeds the available {parentBudgetInfo ? parentBudgetInfo.label.toLowerCase() : 'parent'} budget by <strong>{parentBudgetInfo ? currencyFormatter.format(createForm.pm_estimatedcosteur - parentBudgetInfo.availableBudget) : ''}</strong>.
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Do you still want to proceed and create this initiative?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setShowBudgetWarningDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowBudgetWarningDialog(false)
              executeCreateInitiative()
            }}
            variant="contained"
            color="warning"
            sx={{ fontWeight: 600 }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Initiative"
        message={`Are you sure you want to delete ${deleteTarget?.pm_name || 'this initiative'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInitiative}
        loading={deleteLoading}
      />
    </Box>
  )
}