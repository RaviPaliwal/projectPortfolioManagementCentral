import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  useTheme,
  alpha,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import BugReportIcon from '@mui/icons-material/BugReport'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CategoryIcon from '@mui/icons-material/Category'
import InfoIcon from '@mui/icons-material/Info'
import FlagIcon from '@mui/icons-material/Flag'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import LowPriorityIcon from '@mui/icons-material/LowPriority'

import { StatusTag, SearchFilterBar } from '@/components/common'
import type { RiskModel, IssueModel, ProjectModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { RiskDetailView } from '@/features/risks/components/RiskDetailView'
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

// Issue Constants matching IssuesPage.tsx
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
  const isDark = theme.palette.mode === 'dark'

  // Risks Details state
  const [detailTab, setDetailTab] = useState(0)
  const [mitigationActions, setMitigationActions] = useState<any[]>([])
  const [mitigationLoading, setMitigationLoading] = useState(false)

  // Risks list filtering/pagination state
  const [riskSearch, setRiskSearch] = useState('')
  const [riskCategory, setRiskCategory] = useState('ALL')
  const [riskRag, setRiskRag] = useState('ALL')
  const [riskPage, setRiskPage] = useState(0)
  const [riskRowsPerPage, setRiskRowsPerPage] = useState(5)

  // Issues list filtering/pagination state
  const [issueSearch, setIssueSearch] = useState('')
  const [issueCategory, setIssueCategory] = useState('ALL')
  const [issueRag, setIssueRag] = useState('ALL')
  const [issuePage, setIssuePage] = useState(0)
  const [issueRowsPerPage, setIssueRowsPerPage] = useState(5)

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

  const escalatedRisks = risks.filter(r => r.pm_ragstatus === '2' || r.pm_ragstatus === 2).length
  const criticalIssues = issues.filter((i: any) => i.pm_prioritylevel === '1' || i.pm_prioritylevel === 1).length

  // Helper to format category for risks
  const getRiskCategoryLabel = (cat?: number | string) => {
    const idx = Number(cat)
    return ['Resource', 'Financial', 'Legal', 'Technical', 'External'][idx] || 'General'
  }

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
    const pLevel = String(selectedIssue.pm_prioritylevel)
    const isCritical = pLevel === '1' || pLevel === 'high' || pLevel === 'critical'
    const statusVal = String(selectedIssue.pm_issuestatus)
    const isOpen = statusVal !== '1' // 1 is resolved

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

  // Filter in-memory arrays based on search/filter state
  const filteredRisks = risks.filter(r => {
    const sTerm = riskSearch.toLowerCase()
    const matchesSearch = !sTerm ||
      (r.pm_risktitle ?? '').toLowerCase().includes(sTerm) ||
      (r.pm_riskdescription ?? '').toLowerCase().includes(sTerm) ||
      (r.pm_riskownername ?? '').toLowerCase().includes(sTerm)

    const matchesCategory = riskCategory === 'ALL' || String(r.pm_riskcategory) === riskCategory
    const matchesRag = riskRag === 'ALL' || String(r.pm_ragstatus) === riskRag

    return matchesSearch && matchesCategory && matchesRag
  })

  const filteredIssues = issues.filter(i => {
    const sTerm = issueSearch.toLowerCase()
    const matchesSearch = !sTerm ||
      (i.pm_issuetitle ?? '').toLowerCase().includes(sTerm) ||
      (i.pm_issuedescription ?? '').toLowerCase().includes(sTerm) ||
      (i.pm_issueowner ?? '').toLowerCase().includes(sTerm)

    const matchesCategory = issueCategory === 'ALL' || String(i.pm_issuecategory) === issueCategory
    const matchesRag = issueRag === 'ALL' || String(i.pm_ragstatus) === issueRag

    return matchesSearch && matchesCategory && matchesRag
  })

  // Pagination slicing
  const paginatedRisks = filteredRisks.slice(
    riskPage * riskRowsPerPage,
    riskPage * riskRowsPerPage + riskRowsPerPage
  )

  const paginatedIssues = filteredIssues.slice(
    issuePage * issueRowsPerPage,
    issuePage * issueRowsPerPage + issueRowsPerPage
  )

  // Options for Dropdowns
  const riskCategoryOptions = [
    { value: 'ALL', label: 'All Categories' },
    { value: '0', label: 'Resource' },
    { value: '1', label: 'Financial' },
    { value: '2', label: 'Legal' },
    { value: '3', label: 'Technical' },
    { value: '4', label: 'External' }
  ]

  const riskRagOptions = [
    { value: 'ALL', label: 'All RAGs' },
    { value: '2', label: 'Red (High)' },
    { value: '0', label: 'Amber (Medium)' },
    { value: '1', label: 'Green (Low)' }
  ]

  const issueCategoryOptions = [
    { value: 'ALL', label: 'All Categories' },
    { value: '0', label: 'Dependency' },
    { value: '1', label: 'Technical' }
  ]

  const issueRagOptions = [
    { value: 'ALL', label: 'All RAGs' },
    { value: '2', label: 'High' },
    { value: '0', label: 'Medium' },
    { value: '1', label: 'Low' }
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4.5 }}>
      {/* ── SECTION 1: RISKS GRID ── */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugReportIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Project Risks ({filteredRisks.length})
          </Typography>
          {onLogRisk && (
            <Button size="small" variant="outlined" color="error" startIcon={<ErrorIcon />} onClick={onLogRisk}>
              Add Risk
            </Button>
          )}
        </Box>

        <SearchFilterBar
          searchQuery={riskSearch}
          onSearchChange={setRiskSearch}
          searchPlaceholder="Search risks..."
          filterValue={riskCategory}
          onFilterChange={setRiskCategory}
          filterLabel="Category"
          filterOptions={riskCategoryOptions}
          secondaryFilterValue={riskRag}
          onSecondaryFilterChange={setRiskRag}
          secondaryFilterLabel="RAG Status"
          secondaryFilterOptions={riskRagOptions}
          onClear={() => { setRiskSearch(''); setRiskCategory('ALL'); setRiskRag('ALL') }}
          sx={{ mb: 2 }}
        />

        {paginatedRisks.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Owner</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Inherent Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Residual Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">RAG Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Target Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRisks.map((r) => {
                  const ragVal = String(r.pm_ragstatus)
                  const inherent = Number(r.pm_inherentprobability ?? 0) * Number(r.pm_inherentimpact ?? 0)
                  const residual = Number(r.pm_residualprobability ?? 0) * Number(r.pm_residualimpact ?? 0)

                  return (
                    <TableRow
                      key={r.pm_riskid}
                      hover
                      onClick={() => setSelectedRisk(r)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{r.pm_risktitle}</TableCell>
                      <TableCell><StatusTag label={getRiskCategoryLabel(r.pm_riskcategory)} size="small" variant="outlined" /></TableCell>
                      <TableCell>{r.pm_riskownername || 'Unassigned'}</TableCell>
                      <TableCell align="center" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {inherent > 0 ? inherent : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {residual > 0 ? residual : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <StatusTag
                          label={RAG_LABELS[ragVal] ?? '—'}
                          color={RAG_COLORS[ragVal]}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {r.pm_targetclosedate ? new Date(r.pm_targetclosedate).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredRisks.length}
              rowsPerPage={riskRowsPerPage}
              page={riskPage}
              onPageChange={(_, p) => setRiskPage(p)}
              onRowsPerPageChange={(e) => { setRiskRowsPerPage(parseInt(e.target.value, 10)); setRiskPage(0) }}
              rowsPerPageOptions={[5, 10, 20]}
            />
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5, textAlign: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">No risks match the active search filters.</Typography>
          </Paper>
        )}
      </Box>

      <Divider />

      {/* ── SECTION 2: ISSUES GRID ── */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Project Issues ({filteredIssues.length})
          </Typography>
          {onLogIssue && (
            <Button size="small" variant="outlined" color="warning" startIcon={<WarningAmberIcon />} onClick={onLogIssue}>
              Add Issue
            </Button>
          )}
        </Box>

        <SearchFilterBar
          searchQuery={issueSearch}
          onSearchChange={setIssueSearch}
          searchPlaceholder="Search issues..."
          filterValue={issueCategory}
          onFilterChange={setIssueCategory}
          filterLabel="Category"
          filterOptions={issueCategoryOptions}
          secondaryFilterValue={issueRag}
          onSecondaryFilterChange={setIssueRag}
          secondaryFilterLabel="RAG Status"
          secondaryFilterOptions={issueRagOptions}
          onClear={() => { setIssueSearch(''); setIssueCategory('ALL'); setIssueRag('ALL') }}
          sx={{ mb: 2 }}
        />

        {paginatedIssues.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Owner</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">RAG Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Target Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedIssues.map((i) => {
                  const ragVal = String(i.pm_ragstatus)

                  return (
                    <TableRow
                      key={i.pm_issueid}
                      hover
                      onClick={() => setSelectedIssue(i)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{i.pm_issuetitle}</TableCell>
                      <TableCell><StatusTag label={getIssueCategoryLabel(i.pm_issuecategory)} size="small" variant="outlined" /></TableCell>
                      <TableCell>{i.pm_issueowner || 'Unassigned'}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          {String(i.pm_prioritylevel ?? '') === '1' && <NewReleasesIcon fontSize="small" sx={{ color: 'error.main' }} />}
                          {String(i.pm_prioritylevel ?? '') === '0' && <PriorityHighIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                          {String(i.pm_prioritylevel ?? '') === '2' && <LowPriorityIcon fontSize="small" sx={{ color: 'info.main' }} />}
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {getPriorityLabel(i.pm_prioritylevel)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <StatusTag
                          label={RAG_LABELS[ragVal] ?? '—'}
                          color={RAG_COLORS[ragVal]}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {i.pm_targetresolutiondate ? new Date(i.pm_targetresolutiondate).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredIssues.length}
              rowsPerPage={issueRowsPerPage}
              page={issuePage}
              onPageChange={(_, p) => setIssuePage(p)}
              onRowsPerPageChange={(e) => { setIssueRowsPerPage(parseInt(e.target.value, 10)); setIssuePage(0) }}
              rowsPerPageOptions={[5, 10, 20]}
            />
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5, textAlign: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">No issues match the active search filters.</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
