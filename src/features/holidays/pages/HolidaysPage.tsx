import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CelebrationIcon from '@mui/icons-material/Celebration'
import FlagIcon from '@mui/icons-material/Flag'
import ChecklistIcon from '@mui/icons-material/Checklist'
import PublicIcon from '@mui/icons-material/Public'
import TodayIcon from '@mui/icons-material/Today'
import UpcomingIcon from '@mui/icons-material/Upcoming'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'

import type { Pm_holidaies } from '../../../generated/models/Pm_holidaiesModel'
import { Pm_holidaiesService } from '../../../generated'
import type { HolidayModel } from '@/types/dataverse'
import { PageHeader, KpiCardRow, DetailDrawer, TabPanel, ExportButton, StatusTag, ActionIcon, Button } from '@/components/common'
import type { KpiCardItem, FilterOption, ExportColumn } from '@/components/common'

// Sub-components
import { HolidayCalendar } from '../components/HolidayCalendar'
import { HolidayTable } from '../components/HolidayTable'
import { HolidayForm } from '../components/HolidayForm'
import { HolidayDetail } from '../components/HolidayDetail'
import { SeedHolidaysDialog } from '../components/SeedHolidaysDialog'
import { DeleteHolidayDialog } from '../components/DeleteHolidayDialog'

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

export default function HolidaysPage() {
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
        color: 'secondary.main',
      },
      {
        label: 'In ' + calendarYear,
        value: byCurrentYear.length,
        subtitle: 'Holidays this year',
        icon: <CalendarMonthIcon />,
        color: 'primary.main',
      },
      {
        label: 'Irish Holidays',
        value: ieHolidays.length,
        subtitle: (ieHolidays.length > 0 ? ((ieHolidays.length / (total || 1)) * 100).toFixed(0) : 0) + '% of total',
        icon: <FlagIcon />,
        color: 'success.main',
      },
      {
        label: 'Upcoming',
        value: upcoming,
        subtitle: 'Future holidays',
        icon: <UpcomingIcon />,
        color: 'info.main',
      },
      {
        label: 'Fixed Date',
        value: fixedDates.length,
        subtitle: (fixedDates.length > 0 ? ((fixedDates.length / (total || 1)) * 100).toFixed(0) : 0) + '% are fixed',
        icon: <TodayIcon />,
        color: 'warning.main',
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
    return list.sort((a, b) => (a.pm_holidaydate ?? '').localeCompare(b.pm_holidaydate ?? ''))
  }, [holidays, searchQuery, countryFilter])

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
    if (!formData.pm_holidayname.trim() || !formData.pm_holidaydate) return
    setActionLoading(true)
    try {
      if (editingHoliday?.pm_holidayid) {
        await Pm_holidaiesService.update(editingHoliday.pm_holidayid, { ...formData, statecode: 0 } as any)
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
      setError('Unable to save holiday.')
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
      if (selectedHoliday?.pm_holidayid === deleteConfirm) setSelectedHoliday(null)
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
    let created = 0
    try {
      for (const template of IRISH_PUBLIC_HOLIDAYS) {
        let dateStr = ''
        const name = template.pm_holidayname || ''
        if (template.pm_isfixeddate) {
          if (name === "New Year's Day") dateStr = calendarYear + '-01-01'
          else if (name === "St. Patrick's Day") dateStr = calendarYear + '-03-17'
          else if (name === 'Christmas Day') dateStr = calendarYear + '-12-25'
          else if (name === "St. Stephen's Day") dateStr = calendarYear + '-12-26'
        } else {
          if (name === 'Easter Monday') dateStr = calendarYear + '-04-01'
          else if (name === 'May Bank Holiday') dateStr = calendarYear + '-05-05'
          else if (name === 'June Bank Holiday') dateStr = calendarYear + '-06-02'
          else if (name === 'August Bank Holiday') dateStr = calendarYear + '-08-04'
          else if (name === 'October Bank Holiday') dateStr = calendarYear + '-10-27'
        }
        if (!dateStr) continue
        await Pm_holidaiesService.create({
          ...template,
          pm_holidaydate: dateStr,
          pm_year: calendarYear,
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
        subtitle="Manage public holidays and configure Irish public holiday dates across calendar years."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredHolidays} columns={holidayExportColumns} filename={'HolidayCalendar_' + calendarYear} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Holiday
            </Button>
            <Button variant="outlined" startIcon={<FlagIcon />} size="small" onClick={() => setShowSeedConfirm(true)}>
              Seed Irish Holidays
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
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Calendar View" />
        <Tab icon={<ChecklistIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="List View" />
      </Tabs>

      <TabPanel value={pageTab} index={0} pt={0}>
        <HolidayCalendar
          calendarYear={calendarYear}
          onNavigateYear={(delta) => setCalendarYear((prev) => prev + delta)}
          loading={loading}
          calendarMonthData={calendarMonthData}
          onSelectHoliday={setSelectedHoliday}
        />
      </TabPanel>

      <TabPanel value={pageTab} index={1} pt={0}>
        <HolidayTable
          loading={loading}
          filteredHolidays={filteredHolidays}
          searchQuery={searchQuery}
          onSearchChange={(v) => { setSearchQuery(v); setPage(0) }}
          countryFilter={countryFilter}
          onFilterChange={(v) => { setCountryFilter(v); setPage(0) }}
          countryOptions={COUNTRY_OPTIONS}
          page={page}
          onPageChange={setPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(0) }}
          onSelectHoliday={setSelectedHoliday}
        />
      </TabPanel>

      <DetailDrawer
        open={!!selectedHoliday}
        onClose={() => setSelectedHoliday(null)}
        icon={<CelebrationIcon sx={{ color: 'warning.main', fontSize: 22 }} />}
        title={selectedHoliday?.pm_holidayname ?? ''}
        subtitle={selectedHoliday && (
          <StatusTag icon={<PublicIcon sx={{ fontSize: 14 }} />} label={selectedHoliday.pm_country || '—'} size="small" variant="outlined" />
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <ActionIcon 
              icon={<EditIcon />} 
              onClick={() => selectedHoliday && openEdit(selectedHoliday)} 
              label="Edit Holiday" 
              color="primary"
            />
            <ActionIcon 
              icon={<DeleteIcon />} 
              onClick={() => selectedHoliday?.pm_holidayid && setDeleteConfirm(selectedHoliday.pm_holidayid)} 
              label="Delete Holiday" 
              color="error"
            />
          </Box>
        }
      >
        {selectedHoliday && <HolidayDetail holiday={selectedHoliday} />}
      </DetailDrawer>

      <HolidayForm
        open={showForm}
        onClose={() => setShowForm(false)}
        editingHoliday={editingHoliday}
        formData={formData}
        onFormDataChange={(data) => setFormData((f) => ({ ...f, ...data }))}
        countryOptions={COUNTRY_OPTIONS}
        onSave={handleSave}
        actionLoading={actionLoading}
      />

      <DeleteHolidayDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      <SeedHolidaysDialog
        open={showSeedConfirm}
        onClose={() => setShowSeedConfirm(false)}
        onConfirm={handleSeedIrishHolidays}
        loading={seeding}
        calendarYear={calendarYear}
        holidays={IRISH_PUBLIC_HOLIDAYS}
      />
    </Box>
  )
}
