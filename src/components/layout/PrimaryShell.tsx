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
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import BugReportIcon from '@mui/icons-material/BugReport'

export type TabKey = 'dashboard' | 'portfolios' | 'programmes' | 'projects' | 'pipeline' | 'debug'

export const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { key: 'portfolios', label: 'Portfolios', icon: <AccountTreeIcon /> },
  { key: 'programmes', label: 'Programmes', icon: <FolderOpenIcon /> },
  { key: 'projects', label: 'Projects', icon: <TaskIcon /> },
  { key: 'pipeline', label: 'Pipeline', icon: <TimelineIcon /> },
  { key: 'debug', label: 'Debug', icon: <BugReportIcon /> },
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
        {/* Brand */}
        <Box
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            📈
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontFamily: "'Outfit', sans-serif" }}>
              PPM Central
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Executive portfolio hub
            </Typography>
          </Box>
        </Box>

        {/* Navigation */}
        <List sx={{ px: 1.5, py: 2 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <ListItemButton
                key={tab.key}
                selected={isActive}
                onClick={() => onChangeTab(tab.key)}
                sx={{
                  borderRadius: 2,
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
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                {tabs.find((tab) => tab.key === activeTab)?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enterprise PPM UX connecting directly to Dataverse.
              </Typography>
            </Box>
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
