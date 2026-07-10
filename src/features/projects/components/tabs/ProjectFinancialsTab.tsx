import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  useTheme,
  LinearProgress
} from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PieChartIcon from '@mui/icons-material/PieChart'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CategoryIcon from '@mui/icons-material/Category'
import InfoIcon from '@mui/icons-material/Info'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import NotesIcon from '@mui/icons-material/Notes'

import { StatusTag, VarianceDisplay, KpiCardRow } from '@/components/common'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BudgetLineModel, ProjectModel } from '@/types/dataverse'
import { currency } from '../../constants'
import { fontSizes } from '@/styles'
import { BudgetTable } from '@/features/budgets/components/BudgetTable'

interface ProjectFinancialsTabProps {
  budgetLines: BudgetLineModel[]
  project: ProjectModel
  onEditBudgetLine?: (budget: BudgetLineModel) => void
  canEdit?: boolean
  onAddBudgetLine?: () => void
  selectedBudgetLine: BudgetLineModel | null
  setSelectedBudgetLine: (budgetLine: BudgetLineModel | null) => void
}

// Mappings matching BudgetsPage.tsx
const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff',
  '1': 'Contractors',
  '2': 'Licences',
  '3': 'Infrastructure',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'warning' | 'error' | 'default'> = {
  '0': 'primary',
  '1': 'secondary',
  '2': 'warning',
  '3': 'error',
}

export const ProjectFinancialsTab: React.FC<ProjectFinancialsTabProps> = ({
  budgetLines,
  project,
  onEditBudgetLine,
  canEdit = false,
  onAddBudgetLine,
  selectedBudgetLine,
  setSelectedBudgetLine
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [categoryFilter, setCategoryFilter] = React.useState('')

  const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
  const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)

  // EVM (Earned Value Management) computations
  const percentComplete = project.pm_percentcomplete ?? 0
  const earnedValue = totalBudget * (percentComplete / 100)
  const cpi = totalSpent > 0 ? earnedValue / totalSpent : 1.0
  const costVariance = earnedValue - totalSpent

  const kpiItems = React.useMemo(() => [
    {
      label: 'Approved Budget (BAC)',
      value: currency(totalBudget),
      subtitle: 'Total authorized budget',
      icon: <AccountBalanceWalletIcon />,
      color: 'primary.main',
      valueColor: 'primary.main'
    },
    {
      label: 'Actual Cost (AC)',
      value: currency(totalSpent),
      subtitle: 'Total expenditure to date',
      icon: <AttachMoneyIcon />,
      color: 'success.main',
      valueColor: 'success.main'
    },
    {
      label: 'CPI Index (BAC/EAC)',
      value: cpi.toFixed(2),
      subtitle: 'Cost Performance Index',
      icon: <QueryStatsIcon />,
      color: cpi >= 1.0 ? 'success.main' : cpi >= 0.85 ? 'warning.main' : 'error.main'
    },
    {
      label: 'Cost Variance (CV)',
      value: `${costVariance >= 0 ? '+' : ''}${currency(costVariance)}`,
      subtitle: 'Earned Value vs Actual Cost',
      icon: <CurrencyExchangeIcon />,
      color: costVariance >= 0 ? 'success.main' : 'error.main',
      valueColor: costVariance >= 0 ? 'success.main' : 'error.main'
    }
  ], [totalBudget, totalSpent, cpi, costVariance])

  const categorySummary = React.useMemo(() => {
    const summaryMap: Record<string, { name: string; budget: number; spend: number; color: string }> = {
      '0': { name: 'Staff', budget: 0, spend: 0, color: theme.palette.primary.main },
      '1': { name: 'Contractors', budget: 0, spend: 0, color: theme.palette.secondary.main },
      '2': { name: 'Licences', budget: 0, spend: 0, color: theme.palette.warning.main },
      '3': { name: 'Infrastructure', budget: 0, spend: 0, color: theme.palette.error.main }
    }

    for (const b of budgetLines) {
      const cat = String(b.pm_costcategory ?? '')
      if (summaryMap[cat]) {
        summaryMap[cat].budget += b.pm_approvedbudgeteur ?? 0
        summaryMap[cat].spend += b.pm_actualspendeur ?? 0
      }
    }

    return Object.values(summaryMap).filter(c => c.budget > 0 || c.spend > 0)
  }, [budgetLines, theme])

  // Helper helpers
  const budgetUtilization = (b: BudgetLineModel) => {
    const approved = b.pm_approvedbudgeteur ?? 0
    const actual = b.pm_actualspendeur ?? 0
    if (approved === 0) return 0
    return Math.min(100, Math.round((actual / approved) * 100))
  }

  const getVarianceColor = (v?: number) => {
    if (v == null) return 'text.secondary'
    return v >= 0 ? 'success.main' : 'error.main'
  }

  // Inline Budget Line Detail View (matching BudgetsPage.tsx layout)
  if (selectedBudgetLine) {
    const costCategory = CATEGORY_LABELS[String(selectedBudgetLine.pm_costcategory ?? '')] ?? 'Unknown'
    const approvedVal = selectedBudgetLine.pm_approvedbudgeteur ?? 0
    const revisedVal = selectedBudgetLine.pm_revisedbudgeteur ?? approvedVal
    const actualVal = selectedBudgetLine.pm_actualspendeur ?? 0
    const varianceVal = selectedBudgetLine.pm_varianceeur ?? (approvedVal - actualVal)
    const utilization = budgetUtilization(selectedBudgetLine)

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Status Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <StatusTag
            label={costCategory}
            color={CATEGORY_COLORS[String(selectedBudgetLine.pm_costcategory ?? '')] ?? 'default'}
          />
          {selectedBudgetLine.pm_fiscalperiodname && (
            <Typography variant="body2" color="text.secondary">
              Period: {selectedBudgetLine.pm_fiscalperiodname}
            </Typography>
          )}
        </Box>

        <Grid container spacing={2.5}>
          {/* Column 1: Budget Utilization & Variance Analysis */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
                {/* Left sub-column: Budget Utilization */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Budget Utilization
                      </Typography>
                      <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Budget Used
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                            {utilization}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={utilization}
                          sx={{
                            height: 6,
                            borderRadius: 1.5,
                            bgcolor: isDark ? 'divider' : '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: utilization > 85 ? 'error.main'
                                : utilization > 65 ? 'warning.main' : 'success.main',
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.primary.main}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>Revised Budget</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                            {currency(revisedVal)}
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.success.main}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>Actual Spend</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'success.main' }}>
                            {currency(actualVal)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Right sub-column: Variance Analysis */}
                <Grid
                  size={{ xs: 12, md: 6 }}
                  sx={{
                    borderLeft: { md: `1px solid ${theme.palette.divider}` },
                    pl: { md: 3 },
                    pt: { xs: 2, md: 0 },
                    borderTop: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CurrencyExchangeIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Variance Analysis
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            textAlign: 'center',
                            border: (theme) => `1px solid ${varianceVal >= 0 ? theme.palette.success.main : theme.palette.error.main}`,
                            bgcolor: varianceVal >= 0
                              ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)')
                              : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'),
                          }}
                        >
                          {varianceVal >= 0
                            ? <VerifiedIcon sx={{ fontSize: 20, color: 'success.main', mb: 0.25 }} />
                            : <WarningAmberIcon sx={{ fontSize: 20, color: 'error.main', mb: 0.25 }}
                            />}
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: getVarianceColor(varianceVal) }}>
                            {varianceVal >= 0 ? '+' : ''}{currency(varianceVal)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Variance</Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', pt: 0.5 }}>
                            {selectedBudgetLine.pm_committedspendeur != null ? currency(selectedBudgetLine.pm_committedspendeur) : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>Committed</Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', pt: 0.5 }}>
                            {selectedBudgetLine.pm_forecastspendeur != null ? currency(selectedBudgetLine.pm_forecastspendeur) : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>Forecast</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Column 2: Detailed Line Attributes */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Line Attributes
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Funding Source</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <AttachMoneyIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBudgetLine.pm_fundingsourcename || '—'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Fiscal Period</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBudgetLine.pm_fiscalperiodname || '—'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Expense Category</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <CategoryIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {String(selectedBudgetLine.pm_expencecatagory) === '0' ? 'CapEx'
                        : String(selectedBudgetLine.pm_expencecatagory) === '1' ? 'OpEx' : '—'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Cost Attributes</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {selectedBudgetLine.pm_quantity != null && selectedBudgetLine.pm_unitcosteur != null
                      ? `${selectedBudgetLine.pm_quantity} units @ ${currency(selectedBudgetLine.pm_unitcosteur)}/ea`
                      : '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Notes Block */}
          {selectedBudgetLine.pm_notes && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Notes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedBudgetLine.pm_notes}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, mb: 1 }}>
        <PieChartIcon sx={{ fontSize: 20, color: 'primary.main' }} /> Budget Breakdown
      </Typography>

      {/* EVM KPI Cards Summary Row */}
      <Box sx={{ mb: -2.5 }}>
        <KpiCardRow items={kpiItems} />
      </Box>

      <Grid container spacing={3.5} sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 8.5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <BudgetTable
            budgetLines={budgetLines}
            loading={false}
            onSelect={setSelectedBudgetLine}
            onEdit={onEditBudgetLine}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            openCreate={onAddBudgetLine}
            canEdit={canEdit}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3.5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: '24px',
              bgcolor: isDark ? 'background.paper' : '#fff',
              height: 'calc(100% - 24px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 3
            }}
          >
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Financial Analysis
              </Typography>

              <Box sx={{ height: 180, width: '100%', mb: 2, flexGrow: 1 }}>
                {categorySummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categorySummary}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke={theme.palette.divider} />
                      <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke={theme.palette.divider} tickFormatter={(v) => `€${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v}`} />
                      <RechartsTooltip formatter={(value) => [`€${new Intl.NumberFormat('en-GB').format(Number(value))}`]} />
                      <Bar dataKey="budget" name="Budget" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="spend" name="Spend" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">No category data to display</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Summary Indicators
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  <VerifiedIcon fontSize="small" sx={{ color: 'primary.main' }} /> Budget Utilisation
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 120 }}>
                  <LinearProgress
                    variant="determinate"
                    value={totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                    color={totalSpent > totalBudget ? 'error' : 'primary'}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  <WarningAmberIcon fontSize="small" sx={{ color: costVariance >= 0 ? 'success.main' : 'error.main' }} /> Cost Health
                </Typography>
                <StatusTag
                  label={costVariance >= 0 ? 'Under Budget' : 'Over Budget'}
                  color={costVariance >= 0 ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
