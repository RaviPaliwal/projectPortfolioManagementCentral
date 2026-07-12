import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from 'react'
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
  Tooltip,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import SearchIcon from '@mui/icons-material/Search'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'


import { fetchPortfolioHierarchy, deletePortfolio, fetchFundingSourcesByRegarding } from '@/services'
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
  WorkflowMilestone,
} from '@/components/common'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { ExportColumn } from '@/utils/exportUtils'
import { currencyFormatter } from '@/utils/formatters'
import { navigateToProgramme, navigateToProject } from '@/utils/navigation'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { colors } from '@/styles'

import PsychologyIcon from '@mui/icons-material/Psychology'
import { PortfolioFormDialog, PortfolioAICreateDialog, PortfolioGrid } from '../components'
import { EntityFundingSourcesTab } from '@/features/fundingsources/components'

// ── Export columns ────────────────────────────────────────────────────────────
const portfolioExportColumns: ExportColumn[] = [
  { key: 'pm_portfolioname', label: 'Portfolio Name' },
  { key: '_pm_ownerlookup_value', label: 'Owner' },
  { key: 'pm_portfoliostatus', label: 'Status' },
  { key: 'pm_ragstatus', label: 'RAG' },
  { key: 'pm_approvedbudgeteur', label: 'Budget (EUR)' },
  { key: 'pm_actualspendeur', label: 'Actual Spend (EUR)' },
]

// ── Portfolio Hierarchy Table ────────────────────────────────────────────────
interface PortfolioHierarchyTableProps {
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
  loading: boolean
  searchTerm: string
}

function PortfolioHierarchyTable({ programmes, projects, loading, searchTerm }: PortfolioHierarchyTableProps) {
  const theme = useTheme()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Pre-expand all programmes by default
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {}
    for (const prog of programmes) {
      if (prog.pm_programmeid) {
        initialExpanded[prog.pm_programmeid] = true
      }
    }
    setExpanded(initialExpanded)
  }, [programmes])

  // Split projects into linked-to-programme and standalone (no programme or programme not in detailProgrammes)
  const programmeIds = useMemo(() => new Set(programmes.map((p) => p.pm_programmeid)), [programmes])

  const { projectsByProgramme, standaloneProjects } = useMemo(() => {
    const byProg: Record<string, ProjectModel[]> = {}
    const standalone: ProjectModel[] = []

    for (const proj of projects) {
      const progId = proj._pm_programme_value
      if (progId && programmeIds.has(progId)) {
        if (!byProg[progId]) byProg[progId] = []
        byProg[progId].push(proj)
      } else {
        standalone.push(proj)
      }
    }
    return { projectsByProgramme: byProg, standaloneProjects: standalone }
  }, [projects, programmes, programmeIds])

  // Filter programmes and standalone projects based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return { filteredProgrammes: programmes, filteredStandalone: standaloneProjects, filteredProjectsByProgramme: projectsByProgramme }
    }
    const term = searchTerm.toLowerCase()

    // Filter projects matching search term
    const nextFilteredProjectsByProg: Record<string, ProjectModel[]> = {}
    const matchingProgIds = new Set<string>()

    for (const [progId, projs] of Object.entries(projectsByProgramme)) {
      const matches = projs.filter((p) => p.pm_projectname?.toLowerCase().includes(term))
      if (matches.length > 0) {
        nextFilteredProjectsByProg[progId] = matches
        matchingProgIds.add(progId)
      }
    }

    // Filter programmes that match themselves OR contain matching projects
    const filteredProgs = programmes.filter((prog) => {
      const matchesName = prog.pm_programmename?.toLowerCase().includes(term)
      const hasMatchingProjects = matchingProgIds.has(prog.pm_programmeid ?? '')
      return matchesName || hasMatchingProjects
    })

    // If programme matches itself but has no matching projects, include all its projects
    for (const prog of filteredProgs) {
      const pid = prog.pm_programmeid
      if (pid && !nextFilteredProjectsByProg[pid] && projectsByProgramme[pid]) {
        nextFilteredProjectsByProg[pid] = projectsByProgramme[pid]
      }
    }

    const filteredStand = standaloneProjects.filter((p) => p.pm_projectname?.toLowerCase().includes(term))

    // Expand programmes with matching projects during search
    if (searchTerm) {
      const autoExpand: Record<string, boolean> = {}
      for (const progId of matchingProgIds) {
        autoExpand[progId] = true
      }
      setExpanded((prev) => ({ ...prev, ...autoExpand }))
    }

    return { filteredProgrammes: filteredProgs, filteredStandalone: filteredStand, filteredProjectsByProgramme: nextFilteredProjectsByProg }
  }, [searchTerm, programmes, standaloneProjects, projectsByProgramme])

  const { filteredProgrammes, filteredStandalone, filteredProjectsByProgramme } = filteredData

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '40%' }}>
                Name
              </TableCell>
              <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%' }}>
                Phase
              </TableCell>
              <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%' }}>
                RAG
              </TableCell>
              <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%', textAlign: 'center' }}>
                % Complete
              </TableCell>
              <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider', width: '15%', textAlign: 'right' }}>
                Approved Budget
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 1. Linked Programmes */}
            {filteredProgrammes.map((prog) => {
              const progProjects = filteredProjectsByProgramme[prog.pm_programmeid ?? ''] ?? []
              const avgComplete = progProjects.length > 0
                ? Math.round(progProjects.reduce((sum, p) => sum + (p.pm_percentcomplete ?? 0), 0) / progProjects.length)
                : null

              return (
                <Fragment key={prog.pm_programmeid}>
                  {/* Parent Programme Row */}
                  <TableRow
                    hover
                    sx={{
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
                      '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(prog.pm_programmeid ?? '')}
                          disabled={progProjects.length === 0}
                          sx={{ p: 0.5, mr: 0.5 }}
                        >
                          {progProjects.length === 0 ? (
                            <Box sx={{ width: 24, height: 24 }} />
                          ) : expanded[prog.pm_programmeid ?? ''] ? (
                            <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                        <FolderIcon sx={{ color: theme.palette.secondary.main, fontSize: 18, mr: 1 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                          onClick={() => prog.pm_programmeid && navigateToProgramme(prog.pm_programmeid)}
                        >
                          {prog.pm_programmename}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={prog.pm_programmephase} type="prog_phase" size="small" />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={prog.pm_ragstatus} type="rag" size="small" />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                      {avgComplete !== null ? `${avgComplete}%` : '—'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {currencyFormatter.format(prog.pm_budgeteur ?? 0)}
                    </TableCell>
                  </TableRow>

                  {/* Child Projects under this Programme */}
                  {expanded[prog.pm_programmeid ?? ''] && progProjects.map((proj) => (
                    <TableRow
                      key={proj.pm_projectid}
                      hover
                      sx={{
                        '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                      }}
                    >
                      <TableCell sx={{ pl: 6, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountTreeIcon sx={{ color: theme.palette.primary.main, fontSize: 16 }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: 'primary.main',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            onClick={() => proj.pm_projectid && navigateToProject(proj.pm_projectid)}
                          >
                            {proj.pm_projectname}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={proj.pm_projectphase} type="phase" size="small" />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={proj.pm_ragstatus} type="rag" size="small" />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {proj.pm_percentcomplete !== undefined ? `${proj.pm_percentcomplete}%` : '0%'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {currencyFormatter.format(proj.pm_approvedbudget ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}

            {/* 2. Standalone Projects (Listed direct at bottom) */}
            {filteredStandalone.map((proj) => (
              <TableRow
                key={proj.pm_projectid}
                hover
                sx={{
                  '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                }}
              >
                <TableCell sx={{ pl: 3, py: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountTreeIcon sx={{ color: theme.palette.primary.main, fontSize: 16 }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => proj.pm_projectid && navigateToProject(proj.pm_projectid)}
                    >
                      {proj.pm_projectname} <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>(Standalone)</Typography>
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <StatusChip status={proj.pm_projectphase} type="phase" size="small" />
                </TableCell>
                <TableCell>
                  <StatusChip status={proj.pm_ragstatus} type="rag" size="small" />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {proj.pm_percentcomplete !== undefined ? `${proj.pm_percentcomplete}%` : '0%'}
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  {currencyFormatter.format(proj.pm_approvedbudget ?? 0)}
                </TableCell>
              </TableRow>
            ))}

            {filteredProgrammes.length === 0 && filteredStandalone.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  No linked programmes or projects.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfoliosPage() {
  const { allowed: canCreate } = useAuthorization('PORTFOLIOS', 'create')
  const { allowed: canEdit } = useAuthorization('PORTFOLIOS', 'update')
  const { allowed: canDelete } = useAuthorization('PORTFOLIOS', 'delete')
  const { allowed: canReadFunding } = useAuthorization('FUNDING_SOURCES', 'read')
  const { allowed: canCreateFunding } = useAuthorization('FUNDING_SOURCES', 'create')

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
  const [portfolioDocCount, setPortfolioDocCount] = useState(0)
  const [portfolioSearch, setPortfolioSearch] = useState('')
  const [todayHover, setTodayHover] = useState(false)
  const documentsTabRef = useRef<{ triggerUpload: () => void } | null>(null)
  const fundingTabRef = useRef<{ triggerCreate: () => void } | null>(null)

  const [unallocatedReserve, setUnallocatedReserve] = useState(0)

  const loadUnallocatedReserve = useCallback(async () => {
    if (!selectedPortfolio?.pm_portfolioid) {
      setUnallocatedReserve(0)
      return
    }
    try {
      const list = await fetchFundingSourcesByRegarding(selectedPortfolio.pm_portfolioid, 'pm_portfolios')
      const total = list.reduce((sum, s) => sum + (s.pm_totalamounteur ?? 0), 0)
      const budget = selectedPortfolio.pm_approvedbudgeteur ?? 0
      setUnallocatedReserve(total > budget ? total - budget : 0)
    } catch {
      setUnallocatedReserve(0)
    }
  }, [selectedPortfolio])

  useEffect(() => {
    loadUnallocatedReserve()
  }, [loadUnallocatedReserve])

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
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
      },
      ...(unallocatedReserve > 0 ? [{
        label: "Unallocated Reserve",
        value: currencyFormatter.format(unallocatedReserve),
        subtitle: "Excess funding reserve",
        icon: <AccountBalanceWalletIcon />,
        color: theme.palette.info.main
      }] : [])
    ]
  }, [selectedPortfolio, detailProgrammes, detailProjects, theme, unallocatedReserve])

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

    const RAG_COLORS: Record<string, string> = {
      '1': theme.palette.success.main,
      '0': theme.palette.warning.main,
      '2': theme.palette.error.main,
    }

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
          {canReadFunding && <Tab label="Funding Sources" sx={{ textTransform: 'none', fontWeight: 600 }} />}
        </Tabs>

        {detailTab === 0 && (
          <>
            <WorkflowMilestone
              entityId={selectedPortfolio.pm_portfolioid ?? ''}
              moduleName={MODULE_NAMES.PORTFOLIOS.value}
            />

            <Grid container spacing={3.5} sx={{ display: 'flex', alignItems: 'stretch' }}>
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
                    {/* Visual Milestone Timeline */}
                    <Box sx={{ gridColumn: 'span 4', mt: 1.5 }}>
                      {(() => {
                        const start = selectedPortfolio.pm_startdate ? new Date(selectedPortfolio.pm_startdate) : null;
                        const end = selectedPortfolio.pm_enddate ? new Date(selectedPortfolio.pm_enddate) : null;
                        if (!start || !end) {
                          return (
                            <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
                              Start and End dates are required for timeline pathway
                            </Typography>
                          );
                        }
                        const today = new Date();
                        const totalDuration = end.getTime() - start.getTime();
                        if (totalDuration <= 0) return null;
                        const elapsed = today.getTime() - start.getTime();
                        const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                        
                        const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
                        const elapsedDays = Math.max(0, Math.ceil(elapsed / (1000 * 60 * 60 * 24)));
                        const remainingDays = Math.max(0, totalDays - elapsedDays);
                        
                        const startStr = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        const endStr = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        const todayStr = today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        const isEnded = today > end;
                        const isNotStarted = today < start;
                        
                        return (
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                Timeline Pathway
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', px: 1.25, py: 0.5, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                                {isEnded ? 'Completed' : isNotStarted ? 'Not Started' : `${remainingDays} days remaining`}
                              </Typography>
                            </Box>

                            {/* Pathway Line container */}
                            <Box sx={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', px: 1.5, mb: 1 }}>
                              {/* Track Line */}
                              <Box sx={{ position: 'absolute', left: 16, right: 16, height: 6, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
                                {/* Filled Progress Line */}
                                <Box sx={{ 
                                  width: `${percent}%`, 
                                  height: '100%', 
                                  borderRadius: 3, 
                                  background: (theme) => `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: (theme) => `0 0 8px ${alpha(theme.palette.primary.main, 0.4)}`
                                }} />
                              </Box>

                              {/* Start Dot */}
                              <Box sx={{ position: 'absolute', left: 16, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'success.main', border: '3px solid', borderColor: 'background.paper', boxShadow: (theme) => theme.shadows[1] }} />
                              </Box>

                              {/* Current Node Pin */}
                              {!isEnded && !isNotStarted && (() => {
                                const visualPercent = Math.min(94, Math.max(6, percent));
                                return (
                                  <Box sx={{ 
                                    position: 'absolute', 
                                    left: `calc(16px + ${visualPercent}% - ${visualPercent * 0.32}px)`,
                                    transform: 'translateX(-50%)', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    zIndex: 3
                                  }}>
                                    {/* Pulsing Outer Ring */}
                                    <Box sx={{
                                      position: 'absolute',
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      border: '2px solid',
                                      borderColor: 'primary.main',
                                      animation: 'pulse 2s infinite ease-in-out',
                                      '@keyframes pulse': {
                                        '0%': { transform: 'scale(0.6)', opacity: 0.8 },
                                        '100%': { transform: 'scale(1.3)', opacity: 0 }
                                      }
                                    }} />
                                    {/* Center Thumb */}
                                    <Tooltip 
                                      title={`Today: ${todayStr} (${percent.toFixed(1)}% elapsed)`} 
                                      arrow
                                      open={todayHover ? true : undefined}
                                    >
                                      <Box 
                                        onMouseEnter={() => setTodayHover(true)}
                                        onMouseLeave={() => setTodayHover(false)}
                                        sx={{ 
                                          width: 14, 
                                          height: 14, 
                                          borderRadius: '50%', 
                                          bgcolor: 'primary.main', 
                                          border: '3px solid', 
                                          borderColor: 'background.paper', 
                                          boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                                          transition: 'transform 0.15s ease',
                                          cursor: 'pointer',
                                          transform: todayHover ? 'scale(1.2)' : 'scale(1)',
                                          '&:hover': {
                                            transform: 'scale(1.2)'
                                          }
                                        }} 
                                      />
                                    </Tooltip>
                                  </Box>
                                );
                              })()}

                              {/* End Dot */}
                              <Box sx={{ position: 'absolute', right: 16, transform: 'translateX(50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                               <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: isEnded ? 'primary.main' : 'action.disabled', border: '3px solid', borderColor: 'background.paper', boxShadow: (theme) => theme.shadows[1] }} />
                              </Box>
                            </Box>

                            {/* Grid details under pathway */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 1, mt: 0.5, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                              {/* Start Date Card */}
                              <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: 0.3, fontSize: '0.62rem' }}>
                                  Start Date
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25, display: 'block' }}>
                                  {startStr}
                                </Typography>
                              </Box>

                              {/* Today/Progress Card */}
                              <Box 
                                onMouseEnter={() => setTodayHover(true)}
                                onMouseLeave={() => setTodayHover(false)}
                                sx={{ 
                                  textAlign: 'center', 
                                  cursor: 'pointer', 
                                  transition: 'transform 0.2s', 
                                  transform: todayHover ? 'scale(1.05)' : 'scale(1)' 
                                }}
                              >
                                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block', letterSpacing: 0.3, fontSize: '0.62rem' }}>
                                  Today ({todayStr})
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mt: 0.25, fontWeight: 700 }}>
                                  {percent.toFixed(1)}% elapsed
                                </Typography>
                              </Box>

                              {/* Target Date Card */}
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: 0.3, fontSize: '0.62rem' }}>
                                  Target Date
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25, display: 'block' }}>
                                  {endStr}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })()}
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
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', display: 'block', mb: 0.5 }}>Strategic Objective</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6, fontSize: '0.825rem' }}>"{selectedPortfolio.pm_strategicobjective}"</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Supporting Documents */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <FolderIcon sx={{ fontSize: 18, color: 'success.main' }} /> Supporting Documents
                  </Typography>
                  {canEdit && portfolioDocCount > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => documentsTabRef.current?.triggerUpload()}
                      sx={{ borderRadius: 1.5 }}
                    >
                      Add Document
                    </Button>
                  )}
                </Box>
                <Box sx={{ p: 3, flexGrow: 1 }}>
                  <EntityDocumentsTab
                    ref={documentsTabRef}
                    entityId={selectedPortfolio.pm_portfolioid ?? ''}
                    moduleName={MODULE_NAMES.PORTFOLIOS.value}
                    canEdit={canEdit}
                    hideUploadIfNotEmpty={true}
                    onDocumentsChange={(docs) => setPortfolioDocCount(docs.length)}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Left Column: Programmes & Projects */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <FolderIcon sx={{ color: 'success.main', fontSize: 18 }} /> Linked Programmes & Projects
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search programmes/projects..."
                    value={portfolioSearch}
                    onChange={(e) => setPortfolioSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 1.5, height: 36, width: 260, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1, py: 1.5 }}>
                  <PortfolioHierarchyTable
                    programmes={detailProgrammes}
                    projects={detailProjects}
                    searchTerm={portfolioSearch}
                    loading={loading}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Row 3: Cards Side-by-Side to prevent whitespace */}
            {/* Overall Health - 6/12 Width */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
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
                                  { name: 'Low Risk', value: specificGreen, color: theme.palette.success.main },
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
                                  { name: 'Low Risk', value: specificGreen, color: theme.palette.success.main },
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
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1.25, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.success.main, 0.05), border: '1px solid', borderColor: (theme) => alpha(theme.palette.success.main, 0.2) }}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'success.dark', fontWeight: 800 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} /> Low
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'success.dark', fontFamily: '"Outfit", sans-serif' }}>{specificGreen}</Typography>
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
                          {specificGreen > 0 && <Box sx={{ width: `${(specificGreen / detailProjects.length) * 100}%`, bgcolor: theme.palette.success.main }} />}
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
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Financials Card */}
              <Paper sx={{ borderRadius: '24px', border: 'none', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'success.main' }} /> Financials
                  </Typography>
                </Box>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Approved Budget</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>{currencyFormatter.format(selectedPortfolio.pm_approvedbudgeteur ?? 0)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Actual Spend</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'warning.main', mt: 0.5 }}>{currencyFormatter.format(selectedPortfolio.pm_actualspendeur ?? 0)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Variance</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'info.main', mt: 0.5 }}>
                        {currencyFormatter.format((selectedPortfolio.pm_approvedbudgeteur ?? 0) - (selectedPortfolio.pm_actualspendeur ?? 0))}
                      </Typography>
                    </Paper>
                  </Box>
                  <Box>
                    <StatusProgressBar value={selectedPortfolio.pm_actualspendeur ?? 0} total={selectedPortfolio.pm_approvedbudgeteur ?? 0} label="Budget Utilization" />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                      {selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0 ? `${((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100).toFixed(1)}% consumed` : ''}
                    </Typography>
                  </Box>

                  <Box sx={{ height: 135, mt: -1.5, mb: -1.5, flexGrow: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Approved', amount: selectedPortfolio.pm_approvedbudgeteur ?? 0, color: theme.palette.primary.main },
                          { name: 'Spend', amount: selectedPortfolio.pm_actualspendeur ?? 0, color: theme.palette.warning.main },
                          { name: 'Variance', amount: Math.max(0, (selectedPortfolio.pm_approvedbudgeteur ?? 0) - (selectedPortfolio.pm_actualspendeur ?? 0)), color: theme.palette.info.main }
                        ]}
                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: theme.palette.text.secondary }} stroke={theme.palette.divider} />
                        <YAxis tick={{ fontSize: 9, fontFamily: 'monospace', fill: theme.palette.text.secondary }} stroke={theme.palette.divider} tickFormatter={(v) => `€${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v}`} />
                        <RechartsTooltip formatter={(value) => [`€${new Intl.NumberFormat('en-GB').format(Number(value))}`]} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={20}>
                          {[
                            { color: theme.palette.primary.main },
                            { color: theme.palette.warning.main },
                            { color: theme.palette.info.main }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          </>
        )}

        {detailTab === 1 && (
          <MasterScheduleTab projects={detailProjects} />
        )}

        {detailTab === 2 && canReadFunding && (
          <EntityFundingSourcesTab
            ref={fundingTabRef}
            entityId={selectedPortfolio.pm_portfolioid ?? ''}
            entityType="pm_portfolios"
            onFundingSourcesChanged={loadUnallocatedReserve}
          />
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
              <>
                <Button
                  variant="outlined"
                  startIcon={<PsychologyIcon />}
                  onClick={() => setShowAIModal(true)}
                  color="secondary"
                  sx={{ borderRadius: 2 }}
                >
                  Create with AI
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateForm}
                  sx={{ borderRadius: 2 }}
                >
                  New Portfolio
                </Button>
              </>
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

      <PortfolioFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
        initialData={editingPortfolio}
      />

      <PortfolioAICreateDialog
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
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
