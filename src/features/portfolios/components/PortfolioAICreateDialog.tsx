import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  useTheme,
  Avatar,
  Divider,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import SendIcon from '@mui/icons-material/Send'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import PsychologyIcon from '@mui/icons-material/Psychology'
import LightbulbIcon from '@mui/icons-material/Lightbulb'

import { createPortfolio, fetchPortfolioHierarchy, uploadDocument } from '@/services'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { BUSINESS_UNITS } from '@/constants/businessUnits'
import { fontSizes } from '@/styles'
import type { PortfolioModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { generateAIPortfolioDataStream, type ChatMessage } from '@/services/gemini.service'

interface PortfolioAICreateDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (portfolios: PortfolioModel[]) => void
  onError: (message: string) => void
}

export const PortfolioAICreateDialog: React.FC<PortfolioAICreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users, currentUser } = useUser()

  const [actionLoading, setActionLoading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  
  const [formData, setFormData] = useState({
    pm_portfolioname: '',
    pm_ownerlookup: currentUser?.systemuserid || '',
    pm_portfoliostatus: 1,
    pm_ragstatus: 1,
    pm_approvedbudgeteur: 0,
    pm_startdate: '',
    pm_enddate: '',
    pm_portfoliodescription: '',
    pm_strategicobjective: '',
    pm_businessunit: '',
    pm_prioritylevel: 2,
  })

  // AI Chat States
  const [aiChatHistory, setAIChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I can help you draft and create a new portfolio. You can upload a business case PDF, or describe your portfolio in natural language (strategic objectives, budgets, BU, owners). I will analyze it and fill out the form for you!' }
  ])
  const [aiMessage, setAIMessage] = useState('')
  const [aiFile, setAIFile] = useState<File | null>(null)
  const [aiLoading, setAILoading] = useState(false)

  const resetForm = () => {
    setFormData({
      pm_portfolioname: '',
      pm_ownerlookup: currentUser?.systemuserid || '',
      pm_portfoliostatus: 1,
      pm_ragstatus: 1,
      pm_approvedbudgeteur: 0,
      pm_startdate: '',
      pm_enddate: '',
      pm_portfoliodescription: '',
      pm_strategicobjective: '',
      pm_businessunit: '',
      pm_prioritylevel: 2,
    })
    setStagedFiles([])
    setAIChatHistory([
      { role: 'model', text: 'Hello! I can help you draft and create a new portfolio. You can upload a business case PDF, or describe your portfolio in natural language (strategic objectives, budgets, BU, owners). I will analyze it and fill out the form for you!' }
    ])
    setAIMessage('')
    setAIFile(null)
  }

  const handleAISend = async () => {
    if (!aiMessage.trim() && !aiFile) return

    setAILoading(true)
    const promptText = aiMessage.trim()
    const currentFile = aiFile

    setAIMessage('')
    setAIFile(null)

    const userMsg: ChatMessage = {
      role: 'user',
      text: promptText || (currentFile ? `Uploaded document: ${currentFile.name}` : ''),
      hasFile: !!currentFile,
      fileName: currentFile?.name
    }
    setAIChatHistory(prev => [...prev, userMsg, { role: 'model', text: 'Thinking...' }])

    try {
      let pdfBase64: string | undefined
      if (currentFile) {
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(currentFile)
          reader.onload = () => {
            const res = reader.result as string
            resolve(res.split(',')[1])
          }
          reader.onerror = reject
        })
      }

      const mappedUsers = users.map(u => ({
        id: u.systemuserid || '',
        name: u.fullname || ''
      }))

      const response = await generateAIPortfolioDataStream(
        `[Current Form Fields State (User may have made manual edits):]
${JSON.stringify(formData, null, 2)}

User Prompt: ${promptText || "Extract details from the document."}`,
        pdfBase64,
        currentFile?.name,
        [...aiChatHistory, userMsg],
        mappedUsers,
        (textSoFar, assistantMessageSoFar) => {
          setAIChatHistory(prev => {
            const copy = [...prev]
            if (copy.length > 0) {
              copy[copy.length - 1] = {
                role: 'model',
                text: assistantMessageSoFar || "Reading response..."
              }
            }
            return copy
          })
        }
      )

      setAIChatHistory(prev => {
        const copy = [...prev]
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'model',
            text: response.assistant_message
          }
        }
        return copy
      })

      // Populate left side form fields
      setFormData(prev => ({
        ...prev,
        pm_portfolioname: response.pm_portfolioname || prev.pm_portfolioname,
        pm_portfoliodescription: response.pm_portfoliodescription || prev.pm_portfoliodescription,
        pm_strategicobjective: response.pm_strategicobjective || prev.pm_strategicobjective,
        pm_approvedbudgeteur: response.pm_approvedbudgeteur != null ? response.pm_approvedbudgeteur : prev.pm_approvedbudgeteur,
        pm_startdate: response.pm_startdate || prev.pm_startdate,
        pm_enddate: response.pm_enddate || prev.pm_enddate,
        pm_businessunit: response.pm_businessunit || prev.pm_businessunit,
        pm_prioritylevel: response.pm_prioritylevel != null ? response.pm_prioritylevel : prev.pm_prioritylevel,
        pm_portfoliostatus: response.pm_portfoliostatus != null ? response.pm_portfoliostatus : prev.pm_portfoliostatus,
        pm_ragstatus: response.pm_ragstatus != null ? response.pm_ragstatus : prev.pm_ragstatus,
        pm_ownerlookup: response.matched_owner_id || prev.pm_ownerlookup
      }))

    } catch (err) {
      console.error("Gemini Portfolio AI error:", err)
      setAIChatHistory(prev => {
        const copy = [...prev]
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'model',
            text: `Error: ${err instanceof Error ? err.message : 'Failed to communicate with AI Assistant.'}`
          }
        }
        return copy
      })
    } finally {
      setAILoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.pm_portfolioname.trim()) return
    setActionLoading(true)
    try {
      const payload: Partial<PortfolioModel> = {
        pm_portfolioname: formData.pm_portfolioname,
        pm_ownerlookup: formData.pm_ownerlookup || undefined,
        pm_portfoliostatus: formData.pm_portfoliostatus,
        pm_ragstatus: formData.pm_ragstatus,
        pm_approvedbudgeteur: formData.pm_approvedbudgeteur || 0,
        pm_startdate: formData.pm_startdate || undefined,
        pm_enddate: formData.pm_enddate || undefined,
        pm_portfoliodescription: formData.pm_portfoliodescription || undefined,
        pm_strategicobjective: formData.pm_strategicobjective || undefined,
        pm_businessunit: formData.pm_businessunit || undefined,
        pm_prioritylevel: formData.pm_prioritylevel,
      }

      const result = await createPortfolio(payload)

      if (result) {
        const targetPortfolioId = result.pm_portfolioid
        if (targetPortfolioId && stagedFiles.length > 0) {
          const ownerId = currentUser?.systemuserid || ''
          await Promise.all(
            stagedFiles.map((file) =>
              uploadDocument(MODULE_NAMES.PORTFOLIOS.value, targetPortfolioId, file, ownerId)
            )
          )
        }

        const freshData = await fetchPortfolioHierarchy()
        onSuccess(freshData.portfolios)
        onClose()
      } else {
        onError('Unable to create portfolio. Dataverse creation failed.')
      }
    } catch (err: any) {
      onError(err?.message || 'Unable to create portfolio.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !actionLoading && !aiLoading && onClose()}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 3, height: '85vh', maxHeight: 800 }
        }
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Left Panel: The Portfolio Form */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <LightbulbIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Avatar>
            New Portfolio (AI Assisted)
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review and refine the portfolio parameters. The fields are populated automatically by the AI chat helper on the right.
            </Typography>

            {/* Basic Information */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Basic Information
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Portfolio Name"
                  required
                  fullWidth
                  size="small"
                  value={formData.pm_portfolioname}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_portfolioname: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-portfolio-owner-label">Owner / Sponsor</InputLabel>
                  <Select
                    id="ai-portfolio-owner-select"
                    labelId="ai-portfolio-owner-label"
                    value={formData.pm_ownerlookup}
                    label="Owner / Sponsor"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_ownerlookup: e.target.value }))}
                    renderValue={(selected) => {
                      const user = users.find(u => u.systemuserid === selected)
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                            {user?.fullname?.charAt(0) || '?'}
                          </Avatar>
                          {user?.fullname || 'Select Owner'}
                        </Box>
                      )
                    }}
                  >
                    {users.map((user) => (
                      <MenuItem key={user.systemuserid} value={user.systemuserid}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                            {user.fullname?.charAt(0) || '?'}
                          </Avatar>
                          <Typography variant="body2">{user.fullname}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-portfolio-bu-label">Business Unit</InputLabel>
                  <Select
                    id="ai-portfolio-bu-select"
                    labelId="ai-portfolio-bu-label"
                    value={formData.pm_businessunit}
                    label="Business Unit"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_businessunit: e.target.value }))}
                  >
                    {BUSINESS_UNITS.map((bu) => (
                      <MenuItem key={bu} value={bu}>{bu}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-portfolio-priority-label">Priority</InputLabel>
                  <Select
                    id="ai-portfolio-priority-select"
                    labelId="ai-portfolio-priority-label"
                    value={formData.pm_prioritylevel}
                    label="Priority"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_prioritylevel: e.target.value as number }))}
                  >
                    <MenuItem value={1}>High</MenuItem>
                    <MenuItem value={2}>Medium</MenuItem>
                    <MenuItem value={3}>Low</MenuItem>
                    <MenuItem value={4}>Very Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-portfolio-status-label">Status</InputLabel>
                  <Select
                    id="ai-portfolio-status-select"
                    labelId="ai-portfolio-status-label"
                    value={formData.pm_portfoliostatus}
                    label="Status"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_portfoliostatus: e.target.value as number }))}
                  >
                    <MenuItem value={0}>Active</MenuItem>
                    <MenuItem value={1}>Under Approval</MenuItem>
                    <MenuItem value={2}>Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-portfolio-rag-label">RAG Status</InputLabel>
                  <Select
                    id="ai-portfolio-rag-select"
                    labelId="ai-portfolio-rag-label"
                    value={formData.pm_ragstatus}
                    label="RAG Status"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                  >
                    <MenuItem value={1}>Green — On Track</MenuItem>
                    <MenuItem value={0}>Amber — At Risk</MenuItem>
                    <MenuItem value={2}>Red — Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.pm_startdate}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_startdate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.pm_enddate}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_enddate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>

            {/* Financial Tracking */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AttachMoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Financial Tracking
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Approved Budget (EUR)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.pm_approvedbudgeteur}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))}
                />
              </Grid>
            </Grid>

            {/* Strategy & Scope */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AssignmentIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Strategy & Scope
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  value={formData.pm_portfoliodescription}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_portfoliodescription: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Strategic Objective"
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  value={formData.pm_strategicobjective}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_strategicobjective: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              onClick={() => {
                resetForm()
                onClose()
              }}
              variant="outlined"
              disabled={actionLoading || aiLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.pm_portfolioname.trim() || actionLoading || aiLoading}
              startIcon={<CheckCircleIcon />}
              sx={{ fontWeight: 600 }}
            >
              Create Portfolio
            </Button>
          </DialogActions>
        </Box>

        {/* Right Panel: AI Chat Assistant */}
        <Box sx={{ width: { md: '380px', lg: '440px' }, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: isDark ? 'background.default' : 'grey.50' }}>
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <PsychologyIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Portfolio Copilot</Typography>
              <Typography variant="caption" color="text.secondary">Powered by Gemini 3.1 Flash Lite</Typography>
            </Box>
          </Box>

          {/* Chat History */}
          <Box sx={{ flex: 1, p: 2.5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {aiChatHistory.map((msg, idx) => {
              const isUser = msg.role === 'user'
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    width: '100%'
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '85%',
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: isUser 
                        ? 'primary.main' 
                        : isDark ? 'background.paper' : 'common.white',
                      color: isUser 
                        ? 'primary.contrastText' 
                        : 'text.primary',
                      border: isUser ? 'none' : '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      position: 'relative'
                    }}
                  >
                    {msg.hasFile && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 0.75, borderRadius: 1, bgcolor: isUser ? 'rgba(0,0,0,0.2)' : 'error.50', color: isUser ? '#fff' : 'error.main' }}>
                        <PictureAsPdfIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{msg.fileName}</Typography>
                      </Box>
                    )}
                    {isUser ? (
                      <Typography variant="body2" sx={{ lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{ 
                          lineHeight: 1.4,
                          '& p': { my: 1 },
                          '& table': { borderCollapse: 'collapse', width: '100%', my: 1.5, fontSize: '0.825rem' },
                          '& th, & td': { border: '1px solid', borderColor: 'divider', p: 0.75, textAlign: 'left' },
                          '& th': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.100', fontWeight: 700 },
                          '& ul, & ol': { pl: 2.5, my: 1 }
                        }}
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 0.5, fontSize: '9px' }}>
                    {isUser ? 'You' : 'Gemini Copilot'}
                  </Typography>
                </Box>
              )
            })}
            {aiLoading && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.5, bgcolor: isDark ? 'background.paper' : 'common.white', borderRadius: 2.5, border: '1px solid', borderColor: 'divider', width: 'fit-content' }}>
                <CircularProgress size={16} color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Gemini is processing details...
                </Typography>
              </Box>
            )}
          </Box>

          {/* Input area */}
          <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'background.paper' : 'common.white' }}>
            {aiFile && (() => {
              const file = aiFile
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Chip
                    icon={<PictureAsPdfIcon />}
                    label={file.name}
                    color="error"
                    variant="outlined"
                    onDelete={() => setAIFile(null)}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              )
            })()}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton
                component="label"
                disabled={aiLoading}
                color={aiFile ? "error" : "primary"}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <AttachFileIcon />
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAIFile(e.target.files[0])
                    }
                  }}
                />
              </IconButton>
              <TextField
                placeholder="Describe your portfolio or ask AI..."
                size="small"
                fullWidth
                disabled={aiLoading}
                value={aiMessage}
                onChange={(e) => setAIMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAISend()
                  }
                }}
              />
              <IconButton
                color="primary"
                disabled={aiLoading || (!aiMessage.trim() && !aiFile)}
                onClick={handleAISend}
                sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' } }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  )
}
