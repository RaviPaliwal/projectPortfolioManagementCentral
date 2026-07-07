import { useMemo, useState, useCallback, type ReactElement } from 'react'
import {
  Box,
  Typography,
  Avatar,
  TextField,
  useTheme,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
import EditNoteIcon from '@mui/icons-material/EditNote'
import EventNoteIcon from '@mui/icons-material/EventNote'
import type { TimesheetModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { DataverseTable, StatusTag, type Column } from '@/components/common'
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

  const columns: Column<TimesheetModel>[] = useMemo(() => [
    {
      key: 'pm_timesheetname',
      label: 'Timesheet / Owner',
      format: (val: any, ts: TimesheetModel) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
            {(ts.pm_resourcename ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {val || 'Unnamed'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ts.pm_ownername || ts.pm_resourcename || '—'}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'pm_periodstartdate',
      label: 'Period',
      format: (val: any, ts: TimesheetModel) => (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
            {formatDateShort(val)}
            {' – '}
            {formatDateShort(ts.pm_periodenddate)}
          </Typography>
          {ts.pm_reportingperiod && (
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }}>
              {ts.pm_reportingperiod}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'pm_timesheetstatus',
      label: 'Status',
      format: (val: any) => (
        <StatusTag
          icon={STATUS_ICONS[String(val)] || undefined}
          label={TIMESHEET_STATUS_LABELS[String(val)] ?? 'Unknown'}
          color={TIMESHEET_STATUS_COLORS[String(val)] ?? 'default'}
          size="small"
          variant={String(val) === '2' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 600, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
        />
      )
    },
    {
      key: 'pm_totalhours',
      label: 'Total Hours',
      align: 'right',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
          {val ?? 0}h
        </Typography>
      )
    },
    {
      key: 'pm_totalchargeablehours',
      label: 'Chargeable',
      align: 'right',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
          {val != null ? `${val}h` : '—'}
        </Typography>
      )
    },
    {
      key: 'pm_submissiondate',
      label: 'Submitted',
      format: (val: any) => (
        <Typography variant="caption" color="text.secondary">
          {val ? formatDateShort(val) : '—'}
        </Typography>
      )
    }
  ], [])

  const filteredData = useMemo(() => {
    return timesheets.filter((t) => {
      if (statusFilter && String(t.pm_timesheetstatus) !== statusFilter) return false
      return true
    })
  }, [timesheets, statusFilter])

  const totals = useMemo(() => [
    {
      label: 'Total hours',
      value: `${filteredData.reduce((s, t) => s + (t.pm_totalhours ?? 0), 0).toLocaleString()}h`,
    },
    {
      label: 'Chargeable',
      value: `${filteredData.reduce((s, t) => s + (t.pm_totalchargeablehours ?? 0), 0).toLocaleString()}h`,
    }
  ], [filteredData])

  const getRowSx = useCallback((ts: TimesheetModel) => ({
    '&.Mui-selected': { 
      bgcolor: isDark ? 'rgba(139, 92, 246, 0.15) !important' : 'rgba(139, 92, 246, 0.08) !important',
      '&:hover': { bgcolor: 'action.selected' }
    },
    bgcolor: selectedTimesheetId === ts.pm_timesheetid
      ? (isDark ? 'rgba(139, 92, 246, 0.15) !important' : 'rgba(139, 92, 246, 0.08) !important')
      : 'transparent'
  }), [isDark, selectedTimesheetId])

  return (
    <DataverseTable
      data={filteredData}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by owner, name, period..."
      searchFields={['pm_ownername', 'pm_timesheetname', 'pm_reportingperiod', 'pm_resourcename']}
      emptyIcon={<EventNoteIcon />}
      emptyTitle="No timesheets found"
      onRowClick={onRowClick}
      exportFileName="timesheets_register"
      itemLabel="timesheet"
      totals={totals}
      getRowSx={getRowSx}
      extraFilters={
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          slotProps={{ select: { native: true } }}
          sx={{ minWidth: 150 }}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </TextField>
      }
      onClearFilters={() => setStatusFilter('')}
    />
  )
}
