import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { StatusChip, TabPanel, StatusTag } from '@/components/common'
import type { PortfolioModel } from '@/types/dataverse'
import { formatDate } from '@/utils/formatters'

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <StatusChip status={portfolio.pm_ragstatus} type="rag" size="medium" />
          <StatusTag
            label={STATUS_LABELS[portfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Unknown'}
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {formatDate(portfolio.pm_startdate)}
                {' → '}
                {formatDate(portfolio.pm_enddate)}
              </Typography>
            </Box>
          </Box>
        )}

        {portfolio.pm_portfoliodescription ? (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 16 }} /> Description
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {portfolio.pm_portfoliodescription}
            </Typography>
          </Box>
        ) : null}

        {portfolio.pm_strategicobjective ? (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LightbulbIcon sx={{ fontSize: 16 }} /> Strategic Objective
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {portfolio.pm_strategicobjective}
            </Typography>
          </Box>
        ) : null}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.15, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {programmeCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">Programmes</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.15, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
              {projectCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">Projects</Typography>
          </Paper>
        </Box>
      </Box>
    </TabPanel>
  )
}

export default PortfolioSummaryTab
