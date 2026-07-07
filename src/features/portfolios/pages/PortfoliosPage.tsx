import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
  Typography,
  IconButton,
  Button,
  Grid,
  Tabs,
  Tab,
  Paper,
  Divider,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import FolderIcon from '@mui/icons-material/Folder'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import DescriptionIcon from '@mui/icons-material/Description'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'

import { fetchPortfolioHierarchy, deletePortfolio } from '@/services'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

import {
  PageHeader,
  HealthSplitBar,
  ExportButton,
  KpiCardRow,
  Breadcrumbs,
  ActionIcon,
  TabPanel,
  EntityDocumentsTab,
  StatusChip,
  StatusTag,
  VarianceDisplay,
  StatusProgressBar,
  DataverseTable,
  ConfirmDialog,
  MasterScheduleTab,
} from '@/components/common'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { ExportColumn } from '@/utils/exportUtils'
import { currencyFormatter } from '@/utils/formatters'
import { navigateToProgramme, navigateToProject } from '@/utils/navigation'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'

// Sub-components
import { PortfolioGrid } from '../components/PortfolioGrid'
import { PortfolioFormDialog } from '../components/PortfolioFormDialog'

// ── Export columns ────────────────────────────────────────────────────────────
const portfolioExportColumns: ExportColumn[] = [
  { key: 'pm_portfolioname', label: 'Portfolio Name' },
  { key: '_pm_ownerlookup_value', label: 'Owner' },
  { key: 'pm_portfoliostatus', label: 'Status' },
  { key: 'pm_ragstatus', label: 'RAG' },
  { key: 'pm_approvedbudgeteur', label: 'Budget (EUR)' },
  { key: 'pm_actualspendeur', label: 'Actual Spend (EUR)' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfoliosPage() {
  const { allowed: canCreate } = useAuthorization('PORTFOLIOS', 'create')
  const { allowed: canEdit } = useAuthorization('PORTFOLIOS', 'update')
  const { allowed: canDelete } = useAuthorization('PORTFOLIOS', 'delete')

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [hierarchy, setHierarchy] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] }>({ portfolios: [], programmes: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Grid state
  const [filteredPortfolios, setFilteredPortfolios] = useState<PortfolioModel[]>([])

  // Detail panel state
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)
  const [editInfo, setEditInfo] = useState<string | null>(null)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioModel | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<PortfolioModel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await fetchPortfolioHierarchy()
      setHierarchy(data)
    } catch {
      setError('Unable to load portfolio data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const preselectedId = sessionStorage.getItem('preselectPortfolioId')
    if (preselectedId && !loading && hierarchy.portfolios.length > 0) {
      sessionStorage.removeItem('preselectPortfolioId')
      const portfolio = hierarchy.portfolios.find((p) => p.pm_portfolioid === preselectedId)
      if (portfolio) {
        setSelectedPortfolio(portfolio)
      }
    }
  }, [loading, hierarchy.portfolios])

  // ── Derived Data ──────────────────────────────────────────────────────────
  const portfolioList = hierarchy.portfolios

  const programmesByPortfolio = useMemo(() => {
    const map: Record<string, ProgrammeModel[]> = {}
    for (const prog of hierarchy.programmes) {
      const key = prog._pm_portfolio_value ?? ''
      if (!map[key]) map[key] = []
      map[key].push(prog)
    }
    return map
  }, [hierarchy.programmes])

  const projectsByPortfolio = useMemo(() => {
    const map: Record<string, ProjectModel[]> = {}
    for (const proj of hierarchy.projects) {
      const key = proj._pm_portfolio_value ?? ''
      if (!map[key]) map[key] = []
      map[key].push(proj)
    }
    return map
  }, [hierarchy.projects])

  // KPI calculations
  const totalBudget = useMemo(() => portfolioList.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0), [portfolioList])
  const totalConsumed = useMemo(() => portfolioList.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0), [portfolioList])

  const kpiHealth = useMemo(() => {
    let green = 0, amber = 0, red = 0
    for (const p of portfolioList) {
      const rag = p.pm_ragstatus?.toString()
      if (rag === '1') green++
      else if (rag === '0') amber++
      else if (rag === '2') red++
    }
    return { green, amber, red }
  }, [portfolioList])

  // ── Detail panel data ─────────────────────────────────────────────────────
  const detailProgrammes = useMemo(() => {
    if (!selectedPortfolio?.pm_portfolioid) return []
    return programmesByPortfolio[selectedPortfolio.pm_portfolioid] ?? []
  }, [selectedPortfolio, programmesByPortfolio])

  const detailProjects = useMemo(() => {
    if (!selectedPortfolio?.pm_portfolioid) return []
    return projectsByPortfolio[selectedPortfolio.pm_portfolioid] ?? []
  }, [selectedPortfolio, projectsByPortfolio])

  const detailKpiItems = useMemo(() => {
    if (!selectedPortfolio) return []
    let specificGreen = 0, specificAmber = 0, specificRed = 0
    for (const p of detailProjects) {
      if (String(p.pm_ragstatus) === '1') specificGreen++
      else if (String(p.pm_ragstatus) === '0') specificAmber++
      else if (String(p.pm_ragstatus) === '2') specificRed++
    }

    return [
      {
        label: "Programmes",
        value: detailProgrammes.length,
        subtitle: "In this portfolio",
        icon: <FolderIcon />,
        color: theme.palette.secondary.main
      },
      {
        label: "Projects",
        value: detailProjects.length,
        subtitle: "In this portfolio",
        icon: <AccountTreeIcon />,
        color: theme.palette.primary.main
      },
      {
        label: "On Track",
        value: specificGreen,
        subtitle: "Green projects",
        icon: <CheckCircleIcon />,
        color: theme.palette.success.main
      },
      {
        label: "At Risk / Critical",
        value: specificAmber + specificRed,
        subtitle: `${specificAmber} Amber, ${specificRed} Red`,
        icon: <WarningAmberIcon />,
        color: specificRed > 0 ? theme.palette.error.main : theme.palette.warning.main
      },
      {
        label: "Approved Budget",
        value: currencyFormatter.format(selectedPortfolio.pm_approvedbudgeteur ?? 0),
        subtitle: "Total budget approved",
        icon: <AccountBalanceWalletIcon />,
        color: theme.palette.primary.main
      },
      {
        label: "Actual Spend",
        value: currencyFormatter.format(selectedPortfolio.pm_actualspendeur ?? 0),
        subtitle: (selectedPortfolio.pm_approvedbudgeteur ?? 0) > 0
          ? `${(((selectedPortfolio.pm_actualspendeur ?? 0) / (selectedPortfolio.pm_approvedbudgeteur ?? 0)) * 100).toFixed(1)}% consumed`
          : 'No budget data',
        icon: <TrendingDownIcon />,
        color: theme.palette.warning.main
      }
    ]
  }, [selectedPortfolio, detailProgrammes, detailProjects, theme])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRowClick = useCallback((portfolio: PortfolioModel) => {
    setSelectedPortfolio(portfolio)
    setDetailTab(0)
  }, [])

  const handleSuccess = (freshPortfolios: PortfolioModel[]) => {
    setHierarchy(prev => ({ ...prev, portfolios: freshPortfolios }))
    // If we were editing, update selected portfolio too
    if (editingPortfolio && selectedPortfolio?.pm_portfolioid === editingPortfolio.pm_portfolioid) {
      const updated = freshPortfolios.find(p => p.pm_portfolioid === editingPortfolio.pm_portfolioid)
      if (updated) setSelectedPortfolio(updated)
    }
  }

  const openCreateForm = () => {
    setEditingPortfolio(null)
    setShowFormModal(true)
  }

  const openEditForm = (portfolio: PortfolioModel) => {
    setEditingPortfolio(portfolio)
    setShowFormModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_portfolioid) return
    setDeleteLoading(true)
    setError(null)
    try {
      await deletePortfolio(deleteTarget.pm_portfolioid)
      setHierarchy(prev => ({ ...prev, portfolios: prev.portfolios.filter(p => p.pm_portfolioid !== deleteTarget.pm_portfolioid) }))
      setSuccessMsg('Portfolio deleted.')
      setDeleteTarget(null)
      if (selectedPortfolio?.pm_portfolioid === deleteTarget.pm_portfolioid) {
        setSelectedPortfolio(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete portfolio.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (selectedPortfolio) {
    const detailProgrammes = programmesByPortfolio[selectedPortfolio.pm_portfolioid ?? ''] ?? []
    const detailProjects = projectsByPortfolio[selectedPortfolio.pm_portfolioid ?? ''] ?? []

    const STATUS_LABELS: Record<string, string> = {
      '0': 'Active',
      '1': 'Under Approval',
      '2': 'Rejected',
    }

    const programmeColumns = [
      {
        key: 'pm_programmename',
        label: 'Programme Name',
        format: (val: any, item: ProgrammeModel) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => item.pm_programmeid && navigateToProgramme(item.pm_programmeid)}
          >
            {val}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Typography>
        )
      },
      {
        key: 'pm_programmephase',
        label: 'Phase',
        format: (val: any) => <StatusChip status={val} type="prog_phase" size="small" />
      },
      {
        key: 'pm_ragstatus',
        label: 'RAG',
        format: (val: any) => <StatusChip status={val} type="rag" size="small" />
      },
      {
        key: 'pm_startdate',
        label: 'Start Date',
        format: (val: any) => val ? new Date(val).toLocaleDateString() : '—'
      },
      {
        key: 'pm_enddate',
        label: 'End Date',
        format: (val: any) => val ? new Date(val).toLocaleDateString() : '—'
      }
    ]

    const projectColumns = [
      {
        key: 'pm_projectname',
        label: 'Project Name',
        format: (val: any, item: ProjectModel) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => item.pm_projectid && navigateToProject(item.pm_projectid)}
          >
            {val}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Typography>
        )
      },
      {
        key: 'pm_projectcode',
        label: 'Project Code',
        format: (val: any) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {val || '—'}
          </Typography>
        )
      },
      {
        key: 'pm_projectphase',
        label: 'Phase',
        format: (val: any) => <StatusChip status={val} type="phase" size="small" />
      },
      {
        key: 'pm_ragstatus',
        label: 'RAG',
        format: (val: any) => <StatusChip status={val} type="rag" size="small" />
      },
      {
        key: 'pm_projectmanagername',
        label: 'Project Manager',
        format: (val: any) => val || '—'
      }
    ]

    let specificGreen = 0, specificAmber = 0, specificRed = 0
    for (const p of detailProjects) {
      if (String(p.pm_ragstatus) === '1') specificGreen++
      else if (String(p.pm_ragstatus) === '0') specificAmber++
      else if (String(p.pm_ragstatus) === '2') specificRed++
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        <Breadcrumbs
          items={[
            { label: 'Portfolios', path: 'list' },
            { label: selectedPortfolio.pm_portfolioname ?? 'Detail' }
          ]}
          onNavigate={() => setSelectedPortfolio(null)}
        />
        <PageHeader
          title={selectedPortfolio.pm_portfolioname ?? 'Portfolio Detail'}
          subtitle={selectedPortfolio.pm_businessunit ? `Business Unit: ${selectedPortfolio.pm_businessunit}` : undefined}
          actionElement={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {canEdit && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => openEditForm(selectedPortfolio)}
                  sx={{ borderRadius: 1.5 }}
                >
                  Edit Portfolio
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteTarget(selectedPortfolio)}
                  sx={{ borderRadius: 1.5 }}
                >
                  Delete Portfolio
                </Button>
              )}
            </Box>
          }
        />

        <Tabs
          value={detailTab}
          onChange={(_, v) => setDetailTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mt: -2, mb: 1 }}
        >
          <Tab label="Overview & Projects" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Master Schedule" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {detailTab === 0 && (
          <Grid container spacing={3.5} sx={{ mt: 1, display: 'flex', alignItems: 'stretch' }}>
            {/* Overview - 6/12 Width */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'success.main' }} /> Overview
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Owner</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{selectedPortfolio.pm_ownerlookupname || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Business Unit</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{selectedPortfolio.pm_businessunit || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Status</Typography>
                      <Box sx={{ mt: 0.25 }}>
                        <StatusTag
                          label={STATUS_LABELS[selectedPortfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Active'}
                          size="small"
                          variant="outlined"
                          color={selectedPortfolio.pm_portfoliostatus === 0 || selectedPortfolio.pm_portfoliostatus === '0' ? 'success' : selectedPortfolio.pm_portfoliostatus === 1 || selectedPortfolio.pm_portfoliostatus === '1' ? 'warning' : 'error'}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>RAG Status</Typography>
                      <Box sx={{ mt: 0.25 }}>
                        <StatusChip status={selectedPortfolio.pm_ragstatus} type="rag" size="small" />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Programmes</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{detailProgrammes.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Projects</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>{detailProjects.length}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: 'span 2' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Timeline</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>
                        {selectedPortfolio.pm_startdate ? new Date(selectedPortfolio.pm_startdate).toLocaleDateString() : '—'} — {selectedPortfolio.pm_enddate ? new Date(selectedPortfolio.pm_enddate).toLocaleDateString() : '—'}
                      </Typography>
                    </Box>

                    {/* Budget & Balance boxes */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, gridColumn: 'span 4', mt: 1 }}>
                      <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '16px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 44, height: 44, border: '1px solid', borderColor: (theme) => alpha(theme.palette.primary.main, 0.15) }}>
                          <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved Budget</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.25, fontFamily: '"Outfit", sans-serif' }}>{currencyFormatter.format(selectedPortfolio.pm_approvedbudgeteur ?? 0)}</Typography>
                        </Box>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '16px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, 0.08), color: 'success.main', width: 44, height: 44, border: '1px solid', borderColor: (theme) => alpha(theme.palette.success.main, 0.15) }}>
                          <TrendingUpIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved Balance</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main', mt: 0.25, fontFamily: '"Outfit", sans-serif' }}>{currencyFormatter.format((selectedPortfolio.pm_approvedbudgeteur ?? 0) - (selectedPortfolio.pm_actualspendeur ?? 0))}</Typography>
                        </Box>
                      </Paper>
                    </Box>

                    <Box sx={{ gridColumn: 'span 4' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>Budget Utilization</Typography>
                      <StatusProgressBar value={selectedPortfolio.pm_actualspendeur ?? 0} total={selectedPortfolio.pm_approvedbudgeteur ?? 0} label="" />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem' }}>
                        {selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0 ? `${((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100).toFixed(1)}% consumed` : '—'}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider />
                  {selectedPortfolio.pm_portfoliodescription && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', mb: 0.5 }}>Description</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.825rem' }}>{selectedPortfolio.pm_portfoliodescription}</Typography>
                    </Box>
                  )}
                  {selectedPortfolio.pm_strategicobjective && (
                    <Box sx={{ mt: 'auto' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', display: 'block', mb: 0.5 }}>Strategic Objective</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6, fontSize: '0.825rem' }}>"{selectedPortfolio.pm_strategicobjective}"</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Overall Health - 6/12 Width */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <LightbulbIcon sx={{ fontSize: 18, color: 'success.main' }} /> Overall Health
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 2 }}>
                  {detailProjects.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 1.5, justifyContent: 'center' }}>
                        <Box sx={{ width: 160, height: 160, position: 'relative', flexShrink: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Low Risk', value: specificGreen, color: '#22c55e' },
                                  { name: 'Medium Risk', value: specificAmber, color: '#f59e0b' },
                                  { name: 'High Risk', value: specificRed, color: '#ef4444' },
                                ].filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={68}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                              >
                                {[
                                  { name: 'Low Risk', value: specificGreen, color: '#22c55e' },
                                  { name: 'Medium Risk', value: specificAmber, color: '#f59e0b' },
                                  { name: 'High Risk', value: specificRed, color: '#ef4444' },
                                ].filter(d => d.value > 0).map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value) => [value, 'Projects']} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1, fontFamily: '"Outfit", sans-serif' }}>
                              {detailProjects.length}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Projects
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1.25, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(34,197,94,0.08)' : '#f0fdf4', border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.2)' }}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#166534', fontWeight: 800 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} /> Low
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#166534', fontFamily: '"Outfit", sans-serif' }}>{specificGreen}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1.25, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.2)' }}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#92400e', fontWeight: 800 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} /> Medium
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#92400e', fontFamily: '"Outfit", sans-serif' }}>{specificAmber}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1.25, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.08)' : '#fef2f2', border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.2)' }}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#991b1b', fontWeight: 800 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} /> High
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#991b1b', fontFamily: '"Outfit", sans-serif' }}>{specificRed}</Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ p: 2, borderRadius: '16px', border: '1px dashed', borderColor: 'divider', bgcolor: 'background.default' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Delivery Confidence
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, height: 10, borderRadius: '5px', overflow: 'hidden', bgcolor: 'action.disabledBackground' }}>
                          {specificGreen > 0 && <Box sx={{ width: `${(specificGreen / detailProjects.length) * 100}%`, bgcolor: '#22c55e' }} />}
                          {specificAmber > 0 && <Box sx={{ width: `${(specificAmber / detailProjects.length) * 100}%`, bgcolor: '#f59e0b' }} />}
                          {specificRed > 0 && <Box sx={{ width: `${(specificRed / detailProjects.length) * 100}%`, bgcolor: '#ef4444' }} />}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, fontSize: '0.7rem', textAlign: 'center', fontWeight: 700 }}>
                          {specificGreen === detailProjects.length ? '100% on track' : `${Math.round((specificGreen / detailProjects.length) * 100)}% of projects are on track`}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                      No project data to analyze health
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    {detailProgrammes.length + detailProjects.length} entities tracked
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Left Column: Tables */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Programmes Table */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <FolderIcon sx={{ color: 'success.main', fontSize: 18 }} /> Linked Programmes
                  </Typography>
                </Box>
                <Box sx={{ '& .MuiPaper-root': { boxShadow: 'none', border: 'none', bgcolor: 'transparent', backgroundImage: 'none', borderRadius: 0, mb: 0 } }}>
                  <DataverseTable
                    variant="flat"
                    data={detailProgrammes}
                    columns={programmeColumns}
                    loading={loading}
                    emptyIcon={<FolderIcon />}
                    emptyTitle="No programmes linked to this portfolio."
                    searchPlaceholder="Search programmes..."
                    searchFields={['pm_programmename']}
                    showExport={false}
                  />
                </Box>
              </Paper>

              {/* Projects Table */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountTreeIcon sx={{ color: 'success.main', fontSize: 18 }} /> Linked Projects
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', '& .MuiPaper-root': { boxShadow: 'none', border: 'none', bgcolor: 'transparent', backgroundImage: 'none', borderRadius: 0, mb: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' } }}>
                  <DataverseTable
                    variant="flat"
                    data={detailProjects}
                    columns={projectColumns}
                    loading={loading}
                    emptyIcon={<AccountTreeIcon />}
                    emptyTitle="No projects linked to this portfolio."
                    searchPlaceholder="Search projects..."
                    searchFields={['pm_projectname', 'pm_projectcode']}
                    showExport={false}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Right Column: Financials, Approval Tasks, Documents */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Financials Card */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'success.main' }} /> Financials
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{currencyFormatter.format(selectedPortfolio.pm_approvedbudgeteur ?? 0)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{currencyFormatter.format(selectedPortfolio.pm_actualspendeur ?? 0)}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <StatusProgressBar value={selectedPortfolio.pm_actualspendeur ?? 0} total={selectedPortfolio.pm_approvedbudgeteur ?? 0} label="Budget Utilization" />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                      {selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0 ? `${((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100).toFixed(1)}% consumed` : ''}
                    </Typography>
                  </Box>

                  <Box sx={{ height: 135, mt: -1.5, mb: -1.5 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Approved', amount: selectedPortfolio.pm_approvedbudgeteur ?? 0, color: theme.palette.primary.main },
                          { name: 'Spend', amount: selectedPortfolio.pm_actualspendeur ?? 0, color: theme.palette.warning.main },
                          { name: 'Variance', amount: Math.max(0, (selectedPortfolio.pm_approvedbudgeteur ?? 0) - (selectedPortfolio.pm_actualspendeur ?? 0)), color: theme.palette.success.main }
                        ]}
                        margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke={theme.palette.divider} />
                        <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke={theme.palette.divider} tickFormatter={(v) => `€${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v}`} />
                        <RechartsTooltip formatter={(value) => [`€${new Intl.NumberFormat('en-GB').format(Number(value))}`]} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={20}>
                          {[
                            { color: theme.palette.primary.main },
                            { color: theme.palette.warning.main },
                            { color: theme.palette.success.main }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Variance</Typography>
                    <VarianceDisplay budget={selectedPortfolio.pm_approvedbudgeteur} consumed={selectedPortfolio.pm_actualspendeur} />
                  </Box>
                </Box>
              </Paper>

              {/* Approval Tasks */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <TaskAltIcon sx={{ fontSize: 18, color: 'success.main' }} /> Approval Tasks
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <EntityApprovalTasks
                    entityId={selectedPortfolio.pm_portfolioid ?? ''}
                    moduleName={MODULE_NAMES.PORTFOLIOS.value}
                    entityLabel="Portfolio"
                    tabValue={0}
                    index={0}
                  />
                </Box>
              </Paper>

              {/* Documents */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <FolderIcon sx={{ fontSize: 18, color: 'success.main' }} /> Documents
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <EntityDocumentsTab
                    entityId={selectedPortfolio.pm_portfolioid ?? ''}
                    moduleName={MODULE_NAMES.PORTFOLIOS.value}
                    canEdit={canEdit}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {detailTab === 1 && (
          <MasterScheduleTab projects={detailProjects} />
        )}

        <PortfolioFormDialog
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleSuccess}
          onError={(msg) => setError(msg)}
          initialData={editingPortfolio}
        />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Portfolios"
        subtitle="Master view of all portfolios — aggregate health, budget tracking, and drill-down details."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                New Portfolio
              </Button>
            )}
            <ExportButton filename="portfolios" columns={portfolioExportColumns} data={filteredPortfolios} />
          </Box>
        }
      />

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── 1. Executive Roll-Up KPI Ribbon ──────────────────────────── */}
      {!loading && (
        <>
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {[
              {
                label: "Total Portfolios",
                value: portfolioList.length,
                subtitle: "Active portfolios",
                icon: <FolderIcon />,
                color: theme.palette.secondary.main
              },
              {
                label: "Low Risk",
                value: kpiHealth.green,
                subtitle: "On track",
                icon: <CheckCircleIcon />,
                color: theme.palette.success.main
              },
              {
                label: "Medium Risk",
                value: kpiHealth.amber,
                subtitle: "At risk",
                icon: <WarningAmberIcon />,
                color: theme.palette.warning.main
              },
              {
                label: "High Risk",
                value: kpiHealth.red,
                subtitle: "Critical",
                icon: <ErrorIcon />,
                color: theme.palette.error.main
              },
              {
                label: "Total Portfolio Value",
                value: currencyFormatter.format(totalBudget),
                subtitle: `Across ${portfolioList.length} portfolios`,
                icon: <AccountBalanceWalletIcon />,
                color: theme.palette.primary.main
              },
              {
                label: "Total Consumed",
                value: currencyFormatter.format(totalConsumed),
                subtitle: totalBudget > 0 ? `${((totalConsumed / totalBudget) * 100).toFixed(1)}% consumed` : 'No budget data',
                icon: <TrendingDownIcon />,
                color: theme.palette.warning.main
              }
            ].map((kpi, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={idx}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    height: '100%',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: isDark ? 'background.paper' : '#fff',
                    border: `1px solid ${alpha(kpi.color, 0.15)}`,
                    boxShadow: isDark
                      ? `0 8px 30px ${alpha(kpi.color, 0.05)}`
                      : `0 8px 30px ${alpha(kpi.color, 0.03)}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${alpha(kpi.color, 0.12)}`,
                      borderColor: kpi.color,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '0.68rem',
                      }}
                    >
                      {kpi.label}
                    </Typography>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: alpha(kpi.color, 0.1),
                        color: kpi.color,
                        border: `1px solid ${alpha(kpi.color, 0.2)}`,
                        '& .MuiSvgIcon-root': { fontSize: 18 }
                      }}
                    >
                      {kpi.icon}
                    </Avatar>
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      color: isDark ? '#fff' : '#0f172a',
                      fontFamily: '"Outfit", sans-serif',
                      mb: 0.5,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}
                  >
                    {kpi.value}
                  </Typography>

                  {kpi.subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>
                      {kpi.subtitle}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '4px',
                      background: `linear-gradient(90deg, ${kpi.color}, ${alpha(kpi.color, 0.3)})`,
                    }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ── 2. Dense Master Portfolio Grid ────────────────────────────── */}
      <PortfolioGrid
        portfolios={portfolioList}
        loading={loading}
        onRowClick={handleRowClick}
        onCreateClick={openCreateForm}
        onEditClick={openEditForm}
        onDeleteClick={setDeleteTarget}
        onFilteredDataChange={setFilteredPortfolios}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* ── 4. Create/Edit Portfolio Modal ──────────────── */}
      <PortfolioFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
        initialData={editingPortfolio}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Portfolio"
        message={`Are you sure you want to delete ${deleteTarget?.pm_portfolioname || 'this portfolio'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </Box>
  )
}
