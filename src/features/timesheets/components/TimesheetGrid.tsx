import { useCallback, useMemo, useState, type ReactElement } from 'react'
import {
  Box,
  Typography,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  useTheme,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
import EditNoteIcon from '@mui/icons-material/EditNote'
import EventNoteIcon from '@mui/icons-material/EventNote'
import type { TimesheetModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { TableFooter, TableShell, SearchFilterBar, StatusTag } from '@/components/common'
import { useDataGrid } from '@/hooks/useDataGrid'
import { formatDateShort } from '@/utils/formatters'
import { TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS } from '@/constants/mappings'

const STATUS_ICONS: Record<string, ReactElement> = {
  '0': <CheckCircleIcon sx={{ fontSize: 16 }} />,
  '1': <SendIcon sx={{ fontSize: 16 }} />,
  '2': <CancelIcon sx={{ fontSize: 16 }} />,
  '3': <EditNoteIcon sx={{ fontSize: 16 }} />,
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: '3', label: 'Draft' },
  { value: '1', label: 'Submitted' },
  { value: '0', label: 'Approved' },
  { value: '2', label: 'Rejected' },
]

interface TimesheetGridProps {
  timesheets: TimesheetModel[]
  loading: boolean
  onRowClick: (timesheet: TimesheetModel) => void
  selectedTimesheetId?: string
  onCreateFirst: () => void
}

export function TimesheetGrid({
  timesheets,
  loading,
  onRowClick,
  selectedTimesheetId,
  onCreateFirst,
}: TimesheetGridProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [statusFilter, setStatusFilter] = useState('')

  const filterFn = useCallback(
    (t: TimesheetModel) => {
      if (!statusFilter) return true
      return String(t.pm_timesheetstatus) === statusFilter
    },
    [statusFilter]
  )

  const {
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredData,
    paginatedData,
    totalCount,
    filteredCount,
    reset,
  } = useDataGrid(timesheets, {
    searchFields: ['pm_ownername', 'pm_timesheetname', 'pm_reportingperiod', 'pm_resourcename'],
    filterFn,
  })

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value)
      setPage(null, 0)
    },
    [setPage]
  )

  const handleClear = useCallback(() => {
    reset()
    setStatusFilter('')
  }, [reset])

  const totals = useMemo(
    () => [
      {
        label: 'Total hours',
        value: `${filteredData
          .reduce((s, t) => s + (t.pm_totalhours ?? 0), 0)
          .toLocaleString()}h`,
      },
      {
        label: 'Chargeable',
        value: `${filteredData
          .reduce((s, t) => s + (t.pm_totalchargeablehours ?? 0), 0)
          .toLocaleString()}h`,
      },
    ],
    [filteredData]
  )

  return (
    <Box>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by owner, name, period..."
        filterValue={statusFilter}
        onFilterChange={handleStatusFilterChange}
        filterLabel="Status"
        filterOptions={STATUS_FILTER_OPTIONS}
        onClear={handleClear}
      />

      <TableShell
        loading={loading}
        empty={filteredCount === 0}
        emptyIcon={<EventNoteIcon />}
        emptyTitle={searchQuery || statusFilter ? 'No timesheets match your criteria.' : 'No timesheets found.'}
        emptyAction={
          !searchQuery && !statusFilter ? (
            <Box onClick={onCreateFirst} component="span" sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600 }}>
              Create your first timesheet
            </Box>
          ) : undefined
        }
      >
        <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Timesheet / Owner
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Period
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Status
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Total Hours
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Chargeable
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Submitted
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((ts, idx) => (
              <TableRow
                key={ts.pm_timesheetid}
                hover
                onClick={() => onRowClick(ts)}
                selected={selectedTimesheetId === ts.pm_timesheetid}
                sx={{
                  cursor: 'pointer',
                  bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                  '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                  '&.Mui-selected': { bgcolor: isDark ? '#1e3a5f' : '#e0e7ff' },
                  transition: 'background-color 0.15s ease',
                  '& td': { px: 2.5, py: 1.25 },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: fontSizes.sm, fontWeight: 700 }}>
                      {(ts.pm_resourcename ?? '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {ts.pm_timesheetname || 'Unnamed'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ts.pm_ownername || ts.pm_resourcename || '—'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                    {formatDateShort(ts.pm_periodstartdate)}
                    {' – '}
                    {formatDateShort(ts.pm_periodenddate)}
                  </Typography>
                  {ts.pm_reportingperiod && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }}>
                      {ts.pm_reportingperiod}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <StatusTag
                    icon={STATUS_ICONS[String(ts.pm_timesheetstatus)] || undefined}
                    label={TIMESHEET_STATUS_LABELS[String(ts.pm_timesheetstatus)] ?? 'Unknown'}
                    color={TIMESHEET_STATUS_COLORS[String(ts.pm_timesheetstatus)] ?? 'default'}
                    size="small"
                    variant={String(ts.pm_timesheetstatus) === '2' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {ts.pm_totalhours ?? 0}h
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
                    {ts.pm_totalchargeablehours != null ? `${ts.pm_totalchargeablehours}h` : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {ts.pm_submissiondate ? formatDateShort(ts.pm_submissiondate) : '—'}
                  </Typography>
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
          itemLabel="timesheet"
          totals={totals}
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
