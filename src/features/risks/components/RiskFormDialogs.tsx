import React, { useState, useEffect, useMemo } from 'react'
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
  Grid,
  Autocomplete,
  CircularProgress,
  Card,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { RiskModel } from '@/types/dataverse'
import { Pm_programmesService, Pm_portfoliosService } from '@/generated'
import { unwrapList } from '@/services/common'
import { useUser } from '@/context/UserContext'
import { formatDate } from '@/utils/formatters'

interface RiskDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: RiskModel | null
}

interface RegardingOption {
  id: string
  name: string
  type: 'pm_projects' | 'pm_programmes' | 'pm_portfolios'
  code?: string
}

interface ResourceOption {
  id: string
  name: string
}

export const RiskDialog: React.FC<RiskDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const { currentUserPersona } = useUser()
  const isTeamMember = currentUserPersona === 'TeamMember'
  const isEdit = !!initialData

  // State options
  const [resources, setResources] = useState<ResourceOption[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [programmes, setProgrammes] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Form Fields State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [rag, setRag] = useState('1')
  const [status, setStatus] = useState('1')
  const [selectedOwner, setSelectedOwner] = useState<ResourceOption | null>(null)
  const [identifiedDate, setIdentifiedDate] = useState('')
  const [targetCloseDate, setTargetCloseDate] = useState('')
  const [cause, setCause] = useState('')
  const [effect, setEffect] = useState('')
  const [description, setDescription] = useState('')
  const [inherentProbability, setInherentProbability] = useState('')
  const [inherentImpact, setInherentImpact] = useState('')
  const [residualProbability, setResidualProbability] = useState('')
  const [residualImpact, setResidualImpact] = useState('')
  const [responseStrategy, setResponseStrategy] = useState('')
  const [selectedRegarding, setSelectedRegarding] = useState<RegardingOption | null>(null)

  const [saving, setSaving] = useState(false)
  const [mitigationActions, setMitigationActions] = useState<any[]>([])
  const [mitigationLoading, setMitigationLoading] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)

  // Load mitigation actions if editing
  useEffect(() => {
    if (open && initialData?.pm_riskid) {
      setMitigationLoading(true)
      import('@/services').then(({ fetchMitigationActions }) => {
        fetchMitigationActions(initialData.pm_riskid!)
          .then(actions => setMitigationActions(actions))
          .catch(() => setMitigationActions([]))
          .finally(() => setMitigationLoading(false))
      })
    } else {
      setMitigationActions([])
    }
  }, [open, initialData])

  const handleSaveMitigationAction = async (data: Record<string, any>) => {
    if (!initialData?.pm_riskid) return
    try {
      const { Pm_riskmitigationactionsService } = await import('@/generated')
      const payload: Record<string, any> = {
        pm_actiontitle: data.pm_actiontitle,
        pm_actiondescription: data.pm_actiondescription,
        pm_notes: data.pm_notes,
        pm_status: Number(data.pm_actionstatus),
        'pm_risk@odata.bind': `/pm_risks(${initialData.pm_riskid})`,
      }
      if (data.pm_duedate) {
        payload.pm_duedate = data.pm_duedate
      }
      if (data.ownerid) {
        payload['ownerid@odata.bind'] = `/systemusers(${data.ownerid})`
      }
      await Pm_riskmitigationactionsService.create(payload as any)
      
      // Reload actions
      setMitigationLoading(true)
      const { fetchMitigationActions } = await import('@/services')
      const actions = await fetchMitigationActions(initialData.pm_riskid)
      setMitigationActions(actions)
    } catch (err) {
      console.error('[RiskDialog] Failed to save mitigation action:', err)
    } finally {
      setMitigationLoading(false)
    }
  }

  // Load lookup options
  useEffect(() => {
    if (open) {
      setLoadingOptions(true)
      Promise.all([
        import('@/services').then(m => m.fetchResources()),
        import('@/services').then(m => m.fetchProjectsFull()),
        Pm_programmesService.getAll({ filter: 'statecode eq 0', select: ['pm_programmeid', 'pm_programmename'], top: 500 }),
        Pm_portfoliosService.getAll({ filter: 'statecode eq 0', select: ['pm_portfolioid', 'pm_portfolioname'], top: 500 }),
      ]).then(([resList, projList, progRes, portRes]) => {
        setResources(resList.map(r => ({ id: r.pm_resourceid || '', name: r.pm_fullname || '' })).filter(r => r.id))
        setProjects(projList.map(p => ({ id: p.pm_projectid || '', name: p.pm_projectname || '', code: (p as any).pm_projectcode })))
        setProgrammes(unwrapList<any>(progRes).map(p => ({ id: p.pm_programmeid || '', name: p.pm_programmename || '' })))
        setPortfolios(unwrapList<any>(portRes).map(p => ({ id: p.pm_portfolioid || '', name: p.pm_portfolioname || '' })))
      }).catch(err => {
        console.error('[RiskDialog] Failed to load lookup options:', err)
      }).finally(() => {
        setLoadingOptions(false)
      })
    }
  }, [open])

  // Build regarding list
  const regardingOptions = useMemo(() => {
    const opts: RegardingOption[] = []
    projects.forEach(p => opts.push({ id: p.id, name: p.name, type: 'pm_projects', code: p.code }))
    programmes.forEach(p => opts.push({ id: p.id, name: p.name, type: 'pm_programmes' }))
    portfolios.forEach(p => opts.push({ id: p.id, name: p.name, type: 'pm_portfolios' }))
    return opts
  }, [projects, programmes, portfolios])

  // Prepopulate form on open / edit
  useEffect(() => {
    if (!open) return

    if (initialData) {
      setTitle(initialData.pm_risktitle || '')
      setCategory(initialData.pm_riskcategory !== undefined && initialData.pm_riskcategory !== null ? String(initialData.pm_riskcategory) : '')
      setRag(initialData.pm_ragstatus !== undefined && initialData.pm_ragstatus !== null ? String(initialData.pm_ragstatus) : '1')
      setStatus(initialData.pm_riskstatus !== undefined && initialData.pm_riskstatus !== null ? String(initialData.pm_riskstatus) : '1')
      setIdentifiedDate(initialData.pm_identifieddate?.split('T')[0] || '')
      setTargetCloseDate(initialData.pm_targetclosedate?.split('T')[0] || '')
      setCause(initialData.pm_riskcause || '')
      setEffect(initialData.pm_riskeffect || '')
      setDescription(initialData.pm_riskdescription || '')
      setInherentProbability(initialData.pm_inherentprobability !== undefined && initialData.pm_inherentprobability !== null ? String(initialData.pm_inherentprobability) : '')
      setInherentImpact(initialData.pm_inherentimpact !== undefined && initialData.pm_inherentimpact !== null ? String(initialData.pm_inherentimpact) : '')
      setResidualProbability(initialData.pm_residualprobability !== undefined && initialData.pm_residualprobability !== null ? String(initialData.pm_residualprobability) : '')
      setResidualImpact(initialData.pm_residualimpact !== undefined && initialData.pm_residualimpact !== null ? String(initialData.pm_residualimpact) : '')
      setResponseStrategy(initialData.pm_responsestrategy !== undefined && initialData.pm_responsestrategy !== null ? String(initialData.pm_responsestrategy) : '')

      if (initialData._pm_riskowner_value) {
        const owner = resources.find(r => r.id === initialData._pm_riskowner_value)
        setSelectedOwner(owner || { id: initialData._pm_riskowner_value, name: initialData.pm_riskownername || 'Unknown Owner' })
      } else {
        setSelectedOwner(null)
      }

      if (initialData._pm_regardingid_value && initialData.pm_regardingidtype) {
        const type = initialData.pm_regardingidtype
        const id = initialData._pm_regardingid_value
        const match = regardingOptions.find(o => o.id === id && o.type === type)
        setSelectedRegarding(match || { id, name: initialData.pm_projectname || 'Regarding Target', type } as RegardingOption)
      } else if (initialData._pm_project_value) {
        const id = initialData._pm_project_value
        const match = regardingOptions.find(o => o.id === id && o.type === 'pm_projects')
        setSelectedRegarding(match || { id, name: initialData.pm_projectname || 'Project', type: 'pm_projects' })
      } else {
        setSelectedRegarding(null)
      }
    } else {
      setTitle('')
      setCategory('')
      setRag('1')
      setStatus('1')
      setSelectedOwner(null)
      setIdentifiedDate('')
      setTargetCloseDate('')
      setCause('')
      setEffect('')
      setDescription('')
      setInherentProbability('')
      setInherentImpact('')
      setResidualProbability('')
      setResidualImpact('')
      setResponseStrategy('')
      setSelectedRegarding(null)
    }
  }, [open, initialData, resources, regardingOptions])

  const handleFormSubmit = async () => {
    if (!isEdit && !title.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, any> = isEdit && isTeamMember
        ? {
            pm_ragstatus: Number(rag),
            pm_targetclosedate: targetCloseDate || null,
            pm_riskcause: cause.trim() || null,
            pm_riskeffect: effect.trim() || null,
            pm_riskdescription: description.trim() || null,
            pm_residualprobability: residualProbability !== '' ? Number(residualProbability) : null,
            pm_residualimpact: residualImpact !== '' ? Number(residualImpact) : null,
            pm_responsestrategy: responseStrategy !== '' ? Number(responseStrategy) : null,
            pm_riskstatus: status !== '' ? Number(status) : null,
          }
        : {
            pm_risktitle: title.trim(),
            pm_riskcategory: category !== '' ? Number(category) : null,
            pm_ragstatus: Number(rag),
            _pm_riskowner_value: selectedOwner?.id || null,
            pm_identifieddate: identifiedDate || null,
            pm_targetclosedate: targetCloseDate || null,
            pm_riskcause: cause.trim() || null,
            pm_riskeffect: effect.trim() || null,
            pm_riskdescription: description.trim() || null,
            pm_inherentprobability: inherentProbability !== '' ? Number(inherentProbability) : null,
            pm_inherentimpact: inherentImpact !== '' ? Number(inherentImpact) : null,
            pm_residualprobability: residualProbability !== '' ? Number(residualProbability) : null,
            pm_residualimpact: residualImpact !== '' ? Number(residualImpact) : null,
            pm_responsestrategy: responseStrategy !== '' ? Number(responseStrategy) : null,
            _pm_regardingid_value: selectedRegarding?.id || null,
            pm_regardingidtype: selectedRegarding?.type || null,
            pm_riskstatus: status !== '' ? Number(status) : null,
          }
      await onSave(payload)
      onClose()
    } catch (err) {
      console.error('[RiskDialog] Failed to save risk:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEdit ? 'Edit Risk' : 'Add New Risk'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1.5 }}>
        {loadingOptions ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">Loading details...</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {isEdit && isTeamMember ? (
              <>
                {/* RAG Status */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="RAG Status"
                    value={rag}
                    onChange={e => setRag(e.target.value)}
                  >
                    <MenuItem value="1">Low — Low Risk</MenuItem>
                    <MenuItem value="0">Medium — Medium Risk</MenuItem>
                    <MenuItem value="2">High — High Risk</MenuItem>
                  </TextField>
                </Grid>

                {/* Risk Status */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Risk Status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <MenuItem value="1">Open</MenuItem>
                    <MenuItem value="0">In Mitigation</MenuItem>
                  </TextField>
                </Grid>

                {/* Target Close Date */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Target Close Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={targetCloseDate}
                    onChange={e => setTargetCloseDate(e.target.value)}
                  />
                </Grid>

                {/* Response Strategy */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Response Strategy"
                    value={responseStrategy}
                    onChange={e => setResponseStrategy(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="0">Mitigate</MenuItem>
                    <MenuItem value="1">Accept</MenuItem>
                  </TextField>
                </Grid>

                {/* Residual Probability */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Residual Probability"
                    value={residualProbability}
                    onChange={e => setResidualProbability(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="2">Rare</MenuItem>
                    <MenuItem value="0">Unlikely</MenuItem>
                    <MenuItem value="1">Possible</MenuItem>
                  </TextField>
                </Grid>

                {/* Residual Impact */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Residual Impact"
                    value={residualImpact}
                    onChange={e => setResidualImpact(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="1">Minor</MenuItem>
                    <MenuItem value="0">Moderate</MenuItem>
                    <MenuItem value="2">Major</MenuItem>
                  </TextField>
                </Grid>

                {/* Cause */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Cause"
                    value={cause}
                    onChange={e => setCause(e.target.value)}
                  />
                </Grid>

                {/* Effect */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Effect"
                    value={effect}
                    onChange={e => setEffect(e.target.value)}
                  />
                </Grid>

                {/* Description */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </Grid>
              </>
            ) : (
              <>
                {/* Risk Title */}
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Risk Title *"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </Grid>

                {/* Category */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="0">Resource</MenuItem>
                    <MenuItem value="1">Financial</MenuItem>
                    <MenuItem value="2">Legal</MenuItem>
                    <MenuItem value="3">Technical</MenuItem>
                    <MenuItem value="4">External</MenuItem>
                  </TextField>
                </Grid>

                {/* RAG Status */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="RAG Status"
                    value={rag}
                    onChange={e => setRag(e.target.value)}
                  >
                    <MenuItem value="1">Low — Low Risk</MenuItem>
                    <MenuItem value="0">Medium — Medium Risk</MenuItem>
                    <MenuItem value="2">High — High Risk</MenuItem>
                  </TextField>
                </Grid>

                {/* Risk Status */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Risk Status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <MenuItem value="1">Open</MenuItem>
                    <MenuItem value="0">In Mitigation</MenuItem>
                  </TextField>
                </Grid>

                {/* Risk Owner */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    options={resources}
                    value={selectedOwner}
                    onChange={(_, val) => setSelectedOwner(val)}
                    getOptionLabel={opt => opt.name}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    renderInput={params => <TextField {...params} label="Risk Owner" />}
                    noOptionsText="No resources found"
                  />
                </Grid>

                {/* Identified Date */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Identified Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={identifiedDate}
                    onChange={e => setIdentifiedDate(e.target.value)}
                  />
                </Grid>

                {/* Target Close Date */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Target Close Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={targetCloseDate}
                    onChange={e => setTargetCloseDate(e.target.value)}
                  />
                </Grid>

                {/* Cause */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Cause"
                    value={cause}
                    onChange={e => setCause(e.target.value)}
                  />
                </Grid>

                {/* Effect */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Effect"
                    value={effect}
                    onChange={e => setEffect(e.target.value)}
                  />
                </Grid>

                {/* Description */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </Grid>

                {/* Inherent Probability */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Inherent Probability"
                    value={inherentProbability}
                    onChange={e => setInherentProbability(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="3">Rare</MenuItem>
                    <MenuItem value="2">Unlikely</MenuItem>
                    <MenuItem value="0">Possible</MenuItem>
                    <MenuItem value="1">Likely</MenuItem>
                  </TextField>
                </Grid>

                {/* Inherent Impact */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Inherent Impact"
                    value={inherentImpact}
                    onChange={e => setInherentImpact(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="1">Moderate</MenuItem>
                    <MenuItem value="0">Major</MenuItem>
                    <MenuItem value="2">Catastrophic</MenuItem>
                  </TextField>
                </Grid>

                {/* Residual Probability */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Residual Probability"
                    value={residualProbability}
                    onChange={e => setResidualProbability(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="2">Rare</MenuItem>
                    <MenuItem value="0">Unlikely</MenuItem>
                    <MenuItem value="1">Possible</MenuItem>
                  </TextField>
                </Grid>

                {/* Residual Impact */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Residual Impact"
                    value={residualImpact}
                    onChange={e => setResidualImpact(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="1">Minor</MenuItem>
                    <MenuItem value="0">Moderate</MenuItem>
                    <MenuItem value="2">Major</MenuItem>
                  </TextField>
                </Grid>

                {/* Response Strategy */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Response Strategy"
                    value={responseStrategy}
                    onChange={e => setResponseStrategy(e.target.value)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    <MenuItem value="0">Mitigate</MenuItem>
                    <MenuItem value="1">Accept</MenuItem>
                  </TextField>
                </Grid>

                {/* Associated Entity (Polymorphic Regarding Lookup) */}
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Autocomplete
                    options={regardingOptions}
                    value={selectedRegarding}
                    onChange={(_, val) => setSelectedRegarding(val)}
                    getOptionLabel={opt => `${opt.type === 'pm_projects' ? '[Project]' : opt.type === 'pm_programmes' ? '[Programme]' : '[Portfolio]'} ${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id && opt.type === val.type}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="Associated Entity"
                        placeholder="Search project, programme, or portfolio…"
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
                    noOptionsText="No entities found"
                  />
                </Grid>
              </>
            )}
          </Grid>
        )}
        {isEdit && (
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Mitigation Actions ({mitigationActions.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setActionDialogOpen(true)}
              >
                Add Action
              </Button>
            </Box>

            {mitigationLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : mitigationActions.length > 0 ? (
              <Grid container spacing={1.5}>
                {mitigationActions.map(action => (
                  <Grid size={{ xs: 12 }} key={action.pm_riskmitigationactionid}>
                    <Card variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {action.pm_actiontitle}
                        </Typography>
                        {action.pm_actiondescription && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {action.pm_actiondescription}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          {action.pm_duedate && (
                            <Typography variant="caption" color="text.secondary">
                              Due: {formatDate(action.pm_duedate)}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Status: {action.pm_status === 0 ? 'Complete' : 'In Progress'}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                No mitigation actions recorded.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleFormSubmit}
          disabled={saving || (!isEdit && !title.trim())}
          sx={{ ml: 1 }}
        >
          {saving ? 'Saving...' : isEdit ? 'Update Risk' : 'Create Risk'}
        </Button>
      </DialogActions>

      <MitigationActionDialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        onSave={handleSaveMitigationAction}
        projectId={initialData?._pm_project_value}
      />
    </Dialog>
  )
}

interface MitigationActionDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  projectId?: string
}

export const MitigationActionDialog: React.FC<MitigationActionDialogProps> = ({ open, onClose, onSave, projectId }) => {
  const [owners, setOwners] = useState<{ value: string, label: string }[]>([])
  const [ownersLoaded, setOwnersLoaded] = useState(false)

  // Form state
  const [actionTitle, setActionTitle] = useState('')
  const [actionDescription, setActionDescription] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [actionStatus, setActionStatus] = useState('1')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setActionTitle('')
      setActionDescription('')
      setOwnerId('')
      setDueDate('')
      setActionStatus('1')
      setOwnersLoaded(false)

      import('@/services').then(async ({ fetchAllocatedResourcesByProject, fetchResources }) => {
        try {
          let list: any[] = []
          if (projectId) {
            list = await fetchAllocatedResourcesByProject(projectId)
          }
          if (list.length === 0) {
            list = await fetchResources()
          }
          const options = list
            .map(r => ({ value: r._pm_systemuser_value || '', label: r.pm_fullname || '' }))
            .filter(opt => opt.value !== '')
          setOwners(options)
        } catch (err) {
          console.error('[MitigationActionDialog] Failed to load owners:', err)
        } finally {
          setOwnersLoaded(true)
        }
      })
    }
  }, [open, projectId])

  const handleFormSubmit = async () => {
    if (!actionTitle.trim() || !ownerId) return
    setSaving(true)
    try {
      await onSave({
        pm_actiontitle: actionTitle.trim(),
        pm_actiondescription: actionDescription.trim(),
        ownerid: ownerId,
        pm_duedate: dueDate || null,
        pm_actionstatus: actionStatus,
      })
      onClose()
    } catch (err) {
      console.error('[MitigationActionDialog] Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Add Mitigation Action
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1.5 }}>
        {open && !ownersLoaded ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
            <CircularProgress size={30} />
            <Typography variant="body2" color="text.secondary">Loading owners...</Typography>
          </Box>
        ) : (
          <Grid container spacing={2.5} sx={{ mt: 2 }}>
            {/* Action Title */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Action Title *"
                slotProps={{ inputLabel: { shrink: true } }}
                value={actionTitle}
                onChange={e => setActionTitle(e.target.value)}
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                slotProps={{ inputLabel: { shrink: true } }}
                value={actionDescription}
                onChange={e => setActionDescription(e.target.value)}
              />
            </Grid>

            {/* Owner */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Owner *"
                slotProps={{ inputLabel: { shrink: true } }}
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
              >
                <MenuItem value="">— Select Owner —</MenuItem>
                {owners.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Due Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </Grid>

            {/* Status */}
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                label="Status"
                slotProps={{ inputLabel: { shrink: true } }}
                value={actionStatus}
                onChange={e => setActionStatus(e.target.value)}
              >
                <MenuItem value="1">In Progress</MenuItem>
                <MenuItem value="0">Complete</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleFormSubmit}
          disabled={saving || !actionTitle.trim() || !ownerId}
          sx={{ ml: 1 }}
        >
          {saving ? 'Saving...' : 'Save Action'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
