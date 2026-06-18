import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  FormControl, InputLabel, Select, MenuItem, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import BadgeIcon from '@mui/icons-material/Badge'
import { fetchProjectDetails, fetchResources, assignResource } from '@/services'
import type { ProjectModel, ResourceModel } from '@/types/dataverse'
import { Button } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles'

interface TeamMemberEntry {
  resourceId: string
  resourceName: string
  role: string
  allocatedHours: number
  startDate: string
  endDate: string
}

interface TeamAssemblyTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const TeamAssemblyTaskModal: React.FC<TeamAssemblyTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [resources, setResources] = useState<ResourceModel[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMemberEntry[]>([])
  const [selectedResourceId, setSelectedResourceId] = useState('')
  const [role, setRole] = useState('')
  const [allocatedHours, setAllocatedHours] = useState(40)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, res] = await Promise.all([
        fetchProjectDetails(projectId),
        fetchResources(),
      ])
      if (!proj) { onError('Project not found.'); setLoading(false); return }
      setProject(proj)
      setResources(res || [])
    } catch (err) {
      console.error('Failed to load project', err)
      onError('Failed to load project details.')
    } finally { setLoading(false) }
  }, [projectId, onError])

  useEffect(() => {
    if (open) {
      loadData()
      setTeamMembers([])
      setSelectedResourceId('')
      setRole('')
      setAllocatedHours(40)
      setStartDate('')
      setEndDate('')
    }
  }, [open, loadData])

  const selectedResource = resources.find(r => r.pm_resourceid === selectedResourceId)

  const handleAddMember = () => {
    if (!selectedResourceId || !role.trim()) return
    setTeamMembers(prev => [...prev, {
      resourceId: selectedResourceId,
      resourceName: selectedResource?.pm_fullname || 'Unknown',
      role: role.trim(),
      allocatedHours,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    }])
    setSelectedResourceId('')
    setRole('')
    setAllocatedHours(40)
    setStartDate('')
    setEndDate('')
  }

  const handleRemoveMember = (idx: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== idx))
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (teamMembers.length === 0) {
      onError('Add at least one team member before approving.')
      return false
    }
    setSaving(true)
    try {
      for (const member of teamMembers) {
        await assignResource({
          pm_projectid: projectId,
          pm_resourceid: member.resourceId,
          pm_allocatedhours: member.allocatedHours,
          pm_assignmentrole: member.role,
          pm_startdate: member.startDate,
          pm_enddate: member.endDate,
        })
      }
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Team Assembly completed. ${teamMembers.length} team member(s) assigned. Decision: ${decisionLabel}.`)
      return true
    } catch {
      onError('Failed to assign one or more team members.')
      return false
    } finally { setSaving(false) }
  }, [teamMembers, projectId, onSuccess, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'secondary.main', color: 'common.white', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Team Assembly</Typography>
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
              <Box>
                <Typography variant="caption" color="text.secondary">Project Manager</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{project?.pm_projectmanagername || 'Unassigned'}</Typography>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.04)', border: '1px solid', borderColor: 'secondary.light' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: 16 }} /> Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: fontSizes.sm }}>
                  Define the core project team members and their roles. This ensures all key roles are assigned before project execution begins.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Team Members ({teamMembers.length})</Typography>

              {teamMembers.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  {teamMembers.map((m, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PersonIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.resourceName}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.role} &middot; {m.allocatedHours}h &middot; {m.startDate} to {m.endDate}</Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleRemoveMember(i)}><CloseIcon fontSize="small" /></IconButton>
                    </Paper>
                  ))}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Add Team Member</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Resource</InputLabel>
                  <Select
                    label="Resource"
                    value={selectedResourceId}
                    onChange={(e) => {
                      const res = resources.find(r => r.pm_resourceid === e.target.value)
                      setSelectedResourceId(e.target.value)
                      if (res?.pm_primaryrole) setRole(res.pm_primaryrole)
                    }}>
                    <MenuItem value="">Select a resource...</MenuItem>
                    {resources.map(r => (
                      <MenuItem key={r.pm_resourceid} value={r.pm_resourceid}>
                        {r.pm_fullname}{r.pm_departmentname ? ` (${r.pm_departmentname})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                    <TextField fullWidth size="small" label="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Developer" />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField fullWidth size="small" label="Allocated Hours" type="number"
                      value={allocatedHours}
                      onChange={(e) => setAllocatedHours(Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField fullWidth size="small" label="Start Date" type="date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField fullWidth size="small" label="End Date" type="date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)} />
                  </Grid>
                </Grid>
                <Button variant="outlined" startIcon={<PersonIcon />} onClick={handleAddMember}
                  disabled={!selectedResourceId || !role.trim()}
                  sx={{ alignSelf: 'flex-start' }}>
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
