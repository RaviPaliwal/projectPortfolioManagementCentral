import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Button,
} from '@mui/material'
import {
  createProjectMilestone,
  createRisk,
  createIssue,
  assignResource,
  createBudgetLine,
  createBenefit,
  createProjectTask,
} from '@/services'
import type { ProjectMilestoneModel, RiskModel, IssueModel } from '@/types/dataverse'

interface SubDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

export const MilestoneDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState<Partial<ProjectMilestoneModel>>({ pm_milestonename: '', pm_planneddate: '', pm_milestonetype: '' })

  const handleAdd = async () => {
    if (!form.pm_milestonename) { onError('Milestone name is required.'); return }
    try {
      await createProjectMilestone({
        ...form,
        _pm_project_value: projectId,
      })
      setForm({ pm_milestonename: '', pm_planneddate: '', pm_milestonetype: '' })
      onSuccess('Milestone added successfully.')
      onClose()
    } catch {
      onError('Unable to add milestone.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Milestone</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Milestone name *" value={form.pm_milestonename ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_milestonename: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned date"
              value={form.pm_planneddate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_planneddate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField select fullWidth label="Type" value={form.pm_milestonetype ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_milestonetype: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              <MenuItem value="0">Delivery</MenuItem>
              <MenuItem value="1">Governance</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!form.pm_milestonename}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}

export const RiskDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState<Partial<RiskModel>>({ pm_risktitle: '', pm_riskdescription: '', pm_ragstatus: '1', pm_riskcategory: '3' })

  const handleAdd = async () => {
    if (!form.pm_risktitle) { onError('Risk title is required.'); return }
    try {
      await createRisk({
        ...form,
        pm_projectid: projectId,
      })
      setForm({ pm_risktitle: '', pm_riskdescription: '', pm_ragstatus: '1', pm_riskcategory: '3' })
      onSuccess('Risk logged successfully.')
      onClose()
    } catch {
      onError('Unable to log risk.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Log Risk</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Risk title *" value={form.pm_risktitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_risktitle: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline rows={3} label="Description" value={form.pm_riskdescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskdescription: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Category" value={form.pm_riskcategory ?? '3'}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskcategory: e.target.value }))}>
              <MenuItem value="0">Resource</MenuItem>
              <MenuItem value="1">Financial</MenuItem>
              <MenuItem value="2">Legal</MenuItem>
              <MenuItem value="3">Technical</MenuItem>
              <MenuItem value="4">External</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="RAG" value={form.pm_ragstatus ?? '1'}
              onChange={(e) => setForm((f) => ({ ...f, pm_ragstatus: e.target.value }))}>
              <MenuItem value="1">Green</MenuItem>
              <MenuItem value="0">Amber</MenuItem>
              <MenuItem value="2">Red</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Risk owner" value={form.pm_riskowner ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskowner: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Target close date"
              value={form.pm_targetclosedate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_targetclosedate: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="error" disabled={!form.pm_risktitle}>Log Risk</Button>
      </DialogActions>
    </Dialog>
  )
}

export const IssueDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState<Partial<IssueModel>>({ pm_issuetitle: '', pm_issuedescription: '', pm_prioritylevel: '0', pm_issuecategory: '0' })

  const handleAdd = async () => {
    if (!form.pm_issuetitle) { onError('Issue title is required.'); return }
    try {
      await createIssue({
        ...form,
        pm_projectid: projectId,
      })
      setForm({ pm_issuetitle: '', pm_issuedescription: '', pm_prioritylevel: '0', pm_issuecategory: '0' })
      onSuccess('Issue logged successfully.')
      onClose()
    } catch {
      onError('Unable to log issue.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Log Issue</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Issue title *" value={form.pm_issuetitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_issuetitle: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline rows={3} label="Description" value={form.pm_issuedescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_issuedescription: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Category" value={form.pm_issuecategory ?? '0'}
              onChange={(e) => setForm((f) => ({ ...f, pm_issuecategory: e.target.value }))}>
              <MenuItem value="0">Scope</MenuItem>
              <MenuItem value="1">Schedule</MenuItem>
              <MenuItem value="2">Budget</MenuItem>
              <MenuItem value="3">Quality</MenuItem>
              <MenuItem value="4">Resource</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Priority" value={form.pm_prioritylevel ?? '0'}
              onChange={(e) => setForm((f) => ({ ...f, pm_prioritylevel: e.target.value }))}>
              <MenuItem value="0">Normal</MenuItem>
              <MenuItem value="1">High</MenuItem>
              <MenuItem value="2">Critical</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Issue owner" value={form.pm_issueowner ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_issueowner: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Target resolution date"
              value={form.pm_targetresolutiondate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_targetresolutiondate: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="warning" disabled={!form.pm_issuetitle}>Log Issue</Button>
      </DialogActions>
    </Dialog>
  )
}

export const ResourceDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_resourceName: '', pm_resourceId: '', pm_allocatedhours: 40, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })

  const handleAdd = async () => {
    if (!form.pm_resourceId) { onError('Resource is required.'); return }
    try {
      await assignResource({
        pm_projectid: projectId,
        pm_resourceid: form.pm_resourceId,
        pm_allocatedhours: form.pm_allocatedhours,
        pm_assignmentrole: form.pm_assignmentrole,
        pm_startdate: form.pm_startdate,
        pm_enddate: form.pm_enddate,
      })
      setForm({ pm_resourceName: '', pm_resourceId: '', pm_allocatedhours: 40, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })
      onSuccess('Resource assigned successfully.')
      onClose()
    } catch {
      onError('Unable to assign resource.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Assign Resource</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Resource name *" value={form.pm_resourceName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_resourceName: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Resource ID *" value={form.pm_resourceId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_resourceId: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" label="Allocated hours" value={form.pm_allocatedhours ?? 40}
              onChange={(e) => setForm((f) => ({ ...f, pm_allocatedhours: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label="Role" value={form.pm_assignmentrole ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_assignmentrole: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Start date"
              value={form.pm_startdate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_startdate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="End date"
              value={form.pm_enddate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_enddate: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!form.pm_resourceId}>Assign</Button>
      </DialogActions>
    </Dialog>
  )
}

export const BudgetDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_budgetlinename: '', pm_approvedbudgeteur: 0, pm_actualspendeur: 0, pm_costcategory: '' })

  const handleAdd = async () => {
    if (!form.pm_budgetlinename) { onError('Budget line name is required.'); return }
    try {
      await createBudgetLine({
        pm_budgetlinename: form.pm_budgetlinename,
        pm_approvedbudgeteur: form.pm_approvedbudgeteur,
        pm_actualspendeur: form.pm_actualspendeur,
        pm_costcategory: form.pm_costcategory !== '' ? Number(form.pm_costcategory) : undefined,
        _pm_project_value: projectId,
      })
      setForm({ pm_budgetlinename: '', pm_approvedbudgeteur: 0, pm_actualspendeur: 0, pm_costcategory: '' })
      onSuccess('Budget line added successfully.')
      onClose()
    } catch {
      onError('Unable to add budget line.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Budget Line</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Budget line name *" value={form.pm_budgetlinename ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_budgetlinename: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" label="Approved budget (EUR)" value={form.pm_approvedbudgeteur ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" label="Actual spend (EUR)" value={form.pm_actualspendeur ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, pm_actualspendeur: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField select fullWidth label="Cost category" value={form.pm_costcategory ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_costcategory: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              <MenuItem value="0">Staff</MenuItem>
              <MenuItem value="1">Contractors</MenuItem>
              <MenuItem value="2">Licences</MenuItem>
              <MenuItem value="3">Infrastructure</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!form.pm_budgetlinename}>Add Budget Line</Button>
      </DialogActions>
    </Dialog>
  )
}

export const BenefitDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_benefitname: '', pm_benefitcategory: '1', pm_benefitstatus: '0', pm_targetvalue: 0, pm_unitofmeasure: '', pm_realisationenddate: '' })

  const handleAdd = async () => {
    if (!form.pm_benefitname) { onError('Benefit name is required.'); return }
    try {
      await createBenefit({
        pm_benefitname: form.pm_benefitname,
        pm_benefitcategory: form.pm_benefitcategory,
        pm_benefitstatus: form.pm_benefitstatus,
        pm_targetvalue: form.pm_targetvalue,
        pm_unitofmeasure: form.pm_unitofmeasure,
        pm_realisationenddate: form.pm_realisationenddate,
        _pm_project_value: projectId,
      })
      setForm({ pm_benefitname: '', pm_benefitcategory: '1', pm_benefitstatus: '0', pm_targetvalue: 0, pm_unitofmeasure: '', pm_realisationenddate: '' })
      onSuccess('Benefit added successfully.')
      onClose()
    } catch {
      onError('Unable to add benefit.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Benefit</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Benefit name *" value={form.pm_benefitname ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_benefitname: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Category" value={form.pm_benefitcategory ?? '1'}
              onChange={(e) => setForm((f) => ({ ...f, pm_benefitcategory: e.target.value }))}>
              <MenuItem value="1">Financial</MenuItem>
              <MenuItem value="2">Strategic</MenuItem>
              <MenuItem value="0">Operational</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Status" value={form.pm_benefitstatus ?? '0'}
              onChange={(e) => setForm((f) => ({ ...f, pm_benefitstatus: e.target.value }))}>
              <MenuItem value="0">Not Started</MenuItem>
              <MenuItem value="1">In Progress</MenuItem>
              <MenuItem value="2">Achieved</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" label="Target value" value={form.pm_targetvalue ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, pm_targetvalue: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label="Unit of measure" value={form.pm_unitofmeasure ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_unitofmeasure: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Realisation end date"
              value={form.pm_realisationenddate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_realisationenddate: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!form.pm_benefitname}>Add Benefit</Button>
      </DialogActions>
    </Dialog>
  )
}

export const TaskDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_taskname: '', pm_taskdescription: '', pm_assignedresource: '', pm_plannedstartdate: '', pm_plannedenddate: '', pm_percentcomplete: 0, pm_durationdays: 0 })

  const handleAdd = async () => {
    if (!form.pm_taskname) { onError('Task name is required.'); return }
    try {
      await createProjectTask({
        pm_taskname: form.pm_taskname,
        pm_taskdescription: form.pm_taskdescription,
        pm_assignedresource: form.pm_assignedresource,
        pm_plannedstartdate: form.pm_plannedstartdate,
        pm_plannedenddate: form.pm_plannedenddate,
        pm_percentcomplete: form.pm_percentcomplete,
        pm_durationdays: form.pm_durationdays || undefined,
        _pm_project_value: projectId,
      })
      setForm({ pm_taskname: '', pm_taskdescription: '', pm_assignedresource: '', pm_plannedstartdate: '', pm_plannedenddate: '', pm_percentcomplete: 0, pm_durationdays: 0 })
      onSuccess('Task added successfully.')
      onClose()
    } catch {
      onError('Unable to add task.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Task</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Task name *" value={form.pm_taskname ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_taskname: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline rows={2} label="Description" value={form.pm_taskdescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_taskdescription: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label="Assigned resource" value={form.pm_assignedresource ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_assignedresource: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="number" label="Duration (days)" value={form.pm_durationdays ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, pm_durationdays: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned start date"
              value={form.pm_plannedstartdate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_plannedstartdate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned end date"
              value={form.pm_plannedenddate ?? ''} onChange={(e) => setForm((f) => ({ ...f, pm_plannedenddate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth type="number" label="% Complete" value={form.pm_percentcomplete ?? 0}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
              onChange={(e) => setForm((f) => ({ ...f, pm_percentcomplete: Number(e.target.value) }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!form.pm_taskname}>Add Task</Button>
      </DialogActions>
    </Dialog>
  )
}

export const GateReviewDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_gatename: '', pm_gatestage: 0, pm_plannedreviewdate: '', pm_documentsurl: '', pm_leadreviewer: '' })

  const handleAdd = async () => {
    if (!form.pm_gatename) { onError('Gate name is required.'); return }
    try {
      const { createGateReview } = await import('@/services')
      await createGateReview({
        ...form,
        _pm_project_value: projectId,
        pm_reviewstatus: 1, // Scheduled
        pm_reviewoutcome: 2, // Not Yet Reviewed
      } as any)
      setForm({ pm_gatename: '', pm_gatestage: 0, pm_plannedreviewdate: '', pm_documentsurl: '', pm_leadreviewer: '' })
      onSuccess('Gate review scheduled successfully.')
      onClose()
    } catch {
      onError('Unable to schedule gate review.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Submit for Gate Review</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Gate name *" value={form.pm_gatename}
              onChange={(e) => setForm((f) => ({ ...f, pm_gatename: e.target.value }))} 
              placeholder="e.g. Gate 1: Concept Approval" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField select fullWidth label="Gate stage" value={form.pm_gatestage}
              onChange={(e) => setForm((f) => ({ ...f, pm_gatestage: Number(e.target.value) }))}>
              <MenuItem value={0}>Gate 1</MenuItem>
              <MenuItem value={1}>Gate 2</MenuItem>
              <MenuItem value={2}>Gate 3</MenuItem>
              <MenuItem value={3}>Gate 4</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned review date"
              value={form.pm_plannedreviewdate} onChange={(e) => setForm((f) => ({ ...f, pm_plannedreviewdate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Lead reviewer" value={form.pm_leadreviewer}
              onChange={(e) => setForm((f) => ({ ...f, pm_leadreviewer: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Documentation URL" value={form.pm_documentsurl}
              onChange={(e) => setForm((f) => ({ ...f, pm_documentsurl: e.target.value }))}
              placeholder="Link to SharePoint or Teams folder" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="success" disabled={!form.pm_gatename}>Submit for Review</Button>
      </DialogActions>
    </Dialog>
  )
}
