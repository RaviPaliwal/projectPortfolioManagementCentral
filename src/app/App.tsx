import { useState, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { ThemeProvider, CssBaseline, Box, Paper, Typography, Button, Alert } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import type { PaletteMode } from '@mui/material'
import { UserContextProvider } from '@/context/UserContext'
import { getTheme } from '@/styles/theme'

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
          <Paper sx={{ p: 4, maxWidth: 560, textAlign: 'center', borderRadius: 1.15 }}>
            <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {this.props.pageName ?? 'This page'} encountered an error
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Something went wrong while rendering. This may be caused by a connectivity issue or data mismatch.
            </Typography>
            {import.meta.env.DEV && (
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
import PrimaryShell, { type TabKey, tabs } from '@/components/layout/PrimaryShell'
import { getPageMap } from './routes'
import { FormDialog } from '@/components/common'
import RouteGuard from '@/components/common/RouteGuard/RouteGuard'

export function guardActiveTab(tab: TabKey, allowedTabs: TabKey[]): TabKey {
  if (allowedTabs.length === 0) return tab
  if (allowedTabs.includes(tab)) return tab
  return allowedTabs.includes('dashboard' as TabKey) ? 'dashboard' as TabKey : allowedTabs[0]
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [themeMode, setThemeMode] = useState<PaletteMode>('light')

  const theme = useMemo(() => getTheme(themeMode), [themeMode])
  const pageMap = useMemo(() => getPageMap(setActiveTab), [setActiveTab])

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserContextProvider>
        <div className="appShell">
          <PrimaryShell activeTab={activeTab} onChangeTab={setActiveTab} onToggleTheme={toggleTheme} themeMode={themeMode}>
            <PageErrorBoundary pageName={tabs.find((t) => t.key === activeTab)?.label}>
              <RouteGuard activeTab={activeTab} onChangeTab={setActiveTab}>
                {pageMap[activeTab]}
              </RouteGuard>
            </PageErrorBoundary>
          </PrimaryShell>
          <FormDialog />
        </div>
      </UserContextProvider>
    </ThemeProvider>
  )
}

export default App
