import React, { useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  LinearProgress,
  Tooltip,
  TextField,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import EditIcon from '@mui/icons-material/Edit'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'

import type { BudgetLineModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { DataverseTable, StatusTag, type Column } from '@/components/common'

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
  const columns: Column<BudgetLineModel>[] = useMemo(() => [
    {
      key: 'pm_budgetlinename',
      label: 'Budget Line',
      format: (val: any, line: BudgetLineModel) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
            {(val ?? 'B').charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {val ?? 'Unnamed'}
            </Typography>
            {line.pm_fundingsourcename && (
              <Typography variant="caption" color="text.secondary">
                {line.pm_fundingsourcename}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'pm_costcategory',
      label: 'Category',
      format: (val: any) => (
        <StatusTag
          label={CATEGORY_LABELS[String(val ?? '')] ?? 'Unknown'}
          color={CATEGORY_COLORS[String(val ?? '')] ?? 'default'}
        />
      )
    },
    {
      key: 'pm_budgetlinestatus',
      label: 'Status',
      format: (val: any) => (
        <StatusTag
          label={String(val) === '1' ? 'Under Approval' : String(val) === '2' ? 'Approved' : String(val) === '3' ? 'Rejected' : 'Unknown'}
          color={String(val) === '1' ? 'warning' : String(val) === '2' ? 'success' : String(val) === '3' ? 'error' : 'default'}
        />
      )
    },
    {
      key: 'pm_approvedbudgeteur',
      label: 'Approved Budget',
      align: 'right',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
          {val != null ? currencyFormatter.format(val) : '—'}
        </Typography>
      )
    },
    {
      key: 'pm_revisedbudgeteur',
      label: 'Revised Budget',
      align: 'right',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
          {val != null ? currencyFormatter.format(val) : '—'}
        </Typography>
      )
    },
    {
      key: 'pm_actualspendeur',
      label: 'Actual Spend',
      align: 'right',
      format: (val: any, line: BudgetLineModel) => {
        const ut = budgetUtilization(line)
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
              {val != null ? currencyFormatter.format(val) : '—'}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={ut}
              sx={{
                width: '100%',
                minWidth: 80,
                height: 4,
                borderRadius: 1.5,
                '& .MuiLinearProgress-bar': {
                  bgcolor: ut > 85 ? 'error.main' : ut > 65 ? 'warning.main' : 'success.main',
                },
              }}
            />
          </Box>
        )
      }
    },
    {
      key: 'pm_varianceeur',
      label: 'Variance',
      align: 'right',
      format: (val: any) => {
        const isOverBudget = val != null && val < 0
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
            {isOverBudget && (
              <Tooltip title="Revised budget exceeded!">
                <WarningAmberIcon color="error" sx={{ fontSize: 16 }} />
              </Tooltip>
            )}
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: getVarianceColor(val) }}>
              {val != null ? currencyFormatter.format(val) : '—'}
            </Typography>
          </Box>
        )
      }
    }
  ], [])

  const filteredData = useMemo(() => {
    return budgetLines.filter((line) => {
      if (categoryFilter && String(line.pm_costcategory ?? '') !== categoryFilter) return false
      return true
    })
  }, [budgetLines, categoryFilter])

  const totals = useMemo(() => [
    { label: 'Total budget', value: `€${numberFormatter.format(filteredData.reduce((s, l) => s + (l.pm_approvedbudgeteur ?? 0), 0))}` },
    { label: 'Total actual', value: `€${numberFormatter.format(filteredData.reduce((s, l) => s + (l.pm_actualspendeur ?? 0), 0))}` }
  ], [filteredData])

  const actions = useCallback((line: BudgetLineModel) => (
    canEdit && onEdit ? (
      <Tooltip title="Edit Budget Line">
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation()
            onEdit(line)
          }}
          sx={{ 
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    ) : null
  ), [canEdit, onEdit])

  return (
    <DataverseTable
      data={filteredData}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by name, category, project..."
      searchFields={['pm_budgetlinename', 'pm_fundingsourcename', 'pm_projectname', 'pm_fiscalperiodname']}
      emptyIcon={<AccountBalanceWalletIcon />}
      emptyTitle="No budget lines found"
      onRowClick={onSelect}
      actions={actions}
      exportFileName="budgets_register"
      itemLabel="budget line"
      totals={totals}
      extraFilters={
        <TextField
          select
          size="small"
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          slotProps={{ select: { native: true } }}
          sx={{ minWidth: 155 }}
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </TextField>
      }
      onClearFilters={() => setCategoryFilter('')}
    />
  )
}
