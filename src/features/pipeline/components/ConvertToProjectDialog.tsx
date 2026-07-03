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
  onConvert: (projectData: Partial<any>, files: File[]) => Promise<void>
  converting: boolean
  allProjects?: ProjectModel[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

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
  })

  // ── Initialize form when dialog opens ──────────────────────────────────
  useEffect(() => {
    if (open && initiative) {
      setForm({
        pm_projectname: initiative.pm_name ?? '',
        pm_projectcode: '',
        _pm_portfolio_value: initiative._pm_portfolio_value ?? '',
        _pm_programme_value: '',
        pm_projectmanager: '',
        pm_projectsponsor: initiative.pm_requestorname ?? '',
        pm_projectphase: '3',
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
      })
      setStagedFiles([])
    }
  }, [open, initiative])

  // ── Programme validation ───────────────────────────────────────────────
  const selectedProgramme = useMemo(() => {
    if (!form._pm_programme_value) return null
    return programmes.find((p) => p.pm_programmeid === form._pm_programme_value) || null
  }, [form._pm_programme_value, programmes])

  const programmeBudgetInfo = useMemo(() => {
    if (!selectedProgramme) return null
    const progBudget = selectedProgramme.pm_budgeteur ?? 0
    // Compute remaining budget: programme budget minus other project budgets
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
  const canSubmit = form.pm_projectname.trim() && !hasDateErrors && !hasBudgetError

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

  const handleNumberChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: Number(e.target.value) }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    onConvert(form, stagedFiles)
  }

  return (
    <>
      <Dialog open={open} onClose={() => !converting && onClose()} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main' }}>
            <TransformIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Avatar>
          Convert Initiative to Project
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review the pre-filled details from the initiative below. Fields marked as read-only are carried over from the pipeline.
          Fill in the remaining project information to create the project.
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
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              label="Project Name"
              size="small"
              value={form.pm_projectname}
              onChange={handleChange('pm_projectname')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Project Code"
              size="small"
              value={form.pm_projectcode}
              onChange={handleChange('pm_projectcode')}
              placeholder="e.g. PROJ-001"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Portfolio"
              size="small"
              value={selectedPortfolio?.pm_portfolioname ?? 'No portfolio'}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Sponsor"
              size="small"
              value={form.pm_projectsponsor || '—'}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Estimated Cost (from initiative)"
              size="small"
              value={initiative?.pm_estimatedcost ? currencyFormatter.format(initiative.pm_estimatedcost) : '—'}
              disabled
              slotProps={{ input: { sx: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Estimated Benefits (from initiative)"
              size="small"
              value={initiative?.pm_estimatedbenefits ? currencyFormatter.format(initiative.pm_estimatedbenefits) : '—'}
              disabled
              slotProps={{ input: { sx: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 } } }}
            />
          </Grid>
        </Grid>

        {/* ── Section: Project Details (Editable) ── */}
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
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Overall RAG"
              size="small"
              value={form.pm_ragstatus}
              onChange={handleChange('pm_ragstatus')}
            >
              <MenuItem value="1">Low — On Track</MenuItem>
              <MenuItem value="0">Medium — At Risk</MenuItem>
              <MenuItem value="2">High — Critical</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Phase"
              size="small"
              value={form.pm_projectphase}
              onChange={handleChange('pm_projectphase')}
            >
              <MenuItem value="3">Initiation</MenuItem>
              <MenuItem value="0">Execution</MenuItem>
              <MenuItem value="1">Planning</MenuItem>
              <MenuItem value="2">Closure</MenuItem>
              <MenuItem value="4">Rejected</MenuItem>
              <MenuItem value="5">Completed</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Cost RAG"
              size="small"
              value={form.pm_costragstatus}
              onChange={handleChange('pm_costragstatus')}
            >
              <MenuItem value="0">Green</MenuItem>
              <MenuItem value="1">Amber</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Schedule RAG"
              size="small"
              value={form.pm_scheduleragstatus}
              onChange={handleChange('pm_scheduleragstatus')}
            >
              <MenuItem value="1">Green</MenuItem>
              <MenuItem value="0">Amber</MenuItem>
              <MenuItem value="2">Red</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Benefits RAG"
              size="small"
              value={form.pm_benefitsragstatus}
              onChange={handleChange('pm_benefitsragstatus')}
            >
              <MenuItem value="0">Green</MenuItem>
              <MenuItem value="1">Amber</MenuItem>
              <MenuItem value="2">Not Set</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Percent Complete: {form.pm_percentcomplete}%
            </Typography>
            <Slider
              value={form.pm_percentcomplete}
              onChange={(_, v) => setForm((p) => ({ ...p, pm_percentcomplete: v as number }))}
              valueLabelDisplay="auto"
              step={5}
              min={0}
              max={100}
            />
          </Grid>
        </Grid>

        {/* ── Section: Financials ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AttachMoneyIcon sx={{ fontSize: 18, color: 'success.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Financials
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Approved Budget (EUR)"
              size="small"
              value={form.pm_approvedbudgeteur}
              onChange={handleNumberChange('pm_approvedbudgeteur')}
              error={hasBudgetError}
              helperText={hasBudgetError ? `Exceeds programme budget by ${currencyFormatter.format(form.pm_approvedbudgeteur - programmeBudgetInfo!.availableBudget)}` : ''}
              slotProps={{
                input: {
                  startAdornment: (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>€</Typography>
                  ),
                  sx: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 },
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Actual Cost (EUR)"
              size="small"
              value={form.pm_actualcosteur}
              onChange={handleNumberChange('pm_actualcosteur')}
              slotProps={{
                input: {
                  startAdornment: (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>€</Typography>
                  ),
                  sx: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 },
                },
              }}
            />
          </Grid>
        </Grid>

        {programmeBudgetInfo && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> Programme Budget Allocation
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Total Programme Budget</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{currencyFormatter.format(programmeBudgetInfo.programmeBudget)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Already allocated to other projects</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'warning.main' }}>{currencyFormatter.format(programmeBudgetInfo.programmeBudget - programmeBudgetInfo.availableBudget)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Remaining for this project</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', color: programmeBudgetInfo.availableBudget <= 0 ? 'error.main' : 'success.main' }}>{currencyFormatter.format(programmeBudgetInfo.availableBudget)}</Typography>
            </Box>
            {programmeBudgetInfo.availableBudget <= 0 && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>No remaining budget in this programme.</Typography>
            )}
          </Paper>
        )}

        {hasBudgetError && (
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

        {selectedProgramme && selectedProgramme.pm_startdate && (
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
              error={!!dateErrors.startDate}
              helperText={dateErrors.startDate || ''}
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
              error={!!dateErrors.endDate}
              helperText={dateErrors.endDate || ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              label="Actual Start"
              value={form.pm_actualstartdate}
              onChange={handleChange('pm_actualstartdate')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              label="Actual End"
              value={form.pm_actualenddate}
              onChange={handleChange('pm_actualenddate')}
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
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={converting || !canSubmit}
          startIcon={<TransformIcon />}
          sx={{ fontWeight: 600 }}
        >
          {converting ? 'Creating Project...' : 'Create Project'}
        </Button>
      </DialogActions>
      </Dialog>

      {previewFile && (
        <DocumentPreviewDialog
          open={!!previewFile}
          onClose={() => {
            URL.revokeObjectURL(previewFile.url)
            setPreviewFile(null)
          }}
          fileName={previewFile.name}
          fileUrl={previewFile.url}
        />
      )}
    </>
  )
}

// Staged file size formatter helper
const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default ConvertToProjectDialog
