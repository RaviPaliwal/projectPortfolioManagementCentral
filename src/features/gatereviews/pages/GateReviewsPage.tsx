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
import PersonIcon from '@mui/icons-material/Person'
import DescriptionIcon from '@mui/icons-material/Description'
import RuleIcon from '@mui/icons-material/Rule'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import Filter1Icon from '@mui/icons-material/Filter1'
import {
  fetchGateReviews,
  createGateReview,
  updateGateReview,
  deleteGateReview,
} from '@/services'
import type { GateReviewModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, StatusTag, ActionIcon, Button } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gateReviewExportColumns: ExportColumn[] = [
  { key: 'pm_gatereviewname', label: 'Review Name' },
  { key: 'pm_projectname', label: 'Project' },
  { key: 'pm_gatestagename', label: 'Gate Stage' },
  { key: 'pm_scheduleddate', label: 'Scheduled Date' },
  { key: 'pm_actualdate', label: 'Actual Date' },
  { key: 'pm_outcomename', label: 'Outcome' },
  { key: 'pm_reviewername', label: 'Reviewer' },
  { key: 'pm_statusname', label: 'Status' },
]

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

export default function GateReviewsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [gateReviews, setGateReviews] = useState<GateReviewModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'planned', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [selectedReview, setSelectedReview] = useState<GateReviewModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

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

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

  useEffect(() => { loadData() }, [loadData])

  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = gateReviews.length
    const scheduled = gateReviews.filter((g) => String(g.pm_reviewstatus) === '1').length
    const completed = gateReviews.filter((g) => String(g.pm_reviewstatus) === '0').length
    const conditional = gateReviews.filter((g) => String(g.pm_reviewoutcome) === '1').length
    const approved = gateReviews.filter((g) => String(g.pm_reviewoutcome) === '0').length
    const gate1 = gateReviews.filter((g) => String(g.pm_gatestage) === '0').length
    return [
      { label: 'Total Reviews', value: total, icon: <FactCheckIcon />, color: 'primary.main' },
      { label: 'Scheduled', value: scheduled, icon: <CalendarMonthIcon />, color: 'info.main' },
      { label: 'Completed', value: completed, icon: <TaskAltIcon />, color: 'success.main' },
      { label: 'Approved', value: approved, icon: <CheckCircleIcon />, color: 'success.main' },
      { label: 'Conditional', value: conditional, icon: <WarningAmberIcon />, color: 'warning.main' },
      { label: 'Gate 1', value: gate1, icon: <Filter1Icon />, color: 'secondary.main' },
    ]
  }, [gateReviews])

  const filteredReviews = useMemo(() => {
    let list = [...gateReviews]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((g) =>
          g.pm_gatename?.toLowerCase().includes(q) ||
          g.pm_leadreviewer?.toLowerCase().includes(q) ||
          g.pm_projectcode?.toLowerCase().includes(q) ||
          g.pm_programmename?.toLowerCase().includes(q)
      )
    }
    if (stageFilter) list = list.filter((g) => String(g.pm_gatestage) === stageFilter)
    if (outcomeFilter) list = list.filter((g) => String(g.pm_reviewoutcome) === outcomeFilter)

    return list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      if (sort.field === 'planned') return (a.pm_plannedreviewdate ?? '').localeCompare(b.pm_plannedreviewdate ?? '') * dir
      return (a.pm_gatename ?? '').localeCompare(b.pm_gatename ?? '') * dir
    })
  }, [gateReviews, searchQuery, stageFilter, outcomeFilter, sort])

  const handleSaveReview = async () => {
    if (!formData.pm_gatename.trim()) return
    setActionLoading(true)
    try {
      if (editingReview?.pm_projectgatereviewid) {
        await updateGateReview(editingReview.pm_projectgatereviewid, formData as any)
        setSuccessMsg('Gate review updated.')
      } else {
        await createGateReview(formData as any)
        setSuccessMsg('Gate review created.')
      }
      setShowFormModal(false)
      loadData()
    } catch {
      setError('Unable to save gate review.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteGateReview(deleteConfirm)
      setSuccessMsg('Gate review removed.')
      setDeleteConfirm(null)
      if (selectedReview?.pm_projectgatereviewid === deleteConfirm) setSelectedReview(null)
      loadData()
    } catch {
      setError('Unable to delete gate review.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Gate Reviews"
        subtitle="Schedule and track project gate reviews, record outcomes, and manage conditions."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton filename="gate-reviews.csv" columns={gateReviewExportColumns} data={filteredReviews} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingReview(null); setShowFormModal(true) }}>
              Schedule Review
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!loading && <KpiCardRow items={kpiItems} />}

      <Paper sx={{ overflow: 'hidden', mb: 3, borderRadius: 2 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterValue={stageFilter}
          onFilterChange={setStageFilter}
          filterLabel="Stage"
          filterOptions={STAGE_FILTER_OPTIONS}
          extraFilters={
            <SearchFilterBar 
              filterValue={outcomeFilter} 
              onFilterChange={setOutcomeFilter} 
              filterLabel="Outcome" 
              filterOptions={OUTCOME_FILTER_OPTIONS} 
              sx={{ border: 'none', p: 0, minWidth: 150 }} 
            />
          }
          onClear={() => { setSearchQuery(''); setStageFilter(''); setOutcomeFilter(''); setPage(0) }}
        />

        <TableShell loading={loading} empty={filteredReviews.length === 0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 700 }}>Gate Review</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Outcome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Planned Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reviewer</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReviews.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((review) => (
                <TableRow key={review.pm_projectgatereviewid} hover onClick={() => setSelectedReview(review)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm }}>G</Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{review.pm_gatename}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><StatusTag label={GATE_STAGE_LABELS[String(review.pm_gatestage)]} color={GATE_STAGE_VARIANTS[String(review.pm_gatestage)]} /></TableCell>
                  <TableCell><StatusTag label={OUTCOME_LABELS[String(review.pm_reviewoutcome)]} color={OUTCOME_COLORS[String(review.pm_reviewoutcome)]} /></TableCell>
                  <TableCell>{review.pm_plannedreviewdate ? new Date(review.pm_plannedreviewdate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{review.pm_leadreviewer || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      </Paper>

      <DetailDrawer
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title={selectedReview?.pm_gatename ?? ''}
        icon={<FactCheckIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <ActionIcon icon={<EditIcon />} onClick={() => { setEditingReview(selectedReview); setShowFormModal(true) }} label="Edit" color="primary" />
            <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteConfirm(selectedReview?.pm_projectgatereviewid!)} label="Delete" color="error" />
          </Box>
        }
      >
        {selectedReview && (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedReview.pm_reviewnotes || 'No notes'}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Reviewer</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReview.pm_leadreviewer || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Scheduled Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReview.pm_plannedreviewdate ? new Date(selectedReview.pm_plannedreviewdate).toLocaleDateString() : '—'}</Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </DetailDrawer>

      <Dialog open={showFormModal} onClose={() => setShowFormModal(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingReview ? 'Edit Review' : 'Schedule Review'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}><TextField label="Gate Name" fullWidth size="small" value={formData.pm_gatename} onChange={(e) => setFormData(f => ({ ...f, pm_gatename: e.target.value }))} slotProps={{ input: { sx: { borderRadius: 1.5 } } }} /></Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage</InputLabel>
                <Select value={formData.pm_gatestage} label="Stage" onChange={(e) => setFormData(f => ({ ...f, pm_gatestage: e.target.value as number }))} sx={{ borderRadius: 1.5 }}>
                  <MenuItem value={0}>Gate 1</MenuItem><MenuItem value={1}>Gate 2</MenuItem><MenuItem value={2}>Gate 3</MenuItem><MenuItem value={3}>Gate 4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowFormModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveReview} disabled={actionLoading}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete this review?</Typography></DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteReview}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
