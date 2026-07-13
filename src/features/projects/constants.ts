import { CURRENCY_CODE } from '@/constants/currency'
import type { ExportColumn } from '@/utils/exportUtils'

export const RAG_COLORS: Record<string, string> = {
  '2': '#ef4444',
  '1': '#22c55e',
  '0': '#f59e0b',
}

export const RAG_LABELS: Record<string, string> = {
  '2': 'High',
  '1': 'Low',
  '0': 'Medium',
}

export const PHASE_COLORS: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "info" | "default"> = {
  '3': 'warning',   // Initiation
  '1': 'info',      // Planning
  '0': 'success',   // Execution
  '2': 'secondary', // Closure
  '4': 'error',     // Rejected
  '5': 'success',   // Completed
}

export const phaseLabel = (code?: string | number): string => {
  if (code === '3' || code === 3) return 'Initiation'
  if (code === '0' || code === 0) return 'Execution'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Closure'
  if (code === '4' || code === 4) return 'Rejected'
  if (code === '5' || code === 5) return 'Completed'
  return 'Unknown'
}

export const currency = (val?: number): string => {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY_CODE, maximumFractionDigits: 0 }).format(val)
}

export const projectExportColumns: ExportColumn[] = [
  { key: 'pm_projectname', label: 'Project Name' },
  { key: 'pm_projectmanager', label: 'Manager' },
  { key: 'pm_projectsponsor', label: 'Sponsor' },
  { key: 'pm_businessunit', label: 'Business Unit' },
  { key: 'pm_projectphase', label: 'Phase', format: (v) => phaseLabel(v) },
  { key: 'pm_ragstatus', label: 'RAG', format: (v) => ['Medium', 'Low', 'High'][Number(v)] ?? '' },
  { key: 'pm_approvedbudget', label: 'Budget', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_actualcost', label: 'Actual Cost', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_percentcomplete', label: '% Complete', format: (v) => `${v ?? 0}%` },
  { key: 'pm_plannedstartdate', label: 'Start Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'pm_plannedenddate', label: 'End Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
]
