import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  Typography,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  useTheme,
  Tooltip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import InfoIcon from '@mui/icons-material/Info'
import FilterListIcon from '@mui/icons-material/FilterList'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { PageHeader } from '@/components/common'
import { useUser } from '@/context/UserContext'
import { Pm_changelogentriesService } from '@/generated/services/Pm_changelogentriesService'
import type { Pm_changelogentries } from '@/generated/models/Pm_changelogentriesModel'
import { Pm_changelogentriespm_actiontype } from '@/generated/models/Pm_changelogentriesModel'

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
  const theme = useTheme()
  const { users } = useUser()

  const [loading, setLoading] = useState<boolean>(true)
  const [logs, setLogs] = useState<Pm_changelogentries[]>([])
  const [selectedLog, setSelectedLog] = useState<Pm_changelogentries | null>(null)
  
  // Filtering States
  const [search, setSearch] = useState<string>('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  
  // Pagination
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(15)

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
      // Fetch latest 500 logs sorted by timestamp descending
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
      console.error('[ActivityLogPage] Failed to fetch change log entries:', err)
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
    setSearch('')
    setEntityFilter('all')
    setActionFilter('all')
    setUserFilter('all')
    setPage(0)
  }

  // Filter and Search Logic (computed locally for safety and responsiveness)
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query
      if (search.trim()) {
        const query = search.toLowerCase()
        const recordName = (log.pm_recordname || '').toLowerCase()
        const fieldName = (log.pm_fieldname || '').toLowerCase()
        const oldValue = (log.pm_oldvalue || '').toLowerCase()
        const newValue = (log.pm_newvalue || '').toLowerCase()
        const changedByGuid = (log._pm_changeby_value || '').toLowerCase()
        const changedByName = (log.pm_changebyname || userNameMap.get(changedByGuid) || 'System').toLowerCase()

        const matches = 
          recordName.includes(query) ||
          fieldName.includes(query) ||
          oldValue.includes(query) ||
          newValue.includes(query) ||
          changedByGuid.includes(query) ||
          changedByName.includes(query)

        if (!matches) return false
      }

      // 2. Entity Filter
      if (entityFilter !== 'all') {
        if (log.pm_entityname !== entityFilter) return false
      }

      // 3. Action Filter
      if (actionFilter !== 'all') {
        const actionNum = Number(actionFilter)
        // actionType is string key or number in model
        const logAction = log.pm_actiontype !== undefined ? Number(log.pm_actiontype) : -1
        if (logAction !== actionNum) return false
      }

      // 4. User Filter
      if (userFilter !== 'all') {
        const logUser = (log._pm_changeby_value || '').toLowerCase()
        if (logUser !== userFilter.toLowerCase()) return false
      }

      return true
    })
  }, [logs, search, entityFilter, actionFilter, userFilter, userNameMap])

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const start = page * rowsPerPage
    return filteredLogs.slice(start, start + rowsPerPage)
  }, [filteredLogs, page, rowsPerPage])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Render Helpers
  const getActionChip = (action: any) => {
    const act = action !== undefined ? Number(action) : -1
    switch (act) {
      case 0: // StatusChange
        return <Chip label="Status Change" size="small" sx={{ bgcolor: 'purple.main', color: '#fff', fontWeight: 600, px: 0.5 }} />
      case 2: // Create
        return <Chip label="Create" size="small" color="success" sx={{ fontWeight: 600, px: 0.5 }} />
      case 1: // Update
      default:
        return <Chip label="Update" size="small" color="primary" sx={{ fontWeight: 600, px: 0.5 }} />
    }
  }

  const getEntityLabel = (name: string | undefined) => {
    if (!name) return 'System'
    return ENTITY_LABELS[name] || name
  }

  const formatTimestamp = (ts: string | undefined) => {
    if (!ts) return 'N/A'
    const date = new Date(ts)
    return date.toLocaleString()
  }

  const resolveActorName = (log: Pm_changelogentries) => {
    if (log.pm_changebyname) return log.pm_changebyname
    const cleanGuid = (log._pm_changeby_value || '').toLowerCase()
    return userNameMap.get(cleanGuid) || (log._pm_changeby_value ? `User (${log._pm_changeby_value.substring(0, 8)}...)` : 'System')
  }

  return (
    <Box>
      <PageHeader
        title="Admin Activity Log"
        subtitle="Track mutations, record updates, and workflow changes across the portfolio system."
        actionElement={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ borderRadius: 1.15, fontWeight: 600 }}
          >
            Refresh
          </Button>
        }
      />

      {/* Filters Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.25,
        }}
      >
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Search & Filters
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Search query */}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Keywords"
                placeholder="Search record name, values, etc..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                slotProps={{ htmlInput: { id: 'search-activities' } }}
              />
            </Grid>

            {/* Entity Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="entity-filter-label">Module / Entity</InputLabel>
                <Select
                  labelId="entity-filter-label"
                  label="Module / Entity"
                  value={entityFilter}
                  onChange={(e) => { setEntityFilter(e.target.value); setPage(0) }}
                >
                  <MenuItem value="all">All Entities</MenuItem>
                  {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Action Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="action-filter-label">Action Type</InputLabel>
                <Select
                  labelId="action-filter-label"
                  label="Action Type"
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
                >
                  <MenuItem value="all">All Actions</MenuItem>
                  <MenuItem value="2">Create</MenuItem>
                  <MenuItem value="1">Update</MenuItem>
                  <MenuItem value="0">Status Change</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* User Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="user-filter-label">Performed By</InputLabel>
                <Select
                  labelId="user-filter-label"
                  label="Performed By"
                  value={userFilter}
                  onChange={(e) => { setUserFilter(e.target.value); setPage(0) }}
                >
                  <MenuItem value="all">All Users</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.systemuserid} value={u.systemuserid}>
                      {u.fullname}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Clear Filters */}
            <Grid size={{ xs: 12, md: 1.5 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                fullWidth
                variant="text"
                color="secondary"
                startIcon={<DeleteSweepIcon />}
                onClick={handleClearFilters}
                sx={{ fontWeight: 600 }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {/* Logs Table Section */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.25,
          minHeight: 200,
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 2,
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}

        <Table size="medium">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: '18%' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '18%' }}>Actor (User)</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '15%' }}>Module</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '18%' }}>Record</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '10%' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '12%' }}>Field</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '9%', textAlign: 'center' }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <TableRow
                  key={log.pm_changelogentryid}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell sx={{ fontSize: '0.825rem' }}>
                    {formatTimestamp(log.pm_changetimestamp)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {resolveActorName(log)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    {getEntityLabel(log.pm_entityname)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {log.pm_recordname || 'System Auto'}
                  </TableCell>
                  <TableCell>{getActionChip(log.pm_actiontype)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {log.pm_fieldname || '-'}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedLog(log) }}>
                      <InfoIcon fontSize="small" color="primary" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Retrieving audit logs...' : 'No activity records found matching filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[15, 30, 50]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Log Detail Inspector Modal */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.25 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          Activity Log Inspector
        </DialogTitle>
        <DialogContent sx={{ mt: 2.5 }}>
          {selectedLog && (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Timestamp
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatTimestamp(selectedLog.pm_changetimestamp)}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Action Type
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getActionChip(selectedLog.pm_actiontype)}</Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Actor (User)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {resolveActorName(selectedLog)}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                  GUID: {selectedLog._pm_changeby_value || 'System'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Module / Entity Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {getEntityLabel(selectedLog.pm_entityname)} ({selectedLog.pm_entityname})
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Record Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedLog.pm_recordname || 'N/A'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Record Identifier (GUID)
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>
                  {selectedLog.pm_recordidentifier || 'N/A'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Change Details
                </Typography>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.15,
                    p: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Field Name
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {selectedLog.pm_fieldname || 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Old Value
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'error.main',
                          wordBreak: 'break-all',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {selectedLog.pm_oldvalue || '(empty)'}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        New Value
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'success.main',
                          wordBreak: 'break-all',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {selectedLog.pm_newvalue || '(empty)'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {(selectedLog.pm_ipaddress || selectedLog.pm_sessionid || selectedLog.pm_modulename) && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Client IP Address
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {selectedLog.pm_ipaddress || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Module Scope
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedLog.pm_modulename || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Session Identifier
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.775rem' }}>
                      {selectedLog.pm_sessionid || 'N/A'}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setSelectedLog(null)} sx={{ fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
