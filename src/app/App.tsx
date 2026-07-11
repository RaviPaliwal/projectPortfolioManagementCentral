// Self-hosted fonts (CSP-compliant, no external requests)
import '@fontsource/plus-jakarta-sans/300.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import { useState, useMemo, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { ThemeProvider, CssBaseline, Box, Paper, Typography, Button, Alert, IconButton, Tooltip } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import ChatIcon from '@mui/icons-material/Chat'
import CloseIcon from '@mui/icons-material/Close'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import type { PaletteMode } from '@mui/material'
import { UserContextProvider } from '@/context/UserContext'
import { getTheme } from '@/styles/theme'

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
interface EBProps { children: ReactNode; pageName?: string }
interface EBState { error: Error | null; errorInfo: ErrorInfo | null }
class PageErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }
  static getDerivedStateFromError(error: Error): Partial<EBState> { return { error } }
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary] ${this.props.pageName ?? 'Page'} crashed:`, error, errorInfo)
    this.setState({ errorInfo })
  }
  handleRetry = (): void => this.setState({ error: null, errorInfo: null })
  render(): ReactNode {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, maxWidth: 640, width: '100%', textAlign: 'center', borderRadius: 1.15 }}>
            <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {this.props.pageName ?? 'This page'} encountered an error
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Something went wrong while rendering. This may be caused by a connectivity issue or data mismatch.
            </Typography>
            {import.meta.env.DEV && (
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Alert severity="error" sx={{ mb: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  <strong>{this.state.error.name}</strong>: {this.state.error.message}
                </Alert>
                {this.state.errorInfo?.componentStack && (
                  <Typography variant="caption" sx={{ display: 'block', p: 1.5, bgcolor: 'action.hover', borderRadius: 0.5, fontFamily: 'monospace', fontSize: '0.7rem', overflowX: 'auto', whiteSpace: 'pre', maxHeight: 200 }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
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
import { DirectLineChat } from '@/components/common/DirectLineChat'

function App() {
  // Read initial tab from URL query param (?tab=xxx) for deep-link support
  const getInitialTab = (): TabKey => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab') as TabKey | null
      if (tabParam && tabs.some(t => t.key === tabParam)) return tabParam
    } catch { /* ignore */ }
    return 'dashboard'
  }

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)
  const [themeMode, setThemeMode] = useState<PaletteMode>('light')
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [useDirectLine, setUseDirectLine] = useState(true)

  // Sync activeTab to URL query params and support browser history back/forward
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const currentTabInUrl = url.searchParams.get('tab') || 'dashboard'
      if (currentTabInUrl !== activeTab) {
        if (activeTab === 'dashboard') {
          url.searchParams.delete('tab')
        } else {
          url.searchParams.set('tab', activeTab)
        }
        window.history.pushState(null, '', url.toString())
      }
    } catch { /* ignore */ }
  }, [activeTab])

  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab') as TabKey | null
        if (tabParam && tabs.some(t => t.key === tabParam)) {
          setActiveTab(tabParam)
        } else {
          setActiveTab('dashboard')
        }
      } catch {
        setActiveTab('dashboard')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
          {/* Floating Copilot Chat Icon & Widget */}
          <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {copilotOpen && (
              <Paper
                elevation={6}
                sx={{
                  width: { xs: 'calc(100vw - 48px)', sm: 380 },
                  height: 520,
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: theme => theme.palette.mode === 'dark' ? '0 12px 32px rgba(0,0,0,0.6)' : '0 12px 32px rgba(0,0,0,0.15)',
                  transform: 'scale(1)',
                  transformOrigin: 'bottom right',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SmartToyIcon />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        Enterprise Copilot
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>
                        {useDirectLine ? 'DirectLine Mode' : 'IFrame Mode'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={useDirectLine ? "Switch to IFrame" : "Switch to Direct Line"}>
                      <IconButton
                        size="small"
                        onClick={() => setUseDirectLine(!useDirectLine)}
                        sx={{ color: 'inherit', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                      >
                        <SwapHorizIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => setCopilotOpen(false)}
                      sx={{ color: 'inherit', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Chat Area */}
                <Box sx={{ flex: 1, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
                  {useDirectLine && import.meta.env.VITE_DIRECT_LINE_SECRET ? (
                    <DirectLineChat directLineSecret={import.meta.env.VITE_DIRECT_LINE_SECRET} />
                  ) : (
                    <iframe
                      src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
                      frameBorder="0"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Copilot Chatbot"
                    />
                  )}
                </Box>
              </Paper>
            )}

            {/* Float Button */}
            <IconButton
              onClick={() => setCopilotOpen(!copilotOpen)}
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 4,
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s',
                borderRadius: '50%'
              }}
            >
              {copilotOpen ? <CloseIcon /> : <ChatIcon />}
            </IconButton>
          </Box>
        </div>
      </UserContextProvider>
    </ThemeProvider>
  )
}

export default App
