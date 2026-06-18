import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  useTheme,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import VisibilityIcon from '@mui/icons-material/Visibility'

import { useUser } from '@/context/UserContext'
import {
  fetchDocumentsForEntity,
  uploadDocument,
  deleteDocument,
  downloadDocumentFile,
} from '@/services'
import type { Pm_documents } from '@/generated/models/Pm_documentsModel'
import { DocumentPreviewDialog } from '../DocumentPreviewDialog/DocumentPreviewDialog'

// File size formatter utility
const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return 'Unknown size'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// File extension color resolver for a premium look
const getFileColor = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return '#ef4444' // Red
    case 'doc':
    case 'docx':
      return '#3b82f6' // Blue
    case 'xls':
    case 'xlsx':
      return '#22c55e' // Green
    case 'ppt':
    case 'pptx':
      return '#f97316' // Orange
    case 'zip':
    case 'rar':
      return '#a855f7' // Purple
    default:
      return '#64748b' // Slate
  }
}

interface EntityDocumentsTabProps {
  entityId: string
  moduleName: string
  canEdit?: boolean
}

export function EntityDocumentsTab({ entityId, moduleName, canEdit = true }: EntityDocumentsTabProps) {
  const theme = useTheme()
  const { currentUser } = useUser()
  const isDark = theme.palette.mode === 'dark'

  const [documents, setDocuments] = useState<Pm_documents[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete modal state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; docId: string | null; docName: string }>({
    open: false,
    docId: null,
    docName: '',
  })

  // Download state (tracks docId being downloaded)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Preview state
  const [previewState, setPreviewState] = useState<{
    open: boolean
    docId: string
    docName: string
    docData: Uint8Array | null
  }>({
    open: false,
    docId: '',
    docName: '',
    docData: null,
  })

  // ── Load Data ─────────────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    if (!entityId || !moduleName) return
    setLoading(true)
    setError(null)
    try {
      const docs = await fetchDocumentsForEntity(moduleName, entityId)
      setDocuments(docs)
    } catch (err) {
      console.error('[EntityDocumentsTab] Failed to load documents:', err)
      setError('Unable to load documents.')
    } finally {
      setLoading(false)
    }
  }, [entityId, moduleName])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // ── Upload Handlers ───────────────────────────────────────────────────────
  const processUpload = async (files: FileList) => {
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    setSuccess(null)

    const ownerId = currentUser?.systemuserid || ''

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // File size check (e.g. 32MB limit)
        if (file.size > 32 * 1024 * 1024) {
          setError(`File "${file.name}" exceeds the maximum 32MB size limit.`)
          continue
        }

        const uploaded = await uploadDocument(moduleName, entityId, file, ownerId)
        if (!uploaded) {
          setError(`Failed to upload file "${file.name}".`)
        }
      }
      setSuccess('Documents uploaded successfully.')
      await loadDocuments()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('[EntityDocumentsTab] Upload error:', err)
      setError('An error occurred during file upload.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files)
    }
  }

  const triggerFileBrowser = () => {
    fileInputRef.current?.click()
  }

  // ── Download Handler ──────────────────────────────────────────────────────
  const handleDownload = async (docId: string, docName: string) => {
    setDownloadingId(docId)
    setError(null)
    try {
      const data = await downloadDocumentFile(docId)
      if (!data) {
        throw new Error('No data received from file download.')
      }

      // Convert Uint8Array to blob and trigger native download dialog
      const blob = new Blob([data as any], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = docName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[EntityDocumentsTab] Download error:', err)
      setError(`Unable to download file "${docName}".`)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleOpenPreview = async (docId: string, docName: string) => {
    setDownloadingId(docId)
    setError(null)
    try {
      const data = await downloadDocumentFile(docId)
      if (!data) {
        throw new Error('No data received from file download.')
      }
      setPreviewState({
        open: true,
        docId,
        docName,
        docData: data,
      })
    } catch (err) {
      console.error('[EntityDocumentsTab] Preview error:', err)
      setError(`Unable to preview file "${docName}".`)
    } finally {
      setDownloadingId(null)
    }
  }

  // ── Delete Handlers ───────────────────────────────────────────────────────
  const handleOpenDelete = (docId: string, docName: string) => {
    setDeleteDialog({ open: true, docId, docName })
  }

  const handleConfirmDelete = async () => {
    const { docId, docName } = deleteDialog
    if (!docId) return
    setDeleteDialog((prev) => ({ ...prev, open: false }))
    setLoading(true)
    setError(null)
    try {
      const deleted = await deleteDocument(docId)
      if (deleted) {
        setSuccess(`File "${docName}" deleted successfully.`)
        await loadDocuments()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(`Failed to delete file "${docName}".`)
      }
    } catch (err) {
      console.error('[EntityDocumentsTab] Delete error:', err)
      setError(`An error occurred while deleting file "${docName}".`)
    } finally {
      setLoading(false)
    }
  }

  // ── Render States ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ borderRadius: 1.5 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* ── 1. Premium Drag & Drop Area ── */}
      {canEdit && (
        <Paper
          variant="outlined"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileBrowser}
          sx={{
            p: 3,
            borderRadius: 2,
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: dragActive ? 'primary.main' : 'divider',
            bgcolor: dragActive
              ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.04)')
              : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.02)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)',
            },
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
              color: 'text.secondary',
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Drag & drop files here or click to browse
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supports PDF, Word, Excel, PowerPoint, ZIP, or images up to 32MB.
          </Typography>
        </Paper>
      )}

      {/* Uploading Progress */}
      {uploading && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} /> Uploading files...
            </Typography>
          </Box>
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Paper>
      )}

      {/* ── 2. Files List ── */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Documents ({documents.length})
        </Typography>

        {loading && documents.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : documents.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <InsertDriveFileIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              No documents uploaded
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Upload files to attach them as reference materials to this record.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {documents.map((doc) => {
              const fileColor = getFileColor(doc.pm_documenttitle)
              const isDownloading = downloadingId === doc.pm_documentid

              return (
                <Paper
                  key={doc.pm_documentid}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 1.25,
                        bgcolor: fileColor + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: fileColor,
                        flexShrink: 0,
                      }}
                    >
                      <InsertDriveFileIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        title={doc.pm_documenttitle}
                        sx={{
                          fontWeight: 600,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.pm_documenttitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1 }}>
                        <span>{formatFileSize((doc as any).pm_file_size || doc.pm_file?.length)}</span>
                        <span>•</span>
                        <span>
                          {doc.createdon
                            ? new Date(doc.createdon).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    <Tooltip title="Preview Document">
                      <IconButton
                        size="small"
                        disabled={isDownloading}
                        onClick={() => handleOpenPreview(doc.pm_documentid, doc.pm_documenttitle)}
                      >
                        {isDownloading ? <CircularProgress size={18} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download File">
                      <IconButton
                        size="small"
                        disabled={isDownloading}
                        onClick={() => handleDownload(doc.pm_documentid, doc.pm_documenttitle)}
                      >
                        {isDownloading ? <CircularProgress size={18} /> : <DownloadIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                    {canEdit && (
                      <Tooltip title="Delete Document">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDelete(doc.pm_documentid, doc.pm_documenttitle)}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Paper>
              )
            })}
          </Box>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 1.5 } },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <WarningAmberIcon sx={{ color: 'error.main' }} /> Delete Document
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently delete the document{' '}
            <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{deleteDialog.docName}</strong>? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="text" color="inherit" onClick={() => setDeleteDialog((prev) => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} autoFocus sx={{ borderRadius: 1.5 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={previewState.open}
        onClose={() => setPreviewState((prev) => ({ ...prev, open: false, docData: null }))}
        fileName={previewState.docName}
        fileData={previewState.docData}
        onDownload={() => handleDownload(previewState.docId, previewState.docName)}
      />
    </Box>
  )
}

EntityDocumentsTab.displayName = 'EntityDocumentsTab'
export default EntityDocumentsTab
