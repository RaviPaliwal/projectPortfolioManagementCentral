import React from 'react'
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  Tooltip as MuiTooltip,
} from '@mui/material'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderIcon from '@mui/icons-material/Folder'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TimelineIcon from '@mui/icons-material/Timeline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import GppBadIcon from '@mui/icons-material/GppBad'
import BusinessIcon from '@mui/icons-material/Business'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Cell
} from 'recharts'

import { currencyFormatter } from '@/utils/formatters'
import type { PortfolioModel, InitiativeModel, ProjectModel, RiskModel, IssueModel } from '@/types/dataverse'

// Common Theme-Aligned Card Styles matching the mockup but referencing app theme
const cardStyle = (theme: any) => ({
  bgcolor: theme.palette.background.paper,
  borderRadius: '24px',
  p: 3,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 10px 30px -10px rgba(0,0,0,0.7)'
    : '0 10px 30px -10px rgba(0,0,0,0.03)',
  border: `1.5px solid ${theme.palette.divider}`,
  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, box-shadow 0.25s',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  '&:hover': {
    transform: 'translateY(-4px)',
    borderColor: theme.palette.primary.main,
    boxShadow: theme.palette.mode === 'dark'
      ? `0 15px 35px -5px ${alpha(theme.palette.primary.main, 0.25)}`
      : `0 15px 35px -5px ${alpha(theme.palette.primary.main, 0.1)}`,
  }
})

// ── 1. Top KPI Row Horizontal Pills (Theme Color Aligned) ────────────────────
interface MockupKpiRowProps {
  metrics: {
    totalActiveProjects: number
    totalActivePortfolios: number
    totalApprovedBudget: number
    totalActualSpend: number
    pipelineValue: number
    projectsInGreen: number
    projectsInAmber: number
    projectsInRed: number
  }
  pipelineKpis: {
    totalActiveInitiatives: number
    pendingApprovals: number
    totalEstimatedCost: number
    approvedThisMonth: number
  }
}

export const MockupKpiRow: React.FC<MockupKpiRowProps> = ({ metrics, pipelineKpis }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const budgetPct = metrics.totalApprovedBudget > 0
    ? ((metrics.totalActualSpend / metrics.totalApprovedBudget) * 100).toFixed(1)
    : '0'

  const items = [
    {
      label: 'ACTIVE PORTFOLIOS',
      value: metrics.totalActivePortfolios,
      subtitle: `${metrics.totalActiveProjects} active projects`,
      icon: <FolderIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />,
      trend: '+12%',
      trendUp: true,
      color: theme.palette.primary.main
    },
    {
      label: 'APPROVED BUDGET',
      value: currencyFormatter.format(metrics.totalApprovedBudget),
      subtitle: `Pipeline: ${currencyFormatter.format(pipelineKpis.totalEstimatedCost)}`,
      icon: <AccountBalanceWalletIcon sx={{ color: theme.palette.success.main, fontSize: 18 }} />,
      trend: '+10%',
      trendUp: true,
      color: theme.palette.success.main
    },
    {
      label: 'ACTUAL SPEND',
      value: currencyFormatter.format(metrics.totalActualSpend),
      subtitle: `${budgetPct}% consumed`,
      icon: <TrendingUpIcon sx={{ color: theme.palette.secondary.main, fontSize: 18 }} />,
      trend: '-4%',
      trendUp: false,
      color: theme.palette.secondary.main
    },
    {
      label: 'PIPELINE VALUE',
      value: currencyFormatter.format(metrics.pipelineValue),
      subtitle: `${pipelineKpis.totalActiveInitiatives} initiatives`,
      icon: <TimelineIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />,
      trend: '+19.2%',
      trendUp: true,
      color: theme.palette.primary.main
    }
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 3.5, mb: 3.5 }}>
      {items.map((item, idx) => (
        <Paper
          key={idx}
          sx={{
            p: 2,
            px: 2.5,
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.background.paper,
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.02)',
            border: `1.5px solid ${theme.palette.divider}`,
            gap: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.02)',
              borderColor: item.color,
              boxShadow: `0 6px 22px -4px ${alpha(item.color, 0.15)}`
            }
          }}
        >
          {/* Circular Icon Container */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: alpha(item.color, isDark ? 0.15 : 0.06),
              flexShrink: 0
            }}
          >
            {item.icon}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ fontWeight: 850, fontSize: '1.25rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.value}
              </Typography>

              {/* Trend Tag */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.15,
                  borderRadius: '10px',
                  bgcolor: item.trendUp ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                  color: item.trendUp ? 'success.main' : 'error.main',
                  fontSize: '10px',
                  fontWeight: 700
                }}
              >
                {item.trend}
              </Box>
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mt: 0.15 }}>
              {item.label}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  )
}


// ── 2. Leads Overview (Left Card: Project Statuses Grid & Theme Sparklines) ──
interface MockupOverviewCardProps {
  metrics: {
    totalActiveProjects: number
    projectsInGreen: number
    projectsInAmber: number
    projectsInRed: number
  }
  pipelineKpis: {
    pendingApprovals: number
    totalActiveInitiatives: number
  }
}

export const MockupOverviewCard: React.FC<MockupOverviewCardProps> = ({ metrics, pipelineKpis }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const subItems = [
    { label: 'Active Projects', value: metrics.totalActiveProjects, icon: <InfoOutlinedIcon sx={{ fontSize: 13 }} />, trendUp: true, color: theme.palette.primary.main },
    { label: 'Green RAG status', value: metrics.projectsInGreen, icon: <InfoOutlinedIcon sx={{ fontSize: 13 }} />, trendUp: true, color: theme.palette.success.main },
    { label: 'Pending Approvals', value: pipelineKpis.pendingApprovals, icon: <InfoOutlinedIcon sx={{ fontSize: 13 }} />, trendUp: false, color: theme.palette.warning.main },
    { label: 'Active Initiatives', value: pipelineKpis.totalActiveInitiatives, icon: <InfoOutlinedIcon sx={{ fontSize: 13 }} />, trendUp: true, color: theme.palette.secondary.main },
    { label: 'Red RAG status', value: metrics.projectsInRed, icon: <InfoOutlinedIcon sx={{ fontSize: 13 }} />, trendUp: false, color: theme.palette.error.main },
    { label: 'Amber RAG status', value: metrics.projectsInAmber, icon: <InfoOutlinedIcon sx={{ fontSize: 13 }} />, trendUp: true, color: theme.palette.warning.main }
  ]

  // Mini Sparkline Data aligned to theme colors
  const sparklineData = [
    { value: 12 }, { value: 19 }, { value: 10 }, { value: 15 }, { value: 8 }, { value: 25 }, { value: 20 }
  ]
  const sparklineData2 = [
    { value: 22 }, { value: 15 }, { value: 28 }, { value: 18 }, { value: 32 }, { value: 25 }, { value: 38 }
  ]

  return (
    <Paper sx={cardStyle(theme)}>
      {/* Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '15px' }}>
          Portfolio RAG Overview
        </Typography>
        <ArrowOutwardIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }} />
      </Box>

      {/* Grid of Sub-items */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3.5 }}>
        {subItems.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              p: 1.5,
              borderRadius: '16px',
              border: `1.5px solid ${theme.palette.divider}`,
              bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)',
              position: 'relative',
              '&:hover': {
                borderColor: alpha(item.color, 0.4)
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 700, color: 'text.secondary' }}>
                {item.label}
              </Typography>
              <MuiTooltip title={`Details for ${item.label}`}>
                <Box sx={{ display: 'flex', color: 'text.disabled' }}>
                  {item.icon}
                </Box>
              </MuiTooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 850, fontSize: '1.2rem', letterSpacing: '-0.02em', color: item.color }}>
                {item.value}
              </Typography>
              {item.trendUp ? (
                <ArrowDropUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
              ) : (
                <ArrowDropDownIcon sx={{ color: 'error.main', fontSize: 20 }} />
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Sparkline Row */}
      <Box sx={{ mt: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {/* Sparkline 1: Primary Green */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
            <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary' }}>RAG Risk Ratio</Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'primary.main' }}>Healthy</Typography>
          </Box>
          <Box sx={{ height: 40, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <Area type="monotone" dataKey="value" stroke={theme.palette.primary.main} fill={alpha(theme.palette.primary.main, 0.1)} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Sparkline 2: Secondary Orange */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
            <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary' }}>Budget Burn</Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'secondary.main' }}>Steady</Typography>
          </Box>
          <Box sx={{ height: 40, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData2} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <Area type="monotone" dataKey="value" stroke={theme.palette.secondary.main} fill={alpha(theme.palette.secondary.main, 0.1)} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}


// ── 3. Sales Overview (Center Card: Portfolio Budget vs Actual - Theme Colors) ─
interface MockupFinancialsCardProps {
  totalApprovedBudget: number
  totalActualSpend: number
  portfolios: PortfolioModel[]
  selectedYear: number | 'all'
  availableYears: number[]
  onYearChange: (year: number | 'all') => void
}

export const MockupFinancialsCard: React.FC<MockupFinancialsCardProps> = ({
  totalApprovedBudget,
  totalActualSpend,
  portfolios,
  selectedYear,
  availableYears,
  onYearChange
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = theme.palette.divider

  const budgetVariance = totalApprovedBudget - totalActualSpend

  // Prepare chart data: Filter and map portfolios to Budget vs Actual
  const chartData = portfolios
    .filter((p) => (p.pm_approvedbudgeteur ?? 0) > 0 || (p.pm_actualspendeur ?? 0) > 0)
    .map((p) => ({
      name: p.pm_portfolioname ? (p.pm_portfolioname.length > 12 ? p.pm_portfolioname.slice(0, 10) + '..' : p.pm_portfolioname) : 'Portfolio',
      Budget: p.pm_approvedbudgeteur ?? 0,
      Actual: p.pm_actualspendeur ?? 0
    }))

  const defaultData = [
    { name: 'Portfolio A', Budget: 500000, Actual: 420000 },
    { name: 'Portfolio B', Budget: 800000, Actual: 680000 },
    { name: 'Portfolio C', Budget: 350000, Actual: 390000 },
    { name: 'Portfolio D', Budget: 600000, Actual: 450000 }
  ]

  const data = chartData.length > 0 ? chartData : defaultData

  return (
    <Paper sx={cardStyle(theme)}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '15px' }}>
          Portfolio Financial Performance
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <select
            value={selectedYear}
            onChange={(e) => {
              const val = e.target.value
              onYearChange(val === 'all' ? 'all' : Number(val))
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1.5px solid ${theme.palette.divider}`,
              background: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontSize: '11px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>FY {y}</option>
            ))}
          </select>
          <ArrowOutwardIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }} />
        </Box>
      </Box>

      {/* Main Bar Chart in Theme Colors (Primary Green & Secondary Orange) */}
      <Box sx={{ flex: 1, minHeight: 230, mb: 3 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" stroke="none" tick={{ fill: textColor, fontSize: 10, fontWeight: 600 }} />
            <YAxis
              width={55}
              stroke="none"
              tickFormatter={(value) => {
                if (value === 0) return '€0'
                if (value >= 1_000_000_000) {
                  const b = value / 1_000_000_000
                  return `€${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)}B`
                }
                if (value >= 1_000_000) {
                  const m = value / 1_000_000
                  return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
                }
                if (value >= 1_000) {
                  const k = value / 1_000
                  return `€${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
                }
                return `€${value}`
              }}
              tick={{ fill: textColor, fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ fill: alpha(theme.palette.primary.main, 0.02) }}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color: theme.palette.text.primary
              }}
            />
            {/* Primary Green for Budget, Secondary Orange for Actual */}
            <Bar dataKey="Budget" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} maxBarSize={14} />
            <Bar dataKey="Actual" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Bottom Summary Stats */}
      <Box sx={{ borderTop: `1.5px solid ${theme.palette.divider}`, pt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary', mb: 0.5 }}>TOTAL APPROVED</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '13px', color: theme.palette.primary.main }}>
            {currencyFormatter.format(totalApprovedBudget)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary', mb: 0.5 }}>ACTUAL SPEND</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '13px', color: theme.palette.secondary.main }}>
            {currencyFormatter.format(totalActualSpend)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary', mb: 0.5 }}>VARIANCE</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '13px', color: budgetVariance >= 0 ? 'success.main' : 'error.main' }}>
            {budgetVariance >= 0 ? '+' : ''}{currencyFormatter.format(budgetVariance)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}


// ── 4. Top Sales Category (Right Card: Portfolio Trend - Theme Colors) ────────
interface MockupTrendCardProps {
  portfolioTrendData: Array<{ month: string; active: number; completed: number; delayed: number }>
  metrics: {
    totalActiveProjects: number
  }
}

export const MockupTrendCard: React.FC<MockupTrendCardProps> = ({ portfolioTrendData, metrics }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  const defaultTrend = [
    { month: 'Jan', active: 10, completed: 5 },
    { month: 'Feb', active: 12, completed: 7 },
    { month: 'Mar', active: 15, completed: 9 },
    { month: 'Apr', active: 14, completed: 11 },
    { month: 'May', active: 18, completed: 14 },
    { month: 'Jun', active: 20, completed: 16 }
  ]

  const data = portfolioTrendData && portfolioTrendData.length > 0
    ? portfolioTrendData.map(d => ({ month: d.month, active: d.active, completed: d.completed }))
    : defaultTrend

  const completedCount = data.reduce((max, d) => Math.max(max, d.completed), 0)

  return (
    <Paper sx={cardStyle(theme)}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '15px' }}>
          Portfolio Lifecycles & Trends
        </Typography>
        <ArrowOutwardIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }} />
      </Box>

      {/* Area Chart in Theme Colors */}
      <Box sx={{ flex: 1, minHeight: 230, mb: 3 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" stroke="none" tick={{ fill: textColor, fontSize: 10, fontWeight: 600 }} />
            <YAxis stroke="none" tick={{ fill: textColor, fontSize: 10, fontWeight: 600 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color: theme.palette.text.primary
              }}
            />
            <defs>
              {/* Dynamic Theme Primary Green Gradient */}
              <linearGradient id="themeColorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.25} />
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            {/* Primary Green for Active, Secondary Orange for Completed */}
            <Area type="monotone" dataKey="active" stroke={theme.palette.primary.main} strokeWidth={2.5} fillOpacity={1} fill="url(#themeColorActive)" />
            <Line type="monotone" dataKey="completed" stroke={theme.palette.secondary.main} strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* Bottom Summary Stats */}
      <Box sx={{ borderTop: `1.5px solid ${theme.palette.divider}`, pt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary', mb: 0.5 }}>ACTIVE PROJECTS</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '13px', color: theme.palette.primary.main }}>
            {metrics.totalActiveProjects}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary', mb: 0.5 }}>COMPLETED RATE</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '13px', color: theme.palette.success.main }}>
            {completedCount} completed
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}


// ── 5. Bottom Row: Card 1 (Pipeline Funnel Stages in Theme Colors) ───────────
interface MockupPipelineCardProps {
  initiatives: InitiativeModel[]
}

export const MockupPipelineCard: React.FC<MockupPipelineCardProps> = ({ initiatives }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Map to dynamic theme colors (Success green, Warning amber, Primary green, Error red, Secondary orange)
  const PIPELINE_STAGES: Record<number, { label: string; color: string }> = {
    0: { label: 'Approved', color: theme.palette.success.main },
    1: { label: 'Under Review', color: theme.palette.warning.main },
    2: { label: 'Deferred', color: theme.palette.primary.main },
    3: { label: 'Rejected', color: theme.palette.error.main },
    4: { label: 'Converted', color: theme.palette.secondary.main }
  }

  // Count stage instances
  const stageCounts = React.useMemo(() => {
    const counts: Record<number, number> = {}
    let total = 0
    for (const init of initiatives) {
      const st = typeof init.pm_pipelinestatus === 'number' ? init.pm_pipelinestatus : Number(init.pm_pipelinestatus)
      if (!isNaN(st)) {
        counts[st] = (counts[st] ?? 0) + 1
        total++
      }
    }
    return { counts, total }
  }, [initiatives])

  const stagesList = Object.entries(PIPELINE_STAGES).map(([key, info]) => {
    const k = Number(key)
    const count = stageCounts.counts[k] ?? 0
    const percentage = stageCounts.total > 0 ? (count / stageCounts.total) * 100 : 0
    return {
      key: k,
      label: info.label,
      color: info.color,
      count,
      percentage
    }
  })

  return (
    <Paper sx={cardStyle(theme)}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '13px' }}>
          Pipeline Funnel Status
        </Typography>
        <ArrowOutwardIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }} />
      </Box>

      {/* Horizontal Split Progress Bar */}
      <Box
        sx={{
          height: 8,
          width: '100%',
          borderRadius: '4px',
          display: 'flex',
          overflow: 'hidden',
          bgcolor: theme.palette.divider,
          mb: 3
        }}
      >
        {stageCounts.total > 0 ? (
          stagesList.map((stage) => (
            <Box
              key={stage.key}
              sx={{
                height: '100%',
                width: `${stage.percentage}%`,
                bgcolor: stage.color
              }}
            />
          ))
        ) : (
          <Box sx={{ height: '100%', width: '100%', bgcolor: 'text.disabled', opacity: 0.1 }} />
        )}
      </Box>

      {/* List items representing Legend */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 'auto' }}>
        {stagesList.map((stage) => (
          <Box key={stage.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.color }} />
              <Typography sx={{ fontSize: '11px', fontWeight: 650, color: 'text.secondary' }}>
                {stage.label}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
              {stage.count}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}


// ── 6. Bottom Row: Card 2 (Logged Hours Wave Sparkline - Theme Color Aligned) ──
interface MockupResourceTrendCardProps {
  plannedVsActualData: Array<{ month: string; planned: number; actual: number }>
}

export const MockupResourceTrendCard: React.FC<MockupResourceTrendCardProps> = ({ plannedVsActualData }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const totalHours = plannedVsActualData.reduce((sum, d) => sum + (d.actual || 0), 0)

  const defaultWave = [
    { month: 'Jan', actual: 120 },
    { month: 'Feb', actual: 150 },
    { month: 'Mar', actual: 110 },
    { month: 'Apr', actual: 180 },
    { month: 'May', actual: 160 },
    { month: 'Jun', actual: 210 }
  ]

  const data = plannedVsActualData && plannedVsActualData.length > 0
    ? plannedVsActualData.map(d => ({ month: d.month, actual: d.actual }))
    : defaultWave

  return (
    <Paper sx={cardStyle(theme)}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '13px' }}>
            Logged Hours
          </Typography>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary' }}>
            AVG PER MONTH
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 850, fontSize: '20px', letterSpacing: '-0.02em', color: theme.palette.primary.main }}>
          {totalHours > 0 ? `${(totalHours / data.length).toFixed(0)}h` : '185h'}
        </Typography>
      </Box>

      {/* Smooth Wave Line sparkline in Theme Primary Color */}
      <Box sx={{ flex: 1, minHeight: 120, width: '100%', mt: 'auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, bottom: 5, left: -5, right: -5 }}>
            <defs>
              <linearGradient id="colorThemeWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: '12px',
                fontSize: '11px'
              }}
              formatter={(value) => [`${value}h`, 'Actual Hours']}
            />
            <Area type="monotone" dataKey="actual" stroke={theme.palette.primary.main} strokeWidth={2.5} fillOpacity={1} fill="url(#colorThemeWave)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}


// ── 7. Bottom Row: Card 3 (Circular SVG Budget Consumption Gauge in Theme Colors) ──
interface MockupBudgetGaugeCardProps {
  totalApprovedBudget: number
  totalActualSpend: number
}

export const MockupBudgetGaugeCard: React.FC<MockupBudgetGaugeCardProps> = ({ totalApprovedBudget, totalActualSpend }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const budgetPct = totalApprovedBudget > 0
    ? Math.min(100, (totalActualSpend / totalApprovedBudget) * 100)
    : 0

  const budgetVariance = totalApprovedBudget - totalActualSpend

  // SVG Gauge Math
  const radius = 38
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (budgetPct / 100) * circumference

  // Render non-zero tiny values with higher precision so they don't round to 0.0%
  const displayPct = budgetPct > 0 && budgetPct < 0.01
    ? '>0.00%'
    : budgetPct > 0 && budgetPct < 0.1
      ? `${budgetPct.toFixed(2)}%`
      : `${budgetPct.toFixed(1)}%`

  return (
    <Paper sx={cardStyle(theme)}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '13px' }}>
          Budget Consumption
        </Typography>
        <ArrowOutwardIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary' }}>ACTUAL</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '11px', color: theme.palette.secondary.main, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currencyFormatter.format(totalActualSpend)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right', minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary' }}>TARGET BUDGET</Typography>
          <Typography sx={{ fontWeight: 850, fontSize: '11px', color: theme.palette.primary.main, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currencyFormatter.format(totalApprovedBudget)}</Typography>
        </Box>
      </Box>

      {/* SVG Circular Radial Gauge in Primary Green */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', my: 'auto', py: 1 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={theme.palette.divider}
            strokeWidth={strokeWidth}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={theme.palette.primary.main} // Dynamic Primary Green
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 850, fontSize: '13px', fontFamily: '"JetBrains Mono", monospace', color: theme.palette.primary.main }}>
            {displayPct}
          </Typography>
        </Box>
      </Box>

      {/* Variance Display at the bottom */}
      <Box sx={{ mt: 2, pt: 1.5, borderTop: `1.5px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '9px', fontWeight: 750, color: 'text.secondary' }}>VARIANCE</Typography>
        <Typography sx={{ fontSize: '11px', fontWeight: 850, color: budgetVariance >= 0 ? 'success.main' : 'error.main' }}>
          {currencyFormatter.format(budgetVariance)}
        </Typography>
      </Box>
    </Paper>
  )
}


// ── 8. Bottom Row: Card 4 (Rounded Column chart - Theme Semantic Colors) ──────
interface MockupSeverityCardProps {
  risks: RiskModel[]
  issues: IssueModel[]
}

export const MockupSeverityCard: React.FC<MockupSeverityCardProps> = ({ risks = [], issues = [] }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  // Map high, medium, low severities across active risks & issues using theme semantics
  const severityCounts = React.useMemo(() => {
    let high = 0
    let medium = 0
    let low = 0

    // Map risks using pm_inherentimpact
    for (const r of risks) {
      const sev = String(r.pm_inherentimpact ?? '').toLowerCase()
      if (sev === '2' || sev === 'high' || sev === '3' || sev === 'critical' || sev === '4' || sev === '5') high++
      else if (sev === '1' || sev === 'medium' || sev === 'moderate') medium++
      else if (sev !== '') low++
    }

    // Map issues using pm_prioritylevel
    for (const i of issues) {
      const prio = String(i.pm_prioritylevel ?? '').toLowerCase()
      if (prio === '2' || prio === 'high' || prio === 'critical' || prio === '3' || prio === '4' || prio === '5') high++
      else if (prio === '1' || prio === 'medium' || prio === 'moderate') medium++
      else if (prio !== '') low++
    }

    if (high === 0 && medium === 0 && low === 0) {
      return [
        { name: 'High', count: 6 },
        { name: 'Medium', count: 12 },
        { name: 'Low', count: 4 }
      ]
    }

    return [
      { name: 'High', count: high },
      { name: 'Medium', count: medium },
      { name: 'Low', count: low }
    ]
  }, [risks, issues])

  return (
    <Paper sx={cardStyle(theme)}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '13px' }}>
          Active Threat Levels
        </Typography>
        <ArrowOutwardIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }} />
      </Box>

      {/* Columns color-coded to theme error (red), warning (amber), and primary (green) */}
      <Box sx={{ flex: 1, minHeight: 120, mt: 'auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={severityCounts} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" stroke="none" tick={{ fill: textColor, fontSize: 10, fontWeight: 600 }} />
            <YAxis stroke="none" tick={{ fill: textColor, fontSize: 10, fontWeight: 600 }} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: '8px',
                border: `1.5px solid ${theme.palette.divider}`,
                fontSize: '11px'
              }}
            />
            <Bar dataKey="count" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} maxBarSize={16}>
              {severityCounts.map((entry, index) => {
                const colors = [theme.palette.error.main, theme.palette.warning.main, theme.palette.primary.main]
                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}
