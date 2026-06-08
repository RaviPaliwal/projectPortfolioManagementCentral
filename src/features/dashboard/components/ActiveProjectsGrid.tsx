import { Box, Paper, Typography, Grid, Button, Skeleton } from '@mui/material'
import { StatusChip } from '@/components/common'
import type { ProjectModel } from '@/types/dataverse'

interface ActiveProjectsGridProps {
  projects: ProjectModel[]
  loading: boolean
  onViewAll: () => void
  onProjectClick?: (project: ProjectModel) => void
}

export const ActiveProjectsGrid = ({ projects, loading, onViewAll, onProjectClick }: ActiveProjectsGridProps) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>My Active Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            Projects currently in-flight with live status and delivery phase.
          </Typography>
        </Box>
        <Button variant="contained" size="small" onClick={onViewAll}>
          View all
        </Button>
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {[...Array(4)].map((_, i) => (
            <Grid size={{ xs: 12, sm: 6 }} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : projects.length > 0 ? (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid size={{ xs: 12, sm: 6 }} key={project.pm_projectid}>
              <Paper
                variant="outlined"
                onClick={() => onProjectClick?.(project)}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  transition: 'all 0.2s',
                  cursor: onProjectClick ? 'pointer' : 'default',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {project.pm_projectname ?? 'Untitled project'}
                  </Typography>
                  <StatusChip status={project.pm_ragstatus} type="rag" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {project.pm_projectcode ?? '—'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <StatusChip status={project.pm_projectphase} type="phase" />
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {project.pm_programmename ?? project.pm_portfolioname ?? 'No parent'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No active projects found.
        </Typography>
      )}
    </Paper>
  )
}

export default ActiveProjectsGrid
