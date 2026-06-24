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
} from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PieChartIcon from '@mui/icons-material/PieChart'
import EditIcon from '@mui/icons-material/Edit'
import QueryStatsIcon from '@mui/icons-material/QueryStats'

import { StatusTag, VarianceDisplay } from '@/components/common'
import type { BudgetLineModel, ProjectModel } from '@/types/dataverse'
import { currency } from '../../constants'
import { fontSizes } from '@/styles'

interface ProjectFinancialsTabProps {
  budgetLines: BudgetLineModel[]
  project: ProjectModel
  onEditBudgetLine?: (budget: BudgetLineModel) => void
  canEdit?: boolean
}

export const ProjectFinancialsTab: React.FC<ProjectFinancialsTabProps> = ({ 
  budgetLines,
  project,
  onEditBudgetLine,
  canEdit = false,
}) => {
  const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
  const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)
  const variance = totalBudget - totalSpent

  // EVM (Earned Value Management) computations
  const percentComplete = project.pm_percentcomplete ?? 0
  const earnedValue = totalBudget * (percentComplete / 100)
  const cpi = totalSpent > 0 ? earnedValue / totalSpent : 1.0
  const eac = cpi > 0 ? totalBudget / cpi : totalBudget
  const costVariance = earnedValue - totalSpent

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* EVM Metrics Row */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <QueryStatsIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Earned Value Performance (Financial KPIs)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: 'info.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Earned Value (EV)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currency(earnedValue)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
              BAC × {percentComplete}% complete
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: cpi >= 1.0 ? 'success.main' : cpi >= 0.9 ? 'warning.main' : 'error.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Cost Performance (CPI)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: cpi >= 1.0 ? 'success.main' : cpi >= 0.9 ? 'warning.main' : 'error.main', fontFamily: '"JetBrains Mono", monospace' }}>{cpi.toFixed(2)}</Typography>
            <Typography variant="caption" color={cpi >= 1.0 ? 'success.main' : cpi >= 0.9 ? 'warning.main' : 'error.main'} sx={{ fontSize: '0.75rem', mt: 0.5, display: 'block', fontWeight: 600 }}>
              {cpi >= 1.0 ? 'Under budget (Efficient)' : cpi >= 0.9 ? 'Close to budget' : 'Over budget (Inefficient)'}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: 'secondary.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Estimate At Completion (EAC)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currency(eac)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
              Projected cost based on CPI
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: costVariance >= 0 ? 'success.main' : 'error.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Cost Variance (CV)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: costVariance >= 0 ? 'success.main' : 'error.main', fontFamily: '"JetBrains Mono", monospace' }}>
              {costVariance >= 0 ? '+' : ''}{currency(costVariance)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
              EV − Actuals spent
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PieChartIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Budget Breakdown
        </Typography>
        
        {budgetLines.length > 0 ? (
          <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}>
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
                  const lineVariance = (b.pm_approvedbudgeteur ?? 0) - (b.pm_actualspendeur ?? 0)
                  return (
                    <TableRow key={b.pm_budgetlineid} hover>
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
                                onClick={() => onEditBudgetLine?.(b)}
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
