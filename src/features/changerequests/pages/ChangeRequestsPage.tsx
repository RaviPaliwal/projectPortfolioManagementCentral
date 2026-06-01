import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Divider, Avatar, LinearProgress,
  Switch, FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import DescriptionIcon from '@mui/icons-material/Description'
import VerifiedIcon from '@mui/icons-material/Verified'
import PeopleIcon from '@mui/icons-material/People'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

import {
  fetchChangeRequests,
  createChangeRequest,
  updateChangeRequest,
  deleteChangeRequest,
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
} from '@/lib/dataverseClient'
import type { ChangeRequestModel } from '@/types/dataverse'
import type { ProgrammeLookupItem, ProjectLookupItem } from '@/lib/dataverseClient'
import { fontSizes } from '@/styles'
import type { ExportColumn } from '@/utils/exportUtils'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

const CHANGE_TYPE_LABELS: Record<string, string> = {
  '0': 'Scope',
  '1': 'Schedule',
  '2': 'Resource',
}

const CHANGE_TYPE_COLORS: Record<string, 'primary' | 'warning' | 'info'> = {
  '0': 'primary',
  '1': 'warning',
  '2': 'info',
}

const PRIORITY_LABELS: Record<string, string> = {
  '0': 'Medium',
  '1': 'High',
}

const PRIORITY_COLORS: Record<string, 'warning' | 'error'> = {
  '0': 'warning',
  '1': 'error',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Approved',
  '1': 'Under Review',
}

const STATUS_COLORS: Record<string, 'success' | 'warning'> = {
  '0': 'success',
  '1': 'warning',
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })


// ─── Export Columns ──────────────────────────────────────────────────

const changeRequestExportColumns: ExportColumn<ChangeRequestModel>[] = [
  { key: 'pm_changerequesttitle', label: 'Title' },
  { key: 'pm_changerequestreference', label: 'Reference' },
  { key: 'pm_changetype', label: 'Type', format: (v) => CHANGE_TYPE_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_prioritylevel', label: 'Priority', format: (v) => PRIORITY_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_status', label: 'Status', format: (v) => STATUS_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_costimpacteur', label: 'Cost Impact (EUR)' },
  { key: 'pm_scheduleimpactdays', label: 'Schedule Impact (days)' },
  { key: 'pm_requestorname', label: 'Requestor' },
  { key: 'pm_changedescription', label: 'Description' },
  { key: 'pm_justification', label: 'Justification' },
  { key: 'pm_benefitsimpact', label: 'Benefits Impact' },
  { key: 'pm_projectcode', label: 'Project' },
  { key: 'pm_programmename', label: 'Programme' },
  { key: 'pm_submissiondate', label: 'Submission Date' },
  { key: 'pm_baselineupdated', label: 'Baseline Updated', format: (v) => v ? 'Yes' : 'No' },
]

// ─── Filter Options ──────────────────────────────────────────────────

const TYPE_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Types' },
  { value: '0', label: 'Scope' },
  { value: '1', label: 'Schedule' },
  { value: '2', label: 'Resource' },
]

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '1', label: 'Under Review' },
  { value: '0', label: 'Approved' },
]

type SortField = 'title' | 'reference' | 'type' | 'priority' | 'status' | 'cost' | 'schedule' | 'requestor' | 'date'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

export default function ChangeRequestsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [changeRequests, setChangeRequests] = useState<ChangeRequestModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Lookup data state
  const [programmes, setProgrammes] = useState<ProgrammeLookupItem[]>([])
  const [projects, setProjects] = useState<ProjectLookupItem[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'title', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [selectedCR, setSelectedCR] = useState<ChangeRequestModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCR, setEditingCR] = useState<ChangeRequestModel | null>(null)
  const [formData, setFormData] = useState<Partial<ChangeRequestModel>>({
    pm_changerequestreference: '',
    pm_changerequesttitle: '',
    pm_changetype: 0,
    pm_prioritylevel: 0,
    pm_status: 1,
    pm_changedescription: '',
    pm_justification: '',
    pm_costimpacteur: 0,
    pm_scheduleimpactdays: 0,
    pm_baselineupdated: false,
    pm_benefitsimpact: '',
    pm_requestorname: '',
    pm_projectcode: '',
    pm_submissiondate: new Date().toISOString().split('T')[0],
    _pm_programmelookup_value: '',
    _pm_project_value: '',
  })

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchChangeRequests()
      setChangeRequests(result ?? [])
    } catch (err) {
      console.error('[ChangeRequestsPage] loadData error:', err)
      setError('Unable to load change requests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Fetch lookup data for programme/project selects
  useEffect(() => {
    Promise.all([
      fetchProgrammesForLookup(),
      fetchProjectsForLookup(),
    ]).then(([progs, projs]) => {
      setProgrammes(progs)
      setProjects(projs)
    }).catch((err) => {
      console.error('Failed to load lookup data:', err)
    })
  }, [])

  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = changeRequests.length
    const underReview = changeRequests.filter((cr) => String(cr.pm_status) === '1').length
    const approved = changeRequests.filter((cr) => String(cr.pm_status) === '0').length
    const totalCostImpact = changeRequests.reduce((s, cr) => s + (cr.pm_costimpacteur ?? 0), 0)
    const totalScheduleImpact = changeRequests.reduce((s, cr) => s + (cr.pm_scheduleimpactdays ?? 0), 0)

    return [
      {
        label: 'Total Requests',
        value: String(total),
        subtitle: 'Total change requests logged',
        icon: <ChangeCircleIcon />,
        color: '#0ea5e9',
      },
      {
        label: 'Under Review',
        value: String(underReview),
        subtitle: underReview > 0 ? Math.round((underReview / total) * 100) + '% of total' : 'No pending reviews',
        icon: <HourglassEmptyIcon />,
        color: '#f59e0b',
      },
      {
        label: 'Approved',
        value: String(approved),
        subtitle: total > 0 ? Math.round((approved / total) * 100) + '% approval rate' : 'No approvals yet',
        icon: <CheckCircleIcon />,
        color: '#22c55e',
      },
      {
        label: 'Total Cost Impact',
        value: '\u20AC' + numberFormatter.format(totalCostImpact),
        subtitle: totalScheduleImpact > 0 ? totalScheduleImpact + ' days schedule impact' : 'No schedule impact',
        icon: <AttachMoneyIcon />,
        color: totalCostImpact > 100000 ? '#ef4444' : '#8b5cf6',
      },
    ]
  }, [changeRequests])

  const filteredCRs = useMemo(() => {
    let list = [...changeRequests]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (cr) =>
          cr.pm_changerequesttitle?.toLowerCase().includes(q) ||
          cr.pm_changerequestreference?.toLowerCase().includes(q) ||
          cr.pm_requestorname?.toLowerCase().includes(q) ||
          cr.pm_projectcode?.toLowerCase().includes(q) ||
          cr.pm_programmename?.toLowerCase().includes(q) ||
          cr.pm_changedescription?.toLowerCase().includes(q)
      )
    }

    if (typeFilter) {
      list = list.filter((cr) => String(cr.pm_changetype) === typeFilter)
    }

    if (statusFilter) {
      list = list.filter((cr) => String(cr.pm_status) === statusFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'title':
          cmp = (a.pm_changerequesttitle ?? '').localeCompare(b.pm_changerequesttitle ?? '')
          break
        case 'reference':
          cmp = (a.pm_changerequestreference ?? '').localeCompare(b.pm_changerequestreference ?? '')
          break
        case 'type':
          cmp = String(a.pm_changetype ?? '').localeCompare(String(b.pm_changetype ?? ''))
          break
        case 'priority':
          cmp = Number(a.pm_prioritylevel ?? 0) - Number(b.pm_prioritylevel ?? 0)
          break
        case 'status':
          cmp = String(a.pm_status ?? '').localeCompare(String(b.pm_status ?? ''))
          break
        case 'cost':
          cmp = Number(a.pm_costimpacteur ?? 0) - Number(b.pm_costimpacteur ?? 0)
          break
        case 'schedule':
          cmp = Number(a.pm_scheduleimpactdays ?? 0) - Number(b.pm_scheduleimpactdays ?? 0)
          break
        case 'requestor':
          cmp = (a.pm_requestorname ?? '').localeCompare(b.pm_requestorname ?? '')
          break
        case 'date':
          cmp = (a.pm_submissiondate ?? '').localeCompare(b.pm_submissiondate ?? '')
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [changeRequests, searchQuery, typeFilter, statusFilter, sort])

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((cr: ChangeRequestModel) => {
    setSelectedCR(cr)
    setDetailTab(0)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedCR(null)
    setDetailTab(0)
  }, [])

  const paginatedCRs = useMemo(
    () => filteredCRs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredCRs, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])

  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(0) }, [])
  const handleTypeFilterChange = useCallback((v: string) => { setTypeFilter(v); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((v: string) => { setStatusFilter(v); setPage(0) }, [])

  const openCreateForm = useCallback(() => {
    setEditingCR(null)
    setFormData({
      pm_changerequesttitle: '',
      pm_changetype: 0,
      pm_prioritylevel: 0,
      pm_status: 1,
      pm_changedescription: '',
      pm_justification: '',
      pm_costimpacteur: 0,
      pm_scheduleimpactdays: 0,
      pm_baselineupdated: false,
      pm_benefitsimpact: '',
      pm_requestorname: '',
      pm_projectcode: '',
      pm_submissiondate: new Date().toISOString().split('T')[0],
      _pm_programmelookup_value: '',
      _pm_project_value: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((cr: ChangeRequestModel) => {
    setEditingCR(cr)
    setFormData({
      pm_changerequesttitle: cr.pm_changerequesttitle ?? '',
      pm_changetype: Number(cr.pm_changetype) || 0,
      pm_prioritylevel: Number(cr.pm_prioritylevel) || 0,
      pm_status: Number(cr.pm_status) ?? 1,
      pm_changedescription: cr.pm_changedescription ?? '',
      pm_justification: cr.pm_justification ?? '',
      pm_costimpacteur: cr.pm_costimpacteur ?? 0,
      pm_scheduleimpactdays: cr.pm_scheduleimpactdays ?? 0,
      pm_baselineupdated: cr.pm_baselineupdated ?? false,
      pm_benefitsimpact: cr.pm_benefitsimpact ?? '',
      pm_requestorname: cr.pm_requestorname ?? '',
      pm_projectcode: cr.pm_projectcode ?? '',
      pm_submissiondate: (cr.pm_submissiondate ?? '').split('T')[0] ?? '',
      _pm_programmelookup_value: cr._pm_programmelookup_value ?? '',
      _pm_project_value: cr._pm_project_value ?? '',
    })
    setShowFormModal(true)
  }, [])

  // ─── Auto-generate reference ───────────────────────────────────────────────

  const autoGenerateReference = useCallback((): string => {
    // Find the highest existing reference number
    let maxNum = 0
    for (const cr of changeRequests) {
      const ref = cr.pm_changerequestreference || ''
      const match = ref.match(/^CR-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    const nextNum = maxNum + 1
    return `CR-${String(nextNum).padStart(3, '0')}`
  }, [changeRequests])

  const handleSave = async () => {
    if (!String(formData.pm_changerequesttitle || '').trim()) {
      setError('Change request title is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload = { ...formData }
      if (editingCR?.pm_changerequestid) {
        await updateChangeRequest(editingCR.pm_changerequestid, payload)
        setSuccessMsg('Change request updated successfully.')
      } else {
        // Auto-generate reference for new change requests
        payload.pm_changerequestreference = autoGenerateReference()
        await createChangeRequest(payload)
        setSuccessMsg('Change request created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingCR ? 'Unable to update change request.' : 'Unable to create change request.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteChangeRequest(deleteConfirm)
      setSuccessMsg('Change request removed successfully.')
      setDeleteConfirm(null)
      if (selectedCR?.pm_changerequestid === deleteConfirm) {
        setSelectedCR(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete change request.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Change Requests"
        subtitle="Manage scope, schedule, cost, and resource changes across projects and programmes \u2014 track lifecycle from submission to approval."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredCRs} columns={changeRequestExportColumns} filename="change_requests" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add Change Request
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!loading && <KpiCardRow items={kpiItems} />}

      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by title, reference, requestor, project..."
          filterValue={typeFilter}
          onFilterChange={handleTypeFilterChange}
          filterLabel="Type"
          filterOptions={TYPE_FILTER_OPTIONS}
          extraFilters={
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel sx={{ fontSize: 14 }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ borderRadius: 2, bgcolor: isDark ? '#1e293b' : '#fff' }}
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
          empty={filteredCRs.length === 0}
          emptyIcon={<ChangeCircleIcon />}
          emptyTitle={searchQuery || typeFilter || statusFilter ? 'No change requests match your criteria.' : 'No change requests found.'}
          emptyAction={!searchQuery && !typeFilter && !statusFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add your first change request
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'title'} direction={sort.field === 'title' ? sort.dir : 'asc'} onClick={() => handleSort('title')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Title</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'reference'} direction={sort.field === 'reference' ? sort.dir : 'asc'} onClick={() => handleSort('reference')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Ref</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'type'} direction={sort.field === 'type' ? sort.dir : 'asc'} onClick={() => handleSort('type')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Type</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'priority'} direction={sort.field === 'priority' ? sort.dir : 'asc'} onClick={() => handleSort('priority')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Priority</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'status'} direction={sort.field === 'status' ? sort.dir : 'asc'} onClick={() => handleSort('status')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Status</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'cost'} direction={sort.field === 'cost' ? sort.dir : 'asc'} onClick={() => handleSort('cost')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Cost Impact</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'schedule'} direction={sort.field === 'schedule' ? sort.dir : 'asc'} onClick={() => handleSort('schedule')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Schedule</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'requestor'} direction={sort.field === 'requestor' ? sort.dir : 'asc'} onClick={() => handleSort('requestor')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Requestor</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>Entity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'date'} direction={sort.field === 'date' ? sort.dir : 'asc'} onClick={() => handleSort('date')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Date</TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCRs.map((cr, idx) => (
                <TableRow
                  key={cr.pm_changerequestid}
                  hover
                  onClick={() => handleRowClick(cr)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                    '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', fontSize: 12, fontWeight: 700 }}>
                        {(cr.pm_changerequesttitle ?? 'CR').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{cr.pm_changerequesttitle ?? 'Unnamed'}</Typography>
                        {cr.pm_changerequestreference && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '\"JetBrains Mono\", monospace', fontSize: 11 }}>
                            {cr.pm_changerequestreference}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '\"JetBrains Mono\", monospace' }}>
                      {cr.pm_changerequestreference || '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={CHANGE_TYPE_LABELS[String(cr.pm_changetype ?? '')] ?? 'Unknown'} color={CHANGE_TYPE_COLORS[String(cr.pm_changetype ?? '')] ?? 'default'} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 8 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={PRIORITY_LABELS[String(cr.pm_prioritylevel ?? '')] ?? 'Unknown'} color={PRIORITY_COLORS[String(cr.pm_prioritylevel ?? '')] ?? 'default'} size="small" sx={{ fontWeight: 600, borderRadius: 8 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[String(cr.pm_status ?? '')] ?? 'Unknown'} color={STATUS_COLORS[String(cr.pm_status ?? '')] ?? 'default'} size="small" variant={String(cr.pm_status) === '0' ? 'filled' : 'outlined'} sx={{ fontWeight: 600, borderRadius: 8 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '\"JetBrains Mono\", monospace', fontWeight: 600 }}>
                      {cr.pm_costimpacteur != null ? '\u20AC' + numberFormatter.format(cr.pm_costimpacteur) : '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '\"JetBrains Mono\", monospace' }}>
                      {cr.pm_scheduleimpactdays != null ? cr.pm_scheduleimpactdays + 'd' : '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PeopleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2">{cr.pm_requestorname || '\u2014'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>{cr.pm_projectcode || cr.pm_programmename || '\u2014'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '\"JetBrains Mono\", monospace' }}>
                      {cr.pm_submissiondate ? new Date(cr.pm_submissiondate).toLocaleDateString() : '\u2014'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredCRs.length > 0 && (
          <>
            <TableFooter
              filteredCount={filteredCRs.length}
              totalCount={changeRequests.length}
              itemLabel="change request"
              totals={[
                { label: 'Total cost impact', value: '\u20AC' + numberFormatter.format(filteredCRs.reduce((s, cr) => s + (cr.pm_costimpacteur ?? 0), 0)) },
                { label: 'Total schedule impact', value: filteredCRs.reduce((s, cr) => s + (cr.pm_scheduleimpactdays ?? 0), 0) + ' days' },
              ]}
            />
            <TablePagination
              component="div"
              count={filteredCRs.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </>
        )}
      </Paper>

      <DetailDrawer
        open={!!selectedCR}
        onClose={handleCloseDetail}
        icon={<ChangeCircleIcon sx={{ color: '#0ea5e9', fontSize: 22 }} />}
        title={selectedCR?.pm_changerequesttitle ?? ''}
        subtitle={selectedCR && (
          <>
            <Chip label={STATUS_LABELS[String(selectedCR.pm_status ?? '')] ?? 'Unknown'} color={STATUS_COLORS[String(selectedCR.pm_status ?? '')] ?? 'default'} size="small" variant={String(selectedCR.pm_status) === '0' ? 'filled' : 'outlined'} sx={{ fontWeight: 600, borderRadius: 8 }} />
            {selectedCR.pm_changerequestreference && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, display: 'inline', fontFamily: '\"JetBrains Mono\", monospace' }}>
                {selectedCR.pm_changerequestreference}
              </Typography>
            )}
          </>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" color="error" onClick={() => selectedCR?.pm_changerequestid && setDeleteConfirm(selectedCR.pm_changerequestid)} sx={{ borderRadius: 1.5 }}>
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton size="small" onClick={() => selectedCR && openEditForm(selectedCR)} sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.5 }}>
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
        tabs={[{ label: 'Overview' }, { label: 'Details' }]}
        tabValue={detailTab}
        onTabChange={(_e, v) => { setDetailTab(v); setError(null) }}
      >
        {selectedCR && (
          <>
            <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GppMaybeIcon sx={{ fontSize: 16 }} /> Impact Summary
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
                      <AttachMoneyIcon sx={{ fontSize: 20, color: '#ef4444', mb: 0.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '\"JetBrains Mono\", monospace', fontSize: 16 }}>
                        {selectedCR.pm_costimpacteur != null ? '\u20AC' + numberFormatter.format(selectedCR.pm_costimpacteur) : '\u2014'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Cost Impact</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderLeft: '3px solid #f59e0b' }}>
                      <ScheduleIcon sx={{ fontSize: 20, color: '#f59e0b', mb: 0.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '\"JetBrains Mono\", monospace', fontSize: 16 }}>
                        {selectedCR.pm_scheduleimpactdays != null ? selectedCR.pm_scheduleimpactdays + ' days' : '\u2014'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Schedule Impact</Typography>
                    </Paper>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Baseline Updated:</Typography>
                    <Chip label={selectedCR.pm_baselineupdated ? 'Yes' : 'No'} color={selectedCR.pm_baselineupdated ? 'warning' : 'default'} size="small" sx={{ fontWeight: 600, borderRadius: 8 }} />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedCR.pm_changedescription || 'No description provided.'}
                  </Typography>
                </Paper>

                {selectedCR.pm_justification && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VerifiedIcon sx={{ fontSize: 16 }} /> Justification
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                      {selectedCR.pm_justification}
                    </Typography>
                  </Paper>
                )}

                {selectedCR.pm_benefitsimpact && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EmojiEventsIcon sx={{ fontSize: 16 }} /> Benefits Impact
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedCR.pm_benefitsimpact}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={detailTab} index={1} pt={0}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AssignmentIcon sx={{ fontSize: 16 }} /> Change Request Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
                    <Typography variant="body2">{CHANGE_TYPE_LABELS[String(selectedCR.pm_changetype ?? '')] || '\u2014'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Priority</Typography>
                    <Typography variant="body2">{PRIORITY_LABELS[String(selectedCR.pm_prioritylevel ?? '')] || '\u2014'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Requestor</Typography>
                    <Typography variant="body2">{selectedCR.pm_requestorname || '\u2014'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submission Date</Typography>
                    <Typography variant="body2">{selectedCR.pm_submissiondate ? new Date(selectedCR.pm_submissiondate).toLocaleDateString() : '\u2014'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Project</Typography>
                    <Typography variant="body2">{selectedCR.pm_projectname || selectedCR.pm_projectcode || '\u2014'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Programme</Typography>
                    <Typography variant="body2">{selectedCR.pm_programmename || selectedCR.pm_programmelookupname || '\u2014'}</Typography>
                  </Box>
                  {selectedCR.pm_decisionmaker && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Decision Maker</Typography>
                      <Typography variant="body2">{selectedCR.pm_decisionmaker}</Typography>
                    </Box>
                  )}
                  {selectedCR.pm_decisiondate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Decision Date</Typography>
                      <Typography variant="body2">{new Date(selectedCR.pm_decisiondate).toLocaleDateString()}</Typography>
                    </Box>
                  )}
                  {selectedCR.pm_versionnumber != null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Version</Typography>
                      <Typography variant="body2">v{selectedCR.pm_versionnumber}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      <Dialog
        open={showFormModal}
        onClose={() => !actionLoading && setShowFormModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', borderRadius: 1.5 }}>
            {editingCR ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AddIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingCR ? 'Edit Change Request' : 'New Change Request'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingCR ? 'Update details for ' + editingCR.pm_changerequesttitle + '.' : 'Submit a change request to track scope, schedule, cost, or resource changes.'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ChangeCircleIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11, color: 'text.secondary' }}>Basic Information</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Change Request Title" required fullWidth size="small" value={formData.pm_changerequesttitle}
                onChange={(e) => setFormData((f) => ({ ...f, pm_changerequesttitle: e.target.value }))}
                placeholder="e.g., Add new reporting module" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Change Type</InputLabel>
                <Select value={formData.pm_changetype} label="Change Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_changetype: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}>Scope</MenuItem>
                  <MenuItem value={1}>Schedule</MenuItem>
                  <MenuItem value={2}>Resource</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select value={formData.pm_prioritylevel} label="Priority"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_prioritylevel: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}>
                  <MenuItem value={0}>Medium</MenuItem>
                  <MenuItem value={1}>High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Requestor Name" fullWidth size="small" value={formData.pm_requestorname}
                onChange={(e) => setFormData((f) => ({ ...f, pm_requestorname: e.target.value }))}
                placeholder="e.g., John Smith" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Programme</InputLabel>
                <Select
                  value={formData._pm_programmelookup_value || ''}
                  label="Programme"
                  onChange={(e) => setFormData((f) => ({
                    ...f,
                    _pm_programmelookup_value: e.target.value,
                    _pm_project_value: '', // Clear project when programme changes
                  }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {programmes.map((prog) => (
                    <MenuItem key={prog.pm_programmeid} value={prog.pm_programmeid}>
                      {prog.pm_programmename}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Project</InputLabel>
                <Select
                  value={formData._pm_project_value || ''}
                  label="Project"
                  onChange={(e) => {
                    const projectId = e.target.value
                    const selectedProject = projects.find((p) => p.pm_projectid === projectId)
                    setFormData((f) => ({
                      ...f,
                      _pm_project_value: projectId,
                      pm_projectcode: selectedProject?.pm_projectcode || '',
                    }))
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {projects
                    .filter((proj) => {
                      // Cascade: if a programme is selected, only show projects linked to that programme
                      const selectedProgrammeId = formData._pm_programmelookup_value
                      if (!selectedProgrammeId) return true
                      const progId = proj._pm_programme_value?.replace(/[{}]/g, '').trim().toLowerCase()
                      const selectedId = String(selectedProgrammeId).replace(/[{}]/g, '').trim().toLowerCase()
                      return progId === selectedId
                    })
                    .map((proj) => (
                      <MenuItem key={proj.pm_projectid} value={proj.pm_projectid}>
                        {proj.pm_projectname}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Submission Date" type="date" fullWidth size="small" value={formData.pm_submissiondate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_submissiondate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }} />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GppMaybeIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11, color: 'text.secondary' }}>Impact Details</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Cost Impact (EUR)" type="number" fullWidth size="small" value={formData.pm_costimpacteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_costimpacteur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>&euro;</Typography>, sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Schedule Impact (days)" type="number" fullWidth size="small" value={formData.pm_scheduleimpactdays}
                onChange={(e) => setFormData((f) => ({ ...f, pm_scheduleimpactdays: Number(e.target.value) }))}
                slotProps={{ input: { endAdornment: <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>days</Typography>, sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={formData.pm_baselineupdated} onChange={(e) => setFormData((f) => ({ ...f, pm_baselineupdated: e.target.checked }))} />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Baseline Updated</Typography>} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Description of Change" fullWidth multiline rows={3} size="small" value={formData.pm_changedescription}
                onChange={(e) => setFormData((f) => ({ ...f, pm_changedescription: e.target.value }))}
                placeholder="Describe the proposed change in detail..." slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Justification" fullWidth multiline rows={2} size="small" value={formData.pm_justification}
                onChange={(e) => setFormData((f) => ({ ...f, pm_justification: e.target.value }))}
                placeholder="Why is this change necessary?" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Benefits Impact" fullWidth multiline rows={2} size="small" value={formData.pm_benefitsimpact}
                onChange={(e) => setFormData((f) => ({ ...f, pm_benefitsimpact: e.target.value }))}
                placeholder="How does this change affect expected benefits?" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained"
            disabled={!String(formData.pm_changerequesttitle || '').trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}>
            {actionLoading ? 'Saving...' : editingCR ? 'Update Change Request' : 'Submit Change Request'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Change Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Are you sure you want to remove this change request? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
