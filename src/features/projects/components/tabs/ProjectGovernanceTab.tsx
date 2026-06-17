import React from 'react'
import {
  Box,
  Typography,
  Paper,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import { StatusTag } from '@/components/common'
import type { GateReviewModel } from '@/types/dataverse'

const GATE_STAGE_LABELS: Record<string, string> = {
  '0': 'Gate 1',
  '1': 'Gate 2',
  '2': 'Gate 3',
  '3': 'Gate 4',
}

interface ProjectGovernanceTabProps {
  gateReviews: GateReviewModel[]
  onNavigateToGateReview?: (gateReview?: GateReviewModel) => void
}

export const ProjectGovernanceTab: React.FC<ProjectGovernanceTabProps> = ({ gateReviews, onNavigateToGateReview }) => {
  return (
    <Box>
      {gateReviews.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Gate Reviews ({gateReviews.length})</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {gateReviews.map((g) => (
              <Paper
                key={g.pm_projectgatereviewid}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: onNavigateToGateReview ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  '&:hover': onNavigateToGateReview ? { bgcolor: 'action.hover', borderColor: 'primary.main' } : {},
                }}
                onClick={() => onNavigateToGateReview?.(g)}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {g.pm_gatename}
                    {onNavigateToGateReview && <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle', color: 'text.disabled' }} />}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {GATE_STAGE_LABELS[String(g.pm_gatestage)] || `Stage ${g.pm_gatestage}`} · {g.pm_leadreviewer ? `Reviewer: ${g.pm_leadreviewer}` : ''}
                    {g.pm_plannedreviewdate ? ` · Planned: ${new Date(g.pm_plannedreviewdate).toLocaleDateString()}` : ''}
                    {g.pm_actualreviewdate ? ` · Actual: ${new Date(g.pm_actualreviewdate).toLocaleDateString()}` : ''}
                  </Typography>
                </Box>
                <StatusTag
                  label={String(g.pm_reviewstatus) === '0' ? (String(g.pm_reviewoutcome) === '0' ? 'Approved' : 'Conditional') : 'Scheduled'}
                  size="small"
                  color={String(g.pm_reviewstatus) === '0' ? (String(g.pm_reviewoutcome) === '0' ? 'success' : 'warning') : 'info'}
                />
              </Paper>
            ))}
          </Box>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <HowToRegIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
            No gate reviews yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Gate reviews will appear here once submitted for this project.
          </Typography>
        </Box>
      )}
    </Box>
  )
}
