import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Alert, Chip, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import PowerIcon from '@mui/icons-material/Power'
import PowerOffIcon from '@mui/icons-material/PowerOff'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { WorkflowModel, WorkflowInstanceModel, WorkflowApprovalStepModel, WorkflowStepTemplateModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import {
  fetchWorkflows, deleteWorkflow,
  fetchWorkflowInstances, fetchWorkflowApprovalSteps, deleteWorkflowInstance,
  fetchWorkflowStepTemplates,
} from '@/lib/dataverseClient'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, TabPanel, ExportButton } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

// Sub-page imports
import WorkflowCreatePage from './WorkflowCreatePage'
import WorkflowEditPage from './WorkflowEditPage'
import WorkflowStepConfigPage from './WorkflowStepConfigPage'

const STATUS_LABELS: Record<string, string> = { '0': 'Active', '1': 'Inactive' }
const INSTANCE_STATUS_LABELS: Record<string, string> = { '0': 'Completed', '1': 'Active' }
const INSTANCE_STATUS_COLORS: Record<string, 'success' | 'warning'> = { '0': 'success', '1': 'warning' }
const APPROVAL_STATUS_LABELS: Record<string, string> = { '0': 'Approved', '1': 'Pending' }
const APPROVAL_STATUS_COLORS: Record<string, 'success' | 'warning'> = { '0': 'success', '1': 'warning' }

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '\u2014'

const STATUS_FILTERS: FilterOption[] = [
  { value: '', label: 'All Statuses' }, { value: '0', label: 'Active' }, { value: '1', label: 'Inactive' },
]
const INSTANCE_STATUS_FILTERS: FilterOption[] = [
  { value: '', label: 'All Statuses' }, { value: '0', label: 'Completed' }, { value: '1', label: 'Active' },
]

const workflowExportColumns: ExportColumn[] = [
  { key: 'pm_workflowname', label: 'Workflow Name' },
  { key: 'pm_entitytypename', label: 'Entity Type' },
  { key: 'pm_workflowstatusname', label: 'Status' },
]
const instanceExportColumns: ExportColumn[] = [
  { key: 'pm_workflowname', label: 'Workflow' },
  { key: 'pm_instanceidentifier', label: 'Instance' },
  { key: 'pm_entityid', label: 'Entity ID' },
  { key: 'pm_workflowstatusname', label: 'Status' },
]
const stepExportColumns: ExportColumn[] = [
  { key: 'pm_stepname', label: 'Step' },
  { key: 'pm_steporder', label: 'Order' },
  { key: 'pm_approvername', label: 'Approver' },
  { key: 'pm_decisionstatusname', label: 'Decision' },
]

type WfSortField = 'name' | 'status' | 'entity'
type InstSortField = 'workflow' | 'entity' | 'status' | 'date'
type StepSortField = 'name' | 'order' | 'approver' | 'decision'
type SortDir = 'asc' | 'desc'
interface SortState<T> { field: T; dir: SortDir }

type ViewMode = 'list' | 'create' | 'edit' | 'steps'

export default function WorkflowsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // View routing
  const [view, setView] = useState<ViewMode>('list')
  const [viewWorkflow, setViewWorkflow] = useState<WorkflowModel | null>(null)

  // Data
  const [workflows, setWorkflows] = useState<WorkflowModel[]>([])
  const [instances, setInstances] = useState<WorkflowInstanceModel[]>([])
  const [steps, setSteps] = useState<WorkflowApprovalStepModel[]>([])
  const [stepTemplates, setStepTemplates] = useState<WorkflowStepTemplateModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // List view state
  const [pageTab, setPageTab] = useState(0)
  const [wfSearch, setWfSearch] = useState('')
  const [wfStatusFilter, setWfStatusFilter] = useState('')
  const [wfSort, setWfSort] = useState<SortState<WfSortField>>({ field: 'name', dir: 'asc' })
  const [wfPage, setWfPage] = useState(0)
  const [wfRowsPerPage, setWfRowsPerPage] = useState(25)
  const [instSearch, setInstSearch] = useState('')
  const [instStatusFilter, setInstStatusFilter] = useState('')
  const [instSort, setInstSort] = useState<SortState<InstSortField>>({ field: 'date', dir: 'desc' })
  const [instPage, setInstPage] = useState(0)
  const [instRowsPerPage, setInstRowsPerPage] = useState(25)
  const [stepSearch, setStepSearch] = useState('')
  const [stepSort, setStepSort] = useState<SortState<StepSortField>>({ field: 'order', dir: 'asc' })
  const [stepPage, setStepPage] = useState(0)
  const [stepRowsPerPage, setStepRowsPerPage] = useState(25)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'workflow' | 'instance' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wfList, instList] = await Promise.all([fetchWorkflows(), fetchWorkflowInstances()])
      setWorkflows(wfList)
      setInstances(instList)
    } catch (err) {
      setError('Unable to load workflow data. ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
    try {
      const stList = await fetchWorkflowStepTemplates()
      setStepTemplates(stList)
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!selectedInstanceId) { setSteps([]); return }
    setStepsLoading(true)
    fetchWorkflowApprovalSteps(selectedInstanceId)
      .then((data) => setSteps(data))
      .catch(() => setError('Unable to load approval steps.'))
      .finally(() => setStepsLoading(false))
  }, [selectedInstanceId])

  // ─── KPI Cards ───
  const kpiItems = useMemo((): KpiCardItem[] => {
    const totalTemplates = workflows.length
    const activeTemplates = workflows.filter((w) => w.pm_workflowstatus === 0 || w.pm_workflowstatus === '0').length
    const activeInsts = instances.filter((i) => i.pm_workflowstatus === 1 || i.pm_workflowstatus === '1').length
    const completedInsts = instances.filter((i) => i.pm_workflowstatus === 0 || i.pm_workflowstatus === '0').length
    return [
      { label: 'Workflow Templates', value: totalTemplates, subtitle: 'Defined workflows', icon: <AccountTreeIcon />, color: '#6366f1' },
      { label: 'Active Templates', value: activeTemplates, subtitle: totalTemplates > 0 ? Math.round((activeTemplates / totalTemplates) * 100) + '% of templates' : 'No templates', icon: <PlayArrowIcon />, color: '#22c55e' },
      { label: 'Active Instances', value: activeInsts, subtitle: 'Currently running', icon: <ScheduleIcon />, color: '#f59e0b' },
      { label: 'Completed Instances', value: completedInsts, subtitle: 'Successfully finished', icon: <CheckCircleIcon />, color: '#0ea5e9' },
      { label: 'Step Templates', value: stepTemplates.length, subtitle: 'Configured steps', icon: <SettingsIcon />, color: '#8b5cf6' },
    ]
  }, [workflows, instances, stepTemplates])

  // ─── Filtering & Sorting ───
  const filteredWorkflows = useMemo(() => {
    let list = [...workflows]
    if (wfSearch.trim()) {
      const q = wfSearch.toLowerCase()
      list = list.filter((w) =>
        (w.pm_workflowname ?? '').toLowerCase().includes(q) ||
        ((w as any).pm_workflowdescription ?? '').toLowerCase().includes(q)
      )
    }
    if (wfStatusFilter) list = list.filter((w) => String(w.pm_workflowstatus ?? (w as any).statecode) === wfStatusFilter)
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (wfSort.field) {
        case 'name': cmp = (a.pm_workflowname ?? '').localeCompare(b.pm_workflowname ?? ''); break
        case 'status': cmp = String(a.pm_workflowstatus ?? '').localeCompare(String(b.pm_workflowstatus ?? '')); break
        case 'entity': cmp = String((a as any).pm_entitytypename ?? '').localeCompare(String((b as any).pm_entitytypename ?? '')); break
      }
      return wfSort.dir === 'asc' ? cmp : -cmp
    })
  }, [workflows, wfSearch, wfStatusFilter, wfSort])

  const paginatedWorkflows = useMemo(() => filteredWorkflows.slice(wfPage * wfRowsPerPage, wfPage * wfRowsPerPage + wfRowsPerPage), [filteredWorkflows, wfPage, wfRowsPerPage])

  const filteredInstances = useMemo(() => {
    let list = [...instances]
    if (instSearch.trim()) {
      const q = instSearch.toLowerCase()
      list = list.filter((i) =>
        (i.pm_workflowname ?? '').toLowerCase().includes(q) ||
        ((i as any).pm_initiatedby ?? '').toLowerCase().includes(q)
      )
    }
    if (instStatusFilter) list = list.filter((i) => String(i.pm_workflowstatus ?? '') === instStatusFilter)
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (instSort.field) {
        case 'workflow': cmp = (a.pm_workflowname ?? '').localeCompare(b.pm_workflowname ?? ''); break
        case 'entity': cmp = String((a as any).pm_entityid ?? '').localeCompare(String((b as any).pm_entityid ?? '')); break
        case 'status': cmp = String(a.pm_workflowstatus ?? '').localeCompare(String(b.pm_workflowstatus ?? '')); break
        case 'date': cmp = String((a as any).pm_initiationdate ?? '').localeCompare(String((b as any).pm_initiationdate ?? '')); break
      }
      return instSort.dir === 'asc' ? cmp : -cmp
    })
  }, [instances, instSearch, instStatusFilter, instSort])

  const paginatedInstances = useMemo(() => filteredInstances.slice(instPage * instRowsPerPage, instPage * instRowsPerPage + instRowsPerPage), [filteredInstances, instPage, instRowsPerPage])

  const filteredSteps = useMemo(() => {
    let list = [...steps]
    if (stepSearch.trim()) {
      const q = stepSearch.toLowerCase()
      list = list.filter((s) =>
        (s.pm_stepname ?? '').toLowerCase().includes(q) ||
        (s.pm_approvername ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (stepSort.field) {
        case 'name': cmp = (a.pm_stepname ?? '').localeCompare(b.pm_stepname ?? ''); break
        case 'order': cmp = (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0); break
        case 'approver': cmp = (a.pm_approvername ?? '').localeCompare(b.pm_approvername ?? ''); break
        case 'decision': cmp = String(a.pm_decisionstatus ?? '').localeCompare(String(b.pm_decisionstatus ?? '')); break
      }
      return stepSort.dir === 'asc' ? cmp : -cmp
    })
  }, [steps, stepSearch, stepSort])

  const paginatedSteps = useMemo(() => filteredSteps.slice(stepPage * stepRowsPerPage, stepPage * stepRowsPerPage + stepRowsPerPage), [filteredSteps, stepPage, stepRowsPerPage])

  // ─── Handlers ───
  const handleWfSort = useCallback((field: WfSortField) => setWfSort((p) => ({ field, dir: p.field === field && p.dir === 'asc' ? 'desc' : 'asc' })), [])
  const handleInstSort = useCallback((field: InstSortField) => setInstSort((p) => ({ field, dir: p.field === field && p.dir === 'asc' ? 'desc' : 'asc' })), [])
  const handleStepSort = useCallback((field: StepSortField) => setStepSort((p) => ({ field, dir: p.field === field && p.dir === 'asc' ? 'desc' : 'asc' })), [])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      if (deleteConfirm.type === 'workflow') await deleteWorkflow(deleteConfirm.id)
      else await deleteWorkflowInstance(deleteConfirm.id)
      setSuccessMsg(deleteConfirm.type === 'workflow' ? 'Workflow deleted.' : 'Instance deleted.')
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch { setError('Unable to delete.') }
    finally { setActionLoading(false) }
  }

  const navigateTo = (mode: ViewMode, wf?: WorkflowModel) => {
    setView(mode)
    setViewWorkflow(wf ?? null)
    setError(null)
    setSuccessMsg(null)
  }

  const renderTableHeader = (cells: Array<{
    label: string; sortable?: boolean; active?: boolean; dir?: SortDir; onClick?: () => void; align?: 'left' | 'center' | 'right'
  }>) => (
    <TableHead>
      <TableRow>
        {cells.map((cell, idx) => (
          <TableCell key={idx} align={cell.align || 'left'}
            sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', py: 1.5, borderBottom: '2px solid', borderColor: 'divider', cursor: cell.sortable ? 'pointer' : 'default', '&:hover': cell.sortable ? { color: 'primary.main' } : {} }}
            onClick={cell.onClick}>
            {cell.sortable ? <TableSortLabel active={cell.active} direction={cell.active ? cell.dir : 'asc'}>{cell.label}</TableSortLabel> : cell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )

  // ─── Sub-page Views ───
  if (view === 'create') {
    return <WorkflowCreatePage onBack={() => navigateTo('list')} onCreated={() => { loadData(); navigateTo('list') }} />
  }
  if (view === 'edit' && viewWorkflow) {
    return <WorkflowEditPage workflow={viewWorkflow} onBack={() => navigateTo('list')} onSaved={() => { loadData(); navigateTo('list') }} />
  }
  if (view === 'steps' && viewWorkflow) {
    return <WorkflowStepConfigPage workflow={viewWorkflow} onBack={() => navigateTo('list')} />
  }

  // ─── Main List View ───
  return (
    <Box>
      <PageHeader
        title="Workflow Automation"
        subtitle="Manage workflow templates, track active instances, and review approval steps."
        action={pageTab === 0 ? { label: 'New Workflow', icon: <AddIcon />, onClick: () => navigateTo('create') } : undefined}
      />
      {pageTab === 0 && <ExportButton data={filteredWorkflows} columns={workflowExportColumns} filename="WorkflowTemplates" />}
      {pageTab === 1 && <ExportButton data={filteredInstances} columns={instanceExportColumns} filename="WorkflowInstances" />}
      {pageTab === 2 && filteredSteps.length > 0 && <ExportButton data={filteredSteps} columns={stepExportColumns} filename="WorkflowApprovalSteps" />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {!loading && <KpiCardRow items={kpiItems} />}

      <Tabs value={pageTab} onChange={(_, v) => { setPageTab(v); setSelectedInstanceId(null); setSteps([]); setError(null) }}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 }, '& .Mui-selected': { color: 'primary.main' } }}>
        <Tab icon={<AccountTreeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Templates" />
        <Tab icon={<PlayArrowIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Active Instances" />
        <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Approval Steps" />
      </Tabs>

      {/* ═══ TAB 0: Workflow Templates ═══ */}
      <TabPanel value={pageTab} index={0} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search templates..." value={wfSearch} onChange={(e) => { setWfSearch(e.target.value); setWfPage(0) }} sx={{ minWidth: 240 }} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={wfStatusFilter} label="Status" onChange={(e) => { setWfStatusFilter(e.target.value); setWfPage(0) }} sx={{ borderRadius: 2 }}>
                {STATUS_FILTERS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            {(wfSearch || wfStatusFilter) && <Button size="small" onClick={() => { setWfSearch(''); setWfStatusFilter(''); setWfPage(0) }} sx={{ borderRadius: 2 }}>Clear</Button>}
          </Box>
          <TableShell loading={loading} empty={filteredWorkflows.length === 0} emptyIcon={<AccountTreeIcon />}
            emptyTitle={wfSearch || wfStatusFilter ? 'No templates match.' : 'No workflow templates yet.'}
            emptyAction={!wfSearch && !wfStatusFilter ? <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigateTo('create')}>Create your first workflow</Button> : undefined}>
            <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
              {renderTableHeader([
                { label: 'Workflow Name', sortable: true, active: wfSort.field === 'name', dir: wfSort.dir, onClick: () => handleWfSort('name') },
                { label: 'Entity Type', sortable: true, active: wfSort.field === 'entity', dir: wfSort.dir, onClick: () => handleWfSort('entity') },
                { label: 'Status', sortable: true, active: wfSort.field === 'status', dir: wfSort.dir, onClick: () => handleWfSort('status'), align: 'center' },
                { label: 'Steps', align: 'center' },
                { label: '', align: 'right' },
              ])}
              <TableBody>
                {paginatedWorkflows.map((wf, idx) => (
                  <TableRow key={wf.pm_workflowid} hover
                    sx={{ bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: fontSizes.sm, fontWeight: 700 }}>
                          {(wf.pm_workflowname ?? 'W').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{wf.pm_workflowname ?? 'Unnamed'}</Typography>
                          {(wf as any).pm_workflowdescription && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(wf as any).pm_workflowdescription}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{(wf as any).pm_entitytypename || '\u2014'}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip label={STATUS_LABELS[String(wf.pm_workflowstatus ?? '')] || (wf.pm_workflowstatus === 0 ? 'Active' : 'Inactive')} color={wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0' ? 'success' : 'default'} size="small" icon={wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0' ? <PowerIcon /> : <PowerOffIcon />} sx={{ fontWeight: 600, borderRadius: 8 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={String(stepTemplates.filter((s) => s.pm_module === wf.pm_workflowid).length)} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 8 }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigateTo('steps', wf)} sx={{ borderRadius: 1.5, color: '#8b5cf6' }} title="Configure Steps"><SettingsIcon sx={{ fontSize: 18 }} /></IconButton>
                      <IconButton size="small" onClick={() => navigateTo('edit', wf)} sx={{ borderRadius: 1.5 }} title="Edit"><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ id: wf.pm_workflowid!, type: 'workflow' })} sx={{ borderRadius: 1.5 }} title="Delete"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
          {!loading && filteredWorkflows.length > 0 && (
            <>
              <TableFooter filteredCount={filteredWorkflows.length} totalCount={workflows.length} itemLabel="template" />
              <TablePagination component="div" count={filteredWorkflows.length} page={wfPage} onPageChange={(_, p) => setWfPage(p)} rowsPerPage={wfRowsPerPage} onRowsPerPageChange={(e) => { setWfRowsPerPage(parseInt(e.target.value, 10)); setWfPage(0) }} rowsPerPageOptions={[25, 50, 100]} />
            </>
          )}
        </Paper>
      </TabPanel>

      {/* ═══ TAB 1: Active Instances ═══ */}
      <TabPanel value={pageTab} index={1} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search instances..." value={instSearch} onChange={(e) => { setInstSearch(e.target.value); setInstPage(0) }} sx={{ minWidth: 240 }} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={instStatusFilter} label="Status" onChange={(e) => { setInstStatusFilter(e.target.value); setInstPage(0) }} sx={{ borderRadius: 2 }}>
                {INSTANCE_STATUS_FILTERS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            {(instSearch || instStatusFilter) && <Button size="small" onClick={() => { setInstSearch(''); setInstStatusFilter(''); setInstPage(0) }} sx={{ borderRadius: 2 }}>Clear</Button>}
          </Box>
          <TableShell loading={loading} empty={filteredInstances.length === 0} emptyIcon={<PlayArrowIcon />} emptyTitle={instSearch || instStatusFilter ? 'No instances match.' : 'No workflow instances yet.'}>
            <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
              {renderTableHeader([
                { label: 'Workflow', sortable: true, active: instSort.field === 'workflow', dir: instSort.dir, onClick: () => handleInstSort('workflow') },
                { label: 'Entity ID', sortable: true, active: instSort.field === 'entity', dir: instSort.dir, onClick: () => handleInstSort('entity') },
                { label: 'Initiated By' },
                { label: 'Status', sortable: true, active: instSort.field === 'status', dir: instSort.dir, onClick: () => handleInstSort('status'), align: 'center' },
                { label: 'Date', sortable: true, active: instSort.field === 'date', dir: instSort.dir, onClick: () => handleInstSort('date') },
                { label: '', align: 'right' },
              ])}
              <TableBody>
                {paginatedInstances.map((inst, idx) => (
                  <TableRow key={inst.pm_workflowinstanceid} hover onClick={() => { setSelectedInstanceId(inst.pm_workflowinstanceid!); setPageTab(2) }}
                    sx={{ cursor: 'pointer', bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', fontSize: fontSizes.sm, fontWeight: 700 }}>{(inst.pm_workflowname ?? 'W').charAt(0).toUpperCase()}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{inst.pm_workflowname ?? 'Unnamed'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.xs }}>{(inst as any).pm_entityid ? ((inst as any).pm_entityid).substring(0, 8) + '...' : '\u2014'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{(inst as any).pm_initiatedby || '\u2014'}</Typography></TableCell>
                    <TableCell align="center"><Chip label={INSTANCE_STATUS_LABELS[String(inst.pm_workflowstatus ?? '')] ?? 'Unknown'} color={INSTANCE_STATUS_COLORS[String(inst.pm_workflowstatus ?? '')] ?? 'default'} size="small" sx={{ fontWeight: 600, borderRadius: 8 }} /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{formatDate((inst as any).pm_initiationdate)}</Typography></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: inst.pm_workflowinstanceid!, type: 'instance' }) }} sx={{ borderRadius: 1.5 }}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
          {!loading && filteredInstances.length > 0 && (
            <>
              <TableFooter filteredCount={filteredInstances.length} totalCount={instances.length} itemLabel="instance" />
              <TablePagination component="div" count={filteredInstances.length} page={instPage} onPageChange={(_, p) => setInstPage(p)} rowsPerPage={instRowsPerPage} onRowsPerPageChange={(e) => { setInstRowsPerPage(parseInt(e.target.value, 10)); setInstPage(0) }} rowsPerPageOptions={[25, 50, 100]} />
            </>
          )}
        </Paper>
      </TabPanel>

      {/* ═══ TAB 2: Approval Steps ═══ */}
      <TabPanel value={pageTab} index={2} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search steps..." value={stepSearch} onChange={(e) => { setStepSearch(e.target.value); setStepPage(0) }} sx={{ minWidth: 240 }} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            {selectedInstanceId && <Chip icon={<ScheduleIcon />} label={'Instance: ' + selectedInstanceId.substring(0, 8) + '...'} onDelete={() => setSelectedInstanceId(null)} size="small" color="primary" variant="outlined" sx={{ borderRadius: 8 }} />}
            {stepSearch && <Button size="small" onClick={() => { setStepSearch(''); setStepPage(0) }} sx={{ borderRadius: 2 }}>Clear</Button>}
          </Box>
          <TableShell loading={stepsLoading} empty={filteredSteps.length === 0} emptyIcon={<HistoryIcon />}
            emptyTitle={!selectedInstanceId ? 'Select an instance to view its approval steps.' : (stepSearch ? 'No steps match.' : 'No approval steps found.')}>
            <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
              {renderTableHeader([
                { label: 'Step Name', sortable: true, active: stepSort.field === 'name', dir: stepSort.dir, onClick: () => handleStepSort('name') },
                { label: 'Order', sortable: true, active: stepSort.field === 'order', dir: stepSort.dir, onClick: () => handleStepSort('order'), align: 'center' },
                { label: 'Approver', sortable: true, active: stepSort.field === 'approver', dir: stepSort.dir, onClick: () => handleStepSort('approver') },
                { label: 'Decision', sortable: true, active: stepSort.field === 'decision', dir: stepSort.dir, onClick: () => handleStepSort('decision'), align: 'center' },
                { label: 'Decision Date' },
              ])}
              <TableBody>
                {paginatedSteps.map((step, idx) => (
                  <TableRow key={step.pm_workflowapprovalstepid} hover
                    sx={{ bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: fontSizes.sm, fontWeight: 700 }}>{(step.pm_stepname ?? 'S').charAt(0).toUpperCase()}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.pm_stepname ?? 'Unnamed Step'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center"><Chip label={'#' + (step.pm_steporder ?? '\u2014')} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 8, fontFamily: '"JetBrains Mono", monospace' }} /></TableCell>
                    <TableCell><Typography variant="body2">{step.pm_approvername || '\u2014'}</Typography></TableCell>
                    <TableCell align="center"><Chip label={APPROVAL_STATUS_LABELS[String(step.pm_decisionstatus ?? '')] ?? 'Unknown'} color={APPROVAL_STATUS_COLORS[String(step.pm_decisionstatus ?? '')] ?? 'default'} size="small" sx={{ fontWeight: 600, borderRadius: 8 }} /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{formatDate(step.pm_decisiondate)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
          {!stepsLoading && filteredSteps.length > 0 && (
            <>
              <TableFooter filteredCount={filteredSteps.length} totalCount={steps.length} itemLabel="step" />
              <TablePagination component="div" count={filteredSteps.length} page={stepPage} onPageChange={(_, p) => setStepPage(p)} rowsPerPage={stepRowsPerPage} onRowsPerPageChange={(e) => { setStepRowsPerPage(parseInt(e.target.value, 10)); setStepPage(0) }} rowsPerPageOptions={[25, 50, 100]} />
            </>
          )}
        </Paper>
      </TabPanel>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{deleteConfirm?.type === 'workflow' ? 'Delete Workflow' : 'Delete Instance'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteConfirm?.type === 'workflow' ? 'Are you sure? This will delete the workflow template. This action cannot be undone.' : 'Are you sure you want to delete this workflow instance? This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 2 }}>
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
