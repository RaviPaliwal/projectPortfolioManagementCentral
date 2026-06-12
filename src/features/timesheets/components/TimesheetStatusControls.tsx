import {
  Box,
  Typography,
  useTheme,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { ActionIcon } from '@/components/common'
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

  const isDraft = status === '3'
  const isSubmitted = status === '1'
  const isApproved = status === '0'
  const isRejected = status === '2'

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {isDraft && (
        <ActionIcon
          icon={<SendIcon />}
          onClick={() => onStatusUpdate(1)}
          label="Submit Timesheet"
          color="primary"
        />
      )}

      {isSubmitted && (
        <Typography
          variant="caption"
          color="info.main"
          sx={{ px: 1, py: 0.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'info.main' }}
        >
          Awaiting approval — use Tasks tab to review
        </Typography>
      )}

      {(isApproved || isRejected) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 1, py: 0.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}
        >
          {isApproved && `Approved ${approvalDate ? formatDate(approvalDate) : ''}`}
          {isRejected && `Rejected${rejectionReason ? `: ${rejectionReason}` : ''}`}
        </Typography>
      )}
    </Box>
  )
}
