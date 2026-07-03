import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptIcon from '@mui/icons-material/Receipt'

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
  fetchFinancialPeriods,
  fetchCashflowEntries,
  createCashflowEntry,
  updateCashflowEntry,
  deleteCashflowEntry,
  fetchBudgetLines,
} from '@/services'
import type { CashflowEntryModel, FinancialPeriodModel, BudgetLineModel } from '@/types/dataverse'
import type { ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import { 
  PageHeader, 
  KpiCardRow, 
  Breadcrumbs,
  StatusTag, 
  ActionIcon, 
  Button, 
  ConfirmDialog 
} from '@/components/common'
import type { KpiCardItem } from '@/components/common'

// Sub-components
import { CashflowTable } from '../components/CashflowTable'
import { CashflowEntryForm } from '../components/CashflowEntryForm'
import { CashflowDetail } from '../components/CashflowDetail'
import { DIRECTION_LABELS, DIRECTION_COLORS, TXN_TYPE_LABELS } from '../constants'
export default function CashflowPage() {
  const { allowed: canCreate } = useAuthorization('CASHFLOW', 'create')
  const { allowed: canEdit } = useAuthorization('CASHFLOW', 'update')
  const { allowed: canDelete } = useAuthorization('CASHFLOW', 'delete')

  const [entries, setEntries] = useState<CashflowEntryModel[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filter state (Table state is managed by DataverseTable but we keep filters here for cross-component visibility)
  const [directionFilter, setDirectionFilter] = useState('')
  const [txnTypeFilter, setTxnTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<CashflowEntryModel | null>(null)

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashflowEntryModel | null>(null)
  const [formData, setFormData] = useState<Partial<CashflowEntryModel>>({})

  // Lookup data state
  const [programmes, setProgrammes] = useState<ProgrammeLookupItem[]>([])
  const [projects, setProjects] = useState<ProjectLookupItem[]>([])
  const [fiscalPeriods, setFiscalPeriods] = useState<FinancialPeriodModel[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLineModel[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCashflowEntries()
      setEntries(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cashflow entries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    Promise.all([
      fetchProgrammesForLookup(),
      fetchProjectsForLookup(),
      fetchFinancialPeriods(),
      fetchBudgetLines(),
    ]).then(([progs, projs, periods, bls]) => {
      setProgrammes(progs)
      setProjects(projs)
      setFiscalPeriods(periods)
      setBudgetLines(bls)
    }).catch((err) => {
      setError('Failed to load lookup resources')
    })
  }, [])

  const filteredEntries = useMemo(() => {
    let list = [...entries]
    if (directionFilter) list = list.filter(e => String(e.pm_transactiondirection) === directionFilter)
    if (txnTypeFilter) list = list.filter(e => String(e.pm_transactiontype) === txnTypeFilter)
    if (categoryFilter) list = list.filter(e => String(e.pm_category) === categoryFilter)
    return list
  }, [entries, directionFilter, txnTypeFilter, categoryFilter])

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
    if (!formData.pm_entryname) return
    
    setSaving(true)
    setError(null)
    try {
      if (dialogMode === 'create') {
        const data = await createCashflowEntry(formData)
        if (data) {
          setEntries(prev => [data, ...prev])
          setSuccessMsg('Entry created successfully')
          setDialogMode(null)
        } else {
          setError('Failed to create entry')
        }
      } else {
        const data = await updateCashflowEntry(formData.pm_cashflowentryid!, formData)
        if (data) {
          setEntries(prev => prev.map(item => item.pm_cashflowentryid === formData.pm_cashflowentryid ? data : item))
          if (selectedEntry?.pm_cashflowentryid === formData.pm_cashflowentryid) {
            setSelectedEntry(data)
          }
          setSuccessMsg('Entry updated successfully')
          setDialogMode(null)
        } else {
          setError('Failed to update entry')
        }
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setError(null)
    try {
      await deleteCashflowEntry(deleteTarget.pm_cashflowentryid!)
      setEntries(prev => prev.filter(item => item.pm_cashflowentryid !== deleteTarget.pm_cashflowentryid))
      setSuccessMsg('Entry deleted successfully')
      if (selectedEntry?.pm_cashflowentryid === deleteTarget.pm_cashflowentryid) setSelectedEntry(null)
      setDeleteTarget(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Cashflow Management"
        subtitle="Track financial inflows and outflows across programmes and projects."
        actionElement={
          canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setDialogMode('create') }}>
              New Entry
            </Button>
          )
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <KpiCardRow items={kpiCards} loading={loading} />

      {!selectedEntry ? (
        <CashflowTable
          loading={loading}
          entries={filteredEntries}
          directionFilter={directionFilter}
          onDirectionFilterChange={setDirectionFilter}
          txnTypeFilter={txnTypeFilter}
          onTxnTypeFilterChange={setTxnTypeFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          onSelectEntry={setSelectedEntry}
          onEditEntry={(entry) => { setFormData(entry); setDialogMode('edit') }}
          onDeleteEntry={setDeleteTarget}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, mb: 3 }}>
          <Breadcrumbs
            items={[
              { label: 'Cashflow', path: 'list' },
              { label: selectedEntry.pm_entryname ?? 'Detail' }
            ]}
            onNavigate={() => setSelectedEntry(null)}
          />
          <PageHeader
            title={selectedEntry?.pm_entryname ?? ''}
            subtitle={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <StatusTag 
                  label={DIRECTION_LABELS[String(selectedEntry.pm_transactiondirection)] || '—'} 
                  color={DIRECTION_COLORS[String(selectedEntry.pm_transactiondirection)] || 'default'} 
                />
                <StatusTag label={TXN_TYPE_LABELS[String(selectedEntry.pm_transactiontype)] || '—'} variant="outlined" />
              </Box>
            }
            actionElement={
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canEdit && (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setFormData(selectedEntry!); setDialogMode('edit') }} sx={{ borderRadius: 1.5 }}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedEntry)} sx={{ borderRadius: 1.5 }}>
                    Delete
                  </Button>
                )}
              </Box>
            }
          />
          <CashflowDetail entry={selectedEntry} />
        </Box>
      )}



      <CashflowEntryForm
        open={dialogMode !== null}
        mode={dialogMode || 'create'}
        onClose={() => setDialogMode(null)}
        formData={formData}
        formErrors={{}}
        onFieldChange={(field, val) => setFormData(f => ({ ...f, [field]: val }))}
        loading={saving}
        programmes={programmes}
        projects={projects}
        fiscalPeriods={fiscalPeriods}
        budgetLines={budgetLines}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Cashflow Entry"
        message={`Are you sure you want to remove "${deleteTarget?.pm_entryname}"? This action cannot be undone.`}
        confirmLabel="Remove"
        confirmColor="error"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
