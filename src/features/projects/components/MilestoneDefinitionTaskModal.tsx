import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button,
  MenuItem, useTheme, Tooltip,
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

interface MilestoneDefinitionTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
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
      const proj = await fetchProjectDetails(projectId)
      if (!proj) { onError('Project not found.'); setLoading(false); return }
      setProject(proj)
      const ms = await fetchProjectMilestones(projectId)
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

  const bg = isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, overflow: 'hidden', maxHeight: '90vh' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'info.main', color: 'info.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FlagIcon />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Milestone Definition</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.75rem' }}>
              {project?.pm_projectcode || ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={milestones.length > 0 ? `${milestones.length} defined` : 'Pending'}
            color={milestones.length > 0 ? 'success' : 'warning'}
            size="small"
            sx={{ fontWeight: 600, bgcolor: milestones.length > 0 ? 'rgba(255,255,255,0.2)' : undefined, color: milestones.length > 0 ? 'white' : undefined }}
          />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={36} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">Loading milestone data...</Typography>
          </Box>
        ) : (
          <Grid container>
            {/* ── Sidebar ─────────────────────────────────────── */}
            <Grid size={{ xs: 12, md: 4 }} sx={{
              borderRight: { md: '1px solid' }, borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider', bgcolor: 'background.paper', p: 2.5,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'info.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <FlagIcon />
                </Box>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{project?.pm_projectname || 'Loading...'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {project?.pm_projectcode}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Manager</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
                    {project?.pm_projectmanagername || 'Unassigned'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
                    {project?.pm_portfolioname || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Programme</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.3 }}>
                    {project?.pm_programmename || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milestones</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={`${milestones.length} total`} size="small" color="info" sx={{ fontWeight: 600, borderRadius: 1 }} />
                    <Chip label={`${milestones.filter(m => String(m.pm_status) === '2').length} achieved`} size="small" color="success" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1 }} />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 3, p: 2, bgcolor: bg, borderRadius: 1.5, border: '1px solid', borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'info.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: isDark ? '#93C5FD' : 'info.main' }}>
                  <InfoIcon sx={{ fontSize: 16 }} /> Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem', lineHeight: 1.6 }}>
                  Define key project milestones with target dates and types. Mark Delivery for project phase gates and Governance for approval checkpoints.
                </Typography>
              </Box>

              {project && (
                <Box sx={{ mt: 3, p: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : '#F9FAFB' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Summary</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {milestones.length > 0
                      ? `You have defined ${milestones.length} milestone(s). The next milestone is ${milestones[0].pm_planneddate ? new Date(milestones[0].pm_planneddate).toLocaleDateString() : 'unscheduled'}.`
                      : 'No milestones defined yet. Use the form on the right to get started.'}
                    </Typography>
                </Box>
              )}
            </Grid>

            {/* ── Content ─────────────────────────────────────── */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 2.5, maxHeight: { md: 'calc(90vh - 140px)' }, overflow: 'auto' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlagIcon sx={{ fontSize: 18, color: 'info.main' }} />
                Defined Milestones
                <Chip label={milestones.length} size="small" color="info" sx={{ fontWeight: 700, minWidth: 28 }} />
              </Typography>

              {milestones.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed', mb: 3, borderRadius: 2 }}>
                  <FlagIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No Milestones Defined</Typography>
                  <Typography variant="caption" color="text.disabled">Add your first milestone using the form below.</Typography>
                </Paper>
              ) : (
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {milestones.map((m, i) => {
                    const statusCfg = STATUS_CONFIG[String(m.pm_status)] || STATUS_CONFIG['1']
                    const typeLabel = m.pm_milestonetype !== undefined ? TYPE_LABELS[Number(m.pm_milestonetype)] : null
                    return (
                      <Paper key={m.pm_projectmilestoneid || i} variant="outlined" sx={{
                        p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                        borderLeft: '3px solid', borderLeftColor: statusCfg.color,
                        transition: 'all 0.15s ease', '&:hover': { borderColor: 'text.primary', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50' },
                      }}>
                        <FlagIcon sx={{ fontSize: 20, color: 'info.main', flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.pm_milestonename}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.3 }}>
                            {m.pm_planneddate && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <CalendarMonthIcon sx={{ fontSize: 12 }} />
                                {new Date(m.pm_planneddate).toLocaleDateString()}
                              </Typography>
                            )}
                            {typeLabel && (
                              <Chip label={typeLabel} size="small" variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600,
                                  color: typeLabel === 'Governance' ? '#7C3AED' : '#0891B2',
                                  borderColor: typeLabel === 'Governance' ? 'rgba(124,58,237,0.3)' : 'rgba(8,145,178,0.3)',
                                }}
                              />
                            )}
                            <Chip
                              // icon={statusCfg.icon}
                              label={statusCfg.label}
                              size="small"
                              color={statusCfg.color}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, '& .MuiChip-icon': { fontSize: 12, ml: 0.3 } }}
                            />
                            {m.pm_description && (
                              <Tooltip title={m.pm_description}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                  {m.pm_description}
                                </Typography>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => m.pm_projectmilestoneid && handleDeleteMilestone(m.pm_projectmilestoneid)}
                          disabled={deletingId === m.pm_projectmilestoneid}
                          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          {deletingId === m.pm_projectmilestoneid ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                        </IconButton>
                      </Paper>
                    )
                  })}
                </Box>
              )}

              <Divider sx={{ my: 2.5 }} />

              {/* ── Add New Milestone Form ───────────────────── */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                Add New Milestone
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        size="small" label="Milestone Name" fullWidth required
                        value={newMilestone.pm_milestonename}
                        onChange={(e) => setNewMilestone(p => ({ ...p, pm_milestonename: e.target.value }))}
                        placeholder="e.g. Requirements Sign-off"
                        slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField
                        size="small" label="Target Date" type="date" fullWidth
                        value={newMilestone.pm_planneddate}
                        onChange={(e) => setNewMilestone(p => ({ ...p, pm_planneddate: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField
                        size="small" label="Type" select fullWidth
                        value={newMilestone.pm_milestonetype}
                        onChange={(e) => setNewMilestone(p => ({ ...p, pm_milestonetype: e.target.value }))}
                        slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                      >
                        {MILESTONE_TYPE_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {opt.icon}
                              {opt.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        size="small" label="Description" fullWidth multiline rows={2}
                        value={newMilestone.pm_description}
                        onChange={(e) => setNewMilestone(p => ({ ...p, pm_description: e.target.value }))}
                        placeholder="Optional description of this milestone and its deliverables..."
                        slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<AddCircleIcon />}
                      onClick={handleAddMilestone}
                      disabled={saving || !newMilestone.pm_milestonename.trim()}
                      sx={{ borderRadius: 1.5, fontWeight: 700 }}
                    >
                      {saving ? 'Adding...' : 'Add Milestone'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      {DecisionBoxProp && approvalStepId && (
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
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
        </DialogActions>
      )}
    </Dialog>
  )
}

export default MilestoneDefinitionTaskModal