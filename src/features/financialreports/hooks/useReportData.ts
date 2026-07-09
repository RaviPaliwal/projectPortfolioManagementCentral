import { useState, useEffect } from 'react'
import { fetchBudgetLines, fetchCashflowEntries } from '@/services/finance.service'
import { fetchAllRisks, fetchAllIssues } from '@/services/risk-issue.service'
import { fetchProjects, mapProjectTask, mapProjectMilestone } from '@/services/project.service'
import { Pm_projecttasksService } from '@/generated/services/Pm_projecttasksService'
import { Pm_projectmilestonesService } from '@/generated/services/Pm_projectmilestonesService'
import { unwrapList } from '@/services/common'

export interface ReportDataPayload {
  budgetLines: any[]
  cashFlows: any[]
  tasks: any[]
  milestones: any[]
  risks: any[]
  issues: any[]
  projects: any[]
  loading: boolean
  error: string | null
}

export function useReportData(): ReportDataPayload {
  const [budgetLines, setBudgetLines] = useState<any[]>([])
  const [cashFlows, setCashFlows] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        setLoading(true)
        const [
          budgetList,
          cashList,
          tasksList,
          milestonesList,
          risksList,
          issuesList,
          projectsList
        ] = await Promise.all([
          fetchBudgetLines(),
          fetchCashflowEntries(),
          Pm_projecttasksService.getAll({
            filter: 'statecode eq 0',
            select: [
              'pm_projecttaskid', 'pm_taskname', 'pm_tasklevel', 'pm_wbsnumber',
              'pm_durationdays', 'pm_plannedstartdate', 'pm_plannedenddate',
              'pm_actualstartdate', 'pm_actualenddate', 'pm_percentcomplete',
              'pm_taskstatus', '_pm_project_value', '_pm_assignedtoresource_value'
            ],
            top: 1000
          }).then(r => unwrapList<any>(r).map(mapProjectTask)),
          Pm_projectmilestonesService.getAll({
            filter: 'statecode eq 0',
            select: [
              'pm_projectmilestoneid', 'pm_milestonename', 'pm_milestonetype',
              'pm_planneddate', 'pm_actualdate', 'pm_ragstatus', 'pm_status',
              'pm_description', '_pm_project_value'
            ],
            top: 500
          }).then(r => unwrapList<any>(r).map(mapProjectMilestone)),
          fetchAllRisks(),
          fetchAllIssues(),
          fetchProjects()
        ])

        if (mounted) {
          setBudgetLines(budgetList || [])
          setCashFlows(cashList || [])
          setTasks(tasksList || [])
          setMilestones(milestonesList || [])
          setRisks(risksList || [])
          setIssues(issuesList || [])
          setProjects(projectsList || [])
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to fetch live database records.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  return {
    budgetLines,
    cashFlows,
    tasks,
    milestones,
    risks,
    issues,
    projects,
    loading,
    error
  }
}
