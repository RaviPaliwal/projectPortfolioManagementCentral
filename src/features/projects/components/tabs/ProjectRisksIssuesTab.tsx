import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Paper,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { StatusTag } from '@/components/common'
import type { RiskModel, IssueModel } from '@/types/dataverse'
import { RAG_COLORS } from '../../constants'

interface ProjectRisksIssuesTabProps {
  risks: RiskModel[]
  issues: IssueModel[]
}

export const ProjectRisksIssuesTab: React.FC<ProjectRisksIssuesTabProps> = ({ risks, issues }) => {
  return (
    <Grid container spacing={2}>
      {/* Risks list */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Risks ({risks.length})
        </Typography>
        {risks.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {risks.map((r) => (
              <Paper key={r.pm_riskid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS[String(r.pm_ragstatus)] ?? '#6b7280', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.pm_risktitle}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.pm_riskowner ?? 'Unassigned'} {r.pm_targetclosedate ? `· Target: ${new Date(r.pm_targetclosedate).toLocaleDateString()}` : ''}</Typography>
                </Box>
                <StatusTag label={['Resource','Financial','Legal','Technical','External'][Number(r.pm_riskcategory)] ?? '—'} size="small" />
              </Paper>
            ))}
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.15, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No risks logged.</Typography>
          </Paper>
        )}
      </Grid>
      {/* Issues list */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Issues ({issues.length})
        </Typography>
        {issues.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {issues.map((i: any) => (
              <Paper key={i.pm_issueid} variant="outlined" sx={{ p: 1.5, borderRadius: 1.15, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <WarningAmberIcon sx={{ fontSize: 16, color: i.pm_prioritylevel === '1' || i.pm_prioritylevel === 1 ? '#ef4444' : '#f59e0b' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{i.pm_issuetitle}</Typography>
                  <Typography variant="caption" color="text.secondary">{i.pm_issueowner ?? 'Unassigned'} {i.pm_targetresolutiondate ? `· Due: ${new Date(i.pm_targetresolutiondate).toLocaleDateString()}` : ''}</Typography>
                </Box>
                <StatusTag label={String(i.pm_issuestatus) === '1' ? 'Resolved' : 'Open'} size="small" color={String(i.pm_issuestatus) === '1' ? 'success' : 'default'} />
              </Paper>
            ))}
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.15, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No issues logged.</Typography>
          </Paper>
        )}
      </Grid>
    </Grid>
  )
}
