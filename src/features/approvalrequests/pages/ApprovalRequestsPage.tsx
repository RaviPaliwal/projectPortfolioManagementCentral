import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Box, Paper, Typography, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Divider,
} from "@mui/material"
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ChecklistIcon from '@mui/icons-material/Checklist'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import DescriptionIcon from '@mui/icons-material/Description'
import EventIcon from '@mui/icons-material/Event'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PersonIcon from '@mui/icons-material/Person'

import {
  fetchApprovalRequests,
  createApprovalRequest,
  updateApprovalRequest,
  deleteApprovalRequest,
} from '@/lib/dataverseClient'
import type { ApprovalRequestModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, ExportButton } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

const STAGE_LABELS: Record<string, string> = {
  '0': 'New',
  '1': 'Under Review',
  '2': 'Approved',
  '3': 'Rejected',
  '4': 'Delegated',
}

const STAGE_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  '0': 'default',
  '1': 'warning',
  '2': 'success',
  '3': 'error',
  '4': 'info',
}

const DECISION_LABELS: Record<string, string> = {
  '0': 'Pending',
  '1': 'Approved',
  '2': 'Rejected',
  '3': 'Delegated',
  '4': 'Cancelled',
}

const DECISION_COLORS: Record<string, 'warning' | 'success' | 'error' | 'info' | 'default'> = {
  '0': 'warning',
  '1': 'success',
  '2': 'error',
  '3': 'info',
  '4': 'default',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  '0': 'Project',
  '1': 'Programme',
  '2': 'Portfolio',
  '3': 'Change Request',
  '4': 'Budget Line',
  '5': 'Initiative',
}

const PRIORITY_LABELS: Record<string, string> = {
  '0': 'Standard',
  '1': 'High',
  '2': 'Urgent',
}

const approvalExportColumns: ExportColumn[] = [
  { key: 'pm_requesttitle', label: 'Title' },
  { key: 'pm_approvalstagename', label: 'Stage' },
  { key: 'pm_entitytypename', label: 'Entity Type' },
  { key: 'pm_prioritylevelname', label: 'Priority' },
  { key: 'pm_approvername', label: 'Approver' },
  { key: 'pm_requestorname', label: 'Requestor' },
  { key: 'pm_duedate', label: 'Due Date' },
  { key: 'pm_decisionstatusname', label: 'Decision' },
]

const PRIORITY_COLORS: Record<string, 'default' | 'warning' | 'error'> = {
  '0': 'default',
  '1': 'warning',
  '2': 'error',
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '\u2014'

// \u2500\u2500\u2500 Filter Options \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const STAGE_FILTERS: FilterOption[] = [
  { value: '', label: 'All Stages' },
  { value: '0', label: 'New' },
  { value: '1', label: 'Under Review' },
  { value: '2', label: 'Approved' },
  { value: '3', label: 'Rejected' },
]

const ENTITY_FILTERS: FilterOption[] = [
  { value: '', label: 'All Entity Types' },
  { value: '0', label: 'Project' },
  { value: '1', label: 'Programme' },
  { value: '2', label: 'Portfolio' },
  { value: '3', label: 'Change Request' },
]

const PRIORITY_FILTERS: FilterOption[] = [
  { value: '', label: 'All Priorities' },
  { value: '0', label: 'Standard' },
  { value: '1', label: 'High' },
  { value: '2', label: 'Urgent' },
]

type SortField = 'title' | 'stage' | 'entity' | 'priority' | 'approver' | 'requestor' | 'duedate' | 'decision'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

export default function ApprovalRequestsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [requests, setRequests] = useState<ApprovalRequestModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'title', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApprovalRequestModel | null>(null)
  const [formData, setFormData] = useState<Partial<ApprovalRequestModel>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [dialogLoading, setDialogLoading] = useState(false)

  // \u2500\u2500 Data Fetching \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApprovalRequests()
      setRequests(data ?? [])
    } catch (err: any) {
      console.error('Failed to load approval requests:', err)
      setError(err?.message || 'Failed to load approval requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // \u2500\u2500 Filtering & Sorting \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const filteredRequests = useMemo(() => {
    let list = [...requests]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((r) =>
        (r.pm_requesttitle?.toLowerCase() || '').includes(q) ||
        (r.pm_approvername?.toLowerCase() || '').includes(q) ||
        (r.pm_requestorname?.toLowerCase() || '').includes(q) ||
        (r.pm_entitytypename?.toLowerCase() || '').includes(q) ||
        (r.pm_approvalstagename?.toLowerCase() || '').includes(q)
      )
    }

    if (stageFilter) {
      list = list.filter((r) => String(r.pm_approvalstage ?? '') === stageFilter)
    }
    if (entityFilter) {
      list = list.filter((r) => String(r.pm_entitytype ?? '') === entityFilter)
    }
    if (priorityFilter) {
      list = list.filter((r) => String(r.pm_prioritylevel ?? '') === priorityFilter)
    }

    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const getA = (a: ApprovalRequestModel): string | number => {
        switch (sort.field) {
          case 'title': return a.pm_requesttitle || ''
          case 'stage': return a.pm_approvalstage ?? ''
          case 'entity': return a.pm_entitytype ?? ''
          case 'priority': return a.pm_prioritylevel ?? 0
          case 'approver': return a.pm_approvername || ''
          case 'requestor': return a.pm_requestorname || ''
          case 'duedate': return a.pm_duedate || ''
          case 'decision': return a.pm_decisionstatus ?? ''
          default: return ''
        }
      }
      const getB = (b: ApprovalRequestModel): string | number => {
        switch (sort.field) {
          case 'title': return b.pm_requesttitle || ''
          case 'stage': return b.pm_approvalstage ?? ''
          case 'entity': return b.pm_entitytype ?? ''
          case 'priority': return b.pm_prioritylevel ?? 0
          case 'approver': return b.pm_approvername || ''
          case 'requestor': return b.pm_requestorname || ''
          case 'duedate': return b.pm_duedate || ''
          case 'decision': return b.pm_decisionstatus ?? ''
          default: return ''
        }
      }
      const va = getA(a)
      const vb = getB(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })

    return list
  }, [requests, searchQuery, stageFilter, entityFilter, priorityFilter, sort])

  const paginatedRequests = useMemo(() => {
    const start = page * rowsPerPage
    return filteredRequests.slice(start, start + rowsPerPage)
  }, [filteredRequests, page, rowsPerPage])

  // \u2500\u2500 KPI Calculations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const kpiCards: KpiCardItem[] = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => String(r.pm_decisionstatus) === '0').length
    const approved = requests.filter((r) => String(r.pm_decisionstatus) === '1').length
    const highPriority = requests.filter((r) => String(r.pm_prioritylevel) !== '0').length

    return [
      {
        label: 'Total Requests',
        value: String(total),
        icon: <ChecklistIcon />,
        color: '#6366f1',
      },
      {
        label: 'Pending Decision',
        value: String(pending),
        subtitle: pending > 0 ? Math.round((pending / total) * 100) + '% of total' : 'All resolved',
        icon: <HourglassEmptyIcon />,
        color: '#f59e0b',
      },
      {
        label: 'Approved',
        value: String(approved),
        subtitle: total > 0 ? Math.round((approved / total) * 100) + '% approval rate' : 'No decisions',
        icon: <ThumbUpIcon />,
        color: '#22c55e',
      },
      {
        label: 'High Priority',
        value: String(highPriority),
        icon: <PriorityHighIcon />,
        color: '#ef4444',
      },
    ]
  }, [requests])

  // \u2500\u2500 Sort Handler \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
    setPage(0)
  }

  const getSortDirection = (field: SortField): 'asc' | 'desc' | undefined => {
    return sort.field === field ? sort.dir : undefined
  }

  // \u2500\u2500 Detail Drawer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const openDrawer = useCallback((req: ApprovalRequestModel) => {
    setSelectedRequest(req)
    setTabValue(0)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setSelectedRequest(null)
  }, [])

  // \u2500\u2500 Dialog Handlers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const openCreateDialog = useCallback(() => {
    setFormData({
      pm_approvalstage: '1',
      pm_decisionstatus: '0',
      pm_entitytype: '0',
      pm_prioritylevel: '0',
      statecode: 0,
    })
    setFormErrors({})
    setDialogMode('create')
  }, [])

  const openEditDialog = useCallback((req: ApprovalRequestModel) => {
    setFormData({ ...req })
    setFormErrors({})
    setDialogMode('edit')
  }, [])

  const closeDialog = useCallback(() => {
    setDialogMode(null)
    setFormData({})
    setFormErrors({})
  }, [])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // \u2500\u2500 Validation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.pm_requesttitle?.trim()) errors.pm_requesttitle = 'Title is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // \u2500\u2500 Save Handler \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handleSave = async () => {
    if (!validate()) return
    setDialogLoading(true)
    try {
      if (dialogMode === 'create') {
        await createApprovalRequest(formData)
        setSuccessMsg('Approval request created successfully')
      } else if (dialogMode === 'edit' && selectedRequest?.pm_projectapprovalrequestid) {
        await updateApprovalRequest(selectedRequest.pm_projectapprovalrequestid, formData)
        setSuccessMsg('Approval request updated successfully')
      }
      closeDialog()
      await loadData()
    } catch (err: any) {
      console.error('Failed to save approval request:', err)
      setError(err?.message || 'Failed to save approval request')
    } finally {
      setDialogLoading(false)
    }
  }

  // \u2500\u2500 Delete Handler \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handleDelete = async () => {
    if (!deleteTarget?.pm_projectapprovalrequestid) return
    setActionLoading(true)
    try {
      await deleteApprovalRequest(deleteTarget.pm_projectapprovalrequestid)
      setSuccessMsg('Approval request deleted successfully')
      setDeleteTarget(null)
      if (drawerOpen && selectedRequest?.pm_projectapprovalrequestid === deleteTarget.pm_projectapprovalrequestid) {
        closeDrawer()
      }
      await loadData()
    } catch (err: any) {
      console.error('Failed to delete approval request:', err)
      setError(err?.message || 'Failed to delete approval request')
    } finally {
      setActionLoading(false)
    }
  }

  // \u2500\u2500 Extra Filters \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const extraFilters = (
    <>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Stage</InputLabel>
        <Select
          value={stageFilter}
          label="Stage"
          onChange={(e) => { setStageFilter(e.target.value); setPage(0) }}
        >
          {STAGE_FILTERS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Entity Type</InputLabel>
        <Select
          value={entityFilter}
          label="Entity Type"
          onChange={(e) => { setEntityFilter(e.target.value); setPage(0) }}
        >
          {ENTITY_FILTERS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Priority</InputLabel>
        <Select
          value={priorityFilter}
          label="Priority"
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(0) }}
        >
          {PRIORITY_FILTERS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  )

  // ─── Sort Configuration ────────────────────────────────────────────────

  interface ColumnConfig {
    field: SortField
    label: string
    sortable: boolean
    width?: string
  }

  const columns: ColumnConfig[] = [
    { field: 'title', label: 'Title', sortable: true, width: '20%' },
    { field: 'stage', label: 'Stage', sortable: true, width: '12%' },
    { field: 'entity', label: 'Entity Type', sortable: true, width: '12%' },
    { field: 'priority', label: 'Priority', sortable: true, width: '10%' },
    { field: 'approver', label: 'Approver', sortable: true, width: '12%' },
    { field: 'requestor', label: 'Requestor', sortable: true, width: '12%' },
    { field: 'duedate', label: 'Due Date', sortable: true, width: '10%' },
    { field: 'decision', label: 'Decision', sortable: true, width: '12%' },
  ]

  // ─── Detail Drawer Content ─────────────────────────────────────────────

  const drawerTabs = useMemo(() => [
    { label: 'Overview' },
    { label: 'Details' },
  ], [])

  const drawerContent = useMemo(() => {
    if (!selectedRequest) return <></>

    if (tabValue === 0) {
      return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.05em', fontWeight: 600, mb: 0.5, display: 'block' }}>
              <AssignmentIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
              Request Details
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedRequest.pm_requesttitle || '\u2014'}</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Stage</Typography>
              <Chip
                size="small"
                label={STAGE_LABELS[String(selectedRequest.pm_approvalstage ?? '')] || '\u2014'}
                color={STAGE_COLORS[String(selectedRequest.pm_approvalstage ?? '')] || 'default'}
                sx={{ fontWeight: 600, mt: 0.5 }}
              />
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Decision Status</Typography>
              <Chip
                size="small"
                label={DECISION_LABELS[String(selectedRequest.pm_decisionstatus ?? '')] || '\u2014'}
                color={DECISION_COLORS[String(selectedRequest.pm_decisionstatus ?? '')] || 'default'}
                sx={{ fontWeight: 600, mt: 0.5 }}
              />
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <PersonIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'text-top' }} />
                Requestor
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedRequest.pm_requestorname || '\u2014'}</Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <PersonIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'text-top' }} />
                Approver
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedRequest.pm_approvername || '\u2014'}</Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <EventIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                Due Date
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(selectedRequest.pm_duedate)}</Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <EventIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                Decision Date
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(selectedRequest.pm_decisiondate)}</Typography>
            </Grid>
          </Grid>

          {selectedRequest.pm_decisionnotes && (
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.05em', fontWeight: 600, mb: 0.5, display: 'block' }}>
                <DescriptionIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                Decision Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">{selectedRequest.pm_decisionnotes}</Typography>
            </Box>
          )}
        </Box>
      )
    }

    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2}>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Entity Type</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{ENTITY_TYPE_LABELS[String(selectedRequest.pm_entitytype ?? '')] || '\u2014'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Priority</Typography>
            <Chip
              size="small"
              label={PRIORITY_LABELS[String(selectedRequest.pm_prioritylevel ?? '')] || '\u2014'}
              color={PRIORITY_COLORS[String(selectedRequest.pm_prioritylevel ?? '')] || 'default'}
              sx={{ fontWeight: 600, mt: 0.5 }}
            />
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Stage Name</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedRequest.pm_approvalstagename || '\u2014'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Entity Name</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedRequest.pm_entitytypename || '\u2014'}</Typography>
          </Grid>
          {selectedRequest.pm_entityid && (
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Entity ID</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedRequest.pm_entityid}</Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    )
  }, [selectedRequest, tabValue])

  // ─── Header Actions for Drawer ─────────────────────────────────────────

  const drawerHeaderActions = selectedRequest ? (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<EditIcon />}
        onClick={() => {
          const req = selectedRequest
          closeDrawer()
          openEditDialog(req)
        }}
      >
        Edit
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={() => {
          setDeleteTarget(selectedRequest)
        }}
      >
        Delete
      </Button>
    </Box>
  ) : undefined

  // ─── Create / Edit Dialog ──────────────────────────────────────────────

  const dialogTitle = dialogMode === 'create' ? 'Create Approval Request' : 'Edit Approval Request'

  const renderDialog = () => (
    <Dialog open={!!dialogMode} onClose={closeDialog} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{dialogTitle}</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField
              fullWidth
              required
              label="Request Title"
              value={formData.pm_requesttitle || ''}
              onChange={(e) => handleFieldChange('pm_requesttitle', e.target.value)}
              error={!!formErrors.pm_requesttitle}
              helperText={formErrors.pm_requesttitle}
            />
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={formData.pm_entitytype ?? '0'}
                label="Entity Type"
                onChange={(e) => handleFieldChange('pm_entitytype', e.target.value)}
              >
                {ENTITY_FILTERS.filter((f) => f.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.pm_prioritylevel ?? '0'}
                label="Priority"
                onChange={(e) => handleFieldChange('pm_prioritylevel', e.target.value)}
              >
                {PRIORITY_FILTERS.filter((f) => f.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Stage</InputLabel>
              <Select
                value={formData.pm_approvalstage ?? '1'}
                label="Stage"
                onChange={(e) => handleFieldChange('pm_approvalstage', e.target.value)}
              >
                {STAGE_FILTERS.filter((f) => f.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              size="small"
              label="Requestor Name"
              value={formData.pm_requestorname || ''}
              onChange={(e) => handleFieldChange('pm_requestorname', e.target.value)}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              size="small"
              label="Approver Name"
              value={formData.pm_approvername || ''}
              onChange={(e) => handleFieldChange('pm_approvername', e.target.value)}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              size="small"
              label="Due Date"
              type="date"
              value={formData.pm_duedate || ''}
              onChange={(e) => handleFieldChange('pm_duedate', e.target.value)}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              size="small"
              label="Decision Notes"
              multiline
              minRows={2}
              value={formData.pm_decisionnotes || ''}
              onChange={(e) => handleFieldChange('pm_decisionnotes', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeDialog} disabled={dialogLoading}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={dialogLoading}>
          {dialogLoading ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )

  // ─── Delete Confirmation Dialog ────────────────────────────────────────

  const renderDeleteDialog = () => (
    <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete &ldquo;{deleteTarget?.pm_requesttitle}&rdquo;?
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDeleteTarget(null)} disabled={actionLoading}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={actionLoading}>
          {actionLoading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Approval Requests"
        subtitle="Manage and review approval requests across entities"
        actionElement={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            New Request
          </Button>
        }
      />

      <ExportButton
        data={filteredRequests}
        columns={approvalExportColumns}
        filename="ApprovalRequests"
      />

      <KpiCardRow items={kpiCards} />

      <Paper sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search requests..."
          extraFilters={extraFilters}
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 2 }}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mx: 2, mt: 2 }}>
            {successMsg}
          </Alert>
        )}

        <TableShell
          loading={loading}
          empty={!loading && filteredRequests.length === 0}
          emptyIcon={<ChecklistIcon sx={{ fontSize: 48, opacity: 0.3 }} />}
          emptyTitle="No approval requests found"
          emptyAction={
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Create Request
            </Button>
          }
        >
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.field}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'text.secondary',
                      py: 1.5,
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                      width: col.width,
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': col.sortable ? { color: 'primary.main' } : {},
                    }}
                    onClick={() => col.sortable && handleSort(col.field)}
                  >
                    <TableSortLabel
                      active={sort.field === col.field}
                      direction={getSortDirection(col.field)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRequests.map((req) => (
                <TableRow
                  key={req.pm_projectapprovalrequestid}
                  hover
                  onClick={() => openDrawer(req)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{req.pm_requesttitle || '\u2014'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STAGE_LABELS[String(req.pm_approvalstage ?? '')] || '\u2014'}
                      color={STAGE_COLORS[String(req.pm_approvalstage ?? '')] || 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{ENTITY_TYPE_LABELS[String(req.pm_entitytype ?? '')] || '\u2014'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={PRIORITY_LABELS[String(req.pm_prioritylevel ?? '')] || '\u2014'}
                      color={PRIORITY_COLORS[String(req.pm_prioritylevel ?? '')] || 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{req.pm_approvername || '\u2014'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{req.pm_requestorname || '\u2014'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatDate(req.pm_duedate)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={DECISION_LABELS[String(req.pm_decisionstatus ?? '')] || '\u2014'}
                      color={DECISION_COLORS[String(req.pm_decisionstatus ?? '')] || 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(req)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredRequests.length > 0 && (
          <>
            <TableFooter
              filteredCount={filteredRequests.length}
              totalCount={requests.length}
              itemLabel="request"
            />
            <TablePagination
              component="div"
              count={filteredRequests.length}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={selectedRequest?.pm_requesttitle || ''}
        tabs={drawerTabs}
        tabValue={tabValue}
        onTabChange={setTabValue}
        headerActions={drawerHeaderActions}
      >
        {drawerContent}
      </DetailDrawer>

      {/* Dialogs */}
      {renderDialog()}
      {renderDeleteDialog()}
    </Box>
  )
}