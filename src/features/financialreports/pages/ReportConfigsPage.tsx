import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
  Button,
  Divider,
  Paper,
  Alert,
  Autocomplete,
  useTheme,
  CircularProgress,
  TablePagination
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VisibilityIcon from '@mui/icons-material/Visibility'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { PageHeader } from '@/components/common'
import type { TabKey } from '@/components/layout/PrimaryShell'
import { useUser } from '@/context/UserContext'
import {
  fetchReportConfigs,
  createReportConfig,
  updateReportConfig,
  deleteReportConfig,
  type FinancialReportConfigModel
} from '@/services/financial-report-config.service'
import { fetchPortfolios } from '@/services/portfolio.service'
import { fetchProgrammes } from '@/services/programme.service'
import { fetchProjects } from '@/services/project.service'
import { fetchFundingSources, fetchFinancialPeriods } from '@/services/finance.service'
import { useReportData } from '../hooks/useReportData'
import { useReportDataProcessor } from '../hooks/useReportDataProcessor'
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

interface ReportConfigsPageProps {
  onNavigate: (tab: TabKey) => void
}

export default function ReportConfigsPage({ onNavigate }: ReportConfigsPageProps) {
  const theme = useTheme()
  const { currentUser, currentUserPersona, users } = useUser()

  const [configs, setConfigs] = useState<FinancialReportConfigModel[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>(() => {
    const saved = localStorage.getItem('selected_report_config_id')
    if (saved) {
      localStorage.removeItem('selected_report_config_id')
      return saved
    }
    return 'new'
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

  // Ownership & Permission checks
  const canEditOrDelete = useMemo(() => {
    if (selectedConfigId === 'new') return true // Anyone who can reach here can create
    const isAdmin = currentUserPersona === 'SystemAdministrator' || currentUserPersona === 'PMO'
    if (isAdmin) return true

    const selected = configs.find(c => c.pm_financialreportconfigid === selectedConfigId)
    if (!selected) return false

    const ownerId = selected.ownerid?.toLowerCase() || ''
    const currentUserId = currentUser?.systemuserid?.toLowerCase() || ''
    return ownerId === currentUserId
  }, [selectedConfigId, configs, currentUser, currentUserPersona])

  const selectedConfigOwnerName = useMemo(() => {
    if (selectedConfigId === 'new') return ''
    const selected = configs.find(c => c.pm_financialreportconfigid === selectedConfigId)
    if (!selected) return ''

    const ownerUser = users.find(u => u.systemuserid.toLowerCase() === selected.ownerid?.toLowerCase())
    return ownerUser ? ownerUser.fullname : (selected.owneridname || 'System')
  }, [selectedConfigId, configs, users])

  const {
    budgetLines,
    cashFlows,
    tasks,
    milestones,
    risks,
    issues,
    projects: dataverseProjects,
    loading: dataLoading
  } = useReportData()

  // Lookup data for filters
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [programmes, setProgrammes] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [fundingSources, setFundingSources] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])

  // Editor states
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [reportType, setReportType] = useState<'financial' | 'schedule' | 'risk_issue'>('financial')
  const [groupby, setGroupby] = useState<number>(3) // default: FiscalPeriod (3: FiscalPeriod)
  const [charttype, setCharttype] = useState<number>(1) // default: BarChart
  const [hierarchylevel, setHierarchylevel] = useState<number>(1) // default: Global

  // Multi-select choices (stored inside pm_selectedfilters)
  const [selectedLevelRecordIds, setSelectedLevelRecordIds] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [selectedFundingSourceIds, setSelectedFundingSourceIds] = useState<string[]>([])
  const [selectedPeriodNames, setSelectedPeriodNames] = useState<string[]>([])
  const [selectedCostCategories, setSelectedCostCategories] = useState<string[]>([])

  // Checkbox filters
  const [categories, setCategories] = useState<Record<string, boolean>>({
    'Capex': true,
    'Opex': true
  })

  // Preview Grid pagination
  const [previewPage, setPreviewPage] = useState<number>(0)
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState<number>(5)

  // Reset page when template or filters change
  useEffect(() => {
    setPreviewPage(0)
  }, [groupby, selectedProjectIds, selectedFundingSourceIds, selectedPeriodNames, selectedCostCategories])
  const [columns, setColumns] = useState<Record<string, boolean>>({
    'budget': true,
    'actual': true,
    'forecast': true,
    'variance': true
  })
  const [isPublic, setIsPublic] = useState<boolean>(false)

  const handleReportTypeChange = (type: 'financial' | 'schedule' | 'risk_issue') => {
    setReportType(type)
    if (type === 'financial') {
      setGroupby(3) // default to FiscalPeriod (3)
      setColumns({ budget: true, actual: true, forecast: true, variance: true })
      setCategories({ Capex: true, Opex: true })
    } else if (type === 'schedule') {
      setGroupby(1) // default to Project (1)
      setColumns({ duration: true, complete: true, overdue: true, milestones: true, totalTasks: true })
      setCategories({ 'Active Tasks': true, 'Completed Tasks': true, 'Milestones Only': false })
    } else {
      setGroupby(1) // default to Project (1)
      setColumns({ impact: true, probability: true, open: true, mitigated: true })
      setCategories({ 'Risks': true, 'Issues': true, 'High Severity Only': false })
    }
  }

  const getCategoryTitle = () => {
    if (reportType === 'financial') return 'Cost Categories'
    if (reportType === 'schedule') return 'Schedule Filters'
    return 'Risk/Issue Filters'
  }

  const getColumnLabel = (col: string) => {
    if (reportType === 'financial') {
      if (col === 'budget') return 'Approved Budget'
      if (col === 'actual') return 'Actual Cost'
      if (col === 'forecast') return 'Forecast'
      if (col === 'variance') return 'Variance'
    } else if (reportType === 'schedule') {
      if (col === 'duration') return 'Duration (Days)'
      if (col === 'complete') return '% Complete'
      if (col === 'overdue') return 'Overdue Tasks'
      if (col === 'milestones') return 'Milestone Count'
      if (col === 'totalTasks') return 'Total Tasks'
    } else if (reportType === 'risk_issue') {
      if (col === 'impact') return 'Impact Score'
      if (col === 'probability') return 'Probability Score'
      if (col === 'open') return 'Open Issues'
      if (col === 'mitigated') return 'Mitigated Risks'
    }
    return col.charAt(0).toUpperCase() + col.slice(1)
  }

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
    return seriesConfig.filter(s => columns[s.key])
  }, [seriesConfig, columns])

  const yAxisTickFormatter = (val: any) => {
    if (reportType === 'financial') return `€${val / 1000}k`
    return val
  }

  const tooltipFormatter = (val: any) => {
    if (reportType === 'financial') return `€${Number(val).toLocaleString()}`
    return Number(val).toLocaleString()
  }

  // Fetch initial configs & target entities
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [configsList, portfoliosList, programmesList, fundingList, periodsList] = await Promise.all([
          fetchReportConfigs(),
          fetchPortfolios(),
          fetchProgrammes(),
          fetchFundingSources(),
          fetchFinancialPeriods()
        ])
        setConfigs(configsList)
        setPortfolios(portfoliosList)
        setProgrammes(programmesList)
        setProjects(dataverseProjects)
        setFundingSources(fundingList || [])
        setPeriods(periodsList || [])
      } catch (err) {
        setError('Failed to load report configurations and lookups.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Sync editor fields when selection changes
  useEffect(() => {
    setError(null)
    setSuccessMsg(null)
    if (selectedConfigId === 'new') {
      setName('New Report Template')
      setDescription('Custom report configuration.')
      setReportType('financial')
      setGroupby(3) // default to FiscalPeriod (3: FiscalPeriod)
      setCharttype(1) // 1: BarChart
      setHierarchylevel(1) // 1: Global
      setSelectedLevelRecordIds([])
      setSelectedProjectIds([])
      setSelectedFundingSourceIds([])
      setSelectedPeriodNames([])
      setSelectedCostCategories([])
      setCategories({ 'Capex': true, 'Opex': true })
      setColumns({ 'budget': true, 'actual': true, 'forecast': true, 'variance': true })
      setIsPublic(false)
    } else {
      const selected = configs.find(c => c.pm_financialreportconfigid === selectedConfigId)
      if (selected) {
        setName(selected.pm_name)
        setDescription(selected.pm_description || '')
        setGroupby(selected.pm_groupby || 3)
        setCharttype(selected.pm_charttype || 1)
        setHierarchylevel(selected.pm_hierarchylevel || 1)
        setIsPublic(!!selected.pm_ispublic)

        // Parse filters JSON
        let activeType: 'financial' | 'schedule' | 'risk_issue' = 'financial'
        try {
          const parsedFilters = selected.pm_selectedfilters ? JSON.parse(selected.pm_selectedfilters) : {}
          activeType = parsedFilters.reportType || 'financial'
          setReportType(activeType)
          setSelectedLevelRecordIds(parsedFilters.selectedLevelRecordIds || (parsedFilters.targetRecordId ? [parsedFilters.targetRecordId] : []))
          setSelectedProjectIds(parsedFilters.selectedProjectIds || [])
          setSelectedFundingSourceIds(parsedFilters.selectedFundingSourceIds || [])
          setSelectedPeriodNames(parsedFilters.selectedPeriodNames || [])
          setSelectedCostCategories(parsedFilters.selectedCostCategories || [])
        } catch {
          setReportType('financial')
          setSelectedLevelRecordIds([])
          setSelectedProjectIds([])
          setSelectedFundingSourceIds([])
          setSelectedPeriodNames([])
          setSelectedCostCategories([])
        }

        // Parse columns
        try {
          const parsedCols = selected.pm_selectedcolumns ? JSON.parse(selected.pm_selectedcolumns) : []
          const nextCols: Record<string, boolean> = {}
          if (activeType === 'financial') {
            nextCols.budget = false; nextCols.actual = false; nextCols.forecast = false; nextCols.variance = false;
          } else if (activeType === 'schedule') {
            nextCols.duration = false; nextCols.complete = false; nextCols.overdue = false; nextCols.milestones = true; nextCols.totalTasks = true;
          } else {
            nextCols.impact = false; nextCols.probability = false; nextCols.open = false; nextCols.mitigated = false;
          }
          parsedCols.forEach((c: string) => {
            nextCols[c] = true
          })
          setColumns(nextCols)
        } catch {
          setColumns(activeType === 'financial' 
            ? { budget: true, actual: true, forecast: true, variance: true }
            : activeType === 'schedule'
            ? { duration: true, complete: true, overdue: true, milestones: true, totalTasks: true }
            : { impact: true, probability: true, open: true, mitigated: true }
          )
        }

        // Parse categories
        try {
          const catList = selected.pm_categoriesfilter ? selected.pm_categoriesfilter.split(',') : []
          const nextCats: Record<string, boolean> = {}
          if (activeType === 'financial') {
            nextCats.Capex = false; nextCats.Opex = false;
          } else if (activeType === 'schedule') {
            nextCats['Active Tasks'] = false; nextCats['Completed Tasks'] = false; nextCats['Milestones Only'] = false;
          } else {
            nextCats['Risks'] = false; nextCats['Issues'] = false; nextCats['High Severity Only'] = false;
          }
          catList.forEach((c) => {
            const trimmed = c.trim()
            if (trimmed) nextCats[trimmed] = true
          })
          setCategories(nextCats)
        } catch {
          setCategories(activeType === 'financial'
            ? { Capex: true, Opex: true }
            : activeType === 'schedule'
            ? { 'Active Tasks': true, 'Completed Tasks': true, 'Milestones Only': false }
            : { 'Risks': true, 'Issues': true, 'High Severity Only': false }
          )
        }
      }
    }
  }, [selectedConfigId, configs])

  // Get active lookup options for level selection
  const levelLookupOptions = useMemo(() => {
    if (hierarchylevel === 2) return portfolios.map(p => ({ id: p.pm_portfolioid, name: p.pm_portfolioname }))
    if (hierarchylevel === 3) return programmes.map(p => ({ id: p.pm_programmeid, name: p.pm_programmename }))
    if (hierarchylevel === 4) return projects.map(p => ({ id: p.pm_projectid, name: p.pm_projectname }))
    return []
  }, [hierarchylevel, portfolios, programmes, projects])

  // Validation Logic computed on render
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (!name.trim()) {
      errors.push('Report Title is required.')
    }
    if (name.trim().toLowerCase() === 'new financial report' || name.trim().toLowerCase() === 'new report template') {
      errors.push('Please customize the default Report Title.')
    }
    const hasColumns = Object.values(columns).some(v => v)
    if (!hasColumns) {
      errors.push('At least one report column must be selected.')
    }
    const hasCats = Object.values(categories).some(v => v)
    if (!hasCats) {
      errors.push('At least one category checkbox must be selected.')
    }
    return errors
  }, [name, hierarchylevel, selectedLevelRecordIds, columns, categories])

  // Handle Save
  const handleSave = async () => {
    if (validationErrors.length > 0 || !canEditOrDelete) return

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    // Build filters and fields
    const selectedCatsStr = Object.keys(categories).filter(c => categories[c]).join(',')
    const selectedColsArr = Object.keys(columns).filter(c => columns[c])

    const filterObj = {
      reportType,
      targetRecordId: selectedLevelRecordIds[0] || '',
      targetRecordName: levelLookupOptions.find(o => o.id === selectedLevelRecordIds[0])?.name || '',
      selectedLevelRecordIds,
      selectedProjectIds,
      selectedFundingSourceIds,
      selectedPeriodNames,
      selectedCostCategories
    }

    const payload: Partial<FinancialReportConfigModel> & { 'ownerid@odata.bind'?: string } = {
      pm_name: name,
      pm_description: description,
      pm_groupby: groupby,
      pm_charttype: charttype,
      pm_hierarchylevel: hierarchylevel,
      pm_categoriesfilter: selectedCatsStr,
      pm_fiscalyearsfilter: '', // Omit separate Fiscal Year Choices
      pm_selectedcolumns: JSON.stringify(selectedColsArr),
      pm_selectedfilters: JSON.stringify(filterObj),
      pm_ispublic: isPublic
    }

    if (selectedConfigId === 'new' && currentUser?.systemuserid) {
      payload['ownerid@odata.bind'] = `/systemusers(${currentUser.systemuserid})`
    }

    try {
      if (selectedConfigId === 'new') {
        const newRecord = await createReportConfig(payload)
        if (newRecord) {
          setSuccessMsg('Report configuration created successfully.')
          setConfigs(prev => [...prev, newRecord])
          setSelectedConfigId(newRecord.pm_financialreportconfigid)
        } else {
          setError('Failed to create configuration in Dataverse.')
        }
      } else {
        const updatedRecord = await updateReportConfig(selectedConfigId, payload)
        if (updatedRecord) {
          setSuccessMsg('Report configuration updated successfully.')
          setConfigs(prev => prev.map(c => c.pm_financialreportconfigid === selectedConfigId ? updatedRecord : c))
        } else {
          setError('Failed to update configuration.')
        }
      }
    } catch (err) {
      setError('An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async () => {
    if (selectedConfigId === 'new' || !canEditOrDelete) return
    if (!window.confirm('Are you sure you want to delete this report configuration?')) return

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const success = await deleteReportConfig(selectedConfigId)
      if (success) {
        setSuccessMsg('Report configuration deleted.')
        setConfigs(prev => prev.filter(c => c.pm_financialreportconfigid !== selectedConfigId))
        setSelectedConfigId('new')
      } else {
        setError('Failed to delete configuration.')
      }
    } catch (err) {
      setError('An error occurred during deletion.')
    } finally {
      setSaving(false)
    }
  }

  // Live Data Processor for Preview
  const mockActiveConfig = useMemo(() => {
    const selectedCatsStr = Object.keys(categories).filter(c => categories[c]).join(',')
    const selectedColsArr = Object.keys(columns).filter(c => columns[c])

    const filterObj = {
      reportType,
      targetRecordId: selectedLevelRecordIds[0] || '',
      selectedLevelRecordIds,
      selectedProjectIds,
      selectedFundingSourceIds,
      selectedPeriodNames,
      selectedCostCategories
    }

    return {
      pm_name: name,
      pm_description: description,
      pm_groupby: groupby,
      pm_charttype: charttype,
      pm_hierarchylevel: hierarchylevel,
      pm_categoriesfilter: selectedCatsStr,
      pm_selectedcolumns: JSON.stringify(selectedColsArr),
      pm_selectedfilters: JSON.stringify(filterObj),
      pm_ispublic: isPublic
    }
  }, [name, description, groupby, charttype, hierarchylevel, categories, columns, isPublic, reportType, selectedLevelRecordIds, selectedProjectIds, selectedFundingSourceIds, selectedPeriodNames, selectedCostCategories])

  const processedPreviewData = useReportDataProcessor(
    mockActiveConfig,
    budgetLines,
    tasks,
    milestones,
    risks,
    issues,
    dataverseProjects
  )

  const previewData = processedPreviewData.list

  if (loading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 6 }}>
      <PageHeader
        title="Report Configurations"
        subtitle="Design and save report templates with visual parameters and live previews."
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Editor controls: Left Panel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Report Parameters
              </Typography>

              {/* Config Selector */}
              <FormControl fullWidth size="small">
                <InputLabel>Selected Report Template</InputLabel>
                <Select
                  value={selectedConfigId}
                  label="Selected Report Template"
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                >
                  <MenuItem value="new">* Create New Report Template *</MenuItem>
                  {visibleConfigs.map(c => {
                    const isPrivate = !c.pm_ispublic
                    const ownerUser = users.find(u => u.systemuserid.toLowerCase() === c.ownerid?.toLowerCase())
                    const ownerName = ownerUser ? ownerUser.fullname : (c.owneridname || 'System')
                    const ownerLabel = isPrivate ? ` (Private - Owner: ${ownerName})` : ' (Public)'
                    return (
                      <MenuItem key={c.pm_financialreportconfigid} value={c.pm_financialreportconfigid}>
                        {c.pm_name}{ownerLabel}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              {/* Ownership and permission warning banner */}
              {selectedConfigId !== 'new' && (
                <Box sx={{ mt: -1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                    <strong>Template Owner:</strong> {selectedConfigOwnerName}
                  </Typography>
                  {!canEditOrDelete && (
                    <Alert severity="info" sx={{ mt: 1, py: 0.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                      Only the owner or an administrator can modify or delete this report template.
                    </Alert>
                  )}
                </Box>
              )}

              {/* Report Type Selector */}
              <FormControl fullWidth size="small">
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => handleReportTypeChange(e.target.value as any)}
                >
                  <MenuItem value="financial">Financial (Approved Budget, Actuals, Forecasts)</MenuItem>
                  <MenuItem value="schedule">Schedule (Milestones & Tasks)</MenuItem>
                  <MenuItem value="risk_issue">Risks & Issues</MenuItem>
                </Select>
              </FormControl>

              <Divider />

              {/* Title & Description */}
              <TextField
                label="Report Title"
                placeholder="e.g. Q3 Capex vs Opex Overview"
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="small"
                fullWidth
                error={!name.trim()}
                helperText={!name.trim() ? "Title is required" : ""}
              />

              <TextField
                label="Description"
                placeholder="e.g. Detailed breakdown of Capex and Opex."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                size="small"
                multiline
                rows={2}
                fullWidth
              />

              {/* Layout options */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Group Data By</InputLabel>
                    <Select
                      value={groupby}
                      label="Group Data By"
                      onChange={(e) => {
                        setGroupby(Number(e.target.value))
                        // Reset list specific filters when groupby switches
                        setSelectedProjectIds([])
                        setSelectedFundingSourceIds([])
                        setSelectedPeriodNames([])
                      }}
                    >
                      {reportType === 'financial' ? [
                        <MenuItem key={3} value={3}>Fiscal Period</MenuItem>,
                        <MenuItem key={1} value={1}>Project</MenuItem>,
                        <MenuItem key={2} value={2}>Cost Category</MenuItem>,
                        <MenuItem key={4} value={4}>Funding Source</MenuItem>
                      ] : reportType === 'schedule' ? [
                        <MenuItem key={1} value={1}>Project</MenuItem>,
                        <MenuItem key={2} value={2}>Task Status</MenuItem>,
                        <MenuItem key={3} value={3}>Task Phase</MenuItem>,
                        <MenuItem key={4} value={4}>Milestone RAG</MenuItem>
                      ] : [
                        <MenuItem key={1} value={1}>Project</MenuItem>,
                        <MenuItem key={2} value={2}>Severity</MenuItem>,
                        <MenuItem key={3} value={3}>RAG Status</MenuItem>,
                        <MenuItem key={4} value={4}>Category</MenuItem>
                      ]}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Chart Style</InputLabel>
                    <Select
                      value={charttype}
                      label="Chart Style"
                      onChange={(e) => setCharttype(Number(e.target.value))}
                    >
                      <MenuItem value={1}>Bar Chart</MenuItem>
                      <MenuItem value={2}>Line Chart</MenuItem>
                      <MenuItem value={3}>Area Chart</MenuItem>
                      <MenuItem value={4}>Stacked Bar</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Scope & Hierarchy Level */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Reporting Level</InputLabel>
                    <Select
                      value={hierarchylevel}
                      label="Reporting Level"
                      onChange={(e) => {
                        setHierarchylevel(Number(e.target.value))
                        setSelectedLevelRecordIds([])
                      }}
                    >
                      <MenuItem value={1}>Global / All</MenuItem>
                      <MenuItem value={2}>Portfolio</MenuItem>
                      <MenuItem value={3}>Programme</MenuItem>
                      <MenuItem value={4}>Project</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  {hierarchylevel > 1 && (
                    <Autocomplete
                      multiple
                      size="small"
                      options={levelLookupOptions}
                      getOptionLabel={(option) => option.name || ''}
                      value={levelLookupOptions.filter(o => selectedLevelRecordIds.includes(o.id))}
                      onChange={(_, newValue) => {
                        setSelectedLevelRecordIds(newValue.map(o => o.id))
                      }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label={`Limit to ${hierarchylevel === 2 ? 'Portfolios' : hierarchylevel === 3 ? 'Programmes' : 'Projects'}`} 
                          placeholder="Choose targets..."
                          helperText="Leave empty to include all"
                        />
                      )}
                    />
                  )}
                </Grid>
              </Grid>

              {/* Comprehensive Dynamic Multi-Select lists based on grouping selection */}
              {groupby === 1 && (
                <Autocomplete
                  multiple
                  size="small"
                  options={projects}
                  getOptionLabel={(option) => option.pm_projectname || ''}
                  value={projects.filter(p => selectedProjectIds.includes(p.pm_projectid))}
                  onChange={(_, newValue) => {
                    setSelectedProjectIds(newValue.map(p => p.pm_projectid))
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Limit to Selected Projects" 
                      placeholder="Choose projects..." 
                      helperText="Leave empty to include all projects"
                    />
                  )}
                />
              )}

              {groupby === 4 && (
                <Autocomplete
                  multiple
                  size="small"
                  options={fundingSources}
                  getOptionLabel={(option) => option.pm_fundingsourcename || ''}
                  value={fundingSources.filter(s => selectedFundingSourceIds.includes(s.pm_fundingsourceid))}
                  onChange={(_, newValue) => {
                    setSelectedFundingSourceIds(newValue.map(s => s.pm_fundingsourceid))
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Limit to Funding Sources" 
                      placeholder="Choose funding..." 
                      helperText="Leave empty to include all funding sources"
                    />
                  )}
                />
              )}

              {groupby === 3 && (
                <Autocomplete
                  multiple
                  size="small"
                  options={['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027']}
                  value={selectedPeriodNames}
                  onChange={(_, newValue) => {
                    setSelectedPeriodNames(newValue)
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Limit to Fiscal Periods" 
                      placeholder="Choose periods..." 
                      helperText="Leave empty to include all periods"
                    />
                  )}
                />
              )}

              {groupby === 2 && (
                <Autocomplete
                  multiple
                  size="small"
                  options={['Capex', 'Opex']}
                  value={selectedCostCategories}
                  onChange={(_, newValue) => {
                    setSelectedCostCategories(newValue)
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Limit to Cost Categories" 
                      placeholder="Choose categories..." 
                      helperText="Leave empty to include all categories"
                    />
                  )}
                />
              )}



              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }} color="text.secondary">
                    {getCategoryTitle()}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {Object.keys(categories).map(cat => (
                      <FormControlLabel
                        key={cat}
                        control={
                          <Checkbox
                            checked={categories[cat]}
                            onChange={(e) => setCategories(prev => ({ ...prev, [cat]: e.target.checked }))}
                            size="small"
                          />
                        }
                        label={cat}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }} color="text.secondary">
                    Report Columns
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {Object.keys(columns).map(col => (
                      <FormControlLabel
                        key={col}
                        control={
                          <Checkbox
                            checked={columns[col]}
                            onChange={(e) => setColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                            size="small"
                          />
                        }
                        label={getColumnLabel(col)}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Public sharing switch */}
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    color="primary"
                  />
                }
                label="Share Report Template publicly with other team members"
              />

              {/* Real-time Validation Errors Notification Banner */}
              {validationErrors.length > 0 && (
                <Alert 
                  severity="warning" 
                  icon={<WarningAmberIcon />}
                  sx={{ mt: 1, '& .MuiAlert-message': { display: 'flex', flexDirection: 'column', gap: 0.5 } }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Please fix the following validation warnings:
                  </Typography>
                  {validationErrors.map((err, idx) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                      • {err}
                    </Typography>
                  ))}
                </Alert>
              )}

              {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
              {successMsg && <Alert severity="success" sx={{ mt: 1 }}>{successMsg}</Alert>}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                {selectedConfigId !== 'new' && (
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={saving || !canEditOrDelete}
                    onClick={handleDelete}
                  >
                    Delete Template
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || validationErrors.length > 0 || !canEditOrDelete}
                >
                  Save Configuration
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Preview Pane: Right Panel */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="action" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Interactive Live Preview
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  Simulated preview based on selections
                </Typography>
              </Box>

              <Divider />

              {/* Simulated KPI metrics */}
              <Grid container spacing={2}>
                {reportType === 'financial' ? (
                  <>
                    {columns.budget && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Total Budget</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>€{processedPreviewData.totals.budget.toLocaleString()}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.actual && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>€{processedPreviewData.totals.actual.toLocaleString()}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.forecast && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Forecasted Spend</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>€{processedPreviewData.totals.forecast.toLocaleString()}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.variance && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Variance Remaining</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: processedPreviewData.totals.variance < 0 ? 'error.main' : 'warning.main' }}>€{processedPreviewData.totals.variance.toLocaleString()}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </>
                ) : reportType === 'schedule' ? (
                  <>
                    {columns.duration && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Avg Duration</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>{processedPreviewData.totals.duration} Days</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.complete && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Avg Completion %</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>{processedPreviewData.totals.complete}%</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.overdue && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Overdue Tasks</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>{processedPreviewData.totals.overdue}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.milestones && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Milestone Count</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'warning.main' }}>{processedPreviewData.totals.milestones}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.totalTasks && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Total Tasks</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'secondary.main' }}>{processedPreviewData.totals.totalTasks}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </>
                ) : (
                  <>
                    {columns.impact && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Avg Impact Score</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>{processedPreviewData.totals.impact} / 5</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.probability && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Avg Probability Score</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>{processedPreviewData.totals.probability} / 5</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.open && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Open Issues</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>{processedPreviewData.totals.open}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {columns.mitigated && (
                      <Grid size={{ xs: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                          <Typography variant="caption" color="text.secondary">Mitigated Risks</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>{processedPreviewData.totals.mitigated}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>

              {/* Live Chart Preview */}
              <Box sx={{ height: 260, width: '100%', mt: 2 }}>
                {previewData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', border: `1px dashed ${theme.palette.divider}`, borderRadius: 1.5 }}>
                    <Typography variant="body2" color="text.disabled">
                      No data to preview. Check your parameters.
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    {charttype === 2 ? (
                      <LineChart data={previewData as any}>
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
                    ) : charttype === 3 ? (
                      <AreaChart data={previewData as any}>
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
                            fill={`${s.color}33`}
                            stroke={s.color}
                            strokeWidth={2}
                          />
                        ))}
                      </AreaChart>
                    ) : charttype === 4 ? (
                      <BarChart data={previewData as any}>
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
                      <BarChart data={previewData as any}>
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
                )}
              </Box>

              {/* Live Data Grid Preview */}
              {previewData.length > 0 && (
                <Box sx={{ mt: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>
                          Grouped By (
                          {reportType === 'financial'
                            ? groupby === 3 ? 'Period' : groupby === 1 ? 'Project' : groupby === 2 ? 'Category' : 'Source'
                            : reportType === 'schedule'
                            ? groupby === 1 ? 'Project' : groupby === 2 ? 'Status' : groupby === 3 ? 'Phase' : 'Milestone RAG'
                            : groupby === 1 ? 'Project' : groupby === 2 ? 'Severity' : groupby === 3 ? 'RAG Status' : 'Category'
                          }
                          )
                        </th>
                        {activeSeries.map(s => (
                          <th key={s.key} style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData
                        .slice(previewPage * previewRowsPerPage, previewPage * previewRowsPerPage + previewRowsPerPage)
                        .map((row: any, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.name}</td>
                            {activeSeries.map(s => {
                              const val = row[s.key]
                              const displayVal = reportType === 'financial' ? `€${val.toLocaleString()}` : val.toLocaleString()
                              return (
                                <td key={s.key} style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  {displayVal}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <TablePagination
                    component="div"
                    count={previewData.length}
                    page={previewPage}
                    onPageChange={(_, newPage) => setPreviewPage(newPage)}
                    rowsPerPage={previewRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setPreviewRowsPerPage(parseInt(e.target.value, 10))
                      setPreviewPage(0)
                    }}
                    rowsPerPageOptions={[5, 10, 20]}
                    size="small"
                    sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
