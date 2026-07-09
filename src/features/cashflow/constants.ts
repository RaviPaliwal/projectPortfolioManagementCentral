import type { FilterOption } from '@/components/common'

export const DIRECTION_LABELS: Record<string, string> = {
  '0': 'Outflow',
  '1': 'Inflow',
}

export const DIRECTION_COLORS: Record<string, 'error' | 'success'> = {
  '0': 'error',
  '1': 'success',
}

export const TXN_TYPE_LABELS: Record<string, string> = {
  '0': 'Actual',
  '1': 'Forecast',
  '2': 'Planned',
}
export const DIRECTION_FILTERS: FilterOption[] = [
  { value: '', label: 'All Directions' },
  { value: '1', label: 'Inflow' },
  { value: '0', label: 'Outflow' },
]

export const TXN_TYPE_FILTERS: FilterOption[] = [
  { value: '', label: 'All Types' },
  { value: '0', label: 'Actual' },
  { value: '1', label: 'Forecast' },
  { value: '2', label: 'Planned' },
]
