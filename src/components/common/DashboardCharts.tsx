import { Box, Paper, Typography, useTheme } from "@mui/material"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface DashboardChartsProps {
  projectStatusData?: Array<{
    name: string
    value: number
  }>
  portfolioTrendData?: Array<{
    month: string
    active: number
    completed: number
    delayed: number
  }>
  resourceUtilizationData?: Array<{
    team: string
    utilized: number
    available: number
  }>
}

const COLORS = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"]

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  projectStatusData = [
    { name: "Active", value: 15 },
    { name: "Completed", value: 28 },
    { name: "On Hold", value: 5 },
    { name: "Delayed", value: 3 },
  ],
  portfolioTrendData = [
    { month: "Jan", active: 10, completed: 5, delayed: 2 },
    { month: "Feb", active: 12, completed: 8, delayed: 1 },
    { month: "Mar", active: 15, completed: 10, delayed: 3 },
    { month: "Apr", active: 14, completed: 15, delayed: 2 },
    { month: "May", active: 15, completed: 20, delayed: 1 },
    { month: "Jun", active: 18, completed: 25, delayed: 2 },
  ],
  resourceUtilizationData = [
    { team: "Development", utilized: 85, available: 15 },
    { team: "Design", utilized: 78, available: 22 },
    { team: "QA", utilized: 92, available: 8 },
    { team: "PM", utilized: 100, available: 0 },
  ],
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === "dark"
  const textColor = isDark ? "#f8fafc" : "#0f172a"
  const gridColor = isDark ? "#334155" : "#e6eef7"

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
      {/* Project Status Pie Chart */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Project Status Distribution
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={projectStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {projectStatusData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: `1px solid ${gridColor}`,
                color: textColor,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Paper>

      {/* Portfolio Trend Line Chart */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Portfolio Trend
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={portfolioTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis stroke={textColor} />
            <YAxis stroke={textColor} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: `1px solid ${gridColor}`,
                color: textColor,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="active"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: "#0ea5e9" }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e" }}
            />
            <Line
              type="monotone"
              dataKey="delayed"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Resource Utilization Bar Chart */}
      <Paper elevation={1} sx={{ p: 3, gridColumn: { md: "1 / -1" } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Resource Utilization
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resourceUtilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis stroke={textColor} />
            <YAxis stroke={textColor} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: `1px solid ${gridColor}`,
                color: textColor,
              }}
            />
            <Legend />
            <Bar dataKey="utilized" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            <Bar dataKey="available" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  )
}

export default DashboardCharts
