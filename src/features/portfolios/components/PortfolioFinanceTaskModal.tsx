import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, Chip, Paper, TextField, Avatar,
  Select, MenuItem, FormControl, InputLabel, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import { fetchPortfolioHierarchy, updatePortfolio } from '@/services/portfolio.service'
import { fetchInitiatives } from '@/services/initiative.service'
import { fetchSystemUsers } from '@/services/team.service'
import type { PortfolioModel } from '@/types/dataverse'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import { useUser } from '@/context/UserContext'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'

interface PortfolioFinanceTaskModalProps {
  open: boolean
  onClose: () => void
  entityId?: string | null
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const PortfolioFinanceTaskModal: React.FC<PortfolioFinanceTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const { users: contextUsers } = useUser()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [portfolio, setPortfolio] = useState<PortfolioModel | null>(null)
  const [askedBudget, setAskedBudget] = useState<number | null>(null)
  const [approvedBudget, setApprovedBudget] = useState<number>(0)

  // Form states for editable fields
  const [ownerId, setOwnerId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [strategicObjective, setStrategicObjective] = useState<string>('')
  const [businessUnit, setBusinessUnit] = useState<string>('')
  const [priorityLevel, setPriorityLevel] = useState<number>(2) // Default: Medium (2)

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
      const [hierarchy, directUsers, inits] = await Promise.all([
        fetchPortfolioHierarchy(),
        (!contextUsers || contextUsers.length === 0) ? fetchSystemUsers() : Promise.resolve(null),
        fetchInitiatives()
      ])

      if (directUsers) {
        setUsers(directUsers)
      }

      const found = hierarchy.portfolios.find(p => p.pm_portfolioid === entityId)
      if (!found) { onError('Portfolio not found.'); setLoading(false); return }
      setPortfolio(found)

      const linkedInit = inits.find(i => i.pm_convertedtoreference === entityId)
      if (linkedInit && linkedInit.pm_estimatedcost != null) {
        setAskedBudget(linkedInit.pm_estimatedcost)
        setApprovedBudget(linkedInit.pm_estimatedcost)
      } else {
        const fallback = found.pm_approvedbudgeteur ?? 0
        setAskedBudget(fallback || null)
        setApprovedBudget(fallback)
      }

      // Initialize form fields
      setOwnerId(found.pm_ownerlookup ? found.pm_ownerlookup.replace(/[{}]/g, '').toLowerCase() : '')
      setStartDate(found.pm_startdate ? found.pm_startdate.split('T')[0] : '')
      setEndDate(found.pm_enddate ? found.pm_enddate.split('T')[0] : '')
      setDescription(found.pm_portfoliodescription || '')
      setStrategicObjective(found.pm_strategicobjective || '')
      setBusinessUnit(found.pm_businessunit || '')
      setPriorityLevel(found.pm_prioritylevel != null ? Number(found.pm_prioritylevel) : 2)
    } catch (err) {
      console.error('Failed to load portfolio finance details', err)
      onError('Failed to load portfolio details.')
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
      const targetStatus = workflowDecision === 0 ? 0 : 2

      // Save approved budget and target status to Dataverse
      await updatePortfolio(entityId, {
        pm_ownerlookup: ownerId || undefined,
        pm_startdate: startDate || undefined,
        pm_enddate: endDate || undefined,
        pm_portfoliodescription: description || undefined,
        pm_strategicobjective: strategicObjective || undefined,
        pm_businessunit: businessUnit || undefined,
        pm_prioritylevel: priorityLevel,
        pm_approvedbudgeteur: workflowDecision === 0 ? approvedBudget : undefined,
        pm_portfoliostatus: targetStatus,
      })

      const outcomeLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess(`Portfolio Finance Decision recorded. Budget Approved: ${currencyFormatter.format(approvedBudget)}. Outcome: ${outcomeLabel}.`)
      return true
    } catch (err) {
      console.error('[PortfolioFinanceTaskModal] saveTaskData error:', err)
      onError('Failed to record portfolio decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, ownerId, startDate, endDate, description, strategicObjective, businessUnit, priorityLevel, approvedBudget, onSuccess, onError])

  if (!open) return null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Portfolio Finance Approval</Typography>
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
            {/* Portfolio context card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Portfolio context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                {portfolio?.pm_portfolioname || 'Loading...'}
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
                        Asked Budget (From Pipeline Est. Cost)
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

                {/* Row 2: Non-editable info */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Overall RAG</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {portfolio?.pm_ragstatus != null ? (
                        <StatusTag
                          label={portfolio.pm_ragstatus === 1 ? 'Green' : portfolio.pm_ragstatus === 0 ? 'Amber' : 'Red'}
                          color={portfolio.pm_ragstatus === 1 ? 'success' : portfolio.pm_ragstatus === 0 ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Not specified</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Portfolio Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusTag label="Under Finance Review" color="info" size="small" sx={{ fontWeight: 600 }} />
                    </Box>
                  </Box>
                </Grid>

                {/* Row 3: Editable context fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Business Unit"
                    size="small"
                    value={businessUnit}
                    onChange={(e) => setBusinessUnit(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="finance-priority-label">Priority</InputLabel>
                    <Select
                      labelId="finance-priority-label"
                      label="Priority"
                      value={priorityLevel}
                      onChange={(e) => setPriorityLevel(Number(e.target.value))}
                    >
                      <MenuItem value={1}>High</MenuItem>
                      <MenuItem value={2}>Medium</MenuItem>
                      <MenuItem value={3}>Low</MenuItem>
                      <MenuItem value={4}>Very Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="finance-owner-label">Portfolio Owner</InputLabel>
                    <Select
                      labelId="finance-owner-label"
                      label="Portfolio Owner"
                      value={ownerId ? ownerId.replace(/[{}]/g, '').toLowerCase() : ''}
                      onChange={(e) => setOwnerId(e.target.value ? e.target.value.replace(/[{}]/g, '').toLowerCase() : '')}
                      renderValue={(selected) => {
                        const normSel = selected ? selected.replace(/[{}]/g, '').toLowerCase() : ''
                        const user = users.find((u) => u.systemuserid?.replace(/[{}]/g, '').toLowerCase() === normSel)
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                              {user?.fullname?.charAt(0) || '?'}
                            </Avatar>
                            {user?.fullname || 'Select Owner'}
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

            {/* Description & Objective fields */}
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

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LightbulbIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Strategic Objectives
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="Enter strategic objectives..."
                value={strategicObjective}
                onChange={(e) => setStrategicObjective(e.target.value)}
              />
            </Box>

            {/* Decision Instruction Banner */}
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
                <FactCheckIcon sx={{ fontSize: 16 }} /> After Your Decision
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                <strong>Approved:</strong> Portfolio status changes to <em>Active</em> and sets final approved budget, enabling programme creation and child resource allocations.
                <br />
                <strong>Rejected:</strong> Portfolio status set to <em>Rejected</em>. The portfolio owner will be notified with decision notes.
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
              dispatchFormDialogDecision({ formKey: 'portfolio_finance_decision', decision })
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
