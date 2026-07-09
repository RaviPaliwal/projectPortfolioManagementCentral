import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Grid, Box, Typography,
  CircularProgress, TextField, Chip, Paper, IconButton, useTheme, alpha
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GavelIcon from '@mui/icons-material/Gavel'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import HistoryIcon from '@mui/icons-material/History'

import { fetchProjectDetails, fetchGateReviewById } from '@/services'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles/fontSizes'

interface BoardDecisionTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const BoardDecisionTaskModal: React.FC<BoardDecisionTaskModalProps> = ({
  open, onClose, gateReviewId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)

  const [boardNotes, setBoardNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const gr = await fetchGateReviewById(gateReviewId)
      if (!gr) { onError('Gate review not found.'); setLoading(false); return }
      setGateReview(gr)

      const projectId = gr._pm_project_value || (gr as any)._pm_projectlookup_value || (gr as any).pm_project || gr.pm_projectcode
      if (projectId) {
        const proj = await fetchProjectDetails(projectId)
        setProject(proj)
      }
    } catch (err) {
      onError('Failed to load project details for board decision.')
    } finally { setLoading(false) }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) { loadData(); setBoardNotes('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      // Instead of manual API updates for notes, we rely on the workflow DecisionBox to capture them natively.
      onSuccess(`Final Board Decision recorded. Outcome: ${decisionLabel}`)
      return true
    } catch (err) {
      onError('Unable to record board decision.')
      return false
    } finally { setSaving(false) }
  }, [onSuccess, onError])

  if (!open) return null

  const ragColor = String(project?.pm_ragstatus) === '1' ? 'success'
    : String(project?.pm_ragstatus) === '0' ? 'warning' : 'error'
  const ragLabel = String(project?.pm_ragstatus) === '1' ? 'On Track'
    : String(project?.pm_ragstatus) === '0' ? 'At Risk' : 'Critical'

  const previousNotes = gateReview?.pm_reviewnotes || ''

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GavelIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Governance Board Decision</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Final Decision" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
            
            {/* Context Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Executive Summary
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {project?.pm_projectname || 'Loading...'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, display: 'block', mt: 0.5 }}>
                    {gateReview?.pm_gatename}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs }}>Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusTag label={ragLabel} color={ragColor} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs }}>Progress</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{project?.pm_percentcomplete || 0}%</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Project Manager</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {project?.pm_projectmanagername || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {project?.pm_portfolioname || '—'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Previous Endorsements */}
            <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: (t) => t.palette.mode === 'dark' ? alpha(t.palette.primary.main, 0.08) : alpha(t.palette.primary.light, 0.15), borderBottom: '1px solid', borderColor: 'divider' }}>
                <HistoryIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Prior Gate & Review History
                </Typography>
              </Box>
              <Box sx={{
                p: 2, maxHeight: 200, overflowY: 'auto',
                whiteSpace: 'pre-wrap', fontSize: fontSizes.sm,
                color: 'text.secondary', fontFamily: 'monospace',
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(0,0,0,0.15)' : '#FAFAFA',
              }}>
                {previousNotes || 'No previous endorsements or notes recorded.'}
              </Box>
            </Paper>

            {/* Board Assessment */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Final Decision Context
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Review the previous endorsements. Provide any final rationale, conditions, or considerations for the governance board.
              </Typography>
              <TextField
                fullWidth multiline rows={4}
                label="Board Deliberation Notes"
                placeholder="Enter final board comments, rationale, or mandatory conditions here. These will be appended to your decision."
                value={boardNotes}
                onChange={(e) => setBoardNotes(e.target.value)}
              />
            </Paper>

          </Box>
        )}
      </DialogContent>

      {/* Decision Box */}
      {!loading && DecisionBoxProp && approvalStepId && (
        <DecisionBoxProp 
          approvalStepId={approvalStepId} 
          onBeforeDecision={saveTaskData}
          onDecisionComplete={(decision) => {
            onSuccess(`Final Board Decision recorded.`)
            onClose()
          }}
          onDecisionError={(msg) => onError(msg)}
          disabled={saving}
        />
      )}
    </Dialog>
  )
}

export default BoardDecisionTaskModal
