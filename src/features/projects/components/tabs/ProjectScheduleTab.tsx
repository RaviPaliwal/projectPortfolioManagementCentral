import React, { useMemo } from 'react'
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
  Button,
  useTheme,
  Stack,
  Divider,
} from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { StatusChip, StatusTag } from '@/components/common'
import type { ProjectMilestoneModel, ProjectTaskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface ProjectScheduleTabProps {
  milestones: ProjectMilestoneModel[]
  tasks: ProjectTaskModel[]
  onAddMilestone?: () => void
  onAddTask?: () => void
}

export const ProjectScheduleTab: React.FC<ProjectScheduleTabProps> = ({ milestones, tasks, onAddMilestone, onAddTask }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Combine and sort by planned date
  const timelineItems = useMemo(() => {
    const items = [
      ...milestones.map(m => ({
        id: m.pm_projectmilestoneid,
        name: m.pm_milestonename,
        date: m.pm_planneddate,
        type: 'milestone' as const,
        rag: m.pm_ragstatus,
        mType: m.pm_milestonetype,
      })),
      ...tasks.filter(t => !t.pm_ismilestone).map(t => ({
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
    <Box sx={{ pt: 1 }}>
      {/* ── Action Buttons ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {onAddMilestone && (
          <Button size="small" variant="outlined" startIcon={<FlagIcon />} onClick={onAddMilestone}>Add Milestone</Button>
        )}
        {onAddTask && (
          <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={onAddTask}>Add Task</Button>
        )}
      </Box>
      {/* ── Integrated Project Timeline ── */}
      <Box>
        <Stack component="div" direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
          <Box sx={{ width: 40, height: 40, bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Project Execution Timeline</Typography>
            <Typography variant="caption" color="text.secondary">Chronological view of all tasks and critical milestones</Typography>
          </Box>
        </Stack>
        
        <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
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
                          label={String((item as any).status) === '0' ? 'Not Started' : String((item as any).status) === '1' ? 'In Progress' : String((item as any).status) === '2' ? 'Complete' : '—'}
                          size="small"
                          color={String((item as any).status) === '2' ? 'success' : String((item as any).status) === '1' ? 'info' : 'default'}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  )
}
