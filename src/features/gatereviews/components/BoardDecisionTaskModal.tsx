import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  CircularProgress, TextField, Chip, Paper, IconButton, useTheme, alpha
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GavelIcon from '@mui/icons-material/Gavel'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import HistoryIcon from '@mui/icons-material/History'

import { fetchProjectDetails, fetchGateReviewById, createGateReview, updateGateReview, unwrapList, updateProject } from '@/services'
import { Pm_projectgatereviewsService } from '@/generated'
import type { Pm_projectgatereviews } from '@/generated/models/Pm_projectgatereviewsModel'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { fontSizes } from '@/styles/fontSizes'

const mapPhaseToGate = (phase: number | string | undefined): { stage: number; number: number } => {
  const p = phase !== undefined ? Number(phase) : 3 // default to Initiation
  if (p === 3) return { stage: 0, number: 1 } // Initiation -> Gate 1
  if (p === 1) return { stage: 1, number: 2 } // Planning -> Gate 2
  if (p === 0) return { stage: 2, number: 3 } // Execution -> Gate 3
  if (p === 2) return { stage: 3, number: 4 } // Closure -> Gate 4
  return { stage: 0, number: 1 } // fallback
}

const getNextPhase = (currentPhase: number | string | undefined): number | undefined => {
  if (currentPhase === undefined || currentPhase === null) return undefined
  const p = Number(currentPhase)
  if (p === 3) return 1 // Initiation -> Planning
  if (p === 1) return 0 // Planning -> Execution
  if (p === 0) return 2 // Execution -> Closure
  if (p === 2) return 5 // Closure -> Completed
  return undefined
}

interface BoardDecisionTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId?: string
  projectId?: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const BoardDecisionTaskModal: React.FC<BoardDecisionTaskModalProps> = ({
  open, onClose, gateReviewId, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [gateStage, setGateStage] = useState<number>(0)

  const [boardNotes, setBoardNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (gateReviewId) {
        const gr = await fetchGateReviewById(gateReviewId)
        if (!gr) { onError('Gate review not found.'); setLoading(false); return }
        setGateReview(gr)

        const projId = gr._pm_project_value || (gr as any)._pm_projectlookup_value || (gr as any).pm_project || gr.pm_projectcode
        if (projId) {
          const proj = await fetchProjectDetails(projId)
          setProject(proj)
        }
        setGateStage(Number(gr.pm_gatestage ?? 0))
      } else if (projectId) {
        const proj = await fetchProjectDetails(projectId)
        if (!proj) { onError('Project not found.'); setLoading(false); return }
        setProject(proj)

        const { stage: currentGateStage } = mapPhaseToGate(proj.pm_projectphase)
        setGateStage(currentGateStage)
      }
    } catch (err) {
      onError('Failed to load project details for board decision.')
    } finally { setLoading(false) }
  }, [gateReviewId, projectId, onError])

  useEffect(() => {
    if (open) { loadData(); setBoardNotes('') }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      const projId = projectId || project?.pm_projectid || gateReview?._pm_project_value

      // 1. Update or Create Gate Review
      if (gateReviewId) {
        const { stage, number } = mapPhaseToGate(project?.pm_projectphase)
        await updateGateReview(gateReviewId, {
          pm_reviewoutcome: workflowDecision === 0 ? 0 : 4,
          pm_reviewstatus: 0,
          pm_reviewnotes: boardNotes,
          pm_actualreviewdate: new Date().toISOString(),
          pm_gatestage: stage as any,
          pm_gatename: `Governance Board Decision - Gate ${number}`,
        })
        onSuccess(`Final Board Decision recorded. Outcome: ${decisionLabel}`)
      } else if (projId) {
        const { stage, number } = mapPhaseToGate(project?.pm_projectphase)
        const newReviewPayload: Partial<GateReviewModel> = {
          pm_gatename: `Governance Board Decision - Gate ${number}`,
          pm_gatestage: stage as any,
          pm_reviewoutcome: workflowDecision === 0 ? 0 : 4,
          pm_reviewstatus: 0,
          pm_actualreviewdate: new Date().toISOString(),
          pm_plannedreviewdate: new Date().toISOString(),
          pm_reviewnotes: boardNotes,
          _pm_project_value: projId,
        }
        const createdReview = await createGateReview(newReviewPayload)
        if (!createdReview) throw new Error('Failed to create gate review')
        onSuccess(`Final Board Decision recorded. Outcome: ${decisionLabel}. Gate review entry created.`)
      }

      // 2. Update Project Phase (only on approval)
      if (workflowDecision === 0 && projId) {
        const nextPhase = getNextPhase(project?.pm_projectphase)
        if (nextPhase !== undefined) {
          await updateProject(projId, { pm_projectphase: nextPhase })
        }
      }

      return true
    } catch (err) {
      onError('Unable to record board decision.')
      return false
    } finally { setSaving(false) }
  }, [gateReviewId, projectId, project, gateReview, boardNotes, onSuccess, onError])

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
                    {gateReview?.pm_gatename || `Governance Board Decision - Gate ${gateStage + 1} (New)`}
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
        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
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
        </DialogActions>
      )}
    </Dialog>
  )
}

export default BoardDecisionTaskModal
