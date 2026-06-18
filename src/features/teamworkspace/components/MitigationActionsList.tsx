import { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  InputAdornment,
  LinearProgress,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import { fontSizes } from '@/styles'
import { StatusTag, Button } from '@/components/common'
import type { RiskMitigationActionModel } from '@/types/dataverse'

const ACTION_STATUS_LABELS: Record<string, string> = {
  '0': 'Pending',
  '1': 'In Progress',
  '2': 'On Hold',
  '3': 'Completed',
  '4': 'Cancelled',
}

const ACTION_STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  '0': 'default',
  '1': 'info',
  '2': 'warning',
  '3': 'success',
  '4': 'error',
}

const ACTION_STATUS_ICONS: Record<string, React.ReactNode> = {
  '0': <HourglassEmptyIcon sx={{ fontSize: 14 }} />,
  '1': <PlayArrowIcon sx={{ fontSize: 14 }} />,
  '2': <PauseCircleIcon sx={{ fontSize: 14 }} />,
  '3': <CheckCircleIcon sx={{ fontSize: 14 }} />,
}

interface MitigationActionsListProps {
  actions: RiskMitigationActionModel[]
  loading: boolean
  onUpdateAction: (action: RiskMitigationActionModel) => void
}

export const MitigationActionsList = ({
  actions,
  loading,
  onUpdateAction,
}: MitigationActionsListProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const title = (action.pm_actiontitle || '').toLowerCase()
        const desc = (action.pm_actiondescription || '').toLowerCase()
        if (!title.includes(q) && !desc.includes(q)) return false
      }
      if (statusFilter && String(action.pm_status ?? '') !== statusFilter) return false
      return true
    })
  }, [actions, searchQuery, statusFilter])

  const hasActiveFilters = searchQuery || statusFilter
  const inProgressCount = actions.filter(a => String(a.pm_status ?? '') === '1').length
  const completedCount = actions.filter(a => String(a.pm_status ?? '') === '3').length
  const completionPercent = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
              My Mitigation Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {actions.length} action{actions.length !== 1 ? 's' : ''} assigned to you
            </Typography>
          </Box>
        </Box>

        {/* Progress summary */}
        {actions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Overall Progress
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {completedCount}/{actions.length} completed ({completionPercent}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercent}
              sx={{
                height: 6,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: completionPercent === 100 ? 'success.main' : 'secondary.main',
                  transition: 'width 0.5s ease',
                },
              }}
            />
          </Box>
        )}

        {/* Search & Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by title or description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: fontSizes.base },
              },
            }}
            sx={{ flex: '1 1 240px', maxWidth: 360 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {Object.entries(ACTION_STATUS_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          {hasActiveFilters && (
            <Button size="small" variant="text" onClick={clearFilters} sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}>
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map(i => (
              <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ width: '50%', height: 14, bgcolor: 'action.hover', mb: 1 }} />
                <Box sx={{ width: '100%', height: 6, bgcolor: 'action.hover' }} />
              </Paper>
            ))}
          </Box>
        ) : filteredActions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5, opacity: 0.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
              {hasActiveFilters ? 'No actions match your filters' : 'No mitigation actions assigned'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Mitigation actions will appear here once assigned by a Project Manager.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredActions.map(action => {
              const status = String(action.pm_status ?? '')
              const isOverdue = action.pm_duedate &&
                status !== '3' &&
                new Date(action.pm_duedate) < new Date()
              const isCompleted = status === '3'

              return (
                <Paper
                  key={action.pm_riskmitigationactionid}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderLeft: '4px solid',
                    borderLeftColor: isCompleted
                      ? 'success.main'
                      : isOverdue
                        ? 'error.main'
                        : status === '0'
                          ? 'text.disabled'
                          : `${ACTION_STATUS_COLORS[status] || 'primary'}.main`,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                        {action.pm_actiontitle || 'Untitled Action'}
                      </Typography>
                      {action.pm_actiondescription && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {action.pm_actiondescription}
                        </Typography>
                      )}
                    </Box>

                    {/* Progress indicator */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <StatusTag
                        label={ACTION_STATUS_LABELS[status] || '—'}
                        variant={isCompleted ? 'filled' : 'subtle'}
                        icon={ACTION_STATUS_ICONS[status]}
                        color={ACTION_STATUS_COLORS[status] || 'default'}
                        sx={{
                          fontSize: fontSizes.xs,
                        }}
                      />
                      {!isCompleted && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => onUpdateAction(action)}
                          sx={{
                            fontWeight: 600,
                            fontSize: 11,
                            py: 0.5,
                            minWidth: 80,
                          }}
                        >
                          Update
                        </Button>
                      )}
                    </Box>
                  </Box>

                  {/* Progress bar */}
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={isCompleted ? 100 : status === '1' ? 50 : status === '2' ? 75 : 10}
                      sx={{
                        height: 5,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isCompleted
                            ? 'success.main'
                            : isOverdue
                              ? 'error.main'
                              : 'secondary.main',
                        },
                      }}
                    />
                  </Box>

                  {/* Meta info */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {action.pm_actionowner && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {action.pm_actionowner}
                        </Typography>
                      </Box>
                    )}
                    {action.pm_duedate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 13, color: isOverdue ? 'error.main' : 'text.disabled' }} />
                        <Typography
                          variant="caption"
                          color={isOverdue ? 'error.main' : 'text.secondary'}
                          sx={{ fontWeight: isOverdue ? 700 : 400 }}
                        >
                          Due: {new Date(action.pm_duedate).toLocaleDateString()}
                          {isOverdue ? ' (Overdue)' : ''}
                        </Typography>
                      </Box>
                    )}
                    {action.pm_riskidentifier && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }}>
                          Risk: {action.pm_riskidentifier}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              )
            })}
          </Box>
        )}
      </Box>
    </Paper>
  )
}

export default MitigationActionsList
