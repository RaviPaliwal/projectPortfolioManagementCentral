import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, TablePagination } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptIcon from '@mui/icons-material/Receipt'
import { SearchFilterBar, TableShell, StatusTag, ActionIcon } from '@/components/common'
import { currencyFormatter, formatDate } from '@/utils/formatters'
import { fontSizes } from '@/styles'
import type { CashflowEntryModel } from '@/types/dataverse'
import type { FilterOption } from '@/components/common'
import { DIRECTION_LABELS, DIRECTION_COLORS, TXN_TYPE_LABELS, CATEGORY_LABELS, DIRECTION_FILTERS, TXN_TYPE_FILTERS, CATEGORY_FILTERS } from '../constants'

interface CashflowTableProps {
  loading: boolean
  entries: CashflowEntryModel[]
  searchQuery: string
  onSearchChange: (v: string) => void
  directionFilter: string
  onDirectionFilterChange: (v: string) => void
  txnTypeFilter: string
  onTxnTypeFilterChange: (v: string) => void
  categoryFilter: string
  onCategoryFilterChange: (v: string) => void
  page: number
  onPageChange: (p: number) => void
  rowsPerPage: number
  onRowsPerPageChange: (r: number) => void
  onSelectEntry: (entry: CashflowEntryModel) => void
  onEditEntry: (entry: CashflowEntryModel) => void
  onDeleteEntry: (entry: CashflowEntryModel) => void
}

export const CashflowTable: React.FC<CashflowTableProps> = ({
  loading,
  entries,
  searchQuery,
  onSearchChange,
  directionFilter,
  onDirectionFilterChange,
  txnTypeFilter,
  onTxnTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
}) => {
  const paginatedEntries = entries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3, borderRadius: 2 }}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search entries..."
        filterValue={directionFilter}
        onFilterChange={onDirectionFilterChange}
        filterLabel="Direction"
        filterOptions={DIRECTION_FILTERS}
        onClear={() => {
          onSearchChange('')
          onDirectionFilterChange('')
          onTxnTypeFilterChange('')
          onCategoryFilterChange('')
        }}
        extraFilters={
          <Box sx={{ display: 'flex', gap: 1 }}>
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
        }
      />

      <TableShell
        loading={loading}
        empty={entries.length === 0}
        emptyIcon={<ReceiptIcon />}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 700 }}>Entry Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Direction</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEntries.map((entry) => (
              <TableRow
                key={entry.pm_cashflowentryid}
                hover
                onClick={() => onSelectEntry(entry)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{entry.pm_entryname}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {currencyFormatter.format(entry.pm_amounteur ?? 0)}
                </TableCell>
                <TableCell>
                  <StatusTag
                    label={DIRECTION_LABELS[String(entry.pm_transactiondirection ?? '')] || '—'}
                    color={DIRECTION_COLORS[String(entry.pm_transactiondirection ?? '')] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{TXN_TYPE_LABELS[String(entry.pm_transactiontype ?? '')] || '—'}</TableCell>
                <TableCell>{CATEGORY_LABELS[String(entry.pm_category ?? '')] || '—'}</TableCell>
                <TableCell>{formatDate(entry.pm_transactiondate)}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <ActionIcon
                      icon={<EditIcon />}
                      onClick={() => onEditEntry(entry)}
                      label="Edit"
                      color="primary"
                    />
                    <ActionIcon
                      icon={<DeleteIcon />}
                      onClick={() => onDeleteEntry(entry)}
                      label="Delete"
                      color="error"
                    />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && entries.length > 0 && (
        <TablePagination
          component="div"
          count={entries.length}
          page={page}
          onPageChange={(_, p) => onPageChange(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[15, 30, 50]}
        />
      )}
    </Paper>
  )
}
