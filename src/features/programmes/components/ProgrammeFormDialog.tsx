import React, { useState, useEffect, useMemo } from 'react'
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
  Slider,
  Paper,
  Chip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import MoneyIcon from '@mui/icons-material/Money'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { createProgramme, updateProgramme, fetchPortfolioHierarchy, startWorkflowForEntity, uploadDocument } from '@/services'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { BUSINESS_UNITS } from '@/constants/businessUnits'
import { fontSizes } from '@/styles'
import type { ProgrammeModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { DocumentPreviewDialog } from '@/components/common'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

interface ProgrammeFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (programmes: ProgrammeModel[]) => void
  onError: (message: string) => void
  initialData?: ProgrammeModel | null
  portfolios: { id: string; name: string; budget: number }[]
  /** All programmes (used to compute remaining budget per portfolio) */
  allProgrammes?: ProgrammeModel[]
}

export const ProgrammeFormDialog: React.FC<ProgrammeFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
  initialData,
  portfolios,
  allProgrammes = [],
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users, currentUser } = useUser()
  
  const isEdit = !!initialData?.pm_programmeid
  const [actionLoading, setActionLoading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null)

  const handlePreviewStaged = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewFile({ name: file.name, url })
  }

  const [formData, setFormData] = useState({
    pm_programmename: '',
    pm_programmemanager: '',
    pm_sponsorname: '',
    pm_programmephase: 3,
    pm_ragstatus: 1,
    pm_budgeteur: 0,
    pm_actualspendeur: 0,
    pm_businessunit: '',
    pm_startdate: '',
    pm_enddate: '',
    pm_programmedescription: '',
    _pm_portfolio_value: '',
  })

  useEffect(() => {
    if (open) {
      setStagedFiles([])
      if (initialData) {
        setFormData({
          pm_programmename: initialData.pm_programmename || '',
          pm_programmemanager: initialData.pm_programmemanager || '',
          pm_sponsorname: initialData.pm_sponsorname || '',
          pm_programmephase: initialData.pm_programmephase !== undefined ? Number(initialData.pm_programmephase) : 3,
          pm_ragstatus: initialData.pm_ragstatus !== undefined ? Number(initialData.pm_ragstatus) : 1,
          pm_budgeteur: initialData.pm_budgeteur || 0,
          pm_actualspendeur: initialData.pm_actualspendeur || 0,
          pm_businessunit: initialData.pm_businessunit || '',
          pm_startdate: initialData.pm_startdate?.split('T')[0] || '',
          pm_enddate: initialData.pm_enddate?.split('T')[0] || '',
          pm_programmedescription: initialData.pm_programmedescription || '',
          _pm_portfolio_value: initialData._pm_portfolio_value || '',
        })
      } else {
        setFormData({
          pm_programmename: '',
          pm_programmemanager: '',
          pm_sponsorname: '',
          pm_programmephase: 3,
          pm_ragstatus: 1,
          pm_budgeteur: 0,
          pm_actualspendeur: 0,
          pm_businessunit: '',
          pm_startdate: '',
          pm_enddate: '',
          pm_programmedescription: '',
          _pm_portfolio_value: '',
        })
      }
    }
  }, [open, initialData])

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' })

  // Compute available budget for the selected portfolio
  const portfolioBudgetInfo = useMemo(() => {
    if (!formData._pm_portfolio_value) {
      return { portfolioBudget: 10_000_000, usedBudget: 0, availableBudget: 10_000_000, programmeCount: 0 }
    }
    const selected = portfolios.find((p) => p.id === formData._pm_portfolio_value)
    const portfolioBudget = selected?.budget ?? 10_000_000

    // Sum budgets of all OTHER programmes linked to this portfolio
    const otherProgrammes = allProgrammes.filter(
      (p) => p._pm_portfolio_value === formData._pm_portfolio_value &&
             p.pm_programmeid !== initialData?.pm_programmeid
    )
    const usedBudget = otherProgrammes.reduce((sum, p) => sum + (p.pm_budgeteur ?? 0), 0)
    const availableBudget = Math.max(0, portfolioBudget - usedBudget)
    return { portfolioBudget, usedBudget, availableBudget, programmeCount: otherProgrammes.length }
  }, [formData._pm_portfolio_value, portfolios, allProgrammes, initialData?.pm_programmeid])

  const handleSave = async () => {
    if (!formData.pm_programmename.trim()) return
    setActionLoading(true)
    try {
      const payload: Partial<ProgrammeModel> = {
        pm_programmename: formData.pm_programmename,
        pm_programmemanager: formData.pm_programmemanager || undefined,
        pm_sponsorname: formData.pm_sponsorname || undefined,
        pm_programmephase: formData.pm_programmephase,
        pm_ragstatus: formData.pm_ragstatus,
        pm_budgeteur: formData.pm_budgeteur || 0,
        pm_actualspendeur: formData.pm_actualspendeur || 0,
        pm_businessunit: formData.pm_businessunit || undefined,
        pm_startdate: formData.pm_startdate || undefined,
        pm_enddate: formData.pm_enddate || undefined,
        pm_programmedescription: formData.pm_programmedescription || undefined,
        _pm_portfolio_value: formData._pm_portfolio_value || undefined,
      }

      let result: ProgrammeModel | null = null
      if (isEdit && initialData?.pm_programmeid) {
        result = await updateProgramme(initialData.pm_programmeid, payload)
      } else {
        result = await createProgramme(payload)
      }

      if (result) {
        const targetProgrammeId = result.pm_programmeid || initialData?.pm_programmeid
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
        if (!isEdit) {
          // Trigger approval workflow for newly created programme
          try {
            await startWorkflowForEntity(
              'default-template',
              result.pm_programmeid!,
              MODULE_NAMES.PROGRAMMES.value,
              currentUser?.fullname ?? 'System'
            )
          } catch (wfErr) {
            console.error('[ProgrammeFormDialog] Failed to initiate workflow:', wfErr)
          }
          setConfirmDialog({ open: true, name: result.pm_programmename || formData.pm_programmename })
        }
      }
    } catch {
      onError(`Unable to ${isEdit ? 'update' : 'create'} programme.`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={() => !actionLoading && onClose()} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isEdit ? 'Edit Programme' : 'New Programme'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isEdit 
              ? 'Update the programme details and tracking parameters.'
              : 'Create a new programme record. Programmes act as containers for multiple projects within a portfolio.'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Basic Information
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Programme Name"
                required
                fullWidth
                size="small"
                value={formData.pm_programmename}
                onChange={(e) => setFormData((f) => ({ ...f, pm_programmename: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Parent Portfolio</InputLabel>
                <Select
                  value={formData._pm_portfolio_value}
                  label="Parent Portfolio"
                  onChange={(e) => setFormData((f) => ({ ...f, _pm_portfolio_value: e.target.value }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">None</MenuItem>
                  {portfolios.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Programme Manager</InputLabel>
                <Select
                  value={formData.pm_programmemanager}
                  label="Programme Manager"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_programmemanager: e.target.value }))}
                  sx={{ borderRadius: 1.5 }}
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
                label="Sponsor"
                fullWidth
                size="small"
                value={formData.pm_sponsorname}
                onChange={(e) => setFormData((f) => ({ ...f, pm_sponsorname: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Phase</InputLabel>
                <Select
                  value={formData.pm_programmephase}
                  label="Phase"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_programmephase: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={0}>Delivery</MenuItem>
                  <MenuItem value={1}>Planning</MenuItem>
                  <MenuItem value={2}>Initiation</MenuItem>
                  <MenuItem value={3}>Under Approval</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>RAG Status</InputLabel>
                <Select
                  value={formData.pm_ragstatus}
                  label="RAG Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={1}>Green</MenuItem>
                  <MenuItem value={0}>Amber</MenuItem>
                  <MenuItem value={2}>Red</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Business Unit</InputLabel>
                <Select
                  value={formData.pm_businessunit}
                  label="Business Unit"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_businessunit: e.target.value }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {BUSINESS_UNITS.map((bu) => (
                    <MenuItem key={bu} value={bu}>{bu}</MenuItem>
                  ))}
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
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
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
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AttachMoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
              Financial Tracking
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                Programme Budget
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: isDark ? 'background.paper' : 'background.default',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: formData.pm_budgeteur > 0 ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {currencyFormatter.format(formData.pm_budgeteur)}
                  </Typography>
                  {formData.pm_budgeteur > 0 && portfolioBudgetInfo.availableBudget > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {((formData.pm_budgeteur / portfolioBudgetInfo.availableBudget) * 100).toFixed(1)}% of available budget
                    </Typography>
                  )}
                </Box>
                <Slider
                  value={formData.pm_budgeteur}
                  onChange={(_, value) => setFormData((f) => ({ ...f, pm_budgeteur: value as number }))}
                  min={0}
                  max={Math.max(portfolioBudgetInfo.availableBudget, formData.pm_budgeteur)}
                  step={portfolioBudgetInfo.availableBudget > 10_000_000 ? 100_000 : 50_000}
                  sx={{
                    color: formData.pm_budgeteur > portfolioBudgetInfo.availableBudget
                      ? 'error.main'
                      : formData.pm_budgeteur > portfolioBudgetInfo.availableBudget * 0.9
                        ? 'warning.main'
                        : 'primary.main',
                    '& .MuiSlider-thumb': {
                      width: 18,
                      height: 18,
                      transition: 'box-shadow 0.15s ease',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 8px rgba(14, 165, 233, 0.16)',
                      },
                    },
                  }}
                />
              </Paper>

              {formData._pm_portfolio_value && (
                <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                    Portfolio Budget Allocation
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Portfolio Budget</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {currencyFormatter.format(portfolioBudgetInfo.portfolioBudget)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Already allocated ({portfolioBudgetInfo.programmeCount} programme{portfolioBudgetInfo.programmeCount !== 1 ? 's' : ''})
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'warning.main' }}>
                      {currencyFormatter.format(portfolioBudgetInfo.usedBudget)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Available for this programme</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: portfolioBudgetInfo.availableBudget <= 0 ? 'error.main' : 'success.main',
                      }}
                    >
                      {currencyFormatter.format(portfolioBudgetInfo.availableBudget)}
                    </Typography>
                  </Box>
                  {portfolioBudgetInfo.availableBudget <= 0 && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>
                      No remaining budget in this portfolio.
                    </Typography>
                  )}
                </Paper>
              )}

              {formData.pm_budgeteur > portfolioBudgetInfo.availableBudget && (
                <Box sx={{ mt: 1, p: 1.25, borderRadius: 1.5, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main', flexShrink: 0 }} />
                  <Typography variant="caption" color="error.dark" sx={{ fontWeight: 600 }}>
                    Budget exceeds available portfolio allocation by {currencyFormatter.format(formData.pm_budgeteur - portfolioBudgetInfo.availableBudget)}.
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Actual Spend (EUR)"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_actualspendeur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_actualspendeur: Number(e.target.value) }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                sx={{ mt: 4.5 }}
              />
            </Grid>
          </Grid>

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
                label="Description / Business Objectives"
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.pm_programmedescription}
                onChange={(e) => setFormData((f) => ({ ...f, pm_programmedescription: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
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
          <Button onClick={onClose} variant="outlined" disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.pm_programmename.trim() || actionLoading}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, px: 3 }}
          >
            {actionLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Programme'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Confirmation Dialog — Submitted for Approval */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, name: '' })}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 1.5, overflow: 'visible' },
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'warning.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
          }}
        >
          <AssignmentIcon sx={{ fontSize: 32, color: '#fff' }} />
        </Box>
        <DialogTitle sx={{ textAlign: 'center', pt: 5, pb: 1, fontWeight: 700, fontSize: fontSizes.xl }}>
          Submitted for Approval
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{confirmDialog.name}</strong> has been created and submitted for approval.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            An approver will review this programme. You can track the approval status from the programme details panel.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1.5 }}>
          <Button
            variant="contained"
            onClick={() => setConfirmDialog({ open: false, name: '' })}
            sx={{
              bgcolor: 'warning.main',
              '&:hover': { bgcolor: 'warning.dark' },
              borderRadius: 1.5,
              px: 4,
              fontWeight: 600,
            }}
          >
            Got it
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
