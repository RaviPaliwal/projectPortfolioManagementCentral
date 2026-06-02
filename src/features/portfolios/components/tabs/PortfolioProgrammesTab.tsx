import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { StatusChip, TabPanel } from '@/components/common'
import type { ProgrammeModel } from '@/types/dataverse'

interface PortfolioProgrammesTabProps {
  programmes: ProgrammeModel[]
  tabValue: number
  index: number
}

export const PortfolioProgrammesTab: React.FC<PortfolioProgrammesTabProps> = ({
  programmes,
  tabValue,
  index,
}) => {
  return (
    <TabPanel value={tabValue} index={index} pt={0}>
      {programmes.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {programmes.map((prog) => (
            <Paper key={prog.pm_programmeid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {prog.pm_programmename ?? 'Untitled Programme'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {prog.pm_startdate ? new Date(prog.pm_startdate).toLocaleDateString() : 'No start date'}
                    {' → '}
                    {prog.pm_enddate ? new Date(prog.pm_enddate).toLocaleDateString() : 'No end date'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <StatusChip status={prog.pm_programmephase} type="prog_phase" size="small" />
                  <StatusChip status={prog.pm_ragstatus} type="rag" size="small" />
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
          No programmes linked to this portfolio.
        </Typography>
      )}
    </TabPanel>
  )
}

export default PortfolioProgrammesTab
