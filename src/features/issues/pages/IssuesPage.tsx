import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, IconButton, Tooltip, Typography, TextField, Select, MenuItem,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Avatar, Switch, FormControlLabel, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel,
  TablePagination,
  Paper, useTheme, Alert,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import LowPriorityIcon from '@mui/icons-material/LowPriority'
import FlagIcon from '@mui/icons-material/Flag'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CategoryIcon from '@mui/icons-material/Category'
import PersonIcon from '@mui/icons-material/Person'
import {
  fetchAllIssues,
  createIssueFull,
  updateIssueFull,
  deleteIssue,
} from '@/services'
import type { IssueModel } from '@/types/dataverse'

import type { ExportColumn } from '@/utils/exportUtils'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, ExportButton, StatusTag } from '@/components/common'
import type { KpiCardItem } from '@/components/common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'In Progress',
  '1': 'Resolved',
}

const PRIORITY_LABELS: Record<string, string> = {
  '0': 'High',
  '1': 'Critical',
  '2': 'Medium',
}

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  '0': 'warning',      // High
  '1': 'error',        // Critical
  '2': 'info',         // Medium
}

const PRIORITY_ICONS: Record<string, React.ReactElement> = {
  '0': <PriorityHighIcon fontSize="inherit" />,
  '1': <NewReleasesIcon fontSize="inherit" />,
  '2': <LowPriorityIcon fontSize="inherit" />,
}

const RAG_COLORS: Record<string, 'error' | 'success' | 'warning' | 'default'> = {
  '2': 'error',
  '1': 'success',
  '0': 'warning',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'Red',
  '1': 'Green',
  '0': 'Amber',
}

const IMPACT_LABELS: Record<string, string> = {
  '0': 'Moderate',
  '1': 'Major',
  '2': 'Minor',
}

const STATUS_COLORS: Record<string, 'success' | 'info' | 'default'> = {
  '1': 'success',  // Resolved
  '0': 'info',     // Open / In Progress
}

const priorityLabel = (val?: string | number): string =>
  PRIORITY_LABELS[String(val ?? '')] ?? '—'

const defaultForm: Partial<IssueModel> = {
  pm_issuecategory: '0',
  pm_prioritylevel: '2',
  pm_ragstatus: '1',
  pm_issuestatus: '0',
  pm_impactlevel: '2',
  pm_escalationstatus: false,
}

// ─── Export Columns ───────────────────────────────────────────────────────────

const issueExportColumns: ExportColumn<IssueModel>[] = [
  { key: 'pm_issuereference', label: 'Reference' },
  { key: 'pm_issuetitle', label: 'Issue Title' },
  { key: 'pm_issuecategory', label: 'Category', format: (v) => CATEGORY_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_prioritylevel', label: 'Priority', format: (v) => PRIORITY_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_ragstatus', label: 'RAG', format: (v) => RAG_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_issuestatus', label: 'Status', format: (v) => STATUS_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_issueowner', label: 'Owner' },
  { key: 'pm_impactlevel', label: 'Impact Level', format: (v) => IMPACT_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_dateraised', label: 'Date Raised' },
  { key: 'pm_targetresolutiondate', label: 'Target Resolution' },
  { key: 'pm_actualresolutiondate', label: 'Actual Resolution' },
  { key: 'pm_issuedescription', label: 'Description' },
  { key: 'pm_resolutiondetails', label: 'Resolution Details' },
  { key: 'pm_linkedrisk', label: 'Linked Risk' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Search & filter
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [ragFilter, setRagFilter] = useState<string>('')
  const [escalatedOnly, setEscalatedOnly] = useState(false)

  // Selection & sorting
  const [selectedIssue, setSelectedIssue] = useState<IssueModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)
  const [sortField, setSortField] = useState<string>('pm_dateraised')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<IssueModel | null>(null)
  const [form, setForm] = useState<Partial<IssueModel>>({ ...defaultForm })
  const [deleteTarget, setDeleteTarget] = useState<IssueModel | null>(null)

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [IssuesPage] Fetching data...')
      const data = await fetchAllIssues()
      console.log('🔍 [IssuesPage] Issues loaded:', data?.length ?? 0, 'items')
      if (data?.length > 0) console.log('🔍 [IssuesPage] Sample issue:', JSON.stringify(data[0], null, 2).slice(0, 500))
      setIssues(data)
    } catch (err: any) {
      console.error('[IssuesPage] load error:', err)
      setError(err?.message || 'Failed to load issues.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  // ── KPI calculations ────────────────────────────────────────────────────────

  const totalIssues = issues.length
  const openIssues = issues.filter((i) => String(i.pm_issuestatus ?? '') === '0').length
  const escalatedIssues = issues.filter((i) => i.pm_escalationstatus).length
  // const criticalHighIssues = issues.filter((i) => {
  //   const p = String(i.pm_prioritylevel ?? '')
  //   return p === '1' || p === '0'
  // }).length
  const overdueIssues = issues.filter((i) => {
    if (String(i.pm_issuestatus ?? '') === '1') return false
    if (!i.pm_targetresolutiondate) return false
    return new Date(i.pm_targetresolutiondate) < new Date()
  }).length

  const kpiCards: KpiCardItem[] = [
    {
      label: 'Total Issues',
      value: totalIssues,
      icon: <ReportProblemIcon />,
      color: '#0ea5e9',
      subtitle: totalIssues > 0 ? `${openIssues} open` : undefined,
    },
    {
      label: 'Open / In Progress',
      value: openIssues,
      icon: <WarningAmberIcon />,
      color: '#f59e0b',
      subtitle: totalIssues > 0 ? `${Math.round((openIssues / totalIssues) * 100)}% of total` : undefined,
    },
    {
      label: 'Escalated',
      value: escalatedIssues,
      icon: <ArrowCircleUpIcon />,
      color: '#ef4444',
      subtitle: escalatedIssues > 0 ? 'Requires attention' : 'None escalated',
    },
    {
      label: 'Overdue',
      value: overdueIssues,
      icon: <CalendarTodayIcon />,
      color: '#dc2626',
      subtitle: overdueIssues > 0 ? 'Past resolution date' : 'On track',
    },
  ]

  // ── Filtering & sorting ─────────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    let list = [...issues]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((i) =>
        (i.pm_issuetitle ?? '').toLowerCase().includes(q) ||
        (i.pm_issueowner ?? '').toLowerCase().includes(q) ||
        (i.pm_issuedescription ?? '').toLowerCase().includes(q) ||
        (i.pm_issuereference ?? '').toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter) {
      list = list.filter((i) => String(i.pm_issuestatus ?? '') === statusFilter)
    }

    // Priority filter
    if (priorityFilter) {
      list = list.filter((i) => String(i.pm_prioritylevel ?? '') === priorityFilter)
    }

    // Category filter
    if (categoryFilter) {
      list = list.filter((i) => String(i.pm_issuecategory ?? '') === categoryFilter)
    }

    // RAG filter
    if (ragFilter) {
      list = list.filter((i) => String(i.pm_ragstatus ?? '') === ragFilter)
    }

    // Escalated only
    if (escalatedOnly) {
      list = list.filter((i) => i.pm_escalationstatus)
    }

    // Sort
    list.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? ''
      const bVal = (b as any)[sortField] ?? ''
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : Number(aVal) - Number(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [issues, search, statusFilter, priorityFilter, categoryFilter, ragFilter, escalatedOnly, sortField, sortDir])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleRowClick = (issue: IssueModel) => {
    setSelectedIssue(issue)
    setDrawerTab(0)
    setDrawerOpen(true)
  }

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginatedIssues = useMemo(
    () => filteredIssues.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredIssues, page, rowsPerPage]
  )

  const handleChangePage = (_e: unknown, newPage: number) => setPage(newPage)
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const handleSearchChange = (v: string) => { setSearch(v); setPage(0) }

  const handleOpenCreate = () => {
    setEditingIssue(null)
    setForm({ ...defaultForm })
    setDialogOpen(true)
  }

  const handleOpenEdit = (issue: IssueModel, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingIssue(issue)
    setForm({
      pm_issuetitle: issue.pm_issuetitle,
      pm_issuedescription: issue.pm_issuedescription,
      pm_issuecategory: issue.pm_issuecategory,
      pm_ragstatus: issue.pm_ragstatus,
      pm_issueowner: issue.pm_issueowner,
      pm_issuestatus: issue.pm_issuestatus,
      pm_escalationstatus: issue.pm_escalationstatus,
      pm_prioritylevel: issue.pm_prioritylevel,
      pm_impactlevel: issue.pm_impactlevel,
      pm_issuereference: issue.pm_issuereference,
      pm_dateraised: issue.pm_dateraised,
      pm_targetresolutiondate: issue.pm_targetresolutiondate,
      pm_actualresolutiondate: issue.pm_actualresolutiondate,
      pm_resolutiondetails: issue.pm_resolutiondetails,
      pm_linkedrisk: issue.pm_linkedrisk,
      _pm_project_value: issue._pm_project_value,
      _pm_programmefk_value: issue._pm_programmefk_value,
    })
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_issueid) return
    setActionLoading(true)
    try {
      await deleteIssue(deleteTarget.pm_issueid)
      setSuccessMsg('Issue deleted.')
      setTimeout(() => setSuccessMsg(null), 3000)
      setDeleteTarget(null)
      if (selectedIssue?.pm_issueid === deleteTarget.pm_issueid) {
        setSelectedIssue(null)
        setDrawerOpen(false)
      }
      await loadIssues()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete issue.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSave = async () => {
    setActionLoading(true)
    try {
      if (editingIssue?.pm_issueid) {
        await updateIssueFull(editingIssue.pm_issueid, form)
        setSuccessMsg('Issue updated.')
      } else {
        await createIssueFull(form)
        setSuccessMsg('Issue created.')
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      setDialogOpen(false)
      await loadIssues()
    } catch (err: any) {
      setError(err?.message || 'Failed to save issue.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Detail drawer tabs ─────────────────────────────────────────────────────
  const detailTabDefs = [
    { label: 'Overview' },
    { label: 'Resolution' },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box>
      <PageHeader
        title="Issues Register"
        subtitle="Track, prioritize, and manage project issues"
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredIssues} columns={issueExportColumns} filename="issues" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Add Issue
            </Button>
          </Box>
        }
      />

      {/* Success / Error */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <KpiCardRow items={kpiCards} />

      {/* Search & Filter */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by title, owner, description, reference..."
          onClear={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setCategoryFilter(''); setRagFilter(''); setEscalatedOnly(false); setPage(0) }}
          extraFilters={
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => { setStatusFilter(e.target.value) }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="0">In Progress</MenuItem>
                  <MenuItem value="1">Resolved</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Priority"
                  onChange={(e) => { setPriorityFilter(e.target.value) }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="1">Critical</MenuItem>
                  <MenuItem value="0">High</MenuItem>
                  <MenuItem value="2">Medium</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => { setCategoryFilter(e.target.value) }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="0">Dependency</MenuItem>
                  <MenuItem value="1">Technical</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>RAG</InputLabel>
                <Select
                  value={ragFilter}
                  label="RAG"
                  onChange={(e) => { setRagFilter(e.target.value) }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="2">Red</MenuItem>
                  <MenuItem value="0">Amber</MenuItem>
                  <MenuItem value="1">Green</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={escalatedOnly}
                    onChange={(_, v) => { setEscalatedOnly(v) }}
                    size="small"
                    color="error"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    Escalated only
                  </Typography>
                }
                sx={{ ml: 0.5 }}
              />
            </Box>
          }
        />

        {/* Table */}
        <TableShell
          loading={loading}
          empty={filteredIssues.length === 0}
          emptyIcon={<ReportProblemIcon />}
          emptyTitle={search || statusFilter || priorityFilter || categoryFilter || ragFilter || escalatedOnly
            ? 'No issues match your filters.'
            : 'No issues found.'}
          emptyAction={
            !search && !statusFilter && !priorityFilter && !categoryFilter && !ragFilter && !escalatedOnly && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Create your first issue
              </Button>
            )
          }
        >
          <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_issuereference'} direction={sortField === 'pm_issuereference' ? sortDir : 'asc'} onClick={() => handleSort('pm_issuereference')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Ref
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_issuetitle'} direction={sortField === 'pm_issuetitle' ? sortDir : 'asc'} onClick={() => handleSort('pm_issuetitle')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Issue Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_issuecategory'} direction={sortField === 'pm_issuecategory' ? sortDir : 'asc'} onClick={() => handleSort('pm_issuecategory')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_prioritylevel'} direction={sortField === 'pm_prioritylevel' ? sortDir : 'asc'} onClick={() => handleSort('pm_prioritylevel')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Priority
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_ragstatus'} direction={sortField === 'pm_ragstatus' ? sortDir : 'asc'} onClick={() => handleSort('pm_ragstatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    RAG
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_issuestatus'} direction={sortField === 'pm_issuestatus' ? sortDir : 'asc'} onClick={() => handleSort('pm_issuestatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_dateraised'} direction={sortField === 'pm_dateraised' ? sortDir : 'asc'} onClick={() => handleSort('pm_dateraised')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Raised
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sortField === 'pm_targetresolutiondate'} direction={sortField === 'pm_targetresolutiondate' ? sortDir : 'asc'} onClick={() => handleSort('pm_targetresolutiondate')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Target
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedIssues.map((issue, idx) => {
                const p = String(issue.pm_prioritylevel ?? '')
                const rag = String(issue.pm_ragstatus ?? '')
                const isOverdue = String(issue.pm_issuestatus ?? '') !== '1' && !!issue.pm_targetresolutiondate && new Date(issue.pm_targetresolutiondate) < new Date()
                return (
                  <TableRow
                    key={issue.pm_issueid}
                    hover
                    onClick={() => handleRowClick(issue)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {issue.pm_issuereference || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 28, height: 28,
                            bgcolor: rag === '2' ? '#ef5350' : rag === '0' ? '#ffa726' : rag === '1' ? '#66bb6a' : '#bdbdbd',
                            fontSize: '0.75rem',
                          }}
                        >
                          <FlagIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                            {issue.pm_issuetitle || 'Untitled'}
                          </Typography>
                          {issue.pm_issueowner && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {issue.pm_issueowner}
                            </Typography>
                          )}
                        </Box>
                        {issue.pm_escalationstatus && (
                          <Tooltip title="Escalated">
                            <ArrowCircleUpIcon color="error" sx={{ fontSize: 18 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={CATEGORY_LABELS[issue.pm_issuecategory ?? ''] ?? '—'}
                        color={String(issue.pm_issuecategory ?? '') === '1' ? 'info' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        icon={PRIORITY_ICONS[p] ?? undefined}
                        label={PRIORITY_LABELS[p] ?? '—'}
                        color={PRIORITY_COLORS[p] ?? 'default'}
                        variant={p === '1' ? 'filled' : 'filled'}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={RAG_LABELS[rag] ?? '—'}
                        color={RAG_COLORS[rag] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={STATUS_LABELS[String(issue.pm_issuestatus ?? '')] ?? '—'}
                        color={STATUS_COLORS[String(issue.pm_issuestatus ?? '')] ?? 'default'}
                        variant={String(issue.pm_issuestatus ?? '') === '1' ? 'filled' : 'filled'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {issue.pm_dateraised ? new Date(issue.pm_dateraised).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: isOverdue ? 'error.main' : 'text.secondary', fontSize: '0.8rem', fontWeight: isOverdue ? 600 : 400 }}
                      >
                        {issue.pm_targetresolutiondate ? new Date(issue.pm_targetresolutiondate).toLocaleDateString() : '—'}
                        {isOverdue && ' ⚠'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(issue, e) }}>
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(issue) }}>
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableShell>

        {/* Footer */}
        <TableFooter
          filteredCount={filteredIssues.length}
          totalCount={issues.length}
          itemLabel="issue"
        />
        {!loading && filteredIssues.length > 0 && (
          <TablePagination
            component="div"
            count={filteredIssues.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedIssue(null) }}
        title={selectedIssue?.pm_issuetitle ?? ''}
        subtitle={selectedIssue && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusTag
              label={priorityLabel(selectedIssue.pm_prioritylevel)}
              color={PRIORITY_COLORS[String(selectedIssue.pm_prioritylevel ?? '')] ?? 'default'}
              variant={String(selectedIssue.pm_prioritylevel ?? '') === '1' ? 'filled' : 'filled'}
            />
            <StatusTag
              label={STATUS_LABELS[String(selectedIssue.pm_issuestatus ?? '')] ?? '—'}
              color={STATUS_COLORS[String(selectedIssue.pm_issuestatus ?? '')] ?? 'default'}
              variant={String(selectedIssue.pm_issuestatus ?? '') === '1' ? 'filled' : 'filled'}
            />
            <StatusTag
              label={CATEGORY_LABELS[String(selectedIssue.pm_issuecategory ?? '')] ?? '—'}
            />
            {selectedIssue.pm_escalationstatus && (
              <StatusTag
                icon={<ArrowCircleUpIcon sx={{ fontSize: 14 }} />}
                label="Escalated"
                color="error"
              />
            )}
          </Box>
        )}
        tabs={detailTabDefs}
        tabValue={drawerTab}
        onTabChange={setDrawerTab}
        headerActions={
          selectedIssue && (
            <>
              <IconButton
                size="small"
                onClick={() => { handleOpenEdit(selectedIssue, new MouseEvent('click') as any); setDrawerOpen(false) }}
                sx={{ borderRadius: 1.5 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => { setDeleteTarget(selectedIssue); setDrawerOpen(false) }}
                sx={{ borderRadius: 1.5, color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )
        }
      >
        {drawerTab === 0 && selectedIssue && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Priority, Escalation & RAG Cards */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  flex: 1, p: 2, borderRadius: 2,
                  bgcolor: PRIORITY_COLORS[String(selectedIssue.pm_prioritylevel ?? '')] === 'error' ? '#fce4ec' :
                           PRIORITY_COLORS[String(selectedIssue.pm_prioritylevel ?? '')] === 'warning' ? '#fff3e0' : '#e3f2fd',
                }}
              >
                <Typography variant="caption" color="text.secondary">Priority</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  {PRIORITY_ICONS[String(selectedIssue.pm_prioritylevel ?? '')]}
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {priorityLabel(selectedIssue.pm_prioritylevel)}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  flex: 1, p: 2, borderRadius: 2,
                  bgcolor: selectedIssue.pm_escalationstatus ? '#fce4ec' : '#f5f5f5',
                }}
              >
                <Typography variant="caption" color="text.secondary">Escalated</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <ArrowCircleUpIcon
                    color={selectedIssue.pm_escalationstatus ? 'error' : 'disabled'}
                    sx={{ fontSize: 20 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedIssue.pm_escalationstatus ? 'Yes — Escalated' : 'No'}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  flex: 1, p: 2, borderRadius: 2,
                  bgcolor: RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] === 'error' ? '#fce4ec' :
                           RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] === 'warning' ? '#fff3e0' : '#e8f5e9',
                }}
              >
                <Typography variant="caption" color="text.secondary">RAG</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <FlagIcon
                    sx={{
                      fontSize: 18,
                      color: RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] === 'error' ? '#ef5350' :
                             RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] === 'warning' ? '#ffa726' : '#66bb6a',
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {RAG_LABELS[String(selectedIssue.pm_ragstatus ?? '')] ?? '—'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Details Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                { icon: <CategoryIcon fontSize="inherit" />, label: 'Category', value: CATEGORY_LABELS[String(selectedIssue.pm_issuecategory ?? '')] ?? '—' },
                { icon: <AssignmentIcon fontSize="inherit" />, label: 'Status', value: STATUS_LABELS[String(selectedIssue.pm_issuestatus ?? '')] ?? '—' },
                { icon: <LowPriorityIcon fontSize="inherit" />, label: 'Impact', value: IMPACT_LABELS[String(selectedIssue.pm_impactlevel ?? '')] ?? '—' },
                { icon: <PersonIcon fontSize="inherit" />, label: 'Owner', value: selectedIssue.pm_issueowner || '—' },
                { icon: <CalendarTodayIcon fontSize="inherit" />, label: 'Raised', value: selectedIssue.pm_dateraised ? new Date(selectedIssue.pm_dateraised).toLocaleDateString() : '—' },
                { icon: <CalendarTodayIcon fontSize="inherit" />, label: 'Target Resolution', value: selectedIssue.pm_targetresolutiondate ? new Date(selectedIssue.pm_targetresolutiondate).toLocaleDateString() : '—' },
                { icon: <CalendarTodayIcon fontSize="inherit" />, label: 'Actual Resolution', value: selectedIssue.pm_actualresolutiondate ? new Date(selectedIssue.pm_actualresolutiondate).toLocaleDateString() : '—' },
                { icon: <FlagIcon fontSize="inherit" />, label: 'Reference', value: selectedIssue.pm_issuereference || '—' },
              ].map((info, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
                  <Box sx={{ color: 'text.secondary', display: 'flex' }}>{info.icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{info.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{info.value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Description */}
            {selectedIssue.pm_issuedescription && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {selectedIssue.pm_issuedescription}
                </Typography>
              </Box>
            )}

            {/* Linked Risk */}
            {selectedIssue.pm_linkedrisk && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 1, bgcolor: '#f3e5f5' }}>
                <ReportProblemIcon color="warning" fontSize="small" />
                <Typography variant="body2">
                  <strong>Linked Risk:</strong> {selectedIssue.pm_linkedrisk}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {drawerTab === 1 && selectedIssue && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Resolution Details */}
            {selectedIssue.pm_resolutiondetails ? (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
                  Resolution Details
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedIssue.pm_resolutiondetails}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 3, borderRadius: 2, bgcolor: '#f5f5f5', textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No resolution details recorded yet.
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Resolution details will appear here once the issue is resolved.
                </Typography>
              </Box>
            )}

            {/* Status Timeline */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusTag
                    label={STATUS_LABELS[String(selectedIssue.pm_issuestatus ?? '')] ?? '—'}
                    color={STATUS_COLORS[String(selectedIssue.pm_issuestatus ?? '')] ?? 'default'}
                  />
                </Box>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">Escalation</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <ArrowCircleUpIcon
                    sx={{ fontSize: 18, color: selectedIssue.pm_escalationstatus ? 'error.main' : 'text.disabled' }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedIssue.pm_escalationstatus ? 'Escalated' : 'Not escalated'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DetailDrawer>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIssue ? 'Edit Issue' : 'Create New Issue'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Section: Basic Information */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
              Basic Information
            </Typography>
            <TextField
              label="Issue Title"
              value={form.pm_issuetitle ?? ''}
              onChange={(e) => setForm({ ...form, pm_issuetitle: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={form.pm_issuecategory ?? '0'}
                  label="Category"
                  onChange={(e) => setForm({ ...form, pm_issuecategory: e.target.value })}
                >
                  <MenuItem value="0">Dependency</MenuItem>
                  <MenuItem value="1">Technical</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={form.pm_prioritylevel ?? '2'}
                  label="Priority"
                  onChange={(e) => setForm({ ...form, pm_prioritylevel: e.target.value })}
                >
                  <MenuItem value="1">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NewReleasesIcon color="error" fontSize="small" /> Critical
                    </Box>
                  </MenuItem>
                  <MenuItem value="0">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PriorityHighIcon color="warning" fontSize="small" /> High
                    </Box>
                  </MenuItem>
                  <MenuItem value="2">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LowPriorityIcon color="info" fontSize="small" /> Medium
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Impact</InputLabel>
                <Select
                  value={form.pm_impactlevel ?? '2'}
                  label="Impact"
                  onChange={(e) => setForm({ ...form, pm_impactlevel: e.target.value })}
                >
                  <MenuItem value="1">Major</MenuItem>
                  <MenuItem value="0">Moderate</MenuItem>
                  <MenuItem value="2">Minor</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>RAG Status</InputLabel>
              <Select
                value={form.pm_ragstatus ?? '1'}
                label="RAG Status"
                onChange={(e) => setForm({ ...form, pm_ragstatus: e.target.value })}
              >
                <MenuItem value="2">Red</MenuItem>
                <MenuItem value="0">Amber</MenuItem>
                <MenuItem value="1">Green</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.pm_escalationstatus}
                  onChange={(e) => setForm({ ...form, pm_escalationstatus: e.target.checked })}
                  color="error"
                />
              }
              label="Escalated"
            />

            {/* Section: Assignment & Dates */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
              Assignment & Dates
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Issue Owner"
                value={form.pm_issueowner ?? ''}
                onChange={(e) => setForm({ ...form, pm_issueowner: e.target.value })}
                fullWidth
              />
              <TextField
                label="Issue Reference"
                value={form.pm_issuereference ?? ''}
                onChange={(e) => setForm({ ...form, pm_issuereference: e.target.value })}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Raised Date"
                type="date"
                value={form.pm_dateraised ?? ''}
                onChange={(e) => setForm({ ...form, pm_dateraised: e.target.value })}
                
                fullWidth
              />
              <TextField
                label="Target Resolution Date"
                type="date"
                value={form.pm_targetresolutiondate ?? ''}
                onChange={(e) => setForm({ ...form, pm_targetresolutiondate: e.target.value })}
                
                fullWidth
              />
              <TextField
                label="Actual Resolution Date"
                type="date"
                value={form.pm_actualresolutiondate ?? ''}
                onChange={(e) => setForm({ ...form, pm_actualresolutiondate: e.target.value })}
               
                fullWidth
              />
            </Box>

            {/* Section: Details */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
              Details
            </Typography>
            <TextField
              label="Description"
              value={form.pm_issuedescription ?? ''}
              onChange={(e) => setForm({ ...form, pm_issuedescription: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Resolution Details"
              value={form.pm_resolutiondetails ?? ''}
              onChange={(e) => setForm({ ...form, pm_resolutiondetails: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Linked Risk"
              value={form.pm_linkedrisk ?? ''}
              onChange={(e) => setForm({ ...form, pm_linkedrisk: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.pm_issuetitle || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : undefined}
          >
            {editingIssue ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Issue</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget?.pm_issuetitle}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : undefined}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
