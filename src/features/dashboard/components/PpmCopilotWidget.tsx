import { useState, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Fab,
  Tooltip,
  Fade,
  CircularProgress,
  useTheme,
  Badge
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import LaunchIcon from '@mui/icons-material/Launch'

export interface PpmCopilotWidgetProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export default function PpmCopilotWidget({ isOpen, setIsOpen }: PpmCopilotWidgetProps) {
  const theme = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [iframeKey, setIframeKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const copilotUrl =
    'https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true'

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setIframeKey((prev) => prev + 1)
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  return (
    <>
      {/* Floating Action Button */}
      <Tooltip title={isOpen ? 'Close PPM Copilot' : 'Chat with PPM Copilot'} placement="left">
        <Fab
          color="primary"
          onClick={handleToggle}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1100,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(14, 165, 233, 0.3)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.1) translateY(-2px)',
              boxShadow: `0 12px 36px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(14, 165, 233, 0.5)'}`,
            },
            '&:active': {
              transform: 'scale(0.95)',
            }
          }}
        >
          {isOpen ? (
            <CloseIcon sx={{ fontSize: 24, color: '#ffffff' }} />
          ) : (
            <Badge
              color="success"
              variant="dot"
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{ '& .MuiBadge-badge': { width: 10, height: 10, borderRadius: '50%', border: '2px solid white', backgroundColor: '#22c55e' } }}
            >
              <SmartToyIcon sx={{ fontSize: 24, color: '#ffffff' }} />
            </Badge>
          )}
        </Fab>
      </Tooltip>

      {/* Floating Chat Panel */}
      <Fade in={isOpen} timeout={300}>
        <Paper
          sx={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            width: { xs: 'calc(100vw - 48px)', sm: 420 },
            height: 600,
            maxHeight: 'calc(100vh - 140px)',
            maxWidth: 'calc(100vw - 48px)',
            zIndex: 1100,
            borderRadius: 3,
            overflow: 'hidden',
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 16px 48px rgba(0, 0, 0, 0.8)'
              : '0 16px 48px rgba(14, 165, 233, 0.15)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  p: 0.75,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SmartToyIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif", lineHeight: 1.2 }}>
                  PPM AI Assistant
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                  <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.8, fontWeight: 600 }}>
                    Online
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Reset Chat">
                <IconButton size="small" onClick={handleRefresh} sx={{ color: '#ffffff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open in new window">
                <IconButton
                  size="small"
                  component="a"
                  href={copilotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: '#ffffff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <LaunchIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton size="small" onClick={handleToggle} sx={{ color: '#ffffff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Chat Container */}
          <Box sx={{ flex: 1, position: 'relative', bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff' }}>
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  zIndex: 2,
                  gap: 2
                }}
              >
                <CircularProgress size={32} thickness={4} sx={{ color: theme.palette.primary.main }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Connecting to Copilot...
                </Typography>
              </Box>
            )}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={copilotUrl}
              onLoad={handleIframeLoad}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              title="PPM Copilot Chatbot"
            />
          </Box>
        </Paper>
      </Fade>
    </>
  )
}
