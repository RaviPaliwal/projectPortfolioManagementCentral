import { Box, Typography, Skeleton, TableContainer } from '@mui/material'
import type { ReactNode } from 'react'

export interface TableShellProps {
  children: ReactNode
  loading?: boolean
  loadingRows?: number
  empty?: boolean
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: ReactNode
  maxHeight?: string
  minHeight?: number | string
  sx?: Record<string, any>
}

export const TableShell: React.FC<TableShellProps> = ({
  children,
  loading,
  loadingRows = 5,
  empty,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyMessage,
  emptyAction,
  maxHeight = 'calc(100vh - 460px)',
  minHeight = 300,
  sx,
}) => {
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[...Array(loadingRows)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />
        ))}
      </Box>
    )
  }

  if (empty) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        {emptyIcon && <Box sx={{ mb: 2, '& svg': { fontSize: 48, color: 'text.disabled' } }}>{emptyIcon}</Box>}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {emptyTitle}
        </Typography>
        {emptyMessage && (
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            {emptyMessage}
          </Typography>
        )}
        {emptyAction}
      </Box>
    )
  }

  return (
    <TableContainer 
      sx={{ 
        maxHeight, 
        minHeight, 
        borderRadius: 2.5,
        boxShadow: (theme) => theme.palette.mode === 'dark' 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        overflow: 'auto',
        ...sx 
      }}
    >
      {children}
    </TableContainer>
  )
}

export default TableShell
