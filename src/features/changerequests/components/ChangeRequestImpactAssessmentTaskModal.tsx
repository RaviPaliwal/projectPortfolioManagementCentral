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

  const overallSeverityLabel = useMemo(() => {
    if (areas.length === 0) return 'None'
    const maxRank = Math.max(...areas.map(a => SEVERITY_RANK[a.severity]))
    if (maxRank === 0) return 'None'
    if (maxRank === 1) return 'Low'
    if (maxRank === 2) return 'Medium'
    return 'High'
  }, [areas])

  const overallSeverityColor = useMemo(() => {
    if (overallSeverityLabel === 'None') return 'grey'
    if (overallSeverityLabel === 'Low') return 'success'
    if (overallSeverityLabel === 'Medium') return 'warning'
    return 'error'
  }, [overallSeverityLabel])

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

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssessmentIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Impact Assessment</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : changeRequest ? (
          <Grid container>
            {/* Left Column: Context Card */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>{changeRequest.pm_changerequesttitle}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{changeRequest.pm_changerequestreference}</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Type</Typography>
                  <StatusTag label={CHANGE_TYPE_LABELS[String(changeRequest.pm_changetype ?? '')]} color={CHANGE_TYPE_COLORS[String(changeRequest.pm_changetype ?? '')]} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Priority</Typography>
                  <StatusTag label={PRIORITY_LABELS[String(changeRequest.pm_prioritylevel ?? '')]} color={PRIORITY_COLORS[String(changeRequest.pm_prioritylevel ?? '')]} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Impact</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip size="small" icon={<AttachMoneyIcon sx={{ fontSize: 14 }} />} label={`${changeRequest.pm_costimpacteur ?? 0} EUR`} />
                    <Chip size="small" icon={<ScheduleIcon sx={{ fontSize: 14 }} />} label={`${changeRequest.pm_scheduleimpactdays ?? 0}d`} />
                  </Box>
                </Box>
                {linkedProject && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Linked Project</Typography>
                    <Chip size="small" icon={<FolderIcon sx={{ fontSize: 14 }} />} label={linkedProject.pm_projectname || 'Unnamed Project'} variant="outlined" />
                  </Box>
                )}
                {/* Project Milestones */}
                {projectMilestones.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Project Milestones</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {projectMilestones.map(m => (
                        <Box key={m.pm_projectmilestoneid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                            {m.pm_milestonename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {m.pm_planneddate ? new Date(m.pm_planneddate).toLocaleDateString() : 'No date'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Overall Rating</Typography>
                  <Chip size="small" label={`Overall: ${overallSeverityLabel}`} color={overallSeverityColor as any} sx={{ fontWeight: 600 }} />
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Assessment Forms */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {localError && <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert>}
              
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Impact Area Severity Ratings</Typography>

              {areas.map(area => (
                <Box key={area.categoryValue} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2, bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: area.severity !== 0 ? 1.5 : 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{area.categoryLabel} impact</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {SEVERITIES.map(s => {
                        const isSelected = area.severity === s.value
                        return (
                          <Button
                            key={s.value}
                            variant={isSelected ? 'contained' : 'outlined'}
                            color={s.color}
                            size="small"
                            onClick={() => handleUpdateSeverity(area.categoryValue, s.value)}
                            sx={{
                              borderRadius: 4,
                              px: 1.75,
                              py: 0.25,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              boxShadow: 'none',
                              '&:hover': { boxShadow: 'none' },
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
                        slotProps={{
                          input: { sx: { borderRadius: 1.5, fontSize: '0.85rem' } }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}

              <Divider sx={{ my: 3 }} />
              
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
