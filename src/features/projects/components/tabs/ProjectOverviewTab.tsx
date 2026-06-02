import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Paper,
} from '@mui/material'
import type { ProjectModel } from '@/types/dataverse'
import { phaseLabel } from '../../constants'

interface ProjectOverviewTabProps {
  project: ProjectModel
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ project }) => {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Project Details</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Project Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{project.pm_projectname}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Project Code</Typography>
              <Typography variant="body1">{project.pm_projectcode || '—'}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Phase</Typography>
              <Typography variant="body1">{phaseLabel(project.pm_projectphase)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Project Manager</Typography>
              <Typography variant="body1">{project.pm_projectmanager || 'Unassigned'}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Sponsor</Typography>
              <Typography variant="body1">{project.pm_projectsponsor || '—'}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Business Unit</Typography>
              <Typography variant="body1">{project.pm_businessunit || '—'}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
           <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
             <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Portfolio</Typography>
                  <Typography variant="body1">{project.pm_portfolioname || '—'}</Typography>
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Programme</Typography>
                  <Typography variant="body1">{project.pm_programmename || '—'}</Typography>
               </Grid>
             </Grid>
           </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
