import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, useTheme,
  FormControl, InputLabel, Select, MenuItem, Avatar, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PeopleIcon from '@mui/icons-material/People'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import { fetchProjectDetails, updateProject } from '@/services/project.service'
import { fetchSystemUsers } from '@/services/team.service'
import { createBudgetLine } from '@/services/finance.service'
import { startWorkflowForEntity } from '@/services/workflow.service'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { currencyFormatter } from '@/utils/formatters'
import { Button } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'
import { Pm_resourceallocationsService, Pm_resourcesService } from '@/generated'
import { normalizeLookupId, unwrapList } from '@/services/common'

interface ResourceBudgetPlanningTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

interface LocalBudgetLineEntry {
  pm_budgetlinename: string
  pm_costcategory: number
  pm_approvedbudgeteur: number
  pm_budgetlinestatus?: number
}

const COST_CATEGORY_OPTIONS = [
  { value: 0, label: 'Staff' },
  { value: 1, label: 'Contractors' },
  { value: 2, label: 'Licences' },
  { value: 3, label: 'Infrastructure' },
]

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Staff',
  '1': 'Contractors',
  '2': 'Licences',
  '3': 'Infrastructure',
}

export const ResourceBudgetPlanningTaskModal: React.FC<ResourceBudgetPlanningTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [addedBudgetLines, setAddedBudgetLines] = useState<LocalBudgetLineEntry[]>([])
  const [newBudgetLineName, setNewBudgetLineName] = useState('')
  const [newBudgetLineCategory, setNewBudgetLineCategory] = useState<number>(0)
  const [newBudgetLineAmount, setNewBudgetLineAmount] = useState<number>(0)
  const [resourceCost, setResourceCost] = useState<number>(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const proj = await fetchProjectDetails(projectId)

      if (!proj) { onError('Project not found.'); setLoading(false); return }
      setProject(proj)
      setAddedBudgetLines([])

      // Count working days of the project
      let projectWorkingDays = 0
      if (proj.pm_plannedstartdate && proj.pm_plannedenddate) {
        const ps = new Date(proj.pm_plannedstartdate)
        const pe = new Date(proj.pm_plannedenddate)
        if (!isNaN(ps.getTime()) && !isNaN(pe.getTime()) && ps <= pe) {
          const cur = new Date(ps)
          while (cur <= pe) {
            const day = cur.getDay()
            if (day !== 0 && day !== 6) projectWorkingDays++
            cur.setDate(cur.getDate() + 1)
          }
        }
      }

      // Fetch resource allocations for the project to calculate total resource cost
      const allocResult = await Pm_resourceallocationsService.getAll({
        filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
        select: ['_pm_resource_value', 'pm_allocatedhours', 'pm_startdate', 'pm_enddate'],
      })
      let costSum = 0
      if (allocResult.success) {
        const allocations = unwrapList(allocResult)
        const resourceIds = Array.from(new Set(allocations.map((a: any) => normalizeLookupId(a._pm_resource_value)).filter(Boolean))) as string[]
        if (resourceIds.length > 0) {
          const resResult = await Pm_resourcesService.getAll({
            filter: resourceIds.map(id => `pm_resourceid eq '${id}'`).join(' or '),
            select: ['pm_resourceid', 'pm_dailycostrate', 'pm_dailyworkcapacity'],
          })
          if (resResult.success) {
            const resourcesList = unwrapList(resResult) as any[]
            resourcesList.forEach((res: any) => {
              const dailyRate = Number(res.pm_dailycostrate) || 0
              costSum += projectWorkingDays * dailyRate
            })
          }
        }
      }
      setResourceCost(costSum)
    } catch (err) {
      console.error('Failed to load project details', err)
      onError('Failed to load project details.')
    } finally { setLoading(false) }
  }, [projectId, onError])

  useEffect(() => {
    if (open) { loadData(); setReviewNotes('') }
  }, [open, loadData])

  // Reactive prefill for staff budget line category
  useEffect(() => {
    if (newBudgetLineCategory === 0 && resourceCost > 0) {
      setNewBudgetLineAmount(Math.round(resourceCost))
    }
  }, [newBudgetLineCategory, resourceCost])

  const handleAddBudgetLine = () => {
    if (!newBudgetLineName.trim() || newBudgetLineAmount <= 0) return
    setAddedBudgetLines(prev => [...prev, {
      pm_budgetlinename: newBudgetLineName.trim(),
      pm_costcategory: newBudgetLineCategory,
      pm_approvedbudgeteur: newBudgetLineAmount,
      pm_budgetlinestatus: 1
    }])
    setNewBudgetLineName('')
    setNewBudgetLineCategory(0)
    setNewBudgetLineAmount(0)
  }

  const handleRemoveBudgetLine = (idx: number) => {
    setAddedBudgetLines(prev => prev.filter((_, i) => i !== idx))
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      // Create all locally added budget lines and initiate workflow for each of them
      for (const line of addedBudgetLines) {
        const created = await createBudgetLine({
          pm_budgetlinename: line.pm_budgetlinename,
          pm_costcategory: line.pm_costcategory,
          pm_approvedbudgeteur: line.pm_approvedbudgeteur,
          _pm_project_value: projectId,
        })
        
        // Auto-trigger approval workflow for the added budget line
        if (created && created.pm_budgetlineid) {
          try {
            await startWorkflowForEntity(
              'default-template',
              created.pm_budgetlineid,
              MODULE_NAMES.BUDGETS.value,
              'System'
            )
          } catch (wfErr) {
            console.error('[ResourceBudgetPlanningTaskModal] Workflow initiation failed for budget line:', created.pm_budgetlineid, wfErr)
          }
        }
      }

      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Budget Planning completed. ${addedBudgetLines.length} budget line(s) added and workflow triggered. Decision: ${decisionLabel}.`)
      return true
    } catch (err) {
      console.error('[ResourceBudgetPlanningTaskModal] saveTaskData error:', err)
      onError('Failed to save resource task.')
      return false
    } finally { setSaving(false) }
  }, [projectId, addedBudgetLines, onSuccess, onError])

  if (!open) return null

  const phaseLabels: Record<number, string> = { 0: 'Execution', 1: 'Planning', 2: 'Closure', 3: 'Initiation', 4: 'Rejected', 5: 'Completed' }
  const phaseLabel = project?.pm_projectphase != null
    ? phaseLabels[Number(project.pm_projectphase)] ?? `Phase ${project.pm_projectphase}`
    : '—'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Budget Planning</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
            {/* Project Context details Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Project Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                {project?.pm_projectname || 'Loading...'}
              </Typography>

              <Grid container spacing={2.5}>
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Actual Cost</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {project?.pm_actualcost != null ? currencyFormatter.format(project.pm_actualcost) : '—'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Phase</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{phaseLabel}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Project Manager</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{project?.pm_projectmanagername || '—'}</Typography>
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
              </Grid>
            </Paper>

            {/* Budget Lines WBS Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16 }} /> Proposed Budget Lines ({addedBudgetLines.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Budget Line Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={180}>Cost Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={160}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={180}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center" width={60}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {addedBudgetLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No budget lines proposed. Use the form below to add budget lines.
                        </TableCell>
                      </TableRow>
                    ) : (
                      addedBudgetLines.map((line, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{line.pm_budgetlinename}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={CATEGORY_LABELS[String(line.pm_costcategory)] || 'Unknown'}
                              size="small"
                              variant="outlined"
                              sx={{ height: 22, fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={line.pm_budgetlinestatus === 1 ? 'Under Approval' : 'Unknown'}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 22, fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                            {currencyFormatter.format(line.pm_approvedbudgeteur)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveBudgetLine(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Add Budget Line Subform (Single Row Layout) */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                <Grid container spacing={1.5} sx={{ alignItems: 'flex-end' }}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      size="small"
                      label="Budget Line Name"
                      fullWidth
                      value={newBudgetLineName}
                      onChange={(e) => setNewBudgetLineName(e.target.value)}
                      placeholder="e.g. Infrastructure Hosting Cost"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="budget-category-label">Category</InputLabel>
                      <Select
                        labelId="budget-category-label"
                        label="Category"
                        value={newBudgetLineCategory}
                        onChange={(e) => setNewBudgetLineCategory(Number(e.target.value))}
                      >
                        {COST_CATEGORY_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2.5 }}>
                    <TextField
                      size="small"
                      label="Amount (€)"
                      type="number"
                      fullWidth
                      value={newBudgetLineAmount || ''}
                      onChange={(e) => setNewBudgetLineAmount(Number(e.target.value))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 1.5 }} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleAddBudgetLine}
                      disabled={!newBudgetLineName.trim() || newBudgetLineAmount <= 0}
                      sx={{ height: 40, fontWeight: 600 }}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Information message banner */}
              {resourceCost > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <InfoIcon sx={{ fontSize: 18 }} /> Staff Cost Auto-Calculation
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      The total cost of allocated resources for the project duration is auto-calculated as <strong>{currencyFormatter.format(resourceCost)}</strong> based on assigned team members and their rates. Selecting the <strong>Staff</strong> category will automatically pre-fill this amount.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>

            {/* Review Notes */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Review Notes</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="Enter notes about resource requirements, budget allocation, or constraints..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </Box>

            {/* Instructions Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                <PeopleIcon sx={{ fontSize: 16 }} /> Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Review the budget and resource requirements. Ensure adequate funding and resource allocation before project execution.
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
              dispatchFormDialogDecision({ formKey: 'resource_budget_planning', decision })
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
