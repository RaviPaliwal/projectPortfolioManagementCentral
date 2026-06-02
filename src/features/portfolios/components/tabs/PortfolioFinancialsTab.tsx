import React from 'react'
import { Box, Paper, Typography, useTheme } from '@mui/material'
import MoneyIcon from '@mui/icons-material/Money'
import { TabPanel, VarianceDisplay, StatusProgressBar } from '@/components/common'
import type { PortfolioModel } from '@/types/dataverse'
import { currencyFormatter } from '@/utils/formatters'

interface PortfolioFinancialsTabProps {
  portfolio: PortfolioModel
  tabValue: number
  index: number
}

export const PortfolioFinancialsTab: React.FC<PortfolioFinancialsTabProps> = ({
  portfolio,
  tabValue,
  index,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <TabPanel value={tabValue} index={index} pt={0}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MoneyIcon sx={{ fontSize: 18 }} /> Budget Overview
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {currencyFormatter.format(portfolio.pm_actualspendeur ?? 0)}
              </Typography>
            </Box>
          </Box>

          <StatusProgressBar
            value={portfolio.pm_actualspendeur ?? 0}
            total={portfolio.pm_approvedbudgeteur ?? 0}
            label="Budget Utilization"
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Budget Variance
          </Typography>
          <VarianceDisplay budget={portfolio.pm_approvedbudgeteur} consumed={portfolio.pm_actualspendeur} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {portfolio.pm_approvedbudgeteur && portfolio.pm_approvedbudgeteur > 0
              ? `${((portfolio.pm_actualspendeur ?? 0) / portfolio.pm_approvedbudgeteur * 100).toFixed(1)}% of budget consumed`
              : 'No budget data available'}
          </Typography>
        </Paper>
      </Box>
    </TabPanel>
  )
}

export default PortfolioFinancialsTab
