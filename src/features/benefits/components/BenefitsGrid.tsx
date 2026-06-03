import { useMemo } from 'react'
import {
  Box,
  Typography,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Button,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PersonIcon from '@mui/icons-material/Person'
import AddIcon from '@mui/icons-material/Add'
import type { BenefitModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { TableFooter, TableShell, SearchFilterBar, StatusTag } from '@/components/common'
import { useDataGrid } from '@/hooks/useDataGrid'
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS, CATEGORY_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from '../constants'
import { RAG_LABELS, RAG_COLORS } from '@/constants/mappings'
import { numberFormatter } from '@/utils/formatters'

interface BenefitsGridProps {
  benefits: BenefitModel[]
  loading: boolean
  onRowClick: (benefit: BenefitModel) => void
  selectedId?: string
  onCreateClick: () => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  categoryFilter: string
  onCategoryFilterChange: (category: string) => void
}

export const BenefitsGrid = ({
  benefits,
  loading,
  onRowClick,
  selectedId,
  onCreateClick,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}: BenefitsGridProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const filterFn = useMemo(() => (item: BenefitModel) => {
    const statusMatch = !statusFilter || String(item.pm_benefitstatus) === statusFilter
    const categoryMatch = !categoryFilter || String(item.pm_benefitcategory) === categoryFilter
    return statusMatch && categoryMatch
  }, [statusFilter, categoryFilter])

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
    totalCount,
    filteredCount,
    reset,
  } = useDataGrid(benefits, {
    initialSort: { field: 'pm_benefitname', dir: 'asc' },
    searchFields: [
      'pm_benefitname',
      'pm_benefitdescription',
      'pm_benifitownername',
      'pm_projectcode',
      'pm_programmename',
      'pm_unitofmeasure',
    ],
    filterFn,
  })

  return (
    <Box>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, description, owner, entity..."
        filterValue={categoryFilter}
        onFilterChange={onCategoryFilterChange}
        filterLabel="Category"
        filterOptions={CATEGORY_FILTER_OPTIONS}
        extraFilters={
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => onStatusFilterChange(e.target.value)}
              sx={{ borderRadius: 1.5 }}
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        }
        onClear={() => {
          reset()
          onCategoryFilterChange('')
          onStatusFilterChange('')
        }}
      />

      <TableShell
        loading={loading}
        empty={filteredCount === 0}
        emptyIcon={<EmojiEventsIcon />}
        emptyTitle={searchQuery || categoryFilter || statusFilter ? 'No benefits match your criteria.' : 'No benefits registered yet.'}
        emptyAction={!searchQuery && !categoryFilter && !statusFilter ? (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onCreateClick}>
            Register your first benefit
          </Button>
        ) : undefined}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_benefitname'} direction={sort.field === 'pm_benefitname' ? sort.dir : 'asc'} onClick={() => setSort('pm_benefitname')}>
                  Benefit
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_benefitcategory'} direction={sort.field === 'pm_benefitcategory' ? sort.dir : 'asc'} onClick={() => setSort('pm_benefitcategory')}>
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_benefitstatus'} direction={sort.field === 'pm_benefitstatus' ? sort.dir : 'asc'} onClick={() => setSort('pm_benefitstatus')}>
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_baselinevalue'} direction={sort.field === 'pm_baselinevalue' ? sort.dir : 'asc'} onClick={() => setSort('pm_baselinevalue')}>
                  Baseline
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_targetvalue'} direction={sort.field === 'pm_targetvalue' ? sort.dir : 'asc'} onClick={() => setSort('pm_targetvalue')}>
                  Target
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_ragstatus'} direction={sort.field === 'pm_ragstatus' ? sort.dir : 'asc'} onClick={() => setSort('pm_ragstatus')}>
                  RAG
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_benifitownername'} direction={sort.field === 'pm_benifitownername' ? sort.dir : 'asc'} onClick={() => setSort('pm_benifitownername')}>
                  Owner
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((benefit, idx) => (
              <TableRow
                key={benefit.pm_benefitid}
                hover
                onClick={() => onRowClick(benefit)}
                selected={selectedId === benefit.pm_benefitid}
                sx={{
                  cursor: 'pointer',
                  bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                  '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                  '&.Mui-selected': { bgcolor: isDark ? '#1e3a5f' : '#e0e7ff' },
                  transition: 'background-color 0.15s ease',
                  '& td': { px: 2.5, py: 1.25 },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: RAG_COLORS[String(benefit.pm_ragstatus) as keyof typeof RAG_COLORS] || 'warning.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                      {(benefit.pm_benefitname ?? 'B').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {benefit.pm_benefitname ?? 'Unnamed Benefit'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {benefit.pm_unitofmeasure || benefit.pm_benefitreference || '—'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <StatusTag
                    label={CATEGORY_LABELS[String(benefit.pm_benefitcategory ?? '')] ?? '—'}
                    color={CATEGORY_COLORS[String(benefit.pm_benefitcategory ?? '')] ?? 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <StatusTag
                    label={STATUS_LABELS[String(benefit.pm_benefitstatus ?? '')] ?? '—'}
                    color={STATUS_COLORS[String(benefit.pm_benefitstatus ?? '')] ?? 'default'}
                    variant={String(benefit.pm_benefitstatus) === '2' ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                    {benefit.pm_baselinevalue != null ? numberFormatter.format(benefit.pm_baselinevalue) : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                    {benefit.pm_targetvalue != null ? numberFormatter.format(benefit.pm_targetvalue) : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusTag
                    label={RAG_LABELS[String(benefit.pm_ragstatus) as keyof typeof RAG_LABELS] ?? '—'}
                    color={RAG_COLORS[String(benefit.pm_ragstatus) as keyof typeof RAG_COLORS]}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {benefit.pm_benifitownername || '—'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filteredCount > 0 && (
        <TableFooter
          filteredCount={filteredCount}
          totalCount={totalCount}
          itemLabel="benefit"
          totals={[
            { label: 'Realised', value: `${benefits.filter((b) => String(b.pm_benefitstatus) === '2').length}` },
            { label: 'In Progress', value: `${benefits.filter((b) => String(b.pm_benefitstatus) === '1').length}` },
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
    </Box>
  )
}
