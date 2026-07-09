import React, { useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  Menu,
  MenuItem
} from '@mui/material'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssignmentIcon from '@mui/icons-material/Assignment'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

import { useUser } from '@/context/UserContext'
import { StatusTag } from '@/components/common'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { ProjectModel, ProjectTaskModel } from '@/types/dataverse'

import { Button } from '@mui/material'

interface ProjectTasksTabProps {
  project: ProjectModel
  tasks: ProjectTaskModel[]
  onMarkTaskAsDone?: (taskId: string) => Promise<void>
  onEditTask?: (task: ProjectTaskModel) => void
  onUpdateTaskStatus?: (taskId: string, status: string, percent: number) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
  onAddTask?: () => void
}

export const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({
  project,
  tasks,
  onMarkTaskAsDone,
  onEditTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onAddTask
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUserPersona } = useUser()
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ element: HTMLElement | null, task: ProjectTaskModel | null }>({ element: null, task: null })

  // Only PMO, ProjectManager, or SystemAdministrator can mark standard tasks as complete
  const canMarkAsDone = ['PMO', 'ProjectManager', 'SystemAdministrator'].includes(currentUserPersona)

  const handleMarkAsDoneClick = async (taskId: string) => {
    if (!onMarkTaskAsDone) return
    setUpdatingTaskId(taskId)
    try {
      await onMarkTaskAsDone(taskId)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const handleDeleteTaskClick = async (taskId: string) => {
    if (!onDeleteTask) return
    if (!window.confirm('Are you sure you want to delete this task?')) return
    setDeletingTaskId(taskId)
    try {
      await onDeleteTask(taskId)
    } finally {
      setDeletingTaskId(null)
    }
  }

  const handleStatusTagClick = (event: React.MouseEvent<HTMLElement>, task: ProjectTaskModel) => {
    if (!canMarkAsDone) return
    setStatusMenuAnchor({ element: event.currentTarget, task })
  }

  const handleStatusSelect = async (status: string) => {
    const task = statusMenuAnchor.task
    setStatusMenuAnchor({ element: null, task: null })
    if (!task || !onUpdateTaskStatus) return
    
    let percent = 0
    if (status === '0') {
      percent = 100
    } else if (status === '1') {
      percent = task.pm_percentcomplete && task.pm_percentcomplete > 0 && task.pm_percentcomplete < 100 
        ? task.pm_percentcomplete 
        : 50
    }
    
    setUpdatingTaskId(task.pm_projecttaskid!)
    try {
      await onUpdateTaskStatus(task.pm_projecttaskid!, status, percent)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  // Filter tasks to only standard tasks (excluding milestones)
  const projectTasks = tasks.filter(t => !t.pm_ismilestone)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Action Buttons */}
      {onAddTask && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: -2 }}>
          <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={onAddTask}>Task</Button>
        </Box>
      )}

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 1.5, pl: 3 }}>Task Name</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Assigned Resource</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }} align="center">Progress</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }} align="center">Status</TableCell>
                {canMarkAsDone && <TableCell sx={{ fontWeight: 700, py: 1.5, pr: 3 }} align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {projectTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canMarkAsDone ? 5 : 4} sx={{ py: 6, textAlign: 'center' }}>
                    <AssignmentIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No project tasks found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                projectTasks.map((task, idx) => {
                  const isComplete = String(task.pm_taskstatus) === '0'
                  const progress = task.pm_percentcomplete ?? 0
                  
                  return (
                    <TableRow
                      key={task.pm_projecttaskid}
                      hover
                      sx={{
                        bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                        '&:last-child td': { border: 0 }
                      }}
                    >
                      <TableCell sx={{ pl: 3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isComplete ? 'text.disabled' : 'text.primary' }}>
                          {task.pm_taskname}
                        </Typography>
                        {task.pm_taskdescription && task.pm_taskdescription !== task.pm_taskname && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {task.pm_taskdescription}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: task.pm_assignedresource ? 'text.primary' : 'text.disabled' }}>
                          {task.pm_assignedresource || 'Unassigned'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Box sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: isDark ? 'grey.800' : 'grey.200', overflow: 'hidden' }}>
                            <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: isComplete ? 'success.main' : 'primary.main', borderRadius: 3 }} />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 30 }}>{progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={canMarkAsDone ? "Change Status" : ""}>
                          <span>
                            <StatusTag
                              label={isComplete ? 'Complete' : String(task.pm_taskstatus) === '1' ? 'In Progress' : 'Not Started'}
                              size="small"
                              color={isComplete ? 'success' : String(task.pm_taskstatus) === '1' ? 'info' : 'default'}
                              onClick={canMarkAsDone ? (e) => handleStatusTagClick(e, task) : undefined}
                              sx={{
                                cursor: canMarkAsDone ? 'pointer' : 'default',
                                '&:hover': canMarkAsDone ? { opacity: 0.8 } : {}
                              }}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      {canMarkAsDone && (
                        <TableCell align="right" sx={{ pr: 3 }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Tooltip title="Edit Task Details">
                              <IconButton
                                size="small"
                                onClick={() => onEditTask?.(task)}
                                disabled={updatingTaskId === task.pm_projecttaskid}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>

                            {!isComplete ? (
                              <Tooltip title="Mark as Done">
                                <IconButton
                                  size="small"
                                  color="success"
                                  disabled={updatingTaskId === task.pm_projecttaskid || deletingTaskId === task.pm_projecttaskid}
                                  onClick={() => handleMarkAsDoneClick(task.pm_projecttaskid!)}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'success.light',
                                    '&:hover': { bgcolor: 'success.lighter' }
                                  }}
                                >
                                  {updatingTaskId === task.pm_projecttaskid ? (
                                    <CircularProgress size={16} color="inherit" />
                                  ) : (
                                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                                  )}
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Completed">
                                <span>
                                  <IconButton size="small" disabled sx={{ color: 'text.disabled' }}>
                                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}

                            <Tooltip title="Delete Task">
                              <IconButton
                                size="small"
                                color="error"
                                disabled={updatingTaskId === task.pm_projecttaskid || deletingTaskId === task.pm_projecttaskid}
                                onClick={() => handleDeleteTaskClick(task.pm_projecttaskid!)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'error.light',
                                  '&:hover': { bgcolor: 'error.lighter' }
                                }}
                              >
                                {deletingTaskId === task.pm_projecttaskid ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Paper>

      {/* Quick Status Selector Menu */}
      <Menu
        anchorEl={statusMenuAnchor.element}
        open={Boolean(statusMenuAnchor.element)}
        onClose={() => setStatusMenuAnchor({ element: null, task: null })}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleStatusSelect('2')}>Not Started</MenuItem>
        <MenuItem onClick={() => handleStatusSelect('1')}>In Progress</MenuItem>
        <MenuItem onClick={() => handleStatusSelect('0')}>Complete</MenuItem>
      </Menu>
    </Box>
  )
}
