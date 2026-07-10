import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Chip,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
  Tooltip,
  Fade,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ChatIcon from '@mui/icons-material/Chat'

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
const BOT_CONNECTION_STRING = 'https://b13877a65201e4ef8d748789573339.82.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/cr0b5_projectManagementQueryAssistant/conversations?api-version=2022-03-01-preview'

export default function CommonAgentPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am your Common Agent. How can I help you manage your projects and portfolios today?',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [copiedId, setCopiedId] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Helper to parse Bot Responses
  const parseBotResponseText = (responseStr: string): string => {
    try {
      const parsed = JSON.parse(responseStr)
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.text) return parsed.text
        if (parsed.message) return parsed.message
        if (parsed.response) return parsed.response
        // Join properties if it is a general JSON object
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
      // Execute Copilot Studio agent V2
      const result = await MicrosoftCopilotStudioService.ExecuteCopilotAsyncV2(
        BOT_NAME,
        {
          message: textToSend,
          notificationUrl: 'https://notificationurlplaceholder'
        },
        conversationId
      )

      if (result.success) {
        // Cast result to any to access dynamic response fields
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
          // No response text returned directly
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
      console.error('[Common Agent Page Error]', err)
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
        text: 'Hello! I am your Common Agent. How can I help you manage your projects and portfolios today?',
        timestamp: new Date()
      }
    ])
    setConversationId(undefined)
    setError(null)
  }

  const handleCopyConversationId = () => {
    if (!conversationId) return
    navigator.clipboard.writeText(conversationId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 3 }}>
      {/* Main Chat Interface */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'primary.contrastText',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SmartToyIcon sx={{ fontSize: 32 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, m: 0 }}>
                Common Agent
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Power Platform Dataverse-Backed Copilot Integration
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255, 255, 255, 0.15)', px: 2, py: 0.75, borderRadius: 5 }}>
              <Box sx={{ width: 8, height: 8, bgcolor: 'success.light', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Agent Online
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearChat}
              startIcon={<RefreshIcon />}
              id="commonagent-clear-chat"
              sx={{
                color: 'inherit',
                borderColor: 'rgba(255, 255, 255, 0.4)',
                '&:hover': {
                  borderColor: 'primary.contrastText',
                  bgcolor: 'rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              Reset Chat
            </Button>
          </Box>
        </Paper>

        {/* Message Window */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            mb: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {loading && <LinearProgress color="secondary" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />}
          
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

          {/* Quick Suggestions */}
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
                    id={`commonagent-suggestion-${index}`}
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

          {/* Input Panel */}
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
              placeholder="Ask Common Agent..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              id="commonagent-chat-input"
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
              id="commonagent-send-button"
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
        </Paper>
      </Box>

      {/* Sidebar Details Drawer */}
      <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper', position: 'relative' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoIcon color="secondary" />
              <Typography variant="h5" sx={{ fontWeight: 700, m: 0 }}>
                Agent Metadata
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <List disablePadding>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText
                  primary={<Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Bot Schema Name</Typography>}
                  secondary={<Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{BOT_NAME}</Typography>}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText
                  primary={<Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Connector Endpoint</Typography>}
                  secondary={<Typography variant="body2" sx={{ fontWeight: 600 }}>ExecuteCopilotAsyncV2</Typography>}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText
                  primary={<Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Active Environment ID</Typography>}
                  secondary={<Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>b13877a6-5201-e4ef-8d74-878957333982</Typography>}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemText
                  primary={<Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>API Connection URL</Typography>}
                  secondary={
                    <Tooltip title={BOT_CONNECTION_STRING}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          maxWidth: 270,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          color: 'secondary.main',
                          fontFamily: 'monospace'
                        }}
                      >
                        {BOT_CONNECTION_STRING}
                      </Typography>
                    </Tooltip>
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Conversation details */}
        <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ChatIcon color="secondary" />
              <Typography variant="h5" sx={{ fontWeight: 700, m: 0 }}>
                Active Session
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {conversationId ? (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                  Conversation ID
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: isDark ? 'background.default' : 'grey.50',
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1.5,
                    borderRadius: 2,
                    mb: 2
                  }}
                >
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mr: 1 }}>
                    {conversationId}
                  </Typography>
                  <Tooltip title={copiedId ? 'Copied!' : 'Copy ID'}>
                    <IconButton size="small" onClick={handleCopyConversationId} sx={{ flexShrink: 0 }}>
                      {copiedId ? <CheckCircleIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontStyle: 'italic' }}>
                  Conversation ID is sent with requests to persist conversational context across messages.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  No active session. Send a message to start one.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
      
      {/* Styles for animations */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(76, 175, 80, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
          }
        }
      `}</style>
    </Box>
  )
}
