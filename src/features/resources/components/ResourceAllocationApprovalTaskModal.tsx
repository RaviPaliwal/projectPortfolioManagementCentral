import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogContent, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Paper, Button, TextField,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import WorkIcon from '@mui/icons-material/Work'
import PersonIcon from '@mui/icons-material/Person'
import DateRangeIcon from '@mui/icons-material/DateRange'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PercentIcon from '@mui/icons-material/Percent'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import { fetchResourceAllocationById, fetchResourceById } from '@/services/resource.service'
import { Pm_projectsService } from '@/generated'
import { unwrapSingle } from '@/services/common'
import type { ResourceAllocationModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'

// ── Props ──────────────────────────────────────────────────────────────

interface ResourceAllocationApprovalTaskModalProps {
  open: boolean
  onClose: () => void
  allocationId: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  DecisionBox?: ComponentType<DecisionBoxProps>
  approvalStepId?: string
}

// ── Date Formatter ─────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (d?: string | null): string => d ? dateFormatter.format(new Date(d)) : '—'

// ── Helpers ────────────────────────────────────────────────────────────

const getDaysBetween = (start: string, end: string): number => {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)))
}

const getDaysElapsed = (start: string): number => {
  const s = new Date(start).getTime()
  const now = Date.now()
  return Math.max(0, Math.round((now - s) / (1000 * 60 * 60 * 24)))
}

// ══════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════

// ── AllocationRing ────────────────────────────────────────────────────
// SVG circular progress ring showing capacity utilization

interface AllocationRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

const AllocationRing: React.FC<AllocationRingProps> = ({ percentage, size = 120, strokeWidth = 8 }) => {
  const theme = useTheme()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(100, Math.max(0, percentage))
  const offset = circumference - (filled / 100) * circumference

  const isDark = theme.palette.mode === 'dark'
  const bgColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const arcColor =
    percentage > 100 ? theme.palette.error.main :
    percentage > 80 ? theme.palette.warning.main :
    theme.palette.success.main

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s ease-in-out',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <Box sx={{ position: 'absolute', textAlign: 'center' }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', lineHeight: 1, color: arcColor }}
        >
          {filled}%
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          Allocated
        </Typography>
      </Box>
    </Box>
  )
}

// ── MetaRow ───────────────────────────────────────────────────────────
// Key-value pair display for sidebar metadata

interface MetaRowProps {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}

const MetaRow: React.FC<MetaRowProps> = ({ icon, label, value, mono }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        fontFamily: mono ? '"JetBrains Mono", monospace' : undefined,
      }}
    >
      {icon}
      {value}
    </Typography>
  </Box>
)

// ── SummaryCard ───────────────────────────────────────────────────────
// Metric summary card for the main panel

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  color?: string
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, subtext, color = 'primary.main' }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 1.5,
      borderRadius: 1.5,
      flex: 1,
      minWidth: 140,
      borderLeft: '3px solid',
      borderLeftColor: color,
      transition: 'all 0.2s ease',
      '&:hover': { boxShadow: 1, borderColor: color },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{ color, mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', mt: 0.25 }}
        >
          {value}
        </Typography>
        {subtext && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            {subtext}
          </Typography>
        )}
      </Box>
    </Box>
  </Paper>
)

// ── Timeline ──────────────────────────────────────────────────────────
// Visual representation of the assignment period with progress bar

interface TimelineProps {
  startDate: string
  endDate: string
}

const Timeline: React.FC<TimelineProps> = ({ startDate, endDate }) => {
  const totalDays = getDaysBetween(startDate, endDate)
  const elapsedDays = getDaysElapsed(startDate)
  const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
  const isActive = new Date(startDate) <= new Date() && new Date(endDate) >= new Date()
  const isPast = new Date(endDate) < new Date()

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {isPast ? 'Completed' : isActive ? 'In Progress' : 'Scheduled'}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
          {elapsedDays}/{totalDays} days
        </Typography>
      </Box>

      {/* Progress track */}
      <Box
        sx={{
          position: 'relative',
          height: 6,
          bgcolor: 'action.hover',
          borderRadius: 3,
          overflow: 'hidden',
          mb: 0.75,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            bgcolor: isPast ? 'success.main' : isActive ? 'primary.main' : 'text.disabled',
            borderRadius: 3,
            transition: 'width 1s ease-in-out',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {formatDate(startDate)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {formatDate(endDate)}
        </Typography>
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export const ResourceAllocationApprovalTaskModal: React.FC<ResourceAllocationApprovalTaskModalProps> = ({
  open, onClose, allocationId, onSuccess, onError,
  DecisionBox: DecisionBoxProp, approvalStepId,
}) => {
  // ── State ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allocation, setAllocation] = useState<ResourceAllocationModel | null>(null)
  const [resourceName, setResourceName] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  // ── Load Data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const alloc = await fetchResourceAllocationById(allocationId)
      if (!alloc) { onError('Resource allocation not found.'); setLoading(false); return }
      setAllocation(alloc)

      // Fetch resource name and project name in parallel
      const namePromises: Promise<void>[] = []

      if (alloc._pm_resource_value) {
        namePromises.push(
          fetchResourceById(alloc._pm_resource_value)
            .then(res => setResourceName(res?.pm_fullname || null))
            .catch(() => setResourceName(null))
        )
      }

      if (alloc._pm_project_value) {
        namePromises.push(
          Pm_projectsService.get(alloc._pm_project_value, { select: ['pm_projectname'] })
            .then(result => {
              const proj = unwrapSingle<any>(result)
              setProjectName(proj?.pm_projectname || null)
            })
            .catch(() => setProjectName(null))
        )
      }

      await Promise.all(namePromises)
    } catch (err) {
      console.error('Failed to load resource allocation', err)
      onError('Failed to load allocation details.')
    } finally { setLoading(false) }
  }, [allocationId, onError])

  useEffect(() => {
    if (open) { loadData(); setNotes('') }
  }, [open, loadData])

  if (!open) return null

  // ── Rendered Values ───────────────────────────────────────────────
  const allocHours = allocation?.pm_allocatedhours ?? 0
  const allocPct = allocation?.pm_allocationpercentage ?? 0
  const isActive = String(allocation?.pm_assignmentstatus) === '0'
  const hasTimeline = !!(allocation?.pm_startdate && allocation?.pm_enddate)

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        },
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.contrastText',
            }}
          >
            <AssignmentIndIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Resource Allocation Review
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {allocation?.pm_assignmentrole || 'Resource Assignment'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="Pending Review"
            color="warning"
            size="small"
            sx={{ fontWeight: 700, borderRadius: 1 }}
          />
          <IconButton size="small" onClick={onClose} disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* ─── Body ───────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={36} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">Loading allocation details...</Typography>
          </Box>
        ) : allocation ? (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 400 }}>
            {/* ─── Sidebar ─────────────────────────────────────── */}
            <Box
              sx={{
                width: { xs: '100%', md: 300 },
                flexShrink: 0,
                p: 2.5,
                borderRight: { md: '1px solid' },
                borderBottom: { xs: '1px solid', md: 'none' },
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              {/* Ring */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <AllocationRing percentage={allocPct} />
              </Box>

              <Divider />

              {/* Meta Info */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <MetaRow
                  icon={<PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                  label="Resource"
                  value={resourceName || allocation._pm_resource_value || '—'}
                />
                <MetaRow
                  icon={<BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                  label="Project"
                  value={projectName || allocation._pm_project_value || '—'}
                />
                <MetaRow
                  icon={<WorkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                  label="Role"
                  value={allocation.pm_assignmentrole || 'Unspecified'}
                />
                <MetaRow
                  icon={<PercentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                  label="Allocation"
                  value={`${allocPct}% (${allocHours}h)`}
                  mono
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Status
                  </Typography>
                  <StatusTag
                    label={isActive ? 'Active' : 'Inactive'}
                    color={isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Divider />

              {/* Instructions */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.06)',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.15)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
                >
                  <ChecklistRtlIcon sx={{ fontSize: 14 }} /> Review Instructions
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}
                >
                  Review the allocation details below — verify hours, role, and project alignment before approving or rejecting.
                </Typography>
              </Box>
            </Box>

            {/* ─── Main Panel ──────────────────────────────────── */}
            <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Summary Cards */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  Allocation Summary
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <SummaryCard
                    icon={<AccessTimeIcon sx={{ fontSize: 20 }} />}
                    label="Allocated Hours"
                    value={`${allocHours}h`}
                    subtext="Per week"
                    color="primary.main"
                  />
                  <SummaryCard
                    icon={<PercentIcon sx={{ fontSize: 20 }} />}
                    label="Allocation %"
                    value={`${allocPct}%`}
                    subtext={allocPct > 100 ? 'Over-allocated' : allocPct > 80 ? 'Near capacity' : 'Available'}
                    color={allocPct > 100 ? 'error.main' : allocPct > 80 ? 'warning.main' : 'success.main'}
                  />
                  <SummaryCard
                    icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
                    label="Status"
                    value={isActive ? 'Active' : 'Inactive'}
                    subtext={isActive ? 'Currently assigned' : 'Not active'}
                    color={isActive ? 'success.main' : 'text.disabled'}
                  />
                </Box>
              </Box>

              {/* Timeline */}
              {hasTimeline && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DateRangeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    Assignment Period
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Timeline
                      startDate={allocation.pm_startdate!}
                      endDate={allocation.pm_enddate!}
                    />
                  </Paper>
                </Box>
              )}

              {/* Details Grid */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WorkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  Assignment Details
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                        Role
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {allocation.pm_assignmentrole || 'Unspecified'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                        Hours
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                        {allocHours}h
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                        Allocation %
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {allocPct}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                        Status
                      </Typography>
                      <StatusTag
                        label={isActive ? 'Active' : 'Inactive'}
                        color={isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    {allocation.pm_startdate && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                          Start Date
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(allocation.pm_startdate)}
                        </Typography>
                      </Box>
                    )}
                    {allocation.pm_enddate && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                          End Date
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(allocation.pm_enddate)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Info Note */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.06)',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}
                >
                  <PersonIcon sx={{ fontSize: 14 }} /> Resource Note
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                  This allocation will be visible in the resource's schedule and demand forecasting once approved.
                  The allocated percentage will be reflected in capacity utilization reports.
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Unable to load allocation details.</Typography>
          </Box>
        )}
      </DialogContent>

      {/* ─── Decision Dock ──────────────────────────────────────── */}
      <Box
        sx={{
          p: 2.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {DecisionBoxProp && approvalStepId ? (
          // DecisionBox already has its own notes textarea + approve/reject buttons
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={async () => {
              setSaving(true)
              return true
            }}
            onDecisionComplete={(decision) => {
              const label = decision === 0 ? 'Approved' : 'Rejected'
              onSuccess(`Resource allocation review completed. Decision: ${label}.`)
              setSaving(false)
              onClose()
            }}
            onDecisionError={(msg) => {
              setSaving(false)
              onError(msg)
            }}
            disabled={loading}
          />
        ) : (
          <>
            {/* Decision Notes — only rendered as fallback when no DecisionBox is provided */}
            <TextField
              label="Decision Notes"
              placeholder="Enter rationale for this decision..."
              multiline
              rows={2}
              size="small"
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving || loading}
              slotProps={{
                input: { sx: { borderRadius: 1.5 } },
                inputLabel: { shrink: true },
              }}
              helperText="These notes will be recorded on the workflow approval step."
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                disabled={saving || loading}
                onClick={() => {
                  setSaving(true)
                  onSuccess('Resource allocation review completed. Decision: Rejected.')
                  setSaving(false)
                  onClose()
                }}
                startIcon={<CancelIcon />}
                sx={{ fontWeight: 600, minWidth: 140, borderRadius: 1.5 }}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={saving || loading}
                onClick={() => {
                  setSaving(true)
                  onSuccess('Resource allocation review completed. Decision: Approved.')
                  setSaving(false)
                  onClose()
                }}
                startIcon={saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <CheckCircleIcon />}
                sx={{
                  fontWeight: 600,
                  minWidth: 140,
                  borderRadius: 1.5,
                  '&:hover': {
                    boxShadow: (theme) => `0 0 20px ${theme.palette.success.main}40`,
                  },
                }}
              >
                {saving ? 'Processing...' : 'Approve'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Dialog>
  )
}

export default ResourceAllocationApprovalTaskModal
