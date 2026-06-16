import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  MenuItem,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BugReportIcon from '@mui/icons-material/BugReport'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import LowPriorityIcon from '@mui/icons-material/LowPriority'
import AddIcon from '@mui/icons-material/Add'

import {
  PageHeader,
  KpiCardRow,
  DetailDrawer,
  StatusTag,
  ActionIcon,
  ExportButton,
  Button,
  TableShell,
  TableFooter,
  SearchFilterBar,
  ConfirmDialog,
  TabPanel,
} from '@/components/common'
import type { FilterOption } from '@/components/common'
import type { KpiCardItem } from '@/components/common'

import {
  fetchAllIssues,
  fetchIssuesForSystemUser,
  createIssueFull,
  updateIssueFull,
  deleteIssue,
  normalizeLookupId,
  fetchProjectsForSystemUser,
  fetchAllRisks,
  fetchResources,
} from '@/services'
import { Pm_programmesService } from '@/generated'
import type { IssueModel } from '@/types/dataverse'
import { unwrapList } from '@/services/common'
import { formatDate } from '@/utils/formatters'
import { useUser } from '@/context/UserContext'
import { IssueDialog } from '../components'
import type { ProjectOption, ProgrammeOption, RiskOption, ResourceOption } from '../components/IssueDialogs'

// Constants
const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
  '2': 'Resource',
  '3': 'Financial',
  '4': 'Scope',
  '5': 'Quality',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'Red',
  '0': 'Amber',
  '1': 'Green',
}

const PRIORITY_LABELS: Record<string, string> = {
  '1': 'Critical',
  '0': 'High',
  '2': 'Medium',
  '3': 'Low',
}

const ISSUE_CATEGORY_COLORS: Record<string, string> = {
  '0': 'info.main',
  '1': 'secondary.main',
  '2': 'success.main',
  '3': 'warning.main',
  '4': 'error.main',
  '5': '#8b5cf6',
}

const RAG_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  '2': 'error',
  '0': 'warning',
  '1': 'success',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Open',
  '1': 'In Progress',
  '2': 'Resolved',
  '3': 'Closed',
}

const PRIORITY_ORDER: Record<string, number> = {
  '1': 0, // Critical
  '0': 1, // High
  '2': 2, // Medium
  '3': 3, // Low
}

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export default function IssuesPage() {
  const { currentUser, currentUserPersona } = useUser()

  // ── State ─────────────────────────────────────────────────────────────────
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Project / programme / risk state for the dialog
  const [myProjects, setMyProjects] = useState<ProjectOption[]>([])
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [allRisks, setAllRisks] = useState<RiskOption[]>([])
  const [resources, setResources] = useState<ResourceOption[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)

  // Drawer
  const [selectedIssue, setSelectedIssue] = useState<IssueModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<IssueModel | null>(null)
  const [saving, setSaving] = useState(false)

  const currentUserName = currentUser?.fullname || ''

  // Resolve display names from lookup fields
  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    myProjects.forEach(p => { map[p.id.toLowerCase()] = p.name })
    return map
  }, [myProjects])

  const resourceNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    resources.forEach(r => { map[r.id.toLowerCase()] = r.name })
    return map
  }, [resources])

  // Grid state: search, filters, sort, pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [ragFilter, setRagFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'pm_dateraised', direction: 'desc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<IssueModel | null>(null)

  // ── Load issues ───────────────────────────────────────────────────────────
  const loadIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // TeamMember → only their assigned issues; PMO/Admin/etc → all issues
      const isTeamMember = currentUserPersona === 'TeamMember'
      const data = isTeamMember && currentUser?.systemuserid
        ? await fetchIssuesForSystemUser(currentUser.systemuserid)
        : await fetchAllIssues()
      setIssues(data || [])
    } catch (err) {
      console.error('[IssuesPage] loadIssues error:', err)
      setError('Unable to load issues.')
    } finally {
      setLoading(false)
    }
  }, [currentUserPersona, currentUser?.systemuserid])

  // ── Load projects, programmes, risks for the dialog ───────────────────────
  const loadUserProjects = useCallback(async () => {
    if (!currentUser?.systemuserid) return
    setProjectsLoading(true)
    try {
      const rawProjects = await fetchProjectsForSystemUser(currentUser.systemuserid)

      const progResult = await Pm_programmesService.getAll({
        select: ['pm_programmeid', 'pm_programmename'],
        filter: 'statecode eq 0',
        top: 500,
      })
      const progList = unwrapList<any>(progResult)
      const programmeMap = new Map<string, string>()
      const programmeOptions: ProgrammeOption[] = []
      for (const p of progList) {
        if (p.pm_programmeid && p.pm_programmename) {
          programmeMap.set(p.pm_programmeid, p.pm_programmename)
          programmeOptions.push({ id: p.pm_programmeid, name: p.pm_programmename })
        }
      }
      setProgrammes(programmeOptions)

      const options: ProjectOption[] = rawProjects.map(p => ({
        id: p.pm_projectid,
        name: p.pm_projectname || 'Untitled Project',
        code: p.pm_projectcode || undefined,
        programmeId: p._pm_programme_value ? p._pm_programme_value : undefined,
        programmeName: p._pm_programme_value ? programmeMap.get(p._pm_programme_value) : undefined,
      }))
      setMyProjects(options)
    } catch (err) {
      console.error('[IssuesPage] loadUserProjects error:', err)
    } finally {
      setProjectsLoading(false)
    }
  }, [currentUser?.systemuserid])

  // ── Load risks for the linked risk picker ──────────────────────────────────
  const loadRisks = useCallback(async () => {
    try {
      const fetched = await fetchAllRisks()
      const riskOpts: RiskOption[] = (fetched || [])
        .filter(r => r.pm_riskid && r.pm_risktitle)
        .map(r => ({
          id: r.pm_riskid!,
          title: r.pm_risktitle!,
          projectId: r._pm_project_value,
        }))
      setAllRisks(riskOpts)
    } catch (err) {
      console.error('[IssuesPage] loadRisks error:', err)
    }
  }, [])

  // ── Load resources for the owner lookup ─────────────────────────────────
  const loadResources = useCallback(async () => {
    setResourcesLoading(true)
    try {
      const fetched = await fetchResources()
      const options: ResourceOption[] = (fetched || [])
        .filter(r => r.pm_resourceid && r.pm_fullname)
        .map(r => ({ id: r.pm_resourceid!, name: r.pm_fullname! }))
      setResources(options)
    } catch (err) {
      console.error('[IssuesPage] loadResources error:', err)
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIssues()
    loadUserProjects()
    loadRisks()
    loadResources()
  }, [loadIssues, loadUserProjects, loadRisks, loadResources])

  // Cross-linking
  useEffect(() => {
    if (!loading && issues.length > 0) {
      const preselectedId = sessionStorage.getItem('preselectIssueId')
      if (preselectedId) {
        sessionStorage.removeItem('preselectIssueId')
        const issue = issues.find(i => normalizeLookupId(i.pm_issueid) === normalizeLookupId(preselectedId))
        if (issue) {
          setSelectedIssue(issue)
          setDrawerOpen(true)
        }
      }
    }
  }, [loading, issues])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingIssue(null)
    setDialogOpen(true)
  }

  const openEdit = (issue: IssueModel) => {
    setEditingIssue(issue)
    setDialogOpen(true)
  }

  const handleSave = async (data: Record<string, any>) => {
    if (!data.pm_issuetitle?.trim()) return
    console.log('[IssuesPage] handleSave called | mode:', editingIssue?.pm_issueid ? 'UPDATE' : 'CREATE', 'issueId:', editingIssue?.pm_issueid)
    console.log('[IssuesPage] handleSave raw data:', JSON.stringify(data, null, 2))
    setSaving(true)
    setError(null)
    try {
      if (editingIssue?.pm_issueid) {
        console.log('[IssuesPage] calling updateIssueFull with id:', editingIssue.pm_issueid)
        const updated = await updateIssueFull(editingIssue.pm_issueid, data)
        console.log('[IssuesPage] updateIssueFull result:', updated)
        if (updated) {
          setIssues(prev => prev.map(i => i.pm_issueid === updated.pm_issueid ? updated : i))
          setSuccessMsg('Issue updated.')
        } else {
          console.warn('[IssuesPage] updateIssueFull returned null - no update applied')
        }
      } else {
        console.log('[IssuesPage] calling createIssueFull')
        const created = await createIssueFull(data)
        console.log('[IssuesPage] createIssueFull result:', created)
        if (created) {
          setIssues(prev => [...prev, created])
          setSuccessMsg('Issue created.')
        } else {
          console.warn('[IssuesPage] createIssueFull returned null - no record created')
        }
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('[IssuesPage] handleSave error:', err)
      setError('Unable to save issue.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_issueid) return
    setError(null)
    setSaving(true)
    try {
      await deleteIssue(deleteTarget.pm_issueid)
      setIssues(prev => prev.filter(i => i.pm_issueid !== deleteTarget.pm_issueid))
      setSuccessMsg('Issue deleted.')
      setDeleteTarget(null)
      if (selectedIssue?.pm_issueid === deleteTarget.pm_issueid) {
        setDrawerOpen(false)
        setSelectedIssue(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError('Unable to delete issue.')
    } finally {
      setSaving(false)
    }
  }

  // ── Filtered / Sorted / Paginated Issues ────────────────────────────────
  const filteredIssues = useMemo(() => {
    let list = [...issues]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i =>
        (i.pm_issuetitle ?? '').toLowerCase().includes(q) ||
        (i.pm_issuedescription ?? '').toLowerCase().includes(q) ||
        (i.pm_issuereference ?? '').toLowerCase().includes(q) ||
        (i.pm_issueowner ?? '').toLowerCase().includes(q)
      )
    }

    // Category filter
    if (categoryFilter) {
      list = list.filter(i => String(i.pm_issuecategory ?? '') === categoryFilter)
    }

    // RAG filter
    if (ragFilter) {
      list = list.filter(i => String(i.pm_ragstatus ?? '') === ragFilter)
    }

    // Priority filter
    if (priorityFilter) {
      list = list.filter(i => String(i.pm_prioritylevel ?? '') === priorityFilter)
    }

    // Status filter
    if (statusFilter) {
      list = list.filter(i => String(i.pm_issuestatus ?? '') === statusFilter)
    }

    // Sort
    list.sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1
      let cmp = 0
      const field = sort.field

      if (field === 'pm_issuetitle') {
        cmp = (a.pm_issuetitle ?? '').localeCompare(b.pm_issuetitle ?? '')
      } else if (field === 'pm_issuecategory') {
        cmp = (ISSUE_CATEGORY_LABELS[String(a.pm_issuecategory ?? '')] ?? '').localeCompare(
          ISSUE_CATEGORY_LABELS[String(b.pm_issuecategory ?? '')] ?? ''
        )
      } else if (field === 'pm_ragstatus') {
        cmp = String(a.pm_ragstatus ?? '').localeCompare(String(b.pm_ragstatus ?? ''))
      } else if (field === 'pm_prioritylevel') {
        cmp = (PRIORITY_ORDER[String(a.pm_prioritylevel ?? '')] ?? 99) -
              (PRIORITY_ORDER[String(b.pm_prioritylevel ?? '')] ?? 99)
      } else if (field === 'pm_dateraised') {
        cmp = (a.pm_dateraised ?? '').localeCompare(b.pm_dateraised ?? '')
      } else if (field === 'pm_targetresolutiondate') {
        cmp = (a.pm_targetresolutiondate ?? '').localeCompare(b.pm_targetresolutiondate ?? '')
      } else if (field === 'pm_issuereference') {
        cmp = (a.pm_issuereference ?? '').localeCompare(b.pm_issuereference ?? '')
      }
      return cmp * dir
    })

    return list
  }, [issues, searchQuery, categoryFilter, ragFilter, priorityFilter, statusFilter, sort])

  const paginatedIssues = useMemo(
    () => filteredIssues.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredIssues, page, rowsPerPage]
  )

  const hasActiveFilters = searchQuery || categoryFilter || ragFilter || priorityFilter || statusFilter

  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handleCategoryFilterChange = useCallback((value: string) => { setCategoryFilter(value); setPage(0) }, [])
  const handleRagFilterChange = useCallback((value: string) => { setRagFilter(value); setPage(0) }, [])
  const handlePriorityFilterChange = useCallback((value: string) => { setPriorityFilter(value); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setPage(0) }, [])
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setCategoryFilter('')
    setRagFilter('')
    setPriorityFilter('')
    setStatusFilter('')
    setPage(0)
  }, [])
  const handleSort = useCallback((field: string) => {
    setSort(prev => prev.field === field
      ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' }
    )
  }, [])
  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <TableSortLabel
      active={sort.field === field}
      direction={sort.field === field ? sort.direction : 'asc'}
      onClick={() => handleSort(field)}
      sx={{ fontWeight: 700, color: 'inherit', '&.Mui-active': { color: 'inherit' } }}
    >
      {label}
    </TableSortLabel>
  )

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const filterOptions = useMemo((): { categoryOptions: FilterOption[]; ragOptions: FilterOption[]; priorityOptions: FilterOption[]; statusOptions: FilterOption[] } => ({
    categoryOptions: [
      { value: '', label: 'All Categories' },
      ...Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
    ragOptions: [
      { value: '', label: 'All RAG' },
      ...Object.entries(RAG_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
    priorityOptions: [
      { value: '', label: 'All Priorities' },
      ...Object.entries(PRIORITY_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
    statusOptions: [
      { value: '', label: 'All Statuses' },
      ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
  }), [])

  // KPIs
  const kpiItems = useMemo(() => {
    const total = issues.length
    const open = issues.filter(i => String(i.pm_issuestatus ?? '') === '0').length
    const critical = issues.filter(i => String(i.pm_prioritylevel ?? '') === '1').length
    const escalated = issues.filter(i => i.pm_escalationstatus).length
    const resolved = issues.filter(i => String(i.pm_issuestatus ?? '') === '2' || String(i.pm_issuestatus ?? '') === '3').length
    const overdue = issues.filter(i => {
      if (String(i.pm_issuestatus) === '2' || String(i.pm_issuestatus) === '3') return false
      if (!i.pm_targetresolutiondate) return false
      return new Date(i.pm_targetresolutiondate) < new Date()
    }).length

    return [
      { label: 'Total Issues', value: total, color: 'primary.main', icon: <BugReportIcon /> },
      { label: 'Open Issues', value: open, color: 'warning.main', icon: <ErrorIcon />, subtitle: total > 0 ? `${Math.round((open/total)*100)}% of total` : 'None open' },
      { label: 'Critical Priority', value: critical, color: 'error.main', icon: <NewReleasesIcon /> },
      { label: 'Overdue', value: overdue, color: 'error.main', icon: <AccessTimeIcon />, subtitle: 'Target date passed' },
      { label: 'Escalated', value: escalated, color: 'error.main', icon: <FlagIcon /> },
      { label: 'Resolved', value: resolved, color: 'success.main', icon: <CheckCircleIcon /> },
    ] as KpiCardItem[]
  }, [issues])

  return (
    <Box>
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2 }}>{successMsg}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <PageHeader
        title="Issue Log"
        subtitle="Track and manage project issues, prioritize resolution, and monitor impact."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={issues} columns={[]} filename="issues" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Issue
            </Button>
          </Box>
        }
      />

      <KpiCardRow items={kpiItems} loading={loading} />

      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by title, description, reference..."
          filterValue={categoryFilter}
          onFilterChange={handleCategoryFilterChange}
          filterLabel="Category"
          filterOptions={filterOptions.categoryOptions}
          secondaryFilterValue={ragFilter}
          onSecondaryFilterChange={handleRagFilterChange}
          secondaryFilterLabel="RAG"
          secondaryFilterOptions={filterOptions.ragOptions}
          extraFilters={
            <>
              <TextField
                select
                size="small"
                label="Priority"
                value={priorityFilter}
                onChange={e => handlePriorityFilterChange(e.target.value)}
                sx={{ minWidth: 150 }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                {filterOptions.priorityOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={e => handleStatusFilterChange(e.target.value)}
                sx={{ minWidth: 150 }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                {filterOptions.statusOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </>
          }
          onClear={hasActiveFilters ? handleClearFilters : undefined}
        />

        <TableShell
          loading={loading}
          empty={filteredIssues.length === 0}
          emptyIcon={<BugReportIcon />}
          emptyTitle={hasActiveFilters ? 'No issues match your filters.' : 'No issues found.'}
          emptyMessage={hasActiveFilters ? 'Try adjusting your search or filter criteria.' : 'Create your first issue to start tracking project issues.'}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                {[
                  { field: 'pm_issuereference', label: 'ID' },
                  { field: 'pm_issuetitle', label: 'Issue Title' },
                  { field: '', label: 'Project' },
                  { field: 'pm_issuecategory', label: 'Category' },
                  { field: 'pm_ragstatus', label: 'RAG' },
                  { field: 'pm_prioritylevel', label: 'Priority' },
                  { field: '', label: 'Owner' },
                  { field: 'pm_targetresolutiondate', label: 'Target Date' },
                ].map(col => (
                  <TableCell
                    key={col.field || col.label}
                    sx={{
                      fontWeight: 700,
                      bgcolor: isDark ? 'background.paper' : 'background.default',
                      borderBottom: `2px solid ${theme.palette.divider}`,
                      px: 2.5,
                      py: 1.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.field ? (
                      <SortHeader field={col.field} label={col.label} />
                    ) : (
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        {col.label}
                      </Typography>
                    )}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Actions</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedIssues.map((issue, idx) => (
                <TableRow
                  key={issue.pm_issueid}
                  hover
                  onClick={() => { setSelectedIssue(issue); setDrawerOpen(true); setDrawerTab(0) }}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent',
                    '& td': { py: 1.25, px: 2.5 },
                    '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }} color="text.secondary">
                      {issue.pm_issuereference || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {issue.pm_issuetitle || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {projectNameMap[(issue._pm_project_value || '').toLowerCase()] || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={ISSUE_CATEGORY_LABELS[String(issue.pm_issuecategory ?? '')] ?? 'Unknown'}
                      variant="outlined"
                      sx={{ borderColor: ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')], color: ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')] }}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={RAG_LABELS[String(issue.pm_ragstatus ?? '')] ?? '—'}
                      color={RAG_COLORS[String(issue.pm_ragstatus ?? '')] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {String(issue.pm_prioritylevel ?? '') === '1' && <NewReleasesIcon fontSize="small" sx={{ color: 'error.main' }} />}
                      {String(issue.pm_prioritylevel ?? '') === '0' && <PriorityHighIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                      {String(issue.pm_prioritylevel ?? '') === '2' && <LowPriorityIcon fontSize="small" sx={{ color: 'info.main' }} />}
                      <Typography variant="body2">{PRIORITY_LABELS[String(issue.pm_prioritylevel ?? '')] ?? 'Unknown'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{resourceNameMap[(issue._pm_issueowner_value || '').toLowerCase()] || issue.pm_issueowner || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }} color="text.secondary">
                      {formatDate(issue.pm_targetresolutiondate) || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit Issue">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); openEdit(issue) }}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Issue">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(issue) }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredIssues.length > 0 && (
          <TableFooter
            filteredCount={filteredIssues.length}
            totalCount={issues.length}
            itemLabel="issue"
          />
        )}
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

      {/* Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedIssue(null) }}
        title={selectedIssue?.pm_issuetitle ?? ''}
        subtitle={selectedIssue && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusTag label={ISSUE_CATEGORY_LABELS[String(selectedIssue.pm_issuecategory ?? '')] ?? '—'} variant="outlined" />
            <StatusTag label={RAG_LABELS[String(selectedIssue.pm_ragstatus ?? '')] ?? '—'} color={RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] || 'default'} />
            {selectedIssue.pm_escalationstatus && (
              <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FlagIcon sx={{ fontSize: 12 }} /> Escalated
              </Box>
            )}
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <ActionIcon icon={<EditIcon />} onClick={() => openEdit(selectedIssue!)} label="Edit" />
            <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedIssue)} label="Delete" color="error" />
          </Box>
        }
        tabs={[{ label: 'Overview' }, { label: 'Resolution' }]}
        tabValue={drawerTab}
        onTabChange={(_e, v) => setDrawerTab(v)}
      >
        {selectedIssue && (
          <>
            <TabPanel value={drawerTab} index={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                 <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Details</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                       {selectedIssue.pm_issuedescription || 'No description provided.'}
                    </Typography>
                 </Paper>
              </Box>
            </TabPanel>
            <TabPanel value={drawerTab} index={1}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                 <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Resolution details</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                       {selectedIssue.pm_resolutiondetails || 'No resolution details yet.'}
                    </Typography>
                 </Paper>
              </Box>
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      {/* Create / Edit Dialog */}
      <IssueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editingIssue}
        onSave={handleSave}
        projects={myProjects}
        programmes={programmes}
        projectsLoading={projectsLoading}
        risks={allRisks}
        resources={resources}
        resourcesLoading={resourcesLoading}
        currentUserName={currentUserName}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Issue"
        message={`Are you sure you want to delete ${deleteTarget?.pm_issuetitle}?`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Box>
  )
}
