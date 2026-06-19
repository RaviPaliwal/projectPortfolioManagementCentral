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

import { StatusTag, VarianceDisplay } from '@/components/common'
import type { BudgetLineModel } from '@/types/dataverse'
import { currency } from '../../constants'
import { fontSizes } from '@/styles'

interface ProjectFinancialsTabProps {
  budgetLines: BudgetLineModel[]
  onEditBudgetLine?: (budget: BudgetLineModel) => void
  canEdit?: boolean
}

export const ProjectFinancialsTab: React.FC<ProjectFinancialsTabProps> = ({ 
  budgetLines,
  onEditBudgetLine,
  canEdit = false,
}) => {
  const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
  const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)
  const variance = totalBudget - totalSpent

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Financial Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Total Budget</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currency(totalBudget)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: 'warning.main' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Total Actuals</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{currency(totalSpent)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderLeft: `3px solid ${variance < 0 ? 'error.main' : 'success.main'}` }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Variance</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: variance < 0 ? 'error.main' : 'success.main', fontFamily: '"JetBrains Mono", monospace' }}>
            {variance < 0 ? '-' : '+'}{currency(Math.abs(variance))}
          </Typography>
        </Paper>
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
