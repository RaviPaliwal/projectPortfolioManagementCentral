import React from 'react'
import { Box, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptIcon from '@mui/icons-material/Receipt'
import { DataverseTable, StatusTag, ActionIcon, SearchFilterBar, type Column } from '@/components/common'
import { currencyFormatter, formatDate } from '@/utils/formatters'
import { fontSizes } from '@/styles'
import type { CashflowEntryModel } from '@/types/dataverse'
import { 
  DIRECTION_LABELS, 
  DIRECTION_COLORS, 
  TXN_TYPE_LABELS, 
  CATEGORY_LABELS, 
  DIRECTION_FILTERS, 
  TXN_TYPE_FILTERS, 
  CATEGORY_FILTERS 
} from '../constants'

interface CashflowTableProps {
  loading: boolean
  entries: CashflowEntryModel[]
  directionFilter: string
  onDirectionFilterChange: (v: string) => void
  txnTypeFilter: string
  onTxnTypeFilterChange: (v: string) => void
  categoryFilter: string
  onCategoryFilterChange: (v: string) => void
  onSelectEntry: (entry: CashflowEntryModel) => void
  onEditEntry: (entry: CashflowEntryModel) => void
  onDeleteEntry: (entry: CashflowEntryModel) => void
  canEdit?: boolean
  canDelete?: boolean
}

export const CashflowTable: React.FC<CashflowTableProps> = ({
  loading,
  entries,
  directionFilter,
  onDirectionFilterChange,
  txnTypeFilter,
  onTxnTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
  canEdit = true,
  canDelete = true,
}) => {
  
  const columns: Column<CashflowEntryModel>[] = [
    { key: 'pm_entryname', label: 'Entry Name', format: (val) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{val}</Typography> },
    { 
      key: 'pm_amounteur', 
      label: 'Amount', 
      align: 'right', 
      format: (val) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
          {currencyFormatter.format(val ?? 0)}
        </Typography>
      )
    },
    {
      key: 'pm_transactiondirection',
      label: 'Direction',
      format: (val) => (
        <StatusTag
          label={DIRECTION_LABELS[String(val ?? '')] || '—'}
          color={DIRECTION_COLORS[String(val ?? '')] || 'default'}
          size="small"
        />
      )
    },
    { key: 'pm_transactiontype', label: 'Type', format: (val) => TXN_TYPE_LABELS[String(val ?? '')] || '—' },
    { key: 'pm_category', label: 'Category', format: (val) => CATEGORY_LABELS[String(val ?? '')] || '—' },
    { key: 'pm_transactiondate', label: 'Date', format: (val) => formatDate(val as string) },
  ]

  const extraFilters = (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <SearchFilterBar
        filterValue={directionFilter}
        onFilterChange={onDirectionFilterChange}
        filterLabel="Direction"
        filterOptions={DIRECTION_FILTERS}
        sx={{ minWidth: 140, p: 0, border: 'none' }}
      />
      <SearchFilterBar
        filterValue={txnTypeFilter}
        onFilterChange={onTxnTypeFilterChange}
        filterLabel="Type"
        filterOptions={TXN_TYPE_FILTERS}
        sx={{ minWidth: 140, p: 0, border: 'none' }}
      />
      <SearchFilterBar
        filterValue={categoryFilter}
        onFilterChange={onCategoryFilterChange}
        filterLabel="Category"
        filterOptions={CATEGORY_FILTERS}
        sx={{ minWidth: 140, p: 0, border: 'none' }}
      />
    </Box>
  )

  return (
    <DataverseTable
      data={entries}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search entries..."
      searchFields={['pm_entryname', 'pm_description', 'pm_invoicenumber']}
      emptyIcon={<ReceiptIcon />}
      extraFilters={extraFilters}
      onRowClick={onSelectEntry}
      onClearFilters={() => {
        onDirectionFilterChange('')
        onTxnTypeFilterChange('')
        onCategoryFilterChange('')
      }}
      actions={(entry) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          {canEdit && (
            <ActionIcon
              icon={<EditIcon />}
              onClick={() => onEditEntry(entry)}
              label="Edit"
              color="primary"
            />
          )}
          {canDelete && (
            <ActionIcon
              icon={<DeleteIcon />}
              onClick={() => onDeleteEntry(entry)}
              label="Delete"
              color="error"
            />
          )}
        </Box>
      )}
    />
  )
}
