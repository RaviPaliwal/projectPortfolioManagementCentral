import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ReceiptIcon from '@mui/icons-material/Receipt'
import CategoryIcon from '@mui/icons-material/Category'
import DescriptionIcon from '@mui/icons-material/Description'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import BusinessIcon from '@mui/icons-material/Business'

import {
  fetchCashflowEntries,
  createCashflowEntry,
  updateCashflowEntry,
  deleteCashflowEntry,
} from '@/lib/dataverseClient'
import type { CashflowEntryModel } from '@/types/dataverse'
import type { ExportColumn } from '@/utils/exportUtils'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, ExportButton } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

const DIRECTION_LABELS: Record<string, string> = {
  '0': 'Outflow',
  '1': 'Inflow',
}

const DIRECTION_COLORS: Record<string, 'error' | 'success'> = {
  '0': 'error',
  '1': 'success',
}

const TXN_TYPE_LABELS: Record<string, string> = {
  '0': 'Actual',
  '1': 'Forecast',
  '2': 'Planned',
}

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff',
  '1': 'Contractors',
  '2': 'Licences',
  '3': 'Grants',
  '4': 'Infrastructure',
}

const CATEGORY_COLORS: Record<string, string> = {
  '0': '#6366f1',
  '1': '#f59e0b',
  '2': '#0ea5e9',
  '3': '#22c55e',
  '4': '#ef4444',
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

// ─── Export Columns ───────────────────────────────────────────────────────────────────────────────────

const cashflowExportColumns: ExportColumn<CashflowEntryModel>[] = [
  { key: 'pm_entryname', label: 'Entry Name' },
  { key: 'pm_amounteur', label: 'Amount (EUR)' },
  { key: 'pm_transactiondirection', label: 'Direction', format: (v) => DIRECTION_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_transactiontype', label: 'Transaction Type', format: (v) => TXN_TYPE_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_category', label: 'Category', format: (v) => CATEGORY_LABELS[String(v ?? '')] ?? String(v ?? '') },
  { key: 'pm_transactiondate', label: 'Transaction Date' },
  { key: 'pm_invoicenumber', label: 'Invoice Number' },
  { key: 'pm_description', label: 'Description' },
  { key: 'pm_programmelookupname', label: 'Programme' },
  { key: 'pm_projectname', label: 'Project' },
  { key: 'pm_financialperiod', label: 'Financial Period' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatCurrency = (val?: number | null): string => val != null ? currencyFormatter.format(val) : '—'
const formatNumber = (val?: number | null): string => val != null ? numberFormatter.format(val) : '—'
const formatDate = (d?: string | null): string => d ? new Date(d).toLocaleDateString('en-GB') : '—'

// ─── Filter Options ──────────────────────────────────────────────────

const DIRECTION_FILTERS: FilterOption[] = [
  { value: '', label: 'All Directions' },
  { value: '1', label: 'Inflow' },
  { value: '0', label: 'Outflow' },
]

const TXN_TYPE_FILTERS: FilterOption[] = [
  { value: '', label: 'All Types' },
  { value: '0', label: 'Actual' },
  { value: '1', label: 'Forecast' },
  { value: '2', label: 'Planned' },
]

const CATEGORY_FILTERS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Staff' },
  { value: '1', label: 'Contractors' },
  { value: '2', label: 'Licences' },
  { value: '3', label: 'Grants' },
  { value: '4', label: 'Infrastructure' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type SortField = 'name' | 'amount' | 'direction' | 'type' | 'category' | 'date' | 'invoice'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CashflowPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [entries, setEntries] = useState<CashflowEntryModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')
  const [txnTypeFilter, setTxnTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'date', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(15)
  const [selectedEntry, setSelectedEntry] = useState<CashflowEntryModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashflowEntryModel | null>(null)
  const [formData, setFormData] = useState<Partial<CashflowEntryModel>>({})

  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [dialogLoading, setDialogLoading] = useState(false)

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCashflowEntries()
      setEntries(data ?? [])
    } catch (err: any) {
      console.error('Failed to load cashflow entries:', err)
      setError(err?.message || 'Failed to load cashflow entries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Filtering & Sorting ───────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    let list = [...entries]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((e) =>
        (e.pm_entryname?.toLowerCase() || '').includes(q) ||
        (e.pm_description?.toLowerCase() || '').includes(q) ||
        (e.pm_invoicenumber?.toLowerCase() || '').includes(q) ||
        (e.pm_programmelookupname?.toLowerCase() || '').includes(q) ||
        (e.pm_projectname?.toLowerCase() || '').includes(q)
      )
    }

    // Direction filter
    if (directionFilter) {
      list = list.filter((e) => String(e.pm_transactiondirection ?? '') === directionFilter)
    }

    // Transaction type filter
    if (txnTypeFilter) {
      list = list.filter((e) => String(e.pm_transactiontype ?? '') === txnTypeFilter)
    }

    // Category filter
    if (categoryFilter) {
      list = list.filter((e) => String(e.pm_category ?? '') === categoryFilter)
    }

    // Sort
    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const getA = (a: CashflowEntryModel): string | number => {
        switch (sort.field) {
          case 'name': return a.pm_entryname || ''
          case 'amount': return a.pm_amounteur ?? 0
          case 'direction': return a.pm_transactiondirection ?? ''
          case 'type': return a.pm_transactiontype ?? ''
          case 'category': return a.pm_category ?? ''
          case 'date': return a.pm_transactiondate || ''
          case 'invoice': return a.pm_invoicenumber || ''
          default: return ''
        }
      }
      const getB = (b: CashflowEntryModel): string | number => {
        switch (sort.field) {
          case 'name': return b.pm_entryname || ''
          case 'amount': return b.pm_amounteur ?? 0
          case 'direction': return b.pm_transactiondirection ?? ''
          case 'type': return b.pm_transactiontype ?? ''
          case 'category': return b.pm_category ?? ''
          case 'date': return b.pm_transactiondate || ''
          case 'invoice': return b.pm_invoicenumber || ''
          default: return ''
        }
      }
      const va = getA(a)
      const vb = getB(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })

    return list
  }, [entries, searchQuery, directionFilter, txnTypeFilter, categoryFilter, sort])

  const paginatedEntries = useMemo(() => {
    const start = page * rowsPerPage
    return filteredEntries.slice(start, start + rowsPerPage)
  }, [filteredEntries, page, rowsPerPage])

  // ─── KPI Calculations ──────────────────────────────────────────────────────

  const kpiCards: KpiCardItem[] = useMemo(() => {
    const totalInflow = entries
      .filter((e) => String(e.pm_transactiondirection) === '1')
      .reduce((sum, e) => sum + (e.pm_amounteur ?? 0), 0)
    const totalOutflow = entries
      .filter((e) => String(e.pm_transactiondirection) === '0')
      .reduce((sum, e) => sum + (e.pm_amounteur ?? 0), 0)
    const netFlow = totalInflow - totalOutflow

    return [
      {
        label: 'Total Entries',
        value: entries.length.toString(),
        icon: <ReceiptIcon />,
        color: '#6366f1',
      },
      {
        label: 'Total Inflow',
        value: formatCurrency(totalInflow),
        icon: <TrendingUpIcon />,
        color: '#22c55e',
      },
      {
        label: 'Total Outflow',
        value: formatCurrency(totalOutflow),
        icon: <TrendingDownIcon />,
        color: '#ef4444',
      },
      {
        label: 'Net Cash Flow',
        value: formatCurrency(netFlow),
        icon: <AccountBalanceIcon />,
        color: netFlow >= 0 ? '#22c55e' : '#ef4444',
      },
    ]
  }, [entries])

  // ─── Sort Handler ──────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
    setPage(0)
  }

  const getSortDirection = (field: SortField): 'asc' | 'desc' | undefined => {
    return sort.field === field ? sort.dir : undefined
  }

  // ─── Detail Drawer ─────────────────────────────────────────────────────────

  const openDrawer = useCallback((entry: CashflowEntryModel) => {
    setSelectedEntry(entry)
    setTabValue(0)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setSelectedEntry(null)
  }, [])

  // ─── Dialog Handlers ───────────────────────────────────────────────────────

  const openCreateDialog = useCallback(() => {
    setFormData({
      pm_transactiondirection: '1',
      pm_transactiontype: '0',
      pm_category: '0',
      statecode: 0,
    })
    setFormErrors({})
    setDialogMode('create')
  }, [])

  const openEditDialog = useCallback((entry: CashflowEntryModel) => {
    setFormData({ ...entry })
    setFormErrors({})
    setDialogMode('edit')
  }, [])

  const closeDialog = useCallback(() => {
    setDialogMode(null)
    setFormData({})
    setFormErrors({})
  }, [])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.pm_entryname?.trim()) errors.pm_entryname = 'Entry name is required'
    if (formData.pm_amounteur == null || formData.pm_amounteur < 0) errors.pm_amounteur = 'Valid amount is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ─── Save Handler ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return
    setDialogLoading(true)
    try {
      if (dialogMode === 'create') {
        await createCashflowEntry(formData)
        setSuccessMsg('Cashflow entry created successfully')
      } else if (dialogMode === 'edit' && formData.pm_cashflowentryid) {
        await updateCashflowEntry(formData.pm_cashflowentryid, formData)
        setSuccessMsg('Cashflow entry updated successfully')
      }
      closeDialog()
      await loadData()
    } catch (err: any) {
      console.error('Failed to save cashflow entry:', err)
      setError(err?.message || 'Failed to save cashflow entry')
    } finally {
      setDialogLoading(false)
    }
  }

  // ─── Delete Handler ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget?.pm_cashflowentryid) return
    setActionLoading(true)
    try {
      await deleteCashflowEntry(deleteTarget.pm_cashflowentryid)
      setSuccessMsg('Cashflow entry deleted successfully')
      setDeleteTarget(null)
      if (drawerOpen && selectedEntry?.pm_cashflowentryid === deleteTarget.pm_cashflowentryid) {
        closeDrawer()
      }
      await loadData()
    } catch (err: any) {
      console.error('Failed to delete cashflow entry:', err)
      setError(err?.message || 'Failed to delete cashflow entry')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getDirectionIcon = (direction?: number | string) => {
    return String(direction) === '1'
      ? <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} />
      : <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />
  }

  // ─── Extra Filters (for SearchFilterBar) ───────────────────────────────────

  const extraFilters = (
    <>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Direction</InputLabel>
        <Select
          value={directionFilter}
          label="Direction"
          onChange={(e) => { setDirectionFilter(e.target.value); setPage(0) }}
        >
          {DIRECTION_FILTERS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Type</InputLabel>
        <Select
          value={txnTypeFilter}
          label="Type"
          onChange={(e) => { setTxnTypeFilter(e.target.value); setPage(0) }}
        >
          {TXN_TYPE_FILTERS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={categoryFilter}
          label="Category"
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0) }}
        >
          {CATEGORY_FILTERS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  )

  // ─── Table Columns ─────────────────────────────────────────────────────────

  const columns = (
    <TableHead>
      <TableRow>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'name'}
            direction={getSortDirection('name')}
            onClick={() => handleSort('name')}
          >
            Entry Name
          </TableSortLabel>
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'amount'}
            direction={getSortDirection('amount')}
            onClick={() => handleSort('amount')}
          >
            Amount (EUR)
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'direction'}
            direction={getSortDirection('direction')}
            onClick={() => handleSort('direction')}
          >
            Direction
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'type'}
            direction={getSortDirection('type')}
            onClick={() => handleSort('type')}
          >
            Type
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'category'}
            direction={getSortDirection('category')}
            onClick={() => handleSort('category')}
          >
            Category
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'date'}
            direction={getSortDirection('date')}
            onClick={() => handleSort('date')}
          >
            Date
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>
          <TableSortLabel
            active={sort.field === 'invoice'}
            direction={getSortDirection('invoice')}
            onClick={() => handleSort('invoice')}
          >
            Invoice
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>Programme</TableCell>
        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>Project</TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5 }}>Actions</TableCell>
      </TableRow>
    </TableHead>
  )

  const rows = paginatedEntries.map((entry) => (
    <TableRow
      key={entry.pm_cashflowentryid}
      hover
      onClick={() => openDrawer(entry)}
      sx={{
        cursor: 'pointer',
        '&:last-child td': { border: 0 },
        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' },
        transition: 'background-color 0.15s ease',
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getDirectionIcon(entry.pm_transactiondirection)}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {entry.pm_entryname || '—'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="right">
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: String(entry.pm_transactiondirection) === '1' ? '#22c55e' : '#ef4444',
          }}
        >
          {formatCurrency(entry.pm_amounteur)}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={DIRECTION_LABELS[String(entry.pm_transactiondirection ?? '')] || '—'}
          size="small"
          color={DIRECTION_COLORS[String(entry.pm_transactiondirection ?? '')] || 'default'}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {TXN_TYPE_LABELS[String(entry.pm_transactiontype ?? '')] || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={CATEGORY_LABELS[String(entry.pm_category ?? '')] || '—'}
          size="small"
          sx={{
            bgcolor: `${CATEGORY_COLORS[String(entry.pm_category ?? '')]}20`,
            color: CATEGORY_COLORS[String(entry.pm_category ?? '')],
            fontWeight: 500,
          }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatDate(entry.pm_transactiondate)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {entry.pm_invoicenumber || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {entry.pm_programmelookupname || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {entry.pm_projectname || '—'}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); openEditDialog(entry) }}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry) }}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  ))

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Success / Error alerts */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <KpiCardRow items={kpiCards} />

      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PageHeader
          title="Cashflow Management"
          subtitle="Track inflows, outflows, and net cash position across programmes and projects"
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExportButton data={filteredEntries} columns={cashflowExportColumns} filename="cashflow" />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            Add Entry
          </Button>
        </Box>
      </Box>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setPage(0) }}
        searchPlaceholder="Search by name, description, invoice, programme, project..."
        extraFilters={extraFilters}
      />

      {/* Table */}
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <TableShell
          loading={loading}
          empty={!loading && filteredEntries.length === 0}
          emptyIcon={<ReceiptIcon />}
          emptyTitle={
            searchQuery || directionFilter || txnTypeFilter || categoryFilter
              ? 'No cashflow entries match your criteria'
              : 'No cashflow entries yet'
          }
          emptyAction={!searchQuery && !directionFilter && !txnTypeFilter && !categoryFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Add your first cashflow entry
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            {columns}
            <TableBody>
              {rows}
            </TableBody>
          </Table>
        </TableShell>
        {!loading && filteredEntries.length > 0 && (
          <TableFooter
            count={filteredEntries.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
          />
        )}
      </Paper>

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={selectedEntry?.pm_entryname || 'Cashflow Entry'}
        tabs={[{ label: 'Overview' }, { label: 'Details' }]}
        tabValue={tabValue}
        onTabChange={(_, v) => setTabValue(v)}
        headerActions={selectedEntry ? (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => { closeDrawer(); openEditDialog(selectedEntry) }}
              sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.main' + '15' }, borderRadius: 1.5 }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => { setDeleteTarget(selectedEntry); closeDrawer() }}
              sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.main' + '15' }, borderRadius: 1.5 }}
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        ) : undefined}
      >
        {/* Overview Tab */}
        {tabValue === 0 && selectedEntry && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Impact Summary Card */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50' }}
            >
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceIcon sx={{ fontSize: 16 }} />
                Financial Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Amount</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: String(selectedEntry.pm_transactiondirection) === '1' ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {formatCurrency(selectedEntry.pm_amounteur)}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Direction</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={DIRECTION_LABELS[String(selectedEntry.pm_transactiondirection ?? '')] || '—'}
                      size="small"
                      color={DIRECTION_COLORS[String(selectedEntry.pm_transactiondirection ?? '')] || 'default'}
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Transaction Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {TXN_TYPE_LABELS[String(selectedEntry.pm_transactiontype ?? '')] || '—'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Category</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={CATEGORY_LABELS[String(selectedEntry.pm_category ?? '')] || '—'}
                      size="small"
                      sx={{
                        bgcolor: `${CATEGORY_COLORS[String(selectedEntry.pm_category ?? '')]}20`,
                        color: CATEGORY_COLORS[String(selectedEntry.pm_category ?? '')],
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Description */}
            {selectedEntry.pm_description && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon sx={{ fontSize: 16 }} />
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEntry.pm_description}
                </Typography>
              </Paper>
            )}

            {/* Invoice & Financial Period */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongIcon sx={{ fontSize: 16 }} />
                Reference Details
              </Typography>
              <Grid container spacing={2}>
                {selectedEntry.pm_invoicenumber && (
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">Invoice Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedEntry.pm_invoicenumber}
                    </Typography>
                  </Grid>
                )}
                {selectedEntry.pm_fiscalperiodname && (
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">Fiscal Period</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedEntry.pm_fiscalperiodname}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Programme & Project */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon sx={{ fontSize: 16 }} />
                Linked Entities
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Programme</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedEntry.pm_programmelookupname || '—'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedEntry.pm_projectname || '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}

        {/* Details Tab */}
        {tabValue === 1 && selectedEntry && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Entry Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedEntry.pm_entryname || '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Transaction Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(selectedEntry.pm_transactiondate)}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Amount (EUR)</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: String(selectedEntry.pm_transactiondirection) === '1' ? '#22c55e' : '#ef4444',
                  }}
                >
                  {formatCurrency(selectedEntry.pm_amounteur)}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Direction</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {DIRECTION_LABELS[String(selectedEntry.pm_transactiondirection ?? '')] || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Transaction Type</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {TXN_TYPE_LABELS[String(selectedEntry.pm_transactiontype ?? '')] || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {CATEGORY_LABELS[String(selectedEntry.pm_category ?? '')] || '—'}
                </Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEntry.pm_description || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Invoice Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEntry.pm_invoicenumber || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Financial Period</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEntry.pm_financialperiod || selectedEntry.pm_fiscalperiodname || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Programme</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEntry.pm_programmelookupname || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Project</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEntry.pm_projectname || selectedEntry.pm_projectcode || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </DetailDrawer>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {dialogMode === 'create' ? 'New Cashflow Entry' : 'Edit Cashflow Entry'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Grid container spacing={2.5}>
            {/* Basic Info Section */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon sx={{ fontSize: 16 }} />
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Entry Name *"
                fullWidth
                size="small"
                value={formData.pm_entryname || ''}
                onChange={(e) => handleFieldChange('pm_entryname', e.target.value)}
                error={!!formErrors.pm_entryname}
                helperText={formErrors.pm_entryname}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Amount (EUR) *"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_amounteur ?? ''}
                onChange={(e) => handleFieldChange('pm_amounteur', parseFloat(e.target.value) || 0)}
                error={!!formErrors.pm_amounteur}
                helperText={formErrors.pm_amounteur}
              />
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction</InputLabel>
                <Select
                  value={String(formData.pm_transactiondirection ?? '1')}
                  label="Direction"
                  onChange={(e) => handleFieldChange('pm_transactiondirection', e.target.value)}
                >
                  {DIRECTION_FILTERS.filter((o) => o.value !== '').map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={String(formData.pm_transactiontype ?? '0')}
                  label="Transaction Type"
                  onChange={(e) => handleFieldChange('pm_transactiontype', e.target.value)}
                >
                  {TXN_TYPE_FILTERS.filter((o) => o.value !== '').map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={String(formData.pm_category ?? '0')}
                  label="Category"
                  onChange={(e) => handleFieldChange('pm_category', e.target.value)}
                >
                  {CATEGORY_FILTERS.filter((o) => o.value !== '').map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Details Section */}
            <Grid size={12} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon sx={{ fontSize: 16 }} />
                Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Transaction Date"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_transactiondate ? formData.pm_transactiondate.split('T')[0] : ''}
                onChange={(e) => handleFieldChange('pm_transactiondate', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Invoice Number"
                fullWidth
                size="small"
                value={formData.pm_invoicenumber || ''}
                onChange={(e) => handleFieldChange('pm_invoicenumber', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.pm_description || ''}
                onChange={(e) => handleFieldChange('pm_description', e.target.value)}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Financial Period"
                fullWidth
                size="small"
                value={formData.pm_financialperiod || ''}
                onChange={(e) => handleFieldChange('pm_financialperiod', e.target.value)}
                placeholder="e.g. FY2026-Q1"
              />
            </Grid>

            {/* Linked Entities Section */}
            <Grid size={12} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon sx={{ fontSize: 16 }} />
                Linked Entities
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Programme"
                fullWidth
                size="small"
                value={formData.pm_programmelookupname || ''}
                onChange={(e) => handleFieldChange('pm_programmelookupname', e.target.value)}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Project"
                fullWidth
                size="small"
                value={formData.pm_projectname || ''}
                onChange={(e) => handleFieldChange('pm_projectname', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeDialog} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={dialogLoading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {dialogLoading ? 'Saving...' : dialogMode === 'create' ? 'Create Entry' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Delete Cashflow Entry</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete "{deleteTarget?.pm_entryname}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={actionLoading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
