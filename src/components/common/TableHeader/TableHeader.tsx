import { useTheme, TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material'

type SortDir = 'asc' | 'desc'

export interface HeaderCell {
  label: string
  sortable?: boolean
  active?: boolean
  dir?: SortDir
  onClick?: () => void
  align?: 'left' | 'right' | 'center'
  width?: string | number
}

interface TableHeaderProps {
  cells: HeaderCell[]
}

export const TableHeader = ({ cells }: TableHeaderProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <TableHead>
      <TableRow>
        {cells.map((cell, idx) => (
          <TableCell
            key={idx}
            align={cell.align || 'left'}
            sx={{
              fontWeight: 700,
              bgcolor: isDark ? 'background.paper' : 'background.default',
              borderBottom: `2px solid ${theme.palette.divider}`,
              px: 2.5,
              py: 1.5,
              width: cell.width,
              color: isDark ? '#e2e8f0' : '#475569',
            }}
          >
            {cell.sortable ? (
              <TableSortLabel
                active={cell.active}
                direction={cell.active ? cell.dir : 'asc'}
                onClick={cell.onClick}
                sx={{
                  fontWeight: 700,
                  color: isDark ? '#e2e8f0' : '#475569',
                  '&.Mui-active': { color: isDark ? '#e2e8f0' : '#475569' },
                  '&.Mui-active .MuiTableSortLabel-icon': { color: isDark ? '#e2e8f0' : '#475569' },
                }}
              >
                {cell.label}
              </TableSortLabel>
            ) : (
              cell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}
