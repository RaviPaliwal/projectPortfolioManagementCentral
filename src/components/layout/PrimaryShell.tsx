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
import RateReviewIcon from '@mui/icons-material/RateReview'
import SavingsIcon from '@mui/icons-material/Savings'
import PsychologyIcon from '@mui/icons-material/Psychology'
import AccountTreeWorkflowIcon from '@mui/icons-material/AccountTree'
import SettingsIcon from '@mui/icons-material/Settings'
import { UserSelector } from '@/context/UserContext'
import { useEffect } from 'react'
import NotificationCenter from './NotificationCenter'

export type TabKey = 'dashboard' | 'portfolios' | 'programmes' | 'projects' | 'pipeline' | 'resources' | 'configurations' | 'teamadmin' | 'timesheets' | 'budgets' | 'gatereviews' | 'benefits' | 'schedule' | 'risks' | 'issues' | 'changerequests' | 'cashflow' | 'approvalrequests' | 'fundingsources' | 'skills' | 'workflows' | 'pendingapprovals' | 'holidays' | 'statussnapshots' | 'debug'

export const tabs: Array<{ key: TabKey; label: string; icon: ReactNode; hidden?: boolean }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { key: 'portfolios', label: 'Portfolios', icon: <AccountTreeIcon /> },
  { key: 'programmes', label: 'Programmes', icon: <FolderOpenIcon /> },
  { key: 'projects', label: 'Projects', icon: <TaskIcon /> },
  { key: 'pipeline', label: 'Pipeline', icon: <TimelineIcon /> },
  { key: 'resources', label: 'Resources', icon: <PeopleIcon /> },
  { key: 'timesheets', label: 'Timesheets', icon: <AccessTimeIcon /> },
  { key: 'budgets', label: 'Budgets', icon: <AccountBalanceWalletIcon /> },
  { key: 'gatereviews', label: 'Gate Reviews', icon: <FactCheckIcon /> },
  { key: 'benefits', label: 'Benefits', icon: <EmojiEventsIcon /> },
  { key: 'schedule', label: 'Schedule', icon: <CalendarMonthIcon /> },
  { key: 'risks', label: 'Risks', icon: <CrisisAlertIcon /> },
  { key: 'issues', label: 'Issues', icon: <ReportProblemIcon /> },
  { key: 'changerequests', label: 'Change Requests', icon: <ChangeCircleIcon /> },
  { key: 'cashflow', label: 'Cashflow', icon: <AccountBalanceIcon /> },
  { key: 'approvalrequests', label: 'Approvals', icon: <RateReviewIcon /> },
  { key: 'fundingsources', label: 'Funding Sources', icon: <SavingsIcon /> },
  { key: 'pendingapprovals', label: 'Approvals Queue', icon: <RateReviewIcon /> },
  { key: 'statussnapshots', label: 'Status Snapshots', icon: <AssessmentIcon /> },
  { key: 'configurations', label: 'Configurations', icon: <SettingsIcon /> },
  { key: 'debug', label: 'Debug', icon: <BugReportIcon /> },
  
  // Hidden sub-navigation items (accessible via Configurations or deep links)
  { key: 'workflows', label: 'Workflows', icon: <AccountTreeWorkflowIcon />, hidden: true },
  { key: 'teamadmin', label: 'Team Admin', icon: <PeopleIcon />, hidden: true },
  { key: 'skills', label: 'Skills & Mapping', icon: <PsychologyIcon />, hidden: true },
  { key: 'holidays', label: 'Holiday Calendar', icon: <CalendarMonthIcon />, hidden: true },
]

interface PrimaryShellProps {
  activeTab: TabKey
  onChangeTab: (tab: TabKey) => void
  onToggleTheme: () => void
  themeMode: 'light' | 'dark'
  children: ReactNode
}

const DRAWER_WIDTH = 260

export default function PrimaryShell({ activeTab, onChangeTab, onToggleTheme, themeMode, children }: PrimaryShellProps) {
  const theme = useTheme()

  // Listen for custom navigation events (e.g. from MyTasksWidget)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.tab && detail.tab !== activeTab) {
        onChangeTab(detail.tab as TabKey)
      }
    }
    window.addEventListener('navigate', handler)
    return () => window.removeEventListener('navigate', handler)
  }, [activeTab, onChangeTab])

  const sidebarTabs = tabs.filter(t => !t.hidden)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          },
        }}
      >
        {/* Navigation */}
        <List sx={{ px: 1.5, py: 2 }}>
          {sidebarTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <ListItemButton
                key={tab.key}
                selected={isActive}
                onClick={() => onChangeTab(tab.key)}
                sx={{
                  borderRadius: 1.15,
                  mb: 0.5,
                  py: 1.25,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{tab.icon}</ListItemIcon>
                <ListItemText
                  primary={tab.label}
                  slotProps={{ primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: '0.875rem' } } }}
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
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ px: 3, gap: 2 }}>
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
                  {['workflows', 'teamadmin', 'skills', 'holidays'].includes(activeTab) && (
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
                </>
              )}
            </Box>
            <Box sx={{ flex: 1 }} />
            <UserSelector />
            <NotificationCenter />
            <IconButton onClick={onToggleTheme} sx={{ color: 'text.secondary' }}>
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
            <IconButton sx={{ color: 'text.secondary' }}>
              <MenuBookIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
