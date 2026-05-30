import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  Chip,
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
  IconButton,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import PersonIcon from '@mui/icons-material/Person'
import DescriptionIcon from '@mui/icons-material/Description'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TimelineIcon from '@mui/icons-material/Timeline'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  fetchBenefits,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  fetchPerformanceMeasures,
  createPerformanceMeasure,
  deletePerformanceMeasure,
} from '@/lib/dataverseClient'
import type { BenefitModel, PerformanceMeasureModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Financial',
  '1': 'Operational',
  '2': 'Strategic',
  '3': 'Customer',
  '4': 'Innovation',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning'> = {
  '0': 'success',
  '1': 'primary',
  '2': 'secondary',
  '3': 'info',
  '4': 'warning',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Identified',
  '1': 'In Progress',
  '2': 'Realised',
  '3': 'Not Yet Achieved',
  '4': 'Cancelled',
}

const STATUS_COLORS: Record<string, 'info' | 'warning' | 'success' | 'default' | 'error'> = {
  '0': 'info',
  '1': 'warning',
  '2': 'success',
  '3': 'default',
  '4': 'error',
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

const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Financial' },
  { value: '1', label: 'Operational' },
  { value: '2', label: 'Strategic' },
  { value: '3', label: 'Customer' },
  { value: '4', label: 'Innovation' },
]

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'Identified' },
  { value: '1', label: 'In Progress' },
  { value: '2', label: 'Realised' },
  { value: '3', label: 'Not Yet Achieved' },
  { value: '4', label: 'Cancelled' },
]

type SortField = 'name' | 'category' | 'status' | 'target' | 'baseline' | 'owner' | 'rag'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BenefitsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [benefits, setBenefits] = useState<BenefitModel[]>([])
  const [measures, setMeasures] = useState<PerformanceMeasureModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Detail panel state
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<BenefitModel | null>(null)
  const [formData, setFormData] = useState({
    pm_benefitname: '',
    pm_benefitcategory: 0,
    pm_benefitdescription: '',
    pm_benefitstatus: 0,
    pm_benefittype: 0,
    pm_benefitreference: '',
    pm_baselinevalue: 0,
    pm_targetvalue: 0,
    pm_unitofmeasure: '',
    pm_ragstatus: 1,
    pm_realisationstartdate: '',
    pm_realisationenddate: '',
    pm_benifitownername: '',
    pm_projectcode: '',
    pm_programmename: '',
    pm_projectname: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Add measure modal
  const [showMeasureModal, setShowMeasureModal] = useState(false)
  const [measureFormData, setMeasureFormData] = useState({
    pm_measurename: '',
    pm_plannedvalue: 0,
    pm_actualvalue: 0,
    pm_cumulativeplanned: 0,
    pm_cumulativeactual: 0,
    pm_variance: 0,
    pm_reportingperiod: '',
    pm_notes: '',
    pm_evidenced: 0,
  })

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [BenefitsPage] Fetching data...')
      const list = await fetchBenefits()
      console.log('🔍 [BenefitsPage] Benefits loaded:', list?.length ?? 0, 'items')
      if (list?.length > 0) console.log('🔍 [BenefitsPage] Sample benefit:', JSON.stringify(list[0], null, 2).slice(0, 500))
      setBenefits(list)
    } catch (err) {
      console.error('[BenefitsPage] loadData error:', err)
      setError('Unable to load benefits data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMeasures = useCallback(async (benefitId: string) => {
    try {
      const list = await fetchPerformanceMeasures(benefitId)
      setMeasures(list)
    } catch {
      setMeasures([])
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedBenefit?.pm_benefitid) {
      loadMeasures(selectedBenefit.pm_benefitid)
    } else {
      setMeasures([])
    }
  }, [selectedBenefit, loadMeasures])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = benefits.length
    const realised = benefits.filter((b) => String(b.pm_benefitstatus) === '2').length
    const inProgress = benefits.filter((b) => String(b.pm_benefitstatus) === '1').length
    const onTrack = benefits.filter((b) => String(b.pm_ragstatus) === '1').length
    const atRisk = benefits.filter((b) => String(b.pm_ragstatus) === '2').length
    const totalTarget = benefits.reduce((s, b) => s + (b.pm_targetvalue ?? 0), 0)
    const totalBaseline = benefits.reduce((s, b) => s + (b.pm_baselinevalue ?? 0), 0)
    return [
      {
        label: 'Total Benefits',
        value: total,
        subtitle: `${realised} realised, ${inProgress} in progress`,
        icon: <EmojiEventsIcon />,
        color: '#6366f1',
      },
      {
        label: 'On Track',
        value: onTrack,
        subtitle: onTrack > 0 ? `${((onTrack / (total || 1)) * 100).toFixed(0)}% of total` : 'None tracked',
        icon: <CheckCircleIcon />,
        color: '#22c55e',
      },
      {
        label: 'At Risk',
        value: atRisk,
        subtitle: atRisk > 0 ? `${atRisk} benefit(s) flagged red` : 'No red-flagged benefits',
        icon: <WarningAmberIcon />,
        color: atRisk > 0 ? '#ef4444' : '#64748b',
      },
      {
        label: 'Target Value',
        value: totalTarget,
        subtitle: `vs ${totalBaseline} baseline`,
        icon: <AttachMoneyIcon />,
        color: '#0ea5e9',
        isCurrency: true,
      },
    ]
  }, [benefits])

  // ── Filtered & Sorted Benefits ────────────────────────────────────────────
  const filteredBenefits = useMemo(() => {
    let list = [...benefits]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (b) =>
          b.pm_benefitname?.toLowerCase().includes(q) ||
          b.pm_benefitdescription?.toLowerCase().includes(q) ||
          b.pm_benifitownername?.toLowerCase().includes(q) ||
          b.pm_projectcode?.toLowerCase().includes(q) ||
          b.pm_programmename?.toLowerCase().includes(q) ||
          b.pm_unitofmeasure?.toLowerCase().includes(q)
      )
    }

    if (categoryFilter) {
      list = list.filter((b) => String(b.pm_benefitcategory) === categoryFilter)
    }

    if (statusFilter) {
      list = list.filter((b) => String(b.pm_benefitstatus) === statusFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_benefitname ?? '').localeCompare(b.pm_benefitname ?? '')
          break
        case 'category':
          cmp = String(a.pm_benefitcategory ?? '').localeCompare(String(b.pm_benefitcategory ?? ''))
          break
        case 'status':
          cmp = String(a.pm_benefitstatus ?? '').localeCompare(String(b.pm_benefitstatus ?? ''))
          break
        case 'target':
          cmp = (a.pm_targetvalue ?? 0) - (b.pm_targetvalue ?? 0)
          break
        case 'baseline':
          cmp = (a.pm_baselinevalue ?? 0) - (b.pm_baselinevalue ?? 0)
          break
        case 'owner':
          cmp = (a.pm_benifitownername ?? '').localeCompare(b.pm_benifitownername ?? '')
          break
        case 'rag':
          cmp = String(a.pm_ragstatus ?? '').localeCompare(String(b.pm_ragstatus ?? ''))
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [benefits, searchQuery, categoryFilter, statusFilter, sort])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((benefit: BenefitModel) => {
    setSelectedBenefit(benefit)
    setDetailTab(0)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedBenefit(null)
    setDetailTab(0)
    setMeasures([])
  }, [])

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginatedBenefits = useMemo(
    () => filteredBenefits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredBenefits, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])

  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(0) }, [])
  const handleCategoryFilterChange = useCallback((v: string) => { setCategoryFilter(v); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((v: string) => { setStatusFilter(v); setPage(0) }, [])

  // ── Form open for create/edit ──
  const openCreateForm = useCallback(() => {
    setEditingBenefit(null)
    setFormData({
      pm_benefitname: '',
      pm_benefitcategory: 0,
      pm_benefitdescription: '',
      pm_benefitstatus: 0,
      pm_benefittype: 0,
      pm_benefitreference: '',
      pm_baselinevalue: 0,
      pm_targetvalue: 0,
      pm_unitofmeasure: '',
      pm_ragstatus: 1,
      pm_realisationstartdate: '',
      pm_realisationenddate: '',
      pm_benifitownername: '',
      pm_projectcode: '',
      pm_programmename: '',
      pm_projectname: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((benefit: BenefitModel) => {
    setEditingBenefit(benefit)
    setFormData({
      pm_benefitname: benefit.pm_benefitname ?? '',
      pm_benefitcategory: Number(benefit.pm_benefitcategory) || 0,
      pm_benefitdescription: benefit.pm_benefitdescription ?? '',
      pm_benefitstatus: Number(benefit.pm_benefitstatus) ?? 0,
      pm_benefittype: Number(benefit.pm_benefittype) ?? 0,
      pm_benefitreference: benefit.pm_benefitreference ?? '',
      pm_baselinevalue: benefit.pm_baselinevalue ?? 0,
      pm_targetvalue: benefit.pm_targetvalue ?? 0,
      pm_unitofmeasure: benefit.pm_unitofmeasure ?? '',
      pm_ragstatus: Number(benefit.pm_ragstatus) ?? 1,
      pm_realisationstartdate: benefit.pm_realisationstartdate?.split('T')[0] ?? '',
      pm_realisationenddate: benefit.pm_realisationenddate?.split('T')[0] ?? '',
      pm_benifitownername: benefit.pm_benifitownername ?? '',
      pm_projectcode: benefit.pm_projectcode ?? '',
      pm_programmename: benefit.pm_programmename ?? '',
      pm_projectname: benefit.pm_projectname ?? '',
    })
    setShowFormModal(true)
  }, [])

  // ── Save ──
  const handleSaveBenefit = async () => {
    if (!formData.pm_benefitname.trim()) {
      setError('Benefit name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = {
        pm_benefitname: formData.pm_benefitname,
        pm_benefitcategory: formData.pm_benefitcategory,
        pm_benefitdescription: formData.pm_benefitdescription || undefined,
        pm_benefitstatus: formData.pm_benefitstatus,
        pm_benefittype: formData.pm_benefittype,
        pm_benefitreference: formData.pm_benefitreference || undefined,
        pm_baselinevalue: formData.pm_baselinevalue || 0,
        pm_targetvalue: formData.pm_targetvalue || 0,
        pm_unitofmeasure: formData.pm_unitofmeasure || undefined,
        pm_ragstatus: formData.pm_ragstatus,
        pm_realisationstartdate: formData.pm_realisationstartdate || undefined,
        pm_realisationenddate: formData.pm_realisationenddate || undefined,
        pm_benifitownername: formData.pm_benifitownername || undefined,
        pm_projectcode: formData.pm_projectcode || undefined,
        pm_programmename: formData.pm_programmename || undefined,
        pm_projectname: formData.pm_projectname || undefined,
      }

      if (editingBenefit?.pm_benefitid) {
        await updateBenefit(editingBenefit.pm_benefitid, payload)
        setSuccessMsg('Benefit updated successfully.')
      } else {
        await createBenefit(payload)
        setSuccessMsg('Benefit created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingBenefit ? 'Unable to update benefit.' : 'Unable to create benefit.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ──
  const handleDeleteBenefit = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteBenefit(deleteConfirm)
      setSuccessMsg('Benefit removed successfully.')
      setDeleteConfirm(null)
      if (selectedBenefit?.pm_benefitid === deleteConfirm) {
        setSelectedBenefit(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete benefit.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Add Measure ──
  const openAddMeasureForm = useCallback(() => {
    setMeasureFormData({
      pm_measurename: '',
      pm_plannedvalue: 0,
      pm_actualvalue: 0,
      pm_cumulativeplanned: 0,
      pm_cumulativeactual: 0,
      pm_variance: 0,
      pm_reportingperiod: new Date().toISOString().substring(0, 7),
      pm_notes: '',
      pm_evidenced: 0,
    })
    setShowMeasureModal(true)
  }, [])

  const handleSaveMeasure = async () => {
    if (!measureFormData.pm_measurename.trim() || !selectedBenefit?.pm_benefitid) return
    setError(null)
    setActionLoading(true)
    try {
      await createPerformanceMeasure({
        pm_measurename: measureFormData.pm_measurename,
        pm_plannedvalue: measureFormData.pm_plannedvalue,
        pm_actualvalue: measureFormData.pm_actualvalue,
        pm_cumulativeplanned: measureFormData.pm_cumulativeplanned,
        pm_cumulativeactual: measureFormData.pm_cumulativeactual,
        pm_variance: measureFormData.pm_cumulativeplanned > 0
          ? ((measureFormData.pm_cumulativeactual - measureFormData.pm_cumulativeplanned) / measureFormData.pm_cumulativeplanned) * 100
          : measureFormData.pm_actualvalue - measureFormData.pm_plannedvalue,
        pm_reportingperiod: measureFormData.pm_reportingperiod,
        pm_notes: measureFormData.pm_notes || undefined,
        pm_evidenced: measureFormData.pm_evidenced,
        _pm_benefit_value: selectedBenefit.pm_benefitid,
      })
      setSuccessMsg('Performance measure added successfully.')
      setShowMeasureModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      if (selectedBenefit.pm_benefitid) {
        await loadMeasures(selectedBenefit.pm_benefitid)
      }
    } catch {
      setError('Unable to add performance measure.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteMeasure = async (measureId: string) => {
    setActionLoading(true)
    try {
      await deletePerformanceMeasure(measureId)
      setSuccessMsg('Measure removed.')
      setTimeout(() => setSuccessMsg(null), 3000)
      if (selectedBenefit?.pm_benefitid) {
        await loadMeasures(selectedBenefit.pm_benefitid)
      }
    } catch {
      setError('Unable to delete measure.')
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
        title="Benefits Register"
        subtitle="Track and manage benefits realisation with target vs actual value tracking, performance measures per period, and realisation status."
        action={{
          label: 'Add Benefit',
          icon: <AddIcon />,
          onClick: openCreateForm,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Row ──────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── Benefits Grid ────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name, description, owner, entity..."
          filterValue={categoryFilter}
          onFilterChange={handleCategoryFilterChange}
          filterLabel="Category"
          filterOptions={CATEGORY_FILTER_OPTIONS}
          extraFilters={
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          }
          onClear={() => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter(''); setPage(0) }}
        />

        <TableShell
          loading={loading}
          empty={filteredBenefits.length === 0}
          emptyIcon={<EmojiEventsIcon />}
          emptyTitle={searchQuery || categoryFilter || statusFilter ? 'No benefits match your criteria.' : 'No benefits registered yet.'}
          emptyAction={!searchQuery && !categoryFilter && !statusFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Register your first benefit
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'name'} direction={getSortDir('name')} onClick={() => handleSort('name')} sx={{ fontWeight: 700 }}>
                    Benefit
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'category'} direction={getSortDir('category')} onClick={() => handleSort('category')} sx={{ fontWeight: 700 }}>
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'status'} direction={getSortDir('status')} onClick={() => handleSort('status')} sx={{ fontWeight: 700 }}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'baseline'} direction={getSortDir('baseline')} onClick={() => handleSort('baseline')} sx={{ fontWeight: 700 }}>
                    Baseline
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'target'} direction={getSortDir('target')} onClick={() => handleSort('target')} sx={{ fontWeight: 700 }}>
                    Target
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'rag'} direction={getSortDir('rag')} onClick={() => handleSort('rag')} sx={{ fontWeight: 700 }}>
                    RAG
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'owner'} direction={getSortDir('owner')} onClick={() => handleSort('owner')} sx={{ fontWeight: 700 }}>
                    Owner
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedBenefits.map((benefit, idx) => (
                <TableRow
                  key={benefit.pm_benefitid}
                  hover
                  onClick={() => handleRowClick(benefit)}
                  selected={selectedBenefit?.pm_benefitid === benefit.pm_benefitid}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                    '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                    '&.Mui-selected': { bgcolor: isDark ? '#1e3a5f' : '#e0e7ff' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: (() => { const r = String(benefit.pm_ragstatus); return r === '1' ? '#22c55e' : r === '2' ? '#ef4444' : '#f59e0b' })(), fontSize: fontSizes.sm, fontWeight: 700 }}>
                        {(benefit.pm_benefitname ?? 'B').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {benefit.pm_benefitname ?? 'Unnamed Benefit'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {benefit.pm_unitofmeasure || benefit.pm_benefitreference || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={CATEGORY_LABELS[String(benefit.pm_benefitcategory ?? '')] ?? '—'}
                      color={CATEGORY_COLORS[String(benefit.pm_benefitcategory ?? '')] ?? 'default'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[String(benefit.pm_benefitstatus ?? '')] ?? '—'}
                      color={STATUS_COLORS[String(benefit.pm_benefitstatus ?? '')] ?? 'default'}
                      size="small"
                      variant={String(benefit.pm_benefitstatus) === '2' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                      {benefit.pm_baselinevalue != null ? benefit.pm_baselinevalue.toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                      {benefit.pm_targetvalue != null ? benefit.pm_targetvalue.toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={RAG_LABELS[String(benefit.pm_ragstatus ?? '')] ?? '—'}
                      color={RAG_COLORS[String(benefit.pm_ragstatus ?? '')] ?? 'default'}
                      size="small"
                      variant="filled"
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {benefit.pm_benifitownername || '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredBenefits.length > 0 && (
          <TableFooter
            filteredCount={filteredBenefits.length}
            totalCount={benefits.length}
            itemLabel="benefit"
            totals={[
              { label: 'Realised', value: `${benefits.filter((b) => String(b.pm_benefitstatus) === '2').length}` },
              { label: 'In Progress', value: `${benefits.filter((b) => String(b.pm_benefitstatus) === '1').length}` },
            ]}
          />
        )}
        {!loading && filteredBenefits.length > 0 && (
          <TablePagination
            component="div"
            count={filteredBenefits.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>

      {/* ── Detail Drawer ────────────────────────────── */}
      <DetailDrawer
        open={!!selectedBenefit}
        onClose={handleCloseDetail}
        icon={<EmojiEventsIcon sx={{ color: '#6366f1', fontSize: 22 }} />}
        title={selectedBenefit?.pm_benefitname ?? ''}
        subtitle={selectedBenefit && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              label={CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory ?? '')]}
              color={CATEGORY_COLORS[String(selectedBenefit.pm_benefitcategory ?? '')] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            <Chip
              label={STATUS_LABELS[String(selectedBenefit.pm_benefitstatus ?? '')]}
              color={STATUS_COLORS[String(selectedBenefit.pm_benefitstatus ?? '')] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            <Chip
              label={RAG_LABELS[String(selectedBenefit.pm_ragstatus ?? '')]}
              color={RAG_COLORS[String(selectedBenefit.pm_ragstatus ?? '')] ?? 'default'}
              size="small"
              variant="filled"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            {selectedBenefit.pm_projectcode && (
              <Typography variant="body2" color="text.secondary">
                {selectedBenefit.pm_projectcode}
              </Typography>
            )}
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            
            <IconButton
              size="small"
              onClick={() => selectedBenefit && openEditForm(selectedBenefit)}
              sx={{ borderRadius: 1.5 }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => selectedBenefit?.pm_benefitid && setDeleteConfirm(selectedBenefit.pm_benefitid)}
              sx={{ borderRadius: 1.5 }}
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
        tabs={[
          { label: 'Overview' },
          { label: 'Performance Measures' },
        ]}
        tabValue={detailTab}
        onTabChange={(_e, v) => { setDetailTab(v); setError(null) }}
      >
        {selectedBenefit && (
          <>
            {/* Overview Tab */}
            <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Benefit Info Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmojiEventsIcon sx={{ fontSize: 16 }} /> Benefit Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Category</Typography>
                      <Typography variant="body2">{CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory ?? '')] ?? '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benefittype === 0 ? 'Quantitative' : 'Qualitative'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Unit of Measure</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_unitofmeasure || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reference</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benefitreference || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Owner</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benifitownername || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Entity</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_projectcode || selectedBenefit.pm_programmename || selectedBenefit.pm_projectname || '—'}</Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Target vs Actual Values */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrackChangesIcon sx={{ fontSize: 16 }} /> Target & Performance
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: '3px solid #6366f1' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Baseline Value
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base }}>
                        {selectedBenefit.pm_baselinevalue != null ? selectedBenefit.pm_baselinevalue.toLocaleString() : '—'}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: '3px solid #22c55e' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Target Value
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base }}>
                        {selectedBenefit.pm_targetvalue != null ? selectedBenefit.pm_targetvalue.toLocaleString() : '—'}
                      </Typography>
                    </Paper>
                  </Box>
                  {selectedBenefit.pm_targetvalue != null && selectedBenefit.pm_baselinevalue != null && selectedBenefit.pm_targetvalue > 0 && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)', border: '1px solid', borderColor: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Target vs Baseline
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                        {Math.round((((selectedBenefit.pm_targetvalue - selectedBenefit.pm_baselinevalue) / selectedBenefit.pm_baselinevalue) * 100) * 10) / 10}% improvement target
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {/* Description */}
                {selectedBenefit.pm_benefitdescription && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                      {selectedBenefit.pm_benefitdescription}
                    </Typography>
                  </Paper>
                )}

                {/* Realisation Schedule */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimelineIcon sx={{ fontSize: 16 }} /> Realisation Schedule
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Start Date</Typography>
                      <Typography variant="body2">
                        {selectedBenefit.pm_realisationstartdate
                          ? new Date(selectedBenefit.pm_realisationstartdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>End Date</Typography>
                      <Typography variant="body2">
                        {selectedBenefit.pm_realisationenddate
                          ? new Date(selectedBenefit.pm_realisationenddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </TabPanel>

            {/* Performance Measures Tab */}
            <TabPanel value={detailTab} index={1} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrackChangesIcon sx={{ fontSize: 16 }} /> Measures by Period
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={openAddMeasureForm}
                    sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2 }}
                  >
                    Add Measure
                  </Button>
                </Box>

                {measures.length === 0 ? (
                  <Paper variant="outlined" sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
                    <TrackChangesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No performance measures recorded.
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Add measures to track progress against this benefit's target values per reporting period.
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddMeasureForm} sx={{ borderRadius: 2 }}>
                        Add first measure
                      </Button>
                    </Box>
                  </Paper>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Measure</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Planned</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Actual</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Cumul. Planned</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Cumul. Actual</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Variance</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Evidenced</TableCell>
                          <TableCell sx={{ width: 50 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {measures.map((m) => {
                          const variance = m.pm_variance ?? 0
                          const isPositive = variance >= 0
                          return (
                            <TableRow key={m.pm_performancemeasureid} hover>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_measurename}</Typography>
                                {m.pm_notes && <Typography variant="caption" color="text.secondary">{m.pm_notes}</Typography>}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                                  {m.pm_reportingperiod || '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{m.pm_plannedvalue ?? '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_actualvalue ?? '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{m.pm_cumulativeplanned ?? '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_cumulativeactual ?? '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={isPositive ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`}
                                  color={isPositive ? 'success' : 'error'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, borderRadius: 8, fontSize: fontSizes.xs }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={String(m.pm_evidenced) === '1' ? 'Yes' : 'No'}
                                  color={String(m.pm_evidenced) === '1' ? 'success' : 'default'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, borderRadius: 8 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Delete measure">
                                  <IconButton
                                    size="small"
                                    onClick={() => m.pm_performancemeasureid && handleDeleteMeasure(m.pm_performancemeasureid)}
                                    color="error"
                                  >
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    {/* Cumulative summary */}
                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#1a2332' : '#f8fafc' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary', mb: 1, display: 'block' }}>
                        Cumulative Performance
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 4 }}>
                        {(() => {
                          const totalPlanned = measures.reduce((s, m) => s + (m.pm_cumulativeplanned ?? 0), 0)
                          const totalActual = measures.reduce((s, m) => s + (m.pm_cumulativeactual ?? 0), 0)
                          const overallVariance = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0
                          return (
                            <>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Total Cumulative Planned</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalPlanned.toLocaleString()}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Total Cumulative Actual</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalActual.toLocaleString()}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Overall Variance</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: overallVariance >= 0 ? '#22c55e' : '#ef4444' }}>
                                  {overallVariance >= 0 ? '+' : ''}{overallVariance.toFixed(1)}%
                                </Typography>
                              </Box>
                            </>
                          )
                        })()}
                      </Box>
                    </Box>
                  </Paper>
                )}
              </Box>
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      {/* ── Create/Edit Modal ──────────────────────── */}
      <Dialog
        open={showFormModal}
        onClose={() => !actionLoading && setShowFormModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', borderRadius: 1.5 }}>
            {editingBenefit ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <EmojiEventsIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingBenefit ? 'Edit Benefit' : 'Register Benefit'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingBenefit
              ? `Update details for ${editingBenefit.pm_benefitname}.`
              : 'Register a new benefit with target values, category, owner, and entity association.'}
          </Typography>

          {/* Basic Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EmojiEventsIcon sx={{ fontSize: 18, color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Benefit Name"
                required
                fullWidth
                size="small"
                value={formData.pm_benefitname}
                onChange={(e) => setFormData((f) => ({ ...f, pm_benefitname: e.target.value }))}
                placeholder="e.g., Cost Savings from Automation"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.pm_benefitcategory}
                  label="Category"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_benefitcategory: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Financial</MenuItem>
                  <MenuItem value={1}>Operational</MenuItem>
                  <MenuItem value={2}>Strategic</MenuItem>
                  <MenuItem value={3}>Customer</MenuItem>
                  <MenuItem value={4}>Innovation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Reference / ID"
                fullWidth
                size="small"
                value={formData.pm_benefitreference}
                onChange={(e) => setFormData((f) => ({ ...f, pm_benefitreference: e.target.value }))}
                placeholder="e.g., BEN-001"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.pm_benefitstatus}
                  label="Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_benefitstatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Identified</MenuItem>
                  <MenuItem value={1}>In Progress</MenuItem>
                  <MenuItem value={2}>Realised</MenuItem>
                  <MenuItem value={3}>Not Yet Achieved</MenuItem>
                  <MenuItem value={4}>Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Assessment (RAG)</InputLabel>
                <Select
                  value={formData.pm_ragstatus}
                  label="Assessment (RAG)"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={1}>Green — On Track</MenuItem>
                  <MenuItem value={0}>Amber — At Risk</MenuItem>
                  <MenuItem value={2}>Red — Off Track</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Benefit Type</InputLabel>
                <Select
                  value={formData.pm_benefittype}
                  label="Benefit Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_benefittype: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Quantitative</MenuItem>
                  <MenuItem value={1}>Qualitative</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Owner Name"
                fullWidth
                size="small"
                value={formData.pm_benifitownername}
                onChange={(e) => setFormData((f) => ({ ...f, pm_benifitownername: e.target.value }))}
                placeholder="e.g., Sarah Connor"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Entity (Project / Programme)"
                fullWidth
                size="small"
                value={formData.pm_projectcode}
                onChange={(e) => setFormData((f) => ({ ...f, pm_projectcode: e.target.value }))}
                placeholder="e.g., PRJ-001 or Programme Name"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>

          {/* Targets & Measures */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrackChangesIcon sx={{ fontSize: 18, color: '#22c55e' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Targets & Measures
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Baseline Value"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_baselinevalue}
                onChange={(e) => setFormData((f) => ({ ...f, pm_baselinevalue: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Target Value"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_targetvalue}
                onChange={(e) => setFormData((f) => ({ ...f, pm_targetvalue: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Unit of Measure"
                fullWidth
                size="small"
                value={formData.pm_unitofmeasure}
                onChange={(e) => setFormData((f) => ({ ...f, pm_unitofmeasure: e.target.value }))}
                placeholder="e.g., EUR, %, hours, FTE"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Realisation Start Date"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_realisationstartdate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_realisationstartdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Realisation End Date"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_realisationenddate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_realisationenddate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>

          {/* Description */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DescriptionIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Description
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Benefit Description"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={formData.pm_benefitdescription}
                onChange={(e) => setFormData((f) => ({ ...f, pm_benefitdescription: e.target.value }))}
                placeholder="Describe the expected benefit, how it will be measured, and the approach to realisation..."
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveBenefit}
            variant="contained"
            disabled={!formData.pm_benefitname.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Saving...' : editingBenefit ? 'Update Benefit' : 'Register Benefit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Benefit</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this benefit? All related performance measures will also be removed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteBenefit} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Measure Modal ──────────────────────── */}
      <Dialog
        open={showMeasureModal}
        onClose={() => !actionLoading && setShowMeasureModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#22c55e', borderRadius: 1.5 }}>
            <TrackChangesIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          Add Performance Measure
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Record a performance measure for this period. Variance will be calculated automatically.
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Measure Name"
                required
                fullWidth
                size="small"
                value={measureFormData.pm_measurename}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_measurename: e.target.value }))}
                placeholder="e.g., Q1 2026 Cost Savings"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Reporting Period"
                type="month"
                fullWidth
                size="small"
                value={measureFormData.pm_reportingperiod}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_reportingperiod: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Evidenced</InputLabel>
                <Select
                  value={measureFormData.pm_evidenced}
                  label="Evidenced"
                  onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_evidenced: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>No</MenuItem>
                  <MenuItem value={1}>Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Planned Value (This Period)"
                type="number"
                fullWidth
                size="small"
                value={measureFormData.pm_plannedvalue}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_plannedvalue: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Actual Value (This Period)"
                type="number"
                fullWidth
                size="small"
                value={measureFormData.pm_actualvalue}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_actualvalue: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Cumulative Planned"
                type="number"
                fullWidth
                size="small"
                value={measureFormData.pm_cumulativeplanned}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_cumulativeplanned: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Cumulative Actual"
                type="number"
                fullWidth
                size="small"
                value={measureFormData.pm_cumulativeactual}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_cumulativeactual: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={measureFormData.pm_notes}
                onChange={(e) => setMeasureFormData((f) => ({ ...f, pm_notes: e.target.value }))}
                placeholder="Any additional context about this measure..."
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowMeasureModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveMeasure}
            variant="contained"
            disabled={!measureFormData.pm_measurename.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Adding...' : 'Add Measure'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
