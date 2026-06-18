import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, Box, Typography,
  CircularProgress, TextField, Paper, Divider, Chip,
  IconButton, useTheme, alpha
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GavelIcon from '@mui/icons-material/Gavel'
import FlagIcon from '@mui/icons-material/Flag'
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import HistoryIcon from '@mui/icons-material/History'

import { fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import { submitWorkflowDecision } from '@/services/workflow.service'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { StatusTag, Button } from '@/components/common'
import { fontSizes } from '@/styles/fontSizes'

// ── Props ──────────────────────────────────────────────────────────────

interface BoardDecisionTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  approvalStepId?: string
}

// ══════════════════════════════════════════════════════════════════════
//  SUCCESS SCREEN
// ══════════════════════════════════════════════════════════════════════

interface SuccessScreenProps {
  outcome: number
  projectName?: string
  gateName?: string
  onBack: () => void
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ outcome, projectName, gateName, onBack }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const map: Record<number, { color: string; label: string; emoji: string }> = {
    0: { color: theme.palette.success.main, label: 'Gate Approved',       emoji: '🎉' },
    1: { color: theme.palette.warning.main, label: 'Conditional Approval', emoji: '📋' },
    2: { color: theme.palette.error.main, label: 'Not Approved',          emoji: '🚫' },
  }
  const d = map[outcome] || map[0]

  return (
    <Box
      sx={{
        minHeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.08)} 100%)`
          : `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.2)} 0%, ${alpha(theme.palette.success.light, 0.2)} 100%)`,
        p: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 460,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ fontSize: 56, lineHeight: 1 }}>{d.emoji}</Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: d.color }}>
          {d.label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, lineHeight: 1.7 }}>
          Your decision has been recorded. The governance board and project team have been notified.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 0.5 }}>
          {projectName && <Chip label={projectName} size="small" variant="outlined" sx={{ fontWeight: 600 }} />}
          {gateName && <Chip label={gateName} size="small" variant="outlined" sx={{ fontWeight: 600 }} />}
        </Box>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{ mt: 1, fontWeight: 600 }}
        >
          ← Back to Review
        </Button>
      </Paper>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export const BoardDecisionTaskModal: React.FC<BoardDecisionTaskModalProps> = ({
  open, onClose, gateReviewId, onSuccess, onError,
  approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const OUTCOME_OPTIONS = [
    { value: 0, label: 'Approved',          color: theme.palette.success.main, desc: 'Project proceeds to the next gate stage.' },
    { value: 1, label: 'Conditional Approval', color: theme.palette.warning.main, desc: 'Approve subject to mandatory conditions.' },
    { value: 4, label: 'Not Approved',       color: theme.palette.error.main, desc: 'Project does not proceed; returns to planning.' },
  ]

  // ── Data State ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // ── Form State ─────────────────────────────────────────────────────
  const [outcome, setOutcome] = useState(2)
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0])
  const [boardComments, setBoardComments] = useState('')
  const [conditions, setConditions] = useState('')

  // ── Load Data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const gr = await fetchGateReviewById(gateReviewId)
      if (!gr) { onError('Gate review not found.'); setLoading(false); return }
      setGateReview(gr)

      const projectId = gr._pm_project_value ||
                        (gr as any)._pm_projectlookup_value ||
                        (gr as any).pm_project ||
                        gr.pm_projectcode

      if (projectId) {
        const proj = await fetchProjectDetails(projectId)
        setProject(proj)
      }

      setOutcome(Number(gr.pm_reviewoutcome ?? 2))
      setReviewDate(gr.pm_actualreviewdate || new Date().toISOString().split('T')[0])
      setConditions(gr.pm_reviewconditions || '')
    } catch (err) {
      console.error('Failed to load Board task data', err)
      onError('Failed to load project details for board decision.')
    } finally { setLoading(false) }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) {
      loadData()
      setSubmitted(false)
      setBoardComments('')
    }
  }, [open, loadData])

  // ── Build Notes ────────────────────────────────────────────────────
  const buildDecisionEntry = useCallback(() => {
    const outcomeLabel = outcome === 0 ? 'APPROVED' : outcome === 1 ? 'CONDITIONAL APPROVAL' : 'NOT APPROVED'
    let entry = `\n\n--- Final Board Decision ---\nOutcome: ${outcomeLabel}\nDate: ${reviewDate}\nComments:\n${boardComments || 'None provided.'}`
    if (outcome === 1 && conditions.trim()) {
      entry += `\nConditions:\n${conditions}`
    }
    return entry
  }, [outcome, reviewDate, boardComments, conditions])

  // ── Handle Submit ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!gateReview?.pm_projectgatereviewid) return

    setSaving(true)
    try {
      const existingNotes = gateReview.pm_reviewnotes || ''
      const newEntry = buildDecisionEntry()

      await updateGateReview(gateReview.pm_projectgatereviewid, {
        pm_reviewoutcome: outcome,
        pm_reviewstatus: outcome === 4 ? 1 : 0,
        pm_actualreviewdate: reviewDate,
        pm_reviewnotes: existingNotes + newEntry,
        pm_reviewconditions: outcome === 1 ? conditions : '',
      } as any)

      // If this is a workflow step, also submit the workflow decision
      if (approvalStepId) {
        const workflowDecision = outcome === 0 || outcome === 1 ? 0 : 3
        const notes = buildDecisionEntry()
        const workflowSuccess = await submitWorkflowDecision(approvalStepId, workflowDecision, notes)
        if (!workflowSuccess) {
          onError('Decision saved to gate review but workflow submission failed.')
          setSaving(false)
          return
        }

        const outcomeLabel = outcome === 0 ? 'Approved' : outcome === 1 ? 'Conditional Approval' : 'Not Approved'
        onSuccess(`Final Decision recorded. Outcome: ${outcomeLabel}`)
        onClose()
      } else {
        // Standalone mode: notify parent to refresh data
        const outcomeLabel = outcome === 0 ? 'Approved' : outcome === 1 ? 'Conditional Approval' : 'Not Approved'
        onSuccess(`Final Decision recorded. Outcome: ${outcomeLabel}`)
        onClose()
      }
    } catch (err) {
      console.error('Decision record error:', err)
      onError('Unable to record board decision.')
    } finally { setSaving(false) }
  }, [gateReview, outcome, reviewDate, boardComments, conditions, buildDecisionEntry, approvalStepId, onSuccess, onError, onClose])

  if (!open) return null

  const ragColor = String(project?.pm_ragstatus) === '1' ? 'success'
    : String(project?.pm_ragstatus) === '0' ? 'warning' : 'error'
  const ragLabel = String(project?.pm_ragstatus) === '1' ? 'On Track'
    : String(project?.pm_ragstatus) === '0' ? 'At Risk' : 'Critical'

  const previousNotes = gateReview?.pm_reviewnotes || ''

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { sx: { overflow: 'hidden', maxHeight: '90vh', minHeight: 500 } },
      }}
    >
      {submitted ? (
        <>
          {/* Submitted state header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
               <Box sx={{ width: 36, height: 36, bgcolor: outcome === 4 ? theme.palette.error.main : outcome === 1 ? theme.palette.warning.main : theme.palette.success.main, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: '50%' }}>
                <GavelIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Governance Board Decision</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
          <SuccessScreen
            outcome={outcome}
            projectName={project?.pm_projectname}
            gateName={gateReview?.pm_gatename}
            onBack={() => { setSubmitted(false); setBoardComments('') }}
          />
        </>
      ) : (
        <>
          {/* ── Header ────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'success.contrastText', borderRadius: '50%' }}>
                <GavelIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Governance Board Decision</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: fontSizes.sm }}>
                  {gateReview?.pm_gatename || project?.pm_projectcode ? `${project?.pm_projectcode} · ${gateReview?.pm_gatename || ''}` : 'Gate Review'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="Pending Final Decision" color="warning" size="small" sx={{ fontWeight: 700 }} />
              <IconButton size="small" onClick={onClose} disabled={saving}><CloseIcon fontSize="small" /></IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 0, bgcolor: 'background.default', display: 'flex' }}>
            {loading ? (
              <Box sx={{ flex: 1, p: 6, textAlign: 'center' }}>
                <CircularProgress size={36} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">Loading board decision data...</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: '100%' }}>
                {/* ─── Left Sidebar ─────────────────────────────────── */}
                <Box
                  sx={{
                    width: { xs: '100%', md: 220 },
                    flexShrink: 0,
                    borderRight: { md: '1px solid' },
                    borderBottom: { xs: '1px solid', md: 'none' },
                    borderColor: 'divider',
                    bgcolor: isDark ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.success.light, 0.2),
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {/* Brand row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ width: 32, height: 32, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: '50%' }}>
                      <GavelIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? '#86EFAC' : '#166534', display: 'block', lineHeight: 1.2 }}>
                        Governance Board
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: fontSizes.xs, color: isDark ? '#4ADE80' : '#22C55E' }}>
                        Final Decision
                      </Typography>
                    </Box>
                  </Box>

                  {/* Steps navigation (single step since board decision is one action) */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                    {[
                      { id: 'context', label: 'Project Context', icon: '📋', done: true },
                      { id: 'approvals', label: 'Prior Endorsements', icon: '✅', done: true },
                      { id: 'decision', label: 'Board Decision', icon: '⚖️', active: true },
                    ].map((st) => (
                      <Box
                        key={st.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.25,
                          borderRadius: 1,
                          bgcolor: st.active ? (isDark ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.success.light, 0.08)) : 'transparent',
                          borderLeft: '2px solid',
                          borderLeftColor: st.active ? 'success.main' : 'transparent',
                        }}
                      >
                        <Box
                          sx={{
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: fontSizes.xs, fontWeight: 700, flexShrink: 0,
                            bgcolor: st.done ? '#22C55E' : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                            color: st.done ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280'),
                          }}
                        >
                          {st.done ? '✓' : '3'}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: st.active ? 700 : 500, fontSize: fontSizes.sm,
                            color: st.active ? (isDark ? '#86EFAC' : '#166534') : (isDark ? '#9CA3AF' : '#6B7280'),
                          }}
                        >
                          {st.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Project mini card at bottom */}
                  <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      Pending Board Decision
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: fontSizes.xs }}>
                      {project?.pm_projectmanagername || project?.pm_projectname || ''}
                    </Typography>
                  </Box>
                </Box>

                {/* ─── Content Area ──────────────────────────────────── */}
                <Box sx={{ flex: 1, p: 2.5, overflow: 'auto', maxHeight: { md: 'calc(90vh - 140px)' } }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: fontSizes.xs }}>
                      ⚖️ Board Decision
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                      Record Final Decision
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Project Summary Card */}
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: (t) => t.palette.mode === 'dark' ? alpha(t.palette.success.main, 0.05) : alpha(t.palette.success.light, 0.2) }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {project?.pm_projectname || 'Loading...'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {project?.pm_projectcode} · {gateReview?.pm_gatename}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <StatusTag label={ragLabel} color={ragColor} />
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs }}>Progress</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{project?.pm_percentcomplete || 0}%</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{project?.pm_projectmanagername || '—'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{project?.pm_portfolioname || '—'}</Typography>
                        </Box>
                      </Box>
                    </Paper>

                    {/* Previous Endorsements */}
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: (t) => t.palette.mode === 'dark' ? alpha(t.palette.primary.main, 0.08) : alpha(t.palette.primary.light, 0.15), borderBottom: '1px solid', borderColor: 'divider' }}>
                        <HistoryIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Previous Endorsements & Notes
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2, maxHeight: 160, overflowY: 'auto',
                        whiteSpace: 'pre-wrap', fontSize: fontSizes.sm,
                        color: 'text.secondary', fontFamily: 'monospace',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(0,0,0,0.15)' : '#FAFAFA',
                      }}>
                        {previousNotes || 'No previous endorsements or notes recorded.'}
                      </Box>
                    </Paper>

                    <Divider />

                    {/* Decision Form */}
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1.5, fontSize: fontSizes.xs }}>
                        Decision Details
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Outcome Picker */}
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Board Outcome
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {OUTCOME_OPTIONS.map((opt) => {
                            const isSelected = outcome === opt.value
                            return (
                              <Box
                                key={opt.value}
                                onClick={() => setOutcome(opt.value)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  border: '1.5px solid',
                                  borderColor: isSelected ? (isDark ? alpha(opt.color, 0.5) : opt.color) : 'divider',
                                  p: 1.5,
                                  cursor: 'pointer',
                                  bgcolor: isSelected ? (isDark ? alpha(opt.color, 0.15) : alpha(opt.color, 0.08)) : 'transparent',
                                  transition: 'all 0.15s ease',
                                  '&:hover': { borderColor: opt.color, bgcolor: (t) => t.palette.mode === 'dark' ? alpha(opt.color, 0.1) : alpha(opt.color, 0.04) },
                                }}
                              >
                                <input
                                  type="radio"
                                  name="board-outcome"
                                  checked={isSelected}
                                  onChange={() => setOutcome(opt.value)}
                                  style={{ accentColor: opt.color, margin: 0, flexShrink: 0 }}
                                />
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: opt.color }}>
                                    {opt.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {opt.desc}
                                  </Typography>
                                </Box>
                              </Box>
                            )
                          })}
                        </Box>

                        {/* Review Date */}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Actual Review Date
                          </Typography>
                          <TextField
                            type="date"
                            fullWidth
                            size="small"
                            value={reviewDate}
                            onChange={(e) => setReviewDate(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        </Box>

                        {/* Board Comments */}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Final Board Comments <Box component="span" sx={{ color: theme.palette.error.main }}>*</Box>
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={boardComments}
                            onChange={(e) => setBoardComments(e.target.value)}
                            placeholder="Summarize the board's rationale for this decision..."
                          />
                        </Box>

                        {/* Conditions (conditional only) */}
                        {outcome === 1 && (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: 'warning.main' }}>
                              <FlagIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                              Mandatory Conditions for Progression
                            </Typography>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              value={conditions}
                              onChange={(e) => setConditions(e.target.value)}
                              placeholder="What specific conditions must the PM meet before the next phase?"
                              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'warning.main' } } }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>

          {/* ─── Bottom Bar ──────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onClose}
              disabled={saving}
              sx={{ fontWeight: 600, fontSize: fontSizes.sm }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              size="medium"
              disabled={!boardComments.trim() || saving}
              onClick={handleSubmit}
              sx={{
                fontWeight: 700,
                px: 3,
                py: 1,
                bgcolor: outcome === 4 ? theme.palette.error.main : outcome === 1 ? theme.palette.warning.main : theme.palette.success.main,
                '&:hover': {
                  bgcolor: outcome === 4 ? theme.palette.error.dark : outcome === 1 ? theme.palette.warning.dark : theme.palette.success.dark,
                },
              }}
            >
              {saving ? 'Submitting...' : `Submit Board Decision →`}
            </Button>
          </Box>
        </>
      )}
    </Dialog>
  )
}

export default BoardDecisionTaskModal
