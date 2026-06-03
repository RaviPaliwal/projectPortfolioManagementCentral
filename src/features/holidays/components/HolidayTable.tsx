import { Paper, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, TablePagination, useTheme } from '@mui/material'
import CelebrationIcon from '@mui/icons-material/Celebration'
import PublicIcon from '@mui/icons-material/Public'
import { SearchFilterBar, TableShell, StatusTag } from '@/components/common'
import { formatDate } from '@/utils/formatters'
import { fontSizes } from '@/styles'
import type { HolidayModel } from '@/types/dataverse'
import type { FilterOption } from '@/components/common'

interface HolidayTableProps {
  loading: boolean
  filteredHolidays: HolidayModel[]
  searchQuery: string
  onSearchChange: (val: string) => void
  countryFilter: string
  onFilterChange: (val: string) => void
  countryOptions: FilterOption[]
  page: number
  onPageChange: (val: number) => void
  rowsPerPage: number
  onRowsPerPageChange: (val: number) => void
  onSelectHoliday: (holiday: HolidayModel) => void
}

export const HolidayTable: React.FC<HolidayTableProps> = ({
  loading,
  filteredHolidays,
  searchQuery,
  onSearchChange,
  countryFilter,
  onFilterChange,
  countryOptions,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  onSelectHoliday,
}) => {
  const theme = useTheme()

  const paginatedHolidays = filteredHolidays.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3, borderRadius: 2 }}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by name, country, notes..."
        filterValue={countryFilter}
        onFilterChange={onFilterChange}
        filterLabel="Country"
        filterOptions={countryOptions}
        onClear={() => { onSearchChange(''); onFilterChange('') }}
      />

      <TableShell
        loading={loading}
        empty={filteredHolidays.length === 0}
        emptyIcon={<CelebrationIcon />}
        emptyTitle="No holidays found"
        emptyMessage="Try adjusting your filters or search terms."
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 700 }}>Holiday Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Year</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedHolidays.map((h) => (
              <TableRow
                key={h.pm_holidayid}
                hover
                onClick={() => onSelectHoliday(h)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{h.pm_holidayname}</TableCell>
                <TableCell>{formatDate(h.pm_holidaydate)}</TableCell>
                <TableCell>
                  <StatusTag
                    icon={<PublicIcon sx={{ fontSize: 14 }} />}
                    label={h.pm_country || '—'}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <StatusTag
                    label={h.pm_isfixeddate ? 'Fixed' : 'Variable'}
                    color={h.pm_isfixeddate ? 'primary' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: '"Plus Jakarta Sans", monospace', fontSize: fontSizes.sm }}>
                  {h.pm_year}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filteredHolidays.length > 0 && (
        <TablePagination
          component="div"
          count={filteredHolidays.length}
          page={page}
          onPageChange={(_, p) => onPageChange(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { onRowsPerPageChange(parseInt(e.target.value, 10)) }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      )}
    </Paper>
  )
}
