import { useMemo } from 'react'
import { Box, Chip } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BugReportIcon from '@mui/icons-material/BugReport'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import { KpiCardRow } from '@/components/common'
import type { IssueModel, RiskMitigationActionModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'

interface WorkspaceKPIsProps {
  issues: IssueModel[]
  actions: RiskMitigationActionModel[]
  loading: boolean
}

export const WorkspaceKPIs = ({ issues, actions, loading }: WorkspaceKPIsProps) => {
  const { currentUser } = useUser()

  const kpiItems = useMemo(() => {
    const totalIssues = issues.length
    const openIssues = issues.filter(i => String(i.pm_issuestatus ?? '') === '0').length
    const overdueIssues = issues.filter(i => {
      if (String(i.pm_issuestatus ?? '') === '2' || String(i.pm_issuestatus ?? '') === '3') return false
      if (!i.pm_targetresolutiondate) return false
      return new Date(i.pm_targetresolutiondate) < new Date()
    }).length

    const totalActions = actions.length
    const inProgressActions = actions.filter(a => String(a.pm_status ?? '') === '0' || String(a.pm_status ?? '') === '1').length
    const completedActions = actions.filter(a => String(a.pm_status ?? '') === '3').length
    const overdueActions = actions.filter(a => {
      if (String(a.pm_status ?? '') === '3') return false
      if (!a.pm_duedate) return false
      return new Date(a.pm_duedate) < new Date()
    }).length

    return [
      {
        label: 'Assigned Issues',
        value: totalIssues,
        color: "'primary.main'",
        icon: <BugReportIcon />,
        subtitle: `${openIssues} open · ${overdueIssues} overdue`,
      },
      {
        label: 'Mitigation Actions',
        value: totalActions,
        color: "'secondary.main'",
        icon: <AssignmentIcon />,
        subtitle: `${inProgressActions} in progress · ${completedActions} completed`,
      },
      {
        label: 'Overdue Items',
        value: overdueIssues + overdueActions,
        color: "'error.main'",
        icon: <AccessTimeIcon />,
        subtitle: `${overdueIssues} issues · ${overdueActions} actions`,
      },
      {
        label: 'Completed',
        value: completedActions,
        color: "'success.main'",
        icon: <CheckCircleIcon />,
        subtitle: `${totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0}% completion rate`,
      },
      {
        label: 'Open Issues',
        value: openIssues,
        color: "'warning.main'",
        icon: <WarningAmberIcon />,
        subtitle: totalIssues > 0 ? `${Math.round((openIssues / totalIssues) * 100)}% of assigned` : 'None open',
      },
      {
        label: 'Action Items',
        value: inProgressActions,
        color: "'info.main'",
        icon: <PlaylistAddCheckIcon />,
        subtitle: `${overdueActions} overdue requiring attention`,
      },
    ]
  }, [issues, actions])

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chip
          icon={<AssignmentIcon sx={{ fontSize: 14 }} />}
          label={`Assignee: ${currentUser?.fullname || 'Unknown'}`}
          variant="outlined"
          size="small"
          sx={{ fontWeight: 600, borderRadius: 1 }}
        />
      </Box>
      <KpiCardRow items={kpiItems} loading={loading} />
    </Box>
  )
}

export default WorkspaceKPIs
