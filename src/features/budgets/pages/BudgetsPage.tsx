import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  LinearProgress,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import SavingsIcon from '@mui/icons-material/Savings'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import CategoryIcon from '@mui/icons-material/Category'
import SourceIcon from '@mui/icons-material/Source'
import NotesIcon from '@mui/icons-material/Notes'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AssessmentIcon from '@mui/icons-material/Assessment'
import AssignmentIcon from '@mui/icons-material/Assignment'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchBudgetLines,
  createBudgetLine,
  updateBudgetLine,
  deleteBudgetLine,
  fetchFundingSources,
  fetchFinancialPeriods,
  fetchPortfoliosForLookup,
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
  startWorkflowForEntity,
} from '@/services'
import type { BudgetLineModel, FundingSourceModel, FinancialPeriodModel } from '@/types/dataverse'
import type { PortfolioLookupItem, ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import { fontSizes } from '@/styles'
import { BudgetLineFormDialog } from '../components'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, StatusTag, ActionIcon, Breadcrumbs } from '@/components/common'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import type { KpiCardItem, FilterOption } from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'
import { MODULE_NAMES } from '@/constants/moduleNames'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const budgetExportColumns: ExportColumn[] = [
  { key: 'pm_budgetlinename', label: 'Name' },
  { key: 'pm_portfolioname', label: 'Portfolio' },
  { key: 'pm_programmename', label: 'Programme' },
  { key: 'pm_projectname', label: 'Project' },
  { key: 'pm_budgetamount', label: 'Budget (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_plannedamount', label: 'Planned (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_actualamount', label: 'Actual (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_remainingamount', label: 'Remaining (EUR)', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_fiscalperiodname', label: 'Period' },
  { key: 'pm_statusname', label: 'Status' },
]

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff',
  '1': 'Contractors',
  '2': 'Licences',
  '3': 'Infrastructure',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'warning' | 'info' | 'secondary'> = {
  '0': 'primary',
  '1': 'warning',
  '2': 'info',
  '3': 'secondary',
}

const COSTING_METHOD_LABELS: Record<string, string> = {
  '0': 'Fixed Cost',
  '1': 'Rate-Based',
}

const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Staff' },
  { value: '1', label: 'Contractors' },
  { value: '2', label: 'Licences' },
  { value: '3', label: 'Infrastructure' },
]

type SortField = 'name' | 'category' | 'budget' | 'revised' | 'actual' | 'variance' | 'committed'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const getVarianceColor = (variance?: number): string => {
  if (variance == null) return 'text.secondary'
  if (variance > 0) return 'success.main' // Under budget — positive variance
  if (variance < 0) return 'error.main' // Over budget — negative variance
  return 'text.secondary'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('BUDGETS', 'create')
  const { allowed: canEdit } = useAuthorization('BUDGETS', 'update')
  const { allowed: canDelete } = useAuthorization('BUDGETS', 'delete')

  // Data state
  const [budgetLines, setBudgetLines] = useState<BudgetLineModel[]>([])
  const [fundingSources, setFundingSources] = useState<FundingSourceModel[]>([])
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriodModel[]>([])
  const [portfolioLookups, setPortfolioLookups] = useState<PortfolioLookupItem[]>([])
  const [programmeLookups, setProgrammeLookups] = useState<ProgrammeLookupItem[]>([])
  const [projectLookups, setProjectLookups] = useState<ProjectLookupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Detail panel state
  const [selectedBudget, setSelectedBudget] = useState<BudgetLineModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Create/Edit modal state
  const [budgetFormEditRecord, setBudgetFormEditRecord] = useState<BudgetLineModel | null | undefined>(undefined)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [lines, sources, periods, portfolios, programmes, projects] = await Promise.all([
        fetchBudgetLines(),
        fetchFundingSources(),
        fetchFinancialPeriods(),
        fetchPortfoliosForLookup(),
        fetchProgrammesForLookup(),
        fetchProjectsForLookup(),
      ])
      setBudgetLines(lines)
      setFundingSources(sources)
      setFinancialPeriods(periods)
      setPortfolioLookups(portfolios)
      setProgrammeLookups(programmes)
      setProjectLookups(projects)
    } catch (err) {
      setError('Unable to load budget data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Synchronize selected budget with the latest data from the budget list
  useEffect(() => {
    if (selectedBudget) {
      const updated = budgetLines.find(b => b.pm_budgetlineid === selectedBudget.pm_budgetlineid)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedBudget)) {
        setSelectedBudget(updated)
      }
    }
  }, [budgetLines, selectedBudget])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const totalBudget = budgetLines.reduce((s, l) => s + (l.pm_approvedbudgeteur ?? 0), 0)
    const totalRevised = budgetLines.reduce((s, l) => s + (l.pm_revisedbudgeteur ?? 0), 0)
    const totalActual = budgetLines.reduce((s, l) => s + (l.pm_actualspendeur ?? 0), 0)
    const totalCommitted = budgetLines.reduce((s, l) => s + (l.pm_committedspendeur ?? 0), 0)
    const totalVariance = budgetLines.reduce((s, l) => s + (l.pm_varianceeur ?? 0), 0)
    const utilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0
    const budgetRemaining = totalRevised - totalActual - totalCommitted

    return [
      {
        label: 'Total Budget',
        value: `€${numberFormatter.format(totalBudget)}`,
        subtitle: 'Approved budget across all lines',
        icon: <AccountBalanceWalletIcon />,
        color: 'primary.main',
      },
      {
        label: 'Total Revised',
        value: `€${numberFormatter.format(totalRevised)}`,
        subtitle: 'Revised budget across all lines',
        icon: <AssessmentIcon />,
        color: 'primary.main',
      },
      {
        label: 'Actual Spend',
        value: `€${numberFormatter.format(totalActual)}`,
        subtitle: `${utilization}% of original budget utilized`,
        icon: <TrendingDownIcon />,
        color: utilization > 85 ? 'error.main' : utilization > 65 ? 'warning.main' : 'success.main',
      },
      {
        label: 'Committed Spend',
        value: `€${numberFormatter.format(totalCommitted)}`,
        subtitle: 'Purchase orders / commitments',
        icon: <AssignmentIcon />,
        color: 'secondary.main',
      },
      {
        label: 'Budget Remaining',
        value: `€${numberFormatter.format(Math.max(0, budgetRemaining))}`,
        subtitle: `${Math.max(0, budgetRemaining) >= 0 ? 'Revised budget less actual + committed' : 'Exceeded'}`,
        icon: <SavingsIcon />,
        color: budgetRemaining < 0 ? 'error.main' : 'success.main',
      },
      {
        label: 'Net Variance',
        value: `€${numberFormatter.format(totalVariance)}`,
        subtitle: totalVariance >= 0 ? 'Under budget overall' : 'Over budget overall',
        icon: <CurrencyExchangeIcon />,
        color: getVarianceColor(totalVariance),
      },
    ]
  }, [budgetLines])

  // ── Filtered & Sorted Budget Lines ───────────────────────────────────────
  const filteredBudgetLines = useMemo(() => {
    let list = [...budgetLines]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (l) =>
          l.pm_budgetlinename?.toLowerCase().includes(q) ||
          l.pm_portfoliolookupname?.toLowerCase().includes(q) ||
          l.pm_programmelookupname?.toLowerCase().includes(q) ||
          l.pm_projectname?.toLowerCase().includes(q) ||
          l.pm_fundingsourcename?.toLowerCase().includes(q)
      )
    }

    if (categoryFilter) {
      list = list.filter((l) => String(l.pm_costcategory) === categoryFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_budgetlinename ?? '').localeCompare(b.pm_budgetlinename ?? '')
          break
        case 'category':
          cmp = String(a.pm_costcategory ?? '').localeCompare(String(b.pm_costcategory ?? ''))
          break
        case 'budget':
          cmp = (a.pm_approvedbudgeteur ?? 0) - (b.pm_approvedbudgeteur ?? 0)
          break
        case 'revised':
          cmp = (a.pm_revisedbudgeteur ?? 0) - (b.pm_revisedbudgeteur ?? 0)
          break
        case 'actual':
          cmp = (a.pm_actualspendeur ?? 0) - (b.pm_actualspendeur ?? 0)
          break
        case 'variance':
          cmp = (a.pm_varianceeur ?? 0) - (b.pm_varianceeur ?? 0)
          break
        case 'committed':
          cmp = (a.pm_committedspendeur ?? 0) - (b.pm_committedspendeur ?? 0)
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [budgetLines, searchQuery, categoryFilter, sort])

  // ── Resolve display names from lookup lists ──────────────────────────────
  const resolvePortfolioName = useCallback((id?: string) => {
    if (!id) return ''
    const match = portfolioLookups.find((p) => p.pm_portfolioid.replace(/[{}]/g, '').trim().toLowerCase() === id.replace(/[{}]/g, '').trim().toLowerCase())
    return match?.pm_portfolioname ?? ''
  }, [portfolioLookups])

  const resolveProgrammeName = useCallback((id?: string) => {
    if (!id) return ''
    const match = programmeLookups.find((p) => p.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase() === id.replace(/[{}]/g, '').trim().toLowerCase())
    return match?.pm_programmename ?? ''
  }, [programmeLookups])

  const resolveProjectName = useCallback((id?: string) => {
    if (!id) return ''
    const match = projectLookups.find((p) => p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase() === id.replace(/[{}]/g, '').trim().toLowerCase())
    return match?.pm_projectname ?? ''
  }, [projectLookups])

  const resolveFundingSourceName = useCallback((id?: string) => {
    if (!id) return ''
    const match = fundingSources.find((s) => {
      const fsId = s.pm_fundingsourceid
      if (!fsId) return false
      return fsId.replace(/[{}]/g, '').trim().toLowerCase() === id.replace(/[{}]/g, '').trim().toLowerCase()
    })
    return match?.pm_fundingsourcename ?? ''
  }, [fundingSources])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((budget: BudgetLineModel) => {
    setSelectedBudget(budget)
    setDetailTab(0)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedBudget(null)
    setDetailTab(0)
  }, [])

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginatedBudgetLines = useMemo(
    () => filteredBudgetLines.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredBudgetLines, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])

  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(0) }, [])
  const handleCategoryFilterChange = useCallback((v: string) => { setCategoryFilter(v); setPage(0) }, [])

  const handleDeleteBudget = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteBudgetLine(deleteConfirm)
      setSuccessMsg('Budget line removed successfully.')
      setDeleteConfirm(null)
      if (selectedBudget?.pm_budgetlineid === deleteConfirm) {
        setSelectedBudget(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete budget line.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Budget utilization percentage ──
  const budgetUtilization = useCallback((budget?: BudgetLineModel): number => {
    if (!budget) return 0
    const budgetAmount = budget.pm_revisedbudgeteur ?? budget.pm_approvedbudgeteur ?? 0
    if (budgetAmount <= 0) return 0
    return Math.min(100, Math.round(((budget.pm_actualspendeur ?? 0) / budgetAmount) * 100))
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {selectedBudget ? (
        // ── Detail View ──
        <Box>
          <Breadcrumbs
            items={[
              { label: 'Budgets', path: 'list' },
              { label: selectedBudget.pm_budgetlinename ?? 'Detail' }
            ]}
            onNavigate={() => setSelectedBudget(null)}
          />
          <PageHeader
            title={selectedBudget.pm_budgetlinename ?? 'Budget Line Detail'}
            subtitle={selectedBudget.pm_fundingsourcename ? `Funding: ${selectedBudget.pm_fundingsourcename}` : ''}
            actionElement={
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {canEdit && (
                  <ActionIcon
                    icon={<EditIcon />}
                    onClick={() => setBudgetFormEditRecord(selectedBudget)}
                    label="Edit Budget"
                    color="primary"
                  />
                )}
                {canDelete && (
                  <ActionIcon
                    icon={<DeleteIcon />}
                    onClick={() => selectedBudget.pm_budgetlineid && setDeleteConfirm(selectedBudget.pm_budgetlineid)}
                    label="Delete Budget"
                    color="error"
                  />
                )}
              </Box>
            }
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 3 }}>
            <StatusTag
              label={CATEGORY_LABELS[String(selectedBudget.pm_costcategory ?? '')] ?? 'Unknown'}
              color={CATEGORY_COLORS[String(selectedBudget.pm_costcategory ?? '')] ?? 'default'}
            />
            {selectedBudget.pm_fiscalperiodname && (
              <Typography variant="body2" color="text.secondary">
                Period: {selectedBudget.pm_fiscalperiodname}
              </Typography>
            )}
          </Box>

          <Grid container spacing={3}>
            {/* Column 1: Budget Utilization & Variance Analysis */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, flexGrow: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Budget Utilization
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Budget Used
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {budgetUtilization(selectedBudget)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={budgetUtilization(selectedBudget)}
                        sx={{
                          height: 8,
                          borderRadius: 1.5,
                          bgcolor: isDark ? 'divider' : '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: budgetUtilization(selectedBudget) > 85 ? 'error.main'
                              : budgetUtilization(selectedBudget) > 65 ? 'warning.main' : 'success.main',
                          },
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.primary.main}` }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Revised Budget</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                          {selectedBudget.pm_revisedbudgeteur != null ? currencyFormatter.format(selectedBudget.pm_revisedbudgeteur) : '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.success.main}` }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Actual Spend</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'success.main' }}>
                          {selectedBudget.pm_actualspendeur != null ? currencyFormatter.format(selectedBudget.pm_actualspendeur) : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CurrencyExchangeIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Variance Analysis
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          textAlign: 'center',
                          border: (theme) => `1px solid ${selectedBudget.pm_varianceeur != null && selectedBudget.pm_varianceeur >= 0 ? theme.palette.success.main : theme.palette.error.main}`,
                          bgcolor: selectedBudget.pm_varianceeur != null && selectedBudget.pm_varianceeur >= 0
                            ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)')
                            : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'),
                        }}
                      >
                        {selectedBudget.pm_varianceeur != null && selectedBudget.pm_varianceeur >= 0
                          ? <VerifiedIcon sx={{ fontSize: 24, color: 'success.main', mb: 0.5 }} />
                          : <WarningAmberIcon sx={{ fontSize: 24, color: 'error.main', mb: 0.5 }} />
                        }
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: getVarianceColor(selectedBudget.pm_varianceeur) }}>
                          {selectedBudget.pm_varianceeur != null
                            ? `${selectedBudget.pm_varianceeur >= 0 ? '+' : ''}${currencyFormatter.format(selectedBudget.pm_varianceeur)}`
                            : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Variance</Typography>
                      </Box>
                      <Box sx={{ p: 2, borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedBudget.pm_committedspendeur != null ? currencyFormatter.format(selectedBudget.pm_committedspendeur) : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Committed</Typography>
                      </Box>
                      <Box sx={{ p: 2, borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedBudget.pm_forecastspendeur != null ? currencyFormatter.format(selectedBudget.pm_forecastspendeur) : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Forecast</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Estimate at Completion</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedBudget.pm_estimateatcompletioneur != null ? currencyFormatter.format(selectedBudget.pm_estimateatcompletioneur) : '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Estimate to Complete</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedBudget.pm_estimatetocompleteeur != null ? currencyFormatter.format(selectedBudget.pm_estimatetocompleteeur) : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Column 2: Line Details & Notes */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, flexGrow: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CategoryIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Line Details
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Category</Typography>
                        <Typography variant="body2">{selectedBudget.pm_costcategory || CATEGORY_LABELS[String(selectedBudget.pm_costcategory ?? '')] || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Expense Category</Typography>
                        <Typography variant="body2">{selectedBudget.pm_expencecatagory != null ? (Number(selectedBudget.pm_expencecatagory) === 0 ? 'CapEx' : 'OpEx') : '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Funding Source</Typography>
                        <Typography variant="body2">{resolveFundingSourceName(selectedBudget._pm_fundingsource_value) || selectedBudget.pm_fundingsourcename || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Fiscal Period</Typography>
                        <Typography variant="body2">{selectedBudget.pm_fiscalperiodname || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Funding Period</Typography>
                        <Typography variant="body2">{selectedBudget.pm_fiscalperiodname || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Portfolio</Typography>
                        <Typography variant="body2">{resolvePortfolioName(selectedBudget._pm_portfoliolookup_value) || selectedBudget.pm_portfolio || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Programme</Typography>
                        <Typography variant="body2">{resolveProgrammeName(selectedBudget._pm_programmelookup_value) || selectedBudget.pm_programme || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Project</Typography>
                        <Typography variant="body2">{resolveProjectName(selectedBudget._pm_project_value) || selectedBudget.pm_projectcode || '—'}</Typography>
                      </Box>

                    </Box>
                  </Box>

                  {selectedBudget.pm_notes && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NotesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Notes
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {selectedBudget.pm_notes}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Column 3: Approval Tasks */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, flexGrow: 1 }}>
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Pending Decisions
                    </Typography>
                    {selectedBudget.pm_budgetlineid && (
                      <EntityApprovalTasks
                        entityId={selectedBudget.pm_budgetlineid}
                        moduleName={MODULE_NAMES.BUDGETS.value}
                        entityLabel="Budget Line"
                        tabValue={3}
                        index={3}
                      />
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      ) : (
        // ── List View ──
        <>
          <PageHeader
            title="Budgets"
            subtitle="Track and manage budgets across portfolios, programmes, and projects — monitor spend, forecast, and variance."
            actionElement={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ExportButton filename="budgets.csv" columns={budgetExportColumns} data={filteredBudgetLines} />
                {canCreate && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBudgetFormEditRecord(null)}>
                    Add Budget Line
                  </Button>
                )}
              </Box>
            }
          />

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

          {/* ── KPI Row ──────────────────────────────────── */}
          {!loading && <KpiCardRow items={kpiItems} />}

          {/* ── Budget Grid ──────────────────────────────── */}
          <Paper sx={{ overflow: 'hidden', mb: 3 }}>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search by name, category, portfolio, programme..."
              filterValue={categoryFilter}
              onFilterChange={handleCategoryFilterChange}
              filterLabel="Category"
              filterOptions={CATEGORY_FILTER_OPTIONS}
              onClear={() => { setSearchQuery(''); setCategoryFilter(''); setPage(0) }}
            />

            <TableShell
              loading={loading}
              empty={filteredBudgetLines.length === 0}
              emptyIcon={<AccountBalanceWalletIcon />}
              emptyTitle={searchQuery || categoryFilter ? 'No budget lines match your criteria.' : 'No budget lines found.'}
              emptyAction={!searchQuery && !categoryFilter ? (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setBudgetFormEditRecord(null)}>
                  Add your first budget line
                </Button>
              ) : undefined}
            >
              <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Budget Line
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'category'} direction={sort.field === 'category' ? sort.dir : 'asc'} onClick={() => handleSort('category')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Category
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'budget'} direction={sort.field === 'budget' ? sort.dir : 'asc'} onClick={() => handleSort('budget')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Approved Budget
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'revised'} direction={sort.field === 'revised' ? sort.dir : 'asc'} onClick={() => handleSort('revised')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Revised Budget
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'actual'} direction={sort.field === 'actual' ? sort.dir : 'asc'} onClick={() => handleSort('actual')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Actual Spend
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'variance'} direction={sort.field === 'variance' ? sort.dir : 'asc'} onClick={() => handleSort('variance')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Variance
                      </TableSortLabel>
                    </TableCell>

                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedBudgetLines.map((line, idx) => {
                    const ut = budgetUtilization(line)
                    const variance = line.pm_varianceeur
                    const isOverBudget = variance != null && variance < 0
                    return (
                      <TableRow
                        key={line.pm_budgetlineid}
                        hover
                        onClick={() => handleRowClick(line)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                          '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                          transition: 'background-color 0.15s ease',
                          '& td': { px: 2.5, py: 1.25 },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                              {(line.pm_budgetlinename ?? 'B').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {line.pm_budgetlinename ?? 'Unnamed'}
                              </Typography>
                              {line.pm_fundingsourcename && (
                                <Typography variant="caption" color="text.secondary">
                                  {line.pm_fundingsourcename}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <StatusTag
                            label={CATEGORY_LABELS[String(line.pm_costcategory ?? '')] ?? 'Unknown'}
                            color={CATEGORY_COLORS[String(line.pm_costcategory ?? '')] ?? 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                            {line.pm_approvedbudgeteur != null ? currencyFormatter.format(line.pm_approvedbudgeteur) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                            {line.pm_revisedbudgeteur != null ? currencyFormatter.format(line.pm_revisedbudgeteur) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                              {line.pm_actualspendeur != null ? currencyFormatter.format(line.pm_actualspendeur) : '—'}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={ut}
                              sx={{
                                width: '100%',
                                maxWidth: 100,
                                height: 4,
                                borderRadius: 1.5,
                                bgcolor: isDark ? '#334155' : '#e2e8f0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: ut > 85 ? 'error.main' : ut > 65 ? 'warning.main' : 'success.main',
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                            {isOverBudget && <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                color: getVarianceColor(variance),
                              }}
                            >
                              {variance != null ? `${variance >= 0 ? '+' : ''}${currencyFormatter.format(variance)}` : '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableShell>

            {!loading && filteredBudgetLines.length > 0 && (
              <TableFooter
                filteredCount={filteredBudgetLines.length}
                totalCount={budgetLines.length}
                itemLabel="budget line"
                totals={[
                  { label: 'Total budget', value: `€${numberFormatter.format(filteredBudgetLines.reduce((s, l) => s + (l.pm_approvedbudgeteur ?? 0), 0))}` },
                  { label: 'Total spend', value: `€${numberFormatter.format(filteredBudgetLines.reduce((s, l) => s + (l.pm_actualspendeur ?? 0), 0))}` },
                ]}
              />
            )}
            {!loading && filteredBudgetLines.length > 0 && (
              <TablePagination
                component="div"
                count={filteredBudgetLines.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100]}
              />
            )}
          </Paper>
        </>
      )}

      {/* ── Budget Line Form Dialog (shared) ──────── */}
      <BudgetLineFormDialog
        open={budgetFormEditRecord !== undefined}
        onClose={() => setBudgetFormEditRecord(undefined)}
        editBudget={budgetFormEditRecord ?? null}
        onSaved={(saved, isEdit) => {
          if (saved) {
            setSuccessMsg(isEdit ? 'Budget line updated successfully.' : 'Budget line created successfully.')
            try {
              if (saved.pm_budgetlineid) {
                startWorkflowForEntity('default-template', saved.pm_budgetlineid, MODULE_NAMES.BUDGETS.value, 'System')
              }
            } catch (wfErr) {
              console.error('[BudgetsPage] Failed to initiate workflow:', wfErr)
            }
          } else {
            setError(isEdit ? 'Unable to update budget line.' : 'Unable to create budget line.')
          }
          setBudgetFormEditRecord(undefined)
          setTimeout(() => setSuccessMsg(null), 3000)
          loadData()
        }}
      />

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 1.5 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Budget Line</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this budget line? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteBudget} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}