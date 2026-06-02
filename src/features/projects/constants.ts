import type { ExportColumn } from '@/utils/exportUtils'

export const RAG_COLORS: Record<string, string> = {
  '2': '#ef4444',
  '1': '#22c55e',
  '0': '#f59e0b',
}

export const RAG_LABELS: Record<string, string> = {
  '2': 'Red',
  '1': 'Green',
  '0': 'Amber',
}

export const phaseLabel = (code?: string | number): string => {
  if (code === '0' || code === 0) return 'Execution'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Closure'
  return 'Unknown'
}

export const currency = (val?: number): string => {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

export const projectExportColumns: ExportColumn[] = [
  { key: 'pm_projectname', label: 'Project Name' },
  { key: 'pm_projectcode', label: 'Code' },
  { key: 'pm_projectmanager', label: 'Manager' },
  { key: 'pm_projectsponsor', label: 'Sponsor' },
  { key: 'pm_businessunit', label: 'Business Unit' },
  { key: 'pm_projectphase', label: 'Phase', format: (v) => ['Execution', 'Planning', 'Closure'][Number(v)] ?? '' },
  { key: 'pm_ragstatus', label: 'RAG', format: (v) => ['Amber', 'Green', 'Red'][Number(v)] ?? '' },
  { key: 'pm_approvedbudgeteur', label: 'Budget', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_actualcosteur', label: 'Actual Cost', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_percentcomplete', label: '% Complete', format: (v) => `${v ?? 0}%` },
  { key: 'pm_plannedstartdate', label: 'Start Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'pm_plannedenddate', label: 'End Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
]
