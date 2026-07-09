import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Grid, Box, Typography,
  CircularProgress, TextField, Chip, Paper, IconButton, useTheme, alpha
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CloseIcon from '@mui/icons-material/Close'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import BusinessIcon from '@mui/icons-material/Business'

import { fetchProjectDetails, fetchGateReviewById, fetchInitiativeById } from '@/services'
import type { ProjectModel, GateReviewModel, InitiativeModel } from '@/types/dataverse'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles/fontSizes'

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

export const FinancialReviewTaskModal: React.FC<FinancialReviewTaskModalProps> = ({
  open, onClose, gateReviewId, entityType, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [initiative, setInitiative] = useState<InitiativeModel | null>(null)

  const [financeNotes, setFinanceNotes] = useState('')

  const isInitiative = entityType === 'Pipeline'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (isInitiative) {
        const init = await fetchInitiativeById(gateReviewId)
        if (!init) { onError('Initiative not found.'); setLoading(false); return }
        setInitiative(init)
      } else {
        const gr = await fetchGateReviewById(gateReviewId)
        if (!gr) { onError('Gate review not found.'); setLoading(false); return }
        setGateReview(gr)

        const projectId = gr._pm_project_value || (gr as any)._pm_projectlookup_value || (gr as any).pm_project || gr.pm_projectcode
        if (projectId) {
          const proj = await fetchProjectDetails(projectId)
          setProject(proj)
        }
      }
    } catch (err) {
      console.error('Failed to load data for financial review', err)
      onError('Failed to load data for financial review.')
    } finally { setLoading(false) }
  }, [gateReviewId, entityType, onError, isInitiative])

  useEffect(() => {
    if (open) { loadData(); setFinanceNotes('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Endorsed' : 'Rejected'
      // Instead of manual API updates for notes, we rely on the workflow DecisionBox to capture them natively.
      onSuccess(`Financial Task completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      onError('Failed to save Financial decision.')
      return false
    } finally { setSaving(false) }
  }, [onSuccess, onError])

  if (!open) return null

  const entityTitle = isInitiative ? initiative?.pm_name : project?.pm_projectname
  const budget = project?.pm_approvedbudget ?? 0
  const spend = project?.pm_actualcost ?? 0
  const remaining = budget - spend

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Financial Review Task</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
            
            {/* Context Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                {isInitiative ? 'Initiative Context' : 'Project Context'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {entityTitle || 'Loading...'}
              </Typography>


              <Grid container spacing={2.5}>
                {isInitiative ? (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Estimated Cost</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                        {initiative?.pm_estimatedcost != null ? currencyFormatter.format(initiative.pm_estimatedcost) : '—'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Estimated Benefits</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace', color: 'success.main' }}>
                        {initiative?.pm_estimatedbenefits != null ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '—'}
                      </Typography>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Approved Budget</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                        {currencyFormatter.format(budget)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Actual Cost</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                        {currencyFormatter.format(spend)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Remaining Budget</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace', color: remaining < 0 ? 'error.main' : 'success.main' }}>
                        {currencyFormatter.format(remaining)}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>

            {/* Financial Health Checklist */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Financial Health Assessment
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isInitiative
                  ? "Review the initiative's estimated costs and benefits. Assess financial viability before progressing through the pipeline."
                  : "Review the project's financial health. Ensure that the budget requested for the upcoming phase is realistic and that previous phase spending is accounted for."}
              </Typography>

              <TextField
                fullWidth multiline rows={4}
                label="Financial Assessment Notes"
                placeholder="Enter financial clearance notes, concerns, or budget conditions. These will be appended to your decision."
                value={financeNotes}
                onChange={(e) => setFinanceNotes(e.target.value)}
              />
            </Paper>

          </Box>
        )}
      </DialogContent>

      {/* Decision Box */}
      {!loading && DecisionBoxProp && approvalStepId && (
        <DecisionBoxProp 
          approvalStepId={approvalStepId} 
          onBeforeDecision={saveTaskData}
          onDecisionComplete={(decision) => {
            onSuccess(`Financial Task completed.`)
            onClose()
          }}
          onDecisionError={(msg) => onError(msg)}
          disabled={saving}
        />
      )}
    </Dialog>
  )
}

export default FinancialReviewTaskModal
