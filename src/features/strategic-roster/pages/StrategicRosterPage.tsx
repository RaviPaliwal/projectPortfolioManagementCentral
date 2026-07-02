import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputBase,
  Paper,
  Divider,
  Collapse,
  alpha,
  Button,
  Avatar,
  AvatarGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import BusinessIcon from '@mui/icons-material/Business'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderIcon from '@mui/icons-material/Folder'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import LaunchIcon from '@mui/icons-material/Launch'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import DownloadIcon from '@mui/icons-material/Download'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CancelIcon from '@mui/icons-material/Cancel'
import TimelineIcon from '@mui/icons-material/Timeline'
import GridViewIcon from '@mui/icons-material/GridView'
import TableChartIcon from '@mui/icons-material/TableChart'
import AccountTreeIconOutlined from '@mui/icons-material/AccountTreeOutlined'

import { fetchPortfolioHierarchy, normalizeLookupId } from '@/services'
import { PageHeader, KpiCardRow } from '@/components/common'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { TabKey } from '@/components/layout/PrimaryShell'
import { currencyFormatter } from '@/utils/formatters'
import { navigateToModule } from '@/utils/navigation'
import { fontSizes } from '@/styles'
import CardView from '../components/CardView'
import TableView from '../components/TableView'
import TreeView from '../components/TreeView'

// ── Components ──────────────────────────────────────────────────────────────

const RAG_COLORS: Record<string, string> = {
  '1': '#22c55e', // Green
  '0': '#f59e0b', // Amber
  '2': '#ef4444', // Red
}

interface TimelineItemProps {
  id: string
  name: string
  type: 'portfolio' | 'programme' | 'project'
  startDate?: string
  endDate?: string
  plannedStartDate?: string
  plannedEndDate?: string
  ragStatus?: string
  allottedBudget?: number
  allocatedBudget?: number
  actual?: number
  level: number
  expanded?: boolean
  onToggle?: () => void
  onOpenDetails?: () => void
  hasChildren?: boolean
  minDate: Date
  totalDays: number
}

const TimelineItem = ({
  name,
  type,
  startDate,
  endDate,
  plannedStartDate,
  plannedEndDate,
  ragStatus,
  allottedBudget,
  allocatedBudget,
  actual,
  level,
  expanded,
  onToggle,
  onOpenDetails,
  hasChildren,
  minDate,
  totalDays
}: TimelineItemProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const startStr = startDate || plannedStartDate
  const endStr = endDate || plannedEndDate
  const start = startStr ? new Date(startStr) : null
  const end = endStr ? new Date(endStr) : null

  const left = start ? ((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100 : 0
  const width = start && end ? ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100 : 0

  const Icon = type === 'portfolio' ? BusinessIcon : type === 'programme' ? AccountTreeIcon : FolderIcon
  const color = type === 'portfolio' ? theme.palette.primary.main : type === 'programme' ? theme.palette.secondary.main : theme.palette.info.main
  const ragColor = RAG_COLORS[ragStatus || ''] || theme.palette.divider

  const financialProgress = allottedBudget && allottedBudget > 0 ? Math.min(100, ((actual || 0) / allottedBudget) * 100) : 0

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: `1px solid ${theme.palette.divider}`,
      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
      minHeight: 64,
      transition: 'background-color 0.2s',
    }}>
      {/* Left side: Strategic Info */}
      <Box sx={{
        width: 460,
        display: 'flex',
        alignItems: 'center',
        pl: level * 4 + 2,
        pr: 2,
        flexShrink: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
        height: 64,
        bgcolor: 'background.paper',
        zIndex: 2,
        position: 'sticky',
        left: 0,
      }}>            <Box sx={{ width: 32, display: 'flex', justifyContent: 'center', mr: 1 }}>
          {hasChildren && (
            <Tooltip title={expanded ? 'Collapse section' : 'Expand section'}>
              <IconButton size="small" onClick={onToggle} sx={{ color: 'text.secondary' }}>
                {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Avatar
          sx={{
            width: 32, height: 32,
            bgcolor: alpha(color, 0.1),
            color,
            mr: 2,
            border: `1px solid ${alpha(color, 0.2)}`
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Avatar>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography variant="body2" sx={{
            fontWeight: level === 0 ? 800 : level === 1 ? 700 : 600,
            color: 'text.primary',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            fontSize: level === 0 ? '0.95rem' : '0.875rem',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main', textDecoration: 'underline' }
          }} onClick={onOpenDetails}>
            {name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5 }}>
            <Tooltip title={`RAG: ${ragStatus === '1' ? 'Low' : ragStatus === '0' ? 'Medium' : 'High'}`}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ragColor, boxShadow: `0 0 6px ${ragColor}` }} />
            </Tooltip>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={`Allotted budget: ${allottedBudget ? currencyFormatter.format(allottedBudget) : 'Not set'}`}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', letterSpacing: 0.2, fontFamily: 'monospace', cursor: 'help' }}>
                  {allottedBudget ? currencyFormatter.format(allottedBudget) : '—'}
                </Typography>
              </Tooltip>
              {allocatedBudget !== undefined && allocatedBudget !== allottedBudget && (
                <Tooltip title={`Allocated budget: ${currencyFormatter.format(allocatedBudget)} (sum of sub-items)`}>
                  <Typography variant="caption" sx={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    color: allocatedBudget > (allottedBudget || 0) ? 'error.main' : 'warning.main',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.75,
                    bgcolor: alpha(allocatedBudget > (allottedBudget || 0) ? '#ef4444' : '#f59e0b', 0.1),
                  }}>
                    {currencyFormatter.format(allocatedBudget)} alloc
                  </Typography>
                </Tooltip>
              )}
            </Box>
            {allottedBudget && allottedBudget > 0 && (
              <Tooltip title={`Budget utilization: ${financialProgress.toFixed(0)}% (${currencyFormatter.format(actual || 0)} of ${currencyFormatter.format(allottedBudget)})`}>
                <Box sx={{ flex: 1, maxWidth: 80, height: 4, bgcolor: alpha(theme.palette.divider, 0.6), borderRadius: 2, overflow: 'hidden', cursor: 'help' }}>
                  <Box sx={{ width: `${financialProgress}%`, height: '100%', bgcolor: financialProgress > 95 ? 'error.main' : financialProgress > 80 ? 'warning.main' : 'success.main' }} />
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
          <Tooltip title="Open details in side panel">
            <IconButton size="small" sx={{ color: 'text.disabled' }} onClick={onOpenDetails}>
              <LaunchIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="More options">
            <IconButton size="small" sx={{ color: 'text.disabled' }}>
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Right side: Modern Timeline Bar */}
      <Box sx={{ flex: 1, position: 'relative', height: 64, display: 'flex', alignItems: 'center' }}>
        {start && end && (
          <Tooltip title={
            <Box sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>{name}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>📅 {start.toLocaleDateString()} — {end.toLocaleDateString()}</Typography>
                {/* FIX 3 (continued): .format() on all currencyFormatter calls */}
                <Typography variant="caption" sx={{ opacity: 0.8 }}>💰 Budget: {allottedBudget ? currencyFormatter.format(allottedBudget) : 'N/A'}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>📉 Actual: {actual ? currencyFormatter.format(actual) : 'N/A'}</Typography>
              </Box>
            </Box>
          } arrow>
            <Box sx={{
              position: 'absolute',
              left: `${left}%`,
              width: `${Math.max(1, width)}%`,
              height: level === 0 ? 28 : level === 1 ? 22 : 16,
              borderRadius: level === 0 ? 1.5 : level === 1 ? 1 : 0.75,
              bgcolor: alpha(color, isDark ? 0.3 : 0.15),
              borderLeft: `4px solid ${color}`,
              border: `1px solid ${alpha(color, 0.4)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: level === 0 ? `0 6px 15px ${alpha(color, 0.15)}` : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              overflow: 'hidden',
              '&:hover': {
                bgcolor: alpha(color, isDark ? 0.5 : 0.3),
                transform: 'scaleY(1.05)',
                boxShadow: `0 8px 20px ${alpha(color, 0.25)}`,
                zIndex: 10,
              }
            }}>
              {width > 12 && (
                <Typography variant="caption" sx={{
                  color: color,
                  fontSize: level === 0 ? '0.7rem' : '0.6rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase'
                }}>
                  {Math.round((width / 100) * totalDays)}d
                </Typography>
              )}
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

const isEntityInYear = (startDate?: string, endDate?: string, yearStr?: string) => {
  if (!yearStr) return true
  if (!startDate && !endDate) return true
  const year = parseInt(yearStr, 10)
  const start = startDate ? new Date(startDate).getFullYear() : null
  const end = endDate ? new Date(endDate).getFullYear() : null
  if (start && start > year) return false
  if (end && end < year) return false
  return true
}

// ── Main Page ──────────────────────────────────────────────────────────────

interface StrategicRosterPageProps {
  onNavigate?: (tab: TabKey) => void
}

export default function StrategicRosterPage({ onNavigate }: StrategicRosterPageProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] } | null>(null)

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [ragFilter, setRagFilter] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [viewMode, setViewMode] = useState<'timeline' | 'cards' | 'table' | 'tree'>(() => {
    try {
      const stored = localStorage.getItem('ppm_strategic_roster_view_mode')
      if (stored === 'timeline' || stored === 'cards' || stored === 'table' || stored === 'tree') {
        return stored
      }
    } catch {}
    return 'timeline'
  })
  const [selectedYear, setSelectedYear] = useState<string>('')

  const availableYears = useMemo(() => {
    if (!data) return []
    const yearsSet = new Set<number>()
    const addYear = (dStr?: string) => {
      if (!dStr) return
      const y = new Date(dStr).getFullYear()
      if (!isNaN(y)) yearsSet.add(y)
    }
    data.portfolios.forEach(p => { addYear(p.pm_startdate); addYear(p.pm_enddate) })
    data.programmes.forEach(p => { addYear(p.pm_startdate); addYear(p.pm_enddate) })
    data.projects.forEach(p => { addYear(p.pm_plannedstartdate); addYear(p.pm_plannedenddate) })
    
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear())
    }
    return Array.from(yearsSet).sort((a, b) => a - b)
  }, [data])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchPortfolioHierarchy()
      setData(result)

      // Intelligent default expansion: All portfolios and all programmes
      const defaultExpanded = new Set<string>()
      result.portfolios.forEach(p => {
        defaultExpanded.add(p.pm_portfolioid!)
        result.programmes
          .filter(pr => normalizeLookupId(pr._pm_portfolio_value) === normalizeLookupId(p.pm_portfolioid))
          .forEach(prog => defaultExpanded.add(prog.pm_programmeid!))
      })
      setExpandedItems(defaultExpanded)
    } catch {
      setError('Strategic alignment data synchronization failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!data) return { minDate: new Date(), maxDate: new Date(), totalDays: 365 }

    let min: number | null = null
    let max: number | null = null

    const checkDate = (dStr?: string) => {
      if (!dStr) return
      const t = new Date(dStr).getTime()
      if (min === null || t < min) min = t
      if (max === null || t > max) max = t
    }

    data.portfolios.forEach(p => { checkDate(p.pm_startdate); checkDate(p.pm_enddate) })
    data.programmes.forEach(p => { checkDate(p.pm_startdate); checkDate(p.pm_enddate) })
    data.projects.forEach(p => { checkDate(p.pm_plannedstartdate); checkDate(p.pm_plannedenddate) })

    const finalMin = min ? new Date(min) : new Date()
    const finalMax = max ? new Date(max) : new Date()

    if (selectedYear) {
      const year = parseInt(selectedYear, 10)
      finalMin.setFullYear(year, 0, 1)
      finalMax.setFullYear(year, 11, 31)
    } else {
      finalMin.setMonth(finalMin.getMonth() - 1)
      finalMax.setMonth(finalMax.getMonth() + 2)
    }

    const diffDays = (finalMax.getTime() - finalMin.getTime()) / (1000 * 60 * 60 * 24)

    return {
      minDate: finalMin,
      maxDate: finalMax,
      totalDays: Math.max(1, diffDays)
    }
  }, [data, selectedYear])

  const kpis = useMemo(() => {
    if (!data) return []
    const totalBudget = data.portfolios.reduce((s, p) => s + (p.pm_approvedbudgeteur || 0), 0)
    const atRisk = data.projects.filter(p => p.pm_ragstatus?.toString() === '2').length
    const avgComplete = data.projects.reduce((s, p) => s + (p.pm_percentcomplete || 0), 0) / (data.projects.length || 1)

    return [
      { label: 'Strategic Portfolios', value: data.portfolios.length, icon: <BusinessIcon />, color: theme.palette.primary.main },
      { label: 'Active Programmes', value: data.programmes.length, icon: <AccountTreeIcon />, color: theme.palette.secondary.main },
      // FIX 3 (continued): currencyFormatter.format() instead of currencyFormatter()
      { label: 'Asset Under Management', value: currencyFormatter.format(totalBudget), icon: <TrendingUpIcon />, color: theme.palette.success.main },
      // FIX 1 (continued): CalendarTodayIcon now imported above
      { label: 'Delivery Completion', value: `${Math.round(avgComplete)}%`, icon: <CalendarTodayIcon />, color: theme.palette.info.main },
    ]
  }, [data, theme])

  const filteredPortfolios = useMemo(() => {
    if (!data) return []
    return data.portfolios.filter(p => {
      const portId = p.pm_portfolioid
      if (!portId) return false

      if (selectedYear && !isEntityInYear(p.pm_startdate, p.pm_enddate, selectedYear)) return false

      if (ragFilter) {
        const matchesPort = String(p.pm_ragstatus ?? '') === ragFilter
        const matchesSubItems = data.programmes.some(prog => {
          if (normalizeLookupId(prog._pm_portfolio_value) === normalizeLookupId(portId)) {
            if (String(prog.pm_ragstatus ?? '') === ragFilter) return true
            const normalizedProgId = normalizeLookupId(prog.pm_programmeid)
            return normalizedProgId && data.projects.some(proj => 
              normalizeLookupId(proj._pm_programme_value) === normalizedProgId &&
              String(proj.pm_ragstatus ?? '') === ragFilter
            )
          }
          return false
        })
        if (!matchesPort && !matchesSubItems) return false
      }

      if (search) {
        const q = search.toLowerCase()
        const portMatch = p.pm_portfolioname?.toLowerCase().includes(q)
        let progMatch = false
        let projMatch = false
        for (const prog of data.programmes) {
          if (normalizeLookupId(prog._pm_portfolio_value) === normalizeLookupId(portId)) {
            if (prog.pm_programmename?.toLowerCase().includes(q)) progMatch = true
            const normalizedProgId = normalizeLookupId(prog.pm_programmeid)
            if (normalizedProgId && data.projects.some(pj =>
              normalizeLookupId(pj._pm_programme_value) === normalizedProgId &&
              pj.pm_projectname?.toLowerCase().includes(q)
            )) projMatch = true
          }
        }
        if (!portMatch && !progMatch && !projMatch) return false
      }

      if (minBudget && (p.pm_approvedbudgeteur ?? 0) < parseFloat(minBudget)) return false
      if (maxBudget && (p.pm_approvedbudgeteur ?? 0) > parseFloat(maxBudget)) return false
      return true
    })
  }, [data, search, ragFilter, minBudget, maxBudget, selectedYear])

  const months = useMemo(() => {
    const list: { label: string; left: number; width: number; isYear: boolean; year: number }[] = []
    const cur = new Date(minDate)
    cur.setDate(1)
    while (cur <= maxDate) {
      const monthStart = new Date(cur)
      const monthEnd = new Date(cur)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      const left = ((monthStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100
      const width = ((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100
      list.push({
        label: cur.toLocaleDateString('en-US', { month: 'short' }),
        left,
        width,
        isYear: cur.getMonth() === 0,
        year: cur.getFullYear(),
      })
      cur.setMonth(cur.getMonth() + 1)
    }
    return list
  }, [minDate, maxDate, totalDays])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
  if (!data) return null

  return (
    <Box sx={{ p: 0 }}>
      <PageHeader
        title="Strategy Execution Roster"
        subtitle="Full-spectrum visibility from executive portfolios to project delivery milestones"
      />

      <Box sx={{ px: 3, pb: 4 }}>
        {/*
          FIX 4: KpiCardRow prop name — your KpiCardRowProps likely uses a different
          prop name than `kpis`. Check your component definition and replace `items`
          below with the correct prop name (common alternatives: items, cards, data).
          Example: if KpiCardRowProps has `items`, use <KpiCardRow items={kpis} />
        */}
        <KpiCardRow items={kpis} />

        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            mt: 4,
            borderRadius: 5,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          }}
        >
          {/* Executive Control Bar */}
          <Box sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: `1px solid ${theme.palette.divider}`,
            flexWrap: 'wrap',
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              px: 2.5,
              py: 1,
              width: 320,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <SearchIcon sx={{ color: 'text.secondary', mr: 2, fontSize: 20 }} />
              <InputBase
                placeholder="Search portfolios, programmes or projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ fontSize: 14, flex: 1, fontWeight: 600 }}
              />
              {search && (
                <Tooltip title="Clear search text">
                  <IconButton size="small" onClick={() => setSearch('')} sx={{ color: 'text.disabled' }}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* RAG Filter */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>RAG</InputLabel>
              <Select
                value={ragFilter}
                label="RAG"
                onChange={(e) => setRagFilter(e.target.value)}
                sx={{ borderRadius: 1.15, fontSize: fontSizes.base }}
              >
                <MenuItem value="">All RAG</MenuItem>
                <MenuItem value="1">Low</MenuItem>
                <MenuItem value="0">Medium</MenuItem>
                <MenuItem value="2">High</MenuItem>
              </Select>
            </FormControl>

            {/* Budget Range */}
            <TextField
              size="small"
              placeholder="Min budget"
              value={minBudget}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setMinBudget(val)
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                  sx: { borderRadius: 1.15, fontSize: fontSizes.base },
                },
              }}
              sx={{ maxWidth: 130 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ userSelect: 'none' }}>—</Typography>
            <TextField
              size="small"
              placeholder="Max budget"
              value={maxBudget}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setMaxBudget(val)
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><AttachMoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                  sx: { borderRadius: 1.15, fontSize: fontSizes.base },
                },
              }}
              sx={{ maxWidth: 130 }}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            {/* Year Filter */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value)}
                sx={{ borderRadius: 1.15, fontSize: fontSizes.base }}
              >
                <MenuItem value="">All Years</MenuItem>
                {availableYears.map(y => (
                  <MenuItem key={y} value={String(y)}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            {/* View Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => {
                if (val) {
                  setViewMode(val)
                  try {
                    localStorage.setItem('ppm_strategic_roster_view_mode', val)
                  } catch {}
                }
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1.5,
                  py: 0.75,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    borderColor: 'primary.main',
                  },
                },
              }}
            >
              <ToggleButton value="timeline" aria-label="Timeline view">
                <Tooltip title="Timeline (Gantt)"><TimelineIcon fontSize="small" /></Tooltip>
              </ToggleButton>
              <ToggleButton value="cards" aria-label="Card view">
                <Tooltip title="Cards"><GridViewIcon fontSize="small" /></Tooltip>
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view">
                <Tooltip title="Table"><TableChartIcon fontSize="small" /></Tooltip>
              </ToggleButton>
              <ToggleButton value="tree" aria-label="Tree view">
                <Tooltip title="Tree"><AccountTreeIconOutlined fontSize="small" /></Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            {(search || ragFilter || minBudget || maxBudget || selectedYear) && (
              <Button
                size="small"
                variant="text"
                onClick={() => { setSearch(''); setRagFilter(''); setMinBudget(''); setMaxBudget(''); setSelectedYear('') }}
                sx={{ whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 700 }}
              >
                Clear filters
              </Button>
            )}
          </Box>

          {/* ── View Toggle Rendering ── */}
          {viewMode === 'timeline' && (
            <Box sx={{ overflowX: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <Box sx={{ minWidth: Math.max(1200, months.length * 120 + 460) }}>
                {/* Strategic Timeline Header */}
                <Box sx={{ display: 'flex', bgcolor: alpha(theme.palette.background.default, 0.8), borderBottom: `2px solid ${theme.palette.divider}`, backdropFilter: 'blur(8px)' }}>
                  <Box sx={{
                    width: 460,
                    p: 3,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    flexShrink: 0,
                    position: 'sticky',
                    left: 0,
                    bgcolor: 'background.default',
                    zIndex: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: 'text.secondary', fontSize: '0.65rem' }}>
                      Alignment Hierarchy
                    </Typography>
                    <Tooltip title="Strategic alignment hierarchy">
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Box sx={{ flex: 1, position: 'relative', height: 64, overflow: 'hidden' }}>
                    {months.map((m, i) => (
                      <Box key={m.label + m.left + i} sx={{
                        position: 'absolute',
                        left: `${m.left}%`,
                        width: `${m.width}%`,
                        height: '100%',
                        borderRight: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        pb: 1.5,
                        px: 1.5,
                      }}>
                        <Typography variant="caption" sx={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: m.isYear ? 'primary.main' : 'text.secondary',
                          whiteSpace: 'nowrap',
                          letterSpacing: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {m.label}
                        </Typography>
                        {m.isYear && (
                          <Typography variant="caption" sx={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: alpha(theme.palette.primary.main, 0.5),
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            mt: 0.25,
                          }}>
                            {m.year}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Hierarchical Data Grid */}
                <Box sx={{ position: 'relative' }}>
                  {/* Visual Connector Overlay */}
                  <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                    <Box sx={{ display: 'flex', height: '100%' }}>
                      <Box sx={{ width: 460, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, position: 'relative' }}>
                        {months.map((m, i) => (
                          <Box key={i} sx={{
                            position: 'absolute',
                            left: `${m.left}%`,
                            width: `${m.width}%`,
                            borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            height: '100%'
                          }} />
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  {/* Actual Rows */}
                  {data.portfolios.length === 0 && (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                        No portfolios found in the enterprise roster.
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Ensure your portfolios have active start and end dates to appear on the roadmap.
                      </Typography>
                    </Box>
                  )}

                  {filteredPortfolios.map(port => {
                    const portId = port.pm_portfolioid!
                    const normalizedPortId = normalizeLookupId(portId)!
                    const programs = data.programmes.filter(pr => 
                      normalizeLookupId(pr._pm_portfolio_value) === normalizedPortId &&
                      isEntityInYear(pr.pm_startdate, pr.pm_enddate, selectedYear) &&
                      (!ragFilter || String(pr.pm_ragstatus ?? '') === ragFilter || data.projects.some(pj => normalizeLookupId(pj._pm_programme_value) === normalizeLookupId(pr.pm_programmeid) && String(pj.pm_ragstatus ?? '') === ragFilter))
                    )
                    const isExpanded = expandedItems.has(portId)
                    const portAllocated = programs.reduce((sum, p) => sum + (p.pm_budgeteur ?? 0), 0)

                    return (
                      <Box key={portId} sx={{ position: 'relative', zIndex: 1 }}>
                        <TimelineItem
                          id={portId}
                          name={port.pm_portfolioname!}
                          type="portfolio"
                          startDate={port.pm_startdate}
                          endDate={port.pm_enddate}
                          ragStatus={port.pm_ragstatus?.toString()}
                          allottedBudget={port.pm_approvedbudgeteur}
                          allocatedBudget={portAllocated}
                          actual={port.pm_actualspendeur}
                          level={0}
                          hasChildren={programs.length > 0}
                          expanded={isExpanded}
                          onToggle={() => toggleExpand(portId)}
                          onOpenDetails={() => navigateToModule('Portfolio', portId)}
                          minDate={minDate}
                          totalDays={totalDays}
                        />
                        <Collapse in={isExpanded}>
                          {programs.map(prog => {
                            const progId = prog.pm_programmeid!
                            const normalizedProgId = normalizeLookupId(progId)!
                            const projects = data.projects.filter(pj => 
                              normalizeLookupId(pj._pm_programme_value) === normalizedProgId &&
                              isEntityInYear(pj.pm_plannedstartdate, pj.pm_plannedenddate, selectedYear) &&
                              (!ragFilter || String(pj.pm_ragstatus ?? '') === ragFilter)
                            )
                            const isProgExpanded = expandedItems.has(progId)
                            const progAllocated = projects.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)

                            return (
                              <Box key={progId}>
                                <TimelineItem
                                  id={progId}
                                  name={prog.pm_programmename!}
                                  type="programme"
                                  startDate={prog.pm_startdate}
                                  endDate={prog.pm_enddate}
                                  ragStatus={prog.pm_ragstatus?.toString()}
                                  allottedBudget={prog.pm_budgeteur}
                                  allocatedBudget={progAllocated}
                                  actual={prog.pm_actualspendeur}
                                  level={1}
                                  hasChildren={projects.length > 0}
                                  expanded={isProgExpanded}
                                  onToggle={() => toggleExpand(progId)}
                                  onOpenDetails={() => navigateToModule('Programme', progId)}
                                  minDate={minDate}
                                  totalDays={totalDays}
                                />
                                <Collapse in={isProgExpanded}>
                                  {projects.map(proj => (
                                    <TimelineItem
                                      key={proj.pm_projectid}
                                      id={proj.pm_projectid!}
                                      name={proj.pm_projectname!}
                                      type="project"
                                      plannedStartDate={proj.pm_plannedstartdate}
                                      plannedEndDate={proj.pm_plannedenddate}
                                      ragStatus={proj.pm_ragstatus?.toString()}
                                      allottedBudget={proj.pm_approvedbudgeteur}
                                      actual={proj.pm_actualcosteur}
                                      level={2}
                                      minDate={minDate}
                                      totalDays={totalDays}
                                      onOpenDetails={() => navigateToModule('Project', proj.pm_projectid!)}
                                    />
                                  ))}
                                </Collapse>
                              </Box>
                            )
                          })}
                        </Collapse>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          )}

          {viewMode === 'cards' && (
            <CardView
              portfolios={filteredPortfolios}
              programmes={data.programmes.filter(pr => 
                (!selectedYear || isEntityInYear(pr.pm_startdate, pr.pm_enddate, selectedYear)) &&
                (!ragFilter || String(pr.pm_ragstatus ?? '') === ragFilter || data.projects.some(pj => normalizeLookupId(pj._pm_programme_value) === normalizeLookupId(pr.pm_programmeid) && String(pj.pm_ragstatus ?? '') === ragFilter))
              )}
              projects={data.projects.filter(pj => 
                (!selectedYear || isEntityInYear(pj.pm_plannedstartdate, pj.pm_plannedenddate, selectedYear)) &&
                (!ragFilter || String(pj.pm_ragstatus ?? '') === ragFilter)
              )}
              onItemClick={(id, type, name) => {
                const modMap: Record<string, string> = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }
                navigateToModule(modMap[type], id)
              }}
            />
          )}

          {viewMode === 'table' && (
            <TableView
              portfolios={filteredPortfolios}
              programmes={data.programmes.filter(pr => 
                (!selectedYear || isEntityInYear(pr.pm_startdate, pr.pm_enddate, selectedYear)) &&
                (!ragFilter || String(pr.pm_ragstatus ?? '') === ragFilter || data.projects.some(pj => normalizeLookupId(pj._pm_programme_value) === normalizeLookupId(pr.pm_programmeid) && String(pj.pm_ragstatus ?? '') === ragFilter))
              )}
              projects={data.projects.filter(pj => 
                (!selectedYear || isEntityInYear(pj.pm_plannedstartdate, pj.pm_plannedenddate, selectedYear)) &&
                (!ragFilter || String(pj.pm_ragstatus ?? '') === ragFilter)
              )}
              onItemClick={(id, type, name) => {
                const modMap: Record<string, string> = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }
                navigateToModule(modMap[type], id)
              }}
            />
          )}

          {viewMode === 'tree' && (
            <TreeView
              portfolios={filteredPortfolios}
              programmes={data.programmes.filter(pr => 
                (!selectedYear || isEntityInYear(pr.pm_startdate, pr.pm_enddate, selectedYear)) &&
                (!ragFilter || String(pr.pm_ragstatus ?? '') === ragFilter || data.projects.some(pj => normalizeLookupId(pj._pm_programme_value) === normalizeLookupId(pr.pm_programmeid) && String(pj.pm_ragstatus ?? '') === ragFilter))
              )}
              projects={data.projects.filter(pj => 
                (!selectedYear || isEntityInYear(pj.pm_plannedstartdate, pj.pm_plannedenddate, selectedYear)) &&
                (!ragFilter || String(pj.pm_ragstatus ?? '') === ragFilter)
              )}
              onItemClick={(id, type, name) => {
                const modMap: Record<string, string> = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }
                navigateToModule(modMap[type], id)
              }}
            />
          )}
        </Paper>
      </Box>
    </Box>
  )
}