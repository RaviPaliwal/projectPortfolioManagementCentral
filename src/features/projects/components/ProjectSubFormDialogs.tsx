import React, { useState, useEffect, useCallback } from 'react'
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
} from '@mui/material'
import {
  createProjectMilestone,
  createRisk,
  createIssue,
  assignResource,
  createBudgetLine,
  createBenefit,
  createProjectTask,
  startWorkflowForEntity,
  GovernanceReadinessService
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
}

export const MilestoneDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_milestonename', label: 'Milestone name', type: 'text', required: true },
    { name: 'pm_planneddate', label: 'Planned date', type: 'date' },
    { name: 'pm_milestonetype', label: 'Type', type: 'select', options: [
      { value: '0', label: 'Delivery' }, { value: '1', label: 'Governance' }
    ]}
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      await createProjectMilestone({ ...data, _pm_project_value: projectId })
      onSuccess('Milestone added successfully.')
      onClose()
    } catch {
      onError('Unable to add milestone.')
    }
  }

  return <DynamicFormDialog open={open} title="Add Milestone" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Add" />
}

export const RiskDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_risktitle', label: 'Risk title', type: 'text', required: true },
    { name: 'pm_riskdescription', label: 'Description', type: 'multiline', rows: 3 },
    { name: 'pm_riskcategory', label: 'Category', type: 'select', defaultValue: '3', gridSize: 6, options: [
      { value: '0', label: 'Resource' }, { value: '1', label: 'Financial' }, { value: '2', label: 'Legal' }, { value: '3', label: 'Technical' }, { value: '4', label: 'External' }
    ]},
    { name: 'pm_ragstatus', label: 'RAG', type: 'select', defaultValue: '1', gridSize: 6, options: [
      { value: '1', label: 'Green' }, { value: '0', label: 'Amber' }, { value: '2', label: 'Red' }
    ]},
    { name: 'pm_riskowner', label: 'Risk owner', type: 'user-select' },
    { name: 'pm_targetclosedate', label: 'Target close date', type: 'date' }
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

export const ResourceDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const fields: FormField[] = [
    { name: 'pm_resourceName', label: 'Resource name', type: 'text', required: true },
    { name: 'pm_resourceId', label: 'Resource ID', type: 'text', required: true },
    { name: 'pm_allocatedhours', label: 'Allocated hours', type: 'number', defaultValue: 40, gridSize: 6 },
    { name: 'pm_assignmentrole', label: 'Role', type: 'text', gridSize: 6 },
    { name: 'pm_startdate', label: 'Start date', type: 'date', gridSize: 6 },
    { name: 'pm_enddate', label: 'End date', type: 'date', gridSize: 6 }
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const created = await assignResource({ pm_projectid: projectId, pm_resourceid: data.pm_resourceId, pm_allocatedhours: Number(data.pm_allocatedhours) || 0, pm_assignmentrole: data.pm_assignmentrole || '', pm_startdate: data.pm_startdate || '', pm_enddate: data.pm_enddate || '' })
      if (created?.pm_resourceallocationid) {
        try {
          await startWorkflowForEntity('default-template', created.pm_resourceallocationid, MODULE_NAMES.RESOURCES.value, 'System')
        } catch (wfErr) {
          console.error('[ResourceDialog] Failed to initiate workflow:', wfErr)
        }
      }
      onSuccess('Resource assigned successfully and workflow initiated.')
      onClose()
    } catch {
      onError('Unable to assign resource.')
    }
  }

  return <DynamicFormDialog open={open} title="Assign Resource" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Assign" />
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
    { name: 'pm_benefitcategory', label: 'Category', type: 'select', defaultValue: '1', gridSize: 6, options: [
      { value: '1', label: 'Financial' }, { value: '2', label: 'Strategic' }, { value: '0', label: 'Operational' }
    ]},
    { name: 'pm_benefitstatus', label: 'Status', type: 'select', defaultValue: '0', gridSize: 6, options: [
      { value: '0', label: 'Not Started' }, { value: '1', label: 'In Progress' }, { value: '2', label: 'Achieved' }
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

export const TaskDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
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
      await createProjectTask({ ...data, _pm_project_value: projectId, pm_durationdays: data.pm_durationdays || undefined })
      onSuccess('Task added successfully.')
      onClose()
    } catch {
      onError('Unable to add task.')
    }
  }

  return <DynamicFormDialog open={open} title="Add Task" fields={fields} onClose={onClose} onSubmit={handleSubmit} submitText="Add Task" />
}

// GateReviewDialog is kept largely intact because it requires a custom Readiness Check UI
// which is beyond the scope of a standard simple form.
export const GateReviewDialog: React.FC<SubDialogProps> = ({ open, onClose, projectId, onSuccess, onError }) => {
  const [form, setForm] = useState({ pm_gatename: '', pm_gatestage: 0, pm_plannedreviewdate: '', pm_documentsurl: '', pm_leadreviewer: '' })
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

      setForm({ pm_gatename: '', pm_gatestage: 0, pm_plannedreviewdate: '', pm_documentsurl: '', pm_leadreviewer: '' })
      onSuccess('Gate review scheduled successfully and workflow initiated.')
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
            <TextField fullWidth label="Lead reviewer" value={form.pm_leadreviewer}
              onChange={(e) => setForm((f) => ({ ...f, pm_leadreviewer: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Documentation URL" value={form.pm_documentsurl}
              onChange={(e) => setForm((f) => ({ ...f, pm_documentsurl: e.target.value }))}
              placeholder="Link to SharePoint or Teams folder" />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Governance Readiness Check</Typography>
                {checking && <Typography variant="caption" color="text.secondary">Checking...</Typography>}
              </Box>
              
              {readiness && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  {readiness.items.map((item: any) => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="body2" sx={{ 
                        color: item.status === 'passed' ? 'success.main' : item.status === 'failed' ? 'error.main' : 'warning.main',
                        fontWeight: 700, mt: 0.25
                      }}>
                        {item.status === 'passed' ? '✓' : item.status === 'failed' ? '✗' : '⚠'}
                      </Typography>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                        {item.message && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{item.message}</Typography>}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {!readiness && !checking && (
                <Typography variant="caption" color="text.secondary">Select a gate stage to run readiness check.</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button 
          onClick={handleAdd} 
          variant="contained" 
          color={readiness?.overallStatus === 'failed' ? 'inherit' : 'success'} 
          disabled={!form.pm_gatename || checking || readiness?.isReady === false}
        >
          {readiness?.isReady === false ? 'Not Ready for Submission' : 'Submit for Review'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
