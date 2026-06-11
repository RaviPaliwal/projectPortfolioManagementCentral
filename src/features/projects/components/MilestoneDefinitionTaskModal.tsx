import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button, List, ListItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FlagIcon from '@mui/icons-material/Flag'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { fetchProjectDetails, fetchProjectMilestones, createProjectMilestone } from '@/services/project.service'
import type { ProjectModel, ProjectMilestoneModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [milestones, setMilestones] = useState<ProjectMilestoneModel[]>([])
  const [newMilestone, setNewMilestone] = useState({ pm_milestonename: '', pm_planneddate: '', pm_description: '' })

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
    if (open) { loadData(); setNewMilestone({ pm_milestonename: '', pm_planneddate: '', pm_description: '' }) }
  }, [open, loadData])

  const handleAddMilestone = async () => {
    if (!newMilestone.pm_milestonename.trim()) return
    setSaving(true)
    try {
      const created = await createProjectMilestone({
        pm_milestonename: newMilestone.pm_milestonename,
        pm_planneddate: newMilestone.pm_planneddate || undefined,
        pm_description: newMilestone.pm_description || undefined,
        _pm_project_value: projectId,
      } as any)
      if (created) {
        setMilestones(prev => [...prev, created])
        setNewMilestone({ pm_milestonename: '', pm_planneddate: '', pm_description: '' })
      }
    } catch {
      onError('Failed to create milestone.')
    } finally { setSaving(false) }
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

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'info.main', color: 'info.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FlagIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Milestone Definition</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'white' }}>
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
                  <Typography variant="caption" color="text.secondary">Existing Milestones</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{milestones.length}</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'info.50', borderRadius: 1.5, border: '1px solid', borderColor: 'info.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FlagIcon sx={{ fontSize: 16 }} /> Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Define key project milestones with target dates. Milestones represent significant events or deliverables in the project lifecycle.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Defined Milestones ({milestones.length})</Typography>

              {milestones.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed', mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">No milestones defined yet. Add the first milestone below.</Typography>
                </Paper>
              ) : (
                <List sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {milestones.map((m, i) => (
                    <Paper key={m.pm_projectmilestoneid || i} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FlagIcon sx={{ fontSize: 18, color: 'info.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.pm_milestonename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.pm_planneddate ? new Date(m.pm_planneddate).toLocaleDateString() : 'No date set'}
                          {m.pm_description ? ` \u00B7 ${m.pm_description}` : ''}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Add New Milestone</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField size="small" label="Milestone Name" fullWidth
                  value={newMilestone.pm_milestonename}
                  onChange={(e) => setNewMilestone(p => ({ ...p, pm_milestonename: e.target.value }))}
                  placeholder="e.g. Requirements Sign-off" />
                <TextField size="small" label="Target Date" type="date" fullWidth
                  value={newMilestone.pm_planneddate}
                  onChange={(e) => setNewMilestone(p => ({ ...p, pm_planneddate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" label="Description" fullWidth multiline rows={2}
                  value={newMilestone.pm_description}
                  onChange={(e) => setNewMilestone(p => ({ ...p, pm_description: e.target.value }))}
                  placeholder="Optional description of this milestone..." />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddMilestone}
                  disabled={saving || !newMilestone.pm_milestonename.trim()}
                  sx={{ borderRadius: 1.5, alignSelf: 'flex-start' }}>
                  Add Milestone
                </Button>
              </Box>
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
