import React, { useState } from 'react'
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
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createPortfolio, fetchPortfolioHierarchy } from '@/services'
import { fontSizes } from '@/styles'
import type { PortfolioModel } from '@/types/dataverse'

interface PortfolioFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (portfolios: PortfolioModel[]) => void
  onError: (message: string) => void
}

export const PortfolioFormDialog: React.FC<PortfolioFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  
  const [actionLoading, setActionLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    pm_portfolioname: '',
    pm_portfolioowner: '',
    pm_portfoliostatus: 0,
    pm_ragstatus: 1,
    pm_approvedbudgeteur: 0,
    pm_startdate: '',
    pm_enddate: '',
    pm_portfoliodescription: '',
    pm_strategicobjective: '',
  })

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' })

  const handleCreatePortfolio = async () => {
    if (!createForm.pm_portfolioname.trim()) return
    setActionLoading(true)
    try {
      const created = await createPortfolio({
        pm_portfolioname: createForm.pm_portfolioname,
        pm_portfolioowner: createForm.pm_portfolioowner || undefined,
        pm_portfoliostatus: createForm.pm_portfoliostatus,
        pm_ragstatus: createForm.pm_ragstatus,
        pm_approvedbudgeteur: createForm.pm_approvedbudgeteur || 0,
        pm_startdate: createForm.pm_startdate || undefined,
        pm_enddate: createForm.pm_enddate || undefined,
        pm_portfoliodescription: createForm.pm_portfoliodescription || undefined,
        pm_strategicobjective: createForm.pm_strategicobjective || undefined,
      })
      if (created) {
        const freshData = await fetchPortfolioHierarchy()
        onSuccess(freshData.portfolios)
        onClose()
        // Show success confirmation
        const portfolioName = created.pm_portfolioname || createForm.pm_portfolioname
        setConfirmDialog({ open: true, name: portfolioName })
        setCreateForm({
          pm_portfolioname: '',
          pm_portfolioowner: '',
          pm_portfoliostatus: 0,
          pm_ragstatus: 1,
          pm_approvedbudgeteur: 0,
          pm_startdate: '',
          pm_enddate: '',
          pm_portfoliodescription: '',
          pm_strategicobjective: '',
        })
      }
    } catch {
      onError('Unable to create portfolio.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={() => !actionLoading && onClose()} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          New Portfolio
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new portfolio record to begin tracking investments, programmes, and projects.
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Portfolio Name"
                required
                fullWidth
                size="small"
                value={createForm.pm_portfolioname}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfolioname: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Owner / Sponsor"
                fullWidth
                size="small"
                value={createForm.pm_portfolioowner}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfolioowner: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={createForm.pm_portfoliostatus}
                  label="Status"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfoliostatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
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
                  value={createForm.pm_ragstatus}
                  label="RAG Status"
                  onChange={(e) => setCreateForm((f) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={1}>Green</MenuItem>
                  <MenuItem value={0}>Amber</MenuItem>
                  <MenuItem value={2}>Red</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Approved Budget (EUR)"
                type="number"
                fullWidth
                size="small"
                value={createForm.pm_approvedbudgeteur}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_approvedbudgeteur: Number(e.target.value) }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                size="small"
                value={createForm.pm_startdate}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_startdate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                size="small"
                value={createForm.pm_enddate}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_enddate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={createForm.pm_portfoliodescription}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_portfoliodescription: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Strategic Objective"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={createForm.pm_strategicobjective}
                onChange={(e) => setCreateForm((f) => ({ ...f, pm_strategicobjective: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePortfolio}
            variant="contained"
            disabled={!createForm.pm_portfolioname.trim() || actionLoading}
            sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' } }}
          >
            {actionLoading ? 'Creating...' : 'Create Portfolio'}
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
            sx: { borderRadius: 3, overflow: 'visible' },
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
            bgcolor: '#22c55e',
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
              bgcolor: '#0078D4',
              '&:hover': { bgcolor: '#006cbe' },
              borderRadius: 2,
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
