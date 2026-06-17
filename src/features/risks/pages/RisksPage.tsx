import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react'
import {
  Box,
  Alert,
  useTheme,
} from '@mui/material'

const RiskHeatmap = lazy(() => import('../components/RiskHeatmap').then(m => ({ default: m.RiskHeatmap })))
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import GppGoodIcon from '@mui/icons-material/GppGood'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FlagIcon from '@mui/icons-material/Flag'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import HistoryIcon from '@mui/icons-material/History'
import {
  fetchAllRisks,
  createRiskFull,
  updateRiskFull,
  deleteRisk,
  fetchMitigationActions,
} from '@/services'
import type { RiskModel, RiskMitigationActionModel } from '@/types/dataverse'
import { PageHeader, DetailDrawer, KpiCardRow } from '@/components/common'
import {
  RiskDistributionCharts,
  RiskTable,
  RiskDialog,
  MitigationActionDialog,
  RiskDetailView,
} from '../components'
import {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  RAG_LABELS,
  RAG_COLORS,
  RISK_STATUS_LABELS,
  RISK_STATUS_COLORS,
  riskScore,
  riskExportColumns,
  emptyForm,
} from '../constants'
import { ExportButton, Button, ConfirmDialog } from '@/components/common'
import AddIcon from '@mui/icons-material/Add'
import { normalizeLookupId } from '@/services'

export default function RisksPage() {
  const theme = useTheme()

  // ── State ─────────────────────────────────────────────────────────────────
  const [risks, setRisks] = useState<RiskModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters (passed to RiskTable which uses useDataGrid)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [ragFilter, setRagFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Drawer
  const [selectedRisk, setSelectedRisk] = useState<RiskModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<RiskModel | null>(null)
  const [saving, setSaving] = useState(false)

  // Mitigation Action dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RiskModel | null>(null)

  // Mitigation actions
  const [mitigationActions, setMitigationActions] = useState<RiskMitigationActionModel[]>([])
  const [mitigationLoading, setMitigationLoading] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadRisks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllRisks()
      setRisks(data || [])
    } catch (err) {
      console.error('[RisksPage] loadRisks error:', err)
      setError('Unable to load risks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRisks()
  }, [loadRisks])

  // Auto-navigate to preselected risk from cross-linking
  useEffect(() => {
    if (!loading && risks.length > 0) {
      const preselectedId = sessionStorage.getItem('preselectRiskId')
      if (preselectedId) {
        sessionStorage.removeItem('preselectRiskId')
        const risk = risks.find(r => normalizeLookupId(r.pm_riskid) === normalizeLookupId(preselectedId))
        if (risk) {
          setSelectedRisk(risk)
          setDrawerOpen(true)
          setDrawerTab(0)
        }
      }
    }
  }, [loading, risks])

  // ── Fetch mitigation actions when drawer tab changes ────────────────────────
  useEffect(() => {
    if (selectedRisk?.pm_riskid && drawerTab === 1) {
      setMitigationLoading(true)
      fetchMitigationActions(selectedRisk.pm_riskid)
        .then((actions) => setMitigationActions(actions))
        .catch(() => setMitigationActions([]))
        .finally(() => setMitigationLoading(false))
    } else if (drawerTab !== 1) {
      setMitigationActions([])
    }
  }, [selectedRisk?.pm_riskid, drawerTab])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingRisk(null)
    setDialogOpen(true)
  }

  const openEdit = (risk: RiskModel) => {
    setEditingRisk(risk)
    setDialogOpen(true)
  }

  const handleSave = async (data: Record<string, any>) => {
    if (!data.pm_risktitle?.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingRisk?.pm_riskid) {
        const updated = await updateRiskFull(editingRisk.pm_riskid, data)
        if (updated) {
          setRisks((prev) => prev.map((r) => (r.pm_riskid === updated.pm_riskid ? updated : r)))
          setSuccessMsg('Risk updated.')
        }
      } else {
        const created = await createRiskFull(data)
        if (created) {
          setRisks((prev) => [...prev, created])
          setSuccessMsg('Risk created.')
        }
      }
      setDialogOpen(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to save risk.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_riskid) return
    setError(null)
    try {
      await deleteRisk(deleteTarget.pm_riskid)
      setRisks((prev) => prev.filter((r) => r.pm_riskid !== deleteTarget.pm_riskid))
      setSuccessMsg('Risk deleted.')
      setDeleteTarget(null)
      if (selectedRisk?.pm_riskid === deleteTarget.pm_riskid) {
        setDrawerOpen(false)
        setSelectedRisk(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete risk.')
    }
  }

  const handleSaveAction = async (data: Record<string, any>) => {
    if (!selectedRisk?.pm_riskid) return
    setError(null)
    try {
      const { Pm_riskmitigationactionsService } = await import('@/generated')
      const payload = {
        ...data,
        pm_status: Number(data.pm_actionstatus),
        _pm_risk_value: selectedRisk.pm_riskid,
      }
      await Pm_riskmitigationactionsService.create(payload as any)
      setSuccessMsg('Action saved.')
      setActionDialogOpen(false)
      // Reload actions
      setMitigationLoading(true)
      fetchMitigationActions(selectedRisk.pm_riskid)
        .then((actions) => setMitigationActions(actions))
        .catch(() => setMitigationActions([]))
        .finally(() => setMitigationLoading(false))
    } catch {
      setError('Unable to save mitigation action.')
    }
  }

  // KPIs
  const kpiItems = useMemo(() => {
    const total = risks.length
    const open = risks.filter((r) => String(r.pm_riskstatus ?? '') === '1').length
    const mitigation = risks.filter((r) => String(r.pm_riskstatus ?? '') === '0').length
    const high = risks.filter((r) => {
      const score = riskScore(r.pm_inherentprobability, r.pm_inherentimpact)
      return score >= 8
    }).length
    const escalated = risks.filter((r) => r.pm_escalated).length
    const closed = risks.filter((r) => String(r.pm_riskstatus ?? '') === '2' || String(r.pm_riskstatus ?? '') === 'Inactive').length // Assuming 2 or Inactive as closed

    return [
      { label: "Total Risks", value: total, color: "'primary.main'", icon: <WarningAmberIcon /> },
      { 
        label: "Open Risks", 
        value: open, 
        color: "'warning.main'", 
        icon: <GppMaybeIcon />,
        subtitle: total > 0 ? `${Math.round((open / total) * 100)}% of total` : 'None open'
      },
      { label: "High / Critical", value: high, color: "'error.main'", icon: <ArrowUpwardIcon /> },
      { label: "In Mitigation", value: mitigation, color: "'success.main'", icon: <GppGoodIcon /> },
      { label: "Escalated", value: escalated, color: "'error.main'", icon: <ArrowCircleUpIcon />, subtitle: 'Active escalations' },
      { label: "Closed", value: closed, color: "#64748b", icon: <CheckCircleIcon />, subtitle: 'Resolved/Inactive' },
    ]
  }, [risks])

  return (
    <Box>
      {/* Success / Error alerts */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2, borderRadius: 1.5 }}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 1.5 }}>
          {error}
        </Alert>
      )}

      <PageHeader
        title="Risk Matrix"
        subtitle="Identify, assess, and manage project risks with probability/impact scoring"
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={risks} columns={riskExportColumns} filename="risks" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Risk
            </Button>
          </Box>
        }
      />

      {/* KPI Cards using KpiCardRow */}
      <KpiCardRow
        items={kpiItems}
        loading={loading}
      />

      {/* Heatmap & Charts Section */}
       <RiskDistributionCharts risks={risks} />
      <Box sx={{ mb: 3 }}>
        <Suspense fallback={<Box sx={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading heatmap…</Box>}>
          <RiskHeatmap risks={risks} />
        </Suspense>
      </Box>


      {/* Search, Filter & Table */}
      <RiskTable
        risks={risks}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onSelect={(risk) => { setSelectedRisk(risk); setDrawerOpen(true); setDrawerTab(0) }}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        ragFilter={ragFilter}
        setRagFilter={setRagFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        openCreate={openCreate}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedRisk(null) }}
        title={selectedRisk?.pm_risktitle ?? ''}
        subtitle={selectedRisk && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box component="span" sx={{
              px: 1, py: 0.25, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600,
              bgcolor: `${RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? 'text.disabled'}20`,
              color: RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? 'text.disabled'
            }}>
              {RISK_CATEGORY_LABELS[String(selectedRisk.pm_riskcategory ?? '')] ?? '—'}
            </Box>
            <Box component="span" sx={{
              px: 1, py: 0.25, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600,
              border: '1px solid',
              borderColor: RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'error' ? 'error.main' : RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'warning' ? 'warning.main' : 'success.main',
              color: RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'error' ? 'error.main' : RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'warning' ? 'warning.main' : 'success.main',
            }}>
              {RAG_LABELS[String(selectedRisk.pm_ragstatus ?? '')] ?? '—'}
            </Box>
            {selectedRisk.pm_escalated && (
              <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FlagIcon sx={{ fontSize: 12 }} /> Escalated
              </Box>
            )}
          </Box>
        )}
        tabs={[{ label: 'Overview' }, { label: 'Mitigation' }]}
        tabValue={drawerTab}
        onTabChange={setDrawerTab}
      >
        {selectedRisk && (
          <RiskDetailView
            selectedRisk={selectedRisk}
            drawerTab={drawerTab}
            mitigationActions={mitigationActions}
            mitigationLoading={mitigationLoading}
            onAddActionClick={() => setActionDialogOpen(true)}
          />
        )}
      </DetailDrawer>

      {/* Create / Edit Dialog */}
      <RiskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editingRisk}
        onSave={handleSave}
      />

      <MitigationActionDialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        onSave={handleSaveAction}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Risk"
        message={`Are you sure you want to delete ${deleteTarget?.pm_risktitle}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Box>
  )
}
