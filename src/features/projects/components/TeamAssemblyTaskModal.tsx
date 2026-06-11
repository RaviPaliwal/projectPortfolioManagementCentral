import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import BadgeIcon from '@mui/icons-material/Badge'
import { fetchProjectDetails } from '@/services/project.service'
import type { ProjectModel } from '@/types/dataverse'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface TeamAssemblyTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const ROLES = [
  'Project Manager', 'Business Analyst', 'Technical Lead', 'Developer',
  'Tester', 'Solution Architect', 'Project Coordinator', 'Stakeholder',
]

export const TeamAssemblyTaskModal: React.FC<TeamAssemblyTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string; email: string }[]>([])
  const [newMember, setNewMember] = useState({ name: '', role: '', email: '' })

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
    if (open) { loadData(); setTeamMembers([]); setNewMember({ name: '', role: '', email: '' }) }
  }, [open, loadData])

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.role.trim()) return
    setTeamMembers(prev => [...prev, { ...newMember }])
    setNewMember({ name: '', role: '', email: '' })
  }

  const handleRemoveMember = (idx: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== idx))
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Team Assembly completed. ${teamMembers.length} team member(s) assigned. Decision: ${decisionLabel}.`)
      return true
    } catch {
      onError('Failed to save team task.')
      return false
    } finally { setSaving(false) }
  }, [teamMembers.length, onSuccess, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#7c3aed', color: 'white', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Team Assembly</Typography>
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
              <Box>
                <Typography variant="caption" color="text.secondary">Project Manager</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_projectmanagername || 'Unassigned'}</Typography>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f3ff', borderRadius: 1.5, border: '1px solid', borderColor: '#ede9fe' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: 16 }} /> Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Define the core project team members and their roles. This ensures all key roles are assigned before project execution begins.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Team Members ({teamMembers.length})</Typography>

              {teamMembers.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  {teamMembers.map((m, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PersonIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.role}{m.email ? ` \u00B7 ${m.email}` : ''}</Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleRemoveMember(i)}><CloseIcon fontSize="small" /></IconButton>
                    </Paper>
                  ))}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Add Team Member</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField size="small" label="Name" fullWidth
                  value={newMember.name}
                  onChange={(e) => setNewMember(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. John Smith" />
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={newMember.role}
                    onChange={(e) => setNewMember(p => ({ ...p, role: e.target.value }))}>
                    <MenuItem value="">Select a role...</MenuItem>
                    {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Email (optional)" fullWidth
                  value={newMember.email}
                  onChange={(e) => setNewMember(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com" />
                <Button variant="outlined" startIcon={<PersonIcon />} onClick={handleAddMember}
                  disabled={!newMember.name.trim() || !newMember.role.trim()}
                  sx={{ borderRadius: 1.5, alignSelf: 'flex-start' }}>
                  Add Member
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
