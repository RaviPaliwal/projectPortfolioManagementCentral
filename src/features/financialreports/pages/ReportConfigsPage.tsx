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

  // Lookup data for filters
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [programmes, setProgrammes] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [fundingSources, setFundingSources] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])

  // Editor states
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
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

  // Fetch initial configs & target entities
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [configsList, portfoliosList, programmesList, projectsList, fundingList, periodsList] = await Promise.all([
          fetchReportConfigs(),
          fetchPortfolios(),
          fetchProgrammes(),
          fetchProjects(),
          fetchFundingSources(),
          fetchFinancialPeriods()
        ])
        setConfigs(configsList)
        setPortfolios(portfoliosList)
        setProgrammes(programmesList)
        setProjects(projectsList)
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
      setName('New Financial Report')
      setDescription('Financial overview report config.')
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
        try {
          const parsedFilters = selected.pm_selectedfilters ? JSON.parse(selected.pm_selectedfilters) : {}
          // Backward compatibility for single targetRecordId
          if (parsedFilters.targetRecordId && (!parsedFilters.selectedLevelRecordIds || parsedFilters.selectedLevelRecordIds.length === 0)) {
            setSelectedLevelRecordIds([parsedFilters.targetRecordId])
          } else {
            setSelectedLevelRecordIds(parsedFilters.selectedLevelRecordIds || [])
          }
          setSelectedProjectIds(parsedFilters.selectedProjectIds || [])
          setSelectedFundingSourceIds(parsedFilters.selectedFundingSourceIds || [])
          setSelectedPeriodNames(parsedFilters.selectedPeriodNames || [])
          setSelectedCostCategories(parsedFilters.selectedCostCategories || [])
        } catch {
          setSelectedLevelRecordIds([])
          setSelectedProjectIds([])
          setSelectedFundingSourceIds([])
          setSelectedPeriodNames([])
          setSelectedCostCategories([])
        }

        // Parse columns
        try {
          const parsedCols = selected.pm_selectedcolumns ? JSON.parse(selected.pm_selectedcolumns) : []
          const nextCols = { budget: false, actual: false, forecast: false, variance: false }
          parsedCols.forEach((c: string) => {
            if (c in nextCols) nextCols[c as keyof typeof nextCols] = true
          })
          setColumns(nextCols)
        } catch {
          setColumns({ budget: true, actual: true, forecast: true, variance: true })
        }

        // Parse categories
        const catList = selected.pm_categoriesfilter ? selected.pm_categoriesfilter.split(',') : []
        const nextCats = { Capex: false, Opex: false }
        catList.forEach((c) => {
          if (c.trim() in nextCats) nextCats[c.trim() as keyof typeof nextCats] = true
        })
        setCategories(nextCats)
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
    if (name.trim().toLowerCase() === 'new financial report') {
      errors.push('Please customize the default Report Title.')
    }
    const hasColumns = Object.values(columns).some(v => v)
    if (!hasColumns) {
      errors.push('At least one report column must be selected.')
    }
    const hasCats = Object.values(categories).some(v => v)
    if (!hasCats) {
      errors.push('At least one cost category checkbox must be selected.')
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

  // Visual Mock Data Generator for Live Preview reflecting selected multi-select filters
  const previewData = useMemo(() => {
    const activeCats = Object.keys(categories).filter(c => categories[c])

    if (activeCats.length === 0) {
      return []
    }

    // A. Compute Reporting Level scale factor to simulate filtering of project scopes
    let levelScaleFactor = 1.0;
    if (hierarchylevel > 1 && selectedLevelRecordIds.length > 0) {
      let matchingProjectsCount = projects.length;
      const normalizedLevelIds = selectedLevelRecordIds.map(id => id.replace(/[{}]/g, '').trim().toLowerCase());
      if (hierarchylevel === 2) {
        matchingProjectsCount = projects.filter(p => {
          const val = (p._pm_portfolio_value || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedLevelIds.includes(val);
        }).length;
      } else if (hierarchylevel === 3) {
        matchingProjectsCount = projects.filter(p => {
          const val = (p._pm_programme_value || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedLevelIds.includes(val);
        }).length;
      } else if (hierarchylevel === 4) {
        matchingProjectsCount = projects.filter(p => {
          const val = (p.pm_projectid || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedLevelIds.includes(val);
        }).length;
      }
      if (projects.length > 0) {
        levelScaleFactor = Math.max(0.05, Math.min(1.0, matchingProjectsCount / projects.length));
      } else {
        levelScaleFactor = 0.2;
      }
    }

    // Group by Fiscal Period
    if (groupby === 3) {
      const allPeriods = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027']
      const filteredPeriods = selectedPeriodNames.length > 0 
        ? allPeriods.filter(p => selectedPeriodNames.includes(p))
        : allPeriods

      return filteredPeriods.map((p, index) => {
        const factor = (index + 1) * 1.5 * levelScaleFactor
        return {
          name: p,
          budget: columns.budget ? Math.round(75000 * factor) : 0,
          actual: columns.actual ? Math.round(62000 * factor) : 0,
          forecast: columns.forecast ? Math.round(70000 * factor) : 0,
          variance: columns.variance ? Math.round(13000 * factor) : 0
        }
      })
    } 
    // Group by Project
    else if (groupby === 1) {
      // First filter projects by the selected Reporting Level (Portfolio, Programme, Project)
      let filteredProjects = [...projects];

      const normalizedLevelIds = selectedLevelRecordIds.map(id => id.replace(/[{}]/g, '').trim().toLowerCase());
      if (hierarchylevel === 2 && normalizedLevelIds.length > 0) {
        filteredProjects = filteredProjects.filter(p => {
          const val = (p._pm_portfolio_value || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedLevelIds.includes(val);
        });
      } else if (hierarchylevel === 3 && normalizedLevelIds.length > 0) {
        filteredProjects = filteredProjects.filter(p => {
          const val = (p._pm_programme_value || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedLevelIds.includes(val);
        });
      } else if (hierarchylevel === 4 && normalizedLevelIds.length > 0) {
        filteredProjects = filteredProjects.filter(p => {
          const val = (p.pm_projectid || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedLevelIds.includes(val);
        });
      }

      // Then filter by the specific selectedProjectIds if provided
      const normalizedProjectIds = selectedProjectIds.map(id => id.replace(/[{}]/g, '').trim().toLowerCase());
      if (normalizedProjectIds.length > 0) {
        filteredProjects = filteredProjects.filter(p => {
          const val = (p.pm_projectid || '').replace(/[{}]/g, '').trim().toLowerCase();
          return normalizedProjectIds.includes(val);
        });
      }

      const allProjectsList = filteredProjects.map(p => ({ id: p.pm_projectid, name: p.pm_projectname }));
      
      const hasFilterApplied = (hierarchylevel > 1 && selectedLevelRecordIds.length > 0) || selectedProjectIds.length > 0;
      const targetProjects = hasFilterApplied
        ? allProjectsList
        : allProjectsList.slice(0, 4);

      return targetProjects.map((p, index) => {
        const factor = (index + 1) * 2.8;
        return {
          name: p.name || 'Project Name',
          budget: columns.budget ? Math.round(110000 * factor) : 0,
          actual: columns.actual ? Math.round(98000 * factor) : 0,
          forecast: columns.forecast ? Math.round(105000 * factor) : 0,
          variance: columns.variance ? Math.round(12000 * factor) : 0
        };
      });
    }
    // Group by Cost Category
    else if (groupby === 2) {
      const targetCats = selectedCostCategories.length > 0
        ? activeCats.filter(c => selectedCostCategories.includes(c))
        : activeCats

      return targetCats.map((cat, index) => {
        const factor = (index + 1) * 4.2 * levelScaleFactor
        return {
          name: cat,
          budget: columns.budget ? Math.round(280000 * factor) : 0,
          actual: columns.actual ? Math.round(245000 * factor) : 0,
          forecast: columns.forecast ? Math.round(260000 * factor) : 0,
          variance: columns.variance ? Math.round(35000 * factor) : 0
        }
      })
    } 
    // Group by Funding Source
    else {
      const allSourcesList = fundingSources.map(s => ({ id: s.pm_fundingsourceid, name: s.pm_fundingsourcename }))
      const targetSources = selectedFundingSourceIds.length > 0
        ? allSourcesList.filter(s => selectedFundingSourceIds.includes(s.id))
        : allSourcesList.slice(0, 3)

      return targetSources.map((s, index) => {
        const factor = (index + 1) * 3.4 * levelScaleFactor
        return {
          name: s.name || 'Funding Source',
          budget: columns.budget ? Math.round(190000 * factor) : 0,
          actual: columns.actual ? Math.round(170000 * factor) : 0,
          forecast: columns.forecast ? Math.round(185000 * factor) : 0,
          variance: columns.variance ? Math.round(20000 * factor) : 0
        }
      })
    }
  }, [groupby, categories, columns, selectedProjectIds, selectedFundingSourceIds, selectedPeriodNames, selectedCostCategories, projects, fundingSources, hierarchylevel, selectedLevelRecordIds])

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
                      <MenuItem value={3}>Fiscal Period</MenuItem>
                      <MenuItem value={1}>Project</MenuItem>
                      <MenuItem value={2}>Cost Category</MenuItem>
                      <MenuItem value={4}>Funding Source</MenuItem>
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
                    Cost Categories
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
                        label={col.charAt(0).toUpperCase() + col.slice(1)}
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
                {columns.budget && (
                  <Grid size={{ xs: 3 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">Total Budget</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>€1,240,000</Typography>
                    </Paper>
                  </Grid>
                )}
                {columns.actual && (
                  <Grid size={{ xs: 3 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>€982,000</Typography>
                    </Paper>
                  </Grid>
                )}
                {columns.forecast && (
                  <Grid size={{ xs: 3 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">Forecasted Spend</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>€1,180,000</Typography>
                    </Paper>
                  </Grid>
                )}
                {columns.variance && (
                  <Grid size={{ xs: 3 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">Variance Remaining</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5, color: 'warning.main' }}>€258,000</Typography>
                    </Paper>
                  </Grid>
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
                      <LineChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip formatter={(val) => `€${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {columns.budget && <Line type="monotone" dataKey="budget" name="Approved Budget" stroke={theme.palette.primary.main} strokeWidth={2} activeDot={{ r: 6 }} />}
                        {columns.actual && <Line type="monotone" dataKey="actual" name="Actual Cost" stroke={theme.palette.success.main} strokeWidth={2} />}
                        {columns.forecast && <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#8a2be2" strokeWidth={2} />}
                      </LineChart>
                    ) : charttype === 3 ? (
                      <AreaChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip formatter={(val) => `€${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {columns.budget && <Area type="monotone" dataKey="budget" name="Approved Budget" fill={`${theme.palette.primary.main}33`} stroke={theme.palette.primary.main} strokeWidth={2} />}
                        {columns.actual && <Area type="monotone" dataKey="actual" name="Actual Cost" fill={`${theme.palette.success.main}33`} stroke={theme.palette.success.main} strokeWidth={2} />}
                        {columns.forecast && <Area type="monotone" dataKey="forecast" name="Forecast" fill="#8a2be233" stroke="#8a2be2" strokeWidth={2} />}
                      </AreaChart>
                    ) : charttype === 4 ? (
                      <BarChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip formatter={(val) => `€${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {columns.budget && <Bar dataKey="budget" name="Approved Budget" stackId="a" fill={theme.palette.primary.main} />}
                        {columns.actual && <Bar dataKey="actual" name="Actual Cost" stackId="a" fill={theme.palette.success.main} />}
                        {columns.forecast && <Bar dataKey="forecast" name="Forecast" stackId="a" fill="#8a2be2" />}
                      </BarChart>
                    ) : (
                      <BarChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip formatter={(val) => `€${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {columns.budget && <Bar dataKey="budget" name="Approved Budget" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />}
                        {columns.actual && <Bar dataKey="actual" name="Actual Cost" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />}
                        {columns.forecast && <Bar dataKey="forecast" name="Forecast" fill="#8a2be2" radius={[4, 4, 0, 0]} />}
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
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Grouped By ({groupby === 3 ? 'Period' : groupby === 1 ? 'Project' : groupby === 2 ? 'Category' : 'Source'})</th>
                        {columns.budget && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Budget</th>}
                        {columns.actual && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Actual</th>}
                        {columns.forecast && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Forecast</th>}
                        {columns.variance && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Variance</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData
                        .slice(previewPage * previewRowsPerPage, previewPage * previewRowsPerPage + previewRowsPerPage)
                        .map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.name}</td>
                            {columns.budget && <td style={{ padding: '8px 12px', textAlign: 'right' }}>€{row.budget.toLocaleString()}</td>}
                            {columns.actual && <td style={{ padding: '8px 12px', textAlign: 'right', color: theme.palette.success.main }}>€{row.actual.toLocaleString()}</td>}
                            {columns.forecast && <td style={{ padding: '8px 12px', textAlign: 'right', color: theme.palette.info.main }}>€{row.forecast.toLocaleString()}</td>}
                            {columns.variance && <td style={{ padding: '8px 12px', textAlign: 'right', color: row.variance < 0 ? theme.palette.error.main : theme.palette.warning.main }}>€{row.variance.toLocaleString()}</td>}
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
