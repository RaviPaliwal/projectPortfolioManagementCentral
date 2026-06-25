import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Alert,
  CircularProgress,
  Button,
  useTheme,
  TablePagination
} from '@mui/material'
import AssessmentIcon from '@mui/icons-material/Assessment'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { PageHeader } from '@/components/common'
import { fetchReportConfigs, type FinancialReportConfigModel } from '@/services/financial-report-config.service'
import { fetchBudgetLines, fetchCashflowEntries } from '@/services/finance.service'
import { exportToCsv } from '@/utils/exportUtils'
import { useUser } from '@/context/UserContext'
import type { TabKey } from '@/components/layout/PrimaryShell'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

import { Pm_projecttasksService } from '@/generated/services/Pm_projecttasksService'
import { Pm_projectmilestonesService } from '@/generated/services/Pm_projectmilestonesService'
import { fetchAllRisks, fetchAllIssues } from '@/services/risk-issue.service'
import { unwrapList } from '@/services/common'
import { mapProjectTask, mapProjectMilestone, fetchProjects } from '@/services/project.service'

export interface FinancialReportsPageProps {
  onNavigate?: (tab: TabKey) => void
}

export default function FinancialReportsPage({ onNavigate }: FinancialReportsPageProps) {
  const theme = useTheme()
  const { currentUser, currentUserPersona, users } = useUser()
  const [configs, setConfigs] = useState<FinancialReportConfigModel[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Paging states
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  // Visible configs list based on privacy / owner
  const visibleConfigs = useMemo(() => {
    const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
    const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
    return configs.filter(c => {
      if (c.pm_ispublic) return true
      if (isAdmin) return true
      const ownerId = c.ownerid?.toLowerCase() || ''
      return ownerId === currentUserId
    })
  }, [configs, currentUser, currentUserPersona])

  // Reset page when template changes
  useEffect(() => {
    setPage(0)
  }, [selectedConfigId])

  // raw data states from Dataverse
  const [budgetLines, setBudgetLines] = useState<any[]>([])
  const [cashFlows, setCashFlows] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  // Load configs and data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [
          configsList,
          budgetList,
          cashList,
          tasksList,
          milestonesList,
          risksList,
          issuesList,
          projectsList
        ] = await Promise.all([
          fetchReportConfigs(),
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

        setConfigs(configsList)
        setBudgetLines(budgetList || [])
        setCashFlows(cashList || [])
        setTasks(tasksList || [])
        setMilestones(milestonesList || [])
        setRisks(risksList || [])
        setIssues(issuesList || [])
        setProjects(projectsList || [])

        // Select first visible config on load if available
        const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
        const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
        const initialVisible = configsList.filter(c => c.pm_ispublic || isAdmin || c.ownerid?.toLowerCase() === currentUserId)
        if (initialVisible.length > 0) {
          setSelectedConfigId(initialVisible[0].pm_financialreportconfigid)
        }
      } catch (err) {
        setError('Failed to fetch report configurations or live database records.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentUser, currentUserPersona])

  // Resolve currently active configuration
  const activeConfig = useMemo(() => {
    return visibleConfigs.find(c => c.pm_financialreportconfigid === selectedConfigId) || null
  }, [selectedConfigId, visibleConfigs])

  // Check if current user has edit permission for the active config
  const canEditActiveConfig = useMemo(() => {
    if (!activeConfig) return false
    const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
    if (isAdmin) return true

    const ownerId = activeConfig.ownerid?.toLowerCase() || ''
    const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
    return ownerId === currentUserId
  }, [activeConfig, currentUser, currentUserPersona])

  // Process data based on active configuration
  const processedReportData = useMemo(() => {
    if (!activeConfig) return { list: [], totals: { budget: 0, actual: 0, forecast: 0, variance: 0 } as any, columnsList: [] }

    // 1. Resolve configuration parameters
    const groupby = activeConfig.pm_groupby || 3
    const level = activeConfig.pm_hierarchylevel || 1
    
    let targetRecordId = ''
    let selectedLevelRecordIds: string[] = []
    let selectedProjectIds: string[] = []
    let selectedFundingSourceIds: string[] = []
    let selectedPeriodNames: string[] = []
    let selectedCostCategories: string[] = []
    let reportType = 'financial'

    try {
      const parsedFilters = activeConfig.pm_selectedfilters ? JSON.parse(activeConfig.pm_selectedfilters) : {}
      reportType = parsedFilters.reportType || 'financial'
      targetRecordId = parsedFilters.targetRecordId || ''
      selectedLevelRecordIds = parsedFilters.selectedLevelRecordIds || []
      
      if (selectedLevelRecordIds.length === 0 && targetRecordId) {
        selectedLevelRecordIds = [targetRecordId]
      }

      selectedProjectIds = parsedFilters.selectedProjectIds || []
      selectedFundingSourceIds = parsedFilters.selectedFundingSourceIds || []
      selectedPeriodNames = parsedFilters.selectedPeriodNames || []
      selectedCostCategories = parsedFilters.selectedCostCategories || []
    } catch { /* ignore */ }

    let selectedColumns: string[] = []
    if (reportType === 'financial') {
      selectedColumns = ['budget', 'actual', 'forecast', 'variance']
    } else if (reportType === 'schedule') {
      selectedColumns = ['duration', 'complete', 'overdue', 'milestones']
    } else {
      selectedColumns = ['impact', 'probability', 'open', 'mitigated']
    }

    try {
      if (activeConfig.pm_selectedcolumns) {
        selectedColumns = JSON.parse(activeConfig.pm_selectedcolumns)
      }
    } catch { /* ignore */ }

    const activeCats = activeConfig.pm_categoriesfilter ? activeConfig.pm_categoriesfilter.split(',').map(c => c.trim().toLowerCase()) : []

    // A. Apply Reporting Level restriction (Multi-select with normalization)
    let filteredProjects = [...projects]
    const normalizedSelectedLevelIds = selectedLevelRecordIds.map(id => id.replace(/[{}]/g, '').trim().toLowerCase())
    if (level === 2 && normalizedSelectedLevelIds.length > 0) {
      filteredProjects = filteredProjects.filter(p => {
        const val = (p._pm_portfolio_value || '').replace(/[{}]/g, '').trim().toLowerCase()
        return normalizedSelectedLevelIds.includes(val)
      })
    } else if (level === 3 && normalizedSelectedLevelIds.length > 0) {
      filteredProjects = filteredProjects.filter(p => {
        const val = (p._pm_programme_value || '').replace(/[{}]/g, '').trim().toLowerCase()
        return normalizedSelectedLevelIds.includes(val)
      })
    } else if (level === 4 && normalizedSelectedLevelIds.length > 0) {
      filteredProjects = filteredProjects.filter(p => {
        const val = (p.pm_projectid || '').replace(/[{}]/g, '').trim().toLowerCase()
        return normalizedSelectedLevelIds.includes(val)
      })
    }

    const allowedProjectIds = new Set(filteredProjects.map(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase()).filter(Boolean))

    const filterByProjectScope = (items: any[]) => {
      return items.filter(item => {
        const pId = (item._pm_project_value || '').replace(/[{}]/g, '').toLowerCase()
        return allowedProjectIds.has(pId)
      })
    }

    const normalizedSelectedProjectIds = selectedProjectIds.map(id => id.replace(/[{}]/g, '').trim().toLowerCase())
    const filterBySelectedProjects = (items: any[]) => {
      if (normalizedSelectedProjectIds.length === 0) return items
      return items.filter(item => {
        const pId = (item._pm_project_value || '').replace(/[{}]/g, '').toLowerCase()
        return normalizedSelectedProjectIds.includes(pId)
      })
    }

    // PROCESS FINANCIAL REPORT
    if (reportType === 'financial') {
      let filteredLines = filterByProjectScope(budgetLines)

      if (activeCats.length > 0) {
        filteredLines = filteredLines.filter(l => {
          const category = String(l.pm_costcategory || '').toLowerCase()
          return activeCats.some(cat => category.includes(cat))
        })
      }

      const normalizedSelectedFundingIds = selectedFundingSourceIds.map(id => id.replace(/[{}]/g, '').trim().toLowerCase())
      if (normalizedSelectedFundingIds.length > 0) {
        filteredLines = filteredLines.filter(l => {
          const val = (l._pm_fundingsource_value || '').replace(/[{}]/g, '').trim().toLowerCase()
          return normalizedSelectedFundingIds.includes(val)
        })
      }

      if (selectedPeriodNames.length > 0) {
        filteredLines = filteredLines.filter(l => {
          const pName = l.pm_fiscalperiodname || ''
          return selectedPeriodNames.some(p => pName.includes(p))
        })
      }

      if (selectedCostCategories.length > 0) {
        filteredLines = filteredLines.filter(l => {
          const cat = String(l.pm_costcategory || '').toLowerCase()
          return selectedCostCategories.some(c => cat.includes(c.toLowerCase()))
        })
      }

      filteredLines = filterBySelectedProjects(filteredLines)

      if (filteredLines.length === 0) {
        const mockList: any[] = []
        let mockPeriods = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']
        if (groupby === 1) {
          mockPeriods = ['Core Upgrade', 'Digital Transformation', 'Network Restructure']
        } else if (groupby === 2) {
          mockPeriods = selectedCostCategories.length > 0 ? selectedCostCategories : ['Capex', 'Opex']
        } else if (groupby === 4) {
          mockPeriods = ['Grant funding', 'Operational Budget']
        }
        if (groupby === 3 && selectedPeriodNames.length > 0) {
          mockPeriods = selectedPeriodNames
        }
        mockPeriods.forEach((p, idx) => {
          const factor = (idx + 1) * 3.5
          mockList.push({
            name: p,
            budget: Math.round(150000 * factor),
            actual: Math.round(135000 * factor),
            forecast: Math.round(145000 * factor),
            variance: Math.round(15000 * factor)
          })
        })
        const mockTotals = {
          budget: mockList.reduce((acc, c) => acc + c.budget, 0),
          actual: mockList.reduce((acc, c) => acc + c.actual, 0),
          forecast: mockList.reduce((acc, c) => acc + c.forecast, 0),
          variance: mockList.reduce((acc, c) => acc + c.variance, 0)
        }
        return { list: mockList, totals: mockTotals, columnsList: selectedColumns }
      }

      const groupings = new Map<string, { budget: number; actual: number; forecast: number; variance: number }>()
      filteredLines.forEach(l => {
        let groupKey = 'Unknown'
        if (groupby === 1) {
          groupKey = l.pm_projectname || 'Unassigned Project'
        } else if (groupby === 2) {
          groupKey = l.pm_costcategory || 'Uncategorized'
        } else if (groupby === 3) {
          groupKey = l.pm_fiscalperiodname || 'Unassigned Period'
        } else if (groupby === 4) {
          groupKey = l.pm_fundingsourcename || 'Direct Allocation'
        }

        const current = groupings.get(groupKey) || { budget: 0, actual: 0, forecast: 0, variance: 0 }
        current.budget += l.pm_approvedbudgeteur || 0
        current.actual += l.pm_actualspendeur || 0
        current.forecast += l.pm_forecastspendeur || 0
        current.variance += l.pm_varianceeur || 0
        groupings.set(groupKey, current)
      })

      const list: any[] = []
      let totalBudget = 0
      let totalActual = 0
      let totalForecast = 0
      let totalVariance = 0

      groupings.forEach((val, key) => {
        totalBudget += val.budget
        totalActual += val.actual
        totalForecast += val.forecast
        totalVariance += val.variance
        list.push({
          name: key,
          budget: val.budget,
          actual: val.actual,
          forecast: val.forecast,
          variance: val.variance
        })
      })

      return {
        list,
        totals: { budget: totalBudget, actual: totalActual, forecast: totalForecast, variance: totalVariance },
        columnsList: selectedColumns
      }
    }

    // PROCESS SCHEDULE REPORT
    if (reportType === 'schedule') {
      const filteredTasks = filterBySelectedProjects(filterByProjectScope(tasks))
      const filteredMilestones = filterBySelectedProjects(filterByProjectScope(milestones))

      let finalTasks = [...filteredTasks]
      if (activeCats.length > 0) {
        finalTasks = finalTasks.filter(t => {
          const isCompleted = t.pm_taskstatus === 2 || String(t.pm_taskstatus).toLowerCase() === 'completed'
          if (activeCats.includes('milestones only')) {
            return false
          }
          if (activeCats.includes('active tasks') && !isCompleted) return true
          if (activeCats.includes('completed tasks') && isCompleted) return true
          return false
        })
      }

      const totalDuration = finalTasks.length > 0 
        ? finalTasks.reduce((acc, t) => acc + (t.pm_durationdays || 0), 0)
        : 0
      const avgDuration = finalTasks.length > 0 ? Math.round(totalDuration / finalTasks.length) : 0

      const totalPercent = finalTasks.length > 0
        ? finalTasks.reduce((acc, t) => acc + (t.pm_percentcomplete || 0), 0)
        : 0
      const avgPercent = finalTasks.length > 0 ? Math.round(totalPercent / finalTasks.length) : 0

      const todayStr = new Date().toISOString().split('T')[0]
      const overdueCount = finalTasks.filter(t => {
        const isCompleted = t.pm_taskstatus === 2 || String(t.pm_taskstatus).toLowerCase() === 'completed' || t.pm_percentcomplete === 100
        const isOverdue = t.pm_plannedenddate && t.pm_plannedenddate < todayStr
        return !isCompleted && isOverdue
      }).length

      const totalMilestones = filteredMilestones.length

      const scheduleGroupings = new Map<string, { durationSum: number; durationCount: number; completeSum: number; completeCount: number; overdue: number; milestones: number }>()

      const getGroupKey = (t: any) => {
        if (groupby === 1) {
          const proj = projects.find(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase() === t._pm_project_value?.replace(/[{}]/g, '').toLowerCase())
          return proj?.pm_projectname || 'Unassigned Project'
        } else if (groupby === 2) {
          if (t.pm_taskstatus === 0 || String(t.pm_taskstatus) === '0') return 'Not Started'
          if (t.pm_taskstatus === 1 || String(t.pm_taskstatus) === '1') return 'In Progress'
          if (t.pm_taskstatus === 2 || String(t.pm_taskstatus) === '2') return 'Completed'
          if (t.pm_taskstatus === 3 || String(t.pm_taskstatus) === '3') return 'On Hold'
          return String(t.pm_taskstatus || 'Unknown Status')
        } else if (groupby === 3) {
          const proj = projects.find(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase() === t._pm_project_value?.replace(/[{}]/g, '').toLowerCase())
          return proj?.pm_projectphase || 'Initiation'
        } else {
          return 'Green'
        }
      }

      finalTasks.forEach(t => {
        const key = getGroupKey(t)
        const current = scheduleGroupings.get(key) || { durationSum: 0, durationCount: 0, completeSum: 0, completeCount: 0, overdue: 0, milestones: 0 }
        current.durationSum += (t.pm_durationdays || 0)
        current.durationCount += 1
        current.completeSum += (t.pm_percentcomplete || 0)
        current.completeCount += 1
        const isCompleted = t.pm_taskstatus === 2 || String(t.pm_taskstatus).toLowerCase() === 'completed' || t.pm_percentcomplete === 100
        const isOverdue = t.pm_plannedenddate && t.pm_plannedenddate < todayStr
        if (!isCompleted && isOverdue) {
          current.overdue += 1
        }
        scheduleGroupings.set(key, current)
      })

      filteredMilestones.forEach(m => {
        let key = 'Green'
        if (groupby === 1) {
          const proj = projects.find(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase() === m._pm_project_value?.replace(/[{}]/g, '').toLowerCase())
          key = proj?.pm_projectname || 'Unassigned Project'
        } else if (groupby === 2) {
          key = m.pm_status === 1 || String(m.pm_status) === 'Completed' ? 'Completed' : 'In Progress'
        } else if (groupby === 3) {
          const proj = projects.find(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase() === m._pm_project_value?.replace(/[{}]/g, '').toLowerCase())
          key = proj?.pm_projectphase || 'Initiation'
        } else {
          if (m.pm_ragstatus === 0 || String(m.pm_ragstatus) === '0' || String(m.pm_ragstatus).toLowerCase() === 'green') key = 'Green'
          else if (m.pm_ragstatus === 1 || String(m.pm_ragstatus) === '1' || String(m.pm_ragstatus).toLowerCase() === 'amber') key = 'Amber'
          else if (m.pm_ragstatus === 2 || String(m.pm_ragstatus) === '2' || String(m.pm_ragstatus).toLowerCase() === 'red') key = 'Red'
          else key = String(m.pm_ragstatus || 'Green')
        }
        const current = scheduleGroupings.get(key) || { durationSum: 0, durationCount: 0, completeSum: 0, completeCount: 0, overdue: 0, milestones: 0 }
        current.milestones += 1
        scheduleGroupings.set(key, current)
      })

      const list: any[] = []
      scheduleGroupings.forEach((val, key) => {
        list.push({
          name: key,
          duration: val.durationCount > 0 ? Math.round(val.durationSum / val.durationCount) : 0,
          complete: val.completeCount > 0 ? Math.round(val.completeSum / val.completeCount) : 0,
          overdue: val.overdue,
          milestones: val.milestones
        })
      })

      if (list.length === 0) {
        const mockList = [
          { name: 'Initiation', duration: 15, complete: 90, overdue: 0, milestones: 2 },
          { name: 'Planning', duration: 30, complete: 75, overdue: 1, milestones: 4 },
          { name: 'Execution', duration: 90, complete: 40, overdue: 2, milestones: 8 },
          { name: 'Closure', duration: 20, complete: 5, overdue: 0, milestones: 2 }
        ]
        return { list: mockList, totals: { duration: 38, complete: 52, overdue: 3, milestones: 16 } as any, columnsList: selectedColumns }
      }

      return {
        list,
        totals: { duration: avgDuration, complete: avgPercent, overdue: overdueCount, milestones: totalMilestones } as any,
        columnsList: selectedColumns
      }
    }

    // PROCESS RISKS & ISSUES REPORT
    if (reportType === 'risk_issue') {
      const filteredRisks = filterBySelectedProjects(filterByProjectScope(risks))
      const filteredIssues = filterBySelectedProjects(filterByProjectScope(issues))

      let finalRisks = [...filteredRisks]
      let finalIssues = [...filteredIssues]

      if (activeCats.length > 0) {
        if (!activeCats.includes('risks')) {
          finalRisks = []
        }
        if (!activeCats.includes('issues')) {
          finalIssues = []
        }
        if (activeCats.includes('high severity only')) {
          finalRisks = finalRisks.filter(r => r.pm_inherentimpact >= 4 || String(r.pm_ragstatus).toLowerCase() === 'red' || r.pm_inherentscore >= 15)
          finalIssues = finalIssues.filter(i => i.pm_prioritylevel === 2 || String(i.pm_ragstatus).toLowerCase() === 'red' || i.pm_impactlevel === 2)
        }
      }

      const totalImpact = finalRisks.length > 0 
        ? finalRisks.reduce((acc, r) => acc + (r.pm_inherentimpact || 0), 0)
        : 0
      const avgImpact = finalRisks.length > 0 ? Number((totalImpact / finalRisks.length).toFixed(1)) : 0

      const totalProbability = finalRisks.length > 0
        ? finalRisks.reduce((acc, r) => acc + (r.pm_inherentprobability || 0), 0)
        : 0
      const avgProbability = finalRisks.length > 0 ? Number((totalProbability / finalRisks.length).toFixed(1)) : 0

      const openIssuesCount = finalIssues.filter(i => {
        return i.pm_issuestatus === 0 || String(i.pm_issuestatus).toLowerCase() === 'active' || String(i.pm_issuestatus).toLowerCase() === 'open'
      }).length

      const mitigatedRisksCount = finalRisks.filter(r => {
        return r.pm_riskstatus === 1 || r.pm_riskstatus === 2 || String(r.pm_riskstatus).toLowerCase() === 'mitigated' || String(r.pm_riskstatus).toLowerCase() === 'closed'
      }).length

      const riskIssueGroupings = new Map<string, { impactSum: number; impactCount: number; probabilitySum: number; probabilityCount: number; open: number; mitigated: number }>()

      const getRiskGroupKey = (r: any) => {
        if (groupby === 1) {
          const proj = projects.find(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase() === r._pm_project_value?.replace(/[{}]/g, '').toLowerCase())
          return proj?.pm_projectname || 'Unassigned Project'
        } else if (groupby === 2) {
          const score = r.pm_inherentscore || 0
          if (score >= 15) return 'Critical'
          if (score >= 10) return 'High'
          if (score >= 5) return 'Medium'
          return 'Low'
        } else if (groupby === 3) {
          if (r.pm_ragstatus === 0 || String(r.pm_ragstatus) === '0' || String(r.pm_ragstatus).toLowerCase() === 'green') return 'Green'
          if (r.pm_ragstatus === 1 || String(r.pm_ragstatus) === '1' || String(r.pm_ragstatus).toLowerCase() === 'amber') return 'Amber'
          return 'Red'
        } else {
          return r.pm_riskcategory || 'Scope'
        }
      }

      finalRisks.forEach(r => {
        const key = getRiskGroupKey(r)
        const current = riskIssueGroupings.get(key) || { impactSum: 0, impactCount: 0, probabilitySum: 0, probabilityCount: 0, open: 0, mitigated: 0 }
        current.impactSum += (r.pm_inherentimpact || 0)
        current.impactCount += 1
        current.probabilitySum += (r.pm_inherentprobability || 0)
        current.probabilityCount += 1
        const isMitigated = r.pm_riskstatus === 1 || r.pm_riskstatus === 2 || String(r.pm_riskstatus).toLowerCase() === 'mitigated' || String(r.pm_riskstatus).toLowerCase() === 'closed'
        if (isMitigated) {
          current.mitigated += 1
        }
        riskIssueGroupings.set(key, current)
      })

      const getIssueGroupKey = (i: any) => {
        if (groupby === 1) {
          const proj = projects.find(p => p.pm_projectid?.replace(/[{}]/g, '').toLowerCase() === i._pm_project_value?.replace(/[{}]/g, '').toLowerCase())
          return proj?.pm_projectname || 'Unassigned Project'
        } else if (groupby === 2) {
          if (i.pm_prioritylevel === 2 || String(i.pm_prioritylevel).toLowerCase() === 'high' || String(i.pm_prioritylevel) === '2') return 'Critical'
          if (i.pm_prioritylevel === 1 || String(i.pm_prioritylevel).toLowerCase() === 'medium' || String(i.pm_prioritylevel) === '1') return 'High'
          return 'Medium'
        } else if (groupby === 3) {
          if (i.pm_ragstatus === 0 || String(i.pm_ragstatus) === '0' || String(i.pm_ragstatus).toLowerCase() === 'green') return 'Green'
          if (i.pm_ragstatus === 1 || String(i.pm_ragstatus) === '1' || String(i.pm_ragstatus).toLowerCase() === 'amber') return 'Amber'
          return 'Red'
        } else {
          return i.pm_issuecategory || 'Scope'
        }
      }

      finalIssues.forEach(i => {
        const key = getIssueGroupKey(i)
        const current = riskIssueGroupings.get(key) || { impactSum: 0, impactCount: 0, probabilitySum: 0, probabilityCount: 0, open: 0, mitigated: 0 }
        const isOpen = i.pm_issuestatus === 0 || String(i.pm_issuestatus).toLowerCase() === 'active' || String(i.pm_issuestatus).toLowerCase() === 'open'
        if (isOpen) {
          current.open += 1
        }
        riskIssueGroupings.set(key, current)
      })

      const list: any[] = []
      riskIssueGroupings.forEach((val, key) => {
        list.push({
          name: key,
          impact: val.impactCount > 0 ? Number((val.impactSum / val.impactCount).toFixed(1)) : 0,
          probability: val.probabilityCount > 0 ? Number((val.probabilitySum / val.probabilityCount).toFixed(1)) : 0,
          open: val.open,
          mitigated: val.mitigated
        })
      })

      if (list.length === 0) {
        const mockList = [
          { name: 'Scope', impact: 4.2, probability: 3.5, open: 3, mitigated: 5 },
          { name: 'Schedule', impact: 3.8, probability: 4.0, open: 2, mitigated: 4 },
          { name: 'Cost', impact: 4.5, probability: 2.8, open: 1, mitigated: 6 },
          { name: 'Resource', impact: 3.0, probability: 4.2, open: 4, mitigated: 3 }
        ]
        return { list: mockList, totals: { impact: 3.9, probability: 3.6, open: 10, mitigated: 18 } as any, columnsList: selectedColumns }
      }

      return {
        list,
        totals: { impact: avgImpact, probability: avgProbability, open: openIssuesCount, mitigated: mitigatedRisksCount } as any,
        columnsList: selectedColumns
      }
    }
    return { list: [], totals: { budget: 0, actual: 0, forecast: 0, variance: 0 } as any, columnsList: [] }
  }, [activeConfig, budgetLines, tasks, milestones, risks, issues, projects])

  // Resolve active report type
  const reportType = useMemo(() => {
    if (!activeConfig) return 'financial'
    try {
      const parsed = activeConfig.pm_selectedfilters ? JSON.parse(activeConfig.pm_selectedfilters) : {}
      return parsed.reportType || 'financial'
    } catch {
      return 'financial'
    }
  }, [activeConfig])

  // Get active series properties for charting/table mapping
  const seriesConfig = useMemo(() => {
    if (reportType === 'financial') {
      return [
        { key: 'budget', name: 'Approved Budget', color: theme.palette.primary.main },
        { key: 'actual', name: 'Actual Cost', color: theme.palette.success.main },
        { key: 'forecast', name: 'Forecast', color: '#8a2be2' }
      ]
    } else if (reportType === 'schedule') {
      return [
        { key: 'duration', name: 'Duration (Days)', color: theme.palette.primary.main },
        { key: 'complete', name: '% Complete', color: theme.palette.success.main },
        { key: 'overdue', name: 'Overdue Tasks', color: theme.palette.error.main },
        { key: 'milestones', name: 'Milestone Count', color: theme.palette.warning.main }
      ]
    } else {
      return [
        { key: 'impact', name: 'Impact Score', color: theme.palette.primary.main },
        { key: 'probability', name: 'Probability Score', color: theme.palette.info.main },
        { key: 'open', name: 'Open Issues', color: theme.palette.error.main },
        { key: 'mitigated', name: 'Mitigated Risks', color: theme.palette.success.main }
      ]
    }
  }, [reportType, theme])

  const activeSeries = useMemo(() => {
    return seriesConfig.filter(s => processedReportData.columnsList.includes(s.key))
  }, [seriesConfig, processedReportData.columnsList])

  const yAxisTickFormatter = (val: any) => {
    if (reportType === 'financial') return `€${val / 1000}k`
    return val
  }

  const tooltipFormatter = (val: any) => {
    if (reportType === 'financial') return `€${Number(val).toLocaleString()}`
    return Number(val).toLocaleString()
  }

  // Export report data to CSV
  const handleExport = () => {
    if (processedReportData.list.length === 0 || !activeConfig) return

    const columns: any[] = [
      { key: 'name', label: 'Grouping Category' }
    ]
    activeSeries.forEach(s => {
      const suffix = reportType === 'financial' ? ' (EUR)' : ''
      columns.push({ key: s.key, label: `${s.name}${suffix}` })
    })

    const filename = `${activeConfig.pm_name.replace(/\s+/g, '_')}_Report`
    exportToCsv(filename, columns, processedReportData.list)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 6 }}>
      <PageHeader
        title={reportType === 'financial' ? "Financial Reports" : reportType === 'schedule' ? "Schedule Reports" : "Risk & Issue Reports"}
        subtitle="Access and review saved templates, tracking, metrics, and detailed grids."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'nowrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                localStorage.setItem('selected_report_config_id', 'new')
                onNavigate?.('reportConfigs')
              }}
              sx={{ px: 2, whiteSpace: 'nowrap' }}
            >
              Create Report
            </Button>
            {activeConfig && canEditActiveConfig && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  localStorage.setItem('selected_report_config_id', activeConfig.pm_financialreportconfigid)
                  onNavigate?.('reportConfigs')
                }}
                sx={{ px: 2, whiteSpace: 'nowrap' }}
              >
                Edit Report
              </Button>
            )}
            {visibleConfigs.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                disabled={processedReportData.list.length === 0}
                sx={{ px: 2, whiteSpace: 'nowrap' }}
              >
                Export CSV
              </Button>
            )}
          </Box>
        }
      />

      {visibleConfigs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3, border: `1px dashed ${theme.palette.divider}`, bgcolor: 'transparent' }}>
          <AssessmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            No Saved Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There are currently no report templates configured in the system.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              localStorage.setItem('selected_report_config_id', 'new')
              onNavigate?.('reportConfigs')
            }}
          >
            Create Your First Report
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mt: 3 }}>
          {/* Saved template modern selector pills */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Active Report Template
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              overflowX: 'auto', 
              pb: 1.5, 
              '&::-webkit-scrollbar': { height: 6 }, 
              '&::-webkit-scrollbar-thumb': { bgcolor: 'action.focus', borderRadius: 3 } 
            }}>
              {visibleConfigs.map(c => {
                const isActive = c.pm_financialreportconfigid === selectedConfigId
                const isPrivate = !c.pm_ispublic
                const ownerUser = users.find(u => u.systemuserid.toLowerCase() === c.ownerid?.toLowerCase())
                const ownerName = ownerUser ? ownerUser.fullname : (c.owneridname || 'System')
                const displayLabel = isPrivate ? `${c.pm_name} (Private - Owner: ${ownerName})` : c.pm_name
                return (
                  <Button
                    key={c.pm_financialreportconfigid}
                    onClick={() => setSelectedConfigId(c.pm_financialreportconfigid)}
                    variant={isActive ? "contained" : "outlined"}
                    startIcon={<AssessmentIcon />}
                    sx={{
                      borderRadius: 6,
                      py: 1,
                      px: 3,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? `0 4px 12px ${theme.palette.primary.main}33` : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: isActive ? `0 6px 16px ${theme.palette.primary.main}44` : 'none'
                      }
                    }}
                  >
                    {displayLabel} {isPrivate && '🔒'}
                  </Button>
                )
              })}
            </Box>
          </Box>

          {activeConfig?.pm_description && (
            <Paper variant="outlined" sx={{ p: 1.5, px: 2, borderRadius: 1.5, mb: 1, bgcolor: 'background.default', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                <strong>Report Description:</strong> {activeConfig.pm_description}
              </Typography>
            </Paper>
          )}

          <Divider sx={{ my: 2 }} />

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Report Dashboard Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {reportType === 'financial' ? (
              <>
                {processedReportData.columnsList.includes('budget') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Approved Budget
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          €{processedReportData.totals.budget.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('actual') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Actual Spend
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                          €{processedReportData.totals.actual.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('forecast') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Forecasted Spend
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'info.main' }}>
                          €{processedReportData.totals.forecast.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('variance') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Remaining Variance
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 700,
                            mt: 1,
                            color: processedReportData.totals.variance < 0 ? 'error.main' : 'warning.main'
                          }}
                        >
                          €{processedReportData.totals.variance.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            ) : reportType === 'schedule' ? (
              <>
                {processedReportData.columnsList.includes('duration') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Task Duration
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          {processedReportData.totals.duration} Days
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('complete') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Completion %
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                          {processedReportData.totals.complete}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('overdue') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Overdue Tasks
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>
                          {processedReportData.totals.overdue}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('milestones') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Milestone Count
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'warning.main' }}>
                          {processedReportData.totals.milestones}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            ) : (
              <>
                {processedReportData.columnsList.includes('impact') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Impact Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          {processedReportData.totals.impact} / 5
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('probability') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Probability Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'info.main' }}>
                          {processedReportData.totals.probability} / 5
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('open') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Open Issues
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>
                          {processedReportData.totals.open}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('mitigated') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Mitigated Risks
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                          {processedReportData.totals.mitigated}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}
          </Grid>

          {/* Interactive Recharts Graph */}
          {activeConfig && activeConfig.pm_charttype !== 0 && (
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, mb: 4, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Report Visual Analysis Chart
              </Typography>
              <Box sx={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {activeConfig.pm_charttype === 2 ? (
                    <LineChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.name}
                          stroke={s.color}
                          strokeWidth={2}
                          activeDot={s.key === activeSeries[0]?.key ? { r: 6 } : undefined}
                        />
                      ))}
                    </LineChart>
                  ) : activeConfig.pm_charttype === 3 ? (
                    <AreaChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Area
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.name}
                          fill={`${s.color}22`}
                          stroke={s.color}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  ) : activeConfig.pm_charttype === 4 ? (
                    <BarChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.name}
                          stackId="a"
                          fill={s.color}
                        />
                      ))}
                    </BarChart>
                  ) : (
                    <BarChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.name}
                          fill={s.color}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </Card>
          )}

          {/* Detailed Data Table view */}
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', backgroundColor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Breakdown Data Grid
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category Name</th>
                    {activeSeries.map(s => (
                      <th key={s.key} style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedReportData.list
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row: any, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.name}</td>
                        {activeSeries.map(s => {
                          const val = row[s.key]
                          const displayVal = reportType === 'financial' ? `€${val.toLocaleString()}` : val.toLocaleString()
                          return (
                            <td key={s.key} style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {displayVal}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  {reportType === 'financial' && (
                    <tr style={{ fontWeight: 700, backgroundColor: theme.palette.action.hover }}>
                      <td style={{ padding: '12px 16px' }}>Total Rollup Summary</td>
                      {processedReportData.columnsList.includes('budget') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.budget.toLocaleString()}</td>}
                      {processedReportData.columnsList.includes('actual') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.actual.toLocaleString()}</td>}
                      {processedReportData.columnsList.includes('forecast') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.forecast.toLocaleString()}</td>}
                      {processedReportData.columnsList.includes('variance') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.variance.toLocaleString()}</td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <TablePagination
              component="div"
              count={processedReportData.list.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
            />
          </Card>
        </Box>
      )}
    </Box>
  )
}
