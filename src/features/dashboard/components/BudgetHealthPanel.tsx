import { Box, Paper, Typography, Skeleton, FormControl, Select, MenuItem, InputLabel, useTheme, alpha } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GppBadIcon from '@mui/icons-material/GppBad'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { VarianceDisplay, StatusProgressBar, StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface BudgetHealthPanelProps {
  totalApprovedBudget: number
  totalActualSpend: number
  loading: boolean
  selectedYear?: number | 'all'
  availableYears?: number[]
  onYearChange?: (year: number | 'all') => void
  portfolios?: any[]
  sx?: SxProps<Theme>
}

export const BudgetHealthPanel = ({ 
  totalApprovedBudget, 
  totalActualSpend, 
  loading, 
  selectedYear,
  availableYears = [],
  onYearChange,
  portfolios = [],
  sx
}: BudgetHealthPanelProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const gridColor = isDark ? '#334155' : '#e6eef7'
  
  const budgetVariance = totalApprovedBudget - totalActualSpend

  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${gridColor}`,
    color: textColor,
    borderRadius: '6px',
    fontSize: 12,
  }

  const chartData = portfolios
    .filter((p) => (p.pm_approvedbudgeteur ?? 0) > 0 || (p.pm_actualspendeur ?? 0) > 0)
    .map((p) => ({
      name: p.pm_portfolioname || 'Unnamed',
      Budget: p.pm_approvedbudgeteur ?? 0,
      Actual: p.pm_actualspendeur ?? 0,
    }))

  return (
    <Paper
      sx={{
        p: 3,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 12px 20px rgba(0,0,0,0.5)'
            : '0 8px 16px rgba(99,102,241,0.06)',
        },
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletIcon sx={{ color: 'success.main' }} />
              Budget Health
            </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedYear && selectedYear !== 'all' 
              ? `Budget performance for Fiscal Year ${selectedYear}.`
              : 'Approved budget vs. actual spend across all portfolios.'
            }
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!loading && (
            <StatusTag
              icon={budgetVariance >= 0 ? <CheckCircleIcon /> : <GppBadIcon />}
              label={budgetVariance >= 0 ? 'On Track' : 'Over Budget'}
              color={budgetVariance >= 0 ? 'success' : 'error'}
            />
          )}

          {onYearChange && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="budget-year-select-label">View Year</InputLabel>
              <Select
                labelId="budget-year-select-label"
                value={selectedYear || 'all'}
                label="View Year"
                onChange={(e) => onYearChange(e.target.value as number | 'all')}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="all">All Years</MenuItem>
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>FY {year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {loading ? (
        <Skeleton variant="rounded" height={120} />
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 4, mb: 2.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
                Approved Budget
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {currencyFormatter.format(totalApprovedBudget)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
                Actual Spend
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {currencyFormatter.format(totalActualSpend)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
                Variance
              </Typography>
              <VarianceDisplay budget={totalApprovedBudget} consumed={totalActualSpend} />
            </Box>
          </Box>

          {/* Budget consumption bar */}
          <Box sx={{ mt: 1 }}>
            <StatusProgressBar
              value={totalActualSpend}
              total={totalApprovedBudget}
              label="Budget consumed"
              thresholds={{ warning: 60, error: 80 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Remaining: {currencyFormatter.format(Math.max(0, budgetVariance))}
              </Typography>
              {budgetVariance < 0 && (
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                  Overspent: {currencyFormatter.format(Math.abs(budgetVariance))}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Portfolio Financial Breakdown Chart */}
          {chartData.length > 0 && (
            <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Portfolio Financial Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" tickFormatter={(v) => `€${(v / 1e6).toFixed(0)}M`} stroke={textColor} tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" width={140} stroke={textColor} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`€${Number(v).toLocaleString()}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Budget" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="Actual" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </>
      )}
    </Paper>
  )
}

export default BudgetHealthPanel
