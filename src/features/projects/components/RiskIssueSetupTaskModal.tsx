import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, TextField, Divider, Chip, Paper, Button,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import WarningIcon from '@mui/icons-material/Warning'
import BugReportIcon from '@mui/icons-material/BugReport'
import AddIcon from '@mui/icons-material/Add'
import { fetchProjectDetails, updateProject } from '@/services/project.service'
import type { ProjectModel } from '@/types/dataverse'
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

interface RiskEntry { description: string; probability: string; impact: string; mitigation: string }
interface IssueEntry { description: string; severity: string; owner: string }

export const RiskIssueSetupTaskModal: React.FC<RiskIssueSetupTaskModalProps> = ({
  open, onClose, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [risks, setRisks] = useState<RiskEntry[]>([])
  const [issues, setIssues] = useState<IssueEntry[]>([])
  const [newRisk, setNewRisk] = useState({ description: '', probability: 'Medium', impact: 'Medium', mitigation: '' })
  const [newIssue, setNewIssue] = useState({ description: '', severity: 'Medium', owner: '' })

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
    if (open) { loadData(); setRisks([]); setIssues([]) }
  }, [open, loadData])

  const handleAddRisk = () => {
    if (!newRisk.description.trim()) return
    setRisks(prev => [...prev, { ...newRisk }])
    setNewRisk({ description: '', probability: 'Medium', impact: 'Medium', mitigation: '' })
  }

  const handleAddIssue = () => {
    if (!newIssue.description.trim()) return
    setIssues(prev => [...prev, { ...newIssue }])
    setNewIssue({ description: '', severity: 'Medium', owner: '' })
  }

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      if (workflowDecision === 0) {
        await updateProject(projectId, { pm_projectphase: 1 })
      }
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Risk & Issue Register Setup completed. ${risks.length} risk(s) and ${issues.length} issue(s) logged. Decision: ${decisionLabel}.`)
      return true
    } catch {
      onError('Failed to save risk/issue task.')
      return false
    } finally { setSaving(false) }
  }, [projectId, risks.length, issues.length, onSuccess, onError])

  const probColor = (p: string) => p === 'High' ? 'error' : p === 'Medium' ? 'warning' : 'success'
  const sevColor = (s: string) => s === 'High' ? 'error' : s === 'Medium' ? 'warning' : 'success'

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
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <WarningIcon sx={{ fontSize: 18, color: 'error.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      <StatusTag label={r.probability} color={probColor(r.probability)} size="small" />
                      <StatusTag label={r.impact} color={probColor(r.impact)} size="small" />
                      {r.mitigation && <Typography variant="caption" color="text.secondary">Mitigation: {r.mitigation}</Typography>}
                    </Box>
                  </Box>
                </Paper>
              ))}

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 3, borderStyle: 'dashed' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Add Risk</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField size="small" label="Risk Description" fullWidth
                    value={newRisk.description}
                    onChange={(e) => setNewRisk(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Key resource may be unavailable" />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Probability</InputLabel>
                      <Select label="Probability" value={newRisk.probability}
                        onChange={(e) => setNewRisk(p => ({ ...p, probability: e.target.value }))}>
                        {['Low', 'Medium', 'High'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>Impact</InputLabel>
                      <Select label="Impact" value={newRisk.impact}
                        onChange={(e) => setNewRisk(p => ({ ...p, impact: e.target.value }))}>
                        {['Low', 'Medium', 'High'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <TextField size="small" label="Mitigation Plan" fullWidth
                    value={newRisk.mitigation}
                    onChange={(e) => setNewRisk(p => ({ ...p, mitigation: e.target.value }))}
                    placeholder="How will this risk be mitigated?" />
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddRisk}
                    disabled={!newRisk.description.trim()}
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
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BugReportIcon sx={{ fontSize: 18, color: 'error.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{iss.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      <StatusTag label={iss.severity} color={sevColor(iss.severity)} size="small" />
                      {iss.owner && <Typography variant="caption" color="text.secondary">Owner: {iss.owner}</Typography>}
                    </Box>
                  </Box>
                </Paper>
              ))}

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderStyle: 'dashed' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Add Issue</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField size="small" label="Issue Description" fullWidth
                    value={newIssue.description}
                    onChange={(e) => setNewIssue(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Delay in vendor delivery" />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Severity</InputLabel>
                      <Select label="Severity" value={newIssue.severity}
                        onChange={(e) => setNewIssue(p => ({ ...p, severity: e.target.value }))}>
                        {['Low', 'Medium', 'High'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Owner" fullWidth
                      value={newIssue.owner}
                      onChange={(e) => setNewIssue(p => ({ ...p, owner: e.target.value }))}
                      placeholder="Assignee name" />
                  </Box>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddIssue}
                    disabled={!newIssue.description.trim()}
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
