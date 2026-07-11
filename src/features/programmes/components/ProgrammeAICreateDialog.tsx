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

import { createProgramme, fetchPortfolioHierarchy, uploadDocument } from '@/services'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { BUSINESS_UNITS } from '@/constants/businessUnits'
import { fontSizes } from '@/styles'
import type { ProgrammeModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { generateAIProgrammeDataStream, type ChatMessage } from '@/services/gemini.service'

interface ProgrammeAICreateDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (programmes: ProgrammeModel[]) => void
  onError: (message: string) => void
  portfolios: { id: string; name: string; budget: number; startDate?: string; endDate?: string }[]
}

export const ProgrammeAICreateDialog: React.FC<ProgrammeAICreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
  portfolios,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users, currentUser } = useUser()

  const [actionLoading, setActionLoading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  const [formData, setFormData] = useState({
    pm_programmename: '',
    pm_programmemanager: '',
    pm_sponsorname: '',
    pm_programmephase: 0,
    pm_ragstatus: 1,
    pm_budgeteur: 0,
    pm_businessunit: '',
    pm_startdate: '',
    pm_enddate: '',
    pm_programmedescription: '',
    _pm_portfolio_value: '',
  })

  // AI Chat States
  const [aiChatHistory, setAIChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I can help you draft and create a new programme. You can upload a business case PDF, or describe your programme in natural language (portfolio, budget, BU, manager, sponsor, phases). I will analyze it and fill out the form for you!' }
  ])
  const [aiMessage, setAIMessage] = useState('')
  const [aiFile, setAIFile] = useState<File | null>(null)
  const [aiLoading, setAILoading] = useState(false)

  const resetForm = () => {
    setFormData({
      pm_programmename: '',
      pm_programmemanager: '',
      pm_sponsorname: '',
      pm_programmephase: 0,
      pm_ragstatus: 1,
      pm_budgeteur: 0,
      pm_businessunit: '',
      pm_startdate: '',
      pm_enddate: '',
      pm_programmedescription: '',
      _pm_portfolio_value: '',
    })
    setStagedFiles([])
    setAIChatHistory([
      { role: 'model', text: 'Hello! I can help you draft and create a new programme. You can upload a business case PDF, or describe your programme in natural language (portfolio, budget, BU, manager, sponsor, phases). I will analyze it and fill out the form for you!' }
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

      const mappedPortfolios = portfolios.map(p => ({
        id: p.id,
        name: p.name
      }))

      const mappedUsers = users.map(u => ({
        id: u.systemuserid || '',
        name: u.fullname || ''
      }))

      const response = await generateAIProgrammeDataStream(
        `[Current Form Fields State (User may have made manual edits):]
${JSON.stringify(formData, null, 2)}

User Prompt: ${promptText || "Extract details from the document."}`,
        pdfBase64,
        currentFile?.name,
        [...aiChatHistory, userMsg],
        mappedPortfolios,
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
        pm_programmename: response.pm_programmename || prev.pm_programmename,
        pm_programmedescription: response.pm_programmedescription || prev.pm_programmedescription,
        pm_budgeteur: response.pm_budgeteur != null ? response.pm_budgeteur : prev.pm_budgeteur,
        pm_startdate: response.pm_startdate || prev.pm_startdate,
        pm_enddate: response.pm_enddate || prev.pm_enddate,
        pm_businessunit: response.pm_businessunit || prev.pm_businessunit,
        pm_programmephase: response.pm_programmephase != null ? response.pm_programmephase : prev.pm_programmephase,
        pm_ragstatus: response.pm_ragstatus != null ? response.pm_ragstatus : prev.pm_ragstatus,
        _pm_portfolio_value: response.matched_portfolio_id || prev._pm_portfolio_value,
        pm_programmemanager: response.matched_programmemanager_id || prev.pm_programmemanager,
        pm_sponsorname: response.matched_sponsor_id || prev.pm_sponsorname
      }))

    } catch (err) {
      console.error("Gemini Programme AI error:", err)
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
    if (!formData.pm_programmename.trim() || !formData._pm_portfolio_value) return
    setActionLoading(true)
    try {
      const payload: Partial<ProgrammeModel> = {
        pm_programmename: formData.pm_programmename,
        pm_programmemanager: formData.pm_programmemanager || undefined,
        pm_sponsorname: formData.pm_sponsorname || undefined,
        pm_programmephase: formData.pm_programmephase,
        pm_ragstatus: formData.pm_ragstatus,
        pm_budgeteur: formData.pm_budgeteur || 0,
        pm_businessunit: formData.pm_businessunit || undefined,
        pm_startdate: formData.pm_startdate || undefined,
        pm_enddate: formData.pm_enddate || undefined,
        pm_programmedescription: formData.pm_programmedescription || undefined,
        _pm_portfolio_value: formData._pm_portfolio_value || undefined,
      }

      const result = await createProgramme(payload)

      if (result) {
        const targetProgrammeId = result.pm_programmeid
        if (targetProgrammeId && stagedFiles.length > 0) {
          const ownerId = currentUser?.systemuserid || ''
          await Promise.all(
            stagedFiles.map((file) =>
              uploadDocument(MODULE_NAMES.PROGRAMMES.value, targetProgrammeId, file, ownerId)
            )
          )
        }

        const freshData = await fetchPortfolioHierarchy()
        onSuccess(freshData.programmes)
        onClose()
      } else {
        onError('Unable to create programme. Dataverse creation failed.')
      }
    } catch (err: any) {
      onError(err?.message || 'Unable to create programme.')
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
        {/* Left Panel: The Programme Form */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <LightbulbIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Avatar>
            New Programme (AI Assisted)
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review and refine the programme parameters. The fields are populated automatically by the AI chat helper on the right.
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
                  label="Programme Name"
                  required
                  fullWidth
                  size="small"
                  value={formData.pm_programmename}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_programmename: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel id="ai-programme-portfolio-label">Portfolio</InputLabel>
                  <Select
                    id="ai-programme-portfolio-select"
                    labelId="ai-programme-portfolio-label"
                    value={formData._pm_portfolio_value}
                    label="Portfolio"
                    onChange={(e) => setFormData((f) => ({ ...f, _pm_portfolio_value: e.target.value }))}
                  >
                    {portfolios.map((portfolio) => (
                      <MenuItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-programme-manager-label">Programme Manager</InputLabel>
                  <Select
                    id="ai-programme-manager-select"
                    labelId="ai-programme-manager-label"
                    value={formData.pm_programmemanager}
                    label="Programme Manager"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_programmemanager: e.target.value }))}
                    renderValue={(selected) => {
                      const user = users.find(u => u.systemuserid === selected)
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                            {user?.fullname?.charAt(0) || '?'}
                          </Avatar>
                          {user?.fullname || 'Select Manager'}
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
                  <InputLabel id="ai-programme-sponsor-label">Sponsor</InputLabel>
                  <Select
                    id="ai-programme-sponsor-select"
                    labelId="ai-programme-sponsor-label"
                    value={formData.pm_sponsorname}
                    label="Sponsor"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_sponsorname: e.target.value }))}
                    renderValue={(selected) => {
                      const user = users.find(u => u.systemuserid === selected)
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                            {user?.fullname?.charAt(0) || '?'}
                          </Avatar>
                          {user?.fullname || 'Select Sponsor'}
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
                  <InputLabel id="ai-programme-bu-label">Business Unit</InputLabel>
                  <Select
                    id="ai-programme-bu-select"
                    labelId="ai-programme-bu-label"
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
                  <InputLabel id="ai-programme-phase-label">Programme Phase</InputLabel>
                  <Select
                    id="ai-programme-phase-select"
                    labelId="ai-programme-phase-label"
                    value={formData.pm_programmephase}
                    label="Programme Phase"
                    onChange={(e) => setFormData((f) => ({ ...f, pm_programmephase: e.target.value as number }))}
                  >
                    <MenuItem value={0}>Planning</MenuItem>
                    <MenuItem value={1}>Definition</MenuItem>
                    <MenuItem value={2}>Execution</MenuItem>
                    <MenuItem value={3}>Closeout</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="ai-programme-rag-label">RAG Status</InputLabel>
                  <Select
                    id="ai-programme-rag-select"
                    labelId="ai-programme-rag-label"
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
                  label="Programme Budget (EUR)"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.pm_budgeteur}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_budgeteur: Number(e.target.value) }))}
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
                  value={formData.pm_programmedescription}
                  onChange={(e) => setFormData((f) => ({ ...f, pm_programmedescription: e.target.value }))}
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
              disabled={!formData.pm_programmename.trim() || !formData._pm_portfolio_value || actionLoading || aiLoading}
              startIcon={<CheckCircleIcon />}
              sx={{ fontWeight: 600 }}
            >
              Create Programme
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Programme Copilot</Typography>
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
                placeholder="Describe your programme or ask AI..."
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
