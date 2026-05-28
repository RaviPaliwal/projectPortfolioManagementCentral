import { useState, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { ThemeProvider, CssBaseline, createTheme, Box, Paper, Typography, Button, Alert } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import type { PaletteMode } from '@mui/material'

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
interface EBProps { children: ReactNode; pageName?: string }
interface EBState { error: Error | null }
class PageErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error): EBState { return { error } }
  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error(`[ErrorBoundary] ${this.props.pageName ?? 'Page'} crashed:`, error, _info)
  }
  handleRetry = (): void => this.setState({ error: null })
  render(): ReactNode {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, maxWidth: 560, textAlign: 'center', borderRadius: 3 }}>
            <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {this.props.pageName ?? 'This page'} encountered an error
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Something went wrong while rendering. This may be caused by a connectivity issue or data mismatch.
            </Typography>
            {process.env.NODE_ENV === 'development' && (
              <Alert severity="error" sx={{ mb: 2, textAlign: 'left', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {this.state.error.name}: {this.state.error.message}
              </Alert>
            )}
            <Button variant="contained" onClick={this.handleRetry}>Retry</Button>
          </Paper>
        </Box>
      )
    }
    return this.props.children
  }
}
import './App.css'
import PrimaryShell, { type TabKey, tabs } from './components/layout/PrimaryShell'
import DashboardPage from './components/pages/DashboardPage'
import PortfoliosPage from './components/pages/PortfoliosPage'
import ProgrammesPage from './components/pages/ProgrammesPage'
import ProjectsPage from './components/pages/ProjectsPage'
import PipelinePage from './components/pages/PipelinePage'

const pageMap: Record<TabKey, ReactNode> = {
  dashboard: <DashboardPage />,
  portfolios: <PortfoliosPage />,
  programmes: <ProgrammesPage />,
  projects: <ProjectsPage />,
  pipeline: <PipelinePage />,
}

const palette = {
  primary: { main: '#0ea5e9', light: '#38bdf8', dark: '#0284c7', contrastText: '#ffffff' },
  secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#ffffff' },
  success: { main: '#22c55e', light: '#4ade80', dark: '#16a34a', contrastText: '#ffffff' },
  warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrastText: '#ffffff' },
  error: { main: '#ef4444', light: '#f87171', dark: '#dc2626', contrastText: '#ffffff' },
}

const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...palette,
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0f172a',
        paper: mode === 'light' ? '#ffffff' : '#1e293b',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#f8fafc',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      },
      divider: mode === 'light' ? '#e2e8f0' : '#334155',
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h1: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600 },
      h4: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${mode === 'light' ? '#e2e8f0' : '#334155'}`,
            transition: 'all 0.2s ease-in-out',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 10, padding: '8px 20px', fontSize: '0.8125rem' },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.75rem', borderRadius: 8 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    },
  })

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [themeMode, setThemeMode] = useState<PaletteMode>('light')

  const theme = useMemo(() => getTheme(themeMode), [themeMode])

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="appShell">
        <PrimaryShell activeTab={activeTab} onChangeTab={setActiveTab} onToggleTheme={toggleTheme} themeMode={themeMode}>
          <PageErrorBoundary pageName={tabs.find((t) => t.key === activeTab)?.label}>
            {pageMap[activeTab]}
          </PageErrorBoundary>
        </PrimaryShell>
      </div>
    </ThemeProvider>
  )
}

export default App
