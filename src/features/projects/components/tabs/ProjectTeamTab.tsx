import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Button,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PeopleIcon from '@mui/icons-material/People'
import { StatusTag } from '@/components/common'
import { useUser } from '@/context/UserContext'

interface ProjectTeamTabProps {
  resources: any[]
  tasks?: any[]
  onEdit?: (resource: any) => void
  onComplete?: (resource: any) => void
  onEditTask?: (task: any) => void
  onUpdateTaskStatus?: (taskId: string, status: string, percent: number) => Promise<void>
  onAssignResource?: () => void
}

export const ProjectTeamTab: React.FC<ProjectTeamTabProps> = ({
  resources,
  tasks = [],
  onEdit,
  onComplete,
  onEditTask,
  onUpdateTaskStatus,
  onAssignResource
}) => {
  const { currentUserPersona } = useUser()
  const isManager = ['PMO', 'ProjectManager', 'SystemAdministrator'].includes(currentUserPersona)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  const [anchorEl, setAnchorEl] = useState<{ element: HTMLElement | null, resource: any | null }>({ element: null, resource: null })
  const [expandedAllocIds, setExpandedAllocIds] = useState<Record<string, boolean>>({})
  const [taskStatusMenuAnchor, setTaskStatusMenuAnchor] = useState<{ element: HTMLElement | null, task: any | null }>({ element: null, task: null })

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, resource: any) => {
    setAnchorEl({ element: event.currentTarget, resource })
  }

  const handleCloseMenu = () => {
    setAnchorEl({ element: null, resource: null })
  }

  const handleEditClick = () => {
    if (onEdit && anchorEl.resource) onEdit(anchorEl.resource)
    handleCloseMenu()
  }

  const handleCompleteClick = () => {
    if (onComplete && anchorEl.resource) onComplete(anchorEl.resource)
    handleCloseMenu()
  }

  const toggleExpand = (allocId: string) => {
    setExpandedAllocIds(prev => ({ ...prev, [allocId]: !prev[allocId] }))
  }

  const handleTaskStatusTagClick = (event: React.MouseEvent<HTMLElement>, task: any) => {
    if (!isManager) return
    setTaskStatusMenuAnchor({ element: event.currentTarget, task })
  }

  const handleTaskStatusSelect = async (status: string) => {
    const task = taskStatusMenuAnchor.task
    setTaskStatusMenuAnchor({ element: null, task: null })
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ fontSize: 20, color: 'primary.main' }} /> Allocated Resources
        </Typography>
        {onAssignResource && (
          <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={onAssignResource}>Resource</Button>
        )}
      </Box>

      {resources.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {resources.map((alloc: any) => {
            const resourceName = alloc['_pm_resource_value@OData.Community.Display.V1.FormattedValue'] || alloc.pm_resourcename || '';
            const matchedTasks = tasks.filter(t =>
              !t.pm_ismilestone &&
              t.pm_assignedresource &&
              resourceName &&
              t.pm_assignedresource.toLowerCase().trim() === resourceName.toLowerCase().trim()
            );
            const isExpanded = !!expandedAllocIds[alloc.pm_resourceallocationid];

            return (
              <Paper
                key={alloc.pm_resourceallocationid}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                  }
                }}
              >
                {/* Main Resource Info row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{resourceName || 'Unknown resource'}</Typography>
                      <StatusTag
                        label={String(alloc.pm_assignmentstatus) === '1' ? 'Completed' : 'Active'}
                        size="small"
                        color={String(alloc.pm_assignmentstatus) === '1' ? 'success' : 'primary'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{alloc.pm_assignmentrole ?? '—'} &middot; {alloc.pm_allocatedhours ?? 0}h allocated</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {alloc.pm_startdate ? new Date(alloc.pm_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} — {alloc.pm_enddate ? new Date(alloc.pm_enddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>

                    {/* Expand Tasks button */}
                    {matchedTasks.length > 0 ? (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => toggleExpand(alloc.pm_resourceallocationid)}
                        endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                      >
                        {matchedTasks.length} task{matchedTasks.length !== 1 ? 's' : ''}
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.78rem', px: 1 }}>
                        0 tasks
                      </Typography>
                    )}

                    {(onEdit || onComplete) && (
                      <IconButton size="small" onClick={(e) => handleOpenMenu(e, alloc)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {/* Collapsible Tasks List */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pl: 1.5, borderLeft: '2px solid', borderColor: 'primary.light' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Assigned Tasks
                    </Typography>
                    {matchedTasks.map(task => {
                      const isComplete = String(task.pm_taskstatus) === '0'
                      return (
                        <Box
                          key={task.pm_projecttaskid}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 0.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { border: 0 },
                            opacity: isComplete ? 0.65 : 1
                          }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1, pr: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 550, textDecoration: isComplete ? 'line-through' : 'none' }}>
                              {task.pm_taskname}
                            </Typography>
                            {task.pm_taskdescription && task.pm_taskdescription !== task.pm_taskname && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.1 }}>
                                {task.pm_taskdescription}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {updatingTaskId === task.pm_projecttaskid && (
                              <CircularProgress size={14} color="inherit" />
                            )}
                            {task.pm_percentcomplete !== undefined && (
                              <Typography variant="caption" sx={{ fontWeight: 600, color: isComplete ? 'success.main' : 'text.secondary' }}>
                                {task.pm_percentcomplete}%
                              </Typography>
                            )}
                            <Tooltip title={isManager ? "Change Status" : ""}>
                              <span>
                                <StatusTag
                                  label={isComplete ? 'Complete' : String(task.pm_taskstatus) === '1' ? 'In Progress' : 'Not Started'}
                                  size="small"
                                  color={isComplete ? 'success' : String(task.pm_taskstatus) === '1' ? 'info' : 'default'}
                                  onClick={isManager ? (e) => handleTaskStatusTagClick(e, task) : undefined}
                                  sx={{
                                    cursor: isManager ? 'pointer' : 'default',
                                    '&:hover': isManager ? { opacity: 0.8 } : {}
                                  }}
                                />
                              </span>
                            </Tooltip>

                            {isManager && (
                              <Tooltip title="Edit Task Details">
                                <IconButton
                                  size="small"
                                  onClick={() => onEditTask?.(task)}
                                  disabled={updatingTaskId === task.pm_projecttaskid}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    p: 0.4,
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                </Collapse>
              </Paper>
            )
          })}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No resources assigned yet. Use the Actions bar above to assign one.
        </Typography>
      )}

      <Menu
        anchorEl={anchorEl.element}
        open={Boolean(anchorEl.element)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Allocation</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCompleteClick} disabled={String(anchorEl.resource?.pm_assignmentstatus) === '1'}>
          <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Mark as Completed</ListItemText>
        </MenuItem>
      </Menu>

      {/* Task Quick Status Selector Menu */}
      <Menu
        anchorEl={taskStatusMenuAnchor.element}
        open={Boolean(taskStatusMenuAnchor.element)}
        onClose={() => setTaskStatusMenuAnchor({ element: null, task: null })}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleTaskStatusSelect('2')}>Not Started</MenuItem>
        <MenuItem onClick={() => handleTaskStatusSelect('1')}>In Progress</MenuItem>
        <MenuItem onClick={() => handleTaskStatusSelect('0')}>Complete</MenuItem>
      </Menu>
    </Box>
  )
}
