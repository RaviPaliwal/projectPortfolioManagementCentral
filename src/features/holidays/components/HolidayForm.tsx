import React from 'react'
import { DynamicFormDialog } from '@/components/common'
import type { FormField, FilterOption } from '@/components/common'
import type { HolidayModel } from '@/types/dataverse'

interface HolidayFormProps {
  open: boolean
  onClose: () => void
  editingHoliday: HolidayModel | null
  countryOptions: FilterOption[]
  onSave: (data: Record<string, any>) => Promise<void>
}

export const HolidayForm: React.FC<HolidayFormProps> = ({
  open,
  onClose,
  editingHoliday,
  countryOptions,
  onSave,
}) => {
  const fields: FormField[] = [
    { name: 'pm_holidayname', label: 'Holiday Name', type: 'text', required: true, gridSize: 6 },
    { name: 'pm_holidaydate', label: 'Date', type: 'date', required: true, gridSize: 6 },
    { name: 'pm_country', label: 'Country', type: 'select', gridSize: 6, options: countryOptions.filter(o => o.value).map(o => ({ value: o.value, label: o.label })) },
    { name: 'pm_isfixeddate', label: 'Date Type', type: 'select', defaultValue: 1, gridSize: 6, options: [
      { value: 1, label: 'Fixed Date' }, { value: 0, label: 'Variable Date' }
    ]},
    { name: 'pm_year', label: 'Year', type: 'number', defaultValue: new Date().getFullYear(), gridSize: 6 },
    { name: 'pm_notes', label: 'Notes', type: 'multiline', rows: 2 }
  ]

  return (
    <DynamicFormDialog
      open={open}
      title={editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
      fields={fields}
      initialData={editingHoliday || {}}
      onClose={onClose}
      onSubmit={onSave}
      submitText={editingHoliday ? 'Update Holiday' : 'Create Holiday'}
    />
  )
}
