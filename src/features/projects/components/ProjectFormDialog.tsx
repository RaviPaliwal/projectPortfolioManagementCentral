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
  Paper,
  Chip,
  useTheme,
  Stack,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TimelineIcon from '@mui/icons-material/Timeline'
import GppGoodIcon from '@mui/icons-material/GppGood'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import type { ProjectModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { fontSizes } from '@/styles'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { DocumentPreviewDialog, Button } from '@/components/common'

import { BUSINESS_UNITS } from '@/constants/businessUnits'

import { currencyFormatter } from '@/utils/formatters'
import { CURRENCY_DISPLAY } from '@/constants/currency'

const defaultProjectForm: Partial<ProjectModel> = {
  pm_projectname: '',
  pm_projectmanager: '',
  pm_projectsponsor: '',
  pm_projectphase: '1',
  pm_ragstatus: '1',
  pm_approvedbudget: 0,
  pm_actualcost: 0,
  pm_plannedstartdate: '',
  pm_plannedenddate: '',
  pm_actualstartdate: '',
  pm_actualenddate: '',
  pm_businessunit: '',
  pm_projectpriority: 2,
  pm_percentcomplete: 0,
  pm_costragstatus: '0',
  pm_scheduleragstatus: '0',
  pm_benefitsragstatus: '0',
  _pm_portfolio_value: '',
  _pm_programme_value: '',
}

interface ProjectFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (project: Partial<ProjectModel>, files: File[]) => Promise<void>
  isSaving: boolean
  initialData?: Partial<ProjectModel> | null
  portfolios: { id: string; name: string }[]
  programmes: { id: string; name: string; portfolioId?: string; budget?: number; startDate?: string; endDate?: string; availableBudget?: number }[]
}

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
  open,
  onClose,
  onSave,
  isSaving,
  initialData,
  portfolios,
  programmes,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users, currentUserPersona } = useUser()
  const isEdit = !!initialData?.pm_projectid
  const [form, setForm] = useState<Partial<ProjectModel>>(defaultProjectForm)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null)

  // ── Programme budget & date validation ────────────────────────────────
  const selectedProgramme = useMemo(() => {
    if (!form._pm_programme_value) return null
    return programmes.find((p) => p.id === form._pm_programme_value) || null
  }, [form._pm_programme_value, programmes])

  const programmeBudgetInfo = useMemo(() => {
    if (!selectedProgramme) return null
    const progBudget = selectedProgramme.budget ?? 0
    let available = selectedProgramme.availableBudget ?? progBudget
    // In edit mode, add back the current project's own budget since it was
    // subtracted from availableBudget in the parent's calculation and shouldn't
    // be counted against itself.
    if (initialData?.pm_projectid && (initialData.pm_approvedbudget ?? 0) > 0) {
      available += initialData.pm_approvedbudget ?? 0
    }
    return { programmeBudget: progBudget, availableBudget: available }
  }, [selectedProgramme, initialData])

  const dateErrors = useMemo(() => {
    const errors: { startDate?: string; endDate?: string } = {}
    if (!selectedProgramme) return errors
    const { startDate: progStart, endDate: progEnd } = selectedProgramme
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
  const hasBudgetError = programmeBudgetInfo !== null && (form.pm_approvedbudget ?? 0) > programmeBudgetInfo.availableBudget
  const canSave = !!form.pm_projectname?.trim() && !hasDateErrors && !hasBudgetError

  // ── Filter programmes by selected portfolio ────────────────────────────
  const filteredProgrammes = programmes.filter(p => 
    !form._pm_portfolio_value || p.portfolioId === form._pm_portfolio_value
  )

  useEffect(() => {
    if (open) {
      setStagedFiles([])
      if (initialData) {
        setForm({
          ...defaultProjectForm,
          ...initialData,
          pm_projectmanager: initialData._pm_projectmanager_value || '',
          pm_projectphase: initialData.pm_projectphase?.toString() || '1',
          pm_ragstatus: initialData.pm_ragstatus?.toString() || '1',
          pm_costragstatus: initialData.pm_costragstatus?.toString() || '0',
          pm_scheduleragstatus: initialData.pm_scheduleragstatus?.toString() || '0',
          pm_benefitsragstatus: initialData.pm_benefitsragstatus?.toString() || '0',
          pm_plannedstartdate: initialData.pm_plannedstartdate?.split('T')[0] || '',
          pm_plannedenddate: initialData.pm_plannedenddate?.split('T')[0] || '',
          pm_actualstartdate: initialData.pm_actualstartdate?.split('T')[0] || '',
          pm_actualenddate: initialData.pm_actualenddate?.split('T')[0] || '',
        })
      } else {
        setForm(defaultProjectForm)
      }
    }
  }, [open, initialData])

  const handleSave = () => {
    onSave(form, stagedFiles)
  }

  const handlePreviewStaged = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewFile({ name: file.name, url })
  }

  return (
    <Dialog open={open} onClose={() => !isSaving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        {initialData?.pm_projectid ? 'Edit Project' : 'Create New Project'}
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {initialData?.pm_projectid 
            ? 'Update project details, timelines, and risk indicators.'
            : 'Register a new project and associate it with a portfolio and programme.'}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Section: Basic Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Basic Information
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Project name *" size="small" value={form.pm_projectname ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectname: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="project-portfolio-label">Portfolio</InputLabel>
              <Select
                id="project-portfolio-select"
                labelId="project-portfolio-label"
                value={form._pm_portfolio_value || ''}
                label="Portfolio"
                disabled={isEdit}
                onChange={(e) => setForm((p) => ({ ...p, _pm_portfolio_value: e.target.value, _pm_programme_value: '' }))}
              >
                <MenuItem value="">None</MenuItem>
                {portfolios.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="project-programme-label">Programme</InputLabel>
              <Select
                id="project-programme-select"
                labelId="project-programme-label"
                value={form._pm_programme_value || ''}
                label="Programme"
                onChange={(e) => setForm((p) => ({ ...p, _pm_programme_value: e.target.value }))}
                disabled={isEdit || !form._pm_portfolio_value}
              >
                <MenuItem value="">None</MenuItem>
                {filteredProgrammes.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="project-manager-label">Project manager</InputLabel>
              <Select
                id="project-manager-select"
                labelId="project-manager-label"
                value={form.pm_projectmanager || ''}
                label="Project manager"
                onChange={(e) => {
                  setForm((p) => ({ ...p, pm_projectmanager: e.target.value }))
                }}
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
              label="Sponsor"
              size="small"
              value={form.pm_projectsponsor ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectsponsor: e.target.value }))}
              disabled={isEdit}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="project-businessunit-label">Business Unit</InputLabel>
              <Select
                id="project-businessunit-select"
                labelId="project-businessunit-label"
                value={form.pm_businessunit || ''}
                label="Business Unit"
                onChange={(e) => setForm((p) => ({ ...p, pm_businessunit: e.target.value }))}
              >
                <MenuItem value="">— Select —</MenuItem>
                {BUSINESS_UNITS.map(bu => <MenuItem key={bu} value={bu}>{bu}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="project-priority-label">Priority</InputLabel>
              <Select
                id="project-priority-select"
                labelId="project-priority-label"
                value={form.pm_projectpriority ?? 2}
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

        {/* Section: Status & Risk */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <GppGoodIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Status & Risk
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Overall RAG" size="small" value={form.pm_ragstatus ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_ragstatus: e.target.value }))}>
              <MenuItem value="1">Low — On Track</MenuItem>
              <MenuItem value="0">Medium — At Risk</MenuItem>
              <MenuItem value="2">High — Critical</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Phase" size="small" value={form.pm_projectphase ?? '1'}
              disabled={isEdit}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectphase: e.target.value }))}>
              <MenuItem value="1">Planning</MenuItem>
              <MenuItem value="0">Execution</MenuItem>
              <MenuItem value="2">Closure</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Cost RAG" size="small" value={form.pm_costragstatus ?? '0'}
              onChange={(e) => setForm((p) => ({ ...p, pm_costragstatus: e.target.value }))}>
              <MenuItem value="0">Low</MenuItem>
              <MenuItem value="1">Medium</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Schedule RAG" size="small" value={form.pm_scheduleragstatus ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_scheduleragstatus: e.target.value }))}>
              <MenuItem value="1">Low</MenuItem>
              <MenuItem value="0">Medium</MenuItem>
              <MenuItem value="2">High</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Benefits RAG" size="small" value={form.pm_benefitsragstatus ?? '0'}
              onChange={(e) => setForm((p) => ({ ...p, pm_benefitsragstatus: e.target.value }))}>
              <MenuItem value="0">Low</MenuItem>
              <MenuItem value="1">Medium</MenuItem>
              <MenuItem value="2">Not Set</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Percent Complete: {form.pm_percentcomplete}%
            </Typography>
            <Slider
              value={form.pm_percentcomplete ?? 0}
              onChange={(_, v) => setForm(p => ({ ...p, pm_percentcomplete: v as number }))}
              valueLabelDisplay="auto"
              step={5}
              min={0}
              max={100}
            />
          </Grid>
        </Grid>

        {/* Section: Financials */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AttachMoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Financials
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="number" label={`Approved Budget (${CURRENCY_DISPLAY})`} size="small" value={form.pm_approvedbudget ?? 0}
              onChange={(e) => setForm((p) => ({ ...p, pm_approvedbudget: Number(e.target.value) }))}
              error={hasBudgetError}
              disabled={isEdit && currentUserPersona !== 'SystemAdministrator'}
              helperText={hasBudgetError ? `Exceeds programme budget by ${currencyFormatter.format((form.pm_approvedbudget ?? 0) - programmeBudgetInfo!.availableBudget)}` : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="number" label={`Actual Cost (${CURRENCY_DISPLAY})`} size="small" value={form.pm_actualcost ?? 0}
              disabled
              slotProps={{ input: { readOnly: true } }}
              helperText="Aggregated sum of all cashflows for this project"
            />
          </Grid>
        </Grid>

        {programmeBudgetInfo && !isEdit && (() => {
          const allocatedAmount = programmeBudgetInfo.programmeBudget - programmeBudgetInfo.availableBudget
          const allocationPercentage = programmeBudgetInfo.programmeBudget > 0
            ? Math.min(100, (allocatedAmount / programmeBudgetInfo.programmeBudget) * 100)
            : 0

          return (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2.5, 
                mb: 3, 
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px'
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccountBalanceWalletIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: 0.2 }}>
                  Programme Budget Allocation
                </Typography>
              </Box>

              {/* Data Rows */}
              <Stack component="div" spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Total Programme Budget
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.primary' }}>
                    {currencyFormatter.format(programmeBudgetInfo.programmeBudget)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Already Allocated to Other Projects
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'warning.main' }}>
                    {currencyFormatter.format(allocatedAmount)}
                  </Typography>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ py: 0.5 }}>
                  <Box sx={{ width: '100%', height: 6, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ width: `${allocationPercentage}%`, height: '100%', bgcolor: 'warning.main', borderRadius: 3 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {allocationPercentage > 0 && allocationPercentage < 0.01
                        ? '< 0.01%'
                        : `${allocationPercentage.toFixed(1)}%`}{' '}
                      Allocated
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Remaining for This Project
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'monospace', color: programmeBudgetInfo.availableBudget <= 0 ? 'error.main' : 'success.main' }}>
                    {currencyFormatter.format(programmeBudgetInfo.availableBudget)}
                  </Typography>
                </Box>

                {programmeBudgetInfo.availableBudget <= 0 && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
                    ⚠️ No remaining budget available in this programme.
                  </Typography>
                )}
              </Stack>
            </Paper>
          )
        })()}

        {hasBudgetError && (
          <Box 
            sx={{ 
              mb: 3, 
              p: 2, 
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
              border: '1px solid', 
              borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5 
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 20, color: 'error.main', flexShrink: 0 }} />
            <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
              Approved budget exceeds programme budget by {currencyFormatter.format((form.pm_approvedbudget ?? 0) - programmeBudgetInfo!.availableBudget)}.
            </Typography>
          </Box>
        )}

        {/* Section: Timeline */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Timeline
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        {selectedProgramme && selectedProgramme.startDate && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TimelineIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="caption" color="text.secondary">
              Programme date range:{' '}
              <strong>{new Date(selectedProgramme.startDate).toLocaleDateString()}</strong>
              {' — '}
              <strong>{selectedProgramme.endDate ? new Date(selectedProgramme.endDate).toLocaleDateString() : 'No end date'}</strong>
              {' · Project must be within this range'}
            </Typography>
          </Paper>
        )}
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Planned Start"
              value={form.pm_plannedstartdate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_plannedstartdate: e.target.value }))}
              error={!!dateErrors.startDate}
              helperText={dateErrors.startDate || ''}
              disabled={Number(form.pm_projectphase) !== 1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Planned End"
              value={form.pm_plannedenddate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_plannedenddate: e.target.value }))}
              error={!!dateErrors.endDate}
              helperText={dateErrors.endDate || ''}
              disabled={Number(form.pm_projectphase) !== 1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Actual Start"
              value={form.pm_actualstartdate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_actualstartdate: e.target.value }))}
              disabled={Number(form.pm_projectphase) === 1}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Actual End"
              value={form.pm_actualenddate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_actualenddate: e.target.value }))}
              disabled={Number(form.pm_projectphase) === 1}
            />
          </Grid>
        </Grid>

        {/* Section: Supporting Documents */}
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
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving || !canSave} sx={{ px: 4 }}>
          {isSaving ? 'Saving...' : initialData?.pm_projectid ? 'Save Changes' : 'Create Project'}
        </Button>
      </DialogActions>

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
    </Dialog>
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


