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
  Pm_cashflowentriesService,
} from '@/generated'
import {
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
  fetchFinancialPeriods,
} from '@/services'
import type { CashflowEntryModel, FinancialPeriodModel } from '@/types/dataverse'
import type { ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import { 
  PageHeader, 
  KpiCardRow, 
  DetailDrawer, 
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
import { useDataverseCrud } from '@/hooks/useDataverseCrud'
import { useDataverseAsync } from '@/hooks/useDataverseAsync'

export default function CashflowPage() {
  const { allowed: canCreate } = useAuthorization('CASHFLOW', 'create')
  const { allowed: canEdit } = useAuthorization('CASHFLOW', 'update')
  const { allowed: canDelete } = useAuthorization('CASHFLOW', 'delete')

  // Standardized CRUD Hook
  const {
    items: entries,
    loading,
    error: crudError,
    fetchAll,
    create,
    update,
    remove,
  } = useDataverseCrud<CashflowEntryModel>(Pm_cashflowentriesService)

  const actionState = useDataverseAsync<any>()
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

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    Promise.all([
      fetchProgrammesForLookup(),
      fetchProjectsForLookup(),
      fetchFinancialPeriods(),
    ]).then(([progs, projs, periods]) => {
      setProgrammes(progs)
      setProjects(projs)
      setFiscalPeriods(periods)
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
    
    const result = await actionState.execute(
      dialogMode === 'create' 
        ? create(formData) 
        : update(formData.pm_cashflowentryid!, formData)
    )

    if (result.success) {
      setSuccessMsg(`Entry ${dialogMode === 'create' ? 'created' : 'updated'} successfully`)
      setDialogMode(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setError(result.error)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = await remove(deleteTarget.pm_cashflowentryid!)
    if (result.success) {
      setSuccessMsg('Entry deleted successfully')
      if (selectedEntry?.pm_cashflowentryid === deleteTarget.pm_cashflowentryid) setSelectedEntry(null)
      setDeleteTarget(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setError(result.error || 'Failed to delete entry')
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

      {(error || crudError || actionState.error) && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error || crudError || actionState.error}
        </Alert>
      )}
      {successMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <KpiCardRow items={kpiCards} loading={loading} />

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

      <DetailDrawer
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry?.pm_entryname ?? ''}
        subtitle={selectedEntry && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <StatusTag 
              label={DIRECTION_LABELS[String(selectedEntry.pm_transactiondirection)] || '—'} 
              color={DIRECTION_COLORS[String(selectedEntry.pm_transactiondirection)] || 'default'} 
            />
            <StatusTag label={TXN_TYPE_LABELS[String(selectedEntry.pm_transactiontype)] || '—'} variant="outlined" />
          </Box>
        )}            headerActions={
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {canEdit && (
                  <ActionIcon icon={<EditIcon />} onClick={() => { setFormData(selectedEntry!); setDialogMode('edit') }} label="Edit" color="primary" />
                )}
                {canDelete && (
                  <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedEntry)} label="Delete" color="error" />
                )}
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
        formErrors={{}}
        onFieldChange={(field, val) => setFormData(f => ({ ...f, [field]: val }))}
        loading={actionState.loading}
        programmes={programmes}
        projects={projects}
        fiscalPeriods={fiscalPeriods}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Cashflow Entry"
        message={`Are you sure you want to remove "${deleteTarget?.pm_entryname}"? This action cannot be undone.`}
        confirmLabel="Remove"
        confirmColor="error"
        loading={actionState.loading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
