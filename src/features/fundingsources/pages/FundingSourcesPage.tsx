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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  alpha,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DescriptionIcon from '@mui/icons-material/Description'
import BusinessIcon from '@mui/icons-material/Business'
import SavingsIcon from '@mui/icons-material/Savings'
import EuroIcon from '@mui/icons-material/Euro'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useAuthorization } from '@/hooks/useAuthorization'
import {
  Pm_portfoliosService,
  Pm_projectsService,
  Pm_programmesService,
} from '@/generated'
import { unwrapList, unwrapSingle } from '@/services/common'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchFundingSources,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource,
  startWorkflowForEntity,
} from '@/services'
import type { FundingSourceModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, Breadcrumbs, SearchFilterBar, ExportButton, StatusTag, ActionIcon, WorkflowMilestone, TabPanel } from '@/components/common'
import type { KpiCardItem, FilterOption, ExportColumn } from '@/components/common'
import { CURRENCY_DISPLAY } from '@/constants/currency'
import { currencyFormatter } from '@/utils/formatters'
import { MODULE_NAMES } from '@/constants/moduleNames'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FUNDING_TYPE_LABELS: Record<string, string> = {
  '0': 'Capital',
  '1': 'EU',
  '2': 'Revenue',
  '3': 'Grant',
}

const FUNDING_TYPE_COLORS: Record<string, 'primary' | 'info' | 'success' | 'secondary'> = {
  '0': 'primary',
  '1': 'info',
  '2': 'success',
  '3': 'secondary',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'Exhausted',
}

const STATUS_COLORS: Record<string, 'success' | 'error'> = {
  '0': 'success',
  '1': 'error',
}

const FUNDING_TYPE_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Types' },
  { value: '0', label: 'Capital' },
  { value: '1', label: 'EU' },
  { value: '2', label: 'Revenue' },
  { value: '3', label: 'Grant' },
]

const fundingExportColumns: ExportColumn[] = [
  { key: 'pm_fundingsourcename', label: 'Source' },
  { key: 'pm_fundingtype', label: 'Type' },
  { key: 'pm_fundingstatus', label: 'Status' },
  { key: 'pm_totalamounteur', label: `Total Amount (${CURRENCY_DISPLAY})` },
  { key: 'pm_allocatedamounteur', label: `Allocated (${CURRENCY_DISPLAY})` },
  { key: 'pm_availableamounteur', label: `Available (${CURRENCY_DISPLAY})` },
  { key: 'pm_fundingbody', label: 'Funding Body' },
  { key: 'pm_portfolioname', label: 'Portfolio' },
  { key: 'pm_effectivefromdate', label: 'Effective From' },
  { key: 'pm_effectivetodate', label: 'Effective To' },
]

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'Active' },
  { value: '1', label: 'Exhausted' },
]

type SortField = 'name' | 'type' | 'status' | 'total' | 'allocated' | 'available' | 'body' | 'fromdate'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

// local currencyFormatter removed to use imported one

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FundingSourcesPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('FUNDING_SOURCES', 'create')
  const { allowed: canEdit } = useAuthorization('FUNDING_SOURCES', 'update')
  const { allowed: canDelete } = useAuthorization('FUNDING_SOURCES', 'delete')

  // Data state
  const [fundingSources, setFundingSources] = useState<FundingSourceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Detail panel state
  const [selectedSource, setSelectedSource] = useState<FundingSourceModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Handlers
  const handleCloseDetail = useCallback(() => setSelectedSource(null), [])

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingSource, setEditingSource] = useState<FundingSourceModel | null>(null)
  const [formData, setFormData] = useState({
    pm_fundingsourcename: '',
    pm_fundingtype: 0,
    pm_fundingstatus: 0,
    pm_fundingbody: '',
    pm_totalamounteur: 0,
    pm_allocatedamounteur: 0,
    pm_availableamounteur: 0,
    pm_effectivefromdate: '',
    pm_effectivetodate: '',
    pm_regardingidtype: '',
    _pm_regardingid_value: '',
  })

  const [portfoliosList, setPortfoliosList] = useState<{ id: string, name: string }[]>([])
  const [projectsList, setProjectsList] = useState<{ id: string, name: string }[]>([])
  const [programmesList, setProgrammesList] = useState<{ id: string, name: string }[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)

  // Live budget and dates state
  const [dbApprovedBudget, setDbApprovedBudget] = useState<number>(0)
  const [loadingBudget, setLoadingBudget] = useState(false)
  const [entityDates, setEntityDates] = useState<{ start: string | null, end: string | null }>({ start: null, end: null })

  // Options Modal state for budget excess
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<any>(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchFundingSources()
      setFundingSources(list)
    } catch {
      setError('Unable to load funding source data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true)
      try {
        const portRes = await Pm_portfoliosService.getAll({ select: ['pm_portfolioid', 'pm_portfolioname'] })
        if (portRes.success) {
          setPortfoliosList(unwrapList<any>(portRes).map(p => ({ id: p.pm_portfolioid, name: p.pm_portfolioname })))
        }
        const projRes = await Pm_projectsService.getAll({ select: ['pm_projectid', 'pm_projectname'] })
        if (projRes.success) {
          setProjectsList(unwrapList<any>(projRes).map(p => ({ id: p.pm_projectid, name: p.pm_projectname })))
        }
        const progRes = await Pm_programmesService.getAll({ select: ['pm_programmeid', 'pm_programmename'] })
        if (progRes.success) {
          setProgrammesList(unwrapList<any>(progRes).map(p => ({ id: p.pm_programmeid, name: p.pm_programmename })))
        }
      } catch (err) {
        console.error('Error loading lookup lists:', err)
      } finally {
        setLoadingLookups(false)
      }
    }
    loadLookups()
  }, [])

  // Load target budget and dates when connection changes
  useEffect(() => {
    if (showFormModal && formData._pm_regardingid_value && formData.pm_regardingidtype) {
      const loadBudgetAndDates = async () => {
        setLoadingBudget(true)
        try {
          if (formData.pm_regardingidtype === 'pm_portfolios') {
            const res = await Pm_portfoliosService.get(formData._pm_regardingid_value, { select: ['pm_approvedbudgeteur', 'pm_startdate', 'pm_enddate'] })
            if (res.success) {
              const item = unwrapSingle<any>(res)
              setDbApprovedBudget(Number(item?.pm_approvedbudgeteur ?? 0))
              setEntityDates({ start: item?.pm_startdate ?? null, end: item?.pm_enddate ?? null })
            }
          } else if (formData.pm_regardingidtype === 'pm_projects') {
            const res = await Pm_projectsService.get(formData._pm_regardingid_value, { select: ['pm_approvedbudget', 'pm_plannedstartdate', 'pm_plannedenddate'] })
            if (res.success) {
              const item = unwrapSingle<any>(res)
              setDbApprovedBudget(Number(item?.pm_approvedbudget ?? 0))
              setEntityDates({ start: item?.pm_plannedstartdate ?? null, end: item?.pm_plannedenddate ?? null })
            }
          } else if (formData.pm_regardingidtype === 'pm_programmes') {
            const res = await Pm_programmesService.get(formData._pm_regardingid_value, { select: ['pm_budgeteur', 'pm_startdate', 'pm_enddate'] })
            if (res.success) {
              const item = unwrapSingle<any>(res)
              setDbApprovedBudget(Number(item?.pm_budgeteur ?? 0))
              setEntityDates({ start: item?.pm_startdate ?? null, end: item?.pm_enddate ?? null })
            }
          }
        } catch (err) {
          console.error('Error loading budget and dates:', err)
        } finally {
          setLoadingBudget(false)
        }
      }
      loadBudgetAndDates()
    } else {
      setDbApprovedBudget(0)
      setEntityDates({ start: null, end: null })
    }
  }, [formData._pm_regardingid_value, formData.pm_regardingidtype, showFormModal])

  const isTimelineOutside = useMemo(() => {
    if (!formData.pm_effectivefromdate && !formData.pm_effectivetodate) return false
    if (!entityDates.start && !entityDates.end) return false

    const fundingStart = formData.pm_effectivefromdate ? new Date(formData.pm_effectivefromdate) : null
    const fundingEnd = formData.pm_effectivetodate ? new Date(formData.pm_effectivetodate) : null
    const entityStart = entityDates.start ? new Date(entityDates.start) : null
    const entityEnd = entityDates.end ? new Date(entityDates.end) : null

    if (fundingStart && entityStart && fundingStart < entityStart) return true
    if (fundingEnd && entityEnd && fundingEnd > entityEnd) return true

    return false
  }, [formData.pm_effectivefromdate, formData.pm_effectivetodate, entityDates])

  const liveExistingFundingTotal = useMemo(() => {
    if (!formData._pm_regardingid_value) return 0
    return fundingSources
      .filter((s) => s._pm_regardingid_value === formData._pm_regardingid_value)
      .filter((s) => !editingSource || s.pm_fundingsourceid !== editingSource.pm_fundingsourceid)
      .reduce((sum, s) => sum + Number(s.pm_totalamounteur ?? 0), 0)
  }, [fundingSources, formData._pm_regardingid_value, editingSource])

  const liveTotalFunding = liveExistingFundingTotal + Number(formData.pm_totalamounteur || 0)
  const isBudgetExceeded = formData._pm_regardingid_value && dbApprovedBudget > 0 && liveTotalFunding > dbApprovedBudget
  const addableAmount = Math.max(0, dbApprovedBudget - liveExistingFundingTotal)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = fundingSources.length
    const active = fundingSources.filter((s) => String(s.pm_fundingstatus) === '0').length
    const totalAmount = fundingSources.reduce((s, fs) => s + (fs.pm_totalamounteur ?? 0), 0)
    const allocatedAmount = fundingSources.reduce((s, fs) => s + (fs.pm_allocatedamounteur ?? 0), 0)
    const exhausted = fundingSources.filter((s) => String(s.pm_fundingstatus) === '1').length
    return [
      {
        label: 'Total Sources',
        value: total,
        subtitle: `${active} active, ${exhausted} exhausted`,
        icon: <AccountBalanceIcon />,
        color: 'primary.main',
      },
      {
        label: 'Total Funding',
        value: currencyFormatter.format(totalAmount),
        subtitle: 'Across all sources',
        icon: <EuroIcon />,
        color: 'success.main',
      },
      {
        label: 'Allocated',
        value: currencyFormatter.format(allocatedAmount),
        subtitle: `${totalAmount > 0 ? ((allocatedAmount / totalAmount) * 100).toFixed(0) : 0}% of total`,
        icon: <SavingsIcon />,
        color: 'info.main',
      },
      {
        label: 'Available',
        value: currencyFormatter.format(Math.max(0, totalAmount - allocatedAmount)),
        subtitle: `${totalAmount > 0 ? ((Math.max(0, totalAmount - allocatedAmount) / totalAmount) * 100).toFixed(0) : 0}% unallocated`,
        icon: <AttachMoneyIcon />,
        color: 'warning.main',
      },
    ]
  }, [fundingSources])

  // ── Filtered & Sorted ─────────────────────────────────────────────────────
  const filteredSources = useMemo(() => {
    let list = [...fundingSources]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          s.pm_fundingsourcename?.toLowerCase().includes(q) ||
          s.pm_fundingbody?.toLowerCase().includes(q) ||
          s.pm_portfolioname?.toLowerCase().includes(q) ||
          s.pm_programmelookupname?.toLowerCase().includes(q)
      )
    }

    if (typeFilter) {
      list = list.filter((s) => String(s.pm_fundingtype) === typeFilter)
    }

    if (statusFilter) {
      list = list.filter((s) => String(s.pm_fundingstatus) === statusFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_fundingsourcename ?? '').localeCompare(b.pm_fundingsourcename ?? '')
          break
        case 'type':
          cmp = String(a.pm_fundingtype ?? '').localeCompare(String(b.pm_fundingtype ?? ''))
          break
        case 'status':
          cmp = String(a.pm_fundingstatus ?? '').localeCompare(String(b.pm_fundingstatus ?? ''))
          break
        case 'total':
          cmp = (a.pm_totalamounteur ?? 0) - (b.pm_totalamounteur ?? 0)
          break
        case 'allocated':
          cmp = (a.pm_allocatedamounteur ?? 0) - (b.pm_allocatedamounteur ?? 0)
          break
        case 'available':
          cmp = ((a.pm_totalamounteur ?? 0) - (a.pm_allocatedamounteur ?? 0)) - ((b.pm_totalamounteur ?? 0) - (b.pm_allocatedamounteur ?? 0))
          break
        case 'body':
          cmp = (a.pm_fundingbody ?? '').localeCompare(b.pm_fundingbody ?? '')
          break
        case 'fromdate':
          cmp = (a.pm_effectivefromdate ?? '').localeCompare(b.pm_effectivefromdate ?? '')
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [fundingSources, searchQuery, typeFilter, statusFilter, sort])

  const paginatedSources = useMemo(
    () => filteredSources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredSources, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(0) }, [])
  const handleTypeFilterChange = useCallback((v: string) => { setTypeFilter(v); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((v: string) => { setStatusFilter(v); setPage(0) }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((source: FundingSourceModel) => {
    setSelectedSource(source)
    setDetailTab(0)
  }, [])



  // ── Form open for create/edit ──
  const openCreateForm = useCallback(() => {
    setEditingSource(null)
    setError(null)
    setFormData({
      pm_fundingsourcename: '',
      pm_fundingtype: 0,
      pm_fundingstatus: 0,
      pm_fundingbody: '',
      pm_totalamounteur: 0,
      pm_allocatedamounteur: 0,
      pm_availableamounteur: 0,
      pm_effectivefromdate: '',
      pm_effectivetodate: '',
      pm_regardingidtype: '',
      _pm_regardingid_value: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((source: FundingSourceModel) => {
    setEditingSource(source)
    setError(null)
    setFormData({
      pm_fundingsourcename: source.pm_fundingsourcename ?? '',
      pm_fundingtype: Number(source.pm_fundingtype) || 0,
      pm_fundingstatus: Number(source.pm_fundingstatus) || 0,
      pm_fundingbody: source.pm_fundingbody ?? '',
      pm_totalamounteur: source.pm_totalamounteur ?? 0,
      pm_allocatedamounteur: source.pm_allocatedamounteur ?? 0,
      pm_availableamounteur: source.pm_availableamounteur ?? 0,
      pm_effectivefromdate: source.pm_effectivefromdate?.split('T')[0] ?? '',
      pm_effectivetodate: source.pm_effectivetodate?.split('T')[0] ?? '',
      pm_regardingidtype: source.pm_regardingidtype ?? '',
      _pm_regardingid_value: source._pm_regardingid_value ?? '',
    })
    setShowFormModal(true)
  }, [])

  // ── Save ──
  const fetchApprovedBudget = async (entityId: string, entityType: string): Promise<number> => {
    try {
      if (entityType === 'pm_portfolios') {
        const res = await Pm_portfoliosService.get(entityId, { select: ['pm_approvedbudgeteur'] })
        if (res.success) {
          const item = unwrapSingle<any>(res)
          return Number(item?.pm_approvedbudgeteur ?? 0)
        }
      } else if (entityType === 'pm_projects') {
        const res = await Pm_projectsService.get(entityId, { select: ['pm_approvedbudget'] })
        if (res.success) {
          const item = unwrapSingle<any>(res)
          return Number(item?.pm_approvedbudget ?? 0)
        }
      } else if (entityType === 'pm_programmes') {
        const res = await Pm_programmesService.get(entityId, { select: ['pm_budgeteur'] })
        if (res.success) {
          const item = unwrapSingle<any>(res)
          return Number(item?.pm_budgeteur ?? 0)
        }
      }
    } catch (err) {
      console.error('Error fetching approved budget:', err)
    }
    return 0
  }

  const handleExecuteSave = async (raiseChangeRequest: boolean) => {
    setShowOptionsModal(false)
    if (!pendingPayload) return
    setActionLoading(true)
    try {
      if (editingSource?.pm_fundingsourceid) {
        await updateFundingSource(editingSource.pm_fundingsourceid, pendingPayload)
        setSuccessMsg(
          raiseChangeRequest
            ? 'Funding source updated. Please raise a Change Request to increase the approved budget.'
            : 'Funding source updated. Excess amount has been placed in Unallocated Reserve.'
        )
      } else {
        const created = await createFundingSource(pendingPayload)
        if (created?.pm_fundingsourceid) {
          try {
            await startWorkflowForEntity('default-template', created.pm_fundingsourceid, MODULE_NAMES.FUNDING_SOURCES.value, 'System')
          } catch (wfErr) {
            console.error('[FundingSourcesPage] Failed to initiate workflow:', wfErr)
          }
        }
        setSuccessMsg(
          raiseChangeRequest
            ? 'Funding source created. Please raise a Change Request to increase the approved budget.'
            : 'Funding source created. Excess amount has been placed in Unallocated Reserve.'
        )
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 5000)
      await loadData()
    } catch {
      setError('Unable to save funding source.')
    } finally {
      setActionLoading(false)
      setPendingPayload(null)
    }
  }

  const handleSaveSource = async () => {
    if (!formData.pm_fundingsourcename.trim()) {
      setError('Funding source name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = {
        pm_fundingsourcename: formData.pm_fundingsourcename,
        pm_fundingtype: formData.pm_fundingtype,
        pm_fundingstatus: formData.pm_fundingstatus,
        pm_fundingbody: formData.pm_fundingbody || undefined,
        pm_totalamounteur: formData.pm_totalamounteur || 0,
        pm_allocatedamounteur: formData.pm_allocatedamounteur || 0,
        pm_effectivefromdate: formData.pm_effectivefromdate || undefined,
        pm_effectivetodate: formData.pm_effectivetodate || undefined,
        _pm_regardingid_value: formData._pm_regardingid_value || undefined,
        pm_regardingidtype: formData.pm_regardingidtype || undefined,
      }

      if (editingSource?.pm_fundingsourceid) {
        await updateFundingSource(editingSource.pm_fundingsourceid, payload)
        setSuccessMsg('Funding source updated successfully.')
      } else {
        const created = await createFundingSource(payload)
        if (created?.pm_fundingsourceid) {
          try {
            await startWorkflowForEntity('default-template', created.pm_fundingsourceid, MODULE_NAMES.FUNDING_SOURCES.value, 'System')
          } catch (wfErr) {
            console.error('[FundingSourcesPage] Failed to initiate workflow:', wfErr)
          }
        }
        setSuccessMsg('Funding source created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingSource ? 'Unable to update funding source.' : 'Unable to create funding source.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ──
  const handleDeleteSource = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteFundingSource(deleteConfirm)
      setSuccessMsg('Funding source removed successfully.')
      setDeleteConfirm(null)
      if (selectedSource?.pm_fundingsourceid === deleteConfirm) {
        setSelectedSource(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete funding source.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Get sort direction helper ──
  const getSortDir = (field: SortField): 'asc' | 'desc' =>
    sort.field === field ? sort.dir : 'asc'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Funding Sources"
        subtitle="Manage funding sources — capital, EU grants, revenue, and other funding streams with allocation tracking and effective dates."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredSources} columns={fundingExportColumns} filename="FundingSources" />
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                Add Source
              </Button>
            )}
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Row ──────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── Funding Sources Grid ─────────────────────── */}
      {!selectedSource ? (
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name, body, reference code..."
          filterValue={typeFilter}
          onFilterChange={handleTypeFilterChange}
          filterLabel="Type"
          filterOptions={FUNDING_TYPE_FILTER_OPTIONS}
          extraFilters={
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="funding-status-filter-label">Status</InputLabel>
              <Select
                id="funding-status-filter-select"
                labelId="funding-status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          }
          onClear={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter(''); setPage(0) }}
        />

        <TableShell
          loading={loading}
          empty={filteredSources.length === 0}
          emptyIcon={<AccountBalanceIcon />}
          emptyTitle={searchQuery || typeFilter || statusFilter ? 'No funding sources match your criteria.' : 'No funding sources registered yet.'}
          emptyAction={!searchQuery && !typeFilter && !statusFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add your first funding source
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'name'} direction={getSortDir('name')} onClick={() => handleSort('name')} sx={{ fontWeight: 700 }}>
                    Source
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'type'} direction={getSortDir('type')} onClick={() => handleSort('type')} sx={{ fontWeight: 700 }}>
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'status'} direction={getSortDir('status')} onClick={() => handleSort('status')} sx={{ fontWeight: 700 }}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'total'} direction={getSortDir('total')} onClick={() => handleSort('total')} sx={{ fontWeight: 700 }}>
                    Total Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'allocated'} direction={getSortDir('allocated')} onClick={() => handleSort('allocated')} sx={{ fontWeight: 700 }}>
                    Allocated
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'available'} direction={getSortDir('available')} onClick={() => handleSort('available')} sx={{ fontWeight: 700 }}>
                    Available
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'body'} direction={getSortDir('body')} onClick={() => handleSort('body')} sx={{ fontWeight: 700 }}>
                    Funding Body
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'fromdate'} direction={getSortDir('fromdate')} onClick={() => handleSort('fromdate')} sx={{ fontWeight: 700 }}>
                    Effective
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSources.map((source, idx) => {
                const totalAmt = source.pm_totalamounteur ?? 0
                const allocatedAmt = source.pm_allocatedamounteur ?? 0
                const availableAmt = totalAmt - allocatedAmt
                const utilPct = totalAmt > 0 ? (allocatedAmt / totalAmt) * 100 : 0
                return (
                  <TableRow
                    key={source.pm_fundingsourceid}
                    hover
                    onClick={() => handleRowClick(source)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                      '&:hover': { bgcolor: 'action.selected' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                          {(source.pm_fundingsourcename ?? 'F').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {source.pm_fundingsourcename ?? 'Unnamed Source'}
                          </Typography>
                          {source.pm_fundingbody && (
                            <Typography variant="caption" color="text.secondary">
                              {source.pm_fundingbody}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={FUNDING_TYPE_LABELS[String(source.pm_fundingtype ?? '')] ?? '—'}
                        color={FUNDING_TYPE_COLORS[String(source.pm_fundingtype ?? '')] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={STATUS_LABELS[String(source.pm_fundingstatus ?? '')] ?? '—'}
                        color={STATUS_COLORS[String(source.pm_fundingstatus ?? '')] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                        {currencyFormatter.format(totalAmt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                        {currencyFormatter.format(allocatedAmt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm, color: availableAmt > 0 ? 'success.main' : 'text.secondary' }}>
                          {currencyFormatter.format(Math.max(0, availableAmt))}
                        </Typography>
                        <Box
                          sx={{
                            width: 60,
                            height: 4,
                            borderRadius: 1.5,
                            bgcolor: isDark ? '#334155' : '#e2e8f0',
                            overflow: 'hidden',
                            ml: 'auto',
                            mt: 0.25,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(utilPct, 100)}%`,
                              height: '100%',
                              bgcolor: utilPct > 90 ? 'error.main' : utilPct > 70 ? 'warning.main' : 'success.main',
                              borderRadius: 1.5,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {source.pm_fundingbody || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }} color="text.secondary">
                        {source.pm_effectivefromdate
                          ? new Date(source.pm_effectivefromdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                        {source.pm_effectivetodate && (
                          <> — {new Date(source.pm_effectivetodate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredSources.length > 0 && (
          <TableFooter
            filteredCount={filteredSources.length}
            totalCount={fundingSources.length}
            itemLabel="funding source"
            totals={[
              { label: 'Active', value: `${fundingSources.filter((s) => String(s.pm_fundingstatus) === '0').length}` },
              { label: 'Exhausted', value: `${fundingSources.filter((s) => String(s.pm_fundingstatus) === '1').length}` },
            ]}
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
      ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, mb: 3 }}>
        <Breadcrumbs
          items={[
            { label: 'Funding Sources', path: 'list' },
            { label: selectedSource?.pm_fundingsourcename ?? 'Detail' }
          ]}
          onNavigate={() => handleCloseDetail()}
        />
        <PageHeader
          title={selectedSource?.pm_fundingsourcename ?? ''}
          subtitle={
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <StatusTag
                label={FUNDING_TYPE_LABELS[String(selectedSource?.pm_fundingtype ?? '')]}
                color={FUNDING_TYPE_COLORS[String(selectedSource?.pm_fundingtype ?? '')] ?? 'default'}
              />
              <StatusTag
                label={STATUS_LABELS[String(selectedSource?.pm_fundingstatus ?? '')]}
                color={STATUS_COLORS[String(selectedSource?.pm_fundingstatus ?? '')] ?? 'default'}
              />
              {selectedSource?.pm_fundingbody && (
                <Typography variant="body2" color="text.secondary">
                  {selectedSource.pm_fundingbody}
                </Typography>
              )}
            </Box>
          }
          actionElement={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {canEdit && (
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => selectedSource && openEditForm(selectedSource)} sx={{ borderRadius: 1.5 }}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => selectedSource?.pm_fundingsourceid && setDeleteConfirm(selectedSource.pm_fundingsourceid)} sx={{ borderRadius: 1.5 }}>
                  Delete
                </Button>
              )}
            </Box>
          }
        />

        {selectedSource && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                {/* Funding Allocation */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    <SavingsIcon sx={{ fontSize: 16 }} /> Funding Allocation
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'success.main' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Total Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base, fontFamily: '"JetBrains Mono", monospace' }}>
                        {currencyFormatter.format(selectedSource.pm_totalamounteur ?? 0)}
                      </Typography>
                    </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                            Allocated
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base, fontFamily: '"JetBrains Mono", monospace' }}>
                            {currencyFormatter.format(selectedSource.pm_allocatedamounteur ?? 0)}
                          </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'warning.main' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                            Available
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base, fontFamily: '"JetBrains Mono", monospace' }}>
                            {currencyFormatter.format(Math.max(0, (selectedSource.pm_totalamounteur ?? 0) - (selectedSource.pm_allocatedamounteur ?? 0)))}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>

                    <Divider />

                    {/* Source Details */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                        <DescriptionIcon sx={{ fontSize: 16 }} /> Source Details
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{FUNDING_TYPE_LABELS[String(selectedSource.pm_fundingtype ?? '')] ?? '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Status</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{STATUS_LABELS[String(selectedSource.pm_fundingstatus ?? '')] ?? '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Funding Body</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSource.pm_fundingbody || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reference Code</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSource.pm_fundingbody || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Effective From</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedSource.pm_effectivefromdate
                              ? new Date(selectedSource.pm_effectivefromdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Effective To</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedSource.pm_effectivetodate
                              ? new Date(selectedSource.pm_effectivetodate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </Typography>
                        </Box>
                        {selectedSource.pm_portfolioname && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Portfolio</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSource.pm_portfolioname}</Typography>
                          </Box>
                        )}
                        {selectedSource.pm_programmelookupname && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Programme</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSource.pm_programmelookupname}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Box>
        )}
      </Box>
      )}

      {/* ── Create/Edit Modal ──────────────────────── */}
      <Dialog
        open={showFormModal}
        onClose={() => !actionLoading && setShowFormModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', borderRadius: 1.5 }}>
            {editingSource ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AccountBalanceIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingSource ? 'Edit Funding Source' : 'Add Funding Source'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
          {isBudgetExceeded && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                borderRadius: '16px',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.05)' : 'rgba(237, 108, 2, 0.02)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.warning.main, 0.08)}`,
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
              }}
            >
              <Avatar sx={{ bgcolor: 'warning.main', color: '#fff', width: 36, height: 36 }}>
                <WarningAmberIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', mb: 0.5, fontFamily: '"Outfit", sans-serif' }}>
                  Budget Limit Exceeded
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                  Total funding for this entity (<span style={{ color: theme.palette.warning.main, fontWeight: 800 }}>{currencyFormatter.format(liveTotalFunding)}</span>) exceeds the approved budget (<span style={{ color: theme.palette.success.main, fontWeight: 800 }}>{currencyFormatter.format(dbApprovedBudget)}</span>). The maximum amount you can add without exceeding the budget is <span style={{ color: theme.palette.success.main, fontWeight: 800 }}>{currencyFormatter.format(addableAmount)}</span>. If you submit this, the excess amount of <span style={{ color: theme.palette.error.main, fontWeight: 800 }}>{currencyFormatter.format(liveTotalFunding - dbApprovedBudget)}</span> will be placed in the Unallocated Reserve. If you do not intend to do so, please click Cancel and first raise the budget via a Change Request.
                </Typography>
              </Box>
            </Paper>
          )}
          {isTimelineOutside && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3.5,
                borderRadius: '16px',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.05)' : 'rgba(237, 108, 2, 0.02)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.warning.main, 0.08)}`,
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
              }}
            >
              <Avatar sx={{ bgcolor: 'warning.main', color: '#fff', width: 36, height: 36 }}>
                <WarningAmberIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', mb: 0.5, fontFamily: '"Outfit", sans-serif' }}>
                  Timeline Warning
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.6, mb: 1.5 }}>
                  The funding timeline falls outside the {formData.pm_regardingidtype === 'pm_portfolios' ? 'Portfolio' : formData.pm_regardingidtype === 'pm_projects' ? 'Project' : 'Programme'} dates (Start: <strong>{entityDates.start ? new Date(entityDates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>, End: <strong>{entityDates.end ? new Date(entityDates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>). Please confirm this is correct for pre-planning or extension activities.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      pm_effectivefromdate: entityDates.start ? entityDates.start.split('T')[0] : '',
                      pm_effectivetodate: entityDates.end ? entityDates.end.split('T')[0] : '',
                    })
                  }}
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                >
                  Set Dates to Entity Timeline
                </Button>
              </Box>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingSource
              ? `Update details for ${editingSource.pm_fundingsourcename}.`
              : 'Register a new funding source with type, allocation details, and effective dates.'}
          </Typography>

          {/* Basic Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BusinessIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Source Name"
                required
                fullWidth
                size="small"
                value={formData.pm_fundingsourcename}
                onChange={(e) => setFormData((f) => ({ ...f, pm_fundingsourcename: e.target.value }))}
                placeholder="e.g., EU Horizon Grant 2026"
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="funding-type-label">Funding Type</InputLabel>
                <Select
                  id="funding-type-select"
                  labelId="funding-type-label"
                  value={formData.pm_fundingtype}
                  label="Funding Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_fundingtype: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={0}>Capital</MenuItem>
                  <MenuItem value={1}>EU</MenuItem>
                  <MenuItem value={2}>Revenue</MenuItem>
                  <MenuItem value={3}>Grant</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Funding Body"
                fullWidth
                size="small"
                value={formData.pm_fundingbody}
                onChange={(e) => setFormData((f) => ({ ...f, pm_fundingbody: e.target.value }))}
                placeholder="e.g., European Commission"
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
          </Grid>

          {/* Regarding Connection */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Regarding Connection
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="regarding-type-label">Regarding Type</InputLabel>
                <Select
                  labelId="regarding-type-label"
                  value={formData.pm_regardingidtype}
                  label="Regarding Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_regardingidtype: e.target.value as string, _pm_regardingid_value: '' }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">None (Standalone)</MenuItem>
                  <MenuItem value="pm_portfolios">Portfolio</MenuItem>
                  <MenuItem value="pm_programmes">Programme</MenuItem>
                  <MenuItem value="pm_projects">Project</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" disabled={!formData.pm_regardingidtype || loadingLookups}>
                <InputLabel id="regarding-record-label">Regarding Record</InputLabel>
                <Select
                  labelId="regarding-record-label"
                  value={formData._pm_regardingid_value}
                  label="Regarding Record"
                  onChange={(e) => setFormData((f) => ({ ...f, _pm_regardingid_value: e.target.value as string }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">Select Record...</MenuItem>
                  {formData.pm_regardingidtype === 'pm_portfolios' && portfoliosList.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                  {formData.pm_regardingidtype === 'pm_programmes' && programmesList.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                  {formData.pm_regardingidtype === 'pm_projects' && projectsList.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Funding Amounts */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EuroIcon sx={{ fontSize: 18, color: 'success.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Funding Amounts ({CURRENCY_DISPLAY})
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={`Total Amount (${CURRENCY_DISPLAY})`}
                type="number"
                fullWidth
                size="small"
                value={formData.pm_totalamounteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_totalamounteur: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
          </Grid>

          {/* Effective Dates */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarTodayIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Effective Dates
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Effective From"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_effectivefromdate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_effectivefromdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Effective To"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_effectivetodate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_effectivetodate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSource}
            variant="contained"
            disabled={!formData.pm_fundingsourcename.trim() || actionLoading}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5, fontWeight: 600 }}
          >
            {actionLoading ? 'Saving...' : editingSource ? 'Update Source' : 'Create Source'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Funding Source</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this funding source? This action cannot be undone and may affect linked budgets.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteSource} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
