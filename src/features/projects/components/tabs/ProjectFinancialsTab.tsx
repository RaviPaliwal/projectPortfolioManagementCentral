import React from 'react'
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material'
import { StatusTag } from '@/components/common'
import type { BudgetLineModel } from '@/types/dataverse'
import { currency } from '../../constants'

interface ProjectFinancialsTabProps {
  budgetLines: BudgetLineModel[]
}

export const ProjectFinancialsTab: React.FC<ProjectFinancialsTabProps> = ({ budgetLines }) => {
  const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
  const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Budget Breakdown</Typography>
        <StatusTag label={`Total: ${currency(totalBudget)}`} size="small" color="primary" />
        <StatusTag label={`Spent: ${currency(totalSpent)}`} size="small" color={totalSpent > totalBudget ? 'error' : 'default'} />
      </Box>
      {budgetLines.length > 0 ? (
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Line Item</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Budget</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actual</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Variance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {budgetLines.map((b) => {
              const variance = (b.pm_approvedbudgeteur ?? 0) - (b.pm_actualspendeur ?? 0)
              return (
                <TableRow key={b.pm_budgetlineid}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_budgetlinename}</Typography></TableCell>
                  <TableCell><StatusTag label={['Staff', 'Contractors', 'Licences', 'Infrastructure'][Number(b.pm_costcategory)] ?? '—'} size="small" /></TableCell>
                  <TableCell align="right">{currency(b.pm_approvedbudgeteur)}</TableCell>
                  <TableCell align="right">{currency(b.pm_actualspendeur)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: variance >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {variance >= 0 ? '+' : ''}{currency(variance)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No budget lines yet. Use the Actions bar above to add one.
        </Typography>
      )}
    </Box>
  )
}
