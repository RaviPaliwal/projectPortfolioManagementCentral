import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, Box, Typography,
  CircularProgress, TextField, Paper, Divider, Chip,
  IconButton, useTheme, alpha
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import FlagIcon from '@mui/icons-material/Flag'
import UndoIcon from '@mui/icons-material/Undo'

import { Button } from '@/components/common'
import { fontSizes } from '@/styles/fontSizes'
import { GovernanceReadinessService, fetchProjectDetails, updateGateReview, fetchGateReviewById } from '@/services'
import { submitWorkflowDecision } from '@/services/workflow.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ProjectReadinessReport } from '@/services/governance-readiness.service'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'

// ── Constants ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 'context',   label: 'Project Context',    icon: '📋' },
  { id: 'readiness', label: 'Readiness Checks',   icon: '✅' },
  { id: 'decision',  label: 'PMO Decision',       icon: '⚖️' },
]

// ── Props ──────────────────────────────────────────────────────────────

interface PmoReadinessTaskModalProps {
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
    approve:     { color: theme.palette.success.main, label: 'Gate Approved',          emoji: '🎉' },
    conditional: { color: theme.palette.secondary.main, label: 'Approved with Conditions', emoji: '📋' },
    defer:       { color: theme.palette.warning.main, label: 'Decision Deferred',       emoji: '⏸️' },
    reject:      { color: theme.palette.error.main, label: 'Gate Rejected',           emoji: '🚫' },
  }
  const d = map[decision] || map.approve

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
//  STEP 1: PROJECT CONTEXT
// ══════════════════════════════════════════════════════════════════════

interface StepContextProps {
  project: ProjectModel | null
  gateReview: GateReviewModel | null
}

const StepContext: React.FC<StepContextProps> = ({ project, gateReview }) => {
  const fields = [
    ['Project Name',    project?.pm_projectname || '—'],
    ['Project ID',      project?.pm_projectcode || '—'],
    ['Gate',            gateReview?.pm_gatename || '—'],
    ['Project Manager', project?.pm_projectmanagername || 'Unassigned'],
    ['Sponsor',         project?.pm_projectsponsor || '—'],
    ['Portfolio',       project?.pm_portfolioname || '—'],
    ['Budget',          project?.pm_approvedbudgeteur != null ? `€${(project.pm_approvedbudgeteur / 1000000).toFixed(1)}M` : '—'],
    ['Progress',        `${project?.pm_percentcomplete || 0}%`],
  ]

  const tags = [
    project?.pm_projectcode,
    gateReview?.pm_gatename,
    project?.pm_portfolioname,
    project?.pm_businessunit,
  ].filter(Boolean)

  const progress = project?.pm_percentcomplete ?? 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        Review the project context before proceeding with the readiness assessment.
      </Typography>

      {/* Progress bar */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Overall Progress
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {progress}%
          </Typography>
        </Box>
        <Box sx={{ height: 6, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15), borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${progress}%`, bgcolor: 'primary.main', borderRadius: 3, transition: 'width 0.6s ease' }} />
        </Box>
        <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
          {progress >= 80 ? 'Project is on track.' : progress >= 50 ? 'Project is progressing.' : 'Project is in early stages.'}
        </Typography>
      </Paper>

      {/* Metadata grid */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {fields.map(([label, val]) => (
            <Box key={label} sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:nth-of-type(odd)': { borderRight: '1px solid', borderColor: 'divider' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: fontSizes.xs, mb: 0.25 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {val}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Tags */}
      {tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tags.map((t) => t && (
            <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          ))}
        </Box>
      )}
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  STEP 2: READINESS CHECKS
// ══════════════════════════════════════════════════════════════════════

interface StepReadinessProps {
  readiness: ProjectReadinessReport | null
  overrides: Record<string, string>
  onSetOverride: (id: string, rationale: string) => void
  onRemoveOverride: (id: string) => void
}

const StepReadiness: React.FC<StepReadinessProps> = ({ readiness, overrides, onSetOverride, onRemoveOverride }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [expanded, setExpanded] = useState<string | null>(null)
  const [overrideInput, setOverrideInput] = useState('')

  const items = readiness?.items || []
  const passed = items.filter(i => i.status === 'passed').length
  const waived = Object.keys(overrides).length
  const pending = items.filter(i => i.status === 'failed' && !overrides[i.id]).length

  const handleApplyOverride = (id: string) => {
    if (overrideInput.trim()) {
      onSetOverride(id, overrideInput.trim())
      setOverrideInput('')
      setExpanded(null)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        All automated checks must pass or be manually overridden with a rationale before gate approval.
      </Typography>

      {/* Summary bar */}
      <Paper variant="outlined" sx={{ display: 'flex', overflow: 'hidden' }}>
        {[
          { count: passed, label: 'Passed', color: theme.palette.success.main },
          { count: waived, label: 'Overridden', color: theme.palette.secondary.main },
          { count: pending, label: 'Pending', color: pending > 0 ? theme.palette.error.main : theme.palette.success.main },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color, fontFamily: '"JetBrains Mono", monospace' }}>
                {stat.count}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 0.25 }}>
                {stat.label}
              </Typography>
            </Box>
            {i < 2 && <Divider orientation="vertical" flexItem />}
          </React.Fragment>
        ))}
      </Paper>

      {/* Check items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((item) => {
          const isOverridden = !!overrides[item.id]
          const effectivePass = item.status === 'passed' || item.status === 'warning' || isOverridden
          const isExpanded = expanded === item.id
          const borderColor = isOverridden
            ? theme.palette.secondary.main
            : effectivePass
              ? theme.palette.success.main
              : theme.palette.warning.main

          return (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                borderLeft: '3px solid',
                borderLeftColor: borderColor,
                overflow: 'hidden',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: effectivePass ? theme.palette.success.main : theme.palette.warning.main },
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  cursor: 'pointer',
                }}
                onClick={() => setExpanded(isExpanded ? null : item.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box>
                    {isOverridden ? (
                      <AssignmentTurnedInIcon sx={{ fontSize: 20, color: theme.palette.secondary.main }} />
                    ) : item.status === 'passed' ? (
                      <CheckCircleIcon sx={{ fontSize: 20, color: theme.palette.success.main }} />
                    ) : item.status === 'failed' ? (
                      <ErrorIcon sx={{ fontSize: 20, color: theme.palette.error.main }} />
                    ) : (
                      <WarningAmberIcon sx={{ fontSize: 20, color: theme.palette.warning.main }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  {isOverridden && (
                    <Chip label="Overridden" size="small" sx={{ height: 20, fontSize: fontSizes.xs, fontWeight: 700, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.2) : alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {item.status === 'failed' && !isOverridden && (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ fontSize: fontSizes.xs, fontWeight: 600, minWidth: 0 }}
                      onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : item.id) }}
                    >
                      Override
                    </Button>
                  )}
                  {isOverridden && (
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onRemoveOverride(item.id) }}
                      sx={{ color: 'text.secondary' }}
                    >
                      <UndoIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  <Box
                    component="span"
                    sx={{
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      color: 'text.disabled',
                      fontSize: fontSizes.sm,
                      flexShrink: 0,
                    }}
                  >
                    ▼
                  </Box>
                </Box>
              </Box>

              {/* Expanded body */}
              {isExpanded && (
                <Box sx={{ px: 1.5, pb: 1.5, pl: 5 }}>
                  {item.message && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.6 }}>
                      {item.message}
                    </Typography>
                  )}

                  {isOverridden && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.1) : alpha(theme.palette.secondary.main, 0.08), borderRadius: 1, p: 1 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>
                        Rationale: {overrides[item.id]}
                      </Typography>
                    </Box>
                  )}

                  {item.status === 'failed' && !isOverridden && (
                    <Box sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.warning.main, 0.04), border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.2) : alpha(theme.palette.warning.main, 0.15), borderRadius: 1, p: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.dark, display: 'block', mb: 0.5 }}>
                        Override this check
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: fontSizes.sm }}>
                        Only allowed if the Portfolio Director has approved the deviation in writing.
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Enter director's approval reference and rationale..."
                        value={overrideInput}
                        onChange={(e) => setOverrideInput(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!overrideInput.trim()}
                        onClick={() => handleApplyOverride(item.id)}
                        sx={{ fontWeight: 600, fontSize: fontSizes.xs }}
                      >
                        Apply Override
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          )
        })}
      </Box>

      {items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <FactCheckIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">No readiness checks available.</Typography>
        </Box>
      )}
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  STEP 3: PMO DECISION
// ══════════════════════════════════════════════════════════════════════

interface StepDecisionProps {
  readiness: ProjectReadinessReport | null
  overrides: Record<string, string>
  gateReview: GateReviewModel | null
  project: ProjectModel | null
  pmoNotes: string
  onPmoNotesChange: (val: string) => void
  decision: string
  onDecisionChange: (val: string) => void
  decisionNotes: string
  onDecisionNotesChange: (val: string) => void
  onSubmit: () => void
  saving: boolean
}

const StepDecision: React.FC<StepDecisionProps> = ({
  readiness, overrides, gateReview, project,
  pmoNotes, onPmoNotesChange,
  decision, onDecisionChange,
  decisionNotes, onDecisionNotesChange,
  onSubmit, saving,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const items = readiness?.items || []
  const pendingIssues = items.filter(i => i.status === 'failed' && !overrides[i.id]).length
  const canApprove = pendingIssues === 0

  const conditions = [
    'Schedule detail must be updated within 5 business days of gate approval.',
    'Stakeholder sign-off to be obtained before any next-phase expenditure.',
  ]
  if (project?.pm_projectsponsor && !project.pm_projectsponsor) {
    conditions.push('Executive sponsor confirmation required before proceeding.')
  }

  const decisionOptions = [
    { key: 'approve',     label: 'Approve Gate',     color: theme.palette.success.main, bg: isDark ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.success.light, 0.08), border: isDark ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.success.light, 0.4), desc: 'Project proceeds to the next stage.' },
    { key: 'conditional', label: 'Approve with Conditions', color: theme.palette.secondary.main, bg: isDark ? alpha(theme.palette.secondary.main, 0.1) : alpha(theme.palette.secondary.light, 0.08), border: isDark ? alpha(theme.palette.secondary.main, 0.3) : alpha(theme.palette.secondary.light, 0.4), desc: 'Approve but attach mandatory conditions.' },
    { key: 'defer',       label: 'Defer Decision',   color: theme.palette.warning.main, bg: isDark ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.warning.light, 0.08), border: isDark ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.warning.light, 0.4), desc: 'Pause for additional information.' },
    { key: 'reject',      label: 'Reject Gate',      color: theme.palette.error.main, bg: isDark ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.error.light, 0.08), border: isDark ? alpha(theme.palette.error.main, 0.3) : alpha(theme.palette.error.light, 0.4), desc: 'Project does not proceed; returns to planning.' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        Make your final PMO decision. All notes and decisions are permanently recorded.
      </Typography>

      {/* Readiness snapshot */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Readiness Snapshot
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((item) => {
            const isOverridden = !!overrides[item.id]
            const pass = item.status === 'passed' || item.status === 'warning' || isOverridden
            return (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {pass ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                )}
                <Typography variant="body2" sx={{ color: pass ? 'text.primary' : theme.palette.warning.dark }}>
                  {item.label}
                </Typography>
                {isOverridden && (
                  <Chip label="Overridden" size="small" sx={{ fontSize: fontSizes.xs, fontWeight: 700, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.2) : alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main }} />
                )}
              </Box>
            )
          })}
        </Box>
      </Paper>

      {/* Blocking banner */}
      {!canApprove && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.error.light, 0.08), border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.error.light, 0.4), borderRadius: 1, p: 1.5 }}>
          <FlagIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
          <Typography variant="body2" sx={{ color: theme.palette.error.dark }}>
            {pendingIssues} unresolved issue{pendingIssues > 1 ? 's' : ''} — resolve in Readiness Checks tab or apply an override before approving.
          </Typography>
        </Box>
      )}

      {/* Auto-generated conditions */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1, fontSize: fontSizes.xs }}>
          Auto-generated Conditions
        </Typography>
        {conditions.map((c, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.08) : alpha(theme.palette.secondary.light, 0.08), border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.15) : alpha(theme.palette.secondary.light, 0.4), borderRadius: 1, p: 1.5, mb: 1 }}>
            <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: theme.palette.secondary.main, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSizes.xs, fontWeight: 700, flexShrink: 0, mt: 0.25 }}>
              {i + 1}
            </Box>
            <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? theme.palette.secondary.light : theme.palette.secondary.dark, lineHeight: 1.6 }}>
              {c}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* PMO Notes */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1, fontSize: fontSizes.xs }}>
          PMO Review Notes
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Notes visible to the governance board and project team..."
          value={pmoNotes}
          onChange={(e) => onPmoNotesChange(e.target.value)}
          disabled={saving}
        />
      </Box>

      {/* Decision picker */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1, fontSize: fontSizes.xs }}>
          Your Decision
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {decisionOptions.map((opt) => {
            const isSelected = decision === opt.key
            const isBlocked = opt.key === 'approve' && !canApprove
            return (
              <Box
                key={opt.key}
                onClick={() => !isBlocked && onDecisionChange(opt.key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  border: '1.5px solid',
                  borderColor: isSelected ? opt.border : 'divider',
                  p: 1.5,
                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                  bgcolor: isSelected ? opt.bg : 'transparent',
                  opacity: isBlocked ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  '&:hover': isBlocked ? {} : { borderColor: opt.border, bgcolor: opt.bg },
                }}
              >
                <input
                  type="radio"
                  name="pmo-decision"
                  checked={isSelected}
                  disabled={isBlocked}
                  onChange={() => onDecisionChange(opt.key)}
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
      </Box>

      {/* Decision Rationale */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1, fontSize: fontSizes.xs }}>
          Decision Rationale <Box component="span" sx={{ color: theme.palette.error.main }}>*</Box>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Provide your rationale for this decision. This is recorded permanently on the workflow..."
          value={decisionNotes}
          onChange={(e) => onDecisionNotesChange(e.target.value)}
          disabled={saving}
        />
      </Box>

      {/* Submit button */}
      <Button
        variant="contained"
        disabled={!decision || !decisionNotes.trim() || saving}
        onClick={onSubmit}
        sx={{
          alignSelf: 'flex-start',
          fontWeight: 700,
          px: 4,
          py: 1.25,
          bgcolor: decision === 'reject' ? theme.palette.error.main : decision === 'defer' ? theme.palette.warning.main : decision === 'conditional' ? theme.palette.secondary.main : theme.palette.success.main,
          '&:hover': {
            bgcolor: decision === 'reject' ? theme.palette.error.dark : decision === 'defer' ? theme.palette.warning.dark : decision === 'conditional' ? theme.palette.secondary.dark : theme.palette.success.dark,
          },
        }}
      >
        {saving ? 'Submitting...' : `Submit Decision →`}
      </Button>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export const PmoReadinessTaskModal: React.FC<PmoReadinessTaskModalProps> = ({
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
  const [readiness, setReadiness] = useState<ProjectReadinessReport | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // ── Form State ─────────────────────────────────────────────────────
  const [step, setStep] = useState(0)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [pmoNotes, setPmoNotes] = useState('')
  const [decision, setDecision] = useState('')
  const [decisionNotes, setDecisionNotes] = useState('')

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
        const [proj, report] = await Promise.all([
          fetchProjectDetails(projectId),
          GovernanceReadinessService.checkProjectReadiness(projectId, Number(gr.pm_gatestage ?? 0)),
        ])
        setProject(proj)
        setReadiness(report)
      }

      // PMO notes are loaded from the gate review record if available
      if (gr.pm_reviewnotes) setPmoNotes(gr.pm_reviewnotes)
    } catch (err) {
      console.error('Failed to load PMO task data', err)
      onError('Failed to load project details for readiness check.')
    } finally { setLoading(false) }
  }, [gateReviewId, onError])

  useEffect(() => {
    if (open) { loadData(); setStep(0); setOverrides({}); setPmoNotes(''); setSubmitted(false); setDecision(''); setDecisionNotes('') }
  }, [open, loadData])

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSetOverride = useCallback((id: string, rationale: string) => {
    setOverrides(prev => ({ ...prev, [id]: rationale }))
  }, [])

  const handleRemoveOverride = useCallback((id: string) => {
    setOverrides(prev => { const n = { ...prev }; delete n[id]; return n })
  }, [])

  const checkPassed = (item: any) => item.status === 'passed' || item.status === 'warning' || !!overrides[item.id]
  const allClear = readiness?.items.every(i => checkPassed(i)) ?? false

  const buildNotes = useCallback((decisionLabel: string) => {
    let notes = `--- PMO Readiness Task ---\nDecision: ${decisionLabel}\n\nNotes:\n${pmoNotes}\n`
    if (Object.keys(overrides).length > 0) {
      notes += `\n--- Overrides Applied ---\n`
      Object.entries(overrides).forEach(([id, rationale]) => {
        const checkLabel = readiness?.items.find(i => i.id === id)?.label || id
        notes += `- ${checkLabel}: ${rationale}\n`
      })
    }
    return notes
  }, [pmoNotes, overrides, readiness])

  const handleSubmit = useCallback(async () => {
    if (!decision || !decisionNotes.trim()) return

    const decisionLabel = decision === 'approve' ? 'Approved'
      : decision === 'conditional' ? 'Approved with Conditions'
      : decision === 'defer' ? 'Deferred'
      : 'Rejected'

    if (!allClear && (decision === 'approve' || decision === 'conditional')) {
      onError('All failed readiness checks must be resolved or overridden before approving.')
      return
    }

    setSaving(true)
    try {
      // Save to gate review record
      if (gateReview?.pm_projectgatereviewid) {
        await updateGateReview(gateReview.pm_projectgatereviewid, {
          pm_reviewnotes: buildNotes(decisionLabel),
          pm_reviewconditions: decision === 'conditional' ? decisionNotes : '',
          pm_actualreviewdate: new Date().toISOString().split('T')[0],
        } as any)
      }

      // If this is a workflow step, also submit the workflow decision
      if (approvalStepId) {
        // Map custom decisions to workflow values: approve/conditional → 0, reject → 3, defer → no workflow submit
        const workflowDecision = decision === 'reject' ? 3 : (decision === 'approve' || decision === 'conditional') ? 0 : -1

        if (workflowDecision >= 0) {
          const notes = buildNotes(decisionLabel)
          const workflowSuccess = await submitWorkflowDecision(approvalStepId, workflowDecision, notes)
          if (!workflowSuccess) {
            onError('Decision saved to gate review but workflow submission failed.')
            setSaving(false)
            return
          }
          dispatchFormDialogDecision({ formKey: 'pmo_readiness', decision: workflowDecision })
        } else {
          dispatchFormDialogDecision({ formKey: 'pmo_readiness', decision: 2 }) // Defer or other outcome
        }

        // In workflow mode, close immediately with success message (no success screen)
        onSuccess(`PMO Task completed. Decision: ${decisionLabel}.`)
        onClose()
      } else {
        // Standalone mode: show success screen
        setSubmitted(true)
      }
    } catch (err) {
      onError('Failed to submit decision.')
    } finally { setSaving(false) }
  }, [decision, decisionNotes, allClear, gateReview, buildNotes, approvalStepId, onError, onSuccess, onClose])

  if (!open) return null

  const warnCount = readiness?.items.filter(i => i.status === 'failed' && !overrides[i.id]).length ?? 0

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
              <Box sx={{ width: 36, height: 36, bgcolor: decision === 'reject' ? theme.palette.error.main : decision === 'defer' ? theme.palette.warning.main : decision === 'conditional' ? theme.palette.secondary.main : theme.palette.success.main, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: '50%' }}>
                <AssignmentTurnedInIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>PMO Readiness Task</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Box>
          <SuccessScreen
            decision={decision}
            projectName={project?.pm_projectname}
            gateName={gateReview?.pm_gatename}
            onBack={() => { setSubmitted(false); setStep(0); setDecision(''); setDecisionNotes('') }}
          />
        </>
      ) : (
        <>
          {/* ── Header ────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.contrastText', borderRadius: '50%' }}>
                <AssignmentTurnedInIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>PMO Readiness Task</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: fontSizes.sm }}>
                  {gateReview?.pm_gatename || project?.pm_projectcode ? `${project?.pm_projectcode} · ${gateReview?.pm_gatename || ''}` : 'Gate Review'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="Pending PMO Review" color="warning" size="small" sx={{ fontWeight: 700 }} />
              <IconButton size="small" onClick={onClose} disabled={saving}><CloseIcon fontSize="small" /></IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 0, bgcolor: 'background.default', display: 'flex' }}>
            {loading ? (
              <Box sx={{ flex: 1, p: 6, textAlign: 'center' }}>
                <CircularProgress size={36} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">Loading gate review data...</Typography>
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
                    bgcolor: isDark ? 'rgba(30,27,75,0.3)' : 'background.paper',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {/* Steps navigation */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {STEPS.map((st, i) => {
                      const done = i < step || (submitted && decision)
                      const active = i === step && !submitted
                      return (
                        <Box
                          key={st.id}
                          onClick={() => setStep(i)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.25,
                            borderRadius: 1,
                            cursor: 'pointer',
                            bgcolor: active ? (isDark ? alpha(theme.palette.secondary.main, 0.15) : alpha(theme.palette.secondary.main, 0.08)) : 'transparent',
                            borderLeft: '2px solid',
                            borderLeftColor: active ? 'primary.main' : 'transparent',
                            transition: 'all 0.15s ease',
                            '&:hover': { bgcolor: isDark ? alpha(theme.palette.secondary.main, 0.08) : alpha(theme.palette.secondary.main, 0.04) },
                          }}
                        >
                          {/* Step indicator */}
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: fontSizes.xs,
                              fontWeight: 700,
                              bgcolor: done ? theme.palette.secondary.main : active ? theme.palette.secondary.main : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                              color: done || active ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280'),
                            }}
                          >
                            {done ? '✓' : i + 1}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: active ? 700 : 500, fontSize: fontSizes.sm, color: active ? (isDark ? '#E0E7FF' : '#111827') : done ? (isDark ? '#A5B4FC' : theme.palette.secondary.main) : 'text.secondary' }}>
                              {st.label}
                            </Typography>
                          </Box>
                          {st.id === 'readiness' && warnCount > 0 && (
                            <Box sx={{ bgcolor: theme.palette.warning.main, color: '#fff', borderRadius: 1, fontSize: fontSizes.xs, fontWeight: 700, px: 0.75, py: 0.25, lineHeight: 1.2 }}>
                              {warnCount}
                            </Box>
                          )}
                        </Box>
                      )
                    })}
                  </Box>

                  {/* Project mini card at bottom */}
                  <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      Pending PMO Review
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: fontSizes.xs }}>
                      {project?.pm_projectmanagername || project?.pm_projectname || ''}
                    </Typography>
                  </Box>
                </Box>

                {/* ─── Content Area ──────────────────────────────────── */}
                <Box sx={{ flex: 1, p: 2.5, overflow: 'auto', maxHeight: { md: 'calc(90vh - 140px)' } }}>
                  {/* Step indicator */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: fontSizes.xs }}>
                      Step {step + 1} of {STEPS.length}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                      {STEPS[step].icon} {STEPS[step].label}
                    </Typography>
                  </Box>

                  {/* Step content */}
                  {step === 0 && <StepContext project={project} gateReview={gateReview} />}
                  {step === 1 && (
                    <StepReadiness
                      readiness={readiness}
                      overrides={overrides}
                      onSetOverride={handleSetOverride}
                      onRemoveOverride={handleRemoveOverride}
                    />
                  )}
                  {step === 2 && (
                    <StepDecision
                      readiness={readiness}
                      overrides={overrides}
                      gateReview={gateReview}
                      project={project}
                      pmoNotes={pmoNotes}
                      onPmoNotesChange={setPmoNotes}
                      decision={decision}
                      onDecisionChange={setDecision}
                      decisionNotes={decisionNotes}
                      onDecisionNotesChange={setDecisionNotes}
                      onSubmit={handleSubmit}
                      saving={saving}
                    />
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>

          {/* ─── Bottom Navigation ────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Button
              variant="outlined"
              size="small"
              disabled={step === 0}
              onClick={() => setStep(p => p - 1)}
              sx={{ fontWeight: 600, fontSize: fontSizes.sm }}
            >
              ← Previous
            </Button>

            {/* Step dots */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {STEPS.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setStep(i)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: i === step ? 'primary.main' : i < step ? alpha(theme.palette.primary.main, 0.5) : (isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB'),
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </Box>

            {step < STEPS.length - 1 ? (
              <Button
                variant="contained"
                size="small"
                onClick={() => setStep(p => p + 1)}
                sx={{ fontWeight: 600, fontSize: fontSizes.sm }}
              >
                Next →
              </Button>
            ) : (
              /* DecisionBox integration in bottom bar OR submit button already in step content */
              <Box sx={{ width: 100 }} />
            )}
          </Box>


        </>
      )}
    </Dialog>
  )
}

export default PmoReadinessTaskModal
