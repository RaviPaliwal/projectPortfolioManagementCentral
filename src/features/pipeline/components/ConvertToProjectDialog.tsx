import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Avatar,
  Typography,
  Divider,
  Slider,
  Alert,
  Chip,
  Paper,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TimelineIcon from '@mui/icons-material/Timeline'
import GppGoodIcon from '@mui/icons-material/GppGood'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TransformIcon from '@mui/icons-material/Transform'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { normalizeLookupId } from '@/services'
import { fontSizes } from '@/styles'
import { DocumentPreviewDialog, Button } from '@/components/common'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AttachFileIcon from '@mui/icons-material/AttachFile'

interface ConvertToProjectDialogProps {
  open: boolean
  onClose: () => void
  initiative: InitiativeModel | null
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  onConvert: (entityData: Partial<any>, files: File[], triggerApproval: boolean) => Promise<void>
  converting: boolean
  allProjects?: ProjectModel[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// Helper to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const ConvertToProjectDialog: React.FC<ConvertToProjectDialogProps> = ({
  open,
  onClose,
  initiative,
  portfolios,
  programmes,
  onConvert,
  converting,
  allProjects = [],
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users } = useUser()
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null)

  const handlePreviewStaged = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewFile({ name: file.name, url })
  }

  // ── Form State ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    pm_projectname: '',
    pm_projectcode: '',
    _pm_portfolio_value: '',
    _pm_programme_value: '',
    pm_projectmanager: '',
    pm_projectsponsor: '',
    pm_projectphase: '3',
    pm_ragstatus: '1',
    pm_approvedbudgeteur: 0,
    pm_actualcosteur: 0,
    pm_plannedstartdate: '',
    pm_plannedenddate: '',
    pm_actualstartdate: '',
    pm_actualenddate: '',
    pm_businessunit: '',
    pm_projectpriority: 2,
    pm_percentcomplete: 0,
    pm_costragstatus: '0',
    pm_scheduleragstatus: '1',
    pm_benefitsragstatus: '0',
    
    // Programme conversion target fields
    pm_programmename: '',
    pm_programmemanager: '',
    pm_sponsorname: '',
    pm_programmedescription: '',
    
    // Portfolio conversion target fields
    pm_portfolioname: '',
    pm_portfoliodescription: '',
    pm_ownerlookup: '',
    pm_strategicobjective: '',
  })

  // ── Initialize form when dialog opens ──────────────────────────────────
  useEffect(() => {
    if (open && initiative) {
      setForm({
        pm_projectname: initiative.pm_name ?? '',
        pm_projectcode: '',
        _pm_portfolio_value: initiative._pm_portfolio_value ?? '',
        _pm_programme_value: initiative._pm_programme_value ?? '',
        pm_projectmanager: '',
        pm_projectsponsor: initiative.pm_requestedbyname ?? '',
        pm_projectphase: initiative.pm_initiativetype === 2 ? '1' : '3',
        pm_ragstatus: '1',
        pm_approvedbudgeteur: initiative.pm_estimatedcost ?? 0,
        pm_actualcosteur: 0,
        pm_plannedstartdate: '',
        pm_plannedenddate: '',
        pm_actualstartdate: '',
        pm_actualenddate: '',
        pm_businessunit: '',
        pm_projectpriority: 2,
        pm_percentcomplete: 0,
        pm_costragstatus: '0',
        pm_scheduleragstatus: '1',
        pm_benefitsragstatus: '0',
        
        pm_programmename: initiative.pm_name ?? '',
        pm_programmemanager: '',
        pm_sponsorname: initiative.pm_requestedbyname ?? '',
        pm_programmedescription: initiative.pm_businesscase ?? '',
        
        pm_portfolioname: initiative.pm_name ?? '',
        pm_portfoliodescription: initiative.pm_businesscase ?? '',
        pm_ownerlookup: initiative._pm_requestedby_value ?? '',
        pm_strategicobjective: '',
      })
      setStagedFiles([])
    }
  }, [open, initiative])

  // ── Programme validation ───────────────────────────────────────────────
  const selectedProgramme = useMemo(() => {
    if (initiative?.pm_initiativetype !== 0) return null
    if (!form._pm_programme_value) return null
    return programmes.find((p) => p.pm_programmeid === form._pm_programme_value) || null
  }, [form._pm_programme_value, programmes, initiative?.pm_initiativetype])

  const programmeBudgetInfo = useMemo(() => {
    if (!selectedProgramme) return null
    const progBudget = selectedProgramme.pm_budgeteur ?? 0
    const usedByProjects = allProjects
      .filter(pj => normalizeLookupId(pj._pm_programme_value) === normalizeLookupId(selectedProgramme.pm_programmeid))
      .reduce((s, pj) => s + (pj.pm_approvedbudgeteur ?? 0), 0)
    const availableBudget = Math.max(0, progBudget - usedByProjects)
    return { programmeBudget: progBudget, availableBudget }
  }, [selectedProgramme, allProjects])

  const dateErrors = useMemo(() => {
    const errors: { startDate?: string; endDate?: string } = {}
    if (!selectedProgramme) return errors
    const progStart = selectedProgramme.pm_startdate
    const progEnd = selectedProgramme.pm_enddate
    if (!progStart || !progEnd) return errors

    if (form.pm_plannedstartdate && form.pm_plannedstartdate < progStart) {
      errors.startDate = `Cannot be before programme start (${new Date(progStart).toLocaleDateString()})`
    }
    if (form.pm_plannedenddate && form.pm_plannedenddate > progEnd) {
      errors.endDate = `Cannot be after programme end (${new Date(progEnd).toLocaleDateString()})`
    }
    if (form.pm_plannedstartdate && form.pm_plannedenddate && form.pm_plannedstartdate > form.pm_plannedenddate) {
      errors.endDate = 'End date must be after start date'
    }
    return errors
  }, [form.pm_plannedstartdate, form.pm_plannedenddate, selectedProgramme])

  const hasDateErrors = !!dateErrors.startDate || !!dateErrors.endDate
  const hasBudgetError = programmeBudgetInfo !== null && form.pm_approvedbudgeteur > programmeBudgetInfo.availableBudget
  
  // Conditionally determine canSubmit based on Initiative Type
  const canSubmit = useMemo(() => {
    if (!initiative) return false
    const type = initiative.pm_initiativetype
    if (type === 0) {
      return form.pm_projectname.trim() && form.pm_projectmanager && !hasDateErrors && !hasBudgetError
    } else if (type === 1) {
      return form.pm_programmename.trim() && form.pm_programmemanager
    } else if (type === 2) {
      return form.pm_portfolioname.trim() && form.pm_ownerlookup
    }
    return false
  }, [initiative, form, hasDateErrors, hasBudgetError])

  // ── Filter programmes by selected portfolio ────────────────────────────
  const filteredProgrammes = programmes.filter((p) =>
    !form._pm_portfolio_value || p._pm_portfolio_value === form._pm_portfolio_value
  )

  // ── Selected portfolio display name ────────────────────────────────────
  const selectedPortfolio = portfolios.find(
    (p) => p.pm_portfolioid === form._pm_portfolio_value
  )

  // ── Handle form field changes ──────────────────────────────────────────
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: any } }) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    onConvert(form, stagedFiles, true)
  }

  return (
    <>
      <Dialog open={open} onClose={() => !converting && onClose()} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main' }}>
            <TransformIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          Convert Initiative to {initiative?.pm_initiativetype === 0 ? 'Project' : initiative?.pm_initiativetype === 1 ? 'Programme' : initiative?.pm_initiativetype === 2 ? 'Portfolio' : 'Entity'}
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Review the pre-filled details from the initiative below. Fields marked as read-only are carried over from the pipeline.
            Fill in the remaining details to complete the conversion.
          </Typography>

          {initiative?.pm_businesscase && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Business Case</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {initiative.pm_businesscase}
              </Typography>
            </Alert>
          )}

          {/* ── Section: From Initiative (Readonly) ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LightbulbIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              From Initiative (Read-only)
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12 }}>
              {initiative?.pm_initiativetype === 0 && (
                <TextField
                  fullWidth
                  label="Project Name"
                  size="small"
                  value={form.pm_projectname}
                  onChange={handleChange('pm_projectname')}
                />
              )}
              {initiative?.pm_initiativetype === 1 && (
                <TextField
                  fullWidth
                  label="Programme Name"
                  size="small"
                  value={form.pm_programmename}
                  onChange={handleChange('pm_programmename')}
                />
              )}
              {initiative?.pm_initiativetype === 2 && (
                <TextField
                  fullWidth
                  label="Portfolio Name"
                  size="small"
                  value={form.pm_portfolioname}
                  onChange={handleChange('pm_portfolioname')}
                />
              )}
            </Grid>

            {initiative?.pm_initiativetype !== 2 && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Portfolio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {selectedPortfolio?.pm_portfolioname ?? 'No portfolio'}
                  </Typography>
                </Box>
              </Grid>
            )}

            {initiative?.pm_initiativetype !== 2 && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    Sponsor
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {form.pm_projectsponsor || '—'}
                  </Typography>
                </Box>
              </Grid>
            )}

            {initiative?.pm_initiativetype !== 2 && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Estimated Cost (from initiative)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {initiative?.pm_estimatedcost ? currencyFormatter.format(initiative.pm_estimatedcost) : '—'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Estimated Benefits (from initiative)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                      {initiative?.pm_estimatedbenefits ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '—'}
                    </Typography>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>

          {/* ── Section: Details ── */}
          {initiative?.pm_initiativetype === 0 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  Project Details
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="convert-programme-label">Programme</InputLabel>
                    <Select
                      id="convert-programme-select"
                      labelId="convert-programme-label"
                      value={form._pm_programme_value}
                      label="Programme"
                      onChange={(e) => setForm((p) => ({ ...p, _pm_programme_value: e.target.value }))}
                    >
                      <MenuItem value="">None</MenuItem>
                      {filteredProgrammes.map((p) => (
                        <MenuItem key={p.pm_programmeid} value={p.pm_programmeid}>
                          {p.pm_programmename}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="convert-pm-label">Project Manager</InputLabel>
                    <Select
                      id="convert-pm-select"
                      labelId="convert-pm-label"
                      value={form.pm_projectmanager}
                      label="Project Manager"
                      onChange={(e) => setForm((p) => ({ ...p, pm_projectmanager: e.target.value }))}
                      renderValue={(selected) => {
                        const user = users.find((u) => u.systemuserid === selected)
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
                      <MenuItem value="">— Select —</MenuItem>
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
                  <TextField
                    fullWidth
                    label="Business Unit"
                    size="small"
                    value={form.pm_businessunit}
                    onChange={handleChange('pm_businessunit')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="convert-priority-label">Priority</InputLabel>
                    <Select
                      id="convert-priority-select"
                      labelId="convert-priority-label"
                      value={form.pm_projectpriority}
                      label="Priority"
                      onChange={(e) => setForm((p) => ({ ...p, pm_projectpriority: e.target.value as number }))}
                    >
                      <MenuItem value={1}>High</MenuItem>
                      <MenuItem value={2}>Medium</MenuItem>
                      <MenuItem value={3}>Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* ── Section: Status & Health ── */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <GppGoodIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  Status & Health
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    label="Phase"
                    size="small"
                    value={form.pm_projectphase}
                    disabled
                    slotProps={{
                      input: { readOnly: true },
                    }}
                  >
                    <MenuItem value="3">Initiation</MenuItem>
                    <MenuItem value="0">Execution</MenuItem>
                    <MenuItem value="1">Planning</MenuItem>
                    <MenuItem value="2">Closure</MenuItem>
                    <MenuItem value="5">Completed</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </>
          )}

          {initiative?.pm_initiativetype === 1 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  Programme Details
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="convert-pgm-label">Programme Manager</InputLabel>
                    <Select
                      id="convert-pgm-select"
                      labelId="convert-pgm-label"
                      value={form.pm_programmemanager}
                      label="Programme Manager"
                      onChange={(e) => setForm((p) => ({ ...p, pm_programmemanager: e.target.value }))}
                      renderValue={(selected) => {
                        const user = users.find((u) => u.systemuserid === selected)
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
                      <MenuItem value="">— Select —</MenuItem>
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
                  <TextField
                    fullWidth
                    label="Business Sponsor Name"
                    size="small"
                    value={form.pm_sponsorname}
                    onChange={handleChange('pm_sponsorname')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Business Unit"
                    size="small"
                    value={form.pm_businessunit}
                    onChange={handleChange('pm_businessunit')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Overall RAG"
                    size="small"
                    value={form.pm_ragstatus}
                    onChange={handleChange('pm_ragstatus')}
                  >
                    <MenuItem value="1">Green</MenuItem>
                    <MenuItem value="0">Amber</MenuItem>
                    <MenuItem value="2">Red</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <TextField
                    fullWidth
                    label="Programme Description"
                    size="small"
                    multiline
                    rows={2}
                    value={form.pm_programmedescription}
                    onChange={handleChange('pm_programmedescription')}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {initiative?.pm_initiativetype === 2 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  Portfolio Details
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="convert-portfolio-owner-label">Portfolio Owner</InputLabel>
                    <Select
                      id="convert-portfolio-owner-select"
                      labelId="convert-portfolio-owner-label"
                      value={form.pm_ownerlookup}
                      label="Portfolio Owner"
                      onChange={(e) => setForm((p) => ({ ...p, pm_ownerlookup: e.target.value }))}
                      renderValue={(selected) => {
                        const user = users.find((u) => u.systemuserid === selected)
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
                      <MenuItem value="">— Select —</MenuItem>
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
                  <TextField
                    fullWidth
                    label="Business Unit"
                    size="small"
                    value={form.pm_businessunit}
                    onChange={handleChange('pm_businessunit')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Overall RAG"
                    size="small"
                    value={form.pm_ragstatus}
                    onChange={handleChange('pm_ragstatus')}
                  >
                    <MenuItem value="1">Green</MenuItem>
                    <MenuItem value="0">Amber</MenuItem>
                    <MenuItem value="2">Red</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 12 }}>
                  <TextField
                    fullWidth
                    label="Strategic Objectives"
                    size="small"
                    multiline
                    rows={2}
                    value={form.pm_strategicobjective}
                    onChange={handleChange('pm_strategicobjective')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <TextField
                    fullWidth
                    label="Portfolio Description"
                    size="small"
                    multiline
                    rows={2}
                    value={form.pm_portfoliodescription}
                    onChange={handleChange('pm_portfoliodescription')}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* ── Section: Financials ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AttachMoneyIcon sx={{ fontSize: 18, color: 'success.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Financials
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Approved Budget (EUR)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                  {currencyFormatter.format(form.pm_approvedbudgeteur)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {initiative?.pm_initiativetype === 0 && programmeBudgetInfo && (() => {
            const allocatedPct = Math.min(100, Math.round(((programmeBudgetInfo.programmeBudget - programmeBudgetInfo.availableBudget) / programmeBudgetInfo.programmeBudget) * 100))
            const isOverBudget = programmeBudgetInfo.availableBudget <= 0
            return (
              <Paper variant="outlined" sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50', mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'success.main' }} /> Programme Budget Allocation
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Programme Budget</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.md }}>
                      {currencyFormatter.format(programmeBudgetInfo.programmeBudget)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Allocated to Projects</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'warning.main', fontSize: fontSizes.md }}>
                      {currencyFormatter.format(programmeBudgetInfo.programmeBudget - programmeBudgetInfo.availableBudget)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Available Remaining</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: isOverBudget ? 'error.main' : 'success.main', fontSize: fontSizes.lg }}>
                      {currencyFormatter.format(programmeBudgetInfo.availableBudget)}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Allocation Usage</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{allocatedPct}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={allocatedPct} 
                    color={isOverBudget ? 'error' : allocatedPct > 80 ? 'warning' : 'success'} 
                    sx={{ height: 10, borderRadius: 5 }} 
                  />
                </Box>

                {isOverBudget && (
                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
                    ⚠️ No remaining budget in this programme.
                  </Typography>
                )}
              </Paper>
            )
          })()}

          {initiative?.pm_initiativetype === 0 && hasBudgetError && (
            <Box sx={{ mb: 2, p: 1.25, bgcolor: alpha(theme.palette.error.main, 0.1), border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.2), display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main', flexShrink: 0 }} />
              <Typography variant="caption" color="error.dark" sx={{ fontWeight: 600 }}>
                Approved budget exceeds programme budget by {currencyFormatter.format(form.pm_approvedbudgeteur - programmeBudgetInfo!.availableBudget)}.
              </Typography>
            </Box>
          )}

          {/* ── Section: Timeline ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Timeline
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {initiative?.pm_initiativetype === 0 && selectedProgramme && selectedProgramme.pm_startdate && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TimelineIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="caption" color="text.secondary">
                Programme date range:{' '}
                <strong>{new Date(selectedProgramme.pm_startdate).toLocaleDateString()}</strong>
                {' — '}
                <strong>{selectedProgramme.pm_enddate ? new Date(selectedProgramme.pm_enddate).toLocaleDateString() : 'No end date'}</strong>
                {' · Project must be within this range'}
              </Typography>
            </Paper>
          )}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Planned Start"
                value={form.pm_plannedstartdate}
                onChange={handleChange('pm_plannedstartdate')}
                error={initiative?.pm_initiativetype === 0 && !!dateErrors.startDate}
                helperText={(initiative?.pm_initiativetype === 0 && dateErrors.startDate) || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                label="Planned End"
                value={form.pm_plannedenddate}
                onChange={handleChange('pm_plannedenddate')}
                error={initiative?.pm_initiativetype === 0 && !!dateErrors.endDate}
                helperText={(initiative?.pm_initiativetype === 0 && dateErrors.endDate) || ''}
              />
            </Grid>
          </Grid>

          {/* ── Section: Supporting Documents ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 4, mb: 2 }}>
            <AttachFileIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Supporting Documents
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Box sx={{ p: 2.5, border: '1px dashed', borderColor: 'divider', textAlign: 'center', bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
              sx={{ mb: stagedFiles.length > 0 ? 2 : 0 }}
            >
              Select Files
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) {
                    const filesArray = Array.from(e.target.files)
                    const largeFiles = filesArray.filter((f) => f.size > 32 * 1024 * 1024)
                    if (largeFiles.length > 0) {
                      alert('Some files exceed the maximum 32MB limit.')
                      return
                    }
                    setStagedFiles((prev) => [...prev, ...filesArray])
                  }
                }}
              />
            </Button>
            {stagedFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {stagedFiles.map((file, idx) => (
                  <Chip
                    key={idx}
                    label={`${file.name} (${formatBytes(file.size)})`}
                    onDelete={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                    onClick={() => handlePreviewStaged(file)}
                    title="Click to preview file"
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} variant="outlined" disabled={converting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={!canSubmit || converting}
            sx={{ fontWeight: 600 }}
          >
            {converting ? 'Converting...' : `Create ${initiative?.pm_initiativetype === 0 ? 'Project' : initiative?.pm_initiativetype === 1 ? 'Programme' : 'Portfolio'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {previewFile && (
        <DocumentPreviewDialog
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileName={previewFile.name}
          fileUrl={previewFile.url}
        />
      )}
    </>
  )
}
