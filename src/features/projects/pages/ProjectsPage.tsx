import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Box,
  Alert,
  Button,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GppGoodIcon from '@mui/icons-material/GppGood'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import EventNoteIcon from '@mui/icons-material/EventNote'
import ErrorIcon from '@mui/icons-material/Error'

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'

import {
  createProject,
  updateProject,
  fetchProjectsFull,
  fetchMilestonesDueThisMonth,
  fetchPortfolioHierarchy,
  uploadDocument,
} from '@/services'
import { useUser } from '@/context/UserContext'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { PageHeader, KpiCardRow, ExportButton } from '@/components/common'
import type { KpiCardItem } from '@/components/common'
import type { ProjectModel, ProjectMilestoneModel, RiskModel, IssueModel, BudgetLineModel, BenefitModel, ProjectTaskModel, GateReviewModel } from '@/types/dataverse'

import { currency, projectExportColumns } from '../constants'
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
  GateReviewDialog,
} from '../components/ProjectSubFormDialogs'
import { recalculateProjectFinancials, normalizeLookupId } from '@/services'

export default function ProjectsPage() {
  const { currentUser } = useUser()
  const { allowed: canCreate } = useAuthorization('PROJECTS', 'create')
  const { allowed: canEdit } = useAuthorization('PROJECTS', 'update')

  // Navigation state
  const [selectedProject, setSelectedProject] = useState<ProjectModel | null>(null)

  // Data state
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [portfolios, setPortfolios] = useState<{ id: string; name: string }[]>([])
  const [programmes, setProgrammes] = useState<{ id: string; name: string; portfolioId?: string }[]>([])
  const [milestonesDue, setMilestonesDue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Dialog states
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectModel | null>(null)
  const [isSavingProject, setIsSavingProject] = useState(false)
  
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [riskDialogOpen, setRiskDialogOpen] = useState(false)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<any>(null)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [gateReviewDialogOpen, setGateReviewDialogOpen] = useState(false)

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
      const [projList, milestones, hierarchy] = await Promise.all([
        fetchProjectsFull(),
        fetchMilestonesDueThisMonth(),
        fetchPortfolioHierarchy(),
      ])
      setProjects(projList)
      setMilestonesDue(milestones)
      setPortfolios(hierarchy.portfolios.map(p => ({ id: p.pm_portfolioid!, name: p.pm_portfolioname! })))
      setProgrammes(hierarchy.programmes.map(p => ({ id: p.pm_programmeid!, name: p.pm_programmename!, portfolioId: p._pm_portfolio_value })))
    } catch (err) {
      setError('Unable to load project data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

  // ── Handle deep-link navigation from dashboard (or elsewhere) ───────────
  // When a project ID is stored in sessionStorage (e.g. from clicking a project
  // card on the dashboard), auto-navigate to its detail view once data is loaded.
  useEffect(() => {
    const preselectedId = sessionStorage.getItem('preselectProjectId')
    if (preselectedId && !loading && projects.length > 0) {
      sessionStorage.removeItem('preselectProjectId')
      const project = projects.find((p) => normalizeLookupId(p.pm_projectid) === normalizeLookupId(preselectedId))
      if (project) {
        handleRowClick(project)
      }
    }
  }, [loading, projects, handleRowClick])

  const handleBack = () => {
    setSelectedProject(null)
    setError(null)
  }

  const openCreateForm = () => {
    setEditingProject(null)
    setShowFormModal(true)
  }

  const openEditForm = (project: ProjectModel) => {
    setEditingProject(project)
    setShowFormModal(true)
  }

  const handleProjectSave = async (form: Partial<ProjectModel>, files: File[]) => {
    // Determine the ID: either from the updated form data or the state
    const targetId = form.pm_projectid || editingProject?.pm_projectid
    
    setIsSavingProject(true)
    try {
      let projectId = targetId
      if (targetId) {
        // Perform update — persist to server
        try {
          await updateProject(targetId, form)
        } catch (err) {
          // updateProject can throw even when the Dataverse update itself succeeded
          // (e.g. the follow-up fetchProjectDetails fails). We still update the UI
          // optimistically and let the background loadData() reconcile with the server.
          console.warn('[ProjectSave] updateProject threw (likely fetch-after-save failed), proceeding with optimistic update:', err)
        }
        
        setSuccessMsg('Project updated successfully.')
        
        // Immediately patch the local projects array from the form data so the grid
        // reflects changes right away, without waiting for any background refresh.
        setProjects((prev) =>
          prev.map((p) =>
            normalizeLookupId(p.pm_projectid) === normalizeLookupId(targetId)
              ? { ...p, ...form }
              : p
          )
        )
        
        // If we are currently viewing this specific project in the detail view, update it too
        if (selectedProject && normalizeLookupId(targetId) === normalizeLookupId(selectedProject.pm_projectid)) {
           setSelectedProject((prev) => prev ? { ...prev, ...form } : prev)
        }
        
        // Background refresh for consistency with the server
        loadData()
      } else {
        // Perform creation
        const created = await createProject(form)
        if (created) {
          projectId = created.pm_projectid
          setSuccessMsg('Project created successfully.')
          
          // Prepend the new project to the local list immediately
          setProjects((prev) => [created, ...prev])
          
          // Background refresh for consistency
          loadData()
        }
      }

      // Upload staged documents if we have a valid project ID
      if (projectId && files && files.length > 0) {
        const ownerId = currentUser?.systemuserid || ''
        await Promise.all(
          files.map((file) =>
            uploadDocument(MODULE_NAMES.PROJECTS.value, projectId, file, ownerId)
          )
        )
      }
      
      setShowFormModal(false)
      setEditingProject(null) // Clear edit state
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(`Unable to ${targetId ? 'update' : 'create'} project.`)
      console.error('[ProjectsPage] handleProjectSave error:', err)
    } finally {
      setIsSavingProject(false)
    }
  }

  const handleEditResource = (resource: any) => {
    setEditingResource(resource)
    setResourceDialogOpen(true)
  }

  const handleCompleteResource = async (resource: any) => {
    try {
      const { updateResourceAllocation } = await import('@/services')
      await updateResourceAllocation(resource.pm_resourceallocationid, { pm_assignmentstatus: 1 })
      setSuccessMsg('Resource marked as completed.')
      refreshDetailData('resource')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError('Unable to mark resource as completed.')
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
        Pm_projecttasksService, Pm_projectgatereviewsService,
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
      } else if (type === 'gatereview') {
        const r = await Pm_projectgatereviewsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 50, orderBy: ['pm_plannedreviewdate desc'] })
        setDetailGateReviews(unwrap(r))
      }
    } catch { /* silent */ }
  }

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => [
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
  ], [projects, milestonesDue])

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
          onAssignResource={() => {
            setEditingResource(null)
            setResourceDialogOpen(true)
          }}
          onEditResource={handleEditResource}
          onCompleteResource={handleCompleteResource}
          onAddBudgetLine={() => setBudgetDialogOpen(true)}
          onAddBenefit={() => setBenefitDialogOpen(true)}
          onAddTask={() => setTaskDialogOpen(true)}
          onNavigateToGateReview={() => setGateReviewDialogOpen(true)}
          canEdit={canEdit}
          onEditProject={openEditForm}
        />
      ) : (
        <>
          <PageHeader
            title="Project Portfolio"
            subtitle="Monitor and manage all active projects across the enterprise."
            actionElement={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {canCreate && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                    New Project
                  </Button>
                )}
                <ExportButton 
                  filename="projects" 
                  columns={projectExportColumns} 
                  data={projects} 
                />
              </Box>
            }
          />

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

          <KpiCardRow items={kpiItems} loading={loading} />

          <ProjectGrids
            projects={projects}
            loading={loading}
            onRowClick={handleRowClick}
            onAddProject={openCreateForm}
            onEditProject={openEditForm}
            canEdit={canEdit}
          />
        </>
      )}

      {/* Dialogs */}
      <ProjectFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleProjectSave}
        isSaving={isSavingProject}
        initialData={editingProject}
        portfolios={portfolios}
        programmes={programmes}
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
            initialData={editingResource}
          />
          <BudgetDialog
            open={budgetDialogOpen}
            onClose={() => setBudgetDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={async (msg) => { 
              setSuccessMsg(msg); 
              await recalculateProjectFinancials(selectedProject.pm_projectid!);
              refreshDetailData('budget'); 
              loadData(); // refresh main list too
              setTimeout(() => setSuccessMsg(null), 3000) 
            }}
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
          <GateReviewDialog
            open={gateReviewDialogOpen}
            onClose={() => setGateReviewDialogOpen(false)}
            projectId={selectedProject.pm_projectid!}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('gatereview'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
        </>
      )}
    </Box>
  )
}
