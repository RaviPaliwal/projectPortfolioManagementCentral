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
  useTheme
} from '@mui/material'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssignmentIcon from '@mui/icons-material/Assignment'

import { useUser } from '@/context/UserContext'
import { StatusTag } from '@/components/common'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { ProjectModel, ProjectTaskModel } from '@/types/dataverse'

interface ProjectTasksTabProps {
  project: ProjectModel
  tasks: ProjectTaskModel[]
  onMarkTaskAsDone?: (taskId: string) => Promise<void>
}

export const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({
  project,
  tasks,
  onMarkTaskAsDone
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUserPersona } = useUser()
  const [activeSubTab, setActiveSubTab] = useState(0)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

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

  // Filter tasks to only standard tasks (excluding milestones)
  const projectTasks = tasks.filter(t => !t.pm_ismilestone)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Tabs
        value={activeSubTab}
        onChange={(_, v) => setActiveSubTab(v)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 36,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            minHeight: 36,
            py: 0.75,
            px: 2
          }
        }}
      >
        <Tab icon={<HourglassEmptyIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Approval Tasks" />
        <Tab icon={<AssignmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Project Tasks (${projectTasks.length})`} />
      </Tabs>

      {activeSubTab === 0 && (
        <EntityApprovalTasks
          entityId={project.pm_projectid ?? ''}
          moduleName={MODULE_NAMES.PROJECTS.value}
          entityLabel="Project"
          tabValue={0}
          index={0}
        />
      )}

      {activeSubTab === 1 && (
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
                        bgcolor: idx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)') : 'transparent',
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
                        <StatusTag
                          label={isComplete ? 'Complete' : String(task.pm_taskstatus) === '1' ? 'In Progress' : 'Not Started'}
                          size="small"
                          color={isComplete ? 'success' : String(task.pm_taskstatus) === '1' ? 'info' : 'default'}
                        />
                      </TableCell>
                      {canMarkAsDone && (
                        <TableCell align="right" sx={{ pr: 3 }}>
                          {!isComplete ? (
                            <Tooltip title="Mark as Done">
                              <IconButton
                                size="small"
                                color="success"
                                disabled={updatingTaskId === task.pm_projecttaskid}
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
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  )
}
