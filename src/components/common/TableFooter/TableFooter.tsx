import { Box, Typography, useTheme, TablePagination } from '@mui/material'
import type { ReactNode } from 'react'

export interface TableFooterTotal {
  label: string
  value: string
}

export interface TableFooterProps {
  filteredCount: number
  totalCount: number
  itemLabel?: string
  totals?: TableFooterTotal[]
  /** Optional pagination props to render page controls inline on the far right */
  page?: number
  onPageChange?: (event: any, page: number) => void
  rowsPerPage?: number
  onRowsPerPageChange?: (event: any) => void
  /** Additional content rendered on the right side */
  children?: ReactNode
}

export const TableFooter: React.FC<TableFooterProps> = ({
  filteredCount,
  totalCount,
  itemLabel = 'item',
  totals,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  children,
}) => {
  const theme = useTheme()
  const plural = (n: number) => itemLabel + (n !== 1 ? 's' : '')

  return (
    <Box
      sx={{
        px: 2.5,
        py: 0.5,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        minHeight: 48
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Showing {filteredCount} of {totalCount} {plural(totalCount)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        {totals && totals.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, mr: 1 }}>
            {totals.map((total, idx) => (
              <Typography key={idx} variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {total.label}: {total.value}
              </Typography>
            ))}
          </Box>
        )}
        {children}
        {page !== undefined && onPageChange && rowsPerPage !== undefined && onRowsPerPageChange && (
          <TablePagination
            component="div"
            count={filteredCount}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            sx={{
              border: 'none',
              backgroundColor: 'transparent',
              '.MuiTablePagination-toolbar': {
                minHeight: 40,
                p: 0,
              },
              '.MuiTablePagination-selectLabel': {
                fontSize: '0.75rem',
                color: theme.palette.text.secondary
              },
              '.MuiTablePagination-displayedRows': {
                fontSize: '0.75rem',
                color: theme.palette.text.secondary
              },
              '.MuiTablePagination-actions': {
                ml: 1
              }
            }}
          />
        )}
      </Box>
    </Box>
  )
}

export default TableFooter
