import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
} from '@mui/material'
import type { DialogProps as MuiDialogProps } from '@mui/material/Dialog'

export interface DialogProps extends Omit<MuiDialogProps, 'open'> {
  open: boolean
  title: string
  content: React.ReactNode
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  confirmDisabled?: boolean
  isLoading?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  title,
  content,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDisabled = false,
  isLoading = false,
  maxWidth = 'sm',
  ...props
}) => {
  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      {...props}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        {typeof content === 'string' ? <div>{content}</div> : content}
      </DialogContent>
      {onConfirm && (
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <MuiButton onClick={onClose} variant="outlined">
            {cancelText}
          </MuiButton>
          <MuiButton
            onClick={onConfirm}
            variant="contained"
            disabled={confirmDisabled || isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </MuiButton>
        </DialogActions>
      )}
    </MuiDialog>
  )
}

export default Dialog
