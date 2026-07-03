import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, useTheme } from '@mui/material'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface DashboardChartsProps {
  projectStatusData?: Array<{ name: string; value: number }>
  portfolioTrendData?: Array<{ month: string; active: number; completed: number; delayed: number }>
  // Resource chart data props
  capacityAllocationData?: Array<{ resource: string; capacity: number; allocated: number; percentage: number }>
  plannedVsActualData?: Array<{ month: string; planned: number; actual: number }>
  utilizationByProjectData?: Array<{ name: string; hours: number }>
  departmentDemandData?: Array<{ month: string; role: string; hours: number }>
  resourceMonth?: Date
  onResourceMonthChange?: (date: Date) => void
}

const RAG_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

const DONUT_COLORS = [
  '#0ea5e9', '#8b5cf6', '#f97316', '#06b6d4',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#84cc16', '#a855f7',
]

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  projectStatusData = [
    { name: 'Active', value: 15 },
    { name: 'Completed', value: 28 },
    { name: 'On Hold', value: 5 },
    { name: 'Delayed', value: 3 },
  ],
  portfolioTrendData = [
    { month: 'Jan', active: 10, completed: 5, delayed: 2 },
    { month: 'Feb', active: 12, completed: 8, delayed: 1 },
    { month: 'Mar', active: 15, completed: 10, delayed: 3 },
    { month: 'Apr', active: 14, completed: 15, delayed: 2 },
    { month: 'May', active: 15, completed: 20, delayed: 1 },
    { month: 'Jun', active: 18, completed: 25, delayed: 2 },
  ],
  capacityAllocationData = [],
  plannedVsActualData = [],
  utilizationByProjectData = [],
  departmentDemandData = [],
  resourceMonth,
  onResourceMonthChange,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const gridColor = isDark ? '#334155' : '#e6eef7'

  const [resourceTab, setResourceTab] = useState(0)

  const tooltipStyle = {
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${gridColor}`,
    color: textColor,
    borderRadius: 8,
    fontSize: 13,
    boxShadow: isDark ? '0 10px 15px -3px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgba(0,0,0,0.1)',
  }

  // ── Project Status Donut ─────────────────────────────────────────────────
  const renderProjectStatus = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={projectStatusData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {projectStatusData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={RAG_COLORS[index % RAG_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" height={16} iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  )

  // ── Portfolio Trend Line ─────────────────────────────────────────────────
  const renderPortfolioTrend = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={portfolioTrendData} margin={{ top: 10, right: 10, left: 15, bottom: 18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis stroke={textColor} dataKey="month" label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fill: textColor }} tick={{ fontSize: 11 }} />
        <YAxis stroke={textColor} label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 0, fill: textColor, style: { textAnchor: 'middle', whiteSpace: 'nowrap' } }} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" height={16} iconSize={10} />
        <Line type="monotone" dataKey="active" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} />
        <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
        <Line type="monotone" dataKey="delayed" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )

  // ── Tab 1: Capacity vs Allocation (Stacked Bar) ──────────────────────────
  const renderCapacityAllocation = () => {
    const hasData = capacityAllocationData.length > 0

    // Transform data for stacked bar: break into segments that sum to the total bar
    const stackedData = hasData
      ? capacityAllocationData.map((d) => {
        const capped = Math.min(d.allocated, d.capacity)
        const available = Math.max(0, d.capacity - d.allocated)
        const overage = Math.max(0, d.allocated - d.capacity)
        return {
          resource: d.resource,
          allocated: capped,
          available,
          overage,
          percentage: d.percentage,
        }
      })
      : [{ resource: 'No Data', allocated: 0, available: 160, overage: 0, percentage: 0 }]

    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Daily capacity vs. allocated hours per resource. Over 100% indicates over-allocation.
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={stackedData} layout="vertical" barSize={16} margin={{ top: 10, right: 10, left: 10, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis type="number" stroke={textColor} tick={{ fontSize: 11 }} label={{ value: 'Hours / Month', position: 'insideBottom', offset: -2, fill: textColor }} />
            <YAxis type="category" dataKey="resource" width={120} stroke={textColor} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: any, name: any) => {
                if (name === 'allocated') return [`${value}h`, 'Allocated Hours']
                if (name === 'available') return [`${value}h`, 'Available Capacity']
                if (name === 'overage') return [`${value}h`, 'Over-allocated']
                return [value, name]
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={16}
              iconSize={10}
              formatter={(value: string) => {
                if (value === 'allocated') return 'Allocated Hours'
                if (value === 'available') return 'Available Capacity'
                if (value === 'overage') return 'Over-allocated'
                return value
              }}
            />
            <Bar dataKey="available" stackId="a" fill={isDark ? '#334155' : '#e2e8f0'} radius={[0, 0, 0, 0]} />
            <Bar
              dataKey="allocated"
              stackId="a"
              radius={[0, 0, 0, 0]}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props
                if (!hasData) return null
                const pct = payload.percentage
                const fill = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e'
                return <rect x={x} y={y} width={width} height={height} fill={fill} />
              }}
            />
            <Bar dataKey="overage" stackId="a" fill="#dc2626" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {hasData && (
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>≤ 80% (Healthy)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>80–100% (At Risk)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>&gt; 100% (Over-allocated)</Typography>
            </Box>
          </Box>
        )}
      </>
    )
  }

  // ── Tab 2: Planned vs Actual (Clustered Column) ──────────────────────────
  const renderPlannedVsActual = () => {
    const hasData = plannedVsActualData.length > 0
    const data = hasData ? plannedVsActualData : [{ month: 'No Data', planned: 0, actual: 0 }]
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Forecasted (planned) hours vs. actual logged hours from timesheets by month.
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} barGap={4} barSize={18} margin={{ top: 10, right: 10, left: 15, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis stroke={textColor} dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fill: textColor }} />
            <YAxis stroke={textColor} tick={{ fontSize: 11 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 0, fill: textColor, style: { textAnchor: 'middle', whiteSpace: 'nowrap' } }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: any, name: any) => {
                if (name === 'planned') return [`${value}h`, 'Planned']
                return [`${value}h`, 'Actual']
              }}
            />
            <Legend verticalAlign="bottom" height={16} iconSize={10} formatter={(value: string) => (value === 'planned' ? 'Planned Hours' : 'Actual Hours')} />
            <Bar dataKey="planned" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </>
    )
  }

  // ── Tab 3: Utilization by Project (Donut) ────────────────────────────────
  const renderUtilizationByProject = () => {
    const hasData = utilizationByProjectData.length > 0
    const data = hasData ? utilizationByProjectData : [{ name: 'No Data', hours: 1 }]
    const totalHours = data.reduce((sum, d) => sum + d.hours, 0)
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Where workforce time is actually being spent, grouped by project.
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              labelLine={false}
              label={({ name, hours }: any) => {
                const pct = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : '0'
                return `${name}: ${pct}%`
              }}
              dataKey="hours"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}h`, 'Hours']} />
            <Legend
              verticalAlign="bottom"
              height={16}
              iconSize={10}
              formatter={(value: string) => {
                const item = data.find((d) => d.name === value)
                if (item) return `${value} (${item.hours}h)`
                return value
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </>
    )
  }

  // ── Tab 4: Department Demand Forecast (Area Chart) ──────────────────────
  const renderDepartmentDemand = () => {
    const hasData = departmentDemandData.length > 0

    const months = hasData
      ? Array.from(new Set(departmentDemandData.map((d) => d.month)))
      : []
    const roles = hasData
      ? Array.from(new Set(departmentDemandData.map((d) => d.role)))
      : []

    const areaData = months.map((month) => {
      const point: any = { month }
      for (const role of roles) {
        const match = departmentDemandData.find((d) => d.month === month && d.role === role)
        point[role] = match?.hours ?? 0
      }
      return point
    })

    const roleColors = [
      '#0ea5e9', '#8b5cf6', '#f97316', '#06b6d4',
      '#ec4899', '#14b8a6', '#eab308', '#6366f1',
      '#84cc16', '#a855f7',
    ]

    const noDataPlaceholder = [{ month: 'No Data', 'No Data': 1 }]

    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Forward-looking allocation demand trend grouped by department.
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={hasData ? areaData : noDataPlaceholder} margin={{ top: 10, right: 10, left: 15, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis stroke={textColor} dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fill: textColor }} />
            <YAxis stroke={textColor} tick={{ fontSize: 11 }} label={{ value: 'Allocated Hours', angle: -90, position: 'insideLeft', offset: 0, fill: textColor, style: { textAnchor: 'middle', whiteSpace: 'nowrap' } }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="bottom" height={16} iconSize={10} />
            {hasData
              ? roles.map((role, idx) => (
                <Area
                  key={role}
                  type="monotone"
                  dataKey={role}
                  stroke={roleColors[idx % roleColors.length]}
                  fill={roleColors[idx % roleColors.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              ))
              : (
                <Area
                  type="monotone"
                  dataKey="No Data"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              )
            }
          </AreaChart>
        </ResponsiveContainer>
      </>
    )
  }

  const resourceChartPanels = [
    { label: 'Capacity vs Allocation', content: renderCapacityAllocation() },
    { label: 'Planned vs Actual', content: renderPlannedVsActual() },
    { label: 'Utilization by Project', content: renderUtilizationByProject() },
    { label: 'Dept. Demand Forecast', content: renderDepartmentDemand() },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      {/* Project Status Pie Chart */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 12px 20px rgba(0,0,0,0.5)'
              : '0 8px 16px rgba(99,102,241,0.06)',
          }
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Project Risk Distribution
        </Typography>
        {renderProjectStatus()}
      </Paper>

      {/* Portfolio Trend Line Chart */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 12px 20px rgba(0,0,0,0.5)'
              : '0 8px 16px rgba(99,102,241,0.06)',
          }
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Portfolio Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Monthly trend of active (blue), completed (green), and delayed (red) projects over the last 12 months based on actual project lifecycle dates.
        </Typography>
        {renderPortfolioTrend()}
      </Paper>

      {/* Resource Utilization Charts — Tabbed */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          gridColumn: { md: '1 / -1' },
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 12px 20px rgba(0,0,0,0.5)'
              : '0 8px 16px rgba(99,102,241,0.06)',
          }
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Resource Utilization
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={resourceTab}
            onChange={(_, v) => setResourceTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40 },
            }}
          >
            {resourceChartPanels.map((panel, idx) => (
              <Tab key={idx} label={panel.label} />
            ))}
          </Tabs>
          {resourceTab === 0 && onResourceMonthChange && resourceMonth && (
            <input
              type="month"
              value={`${resourceMonth.getFullYear()}-${String(resourceMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month] = e.target.value.split('-')
                  onResourceMonthChange(new Date(parseInt(year), parseInt(month) - 1, 1))
                }
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: isDark ? '#1e293b' : '#fff',
                color: textColor,
                fontSize: '14px',
                marginRight: '8px'
              }}
            />
          )}
        </Box>

        <Box sx={{ minHeight: 400 }}>
          {resourceChartPanels[resourceTab].content}
        </Box>
      </Paper>
    </Box>
  )
}

export default DashboardCharts
