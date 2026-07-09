import React, { useState, useEffect, useCallback, type ComponentType, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper,
  FormControl, InputLabel, Select, MenuItem, useTheme, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import BadgeIcon from '@mui/icons-material/Badge'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import { fetchProjectDetails, fetchResources, assignResource } from '@/services'
import { fetchResourceById, fetchResourceAllocations } from '@/services/resource.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectModel, ResourceModel } from '@/types/dataverse'
import { Button } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'

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

  // Resource capacity cache & allocations
  const [resourceCache, setResourceCache] = useState<Record<string, any>>({})
  const [allAllocations, setAllAllocations] = useState<any[]>([])

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

      // Set default dates based on project timeline if available
      if (proj.pm_plannedstartdate) setStartDate(proj.pm_plannedstartdate.split('T')[0])
      if (proj.pm_plannedenddate) setEndDate(proj.pm_plannedenddate.split('T')[0])
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
      setResourceCache({})
      setAllAllocations([])
    }
  }, [open, loadData])

  const handleResourceChange = useCallback(async (resourceId: string) => {
    setSelectedResourceId(resourceId)
    if (!resourceId) { setAllAllocations([]); return }
    
    // Set default role if available on resource
    const resOption = resources.find(r => r.pm_resourceid === resourceId)
    if (resOption?.pm_primaryrole) setRole(resOption.pm_primaryrole)

    if (!resourceCache[resourceId]) {
      try {
        const [resDetails, allocs] = await Promise.all([
          fetchResourceById(resourceId),
          fetchResourceAllocations(resourceId)
        ])
        if (resDetails) setResourceCache((c) => ({ ...c, [resourceId]: resDetails }))
        setAllAllocations(allocs || [])
      } catch { /* ignore */ }
    } else {
      try {
        const allocs = await fetchResourceAllocations(resourceId)
        setAllAllocations(allocs || [])
      } catch { /* ignore */ }
    }
  }, [resources, resourceCache])

  // Capacity calculation variables
  const selectedResourceDetail = selectedResourceId ? resourceCache[selectedResourceId] : null
  const dailyCapacity = selectedResourceDetail?.pm_dailyworkcapacity ?? 0

  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0
    let count = 0
    const cur = new Date(s)
    while (cur <= e) {
      const day = cur.getDay()
      if (day !== 0 && day !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }, [startDate, endDate])

  const totalCapacity = dailyCapacity * workingDays

  const overlappingHours = useMemo(() => {
    if (!startDate || !endDate || !allAllocations.length) return 0
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    let sum = 0
    for (const alloc of allAllocations) {
      if (Number(alloc.pm_assignmentstatus) === 1) continue // Skip rejected
      const aStart = new Date(alloc.pm_startdate)
      const aEnd = new Date(alloc.pm_enddate)
      if (isNaN(aStart.getTime()) || isNaN(aEnd.getTime())) continue
      if (aStart <= e && aEnd >= s) {
        sum += Number(alloc.pm_allocatedhours) || 0
      }
    }
    return sum
  }, [startDate, endDate, allAllocations])

  const availableHours = Math.max(0, totalCapacity - overlappingHours)
  const exceedsAvailable = selectedResourceId && allocatedHours > availableHours && workingDays > 0

  const selectedResourceName = resources.find(r => r.pm_resourceid === selectedResourceId)?.pm_fullname || 'Unknown'

  const handleAddMember = () => {
    if (!selectedResourceId || !role.trim() || exceedsAvailable) return
    setTeamMembers(prev => [...prev, {
      resourceId: selectedResourceId,
      resourceName: selectedResourceName,
      role: role.trim(),
      allocatedHours,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    }])
    setSelectedResourceId('')
    setRole('')
    setAllocatedHours(40)
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Team Assembly</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={teamMembers.length > 0 ? `${teamMembers.length} Assigned` : 'Pending'}
            color={teamMembers.length > 0 ? 'success' : 'warning'}
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
            
            {/* Team Members List Table */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GroupIcon sx={{ fontSize: 16 }} /> Assigned Project Team
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Team Member</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={150}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Allocated Hours</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={220}>Allocation Period</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center" width={60}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No team members assigned yet. Add resources using the form below.
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamMembers.map((m, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.resourceName}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{m.role}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                              {m.allocatedHours} hrs
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {new Date(m.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(m.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveMember(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Add Team Member Card Form */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AddCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> Add Team Member
              </Typography>
              
              <Grid container spacing={1.5} sx={{ alignItems: "flex-end" }}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="team-assembly-resource-label">Resource</InputLabel>
                    <Select
                      labelId="team-assembly-resource-label"
                      label="Resource"
                      value={selectedResourceId}
                      onChange={(e) => handleResourceChange(e.target.value)}
                    >
                      <MenuItem value="">— Select —</MenuItem>
                      {resources.map(r => (
                        <MenuItem key={r.pm_resourceid} value={r.pm_resourceid}>
                          {r.pm_fullname}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Developer"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Allocated Hours"
                    type="number"
                    value={allocatedHours}
                    onChange={(e) => setAllocatedHours(Number(e.target.value))}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 1.5 }} sx={{ display: 'flex', alignItems: 'stretch' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleAddMember}
                    disabled={!selectedResourceId || !role.trim() || !!exceedsAvailable}
                    sx={{ height: 40, fontWeight: 600 }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* Resource Availability Section */}
              {selectedResourceId && (
                <Box sx={{ mt: 2.5 }}>
                  {exceedsAvailable ? (
                    <Alert severity="error" sx={{ borderRadius: 1.5, '& .MuiAlert-message': { width: '100%' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Insufficient Availability</Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                        {selectedResourceName} has only <strong>{availableHours} hours</strong> available in this date range.
                        (Capacity: {totalCapacity} hrs, Overlapping: {overlappingHours} hrs)
                      </Typography>
                    </Alert>
                  ) : (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.paper' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Resource Availability Check
                      </Typography>
                      <Typography variant="body2">
                        {selectedResourceName} has <strong>{availableHours} hours</strong> available.
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Total capacity over {workingDays} working days is {totalCapacity} hours ({dailyCapacity} hrs/day), with {overlappingHours} hours already allocated.
                        </Typography>
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Paper>

            {/* Instructions Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.secondary.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'secondary.main' }}>
                <BadgeIcon sx={{ fontSize: 16 }} /> Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Define the core project team members and their roles. This ensures all key roles are assigned before project execution begins.
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
              dispatchFormDialogDecision({ formKey: 'team_assembly', decision })
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
