import type { FilterOption } from '@/components/common'

export const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Financial',
  '1': 'Operational',
  '2': 'Strategic',
  '3': 'Customer',
  '4': 'Innovation',
}

export const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning'> = {
  '0': 'success',
  '1': 'primary',
  '2': 'secondary',
  '3': 'info',
  '4': 'warning',
}

export const STATUS_LABELS: Record<string, string> = {
  '0': 'Identified',
  '1': 'In Progress',
  '2': 'Realised',
  '3': 'Not Yet Achieved',
  '4': 'Cancelled',
}

export const STATUS_COLORS: Record<string, 'info' | 'warning' | 'success' | 'default' | 'error'> = {
  '0': 'info',
  '1': 'warning',
  '2': 'success',
  '3': 'default',
  '4': 'error',
}

export const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Financial' },
  { value: '1', label: 'Operational' },
  { value: '2', label: 'Strategic' },
  { value: '3', label: 'Customer' },
  { value: '4', label: 'Innovation' },
]

export const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'Identified' },
  { value: '1', label: 'In Progress' },
  { value: '2', label: 'Realised' },
  { value: '3', label: 'Not Yet Achieved' },
  { value: '4', label: 'Cancelled' },
]

export const BENEFIT_TYPES = [
  { value: 0, label: 'Quantitative' },
  { value: 1, label: 'Qualitative' },
]
