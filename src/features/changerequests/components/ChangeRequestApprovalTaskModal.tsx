import React, { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import {
  Dialog, DialogContent, CircularProgress, Alert, Button, IconButton, DialogActions, Divider
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderIcon from '@mui/icons-material/Folder'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import DescriptionIcon from '@mui/icons-material/Description'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningIcon from '@mui/icons-material/Warning'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import ShieldIcon from '@mui/icons-material/Shield'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PeopleIcon from '@mui/icons-material/People'
import MessageIcon from '@mui/icons-material/Message'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

import { fetchChangeRequestById, updateChangeRequest } from '@/services/change-request.service'
import { fetchProjectDetails, updateProject, fetchProjectMilestones } from '@/services/project.service'
import { Pm_changerequestimpactsService } from '@/generated/services/Pm_changerequestimpactsService'
import { fetchWorkflowInstancesForEntity, fetchWorkflowApprovalSteps, fetchStepTemplateById, submitWorkflowDecision } from '@/services/workflow.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { ChangeRequestModel, ProjectModel, ProjectMilestoneModel, WorkflowApprovalStepModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { useUser } from '@/context/UserContext'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { resolveEntityIdFromApprovalStep } from '@/services/task-resolver.service'

interface ChangeRequestApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  changeRequestId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

/* ---------- design tokens ---------- */
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

const CHANGE_TYPE_LABELS: Record<string, string> = {
  '0': 'Scope', '1': 'Schedule', '2': 'Resource',
}

const PRIORITY_LABELS: Record<string, string> = { '0': 'Medium', '1': 'High' }

const STEP_DECISION_LABELS: Record<string, string> = {
  '0': 'Approved / Proceed',
  '1': 'Pending',
  '2': 'Assigned',
  '3': 'Rejected',
}

const STEP_DECISION_COLORS: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
  '0': 'success',
  '1': 'warning',
  '2': 'info',
  '3': 'error',
}

interface ImpactDetail {
  id: string
  area: string
  severity: number
  description: string
}

const SEVERITY_META = {
  1: { word: "Low", color: T.brand, tint: T.brandTint },
  2: { word: "Medium", color: T.amber, tint: T.amberTint },
  3: { word: "High", color: T.red, tint: T.redTint },
}

const getSeverityScore = (val: number): number => {
  if (val === 3) return 1 // Low
  if (val === 1) return 2 // Medium
  if (val === 2) return 3 // High
  return 0
}

const getAreaIcon = (areaName: string) => {
  const name = areaName.toLowerCase()
  if (name.includes('cost')) return AttachMoneyIcon
  if (name.includes('schedule')) return TimerIcon
  if (name.includes('resource')) return PeopleIcon
  return TrendingUpIcon
}

// Simple TimerIcon equivalent
const TimerIcon = ScheduleIcon

/* ---------- Custom Tiny UI Pieces ---------- */
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

const StatBlock: React.FC<{ icon: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <Icon style={{ fontSize: 16, color: T.faint }} />
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.faint }}>{label}</div>
    </div>
  </div>
)

const LinkChip: React.FC<{ icon: any; label: string; sub: string }> = ({ icon: Icon, label, sub }) => (
  <Button
    variant="outlined"
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      background: "transparent",
      border: `1px solid ${T.line}`,
      borderRadius: '8px',
      padding: "8px 11px",
      textTransform: 'none',
      color: T.ink,
      fontFamily: "'Inter', -apple-system, sans-serif",
      '&:hover': {
        borderColor: T.brand,
        background: T.brandTint,
      }
    }}
  >
    <Icon style={{ fontSize: 14, color: T.brand }} />
    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 11, color: T.faint, marginLeft: 4 }}>{sub}</span>
    <ChevronRightIcon style={{ fontSize: 12, color: T.faint, marginLeft: 2 }} />
  </Button>
)

const SectionLabel: React.FC<{ icon?: any; text: string }> = ({ icon: Icon, text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
    {Icon && <Icon style={{ fontSize: 13, color: T.brand }} />}
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.sub, textTransform: "uppercase" }}>
      {text}
    </span>
  </div>
)

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
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestoneModel[]>([])
  const [impactDetails, setImpactDetails] = useState<ImpactDetail[]>([])
  const [assessmentStep, setAssessmentStep] = useState<WorkflowApprovalStepModel | null>(null)
  
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
          const milestones = await fetchProjectMilestones(cr._pm_project_value)
          setProjectMilestones(milestones)
        } catch {}
      }

      // Fetch impact assessment entries
      try {
        const existingRes = await Pm_changerequestimpactsService.getAll({
          filter: `pm_changerequestid eq '${changeRequestId}'`
        })
        if (existingRes.success && existingRes.data) {
          const mappedImpacts = existingRes.data.map(item => ({
            id: item.pm_changerequestimpactid || '',
            area: item.pm_impactareaname || 'General',
            severity: item.pm_severityrating != null ? Number(item.pm_severityrating) : 0,
            description: item.pm_impactdescription || '',
          }))
          setImpactDetails(mappedImpacts.filter(i => i.severity !== 0))
        }
      } catch (err) {
        console.error('[ApprovalTaskModal] Failed to load impacts:', err)
      }

      // Fetch assessment step decision details
      try {
        const instances = await fetchWorkflowInstancesForEntity(MODULE_NAMES.CHANGE_REQUESTS.value, changeRequestId)
        if (instances.length > 0) {
          const activeInstance = instances[0]
          const steps = await fetchWorkflowApprovalSteps(activeInstance.pm_workflowinstanceid!)
          for (const step of steps) {
            let isMatch = false
            if (step.pm_stepname?.toLowerCase().includes('impact assessment')) {
              isMatch = true
            } else if (step._pm_workflowtemplate_value) {
              const tmpl = await fetchStepTemplateById(step._pm_workflowtemplate_value)
              if (tmpl?.new_formkey === 'change_request_impact_assessment') {
                isMatch = true
              }
            }
            if (isMatch) {
              setAssessmentStep(step)
              break
            }
          }
        }
      } catch (err) {
        console.error('[ApprovalTaskModal] Failed to load workflow steps:', err)
      }
    } catch (err) {
      console.error('Failed to load change request', err)
      onError('Failed to load change request details.')
    } finally { setLoading(false) }
  }, [changeRequestId, onError])

  useEffect(() => {
    if (open) { loadData(); setLocalError(null) }
  }, [open, loadData])

  const overallRisk = useMemo(() => {
    if (impactDetails.length === 0) {
      return { word: "Low", color: T.brand, tint: T.brandTint, msg: "Minimal downstream impact expected." }
    }
    const totalScore = impactDetails.reduce((s, f) => s + getSeverityScore(f.severity), 0)
    const avg = totalScore / impactDetails.length
    const highCount = impactDetails.filter(i => i.severity === 2).length
    
    if (avg >= 2.4) {
      return { word: "Elevated", color: T.red, tint: T.redTint, msg: `${highCount} of ${impactDetails.length} impact areas rated high — recommend sponsor visibility before approval.` }
    }
    if (avg >= 1.6) {
      return { word: "Moderate", color: T.amber, tint: T.amberTint, msg: "Mixed impact — proceed with standard governance." }
    }
    return { word: "Low", color: T.brand, tint: T.brandTint, msg: "Minimal downstream impact expected." }
  }, [impactDetails])

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
        
        if (changeRequest._pm_project_value && (costImpact > 0 || scheduleImpact > 0)) {
          const projectUpdates: Partial<ProjectModel> = {}
          if (costImpact > 0 && linkedProject) {
            const currentBudget = linkedProject.pm_approvedbudget ?? 0
            projectUpdates.pm_approvedbudget = currentBudget + costImpact
          }
          await updateProject(changeRequest._pm_project_value, projectUpdates)
        }
      } else {
        const updates: Partial<ChangeRequestModel> = {
          pm_status: 3,
          pm_decisiondate: now,
          pm_decisionmaker: decisionMaker,
        }
        await updateChangeRequest(changeRequest.pm_changerequestid!, updates)
      }
      return true
    } catch (err) {
      console.error('Failed to submit decision metadata updates', err)
      setLocalError('Failed to save decision metadata updates.')
      return false
    } finally {
      setSaving(false)
    }
  }, [changeRequest, currentUser, linkedProject])



  if (!open) return null

  return (
    <Dialog 
      open={open} 
      onClose={() => !saving && onClose()} 
      maxWidth="md" 
      fullWidth
      sx={{
        '& .MuiDialogPaper-root': {
          borderRadius: '14px',
          border: `1px solid ${T.line}`,
          background: T.card,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }
      }}
    >
      <DialogContent sx={{ p: 0, bgcolor: T.paper, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600&display=swap');
          textarea:focus { outline: none; }
          .cr-btn { transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
        `}</style>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><CircularProgress /></div>
        ) : changeRequest ? (
          <div>
            {/* Header section */}
            <div style={{ padding: "24px 30px 0", position: 'relative' }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", color: T.faint, textTransform: "uppercase", marginBottom: 6 }}>
                    {changeRequest.pm_changerequestreference || 'CR'} &nbsp;·&nbsp; {changeRequest.pm_programmename || 'Change Management'}
                  </div>
                  <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 26, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.01em" }}>
                    {changeRequest.pm_changerequesttitle}
                  </h1>
                </div>
                <IconButton
                  onClick={onClose}
                  disabled={saving}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    border: `1px solid ${T.line}`,
                    background: "transparent",
                    color: T.sub,
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: T.ink,
                      background: '#f0eee6',
                    }
                  }}
                >
                  <CloseIcon style={{ fontSize: 15 }} />
                </IconButton>
              </div>

              <div style={{ display: "flex", gap: 22, marginTop: 18, paddingBottom: 20, flexWrap: "wrap", alignItems: 'center' }}>
                <StatBlock icon={AttachMoneyIcon} label="Estimated cost" value={currencyFormatter.format(changeRequest.pm_costimpacteur ?? 0)} />
                <StatBlock icon={ScheduleIcon} label="Schedule delay" value={`${changeRequest.pm_scheduleimpactdays ?? 0} days`} />
                <StatBlock icon={DescriptionIcon} label="Type" value={CHANGE_TYPE_LABELS[String(changeRequest.pm_changetype ?? '')] || 'General'} />
                
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <Tag color={T.amber} tint={T.amberTint}>
                    {PRIORITY_LABELS[String(changeRequest.pm_prioritylevel ?? '')] || 'Medium'} Priority
                  </Tag>
                  <Tag color={T.amber} tint={T.amberTint}>Pending Review</Tag>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: T.line }} />

            {/* Risk summary strip */}
            <div
              style={{
                margin: "20px 30px 0",
                background: overallRisk.tint,
                border: `1px solid ${overallRisk.color}33`,
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <ShieldIcon style={{ fontSize: 20, color: overallRisk.color, flexShrink: 0 }} />
              <div style={{ fontSize: 13.5 }}>
                <span style={{ fontWeight: 700, color: overallRisk.color }}>{overallRisk.word} overall risk. </span>
                <span style={{ color: T.ink, opacity: 0.85 }}>{overallRisk.msg}</span>
              </div>
            </div>

            {/* Local Error Alert */}
            {localError && (
              <div style={{ margin: "20px 30px 0" }}>
                <Alert severity="error" onClose={() => setLocalError(null)}>{localError}</Alert>
              </div>
            )}

            {/* Body sections */}
            <div style={{ padding: "24px 30px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
                <div>
                  <SectionLabel text="Description" />
                  <p style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {changeRequest.pm_changedescription || 'No description provided.'}
                  </p>
                </div>
                <div>
                  <SectionLabel text="Justification" />
                  <p style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {changeRequest.pm_justification || 'No justification provided.'}
                  </p>
                </div>
              </div>

              {changeRequest.pm_benefitsimpact && (
                <div style={{ marginTop: 20 }}>
                  <SectionLabel icon={EmojiEventsIcon} text="Benefits impact" />
                  <p style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {changeRequest.pm_benefitsimpact}
                  </p>
                </div>
              )}

              {/* Assessor Decision Summary */}
              {assessmentStep && (
                <div style={{ marginTop: 22 }}>
                  <SectionLabel icon={MessageIcon} text="Impact Assessment Decision" />
                  <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 10, padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 11, color: T.faint }}>Assessor</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 8 }}>{assessmentStep.pm_approvername || assessmentStep.pm_assigneedisplayname || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: T.faint }}>Decision</div>
                      <div style={{ marginTop: 8 }}>
                        <Tag 
                          color={STEP_DECISION_COLORS[String(assessmentStep.pm_decisionstatus ?? '')] === 'success' ? T.brand : T.red} 
                          tint={STEP_DECISION_COLORS[String(assessmentStep.pm_decisionstatus ?? '')] === 'success' ? T.brandTint : T.redTint}
                        >
                          {STEP_DECISION_LABELS[String(assessmentStep.pm_decisionstatus ?? '')] || 'Proceed'}
                        </Tag>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: T.faint }}>Notes</div>
                      <div style={{ fontSize: 12.5, color: T.sub, fontStyle: 'italic', marginTop: 8 }}>
                        {assessmentStep.pm_decisionnotes || 'No assessment notes provided.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Impact assessment findings */}
              {impactDetails.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <SectionLabel icon={WarningIcon} text="Impact assessment findings" />
                  <div style={{ marginTop: 4 }}>
                    {impactDetails.map((f, i) => {
                      const meta = SEVERITY_META[f.severity as keyof typeof SEVERITY_META] || { word: "Low", color: T.brand, tint: T.brandTint }
                      const pct = f.severity === 2 ? 100 : f.severity === 1 ? 66 : 33
                      const Icon = getAreaIcon(f.area)
                      return (
                        <div
                          key={f.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "170px 1fr 84px",
                            alignItems: "center",
                            gap: 16,
                            padding: "13px 0",
                            borderTop: i === 0 ? "none" : `1px solid ${T.line}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Icon style={{ fontSize: 14, color: meta.color }} />
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{f.area}</span>
                          </div>
                          <div>
                            <div style={{ height: 6, background: "#EFEBE0", borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: meta.color, borderRadius: 999 }} />
                            </div>
                            <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.4 }}>{f.description}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Tag color={meta.color} tint={meta.tint}>{meta.word}</Tag>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Linked entity */}
              <div style={{ marginTop: 22 }}>
                <SectionLabel text="Linked entity" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {changeRequest.pm_projectname && (
                    <LinkChip icon={FolderIcon} label={changeRequest.pm_projectname} sub="Project" />
                  )}
                  {changeRequest.pm_programmename && (
                    <LinkChip icon={AccountTreeIcon} label={changeRequest.pm_programmename} sub="Programme" />
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : null}
      </DialogContent>

      {changeRequest && !loading && DecisionBoxProp && approvalStepId && (
        <>
          <Divider sx={{ borderColor: T.line }} />
          <DialogActions sx={{ p: 3, bgcolor: T.paper, flexDirection: 'column', alignItems: 'stretch' }}>
            <DecisionBoxProp
              approvalStepId={approvalStepId}
              onBeforeDecision={async (decision, notes) => {
                setSaving(true)
                try {
                  const success = await onBeforeDecision(decision)
                  return success
                } catch (err) {
                  setLocalError(err instanceof Error ? err.message : 'Failed to save decision metadata.')
                  return false
                } finally {
                  setSaving(false)
                }
              }}
              onDecisionComplete={(decision) => {
                onSuccess(decision === 0 ? 'Change request approved.' : 'Change request rejected.')
                dispatchFormDialogDecision({ formKey: 'change_request_approval', decision })
                onClose()
              }}
              onDecisionError={setLocalError}
              disabled={saving}
            />
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

// ─── Wrapper for Task Resolver ────────────────────────────────────────────

interface ChangeRequestApprovalStepTaskModalProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const ChangeRequestApprovalStepTaskModal: React.FC<ChangeRequestApprovalStepTaskModalProps> = ({
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}><CircularProgress /></div>
  }

  if (error || !entityId) {
    return <div style={{ padding: 24, textAlign: 'center', color: T.red }}>{error || 'Unable to resolve entity ID.'}</div>
  }

  return (
    <ChangeRequestApprovalTaskModal
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

export const ChangeRequestApprovalTaskModalWrapper: React.FC<{
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  DecisionBox: ComponentType<DecisionBoxProps>
}> = (props) => {
  return <ChangeRequestApprovalStepTaskModal {...props} />
}
