import React from 'react'
import {
  Box,
  Typography,
  IconButton,
  Table,
  TextField,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  useTheme,
  MenuItem,
  Button,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AddIcon from '@mui/icons-material/Add'
import BugReportIcon from '@mui/icons-material/BugReport'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import LowPriorityIcon from '@mui/icons-material/LowPriority'

import type { IssueModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { TableFooter, TableShell, SearchFilterBar, StatusTag, TableHeader } from '@/components/common'
import { useDataGrid } from '@/hooks/useDataGrid'
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
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const {
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredData,
    paginatedData,
    filteredCount,
    totalCount,
    reset,
  } = useDataGrid(issues, {
    initialSort: { field: 'pm_issuetitle', dir: 'asc' },
    searchFields: ['pm_issuetitle', 'pm_issuedescription', 'pm_issueowner'],
    filterFn: (i) => {
      if (categoryFilter !== 'all' && String(i.pm_issuecategory ?? '') !== categoryFilter) return false
      if (ragFilter !== 'all' && String(i.pm_ragstatus ?? '') !== ragFilter) return false
      if (priorityFilter !== 'all' && String(i.pm_prioritylevel ?? '') !== priorityFilter) return false
      if (statusFilter !== 'all' && String(i.pm_issuestatus ?? '') !== statusFilter) return false
      return true
    },
  })

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }} variant="outlined">
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by title, owner, description…"
        onClear={() => {
          reset()
          setCategoryFilter('all')
          setRagFilter('all')
          setPriorityFilter('all')
          setStatusFilter('all')
        }}
        extraFilters={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ minWidth: 130 }}>
              <TextField
                select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ minWidth: 110 }}>
              <TextField
                select
                label="RAG"
                value={ragFilter}
                onChange={(e) => setRagFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(RAG_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ minWidth: 130 }}>
              <TextField
                select
                label="Priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ minWidth: 140 }}>
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        }
      />

      <TableShell
        loading={loading}
        empty={filteredCount === 0}
        emptyIcon={<BugReportIcon />}
        emptyTitle={searchQuery || categoryFilter !== 'all' || ragFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
          ? 'No issues match your criteria.'
          : 'No issues found.'}
        emptyAction={!searchQuery && categoryFilter === 'all' && ragFilter === 'all' && priorityFilter === 'all' && statusFilter === 'all' && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
            Add your first issue
          </Button>
        )}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHeader cells={[
            { label: '#', width: 50 },
            { label: 'Issue Title', sortable: true, active: sort.field === 'pm_issuetitle', dir: sort.dir, onClick: () => setSort('pm_issuetitle') },
            { label: 'Project' },
            { label: 'Category', sortable: true, active: sort.field === 'pm_issuecategory', dir: sort.dir, onClick: () => setSort('pm_issuecategory') },
            { label: 'RAG', sortable: true, active: sort.field === 'pm_ragstatus', dir: sort.dir, onClick: () => setSort('pm_ragstatus') },
            { label: 'Priority', sortable: true, active: sort.field === 'pm_prioritylevel', dir: sort.dir, onClick: () => setSort('pm_prioritylevel') },
            { label: 'Owner' },
            { label: 'Target Date', sortable: true, active: sort.field === 'pm_targetresolutiondate', dir: sort.dir, onClick: () => setSort('pm_targetresolutiondate') },
            { label: 'Status', sortable: true, active: sort.field === 'pm_issuestatus', dir: sort.dir, onClick: () => setSort('pm_issuestatus') },
            { label: 'Actions', align: 'right' }
          ]} />
          <TableBody>
            {paginatedData.map((issue, idx) => {
              const pLevel = String(issue.pm_prioritylevel)
              const ragVal = String(issue.pm_ragstatus)

              return (
                <TableRow
                  key={issue.pm_issueid}
                  hover
                  onClick={() => onSelect(issue)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.selected' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell sx={{ color: 'text.secondary', fontSize: fontSizes.xs }}>{page * rowsPerPage + idx + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {issue.pm_issuetitle ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {projectNameMap[(issue._pm_project_value || '').toLowerCase()] || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={ISSUE_CATEGORY_LABELS[String(issue.pm_issuecategory ?? '')] ?? '—'}
                      variant="outlined"
                      sx={{ borderColor: ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')], color: ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')] }}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={RAG_LABELS[ragVal] ?? '—'}
                      color={RAG_COLORS[ragVal] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {pLevel === '1' && <NewReleasesIcon fontSize="small" sx={{ color: 'error.main' }} />}
                      {pLevel === '0' && <PriorityHighIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                      {pLevel === '2' && <LowPriorityIcon fontSize="small" sx={{ color: 'info.main' }} />}
                      <Typography variant="body2">{PRIORITY_LABELS[pLevel] ?? '—'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {resourceNameMap[(issue._pm_issueowner_value || '').toLowerCase()] || issue.pm_issueowner || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {formatDate(issue.pm_targetresolutiondate) || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={ISSUE_STATUS_LABELS[String(issue.pm_issuestatus ?? '')] ?? '—'}
                      color={ISSUE_STATUS_COLORS[String(issue.pm_issuestatus ?? '')] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {canEdit && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onEdit(issue) }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onDelete(issue) }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filteredCount > 0 && (
        <TableFooter
          filteredCount={filteredCount}
          totalCount={totalCount}
          itemLabel="issue"
        />
      )}
      {!loading && filteredCount > 0 && (
        <TablePagination
          component="div"
          count={filteredCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsPerPageOptions={[5, 10, 20]}
        />
      )}
    </Paper>
  )
}
