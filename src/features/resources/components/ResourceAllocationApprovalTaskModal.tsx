import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import WorkIcon from '@mui/icons-material/Work'
import PersonIcon from '@mui/icons-material/Person'
import DateRangeIcon from '@mui/icons-material/DateRange'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PercentIcon from '@mui/icons-material/Percent'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import BusinessIcon from '@mui/icons-material/Business'
import { fetchResourceAllocationById } from '@/services/resource.service'
import type { ResourceAllocationModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

interface ResourceAllocationApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  allocationId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

export const ResourceAllocationApprovalTaskModal: React.FC<ResourceAllocationApprovalTaskModalProps> = ({
  open, onClose, allocationId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allocation, setAllocation] = useState<ResourceAllocationModel | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const alloc = await fetchResourceAllocationById(allocationId)
      if (!alloc) { onError('Resource allocation not found.'); setLoading(false); return }
      setAllocation(alloc)
    } catch (err) {
      console.error('Failed to load resource allocation', err)
      onError('Failed to load allocation details.')
    } finally { setLoading(false) }
  }, [allocationId, onError])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  if (!open) return null

  const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'secondary.main', color: 'secondary.contrastText', py: 1.5, pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssignmentIndIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Resource Allocation Review</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Pending Review" color="warning" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Grid container sx={{ height: '100%' }}>
            {/* Left Column - Allocation Context */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Allocation Context</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
                {allocation?.pm_assignmentrole || 'Resource Assignment'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Resource</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14 }} />
                    {allocation?._pm_resource_value || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 14 }} />
                    {allocation?._pm_project_value || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Assignment Role</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WorkIcon sx={{ fontSize: 14 }} />
                    {allocation?.pm_assignmentrole || 'Unspecified'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={String(allocation?.pm_assignmentstatus) === '0' ? 'Active' : 'Inactive'}
                      color={String(allocation?.pm_assignmentstatus) === '0' ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Period</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DateRangeIcon sx={{ fontSize: 14 }} />
                    {allocation?.pm_startdate ? dateFormatter.format(new Date(allocation.pm_startdate)) : '—'}
                    {' → '}
                    {allocation?.pm_enddate ? dateFormatter.format(new Date(allocation.pm_enddate)) : '—'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 4, p: 2, bgcolor: 'secondary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'secondary.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChecklistRtlIcon sx={{ fontSize: 16 }} /> Review Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Review the resource allocation details — verify the assigned hours, role, and project alignment before approving or rejecting the allocation.
                </Typography>
              </Box>
            </Grid>

            {/* Right Column - Allocation Details */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} /> Allocation Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Allocated Hours</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    {allocation?.pm_allocatedhours ?? 0}h
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Allocation %</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PercentIcon sx={{ fontSize: 14 }} />
                    {allocation?.pm_allocationpercentage ?? 0}%
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusTag
                      label={String(allocation?.pm_assignmentstatus) === '0' ? 'Active' : 'Inactive'}
                      color={String(allocation?.pm_assignmentstatus) === '0' ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Paper>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DateRangeIcon sx={{ fontSize: 16 }} /> Assignment Period
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Start Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {allocation?.pm_startdate ? dateFormatter.format(new Date(allocation.pm_startdate)) : '—'}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">End Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {allocation?.pm_enddate ? dateFormatter.format(new Date(allocation.pm_enddate)) : '—'}
                  </Typography>
                </Paper>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WorkIcon sx={{ fontSize: 16 }} /> Assignment Details
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Role</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{allocation?.pm_assignmentrole || 'Unspecified'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Hours</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                      {allocation?.pm_allocatedhours ?? 0}h
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Allocation %</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{allocation?.pm_allocationpercentage ?? 0}%</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Status</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {String(allocation?.pm_assignmentstatus) === '0' ? 'Active' : 'Inactive'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1.5, border: '1px solid', borderColor: 'success.100' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16 }} /> Resource Note
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                  This allocation will be visible in the resource's schedule and demand forecasting once approved.
                  The allocated percentage will be reflected in capacity utilization reports.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {DecisionBoxProp && approvalStepId && (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={async (decision) => {
              setSaving(true)
              try {
                const decisionLabel = decision === 0 ? 'Approved' : 'Rejected'
                onSuccess('Resource allocation review completed. Decision: ' + decisionLabel + '.')
                return true
              } catch (err) {
                onError('Failed to save review decision.')
                return false
              } finally { setSaving(false) }
            }}
            onDecisionComplete={() => onClose()}
            onDecisionError={(msg) => onError(msg)}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  )
}
