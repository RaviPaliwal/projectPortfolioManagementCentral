import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button,
  FormControl, InputLabel, Select, MenuItem, Autocomplete,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import WarningIcon from '@mui/icons-material/Warning'
import BugReportIcon from '@mui/icons-material/BugReport'
import AddIcon from '@mui/icons-material/Add'
import { fetchProjectDetails, createRisk, createIssue, fetchAllocatedResourcesByProject } from '@/services'
import type { ProjectModel, ResourceModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

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
  { value: 0, label: 'Amber' },
  { value: 1, label: 'Green' },
  { value: 2, label: 'Red' },
]
const ISSUE_CATEGORIES = [
  { value: 0, label: 'Scope' },
  { value: 1, label: 'Schedule' },
  { value: 2, label: 'Budget' },
  { value: 3, label: 'Quality' },
  { value: 4, label: 'Resource' },
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [allocatedResources, setAllocatedResources] = useState<ResourceModel[]>([])
  const [risks, setRisks] = useState<RiskEntry[]>([])
  const [issues, setIssues] = useState<IssueEntry[]>([])
  const [newRisk, setNewRisk] = useState({ pm_risktitle: '', pm_riskdescription: '', pm_riskcategory: 3, pm_ragstatus: 1, pm_riskowner: '', pm_targetclosedate: '' })
  const [newIssue, setNewIssue] = useState({ pm_issuetitle: '', pm_issuedescription: '', pm_issuecategory: 0, pm_ragstatus: 1, pm_prioritylevel: 0, pm_issueowner: '', pm_issueownerid: '', pm_targetresolutiondate: '' })

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
      console.error('[RiskIssueSetupTaskModal] load error:', err)
      onError(msg)
    } finally { setLoading(false) }
  }, [projectId, onError])

  useEffect(() => {
    if (open) { loadData(); setRisks([]); setIssues([]) }
  }, [open, loadData])

  const handleAddRisk = () => {
    if (!newRisk.pm_risktitle.trim()) return
    console.log('[RiskIssueSetupTaskModal] adding risk:', JSON.stringify(newRisk))
    setRisks(prev => { const next = [...prev, { ...newRisk }]; console.log('[RiskIssueSetupTaskModal] risks now:', JSON.stringify(next)); return next })
    setNewRisk({ pm_risktitle: '', pm_riskdescription: '', pm_riskcategory: 3, pm_ragstatus: 1, pm_riskowner: '', pm_targetclosedate: '' })
  }

  const handleAddIssue = () => {
    if (!newIssue.pm_issuetitle.trim()) return
    console.log('[RiskIssueSetupTaskModal] adding issue:', JSON.stringify(newIssue))
    setIssues(prev => { const next = [...prev, { ...newIssue }]; console.log('[RiskIssueSetupTaskModal] issues now:', JSON.stringify(next)); return next })
    setNewIssue({ pm_issuetitle: '', pm_issuedescription: '', pm_issuecategory: 0, pm_ragstatus: 1, pm_prioritylevel: 0, pm_issueowner: '', pm_issueownerid: '', pm_targetresolutiondate: '' })
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    console.log('[RiskIssueSetupTaskModal] saveTaskData called with decision:', workflowDecision)
    console.log('[RiskIssueSetupTaskModal] risks in state:', JSON.stringify(risks))
    console.log('[RiskIssueSetupTaskModal] issues in state:', JSON.stringify(issues))
    console.log('[RiskIssueSetupTaskModal] projectId:', projectId)
    if (workflowDecision !== 0) {
      console.log('[RiskIssueSetupTaskModal] Decision is not Approve (0), skipping creation')
      onSuccess('Risk & Issue Register Setup rejected.')
      return true
    }
    setSaving(true)
    try {
      for (let i = 0; i < risks.length; i++) {
        const payload = { ...risks[i], pm_projectid: projectId }
        console.log('[RiskIssueSetupTaskModal] creating risk', i, 'payload:', JSON.stringify(payload))
        const result = await createRisk(payload as any)
        console.log('[RiskIssueSetupTaskModal] createRisk result:', JSON.stringify(result))
      }
      for (let i = 0; i < issues.length; i++) {
        const payload = { ...issues[i], pm_projectid: projectId }
        console.log('[RiskIssueSetupTaskModal] creating issue', i, 'payload:', JSON.stringify(payload))
        const result = await createIssue(payload as any)
        console.log('[RiskIssueSetupTaskModal] createIssue result:', JSON.stringify(result))
      }
      console.log('[RiskIssueSetupTaskModal] All creates completed')
      onSuccess(`Risk & Issue Register Setup completed. ${risks.length} risk(s) and ${issues.length} issue(s) logged.`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save one or more risks or issues.'
      console.error('[RiskIssueSetupTaskModal] save error:', err)
      if (err instanceof Error) console.error('[RiskIssueSetupTaskModal] stack:', err.stack)
      onError(msg)
      return false
    } finally { setSaving(false) }
  }, [risks, issues, projectId, onSuccess, onError])

  const ragColor = (v: number) => v === 2 ? 'error' : v === 1 ? 'success' : 'warning'

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'error.main', color: 'error.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Risk & Issue Register Setup</Typography>
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
              <Box sx={{ mt: 4, p: 2, bgcolor: '#fef2f2', borderRadius: 1.5, border: '1px solid', borderColor: '#fecaca' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BugReportIcon sx={{ fontSize: 16 }} /> Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Log initial project risks and issues. Set up the risk register and issue tracker for ongoing monitoring throughout the project lifecycle.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {/* Risks Section */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} /> Risks ({risks.length})
              </Typography>

              {risks.map((r, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 1, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <WarningIcon sx={{ fontSize: 18, color: 'error.main', mt: 0.3 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.pm_risktitle}</Typography>
                    {r.pm_riskdescription && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{r.pm_riskdescription}</Typography>}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      <StatusTag label={RISK_CATEGORIES.find(c => c.value === r.pm_riskcategory)?.label || ''} size="small" />
                      <StatusTag label={RAG_OPTIONS.find(c => c.value === r.pm_ragstatus)?.label || ''} color={ragColor(r.pm_ragstatus)} size="small" />
                      {r.pm_riskowner && <Typography variant="caption" color="text.secondary">Owner: {r.pm_riskowner}</Typography>}
                    </Box>
                  </Box>
                </Paper>
              ))}

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 3, borderStyle: 'dashed' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Add Risk</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField size="small" label="Risk Title" fullWidth
                    value={newRisk.pm_risktitle}
                    onChange={(e) => setNewRisk(p => ({ ...p, pm_risktitle: e.target.value }))}
                    placeholder="e.g. Key resource may be unavailable" />
                  <TextField size="small" label="Description" fullWidth multiline rows={2}
                    value={newRisk.pm_riskdescription}
                    onChange={(e) => setNewRisk(p => ({ ...p, pm_riskdescription: e.target.value }))}
                    placeholder="Describe the risk" />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select label="Category" value={newRisk.pm_riskcategory}
                        onChange={(e) => setNewRisk(p => ({ ...p, pm_riskcategory: Number(e.target.value) }))}>
                        {RISK_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>RAG</InputLabel>
                      <Select label="RAG" value={newRisk.pm_ragstatus}
                        onChange={(e) => setNewRisk(p => ({ ...p, pm_ragstatus: Number(e.target.value) }))}>
                        {RAG_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={allocatedResources}
                      value={allocatedResources.find((r) => r.pm_fullname === newRisk.pm_riskowner) || null}
                      onChange={(_, newVal) => setNewRisk(p => ({ ...p, pm_riskowner: newVal?.pm_fullname || '' }))}
                      getOptionLabel={(opt) => opt.pm_fullname || ''}
                      isOptionEqualToValue={(opt, val) => opt.pm_resourceid === val.pm_resourceid}
                      renderInput={(params) => (
                        <TextField {...params} label="Risk Owner" placeholder="Search resource…" />
                      )}
                      noOptionsText="No allocated resources found"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.15 } }}
                    />
                    <TextField variant="outlined" size="small" label="Target Close Date" type="date"
                      slotProps={{ inputLabel: { shrink: true } }} fullWidth
                      value={newRisk.pm_targetclosedate}
                      onChange={(e) => setNewRisk(p => ({ ...p, pm_targetclosedate: e.target.value }))} />
                  </Box>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddRisk}
                    disabled={!newRisk.pm_risktitle.trim()}
                    sx={{ borderRadius: 1.5, alignSelf: 'flex-start' }}>
                    Add Risk
                  </Button>
                </Box>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* Issues Section */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BugReportIcon sx={{ fontSize: 16, color: 'error.main' }} /> Issues ({issues.length})
              </Typography>

              {issues.map((iss, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 1, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <BugReportIcon sx={{ fontSize: 18, color: 'error.main', mt: 0.3 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{iss.pm_issuetitle}</Typography>
                    {iss.pm_issuedescription && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{iss.pm_issuedescription}</Typography>}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      <StatusTag label={ISSUE_CATEGORIES.find(c => c.value === iss.pm_issuecategory)?.label || ''} size="small" />
                      <StatusTag label={RAG_OPTIONS.find(c => c.value === iss.pm_ragstatus)?.label || ''} color={ragColor(iss.pm_ragstatus)} size="small" />
                      <StatusTag label={PRIORITY_OPTIONS.find(c => c.value === iss.pm_prioritylevel)?.label || ''} size="small" />
                      {iss.pm_issueowner && <Typography variant="caption" color="text.secondary">Owner: {iss.pm_issueowner}</Typography>}
                    </Box>
                  </Box>
                </Paper>
              ))}

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderStyle: 'dashed' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Add Issue</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField size="small" label="Issue Title" fullWidth
                    value={newIssue.pm_issuetitle}
                    onChange={(e) => setNewIssue(p => ({ ...p, pm_issuetitle: e.target.value }))}
                    placeholder="e.g. Delay in vendor delivery" />
                  <TextField size="small" label="Description" fullWidth multiline rows={2}
                    value={newIssue.pm_issuedescription}
                    onChange={(e) => setNewIssue(p => ({ ...p, pm_issuedescription: e.target.value }))}
                    placeholder="Describe the issue" />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select label="Category" value={newIssue.pm_issuecategory}
                        onChange={(e) => setNewIssue(p => ({ ...p, pm_issuecategory: Number(e.target.value) }))}>
                        {ISSUE_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>RAG</InputLabel>
                      <Select label="RAG" value={newIssue.pm_ragstatus}
                        onChange={(e) => setNewIssue(p => ({ ...p, pm_ragstatus: Number(e.target.value) }))}>
                        {RAG_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority</InputLabel>
                      <Select label="Priority" value={newIssue.pm_prioritylevel}
                        onChange={(e) => setNewIssue(p => ({ ...p, pm_prioritylevel: Number(e.target.value) }))}>
                        {PRIORITY_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={allocatedResources}
                      value={allocatedResources.find((r) => r.pm_fullname === newIssue.pm_issueowner) || null}
                      onChange={(_, newVal) => setNewIssue(p => ({ ...p, pm_issueowner: newVal?.pm_fullname || '', pm_issueownerid: newVal?.pm_resourceid || '' }))}
                      getOptionLabel={(opt) => opt.pm_fullname || ''}
                      isOptionEqualToValue={(opt, val) => opt.pm_resourceid === val.pm_resourceid}
                      renderInput={(params) => (
                        <TextField {...params} label="Issue Owner" placeholder="Search resource…" />
                      )}
                      noOptionsText="No allocated resources found"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.15 } }}
                    />
                    <TextField variant="outlined" size="small" label="Target Resolution Date" type="date"
                      slotProps={{ inputLabel: { shrink: true } }} fullWidth
                      value={newIssue.pm_targetresolutiondate}
                      onChange={(e) => setNewIssue(p => ({ ...p, pm_targetresolutiondate: e.target.value }))} />
                  </Box>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddIssue}
                    disabled={!newIssue.pm_issuetitle.trim()}
                    sx={{ borderRadius: 1.5, alignSelf: 'flex-start' }}>
                    Add Issue
                  </Button>
                </Box>
              </Paper>
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
