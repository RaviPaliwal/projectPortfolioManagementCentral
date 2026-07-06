import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Skeleton,
  Alert,
  useTheme,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PersonIcon from '@mui/icons-material/Person'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import { useUser } from '@/context/UserContext'
import { StatusTag } from '@/components/common'
import {
  fetchPendingApprovalRequests,
  fetchApprovalRequests,
} from '@/services'
import type { InitiativeModel, ApprovalRequestModel } from '@/types/dataverse'

interface TaskGroup {
  label: string
  count: number
  icon: React.ReactNode
  color: string
}

export default function MyTasksWidget() {
  const navigateToPending = useCallback(() => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'tasks' } }))
  }, [])
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUser } = useUser()
  const [pendingApprovals, setPendingApprovals] = useState<InitiativeModel[]>([])
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      (i) => i.pm_requestedbyname?.toLowerCase() === name
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
      <Paper sx={{ p: 3, borderRadius: 1.15 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">No user selected</Typography>
          <Typography variant="caption" color="text.disabled">Use the user selector in the top bar to switch users</Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 1.15 }}>
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
        <StatusTag
          label={totalTasks === 1 ? '1 task' : `${totalTasks} tasks`}
          color={totalTasks > 0 ? 'error' : 'success'}
          size="small"
          variant="filled"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.15 }}>{error}</Alert>}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 1.15 }} />
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
                    borderRadius: 1.15,
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
                  borderRadius: 1.15,
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
                      <StatusTag
                        icon={<LightbulbIcon sx={{ fontSize: 13 }} />}
                        label="Pending Review"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
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
                  borderRadius: 1.15,
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
                      <StatusTag
                        icon={<ScheduleIcon sx={{ fontSize: 13 }} />}
                        label="Awaiting Decision"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                      />
                      {req.pm_entitytypename && (
                        <StatusTag
                          label={req.pm_entitytypename}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                        />
                      )}
                    </Box>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 20, color: '#6366f1', flexShrink: 0 }} />
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
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 1.15 }}
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
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 1.15 }}
              >
                View all {totalTasks} tasks
              </Button>
            </Box>
          )}
        </>
      )}

    </Paper>
  )
}
