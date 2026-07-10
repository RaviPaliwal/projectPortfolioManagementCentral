import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  useTheme,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
} from '@mui/material'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import ListIcon from '@mui/icons-material/List'
import FlagIcon from '@mui/icons-material/Flag'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

import { StatusChip, StatusTag, MetricTile, GanttChart } from '@/components/common'
import type { ProjectMilestoneModel, ProjectTaskModel } from '@/types/dataverse'

interface ProjectScheduleTabProps {
  projectId?: string
  milestones: ProjectMilestoneModel[]
  tasks: ProjectTaskModel[]
  onEditMilestone?: (milestone: ProjectMilestoneModel) => void
  onEditTask?: (task: ProjectTaskModel) => void
  onDeleteMilestone?: (milestoneId: string) => Promise<void>
  canEdit?: boolean
  onRefresh?: () => void
  onSuccess?: (msg: string) => void
  onError?: (err: any) => void
  onAddMilestone?: () => void
}

const isCritical = (v: any): boolean => {
  if (v === undefined || v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  const s = String(v).toLowerCase().trim()
  return s === 'true' || s === '1' || s === 'yes'
}

export const ProjectScheduleTab: React.FC<ProjectScheduleTabProps> = ({
  milestones = [],
  tasks = [],
  onEditMilestone,
  onEditTask,
  onDeleteMilestone,
  canEdit = false,
  onRefresh,
  onSuccess,
  onError,
  onAddMilestone,
}) => {
  const theme = useTheme()
  const [activeView, setActiveView] = useState<number>(0) // 0 = Gantt, 1 = Milestones List
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Calculations
  const stats = useMemo(() => {
    const total = milestones.length
    const achieved = milestones.filter(m => String(m.pm_status) === '2').length
    const atRisk = milestones.filter(m => String(m.pm_status) === '0').length
    const notStarted = milestones.filter(m => String(m.pm_status) === '1').length
    return { total, achieved, atRisk, notStarted }
  }, [milestones])

  const ganttTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return tasks.map(t => {
      const taskStart = t.pm_plannedstartdate || todayStr
      const taskEnd = t.pm_plannedenddate || taskStart
      return {
        id: t.pm_projecttaskid!,
        name: t.pm_taskname!,
        startDate: taskStart,
        endDate: taskEnd,
        percentComplete: t.pm_percentcomplete ?? 0,
        status: String(t.pm_taskstatus),
        level: (t.pm_tasklevel ?? 1) + 1,
        wbs: t.pm_wbsnumber,
        onCriticalPath: isCritical(t.pm_oncriticalpath),
        predecessorId: t._pm_predecessortask_value,
      }
    })
  }, [tasks])

  const ganttMilestones = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return milestones.map(m => ({
      id: m.pm_projectmilestoneid!,
      name: m.pm_milestonename!,
      date: m.pm_planneddate || todayStr,
      status: String(m.pm_status),
    }))
  }, [milestones])

  const handleDeleteMilestoneClick = async (milestoneId: string) => {
    if (!onDeleteMilestone) return
    if (!window.confirm('Are you sure you want to delete this milestone?')) return
    setDeletingId(milestoneId)
    try {
      await onDeleteMilestone(milestoneId)
      if (onSuccess) onSuccess('Milestone deleted successfully.')
      if (onRefresh) onRefresh()
    } catch (err: any) {
      if (onError) onError(err)
    } finally {
      setDeletingId(null)
    }
  }

  const getMilestoneStatusDetails = (status?: string | number | null) => {
    const s = String(status ?? '')
    switch (s) {
      case '2':
        return { label: 'Achieved', color: 'success' as const }
      case '0':
        return { label: 'At Risk', color: 'error' as const }
      case '1':
      default:
        return { label: 'Not Started', color: 'default' as const }
    }
  }

  const getMilestoneTypeLabel = (type?: string | number | null) => {
    const t = String(type ?? '')
    return t === '1' ? 'Governance' : 'Delivery'
  }

  const getRagLabel = (rag?: string | number | null) => {
    const r = String(rag ?? '')
    switch (r) {
      case '0':
        return 'Amber'
      case '1':
        return 'Green'
      case '2':
        return 'Not Set'
      default:
        return 'N/A'
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Stats */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile
            label="Total Milestones"
            value={stats.total}
            icon={<FlagIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile
            label="Achieved Milestones"
            value={stats.achieved}
            icon={<FlagIcon />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile
            label="At Risk"
            value={stats.atRisk}
            icon={<FlagIcon />}
            color="error.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile
            label="Not Started"
            value={stats.notStarted}
            icon={<FlagIcon />}
            color="text.secondary"
          />
        </Grid>
      </Grid>

      {/* Main Container */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Tabs value={activeView} onChange={(_, v) => setActiveView(v)}>
            <Tab
              label="Gantt Chart"
              icon={<ViewWeekIcon fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              label="Milestones List"
              icon={<ListIcon fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>

          {activeView === 1 && canEdit && onAddMilestone && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddMilestone}
              sx={{ textTransform: 'none' }}
            >
              Add Milestone
            </Button>
          )}
        </Box>

        {activeView === 0 ? (
          <Box sx={{ p: 2, minHeight: 300 }}>
            {ganttTasks.length === 0 && ganttMilestones.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No schedule tasks or milestones to display in Gantt Chart.
                </Typography>
              </Box>
            ) : (
              <GanttChart
                tasks={ganttTasks}
                milestones={ganttMilestones}
                onTaskClick={(id) => {
                  const task = tasks.find(t => t.pm_projecttaskid === id)
                  if (task && onEditTask) {
                    onEditTask(task)
                  }
                }}
              />
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            {milestones.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No milestones defined for this project.
                </Typography>
              </Box>
            ) : (
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Milestone Name</TableCell>
                    <TableCell>Planned Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>RAG Status</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Responsible</TableCell>
                    {canEdit && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {milestones.map((m) => {
                    const statusInfo = getMilestoneStatusDetails(m.pm_status)
                    const isDeleting = deletingId === m.pm_projectmilestoneid
                    return (
                      <TableRow key={m.pm_projectmilestoneid} hover>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {m.pm_milestonename}
                        </TableCell>
                        <TableCell>
                          {m.pm_planneddate
                            ? new Date(m.pm_planneddate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'TBD'}
                        </TableCell>
                        <TableCell>
                          {getMilestoneTypeLabel(m.pm_milestonetype)}
                        </TableCell>
                        <TableCell>
                          <StatusTag
                            label={getRagLabel(m.pm_ragstatus)}
                            value={m.pm_ragstatus}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusTag
                            label={statusInfo.label}
                            color={statusInfo.color}
                          />
                        </TableCell>
                        <TableCell>
                          {m.pm_responsible || 'Unassigned'}
                        </TableCell>
                        {canEdit && (
                          <TableCell align="right">
                            {isDeleting ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                {onEditMilestone && (
                                  <Tooltip title="Edit Milestone">
                                    <IconButton
                                      size="small"
                                      onClick={() => onEditMilestone(m)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {onDeleteMilestone && (
                                  <Tooltip title="Delete Milestone">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteMilestoneClick(m.pm_projectmilestoneid!)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
