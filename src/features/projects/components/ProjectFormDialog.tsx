import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Button,
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
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TimelineIcon from '@mui/icons-material/Timeline'
import GppGoodIcon from '@mui/icons-material/GppGood'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import type { ProjectModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { fontSizes } from '@/styles'
import { DocumentPreviewDialog } from '@/components/common'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const defaultProjectForm: Partial<ProjectModel> = {
  pm_projectname: '',
  pm_projectcode: '',
  pm_projectmanager: '',
  pm_projectsponsor: '',
  pm_projectphase: '1',
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
  programmes: { id: string; name: string; portfolioId?: string }[]
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
  const { users } = useUser()
  const [form, setForm] = useState<Partial<ProjectModel>>(defaultProjectForm)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null)

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

  const filteredProgrammes = programmes.filter(p => 
    !form._pm_portfolio_value || p.portfolioId === form._pm_portfolio_value
  )

  return (
    <Dialog open={open} onClose={() => !isSaving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initialData?.pm_projectid ? 'Edit Project' : 'Create New Project'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {initialData?.pm_projectid 
            ? 'Update project details, timelines, and health indicators.'
            : 'Register a new project and associate it with a portfolio and programme.'}
        </Typography>

        {/* Section: Basic Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Basic Information
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Project name *" size="small" value={form.pm_projectname ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectname: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Project code" size="small" value={form.pm_projectcode ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectcode: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Portfolio</InputLabel>
              <Select
                value={form._pm_portfolio_value || ''}
                label="Portfolio"
                onChange={(e) => setForm((p) => ({ ...p, _pm_portfolio_value: e.target.value, _pm_programme_value: '' }))}
              >
                <MenuItem value="">None</MenuItem>
                {portfolios.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Programme</InputLabel>
              <Select
                value={form._pm_programme_value || ''}
                label="Programme"
                onChange={(e) => setForm((p) => ({ ...p, _pm_programme_value: e.target.value }))}
                disabled={!form._pm_portfolio_value}
              >
                <MenuItem value="">None</MenuItem>
                {filteredProgrammes.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Project manager</InputLabel>
              <Select
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
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Business Unit" size="small" value={form.pm_businessunit ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_businessunit: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={form.pm_projectpriority ?? 2}
                label="Priority"
                onChange={(e) => setForm((p) => ({ ...p, pm_projectpriority: e.target.value as number }))}
              >
                <MenuItem value={1}>1 - High</MenuItem>
                <MenuItem value={2}>2 - Medium</MenuItem>
                <MenuItem value={3}>3 - Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Section: Status & Health */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <GppGoodIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Status & Health
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Overall RAG" size="small" value={form.pm_ragstatus ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_ragstatus: e.target.value }))}>
              <MenuItem value="1">Green — On Track</MenuItem>
              <MenuItem value="0">Amber — At Risk</MenuItem>
              <MenuItem value="2">Red — Critical</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Phase" size="small" value={form.pm_projectphase ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectphase: e.target.value }))}>
              <MenuItem value="1">Planning</MenuItem>
              <MenuItem value="0">Execution</MenuItem>
              <MenuItem value="2">Closure</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Cost RAG" size="small" value={form.pm_costragstatus ?? '0'}
              onChange={(e) => setForm((p) => ({ ...p, pm_costragstatus: e.target.value }))}>
              <MenuItem value="0">Green</MenuItem>
              <MenuItem value="1">Amber</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Schedule RAG" size="small" value={form.pm_scheduleragstatus ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_scheduleragstatus: e.target.value }))}>
              <MenuItem value="1">Green</MenuItem>
              <MenuItem value="0">Amber</MenuItem>
              <MenuItem value="2">Red</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Benefits RAG" size="small" value={form.pm_benefitsragstatus ?? '0'}
              onChange={(e) => setForm((p) => ({ ...p, pm_benefitsragstatus: e.target.value }))}>
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
            <TextField fullWidth type="number" label="Approved Budget (EUR)" size="small" value={form.pm_approvedbudgeteur ?? 0}
              onChange={(e) => setForm((p) => ({ ...p, pm_approvedbudgeteur: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="number" label="Actual Cost (EUR)" size="small" value={form.pm_actualcosteur ?? 0}
              onChange={(e) => setForm((p) => ({ ...p, pm_actualcosteur: Number(e.target.value) }))} />
          </Grid>
        </Grid>

        {/* Section: Timeline */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Timeline
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Planned Start"
              value={form.pm_plannedstartdate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_plannedstartdate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Planned End"
              value={form.pm_plannedenddate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_plannedenddate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Actual Start"
              value={form.pm_actualstartdate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_actualstartdate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" size="small" slotProps={{ inputLabel: { shrink: true } }} label="Actual End"
              value={form.pm_actualenddate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_actualenddate: e.target.value }))} />
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

        <Box sx={{ p: 2.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, textAlign: 'center', bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<AttachFileIcon />}
            sx={{ borderRadius: 1.5, mb: stagedFiles.length > 0 ? 2 : 0 }}
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
                  sx={{ borderRadius: 1.5, fontWeight: 600, cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving || !form.pm_projectname} sx={{ px: 4 }}>
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


