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
  IconButton,
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
  Link,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye'
import PersonIcon from '@mui/icons-material/Person'
import DescriptionIcon from '@mui/icons-material/Description'
import RuleIcon from '@mui/icons-material/Rule'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  fetchGateReviews,
  createGateReview,
  updateGateReview,
  deleteGateReview,
} from '@/lib/dataverseClient'
import type { GateReviewModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GATE_STAGE_LABELS: Record<string, string> = {
  '0': 'Gate 1',
  '1': 'Gate 2',
  '2': 'Gate 3',
  '3': 'Gate 4',
}

const GATE_STAGE_VARIANTS: Record<string, 'primary' | 'info' | 'warning' | 'success'> = {
  '0': 'primary',
  '1': 'info',
  '2': 'warning',
  '3': 'success',
}

const OUTCOME_LABELS: Record<string, string> = {
  '0': 'Approved',
  '1': 'Conditional',
  '2': 'Not Yet Reviewed',
}

const OUTCOME_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  '0': 'success',
  '1': 'warning',
  '2': 'default',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Complete',
  '1': 'Scheduled',
}

const STATUS_COLORS: Record<string, 'default' | 'info'> = {
  '0': 'default',
  '1': 'info',
}

const STAGE_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Stages' },
  { value: '0', label: 'Gate 1' },
  { value: '1', label: 'Gate 2' },
  { value: '2', label: 'Gate 3' },
  { value: '3', label: 'Gate 4' },
]

const OUTCOME_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Outcomes' },
  { value: '0', label: 'Approved' },
  { value: '1', label: 'Conditional' },
  { value: '2', label: 'Not Yet Reviewed' },
]

type SortField = 'name' | 'stage' | 'outcome' | 'status' | 'planned' | 'actual' | 'reviewer'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GateReviewsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [gateReviews, setGateReviews] = useState<GateReviewModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'planned', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Detail panel state
  const [selectedReview, setSelectedReview] = useState<GateReviewModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingReview, setEditingReview] = useState<GateReviewModel | null>(null)
  const [formData, setFormData] = useState({
    pm_gatename: '',
    pm_gatestage: 0,
    pm_reviewoutcome: 2,
    pm_reviewstatus: 1,
    pm_plannedreviewdate: '',
    pm_actualreviewdate: '',
    pm_leadreviewer: '',
    pm_reviewnotes: '',
    pm_reviewconditions: '',
    pm_documentsurl: '',
    pm_projectcode: '',
    pm_programmename: '',
    _pm_project_value: '',
    _pm_programmelookup_value: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchGateReviews()
      setGateReviews(list)
    } catch {
      setError('Unable to load gate review data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = gateReviews.length
    const scheduled = gateReviews.filter((g) => String(g.pm_reviewstatus) === '1').length
    const completed = gateReviews.filter((g) => String(g.pm_reviewstatus) === '0').length
    const conditional = gateReviews.filter((g) => String(g.pm_reviewoutcome) === '1').length
    const approved = gateReviews.filter((g) => String(g.pm_reviewoutcome) === '0').length
    return [
      {
        label: 'Total Reviews',
        value: total,
        subtitle: `${total > 0 ? `${completed} completed, ${scheduled} scheduled` : 'No reviews yet'}`,
        icon: <FactCheckIcon />,
        color: '#6366f1',
      },
      {
        label: 'Scheduled',
        value: scheduled,
        subtitle: `${scheduled > 0 ? `${((scheduled / (total || 1)) * 100).toFixed(0)}% of total` : 'All completed'}`,
        icon: <CalendarMonthIcon />,
        color: '#0ea5e9',
      },
      {
        label: 'Approved',
        value: approved,
        subtitle: `${approved > 0 ? `${((approved / (completed || 1)) * 100).toFixed(0)}% completion rate` : 'None approved'}`,
        icon: <CheckCircleIcon />,
        color: '#22c55e',
      },
      {
        label: 'Conditional',
        value: conditional,
        subtitle: conditional > 0 ? `${conditional} review(s) with conditions` : 'No conditions outstanding',
        icon: <WarningAmberIcon />,
        color: conditional > 0 ? '#f59e0b' : '#64748b',
      },
    ]
  }, [gateReviews])

  // ── Filtered & Sorted Gate Reviews ────────────────────────────────────────
  const filteredReviews = useMemo(() => {
    let list = [...gateReviews]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (g) =>
          g.pm_gatename?.toLowerCase().includes(q) ||
          g.pm_leadreviewer?.toLowerCase().includes(q) ||
          g.pm_projectcode?.toLowerCase().includes(q) ||
          g.pm_programmename?.toLowerCase().includes(q) ||
          g.pm_reviewnotes?.toLowerCase().includes(q)
      )
    }

    if (stageFilter) {
      list = list.filter((g) => String(g.pm_gatestage) === stageFilter)
    }

    if (outcomeFilter) {
      list = list.filter((g) => String(g.pm_reviewoutcome) === outcomeFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_gatename ?? '').localeCompare(b.pm_gatename ?? '')
          break
        case 'stage':
          cmp = Number(a.pm_gatestage ?? 0) - Number(b.pm_gatestage ?? 0)
          break
        case 'outcome':
          cmp = String(a.pm_reviewoutcome ?? '').localeCompare(String(b.pm_reviewoutcome ?? ''))
          break
        case 'status':
          cmp = String(a.pm_reviewstatus ?? '').localeCompare(String(b.pm_reviewstatus ?? ''))
          break
        case 'planned':
          cmp = (a.pm_plannedreviewdate ?? '').localeCompare(b.pm_plannedreviewdate ?? '')
          break
        case 'actual':
          cmp = (a.pm_actualreviewdate ?? '').localeCompare(b.pm_actualreviewdate ?? '')
          break
        case 'reviewer':
          cmp = (a.pm_leadreviewer ?? '').localeCompare(b.pm_leadreviewer ?? '')
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [gateReviews, searchQuery, stageFilter, outcomeFilter, sort])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((review: GateReviewModel) => {
    setSelectedReview(review)
    setDetailTab(0)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedReview(null)
    setDetailTab(0)
  }, [])

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginatedReviews = useMemo(
    () => filteredReviews.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredReviews, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])

  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(0) }, [])
  const handleStageFilterChange = useCallback((v: string) => { setStageFilter(v); setPage(0) }, [])
  const handleOutcomeFilterChange = useCallback((v: string) => { setOutcomeFilter(v); setPage(0) }, [])

  // ── Form open for create/edit ──
  const openCreateForm = useCallback(() => {
    setEditingReview(null)
    setFormData({
      pm_gatename: '',
      pm_gatestage: 0,
      pm_reviewoutcome: 2,
      pm_reviewstatus: 1,
      pm_plannedreviewdate: '',
      pm_actualreviewdate: '',
      pm_leadreviewer: '',
      pm_reviewnotes: '',
      pm_reviewconditions: '',
      pm_documentsurl: '',
      pm_projectcode: '',
      pm_programmename: '',
      _pm_project_value: '',
      _pm_programmelookup_value: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((review: GateReviewModel) => {
    setEditingReview(review)
    setFormData({
      pm_gatename: review.pm_gatename ?? '',
      pm_gatestage: Number(review.pm_gatestage) || 0,
      pm_reviewoutcome: Number(review.pm_reviewoutcome) ?? 2,
      pm_reviewstatus: Number(review.pm_reviewstatus) ?? 1,
      pm_plannedreviewdate: review.pm_plannedreviewdate?.split('T')[0] ?? '',
      pm_actualreviewdate: review.pm_actualreviewdate?.split('T')[0] ?? '',
      pm_leadreviewer: review.pm_leadreviewer ?? '',
      pm_reviewnotes: review.pm_reviewnotes ?? '',
      pm_reviewconditions: review.pm_reviewconditions ?? '',
      pm_documentsurl: review.pm_documentsurl ?? '',
      pm_projectcode: review.pm_projectcode ?? '',
      pm_programmename: review.pm_programmename ?? '',
      _pm_project_value: review._pm_project_value ?? '',
      _pm_programmelookup_value: review._pm_programmelookup_value ?? '',
    })
    setShowFormModal(true)
  }, [])

  // ── Save ──
  const handleSaveReview = async () => {
    if (!formData.pm_gatename.trim()) {
      setError('Gate name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = {
        pm_gatename: formData.pm_gatename,
        pm_gatestage: formData.pm_gatestage,
        pm_reviewoutcome: formData.pm_reviewoutcome,
        pm_reviewstatus: formData.pm_reviewstatus,
        pm_plannedreviewdate: formData.pm_plannedreviewdate || undefined,
        pm_actualreviewdate: formData.pm_actualreviewdate || undefined,
        pm_leadreviewer: formData.pm_leadreviewer || undefined,
        pm_reviewnotes: formData.pm_reviewnotes || undefined,
        pm_reviewconditions: formData.pm_reviewconditions || undefined,
        pm_documentsurl: formData.pm_documentsurl || undefined,
        pm_projectcode: formData.pm_projectcode || undefined,
        pm_programmename: formData.pm_programmename || undefined,
        _pm_project_value: formData._pm_project_value || undefined,
        _pm_programmelookup_value: formData._pm_programmelookup_value || undefined,
      }

      if (editingReview?.pm_projectgatereviewid) {
        await updateGateReview(editingReview.pm_projectgatereviewid, payload)
        setSuccessMsg('Gate review updated successfully.')
      } else {
        await createGateReview(payload)
        setSuccessMsg('Gate review created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingReview ? 'Unable to update gate review.' : 'Unable to create gate review.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ──
  const handleDeleteReview = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteGateReview(deleteConfirm)
      setSuccessMsg('Gate review removed successfully.')
      setDeleteConfirm(null)
      if (selectedReview?.pm_projectgatereviewid === deleteConfirm) {
        setSelectedReview(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete gate review.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Get sort direction helper ──
  const getSortDir = (field: SortField): 'asc' | 'desc' =>
    sort.field === field ? sort.dir : 'asc'

  // ── Render ────────────────────────────────────────────────────────────────
  const currentStage = String(selectedReview?.pm_gatestage ?? '')
  const currentOutcome = String(selectedReview?.pm_reviewoutcome ?? '')
  const currentStatus = String(selectedReview?.pm_reviewstatus ?? '')

  return (
    <Box>
      <PageHeader
        title="Gate Reviews"
        subtitle="Schedule and track project gate reviews (Gates 1–4), record outcomes, and manage conditions for approval."
        action={{
          label: 'Schedule Review',
          icon: <AddIcon />,
          onClick: openCreateForm,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Row ──────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── Gate Review Grid ─────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name, reviewer, project, programme..."
          filterValue={stageFilter}
          onFilterChange={handleStageFilterChange}
          filterLabel="Stage"
          filterOptions={STAGE_FILTER_OPTIONS}
          extraFilters={
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Outcome</InputLabel>
              <Select
                value={outcomeFilter}
                label="Outcome"
                onChange={(e) => handleOutcomeFilterChange(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {OUTCOME_FILTER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          }
          onClear={() => { setSearchQuery(''); setStageFilter(''); setOutcomeFilter(''); setPage(0) }}
        />

        <TableShell
          loading={loading}
          empty={filteredReviews.length === 0}
          emptyIcon={<FactCheckIcon />}
          emptyTitle={searchQuery || stageFilter || outcomeFilter ? 'No gate reviews match your criteria.' : 'No gate reviews found.'}
          emptyAction={!searchQuery && !stageFilter && !outcomeFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Schedule your first gate review
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'name'} direction={getSortDir('name')} onClick={() => handleSort('name')} sx={{ fontWeight: 700 }}>
                    Gate Review
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'stage'} direction={getSortDir('stage')} onClick={() => handleSort('stage')} sx={{ fontWeight: 700 }}>
                    Stage
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'outcome'} direction={getSortDir('outcome')} onClick={() => handleSort('outcome')} sx={{ fontWeight: 700 }}>
                    Outcome
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'planned'} direction={getSortDir('planned')} onClick={() => handleSort('planned')} sx={{ fontWeight: 700 }}>
                    Planned Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'reviewer'} direction={getSortDir('reviewer')} onClick={() => handleSort('reviewer')} sx={{ fontWeight: 700 }}>
                    Lead Reviewer
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Entity
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReviews.map((review, idx) => (
                <TableRow
                  key={review.pm_projectgatereviewid}
                  hover
                  onClick={() => handleRowClick(review)}
                  selected={selectedReview?.pm_projectgatereviewid === review.pm_projectgatereviewid}
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
                      <Avatar sx={{ width: 32, height: 32, bgcolor: (() => { const s = GATE_STAGE_VARIANTS[String(review.pm_gatestage ?? '')]; return s === 'success' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#6366f1' })(), fontSize: fontSizes.sm, fontWeight: 700 }}>
                        {(review.pm_gatename ?? 'G').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {review.pm_gatename ?? 'Unnamed Review'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.pm_projectcode || review.pm_programmename || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={GATE_STAGE_LABELS[String(review.pm_gatestage ?? '')] ?? '—'}
                      color={GATE_STAGE_VARIANTS[String(review.pm_gatestage ?? '')] ?? 'default'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={OUTCOME_LABELS[String(review.pm_reviewoutcome ?? '')] ?? '—'}
                      color={OUTCOME_COLORS[String(review.pm_reviewoutcome ?? '')] ?? 'default'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[String(review.pm_reviewstatus ?? '')] ?? '—'}
                      color={STATUS_COLORS[String(review.pm_reviewstatus ?? '')] ?? 'default'}
                      size="small"
                      variant={String(review.pm_reviewstatus) === '0' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600, borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                      {review.pm_plannedreviewdate
                        ? new Date(review.pm_plannedreviewdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {review.pm_leadreviewer || '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {review.pm_projectcode || review.pm_programmename || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredReviews.length > 0 && (
          <TableFooter
            filteredCount={filteredReviews.length}
            totalCount={gateReviews.length}
            itemLabel="gate review"
            totals={[
              { label: 'Completed', value: `${gateReviews.filter((g) => String(g.pm_reviewstatus) === '0').length}` },
              { label: 'Scheduled', value: `${gateReviews.filter((g) => String(g.pm_reviewstatus) === '1').length}` },
            ]}
          />
        )}
        {!loading && filteredReviews.length > 0 && (
          <TablePagination
            component="div"
            count={filteredReviews.length}
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
        open={!!selectedReview}
        onClose={handleCloseDetail}
        icon={<FactCheckIcon sx={{ color: '#6366f1', fontSize: 22 }} />}
        title={selectedReview?.pm_gatename ?? ''}
        subtitle={selectedReview && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              label={GATE_STAGE_LABELS[String(selectedReview.pm_gatestage ?? '')]}
              color={GATE_STAGE_VARIANTS[String(selectedReview.pm_gatestage ?? '')] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            <Chip
              label={OUTCOME_LABELS[String(selectedReview.pm_reviewoutcome ?? '')]}
              color={OUTCOME_COLORS[String(selectedReview.pm_reviewoutcome ?? '')] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            <Chip
              label={STATUS_LABELS[String(selectedReview.pm_reviewstatus ?? '')]}
              color={STATUS_COLORS[String(selectedReview.pm_reviewstatus ?? '')] ?? 'default'}
              size="small"
              variant={currentStatus === '0' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            {selectedReview.pm_projectcode && (
              <Typography variant="body2" color="text.secondary">
                {selectedReview.pm_projectcode}
              </Typography>
            )}
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="error"
              onClick={() => selectedReview?.pm_projectgatereviewid && setDeleteConfirm(selectedReview.pm_projectgatereviewid)}
              sx={{ borderRadius: 1.5 }}
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => selectedReview && openEditForm(selectedReview)}
              sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.5 }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
        tabs={[
          { label: 'Overview' },
          { label: 'Conditions & Documents' },
        ]}
        tabValue={detailTab}
        onTabChange={(_e, v) => { setDetailTab(v); setError(null) }}
      >
        {selectedReview && (
          <>
            {/* Overview Tab */}
            <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Gate Info Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FactCheckIcon sx={{ fontSize: 16 }} /> Review Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Gate Stage</Typography>
                      <Typography variant="body2">{GATE_STAGE_LABELS[String(selectedReview.pm_gatestage ?? '')] ?? '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Outcome</Typography>
                      <Typography variant="body2">{OUTCOME_LABELS[String(selectedReview.pm_reviewoutcome ?? '')] ?? '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Lead Reviewer</Typography>
                      <Typography variant="body2">{selectedReview.pm_leadreviewer || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Project / Programme</Typography>
                      <Typography variant="body2">{selectedReview.pm_projectcode || selectedReview.pm_programmename || '—'}</Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Dates Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonthIcon sx={{ fontSize: 16 }} /> Key Dates
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: '3px solid #0ea5e9' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Planned Review Date
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base }}>
                        {selectedReview.pm_plannedreviewdate
                          ? new Date(selectedReview.pm_plannedreviewdate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Not scheduled'}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: '3px solid #22c55e' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Actual Review Date
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base }}>
                        {selectedReview.pm_actualreviewdate
                          ? new Date(selectedReview.pm_actualreviewdate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </Typography>
                    </Paper>
                  </Box>
                </Paper>

                {/* Notes Card */}
                {selectedReview.pm_reviewnotes && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DescriptionIcon sx={{ fontSize: 16 }} /> Review Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                      {selectedReview.pm_reviewnotes}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </TabPanel>

            {/* Conditions & Documents Tab */}
            <TabPanel value={detailTab} index={1} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Conditions */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RuleIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Conditions for Approval
                  </Typography>
                  {selectedReview.pm_reviewconditions ? (
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <WarningAmberIcon sx={{ fontSize: 18, color: '#f59e0b', mt: 0.25 }} />
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          {selectedReview.pm_reviewconditions}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CheckCircleIcon sx={{ fontSize: 36, color: '#22c55e', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No conditions recorded.</Typography>
                      <Typography variant="caption" color="text.disabled">Conditions typically apply to "Conditional Approval" outcomes.</Typography>
                    </Box>
                  )}
                </Paper>

                {/* Documents */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16, color: '#0ea5e9' }} /> Documents
                  </Typography>
                  {selectedReview.pm_documentsurl ? (
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: isDark ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.05)',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.15)',
                      }}
                    >
                      <Link
                        href={selectedReview.pm_documentsurl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                          {selectedReview.pm_documentsurl}
                        </Typography>
                      </Link>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <DescriptionIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No documents uploaded.</Typography>
                      <Typography variant="caption" color="text.disabled">Add a document URL in the edit form.</Typography>
                    </Box>
                  )}
                </Paper>
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
            {editingReview ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <FactCheckIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingReview ? 'Edit Gate Review' : 'Schedule Gate Review'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingReview
              ? `Update details for ${editingReview.pm_gatename}.`
              : 'Schedule a new gate review for a project or programme. Gates follow a standard 1–4 stage process.'}
          </Typography>

          {/* Basic Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FactCheckIcon sx={{ fontSize: 18, color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Gate Name"
                required
                fullWidth
                size="small"
                value={formData.pm_gatename}
                onChange={(e) => setFormData((f) => ({ ...f, pm_gatename: e.target.value }))}
                placeholder="e.g., Gate 1 — Business Case Review"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Gate Stage</InputLabel>
                <Select
                  value={formData.pm_gatestage}
                  label="Gate Stage"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_gatestage: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={0}>Gate 1</MenuItem>
                  <MenuItem value={1}>Gate 2</MenuItem>
                  <MenuItem value={2}>Gate 3</MenuItem>
                  <MenuItem value={3}>Gate 4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Outcome</InputLabel>
                <Select
                  value={formData.pm_reviewoutcome}
                  label="Outcome"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_reviewoutcome: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={2}>Not Yet Reviewed</MenuItem>
                  <MenuItem value={0}>Approved</MenuItem>
                  <MenuItem value={1}>Conditional Approval</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.pm_reviewstatus}
                  label="Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_reviewstatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={1}>Scheduled</MenuItem>
                  <MenuItem value={0}>Complete</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Lead Reviewer"
                fullWidth
                size="small"
                value={formData.pm_leadreviewer}
                onChange={(e) => setFormData((f) => ({ ...f, pm_leadreviewer: e.target.value }))}
                placeholder="e.g., Jane Smith"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Project Code / Programme"
                fullWidth
                size="small"
                value={formData.pm_projectcode}
                onChange={(e) => setFormData((f) => ({ ...f, pm_projectcode: e.target.value }))}
                placeholder="e.g., PRJ-001 or Programme Name"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>

          {/* Dates */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarMonthIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Review Dates
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Planned Review Date"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_plannedreviewdate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_plannedreviewdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Actual Review Date"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_actualreviewdate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_actualreviewdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>

          {/* Review Details */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DescriptionIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Review Details
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Review Notes"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={formData.pm_reviewnotes}
                onChange={(e) => setFormData((f) => ({ ...f, pm_reviewnotes: e.target.value }))}
                placeholder="Summary of the review discussion, findings, and decisions..."
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Conditions for Approval"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={formData.pm_reviewconditions}
                onChange={(e) => setFormData((f) => ({ ...f, pm_reviewconditions: e.target.value }))}
                placeholder="If Conditional Approval, list conditions that must be met..."
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Documents URL"
                fullWidth
                size="small"
                value={formData.pm_documentsurl}
                onChange={(e) => setFormData((f) => ({ ...f, pm_documentsurl: e.target.value }))}
                placeholder="https://sharepoint.com/... or other document link"
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
            onClick={handleSaveReview}
            variant="contained"
            disabled={!formData.pm_gatename.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Saving...' : editingReview ? 'Update Review' : 'Schedule Review'}
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Gate Review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this gate review? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteReview} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
