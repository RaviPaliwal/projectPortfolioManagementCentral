import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Paper,
  Skeleton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import BugReportIcon from '@mui/icons-material/BugReport'
import DescriptionIcon from '@mui/icons-material/Description'
import CommentIcon from '@mui/icons-material/Comment'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import SendIcon from '@mui/icons-material/Send'
import { fontSizes } from '@/styles'
import { StatusTag, Button } from '@/components/common'
import type { IssueModel } from '@/types/dataverse'
import type { IssueComment } from '@/services/annotation.service'

const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
  '2': 'Resource',
  '3': 'Financial',
  '4': 'Scope',
  '5': 'Quality',
}

const ISSUE_CATEGORY_COLORS: Record<string, 'info' | 'secondary' | 'success' | 'warning' | 'error' | 'primary'> = {
  '0': 'info',
  '1': 'secondary',
  '2': 'success',
  '3': 'warning',
  '4': 'error',
  '5': 'primary',
}

const RAG_LABELS: Record<string, string> = {
  '0': 'Medium',
  '1': 'Low',
  '2': 'High',
}

const RAG_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  '0': 'warning',
  '1': 'success',
  '2': 'error',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Open',
  '1': 'In Progress',
  '2': 'Resolved',
  '3': 'Closed',
}

interface IssueAttachment {
  id: string
  name: string
  size: string
}

interface IssueDetailDialogProps {
  open: boolean
  issue: IssueModel | null
  comments: IssueComment[]
  commentsLoading: boolean
  onClose: () => void
  onAddComment?: (issueId: string, comment: string) => Promise<void>
  projectNameMap?: Record<string, string>
  resourceNameMap?: Record<string, string>
}

export const IssueDetailDialog = ({
  open,
  issue,
  comments,
  commentsLoading,
  onClose,
  onAddComment,
  projectNameMap,
  resourceNameMap,
}: IssueDetailDialogProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'attachments'>('overview')
  const [newComment, setNewComment] = useState('')
  const [isSendingComment, setIsSendingComment] = useState(false)

  // Sample attachments (placeholder — real attachments need SharePoint integration)
  const sampleAttachments: IssueAttachment[] = [
    { id: '1', name: 'site_inspection_report.pdf', size: '2.4 MB' },
    { id: '2', name: 'error_screenshot.png', size: '1.1 MB' },
  ]

  if (!issue) return null

  const handleAddComment = async () => {
    if (!newComment.trim() || !issue.pm_issueid) return
    setIsSendingComment(true)
    try {
      if (onAddComment) {
        await onAddComment(issue.pm_issueid, newComment.trim())
      }
      setNewComment('')
    } finally {
      setIsSendingComment(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <DescriptionIcon sx={{ fontSize: 16 }} /> },
    { key: 'comments' as const, label: 'Comments', icon: <CommentIcon sx={{ fontSize: 16 }} />, count: comments.length },
    { key: 'attachments' as const, label: 'Attachments', icon: <AttachFileIcon sx={{ fontSize: 16 }} />, count: sampleAttachments.length },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { minHeight: 500 },
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BugReportIcon sx={{ color: 'info.main', fontSize: 22 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {issue.pm_issuetitle || 'Untitled Issue'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                <StatusTag
                  label={ISSUE_CATEGORY_LABELS[String(issue.pm_issuecategory ?? '')] ?? '—'}
                  variant="outlined"
                  color={ISSUE_CATEGORY_COLORS[String(issue.pm_issuecategory ?? '')] || 'default'}
                  sx={{
                    fontSize: fontSizes.xs,
                  }}
                />
                <StatusTag
                  label={RAG_LABELS[String(issue.pm_ragstatus ?? '')] ?? '—'}
                  color={RAG_COLORS[String(issue.pm_ragstatus ?? '')] || 'default'}
                />
                <StatusTag
                  label={STATUS_LABELS[String(issue.pm_issuestatus ?? '')] ?? '—'}
                  variant="filled"
                  color={issue.pm_issuestatus === '2' || issue.pm_issuestatus === '3' ? 'success' : 'info'}
                  sx={{
                    fontSize: fontSizes.xs,
                  }}
                />
                {issue.pm_escalationstatus && (
                  <StatusTag label="Escalated" color="error" variant="filled" />
                )}
              </Box>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Custom Tab Bar */}
      <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        {tabs.map(tab => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            startIcon={tab.icon}
            sx={{
              flex: 1,
              py: 1.5,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'primary.main' : 'text.secondary',
              borderBottom: activeTab === tab.key ? '2px solid' : '2px solid transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  px: 0.75,
                  py: 0.1,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: activeTab === tab.key ? 'primary.main' : 'action.hover',
                  color: activeTab === tab.key ? 'primary.contrastText' : 'text.secondary',
                }}
              >
                {tab.count}
              </Box>
            )}
          </Button>
        ))}
      </Box>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {issue.pm_issuedescription || 'No description provided.'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Issue Reference
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
                      {issue.pm_issuereference || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Priority
                    </Typography>
                    <Typography variant="body2">
                      {issue.pm_prioritylevel === '1' ? 'Critical' :
                       issue.pm_prioritylevel === '0' ? 'High' :
                       issue.pm_prioritylevel === '2' ? 'Medium' : 'Low'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Project
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">{projectNameMap?.[(issue._pm_project_value || '').toLowerCase()] || '—'}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Issue Owner
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="body2">{resourceNameMap?.[(issue._pm_issueowner_value || '').toLowerCase()] || issue.pm_issueowner || '—'}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Raised Date
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="body2">
                        {issue.pm_dateraised ? new Date(issue.pm_dateraised).toLocaleDateString() : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Target Resolution Date
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="body2">
                        {issue.pm_targetresolutiondate ? new Date(issue.pm_targetresolutiondate).toLocaleDateString() : '—'}
                      </Typography>
                    </Box>
                  </Box>
                  {issue.pm_actualresolutiondate && (
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                        Actual Resolution Date
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="body2">
                          {new Date(issue.pm_actualresolutiondate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
                {issue.pm_resolutiondetails && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Resolution Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {issue.pm_resolutiondetails}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, minHeight: 200, maxHeight: 400, overflow: 'auto' }}>
              {commentsLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[1, 2].map(i => (
                    <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="30%" height={16} />
                          <Skeleton variant="text" width="100%" height={14} />
                          <Skeleton variant="text" width="80%" height={14} />
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : comments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CommentIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No comments yet
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Start the conversation — add the first comment above.
                  </Typography>
                </Box>
              ) : (
                comments.map(comment => (
                  <Paper key={comment.id} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.main', fontSize: 14 }}>
                        {comment.author.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {comment.author}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {comment.timestamp.toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {comment.text}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))
              )}
            </Box>

            {/* Add Comment */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={3}
                placeholder="Add a comment... (Enter to send, Shift+Enter for new line)"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSendingComment}
              />
              <Button
                variant="contained"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSendingComment}
                sx={{ minWidth: 44, px: 2, height: 40 }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </Button>
            </Box>
          </Box>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && (
          <Box>
            {sampleAttachments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No attachments.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sampleAttachments.map(att => (
                  <Paper key={att.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <AttachFileIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {att.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {att.size}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined">
                        Download
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
            <Button
              variant="outlined"
              startIcon={<AttachFileIcon />}
              sx={{ mt: 2 }}
              fullWidth
              disabled
            >
              Upload Attachment (Coming Soon)
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default IssueDetailDialog
