import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
  useTheme,
  Stack,
  Divider,
  Tabs,
  Tab,
  Grid,
} from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import ListIcon from '@mui/icons-material/List'
import { StatusChip, StatusTag, MetricTile } from '@/components/common'
import GanttChart from '@/components/common/GanttChart/GanttChart'
import type { ProjectMilestoneModel, ProjectTaskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface ProjectScheduleTabProps {
  milestones: ProjectMilestoneModel[]
  tasks: ProjectTaskModel[]
}

export const ProjectScheduleTab: React.FC<ProjectScheduleTabProps> = ({ milestones, tasks }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [activeView, setActiveView] = useState(0)

  // Map to Gantt formats
  const ganttTasks = useMemo(() => tasks.map(t => ({
    id: t.pm_projecttaskid!,
    name: t.pm_taskname!,
    startDate: t.pm_plannedstartdate!,
    endDate: t.pm_plannedenddate!,
    percentComplete: t.pm_percentcomplete ?? 0,
    status: String(t.pm_taskstatus),
    level: t.pm_tasklevel ?? 1,
    wbs: t.pm_wbsnumber,
    onCriticalPath: !!t.pm_oncriticalpath,
    predecessorId: t._pm_predecessortask_value,
  })), [tasks])

  const ganttMilestones = useMemo(() => milestones.map(m => ({
    id: m.pm_projectmilestoneid!,
    name: m.pm_milestonename!,
    date: m.pm_planneddate!,
    status: String(m.pm_status),
  })), [milestones])

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => String(t.pm_taskstatus) === '0').length
    const avgProgress = total > 0 ? Math.round(tasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / total) : 0
    const upcomingMilestones = milestones.filter(m => m.pm_planneddate && new Date(m.pm_planneddate) >= new Date()).length

    return { total, completed, avgProgress, upcomingMilestones }
  }, [tasks, milestones])

  // Combine and sort by planned date for the list view
  const timelineItems = useMemo(() => {
    const items = [
      ...milestones.map(m => ({
        id: m.pm_projectmilestoneid,
        name: m.pm_milestonename,
        date: m.pm_planneddate,
        type: 'milestone' as const,
        rag: m.pm_ragstatus,
        mType: m.pm_milestonetype,
        status: m.pm_status,
      })),
      ...tasks.map(t => ({
        id: t.pm_projecttaskid,
        name: t.pm_taskname,
        date: t.pm_plannedstartdate,
        endDate: t.pm_plannedenddate,
        type: 'task' as const,
        status: t.pm_taskstatus,
        progress: t.pm_percentcomplete,
        resource: t.pm_assignedresource,
      }))
    ]
    return items.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      return dateA - dateB
    })
  }, [milestones, tasks])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Schedule Stats ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Total Tasks" value={stats.total} icon={<AssignmentIcon />} color="primary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Avg. Progress" value={`${stats.avgProgress}%`} icon={<ViewWeekIcon />} color="info.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Milestones" value={milestones.length} icon={<FlagIcon />} color="warning.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Completed" value={stats.completed} icon={<AssignmentIcon />} color="success.main" />
        </Grid>
      </Grid>

      {/* ── View Toggle ── */}
      <Paper sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs value={activeView} onChange={(_, v) => setActiveView(v)}>
            <Tab label="Gantt Chart" icon={<ViewWeekIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Detailed List" icon={<ListIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 2 }}>
            {tasks.length} tasks · {milestones.length} milestones
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          {activeView === 0 ? (
            <Box sx={{ mt: 1 }}>
              <GanttChart tasks={ganttTasks} milestones={ganttMilestones} height={500} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase', py: 1.5, pl: 3 }}>Schedule Item</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }}>Responsible</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }} align="center">Progress / Date</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase', pr: 3 }} align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timelineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 8, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">No items in the project schedule.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  timelineItems.map((item) => (
                    <TableRow key={item.id} hover sx={{ 
                      bgcolor: item.type === 'milestone' ? (isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(245, 158, 11, 0.02)') : 'transparent',
                      '&:last-child td': { border: 0 } 
                    }}>
                      <TableCell sx={{ pl: 3 }}>
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
                                <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'warning.lighter', color: 'warning.dark', borderRadius: 1, fontWeight: 800, textTransform: 'uppercase', fontSize: 9 }}>
                                  Milestone
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.type === 'milestone' ? (
                                item.mType === '1' || item.mType === 1 ? 'Governance Checkpoint' : 'Delivery Milestone'
                              ) : (
                                'Standard Task'
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" sx={{ color: item.type === 'task' && (item as any).resource ? 'text.primary' : 'text.disabled' }}>
                          {item.type === 'task' ? ((item as any).resource || 'Unassigned') : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {item.type === 'task' ? (
                          <Box sx={{ minWidth: 120, px: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: (item as any).progress === 100 ? 'success.main' : 'primary.main' }}>
                                {(item as any).progress || 0}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={(item as any).progress || 0} 
                              sx={{ height: 6, borderRadius: 1.5, bgcolor: theme.palette.action.hover, '& .MuiLinearProgress-bar': { borderRadius: 1.5, bgcolor: (item as any).progress === 100 ? 'success.main' : 'primary.main' } }} 
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
