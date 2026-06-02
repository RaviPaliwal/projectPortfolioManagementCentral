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
  IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DescriptionIcon from '@mui/icons-material/Description'
import BusinessIcon from '@mui/icons-material/Business'
import SavingsIcon from '@mui/icons-material/Savings'
import EuroIcon from '@mui/icons-material/Euro'
import {
  fetchFundingSources,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource,
} from '@/services'
import type { FundingSourceModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, ExportButton, StatusTag } from '@/components/common'
import type { KpiCardItem, FilterOption, ExportColumn } from '@/components/common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FUNDING_TYPE_LABELS: Record<string, string> = {
  '0': 'Capital',
  '1': 'EU',
  '2': 'Revenue',
  '3': 'Grant',
}

const FUNDING_TYPE_COLORS: Record<string, 'primary' | 'info' | 'success' | 'secondary'> = {
  '0': 'primary',
  '1': 'info',
  '2': 'success',
  '3': 'secondary',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'Exhausted',
}

const STATUS_COLORS: Record<string, 'success' | 'error'> = {
  '0': 'success',
  '1': 'error',
}

const FUNDING_TYPE_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Types' },
  { value: '0', label: 'Capital' },
  { value: '1', label: 'EU' },
  { value: '2', label: 'Revenue' },
  { value: '3', label: 'Grant' },
]

const fundingExportColumns: ExportColumn[] = [
  { key: 'pm_fundingsourcename', label: 'Source' },
  { key: 'pm_fundingtype', label: 'Type' },
  { key: 'pm_fundingstatus', label: 'Status' },
  { key: 'pm_totalamounteur', label: 'Total Amount (EUR)' },
  { key: 'pm_allocatedamounteur', label: 'Allocated (EUR)' },
  { key: 'pm_availableamounteur', label: 'Available (EUR)' },
  { key: 'pm_fundingbody', label: 'Funding Body' },
  { key: 'pm_referencecode', label: 'Reference' },
  { key: 'pm_effectivefromdate', label: 'Effective From' },
  { key: 'pm_effectivetodate', label: 'Effective To' },
]

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: '0', label: 'Active' },
  { value: '1', label: 'Exhausted' },
]

type SortField = 'name' | 'type' | 'status' | 'total' | 'allocated' | 'available' | 'body' | 'fromdate'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FundingSourcesPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [fundingSources, setFundingSources] = useState<FundingSourceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Detail panel state
  const [selectedSource, setSelectedSource] = useState<FundingSourceModel | null>(null)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingSource, setEditingSource] = useState<FundingSourceModel | null>(null)
  const [formData, setFormData] = useState({
    pm_fundingsourcename: '',
    pm_fundingtype: 0,
    pm_fundingstatus: 0,
    pm_fundingbody: '',
    pm_referencecode: '',
    pm_totalamounteur: 0,
    pm_allocatedamounteur: 0,
    pm_availableamounteur: 0,
    pm_effectivefromdate: '',
    pm_effectivetodate: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchFundingSources()
      setFundingSources(list)
    } catch {
      setError('Unable to load funding source data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = fundingSources.length
    const active = fundingSources.filter((s) => String(s.pm_fundingstatus) === '0').length
    const totalAmount = fundingSources.reduce((s, fs) => s + (fs.pm_totalamounteur ?? 0), 0)
    const allocatedAmount = fundingSources.reduce((s, fs) => s + (fs.pm_allocatedamounteur ?? 0), 0)
    const exhausted = fundingSources.filter((s) => String(s.pm_fundingstatus) === '1').length
    return [
      {
        label: 'Total Sources',
        value: total,
        subtitle: `${active} active, ${exhausted} exhausted`,
        icon: <AccountBalanceIcon />,
        color: '#6366f1',
      },
      {
        label: 'Total Funding',
        value: currencyFormatter.format(totalAmount),
        subtitle: 'Across all sources',
        icon: <EuroIcon />,
        color: '#22c55e',
      },
      {
        label: 'Allocated',
        value: currencyFormatter.format(allocatedAmount),
        subtitle: `${totalAmount > 0 ? ((allocatedAmount / totalAmount) * 100).toFixed(0) : 0}% of total`,
        icon: <SavingsIcon />,
        color: '#0ea5e9',
      },
      {
        label: 'Available',
        value: currencyFormatter.format(Math.max(0, totalAmount - allocatedAmount)),
        subtitle: `${totalAmount > 0 ? ((Math.max(0, totalAmount - allocatedAmount) / totalAmount) * 100).toFixed(0) : 0}% unallocated`,
        icon: <AttachMoneyIcon />,
        color: '#f59e0b',
      },
    ]
  }, [fundingSources])

  // ── Filtered & Sorted ─────────────────────────────────────────────────────
  const filteredSources = useMemo(() => {
    let list = [...fundingSources]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          s.pm_fundingsourcename?.toLowerCase().includes(q) ||
          s.pm_fundingbody?.toLowerCase().includes(q) ||
          s.pm_referencecode?.toLowerCase().includes(q) ||
          s.pm_portfolioname?.toLowerCase().includes(q) ||
          s.pm_programmename?.toLowerCase().includes(q)
      )
    }

    if (typeFilter) {
      list = list.filter((s) => String(s.pm_fundingtype) === typeFilter)
    }

    if (statusFilter) {
      list = list.filter((s) => String(s.pm_fundingstatus) === statusFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_fundingsourcename ?? '').localeCompare(b.pm_fundingsourcename ?? '')
          break
        case 'type':
          cmp = String(a.pm_fundingtype ?? '').localeCompare(String(b.pm_fundingtype ?? ''))
          break
        case 'status':
          cmp = String(a.pm_fundingstatus ?? '').localeCompare(String(b.pm_fundingstatus ?? ''))
          break
        case 'total':
          cmp = (a.pm_totalamounteur ?? 0) - (b.pm_totalamounteur ?? 0)
          break
        case 'allocated':
          cmp = (a.pm_allocatedamounteur ?? 0) - (b.pm_allocatedamounteur ?? 0)
          break
        case 'available':
          cmp = ((a.pm_totalamounteur ?? 0) - (a.pm_allocatedamounteur ?? 0)) - ((b.pm_totalamounteur ?? 0) - (b.pm_allocatedamounteur ?? 0))
          break
        case 'body':
          cmp = (a.pm_fundingbody ?? '').localeCompare(b.pm_fundingbody ?? '')
          break
        case 'fromdate':
          cmp = (a.pm_effectivefromdate ?? '').localeCompare(b.pm_effectivefromdate ?? '')
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [fundingSources, searchQuery, typeFilter, statusFilter, sort])

  const paginatedSources = useMemo(
    () => filteredSources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredSources, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((v: string) => { setSearchQuery(v); setPage(0) }, [])
  const handleTypeFilterChange = useCallback((v: string) => { setTypeFilter(v); setPage(0) }, [])
  const handleStatusFilterChange = useCallback((v: string) => { setStatusFilter(v); setPage(0) }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback((source: FundingSourceModel) => {
    setSelectedSource(source)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedSource(null)
  }, [])

  // ── Form open for create/edit ──
  const openCreateForm = useCallback(() => {
    setEditingSource(null)
    setFormData({
      pm_fundingsourcename: '',
      pm_fundingtype: 0,
      pm_fundingstatus: 0,
      pm_fundingbody: '',
      pm_referencecode: '',
      pm_totalamounteur: 0,
      pm_allocatedamounteur: 0,
      pm_availableamounteur: 0,
      pm_effectivefromdate: '',
      pm_effectivetodate: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((source: FundingSourceModel) => {
    setEditingSource(source)
    setFormData({
      pm_fundingsourcename: source.pm_fundingsourcename ?? '',
      pm_fundingtype: Number(source.pm_fundingtype) || 0,
      pm_fundingstatus: Number(source.pm_fundingstatus) || 0,
      pm_fundingbody: source.pm_fundingbody ?? '',
      pm_referencecode: source.pm_referencecode ?? '',
      pm_totalamounteur: source.pm_totalamounteur ?? 0,
      pm_allocatedamounteur: source.pm_allocatedamounteur ?? 0,
      pm_availableamounteur: source.pm_availableamounteur ?? 0,
      pm_effectivefromdate: source.pm_effectivefromdate?.split('T')[0] ?? '',
      pm_effectivetodate: source.pm_effectivetodate?.split('T')[0] ?? '',
    })
    setShowFormModal(true)
  }, [])

  // ── Save ──
  const handleSaveSource = async () => {
    if (!formData.pm_fundingsourcename.trim()) {
      setError('Funding source name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = {
        pm_fundingsourcename: formData.pm_fundingsourcename,
        pm_fundingtype: formData.pm_fundingtype,
        pm_fundingstatus: formData.pm_fundingstatus,
        pm_fundingbody: formData.pm_fundingbody || undefined,
        pm_referencecode: formData.pm_referencecode || undefined,
        pm_totalamounteur: formData.pm_totalamounteur || 0,
        pm_allocatedamounteur: formData.pm_allocatedamounteur || 0,
        pm_availableamounteur: formData.pm_availableamounteur || 0,
        pm_effectivefromdate: formData.pm_effectivefromdate || undefined,
        pm_effectivetodate: formData.pm_effectivetodate || undefined,
      }

      if (editingSource?.pm_fundingsourceid) {
        await updateFundingSource(editingSource.pm_fundingsourceid, payload)
        setSuccessMsg('Funding source updated successfully.')
      } else {
        await createFundingSource(payload)
        setSuccessMsg('Funding source created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingSource ? 'Unable to update funding source.' : 'Unable to create funding source.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ──
  const handleDeleteSource = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteFundingSource(deleteConfirm)
      setSuccessMsg('Funding source removed successfully.')
      setDeleteConfirm(null)
      if (selectedSource?.pm_fundingsourceid === deleteConfirm) {
        setSelectedSource(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete funding source.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Get sort direction helper ──
  const getSortDir = (field: SortField): 'asc' | 'desc' =>
    sort.field === field ? sort.dir : 'asc'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Funding Sources"
        subtitle="Manage funding sources — capital, EU grants, revenue, and other funding streams with allocation tracking and effective dates."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredSources} columns={fundingExportColumns} filename="FundingSources" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add Source
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Row ──────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── Funding Sources Grid ─────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name, body, reference code..."
          filterValue={typeFilter}
          onFilterChange={handleTypeFilterChange}
          filterLabel="Type"
          filterOptions={FUNDING_TYPE_FILTER_OPTIONS}
          extraFilters={
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                sx={{ borderRadius: 1.15 }}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          }
          onClear={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter(''); setPage(0) }}
        />

        <TableShell
          loading={loading}
          empty={filteredSources.length === 0}
          emptyIcon={<AccountBalanceIcon />}
          emptyTitle={searchQuery || typeFilter || statusFilter ? 'No funding sources match your criteria.' : 'No funding sources registered yet.'}
          emptyAction={!searchQuery && !typeFilter && !statusFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add your first funding source
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'name'} direction={getSortDir('name')} onClick={() => handleSort('name')} sx={{ fontWeight: 700 }}>
                    Source
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'type'} direction={getSortDir('type')} onClick={() => handleSort('type')} sx={{ fontWeight: 700 }}>
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'status'} direction={getSortDir('status')} onClick={() => handleSort('status')} sx={{ fontWeight: 700 }}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'total'} direction={getSortDir('total')} onClick={() => handleSort('total')} sx={{ fontWeight: 700 }}>
                    Total Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'allocated'} direction={getSortDir('allocated')} onClick={() => handleSort('allocated')} sx={{ fontWeight: 700 }}>
                    Allocated
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'available'} direction={getSortDir('available')} onClick={() => handleSort('available')} sx={{ fontWeight: 700 }}>
                    Available
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'body'} direction={getSortDir('body')} onClick={() => handleSort('body')} sx={{ fontWeight: 700 }}>
                    Funding Body
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                  <TableSortLabel active={sort.field === 'fromdate'} direction={getSortDir('fromdate')} onClick={() => handleSort('fromdate')} sx={{ fontWeight: 700 }}>
                    Effective
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSources.map((source, idx) => {
                const totalAmt = source.pm_totalamounteur ?? 0
                const allocatedAmt = source.pm_allocatedamounteur ?? 0
                const availableAmt = totalAmt - allocatedAmt
                const utilPct = totalAmt > 0 ? (allocatedAmt / totalAmt) * 100 : 0
                return (
                  <TableRow
                    key={source.pm_fundingsourceid}
                    hover
                    onClick={() => handleRowClick(source)}
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
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: fontSizes.sm, fontWeight: 700 }}>
                          {(source.pm_fundingsourcename ?? 'F').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {source.pm_fundingsourcename ?? 'Unnamed Source'}
                          </Typography>
                          {source.pm_referencecode && (
                            <Typography variant="caption" color="text.secondary">
                              {source.pm_referencecode}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={FUNDING_TYPE_LABELS[String(source.pm_fundingtype ?? '')] ?? '—'}
                        color={FUNDING_TYPE_COLORS[String(source.pm_fundingtype ?? '')] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={STATUS_LABELS[String(source.pm_fundingstatus ?? '')] ?? '—'}
                        color={STATUS_COLORS[String(source.pm_fundingstatus ?? '')] ?? 'default'}
                        variant={String(source.pm_fundingstatus) === '1' ? 'filled' : 'filled'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                        {currencyFormatter.format(totalAmt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                        {currencyFormatter.format(allocatedAmt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm, color: availableAmt > 0 ? 'success.main' : 'text.secondary' }}>
                          {currencyFormatter.format(Math.max(0, availableAmt))}
                        </Typography>
                        <Box
                          sx={{
                            width: 60,
                            height: 4,
                            borderRadius: 1.15,
                            bgcolor: isDark ? '#334155' : '#e2e8f0',
                            overflow: 'hidden',
                            ml: 'auto',
                            mt: 0.25,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(utilPct, 100)}%`,
                              height: '100%',
                              bgcolor: utilPct > 90 ? '#ef4444' : utilPct > 70 ? '#f59e0b' : '#22c55e',
                              borderRadius: 1.15,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {source.pm_fundingbody || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }} color="text.secondary">
                        {source.pm_effectivefromdate
                          ? new Date(source.pm_effectivefromdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                        {source.pm_effectivetodate && (
                          <> — {new Date(source.pm_effectivetodate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredSources.length > 0 && (
          <TableFooter
            filteredCount={filteredSources.length}
            totalCount={fundingSources.length}
            itemLabel="funding source"
            totals={[
              { label: 'Active', value: `${fundingSources.filter((s) => String(s.pm_fundingstatus) === '0').length}` },
              { label: 'Exhausted', value: `${fundingSources.filter((s) => String(s.pm_fundingstatus) === '1').length}` },
            ]}
          />
        )}
        {!loading && filteredSources.length > 0 && (
          <TablePagination
            component="div"
            count={filteredSources.length}
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
        open={!!selectedSource}
        onClose={handleCloseDetail}
        icon={<AccountBalanceIcon sx={{ color: '#6366f1', fontSize: 22 }} />}
        title={selectedSource?.pm_fundingsourcename ?? ''}
        subtitle={selectedSource && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusTag
              label={FUNDING_TYPE_LABELS[String(selectedSource.pm_fundingtype ?? '')]}
              color={FUNDING_TYPE_COLORS[String(selectedSource.pm_fundingtype ?? '')] ?? 'default'}
            />
            <StatusTag
              label={STATUS_LABELS[String(selectedSource.pm_fundingstatus ?? '')]}
              color={STATUS_COLORS[String(selectedSource.pm_fundingstatus ?? '')] ?? 'default'}
            />
            {selectedSource.pm_referencecode && (
              <Typography variant="body2" color="text.secondary">
                {selectedSource.pm_referencecode}
              </Typography>
            )}
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="error"
              onClick={() => selectedSource?.pm_fundingsourceid && setDeleteConfirm(selectedSource.pm_fundingsourceid)}
              sx={{ borderRadius: 1.15 }}
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => selectedSource && openEditForm(selectedSource)}
              sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
        tabs={[
          { label: 'Overview' },
        ]}
        tabValue={0}
      >
        {selectedSource && (
          <>
            {/* Overview Tab */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Funding Amounts */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SavingsIcon sx={{ fontSize: 16 }} /> Funding Allocation
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #22c55e' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                      Total Amount
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base, fontFamily: '"JetBrains Mono", monospace' }}>
                      {currencyFormatter.format(selectedSource.pm_totalamounteur ?? 0)}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #0ea5e9' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                      Allocated
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base, fontFamily: '"JetBrains Mono", monospace' }}>
                      {currencyFormatter.format(selectedSource.pm_allocatedamounteur ?? 0)}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #f59e0b' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                      Available
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: fontSizes.base, fontFamily: '"JetBrains Mono", monospace' }}>
                      {currencyFormatter.format(Math.max(0, (selectedSource.pm_totalamounteur ?? 0) - (selectedSource.pm_allocatedamounteur ?? 0)))}
                    </Typography>
                  </Paper>
                </Box>
                {selectedSource.pm_totalamounteur != null && selectedSource.pm_totalamounteur > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Utilization</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {((selectedSource.pm_allocatedamounteur ?? 0) / selectedSource.pm_totalamounteur * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', height: 8, borderRadius: 1.15, bgcolor: isDark ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${Math.min(((selectedSource.pm_allocatedamounteur ?? 0) / selectedSource.pm_totalamounteur) * 100, 100)}%`,
                          height: '100%',
                          bgcolor: ((selectedSource.pm_allocatedamounteur ?? 0) / selectedSource.pm_totalamounteur) > 0.9 ? '#ef4444' : ((selectedSource.pm_allocatedamounteur ?? 0) / selectedSource.pm_totalamounteur) > 0.7 ? '#f59e0b' : '#22c55e',
                          borderRadius: 1.15,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>

              {/* Details */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DescriptionIcon sx={{ fontSize: 16 }} /> Source Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
                    <Typography variant="body2">{FUNDING_TYPE_LABELS[String(selectedSource.pm_fundingtype ?? '')] ?? '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Status</Typography>
                    <Typography variant="body2">{STATUS_LABELS[String(selectedSource.pm_fundingstatus ?? '')] ?? '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Funding Body</Typography>
                    <Typography variant="body2">{selectedSource.pm_fundingbody || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reference Code</Typography>
                    <Typography variant="body2">{selectedSource.pm_referencecode || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Effective From</Typography>
                    <Typography variant="body2">
                      {selectedSource.pm_effectivefromdate
                        ? new Date(selectedSource.pm_effectivefromdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Effective To</Typography>
                    <Typography variant="body2">
                      {selectedSource.pm_effectivetodate
                        ? new Date(selectedSource.pm_effectivetodate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </Box>
                  {selectedSource.pm_portfolioname && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Portfolio</Typography>
                      <Typography variant="body2">{selectedSource.pm_portfolioname}</Typography>
                    </Box>
                  )}
                  {selectedSource.pm_programmename && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Programme</Typography>
                      <Typography variant="body2">{selectedSource.pm_programmename}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          </>
        )}
      </DetailDrawer>

      {/* ── Create/Edit Modal ──────────────────────── */}
      <Dialog
        open={showFormModal}
        onClose={() => !actionLoading && setShowFormModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', borderRadius: 1.15 }}>
            {editingSource ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AccountBalanceIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingSource ? 'Edit Funding Source' : 'Add Funding Source'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {editingSource
              ? `Update details for ${editingSource.pm_fundingsourcename}.`
              : 'Register a new funding source with type, allocation details, and effective dates.'}
          </Typography>

          {/* Basic Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BusinessIcon sx={{ fontSize: 18, color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Source Name"
                required
                fullWidth
                size="small"
                value={formData.pm_fundingsourcename}
                onChange={(e) => setFormData((f) => ({ ...f, pm_fundingsourcename: e.target.value }))}
                placeholder="e.g., EU Horizon Grant 2026"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Funding Type</InputLabel>
                <Select
                  value={formData.pm_fundingtype}
                  label="Funding Type"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_fundingtype: e.target.value as number }))}
                  sx={{ borderRadius: 1.15 }}
                >
                  <MenuItem value={0}>Capital</MenuItem>
                  <MenuItem value={1}>EU</MenuItem>
                  <MenuItem value={2}>Revenue</MenuItem>
                  <MenuItem value={3}>Grant</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.pm_fundingstatus}
                  label="Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_fundingstatus: e.target.value as number }))}
                  sx={{ borderRadius: 1.15 }}
                >
                  <MenuItem value={0}>Active</MenuItem>
                  <MenuItem value={1}>Exhausted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Funding Body"
                fullWidth
                size="small"
                value={formData.pm_fundingbody}
                onChange={(e) => setFormData((f) => ({ ...f, pm_fundingbody: e.target.value }))}
                placeholder="e.g., European Commission"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Reference Code"
                fullWidth
                size="small"
                value={formData.pm_referencecode}
                onChange={(e) => setFormData((f) => ({ ...f, pm_referencecode: e.target.value }))}
                placeholder="e.g., FS-2026-001"
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
          </Grid>

          {/* Funding Amounts */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EuroIcon sx={{ fontSize: 18, color: '#22c55e' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Funding Amounts (EUR)
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Total Amount"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_totalamounteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_totalamounteur: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Allocated Amount"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_allocatedamounteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_allocatedamounteur: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Available Amount"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_availableamounteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_availableamounteur: Number(e.target.value) || 0 }))}
                slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
          </Grid>

          {/* Effective Dates */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarTodayIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Effective Dates
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Effective From"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_effectivefromdate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_effectivefromdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Effective To"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_effectivetodate}
                onChange={(e) => setFormData((f) => ({ ...f, pm_effectivetodate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.15 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSource}
            variant="contained"
            disabled={!formData.pm_fundingsourcename.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}
          >
            {actionLoading ? 'Saving...' : editingSource ? 'Update Source' : 'Create Source'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Funding Source</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this funding source? This action cannot be undone and may affect linked budgets.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteSource} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
