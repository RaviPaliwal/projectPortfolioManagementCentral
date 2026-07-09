import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  useTheme,
  IconButton,
  Tooltip,
  Grid,
  Divider,
  LinearProgress,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BugReportIcon from '@mui/icons-material/BugReport'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import LayersIcon from '@mui/icons-material/Layers'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
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
  StatusTag,
  ActionIcon,
  ExportButton,
  Button,
  TableShell,
  TableFooter,
  SearchFilterBar,
  ConfirmDialog,
  TableHeader,
  Breadcrumbs,
  TabPanel,
} from '@/components/common'
import type { FilterOption } from '@/components/common'
import type { KpiCardItem } from '@/components/common'

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
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
import { Pm_programmesService, Pm_projectsService, Pm_risksService, Pm_portfoliosService } from '@/generated'
import type { IssueModel } from '@/types/dataverse'
import { unwrapList, unwrapSingle } from '@/services/common'
import { formatDate } from '@/utils/formatters'
import { useUser } from '@/context/UserContext'
import { IssueDialog } from '../components'
import type { ProjectOption, ProgrammeOption, RiskOption, ResourceOption } from '../components/IssueDialogs'

// Constants
const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'High',
  '0': 'Medium',
  '1': 'Low',
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

  const { allowed: canCreate } = useAuthorization('ISSUES', 'create')
  const { allowed: canEdit } = useAuthorization('ISSUES', 'update')
  const { allowed: canDelete } = useAuthorization('ISSUES', 'delete')

  // ── State ─────────────────────────────────────────────────────────────────
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Project / programme / risk / portfolio state for the dialog
  const [myProjects, setMyProjects] = useState<ProjectOption[]>([])
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [allRisks, setAllRisks] = useState<RiskOption[]>([])
  const [resources, setResources] = useState<ResourceOption[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)

  // Detail View
  const [selectedIssue, setSelectedIssue] = useState<IssueModel | null>(null)
  const [linkedRiskDetails, setLinkedRiskDetails] = useState<any>(null)
  const [linkedRiskLoading, setLinkedRiskLoading] = useState(false)

  useEffect(() => {
    if (selectedIssue?._pm_risk_value) {
      setLinkedRiskLoading(true)
      setLinkedRiskDetails(null)
      Pm_risksService.get(selectedIssue._pm_risk_value, {
        select: ['pm_riskid', 'pm_risktitle', 'pm_riskdescription', 'pm_riskcategory', 'pm_ragstatus', 'pm_riskstatus', 'pm_prioritylevel', 'pm_impactlevel']
      })
      .then(res => {
        if (res.success && res.data) {
          setLinkedRiskDetails(res.data)
        }
      })
      .catch(err => console.error('Failed to load linked risk:', err))
      .finally(() => setLinkedRiskLoading(false))
    } else {
      setLinkedRiskDetails(null)
    }
  }, [selectedIssue])

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

  const programmeNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    programmes.forEach(p => { map[p.id.toLowerCase()] = p.name })
    return map
  }, [programmes])

  const portfolioNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    portfolios.forEach(p => { map[p.id.toLowerCase()] = p.name })
    return map
  }, [portfolios])

  const resourceNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    resources.forEach(r => { map[r.id.toLowerCase()] = r.name })
    return map
  }, [resources])

  // Grid state: search, filters, sort, pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [ragFilter, setRagFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<SortState>({ field: 'pm_dateraised', direction: 'desc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<IssueModel | null>(null)
  // Escalate confirm
  const [escalateTarget, setEscalateTarget] = useState<IssueModel | null>(null)
  const [notifiedRole, setNotifiedRole] = useState<string>('Project Manager')
  const [notifiedPersonName, setNotifiedPersonName] = useState<string>('')

  useEffect(() => {
    if (escalateTarget?._pm_regardingid_value && escalateTarget.pm_regardingidtype) {
      const type = escalateTarget.pm_regardingidtype
      const id = escalateTarget._pm_regardingid_value

      if (type === 'pm_projects') {
        setNotifiedRole('Project Manager')
        setNotifiedPersonName('')
        Pm_projectsService.get(id, {
          select: ['pm_projectid', 'pm_projectname', 'pm_projectmanagername']
        }).then(res => {
          if (res.success && res.data) {
            const proj = unwrapSingle<any>(res)
            setNotifiedPersonName(proj?.pm_projectmanagername || 'the Project Manager')
          } else {
            setNotifiedPersonName('the Project Manager')
          }
        }).catch(() => {
          setNotifiedPersonName('the Project Manager')
        })
      } else if (type === 'pm_programmes') {
        setNotifiedRole('Programme Manager')
        setNotifiedPersonName('')
        Pm_programmesService.get(id, {
          select: ['pm_programmeid', 'pm_programmename', 'pm_programmemanagername']
        }).then(res => {
          if (res.success && res.data) {
            const prog = unwrapSingle<any>(res)
            setNotifiedPersonName(prog?.pm_programmemanagername || 'the Programme Manager')
          } else {
            setNotifiedPersonName('the Programme Manager')
          }
        }).catch(() => {
          setNotifiedPersonName('the Programme Manager')
        })
      } else if (type === 'pm_portfolios') {
        setNotifiedRole('Portfolio Owner')
        setNotifiedPersonName('')
        Pm_portfoliosService.get(id, {
          select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value']
        }).then(res => {
          if (res.success && res.data) {
            const port = unwrapSingle<any>(res)
            const ownerName = port.pm_ownerlookupname || port['_pm_ownerlookup_value@OData.Community.Display.V1.FormattedValue'] || 'the Portfolio Owner'
            setNotifiedPersonName(ownerName)
          } else {
            setNotifiedPersonName('the Portfolio Owner')
          }
        }).catch(() => {
          setNotifiedPersonName('the Portfolio Owner')
        })
      }
    } else {
      setNotifiedRole('Project Manager')
      setNotifiedPersonName('')
    }
  }, [escalateTarget])

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
      // TeamMember → only their allocated projects; PMO/Admin/etc → all projects
      const isTeamMember = currentUserPersona === 'TeamMember'
      const rawProjects = isTeamMember
        ? await fetchProjectsForSystemUser(currentUser.systemuserid)
        : await Pm_projectsService.getAll({
          filter: 'statecode eq 0',
          select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', '_pm_programme_value', '_pm_portfolio_value'],
          orderBy: ['pm_projectname asc'],
          top: 500,
        }).then(result => unwrapList<any>(result))

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
  }, [currentUser?.systemuserid, currentUserPersona])

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

  const loadPortfolios = useCallback(async () => {
    try {
      const res = await Pm_portfoliosService.getAll({
        select: ['pm_portfolioid', 'pm_portfolioname'],
        orderBy: ['pm_portfolioname asc'],
        top: 100
      })
      if (res.success && res.data) {
        setPortfolios(unwrapList<any>(res).map(p => ({
          id: p.pm_portfolioid || '',
          name: p.pm_portfolioname || ''
        })))
      }
    } catch (err) {
      console.error('[IssuesPage] loadPortfolios error:', err)
    }
  }, [])

  useEffect(() => {
    loadIssues()
    loadUserProjects()
    loadRisks()
    loadResources()
    loadPortfolios()
  }, [loadIssues, loadUserProjects, loadRisks, loadResources, loadPortfolios])

  // Cross-linking
  useEffect(() => {
    if (!loading && issues.length > 0) {
      const preselectedId = sessionStorage.getItem('preselectIssueId')
      if (preselectedId) {
        sessionStorage.removeItem('preselectIssueId')
        const issue = issues.find(i => normalizeLookupId(i.pm_issueid) === normalizeLookupId(preselectedId))
        if (issue) {
          setSelectedIssue(issue)
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
    if (!editingIssue && !data.pm_issuetitle?.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingIssue?.pm_issueid) {
        const updated = await updateIssueFull(editingIssue.pm_issueid, data)
        if (updated) {
          setIssues(prev => prev.map(i => i.pm_issueid === updated.pm_issueid ? updated : i))
          setSuccessMsg('Issue updated.')
        }
      } else {
        const created = await createIssueFull(data)
        if (created) {
          setIssues(prev => [...prev, created])
          setSuccessMsg('Issue created.')
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
        setSelectedIssue(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError('Unable to delete issue.')
    } finally {
      setSaving(false)
    }
  }

  const handleEscalateIssue = async (issue: IssueModel) => {
    if (!issue.pm_issueid) return
    setError(null)
    setSaving(true)
    try {
      const updated = await updateIssueFull(issue.pm_issueid, {
        pm_escalationstatus: true
      })
      if (updated) {
        setSuccessMsg('Issue escalated successfully.')
        setSelectedIssue(updated)
        setIssues(prev => prev.map(i => i.pm_issueid === issue.pm_issueid ? updated : i))
        setEscalateTarget(null)
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to escalate issue.')
      setTimeout(() => setError(null), 4000)
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
    if (categoryFilter !== 'all') {
      list = list.filter(i => String(i.pm_issuecategory ?? '') === categoryFilter)
    }

    // RAG filter
    if (ragFilter !== 'all') {
      list = list.filter(i => String(i.pm_ragstatus ?? '') === ragFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      list = list.filter(i => String(i.pm_prioritylevel ?? '') === priorityFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
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

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || ragFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'

  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handleCategoryFilterChange = useCallback((value: string) => { setCategoryFilter(value); setPage(0) }, [])
  const handleRagFilterChange = useCallback((value: string) => { setRagFilter(value); setPage(0) }, [])
  const handlePriorityFilterChange = useCallback((value: string) => { setPriorityFilter(value); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setPage(0) }, [])
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setCategoryFilter('all')
    setRagFilter('all')
    setPriorityFilter('all')
    setStatusFilter('all')
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

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const filterOptions = useMemo((): { categoryOptions: FilterOption[]; ragOptions: FilterOption[]; priorityOptions: FilterOption[]; statusOptions: FilterOption[] } => ({
    categoryOptions: [
      { value: 'all', label: 'All Categories' },
      ...Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
    ragOptions: [
      { value: 'all', label: 'All RAG' },
      ...Object.entries(RAG_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
    priorityOptions: [
      { value: 'all', label: 'All Priorities' },
      ...Object.entries(PRIORITY_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ],
    statusOptions: [
      { value: 'all', label: 'All Statuses' },
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
      { label: 'Open Issues', value: open, color: 'warning.main', icon: <ErrorIcon />, subtitle: total > 0 ? `${Math.round((open / total) * 100)}% of total` : 'None open' },
      { label: 'Critical Priority', value: critical, color: 'error.main', icon: <NewReleasesIcon /> },
      { label: 'Overdue', value: overdue, color: 'error.main', icon: <AccessTimeIcon />, subtitle: 'Target date passed' },
      { label: 'Escalated', value: escalated, color: 'error.main', icon: <FlagIcon /> },
      { label: 'Resolved', value: resolved, color: 'success.main', icon: <CheckCircleIcon /> },
    ] as KpiCardItem[]
  }, [issues])

  return (
    <Box>

      {!selectedIssue ? (
        <>

      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2 }}>{successMsg}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <PageHeader
        title="Issue Log"
        subtitle="Track and manage project issues, prioritize resolution, and monitor impact."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={issues} columns={[]} filename="issues" />
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                Add Issue
              </Button>
            )}
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
            <TableHeader cells={[
              { label: 'Issue Title', sortable: true, active: sort.field === 'pm_issuetitle', dir: sort.direction, onClick: () => handleSort('pm_issuetitle') },
              { label: 'Linked To' },
              { label: 'Category', sortable: true, active: sort.field === 'pm_issuecategory', dir: sort.direction, onClick: () => handleSort('pm_issuecategory') },
              { label: 'RAG', sortable: true, active: sort.field === 'pm_ragstatus', dir: sort.direction, onClick: () => handleSort('pm_ragstatus') },
              { label: 'Priority', sortable: true, active: sort.field === 'pm_prioritylevel', dir: sort.direction, onClick: () => handleSort('pm_prioritylevel') },
              { label: 'Owner' },
              { label: 'Target Date', sortable: true, active: sort.field === 'pm_targetresolutiondate', dir: sort.direction, onClick: () => handleSort('pm_targetresolutiondate') },
              { label: 'Actions', align: 'right' },
            ]} />
            <TableBody>
              {paginatedIssues.map((issue, idx) => (
                <TableRow
                  key={issue.pm_issueid}
                  hover
                  onClick={() => setSelectedIssue(issue)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                    '& td': { py: 1.25, px: 2.5 },
                    '&:hover': { bgcolor: 'action.selected' },
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {issue.pm_issuetitle || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const id = (issue._pm_regardingid_value || '').toLowerCase()
                      const type = issue.pm_regardingidtype || (projectNameMap[id] ? 'pm_projects' : programmeNameMap[id] ? 'pm_programmes' : portfolioNameMap[id] ? 'pm_portfolios' : undefined)
                      if (!id || !type) return <Typography variant="body2" color="text.disabled">—</Typography>

                      const isProj = type === 'pm_projects'
                      const isProg = type === 'pm_programmes'
                      const isPort = type === 'pm_portfolios'
                      const name = isProj ? projectNameMap[id] : isProg ? programmeNameMap[id] : isPort ? portfolioNameMap[id] : '—'
                      const color = isProj ? '#2e7d32' : isProg ? '#e65100' : '#1976d2'
                      const label = isProj ? 'Project' : isProg ? 'Programme' : 'Portfolio'
                      
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="caption" sx={{ color: color, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {name || '—'}
                          </Typography>
                        </Box>
                      )
                    })()}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Breadcrumbs
            items={[
              { label: 'Issues', path: 'list' },
              { label: selectedIssue.pm_issuetitle ?? 'Detail' }
            ]}
            onNavigate={() => setSelectedIssue(null)}
          />
          <PageHeader
            title={selectedIssue?.pm_issuetitle ?? 'Issue Detail'}
            actionElement={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {selectedIssue && !selectedIssue.pm_escalationstatus && canEdit && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<FlagIcon />}
                    onClick={() => setEscalateTarget(selectedIssue)}
                    sx={{ mr: 1, borderRadius: 1.5 }}
                  >
                    Escalate Issue
                  </Button>
                )}
                {canEdit && (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(selectedIssue)} sx={{ borderRadius: 1.5 }}>
                    Edit Issue
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedIssue)} sx={{ borderRadius: 1.5 }}>
                    Delete Issue
                  </Button>
                )}
              </Box>
            }
          />
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              
              {/* 1. Description / PMO Summary */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                  <BugReportIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Description / PMO Summary
                </Typography>
                {(() => {
                  const desc = selectedIssue.pm_issuedescription || '';
                  const rootCauseRegex = /(?:Root\s*Cause\s*\/\s*Context|Context)\s*:?\s*([\s\S]*?)(?=(?:Business\s*\/\s*Project\s*Impact|Impact|Recommended\s*Mitigation|Mitigation)\s*:?|$)/i;
                  const impactRegex = /(?:Business\s*\/\s*Project\s*Impact|Impact)\s*:?\s*([\s\S]*?)(?=(?:Root\s*Cause\s*\/\s*Context|Context|Recommended\s*Mitigation|Mitigation)\s*:?|$)/i;
                  const mitigationRegex = /(?:Recommended\s*Mitigation|Mitigation)\s*:?\s*([\s\S]*?)(?=(?:Root\s*Cause\s*\/\s*Context|Context|Business\s*\/\s*Project\s*Impact|Impact)\s*:?|$)/i;

                  const rootCauseMatch = desc.match(rootCauseRegex);
                  const impactMatch = desc.match(impactRegex);
                  const mitigationMatch = desc.match(mitigationRegex);

                  const isStructured = rootCauseMatch || impactMatch || mitigationMatch;

                  if (!isStructured) {
                    return (
                      <Box sx={{
                        p: 2.5,
                        borderRadius: '8px',
                        bgcolor: mode => mode.palette.mode === 'light' ? '#f8fafc' : '#1e293b',
                        border: '1px solid',
                        borderColor: mode => mode.palette.mode === 'light' ? '#e2e8f0' : '#334155',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6 }}>
                          {desc || 'No description provided.'}
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                      {rootCauseMatch && (
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'action.hover', borderLeft: '4px solid', borderColor: 'info.main' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'info.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            Root Cause / Context
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {rootCauseMatch[1].trim()}
                          </Typography>
                        </Box>
                      )}
                      {impactMatch && (
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: mode => mode.palette.mode === 'light' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid', borderColor: 'error.main' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            Business / Project Impact
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {impactMatch[1].trim()}
                          </Typography>
                        </Box>
                      )}
                      {mitigationMatch && (
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: mode => mode.palette.mode === 'light' ? 'rgba(33, 124, 53, 0.04)' : 'rgba(33, 124, 53, 0.08)', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            Recommended Mitigation
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {mitigationMatch[1].trim()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })()}
              </Box>

              {/* 2. Resolution Details */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} /> Resolution Details
                </Typography>
                {selectedIssue.pm_resolutiondetails ? (
                  <Box sx={{
                    p: 2.5,
                    borderRadius: '8px',
                    bgcolor: mode => mode.palette.mode === 'light' ? '#f0fdf4' : '#14532d',
                    border: '1px solid',
                    borderColor: mode => mode.palette.mode === 'light' ? '#bbf7d0' : '#166534',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6 }}>
                      {selectedIssue.pm_resolutiondetails}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{
                    p: 2.5,
                    borderRadius: '8px',
                    bgcolor: mode => mode.palette.mode === 'light' ? '#fffbeb' : '#2d2217',
                    border: '1px dashed',
                    borderColor: mode => mode.palette.mode === 'light' ? '#fde68a' : '#5f3e1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', mr: 0.5 }} />
                    <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500 }}>
                      Pending — this issue is active. Resolution steps and outcomes will populate here once remediation work begins.
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              {/* 3. Issue Context */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                  Issue Context
                </Typography>

                <Grid container spacing={3.5}>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        <LayersIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> Associated Entity
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 0.25 }}>
                        {(() => {
                          const id = (selectedIssue._pm_regardingid_value || '').toLowerCase()
                          const type = selectedIssue.pm_regardingidtype || (projectNameMap[id] ? 'pm_projects' : programmeNameMap[id] ? 'pm_programmes' : portfolioNameMap[id] ? 'pm_portfolios' : undefined)
                          if (!id || !type) return <Typography variant="body2" color="text.secondary">—</Typography>

                          const isProj = type === 'pm_projects'
                          const isProg = type === 'pm_programmes'
                          const label = isProj ? 'Project' : isProg ? 'Programme' : 'Portfolio'
                          const color = isProj ? '#2e7d32' : isProg ? '#e65100' : '#1976d2'
                          const name = isProj ? projectNameMap[id] : isProg ? programmeNameMap[id] : portfolioNameMap[id]

                          return (
                            <>
                              <Box sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '16px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                bgcolor: `${color}12`,
                                color: color,
                                border: `1px solid ${color}30`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                lineHeight: 1
                              }}>
                                {label}
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {name || '—'}
                              </Typography>
                            </>
                          )
                        })()}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> Issue owner
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {resourceNameMap[(selectedIssue._pm_issueowner_value || '').toLowerCase()] || selectedIssue.pm_issueowner || '—'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Category
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {ISSUE_CATEGORY_LABELS[String(selectedIssue.pm_issuecategory ?? '')] || '—'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Priority
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: String(selectedIssue.pm_prioritylevel) === '1' ? 'error.main' : String(selectedIssue.pm_prioritylevel) === '0' ? 'warning.main' : 'info.main' 
                        }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: String(selectedIssue.pm_prioritylevel) === '1' ? 'error.main' : 'text.primary' }}>
                          {PRIORITY_LABELS[String(selectedIssue.pm_prioritylevel ?? '')] || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        RAG status
                      </Typography>
                      <Box sx={{ mt: 0.25 }}>
                        <StatusTag 
                          label={RAG_LABELS[String(selectedIssue.pm_ragstatus ?? '')] ?? '—'} 
                          color={RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] || 'default'} 
                        />
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Target date
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {selectedIssue.pm_targetresolutiondate ? new Date(selectedIssue.pm_targetresolutiondate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Escalation Status
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <FlagIcon sx={{ fontSize: 16, color: selectedIssue.pm_escalationstatus ? 'error.main' : 'text.disabled' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: selectedIssue.pm_escalationstatus ? 'error.main' : 'text.primary' }}>
                          {selectedIssue.pm_escalationstatus ? 'Yes — Escalated' : 'No'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* 3.5. Linked Risk Details */}
              {selectedIssue._pm_risk_value && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                      Linked Risk Details
                    </Typography>
                    {linkedRiskLoading ? (
                      <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
                    ) : linkedRiskDetails ? (
                      <Box sx={{
                        p: 2.5,
                        borderRadius: '8px',
                        bgcolor: mode => mode.palette.mode === 'light' ? '#f8fafc' : '#1e293b',
                        border: '1px solid',
                        borderColor: mode => mode.palette.mode === 'light' ? '#e2e8f0' : '#334155',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Risk Title</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{linkedRiskDetails.pm_risktitle || '—'}</Typography>
                        </Box>
                        {linkedRiskDetails.pm_riskdescription && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Risk Description</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{linkedRiskDetails.pm_riskdescription}</Typography>
                          </Box>
                        )}
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>RAG Status</Typography>
                            <Box sx={{ mt: 0.25 }}>
                              <StatusTag 
                                label={RAG_LABELS[String(linkedRiskDetails.pm_ragstatus ?? '')] ?? '—'} 
                                color={RAG_COLORS[String(linkedRiskDetails.pm_ragstatus ?? '')] || 'default'} 
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Priority</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {PRIORITY_LABELS[String(linkedRiskDetails.pm_prioritylevel ?? '')] || '—'}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Impact Level</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {linkedRiskDetails.pm_impactlevel !== undefined ? ['Moderate', 'Major', 'Minor'][linkedRiskDetails.pm_impactlevel] || '—' : '—'}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Risk Status</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {linkedRiskDetails.pm_riskstatus !== undefined ? ['Open', 'Mitigated', 'Closed'][linkedRiskDetails.pm_riskstatus] || '—' : '—'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Failed to load risk details.</Typography>
                    )}
                  </Box>
                </>
              )}

              {/* 4. Footer Last Updated Info */}
              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Last updated {(() => {
                    const mod = selectedIssue.modifiedon ? new Date(selectedIssue.modifiedon) : new Date();
                    const diff = Math.max(0, Math.floor((new Date().getTime() - mod.getTime()) / (1000 * 60 * 60 * 24)));
                    return diff === 0 ? 'today' : diff === 1 ? 'yesterday' : `${diff} days ago`;
                  })()}
                </Typography>
              </Box>

            </Box>
          </Paper>
        </Box>
      )}
      <IssueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editingIssue}
        onSave={handleSave}
        projects={myProjects}
        programmes={programmes}
        portfolios={portfolios}
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

      {/* Escalate Confirmation */}
      <ConfirmDialog
        open={!!escalateTarget}
        title="Escalate Issue"
        message={`Are you sure you want to escalate the issue "${escalateTarget?.pm_issuetitle}"? This will send a Microsoft Teams notification to the ${notifiedRole} (${notifiedPersonName || 'Loading...'}) of the ${notifiedRole ? notifiedRole.split(' ')[0].toLowerCase() : 'project'}.`}
        confirmLabel="Escalate"
        confirmColor="error"
        loading={saving}
        onClose={() => setEscalateTarget(null)}
        onConfirm={() => escalateTarget && handleEscalateIssue(escalateTarget)}
      />
    </Box>
  )
}
