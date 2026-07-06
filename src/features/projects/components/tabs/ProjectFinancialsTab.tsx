import React from 'react'
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  IconButton,
  Tooltip,
  Button,
  Grid,
  Divider,
  Chip,
  useTheme,
  LinearProgress
} from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PieChartIcon from '@mui/icons-material/PieChart'
import EditIcon from '@mui/icons-material/Edit'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CategoryIcon from '@mui/icons-material/Category'
import InfoIcon from '@mui/icons-material/Info'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import NotesIcon from '@mui/icons-material/Notes'

import { StatusTag, VarianceDisplay } from '@/components/common'
import type { BudgetLineModel, ProjectModel } from '@/types/dataverse'
import { currency } from '../../constants'
import { fontSizes } from '@/styles'

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
  const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
  const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)
  const variance = totalBudget - totalSpent

  // EVM (Earned Value Management) computations
  const percentComplete = project.pm_percentcomplete ?? 0
  const earnedValue = totalBudget * (percentComplete / 100)
  const cpi = totalSpent > 0 ? earnedValue / totalSpent : 1.0
  const eac = cpi > 0 ? totalBudget / cpi : totalBudget
  const costVariance = earnedValue - totalSpent

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
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Estimate at Completion</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                            {selectedBudgetLine.pm_estimateatcompletioneur != null ? currency(selectedBudgetLine.pm_estimateatcompletioneur) : '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Estimate to Complete</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                            {selectedBudgetLine.pm_estimatetocompleteeur != null ? currency(selectedBudgetLine.pm_estimatetocompleteeur) : '—'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Column 2: Line Details & Notes */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CategoryIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Line Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Category</Typography>
                      <Typography variant="body2">{costCategory}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Expense Category</Typography>
                      <Typography variant="body2">{selectedBudgetLine.pm_expencecatagory != null ? (Number(selectedBudgetLine.pm_expencecatagory) === 0 ? 'CapEx' : 'OpEx') : '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Funding Source</Typography>
                      <Typography variant="body2">{selectedBudgetLine.pm_fundingsourcename || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Fiscal Period</Typography>
                      <Typography variant="body2">{selectedBudgetLine.pm_fiscalperiodname || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Quantity</Typography>
                      <Typography variant="body2">{selectedBudgetLine.pm_quantity ?? '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Unit Cost</Typography>
                      <Typography variant="body2">{selectedBudgetLine.pm_unitcosteur ? currency(selectedBudgetLine.pm_unitcosteur) : '—'}</Typography>
                    </Box>
                  </Box>
                </Box>

                {selectedBudgetLine.pm_notes && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <NotesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Notes
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {selectedBudgetLine.pm_notes}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // Summary and Lists view
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Action Buttons */}
      {onAddBudgetLine && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: -2 }}>
          <Button size="small" variant="outlined" startIcon={<AttachMoneyIcon />} onClick={onAddBudgetLine}>Budget</Button>
        </Box>
      )}

      {/* EVM Metrics Row */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <QueryStatsIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Earned Value Performance (Financial KPIs)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <QueryStatsIcon sx={{ fontSize: 20, color: 'info.main', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
              {currency(earnedValue)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Earned Value (EV)
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 20, color: cpi >= 1.0 ? 'success.main' : cpi >= 0.9 ? 'warning.main' : 'error.main', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: cpi >= 1.0 ? 'success.main' : cpi >= 0.9 ? 'warning.main' : 'error.main', fontFamily: '"JetBrains Mono", monospace' }}>
              {cpi.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cost Performance (CPI)
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <QueryStatsIcon sx={{ fontSize: 20, color: 'secondary.main', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
              {currency(eac)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Est. At Completion (EAC)
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
            <AttachMoneyIcon sx={{ fontSize: 20, color: costVariance >= 0 ? 'success.main' : 'error.main', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: costVariance >= 0 ? 'success.main' : 'error.main', fontFamily: '"JetBrains Mono", monospace' }}>
              {costVariance >= 0 ? '+' : ''}{currency(costVariance)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cost Variance (CV)
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PieChartIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Budget Breakdown
        </Typography>
        
        {budgetLines.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Line Item</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Budget</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actual</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Variance</TableCell>
                  {canEdit && <TableCell sx={{ fontWeight: 700, pr: 3 }} align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {budgetLines.map((b) => {
                  return (
                    <TableRow 
                      key={b.pm_budgetlineid} 
                      hover
                      onClick={() => setSelectedBudgetLine(b)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_budgetlinename}</Typography></TableCell>
                      <TableCell><StatusTag label={['Staff', 'Contractors', 'Licences', 'Infrastructure'][Number(b.pm_costcategory)] ?? '—'} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{currency(b.pm_approvedbudgeteur)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{currency(b.pm_actualspendeur)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <VarianceDisplay budget={b.pm_approvedbudgeteur} consumed={b.pm_actualspendeur} />
                        </Box>
                      </TableCell>
                      {canEdit && (
                        <TableCell align="right" sx={{ pr: 3 }}>
                          <Tooltip title="Edit Budget Line">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditBudgetLine?.(b)
                              }}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
                {/* Summary Row */}
                <TableRow sx={{ bgcolor: 'background.default', borderTop: '2px solid', borderTopColor: 'divider' }}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography></TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{currency(totalBudget)}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{currency(totalSpent)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <VarianceDisplay budget={totalBudget} consumed={totalSpent} />
                    </Box>
                  </TableCell>
                  {canEdit && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              No budget lines yet. Use the Actions bar above to add one.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
