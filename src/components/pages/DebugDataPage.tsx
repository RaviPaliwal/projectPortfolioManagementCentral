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
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Tooltip,
  useTheme,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
import { getAvailableTables, debugQueryTable, seedAllResourceData } from '../../services/dataverseService'
import type { DebugQueryOptions } from '../../services/dataverseService'

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
            inputProps={{ min: 1, max: 5000 }}
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
              <Chip
                label={`${results.count} row${results.count !== 1 ? 's' : ''}`}
                color={results.count > 0 ? 'success' : 'default'}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${results.columns.length} columns`}
                color="info"
                size="small"
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
            <Chip
              key={t}
              label={t}
              size="small"
              variant={t === selectedTable ? 'filled' : 'outlined'}
              color={t === selectedTable ? 'primary' : 'default'}
              onClick={() => setSelectedTable(t)}
              clickable
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
            <Chip
              key={ex}
              label={ex}
              size="small"
              variant="outlined"
              clickable
              onClick={() => setFilterStr(ex)}
              sx={{ fontFamily: '"Fira Code", "Cascadia Code", monospace', fontSize: '0.7rem' }}
            />
          ))}
        </Box>
      </Paper>

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
