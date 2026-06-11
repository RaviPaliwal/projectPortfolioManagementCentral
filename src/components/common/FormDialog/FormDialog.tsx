/**
 * FormDialog Component
 *
 * Mounted at the app root level. Listens for form:open-dialog events and renders
 * the appropriate task form modal.
 *
 * When a form:open-dialog event is received, it looks up the formKey in
 * FORM_REGISTRY. If the entry has a modalComponent, it renders it inside
 * a Suspense + ErrorBoundary wrapper, passing approvalStepId and onClose.
 *
 * If no formKey is provided or no matching entry is found, the dialog
 * just closes (no fallback navigation — all task entries must have a modalComponent).
 */

import { useState, useEffect, useCallback, Suspense, Component, type ReactNode, type ErrorInfo } from 'react'
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import type { FormDialogDetail } from '@/utils/formDialogEvents'
import { FORM_DIALOG_OPEN_EVENT } from '@/utils/formDialogEvents'
import { getFormByKey } from '@/constants/formRegistry'
import { DecisionBox } from '@/components/common/DecisionBox/DecisionBox'

// ─── ErrorBoundary ───────────────────────────────────────────────────

interface EBProps { children: ReactNode }
interface EBState { error: Error | null }

class ModalErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { error }
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error('[FormDialog] Modal component crashed:', error, _info)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Something went wrong
          </Typography>
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {this.state.error.name}: {this.state.error.message}
          </Alert>
          <Button variant="contained" onClick={() => this.setState({ error: null })}>
            Retry
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}

// ─── Main Component ──────────────────────────────────────────────────

export function FormDialog() {
  const [detail, setDetail] = useState<FormDialogDetail | null>(null)
  const [open, setOpen] = useState(false)

  // Listen for form:open-dialog events
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<FormDialogDetail>
      const data = customEvent.detail

      // Ignore events with unknown formKey — all task entries must have modalComponent
      if (data.formKey && !getFormByKey(data.formKey)) {
        console.warn('[FormDialog] ⚠️ Unknown formKey:', data.formKey, '- no modal registered')
        return
      }

      console.log('[FormDialog] 📩 Received event:', data.formDisplayName, '| formKey:', data.formKey, '| stepId:', data.approvalStepId)
      setDetail(data)
      setOpen(true)
    }

    window.addEventListener(FORM_DIALOG_OPEN_EVENT, handler)
    return () => window.removeEventListener(FORM_DIALOG_OPEN_EVENT, handler)
  }, [])

  // Close the dialog
  const handleClose = useCallback(() => {
    setOpen(false)
    setTimeout(() => setDetail(null), 200)
  }, [])

  // Look up the modal component from the form registry
  const ModalComponent = detail?.formKey
    ? getFormByKey(detail.formKey)?.modalComponent ?? null
    : null

  // Render the modal component when ready
  if (open && detail && ModalComponent) {
    return (
      <ModalErrorBoundary>
        <Suspense
          fallback={
            <Dialog open maxWidth="md" fullWidth>
              <DialogContent sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading task form...
                </Typography>
              </DialogContent>
            </Dialog>
          }
        >
          <ModalComponent
            approvalStepId={detail.approvalStepId!}
            onClose={handleClose}
            DecisionBox={DecisionBox}
          />
        </Suspense>
      </ModalErrorBoundary>
    )
  }

  // Hidden when no event received
  return null
}

export default FormDialog
