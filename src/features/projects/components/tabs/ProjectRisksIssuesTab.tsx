import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Paper,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import BugReportIcon from '@mui/icons-material/BugReport'

import { StatusTag } from '@/components/common'
import type { RiskModel, IssueModel } from '@/types/dataverse'
import { RAG_COLORS } from '../../constants'
import { fontSizes } from '@/styles'

interface ProjectRisksIssuesTabProps {
  risks: RiskModel[]
  issues: IssueModel[]
}

export const ProjectRisksIssuesTab: React.FC<ProjectRisksIssuesTabProps> = ({ risks, issues }) => {
  const escalatedRisks = risks.filter(r => r.pm_ragstatus === '2' || r.pm_ragstatus === 2).length
  const criticalIssues = issues.filter((i: any) => i.pm_prioritylevel === '1' || i.pm_prioritylevel === 1).length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Risk & Issue KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'secondary.main' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Total Risks</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{risks.length}</Typography>
          <Typography variant="caption" color="text.secondary">{escalatedRisks} Critical / Escalated</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'warning.main' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Total Issues</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{issues.length}</Typography>
          <Typography variant="caption" color="text.secondary">{criticalIssues} High Priority</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: `3px solid ${escalatedRisks + criticalIssues > 0 ? 'error.main' : 'success.main'}` }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>Health Factor</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: escalatedRisks + criticalIssues > 0 ? 'error.main' : 'success.main' }}>
            {escalatedRisks + criticalIssues === 0 ? 'Good' : escalatedRisks + criticalIssues < 3 ? 'Caution' : 'Critical'}
          </Typography>
        </Paper>
      </Box>

      <Grid container spacing={3}>
        {/* Risks list */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugReportIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Project Risks ({risks.length})
          </Typography>
          {risks.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {risks.map((r) => (
                <Paper key={r.pm_riskid} variant="outlined" sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.15s ease', '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default' } }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS[String(r.pm_ragstatus)] ?? '#6b7280', flexShrink: 0, boxShadow: `0 0 0 2px ${RAG_COLORS[String(r.pm_ragstatus)]}33` }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.pm_risktitle}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>{r.pm_riskowner ?? 'Unassigned'} {r.pm_targetclosedate ? `· Target: ${new Date(r.pm_targetclosedate).toLocaleDateString()}` : ''}</Typography>
                  </Box>
                  <StatusTag label={['Resource','Financial','Legal','Technical','External'][Number(r.pm_riskcategory)] ?? '—'} size="small" variant="outlined" />
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5, textAlign: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
              <Typography variant="body2" color="text.secondary">No risks logged.</Typography>
            </Paper>
          )}
        </Grid>
        {/* Issues list */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Project Issues ({issues.length})
          </Typography>
          {issues.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {issues.map((i: any) => (
                <Paper key={i.pm_issueid} variant="outlined" sx={{ p: 1.75, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.15s ease', '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default' } }}>
                  <ErrorIcon sx={{ fontSize: 16, color: i.pm_prioritylevel === '1' || i.pm_prioritylevel === 1 ? 'error.main' : 'warning.main' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{i.pm_issuetitle}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>{i.pm_issueowner ?? 'Unassigned'} {i.pm_targetresolutiondate ? `· Due: ${new Date(i.pm_targetresolutiondate).toLocaleDateString()}` : ''}</Typography>
                  </Box>
                  <StatusTag label={String(i.pm_issuestatus) === '1' ? 'Resolved' : 'Open'} size="small" color={String(i.pm_issuestatus) === '1' ? 'success' : 'warning'} variant="outlined" />
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5, textAlign: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
              <Typography variant="body2" color="text.secondary">No issues logged.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
