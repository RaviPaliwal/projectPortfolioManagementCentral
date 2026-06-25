import React, { useMemo, useState, useEffect } from 'react'
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
  Stack,
  Divider,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Button,
  alpha,
} from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import ListIcon from '@mui/icons-material/List'
import EditIcon from '@mui/icons-material/Edit'
import SchemaIcon from '@mui/icons-material/Schema'
import PrintIcon from '@mui/icons-material/Print'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { StatusChip, StatusTag, MetricTile, ExcelImportDialog } from '@/components/common'
import GanttChart from '@/components/common/GanttChart/GanttChart'
import { WbsBuilder } from './WbsBuilder'
import { DependencyNetwork } from './DependencyNetwork'
import { createProjectTask, createProjectMilestone } from '@/services'
import type { ProjectMilestoneModel, ProjectTaskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface ProjectScheduleTabProps {
  projectId?: string
  milestones: ProjectMilestoneModel[]
  tasks: ProjectTaskModel[]
  onEditMilestone?: (milestone: ProjectMilestoneModel) => void
  onEditTask?: (task: ProjectTaskModel) => void
  canEdit?: boolean
  onRefresh?: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export const ProjectScheduleTab: React.FC<ProjectScheduleTabProps> = ({ 
  projectId,
  milestones, 
  tasks, 
  onEditMilestone, 
  onEditTask,
  canEdit = false,
  onRefresh,
  onSuccess,
  onError,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [activeView, setActiveView] = useState(0)
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const handleImportTasks = async (
    rows: any[],
    onProgress: (current: number, total: number) => void
  ) => {
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (row.pm_ismilestone) {
          const payload: Partial<ProjectMilestoneModel> = {
            pm_milestonename: row.pm_taskname,
            pm_description: row.pm_taskdescription || '',
            pm_planneddate: row.pm_plannedstartdate,
            _pm_project_value: projectId,
            pm_status: 1, // Not Started / Active
          }
          const created = await createProjectMilestone(payload)
          if (created) {
            successCount++
          } else {
            failedCount++
            errors.push(`Row ${i + 1}: Failed to save milestone to Dataverse`)
          }
        } else {
          const percent = row.pm_percentcomplete ?? 0
          const payload: Partial<ProjectTaskModel> = {
            pm_taskname: row.pm_taskname,
            pm_taskdescription: row.pm_taskdescription || '',
            pm_plannedstartdate: row.pm_plannedstartdate,
            pm_plannedenddate: row.pm_plannedenddate,
            pm_percentcomplete: percent,
            pm_taskstatus: percent === 100 ? '0' : percent > 0 ? '1' : '2',
            pm_tasklevel: row.pm_tasklevel ?? 1,
            pm_wbsnumber: row.pm_wbsnumber || '',
            _pm_project_value: projectId,
          }
          const created = await createProjectTask(payload)
          if (created) {
            successCount++
          } else {
            failedCount++
            errors.push(`Row ${i + 1}: Failed to save task to Dataverse`)
          }
        }
      } catch (err: any) {
        failedCount++
        errors.push(`Row ${i + 1}: ${err.message || 'Unknown error'}`)
      }
      onProgress(i + 1, rows.length)
    }

    if (onRefresh) {
      onRefresh()
    }
    return { successCount, failedCount, errors }
  }

  const getStatusLabel = (status?: string | number | null): string => {
    const s = String(status ?? '')
    if (s === '0') return 'Complete'
    if (s === '1') return 'In Progress'
    return 'Not Started'
  }

  const getRagLabel = (code?: string | number | null): string => {
    const s = String(code ?? '')
    if (s === '0') return 'Amber'
    if (s === '1') return 'Green'
    if (s === '2') return 'NotSet'
    return 'N/A'
  }

  // Robust boolean checker for Dataverse option/string formats
  const isCritical = (v: any): boolean => {
    if (v === undefined || v === null) return false
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v === 1
    const s = String(v).toLowerCase().trim()
    return s === 'true' || s === '1' || s === 'yes'
  }

  // Map to Gantt formats
  const ganttTasks = useMemo(() => {
    const raw = tasks.map(t => ({
      id: t.pm_projecttaskid!,
      name: t.pm_taskname!,
      startDate: t.pm_plannedstartdate!,
      endDate: t.pm_plannedenddate!,
      percentComplete: t.pm_percentcomplete ?? 0,
      status: String(t.pm_taskstatus),
      level: t.pm_tasklevel ?? 1,
      wbs: t.pm_wbsnumber,
      onCriticalPath: isCritical(t.pm_oncriticalpath),
      predecessorId: t._pm_predecessortask_value,
    }))
    if (showCriticalPathOnly) {
      return raw.filter(t => t.onCriticalPath)
    }
    return raw
  }, [tasks, showCriticalPathOnly])

  const ganttMilestones = useMemo(() => milestones.map(m => ({
    id: m.pm_projectmilestoneid!,
    name: m.pm_milestonename!,
    date: m.pm_planneddate!,
    status: String(m.pm_status),
  })), [milestones])

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => String(t.pm_taskstatus) === '0').length
    const avgProgress = total > 0 ? Math.round(tasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / total) : 0
    const upcomingMilestones = milestones.filter(m => m.pm_planneddate && new Date(m.pm_planneddate) >= new Date()).length

    return { total, completed, avgProgress, upcomingMilestones }
  }, [tasks, milestones])

  const handlePrintPDF = () => {
    if (timelineItems.length === 0) return
    const rows = timelineItems.map((item: any) => {
      const status = item.type === 'milestone' ? getRagLabel(item.rag) : getStatusLabel(item.status)
      const date = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'
      const endDate = item.endDate && item.endDate !== item.date
        ? ' - ' + new Date(item.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''
      const typeLabel = item.type === 'milestone'
        ? (item.mType === '1' || item.mType === 1 ? 'Governance Checkpoint' : 'Delivery Milestone')
        : 'Task'
      return '<tr><td>' + item.name + '</td><td>' + typeLabel + '</td><td>' + (item.resource || 'Unassigned') + '</td><td>' + date + endDate + '</td><td>' + (item.type === 'task' ? (item.progress || 0) + '%' : '') + '</td><td>' + status + '</td></tr>'
    }).join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write('<!DOCTYPE html><html><head><title>Project Schedule</title><style>body{font-family:Segoe UI,sans-serif;padding:20px}h1{font-size:18px;margin-bottom:4px;color:#1a1a2e}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#1a1a2e;color:#fff;padding:8px 10px;text-align:left;font-weight:600}td{padding:6px 10px;border-bottom:1px solid #e0e0e0}tr:nth-child(even){background:#f8f8f8}.print-footer{text-align:right;font-size:10px;color:#999;margin-top:12px}</style></head><body><h1>Project Schedule</h1><table><thead><tr><th>Schedule Item</th><th>Type</th><th>Responsible</th><th>Date</th><th>Progress</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table><div class="print-footer">Generated ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</div></body></html>')
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  // Combine and sort by planned date for the list view
  const timelineItems = useMemo(() => {
    const filteredTasks = showCriticalPathOnly
      ? tasks.filter(t => isCritical(t.pm_oncriticalpath))
      : tasks

    const items = [
      ...milestones.map(m => ({
        id: m.pm_projectmilestoneid,
        name: m.pm_milestonename,
        date: m.pm_planneddate,
        type: 'milestone' as const,
        rag: m.pm_ragstatus,
        mType: m.pm_milestonetype,
        status: m.pm_status,
        resource: m.pm_responsible,
        onCriticalPath: false,
      })),
      ...filteredTasks.map(t => ({
        id: t.pm_projecttaskid,
        name: t.pm_taskname,
        date: t.pm_plannedstartdate,
        endDate: t.pm_plannedenddate,
        type: 'task' as const,
        status: t.pm_taskstatus,
        progress: t.pm_percentcomplete,
        resource: t.pm_assignedresource,
        onCriticalPath: isCritical(t.pm_oncriticalpath),
      }))
    ]
    return items.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      return dateA - dateB
    })
  }, [milestones, tasks, showCriticalPathOnly])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Schedule Stats ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Total Tasks" value={stats.total} icon={<AssignmentIcon />} color="primary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Avg. Progress" value={`${stats.avgProgress}%`} icon={<ViewWeekIcon />} color="info.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Milestones" value={milestones.length} icon={<FlagIcon />} color="warning.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricTile label="Completed" value={stats.completed} icon={<AssignmentIcon />} color="success.main" />
        </Grid>
      </Grid>

      {/* ── View Toggle ── */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Tabs value={activeView} onChange={(_, v) => setActiveView(v)}>
            <Tab label="Gantt Chart" icon={<ViewWeekIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Detailed List" icon={<ListIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Dependency Network" icon={<SchemaIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            {canEdit && (
              <Tab label="WBS Structure Builder" icon={<ListIcon fontSize="small" />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
            )}
          </Tabs>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  color="error"
                  checked={showCriticalPathOnly}
                  onChange={(e) => setShowCriticalPathOnly(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Critical Path Only
                </Typography>
              }
            />
            {canEdit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ borderRadius: 1.15 }}
              >
                Import Tasks
              </Button>
            )}
            <Tooltip title="Print / Export PDF">
              <IconButton size="small" onClick={handlePrintPDF} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.15 }}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 2 }}>
              {tasks.length} tasks · {milestones.length} milestones
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          {activeView === 0 && (
            <Box sx={{ mt: 1 }}>
              <GanttChart tasks={ganttTasks} milestones={ganttMilestones} height={500} />
            </Box>
          )}

          {activeView === 1 && (
            <Table size="small">
              <TableHead sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase', py: 1.5, pl: 3 }}>Schedule Item</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }}>Responsible</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }} align="center">Progress / Date</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase' }} align="right">Status</TableCell>
                  {canEdit && <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, textTransform: 'uppercase', pr: 3 }} align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {timelineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 5 : 4} sx={{ py: 8, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">No items in the project schedule.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  timelineItems.map((item) => (
                    <TableRow key={item.id} hover sx={{ 
                      bgcolor: item.type === 'milestone' 
                        ? (isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(245, 158, 11, 0.02)') 
                        : item.onCriticalPath
                        ? (isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)')
                        : 'transparent',
                      borderLeft: item.onCriticalPath ? '3px solid #ef4444' : 'none',
                      '&:last-child td': { border: 0 } 
                    }}>
                      <TableCell sx={{ pl: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ mt: 0.5 }}>
                            {item.type === 'milestone' ? (
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main', mt: 0.5, border: '2px solid white', boxShadow: '0 0 0 2px ' + theme.palette.warning.main }} />
                            ) : (
                              <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: item.onCriticalPath ? 'error.light' : 'primary.light', mt: 0.5, opacity: 0.6 }} />
                            )}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: item.type === 'milestone' ? 800 : 600, color: item.type === 'milestone' ? 'warning.dark' : item.onCriticalPath ? 'error.dark' : 'text.primary' }}>
                              {item.name}
                              {item.type === 'milestone' && (
                                <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'rgba(245, 158, 11, 0.08)', color: 'warning.dark', fontWeight: 800, textTransform: 'uppercase', fontSize: fontSizes.xs }}>
                                  Milestone
                                </Typography>
                              )}
                              {item.onCriticalPath && (
                                <Typography variant="caption" sx={{ ml: 1, px: 0.8, py: 0.2, bgcolor: 'rgba(239, 68, 68, 0.08)', color: 'error.main', fontWeight: 800, textTransform: 'uppercase', fontSize: fontSizes.xs }}>
                                  Critical Path
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.type === 'milestone' ? (
                                item.mType === '1' || item.mType === 1 ? 'Governance Checkpoint' : 'Delivery Milestone'
                              ) : (
                                'Standard Task'
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" sx={{ color: item.resource ? 'text.primary' : 'text.disabled' }}>
                          {item.resource || 'Unassigned'}
                        </Typography>
                      </TableCell>
 
                      <TableCell align="center">
                        {item.type === 'task' ? (
                          <Box sx={{ minWidth: 120, px: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: (item as any).progress === 100 ? 'success.main' : 'primary.main' }}>
                                {(item as any).progress || 0}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={(item as any).progress || 0} 
                              sx={{ height: 6, bgcolor: theme.palette.action.hover, '& .MuiLinearProgress-bar': { bgcolor: (item as any).progress === 100 ? 'success.main' : 'primary.main' } }} 
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                          </Typography>
                        )}
                      </TableCell>
 
                      <TableCell align="right" sx={{ pr: canEdit ? 1 : 3 }}>
                        {item.type === 'milestone' ? (
                          <StatusChip status={(item as any).rag} type="rag" size="small" />
                        ) : (
                          <StatusTag
                            label={String((item as any).status) === '0' ? 'Complete' : String((item as any).status) === '1' ? 'In Progress' : 'Not Started'}
                            size="small"
                            color={String((item as any).status) === '0' ? 'success' : String((item as any).status) === '1' ? 'info' : 'default'}
                          />
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell align="right" sx={{ pr: 3 }}>
                          {item.type === 'milestone' ? (
                            <Tooltip title="Edit Milestone">
                              <IconButton
                                size="small"
                                onClick={() => onEditMilestone?.(milestones.find(m => m.pm_projectmilestoneid === item.id)!)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Edit Task">
                              <IconButton
                                size="small"
                                onClick={() => onEditTask?.(tasks.find(t => t.pm_projecttaskid === item.id)!)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeView === 2 && (
            <DependencyNetwork tasks={tasks} milestones={milestones} />
          )}

          {activeView === 3 && (
            <WbsBuilder
              tasks={tasks}
              onSuccess={onSuccess || (() => {})}
              onError={onError || (() => {})}
              onRefresh={onRefresh || (() => {})}
              onEditTask={onEditTask}
            />
          )}
        </Box>
      </Paper>

      {/* ── Excel/CSV Import Dialog ────────────────── */}
      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        importType="tasks"
        title="Import Tasks and Milestones from CSV"
        onImport={handleImportTasks}
      />
    </Box>
  )
}
