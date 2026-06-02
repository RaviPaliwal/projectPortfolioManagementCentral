import { useMemo } from 'react'
import {
  Grid,
  Paper,
  Typography,
  Box,
  Divider,
  useTheme,
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { RiskModel } from '@/types/dataverse'
import {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  SEVERITY_COLORS,
  riskScore,
  getScoreLabel,
} from '../constants'

interface RiskDistributionChartsProps {
  risks: RiskModel[]
}

export const RiskDistributionCharts = ({ risks }: RiskDistributionChartsProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Severity Distribution Pie Chart Data
  const severityChartData = useMemo(() => {
    const sev: Record<string, number> = { High: 0, Medium: 0, Low: 0, Unscored: 0 }
    for (const r of risks) {
      const score = riskScore(r.pm_inherentprobability, r.pm_inherentimpact)
      const label = getScoreLabel(score)
      sev[label] = (sev[label] ?? 0) + 1
    }
    return Object.entries(sev)
      .map(([name, value]) => ({ name, value }))
  }, [risks])

  // Category Distribution Bar Chart Data
  const categoryChartData = useMemo(() => {
    const catCount: Record<string, number> = {}
    for (const r of risks) {
      const cat = RISK_CATEGORY_LABELS[String(r.pm_riskcategory ?? '')] ?? 'Unknown'
      catCount[cat] = (catCount[cat] ?? 0) + 1
    }
    return Object.entries(catCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [risks])

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      {/* Severity Distribution Pie Chart */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Severity Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Breakdown of risks by inherent severity level.
          </Typography>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {severityChartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {severityChartData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                      background: isDark ? '#1e293b' : '#ffffff',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                    formatter={(value: string) => (
                      <span style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.8rem' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">No severity data</Typography>
            )}
          </Box>
          {/* Severity summary stats */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            {severityChartData.map((d) => (
              <Box key={d.name} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: SEVERITY_COLORS[d.name] ?? '#94a3b8', display: 'block' }}>
                  {d.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {d.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Grid>

      {/* Category Distribution Bar Chart */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Risk by Category
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Distribution of risks across category types.
          </Typography>
          <Box sx={{ height: 220 }}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#475569' }}
                    axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                      background: isDark ? '#1e293b' : '#ffffff',
                    }}
                  />
                  <Bar dataKey="value" name="Risks" radius={[6, 6, 0, 0]}>
                    {categoryChartData.map((entry) => {
                      const colorKey = Object.entries(RISK_CATEGORY_LABELS).find(([, v]) => v === entry.name)?.[0]
                      return <Cell key={entry.name} fill={RISK_CATEGORY_COLORS[colorKey ?? ''] ?? '#0ea5e9'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body2" color="text.secondary">No category data</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Risk Summary Stats */}
      <Grid size={{ xs: 12, md: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Risk Summary
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Key metrics at a glance.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, borderRadius: 1.5, bgcolor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>High Risk</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {severityChartData.find(d => d.name === 'High')?.value ?? 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, borderRadius: 1.5, bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Medium Risk</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {severityChartData.find(d => d.name === 'Medium')?.value ?? 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, borderRadius: 1.5, bgcolor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Low Risk</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#22c55e' }}>
                {severityChartData.find(d => d.name === 'Low')?.value ?? 0}
              </Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Total Risks</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{risks.length}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>% High / Med</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {risks.length > 0
                  ? `${Math.round(((severityChartData.find(d => d.name === 'High')?.value ?? 0) + (severityChartData.find(d => d.name === 'Medium')?.value ?? 0)) / risks.length * 100)}%`
                  : '—'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>
      
    </Grid>
  )
}
