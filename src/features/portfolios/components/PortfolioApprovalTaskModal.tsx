import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  Button, IconButton, CircularProgress, Chip, Paper, TextField, Avatar,
  Select, MenuItem, FormControl, InputLabel, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import DescriptionIcon from '@mui/icons-material/Description'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { fetchPortfolioHierarchy, updatePortfolioStatus, updatePortfolio } from '@/services/portfolio.service'
import { fetchSystemUsers } from '@/services/team.service'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import type { PortfolioModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { currencyFormatter } from '@/utils/formatters'
import { useUser } from '@/context/UserContext'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { alpha } from '@mui/material/styles'

interface PortfolioApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  entityId?: string | null
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

const PORTFOLIO_STATUS_MAP: Record<number, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  0: { label: 'Active', color: 'success' },
  1: { label: 'Under Approval', color: 'warning' },
  2: { label: 'Rejected', color: 'error' },
}

export const PortfolioApprovalTaskModal: React.FC<PortfolioApprovalTaskModalProps> = ({
  open, onClose, entityId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const theme = useTheme()
  const { users: contextUsers } = useUser()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [portfolio, setPortfolio] = useState<PortfolioModel | null>(null)

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
      const [hierarchy, directUsers] = await Promise.all([
        fetchPortfolioHierarchy(),
        (!contextUsers || contextUsers.length === 0) ? fetchSystemUsers() : Promise.resolve(null)
      ])
      
      if (directUsers) {
        setUsers(directUsers)
      }

      const found = hierarchy.portfolios.find(p => p.pm_portfolioid === entityId)
      if (!found) { onError('Portfolio not found.'); setLoading(false); return }
      setPortfolio(found)
      
      // Initialize form fields
      setOwnerId(found.pm_ownerlookup ? found.pm_ownerlookup.replace(/[{}]/g, '').toLowerCase() : '')
      setStartDate(found.pm_startdate ? found.pm_startdate.split('T')[0] : '')
      setEndDate(found.pm_enddate ? found.pm_enddate.split('T')[0] : '')
      setDescription(found.pm_portfoliodescription || '')
      setStrategicObjective(found.pm_strategicobjective || '')
      setBusinessUnit(found.pm_businessunit || '')
      setPriorityLevel(found.pm_prioritylevel != null ? Number(found.pm_prioritylevel) : 2)
    } catch (err) {
      console.error('Failed to load portfolio', err)
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

      // Save all updated details and the target status to Dataverse in a single update call
      await updatePortfolio(entityId, {
        pm_ownerlookup: ownerId || undefined,
        pm_startdate: startDate || undefined,
        pm_enddate: endDate || undefined,
        pm_portfoliodescription: description || undefined,
        pm_strategicobjective: strategicObjective || undefined,
        pm_businessunit: businessUnit || undefined,
        pm_prioritylevel: priorityLevel,
        pm_portfoliostatus: targetStatus,
      })

      const outcomeLabel = workflowDecision === 0 ? 'Approved' : 'Rejected'
      onSuccess('Portfolio Approval completed. Outcome: ' + outcomeLabel + '.')
      return true
    } catch (err) {
      console.error('[PortfolioApprovalTaskModal] saveTaskData error:', err)
      onError('Failed to record portfolio decision.')
      return false
    } finally { setSaving(false) }
  }, [entityId, ownerId, startDate, endDate, description, strategicObjective, businessUnit, priorityLevel, onSuccess, onError])

  if (!open) return null

  const currentStatus = portfolio?.pm_portfoliostatus != null ? PORTFOLIO_STATUS_MAP[Number(portfolio.pm_portfoliostatus)] : null

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', py: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Portfolio Approval</Typography>
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
            {/* Portfolio Context details Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                Portfolio Context
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                {portfolio?.pm_portfolioname || 'Loading...'}
              </Typography>

              <Grid container spacing={2.5}>
                {/* Row 1: Non-editable fields */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Approved Budget</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {portfolio?.pm_approvedbudgeteur != null ? currencyFormatter.format(portfolio.pm_approvedbudgeteur) : '—'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
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

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Portfolio Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {currentStatus ? (
                        <StatusTag label={currentStatus.label} color={currentStatus.color} size="small" sx={{ fontWeight: 600 }} />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Not specified</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Row 2: Editable fields */}
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
                    <InputLabel id="approve-priority-label">Priority</InputLabel>
                    <Select
                      labelId="approve-priority-label"
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
                    <InputLabel id="approve-owner-label">Portfolio Owner</InputLabel>
                    <Select
                      labelId="approve-owner-label"
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

                {/* Row 3: Editable fields */}
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

                <Grid size={{ xs: 12, sm: 4 }}>
                  {/* Spacer */}
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

            {/* Strategic Objective */}
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
                <strong>Approved:</strong> Portfolio status changes to <em>Active</em>, enabling programme creation and budget allocation.
                <br />
                <strong>Rejected:</strong> Portfolio status set to <em>Rejected</em>. The portfolio owner will be notified with the decision notes.
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
              dispatchFormDialogDecision({ formKey: 'portfolio_approval', decision })
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
