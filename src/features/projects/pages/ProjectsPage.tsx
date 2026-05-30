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
  TablePagination,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
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
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssignmentIcon from '@mui/icons-material/Assignment'
import {
  createProject,
  fetchProjectsFull,
  fetchMilestonesDueThisMonth,
  createProjectMilestone,
  createRisk,
  createIssue,
  assignResource,
  createBudgetLine,
  createBenefit,
  createProjectTask,
} from '@/lib/dataverseClient'
import { StatusChip, PageHeader, KpiCardRow, SearchFilterBar, TableFooter, TableShell } from '@/components/common'
import { fontSizes } from '@/styles'
import type { KpiCardItem } from '@/components/common'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel, BudgetLineModel, BenefitModel, ProjectTaskModel, GateReviewModel } from '@/types/dataverse'

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

  // Navigation state — selectedProject controls inline 360 view
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
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
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

  // Budget line form
  const [budgetForm, setBudgetForm] = useState({ pm_budgetlinename: '', pm_approvedbudgeteur: 0, pm_actualspendeur: 0, pm_costcategory: '' })

  // Task form
  const [taskForm, setTaskForm] = useState({ pm_taskname: '', pm_taskdescription: '', pm_assignedresource: '', pm_plannedstartdate: '', pm_plannedenddate: '', pm_percentcomplete: 0, pm_durationdays: 0 })

  // Benefit form
  const [benefitForm, setBenefitForm] = useState({ pm_benefitname: '', pm_benefitcategory: '1', pm_benefitstatus: '0', pm_targetvalue: 0, pm_unitofmeasure: '', pm_realisationenddate: '' })

  // Dialog states for entity creation sub-forms
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false)

  // Sub-dialog states for entity creation
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [riskDialogOpen, setRiskDialogOpen] = useState(false)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  // Additional detail data
  const [detailBudgetLines, setDetailBudgetLines] = useState<BudgetLineModel[]>([])
  const [detailBenefits, setDetailBenefits] = useState<BenefitModel[]>([])
  const [detailTasks, setDetailTasks] = useState<ProjectTaskModel[]>([])
  const [detailGateReviews, setDetailGateReviews] = useState<GateReviewModel[]>([])

  // Detail sub-data
  const [detailMilestones, setDetailMilestones] = useState<ProjectMilestoneModel[]>([])
  const [detailRisks, setDetailRisks] = useState<RiskModel[]>([])
  const [detailIssues, setDetailIssues] = useState<IssueModel[]>([])
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

  // ── Pagination ───────────────────────────────────────────────────────────
  const paginatedProjects = useMemo(
    () => filteredProjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredProjects, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handlePhaseFilterChange = useCallback((value: string) => { setPhaseFilter(value); setPage(0) }, [])

  // ── Row click → show inline 360 project summary ─────────────────────────
  const handleRowClick = useCallback(async (project: ProjectModel) => {
    setSelectedProject(project)
    setDetailTab(0)
    setDetailLoading(true)
    setError(null)

    try {
      console.log('📋 [360 View] Opening project:', project.pm_projectname, '| ID:', project.pm_projectid)

      // Fetch all related entities for the project summary
      const {
        Pm_projectmilestonesService, Pm_risksService, Pm_issuesService,
        Pm_resourceallocationsService, Pm_budgetlinesService, Pm_benefitsService,
        Pm_projecttasksService, Pm_projectgatereviewsService,
      } = await import('@/generated')
      const unwrap = (result: any): any[] => {
        if (!result) { console.warn('⚠️ unwrap: result is falsy', result); return [] }
        // Sometimes the API returns via OData fetch directly, or a wrapper
        if (result.success && Array.isArray(result.data)) {
          console.log('🔓 unwrap: found success.data array of length', result.data.length)
          return result.data
        }
        // Fallback: if data exists but wrapped differently
        if (result.data && !Array.isArray(result.data)) {
          console.warn('⚠️ unwrap: result.data exists but is not an array', typeof result.data)
        }
        // OData format
        if ('value' in result) {
          const val = result.value
          if (Array.isArray(val)) {
            console.log('🔓 unwrap: found value array of length', val.length)
            return val
          }
          console.warn('⚠️ unwrap: value key exists but not array', typeof val)
          return []
        }
        // Already an array
        if (Array.isArray(result)) {
          console.log('🔓 unwrap: result is already an array of length', result.length)
          return result
        }
        console.warn('⚠️ unwrap: unrecognized format, keys:', Object.keys(result))
        return []
      }

      const projectId = project.pm_projectid!
      console.log('🔍 [360 View] Querying all related entities for project ID:', projectId)

      const [
        msResult, riskResult, issueResult, allocResult,
        budgetResult, benefitResult, taskResult, gateResult,
      ] = await Promise.all([
        (async () => {
          const r = await Pm_projectmilestonesService.getAll({
            filter: `_pm_project_value eq '${projectId}'`,
            select: ['pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype', 'pm_planneddate', 'pm_status', 'pm_ragstatus'],
            orderBy: ['pm_planneddate asc'],
            top: 100,
          })
          console.log('🔍 [360 View] Milestones raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Milestones unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_risksService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskowner', 'pm_riskstatus', 'pm_identifieddate', 'pm_targetclosedate'],
            top: 100,
          })
          console.log('🔍 [360 View] Risks raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Risks unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_issuesService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issueowner', 'pm_issuestatus', 'pm_prioritylevel', 'pm_dateraised', 'pm_targetresolutiondate'],
            top: 100,
          })
          console.log('🔍 [360 View] Issues raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Issues unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_resourceallocationsService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_assignmentrole', 'pm_startdate', 'pm_enddate', '_pm_resource_value'],
            top: 100,
          })
          console.log('🔍 [360 View] Resources raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Resources unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_budgetlinesService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_budgetlineid', 'pm_budgetlinename', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur', 'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory'],
            top: 100,
          })
          console.log('🔍 [360 View] Budget lines raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Budget lines unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_benefitsService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_benefitid', 'pm_benefitname', 'pm_benefitcategory', 'pm_benefitstatus', 'pm_targetvalue', 'pm_unitofmeasure', 'pm_ragstatus', 'pm_realisationenddate'],
            top: 100,
          })
          console.log('🔍 [360 View] Benefits raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Benefits unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_projecttasksService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_projecttaskid', 'pm_taskname', 'pm_taskstatus', 'pm_percentcomplete', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_assignedresource', 'pm_ismilestone'],
            orderBy: ['pm_plannedstartdate asc'],
            top: 200,
          })
          console.log('🔍 [360 View] Tasks raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Tasks unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
        (async () => {
          const r = await Pm_projectgatereviewsService.getAll({
            filter: `_pm_project_value eq '${projectId}' and statecode eq 0`,
            select: ['pm_projectgatereviewid', 'pm_gatename', 'pm_gatestage', 'pm_reviewoutcome', 'pm_reviewstatus', 'pm_plannedreviewdate', 'pm_actualreviewdate', 'pm_leadreviewer'],
            orderBy: ['pm_plannedreviewdate desc'],
            top: 50,
          })
          console.log('🔍 [360 View] Gate reviews raw result:', JSON.stringify(r).slice(0, 1000))
          const unwrapped = unwrap(r)
          console.log('🔍 [360 View] Gate reviews unwrapped count:', unwrapped.length, '| Sample:', unwrapped.length > 0 ? JSON.stringify(unwrapped[0]) : 'NO DATA')
          return r
        })(),
      ])

      console.log('📋 [360 View] ALL DATA LOADED. Final counts:', {
        milestones: unwrap(msResult).length,
        risks: unwrap(riskResult).length,
        issues: unwrap(issueResult).length,
        resources: unwrap(allocResult).length,
        budgetLines: unwrap(budgetResult).length,
        benefits: unwrap(benefitResult).length,
        tasks: unwrap(taskResult).length,
        gateReviews: unwrap(gateResult).length,
      })

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
      setDetailBudgetLines(unwrap(budgetResult).map((b: any) => ({
        pm_budgetlineid: b.pm_budgetlineid,
        pm_budgetlinename: b.pm_budgetlinename,
        pm_approvedbudgeteur: b.pm_approvedbudgeteur,
        pm_actualspendeur: b.pm_actualspendeur,
        pm_committedspendeur: b.pm_committedspendeur,
        pm_forecastspendeur: b.pm_forecastspendeur,
        pm_varianceeur: b.pm_varianceeur,
        pm_costcategory: b.pm_costcategory,
      })))
      setDetailBenefits(unwrap(benefitResult).map((b: any) => ({
        pm_benefitid: b.pm_benefitid,
        pm_benefitname: b.pm_benefitname,
        pm_benefitcategory: b.pm_benefitcategory,
        pm_benefitstatus: b.pm_benefitstatus,
        pm_targetvalue: b.pm_targetvalue,
        pm_unitofmeasure: b.pm_unitofmeasure,
        pm_ragstatus: b.pm_ragstatus,
        pm_realisationenddate: b.pm_realisationenddate,
      })))
      setDetailTasks(unwrap(taskResult).map((t: any) => ({
        pm_projecttaskid: t.pm_projecttaskid,
        pm_taskname: t.pm_taskname,
        pm_taskstatus: t.pm_taskstatus,
        pm_percentcomplete: t.pm_percentcomplete,
        pm_plannedstartdate: t.pm_plannedstartdate,
        pm_plannedenddate: t.pm_plannedenddate,
        pm_assignedresource: t.pm_assignedresource,
        pm_ismilestone: t.pm_ismilestone,
      })))
      setDetailGateReviews(unwrap(gateResult).map((g: any) => ({
        pm_projectgatereviewid: g.pm_projectgatereviewid,
        pm_gatename: g.pm_gatename,
        pm_gatestage: g.pm_gatestage,
        pm_reviewoutcome: g.pm_reviewoutcome,
        pm_reviewstatus: g.pm_reviewstatus,
        pm_plannedreviewdate: g.pm_plannedreviewdate,
        pm_actualreviewdate: g.pm_actualreviewdate,
        pm_leadreviewer: g.pm_leadreviewer,
      })))
    } catch (err) {
      setError('Failed to load project detail data.')
      console.warn(err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleBackToProjects = useCallback(() => {
    setSelectedProject(null)
    setError(null)
    // Reset forms
    setMilestoneForm({ pm_milestonename: '', pm_planneddate: '' })
    setRiskForm({ pm_risktitle: '', pm_riskdescription: '', pm_ragstatus: '1', pm_riskcategory: '3' })
    setIssueForm({ pm_issuetitle: '', pm_issuedescription: '', pm_prioritylevel: '0', pm_issuecategory: '0' })
    setResourceForm({ pm_resourceName: '', pm_resourceId: '', pm_allocatedhours: 40, pm_assignmentrole: '', pm_startdate: '', pm_enddate: '' })
    setBudgetForm({ pm_budgetlinename: '', pm_approvedbudgeteur: 0, pm_actualspendeur: 0, pm_costcategory: '' })
    setBenefitForm({ pm_benefitname: '', pm_benefitcategory: '1', pm_benefitstatus: '0', pm_targetvalue: 0, pm_unitofmeasure: '', pm_realisationenddate: '' })
    setTaskForm({ pm_taskname: '', pm_taskdescription: '', pm_assignedresource: '', pm_plannedstartdate: '', pm_plannedenddate: '', pm_percentcomplete: 0, pm_durationdays: 0 })
    setDetailTab(0)
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
      setMilestoneDialogOpen(false)
      setSuccessMsg('Milestone added successfully.')
      // Refresh milestones
      const { Pm_projectmilestonesService } = await import('@/generated')
      const result = await Pm_projectmilestonesService.getAll({
        filter: `_pm_project_value eq '${selectedProject.pm_projectid}'`,
        select: ['pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype', 'pm_planneddate', 'pm_status'],
        orderBy: ['pm_planneddate asc'],
        top: 100,
      })
      const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
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
      setRiskDialogOpen(false)
      setSuccessMsg('Risk logged successfully.')
      // Refresh risks
      const { Pm_risksService } = await import('@/generated')
      const result = await Pm_risksService.getAll({
        filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
        select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskowner', 'pm_riskstatus', 'pm_identifieddate', 'pm_targetclosedate'],
        top: 100,
      })
      const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
      setDetailRisks(unwrap(result).map((r: any) => ({
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
      setIssueDialogOpen(false)
      setSuccessMsg('Issue logged successfully.')
      // Refresh issues
      const { Pm_issuesService } = await import('@/generated')
      const result = await Pm_issuesService.getAll({
        filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
        select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issueowner', 'pm_issuestatus', 'pm_prioritylevel', 'pm_dateraised', 'pm_targetresolutiondate'],
        top: 100,
      })
      const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
      setDetailIssues(unwrap(result).map((i: any) => ({
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
      setResourceDialogOpen(false)
      setSuccessMsg('Resource assigned successfully.')
      // Refresh resource allocations
      try {
        const { Pm_resourceallocationsService } = await import('@/generated')
        const allocResult = await Pm_resourceallocationsService.getAll({
          filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
          select: ['pm_resourceallocationid', 'pm_allocatedhours', 'pm_allocationpercentage', 'pm_assignmentrole', 'pm_startdate', 'pm_enddate', '_pm_resource_value'],
          top: 100,
        })
        const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
        setDetailResources(unwrap(allocResult))
      } catch { /* silent */ }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to assign resource.')
    }
  }

  // ── Add budget line ─────────────────────────────────────────────────────
  const handleAddBudgetLine = async () => {
    if (!selectedProject?.pm_projectid || !budgetForm.pm_budgetlinename) { setError('Budget line name is required.'); return }
    try {
      await createBudgetLine({
        pm_budgetlinename: budgetForm.pm_budgetlinename,
        pm_approvedbudgeteur: budgetForm.pm_approvedbudgeteur,
        pm_actualspendeur: budgetForm.pm_actualspendeur,
        pm_costcategory: budgetForm.pm_costcategory !== '' ? Number(budgetForm.pm_costcategory) : undefined,
        _pm_project_value: selectedProject.pm_projectid,
      })
      setBudgetForm({ pm_budgetlinename: '', pm_approvedbudgeteur: 0, pm_actualspendeur: 0, pm_costcategory: '' })
      setBudgetDialogOpen(false)
      setSuccessMsg('Budget line added successfully.')
      // Refresh budget lines
      try {
        const { Pm_budgetlinesService } = await import('@/generated')
        const budgetResult = await Pm_budgetlinesService.getAll({
          filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
          select: ['pm_budgetlineid', 'pm_budgetlinename', 'pm_approvedbudgeteur', 'pm_actualspendeur', 'pm_committedspendeur', 'pm_forecastspendeur', 'pm_varianceeur', 'pm_costcategory'],
          top: 100,
        })
        const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
        setDetailBudgetLines(unwrap(budgetResult).map((b: any) => ({
          pm_budgetlineid: b.pm_budgetlineid,
          pm_budgetlinename: b.pm_budgetlinename,
          pm_approvedbudgeteur: b.pm_approvedbudgeteur,
          pm_actualspendeur: b.pm_actualspendeur,
          pm_committedspendeur: b.pm_committedspendeur,
          pm_forecastspendeur: b.pm_forecastspendeur,
          pm_varianceeur: b.pm_varianceeur,
          pm_costcategory: b.pm_costcategory,
        })))
      } catch { /* silent */ }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add budget line.')
    }
  }

  // ── Add benefit ────────────────────────────────────────────────────────
  const handleAddBenefit = async () => {
    if (!selectedProject?.pm_projectid || !benefitForm.pm_benefitname) { setError('Benefit name is required.'); return }
    try {
      await createBenefit({
        pm_benefitname: benefitForm.pm_benefitname,
        pm_benefitcategory: benefitForm.pm_benefitcategory,
        pm_benefitstatus: benefitForm.pm_benefitstatus,
        pm_targetvalue: benefitForm.pm_targetvalue,
        pm_unitofmeasure: benefitForm.pm_unitofmeasure,
        pm_realisationenddate: benefitForm.pm_realisationenddate,
        _pm_project_value: selectedProject.pm_projectid,
      })
      setBenefitForm({ pm_benefitname: '', pm_benefitcategory: '1', pm_benefitstatus: '0', pm_targetvalue: 0, pm_unitofmeasure: '', pm_realisationenddate: '' })
      setBenefitDialogOpen(false)
      setSuccessMsg('Benefit added successfully.')
      // Refresh benefits
      try {
        const { Pm_benefitsService } = await import('@/generated')
        const benefitResult = await Pm_benefitsService.getAll({
          filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
          select: ['pm_benefitid', 'pm_benefitname', 'pm_benefitcategory', 'pm_benefitstatus', 'pm_targetvalue', 'pm_unitofmeasure', 'pm_ragstatus', 'pm_realisationenddate'],
          top: 100,
        })
        const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
        setDetailBenefits(unwrap(benefitResult).map((b: any) => ({
          pm_benefitid: b.pm_benefitid,
          pm_benefitname: b.pm_benefitname,
          pm_benefitcategory: b.pm_benefitcategory,
          pm_benefitstatus: b.pm_benefitstatus,
          pm_targetvalue: b.pm_targetvalue,
          pm_unitofmeasure: b.pm_unitofmeasure,
          pm_ragstatus: b.pm_ragstatus,
          pm_realisationenddate: b.pm_realisationenddate,
        })))
      } catch { /* silent */ }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add benefit.')
    }
  }

  // ── Add task ────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!selectedProject?.pm_projectid || !taskForm.pm_taskname) { setError('Task name is required.'); return }
    try {
      await createProjectTask({
        pm_taskname: taskForm.pm_taskname,
        pm_taskdescription: taskForm.pm_taskdescription,
        pm_assignedresource: taskForm.pm_assignedresource,
        pm_plannedstartdate: taskForm.pm_plannedstartdate,
        pm_plannedenddate: taskForm.pm_plannedenddate,
        pm_percentcomplete: taskForm.pm_percentcomplete,
        pm_durationdays: taskForm.pm_durationdays || undefined,
        _pm_project_value: selectedProject.pm_projectid,
      })
      setTaskForm({ pm_taskname: '', pm_taskdescription: '', pm_assignedresource: '', pm_plannedstartdate: '', pm_plannedenddate: '', pm_percentcomplete: 0, pm_durationdays: 0 })
      setTaskDialogOpen(false)
      setSuccessMsg('Task added successfully.')
      // Refresh tasks
      try {
        const { Pm_projecttasksService } = await import('@/generated')
        const taskResult = await Pm_projecttasksService.getAll({
          filter: `_pm_project_value eq '${selectedProject.pm_projectid}' and statecode eq 0`,
          select: ['pm_projecttaskid', 'pm_taskname', 'pm_taskstatus', 'pm_percentcomplete', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_assignedresource', 'pm_ismilestone'],
          orderBy: ['pm_plannedstartdate asc'],
          top: 200,
        })
        const unwrap = (r: any) => { if (!r) return []; if (r.success && Array.isArray(r.data)) return r.data; if ('value' in r) return r.value; return Array.isArray(r) ? r : [] }
        setDetailTasks(unwrap(taskResult).map((t: any) => ({
          pm_projecttaskid: t.pm_projecttaskid,
          pm_taskname: t.pm_taskname,
          pm_taskstatus: t.pm_taskstatus,
          pm_percentcomplete: t.pm_percentcomplete,
          pm_plannedstartdate: t.pm_plannedstartdate,
          pm_plannedenddate: t.pm_plannedenddate,
          pm_assignedresource: t.pm_assignedresource,
          pm_ismilestone: t.pm_ismilestone,
        })))
      } catch { /* silent */ }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add task.')
    }
  }

  // ── Detail tabs ─────────────────────────────────────────────────────────
  const detailTabs = [
    { label: 'Milestones', icon: <FlagIcon fontSize="small" /> },
    { label: 'Risks & Issues', icon: <BugReportIcon fontSize="small" /> },
    { label: 'Resources', icon: <PersonAddIcon fontSize="small" /> },
    { label: 'Budget', icon: <AccountBalanceWalletIcon fontSize="small" /> },
    { label: 'Benefits', icon: <EmojiEventsIcon fontSize="small" /> },
    { label: 'Tasks', icon: <AnalyticsIcon fontSize="small" /> },
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
return (
  <Box>

    {/* ── 360° Project Detail View (inline, replaces table when selected) ── */}
{selectedProject && (
  <Box sx={{ mb: 3 }}>
    {/* Back button + header */}
    <Paper sx={{ mb: 2.5, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <IconButton onClick={handleBackToProjects} size="small" sx={{ mt: 0.5, borderRadius: 1.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{selectedProject.pm_projectname}</Typography>
              <StatusChip status={selectedProject.pm_ragstatus} type="rag" />
              <Chip label={phaseLabel(selectedProject.pm_projectphase)} size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {selectedProject.pm_projectcode}
              {selectedProject.pm_projectmanager ? ` · Manager: ${selectedProject.pm_projectmanager}` : ''}
              {selectedProject.pm_projectsponsor ? ` · Sponsor: ${selectedProject.pm_projectsponsor}` : ''}
              {selectedProject.pm_businessunit ? ` · ${selectedProject.pm_businessunit}` : ''}
              {selectedProject.pm_portfolioname ? ` · Portfolio: ${selectedProject.pm_portfolioname}` : ''}
              {selectedProject.pm_programmename ? ` · Programme: ${selectedProject.pm_programmename}` : ''}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>

    {/* ── Quick Info Cards ──────────────────────────────────── */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2.5 }}>
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
      <Paper sx={{ p: 2, borderRadius: 1.5, borderLeft: `3px solid ${RAG_COLORS[String(selectedProject.pm_ragstatus)] ?? '#6b7280'}` }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Schedule</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {selectedProject.pm_plannedenddate
            ? new Date(selectedProject.pm_plannedenddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </Typography>
      </Paper>
    </Box>

    {/* ── Action Buttons Bar ────────────────────────────────── */}
    <Paper sx={{ px: 2.5, py: 1.5, mb: 2.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions:</Typography>
      <Button size="small" variant="outlined" startIcon={<FlagIcon />} onClick={() => setMilestoneDialogOpen(true)}>Milestone</Button>
      <Button size="small" variant="outlined" color="error" startIcon={<ErrorIcon />} onClick={() => setRiskDialogOpen(true)}>Risk</Button>
      <Button size="small" variant="outlined" color="warning" startIcon={<WarningAmberIcon />} onClick={() => setIssueDialogOpen(true)}>Issue</Button>
      <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setResourceDialogOpen(true)}>Resource</Button>
      <Button size="small" variant="outlined" startIcon={<AttachMoneyIcon />} onClick={() => setBudgetDialogOpen(true)}>Budget</Button>
      <Button size="small" variant="outlined" startIcon={<EmojiEventsIcon />} onClick={() => setBenefitDialogOpen(true)}>Benefit</Button>
      <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={() => setTaskDialogOpen(true)}>Task</Button>
    </Paper>

    {/* ── Tabbed Content ────────────────────────────────────── */}
    <Paper sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
      <Tabs
        value={detailTab}
        onChange={(_, v) => setDetailTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 2, pt: 1,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48, borderRadius: '8px 8px 0 0', fontSize: fontSizes.smMd },
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
          /* ═══════════════════════════════════════════════════ */
          /* Tab 0: Milestones                                     */
          /* ═══════════════════════════════════════════════════ */
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Project Milestones</Typography>
            </Box>
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
                No milestones yet. Use the Actions bar above to add one.
              </Typography>
            )}
          </Box>
        ) : detailTab === 1 ? (
          /* ═══════════════════════════════════════════════════ */
          /* Tab 1: Risks & Issues                                  */
          /* ═══════════════════════════════════════════════════ */
          <Grid container spacing={2}>
              {/* Risks list */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Risks ({detailRisks.length})
                </Typography>
                {detailRisks.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {detailRisks.map((r) => (
                      <Paper key={r.pm_riskid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS[String(r.pm_ragstatus)] ?? '#6b7280', flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.pm_risktitle}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.pm_riskowner ?? 'Unassigned'} {r.pm_targetclosedate ? `· Target: ${new Date(r.pm_targetclosedate).toLocaleDateString()}` : ''}</Typography>
                        </Box>
                        <Chip label={['Resource','Financial','Legal','Technical','External'][Number(r.pm_riskcategory)] ?? '—'} size="small" variant="outlined" />
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No risks logged.</Typography>
                  </Paper>
                )}
              </Grid>
              {/* Issues list */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Issues ({detailIssues.length})
                </Typography>
                {detailIssues.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {detailIssues.map((i: any) => (
                      <Paper key={i.pm_issueid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <WarningAmberIcon sx={{ fontSize: 16, color: i.pm_prioritylevel === '1' || i.pm_prioritylevel === 1 ? '#ef4444' : '#f59e0b' }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{i.pm_issuetitle}</Typography>
                          <Typography variant="caption" color="text.secondary">{i.pm_issueowner ?? 'Unassigned'} {i.pm_targetresolutiondate ? `· Due: ${new Date(i.pm_targetresolutiondate).toLocaleDateString()}` : ''}</Typography>
                        </Box>
                        <Chip label={String(i.pm_issuestatus) === '1' ? 'Resolved' : 'Open'} size="small" color={String(i.pm_issuestatus) === '1' ? 'success' : 'default'} variant="outlined" />
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No issues logged.</Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
        ) : detailTab === 2 ? (
          /* ═══════════════════════════════════════════════════ */
          /* Tab 2: Resources                                      */
          /* ═══════════════════════════════════════════════════ */
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Allocated Resources</Typography>
            {detailResources.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detailResources.map((alloc: any) => (
                  <Paper key={alloc.pm_resourceallocationid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{alloc._pm_resource_value ?? alloc.pm_resourceid ?? 'Unknown resource'}</Typography>
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
                No resources assigned yet. Use the Actions bar above to assign one.
              </Typography>
            )}
          </Box>
        ) : detailTab === 3 ? (
          /* ═══════════════════════════════════════════════════ */
          /* Tab 3: Budget Lines                                   */
          /* ═══════════════════════════════════════════════════ */
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Budget Breakdown</Typography>
              <Chip label={`Total: ${currency(detailBudgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0))}`} size="small" color="primary" variant="outlined" />
              <Chip label={`Spent: ${currency(detailBudgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0))}`} size="small" color={detailBudgetLines.reduce((s, b) => s + (b.pm_actualspendeur ?? 0), 0) > detailBudgetLines.reduce((s, b) => s + (b.pm_approvedbudgeteur ?? 0), 0) ? 'error' : 'default'} variant="outlined" />
            </Box>
            {detailBudgetLines.length > 0 ? (
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Line Item</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Budget</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actual</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Variance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailBudgetLines.map((b) => {
                    const variance = (b.pm_approvedbudgeteur ?? 0) - (b.pm_actualspendeur ?? 0)
                    return (
                      <TableRow key={b.pm_budgetlineid}>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_budgetlinename}</Typography></TableCell>
                        <TableCell><Chip label={['Staff', 'Contractors', 'Licences', 'Infrastructure'][Number(b.pm_costcategory)] ?? '—'} size="small" variant="outlined" /></TableCell>
                        <TableCell align="right">{currency(b.pm_approvedbudgeteur)}</TableCell>
                        <TableCell align="right">{currency(b.pm_actualspendeur)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: variance >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                            {variance >= 0 ? '+' : ''}{currency(variance)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No budget lines yet. Use the Actions bar above to add one.
              </Typography>
            )}
          </Box>
        ) : detailTab === 4 ? (
          /* ═══════════════════════════════════════════════════ */
          /* Tab 4: Benefits                                      */
          /* ═══════════════════════════════════════════════════ */
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Planned Benefits</Typography>
              <Chip label={`${detailBenefits.length} benefit(s)`} size="small" color="success" variant="outlined" />
            </Box>
            {detailBenefits.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detailBenefits.map((b) => (
                  <Paper key={b.pm_benefitid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_benefitname}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.pm_benefitcategory === '1' ? 'Financial' : b.pm_benefitcategory === '2' ? 'Strategic' : 'Operational'}
                        {b.pm_unitofmeasure ? ` · Target: ${b.pm_targetvalue ?? '—'} ${b.pm_unitofmeasure}` : ''}
                        {b.pm_realisationenddate ? ` · Due: ${new Date(b.pm_realisationenddate).toLocaleDateString()}` : ''}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusChip status={b.pm_ragstatus} type="rag" />
                      <Chip label={b.pm_benefitstatus === '0' ? 'Not Started' : b.pm_benefitstatus === '1' ? 'In Progress' : 'Achieved'} size="small" variant="outlined" />
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No benefits yet. Use the Actions bar above to add one.
              </Typography>
            )}
          </Box>
        ) : detailTab === 5 ? (
          /* ═══════════════════════════════════════════════════ */
          /* Tab 5: Tasks                                          */
          /* ═══════════════════════════════════════════════════ */
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Project Tasks ({detailTasks.length})
            </Typography>
            {detailTasks.length > 0 ? (
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Task Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">% Complete</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Start</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>End</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailTasks.map((t) => (
                    <TableRow key={t.pm_projecttaskid}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.pm_taskname}
                          {t.pm_ismilestone && <Chip label="Milestone" size="small" color="info" variant="outlined" sx={{ ml: 1, height: 20, fontSize: fontSizes.xs }} />}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{t.pm_assignedresource ?? '—'}</Typography></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                          <LinearProgress
                            variant="determinate"
                            value={t.pm_percentcomplete ?? 0}
                            sx={{ width: 48, height: 5, borderRadius: 3, bgcolor: theme.palette.action.hover }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{t.pm_percentcomplete ?? 0}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2">{t.pm_plannedstartdate ? new Date(t.pm_plannedstartdate).toLocaleDateString() : '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{t.pm_plannedenddate ? new Date(t.pm_plannedenddate).toLocaleDateString() : '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={String(t.pm_taskstatus) === '0' ? 'Not Started' : String(t.pm_taskstatus) === '1' ? 'In Progress' : String(t.pm_taskstatus) === '2' ? 'Complete' : String(t.pm_taskstatus) === '3' ? 'On Hold' : '—'}
                          size="small"
                          variant="outlined"
                          color={String(t.pm_taskstatus) === '2' ? 'success' : String(t.pm_taskstatus) === '1' ? 'info' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No tasks yet. Use the Actions bar above to add one.
              </Typography>
            )}
          </Box>
        ) : (
          /* ═══════════════════════════════════════════════════ */
          /* Tab 6: Gate Review                                    */
          /* ═══════════════════════════════════════════════════ */
          <Box>
            {detailGateReviews.length > 0 ? (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Gate Reviews ({detailGateReviews.length})</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {detailGateReviews.map((g) => (
                    <Paper key={g.pm_projectgatereviewid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.pm_gatename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Stage {g.pm_gatestage} · {g.pm_leadreviewer ? `Reviewer: ${g.pm_leadreviewer}` : ''}
                          {g.pm_plannedreviewdate ? ` · Planned: ${new Date(g.pm_plannedreviewdate).toLocaleDateString()}` : ''}
                          {g.pm_actualreviewdate ? ` · Actual: ${new Date(g.pm_actualreviewdate).toLocaleDateString()}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={String(g.pm_reviewstatus) === '2' ? 'Approved' : String(g.pm_reviewstatus) === '1' ? 'Pending' : String(g.pm_reviewstatus) === '3' ? 'Rejected' : '—'}
                        size="small"
                        color={String(g.pm_reviewstatus) === '2' ? 'success' : String(g.pm_reviewstatus) === '3' ? 'error' : 'default'}
                      />
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : null}

            {/* Gate review action section */}
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
          </Box>
        )}
      </Box>
    </Paper>
  </Box>
)}

{!selectedProject && (
        <>
<PageHeader
        title="Project Portfolio"
        subtitle="Monitor and manage all active projects across the enterprise."
        action={{ label: 'New Project', icon: <AddIcon />, onClick: () => setIsAddingProject(true) }}
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
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search projects..."
          filterValue={phaseFilter}
          onFilterChange={handlePhaseFilterChange}
          filterLabel="Filter by Phase"
          filterOptions={[
            { value: '', label: 'All Phases' },
            { value: '1', label: 'Planning' },
            { value: '0', label: 'Execution' },
            { value: '2', label: 'Closure' },
          ]}
          onClear={() => { setSearchQuery(''); setPhaseFilter(''); setPage(0) }}
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
              {paginatedProjects.map((project, idx) => (
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
        {!loading && filteredProjects.length > 0 && (
          <TablePagination
            component="div"
            count={filteredProjects.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Paper>
        </>
      )}

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

      {/* ── Add Milestone Dialog ──────────────────────────────────── */}
      <Dialog open={milestoneDialogOpen} onClose={() => setMilestoneDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Milestone</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Milestone name *" value={milestoneForm.pm_milestonename ?? ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonename: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned date"
                value={milestoneForm.pm_planneddate ?? ''} onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_planneddate: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label="Type" value={milestoneForm.pm_milestonetype ?? ''}
                onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonetype: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value="0">Delivery</MenuItem>
                <MenuItem value="1">Governance</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddMilestone} variant="contained" disabled={!milestoneForm.pm_milestonename}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Log Risk Dialog ───────────────────────────────────────── */}
      <Dialog open={riskDialogOpen} onClose={() => setRiskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Risk</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Risk title *" value={riskForm.pm_risktitle ?? ''}
                onChange={(e) => setRiskForm((f) => ({ ...f, pm_risktitle: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="Description" value={riskForm.pm_riskdescription ?? ''}
                onChange={(e) => setRiskForm((f) => ({ ...f, pm_riskdescription: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Category" value={riskForm.pm_riskcategory ?? '3'}
                onChange={(e) => setRiskForm((f) => ({ ...f, pm_riskcategory: e.target.value }))}>
                <MenuItem value="0">Resource</MenuItem>
                <MenuItem value="1">Financial</MenuItem>
                <MenuItem value="2">Legal</MenuItem>
                <MenuItem value="3">Technical</MenuItem>
                <MenuItem value="4">External</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="RAG" value={riskForm.pm_ragstatus ?? '1'}
                onChange={(e) => setRiskForm((f) => ({ ...f, pm_ragstatus: e.target.value }))}>
                <MenuItem value="1">Green</MenuItem>
                <MenuItem value="0">Amber</MenuItem>
                <MenuItem value="2">Red</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Risk owner" value={riskForm.pm_riskowner ?? ''}
                onChange={(e) => setRiskForm((f) => ({ ...f, pm_riskowner: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Target close date"
                value={riskForm.pm_targetclosedate ?? ''} onChange={(e) => setRiskForm((f) => ({ ...f, pm_targetclosedate: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRiskDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddRisk} variant="contained" color="error" disabled={!riskForm.pm_risktitle}>Log Risk</Button>
        </DialogActions>
      </Dialog>

      {/* ── Log Issue Dialog ──────────────────────────────────────── */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Issue</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Issue title *" value={issueForm.pm_issuetitle ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, pm_issuetitle: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="Description" value={issueForm.pm_issuedescription ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, pm_issuedescription: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Category" value={issueForm.pm_issuecategory ?? '0'}
                onChange={(e) => setIssueForm((f) => ({ ...f, pm_issuecategory: e.target.value }))}>
                <MenuItem value="0">Scope</MenuItem>
                <MenuItem value="1">Schedule</MenuItem>
                <MenuItem value="2">Budget</MenuItem>
                <MenuItem value="3">Quality</MenuItem>
                <MenuItem value="4">Resource</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Priority" value={issueForm.pm_prioritylevel ?? '0'}
                onChange={(e) => setIssueForm((f) => ({ ...f, pm_prioritylevel: e.target.value }))}>
                <MenuItem value="0">Normal</MenuItem>
                <MenuItem value="1">High</MenuItem>
                <MenuItem value="2">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Issue owner" value={issueForm.pm_issueowner ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, pm_issueowner: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Target resolution date"
                value={issueForm.pm_targetresolutiondate ?? ''} onChange={(e) => setIssueForm((f) => ({ ...f, pm_targetresolutiondate: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddIssue} variant="contained" color="warning" disabled={!issueForm.pm_issuetitle}>Log Issue</Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Resource Dialog ────────────────────────────────── */}
      <Dialog open={resourceDialogOpen} onClose={() => setResourceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Resource</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Resource name *" value={resourceForm.pm_resourceName ?? ''}
                onChange={(e) => setResourceForm((f) => ({ ...f, pm_resourceName: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Resource ID *" value={resourceForm.pm_resourceId ?? ''}
                onChange={(e) => setResourceForm((f) => ({ ...f, pm_resourceId: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Allocated hours" value={resourceForm.pm_allocatedhours ?? 40}
                onChange={(e) => setResourceForm((f) => ({ ...f, pm_allocatedhours: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Role" value={resourceForm.pm_assignmentrole ?? ''}
                onChange={(e) => setResourceForm((f) => ({ ...f, pm_assignmentrole: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Start date"
                value={resourceForm.pm_startdate ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, pm_startdate: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="End date"
                value={resourceForm.pm_enddate ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, pm_enddate: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResourceDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAssignResource} variant="contained" disabled={!resourceForm.pm_resourceId}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Budget Line Dialog ──────────────────────────────────── */}
      <Dialog open={budgetDialogOpen} onClose={() => setBudgetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Budget Line</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Budget line name *" value={budgetForm.pm_budgetlinename ?? ''}
                onChange={(e) => setBudgetForm((f) => ({ ...f, pm_budgetlinename: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Approved budget (EUR)" value={budgetForm.pm_approvedbudgeteur ?? 0}
                onChange={(e) => setBudgetForm((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Actual spend (EUR)" value={budgetForm.pm_actualspendeur ?? 0}
                onChange={(e) => setBudgetForm((f) => ({ ...f, pm_actualspendeur: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label="Cost category" value={budgetForm.pm_costcategory ?? ''}
                onChange={(e) => setBudgetForm((f) => ({ ...f, pm_costcategory: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value="0">Staff</MenuItem>
                <MenuItem value="1">Contractors</MenuItem>
                <MenuItem value="2">Licences</MenuItem>
                <MenuItem value="3">Infrastructure</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddBudgetLine} variant="contained" disabled={!budgetForm.pm_budgetlinename}>Add Budget Line</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Benefit Dialog ─────────────────────────────────────── */}
      <Dialog open={benefitDialogOpen} onClose={() => setBenefitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Benefit</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Benefit name *" value={benefitForm.pm_benefitname ?? ''}
                onChange={(e) => setBenefitForm((f) => ({ ...f, pm_benefitname: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Category" value={benefitForm.pm_benefitcategory ?? '1'}
                onChange={(e) => setBenefitForm((f) => ({ ...f, pm_benefitcategory: e.target.value }))}>
                <MenuItem value="1">Financial</MenuItem>
                <MenuItem value="2">Strategic</MenuItem>
                <MenuItem value="0">Operational</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Status" value={benefitForm.pm_benefitstatus ?? '0'}
                onChange={(e) => setBenefitForm((f) => ({ ...f, pm_benefitstatus: e.target.value }))}>
                <MenuItem value="0">Not Started</MenuItem>
                <MenuItem value="1">In Progress</MenuItem>
                <MenuItem value="2">Achieved</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Target value" value={benefitForm.pm_targetvalue ?? 0}
                onChange={(e) => setBenefitForm((f) => ({ ...f, pm_targetvalue: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Unit of measure" value={benefitForm.pm_unitofmeasure ?? ''}
                onChange={(e) => setBenefitForm((f) => ({ ...f, pm_unitofmeasure: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Realisation end date"
                value={benefitForm.pm_realisationenddate ?? ''} onChange={(e) => setBenefitForm((f) => ({ ...f, pm_realisationenddate: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBenefitDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddBenefit} variant="contained" disabled={!benefitForm.pm_benefitname}>Add Benefit</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Task Dialog ──────────────────────────────────────────── */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Task name *" value={taskForm.pm_taskname ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskname: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="Description" value={taskForm.pm_taskdescription ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskdescription: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Assigned resource" value={taskForm.pm_assignedresource ?? ''}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_assignedresource: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Duration (days)" value={taskForm.pm_durationdays ?? 0}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_durationdays: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned start date"
                value={taskForm.pm_plannedstartdate ?? ''} onChange={(e) => setTaskForm((f) => ({ ...f, pm_plannedstartdate: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Planned end date"
                value={taskForm.pm_plannedenddate ?? ''} onChange={(e) => setTaskForm((f) => ({ ...f, pm_plannedenddate: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="number" label="% Complete" value={taskForm.pm_percentcomplete ?? 0}
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                onChange={(e) => setTaskForm((f) => ({ ...f, pm_percentcomplete: Number(e.target.value) }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" disabled={!taskForm.pm_taskname}>Add Task</Button>
        </DialogActions>
      </Dialog>

    </Box>
    
  )
}

