import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Alert, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TablePagination, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, Tooltip, Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SettingsIcon from '@mui/icons-material/Settings'
import PowerIcon from '@mui/icons-material/Power'
import PowerOffIcon from '@mui/icons-material/PowerOff'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { WorkflowModel, WorkflowInstanceModel, WorkflowStepTemplateModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import { useUser } from '@/context/UserContext'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchWorkflows, deleteWorkflow,
  fetchWorkflowInstances, deleteWorkflowInstance,
  fetchWorkflowStepTemplates,
} from '@/services'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, TabPanel, ExportButton, StatusTag } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import { navigateToModule } from '@/utils/navigation'

// Sub-page imports
import WorkflowFormPage from './WorkflowFormPage'

const STATUS_LABELS: Record<string, string> = { '0': 'Active', '1': 'Inactive' }
const INSTANCE_STATUS_LABELS: Record<string, string> = { '0': 'Completed', '1': 'Active' }
const INSTANCE_STATUS_COLORS: Record<string, 'success' | 'warning'> = { '0': 'success', '1': 'warning' }

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
  { key: 'pm_module', label: 'Module' },
  { key: 'pm_workflowstatusname', label: 'Status' },
]
const instanceExportColumns: ExportColumn[] = [
  { key: 'pm_workflowlookupname', label: 'Workflow' },
  { key: 'pm_instancename', label: 'Instance' },
  { key: 'pm_entityid', label: 'Entity ID' },
  { key: 'pm_statusname', label: 'Status' },
]

type WfSortField = 'name' | 'status' | 'entity'
type InstSortField = 'workflow' | 'entity' | 'status' | 'date' | 'completion'
type SortDir = 'asc' | 'desc'
interface SortState<T> { field: T; dir: SortDir }

type ViewMode = 'list' | 'create' | 'edit'

export default function WorkflowsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('WORKFLOWS', 'create')
  const { allowed: canEdit } = useAuthorization('WORKFLOWS', 'update')
  const { allowed: canDelete } = useAuthorization('WORKFLOWS', 'delete')

  // View routing
  const [view, setView] = useState<ViewMode>('list')
  const [viewWorkflow, setViewWorkflow] = useState<WorkflowModel | null>(null)

  // Data
  const [workflows, setWorkflows] = useState<WorkflowModel[]>([])
  const [instances, setInstances] = useState<WorkflowInstanceModel[]>([])
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'workflow' | 'instance' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const { currentUser } = useUser()
  const [dialogStep, setDialogStep] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wfList, instList, stList] = await Promise.all([
        fetchWorkflows(),
        fetchWorkflowInstances(),
        fetchWorkflowStepTemplates()
      ])
      setWorkflows(wfList)
      setInstances(instList)
      setStepTemplates(stList)
    } catch (err) {
      setError('Unable to load workflow data. ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // KPI Cards
  const kpiItems = useMemo((): KpiCardItem[] => {
    const totalTemplates = workflows.length
    const activeTemplates = workflows.filter((w) => w.pm_workflowstatus === 0 || w.pm_workflowstatus === '0').length
    const activeInsts = instances.filter((i) => i.pm_status === 1 || i.pm_status === '1').length
    const completedInsts = instances.filter((i) => i.pm_status === 0 || i.pm_status === '0').length
    return [
      { label: 'Workflow Templates', value: totalTemplates, subtitle: 'Defined workflows', icon: <AccountTreeIcon />, color: 'secondary.main' },
      { label: 'Active Templates', value: activeTemplates, subtitle: totalTemplates > 0 ? Math.round((activeTemplates / totalTemplates) * 100) + '% of templates' : 'No templates', icon: <PlayArrowIcon />, color: 'success.main' },
      { label: 'Active Instances', value: activeInsts, subtitle: 'Currently running', icon: <ScheduleIcon />, color: 'warning.main' },
      { label: 'Completed Instances', value: completedInsts, subtitle: 'Successfully finished', icon: <CheckCircleIcon />, color: 'success.main' },
      { label: 'Step Templates', value: stepTemplates.length, subtitle: 'Configured steps', icon: <SettingsIcon />, color: 'secondary.main' },
    ]
  }, [workflows, instances, stepTemplates])

  // Filtering & Sorting
  const filteredWorkflows = useMemo(() => {
    let list = [...workflows]
    if (wfSearch.trim()) {
      const q = wfSearch.toLowerCase()
      list = list.filter((w) =>
        (w.pm_workflowname ?? '').toLowerCase().includes(q) ||
        (w.pm_workflowdescription ?? '').toLowerCase().includes(q)
      )
    }
    if (wfStatusFilter) list = list.filter((w) => String(w.pm_workflowstatus ?? (w as any).statecode) === wfStatusFilter)
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (wfSort.field) {
        case 'name': cmp = (a.pm_workflowname ?? '').localeCompare(b.pm_workflowname ?? ''); break
        case 'status': cmp = String(a.pm_workflowstatus ?? '').localeCompare(String(b.pm_workflowstatus ?? '')); break
        case 'entity': cmp = String(a.pm_module ?? '').localeCompare(String(b.pm_module ?? '')); break
      }
      return wfSort.dir === 'asc' ? cmp : -cmp
    })
  }, [workflows, wfSearch, wfStatusFilter, wfSort])

  const paginatedWorkflows = useMemo(() => filteredWorkflows.slice(wfPage * wfRowsPerPage, wfPage * wfRowsPerPage + wfRowsPerPage), [filteredWorkflows, wfPage, wfRowsPerPage])

  const getInstanceCompletion = useCallback((inst: WorkflowInstanceModel) => {
    if (inst.pm_status === 0 || inst.pm_status === '0') return 100
    const workflowId = inst._pm_workflowlookup_value
    if (!workflowId) return 0
    const totalSteps = stepTemplates.filter(s => s._pm_workflowlookup_value === workflowId).length
    if (totalSteps === 0) return 0
    const currentStep = inst.pm_currentstep ?? 1
    return Math.round(((currentStep - 1) / totalSteps) * 100)
  }, [stepTemplates])

  const getInstanceModule = useCallback((inst: WorkflowInstanceModel) => {
    const wf = workflows.find(w => w.pm_workflowid === inst._pm_workflowlookup_value)
    return wf?.pm_module || inst.pm_entitytype || '\u2014'
  }, [workflows])

  const filteredInstances = useMemo(() => {
    let list = [...instances]
    if (instSearch.trim()) {
      const q = instSearch.toLowerCase()
      list = list.filter((i) =>
        (i.pm_workflowlookupname ?? '').toLowerCase().includes(q) ||
        (i.pm_initiatedby ?? '').toLowerCase().includes(q)
      )
    }
    if (instStatusFilter) list = list.filter((i) => String(i.pm_status ?? '') === instStatusFilter)
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (instSort.field) {
        case 'workflow': cmp = (a.pm_workflowlookupname ?? '').localeCompare(b.pm_workflowlookupname ?? ''); break
        case 'entity': cmp = String(a.pm_entityid ?? '').localeCompare(String(b.pm_entityid ?? '')); break
        case 'status': cmp = String(a.pm_status ?? '').localeCompare(String(b.pm_status ?? '')); break
        case 'date': cmp = String(a.pm_startdate ?? '').localeCompare(String(b.pm_startdate ?? '')); break
        case 'completion': cmp = getInstanceCompletion(a) - getInstanceCompletion(b); break
      }
      return instSort.dir === 'asc' ? cmp : -cmp
    })
  }, [instances, instSearch, instStatusFilter, instSort, getInstanceCompletion])

  const paginatedInstances = useMemo(() => filteredInstances.slice(instPage * instRowsPerPage, instPage * instRowsPerPage + instRowsPerPage), [filteredInstances, instPage, instRowsPerPage])

  // Handlers
  const handleWfSort = useCallback((field: WfSortField) => setWfSort((p) => ({ field, dir: p.field === field && p.dir === 'asc' ? 'desc' : 'asc' })), [])
  const handleInstSort = useCallback((field: InstSortField) => setInstSort((p) => ({ field, dir: p.field === field && p.dir === 'asc' ? 'desc' : 'asc' })), [])

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

  const handleRowClick = (inst: WorkflowInstanceModel) => {
    if (inst.pm_entitytype && inst.pm_entityid) {
      navigateToModule(inst.pm_entitytype, inst.pm_entityid)
    }
  }

  const renderTableHeader = (cells: Array<{
    label: string; sortable?: boolean; active?: boolean; dir?: SortDir; onClick?: () => void; align?: 'left' | 'center' | 'right'
  }>) => (
    <TableHead>
      <TableRow>
        {cells.map((cell, idx) => (
          <TableCell key={idx} align={cell.align || 'left'}
            sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', py: 1.5, borderBottom: '2px solid', borderColor: 'divider', cursor: cell.sortable ? 'pointer' : 'default', '&:hover': { color: cell.sortable ? 'primary.main' : 'inherit' } }}
            onClick={cell.onClick}>
            {cell.sortable ? <TableSortLabel active={cell.active} direction={cell.active ? cell.dir : 'asc'}>{cell.label}</TableSortLabel> : cell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )

  const handleDialogClose = () => { if (!actionLoading) navigateTo('list') }
  const dialogSx = { '& .MuiDialog-paper': { borderRadius: 1.5, maxWidth: 900, width: '100%', minHeight: '80vh' } }

  return (
    <>
      {/* Create Workflow Dialog */}
      <Dialog open={view === 'create'} onClose={handleDialogClose} maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Create New Workflow</Typography>
          <IconButton size="small" onClick={handleDialogClose} sx={{ borderRadius: 1.5 }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <WorkflowFormPage onStepChange={setDialogStep} onCreated={() => { loadData(); navigateTo('list') }} />
        </DialogContent>
      </Dialog>

      {/* Edit Workflow Dialog */}
      <Dialog open={view === 'edit' && !!viewWorkflow} onClose={handleDialogClose} maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Edit Workflow Template</Typography>
          <IconButton size="small" onClick={handleDialogClose} sx={{ borderRadius: 1.5 }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {viewWorkflow && (
            <WorkflowFormPage workflow={viewWorkflow} onStepChange={setDialogStep} onSaved={() => { loadData(); navigateTo('list') }} />
          )}
        </DialogContent>
      </Dialog>


      {/* Main List View */}
      <Box>
      <PageHeader
        title="Workflow Automation"
        subtitle="Manage workflow templates and track active instances across modules."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {pageTab === 0 && <ExportButton data={filteredWorkflows} columns={workflowExportColumns} filename="WorkflowTemplates" />}
            {pageTab === 1 && <ExportButton data={filteredInstances} columns={instanceExportColumns} filename="WorkflowInstances" />}
            {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigateTo('create')}>New Workflow</Button>}
          </Box>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {!loading && <KpiCardRow items={kpiItems} />}

      <Tabs value={pageTab} onChange={(_, v) => { setPageTab(v); setError(null) }}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 }, '& .Mui-selected': { color: 'primary.main' } }}>
        <Tab icon={<AccountTreeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Templates" />
        <Tab icon={<PlayArrowIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Active Instances" />
      </Tabs>

      {/* TAB 0: Workflow Templates */}
      <TabPanel value={pageTab} index={0} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search templates..." value={wfSearch} onChange={(e) => { setWfSearch(e.target.value); setWfPage(0) }} sx={{ minWidth: 240 }} slotProps={{ input: { sx: { borderRadius: 1.5 } } }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={wfStatusFilter} label="Status" onChange={(e) => { setWfStatusFilter(e.target.value); setWfPage(0) }} sx={{ borderRadius: 1.5 }}>
                {STATUS_FILTERS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            {(wfSearch || wfStatusFilter) && <Button size="small" onClick={() => { setWfSearch(''); setWfStatusFilter(''); setWfPage(0) }} sx={{ borderRadius: 1.5 }}>Clear</Button>}
          </Box>
          <TableShell loading={loading} empty={filteredWorkflows.length === 0} emptyIcon={<AccountTreeIcon />}
            emptyTitle={wfSearch || wfStatusFilter ? 'No templates match.' : 'No workflow templates yet.'}
            emptyAction={!wfSearch && !wfStatusFilter ? <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigateTo('create')}>Create your first workflow</Button> : undefined}>
            <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
              {renderTableHeader([
                { label: 'Workflow Name', sortable: true, active: wfSort.field === 'name', dir: wfSort.dir, onClick: () => handleWfSort('name') },
                { label: 'Module Name', sortable: true, active: wfSort.field === 'entity', dir: wfSort.dir, onClick: () => handleWfSort('entity') },
                { label: 'Status', sortable: true, active: wfSort.field === 'status', dir: wfSort.dir, onClick: () => handleWfSort('status'), align: 'center' },
                { label: 'Steps', align: 'center' },
                { label: '', align: 'right' },
              ])}
              <TableBody>
                {paginatedWorkflows.map((wf, idx) => (
                  <TableRow key={wf.pm_workflowid} hover
                    sx={{ bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                          {(wf.pm_workflowname ?? 'W').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{wf.pm_workflowname ?? 'Unnamed'}</Typography>
                          {wf.pm_workflowdescription && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.pm_workflowdescription}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{wf.pm_module || '\u2014'}</Typography></TableCell>
                    <TableCell align="center">
                      <StatusTag label={STATUS_LABELS[String(wf.pm_workflowstatus ?? '')] || (wf.pm_workflowstatus === 0 ? 'Active' : 'Inactive')} color={wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0' ? 'success' : 'default'} size="small" icon={wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0' ? <PowerIcon sx={{ fontSize: 14 }} /> : <PowerOffIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">
                      <StatusTag label={String(stepTemplates.filter((s) => s._pm_workflowlookup_value === wf.pm_workflowid).length)} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <IconButton size="small" onClick={() => navigateTo('edit', wf)} sx={{ borderRadius: 1.5 }} title="Edit"><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                      )}
                      {canDelete && (
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ id: wf.pm_workflowid!, type: 'workflow' })} sx={{ borderRadius: 1.5 }} title="Delete"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                      )}
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

      {/* TAB 1: Active Instances */}
      <TabPanel value={pageTab} index={1} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search instances..." value={instSearch} onChange={(e) => { setInstSearch(e.target.value); setInstPage(0) }} sx={{ minWidth: 240 }} slotProps={{ input: { sx: { borderRadius: 1.5 } } }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={instStatusFilter} label="Status" onChange={(e) => { setInstStatusFilter(e.target.value); setInstPage(0) }} sx={{ borderRadius: 1.5 }}>
                {INSTANCE_STATUS_FILTERS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            {(instSearch || instStatusFilter) && <Button size="small" onClick={() => { setInstSearch(''); setInstStatusFilter(''); setInstPage(0) }} sx={{ borderRadius: 1.5 }}>Clear</Button>}
          </Box>
          <TableShell loading={loading} empty={filteredInstances.length === 0} emptyIcon={<PlayArrowIcon />} emptyTitle={instSearch || instStatusFilter ? 'No instances match.' : 'No workflow instances yet.'}>
            <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
              {renderTableHeader([
                { label: 'Workflow', sortable: true, active: instSort.field === 'workflow', dir: instSort.dir, onClick: () => handleInstSort('workflow') },
                { label: 'Module', sortable: false },
                { label: 'Progress', sortable: true, active: instSort.field === 'completion', dir: instSort.dir, onClick: () => handleInstSort('completion') },
                { label: 'Status', sortable: true, active: instSort.field === 'status', dir: instSort.dir, onClick: () => handleInstSort('status'), align: 'center' },
                { label: 'Date', sortable: true, active: instSort.field === 'date', dir: instSort.dir, onClick: () => handleInstSort('date') },
                { label: '', align: 'right' },
              ])}
              <TableBody>
                {paginatedInstances.map((inst, idx) => {
                  const completion = getInstanceCompletion(inst)
                  const moduleName = getInstanceModule(inst)
                  return (
                    <TableRow key={inst.pm_workflowinstanceid} hover
                      sx={{ bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent', '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' }, transition: 'background-color 0.15s ease', '& td': { px: 2.5, py: 1.25 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>{(inst.pm_workflowlookupname ?? 'W').charAt(0).toUpperCase()}</Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{inst.pm_workflowlookupname ?? inst.pm_instancename ?? 'Unnamed'}</Typography>
                            <Typography variant="caption" color="text.secondary">By {inst.pm_initiatedby || 'System'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={moduleName} size="small" variant="outlined" sx={{ borderRadius: 1.5, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress variant="determinate" value={completion} 
                              sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: completion === 100 ? 'success.main' : 'primary.main' } }} 
                            />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35 }}>{completion}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center"><StatusTag label={INSTANCE_STATUS_LABELS[String(inst.pm_status ?? '')] ?? 'Unknown'} color={INSTANCE_STATUS_COLORS[String(inst.pm_status ?? '')] ?? 'default'} size="small" sx={{ fontWeight: 600 }} /></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{formatDate(inst.pm_startdate)}</Typography></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="View Target Record">
                            <IconButton size="small" onClick={() => handleRowClick(inst)} sx={{ borderRadius: 1.5 }} color="primary">
                              <OpenInNewIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          {canDelete && (
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ id: inst.pm_workflowinstanceid!, type: 'instance' })} sx={{ borderRadius: 1.5 }} title="Delete"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => !actionLoading && setDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{deleteConfirm?.type === 'workflow' ? 'Delete Workflow' : 'Delete Instance'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteConfirm?.type === 'workflow' ? 'Are you sure? This will delete the workflow template. This action cannot be undone.' : 'Are you sure you want to delete this workflow instance? This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </>
  )
}
