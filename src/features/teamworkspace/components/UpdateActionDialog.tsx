import { useState, useEffect } from 'react'
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
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import AssignmentIcon from '@mui/icons-material/Assignment'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import type { RiskMitigationActionModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { StatusTag } from '@/components/common'

const STATUS_OPTIONS = [
  { value: '0', label: 'Not Started' },
  { value: '1', label: 'In Progress' },
  { value: '2', label: 'On Hold' },
  { value: '3', label: 'Completed' },
]

const EFFECTIVENESS_OPTIONS = [
  { value: '0', label: 'High - Fully effective' },
  { value: '1', label: 'Medium - Partially effective' },
  { value: '2', label: 'Low - Limited effectiveness' },
  { value: '3', label: 'Not Assessed' },
]

interface UpdateActionDialogProps {
  open: boolean
  action: RiskMitigationActionModel | null
  riskTitle?: string
  onClose: () => void
  onSubmit: (data: {
    pm_status: string
    pm_notes: string
    pm_completiondate?: string
  }) => Promise<void>
}

export const UpdateActionDialog = ({
  open,
  action,
  riskTitle,
  onClose,
  onSubmit,
}: UpdateActionDialogProps) => {
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [effectiveness, setEffectiveness] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && action) {
      setStatus(String(action.pm_status ?? '0'))
      setNotes(action.pm_notes || '')
      setCompletionDate(action.pm_completiondate || '')
      setEffectiveness(String(action.pm_effectiveness ?? ''))
      setError(null)
      setIsSubmitting(false)
    }
  }, [open, action])

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = async () => {
    if (!status) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload: any = {
        pm_status: status,
        pm_notes: notes,
      }
      if (status === '3') {
        payload.pm_completiondate = completionDate || new Date().toISOString().split('T')[0]
      }
      if (effectiveness) {
        payload.pm_effectiveness = effectiveness
      }
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setError('Failed to update action. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!action) return null

  const isCompleted = status === '3'

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2 },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssignmentIcon sx={{ color: '#8b5cf6', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Update Mitigation Action
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {action.pm_actiontitle || 'Untitled Action'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
            {error}
          </Alert>
        )}

        {/* Parent Risk Info */}
        {riskTitle && (
          <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Parent Risk
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {riskTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reference: {action.pm_riskidentifier || '—'}
              </Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Status */}
          <TextField
            select
            fullWidth
            label="Action Status *"
            value={status}
            onChange={e => setStatus(e.target.value)}
            helperText="Update the current state of this mitigation action"
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Progress Notes"
            placeholder="Describe what has been done, any challenges encountered, and next steps..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            helperText="Add commentary on the work completed so far"
          />

          {/* Conditional: Date Completed & Effectiveness */}
          {isCompleted && (
            <>
              <TextField
                fullWidth
                type="date"
                label="Date Completed"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                fullWidth
                label="Effectiveness"
                value={effectiveness}
                onChange={e => setEffectiveness(e.target.value)}
                helperText="How effective was this mitigation action?"
              >
                <MenuItem value="">— Not Assessed —</MenuItem>
                {EFFECTIVENESS_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </>
          )}

          {/* Action details summary */}
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Action Details
            </Typography>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Owner</Typography>
                <Typography variant="body2">{action.pm_actionowner || '—'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography variant="body2">
                  {action.pm_duedate ? new Date(action.pm_duedate).toLocaleDateString() : '—'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={isSubmitting}
          sx={{ borderRadius: 1.5 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="secondary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? undefined : <SaveIcon />}
          sx={{ borderRadius: 1.5, fontWeight: 700 }}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UpdateActionDialog
