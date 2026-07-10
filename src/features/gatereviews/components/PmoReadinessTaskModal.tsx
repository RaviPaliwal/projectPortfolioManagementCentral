import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Chip, Paper, useTheme, TextField, alpha
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import UndoIcon from '@mui/icons-material/Undo'

import { fetchProjectDetails, fetchGateReviewById, GovernanceReadinessService, createGateReview, updateGateReview, unwrapList } from '@/services'
import { Pm_projectgatereviewsService } from '@/generated'
import type { Pm_projectgatereviews } from '@/generated/models/Pm_projectgatereviewsModel'
import type { ProjectModel, GateReviewModel } from '@/types/dataverse'
import type { ProjectReadinessReport } from '@/services/governance-readiness.service'
import { StatusTag, Button } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
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

interface PmoReadinessTaskModalProps {
  open: boolean
  onClose: () => void
  gateReviewId?: string
  projectId?: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const PmoReadinessTaskModal: React.FC<PmoReadinessTaskModalProps> = ({
  open, onClose, gateReviewId, projectId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gateReview, setGateReview] = useState<GateReviewModel | null>(null)
  const [project, setProject] = useState<ProjectModel | null>(null)
  const [readiness, setReadiness] = useState<ProjectReadinessReport | null>(null)
  const [gateStage, setGateStage] = useState<number>(0)
  
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [overrideInput, setOverrideInput] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (gateReviewId) {
        const gr = await fetchGateReviewById(gateReviewId)
        if (!gr) { onError('Gate review not found.'); setLoading(false); return }
        setGateReview(gr)

        const projId = gr._pm_project_value ||
                          (gr as any)._pm_projectlookup_value ||
                          (gr as any).pm_project ||
                          gr.pm_projectcode

        if (projId) {
          const [proj, report] = await Promise.all([
            fetchProjectDetails(projId),
            GovernanceReadinessService.checkProjectReadiness(projId, Number(gr.pm_gatestage ?? 0)),
          ])
          setProject(proj)
          setReadiness(report)
          setGateStage(Number(gr.pm_gatestage ?? 0))
        }
      } else if (projectId) {
        const proj = await fetchProjectDetails(projectId)
        if (!proj) { onError('Project not found.'); setLoading(false); return }
        setProject(proj)

        const { stage: currentGateStage } = mapPhaseToGate(proj.pm_projectphase)
        setGateStage(currentGateStage)

        const report = await GovernanceReadinessService.checkProjectReadiness(projectId, currentGateStage)
        setReadiness(report)
      }
    } catch (err) {
      console.error('Failed to load project details for readiness check', err)
      onError('Failed to load project details.')
    } finally { setLoading(false) }
  }, [gateReviewId, projectId, onError])

  useEffect(() => {
    if (open) { loadData(); setOverrides({}); setExpanded(null); setOverrideInput(''); }
  }, [open, loadData])

  const handleApplyOverride = (id: string) => {
    if (overrideInput.trim()) {
      setOverrides(prev => ({ ...prev, [id]: overrideInput.trim() }))
      setOverrideInput('')
      setExpanded(null)
    }
  }

  const handleRemoveOverride = (id: string) => {
    setOverrides(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const checkPassed = (item: any) => item.status === 'passed' || item.status === 'warning' || !!overrides[item.id]
  const allClear = readiness?.items.every(i => checkPassed(i)) ?? false
  const items = readiness?.items || []

  // Wrap save task data logic for DecisionBox if available
  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    // If not all checks are clear, do not allow approval (0 = Approve)
    if (!allClear && (workflowDecision === 0)) {
      onError('All failed readiness checks must be resolved or overridden before approving.')
      return false
    }

    setSaving(true)
    try {
      const decisionLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      
      let notes = `--- PMO Readiness Checklist ---\n`
      if (Object.keys(overrides).length > 0) {
        notes += `\n--- Overrides Applied ---\n`
        Object.entries(overrides).forEach(([id, rationale]) => {
          const checkLabel = readiness?.items.find(i => i.id === id)?.label || id
          notes += `- ${checkLabel}: ${rationale}\n`
        })
      }

      if (gateReviewId) {
        const { stage, number } = mapPhaseToGate(project?.pm_projectphase)
        await updateGateReview(gateReviewId, {
          pm_reviewoutcome: workflowDecision === 0 ? 0 : 4,
          pm_reviewstatus: 0,
          pm_reviewnotes: notes,
          pm_actualreviewdate: new Date().toISOString(),
          pm_gatestage: stage as any,
          pm_gatename: `PMO Readiness - Gate ${number}`,
        })
        onSuccess(`PMO Readiness Review completed. Decision: ${decisionLabel}.`)
      } else if (projectId) {
        const { stage, number } = mapPhaseToGate(project?.pm_projectphase)
        const newReviewPayload: Partial<GateReviewModel> = {
          pm_gatename: `PMO Readiness - Gate ${number}`,
          pm_gatestage: stage as any,
          pm_reviewoutcome: workflowDecision === 0 ? 0 : 4,
          pm_reviewstatus: 0,
          pm_actualreviewdate: new Date().toISOString(),
          pm_plannedreviewdate: new Date().toISOString(),
          pm_reviewnotes: notes,
          _pm_project_value: projectId,
        }
        const createdReview = await createGateReview(newReviewPayload)
        if (!createdReview) throw new Error('Failed to create gate review')
        onSuccess(`PMO Readiness Review completed. Decision: ${decisionLabel}. Gate review entry created.`)
      }
      return true
    } catch (err) {
      onError('Failed to save review decision.')
      return false
    } finally { setSaving(false) }
  }, [allClear, overrides, readiness, gateReviewId, projectId, project, onSuccess, onError])

  if (!open) return null

  const phaseLabels: Record<number, string> = { 0: 'Execution', 1: 'Planning', 2: 'Closure', 3: 'Initiation', 4: 'Rejected', 5: 'Completed' }
  const phaseLabel = project?.pm_projectphase != null
    ? phaseLabels[Number(project.pm_projectphase)] ?? `Phase ${project.pm_projectphase}`
    : '—'

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssignmentTurnedInIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>PMO Readiness Task</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
            {/* Project Context card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Project Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Project Manager</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{project?.pm_projectmanagername || '—'}</Typography>
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
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Approved Budget</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {project?.pm_approvedbudget != null ? currencyFormatter.format(project.pm_approvedbudget) : '—'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Gate Review</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {gateReview?.pm_gatename || `PMO Readiness - Gate ${gateStage + 1} (New)`}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Readiness Checklist */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Readiness Checks
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                All automated checks must pass or be manually overridden before you can approve this gate transition.
              </Typography>

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
                      }}
                    >
                      {/* Header */}
                      <Box
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          p: 1.5, cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) }
                        }}
                        onClick={() => setExpanded(isExpanded ? null : item.id)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {isOverridden ? (
                            <AssignmentTurnedInIcon sx={{ fontSize: 20, color: theme.palette.secondary.main }} />
                          ) : item.status === 'passed' ? (
                            <CheckCircleIcon sx={{ fontSize: 20, color: theme.palette.success.main }} />
                          ) : item.status === 'failed' ? (
                            <ErrorIcon sx={{ fontSize: 20, color: theme.palette.error.main }} />
                          ) : (
                            <WarningAmberIcon sx={{ fontSize: 20, color: theme.palette.warning.main }} />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                          {isOverridden && (
                            <Chip label="Overridden" size="small" sx={{ height: 20, fontSize: fontSizes.xs, fontWeight: 700 }} />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {item.status === 'failed' && !isOverridden && (
                            <Button size="small" variant="text" sx={{ fontSize: fontSizes.xs, minWidth: 0 }} onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : item.id) }}>
                              Override
                            </Button>
                          )}
                          {isOverridden && (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemoveOverride(item.id) }} sx={{ color: 'text.secondary' }}>
                              <UndoIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                          <Box component="span" sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'text.disabled', fontSize: fontSizes.sm, flexShrink: 0 }}>
                            ▼
                          </Box>
                        </Box>
                      </Box>

                      {/* Expanded body */}
                      {isExpanded && (
                        <Box sx={{ px: 1.5, pb: 1.5, pl: 5 }}>
                          {item.message && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.6 }}>{item.message}</Typography>
                          )}

                          {isOverridden && (
                            <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.08), borderRadius: 1, p: 1 }}>
                              <Typography variant="caption" sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>
                                Rationale: {overrides[item.id]}
                              </Typography>
                            </Box>
                          )}

                          {item.status === 'failed' && !isOverridden && (
                            <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.04), border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.15), borderRadius: 1, p: 1.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.dark, display: 'block', mb: 0.5 }}>
                                Override this check
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
                              <Button size="small" variant="contained" disabled={!overrideInput.trim()} onClick={() => handleApplyOverride(item.id)} sx={{ fontWeight: 600, fontSize: fontSizes.xs }}>
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
            </Paper>

          </Box>
        )}
      </DialogContent>

      {/* Decision Box at bottom */}
      {!loading && DecisionBoxProp && approvalStepId && (
        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <DecisionBoxProp 
            approvalStepId={approvalStepId} 
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              onSuccess(`PMO Readiness Review completed.`)
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

export default PmoReadinessTaskModal
