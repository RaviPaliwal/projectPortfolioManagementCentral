import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Skeleton,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  TablePagination,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import ScheduleIcon from '@mui/icons-material/Schedule'
import LinkIcon from '@mui/icons-material/Link'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import {
  fetchProjectsFull,
  fetchScheduleData,
  createScheduleTask,
  updateScheduleTask,
  deleteScheduleTask,
  createProjectMilestone,
} from '@/lib/dataverseClient'
import { PageHeader, KpiCardRow, TableShell, TableFooter, DetailDrawer, SearchFilterBar, TabPanel } from '@/components/common'
import { fontSizes } from '@/styles'
import type { KpiCardItem, FilterOption } from '@/components/common'
import type { ProjectModel, ProjectTaskModel, ProjectMilestoneModel } from '@/types/dataverse'

const STATUS_LABELS: Record<string, string> = {
  '0': 'Complete',
  '1': 'In Progress',
}
const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  '0': 'success',
  '1': 'warning',
}

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  '0': 'At Risk',
  '1': 'Not Started',
  '2': 'Achieved',
}
const MILESTONE_STATUS_COLORS: Record<string, 'error' | 'default' | 'success'> = {
  '0': 'error',
  '1': 'default',
  '2': 'success',
}

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

const defaultTaskForm = {
  pm_taskname: '',
  pm_taskdescription: '',
  pm_tasklevel: 1,
  pm_wbsnumber: '',
  pm_durationdays: 5,
  pm_lagdays: 0,
  pm_plannedstartdate: '',
  pm_plannedenddate: '',
  pm_percentcomplete: 0,
  pm_taskstatus: '1' as string,
  pm_assignedresource: '',
  pm_ismilestone: false,
  pm_oncriticalpath: false,
  pm_parenttaskid: '',
  _pm_predecessortask_value: '',
  _pm_project_value: '',
}

const defaultMilestoneForm = {
  pm_milestonename: '',
  pm_milestonetype: '1' as string,
  pm_planneddate: '',
  pm_owner: '',
  pm_description: '',
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const getTaskLevelColor = (level?: number): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4']
  return colors[Math.min((level ?? 1) - 1, colors.length - 1)]
}

const getWbsPrefix = (level?: number): string => {
  if (!level || level <= 1) return ''
  return '\u00A0\u00A0\u00A0\u00A0'.repeat(level - 1)
}

export default function SchedulePage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Project selection
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Data
  const [tasks, setTasks] = useState<ProjectTaskModel[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestoneModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'pm_wbsnumber', direction: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  // Create/Edit modal
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [taskForm, setTaskForm] = useState<Partial<ProjectTaskModel>>(defaultTaskForm)
  const [isSaving, setIsSaving] = useState(false)

  // Milestone modal
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState<Partial<ProjectMilestoneModel>>(defaultMilestoneForm)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProjectTaskModel | null>(null)

  // Detail drawer
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<ProjectTaskModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // ── Load projects for selector ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setProjectsLoading(true)
      try {
        console.log('🔍 [SchedulePage] Fetching projects...')
        const list = await fetchProjectsFull()
        console.log('🔍 [SchedulePage] Projects loaded:', list?.length ?? 0, 'items')
        if (list?.length > 0) console.log('🔍 [SchedulePage] Sample project:', JSON.stringify(list[0], null, 2).slice(0, 500))
        setProjects(list)
      } catch (err) {
        console.error('[SchedulePage] load projects error:', err)
        setError('Unable to load projects.')
      } finally {
        setProjectsLoading(false)
      }
    }
    load()
  }, [])

  // ── Load schedule data when project changes ──────────────────────────────
  const loadSchedule = useCallback(async (projectId: string) => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [SchedulePage] Fetching schedule for project:', projectId)
      const data = await fetchScheduleData(projectId)
      console.log('🔍 [SchedulePage] Tasks loaded:', data.tasks?.length ?? 0, '| Milestones:', data.milestones?.length ?? 0)
      if (data.tasks?.length > 0) console.log('🔍 [SchedulePage] Sample task:', JSON.stringify(data.tasks[0], null, 2).slice(0, 500))
      if (data.milestones?.length > 0) console.log('🔍 [SchedulePage] Sample milestone:', JSON.stringify(data.milestones[0], null, 2).slice(0, 500))
      setTasks(data.tasks)
      setMilestones(data.milestones)
    } catch (err) {
      console.error('[SchedulePage] loadSchedule error:', err)
      setError('Unable to load schedule data.')
      setTasks([])
      setMilestones([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      loadSchedule(selectedProjectId)
    } else {
      setTasks([])
      setMilestones([])
    }
  }, [selectedProjectId, loadSchedule])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => String(t.pm_taskstatus) === '0').length
  const inProgressTasks = tasks.filter((t) => String(t.pm_taskstatus) === '1' || ((t.pm_percentcomplete ?? 0) > 0 && (t.pm_percentcomplete ?? 0) < 100)).length
  const overdueTasks = tasks.filter((t) => {
    if (String(t.pm_taskstatus) === '0') return false
    if (!t.pm_plannedenddate) return false
    return new Date(t.pm_plannedenddate) < new Date()
  }).length

  const kpiItems: KpiCardItem[] = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: <AccountTreeIcon />,
      color: '#3b82f6',
    },
    {
      label: 'Completed',
      value: completedTasks,
      icon: <CheckCircleIcon />,
      color: '#22c55e',
    },
    {
      label: 'In Progress',
      value: inProgressTasks,
      icon: <ScheduleIcon />,
      color: '#f59e0b',
    },
    {
      label: 'Overdue',
      value: overdueTasks,
      icon: <ErrorIcon />,
      color: '#ef4444',
      valueColor: overdueTasks > 0 ? '#ef4444' : undefined,
    },
  ]

  // ── Filtering & sorting ─────────────────────────────────────────────────
  const handleSort = useCallback((field: string) => {
    setSort((prev) => {
      setPage(0)
      return prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    })
  }, [])

  // Build task lookup by ID for predecessor name resolution
  const taskById = useMemo(() => {
    const map = new Map<string, ProjectTaskModel>()
    for (const t of tasks) {
      if (t.pm_projecttaskid) map.set(t.pm_projecttaskid, t)
    }
    return map
  }, [tasks])

  const filteredTasks = useMemo(() => {
    let list = [...tasks]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((t) =>
        (t.pm_taskname?.toLowerCase() ?? '').includes(q) ||
        (t.pm_wbsnumber?.toLowerCase() ?? '').includes(q) ||
        (t.pm_assignedresource?.toLowerCase() ?? '').includes(q)
      )
    }

    // Status filter
    if (statusFilter) {
      list = list.filter((t) => String(t.pm_taskstatus) === statusFilter)
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      const field = sort.field
      const dir = sort.direction === 'asc' ? 1 : -1

      if (field === 'pm_wbsnumber') {
        cmp = (a.pm_wbsnumber ?? '').localeCompare(b.pm_wbsnumber ?? '', undefined, { numeric: true })
      } else if (field === 'pm_taskname') {
        cmp = (a.pm_taskname ?? '').localeCompare(b.pm_taskname ?? '')
      } else if (field === 'pm_tasklevel') {
        cmp = (a.pm_tasklevel ?? 0) - (b.pm_tasklevel ?? 0)
      } else if (field === 'pm_plannedstartdate') {
        cmp = (a.pm_plannedstartdate ?? '').localeCompare(b.pm_plannedstartdate ?? '')
      } else if (field === 'pm_plannedenddate') {
        cmp = (a.pm_plannedenddate ?? '').localeCompare(b.pm_plannedenddate ?? '')
      } else if (field === 'pm_percentcomplete') {
        cmp = (a.pm_percentcomplete ?? 0) - (b.pm_percentcomplete ?? 0)
      } else if (field === 'pm_taskstatus') {
        cmp = (String(a.pm_taskstatus) ?? '').localeCompare(String(b.pm_taskstatus) ?? '')
      } else if (field === 'pm_assignedresource') {
        cmp = (a.pm_assignedresource ?? '').localeCompare(b.pm_assignedresource ?? '')
      }
      return cmp * dir
    })

    return list
  }, [tasks, searchQuery, statusFilter, sort])

  // ── Paginated slice ────────────────────────────────────────────────────
  const paginatedTasks = useMemo(
    () => filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredTasks, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage)
  }, [])

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }, [])

  // ── Reset page when search/filter changes ──────────────────────────────
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q)
    setPage(0)
  }, [])

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v)
    setPage(0)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('')
    setPage(0)
  }, [])

  // ── Create task ─────────────────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!taskForm.pm_taskname) { setError('Task name is required.'); return }
    if (!selectedProjectId) { setError('No project selected.'); return }
    setIsSaving(true)
    try {
      await createScheduleTask({
        ...taskForm,
        _pm_project_value: selectedProjectId,
      })
      setTaskForm(defaultTaskForm)
      setIsAddingTask(false)
      setSuccessMsg('Task created successfully.')
      await loadSchedule(selectedProjectId)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to create task.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Update task ─────────────────────────────────────────────────────────
  const handleUpdateTask = async () => {
    if (!detailTask?.pm_projecttaskid) return
    setIsSaving(true)
    try {
      await updateScheduleTask(detailTask.pm_projecttaskid, taskForm)
      setIsEditingTask(false)
      setSuccessMsg('Task updated successfully.')
      await loadSchedule(selectedProjectId)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to update task.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Delete task ─────────────────────────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!deleteTarget?.pm_projecttaskid) return
    try {
      await deleteScheduleTask(deleteTarget.pm_projecttaskid)
      setDeleteTarget(null)
      setSuccessMsg('Task deleted.')
      await loadSchedule(selectedProjectId)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete task.')
    }
  }

  // ── Add milestone ───────────────────────────────────────────────────────
  const handleAddMilestone = async () => {
    if (!milestoneForm.pm_milestonename || !selectedProjectId) {
      setError('Milestone name is required.')
      return
    }
    try {
      await createProjectMilestone({
        pm_milestonename: milestoneForm.pm_milestonename,
        pm_milestonetype: milestoneForm.pm_milestonetype,
        pm_planneddate: milestoneForm.pm_planneddate,
        _pm_project_value: selectedProjectId,
      })
      setMilestoneForm(defaultMilestoneForm)
      setIsAddingMilestone(false)
      setSuccessMsg('Milestone added.')
      await loadSchedule(selectedProjectId)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add milestone.')
    }
  }

  // ── Open detail drawer ─────────────────────────────────────────────────
  const handleRowClick = useCallback((task: ProjectTaskModel) => {
    setDetailTask(task)
    setDetailDrawerOpen(true)
    setDetailTab(0)
  }, [])

  const handleEditFromDrawer = () => {
    if (!detailTask) return
    setTaskForm({ ...detailTask })
    setIsEditingTask(true)
  }

  // ── Duration bar helper ────────────────────────────────────────────────
  const DurationBar = ({ task }: { task: ProjectTaskModel }) => {
    const pct = task.pm_percentcomplete ?? 0
    const isOverdue = !(String(task.pm_taskstatus) === '0') && task.pm_plannedenddate && new Date(task.pm_plannedenddate) < new Date()
    const color = isOverdue ? '#ef4444' : pct >= 100 ? '#22c55e' : pct > 0 ? '#3b82f6' : '#94a3b8'
    const days = task.pm_durationdays ?? 0

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
        <Box sx={{ flex: 1, position: 'relative', height: 8, bgcolor: theme.palette.action.hover, borderRadius: 4, overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${Math.min(pct, 100)}%`,
              bgcolor: color,
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 36, textAlign: 'right', color: isOverdue ? '#ef4444' : 'text.primary' }}>
          {pct}%
        </Typography>
        {days > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
            {days}d
          </Typography>
        )}
      </Box>
    )
  }

  // ── Sort header helper ──────────────────────────────────────────────────
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

  // ── Selected project object ────────────────────────────────────────────
  const selectedProject = useMemo(
    () => projects.find((p) => p.pm_projectid === selectedProjectId),
    [projects, selectedProjectId]
  )

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Box>
      <PageHeader
        title="Schedule Management"
        subtitle="Manage WBS hierarchy, task dependencies, and milestones across projects."
      />

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── Project Selector + Action Buttons ──────────────────────────── */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Grid container component="div" spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Project</InputLabel>
              <Select
                value={selectedProjectId}
                label="Select Project"
                onChange={(e) => setSelectedProjectId(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">
                  <em>Choose a project...</em>
                </MenuItem>
                {projectsLoading ? (
                  <MenuItem disabled>Loading projects...</MenuItem>
                ) : (
                  projects.map((p) => (
                    <MenuItem key={p.pm_projectid} value={p.pm_projectid ?? ''}>
                      {p.pm_projectname} {p.pm_projectcode ? `(${p.pm_projectcode})` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!selectedProjectId}
                onClick={() => { setTaskForm({ ...defaultTaskForm, _pm_project_value: selectedProjectId }); setIsAddingTask(true) }}
                size="small"
              >
                Add Task
              </Button>
              <Button
                variant="outlined"
                startIcon={<FlagIcon />}
                disabled={!selectedProjectId}
                onClick={() => setIsAddingMilestone(true)}
                size="small"
              >
                Add Milestone
              </Button>
            </Box>
          </Grid>
        </Grid>
        {selectedProject && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {selectedProject.pm_projectcode && `${selectedProject.pm_projectcode} · `}
              {selectedProject.pm_projectmanager ?? 'No manager'}
            </Typography>
            <Chip
              label={`${tasks.length} tasks, ${milestones.length} milestones`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}
      </Paper>

      {!selectedProjectId ? (
        /* ── No project selected ─────────────────────────────────────── */
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <AccountTreeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
            Select a Project
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Choose a project from the dropdown above to view and manage its schedule.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────────── */}
          <KpiCardRow items={kpiItems} loading={loading} />

          {/* ── Schedule Table ────────────────────────────────────────── */}
          <Paper sx={{ overflow: 'hidden', mb: 3 }}>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search tasks by name, WBS, or resource..."
              filterValue={statusFilter}
              onFilterChange={handleStatusFilterChange}
              filterLabel="Filter by Status"
              filterOptions={[
                { value: '', label: 'All Statuses' },
                { value: '1', label: 'In Progress' },
                { value: '0', label: 'Complete' },
              ]}
              onClear={handleClearFilters}
            />

            <TableShell
              loading={loading}
              empty={filteredTasks.length === 0 && milestones.length === 0}
              emptyIcon={<AccountTreeIcon />}
              emptyTitle={searchQuery || statusFilter ? 'No tasks match your criteria.' : 'No tasks yet. Add one to get started.'}
              emptyAction={!searchQuery && !statusFilter ? (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setTaskForm({ ...defaultTaskForm, _pm_project_value: selectedProjectId }); setIsAddingTask(true) }}>
                  Create your first task
                </Button>
              ) : undefined}
            >
              <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    {[
                      { field: 'pm_wbsnumber', label: 'WBS' },
                      { field: 'pm_taskname', label: 'Task Name' },
                      { field: 'pm_tasklevel', label: 'Level' },
                      { field: 'pm_assignedresource', label: 'Resource' },
                      { field: 'pm_plannedstartdate', label: 'Start' },
                      { field: 'pm_plannedenddate', label: 'End' },
                      { field: 'pm_percentcomplete', label: 'Progress' },
                      { field: 'pm_taskstatus', label: 'Status' },
                      { label: 'Dependencies' },
                      { label: '' },
                    ].map((col) => (
                      <TableCell
                        key={col.field ?? col.label}
                        sx={{
                          fontWeight: 700,
                          bgcolor: isDark ? '#1e293b' : '#f8fafc',
                          borderBottom: `2px solid ${theme.palette.divider}`,
                          px: 2,
                          py: 1.5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.field ? <SortHeader field={col.field} label={col.label} /> : col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Task rows */}
                  {paginatedTasks.map((task, idx) => {
                    const level = task.pm_tasklevel ?? 1
                    const indent = getWbsPrefix(level)
                    const predTask = task._pm_predecessortask_value ? taskById.get(task._pm_predecessortask_value) : null
                    const isOverdue = !(String(task.pm_taskstatus) === '0') && task.pm_plannedenddate && new Date(task.pm_plannedenddate) < new Date()

                    return (
                      <TableRow
                        key={task.pm_projecttaskid}
                        hover
                        onClick={() => handleRowClick(task)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent',
                          '& td': { borderBottom: '1px solid #efefef', py: 1.2, px: 2 },
                          '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)' },
                          transition: 'background-color 0.15s',
                          opacity: String(task.pm_taskstatus) === '0' ? 0.7 : 1,
                        }}
                      >
                        {/* WBS */}
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              color: getTaskLevelColor(level),
                              fontSize: fontSizes.xs,
                            }}
                          >
                            {indent}{task.pm_wbsnumber ?? '—'}
                          </Typography>
                        </TableCell>

                        {/* Task Name */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 4,
                                height: 28,
                                borderRadius: 2,
                                bgcolor: getTaskLevelColor(level),
                                flexShrink: 0,
                              }}
                            />
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: level <= 1 ? fontSizes.sm : fontSizes.smMd,
                                }}
                              >
                                {indent}{task.pm_taskname}
                              </Typography>
                              {task.pm_taskdescription && (
                                <Typography variant="caption" color="text.secondary" sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  maxWidth: 280,
                                }}>
                                  {task.pm_taskdescription}
                                </Typography>
                              )}
                            </Box>
                            {task.pm_ismilestone && (
                              <FlagIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                            )}
                          </Box>
                        </TableCell>

                        {/* Level */}
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            L{level}
                          </Typography>
                        </TableCell>

                        {/* Resource */}
                        <TableCell>
                          <Typography variant="body2">
                            {task.pm_assignedresource || '—'}
                          </Typography>
                        </TableCell>

                        {/* Start */}
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(task.pm_plannedstartdate)}
                          </Typography>
                        </TableCell>

                        {/* End */}
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              color: isOverdue ? '#ef4444' : 'text.secondary',
                              fontWeight: isOverdue ? 600 : 400,
                            }}
                          >
                            {formatDate(task.pm_plannedenddate)}
                            {isOverdue && ' ⚠'}
                          </Typography>
                        </TableCell>

                        {/* Progress */}
                        <TableCell>
                          <DurationBar task={task} />
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[String(task.pm_taskstatus)] ?? '—'}
                            color={STATUS_COLORS[String(task.pm_taskstatus)] ?? 'default'}
                            size="small"
                            variant={String(task.pm_taskstatus) === '0' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600, borderRadius: 8 }}
                          />
                        </TableCell>

                        {/* Dependencies */}
                        <TableCell>
                          {predTask ? (
                            <Tooltip title={`Predecessor: ${predTask.pm_taskname ?? 'Unknown'}`}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LinkIcon sx={{ fontSize: 12, color: '#3b82f6' }} />
                                <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 500 }}>
                                  {predTask.pm_wbsnumber ?? '—'}
                                </Typography>
                                {task.pm_lagdays ? (
                                  <Typography variant="caption" color="text.secondary">
                                    +{task.pm_lagdays}d
                                  </Typography>
                                ) : null}
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setTaskForm({ ...task })
                                setDetailTask(task)
                                setIsEditingTask(true)
                              }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(task)}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Milestone rows */}
                  {milestones.map((ms, idx) => (
                    <TableRow
                      key={`ms-${ms.pm_projectmilestoneid}`}
                      sx={{
                        bgcolor: isDark ? 'rgba(245, 158, 11, 0.04)' : 'rgba(245, 158, 11, 0.03)',
                        '& td': { borderBottom: '1px solid #efefef', py: 1.2, px: 2 },
                      }}
                    >
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                          ⚑
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FlagIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {ms.pm_milestonename}
                          </Typography>
                          <Chip
                            label={ms.pm_milestonetype === '0' || ms.pm_milestonetype === 0 ? 'Delivery' : 'Governance'}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: fontSizes.xs, fontWeight: 600 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{ms.pm_owner || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(ms.pm_planneddate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      </TableCell>
                      <TableCell>
                        <DurationBar task={{ pm_percentcomplete: ms.pm_status === '2' || ms.pm_status === 2 ? 100 : ms.pm_status === '0' || ms.pm_status === 0 ? 50 : 0, pm_durationdays: 0 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={MILESTONE_STATUS_LABELS[String(ms.pm_status)] ?? '—'}
                          color={MILESTONE_STATUS_COLORS[String(ms.pm_status)] ?? 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, borderRadius: 8 }}
                        />
                      </TableCell>
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>

            {!loading && filteredTasks.length > 0 && (
              <TableFooter
                filteredCount={filteredTasks.length}
                totalCount={tasks.length}
                totals={[
                  { label: 'Milestones', value: String(milestones.length) },
                ]}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 2 }}>
                  <span>Critical path: <strong>{tasks.filter((t) => t.pm_oncriticalpath).length}</strong> tasks</span>
                  <span>Avg completion: <strong>{tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / tasks.length) : 0}%</strong></span>
                </Typography>
              </TableFooter>
            )}
            {!loading && filteredTasks.length > 0 && (
              <TablePagination
                component="div"
                count={filteredTasks.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100]}
                sx={{
                  borderTop: `1px solid ${theme.palette.divider}`,
                  '.MuiTablePagination-toolbar': { minHeight: 48 },
                }}
              />
            )}
          </Paper>
        </>
      )}

      {/* ── Create Task Dialog ──────────────────────────────────────────── */}
      <Dialog open={isAddingTask} onClose={() => setIsAddingTask(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Task name *"
                value={taskForm.pm_taskname ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskname: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="WBS Number"
                placeholder="e.g. 1.2.3"
                value={taskForm.pm_wbsnumber ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_wbsnumber: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={taskForm.pm_taskdescription ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskdescription: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                label="Level"
                value={String(taskForm.pm_tasklevel ?? 1)}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_tasklevel: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <MenuItem key={l} value={String(l)}>Level {l}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                label="Parent Task"
                value={taskForm.pm_parenttaskid ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_parenttaskid: e.target.value }))}
              >
                <MenuItem value="">None (Top Level)</MenuItem>
                {tasks.filter((t) => t.pm_projecttaskid !== taskForm.pm_projecttaskid).map((t) => (
                  <MenuItem key={t.pm_projecttaskid} value={t.pm_projecttaskid ?? ''}>
                    {t.pm_wbsnumber ? `${t.pm_wbsnumber} - ` : ''}{t.pm_taskname}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Duration (days)"
                value={taskForm.pm_durationdays ?? 5}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_durationdays: Number(e.target.value) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Lag (days)"
                value={taskForm.pm_lagdays ?? 0}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_lagdays: Number(e.target.value) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Planned start"
                value={taskForm.pm_plannedstartdate ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_plannedstartdate: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Planned end"
                value={taskForm.pm_plannedenddate ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_plannedenddate: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Assigned resource"
                value={taskForm.pm_assignedresource ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_assignedresource: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label="Predecessor Task"
                value={taskForm._pm_predecessortask_value ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, _pm_predecessortask_value: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {tasks.filter((t) => t.pm_projecttaskid !== taskForm.pm_projecttaskid).map((t) => (
                  <MenuItem key={t.pm_projecttaskid} value={t.pm_projecttaskid ?? ''}>
                    {t.pm_wbsnumber ? `${t.pm_wbsnumber} - ` : ''}{t.pm_taskname}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={String(taskForm.pm_taskstatus ?? '1')}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskstatus: e.target.value }))}
              >
                <MenuItem value="1">In Progress</MenuItem>
                <MenuItem value="0">Complete</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="% Complete"
                value={taskForm.pm_percentcomplete ?? 0}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_percentcomplete: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={taskForm.pm_ismilestone ?? false}
                    onChange={(e) => setTaskForm((f) => ({ ...f, pm_ismilestone: e.target.checked }))}
                  />
                }
                label="Mark as milestone"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={taskForm.pm_oncriticalpath ?? false}
                    onChange={(e) => setTaskForm((f) => ({ ...f, pm_oncriticalpath: e.target.checked }))}
                  />
                }
                label="On critical path"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddingTask(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={isSaving || !taskForm.pm_taskname}>
            {isSaving ? 'Saving...' : 'Save Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Task Dialog ────────────────────────────────────────────── */}
      <Dialog open={isEditingTask} onClose={() => setIsEditingTask(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Task name *"
                value={taskForm.pm_taskname ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskname: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="WBS Number"
                value={taskForm.pm_wbsnumber ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_wbsnumber: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={taskForm.pm_taskdescription ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskdescription: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                label="Level"
                value={String(taskForm.pm_tasklevel ?? 1)}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_tasklevel: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <MenuItem key={l} value={String(l)}>Level {l}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Duration (days)"
                value={taskForm.pm_durationdays ?? 5}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_durationdays: Number(e.target.value) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Lag (days)"
                value={taskForm.pm_lagdays ?? 0}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_lagdays: Number(e.target.value) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={String(taskForm.pm_taskstatus ?? '1')}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskstatus: e.target.value }))}
              >
                <MenuItem value="1">In Progress</MenuItem>
                <MenuItem value="0">Complete</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Planned start"
                value={taskForm.pm_plannedstartdate ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_plannedstartdate: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Planned end"
                value={taskForm.pm_plannedenddate ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_plannedenddate: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="% Complete"
                value={taskForm.pm_percentcomplete ?? 0}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_percentcomplete: Math.min(100, Math.max(0, Number(e.target.value))) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Assigned resource"
                value={taskForm.pm_assignedresource ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_assignedresource: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label="Predecessor Task"
                value={taskForm._pm_predecessortask_value ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, _pm_predecessortask_value: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {tasks.filter((t) => t.pm_projecttaskid !== (detailTask?.pm_projecttaskid ?? '')).map((t) => (
                  <MenuItem key={t.pm_projecttaskid} value={t.pm_projecttaskid ?? ''}>
                    {t.pm_wbsnumber ? `${t.pm_wbsnumber} - ` : ''}{t.pm_taskname}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={taskForm.pm_oncriticalpath ?? false}
                    onChange={(e) => setTaskForm((f) => ({ ...f, pm_oncriticalpath: e.target.checked }))}
                  />
                }
                label="Critical path"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditingTask(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleUpdateTask} variant="contained" disabled={isSaving || !taskForm.pm_taskname}>
            {isSaving ? 'Saving...' : 'Update Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Milestone Dialog ────────────────────────────────────────── */}
      <Dialog open={isAddingMilestone} onClose={() => setIsAddingMilestone(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Milestone</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Milestone name *"
                value={milestoneForm.pm_milestonename ?? ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonename: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Type"
                value={String(milestoneForm.pm_milestonetype ?? '1')}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonetype: e.target.value }))}
              >
                <MenuItem value="0">Delivery</MenuItem>
                <MenuItem value="1">Governance</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Target date"
                value={milestoneForm.pm_planneddate ?? ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_planneddate: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Owner"
                value={milestoneForm.pm_owner ?? ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_owner: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={milestoneForm.pm_description ?? ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddingMilestone(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddMilestone} variant="contained" disabled={!milestoneForm.pm_milestonename}>
            Add Milestone
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Task</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.pm_taskname}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleDeleteTask} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail Drawer ───────────────────────────────────────────────── */}
      <DetailDrawer
        open={detailDrawerOpen}
        onClose={() => { setDetailDrawerOpen(false); setDetailTask(null) }}
        icon={<AccountTreeIcon sx={{ color: getTaskLevelColor(detailTask?.pm_tasklevel ?? 1) }} />}
        title={detailTask?.pm_taskname ?? ''}
        subtitle={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {detailTask?.pm_wbsnumber && (
              <Chip label={`WBS ${detailTask.pm_wbsnumber}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            <Chip
              label={`Level ${detailTask?.pm_tasklevel ?? 1}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={STATUS_LABELS[String(detailTask?.pm_taskstatus)] ?? '—'}
              color={STATUS_COLORS[String(detailTask?.pm_taskstatus)] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 8 }}
            />
            {detailTask?.pm_ismilestone && (
              <Chip icon={<FlagIcon />} label="Milestone" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            {detailTask?.pm_oncriticalpath && (
              <Chip label="Critical Path" size="small" color="error" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
        }
        headerActions={
          <IconButton size="small" onClick={handleEditFromDrawer}>
            <EditIcon fontSize="small" />
          </IconButton>
        }
        tabs={[
          { label: 'Task Details' },
          { label: 'Dependencies' },
        ]}
        tabValue={detailTab}
        onTabChange={(v) => setDetailTab(v)}
        width={{ xs: '100%', sm: 520, md: 600 }}
      >
        {/* Tab 0: Task Details */}
        <TabPanel value={detailTab} index={0} pt={0}>
          {detailTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Progress */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={detailTask.pm_percentcomplete ?? 0}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: theme.palette.action.hover,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: (detailTask.pm_percentcomplete ?? 0) >= 100 ? '#22c55e' : '#3b82f6',
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {detailTask.pm_percentcomplete ?? 0}%
                  </Typography>
                </Box>
              </Paper>

              {/* Schedule details */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                      Planned Start
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDate(detailTask.pm_plannedstartdate)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                      Planned End
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDate(detailTask.pm_plannedenddate)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                      Duration
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {detailTask.pm_durationdays ?? 0} days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                      Lag
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {detailTask.pm_lagdays ?? 0} days
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Description */}
              {detailTask.pm_taskdescription && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Description
                  </Typography>
                  <Typography variant="body2">
                    {detailTask.pm_taskdescription}
                  </Typography>
                </Paper>
              )}

              {/* Resource */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                  Assigned Resource
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {detailTask.pm_assignedresource || 'Unassigned'}
                </Typography>
              </Paper>
            </Box>
          )}
        </TabPanel>

        {/* Tab 1: Dependencies */}
        <TabPanel value={detailTab} index={1} pt={0}>
          {detailTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Predecessor */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  <LinkIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                  Predecessor
                </Typography>
                {detailTask._pm_predecessortask_value && taskById.has(detailTask._pm_predecessortask_value) ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowForwardIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {taskById.get(detailTask._pm_predecessortask_value)?.pm_taskname}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          WBS: {taskById.get(detailTask._pm_predecessortask_value)?.pm_wbsnumber ?? '—'}
                          {' · '}
                          Status: {STATUS_LABELS[String(taskById.get(detailTask._pm_predecessortask_value)?.pm_taskstatus)] ?? '—'}
                        </Typography>
                      </Box>
                    </Box>
                    {detailTask.pm_lagdays ? (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Lag: <strong>{detailTask.pm_lagdays} days</strong> after predecessor completes
                      </Typography>
                    ) : null}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    No predecessor dependency set.
                  </Typography>
                )}
              </Paper>

              {/* Critical path info */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                  Schedule Info
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: detailTask.pm_oncriticalpath ? '#ef4444' : '#94a3b8' }} />
                      <Typography variant="body2">
                        {detailTask.pm_oncriticalpath ? 'On Critical Path' : 'Not on Critical Path'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: detailTask.pm_ismilestone ? '#f59e0b' : '#94a3b8' }} />
                      <Typography variant="body2">
                        {detailTask.pm_ismilestone ? 'Is a Milestone' : 'Not a Milestone'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </TabPanel>
      </DetailDrawer>
    </Box>
  )
}
