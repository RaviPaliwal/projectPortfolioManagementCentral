import React, { useMemo, useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
  useTheme,
  Grid,
  FormControlLabel,
  Switch,
} from '@mui/material'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import ListIcon from '@mui/icons-material/List'
import AssignmentIcon from '@mui/icons-material/Assignment'
import FlagIcon from '@mui/icons-material/Flag'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'

import GanttChart from './GanttChart/GanttChart'
import { StatusChip, StatusTag, MetricTile } from '@/components/common'
import { fetchScheduleData } from '@/services'
import type { ProjectMilestoneModel, ProjectTaskModel, ProjectModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface MasterScheduleTabProps {
  projects: ProjectModel[]
}

const isCritical = (v: any): boolean => {
  if (v === undefined || v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  const s = String(v).toLowerCase().trim()
  return s === 'true' || s === '1' || s === 'yes'
}

const getStatusLabel = (status?: string | number | null): string => {
  const s = String(status ?? '')
  if (s === '0') return 'Complete'
  if (s === '1') return 'In Progress'
  return 'Not Started'
}

const getStatusColor = (status?: string | number | null): 'success' | 'info' | 'default' => {
  const s = String(status ?? '')
  if (s === '0') return 'success'
  if (s === '1') return 'info'
  return 'default'
}

const isOverdue = (endDate: string | null | undefined): boolean => {
  if (!endDate) return false
  const d = new Date(endDate)
  return !isNaN(d.getTime()) && d < new Date()
}

export const MasterScheduleTab: React.FC<MasterScheduleTabProps> = ({ projects }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [activeView, setActiveView] = useState(0)
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all')
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [allTasksByProject, setAllTasksByProject] = useState<Record<string, ProjectTaskModel[]>>({})
  const [allMilestonesByProject, setAllMilestonesByProject] = useState<Record<string, ProjectMilestoneModel[]>>({})

  useEffect(() => {
    if (projects.length === 0) {
      setLoading(false)
      return
    }

    const loadAllSchedules = async () => {
      setLoading(true)
      setError(null)
      try {
        const tasksMap: Record<string, ProjectTaskModel[]> = {}
        const milestonesMap: Record<string, ProjectMilestoneModel[]> = {}

        await Promise.all(
          projects.map(async (project) => {
            if (!project.pm_projectid) return
            try {
              const data = await fetchScheduleData(project.pm_projectid)
              tasksMap[project.pm_projectid] = data.tasks || []
              milestonesMap[project.pm_projectid] = data.milestones || []
            } catch {
              tasksMap[project.pm_projectid] = []
              milestonesMap[project.pm_projectid] = []
            }
          })
        )

        setAllTasksByProject(tasksMap)
        setAllMilestonesByProject(milestonesMap)
      } catch {
        setError('Failed to load project schedules.')
      } finally {
        setLoading(false)
      }
    }

    loadAllSchedules()
  }, [projects])

  const filteredProjects = useMemo(() => {
    if (selectedProjectFilter === 'all') return projects
    return projects.filter(p => p.pm_projectid === selectedProjectFilter)
  }, [projects, selectedProjectFilter])

  const { ganttTasks, ganttMilestones, stats, timelineItems } = useMemo(() => {
    const finalTasks: any[] = []
    const finalMilestones: any[] = []

    let totalTasksCount = 0
    let completedTasksCount = 0
    let totalProgressSum = 0
    let totalMilestonesCount = 0

    const listItems: any[] = []

    for (const project of filteredProjects) {
      const pid = project.pm_projectid
      if (!pid) continue

      const projectTasks = allTasksByProject[pid] || []
      const projectMilestones = allMilestonesByProject[pid] || []

      if (projectTasks.length === 0 && projectMilestones.length === 0) continue

      let earliestStart: Date | null = null
      let latestEnd: Date | null = null

      projectTasks.forEach(t => {
        if (t.pm_plannedstartdate) {
          const d = new Date(t.pm_plannedstartdate)
          if (!earliestStart || d < earliestStart) earliestStart = d
        }
        if (t.pm_plannedenddate) {
          const d = new Date(t.pm_plannedenddate)
          if (!latestEnd || d > latestEnd) latestEnd = d
        }
      })

      const projStartStr = earliestStart
        ? earliestStart.toISOString().split('T')[0]
        : (project.pm_plannedstartdate || new Date().toISOString().split('T')[0])
      const projEndStr = latestEnd
        ? latestEnd.toISOString().split('T')[0]
        : (project.pm_plannedenddate || new Date().toISOString().split('T')[0])

      const projectGroupId = `proj-group-${pid}`
      finalTasks.push({
        id: projectGroupId,
        name: `Project: ${project.pm_projectname}`,
        startDate: projStartStr,
        endDate: projEndStr,
        percentComplete: projectTasks.length > 0
          ? Math.round(projectTasks.reduce((acc, t) => acc + (t.pm_percentcomplete ?? 0), 0) / projectTasks.length)
          : 0,
        level: 1,
        status: '1',
      })

      const filteredTasks = showCriticalPathOnly
        ? projectTasks.filter(t => isCritical(t.pm_oncriticalpath))
        : projectTasks

      filteredTasks.forEach(t => {
        totalTasksCount++
        if (String(t.pm_taskstatus) === '0') completedTasksCount++
        totalProgressSum += t.pm_percentcomplete ?? 0

        const taskStart = t.pm_plannedstartdate || projStartStr
        const taskEnd = t.pm_plannedenddate || taskStart

        finalTasks.push({
          id: t.pm_projecttaskid!,
          name: t.pm_taskname!,
          startDate: taskStart,
          endDate: taskEnd,
          percentComplete: t.pm_percentcomplete ?? 0,
          status: String(t.pm_taskstatus),
          level: (t.pm_tasklevel ?? 1) + 1,
          wbs: t.pm_wbsnumber,
          onCriticalPath: isCritical(t.pm_oncriticalpath),
          predecessorId: t._pm_predecessortask_value,
        })

        listItems.push({
          id: t.pm_projecttaskid!,
          projectName: project.pm_projectname || '',
          name: t.pm_taskname,
          date: taskStart,
          endDate: taskEnd,
          type: 'task' as const,
          status: t.pm_taskstatus,
          progress: t.pm_percentcomplete,
          resource: t.pm_assignedresource,
          onCriticalPath: isCritical(t.pm_oncriticalpath),
        })
      })

      projectMilestones.forEach(m => {
        if (showCriticalPathOnly) return
        totalMilestonesCount++
        const mDate = m.pm_planneddate || projStartStr

        finalMilestones.push({
          id: m.pm_projectmilestoneid!,
          name: `${m.pm_milestonename!} (${project.pm_projectname})`,
          date: mDate,
          status: String(m.pm_status),
        })

        listItems.push({
          id: m.pm_projectmilestoneid!,
          projectName: project.pm_projectname || '',
          name: m.pm_milestonename,
          date: mDate,
          type: 'milestone' as const,
          rag: m.pm_ragstatus,
          mType: m.pm_milestonetype,
          status: m.pm_status,
          resource: m.pm_responsible,
          onCriticalPath: false,
        })
      })
    }

    listItems.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      return dateA - dateB
    })

    const avgProgress = totalTasksCount > 0 ? Math.round(totalProgressSum / totalTasksCount) : 0

    return {
      ganttTasks: finalTasks,
      ganttMilestones: finalMilestones,
      stats: { totalTasksCount, avgProgress, totalMilestonesCount, completedTasksCount },
      timelineItems: listItems,
    }
  }, [filteredProjects, allTasksByProject, allMilestonesByProject, showCriticalPathOnly])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flexDirection: 'column', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Loading master schedule rollup...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color="error" variant="body2">{error}</Typography>
      </Box>
    )
  }

  if (projects.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">No projects linked to load schedule from.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Total Tasks" value={stats.totalTasksCount} icon={<AssignmentIcon />} color="primary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Rollup Progress" value={`${stats.avgProgress}%`} icon={<ViewWeekIcon />} color="info.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Milestones" value={stats.totalMilestonesCount} icon={<FlagIcon />} color="warning.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Completed Tasks" value={stats.completedTasksCount} icon={<FolderOpenIcon />} color="success.main" />
        </Grid>
      </Grid>

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Tabs value={activeView} onChange={(_, v) => setActiveView(v)}>
            <Tab label="Master Gantt Chart" icon={<ViewWeekIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Consolidated List" icon={<ListIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  color="error"
                  checked={showCriticalPathOnly}
                  onChange={(e) => setShowCriticalPathOnly(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Critical Path Only
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {stats.totalTasksCount} tasks &middot; {stats.totalMilestonesCount} milestones
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter Project</InputLabel>
              <Select
                value={selectedProjectFilter}
                label="Filter Project"
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                sx={{ borderRadius: 1.15 }}
              >
                <MenuItem value="all">All Projects</MenuItem>
                {projects.map(p => (
                  <MenuItem key={p.pm_projectid} value={p.pm_projectid}>{p.pm_projectname}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          {activeView === 0 ? (
            <Box sx={{ mt: 1 }}>
              {ganttTasks.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No schedule data to display.</Typography>
                </Box>
              ) : (
                <GanttChart tasks={ganttTasks} milestones={ganttMilestones} />
              )}
            </Box>
          ) : (
            <Table size="small">
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase', py: 1.5, pl: 3 }}>Project</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }}>Schedule Item</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }}>Responsible</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }} align="center">Progress / Date</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase', pr: 3 }} align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timelineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">No items in the consolidated schedule.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  timelineItems.map((item) => {
                    const overdue = item.type === 'task' && isOverdue(item.endDate) && String(item.status) !== '0'
                    return (
                      <TableRow key={item.id} hover sx={{
                        bgcolor: item.type === 'milestone'
                          ? (isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(245, 158, 11, 0.02)')
                          : item.onCriticalPath
                          ? (isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)')
                          : 'transparent',
                        borderLeft: item.onCriticalPath ? '3px solid #ef4444' : 'none',
                        '&:last-child td': { border: 0 },
                      }}>
                        <TableCell sx={{ pl: 3, fontWeight: 600 }}>
                          {item.projectName}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ mt: 0.5 }}>
                              {item.type === 'milestone' ? (
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main', mt: 0.5, border: '2px solid white', boxShadow: '0 0 0 2px ' + theme.palette.warning.main }} />
                              ) : (
                                <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: item.onCriticalPath ? 'error.light' : 'primary.light', mt: 0.5, opacity: 0.6 }} />
                              )}
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: item.type === 'milestone' ? 800 : 600, color: item.type === 'milestone' ? 'warning.dark' : item.onCriticalPath ? 'error.dark' : 'text.primary' }}>
                                {item.name}
                                {item.type === 'milestone' && (
                                  <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'rgba(245, 158, 11, 0.08)', color: 'warning.dark', fontWeight: 800, textTransform: 'uppercase', fontSize: fontSizes.xs }}>
                                    Milestone
                                  </Typography>
                                )}
                                {item.onCriticalPath && (
                                  <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'rgba(239, 68, 68, 0.08)', color: 'error.main', fontWeight: 800, textTransform: 'uppercase', fontSize: fontSizes.xs }}>
                                    Critical Path
                                  </Typography>
                                )}
                                {overdue && (
                                  <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'rgba(239, 68, 68, 0.08)', color: 'error.main', fontWeight: 800, textTransform: 'uppercase', fontSize: fontSizes.xs }}>
                                    Overdue
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.type === 'milestone'
                                  ? (item.mType === '1' || item.mType === 1 ? 'Governance Checkpoint' : 'Delivery Milestone')
                                  : 'Standard Task'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ color: item.resource ? 'text.primary' : 'text.disabled' }}>
                            {item.resource || 'Unassigned'}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          {item.type === 'task' ? (
                            <Box sx={{ minWidth: 140, px: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                  {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                                  {item.endDate && item.endDate !== item.date
                                    ? ` - ${new Date(item.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                    : ''}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: item.progress === 100 ? 'success.main' : overdue ? 'error.main' : 'primary.main' }}>
                                  {item.progress || 0}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={item.progress || 0}
                                sx={{
                                  height: 6,
                                  bgcolor: theme.palette.action.hover,
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: item.progress === 100 ? 'success.main' : overdue ? 'error.main' : 'primary.main',
                                  },
                                }}
                              />
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                              {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ pr: 3 }}>
                          {item.type === 'milestone' ? (
                            <StatusChip status={item.rag} type="rag" size="small" />
                          ) : (
                            <StatusTag
                              label={getStatusLabel(item.status)}
                              size="small"
                              color={getStatusColor(item.status)}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>
    </Box>
  )
}


