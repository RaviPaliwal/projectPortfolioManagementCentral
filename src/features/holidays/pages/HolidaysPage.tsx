import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
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

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import { Pm_holidaiesService } from '@/generated'
import type { HolidayModel } from '@/types/dataverse'
import { 
  PageHeader, 
  KpiCardRow, 
  DetailDrawer, 
  TabPanel, 
  ExportButton, 
  StatusTag, 
  ActionIcon, 
  Button, 
  ConfirmDialog 
} from '@/components/common'
import type { KpiCardItem, FilterOption, ExportColumn } from '@/components/common'

// Sub-components
import { HolidayCalendar } from '../components/HolidayCalendar'
import { HolidayTable } from '../components/HolidayTable'
import { HolidayForm } from '../components/HolidayForm'
import { HolidayDetail } from '../components/HolidayDetail'
import { SeedHolidaysDialog } from '../components/SeedHolidaysDialog'
import { useDataverseCrud } from '@/hooks/useDataverseCrud'
import { useDataverseAsync } from '@/hooks/useDataverseAsync'

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

export default function HolidaysPage() {
  const { allowed: canCreate } = useAuthorization('HOLIDAYS', 'create')
  const { allowed: canEdit } = useAuthorization('HOLIDAYS', 'update')
  const { allowed: canDelete } = useAuthorization('HOLIDAYS', 'delete')

  const [holidays, setHolidays] = useState<HolidayModel[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [pageTab, setPageTab] = useState(0)
  const currentYear = new Date().getFullYear()
  const [calendarYear, setCalendarYear] = useState(currentYear)
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayModel | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<HolidayModel | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await Pm_holidaiesService.getAll({
        filter: 'statecode eq 0',
        orderBy: ['pm_holidaydate asc'],
        top: 500,
      })
      if (result.success && result.data) {
        setHolidays(result.data)
      } else {
        setError(result.error ? String(result.error) : 'Failed to fetch holidays')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch holidays')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = holidays.length
    const byCurrentYear = holidays.filter((h) => (new Date(h.pm_holidaydate || '').getFullYear() || h.pm_year) === calendarYear)
    const ieHolidays = holidays.filter((h) => (h.pm_country || '').toLowerCase() === 'ireland')
    const upcoming = holidays.filter((h) => h.pm_holidaydate && new Date(h.pm_holidaydate) >= new Date()).length

    return [
      { label: 'Total Holidays', value: total, icon: <CelebrationIcon />, color: 'secondary.main' },
      { label: `In ${calendarYear}`, value: byCurrentYear.length, icon: <CalendarMonthIcon />, color: 'primary.main' },
      { label: 'Irish Holidays', value: ieHolidays.length, icon: <FlagIcon />, color: 'success.main' },
      { label: 'Upcoming', value: upcoming, icon: <UpcomingIcon />, color: 'info.main' },
      { label: 'Fixed Date', value: holidays.filter(h => h.pm_isfixeddate).length, icon: <TodayIcon />, color: 'warning.main' },
    ]
  }, [holidays, calendarYear])

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => !countryFilter || (h.pm_country || '').toLowerCase() === countryFilter.toLowerCase())
  }, [holidays, countryFilter])

  const calendarMonthData = useMemo(() => {
    const yearHolidays = holidays.filter((h) => (new Date(h.pm_holidaydate || '').getFullYear() || h.pm_year) === calendarYear)
    return MONTHS.map((name, idx) => ({
      name,
      index: idx,
      holidays: yearHolidays.filter((h) => new Date(h.pm_holidaydate || '').getMonth() === idx),
    }))
  }, [holidays, calendarYear])

  const handleSave = async (data: Record<string, any>) => {
    if (!data.pm_holidayname?.trim() || !data.pm_holidaydate) {
      return
    }

    // Convert pm_isfixeddate to boolean if it is a number or string
    const cleanData = { ...data }
    if (cleanData.pm_isfixeddate !== undefined) {
      cleanData.pm_isfixeddate = cleanData.pm_isfixeddate === 1 || cleanData.pm_isfixeddate === '1' || cleanData.pm_isfixeddate === true
    }

    setSaving(true)
    setError(null)
    try {
      if (editingHoliday?.pm_holidayid) {
        const result = await Pm_holidaiesService.update(editingHoliday.pm_holidayid, { ...cleanData, statecode: 0 } as any)
        if (result.success && result.data) {
          setHolidays(prev => prev.map(h => h.pm_holidayid === editingHoliday.pm_holidayid ? result.data! : h))
          setSuccessMsg('Holiday updated successfully.')
          setShowForm(false)
        } else {
          setError(result.error ? String(result.error) : 'Failed to update holiday')
        }
      } else {
        const result = await Pm_holidaiesService.create({ ...cleanData, statecode: 0, statuscode: 1 } as any)
        if (result.success && result.data) {
          setHolidays(prev => [result.data!, ...prev])
          setSuccessMsg('Holiday created successfully.')
          setShowForm(false)
        } else {
          setError(result.error ? String(result.error) : 'Failed to create holiday')
        }
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save holiday')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setSaving(true)
    setError(null)
    try {
      const result = await Pm_holidaiesService.delete(deleteConfirm)
      if (!result.success) {
        throw new Error(result.error?.message || 'Delete failed')
      }
      setHolidays(prev => prev.filter(h => h.pm_holidayid !== deleteConfirm))
      setSuccessMsg('Holiday removed successfully.')
      setDeleteConfirm(null)
      if (selectedHoliday?.pm_holidayid === deleteConfirm) setSelectedHoliday(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Unable to delete holiday.')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedIrishHolidays = async () => {
    setSeeding(true)
    setError(null)
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
          const variableDates: any = { 'Easter Monday': '-04-21', 'May Bank Holiday': '-05-05', 'June Bank Holiday': '-06-02', 'August Bank Holiday': '-08-04', 'October Bank Holiday': '-10-27' }
          dateStr = calendarYear + (variableDates[name] || '')
        }
        if (!dateStr) continue
        const result = await Pm_holidaiesService.create({ ...template, pm_holidaydate: dateStr, pm_year: calendarYear, statecode: 0, statuscode: 1 } as any)
        if (result.success && result.data) {
          setHolidays(prev => [result.data!, ...prev])
          created++
        } else if (result.error) {
          console.warn('[HolidaysPage] Skipping holiday seed due to error:', result.error)
        }
      }
      setSuccessMsg(`${created} Irish public holidays added for ${calendarYear}.`)
      setShowSeedConfirm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Unable to seed Irish holidays.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Holiday Calendar"
        subtitle="Manage public holidays and configure Irish public holiday dates."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredHolidays} columns={holidayExportColumns} filename={'HolidayCalendar_' + calendarYear} />
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingHoliday(null); setShowForm(true); }}>
                Add Holiday
              </Button>
            )}
            <Button variant="outlined" startIcon={<FlagIcon />} size="small" onClick={() => setShowSeedConfirm(true)}>
              Seed Irish Holidays
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <KpiCardRow items={kpiItems} loading={loading} />

      <Tabs value={pageTab} onChange={(_, v) => setPageTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Calendar View" />
        <Tab icon={<ChecklistIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="List View" />
      </Tabs>

      <TabPanel value={pageTab} index={0} pt={0}>
        <HolidayCalendar calendarYear={calendarYear} onNavigateYear={(delta) => setCalendarYear(prev => prev + delta)} loading={loading} calendarMonthData={calendarMonthData} onSelectHoliday={setSelectedHoliday} />
      </TabPanel>

      <TabPanel value={pageTab} index={1} pt={0}>
        <HolidayTable loading={loading} filteredHolidays={filteredHolidays} searchQuery={searchQuery} onSearchChange={setSearchQuery} countryFilter={countryFilter} onFilterChange={setCountryFilter} countryOptions={COUNTRY_OPTIONS} onSelectHoliday={setSelectedHoliday} />
      </TabPanel>

      <DetailDrawer
        open={!!selectedHoliday}
        onClose={() => setSelectedHoliday(null)}
        icon={<CelebrationIcon sx={{ color: 'warning.main', fontSize: 22 }} />}
        title={selectedHoliday?.pm_holidayname ?? ''}
        subtitle={selectedHoliday && <StatusTag icon={<PublicIcon sx={{ fontSize: 14 }} />} label={selectedHoliday.pm_country || '—'} variant="outlined" />}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canEdit && (
              <ActionIcon icon={<EditIcon />} onClick={() => { setEditingHoliday(selectedHoliday); setShowForm(true); }} label="Edit" color="primary" />
            )}
            {canDelete && (
              <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteConfirm(selectedHoliday?.pm_holidayid!)} label="Delete" color="error" />
            )}
          </Box>
        }
      >
        {selectedHoliday && <HolidayDetail holiday={selectedHoliday} />}
      </DetailDrawer>

      <HolidayForm
        open={showForm}
        onClose={() => setShowForm(false)}
        editingHoliday={editingHoliday}
        countryOptions={COUNTRY_OPTIONS}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Remove Holiday"
        message="Are you sure you want to remove this holiday? This action cannot be undone."
        confirmLabel="Remove"
        confirmColor="error"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
      />

      <SeedHolidaysDialog open={showSeedConfirm} onClose={() => setShowSeedConfirm(false)} onConfirm={handleSeedIrishHolidays} loading={seeding} calendarYear={calendarYear} holidays={IRISH_PUBLIC_HOLIDAYS} />
    </Box>
  )
}
