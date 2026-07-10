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
  Tooltip,
  TextField,
  Avatar,
  Fade,
  LinearProgress,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CloseIcon from '@mui/icons-material/Close'
import ForumIcon from '@mui/icons-material/Forum'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'

import { MicrosoftCopilotStudioService } from '@/generated/services/MicrosoftCopilotStudioService'

interface Message {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: Date
}

const BOT_NAME = 'cr0b5_projectManagementQueryAssistant'

export default function AgentBotWidget() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'directline' | 'canvas'>('directline')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am your AI Copilot. How can I help you manage your projects today?',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages or loading status changes
  useEffect(() => {
    if (isOpen && activeTab === 'directline') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isOpen, activeTab])

  // Helper to parse Bot Responses
  const parseBotResponseText = (responseStr: string): string => {
    try {
      const parsed = JSON.parse(responseStr)
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.text) return parsed.text
        if (parsed.message) return parsed.message
        if (parsed.response) return parsed.response
        return Object.entries(parsed)
          .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
          .join('\n')
      }
    } catch {
      // Use raw string if not JSON
    }
    return responseStr
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)
    setError(null)

    try {
      const result = await MicrosoftCopilotStudioService.ExecuteCopilotAsyncV2(
        BOT_NAME,
        {
          message: userMessage.text,
          notificationUrl: 'https://notificationurlplaceholder'
        },
        conversationId
      )

      if (result.success) {
        const payload = (result as any).data || result
        const responses: string[] = payload?.responses || []
        const newConversationId = payload?.conversationId || payload?.ConversationId || payload?.conversationID

        if (newConversationId) {
          setConversationId(newConversationId)
        }

        if (responses && responses.length > 0) {
          const agentMessages: Message[] = responses.map((respText, index) => {
            const formattedText = parseBotResponseText(respText)
            return {
              id: `agent-${Date.now()}-${index}`,
              sender: 'agent',
              text: formattedText,
              timestamp: new Date()
            }
          })
          setMessages(prev => [...prev, ...agentMessages])
        } else if (payload?.lastResponse) {
          const formattedText = parseBotResponseText(payload.lastResponse)
          setMessages(prev => [
            ...prev,
            {
              id: `agent-${Date.now()}`,
              sender: 'agent',
              text: formattedText,
              timestamp: new Date()
            }
          ])
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: `agent-empty-${Date.now()}`,
              sender: 'agent',
              text: 'Message received and processed successfully.',
              timestamp: new Date()
            }
          ])
        }
      } else {
        const errorMsg = result.error?.message || 'Failed to communicate with Copilot Studio.'
        setError(errorMsg)
      }
    } catch (err: any) {
      console.error('[AI Widget Page Error]', err)
      setError(err?.message || 'An error occurred while calling the agent service.')
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        text: 'Hello! I am your AI Copilot. How can I help you manage your projects today?',
        timestamp: new Date()
      }
    ])
    setConversationId(undefined)
    setError(null)
  }

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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {activeTab === 'directline' && (
                  <IconButton size="small" onClick={handleClearChat} title="Reset Chat" id="aiwidget-reset-chat">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => setIsOpen(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
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
              <Tab value="directline" label="Copilot Chat" />
              <Tab value="canvas" label="Webchat Portal" />
            </Tabs>
          </Box>

          {/* Body */}
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'directline' ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {loading && <LinearProgress color="secondary" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }} />}
                
                {/* Messages Area */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {messages.map((msg) => {
                    const isUser = msg.sender === 'user'
                    return (
                      <Fade in={true} key={msg.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: isUser ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                            gap: 1,
                            maxWidth: '90%',
                            alignSelf: isUser ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: isUser ? 'primary.main' : 'secondary.main',
                              width: 28,
                              height: 28,
                              fontSize: '0.8rem'
                            }}
                          >
                            {isUser ? <PersonIcon fontSize="inherit" /> : <SmartToyIcon fontSize="inherit" />}
                          </Avatar>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                                bgcolor: isUser
                                  ? theme.palette.primary.main
                                  : isDark
                                  ? 'background.paper'
                                  : 'grey.100',
                                color: isUser
                                  ? theme.palette.primary.contrastText
                                  : theme.palette.text.primary,
                                border: isUser ? 'none' : '1px solid',
                                borderColor: 'divider',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                            >
                              <Typography variant="body2" sx={{ lineHeight: 1.4, fontSize: '0.825rem' }}>
                                {msg.text}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.65rem', px: 0.5 }}>
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                      </Fade>
                    )
                  })}

                  {loading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.5 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 28, height: 28 }}>
                        <SmartToyIcon sx={{ fontSize: '0.8rem' }} />
                      </Avatar>
                      <Box sx={{ display: 'flex', gap: 0.5, bgcolor: isDark ? 'background.paper' : 'grey.100', p: 1.5, borderRadius: '4px 14px 14px 14px', border: '1px solid', borderColor: 'divider' }}>
                        <CircularProgress size={12} color="secondary" />
                        <Typography variant="body2" sx={{ color: 'text.secondary', pl: 1, fontSize: '0.8rem' }}>
                          Thinking...
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {error && (
                    <Alert severity="error" sx={{ mt: 1, p: 1, borderRadius: 2, fontSize: '0.8rem' }}>
                      {error}
                    </Alert>
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input panel */}
                <Divider />
                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center', bgcolor: isDark ? 'rgba(0,0,0,0.1)' : 'grey.50' }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ask Copilot..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loading}
                    id="aiwidget-chat-input"
                    autoComplete="off"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        fontSize: '0.825rem'
                      }
                    }}
                  />
                  <IconButton
                    color="primary"
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    id="aiwidget-send-button"
                    sx={{
                      bgcolor: inputText.trim() ? 'primary.main' : 'transparent',
                      color: inputText.trim() ? 'primary.contrastText' : 'action.disabled',
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      },
                      width: 32,
                      height: 32
                    }}
                  >
                    <SendIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              <iframe
                src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_projectManagementQueryAssistant/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
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
