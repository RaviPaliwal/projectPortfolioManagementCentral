/**
 * TaskLink Component
 *
 * A reusable link/button component that resolves a workflow approval step ID
 * to its configured form (via formRegistry + formKey) and provides a clickable
 * action to open that form with the correct entity context.
 *
 * Can be used anywhere in the app by passing an approval step ID.
 *
 * Usage:
 *   <TaskLink stepId="..." variant="button" />
 *   <TaskLink stepId="..." variant="link" label="Review Gate" />
 *
 * With custom render:
 *   <TaskLink stepId="...">
 *     {({ loading, task, error }) => (
 *       <Button onClick={task.navigate} disabled={loading}>
 *         {loading ? 'Loading...' : 'Open Task'}
 *       </Button>
 *     )}
 *   </TaskLink>
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Button,
  Link,
  Typography,
  Chip,
  Tooltip,
  CircularProgress,
  type ButtonProps,
  type LinkProps,
  Box,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AssignmentIcon from '@mui/icons-material/Assignment'
import LockIcon from '@mui/icons-material/Lock'
import type { ResolvedTaskInfo } from '@/services/task-resolver.service'
import { resolveApprovalStepTask } from '@/services/task-resolver.service'
import { useUser } from '@/context/UserContext'

// ─── Props ────────────────────────────────────────────────────────────

export interface TaskLinkProps {
  /** The workflow approval step ID to resolve and open */
  stepId: string
  /** Visual variant: 'button' (default), 'link', 'chip', or 'icon' */
  variant?: 'button' | 'link' | 'chip' | 'icon'
  /** Custom label (default: "Open Task" or the form display name) */
  label?: string
  /** Optional callback when the form is opened */
  onOpened?: (task: ResolvedTaskInfo) => void
  /** Optional callback when resolution fails */
  onError?: (error: string) => void
  /** Render prop for fully custom rendering */
  children?: (state: TaskLinkRenderState) => React.ReactNode
  /** Additional props forwarded to Button when variant="button" */
  buttonProps?: Partial<ButtonProps>
  /** Additional props forwarded to Link when variant="link" */
  linkProps?: Partial<LinkProps>
}

export interface TaskLinkRenderState {
  /** Whether the task info is still being resolved */
  loading: boolean
  /** The resolved task info, or null if not yet resolved / failed */
  task: ResolvedTaskInfo | null
  /** Error message if resolution failed */
  error: string | null
}

// ─── Cache ────────────────────────────────────────────────────────────

/** Simple in-memory cache to avoid re-resolving the same step ID */
const taskCache = new Map<string, ResolvedTaskInfo>()

function getCachedTask(stepId: string): ResolvedTaskInfo | undefined {
  return taskCache.get(stepId)
}

function setCachedTask(stepId: string, task: ResolvedTaskInfo): void {
  taskCache.set(stepId, task)
  // Limit cache size to 50 entries
  if (taskCache.size > 50) {
    const firstKey = taskCache.keys().next().value
    if (firstKey) taskCache.delete(firstKey)
  }
}

// ─── Component ────────────────────────────────────────────────────────

export function TaskLink({
  stepId,
  variant = 'button',
  label,
  onOpened,
  onError,
  children,
  buttonProps,
  linkProps,
}: TaskLinkProps) {
  const { currentUser } = useUser()
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<ResolvedTaskInfo | null>(() => getCachedTask(stepId) ?? null)
  const [error, setError] = useState<string | null>(null)

  // Resolve the task info if not cached
  useEffect(() => {
    if (task) return // Already cached

    let cancelled = false
    setLoading(true)
    setError(null)

    resolveApprovalStepTask(stepId).then((resolved) => {
      if (cancelled) return
      setLoading(false)
      if (resolved) {
        setCachedTask(stepId, resolved)
        setTask(resolved)
      } else {
        const errMsg = 'Unable to resolve task for approval step ' + stepId.substring(0, 8) + '...'
        setError(errMsg)
        onError?.(errMsg)
      }
    })

    return () => {
      cancelled = true
    }
  }, [stepId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check if the task is assigned to the current user
  const isAssignedToCurrentUser = useCallback(() => {
    if (!currentUser || !task?.step) return true // No user context — show by default
    const assigneeDisplay = task.step.pm_assigneedisplayname || ''
    const assigneeName = task.step.pm_approvername || ''
    const userId = (currentUser.systemuserid || '').toLowerCase()
    const userName = (currentUser.fullname || '').toLowerCase()

    // Team assignment (pm_assigneetype: 1) — always show to anyone
    if (String(task.step.pm_assigneetype) === '1') return true

    // User assignment — check if assignee matches current user
    if (assigneeDisplay.toLowerCase() === userId) return true
    if (assigneeDisplay.toLowerCase() === userName) return true
    if (assigneeName.toLowerCase() === userId) return true
    if (assigneeName.toLowerCase() === userName) return true

    return false
  }, [currentUser, task])

  const isAuthorized = isAssignedToCurrentUser()

  // Open handler
  const handleOpen = useCallback(() => {
    if (task && isAuthorized) {
      task.navigate()
      onOpened?.(task)
    }
  }, [task, isAuthorized, onOpened])

  // Render prop mode
  if (children) {
    return <>{children({ loading, task, error })}</>
  }

  // Loading state
  if (loading) {
    switch (variant) {
      case 'icon':
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1 }}>
            <CircularProgress size={18} />
          </Box>
        )
      case 'chip':
        return <Chip label="Loading..." size="small" variant="outlined" sx={{ borderRadius: 1 }} />
      case 'link':
        return (
          <Typography variant="caption" color="text.disabled">
            Resolving task...
          </Typography>
        )
      default:
        return (
          <Button
            size="small"
            disabled
            startIcon={<CircularProgress size={14} />}
            sx={{ borderRadius: 1.5 }}
            {...buttonProps}
          >
            Loading...
          </Button>
        )
    }
  }

  // Error state
  if (error || !task) {
    switch (variant) {
      case 'icon':
        return null
      case 'chip':
        return (
          <Tooltip title={error || 'Task unavailable'}>
            <Chip label="Unavailable" size="small" color="error" variant="outlined" sx={{ borderRadius: 1 }} />
          </Tooltip>
        )
      default:
        return (
          <Tooltip title={error || 'Unable to resolve this task'}>
            <span>
              <Button size="small" disabled sx={{ borderRadius: 1.5 }} {...buttonProps}>
                Unavailable
              </Button>
            </span>
          </Tooltip>
        )
    }
  }

  // Not authorized — show locked/unavailable state
  if (!isAuthorized) {
    switch (variant) {
      case 'icon':
        return null
      case 'chip':
        return (
          <Tooltip title="Not assigned to you">
            <Chip
              icon={<LockIcon sx={{ fontSize: 14 }} />}
              label="Not assigned"
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1, color: 'text.disabled', borderColor: 'divider' }}
            />
          </Tooltip>
        )
      case 'link':
        return (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <LockIcon sx={{ fontSize: 13 }} />
            Not assigned
          </Typography>
        )
      default:
        return (
          <Tooltip title="This task is assigned to another user">
            <span>
              <Button
                size="small"
                disabled
                startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: 1.5, fontSize: 11, py: 0.5, minWidth: 90 }}
                {...buttonProps}
              >
                Not assigned
              </Button>
            </span>
          </Tooltip>
        )
    }
  }

  // Resolved & authorized — render the appropriate variant
  const displayLabel = label || task.formDisplayName || 'Open Task'
  const tooltip = task.formEntry?.description || `Open ${task.formDisplayName || 'form'} for this approval step`

  switch (variant) {
    case 'icon':
      return (
        <Tooltip title={tooltip}>
          <Button
            size="small"
            variant="text"
            onClick={handleOpen}
            sx={{
              minWidth: 32,
              borderRadius: 1.5,
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
            {...buttonProps}
          >
            <OpenInNewIcon sx={{ fontSize: 18 }} />
          </Button>
        </Tooltip>
      )

    case 'chip':
      return (
        <Tooltip title={tooltip}>
          <Chip
            icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            label={displayLabel}
            size="small"
            color="primary"
            variant="outlined"
            onClick={handleOpen}
            sx={{
              borderRadius: 1,
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          />
        </Tooltip>
      )

    case 'link':
      return (
        <Link
          component="button"
          variant="body2"
          onClick={handleOpen}
          underline="hover"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            fontWeight: 600,
            color: 'primary.main',
            '&:hover': { color: 'primary.dark' },
          }}
          {...linkProps}
        >
          <OpenInNewIcon sx={{ fontSize: 14 }} />
          {displayLabel}
        </Link>
      )

    default: // button
      return (
        <Tooltip title={tooltip}>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<AssignmentIcon />}
            endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            onClick={handleOpen}
            sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: 11, py: 0.5, minWidth: 90 }}
            {...buttonProps}
          >
            {displayLabel}
          </Button>
        </Tooltip>
      )
  }
}

export default TaskLink
