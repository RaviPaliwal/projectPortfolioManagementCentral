import { Box, Typography, useTheme } from '@mui/material'
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
  /** Additional content rendered on the right side */
  children?: ReactNode
}

export const TableFooter: React.FC<TableFooterProps> = ({
  filteredCount,
  totalCount,
  itemLabel = 'item',
  totals,
  children,
}) => {
  const theme = useTheme()
  const plural = (n: number) => itemLabel + (n !== 1 ? 's' : '')

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Showing {filteredCount} of {totalCount} {plural(totalCount)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {totals?.map((total, idx) => (
          <Typography key={idx} variant="caption" color="text.secondary">
            {total.label}: {total.value}
          </Typography>
        ))}
        {children}
      </Box>
    </Box>
  )
}

export default TableFooter
