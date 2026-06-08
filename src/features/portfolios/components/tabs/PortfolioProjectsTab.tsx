import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { StatusChip, TabPanel } from '@/components/common'
import type { ProjectModel } from '@/types/dataverse'
import { navigateToProject } from '@/utils/navigation'

interface PortfolioProjectsTabProps {
  projects: ProjectModel[]
  tabValue: number
  index: number
}

export const PortfolioProjectsTab: React.FC<PortfolioProjectsTabProps> = ({
  projects,
  tabValue,
  index,
}) => {
  return (
    <TabPanel value={tabValue} index={index} pt={0}>
      {projects.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {projects.map((proj) => (
            <Paper
              key={proj.pm_projectid}
              variant="outlined"
              sx={{
                p: 2, borderRadius: 1.5, cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
              }}
              onClick={() => proj.pm_projectid && navigateToProject(proj.pm_projectid)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {proj.pm_projectname ?? 'Untitled Project'}
                    <OpenInNewIcon sx={{ fontSize: 14, color: 'primary.main', opacity: 0.6 }} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {proj.pm_projectcode ?? '—'}
                    {proj.pm_projectmanager ? ` · ${proj.pm_projectmanager}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <StatusChip status={proj.pm_projectphase} type="phase" size="small" />
                  <StatusChip status={proj.pm_ragstatus} type="rag" size="small" />
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
          No projects linked to this portfolio.
        </Typography>
      )}
    </TabPanel>
  )
}

export default PortfolioProjectsTab
