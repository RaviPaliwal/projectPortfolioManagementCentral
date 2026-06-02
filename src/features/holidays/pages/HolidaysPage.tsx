import { useEffect, useState, useMemo, useCallback } from 'react'

import {

  Box,

  Paper,

  Typography,

  Alert,
  useTheme,

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableRow,

  TableSortLabel,

  TablePagination,

  Button,

  IconButton,

  Dialog,

  DialogTitle,

  DialogContent,

  DialogActions,

  Grid,

  TextField,

  FormControl,

  InputLabel,

  Select,

  MenuItem,

  Divider,

  Avatar,

  Tabs,

  Tab,

  Card,

  CardContent,

} from '@mui/material'

import AddIcon from '@mui/icons-material/Add'

import EditIcon from '@mui/icons-material/Edit'

import DeleteIcon from '@mui/icons-material/Delete'

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'

import CelebrationIcon from '@mui/icons-material/Celebration'

import TodayIcon from '@mui/icons-material/Today'

import PublicIcon from '@mui/icons-material/Public'

import FlagIcon from '@mui/icons-material/Flag'

import NavigateNextIcon from '@mui/icons-material/NavigateNext'

import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'

import EventBusyIcon from '@mui/icons-material/EventBusy'

import ChecklistIcon from '@mui/icons-material/Checklist'

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import UpcomingIcon from '@mui/icons-material/Upcoming'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'

import type { Pm_holidaies } from '../../../generated/models/Pm_holidaiesModel'

import { Pm_holidaiesService } from '../../../generated'

import type { HolidayModel } from '@/types/dataverse'

import type { ExportColumn } from '@/components/common'

import { fontSizes } from '@/styles'

import { PageHeader, KpiCardRow, TableFooter, TableShell, SearchFilterBar, DetailDrawer, TabPanel, ExportButton, StatusTag } from '@/components/common'

import type { KpiCardItem, FilterOption } from '@/components/common'

const IRISH_PUBLIC_HOLIDAYS: Array<Omit<HolidayModel, 'pm_holidayid' | 'statecode'>> = [

  { pm_holidayname: "New Year's Day", pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: true, pm_year: 0, pm_notes: 'Fixed: 1 January' },

  { pm_holidayname: "St. Patrick's Day", pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: true, pm_year: 0, pm_notes: 'Fixed: 17 March' },

  { pm_holidayname: 'Easter Monday', pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: false, pm_year: 0, pm_notes: 'Variable: Monday after Easter Sunday' },

  { pm_holidayname: 'May Bank Holiday', pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: false, pm_year: 0, pm_notes: 'Variable: First Monday in May' },

  { pm_holidayname: 'June Bank Holiday', pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: false, pm_year: 0, pm_notes: 'Variable: First Monday in June' },

  { pm_holidayname: 'August Bank Holiday', pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: false, pm_year: 0, pm_notes: 'Variable: First Monday in August' },

  { pm_holidayname: 'October Bank Holiday', pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: false, pm_year: 0, pm_notes: 'Variable: Last Monday in October' },

  { pm_holidayname: 'Christmas Day', pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: true, pm_year: 0, pm_notes: 'Fixed: 25 December' },

  { pm_holidayname: "St. Stephen's Day", pm_holidaydate: '', pm_country: 'Ireland', pm_isfixeddate: true, pm_year: 0, pm_notes: 'Fixed: 26 December' },

]

const COUNTRY_OPTIONS: FilterOption[] = [

  { value: '', label: 'All Countries' },

  { value: 'Ireland', label: 'Ireland' },

  { value: 'UK', label: 'United Kingdom' },

  { value: 'US', label: 'United States' },

  { value: 'Germany', label: 'Germany' },

  { value: 'France', label: 'France' },

  { value: 'Spain', label: 'Spain' },

  { value: 'Italy', label: 'Italy' },

  { value: 'Netherlands', label: 'Netherlands' },

  { value: 'Australia', label: 'Australia' },

]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const holidayExportColumns: ExportColumn[] = [

  { key: 'pm_holidayname', label: 'Holiday Name' },

  { key: 'pm_holidaydate', label: 'Date' },

  { key: 'pm_country', label: 'Country' },

  { key: 'pm_isfixeddate', label: 'Fixed Date' },

  { key: 'pm_year', label: 'Year' },

  { key: 'pm_notes', label: 'Notes' },

]

const unwrapHolidayList = (result: any): Pm_holidaies[] => {

  if (!result) return []

  if ('value' in result) return result.value as Pm_holidaies[]

  if ('data' in result) return result.data as Pm_holidaies[]

  if (Array.isArray(result)) return result

  return []

}

const mapHoliday = (item: Pm_holidaies): HolidayModel => ({

  pm_holidayid: item.pm_holidayid,

  pm_holidayname: item.pm_holidayname,

  pm_holidaydate: item.pm_holidaydate,

  pm_country: item.pm_country,

  pm_isfixeddate: item.pm_isfixeddate,

  pm_year: item.pm_year,

  pm_notes: item.pm_notes,

  statecode: item.statecode,

})

const getYear = (dateStr?: string): number | null => {

  if (!dateStr) return null

  const d = new Date(dateStr)

  return isNaN(d.getTime()) ? null : d.getFullYear()

}

const getMonth = (dateStr?: string): number | null => {

  if (!dateStr) return null

  const d = new Date(dateStr)

  return isNaN(d.getTime()) ? null : d.getMonth()

}

const formatDate = (dateStr?: string): string => {

  if (!dateStr) return String.fromCharCode(8212)

  try {

    const d = new Date(dateStr)

    if (isNaN(d.getTime())) return dateStr

    return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })

  } catch {

    return dateStr

  }

}

type HolidaySortField = 'name' | 'date' | 'country' | 'year'

type SortDir = 'asc' | 'desc'

interface SortState {

  field: HolidaySortField

  dir: SortDir

}

export default function HolidaysPage() {

  const theme = useTheme()

  const isDark = theme.palette.mode === 'dark'

  const [holidays, setHolidays] = useState<HolidayModel[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)

  const [pageTab, setPageTab] = useState(0)

  const currentYear = new Date().getFullYear()

  const [calendarYear, setCalendarYear] = useState(currentYear)

  const [searchQuery, setSearchQuery] = useState('')

  const [countryFilter, setCountryFilter] = useState('')

  const [sort, setSort] = useState<SortState>({ field: 'date', dir: 'asc' })

  const [page, setPage] = useState(0)

  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [selectedHoliday, setSelectedHoliday] = useState<HolidayModel | null>(null)

  const [showForm, setShowForm] = useState(false)

  const [editingHoliday, setEditingHoliday] = useState<HolidayModel | null>(null)

  const [formData, setFormData] = useState({

    pm_holidayname: '',

    pm_holidaydate: '',

    pm_country: 'Ireland',

    pm_isfixeddate: true,

    pm_year: currentYear,

    pm_notes: '',

  })

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [showSeedConfirm, setShowSeedConfirm] = useState(false)

  const [seeding, setSeeding] = useState(false)

  const loadData = useCallback(async () => {

    setLoading(true)

    setError(null)

    try {

      const result = await Pm_holidaiesService.getAll({ top: 1000 })

      const list = unwrapHolidayList(result).map(mapHoliday)

      setHolidays(list)

    } catch {

      setError('Unable to load holidays data.')

    } finally {

      setLoading(false)

    }

  }, [])

  useEffect(() => {

    loadData()

  }, [loadData])

  const kpiItems = useMemo((): KpiCardItem[] => {

    const total = holidays.length

    const byCurrentYear = holidays.filter((h) => {

      const y = getYear(h.pm_holidaydate) || h.pm_year

      return y === calendarYear

    })

    const ieHolidays = holidays.filter((h) => (h.pm_country || '').toLowerCase() === 'ireland')

    const fixedDates = holidays.filter((h) => h.pm_isfixeddate === true)

    const upcoming = holidays.filter((h) => h.pm_holidaydate && new Date(h.pm_holidaydate) >= new Date()).length

    return [

      {

        label: 'Total Holidays',

        value: total,

        subtitle: 'In the calendar',

        icon: <CelebrationIcon />,

        color: '#8b5cf6',

      },

      {

        label: 'In ' + calendarYear,

        value: byCurrentYear.length,

        subtitle: 'Holidays this year',

        icon: <CalendarMonthIcon />,

        color: '#0ea5e9',

      },

      {

        label: 'Irish Holidays',

        value: ieHolidays.length,

        subtitle: (ieHolidays.length > 0 ? ((ieHolidays.length / (total || 1)) * 100).toFixed(0) : 0) + '% of total',

        icon: <FlagIcon />,

        color: '#22c55e',

      },

      {

        label: 'Upcoming',

        value: upcoming,

        subtitle: 'Future holidays',

        icon: <UpcomingIcon />,

        color: '#0ea5e9',

      },

      {

        label: 'Fixed Date',

        value: fixedDates.length,

        subtitle: (fixedDates.length > 0 ? ((fixedDates.length / (total || 1)) * 100).toFixed(0) : 0) + '% are fixed',

        icon: <TodayIcon />,

        color: '#f59e0b',

      },

      {

        label: 'Variable Date',

        value: total - fixedDates.length,

        subtitle: (total > 0 ? (((total - fixedDates.length) / (total || 1)) * 100).toFixed(0) : 0) + '% are variable',

        icon: <EventRepeatIcon />,

        color: '#6366f1',

      },

    ]

  }, [holidays, calendarYear])

  const filteredHolidays = useMemo(() => {

    let list = [...holidays]

    if (searchQuery.trim()) {

      const q = searchQuery.toLowerCase()

      list = list.filter(

        (h) =>

          h.pm_holidayname?.toLowerCase().includes(q) ||

          h.pm_country?.toLowerCase().includes(q) ||

          h.pm_notes?.toLowerCase().includes(q)

      )

    }

    if (countryFilter) {

      list = list.filter((h) => (h.pm_country || '').toLowerCase() === countryFilter.toLowerCase())

    }

    return [...list].sort((a, b) => {

      let cmp = 0

      switch (sort.field) {

        case 'name':

          cmp = (a.pm_holidayname ?? '').localeCompare(b.pm_holidayname ?? '')

          break

        case 'date':

          cmp = (a.pm_holidaydate ?? '').localeCompare(b.pm_holidaydate ?? '')

          break

        case 'country':

          cmp = (a.pm_country ?? '').localeCompare(b.pm_country ?? '')

          break

        case 'year':

          cmp = (a.pm_year ?? 0) - (b.pm_year ?? 0)

          break

      }

      return sort.dir === 'asc' ? cmp : -cmp

    })

  }, [holidays, searchQuery, countryFilter, sort])

  const paginatedHolidays = useMemo(

    () => filteredHolidays.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),

    [filteredHolidays, page, rowsPerPage]

  )

  const calendarMonthData = useMemo(() => {

    const yearHolidays = holidays.filter((h) => {

      const y = getYear(h.pm_holidaydate) || h.pm_year

      return y === calendarYear

    })

    return MONTHS.map((name, idx) => ({

      name,

      index: idx,

      holidays: yearHolidays.filter((h) => getMonth(h.pm_holidaydate) === idx),

    }))

  }, [holidays, calendarYear])

  const handleSort = useCallback((field: HolidaySortField) => {

    setSort((prev) => ({

      field,

      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',

    }))

  }, [])

  const navigateYear = useCallback((delta: number) => {

    setCalendarYear((prev) => prev + delta)

  }, [])

  const openCreate = useCallback(() => {

    setEditingHoliday(null)

    setFormData({

      pm_holidayname: '',

      pm_holidaydate: '',

      pm_country: 'Ireland',

      pm_isfixeddate: true,

      pm_year: calendarYear,

      pm_notes: '',

    })

    setShowForm(true)

  }, [calendarYear])

  const openEdit = useCallback((holiday: HolidayModel) => {

    setEditingHoliday(holiday)

    setFormData({

      pm_holidayname: holiday.pm_holidayname ?? '',

      pm_holidaydate: holiday.pm_holidaydate ?? '',

      pm_country: holiday.pm_country || 'Ireland',

      pm_isfixeddate: holiday.pm_isfixeddate ?? true,

      pm_year: holiday.pm_year ?? calendarYear,

      pm_notes: holiday.pm_notes ?? '',

    })

    setShowForm(true)

  }, [calendarYear])

  const handleSave = async () => {

    if (!formData.pm_holidayname.trim()) {

      setError('Holiday name is required.')

      return

    }

    if (!formData.pm_holidaydate) {

      setError('Holiday date is required.')

      return

    }

    setError(null)

    setActionLoading(true)

    try {

      if (editingHoliday?.pm_holidayid) {

        await Pm_holidaiesService.update(editingHoliday.pm_holidayid, {

          ...formData,

          statecode: 0,

        } as any)

        setSuccessMsg('Holiday updated successfully.')

      } else {

        await Pm_holidaiesService.create({

          ...formData,

          statecode: 0,

          statuscode: 1,

          ownerid: '00000000-0000-0000-0000-000000000000',

          owneridtype: 'systemuser',

        } as any)

        setSuccessMsg('Holiday created successfully.')

      }

      setShowForm(false)

      setTimeout(() => setSuccessMsg(null), 3000)

      await loadData()

    } catch {

      setError(editingHoliday ? 'Unable to update holiday.' : 'Unable to create holiday.')

    } finally {

      setActionLoading(false)

    }

  }

  const handleDelete = async () => {

    if (!deleteConfirm) return

    setActionLoading(true)

    try {

      await Pm_holidaiesService.delete(deleteConfirm)

      setSuccessMsg('Holiday removed successfully.')

      setDeleteConfirm(null)

      if (selectedHoliday?.pm_holidayid === deleteConfirm) {

        setSelectedHoliday(null)

      }

      setTimeout(() => setSuccessMsg(null), 3000)

      await loadData()

    } catch {

      setError('Unable to delete holiday.')

    } finally {

      setActionLoading(false)

    }

  }

  const handleSeedIrishHolidays = async () => {

    setSeeding(true)

    setError(null)

    let created = 0

    try {

      for (const template of IRISH_PUBLIC_HOLIDAYS) {

        let dateStr = ''

        if (template.pm_isfixeddate) {

          const name = template.pm_holidayname || ''

          if (name === "New Year's Day") dateStr = calendarYear + '-01-01'

          else if (name === "St. Patrick's Day") dateStr = calendarYear + '-03-17'

          else if (name === 'Christmas Day') dateStr = calendarYear + '-12-25'

          else if (name === "St. Stephen's Day") dateStr = calendarYear + '-12-26'

        }

        if (!dateStr) {

          const name = template.pm_holidayname || ''

          if (name === 'Easter Monday') dateStr = calendarYear + '-04-01'

          else if (name === 'May Bank Holiday') dateStr = calendarYear + '-05-05'

          else if (name === 'June Bank Holiday') dateStr = calendarYear + '-06-02'

          else if (name === 'August Bank Holiday') dateStr = calendarYear + '-08-04'

          else if (name === 'October Bank Holiday') dateStr = calendarYear + '-10-27'

        }

        if (!dateStr) continue

        await Pm_holidaiesService.create({

          pm_holidayname: template.pm_holidayname,

          pm_holidaydate: dateStr,

          pm_country: 'Ireland',

          pm_isfixeddate: template.pm_isfixeddate,

          pm_year: calendarYear,

          pm_notes: template.pm_notes,

          statecode: 0,

          statuscode: 1,

          ownerid: '00000000-0000-0000-0000-000000000000',

          owneridtype: 'systemuser',

        } as any)

        created++

      }

      setSuccessMsg(created + ' Irish public holidays added for ' + calendarYear + '.')

      setShowSeedConfirm(false)

      setTimeout(() => setSuccessMsg(null), 3000)

      await loadData()

    } catch {

      setError('Unable to seed Irish holidays.')

    } finally {

      setSeeding(false)

    }

  }

  return (

    <Box>

      <PageHeader

        title="Holiday Calendar"

        subtitle="Manage public holidays and configure Irish public holiday dates across calendar years with fixed and variable date support."

        actionElement={

          <Box sx={{ display: 'flex', gap: 1 }}>

            <ExportButton data={filteredHolidays} columns={holidayExportColumns} filename={'HolidayCalendar_' + calendarYear} />

            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>

              Add Holiday

            </Button>

            <Button variant="outlined" startIcon={<FlagIcon />} size="small" onClick={() => setShowSeedConfirm(true)} sx={{ borderRadius: 1.15, fontWeight: 600 }}>

              Seed Irish Holidays for {calendarYear}

            </Button>

          </Box>

        }

      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!loading && <KpiCardRow items={kpiItems} />}

      <Tabs

        value={pageTab}

        onChange={(_, v) => { setPageTab(v); setError(null) }}

        sx={{

          mb: 3,

          borderBottom: 1,

          borderColor: 'divider',

          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 },

          '& .Mui-selected': { color: 'primary.main' },

        }}

      >

        <Tab icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Calendar View" />

        <Tab icon={<ChecklistIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="List View" />

      </Tabs>

      {/* TAB 0: Calendar View */}

      <TabPanel value={pageTab} index={0} pt={0}>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 4 }}>

          <IconButton

            onClick={() => navigateYear(-1)}

            sx={{ bgcolor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 1.15, p: 1.5 }}

          >

            <NavigateBeforeIcon />

          </IconButton>

          <Typography variant="h5" sx={{ fontWeight: 700, minWidth: 120, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace' }}>

            {calendarYear}

          </Typography>

          <IconButton

            onClick={() => navigateYear(1)}

            sx={{ bgcolor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 1.15, p: 1.5 }}

          >

            <NavigateNextIcon />

          </IconButton>

        </Box>

        {loading ? (

          <TableShell loading={true} empty={false}>

            <Table size="small"><TableHead><TableRow><TableCell /></TableRow></TableHead></Table>

          </TableShell>

        ) : (

          <Grid container spacing={2.5}>

            {calendarMonthData.map((month) => (

              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={month.index}>

                <Card variant="outlined" sx={{

                  borderRadius: 1.15,

                  height: '100%',

                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',

                  '&:hover': {

                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',

                    transform: 'translateY(-2px)',

                  },

                }}>

                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>

                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: fontSizes.base }}>

                        {month.name}

                      </Typography>

                      <StatusTag
                        label={month.holidays.length}
                        size="small"
                        color={month.holidays.length > 0 ? 'primary' : 'default'}
                        variant={month.holidays.length > 0 ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700, minWidth: 28 }}
                      />

                    </Box>

                    {month.holidays.length === 0 ? (

                      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>

                        No holidays

                      </Typography>

                    ) : (

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>

                        {month.holidays.map((h) => (

                          <Box

                            key={h.pm_holidayid}

                            onClick={() => setSelectedHoliday(h)}

                            sx={{

                              p: 1,

                              borderRadius: 1.15,

                              bgcolor: isDark ? '#1a2332' : '#f8fafc',

                              cursor: 'pointer',

                              transition: 'background-color 0.15s ease',

                              '&:hover': { bgcolor: isDark ? '#1e3a5f' : '#eef2ff' },

                              border: '1px solid',

                              borderColor: isDark ? '#334155' : '#e2e8f0',

                            }}

                          >

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

                              <EventBusyIcon sx={{ fontSize: 14, color: '#f59e0b' }} />

                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: fontSizes.xs }}>

                                {h.pm_holidayname || 'Unnamed'}

                              </Typography>

                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.25, ml: 3 }}>

                              {formatDate(h.pm_holidaydate)}

                              {h.pm_country ? ' \u00B7 ' + h.pm_country : ''}

                            </Typography>

                          </Box>

                        ))}

                      </Box>

                    )}

                  </CardContent>

                </Card>

              </Grid>

            ))}

          </Grid>

        )}

      </TabPanel>

      {/* TAB 1: List View */}

      <TabPanel value={pageTab} index={1} pt={0}>

        <Paper sx={{ overflow: 'hidden', mb: 3 }}>

          <SearchFilterBar

            searchQuery={searchQuery}

            onSearchChange={(v) => { setSearchQuery(v); setPage(0) }}

            searchPlaceholder="Search by name, country, notes..."

            filterValue={countryFilter}

            onFilterChange={(v) => { setCountryFilter(v); setPage(0) }}

            filterLabel="Country"

            filterOptions={COUNTRY_OPTIONS}

            onClear={() => { setSearchQuery(''); setCountryFilter(''); setPage(0) }}

          />

          <TableShell

            loading={loading}

            empty={filteredHolidays.length === 0}

            emptyIcon={<CelebrationIcon />}

            emptyTitle={searchQuery || countryFilter ? 'No holidays match your criteria.' : 'No holidays in the calendar yet.'}

            emptyAction={!searchQuery && !countryFilter ? (

              <Box sx={{ display: 'flex', gap: 1 }}>

                <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>

                  Add your first holiday

                </Button>

                <Button variant="outlined" startIcon={<FlagIcon />} onClick={() => setShowSeedConfirm(true)}>

                  Seed Irish Holidays

                </Button>

              </Box>

            ) : undefined}

          >

            <Table stickyHeader size="small" sx={{ minWidth: 700 }}>

              <TableHead>

                <TableRow>

                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>

                    <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>

                      Holiday

                    </TableSortLabel>

                  </TableCell>

                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>

                    <TableSortLabel active={sort.field === 'date'} direction={sort.field === 'date' ? sort.dir : 'asc'} onClick={() => handleSort('date')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>

                      Date

                    </TableSortLabel>

                  </TableCell>

                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>

                    <TableSortLabel active={sort.field === 'country'} direction={sort.field === 'country' ? sort.dir : 'asc'} onClick={() => handleSort('country')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>

                      Country

                    </TableSortLabel>

                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>

                    Fixed Date

                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>

                    <TableSortLabel active={sort.field === 'year'} direction={sort.field === 'year' ? sort.dir : 'asc'} onClick={() => handleSort('year')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>

                      Year

                    </TableSortLabel>

                  </TableCell>

                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: '2px solid ' + theme.palette.divider, px: 2.5, py: 1.5 }}>

                    Notes

                  </TableCell>

                </TableRow>

              </TableHead>

              <TableBody>

                {paginatedHolidays.map((holiday, idx) => (

                  <TableRow

                    key={holiday.pm_holidayid}

                    hover

                    onClick={() => setSelectedHoliday(holiday)}

                    sx={{

                      cursor: 'pointer',

                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',

                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },

                      transition: 'background-color 0.15s ease',

                      '& td': { px: 2.5, py: 1.25 },

                    }}

                  >

                    <TableCell>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#f59e0b', fontSize: fontSizes.sm, fontWeight: 700 }}>

                          <CelebrationIcon sx={{ fontSize: 16 }} />

                        </Avatar>

                        <Typography variant="body2" sx={{ fontWeight: 600 }}>

                          {holiday.pm_holidayname ?? 'Unnamed'}

                        </Typography>

                      </Box>

                    </TableCell>

                    <TableCell>

                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>

                        {formatDate(holiday.pm_holidaydate)}

                      </Typography>

                    </TableCell>

                    <TableCell>

                      <StatusTag
                        icon={<PublicIcon sx={{ fontSize: 14 }} />}
                        label={holiday.pm_country || '\u2014'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />

                    </TableCell>

                    <TableCell align="center">
                      <StatusTag
                        label={holiday.pm_isfixeddate ? 'Fixed' : 'Variable'}
                        color={holiday.pm_isfixeddate ? 'primary' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 70 }}
                      />
                    </TableCell>

                    <TableCell align="right">

                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>

                        {holiday.pm_year ?? '\u2014'}

                      </Typography>

                    </TableCell>

                    <TableCell>

                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>

                        {holiday.pm_notes || '\u2014'}

                      </Typography>

                    </TableCell>

                  </TableRow>

                ))}

              </TableBody>

            </Table>

          </TableShell>

          {!loading && filteredHolidays.length > 0 && (

            <TableFooter filteredCount={filteredHolidays.length} totalCount={holidays.length} itemLabel="holiday" />

          )}

          {!loading && filteredHolidays.length > 0 && (

            <TablePagination

              component="div"

              count={filteredHolidays.length}

              page={page}

              onPageChange={(_, p) => setPage(p)}

              rowsPerPage={rowsPerPage}

              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}

              rowsPerPageOptions={[25, 50, 100]}

            />

          )}

        </Paper>

      </TabPanel>

      {/* Detail Drawer */}

      <DetailDrawer

        open={!!selectedHoliday}

        onClose={() => setSelectedHoliday(null)}

        icon={<CelebrationIcon sx={{ color: '#f59e0b', fontSize: 22 }} />}

        title={selectedHoliday?.pm_holidayname ?? ''}

        subtitle={selectedHoliday && (
          <StatusTag icon={<PublicIcon sx={{ fontSize: 14 }} />} label={selectedHoliday.pm_country || '\u2014'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        )}

        headerActions={

          <Box sx={{ display: 'flex', gap: 0.5 }}>

            <IconButton size="small" color="error" onClick={() => selectedHoliday?.pm_holidayid && setDeleteConfirm(selectedHoliday.pm_holidayid)} sx={{ borderRadius: 1.15 }}>

              <DeleteIcon sx={{ fontSize: 20 }} />

            </IconButton>

            <IconButton size="small" onClick={() => selectedHoliday && openEdit(selectedHoliday)} sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}>

              <EditIcon sx={{ fontSize: 20 }} />

            </IconButton>

          </Box>

        }

      >

        {selectedHoliday && (

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>

                <AutoAwesomeIcon sx={{ fontSize: 16 }} /> Holiday Details

              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>

                <Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Date</Typography>

                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedHoliday.pm_holidaydate)}</Typography>

                </Box>

                <Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>

                  <StatusTag
                    icon={<PublicIcon sx={{ fontSize: 14 }} />}
                    label={selectedHoliday.pm_isfixeddate ? 'Fixed Date' : 'Variable Date'} color={selectedHoliday.pm_isfixeddate ? 'primary' : 'warning'} size="small" sx={{ fontWeight: 600, borderRadius: 1.15 }} />

                </Box>

                <Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Country</Typography>

                  <Typography variant="body2">{selectedHoliday.pm_country || '\u2014'}</Typography>

                </Box>

                <Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Year</Typography>

                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{selectedHoliday.pm_year ?? '\u2014'}</Typography>

                </Box>

              </Box>

              {selectedHoliday.pm_notes && (

                <Box sx={{ mt: 2 }}>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Notes</Typography>

                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>{selectedHoliday.pm_notes}</Typography>

                </Box>

              )}

            </Paper>

          </Box>

        )}

      </DetailDrawer>

      {/* Create/Edit Dialog */}

      <Dialog open={showForm} onClose={() => !actionLoading && setShowForm(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}>

        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>

          <Avatar sx={{ width: 32, height: 32, bgcolor: '#f59e0b', borderRadius: 1.15 }}>

            {editingHoliday ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <CelebrationIcon sx={{ fontSize: 18, color: '#fff' }} />}

          </Avatar>

          {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}

        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>

            {editingHoliday ? 'Update details for ' + editingHoliday.pm_holidayname + '.' : 'Add a new public holiday to the calendar.'}

          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>

            <CelebrationIcon sx={{ fontSize: 18, color: '#f59e0b' }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>

              Holiday Information

            </Typography>

            <Divider sx={{ flex: 1 }} />

          </Box>

          <Grid container spacing={2.5} sx={{ mb: 3 }}>

            <Grid size={{ xs: 12, sm: 6 }}>

              <TextField label="Holiday Name" required fullWidth size="small" value={formData.pm_holidayname}

                onChange={(e) => setFormData((f) => ({ ...f, pm_holidayname: e.target.value }))}

                placeholder="e.g., Christmas Day" slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />

            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>

              <TextField label="Date" required type="date" fullWidth size="small" value={formData.pm_holidaydate}

                onChange={(e) => setFormData((f) => ({ ...f, pm_holidaydate: e.target.value }))}

                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.15 } } }} />

            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>

              <FormControl fullWidth size="small">

                <InputLabel>Country</InputLabel>

                <Select value={formData.pm_country} label="Country" onChange={(e) => setFormData((f) => ({ ...f, pm_country: e.target.value }))} sx={{ borderRadius: 1.15 }}>

                  {COUNTRY_OPTIONS.filter((o) => o.value).map((opt) => (

                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>

                  ))}

                </Select>

              </FormControl>

            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>

              <FormControl fullWidth size="small">

                <InputLabel>Date Type</InputLabel>

                <Select value={formData.pm_isfixeddate ? 'fixed' : 'variable'} label="Date Type"

                  onChange={(e) => setFormData((f) => ({ ...f, pm_isfixeddate: e.target.value === 'fixed' }))} sx={{ borderRadius: 1.15 }}>

                  <MenuItem value="fixed">Fixed Date</MenuItem>

                  <MenuItem value="variable">Variable Date</MenuItem>

                </Select>

              </FormControl>

            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>

              <TextField label="Year" type="number" fullWidth size="small" value={formData.pm_year}

                onChange={(e) => setFormData((f) => ({ ...f, pm_year: parseInt(e.target.value, 10) || new Date().getFullYear() }))}

                slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />

            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', pt: 1 }}>

                <FormControl size="small">

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Status</Typography>

                    <Select value={0} size="small" sx={{ borderRadius: 1.15, minWidth: 100 }}>

                      <MenuItem value={0}>Active</MenuItem>

                    </Select>

                  </Box>

                </FormControl>

              </Box>

            </Grid>

            <Grid size={{ xs: 12 }}>

              <TextField label="Notes" fullWidth multiline rows={2} size="small" value={formData.pm_notes}

                onChange={(e) => setFormData((f) => ({ ...f, pm_notes: e.target.value }))}

                placeholder="Additional information about this holiday..." slotProps={{ input: { sx: { borderRadius: 1.15 } } }} />

            </Grid>

          </Grid>

        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>

          <Button onClick={() => setShowForm(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>Cancel</Button>

          <Button onClick={handleSave} variant="contained"

            disabled={!formData.pm_holidayname.trim() || !formData.pm_holidaydate || actionLoading}

            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}>

            {actionLoading ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}

          </Button>

        </DialogActions>

      </Dialog>

      {/* Delete Confirmation */}

      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}>

        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Holiday</DialogTitle>

        <DialogContent>

          <Typography variant="body2" color="text.secondary">

            Are you sure you want to remove this holiday from the calendar? This action cannot be undone.

          </Typography>

        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>

          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>Cancel</Button>

          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>

            {actionLoading ? 'Removing...' : 'Remove'}

          </Button>

        </DialogActions>

      </Dialog>

      {/* Seed Irish Holidays Confirmation */}

      <Dialog open={showSeedConfirm} onClose={() => !seeding && setShowSeedConfirm(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}>

        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>

          <FlagIcon sx={{ color: '#22c55e' }} />

          Seed Irish Holidays

        </DialogTitle>

        <DialogContent>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>

            This will add the 9 Irish public holidays for the year <strong>{calendarYear}</strong> to the calendar:

          </Typography>

          <Box component="ul" sx={{ pl: 2.5, m: 0 }}>

            {IRISH_PUBLIC_HOLIDAYS.map((h, i) => (

              <Box component="li" key={i} sx={{ mb: 0.5 }}>

                <Typography variant="body2" color="text.secondary">

                  {h.pm_holidayname}{h.pm_isfixeddate ? '' : ' (Variable)'}

                </Typography>

              </Box>

            ))}

          </Box>

        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>

          <Button onClick={() => setShowSeedConfirm(false)} variant="outlined" disabled={seeding} sx={{ borderRadius: 1.15 }}>Cancel</Button>

          <Button onClick={handleSeedIrishHolidays} variant="contained" color="success" disabled={seeding} startIcon={<FlagIcon />} sx={{ borderRadius: 1.15, fontWeight: 600 }}>

            {seeding ? 'Adding...' : 'Add 9 Holidays'}

          </Button>

        </DialogActions>

      </Dialog>

    </Box>

  )

}