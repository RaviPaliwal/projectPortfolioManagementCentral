import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Link,
  Divider,
  useTheme,
  CircularProgress,
} from '@mui/material'
import { GovernanceReadinessService } from '@/services'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import GavelIcon from '@mui/icons-material/Gavel'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PersonIcon from '@mui/icons-material/Person'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import TimelineIcon from '@mui/icons-material/Timeline'
import DescriptionIcon from '@mui/icons-material/Description'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AssignmentIcon from '@mui/icons-material/Assignment'

import { Breadcrumbs, PageHeader, StatusTag, Button, WorkflowMilestone, ActionIcon } from '@/components/common'
import type { GateReviewModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { MODULE_NAMES } from '@/constants/moduleNames'

// ─── Helpers/Constants (matching GateReviewsPage) ───────────────────────────

const GATE_STAGE_LABELS: Record<string, string> = {
  '0': 'Gate 1',
  '1': 'Gate 2',
  '2': 'Gate 3',
  '3': 'Gate 4',
}

const GATE_STAGE_VARIANTS: Record<string, 'primary' | 'info' | 'warning' | 'success'> = {
  '0': 'primary',
  '1': 'info',
  '2': 'warning',
  '3': 'success',
}

const OUTCOME_LABELS: Record<string, string> = {
  '0': 'Approved',
  '1': 'Conditional',
  '2': 'Not Yet Reviewed',
  '4': 'Rejected',
}

const OUTCOME_COLORS: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  '0': 'success',
  '1': 'warning',
  '2': 'default',
  '4': 'error',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Complete',
  '1': 'Scheduled',
}

const STATUS_COLORS: Record<string, 'default' | 'info'> = {
  '0': 'default',
  '1': 'info',
}

interface GateReview360ViewProps {
  review: GateReviewModel
  onBack: () => void
  onPmoCheck: () => void
  onFinanceReview: () => void
  onBoardDecision: () => void
  onEdit: (review: GateReviewModel) => void
  onDelete: (id: string) => void
  canEdit: boolean
  canDelete: boolean
}

export const GateReview360View: React.FC<GateReview360ViewProps> = ({
  review,
  onBack,
  onPmoCheck,
  onFinanceReview,
  onBoardDecision,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [readiness, setReadiness] = React.useState<any>(null)
  const [loadingReadiness, setLoadingReadiness] = React.useState(false)

  React.useEffect(() => {
    const checkReadiness = async () => {
      const projId = review._pm_project_value
      if (projId) {
        setLoadingReadiness(true)
        try {
          const report = await GovernanceReadinessService.checkProjectReadiness(projId, Number(review.pm_gatestage ?? 0))
          setReadiness(report)
        } catch (e) {
          console.error('Failed to load readiness checks:', e)
        } finally {
          setLoadingReadiness(false)
        }
      }
    }
    checkReadiness()
  }, [review._pm_project_value, review.pm_gatestage])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* ── Breadcrumbs ── */}
      <Breadcrumbs
        items={[
          { label: 'Gate Reviews', path: 'list' },
          { label: review.pm_gatename ?? 'Detail' }
        ]}
        onNavigate={() => onBack()}
      />

      {/* ── Page Header ── */}
      <PageHeader
        title={review.pm_gatename ?? 'Gate Review Detail'}
        subtitle={`Stage: ${GATE_STAGE_LABELS[String(review.pm_gatestage)] || '—'}`}
        actionElement={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <StatusTag label={GATE_STAGE_LABELS[String(review.pm_gatestage)]} color={GATE_STAGE_VARIANTS[String(review.pm_gatestage)]} />
            <StatusTag label={OUTCOME_LABELS[String(review.pm_reviewoutcome)]} color={OUTCOME_COLORS[String(review.pm_reviewoutcome)]} />
            <StatusTag label={STATUS_LABELS[String(review.pm_reviewstatus)]} color={STATUS_COLORS[String(review.pm_reviewstatus)]} />
            {canEdit && (
              <ActionIcon
                icon={<EditIcon />}
                onClick={() => onEdit(review)}
                label="Edit Review"
                color="primary"
              />
            )}
            {canDelete && (
              <ActionIcon
                icon={<DeleteIcon />}
                onClick={() => onDelete(review.pm_projectgatereviewid!)}
                label="Delete Review"
                color="error"
              />
            )}
          </Box>
        }
      />

      {/* ── Approval Workflow Timeline (Full Row below PageHeader) ── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon sx={{ color: 'secondary.main' }} /> Approval Workflow Timeline
        </Typography>
        <WorkflowMilestone
          moduleName={MODULE_NAMES.GATE_REVIEWS.value}
          entityId={review.pm_projectgatereviewid!}
        />
      </Box>

      {/* ── Main Layout Grid ── */}
      <Grid container spacing={3}>
        {/* Left column — Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Review Overview Card */}
            <Paper variant="outlined" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.03 }}>
                <FactCheckIcon sx={{ fontSize: 160 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon sx={{ color: 'primary.main' }} /> Review Overview
              </Typography>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Lead Reviewer
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PersonIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {review.pm_leadreviewer || 'Unassigned'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Review Facilitator</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Scheduled Date
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CalendarMonthIcon sx={{ color: 'info.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {review.pm_plannedreviewdate ? new Date(review.pm_plannedreviewdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Target Date</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Actual Review Date
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {review.pm_actualreviewdate ? new Date(review.pm_actualreviewdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Completion Date</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Documentation
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <OpenInNewIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                    <Box>
                      {review.pm_documentsurl ? (
                        <Link
                          href={review.pm_documentsurl}
                          target="_blank"
                          rel="noopener"
                          sx={{ fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          View Files <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>—</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">Supporting Assets</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Notes & Conditions Grid */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentIcon sx={{ color: 'primary.main', fontSize: 18 }} /> Review Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {review.pm_reviewnotes || 'No review notes have been recorded for this gate review.'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ color: 'warning.main', fontSize: 18 }} /> Review Conditions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {review.pm_reviewconditions || 'No conditions have been attached to this gate review decision.'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Governance Readiness Check Card */}
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FactCheckIcon sx={{ color: 'success.main' }} /> Governance Readiness Check (Gate {Number(review.pm_gatestage ?? 0) + 1})
              </Typography>
              {loadingReadiness ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : readiness ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {readiness.items.map((item: any) => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{
                        mt: 0.25, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        bgcolor: item.status === 'passed' ? 'success.main' : item.status === 'failed' ? 'error.main' : 'warning.main',
                        color: 'common.white', fontSize: fontSizes.xs, fontWeight: 700,
                      }}>
                        {item.status === 'passed' ? '✓' : item.status === 'failed' ? '✗' : '!'}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                        {item.message && (
                          <Typography variant="caption" color={item.status === 'failed' ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mt: 0.25 }}>
                            {item.message}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No readiness information available.</Typography>
              )}
            </Paper>

          </Box>
        </Grid>

        {/* Right column — Context Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 0.5, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
              Hierarchy & Context
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Project
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AccountTreeIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {review.pm_projectcode || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Associated Project</Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Programme
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AccountTreeIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {review.pm_programmename || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Associated Programme</Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Portfolio
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AccountTreeIcon sx={{ color: 'info.main', fontSize: 22 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {review.pm_portfolioname || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Associated Portfolio</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
