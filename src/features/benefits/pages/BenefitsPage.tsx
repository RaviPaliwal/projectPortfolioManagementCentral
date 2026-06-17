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
import type { CrudModule } from '@/constants/permissions'
import {
  Pm_benefitsService,
  Pm_performancemeasuresService
} from '@/generated'
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
import { formatDate, currencyFormatter } from '@/utils/formatters'
import { RAG_LABELS } from '@/constants/mappings'
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
  const [detailTab, setDetailTab] = useState(0)

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

  const loadMeasures = useCallback(async (benefitId: string) => {
    measuresState.execute(Pm_performancemeasuresService.getAll({ 
      filter: `_pm_benefit_value eq '${benefitId}'`,
      top: 50 
    }))
  }, [measuresState])

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
        tabs={[{ label: 'Overview' }, { label: 'Performance Measures' }]}
        tabValue={detailTab}
        onTabChange={(_e, v) => setDetailTab(v)}
      >
        {selectedBenefit && (
          <>
            <TabPanel value={detailTab} index={0} pt={0}>
              {/* Summary view logic remains consistent with original design */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                 <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Benefit Information</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                       <Box><Typography variant="caption">Category</Typography><Typography variant="body2">{CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)]}</Typography></Box>
                       <Box><Typography variant="caption">Owner</Typography><Typography variant="body2">{selectedBenefit.pm_benifitownername || '—'}</Typography></Box>
                    </Box>
                 </Paper>
              </Box>
            </TabPanel>
            <TabPanel value={detailTab} index={1} pt={0}>
              <PerformanceMeasuresTable
                measures={measuresState.data || []}
                loading={measuresState.loading}
                onAddClick={() => { setShowMeasureModal(true); }}
                onDeleteClick={handleDeleteMeasure}
                isDark={isDark}
              />
            </TabPanel>
          </>
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
