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
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { StatusTag } from '@/components/common'

interface ProjectTeamTabProps {
  resources: any[]
  tasks?: any[]
  onEdit?: (resource: any) => void
  onComplete?: (resource: any) => void
}

export const ProjectTeamTab: React.FC<ProjectTeamTabProps> = ({ 
  resources, 
  tasks = [], 
  onEdit, 
  onComplete 
}) => {
  const [anchorEl, setAnchorEl] = useState<{ element: HTMLElement | null, resource: any | null }>({ element: null, resource: null })
  const [expandedAllocIds, setExpandedAllocIds] = useState<Record<string, boolean>>({})

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

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Allocated Resources</Typography>
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
                            py: 0.25,
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
                            {task.pm_percentcomplete !== undefined && (
                              <Typography variant="caption" sx={{ fontWeight: 600, color: isComplete ? 'success.main' : 'text.secondary' }}>
                                {task.pm_percentcomplete}%
                              </Typography>
                            )}
                            <StatusTag
                              label={isComplete ? 'Complete' : String(task.pm_taskstatus) === '1' ? 'In Progress' : 'Not Started'}
                              size="small"
                              color={isComplete ? 'success' : String(task.pm_taskstatus) === '1' ? 'info' : 'default'}
                            />
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
    </Box>
  )
}
