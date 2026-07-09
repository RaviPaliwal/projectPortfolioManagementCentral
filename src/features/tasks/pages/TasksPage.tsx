import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button, IconButton,
  TextField, Avatar, Alert, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Slider
} from '@mui/material'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import RateReviewIcon from '@mui/icons-material/RateReview'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import EditIcon from '@mui/icons-material/Edit'

import { useUser } from '@/context/UserContext'
import {
  fetchPendingWorkflowApprovals,
  fetchPendingApprovalRequests,
} from '@/services'
import { Pm_projecttasksService } from '@/generated/services/Pm_projecttasksService'
import { unwrapList } from '@/services/common'
import type { WorkflowApprovalStepModel, InitiativeModel, ProjectTaskModel } from '@/types/dataverse'
import { fetchResourceBySystemUserId } from '@/services/resource.service'
import { fetchProjectTasksForResource, updateProjectTask } from '@/services/project.service'
import { PageHeader, TableShell, TableFooter, StatusTag, TaskLink, TableHeader } from '@/components/common'
import { FORM_DIALOG_DECISION_EVENT } from '@/utils/formDialogEvents'

const APPROVAL_STATUS_LABELS: Record<string, string> = { '0': 'Approved', '1': 'Pending' }
const APPROVAL_STATUS_COLORS: Record<string, 'success' | 'warning'> = { '0': 'success', '1': 'warning' }

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '\u2014'

type MySortField = 'order' | 'due' | 'assigned'
type TeamSortField = 'name' | 'status' | 'due' | 'assignee'
type SortDir = 'asc' | 'desc'

interface MySortState { field: MySortField; dir: SortDir }
interface TeamSortState { field: TeamSortField; dir: SortDir }

export default function TasksPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUser, userTeams, currentUserPersona } = useUser()
  const isTeamMember = currentUserPersona === 'TeamMember'

  const [tabIndex, setTabIndex] = useState(() => isTeamMember ? 2 : 0)

  useEffect(() => {
    if (isTeamMember && tabIndex !== 2) {
      setTabIndex(2)
    }
  }, [isTeamMember, tabIndex])

  // My Tasks state
  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [pendingInitiatives, setPendingInitiatives] = useState<InitiativeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mySort, setMySort] = useState<MySortState>({ field: 'due', dir: 'asc' })
  const [myPage, setMyPage] = useState(0)
  const [myRowsPerPage, setMyRowsPerPage] = useState(25)
  const [mySearch, setMySearch] = useState('')

  // Project Tasks state
  const [projectTasks, setProjectTasks] = useState<ProjectTaskModel[]>([])
  const [projectTasksPage, setProjectTasksPage] = useState(0)
  const [projectTasksRowsPerPage, setProjectTasksRowsPerPage] = useState(25)
  const [projectTasksSearch, setProjectTasksSearch] = useState('')

  // Edit Project Task states
  const [selectedEditTask, setSelectedEditTask] = useState<ProjectTaskModel | null>(null)
  const [editPercentComplete, setEditPercentComplete] = useState<number>(0)
  const [editTaskStatus, setEditTaskStatus] = useState<number | string>(2)
  const [editActualStartDate, setEditActualStartDate] = useState<string>('')
  const [editActualEndDate, setEditActualEndDate] = useState<string>('')
  const [savingTask, setSavingTask] = useState<boolean>(false)
  const [editError, setEditError] = useState<string | null>(null)

  const validationErrors = useMemo(() => {
    const errors: { start?: string; end?: string } = {}
    if (!selectedEditTask) return errors

    const pct = Number(editPercentComplete)
    if (pct > 0 && !editActualStartDate) {
      errors.start = 'Actual Start Date is required when progress has started.'
    }
    if (pct === 100 && !editActualEndDate) {
      errors.end = 'Actual End Date is required when progress is 100%.'
    }

    if (editActualStartDate && editActualEndDate) {
      const start = new Date(editActualStartDate)
      const end = new Date(editActualEndDate)
      if (end < start) {
        errors.end = 'Actual End Date cannot be before Actual Start Date.'
      }
    }

    if (editActualStartDate && selectedEditTask.pm_plannedstartdate) {
      const start = new Date(editActualStartDate)
      const baselineStart = new Date(selectedEditTask.pm_plannedstartdate)
      start.setHours(0, 0, 0, 0)
      baselineStart.setHours(0, 0, 0, 0)
      if (start < baselineStart) {
        errors.start = `Actual Start Date cannot be before Planned Start Date (${formatDate(selectedEditTask.pm_plannedstartdate)}).`
      }
    }

    if (editActualEndDate && selectedEditTask.pm_plannedstartdate) {
      const end = new Date(editActualEndDate)
      const baselineStart = new Date(selectedEditTask.pm_plannedstartdate)
      end.setHours(0, 0, 0, 0)
      baselineStart.setHours(0, 0, 0, 0)
      if (end < baselineStart) {
        errors.end = `Actual End Date cannot be before Planned Start Date (${formatDate(selectedEditTask.pm_plannedstartdate)}).`
      }
    }

    return errors
  }, [editPercentComplete, editActualStartDate, editActualEndDate, selectedEditTask])

  const hasValidationError = Object.keys(validationErrors).length > 0

  const handleSaveTaskProgress = async () => {
    if (!selectedEditTask?.pm_projecttaskid || hasValidationError) return
    setSavingTask(true)
    setEditError(null)
    try {
      await updateProjectTask(selectedEditTask.pm_projecttaskid, {
        pm_percentcomplete: Number(editPercentComplete),
        pm_taskstatus: Number(editTaskStatus),
        pm_actualstartdate: editActualStartDate || undefined,
        pm_actualenddate: editActualEndDate || undefined,
      })
      await loadData()
      setSelectedEditTask(null)
    } catch (err: any) {
      console.error('Failed to update project task progress:', err)
      setEditError(err?.message || 'Failed to update task progress.')
    } finally {
      setSavingTask(false)
    }
  }

  const loadData = useCallback(async () => {
    if (!currentUser?.fullname) return
    setLoading(true)
    setError(null)
    try {
      const cleanId = (currentUser.systemuserid ?? '').replace(/[{}]/g, '').toLowerCase()
      const teams = userTeams.get(cleanId) || []
      const [workflowSteps, initiatives, resource] = await Promise.all([
        fetchPendingWorkflowApprovals(currentUser.systemuserid ?? '', currentUser.fullname, teams),
        fetchPendingApprovalRequests(),
        fetchResourceBySystemUserId(currentUser.systemuserid ?? '')
      ])
      setSteps(workflowSteps)
      setPendingInitiatives(initiatives)

      if (resource?.pm_resourceid) {
        const pTasks = await fetchProjectTasksForResource(resource.pm_resourceid)
        setProjectTasks(pTasks)
      } else {
        setProjectTasks([])
      }
    } catch (err) {
      console.error('[TasksPage] load error:', err)
      setError('Unable to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, userTeams])

  useEffect(() => { loadData() }, [loadData])

  // Refresh list when a decision is made in the modal
  const loadDataRef = useRef(loadData)
  loadDataRef.current = loadData
  useEffect(() => {
    const handler = () => { loadDataRef.current() }
    window.addEventListener(FORM_DIALOG_DECISION_EVENT, handler)
    return () => window.removeEventListener(FORM_DIALOG_DECISION_EVENT, handler)
  }, [])

  const myInitiatives = useMemo(() => {
    if (!currentUser?.fullname) return []
    const name = currentUser.fullname.toLowerCase()
    return pendingInitiatives.filter(
      (i) => i.pm_requestedbyname?.toLowerCase() === name
    )
  }, [pendingInitiatives, currentUser?.fullname])

  // My Tasks filter & sort
  const individualSteps = useMemo(() => steps.filter((s: any) => String(s.pm_assigneetype) !== '1' && String(s.pm_assigneetype).toLowerCase() !== 'team'), [steps])
  
  const filteredSteps = useMemo(() => {
    let list = [...individualSteps]
    if (mySearch.trim()) {
      const q = mySearch.toLowerCase()
      list = list.filter(
        (s) =>              (s.pm_stepname ?? '').toLowerCase().includes(q) ||
              ((s as any).pm_workflowname ?? '').toLowerCase().includes(q) ||
              (s.pm_approvername ?? '').toLowerCase().includes(q) ||
              ((s as any).pm_assigneename ?? (s as any).pm_assigneedisplayname ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (mySort.field) {
        case 'order': cmp = (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0); break

        case 'due': cmp = String(a.pm_duedate ?? '').localeCompare(String(b.pm_duedate ?? '')); break
        case 'assigned': cmp = ((a as any).pm_assigneename ?? (a as any).pm_assigneedisplayname ?? a.pm_approvername ?? '').localeCompare((b as any).pm_assigneename ?? (b as any).pm_assigneedisplayname ?? b.pm_approvername ?? ''); break
      }
      return mySort.dir === 'asc' ? cmp : -cmp
    })
  }, [steps, mySearch, mySort])

  const paginatedSteps = useMemo(
    () => filteredSteps.slice(myPage * myRowsPerPage, myPage * myRowsPerPage + myRowsPerPage),
    [filteredSteps, myPage, myRowsPerPage]
  )

  const handleMySort = useCallback((field: MySortField) => {
    setMySort((prev) => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setMyPage(0)
  }, [])

  const totalPending = filteredSteps.length
  
  const teamSteps = useMemo(() => steps.filter((s: any) => String(s.pm_assigneetype) === '1' || String(s.pm_assigneetype).toLowerCase() === 'team'), [steps])

  return (
    <Box>
      <PageHeader
        title="Tasks"
        subtitle={tabIndex === 0 ? `${totalPending + myInitiatives.length} item${totalPending + myInitiatives.length !== 1 ? 's' : ''} requiring attention` : tabIndex === 1 ? `${teamSteps.length} team-assigned approvals` : `${projectTasks.length} project tasks`}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {!isTeamMember && (
        <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setError(null) }}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 }, '& .Mui-selected': { color: 'primary.main' } }}>
          <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`My Approvals${totalPending + myInitiatives.length > 0 ? ` (${totalPending + myInitiatives.length})` : ''}`} />
          <Tab icon={<GroupIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Team Approvals${teamSteps.length > 0 ? ` (${teamSteps.length})` : ''}`} />
          <Tab icon={<AssignmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`My Project Tasks${projectTasks.length > 0 ? ` (${projectTasks.length})` : ''}`} />
        </Tabs>
      )}

      {/* ===== TAB 0: My Approvals ===== */}
      {!isTeamMember && tabIndex === 0 && (
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search by task, workflow, or assignee..." value={mySearch}
              onChange={(e) => { setMySearch(e.target.value); setMyPage(0) }} sx={{ minWidth: 280 }}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }} />
            {mySearch && <Button size="small" onClick={() => { setMySearch(''); setMyPage(0) }} sx={{ borderRadius: 1.5 }}>Clear</Button>}
          </Box>

          {/* Initiatives pending review */}
          {!loading && myInitiatives.length > 0 && (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <LightbulbIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                Initiatives Pending Review ({myInitiatives.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {myInitiatives.map((init) => (
                  <Paper key={init.pm_initiativeid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, borderLeft: '3px solid #f59e0b' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HourglassEmptyIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{init.pm_name || 'Untitled Initiative'}</Typography>
                        <Typography variant="caption" color="text.secondary">{init.pm_portfolioname && `${init.pm_portfolioname} \u00B7 `}Submitted {formatDate(init.pm_submissiondate)}</Typography>
                      </Box>
                      <StatusTag label="Pending Review" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          <TableShell loading={loading} empty={filteredSteps.length === 0 && myInitiatives.length === 0}
            sx={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}
            emptyIcon={<RateReviewIcon />}
            emptyTitle={!currentUser?.fullname ? 'No user selected \u2014 switch users from the top bar.' : mySearch ? 'No tasks match your search.' : 'All clear! No pending tasks.'}>
            {filteredSteps.length > 0 && (
              <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                <TableHeader cells={[
                  { label: 'Task', sortable: true, active: mySort.field === 'order', dir: mySort.dir, onClick: () => handleMySort('order') },
                  { label: 'Due Date', sortable: true, active: mySort.field === 'due', dir: mySort.dir, onClick: () => handleMySort('due') },
                  { label: 'Assigned To', sortable: true, active: mySort.field === 'assigned', dir: mySort.dir, onClick: () => handleMySort('assigned') },
                  { label: 'Action' },
                ]} />
                <TableBody>
                  {paginatedSteps.map((step, idx) => {
                    const isOverdue = step.pm_duedate && new Date(step.pm_duedate) < new Date()
                    const isUrgent = step.pm_duedate && !isOverdue && new Date(step.pm_duedate).getTime() - Date.now() < 86400000 * 2
                    return (
                      <TableRow key={step.pm_workflowapprovalstepid} hover
                        sx={{ bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent', '&:hover': { bgcolor: 'action.selected' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'secondary.main', fontSize: 12, fontWeight: 700 }}>
                              {step.pm_steporder ?? '?'}
                            </Avatar>
                            <Box>                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{(step as any).pm_workflowname || step.pm_stepname || `Step ${step.pm_steporder ?? '?'}`}</Typography>
                            <Typography variant="caption" color="text.secondary">{step.pm_stepname ? `Step: ${step.pm_stepname}` : ''}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ScheduleIcon sx={{ fontSize: 14, color: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'text.secondary' }} />
                            <Typography variant="body2" sx={{ color: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'inherit', fontWeight: isOverdue || isUrgent ? 600 : 400 }}>
                              {formatDate(step.pm_duedate)}
                            </Typography>
                            {isOverdue && <StatusTag label="Overdue" size="small" color="error" />}
                            {isUrgent && !isOverdue && <StatusTag label="Urgent" size="small" color="warning" />}
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2">{(step as any).pm_assigneename || step.pm_approvername || step.pm_assigneedisplayname || '\u2014'}</Typography></TableCell>
                        <TableCell>
                          {step.pm_workflowapprovalstepid ? (
                            <TaskLink stepId={step.pm_workflowapprovalstepid} variant="chip" label="Open Task" />
                          ) : (
                            <Typography variant="caption" color="text.disabled">{'\u2014'}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </TableShell>

          {!loading && filteredSteps.length > 0 && (
            <TableFooter
              filteredCount={filteredSteps.length}
              totalCount={steps.length}
              itemLabel="pending step"
              page={myPage}
              onPageChange={(_, p) => setMyPage(p)}
              rowsPerPage={myRowsPerPage}
              onRowsPerPageChange={(e) => { setMyRowsPerPage(parseInt(e.target.value, 10)); setMyPage(0) }}
            />
          )}
        </Paper>
      )}

      {/* ===== TAB 1: Team Approval Tasks ===== */}
      {!isTeamMember && tabIndex === 1 && (
        <TeamTasksView isDark={isDark} teamSteps={teamSteps} loading={loading} />
      )}

      {/* ===== TAB 2: My Project Tasks ===== */}
      {(isTeamMember || tabIndex === 2) && (
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search project tasks..." value={projectTasksSearch}
              onChange={(e) => { setProjectTasksSearch(e.target.value); setProjectTasksPage(0) }} sx={{ minWidth: 280 }}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }} />
            {projectTasksSearch && <Button size="small" onClick={() => { setProjectTasksSearch(''); setProjectTasksPage(0) }} sx={{ borderRadius: 1.5 }}>Clear</Button>}
          </Box>

          <TableShell loading={loading} empty={projectTasks.filter(t => (t.pm_taskname ?? '').toLowerCase().includes(projectTasksSearch.toLowerCase())).length === 0}
            sx={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}
            emptyIcon={<AssignmentIcon />}
            emptyTitle={!currentUser?.fullname ? 'No user selected.' : projectTasksSearch ? 'No project tasks match your search.' : 'All clear! No project tasks assigned to you.'}>
            {projectTasks.length > 0 && (
              <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                <TableHeader cells={[
                  { label: 'Task Name' },
                  { label: 'Project' },
                  { label: 'Status' },
                  { label: 'Start Date' },
                  { label: 'End Date' },
                  { label: 'Completion' },
                  { label: 'Action' },
                ]} />
                <TableBody>
                  {projectTasks
                    .filter(t => (t.pm_taskname ?? '').toLowerCase().includes(projectTasksSearch.toLowerCase()))
                    .slice(projectTasksPage * projectTasksRowsPerPage, projectTasksPage * projectTasksRowsPerPage + projectTasksRowsPerPage)
                    .map((task) => (
                      <TableRow key={task.pm_projecttaskid} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.pm_taskname}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{task.pm_projectname || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusTag 
                             label={task.pm_taskstatus === 0 ? 'Complete' : task.pm_taskstatus === 1 ? 'In Progress' : 'Pending'} 
                             color={task.pm_taskstatus === 0 ? 'success' : task.pm_taskstatus === 1 ? 'info' : 'default'} 
                             size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(task.pm_plannedstartdate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(task.pm_plannedenddate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                            <Typography variant="body2" sx={{ minWidth: 32 }}>{task.pm_percentcomplete ?? 0}%</Typography>
                            <LinearProgress variant="determinate" value={task.pm_percentcomplete ?? 0} sx={{ flexGrow: 1, borderRadius: 1, height: 6 }} 
                              color={(task.pm_percentcomplete ?? 0) === 100 ? 'success' : (task.pm_percentcomplete ?? 0) >= 75 ? 'primary' : (task.pm_percentcomplete ?? 0) >= 25 ? 'warning' : 'error'} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary"
                            onClick={() => {
                              setSelectedEditTask(task)
                              setEditPercentComplete(task.pm_percentcomplete ?? 0)
                              setEditTaskStatus(task.pm_taskstatus ?? 2)
                              setEditActualStartDate(task.pm_actualstartdate ? task.pm_actualstartdate.split('T')[0] : '')
                              setEditActualEndDate(task.pm_actualenddate ? task.pm_actualenddate.split('T')[0] : '')
                              setEditError(null)
                            }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </TableShell>
          {!loading && projectTasks.length > 0 && (
            <TableFooter
              filteredCount={projectTasks.filter(t => (t.pm_taskname ?? '').toLowerCase().includes(projectTasksSearch.toLowerCase())).length}
              totalCount={projectTasks.length}
              itemLabel="task"
              page={projectTasksPage}
              onPageChange={(_, p) => setProjectTasksPage(p)}
              rowsPerPage={projectTasksRowsPerPage}
              onRowsPerPageChange={(e) => {
                setProjectTasksRowsPerPage(parseInt(e.target.value, 10))
                setProjectTasksPage(0)
              }}
            />
          )}

          {/* Edit Task Progress Dialog */}
          <Dialog open={!!selectedEditTask} onClose={() => !savingTask && setSelectedEditTask(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 2 }}>
              Edit Task Progress
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: '24px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {editError && <Alert severity="error">{editError}</Alert>}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {selectedEditTask?.pm_taskname}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Project: {selectedEditTask?.pm_projectname}
                </Typography>
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel id="edit-task-status-label">Status</InputLabel>
                <Select
                  labelId="edit-task-status-label"
                  label="Status"
                  value={editTaskStatus}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setEditTaskStatus(val)
                    if (val === 0) {
                      setEditPercentComplete(100)
                    } else if (val === 1 && editPercentComplete === 100) {
                      setEditPercentComplete(50)
                    } else if (val === 2) {
                      setEditPercentComplete(0)
                    }
                  }}
                >
                  <MenuItem value={2}>Pending</MenuItem>
                  <MenuItem value={1}>In Progress</MenuItem>
                  <MenuItem value={0}>Complete</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ px: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  Completion: {editPercentComplete}%
                </Typography>
                <Slider
                  value={editPercentComplete}
                  onChange={(_, val) => {
                    const pct = val as number
                    setEditPercentComplete(pct)
                    if (pct === 100) {
                      setEditTaskStatus(0)
                    } else if (pct > 0) {
                      setEditTaskStatus(1)
                    } else {
                      setEditTaskStatus(2)
                    }
                  }}
                  min={0}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <TextField
                label={editPercentComplete > 0 ? "Actual Start Date *" : "Actual Start Date"}
                required={editPercentComplete > 0}
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={editActualStartDate}
                onChange={(e) => setEditActualStartDate(e.target.value)}
                error={!!validationErrors.start}
                helperText={validationErrors.start}
              />

              <TextField
                label={editPercentComplete === 100 ? "Actual End Date *" : "Actual End Date"}
                required={editPercentComplete === 100}
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={editActualEndDate}
                onChange={(e) => setEditActualEndDate(e.target.value)}
                error={!!validationErrors.end}
                helperText={validationErrors.end}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => setSelectedEditTask(null)} disabled={savingTask}>
                Cancel
              </Button>
              <Button onClick={handleSaveTaskProgress} variant="contained" disabled={savingTask || hasValidationError} sx={{ fontWeight: 600 }}>
                {savingTask ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      )}

    </Box>
  )
}

function TeamTasksView({ isDark, teamSteps, loading }: { isDark: boolean, teamSteps: WorkflowApprovalStepModel[], loading: boolean }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sort, setSort] = useState<TeamSortState>({ field: 'due', dir: 'asc' })

  const handleSort = useCallback((field: TeamSortField) => {
    setSort((prev) => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(0)
  }, [])

  const filtered = useMemo(() => {
    let list = [...teamSteps]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s: any) => 
        (s.pm_stepname ?? '').toLowerCase().includes(q) ||
        (s.pm_workflowname ?? '').toLowerCase().includes(q) ||
        (s.pm_assigneename ?? s.pm_assigneedisplayname ?? '').toLowerCase().includes(q)
      )
    }
    return list.sort((a: any, b: any) => {
      let cmp = 0
      switch (sort.field) {
        case 'name': cmp = (a.pm_stepname ?? '').localeCompare(b.pm_stepname ?? ''); break
        case 'due': cmp = String(a.pm_duedate ?? '').localeCompare(String(b.pm_duedate ?? '')); break
        case 'assignee': cmp = (a.pm_assigneename ?? a.pm_assigneedisplayname ?? '').localeCompare(b.pm_assigneename ?? b.pm_assigneedisplayname ?? ''); break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [teamSteps, search, sort])

  const paginated = useMemo(() => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filtered, page, rowsPerPage])

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search team approvals..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }} sx={{ minWidth: 280 }}
          slotProps={{ input: { sx: { borderRadius: 1.5 } } }} />
        {search && <Button size="small" onClick={() => { setSearch(''); setPage(0) }} sx={{ borderRadius: 1.5 }}>Clear</Button>}
      </Box>

      <TableShell loading={loading} empty={filtered.length === 0} emptyIcon={<GroupIcon />}
        emptyTitle={search ? 'No tasks match your search.' : 'No pending team approvals found.'}>
        {filtered.length > 0 && (
        <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                {[
                  { field: 'name' as TeamSortField, label: 'Task Name', align: 'left' as const },
                  { field: 'due' as TeamSortField, label: 'Due Date', align: 'left' as const },
                  { field: 'assignee' as TeamSortField, label: 'Assigned To', align: 'left' as const },
                  { label: 'Action', align: 'left' as const },
                ].map((col, idx) => (
                  <TableCell key={idx} align={col.align || 'left'}
                    sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', py: 1.5, borderBottom: '2px solid', borderColor: 'divider', cursor: col.field ? 'pointer' : 'default', '&:hover': col.field ? { color: 'primary.main' } : {}, whiteSpace: 'nowrap' }}
                    onClick={col.field ? () => handleSort(col.field!) : undefined}>
                    {col.field ? (
                      <TableSortLabel active={sort.field === col.field} direction={sort.field === col.field ? sort.dir : 'asc'}>{col.label}</TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          <TableBody>
            {paginated.map((step: any, idx) => {
              const isOverdue = step.pm_duedate && new Date(step.pm_duedate) < new Date()
              const isUrgent = step.pm_duedate && !isOverdue && new Date(step.pm_duedate).getTime() - Date.now() < 86400000 * 2
              return (
                <TableRow key={step.pm_workflowapprovalstepid} hover
                  sx={{ bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent', '&:hover': { bgcolor: 'action.selected' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'secondary.main', fontSize: 12, fontWeight: 700 }}>
                        {step.pm_steporder ?? '?'}
                      </Avatar>
                      <Box>                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.pm_workflowname || step.pm_stepname || `Step ${step.pm_steporder ?? '?'}`}</Typography>
                      <Typography variant="caption" color="text.secondary">{step.pm_stepname ? `Step: ${step.pm_stepname}` : ''}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <ScheduleIcon sx={{ fontSize: 14, color: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'text.secondary' }} />
                      <Typography variant="body2" sx={{ color: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'inherit', fontWeight: isOverdue || isUrgent ? 600 : 400 }}>
                        {formatDate(step.pm_duedate)}
                      </Typography>
                      {isOverdue && <StatusTag label="Overdue" size="small" color="error" />}
                      {isUrgent && !isOverdue && <StatusTag label="Urgent" size="small" color="warning" />}
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{step.pm_assigneename || step.pm_approvername || step.pm_assigneedisplayname || '\u2014'}</Typography></TableCell>
                  <TableCell>
                    {step.pm_workflowapprovalstepid ? (
                      <TaskLink stepId={step.pm_workflowapprovalstepid} variant="chip" label="Open Task" />
                    ) : (
                      <Typography variant="caption" color="text.disabled">{'\u2014'}</Typography>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        )}
      </TableShell>

      {!loading && filtered.length > 0 && (
        <TableFooter
          filteredCount={filtered.length}
          totalCount={teamSteps.length}
          itemLabel="pending step"
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
        />
      )}
    </Paper>
  )
}
