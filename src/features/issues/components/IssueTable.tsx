import React, { useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import BugReportIcon from '@mui/icons-material/BugReport'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import LowPriorityIcon from '@mui/icons-material/LowPriority'
import FlagIcon from '@mui/icons-material/Flag'

import type { IssueModel } from '@/types/dataverse'
import { DataverseTable, StatusTag, type Column } from '@/components/common'
import { formatDate } from '@/utils/formatters'

interface IssueTableProps {
  issues: IssueModel[]
  loading: boolean
  onEdit: (issue: IssueModel) => void
  onDelete: (issue: IssueModel) => void
  onSelect: (issue: IssueModel) => void
  categoryFilter: string
  setCategoryFilter: (val: string) => void
  ragFilter: string
  setRagFilter: (val: string) => void
  priorityFilter: string
  setPriorityFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  openCreate: () => void
  canEdit?: boolean
  canDelete?: boolean
  projectNameMap?: Record<string, string>
  resourceNameMap?: Record<string, string>
}

// Constants
const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'High',
  '0': 'Medium',
  '1': 'Low',
}

const PRIORITY_LABELS: Record<string, string> = {
  '1': 'Critical',
  '0': 'High',
  '2': 'Medium',
  '3': 'Low',
}

const ISSUE_CATEGORY_COLORS: Record<string, string> = {
  '0': 'info.main',
  '1': 'secondary.main',
  '2': 'success.main',
  '3': 'warning.main',
  '4': 'error.main',
  '5': '#8b5cf6',
}

const RAG_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  '2': 'error',
  '0': 'warning',
  '1': 'success',
}

const ISSUE_STATUS_LABELS: Record<string, string> = {
  '0': 'Open',
  '1': 'In Progress',
  '2': 'Resolved',
  '3': 'Closed',
}

const ISSUE_STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  '0': 'warning',
  '1': 'info',
  '2': 'success',
  '3': 'default',
}

export const IssueTable: React.FC<IssueTableProps> = ({
  issues,
  loading,
  onEdit,
  onDelete,
  onSelect,
  categoryFilter,
  setCategoryFilter,
  ragFilter,
  setRagFilter,
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  openCreate,
  canEdit = true,
  canDelete = true,
  projectNameMap = {},
  resourceNameMap = {}
}) => {
  const columns: Column<IssueModel>[] = useMemo(() => [
    {
      key: 'pm_issuetitle',
      label: 'Issue Title',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {val ?? '—'}
        </Typography>
      )
    },
    {
      key: '_pm_project_value',
      label: 'Project',
      format: (val: any) => (
        <Typography variant="body2" color="text.secondary">
          {projectNameMap[(val || '').toLowerCase()] || '—'}
        </Typography>
      )
    },
    {
      key: 'pm_issuecategory',
      label: 'Category',
      format: (val: any) => (
        <StatusTag
          label={ISSUE_CATEGORY_LABELS[String(val ?? '')] ?? '—'}
          variant="outlined"
          sx={{ borderColor: ISSUE_CATEGORY_COLORS[String(val ?? '')], color: ISSUE_CATEGORY_COLORS[String(val ?? '')] }}
        />
      )
    },
    {
      key: 'pm_ragstatus',
      label: 'RAG',
      format: (val: any) => (
        <StatusTag
          label={RAG_LABELS[String(val)] ?? '—'}
          color={RAG_COLORS[String(val)] || 'default'}
        />
      )
    },
    {
      key: 'pm_prioritylevel',
      label: 'Priority',
      format: (val: any) => {
        const pLevel = String(val)
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {pLevel === '1' && <NewReleasesIcon fontSize="small" sx={{ color: 'error.main' }} />}
            {pLevel === '0' && <PriorityHighIcon fontSize="small" sx={{ color: 'warning.main' }} />}
            {pLevel === '2' && <LowPriorityIcon fontSize="small" sx={{ color: 'info.main' }} />}
            <Typography variant="body2">{PRIORITY_LABELS[pLevel] ?? '—'}</Typography>
          </Box>
        )
      }
    },
    {
      key: '_pm_issueowner_value',
      label: 'Owner',
      format: (val: any, issue: IssueModel) => (
        <Typography variant="body2">
          {resourceNameMap[(val || '').toLowerCase()] || issue.pm_issueowner || '—'}
        </Typography>
      )
    },
    {
      key: 'pm_targetresolutiondate',
      label: 'Target Date',
      format: (val: any) => (
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
          {formatDate(val) || '—'}
        </Typography>
      )
    },
    {
      key: 'pm_issuestatus',
      label: 'Status',
      format: (val: any) => (
        <StatusTag
          label={ISSUE_STATUS_LABELS[String(val ?? '')] ?? '—'}
          color={ISSUE_STATUS_COLORS[String(val ?? '')] ?? 'default'}
        />
      )
    }
  ], [projectNameMap, resourceNameMap])

  const filteredData = useMemo(() => {
    return issues.filter((i) => {
      if (categoryFilter !== 'all' && String(i.pm_issuecategory ?? '') !== categoryFilter) return false
      if (ragFilter !== 'all' && String(i.pm_ragstatus ?? '') !== ragFilter) return false
      if (priorityFilter !== 'all' && String(i.pm_prioritylevel ?? '') !== priorityFilter) return false
      if (statusFilter !== 'all' && String(i.pm_issuestatus ?? '') !== statusFilter) return false
      return true
    })
  }, [issues, categoryFilter, ragFilter, priorityFilter, statusFilter])

  const handleClear = useCallback(() => {
    setCategoryFilter('all')
    setRagFilter('all')
    setPriorityFilter('all')
    setStatusFilter('all')
  }, [setCategoryFilter, setRagFilter, setPriorityFilter, setStatusFilter])

  const actions = useCallback((issue: IssueModel) => (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
      {issue.pm_escalationstatus === true && (
        <Tooltip title="Escalated Issue">
          <FlagIcon color="error" sx={{ mr: 0.5, alignSelf: 'center', fontSize: 16 }} />
        </Tooltip>
      )}
      {canEdit && (
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onEdit(issue) }}
          sx={{ color: 'primary.main' }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}
      {canDelete && (
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(issue) }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  ), [canEdit, canDelete, onEdit, onDelete])

  return (
    <DataverseTable
      data={filteredData}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by title, owner, description…"
      searchFields={['pm_issuetitle', 'pm_issuedescription', 'pm_issueowner']}
      emptyIcon={<BugReportIcon />}
      emptyTitle="No issues found"
      onRowClick={onSelect}
      actions={actions}
      exportFileName="issues_register"
      itemLabel="issue"
      extraFilters={
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 130 }}
          >
            <option value="all">All</option>
            {Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="RAG"
            value={ragFilter}
            onChange={(e) => setRagFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 110 }}
          >
            <option value="all">All</option>
            {Object.entries(RAG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 130 }}
          >
            <option value="all">All</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 140 }}
          >
            <option value="all">All</option>
            {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
        </Box>
      }
      onClearFilters={handleClear}
    />
  )
}
