import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Alert, useTheme,
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
import SendIcon from '@mui/icons-material/Send'
import DescriptionIcon from '@mui/icons-material/Description'
import VerifiedIcon from '@mui/icons-material/Verified'
import PeopleIcon from '@mui/icons-material/People'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import TimerIcon from '@mui/icons-material/Timer'
import CategoryIcon from '@mui/icons-material/Category'

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchChangeRequests,
  createChangeRequest,
  updateChangeRequest,
  deleteChangeRequest,
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
  startWorkflowForEntity,
  fetchWorkflows,
} from '@/services'
import type { ChangeRequestModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import type { ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import { fontSizes } from '@/styles'
import type { ExportColumn } from '@/utils/exportUtils'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, StatusTag, ActionIcon, WorkflowMilestone, ConfirmDialog } from '@/components/common'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
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
  const { currentUser } = useUser()

  const { allowed: canCreate } = useAuthorization('CHANGE_REQUESTS', 'create')
  const { allowed: canEdit } = useAuthorization('CHANGE_REQUESTS', 'update')
  const { allowed: canDelete } = useAuthorization('CHANGE_REQUESTS', 'delete')

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
  const [approvalLoading, setApprovalLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchChangeRequests()
      setChangeRequests(result ?? [])
    } catch (err) {
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
    const scopeChanges = changeRequests.filter((cr) => String(cr.pm_changetype) === '0').length

    return [
      {
        label: 'Total Requests',
        value: String(total),
        icon: <ChangeCircleIcon />,
        color: 'primary.main',
      },
      {
        label: 'Under Review',
        value: String(underReview),
        subtitle: underReview > 0 ? Math.round((underReview / total) * 100) + '% of total' : 'No pending reviews',
        icon: <HourglassEmptyIcon />,
        color: 'warning.main',
      },
      {
        label: 'Approved',
        value: String(approved),
        subtitle: total > 0 ? Math.round((approved / total) * 100) + '% approval rate' : 'No approvals yet',
        icon: <CheckCircleIcon />,
        color: 'success.main',
      },
      {
        label: 'Total Cost Impact',
        value: '\u20AC' + numberFormatter.format(totalCostImpact),
        icon: <AttachMoneyIcon />,
        color: totalCostImpact > 100000 ? 'error.main' : 'secondary.main',
      },
      {
        label: 'Schedule Impact',
        value: `${totalScheduleImpact} days`,
        icon: <TimerIcon />,
        color: 'warning.main',
      },
      {
        label: 'Scope Changes',
        value: String(scopeChanges),
        icon: <CategoryIcon />,
        color: 'secondary.main',
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
        const created = await createChangeRequest(payload)
        setSuccessMsg('Change request created successfully.')

        // Auto-trigger workflow after creation
        if (created?.pm_changerequestid) {
          try {
            const workflows = await fetchWorkflows()
            const crWorkflow = workflows.find(
              (wf) => (wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0') && (
                wf.pm_module?.toLowerCase() === 'changerequest' ||
                wf.pm_module?.toLowerCase() === 'changerequests' ||
                (wf.pm_workflowname ?? '').toLowerCase().includes('change request')
              )
            )
            if (crWorkflow?.pm_workflowid) {
              await startWorkflowForEntity(
                crWorkflow.pm_workflowid,
                created.pm_changerequestid,
                MODULE_NAMES.CHANGE_REQUESTS.value,
                currentUser?.fullname ?? 'System'
              )
            }
          } catch (wfErr) {
            // Ignore auto-trigger workflow failure
          }
        }
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
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                Add Change Request
              </Button>
            )}
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
              <InputLabel sx={{ fontSize: fontSizes.base }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ bgcolor: 'background.paper' }}
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
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'title'} direction={sort.field === 'title' ? sort.dir : 'asc'} onClick={() => handleSort('title')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Title</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'type'} direction={sort.field === 'type' ? sort.dir : 'asc'} onClick={() => handleSort('type')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Type</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'priority'} direction={sort.field === 'priority' ? sort.dir : 'asc'} onClick={() => handleSort('priority')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Priority</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'status'} direction={sort.field === 'status' ? sort.dir : 'asc'} onClick={() => handleSort('status')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Status</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'cost'} direction={sort.field === 'cost' ? sort.dir : 'asc'} onClick={() => handleSort('cost')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Cost Impact</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'schedule'} direction={sort.field === 'schedule' ? sort.dir : 'asc'} onClick={() => handleSort('schedule')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Schedule</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'requestor'} direction={sort.field === 'requestor' ? sort.dir : 'asc'} onClick={() => handleSort('requestor')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Requestor</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>Entity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'date'} direction={sort.field === 'date' ? sort.dir : 'asc'} onClick={() => handleSort('date')} sx={{ fontWeight: 700, color: isDark ? 'text.primary' : 'text.secondary' }}>Date</TableSortLabel>
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
                    bgcolor: idx % 2 === 1 ? (isDark ? 'action.hover' : 'background.default') : 'transparent',
                    '&:hover': { bgcolor: isDark ? 'action.selected' : 'primary.light' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.xs, fontWeight: 700 }}>
                        {(cr.pm_changerequesttitle ?? 'CR').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{cr.pm_changerequesttitle ?? 'Unnamed'}</Typography>
                        {cr.pm_changerequestreference && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '\"JetBrains Mono\", monospace', fontSize: fontSizes.xs }}>
                            {cr.pm_changerequestreference}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusTag label={CHANGE_TYPE_LABELS[String(cr.pm_changetype ?? '')] ?? 'Unknown'} color={CHANGE_TYPE_COLORS[String(cr.pm_changetype ?? '')] ?? 'default'} />
                  </TableCell>
                  <TableCell>
                    <StatusTag label={PRIORITY_LABELS[String(cr.pm_prioritylevel ?? '')] ?? 'Unknown'} color={PRIORITY_COLORS[String(cr.pm_prioritylevel ?? '')] ?? 'default'} />
                  </TableCell>
                  <TableCell>
                    <StatusTag label={STATUS_LABELS[String(cr.pm_status ?? '')] ?? 'Unknown'} color={STATUS_COLORS[String(cr.pm_status ?? '')] ?? 'default'} variant="outlined" />
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
                      <PeopleIcon sx={{ fontSize: fontSizes.base, color: 'text.secondary' }} />
                      <Typography variant="body2">{cr.pm_requestorname || '\u2014'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: fontSizes.sm }}>{cr.pm_projectcode || cr.pm_programmename || '\u2014'}</Typography>
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
        icon={<ChangeCircleIcon sx={{ color: 'primary.main', fontSize: fontSizes.xl }} />}
        title={selectedCR?.pm_changerequesttitle ?? ''}
        subtitle={selectedCR && (
          <>
            <StatusTag label={STATUS_LABELS[String(selectedCR.pm_status ?? '')] ?? 'Unknown'} color={STATUS_COLORS[String(selectedCR.pm_status ?? '')] ?? 'default'} variant="outlined" />
            {selectedCR.pm_changerequestreference && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, display: 'inline', fontFamily: '\"JetBrains Mono\", monospace', fontSize: fontSizes.xs }}>
                {selectedCR.pm_changerequestreference}
              </Typography>
            )}
          </>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {selectedCR && String(selectedCR.pm_status) === '1' && (
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={approvalLoading}
                onClick={async () => {
                  if (!selectedCR?.pm_changerequestid) return
                  setApprovalLoading(true)
                  setError(null)
                  try {
                    // Find an active workflow for the ChangeRequests module
                    const workflows = await fetchWorkflows()
                    // Match by pm_module first, then fall back to workflow name containing 'change request'
                    const crWorkflow = workflows.find(
                      (wf) => (wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0') && (
                        wf.pm_module?.toLowerCase() === 'changerequest' ||
                        wf.pm_module?.toLowerCase() === 'changerequests' ||
                        (wf.pm_workflowname ?? '').toLowerCase().includes('change request')
                      )
                    )
                    if (!crWorkflow?.pm_workflowid) {
                      setError('No active workflow template found for Change Requests. Create one in Workflows first.')
                      return
                    }
                    const result = await startWorkflowForEntity(
                      crWorkflow.pm_workflowid,
                      selectedCR.pm_changerequestid,
                      MODULE_NAMES.CHANGE_REQUESTS.value,
                      currentUser?.fullname ?? 'Unknown'
                    )
                    if (result) {
                      setSuccessMsg('Change request submitted for approval!')
                    } else {
                      setError('Failed to start workflow. Check that the workflow has step templates configured.')
                    }
                  } catch (err) {
                    setError('Unable to submit for approval.')
                  } finally {
                    setApprovalLoading(false)
                    setTimeout(() => setSuccessMsg(null), 4000)
                  }
                }}
                startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 12, py: 0.5 }}
              >
                {approvalLoading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            )}
            {canDelete && (
              <ActionIcon
                label="Delete"
                color="error"
                onClick={() => selectedCR?.pm_changerequestid && setDeleteConfirm(selectedCR.pm_changerequestid)}
                icon={<DeleteIcon />}
              />
            )}
            {canEdit && (
              <ActionIcon
                label="Edit"
                color="primary"
                onClick={() => selectedCR && openEditForm(selectedCR)}
                icon={<EditIcon />}
              />
            )}
          </Box>
        }
        tabs={[{ label: 'Overview' }, { label: 'Details' }, { label: 'Approval' }, { label: 'Tasks' }]}
        tabValue={detailTab}
        onTabChange={(_e, v) => { setDetailTab(v); setError(null) }}
      >
        {selectedCR && (
          <>
            <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GppMaybeIcon sx={{ fontSize: 16 }} /> Impact Summary
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, textAlign: 'center', borderLeft: '3px solid', borderLeftColor: 'error.main' }}>
                      <AttachMoneyIcon sx={{ fontSize: 20, color: 'error.main', mb: 0.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '\"JetBrains Mono\", monospace', fontSize: 16 }}>
                        {selectedCR.pm_costimpacteur != null ? '\u20AC' + numberFormatter.format(selectedCR.pm_costimpacteur) : '\u2014'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Cost Impact</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, textAlign: 'center', borderLeft: '3px solid', borderLeftColor: 'warning.main' }}>
                      <ScheduleIcon sx={{ fontSize: 20, color: 'warning.main', mb: 0.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '\"JetBrains Mono\", monospace', fontSize: 16 }}>
                        {selectedCR.pm_scheduleimpactdays != null ? selectedCR.pm_scheduleimpactdays + ' days' : '\u2014'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Schedule Impact</Typography>
                    </Paper>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Baseline Updated:</Typography>
                    <StatusTag label={selectedCR.pm_baselineupdated ? 'Yes' : 'No'} color={selectedCR.pm_baselineupdated ? 'warning' : 'default'} />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedCR.pm_changedescription || 'No description provided.'}
                  </Typography>
                </Paper>

                {selectedCR.pm_justification && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VerifiedIcon sx={{ fontSize: 16 }} /> Justification
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                      {selectedCR.pm_justification}
                    </Typography>
                  </Paper>
                )}

                {selectedCR.pm_benefitsimpact && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
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
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
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

            <TabPanel value={detailTab} index={2} pt={0}>
              {selectedCR.pm_changerequestid && (
                <WorkflowMilestone
                  moduleName="ChangeRequest"
                  entityId={selectedCR.pm_changerequestid}
                />
              )}
            </TabPanel>

            <TabPanel value={detailTab} index={3} pt={0}>
              {selectedCR.pm_changerequestid && (
                <EntityApprovalTasks
                  entityId={selectedCR.pm_changerequestid}
                  moduleName={MODULE_NAMES.CHANGE_REQUESTS.value}
                  entityLabel="Change Request"
                  tabValue={detailTab}
                  index={3}
                />
              )}
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      <Dialog
        open={showFormModal}
        onClose={() => !actionLoading && setShowFormModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {editingCR ? <EditIcon sx={{ fontSize: 18 }} /> : <AddIcon sx={{ fontSize: 18 }} />}
          </Avatar>
          {editingCR ? 'Edit Change Request' : 'New Change Request'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingCR ? 'Update details for ' + editingCR.pm_changerequesttitle + '.' : 'Submit a change request to track scope, schedule, cost, or resource changes.'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ChangeCircleIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>Basic Information</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Change Request Title" required fullWidth size="small" value={formData.pm_changerequesttitle}
                onChange={(e) => setFormData((f) => ({ ...f, pm_changerequesttitle: e.target.value }))}
                placeholder="e.g., Add new reporting module" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Change Type</InputLabel>
                <Select value={formData.pm_changetype} label="Change Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_changetype: e.target.value as number }))}>
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
                  onChange={(e) => setFormData((f) => ({ ...f, pm_prioritylevel: e.target.value as number }))}>
                  <MenuItem value={0}>Medium</MenuItem>
                  <MenuItem value={1}>High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Requestor Name" fullWidth size="small" value={formData.pm_requestorname}
                onChange={(e) => setFormData((f) => ({ ...f, pm_requestorname: e.target.value }))}
                placeholder="e.g., John Smith" />
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
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GppMaybeIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>Impact Details</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Cost Impact (EUR)" type="number" fullWidth size="small" value={formData.pm_costimpacteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_costimpacteur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>&euro;</Typography> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Schedule Impact (days)" type="number" fullWidth size="small" value={formData.pm_scheduleimpactdays}
                onChange={(e) => setFormData((f) => ({ ...f, pm_scheduleimpactdays: Number(e.target.value) }))}
                slotProps={{ input: { endAdornment: <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>days</Typography> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={formData.pm_baselineupdated} onChange={(e) => setFormData((f) => ({ ...f, pm_baselineupdated: e.target.checked }))} />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Baseline Updated</Typography>} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Description of Change" fullWidth multiline rows={3} size="small" value={formData.pm_changedescription}
                onChange={(e) => setFormData((f) => ({ ...f, pm_changedescription: e.target.value }))}
                placeholder="Describe the proposed change in detail..." />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Justification" fullWidth multiline rows={2} size="small" value={formData.pm_justification}
                onChange={(e) => setFormData((f) => ({ ...f, pm_justification: e.target.value }))}
                placeholder="Why is this change necessary?" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Benefits Impact" fullWidth multiline rows={2} size="small" value={formData.pm_benefitsimpact}
                onChange={(e) => setFormData((f) => ({ ...f, pm_benefitsimpact: e.target.value }))}
                placeholder="How does this change affect expected benefits?" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleSave} variant="contained"
            disabled={!String(formData.pm_changerequesttitle || '').trim() || actionLoading}
            sx={{ fontWeight: 600 }}>
            {actionLoading ? 'Saving...' : editingCR ? 'Update Change Request' : 'Submit Change Request'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Remove Change Request"
        message="Are you sure you want to remove this change request? This action cannot be undone."
        confirmLabel={actionLoading ? 'Removing...' : 'Remove'}
        confirmColor="error"
        loading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}
