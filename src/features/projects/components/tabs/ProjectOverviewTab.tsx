import React from 'react'
import {
  Box,
  Typography,
  Paper,
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'

import type { ProjectModel } from '@/types/dataverse'
import { phaseLabel } from '../../constants'
import { StatusChip } from '@/components/common'
import { fontSizes } from '@/styles'

interface ProjectOverviewTabProps {
  project: ProjectModel
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ project }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Left column — Key Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.primary' }}>
            <DescriptionIcon sx={{ fontSize: 16, color: 'primary.main' }} /> Project Metadata
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: fontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Phase
              </Typography>
              <StatusChip status={project.pm_projectphase} type="phase" size="medium" />
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: fontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Project Manager
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_projectmanager || 'Unassigned'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: fontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Sponsor
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_projectsponsor || '—'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: fontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Business Unit
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_businessunit || '—'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: fontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Portfolio
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_portfolioname || '—'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, fontSize: fontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Programme
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_programmename || '—'}</Typography>
            </Paper>
          </Box>
        </Box>

        {/* Right column — Dates & Brief */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, flex: 1, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.03 }}>
              <DescriptionIcon sx={{ fontSize: 120 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LightbulbIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Project Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: fontSizes.smMd }}>
              This project is part of the {project.pm_programmename || 'central'} programme. 
              Key objectives include delivering value within the {phaseLabel(project.pm_projectphase)} phase 
              under the guidance of {project.pm_projectmanager || 'the assigned manager'}.
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
             <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Target Start</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {project.pm_plannedstartdate ? new Date(project.pm_plannedstartdate).toLocaleDateString() : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Target End</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {project.pm_plannedenddate ? new Date(project.pm_plannedenddate).toLocaleDateString() : '—'}
                  </Typography>
                </Box>
             </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
