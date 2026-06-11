import { Box, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress, Typography, useTheme, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import FlagIcon from '@mui/icons-material/Flag'
import LinkIcon from '@mui/icons-material/Link'
import type { ProjectTaskModel } from '@/types/dataverse'
import { ActionIcon, StatusTag, TableShell, Button } from '@/components/common'
import AddIcon from '@mui/icons-material/Add'
import { formatDate } from '@/utils/formatters'

interface TaskListViewProps {
  tasks: ProjectTaskModel[]
  loading: boolean
  onEditTask: (task: ProjectTaskModel) => void
  onSelectTask: (task: ProjectTaskModel) => void
  statusLabels: Record<string, string>
  statusColors: Record<string, string>
}

const getTaskLevelColor = (level?: number): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4']
  return colors[Math.min((level ?? 1) - 1, colors.length - 1)]
}

const getWbsPrefix = (level?: number): string => {
  if (!level || level <= 1) return ''
  return '\u00A0\u00A0\u00A0\u00A0'.repeat(level - 1)
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  loading,
  onEditTask,
  onSelectTask,
  statusLabels,
  statusColors,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const taskById = new Map(tasks.map(t => [t.pm_projecttaskid, t]))
  
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <TableShell
        loading={loading}
        empty={tasks.length === 0}
        emptyTitle="No tasks found."
      >
        <Table size="small">
          <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            <TableCell sx={{ fontWeight: 700, width: 80 }}>WBS</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Task Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Start</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>End</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 140 }}>Progress</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 40 }}><LinkIcon sx={{ fontSize: 18 }} /></TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task, idx) => {
            const level = task.pm_tasklevel || 1
            const indent = getWbsPrefix(level)
            const predTask = task._pm_predecessortask_value ? taskById.get(task._pm_predecessortask_value) : null
            const isOverdue = !(String(task.pm_taskstatus) === '0') && task.pm_plannedenddate && new Date(task.pm_plannedenddate) < new Date()

            return (
              <TableRow 
                key={task.pm_projecttaskid} 
                hover 
                onClick={() => onSelectTask(task)} 
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: idx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') : 'transparent'
                }}
              >
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: getTaskLevelColor(level) }}>
                    {indent}{task.pm_wbsnumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: level === 1 ? 700 : 500 }}>
                      {indent}{task.pm_taskname}
                    </Typography>
                    {task.pm_ismilestone && <FlagIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{task.pm_assignedresource || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{formatDate(task.pm_plannedstartdate)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: isOverdue ? 'error.main' : 'text.secondary', fontWeight: isOverdue ? 700 : 400 }}>
                    {formatDate(task.pm_plannedenddate)}{isOverdue && ' !'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={task.pm_percentcomplete ?? 0}
                      sx={{ 
                        flex: 1, 
                        height: 6, 
                        borderRadius: 1,
                        bgcolor: theme.palette.action.hover,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: (task.pm_percentcomplete ?? 0) >= 100 ? 'success.main' : 'primary.main',
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 28 }}>{task.pm_percentcomplete ?? 0}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <StatusTag
                    label={statusLabels[String(task.pm_taskstatus)] || 'Unknown'}
                    color={statusColors[String(task.pm_taskstatus)] as any || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {predTask ? (
                    <Tooltip title={`Predecessor: ${predTask.pm_taskname}`}>
                      <LinkIcon sx={{ fontSize: 16, color: 'primary.main', opacity: 0.6 }} />
                    </Tooltip>
                  ) : '—'}
                </TableCell>
                <TableCell align="right">
                  <ActionIcon
                    icon={<EditIcon />}
                    onClick={() => onEditTask(task)}
                    label="Edit Task"
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </TableShell>
    </Box>
  )
}
