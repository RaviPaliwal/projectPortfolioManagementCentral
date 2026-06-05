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
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import MoneyIcon from '@mui/icons-material/Money'
import { createProgramme, updateProgramme, fetchPortfolioHierarchy } from '@/services'
import { fontSizes } from '@/styles'
import type { ProgrammeModel } from '@/types/dataverse'
import { useUser } from '@/context/UserContext'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

interface ProgrammeFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (programmes: ProgrammeModel[]) => void
  onError: (message: string) => void
  initialData?: ProgrammeModel | null
  portfolios: { id: string; name: string; budget: number }[]
}

export const ProgrammeFormDialog: React.FC<ProgrammeFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
  initialData,
  portfolios,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users } = useUser()
  
  const isEdit = !!initialData?.pm_programmeid
  const [actionLoading, setActionLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    pm_programmename: '',
    pm_programmemanager: '',
    pm_sponsorname: '',
    pm_programmephase: 1,
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
      if (initialData) {
        setFormData({
          pm_programmename: initialData.pm_programmename || '',
          pm_programmemanager: initialData.pm_programmemanager || '',
          pm_sponsorname: initialData.pm_sponsorname || '',
          pm_programmephase: initialData.pm_programmephase !== undefined ? Number(initialData.pm_programmephase) : 1,
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
          pm_programmephase: 1,
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

  const sliderMaxBudget = useMemo(() => {
    if (!formData._pm_portfolio_value) return 10_000_000
    const selected = portfolios.find((p) => p.id === formData._pm_portfolio_value)
    if (selected && selected.budget > 0) return selected.budget
    return 10_000_000
  }, [formData._pm_portfolio_value, portfolios])

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
        const freshData = await fetchPortfolioHierarchy()
        onSuccess(freshData.programmes)
        onClose()
        if (!isEdit) {
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
              <TextField
                label="Business Unit"
                fullWidth
                size="small"
                value={formData.pm_businessunit}
                onChange={(e) => setFormData((f) => ({ ...f, pm_businessunit: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
              />
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
                Budget
                <Typography variant="caption" color="text.secondary" component="span" sx={{ fontWeight: 400 }}>
                  (max {currencyFormatter.format(sliderMaxBudget)})
                </Typography>
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
                  {formData.pm_budgeteur > 0 && sliderMaxBudget > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {((formData.pm_budgeteur / sliderMaxBudget) * 100).toFixed(1)}% of portfolio budget
                    </Typography>
                  )}
                </Box>
                <Slider
                  value={formData.pm_budgeteur}
                  onChange={(_, value) => setFormData((f) => ({ ...f, pm_budgeteur: value as number }))}
                  min={0}
                  max={sliderMaxBudget}
                  step={sliderMaxBudget > 10_000_000 ? 100_000 : 50_000}
                  sx={{
                    color: formData.pm_budgeteur > sliderMaxBudget * 0.9
                      ? 'error.main'
                      : formData.pm_budgeteur > sliderMaxBudget * 0.75
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
          <CheckCircleIcon sx={{ fontSize: 32, color: '#ffffff' }} />
        </Box>
        <DialogTitle sx={{ textAlign: 'center', pt: 5, fontWeight: 700, fontSize: 20 }}>
          Programme Created
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            {confirmDialog.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The programme has been created successfully. You can now add projects, assign resources, and manage financials.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => setConfirmDialog({ open: false, name: '' })}
            sx={{ borderRadius: 1.5, px: 4, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
