import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TimerIcon from '@mui/icons-material/Timer'
import SpeedIcon from '@mui/icons-material/Speed'
import FlagIcon from '@mui/icons-material/Flag'

import type { ProjectModel } from '@/types/dataverse'
import { phaseLabel, currency } from '../../constants'
import { StatusChip, MetricTile } from '@/components/common'
import { fontSizes } from '@/styles'

interface ProjectOverviewTabProps {
  project: ProjectModel
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ project }) => {
  const metrics = useMemo(() => {
    const budget = project.pm_approvedbudgeteur ?? 0
    const actual = project.pm_actualcosteur ?? 0
    const variance = budget - actual
    const progress = project.pm_percentcomplete ?? 0
    
    return [
      { label: 'Completion', value: `${progress}%`, icon: <SpeedIcon />, color: progress >= 100 ? 'success.main' : 'primary.main' },
      { label: 'Budget Variance', value: currency(variance), icon: <TrendingUpIcon />, color: variance >= 0 ? 'success.main' : 'error.main' },
      { label: 'Actual Spend', value: currency(actual), icon: <TimerIcon />, color: 'info.main' },
    ]
  }, [project])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Executive Metrics Row ── */}
      <Grid container spacing={2}>
        {metrics.map((m) => (
          <Grid size={{ xs: 12, sm: 4 }} key={m.label}>
            <MetricTile label={m.label} value={m.value} icon={m.icon} color={m.color} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: 3 }}>
        {/* Left column — Project Story & Goals */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.03 }}>
              <DescriptionIcon sx={{ fontSize: 160 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbIcon sx={{ color: 'warning.main' }} /> Executive Summary
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
              {project.pm_projectname} is currently in the {phaseLabel(project.pm_projectphase)} phase. It aims to deliver strategic value to the {project.pm_businessunit || 'organization'} through rigorous management of its portfolio objectives and timeline.
            </Typography>
            
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>Target Timeline</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TimerIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {project.pm_plannedstartdate ? new Date(project.pm_plannedstartdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Projected Start</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>Delivery Goal</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FlagIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {project.pm_plannedenddate ? new Date(project.pm_plannedenddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Target Completion</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Right column — Metadata & Ownership */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 0.5, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
            Governance & Metadata
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Phase</Typography>
              <StatusChip status={project.pm_projectphase} type="phase" size="medium" />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Project Manager</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{project.pm_projectmanagername || 'Unassigned'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Business Sponsor</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{project.pm_projectsponsor || '—'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Portfolio</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{project.pm_portfolioname || '—'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Programme</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{project.pm_programmename || '—'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Department</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{project.pm_businessunit || '—'}</Typography>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
