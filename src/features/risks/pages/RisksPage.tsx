import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Alert,
  useTheme,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import GppGoodIcon from '@mui/icons-material/GppGood'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import FlagIcon from '@mui/icons-material/Flag'
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
  RiskHeatmap,
  RiskDistributionCharts,
  RiskTable,
  RiskFormDialog,
  RiskDetailView,
  RiskDeleteDialog,
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
import { ExportButton, Button } from '@/components/common'
import AddIcon from '@mui/icons-material/Add'

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
  const [form, setForm] = useState<Partial<RiskModel>>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

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
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (risk: RiskModel) => {
    setEditingRisk(risk)
    setForm({
      pm_risktitle: risk.pm_risktitle ?? '',
      pm_riskdescription: risk.pm_riskdescription ?? '',
      pm_riskcategory: risk.pm_riskcategory ?? '',
      pm_ragstatus: risk.pm_ragstatus ?? '',
      pm_riskowner: risk.pm_riskowner ?? '',
      pm_riskstatus: risk.pm_riskstatus ?? 1,
      pm_escalated: risk.pm_escalated ?? false,
      pm_identifieddate: risk.pm_identifieddate ?? '',
      pm_targetclosedate: risk.pm_targetclosedate ?? '',
      pm_inherentprobability: risk.pm_inherentprobability ?? '',
      pm_inherentimpact: risk.pm_inherentimpact ?? '',
      pm_residualprobability: risk.pm_residualprobability ?? '',
      pm_residualimpact: risk.pm_residualimpact ?? '',
      pm_responsestrategy: risk.pm_responsestrategy ?? '',
      pm_riskcause: risk.pm_riskcause ?? '',
      pm_riskeffect: risk.pm_riskeffect ?? '',
      pm_riskreference: risk.pm_riskreference ?? '',
      _pm_project_value: risk._pm_project_value ?? '',
      _pm_programmefk_value: risk._pm_programmefk_value ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.pm_risktitle?.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingRisk?.pm_riskid) {
        const updated = await updateRiskFull(editingRisk.pm_riskid, form)
        if (updated) {
          setRisks((prev) => prev.map((r) => (r.pm_riskid === updated.pm_riskid ? updated : r)))
          setSuccessMsg('Risk updated.')
        }
      } else {
        const created = await createRiskFull(form)
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

  // KPIs
  const openRisks = risks.filter((r) => String(r.pm_riskstatus ?? '') === '1')
  const highRisk = risks.filter((r) => {
    const score = riskScore(r.pm_inherentprobability, r.pm_inherentimpact)
    return score >= 8
  })
  const inMitigation = risks.filter((r) => String(r.pm_riskstatus ?? '') === '0')

  return (
    <Box>
      {/* Success / Error alerts */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2, borderRadius: 1.15 }}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 1.15 }}>
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
        items={[
          { label: "Total Risks", value: risks.length, color: "#0ea5e9", icon: <WarningAmberIcon /> },
          { 
            label: "Open Risks", 
            value: openRisks.length, 
            color: "#f59e0b", 
            icon: <GppMaybeIcon />,
            subtitle: openRisks.length > 0 ? `${Math.round((openRisks.length / Math.max(risks.length, 1)) * 100)}% of total` : 'None open'
          },
          { label: "High / Critical", value: highRisk.length, color: "#ef4444", icon: <ArrowUpwardIcon /> },
          { label: "In Mitigation", value: inMitigation.length, color: "#22c55e", icon: <GppGoodIcon /> },
        ]}
        loading={loading}
      />

      {/* Heatmap & Charts Section */}
       <RiskDistributionCharts risks={risks} />
      <Box sx={{ mb: 3 }}>
        <RiskHeatmap risks={risks} />
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
              px: 1, py: 0.25, borderRadius: 1.15, fontSize: '0.75rem', fontWeight: 600,
              bgcolor: `${RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? '#94a3b8'}20`,
              color: RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? '#94a3b8'
            }}>
              {RISK_CATEGORY_LABELS[String(selectedRisk.pm_riskcategory ?? '')] ?? '—'}
            </Box>
            <Box component="span" sx={{
              px: 1, py: 0.25, borderRadius: 1.15, fontSize: '0.75rem', fontWeight: 600,
              border: '1px solid',
              borderColor: RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'error' ? 'error.main' : RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'warning' ? 'warning.main' : 'success.main',
              color: RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'error' ? 'error.main' : RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'warning' ? 'warning.main' : 'success.main',
            }}>
              {RAG_LABELS[String(selectedRisk.pm_ragstatus ?? '')] ?? '—'}
            </Box>
            {selectedRisk.pm_escalated && (
              <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1.15, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          />
        )}
      </DetailDrawer>

      {/* Create / Edit Dialog */}
      <RiskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingRisk={editingRisk}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete Confirmation */}
      <RiskDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        target={deleteTarget}
      />
    </Box>
  )
}
