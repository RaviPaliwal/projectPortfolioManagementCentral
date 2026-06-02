import { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import ApproveIcon from '@mui/icons-material/ThumbUp'
import RejectIcon from '@mui/icons-material/ThumbDown'
import { formatDate } from '@/utils/formatters'

interface TimesheetStatusControlsProps {
  status: string
  onStatusUpdate: (newStatus: number, extra?: any) => Promise<void>
  approvalDate?: string
  rejectionReason?: string
  loading?: boolean
}

export function TimesheetStatusControls({
  status,
  onStatusUpdate,
  approvalDate,
  rejectionReason,
  loading,
}: TimesheetStatusControlsProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isDraft = status === '3'
  const isSubmitted = status === '1'
  const isApproved = status === '0'
  const isRejected = status === '2'

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    await onStatusUpdate(2, { pm_rejectionreason: rejectReason })
    setShowRejectDialog(false)
    setRejectReason('')
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {isDraft && (
        <Button
          variant="contained"
          size="small"
          startIcon={<SendIcon />}
          onClick={() => onStatusUpdate(1)}
          disabled={loading}
          sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, whiteSpace: 'nowrap' }}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
      )}

      {isSubmitted && (
        <>
          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={<ApproveIcon />}
            onClick={() => onStatusUpdate(0)}
            disabled={loading}
            sx={{ borderRadius: 1.15, whiteSpace: 'nowrap' }}
          >
            {loading ? 'Approving...' : 'Approve'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<RejectIcon />}
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
            sx={{ borderRadius: 1.15, whiteSpace: 'nowrap' }}
          >
            Reject
          </Button>
        </>
      )}

      {(isApproved || isRejected) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 1, py: 0.5, bgcolor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 1.15 }}
        >
          {isApproved && `Approved ${approvalDate ? formatDate(approvalDate) : ''}`}
          {isRejected && `Rejected${rejectionReason ? `: ${rejectionReason}` : ''}`}
        </Typography>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Timesheet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this timesheet. This will be visible to the owner.
          </Typography>
          <TextField
            autoFocus
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setShowRejectDialog(false)} variant="outlined" sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || loading}
            sx={{ borderRadius: 1.15 }}
          >
            {loading ? 'Rejecting...' : 'Reject Timesheet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
