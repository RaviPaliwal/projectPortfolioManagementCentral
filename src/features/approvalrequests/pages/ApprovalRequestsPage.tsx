import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Box,
  Alert,
  useTheme,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material"
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ChecklistIcon from '@mui/icons-material/Checklist'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import FlagIcon from '@mui/icons-material/Flag'

import {
  fetchApprovalRequests,
  createApprovalRequest,
  updateApprovalRequest,
  deleteApprovalRequest,
} from '@/services'
import type { ApprovalRequestModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, ExportButton, StatusTag, ActionIcon, Button } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import { fontSizes } from '@/styles'
import { formatDate } from '@/utils/formatters'

// Sub-components
import { ApprovalDialogs } from '../components/ApprovalDialogs'

const STAGE_LABELS: Record<string, string> = {
  '0': 'New',
  '1': 'Under Review',
  '2': 'Approved',
  '3': 'Rejected',
  '4': 'Delegated',
}

const STAGE_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  '0': 'default',
  '1': 'warning',
  '2': 'success',
  '3': 'error',
  '4': 'info',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  '0': 'Project',
  '1': 'Programme',
  '2': 'Portfolio',
  '3': 'Change Request',
  '4': 'Budget Line',
  '5': 'Initiative',
}

const PRIORITY_LABELS: Record<string, string> = {
  '0': 'Standard',
  '1': 'High',
  '2': 'Urgent',
}

const PRIORITY_COLORS: Record<string, 'default' | 'warning' | 'error'> = {
  '0': 'default',
  '1': 'warning',
  '2': 'error',
}

const approvalExportColumns: ExportColumn[] = [
  { key: 'pm_requesttitle', label: 'Title' },
  { key: 'pm_approvalstagename', label: 'Stage' },
  { key: 'pm_entitytypename', label: 'Entity Type' },
  { key: 'pm_prioritylevelname', label: 'Priority' },
  { key: 'pm_approvername', label: 'Approver' },
  { key: 'pm_requestorname', label: 'Requestor' },
  { key: 'pm_duedate', label: 'Due Date' },
  { key: 'pm_decisionstatusname', label: 'Decision' },
]

const STAGE_FILTERS: FilterOption[] = [
  { value: '', label: 'All Stages' },
  { value: '0', label: 'New' },
  { value: '1', label: 'Under Review' },
  { value: '2', label: 'Approved' },
  { value: '3', label: 'Rejected' },
]

const ENTITY_FILTERS: FilterOption[] = [
  { value: '', label: 'All Entity Types' },
  { value: '0', label: 'Project' },
  { value: '1', label: 'Programme' },
  { value: '2', label: 'Portfolio' },
  { value: '3', label: 'Change Request' },
]

const PRIORITY_FILTERS: FilterOption[] = [
  { value: '', label: 'All Priorities' },
  { value: '0', label: 'Standard' },
  { value: '1', label: 'High' },
  { value: '2', label: 'Urgent' },
]

export default function ApprovalRequestsPage() {
  const theme = useTheme()
  const [requests, setRequests] = useState<ApprovalRequestModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestModel | null>(null)

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApprovalRequestModel | null>(null)
  const [formData, setFormData] = useState<Partial<ApprovalRequestModel>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [dialogLoading, setDialogLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApprovalRequests()
      setRequests(data ?? [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load approval requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredRequests = useMemo(() => {
    let list = [...requests]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((r) => (r.pm_requesttitle?.toLowerCase() || '').includes(q))
    }
    if (stageFilter) list = list.filter((r) => String(r.pm_approvalstage ?? '') === stageFilter)
    if (entityFilter) list = list.filter((r) => String(r.pm_entitytype ?? '') === entityFilter)
    if (priorityFilter) list = list.filter((r) => String(r.pm_prioritylevel ?? '') === priorityFilter)
    return list
  }, [requests, searchQuery, stageFilter, entityFilter, priorityFilter])

  const kpiItems: KpiCardItem[] = useMemo(() => [
    { label: 'Total Requests', value: requests.length, icon: <ChecklistIcon />, color: 'primary.main' },
    { label: 'Pending', value: requests.filter(r => r.pm_approvalstage === 0 || r.pm_approvalstage === 1).length, icon: <HourglassEmptyIcon />, color: 'warning.main' },
    { label: 'Approved', value: requests.filter(r => r.pm_approvalstage === 2).length, icon: <ThumbUpIcon />, color: 'success.main' },
    { label: 'Urgent', value: requests.filter(r => r.pm_prioritylevel === 2).length, icon: <PriorityHighIcon />, color: 'error.main' },
  ], [requests])

  const handleSave = async () => {
    if (!formData.pm_requesttitle) {
      setFormErrors({ pm_requesttitle: 'Title is required' })
      return
    }
    setDialogLoading(true)
    try {
      if (dialogMode === 'create') {
        await createApprovalRequest(formData as ApprovalRequestModel)
        setSuccessMsg('Request created')
      } else {
        await updateApprovalRequest(formData.pm_projectapprovalrequestid!, formData as ApprovalRequestModel)
        setSuccessMsg('Request updated')
      }
      setDialogMode(null)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDialogLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await deleteApprovalRequest(deleteTarget.pm_projectapprovalrequestid!)
      setSuccessMsg('Request deleted')
      setDeleteTarget(null)
      if (selectedRequest?.pm_projectapprovalrequestid === deleteTarget.pm_projectapprovalrequestid) setSelectedRequest(null)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Approval Requests"
        subtitle="Manage and track approval workflows for projects and other entities."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredRequests} columns={approvalExportColumns} filename="Approvals" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setDialogMode('create') }}>
              New Request
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {!loading && <KpiCardRow items={kpiItems} />}

      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterValue={stageFilter}
          onFilterChange={setStageFilter}
          filterLabel="Stage"
          filterOptions={STAGE_FILTERS}
          onClear={() => { setSearchQuery(''); setStageFilter(''); setEntityFilter(''); setPriorityFilter('') }}
          extraFilters={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <SearchFilterBar filterValue={entityFilter} onFilterChange={setEntityFilter} filterLabel="Entity" filterOptions={ENTITY_FILTERS} sx={{ border: 'none', p: 0, minWidth: 140 }} />
              <SearchFilterBar filterValue={priorityFilter} onFilterChange={setPriorityFilter} filterLabel="Priority" filterOptions={PRIORITY_FILTERS} sx={{ border: 'none', p: 0, minWidth: 140 }} />
            </Box>
          }
        />

        <TableShell loading={loading} empty={filteredRequests.length === 0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Entity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((req) => (
                <TableRow key={req.pm_projectapprovalrequestid} hover onClick={() => setSelectedRequest(req)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{req.pm_requesttitle}</TableCell>
                  <TableCell>
                    <StatusTag label={STAGE_LABELS[String(req.pm_approvalstage)] || '—'} color={STAGE_COLORS[String(req.pm_approvalstage)] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>{ENTITY_TYPE_LABELS[String(req.pm_entitytype)] || '—'}</TableCell>
                  <TableCell>
                    <StatusTag label={PRIORITY_LABELS[String(req.pm_prioritylevel)] || '—'} color={PRIORITY_COLORS[String(req.pm_prioritylevel)] || 'default'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{formatDate(req.pm_duedate)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <ActionIcon icon={<EditIcon />} onClick={() => { setFormData(req); setDialogMode('edit') }} label="Edit" color="primary" />
                      <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteTarget(req)} label="Delete" color="error" />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      </Paper>

      <DetailDrawer
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.pm_requesttitle ?? ''}
        icon={<ChecklistIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <ActionIcon icon={<EditIcon />} onClick={() => { setFormData(selectedRequest!); setDialogMode('edit') }} label="Edit" color="primary" />
            <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedRequest)} label="Delete" color="error" />
          </Box>
        }
      >
        {selectedRequest && (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedRequest.pm_decisionnotes || 'No description'}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Requestor</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRequest.pm_requestorname || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Approver</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRequest.pm_approvername || '—'}</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DetailDrawer>

      <ApprovalDialogs
        dialogMode={dialogMode}
        onClose={() => setDialogMode(null)}
        formData={formData}
        onFieldChange={(f, v) => setFormData(prev => ({ ...prev, [f]: v }))}
        formErrors={formErrors}
        loading={dialogLoading}
        onSave={handleSave}
        deleteTarget={deleteTarget}
        onDeleteClose={() => setDeleteTarget(null)}
        onDeleteConfirm={handleDelete}
        actionLoading={actionLoading}
        stageOptions={STAGE_FILTERS}
        entityOptions={ENTITY_FILTERS}
        priorityOptions={PRIORITY_FILTERS}
      />
    </Box>
  )
}
