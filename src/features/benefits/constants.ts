import type { FilterOption } from '@/components/common'

export const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Financial',
  '1': 'Non Financial',
  '2': 'Strategic',
}

export const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning'> = {
  '0': 'success',
  '1': 'primary',
  '2': 'secondary',
}

export const STATUS_LABELS: Record<string, string> = {
  '0': 'On Track',
  '1': 'Planned',
  '2': 'At Risk',
}

export const STATUS_COLORS: Record<string, 'info' | 'warning' | 'success' | 'default' | 'error'> = {
  '0': 'success',
  '1': 'info',
  '2': 'warning',
}

export const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Financial' },
  { value: '1', label: 'Non Financial' },
  { value: '2', label: 'Strategic' },
]

export const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'On Track' },
  { value: '1', label: 'Planned' },
  { value: '2', label: 'At Risk' },
]

export const BENEFIT_TYPES = [
  { value: 0, label: 'Cashable' },
  { value: 1, label: 'Non Cashable' },
  { value: 2, label: 'Avoided Cost' },
]
