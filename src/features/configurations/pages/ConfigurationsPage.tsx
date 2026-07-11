import { useState, useMemo } from 'react'
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  CardActionArea, 
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  TextField,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  InputAdornment,
  Paper
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PeopleIcon from '@mui/icons-material/People'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import BarChartIcon from '@mui/icons-material/BarChart'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import ErrorIcon from '@mui/icons-material/Error'
import LoopIcon from '@mui/icons-material/Loop'
import CloseIcon from '@mui/icons-material/Close'

import { PageHeader } from '@/components/common'
import type { TabKey } from '@/components/layout/PrimaryShell'

// Import Dataverse Services
import { 
  Pm_changelogentriesService,
  Pm_changerequestimpactsService,
  Pm_changerequestsService,
  Pm_riskmitigationactionsService,
  Pm_risksService,
  Pm_issuesService,
  Pm_cashflowentriesService,
  Pm_budgetlinesService,
  Pm_fundingsourcesService,
  Pm_benefitsService,
  Pm_performancemeasuresService,
  Pm_timesheetentriesService,
  Pm_timesheetsService,
  Pm_resourceallocationsService,
  Pm_resourceskillsService,
  Pm_resourcesService,
  Pm_checklistresponsesService,
  Pm_workflowapprovalstepsService,
  Pm_workflowinstancesService,
  Pm_taskdependenciesService,
  Pm_projecttasksService,
  Pm_projectmilestonesService,
  Pm_projectgatereviewsService,
  Pm_projectstatussnapshotsService,
  Pm_projectsService,
  Pm_programmesService,
  Pm_portfoliosService,
  Pm_holidaiesService,
  Pm_skillsService,
  Pm_initiativesService
} from '@/generated'

interface ConfigTileProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
}

const ConfigTile = ({ title, description, icon, onClick, color }: ConfigTileProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isDark 
            ? '0 12px 20px -10px rgba(0,0,0,0.5)' 
            : '0 12px 20px -10px rgba(0,0,0,0.1)',
          borderColor: color || theme.palette.primary.main,
          '& .icon-wrapper': {
            bgcolor: color || theme.palette.primary.main,
            color: '#fff',
          }
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box 
            className="icon-wrapper"
            sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: 1.5, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              color: color || theme.palette.primary.main,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

interface ConfigurationsPageProps {
  onNavigate: (tab: TabKey) => void
}

interface PurgeTableConfig {
  id: string
  displayName: string
  category: string
  service: any
  idField: string
  deleteOrder: number
}

const PURGEABLE_TABLES: PurgeTableConfig[] = [
  { id: 'pm_changelogentries', displayName: 'Audit Logs (Change Logs)', category: 'System & Logs', service: Pm_changelogentriesService, idField: 'pm_changelogentryid', deleteOrder: 1 },
  { id: 'pm_changerequestimpacts', displayName: 'Change Request Impacts', category: 'Change Requests', service: Pm_changerequestimpactsService, idField: 'pm_changerequestimpactid', deleteOrder: 1 },
  { id: 'pm_changerequests', displayName: 'Change Requests', category: 'Change Requests', service: Pm_changerequestsService, idField: 'pm_changerequestid', deleteOrder: 3 },
  { id: 'pm_riskmitigationactions', displayName: 'Risk Mitigation Actions', category: 'Risks & Issues', service: Pm_riskmitigationactionsService, idField: 'pm_riskmitigationactionid', deleteOrder: 1 },
  { id: 'pm_risks', displayName: 'Risks', category: 'Risks & Issues', service: Pm_risksService, idField: 'pm_riskid', deleteOrder: 3 },
  { id: 'pm_issues', displayName: 'Issues', category: 'Risks & Issues', service: Pm_issuesService, idField: 'pm_issueid', deleteOrder: 3 },
  { id: 'pm_cashflowentries', displayName: 'Cashflow Entries', category: 'Financials', service: Pm_cashflowentriesService, idField: 'pm_cashflowentryid', deleteOrder: 2 },
  { id: 'pm_budgetlines', displayName: 'Budget Lines', category: 'Financials', service: Pm_budgetlinesService, idField: 'pm_budgetlineid', deleteOrder: 2 },
  { id: 'pm_fundingsources', displayName: 'Funding Sources', category: 'Financials', service: Pm_fundingsourcesService, idField: 'pm_fundingsourceid', deleteOrder: 2 },
  { id: 'pm_benefits', displayName: 'Benefits', category: 'Financials', service: Pm_benefitsService, idField: 'pm_benefitid', deleteOrder: 2 },
  { id: 'pm_performancemeasures', displayName: 'Performance Measures', category: 'Financials', service: Pm_performancemeasuresService, idField: 'pm_performancemeasureid', deleteOrder: 2 },
  { id: 'pm_timesheetentries', displayName: 'Timesheet Entries', category: 'Timesheets & Resources', service: Pm_timesheetentriesService, idField: 'pm_timesheetentryid', deleteOrder: 1 },
  { id: 'pm_timesheets', displayName: 'Timesheets', category: 'Timesheets & Resources', service: Pm_timesheetsService, idField: 'pm_timesheetid', deleteOrder: 3 },
  { id: 'pm_resourceallocations', displayName: 'Resource Allocations', category: 'Timesheets & Resources', service: Pm_resourceallocationsService, idField: 'pm_resourceallocationid', deleteOrder: 2 },
  { id: 'pm_resourceskills', displayName: 'Resource-Skill Mappings', category: 'Timesheets & Resources', service: Pm_resourceskillsService, idField: 'pm_resourceskillid', deleteOrder: 2 },
  { id: 'pm_resources', displayName: 'Resources', category: 'Timesheets & Resources', service: Pm_resourcesService, idField: 'pm_resourceid', deleteOrder: 3 },
  { id: 'pm_checklistresponses', displayName: 'Workflow Checklist Responses', category: 'Workflows', service: Pm_checklistresponsesService, idField: 'pm_checklistresponseid', deleteOrder: 1 },
  { id: 'pm_workflowapprovalsteps', displayName: 'Workflow Approval Steps', category: 'Workflows', service: Pm_workflowapprovalstepsService, idField: 'pm_workflowapprovalstepid', deleteOrder: 2 },
  { id: 'pm_workflowinstances', displayName: 'Workflow Instances', category: 'Workflows', service: Pm_workflowinstancesService, idField: 'pm_workflowinstanceid', deleteOrder: 3 },
  { id: 'pm_taskdependencies', displayName: 'Project Task Dependencies', category: 'Project Management', service: Pm_taskdependenciesService, idField: 'pm_taskdependencyid', deleteOrder: 1 },
  { id: 'pm_projecttasks', displayName: 'Project Tasks', category: 'Project Management', service: Pm_projecttasksService, idField: 'pm_projecttaskid', deleteOrder: 2 },
  { id: 'pm_projectmilestones', displayName: 'Project Milestones', category: 'Project Management', service: Pm_projectmilestonesService, idField: 'pm_projectmilestoneid', deleteOrder: 2 },
  { id: 'pm_projectgatereviews', displayName: 'Project Gate Reviews', category: 'Project Management', service: Pm_projectgatereviewsService, idField: 'pm_projectgatereviewid', deleteOrder: 2 },
  { id: 'pm_projectstatussnapshots', displayName: 'Project Status Snapshots', category: 'Project Management', service: Pm_projectstatussnapshotsService, idField: 'pm_projectstatussnapshotid', deleteOrder: 2 },
  { id: 'pm_initiatives', displayName: 'Pipeline / Initiatives', category: 'Project Management', service: Pm_initiativesService, idField: 'pm_initiativeid', deleteOrder: 3 },
  { id: 'pm_projects', displayName: 'Projects', category: 'Project Management', service: Pm_projectsService, idField: 'pm_projectid', deleteOrder: 4 },
  { id: 'pm_programmes', displayName: 'Programmes', category: 'Project Management', service: Pm_programmesService, idField: 'pm_programmeid', deleteOrder: 5 },
  { id: 'pm_portfolios', displayName: 'Portfolios', category: 'Project Management', service: Pm_portfoliosService, idField: 'pm_portfolioid', deleteOrder: 6 },
  { id: 'pm_holidaies', displayName: 'Holiday Calendars', category: 'System & Logs', service: Pm_holidaiesService, idField: 'pm_holidayid', deleteOrder: 1 },
  { id: 'pm_skills', displayName: 'Skills Catalog', category: 'Timesheets & Resources', service: Pm_skillsService, idField: 'pm_skillid', deleteOrder: 3 }
]

type PurgeStatus = 'pending' | 'loading' | 'success' | 'error'

interface TableProgress {
  status: PurgeStatus
  total?: number
  deleted?: number
  errorMsg?: string
}

export default function ConfigurationsPage({ onNavigate }: ConfigurationsPageProps) {
  const theme = useTheme()
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmText, setConfirmText] = useState('')
  
  // Purging Progress State
  const [purgeStage, setPurgeStage] = useState<'setup' | 'progress'>('setup')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeProgress, setPurgeProgress] = useState<Record<string, TableProgress>>({})

  const configItems = [
    {
      key: 'workflows' as TabKey,
      title: 'Workflows',
      description: 'Design and manage automated approval paths and business processes.',
      icon: <AccountTreeIcon fontSize="large" />,
      color: 'primary.main'
    },
    {
      key: 'teamadmin' as TabKey,
      title: 'Teams & Users',
      description: 'Manage administrative teams, memberships, and security assignments.',
      icon: <PeopleIcon fontSize="large" />,
      color: 'success.main'
    },
    {
      key: 'skills' as TabKey,
      title: 'Skills & Mapping',
      description: 'Define resource skills and manage proficiency levels across the organization.',
      icon: <PsychologyIcon fontSize="large" />,
      color: 'secondary.main'
    },
    {
      key: 'holidays' as TabKey,
      title: 'Holiday Calendar',
      description: 'Configure official public holidays and non-working periods for scheduling.',
      icon: <CalendarMonthIcon fontSize="large" />,
      color: 'warning.main'
    },
    {
      key: 'resources' as TabKey,
      title: 'Resources',
      description: 'Manage resource profiles, capacities, daily rates, and system user mappings.',
      icon: <AssignmentIndIcon fontSize="large" />,
      color: 'secondary.main'
    },
    {
      key: 'reportConfigs' as TabKey,
      title: 'Report Configurations',
      description: 'Design visual and interactive layouts, charts, and groupings for financial reports.',
      icon: <BarChartIcon fontSize="large" />,
      color: 'info.main'
    }
  ]

  // Filter tables by search query
  const filteredTables = useMemo(() => {
    return PURGEABLE_TABLES.filter(t => 
      t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  // Group filtered tables by category
  const groupedTables = useMemo(() => {
    const groups: Record<string, PurgeTableConfig[]> = {}
    filteredTables.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = []
      }
      groups[t.category].push(t)
    })
    return groups
  }, [filteredTables])

  const handleToggleTable = (id: string) => {
    setSelectedTables(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedTables(filteredTables.map(t => t.id))
  }

  const handleClearSelection = () => {
    setSelectedTables([])
  }

  const startPurge = async () => {
    if (confirmText !== 'PURGE') return
    setPurgeStage('progress')
    setIsPurging(true)

    // Sort selected tables by deleteOrder to prevent key constraint violations
    const tablesToPurge = PURGEABLE_TABLES
      .filter(t => selectedTables.includes(t.id))
      .sort((a, b) => a.deleteOrder - b.deleteOrder)

    // Setup initial progress state
    const initialProgress: Record<string, TableProgress> = {}
    tablesToPurge.forEach(t => {
      initialProgress[t.id] = { status: 'pending', total: 0, deleted: 0 }
    })
    setPurgeProgress(initialProgress)

    for (const table of tablesToPurge) {
      setPurgeProgress(prev => ({
        ...prev,
        [table.id]: { status: 'loading', total: 0, deleted: 0 }
      }))

      try {
        const fetchRes = await table.service.getAll({
          select: [table.idField]
        })

        if (fetchRes.success && fetchRes.data) {
          const records = fetchRes.data as any[]
          const total = records.length

          setPurgeProgress(prev => ({
            ...prev,
            [table.id]: { status: 'loading', total, deleted: 0 }
          }))

          if (total > 0) {
            let deletedCount = 0
            for (const record of records) {
              const recordId = record[table.idField]
              if (recordId) {
                await table.service.delete(recordId)
                deletedCount++
                setPurgeProgress(prev => ({
                  ...prev,
                  [table.id]: { status: 'loading', total, deleted: deletedCount }
                }))
              }
            }
          }

          setPurgeProgress(prev => ({
            ...prev,
            [table.id]: { status: 'success', total, deleted: total }
          }))
        } else {
          throw new Error(fetchRes.error?.message || 'Data retrieval failed.')
        }
      } catch (err) {
        console.error(`[Purge] Failed to purge ${table.displayName}:`, err)
        setPurgeProgress(prev => ({
          ...prev,
          [table.id]: { 
            status: 'error', 
            total: 0, 
            deleted: 0, 
            errorMsg: err instanceof Error ? err.message : 'Deletion failed' 
          }
        }))
      }
    }

    setIsPurging(false)
  }

  const resetPurgeState = () => {
    setSelectedTables([])
    setSearchQuery('')
    setConfirmText('')
    setPurgeStage('setup')
    setPurgeProgress({})
    setIsPurging(false)
  }

  return (
    <Box>
      <PageHeader 
        title="System Configurations" 
        subtitle="Manage global system settings, business rules, and administrative structures."
        actionElement={
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={() => { resetPurgeState(); setPurgeDialogOpen(true) }}
            sx={{ px: 3, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Database Clean Tool
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {configItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.key}>
            <ConfigTile 
              title={item.title}
              description={item.description}
              icon={item.icon}
              onClick={() => onNavigate(item.key)}
              color={item.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* --- BULK TABLE PURGE DIALOG --- */}
      <Dialog 
        open={purgeDialogOpen} 
        onClose={() => !isPurging && setPurgeDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3 }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteSweepIcon color="error" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Bulk Database Purge Tool</Typography>
          </Box>
          <IconButton 
            onClick={() => setPurgeDialogOpen(false)} 
            disabled={isPurging}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {purgeStage === 'setup' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Critical Security Notice</Typography>
                Emptying tables will permanently destroy all records. Dataverse relationship constraints (cascade restrict rules) may prevent some rows from deleting if child records still exist. The tool automatically executes deletion sorted from children to parents to reduce errors.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  placeholder="Filter tables..."
                  size="small"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <Button variant="outlined" size="small" onClick={handleSelectAll} sx={{ flexShrink: 0, fontWeight: 600 }}>
                  Select All
                </Button>
                <Button variant="outlined" size="small" color="secondary" onClick={handleClearSelection} sx={{ flexShrink: 0, fontWeight: 600 }}>
                  Clear
                </Button>
              </Box>

              <Box sx={{ maxHeight: 350, overflowY: 'auto', pr: 1 }}>
                {Object.keys(groupedTables).length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No tables match your query.
                  </Typography>
                ) : (
                  Object.entries(groupedTables).map(([category, tables]) => (
                    <Box key={category} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                        {category}
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                        <Grid container spacing={1}>
                          {tables.map(t => (
                            <Grid size={{ xs: 12, sm: 6 }} key={t.id}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={selectedTables.includes(t.id)}
                                    onChange={() => handleToggleTable(t.id)}
                                    color="error"
                                    size="small"
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.displayName}</Typography>
                                    <Typography variant="caption" color="text.secondary">{t.id}</Typography>
                                  </Box>
                                }
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>
                    </Box>
                  ))
                )}
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Confirm Deletion Authorization
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Please type <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>PURGE</Box> below to unlock the delete action for the {selectedTables.length} selected tables.
                </Typography>
                <TextField
                  placeholder="Type PURGE here"
                  size="small"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  fullWidth
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {isPurging ? 'Purging Solution Tables...' : 'Purge Completed'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Object.values(purgeProgress).filter(p => p.status === 'success').length} of {Object.keys(purgeProgress).length} tables cleared
                </Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={
                  Object.keys(purgeProgress).length > 0
                    ? (Object.values(purgeProgress).filter(p => ['success', 'error'].includes(p.status)).length / Object.keys(purgeProgress).length) * 100
                    : 0
                }
                color="error"
                sx={{ height: 8, borderRadius: 4 }}
              />

              <List sx={{ bgcolor: 'background.default', borderRadius: 2, border: `1px solid ${theme.palette.divider}`, maxHeight: 300, overflowY: 'auto' }}>
                {PURGEABLE_TABLES
                  .filter(t => selectedTables.includes(t.id))
                  .sort((a, b) => a.deleteOrder - b.deleteOrder)
                  .map(t => {
                    const prog = purgeProgress[t.id] || { status: 'pending' }
                    return (
                      <ListItem 
                        key={t.id}
                        divider
                        secondaryAction={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {prog.status === 'loading' && prog.total != null && `${prog.deleted || 0}/${prog.total}`}
                            {prog.status === 'success' && `Cleared (${prog.total || 0})`}
                            {prog.status === 'error' && 'Failed'}
                            {prog.status === 'pending' && 'Queued'}
                          </Typography>
                        }
                      >
                        <ListItemIcon>
                          {prog.status === 'success' && <CheckCircleIcon color="success" />}
                          {prog.status === 'error' && <ErrorIcon color="error" />}
                          {prog.status === 'loading' && <LoopIcon color="primary" sx={{ animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />}
                          {prog.status === 'pending' && <PendingIcon color="action" />}
                        </ListItemIcon>
                        <ListItemText 
                          primary={t.displayName} 
                          secondary={
                            <Typography 
                              variant="body2" 
                              color={prog.status === 'error' ? 'error.main' : 'text.secondary'}
                            >
                              {prog.errorMsg || t.id}
                            </Typography>
                          }
                        />
                      </ListItem>
                    )
                  })}
              </List>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: 'background.default' }}>
          {purgeStage === 'setup' ? (
            <>
              <Button onClick={() => setPurgeDialogOpen(false)} disabled={isPurging} variant="outlined" sx={{ fontWeight: 600 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={confirmText !== 'PURGE' || selectedTables.length === 0}
                onClick={startPurge}
                startIcon={<DeleteSweepIcon />}
                sx={{ fontWeight: 600 }}
              >
                Empty Selected Tables ({selectedTables.length})
              </Button>
            </>
          ) : (
            <Button onClick={() => setPurgeDialogOpen(false)} disabled={isPurging} variant="contained" sx={{ fontWeight: 600 }}>
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
