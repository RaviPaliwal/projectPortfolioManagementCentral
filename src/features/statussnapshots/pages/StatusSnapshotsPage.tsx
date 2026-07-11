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
  Tabs,
  Tab,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SpeedIcon from '@mui/icons-material/Speed'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PeopleIcon from '@mui/icons-material/People'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ReportIcon from '@mui/icons-material/Report'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ChecklistIcon from '@mui/icons-material/Checklist'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import HubIcon from '@mui/icons-material/Hub'
import type { Pm_projectstatussnapshots } from '../../../generated/models/Pm_projectstatussnapshotsModel'
import { useAuthorization } from '@/hooks/useAuthorization'
import { useUser } from '@/context/UserContext'
import { fetchPortfolioHierarchy } from '@/services'
import type { CrudModule } from '@/constants/permissions'
import { Pm_projectstatussnapshotsService } from '../../../generated'
import type { ProjectStatusSnapshotModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, SearchFilterBar, TabPanel, ExportButton, StatusTag, ActionIcon, Breadcrumbs } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import { SnapshotDialogs } from '../components/SnapshotDialogs'

const RAG_COLORS: Record<string, string> = {
  green: 'success.main',
  amber: 'warning.main',
  red: 'error.main',
  notset: 'text.disabled',
}

const getRagColor = (field: string, status: number | string | undefined | null): string => {
  const v = Number(status)
  const isRev = field === 'pm_costragstatus' || field === 'pm_resourceragstatus'
  if (isRev) {
    if (v === 0) return RAG_COLORS.green
    if (v === 1) return RAG_COLORS.amber
    return RAG_COLORS.notset
  }
  if (field === 'pm_benefitsragstatus') {
    if (v === 0) return RAG_COLORS.green
    return RAG_COLORS.notset
  }
  if (v === 1) return RAG_COLORS.green
  if (v === 0) return RAG_COLORS.amber
  if (v === 2) return RAG_COLORS.red
  return RAG_COLORS.notset
}

const getRagLabel = (field: string, status: number | string | undefined | null): string => {
  const v = Number(status)
  const isRev = field === 'pm_costragstatus' || field === 'pm_resourceragstatus'
  if (isRev) {
    if (v === 0) return 'Low'
    if (v === 1) return 'Medium'
    return 'Not Set'
  }
  if (field === 'pm_benefitsragstatus') {
    if (v === 0) return 'Low'
    return 'Not Set'
  }
  if (v === 1) return 'Low'
  if (v === 0) return 'Medium'
  if (v === 2) return 'High'
  return 'Not Set'
}

const RAG_DIMENSIONS: Array<{ key: string; label: string; field: string }> = [
  { key: 'OVERALL', label: 'Overall', field: 'pm_overallragstatus' },
  { key: 'COST', label: 'Cost', field: 'pm_costragstatus' },
  { key: 'SCHEDULE', label: 'Schedule', field: 'pm_scheduleragstatus' },
  { key: 'RISK', label: 'Risk', field: 'pm_riskragstatus' },
  { key: 'RESOURCE', label: 'Resource', field: 'pm_resourceragstatus' },
  { key: 'BENEFITS', label: 'Benefits', field: 'pm_benefitsragstatus' },
]

const ENTITY_TYPE_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Entity Types' },
  { value: 'Project', label: 'Project' },
  { value: 'Programme', label: 'Programme' },
  { value: 'Portfolio', label: 'Portfolio' },
]

const FISCAL_PERIOD_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Periods' },
  { value: 'Period 1', label: 'Period 1' },
  { value: 'Period 2', label: 'Period 2' },
  { value: 'Period 3', label: 'Period 3' },
  { value: 'Period 4', label: 'Period 4' },
  { value: 'Period 5', label: 'Period 5' },
  { value: 'Period 6', label: 'Period 6' },
  { value: 'Period 7', label: 'Period 7' },
  { value: 'Period 8', label: 'Period 8' },
  { value: 'Period 9', label: 'Period 9' },
  { value: 'Period 10', label: 'Period 10' },
  { value: 'Period 11', label: 'Period 11' },
  { value: 'Period 12', label: 'Period 12' },
  { value: 'Period 13', label: 'Period 13' },
]

const exportColumns: ExportColumn[] = [
  { key: 'pm_snapshotname', label: 'Snapshot Name' },
  { key: 'pm_entitytype', label: 'Entity Type' },
  { key: 'pm_reportingperiod', label: 'Reporting Period' },
  { key: 'pm_overallragstatus', label: 'Overall RAG' },
  { key: 'pm_costragstatus', label: 'Cost RAG' },
  { key: 'pm_scheduleragstatus', label: 'Schedule RAG' },
  { key: 'pm_riskragstatus', label: 'Risk RAG' },
  { key: 'pm_resourceragstatus', label: 'Resource RAG' },
  { key: 'pm_benefitsragstatus', label: 'Benefits RAG' },
  { key: 'pm_submissiondate', label: 'Submitted Date' },
  { key: 'pm_submittedby', label: 'Submitted By' },
]

const unwrapSnapshotList = (result: any): Pm_projectstatussnapshots[] => {
  if (!result) return []
  if ('value' in result) return result.value as Pm_projectstatussnapshots[]
  if ('data' in result) return result.data as Pm_projectstatussnapshots[]
  if (Array.isArray(result)) return result
  return []
}

const mapSnapshot = (item: Pm_projectstatussnapshots): ProjectStatusSnapshotModel => ({
  pm_projectstatussnapshotid: item.pm_projectstatussnapshotid,
  pm_snapshotname: item.pm_snapshotname,
  pm_entitytype: item.pm_entitytype,
  pm_projectcode: (item as any).pm_projectcode,
  pm_projectname: item.pm_projectname,
  _pm_project_value: item._pm_project_value,
  pm_portfolio: (item as any).pm_portfolio,
  pm_portfoliolookupname: item.pm_portfoliolookupname,
  _pm_portfoliolookup_value: item._pm_portfoliolookup_value,
  pm_programme: (item as any).pm_programme,
  pm_programmenamename: item.pm_programmenamename,
  _pm_programmename_value: item._pm_programmename_value,
  pm_actionitems: item.pm_actionitems,
  pm_approvalstatus: item.pm_approvalstatus,
  pm_benefitsragstatus: item.pm_benefitsragstatus,
  pm_costragstatus: item.pm_costragstatus,
  pm_overallragstatus: item.pm_overallragstatus,
  pm_resourceragstatus: item.pm_resourceragstatus,
  pm_riskragstatus: item.pm_riskragstatus,
  pm_scheduleragstatus: item.pm_scheduleragstatus,
  pm_projecthighlights: item.pm_projecthighlights,
  pm_projectlowlights: item.pm_projectlowlights,
  pm_reportingperiod: item.pm_reportingperiod,
  pm_reportingfiscalperiodname: (item as any).pm_reportingfiscalperiodname,
  pm_submissiondate: item.pm_submissiondate,
  pm_submittedby: item.pm_submittedby,
  statecode: item.statecode,
})

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '\u2014'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

function RagChip({ field, value }: { field: string; value?: number | string | null }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const v = Number(value)
  const isRev = field === 'pm_costragstatus' || field === 'pm_resourceragstatus'
  let color: 'success' | 'warning' | 'error' | 'default' = 'default'
  let IconComponent = ChecklistIcon
  let label = 'Not Set'

  if (isRev) {
    if (v === 0) { color = 'success'; IconComponent = CheckCircleIcon; label = 'Low' }
    else if (v === 1) { color = 'warning'; IconComponent = WarningAmberIcon; label = 'Medium' }
  } else if (field === 'pm_benefitsragstatus') {
    if (v === 0) { color = 'success'; IconComponent = CheckCircleIcon; label = 'Low' }
  } else {
    if (v === 1) { color = 'success'; IconComponent = CheckCircleIcon; label = 'Low' }
    else if (v === 0) { color = 'warning'; IconComponent = WarningAmberIcon; label = 'Medium' }
    else if (v === 2) { color = 'error'; IconComponent = ErrorIcon; label = 'High' }
  }

  return (
    <StatusTag
      icon={<IconComponent sx={{ fontSize: 14 }} />}
      label={label}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 700, minWidth: 72 }}
    />
  )
}

const getRagStatusConfig = (field: string, value: any, theme: any) => {
  const v = Number(value)
  const isRev = field === 'pm_costragstatus' || field === 'pm_resourceragstatus'
  
  let type: 'success' | 'warning' | 'error' | 'default' = 'default'
  let label = 'Not Set'
  
  if (isRev) {
    if (v === 0) { type = 'success'; label = 'Low' }
    else if (v === 1) { type = 'warning'; label = 'Medium' }
  } else if (field === 'pm_benefitsragstatus') {
    if (v === 0) { type = 'success'; label = 'Low' }
  } else {
    if (v === 1) { type = 'success'; label = 'Low' }
    else if (v === 0) { type = 'warning'; label = 'Medium' }
    else if (v === 2) { type = 'error'; label = 'High' }
  }

  const isDark = theme.palette.mode === 'dark'
  let colorCode = theme.palette.text.secondary
  let bg = isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'
  let border = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'

  if (type === 'success') {
    colorCode = theme.palette.success.main
    bg = isDark ? 'rgba(46, 125, 50, 0.06)' : 'rgba(46, 125, 50, 0.04)'
    border = theme.palette.success.main
  } else if (type === 'warning') {
    colorCode = theme.palette.warning.main
    bg = isDark ? 'rgba(237, 108, 2, 0.06)' : 'rgba(237, 108, 2, 0.04)'
    border = theme.palette.warning.main
  } else if (type === 'error') {
    colorCode = theme.palette.error.main
    bg = isDark ? 'rgba(211, 47, 47, 0.06)' : 'rgba(211, 47, 47, 0.04)'
    border = theme.palette.error.main
  }

  let IconComponent = ChecklistIcon
  if (field === 'pm_overallragstatus') IconComponent = SpeedIcon
  else if (field === 'pm_costragstatus') IconComponent = AttachMoneyIcon
  else if (field === 'pm_scheduleragstatus') IconComponent = ScheduleIcon
  else if (field === 'pm_riskragstatus') IconComponent = WarningAmberIcon
  else if (field === 'pm_resourceragstatus') IconComponent = PeopleIcon
  else if (field === 'pm_benefitsragstatus') IconComponent = EmojiEventsIcon

  return { type, label, colorCode, bg, border, IconComponent }
}

type SortField = 'name' | 'period' | 'entity' | 'overallrag' | 'date'
type SortDir = 'asc' | 'desc'
interface SortState { field: SortField; dir: SortDir }

export default function StatusSnapshotsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('STATUS_SNAPSHOTS', 'create')
  const { allowed: canEdit } = useAuthorization('STATUS_SNAPSHOTS', 'update')
  const { allowed: canDelete } = useAuthorization('STATUS_SNAPSHOTS', 'delete')
  const { currentUser } = useUser()

  const [activeHierarchy, setActiveHierarchy] = useState<{
    portfolios: any[]
    programmes: any[]
    projects: any[]
  }>({ portfolios: [], programmes: [], projects: [] })

  const [snapshots, setSnapshots] = useState<ProjectStatusSnapshotModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pageTab, setPageTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [ragFilter, setRagFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedSnapshot, setSelectedSnapshot] = useState<ProjectStatusSnapshotModel | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSnapshot, setEditingSnapshot] = useState<ProjectStatusSnapshotModel | null>(null)
  const [formData, setFormData] = useState({
    pm_snapshotname: '',
    pm_entitytype: 'Project',
    pm_projectcode: '',
    pm_reportingperiod: '',
    pm_overallragstatus: 1,
    pm_costragstatus: 0,
    pm_scheduleragstatus: 1,
    pm_riskragstatus: 1,
    pm_resourceragstatus: 0,
    pm_benefitsragstatus: 0,
    pm_submissiondate: '',
    pm_submittedby: '',
    pm_projecthighlights: '',
    pm_projectlowlights: '',
    pm_actionitems: '',
    selectedEntityId: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await Pm_projectstatussnapshotsService.getAll({
        select: [
          'pm_projectstatussnapshotid', 'pm_snapshotname', 'pm_entitytype',
          'pm_projectcode', 'pm_portfolio', 'pm_programme',
          '_pm_project_value', '_pm_portfoliolookup_value', '_pm_programmename_value',
          'pm_actionitems', 'pm_approvalstatus',
          'pm_benefitsragstatus', 'pm_costragstatus', 'pm_overallragstatus',
          'pm_resourceragstatus', 'pm_riskragstatus', 'pm_scheduleragstatus',
          'pm_projecthighlights', 'pm_projectlowlights',
          'pm_reportingperiod', 'pm_submissiondate', 'pm_submittedby',
          'statecode',
        ],
        orderBy: ['createdon desc'],
        top: 1000,
      })
      if (!result.success) {
        console.error('[StatusSnapshotsPage] loadData failed:', result.error)
        setError('Unable to load status snapshots data.')
        setSnapshots([])
        return
      }
      const list = unwrapSnapshotList(result).map(mapSnapshot)
      setSnapshots(list)
    } catch (err: any) {
      console.error('[StatusSnapshotsPage] loadData exception:', err)
      setError('Unable to load status snapshots data.')
      setSnapshots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    fetchPortfolioHierarchy()
      .then((h) => {
        if (h) {
          setActiveHierarchy({
            portfolios: h.portfolios || [],
            programmes: h.programmes || [],
            projects: h.projects || [],
          })
        }
      })
      .catch((err) => console.error('Failed to load portfolio hierarchy for status snapshots:', err))
  }, [])

  const getProjectName = (id?: string) => {
    if (!id) return '\u2014'
    const found = activeHierarchy.projects.find(p => p.pm_projectid === id)
    return found ? found.pm_projectname : id
  }

  const getProgrammeName = (id?: string) => {
    if (!id) return '\u2014'
    const found = activeHierarchy.programmes.find(p => p.pm_programmeid === id)
    return found ? found.pm_programmename : id
  }

  const getPortfolioName = (id?: string) => {
    if (!id) return '\u2014'
    const found = activeHierarchy.portfolios.find(p => p.pm_portfolioid === id)
    return found ? found.pm_portfolioname : id
  }

  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = snapshots.length
    const green = snapshots.filter((s) => Number(s.pm_overallragstatus) === 1)
    const amber = snapshots.filter((s) => Number(s.pm_overallragstatus) === 0)
    const red = snapshots.filter((s) => Number(s.pm_overallragstatus) === 2)
    const byProject = snapshots.filter((s) => (s.pm_entitytype || '').toLowerCase() === 'project')
    return [
      {
        label: 'Total Snapshots',
        value: total,
        subtitle: 'In the system',
        icon: <AssessmentIcon />,
        color: 'primary.main',
      },
      {
        label: 'Low (On Track)',
        value: green.length,
        subtitle: green.length > 0 ? ((green.length / (total || 1)) * 100).toFixed(0) + '% of total' : '0% of total',
        icon: <CheckCircleIcon />,
        color: RAG_COLORS.green,
      },
      {
        label: 'Medium (Watch)',
        value: amber.length,
        subtitle: amber.length > 0 ? ((amber.length / (total || 1)) * 100).toFixed(0) + '% of total' : '0% of total',
        icon: <WarningAmberIcon />,
        color: RAG_COLORS.amber,
      },
      {
        label: 'High (Critical)',
        value: red.length,
        subtitle: red.length > 0 ? ((red.length / (total || 1)) * 100).toFixed(0) + '% of total' : '0% of total',
        icon: <ErrorIcon />,
        color: RAG_COLORS.red,
      },
    ]
  }, [snapshots])

  const filteredSnapshots = useMemo(() => {
    let list = [...snapshots]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((s) =>
        s.pm_snapshotname?.toLowerCase().includes(q) ||
        s.pm_projectcode?.toLowerCase().includes(q) ||
        s.pm_reportingperiod?.toLowerCase().includes(q) ||
        s.pm_submittedby?.toLowerCase().includes(q)
      )
    }
    if (entityFilter) {
      list = list.filter((s) => (s.pm_entitytype || '').toLowerCase() === entityFilter.toLowerCase())
    }
    if (periodFilter) {
      list = list.filter((s) => (s.pm_reportingperiod || '').toLowerCase() === periodFilter.toLowerCase())
    }
    if (ragFilter) {
      list = list.filter((s) => Number(s.pm_overallragstatus) === Number(ragFilter))
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name': cmp = (a.pm_snapshotname ?? '').localeCompare(b.pm_snapshotname ?? ''); break
        case 'period': cmp = (a.pm_reportingperiod ?? '').localeCompare(b.pm_reportingperiod ?? ''); break
        case 'entity': cmp = (a.pm_entitytype ?? '').localeCompare(b.pm_entitytype ?? ''); break
        case 'overallrag': cmp = Number(a.pm_overallragstatus) - Number(b.pm_overallragstatus); break
        case 'date': cmp = (a.pm_submissiondate ?? '').localeCompare(b.pm_submissiondate ?? ''); break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [snapshots, searchQuery, entityFilter, periodFilter, ragFilter, sort])

  const paginatedSnapshots = useMemo(
    () => filteredSnapshots.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredSnapshots, page, rowsPerPage]
  )

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const openCreate = useCallback(() => {
    setEditingSnapshot(null)
    setFormData({
      pm_snapshotname: '',
      pm_entitytype: 'Project',
      pm_projectcode: '',
      pm_reportingperiod: '',
      pm_overallragstatus: 1,
      pm_costragstatus: 0,
      pm_scheduleragstatus: 1,
      pm_riskragstatus: 1,
      pm_resourceragstatus: 0,
      pm_benefitsragstatus: 0,
      pm_submissiondate: new Date().toISOString().slice(0, 10),
      pm_submittedby: currentUser?.fullname ?? '',
      pm_projecthighlights: '',
      pm_projectlowlights: '',
      pm_actionitems: '',
      selectedEntityId: '',
    })
    setShowForm(true)
  }, [currentUser])

  const openEdit = useCallback((snapshot: ProjectStatusSnapshotModel) => {
    setEditingSnapshot(snapshot)
    setFormData({
      pm_snapshotname: snapshot.pm_snapshotname ?? '',
      pm_entitytype: snapshot.pm_entitytype || 'Project',
      pm_projectcode: snapshot.pm_projectcode ?? '',
      pm_reportingperiod: snapshot.pm_reportingperiod ?? '',
      pm_overallragstatus: Number(snapshot.pm_overallragstatus ?? 1),
      pm_costragstatus: Number(snapshot.pm_costragstatus ?? 0),
      pm_scheduleragstatus: Number(snapshot.pm_scheduleragstatus ?? 1),
      pm_riskragstatus: Number(snapshot.pm_riskragstatus ?? 1),
      pm_resourceragstatus: Number(snapshot.pm_resourceragstatus ?? 0),
      pm_benefitsragstatus: Number(snapshot.pm_benefitsragstatus ?? 0),
      pm_submissiondate: snapshot.pm_submissiondate ?? '',
      pm_submittedby: snapshot.pm_submittedby ?? '',
      pm_projecthighlights: snapshot.pm_projecthighlights ?? '',
      pm_projectlowlights: snapshot.pm_projectlowlights ?? '',
      pm_actionitems: snapshot.pm_actionitems ?? '',
      selectedEntityId: '',
    })
    setShowForm(true)
  }, [])

  const handleSave = async () => {
    if (!formData.pm_snapshotname.trim()) {
      setError('Snapshot name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const { selectedEntityId, ...submitData } = formData
      const payload: any = {
        ...submitData,
        statecode: 0,
        'ownerid@odata.bind': currentUser?.systemuserid ? `/systemusers(${currentUser.systemuserid})` : undefined,
      }

      if (editingSnapshot?.pm_projectstatussnapshotid) {
        const result = await Pm_projectstatussnapshotsService.update(editingSnapshot.pm_projectstatussnapshotid, payload)
        if (!result.success) {
          throw new Error(result.error?.message || 'Update failed')
        }
        setSuccessMsg('Status snapshot updated successfully.')
      } else {
        payload.statuscode = 1
        if (selectedEntityId) {
          const cleanEntityId = selectedEntityId.replace(/[{}]/g, '').trim().toLowerCase()
          if (formData.pm_entitytype === 'Project') {
            payload['pm_project@odata.bind'] = `/pm_projects(${cleanEntityId})`
          } else if (formData.pm_entitytype === 'Programme') {
            payload['pm_programmeName@odata.bind'] = `/pm_programmes(${cleanEntityId})`
          } else if (formData.pm_entitytype === 'Portfolio') {
            payload['pm_portfolioLookup@odata.bind'] = `/pm_portfolios(${cleanEntityId})`
          }
        }
        const result = await Pm_projectstatussnapshotsService.create(payload)
        if (!result.success) {
          throw new Error(result.error?.message || 'Create failed')
        }
        setSuccessMsg('Status snapshot created successfully.')
      }
      setShowForm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch (err: any) {
      const detail = err?.message || err?.error?.message || err?.statusText || ''
      console.error('[StatusSnapshotsPage] handleSave failed:', err)
      setError((editingSnapshot ? 'Unable to update snapshot.' : 'Unable to create snapshot.') + (detail ? ' ' + detail : ''))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await Pm_projectstatussnapshotsService.delete(deleteConfirm)
      setSuccessMsg('Snapshot removed successfully.')
      setDeleteConfirm(null)
      if (selectedSnapshot?.pm_projectstatussnapshotid === deleteConfirm) {
        setSelectedSnapshot(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete snapshot.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── RAG Distribution Data ──
  const ragDistribution = useMemo(() => {
    const counts: Record<string, { green: number; amber: number; red: number; notset: number }> = {}
    RAG_DIMENSIONS.forEach((dim) => {
      counts[dim.key] = { green: 0, amber: 0, red: 0, notset: 0 }
    })
    snapshots.forEach((s) => {
      RAG_DIMENSIONS.forEach((dim) => {
        const v = Number((s as any)[dim.field])
        if (v === 1) counts[dim.key].green++
        else if (v === 0) counts[dim.key].amber++
        else if (v === 2) counts[dim.key].red++
        else counts[dim.key].notset++
      })
    })
    return counts
  }, [snapshots])

  return (
    <Box>
      {selectedSnapshot ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, mb: 3 }}>
          <Breadcrumbs
            items={[
              { label: 'Snapshots', path: 'list' },
              { label: selectedSnapshot.pm_snapshotname ?? 'Detail' }
            ]}
            onNavigate={() => setSelectedSnapshot(null)}
          />
          <PageHeader
            title={selectedSnapshot?.pm_snapshotname ?? 'Snapshot Detail'}
            subtitle={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                <StatusTag label={selectedSnapshot.pm_entitytype || '\u2014'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
              </Box>
            }
            actionElement={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {canEdit && (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => selectedSnapshot && openEdit(selectedSnapshot)} sx={{ borderRadius: 1.5 }}>
                    Edit Snapshot
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => selectedSnapshot?.pm_projectstatussnapshotid && setDeleteConfirm(selectedSnapshot.pm_projectstatussnapshotid)} sx={{ borderRadius: 1.5 }}>
                    Delete Snapshot
                  </Button>
                )}
              </Box>
            }
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* RAG Status Cards */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                {/* RAG Status Ratings */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2.5, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    <AutoAwesomeIcon sx={{ fontSize: 16 }} /> RAG Status Ratings
                  </Typography>
                  <Grid container spacing={2}>
                    {/* Overall Health Card (Prominent left block) */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      {(() => {
                        const config = getRagStatusConfig('pm_overallragstatus', selectedSnapshot.pm_overallragstatus, theme)
                        const Icon = config.IconComponent
                        return (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 3,
                              borderRadius: 1.5,
                              height: '100%',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: config.bg,
                              border: '1.5px solid',
                              borderColor: config.border,
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: theme.shadows[2],
                              }
                            }}
                          >
                            <Avatar sx={{ width: 48, height: 48, bgcolor: 'background.paper', color: config.colorCode, border: '2px solid', borderColor: config.border, mb: 2 }}>
                              <Icon sx={{ fontSize: 24 }} />
                            </Avatar>
                            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                              Overall Health
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 850, color: config.colorCode }}>
                              {config.label}
                            </Typography>
                          </Paper>
                        )
                      })()}
                    </Grid>

                    {/* Other 5 Dimensions (Right side grid) */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Grid container spacing={2}>
                        {RAG_DIMENSIONS.filter(d => d.key !== 'OVERALL').map((dim) => {
                          const config = getRagStatusConfig(dim.field, (selectedSnapshot as any)[dim.field], theme)
                          const Icon = config.IconComponent
                          return (
                            <Grid size={{ xs: 12, sm: 6 }} key={dim.key}>
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  borderRadius: 1.5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  bgcolor: config.bg,
                                  borderLeft: '4px solid',
                                  borderLeftColor: config.border,
                                  transition: 'transform 0.2s, box-shadow 0.2s',
                                  '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: theme.shadows[1],
                                  }
                                }}
                              >
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'background.paper', color: config.colorCode, border: '1px solid', borderColor: 'divider' }}>
                                  <Icon sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {dim.label}
                                  </Typography>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 850, color: config.colorCode, fontSize: '0.9rem' }}>
                                    {config.label}
                                  </Typography>
                                </Box>
                              </Paper>
                            </Grid>
                          )
                        })}
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>

                {/* Highlights & Lowlights */}
                {(selectedSnapshot.pm_projecthighlights || selectedSnapshot.pm_projectlowlights) && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                        <VisibilityIcon sx={{ fontSize: 16 }} /> Highlights & Lowlights
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedSnapshot.pm_projecthighlights && (
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Highlights</Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? '#052e16' : '#f0fdf4', borderColor: 'success.main' }}>
                              <Typography variant="body2">{selectedSnapshot.pm_projecthighlights}</Typography>
                            </Paper>
                          </Grid>
                        )}
                        {selectedSnapshot.pm_projectlowlights && (
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Lowlights</Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? '#450a0a' : '#fef2f2', borderColor: 'error.main' }}>
                              <Typography variant="body2">{selectedSnapshot.pm_projectlowlights}</Typography>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </>
                )}

                <Divider />

                {/* Snapshot Details */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    <AssignmentIcon sx={{ fontSize: 16 }} /> Snapshot Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Entity Type</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSnapshot.pm_entitytype || '\u2014'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Project Code</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSnapshot.pm_projectcode || '\u2014'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reporting Period</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{selectedSnapshot.pm_reportingperiod || '\u2014'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submitted Date</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedSnapshot.pm_submissiondate)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submitted By</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSnapshot.pm_submittedby || '\u2014'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Approval Status</Typography>
                      <StatusTag label={Number(selectedSnapshot.pm_approvalstatus) === 0 ? 'Approved' : 'Pending'} color={Number(selectedSnapshot.pm_approvalstatus) === 0 ? 'success' : 'warning'} size="small" sx={{ fontWeight: 600 }} />
                    </Box>
                    {selectedSnapshot._pm_project_value && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Project</Typography>
                        <Tooltip title={`ID: ${selectedSnapshot._pm_project_value}`} arrow>
                          <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'help' }}>
                            {getProjectName(selectedSnapshot._pm_project_value)}
                          </Typography>
                        </Tooltip>
                      </Box>
                    )}
                    {selectedSnapshot._pm_portfoliolookup_value && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Portfolio</Typography>
                        <Tooltip title={`ID: ${selectedSnapshot._pm_portfoliolookup_value}`} arrow>
                          <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'help' }}>
                            {getPortfolioName(selectedSnapshot._pm_portfoliolookup_value)}
                          </Typography>
                        </Tooltip>
                      </Box>
                    )}
                    {selectedSnapshot._pm_programmename_value && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Programme</Typography>
                        <Tooltip title={`ID: ${selectedSnapshot._pm_programmename_value}`} arrow>
                          <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'help' }}>
                            {getProgrammeName(selectedSnapshot._pm_programmename_value)}
                          </Typography>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Box>

                {selectedSnapshot.pm_actionitems && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                        <ReportIcon sx={{ fontSize: 16 }} /> Action Items
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedSnapshot.pm_actionitems}</Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      ) : (
        <>
          <PageHeader
            title="Status Snapshots"
            subtitle="Track health, highlights, and lowlights across all your projects in discrete reporting periods."
            actionElement={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ExportButton data={snapshots} columns={exportColumns} filename="status_snapshots" />
                {canCreate && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Create Snapshot
                  </Button>
                )}
              </Box>
            }
          />
          <KpiCardRow items={kpiItems} loading={loading} />
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={pageTab} onChange={(e, v) => setPageTab(v)} sx={{ minHeight: 48 }}>
              <Tab icon={<HubIcon />} iconPosition="start" label="Dashboard" sx={{ minHeight: 48, fontWeight: 600 }} />
              <Tab icon={<AssignmentIcon />} iconPosition="start" label="All Snapshots" sx={{ minHeight: 48, fontWeight: 600 }} />
            </Tabs>
          </Box>

          <TabPanel value={pageTab} index={0} pt={0}>
            {loading ? (
              <TableShell loading={true} empty={false}>
                <Table size="small"><TableHead><TableRow><TableCell /></TableRow></TableHead></Table>
              </TableShell>
            ) : (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentIcon sx={{ color: 'primary.main' }} />
                    Multi-Dimensional RAG Status Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Overview of RAG status distribution across {snapshots.length} snapshot(s) for each performance dimension.
                  </Typography>
                </Grid>

                {RAG_DIMENSIONS.map((dim) => {
                  const dist = ragDistribution[dim.key]
                  const total = dist.green + dist.amber + dist.red + dist.notset
                  const greenPct = total > 0 ? (dist.green / total) * 100 : 0
                  const amberPct = total > 0 ? (dist.amber / total) * 100 : 0
                  const redPct = total > 0 ? (dist.red / total) * 100 : 0

                  let DimensionIcon = ChecklistIcon
                  let accentColor = 'primary.main'
                  if (dim.key === 'OVERALL') { DimensionIcon = SpeedIcon; accentColor = 'primary.main' }
                  else if (dim.key === 'COST') { DimensionIcon = AttachMoneyIcon; accentColor = 'success.main' }
                  else if (dim.key === 'SCHEDULE') { DimensionIcon = ScheduleIcon; accentColor = 'info.main' }
                  else if (dim.key === 'RISK') { DimensionIcon = WarningAmberIcon; accentColor = 'error.main' }
                  else if (dim.key === 'RESOURCE') { DimensionIcon = PeopleIcon; accentColor = 'warning.main' }
                  else if (dim.key === 'BENEFITS') { DimensionIcon = EmojiEventsIcon; accentColor = 'secondary.main' }

                  let dominantLabel = 'Not Set'
                  let dominantColor = 'text.secondary'
                  if (total > 0) {
                    const maxVal = Math.max(dist.green, dist.amber, dist.red)
                    if (maxVal === dist.green) { dominantLabel = 'Mostly Low / Green'; dominantColor = 'success.main' }
                    else if (maxVal === dist.amber) { dominantLabel = 'Mostly Medium / Amber'; dominantColor = 'warning.main' }
                    else if (maxVal === dist.red) { dominantLabel = 'Mostly High / Red'; dominantColor = 'error.main' }
                  }

                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dim.key}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          height: '100%',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.45)' : '0 12px 28px rgba(0,0,0,0.08)',
                            transform: 'translateY(-3px)',
                            borderColor: accentColor,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                                  color: accentColor,
                                  border: '1px solid',
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                }}
                              >
                                <DimensionIcon sx={{ fontSize: 18 }} />
                              </Avatar>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}>
                                {dim.label} RAG
                              </Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: dominantColor, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {dominantLabel}
                            </Typography>
                          </Box>

                          <Box sx={{ mb: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Distribution</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {total} Snapshot{total !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                            <Box sx={{ width: '100%', height: 10, borderRadius: 2, overflow: 'hidden', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', display: 'flex', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
                              <Tooltip title={`Green/Low: ${greenPct.toFixed(0)}%`} arrow>
                                <Box sx={{ width: greenPct + '%', bgcolor: 'success.main', transition: 'width 0.5s ease', cursor: 'help' }} />
                              </Tooltip>
                              <Tooltip title={`Amber/Medium: ${amberPct.toFixed(0)}%`} arrow>
                                <Box sx={{ width: amberPct + '%', bgcolor: 'warning.main', transition: 'width 0.5s ease', cursor: 'help' }} />
                              </Tooltip>
                              <Tooltip title={`Red/High: ${redPct.toFixed(0)}%`} arrow>
                                <Box sx={{ width: redPct + '%', bgcolor: 'error.main', transition: 'width 0.5s ease', cursor: 'help' }} />
                              </Tooltip>
                            </Box>
                          </Box>

                          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                            <StatusTag icon={<CheckCircleIcon sx={{ fontSize: 13 }} />} label={`${dist.green} Green`} size="small" sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(46, 125, 50, 0.15)' : 'rgba(46, 125, 50, 0.05)', color: 'success.main' }} />
                            <StatusTag icon={<WarningAmberIcon sx={{ fontSize: 13 }} />} label={`${dist.amber} Amber`} size="small" sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(237, 108, 2, 0.15)' : 'rgba(237, 108, 2, 0.05)', color: 'warning.main' }} />
                            <StatusTag icon={<ErrorIcon sx={{ fontSize: 13 }} />} label={`${dist.red} Red`} size="small" sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.05)', color: 'error.main' }} />
                            {dist.notset > 0 && (
                              <StatusTag label={`${dist.notset} Not Set`} size="small" sx={{ fontWeight: 700 }} />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}

                {snapshots.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.85rem', color: 'text.secondary' }}>
                      <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                      13-Period Fiscal Year Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : '#fafafa' }}>
                      <Grid container spacing={2}>
                        {FISCAL_PERIOD_OPTIONS.filter((o) => o.value).map((period) => {
                          const periodSnapshots = snapshots.filter((s) => s.pm_reportingperiod === period.value)
                          const count = periodSnapshots.length
                          const green = periodSnapshots.filter(s => Number(s.pm_overallragstatus) === 1).length
                          const amber = periodSnapshots.filter(s => Number(s.pm_overallragstatus) === 0).length
                          const red = periodSnapshots.filter(s => Number(s.pm_overallragstatus) === 2).length
                          const hasData = count > 0
                          
                          return (
                            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={period.value}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 1.5,
                                  border: '1.5px solid',
                                  borderColor: hasData
                                    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 0, 0, 0.08)')
                                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0, 0, 0, 0.04)'),
                                  bgcolor: hasData
                                    ? (isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff')
                                    : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  opacity: hasData ? 1 : 0.65,
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 8px 24px rgba(0,0,0,0.06)',
                                    transform: 'translateY(-2px)',
                                    opacity: 1,
                                  },
                                }}
                                onClick={() => { setPeriodFilter(period.value!); setPageTab(1) }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 850, color: 'text.secondary', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {period.label}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 1.5 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 900, fontSize: '1.3rem', lineHeight: 1, fontFamily: '"JetBrains Mono", monospace' }}>
                                    {count} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>reports</Typography>
                                  </Typography>
                                  {hasData && (
                                    <Box sx={{ display: 'flex', gap: 0.8, mb: 0.25 }}>
                                      {green > 0 && (
                                        <Tooltip title={`${green} Green`} arrow>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                                          </Box>
                                        </Tooltip>
                                      )}
                                      {amber > 0 && (
                                        <Tooltip title={`${amber} Amber`} arrow>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
                                          </Box>
                                        </Tooltip>
                                      )}
                                      {red > 0 && (
                                        <Tooltip title={`${red} Red`} arrow>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                                          </Box>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                                
                                {hasData ? (
                                  <Box sx={{ display: 'flex', width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', mt: 2 }}>
                                    {green > 0 && <Box sx={{ width: `${(green / count) * 100}%`, bgcolor: 'success.main' }} />}
                                    {amber > 0 && <Box sx={{ width: `${(amber / count) * 100}%`, bgcolor: 'warning.main' }} />}
                                    {red > 0 && <Box sx={{ width: `${(red / count) * 100}%`, bgcolor: 'error.main' }} />}
                                  </Box>
                                ) : (
                                  <Box sx={{ width: '100%', height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#e2e8f0', mt: 2 }} />
                                )}
                              </Box>
                            </Grid>
                          )
                        })}
                      </Grid>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={pageTab} index={1} pt={0}>
            <Paper sx={{ overflow: 'hidden', mb: 3 }}>
              <SearchFilterBar
                searchQuery={searchQuery}
                onSearchChange={(v) => { setSearchQuery(v); setPage(0) }}
                searchPlaceholder="Search by name, project, period..."
                filterValue={entityFilter}
                onFilterChange={(v) => { setEntityFilter(v); setPage(0) }}
                filterLabel="Entity Type"
                filterOptions={ENTITY_TYPE_OPTIONS}
                secondaryFilterValue={periodFilter}
                onSecondaryFilterChange={(v) => { setPeriodFilter(v); setPage(0) }}
                secondaryFilterLabel="Fiscal Period"
                secondaryFilterOptions={FISCAL_PERIOD_OPTIONS}
                onClear={() => { setSearchQuery(''); setEntityFilter(''); setPeriodFilter(''); setRagFilter(''); setPage(0) }}
              />
              <TableShell
                loading={loading}
                empty={filteredSnapshots.length === 0}
                emptyIcon={<AssessmentIcon />}
                emptyTitle={searchQuery || entityFilter || periodFilter ? 'No snapshots match your criteria.' : 'No status snapshots yet.'}
                emptyAction={!searchQuery && !entityFilter && !periodFilter ? (
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
                    Add your first snapshot
                  </Button>
                ) : undefined}
              >
                <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                        <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700 }}>Snapshot</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                        <TableSortLabel active={sort.field === 'entity'} direction={sort.field === 'entity' ? sort.dir : 'asc'} onClick={() => handleSort('entity')} sx={{ fontWeight: 700 }}>Entity</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                        <TableSortLabel active={sort.field === 'period'} direction={sort.field === 'period' ? sort.dir : 'asc'} onClick={() => handleSort('period')} sx={{ fontWeight: 700 }}>Fiscal Period</TableSortLabel>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                        <TableSortLabel active={sort.field === 'overallrag'} direction={sort.field === 'overallrag' ? sort.dir : 'asc'} onClick={() => handleSort('overallrag')} sx={{ fontWeight: 700 }}>RAG Status</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                        <TableSortLabel active={sort.field === 'date'} direction={sort.field === 'date' ? sort.dir : 'asc'} onClick={() => handleSort('date')} sx={{ fontWeight: 700 }}>Submitted</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>Dimensions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSnapshots.map((snapshot, idx) => (
                      <TableRow
                        key={snapshot.pm_projectstatussnapshotid}
                        hover
                        onClick={() => setSelectedSnapshot(snapshot)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                          '&:hover': { bgcolor: 'action.selected' },
                          transition: 'background-color 0.15s ease',
                          '& td': { px: 2.5, py: 1.25 },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                              <AssessmentIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {snapshot.pm_snapshotname || 'Unnamed'}
                              </Typography>
                              {snapshot.pm_projectcode && (
                                <Typography variant="caption" color="text.secondary">
                                  {snapshot.pm_projectcode}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <StatusTag label={snapshot.pm_entitytype || '\u2014'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                            {snapshot.pm_reportingperiod || '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <RagChip field="pm_overallragstatus" value={snapshot.pm_overallragstatus} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: fontSizes.sm }}>
                            {formatDate(snapshot.pm_submissiondate)}
                          </Typography>
                          {snapshot.pm_submittedby && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {snapshot.pm_submittedby}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Cost" arrow>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor('pm_costragstatus', snapshot.pm_costragstatus) }} />
                            </Tooltip>
                            <Tooltip title="Schedule" arrow>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor('pm_scheduleragstatus', snapshot.pm_scheduleragstatus) }} />
                            </Tooltip>
                            <Tooltip title="Risk" arrow>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor('pm_riskragstatus', snapshot.pm_riskragstatus) }} />
                            </Tooltip>
                            <Tooltip title="Resource" arrow>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor('pm_resourceragstatus', snapshot.pm_resourceragstatus) }} />
                            </Tooltip>
                            <Tooltip title="Benefits" arrow>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor('pm_benefitsragstatus', snapshot.pm_benefitsragstatus) }} />
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableShell>
            </Paper>
          </TabPanel>
        </>
      )}

      <SnapshotDialogs
        showForm={showForm}
        onCloseForm={() => setShowForm(false)}
        editingSnapshot={editingSnapshot}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        actionLoading={actionLoading}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        handleDelete={handleDelete}
        entityTypeOptions={ENTITY_TYPE_OPTIONS}
        fiscalPeriodOptions={FISCAL_PERIOD_OPTIONS}
        activePortfolios={activeHierarchy.portfolios}
        activeProgrammes={activeHierarchy.programmes}
        activeProjects={activeHierarchy.projects}
      />
    </Box>
  )
}
