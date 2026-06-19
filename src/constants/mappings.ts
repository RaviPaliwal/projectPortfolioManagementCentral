export const RAG_COLORS = {
  '0': '#f59e0b', // Amber
  '1': '#22c55e', // Green
  '2': '#ef4444', // Red
} as const

export const RAG_LABELS = {
  '0': 'Medium',
  '1': 'Low',
  '2': 'High',
} as const

export const STATUS_COLORS_SEMANTIC = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  default: '#64748b',
} as const

export const PROJECT_PHASE_LABELS: Record<string, string> = {
  '0': 'Execution',
  '1': 'Planning',
  '2': 'Closure',
  '3': 'Initiation',
  '4': 'Rejected',
  '5': 'Completed',
}

export const PROGRAMME_PHASE_LABELS: Record<string, string> = {
  '0': 'Proposal',
  '1': 'Definition',
  '2': 'Tranche Delivery',
  '3': 'Benefits Realisation',
  '4': 'Closing',
}

export const TIMESHEET_STATUS_LABELS: Record<string, string> = {
  '0': 'Approved',
  '1': 'Submitted',
  '2': 'Rejected',
  '3': 'Draft',
}

export const TIMESHEET_STATUS_COLORS: Record<string, 'success' | 'info' | 'error' | 'default'> = {
  '0': 'success',
  '1': 'info',
  '2': 'error',
  '3': 'default',
}
