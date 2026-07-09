import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button,
  MenuItem, useTheme, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FlagIcon from '@mui/icons-material/Flag'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import ScheduleIcon from '@mui/icons-material/Schedule'
import InfoIcon from '@mui/icons-material/Info'
import GavelIcon from '@mui/icons-material/Gavel'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import { fetchProjectDetails, fetchProjectMilestones, createProjectMilestone, deleteProjectMilestone } from '@/services/project.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectModel, ProjectMilestoneModel } from '@/types/dataverse'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'
import { currencyFormatter } from '@/utils/formatters'

interface MilestoneDefinitionTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const MILESTONE_TYPE_OPTIONS = [
  { value: 0, label: 'Delivery', icon: <BuildCircleIcon sx={{ fontSize: 16 }} /> },
  { value: 1, label: 'Governance', icon: <GavelIcon sx={{ fontSize: 16 }} /> },
]

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode }> = {
  '0': { label: 'At Risk', color: 'error', icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
  '1': { label: 'Not Started', color: 'info', icon: <ScheduleIcon sx={{ fontSize: 14 }} /> },
  '2': { label: 'Achieved', color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
}

const TYPE_LABELS: Record<number, string> = {
  0: 'Delivery',
  1: 'Governance',
}

export const MilestoneDefinitionTaskModal: React.FC<MilestoneDefinitionTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [milestones, setMilestones] = useState<ProjectMilestoneModel[]>([])
  const [newMilestone, setNewMilestone] = useState({
    pm_milestonename: '',
    pm_planneddate: '',
    pm_description: '',
    pm_milestonetype: 0 as number | string,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, ms] = await Promise.all([
        fetchProjectDetails(projectId),
        fetchProjectMilestones(projectId)
      ])
      if (!proj) { onError('Project not found.'); setLoading(false); return }
      setProject(proj)
      setMilestones(ms)
    } catch (err) {
      console.error('Failed to load milestone data', err)
      onError('Failed to load project milestone data.')
    } finally { setLoading(false) }
  }, [projectId, onError])

  useEffect(() => {
    if (open) {
      loadData()
      setNewMilestone({ pm_milestonename: '', pm_planneddate: '', pm_description: '', pm_milestonetype: 0 })
    }
  }, [open, loadData])

  const handleAddMilestone = async () => {
    if (!newMilestone.pm_milestonename.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        pm_milestonename: newMilestone.pm_milestonename,
        pm_planneddate: newMilestone.pm_planneddate || undefined,
        pm_description: newMilestone.pm_description || undefined,
        pm_milestonetype: newMilestone.pm_milestonetype !== '' ? Number(newMilestone.pm_milestonetype) : undefined,
        _pm_project_value: projectId,
      }
      const created = await createProjectMilestone(payload as any)
      if (created) {
        setMilestones(prev => [...prev, created])
        setNewMilestone({ pm_milestonename: '', pm_planneddate: '', pm_description: '', pm_milestonetype: 0 })
      }
    } catch {
      onError('Failed to create milestone.')
    } finally { setSaving(false) }
  }

  const handleDeleteMilestone = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteProjectMilestone(id)
      setMilestones(prev => prev.filter(m => m.pm_projectmilestoneid !== id))
    } catch {
      onError('Failed to delete milestone.')
    } finally { setDeletingId(null) }
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Milestone Definition completed. ${milestones.length} milestone(s) defined. Decision: ${decisionLabel}.`)
      return true
    } catch {
      onError('Failed to save milestone task.')
      return false
    } finally { setSaving(false) }
  }, [milestones.length, onSuccess, onError])

  if (!open) return null

  const phaseLabels: Record<number, string> = { 0: 'Execution', 1: 'Planning', 2: 'Closure', 3: 'Initiation', 4: 'Rejected', 5: 'Completed' }
  const phaseLabel = project?.pm_projectphase != null
    ? phaseLabels[Number(project.pm_projectphase)] ?? `Phase ${project.pm_projectphase}`
    : '—'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FlagIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Milestone Definition</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={milestones.length > 0 ? `${milestones.length} Defined` : 'Pending'}
            color={milestones.length > 0 ? 'success' : 'warning'}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
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
            {/* WBS Table list of milestones */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FlagIcon sx={{ fontSize: 16 }} /> Work Breakdown Structure (WBS) Milestones
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Milestone Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Target Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center" width={60}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {milestones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No milestones defined. Add your first milestone below.
                        </TableCell>
                      </TableRow>
                    ) : (
                      milestones.map((m, i) => {
                        const statusCfg = STATUS_CONFIG[String(m.pm_status)] || STATUS_CONFIG['1']
                        const typeLabel = m.pm_milestonetype !== undefined ? TYPE_LABELS[Number(m.pm_milestonetype)] : null
                        return (
                          <TableRow key={m.pm_projectmilestoneid || i} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_milestonename}</Typography>
                                {m.pm_description && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                    {m.pm_description}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {typeLabel && (
                                <Chip
                                  label={typeLabel}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: typeLabel === 'Governance' ? 'secondary.main' : 'primary.main',
                                    borderColor: typeLabel === 'Governance' ? 'secondary.light' : 'primary.light',
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {m.pm_planneddate ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2">
                                    {new Date(m.pm_planneddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={statusCfg.label}
                                size="small"
                                color={statusCfg.color}
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => m.pm_projectmilestoneid && handleDeleteMilestone(m.pm_projectmilestoneid)}
                                disabled={deletingId === m.pm_projectmilestoneid}
                              >
                                {deletingId === m.pm_projectmilestoneid ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Add New Milestone Card Form in a single row */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AddCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Add New Milestone
              </Typography>
              <Grid container spacing={1.5} sx={{ alignItems: "flex-end" }}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    size="small"
                    label="Milestone Name"
                    fullWidth
                    required
                    value={newMilestone.pm_milestonename}
                    onChange={(e) => setNewMilestone(p => ({ ...p, pm_milestonename: e.target.value }))}
                    placeholder="Name..."
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2.2 }}>
                  <TextField
                    size="small"
                    label="Target Date"
                    type="date"
                    fullWidth
                    value={newMilestone.pm_planneddate}
                    onChange={(e) => setNewMilestone(p => ({ ...p, pm_planneddate: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2.2 }}>
                  <TextField
                    size="small"
                    label="Type"
                    select
                    fullWidth
                    value={newMilestone.pm_milestonetype}
                    onChange={(e) => setNewMilestone(p => ({ ...p, pm_milestonetype: Number(e.target.value) }))}
                  >
                    {MILESTONE_TYPE_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 3.1 }}>
                  <TextField
                    size="small"
                    label="Description"
                    fullWidth
                    value={newMilestone.pm_description}
                    onChange={(e) => setNewMilestone(p => ({ ...p, pm_description: e.target.value }))}
                    placeholder="Description (optional)..."
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1.5 }} sx={{ display: 'flex', alignItems: 'stretch' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleAddMilestone}
                    disabled={saving || !newMilestone.pm_milestonename.trim()}
                    sx={{ height: 40, fontWeight: 600 }}
                  >
                    {saving ? 'Adding...' : 'Add'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Instructions Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
                <InfoIcon sx={{ fontSize: 16 }} /> Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Define key project milestones with target dates and types. Mark Delivery for project phase gates and Governance for approval checkpoints.
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
              dispatchFormDialogDecision({ formKey: 'milestone_definition', decision })
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

export default MilestoneDefinitionTaskModal