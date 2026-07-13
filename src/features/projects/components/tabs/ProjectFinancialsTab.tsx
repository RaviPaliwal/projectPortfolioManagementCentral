import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  useTheme,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PieChartIcon from '@mui/icons-material/PieChart'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CategoryIcon from '@mui/icons-material/Category'
import InfoIcon from '@mui/icons-material/Info'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import NotesIcon from '@mui/icons-material/Notes'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AddIcon from '@mui/icons-material/Add'

import { StatusTag, VarianceDisplay, KpiCardRow, ExportButton, ExcelImportDialog } from '@/components/common'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BudgetLineModel, ProjectModel } from '@/types/dataverse'
import { currency } from '../../constants'
import { fontSizes } from '@/styles'
import { BudgetTable } from '@/features/budgets/components/BudgetTable'
import {
  createBudgetLine,
  updateBudgetLine,
  fetchFundingSources,
  fetchPortfoliosForLookup,
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
  startWorkflowForEntity
} from '@/services'
import type { FundingSourceModel } from '@/types/dataverse'
import type { PortfolioLookupItem, ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { ExportColumn } from '@/utils/exportUtils'

interface ProjectFinancialsTabProps {
  budgetLines: BudgetLineModel[]
  project: ProjectModel
  onEditBudgetLine?: (budget: BudgetLineModel) => void
  canEdit?: boolean
  onAddBudgetLine?: () => void
  selectedBudgetLine: BudgetLineModel | null
  setSelectedBudgetLine: (budgetLine: BudgetLineModel | null) => void
  onRefresh?: (type?: string) => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

// Mappings matching BudgetsPage.tsx
const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff',
  '1': 'Contractors',
  '2': 'Licences',
  '3': 'Infrastructure',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'warning' | 'error' | 'default'> = {
  '0': 'primary',
  '1': 'secondary',
  '2': 'warning',
  '3': 'error',
}

export const ProjectFinancialsTab: React.FC<ProjectFinancialsTabProps> = ({
  budgetLines,
  project,
  onEditBudgetLine,
  canEdit = false,
  onAddBudgetLine,
  selectedBudgetLine,
  setSelectedBudgetLine,
  onRefresh,
  onSuccess,
  onError
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [categoryFilter, setCategoryFilter] = React.useState('')

  // Excel/CSV import state
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [sapImportOpen, setSapImportOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)

  // Lookup data for Excel importer
  const [portfolioLookups, setPortfolioLookups] = React.useState<PortfolioLookupItem[]>([])
  const [programmeLookups, setProgrammeLookups] = React.useState<ProgrammeLookupItem[]>([])
  const [projectLookups, setProjectLookups] = React.useState<ProjectLookupItem[]>([])
  const [fundingSources, setFundingSources] = React.useState<FundingSourceModel[]>([])

  // Load lookups on mount
  React.useEffect(() => {
    async function loadLookups() {
      try {
        const [portfolios, programmes, projects, sources] = await Promise.all([
          fetchPortfoliosForLookup(),
          fetchProgrammesForLookup(),
          fetchProjectsForLookup(),
          fetchFundingSources(),
        ])
        setPortfolioLookups(portfolios)
        setProgrammeLookups(programmes)
        setProjectLookups(projects)
        setFundingSources(sources)
      } catch (err) {
        console.error('[ProjectFinancialsTab] Failed to load lookups:', err)
      }
    }
    loadLookups()
  }, [])

  const handleImportBudgets = async (
    rows: any[],
    onProgress: (current: number, total: number) => void
  ) => {
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const method = Number(row.pm_costinglevelcode) === 1 ? 'Rate-Based' : 'Fixed Cost'
        const unitCost = row.pm_unitcosteur || 0
        const quantity = Number(row.pm_costinglevelcode) === 1 ? (row.pm_quantity || 1) : 1
        const total = Number(row.pm_costinglevelcode) === 1 ? unitCost * quantity : unitCost

        const pm_jsonrawcalculation = JSON.stringify({
          costingMethod: method,
          unitCost,
          quantity,
          totalAmount: total,
          formula: method === 'Rate-Based' ? 'Unit Cost × Quantity' : 'Unit Cost (Fixed)',
          generatedAt: new Date().toISOString(),
        }, null, 2)

        // Resolve Portfolio/Programme/Project names to GUIDs for Dataverse lookups
        const portfolioMatch = row.pm_portfolioname
          ? portfolioLookups.find(p => p.pm_portfolioname?.toLowerCase().trim() === row.pm_portfolioname.toLowerCase().trim())
          : undefined
        const programmeMatch = row.pm_programmename
          ? programmeLookups.find(p => p.pm_programmename?.toLowerCase().trim() === row.pm_programmename.toLowerCase().trim())
          : undefined
        
        let projectMatch = row.pm_projectname
          ? projectLookups.find(p => p.pm_projectname?.toLowerCase().trim() === row.pm_projectname.toLowerCase().trim())
          : undefined
        if (!projectMatch && (!row.pm_projectname || row.pm_projectname.toLowerCase().trim() === project.pm_projectname?.toLowerCase().trim())) {
          projectMatch = { pm_projectid: project.pm_projectid, pm_projectname: project.pm_projectname } as any
        }

        const fundingSourceMatch = row.pm_fundingsourcename
          ? fundingSources.find(s => s.pm_fundingsourcename?.toLowerCase().trim() === row.pm_fundingsourcename.toLowerCase().trim())
          : undefined

        if (row.pm_portfolioname && !portfolioMatch) {
          errors.push(`Row ${i + 1}: Portfolio "${row.pm_portfolioname}" not found in Dataverse`)
          failedCount++
          onProgress(i + 1, rows.length)
          continue
        }
        if (row.pm_programmename && !programmeMatch) {
          errors.push(`Row ${i + 1}: Programme "${row.pm_programmename}" not found in Dataverse`)
          failedCount++
          onProgress(i + 1, rows.length)
          continue
        }
        if (row.pm_projectname && !projectMatch) {
          errors.push(`Row ${i + 1}: Project "${row.pm_projectname}" not found in Dataverse`)
          failedCount++
          onProgress(i + 1, rows.length)
          continue
        }
        if (row.pm_fundingsourcename && !fundingSourceMatch) {
          errors.push(`Row ${i + 1}: Funding source "${row.pm_fundingsourcename}" not found in Dataverse`)
          failedCount++
          onProgress(i + 1, rows.length)
          continue
        }

        const payload: Partial<BudgetLineModel> = {
          pm_budgetlinename: row.pm_budgetlinename,
          pm_costcategory: row.pm_costcategory ?? 0,
          pm_expencecatagory: row.pm_expencecatagory ?? 0,
          pm_approvedbudgeteur: total,
          pm_revisedbudgeteur: total,
          pm_actualspendeur: total,
          pm_committedspendeur: total,
          pm_forecastspendeur: total,
          pm_estimateatcompletioneur: total,
          pm_jsonrawcalculation,
          pm_notes: row.pm_notes || '',
          _pm_portfoliolookup_value: portfolioMatch ? portfolioMatch.pm_portfolioid : undefined,
          _pm_programmelookup_value: programmeMatch ? programmeMatch.pm_programmeid : undefined,
          _pm_project_value: projectMatch ? projectMatch.pm_projectid : project.pm_projectid,
          _pm_fundingsource_value: fundingSourceMatch ? fundingSourceMatch.pm_fundingsourceid : undefined,
        }

        const created = await createBudgetLine(payload)
        if (created) {
          successCount++
        } else {
          failedCount++
          errors.push(`Row ${i + 1}: Failed to save record to Dataverse`)
        }
      } catch (err: any) {
        failedCount++
        errors.push(`Row ${i + 1}: ${err.message || 'Unknown error'}`)
      }
      onProgress(i + 1, rows.length)
    }

    onRefresh?.()
    return { successCount, failedCount, errors }
  }

  const handleImportSapActuals = async (file: File) => {
    setActionLoading(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/)
      if (lines.length < 2) throw new Error('File is empty or has no header')
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const wbsIndex = headers.indexOf('wbs_element')
      const actualIndex = headers.indexOf('actual_spend')
      const committedIndex = headers.indexOf('committed_spend')
      
      if (wbsIndex === -1 || actualIndex === -1) {
        throw new Error('SAP actuals CSV must contain WBS_Element and Actual_Spend columns')
      }
      
      let updatedCount = 0
      const updatePromises: Promise<any>[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const cols = line.split(',').map(c => c.trim())
        const wbs = cols[wbsIndex]
        const actual = Number(cols[actualIndex] || 0)
        const committed = committedIndex !== -1 ? Number(cols[committedIndex] || 0) : 0
        
        const match = budgetLines.find(bl => bl.pm_budgetlinename?.toLowerCase().trim() === wbs.toLowerCase().trim())
        if (match && match.pm_budgetlineid) {
          updatePromises.push(
            updateBudgetLine(match.pm_budgetlineid, {
              pm_actualspendeur: actual,
              pm_committedspendeur: committed,
            })
          )
          updatedCount++
        }
      }
      
      await Promise.all(updatePromises)
      onSuccess?.(`SAP Integration: Successfully synchronized actual costs for ${updatedCount} matching budget lines.`)
      onRefresh?.()
    } catch (err: any) {
      onError?.(`SAP Loader failed: ${err.message || 'Unknown error'}`)
    } finally {
      setActionLoading(false)
      setSapImportOpen(false)
    }
  }

  const totalBudget = budgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0)
  const totalSpent = budgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0)

  // EVM (Earned Value Management) computations
  const percentComplete = project.pm_percentcomplete ?? 0
  const earnedValue = totalBudget * (percentComplete / 100)
  const cpi = totalSpent > 0 ? earnedValue / totalSpent : 1.0
  const costVariance = earnedValue - totalSpent

  const kpiItems = React.useMemo(() => [
    {
      label: 'Approved Budget (BAC)',
      value: currency(totalBudget),
      subtitle: 'Total authorized budget',
      icon: <AccountBalanceWalletIcon />,
      color: 'primary.main',
      valueColor: 'primary.main'
    },
    {
      label: 'Actual Cost (AC)',
      value: currency(totalSpent),
      subtitle: 'Total expenditure to date',
      icon: <AttachMoneyIcon />,
      color: 'success.main',
      valueColor: 'success.main'
    },
    {
      label: 'CPI Index (BAC/EAC)',
      value: cpi.toFixed(2),
      subtitle: 'Cost Performance Index',
      icon: <QueryStatsIcon />,
      color: cpi >= 1.0 ? 'success.main' : cpi >= 0.85 ? 'warning.main' : 'error.main'
    },
    {
      label: 'Cost Variance (CV)',
      value: `${costVariance >= 0 ? '+' : ''}${currency(costVariance)}`,
      subtitle: 'Earned Value vs Actual Cost',
      icon: <CurrencyExchangeIcon />,
      color: costVariance >= 0 ? 'success.main' : 'error.main',
      valueColor: costVariance >= 0 ? 'success.main' : 'error.main'
    }
  ], [totalBudget, totalSpent, cpi, costVariance])

  const categorySummary = React.useMemo(() => {
    const summaryMap: Record<string, { name: string; budget: number; spend: number; color: string }> = {
      '0': { name: 'Staff', budget: 0, spend: 0, color: theme.palette.primary.main },
      '1': { name: 'Contractors', budget: 0, spend: 0, color: theme.palette.secondary.main },
      '2': { name: 'Licences', budget: 0, spend: 0, color: theme.palette.warning.main },
      '3': { name: 'Infrastructure', budget: 0, spend: 0, color: theme.palette.error.main }
    }

    for (const b of budgetLines) {
      const cat = String(b.pm_costcategory ?? '')
      if (summaryMap[cat]) {
        summaryMap[cat].budget += b.pm_approvedbudgeteur ?? 0
        summaryMap[cat].spend += b.pm_actualspendeur ?? 0
      }
    }

    return Object.values(summaryMap).filter(c => c.budget > 0 || c.spend > 0)
  }, [budgetLines, theme])

  // Helper helpers
  const budgetUtilization = (b: BudgetLineModel) => {
    const approved = b.pm_approvedbudgeteur ?? 0
    const actual = b.pm_actualspendeur ?? 0
    if (approved === 0) return 0
    return Math.min(100, Math.round((actual / approved) * 100))
  }

  const getVarianceColor = (v?: number) => {
    if (v == null) return 'text.secondary'
    return v >= 0 ? 'success.main' : 'error.main'
  }

  // Inline Budget Line Detail View (matching BudgetsPage.tsx layout)
  if (selectedBudgetLine) {
    const costCategory = CATEGORY_LABELS[String(selectedBudgetLine.pm_costcategory ?? '')] ?? 'Unknown'
    const approvedVal = selectedBudgetLine.pm_approvedbudgeteur ?? 0
    const revisedVal = selectedBudgetLine.pm_revisedbudgeteur ?? approvedVal
    const actualVal = selectedBudgetLine.pm_actualspendeur ?? 0
    const varianceVal = selectedBudgetLine.pm_varianceeur ?? (approvedVal - actualVal)
    const utilization = budgetUtilization(selectedBudgetLine)

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Status Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <StatusTag
            label={costCategory}
            color={CATEGORY_COLORS[String(selectedBudgetLine.pm_costcategory ?? '')] ?? 'default'}
          />
          {selectedBudgetLine.pm_fiscalperiodname && (
            <Typography variant="body2" color="text.secondary">
              Period: {selectedBudgetLine.pm_fiscalperiodname}
            </Typography>
          )}
        </Box>

        <Grid container spacing={2.5}>
          {/* Column 1: Budget Utilization & Variance Analysis */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
                {/* Left sub-column: Budget Utilization */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Budget Utilization
                      </Typography>
                      <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Budget Used
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                            {utilization}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={utilization}
                          sx={{
                            height: 6,
                            borderRadius: 1.5,
                            bgcolor: isDark ? 'divider' : '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: utilization > 85 ? 'error.main'
                                : utilization > 65 ? 'warning.main' : 'success.main',
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.primary.main}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>Revised Budget</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                            {currency(revisedVal)}
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.success.main}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>Actual Spend</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'success.main' }}>
                            {currency(actualVal)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Right sub-column: Variance Analysis */}
                <Grid
                  size={{ xs: 12, md: 6 }}
                  sx={{
                    borderLeft: { md: `1px solid ${theme.palette.divider}` },
                    pl: { md: 3 },
                    pt: { xs: 2, md: 0 },
                    borderTop: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CurrencyExchangeIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Variance Analysis
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            textAlign: 'center',
                            border: (theme) => `1px solid ${varianceVal >= 0 ? theme.palette.success.main : theme.palette.error.main}`,
                            bgcolor: varianceVal >= 0
                              ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)')
                              : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'),
                          }}
                        >
                          {varianceVal >= 0
                            ? <VerifiedIcon sx={{ fontSize: 20, color: 'success.main', mb: 0.25 }} />
                            : <WarningAmberIcon sx={{ fontSize: 20, color: 'error.main', mb: 0.25 }}
                            />}
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: getVarianceColor(varianceVal) }}>
                            {varianceVal >= 0 ? '+' : ''}{currency(varianceVal)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Variance</Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', pt: 0.5 }}>
                            {selectedBudgetLine.pm_committedspendeur != null ? currency(selectedBudgetLine.pm_committedspendeur) : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>Committed</Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', pt: 0.5 }}>
                            {selectedBudgetLine.pm_forecastspendeur != null ? currency(selectedBudgetLine.pm_forecastspendeur) : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>Forecast</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Column 2: Detailed Line Attributes */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Line Attributes
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Funding Source</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <AttachMoneyIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBudgetLine.pm_fundingsourcename || '—'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Fiscal Period</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBudgetLine.pm_fiscalperiodname || '—'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Expense Category</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <CategoryIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {String(selectedBudgetLine.pm_expencecatagory) === '0' ? 'CapEx'
                        : String(selectedBudgetLine.pm_expencecatagory) === '1' ? 'OpEx' : '—'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Cost Attributes</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {selectedBudgetLine.pm_quantity != null && selectedBudgetLine.pm_unitcosteur != null
                      ? `${selectedBudgetLine.pm_quantity} units @ ${currency(selectedBudgetLine.pm_unitcosteur)}/ea`
                      : '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Notes Block */}
          {selectedBudgetLine.pm_notes && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Notes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedBudgetLine.pm_notes}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    )
  }

const budgetExportColumns: ExportColumn[] = [
  { key: 'pm_budgetlinename', label: 'Name' },
  { key: 'pm_portfolioname', label: 'Portfolio' },
  { key: 'pm_programmename', label: 'Programme' },
  { key: 'pm_projectname', label: 'Project' },
  { key: 'pm_approvedbudgeteur', label: 'Budget (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_forecastspendeur', label: 'Forecast (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_actualspendeur', label: 'Actual (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_committedspendeur', label: 'Committed (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_fiscalperiodname', label: 'Period' },
]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 1, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PieChartIcon sx={{ fontSize: 20, color: 'primary.main' }} /> Budget Breakdown
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {canEdit && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Import Budget Lines
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => setSapImportOpen(true)}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Load SAP Actuals
              </Button>
            </>
          )}
          {onAddBudgetLine && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddBudgetLine}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Add Budget Line
            </Button>
          )}
        </Box>
      </Box>

      {/* EVM KPI Cards Summary Row */}
      <Box sx={{ mb: -2.5 }}>
        <KpiCardRow items={kpiItems} />
      </Box>

      <Grid container spacing={3.5} sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 12 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <BudgetTable
            budgetLines={budgetLines}
            loading={false}
            onSelect={setSelectedBudgetLine}
            onEdit={onEditBudgetLine}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            openCreate={onAddBudgetLine}
            canEdit={canEdit}
          />
        </Grid>
      </Grid>

      {/* Excel/CSV Import Dialog */}
      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        importType="budgets"
        title="Import Budget Lines from CSV"
        onImport={handleImportBudgets}
      />

      {/* SAP Actuals Import Dialog */}
      <Dialog
        open={sapImportOpen}
        onClose={() => !actionLoading && setSapImportOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 1.5 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Load SAP Actual Costs</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Upload the standard SAP cost output CSV. The loader maps `WBS_Element` values directly to Dataverse budget lines and updates actual/committed spend.
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ py: 1.5, borderStyle: 'dashed', borderRadius: 1.5, textTransform: 'none' }}
              disabled={actionLoading}
            >
              Upload SAP CSV File
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) {
                    handleImportSapActuals(files[0])
                  }
                }}
              />
            </Button>
            {actionLoading && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress sx={{ height: 4, borderRadius: 1 }} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSapImportOpen(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
