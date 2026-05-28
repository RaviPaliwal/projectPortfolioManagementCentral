import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Skeleton,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import BugReportIcon from '@mui/icons-material/BugReport'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import EventNoteIcon from '@mui/icons-material/EventNote'
import {
  createProject,
  fetchProjectsFull,
  fetchMilestonesDueThisMonth,
  createProjectMilestone,
  createRisk,
  createIssue,
  assignResource,
} from '../../services/dataverseService'
import { StatusChip, PageHeader, KpiCardRow, SearchFilterBar, TableFooter, TableShell } from '../common'
import type { KpiCardItem } from '../common'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel } from '../../models/dataverse'

const RAG_COLORS: Record<string, string> = {
  '2': '#ef4444',
  '1': '#22c55e',
  '0': '#f59e0b',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'Red',
  '1': 'Green',
  '0': 'Amber',
}

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

const defaultProjectForm = {
  pm_projectname: '',
  pm_projectcode: '',
  pm_projectmanager: '',
  pm_projectsponsor: '',
  pm_projectphase: '1' as string,
  pm_ragstatus: '1' as string,
  pm_approvedbudgeteur: 0,
  pm_plannedstartdate: '',
  pm_plannedenddate: '',
}

const phaseLabel = (code?: string | number): string => {
  if (code === '0' || code === 0) return 'Execution'
  if (code === '1' || code === 1) return 'Planning'
  if (code === '2' || code === 2) return 'Closure'
  return 'Unknown'
}

const currency = (val?: number): string => {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

export default function ProjectsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Navigation state
  const [view, setView] = useState<'grid' | 'detail'>('grid')
  const [selectedProject, setSelectedProject] = useState<ProjectModel | null>(null)

  // Data state
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [milestonesDue, setMilestonesDue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'pm_projectname', direction: 'asc' })

  // Create modal state
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [projectForm, setProjectForm] = useState<Partial<ProjectModel>>(defaultProjectForm)
  const [isSaving, setIsSaving] = useState(false)

  // Detail view tab state
  const [detailTab, setDetailTab] = useState(0)

  // Milestone form
  const [milestoneForm, setMilestoneForm] = useState<Partial<ProjectMilestoneModel>>({ pm_milestonename: '', pm_planneddate: '' })

  // Risk form
  const [riskForm, setRiskForm] = useState<Partial<RiskModel>>({ pm_risktitle: '', pm_riskdescription: '', pm_ragstatus: '1', pm_riskcategory: '3' })

  // Issue form
  const [issueForm, setIssueForm] = useState<Partial<IssueModel>>({ pm_issuetitle: '', pm_issuedescription: '', pm_prioritylevel: '0', pm_issuecategory: '0' })

  // Resource allocation form
  const [resourceForm, setResourceForm] = useState({ pm_resourceName: '', pm_resourceId: '', pm_allocatedhours: 40, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })

  // Detail sub-data
  const [detailMilestones, setDetailMilestones] = useState<ProjectMilestoneModel[]>([])
  const [detailRisks, setDetailRisks] = useState<RiskModel[]>([])
  const [, setDetailIssues] = useState<IssueModel[]>([])
  const [detailResources, setDetailResources] = useState<any[]>([])

  // Success messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Load main data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projList, milestones] = await Promise.all([
        fetchProjectsFull(),
        fetchMilestonesDueThisMonth(),
      ])
      setProjects(projList)
      setMilestonesDue(milestones)
    } catch (err) {
      setError('Unable to load project data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const activeProjects = projects.length
  const redProjects = projects.filter((p) => String(p.pm_ragstatus) === '2').length
  const totalBudget = projects.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)

  const kpiItems: KpiCardItem[] = [
    {
      label: 'Active Projects',
      value: activeProjects,
      icon: <CheckCircleIcon />,
      color: '#22c55e',
    },
    {
      label: 'Projects at Risk',
      value: redProjects,
      icon: <ErrorIcon />,
      color: '#ef4444',
      valueColor: '#ef4444',
    },
    {
      label: 'Total Active Budget',
      value: currency(totalBudget),
      icon: <AttachMoneyIcon />,
      color: '#3b82f6',
    },
    {
      label: 'Milestones Due This Month',
      value: milestonesDue,
      icon: <EventNoteIcon />,
      color: '#8b5cf6',
    },
  ]

  // ── Grid sorting & filtering ────────────────────────────────────────────
  const handleSort = useCallback((field: string) => {
    setSort((prev) => prev.field === field
      ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' }
    )
  }, [])

  const filteredProjects = useMemo(() => {
    let list = [...projects]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) =>
        (p.pm_projectname?.toLowerCase() ?? '').includes(q) ||
        (p.pm_projectmanager?.toLowerCase() ?? '').includes(q) ||
        (p.pm_projectcode?.toLowerCase() ?? '').includes(q) ||
        (p.pm_businessunit?.toLowerCase() ?? '').includes(q)
      )
    }

    // Phase filter
    if (phaseFilter) {
      list = list.filter((p) => String(p.pm_projectphase) === phaseFilter)
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      const field = sort.field
      const dir = sort.direction === 'asc' ? 1 : -1

      if (field === 'pm_projectname') {
        cmp = (a.pm_projectname ?? '').localeCompare(b.pm_projectname ?? '')
      } else if (field === 'pm_projectphase') {
        cmp = (phaseLabel(a.pm_projectphase) ?? '').localeCompare(phaseLabel(b.pm_projectphase) ?? '')
      } else if (field === 'pm_projectmanager') {
        cmp = (a.pm_projectmanager ?? '').localeCompare(b.pm_projectmanager ?? '')
      } else if (field === 'pm_ragstatus') {
        cmp = (String(a.pm_ragstatus) ?? '').localeCompare(String(b.pm_ragstatus) ?? '')
      } else if (field === 'pm_percentcomplete') {
        cmp = ((a.pm_percentcomplete ?? 0) - (b.pm_percentcomplete ?? 0))
      } else if (field === 'pm_plannedenddate') {
        cmp = (a.pm_plannedenddate ?? '').localeCompare(b.pm_plannedenddate ?? '')
      }
      return cmp * dir
    })

    return list
  }, [projects, searchQuery, phaseFilter, sort])

  // ── Row click → detail view ─────────────────────────────────────────────
  const handleRowClick = useCallback(async (project: ProjectModel) => {
    setSelectedProject(project)
    setView('detail')
    setDetailTab(0)
    setDetailLoading(true)
    setError(null)

    try {
      // Fetch related data for the detail view
      const { Pm_projectmilestonesService, Pm_risksService, Pm_issuesService, Pm_resourceallocationsService } = await import('../../generated')
      const unwrap = (result: any): any[] => {
        if (!result) return []
        if ('value' in result) return result.value
        if (Array.isArray(result)) return result
        return []
      }

      const projectId = project.pm_projectid!
      const [msResult, riskResult, issueResult, allocResult] = await Promise.all([
        Pm_projectmilestonesService.getAll({
          filter: `_pm_project_value eq '${projectId}'`,
          select: ['pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype', 'pm_planneddate', 'pm_status', 'pm_ragstatus'],
          orderBy: ['pm_planneddate asc'],
          top: 100,
        }),
        Pm_risksService.getAll({
          filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
          select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskowner', 'pm_riskstatus', 'pm_identifieddate', 'pm_targetclosedate'],
          top: 100,
        }),
        Pm_issuesService.getAll({
          filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
          select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issueowner', 'pm_issuestatus', 'pm_prioritylevel', 'pm_dateraised', 'pm_targetresolutiondate'],
          top: 100,
        }),
        Pm_resourceallocationsService.getAll({
          filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
          select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_assignmentrole', 'pm_startdate', 'pm_enddate', 'pm_resourcename'],
          top: 100,
        }),
      ])

      setDetailMilestones(unwrap(msResult).map((m: any) => ({
        pm_projectmilestoneid: m.pm_projectmilestoneid,
        pm_milestonename: m.pm_milestonename,
        pm_milestonetype: m.pm_milestonetype,
        pm_planneddate: m.pm_planneddate,
        pm_ragstatus: m.pm_ragstatus,
      })))
      setDetailRisks(unwrap(riskResult).map((r: any) => ({
        pm_riskid: r.pm_riskid,
        pm_risktitle: r.pm_risktitle,
        pm_riskcategory: r.pm_riskcategory,
        pm_riskdescription: r.pm_riskdescription,
        pm_ragstatus: r.pm_ragstatus,
        pm_riskowner: r.pm_riskowner,
        pm_riskstatus: r.pm_riskstatus,
        pm_identifieddate: r.pm_identifieddate,
        pm_targetclosedate: r.pm_targetclosedate,
      })))
      setDetailIssues(unwrap(issueResult).map((i: any) => ({
        pm_issueid: i.pm_issueid,
        pm_issuetitle: i.pm_issuetitle,
        pm_issuedescription: i.pm_issuedescription,
        pm_issuecategory: i.pm_issuecategory,
        pm_ragstatus: i.pm_ragstatus,
        pm_issueowner: i.pm_issueowner,
        pm_issuestatus: i.pm_issuestatus,
        pm_prioritylevel: i.pm_prioritylevel,
        pm_dateraised: i.pm_dateraised,
        pm_targetresolutiondate: i.pm_targetresolutiondate,
      })))
      setDetailResources(unwrap(allocResult))
    } catch (err) {
      setError('Failed to load project detail data.')
      console.warn(err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleBack = useCallback(() => {
    setView('grid')
    setSelectedProject(null)
  }, [])

  // ── Create project ──────────────────────────────────────────────────────
  const handleProjectCreate = async () => {
    if (!projectForm.pm_projectname) { setError('Project name is required.'); return }
    setIsSaving(true)
    try {
      await createProject(projectForm)
      setProjectForm(defaultProjectForm)
      setIsAddingProject(false)
      setSuccessMsg('Project created successfully.')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to create project.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Add milestone ───────────────────────────────────────────────────────
  const handleAddMilestone = async () => {
    if (!selectedProject?.pm_projectid || !milestoneForm.pm_milestonename) { setError('Milestone name is required.'); return }
    try {
      await createProjectMilestone({
        pm_milestonename: milestoneForm.pm_milestonename,
        pm_planneddate: milestoneForm.pm_planneddate,
        pm_milestonetype: milestoneForm.pm_milestonetype,
        _pm_project_value: selectedProject.pm_projectid,
      })
      setMilestoneForm({ pm_milestonename: '', pm_planneddate: '' })
      setSuccessMsg('Milestone added successfully.')
      // Refresh milestones
      const { Pm_projectmilestonesService } = await import('../../generated')
      const result = await Pm_projectmilestonesService.getAll({
        filter: `_pm_project_value eq '${selectedProject.pm_projectid}'`,
        select: ['pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype', 'pm_planneddate', 'pm_status'],
        orderBy: ['pm_planneddate asc'],
        top: 100,
      })
      const unwrap = (r: any) => { if (!r) return []; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
      setDetailMilestones(unwrap(result).map((m: any) => ({
        pm_projectmilestoneid: m.pm_projectmilestoneid,
        pm_milestonename: m.pm_milestonename,
        pm_milestonetype: m.pm_milestonetype,
        pm_planneddate: m.pm_planneddate,
      })))
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add milestone.')
    }
  }

  // ── Add risk ────────────────────────────────────────────────────────────
  const handleAddRisk = async () => {
    if (!selectedProject?.pm_projectid || !riskForm.pm_risktitle) { setError('Risk title is required.'); return }
    try {
      await createRisk({
        ...riskForm,
        pm_projectid: selectedProject.pm_projectid,
      })
      setRiskForm({ pm_risktitle: '', pm_riskdescription: '', pm_ragstatus: '1', pm_riskcategory: '3' })
      setSuccessMsg('Risk logged successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to log risk.')
    }
  }

  // ── Add issue ───────────────────────────────────────────────────────────
  const handleAddIssue = async () => {
    if (!selectedProject?.pm_projectid || !issueForm.pm_issuetitle) { setError('Issue title is required.'); return }
    try {
      await createIssue({
        ...issueForm,
        pm_projectid: selectedProject.pm_projectid,
      })
      setIssueForm({ pm_issuetitle: '', pm_issuedescription: '', pm_prioritylevel: '0', pm_issuecategory: '0' })
      setSuccessMsg('Issue logged successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to log issue.')
    }
  }

  // ── Assign resource ─────────────────────────────────────────────────────
  const handleAssignResource = async () => {
    if (!selectedProject?.pm_projectid || !resourceForm.pm_resourceId) { setError('Resource is required.'); return }
    try {
      await assignResource({
        pm_projectid: selectedProject.pm_projectid,
        pm_resourceid: resourceForm.pm_resourceId,
        pm_allocatedhours: resourceForm.pm_allocatedhours,
        pm_assignmentrole: resourceForm.pm_assignmentrole,
        pm_startdate: resourceForm.pm_startdate,
        pm_enddate: resourceForm.pm_enddate,
      })
      setResourceForm({ pm_resourceName: '', pm_resourceId: '', pm_allocatedhours: 40, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })
      setSuccessMsg('Resource assigned successfully.')
      // Refresh resource allocations
      try {
        const { Pm_resourceallocationsService } = await import('../../generated')
        const allocResult = await Pm_resourceallocationsService.getAll({
          filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
          select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_assignmentrole', 'pm_startdate', 'pm_enddate', 'pm_resourcename'],
          top: 100,
        })
        const unwrap = (r: any) => { if (!r) return []; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
        setDetailResources(unwrap(allocResult))
      } catch { /* silent */ }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to assign resource.')
    }
  }

  // ── Detail tabs ─────────────────────────────────────────────────────────
  const detailTabs = [
    { label: 'Milestones', icon: <FlagIcon fontSize="small" /> },
    { label: 'Risks & Issues', icon: <BugReportIcon fontSize="small" /> },
    { label: 'Resources', icon: <PersonAddIcon fontSize="small" /> },
    { label: 'Gate Review', icon: <HowToRegIcon fontSize="small" /> },
  ]

  // ── Sort header helper ──────────────────────────────────────────────────
  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <TableSortLabel
      active={sort.field === field}
      direction={sort.field === field ? sort.direction : 'asc'}
      onClick={() => handleSort(field)}
      sx={{ fontWeight: 700, color: 'inherit', '&.Mui-active': { color: 'inherit' } }}
    >
      {label}
    </TableSortLabel>
  )

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  if (view === 'detail' && selectedProject) {
    return (
      <Box>
        {/* Header bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{selectedProject.pm_projectname}</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedProject.pm_projectcode} &middot; {selectedProject.pm_projectmanager ?? 'No manager'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <StatusChip status={selectedProject.pm_ragstatus} type="rag" />
            <Chip label={phaseLabel(selectedProject.pm_projectphase)} size="small" variant="outlined" />
          </Box>
        </Box>

        {/* Quick info cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid #3b82f6' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Budget</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{currency(selectedProject.pm_approvedbudgeteur)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid #f59e0b' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actual Spend</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{currency(selectedProject.pm_actualcosteur)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid #22c55e' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>% Complete</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedProject.pm_percentcomplete ?? 0}%</Typography>
            <LinearProgress
              variant="determinate"
              value={selectedProject.pm_percentcomplete ?? 0}
              sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: theme.palette.action.hover }}
            />
          </Paper>
          <Paper sx={{ p: 2, borderRadius: 1.5, borderLeft: `3px solid ${RAG_COLORS[String(selectedProject.pm_ragstatus)] ?? '#6b7280'}` } }>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sponsor</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedProject.pm_projectsponsor ?? '—'}</Typography>
          </Paper>
        </Box>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
          <Tabs
            value={detailTab}
            onChange={(_, v) => setDetailTab(v)}
            sx={{
              px: 2, pt: 1,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48, borderRadius: '8px 8px 0 0' },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            {detailTabs.map((tab) => (
              <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {detailLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={80} />)}
              </Box>
            ) : detailTab === 0 ? (
              /* ── Tab 0: Milestones ───────────────────────────────── */
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Add Milestone
                </Typography>
                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField fullWidth size="small" label="Milestone name" value={milestoneForm.pm_milestonename ?? ''}
                      onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonename: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} label="Target date"
                      value={milestoneForm.pm_planneddate ?? ''} onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_planneddate: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField select fullWidth size="small" label="Type" value={milestoneForm.pm_milestonetype ?? ''}
                      onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonetype: e.target.value }))}>
                      <MenuItem value="">Any</MenuItem>
                      <MenuItem value="0">Delivery</MenuItem>
                      <MenuItem value="1">Governance</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button fullWidth variant="contained" size="small" onClick={handleAddMilestone} sx={{ height: '100%' }}>Add</Button>
                  </Grid>
                </Grid>

                {detailMilestones.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {detailMilestones.map((ms) => (
                      <Paper key={ms.pm_projectmilestoneid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ms.pm_milestonename}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ms.pm_milestonetype === '0' || ms.pm_milestonetype === 0 ? 'Delivery' : ms.pm_milestonetype === '1' || ms.pm_milestonetype === 1 ? 'Governance' : '—'}
                            {ms.pm_planneddate ? ` · ${new Date(ms.pm_planneddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                          </Typography>
                        </Box>
                        <StatusChip status={ms.pm_ragstatus} type="rag" />
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No milestones yet. Add one above.
                  </Typography>
                )}
              </Box>
            ) : detailTab === 1 ? (
              /* ── Tab 1: Risks & Issues ────────────────────────────── */
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                {/* Risk form */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" fontSize="small" /> Log Risk
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={12}>
                      <TextField fullWidth size="small" label="Risk title" value={riskForm.pm_risktitle ?? ''}
                        onChange={(e) => setRiskForm((f) => ({ ...f, pm_risktitle: e.target.value }))} />
                    </Grid>
                    <Grid size={12}>
                      <TextField fullWidth size="small" multiline rows={2} label="Description" value={riskForm.pm_riskdescription ?? ''}
                        onChange={(e) => setRiskForm((f) => ({ ...f, pm_riskdescription: e.target.value }))} />
                    </Grid>
                    <Grid size={6}>
                      <TextField select fullWidth size="small" label="Category" value={riskForm.pm_riskcategory ?? '3'}
                        onChange={(e) => setRiskForm((f) => ({ ...f, pm_riskcategory: e.target.value }))}>
                        <MenuItem value="0">Resource</MenuItem>
                        <MenuItem value="1">Financial</MenuItem>
                        <MenuItem value="2">Legal</MenuItem>
                        <MenuItem value="3">Technical</MenuItem>
                        <MenuItem value="4">External</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={6}>
                      <TextField select fullWidth size="small" label="RAG" value={riskForm.pm_ragstatus ?? '1'}
                        onChange={(e) => setRiskForm((f) => ({ ...f, pm_ragstatus: e.target.value }))}>
                        <MenuItem value="1">Green</MenuItem>
                        <MenuItem value="0">Amber</MenuItem>
                        <MenuItem value="2">Red</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={12}>
                      <Button fullWidth variant="contained" size="small" onClick={handleAddRisk}>Log Risk</Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Issue form */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon color="warning" fontSize="small" /> Log Issue
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={12}>
                      <TextField fullWidth size="small" label="Issue title" value={issueForm.pm_issuetitle ?? ''}
                        onChange={(e) => setIssueForm((f) => ({ ...f, pm_issuetitle: e.target.value }))} />
                    </Grid>
                    <Grid size={12}>
                      <TextField fullWidth size="small" multiline rows={2} label="Description" value={issueForm.pm_issuedescription ?? ''}
                        onChange={(e) => setIssueForm((f) => ({ ...f, pm_issuedescription: e.target.value }))} />
                    </Grid>
                    <Grid size={6}>
                      <TextField select fullWidth size="small" label="Priority" value={issueForm.pm_prioritylevel ?? '0'}
                        onChange={(e) => setIssueForm((f) => ({ ...f, pm_prioritylevel: e.target.value }))}>
                        <MenuItem value="0">High</MenuItem>
                        <MenuItem value="1">Critical</MenuItem>
                        <MenuItem value="2">Medium</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={6}>
                      <TextField select fullWidth size="small" label="Category" value={issueForm.pm_issuecategory ?? '0'}
                        onChange={(e) => setIssueForm((f) => ({ ...f, pm_issuecategory: e.target.value }))}>
                        <MenuItem value="0">Dependency</MenuItem>
                        <MenuItem value="1">Technical</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={12}>
                      <Button fullWidth variant="contained" size="small" onClick={handleAddIssue}>Log Issue</Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Recent risks list */}
                {detailRisks.length > 0 && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Recent Risks ({detailRisks.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {detailRisks.map((r) => (
                        <Paper key={r.pm_riskid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS[String(r.pm_ragstatus)] ?? '#6b7280', flexShrink: 0 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.pm_risktitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{r.pm_riskowner ?? 'Unassigned'} {r.pm_targetclosedate ? `· Target: ${new Date(r.pm_targetclosedate).toLocaleDateString()}` : ''}</Typography>
                          </Box>
                          <Chip label={['Resource','Financial','Legal','Technical','External'][Number(r.pm_riskcategory)] ?? '—'} size="small" variant="outlined" />
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : detailTab === 2 ? (
              /* ── Tab 2: Resources ─────────────────────────────────── */
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Assign Resource
                </Typography>
                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Resource name or ID" value={resourceForm.pm_resourceName}
                      onChange={(e) => setResourceForm((f) => ({ ...f, pm_resourceName: e.target.value, pm_resourceId: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField fullWidth size="small" type="number" label="Hours" value={resourceForm.pm_allocatedhours}
                      onChange={(e) => setResourceForm((f) => ({ ...f, pm_allocatedhours: Number(e.target.value) }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth size="small" label="Role" value={resourceForm.pm_assignmentrole}
                      onChange={(e) => setResourceForm((f) => ({ ...f, pm_assignmentrole: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 1.5 }}>
                    <TextField fullWidth size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} label="Start"
                      value={resourceForm.pm_startdate} onChange={(e) => setResourceForm((f) => ({ ...f, pm_startdate: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 1.5 }}>
                    <TextField fullWidth size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} label="End"
                      value={resourceForm.pm_enddate} onChange={(e) => setResourceForm((f) => ({ ...f, pm_enddate: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button fullWidth variant="contained" size="small" onClick={handleAssignResource} sx={{ height: '100%' }}>Assign</Button>
                  </Grid>
                </Grid>

                {detailResources.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {detailResources.map((alloc: any) => (
                      <Paper key={alloc.pm_resourceallocationid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{alloc.pm_resourcename ?? alloc.pm_resourceid ?? 'Unknown resource'}</Typography>
                          <Typography variant="caption" color="text.secondary">{alloc.pm_assignmentrole ?? '—'} &middot; {alloc.pm_allocatedhours ?? 0}h allocated</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {alloc.pm_startdate ? new Date(alloc.pm_startdate).toLocaleDateString() : '—'} — {alloc.pm_enddate ? new Date(alloc.pm_enddate).toLocaleDateString() : '—'}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No resources assigned yet.
                  </Typography>
                )}
              </Box>
            ) : (
              /* ── Tab 3: Gate Review ───────────────────────────────── */
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <HowToRegIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Gate Review</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
                  Submit this project for a formal gate review by the PMO. This will change the project phase and initiate an approval workflow.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button variant="contained" size="large" startIcon={<HowToRegIcon />}>
                    Submit Gate Review
                  </Button>
                  <Button variant="outlined" size="large">
                    Request Phase Change
                  </Button>
                </Box>
                <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 1.5, maxWidth: 480, mx: 'auto', bgcolor: theme.palette.action.hover }}>
                  <Typography variant="caption" color="text.secondary">
                    Gate reviews require PMO approval before proceeding. A workflow instance will be created and assigned to the portfolio director.
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // MAIN GRID VIEW
  // ══════════════════════════════════════════════════════════════════════
  return (
    <Box>
      <PageHeader
        title="Project Portfolio"
        subtitle="Monitor and manage all active projects across the enterprise."
        action={{ label: '+ New Project', icon: <AddIcon />, onClick: () => setIsAddingProject(true) }}
      />

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <KpiCardRow items={kpiItems} loading={loading} />

      {/* ── Project Grid ────────────────────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search projects..."
          filterValue={phaseFilter}
          onFilterChange={setPhaseFilter}
          filterLabel="Filter by Phase"
          filterOptions={[
            { value: '', label: 'All Phases' },
            { value: '1', label: 'Planning' },
            { value: '0', label: 'Execution' },
            { value: '2', label: 'Closure' },
          ]}
          onClear={() => { setSearchQuery(''); setPhaseFilter('') }}
        />

        <TableShell
          loading={loading}
          empty={filteredProjects.length === 0}
          emptyIcon={<AccountTreeIcon />}
          emptyTitle={searchQuery || phaseFilter ? 'No projects match your search criteria.' : 'No projects found.'}
          emptyAction={!searchQuery && !phaseFilter ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setIsAddingProject(true)}>
              Create your first project
            </Button>
          ) : undefined}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {[
                  { field: 'pm_projectname', label: 'Project Name' },
                  { field: 'pm_projectphase', label: 'Phase' },
                  { field: 'pm_projectmanager', label: 'Project Manager' },
                  { field: 'pm_ragstatus', label: 'Overall RAG' },
                  { field: 'pm_percentcomplete', label: '% Complete' },
                  { field: 'pm_plannedenddate', label: 'Target End Date' },
                ].map((col) => (
                  <TableCell
                    key={col.field}
                    sx={{
                      fontWeight: 700,
                      bgcolor: isDark ? '#1e293b' : '#f8fafc',
                      borderBottom: `2px solid ${theme.palette.divider}`,
                      px: 2.5,
                      py: 1.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <SortHeader field={col.field} label={col.label} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project, idx) => (
                <TableRow
                  key={project.pm_projectid}
                  hover
                  onClick={() => handleRowClick(project)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent',
                    '& td': { borderBottom: '1px solid #efefef', py: 1.5, px: 2.5 },
                    '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)' },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_projectname}</Typography>
                    {project.pm_projectcode && (
                      <Typography variant="caption" color="text.secondary">{project.pm_projectcode}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={phaseLabel(project.pm_projectphase)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{project.pm_projectmanager ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: RAG_COLORS[String(project.pm_ragstatus)] ?? '#6b7280',
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {RAG_LABELS[String(project.pm_ragstatus)] ?? '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={project.pm_percentcomplete ?? 0}
                        sx={{
                          width: 64,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: theme.palette.action.hover,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: (project.pm_percentcomplete ?? 0) >= 100 ? '#22c55e' : '#3b82f6',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32 }}>
                        {project.pm_percentcomplete ?? 0}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {project.pm_plannedenddate
                        ? new Date(project.pm_plannedenddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        {!loading && filteredProjects.length > 0 && (
          <TableFooter
            filteredCount={filteredProjects.length}
            totalCount={projects.length}
            itemLabel="project"
            totals={[
              { label: 'Total budget', value: currency(filteredProjects.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)) },
            ]}
          />
        )}
      </Paper>

      {/* ── Create Project Modal ────────────────────────────────────── */}
      <Dialog open={isAddingProject} onClose={() => setIsAddingProject(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Project</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Project name *" value={projectForm.pm_projectname ?? ''}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectname: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Project code" value={projectForm.pm_projectcode ?? ''}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectcode: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Project manager" value={projectForm.pm_projectmanager ?? ''}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectmanager: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Sponsor" value={projectForm.pm_projectsponsor ?? ''}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectsponsor: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" label="Budget (EUR)" value={projectForm.pm_approvedbudgeteur ?? 0}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_approvedbudgeteur: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Phase" value={projectForm.pm_projectphase ?? '1'}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectphase: e.target.value }))}>
                <MenuItem value="1">Planning</MenuItem>
                <MenuItem value="0">Execution</MenuItem>
                <MenuItem value="2">Closure</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="RAG status" value={projectForm.pm_ragstatus ?? '1'}
                onChange={(e) => setProjectForm((p) => ({ ...p, pm_ragstatus: e.target.value }))}>
                <MenuItem value="1">Green</MenuItem>
                <MenuItem value="0">Amber</MenuItem>
                <MenuItem value="2">Red</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Start date"
                value={projectForm.pm_plannedstartdate ?? ''} onChange={(e) => setProjectForm((p) => ({ ...p, pm_plannedstartdate: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="End date"
                value={projectForm.pm_plannedenddate ?? ''} onChange={(e) => setProjectForm((p) => ({ ...p, pm_plannedenddate: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddingProject(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleProjectCreate} variant="contained" disabled={isSaving || !projectForm.pm_projectname}>
            {isSaving ? 'Saving...' : 'Save Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
