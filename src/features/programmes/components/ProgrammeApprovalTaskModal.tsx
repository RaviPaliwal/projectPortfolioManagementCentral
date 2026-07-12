import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, Divider, Chip, Paper, useTheme, alpha,
  TextField, FormControl, InputLabel, Select, MenuItem, Avatar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import GroupsIcon from '@mui/icons-material/Groups'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { fetchProgrammeDetails, updateProgrammePhase, updateProgramme } from '@/services/programme.service'
import { fetchInitiatives } from '@/services/initiative.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import { useUser } from '@/context/UserContext'
import type { ProgrammeModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface ProgrammeApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  entityId?: string | null
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const PHASE_LABELS: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  0: { label: 'Delivery', color: 'success' },
  1: { label: 'Planning', color: 'warning' },
  2: { label: 'Initiation', color: 'info' },
  3: { label: 'Under Approval', color: 'warning' },
}

const RAG_LABELS: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  0: { label: 'Medium', color: 'warning' },
  1: { label: 'Low', color: 'success' },
  2: { label: 'High', color: 'error' },
}

export const ProgrammeApprovalTaskModal: React.FC<ProgrammeApprovalTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users } = useUser()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [programme, setProgramme] = useState<ProgrammeModel | null>(null)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [riskCount, setRiskCount] = useState<number>(0)
  const [issueCount, setIssueCount] = useState<number>(0)
  const [askedBudget, setAskedBudget] = useState<number | null>(null)

  // Form states for editable fields
  const [managerId, setManagerId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const [detail, inits] = await Promise.all([
        fetchProgrammeDetails(entityId),
        fetchInitiatives()
      ])
      if (!detail.programme) { onError('Programme not found.'); setLoading(false); return }
      const p = detail.programme
      setProgramme(p)
      setProjectCount(detail.projects.length)
      setRiskCount(detail.risks.length)
      setIssueCount(detail.issues.length)

      const linkedInit = inits.find(i => i.pm_convertedtoreference === entityId)
      if (linkedInit && linkedInit.pm_estimatedcost != null) {
        setAskedBudget(linkedInit.pm_estimatedcost)
      } else {
        setAskedBudget(p.pm_budgeteur ?? null)
      }

      // Initialize form fields
      setManagerId(p.pm_programmemanager ? p.pm_programmemanager.replace(/[{}]/g, '').toLowerCase() : '')
      setStartDate(p.pm_startdate ? p.pm_startdate.split('T')[0] : '')
      setEndDate(p.pm_enddate ? p.pm_enddate.split('T')[0] : '')
      setDescription(p.pm_programmedescription || '')
    } catch (err) {
      console.error('Failed to load programme', err)
      onError('Failed to load programme details.')
    } finally { setLoading(false) }
  }, [entityId, onError])

  useEffect(() => {
    if (open) { loadData() }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (!entityId) return false
    setSaving(true)
    try {
      // First save the updated details to Dataverse
      await updateProgramme(entityId, {
        pm_programmemanager: managerId || undefined,
        pm_startdate: startDate || undefined,
        pm_enddate: endDate || undefined,
        pm_programmedescription: description || undefined,
      })

      // DecisionBox values: 0 = Approve, 3 = Reject
      const targetPhase = workflowDecision === 0 ? 2 : 1
      await updateProgrammePhase(entityId, targetPhase)
      const outcomeLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess('Programme Approval completed. Outcome: ' + outcomeLabel + '.')
      return true
    } catch (err) {
      console.error('[ProgrammeApprovalTaskModal] saveTaskData error:', err)
      onError('Failed to record programme decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, managerId, startDate, endDate, description, onSuccess, onError])

  if (!open) return null

  const currentPhase = programme?.pm_programmephase != null ? PHASE_LABELS[Number(programme.pm_programmephase)] : null
  const rag = programme?.pm_ragstatus != null ? RAG_LABELS[Number(programme.pm_ragstatus)] : null

  const formatDate = (d?: string | null): string => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountTreeIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Programme Approval</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Approval" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
            {/* Programme Context details Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Programme Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                {programme?.pm_programmename || 'Loading...'}
              </Typography>

              <Grid container spacing={2.5}>
                {/* Row 1: Non-editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Target Portfolio</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{programme?.pm_portfolioname || '—'}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Business Sponsor</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{programme?.pm_sponsorname || '—'}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Business Unit</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{programme?.pm_businessunit || '—'}</Typography>
                  </Box>
                </Grid>

                {/* Row 2: Non-editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      borderRadius: 1, 
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.04)' : 'rgba(46, 125, 50, 0.02)',
                      borderColor: (theme) => alpha(theme.palette.success.main, 0.25),
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                      Asked Budget
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main', fontFamily: '"Outfit", sans-serif' }}>
                      {askedBudget != null ? currencyFormatter.format(askedBudget) : '—'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Overall RAG</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {rag ? (
                        <StatusTag label={rag.label} color={rag.color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Not specified</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Programme Phase</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {currentPhase ? (
                        <StatusTag label={currentPhase.label} color={currentPhase.color} size="small" sx={{ fontWeight: 600 }} />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Not specified</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Row 3: Editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="approve-manager-label">Programme Manager</InputLabel>
                    <Select
                      labelId="approve-manager-label"
                      label="Programme Manager"
                      value={managerId ? managerId.replace(/[{}]/g, '').toLowerCase() : ''}
                      onChange={(e) => setManagerId(e.target.value ? e.target.value.replace(/[{}]/g, '').toLowerCase() : '')}
                      renderValue={(selected) => {
                        const normSel = selected ? selected.replace(/[{}]/g, '').toLowerCase() : ''
                        const user = users.find((u) => u.systemuserid?.replace(/[{}]/g, '').toLowerCase() === normSel)
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                              {user?.fullname?.charAt(0) || '?'}
                            </Avatar>
                            {user?.fullname || 'Select Manager'}
                          </Box>
                        )
                      }}
                    >
                      <MenuItem value="">— Select —</MenuItem>
                      {users.map((user) => {
                        const normId = user.systemuserid ? user.systemuserid.replace(/[{}]/g, '').toLowerCase() : ''
                        return (
                          <MenuItem key={normId} value={normId}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                                {user.fullname?.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2">{user.fullname}</Typography>
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    size="small"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="End Date"
                    size="small"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Description */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DescriptionIcon sx={{ fontSize: 16 }} /> Description & Objectives
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="Enter description or objectives..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Box>

            {/* Financial Summary */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AttachMoneyIcon sx={{ fontSize: 16 }} /> Financial Summary
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Approved Budget</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                  {programme?.pm_budgeteur != null ? currencyFormatter.format(programme.pm_budgeteur) : '—'}
                </Typography>
              </Paper>
            </Box>

            {/* Decision Instruction Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
                <FactCheckIcon sx={{ fontSize: 16 }} /> After Your Decision
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                <strong>Approved:</strong> Programme phase changes to <em>Initiation</em>, enabling project creation and resource allocation.
                <br />
                <strong>Rejected:</strong> Programme returns to <em>Planning</em> phase. The programme manager will be notified with the decision notes.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'programme_approval', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="contained" color="success" disabled={loading || saving} onClick={async () => { await saveTaskData(0); onClose() }} sx={{ fontWeight: 600 }}>
              {saving ? 'Processing...' : 'Approve'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  )
}
