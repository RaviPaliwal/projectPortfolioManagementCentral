import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, Chip, Paper, TextField, Avatar,
  Divider, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import DescriptionIcon from '@mui/icons-material/Description'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { fetchProgrammeDetails, updateProgramme } from '@/services/programme.service'
import { fetchInitiatives } from '@/services/initiative.service'
import { fetchSystemUsers } from '@/services/team.service'
import type { ProgrammeModel } from '@/types/dataverse'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import { useUser } from '@/context/UserContext'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'

interface ProgrammeFinanceTaskModalProps {
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

export const ProgrammeFinanceTaskModal: React.FC<ProgrammeFinanceTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const { users: contextUsers } = useUser()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [programme, setProgramme] = useState<ProgrammeModel | null>(null)
  const [askedBudget, setAskedBudget] = useState<number | null>(null)
  const [approvedBudget, setApprovedBudget] = useState<number>(0)

  // Form states (read-only in UI, but loaded/saved)
  const [managerId, setManagerId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [businessUnit, setBusinessUnit] = useState<string>('')
  const [sponsorName, setSponsorName] = useState<string>('')
  const [portfolioName, setPortfolioName] = useState<string>('')

  // Sync users state when context users resolve
  useEffect(() => {
    if (contextUsers && contextUsers.length > 0) {
      setUsers(contextUsers)
    }
  }, [contextUsers])

  const loadData = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const [detail, directUsers, inits] = await Promise.all([
        fetchProgrammeDetails(entityId),
        (!contextUsers || contextUsers.length === 0) ? fetchSystemUsers() : Promise.resolve(null),
        fetchInitiatives()
      ])

      if (directUsers) {
        setUsers(directUsers)
      }

      const p = detail.programme
      if (!p) { onError('Programme not found.'); setLoading(false); return }
      setProgramme(p)

      const linkedInit = inits.find(i => i.pm_convertedtoreference === entityId)
      if (linkedInit && linkedInit.pm_estimatedcost != null) {
        setAskedBudget(linkedInit.pm_estimatedcost)
        setApprovedBudget(linkedInit.pm_estimatedcost)
      } else {
        const fallback = p.pm_budgeteur ?? 0
        setAskedBudget(fallback || null)
        setApprovedBudget(fallback)
      }

      // Initialize form fields
      setManagerId(p.pm_programmemanager ? p.pm_programmemanager.replace(/[{}]/g, '').toLowerCase() : '')
      setStartDate(p.pm_startdate ? p.pm_startdate.split('T')[0] : '')
      setEndDate(p.pm_enddate ? p.pm_enddate.split('T')[0] : '')
      setDescription(p.pm_programmedescription || '')
      setBusinessUnit(p.pm_businessunit || '')
      setSponsorName(p.pm_sponsorname || '')
      setPortfolioName(p.pm_portfolioname || '')
    } catch (err) {
      console.error('Failed to load programme finance details', err)
      onError('Failed to load programme details.')
    } finally { setLoading(false) }
  }, [entityId, contextUsers, onError])

  useEffect(() => {
    if (open) { loadData() }
  }, [open, loadData])

  const saveTaskData = useCallback(async (workflowDecision: number): Promise<boolean> => {
    if (!entityId) return false
    setSaving(true)
    try {
      // DecisionBox values: 0 = Approve, 3 = Reject
      // Approved phase: Delivery (0). Rejected phase: Planning (1)
      const targetPhase = workflowDecision === 0 ? 0 : 1

      // Save approved budget and target status to Dataverse
      await updateProgramme(entityId, {
        pm_programmemanager: managerId || undefined,
        pm_startdate: startDate || undefined,
        pm_enddate: endDate || undefined,
        pm_programmedescription: description || undefined,
        pm_budgeteur: workflowDecision === 0 ? approvedBudget : undefined,
        pm_programmephase: targetPhase,
      })

      const outcomeLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Programme Finance Decision recorded. Budget Approved: ${currencyFormatter.format(approvedBudget)}. Outcome: ${outcomeLabel}.`)
      return true
    } catch (err) {
      console.error('[ProgrammeFinanceTaskModal] saveTaskData error:', err)
      onError('Failed to record programme decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, managerId, startDate, endDate, description, approvedBudget, onSuccess, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Programme Finance Approval</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Finance Review" color="info" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
            {/* Programme context card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Programme Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                {programme?.pm_programmename || 'Loading...'}
              </Typography>

              <Grid container spacing={3.5}>
                {/* Asked Budget (Read-only) */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: '16px', 
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.04), 
                      borderColor: (theme) => alpha(theme.palette.success.main, 0.25),
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2.5,
                      height: '100%',
                      boxShadow: (theme) => `0 4px 16px ${alpha(theme.palette.success.main, 0.04)}`
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.12), 
                        color: 'success.main', 
                        width: 48, 
                        height: 48, 
                        border: '1px solid', 
                        borderColor: (theme) => alpha(theme.palette.success.main, 0.25) 
                      }}
                    >
                      <AttachMoneyIcon sx={{ fontSize: 26 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontSize: '0.65rem' }}>
                        Asked Budget (From Pipeline Est. Budget)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.dark', mt: 0.5, fontFamily: '"Outfit", sans-serif' }}>
                        {askedBudget != null ? currencyFormatter.format(askedBudget) : '—'}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>

                {/* Decide Approved Budget */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      height: '100%',
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
                      boxShadow: (theme) => `0 4px 12px rgba(0, 0, 0, 0.02)`
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1, fontSize: '0.65rem' }}>
                      Decide Approved Budget (EUR)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      size="medium"
                      value={approvedBudget}
                      onChange={(e) => setApprovedBudget(Number(e.target.value))}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Typography variant="h6" color="text.secondary" sx={{ mr: 1, fontWeight: 700 }}>
                              €
                            </Typography>
                          ),
                          sx: { 
                            fontWeight: 800, 
                            fontFamily: '"Outfit", sans-serif',
                            fontSize: '1.2rem',
                            height: 40,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                        }
                      }}
                    />
                  </Paper>
                </Grid>

                {/* Read-only Programme Context Details */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3, mt: 1.5 }}>
                    <Grid container spacing={3}>
                      {/* Parent Portfolio */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 40, height: 40 }}>
                            <BusinessIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              Parent Portfolio
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.25 }}>
                              {portfolioName || '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Business Sponsor */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 40, height: 40 }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              Business Sponsor
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.25 }}>
                              {sponsorName || '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Business Unit */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 40, height: 40 }}>
                            <BusinessIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              Business Unit
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.25 }}>
                              {businessUnit || '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Programme Manager */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {(() => {
                            const user = users.find((u) => u.systemuserid?.replace(/[{}]/g, '').toLowerCase() === managerId)
                            return (
                              <>
                                <Avatar 
                                  sx={{ 
                                    bgcolor: 'primary.main', 
                                    color: 'primary.contrastText', 
                                    width: 40, 
                                    height: 40,
                                    fontWeight: 700,
                                    fontSize: 14
                                  }}
                                >
                                  {user?.fullname?.charAt(0) || '?'}
                                </Avatar>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                                    Programme Manager
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.25 }}>
                                    {user?.fullname || '—'}
                                  </Typography>
                                </Box>
                              </>
                            )
                          })()}
                        </Box>
                      </Grid>

                      {/* Start Date */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.08), color: 'info.main', width: 40, height: 40 }}>
                            <CalendarMonthIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              Start Date
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.25 }}>
                              {startDate ? new Date(startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* End Date */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.08), color: 'info.main', width: 40, height: 40 }}>
                            <CalendarMonthIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              End Date
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.25 }}>
                              {endDate ? new Date(endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Phase & RAG */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Overall RAG / Phase
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {programme?.pm_ragstatus != null ? (
                                <StatusTag
                                  label={programme.pm_ragstatus === 1 ? 'Green' : programme.pm_ragstatus === 0 ? 'Amber' : 'Red'}
                                  color={programme.pm_ragstatus === 1 ? 'success' : programme.pm_ragstatus === 0 ? 'warning' : 'error'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 700 }}
                                />
                              ) : null}
                              {programme?.pm_programmephase != null ? (
                                <StatusTag 
                                  label={PHASE_LABELS[Number(programme.pm_programmephase)]?.label || 'Under Approval'} 
                                  color={PHASE_LABELS[Number(programme.pm_programmephase)]?.color || 'info'} 
                                  size="small" 
                                  sx={{ fontWeight: 700 }} 
                                />
                              ) : (
                                <StatusTag label="Under Finance Review" color="info" size="small" sx={{ fontWeight: 700 }} />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Description read-only card */}
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                borderRadius: '16px', 
                bgcolor: 'background.paper', 
                borderColor: 'divider',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
              }}
            >
              <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                  <DescriptionIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  Description & Objectives
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {description || 'No description provided.'}
                </Typography>
              </Box>
            </Paper>

            {/* Decision Instruction Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
                <FactCheckIcon sx={{ fontSize: 16 }} /> After Your Decision
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                <strong>Approved:</strong> Programme phase changes to <em>Delivery</em> and sets final approved budget, enabling project creation and child resource allocations.
                <br />
                <strong>Rejected:</strong> Programme phase returned to <em>Planning</em>. The programme manager will be notified with decision notes.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={saveTaskData}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'programme_finance_decision', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 1.5 }}>Close</Button>
            <Button onClick={() => saveTaskData(0)} variant="contained" color="success" sx={{ borderRadius: 1.5 }}>Approve</Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  )
}
