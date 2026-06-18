import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PeopleIcon from '@mui/icons-material/People'
import { fetchProjectDetails } from '@/services/project.service'
import type { ProjectModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles'

interface ResourceBudgetPlanningTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const ResourceBudgetPlanningTaskModal: React.FC<ResourceBudgetPlanningTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const proj = await fetchProjectDetails(projectId)
      if (!proj) { onError('Project not found.'); setLoading(false); return }
      setProject(proj)
    } catch (err) {
      console.error('Failed to load project', err)
      onError('Failed to load project details.')
    } finally { setLoading(false) }
  }, [projectId, onError])

  useEffect(() => {
    if (open) { loadData(); setReviewNotes('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Resource & Budget Planning completed. Decision: ${decisionLabel}.`)
      return true
    } catch {
      onError('Failed to save resource task.')
      return false
    } finally { setSaving(false) }
  }, [onSuccess, onError])

  if (!open) return null

  const phaseLabels: Record<number, string> = { 0: 'Execution', 1: 'Planning', 2: 'Closure', 3: 'Initiation', 4: 'Rejected', 5: 'Completed' }
  const phaseLabel = project?.pm_projectphase != null
    ? phaseLabels[Number(project.pm_projectphase)] ?? `Phase ${project.pm_projectphase}`
    : '-'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'warning.main', color: 'warning.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Resource & Budget Planning</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'common.white' }} />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'common.white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container>
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Project</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>{project?.pm_projectname || 'Loading...'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', display: 'block', mb: 2 }}>
                {project?.pm_projectcode}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Project Manager</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_projectmanagername || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Phase</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{phaseLabel}</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.04)', border: '1px solid', borderColor: 'warning.light' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PeopleIcon sx={{ fontSize: 16 }} /> Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: fontSizes.sm }}>
                  Review the budget and resource requirements. Ensure adequate funding and resource allocation before project execution.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> Budget Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {project?.pm_approvedbudgeteur != null ? currencyFormatter.format(project.pm_approvedbudgeteur) : '-'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Actual Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {project?.pm_actualcosteur != null ? currencyFormatter.format(project.pm_actualcosteur) : '-'}
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Resource Allocation</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Resource allocation details are managed in the project resource plan. Ensure all key roles have assigned resources with adequate allocation percentages.
                  </Typography>
                </Box>
              </Paper>

              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Review Notes</Typography>
              <TextField
                fullWidth multiline rows={4} size="small"
                label="Resource & Budget Notes"
                placeholder="Enter notes about resource requirements, budget allocation, or constraints..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId && (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={() => onClose()}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  )
}
