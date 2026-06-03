import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Alert, useTheme,
  Tabs, Tab, Grid, Divider, MenuItem, TextField, FormControl, InputLabel, Select, IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import GridViewIcon from '@mui/icons-material/GridView'
import FlagIcon from '@mui/icons-material/Flag'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccountTreeIcon from '@mui/icons-material/AccountTree'

import {
  fetchScheduleData,
  createScheduleTask,
  updateScheduleTask,
  deleteScheduleTask,
  fetchProjectsForLookup,
} from '@/services'
import type { ProjectTaskModel, ProjectMilestoneModel } from '@/types/dataverse'
import type { ProjectLookupItem } from '@/services'
import { PageHeader, KpiCardRow, DetailDrawer, TabPanel, ExportButton, StatusTag, ActionIcon, Button, GanttChart } from '@/components/common'
import type { KpiCardItem, ExportColumn, GanttTaskData, GanttMilestoneData } from '@/components/common'
import { fontSizes } from '@/styles'
import { formatDate } from '@/utils/formatters'

// Sub-components
import { TaskListView } from '../components/TaskListView'
import { TaskDialogs } from '../components/TaskDialogs'

const STATUS_LABELS: Record<string, string> = {
  '0': 'Complete',
  '1': 'In Progress',
}

const STATUS_COLORS: Record<string, string> = {
  '0': 'success',
  '1': 'warning',
}

const scheduleExportColumns: ExportColumn[] = [
  { key: 'pm_wbsnumber', label: 'WBS' },
  { key: 'pm_taskname', label: 'Task Name' },
  { key: 'pm_plannedstartdate', label: 'Start Date' },
  { key: 'pm_plannedenddate', label: 'End Date' },
  { key: 'pm_percentcomplete', label: 'Progress (%)' },
  { key: 'pm_taskstatus', label: 'Status' },
  { key: 'pm_assignedresource', label: 'Resource' },
  { key: 'pm_ismilestone', label: 'Milestone', format: (v) => v ? 'Yes' : 'No' },
]

export default function SchedulePage() {
  const theme = useTheme()

  // Project selection state
  const [projects, setProjects] = useState<ProjectLookupItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Data state
  const [tasks, setTasks] = useState<ProjectTaskModel[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestoneModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // UI state
  const [viewTab, setPageTab] = useState(0)
  const [selectedTask, setSelectedTask] = useState<ProjectTaskModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Dialog state
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<ProjectTaskModel>>({})

  // ── Load Projects ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true)
      try {
        const list = await fetchProjectsForLookup()
        setProjects(list)
        if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].pm_projectid)
        }
      } catch (err) {
        setError('Unable to load projects.')
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [])

  // ── Load Schedule for selected project ────────────────────────────────────
  const loadData = useCallback(async (projectId: string) => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchScheduleData(projectId)
      setTasks(data.tasks ?? [])
      setMilestones(data.milestones ?? [])
    } catch {
      setError('Unable to load schedule data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      loadData(selectedProjectId)
    }
  }, [selectedProjectId, loadData])

  const kpiItems = useMemo((): KpiCardItem[] => [
    { label: 'Total Tasks', value: tasks.length, icon: <AssignmentIcon />, color: 'primary.main' },
    { label: 'Completed', value: tasks.filter(t => String(t.pm_taskstatus) === '0').length, icon: <AssignmentIcon />, color: 'success.main' },
    { label: 'Milestones', value: tasks.filter(t => t.pm_ismilestone).length, icon: <FlagIcon />, color: 'warning.main' },
    { label: 'Avg Progress', value: `${tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / tasks.length) : 0}%`, icon: <GridViewIcon />, color: 'info.main' },
  ], [tasks])

  // ── Gantt data conversion ──────────────────────────────────────────────
  const ganttTasks = useMemo((): GanttTaskData[] => {
    return tasks.map((t) => ({
      id: t.pm_projecttaskid ?? '',
      name: t.pm_taskname ?? 'Unnamed',
      wbs: t.pm_wbsnumber,
      startDate: t.pm_plannedstartdate ?? new Date().toISOString().split('T')[0],
      endDate: t.pm_plannedenddate ?? t.pm_plannedstartdate ?? new Date().toISOString().split('T')[0],
      percentComplete: t.pm_percentcomplete ?? 0,
      isMilestone: t.pm_ismilestone,
      onCriticalPath: t.pm_oncriticalpath,
      level: t.pm_tasklevel,
      status: String(t.pm_taskstatus),
      predecessorId: t._pm_predecessortask_value,
      lagDays: t.pm_lagdays,
    }))
  }, [tasks])

  const ganttMilestones = useMemo((): GanttMilestoneData[] => {
    return milestones.map((m) => ({
      id: m.pm_projectmilestoneid ?? '',
      name: m.pm_milestonename ?? 'Unnamed',
      date: m.pm_planneddate ?? new Date().toISOString().split('T')[0],
      status: String(m.pm_status),
    }))
  }, [milestones])

  const handleSave = async () => {
    if (!formData.pm_taskname) return
    setActionLoading(true)
    try {
      if (isEditing && formData.pm_projecttaskid) {
        await updateScheduleTask(formData.pm_projecttaskid, formData)
        setSuccessMsg('Task updated')
      } else {
        await createScheduleTask({ ...formData, _pm_project_value: selectedProjectId })
        setSuccessMsg('Task created')
      }
      setShowForm(false)
      loadData(selectedProjectId)
    } catch {
      setError('Failed to save task')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Schedule & Planning"
        subtitle="Manage project timelines, tasks, and critical milestones."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={tasks} columns={scheduleExportColumns} filename="Schedule" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setIsEditing(false); setShowForm(true) }} disabled={!selectedProjectId}>
              New Task
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel>Select Project</InputLabel>
          <Select
            value={selectedProjectId}
            label="Select Project"
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={projectsLoading}
          >
            {projects.map((p) => (
              <MenuItem key={p.pm_projectid} value={p.pm_projectid}>
                {p.pm_projectname} ({p.pm_projectcode})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {projectsLoading && <Typography variant="caption" color="text.secondary">Loading projects...</Typography>}
      </Paper>

      {!loading && selectedProjectId && <KpiCardRow items={kpiItems} />}

      <Tabs value={viewTab} onChange={(_, v) => setPageTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<GridViewIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="List View" />
        <Tab icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Gantt Chart" />
      </Tabs>

      <TabPanel value={viewTab} index={0} pt={0}>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TaskListView
            tasks={tasks}
            loading={loading}
            onEditTask={(t) => { setFormData(t); setIsEditing(true); setShowForm(true) }}
            onSelectTask={setSelectedTask}
            statusLabels={STATUS_LABELS}
            statusColors={STATUS_COLORS}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={viewTab} index={1} pt={0}>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', height: 600 }}>
          <GanttChart 
            tasks={ganttTasks} 
            milestones={ganttMilestones} 
            onTaskClick={(id) => {
              const task = tasks.find(t => t.pm_projecttaskid === id)
              if (task) setSelectedTask(task)
            }}
          />
        </Paper>
      </TabPanel>

      <DetailDrawer
        open={!!selectedTask}
        onClose={() => { setSelectedTask(null); setDetailTab(0) }}
        title={selectedTask?.pm_taskname ?? ''}
        icon={<AccountTreeIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        subtitle={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {selectedTask?.pm_wbsnumber && (
              <StatusTag label={`WBS ${selectedTask.pm_wbsnumber}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            <StatusTag
              label={STATUS_LABELS[String(selectedTask?.pm_taskstatus)] ?? '—'}
              color={STATUS_COLORS[String(selectedTask?.pm_taskstatus)] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        }
        headerActions={
          <ActionIcon icon={<EditIcon />} onClick={() => { setFormData(selectedTask!); setIsEditing(true); setShowForm(true) }} label="Edit" color="primary" />
        }
        tabs={[{ label: 'Task Details' }, { label: 'Timeline' }]}
        tabValue={detailTab}
        onTabChange={setDetailTab}
      >
        {selectedTask && (
          <Box sx={{ p: 1 }}>
            <TabPanel value={detailTab} index={0} pt={0}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{selectedTask.pm_taskdescription || 'No description'}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Owner</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTask.pm_assignedresource || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Progress</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTask.pm_percentcomplete ?? 0}%</Typography>
                </Grid>
              </Grid>
            </TabPanel>
            <TabPanel value={detailTab} index={1} pt={0}>
               <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Planned Start</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedTask.pm_plannedstartdate)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Planned End</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedTask.pm_plannedenddate)}</Typography>
                  </Grid>
               </Grid>
            </TabPanel>
          </Box>
        )}
      </DetailDrawer>

      <TaskDialogs
        showForm={showForm}
        isEditing={isEditing}
        onClose={() => setShowForm(false)}
        formData={formData}
        onFieldChange={(f, v) => setFormData(prev => ({ ...prev, [f]: v }))}
        onSave={handleSave}
        loading={actionLoading}
        statusOptions={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        tasks={tasks}
      />
    </Box>
  )
}
