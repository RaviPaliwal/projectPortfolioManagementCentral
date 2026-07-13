import React, { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Alert, Button, TextField
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AssessmentIcon from '@mui/icons-material/Assessment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderIcon from '@mui/icons-material/Folder'
import { fetchChangeRequestById, updateChangeRequest } from '@/services/change-request.service'
import { fetchProjectDetails, fetchProjectMilestones } from '@/services/project.service'
import { Pm_changerequestimpactsService } from '@/generated/services/Pm_changerequestimpactsService'
import { Pm_changerequestimpactspm_impactcategory } from '@/generated/models/Pm_changerequestimpactsModel'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ChangeRequestModel, ProjectModel, ProjectMilestoneModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { useUser } from '@/context/UserContext'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'

const T = {
  ink: "#141310",
  sub: "#716A5C",
  faint: "#A39C8C",
  line: "#E6E1D6",
  paper: "#FBFAF7",
  card: "#FFFFFF",
  brand: "#1C7A5E",
  brandDark: "#0F5B44",
  brandTint: "#E9F3EE",
  amber: "#AD7A1E",
  amberTint: "#FBF1DD",
  red: "#B7402C",
  redTint: "#FBEBE7",
}

const Tag: React.FC<{ color: string; tint: string; children: React.ReactNode }> = ({ color, tint, children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color,
      background: tint,
      padding: "3px 9px",
      borderRadius: 6,
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    }}
  >
    {children}
  </span>
)

interface ChangeRequestImpactAssessmentTaskModalProps {
  open: boolean
  onClose: () => void
  changeRequestId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

type SeverityRatingValue = 0 | 1 | 2 | 3 // 0: None/SeverityRating, 1: Medium, 2: High, 3: Low

interface ImpactAreaState {
  categoryValue: number
  categoryLabel: string
  severity: SeverityRatingValue
  description: string
}

const SEVERITIES = [
  { value: 0, label: 'None', color: 'inherit' as const },
  { value: 3, label: 'Low', color: 'success' as const },
  { value: 1, label: 'Medium', color: 'warning' as const },
  { value: 2, label: 'High', color: 'error' as const },
] as const

const SEVERITY_RANK: Record<SeverityRatingValue, number> = {
  0: 0, // None
  3: 1, // Low
  1: 2, // Medium
  2: 3, // High
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  '0': 'Scope', '1': 'Schedule', '2': 'Resource',
}

const CHANGE_TYPE_COLORS: Record<string, 'primary' | 'warning' | 'info'> = {
  '0': 'primary', '1': 'warning', '2': 'info',
}

const PRIORITY_LABELS: Record<string, string> = { '0': 'Medium', '1': 'High' }
const PRIORITY_COLORS: Record<string, 'warning' | 'error'> = { '0': 'warning', '1': 'error' }

// Helper to map DB category names to human readable titles
const getCategoryDisplayName = (label: string): string => {
  if (label === 'ImpactArea') return 'General Impact Area'
  return label
}

export const ChangeRequestImpactAssessmentTaskModal: React.FC<ChangeRequestImpactAssessmentTaskModalProps> = ({
  open, onClose, changeRequestId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const { currentUser } = useUser()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changeRequest, setChangeRequest] = useState<ChangeRequestModel | null>(null)
  const [linkedProject, setLinkedProject] = useState<ProjectModel | null>(null)
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestoneModel[]>([])
  const [localError, setLocalError] = useState<string | null>(null)

  // Derive initial/default areas list dynamically from the choice options in Dataverse model
  const defaultAreas = useMemo(() => {
    return Object.entries(Pm_changerequestimpactspm_impactcategory).map(([key, val]) => ({
      categoryValue: Number(key),
      categoryLabel: getCategoryDisplayName(val),
      severity: 0 as SeverityRatingValue,
      description: '',
    }))
  }, [])

  // Local state for the dynamic impact areas list
  const [areas, setAreas] = useState<ImpactAreaState[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<number, boolean>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setLocalError(null)
    try {
      const cr = await fetchChangeRequestById(changeRequestId)
      if (!cr) {
        onError('Change request not found.')
        onClose()
        return
      }
      setChangeRequest(cr)
      if (cr._pm_project_value) {
        try {
          const proj = await fetchProjectDetails(cr._pm_project_value)
          setLinkedProject(proj)
          const milestones = await fetchProjectMilestones(cr._pm_project_value)
          setProjectMilestones(milestones)
        } catch (e) {
          console.error('[ImpactAssessmentTaskModal] Project details fetch failed:', e)
        }
      }

      // Pre-populate any existing impact assessment entries if they exist in Dataverse
      try {
        const existingRes = await Pm_changerequestimpactsService.getAll({
          filter: `pm_changerequestid eq '${changeRequestId}'`
        })
        const initializedAreas = defaultAreas.map(area => {
          const match = (existingRes.success && existingRes.data)
            ? existingRes.data.find(item => Number(item.pm_impactcategory) === area.categoryValue)
            : null
          if (match) {
            const severityVal = match.pm_severityrating != null ? Number(match.pm_severityrating) as SeverityRatingValue : 0
            return {
              ...area,
              severity: severityVal,
              description: match.pm_impactdescription || '',
            }
          }
          return area
        })
        setAreas(initializedAreas)
      } catch (err) {
        console.error('[ImpactAssessmentTaskModal] Failed to pre-populate impacts:', err)
        setAreas(defaultAreas)
      }
    } catch (err) {
      console.error('[ImpactAssessmentTaskModal] Failed to load change request details:', err)
      onError('Failed to load change request details.')
    } finally {
      setLoading(false)
    }
  }, [changeRequestId, onError, onClose, defaultAreas])

  useEffect(() => {
    if (open) {
      loadData()
      setLocalError(null)
      setValidationErrors({})
    }
  }, [open, loadData])

  const { overallSeverityLabel, overallSeverityColor, overallSeverityTint } = useMemo(() => {
    if (areas.length === 0) {
      return { overallSeverityLabel: 'NONE', overallSeverityColor: T.sub, overallSeverityTint: T.line }
    }
    const maxRank = Math.max(...areas.map(a => SEVERITY_RANK[a.severity]))
    if (maxRank === 0) return { overallSeverityLabel: 'NONE', overallSeverityColor: T.sub, overallSeverityTint: T.line }
    if (maxRank === 1) return { overallSeverityLabel: 'LOW', overallSeverityColor: T.brand, overallSeverityTint: T.brandTint }
    if (maxRank === 2) return { overallSeverityLabel: 'MEDIUM', overallSeverityColor: T.amber, overallSeverityTint: T.amberTint }
    return { overallSeverityLabel: 'HIGH', overallSeverityColor: T.red, overallSeverityTint: T.redTint }
  }, [areas])

  const handleUpdateSeverity = (categoryValue: number, severity: SeverityRatingValue) => {
    setAreas(prev => prev.map(a => a.categoryValue === categoryValue ? { ...a, severity } : a))
    if (validationErrors[categoryValue]) {
      setValidationErrors(prev => ({ ...prev, [categoryValue]: false }))
    }
  }

  const handleUpdateDescription = (categoryValue: number, description: string) => {
    setAreas(prev => prev.map(a => a.categoryValue === categoryValue ? { ...a, description } : a))
    if (validationErrors[categoryValue] && description.trim()) {
      setValidationErrors(prev => ({ ...prev, [categoryValue]: false }))
    }
  }

  const validate = (): boolean => {
    const errors: Record<number, boolean> = {}
    let isValid = true
    areas.forEach(a => {
      if (a.severity !== 0 && !a.description.trim()) {
        errors[a.categoryValue] = true
        isValid = false
      }
    })
    setValidationErrors(errors)
    return isValid
  }

  const onBeforeDecision = useCallback(async (decision: number, notes: string): Promise<boolean> => {
    if (!validate()) {
      setLocalError('Please add an impact description for all rated areas.')
      return false
    }

    setSaving(true)
    setLocalError(null)
    try {
      const systemUserId = currentUser?.systemuserid || 'System'
      
      // Step 1: Clean up existing impact entries for this change request
      try {
        const existingRes = await Pm_changerequestimpactsService.getAll({
          filter: `pm_changerequestid eq '${changeRequestId}'`,
          select: ['pm_changerequestimpactid']
        })
        if (existingRes.success && existingRes.data && existingRes.data.length > 0) {
          await Promise.all(
            existingRes.data
              .filter(item => !!item.pm_changerequestimpactid)
              .map(item => Pm_changerequestimpactsService.delete(item.pm_changerequestimpactid!))
          )
        }
      } catch (cleanErr) {
        console.warn('[ImpactAssessmentTaskModal] Failed to clean up old impacts:', cleanErr)
      }

      // Step 2: Create new impact entries in Dataverse — ONLY for selected (rated) items
      const selectedAreas = areas.filter(area => area.severity !== 0)
      
      await Promise.all(
        selectedAreas.map(async (area) => {
          const payload = {
            pm_impactareaname: area.categoryLabel,
            pm_impactcategory: area.categoryValue as any,
            pm_severityrating: area.severity as any,
            pm_impactdescription: area.description || undefined,
            pm_changerequestid: changeRequestId,
            statecode: 0 as any,
            ...(currentUser?.systemuserid ? {
              'ownerid@odata.bind': `/systemusers(${currentUser.systemuserid})`
            } : {})
          } as any
          const res = await Pm_changerequestimpactsService.create(payload)
          if (!res.success) {
            throw new Error(`Failed to save ${area.categoryLabel} impact: ${res.error?.message || 'Unknown error'}`)
          }
        })
      )

      // Step 3: If Approved/Proceed (decision 0), set Change Request status to UnderReview (1)
      if (decision === 0 && changeRequest) {
        await updateChangeRequest(changeRequestId, {
          pm_status: 1, // Under Review
        })
      }

      return true
    } catch (err) {
      console.error('[ImpactAssessmentTaskModal] Failed to save impact assessment:', err)
      setLocalError(err instanceof Error ? err.message : 'Failed to save impact assessment. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }, [changeRequest, changeRequestId, areas, currentUser])

  const onDecisionComplete = useCallback((decision: number) => {
    if (decision === 0) {
      onSuccess('Impact assessment completed and Change Request submitted for review.')
    } else {
      onSuccess('Impact assessment rejected.')
    }
    dispatchFormDialogDecision({ formKey: 'change_request_impact_assessment', decision })
    onClose()
  }, [onSuccess, onClose])

  return (
    <Dialog 
      open={open} 
      onClose={() => !saving && onClose()} 
      maxWidth="md" 
      fullWidth
      slotProps={{
        paper: {
          style: {
            borderRadius: 14,
            border: `1px solid ${T.line}`,
            background: T.card,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: T.paper, color: T.ink, borderBottom: '1px solid', borderColor: T.line, py: 2.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssessmentIcon sx={{ color: T.brand }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Source Serif 4', serif", fontSize: '1.25rem' }}>Impact Assessment</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            size="small" 
            onClick={onClose} 
            disabled={saving} 
            sx={{ 
              width: 30,
              height: 30,
              borderRadius: '8px',
              border: `1px solid ${T.line}`,
              background: "transparent",
              color: T.sub,
              transition: 'all 0.15s ease',
              '&:hover': {
                borderColor: T.ink,
                background: '#f0eee6',
              }
            }}
          >
            <CloseIcon fontSize="small" style={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: T.paper, fontFamily: "'Inter', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600&display=swap');
        `}</style>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress sx={{ color: T.brand }} /></Box>
        ) : changeRequest ? (
          <Grid container>
            {/* Left Column: Context Card */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: T.line, bgcolor: T.paper, p: 3, pb: 6 }}>
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, color: T.faint, fontFamily: "'IBM Plex Mono', monospace" }}>Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5, color: T.ink, fontFamily: "'Source Serif 4', serif" }}>{changeRequest.pm_changerequesttitle}</Typography>
              <Typography variant="body2" sx={{ mb: 2, color: T.sub, fontFamily: "'Inter', sans-serif" }}>{changeRequest.pm_changerequestreference}</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 3 }}>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: T.sub, fontWeight: 600 }}>Type</Typography>
                  <Tag color={changeRequest.pm_changetype === 0 ? T.brand : changeRequest.pm_changetype === 1 ? T.amber : T.sub} tint={changeRequest.pm_changetype === 0 ? T.brandTint : changeRequest.pm_changetype === 1 ? T.amberTint : T.line}>
                    {CHANGE_TYPE_LABELS[String(changeRequest.pm_changetype ?? '')] || 'General'}
                  </Tag>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: T.sub, fontWeight: 600 }}>Priority</Typography>
                  <Tag color={changeRequest.pm_prioritylevel === 1 ? T.red : T.amber} tint={changeRequest.pm_prioritylevel === 1 ? T.redTint : T.amberTint}>
                    {PRIORITY_LABELS[String(changeRequest.pm_prioritylevel ?? '')] || 'Medium'}
                  </Tag>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: T.sub, fontWeight: 600 }}>Impact</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem', fontWeight: 700, color: T.ink }}>
                      <AttachMoneyIcon sx={{ fontSize: 15, color: T.brand }} />
                      <span>{changeRequest.pm_costimpacteur ? changeRequest.pm_costimpacteur.toLocaleString() : 0} EUR</span>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem', fontWeight: 700, color: T.ink }}>
                      <ScheduleIcon sx={{ fontSize: 15, color: T.amber }} />
                      <span>{changeRequest.pm_scheduleimpactdays ?? 0}d</span>
                    </Box>
                  </Box>
                </Box>
                {linkedProject && (
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: T.sub, fontWeight: 600 }}>Linked Project</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.8rem', fontWeight: 700, color: T.ink, border: '1px solid', borderColor: T.line, px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: T.card }}>
                      <FolderIcon sx={{ fontSize: 15, color: T.sub }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {linkedProject.pm_projectname || 'Unnamed Project'}
                      </span>
                    </Box>
                  </Box>
                )}
                {/* Project Milestones */}
                {projectMilestones.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: T.sub, fontWeight: 600 }}>Project Milestones</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {projectMilestones.map(m => (
                        <Box key={m.pm_projectmilestoneid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: T.card, border: '1px solid', borderColor: T.line, px: 1.25, py: 0.75, borderRadius: 1.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%', fontFamily: "'Inter', sans-serif" }}>
                            {m.pm_milestonename}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: T.sub, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {m.pm_planneddate ? new Date(m.pm_planneddate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: T.sub, fontWeight: 600 }}>Overall Rating</Typography>
                  <Tag color={overallSeverityColor} tint={overallSeverityTint}>
                    Overall: {overallSeverityLabel}
                  </Tag>
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Assessment Forms */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3, pb: 6, bgcolor: T.card }}>
              {localError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{localError}</Alert>}
              
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: T.ink, fontFamily: "'Inter', sans-serif" }}>Impact Area Severity Ratings</Typography>

              {areas.map(area => (
                <Box key={area.categoryValue} sx={{ border: '1px solid', borderColor: T.line, borderRadius: 2.5, p: 2, mb: 2, bgcolor: T.card }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: area.severity !== 0 ? 1.5 : 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: T.ink }}>{area.categoryLabel} impact</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {SEVERITIES.map(s => {
                        const isSelected = area.severity === s.value
                        return (
                          <Button
                            key={s.value}
                            variant={isSelected ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => handleUpdateSeverity(area.categoryValue, s.value)}
                            sx={{
                              borderRadius: 4,
                              px: 2,
                              py: 0.5,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              boxShadow: 'none',
                              fontFamily: "'Inter', sans-serif",
                              color: isSelected ? '#fff' : (
                                s.value === 3 ? T.brand :
                                s.value === 1 ? T.amber :
                                s.value === 2 ? T.red :
                                T.sub
                              ),
                              bgcolor: isSelected ? (
                                s.value === 3 ? T.brand :
                                s.value === 1 ? T.amber :
                                s.value === 2 ? T.red :
                                T.sub
                              ) : 'transparent',
                              borderColor: isSelected ? 'transparent' : (
                                s.value === 3 ? `${T.brand}44` :
                                s.value === 1 ? `${T.amber}44` :
                                s.value === 2 ? `${T.red}44` :
                                T.line
                              ),
                              border: '1px solid',
                              '&:hover': {
                                boxShadow: 'none',
                                bgcolor: isSelected ? (
                                  s.value === 3 ? T.brandDark :
                                  s.value === 1 ? '#916212' :
                                  s.value === 2 ? '#9c301e' :
                                  T.sub
                                ) : (
                                  s.value === 3 ? T.brandTint :
                                  s.value === 1 ? T.amberTint :
                                  s.value === 2 ? T.redTint :
                                  T.paper
                                ),
                                borderColor: isSelected ? 'transparent' : (
                                  s.value === 3 ? T.brand :
                                  s.value === 1 ? T.amber :
                                  s.value === 2 ? T.red :
                                  T.faint
                                ),
                              },
                            }}
                          >
                            {s.label}
                          </Button>
                        )
                      })}
                    </Box>
                  </Box>

                  {area.severity !== 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        placeholder={`Describe how this change affects ${area.categoryLabel.toLowerCase()}...`}
                        value={area.description}
                        onChange={e => handleUpdateDescription(area.categoryValue, e.target.value)}
                        error={validationErrors[area.categoryValue]}
                        helperText={validationErrors[area.categoryValue] ? 'Description is required for a rated impact.' : ''}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: T.paper,
                            '& fieldset': { borderColor: T.line },
                            '&:hover fieldset': { borderColor: T.faint },
                            '&.Mui-focused fieldset': { borderColor: T.brand, borderWidth: '1px' },
                          }
                        }}
                        slotProps={{
                          input: { sx: { fontSize: '0.85rem', color: T.ink } }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}

              <Divider sx={{ mt: 4, mb: 3, borderColor: T.line }} />
              
              {DecisionBoxProp && approvalStepId && (
                <DecisionBoxProp
                  approvalStepId={approvalStepId}
                  onBeforeDecision={onBeforeDecision}
                  onDecisionComplete={onDecisionComplete}
                  onDecisionError={setLocalError}
                  disabled={saving}
                />
              )}
            </Grid>
          </Grid>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ─── Wrapper for Task Resolver ────────────────────────────────────────────

interface ChangeRequestImpactAssessmentStepTaskModalProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const ChangeRequestImpactAssessmentStepTaskModal: React.FC<ChangeRequestImpactAssessmentStepTaskModalProps> = ({
  approvalStepId, onClose, onSuccess, onError, DecisionBox,
}) => {
  const [entityId, setEntityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resolve = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const id = await resolveEntityIdFromApprovalStep(approvalStepId)
      if (!id) {
        const msg = 'Unable to resolve the entity for this approval step.'
        setError(msg)
        onError?.(msg)
      } else {
        setEntityId(id)
      }
    } catch (err) {
      const msg = 'Failed to resolve approval step: ' + (err instanceof Error ? err.message : 'unknown error')
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [approvalStepId, onError])

  useEffect(() => { resolve() }, [resolve])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}><CircularProgress /></Box>
  }

  if (error || !entityId) {
    return <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error">{error || 'Unable to resolve entity ID.'}</Typography></Box>
  }

  return (
    <ChangeRequestImpactAssessmentTaskModal
      open={true}
      onClose={onClose}
      changeRequestId={entityId}
      onSuccess={onSuccess || ((msg: string) => {})}
      onError={onError || ((msg: string) => {})}
      DecisionBox={DecisionBox}
      approvalStepId={approvalStepId}
    />
  )
}

export const ChangeRequestImpactAssessmentTaskModalWrapper: React.FC<{
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}> = (props) => {
  return <ChangeRequestImpactAssessmentStepTaskModal {...props} />
}
