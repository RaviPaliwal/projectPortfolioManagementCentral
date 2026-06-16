import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, Box, Typography,
  Button, CircularProgress, TextField, Paper, Divider, Chip,
  IconButton, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import PercentIcon from '@mui/icons-material/Percent'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

import { fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import { submitWorkflowDecision } from '@/services/workflow.service'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import { currencyFormatter } from '@/utils/formatters'

// ── Constants ──────────────────────────────────────────────────────────

const DECISION_OPTIONS = [
  {
    value: 'endorse',
    label: 'Endorse Financials',
    color: '#10B981',
    desc: 'Financials are cleared. The governance board can proceed with their final decision.',
  },
  {
    value: 'reject',
    label: 'Reject Financials',
    color: '#EF4444',
    desc: 'Financial concerns identified. Project must resolve before board decision.',
  },
]

// ── Props ──────────────────────────────────────────────────────────────

interface FinancialReviewTaskModalProps {
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
  decision: string
  projectName?: string
  gateName?: string
  onBack: () => void
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ decision, projectName, gateName, onBack }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const map: Record<string, { color: string; label: string; emoji: string }> = {
    endorse: { color: '#10B981', label: 'Financials Endorsed', emoji: '✅' },
    reject:  { color: '#EF4444', label: 'Financials Rejected',  emoji: '🚫' },
  }
  const d = map[decision] || map.endorse

  return (
    <Box
      sx={{
        minHeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(16,185,129,0.08) 100%)'
          : 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)',
        p: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: 3,
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
          {decision === 'endorse'
            ? 'Financials cleared. The governance board has been notified to proceed.'
            : 'Financials rejected. The project team will be notified to address concerns.'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 0.5 }}>
          {projectName && <Chip label={projectName} size="small" variant="outlined" sx={{ fontWeight: 600 }} />}
          {gateName && <Chip label={gateName} size="small" variant="outlined" sx={{ fontWeight: 600 }} />}
        </Box>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{ mt: 1, borderRadius: 1.5, fontWeight: 600 }}
        >
          ← Back to Review
        </Button>
      </Paper>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  BUDGET BAR COMPONENT
// ══════════════════════════════════════════════════════════════════════

interface BudgetBarProps {
  budget: number
  spend: number
}

const BudgetBar: React.FC<BudgetBarProps> = ({ budget, spend }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const pct = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0
  const remaining = budget - spend
  const remainingPct = budget > 0 ? Math.max(0, Math.round((Math.max(0, remaining) / budget) * 100)) : 0

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Budget Utilisation</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#10B981' }}>
          {pct}% used
        </Typography>
      </Box>
      <Box sx={{ height: 10, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
        <Box
          sx={{
            height: '100%',
            width: `${pct}%`,
            bgcolor: pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#6366F1',
            borderRadius: 5,
            transition: 'width 0.6s ease',
          }}
        />
        {remainingPct > 0 && (
          <Box
            sx={{
              height: '100%',
              width: `${remainingPct}%`,
              bgcolor: isDark ? 'rgba(165,180,252,0.3)' : '#A5B4FC',
              borderRadius: 5,
            }}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#6366F1' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
            Spent: {currencyFormatter.format(spend)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isDark ? 'rgba(165,180,252,0.3)' : '#A5B4FC' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
            Remaining: {currencyFormatter.format(Math.max(0, remaining))}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export const FinancialReviewTaskModal: React.FC<FinancialReviewTaskModalProps> = ({
  open, onClose, gateReviewId, onSuccess, onError,
  approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ── Data State ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // ── Form State ─────────────────────────────────────────────────────
  const [decision, setDecision] = useState('')
  const [financeNotes, setFinanceNotes] = useState('')

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
    } catch (err) {
      console.error('Failed to load Financial task data', err)
      onError('Failed to load project details for financial review.')
    } finally { setLoading(false) }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) {
      loadData()
      setSubmitted(false)
      setDecision('')
      setFinanceNotes('')
    }
  }, [open, loadData])

  // ── Build Notes ────────────────────────────────────────────────────
  const buildDecisionEntry = useCallback(() => {
    const decisionLabel = decision === 'endorse' ? 'Endorsed' : 'Rejected'
    return `\n\n--- Financial Review Task ---\nDecision: ${decisionLabel}\nDate: ${new Date().toLocaleDateString()}\nNotes:\n${financeNotes || 'No additional notes provided.'}`
  }, [decision, financeNotes])

  // ── Handle Submit ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!decision) return
    if (!gateReview?.pm_projectgatereviewid) return

    setSaving(true)
    try {
      const decisionLabel = decision === 'endorse' ? 'Endorsed' : 'Rejected'
      const existingNotes = gateReview.pm_reviewnotes || ''
      const newEntry = buildDecisionEntry()

      await updateGateReview(gateReview.pm_projectgatereviewid, {
        pm_reviewnotes: existingNotes + newEntry,
      } as any)

      // If this is a workflow step, also submit the workflow decision
      if (approvalStepId) {
        const workflowDecision = decision === 'endorse' ? 0 : 3
        const notes = buildDecisionEntry()
        const workflowSuccess = await submitWorkflowDecision(approvalStepId, workflowDecision, notes)
        if (!workflowSuccess) {
          onError('Decision saved to gate review but workflow submission failed.')
          setSaving(false)
          return
        }

        onSuccess(`Financial Task completed. Decision: ${decisionLabel}.`)
        onClose()
      } else {
        // Standalone mode: show success screen
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Failed to save Financial decision.', err)
      onError('Failed to save Financial decision.')
    } finally { setSaving(false) }
  }, [decision, gateReview, buildDecisionEntry, approvalStepId, onSuccess, onError, onClose])

  if (!open) return null

  const budget = project?.pm_approvedbudgeteur ?? 0
  const spend = (project as any)?.pm_actualcosteur ?? 0
  const remaining = budget - spend
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 2, overflow: 'hidden', maxHeight: '90vh', minHeight: 500 } },
      }}
    >
      {submitted ? (
        <>
          {/* Submitted state header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: decision === 'reject' ? '#EF4444' : '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <AccountBalanceIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Financial Review Task</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
          <SuccessScreen
            decision={decision}
            projectName={project?.pm_projectname}
            gateName={gateReview?.pm_gatename}
            onBack={() => { setSubmitted(false); setDecision(''); setFinanceNotes('') }}
          />
        </>
      ) : (
        <>
          {/* ── Header ────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'secondary.contrastText' }}>
                <AccountBalanceIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Financial Review Task</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {gateReview?.pm_gatename || project?.pm_projectcode ? `${project?.pm_projectcode} · ${gateReview?.pm_gatename || ''}` : 'Gate Review'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="Pending Financial Review" color="warning" size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
              <IconButton size="small" onClick={onClose} disabled={saving}><CloseIcon fontSize="small" /></IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 0, bgcolor: 'background.default', display: 'flex' }}>
            {loading ? (
              <Box sx={{ flex: 1, p: 6, textAlign: 'center' }}>
                <CircularProgress size={36} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">Loading financial review data...</Typography>
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
                    bgcolor: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {/* Brand row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <AttachMoneyIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? '#C4B5FD' : '#5B21B6', display: 'block', lineHeight: 1.2 }}>
                        Financial Review
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: isDark ? '#A78BFA' : '#7C3AED' }}>
                        Gate Clearance
                      </Typography>
                    </Box>
                  </Box>

                  {/* Steps navigation */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                    {[
                      { id: 'context', label: 'Project Context', done: true },
                      { id: 'finance', label: 'Financial Review', active: true },
                      { id: 'decision', label: 'Board Decision', done: false },
                    ].map((st) => (
                      <Box
                        key={st.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.25,
                          borderRadius: 1,
                          bgcolor: st.active ? (isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)') : 'transparent',
                          borderLeft: '2px solid',
                          borderLeftColor: st.active ? 'secondary.main' : 'transparent',
                        }}
                      >
                        <Box
                          sx={{
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                            bgcolor: st.done ? '#7C3AED' : st.active ? '#7C3AED' : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                            color: st.done || st.active ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280'),
                          }}
                        >
                          {st.done ? '✓' : ['1', '2', '3'][['context', 'finance', 'decision'].indexOf(st.id)]}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: st.active ? 700 : 500, fontSize: '0.82rem',
                            color: st.active ? (isDark ? '#C4B5FD' : '#5B21B6') : (isDark ? '#9CA3AF' : '#6B7280'),
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
                      Pending Financial Review
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                      {project?.pm_projectmanagername || project?.pm_projectname || ''}
                    </Typography>
                  </Box>
                </Box>

                {/* ─── Content Area ──────────────────────────────────── */}
                <Box sx={{ flex: 1, p: 2.5, overflow: 'auto', maxHeight: { md: 'calc(90vh - 140px)' } }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      💰 Financial Review
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                      Financial Assessment
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Financial Summary Cards */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                      {[
                        { label: 'Approved Budget', value: currencyFormatter.format(budget), icon: <AttachMoneyIcon />, color: 'primary.main', bg: (t: any) => t.palette.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#EEF2FF' },
                        { label: 'Actual Spend', value: currencyFormatter.format(spend), icon: <TrendingDownIcon />, color: spend > budget ? '#EF4444' : 'text.primary', bg: (t: any) => t.palette.mode === 'dark' ? 'rgba(239,68,68,0.08)' : '#FEF2F2' },
                        { label: 'Remaining', value: currencyFormatter.format(remaining), icon: <PercentIcon />, color: remaining < 0 ? '#EF4444' : '#10B981', bg: (t: any) => t.palette.mode === 'dark' ? 'rgba(16,185,129,0.08)' : '#ECFDF5' },
                      ].map((card) => (
                        <Paper
                          key={card.label}
                          variant="outlined"
                          sx={{ p: 1.5, borderRadius: 1.5, bgcolor: card.bg as any, borderLeft: '3px solid', borderLeftColor: typeof card.color === 'string' ? card.color : 'primary.main' }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            {React.cloneElement(card.icon, { sx: { fontSize: 16, color: typeof card.color === 'string' ? card.color : 'primary.main' } })}
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {card.label}
                            </Typography>
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: typeof card.color === 'string' ? card.color : 'text.primary', fontSize: '1.15rem' }}>
                            {card.value}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>

                    {/* Budget Utilisation Bar */}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                      <BudgetBar budget={budget} spend={spend} />
                    </Paper>

                    {/* Decision Picker */}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Financial Decision
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {DECISION_OPTIONS.map((opt) => {
                          const isSelected = decision === opt.value
                          return (
                            <Box
                              key={opt.value}
                              onClick={() => setDecision(opt.value)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                border: '1.5px solid',
                                borderColor: isSelected ? (isDark ? `${opt.color}80` : opt.color) : 'divider',
                                borderRadius: 1.5,
                                p: 1.5,
                                cursor: 'pointer',
                                bgcolor: isSelected ? (isDark ? `${opt.color}15` : `${opt.color}10`) : 'transparent',
                                transition: 'all 0.15s ease',
                                '&:hover': { borderColor: opt.color, bgcolor: (t: any) => t.palette.mode === 'dark' ? `${opt.color}10` : `${opt.color}08` },
                              }}
                            >
                              <input
                                type="radio"
                                name="finance-decision"
                                checked={isSelected}
                                onChange={() => setDecision(opt.value)}
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
                    </Paper>

                    {/* Assessment Notes */}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Financial Assessment Notes
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={financeNotes}
                        onChange={(e) => setFinanceNotes(e.target.value)}
                        slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                        placeholder="Enter financial clearance notes, concerns, or budget conditions..."
                      />
                    </Box>

                    {/* Info note */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: isDark ? 'rgba(245,158,11,0.08)' : '#FFFBEB',
                        borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                      }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: '#F59E0B', mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                        <strong>Note:</strong> Endorsing the financials does not approve the gate review. It provides clearance for the Governance Board to make the final decision.
                      </Typography>
                    </Paper>
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
              sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 13 }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              size="medium"
              disabled={!decision || saving}
              onClick={handleSubmit}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                px: 3,
                py: 1,
                bgcolor: decision === 'reject' ? '#EF4444' : '#6366F1',
                '&:hover': {
                  bgcolor: decision === 'reject' ? '#DC2626' : '#4F46E5',
                },
              }}
            >
              {saving ? 'Submitting...' : `Submit Financial Review →`}
            </Button>
          </Box>
        </>
      )}
    </Dialog>
  )
}

export default FinancialReviewTaskModal
