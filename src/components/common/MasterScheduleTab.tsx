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
  useTheme,
  Grid,
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

export const MasterScheduleTab: React.FC<MasterScheduleTabProps> = ({ projects }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  
  const [activeView, setActiveView] = useState(0)
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Loaded raw data
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
            } catch (err) {
              console.error(`Failed to load schedule for project ${project.pm_projectname}:`, err)
              tasksMap[project.pm_projectid] = []
              milestonesMap[project.pm_projectid] = []
            }
          })
        )

        setAllTasksByProject(tasksMap)
        setAllMilestonesByProject(milestonesMap)
      } catch (err) {
        setError('Failed to load project schedules.')
      } finally {
        setLoading(false)
      }
    }

    loadAllSchedules()
  }, [projects])

  // Filter projects based on dropdown selection
  const filteredProjects = useMemo(() => {
    if (selectedProjectFilter === 'all') return projects
    return projects.filter(p => p.pm_projectid === selectedProjectFilter)
  }, [projects, selectedProjectFilter])

  // Process tasks & milestones for Gantt chart
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

      // Calculate project task dates
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

      const projStartStr = earliestStart ? (earliestStart as Date).toISOString().split('T')[0] : (project.pm_plannedstartdate || new Date().toISOString().split('T')[0])
      const projEndStr = latestEnd ? (latestEnd as Date).toISOString().split('T')[0] : (project.pm_plannedenddate || new Date().toISOString().split('T')[0])

      // 1. Add a Project Grouping Task (level 1)
      const projectGroupId = `proj-group-${pid}`
      finalTasks.push({
        id: projectGroupId,
        name: `📁 Project: ${project.pm_projectname}`,
        startDate: projStartStr,
        endDate: projEndStr,
        percentComplete: projectTasks.length > 0 
          ? Math.round(projectTasks.reduce((acc, t) => acc + (t.pm_percentcomplete ?? 0), 0) / projectTasks.length) 
          : 0,
        level: 1,
        status: '1',
      })

      // 2. Add Project Tasks (level 2)
      projectTasks.forEach(t => {
        totalTasksCount++
        if (String(t.pm_taskstatus) === '0') completedTasksCount++
        totalProgressSum += t.pm_percentcomplete ?? 0

        // Ensure tasks have valid start/end dates
        const taskStart = t.pm_plannedstartdate || projStartStr
        const taskEnd = t.pm_plannedenddate || taskStart

        finalTasks.push({
          id: t.pm_projecttaskid!,
          name: t.pm_taskname!,
          startDate: taskStart,
          endDate: taskEnd,
          percentComplete: t.pm_percentcomplete ?? 0,
          status: String(t.pm_taskstatus),
          level: (t.pm_tasklevel ?? 1) + 1, // Shift level down to nest under project header
          wbs: t.pm_wbsnumber,
          onCriticalPath: !!t.pm_oncriticalpath,
          predecessorId: t._pm_predecessortask_value,
        })

        // Add to detailed list view
        listItems.push({
          id: t.pm_projecttaskid!,
          projectName: project.pm_projectname || '—',
          name: t.pm_taskname,
          date: taskStart,
          endDate: taskEnd,
          type: 'task' as const,
          status: t.pm_taskstatus,
          progress: t.pm_percentcomplete,
          resource: t.pm_assignedresource,
        })
      })

      // 3. Add Milestones
      projectMilestones.forEach(m => {
        totalMilestonesCount++
        const mDate = m.pm_planneddate || projStartStr
        
        finalMilestones.push({
          id: m.pm_projectmilestoneid!,
          name: `${m.pm_milestonename!} (${project.pm_projectname})`,
          date: mDate,
          status: String(m.pm_status),
        })

        // Add to detailed list view
        listItems.push({
          id: m.pm_projectmilestoneid!,
          projectName: project.pm_projectname || '—',
          name: m.pm_milestonename,
          date: mDate,
          type: 'milestone' as const,
          rag: m.pm_ragstatus,
          mType: m.pm_milestonetype,
          status: m.pm_status,
          resource: m.pm_responsible,
        })
      })
    }

    // Sort list items by date
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
      timelineItems: listItems
    }
  }, [filteredProjects, allTasksByProject, allMilestonesByProject])

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
      {/* ── Schedule Stats Ribbon ── */}
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

      {/* Filter and toggle */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Tabs value={activeView} onChange={(_, v) => setActiveView(v)}>
            <Tab label="Master Gantt Chart" icon={<ViewWeekIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Consolidated List" icon={<ListIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                <GanttChart tasks={ganttTasks} milestones={ganttMilestones} height={550} />
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
                  timelineItems.map((item) => (
                    <TableRow key={item.id} hover sx={{ 
                      bgcolor: item.type === 'milestone' ? (isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(245, 158, 11, 0.02)') : 'transparent',
                      '&:last-child td': { border: 0 } 
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
                              <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: 'primary.light', mt: 0.5, opacity: 0.6 }} />
                            )}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: item.type === 'milestone' ? 800 : 600, color: item.type === 'milestone' ? 'warning.dark' : 'text.primary' }}>
                              {item.name}
                              {item.type === 'milestone' && (
                                <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'rgba(245, 158, 11, 0.08)', color: 'warning.dark', fontWeight: 800, textTransform: 'uppercase', fontSize: fontSizes.xs }}>
                                  Milestone
                                </Typography>
                              )}
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
                          <Typography variant="body2">
                            {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                            {item.endDate ? ` to ${new Date(item.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                            {` (${item.progress || 0}%)`}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ pr: 3 }}>
                        {item.type === 'milestone' ? (
                          <StatusChip status={(item as any).rag} type="rag" size="small" />
                        ) : (
                          <StatusTag
                            label={String((item as any).status) === '0' ? 'Complete' : String((item as any).status) === '1' ? 'In Progress' : 'Not Started'}
                            size="small"
                            color={String((item as any).status) === '0' ? 'success' : String((item as any).status) === '1' ? 'info' : 'default'}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
