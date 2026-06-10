import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  useTheme,
} from '@mui/material'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { StatusTag } from '@/components/common'
import { navigateToGateReview } from '@/utils/navigation'
import type { GateReviewModel } from '@/types/dataverse'

const GATE_STAGE_LABELS: Record<string, string> = {
  '0': 'Gate 1',
  '1': 'Gate 2',
  '2': 'Gate 3',
  '3': 'Gate 4',
}

interface ProjectGovernanceTabProps {
  gateReviews: GateReviewModel[]
  onSubmitReview?: () => void
}

export const ProjectGovernanceTab: React.FC<ProjectGovernanceTabProps> = ({ gateReviews, onSubmitReview }) => {
  const theme = useTheme()

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
                onClick={() => g.pm_projectgatereviewid && navigateToGateReview(g.pm_projectgatereviewid)}
                sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.pm_gatename}</Typography>
                    <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.4 }} />
                  </Box>
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
      ) : null}

      {/* Gate review action section */}
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <HowToRegIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Governance Gate</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
          Submit this project for a formal gate review. Governance boards will assess project health and decide on progression to the next lifecycle stage.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" size="large" startIcon={<HowToRegIcon />} onClick={onSubmitReview}>
            Submit Gate Review
          </Button>
        </Box>
        <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 1.5, maxWidth: 480, mx: 'auto', bgcolor: theme.palette.action.hover }}>
          <Typography variant="caption" color="text.secondary">
            Gate reviews are critical governance checkpoints. Ensure all Risks, Issues, and Financials are up to date before submitting.
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
