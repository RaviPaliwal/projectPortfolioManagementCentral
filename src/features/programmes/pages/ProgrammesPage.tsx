import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AddIcon from '@mui/icons-material/Add'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import DescriptionIcon from '@mui/icons-material/Description'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EditIcon from '@mui/icons-material/Edit'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

import { fetchProgrammeDetails, fetchPortfolioHierarchy } from '@/services'
import {
  StatusChip,
  StatusTag,
  PageHeader,
  KpiCardRow,
  HealthSplitBar,
  VarianceDisplay,
  SearchFilterBar,
  TabPanel,
  TableFooter,
  TableShell,
  ExportButton,
  Breadcrumbs,
  ActionIcon,
} from '@/components/common'
import type { ExportColumn } from '@/utils/exportUtils'
import { fontSizes } from '@/styles'
import type { ProgrammeModel, ProjectModel, RiskModel, IssueModel } from '@/types/dataverse'
import type { KpiCardItem, FilterOption } from '@/components/common'

// Sub-components
import { ProgrammeFormDialog } from '../components/ProgrammeFormDialog'
import { navigateToProject, navigateToRisk, navigateToIssue } from '@/utils/navigation'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { normalizeLookupId } from '@/services'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// ── Export Columns ────────────────────────────────────────────────────────────────
const programmeExportColumns: ExportColumn[] = [
  { key: 'pm_programmename', label: 'Programme Name' },
  { key: 'pm_programmemanagername', label: 'Manager' },
  { key: 'pm_sponsorname', label: 'Sponsor' },
  { key: 'pm_portfolioname', label: 'Portfolio' },
  { key: 'pm_businessunit', label: 'Business Unit' },
  { key: 'pm_programmephase', label: 'Phase', format: (v) => ['Delivery', 'Planning', 'Initiation'][Number(v)] ?? '' },
  { key: 'pm_ragstatus', label: 'RAG', format: (v) => ['Amber', 'Green', 'Red'][Number(v)] ?? '' },
  { key: 'pm_budgeteur', label: 'Budget', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_actualspendeur', label: 'Actual Spend', format: (v) => v?.toLocaleString() ?? '' },
  { key: 'pm_startdate', label: 'Start Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
  { key: 'pm_enddate', label: 'End Date', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RISK_CATEGORY_LABELS: Record<string, string> = {
  '0': 'Resource',
  '1': 'Financial',
  '2': 'Legal',
  '3': 'Technical',
  '4': 'External',
}

const ISSUE_PRIORITY_LABELS: Record<string, string> = {
  '0': 'High',
  '1': 'Critical',
  '2': 'Medium',
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProgrammesPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ── Data State ─────────────────────────────────────────────────────────────
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [portfolios, setPortfolios] = useState<{ id: string; name: string; budget: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── List View State ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [ragFilter, setRagFilter] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  type SortField = 'name' | 'phase' | 'rag' | 'sponsor' | 'manager' | 'portfolio' | 'budget' | 'actual' | 'variance' | 'bizunit'
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'name', dir: 'asc' })

  // ── Detail View State ──────────────────────────────────────────────────────
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<{
    programme: ProgrammeModel | null
    projects: ProjectModel[]
    risks: RiskModel[]
    issues: IssueModel[]
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState(0)

  // ── Create/Edit Modal State ────────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingProgramme, setEditingProgramme] = useState<ProgrammeModel | null>(null)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const hierarchy = await fetchPortfolioHierarchy()
      setProgrammes(hierarchy.programmes)
      setPortfolios(
        hierarchy.portfolios
          .filter((p) => p.pm_portfolioid && p.pm_portfolioname)
          .map((p) => ({ id: p.pm_portfolioid!, name: p.pm_portfolioname!, budget: p.pm_approvedbudgeteur ?? 0 }))
      )
    } catch {
      setError('Unable to load programme data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Detail Loading ────────────────────────────────────────────────────────
  const openDetail = useCallback(async (programmeId: string) => {
    setSelectedProgrammeId(programmeId)
    setDetailLoading(true)
    setDetailTab(0)
    try {
      const detail = await fetchProgrammeDetails(programmeId)
      setDetailData(detail)
    } catch {
      setError('Unable to load programme details.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setSelectedProgrammeId(null)
    setDetailData(null)
    setDetailTab(0)
  }, [])

  // Auto-navigate to preselected programme from cross-linking
  useEffect(() => {
    if (!loading && programmes.length > 0) {
      const preselectedId = sessionStorage.getItem('preselectProgrammeId')
      if (preselectedId) {
        sessionStorage.removeItem('preselectProgrammeId')
        const programme = programmes.find(p => normalizeLookupId(p.pm_programmeid) === normalizeLookupId(preselectedId))
        if (programme?.pm_programmeid) openDetail(programme.pm_programmeid)
      }
    }
  }, [loading, programmes, openDetail])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSuccess = (freshProgrammes: ProgrammeModel[]) => {
    setProgrammes(freshProgrammes)
    if (selectedProgrammeId) {
      openDetail(selectedProgrammeId)
    }
  }

  const openCreateForm = () => {
    setEditingProgramme(null)
    setShowFormModal(true)
  }

  const openEditForm = (programme: ProgrammeModel) => {
    setEditingProgramme(programme)
    setShowFormModal(true)
  }

  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
    }))
  }

  const hasActiveFilters = !!(searchQuery || portfolioFilter !== 'all' || phaseFilter || ragFilter || minBudget || maxBudget)

  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    setPortfolioFilter('all')
    setPhaseFilter('')
    setRagFilter('')
    setMinBudget('')
    setMaxBudget('')
    setPage(0)
  }, [])

  // ── Derived Data ──────────────────────────────────────────────────────────
  const filteredProgrammes = useMemo(() => {
    let list = programmes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.pm_programmename?.toLowerCase().includes(q) ||
        p.pm_programmemanagername?.toLowerCase().includes(q) ||
        p.pm_sponsorname?.toLowerCase().includes(q) ||
        p.pm_portfolioname?.toLowerCase().includes(q)
      )
    }
    if (portfolioFilter !== 'all') {
      list = list.filter(p => p._pm_portfolio_value === portfolioFilter)
    }
    if (phaseFilter) {
      list = list.filter(p => String(p.pm_programmephase ?? '') === phaseFilter)
    }
    if (ragFilter) {
      list = list.filter(p => String(p.pm_ragstatus ?? '') === ragFilter)
    }
    if (minBudget) {
      const min = parseFloat(minBudget)
      if (!isNaN(min)) list = list.filter(p => (p.pm_budgeteur ?? 0) >= min)
    }
    if (maxBudget) {
      const max = parseFloat(maxBudget)
      if (!isNaN(max)) list = list.filter(p => (p.pm_budgeteur ?? 0) <= max)
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name': cmp = (a.pm_programmename ?? '').localeCompare(b.pm_programmename ?? ''); break
        case 'phase': cmp = Number(a.pm_programmephase ?? 0) - Number(b.pm_programmephase ?? 0); break
        case 'rag': cmp = Number(a.pm_ragstatus ?? 0) - Number(b.pm_ragstatus ?? 0); break
        case 'manager': cmp = (a.pm_programmemanagername ?? '').localeCompare(b.pm_programmemanagername ?? ''); break
        case 'portfolio': cmp = (a.pm_portfolioname ?? '').localeCompare(b.pm_portfolioname ?? ''); break
        case 'budget': cmp = (a.pm_budgeteur ?? 0) - (b.pm_budgeteur ?? 0); break
        case 'actual': cmp = (a.pm_actualspendeur ?? 0) - (b.pm_actualspendeur ?? 0); break
        case 'variance': cmp = ((a.pm_budgeteur ?? 0) - (a.pm_actualspendeur ?? 0)) - ((b.pm_budgeteur ?? 0) - (b.pm_actualspendeur ?? 0)); break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [programmes, searchQuery, portfolioFilter, phaseFilter, ragFilter, minBudget, maxBudget, sort])

  const paginatedProgrammes = useMemo(() =>
    filteredProgrammes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    , [filteredProgrammes, page, rowsPerPage])

  const kpiData = useMemo(() => {
    const totalBudget = programmes.reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)
    const totalActual = programmes.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)
    let green = 0, amber = 0, red = 0
    for (const p of programmes) {
      const rag = String(p.pm_ragstatus)
      if (rag === '1') green++
      else if (rag === '0') amber++
      else if (rag === '2') red++
    }
    return { totalBudget, totalActual, green, amber, red, count: programmes.length }
  }, [programmes])

  const kpiItems: KpiCardItem[] = [
    { label: 'Total Programmes', value: kpiData.count, icon: <AccountTreeIcon />, color: 'primary.main' },
    { label: 'Green Health', value: kpiData.green, icon: <CheckCircleIcon />, color: 'success.main' },
    { label: 'Amber Health', value: kpiData.amber, icon: <GppMaybeIcon />, color: 'warning.main' },
    { label: 'Red Health', value: kpiData.red, icon: <ErrorIcon />, color: 'error.main' },
    { label: 'Total Budget', value: currencyFormatter.format(kpiData.totalBudget), icon: <AccountBalanceWalletIcon />, color: 'primary.main' },
    { label: 'Total Actual', value: currencyFormatter.format(kpiData.totalActual), icon: <TrendingDownIcon />, color: 'warning.main' },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────
  if (selectedProgrammeId && detailData) {
    const prog = detailData.programme
    const detailProjects = detailData.projects
    const detailRisks = detailData.risks
    const detailIssues = detailData.issues

    return (
      <Box>
        <Breadcrumbs
          items={[{ label: 'Programmes', path: 'list' }, { label: prog?.pm_programmename ?? 'Detail' }]}
          onNavigate={() => closeDetail()}
        />
        <PageHeader
          title={prog?.pm_programmename ?? 'Programme Detail'}
          subtitle={prog?.pm_programmemanagername ? `Manager: ${prog.pm_programmemanagername}` : undefined}
          actionElement={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <ActionIcon icon={<EditIcon />} onClick={() => prog && openEditForm(prog)} label="Edit Programme" color="primary" />
              <StatusChip status={prog?.pm_ragstatus} type="rag" size="small" />
              <StatusChip status={prog?.pm_programmephase} type="prog_phase" size="small" />
              {prog?.pm_portfolioname && <StatusTag label={prog.pm_portfolioname} size="small" color="primary" variant="outlined" />}
            </Box>
          }
        />
        <Paper sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
          <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Overview" />
            <Tab label={`Projects (${detailProjects.length})`} />
            <Tab label="Financials" />
            <Tab label={`Risks & Issues (${detailRisks.length + detailIssues.length})`} />
            <Tab label="Tasks" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            <TabPanel value={detailTab} index={0}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon sx={{ fontSize: 18 }} /> Details
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Phase</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{['Delivery', 'Planning', 'Initiation'][Number(prog?.pm_programmephase)] ?? '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Manager</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_programmemanagername || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Sponsor</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_sponsorname || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Business Unit</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{prog?.pm_businessunit || '—'}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LightbulbIcon sx={{ fontSize: 18 }} /> Objectives
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{prog?.pm_programmedescription || 'No description provided.'}</Typography>
                  </Paper>
                </Grid>

                {/* Linked Projects Summary */}
                <Grid size={{ xs: 12 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountTreeIcon sx={{ fontSize: 18 }} /> Linked Projects ({detailProjects.length})
                    </Typography>
                    {detailProjects.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {detailProjects.slice(0, 10).map((proj) => (
                          <Paper
                            key={proj.pm_projectid}
                            variant="outlined"
                            sx={{
                              p: 1.5, borderRadius: 1.5, cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                            }}
                            onClick={() => proj.pm_projectid && navigateToProject(proj.pm_projectid)}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {proj.pm_projectname}
                                  <OpenInNewIcon sx={{ fontSize: 12, color: 'primary.main', opacity: 0.5 }} />
                                </Typography>
                                {proj.pm_projectcode && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                    {proj.pm_projectcode}
                                  </Typography>
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                                <StatusChip status={proj.pm_projectphase} type="phase" size="small" />
                                <StatusChip status={proj.pm_ragstatus} type="rag" size="small" />
                                {proj.pm_percentcomplete != null && (
                                  <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace', color: proj.pm_percentcomplete >= 100 ? 'success.main' : 'text.secondary' }}>
                                    {proj.pm_percentcomplete}%
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                        {detailProjects.length > 10 && (
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5 }}>
                            + {detailProjects.length - 10} more project{detailProjects.length - 10 !== 1 ? 's' : ''} — switch to the Projects tab for the full list
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No projects linked to this programme.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={detailTab} index={1}>
              {detailProjects.length > 0 ? (
                <TableContainer sx={{ maxHeight: 420, borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Project Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Phase</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>RAG</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>% Complete</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Budget</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailProjects.map((proj) => (
                        <TableRow key={proj.pm_projectid} hover sx={{ cursor: 'pointer' }} onClick={() => proj.pm_projectid && navigateToProject(proj.pm_projectid)}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {proj.pm_projectname}
                              <OpenInNewIcon sx={{ fontSize: 12, color: 'primary.main', opacity: 0.5 }} />
                            </Typography>
                          </TableCell>
                          <TableCell><StatusChip status={proj.pm_projectphase} type="phase" size="small" /></TableCell>
                          <TableCell><StatusChip status={proj.pm_ragstatus} type="rag" size="small" /></TableCell>
                          <TableCell align="right">{proj.pm_percentcomplete}%</TableCell>
                          <TableCell align="right">{currencyFormatter.format(proj.pm_approvedbudgeteur ?? 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">No projects linked.</Typography></Box>
              )}
            </TabPanel>

            <TabPanel value={detailTab} index={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Total Budget</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{currencyFormatter.format(prog?.pm_budgeteur ?? 0)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{currencyFormatter.format(prog?.pm_actualspendeur ?? 0)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Variance</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: ((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0)) < 0 ? 'error.main' : 'success.main' }}>
                    {currencyFormatter.format((prog?.pm_budgeteur ?? 0) - (prog?.pm_actualspendeur ?? 0))}
                  </Typography>
                </Paper>
              </Box>
            </TabPanel>

            <TabPanel value={detailTab} index={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Escalated Risks</Typography>
                  {detailRisks.length > 0 ? detailRisks.map(r => (
                    <Paper key={r.pm_riskid} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'error.main', cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } }} onClick={() => r.pm_riskid && navigateToRisk(r.pm_riskid)}>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>{r.pm_risktitle}<OpenInNewIcon sx={{ fontSize: 12, color: 'primary.main', opacity: 0.5 }} /></Typography>
                    </Paper>
                  )) : <Typography variant="caption" color="text.secondary">No risks.</Typography>}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Issues</Typography>
                  {detailIssues.length > 0 ? detailIssues.map(i => (
                    <Paper key={i.pm_issueid} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'warning.main', cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } }} onClick={() => i.pm_issueid && navigateToIssue(i.pm_issueid)}>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>{i.pm_issuetitle}<OpenInNewIcon sx={{ fontSize: 12, color: 'primary.main', opacity: 0.5 }} /></Typography>
                    </Paper>
                  )) : <Typography variant="caption" color="text.secondary">No issues.</Typography>}
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={detailTab} index={4}>
              <EntityApprovalTasks
                entityId={selectedProgrammeId}
                moduleName={MODULE_NAMES.PROGRAMMES.value}
                entityLabel="Programme"
                tabValue={detailTab}
                index={4}
              />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Programmes"
        subtitle="Searchable directory of all programmes with aggregated health and financials."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>New Programme</Button>
            <ExportButton filename="programmes" columns={programmeExportColumns} data={filteredProgrammes} />
          </Box>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!loading && <KpiCardRow items={kpiItems} />}
      {!loading && <HealthSplitBar green={kpiData.green} amber={kpiData.amber} red={kpiData.red} sx={{ mb: 3 }} />}

      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={(v) => { setSearchQuery(v); setPage(0) }}
          searchPlaceholder="Search by name, manager, sponsor..."
          filterValue={portfolioFilter}
          onFilterChange={(v) => { setPortfolioFilter(v); setPage(0) }}
          filterLabel="Portfolio"
          filterOptions={[{ value: 'all', label: 'All Portfolios' }, ...portfolios.map(p => ({ value: p.id, label: p.name }))]}
          secondaryFilterValue={phaseFilter}
          onSecondaryFilterChange={(v) => { setPhaseFilter(v); setPage(0) }}
          secondaryFilterLabel="Phase"
          secondaryFilterOptions={[
            { value: '', label: 'All Phases' },
            { value: '0', label: 'Delivery' },
            { value: '1', label: 'Planning' },
            { value: '2', label: 'Initiation' },
          ]}
          extraFilters={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>RAG</InputLabel>
                <Select
                  value={ragFilter}
                  label="RAG"
                  onChange={(e) => { setRagFilter(e.target.value); setPage(0) }}
                  sx={{ borderRadius: 1.15, fontSize: fontSizes.base }}
                >
                  <MenuItem value="">All RAG</MenuItem>
                  <MenuItem value="1">Green</MenuItem>
                  <MenuItem value="0">Amber</MenuItem>
                  <MenuItem value="2">Red</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Min budget"
                value={minBudget}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    setMinBudget(val)
                    setPage(0)
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                    sx: { borderRadius: 1.15, fontSize: fontSizes.base },
                  },
                }}
                sx={{ maxWidth: 140 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ userSelect: 'none' }}>—</Typography>
              <TextField
                size="small"
                placeholder="Max budget"
                value={maxBudget}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    setMaxBudget(val)
                    setPage(0)
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                    sx: { borderRadius: 1.15, fontSize: fontSizes.base },
                  },
                }}
                sx={{ maxWidth: 140 }}
              />
            </Box>
          }
          showClear={hasActiveFilters}
          onClear={handleClearAll}
        />
        <TableShell loading={loading} empty={filteredProgrammes.length === 0} emptyIcon={<AccountTreeIcon />}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 480px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'name'}
                      direction={sort.field === 'name' ? sort.dir : 'asc'}
                      onClick={() => handleSort('name')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'phase'}
                      direction={sort.field === 'phase' ? sort.dir : 'asc'}
                      onClick={() => handleSort('phase')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Phase
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'rag'}
                      direction={sort.field === 'rag' ? sort.dir : 'asc'}
                      onClick={() => handleSort('rag')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      RAG
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'manager'}
                      direction={sort.field === 'manager' ? sort.dir : 'asc'}
                      onClick={() => handleSort('manager')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Manager
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'portfolio'}
                      direction={sort.field === 'portfolio' ? sort.dir : 'asc'}
                      onClick={() => handleSort('portfolio')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Portfolio
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'budget'}
                      direction={sort.field === 'budget' ? sort.dir : 'asc'}
                      onClick={() => handleSort('budget')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Budget
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={sort.field === 'actual'}
                      direction={sort.field === 'actual' ? sort.dir : 'asc'}
                      onClick={() => handleSort('actual')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Actual
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Actions</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProgrammes.map((p, idx) => (
                  <TableRow 
                    key={p.pm_programmeid} 
                    hover 
                    onClick={() => p.pm_programmeid && openDetail(p.pm_programmeid)} 
                    sx={{ 
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.pm_programmename}</Typography></TableCell>
                    <TableCell><StatusChip status={p.pm_programmephase} type="prog_phase" size="small" /></TableCell>
                    <TableCell><StatusChip status={p.pm_ragstatus} type="rag" size="small" /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{p.pm_programmemanagername || '—'}</Typography></TableCell>
                    <TableCell><StatusTag label={p.pm_portfolioname || '—'} size="small" variant="outlined" color="primary" /></TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{currencyFormatter.format(p.pm_budgeteur ?? 0)}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{currencyFormatter.format(p.pm_actualspendeur ?? 0)}</Typography></TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditForm(p)} sx={{ color: 'primary.main' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableShell>
        {!loading && filteredProgrammes.length > 0 && (
          <TableFooter
            filteredCount={filteredProgrammes.length}
            totalCount={programmes.length}
            itemLabel="programme"
            totals={[
              { label: 'Total budget', value: currencyFormatter.format(filteredProgrammes.reduce((s, p) => s + (p.pm_budgeteur ?? 0), 0)) },
              { label: 'Total actual', value: currencyFormatter.format(filteredProgrammes.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)) },
            ]}
          />
        )}
        <TablePagination component="div" count={filteredProgrammes.length} page={page} onPageChange={(_, v) => setPage(v)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))} />
      </Paper>

      <ProgrammeFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
        initialData={editingProgramme}
        portfolios={portfolios}
        allProgrammes={programmes}
      />
    </Box>
  )
}
