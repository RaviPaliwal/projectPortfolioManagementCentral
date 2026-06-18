import type { RiskModel } from '@/types/dataverse'
import type { ExportColumn } from '@/utils/exportUtils'

export const RISK_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Resource',
  '1': 'Financial',
  '2': 'Legal',
  '3': 'Technical',
  '4': 'External',
}

export const RISK_CATEGORY_COLORS: Record<string, string> = {
  '0': '#0ea5e9',
  '1': '#f59e0b',
  '2': '#8b5cf6',
  '3': '#10b981',
  '4': '#ef4444',
}

export const RAG_LABELS: Record<string, string> = {
  '0': 'Amber',
  '1': 'Green',
  '2': 'Red',
}

export const RAG_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  '0': 'warning',
  '1': 'success',
  '2': 'error',
}

export const RISK_STATUS_LABELS: Record<string, string> = {
  '0': 'In Mitigation',
  '1': 'Open',
}

export const RISK_STATUS_COLORS: Record<string, 'info' | 'default'> = {
  '0': 'info',
  '1': 'default',
}

export const PROBABILITY_LABELS: Record<string, string> = {
  '3': 'Rare',
  '2': 'Unlikely',
  '0': 'Possible',
  '1': 'Likely',
}

export const IMPACT_LABELS: Record<string, string> = {
  '1': 'Moderate',
  '0': 'Major',
  '2': 'Catastrophic',
}

export const RESIDUAL_PROB_LABELS: Record<string, string> = {
  '0': 'Unlikely',
  '1': 'Possible',
  '2': 'Rare',
}

export const RESIDUAL_IMPACT_LABELS: Record<string, string> = {
  '0': 'Moderate',
  '1': 'Minor',
  '2': 'Major',
}

export const STRATEGY_LABELS: Record<string, string> = {
  '0': 'Mitigate',
  '1': 'Accept',
}

export const SEVERITY_COLORS: Record<string, string> = {
  'High': '#ef4444',
  'Medium': '#f59e0b',
  'Low': '#22c55e',
  'Unscored': '#94a3b8',
}

// Score helpers
export const probNumeric = (v: string | number | undefined): number => {
  const s = String(v ?? '')
  if (s === '3') return 1 // Rare
  if (s === '2') return 2 // Unlikely
  if (s === '0') return 3 // Possible
  if (s === '1') return 4 // Likely
  return 0
}

export const impactNumeric = (v: string | number | undefined): number => {
  const s = String(v ?? '')
  if (s === '1') return 1 // Moderate
  if (s === '0') return 2 // Major
  if (s === '2') return 3 // Catastrophic
  return 0
}

export const riskScore = (prob: string | number | undefined, impact: string | number | undefined): number => {
  return probNumeric(prob) * impactNumeric(impact)
}

export const getScoreColor = (score: number): string => {
  if (score >= 8) return '#ef4444' // Red - high risk
  if (score >= 4) return '#f59e0b' // Amber - medium risk
  if (score >= 1) return '#22c55e' // Green - low risk
  return '#94a3b8' // Grey - no score
}

export const getScoreLabel = (score: number): string => {
  if (score >= 8) return 'High'
  if (score >= 4) return 'Medium'
  if (score >= 1) return 'Low'
  return 'Unscored'
}

export const riskExportColumns: ExportColumn<RiskModel>[] = [
  { key: 'pm_risktitle', label: 'Risk Title' },
  { key: 'pm_riskcategory', label: 'Category', format: (v) => RISK_CATEGORY_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_ragstatus', label: 'RAG', format: (v) => RAG_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_riskownername', label: 'Owner' },
  { key: 'pm_riskstatus', label: 'Status', format: (v) => RISK_STATUS_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_inherentprobability', label: 'Inherent Probability', format: (v) => PROBABILITY_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_inherentimpact', label: 'Inherent Impact', format: (v) => IMPACT_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_identifieddate', label: 'Identified Date' },
  { key: 'pm_targetclosedate', label: 'Target Close Date' },
  { key: 'pm_riskdescription', label: 'Description' },
  { key: 'pm_riskcause', label: 'Cause' },
  { key: 'pm_riskeffect', label: 'Effect' },
]

export const emptyForm: Partial<RiskModel> = {
  pm_risktitle: '',
  pm_riskdescription: '',
  pm_riskcategory: '',
  pm_ragstatus: '',
  pm_riskownername: '',
  pm_riskstatus: 1,
  pm_escalated: false,
  pm_identifieddate: new Date().toISOString().split('T')[0],
  pm_targetclosedate: '',
  pm_inherentprobability: '',
  pm_inherentimpact: '',
  pm_residualprobability: '',
  pm_residualimpact: '',
  pm_responsestrategy: '',
  pm_riskcause: '',
  pm_riskeffect: '',
  _pm_project_value: '',
  _pm_riskowner_value: '',
}
