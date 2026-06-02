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
import type { Pm_projectstatussnapshots } from '../../../generated/models/Pm_projectstatussnapshotsModel'
import { Pm_projectstatussnapshotsService } from '../../../generated'
import type { ProjectStatusSnapshotModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, SearchFilterBar, DetailDrawer, TabPanel, ExportButton, StatusTag } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

const RAG_COLORS: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  notset: '#94a3b8',
}

const getRagColor = (status: number | string | undefined | null): string => {
  const v = Number(status)
  if (v === 1) return RAG_COLORS.green
  if (v === 0) return RAG_COLORS.amber
  if (v === 2) return RAG_COLORS.red
  return RAG_COLORS.notset
}

const getRagLabel = (status: number | string | undefined | null): string => {
  const v = Number(status)
  if (v === 1) return 'Green'
  if (v === 0) return 'Amber'
  if (v === 2) return 'Red'
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
  pm_projectcode: item.pm_projectcode,
  pm_projectname: item.pm_projectname,
  pm_portfolio: item.pm_portfolio,
  pm_portfoliolookupname: item.pm_portfoliolookupname,
  pm_programme: item.pm_programme,
  pm_programmenamename: item.pm_programmenamename,
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
  pm_reportingfiscalperiodname: item.pm_reportingfiscalperiodname,
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

function RagChip({ value, label }: { value?: number | string | null; label?: string }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const v = Number(value)
  const color = v === 1 ? 'success' : v === 0 ? 'warning' : v === 2 ? 'error' : 'default'
  const IconComponent = v === 1 ? CheckCircleIcon : v === 0 ? WarningAmberIcon : v === 2 ? ErrorIcon : ChecklistIcon
  return (
    <StatusTag
      icon={<IconComponent sx={{ fontSize: 14 }} />}
      label={label || (v === 1 ? 'Green' : v === 0 ? 'Amber' : v === 2 ? 'Red' : 'Not Set')}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 700, minWidth: 72 }}
    />
  )
}

type SortField = 'name' | 'period' | 'entity' | 'overallrag' | 'date'
type SortDir = 'asc' | 'desc'
interface SortState { field: SortField; dir: SortDir }

export default function StatusSnapshotsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
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
  const [rowsPerPage, setRowsPerPage] = useState(25)
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
  })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await Pm_projectstatussnapshotsService.getAll({
        select: [
          'pm_projectstatussnapshotid', 'pm_snapshotname', 'pm_entitytype',
          'pm_projectcode', 'pm_projectname', 'pm_portfolio', 'pm_programme',
          'pm_portfoliolookupname', 'pm_programmenamename',
          'pm_actionitems', 'pm_approvalstatus',
          'pm_benefitsragstatus', 'pm_costragstatus', 'pm_overallragstatus',
          'pm_resourceragstatus', 'pm_riskragstatus', 'pm_scheduleragstatus',
          'pm_projecthighlights', 'pm_projectlowlights',
          'pm_reportingperiod', 'pm_reportingfiscalperiodname',
          'pm_submissiondate', 'pm_submittedby', 'statecode',
        ],
        orderBy: ['pm_snapshotname asc'],
        top: 1000,
      })
      const list = unwrapSnapshotList(result).map(mapSnapshot)
      setSnapshots(list)
    } catch {
      setError('Unable to load status snapshots data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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
        color: '#8b5cf6',
      },
      {
        label: 'Green (On Track)',
        value: green.length,
        subtitle: green.length > 0 ? ((green.length / (total || 1)) * 100).toFixed(0) + '% of total' : '0% of total',
        icon: <CheckCircleIcon />,
        color: RAG_COLORS.green,
      },
      {
        label: 'Amber (Watch)',
        value: amber.length,
        subtitle: amber.length > 0 ? ((amber.length / (total || 1)) * 100).toFixed(0) + '% of total' : '0% of total',
        icon: <WarningAmberIcon />,
        color: RAG_COLORS.amber,
      },
      {
        label: 'Red (Critical)',
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
      pm_submissiondate: '',
      pm_submittedby: '',
      pm_projecthighlights: '',
      pm_projectlowlights: '',
      pm_actionitems: '',
    })
    setShowForm(true)
  }, [])

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
      if (editingSnapshot?.pm_projectstatussnapshotid) {
        await Pm_projectstatussnapshotsService.update(editingSnapshot.pm_projectstatussnapshotid, {
          ...formData,
          statecode: 0,
        } as any)
        setSuccessMsg('Status snapshot updated successfully.')
      } else {
        await Pm_projectstatussnapshotsService.create({
          ...formData,
          statecode: 0,
          statuscode: 1,
          ownerid: '00000000-0000-0000-0000-000000000000',
          owneridtype: 'systemuser',
        } as any)
        setSuccessMsg('Status snapshot created successfully.')
      }
      setShowForm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingSnapshot ? 'Unable to update snapshot.' : 'Unable to create snapshot.')
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
      <PageHeader
        title="Status Snapshots"
        subtitle="Track project, programme, and portfolio status across 13-period fiscal years with multi-dimensional RAG ratings."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredSnapshots} columns={exportColumns} filename={'StatusSnapshots_' + new Date().toISOString().slice(0, 10)} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Snapshot
            </Button>
          </Box>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {!loading && <KpiCardRow items={kpiItems} />}

      <Tabs
        value={pageTab}
        onChange={(_, v) => { setPageTab(v); setError(null) }}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 },
          '& .Mui-selected': { color: 'primary.main' },
        }}
      >
        <Tab icon={<AssessmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="RAG Overview" />
        <Tab icon={<ChecklistIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="List View" />
      </Tabs>

      {/* TAB 0: RAG Overview */}
      <TabPanel value={pageTab} index={0} pt={0}>
        {loading ? (
          <TableShell loading={true} empty={false}>
            <Table size="small"><TableHead><TableRow><TableCell /></TableRow></TableHead></Table>
          </TableShell>
        ) : (
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon sx={{ color: '#8b5cf6' }} />
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
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dim.key}>
                  <Card variant="outlined" sx={{
                    borderRadius: 1.15,
                    height: '100%',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      transform: 'translateY(-2px)',
                    },
                  }}>
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {dim.label} RAG
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ flex: 1, height: 12, borderRadius: 1.15, overflow: 'hidden', bgcolor: isDark ? '#1e293b' : '#f1f5f9', display: 'flex' }}>
                          <Box sx={{ width: greenPct + '%', bgcolor: '#22c55e', transition: 'width 0.5s ease' }} />
                          <Box sx={{ width: amberPct + '%', bgcolor: '#f59e0b', transition: 'width 0.5s ease' }} />
                          <Box sx={{ width: redPct + '%', bgcolor: '#ef4444', transition: 'width 0.5s ease' }} />
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <StatusTag icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={dist.green + ' Green'} size="small" sx={{ fontWeight: 600, bgcolor: isDark ? '#052e16' : '#f0fdf4', color: '#22c55e' }} />
                        <StatusTag icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={dist.amber + ' Amber'} size="small" sx={{ fontWeight: 600, bgcolor: isDark ? '#1c1917' : '#fffbeb', color: '#f59e0b' }} />
                        <StatusTag icon={<ErrorIcon sx={{ fontSize: 14 }} />} label={dist.red + ' Red'} size="small" sx={{ fontWeight: 600, bgcolor: isDark ? '#450a0a' : '#fef2f2', color: '#ef4444' }} />
                        {dist.notset > 0 && (
                          <StatusTag label={dist.notset + ' Not Set'} size="small" sx={{ fontWeight: 600 }} />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}

            {/* Fiscal Period Distribution */}
            {snapshots.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon sx={{ color: '#0ea5e9' }} />
                  13-Period Fiscal Year Distribution
                </Typography>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                  <Grid container spacing={1.5}>
                    {FISCAL_PERIOD_OPTIONS.filter((o) => o.value).map((period) => {
                      const count = snapshots.filter((s) => s.pm_reportingperiod === period.value).length
                      const maxCount = Math.max(1, ...FISCAL_PERIOD_OPTIONS.filter(o => o.value).map(p => snapshots.filter((s) => s.pm_reportingperiod === p.value).length))
                      const pct = (count / maxCount) * 100
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={period.value}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 1.15,
                              border: '1px solid',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                              bgcolor: isDark ? '#1a2332' : '#f8fafc',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              '&:hover': { borderColor: '#0ea5e9' },
                            }}
                            onClick={() => { setPeriodFilter(period.value!); setPageTab(1) }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', fontSize: 11 }}>
                              {period.label}
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, fontSize: fontSizes.lg, mt: 0.5 }}>
                              {count}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ mt: 1, borderRadius: 1.15, height: 4, bgcolor: isDark ? '#1e293b' : '#e2e8f0' }}
                            />
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

      {/* TAB 1: List View */}
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
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700 }}>Snapshot</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'entity'} direction={sort.field === 'entity' ? sort.dir : 'asc'} onClick={() => handleSort('entity')} sx={{ fontWeight: 700 }}>Entity</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'period'} direction={sort.field === 'period' ? sort.dir : 'asc'} onClick={() => handleSort('period')} sx={{ fontWeight: 700 }}>Fiscal Period</TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'overallrag'} direction={sort.field === 'overallrag' ? sort.dir : 'asc'} onClick={() => handleSort('overallrag')} sx={{ fontWeight: 700 }}>RAG Status</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>
                    <TableSortLabel active={sort.field === 'date'} direction={sort.field === 'date' ? sort.dir : 'asc'} onClick={() => handleSort('date')} sx={{ fontWeight: 700 }}>Submitted</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>Dimensions</TableCell>
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
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: fontSizes.sm, fontWeight: 700 }}>
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
                      <RagChip value={snapshot.pm_overallragstatus} label={getRagLabel(snapshot.pm_overallragstatus)} />
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
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor(snapshot.pm_costragstatus) }} />
                        </Tooltip>
                        <Tooltip title="Schedule" arrow>
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor(snapshot.pm_scheduleragstatus) }} />
                        </Tooltip>
                        <Tooltip title="Risk" arrow>
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor(snapshot.pm_riskragstatus) }} />
                        </Tooltip>
                        <Tooltip title="Resource" arrow>
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor(snapshot.pm_resourceragstatus) }} />
                        </Tooltip>
                        <Tooltip title="Benefits" arrow>
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getRagColor(snapshot.pm_benefitsragstatus) }} />
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

      {/* Detail Drawer */}
      <DetailDrawer
        open={!!selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        icon={<AssessmentIcon sx={{ color: '#8b5cf6', fontSize: 22 }} />}
        title={selectedSnapshot?.pm_snapshotname ?? ''}
        subtitle={selectedSnapshot && (
          <StatusTag label={selectedSnapshot.pm_entitytype || '\u2014'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" color="error" onClick={() => selectedSnapshot?.pm_projectstatussnapshotid && setDeleteConfirm(selectedSnapshot.pm_projectstatussnapshotid)} sx={{ borderRadius: 1.15 }}>
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton size="small" onClick={() => selectedSnapshot && openEdit(selectedSnapshot)} sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}>
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
      >
        {selectedSnapshot && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* RAG Status Cards */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 16 }} /> RAG Status Ratings
              </Typography>
              <Grid container spacing={1.5}>
                {RAG_DIMENSIONS.map((dim) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={dim.key}>
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 1.15,
                      bgcolor: isDark ? '#1a2332' : '#f8fafc',
                      border: '1px solid',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                        {dim.label}
                      </Typography>
                      <RagChip value={(selectedSnapshot as any)[dim.field]} label={getRagLabel((selectedSnapshot as any)[dim.field])} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Highlights & Lowlights */}
            {(selectedSnapshot.pm_projecthighlights || selectedSnapshot.pm_projectlowlights) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VisibilityIcon sx={{ fontSize: 16 }} /> Highlights & Lowlights
                </Typography>
                <Grid container spacing={2}>
                  {selectedSnapshot.pm_projecthighlights && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Highlights</Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, bgcolor: isDark ? '#052e16' : '#f0fdf4', borderColor: '#22c55e40' }}>
                        <Typography variant="body2">{selectedSnapshot.pm_projecthighlights}</Typography>
                      </Paper>
                    </Grid>
                  )}
                  {selectedSnapshot.pm_projectlowlights && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Lowlights</Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, bgcolor: isDark ? '#450a0a' : '#fef2f2', borderColor: '#ef444440' }}>
                        <Typography variant="body2">{selectedSnapshot.pm_projectlowlights}</Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Details */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AssignmentIcon sx={{ fontSize: 16 }} /> Snapshot Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Project</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedSnapshot.pm_projectcode || '\u2014'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reporting Period</Typography>
                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{selectedSnapshot.pm_reportingperiod || '\u2014'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submitted Date</Typography>
                  <Typography variant="body2">{formatDate(selectedSnapshot.pm_submissiondate)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Submitted By</Typography>
                  <Typography variant="body2">{selectedSnapshot.pm_submittedby || '\u2014'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Approval Status</Typography>
                  <StatusTag label={Number(selectedSnapshot.pm_approvalstatus) === 0 ? 'Approved' : 'Pending'} color={Number(selectedSnapshot.pm_approvalstatus) === 0 ? 'success' : 'warning'} size="small" sx={{ fontWeight: 600 }} />
                </Box>
              </Box>
            </Paper>

            {selectedSnapshot.pm_actionitems && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ReportIcon sx={{ fontSize: 16 }} /> Action Items
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{selectedSnapshot.pm_actionitems}</Typography>
              </Paper>
            )}
          </Box>
        )}
      </DetailDrawer>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onClose={() => !actionLoading && setShowForm(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', borderRadius: 1.15 }}>
            {editingSnapshot ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AssessmentIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingSnapshot ? 'Edit Status Snapshot' : 'Add New Status Snapshot'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingSnapshot ? 'Update RAG status ratings and details for ' + editingSnapshot.pm_snapshotname + '.' : 'Create a new status snapshot with multi-dimensional RAG ratings across the 13-period fiscal year.'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesomeIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Snapshot Name" required fullWidth size="small" value={formData.pm_snapshotname}
                onChange={(e) => setFormData((f) => ({ ...f, pm_snapshotname: e.target.value }))}
                placeholder="e.g., Q1 2026 Status Report" slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Entity Type</InputLabel>
                <Select value={formData.pm_entitytype} label="Entity Type" onChange={(e) => setFormData((f) => ({ ...f, pm_entitytype: e.target.value }))} sx={{ borderRadius: 1.15 }}>
                  {ENTITY_TYPE_OPTIONS.filter((o) => o.value).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Project Code" fullWidth size="small" value={formData.pm_projectcode}
                onChange={(e) => setFormData((f) => ({ ...f, pm_projectcode: e.target.value }))}
                placeholder="e.g., PROJ-001" slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Reporting Period</InputLabel>
                <Select value={formData.pm_reportingperiod} label="Reporting Period" onChange={(e) => setFormData((f) => ({ ...f, pm_reportingperiod: e.target.value }))} sx={{ borderRadius: 1.15 }}>
                  {FISCAL_PERIOD_OPTIONS.filter((o) => o.value).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssessmentIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              RAG Status Ratings
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Overall RAG</InputLabel>
                <Select value={formData.pm_overallragstatus} label="Overall RAG" onChange={(e) => setFormData((f) => ({ ...f, pm_overallragstatus: Number(e.target.value) }))} sx={{ borderRadius: 1.15 }}>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Green</Box></MenuItem>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Amber</Box></MenuItem>
                  <MenuItem value={2}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} /> Red</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cost RAG</InputLabel>
                <Select value={formData.pm_costragstatus} label="Cost RAG" onChange={(e) => setFormData((f) => ({ ...f, pm_costragstatus: Number(e.target.value) }))} sx={{ borderRadius: 1.15 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Green</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Amber</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Schedule RAG</InputLabel>
                <Select value={formData.pm_scheduleragstatus} label="Schedule RAG" onChange={(e) => setFormData((f) => ({ ...f, pm_scheduleragstatus: Number(e.target.value) }))} sx={{ borderRadius: 1.15 }}>
                  <MenuItem value={1}><CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Green</MenuItem>
                  <MenuItem value={0}><WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Amber</MenuItem>
                  <MenuItem value={2}><ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} /> Red</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk RAG</InputLabel>
                <Select value={formData.pm_riskragstatus} label="Risk RAG" onChange={(e) => setFormData((f) => ({ ...f, pm_riskragstatus: Number(e.target.value) }))} sx={{ borderRadius: 1.15 }}>
                  <MenuItem value={1}><CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Green</MenuItem>
                  <MenuItem value={0}><WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Amber</MenuItem>
                  <MenuItem value={2}><ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} /> Red</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource RAG</InputLabel>
                <Select value={formData.pm_resourceragstatus} label="Resource RAG" onChange={(e) => setFormData((f) => ({ ...f, pm_resourceragstatus: Number(e.target.value) }))} sx={{ borderRadius: 1.15 }}>
                  <MenuItem value={0}><CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Green</MenuItem>
                  <MenuItem value={1}><WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Amber</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Benefits RAG</InputLabel>
                <Select value={formData.pm_benefitsragstatus} label="Benefits RAG" onChange={(e) => setFormData((f) => ({ ...f, pm_benefitsragstatus: Number(e.target.value) }))} sx={{ borderRadius: 1.15 }}>
                  <MenuItem value={0}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} /> Green</Box></MenuItem>
                  <MenuItem value={1}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ChecklistIcon sx={{ fontSize: 16, color: '#94a3b8' }} /> Not Set</Box></MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssignmentIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Submission & Notes
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Submitted Date" type="date" fullWidth size="small" value={formData.pm_submissiondate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_submissiondate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Submitted By" fullWidth size="small" value={formData.pm_submittedby}
                onChange={(e) => setFormData((f) => ({ ...f, pm_submittedby: e.target.value }))}
                placeholder="e.g., John Smith" slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Highlights" fullWidth multiline rows={2} size="small" value={formData.pm_projecthighlights}
                onChange={(e) => setFormData((f) => ({ ...f, pm_projecthighlights: e.target.value }))}
                placeholder="Key achievements and positive developments..." slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Lowlights" fullWidth multiline rows={2} size="small" value={formData.pm_projectlowlights}
                onChange={(e) => setFormData((f) => ({ ...f, pm_projectlowlights: e.target.value }))}
                placeholder="Issues, risks, or areas needing attention..." slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Action Items" fullWidth multiline rows={2} size="small" value={formData.pm_actionitems}
                onChange={(e) => setFormData((f) => ({ ...f, pm_actionitems: e.target.value }))}
                placeholder="Follow-up actions required..." slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowForm(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained"
            disabled={!formData.pm_snapshotname.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}>
            {actionLoading ? 'Saving...' : editingSnapshot ? 'Update Snapshot' : 'Create Snapshot'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Snapshot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this status snapshot? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
