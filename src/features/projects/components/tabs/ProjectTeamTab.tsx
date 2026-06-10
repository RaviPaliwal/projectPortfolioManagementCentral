import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'

interface ProjectTeamTabProps {
  resources: any[]
  onAssignResource?: () => void
}

export const ProjectTeamTab: React.FC<ProjectTeamTabProps> = ({ resources, onAssignResource }) => {
  return (
    <Box>
      {onAssignResource && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={onAssignResource}>Assign Resource</Button>
        </Box>
      )}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Allocated Resources</Typography>
      {resources.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {resources.map((alloc: any) => (
            <Paper key={alloc.pm_resourceallocationid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{alloc['_pm_resource_value@OData.Community.Display.V1.FormattedValue'] ?? alloc._pm_resource_value ?? 'Unknown resource'}</Typography>
                <Typography variant="caption" color="text.secondary">{alloc.pm_assignmentrole ?? '—'} &middot; {alloc.pm_allocatedhours ?? 0}h allocated</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {alloc.pm_startdate ? new Date(alloc.pm_startdate).toLocaleDateString() : '—'} — {alloc.pm_enddate ? new Date(alloc.pm_enddate).toLocaleDateString() : '—'}
              </Typography>
            </Paper>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No resources assigned yet. Use the Actions bar above to assign one.
        </Typography>
      )}
    </Box>
  )
}
