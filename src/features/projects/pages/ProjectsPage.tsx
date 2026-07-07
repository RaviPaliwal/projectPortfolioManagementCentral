import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Box,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
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
  deleteProject,
  fetchProjectsFull,
  fetchProjectsForSystemUser,
  fetchMilestonesDueThisMonth,
  fetchPortfolioHierarchy,
  uploadDocument,
  updateProjectTask,
  deleteProjectTask,
  deleteProjectMilestone,
} from '@/services'
import { deleteRisk, deleteIssue } from '@/services/risk-issue.service'
import { deleteBenefit, deleteGateReview } from '@/services/governance.service'
import { deleteBudgetLine } from '@/services/finance.service'
import { useUser } from '@/context/UserContext'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { PageHeader, KpiCardRow, ExportButton, Button, ConfirmDialog } from '@/components/common'
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
import { recalculateProjectFinancials, normalizeLookupId, mapProjectTask, mapProjectMilestone } from '@/services'

export default function ProjectsPage() {
  const { currentUser, currentUserPersona, users } = useUser()
  const { allowed: canCreate } = useAuthorization('PROJECTS', 'create')
  const { allowed: canEdit } = useAuthorization('PROJECTS', 'update')
  const { allowed: canDelete } = useAuthorization('PROJECTS', 'delete')

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
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneModel | null>(null)
  const [riskDialogOpen, setRiskDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<RiskModel | null>(null)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<IssueModel | null>(null)
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<any>(null)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetLineModel | null>(null)
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<BenefitModel | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTaskModel | null>(null)
  const [gateReviewDialogOpen, setGateReviewDialogOpen] = useState(false)
  const [editingGateReview, setEditingGateReview] = useState<GateReviewModel | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ProjectModel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
      const isTeamMember = currentUserPersona === 'TeamMember'
      const projPromise = isTeamMember && currentUser?.systemuserid
        ? fetchProjectsForSystemUser(currentUser.systemuserid)
        : fetchProjectsFull()

      const [projList, milestones, hierarchy] = await Promise.all([
        projPromise,
        fetchMilestonesDueThisMonth(),
        fetchPortfolioHierarchy(),
      ])
      setProjects(projList)
      setMilestonesDue(milestones)
      setPortfolios(hierarchy.portfolios.map(p => ({ id: p.pm_portfolioid!, name: p.pm_portfolioname! })))
      setProgrammes(hierarchy.programmes.map(p => {
        const progBudget = p.pm_budgeteur ?? 0
        const allocatedToProjects = projList
          .filter(pj => normalizeLookupId(pj._pm_programme_value) === normalizeLookupId(p.pm_programmeid!))
          .reduce((sum, pj) => sum + (pj.pm_approvedbudgeteur ?? 0), 0)
        return {
          id: p.pm_programmeid!,
          name: p.pm_programmename!,
          portfolioId: p._pm_portfolio_value,
          budget: p.pm_budgeteur,
          startDate: p.pm_startdate,
          endDate: p.pm_enddate,
          availableBudget: progBudget - allocatedToProjects,
        }
      }))
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

      setDetailMilestones(unwrap(msResult).map(mapProjectMilestone))
      setDetailRisks(unwrap(riskResult))
      setDetailIssues(unwrap(issueResult))
      setDetailResources(unwrap(allocResult))
      setDetailBudgetLines(unwrap(budgetResult))
      setDetailBenefits(unwrap(benefitResult))
      setDetailTasks(unwrap(taskResult).map(mapProjectTask))
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

  const handleDelete = async () => {
    if (!deleteTarget?.pm_projectid) return
    setDeleteLoading(true)
    setError(null)
    try {
      await deleteProject(deleteTarget.pm_projectid)
      setProjects(prev => prev.filter(p => p.pm_projectid !== deleteTarget.pm_projectid))
      setSuccessMsg('Project deleted.')
      setDeleteTarget(null)
      if (selectedProject?.pm_projectid === deleteTarget.pm_projectid) {
        setSelectedProject(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete project.')
    } finally {
      setDeleteLoading(false)
    }
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
        }
        
        setSuccessMsg('Project updated successfully.')
        
        // Immediately patch the local projects array from the form data so the grid
        // reflects changes right away, without waiting for any background refresh.
        const selectedUser = users.find(u => u.systemuserid === form.pm_projectmanager)
        setProjects((prev) =>
          prev.map((p) =>
            normalizeLookupId(p.pm_projectid) === normalizeLookupId(targetId)
              ? {
                  ...p,
                  ...form,
                  pm_projectmanagername: selectedUser ? selectedUser.fullname : p.pm_projectmanagername,
                  _pm_projectmanager_value: form.pm_projectmanager,
                }
              : p
          )
        )
        
        // If we are currently viewing this specific project in the detail view, update it too
        if (selectedProject && normalizeLookupId(targetId) === normalizeLookupId(selectedProject.pm_projectid)) {
           setSelectedProject((prev) => prev ? {
             ...prev,
             ...form,
             pm_projectmanagername: selectedUser ? selectedUser.fullname : prev.pm_projectmanagername,
             _pm_projectmanager_value: form.pm_projectmanager,
           } : prev)
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
        setDetailMilestones(unwrap(r).map(mapProjectMilestone))
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
        setDetailTasks(unwrap(r).map(mapProjectTask))
      } else if (type === 'gatereview') {
        const r = await Pm_projectgatereviewsService.getAll({ filter: `_pm_project_value eq '${projectId}' and statecode eq 0`, top: 50, orderBy: ['pm_plannedreviewdate desc'] })
        setDetailGateReviews(unwrap(r))
      }
    } catch { /* silent */ }
  }

  const handleMarkTaskAsDone = async (taskId: string) => {
    if (!selectedProject?.pm_projectid) return
    try {
      // 1. Update task in Dataverse
      await updateProjectTask(taskId, {
        pm_percentcomplete: 100,
        pm_taskstatus: '0'
      })

      // 2. Map and update details local state
      const updatedTasks = detailTasks.map((t) =>
        t.pm_projecttaskid === taskId ? { ...t, pm_percentcomplete: 100, pm_taskstatus: '0' } : t
      )

      // 3. Compute new average progress
      const total = updatedTasks.length
      const avgProgress = total > 0
        ? Math.round(updatedTasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / total)
        : 0

      // 4. Update the project in Dataverse
      await updateProject(selectedProject.pm_projectid, {
        pm_percentcomplete: avgProgress
      })

      setSuccessMsg('Task marked as complete and project progress updated.')

      // 5. Update UI states
      setDetailTasks(updatedTasks)
      setSelectedProject((prev) => (prev ? { ...prev, pm_percentcomplete: avgProgress } : null))
      setProjects((prev) =>
        prev.map((p) =>
          p.pm_projectid === selectedProject.pm_projectid ? { ...p, pm_percentcomplete: avgProgress } : p
        )
      )

      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('[ProjectsPage] handleMarkTaskAsDone error:', err)
      setError('Unable to mark task as completed.')
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: string, percentComplete: number) => {
    if (!selectedProject?.pm_projectid) return
    try {
      // 1. Update task in Dataverse
      await updateProjectTask(taskId, {
        pm_percentcomplete: percentComplete,
        pm_taskstatus: status
      })

      // 2. Map and update details local state
      const updatedTasks = detailTasks.map((t) =>
        t.pm_projecttaskid === taskId ? { ...t, pm_percentcomplete: percentComplete, pm_taskstatus: status } : t
      )

      // 3. Compute new average progress
      const total = updatedTasks.length
      const avgProgress = total > 0
        ? Math.round(updatedTasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / total)
        : 0

      // 4. Update the project in Dataverse
      await updateProject(selectedProject.pm_projectid, {
        pm_percentcomplete: avgProgress
      })

      setSuccessMsg('Task status updated successfully.')

      // 5. Update UI states
      setDetailTasks(updatedTasks)
      setSelectedProject((prev) => (prev ? { ...prev, pm_percentcomplete: avgProgress } : null))
      setProjects((prev) =>
        prev.map((p) =>
          p.pm_projectid === selectedProject.pm_projectid ? { ...p, pm_percentcomplete: avgProgress } : p
        )
      )

      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('[ProjectsPage] handleUpdateTaskStatus error:', err)
      setError('Unable to update task status.')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedProject?.pm_projectid) return
    try {
      // 1. Delete task in Dataverse
      await deleteProjectTask(taskId)

      // 2. Filter details local state
      const updatedTasks = detailTasks.filter((t) => t.pm_projecttaskid !== taskId)

      // 3. Compute new average progress
      const total = updatedTasks.length
      const avgProgress = total > 0
        ? Math.round(updatedTasks.reduce((s, t) => s + (t.pm_percentcomplete ?? 0), 0) / total)
        : 0

      // 4. Update the project in Dataverse
      await updateProject(selectedProject.pm_projectid, {
        pm_percentcomplete: avgProgress
      })

      setSuccessMsg('Task deleted successfully and project progress updated.')

      // 5. Update UI states
      setDetailTasks(updatedTasks)
      setSelectedProject((prev) => (prev ? { ...prev, pm_percentcomplete: avgProgress } : null))
      setProjects((prev) =>
        prev.map((p) =>
          p.pm_projectid === selectedProject.pm_projectid ? { ...p, pm_percentcomplete: avgProgress } : p
        )
      )

      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('[ProjectsPage] handleDeleteTask error:', err)
      setError('Unable to delete project task.')
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedProject?.pm_projectid) return
    try {
      // 1. Delete milestone in Dataverse
      await deleteProjectMilestone(milestoneId)

      // 2. Filter details local state
      const updatedMilestones = detailMilestones.filter((m) => m.pm_projectmilestoneid !== milestoneId)

      setSuccessMsg('Milestone deleted successfully.')

      // 3. Update UI states
      setDetailMilestones(updatedMilestones)

      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('[ProjectsPage] handleDeleteMilestone error:', err)
      setError('Unable to delete project milestone.')
    }
  }

  const handleEditMilestone = (milestone: ProjectMilestoneModel) => {
    setEditingMilestone(milestone)
    setMilestoneDialogOpen(true)
  }

  const handleEditTask = (task: ProjectTaskModel) => {
    setEditingTask(task)
    setTaskDialogOpen(true)
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
      subtitle: 'Medium status',
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
      color: 'primary.main',
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
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

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
          onDeleteProject={handleDelete}
          onAddMilestone={() => {
            setEditingMilestone(null)
            setMilestoneDialogOpen(true)
          }}
          onEditMilestone={handleEditMilestone}
          onLogRisk={() => {
            setEditingRisk(null)
            setRiskDialogOpen(true)
          }}
          onLogIssue={() => {
            setEditingIssue(null)
            setIssueDialogOpen(true)
          }}
          onAssignResource={() => {
            setEditingResource(null)
            setResourceDialogOpen(true)
          }}
          onEditResource={handleEditResource}
          onCompleteResource={handleCompleteResource}
          onAddBudgetLine={() => {
            setEditingBudget(null)
            setBudgetDialogOpen(true)
          }}
          onEditBudgetLine={(b) => {
            setEditingBudget(b)
            setBudgetDialogOpen(true)
          }}
          onDeleteBudgetLine={async (budgetId) => {
            try {
              await deleteBudgetLine(budgetId)
              await recalculateProjectFinancials(selectedProject.pm_projectid!)
              setSuccessMsg('Budget line deleted.')
              refreshDetailData('budget')
              loadData()
              setTimeout(() => setSuccessMsg(null), 3000)
            } catch {
              setError('Unable to delete budget line.')
            }
          }}
          onAddBenefit={() => {
            setEditingBenefit(null)
            setBenefitDialogOpen(true)
          }}
          onEditBenefit={(benefit) => {
            setEditingBenefit(benefit)
            setBenefitDialogOpen(true)
          }}
          onDeleteBenefit={async (benefitId) => {
            try {
              await deleteBenefit(benefitId)
              setSuccessMsg('Benefit deleted.')
              refreshDetailData('benefit')
              setTimeout(() => setSuccessMsg(null), 3000)
            } catch {
              setError('Unable to delete benefit.')
            }
          }}
          onAddTask={() => {
            setEditingTask(null)
            setTaskDialogOpen(true)
          }}
          onEditTask={handleEditTask}
          onNavigateToGateReview={(gr) => {
            setEditingGateReview(gr || null)
            setGateReviewDialogOpen(true)
          }}
          onAddGateReview={() => {
            setEditingGateReview(null)
            setGateReviewDialogOpen(true)
          }}
          onEditGateReview={(gr) => {
            setEditingGateReview(gr)
            setGateReviewDialogOpen(true)
          }}
          onDeleteGateReview={async (grId) => {
            try {
              await deleteGateReview(grId)
              setSuccessMsg('Gate review deleted.')
              refreshDetailData('gatereview')
              setTimeout(() => setSuccessMsg(null), 3000)
            } catch {
              setError('Unable to delete gate review.')
            }
          }}
          onEditRisk={(risk) => {
            setEditingRisk(risk)
            setRiskDialogOpen(true)
          }}
          onDeleteRisk={async (riskId) => {
            try {
              await deleteRisk(riskId)
              setSuccessMsg('Risk deleted.')
              refreshDetailData('risk')
              setTimeout(() => setSuccessMsg(null), 3000)
            } catch {
              setError('Unable to delete risk.')
            }
          }}
          onEditIssue={(issue) => {
            setEditingIssue(issue)
            setIssueDialogOpen(true)
          }}
          onDeleteIssue={async (issueId) => {
            try {
              await deleteIssue(issueId)
              setSuccessMsg('Issue deleted.')
              refreshDetailData('issue')
              setTimeout(() => setSuccessMsg(null), 3000)
            } catch {
              setError('Unable to delete issue.')
            }
          }}
          canEdit={canEdit}
          canDelete={canDelete}
          onEditProject={openEditForm}
          onMarkTaskAsDone={handleMarkTaskAsDone}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onDeleteTask={handleDeleteTask}
          onDeleteMilestone={handleDeleteMilestone}
          onRefresh={() => refreshDetailData('task')}
          onSuccess={(msg) => {
            setSuccessMsg(msg)
            setTimeout(() => setSuccessMsg(null), 4000)
          }}
          onError={(msg) => {
            setError(msg)
            setTimeout(() => setError(null), 4000)
          }}
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

          <KpiCardRow items={kpiItems} loading={loading} />

          <ProjectGrids
            projects={projects}
            loading={loading}
            onRowClick={handleRowClick}
            onAddProject={openCreateForm}
            onEditProject={openEditForm}
            onDeleteProject={setDeleteTarget}
            canEdit={canEdit}
            canDelete={canDelete}
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
            onClose={() => {
              setMilestoneDialogOpen(false)
              setEditingMilestone(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingMilestone ? editingMilestone as any : undefined}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('milestone'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <RiskDialog
            open={riskDialogOpen}
            onClose={() => {
              setRiskDialogOpen(false)
              setEditingRisk(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingRisk ? editingRisk as any : undefined}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('risk'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <IssueDialog
            open={issueDialogOpen}
            onClose={() => {
              setIssueDialogOpen(false)
              setEditingIssue(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingIssue ? editingIssue as any : undefined}
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
            onClose={() => {
              setBudgetDialogOpen(false)
              setEditingBudget(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingBudget ? editingBudget as any : undefined}
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
            onClose={() => {
              setBenefitDialogOpen(false)
              setEditingBenefit(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingBenefit ? editingBenefit as any : undefined}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('benefit'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <TaskDialog
            open={taskDialogOpen}
            onClose={() => {
              setTaskDialogOpen(false)
              setEditingTask(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingTask ? editingTask as any : undefined}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('task'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
          <GateReviewDialog
            open={gateReviewDialogOpen}
            onClose={() => {
              setGateReviewDialogOpen(false)
              setEditingGateReview(null)
            }}
            projectId={selectedProject.pm_projectid!}
            initialData={editingGateReview ? editingGateReview as any : undefined}
            onSuccess={(msg) => { setSuccessMsg(msg); refreshDetailData('gatereview'); setTimeout(() => setSuccessMsg(null), 3000) }}
            onError={(msg) => setError(msg)}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Project"
        message={`Are you sure you want to delete ${deleteTarget?.pm_projectname || 'this project'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </Box>
  )
}
