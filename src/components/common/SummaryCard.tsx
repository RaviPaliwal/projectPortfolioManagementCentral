import { Card, CardContent, Typography, Box, LinearProgress, useTheme } from '@mui/material'
import { type ReactNode } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { StatusTag } from './StatusTag/StatusTag'

// ─── StatusChip ────────────────────────────────────────────────────────────
export interface StatusChipProps {
  status?: string | number | null
  type?: 'rag' | 'phase' | 'prog_phase'
  size?: 'small' | 'medium'
}

const RAG_CONFIG: Record<string, { color: string; icon: React.ReactElement; label: string }> = {
  '1': { color: 'success', icon: <CheckCircleIcon />, label: 'Low' },
  '0': { color: 'warning', icon: <WarningAmberIcon />, label: 'Medium' },
  '2': { color: 'error', icon: <ErrorIcon />, label: 'High' },
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  '0': { label: 'Execution', color: 'primary' },
  '1': { label: 'Planning', color: 'info' },
  '2': { label: 'Closure', color: 'secondary' },
  '3': { label: 'Initiation', color: 'warning' },
  '4': { label: 'Rejected', color: 'error' },
  '5': { label: 'Completed', color: 'success' },
}

const PROG_PHASE_LABELS: Record<string, { label: string; color: string }> = {
  '0': { label: 'Delivery', color: 'primary' },
  '1': { label: 'Planning', color: 'info' },
  '2': { label: 'Initiation', color: 'secondary' },
  '3': { label: 'Under Approval', color: 'warning' },
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, type = 'rag', size = 'small' }) => {
  const statusStr = status?.toString() ?? ''

  if (type === 'rag') {
    const cfg = RAG_CONFIG[statusStr] ?? { color: 'default', icon: <VisibilityIcon />, label: 'Not Set' }
    return (
      <StatusTag
        icon={cfg.icon}
        label={cfg.label}
        color={cfg.color}
        size={size}
      />
    )
  }

  if (type === 'prog_phase') {
    const cfg = PROG_PHASE_LABELS[statusStr] ?? { label: 'Unknown', color: 'default' }
    return <StatusTag label={cfg.label} size={size} color={cfg.color} />
  }

  const cfg = PHASE_LABELS[statusStr] ?? { label: 'Unknown', color: 'default' }
  return <StatusTag label={cfg.label} size={size} color={cfg.color} />
}

// ─── SummaryCard ────────────────────────────────────────────────────────────
export interface SummaryCardProps {
  title: string
  subtitle?: string
  status?: 'active' | 'completed' | 'onhold' | 'delayed'
  progress?: number
  metrics?: Array<{ label: string; value: string | number; icon?: ReactNode }>
  children?: ReactNode
  onClick?: () => void
  elevation?: number
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  subtitle,
  status,
  progress,
  metrics,
  children,
  onClick,
}) => {
  const theme = useTheme()

  const statusColors: Record<string, any> = {
    active: 'success',
    completed: 'primary',
    onhold: 'warning',
    delayed: 'error',
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(12px)',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(30, 41, 59, 0.75)' 
          : 'rgba(255, 255, 255, 0.85)',
        border: `1px solid ${
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
        }`,
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
            : '0 20px 25px -5px rgba(99, 102, 241, 0.15), 0 10px 10px -5px rgba(99, 102, 241, 0.1)',
        },
        height: '100%',
      }}
    >
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
          {status && (
            <Box sx={{ mt: 1 }}>
              <StatusTag
                label={status}
                size="small"
                color={statusColors[status]}
                variant="outlined"
              />
            </Box>
          )}
        </Box>

        {progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Progress</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{progress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 1.15,
                backgroundColor: theme.palette.mode === 'light' ? '#e0e0e0' : '#424242',
                '& .MuiLinearProgress-bar': { borderRadius: 1.15 },
              }}
            />
          </Box>
        )}

        {metrics && metrics.length > 0 && (
          <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {metrics.map((metric, index) => (
              <Box key={index}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 0.25 }}>
                  {metric.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {metric.icon && metric.icon}
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {metric.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {children}
      </CardContent>
    </Card>
  )
}

// ─── ProjectTaskMilestoneView ──────────────────────────────────────────────
export interface Task {
  id?: string
  name?: string
  assignedTo?: string
  percentComplete?: number
  plannedStart?: string
  plannedEnd?: string
}

export interface Milestone {
  id?: string
  name?: string
  type?: string | number
  plannedDate?: string
}

export interface ProjectDetailViewProps {
  projectName?: string
  projectCode?: string
  manager?: string
  ragStatus?: string | number | null
  phase?: string | number | null
  portfolioName?: string
  programmeName?: string
  tasks?: Task[]
  milestones?: Milestone[]
  budget?: number
  actualCost?: number
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectName,
  projectCode,
  manager,
  ragStatus,
  phase,
  portfolioName,
  programmeName,
  tasks = [],
  milestones = [],
  budget,
  actualCost,
}) => {
  const theme = useTheme()
  const completedTasks = tasks.filter((t) => (t.percentComplete ?? 0) >= 100).length
  const overallProgress = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + (t.percentComplete ?? 0), 0) / tasks.length) : 0
  return (
    <Box>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{projectName || 'Untitled Project'}</Typography>
          {projectCode && <Typography variant="body2" color="text.secondary">Code: {projectCode}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <StatusChip status={ragStatus} type="rag" />
          <StatusChip status={phase} type="phase" />
        </Box>
      </Box>

      {/* Info chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {manager && <StatusTag icon={<VisibilityIcon sx={{ fontSize: 14 }} />} label={manager} size="small" variant="outlined" />}
        {portfolioName && <StatusTag label={`Portfolio: ${portfolioName}`} size="small" variant="outlined" color="primary" />}
        {programmeName && <StatusTag label={`Programme: ${programmeName}`} size="small" variant="outlined" color="secondary" />}
      </Box>

      {/* Metrics grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 2 }}>
        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.15 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{tasks.length}</Typography>
          <Typography variant="caption" color="text.secondary">Total Tasks</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.15 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{completedTasks}</Typography>
          <Typography variant="caption" color="text.secondary">Completed</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.15 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>{milestones.length}</Typography>
          <Typography variant="caption" color="text.secondary">Milestones</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.15 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>{overallProgress}%</Typography>
          <Typography variant="caption" color="text.secondary">Progress</Typography>
        </Box>
      </Box>

      {/* Budget info */}
      {(budget !== undefined || actualCost !== undefined) && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {budget !== undefined && (
            <Typography variant="body2">
              Budget: <strong>${budget.toLocaleString()}</strong>
            </Typography>
          )}
          {actualCost !== undefined && (
            <Typography variant="body2">
              Actual: <strong>${actualCost.toLocaleString()}</strong>
            </Typography>
          )}
        </Box>
      )}

      {/* Progress bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>Overall Progress</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{overallProgress}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          sx={{
            height: 10,
            borderRadius: 1.15,
            backgroundColor: theme.palette.mode === 'light' ? '#e0e0e0' : '#424242',
            '& .MuiLinearProgress-bar': { borderRadius: 1.15 },
          }}
        />
      </Box>

      {/* Tasks section */}
      {tasks.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon fontSize="small" color="success" /> Tasks ({tasks.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {tasks.slice(0, 5).map((task) => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  bgcolor: theme.palette.action.hover,
                  borderRadius: 1.15,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.name}</Typography>
                  {task.assignedTo && <Typography variant="caption" color="text.secondary">{task.assignedTo}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={task.percentComplete ?? 0}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 1.15,
                      bgcolor: theme.palette.mode === 'light' ? '#e0e0e0' : '#424242',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
                    {task.percentComplete ?? 0}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Milestones section */}
      {milestones.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ExpandMoreIcon fontSize="small" color="warning" /> Milestones ({milestones.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {milestones.slice(0, 5).map((ms) => (
              <Box
                key={ms.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  bgcolor: theme.palette.action.hover,
                  borderRadius: 1.15,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{ms.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {ms.type && <StatusChip status={ms.type} type="phase" size="small" />}
                  {ms.plannedDate && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(ms.plannedDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── Default export ─────────────────────────────────────────────────────────
export default SummaryCard
