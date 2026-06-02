import { useState, useCallback, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Tooltip,
  useTheme,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import BugReportIcon from '@mui/icons-material/BugReport'
import CodeIcon from '@mui/icons-material/Code'
import TableChartIcon from '@mui/icons-material/TableChart'
import StorageIcon from '@mui/icons-material/Storage'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import { getAvailableTables, debugQueryTable, seedAllResourceData, truncateResourceData } from '@/services'
import AddIcon from '@mui/icons-material/Add'
import { StatusTag } from '@/components/common'
import type { DebugQueryOptions } from '@/services'

const ALL_TABLES = getAvailableTables()

export default function DebugDataPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [selectedTable, setSelectedTable] = useState<string>(ALL_TABLES[0] || '')
  const [filterStr, setFilterStr] = useState('')
  const [topValue, setTopValue] = useState(100)
  const [selectFields, setSelectFields] = useState('')
  const [orderBy, setOrderBy] = useState('')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    columns: string[]
    rows: Record<string, any>[]
    count: number
    error?: string
  } | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [seeding, setSeeding] = useState(false)
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false)
  const [seedResults, setSeedResults] = useState<{ table: string; created: number; error?: string }[]>([])

  const tableRef = useRef<HTMLDivElement>(null)

  const handleQuery = useCallback(async () => {
    if (!selectedTable) return
    setLoading(true)
    setResults(null)
    setRawResponse(null)
    setShowRaw(false)

    const options: DebugQueryOptions = {
      table: selectedTable,
      top: topValue || 100,
    }
    if (filterStr.trim()) options.filter = filterStr.trim()
    if (selectFields.trim()) {
      options.select = selectFields.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (orderBy.trim()) {
      options.orderBy = orderBy.split(',').map((s) => s.trim()).filter(Boolean)
    }

    const result = await debugQueryTable(options)
    setResults(result)
    setRawResponse(result.rawResponse)
    setLoading(false)
  }, [selectedTable, filterStr, topValue, selectFields, orderBy])

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2))
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = JSON.stringify(rawResponse, null, 2)
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    }
  }

  const handleSeed = useCallback(async () => {
    setSeedConfirmOpen(false)
    setSeeding(true)
    setSeedResults([])
    try {
      // Step 1: Truncate existing data
      setSeedResults([{ table: '⏳ Truncating existing data...', created: 0 }])
      const truncateResults = await truncateResourceData()

      // Check if truncate had errors before proceeding
      const truncateErrors = truncateResults.filter(r => r.error)
      if (truncateErrors.length > 0) {
        setSeedResults(truncateResults.map(r => ({ table: `Truncated: ${r.table}`, created: r.created, error: r.error })))
        setSeeding(false)
        return
      }

      // Step 2: Seed fresh data
      setSeedResults(truncateResults.map(r => ({ ...r, table: `🗑 ${r.table} (truncated)` })))
      const freshSeedResults = await seedAllResourceData()

      // Combine both results
      const combined = [
        ...truncateResults.map(r => ({ table: `Truncated: ${r.table}`, created: r.created, error: r.error })),
        ...freshSeedResults.map(r => ({ table: `Seeded: ${r.table}`, created: r.created, error: r.error })),
      ]
      setSeedResults(combined)
    } catch (err: any) {
      setSeedResults([{ table: 'error', created: 0, error: err?.message || String(err) }])
    } finally {
      setSeeding(false)
    }
  }, [setSeedConfirmOpen, setSeeding, setSeedResults])

  // Format a cell value for display
  const formatCellValue = (val: any): string => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val)
      } catch {
        return String(val)
      }
    }
    return String(val)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="primary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          PPM Central · Developer Tools
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.5, mb: 1 }}>
          <BugReportIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 32 }} />
          Dataverse Data Explorer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Query any table in the Dataverse to inspect raw data, debug filters, and validate field names for chart configuration.
        </Typography>
      </Box>

      {/* Query Builder */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          <CodeIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 20 }} />
          Query Builder
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          {/* Table selector */}
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Table</InputLabel>
            <Select
              value={selectedTable}
              label="Table"
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              {ALL_TABLES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Top */}
          <TextField
            size="small"
            label="Top (max rows)"
            type="number"
            value={topValue}
            onChange={(e) => setTopValue(Number(e.target.value) || 100)}
            sx={{ width: 140 }}
            slotProps={{ htmlInput: { min: 1, max: 5000 } }}
          />

          {/* Filter */}
          <TextField
            size="small"
            label="Filter (OData)"
            placeholder='e.g. statecode eq 0'
            value={filterStr}
            onChange={(e) => setFilterStr(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
          />

          {/* Select fields */}
          <TextField
            size="small"
            label="Select (comma-separated)"
            placeholder="e.g. pm_projectid, pm_projectname"
            value={selectFields}
            onChange={(e) => setSelectFields(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
          />

          {/* OrderBy */}
          <TextField
            size="small"
            label="Order By"
            placeholder="e.g. pm_projectname asc"
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            sx={{ minWidth: 200, flex: 0.5 }}
          />

          {/* Query button */}
          <Button
            variant="contained"
            onClick={handleQuery}
            disabled={loading || !selectedTable}
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            sx={{ height: 40 }}
          >
            {loading ? 'Querying...' : 'Query'}
          </Button>
        </Box>
      </Paper>

      {/* Error alert */}
      {results?.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {results.error}
        </Alert>
      )}

      {/* Results */}
      {results && !results.error && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          {/* Summary bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TableChartIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Results: {selectedTable}
              </Typography>
              <StatusTag
                label={`${results.count} row${results.count !== 1 ? 's' : ''}`}
                color={results.count > 0 ? 'success' : 'default'}
                variant="outlined"
              />
              <StatusTag
                label={`${results.columns.length} columns`}
                color="info"
                variant="outlined"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Toggle raw JSON response">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  onClick={() => setShowRaw(!showRaw)}
                >
                  {showRaw ? 'Hide Raw' : 'Show Raw'}
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Raw JSON */}
          <Collapse in={showRaw}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                maxHeight: 400,
                overflow: 'auto',
                bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'sticky', top: 0, textAlign: 'right', mb: 1 }}>
                <Tooltip title={copyLabel}>
                  <IconButton size="small" onClick={handleCopyRaw}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  m: 0,
                }}
              >
                {JSON.stringify(rawResponse ?? results.rows, null, 2)}
              </Typography>
            </Paper>
          </Collapse>

          {/* Data Table */}
          {results.columns.length > 0 ? (
            <TableContainer
              ref={tableRef}
              sx={{
                maxHeight: 600,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                '& .MuiTableCell-root': {
                  fontSize: '0.75rem',
                  fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
                },
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: isDark ? '#1e293b' : '#f8fafc',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        minWidth: 80,
                      }}
                    >
                      #
                    </TableCell>
                    {results.columns.map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          fontWeight: 700,
                          bgcolor: isDark ? '#1e293b' : '#f8fafc',
                          whiteSpace: 'nowrap',
                          minWidth: 120,
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.rows.map((row, rowIdx) => (
                    <TableRow
                      key={rowIdx}
                      hover
                      sx={{
                        '&:nth-of-type(even)': {
                          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 600,
                          position: 'sticky',
                          left: 0,
                          bgcolor: isDark ? '#1e293b' : '#f8fafc',
                          zIndex: 1,
                        }}
                      >
                        {rowIdx + 1}
                      </TableCell>
                      {results.columns.map((col) => (
                        <TableCell key={col} sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatCellValue(row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Query returned 0 rows. Try adjusting the filter or selecting a different table.
            </Typography>
          )}
        </Paper>
      )}

      {/* Quick Reference */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Available Tables &amp; Tips
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {ALL_TABLES.map((t) => (
            <StatusTag
              key={t}
              label={t}
              variant={t === selectedTable ? 'filled' : 'outlined'}
              color={t === selectedTable ? 'primary' : 'default'}
              onClick={() => setSelectedTable(t)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          <strong>Filter examples:</strong>
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {[
            'statecode eq 0',
            'statecode eq 0 and pm_ragstatus eq 2',
            'pm_pipelinestatus eq 1',
            'pm_departmentname ne null',
            'contains(pm_fullname, \'John\')',
          ].map((ex) => (
            <StatusTag
              key={ex}
              label={ex}
              variant="outlined"
              onClick={() => setFilterStr(ex)}
              sx={{ fontFamily: '"Fira Code", "Cascadia Code", monospace', fontSize: '0.7rem', cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>

      {/* Seed Data Section */}
      <Paper elevation={1} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          <StorageIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 20 }} />
          Seed Resource Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Populate <strong>pm_resources</strong>, <strong>pm_resourceallocations</strong>, <strong>pm_timesheets</strong>, and <strong>pm_timesheetentries</strong> with sample data so the Resource Utilization charts on the Dashboard have data to display.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="warning"
            startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : <StorageIcon />}
            disabled={seeding}
            onClick={() => setSeedConfirmOpen(true)}
          >
            {seeding ? 'Truncating & Seeding...' : 'Truncate & Seed All Resource Data'}
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            disabled={seeding}
            onClick={async () => {
              setSeeding(true)
              setSeedResults([])
              setSeedResults([{ table: '⏳ Seeding data (without truncation)...', created: 0 }])
              try {
                const freshSeedResults = await seedAllResourceData()
                setSeedResults(freshSeedResults.map(r => ({ table: `Seeded: ${r.table}`, created: r.created, error: r.error })))
              } catch (err: any) {
                setSeedResults([{ table: 'error', created: 0, error: err?.message || String(err) }])
              } finally {
                setSeeding(false)
              }
            }}
          >
            {seeding ? 'Seeding...' : 'Quick Seed (no truncation)'}
          </Button>

          {seedResults.length > 0 && !seeding && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setSeedResults([])}
              >
                Clear Results
              </Button>
              <Button
                size="small"
                variant="text"
                color="primary"
                onClick={() => {
                  setSelectedTable('pm_resources')
                  setFilterStr('statecode eq 0')
                  setSelectFields('pm_fullname, pm_dailyworkcapacity, pm_departmentname')
                  setOrderBy('pm_fullname asc')
                }}
              >
                Query Resources
              </Button>
            </>
          )}
        </Box>

        {/* Seed results */}
        {seedResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Operation Results
            </Typography>
            {seeding && <LinearProgress sx={{ mb: 1 }} />}
            <List dense disablePadding>
              {seedResults.map((r, idx) => (
                <ListItem key={idx} sx={{ px: 0, py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {r.table.startsWith('⏳') ? (
                      <CircularProgress size={16} />
                    ) : r.error ? (
                      <ErrorIcon fontSize="small" color="error" />
                    ) : r.created > 0 ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : (
                      <WarningIcon fontSize="small" color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        <strong>{r.table}</strong>: {r.created} record{r.created !== 1 ? 's' : ''}
                        {r.error && <span style={{ color: '#ef4444' }}> — Error: {r.error}</span>}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Seed confirmation dialog */}
      <Dialog open={seedConfirmOpen} onClose={() => setSeedConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Truncate &amp; Seed</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>This will FIRST delete ALL existing records</strong> from the following tables, then create fresh sample data.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            The following tables will be truncated and reseeded:
          </Typography>
          <List dense>
            {['pm_timesheetentries', 'pm_timesheets', 'pm_resourceallocations', 'pm_resources'].map((t) => (
              <ListItem key={t} sx={{ px: 0, py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <StorageIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary={<Typography variant="body2"><strong>{t}</strong></Typography>} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedConfirmOpen(false)} variant="outlined" disabled={seeding}>
            Cancel
          </Button>
          <Button onClick={handleSeed} variant="contained" color="error" disabled={seeding}>
            {seeding ? 'Processing...' : 'Yes, Truncate & Seed'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Initial state when no query made */}
      {!results && !loading && (
        <Paper elevation={1} sx={{ p: 6, textAlign: 'center', mt: 3 }}>
          <BugReportIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
            No query executed yet
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Select a table, configure your query options, and click <strong>Query</strong> to inspect raw Dataverse data.
          </Typography>
        </Paper>
      )}
    </Box>
  )
}
