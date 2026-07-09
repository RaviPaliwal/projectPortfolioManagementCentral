import type { ReactNode } from 'react'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import TaskIcon from '@mui/icons-material/Task'
import TimelineIcon from '@mui/icons-material/Timeline'
import PeopleIcon from '@mui/icons-material/People'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import BugReportIcon from '@mui/icons-material/BugReport'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import SchemaIcon from '@mui/icons-material/Schema'
import BarChartIcon from '@mui/icons-material/BarChart'

import SavingsIcon from '@mui/icons-material/Savings'
import PsychologyIcon from '@mui/icons-material/Psychology'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccountTreeWorkflowIcon from '@mui/icons-material/AccountTree'
import SettingsIcon from '@mui/icons-material/Settings'
import { UserSelector, useUser } from '@/context/UserContext'
import { useEffect, useState } from 'react'
import type { BreadcrumbItem } from '@/components/common/Breadcrumbs/Breadcrumbs'
import NotificationCenter from './NotificationCenter'
import { PERSONA_PERMISSIONS } from '@/constants/permissions'

export type TabKey = 'dashboard' | 'portfolios' | 'programmes' | 'projects' | 'pipeline' | 'resources' | 'configurations' | 'teamadmin' | 'timesheets' | 'budgets' | 'gatereviews' | 'benefits' | 'risks' | 'issues' | 'changerequests' | 'cashflow' | 'tasks' | 'fundingsources' | 'skills' | 'workflows' | 'holidays' | 'statussnapshots' | 'calendar' | 'strategicRoster' | 'activitylog' | 'reportConfigs'

export const tabs: Array<{ key: TabKey; label: string; icon: ReactNode; hidden?: boolean }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { key: 'strategicRoster', label: 'Strategic Roster', icon: <SchemaIcon /> },
  { key: 'portfolios', label: 'Portfolios', icon: <AccountTreeIcon /> },
  { key: 'programmes', label: 'Programmes', icon: <FolderOpenIcon /> },
  { key: 'projects', label: 'Projects', icon: <TaskIcon /> },
  { key: 'pipeline', label: 'Pipeline', icon: <TimelineIcon /> },
  { key: 'resources', label: 'Resources', icon: <PeopleIcon />, hidden: true },
  { key: 'calendar', label: 'Calendar', icon: <CalendarMonthIcon /> },
  { key: 'timesheets', label: 'Timesheets', icon: <AccessTimeIcon /> },
  { key: 'budgets', label: 'Budgets', icon: <AccountBalanceWalletIcon /> },
  { key: 'gatereviews', label: 'Gate Reviews', icon: <FactCheckIcon /> },
  { key: 'benefits', label: 'Benefits', icon: <EmojiEventsIcon /> },
  { key: 'risks', label: 'Risks', icon: <CrisisAlertIcon /> },
  { key: 'issues', label: 'Issues', icon: <ReportProblemIcon /> },
  { key: 'changerequests', label: 'Change Requests', icon: <ChangeCircleIcon /> },
  { key: 'cashflow', label: 'Cashflow', icon: <AccountBalanceIcon /> },
  { key: 'tasks', label: 'Tasks', icon: <AssignmentIcon /> },
  { key: 'fundingsources', label: 'Funding Sources', icon: <SavingsIcon /> },
  { key: 'statussnapshots', label: 'Status Snapshots', icon: <AssessmentIcon /> },
  { key: 'activitylog', label: 'Activity Log', icon: <MenuBookIcon /> },
  { key: 'configurations', label: 'Configurations', icon: <SettingsIcon /> },

  // Hidden sub-navigation items (accessible via Configurations or deep links)
  { key: 'workflows', label: 'Workflows', icon: <AccountTreeWorkflowIcon />, hidden: true },
  { key: 'teamadmin', label: 'Team Admin', icon: <PeopleIcon />, hidden: true },
  { key: 'skills', label: 'Skills & Mapping', icon: <PsychologyIcon />, hidden: true },
  { key: 'holidays', label: 'Holiday Calendar', icon: <CalendarMonthIcon />, hidden: true },
  { key: 'reportConfigs', label: 'Report Configurations', icon: <SettingsIcon />, hidden: true },
]

interface PrimaryShellProps {
  activeTab: TabKey
  onChangeTab: (tab: TabKey) => void
  onToggleTheme: () => void
  themeMode: 'light' | 'dark'
  children: ReactNode
}

const DRAWER_WIDTH = 240

export default function PrimaryShell({ activeTab, onChangeTab, onToggleTheme, themeMode, children }: PrimaryShellProps) {
  const theme = useTheme()
  const { currentUserPersona } = useUser()
  // RouteGuard in App.tsx handles persona-based redirect on mount/navigation
  const allowedTabs = PERSONA_PERMISSIONS[currentUserPersona] || []
  const sidebarTabs = tabs.filter(t => !t.hidden && allowedTabs.includes(t.key))

  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<{ items: BreadcrumbItem[], onNavigate?: (path: string) => void } | null>(null)

  useEffect(() => {
    const handleSetBreadcrumbs = (e: any) => setCustomBreadcrumbs(e.detail)
    window.addEventListener('set-breadcrumbs', handleSetBreadcrumbs)
    return () => window.removeEventListener('set-breadcrumbs', handleSetBreadcrumbs)
  }, [])

  useEffect(() => {
    setCustomBreadcrumbs(null)
  }, [activeTab])

  // Listen for custom navigation events (e.g. from MyTasksWidget)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const requestedTab = detail?.tab as TabKey | undefined
      if (requestedTab && requestedTab !== activeTab) {
        // Validate the requested tab against persona permissions before switching
        if (allowedTabs.includes(requestedTab)) {
          onChangeTab(requestedTab)
        }
      }
    }
    window.addEventListener('navigate', handler)
    return () => window.removeEventListener('navigate', handler)
  }, [activeTab, onChangeTab, allowedTabs])


  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      backgroundImage: themeMode === 'light'
        ? 'radial-gradient(circle at 80% 0%, rgba(33, 124, 53, 0.12), transparent 40%), radial-gradient(circle at 20% 100%, rgba(228, 98, 26, 0.08), transparent 40%)'
        : 'radial-gradient(circle at 80% 0%, rgba(33, 124, 53, 0.2), transparent 40%), radial-gradient(circle at 20% 100%, rgba(228, 98, 26, 0.15), transparent 40%)',
      backgroundAttachment: 'fixed',
    }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        aria-label="Navigation sidebar"
        slotProps={{
          paper: {
            className: 'sidebar-scrollbar',
          },
        }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.secondary',
          },
        }}
      >
        {/* Navigation */}
        <List sx={{ px: 1.5, py: 2 }} aria-label="Primary navigation">
          {sidebarTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <ListItemButton
                key={tab.key}
                selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChangeTab(tab.key)}
                sx={{
                  borderRadius: '12px',
                  mb: 0.5,
                  py: 1,
                  px: 2,
                  color: 'text.secondary',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  '& .MuiListItemIcon-root': {
                    color: 'inherit',
                    minWidth: 40,
                    transition: 'transform 0.2s ease',
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    '& .MuiListItemIcon-root': {
                      transform: 'translateX(2px)',
                    },
                  },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: '0 4px 12px rgba(33, 124, 53, 0.25)',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                    },
                  },
                }}
              >
                <ListItemIcon>{tab.icon}</ListItemIcon>
                <ListItemText
                  primary={tab.label}
                  slotProps={{ primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: '0.8125rem' } } }}
                />
              </ListItemButton>
            )
          })}
        </List>
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            height: 64,
            justifyContent: 'center',
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ px: 3, gap: 2, minHeight: '64px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                onClick={() => onChangeTab('dashboard')}
                sx={{
                  fontWeight: 600,
                  color: 'text.secondary',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                PPM Central
              </Typography>
              {activeTab !== 'dashboard' && (
                <>
                  <Typography variant="caption" color="text.disabled">/</Typography>
                  {['workflows', 'teamadmin', 'skills', 'holidays', 'resources', 'reportConfigs'].includes(activeTab) && !customBreadcrumbs && (
                    <>
                      <Typography
                        variant="body2"
                        onClick={() => onChangeTab('configurations')}
                        sx={{
                          fontWeight: 600,
                          color: 'text.secondary',
                          cursor: 'pointer',
                          transition: 'color 0.15s ease',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        Configurations
                      </Typography>
                      <Typography variant="caption" color="text.disabled">/</Typography>
                    </>
                  )}
                  {customBreadcrumbs && customBreadcrumbs.items.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {customBreadcrumbs.items.map((item, index) => {
                        const isLast = index === customBreadcrumbs.items.length - 1
                        return (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {index > 0 && <Typography variant="caption" color="text.disabled">/</Typography>}
                            <Typography
                              variant={isLast ? 'body2' : 'caption'}
                              onClick={() => {
                                if (item.path && customBreadcrumbs.onNavigate) {
                                  customBreadcrumbs.onNavigate(item.path)
                                }
                              }}
                              sx={{
                                fontWeight: 600,
                                color: isLast ? 'text.primary' : 'text.secondary',
                                cursor: (!isLast && item.path) ? 'pointer' : 'default',
                                textTransform: isLast ? 'none' : 'uppercase',
                                letterSpacing: isLast ? 'normal' : '0.03em',
                                transition: 'color 0.15s ease',
                                '&:hover': (!isLast && item.path) ? { color: 'primary.main' } : {},
                              }}
                            >
                              {item.label}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      onClick={() => onChangeTab(activeTab)}
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        cursor: 'pointer',
                        transition: 'color 0.15s ease',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {tabs.find((tab) => tab.key === activeTab)?.label || activeTab}
                    </Typography>
                  )}
                </>
              )}
            </Box>
            <Box sx={{ flex: 1 }} />
            <UserSelector />
            <NotificationCenter />
            <IconButton
              onClick={onToggleTheme}
              sx={{ color: 'text.secondary' }}
              aria-label="Toggle light or dark theme"
            >
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
            {/* Documentation icon removed as per UI update request */}
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <Box key={activeTab} className="page-transition-wrapper">
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
