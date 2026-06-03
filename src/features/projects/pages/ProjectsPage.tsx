import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GppGoodIcon from '@mui/icons-material/GppGood'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import EventNoteIcon from '@mui/icons-material/EventNote'
import ErrorIcon from '@mui/icons-material/Error'

import {
  createProject,
  fetchProjectsFull,
  fetchMilestonesDueThisMonth,
} from '@/services'
import { PageHeader, KpiCardRow, Breadcrumbs } from '@/components/common'
import type { KpiCardItem } from '@/components/common'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel, BudgetLineModel, BenefitModel, ProjectTaskModel, GateReviewModel } from '@/types/dataverse'

import { currency } from '../constants'
import { ProjectGrids } from '../components/ProjectGrids'
import { Project360View } from '../components/Project360View'
import { ProjectFormDialog } from '../components/ProjectFormDialog'
import {
  MilestoneDialog,
  RiskDialog,
  IssueDialog,
  ResourceDialog,
  BudgetDialog,
  BenefitDialog,
  TaskDialog,
} from '../components/ProjectSubFormDialogs'

export default function ProjectsPage() {
  // Navigation state
  const [selectedProject, setSelectedProject] = useState<ProjectModel | null>(null)

  // Data state
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [milestonesDue, setMilestonesDue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Dialog states
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)
  
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [riskDialogOpen, setRiskDialogOpen] = useState(false)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  // Detail sub-data
  const [detailMilestones, setDetailMilestones] = useState<ProjectMilestoneModel[]>([])
  const [detailRisks, setDetailRisks] = useState<RiskModel[]>([])
  const [detailIssues, setDetailIssues] = useState<IssueModel[]>([])
  const [detailResources, setDetailResources] = useState<any[]>([])
  const [detailBudgetLines, setDetailBudgetLines] = useState<BudgetLineModel[]>([])
  const [detailBenefits, setDetailBenefits] = useState<BenefitModel[]>([])
  const [detailTasks, setDetailTasks] = useState<ProjectTaskModel[]>([])
  const [detailGateReviews, setDetailGateReviews] = useState<GateReviewModel[]>([])

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
  const kpiItems: KpiCardItem[] = [
    {
      label: 'Active Projects',
      value: projects.length,
      icon: <CheckCircleIcon />,
      color: 'success.main',
    },
    {
      label: 'On Track',
      value: projects.filter((p) => String(p.pm_ragstatus) === '1').length,
      subtitle: 'Green status',
      icon: <GppGoodIcon />,
      color: 'success.main',
    },
    {
      label: 'At Risk',
      value: projects.filter((p) => String(p.pm_ragstatus) === '0').length,
      subtitle: 'Amber status',
      icon: <GppMaybeIcon />,
      color: 'warning.main',
    },
    {
      label: 'Critical',
      value: projects.filter((p) => String(p.pm_ragstatus) === '2').length,
      icon: <ErrorIcon />,
      color: 'error.main',
      valueColor: 'error.main',
    },
    {
      label: 'Total Active Budget',
      value: currency(projects.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)),
      icon: <AttachMoneyIcon />,
      color: '#3b82f6',
    },
    {
      label: 'Milestones Due',
      value: milestonesDue,
      subtitle: 'This month',
      icon: <EventNoteIcon />,
      color: 'secondary.main',
    },
  ]

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRowClick = useCallback(async (project: ProjectModel) => {
    setSelectedProject(project)
    setDetailLoading(true)
    setError(null)

    try {
      const {
        Pm_projectmilestonesService, Pm_risksService, Pm_issuesService,
        Pm_resourceallocationsService, Pm_budgetlinesService, Pm_benefitsService,
        Pm_projecttasksService, Pm_projectgatereviewsService,
      } = await import('@/generated')

      const unwrap = (result: any): any[] => {
        if (!result) return []
        if (result.success && Array.isArray(result.data)) return result.data
        if ('value' in result && Array.isArray(result.value)) return result.value
        if (Array.isArray(result)) return result
        return []
      }

      const projectId = project.pm_projectid!
      const [
        msResult, riskResult, issueResult, allocResult,
        budgetResult, benefitResult, taskResult, gateResult,
      ] = await Promise.all([
        Pm_projectmilestonesService.getAll({ filter: `_pm_project_value eq '${projectId}'`, top: 100, orderBy: ['pm_planneddate asc'] }),
        Pm_risksService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 }),
        Pm_issuesService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 }),
        Pm_resourceallocationsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 }),
        Pm_budgetlinesService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 }),
        Pm_benefitsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 }),
        Pm_projecttasksService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 200, orderBy: ['pm_plannedstartdate asc'] }),
        Pm_projectgatereviewsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 50, orderBy: ['pm_plannedreviewdate desc'] }),
      ])

      setDetailMilestones(unwrap(msResult))
      setDetailRisks(unwrap(riskResult))
      setDetailIssues(unwrap(issueResult))
      setDetailResources(unwrap(allocResult))
      setDetailBudgetLines(unwrap(budgetResult))
      setDetailBenefits(unwrap(benefitResult))
      setDetailTasks(unwrap(taskResult))
      setDetailGateReviews(unwrap(gateResult))
    } catch (err) {
      setError('Failed to load project detail data.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleBack = () => {
    setSelectedProject(null)
    setError(null)
  }

  const handleProjectSave = async (form: Partial<ProjectModel>) => {
    setIsSavingProject(true)
    try {
      await createProject(form)
      setIsAddingProject(false)
      setSuccessMsg('Project created successfully.')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to create project.')
    } finally {
      setIsSavingProject(false)
    }
  }

  const refreshDetailData = async (type: string) => {
    if (!selectedProject?.pm_projectid) return
    const projectId = selectedProject.pm_projectid
    const unwrap = (result: any): any[] => {
      if (!result) return []
      if (result.success && Array.isArray(result.data)) return result.data
      if ('value' in result && Array.isArray(result.value)) return result.value
      if (Array.isArray(result)) return result
      return []
    }

    try {
      const {
        Pm_projectmilestonesService, Pm_risksService, Pm_issuesService,
        Pm_resourceallocationsService, Pm_budgetlinesService, Pm_benefitsService,
        Pm_projecttasksService
      } = await import('@/generated')

      if (type === 'milestone') {
        const r = await Pm_projectmilestonesService.getAll({ filter: `_pm_project_value eq '${projectId}'`, top: 100, orderBy: ['pm_planneddate asc'] })
        setDetailMilestones(unwrap(r))
      } else if (type === 'risk') {
        const r = await Pm_risksService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 })
        setDetailRisks(unwrap(r))
      } else if (type === 'issue') {
        const r = await Pm_issuesService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 })
        setDetailIssues(unwrap(r))
      } else if (type === 'resource') {
        const r = await Pm_resourceallocationsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 })
        setDetailResources(unwrap(r))
      } else if (type === 'budget') {
        const r = await Pm_budgetlinesService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 })
        setDetailBudgetLines(unwrap(r))
      } else if (type === 'benefit') {
        const r = await Pm_benefitsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 100 })
        setDetailBenefits(unwrap(r))
      } else if (type === 'task') {
        const r = await Pm_projecttasksService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 200, orderBy: ['pm_plannedstartdate asc'] })
        setDetailTasks(unwrap(r))
      }
    } catch { /* silent */ }
  }

  return (
    <Box>
      {selectedProject ? (
        <Project360View
          project={selectedProject}
          loading={detailLoading}
          milestones={detailMilestones}
          risks={detailRisks}
          issues={detailIssues}
          resources={detailResources}
          budgetLines={detailBudgetLines}
          benefits={detailBenefits}
          tasks={detailTasks}
          gateReviews={detailGateReviews}
          onBack={handleBack}
          onAddMilestone={() => setMilestoneDialogOpen(true)}
          onLogRisk={() => setRiskDialogOpen(true)}
          onLogIssue={() => setIssueDialogOpen(true)}
          onAssignResource={() => setResourceDialogOpen(true)}
          onAddBudgetLine={() => setBudgetDialogOpen(true)}
          onAddBenefit={() => setBenefitDialogOpen(true)}
          onAddTask={() => setTaskDialogOpen(true)}
        />
      ) : (
        <>
          <PageHeader
            title="Project Portfolio"
            subtitle="Monitor and manage all active projects across the enterprise."
          />

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

          <KpiCardRow items={kpiItems} loading={loading} />

          <ProjectGrids
            projects={projects}
            loading={loading}
            onRowClick={handleRowClick}
            onAddProject={() => setIsAddingProject(true)}
          />
        </>
      )}

      {/* Dialogs */}
      <ProjectFormDialog
        open={isAddingProject}
        onClose={() => setIsAddingProject(false)}
        onSave={handleProjectSave}
        isSaving={isSavingProject}
      />

      {selectedProject && (
        <>
          <MilestoneDialog
            open={milestoneDialogOpen}
            onClose={() => setMilestoneDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('milestone'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <RiskDialog
            open={riskDialogOpen}
            onClose={() => setRiskDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('risk'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <IssueDialog
            open={issueDialogOpen}
            onClose={() => setIssueDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('issue'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <ResourceDialog
            open={resourceDialogOpen}
            onClose={() => setResourceDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('resource'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <BudgetDialog
            open={budgetDialogOpen}
            onClose={() => setBudgetDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('budget'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <BenefitDialog
            open={benefitDialogOpen}
            onClose={() => setBenefitDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('benefit'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <TaskDialog
            open={taskDialogOpen}
            onClose={() => setTaskDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('task'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
        </>
      )}
    </Box>
  )
}
