import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Box,
  Typography,
  CircularProgress,
  TextField,
  Divider,
  Chip,
  Paper,
  IconButton,
  useTheme,
  alpha
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CloseIcon from '@mui/icons-material/Close'
import BusinessIcon from '@mui/icons-material/Business'
import FlagIcon from '@mui/icons-material/Flag'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningIcon from '@mui/icons-material/Warning'

import { fetchProjectDetails, updateGateReview, fetchGateReviewById, fetchInitiativeById } from '@/services'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectModel, GateReviewModel, InitiativeModel } from '@/types/dataverse'
import { StatusTag, Button } from '@/components/common'
import { fontSizes } from '@/styles/fontSizes'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface FinancialReviewTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  entityType?: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

function ragLabel(value: string | number | undefined | null): string {
  const s = String(value ?? '')
  if (s === '1') return 'On Track'
  if (s === '0') return 'At Risk'
  if (s === '2') return 'Critical'
  return 'Not Rated'
}

function ragColor(value: string | number | undefined | null): 'success' | 'warning' | 'error' | 'default' {
  const s = String(value ?? '')
  if (s === '1') return 'success'
  if (s === '0') return 'warning'
  if (s === '2') return 'error'
  return 'default'
}

export const FinancialReviewTaskModal: React.FC<FinancialReviewTaskModalProps> = ({
  open,
  onClose,
  gateReviewId,
  entityType,
  onSuccess,
  onError,
  DecisionBox: DecisionBoxProp,
  approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [initiative, setInitiative] = useState<InitiativeModel | null>(null)

  const [financeNotes, setFinanceNotes] = useState('')

  console.log('[FinancialReviewTaskModal] ≡ƒƒ¬ Component mounted/rendered with props:', {
    open,
    gateReviewId,
    entityType,
    approvalStepId,
    hasDecisionBox: !!DecisionBoxProp,
  })

  const isInitiative = entityType === 'Pipeline'

  console.log('[FinancialReviewTaskModal] ≡ƒƒ¬ isInitiative resolved to:', isInitiative, '| entityType:', entityType)

  const loadData = useCallback(async () => {
    console.log('[FinancialReviewTaskModal] ΓÅ│ loadData started for ID:', gateReviewId, 'entityType:', entityType, 'isInitiative:', isInitiative)
    setLoading(true)
    try {
      if (isInitiative) {
        // ΓöÇΓöÇ Initiative (Pipeline) mode ΓöÇΓöÇ
        console.log('[FinancialReviewTaskModal] ≡ƒöì Initiative mode: fetching initiative by ID...')
        const init = await fetchInitiativeById(gateReviewId)
        console.log('[FinancialReviewTaskModal] Γ£à Initiative result:', init ? {
          pm_initiativeid: init.pm_initiativeid,
          pm_name: init.pm_name,
          pm_estimatedcost: init.pm_estimatedcost,
          pm_estimatedbenefits: init.pm_estimatedbenefits,
        } : 'null')

        if (!init) {
          console.warn('[FinancialReviewTaskModal] Γ¥î Initiative not found for ID:', gateReviewId)
          onError('Initiative not found.')
          setLoading(false)
          return
        }
        setInitiative(init)
        console.log('[FinancialReviewTaskModal] Γ£à loadData (initiative) completed')
      } else {
        // ΓöÇΓöÇ Gate Review mode ΓöÇΓöÇ
        console.log('[FinancialReviewTaskModal] ≡ƒöì Gate review mode: fetching gate review by ID...')
        const gr = await fetchGateReviewById(gateReviewId)
        console.log('[FinancialReviewTaskModal] Γ£à Gate review result:', gr ? { pm_projectgatereviewid: gr.pm_projectgatereviewid, _pm_project_value: gr._pm_project_value, pm_gatename: gr.pm_gatename } : 'null')

        if (!gr) {
          console.warn('[FinancialReviewTaskModal] Γ¥î Gate review not found for ID:', gateReviewId)
          onError('Gate review not found.')
          setLoading(false)
          return
        }
        setGateReview(gr)

        const projectId = gr._pm_project_value ||
                          (gr as any)._pm_projectlookup_value ||
                          (gr as any).pm_project ||
                          gr.pm_projectcode

        console.log('[FinancialReviewTaskModal] Γ£à Resolved projectId:', projectId)

        if (!projectId) {
          console.warn('[FinancialReviewTaskModal] Γ¥î No project ID found on gate review.')
          setLoading(false)
          return
        }

        console.log('[FinancialReviewTaskModal] ≡ƒöì Fetching project details for projectId:', projectId)
        const proj = await fetchProjectDetails(projectId)
        console.log('[FinancialReviewTaskModal] Γ£à Project result:', proj ? {
          pm_projectid: proj.pm_projectid,
          pm_projectname: proj.pm_projectname,
          pm_approvedbudgeteur: proj.pm_approvedbudgeteur,
          pm_actualcosteur: proj.pm_actualcosteur,
          pm_costragstatus: proj.pm_costragstatus,
        } : 'null')

        if (!proj) {
          console.warn('[FinancialReviewTaskModal] Γ¥î Project not found for projectId:', projectId)
        }
        setProject(proj)

        console.log('[FinancialReviewTaskModal] Γ£à loadData (gate review) completed')
      }
    } catch (err) {
      console.error('[FinancialReviewTaskModal] Γ¥î loadData failed:', err)
      onError('Failed to load data for financial review.')
    } finally {
      setLoading(false)
    }
  }, [gateReviewId, entityType, onError, isInitiative])

  useEffect(() => {
    if (open) {
      console.log('[FinancialReviewTaskModal] ≡ƒƒó Dialog opened, triggering loadData')
      loadData()
      setFinanceNotes('')
    } else {
      console.log('[FinancialReviewTaskModal] ≡ƒö┤ Dialog closed')
    }
  }, [open, loadData])

  /**
   * Save task-specific data before the workflow decision is submitted.
   * For gate reviews: save notes to the gate review.
   * For initiatives: save notes is skipped (no notes field on initiative).
   */
  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    console.log('[FinancialReviewTaskModal] saveTaskData: workflowDecision=' + workflowDecision + ', notes length=' + financeNotes.length + ', isInitiative=' + isInitiative)
    setSaving(true)
    try {
      if (isInitiative) {
        // Initiative mode: no entity-level persistence for notes; workflow decision is enough
        console.log('[FinancialReviewTaskModal] saveTaskData: initiative mode ΓÇö no notes persistence needed')
        const decisionLabel = workflowDecision === 0 ? 'Endorsed' : 'Rejected'
        onSuccess(`Financial Task completed. Decision: ${decisionLabel}.`)
        return true
      }

      if (!gateReview?.pm_projectgatereviewid) {
        console.warn('[FinancialReviewTaskModal] saveTaskData: no gate review ID')
        return false
      }
      const decisionLabel = workflowDecision === 0 ? 'Endorsed' : 'Rejected'
      const existingNotes = gateReview.pm_reviewnotes || ''
      const newEntry = `\n\n--- Financial Review Task ---\nDecision: ${decisionLabel}\nDate: ${new Date().toLocaleDateString()}\nNotes:\n${financeNotes || 'No additional notes provided.'}`

      console.log('[FinancialReviewTaskModal] saveTaskData: updating gate review with decision')
      await updateGateReview(gateReview.pm_projectgatereviewid, {
        pm_reviewnotes: existingNotes + newEntry,
      } as any)

      console.log('[FinancialReviewTaskModal] saveTaskData: update succeeded')
      onSuccess(`Financial Task completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      console.error('[FinancialReviewTaskModal] saveTaskData: failed', err)
      onError('Failed to save Financial decision.')
      return false
    } finally {
      setSaving(false)
    }
  }, [gateReview, financeNotes, onSuccess, onError, isInitiative])

  /** Legacy decision handler for direct usage (not via FormDialog/workflow). */
  const handleLegacyDecision = useCallback(async (decision: 'Endorsed' | 'Rejected') => {
    if (!isInitiative && !gateReview?.pm_projectgatereviewid) return
    console.log('[FinancialReviewTaskModal] handleLegacyDecision: decision=' + decision)
    setSaving(true)
    try {
      if (!isInitiative && gateReview?.pm_projectgatereviewid) {
        const existingNotes = gateReview.pm_reviewnotes || ''
        const newEntry = `\n\n--- Financial Review Task ---\nDecision: ${decision}\nDate: ${new Date().toLocaleDateString()}\nNotes:\n${financeNotes || 'No additional notes provided.'}`
        await updateGateReview(gateReview.pm_projectgatereviewid, {
          pm_reviewnotes: existingNotes + newEntry,
        } as any)
      }

      onSuccess(`Financial Task completed. Decision: ${decision}.`)
      onClose()
    } catch (err) {
      console.error('[FinancialReviewTaskModal] handleLegacyDecision: failed', err)
      onError('Failed to save Financial decision.')
    } finally {
      setSaving(false)
    }
  }, [gateReview, financeNotes, onSuccess, onClose, onError, isInitiative])

  const budget = project?.pm_approvedbudgeteur ?? 0
  const spend = project?.pm_actualcosteur ?? 0
  const remaining = budget - spend
  const spendPct = budget > 0 ? ((spend / budget) * 100) : 0

  const entityTitle = initiative?.pm_name || project?.pm_projectname || gateReview?.pm_gatename || ''

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceIcon sx={{ color: 'secondary.main' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Financial Review Task</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>
              {entityTitle}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Financial Review" color="warning" size="small" sx={{ fontWeight: 600 }} />
          <IconButton size="small" onClick={onClose} disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container>
            {/* Left Panel: Financial Context */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 1.5, display: 'block' }}>
                <BusinessIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mr: 0.5 }} /> {isInitiative ? 'Initiative' : 'Project'} Context
              </Typography>

              {initiative ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ width: 40, height: 40, bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%' }}>
                      <BusinessIcon sx={{ color: 'secondary.main' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{initiative.pm_name || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">Initiative</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Req: {initiative.pm_requestorname || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Submitted by: {initiative.pm_createdbyname || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FlagIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{ragLabel(initiative.pm_pipelinestatus)}</Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoneyIcon fontSize="small" /> Estimated Cost
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: '"JetBrains Mono", monospace' }}>
                        {initiative.pm_estimatedcost != null ? currencyFormatter.format(initiative.pm_estimatedcost) : '—'}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 14 }} /> Estimated Benefits
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', fontFamily: '"JetBrains Mono", monospace' }}>
                        {initiative.pm_estimatedbenefits != null ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '—'}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Priority Score</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {initiative.pm_priorityscore ?? '—'}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Strategic Alignment Score</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {initiative.pm_strategicalignmentscore ?? '—'}
                      </Typography>
                    </Paper>
                  </Box>
                </>
              ) : project ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ width: 40, height: 40, bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%' }}>
                      <BusinessIcon sx={{ color: 'secondary.main' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{project.pm_projectname || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{project.pm_projectcode || '—'}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{project.pm_projectmanagername || '—'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FlagIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{ragLabel(project.pm_projectphase)}</Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoneyIcon fontSize="small" /> Approved Budget
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: '"JetBrains Mono", monospace' }}>
                        {currencyFormatter.format(budget)}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                        {currencyFormatter.format(spend)}
                      </Typography>
                      {budget > 0 && (
                        <Box sx={{ mt: 0.5, width: '100%', height: 4, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.divider, 0.4) : '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <Box sx={{ width: `${Math.min(spendPct, 100)}%`, height: '100%', bgcolor: spendPct > 90 ? 'error.main' : spendPct > 75 ? 'warning.main' : 'success.main', borderRadius: 2, transition: 'width 0.3s ease' }} />
                        </Box>
                      )}
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Remaining Budget</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: remaining < 0 ? 'error.main' : 'success.main', fontFamily: '"JetBrains Mono", monospace' }}>
                        {currencyFormatter.format(remaining)}
                      </Typography>
                      {remaining < 0 && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <WarningIcon sx={{ fontSize: 12 }} /> Over budget
                        </Typography>
                      )}
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Cost RAG</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <StatusTag
                              label={ragLabel(project.pm_costragstatus)}
                              color={ragColor(project.pm_costragstatus) as any}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">Overall RAG</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <StatusTag
                              label={ragLabel(project.pm_ragstatus)}
                              color={ragColor(project.pm_ragstatus) as any}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 14 }} /> Spend vs Budget
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: spendPct > 90 ? 'error.main' : spendPct > 75 ? 'warning.main' : 'text.primary' }}>
                        {budget > 0 ? spendPct.toFixed(1) + '%' : 'N/A'}
                      </Typography>
                    </Paper>
                  </Box>
                </>
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="error.main" variant="body2">
                    Data not available. Check debug logs.
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Right Panel: Assessment */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Financial Assessment</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isInitiative ? (
                  <>Initiative: <strong>{initiative?.pm_name || '—'}</strong></>
                ) : (
                  <>Gate: <strong>{gateReview?.pm_gatename || '—'}</strong>
                  {gateReview?.pm_gatestage ? ` | Stage: ${gateReview.pm_gatestage}` : ''}
                  {gateReview?.pm_reviewstatus ? ` | Status: ${gateReview.pm_reviewstatus}` : ''}</>
                )}
              </Typography>

              <Divider sx={{ mb: 2.5 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {isInitiative
                  ? "Review the initiative's estimated costs and benefits. Assess financial viability before progressing through the pipeline."
                  : "Review the project's financial health. Ensure that the budget requested for the upcoming phase is realistic and that previous phase spending is accounted for."}
              </Typography>

              <TextField
                fullWidth multiline rows={6}
                label="Financial Assessment Notes"
                placeholder="Enter financial clearance notes, concerns, or budget conditions..."
                value={financeNotes}
                onChange={(e) => setFinanceNotes(e.target.value)}
              />

              <Box sx={{ mt: 2.5, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.warning.light, 0.2), border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.2) : alpha(theme.palette.warning.light, 0.4), borderRadius: 1 }}>
                 <Typography variant="body2" color="warning.main" sx={{ fontSize: fontSizes.xs }}>
                  <strong>Note:</strong> Endorsing the financials does not approve the gate review. It provides clearance for the Governance Board to make the final decision.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexDirection: 'column', alignItems: 'stretch', gap: 1.5 }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'financial_review', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading || saving}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              variant="outlined"
              color="error"
              disabled={loading || saving}
              onClick={() => handleLegacyDecision('Rejected')}
              sx={{ fontWeight: 600, minWidth: 140 }}
            >
              Reject Financials
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={loading || saving || !financeNotes.trim()}
              onClick={() => handleLegacyDecision('Endorsed')}
              sx={{ fontWeight: 600, minWidth: 160 }}
            >
              {saving ? 'Processing...' : 'Endorse Financials'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  )
}
