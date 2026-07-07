import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Typography,
  Box,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import {
  StatusChip,
  StatusTag,
  DataverseTable,
  type Column
} from '@/components/common'
import type { FilterOption } from '@/components/common'
import type { PortfolioModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { currencyFormatter } from '@/utils/formatters'

interface PortfolioGridProps {
  portfolios: PortfolioModel[]
  loading: boolean
  onRowClick: (portfolio: PortfolioModel) => void
  onCreateClick: () => void
  onEditClick: (portfolio: PortfolioModel) => void
  onDeleteClick?: (portfolio: PortfolioModel) => void
  onFilteredDataChange?: (data: PortfolioModel[]) => void
  canEdit?: boolean
  canDelete?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'Under Approval',
  '2': 'Rejected',
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'Active' },
  { value: '1', label: 'Under Approval' },
  { value: '2', label: 'Rejected' },
]

const RAG_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All RAG' },
  { value: '1', label: 'Low' },
  { value: '0', label: 'Medium' },
  { value: '2', label: 'High' },
]

export const PortfolioGrid: React.FC<PortfolioGridProps> = ({
  portfolios,
  loading,
  onRowClick,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onFilteredDataChange,
  canEdit = true,
  canDelete = false,
}) => {
  const [statusFilter, setStatusFilter] = useState('')
  const [ragFilter, setRagFilter] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')

  // Define columns for DataverseTable
  const columns: Column<PortfolioModel>[] = useMemo(() => [
    {
      key: 'pm_portfolioname',
      label: 'Portfolio Name',
      format: (val: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {val ?? 'Unnamed Portfolio'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'pm_ownerlookupname',
      label: 'Owner / Sponsor',
      format: (val: any) => (
        <Typography variant="body2" color="text.secondary">
          {val || '—'}
        </Typography>
      )
    },
    {
      key: 'pm_portfoliostatus',
      label: 'Status',
      format: (val: any) => (
        <StatusTag
          label={STATUS_LABELS[val?.toString() ?? ''] ?? 'Unknown'}
          size="small"
          variant="outlined"
          color={val === 0 || val === '0' ? 'success' : val === 1 || val === '1' ? 'warning' : 'error'}
        />
      )
    },
    {
      key: 'pm_ragstatus',
      label: 'RAG Status',
      format: (val: any) => <StatusChip status={val} type="rag" size="small" />
    },
    {
      key: 'pm_approvedbudgeteur',
      label: 'Total Budget',
      align: 'right',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
          {currencyFormatter.format(val ?? 0)}
        </Typography>
      )
    },
    {
      key: 'pm_actualspendeur',
      label: 'Consumed',
      align: 'right',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
          {currencyFormatter.format(val ?? 0)}
        </Typography>
      )
    }
  ], [])

  // Filtering logic
  const filteredData = useMemo(() => {
    return portfolios.filter((item) => {
      if (statusFilter && String(item.pm_portfoliostatus ?? '') !== statusFilter) return false
      if (ragFilter && String(item.pm_ragstatus ?? '') !== ragFilter) return false
      const budget = item.pm_approvedbudgeteur ?? 0
      if (minBudget && budget < parseFloat(minBudget)) return false
      if (maxBudget && budget > parseFloat(maxBudget)) return false
      return true
    })
  }, [portfolios, statusFilter, ragFilter, minBudget, maxBudget])

  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData)
    }
  }, [filteredData, onFilteredDataChange])

  const totals = useMemo(() => [
    { label: 'Total budget', value: currencyFormatter.format(filteredData.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)) },
    { label: 'Total consumed', value: currencyFormatter.format(filteredData.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)) }
  ], [filteredData])

  const handleClear = useCallback(() => {
    setStatusFilter('')
    setRagFilter('')
    setMinBudget('')
    setMaxBudget('')
  }, [])

  const actions = useCallback((portfolio: PortfolioModel) => (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
      {canEdit && (
        <Tooltip title="Edit Portfolio">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation()
              onEditClick(portfolio)
            }}
            sx={{ color: 'primary.main' }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Delete Portfolio">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClick?.(portfolio)
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  ), [canEdit, canDelete, onEditClick, onDeleteClick])

  return (
    <DataverseTable
      data={filteredData}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search portfolios by name, owner, or business unit..."
      searchFields={['pm_portfolioname', 'pm_ownerlookupname', 'pm_businessunit']}
      emptyIcon={<AccountTreeIcon />}
      emptyTitle="No portfolios found"
      onRowClick={onRowClick}
      actions={actions}
      exportFileName="portfolios_register"
      itemLabel="portfolio"
      totals={totals}
      extraFilters={
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 120 }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="RAG"
            value={ragFilter}
            onChange={(e) => setRagFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 100 }}
          >
            {RAG_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Min budget"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                sx: { borderRadius: 1.15, fontSize: fontSizes.base },
              },
            }}
            sx={{ maxWidth: 130 }}
          />
          <TextField
            size="small"
            placeholder="Max budget"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                sx: { borderRadius: 1.15, fontSize: fontSizes.base },
              },
            }}
            sx={{ maxWidth: 130 }}
          />
        </Box>
      }
      onClearFilters={handleClear}
    />
  )
}

export default PortfolioGrid
