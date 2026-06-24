import { 
  Pm_projectsService, 
  Pm_risksService, 
  Pm_issuesService, 
  Pm_budgetlinesService,
  Pm_projecttasksService,
  Pm_projectmilestonesService
} from '@/generated'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

export interface ReadinessCheckItem {
  id: string
  label: string
  status: 'passed' | 'failed' | 'warning'
  message?: string
}

export interface ProjectReadinessReport {
  isReady: boolean
  overallStatus: 'passed' | 'failed' | 'warning'
  items: ReadinessCheckItem[]
}

/**
 * Modularized service for checking Project Governance Readiness.
 * Each check is independent and can be expanded.
 */
export const GovernanceReadinessService = {
  /**
   * Performs a comprehensive check of project data based on the target gate stage.
   */
  async checkProjectReadiness(projectId: string, gateStage: number): Promise<ProjectReadinessReport> {
    const pid = normalizeLookupId(projectId)
    if (!pid) return { isReady: false, overallStatus: 'failed', items: [] }

    const items: ReadinessCheckItem[] = []

    try {
      // 1. Fetch project master data
      const projRes = await Pm_projectsService.get(pid, {
        select: ['pm_projectid', '_pm_projectmanager_value', '_pm_portfolio_value', '_pm_programme_value', 'pm_percentcomplete']
      })
      if (!projRes.success) {
        console.error('[GovernanceReadinessService] checkProjectReadiness - projRes failed:', projRes.error)
        items.push({ id: 'error', label: 'System Check', status: 'failed', message: 'Unable to retrieve project details.' })
        return { isReady: false, overallStatus: 'failed', items }
      }
      const project = unwrapSingle<Pm_projects>(projRes)

      // 2. Perform parallel checks for sub-entities
      const [risks, issues, budget, tasks, milestones] = await Promise.all([
        Pm_risksService.getAll({ filter: `_pm_project_value eq '${pid}' and statecode eq 0`, select: ['pm_riskid'] }),
        Pm_issuesService.getAll({ filter: `_pm_project_value eq '${pid}' and statecode eq 0`, select: ['pm_issueid', 'pm_issuestatus'] }),
        Pm_budgetlinesService.getAll({ filter: `_pm_project_value eq '${pid}' and statecode eq 0`, select: ['pm_budgetlineid'] }),
        Pm_projecttasksService.getAll({ filter: `_pm_project_value eq '${pid}' and statecode eq 0`, select: ['pm_projecttaskid'] }),
        Pm_projectmilestonesService.getAll({ filter: `_pm_project_value eq '${pid}' and statecode eq 0`, select: ['pm_projectmilestoneid'] })
      ])

      if (!risks.success) console.error('[GovernanceReadinessService] risks query failed:', risks.error)
      if (!issues.success) console.error('[GovernanceReadinessService] issues query failed:', issues.error)
      if (!budget.success) console.error('[GovernanceReadinessService] budget query failed:', budget.error)
      if (!tasks.success) console.error('[GovernanceReadinessService] tasks query failed:', tasks.error)
      if (!milestones.success) console.error('[GovernanceReadinessService] milestones query failed:', milestones.error)

      const riskCount = unwrapList(risks).length
      const issueCount = unwrapList(issues).length
      const budgetCount = unwrapList(budget).length
      const taskCount = unwrapList(tasks).length
      const milestoneCount = unwrapList(milestones).length

      // --- Rule: Core Metadata ---
      if (!project?._pm_projectmanager_value) {
        items.push({ id: 'pm', label: 'Project Manager Assigned', status: 'failed', message: 'A project manager must be assigned before submission.' })
      } else {
        items.push({ id: 'pm', label: 'Project Manager Assigned', status: 'passed' })
      }

      if (!project?._pm_portfolio_value || !project?._pm_programme_value) {
        items.push({ id: 'hierarchy', label: 'Strategic Alignment', status: 'failed', message: 'Project must be linked to a Portfolio and Programme.' })
      } else {
        items.push({ id: 'hierarchy', label: 'Strategic Alignment', status: 'passed' })
      }

      // --- Rule: Risks & Issues ---
      if (gateStage >= 1) { // Gate 2+
        if (riskCount < 2) {
          items.push({ id: 'risks', label: 'Risk Identification', status: 'warning', message: `Only ${riskCount} risks logged. High-governance projects typically require at least 2.` })
        } else {
          items.push({ id: 'risks', label: 'Risk Identification', status: 'passed' })
        }
      }

      // --- Rule: Financials ---
      if (gateStage >= 1) {
        if (budgetCount === 0) {
          items.push({ id: 'budget', label: 'Budget Definition', status: 'failed', message: 'No budget lines have been defined for this project.' })
        } else {
          items.push({ id: 'budget', label: 'Budget Definition', status: 'passed' })
        }
      }

      // --- Rule: Schedule ---
      if (gateStage >= 1) {
        if (taskCount < 5 || milestoneCount < 2) {
          items.push({ id: 'schedule', label: 'Schedule Detail', status: 'warning', message: 'Project schedule appears incomplete (low task/milestone count).' })
        } else {
          items.push({ id: 'schedule', label: 'Schedule Detail', status: 'passed' })
        }
      }

      // --- Rule: Execution (Gate 3) ---
      if (gateStage >= 2) {
        const pct = project?.pm_percentcomplete ?? 0
        if (pct < 80) {
          items.push({ id: 'progress', label: 'Physical Progress', status: 'failed', message: `Project is only ${pct}% complete. Gate 3 requires >80%.` })
        } else {
          items.push({ id: 'progress', label: 'Physical Progress', status: 'passed' })
        }
      }

    } catch (err) {
      console.error('[GovernanceReadinessService] Check failed:', err)
      items.push({ id: 'error', label: 'System Check', status: 'failed', message: 'Unable to complete readiness assessment.' })
    }

    const failed = items.some(i => i.status === 'failed')
    const warned = items.some(i => i.status === 'warning')

    return {
      isReady: !failed,
      overallStatus: failed ? 'failed' : (warned ? 'warning' : 'passed'),
      items
    }
  }
}

