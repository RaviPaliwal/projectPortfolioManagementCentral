import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  IconButton,
  Chip,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Tooltip,
  Avatar,
  Card,
  FormControl,
  Select,
  MenuItem,
  useTheme
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import InfoIcon from '@mui/icons-material/Info'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import PersonIcon from '@mui/icons-material/Person'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ComputerIcon from '@mui/icons-material/Computer'
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import HistoryIcon from '@mui/icons-material/History'
import CategoryIcon from '@mui/icons-material/Category'
import LayersIcon from '@mui/icons-material/Layers'
import DnsIcon from '@mui/icons-material/Dns'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import GroupIcon from '@mui/icons-material/Group'

import { PageHeader, KpiCardRow, DataverseTable, Button } from '@/components/common'
import { fontSizes } from '@/styles'
import type { Column } from '@/components/common'
import { useUser } from '@/context/UserContext'
import { Pm_changelogentriesService } from '@/generated/services/Pm_changelogentriesService'
import type { Pm_changelogentries } from '@/generated/models/Pm_changelogentriesModel'

const ENTITY_LABELS: Record<string, string> = {
  pm_projects: 'Project',
  pm_portfolios: 'Portfolio',
  pm_programmes: 'Programme',
  pm_risks: 'Risk',
  pm_issues: 'Issue',
  pm_timesheets: 'Timesheet',
  pm_resourceallocations: 'Resource Allocation',
  pm_resources: 'Resource',
  pm_skills: 'Skill',
  pm_resourceskills: 'Resource Skill',
  pm_documents: 'Document',
  pm_initiatives: 'Initiative (Pipeline)',
  pm_projectgatereviews: 'Gate Review',
  pm_benefits: 'Benefit',
  pm_performancemeasures: 'Performance Measure',
  pm_budgetlines: 'Budget Line',
  pm_cashflowentries: 'Cash Flow Entry',
  pm_fundingsources: 'Funding Source',
}

export default function ActivityLogPage() {
  const { users } = useUser()

  const [loading, setLoading] = useState<boolean>(true)
  const [logs, setLogs] = useState<Pm_changelogentries[]>([])
  const [selectedLog, setSelectedLog] = useState<Pm_changelogentries | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Dropdown Filtering States
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')

  // Map user ID to fullname lookup
  const userNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) {
      if (u.systemuserid) {
        map.set(u.systemuserid.toLowerCase(), u.fullname)
      }
    }
    return map
  }, [users])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await Pm_changelogentriesService.getAll({
        orderBy: ['pm_changetimestamp desc'],
        top: 500,
      })

      if (result && 'value' in result) {
        setLogs(result.value as Pm_changelogentries[])
      } else if (result && 'data' in result) {
        setLogs(result.data as Pm_changelogentries[])
      } else if (Array.isArray(result)) {
        setLogs(result)
      } else {
        setLogs([])
      }
    } catch (err) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleRefresh = () => {
    loadLogs()
  }

  const handleClearFilters = () => {
    setEntityFilter('all')
    setActionFilter('all')
    setUserFilter('all')
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Filter Logic by Dropdowns (Keyword searching is handled internally by DataverseTable)
  const dropdownFilteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== 'all' && log.pm_entityname !== entityFilter) return false

      if (actionFilter !== 'all') {
        const actionNum = Number(actionFilter)
        const logAction = log.pm_actiontype !== undefined ? Number(log.pm_actiontype) : -1
        if (logAction !== actionNum) return false
      }

      if (userFilter !== 'all') {
        const logUser = (log._pm_changeby_value || '').toLowerCase()
        if (logUser !== userFilter.toLowerCase()) return false
      }

      return true
    })
  }, [logs, entityFilter, actionFilter, userFilter])

  // Statistics for KPI Cards
  const stats = useMemo(() => {
    const total = logs.length
    const creates = logs.filter(l => Number(l.pm_actiontype) === 2).length
    const updates = logs.filter(l => Number(l.pm_actiontype) === 1).length
    const statusChanges = logs.filter(l => Number(l.pm_actiontype) === 0).length

    const uniqueUsers = new Set()
    logs.forEach(l => {
      if (l._pm_changeby_value) uniqueUsers.add(l._pm_changeby_value.toLowerCase())
    })

    return { total, creates, updates, statusChanges, usersCount: uniqueUsers.size }
  }, [logs])

  // Top KPI Card Row Items mapping
  const kpiItems = useMemo(() => {
    return [
      {
        label: 'TOTAL OPERATIONS',
        value: stats.total,
        icon: <HistoryIcon />,
        color: 'primary.main',
        subtitle: 'Latest 500 logs'
      },
      {
        label: 'RECORDS CREATED',
        value: stats.creates,
        icon: <CheckCircleOutlineIcon />,
        color: 'success.main',
        subtitle: stats.total > 0 ? `${Math.round((stats.creates / stats.total) * 100)}% of total` : '0%'
      },
      {
        label: 'UPDATES & CHANGES',
        value: stats.updates + stats.statusChanges,
        icon: <AccessTimeIcon />,
        color: 'warning.main',
        subtitle: stats.total > 0 ? `${Math.round(((stats.updates + stats.statusChanges) / stats.total) * 100)}% of total` : '0%'
      },
      {
        label: 'ACTIVE ACTORS',
        value: stats.usersCount,
        icon: <GroupIcon />,
        color: 'error.main',
        subtitle: 'Admins active'
      }
    ]
  }, [stats])

  const getRelativeTime = (ts: string | undefined) => {
    if (!ts) return 'N/A'
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getActionChip = (action: any) => {
    const act = action !== undefined ? Number(action) : -1

    let label = 'UPDATE'
    let color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default' = 'info'

    if (act === 0) { // StatusChange
      label = 'STATUS CHANGE'
      color = 'secondary'
    } else if (act === 2) { // Create
      label = 'CREATE'
      color = 'success'
    }

    return (
      <Chip
        label={label}
        size="small"
        variant="outlined"
        color={color}
        sx={{
          fontWeight: 700,
          fontSize: fontSizes.xs,
          letterSpacing: '0.3px',
          px: 0.5
        }}
      />
    )
  }

  const getEntityLabel = (name: string | undefined) => {
    if (!name) return 'System'
    return ENTITY_LABELS[name] || name
  }

  const resolveActorName = (log: Pm_changelogentries) => {
    if (log.pm_changebyname) return log.pm_changebyname
    const cleanGuid = (log._pm_changeby_value || '').toLowerCase()
    return userNameMap.get(cleanGuid) || (log._pm_changeby_value ? `User (${log._pm_changeby_value.substring(0, 8)}...)` : 'System')
  }

  const getEntityColor = (name: string | undefined): 'primary' | 'secondary' | 'warning' | 'error' | 'default' => {
    const key = (name || '').toLowerCase()
    if (key.includes('project')) return 'primary'
    if (key.includes('portfolio')) return 'secondary'
    if (key.includes('programme')) return 'warning'
    if (key.includes('risk') || key.includes('issue')) return 'error'
    return 'default'
  }

  const ModuleTag = ({ entityName }: { entityName: string | undefined }) => {
    if (!entityName) return <Chip label="SYSTEM" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
    const label = getEntityLabel(entityName).toUpperCase()
    const color = getEntityColor(entityName)

    return (
      <Chip
        label={label}
        size="small"
        variant="outlined"
        color={color}
        sx={{
          fontWeight: 700,
          fontSize: fontSizes.xs
        }}
      />
    )
  }

  const RecordCell = ({ log }: { log: Pm_changelogentries }) => {
    const theme = useTheme()
    const recordName = log.pm_recordname || 'System Auto'
    const initials = recordName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 1)
      .toUpperCase()

    const colors = [
      theme.palette.success.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main
    ]
    let hash = 0
    for (let i = 0; i < recordName.length; i++) {
      hash = recordName.charCodeAt(i) + ((hash << 5) - hash)
    }
    const color = colors[Math.abs(hash) % colors.length]

    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: color,
            color: '#fff',
            fontSize: fontSizes.sm,
            fontWeight: 700,
            boxShadow: 'none'
          }}
        >
          {initials}
        </Avatar>
        <Stack spacing={0.2}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {recordName}
          </Typography>
          {log.pm_fieldname && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs, fontFamily: 'monospace' }}>
              {log.pm_fieldname}
            </Typography>
          )}
        </Stack>
      </Stack>
    )
  }

  const TimestampCell = ({ timestamp }: { timestamp: string | undefined }) => {
    if (!timestamp) return <Typography variant="body2" color="text.disabled">-</Typography>
    const relative = getRelativeTime(timestamp)
    const exact = new Date(timestamp).toLocaleString()
    return (
      <Tooltip title={exact} arrow placement="top">
        <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", color: "text.secondary" }}>
          <AccessTimeIcon sx={{ fontSize: 14, opacity: 0.6 }} />
          <Typography variant="body2" sx={{ fontSize: fontSizes.sm }}>
            {relative}
          </Typography>
        </Stack>
      </Tooltip>
    )
  }

  // Column definitions matching the common DataverseTable interface
  const columns: Column<Pm_changelogentries>[] = [
    {
      key: 'pm_recordname',
      label: 'Record (Benefit)',
      width: '32%',
      format: (_, log) => <RecordCell log={log} />
    },
    {
      key: 'pm_entityname',
      label: 'Module (Category)',
      width: '16%',
      format: (val) => <ModuleTag entityName={val} />
    },
    {
      key: 'pm_actiontype',
      label: 'Action (Status)',
      width: '16%',
      format: (val) => getActionChip(val)
    },
    {
      key: 'pm_changebyname',
      label: 'Performed By (Owner)',
      width: '20%',
      format: (_, log) => {
        const actorName = resolveActorName(log)
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.primary' }}>
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {actorName}
            </Typography>
          </Stack>
        )
      }
    },
    {
      key: 'pm_changetimestamp',
      label: 'Time',
      width: '16%',
      format: (val) => <TimestampCell timestamp={val} />
    }
  ]

  // Header Filters injected into SearchFilterBar via DataverseTable
  const extraFilters = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      {/* Entity Selector */}
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          displayEmpty
          sx={{ borderRadius: 1.5, bgcolor: '#f8fafc' }}
        >
          <MenuItem value="all">All Modules</MenuItem>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>{label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Action Type Selector */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          displayEmpty
          sx={{ borderRadius: 1.5, bgcolor: '#f8fafc' }}
        >
          <MenuItem value="all">All Actions</MenuItem>
          <MenuItem value="2">Create</MenuItem>
          <MenuItem value="1">Update</MenuItem>
          <MenuItem value="0">Status Change</MenuItem>
        </Select>
      </FormControl>

      {/* Performed By User Selector */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          displayEmpty
          sx={{ borderRadius: 1.5, bgcolor: '#f8fafc' }}
        >
          <MenuItem value="all">All Users</MenuItem>
          {users.map((u) => (
            <MenuItem key={u.systemuserid} value={u.systemuserid}>{u.fullname}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  )

  return (
    <Box sx={{ pb: 4, bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
      <PageHeader
        title="Admin Activity Log"
        subtitle="Track mutations, record updates, and status adjustments across the portfolio system."
        actionElement={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        }
      />

      {/* Generic KPI Card Row Component */}
      <KpiCardRow items={kpiItems} loading={loading} />

      {/* Generic DataverseTable (CommonGrid) */}
      <DataverseTable
        data={dropdownFilteredLogs}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search logs..."
        searchFields={['pm_recordname', 'pm_fieldname', 'pm_oldvalue', 'pm_newvalue', 'pm_changebyname', '_pm_changeby_value']}
        onRowClick={(log) => setSelectedLog(log)}
        exportFileName="activity_logs"
        extraFilters={extraFilters}
        onClearFilters={handleClearFilters}
        actions={(log) => (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setSelectedLog(log) }}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'primary.main' }
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        )}
      />

      {/* Log Detail Inspector Modal */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedLog && (
          <>
            <DialogTitle
              sx={{
                px: 3.5,
                py: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <HistoryIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                <Stack spacing={0.1}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Activity Details
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Log Reference: {selectedLog.pm_changelogentryid}
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ ml: 2 }}>{getActionChip(selectedLog.pm_actiontype)}</Box>
            </DialogTitle>

            <DialogContent sx={{ px: 3.5, py: 3, bgcolor: 'background.paper' }}>
              <Grid container spacing={3}>
                {/* Visual Summary Box */}
                <Grid size={{ xs: 12 }}>
                  <Box
                    sx={{
                      bgcolor: 'background.default',
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      p: 2.5,
                      borderRadius: '0 8px 8px 0',
                      mt: 1.5
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs }}>
                      Change Description
                    </Typography>
                    <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5, fontSize: fontSizes.base }}>
                      {selectedLog.pm_description || 'No description provided.'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Actor Profile & Target Record row */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 'none', borderColor: 'divider', height: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Performed By
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {resolveActorName(selectedLog)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', wordBreak: 'break-all', mt: 0.5 }}>
                          <span>GUID: {selectedLog._pm_changeby_value || 'System'}</span>
                          {selectedLog._pm_changeby_value && (
                            <IconButton size="small" onClick={() => handleCopy(selectedLog._pm_changeby_value || '', 'Actor GUID')} sx={{ p: 0.2 }}>
                              {copiedField === 'Actor GUID' ? <CheckIcon sx={{ fontSize: 12, color: 'success.main' }} /> : <ContentCopyIcon sx={{ fontSize: 12 }} />}
                            </IconButton>
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 'none', borderColor: 'divider', height: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Target Record
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <DnsIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                          {selectedLog.pm_recordname || 'Unnamed Record'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Type: {getEntityLabel(selectedLog.pm_entityname)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', wordBreak: 'break-all', mt: 0.5 }}>
                          <span>GUID: {selectedLog.pm_recordidentifier || 'N/A'}</span>
                          {selectedLog.pm_recordidentifier && (
                            <IconButton size="small" onClick={() => handleCopy(selectedLog.pm_recordidentifier || '', 'Record GUID')} sx={{ p: 0.2 }}>
                              {copiedField === 'Record GUID' ? <CheckIcon sx={{ fontSize: 12, color: 'success.main' }} /> : <ContentCopyIcon sx={{ fontSize: 12 }} />}
                            </IconButton>
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                {/* Mutation Details */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Mutation Details
                  </Typography>

                  {/* StatusChange (Action 0) */}
                  {Number(selectedLog.pm_actiontype) === 0 && (
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>Before</Typography>
                        <Chip label={selectedLog.pm_oldvalue || 'Unknown'} color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                      </Stack>
                      <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>After</Typography>
                        <Chip label={selectedLog.pm_newvalue || 'Unknown'} color="success" sx={{ fontWeight: 700 }} />
                      </Stack>
                    </Box>
                  )}

                  {/* Update (Action 1) */}
                  {Number(selectedLog.pm_actiontype) === 1 && (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card variant="outlined" sx={{ p: 2, height: '100%', bgcolor: 'background.default', borderStyle: 'dashed' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase' }}>Field Name</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', fontSize: fontSizes.sm }}>
                            {selectedLog.pm_fieldname || 'N/A'}
                          </Typography>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'error.light', bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2' }}>
                          <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>BEFORE (OLD VALUE)</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'error.dark', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: fontSizes.sm, lineHeight: 1.4 }}>
                            {selectedLog.pm_oldvalue || '(empty)'}
                          </Typography>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'success.light', bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4' }}>
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>AFTER (NEW VALUE)</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'success.dark', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: fontSizes.sm, lineHeight: 1.4 }}>
                            {selectedLog.pm_newvalue || '(empty)'}
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {/* Create (Action 2) */}
                  {Number(selectedLog.pm_actiontype) === 2 && (
                    <Box
                      sx={{
                        border: '1px dashed',
                        borderColor: 'success.light',
                        borderRadius: 2,
                        p: 3,
                        bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
                        textAlign: 'center'
                      }}
                    >
                      <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 40, mb: 1 }} />
                      <Typography variant="subtitle2" sx={{ color: theme => theme.palette.mode === 'dark' ? 'success.light' : 'success.dark', fontWeight: 800, mb: 0.5 }}>Record Created Successfully</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: fontSizes.sm }}>
                        This audit log tracks the initial registration of this record within the portfolio environment.
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Session & Audit Context */}
                {(selectedLog.pm_ipaddress || selectedLog.pm_sessionid || selectedLog.pm_modulename) && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
                          <ComputerIcon sx={{ fontSize: 14 }} /> Client IP Address
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
                          {selectedLog.pm_ipaddress || 'N/A'}
                        </Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
                          <CategoryIcon sx={{ fontSize: 14 }} /> Module Scope
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {selectedLog.pm_modulename || 'N/A'}
                        </Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
                          <SettingsInputComponentIcon sx={{ fontSize: 14 }} /> Session ID
                          {selectedLog.pm_sessionid && (
                            <IconButton size="small" onClick={() => handleCopy(selectedLog.pm_sessionid || '', 'Session ID')} sx={{ p: 0 }}>
                              {copiedField === 'Session ID' ? <CheckIcon sx={{ fontSize: 12, color: 'success.main' }} /> : <ContentCopyIcon sx={{ fontSize: 12 }} />}
                            </IconButton>
                          )}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: fontSizes.sm,
                            wordBreak: 'break-all',
                            color: 'text.primary',
                            fontWeight: 600
                          }}
                          title={selectedLog.pm_sessionid}
                        >
                          {selectedLog.pm_sessionid || 'N/A'}
                        </Typography>
                      </Stack>
                    </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3.5, pb: 2.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Button onClick={() => setSelectedLog(null)} variant="outlined" sx={{ fontWeight: 700, px: 3 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
