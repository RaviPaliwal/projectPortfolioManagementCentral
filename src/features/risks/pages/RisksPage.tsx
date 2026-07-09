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
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchAllRisks,
  fetchRisksForSystemUser,
  createRiskFull,
  updateRiskFull,
  deleteRisk,
  fetchMitigationActions,
} from '@/services'
import { unwrapSingle } from '@/services/common'
import { Pm_projectsService, Pm_programmesService, Pm_portfoliosService } from '@/generated'
import type { RiskModel, RiskMitigationActionModel } from '@/types/dataverse'
import { PageHeader, Breadcrumbs, KpiCardRow } from '@/components/common'
import type { KpiCardItem } from '@/components/common'
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
import { useUser } from '@/context/UserContext'

export default function RisksPage() {
  const theme = useTheme()
  const { currentUser, currentUserPersona } = useUser()

  const { allowed: canCreate } = useAuthorization('RISKS', 'create')
  const { allowed: canEdit } = useAuthorization('RISKS', 'update')
  const { allowed: canDelete } = useAuthorization('RISKS', 'delete')

  // ── State ─────────────────────────────────────────────────────────────────
  const [risks, setRisks] = useState<RiskModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters (passed to RiskTable which uses useDataGrid)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [ragFilter, setRagFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Detail View
  const [selectedRisk, setSelectedRisk] = useState<RiskModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<RiskModel | null>(null)
  const [saving, setSaving] = useState(false)

  // Mitigation Action dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionTargetRisk, setActionTargetRisk] = useState<RiskModel | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RiskModel | null>(null)
  const [escalateConfirmOpen, setEscalateConfirmOpen] = useState(false)
  const [notifiedRole, setNotifiedRole] = useState<string>('Project Manager')
  const [notifiedPersonName, setNotifiedPersonName] = useState<string>('')
  const [notifiedEntityName, setNotifiedEntityName] = useState<string>('')

  useEffect(() => {
    if (escalateConfirmOpen && selectedRisk?._pm_regardingid_value && selectedRisk.pm_regardingidtype) {
      const type = selectedRisk.pm_regardingidtype
      const id = selectedRisk._pm_regardingid_value

      setNotifiedEntityName(selectedRisk.pm_projectname || '')

      if (type === 'pm_projects') {
        setNotifiedRole('Project Manager')
        setNotifiedPersonName('')
        Pm_projectsService.get(id, {
          select: ['pm_projectid', 'pm_projectname', 'pm_projectmanagername']
        }).then(res => {
          if (res.success && res.data) {
            const proj = unwrapSingle<any>(res)
            setNotifiedPersonName(proj?.pm_projectmanagername || 'the Project Manager')
            if (proj?.pm_projectname) setNotifiedEntityName(proj.pm_projectname)
          } else {
            setNotifiedPersonName('the Project Manager')
          }
        }).catch(() => {
          setNotifiedPersonName('the Project Manager')
        })
      } else if (type === 'pm_programmes') {
        setNotifiedRole('Programme Manager')
        setNotifiedPersonName('')
        Pm_programmesService.get(id, {
          select: ['pm_programmeid', 'pm_programmename', 'pm_programmemanagername']
        }).then(res => {
          if (res.success && res.data) {
            const prog = unwrapSingle<any>(res)
            setNotifiedPersonName(prog?.pm_programmemanagername || 'the Programme Manager')
            if (prog?.pm_programmename) setNotifiedEntityName(prog.pm_programmename)
          } else {
            setNotifiedPersonName('the Programme Manager')
          }
        }).catch(() => {
          setNotifiedPersonName('the Programme Manager')
        })
      } else if (type === 'pm_portfolios') {
        setNotifiedRole('Portfolio Owner')
        setNotifiedPersonName('')
        Pm_portfoliosService.get(id, {
          select: ['pm_portfolioid', 'pm_portfolioname', '_pm_ownerlookup_value']
        }).then(res => {
          if (res.success && res.data) {
            const port = unwrapSingle<any>(res)
            const ownerName = port.pm_ownerlookupname || port['_pm_ownerlookup_value@OData.Community.Display.V1.FormattedValue'] || 'the Portfolio Owner'
            setNotifiedPersonName(ownerName)
            if (port?.pm_portfolioname) setNotifiedEntityName(port.pm_portfolioname)
          } else {
            setNotifiedPersonName('the Portfolio Owner')
          }
        }).catch(() => {
          setNotifiedPersonName('the Portfolio Owner')
        })
      }
    } else {
      setNotifiedRole('Project Manager')
      setNotifiedPersonName('')
      setNotifiedEntityName('')
    }
  }, [escalateConfirmOpen, selectedRisk])

  // Mitigation actions
  const [mitigationActions, setMitigationActions] = useState<RiskMitigationActionModel[]>([])
  const [mitigationLoading, setMitigationLoading] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadRisks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const isTeamMember = currentUserPersona === 'TeamMember'
      const data = isTeamMember && currentUser?.systemuserid
        ? await fetchRisksForSystemUser(currentUser.systemuserid)
        : await fetchAllRisks()
      setRisks(data || [])
    } catch (err) {
      setError('Unable to load risks.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, currentUserPersona])

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
          setDetailTab(0)
        }
      }
    }
  }, [loading, risks])

  // ── Fetch mitigation actions when selectedRisk changes ──────────────────────
  useEffect(() => {
    if (selectedRisk?.pm_riskid) {
      setMitigationLoading(true)
      fetchMitigationActions(selectedRisk.pm_riskid)
        .then((actions) => setMitigationActions(actions))
        .catch(() => setMitigationActions([]))
        .finally(() => setMitigationLoading(false))
    } else {
      setMitigationActions([])
    }
  }, [selectedRisk?.pm_riskid])

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
        } else {
          throw new Error('Update returned empty response')
        }
      } else {
        const created = await createRiskFull(data)
        if (created) {
          setRisks((prev) => [...prev, created])
          setSuccessMsg('Risk created.')
        } else {
          throw new Error('Create returned empty response')
        }
      }
      setDialogOpen(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Unable to save risk.')
    } finally {
      setSaving(false)
    }
  }

  const handleEscalateToggle = async () => {
    if (!selectedRisk?.pm_riskid) return
    setError(null)
    setSaving(true)
    const newStatus = !selectedRisk.pm_escalated
    try {
      const updated = await updateRiskFull(selectedRisk.pm_riskid, {
        pm_escalated: newStatus
      })
      if (updated) {
        setSuccessMsg(newStatus ? 'Risk escalated successfully.' : 'Risk de-escalated successfully.')
        setSelectedRisk(updated)
        setRisks(prev => prev.map(r => r.pm_riskid === selectedRisk.pm_riskid ? updated : r))
        setEscalateConfirmOpen(false)
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update escalation status.')
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
        setSelectedRisk(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete risk.')
    }
  }

  const handleSaveAction = async (data: Record<string, any>) => {
    const targetRisk = actionTargetRisk || selectedRisk
    if (!targetRisk?.pm_riskid) return
    setError(null)
    try {
      const { Pm_riskmitigationactionsService } = await import('@/generated')
      const payload: Record<string, any> = {
        pm_actiontitle: data.pm_actiontitle,
        pm_actiondescription: data.pm_actiondescription,
        pm_notes: data.pm_notes,
        pm_status: Number(data.pm_actionstatus),
        'pm_risk@odata.bind': `/pm_risks(${targetRisk.pm_riskid})`,
      }
      if (data.pm_duedate) {
        payload.pm_duedate = data.pm_duedate
      }
      if (data.ownerid) {
        payload['ownerid@odata.bind'] = `/systemusers(${data.ownerid})`
      }
      await Pm_riskmitigationactionsService.create(payload as any)
      setSuccessMsg('Action saved.')
      setActionDialogOpen(false)
      setActionTargetRisk(null)
      // Reload actions if we are currently looking at the same selected risk detail drawer
      if (selectedRisk && selectedRisk.pm_riskid === targetRisk.pm_riskid) {
        setMitigationLoading(true)
        fetchMitigationActions(selectedRisk.pm_riskid)
          .then((actions) => setMitigationActions(actions))
          .catch(() => setMitigationActions([]))
          .finally(() => setMitigationLoading(false))
      }
    } catch (err) {
      setError('Unable to save mitigation action.')
    }
  }

  // KPIs
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = risks.length
    const open = risks.filter((r) => String(r.pm_riskstatus ?? '') === '1').length
    const mitigation = risks.filter((r) => String(r.pm_riskstatus ?? '') === '0').length
    const high = risks.filter((r) => {
      const score = riskScore(r.pm_inherentprobability, r.pm_inherentimpact)
      return score >= 8
    }).length
    const escalated = risks.filter((r) => r.pm_escalated).length
    const closed = risks.filter((r) => String(r.pm_riskstatus ?? '') === '2' || String(r.pm_riskstatus ?? '') === 'Inactive').length

    return [
      { label: 'Total Risks', value: total, color: 'primary.main', icon: <WarningAmberIcon /> },
      {
        label: 'Open Risks',
        value: open,
        color: 'warning.main',
        icon: <GppMaybeIcon />,
        subtitle: total > 0 ? `${Math.round((open / total) * 100)}% of total` : 'None open'
      },
      { label: 'High / Critical', value: high, color: 'error.main', icon: <ArrowUpwardIcon /> },
      { label: 'In Mitigation', value: mitigation, color: 'success.main', icon: <GppGoodIcon /> },
      { label: 'Escalated', value: escalated, color: 'error.main', icon: <ArrowCircleUpIcon />, subtitle: 'Active escalations' },
      { label: 'Closed', value: closed, color: 'text.secondary', icon: <CheckCircleIcon />, subtitle: 'Resolved/Inactive' },
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

      {selectedRisk ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Breadcrumbs
            items={[
              { label: 'Risk Matrix', path: 'list' },
              { label: selectedRisk.pm_risktitle ?? 'Detail' }
            ]}
            onNavigate={() => setSelectedRisk(null)}
          />
          <PageHeader
            title={selectedRisk?.pm_risktitle ?? 'Risk Detail'}
            subtitle={
              selectedRisk?.pm_escalated ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
                  <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FlagIcon sx={{ fontSize: 12 }} /> Escalated
                  </Box>
                </Box>
              ) : undefined
            }
            actionElement={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {canEdit && (
                  <>
                    <Button
                      variant="outlined"
                      color={selectedRisk.pm_escalated ? "warning" : "error"}
                      startIcon={<FlagIcon />}
                      onClick={() => setEscalateConfirmOpen(true)}
                      sx={{ borderRadius: 1.5 }}
                    >
                      {selectedRisk.pm_escalated ? 'De-escalate Risk' : 'Escalate Risk'}
                    </Button>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => selectedRisk && openEdit(selectedRisk)} sx={{ borderRadius: 1.5 }}>
                      Edit Risk
                    </Button>
                  </>
                )}
                {canDelete && (
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedRisk)} sx={{ borderRadius: 1.5 }}>
                    Delete Risk
                  </Button>
                )}
              </Box>
            }
          />
          
          <RiskDetailView
            selectedRisk={selectedRisk}
            drawerTab={detailTab}
            mitigationActions={mitigationActions}
            mitigationLoading={mitigationLoading}
            onAddActionClick={() => setActionDialogOpen(true)}
          />
        </Box>
      ) : (
        <>
          <PageHeader
            title="Risk Matrix"
            subtitle="Identify, assess, and manage project risks with probability/impact scoring"
            actionElement={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ExportButton data={risks} columns={riskExportColumns} filename="risks" />
                {canCreate && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Add Risk
                  </Button>
                )}
              </Box>
            }
          />

          {/* KPI Cards using KpiCardRow */}
          <KpiCardRow
            items={kpiItems}
            loading={loading}
          />

          {/* Heatmap & Charts Section */}
          {currentUserPersona !== 'TeamMember' && (
            <>
              <RiskDistributionCharts risks={risks} />
              <Box sx={{ mb: 3 }}>
                <Suspense fallback={<Box sx={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading heatmap…</Box>}>
                  <RiskHeatmap risks={risks} />
                </Suspense>
              </Box>
            </>
          )}


          {/* Search, Filter & Table */}
          <RiskTable
            risks={risks}
            loading={loading}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onSelect={(risk) => { setSelectedRisk(risk); setDetailTab(0) }}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            ragFilter={ragFilter}
            setRagFilter={setRagFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            openCreate={openCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            onAddMitigationAction={(risk) => {
              setActionTargetRisk(risk)
              setActionDialogOpen(true)
            }}
          />
        </>
      )}

      {/* Create / Edit Dialog */}
      <RiskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editingRisk}
        onSave={handleSave}
      />

      <MitigationActionDialog
        open={actionDialogOpen}
        onClose={() => {
          setActionDialogOpen(false)
          setActionTargetRisk(null)
        }}
        onSave={handleSaveAction}
        projectId={actionTargetRisk?._pm_project_value || selectedRisk?._pm_project_value}
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

      {/* Escalate Confirmation */}
      <ConfirmDialog
        open={escalateConfirmOpen}
        title={selectedRisk?.pm_escalated ? "De-escalate Risk" : "Escalate Risk"}
        message={selectedRisk?.pm_escalated 
          ? `Are you sure you want to de-escalate the risk "${selectedRisk?.pm_risktitle}"?` 
          : `Are you sure you want to escalate the risk "${selectedRisk?.pm_risktitle}"? This will send a Microsoft Teams notification to the ${notifiedRole} (${notifiedPersonName || 'Loading...'}) of the ${selectedRisk?.pm_regardingidtype === 'pm_programmes' ? 'programme' : selectedRisk?.pm_regardingidtype === 'pm_portfolios' ? 'portfolio' : 'project'} "${notifiedEntityName || 'Loading...'}"`
        }
        confirmLabel={selectedRisk?.pm_escalated ? "De-escalate" : "Escalate"}
        confirmColor={selectedRisk?.pm_escalated ? "warning" : "error"}
        onClose={() => setEscalateConfirmOpen(false)}
        onConfirm={handleEscalateToggle}
      />
    </Box>
  )
}
