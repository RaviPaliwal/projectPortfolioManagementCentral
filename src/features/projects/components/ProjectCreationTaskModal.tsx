import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import FlagIcon from '@mui/icons-material/Flag'
import { fetchProjectDetails } from '@/services/project.service'
import type { ProjectModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface ProjectCreationTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const ProjectCreationTaskModal: React.FC<ProjectCreationTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [recommendation, setRecommendation] = useState('')

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
    if (open) { loadData(); setReviewNotes(''); setRecommendation('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Project Creation Review completed. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      onError('Failed to save review decision.')
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'success.main', color: 'success.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ChecklistRtlIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Project Creation Review</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container sx={{ height: '100%' }}>
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Project Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{project?.pm_projectname || 'Loading...'}</Typography>
              {project?.pm_projectcode && (
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {project.pm_projectcode}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Project Manager</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_projectmanagername || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_portfolioname || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Phase</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{phaseLabel}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">RAG Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {project?.pm_ragstatus != null ? (
                      <StatusTag
                        label={project.pm_ragstatus === 0 ? 'Green' : project.pm_ragstatus === 1 ? 'Amber' : 'Red'}
                        color={project.pm_ragstatus === 0 ? 'success' : project.pm_ragstatus === 1 ? 'warning' : 'error'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not set</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'success.50', borderRadius: 1.5, border: '1px solid', borderColor: 'success.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChecklistRtlIcon sx={{ fontSize: 16 }} /> Review Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Review the newly created project details — assess scope, budget, timeline, and governance before approving for execution.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> Budget Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {project?.pm_approvedbudgeteur != null ? currencyFormatter.format(project.pm_approvedbudgeteur) : '-'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Actual Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {project?.pm_actualcosteur != null ? currencyFormatter.format(project.pm_actualcosteur) : '-'}
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarMonthIcon sx={{ fontSize: 16 }} /> Timeline
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Planned Start</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {project?.pm_plannedstartdate ? new Date(project.pm_plannedstartdate).toLocaleDateString() : '-'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Planned End</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {project?.pm_plannedenddate ? new Date(project.pm_plannedenddate).toLocaleDateString() : '-'}
                  </Typography>
                </Paper>
              </Box>

              {(project?.pm_ragstatus != null || project?.pm_costragstatus != null || project?.pm_scheduleragstatus != null) && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FlagIcon sx={{ fontSize: 16 }} /> RAG Statuses
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    {project?.pm_ragstatus != null && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">Overall</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <StatusTag
                            label={project.pm_ragstatus === 0 ? 'Green' : project.pm_ragstatus === 1 ? 'Amber' : 'Red'}
                            color={project.pm_ragstatus === 0 ? 'success' : project.pm_ragstatus === 1 ? 'warning' : 'error'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Paper>
                    )}
                    {project?.pm_costragstatus != null && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">Cost</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <StatusTag
                            label={project.pm_costragstatus === 0 ? 'Green' : project.pm_costragstatus === 1 ? 'Amber' : 'Red'}
                            color={project.pm_costragstatus === 0 ? 'success' : project.pm_costragstatus === 1 ? 'warning' : 'error'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Paper>
                    )}
                    {project?.pm_scheduleragstatus != null && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">Schedule</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <StatusTag
                            label={project.pm_scheduleragstatus === 0 ? 'Green' : project.pm_scheduleragstatus === 1 ? 'Amber' : 'Red'}
                            color={project.pm_scheduleragstatus === 0 ? 'success' : project.pm_scheduleragstatus === 1 ? 'warning' : 'error'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Paper>
                    )}
                  </Box>
                </>
              )}
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
