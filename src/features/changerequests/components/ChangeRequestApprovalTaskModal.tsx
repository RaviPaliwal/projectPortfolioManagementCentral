import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderIcon from '@mui/icons-material/Folder'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { fetchChangeRequestById, updateChangeRequest } from '@/services/change-request.service'
import { fetchProjectDetails, updateProject } from '@/services/project.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ChangeRequestModel, ProjectModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { useUser } from '@/context/UserContext'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface ChangeRequestApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  changeRequestId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  '0': 'Scope', '1': 'Schedule', '2': 'Resource',
}

const CHANGE_TYPE_COLORS: Record<string, 'primary' | 'warning' | 'info'> = {
  '0': 'primary', '1': 'warning', '2': 'info',
}

const PRIORITY_LABELS: Record<string, string> = { '0': 'Medium', '1': 'High' }
const PRIORITY_COLORS: Record<string, 'warning' | 'error'> = { '0': 'warning', '1': 'error' }

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const ChangeRequestApprovalTaskModal: React.FC<ChangeRequestApprovalTaskModalProps> = ({
  open, onClose, changeRequestId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const { currentUser } = useUser()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changeRequest, setChangeRequest] = useState<ChangeRequestModel | null>(null)
  const [linkedProject, setLinkedProject] = useState<ProjectModel | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setLocalError(null)
    try {
      const cr = await fetchChangeRequestById(changeRequestId)
      if (!cr) { onError('Change request not found.'); setLoading(false); return }
      setChangeRequest(cr)
      if (cr._pm_project_value) {
        try {
          const proj = await fetchProjectDetails(cr._pm_project_value)
          setLinkedProject(proj)
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load change request', err)
      onError('Failed to load change request details.')
    } finally { setLoading(false) }
  }, [changeRequestId, onError])

  useEffect(() => {
    if (open) { loadData(); setLocalError(null) }
  }, [open, loadData])

  const onBeforeDecision = useCallback(async (decision: number): Promise<boolean> => {
    if (!changeRequest) return false
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const decisionMaker = currentUser?.fullname || currentUser?.systemuserid || 'System'
      if (decision === 0) {
        const updates: Partial<ChangeRequestModel> = {
          pm_status: 0,
          pm_decisiondate: now,
          pm_decisionmaker: decisionMaker,
        }
        await updateChangeRequest(changeRequest.pm_changerequestid!, updates)
        
        const costImpact = changeRequest.pm_costimpacteur ?? 0
        const scheduleImpact = changeRequest.pm_scheduleimpactdays ?? 0
        const baselineUpdated = changeRequest.pm_baselineupdated
        
        if (changeRequest._pm_project_value && (costImpact > 0 || scheduleImpact > 0)) {
          const projectUpdates: Partial<ProjectModel> = {}
          if (costImpact > 0 && linkedProject) {
            const currentBudget = linkedProject.pm_approvedbudget ?? 0
            projectUpdates.pm_approvedbudget = currentBudget + costImpact
          }
          if (scheduleImpact > 0 && linkedProject && linkedProject.pm_plannedenddate) {
            const currentEnd = new Date(linkedProject.pm_plannedenddate)
            currentEnd.setDate(currentEnd.getDate() + scheduleImpact)
            projectUpdates.pm_plannedenddate = currentEnd.toISOString().split('T')[0]
          }
          if (baselineUpdated) {
            projectUpdates.pm_ragstatus = '0' // Amber — baseline changed
          }
          if (Object.keys(projectUpdates).length > 0) {
            await updateProject(changeRequest._pm_project_value, projectUpdates)
          }
        }
      } else {
        await updateChangeRequest(changeRequest.pm_changerequestid!, {
          pm_status: 3 as any,
          pm_decisiondate: now,
          pm_decisionmaker: decisionMaker,
        })
      }
      return true
    } catch (err) {
      console.error('Failed to apply change impact:', err)
      setLocalError('Failed to apply change impacts. Please try again.')
      return false
    } finally { setSaving(false) }
  }, [changeRequest, linkedProject])

  const onDecisionComplete = useCallback((decision: number) => {
    if (decision === 0) {
      onSuccess('Change request approved and project updated.')
    } else {
      onSuccess('Change request rejected.')
    }
    dispatchFormDialogDecision({ formKey: 'change_request_approval', decision })
    onClose()
  }, [onSuccess, onClose])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ChangeCircleIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Change Request Review</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
                    <Chip size="small" icon={<AttachMoneyIcon sx={{ fontSize: 14 }} />} label={currencyFormatter.format(changeRequest.pm_costimpacteur ?? 0)} />
                    <Chip size="small" icon={<ScheduleIcon sx={{ fontSize: 14 }} />} label={`${changeRequest.pm_scheduleimpactdays ?? 0}d`} />
                  </Box>
                </Box>
                {/* Linked entities */}
                {(changeRequest.pm_projectname || changeRequest.pm_programmename) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Linked Entity</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {changeRequest.pm_projectname && (
                        <Chip size="small" icon={<FolderIcon sx={{ fontSize: 14 }} />} label={changeRequest.pm_projectname} variant="outlined" />
                      )}
                      {changeRequest.pm_programmename && (
                        <Chip size="small" icon={<AccountTreeIcon sx={{ fontSize: 14 }} />} label={changeRequest.pm_programmename} variant="outlined" />
                      )}
                    </Box>
                  </Box>
                )}
                {/* Baseline updated status */}
                {changeRequest.pm_baselineupdated && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Baseline</Typography>
                    <StatusTag label="Baseline Updated" color="warning" size="small" />
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              {localError && <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert>}
              
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Description</Typography>
              <Typography variant="body2" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>{changeRequest.pm_changedescription || 'No description provided.'}</Typography>
              
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Justification</Typography>
              <Typography variant="body2" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>{changeRequest.pm_justification || 'No justification provided.'}</Typography>

              {changeRequest.pm_benefitsimpact && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmojiEventsIcon sx={{ fontSize: 16 }} /> Benefits Impact
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>{changeRequest.pm_benefitsimpact}</Typography>
                </>
              )}

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
