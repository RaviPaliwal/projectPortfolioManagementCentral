import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  Fab,
  Zoom,
  Tooltip
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CloseIcon from '@mui/icons-material/Close'
import ForumIcon from '@mui/icons-material/Forum'

declare global {
  interface Window {
    WebChat: any
  }
}

export default function AgentBotWidget() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'directline' | 'canvas'>('directline')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const webchatRef = useRef<HTMLDivElement>(null)

  // Load Bot Framework Web Chat CDN script
  useEffect(() => {
    if (isOpen && activeTab === 'directline' && !window.WebChat) {
      const script = document.createElement('script')
      script.src = 'https://cdn.botframework.com/botframework-webchat/latest/webchat.js'
      script.async = true
      script.onload = () => setScriptLoaded(true)
      document.body.appendChild(script)
    } else if (window.WebChat) {
      setScriptLoaded(true)
    }
  }, [isOpen, activeTab])

  // Instantiate Web Chat when script is loaded and ref is available
  useEffect(() => {
    if (isOpen && activeTab === 'directline' && scriptLoaded && window.WebChat && webchatRef.current) {
      webchatRef.current.innerHTML = ''

      const secret = import.meta.env.VITE_DIRECT_LINE_SECRET || ''
      if (!secret) {
        console.error('[AI Agent Widget] Direct Line Secret is missing.')
        return
      }

      const directLine = window.WebChat.createDirectLine({ secret })

      window.WebChat.renderWebChat(
        {
          directLine,
          styleOptions: {
            bubbleBackground: 'rgba(0, 0, 0, 0.03)',
            bubbleBorderRadius: 12,
            bubbleFromUserBackground: '#8b5cf6',
            bubbleFromUserTextColor: '#ffffff',
            bubbleFromUserBorderRadius: 12,
            sendBoxButtonColor: '#8b5cf6',
            sendBoxButtonColorOnHover: '#7c3aed',
          }
        },
        webchatRef.current
      )
    }
  }, [isOpen, activeTab, scriptLoaded])

  return (
    <>
      {/* Floating Chat Container */}
      <Zoom in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 400,
            height: 600,
            zIndex: 1300,
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: isDark
              ? '0 12px 40px rgba(0, 0, 0, 0.6)'
              : '0 12px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToyIcon sx={{ color: 'secondary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  AI Copilot
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setIsOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="fullWidth"
              sx={{
                minHeight: 32,
                height: 32,
                '& .MuiTabs-indicator': { bgcolor: 'secondary.main' },
                '& .MuiTab-root': {
                  minHeight: 32,
                  height: 32,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                },
                '& .Mui-selected': { color: 'secondary.main !important' }
              }}
            >
              <Tab value="directline" label="Direct Line Chat" />
              <Tab value="canvas" label="Webchat Portal" />
            </Tabs>
          </Box>

          {/* Body */}
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: 'background.default' }}>
            {activeTab === 'directline' ? (
              <Box
                ref={webchatRef}
                sx={{
                  width: '100%',
                  height: '100%',
                  '& .webchat__outer': { height: '100%', border: 'none' },
                  '& .webchat__send-box': { borderTop: '1px solid divider' }
                }}
              />
            ) : (
              <iframe
                src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
                frameBorder="0"
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="AI Agent Widget Canvas"
              />
            )}
          </Box>
        </Paper>
      </Zoom>

      {/* Floating Action Button (FAB) */}
      <Tooltip title={isOpen ? 'Close AI Copilot' : 'Open AI Copilot'} placement="left">
        <Fab
          color="secondary"
          aria-label="chat"
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1301,
            boxShadow: isDark
              ? '0 6px 20px rgba(139, 92, 246, 0.4)'
              : '0 6px 16px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '&:hover': {
              transform: 'scale(1.1) rotate(5deg)',
            }
          }}
        >
          {isOpen ? <CloseIcon /> : <ForumIcon />}
        </Fab>
      </Tooltip>
    </>
  )
}
