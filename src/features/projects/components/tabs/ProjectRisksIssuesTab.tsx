import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  useTheme,
  Button,
  Tabs,
  Tab
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import BugReportIcon from '@mui/icons-material/BugReport'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import LowPriorityIcon from '@mui/icons-material/LowPriority'

import { StatusTag } from '@/components/common'
import type { RiskModel, IssueModel, ProjectModel } from '@/types/dataverse'
import { RiskDetailView } from '@/features/risks/components/RiskDetailView'
import { RiskTable } from '@/features/risks/components/RiskTable'
import { IssueTable } from '@/features/issues/components/IssueTable'
import { fetchMitigationActions } from '@/services/risk-issue.service'

interface ProjectRisksIssuesTabProps {
  risks: RiskModel[]
  issues: IssueModel[]
  project: ProjectModel
  onLogRisk?: () => void
  onLogIssue?: () => void
  selectedRisk: RiskModel | null
  setSelectedRisk: (risk: RiskModel | null) => void
  selectedIssue: IssueModel | null
  setSelectedIssue: (issue: IssueModel | null) => void
}

// Issue Constants matching global layout for the detail view
const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Dependency',
  '1': 'Technical',
}

const RAG_LABELS: Record<string, string> = {
  '2': 'High',
  '0': 'Medium',
  '1': 'Low',
}

const PRIORITY_LABELS: Record<string, string> = {
  '1': 'Critical',
  '0': 'High',
  '2': 'Medium',
  '3': 'Low',
}

const ISSUE_CATEGORY_COLORS: Record<string, string> = {
  '0': 'info.main',
  '1': 'secondary.main',
  '2': 'success.main',
  '3': 'warning.main',
  '4': 'error.main',
}

const RAG_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  '2': 'error',
  '0': 'warning',
  '1': 'success',
}

export const ProjectRisksIssuesTab: React.FC<ProjectRisksIssuesTabProps> = ({
  risks,
  issues,
  project,
  onLogRisk,
  onLogIssue,
  selectedRisk,
  setSelectedRisk,
  selectedIssue,
  setSelectedIssue
}) => {
  const theme = useTheme()

  // Details view states
  const [detailTab, setDetailTab] = useState(0)
  const [mitigationActions, setMitigationActions] = useState<any[]>([])
  const [mitigationLoading, setMitigationLoading] = useState(false)

  // Risks Table filter states
  const [riskCategoryFilter, setRiskCategoryFilter] = useState('all')
  const [riskRagFilter, setRiskRagFilter] = useState('all')
  const [riskStatusFilter, setRiskStatusFilter] = useState('all')

  // Issues Table filter states
  const [issueCategoryFilter, setIssueCategoryFilter] = useState('all')
  const [issueRagFilter, setIssueRagFilter] = useState('all')
  const [issuePriorityFilter, setIssuePriorityFilter] = useState('all')
  const [issueStatusFilter, setIssueStatusFilter] = useState('all')

  useEffect(() => {
    if (selectedRisk?.pm_riskid) {
      setDetailTab(0)
      setMitigationLoading(true)
      fetchMitigationActions(selectedRisk.pm_riskid)
        .then(actions => setMitigationActions(actions || []))
        .catch(() => setMitigationActions([]))
        .finally(() => setMitigationLoading(false))
    }
  }, [selectedRisk?.pm_riskid])

  // Helper to format category for issues
  const getIssueCategoryLabel = (cat?: number | string) => {
    const s = String(cat ?? '')
    return ISSUE_CATEGORY_LABELS[s] || 'Dependency'
  }

  // Helper to get priority label for issues
  const getPriorityLabel = (level?: number | string) => {
    const l = String(level)
    return PRIORITY_LABELS[l] || 'Medium'
  }

  // Inline Risk Detail View (matching RisksPage.tsx layout)
  if (selectedRisk) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Detail Tabs menu matching RisksPage */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={detailTab} onChange={(_, val) => setDetailTab(val)}>
            <Tab label="General Details" />
            <Tab label="Mitigation Actions" />
          </Tabs>
        </Box>

        <RiskDetailView
          selectedRisk={selectedRisk}
          drawerTab={detailTab}
          mitigationActions={mitigationActions}
          mitigationLoading={mitigationLoading}
        />
      </Box>
    )
  }

  // Inline Issue Detail View (matching IssuesPage.tsx layout)
  if (selectedIssue) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
          <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
            {/* Left Column: Description & Resolution details */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    <BugReportIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Description
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.6 }}>
                    {selectedIssue.pm_issuedescription || 'No description provided.'}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} /> Resolution Details
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.6 }}>
                    {selectedIssue.pm_resolutiondetails || 'No resolution details recorded yet.'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Metadata Overview */}
            <Grid 
              size={{ xs: 12, md: 4 }}
              sx={{ 
                borderLeft: { md: `1px solid ${theme.palette.divider}` },
                pl: { md: 4 },
                pt: { xs: 3, md: 0 },
                borderTop: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                Issue Context
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Associated Project</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {project.pm_projectname || '—'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Issue Owner</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedIssue.pm_issueowner || 'Unassigned'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Category</Typography>
                    <StatusTag 
                      label={getIssueCategoryLabel(selectedIssue.pm_issuecategory)} 
                      variant="outlined" 
                      sx={{ mt: 0.5, borderColor: ISSUE_CATEGORY_COLORS[String(selectedIssue.pm_issuecategory ?? '')], color: ISSUE_CATEGORY_COLORS[String(selectedIssue.pm_issuecategory ?? '')] }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Priority</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      {String(selectedIssue.pm_prioritylevel ?? '') === '1' && <NewReleasesIcon fontSize="small" sx={{ color: 'error.main' }} />}
                      {String(selectedIssue.pm_prioritylevel ?? '') === '0' && <PriorityHighIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                      {String(selectedIssue.pm_prioritylevel ?? '') === '2' && <LowPriorityIcon fontSize="small" sx={{ color: 'info.main' }} />}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getPriorityLabel(selectedIssue.pm_prioritylevel)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>RAG Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusTag 
                        label={RAG_LABELS[String(selectedIssue.pm_ragstatus ?? '')] ?? '—'} 
                        color={RAG_COLORS[String(selectedIssue.pm_ragstatus ?? '')] || 'default'} 
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Target Date</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                      {selectedIssue.pm_targetresolutiondate ? new Date(selectedIssue.pm_targetresolutiondate).toLocaleDateString() : '—'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* ── SECTION 1: ORIGINAL STYLE RISK GRID ── */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugReportIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Project Risks
          </Typography>
          {onLogRisk && (
            <Button size="small" variant="contained" color="error" startIcon={<BugReportIcon />} onClick={onLogRisk}>
              Add Risk
            </Button>
          )}
        </Box>

        <RiskTable
          risks={risks}
          loading={false}
          onEdit={() => {}}
          onDelete={() => {}}
          onSelect={setSelectedRisk}
          categoryFilter={riskCategoryFilter}
          setCategoryFilter={setRiskCategoryFilter}
          ragFilter={riskRagFilter}
          setRagFilter={setRiskRagFilter}
          statusFilter={riskStatusFilter}
          setStatusFilter={setRiskStatusFilter}
          openCreate={onLogRisk || (() => {})}
          canEdit={false}
          canDelete={false}
        />
      </Box>

      <Divider />

      {/* ── SECTION 2: ORIGINAL STYLE ISSUES GRID ── */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Project Issues
          </Typography>
          {onLogIssue && (
            <Button size="small" variant="contained" color="warning" startIcon={<WarningAmberIcon />} onClick={onLogIssue}>
              Add Issue
            </Button>
          )}
        </Box>

        <IssueTable
          issues={issues}
          loading={false}
          onEdit={() => {}}
          onDelete={() => {}}
          onSelect={setSelectedIssue}
          categoryFilter={issueCategoryFilter}
          setCategoryFilter={setIssueCategoryFilter}
          ragFilter={issueRagFilter}
          setRagFilter={setIssueRagFilter}
          priorityFilter={issuePriorityFilter}
          setPriorityFilter={setIssuePriorityFilter}
          statusFilter={issueStatusFilter}
          setStatusFilter={setIssueStatusFilter}
          openCreate={onLogIssue || (() => {})}
          canEdit={false}
          canDelete={false}
        />
      </Box>
    </Box>
  )
}
