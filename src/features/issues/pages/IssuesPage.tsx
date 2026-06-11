import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BugReportIcon from '@mui/icons-material/BugReport'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import LowPriorityIcon from '@mui/icons-material/LowPriority'
import AddIcon from '@mui/icons-material/Add'

import {
  PageHeader,
  KpiCardRow,
  DetailDrawer,
  StatusTag,
  ActionIcon,
  ExportButton,
  Button,
  TableShell,
  ConfirmDialog,
  TabPanel,
} from '@/components/common'
import type { KpiCardItem } from '@/components/common'

import {
  fetchAllIssues,
  createIssueFull,
  updateIssueFull,
  deleteIssue,
  normalizeLookupId,
} from '@/services'
import type { IssueModel } from '@/types/dataverse'
import { formatDate } from '@/utils/formatters'
import { IssueDialog } from '../components'

// Constants
const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
  '2': 'Resource',
  '3': 'Financial',
  '4': 'Scope',
  '5': 'Quality',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'Red',
  '0': 'Amber',
  '1': 'Green',
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

export default function IssuesPage() {

  // ── State ─────────────────────────────────────────────────────────────────
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Drawer
  const [selectedIssue, setSelectedIssue] = useState<IssueModel | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<IssueModel | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<IssueModel | null>(null)

  // Load issues
  const loadIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllIssues()
      setIssues(data || [])
    } catch (err) {
      console.error('[IssuesPage] loadIssues error:', err)
      setError('Unable to load issues.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  // Cross-linking
  useEffect(() => {
    if (!loading && issues.length > 0) {
      const preselectedId = sessionStorage.getItem('preselectIssueId')
      if (preselectedId) {
        sessionStorage.removeItem('preselectIssueId')
        const issue = issues.find(i => normalizeLookupId(i.pm_issueid) === normalizeLookupId(preselectedId))
        if (issue) {
          setSelectedIssue(issue)
          setDrawerOpen(true)
        }
      }
    }
  }, [loading, issues])

  // Handlers
  const openCreate = () => {
    setEditingIssue(null)
    setDialogOpen(true)
  }

  const openEdit = (issue: IssueModel) => {
    setEditingIssue(issue)
    setDialogOpen(true)
  }

  const handleSave = async (data: Record<string, any>) => {
    if (!data.pm_issuetitle?.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingIssue?.pm_issueid) {
        const updated = await updateIssueFull(editingIssue.pm_issueid, data)
        if (updated) {
          setIssues(prev => prev.map(i => i.pm_issueid === updated.pm_issueid ? updated : i))
          setSuccessMsg('Issue updated.')
        }
      } else {
        const created = await createIssueFull(data)
        if (created) {
          setIssues(prev => [...prev, created])
          setSuccessMsg('Issue created.')
        }
      }
      setDialogOpen(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError('Unable to save issue.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_issueid) return
    setError(null)
    setSaving(true)
    try {
      await deleteIssue(deleteTarget.pm_issueid)
      setIssues(prev => prev.filter(i => i.pm_issueid !== deleteTarget.pm_issueid))
      setSuccessMsg('Issue deleted.')
      setDeleteTarget(null)
      if (selectedIssue?.pm_issueid === deleteTarget.pm_issueid) {
        setDrawerOpen(false)
        setSelectedIssue(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError('Unable to delete issue.')
    } finally {
      setSaving(false)
    }
  }

  // KPIs
  const kpiItems = useMemo(() => {
    const total = issues.length
    const open = issues.filter(i => String(i.pm_issuestatus ?? '') === '0').length
    const critical = issues.filter(i => String(i.pm_prioritylevel ?? '') === '1').length
    const escalated = issues.filter(i => i.pm_escalationstatus).length
    const resolved = issues.filter(i => String(i.pm_issuestatus ?? '') === '2' || String(i.pm_issuestatus ?? '') === '3').length
    const overdue = issues.filter(i => {
      if (String(i.pm_issuestatus) === '2' || String(i.pm_issuestatus) === '3') return false
      if (!i.pm_targetresolutiondate) return false
      return new Date(i.pm_targetresolutiondate) < new Date()
    }).length

    return [
      { label: 'Total Issues', value: total, color: 'primary.main', icon: <BugReportIcon /> },
      { label: 'Open Issues', value: open, color: 'warning.main', icon: <ErrorIcon />, subtitle: total > 0 ? `${Math.round((open/total)*100)}% of total` : 'None open' },
      { label: 'Critical Priority', value: critical, color: 'error.main', icon: <NewReleasesIcon /> },
      { label: 'Overdue', value: overdue, color: 'error.main', icon: <AccessTimeIcon />, subtitle: 'Target date passed' },
      { label: 'Escalated', value: escalated, color: 'error.main', icon: <FlagIcon /> },
      { label: 'Resolved', value: resolved, color: 'success.main', icon: <CheckCircleIcon /> },
    ] as KpiCardItem[]
  }, [issues])

  return (
    <Box>
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2 }}>{successMsg}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <PageHeader
        title="Issue Log"
        subtitle="Track and manage project issues, prioritize resolution, and monitor impact."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={issues} columns={[]} filename="issues" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Issue
            </Button>
          </Box>
        }
      />

      <KpiCardRow items={kpiItems} loading={loading} />

      <Box sx={{ height: 600, width: '100%', mt: 3 }}>
        <TableShell
          loading={loading}
          empty={issues.length === 0}
          emptyIcon={<BugReportIcon />}
          emptyTitle="No issues found."
          emptyMessage="Create your first issue to start tracking project issues."
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>Issue Title</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>RAG</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }}>Target Date</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 2.5, py: 1.5 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issues.map((issue) => (
                <TableRow
                  key={issue.pm_issueid}
                  hover
                  onClick={() => { setSelectedIssue(issue); setDrawerOpen(true); setDrawerTab(0) }}
                  sx={{ cursor: 'pointer', '& td': { px: 2.5, py: 1.25 } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }} color="text.secondary">
                      {issue.pm_issuereference || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {issue.pm_issuetitle || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {issue._pm_project_value ? 'Project Link' : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={ISSUE_CATEGORY_LABELS[String(issue.pm_issuecategory ?? '')] ?? 'Unknown'}
                      variant="outlined"
                      sx={{ borderColor: ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')], color: ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')] }}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={RAG_LABELS[String(issue.pm_ragstatus ?? '')] ?? '—'}
                      color={RAG_COLORS[String(issue.pm_ragstatus ?? '')] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {String(issue.pm_prioritylevel ?? '') === '1' && <NewReleasesIcon fontSize="small" sx={{ color: 'error.main' }} />}
                      {String(issue.pm_prioritylevel ?? '') === '0' && <PriorityHighIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                      {String(issue.pm_prioritylevel ?? '') === '2' && <LowPriorityIcon fontSize="small" sx={{ color: 'info.main' }} />}
                      <Typography variant="body2">{PRIORITY_LABELS[String(issue.pm_prioritylevel ?? '')] ?? 'Unknown'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{issue.pm_issueowner || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }} color="text.secondary">
                      {formatDate(issue.pm_targetresolutiondate) || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <ActionIcon icon={<EditIcon />} onClick={() => openEdit(issue)} label="Edit" />
                      <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteTarget(issue)} label="Delete" color="error" />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      </Box>

      {/* Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedIssue(null) }}
        title={selectedIssue?.pm_issuetitle ?? ''}
        subtitle={selectedIssue && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusTag label={ISSUE_CATEGORY_LABELS[String(selectedIssue.pm_issuecategory ?? '')] ?? '—'} variant="outlined" />
            <StatusTag label={RAG_LABELS[String(selectedIssue.pm_ragstatus ?? '')] ?? '—'} color={RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] || 'default'} />
            {selectedIssue.pm_escalationstatus && (
              <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FlagIcon sx={{ fontSize: 12 }} /> Escalated
              </Box>
            )}
          </Box>
        )}
        headerActions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <ActionIcon icon={<EditIcon />} onClick={() => openEdit(selectedIssue!)} label="Edit" />
            <ActionIcon icon={<DeleteIcon />} onClick={() => setDeleteTarget(selectedIssue)} label="Delete" color="error" />
          </Box>
        }
        tabs={[{ label: 'Overview' }, { label: 'Resolution' }]}
        tabValue={drawerTab}
        onTabChange={(_e, v) => setDrawerTab(v)}
      >
        {selectedIssue && (
          <>
            <TabPanel value={drawerTab} index={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                 <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Details</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                       {selectedIssue.pm_issuedescription || 'No description provided.'}
                    </Typography>
                 </Paper>
              </Box>
            </TabPanel>
            <TabPanel value={drawerTab} index={1}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                 <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Resolution details</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                       {selectedIssue.pm_resolutiondetails || 'No resolution details yet.'}
                    </Typography>
                 </Paper>
              </Box>
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      {/* Create / Edit Dialog */}
      <IssueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editingIssue}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Issue"
        message={`Are you sure you want to delete ${deleteTarget?.pm_issuetitle}?`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Box>
  )
}
