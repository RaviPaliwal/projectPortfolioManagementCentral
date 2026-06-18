import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Alert,
  useTheme,
  Button,
  Paper,
  Grid,
  Divider,
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
import type { CrudModule } from '@/constants/permissions'
import {
  Pm_benefitsService,
  Pm_performancemeasuresService
} from '@/generated'
import type { BenefitModel, PerformanceMeasureModel } from '@/types/dataverse'
import {
  PageHeader,
  KpiCardRow,
  StatusTag,
  ActionIcon,
  ConfirmDialog,
  Breadcrumbs
} from '@/components/common'
import { fontSizes } from '@/styles/fontSizes'
import { formatDate, currencyFormatter, numberFormatter } from '@/utils/formatters'
import { RAG_LABELS, RAG_COLORS } from '@/constants/mappings'
import {
  BenefitsGrid,
  PerformanceMeasuresTable,
  BenefitDialog,
  MeasureDialog
} from '../components'
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import { useDataverseCrud } from '@/hooks/useDataverseCrud'
import { useDataverseAsync } from '@/hooks/useDataverseAsync'
import { parseDataverseError } from '@/services/common'

export default function BenefitsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('BENEFITS', 'create')
  const { allowed: canEdit } = useAuthorization('BENEFITS', 'update')
  const { allowed: canDelete } = useAuthorization('BENEFITS', 'delete')

  // Standardized CRUD Hook
  const {
    items: benefits,
    loading,
    error: crudError,
    fetchAll,
    create,
    update,
    remove,
  } = useDataverseCrud<BenefitModel>(Pm_benefitsService)

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

  const handleSelectBenefit = (benefit: BenefitModel) => {
    setSelectedBenefit(benefit)
  }

  // Form states
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<BenefitModel | null>(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Measure modal
  const [showMeasureModal, setShowMeasureModal] = useState(false)

  // ── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const { execute: executeLoadMeasures } = measuresState

  const loadMeasures = useCallback(async (benefitId: string) => {
    executeLoadMeasures(Pm_performancemeasuresService.getAll({
      filter: `_pm_benefit_value eq '${benefitId}'`,
      top: 50
    }))
  }, [executeLoadMeasures])

  useEffect(() => {
    if (selectedBenefit?.pm_benefitid) {
      loadMeasures(selectedBenefit.pm_benefitid)
    }
  }, [selectedBenefit?.pm_benefitid, loadMeasures])

  // Sync selectedBenefit with latest data from benefits list
  useEffect(() => {
    if (selectedBenefit?.pm_benefitid) {
      const updated = benefits.find(b => b.pm_benefitid === selectedBenefit.pm_benefitid)
      if (updated) {
        setSelectedBenefit(updated)
      }
    }
  }, [benefits, selectedBenefit?.pm_benefitid])

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
    const result = await actionState.execute(
      editingBenefit?.pm_benefitid
        ? update(editingBenefit.pm_benefitid, data)
        : create(data)
    )

    if (result.success) {
      setSuccessMsg(`Benefit ${editingBenefit ? 'updated' : 'created'} successfully.`)
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setError(result.error)
    }
  }

  const handleDeleteBenefit = async () => {
    if (!deleteConfirm) return
    const result = await remove(deleteConfirm)
    if (result.success) {
      setSuccessMsg('Benefit removed successfully.')
      if (selectedBenefit?.pm_benefitid === deleteConfirm) setSelectedBenefit(null)
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setError(result.error || 'Unable to delete benefit.')
    }
  }

  const handleSaveMeasure = async (data: Record<string, any>) => {
    if (!selectedBenefit?.pm_benefitid) return

    const result = await actionState.execute(Pm_performancemeasuresService.create({
      ...data,
      pm_variance: data.pm_cumulativeplanned > 0
        ? ((data.pm_cumulativeactual - data.pm_cumulativeplanned) / data.pm_cumulativeplanned) * 100
        : data.pm_actualvalue - data.pm_plannedvalue,
      'pm_benefit@odata.bind': `pm_benefits(${selectedBenefit.pm_benefitid})`,
      statecode: 0 as any,
      ownerid: '' as any,
      owneridtype: '' as any,
    }))

    if (result.success) {
      setSuccessMsg('Performance measure added successfully.')
      setShowMeasureModal(false)
      loadMeasures(selectedBenefit.pm_benefitid)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setError(result.error)
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

  // ── Render ────────────────────────────────────────────────────────────────
  if (selectedBenefit) {
    return (
      <Box>
        <Breadcrumbs
          items={[{ label: 'Benefits', path: 'list' }, { label: selectedBenefit.pm_benefitname ?? 'Detail' }]}
          onNavigate={() => setSelectedBenefit(null)}
        />
        <PageHeader
          title={selectedBenefit.pm_benefitname ?? 'Benefit Detail'}
          subtitle={selectedBenefit.pm_benefitreference ? `Reference: ${selectedBenefit.pm_benefitreference}` : undefined}
          actionElement={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {canEdit && (
                <ActionIcon
                  icon={<EditIcon />}
                  onClick={() => { setEditingBenefit(selectedBenefit); setShowFormModal(true); }}
                  label="Edit Benefit"
                  color="primary"
                />
              )}
              {canDelete && (
                <ActionIcon
                  icon={<DeleteIcon />}
                  onClick={() => setDeleteConfirm(selectedBenefit.pm_benefitid!)}
                  label="Delete Benefit"
                  color="error"
                />
              )}
            </Box>
          }
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 3 }}>
          <StatusTag label={CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)]} color={CATEGORY_COLORS[String(selectedBenefit.pm_benefitcategory)]} />
          <StatusTag label={STATUS_LABELS[String(selectedBenefit.pm_benefitstatus)]} color={STATUS_COLORS[String(selectedBenefit.pm_benefitstatus)]} />
        </Box>

        {(error || crudError || actionState.error) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error || crudError || actionState.error}
          </Alert>
        )}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

        <Grid container spacing={3}>
          {/* Block 1: Benefit Info & Description (7-columns) */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, flexGrow: 1 }}>
                {/* Benefit Information */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Benefit Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Reference / ID</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benefitreference || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Category</Typography>
                      <Typography variant="body2">{CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)] || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Benefit Type</Typography>
                      <Typography variant="body2">
                        {selectedBenefit.pm_benefittype === 0 || String(selectedBenefit.pm_benefittype) === '0' ? 'Quantitative' :
                          selectedBenefit.pm_benefittype === 1 || String(selectedBenefit.pm_benefittype) === '1' ? 'Qualitative' : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Owner</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benifitownername || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Project / Programme</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_projectcode || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>RAG Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusTag
                          label={RAG_LABELS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_LABELS] ?? '—'}
                          color={RAG_COLORS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_COLORS]}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Description */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Description
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selectedBenefit.pm_benefitdescription || 'No description provided.'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Block 2: Targets, Baseline & Timeline (5-columns) */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, flexGrow: 1 }}>
                {/* Target & Baseline values */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrackChangesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Target & Baseline
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Unit of Measure</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBenefit.pm_unitofmeasure || '—'}</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.text.secondary}` }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Baseline</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedBenefit.pm_baselinevalue != null ? numberFormatter.format(selectedBenefit.pm_baselinevalue) : '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.primary.main}` }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Target</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                          {selectedBenefit.pm_targetvalue != null ? numberFormatter.format(selectedBenefit.pm_targetvalue) : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Timeline */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Realisation Timeline
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Start Date</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_realisationstartdate ? formatDate(selectedBenefit.pm_realisationstartdate) : '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>End Date</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_realisationenddate ? formatDate(selectedBenefit.pm_realisationenddate) : '—'}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Block 3: Performance Measures (12-columns) */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 1.5 }}>
              <Box sx={{ 
                '& .MuiPaper-root': { 
                  boxShadow: 'none', 
                  border: 'none', 
                  bgcolor: 'transparent', 
                  backgroundImage: 'none',
                  borderRadius: 0,
                  mb: 0
                } 
              }}>
                <PerformanceMeasuresTable
                  measures={measuresState.data || []}
                  loading={measuresState.loading}
                  onAddClick={() => { setShowMeasureModal(true); }}
                  onDeleteClick={handleDeleteMeasure}
                  isDark={isDark}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

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
        onRowClick={handleSelectBenefit}
        selectedId={undefined}
        onCreateClick={() => { setEditingBenefit(null); setShowFormModal(true); }}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

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
