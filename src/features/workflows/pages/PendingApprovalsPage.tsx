import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Box, Paper, Typography, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar, Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import RateReviewIcon from '@mui/icons-material/RateReview'

import { useUser } from '@/context/UserContext'
import {
  fetchPendingWorkflowApprovals,
  approveWorkflowStep,
  rejectWorkflowStep,
} from '@/services'
import type { WorkflowApprovalStepModel } from '@/types/dataverse'
import { PageHeader, TableShell, TableFooter, StatusTag, TaskLink, Button, TableHeader } from '@/components/common'
import { FORM_DIALOG_DECISION_EVENT } from '@/utils/formDialogEvents'

const APPROVAL_STATUS_LABELS: Record<string, string> = { '0': 'Approved', '1': 'Pending' }
const APPROVAL_STATUS_COLORS: Record<string, 'success' | 'warning'> = { '0': 'success', '1': 'warning' }

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '—'

type SortField = 'order' | 'workflow' | 'entity' | 'due' | 'assigned'
type SortDir = 'asc' | 'desc'

interface SortState { field: SortField; dir: SortDir }

export default function PendingApprovalsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUser, userTeams } = useUser()

  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [sort, setSort] = useState<SortState>({ field: 'due', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean
    step: WorkflowApprovalStepModel | null
    reason: string
  }>({ open: false, step: null, reason: '' })

  const loadApprovals = useCallback(async () => {
    if (!currentUser?.fullname) return
    setLoading(true)
    setError(null)
    try {
      const cleanId = (currentUser.systemuserid ?? '').replace(/[{}]/g, '').toLowerCase()
      const teams = userTeams.get(cleanId) || []
      const result = await fetchPendingWorkflowApprovals(
          currentUser.systemuserid ?? '', currentUser.fullname, teams
        )
      setSteps(result)
    } catch (err) {
      console.error('[PendingApprovalsPage] load error:', err)
      setError('Unable to load pending approvals.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, userTeams])

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  // Refresh list when a decision is made in the modal
  const loadApprovalsRef = useRef(loadApprovals)
  loadApprovalsRef.current = loadApprovals
  useEffect(() => {
    const handler = () => { loadApprovalsRef.current() }
    window.addEventListener(FORM_DIALOG_DECISION_EVENT, handler)
    return () => window.removeEventListener(FORM_DIALOG_DECISION_EVENT, handler)
  }, [])

  // Filter & sort
  const filteredSteps = useMemo(() => {
    let list = [...steps]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          ((s as any).pm_workflowinstancelookupname ?? '').toLowerCase().includes(q) ||
          (s.pm_approvername ?? '').toLowerCase().includes(q) ||
          ((s as any).pm_assigneedisplayname ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'order':
          cmp = (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0)
          break
        case 'workflow':
          cmp = ((a as any).pm_workflowinstancelookupname ?? '').localeCompare(
            (b as any).pm_workflowinstancelookupname ?? ''
          )
          break
        case 'due':
          cmp = String(a.pm_duedate ?? '').localeCompare(String(b.pm_duedate ?? ''))
          break
        case 'assigned':
          cmp = ((a as any).pm_assigneedisplayname ?? '').localeCompare(
            (b as any).pm_assigneedisplayname ?? ''
          )
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [steps, searchQuery, sort])

  const paginatedSteps = useMemo(
    () => filteredSteps.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredSteps, page, rowsPerPage]
  )

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }, [])

  const handleApprove = useCallback(async (step: WorkflowApprovalStepModel) => {
    const id = step.pm_workflowapprovalstepid
    if (!id) return
    setActionLoading(id)
    setError(null)
    try {
      const ok = await approveWorkflowStep(id, currentUser?.fullname ?? 'Unknown')
      if (ok) {
        setSteps((prev) => prev.filter((s) => s.pm_workflowapprovalstepid !== id))
        setSuccessMsg('Step approved successfully.')
      } else {
        setError('Failed to approve step.')
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to approve step.')
    } finally {
      setActionLoading(null)
    }
  }, [currentUser])

  const handleReject = useCallback(async () => {
    const step = rejectDialog.step
    if (!step?.pm_workflowapprovalstepid) return
    setActionLoading(step.pm_workflowapprovalstepid)
    setError(null)
    try {
      const ok = await rejectWorkflowStep(
        step.pm_workflowapprovalstepid,
        currentUser?.fullname ?? 'Unknown',
        rejectDialog.reason
      )
      if (ok) {
        setSteps((prev) => prev.filter((s) => s.pm_workflowapprovalstepid !== step.pm_workflowapprovalstepid))
        setSuccessMsg('Step rejected.')
        setRejectDialog({ open: false, step: null, reason: '' })
      } else {
        setError('Failed to reject step.')
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to reject step.')
    } finally {
      setActionLoading(null)
    }
  }, [rejectDialog, currentUser])

  const handleSortClick = useCallback((field: SortField) => {
    setSort((prev) => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(0)
  }, [])

  const totalPending = filteredSteps.length

  return (
    <Box>
      <PageHeader
        title="Pending Approvals"
        subtitle={`${totalPending} step${totalPending !== 1 ? 's' : ''} awaiting your decision`}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by step, workflow, or assignee..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
            sx={{ minWidth: 280 }}
          />
          {searchQuery && (
            <Button size="small" onClick={() => { setSearchQuery(''); setPage(0) }}>
              Clear
            </Button>
          )}
        </Box>

        <TableShell
          loading={loading}
          empty={filteredSteps.length === 0}
          emptyIcon={<RateReviewIcon />}
          emptyTitle={
            !currentUser?.fullname
              ? 'No user selected — switch users from the top bar.'
              : searchQuery
              ? 'No pending approvals match your search.'
              : 'All clear! No approvals pending your decision.'
          }
        >
          <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
            <TableHeader cells={[
              { label: 'Step #', align: 'center', sortable: true, active: sort.field === 'order', dir: sort.dir, onClick: () => handleSortClick('order') },
              { label: 'Workflow', sortable: true, active: sort.field === 'workflow', dir: sort.dir, onClick: () => handleSortClick('workflow') },
              { label: 'Due Date', sortable: true, active: sort.field === 'due', dir: sort.dir, onClick: () => handleSortClick('due') },
              { label: 'Assigned To', sortable: true, active: sort.field === 'assigned', dir: sort.dir, onClick: () => handleSortClick('assigned') },
              { label: 'Form' },
              { label: '', align: 'right' },
            ]} />
            <TableBody>
              {paginatedSteps.map((step, idx) => {
                const isOverdue = step.pm_duedate && new Date(step.pm_duedate) < new Date()
                const isUrgent =
                  step.pm_duedate &&
                  !isOverdue &&
                  new Date(step.pm_duedate).getTime() - Date.now() < 86400000 * 2 // within 2 days

                return (
                  <TableRow
                    key={step.pm_workflowapprovalstepid}
                    hover
                    sx={{
                      bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                      '&:hover': { bgcolor: 'action.selected' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'secondary.main',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {step.pm_steporder ?? '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Step {step.pm_steporder ?? '?'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(step as any).pm_workflowinstancelookupname ?? '—'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {(step as any).pm_workflowinstancelookupname || '—'}
                      </Typography>
                      {(step as any).pm_entityid && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>
                          ID: {((step as any).pm_entityid as string).substring(0, 8)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <ScheduleIcon
                          sx={{
                            fontSize: 14,
                            color: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'text.secondary',
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: isOverdue ? 'error.main' : isUrgent ? 'warning.main' : 'inherit',
                            fontWeight: isOverdue || isUrgent ? 600 : 400,
                          }}
                        >
                          {formatDate(step.pm_duedate)}
                        </Typography>
                        {isOverdue && (
                          <StatusTag label="Overdue" size="small" color="error" />
                        )}
                        {isUrgent && !isOverdue && (
                          <StatusTag label="Urgent" size="small" color="warning" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{step.pm_approvername || step.pm_assigneedisplayname || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {step.pm_workflowapprovalstepid ? (
                        <TaskLink
                          stepId={step.pm_workflowapprovalstepid}
                          variant="chip"
                          label="Open Form"
                          buttonProps={{ disabled: actionLoading === step.pm_workflowapprovalstepid }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={actionLoading === step.pm_workflowapprovalstepid}
                          onClick={() => handleApprove(step)}
                          startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                          sx={{ fontWeight: 600, fontSize: 11, py: 0.5, minWidth: 80 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={actionLoading === step.pm_workflowapprovalstepid}
                          onClick={() => setRejectDialog({ open: true, step, reason: '' })}
                          startIcon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />}
                          sx={{ fontWeight: 600, fontSize: 11, py: 0.5, minWidth: 80 }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredSteps.length > 0 && (
          <TableFooter
            filteredCount={filteredSteps.length}
            totalCount={steps.length}
            itemLabel="pending step"
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
          />
        )}
      </Paper>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => !actionLoading && setRejectDialog({ open: false, step: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelOutlinedIcon sx={{ color: 'error.main' }} />
          Reject Approval Step
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejecting this approval step.
          </Typography>
          <TextField
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Explain why this step is being rejected..."
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => setRejectDialog({ open: false, step: null, reason: '' })}
            variant="outlined"
            disabled={!!actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={!!actionLoading}
            startIcon={actionLoading ? undefined : <CancelOutlinedIcon />}
            sx={{ fontWeight: 600 }}
          >
            {actionLoading ? 'Rejecting...' : 'Reject Step'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
