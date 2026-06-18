import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  Alert,
  AlertTitle,
  LinearProgress,
} from '@mui/material'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import {
  createProjectMilestone,
  createRisk,
  createIssue,
  assignResource,
  createBudgetLine,
  createBenefit,
  createProjectTask,
  startWorkflowForEntity,
  GovernanceReadinessService,
  updateResourceAllocation,
  fetchResourceById,
  fetchResourceAllocations,
  fetchProjectsFull,
} from '@/services'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import { MODULE_NAMES } from '@/constants/moduleNames'

interface SubDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  initialData?: Record<string, any>
}

export const MilestoneDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError, initialData }) => {
  const fields: FormField[] = [
    { name: 'pm_milestonename', label: 'Milestone name', type: 'text', required: true },
    { name: 'pm_planneddate', label: 'Planned date', type: 'date' },
    { name: 'pm_milestonetype', label: 'Type', type: 'select', options: [
      { value: '0', label: 'Delivery' }, { value: '1', label: 'Governance' }
    ]},
    { name: 'pm_ragstatus', label: 'RAG Status', type: 'select', defaultValue: '1', options: [
      { value: '1', label: 'Green' }, { value: '0', label: 'Amber' }, { value: '2', label: 'Red' }
    ]},
    { name: 'pm_status', label: 'Status', type: 'select', defaultValue: '1', options: [
      { value: '1', label: 'Active / Planned' }, { value: '2', label: 'Completed' }
    ]}
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const payload = {
        ...data,
        pm_milestonetype: data.pm_milestonetype !== '' ? Number(data.pm_milestonetype) : undefined,
        pm_ragstatus: data.pm_ragstatus !== '' ? Number(data.pm_ragstatus) : undefined,
        pm_status: data.pm_status !== '' ? Number(data.pm_status) : undefined,
      }
      
      if (initialData?.pm_projectmilestoneid) {
        const { updateProjectMilestone } = await import('@/services')
        await updateProjectMilestone(initialData.pm_projectmilestoneid, payload)
        onSuccess('Milestone updated successfully.')
      } else {
        await createProjectMilestone({ ...payload, _pm_project_value: projectId })
        onSuccess('Milestone added successfully.')
      }
      onClose()
    } catch {
      onError(initialData?.pm_projectmilestoneid ? 'Unable to update milestone.' : 'Unable to add milestone.')
    }
  }

  return (
    <DynamicFormDialog 
      open={open} 
      title={initialData ? "Edit Milestone" : "Add Milestone"} 
      fields={fields} 
      initialData={initialData} 
      onClose={onClose} 
      onSubmit={handleSubmit} 
      submitText={initialData ? "Save Changes" : "Add"} 
    />
  )
}

export const RiskDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_risktitle', label: 'Risk title', type: 'text', required: true, gridSize: 8 },
    { name: 'pm_riskcategory', label: 'Category', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Strategic' }, { value: '1', label: 'Operational' }, { value: '2', label: 'Financial' }, { value: '3', label: 'Compliance' }, { value: '4', label: 'Technology' }
    ]},
    { name: 'pm_ragstatus', label: 'RAG Status', type: 'select', gridSize: 4, options: [
      { value: '1', label: 'Green — Low Risk' }, { value: '0', label: 'Amber — Medium Risk' }, { value: '2', label: 'Red — High Risk' }
    ]},
    { name: '_pm_riskowner_value', label: 'Risk owner', type: 'user-select-id', gridSize: 4 },
    { name: 'pm_identifieddate', label: 'Identified Date', type: 'date', gridSize: 6 },
    { name: 'pm_targetclosedate', label: 'Target close date', type: 'date', gridSize: 6 },
    { name: 'pm_riskcause', label: 'Cause', type: 'text', gridSize: 6 },
    { name: 'pm_riskeffect', label: 'Effect', type: 'text', gridSize: 6 },
    { name: 'pm_riskdescription', label: 'Description', type: 'multiline', rows: 2 },
    { name: 'pm_inherentprobability', label: 'Inherent Probability', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Very Low (1)' }, { value: '1', label: 'Low (2)' }, { value: '2', label: 'Medium (3)' }, { value: '3', label: 'High (4)' }, { value: '4', label: 'Very High (5)' }
    ]},
    { name: 'pm_inherentimpact', label: 'Inherent Impact', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Negligible (1)' }, { value: '1', label: 'Minor (2)' }, { value: '2', label: 'Moderate (3)' }, { value: '3', label: 'Major (4)' }, { value: '4', label: 'Catastrophic (5)' }
    ]},
    { name: 'pm_residualprobability', label: 'Residual Probability', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Very Low (1)' }, { value: '1', label: 'Low (2)' }, { value: '2', label: 'Medium (3)' }, { value: '3', label: 'High (4)' }, { value: '4', label: 'Very High (5)' }
    ]},
    { name: 'pm_residualimpact', label: 'Residual Impact', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Negligible (1)' }, { value: '1', label: 'Minor (2)' }, { value: '2', label: 'Moderate (3)' }, { value: '3', label: 'Major (4)' }, { value: '4', label: 'Catastrophic (5)' }
    ]},
    { name: 'pm_responsestrategy', label: 'Response Strategy', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Accept' }, { value: '1', label: 'Avoid' }, { value: '2', label: 'Transfer' }, { value: '3', label: 'Mitigate' }
    ]},
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      await createRisk({ ...data, pm_projectid: projectId })
      onSuccess('Risk logged successfully.')
      onClose()
    } catch {
      onError('Unable to log risk.')
    }
  }

  return <DynamicFormDialog open={open} title="Log Risk" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Log Risk" />
}

export const IssueDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_issuetitle', label: 'Issue title', type: 'text', required: true },
    { name: 'pm_issuedescription', label: 'Description', type: 'multiline', rows: 3 },
    { name: 'pm_issuecategory', label: 'Category', type: 'select', defaultValue: '0', gridSize: 6, options: [
      { value: '0', label: 'Scope' }, { value: '1', label: 'Schedule' }, { value: '2', label: 'Budget' }, { value: '3', label: 'Quality' }, { value: '4', label: 'Resource' }
    ]},
    { name: 'pm_prioritylevel', label: 'Priority', type: 'select', defaultValue: '0', gridSize: 6, options: [
      { value: '0', label: 'Normal' }, { value: '1', label: 'High' }, { value: '2', label: 'Critical' }
    ]},
    { name: 'pm_issueowner', label: 'Issue owner', type: 'user-select' },
    { name: 'pm_targetresolutiondate', label: 'Target resolution date', type: 'date' }
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      await createIssue({ ...data, pm_projectid: projectId })
      onSuccess('Issue logged successfully.')
      onClose()
    } catch {
      onError('Unable to log issue.')
    }
  }

  return <DynamicFormDialog open={open} title="Log Issue" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Log Issue" />
}

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function parseISODate(str: string): string {
  if (!str) return ''
  const d = new Date(str)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export const ResourceDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError, initialData }) => {
  const [resources, setResources] = useState<any[]>([])
  const [form, setForm] = useState({ pm_resourceId: '', pm_allocatedhours: 0, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })
  const [resourceCache, setResourceCache] = useState<Record<string, any>>({})
  const [allAllocations, setAllAllocations] = useState<any[]>([])
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const roleOptions = useMemo(() => {
    const roles = new Set<string>()
    resources.forEach((r) => { if (r.pm_primaryrole) roles.add(r.pm_primaryrole) })
    return Array.from(roles).sort()
  }, [resources])

  useEffect(() => {
    if (open) {
      ;(async () => {
        setLoading(true)
        try {
          const { fetchResources } = await import('@/services')
          const list = await fetchResources()
          setResources(list)

          if (initialData) {
            const editingResourceId = initialData._pm_resource_value || initialData.pm_resourceId || ''
            setForm({
              pm_resourceId: editingResourceId,
              pm_allocatedhours: Number(initialData.pm_allocatedhours) || 0,
              pm_assignmentrole: initialData.pm_assignmentrole || '',
              pm_startdate: parseISODate(initialData.pm_startdate),
              pm_enddate: parseISODate(initialData.pm_enddate),
            })
            if (editingResourceId) {
              const [res, allocs] = await Promise.all([
                fetchResourceById(editingResourceId),
                fetchResourceAllocations(editingResourceId),
              ])
              if (res) setResourceCache((c) => ({ ...c, [editingResourceId]: res }))
              setAllAllocations(allocs)
              resolveProjectNames(allocs)
            }
          } else {
            setForm({ pm_resourceId: '', pm_allocatedhours: 0, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })
            setResourceCache({})
            setAllAllocations([])
          }
        } catch { /* ignore */ }
        setLoading(false)
      })()
    }
  }, [open, initialData])

  const resolveProjectNames = useCallback(async (allocations: any[]) => {
    const ids = Array.from(new Set(
      allocations.map((a) => a._pm_project_value).filter(Boolean)
    )) as string[]
    if (ids.length === 0) return
    try {
      const projects = await fetchProjectsFull()
      const map: Record<string, string> = {}
      projects.forEach((p: any) => {
        if (p.pm_projectid) map[p.pm_projectid] = p.pm_projectname || 'Unknown Project'
      })
      setProjectNames(map)
    } catch { /* ignore */ }
  }, [])

  const handleRoleChange = useCallback((role: string) => {
    setForm((f) => {
      const currentResource = f.pm_resourceId ? resourceCache[f.pm_resourceId] : null
      if (currentResource && currentResource.pm_primaryrole !== role) {
        setAllAllocations([])
        return { ...f, pm_assignmentrole: role, pm_resourceId: '' }
      }
      return { ...f, pm_assignmentrole: role }
    })
  }, [resourceCache])

  const handleResourceChange = useCallback(async (resourceId: string) => {
    setForm((f) => ({ ...f, pm_resourceId: resourceId }))
    if (!resourceId) { setAllAllocations([]); setProjectNames({}); return }
    if (!resourceCache[resourceId]) {
      try {
        const [res, allocs] = await Promise.all([
          fetchResourceById(resourceId),
          fetchResourceAllocations(resourceId),
        ])
        if (res) setResourceCache((c) => ({ ...c, [resourceId]: res }))
        setAllAllocations(allocs)
        resolveProjectNames(allocs)
      } catch { /* ignore */ }
    } else {
      try {
        const allocs = await fetchResourceAllocations(resourceId)
        setAllAllocations(allocs)
        resolveProjectNames(allocs)
      } catch { /* ignore */ }
    }
  }, [resourceCache, resolveProjectNames])

  const filteredResources = useMemo(() => {
    if (!form.pm_assignmentrole) return resources
    return resources.filter((r) => r.pm_primaryrole === form.pm_assignmentrole)
  }, [resources, form.pm_assignmentrole])

  const selectedResource = form.pm_resourceId ? resourceCache[form.pm_resourceId] : null
  const dailyCapacity = selectedResource?.pm_dailyworkcapacity ?? 0

  const workingDays = useMemo(() => countWorkingDays(form.pm_startdate, form.pm_enddate), [form.pm_startdate, form.pm_enddate])

  const totalCapacity = dailyCapacity * workingDays

  const overlappingHours = useMemo(() => {
    if (!form.pm_startdate || !form.pm_enddate || !allAllocations.length) return 0
    const s = new Date(form.pm_startdate)
    const e = new Date(form.pm_enddate)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    let sum = 0
    for (const alloc of allAllocations) {
      if (Number(alloc.pm_assignmentstatus) === 1) continue
      if (initialData?.pm_resourceallocationid && alloc.pm_resourceallocationid === initialData.pm_resourceallocationid) continue
      const aStart = new Date(alloc.pm_startdate)
      const aEnd = new Date(alloc.pm_enddate)
      if (isNaN(aStart.getTime()) || isNaN(aEnd.getTime())) continue
      if (aStart <= e && aEnd >= s) {
        sum += Number(alloc.pm_allocatedhours) || 0
      }
    }
    return sum
  }, [form.pm_startdate, form.pm_enddate, allAllocations, initialData])

  const availableHours = Math.max(0, totalCapacity - overlappingHours)
  const allocationPercentage = totalCapacity > 0 ? Math.min(100, Math.round((form.pm_allocatedhours / totalCapacity) * 100)) : 0
  const exceedsAvailable = form.pm_allocatedhours > availableHours && workingDays > 0

  const isFormValid = form.pm_resourceId && form.pm_assignmentrole && form.pm_allocatedhours > 0 && form.pm_startdate && form.pm_enddate && !exceedsAvailable

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return
    setSubmitting(true)
    try {
      if (initialData?.pm_resourceallocationid) {
        await updateResourceAllocation(initialData.pm_resourceallocationid, {
          pm_allocatedhours: Number(form.pm_allocatedhours) || 0,
          pm_assignmentrole: form.pm_assignmentrole || '',
          pm_startdate: form.pm_startdate || '',
          pm_enddate: form.pm_enddate || '',
          pm_allocationpercentage: allocationPercentage,
        })
        onSuccess('Resource allocation updated successfully.')
      } else {
        const created = await assignResource({
          pm_projectid: projectId,
          pm_resourceid: form.pm_resourceId,
          pm_allocatedhours: Number(form.pm_allocatedhours) || 0,
          pm_assignmentrole: form.pm_assignmentrole || '',
          pm_startdate: form.pm_startdate || '',
          pm_enddate: form.pm_enddate || '',
          pm_allocationpercentage: allocationPercentage,
        })
        if (created?.pm_resourceallocationid) {
          try {
            await startWorkflowForEntity('default-template', created.pm_resourceallocationid, MODULE_NAMES.RESOURCES.value, 'System')
          } catch (wfErr) {
            console.error('[ResourceDialog] Failed to initiate workflow:', wfErr)
          }
        }
        onSuccess('Resource assigned successfully and workflow initiated.')
      }
      onClose()
    } catch {
      onError(initialData ? 'Unable to update resource allocation.' : 'Unable to assign resource.')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonAddIcon color="primary" />
        {initialData ? 'Edit Resource Allocation' : 'Assign Resource'}
      </DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" required label="Start date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.pm_startdate}
              onChange={(e) => setForm((f) => ({ ...f, pm_startdate: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" required label="End date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.pm_enddate}
              onChange={(e) => setForm((f) => ({ ...f, pm_enddate: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Role"
              value={form.pm_assignmentrole}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <MenuItem value="">— Select role —</MenuItem>
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth required label="Resource"
              value={form.pm_resourceId}
              disabled={!!initialData}
              onChange={(e) => handleResourceChange(e.target.value)}
            >
              {filteredResources.length === 0 && (
                <MenuItem disabled value="">No resources with this role</MenuItem>
              )}
              {filteredResources.map((r) => (
                <MenuItem key={r.pm_resourceid} value={r.pm_resourceid}>{r.pm_fullname}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" required label="Allocated hours"
              value={form.pm_allocatedhours || ''}
              placeholder="Enter hours"
              slotProps={{ htmlInput: { min: 0 } }}
              onChange={(e) => setForm((f) => ({ ...f, pm_allocatedhours: Number(e.target.value) || 0 }))}
              error={exceedsAvailable}
              helperText={exceedsAvailable ? `Exceeds available hours (${availableHours})` : ' '}
            />
          </Grid>

          {form.pm_resourceId && form.pm_startdate && form.pm_enddate && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FactCheckIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  Resource Availability
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Daily capacity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{dailyCapacity}h</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Working days in range</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{workingDays}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total capacity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalCapacity}h</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Already allocated (overlapping)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: overlappingHours > 0 ? 'warning.main' : 'inherit' }}>-{overlappingHours}h</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Allocation percentage</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{allocationPercentage}%</Typography>
                  </Box>
                  <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 0.75, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Available hours</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: availableHours > 0 ? 'success.main' : 'error.main' }}>
                      {availableHours}h
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          )}

          {exceedsAvailable && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                <AlertTitle>Insufficient availability</AlertTitle>
                This resource only has <strong>{availableHours}h</strong> available in the selected period. Reduce allocated hours or adjust the date range.
              </Alert>
            </Grid>
          )}

          {form.pm_resourceId && allAllocations.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <BusinessCenterIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  Current Allocations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {allAllocations.filter((a) => {
                    if (Number(a.pm_assignmentstatus) === 1) return false
                    if (initialData?.pm_resourceallocationid && a.pm_resourceallocationid === initialData.pm_resourceallocationid) return false
                    return true
                  }).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">No active allocations for this resource.</Typography>
                  ) : (
                    allAllocations.filter((a) => {
                      if (Number(a.pm_assignmentstatus) === 1) return false
                      if (initialData?.pm_resourceallocationid && a.pm_resourceallocationid === initialData.pm_resourceallocationid) return false
                      return true
                    }).map((alloc) => (
                      <Box key={alloc.pm_resourceallocationid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, px: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {projectNames[alloc._pm_project_value] || 'Loading...'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alloc.pm_startdate ? new Date(alloc.pm_startdate).toLocaleDateString() : '—'} — {alloc.pm_enddate ? new Date(alloc.pm_enddate).toLocaleDateString() : '—'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {Number(alloc.pm_allocatedhours) || 0}h
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid || submitting || loading}
          startIcon={<PersonAddIcon />}
        >
          {submitting ? 'Saving...' : initialData ? 'Save Changes' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const BudgetDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_budgetlinename', label: 'Budget line name', type: 'text', required: true },
    { name: 'pm_approvedbudgeteur', label: 'Approved budget (EUR)', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_actualspendeur', label: 'Actual spend (EUR)', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_costcategory', label: 'Cost category', type: 'select', options: [
      { value: '0', label: 'Staff' }, { value: '1', label: 'Contractors' }, { value: '2', label: 'Licences' }, { value: '3', label: 'Infrastructure' }
    ]}
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const payload = { ...data, _pm_project_value: projectId, pm_costcategory: data.pm_costcategory !== '' ? Number(data.pm_costcategory) : undefined }
      const created = await createBudgetLine(payload as any)
      if (created?.pm_budgetlineid) {
        try {
          await startWorkflowForEntity('default-template', created.pm_budgetlineid, MODULE_NAMES.BUDGETS.value, 'System')
        } catch (wfErr) {
          console.error('[BudgetDialog] Failed to initiate workflow:', wfErr)
        }
      }
      onSuccess('Budget line added successfully and workflow initiated.')
      onClose()
    } catch {
      onError('Unable to add budget line.')
    }
  }

  return <DynamicFormDialog open={open} title="Add Budget Line" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Add Budget Line" />
}

export const BenefitDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_benefitname', label: 'Benefit name', type: 'text', required: true },
    { name: 'pm_benefitcategory', label: 'Category', type: 'select', defaultValue: '0', gridSize: 6, options: [
      { value: '0', label: 'Financial' }, { value: '1', label: 'Non Financial' }, { value: '2', label: 'Strategic' }
    ]},
    { name: 'pm_benefitstatus', label: 'Status', type: 'select', defaultValue: '0', gridSize: 6, options: [
      { value: '0', label: 'On Track' }, { value: '1', label: 'Planned' }, { value: '2', label: 'At Risk' }
    ]},
    { name: 'pm_targetvalue', label: 'Target value', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_unitofmeasure', label: 'Unit of measure', type: 'text', gridSize: 6 },
    { name: 'pm_realisationenddate', label: 'Realisation end date', type: 'date' }
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      await createBenefit({ ...data, _pm_project_value: projectId })
      onSuccess('Benefit added successfully.')
      onClose()
    } catch {
      onError('Unable to add benefit.')
    }
  }

  return <DynamicFormDialog open={open} title="Add Benefit" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Add Benefit" />
}

export const TaskDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError, initialData }) => {
  const fields: FormField[] = [
    { name: 'pm_taskname', label: 'Task name', type: 'text', required: true },
    { name: 'pm_taskdescription', label: 'Description', type: 'multiline', rows: 2 },
    { name: 'pm_assignedresource', label: 'Assigned resource', type: 'text', gridSize: 6 },
    { name: 'pm_durationdays', label: 'Duration (days)', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_plannedstartdate', label: 'Planned start date', type: 'date', gridSize: 6 },
    { name: 'pm_plannedenddate', label: 'Planned end date', type: 'date', gridSize: 6 },
    { name: 'pm_percentcomplete', label: '% Complete', type: 'number', defaultValue: 0, min: 0, max: 100 }
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const statusVal = data.pm_percentcomplete === 100 ? '0' : '1'
      if (initialData?.pm_projecttaskid) {
        const { updateProjectTask } = await import('@/services')
        await updateProjectTask(initialData.pm_projecttaskid, { 
          ...data, 
          pm_taskstatus: statusVal,
          pm_durationdays: data.pm_durationdays || undefined 
        })
        onSuccess('Task updated successfully.')
      } else {
        await createProjectTask({ 
          ...data, 
          _pm_project_value: projectId, 
          pm_taskstatus: statusVal,
          pm_durationdays: data.pm_durationdays || undefined 
        })
        onSuccess('Task added successfully.')
      }
      onClose()
    } catch {
      onError(initialData?.pm_projecttaskid ? 'Unable to update task.' : 'Unable to add task.')
    }
  }

  return (
    <DynamicFormDialog 
      open={open} 
      title={initialData ? "Edit Task" : "Add Task"} 
      fields={fields} 
      initialData={initialData} 
      onClose={onClose} 
      onSubmit={handleSubmit} 
      submitText={initialData ? "Save Changes" : "Add Task"} 
    />
  )
}

// GateReviewDialog is kept largely intact because it requires a custom Readiness Check UI
// which is beyond the scope of a standard simple form.
export const GateReviewDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_gatename: '', pm_gatestage: 0, pm_plannedreviewdate: '' })
  const [readiness, setReadiness] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  const checkReadiness = useCallback(async (stage: number) => {
    setChecking(true)
    try {
      const report = await GovernanceReadinessService.checkProjectReadiness(projectId, stage)
      setReadiness(report)
    } catch {
      setReadiness(null)
    } finally {
      setChecking(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) checkReadiness(form.pm_gatestage)
  }, [open, form.pm_gatestage, checkReadiness])

  const handleAdd = async () => {
    if (!form.pm_gatename) { onError('Gate name is required.'); return }
    if (readiness && !readiness.isReady) { onError('Project is not ready for submission. Please address the failed checks.'); return }
    
    try {
      const { createGateReview } = await import('@/services')
      const createdReview = await createGateReview({
        ...form,
        _pm_project_value: projectId,
        pm_reviewstatus: 1, // Scheduled
        pm_reviewoutcome: 2, // Not Yet Reviewed
      } as any)

      if (createdReview?.pm_projectgatereviewid) {
        try {
          await startWorkflowForEntity('default-template', createdReview.pm_projectgatereviewid, MODULE_NAMES.GATE_REVIEWS.value, 'System')
        } catch (wfErr) {
          console.error('[GateReviewDialog] Failed to initiate workflow:', wfErr)
        }
      }

      setForm({ pm_gatename: '', pm_gatestage: 0, pm_plannedreviewdate: '' })
      onSuccess('Gate review scheduled successfully and workflow initiated.')
      onClose()
    } catch {
      onError('Unable to schedule gate review.')
    }
  }

  const stageLabel = ['Gate 1 (Initiation)', 'Gate 2 (Planning)', 'Gate 3 (Execution)', 'Gate 4 (Closure)'][form.pm_gatestage] || ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <HowToRegIcon color="success" />
        Submit for Gate Review
      </DialogTitle>
      <Typography variant="caption" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        Schedule a formal governance review for this project.
      </Typography>
      <DialogContent>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Gate name *"
              value={form.pm_gatename}
              onChange={(e) => setForm((f) => ({ ...f, pm_gatename: e.target.value }))}
              placeholder="e.g. Gate 1: Concept Approval"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Gate stage" value={form.pm_gatestage}
              onChange={(e) => {
                setForm((f) => ({ ...f, pm_gatestage: Number(e.target.value) }))
                checkReadiness(Number(e.target.value))
              }}>
              <MenuItem value={0}>Gate 1 (Initiation)</MenuItem>
              <MenuItem value={1}>Gate 2 (Planning)</MenuItem>
              <MenuItem value={2}>Gate 3 (Execution)</MenuItem>
              <MenuItem value={3}>Gate 4 (Closure)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned review date"
              value={form.pm_plannedreviewdate} onChange={(e) => setForm((f) => ({ ...f, pm_plannedreviewdate: e.target.value }))} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1.5,
                borderLeft: 3,
                borderLeftColor: !readiness ? 'divider' : readiness.isReady ? 'success.main' : 'error.main',
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FactCheckIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  Governance Readiness Check
                </Typography>
                {checking && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid', borderColor: 'primary.main', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Checking...</Typography>
                  </Box>
                )}
                {!checking && readiness && (
                  <Chip
                    label={readiness.isReady ? 'Passed' : `${readiness.failedCount} Failed`}
                    size="small"
                    color={readiness.isReady ? 'success' : 'error'}
                    sx={{ fontWeight: 700, borderRadius: 1 }}
                  />
                )}
              </Box>

              {readiness && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {readiness.items.map((item: any) => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 0.5 }}>
                      <Box sx={{
                        mt: 0.25, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        bgcolor: item.status === 'passed' ? 'success.main' : item.status === 'failed' ? 'error.main' : 'warning.main',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                      }}>
                        {item.status === 'passed' ? '✓' : item.status === 'failed' ? '✗' : '!'}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                        {item.message && (
                          <Typography variant="caption" color={item.status === 'failed' ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.25 }}>
                            {item.message}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {!readiness && !checking && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Select a gate stage above to run the readiness check.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          color={readiness?.isReady === false ? 'inherit' : 'success'}
          disabled={!form.pm_gatename || checking || readiness?.isReady === false}
          startIcon={<HowToRegIcon />}
        >
          {readiness?.isReady === false ? 'Not Ready' : 'Submit for Review'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
