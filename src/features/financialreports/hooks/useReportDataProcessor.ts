import { useMemo } from 'react'

export interface ProcessedReportData {
  list: any[]
  totals: any
  columnsList: string[]
}

export function useReportDataProcessor(
  activeConfig: any,
  budgetLines: any[],
  tasks: any[],
  milestones: any[],
  risks: any[],
  issues: any[],
  projects: any[]
): ProcessedReportData {
  return useMemo(() => {
    if (!activeConfig) return { list: [], totals: { budget: 0, actual: 0, forecast: 0, variance: 0 }, columnsList: [] }

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
      selectedColumns = ['duration', 'complete', 'overdue', 'milestones', 'totalTasks']
    } else {
      selectedColumns = ['impact', 'probability', 'open', 'mitigated']
    }

    try {
      if (activeConfig.pm_selectedcolumns) {
        const parsedCols = JSON.parse(activeConfig.pm_selectedcolumns)
        if (reportType === 'schedule') {
          if (!parsedCols.includes('milestones')) parsedCols.push('milestones')
          if (!parsedCols.includes('totalTasks')) parsedCols.push('totalTasks')
        }
        selectedColumns = parsedCols
      }
    } catch { /* ignore */ }

    const activeCats = activeConfig.pm_categoriesfilter ? activeConfig.pm_categoriesfilter.split(',').map((c: string) => c.trim().toLowerCase()) : []

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
      // If no specific level was selected, don't arbitrarily drop items that aren't mapped to projects
      if (normalizedSelectedLevelIds.length === 0) return items;

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
          const expenseVal = Number(l.pm_expencecatagory) === 0 ? 'capex' : 'opex'
          return activeCats.includes(expenseVal)
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
          const expenseVal = Number(l.pm_expencecatagory) === 0 ? 'capex' : 'opex'
          return selectedCostCategories.some(c => expenseVal === c.toLowerCase())
        })
      }

      filteredLines = filterBySelectedProjects(filteredLines)

      if (filteredLines.length === 0) {
        // Return empty instead of mock data so it perfectly matches reality
        return { list: [], totals: { budget: 0, actual: 0, forecast: 0, variance: 0 }, columnsList: selectedColumns }
      }

      const groupings = new Map<string, { budget: number; actual: number; forecast: number; variance: number }>()
      filteredLines.forEach(l => {
        let groupKey = 'Unknown'
        if (groupby === 1) {
          groupKey = l.pm_projectname || 'Unassigned Project'
        } else if (groupby === 2) {
          const catNum = Number(l.pm_costcategory)
          groupKey = !isNaN(catNum) ? (['Staff', 'Contractors', 'Licences', 'Infrastructure'][catNum] || 'Uncategorized') : 'Uncategorized'
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

      const totalTasksCount = finalTasks.length

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

      const scheduleGroupings = new Map<string, { durationSum: number; durationCount: number; completeSum: number; completeCount: number; overdue: number; milestones: number; totalTasks: number }>()

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
        const current = scheduleGroupings.get(key) || { durationSum: 0, durationCount: 0, completeSum: 0, completeCount: 0, overdue: 0, milestones: 0, totalTasks: 0 }
        current.durationSum += (t.pm_durationdays || 0)
        current.durationCount += 1
        current.completeSum += (t.pm_percentcomplete || 0)
        current.completeCount += 1
        current.totalTasks += 1
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
        const current = scheduleGroupings.get(key) || { durationSum: 0, durationCount: 0, completeSum: 0, completeCount: 0, overdue: 0, milestones: 0, totalTasks: 0 }
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
          milestones: val.milestones,
          totalTasks: val.totalTasks
        })
      })

      if (list.length === 0) {
        return { list: [], totals: { duration: 0, complete: 0, overdue: 0, milestones: 0, totalTasks: 0 }, columnsList: selectedColumns }
      }

      return {
        list,
        totals: { duration: avgDuration, complete: avgPercent, overdue: overdueCount, milestones: totalMilestones, totalTasks: totalTasksCount },
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
        return { list: [], totals: { impact: 0, probability: 0, open: 0, mitigated: 0 }, columnsList: selectedColumns }
      }

      return {
        list,
        totals: { impact: avgImpact, probability: avgProbability, open: openIssuesCount, mitigated: mitigatedRisksCount },
        columnsList: selectedColumns
      }
    }
    return { list: [], totals: { budget: 0, actual: 0, forecast: 0, variance: 0 }, columnsList: [] }
  }, [activeConfig, budgetLines, tasks, milestones, risks, issues, projects])
}
