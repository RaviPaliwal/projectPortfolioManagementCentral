import React from 'react'
import {
  Box,
  Typography,
  IconButton,
  Table,
  TextField,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  useTheme,
  MenuItem,
  Button,
  Avatar,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'

import type { BudgetLineModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { TableFooter, TableShell, SearchFilterBar, StatusTag, TableHeader } from '@/components/common'
import { useDataGrid } from '@/hooks/useDataGrid'

interface BudgetTableProps {
  budgetLines: BudgetLineModel[]
  loading: boolean
  onSelect: (line: BudgetLineModel) => void
  onEdit?: (line: BudgetLineModel) => void
  categoryFilter: string
  setCategoryFilter: (val: string) => void
  openCreate?: () => void
  canEdit?: boolean
}

// Constants
const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff',
  '1': 'Contractors',
  '2': 'Licences',
  '3': 'Infrastructure',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'warning' | 'info' | 'secondary'> = {
  '0': 'primary',
  '1': 'warning',
  '2': 'info',
  '3': 'secondary',
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const budgetUtilization = (budget?: BudgetLineModel): number => {
  if (!budget) return 0
  const budgetAmount = budget.pm_revisedbudgeteur ?? budget.pm_approvedbudgeteur ?? 0
  if (budgetAmount <= 0) return 0
  return Math.min(100, Math.round(((budget.pm_actualspendeur ?? 0) / budgetAmount) * 100))
}

const getVarianceColor = (variance?: number): string => {
  if (variance == null) return 'text.secondary'
  if (variance > 0) return 'success.main'
  if (variance < 0) return 'error.main'
  return 'text.secondary'
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  budgetLines,
  loading,
  onSelect,
  onEdit,
  categoryFilter,
  setCategoryFilter,
  openCreate,
  canEdit = true,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const {
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredData,
    paginatedData,
    filteredCount,
    totalCount,
    reset,
  } = useDataGrid(budgetLines, {
    initialSort: { field: 'pm_budgetlinename', dir: 'asc' },
    searchFields: ['pm_budgetlinename', 'pm_fundingsourcename', 'pm_projectname', 'pm_fiscalperiodname'],
    filterFn: (line) => {
      if (categoryFilter && String(line.pm_costcategory ?? '') !== categoryFilter) return false
      return true
    },
  })

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }} variant="outlined">
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, category, project..."
        onClear={() => {
          reset()
          setCategoryFilter('')
        }}
        extraFilters={
          <Box sx={{ minWidth: 155 }}>
            <TextField
              select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">All Categories</MenuItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Box>
        }
      />

      <TableShell
        loading={loading}
        empty={filteredCount === 0}
        emptyIcon={<AccountBalanceWalletIcon />}
        emptyTitle={searchQuery || categoryFilter ? 'No budget lines match your criteria.' : 'No budget lines found.'}
        emptyAction={!searchQuery && !categoryFilter && openCreate ? (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
            Add your first budget line
          </Button>
        ) : undefined}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHeader cells={[
            { label: 'Budget Line', sortable: true, active: sort.field === 'pm_budgetlinename', dir: sort.dir, onClick: () => setSort('pm_budgetlinename') },
            { label: 'Category', sortable: true, active: sort.field === 'pm_costcategory', dir: sort.dir, onClick: () => setSort('pm_costcategory') },
            { label: 'Approved Budget', align: 'right', sortable: true, active: sort.field === 'pm_approvedbudgeteur', dir: sort.dir, onClick: () => setSort('pm_approvedbudgeteur') },
            { label: 'Revised Budget', align: 'right', sortable: true, active: sort.field === 'pm_revisedbudgeteur', dir: sort.dir, onClick: () => setSort('pm_revisedbudgeteur') },
            { label: 'Actual Spend', align: 'right', sortable: true, active: sort.field === 'pm_actualspendeur', dir: sort.dir, onClick: () => setSort('pm_actualspendeur') },
            { label: 'Variance', align: 'right', sortable: true, active: sort.field === 'pm_varianceeur', dir: sort.dir, onClick: () => setSort('pm_varianceeur') },
            ...(canEdit && onEdit ? [{ label: 'Actions', align: 'right' as const }] : [])
          ]} />
          <TableBody>
            {paginatedData.map((line, idx) => {
              const ut = budgetUtilization(line)
              const variance = line.pm_varianceeur
              const isOverBudget = variance != null && variance < 0

              return (
                <TableRow
                  key={line.pm_budgetlineid}
                  hover
                  onClick={() => onSelect(line)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.selected' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                        {(line.pm_budgetlinename ?? 'B').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {line.pm_budgetlinename ?? 'Unnamed'}
                        </Typography>
                        {line.pm_fundingsourcename && (
                          <Typography variant="caption" color="text.secondary">
                            {line.pm_fundingsourcename}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={CATEGORY_LABELS[String(line.pm_costcategory ?? '')] ?? 'Unknown'}
                      color={CATEGORY_COLORS[String(line.pm_costcategory ?? '')] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                      {line.pm_approvedbudgeteur != null ? currencyFormatter.format(line.pm_approvedbudgeteur) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {line.pm_revisedbudgeteur != null ? currencyFormatter.format(line.pm_revisedbudgeteur) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {line.pm_actualspendeur != null ? currencyFormatter.format(line.pm_actualspendeur) : '—'}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={ut}
                        sx={{
                          width: '100%',
                          maxWidth: 100,
                          height: 4,
                          borderRadius: 1.5,
                          bgcolor: isDark ? '#334155' : '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: ut > 85 ? 'error.main' : ut > 65 ? 'warning.main' : 'success.main',
                          },
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                      {isOverBudget && <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          color: getVarianceColor(variance),
                        }}
                      >
                        {variance != null ? `${variance >= 0 ? '+' : ''}${currencyFormatter.format(variance)}` : '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                  {canEdit && onEdit && (
                    <TableCell align="right" sx={{ pr: 3 }}>
                      <Tooltip title="Edit Budget Line">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(line)
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
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filteredCount > 0 && (
        <TableFooter
          filteredCount={filteredCount}
          totalCount={totalCount}
          itemLabel="budget line"
          totals={[
            { label: 'Total budget', value: `€${numberFormatter.format(filteredData.reduce((s, l) => s + (l.pm_approvedbudgeteur ?? 0), 0))}` },
            { label: 'Total actual', value: `€${numberFormatter.format(filteredData.reduce((s, l) => s + (l.pm_actualspendeur ?? 0), 0))}` },
          ]}
        />
      )}
      {!loading && filteredCount > 0 && (
        <TablePagination
          component="div"
          count={filteredCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsPerPageOptions={[5, 10, 20]}
        />
      )}
    </Paper>
  )
}
