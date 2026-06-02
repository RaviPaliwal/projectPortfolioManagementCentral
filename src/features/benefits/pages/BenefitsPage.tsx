import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import DescriptionIcon from '@mui/icons-material/Description'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TimelineIcon from '@mui/icons-material/Timeline'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import HistoryIcon from '@mui/icons-material/History'
import {
  fetchBenefits,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  fetchPerformanceMeasures,
  createPerformanceMeasure,
  deletePerformanceMeasure,
} from '@/services'
import type { BenefitModel, PerformanceMeasureModel } from '@/types/dataverse'
import { PageHeader, KpiCardRow, DetailDrawer, TabPanel, ExportButton, StatusTag } from '@/components/common'
import { formatDate, currencyFormatter } from '@/utils/formatters'
import { RAG_COLORS, RAG_LABELS } from '@/constants/mappings'
import {
  BenefitsGrid,
  PerformanceMeasuresTable,
  BenefitFormDialog,
  MeasureFormDialog
} from '../components'
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import type { ExportColumn } from '@/utils/exportUtils'

const benefitExportColumns: ExportColumn[] = [
  { key: 'pm_benefitname', label: 'Benefit Name' },
  { key: 'pm_categoryname', label: 'Category' },
  { key: 'pm_programmename', label: 'Programme' },
  { key: 'pm_projectname', label: 'Project' },
  { key: 'pm_targetvalue', label: 'Target Value', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_actualvalue', label: 'Actual Value', format: (v: any) => v != null ? `€${Number(v).toLocaleString()}` : '' },
  { key: 'pm_realisationstatusname', label: 'Realisation Status' },
  { key: 'pm_targetdate', label: 'Target Date' },
]

export default function BenefitsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [benefits, setBenefits] = useState<BenefitModel[]>([])
  const [measures, setMeasures] = useState<PerformanceMeasureModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Filters (managed here to be passed to grid)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Detail panel state
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<BenefitModel | null>(null)
  const [formData, setFormData] = useState({
    pm_benefitname: '',
    pm_benefitcategory: 0,
    pm_benefitdescription: '',
    pm_benefitstatus: 0,
    pm_benefittype: 0,
    pm_benefitreference: '',
    pm_baselinevalue: 0,
    pm_targetvalue: 0,
    pm_unitofmeasure: '',
    pm_ragstatus: 1,
    pm_realisationstartdate: '',
    pm_realisationenddate: '',
    pm_benifitownername: '',
    pm_projectcode: '',
    pm_programmename: '',
    pm_projectname: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Add measure modal
  const [showMeasureModal, setShowMeasureModal] = useState(false)
  const [measureFormData, setMeasureFormData] = useState({
    pm_measurename: '',
    pm_plannedvalue: 0,
    pm_actualvalue: 0,
    pm_cumulativeplanned: 0,
    pm_cumulativeactual: 0,
    pm_variance: 0,
    pm_reportingperiod: new Date().toISOString().substring(0, 7),
    pm_notes: '',
    pm_evidenced: 0,
  })

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchBenefits()
      setBenefits(list)
    } catch (err) {
      console.error('[BenefitsPage] loadData error:', err)
      setError('Unable to load benefits data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMeasures = useCallback(async (benefitId: string) => {
    try {
      const list = await fetchPerformanceMeasures(benefitId)
      setMeasures(list)
    } catch {
      setMeasures([])
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedBenefit?.pm_benefitid) {
      loadMeasures(selectedBenefit.pm_benefitid)
    } else {
      setMeasures([])
    }
  }, [selectedBenefit, loadMeasures])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo(() => {
    const total = benefits.length
    const realised = benefits.filter((b) => String(b.pm_benefitstatus) === '2').length
    const inProgress = benefits.filter((b) => String(b.pm_benefitstatus) === '1').length
    const onTrack = benefits.filter((b) => String(b.pm_ragstatus) === '1').length
    const atRisk = benefits.filter((b) => String(b.pm_ragstatus) === '2').length
    const totalTarget = benefits.reduce((s, b) => s + (b.pm_targetvalue ?? 0), 0)
    const totalBaseline = benefits.reduce((s, b) => s + (b.pm_baselinevalue ?? 0), 0)
    
    return [
      {
        label: 'Total Benefits',
        value: total,
        icon: <EmojiEventsIcon />,
        color: '#6366f1',
      },
      {
        label: 'Realised',
        value: realised,
        subtitle: realised > 0 ? `${((realised / (total || 1)) * 100).toFixed(0)}% completion` : 'None realised',
        icon: <TaskAltIcon />,
        color: '#22c55e',
      },
      {
        label: 'In Progress',
        value: inProgress,
        icon: <HistoryIcon />,
        color: '#f59e0b',
      },
      {
        label: 'On Track',
        value: onTrack,
        subtitle: onTrack > 0 ? `${((onTrack / (total || 1)) * 100).toFixed(0)}% of total` : 'None tracked',
        icon: <CheckCircleIcon />,
        color: '#22c55e',
      },
      {
        label: 'At Risk',
        value: atRisk,
        subtitle: atRisk > 0 ? `${atRisk} benefit(s) flagged red` : 'No red-flagged benefits',
        icon: <WarningAmberIcon />,
        color: atRisk > 0 ? '#ef4444' : '#64748b',
      },
      {
        label: 'Target Value',
        value: currencyFormatter.format(totalTarget),
        subtitle: `vs ${currencyFormatter.format(totalBaseline)} baseline`,
        icon: <AttachMoneyIcon />,
        color: '#0ea5e9',
      },
    ]
  }, [benefits])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRowClick = useCallback((benefit: BenefitModel) => {
    setSelectedBenefit(benefit)
    setDetailTab(0)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedBenefit(null)
    setDetailTab(0)
    setMeasures([])
  }, [])

  const openCreateForm = useCallback(() => {
    setEditingBenefit(null)
    setFormData({
      pm_benefitname: '',
      pm_benefitcategory: 0,
      pm_benefitdescription: '',
      pm_benefitstatus: 0,
      pm_benefittype: 0,
      pm_benefitreference: '',
      pm_baselinevalue: 0,
      pm_targetvalue: 0,
      pm_unitofmeasure: '',
      pm_ragstatus: 1,
      pm_realisationstartdate: '',
      pm_realisationenddate: '',
      pm_benifitownername: '',
      pm_projectcode: '',
      pm_programmename: '',
      pm_projectname: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((benefit: BenefitModel) => {
    setEditingBenefit(benefit)
    setFormData({
      pm_benefitname: benefit.pm_benefitname ?? '',
      pm_benefitcategory: Number(benefit.pm_benefitcategory) || 0,
      pm_benefitdescription: benefit.pm_benefitdescription ?? '',
      pm_benefitstatus: Number(benefit.pm_benefitstatus) ?? 0,
      pm_benefittype: Number(benefit.pm_benefittype) ?? 0,
      pm_benefitreference: benefit.pm_benefitreference ?? '',
      pm_baselinevalue: benefit.pm_baselinevalue ?? 0,
      pm_targetvalue: benefit.pm_targetvalue ?? 0,
      pm_unitofmeasure: benefit.pm_unitofmeasure ?? '',
      pm_ragstatus: Number(benefit.pm_ragstatus) ?? 1,
      pm_realisationstartdate: benefit.pm_realisationstartdate?.split('T')[0] ?? '',
      pm_realisationenddate: benefit.pm_realisationenddate?.split('T')[0] ?? '',
      pm_benifitownername: benefit.pm_benifitownername ?? '',
      pm_projectcode: benefit.pm_projectcode ?? '',
      pm_programmename: benefit.pm_programmename ?? '',
      pm_projectname: benefit.pm_projectname ?? '',
    })
    setShowFormModal(true)
  }, [])

  const handleSaveBenefit = async () => {
    if (!formData.pm_benefitname.trim()) {
      setError('Benefit name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = { ...formData }
      if (editingBenefit?.pm_benefitid) {
        await updateBenefit(editingBenefit.pm_benefitid, payload)
        setSuccessMsg('Benefit updated successfully.')
      } else {
        await createBenefit(payload)
        setSuccessMsg('Benefit created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingBenefit ? 'Unable to update benefit.' : 'Unable to create benefit.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteBenefit = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteBenefit(deleteConfirm)
      setSuccessMsg('Benefit removed successfully.')
      setDeleteConfirm(null)
      if (selectedBenefit?.pm_benefitid === deleteConfirm) {
        setSelectedBenefit(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete benefit.')
    } finally {
      setActionLoading(false)
    }
  }

  const openAddMeasureForm = useCallback(() => {
    setMeasureFormData({
      pm_measurename: '',
      pm_plannedvalue: 0,
      pm_actualvalue: 0,
      pm_cumulativeplanned: 0,
      pm_cumulativeactual: 0,
      pm_variance: 0,
      pm_reportingperiod: new Date().toISOString().substring(0, 7),
      pm_notes: '',
      pm_evidenced: 0,
    })
    setShowMeasureModal(true)
  }, [])

  const handleSaveMeasure = async () => {
    if (!measureFormData.pm_measurename.trim() || !selectedBenefit?.pm_benefitid) return
    setError(null)
    setActionLoading(true)
    try {
      await createPerformanceMeasure({
        ...measureFormData,
        pm_variance: measureFormData.pm_cumulativeplanned > 0
          ? ((measureFormData.pm_cumulativeactual - measureFormData.pm_cumulativeplanned) / measureFormData.pm_cumulativeplanned) * 100
          : measureFormData.pm_actualvalue - measureFormData.pm_plannedvalue,
        _pm_benefit_value: selectedBenefit.pm_benefitid,
      })
      setSuccessMsg('Performance measure added successfully.')
      setShowMeasureModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      if (selectedBenefit.pm_benefitid) {
        await loadMeasures(selectedBenefit.pm_benefitid)
      }
    } catch {
      setError('Unable to add performance measure.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteMeasure = async (measureId: string) => {
    setActionLoading(true)
    try {
      await deletePerformanceMeasure(measureId)
      setSuccessMsg('Measure removed.')
      setTimeout(() => setSuccessMsg(null), 3000)
      if (selectedBenefit?.pm_benefitid) {
        await loadMeasures(selectedBenefit.pm_benefitid)
      }
    } catch {
      setError('Unable to delete measure.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Benefits Register"
        subtitle="Track and manage benefits realisation with target vs actual value tracking, performance measures per period, and realisation status."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton filename="benefits.csv" columns={benefitExportColumns} data={benefits} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add Benefit
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!loading && (
        <KpiCardRow items={kpiItems} loading={loading} />
      )}

      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <BenefitsGrid
          benefits={benefits}
          loading={loading}
          onRowClick={handleRowClick}
          selectedId={selectedBenefit?.pm_benefitid}
          onCreateClick={openCreateForm}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </Paper>

      <DetailDrawer
        open={!!selectedBenefit}
        onClose={handleCloseDetail}
        icon={<EmojiEventsIcon sx={{ color: '#6366f1', fontSize: 22 }} />}
        title={selectedBenefit?.pm_benefitname ?? ''}
        subtitle={selectedBenefit && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusTag
              label={CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory ?? '')]}
              color={CATEGORY_COLORS[String(selectedBenefit.pm_benefitcategory ?? '')] ?? 'default'}
            />
            <StatusTag
              label={STATUS_LABELS[String(selectedBenefit.pm_benefitstatus ?? '')]}
              color={STATUS_COLORS[String(selectedBenefit.pm_benefitstatus ?? '')] ?? 'default'}
            />
            <StatusTag
              label={RAG_LABELS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_LABELS]}
              color={String(selectedBenefit.pm_ragstatus) === '1' ? 'success' : String(selectedBenefit.pm_ragstatus) === '2' ? 'error' : 'warning'}
              variant="filled"
            />
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => selectedBenefit && openEditForm(selectedBenefit)}>
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => selectedBenefit?.pm_benefitid && setDeleteConfirm(selectedBenefit.pm_benefitid)}>
              <DeleteIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        }
        tabs={[{ label: 'Overview' }, { label: 'Performance Measures' }]}
        tabValue={detailTab}
        onTabChange={(_e, v) => setDetailTab(v)}
      >
        {selectedBenefit && (
          <>
            <TabPanel value={detailTab} index={0} pt={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmojiEventsIcon sx={{ fontSize: 16 }} /> Benefit Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Category</Typography>
                      <Typography variant="body2">{CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory ?? '')] ?? '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Type</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benefittype === 0 ? 'Quantitative' : 'Qualitative'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Unit of Measure</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_unitofmeasure || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Reference</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benefitreference || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Owner</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benifitownername || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Entity</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_projectcode || selectedBenefit.pm_programmename || selectedBenefit.pm_projectname || '—'}</Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrackChangesIcon sx={{ fontSize: 16 }} /> Target & Performance
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #6366f1' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Baseline Value
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {selectedBenefit.pm_baselinevalue != null ? selectedBenefit.pm_baselinevalue.toLocaleString() : '—'}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #22c55e' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Target Value
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {selectedBenefit.pm_targetvalue != null ? selectedBenefit.pm_targetvalue.toLocaleString() : '—'}
                      </Typography>
                    </Paper>
                  </Box>
                  {selectedBenefit.pm_targetvalue != null && selectedBenefit.pm_baselinevalue != null && selectedBenefit.pm_targetvalue > 0 && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.15, bgcolor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                        {Math.round((((selectedBenefit.pm_targetvalue - selectedBenefit.pm_baselinevalue) / selectedBenefit.pm_baselinevalue) * 100) * 10) / 10}% improvement target
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {selectedBenefit.pm_benefitdescription && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DescriptionIcon sx={{ fontSize: 16 }} /> Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedBenefit.pm_benefitdescription}
                    </Typography>
                  </Paper>
                )}

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimelineIcon sx={{ fontSize: 16 }} /> Realisation Schedule
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Start Date</Typography>
                      <Typography variant="body2">{formatDate(selectedBenefit.pm_realisationstartdate)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>End Date</Typography>
                      <Typography variant="body2">{formatDate(selectedBenefit.pm_realisationenddate)}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </TabPanel>

            <TabPanel value={detailTab} index={1} pt={0}>
              <PerformanceMeasuresTable
                measures={measures}
                onAddClick={openAddMeasureForm}
                onDeleteClick={handleDeleteMeasure}
                isDark={isDark}
              />
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      <BenefitFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveBenefit}
        editingBenefit={editingBenefit}
        formData={formData}
        setFormData={setFormData}
        actionLoading={actionLoading}
      />

      <MeasureFormDialog
        open={showMeasureModal}
        onClose={() => setShowMeasureModal(false)}
        onSave={handleSaveMeasure}
        formData={measureFormData}
        setFormData={setMeasureFormData}
        actionLoading={actionLoading}
      />

      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Benefit</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove this benefit? All related performance measures will also be removed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteBenefit} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
