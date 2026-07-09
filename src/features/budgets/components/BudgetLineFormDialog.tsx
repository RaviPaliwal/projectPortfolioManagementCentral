import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  useTheme,
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
  Button,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  alpha,
} from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import EditIcon from '@mui/icons-material/Edit'
import AssessmentIcon from '@mui/icons-material/Assessment'
import TimelineIcon from '@mui/icons-material/Timeline'
import NotesIcon from '@mui/icons-material/Notes'
import { fontSizes } from '@/styles'
import type { PortfolioLookupItem, ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import {
  createBudgetLine,
  updateBudgetLine,
  fetchPortfoliosForLookup,
  fetchProgrammesForLookup,
  fetchProjectsForLookup,
  fetchFundingSources,
} from '@/services'
import { fetchProjectDetails } from '@/services/project.service'
import type { BudgetLineModel, FundingSourceModel } from '@/types/dataverse'

interface BudgetLineFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (budget: BudgetLineModel | null, isEdit: boolean) => void
  editBudget?: BudgetLineModel | null
  prefillProjectId?: string
  prefillPortfolioId?: string
  prefillProgrammeId?: string
}

interface FormData {
  pm_budgetlinename: string
  pm_costcategory: number
  pm_expencecatagory: number
  pm_costinglevelcode: number
  pm_unitcosteur: number
  pm_quantity: number
  pm_totalamounteur: number
  pm_jsonrawcalculation: string
  _pm_portfoliolookup_value: string
  _pm_programmelookup_value: string
  _pm_project_value: string
  pm_notes: string
  _pm_fundingsource_value: string
  pm_approvedbudgeteur: number
  pm_revisedbudgeteur: number
  pm_actualspendeur: number
  pm_committedspendeur: number
  pm_forecastspendeur: number
}

const DEFAULT_FORM_DATA: FormData = {
  pm_budgetlinename: '',
  pm_costcategory: 0,
  pm_expencecatagory: 0,
  pm_costinglevelcode: 0,
  pm_unitcosteur: 0,
  pm_quantity: 1,
  pm_totalamounteur: 0,
  pm_jsonrawcalculation: '',
  _pm_portfoliolookup_value: '',
  _pm_programmelookup_value: '',
  _pm_project_value: '',
  pm_notes: '',
  _pm_fundingsource_value: '',
  pm_approvedbudgeteur: 0,
  pm_revisedbudgeteur: 0,
  pm_actualspendeur: 0,
  pm_committedspendeur: 0,
  pm_forecastspendeur: 0,
}

const normalizeGuid = (id: string | undefined | null): string => {
  if (!id) return ''
  return id.replace(/[{}]/g, '').trim().toLowerCase()
}

const computeTotalAmount = (data: FormData): number => {
  const unitCost = data.pm_unitcosteur || 0
  return Number(data.pm_costinglevelcode) === 1 ? unitCost * (data.pm_quantity || 1) : unitCost
}

const buildCalculationJson = (data: FormData): string => {
  const method = Number(data.pm_costinglevelcode) === 1 ? 'Rate-Based' : 'Fixed Cost'
  const unitCost = data.pm_unitcosteur || 0
  const quantity = Number(data.pm_costinglevelcode) === 1 ? (data.pm_quantity || 1) : 1
  const total = Number(data.pm_costinglevelcode) === 1 ? unitCost * quantity : unitCost
  return JSON.stringify({
    costingMethod: method,
    unitCost,
    quantity,
    totalAmount: total,
    formula: method === 'Rate-Based' ? 'Unit Cost × Quantity' : 'Unit Cost (Fixed)',
    generatedAt: new Date().toISOString(),
  }, null, 2)
}

export default function BudgetLineFormDialog({
  open, onClose, onSaved, editBudget, prefillProjectId, prefillPortfolioId, prefillProgrammeId,
}: BudgetLineFormDialogProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA)
  const [actionLoading, setActionLoading] = useState(false)
  const [portfolioLookups, setPortfolioLookups] = useState<PortfolioLookupItem[]>([])
  const [programmeLookups, setProgrammeLookups] = useState<ProgrammeLookupItem[]>([])
  const [projectLookups, setProjectLookups] = useState<ProjectLookupItem[]>([])
  const [fundingSources, setFundingSources] = useState<FundingSourceModel[]>([])

  const filteredProgrammes = programmeLookups.filter(
    (p) => !formData._pm_portfoliolookup_value || normalizeGuid(p._pm_portfolio_value) === formData._pm_portfoliolookup_value
  )
  const filteredProjects = projectLookups.filter(
    (p) => !formData._pm_programmelookup_value || normalizeGuid(p._pm_programme_value) === formData._pm_programmelookup_value
  )
  const filteredFundingSources = fundingSources.filter(
    (s) => {
      const portVal = formData._pm_portfoliolookup_value
      const progVal = formData._pm_programmelookup_value
      const portOk = !portVal || normalizeGuid(s._pm_portfolio_value) === portVal
      const progOk = !progVal || normalizeGuid(s._pm_programmelookup_value) === progVal
      return portOk && progOk
    }
  )

  const loadLookups = useCallback(async () => {
    const [portfolios, programmes, projects, sources] = await Promise.all([
      fetchPortfoliosForLookup(),
      fetchProgrammesForLookup(),
      fetchProjectsForLookup(),
      fetchFundingSources(),
    ])
    setPortfolioLookups(portfolios)
    setProgrammeLookups(programmes)
    setProjectLookups(projects)
    setFundingSources(sources)
  }, [])

  useEffect(() => {
    if (!open) return
    loadLookups()
    if (editBudget) {
      let calcCode = 0, unitCost = 0, qty = 1, total = 0
      if (editBudget.pm_jsonrawcalculation) {
        try {
          const parsed = JSON.parse(editBudget.pm_jsonrawcalculation)
          calcCode = parsed.costingMethod === 'Rate-Based' ? 1 : 0
          unitCost = parsed.unitCost ?? 0
          qty = parsed.quantity ?? 1
          total = parsed.totalAmount ?? 0
        } catch { /* ignore */ }
      }
      setFormData({
        ...DEFAULT_FORM_DATA,
        pm_budgetlinename: editBudget.pm_budgetlinename ?? '',
        pm_costcategory: Number(editBudget.pm_costcategory) || 0,
        pm_expencecatagory: Number(editBudget.pm_expencecatagory) || 0,
        pm_costinglevelcode: calcCode,
        pm_unitcosteur: unitCost,
        pm_quantity: qty,
        pm_totalamounteur: total,
        _pm_portfoliolookup_value: normalizeGuid(editBudget._pm_portfoliolookup_value),
        _pm_programmelookup_value: normalizeGuid(editBudget._pm_programmelookup_value),
        _pm_project_value: normalizeGuid(editBudget._pm_project_value),
        pm_notes: editBudget.pm_notes ?? '',
        _pm_fundingsource_value: editBudget._pm_fundingsource_value ?? '',
        pm_approvedbudgeteur: editBudget.pm_approvedbudgeteur ?? 0,
        pm_revisedbudgeteur: editBudget.pm_revisedbudgeteur ?? 0,
        pm_actualspendeur: editBudget.pm_actualspendeur ?? 0,
        pm_committedspendeur: editBudget.pm_committedspendeur ?? 0,
        pm_forecastspendeur: editBudget.pm_forecastspendeur ?? 0,
      })
    } else {
      setFormData({ ...DEFAULT_FORM_DATA })

      const resolvePrefills = async () => {
        let projectId = prefillProjectId || ''
        let portfolioId = prefillPortfolioId || ''
        let programmeId = prefillProgrammeId || ''

        if (projectId && (!portfolioId || !programmeId)) {
          try {
            const proj = await fetchProjectDetails(projectId)
            if (!portfolioId && proj?._pm_portfolio_value) {
              portfolioId = normalizeGuid(proj._pm_portfolio_value)
            }
            if (!programmeId && proj?._pm_programme_value) {
              programmeId = normalizeGuid(proj._pm_programme_value)
            }
          } catch { /* ignore */ }
        }

        setFormData((f) => ({
          ...f,
          _pm_project_value: normalizeGuid(projectId),
          _pm_portfoliolookup_value: normalizeGuid(portfolioId),
          _pm_programmelookup_value: normalizeGuid(programmeId),
        }))
      }

      resolvePrefills()
    }
  }, [open, editBudget, prefillProjectId, prefillPortfolioId, prefillProgrammeId, loadLookups])

  // Sync Forecast to Calculated Total for new lines until user edits it
  useEffect(() => {
    if (!editBudget && open) {
      const calculated = computeTotalAmount(formData)
      setFormData(f => ({ ...f, pm_forecastspendeur: calculated }))
    }
  }, [formData.pm_unitcosteur, formData.pm_quantity, formData.pm_costinglevelcode, editBudget, open])

  const handleSave = async () => {
    if (!formData.pm_budgetlinename.trim()) return
    setActionLoading(true)
    try {
      const totalAmount = computeTotalAmount(formData)
      const isEdit = !!editBudget
      const payload: any = {
        ...formData,
        pm_totalamounteur: totalAmount,
        pm_jsonrawcalculation: buildCalculationJson(formData),
      }

      if (!isEdit) {
        payload.pm_actualspendeur = 0
        payload.pm_committedspendeur = 0
        payload.pm_approvedbudgeteur = 0
        payload.pm_revisedbudgeteur = 0
        payload.pm_estimateatcompletioneur = totalAmount
        payload.pm_estimatetocompleteeur = totalAmount
        payload.pm_varianceeur = 0
      } else {
        const revised = formData.pm_revisedbudgeteur ?? 0
        const actual = formData.pm_actualspendeur ?? 0
        const committed = formData.pm_committedspendeur ?? 0
        payload.pm_varianceeur = revised - actual - committed
        payload.pm_estimateatcompletioneur = actual + committed
      }

      delete payload.pm_jsonrawcalculation
      const calcJson = buildCalculationJson(formData)
      payload.pm_jsonrawcalculation = calcJson

      if (isEdit && editBudget?.pm_budgetlineid) {
        delete payload.pm_budgetlineid
        const _pm_budgetlineid = editBudget.pm_budgetlineid
        const updated = await updateBudgetLine(_pm_budgetlineid, payload)
        onSaved(updated, true)
      } else {
        const created = await createBudgetLine(payload)
        onSaved(created, false)
      }
      onClose()
    } catch {
      onSaved(null, !!editBudget)
    } finally {
      setActionLoading(false)
    }
  }

  const isRateBased = Number(formData.pm_costinglevelcode) === 1

  return (
    <Dialog
      open={open}
      onClose={actionLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 1.5 }}>
          {editBudget ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <AccountBalanceWalletIcon sx={{ fontSize: 18, color: '#fff' }} />}
        </Avatar>
        {editBudget ? 'Edit Budget Line' : 'Add Budget Line'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {editBudget ? `Update details for ${editBudget.pm_budgetlinename}.` : 'Create a new budget line with costing method and live calculation.'}
        </Typography>

        {/* Basic Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Basic Information
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Budget Line Name"
              required
              fullWidth
              size="small"
              value={formData.pm_budgetlinename}
              onChange={(e) => setFormData((f) => ({ ...f, pm_budgetlinename: e.target.value }))}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Cost Category</InputLabel>
              <Select
                value={formData.pm_costcategory}
                label="Cost Category"
                onChange={(e) => setFormData((f) => ({ ...f, pm_costcategory: e.target.value as number }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value={0}>Staff</MenuItem>
                <MenuItem value={1}>Contractors</MenuItem>
                <MenuItem value={2}>Licences</MenuItem>
                <MenuItem value={3}>Infrastructure</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Expense Category</InputLabel>
              <Select
                value={formData.pm_expencecatagory}
                label="Expense Category"
                onChange={(e) => setFormData((f) => ({ ...f, pm_expencecatagory: e.target.value as number }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value={0}>CapEx</MenuItem>
                <MenuItem value={1}>OpEx</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Portfolio</InputLabel>
              <Select
                value={formData._pm_portfoliolookup_value}
                label="Portfolio"
                onChange={(e) => setFormData((f) => ({
                  ...f, _pm_portfoliolookup_value: e.target.value, _pm_programmelookup_value: '', _pm_project_value: '',
                }))}
                sx={{ borderRadius: 1.5 }}
                inputProps={{ readOnly: !!prefillProjectId }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {portfolioLookups.map((p) => (
                  <MenuItem key={p.pm_portfolioid} value={normalizeGuid(p.pm_portfolioid)}>{p.pm_portfolioname}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" disabled={!formData._pm_portfoliolookup_value}>
              <InputLabel>Programme</InputLabel>
              <Select
                value={formData._pm_programmelookup_value}
                label="Programme"
                onChange={(e) => setFormData((f) => ({
                  ...f, _pm_programmelookup_value: e.target.value, _pm_project_value: '',
                }))}
                sx={{ borderRadius: 1.5 }}
                inputProps={{ readOnly: !!prefillProjectId }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {filteredProgrammes.map((p) => (
                  <MenuItem key={p.pm_programmeid} value={normalizeGuid(p.pm_programmeid)}>{p.pm_programmename}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" disabled={!formData._pm_programmelookup_value}>
              <InputLabel>Project</InputLabel>
              <Select
                value={formData._pm_project_value}
                label="Project"
                onChange={(e) => setFormData((f) => ({ ...f, _pm_project_value: e.target.value }))}
                sx={{ borderRadius: 1.5 }}
                inputProps={{ readOnly: !!prefillProjectId }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {filteredProjects.map((p) => (
                  <MenuItem key={p.pm_projectid} value={normalizeGuid(p.pm_projectid)}>{p.pm_projectname}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Funding Source</InputLabel>
              <Select
                value={formData._pm_fundingsource_value}
                label="Funding Source"
                onChange={(e) => setFormData((f) => ({ ...f, _pm_fundingsource_value: e.target.value }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {filteredFundingSources.map((s) => (
                  <MenuItem key={s.pm_fundingsourceid} value={normalizeGuid(s.pm_fundingsourceid)}>{s.pm_fundingsourcename}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Costing Method */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
          <AssessmentIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Costing Method
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 1.5,
            overflow: 'hidden',
            position: 'relative',
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(248, 250, 252, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 110 }}>Method</Typography>
            <ToggleButtonGroup
              value={formData.pm_costinglevelcode}
              exclusive
              size="small"
              onChange={(_, val) => {
                if (val !== null) setFormData((f) => ({ ...f, pm_costinglevelcode: val, pm_quantity: val === 0 ? 1 : f.pm_quantity }))
              }}
              sx={{
                gap: 1.5,
                '& .MuiToggleButtonGroup-grouped': {
                  border: '1px solid !important',
                  borderColor: 'divider !important',
                  borderRadius: '12px !important',
                },
                '& .MuiToggleButton-root': {
                  px: 3, py: 0.75,
                  fontWeight: 600, fontSize: fontSizes.sm, textTransform: 'none', color: 'text.secondary',
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.08),
                    borderColor: 'primary.main !important', color: 'primary.main',
                    '&:hover': { bgcolor: isDark ? alpha(theme.palette.primary.main, 0.25) : alpha(theme.palette.primary.main, 0.12) },
                  },
                  '&:not(.Mui-selected):hover': {
                    bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.03),
                  },
                },
              }}
            >
              <ToggleButton value={0}>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', opacity: formData.pm_costinglevelcode === 0 ? 1 : 0.3 }} />
                  Fixed Cost
                </Box>
              </ToggleButton>
              <ToggleButton value={1}>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: 'secondary.main', opacity: isRateBased ? 1 : 0.3 }} />
                  Rate-Based
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.disabled' }}>
                {isRateBased ? 'Unit Cost × Quantity' : 'Fixed Amount'}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3} sx={{ mb: 2 }}>
            {/* Unit Cost / Fixed Amount Column */}
            <Grid size={{ xs: 12, md: isRateBased ? 6 : 12 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {isRateBased ? 'Unit Cost' : 'Fixed Cost Amount'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 20 }}>€0</Typography>
                  <Slider
                    value={formData.pm_unitcosteur || 0}
                    onChange={(_, v) => setFormData((f) => ({ ...f, pm_unitcosteur: v as number }))}
                    min={0} max={1000000} step={1000}
                    sx={{
                      flex: 1,
                      py: 1,
                      color: 'primary.main',
                      '& .MuiSlider-rail': { opacity: isDark ? 0.25 : 0.2, bgcolor: isDark ? '#334155' : '#cbd5e1' },
                      '& .MuiSlider-track': { border: 'none' },
                      '& .MuiSlider-thumb': {
                        width: 14, height: 14, bgcolor: '#fff', border: '2px solid', borderColor: 'primary.main',
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 28, mr: 1 }}>€1M</Typography>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="0"
                    value={formData.pm_unitcosteur || 0}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_unitcosteur: Math.max(0, Number(e.target.value)) }))}
                    sx={{ width: 130 }}
                    slotProps={{
                      input: {
                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary', fontWeight: 600 }}>€</Typography>,
                        sx: { fontSize: fontSizes.sm, borderRadius: 1.5, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }
                      }
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            {/* Quantity Column */}
            {isRateBased && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Quantity</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 10 }}>1</Typography>
                    <Slider
                      value={formData.pm_quantity || 1}
                      onChange={(_, v) => setFormData((f) => ({ ...f, pm_quantity: v as number }))}
                      min={1} max={1000} step={1}
                      sx={{
                        flex: 1,
                        py: 1,
                        color: 'secondary.main',
                        '& .MuiSlider-rail': { opacity: isDark ? 0.25 : 0.2, bgcolor: isDark ? '#334155' : '#cbd5e1' },
                        '& .MuiSlider-track': { border: 'none' },
                        '& .MuiSlider-thumb': {
                          width: 14, height: 14, bgcolor: '#fff', border: '2px solid', borderColor: 'secondary.main',
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 20, mr: 1 }}>1K</Typography>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="1"
                      value={formData.pm_quantity || 1}
                      onChange={(e) => setFormData((f) => ({ ...f, pm_quantity: Math.max(1, Number(e.target.value)) }))}
                      sx={{ width: 130 }}
                      slotProps={{
                        input: {
                          sx: { fontSize: fontSizes.sm, borderRadius: 1.5, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>

          <Box sx={{
            height: 1, my: 2,
            background: isDark ? 'linear-gradient(90deg, transparent, rgba(148,163,184,0.15), transparent)' : 'linear-gradient(90deg, transparent, rgba(100,116,139,0.1), transparent)',
          }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: fontSizes.sm }}>
                {isRateBased
                  ? `Formula: €${Number(formData.pm_unitcosteur || 0).toLocaleString()} × ${formData.pm_quantity || 1}`
                  : `Fixed amount: €${Number(formData.pm_unitcosteur || 0).toLocaleString()}`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Calculated Total</Typography>
              <Paper
                elevation={0}
                sx={{
                  px: 2.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: '#fff', fontSize: fontSizes.md }}>
                  €{computeTotalAmount(formData).toLocaleString()}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Paper>

        {/* Forecast Settings */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
          <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Forecast Spend
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Forecast Spend (EUR)"
              fullWidth
              size="small"
              type="number"
              value={formData.pm_forecastspendeur || 0}
              onChange={(e) => setFormData((f) => ({ ...f, pm_forecastspendeur: Math.max(0, Number(e.target.value)) }))}
              placeholder="Enter forecast amount..."
              slotProps={{
                input: {
                  startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary', fontWeight: 600 }}>€</Typography>,
                  sx: { borderRadius: 1.5 }
                }
              }}
            />
          </Grid>
        </Grid>

        {/* Notes */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <NotesIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Notes
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <TextField
          label="Notes / Comments"
          fullWidth multiline rows={2} size="small"
          value={formData.pm_notes}
          onChange={(e) => setFormData((f) => ({ ...f, pm_notes: e.target.value }))}
          placeholder="Optional notes about this budget line..."
          slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.pm_budgetlinename.trim() || actionLoading}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5, fontWeight: 600 }}
        >
          {actionLoading ? 'Saving...' : editBudget ? 'Update Budget Line' : 'Create Budget Line'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
