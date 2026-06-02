import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Skeleton,
  Alert,
  Avatar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PersonIcon from '@mui/icons-material/Person'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import RateReviewIcon from '@mui/icons-material/RateReview'

import { useUser } from '@/context/UserContext'
import {
  fetchPendingApprovalRequests,
  fetchApprovalRequests,
  updateInitiativeStatus,
  updateApprovalRequest,
} from '@/lib/dataverseClient'
import type { InitiativeModel, ApprovalRequestModel } from '@/types/dataverse'

interface TaskGroup {
  label: string
  count: number
  icon: React.ReactNode
  color: string
}

export default function MyTasksWidget() {
  const navigateToPending = useCallback(() => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'pendingapprovals' } }))
  }, [])
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUser } = useUser()
  const [pendingApprovals, setPendingApprovals] = useState<InitiativeModel[]>([])
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: ApprovalRequestModel | null; reason: string }>({
    open: false,
    request: null,
    reason: '',
  })

  const removeRequest = useCallback((id: string) => {
    setApprovalRequests((prev) => prev.filter((r) => r.pm_projectapprovalrequestid !== id))
  }, [])

  const handleApprove = useCallback(async (req: ApprovalRequestModel) => {
    setActionLoading(req.pm_projectapprovalrequestid ?? 'approve')
    try {
      await updateApprovalRequest(req.pm_projectapprovalrequestid!, {
        pm_decisionstatus: 0 as any,
        pm_decisiondate: new Date().toISOString().split('T')[0],
      })
      // Also update the linked initiative status to Approved
      if (req.pm_entityid) {
        await updateInitiativeStatus(req.pm_entityid, 0)
      }
      if (req.pm_projectapprovalrequestid) {
        removeRequest(req.pm_projectapprovalrequestid)
      }
    } catch {
      setError('Unable to approve request.')
    } finally {
      setActionLoading(null)
    }
  }, [removeRequest])

  const handleReject = useCallback(async () => {
    const req = rejectDialog.request
    if (!req?.pm_projectapprovalrequestid) return
    setActionLoading(req.pm_projectapprovalrequestid)
    try {
      await updateApprovalRequest(req.pm_projectapprovalrequestid, {
        pm_decisionstatus: 2 as any,
        pm_decisiondate: new Date().toISOString().split('T')[0],
        pm_decisionnotes: rejectDialog.reason || undefined,
      })
      // Also update the linked initiative status to Rejected
      if (req.pm_entityid) {
        await updateInitiativeStatus(req.pm_entityid, 3)
      }
      removeRequest(req.pm_projectapprovalrequestid)
      setRejectDialog({ open: false, request: null, reason: '' })
    } catch {
      setError('Unable to reject request.')
    } finally {
      setActionLoading(null)
    }
  }, [rejectDialog, removeRequest])

  useEffect(() => {
    if (!currentUser?.fullname) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      fetchPendingApprovalRequests(),
      fetchApprovalRequests(),
    ])
      .then(([initiativesResult, requestsResult]) => {
        setPendingApprovals(initiativesResult)
        setApprovalRequests(requestsResult)
      })
      .catch(() => setError('Unable to load task data.'))
      .finally(() => setLoading(false))
  }, [currentUser?.fullname])

  const myInitiatives = useMemo(() => {
    if (!currentUser?.fullname) return []
    const name = currentUser.fullname.toLowerCase()
    return pendingApprovals.filter(
      (i) => i.pm_requestorname?.toLowerCase() === name
    )
  }, [pendingApprovals, currentUser?.fullname])

  const myApprovalRequests = useMemo(() => {
    if (!currentUser?.fullname) return []
    const name = currentUser.fullname.toLowerCase()
    return approvalRequests.filter(
      (r) =>
        r.pm_approvername?.toLowerCase() === name &&
        String(r.pm_decisionstatus ?? '') === '1'
    )
  }, [approvalRequests, currentUser?.fullname])

  const totalTasks = myInitiatives.length + myApprovalRequests.length

  const taskGroups: TaskGroup[] = [
    {
      label: 'Initiatives pending review',
      count: myInitiatives.length,
      icon: <LightbulbIcon sx={{ fontSize: 14 }} />,
      color: '#f59e0b',
    },
    {
      label: 'Approvals awaiting decision',
      count: myApprovalRequests.length,
      icon: <ScheduleIcon sx={{ fontSize: 14 }} />,
      color: '#6366f1',
    },
  ]

  if (!currentUser) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">No user selected</Typography>
          <Typography variant="caption" color="text.disabled">Use the user selector in the top bar to switch users</Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon sx={{ color: '#6366f1' }} />
            My Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tasks requiring your attention
          </Typography>
        </Box>
        <Chip
          avatar={
            <Avatar sx={{ bgcolor: totalTasks > 0 ? '#ef4444' : '#22c55e', width: 22, height: 22, fontSize: 11 }}>
              {totalTasks}
            </Avatar>
          }
          label={totalTasks === 1 ? '1 task' : `${totalTasks} tasks`}
          color={totalTasks > 0 ? 'error' : 'success'}
          size="small"
          variant="filled"
          sx={{ fontWeight: 700, borderRadius: 8 }}
        />
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : totalTasks === 0 ? (
        /* Empty state */
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>All clear!</Typography>
          <Typography variant="body2" color="text.secondary">
            No pending tasks for {currentUser.fullname?.split(' ')[0]}
          </Typography>
        </Box>
      ) : (
        /* Task groups summary */
        <>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            {taskGroups.map((group) =>
              group.count > 0 ? (
                <Paper
                  key={group.label}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 2,
                    textAlign: 'center',
                    borderLeft: `3px solid ${group.color}`,
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: group.color }}>
                    {group.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {group.icon}
                    {group.label}
                  </Typography>
                </Paper>
              ) : null
            )}
          </Box>

          {/* Task list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Initiatives needing approval */}
            {myInitiatives.slice(0, 3).map((initiative) => (
              <Paper
                key={initiative.pm_initiativeid}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderLeft: '3px solid #f59e0b',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: isDark ? '#1e293b' : '#f8fafc' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                      {initiative.pm_name || 'Untitled Initiative'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<LightbulbIcon sx={{ fontSize: 13 }} />}
                        label="Pending Review"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderRadius: 8, height: 22, fontSize: 11 }}
                      />
                      {initiative.pm_portfolioname && (
                        <Typography variant="caption" color="text.secondary">
                          {initiative.pm_portfolioname}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <HourglassEmptyIcon sx={{ fontSize: 20, color: '#f59e0b', flexShrink: 0 }} />
                </Box>
              </Paper>
            ))}

            {/* Approval requests pending decision */}
            {myApprovalRequests.slice(0, 3).map((req) => (
              <Paper
                key={req.pm_projectapprovalrequestid}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderLeft: '3px solid #6366f1',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: isDark ? '#1e293b' : '#f8fafc' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                      {req.pm_requesttitle || 'Untitled Request'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<ScheduleIcon sx={{ fontSize: 13 }} />}
                        label="Awaiting Decision"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderRadius: 8, height: 22, fontSize: 11 }}
                      />
                      {req.pm_entitytypename && (
                        <Chip
                          label={req.pm_entitytypename}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, borderRadius: 8, height: 22, fontSize: 11 }}
                        />
                      )}
                    </Box>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 20, color: '#6366f1', flexShrink: 0 }} />
                </Box>
                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={actionLoading === req.pm_projectapprovalrequestid}
                    onClick={() => handleApprove(req)}
                    startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 12, py: 0.5 }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={actionLoading === req.pm_projectapprovalrequestid}
                    onClick={() => setRejectDialog({ open: true, request: req, reason: '' })}
                    startIcon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />}
                    sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 12, py: 0.5 }}
                  >
                    Reject
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>

          {/* More tasks indicator */}
          {/* View all approvals button */}
          {totalTasks > 0 && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={navigateToPending}
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
              >
                View all {totalTasks} tasks
              </Button>
            </Box>
          )}

          {myInitiatives.length + myApprovalRequests.length > 6 && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
              >
                View all {totalTasks} tasks
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => !actionLoading && setRejectDialog({ open: false, request: null, reason: '' })}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejecting <strong>{rejectDialog.request?.pm_requesttitle}</strong>.
          </Typography>
          <TextField
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Optional: explain why this request is being rejected..."
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => setRejectDialog({ open: false, request: null, reason: '' })}
            variant="outlined"
            disabled={!!actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={!!actionLoading}
            startIcon={actionLoading ? undefined : <CancelOutlinedIcon />}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {actionLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
