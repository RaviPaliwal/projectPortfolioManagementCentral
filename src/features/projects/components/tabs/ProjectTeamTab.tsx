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
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { StatusTag } from '@/components/common'

interface ProjectTeamTabProps {
  resources: any[]
  onEdit?: (resource: any) => void
  onComplete?: (resource: any) => void
}

export const ProjectTeamTab: React.FC<ProjectTeamTabProps> = ({ resources, onEdit, onComplete }) => {
  const [anchorEl, setAnchorEl] = useState<{ element: HTMLElement | null, resource: any | null }>({ element: null, resource: null })

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

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Allocated Resources</Typography>
      {resources.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {resources.map((alloc: any) => (
            <Paper key={alloc.pm_resourceallocationid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{alloc['_pm_resource_value@OData.Community.Display.V1.FormattedValue'] ?? alloc._pm_resource_value ?? 'Unknown resource'}</Typography>
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
                  {alloc.pm_startdate ? new Date(alloc.pm_startdate).toLocaleDateString() : '—'} — {alloc.pm_enddate ? new Date(alloc.pm_enddate).toLocaleDateString() : '—'}
                </Typography>
                {(onEdit || onComplete) && (
                  <IconButton size="small" onClick={(e) => handleOpenMenu(e, alloc)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Paper>
          ))}
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
