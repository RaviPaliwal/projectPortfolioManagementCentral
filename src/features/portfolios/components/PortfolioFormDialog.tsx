import React, { useState, useEffect } from 'react'
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
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { createPortfolio, updatePortfolio, fetchPortfolioHierarchy, startWorkflowForEntity, uploadDocument } from '@/services'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { BUSINESS_UNITS } from '@/constants/businessUnits'
import { fontSizes } from '@/styles'
import type { PortfolioModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'
import { DocumentPreviewDialog } from '@/components/common'

interface PortfolioFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (portfolios: PortfolioModel[]) => void
  onError: (message: string) => void
  initialData?: PortfolioModel | null
}

export const PortfolioFormDialog: React.FC<PortfolioFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
  initialData,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users, currentUser } = useUser()
  
  const isEdit = !!initialData?.pm_portfolioid
  const [actionLoading, setActionLoading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null)

  const handlePreviewStaged = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewFile({ name: file.name, url })
  }
  
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

  useEffect(() => {
    if (open) {
      setStagedFiles([])
      if (initialData) {
        setFormData({
          pm_portfolioname: initialData.pm_portfolioname || '',
          pm_ownerlookup: initialData.pm_ownerlookup || '',
          pm_portfoliostatus: initialData.pm_portfoliostatus !== undefined ? Number(initialData.pm_portfoliostatus) : 0,
          pm_ragstatus: initialData.pm_ragstatus !== undefined ? Number(initialData.pm_ragstatus) : 1,
          pm_approvedbudgeteur: initialData.pm_approvedbudgeteur || 0,
          pm_startdate: initialData.pm_startdate?.split('T')[0] || '',
          pm_enddate: initialData.pm_enddate?.split('T')[0] || '',
          pm_portfoliodescription: initialData.pm_portfoliodescription || '',
          pm_strategicobjective: initialData.pm_strategicobjective || '',
          pm_businessunit: initialData.pm_businessunit || '',
          pm_prioritylevel: initialData.pm_prioritylevel !== undefined ? Number(initialData.pm_prioritylevel) : 2,
        })
      } else {
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
      }
    }
  }, [open, initialData, currentUser])

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' })

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

      let result: PortfolioModel | null = null
      if (isEdit && initialData?.pm_portfolioid) {
        result = await updatePortfolio(initialData.pm_portfolioid, payload)
      } else {
        result = await createPortfolio(payload)
      }

      if (result) {
        const targetPortfolioId = result.pm_portfolioid || initialData?.pm_portfolioid
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
        if (!isEdit) {
          // Trigger approval workflow for newly created portfolio
          try {
            await startWorkflowForEntity(
              'default-template',
              result.pm_portfolioid!,
              MODULE_NAMES.PORTFOLIOS.value,
              currentUser?.fullname ?? 'System'
            )
          } catch (wfErr) {
            console.error('[PortfolioFormDialog] Failed to initiate workflow:', wfErr)
          }
          setConfirmDialog({ open: true, name: result.pm_portfolioname || formData.pm_portfolioname })
        }
      }
    } catch {
      onError(`Unable to ${isEdit ? 'update' : 'create'} portfolio.`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={() => !actionLoading && onClose()} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isEdit ? 'Edit Portfolio' : 'New Portfolio'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isEdit 
              ? 'Update the portfolio details and tracking parameters.'
              : 'Create a new portfolio record to begin tracking investments, programmes, and projects.'}
          </Typography>

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
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="portfolio-owner-label">Owner / Sponsor</InputLabel>
                <Select
                  id="portfolio-owner-select"
                  labelId="portfolio-owner-label"
                  value={formData.pm_ownerlookup}
                  label="Owner / Sponsor"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_ownerlookup: e.target.value }))}
                  sx={{ borderRadius: 1.5 }}
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
                <InputLabel id="portfolio-bu-label">Business Unit</InputLabel>
                <Select
                  id="portfolio-bu-select"
                  labelId="portfolio-bu-label"
                  value={formData.pm_businessunit}
                  label="Business Unit"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_businessunit: e.target.value }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  {BUSINESS_UNITS.map((bu) => (
                    <MenuItem key={bu} value={bu}>{bu}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="portfolio-priority-label">Priority</InputLabel>
                <Select
                  id="portfolio-priority-select"
                  labelId="portfolio-priority-label"
                  value={formData.pm_prioritylevel}
                  label="Priority"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_prioritylevel: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={1}>1 - High</MenuItem>
                  <MenuItem value={2}>2 - Medium</MenuItem>
                  <MenuItem value={3}>3 - Low</MenuItem>
                  <MenuItem value={4}>4 - Very Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="portfolio-status-label">Status</InputLabel>
                <Select
                  id="portfolio-status-select"
                  labelId="portfolio-status-label"
                  value={formData.pm_portfoliostatus}
                  label="Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_portfoliostatus: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={0}>Active</MenuItem>
                  <MenuItem value={1}>Under Approval</MenuItem>
                  <MenuItem value={2}>Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="portfolio-rag-label">RAG Status</InputLabel>
                <Select
                  id="portfolio-rag-select"
                  labelId="portfolio-rag-label"
                  value={formData.pm_ragstatus}
                  label="RAG Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
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
              <TextField
                label="Approved Budget (EUR)"
                type="number"
                fullWidth
                size="small"
                value={formData.pm_approvedbudgeteur}
                onChange={(e) => setFormData((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
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
                label="Description"
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.pm_portfoliodescription}
                onChange={(e) => setFormData((f) => ({ ...f, pm_portfoliodescription: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
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
            disabled={!formData.pm_portfolioname.trim() || actionLoading}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, px: 3 }}
          >
            {actionLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Portfolio'}
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
            An approver will review this portfolio. You can track the approval status from the portfolio details panel.
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

export default PortfolioFormDialog
