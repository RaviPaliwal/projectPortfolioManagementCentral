import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button,
  FormControl, InputLabel, Select, MenuItem, Autocomplete, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import WarningIcon from '@mui/icons-material/Warning'
import BugReportIcon from '@mui/icons-material/BugReport'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonIcon from '@mui/icons-material/Person'
import { fetchProjectDetails, createRisk, createIssue, fetchAllocatedResourcesByProject, updateProject } from '@/services'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectModel, ResourceModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'

interface RiskIssueSetupTaskModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

interface RiskEntry {
  pm_risktitle: string
  pm_riskdescription: string
  pm_riskcategory: number
  pm_ragstatus: number
  pm_riskowner: string
  pm_targetclosedate: string
}
interface IssueEntry {
  pm_issuetitle: string
  pm_issuedescription: string
  pm_issuecategory: number
  pm_ragstatus: number
  pm_prioritylevel: number
  pm_issueowner: string
  pm_targetresolutiondate: string
  pm_issueownerid?: string
}

const RISK_CATEGORIES = [
  { value: 0, label: 'Resource' },
  { value: 1, label: 'Financial' },
  { value: 2, label: 'Legal' },
  { value: 3, label: 'Technical' },
  { value: 4, label: 'External' },
]
const RAG_OPTIONS = [
  { value: 0, label: 'Medium' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'High' },
]
const ISSUE_CATEGORIES = [
  { value: 0, label: 'Dependency' },
  { value: 1, label: 'Technical' },
]
const PRIORITY_OPTIONS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'High' },
  { value: 2, label: 'Critical' },
]

export const RiskIssueSetupTaskModal: React.FC<RiskIssueSetupTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [allocatedResources, setAllocatedResources] = useState<ResourceModel[]>([])
  const [risks, setRisks] = useState<RiskEntry[]>([])
  const [issues, setIssues] = useState<IssueEntry[]>([])
  
  const [newRisk, setNewRisk] = useState({
    pm_risktitle: '',
    pm_riskdescription: '',
    pm_riskcategory: 3,
    pm_ragstatus: 1,
    pm_riskowner: '',
    pm_targetclosedate: ''
  })
  
  const [newIssue, setNewIssue] = useState({
    pm_issuetitle: '',
    pm_issuedescription: '',
    pm_issuecategory: 0,
    pm_ragstatus: 1,
    pm_prioritylevel: 0,
    pm_issueowner: '',
    pm_issueownerid: '',
    pm_targetresolutiondate: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, res] = await Promise.all([
        fetchProjectDetails(projectId),
        fetchAllocatedResourcesByProject(projectId),
      ])
      if (!proj) { onError('Project not found.'); setLoading(false); return }
      setProject(proj)
      setAllocatedResources(res || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load project details.'
      onError(msg)
    } finally { setLoading(false) }
  }, [projectId, onError])

  useEffect(() => {
    if (open) { loadData(); setRisks([]); setIssues([]) }
  }, [open, loadData])

  const handleAddRisk = () => {
    if (!newRisk.pm_risktitle.trim()) return
    setRisks(prev => [...prev, { ...newRisk }])
    setNewRisk({ pm_risktitle: '', pm_riskdescription: '', pm_riskcategory: 3, pm_ragstatus: 1, pm_riskowner: '', pm_targetclosedate: '' })
  }

  const handleAddIssue = () => {
    if (!newIssue.pm_issuetitle.trim()) return
    setIssues(prev => [...prev, { ...newIssue }])
    setNewIssue({ pm_issuetitle: '', pm_issuedescription: '', pm_issuecategory: 0, pm_ragstatus: 1, pm_prioritylevel: 0, pm_issueowner: '', pm_issueownerid: '', pm_targetresolutiondate: '' })
  }

  const handleRemoveRisk = (idx: number) => {
    setRisks(prev => prev.filter((_, i) => i !== idx))
  }

  const handleRemoveIssue = (idx: number) => {
    setIssues(prev => prev.filter((_, i) => i !== idx))
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (workflowDecision !== 0) {
      onSuccess('Risk & Issue Register Setup rejected.')
      return true
    }
    setSaving(true)
    try {
      for (let i = 0; i < risks.length; i++) {
        const payload = { ...risks[i], pm_projectid: projectId }
        await createRisk(payload as any)
      }
      for (let i = 0; i < issues.length; i++) {
        const payload = { ...issues[i], pm_projectid: projectId }
        await createIssue(payload as any)
      }
      // Transition project phase from Initiation (3) to Planning (1)
      try {
        await updateProject(projectId, { pm_projectphase: 1 })
      } catch (phaseErr) {
        console.error('[RiskIssueSetupTaskModal] Phase transition failed:', phaseErr)
      }
      onSuccess(`Risk & Issue Register Setup completed. ${risks.length} risk(s) and ${issues.length} issue(s) logged. Project transitioned to Planning phase.`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save one or more risks or issues.'
      onError(msg)
      return false
    } finally { setSaving(false) }
  }, [risks, issues, projectId, onSuccess, onError])

  const ragColor = (v: number) => v === 2 ? 'error' : v === 1 ? 'success' : 'warning'

  if (!open) return null

  const phaseLabels: Record<number, string> = { 0: 'Execution', 1: 'Planning', 2: 'Closure', 3: 'Initiation', 4: 'Rejected', 5: 'Completed' }
  const phaseLabel = project?.pm_projectphase != null
    ? phaseLabels[Number(project.pm_projectphase)] ?? `Phase ${project.pm_projectphase}`
    : '—'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Risk & Issue Register Setup</Typography>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Log Risks</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{risks.length}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Log Issues</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{issues.length}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* RISKS SECTION */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Risks Register ({risks.length})
              </Typography>
              
              {/* Risks Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Risk Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={100}>RAG</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={150}>Owner</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Target Close</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center" width={60}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {risks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                          No risks added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      risks.map((r, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.pm_risktitle}</Typography>
                              {r.pm_riskdescription && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                  {r.pm_riskdescription}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {RISK_CATEGORIES.find(c => c.value === r.pm_riskcategory)?.label}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={RAG_OPTIONS.find(c => c.value === r.pm_ragstatus)?.label || ''}
                              color={ragColor(r.pm_ragstatus)}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            {r.pm_riskowner ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2">{r.pm_riskowner}</Typography>
                              </Box>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {r.pm_targetclosedate ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {new Date(r.pm_targetclosedate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Typography>
                              </Box>
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveRisk(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Add Risk Subform (Compact Grid Layout) */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                <Grid container spacing={1.5} sx={{ alignItems: 'flex-end' }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField size="small" label="Risk Title" fullWidth
                      value={newRisk.pm_risktitle}
                      onChange={(e) => setNewRisk(p => ({ ...p, pm_risktitle: e.target.value }))}
                      placeholder="e.g. key resource unavailable..."
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField size="small" label="Description" fullWidth
                      value={newRisk.pm_riskdescription}
                      onChange={(e) => setNewRisk(p => ({ ...p, pm_riskdescription: e.target.value }))}
                      placeholder="Describe the risk (optional)..."
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="risk-category-label">Category</InputLabel>
                      <Select
                        labelId="risk-category-label"
                        label="Category"
                        value={newRisk.pm_riskcategory}
                        onChange={(e) => setNewRisk(p => ({ ...p, pm_riskcategory: Number(e.target.value) }))}>
                        {RISK_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="risk-rag-label">RAG</InputLabel>
                      <Select
                        labelId="risk-rag-label"
                        label="RAG"
                        value={newRisk.pm_ragstatus}
                        onChange={(e) => setNewRisk(p => ({ ...p, pm_ragstatus: Number(e.target.value) }))}>
                        {RAG_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3.5 }}>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={allocatedResources}
                      value={allocatedResources.find((r) => r.pm_fullname === newRisk.pm_riskowner) || null}
                      onChange={(_, newVal) => setNewRisk(p => ({ ...p, pm_riskowner: newVal?.pm_fullname || '' }))}
                      getOptionLabel={(opt) => opt.pm_fullname || ''}
                      isOptionEqualToValue={(opt, val) => opt.pm_resourceid === val.pm_resourceid}
                      renderInput={(params) => (
                        <TextField {...params} label="Risk Owner" placeholder="Owner…" />
                      )}
                      noOptionsText="No allocated resources found"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField variant="outlined" size="small" label="Target Close" type="date"
                      slotProps={{ inputLabel: { shrink: true } }} fullWidth
                      value={newRisk.pm_targetclosedate}
                      onChange={(e) => setNewRisk(p => ({ ...p, pm_targetclosedate: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 1.5 }} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Button variant="contained" fullWidth onClick={handleAddRisk}
                      disabled={!newRisk.pm_risktitle.trim()}
                      sx={{ height: 40, fontWeight: 600 }}>
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            <Divider />

            {/* ISSUES SECTION */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BugReportIcon sx={{ fontSize: 16, color: 'error.main' }} /> Issues Tracker ({issues.length})
              </Typography>
              
              {/* Issues Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Issue Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={100}>RAG</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={100}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={150}>Owner</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>Target Resolution</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center" width={60}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                          No issues added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      issues.map((iss, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{iss.pm_issuetitle}</Typography>
                              {iss.pm_issuedescription && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                  {iss.pm_issuedescription}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {ISSUE_CATEGORIES.find(c => c.value === iss.pm_issuecategory)?.label}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={RAG_OPTIONS.find(c => c.value === iss.pm_ragstatus)?.label || ''}
                              color={ragColor(iss.pm_ragstatus)}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={PRIORITY_OPTIONS.find(c => c.value === iss.pm_prioritylevel)?.label || ''}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            {iss.pm_issueowner ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2">{iss.pm_issueowner}</Typography>
                              </Box>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {iss.pm_targetresolutiondate ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {new Date(iss.pm_targetresolutiondate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Typography>
                              </Box>
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveIssue(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Add Issue Subform */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                <Grid container spacing={1.5} sx={{ alignItems: 'flex-end' }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField size="small" label="Issue Title" fullWidth
                      value={newIssue.pm_issuetitle}
                      onChange={(e) => setNewIssue(p => ({ ...p, pm_issuetitle: e.target.value }))}
                      placeholder="e.g. vendor delay..."
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField size="small" label="Description" fullWidth
                      value={newIssue.pm_issuedescription}
                      onChange={(e) => setNewIssue(p => ({ ...p, pm_issuedescription: e.target.value }))}
                      placeholder="Describe the issue (optional)..."
                    />
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="issue-category-label">Category</InputLabel>
                      <Select
                        labelId="issue-category-label"
                        label="Category"
                        value={newIssue.pm_issuecategory}
                        onChange={(e) => setNewIssue(p => ({ ...p, pm_issuecategory: Number(e.target.value) }))}>
                        {ISSUE_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="issue-rag-label">RAG</InputLabel>
                      <Select
                        labelId="issue-rag-label"
                        label="RAG"
                        value={newIssue.pm_ragstatus}
                        onChange={(e) => setNewIssue(p => ({ ...p, pm_ragstatus: Number(e.target.value) }))}>
                        {RAG_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 4, sm: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="issue-priority-label">Priority</InputLabel>
                      <Select
                        labelId="issue-priority-label"
                        label="Priority"
                        value={newIssue.pm_prioritylevel}
                        onChange={(e) => setNewIssue(p => ({ ...p, pm_prioritylevel: Number(e.target.value) }))}>
                        {PRIORITY_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2.5 }}>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={allocatedResources}
                      value={allocatedResources.find((r) => r.pm_fullname === newIssue.pm_issueowner) || null}
                      onChange={(_, newVal) => setNewIssue(p => ({ ...p, pm_issueowner: newVal?.pm_fullname || '', pm_issueownerid: newVal?.pm_resourceid || '' }))}
                      getOptionLabel={(opt) => opt.pm_fullname || ''}
                      isOptionEqualToValue={(opt, val) => opt.pm_resourceid === val.pm_resourceid}
                      renderInput={(params) => (
                        <TextField {...params} label="Issue Owner" placeholder="Owner…" />
                      )}
                      noOptionsText="No allocated resources found"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField variant="outlined" size="small" label="Target Date" type="date"
                      slotProps={{ inputLabel: { shrink: true } }} fullWidth
                      value={newIssue.pm_targetresolutiondate}
                      onChange={(e) => setNewIssue(p => ({ ...p, pm_targetresolutiondate: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 1.5 }} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Button variant="contained" fullWidth onClick={handleAddIssue}
                      disabled={!newIssue.pm_issuetitle.trim()}
                      sx={{ height: 40, fontWeight: 600 }}>
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Instructions Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.error.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }}>
                <BugReportIcon sx={{ fontSize: 16 }} /> Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Log initial project risks and issues. Set up the risk register and issue tracker for ongoing monitoring throughout the project lifecycle.
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
              dispatchFormDialogDecision({ formKey: 'risk_issue_setup', decision })
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
