import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Alert,
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
  fetchBudgetLines,
} from '@/services'
import { fetchProjectDetails } from '@/services/project.service'
import { useUser } from '@/context/UserContext'
import { sendNotificationToUser } from '@/services/notification.service'
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
  const { currentUser } = useUser()
  const [currentProject, setCurrentProject] = useState<any | null>(null)
  const [existingBudgetLines, setExistingBudgetLines] = useState<BudgetLineModel[]>([])

  const [allocations, setAllocations] = useState<{ [fundingsourceid: string]: number }>({})
  const [allocationsLoading, setAllocationsLoading] = useState(false)

  const availableFundingSources = useMemo(() => {
    const projId = formData._pm_project_value
    if (!projId) {
      console.log('[Funding debug] No projId selected');
      return []
    }
    const project = projectLookups.find(p => normalizeGuid(p.pm_projectid) === projId)
    const progId = project ? normalizeGuid(project._pm_programme_value) : formData._pm_programmelookup_value
    let portId = project ? normalizeGuid(project._pm_portfolio_value) : formData._pm_portfoliolookup_value

    if (!portId && progId) {
      const parentProg = programmeLookups.find(p => normalizeGuid(p.pm_programmeid) === progId)
      if (parentProg) {
        portId = normalizeGuid(parentProg._pm_portfolio_value)
      }
    }

    console.log('[Funding debug] Project resolved:', { projId, progId, portId, project })
    console.log('[Funding debug] Total funding sources loaded:', fundingSources.length)

    const filtered = fundingSources.filter((source) => {
      const regardingId = normalizeGuid(source._pm_regardingid_value)
      if (!regardingId) return false

      let regardingType = source.pm_regardingidtype || ''
      if (!regardingType) {
        if (projectLookups.some(p => normalizeGuid(p.pm_projectid) === regardingId)) {
          regardingType = 'pm_projects'
        } else if (programmeLookups.some(p => normalizeGuid(p.pm_programmeid) === regardingId)) {
          regardingType = 'pm_programmes'
        } else if (portfolioLookups.some(p => normalizeGuid(p.pm_portfolioid) === regardingId)) {
          regardingType = 'pm_portfolios'
        }
      }

      const isProjectMatch = regardingType === 'pm_projects' && regardingId === projId
      const isProgrammeMatch = regardingType === 'pm_programmes' && regardingId === progId
      const isPortfolioMatch = regardingType === 'pm_portfolios' && regardingId === portId

      const isMatch = isProjectMatch || isProgrammeMatch || isPortfolioMatch
      console.log(`[Funding debug] Source: ${source.pm_fundingsourcename}, regardingId: ${regardingId}, regardingType: ${regardingType}, isMatch: ${isMatch}`, { isProjectMatch, isProgrammeMatch, isPortfolioMatch })
      return isMatch
    })

    if (filtered.length === 0 && fundingSources.length > 0) {
      console.log('[Funding debug] No matches found, falling back to showing all funding sources for local dev support.', fundingSources)
      return fundingSources
    }

    console.log('[Funding debug] Filtered funding sources:', filtered)
    return filtered
  }, [
    formData._pm_project_value,
    formData._pm_portfoliolookup_value,
    formData._pm_programmelookup_value,
    projectLookups,
    programmeLookups,
    portfolioLookups,
    fundingSources,
  ])

  const getFundRemaining = (source: FundingSourceModel) => {
    const total = source.pm_totalamounteur ?? 0
    const allocated = source.pm_allocatedamounteur ?? 0
    const baseRemaining = Math.max(0, total - allocated)
    const sourceId = normalizeGuid(source.pm_fundingsourceid)
    const currentDraw = editBudget ? (allocations[sourceId] || 0) : 0
    return baseRemaining + currentDraw
  }

  const targetBudget = computeTotalAmount(formData)
  const allocatedSum = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0)
  const unallocated = Math.max(0, targetBudget - allocatedSum)

  const projectBudgetLines = useMemo(() => {
    const projId = formData._pm_project_value || normalizeGuid(prefillProjectId)
    if (!projId) return []
    return existingBudgetLines.filter(line => 
      normalizeGuid(line._pm_project_value) === projId &&
      (!editBudget || normalizeGuid(line.pm_budgetlineid) !== normalizeGuid(editBudget.pm_budgetlineid))
    )
  }, [existingBudgetLines, formData._pm_project_value, prefillProjectId, editBudget])

  const existingAllocatedTotal = useMemo(() => {
    return projectBudgetLines.reduce((sum, line) => sum + (line.pm_approvedbudgeteur || 0), 0)
  }, [projectBudgetLines])

  const approvedBudget = currentProject?.pm_approvedbudget || 0
  const isOverBudget = targetBudget + existingAllocatedTotal > approvedBudget

  const handleAiSuggestSplit = () => {
    const target = computeTotalAmount(formData)
    if (target <= 0) return

    const activeFunds = availableFundingSources.filter(s => {
      const sid = normalizeGuid(s.pm_fundingsourceid)
      return (allocations[sid] || 0) > 0
    })

    const fundsToSplit = activeFunds.length > 0 ? activeFunds : availableFundingSources
    if (fundsToSplit.length === 0) return

    const newAllocations: { [key: string]: number } = {}
    let remainingToAllocate = target

    fundsToSplit.forEach((fund, index) => {
      const sid = normalizeGuid(fund.pm_fundingsourceid)
      const remainingCapacity = getFundRemaining(fund)

      if (index === fundsToSplit.length - 1) {
        newAllocations[sid] = Math.max(0, remainingToAllocate)
      } else {
        const toDraw = Math.min(remainingToAllocate, remainingCapacity)
        newAllocations[sid] = toDraw
        remainingToAllocate -= toDraw
      }
    })

    setAllocations(newAllocations)
  }

  const loadLookups = useCallback(async () => {
    const [portfolios, programmes, projects, sources, lines] = await Promise.all([
      fetchPortfoliosForLookup(),
      fetchProgrammesForLookup(),
      fetchProjectsForLookup(),
      fetchFundingSources(),
      fetchBudgetLines(),
    ])
    setPortfolioLookups(portfolios)
    setProgrammeLookups(programmes)
    setProjectLookups(projects)
    setFundingSources(sources)
    setExistingBudgetLines(lines)
  }, [])

  useEffect(() => {
    if (!open) return
    loadLookups()
    const projId = editBudget ? normalizeGuid(editBudget._pm_project_value) : normalizeGuid(prefillProjectId)
    if (projId) {
      fetchProjectDetails(projId).then(proj => {
        if (proj) setCurrentProject(proj)
      })
    } else {
      setCurrentProject(null)
    }
  }, [open, prefillProjectId, editBudget, loadLookups])

  useEffect(() => {
    const projId = formData._pm_project_value
    if (projId) {
      fetchProjectDetails(projId).then(proj => {
        if (proj) setCurrentProject(proj)
      })
    } else {
      setCurrentProject(null)
    }
  }, [formData._pm_project_value])

  useEffect(() => {
    if (!open) return
    if (editBudget) {
      let calcCode = 0
      let unitCost = editBudget.pm_approvedbudgeteur || editBudget.pm_revisedbudgeteur || 0
      let qty = 1
      let total = editBudget.pm_approvedbudgeteur || editBudget.pm_revisedbudgeteur || 0

      if (editBudget.pm_jsonrawcalculation) {
        try {
          const parsed = JSON.parse(editBudget.pm_jsonrawcalculation)
          calcCode = parsed.costingMethod === 'Rate-Based' ? 1 : 0
          unitCost = parsed.unitCost ?? unitCost
          qty = parsed.quantity ?? qty
          total = parsed.totalAmount ?? total
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
        _pm_portfoliolookup_value: '',
        _pm_programmelookup_value: '',
        _pm_project_value: normalizeGuid(editBudget._pm_project_value),
        pm_notes: editBudget.pm_notes ?? '',
        _pm_fundingsource_value: '',
        pm_approvedbudgeteur: editBudget.pm_approvedbudgeteur ?? 0,
        pm_revisedbudgeteur: editBudget.pm_revisedbudgeteur ?? 0,
        pm_actualspendeur: editBudget.pm_actualspendeur ?? 0,
        pm_committedspendeur: editBudget.pm_committedspendeur ?? 0,
        pm_forecastspendeur: editBudget.pm_forecastspendeur ?? 0,
      })

      if (editBudget.pm_budgetlineid) {
        setAllocationsLoading(true)
        import('@/services').then(({ fetchFundingAllocationsByBudgetline }) => {
          fetchFundingAllocationsByBudgetline(editBudget.pm_budgetlineid!).then((list) => {
            const initialAllocations: { [key: string]: number } = {}
            list.forEach((item) => {
              const fid = normalizeGuid(item._pm_fundingsource_value)
              if (fid) {
                initialAllocations[fid] = item.pm_allocatedamount || 0
              }
            })
            setAllocations(initialAllocations)
            setAllocationsLoading(false)
          }).catch((err) => {
            console.error('[BudgetLineFormDialog] Failed to load allocations:', err)
            setAllocationsLoading(false)
          })
        })
      }
    } else {
      setFormData({ ...DEFAULT_FORM_DATA })
      setAllocations({})

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

      // Roll up the allocated sum from funding sources into approved/revised budget
      payload.pm_approvedbudgeteur = allocatedSum
      payload.pm_revisedbudgeteur = allocatedSum
      payload.pm_forecastspendeur = allocatedSum

      if (!isEdit) {
        payload.pm_actualspendeur = 0
        payload.pm_committedspendeur = 0
        payload.pm_estimateatcompletioneur = totalAmount
        payload.pm_estimatetocompleteeur = totalAmount
      } else {
        const actual = formData.pm_actualspendeur ?? 0
        const committed = formData.pm_committedspendeur ?? 0
        payload.pm_estimateatcompletioneur = actual + committed
      }

      delete payload.pm_jsonrawcalculation
      const calcJson = buildCalculationJson(formData)
      payload.pm_jsonrawcalculation = calcJson

      // Remove deprecated portfolio, programme, and fundingsource properties
      delete payload._pm_portfoliolookup_value
      delete payload._pm_programmelookup_value
      delete payload._pm_fundingsource_value

      let savedRecord: BudgetLineModel | null = null
      if (isEdit && editBudget?.pm_budgetlineid) {
        delete payload.pm_budgetlineid
        const _pm_budgetlineid = editBudget.pm_budgetlineid
        savedRecord = await updateBudgetLine(_pm_budgetlineid, payload)
      } else {
        savedRecord = await createBudgetLine(payload)
      }

      if (savedRecord?.pm_budgetlineid) {
        const { saveFundingAllocations } = await import('@/services')
        const allocationPayload = Object.entries(allocations)
          .map(([fundId, amount]) => ({
            pm_fundingsourceid: fundId,
            pm_allocatedamount: amount,
          }))
          .filter(a => a.pm_allocatedamount > 0)
        await saveFundingAllocations(savedRecord.pm_budgetlineid, allocationPayload)
      }

      // Check if this budget line overrun the approved budget, and send notifications
      if (isOverBudget && currentProject?._pm_projectmanager_value) {
        const pmId = currentProject._pm_projectmanager_value
        const pmName = currentProject.pm_projectmanagername || 'Project Manager'
        const subject = `[Over Budget Alert] Project "${currentProject.pm_projectname}" exceeded approved budget`
        const message = `The budget line "${formData.pm_budgetlinename}" with amount €${targetBudget.toLocaleString()} has been saved by ${currentUser?.fullname ?? 'System'}. This pushes the project over its Approved Budget of €${(currentProject.pm_approvedbudget || 0).toLocaleString()}. A Change Request is mandatory.`

        try {
          await Promise.all([
            sendNotificationToUser(pmId, 'Teams', subject, message),
            sendNotificationToUser(pmId, 'Outlook', subject, message),
          ])
          console.log(`[BudgetLineFormDialog] Successfully sent overrun notification to Project Manager ${pmName}`)
        } catch (notifErr) {
          console.error('[BudgetLineFormDialog] Failed to send over-budget notifications to PM:', notifErr)
        }
      }

      onSaved(savedRecord, isEdit)
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
            <FormControl fullWidth size="small" disabled={!!prefillProjectId}>
              <InputLabel>Project</InputLabel>
              <Select
                value={formData._pm_project_value}
                label="Project"
                onChange={(e) => setFormData((f) => ({ ...f, _pm_project_value: e.target.value }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {projectLookups.map((p) => (
                  <MenuItem key={p.pm_projectid} value={normalizeGuid(p.pm_projectid)}>{p.pm_projectname}</MenuItem>
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

        {/* Real-time Budget Overrun Warning */}
        {isOverBudget && targetBudget > 0 && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 1.5, '& .MuiAlert-message': { fontWeight: 'bold' } }}>
            This budget line pushes the project over its Approved Budget (Approved: €{approvedBudget.toLocaleString()}, Current Total: €{(existingAllocatedTotal + targetBudget).toLocaleString()}). A Change Request is mandatory. Project Manager {currentProject?.pm_projectmanagername || 'PM'} will be notified via email and Teams.
          </Alert>
        )}

        {/* Funding Allocation Section */}
        {formData._pm_project_value && targetBudget > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Funding Allocation
              </Typography>
              <Divider sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                size="small"
                onClick={handleAiSuggestSplit}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                ✨ AI suggest split
              </Button>
            </Box>

            {/* Total Amount Validation Alert */}
            {allocatedSum !== targetBudget && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
                The total allocated funding (€{allocatedSum.toLocaleString()}) must exactly match the calculated budget line amount (€{targetBudget.toLocaleString()}).
              </Alert>
            )}

            {availableFundingSources.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', my: 2 }}>
                No active funding sources found matching this project's hierarchy (portfolio or programme).
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {availableFundingSources.map((source) => {
                  const sid = normalizeGuid(source.pm_fundingsourceid)
                  const isChecked = sid in allocations
                  const remainingCapacity = getFundRemaining(source)
                  const currentAllocVal = allocations[sid] || 0

                  return (
                    <Paper
                      key={sid}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        borderColor: isChecked ? 'success.main' : 'divider',
                        bgcolor: isChecked ? (isDark ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.02)') : 'background.paper',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const total = computeTotalAmount(formData)
                              const allocatedOther = Object.entries(allocations).reduce((sum, [k, v]) => k === sid ? sum : sum + (v || 0), 0)
                              const remainingNeed = Math.max(0, total - allocatedOther)
                              const val = Math.min(remainingNeed, remainingCapacity)
                              setAllocations(prev => ({
                                ...prev,
                                [sid]: val || 0
                              }))
                            } else {
                              setAllocations(prev => {
                                const next = { ...prev }
                                delete next[sid]
                                return next
                              })
                            }
                          }}
                          style={{ marginTop: 4, cursor: 'pointer' }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {source.pm_fundingsourcename}
                            </Typography>
                            {(() => {
                              const projId = formData._pm_project_value
                              const project = projectLookups.find(p => normalizeGuid(p.pm_projectid) === projId)
                              const progId = project ? normalizeGuid(project._pm_programme_value) : formData._pm_programmelookup_value
                              let portId = project ? normalizeGuid(project._pm_portfolio_value) : formData._pm_portfoliolookup_value

                              if (!portId && progId) {
                                const parentProg = programmeLookups.find(p => normalizeGuid(p.pm_programmeid) === progId)
                                if (parentProg) {
                                  portId = normalizeGuid(parentProg._pm_portfolio_value)
                                }
                              }

                              const sourceRegId = normalizeGuid(source._pm_regardingid_value)
                              let sourceRegType = source.pm_regardingidtype || ''
                              let sourceRegName = source.pm_regardingidname || ''

                              if (!sourceRegType && sourceRegId) {
                                const matchedProj = projectLookups.find(p => normalizeGuid(p.pm_projectid) === sourceRegId)
                                if (matchedProj) {
                                  sourceRegType = 'pm_projects'
                                  sourceRegName = matchedProj.pm_projectname
                                } else {
                                  const matchedProg = programmeLookups.find(p => normalizeGuid(p.pm_programmeid) === sourceRegId)
                                  if (matchedProg) {
                                    sourceRegType = 'pm_programmes'
                                    sourceRegName = matchedProg.pm_programmename
                                  } else {
                                    const matchedPort = portfolioLookups.find(p => normalizeGuid(p.pm_portfolioid) === sourceRegId)
                                    if (matchedPort) {
                                      sourceRegType = 'pm_portfolios'
                                      sourceRegName = matchedPort.pm_portfolioname
                                    }
                                  }
                                }
                              }

                              const isHierarchyMatch = (sourceRegType === 'pm_projects' && sourceRegId === projId) ||
                                (sourceRegType === 'pm_programmes' && sourceRegId === progId) ||
                                (sourceRegType === 'pm_portfolios' && sourceRegId === portId)

                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                  {sourceRegType === 'pm_portfolios' && (
                                    <Box sx={{ bgcolor: isHierarchyMatch ? 'primary.main' : 'action.selected', color: isHierarchyMatch ? '#fff' : 'text.secondary', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
                                      Portfolio: {sourceRegName || 'Unknown Portfolio'}
                                    </Box>
                                  )}
                                  {sourceRegType === 'pm_programmes' && (
                                    <Box sx={{ bgcolor: isHierarchyMatch ? 'secondary.main' : 'action.selected', color: isHierarchyMatch ? '#fff' : 'text.secondary', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
                                      Programme: {sourceRegName || 'Unknown Programme'}
                                    </Box>
                                  )}
                                  {sourceRegType === 'pm_projects' && (
                                    <Box sx={{ bgcolor: isHierarchyMatch ? 'info.main' : 'action.selected', color: isHierarchyMatch ? '#fff' : 'text.secondary', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
                                      Project: {sourceRegName || 'Unknown Project'}
                                    </Box>
                                  )}
                                </Box>
                              )
                            })()}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            Total €{(source.pm_totalamounteur || 0).toLocaleString()} • Already allocated €{(source.pm_allocatedamounteur || 0).toLocaleString()} • Remaining €{remainingCapacity.toLocaleString()}
                          </Typography>
                        </Box>

                        {isChecked && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">Amount to draw</Typography>
                            <TextField
                              size="small"
                              type="number"
                              value={currentAllocVal}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(Number(e.target.value), remainingCapacity))
                                setAllocations(prev => ({ ...prev, [sid]: val }))
                              }}
                              sx={{ width: 140 }}
                              slotProps={{
                                input: {
                                  startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>€</Typography>,
                                  sx: { borderRadius: 1.5, height: 32 }
                                }
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Allocated €{allocatedSum.toLocaleString()} of €{targetBudget.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: unallocated > 0 ? 'warning.main' : 'success.main' }}>
                {unallocated > 0 ? `€${unallocated.toLocaleString()} unallocated` : 'Fully Allocated'}
              </Typography>
            </Box>
          </Box>
        )}

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
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.pm_budgetlinename.trim() || actionLoading || allocatedSum !== targetBudget || allocationsLoading}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5, fontWeight: 600 }}
        >
          {actionLoading ? 'Saving...' : editBudget ? 'Update Budget Line' : 'Create Budget Line'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
