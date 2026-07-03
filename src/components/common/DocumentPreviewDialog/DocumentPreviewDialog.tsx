import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  CircularProgress,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

interface DocumentPreviewDialogProps {
  open: boolean
  onClose: () => void
  fileName: string
  fileUrl?: string | null // Pre-created object URL (e.g. for staged files)
  fileData?: Uint8Array | null // Stream bytes (e.g. from server)
  onDownload?: () => void
}

export const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  open,
  onClose,
  fileName,
  fileUrl,
  fileData,
  onDownload,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)
  const isPdf = ext === 'pdf'
  const isText = ['txt', 'log', 'json', 'js', 'ts', 'html', 'css', 'md'].includes(ext)

  useEffect(() => {
    if (!open) {
      // Clean up local previewUrl if created here
      if (previewUrl && !fileUrl) {
        window.URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setTextContent(null)
      setError(null)
      return
    }

    if (fileUrl) {
      setPreviewUrl(fileUrl)
      if (isText) {
        setLoading(true)
        fetch(fileUrl)
          .then((res) => res.text())
          .then((text) => setTextContent(text))
          .catch(() => setError('Failed to read text content.'))
          .finally(() => setLoading(false))
      }
      return
    }

    if (fileData) {
      setLoading(true)
      try {
        let mimeType = 'application/octet-stream'
        if (isImage) mimeType = `image/${ext === 'svg' ? 'svg+xml' : ext}`
        else if (isPdf) mimeType = 'application/pdf'
        else if (isText) mimeType = 'text/plain'

        const blob = new Blob([fileData as any], { type: mimeType })
        const url = window.URL.createObjectURL(blob)
        setPreviewUrl(url)

        if (isText) {
          const reader = new FileReader()
          reader.onload = (e) => {
            setTextContent(e.target?.result as string)
            setLoading(false)
          }
          reader.onerror = () => {
            setError('Failed to read text file content.')
            setLoading(false)
          }
          reader.readAsText(blob)
        } else {
          setLoading(false)
        }
      } catch (err) {
        setError('Unable to load document preview.')
        setLoading(false)
      }
    }
  }, [open, fileUrl, fileData, fileName])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
          Preview: {fileName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {onDownload && (
            <IconButton size="small" onClick={onDownload} title="Download File">
              <DownloadIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          <IconButton size="small" onClick={onClose} aria-label="close">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Typography color="error" variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{error}</Typography>
            {onDownload && <Button variant="contained" size="small" startIcon={<DownloadIcon />} onClick={onDownload}>Download File</Button>}
          </Box>
        ) : isImage && previewUrl ? (
          <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', p: 2, overflow: 'auto' }}>
            <img
              src={previewUrl}
              alt={fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
            />
          </Box>
        ) : isPdf && previewUrl ? (
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
            <PictureAsPdfIcon sx={{ fontSize: 80, color: '#ef4444', mb: 2, filter: 'drop-shadow(0 4px 10px rgba(239, 68, 68, 0.3))' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: isDark ? '#f8fafc' : '#0f172a' }}>
              PDF Document
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 450, lineHeight: 1.6 }}>
              For security reasons, your host environment's Content Security Policy (CSP) restricts previewing PDF files directly inside the application interface.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(previewUrl, '_blank')}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  bgcolor: '#ef4444',
                  '&:hover': { bgcolor: '#dc2626' },
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                }}
              >
                Open PDF in New Tab
              </Button>
              {onDownload && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={onDownload}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    color: isDark ? '#cbd5e1' : '#475569',
                    '&:hover': {
                      borderColor: isDark ? '#475569' : '#94a3b8',
                      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  Download PDF
                </Button>
              )}
            </Box>
          </Box>
        ) : isText && textContent !== null ? (
          <Box sx={{ flex: 1, p: 3, overflow: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 13, whiteSpace: 'pre-wrap', bgcolor: isDark ? '#090d16' : '#fafafa', color: isDark ? '#cbd5e1' : '#334155' }}>
            {textContent}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
            <InsertDriveFileIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Preview Not Available
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center', maxWidth: 300 }}>
              Previews are only supported for Images, PDFs, and Text files.
            </Typography>
            {onDownload && (
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={onDownload}>
                Download File
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DocumentPreviewDialog
