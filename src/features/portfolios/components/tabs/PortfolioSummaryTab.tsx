import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'

import { StatusChip, TabPanel, StatusTag } from '@/components/common'
import type { PortfolioModel } from '@/types/dataverse'
import { formatDate } from '@/utils/formatters'
import { fontSizes } from '@/styles'

interface PortfolioSummaryTabProps {
  portfolio: PortfolioModel
  tabValue: number
  index: number
  programmeCount: number
  projectCount: number
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'On Hold',
}

export const PortfolioSummaryTab: React.FC<PortfolioSummaryTabProps> = ({
  portfolio,
  tabValue,
  index,
  programmeCount,
  projectCount,
}) => {
  return (
    <TabPanel value={tabValue} index={index} pt={0}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Top Status & Date Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <StatusChip status={portfolio.pm_ragstatus} type="rag" size="medium" />
            <StatusTag
              label={STATUS_LABELS[portfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Active'}
              size="small"
              variant="outlined"
              color={portfolio.pm_portfoliostatus === 0 || portfolio.pm_portfoliostatus === '0' ? 'success' : 'default'}
            />
            {portfolio.pm_prioritylevel !== undefined && (
              <StatusTag
                label={`Priority: ${portfolio.pm_prioritylevel}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
          
          {(portfolio.pm_startdate || portfolio.pm_enddate) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'background.default' }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {formatDate(portfolio.pm_startdate)} — {formatDate(portfolio.pm_enddate)}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Left: Metadata */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Portfolio Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: fontSizes.xs }}>Owner</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{portfolio.pm_ownerlookupname || '—'}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: fontSizes.xs }}>Business Unit</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{portfolio.pm_businessunit || '—'}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: fontSizes.xs }}>Programmes</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>{programmeCount}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: fontSizes.xs }}>Projects</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main' }}>{projectCount}</Typography>
              </Paper>
            </Box>
          </Box>

          {/* Right: Narrative */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {portfolio.pm_portfoliodescription && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Description
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {portfolio.pm_portfoliodescription}
                </Typography>
              </Box>
            )}

            {portfolio.pm_strategicobjective && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <LightbulbIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Strategic Objective
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, fontStyle: 'italic' }}>
                    "{portfolio.pm_strategicobjective}"
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </TabPanel>
  )
}

export default PortfolioSummaryTab
