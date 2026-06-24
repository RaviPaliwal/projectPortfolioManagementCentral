import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Box, Paper, Typography, Tabs, Tab, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button,
  TextField, Avatar, Alert,
} from '@mui/material'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import RateReviewIcon from '@mui/icons-material/RateReview'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import LightbulbIcon from '@mui/icons-material/Lightbulb'

import { useUser } from '@/context/UserContext'
import {
  fetchPendingWorkflowApprovals,
  fetchPendingApprovalRequests,
} from '@/services'
import { Pm_projecttasksService } from '@/generated/services/Pm_projecttasksService'
import { unwrapList } from '@/services/common'
import type { WorkflowApprovalStepModel, InitiativeModel } from '@/types/dataverse'
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
  const { currentUser } = useUser()

  const [tabIndex, setTabIndex] = useState(0)

  // My Tasks state
  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [pendingInitiatives, setPendingInitiatives] = useState<InitiativeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mySort, setMySort] = useState<MySortState>({ field: 'due', dir: 'asc' })
  const [myPage, setMyPage] = useState(0)
  const [myRowsPerPage, setMyRowsPerPage] = useState(25)
  const [mySearch, setMySearch] = useState('')

  const loadData = useCallback(async () => {
    if (!currentUser?.fullname) return
    setLoading(true)
    setError(null)
    try {
      const [workflowSteps, initiatives] = await Promise.all([
        fetchPendingWorkflowApprovals(currentUser.systemuserid ?? '', currentUser.fullname),
        fetchPendingApprovalRequests(),
      ])
      setSteps(workflowSteps)
      setPendingInitiatives(initiatives)
    } catch (err) {
      console.error('[TasksPage] load error:', err)
      setError('Unable to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

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
      (i) => i.pm_requestorname?.toLowerCase() === name
    )
  }, [pendingInitiatives, currentUser?.fullname])

  // My Tasks filter & sort
  const filteredSteps = useMemo(() => {
    let list = [...steps]
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

  return (
    <Box>
      <PageHeader
        title="Tasks"
        subtitle={tabIndex === 0 ? `${totalPending + myInitiatives.length} item${totalPending + myInitiatives.length !== 1 ? 's' : ''} requiring attention` : 'Team-wide project tasks'}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setError(null) }}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 }, '& .Mui-selected': { color: 'primary.main' } }}>
        <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`My Tasks${totalPending + myInitiatives.length > 0 ? ` (${totalPending + myInitiatives.length})` : ''}`} />
        <Tab icon={<GroupIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Team Tasks" />
      </Tabs>

      {/* ===== TAB 0: My Tasks ===== */}
      {tabIndex === 0 && (
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
                        sx={{ bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
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
            <>
              <TableFooter filteredCount={filteredSteps.length} totalCount={steps.length} itemLabel="pending step" />
              <TablePagination component="div" count={filteredSteps.length} page={myPage}
                onPageChange={(_, p) => setMyPage(p)} rowsPerPage={myRowsPerPage}
                onRowsPerPageChange={(e) => { setMyRowsPerPage(parseInt(e.target.value, 10)); setMyPage(0) }}
                rowsPerPageOptions={[25, 50, 100]} />
            </>
          )}
        </Paper>
      )}

      {/* ===== TAB 1: Team Tasks ===== */}
      {tabIndex === 1 && (
        <TeamTasksView isDark={isDark} />
      )}

    </Box>
  )
}

function TeamTasksView({ isDark }: { isDark: boolean }) {
  const { currentUser, currentUserPersona } = useUser()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [sort, setSort] = useState<TeamSortState>({ field: 'name', dir: 'asc' })

  useEffect(() => {
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const isTeamMember = currentUserPersona === 'TeamMember'
        let filterStr = 'statecode eq 0'

        if (isTeamMember && currentUser?.systemuserid) {
          const { resolveResourceIdForSystemUser } = await import('@/services')
          const resourceId = await resolveResourceIdForSystemUser(currentUser.systemuserid)
          if (resourceId) {
            const { Pm_resourceallocationsService } = await import('@/generated')
            const allocResult = await Pm_resourceallocationsService.getAll({
              filter: `_pm_resource_value eq '${resourceId}' and statecode eq 0`,
              select: ['_pm_project_value'],
              top: 500,
            })
            const allocations = allocResult.success ? unwrapList<any>(allocResult) : []
            const projectIds = Array.from(new Set(allocations.map(a => a._pm_project_value).filter(Boolean))) as string[]

            const conditions = [`_pm_assignedtoresource_value eq '${resourceId}'`]
            if (projectIds.length > 0) {
              conditions.push(`(${projectIds.map(id => `_pm_project_value eq '${id}'`).join(' or ')})`)
            }
            filterStr = `statecode eq 0 and (${conditions.join(' or ')})`
          } else {
            filterStr = 'statecode eq 0 and pm_projecttaskid eq null'
          }
        }

        const result = await Pm_projecttasksService.getAll({
          select: ['pm_projecttaskid', 'pm_taskname', 'pm_status', 'pm_duedate', 'pm_assignedto', '_pm_project_value', 'pm_percentcomplete', '_pm_assignedtoresource_value'],
          filter: filterStr,
          orderBy: ['pm_taskname asc'],
          top: 500,
        })
        const list = unwrapList<any>(result)
        setTasks(list)
      } catch (err) {
        console.error('[TeamTasksView] load error:', err)
        setError('Unable to load team tasks.')
      } finally {
        setLoading(false)
      }
    })()
  }, [currentUser, currentUserPersona])

  const handleSort = useCallback((field: TeamSortField) => {
    setSort((prev) => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(0)
  }, [])

  const filtered = useMemo(() => {
    let list = [...tasks]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => (t.pm_taskname ?? '').toLowerCase().includes(q) || (t.pm_assignedto ?? '').toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name': cmp = (a.pm_taskname ?? '').localeCompare(b.pm_taskname ?? ''); break
        case 'status': cmp = String(a.pm_status ?? '').localeCompare(String(b.pm_status ?? '')); break
        case 'due': cmp = String(a.pm_duedate ?? '').localeCompare(String(b.pm_duedate ?? '')); break
        case 'assignee': cmp = (a.pm_assignedto ?? '').localeCompare(b.pm_assignedto ?? ''); break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [tasks, search, sort])

  const paginated = useMemo(() => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filtered, page, rowsPerPage])

  const statusColor = (s?: string | number): 'success' | 'warning' | 'info' | 'default' => {
    const v = String(s ?? '')
    if (v === '0' || v === 'Completed') return 'success'
    if (v === '1' || v === 'In Progress') return 'info'
    if (v === '2' || v === 'Not Started') return 'warning'
    return 'default'
  }

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search team tasks..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }} sx={{ minWidth: 280 }}
          slotProps={{ input: { sx: { borderRadius: 1.5 } } }} />
        {search && <Button size="small" onClick={() => { setSearch(''); setPage(0) }} sx={{ borderRadius: 1.5 }}>Clear</Button>}
      </Box>

      <TableShell loading={loading} empty={filtered.length === 0} emptyIcon={<GroupIcon />}
        emptyTitle={search ? 'No tasks match your search.' : 'No team tasks found.'}>
        <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
          {(() => (
            <TableHead>
              <TableRow>
                {[
                  { field: 'name' as TeamSortField, label: 'Task Name', align: 'left' as const },
                  { field: 'assignee' as TeamSortField, label: 'Assignee', align: 'left' as const },
                  { field: 'status' as TeamSortField, label: 'Status', align: 'center' as const },
                  { field: 'due' as TeamSortField, label: 'Due Date', align: 'left' as const },
                  { label: 'Progress', align: 'center' as const },
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
          ))()}
          <TableBody>
            {paginated.map((task, idx) => {
              const pct = task.pm_percentcomplete ?? 0
              return (
                <TableRow key={task.pm_projecttaskid} hover
                  sx={{ bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, '& td': { px: 2.5, py: 1.25 } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.pm_taskname || 'Untitled Task'}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{task.pm_assignedto || '\u2014'}</Typography></TableCell>
                  <TableCell align="center">
                    <StatusTag label={String(task.pm_status ?? 'Unknown')} color={statusColor(task.pm_status)} size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{formatDate(task.pm_duedate)}</Typography></TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
                      <Box sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: 'grey.300', overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: pct >= 100 ? 'success.main' : 'primary.main', borderRadius: 3 }} />
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32 }}>{pct}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filtered.length > 0 && (
        <>
          <TableFooter filteredCount={filtered.length} totalCount={tasks.length} itemLabel="task" />
          <TablePagination component="div" count={filtered.length} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
            rowsPerPageOptions={[25, 50, 100]} />
        </>
      )}
    </Paper>
  )
}
