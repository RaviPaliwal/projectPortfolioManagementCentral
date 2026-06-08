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
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { createPortfolio, updatePortfolio, fetchPortfolioHierarchy } from '@/services'
import { fontSizes } from '@/styles'
import type { PortfolioModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'

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
  
  const [formData, setFormData] = useState({
    pm_portfolioname: '',
    pm_ownerlookup: currentUser?.systemuserid || '',
    pm_portfoliostatus: 0,
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
          pm_portfoliostatus: 0,
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
        const freshData = await fetchPortfolioHierarchy()
        onSuccess(freshData.portfolios)
        onClose()
        if (!isEdit) {
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
                <InputLabel>Owner / Sponsor</InputLabel>
                <Select
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
              <TextField
                label="Business Unit"
                fullWidth
                size="small"
                value={formData.pm_businessunit}
                onChange={(e) => setFormData((f) => ({ ...f, pm_businessunit: e.target.value }))}
                placeholder="e.g. Finance, IT, HR"
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.pm_portfoliostatus}
                  label="Status"
                  onChange={(e) => setFormData((f) => ({ ...f, pm_portfoliostatus: e.target.value as number }))}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value={0}>Active</MenuItem>
                  <MenuItem value={1}>On Hold</MenuItem>
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

      {/* Success Confirmation Dialog */}
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
            bgcolor: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 32, color: '#fff' }} />
        </Box>
        <DialogTitle sx={{ textAlign: 'center', pt: 5, pb: 1, fontWeight: 700, fontSize: fontSizes.xl }}>
          Portfolio Created
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{confirmDialog.name}</strong> has been successfully created.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can now link programmes and projects to this portfolio from their respective pages.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1.5 }}>
          <Button
            variant="contained"
            onClick={() => setConfirmDialog({ open: false, name: '' })}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
              borderRadius: 1.5,
              px: 4,
              fontWeight: 600,
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default PortfolioFormDialog
