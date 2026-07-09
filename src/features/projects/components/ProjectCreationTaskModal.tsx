import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Chip, Paper, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import FlagIcon from '@mui/icons-material/Flag'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import { fetchProjectDetails } from '@/services/project.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'

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
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)

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
    if (open) { loadData() }
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
    : '—'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ChecklistRtlIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Project Details Review</Typography>
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
            {/* Project Context card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Project Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {project?.pm_projectname || 'Loading...'}
              </Typography>


              <Grid container spacing={2.5}>
                {/* Row 1: Non-editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Portfolio</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{project?.pm_portfolioname || '—'}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Programme</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{project?.pm_programmename || '—'}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Project Manager</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{project?.pm_projectmanagername || '—'}</Typography>
                  </Box>
                </Grid>

                {/* Row 2: Non-editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Phase</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{phaseLabel}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Approved Budget</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {project?.pm_approvedbudget != null ? currencyFormatter.format(project.pm_approvedbudget) : '—'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Actual Cost</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {project?.pm_actualcost != null ? currencyFormatter.format(project.pm_actualcost) : '—'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Row 3: Non-editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Planned Start</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {project?.pm_plannedstartdate ? new Date(project.pm_plannedstartdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Planned End</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {project?.pm_plannedenddate ? new Date(project.pm_plannedenddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  {/* Spacer */}
                </Grid>
              </Grid>
            </Paper>

            {/* Detailed RAG Statuses */}
            {(project?.pm_ragstatus != null || project?.pm_costragstatus != null || project?.pm_scheduleragstatus != null) && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FlagIcon sx={{ fontSize: 16 }} /> RAG Statuses
                </Typography>
                <Grid container spacing={2}>
                  {project?.pm_ragstatus != null && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>Overall</Typography>
                        <StatusTag
                          label={project.pm_ragstatus === 1 ? 'Low' : project.pm_ragstatus === 0 ? 'Medium' : 'High'}
                          color={project.pm_ragstatus === 1 ? 'success' : project.pm_ragstatus === 0 ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Paper>
                    </Grid>
                  )}
                  {project?.pm_costragstatus != null && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>Cost</Typography>
                        <StatusTag
                          label={project.pm_costragstatus === 0 ? 'Low' : project.pm_costragstatus === 1 ? 'Medium' : 'High'}
                          color={project.pm_costragstatus === 0 ? 'success' : project.pm_costragstatus === 1 ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Paper>
                    </Grid>
                  )}
                  {project?.pm_scheduleragstatus != null && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>Schedule</Typography>
                        <StatusTag
                          label={project.pm_scheduleragstatus === 1 ? 'Low' : project.pm_scheduleragstatus === 0 ? 'Medium' : 'High'}
                          color={project.pm_scheduleragstatus === 1 ? 'success' : project.pm_scheduleragstatus === 0 ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* Review Instructions Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                <FactCheckIcon sx={{ fontSize: 16 }} /> Review Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Review the newly created project details — assess scope, budget, timeline, and governance before approving for execution.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId && (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'project_creation', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  )
}
