import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  Fade,
  LinearProgress,
  Alert,
  Divider,
  useTheme,
  alpha
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'

import { MicrosoftCopilotStudioService } from '@/generated/services/MicrosoftCopilotStudioService'

interface Message {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: Date
  isJson?: boolean
}

const SUGGESTIONS = [
  'What is our current portfolio health?',
  'What projects are currently active?',
  'Are there any high-priority risks?'
]

const BOT_NAME = 'cr0b5_projectManagementQueryAssistant'

export default function AIAgentPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [activeTab, setActiveTab] = useState<'directline' | 'canvas'>('directline')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am your AI Agent. How can I help you manage your projects and portfolios today?',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeTab === 'directline') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, activeTab])

  // Helper to parse Bot Responses
  const parseBotResponseText = (responseStr: string): string => {
    try {
      const parsed = JSON.parse(responseStr)
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.text) return parsed.text
        if (parsed.message) return parsed.message
        if (parsed.response) return parsed.response
        return Object.entries(parsed)
          .map(([key, val]) => `**${key}**: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
          .join('\n\n')
      }
    } catch {
      // Use raw string if not JSON
    }
    return responseStr
  }

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
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
          message: textToSend,
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
            const isJson = respText.trim().startsWith('{')
            return {
              id: `agent-${Date.now()}-${index}`,
              sender: 'agent',
              text: formattedText,
              timestamp: new Date(),
              isJson
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
              text: 'Message received and processed successfully, but no direct response payload was returned by the agent.',
              timestamp: new Date()
            }
          ])
        }
      } else {
        const errorMsg = result.error?.message || 'Failed to communicate with the Copilot Studio agent.'
        setError(errorMsg)
      }
    } catch (err: any) {
      console.error('[AI Agent Page Error]', err)
      setError(err?.message || 'An unexpected error occurred while calling the agent service.')
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        text: 'Hello! I am your AI Agent. How can I help you manage your projects and portfolios today?',
        timestamp: new Date()
      }
    ])
    setConversationId(undefined)
    setError(null)
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, m: 0 }}>
            AI Agent
          </Typography>
          {activeTab === 'directline' && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearChat}
              startIcon={<RefreshIcon />}
              id="aiagent-clear-chat"
              sx={{ borderRadius: 2 }}
            >
              Reset Chat
            </Button>
          )}
        </Box>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTabs-indicator': { bgcolor: 'secondary.main' },
            '& .Mui-selected': { color: 'secondary.main !important' }
          }}
        >
          <Tab value="directline" label="Agent Chat" />
          <Tab value="canvas" label="Webchat Portal" />
        </Tabs>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: 3,
          bgcolor: 'background.paper',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {activeTab === 'directline' ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {loading && <LinearProgress color="secondary" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />}
            
            {/* Messages Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((msg) => {
                const isUser = msg.sender === 'user'
                return (
                  <Fade in={true} key={msg.id}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: isUser ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        maxWidth: '80%',
                        alignSelf: isUser ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: isUser ? 'primary.main' : 'secondary.main',
                          width: 36,
                          height: 36
                        }}
                      >
                        {isUser ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                      </Avatar>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                            bgcolor: isUser
                              ? theme.palette.primary.main
                              : isDark
                              ? 'background.default'
                              : 'grey.100',
                            color: isUser
                              ? theme.palette.primary.contrastText
                              : theme.palette.text.primary,
                            boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                            border: isUser ? 'none' : '1px solid',
                            borderColor: 'divider',
                            whiteSpace: 'pre-wrap',
                            '& code': {
                              fontFamily: 'monospace',
                              bgcolor: isUser ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                              px: 0.5,
                              borderRadius: 0.5
                            }
                          }}
                        >
                          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                            {msg.text}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.7rem', px: 1 }}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )
              })}

              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 1 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                    <SmartToyIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ display: 'flex', gap: 0.5, bgcolor: isDark ? 'background.default' : 'grey.100', p: 2, borderRadius: '4px 18px 18px 18px', border: '1px solid', borderColor: 'divider' }}>
                    <CircularProgress size={16} color="secondary" />
                    <Typography variant="body2" sx={{ color: 'text.secondary', pl: 1 }}>
                      Thinking...
                    </Typography>
                  </Box>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Suggestions Chips */}
            {messages.length === 1 && !loading && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1.5, fontWeight: 700 }}>
                  Suggested Queries:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {SUGGESTIONS.map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      onClick={() => handleSendMessage(suggestion)}
                      id={`aiagent-suggestion-${index}`}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isDark ? alpha(theme.palette.secondary.main, 0.08) : 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.secondary.main, 0.15),
                          borderColor: 'secondary.main',
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Input form */}
            <Divider />
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage(inputText)
              }}
              sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', bgcolor: isDark ? 'rgba(0,0,0,0.1)' : 'grey.50' }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Ask AI Agent..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                id="aiagent-chat-input"
                autoComplete="off"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'background.paper'
                  }
                }}
              />
              <IconButton
                color="primary"
                type="submit"
                disabled={loading || !inputText.trim()}
                id="aiagent-send-button"
                sx={{
                  bgcolor: inputText.trim() ? 'primary.main' : 'transparent',
                  color: inputText.trim() ? 'primary.contrastText' : 'action.disabled',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  },
                  width: 40,
                  height: 40,
                  transition: 'all 0.2s'
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <iframe
            src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_projectManagementQueryAssistant/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
            frameBorder="0"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="AI Agent Canvas"
          />
        )}
      </Paper>
    </Box>
  )
}
