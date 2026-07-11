import React, { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material'

interface DirectLineChatProps {
  directLineSecret: string
}

declare global {
  interface Window {
    WebChat: any
  }
}

export const DirectLineChat: React.FC<DirectLineChatProps> = ({ directLineSecret }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [botTyping, setBotTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadWebChatScript = () => {
      if (window.WebChat) {
        initWebChat()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.botframework.com/botframework-webchat/latest/webchat.js'
      script.crossOrigin = 'anonymous'
      script.async = true
      script.onload = () => {
        if (active) initWebChat()
      }
      script.onerror = () => {
        if (active) {
          setError('Failed to load Bot Framework Web Chat SDK.')
          setLoading(false)
        }
      }
      document.head.appendChild(script)
    }

    const initWebChat = () => {
      if (!containerRef.current || !window.WebChat) return

      try {
        const directLine = window.WebChat.createDirectLine({
          secret: directLineSecret
        })

        // Intercept Redux actions to detect bot typing/activity status
        const store = window.WebChat.createStore(
          {},
          () => (next: any) => (action: any) => {
            if (action.type === 'DIRECT_LINE/POST_ACTIVITY_PENDING') {
              setBotTyping(true)
            } else if (action.type === 'DIRECT_LINE/INCOMING_ACTIVITY') {
              const { activity } = action.payload
              if (activity.type === 'message' && activity.from.role !== 'user') {
                setBotTyping(false)
              }
            }
            return next(action)
          }
        )

        // Style customization to match the clean design system
        const styleOptions = {
          bubbleBackground: 'rgba(0, 0, 0, 0.03)',
          bubbleBorderRadius: 12,
          bubbleFromUserBackground: '#1976d2',
          bubbleFromUserTextColor: '#ffffff',
          bubbleFromUserBorderRadius: 12,
          sendBoxHeight: 50,
          hideUploadButton: true
        }

        window.WebChat.renderWebChat(
          {
            directLine,
            store,
            styleOptions,
            locale: 'en-US'
          },
          containerRef.current
        )
        setLoading(false)
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize Direct Line Chat.')
        setLoading(false)
      }
    }

    loadWebChatScript()

    return () => {
      active = false
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [directLineSecret])

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
        <Typography variant="body2">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {botTyping && (
        <LinearProgress 
          color="primary" 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 10, 
            height: 3 
          }} 
        />
      )}
      {loading && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', zIndex: 1 }}>
          <CircularProgress size={32} />
        </Box>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%', flex: 1 }} />
    </Box>
  )
}
