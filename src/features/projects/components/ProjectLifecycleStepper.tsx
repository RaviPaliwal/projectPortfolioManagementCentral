import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Collapse,
  Chip,
  useTheme,
} from '@mui/material'
import FlagCircleIcon from '@mui/icons-material/FlagCircle'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import FlagIcon from '@mui/icons-material/Flag'
import CelebrationIcon from '@mui/icons-material/Celebration'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import EditNoteIcon from '@mui/icons-material/EditNote'
import PeopleIcon from '@mui/icons-material/People'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import BugReportIcon from '@mui/icons-material/BugReport'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

import { currencyFormatter } from '@/utils/formatters'
import { StatusTag } from '@/components/common'
import { phaseLabel } from '../constants'
import { fontSizes } from '@/styles'
import type { ProjectModel, ProjectMilestoneModel, ProjectTaskModel, GateReviewModel } from '@/types/dataverse'

export interface PhaseSubStep {
  label: string
  icon: React.ReactNode
  isDone: boolean
  detail?: string
}

export interface PhaseDef {
  key: string
  code: string | number
  label: string
  icon: React.ReactNode
  description: string
  substeps: PhaseSubStep[]
}

export function buildPhaseDefs(
  project: ProjectModel,
  milestones: ProjectMilestoneModel[],
  tasks: ProjectTaskModel[],
  gateReviews: GateReviewModel[],
): PhaseDef[] {
  const anyGateCompleted = gateReviews.some(g => String(g.pm_reviewstatus) === '0')
  const completedMilestoneCount = milestones.filter(
    m => m.pm_status === '0' || m.pm_status === 0 || m.pm_ragstatus === '1'
  ).length

  return [
    {
      key: 'initiation', code: '3', label: 'Initiation',
      icon: <LightbulbIcon />,
      description: 'Define scope, stakeholders, and business case',
      substeps: [
        { label: 'Business case defined', icon: <EditNoteIcon fontSize="small" />, isDone: true, detail: 'Project created in system' },
        { label: 'Stakeholders identified', icon: <PeopleIcon fontSize="small" />, isDone: Boolean(project.pm_projectsponsor), detail: project.pm_projectsponsor ? `Sponsor: ${project.pm_projectsponsor}` : undefined },
        { label: 'Project charter created', icon: <EditNoteIcon fontSize="small" />, isDone: Boolean(project.pm_projectname), detail: project.pm_projectname ? 'Project registered' : undefined },
        { label: 'Kickoff completed', icon: <RocketLaunchIcon fontSize="small" />, isDone: Boolean(project.pm_plannedstartdate), detail: project.pm_plannedstartdate ? `Planned: ${new Date(project.pm_plannedstartdate).toLocaleDateString()}` : undefined },
      ],
    },
    {
      key: 'planning', code: '1', label: 'Planning',
      icon: <BuildCircleIcon />,
      description: 'Detailed planning, budgeting, and risk assessment',
      substeps: [
        { label: 'Requirements gathered', icon: <EditNoteIcon fontSize="small" />, isDone: tasks.length > 0, detail: tasks.length > 0 ? `${tasks.length} tasks defined` : undefined },
        { label: 'Resource planning', icon: <PeopleIcon fontSize="small" />, isDone: false },
        { label: 'Timeline & schedule', icon: <ScheduleIcon fontSize="small" />, isDone: Boolean(project.pm_plannedstartdate && project.pm_plannedenddate), detail: project.pm_plannedenddate ? `Target: ${new Date(project.pm_plannedenddate).toLocaleDateString()}` : undefined },
        { label: 'Budget approved', icon: <AccountBalanceWalletIcon fontSize="small" />, isDone: (project.pm_approvedbudget ?? 0) > 0, detail: (project.pm_approvedbudget ?? 0) > 0 ? `Budget: ${currencyFormatter.format(project.pm_approvedbudget??0)}` : undefined },
        { label: 'Risk assessment', icon: <BugReportIcon fontSize="small" />, isDone: false },
        { label: 'Milestones defined', icon: <FlagIcon fontSize="small" />, isDone: milestones.length > 0, detail: milestones.length > 0 ? `${milestones.length} milestones` : undefined },
      ],
    },
    {
      key: 'execution', code: '0', label: 'Execution',
      icon: <FlagCircleIcon />,
      description: 'Active delivery, monitoring, and governance',
      substeps: [
        { label: 'Development / Implementation', icon: <BuildCircleIcon fontSize="small" />, isDone: (project.pm_percentcomplete ?? 0) > 0, detail: project.pm_percentcomplete ? `${project.pm_percentcomplete}% complete` : undefined },
        { label: 'Testing & QA', icon: <CheckCircleOutlineIcon fontSize="small" />, isDone: false },
        { label: 'Status reporting', icon: <EditNoteIcon fontSize="small" />, isDone: anyGateCompleted, detail: anyGateCompleted ? 'Gate reviews completed' : undefined },
        { label: 'Milestones achieved', icon: <FlagIcon fontSize="small" />, isDone: completedMilestoneCount > 0, detail: completedMilestoneCount > 0 ? `${completedMilestoneCount} completed` : undefined },
        { label: 'Risk mitigation', icon: <BugReportIcon fontSize="small" />, isDone: false },
      ],
    },
    {
      key: 'closure', code: '2', label: 'Closure',
      icon: <CelebrationIcon />,
      description: 'Project handover, lessons learned, and closure',
      substeps: [
        { label: 'Final delivery', icon: <RocketLaunchIcon fontSize="small" />, isDone: (project.pm_percentcomplete ?? 0) >= 100, detail: (project.pm_percentcomplete ?? 0) >= 100 ? '100% complete' : undefined },
        { label: 'Lessons learned', icon: <EditNoteIcon fontSize="small" />, isDone: false },
        { label: 'Project handover', icon: <PeopleIcon fontSize="small" />, isDone: false },
        { label: 'Financial closure', icon: <AccountBalanceWalletIcon fontSize="small" />, isDone: false },
        { label: 'Benefits realization', icon: <EmojiEventsIcon fontSize="small" />, isDone: false },
      ],
    },
  ]
}

interface ProjectLifecycleStepperProps {
  phases: PhaseDef[]
  currentPhaseCode: string
}

export const ProjectLifecycleStepper: React.FC<ProjectLifecycleStepperProps> = ({
  phases,
  currentPhaseCode,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)

  const currentIdx = phases.findIndex(p => String(p.code) === currentPhaseCode)

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <FlagCircleIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Project Lifecycle
        </Typography>
        <StatusTag label={phaseLabel(currentPhaseCode)} size="small" color="primary" variant="outlined" />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, px: 0.5 }}>
        {phases.map((phase, idx) => {
          const isCurrent = String(phase.code) === currentPhaseCode
          const isPast = currentIdx > idx
          const isFuture = currentIdx < idx
          const isLast = idx === phases.length - 1

          return (
            <React.Fragment key={phase.key}>
              <Box
                onClick={() => setExpandedPhase(expandedPhase === phase.key ? null : phase.key)}
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                  cursor: 'pointer', flex: 1, position: 'relative',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    '& .phase-icon': { transform: 'scale(1.15)' },
                    '& .phase-label': { color: isPast ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary' },
                  },
                }}
              >
                <Box
                  className="phase-icon"
                  sx={{
                    width: 44, height: 44, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isPast ? 'success.main' : isCurrent ? 'primary.main' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: isPast || isCurrent ? '#fff' : 'text.disabled',
                    border: isCurrent ? '3px solid' : '2px solid',
                    borderColor: isPast ? 'success.main' : isCurrent ? 'primary.light' : 'divider',
                    boxShadow: isCurrent ? `0 0 0 4px ${theme.palette.primary.main}22` : 'none',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                  }}
                >
                  {isPast ? <CheckCircleIcon sx={{ fontSize: 22 }} /> : phase.icon}
                  {isPast && (
                    <Box
                      sx={{
                        position: 'absolute', top: -6, right: -6,
                        bgcolor: 'success.main', borderRadius: '50%',
                        width: 18, height: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${theme.palette.background.paper}`,
                      }}
                    >
                      <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1 }}>✓</Typography>
                    </Box>
                  )}
                </Box>
                <Typography
                  className="phase-label"
                  variant="caption"
                  sx={{
                    fontWeight: isCurrent ? 800 : isPast ? 700 : 500,
                    color: isPast ? 'success.main' : isCurrent ? 'primary.main' : 'text.disabled',
                    fontSize: fontSizes.xs,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    transition: 'color 0.2s',
                  }}
                >
                  {phase.label}
                </Typography>
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    flex: 1, height: 2.5,
                    bgcolor: isPast ? 'success.main' : isCurrent ? 'primary.light' : 'divider',
                    borderRadius: 2,
                    mx: 0.5,
                    mb: 3,
                    opacity: isFuture ? 0.3 : 1,
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </Box>

      {expandedPhase && (
        <Collapse in={!!expandedPhase} timeout={300}>
          {(() => {
            const phase = phases.find(p => p.key === expandedPhase)
            if (!phase) return null
            const phaseCode = String(phase.code)
            const isCurrent = phaseCode === currentPhaseCode
            const phaseIdx = phases.findIndex(p => p.key === phase.key)
            const isPast = currentIdx > phaseIdx
            const doneCount = phase.substeps.filter(s => s.isDone).length

            return (
              <Box
                sx={{
                  p: 2,
                  bgcolor: isPast ? 'rgba(34, 197, 94, 0.05)' : isCurrent ? 'rgba(59, 130, 246, 0.05)' : 'action.hover',
                  border: '1px solid',
                  borderColor: isPast ? 'success.light' : isCurrent ? 'primary.light' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: isPast ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary' }}>{phase.icon}</Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{phase.label} Phase</Typography>
                      <Typography variant="caption" color="text.secondary">{phase.description}</Typography>
                    </Box>
                  </Box>
                  <StatusTag
                    label={isPast ? '✓ Completed' : isCurrent ? 'In Progress' : 'Upcoming'}
                    size="small" color={isPast ? 'success' : isCurrent ? 'info' : 'default'} variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {phase.substeps.map((substep, si) => (
                    <Box
                      key={si}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, p: 0.75,
                        borderRadius: 1,
                        bgcolor: substep.isDone ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      {substep.isDone ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main', flexShrink: 0 }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: substep.isDone ? 600 : 400, color: substep.isDone ? 'success.dark' : 'text.primary', fontSize: fontSizes.smMd }}>
                          {substep.label}
                        </Typography>
                        {substep.detail && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: fontSizes.xs }}>
                            {substep.detail}
                          </Typography>
                        )}
                      </Box>
                      {substep.isDone && (
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontSize: fontSizes.xs, flexShrink: 0 }}>DONE</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Chip label={`${doneCount}/${phase.substeps.length} substeps`} size="small" color={doneCount === phase.substeps.length ? 'success' : 'default'} variant="outlined" sx={{ fontWeight: 600, fontSize: fontSizes.xs }} />
                  {isPast && doneCount === phase.substeps.length && <Chip label="Phase Complete" size="small" color="success" sx={{ fontWeight: 700, fontSize: fontSizes.xs }} />}
                  {isCurrent && <Chip label="Active Phase" size="small" color="primary" sx={{ fontWeight: 700, fontSize: fontSizes.xs }} />}
                </Box>
              </Box>
            )
          })()}
        </Collapse>
      )}

      {!expandedPhase && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Click a phase to view substeps and progress
        </Typography>
      )}
    </Paper>
  )
}
