import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@/context/UserContext'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Alert,
  Autocomplete,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import BugReportIcon from '@mui/icons-material/BugReport'
import { fontSizes } from '@/styles'
import type { IssueModel } from '@/types/dataverse'

// ─── Constants ─────────────────────────────────────────────────────────────

const ISSUE_CATEGORIES = [
  { value: '0', label: 'Dependency' },
  { value: '1', label: 'Technical' },
]

const PRIORITY_LEVELS = [
  { value: '2', label: 'Medium' },
  { value: '0', label: 'High' },
  { value: '1', label: 'Critical' },
]

const IMPACT_LEVELS = [
  { value: '2', label: 'Minor' },
  { value: '0', label: 'Moderate' },
  { value: '1', label: 'Major' },
]

const RAG_OPTIONS = [
  { value: '1', label: 'Low — On Track' },
  { value: '0', label: 'Medium — At Risk' },
  { value: '2', label: 'High — Critical' },
]

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResourceOption {
  id: string
  name: string
}

export interface ProjectOption {
  id: string
  name: string
  code?: string
  programmeId?: string
  programmeName?: string
  portfolioName?: string
}

export interface ProgrammeOption {
  id: string
  name: string
}

export interface RiskOption {
  id: string
  title: string
  projectId?: string
}

export interface RegardingOption {
  id: string
  name: string
  type: 'pm_projects' | 'pm_programmes' | 'pm_portfolios'
  code?: string
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface IssueDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: IssueModel | null
  projects: ProjectOption[]
  programmes: ProgrammeOption[]
  portfolios?: any[]
  projectsLoading: boolean
  risks: RiskOption[]
  resources: ResourceOption[]
  resourcesLoading: boolean
  currentUserName: string
}

// ─── Component ─────────────────────────────────────────────────────────────

export const IssueDialog: React.FC<IssueDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  projects,
  programmes,
  portfolios,
  projectsLoading,
  risks,
  resources,
  resourcesLoading,
  currentUserName,
}) => {
  const isEdit = !!initialData
  const { currentUserPersona } = useUser()
  const isTeamMember = currentUserPersona === 'TeamMember'

  // ── Form State ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('2')
  const [impact, setImpact] = useState('2')
  const [rag, setRag] = useState('1')
  const [owner, setOwner] = useState('')
  const [raisedDate, setRaisedDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [reference, setReference] = useState('')
  const [linkedRisk, setLinkedRisk] = useState('')
  const [escalated, setEscalated] = useState(false)
  const [resolution, setResolution] = useState('')
  const [status, setStatus] = useState('0')

  // Pickers
  const [selectedRegarding, setSelectedRegarding] = useState<RegardingOption | null>(null)
  const [selectedRisk, setSelectedRisk] = useState<RiskOption | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<ResourceOption | null>(null)

  // Attachments
  const [attachments, setAttachments] = useState<File[]>([])

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Init / Reset ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return

    if (isEdit && initialData) {
      // Pre-populate from existing issue
      setTitle(initialData.pm_issuetitle || '')
      setCategory(String(initialData.pm_issuecategory ?? ''))
      setDescription(initialData.pm_issuedescription || '')
      setPriority(String(initialData.pm_prioritylevel ?? '2'))
      setImpact(String(initialData.pm_impactlevel ?? '2'))
      setRag(String(initialData.pm_ragstatus ?? '1'))
      setOwner(initialData.pm_issueowner || '')
      setRaisedDate(initialData.pm_dateraised?.split('T')[0] || '')
      setTargetDate(initialData.pm_targetresolutiondate?.split('T')[0] || '')
      setActualDate(initialData.pm_actualresolutiondate?.split('T')[0] || '')
      setReference(initialData.pm_issuereference || '')
      setLinkedRisk(initialData.pm_linkedrisk || '')
      setEscalated(!!initialData.pm_escalationstatus)
      setResolution(initialData.pm_resolutiondetails || '')
      setStatus(String(initialData.pm_issuestatus ?? '0'))

      // Pre-select regarding from lookup
      if (initialData._pm_regardingid_value && initialData.pm_regardingidtype) {
        const type = initialData.pm_regardingidtype;
        const id = initialData._pm_regardingid_value;
        if (type === 'pm_projects') {
          const proj = projects.find(p => p.id === id)
          if (proj) setSelectedRegarding({ id: proj.id, name: proj.name, type: 'pm_projects', code: proj.code })
        } else if (type === 'pm_programmes') {
          const prog = programmes.find(p => p.id === id)
          if (prog) setSelectedRegarding({ id: prog.id, name: prog.name, type: 'pm_programmes' })
        } else if (type === 'pm_portfolios') {
          const port = (portfolios || []).find(p => p.id === id)
          if (port) setSelectedRegarding({ id: port.id, name: port.name, type: 'pm_portfolios' })
        }
      } else {
        setSelectedRegarding(null)
      }
      if (initialData._pm_issueowner_value) {
        const res = resources.find(r => r.id === initialData._pm_issueowner_value) || null
        setSelectedOwner(res)
      } else {
        setSelectedOwner(null)
      }
    } else {
      // Fresh create form
      const today = new Date().toISOString().split('T')[0]
      setTitle('')
      setCategory('')
      setDescription('')
      setPriority('2')
      setImpact('2')
      setRag('1')
      setOwner('')
      setRaisedDate(today)
      setTargetDate('')
      setActualDate('')
      setReference('')
      setLinkedRisk('')
      setEscalated(false)
      setResolution('')
      setStatus('0')
      setSelectedRegarding(null)
      setSelectedRisk(null)
      setSelectedOwner(null)
    }
    setAttachments([])
    setError(null)
    setErrors({})
    setIsSubmitting(false)
  }, [open, isEdit, initialData, projects, risks, resources, currentUserName])

  // ── Filter risks linked to selected project ─────────────────────────────
  const filteredRisks = useMemo(() => {
    if (!selectedRegarding || selectedRegarding.type !== 'pm_projects') return []
    const projectIdLower = selectedRegarding.id.toLowerCase()
    return risks.filter(r => r.projectId?.toLowerCase() === projectIdLower)
  }, [risks, selectedRegarding])

  // ── Reset selected risk when regarding changes ───────────────────────────
  useEffect(() => {
    if (!isEdit) {
      setSelectedRisk(null)
      setLinkedRisk('')
    }
  }, [selectedRegarding, isEdit])

  // ── Build options list for polymorphic regarding ─────────────────────────
  const regardingOptions = useMemo(() => {
    const opts: RegardingOption[] = []
    const projList = projects || []
    const progList = programmes || []
    const portList = portfolios || []

    projList.forEach(p => {
      opts.push({ id: p.id, name: p.name, type: 'pm_projects', code: p.code })
    })
    progList.forEach(pr => {
      opts.push({ id: pr.id, name: pr.name, type: 'pm_programmes' })
    })
    portList.forEach(pf => {
      opts.push({ id: pf.id, name: pf.name, type: 'pm_portfolios' })
    })
    return opts
  }, [projects, programmes, portfolios])

  // ── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (isEdit && isTeamMember) return true
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Issue title is required'
    if (!category) newErrors.category = 'Please select a category'
    if (!description.trim()) newErrors.description = 'Description is required'
    if (!selectedOwner) newErrors.owner = 'Issue owner is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    setError(null)
    try {
      // Normalize dates to yyyy-MM-dd (strip ISO timestamps)
      const fmt = (d: string) => d ? d.split('T')[0] : ''

      const payload: Record<string, any> = isEdit && isTeamMember
        ? {
            pm_escalationstatus: escalated,
            pm_resolutiondetails: resolution,
            pm_issuestatus: status,
          }
        : {
            pm_issuetitle: title.trim(),
            pm_issuecategory: category,
            pm_issuedescription: description.trim(),
            pm_prioritylevel: priority,
            pm_impactlevel: impact,
            pm_ragstatus: rag,
            pm_issueowner: selectedOwner?.name || '',
            pm_dateraised: fmt(raisedDate),
            pm_targetresolutiondate: fmt(targetDate),
            pm_issuereference: reference,
            pm_linkedrisk: linkedRisk,
            pm_escalationstatus: escalated,
            pm_resolutiondetails: resolution,
            pm_issuestatus: status,
            _pm_regardingid_value: selectedRegarding?.id || '',
            pm_regardingidtype: selectedRegarding?.type || '',
            _pm_risk_value: selectedRisk?.id || '',
            _pm_issueowner_value: selectedOwner?.id || '',
          }
      if (!isTeamMember && actualDate) payload.pm_actualresolutiondate = fmt(actualDate)
      await onSave(payload)
      onClose()
    } catch (err) {
      setError('Failed to save issue. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearError = (field: string) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isEdit && isTeamMember ? "sm" : "md"}
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2 },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BugReportIcon sx={{ color: '#0ea5e9', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {isEdit ? 'Edit Issue' : 'Log New Issue'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, lineHeight: 1.1 }}>
              {isEdit ? 'Update issue details below' : 'Report a problem or issue — all fields marked * are required'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2.5} sx={{ mt: 2 }}>
          {isEdit && isTeamMember ? (
            <>
              {/* Status */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <MenuItem value="0">Open</MenuItem>
                  <MenuItem value="1">In Progress</MenuItem>
                  <MenuItem value="2">Resolved</MenuItem>
                  <MenuItem value="3">Closed</MenuItem>
                </TextField>
              </Grid>

              {/* Escalation Status */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Escalation Status</InputLabel>
                  <Select
                    value={escalated ? '1' : '0'}
                    label="Escalation Status"
                    onChange={e => setEscalated(e.target.value === '1')}
                  >
                    <MenuItem value="0">Not Escalated</MenuItem>
                    <MenuItem value="1">Escalated</MenuItem>
                  </Select>
                  <FormHelperText>Mark as escalated if this issue requires immediate management attention</FormHelperText>
                </FormControl>
              </Grid>

              {/* Resolution Details */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Resolution Details / Comments"
                  placeholder="Describe status updates, comments, or resolution progress..."
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                />
              </Grid>
            </>
          ) : (
            <>
              {/* Title */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Issue Title *"
                  placeholder="Give your issue a clear, concise title"
                  value={title}
                  onChange={e => { setTitle(e.target.value); clearError('title') }}
                  error={!!errors.title}
                  helperText={errors.title}
                />
              </Grid>

              {/* Category & Status (edit only) */}
              <Grid size={{ xs: 12, sm: isEdit ? 4 : 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Category *"
                  value={category}
                  onChange={e => { setCategory(e.target.value); clearError('category') }}
                  error={!!errors.category}
                  helperText={errors.category}
                >
                  <MenuItem value="">— Select Category —</MenuItem>
                  {ISSUE_CATEGORIES.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {isEdit && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <MenuItem value="0">Open</MenuItem>
                    <MenuItem value="1">In Progress</MenuItem>
                    <MenuItem value="2">Resolved</MenuItem>
                    <MenuItem value="3">Closed</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: isEdit ? 4 : 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Priority"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  {PRIORITY_LEVELS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* RAG Status & Impact */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="RAG Status"
                  value={rag}
                  onChange={e => setRag(e.target.value)}
                >
                  {RAG_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Impact Level"
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                >
                  {IMPACT_LEVELS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description *"
                  placeholder="Describe the issue in detail. What happened? What is the impact? Any immediate actions taken?"
                  value={description}
                  onChange={e => { setDescription(e.target.value); clearError('description') }}
                  error={!!errors.description}
                  helperText={errors.description}
                />
              </Grid>

              {/* Regarding (Polymorphic Lookup) */}
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={regardingOptions}
                  loading={projectsLoading}
                  value={selectedRegarding}
                  onChange={(_, newVal) => setSelectedRegarding(newVal)}
                  getOptionLabel={opt => `${opt.type === 'pm_projects' ? '[Project]' : opt.type === 'pm_programmes' ? '[Programme]' : '[Portfolio]'} ${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id && opt.type === val.type}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Associated Entity *"
                      placeholder="Search projects, programmes, or portfolios…"
                      helperText="Polymorphic lookup — select a project, programme, or portfolio to link this issue to"
                    />
                  )}
                  renderOption={(props, opt) => {
                    const isProj = opt.type === 'pm_projects'
                    const isProg = opt.type === 'pm_programmes'
                    const label = isProj ? 'Project' : isProg ? 'Programme' : 'Portfolio'
                    const color = isProj ? '#2e7d32' : isProg ? '#e65100' : '#1976d2'
                    return (
                      <li {...props} key={`${opt.type}-${opt.id}`}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            <span style={{ color: color, marginRight: 6 }}>
                              {label}
                            </span>
                            {opt.name}
                          </Typography>
                          {opt.code && (
                            <Typography variant="caption" color="text.secondary">
                              Code: {opt.code}
                            </Typography>
                          )}
                        </Box>
                      </li>
                    )
                  }}
                  noOptionsText="No projects, programmes, or portfolios found"
                />
              </Grid>

              {/* Owner & Reference */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={resources}
                  loading={resourcesLoading}
                  value={selectedOwner}
                  onChange={(_, newVal) => {
                    setSelectedOwner(newVal)
                    setOwner(newVal?.name || '')
                    if (newVal) clearError('owner')
                  }}
                  getOptionLabel={opt => opt.name}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Issue Owner *"
                      placeholder="Search for a resource…"
                      error={!!errors.owner}
                      helperText={errors.owner || 'Lookup to resource table'}
                    />
                  )}
                  noOptionsText="No resources found"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Issue Reference"
                  placeholder="e.g., ISS-2024-001"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  helperText="Optional — for tracking purposes"
                />
              </Grid>

              {/* Dates */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Raised Date"
                  value={raisedDate}
                  onChange={e => setRaisedDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Target Resolution Date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Actual Resolution Date"
                  value={actualDate}
                  onChange={e => setActualDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Set when issue is resolved"
                />
              </Grid>

              {/* Escalation & Linked Risk */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Escalation Status</InputLabel>
                  <Select
                    value={escalated ? '1' : '0'}
                    label="Escalation Status"
                    onChange={e => setEscalated(e.target.value === '1')}
                  >
                    <MenuItem value="0">Not Escalated</MenuItem>
                    <MenuItem value="1">Escalated</MenuItem>
                  </Select>
                  <FormHelperText>Mark as escalated if this issue requires immediate management attention</FormHelperText>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={filteredRisks}
                  value={selectedRisk}
                  onChange={(_, newVal) => {
                    setSelectedRisk(newVal)
                    setLinkedRisk(newVal?.title || '')
                  }}
                  getOptionLabel={opt => opt.title}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  disabled={!(selectedRegarding && selectedRegarding.type === 'pm_projects')}
                  renderInput={params => {
                    const isProj = selectedRegarding && selectedRegarding.type === 'pm_projects'
                    return (
                      <TextField
                        {...params}
                        label="Linked Risk"
                        placeholder={isProj ? 'Search risks linked to this project…' : 'Select a project first'}
                        helperText={
                          !isProj
                            ? 'Select a project regarding to see its linked risks'
                            : filteredRisks.length === 0
                              ? 'No risks linked to this project'
                              : 'Optional — link this issue to an existing risk'
                        }
                      />
                    )
                  }}
                  noOptionsText="No risks found for this project"
                />
              </Grid>

              {/* Resolution Details */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Resolution Details"
                  placeholder="If known, describe how this issue could be resolved"
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                />
              </Grid>

              {/* Attachments */}
              <Grid size={{ xs: 12 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                    Attachments (optional)
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => document.getElementById('issue-file-upload')?.click()}
                  >
                    <input
                      id="issue-file-upload"
                      type="file"
                      multiple
                      hidden
                      onChange={handleFileChange}
                    />
                    <AttachFileIcon sx={{ fontSize: 24, color: 'text.disabled', mb: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      Click to attach photos, screenshots, or documents
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Supports images, PDFs, and common document formats
                    </Typography>
                  </Box>
                  {attachments.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                      {attachments.map((file, idx) => (
                        <Chip
                          key={idx}
                          label={file.name}
                          size="small"
                          onDelete={() => removeAttachment(idx)}
                          variant="outlined"
                          sx={{ borderRadius: 1, fontSize: fontSizes.xs }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={isSubmitting}
          sx={{ borderRadius: 1.5 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? undefined : <BugReportIcon />}
          sx={{ borderRadius: 1.5, fontWeight: 700 }}
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Issue' : 'Submit Issue'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default IssueDialog
