import { Box, Paper, Typography, Skeleton } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GppBadIcon from '@mui/icons-material/GppBad'
import { VarianceDisplay, StatusProgressBar, StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'

interface BudgetHealthPanelProps {
  totalApprovedBudget: number
  totalActualSpend: number
  loading: boolean
}

export const BudgetHealthPanel = ({ totalApprovedBudget, totalActualSpend, loading }: BudgetHealthPanelProps) => {
  const budgetVariance = totalApprovedBudget - totalActualSpend
  const budgetPct = totalApprovedBudget > 0
    ? Math.round((totalActualSpend / totalApprovedBudget) * 100)
    : 0

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Budget Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Approved budget vs. actual spend across all portfolios.
          </Typography>
        </Box>
        {!loading && (
          <StatusTag
            icon={budgetVariance >= 0 ? <CheckCircleIcon /> : <GppBadIcon />}
            label={budgetVariance >= 0 ? 'On Track' : 'Over Budget'}
            color={budgetVariance >= 0 ? 'success' : 'error'}
          />
        )}
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
        </>
      )}
    </Paper>
  )
}

export default BudgetHealthPanel
