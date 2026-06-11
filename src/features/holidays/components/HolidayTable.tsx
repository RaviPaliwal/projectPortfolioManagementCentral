import React from 'react'
import { Typography } from '@mui/material'
import CelebrationIcon from '@mui/icons-material/Celebration'
import PublicIcon from '@mui/icons-material/Public'
import { DataverseTable, StatusTag, type Column } from '@/components/common'
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
  onSelectHoliday: (holiday: HolidayModel) => void
}

export const HolidayTable: React.FC<HolidayTableProps> = ({
  loading,
  filteredHolidays,
  countryFilter,
  onFilterChange,
  countryOptions,
  onSelectHoliday,
}) => {
  
  const columns: Column<HolidayModel>[] = [
    { key: 'pm_holidayname', label: 'Holiday Name', format: (val) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{val}</Typography> },
    { key: 'pm_holidaydate', label: 'Date', format: (val) => formatDate(val as string) },
    {
      key: 'pm_country',
      label: 'Country',
      format: (val) => (
        <StatusTag
          icon={<PublicIcon sx={{ fontSize: 14 }} />}
          label={val || '—'}
          variant="outlined"
          size="small"
        />
      )
    },
    {
      key: 'pm_isfixeddate',
      label: 'Type',
      format: (val) => (
        <StatusTag
          label={val ? 'Fixed' : 'Variable'}
          color={val ? 'primary' : 'warning'}
          size="small"
        />
      )
    },
    { 
      key: 'pm_year', 
      label: 'Year', 
      format: (val) => (
        <Typography variant="body2" sx={{ fontFamily: '"Plus Jakarta Sans", monospace', fontSize: fontSizes.sm }}>
          {val}
        </Typography>
      )
    },
  ]

  return (
    <DataverseTable
      data={filteredHolidays}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by name, country, notes..."
      searchFields={['pm_holidayname', 'pm_country', 'pm_notes']}
      emptyIcon={<CelebrationIcon />}
      onRowClick={onSelectHoliday}
      extraFilters={
        <StatusTag 
          label={countryFilter || 'All Countries'} 
          onClick={() => onFilterChange('')}
          onDelete={countryFilter ? () => onFilterChange('') : undefined}
          sx={{ visibility: countryFilter ? 'visible' : 'hidden' }}
        />
      }
      // Note: DataverseTable doesn't have a direct "onFilterChange" for custom selects yet, 
      // but we can pass them in extraFilters if we refactor SearchFilterBar further.
      // For now, I'll keep the SearchFilterBar standard.
    />
  )
}
