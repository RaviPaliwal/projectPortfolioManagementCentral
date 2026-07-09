import React, { useState, useEffect, useRef } from 'react'
import { Box, Paper, Typography, Tabs, Tab } from '@mui/material'

declare global {
  interface Window {
    WebChat: any
  }
}

export default function AIAgentPage() {
  const [activeTab, setActiveTab] = useState<'directline' | 'canvas'>('directline')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const webchatRef = useRef<HTMLDivElement>(null)

  // Load Bot Framework Web Chat CDN script
  useEffect(() => {
    if (activeTab === 'directline' && !window.WebChat) {
      const script = document.createElement('script')
      script.src = 'https://cdn.botframework.com/botframework-webchat/latest/webchat.js'
      script.async = true
      script.onload = () => setScriptLoaded(true)
      document.body.appendChild(script)
    } else if (window.WebChat) {
      setScriptLoaded(true)
    }
  }, [activeTab])

  // Instantiate Web Chat when script is loaded and ref is available
  useEffect(() => {
    if (activeTab === 'directline' && scriptLoaded && window.WebChat && webchatRef.current) {
      webchatRef.current.innerHTML = ''

      const secret = import.meta.env.VITE_DIRECT_LINE_SECRET || ''
      if (!secret) {
        console.error('[AI Agent] Direct Line Secret is missing in environment variables.')
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
  }, [activeTab, scriptLoaded])

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          AI Agent
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTabs-indicator': { bgcolor: 'secondary.main' },
            '& .Mui-selected': { color: 'secondary.main !important' }
          }}
        >
          <Tab value="directline" label="Direct Line Chat" />
          <Tab value="canvas" label="Webchat Portal" />
        </Tabs>
      </Box>

      <Paper variant="outlined" sx={{ flex: 1, overflow: 'hidden', borderRadius: 2, bgcolor: 'background.paper', position: 'relative' }}>
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
            title="AI Agent Canvas"
          />
        )}
      </Paper>
    </Box>
  )
}
