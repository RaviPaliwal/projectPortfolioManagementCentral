import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Alert,
  useTheme,
  Button,
  Paper,
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

import { useAuthorization } from '@/hooks/useAuthorization'
import { Pm_performancemeasuresService } from '@/generated'
import {
  fetchBenefits,
  createBenefitFull,
  updateBenefitFull,
  deleteBenefit,
  createPerformanceMeasure,
} from '@/services'
import type { BenefitModel, PerformanceMeasureModel } from '@/types/dataverse'
import { 
  PageHeader, 
  KpiCardRow, 
  DetailDrawer, 
  TabPanel, 
  StatusTag, 
  ActionIcon,
  ConfirmDialog
} from '@/components/common'
import { fontSizes } from '@/styles/fontSizes'
import { currencyFormatter } from '@/utils/formatters'
import {
  BenefitsGrid,
  PerformanceMeasuresTable,
  BenefitDialog,
  MeasureDialog
} from '../components'
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import { useDataverseAsync } from '@/hooks/useDataverseAsync'

const TYPE_LABELS: Record<string, string> = {
  '0': 'Cashable',
  '1': 'Non Cashable',
  '2': 'Avoided Cost',
}

export default function BenefitsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('BENEFITS', 'create')
  const { allowed: canEdit } = useAuthorization('BENEFITS', 'update')
  const { allowed: canDelete } = useAuthorization('BENEFITS', 'delete')

  const [benefits, setBenefits] = useState<BenefitModel[]>([])
  const [loading, setLoading] = useState(true)
  const [crudError, setCrudError] = useState<string | null>(null)

  // Specialized async states
  const measuresState = useDataverseAsync<PerformanceMeasureModel[]>()
  const actionState = useDataverseAsync<any>()
  
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Detail panel state
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitModel | null>(null)

  // Form states
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<BenefitModel | null>(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Measure modal
  const [showMeasureModal, setShowMeasureModal] = useState(false)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadBenefits = useCallback(async () => {
    setLoading(true)
    setCrudError(null)
    try {
      const data = await fetchBenefits()
      setBenefits(data || [])
    } catch (err) {
      console.error('[BenefitsPage] load error:', err)
      setCrudError('Unable to load benefits.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBenefits()
  }, [loadBenefits])

  const loadMeasures = useCallback(async (benefitId: string) => {
    measuresState.execute(Pm_performancemeasuresService.getAll({ 
      filter: `_pm_benefit_value eq '${benefitId}'`,
      top: 50 
    }))
  }, [measuresState.execute])

  useEffect(() => {
    if (selectedBenefit?.pm_benefitid) {
      loadMeasures(selectedBenefit.pm_benefitid)
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
      { label: 'Total Benefits', value: total, icon: <EmojiEventsIcon />, color: 'primary.main' },
      { 
        label: 'Realised', value: realised, icon: <TaskAltIcon />, color: 'success.main',
        subtitle: realised > 0 ? `${((realised / (total || 1)) * 100).toFixed(0)}% completion` : 'None realised'
      },
      { label: 'In Progress', value: inProgress, icon: <HistoryIcon />, color: 'warning.main' },
      { label: 'On Track', value: onTrack, icon: <CheckCircleIcon />, color: 'success.main' },
      { 
        label: 'At Risk', value: atRisk, icon: <WarningAmberIcon />, color: atRisk > 0 ? 'error.main' : 'text.secondary',
        subtitle: atRisk > 0 ? `${atRisk} benefit(s) flagged red` : 'No red-flagged benefits'
      },
      { 
        label: 'Target Value', value: currencyFormatter.format(totalTarget), icon: <AttachMoneyIcon />, color: 'primary.main',
        subtitle: `vs ${currencyFormatter.format(totalBaseline)} baseline`
      },
    ]
  }, [benefits])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveBenefit = async (data: Record<string, any>) => {
    try {
      if (editingBenefit?.pm_benefitid) {
        const updated = await updateBenefitFull(editingBenefit.pm_benefitid, data)
        if (updated) {
          setBenefits((prev) => prev.map((b) => (b.pm_benefitid === updated.pm_benefitid ? updated : b)))
          setSuccessMsg('Benefit updated successfully.')
        }
      } else {
        const created = await createBenefitFull(data)
        if (created) {
          setBenefits((prev) => [...prev, created])
          setSuccessMsg('Benefit created successfully.')
        }
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Unable to save benefit.')
    }
  }

  const handleDeleteBenefit = async () => {
    if (!deleteConfirm) return
    try {
      await deleteBenefit(deleteConfirm)
      setBenefits((prev) => prev.filter((b) => b.pm_benefitid !== deleteConfirm))
      setSuccessMsg('Benefit removed successfully.')
      if (selectedBenefit?.pm_benefitid === deleteConfirm) setSelectedBenefit(null)
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Unable to delete benefit.')
    }
  }

  const handleSaveMeasure = async (data: Record<string, any>) => {
    if (!selectedBenefit?.pm_benefitid) return
    
    try {
      // Add variance calculation
      const payload = {
        ...data,
        pm_variance: data.pm_cumulativeplanned > 0
          ? ((data.pm_cumulativeactual - data.pm_cumulativeplanned) / data.pm_cumulativeplanned) * 100
          : (data.pm_actualvalue || 0) - (data.pm_plannedvalue || 0),
        _pm_benefit_value: selectedBenefit.pm_benefitid,
      }
      
      const created = await createPerformanceMeasure(payload)
      if (created) {
        setSuccessMsg('Performance measure added successfully.')
        setShowMeasureModal(false)
        loadMeasures(selectedBenefit.pm_benefitid)
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setError('Failed to create performance measure. Please check the form data and try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Unable to save performance measure.')
    }
  }

  const handleDeleteMeasure = async (measureId: string) => {
    const result = await actionState.execute(Pm_performancemeasuresService.delete(measureId) as any)
    if (result.success) {
      setSuccessMsg('Measure removed.')
      if (selectedBenefit?.pm_benefitid) loadMeasures(selectedBenefit.pm_benefitid)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setError(result.error)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Benefits Register"
        subtitle="Track and manage benefits realisation with target vs actual value tracking."
        actionElement={
          canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingBenefit(null); setShowFormModal(true); }}>
              Add Benefit
            </Button>
          )
        }
      />

      {(error || crudError || actionState.error) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error || crudError || actionState.error}
        </Alert>
      )}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <KpiCardRow items={kpiItems} loading={loading} />

      <BenefitsGrid
        benefits={benefits}
        loading={loading}
        onRowClick={setSelectedBenefit}
        selectedId={selectedBenefit?.pm_benefitid}
        onCreateClick={() => { setEditingBenefit(null); setShowFormModal(true); }}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <DetailDrawer
        open={!!selectedBenefit}
        onClose={() => setSelectedBenefit(null)}
        icon={<EmojiEventsIcon sx={{ color: 'primary.main', fontSize: fontSizes.xl }} />}
        title={selectedBenefit?.pm_benefitname ?? ''}
        subtitle={selectedBenefit && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusTag label={CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)]} color={CATEGORY_COLORS[String(selectedBenefit.pm_benefitcategory)]} />
            <StatusTag label={STATUS_LABELS[String(selectedBenefit.pm_benefitstatus)]} color={STATUS_COLORS[String(selectedBenefit.pm_benefitstatus)]} />
          </Box>
        )}            headerActions={
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {canEdit && (
                  <ActionIcon icon={<EditIcon />} onClick={() => { setEditingBenefit(selectedBenefit); setShowFormModal(true); }} label="Edit" />
                )}
                {canDelete && (
                  <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteConfirm(selectedBenefit?.pm_benefitid!)} label="Delete" color="error" />
                )}
              </Box>
            }
      >
        {selectedBenefit && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                Benefit Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Category</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)] || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {TYPE_LABELS[String(selectedBenefit.pm_benefittype)] || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Owner</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedBenefit.pm_benifitownername || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Reference / ID</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {selectedBenefit.pm_benefitreference || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Baseline Value</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedBenefit.pm_baselinevalue !== undefined ? `${selectedBenefit.pm_baselinevalue.toLocaleString()} ${selectedBenefit.pm_unitofmeasure || ''}` : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Target Value</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedBenefit.pm_targetvalue !== undefined ? `${selectedBenefit.pm_targetvalue.toLocaleString()} ${selectedBenefit.pm_unitofmeasure || ''}` : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Realisation Start Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedBenefit.pm_realisationstartdate ? new Date(selectedBenefit.pm_realisationstartdate).toLocaleDateString() : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Realisation End Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedBenefit.pm_realisationenddate ? new Date(selectedBenefit.pm_realisationenddate).toLocaleDateString() : '—'}
                  </Typography>
                </Box>
                {selectedBenefit.pm_benefitdescription && (
                  <Box sx={{ gridColumn: 'span 2', mt: 1, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Benefit Description</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                      {selectedBenefit.pm_benefitdescription}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            <PerformanceMeasuresTable
              measures={measuresState.data || []}
              loading={measuresState.loading}
              onAddClick={() => { setShowMeasureModal(true); }}
              onDeleteClick={handleDeleteMeasure}
              isDark={isDark}
              canCreate={canEdit}
              canDelete={canDelete}
            />
          </Box>
        )}
      </DetailDrawer>

      <BenefitDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveBenefit}
        initialData={editingBenefit}
      />

      <MeasureDialog
        open={showMeasureModal}
        onClose={() => setShowMeasureModal(false)}
        onSave={handleSaveMeasure}
        benefitName={selectedBenefit?.pm_benefitname}
        existingMeasures={measuresState.data || []}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Remove Benefit"
        message="Are you sure you want to remove this benefit? All related performance measures will also be removed."
        confirmLabel="Remove"
        confirmColor="error"
        loading={actionState.loading}
        onConfirm={handleDeleteBenefit}
        onClose={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}
