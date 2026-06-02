import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
  useTheme,
} from '@mui/material'
import { StatusChip, StatusTag } from '@/components/common'
import type { ProjectMilestoneModel, ProjectTaskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface ProjectScheduleTabProps {
  milestones: ProjectMilestoneModel[]
  tasks: ProjectTaskModel[]
}

export const ProjectScheduleTab: React.FC<ProjectScheduleTabProps> = ({ milestones, tasks }) => {
  const theme = useTheme()

  return (
    <Box>
      {/* Milestones Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Project Milestones</Typography>
        {milestones.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {milestones.map((ms) => (
              <Paper key={ms.pm_projectmilestoneid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{ms.pm_milestonename}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ms.pm_milestonetype === '0' || ms.pm_milestonetype === 0 ? 'Delivery' : ms.pm_milestonetype === '1' || ms.pm_milestonetype === 1 ? 'Governance' : '—'}
                    {ms.pm_planneddate ? ` · ${new Date(ms.pm_planneddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </Typography>
                </Box>
                <StatusChip status={ms.pm_ragstatus} type="rag" />
              </Paper>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No milestones yet.
          </Typography>
        )}
      </Box>

      {/* Tasks Section */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Project Tasks ({tasks.length})</Typography>
        {tasks.length > 0 ? (
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Task Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">% Complete</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Start</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>End</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.pm_projecttaskid}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t.pm_taskname}
                      {t.pm_ismilestone && <StatusTag label="Milestone" size="small" color="info" sx={{ ml: 1 }} />}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{t.pm_assignedresource ?? '—'}</Typography></TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                      <LinearProgress
                        variant="determinate"
                        value={t.pm_percentcomplete ?? 0}
                        sx={{ width: 48, height: 5, borderRadius: 3, bgcolor: theme.palette.action.hover }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{t.pm_percentcomplete ?? 0}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{t.pm_plannedstartdate ? new Date(t.pm_plannedstartdate).toLocaleDateString() : '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{t.pm_plannedenddate ? new Date(t.pm_plannedenddate).toLocaleDateString() : '—'}</Typography></TableCell>
                  <TableCell>
                    <StatusTag
                      label={String(t.pm_taskstatus) === '0' ? 'Not Started' : String(t.pm_taskstatus) === '1' ? 'In Progress' : String(t.pm_taskstatus) === '2' ? 'Complete' : String(t.pm_taskstatus) === '3' ? 'On Hold' : '—'}
                      size="small"
                      color={String(t.pm_taskstatus) === '2' ? 'success' : String(t.pm_taskstatus) === '1' ? 'info' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No tasks yet.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
