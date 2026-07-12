import React, { useEffect, useState, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  alpha,
  Tabs,
  Tab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import EuroIcon from '@mui/icons-material/Euro'
import { useAuthorization } from '@/hooks/useAuthorization'
import {
  fetchFundingSourcesByRegarding,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource,
} from '@/services'
import type { FundingSourceModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { TableShell, StatusTag, ActionIcon, TableFooter } from '@/components/common'
import {
  Pm_portfoliosService,
  Pm_projectsService,
  Pm_programmesService,
} from '@/generated'
import { unwrapSingle } from '@/services/common'

const FUNDING_TYPE_LABELS: Record<string, string> = {
  '0': 'Capital',
  '1': 'EU',
  '2': 'Revenue',
  '3': 'Grant',
}

const FUNDING_TYPE_COLORS: Record<string, 'primary' | 'info' | 'success' | 'secondary'> = {
  '0': 'primary',
  '1': 'info',
  '2': 'success',
  '3': 'secondary',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
  '1': 'Exhausted',
}

const STATUS_COLORS: Record<string, 'success' | 'error'> = {
  '0': 'success',
  '1': 'error',
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export interface EntityFundingSourcesTabRef {
  triggerCreate: () => void
}

interface EntityFundingSourcesTabProps {
  entityId: string
  entityType: 'pm_projects' | 'pm_portfolios' | 'pm_initiatives' | 'pm_programmes'
  hideAddAction?: boolean
  onFundingSourcesChanged?: () => void
}

export const EntityFundingSourcesTab = forwardRef<EntityFundingSourcesTabRef, EntityFundingSourcesTabProps>(
  ({ entityId, entityType, hideAddAction = false, onFundingSourcesChanged }, ref) => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    const { allowed: canCreate } = useAuthorization('FUNDING_SOURCES', 'create')
    const { allowed: canEdit } = useAuthorization('FUNDING_SOURCES', 'update')
    const { allowed: canDelete } = useAuthorization('FUNDING_SOURCES', 'delete')

    // Data state
    const [fundingSources, setFundingSources] = useState<(FundingSourceModel & { scope?: 'entity' | 'programme' | 'portfolio' })[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    // Options Modal state for budget excess
    const [showOptionsModal, setShowOptionsModal] = useState(false)
    const [pendingPayload, setPendingPayload] = useState<any>(null)

    // Form Modal state
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingSource, setEditingSource] = useState<FundingSourceModel | null>(null)
    const [formData, setFormData] = useState({
      pm_fundingsourcename: '',
      pm_fundingtype: 0,
      pm_fundingstatus: 0,
      pm_fundingbody: '',
      pm_totalamounteur: 0,
      pm_effectivefromdate: '',
      pm_effectivetodate: '',
    })

    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Live budget and dates state
    const [dbApprovedBudget, setDbApprovedBudget] = useState<number>(0)
    const [loadingBudget, setLoadingBudget] = useState(false)
    const [entityDates, setEntityDates] = useState<{ start: string | null, end: string | null }>({ start: null, end: null })

    // Hierarchy parent states
    const [scopeFilter, setScopeFilter] = useState<'all' | 'entity' | 'programme' | 'portfolio'>('all')
    const [parentPortfolioId, setParentPortfolioId] = useState<string | null>(null)
    const [parentProgrammeId, setParentProgrammeId] = useState<string | null>(null)

    useEffect(() => {
      if (showFormModal && entityId) {
        const loadBudgetAndDates = async () => {
          setLoadingBudget(true)
          try {
            if (entityType === 'pm_portfolios') {
              const res = await Pm_portfoliosService.get(entityId, { select: ['pm_approvedbudgeteur', 'pm_startdate', 'pm_enddate'] })
              if (res.success) {
                const item = unwrapSingle<any>(res)
                setDbApprovedBudget(Number(item?.pm_approvedbudgeteur ?? 0))
                setEntityDates({ start: item?.pm_startdate ?? null, end: item?.pm_enddate ?? null })
              }
            } else if (entityType === 'pm_projects') {
              const res = await Pm_projectsService.get(entityId, { select: ['pm_approvedbudget', 'pm_plannedstartdate', 'pm_plannedenddate'] })
              if (res.success) {
                const item = unwrapSingle<any>(res)
                setDbApprovedBudget(Number(item?.pm_approvedbudget ?? 0))
                setEntityDates({ start: item?.pm_plannedstartdate ?? null, end: item?.pm_plannedenddate ?? null })
              }
            } else if ((entityType as string) === 'pm_programmes') {
              const res = await Pm_programmesService.get(entityId, { select: ['pm_budgeteur', 'pm_startdate', 'pm_enddate'] })
              if (res.success) {
                const item = unwrapSingle<any>(res)
                setDbApprovedBudget(Number(item?.pm_budgeteur ?? 0))
                setEntityDates({ start: item?.pm_startdate ?? null, end: item?.pm_enddate ?? null })
              }
            }
          } catch (err) {
            console.error('Error fetching budget/dates:', err)
          } finally {
            setLoadingBudget(false)
          }
        }
        loadBudgetAndDates()
      } else {
        setDbApprovedBudget(0)
        setEntityDates({ start: null, end: null })
      }
    }, [showFormModal, entityId, entityType])

    const isTimelineOutside = useMemo(() => {
      if (!formData.pm_effectivefromdate && !formData.pm_effectivetodate) return false
      if (!entityDates.start && !entityDates.end) return false

      const fundingStart = formData.pm_effectivefromdate ? new Date(formData.pm_effectivefromdate) : null
      const fundingEnd = formData.pm_effectivetodate ? new Date(formData.pm_effectivetodate) : null
      const entityStart = entityDates.start ? new Date(entityDates.start) : null
      const entityEnd = entityDates.end ? new Date(entityDates.end) : null

      if (fundingStart && entityStart && fundingStart < entityStart) return true
      if (fundingEnd && entityEnd && fundingEnd > entityEnd) return true

      return false
    }, [formData.pm_effectivefromdate, formData.pm_effectivetodate, entityDates])

    const entityOnlySources = useMemo(() => {
      return fundingSources.filter((s) => !s.scope || s.scope === 'entity')
    }, [fundingSources])

    const liveExistingFundingTotal = useMemo(() => {
      return entityOnlySources
        .filter((s) => !editingSource || s.pm_fundingsourceid !== editingSource.pm_fundingsourceid)
        .reduce((sum, s) => sum + Number(s.pm_totalamounteur ?? 0), 0)
    }, [entityOnlySources, editingSource, showFormModal])

    const liveTotalFunding = liveExistingFundingTotal + Number(formData.pm_totalamounteur || 0)
    const isBudgetExceeded = dbApprovedBudget > 0 && liveTotalFunding > dbApprovedBudget
    const addableAmount = Math.max(0, dbApprovedBudget - liveExistingFundingTotal)

    const showHierarchyFilters = entityType === 'pm_programmes' || entityType === 'pm_projects'

    const filteredFundingSources = useMemo(() => {
      if (scopeFilter === 'all') return fundingSources
      return fundingSources.filter((s) => s.scope === scopeFilter)
    }, [fundingSources, scopeFilter])

    // Load Data
    const loadData = useCallback(async () => {
      if (!entityId) return
      setLoading(true)
      setError(null)
      try {
        let parentPortId: string | null = null
        let parentProgId: string | null = null

        // Fetch hierarchy info first
        if (entityType === 'pm_programmes') {
          const progResult = await Pm_programmesService.get(entityId, {
            select: ['_pm_portfolio_value']
          })
          if (progResult.success) {
            const prog = unwrapSingle<any>(progResult)
            if (prog?._pm_portfolio_value) {
              parentPortId = prog._pm_portfolio_value
              setParentPortfolioId(prog._pm_portfolio_value)
            }
          }
        } else if (entityType === 'pm_projects') {
          const projResult = await Pm_projectsService.get(entityId, {
            select: ['_pm_portfolio_value', '_pm_programme_value']
          })
          if (projResult.success) {
            const proj = unwrapSingle<any>(projResult)
            if (proj?._pm_portfolio_value) {
              parentPortId = proj._pm_portfolio_value
              setParentPortfolioId(proj._pm_portfolio_value)
            }
            if (proj?._pm_programme_value) {
              parentProgId = proj._pm_programme_value
              setParentProgrammeId(proj._pm_programme_value)
            }
          }
        }

        const [mainList, portfolioList, programmeList] = await Promise.all([
          fetchFundingSourcesByRegarding(entityId, entityType),
          parentPortId ? fetchFundingSourcesByRegarding(parentPortId, 'pm_portfolios') : Promise.resolve([]),
          parentProgId ? fetchFundingSourcesByRegarding(parentProgId, 'pm_programmes') : Promise.resolve([])
        ])

        const annotatedMain = mainList.map(item => ({ ...item, scope: 'entity' }))
        const annotatedPortfolio = portfolioList.map(item => ({ ...item, scope: 'portfolio' }))
        const annotatedProgramme = programmeList.map(item => ({ ...item, scope: 'programme' }))

        setFundingSources([
          ...annotatedMain,
          ...annotatedProgramme,
          ...annotatedPortfolio
        ] as any)
      } catch {
        setError('Unable to load funding sources.')
      } finally {
        setLoading(false)
      }
    }, [entityId, entityType])

    useEffect(() => {
      loadData()
    }, [loadData])

    // Handlers
    const openCreateForm = useCallback(() => {
      setEditingSource(null)
      setError(null)
      setFormData({
        pm_fundingsourcename: '',
        pm_fundingtype: 0,
        pm_fundingstatus: 0,
        pm_fundingbody: '',
        pm_totalamounteur: 0,
        pm_effectivefromdate: '',
        pm_effectivetodate: '',
      })
      setShowFormModal(true)
    }, [])

    const openEditForm = useCallback((source: FundingSourceModel) => {
      setEditingSource(source)
      setError(null)
      setFormData({
        pm_fundingsourcename: source.pm_fundingsourcename ?? '',
        pm_fundingtype: Number(source.pm_fundingtype) || 0,
        pm_fundingstatus: Number(source.pm_fundingstatus) || 0,
        pm_fundingbody: source.pm_fundingbody ?? '',
        pm_totalamounteur: source.pm_totalamounteur ?? 0,
        pm_effectivefromdate: source.pm_effectivefromdate?.split('T')[0] ?? '',
        pm_effectivetodate: source.pm_effectivetodate?.split('T')[0] ?? '',
      })
      setShowFormModal(true)
    }, [])

    // Imperative trigger
    useImperativeHandle(ref, () => ({
      triggerCreate: openCreateForm,
    }))

    const fetchApprovedBudget = async (): Promise<number> => {
      try {
        console.log('[Budget Check] Fetching approved budget for:', { entityType, entityId })
        if (entityType === 'pm_portfolios') {
          const res = await Pm_portfoliosService.get(entityId, { select: ['pm_approvedbudgeteur'] })
          console.log('[Budget Check] Portfolios res:', res)
          if (res.success) {
            const item = unwrapSingle<any>(res)
            console.log('[Budget Check] Portfolios unwrapped item:', item)
            return Number(item?.pm_approvedbudgeteur ?? 0)
          }
        } else if (entityType === 'pm_projects') {
          const res = await Pm_projectsService.get(entityId, { select: ['pm_approvedbudget'] })
          console.log('[Budget Check] Projects res:', res)
          if (res.success) {
            const item = unwrapSingle<any>(res)
            console.log('[Budget Check] Projects unwrapped item:', item)
            return Number(item?.pm_approvedbudget ?? 0)
          }
        } else if (entityType === 'pm_programmes' as any) {
          const res = await Pm_programmesService.get(entityId, { select: ['pm_budgeteur'] })
          console.log('[Budget Check] Programmes res:', res)
          if (res.success) {
            const item = unwrapSingle<any>(res)
            console.log('[Budget Check] Programmes unwrapped item:', item)
            return Number(item?.pm_budgeteur ?? 0)
          }
        }
      } catch (err) {
        console.error('Error fetching approved budget:', err)
      }
      return 0
    }

    const handleExecuteSave = async (raiseChangeRequest: boolean) => {
      setShowOptionsModal(false)
      if (!pendingPayload) return
      setActionLoading(true)
      try {
        if (editingSource?.pm_fundingsourceid) {
          await updateFundingSource(editingSource.pm_fundingsourceid, pendingPayload)
          setSuccessMsg(
            raiseChangeRequest
              ? 'Funding source updated. Please raise a Change Request to increase the approved budget.'
              : 'Funding source updated. Excess amount has been placed in Unallocated Reserve.'
          )
        } else {
          await createFundingSource(pendingPayload)
          setSuccessMsg(
            raiseChangeRequest
              ? 'Funding source created. Please raise a Change Request to increase the approved budget.'
              : 'Funding source created. Excess amount has been placed in Unallocated Reserve.'
          )
        }
        setShowFormModal(false)
        setTimeout(() => setSuccessMsg(null), 5000)
        onFundingSourcesChanged?.()
        await loadData()
      } catch {
        setError('Unable to save funding source.')
      } finally {
        setActionLoading(false)
        setPendingPayload(null)
      }
    }

    const handleSaveSource = async () => {
      if (!formData.pm_fundingsourcename.trim()) {
        setError('Funding source name is required.')
        return
      }
      setError(null)
      setActionLoading(true)
      try {
        const payload: any = {
          pm_fundingsourcename: formData.pm_fundingsourcename,
          pm_fundingtype: formData.pm_fundingtype,
          pm_fundingstatus: formData.pm_fundingstatus,
          pm_fundingbody: formData.pm_fundingbody || undefined,
          pm_totalamounteur: formData.pm_totalamounteur || 0,
          pm_effectivefromdate: formData.pm_effectivefromdate || undefined,
          pm_effectivetodate: formData.pm_effectivetodate || undefined,
          _pm_regardingid_value: entityId,
          pm_regardingidtype: entityType,
        }

        if (editingSource?.pm_fundingsourceid) {
          await updateFundingSource(editingSource.pm_fundingsourceid, payload)
          setSuccessMsg('Funding source updated successfully.')
        } else {
          await createFundingSource(payload)
          setSuccessMsg('Funding source created successfully.')
        }
        setShowFormModal(true) // Wait, setShowFormModal should be false after save!
        setShowFormModal(false)
        setTimeout(() => setSuccessMsg(null), 3000)
        onFundingSourcesChanged?.()
        await loadData()
      } catch {
        setError(editingSource ? 'Unable to update funding source.' : 'Unable to create funding source.')
      } finally {
        setActionLoading(false)
      }
    }

    const handleDeleteSource = async () => {
      if (!deleteConfirm) return
      setActionLoading(true)
      try {
        await deleteFundingSource(deleteConfirm)
        setSuccessMsg('Funding source removed successfully.')
        setDeleteConfirm(null)
        setTimeout(() => setSuccessMsg(null), 3000)
        onFundingSourcesChanged?.()
        await loadData()
      } catch {
        setError('Unable to delete funding source.')
      } finally {
        setActionLoading(false)
      }
    }

    return (
      <Box>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceIcon sx={{ color: 'primary.main', fontSize: 20 }} /> Funding Sources ({entityOnlySources.length})
            </Typography>
            {canCreate && !hideAddAction && (
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreateForm} sx={{ borderRadius: 1.5 }}>
                Add Funding Source
              </Button>
            )}
          </Box>

          {showHierarchyFilters && (
            <Tabs
              value={scopeFilter}
              onChange={(_, v) => setScopeFilter(v)}
              sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', minHeight: 44, '& .MuiTab-root': { py: 1.5, minHeight: 44, textTransform: 'none', fontWeight: 600 } }}
            >
              <Tab label="All Sources" value="all" />
              <Tab label={entityType === 'pm_programmes' ? 'This Programme' : 'This Project'} value="entity" />
              {entityType === 'pm_projects' && parentProgrammeId && (
                <Tab label="Parent Programme" value="programme" />
              )}
              {parentPortfolioId && (
                <Tab label="Parent Portfolio" value="portfolio" />
              )}
            </Tabs>
          )}

          <TableShell
            loading={loading}
            empty={filteredFundingSources.length === 0}
            emptyIcon={<AccountBalanceIcon />}
            emptyTitle="No funding sources found."
            emptyAction={canCreate && !hideAddAction ? (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
                Link a funding source
              </Button>
            ) : undefined}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  {showHierarchyFilters && <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Funding Body</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Effective Dates</TableCell>
                  {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFundingSources.map((source) => {
                  const totalAmt = source.pm_totalamounteur ?? 0
                  const isOwner = !source.scope || source.scope === 'entity'
                  return (
                    <TableRow key={source.pm_fundingsourceid} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{source.pm_fundingsourcename ?? 'Unnamed Source'}</TableCell>
                      <TableCell>
                        <StatusTag
                          label={FUNDING_TYPE_LABELS[String(source.pm_fundingtype ?? '')] ?? '—'}
                          color={FUNDING_TYPE_COLORS[String(source.pm_fundingtype ?? '')] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusTag
                          label={STATUS_LABELS[String(source.pm_fundingstatus ?? '')] ?? '—'}
                          color={STATUS_COLORS[String(source.pm_fundingstatus ?? '')] ?? 'default'}
                        />
                      </TableCell>
                      {showHierarchyFilters && (
                        <TableCell>
                          <StatusTag
                            label={
                              source.scope === 'portfolio'
                                ? 'Portfolio'
                                : source.scope === 'programme'
                                ? 'Programme'
                                : entityType === 'pm_projects'
                                ? 'Project'
                                : 'Programme'
                            }
                            color={
                              source.scope === 'portfolio'
                                ? 'secondary'
                                : source.scope === 'programme'
                                ? 'info'
                                : 'primary'
                            }
                          />
                        </TableCell>
                      )}
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                        {currencyFormatter.format(totalAmt)}
                      </TableCell>
                      <TableCell>{source.pm_fundingbody || '—'}</TableCell>
                      <TableCell sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
                        {source.pm_effectivefromdate
                          ? new Date(source.pm_effectivefromdate).toLocaleDateString()
                          : '—'}
                        {source.pm_effectivetodate && (
                          <> — {new Date(source.pm_effectivetodate).toLocaleDateString()}</>
                        )}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell align="right">
                          {isOwner ? (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              {canEdit && (
                                <ActionIcon
                                  icon={<EditIcon />}
                                  label="Edit"
                                  onClick={() => openEditForm(source)}
                                  color="primary"
                                />
                              )}
                              {canDelete && (
                                <ActionIcon
                                  icon={<DeleteIcon />}
                                  label="Delete"
                                  onClick={() => source.pm_fundingsourceid && setDeleteConfirm(source.pm_fundingsourceid)}
                                  color="error"
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', pr: 1 }}>
                              Read-only (Parent)
                            </Typography>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableShell>
        </Paper>

        {/* Create/Edit Form Dialog */}
        <Dialog open={showFormModal} onClose={() => !actionLoading && setShowFormModal(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingSource ? 'Edit Funding Source' : 'Add Funding Source'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {isBudgetExceeded && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: '16px',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.05)' : 'rgba(237, 108, 2, 0.02)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.warning.main, 0.08)}`,
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
                }}
              >
                <Avatar sx={{ bgcolor: 'warning.main', color: '#fff', width: 36, height: 36 }}>
                  <WarningAmberIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', mb: 0.5, fontFamily: '"Outfit", sans-serif' }}>
                    Budget Limit Exceeded
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                    Total funding for this entity (<span style={{ color: theme.palette.warning.main, fontWeight: 800 }}>{currencyFormatter.format(liveTotalFunding)}</span>) exceeds the approved budget (<span style={{ color: theme.palette.success.main, fontWeight: 800 }}>{currencyFormatter.format(dbApprovedBudget)}</span>). The maximum amount you can add without exceeding the budget is <span style={{ color: theme.palette.success.main, fontWeight: 800 }}>{currencyFormatter.format(addableAmount)}</span>. If you submit this, the excess amount of <span style={{ color: theme.palette.error.main, fontWeight: 800 }}>{currencyFormatter.format(liveTotalFunding - dbApprovedBudget)}</span> will be placed in the Unallocated Reserve. If you do not intend to do so, please click Cancel and first raise the budget via a Change Request.
                  </Typography>
                </Box>
              </Paper>
            )}
            {isTimelineOutside && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 3.5,
                  borderRadius: '16px',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.05)' : 'rgba(237, 108, 2, 0.02)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.warning.main, 0.08)}`,
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
                }}
              >
                <Avatar sx={{ bgcolor: 'warning.main', color: '#fff', width: 36, height: 36 }}>
                  <WarningAmberIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', mb: 0.5, fontFamily: '"Outfit", sans-serif' }}>
                    Timeline Warning
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.6, mb: 1.5 }}>
                    The funding timeline falls outside the {entityType === 'pm_portfolios' ? 'Portfolio' : entityType === 'pm_projects' ? 'Project' : 'Programme'} dates (Start: <strong>{entityDates.start ? new Date(entityDates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>, End: <strong>{entityDates.end ? new Date(entityDates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>). Please confirm this is correct for pre-planning or extension activities.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        pm_effectivefromdate: entityDates.start ? entityDates.start.split('T')[0] : '',
                        pm_effectivetodate: entityDates.end ? entityDates.end.split('T')[0] : '',
                      })
                    }}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                  >
                    Set Dates to Entity Timeline
                  </Button>
                </Box>
              </Paper>
            )}
            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Funding Source Name"
                  required
                  value={formData.pm_fundingsourcename}
                  onChange={(e) => setFormData({ ...formData, pm_fundingsourcename: e.target.value })}
                  slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="entity-funding-type-label">Type</InputLabel>
                  <Select
                    labelId="entity-funding-type-label"
                    value={formData.pm_fundingtype}
                    label="Type"
                    onChange={(e) => setFormData({ ...formData, pm_fundingtype: Number(e.target.value) })}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <MenuItem value={0}>Capital</MenuItem>
                    <MenuItem value={1}>EU</MenuItem>
                    <MenuItem value={2}>Revenue</MenuItem>
                    <MenuItem value={3}>Grant</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="entity-funding-status-label">Status</InputLabel>
                  <Select
                    labelId="entity-funding-status-label"
                    value={formData.pm_fundingstatus}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, pm_fundingstatus: Number(e.target.value) })}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <MenuItem value={0}>Active</MenuItem>
                    <MenuItem value={1}>Exhausted</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Total Amount (EUR)"
                  type="number"
                  value={formData.pm_totalamounteur || ''}
                  onChange={(e) => setFormData({ ...formData, pm_totalamounteur: Number(e.target.value) })}
                  slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Funding Body"
                  value={formData.pm_fundingbody}
                  onChange={(e) => setFormData({ ...formData, pm_fundingbody: e.target.value })}
                  slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Effective From"
                  type="date"
                  value={formData.pm_effectivefromdate}
                  onChange={(e) => setFormData({ ...formData, pm_effectivefromdate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Effective To"
                  type="date"
                  value={formData.pm_effectivetodate}
                  onChange={(e) => setFormData({ ...formData, pm_effectivetodate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>Cancel</Button>
            <Button onClick={handleSaveSource} variant="contained" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
              {actionLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)}>
          <DialogTitle sx={{ fontWeight: 700 }}>Remove Funding Source</DialogTitle>
          <DialogContent dividers>
            Are you sure you want to remove this funding source association?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm(null)} disabled={actionLoading}>Cancel</Button>
            <Button onClick={handleDeleteSource} color="error" variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Budget Limit Options Dialog */}
        <Dialog open={showOptionsModal} onClose={() => setShowOptionsModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Budget Limit Exceeded</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The total funding amount exceeds the approved budget of this record. How would you like to proceed?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2, alignItems: 'stretch' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleExecuteSave(true)}
              sx={{ borderRadius: 1.5 }}
            >
              Raise Change Request
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleExecuteSave(false)}
              sx={{ borderRadius: 1.5 }}
            >
              Utilize as Approved (Unallocated Reserve)
            </Button>
            <Button
              variant="text"
              color="inherit"
              onClick={() => setShowOptionsModal(false)}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }
)
