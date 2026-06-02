import { useState, useMemo, useEffect, useCallback } from 'react'
import { 
  Box, 
  Alert, 
  Badge, 
  IconButton, 
  Tooltip, 
  Typography, 
  List, 
  ListItem, 
  Divider,
  CircularProgress
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { fontSizes } from '@/styles'
import type { RiskModel, IssueModel } from '@/types/dataverse'
import { 
  fetchAllRisks, 
  fetchAllIssues, 
  fetchDashboardMetrics, 
  fetchPipelineKpis 
} from '@/services'
import { DetailDrawer } from '@/components/common'

export interface AlertItem {
  severity: 'error' | 'warning' | 'info'
  message: string
  id: string
}

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    redProjects: number
    issues: IssueModel[]
    risks: RiskModel[]
    pendingApprovals: number
  }>({
    redProjects: 0,
    issues: [],
    risks: [],
    pendingApprovals: 0
  })

  const loadAlertData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboard, pipeline, risks, issues] = await Promise.all([
        fetchDashboardMetrics(),
        fetchPipelineKpis(),
        fetchAllRisks(),
        fetchAllIssues()
      ])
      setData({
        redProjects: dashboard.projectsInRed,
        issues: issues || [],
        risks: risks || [],
        pendingApprovals: pipeline.pendingApprovals
      })
    } catch (err) {
      console.error('[NotificationCenter] Failed to load alerts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlertData()
    // Refresh every 5 minutes
    const timer = setInterval(loadAlertData, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [loadAlertData])

  const alerts = useMemo(() => {
    const items: AlertItem[] = []
    const escalatedIssues = data.issues.filter((i) => i.pm_escalationstatus).length
    const redRisks = data.risks.filter((r) => String(r.pm_ragstatus) === '2').length
    const overdueIssues = data.issues.filter((i) => {
      if (String(i.pm_issuestatus ?? '') === '1') return false
      if (!i.pm_targetresolutiondate) return false
      return new Date(i.pm_targetresolutiondate) < new Date()
    }).length

    if (data.redProjects > 0) {
      items.push({ id: 'red-projects', severity: 'error', message: `${data.redProjects} project(s) at Red (critical) status.` })
    }
    if (escalatedIssues > 0) {
      items.push({ id: 'esc-issues', severity: 'error', message: `${escalatedIssues} issue(s) escalated.` })
    }
    if (overdueIssues > 0) {
      items.push({ id: 'overdue-issues', severity: 'warning', message: `${overdueIssues} issue(s) past target date.` })
    }
    if (redRisks > 0) {
      items.push({ id: 'red-risks', severity: 'warning', message: `${redRisks} risk(s) at Critical level.` })
    }
    if (data.pendingApprovals > 0) {
      items.push({ id: 'pending-appr', severity: 'info', message: `${data.pendingApprovals} initiative(s) awaiting review.` })
    }
    return items
  }, [data])

  return (
    <>
      <Tooltip title="Notification Center">
        <IconButton onClick={() => setOpen(true)} sx={{ color: 'text.secondary' }}>
          <Badge badgeContent={alerts.length} color="error" overlap="circular">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <DetailDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Notification Center"
        subtitle="Critical alerts and system notifications requiring attention."
        icon={<NotificationsIcon sx={{ color: 'primary.main' }} />}
        width={400}
      >
        <Box sx={{ p: 2 }}>
          {loading && alerts.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={24} />
            </Box>
          ) : alerts.length > 0 ? (
            <List disablePadding>
              {alerts.map((alert, idx) => (
                <Box key={alert.id}>
                  <ListItem disableGutters sx={{ py: 1.5, flexDirection: 'column', alignItems: 'stretch' }}>
                    <Alert
                      severity={alert.severity}
                      variant="outlined"
                      sx={{
                        borderRadius: 1.15,
                        width: '100%',
                        '& .MuiAlert-message': { fontWeight: 500, fontSize: fontSizes.sm },
                      }}
                    >
                      {alert.message}
                    </Alert>
                  </ListItem>
                  {idx < alerts.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>All caught up!</Typography>
              <Typography variant="body2" color="text.secondary">No critical alerts found for your portfolio.</Typography>
            </Box>
          )}
        </Box>
      </DetailDrawer>
    </>
  )
}

export default NotificationCenter
