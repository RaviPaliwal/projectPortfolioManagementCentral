import { useEffect, useState, useMemo, useCallback, type ReactElement } from 'react'
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
  Avatar,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import SendIcon from '@mui/icons-material/Send'
import ApproveIcon from '@mui/icons-material/ThumbUp'
import RejectIcon from '@mui/icons-material/ThumbDown'
import DeleteIcon from '@mui/icons-material/Delete'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import {
  fetchTimesheets,
  createTimesheet,
  updateTimesheetStatus,
  fetchTimesheetEntries,
  createTimesheetEntry,
  deleteTimesheetEntry,
  fetchResources,
} from '@/lib/dataverseClient'
import type { TimesheetModel, TimesheetEntryModel, ResourceModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel } from '@/components/common'
import type { KpiCardItem } from '@/components/common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  '0': 'Approved',
  '1': 'Submitted',
  '2': 'Rejected',
  '3': 'Draft',
}

const STATUS_COLORS: Record<string, 'success' | 'info' | 'error' | 'default'> = {
  '0': 'success',
  '1': 'info',
  '2': 'error',
  '3': 'default',
}

const STATUS_ICONS: Record<string, ReactElement> = {
  '0': <CheckCircleIcon sx={{ fontSize: 16 }} />,
  '1': <SendIcon sx={{ fontSize: 16 }} />,
  '2': <CancelIcon sx={{ fontSize: 16 }} />,
  '3': <EditNoteIcon sx={{ fontSize: 16 }} />,
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: '3', label: 'Draft' },
  { value: '1', label: 'Submitted' },
  { value: '0', label: 'Approved' },
  { value: '2', label: 'Rejected' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [timesheets, setTimesheets] = useState<TimesheetModel[]>([])
  const [resources, setResources] = useState<ResourceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Detail side panel
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetModel | null>(null)
  const [entries, setEntries] = useState<TimesheetEntryModel[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    pm_ownername: '',
    pm_periodstartdate: '',
    pm_periodenddate: '',
    pm_reportingperiod: '',
    _pm_resource_value: '',
  })

  // Add entry modal
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [entryForm, setEntryForm] = useState({
    pm_workdate: '',
    pm_hoursworked: 8,
    pm_worknotes: '',
    pm_ischargeable: true,
    _pm_project_value: '',
  })

  // Detail tab state
  const [detailTab, setDetailTab] = useState(0)

  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [TimesheetsPage] Fetching data...')
      const [list, res] = await Promise.all([
        fetchTimesheets(),
        fetchResources(),
      ])
      console.log('🔍 [TimesheetsPage] Timesheets loaded:', list?.length ?? 0, 'items')
      if (list?.length > 0) console.log('🔍 [TimesheetsPage] Sample timesheet:', JSON.stringify(list[0], null, 2).slice(0, 500))
      console.log('🔍 [TimesheetsPage] Resources loaded:', res?.length ?? 0, 'items')
      if (res?.length > 0) console.log('🔍 [TimesheetsPage] Sample resource:', JSON.stringify(res[0], null, 2).slice(0, 500))
      setTimesheets(list)
      setResources(res)
    } catch (err) {
      console.error('[TimesheetsPage] loadData error:', err)
      setError('Unable to load timesheet data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = timesheets.length
    const pending = timesheets.filter((t) => String(t.pm_timesheetstatus) === '1').length
    const drafts = timesheets.filter((t) => String(t.pm_timesheetstatus) === '3').length
    const approved = timesheets.filter((t) => String(t.pm_timesheetstatus) === '0').length
    const totalHours = timesheets.reduce((s, t) => s + (t.pm_totalhours ?? 0), 0)
    return [
      {
        label: 'Total Timesheets',
        value: total,
        subtitle: 'All active timesheets',
        icon: <EventNoteIcon />,
        color: '#0ea5e9',
      },
      {
        label: 'Pending Approval',
        value: pending,
        subtitle: `${pending > 0 ? `${((pending / (total || 1)) * 100).toFixed(0)}% of total` : 'No submissions'}`,
        icon: <ScheduleIcon />,
        color: '#f59e0b',
      },
      {
        label: 'Drafts',
        value: drafts,
        subtitle: `${drafts > 0 ? `${drafts} timesheet${drafts !== 1 ? 's' : ''} not yet submitted` : 'All submitted'}`,
        icon: <EditNoteIcon />,
        color: '#8b5cf6',
      },
      {
        label: 'Total Hours Logged',
        value: `${totalHours.toLocaleString()}h`,
        subtitle: `Across ${approved} approved timesheets`,
        icon: <AccessTimeIcon />,
        color: '#22c55e',
      },
    ]
  }, [timesheets])

  // ── Filtered & Sorted Timesheets ─────────────────────────────────────────
  const filteredTimesheets = useMemo(() => {
    let list = [...timesheets]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.pm_ownername?.toLowerCase().includes(q) ||
          t.pm_timesheetname?.toLowerCase().includes(q) ||
          t.pm_reportingperiod?.toLowerCase().includes(q) ||
          t.pm_resourcename?.toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      list = list.filter((t) => String(t.pm_timesheetstatus) === statusFilter)
    }

    return list
  }, [timesheets, searchQuery, statusFilter])

  const paginatedTimesheets = useMemo(
    () => filteredTimesheets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredTimesheets, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setPage(0) }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRowClick = useCallback(async (timesheet: TimesheetModel) => {
    setSelectedTimesheet(timesheet)
    setEntriesLoading(true)
    setError(null)
    if (timesheet.pm_timesheetid) {
      try {
        const entryList = await fetchTimesheetEntries(timesheet.pm_timesheetid)
        setEntries(entryList)
      } catch {
        setEntries([])
      }
    }
    setEntriesLoading(false)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedTimesheet(null)
    setEntries([])
  }, [])

  // ── Create Timesheet ──────────────────────────────────────────────────────
  const openCreateForm = useCallback(() => {
    setCreateForm({
      pm_ownername: '',
      pm_periodstartdate: '',
      pm_periodenddate: '',
      pm_reportingperiod: '',
      _pm_resource_value: '',
    })
    setShowCreateModal(true)
  }, [])

  const handleCreateTimesheet = async () => {
    if (!createForm.pm_periodstartdate || !createForm.pm_periodenddate) {
      setError('Period start and end dates are required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const periodKey = createForm.pm_periodstartdate.substring(0, 7)
      const resource = resources.find((r) => r.pm_resourceid === createForm._pm_resource_value)
      const ownerName = createForm.pm_ownername || resource?.pm_fullname || 'Unnamed'
      const payload: any = {
        pm_timesheetname: `${ownerName} - ${periodKey}`,
        pm_ownername: ownerName,
        pm_periodstartdate: createForm.pm_periodstartdate,
        pm_periodenddate: createForm.pm_periodenddate,
        pm_reportingperiod: periodKey,
        _pm_resource_value: createForm._pm_resource_value || undefined,
      }
      await createTimesheet(payload)
      setSuccessMsg('Timesheet created successfully.')
      setShowCreateModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to create timesheet.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Status Update Actions ─────────────────────────────────────────────────
  const handleSubmitTimesheet = async () => {
    if (!selectedTimesheet?.pm_timesheetid) return
    setActionLoading(true)
    try {
      await updateTimesheetStatus(selectedTimesheet.pm_timesheetid, 1)
      setSuccessMsg('Timesheet submitted for approval.')
      const updated = await fetchTimesheets()
      setTimesheets(updated)
      // Refresh selected timesheet
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to submit timesheet.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveTimesheet = async () => {
    if (!selectedTimesheet?.pm_timesheetid) return
    setActionLoading(true)
    try {
      await updateTimesheetStatus(selectedTimesheet.pm_timesheetid, 0)
      setSuccessMsg('Timesheet approved.')
      const updated = await fetchTimesheets()
      setTimesheets(updated)
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to approve timesheet.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectTimesheet = async () => {
    if (!selectedTimesheet?.pm_timesheetid || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await updateTimesheetStatus(selectedTimesheet.pm_timesheetid, 2, { pm_rejectionreason: rejectReason })
      setSuccessMsg('Timesheet rejected.')
      setShowRejectDialog(false)
      setRejectReason('')
      const updated = await fetchTimesheets()
      setTimesheets(updated)
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to reject timesheet.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Entry Management ──────────────────────────────────────────────────────
  const openAddEntry = useCallback(() => {
    setEntryForm({
      pm_workdate: new Date().toISOString().split('T')[0],
      pm_hoursworked: 8,
      pm_worknotes: '',
      pm_ischargeable: true,
      _pm_project_value: '',
    })
    setShowAddEntry(true)
  }, [])

  const handleAddEntry = async () => {
    if (!selectedTimesheet?.pm_timesheetid || !entryForm.pm_workdate) return
    setError(null)
    setActionLoading(true)
    try {
      await createTimesheetEntry({
        pm_timesheetid: selectedTimesheet.pm_timesheetid,
        pm_hoursworked: entryForm.pm_hoursworked,
        pm_workdate: entryForm.pm_workdate,
        pm_worknotes: entryForm.pm_worknotes || undefined,
        pm_ischargeable: entryForm.pm_ischargeable,
        _pm_project_value: entryForm._pm_project_value || undefined,
      })
      setSuccessMsg('Entry added.')
      setShowAddEntry(false)
      // Refresh entries and timesheet totals
      const entryList = await fetchTimesheetEntries(selectedTimesheet.pm_timesheetid)
      setEntries(entryList)
      const updated = await fetchTimesheets()
      setTimesheets(updated)
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add entry.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!entryId) return
    setActionLoading(true)
    try {
      await deleteTimesheetEntry(entryId)
      setSuccessMsg('Entry removed.')
      setEntries((prev) => prev.filter((e) => e.pm_timesheetentryid !== entryId))
      if (selectedTimesheet?.pm_timesheetid) {
        const updated = await fetchTimesheets()
        setTimesheets(updated)
        const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
        if (refreshed) setSelectedTimesheet(refreshed)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete entry.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Resource options for create form ──
  const resourceOptions = useMemo(() => {
    return resources
      .filter((r) => r.pm_fullname)
      .map((r) => ({ value: r.pm_resourceid ?? '', label: r.pm_fullname! }))
  }, [resources])

  // ── Render ────────────────────────────────────────────────────────────────
  const currentStatus = String(selectedTimesheet?.pm_timesheetstatus ?? '')
  const isDraft = currentStatus === '3'
  const isSubmitted = currentStatus === '1'
  const isApproved = currentStatus === '0'
  const isRejected = currentStatus === '2'

  return (
    <Box>
      <PageHeader
        title="Timesheets"
        subtitle="Track and manage time entries — create timesheets, log hours, and manage the approval workflow."
        action={{
          label: 'New Timesheet',
          icon: <AddIcon />,
          onClick: openCreateForm,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Row ──────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── Timesheet Grid ────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by owner, name, period..."
          filterValue={statusFilter}
          onFilterChange={handleStatusFilterChange}
          filterLabel="Status"
          filterOptions={STATUS_FILTER_OPTIONS}
          onClear={() => { setSearchQuery(''); setStatusFilter(''); setPage(0) }}
        />

        <TableShell
          loading={loading}
          empty={filteredTimesheets.length === 0}
          emptyIcon={<EventNoteIcon />}
          emptyTitle={searchQuery || statusFilter ? 'No timesheets match your criteria.' : 'No timesheets found.'}
          emptyAction={!searchQuery && !statusFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Create your first timesheet
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Timesheet / Owner
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Period
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Status
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Total Hours
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Chargeable
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Submitted
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTimesheets.map((ts, idx) => (
                <TableRow
                  key={ts.pm_timesheetid}
                  hover
                  onClick={() => handleRowClick(ts)}
                  selected={selectedTimesheet?.pm_timesheetid === ts.pm_timesheetid}
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
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: fontSizes.sm, fontWeight: 700 }}>
                        {(ts.pm_ownername ?? '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {ts.pm_timesheetname || 'Unnamed'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ts.pm_ownername || ts.pm_resourcename || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                      {ts.pm_periodstartdate ? new Date(ts.pm_periodstartdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      {' – '}
                      {ts.pm_periodenddate ? new Date(ts.pm_periodenddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </Typography>
                    {ts.pm_reportingperiod && (
                      <Typography variant="caption" color="text.disabled" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }}>
                        {ts.pm_reportingperiod}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={STATUS_ICONS[String(ts.pm_timesheetstatus)] || undefined}
                      label={STATUS_LABELS[String(ts.pm_timesheetstatus)] ?? 'Unknown'}
                      color={STATUS_COLORS[String(ts.pm_timesheetstatus)] ?? 'default'}
                      size="small"
                      variant={String(ts.pm_timesheetstatus) === '2' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600, borderRadius: 8, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                      {ts.pm_totalhours ?? 0}h
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
                      {ts.pm_totalchargeablehours != null ? `${ts.pm_totalchargeablehours}h` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {ts.pm_submissiondate
                        ? new Date(ts.pm_submissiondate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredTimesheets.length > 0 && (
          <TableFooter
            filteredCount={filteredTimesheets.length}
            totalCount={timesheets.length}
            itemLabel="timesheet"
            totals={[
              { label: 'Total hours', value: `${filteredTimesheets.reduce((s, t) => s + (t.pm_totalhours ?? 0), 0).toLocaleString()}h` },
              { label: 'Chargeable', value: `${filteredTimesheets.reduce((s, t) => s + (t.pm_totalchargeablehours ?? 0), 0).toLocaleString()}h` },
            ]}
          />
        )}
        {!loading && filteredTimesheets.length > 0 && (
          <TablePagination
            component="div"
            count={filteredTimesheets.length}
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
        open={!!selectedTimesheet}
        onClose={handleCloseDetail}
        icon={<EventNoteIcon sx={{ color: '#8b5cf6', fontSize: 22 }} />}
        title={selectedTimesheet?.pm_timesheetname ?? ''}
        subtitle={selectedTimesheet && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              icon={STATUS_ICONS[currentStatus]}
              label={STATUS_LABELS[currentStatus] ?? 'Unknown'}
              color={STATUS_COLORS[currentStatus] ?? 'default'}
              size="small"
              variant={isRejected ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            <Typography variant="body2" color="text.secondary">
              <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
              {selectedTimesheet.pm_ownername || '—'}
            </Typography>
            {selectedTimesheet.pm_reportingperiod && (
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {selectedTimesheet.pm_reportingperiod}
              </Typography>
            )}
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isDraft && (
              <Button
                variant="contained"
                size="small"
                startIcon={<SendIcon />}
                onClick={handleSubmitTimesheet}
                disabled={actionLoading}
                sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, whiteSpace: 'nowrap' }}
              >
                {actionLoading ? 'Submitting...' : 'Submit'}
              </Button>
            )}
            {isSubmitted && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={handleApproveTimesheet}
                  disabled={actionLoading}
                  sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
                >
                  {actionLoading ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => setShowRejectDialog(true)}
                  disabled={actionLoading}
                  sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
                >
                  Reject
                </Button>
              </>
            )}
            {(isApproved || isRejected) && (
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5, bgcolor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 1 }}>
                {isApproved && `Approved ${selectedTimesheet?.pm_approvaldate ? new Date(selectedTimesheet.pm_approvaldate).toLocaleDateString() : ''}`}
                {isRejected && `Rejected${selectedTimesheet?.pm_rejectionreason ? `: ${selectedTimesheet.pm_rejectionreason}` : ''}`}
              </Typography>
            )}
          </Box>
        }
        tabs={[
          { label: 'Entries', count: entries.length },
          { label: 'Details' },
        ]}
        tabValue={detailTab}
        onTabChange={(value) => setDetailTab(value)}
      >
        {selectedTimesheet && (
          <>
          {/* Entries Tab */}
          <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
                  Time Entries
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 400 }}>
                    ({entries.reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0).toFixed(1)}h total)
                  </Typography>
                </Typography>
                {isDraft && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={openAddEntry}
                    disabled={actionLoading}
                    sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2 }}
                  >
                    Add Entry
                  </Button>
                )}
              </Box>

              {entriesLoading ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Loading entries...</Typography>
              ) : entries.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {entries.map((entry) => (
                    <Paper key={entry.pm_timesheetentryid} variant="outlined" sx={{ p: 1.5, borderRadius: 2, position: 'relative' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {entry.pm_workdate ? new Date(entry.pm_workdate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                            </Typography>
                            <Chip
                              label={entry.pm_ischargeable ? 'Chargeable' : 'Non-Chargeable'}
                              size="small"
                              color={entry.pm_ischargeable ? 'success' : 'default'}
                              variant="outlined"
                              sx={{ fontWeight: 600, borderRadius: 6, height: 20, fontSize: fontSizes.xs }}
                            />
                            {entry.pm_isovertime && (
                              <Chip label="OT" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700, borderRadius: 6, height: 20, fontSize: fontSizes.xs }} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                            {entry.pm_projectname || 'No project'}
                            {entry.pm_projecttaskname ? ` / ${entry.pm_projecttaskname}` : ''}
                          </Typography>
                          {entry.pm_worknotes && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {entry.pm_worknotes}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', lineHeight: 1 }}>
                              {entry.pm_hoursworked ?? 0}h
                            </Typography>
                          </Box>
                          {isDraft && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteEntry(entry.pm_timesheetentryid!)}
                              disabled={actionLoading}
                              sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <AccessTimeIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No entries logged yet.
                  </Typography>
                  {isDraft && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={openAddEntry}
                      sx={{ borderRadius: 2 }}
                    >
                      Log your first entry
                    </Button>
                  )}
                </Box>
              )}

              {/* Summary */}
              {entries.length > 0 && (
                <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                    Period Summary
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#22c55e' }}>
                        {entries.reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0).toFixed(1)}h
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Total</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#0ea5e9' }}>
                        {entries.filter((e) => e.pm_ischargeable).reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0).toFixed(1)}h
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Chargeable</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: '#f59e0b' }}>
                        {entries.filter((e) => !e.pm_ischargeable).reduce((s, e) => s + (e.pm_hoursworked ?? 0), 0).toFixed(1)}h
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Non-Chargeable</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </TabPanel>

            {/* Details Tab */}
            <TabPanel value={detailTab} index={1} pt={0}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EventNoteIcon sx={{ fontSize: 16 }} /> Timesheet Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Owner</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_ownername || selectedTimesheet.pm_resourcename || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reporting Period</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_reportingperiod || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Period Start</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_periodstartdate ? new Date(selectedTimesheet.pm_periodstartdate).toLocaleDateString() : '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Period End</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_periodenddate ? new Date(selectedTimesheet.pm_periodenddate).toLocaleDateString() : '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submitted By</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_submittedby || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submitted Date</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_submissiondate ? new Date(selectedTimesheet.pm_submissiondate).toLocaleDateString() : '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Approved By</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_approvedby || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Approved Date</Typography>
                    <Typography variant="body2">{selectedTimesheet.pm_approvaldate ? new Date(selectedTimesheet.pm_approvaldate).toLocaleDateString() : '—'}</Typography>
                  </Box>
                </Box>
                {selectedTimesheet.pm_rejectionreason && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca' }}>
                    <Typography variant="caption" color="error" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>Rejection Reason</Typography>
                    <Typography variant="body2" color="error">{selectedTimesheet.pm_rejectionreason}</Typography>
                  </Box>
                )}
              </Paper>
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      {/* ── Create Timesheet Modal ───────────────────── */}
      <Dialog
        open={showCreateModal}
        onClose={() => !actionLoading && setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', borderRadius: 1.5 }}>
            <EventNoteIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          New Timesheet
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new timesheet for a resource and time period. Entries can be added after creation.
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource</InputLabel>
                <Select
                  value={createForm._pm_resource_value}
                  label="Resource"
                  onChange={(e) => setCreateForm((f) => ({ ...f, _pm_resource_value: e.target.value }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">None (enter name manually)</MenuItem>
                  {resourceOptions.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Owner / Name"
                fullWidth
                size="small"
                value={createForm.pm_ownername}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_ownername: e.target.value }))}
                placeholder="Leave blank to use resource name"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period Start"
                type="date"
                required
                fullWidth
                size="small"
                value={createForm.pm_periodstartdate}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_periodstartdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period End"
                type="date"
                required
                fullWidth
                size="small"
                value={createForm.pm_periodenddate}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_periodenddate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowCreateModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateTimesheet}
            variant="contained"
            disabled={!createForm.pm_periodstartdate || !createForm.pm_periodenddate || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Creating...' : 'Create Timesheet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Entry Modal ─────────────────────────── */}
      <Dialog
        open={showAddEntry}
        onClose={() => !actionLoading && setShowAddEntry(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', borderRadius: 1.5 }}>
            <AccessTimeIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          Log Time Entry
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add a time entry to {selectedTimesheet?.pm_timesheetname}.
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Work Date"
                type="date"
                required
                fullWidth
                size="small"
                value={entryForm.pm_workdate}
                onChange={(e) => setEntryForm((f) => ({ ...f, pm_workdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Hours"
                type="number"
                required
                fullWidth
                size="small"
                value={entryForm.pm_hoursworked}
                onChange={(e) => setEntryForm((f) => ({ ...f, pm_hoursworked: Number(e.target.value) }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes / Project Reference"
                fullWidth
                size="small"
                value={entryForm.pm_worknotes}
                onChange={(e) => setEntryForm((f) => ({ ...f, pm_worknotes: e.target.value }))}
                placeholder="e.g., Work on ERP Implementation"
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={entryForm.pm_ischargeable}
                    onChange={(e) => setEntryForm((f) => ({ ...f, pm_ischargeable: e.target.checked }))}
                    color="primary"
                  />
                }
                label="Chargeable"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowAddEntry(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddEntry}
            variant="contained"
            disabled={!entryForm.pm_workdate || !entryForm.pm_hoursworked || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Adding...' : 'Add Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reject Dialog ────────────────────────────── */}
      <Dialog
        open={showRejectDialog}
        onClose={() => !actionLoading && setShowRejectDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5, color: '#ef4444' }}>
          <RejectIcon sx={{ fontSize: 20 }} />
          Reject Timesheet
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejecting this timesheet. The owner will be able to revise and resubmit.
          </Typography>
          <TextField
            label="Rejection Reason"
            required
            fullWidth
            multiline
            rows={3}
            size="small"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => { setShowRejectDialog(false); setRejectReason('') }} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectTimesheet}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || actionLoading}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
