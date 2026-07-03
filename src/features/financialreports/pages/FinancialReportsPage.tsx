import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Alert,
  CircularProgress,
  Button,
  useTheme,
  TablePagination
} from '@mui/material'
import AssessmentIcon from '@mui/icons-material/Assessment'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { PageHeader } from '@/components/common'
import { fetchReportConfigs, type FinancialReportConfigModel } from '@/services/financial-report-config.service'
import { fetchBudgetLines, fetchCashflowEntries } from '@/services/finance.service'
import { exportToCsv } from '@/utils/exportUtils'
import { useUser } from '@/context/UserContext'
import type { TabKey } from '@/components/layout/PrimaryShell'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

import { Pm_projecttasksService } from '@/generated/services/Pm_projecttasksService'
import { Pm_projectmilestonesService } from '@/generated/services/Pm_projectmilestonesService'
import { fetchAllRisks, fetchAllIssues } from '@/services/risk-issue.service'
import { unwrapList } from '@/services/common'
import { fetchProjects } from '@/services/project.service'
import { useReportData } from '../hooks/useReportData'
import { useReportDataProcessor } from '../hooks/useReportDataProcessor'

export interface FinancialReportsPageProps {
  onNavigate?: (tab: TabKey) => void
}

export default function FinancialReportsPage({ onNavigate }: FinancialReportsPageProps) {
  const theme = useTheme()
  const { currentUser, currentUserPersona, users } = useUser()
  const [configs, setConfigs] = useState<FinancialReportConfigModel[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Paging states
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  // Visible configs list based on privacy / owner
  const visibleConfigs = useMemo(() => {
    const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
    const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
    return configs.filter(c => {
      if (c.pm_ispublic) return true
      if (isAdmin) return true
      const ownerId = c.ownerid?.toLowerCase() || ''
      return ownerId === currentUserId
    })
  }, [configs, currentUser, currentUserPersona])

  // Reset page when template changes
  useEffect(() => {
    setPage(0)
  }, [selectedConfigId])

  const {
    budgetLines,
    cashFlows,
    tasks,
    milestones,
    risks,
    issues,
    projects,
    loading: dataLoading,
    error: dataError
  } = useReportData()

  // Load configs
  useEffect(() => {
    async function loadConfigs() {
      try {
        setLoading(true)
        const configsList = await fetchReportConfigs()
        setConfigs(configsList)

        // Select first visible config on load if available
        const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
        const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
        const initialVisible = configsList.filter(c => c.pm_ispublic || isAdmin || c.ownerid?.toLowerCase() === currentUserId)
        if (initialVisible.length > 0) {
          setSelectedConfigId(initialVisible[0].pm_financialreportconfigid)
        }
      } catch (err) {
        setError('Failed to fetch report configurations.')
      } finally {
        setLoading(false)
      }
    }
    loadConfigs()
  }, [currentUser, currentUserPersona])

  const isLoading = loading || dataLoading
  const combinedError = error || dataError

  // Resolve currently active configuration
  const activeConfig = useMemo(() => {
    return visibleConfigs.find(c => c.pm_financialreportconfigid === selectedConfigId) || null
  }, [selectedConfigId, visibleConfigs])

  // Check if current user has edit permission for the active config
  const canEditActiveConfig = useMemo(() => {
    if (!activeConfig) return false
    const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
    if (isAdmin) return true

    const ownerId = activeConfig.ownerid?.toLowerCase() || ''
    const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
    return ownerId === currentUserId
  }, [activeConfig, currentUser, currentUserPersona])

  // Process data based on active configuration
  const processedReportData = useReportDataProcessor(
    activeConfig,
    budgetLines,
    tasks,
    milestones,
    risks,
    issues,
    projects
  )

  // Resolve active report type
  const reportType = useMemo(() => {
    if (!activeConfig) return 'financial'
    try {
      const parsed = activeConfig.pm_selectedfilters ? JSON.parse(activeConfig.pm_selectedfilters) : {}
      return parsed.reportType || 'financial'
    } catch {
      return 'financial'
    }
  }, [activeConfig])

  // Get active series properties for charting/table mapping
  const seriesConfig = useMemo(() => {
    if (reportType === 'financial') {
      return [
        { key: 'budget', name: 'Approved Budget', color: theme.palette.primary.main },
        { key: 'actual', name: 'Actual Cost', color: theme.palette.success.main },
        { key: 'forecast', name: 'Forecast', color: '#8a2be2' }
      ]
    } else if (reportType === 'schedule') {
      return [
        { key: 'duration', name: 'Duration (Days)', color: theme.palette.primary.main },
        { key: 'complete', name: '% Complete', color: theme.palette.success.main },
        { key: 'overdue', name: 'Overdue Tasks', color: theme.palette.error.main },
        { key: 'milestones', name: 'Milestone Count', color: theme.palette.warning.main },
        { key: 'totalTasks', name: 'Total Tasks', color: theme.palette.secondary.main }
      ]
    } else {
      return [
        { key: 'impact', name: 'Impact Score', color: theme.palette.primary.main },
        { key: 'probability', name: 'Probability Score', color: theme.palette.info.main },
        { key: 'open', name: 'Open Issues', color: theme.palette.error.main },
        { key: 'mitigated', name: 'Mitigated Risks', color: theme.palette.success.main }
      ]
    }
  }, [reportType, theme])

  const activeSeries = useMemo(() => {
    return seriesConfig.filter(s => processedReportData.columnsList.includes(s.key))
  }, [seriesConfig, processedReportData.columnsList])

  const yAxisTickFormatter = (val: any) => {
    if (reportType === 'financial') return `€${val / 1000}k`
    return val
  }

  const tooltipFormatter = (val: any) => {
    if (reportType === 'financial') return `€${Number(val).toLocaleString()}`
    return Number(val).toLocaleString()
  }

  // Export report data to CSV
  const handleExport = () => {
    if (processedReportData.list.length === 0 || !activeConfig) return

    const columns: any[] = [
      { key: 'name', label: 'Grouping Category' }
    ]
    activeSeries.forEach(s => {
      const suffix = reportType === 'financial' ? ' (EUR)' : ''
      columns.push({ key: s.key, label: `${s.name}${suffix}` })
    })

    const filename = `${activeConfig.pm_name.replace(/\s+/g, '_')}_Report`
    exportToCsv(filename, columns, processedReportData.list)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 6 }}>
      <PageHeader
        title={reportType === 'financial' ? "Financial Reports" : reportType === 'schedule' ? "Schedule Reports" : "Risk & Issue Reports"}
        subtitle="Access and review saved templates, tracking, metrics, and detailed grids."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'nowrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                localStorage.setItem('selected_report_config_id', 'new')
                onNavigate?.('reportConfigs')
              }}
              sx={{ px: 2, whiteSpace: 'nowrap' }}
            >
              Create Report
            </Button>
            {activeConfig && canEditActiveConfig && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  localStorage.setItem('selected_report_config_id', activeConfig.pm_financialreportconfigid)
                  onNavigate?.('reportConfigs')
                }}
                sx={{ px: 2, whiteSpace: 'nowrap' }}
              >
                Edit Report
              </Button>
            )}
            {visibleConfigs.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                disabled={processedReportData.list.length === 0}
                sx={{ px: 2, whiteSpace: 'nowrap' }}
              >
                Export CSV
              </Button>
            )}
          </Box>
        }
      />

      {visibleConfigs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3, border: `1px dashed ${theme.palette.divider}`, bgcolor: 'transparent' }}>
          <AssessmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            No Saved Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There are currently no report templates configured in the system.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              localStorage.setItem('selected_report_config_id', 'new')
              onNavigate?.('reportConfigs')
            }}
          >
            Create Your First Report
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mt: 3 }}>
          {/* Saved template modern selector pills */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Active Report Template
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              overflowX: 'auto', 
              pb: 1.5, 
              '&::-webkit-scrollbar': { height: 6 }, 
              '&::-webkit-scrollbar-thumb': { bgcolor: 'action.focus', borderRadius: 3 } 
            }}>
              {visibleConfigs.map(c => {
                const isActive = c.pm_financialreportconfigid === selectedConfigId
                const isPrivate = !c.pm_ispublic
                const ownerUser = users.find(u => u.systemuserid.toLowerCase() === c.ownerid?.toLowerCase())
                const ownerName = ownerUser ? ownerUser.fullname : (c.owneridname || 'System')
                const displayLabel = isPrivate ? `${c.pm_name} (Private - Owner: ${ownerName})` : c.pm_name
                return (
                  <Button
                    key={c.pm_financialreportconfigid}
                    onClick={() => setSelectedConfigId(c.pm_financialreportconfigid)}
                    variant={isActive ? "contained" : "outlined"}
                    startIcon={<AssessmentIcon />}
                    sx={{
                      borderRadius: 6,
                      py: 1,
                      px: 3,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? `0 4px 12px ${theme.palette.primary.main}33` : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: isActive ? `0 6px 16px ${theme.palette.primary.main}44` : 'none'
                      }
                    }}
                  >
                    {displayLabel} {isPrivate && '🔒'}
                  </Button>
                )
              })}
            </Box>
          </Box>

          {activeConfig?.pm_description && (
            <Paper variant="outlined" sx={{ p: 1.5, px: 2, borderRadius: 1.5, mb: 1, bgcolor: 'background.default', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                <strong>Report Description:</strong> {activeConfig.pm_description}
              </Typography>
            </Paper>
          )}

          <Divider sx={{ my: 2 }} />

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Report Dashboard Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {reportType === 'financial' ? (
              <>
                {processedReportData.columnsList.includes('budget') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Approved Budget
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          €{processedReportData.totals.budget.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('actual') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Actual Spend
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                          €{processedReportData.totals.actual.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('forecast') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Forecasted Spend
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'info.main' }}>
                          €{processedReportData.totals.forecast.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('variance') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Remaining Variance
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 700,
                            mt: 1,
                            color: processedReportData.totals.variance < 0 ? 'error.main' : 'warning.main'
                          }}
                        >
                          €{processedReportData.totals.variance.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            ) : reportType === 'schedule' ? (
              <>
                {processedReportData.columnsList.includes('duration') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Task Duration
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          {processedReportData.totals.duration} Days
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('complete') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Completion %
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                          {processedReportData.totals.complete}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('overdue') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Overdue Tasks
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>
                          {processedReportData.totals.overdue}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('milestones') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Milestone Count
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'warning.main' }}>
                          {processedReportData.totals.milestones}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('totalTasks') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Total Tasks
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'secondary.main' }}>
                          {processedReportData.totals.totalTasks}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            ) : (
              <>
                {processedReportData.columnsList.includes('impact') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Impact Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          {processedReportData.totals.impact} / 5
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('probability') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Avg Probability Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'info.main' }}>
                          {processedReportData.totals.probability} / 5
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('open') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Open Issues
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>
                          {processedReportData.totals.open}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {processedReportData.columnsList.includes('mitigated') && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Mitigated Risks
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                          {processedReportData.totals.mitigated}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}
          </Grid>

          {/* Interactive Recharts Graph */}
          {activeConfig && activeConfig.pm_charttype !== 0 && (
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, mb: 4, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Report Visual Analysis Chart
              </Typography>
              <Box sx={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {activeConfig.pm_charttype === 2 ? (
                    <LineChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.name}
                          stroke={s.color}
                          strokeWidth={2}
                          activeDot={s.key === activeSeries[0]?.key ? { r: 6 } : undefined}
                        />
                      ))}
                    </LineChart>
                  ) : activeConfig.pm_charttype === 3 ? (
                    <AreaChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Area
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.name}
                          fill={`${s.color}22`}
                          stroke={s.color}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  ) : activeConfig.pm_charttype === 4 ? (
                    <BarChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.name}
                          stackId="a"
                          fill={s.color}
                        />
                      ))}
                    </BarChart>
                  ) : (
                    <BarChart data={processedReportData.list}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={yAxisTickFormatter} />
                      <Tooltip formatter={tooltipFormatter} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {activeSeries.map(s => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.name}
                          fill={s.color}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </Card>
          )}

          {/* Detailed Data Table view */}
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', backgroundColor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Breakdown Data Grid
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category Name</th>
                    {activeSeries.map(s => (
                      <th key={s.key} style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedReportData.list
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row: any, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.name}</td>
                        {activeSeries.map(s => {
                          const val = row[s.key]
                          const displayVal = reportType === 'financial' ? `€${val.toLocaleString()}` : val.toLocaleString()
                          return (
                            <td key={s.key} style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {displayVal}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  {reportType === 'financial' && (
                    <tr style={{ fontWeight: 700, backgroundColor: theme.palette.action.hover }}>
                      <td style={{ padding: '12px 16px' }}>Total Rollup Summary</td>
                      {processedReportData.columnsList.includes('budget') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.budget.toLocaleString()}</td>}
                      {processedReportData.columnsList.includes('actual') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.actual.toLocaleString()}</td>}
                      {processedReportData.columnsList.includes('forecast') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.forecast.toLocaleString()}</td>}
                      {processedReportData.columnsList.includes('variance') && <td style={{ padding: '12px 16px', textAlign: 'right' }}>€{processedReportData.totals.variance.toLocaleString()}</td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <TablePagination
              component="div"
              count={processedReportData.list.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
            />
          </Card>
        </Box>
      )}
    </Box>
  )
}
