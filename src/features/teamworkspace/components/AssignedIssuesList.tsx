import { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material'
import BugReportIcon from '@mui/icons-material/BugReport'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { fontSizes } from '@/styles'
import { StatusTag, Button } from '@/components/common'
import type { IssueModel } from '@/types/dataverse'

const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
  '2': 'Resource',
  '3': 'Financial',
  '4': 'Scope',
  '5': 'Quality',
}

const ISSUE_CATEGORY_COLORS: Record<string, 'info' | 'secondary' | 'success' | 'warning' | 'error' | 'primary'> = {
  '0': 'info',
  '1': 'secondary',
  '2': 'success',
  '3': 'warning',
  '4': 'error',
  '5': 'primary',
}

const RAG_LABELS: Record<string, string> = {
  '0': 'Medium',
  '1': 'Low',
  '2': 'High',
}

const RAG_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  '0': 'warning',
  '1': 'success',
  '2': 'error',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Open',
  '1': 'In Progress',
  '2': 'Resolved',
  '3': 'Closed',
}

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  '0': 'warning',
  '1': 'info',
  '2': 'success',
  '3': 'default',
}

interface AssignedIssuesListProps {
  issues: IssueModel[]
  loading: boolean
  onLogIssue: () => void
  onViewIssue: (issue: IssueModel) => void
  projectNameMap?: Record<string, string>
  resourceNameMap?: Record<string, string>
}

export const AssignedIssuesList = ({
  issues,
  loading,
  onLogIssue,
  onViewIssue,
  projectNameMap,
  resourceNameMap,
}: AssignedIssuesListProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [ragFilter, setRagFilter] = useState('')

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const title = (issue.pm_issuetitle || '').toLowerCase()
        const desc = (issue.pm_issuedescription || '').toLowerCase()
        const ref = (issue.pm_issuereference || '').toLowerCase()
        const owner = (issue.pm_issueowner || '').toLowerCase()
        const projectName = (projectNameMap?.[(issue._pm_project_value || '').toLowerCase()] || '').toLowerCase()
        const ownerName = (resourceNameMap?.[(issue._pm_issueowner_value || '').toLowerCase()] || '').toLowerCase()
        if (!title.includes(q) && !desc.includes(q) && !ref.includes(q) && !owner.includes(q) && !projectName.includes(q) && !ownerName.includes(q)) {
          return false
        }
      }
      if (categoryFilter && String(issue.pm_issuecategory ?? '') !== categoryFilter) return false
      if (ragFilter && String(issue.pm_ragstatus ?? '') !== ragFilter) return false
      return true
    })
  }, [issues, searchQuery, categoryFilter, ragFilter])

  const hasActiveFilters = searchQuery || categoryFilter || ragFilter

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setRagFilter('')
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon sx={{ color: 'info.main', fontSize: 22 }} />
              My Assigned Issues
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {issues.length} issue{issues.length !== 1 ? 's' : ''} assigned to you
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onLogIssue}
            sx={{ fontWeight: 600 }}
          >
            Log Issue
          </Button>
        </Box>

        {/* Search & Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by title, description, reference…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: fontSizes.base },
              },
            }}
            sx={{ flex: '1 1 240px', maxWidth: 360 }}
          />
          <TextField
            select
            size="small"
            label="Category"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 140 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="RAG"
            value={ragFilter}
            onChange={e => setRagFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">All RAG</MenuItem>
            {Object.entries(RAG_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          {hasActiveFilters && (
            <Button size="small" variant="text" onClick={clearFilters} sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}>
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map(i => (
              <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ width: '60%', height: 14, bgcolor: 'action.hover' }} />
                  <Box sx={{ width: 60, height: 24, bgcolor: 'action.hover' }} />
                </Box>
              </Paper>
            ))}
          </Box>
        ) : filteredIssues.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <BugReportIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5, opacity: 0.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
              {hasActiveFilters ? 'No issues match your filters' : 'No issues assigned to you'}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
              {hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Click "Log Issue" to report a new problem.'}
            </Typography>
            {!hasActiveFilters && (
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={onLogIssue}>
                Log Your First Issue
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredIssues.map(issue => {
              const isOverdue = issue.pm_targetresolutiondate &&
                String(issue.pm_issuestatus ?? '') !== '2' &&
                String(issue.pm_issuestatus ?? '') !== '3' &&
                new Date(issue.pm_targetresolutiondate) < new Date()
              const isCritical = String(issue.pm_prioritylevel ?? '') === '1'
              const isEscalated = issue.pm_escalationstatus

              return (
                <Paper
                  key={issue.pm_issueid}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderLeft: '4px solid',
                    borderLeftColor: isEscalated
                      ? 'error.main'
                      : isOverdue
                        ? 'warning.main'
                        : RAG_COLORS[String(issue.pm_ragstatus ?? '')] || 'primary.main',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                      boxShadow: theme => `0 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}`,
                    },
                  }}
                  onClick={() => onViewIssue(issue)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                        {issue.pm_issuetitle || 'Untitled Issue'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                        }}
                      >
                        {issue.pm_issuedescription || 'No description provided.'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      {isEscalated && (
                        <Tooltip title="Escalated">
                          <Chip
                            label="Escalated"
                            color="error"
                            size="small"
                            sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                          />
                        </Tooltip>
                      )}
                      <Tooltip title="View details">
                        <IconButton size="small" sx={{ color: 'text.secondary' }}>
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatusTag
                      label={ISSUE_CATEGORY_LABELS[String(issue.pm_issuecategory ?? '')] ?? '—'}
                      variant="outlined"
                      color={ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')] || 'default'}
                      sx={{
                        fontSize: fontSizes.xs,
                      }}
                    />
                    <StatusTag
                      label={RAG_LABELS[String(issue.pm_ragstatus ?? '')] ?? '—'}
                      color={RAG_COLORS[String(issue.pm_ragstatus ?? '')] || 'default'}
                      variant="subtle"
                    />
                    <StatusTag
                      label={STATUS_LABELS[String(issue.pm_issuestatus ?? '')] ?? '—'}
                      variant="filled"
                      color={STATUS_COLORS[String(issue.pm_issuestatus ?? '')] || 'default'}
                      sx={{
                        fontSize: fontSizes.xs,
                      }}
                    />
                    {isCritical && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PriorityHighIcon sx={{ fontSize: 14, color: 'error.main' }} />
                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                          Critical
                        </Typography>
                      </Box>
                    )}
                    {projectNameMap?.[(issue._pm_project_value || '').toLowerCase()] && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}>
                          {projectNameMap[(issue._pm_project_value || '').toLowerCase()]}
                        </Typography>
                      </Box>
                    )}
                    {(resourceNameMap?.[(issue._pm_issueowner_value || '').toLowerCase()] || issue.pm_issueowner) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {resourceNameMap?.[(issue._pm_issueowner_value || '').toLowerCase()] || issue.pm_issueowner}
                        </Typography>
                      </Box>
                    )}
                    {issue.pm_targetresolutiondate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 13, color: isOverdue ? 'error.main' : 'text.disabled' }} />
                        <Typography
                          variant="caption"
                          color={isOverdue ? 'error.main' : 'text.secondary'}
                          sx={{ fontWeight: isOverdue ? 700 : 400 }}
                        >
                          {new Date(issue.pm_targetresolutiondate).toLocaleDateString()}
                          {isOverdue ? ' (Overdue)' : ''}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              )
            })}
          </Box>
        )}
      </Box>
    </Paper>
  )
}

export default AssignedIssuesList
