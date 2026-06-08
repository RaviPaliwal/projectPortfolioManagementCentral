import React, { useEffect, useMemo } from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Typography,
  Box,
  Button,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import {
  StatusChip,
  SearchFilterBar,
  TableFooter,
  TableShell,
  VarianceDisplay,
  StatusTag,
} from '@/components/common'
import type { PortfolioModel } from '@/types/dataverse'
import { useDataGrid } from '@/hooks/useDataGrid'
import { currencyFormatter } from '@/utils/formatters'

interface PortfolioGridProps {
  portfolios: PortfolioModel[]
  loading: boolean
  onRowClick: (portfolio: PortfolioModel) => void
  onCreateClick: () => void
  onEditClick: (portfolio: PortfolioModel) => void
  onFilteredDataChange?: (data: PortfolioModel[]) => void
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'On Hold',
}

export const PortfolioGrid: React.FC<PortfolioGridProps> = ({
  portfolios,
  loading,
  onRowClick,
  onCreateClick,
  onEditClick,
  onFilteredDataChange,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const gridOptions = useMemo(() => ({
    initialSort: { field: 'pm_portfolioname' as const, dir: 'asc' as const },
    searchFields: ['pm_portfolioname', 'pm_ownerlookupname', 'pm_businessunit'] as Array<keyof PortfolioModel>,
  }), [])

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
  } = useDataGrid<PortfolioModel>(portfolios, gridOptions)

  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData)
    }
  }, [filteredData, onFilteredDataChange])

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search portfolios by name, owner, or business unit..."
        onClear={() => setSearchQuery('')}
      />

      <TableShell
        loading={loading}
        empty={filteredCount === 0}
        emptyIcon={<AccountTreeIcon />}
        emptyTitle={searchQuery ? 'No portfolios match your search.' : 'No portfolios found.'}
        emptyAction={!searchQuery && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onCreateClick}>
            Create your first portfolio
          </Button>
        )}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_portfolioname'} direction={sort.field === 'pm_portfolioname' ? sort.dir : 'asc'} onClick={() => setSort('pm_portfolioname')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Portfolio Name</TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_ownerlookupname'} direction={sort.field === 'pm_ownerlookupname' ? sort.dir : 'asc'} onClick={() => setSort('pm_ownerlookupname')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Owner / Sponsor</TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_portfoliostatus'} direction={sort.field === 'pm_portfoliostatus' ? sort.dir : 'asc'} onClick={() => setSort('pm_portfoliostatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Status</TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_ragstatus'} direction={sort.field === 'pm_ragstatus' ? sort.dir : 'asc'} onClick={() => setSort('pm_ragstatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>RAG Status</TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_approvedbudgeteur'} direction={sort.field === 'pm_approvedbudgeteur' ? sort.dir : 'asc'} onClick={() => setSort('pm_approvedbudgeteur')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Total Budget</TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_actualspendeur'} direction={sort.field === 'pm_actualspendeur' ? sort.dir : 'asc'} onClick={() => setSort('pm_actualspendeur')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Consumed</TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((portfolio, idx) => {
              const variance = (portfolio.pm_approvedbudgeteur ?? 0) - (portfolio.pm_actualspendeur ?? 0)
              const isNegative = variance < 0
              return (
                <TableRow
                  key={portfolio.pm_portfolioid}
                  hover
                  onClick={() => onRowClick(portfolio)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                    '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountTreeIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.7 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {portfolio.pm_portfolioname ?? 'Unnamed Portfolio'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {portfolio.pm_ownerlookupname || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={STATUS_LABELS[portfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Unknown'}
                      size="small"
                      variant="outlined"
                      color={portfolio.pm_portfoliostatus === 0 || portfolio.pm_portfoliostatus === '0' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={portfolio.pm_ragstatus} type="rag" size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                      {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: isDark ? 'text.disabled' : '#64748b' }}>
                      {currencyFormatter.format(portfolio.pm_actualspendeur ?? 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
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
                  </TableCell>
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
          itemLabel="portfolio"
          totals={[
            { label: 'Total budget', value: currencyFormatter.format(filteredData.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)) },
            { label: 'Total consumed', value: currencyFormatter.format(filteredData.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)) },
          ]}
        />
      )}
      {!loading && filteredCount > 0 && (
        <TablePagination
          component="div"
          count={filteredCount}
          page={page}
          onPageChange={setPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
        />
      )}
    </Paper>
  )
}

export default PortfolioGrid
