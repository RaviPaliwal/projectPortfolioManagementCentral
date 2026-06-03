import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
  useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptIcon from '@mui/icons-material/Receipt'

import {
  fetchCashflowEntries,
  createCashflowEntry,
  updateCashflowEntry,
  deleteCashflowEntry,
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
} from '@/services'
import type { CashflowEntryModel } from '@/types/dataverse'
import type { ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import type { ExportColumn } from '@/utils/exportUtils'
import { PageHeader, KpiCardRow, DetailDrawer, ExportButton, StatusTag, ActionIcon, Button } from '@/components/common'
import type { KpiCardItem } from '@/components/common'

// Sub-components
import { CashflowTable } from '../components/CashflowTable'
import { CashflowEntryForm } from '../components/CashflowEntryForm'
import { CashflowDetail } from '../components/CashflowDetail'
import { CashflowDeleteDialog } from '../components/CashflowDeleteDialog'
import { DIRECTION_LABELS, DIRECTION_COLORS, TXN_TYPE_LABELS, CATEGORY_LABELS } from '../constants'

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

export default function CashflowPage() {
  const theme = useTheme()

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
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(15)
  const [selectedEntry, setSelectedEntry] = useState<CashflowEntryModel | null>(null)

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashflowEntryModel | null>(null)
  const [formData, setFormData] = useState<Partial<CashflowEntryModel>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Lookup data state
  const [programmes, setProgrammes] = useState<ProgrammeLookupItem[]>([])
  const [projects, setProjects] = useState<ProjectLookupItem[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCashflowEntries()
      setEntries(data ?? [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load cashflow entries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    Promise.all([
      fetchProgrammesForLookup(),
      fetchProjectsForLookup(),
    ]).then(([progs, projs]) => {
      setProgrammes(progs)
      setProjects(projs)
    })
  }, [])

  const filteredEntries = useMemo(() => {
    let list = [...entries]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(e => e.pm_entryname?.toLowerCase().includes(q) || e.pm_description?.toLowerCase().includes(q))
    }
    if (directionFilter) list = list.filter(e => String(e.pm_transactiondirection) === directionFilter)
    if (txnTypeFilter) list = list.filter(e => String(e.pm_transactiontype) === txnTypeFilter)
    if (categoryFilter) list = list.filter(e => String(e.pm_category) === categoryFilter)
    return list.sort((a, b) => (b.pm_transactiondate || '').localeCompare(a.pm_transactiondate || ''))
  }, [entries, searchQuery, directionFilter, txnTypeFilter, categoryFilter])

  const kpiCards: KpiCardItem[] = useMemo(() => {
    const totalInflow = entries.filter(e => String(e.pm_transactiondirection) === '1').reduce((acc, curr) => acc + (curr.pm_amounteur ?? 0), 0)
    const totalOutflow = entries.filter(e => String(e.pm_transactiondirection) === '0').reduce((acc, curr) => acc + (curr.pm_amounteur ?? 0), 0)
    return [
      { label: 'Total Inflow', value: `\u20AC${(totalInflow / 1000).toFixed(0)}K`, icon: <ReceiptIcon />, color: 'success.main' },
      { label: 'Total Outflow', value: `\u20AC${(totalOutflow / 1000).toFixed(0)}K`, icon: <ReceiptIcon />, color: 'error.main' },
      { label: 'Net Cashflow', value: `\u20AC${((totalInflow - totalOutflow) / 1000).toFixed(0)}K`, icon: <ReceiptIcon />, color: 'primary.main' },
      { label: 'Total Entries', value: entries.length, icon: <ReceiptIcon />, color: 'info.main' },
    ]
  }, [entries])

  const handleSave = async () => {
    if (!formData.pm_entryname) {
      setFormErrors({ pm_entryname: 'Entry name is required' })
      return
    }
    setActionLoading(true)
    try {
      if (dialogMode === 'create') {
        await createCashflowEntry(formData as CashflowEntryModel)
        setSuccessMsg('Entry created successfully')
      } else {
        await updateCashflowEntry(formData.pm_cashflowentryid!, formData as CashflowEntryModel)
        setSuccessMsg('Entry updated successfully')
      }
      setDialogMode(null)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to save entry')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await deleteCashflowEntry(deleteTarget.pm_cashflowentryid!)
      setSuccessMsg('Entry deleted successfully')
      setDeleteTarget(null)
      if (selectedEntry?.pm_cashflowentryid === deleteTarget.pm_cashflowentryid) setSelectedEntry(null)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Cashflow Management"
        subtitle="Track financial inflows and outflows across programmes and projects."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredEntries} columns={cashflowExportColumns} filename="CashflowReport" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setDialogMode('create') }}>
              New Entry
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!loading && <KpiCardRow items={kpiCards} />}

      <CashflowTable
        loading={loading}
        entries={filteredEntries}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        directionFilter={directionFilter}
        onDirectionFilterChange={setDirectionFilter}
        txnTypeFilter={txnTypeFilter}
        onTxnTypeFilterChange={setTxnTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        page={page}
        onPageChange={setPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        onSelectEntry={setSelectedEntry}
        onEditEntry={(entry) => { setFormData(entry); setDialogMode('edit') }}
        onDeleteEntry={setDeleteTarget}
      />

      <DetailDrawer
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry?.pm_entryname ?? ''}
        subtitle={selectedEntry && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <StatusTag 
              label={DIRECTION_LABELS[String(selectedEntry.pm_transactiondirection)] || '—'} 
              color={DIRECTION_COLORS[String(selectedEntry.pm_transactiondirection)] || 'default'} 
              size="small" 
            />
            <StatusTag label={TXN_TYPE_LABELS[String(selectedEntry.pm_transactiontype)] || '—'} size="small" variant="outlined" />
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <ActionIcon 
              icon={<EditIcon />} 
              onClick={() => { setFormData(selectedEntry!); setDialogMode('edit') }} 
              label="Edit" 
              color="primary" 
            />
            <ActionIcon 
              icon={<DeleteIcon />} 
              onClick={() => setDeleteTarget(selectedEntry)} 
              label="Delete" 
              color="error" 
            />
          </Box>
        }
      >
        {selectedEntry && <CashflowDetail entry={selectedEntry} />}
      </DetailDrawer>

      <CashflowEntryForm
        open={dialogMode !== null}
        mode={dialogMode || 'create'}
        onClose={() => setDialogMode(null)}
        formData={formData}
        onFieldChange={(field, val) => setFormData(f => ({ ...f, [field]: val }))}
        formErrors={formErrors}
        loading={actionLoading}
        programmes={programmes}
        projects={projects}
        onSave={handleSave}
      />

      <CashflowDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        entryName={deleteTarget?.pm_entryname || ''}
      />
    </Box>
  )
}
