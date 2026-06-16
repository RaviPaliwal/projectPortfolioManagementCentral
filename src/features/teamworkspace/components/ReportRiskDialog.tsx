import { useState } from 'react'
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
  Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { fontSizes } from '@/styles'

const RISK_CATEGORIES = [
  { value: '0', label: 'Resource' },
  { value: '1', label: 'Financial' },
  { value: '2', label: 'Legal' },
  { value: '3', label: 'Technical' },
  { value: '4', label: 'External' },
  { value: '5', label: 'Operational' },
  { value: '6', label: 'Safety' },
  { value: '7', label: 'Vendor' },
]

const IMPACT_LEVELS = [
  { value: '0', label: 'Low - Minimal impact on project objectives' },
  { value: '1', label: 'Medium - Moderate impact, manageable with resources' },
  { value: '2', label: 'High - Significant impact requiring escalation' },
]

interface ReportRiskDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    pm_risktitle: string
    pm_riskcategory: string
    pm_riskdescription: string
  }) => Promise<void>
}

export const ReportRiskDialog = ({ open, onClose, onSubmit }: ReportRiskDialogProps) => {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setTitle('')
    setCategory('')
    setDescription('')
    setImpact('')
    setError(null)
    setErrors({})
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Risk title is required'
    if (!category) newErrors.category = 'Please select a category'
    if (!description.trim()) newErrors.description = 'Description is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        pm_risktitle: title.trim(),
        pm_riskcategory: category,
        pm_riskdescription: description.trim(),
      })
      resetForm()
      onClose()
    } catch (err) {
      setError('Failed to submit risk. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Report New Risk
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Flag a potential risk or threat to project objectives
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

        {/* Info banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            mb: 2.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 18, mt: 0.25, flexShrink: 0 }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>
              Simplified Reporting
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', lineHeight: 1.4 }}>
              Risk scoring (probability/impact matrix) and financial exposure fields will be evaluated by the Project Manager after submission.
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="Risk Title *"
            placeholder="What is the potential risk or threat?"
            value={title}
            onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: '' })) }}
            error={!!errors.title}
            helperText={errors.title}
            size="medium"
          />

          <TextField
            select
            fullWidth
            label="Category *"
            value={category}
            onChange={e => { setCategory(e.target.value); if (errors.category) setErrors(prev => ({ ...prev, category: '' })) }}
            error={!!errors.category}
            helperText={errors.category}
          >
            <MenuItem value="">— Select Category —</MenuItem>
            {RISK_CATEGORIES.map(cat => (
              <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description *"
            placeholder="Describe the risk, its potential causes, and what might happen if it materializes."
            value={description}
            onChange={e => { setDescription(e.target.value); if (errors.description) setErrors(prev => ({ ...prev, description: '' })) }}
            error={!!errors.description}
            helperText={errors.description}
          />

          <TextField
            select
            fullWidth
            label="Potential Impact"
            value={impact}
            onChange={e => setImpact(e.target.value)}
          >
            <MenuItem value="">— Select Impact Level —</MenuItem>
            {IMPACT_LEVELS.map(level => (
              <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
            ))}
          </TextField>
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
          color="warning"
          disabled={isSubmitting}
          startIcon={isSubmitting ? undefined : <WarningAmberIcon />}
          sx={{ borderRadius: 1.5, fontWeight: 700 }}
        >
          {isSubmitting ? 'Submitting...' : 'Report Risk'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReportRiskDialog
