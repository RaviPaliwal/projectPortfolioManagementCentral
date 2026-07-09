import React, { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  FormControl, InputLabel, Select, MenuItem, Rating, Slider,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GavelIcon from '@mui/icons-material/Gavel'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import DescriptionIcon from '@mui/icons-material/Description'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { fetchInitiativeById, updateInitiative, fetchInitiatives, updateInitiativeStatus } from '@/services/initiative.service'
import { fetchPortfolioHierarchy } from '@/services'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import { StatusTag, Button } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles'

interface PipelineDecisionTaskModalProps {
  open: boolean
  onClose: () => void
  initiativeId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const OUTCOME_OPTIONS = [
  { value: 0, label: 'Approved', description: 'Initiative is approved for conversion to project' },
  { value: 2, label: 'Deferred', description: 'Postpone initiative for later reconsideration' },
  { value: 3, label: 'Rejected', description: 'Initiative does not meet criteria for progression' },
]

export const PipelineDecisionTaskModal: React.FC<PipelineDecisionTaskModalProps> = ({
  open, onClose, initiativeId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initiative, setInitiative] = useState<InitiativeModel | null>(null)
  
  // Scoring & Budget Editing States
  const [estCost, setEstCost] = useState(0)
  const [estBenefits, setEstBenefits] = useState(0)
  const [priorityScore, setPriorityScore] = useState(0)
  const [strategicAlignment, setStrategicAlignment] = useState(0)
  
  // Target Portfolio & Programme Selection States
  const [chosenPortfolioId, setChosenPortfolioId] = useState<string>('')
  const [chosenProgrammeId, setChosenProgrammeId] = useState<string>('')
  
  // Hierarchy & All Initiatives for Budget computation
  const [portfolios, setPortfolios] = useState<PortfolioModel[]>([])
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [allInitiatives, setAllInitiatives] = useState<InitiativeModel[]>([])
  
  // Warning Dialog State & Promise Resolver
  const [showBudgetWarningDialog, setShowBudgetWarningDialog] = useState(false)
  const [warningResolver, setWarningResolver] = useState<((proceed: boolean) => void) | null>(null)
  const [pendingLegacyDecision, setPendingLegacyDecision] = useState<'Approved' | 'Deferred' | 'Rejected' | null>(null)

  const [selectedOutcome, setSelectedOutcome] = useState<number>(0)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [conditions, setConditions] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [init, hierarchy, inits] = await Promise.all([
        fetchInitiativeById(initiativeId),
        fetchPortfolioHierarchy(),
        fetchInitiatives()
      ])
      if (!init) { onError('Initiative not found.'); setLoading(false); return }
      setInitiative(init)
      setEstCost(init.pm_estimatedcost ?? 0)
      setEstBenefits(init.pm_estimatedbenefits ?? 0)
      setPriorityScore(init.pm_priorityscore ?? 0)
      setStrategicAlignment((init.pm_strategicalignmentscore ?? 0) / 20)
      setChosenPortfolioId(init._pm_portfolio_value ?? '')
      setChosenProgrammeId(init._pm_programme_value ?? '')
      
      setPortfolios(hierarchy.portfolios)
      setProgrammes(hierarchy.programmes)
      setProjects(hierarchy.projects)
      setAllInitiatives(inits)
    } catch (err) {
      onError('Failed to load initiative details.')
    } finally { setLoading(false) }
  }, [initiativeId, onError])

  useEffect(() => {
    if (open) { 
      loadData()
      setSelectedOutcome(0)
      setDecisionNotes('')
      setConditions('')
      setChosenPortfolioId('')
      setChosenProgrammeId('')
      setShowBudgetWarningDialog(false)
      setWarningResolver(null)
      setPendingLegacyDecision(null) 
    }
  }, [open, loadData])

  const parentBudgetInfo = useMemo(() => {
    if (!initiative) return null
    const type = initiative.pm_initiativetype

    if (type === 0) {
      // Initiative is a Project: parent is a Programme
      if (!chosenProgrammeId) return null
      const selectedProg = programmes.find((p) => p.pm_programmeid === chosenProgrammeId)
      if (!selectedProg) return null

      const parentBudget = selectedProg.pm_budgeteur ?? 0
      // Sum of child projects under this programme
      const childProjectBudgets = projects
        .filter((p) => p._pm_programme_value === chosenProgrammeId)
        .reduce((s, p) => s + (p.pm_approvedbudget ?? 0), 0)
      // Sum of other Project initiatives under this programme (exclude current initiative)
      const childInitiativeCosts = allInitiatives
        .filter((i) => i.pm_initiativetype === 0 && i._pm_programme_value === chosenProgrammeId && i.pm_initiativeid !== initiative.pm_initiativeid)
        .reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)

      const usedBudget = childProjectBudgets + childInitiativeCosts
      const availableBudget = Math.max(0, parentBudget - usedBudget)

      return {
        label: 'Programme',
        parentBudget,
        usedBudget,
        availableBudget,
      }
    } else if (type === 1) {
      // Initiative is a Programme: parent is a Portfolio
      if (!chosenPortfolioId) return null
      const selectedPortfolio = portfolios.find((p) => p.pm_portfolioid === chosenPortfolioId)
      if (!selectedPortfolio) return null

      const parentBudget = selectedPortfolio.pm_approvedbudgeteur ?? 0
      // Sum of child programmes under this portfolio
      const childProgrammeBudgets = programmes
        .filter((p) => p._pm_portfolio_value === chosenPortfolioId)
        .reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)
      // Sum of other Programme initiatives under this portfolio (exclude current initiative)
      const childInitiativeCosts = allInitiatives
        .filter((i) => i.pm_initiativetype === 1 && i._pm_portfolio_value === chosenPortfolioId && i.pm_initiativeid !== initiative.pm_initiativeid)
        .reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)

      const usedBudget = childProgrammeBudgets + childInitiativeCosts
      const availableBudget = Math.max(0, parentBudget - usedBudget)

      return {
        label: 'Portfolio',
        parentBudget,
        usedBudget,
        availableBudget,
      }
    }

    return null
  }, [initiative, chosenProgrammeId, chosenPortfolioId, portfolios, programmes, projects, allInitiatives])

  const hasBudgetError = parentBudgetInfo !== null && estCost > parentBudgetInfo.availableBudget

  const filteredProgrammes = useMemo(() => {
    if (!chosenPortfolioId) return programmes
    return programmes.filter((p) => p._pm_portfolio_value === chosenPortfolioId)
  }, [chosenPortfolioId, programmes])

  const handlePortfolioChange = (portfolioId: string) => {
    setChosenPortfolioId(portfolioId)
    const prog = programmes.find((p) => p.pm_programmeid === chosenProgrammeId)
    if (prog && prog._pm_portfolio_value !== portfolioId) {
      setChosenProgrammeId('')
    }
  }

  const executeSaveTaskData = async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const payload: Partial<InitiativeModel> = {
        pm_estimatedcost: estCost,
        pm_estimatedbenefits: estBenefits,
        pm_priorityscore: priorityScore,
        pm_strategicalignmentscore: Math.round(strategicAlignment * 20),
      }
      if (chosenPortfolioId !== (initiative?._pm_portfolio_value ?? '')) {
        payload._pm_portfolio_value = chosenPortfolioId || undefined
      }
      if (chosenProgrammeId !== (initiative?._pm_programme_value ?? '')) {
        payload._pm_programme_value = chosenProgrammeId || undefined
      }

      await updateInitiative(initiativeId, payload)

      await updateInitiativeStatus(initiativeId, selectedOutcome)
      const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label ?? 'Unknown'
      onSuccess(`Pipeline Decision recorded. Outcome: ${outcomeLabel}.`)
      return true
    } catch (err) {
      onError('Failed to record pipeline decision.')
      return false
    } finally { setSaving(false) }
  }

  const saveTaskData = useCallback((workflowDecision: number): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (!hasBudgetError) {
        executeSaveTaskData(workflowDecision).then(resolve)
        return
      }

      setShowBudgetWarningDialog(true)
      setWarningResolver(() => (proceed: boolean) => {
        if (proceed) {
          executeSaveTaskData(workflowDecision).then(resolve)
        } else {
          resolve(false)
        }
      })
    })
  }, [hasBudgetError, estCost, estBenefits, priorityScore, strategicAlignment, initiative?._pm_portfolio_value, initiative?._pm_programme_value, selectedOutcome, chosenPortfolioId, chosenProgrammeId])

  const executeLegacyDecision = async (decision: 'Approved' | 'Deferred' | 'Rejected') => {
    setSaving(true)
    try {
      const payload: Partial<InitiativeModel> = {
        pm_estimatedcost: estCost,
        pm_estimatedbenefits: estBenefits,
        pm_priorityscore: priorityScore,
        pm_strategicalignmentscore: Math.round(strategicAlignment * 20),
      }
      if (chosenPortfolioId !== (initiative?._pm_portfolio_value ?? '')) {
        payload._pm_portfolio_value = chosenPortfolioId || undefined
      }
      if (chosenProgrammeId !== (initiative?._pm_programme_value ?? '')) {
        payload._pm_programme_value = chosenProgrammeId || undefined
      }

      await updateInitiative(initiativeId, payload)
      const outcomeVal = decision === 'Approved' ? 0 : (decision === 'Deferred' ? 2 : 3)
      await updateInitiativeStatus(initiativeId, outcomeVal)
      onSuccess(`Pipeline Decision recorded. Outcome: ${decision}.`)
      onClose()
    } catch (err) {
      onError('Failed to record pipeline decision.')
    } finally { setSaving(false) }
  }

  const handleLegacyDecision = useCallback(async () => {
    const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome)?.label as 'Approved' | 'Deferred' | 'Rejected' || 'Approved'
    if (hasBudgetError) {
      setPendingLegacyDecision(outcomeLabel)
      setShowBudgetWarningDialog(true)
      return
    }
    executeLegacyDecision(outcomeLabel)
  }, [hasBudgetError, estCost, estBenefits, priorityScore, strategicAlignment, initiative?._pm_portfolio_value, initiative?._pm_programme_value, selectedOutcome, chosenPortfolioId, chosenProgrammeId])

  if (!open) return null

  return (
    <>
      <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GavelIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Pipeline Decision & Scoring</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Pending Final Decision" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: '24px !important', bgcolor: 'background.default' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Initiative Context Details Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                  Initiative Context
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                  {initiative?.pm_name || 'Loading...'}
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Business Sponsor</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{initiative?.pm_requestedbyname || 'Unassigned'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Submitted Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {initiative?.pm_submissiondate ? new Date(initiative.pm_submissiondate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Initiative Type</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {initiative?.pm_initiativetype != null ? (
                        <StatusTag
                          label={initiative.pm_initiativetype === 0 ? 'Project' : initiative.pm_initiativetype === 1 ? 'Programme' : initiative.pm_initiativetype === 2 ? 'Portfolio' : 'Unknown'}
                          color={initiative.pm_initiativetype === 0 ? 'primary' : initiative.pm_initiativetype === 1 ? 'secondary' : 'info'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Not specified</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {initiative?.pm_initiativetype !== 2 && (
                  <>
                    <Divider sx={{ my: 2.5 }} />
                    {/* Target Portfolio & Programme Selectors */}
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, sm: initiative?.pm_initiativetype === 1 ? 12 : 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="decision-portfolio-label">Target Portfolio</InputLabel>
                          <Select
                            labelId="decision-portfolio-label"
                            label="Target Portfolio"
                            value={chosenPortfolioId}
                            onChange={(e) => handlePortfolioChange(e.target.value)}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {portfolios.map((p) => (
                              <MenuItem key={p.pm_portfolioid} value={p.pm_portfolioid}>
                                {p.pm_portfolioname}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      {initiative?.pm_initiativetype === 0 && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="decision-programme-label">Target Programme</InputLabel>
                            <Select
                              labelId="decision-programme-label"
                              label="Target Programme"
                              value={chosenProgrammeId}
                              onChange={(e) => setChosenProgrammeId(e.target.value)}
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {filteredProgrammes.map((p) => (
                                <MenuItem key={p.pm_programmeid} value={p.pm_programmeid}>
                                  {p.pm_programmename}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                    </Grid>
                  </>
                )}
              </Paper>

              {/* Scoring & Evaluation Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LightbulbIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Scoring & Strategic Evaluation
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                      Strategic Alignment (1-5 Stars)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Rating
                        value={strategicAlignment}
                        onChange={(_, v) => setStrategicAlignment(v ?? 0)}
                        precision={0.5}
                        max={5}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                        {strategicAlignment.toFixed(1)} / 5.0
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1.5 }}>
                      Priority Score (0 - 100)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 1 }}>
                      <Slider
                        value={priorityScore}
                        onChange={(_, v) => setPriorityScore(v as number)}
                        min={0}
                        max={100}
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', minWidth: 40, textAlign: 'right' }}>
                        {priorityScore}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Business Case Paper */}
              {initiative?.pm_businesscase && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16 }} /> Business Case
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {initiative.pm_businesscase}
                  </Paper>
                </Box>
              )}

              {/* Financial Editor */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MonetizationOnIcon sx={{ fontSize: 16, color: 'success.main' }} /> Financial Summary
                </Typography>
                <Grid container spacing={2.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Estimated Cost (EUR)"
                      type="number"
                      size="small"
                      fullWidth
                      value={estCost}
                      onChange={(e) => setEstCost(Number(e.target.value))}
                      slotProps={{
                        input: { sx: { borderRadius: 1.5 } },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Estimated Benefits (EUR)"
                      type="number"
                      size="small"
                      fullWidth
                      value={estBenefits}
                      onChange={(e) => setEstBenefits(Number(e.target.value))}
                      slotProps={{
                        input: { sx: { borderRadius: 1.5 } },
                      }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), border: '1px dashed', borderColor: alpha(theme.palette.success.main, 0.2), borderRadius: 1.5 }}>
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>Computed Net Business Value</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace', color: estBenefits - estCost >= 0 ? 'success.main' : 'error.main' }}>
                    {currencyFormatter.format(estBenefits - estCost)}
                  </Typography>
                </Box>
              </Paper>

              {/* Parent Budget Allocation Card */}
              {parentBudgetInfo && (() => {
                const allocatedPct = Math.min(100, Math.round((parentBudgetInfo.usedBudget / parentBudgetInfo.parentBudget) * 100))
                const isOverBudget = parentBudgetInfo.availableBudget <= 0
                return (
                  <Paper variant="outlined" sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50' }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                      <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} /> {parentBudgetInfo.label} Budget Allocation
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>{parentBudgetInfo.label} Budget</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.md }}>
                          {currencyFormatter.format(parentBudgetInfo.parentBudget)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Allocated</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'warning.main', fontSize: fontSizes.md }}>
                          {currencyFormatter.format(parentBudgetInfo.usedBudget)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Available Remaining</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: isOverBudget ? 'error.main' : 'success.main', fontSize: fontSizes.lg }}>
                          {currencyFormatter.format(parentBudgetInfo.availableBudget)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Allocation Usage</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{allocatedPct}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={allocatedPct} 
                        color={isOverBudget ? 'error' : allocatedPct > 80 ? 'warning' : 'success'} 
                        sx={{ height: 10, borderRadius: 5 }} 
                      />
                    </Box>

                    {isOverBudget && (
                      <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
                        ⚠️ No remaining budget in this {parentBudgetInfo.label.toLowerCase()}.
                      </Typography>
                    )}
                  </Paper>
                )
              })()}

              {/* Legacy outcome inputs (when NOT rendered inside standard DecisionBox wrapper) */}
              {!DecisionBoxProp && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Record Decision Outcome</Typography>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Outcome</InputLabel>
                        <Select
                          value={selectedOutcome}
                          label="Outcome"
                          onChange={(e) => setSelectedOutcome(Number(e.target.value))}
                        >
                          {OUTCOME_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{opt.label}</Typography>
                                <Typography variant="caption" color="text.secondary">{opt.description}</Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Decision Notes"
                        multiline rows={4}
                        fullWidth
                        size="small"
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Provide the rationale for this decision..."
                      />
                    </Grid>
                    {selectedOutcome === 2 && (
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Deferral Conditions"
                          multiline rows={3}
                          fullWidth
                          size="small"
                          value={conditions}
                          onChange={(e) => setConditions(e.target.value)}
                          placeholder="What conditions must be met before this initiative can be reconsidered?"
                          sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'warning.main' } } }}
                        />
                      </Grid>
                    )}
                    {selectedOutcome === 0 && (
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Approval Conditions (optional)"
                          multiline rows={2}
                          fullWidth
                          size="small"
                          value={conditions}
                          onChange={(e) => setConditions(e.target.value)}
                          placeholder="Any conditions or prerequisites for conversion?"
                        />
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          {DecisionBoxProp && approvalStepId ? (
            <DecisionBoxProp
              approvalStepId={approvalStepId}
              onBeforeDecision={saveTaskData}
              onDecisionComplete={(decision) => {
                dispatchFormDialogDecision({ formKey: 'pipeline_decision', decision })
                onClose()
              }}
              onDecisionError={(msg) => onError(msg)}
              disabled={loading || saving}
            />
          ) : (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="outlined" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="contained" color="success" disabled={loading || saving} onClick={handleLegacyDecision} sx={{ fontWeight: 600 }}>
                {saving ? 'Processing...' : 'Submit Decision'}
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* Budget Warning Dialog */}
      <Dialog
        open={showBudgetWarningDialog}
        onClose={() => {
          setShowBudgetWarningDialog(false)
          if (warningResolver) {
            warningResolver(false)
            setWarningResolver(null)
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main', fontWeight: 700 }}>
          <WarningAmberIcon color="warning" /> Budget Limit Warning
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            The edited estimated cost of this initiative exceeds the available {parentBudgetInfo ? parentBudgetInfo.label.toLowerCase() : 'parent'} budget by <strong>{parentBudgetInfo ? currencyFormatter.format(estCost - parentBudgetInfo.availableBudget) : ''}</strong>.
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Do you still want to proceed and submit your decision?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setShowBudgetWarningDialog(false)
              if (warningResolver) {
                warningResolver(false)
                setWarningResolver(null)
              }
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowBudgetWarningDialog(false)
              if (warningResolver) {
                warningResolver(true)
                setWarningResolver(null)
              } else if (pendingLegacyDecision !== null) {
                executeLegacyDecision(pendingLegacyDecision)
              }
            }}
            variant="contained"
            color="warning"
            sx={{ fontWeight: 600 }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}