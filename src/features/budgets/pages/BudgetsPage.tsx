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
import {
  fetchBudgetLines,
  createBudgetLine,
  updateBudgetLine,
  deleteBudgetLine,
  fetchFundingSources,
  fetchFinancialPeriods,
} from '@/services'
import type { BudgetLineModel, FundingSourceModel, FinancialPeriodModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, StatusTag } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const budgetExportColumns: ExportColumn[] = [
  { key: 'pm_budgetlinename', label: 'Name' },
  { key: 'pm_costcategoryname', label: 'Category' },
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
  if (variance == null) return '#64748b'
  if (variance > 0) return '#22c55e' // Under budget — positive variance
  if (variance < 0) return '#ef4444' // Over budget — negative variance
  return '#64748b'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [budgetLines, setBudgetLines] = useState<BudgetLineModel[]>([])
  const [fundingSources, setFundingSources] = useState<FundingSourceModel[]>([])
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriodModel[]>([])
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
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetLineModel | null>(null)
  const [formData, setFormData] = useState({
    pm_budgetlinename: '',
    pm_costcategory: 0,
    pm_approvedbudgeteur: 0,
    pm_revisedbudgeteur: 0,
    pm_actualspendeur: 0,
    pm_committedspendeur: 0,
    pm_forecastspendeur: 0,
    pm_varianceeur: 0,
    pm_fiscalperiodname: '',
    pm_fundingsourcename: '',
    pm_portfolio: '',
    pm_programme: '',
    pm_projectcode: '',
    pm_notes: '',
    _pm_fiscalperiod_value: '',
    _pm_fundingsource_value: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [BudgetsPage] Fetching data...')
      const [lines, sources, periods] = await Promise.all([
        fetchBudgetLines(),
        fetchFundingSources(),
        fetchFinancialPeriods(),
      ])
      console.log('🔍 [BudgetsPage] Budget lines loaded:', lines?.length ?? 0, 'items')
      if (lines?.length > 0) console.log('🔍 [BudgetsPage] Sample budget line:', JSON.stringify(lines[0], null, 2).slice(0, 500))
      console.log('🔍 [BudgetsPage] Funding sources:', sources?.length ?? 0, 'items')
      console.log('🔍 [BudgetsPage] Financial periods:', periods?.length ?? 0, 'items')
      setBudgetLines(lines)
      setFundingSources(sources)
      setFinancialPeriods(periods)
    } catch (err) {
      console.error('[BudgetsPage] loadData error:', err)
      setError('Unable to load budget data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
        color: '#0ea5e9',
      },
      {
        label: 'Actual Spend',
        value: `€${numberFormatter.format(totalActual)}`,
        subtitle: `${utilization}% of original budget utilized`,
        icon: <TrendingDownIcon />,
        color: utilization > 85 ? '#ef4444' : utilization > 65 ? '#f59e0b' : '#22c55e',
      },
      {
        label: 'Budget Remaining',
        value: `€${numberFormatter.format(Math.max(0, budgetRemaining))}`,
        subtitle: `${Math.max(0, budgetRemaining) >= 0 ? 'Revised budget less actual + committed' : 'Exceeded'}`,
        icon: <SavingsIcon />,
        color: budgetRemaining < 0 ? '#ef4444' : '#22c55e',
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
          l.pm_costcategoryname?.toLowerCase().includes(q) ||
          l.pm_portfolio?.toLowerCase().includes(q) ||
          l.pm_programme?.toLowerCase().includes(q) ||
          l.pm_projectcode?.toLowerCase().includes(q) ||
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

  // ── Form open for create/edit ──
  const openCreateForm = useCallback(() => {
    setEditingBudget(null)
    setFormData({
      pm_budgetlinename: '',
      pm_costcategory: 0,
      pm_approvedbudgeteur: 0,
      pm_revisedbudgeteur: 0,
      pm_actualspendeur: 0,
      pm_committedspendeur: 0,
      pm_forecastspendeur: 0,
      pm_varianceeur: 0,
      pm_fiscalperiodname: '',
      pm_fundingsourcename: '',
      pm_portfolio: '',
      pm_programme: '',
      pm_projectcode: '',
      pm_notes: '',
      _pm_fiscalperiod_value: '',
      _pm_fundingsource_value: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((budget: BudgetLineModel) => {
    setEditingBudget(budget)
    setFormData({
      pm_budgetlinename: budget.pm_budgetlinename ?? '',
      pm_costcategory: Number(budget.pm_costcategory) || 0,
      pm_approvedbudgeteur: budget.pm_approvedbudgeteur ?? 0,
      pm_revisedbudgeteur: budget.pm_revisedbudgeteur ?? 0,
      pm_actualspendeur: budget.pm_actualspendeur ?? 0,
      pm_committedspendeur: budget.pm_committedspendeur ?? 0,
      pm_forecastspendeur: budget.pm_forecastspendeur ?? 0,
      pm_varianceeur: budget.pm_varianceeur ?? 0,
      pm_fiscalperiodname: budget.pm_fiscalperiodname ?? '',
      pm_fundingsourcename: budget.pm_fundingsourcename ?? '',
      pm_portfolio: budget.pm_portfolio ?? '',
      pm_programme: budget.pm_programme ?? '',
      pm_projectcode: budget.pm_projectcode ?? '',
      pm_notes: budget.pm_notes ?? '',
      _pm_fiscalperiod_value: budget._pm_fiscalperiod_value ?? '',
      _pm_fundingsource_value: budget._pm_fundingsource_value ?? '',
    })
    setShowFormModal(true)
  }, [])

  // ── Compute variance automatically ──
  const computeVariance = useCallback((data: typeof formData) => {
    const revised = data.pm_revisedbudgeteur || 0
    const actual = data.pm_actualspendeur || 0
    const committed = data.pm_committedspendeur || 0
    return revised - actual - committed
  }, [])

  const handleSaveBudget = async () => {
    if (!formData.pm_budgetlinename.trim()) {
      setError('Budget line name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const variance = computeVariance(formData)
      const payload: any = {
        ...formData,
        pm_estimateatcompletioneur: (formData.pm_actualspendeur || 0) + (formData.pm_forecastspendeur || 0),
        pm_estimatetocompleteeur: (formData.pm_forecastspendeur || 0) - ((formData.pm_committedspendeur || 0) - (formData.pm_actualspendeur || 0)),
        pm_varianceeur: variance,
      }
      // Strip lookup fields that are just display names
      delete payload._pm_fiscalperiod_value
      delete payload._pm_fundingsource_value

      if (editingBudget?.pm_budgetlineid) {
        await updateBudgetLine(editingBudget.pm_budgetlineid, payload)
        setSuccessMsg('Budget line updated successfully.')
      } else {
        await createBudgetLine(payload)
        setSuccessMsg('Budget line created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingBudget ? 'Unable to update budget line.' : 'Unable to create budget line.')
    } finally {
      setActionLoading(false)
    }
  }

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
      <PageHeader
        title="Budgets"
        subtitle="Track and manage budgets across portfolios, programmes, and projects — monitor spend, forecast, and variance."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton filename="budgets.csv" columns={budgetExportColumns} data={filteredBudgetLines} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add Budget Line
            </Button>
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
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add your first budget line
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Budget Line
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'category'} direction={sort.field === 'category' ? sort.dir : 'asc'} onClick={() => handleSort('category')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'budget'} direction={sort.field === 'budget' ? sort.dir : 'asc'} onClick={() => handleSort('budget')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Approved Budget
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'revised'} direction={sort.field === 'revised' ? sort.dir : 'asc'} onClick={() => handleSort('revised')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Revised Budget
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'actual'} direction={sort.field === 'actual' ? sort.dir : 'asc'} onClick={() => handleSort('actual')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Actual Spend
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'variance'} direction={sort.field === 'variance' ? sort.dir : 'asc'} onClick={() => handleSort('variance')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                    Variance
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  Entity
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
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', fontSize: fontSizes.sm, fontWeight: 700 }}>
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
                            borderRadius: 1.15,
                            bgcolor: isDark ? '#334155' : '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: ut > 85 ? '#ef4444' : ut > 65 ? '#f59e0b' : '#22c55e',
                            },
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                        {isOverBudget && <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
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
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {line.pm_portfolio || line.pm_programme || line.pm_projectcode || '—'}
                      </Typography>
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

      {/* ── Detail Drawer ────────────────────────────── */}
      <DetailDrawer
        open={!!selectedBudget}
        onClose={handleCloseDetail}
        icon={<AccountBalanceWalletIcon sx={{ color: '#0ea5e9', fontSize: 22 }} />}
        title={selectedBudget?.pm_budgetlinename ?? ''}
        subtitle={selectedBudget && (
          <>
            <StatusTag
              label={CATEGORY_LABELS[String(selectedBudget.pm_costcategory ?? '')] ?? 'Unknown'}
              color={CATEGORY_COLORS[String(selectedBudget.pm_costcategory ?? '')] ?? 'default'}
            />
            {selectedBudget.pm_fundingsourcename && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, display: 'inline' }}>
                <SourceIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                {selectedBudget.pm_fundingsourcename}
              </Typography>
            )}
          </>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="error"
              onClick={() => selectedBudget?.pm_budgetlineid && setDeleteConfirm(selectedBudget.pm_budgetlineid)}
              sx={{ borderRadius: 1.15 }}
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => selectedBudget && openEditForm(selectedBudget)}
              sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
        tabs={[
          { label: 'Overview' },
          { label: 'Details' },
        ]}
        tabValue={detailTab}
        onTabChange={(_e, v) => { setDetailTab(v); setError(null) }}
      >
        {selectedBudget && (
          <>
            {/* Overview Tab */}
            <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Budget Utilization */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> Budget Utilization
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
                        borderRadius: 1.15,
                        bgcolor: isDark ? '#334155' : '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: budgetUtilization(selectedBudget) > 85 ? '#ef4444'
                            : budgetUtilization(selectedBudget) > 65 ? '#f59e0b' : '#22c55e',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #0ea5e9' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Revised Budget
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.base }}>
                        {selectedBudget.pm_revisedbudgeteur != null ? currencyFormatter.format(selectedBudget.pm_revisedbudgeteur) : '—'}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #22c55e' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                        Actual Spend
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.base }}>
                        {selectedBudget.pm_actualspendeur != null ? currencyFormatter.format(selectedBudget.pm_actualspendeur) : '—'}
                      </Typography>
                    </Paper>
                  </Box>
                </Paper>

                {/* Variance Display */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CurrencyExchangeIcon sx={{ fontSize: 16 }} /> Variance Analysis
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 1.15,
                        textAlign: 'center',
                        borderColor: selectedBudget.pm_varianceeur != null && selectedBudget.pm_varianceeur >= 0 ? '#22c55e' : '#ef4444',
                        bgcolor: selectedBudget.pm_varianceeur != null && selectedBudget.pm_varianceeur >= 0
                          ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)')
                          : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'),
                      }}
                    >
                      {selectedBudget.pm_varianceeur != null && selectedBudget.pm_varianceeur >= 0
                        ? <VerifiedIcon sx={{ fontSize: 24, color: '#22c55e', mb: 0.5 }} />
                        : <WarningAmberIcon sx={{ fontSize: 24, color: '#ef4444', mb: 0.5 }} />
                      }
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: getVarianceColor(selectedBudget.pm_varianceeur) }}>
                        {selectedBudget.pm_varianceeur != null
                          ? `${selectedBudget.pm_varianceeur >= 0 ? '+' : ''}${currencyFormatter.format(selectedBudget.pm_varianceeur)}`
                          : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Variance</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.15, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                        {selectedBudget.pm_committedspendeur != null ? currencyFormatter.format(selectedBudget.pm_committedspendeur) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Committed Spend</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.15, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                        {selectedBudget.pm_forecastspendeur != null ? currencyFormatter.format(selectedBudget.pm_forecastspendeur) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Forecast</Typography>
                    </Paper>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Estimate at Completion</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {selectedBudget.pm_estimateatcompletioneur != null ? currencyFormatter.format(selectedBudget.pm_estimateatcompletioneur) : '—'}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Estimate to Complete</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {selectedBudget.pm_estimatetocompleteeur != null ? currencyFormatter.format(selectedBudget.pm_estimatetocompleteeur) : '—'}
                      </Typography>
                    </Paper>
                  </Box>
                </Paper>
              </Box>
            </TabPanel>

            {/* Details Tab */}
            <TabPanel value={detailTab} index={1} pt={0}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CategoryIcon sx={{ fontSize: 16 }} /> Line Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Category</Typography>
                    <Typography variant="body2">{selectedBudget.pm_costcategoryname || CATEGORY_LABELS[String(selectedBudget.pm_costcategory ?? '')] || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Funding Source</Typography>
                    <Typography variant="body2">{selectedBudget.pm_fundingsourcename || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Fiscal Period</Typography>
                    <Typography variant="body2">{selectedBudget.pm_fiscalperiodname || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Funding Period</Typography>
                    <Typography variant="body2">{selectedBudget.pm_fundingperiod || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Portfolio</Typography>
                    <Typography variant="body2">{selectedBudget.pm_portfolio || selectedBudget.pm_portfoliolookupname || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Programme</Typography>
                    <Typography variant="body2">{selectedBudget.pm_programme || selectedBudget.pm_programmelookupname || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Project</Typography>
                    <Typography variant="body2">{selectedBudget.pm_projectname || selectedBudget.pm_projectcode || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Funding Source Code</Typography>
                    <Typography variant="body2">{selectedBudget.pm_fundingsourcecode || '—'}</Typography>
                  </Box>
                </Box>
                {selectedBudget.pm_notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Notes</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>{selectedBudget.pm_notes}</Typography>
                  </Box>
                )}
              </Paper>
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      {/* ── Create/Edit Modal ──────────────────────── */}
      <Dialog
        open={showFormModal}
        onClose={() => !actionLoading && setShowFormModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 1.15 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', borderRadius: 1.15 }}>
            {editingBudget ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AccountBalanceWalletIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingBudget ? 'Edit Budget Line' : 'Add Budget Line'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingBudget ? `Update details for ${editingBudget.pm_budgetlinename}.` : 'Create a new budget line for tracking approved amounts, actual spend, and variance.'}
          </Typography>

          {/* Basic Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Budget Line Name"
                required
                fullWidth
                size="small"
                value={formData.pm_budgetlinename}
                onChange={(e) => setFormData((f) => ({ ...f, pm_budgetlinename: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cost Category</InputLabel>
                <Select
                  value={formData.pm_costcategory}
                  label="Cost Category"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_costcategory: e.target.value as number }))}
                  sx={{ borderRadius: 1.15 }}
                >
                  <MenuItem value={0}>Staff</MenuItem>
                  <MenuItem value={1}>Contractors</MenuItem>
                  <MenuItem value={2}>Licences</MenuItem>
                  <MenuItem value={3}>Infrastructure</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Portfolio"
                fullWidth
                size="small"
                value={formData.pm_portfolio}
                onChange={(e) => setFormData((f) => ({ ...f, pm_portfolio: e.target.value }))}
                placeholder="e.g., Corporate Portfolio"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Programme"
                fullWidth
                size="small"
                value={formData.pm_programme}
                onChange={(e) => setFormData((f) => ({ ...f, pm_programme: e.target.value }))}
                placeholder="e.g., Digital Transformation"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Project Code"
                fullWidth
                size="small"
                value={formData.pm_projectcode}
                onChange={(e) => setFormData((f) => ({ ...f, pm_projectcode: e.target.value }))}
                placeholder="e.g., PRJ-001"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Funding Source"
                fullWidth
                size="small"
                value={formData.pm_fundingsourcename}
                onChange={(e) => setFormData((f) => ({ ...f, pm_fundingsourcename: e.target.value }))}
                placeholder="e.g., EU Grant, Capital"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
          </Grid>

          {/* Financial Figures */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CurrencyExchangeIcon sx={{ fontSize: 18, color: '#22c55e' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Financial Figures (EUR)
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Approved Budget"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_approvedbudgeteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>€</Typography>, sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Revised Budget"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_revisedbudgeteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_revisedbudgeteur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>€</Typography>, sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Actual Spend"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_actualspendeur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_actualspendeur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>€</Typography>, sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Committed Spend"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_committedspendeur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_committedspendeur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>€</Typography>, sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Forecast Spend"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_forecastspendeur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_forecastspendeur: Number(e.target.value) }))}
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>€</Typography>, sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Variance (auto-calculated)"
                type="number"
                fullWidth
                size="small"
                value={computeVariance(formData)}
                disabled
                slotProps={{ input: { startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>€</Typography>, sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
          </Grid>

          {/* Notes */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <NotesIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Notes
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes / Comments"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={formData.pm_notes}
                onChange={(e) => setFormData((f) => ({ ...f, pm_notes: e.target.value }))}
                placeholder="Optional notes about this budget line..."
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveBudget}
            variant="contained"
            disabled={!formData.pm_budgetlinename.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}
          >
            {actionLoading ? 'Saving...' : editingBudget ? 'Update Budget Line' : 'Create Budget Line'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 1.15 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Budget Line</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this budget line? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteBudget} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
