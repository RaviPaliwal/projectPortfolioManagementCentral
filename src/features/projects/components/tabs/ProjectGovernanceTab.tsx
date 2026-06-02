import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  useTheme,
} from '@mui/material'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import { StatusTag } from '@/components/common'
import type { GateReviewModel } from '@/types/dataverse'

interface ProjectGovernanceTabProps {
  gateReviews: GateReviewModel[]
}

export const ProjectGovernanceTab: React.FC<ProjectGovernanceTabProps> = ({ gateReviews }) => {
  const theme = useTheme()

  return (
    <Box>
      {gateReviews.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Gate Reviews ({gateReviews.length})</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {gateReviews.map((g) => (
              <Paper key={g.pm_projectgatereviewid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.pm_gatename}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stage {g.pm_gatestage} · {g.pm_leadreviewer ? `Reviewer: ${g.pm_leadreviewer}` : ''}
                    {g.pm_plannedreviewdate ? ` · Planned: ${new Date(g.pm_plannedreviewdate).toLocaleDateString()}` : ''}
                    {g.pm_actualreviewdate ? ` · Actual: ${new Date(g.pm_actualreviewdate).toLocaleDateString()}` : ''}
                  </Typography>
                </Box>
                <StatusTag
                  label={String(g.pm_reviewstatus) === '2' ? 'Approved' : String(g.pm_reviewstatus) === '1' ? 'Pending' : String(g.pm_reviewstatus) === '3' ? 'Rejected' : '—'}
                  size="small"
                  color={String(g.pm_reviewstatus) === '2' ? 'success' : String(g.pm_reviewstatus) === '3' ? 'error' : 'default'}
                />
              </Paper>
            ))}
          </Box>
        </Box>
      ) : null}

      {/* Gate review action section */}
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <HowToRegIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Gate Review</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
          Submit this project for a formal gate review by the PMO. This will change the project phase and initiate an approval workflow.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" size="large" startIcon={<HowToRegIcon />}>
            Submit Gate Review
          </Button>
          <Button variant="outlined" size="large">
            Request Phase Change
          </Button>
        </Box>
        <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 1.5, maxWidth: 480, mx: 'auto', bgcolor: theme.palette.action.hover }}>
          <Typography variant="caption" color="text.secondary">
            Gate reviews require PMO approval before proceeding. A workflow instance will be created and assigned to the portfolio director.
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
