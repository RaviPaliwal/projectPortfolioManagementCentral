import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  LinearProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CloseIcon from '@mui/icons-material/Close'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'
import WarningIcon from '@mui/icons-material/Warning'

import { fontSizes } from '@/styles'

interface FieldSchema {
  key: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'boolean' | 'options'
  options?: { label: string; value: any }[]
  matches: string[]
}

const BUDGETS_SCHEMA: FieldSchema[] = [
  {
    key: 'pm_budgetlinename',
    label: 'Budget Line Name',
    required: true,
    type: 'string',
    matches: ['name', 'budget line name', 'title', 'budgetlinename', 'line item', 'item'],
  },
  {
    key: 'pm_costcategory',
    label: 'Cost Category',
    required: true,
    type: 'options',
    options: [
      { label: 'Staff', value: 0 },
      { label: 'Contractors', value: 1 },
      { label: 'Licences', value: 2 },
      { label: 'Infrastructure', value: 3 },
    ],
    matches: ['cost category', 'category', 'costcategory', 'type'],
  },
  {
    key: 'pm_expencecatagory',
    label: 'Expense Category',
    required: true,
    type: 'options',
    options: [
      { label: 'CapEx', value: 0 },
      { label: 'OpEx', value: 1 },
    ],
    matches: ['expense category', 'expensetype', 'expense', 'expencecatagory', 'capital/operating'],
  },
  {
    key: 'pm_costinglevelcode',
    label: 'Costing Method',
    required: false,
    type: 'options',
    options: [
      { label: 'Fixed Cost', value: 0 },
      { label: 'Rate-Based', value: 1 },
    ],
    matches: ['costing method', 'method', 'costinglevelcode', 'rate or fixed'],
  },
  {
    key: 'pm_unitcosteur',
    label: 'Unit Cost (€)',
    required: true,
    type: 'number',
    matches: ['unit cost', 'price', 'cost', 'unitcosteur', 'amount', 'value'],
  },
  {
    key: 'pm_quantity',
    label: 'Quantity',
    required: false,
    type: 'number',
    matches: ['quantity', 'qty', 'units', 'count'],
  },
  {
    key: 'pm_notes',
    label: 'Notes',
    required: false,
    type: 'string',
    matches: ['notes', 'description', 'comments', 'comment'],
  },
  // ── Lookup fields (resolved by name → GUID) ──
  {
    key: 'pm_portfolioname',
    label: 'Portfolio Name',
    required: false,
    type: 'string',
    matches: ['portfolio', 'portfolio name', 'portfolioname', 'portfolio id', 'parent portfolio'],
  },
  {
    key: 'pm_programmename',
    label: 'Programme Name',
    required: false,
    type: 'string',
    matches: ['programme', 'programme name', 'programmename', 'program name', 'program', 'parent programme'],
  },
  {
    key: 'pm_projectname',
    label: 'Project Name',
    required: false,
    type: 'string',
    matches: ['project', 'project name', 'projectname', 'project id', 'parent project'],
  },
  {
    key: 'pm_fundingsourcename',
    label: 'Funding Source',
    required: false,
    type: 'string',
    matches: ['funding source', 'funding', 'fundingsourcename', 'source', 'fund', 'funding name'],
  },
]

const TASKS_SCHEMA: FieldSchema[] = [
  {
    key: 'pm_taskname',
    label: 'Task Name',
    required: true,
    type: 'string',
    matches: ['task name', 'name', 'title', 'taskname', 'summary'],
  },
  {
    key: 'pm_taskdescription',
    label: 'Description',
    required: false,
    type: 'string',
    matches: ['description', 'details', 'notes', 'comment', 'desc'],
  },
  {
    key: 'pm_plannedstartdate',
    label: 'Planned Start Date',
    required: true,
    type: 'date',
    matches: ['planned start date', 'start date', 'startdate', 'plannedstart', 'start'],
  },
  {
    key: 'pm_plannedenddate',
    label: 'Planned End Date',
    required: true,
    type: 'date',
    matches: ['planned end date', 'end date', 'enddate', 'plannedend', 'finish', 'end'],
  },
  {
    key: 'pm_percentcomplete',
    label: 'Percent Complete (%)',
    required: false,
    type: 'number',
    matches: ['percent complete', '% complete', 'progress', 'percent', 'complete %'],
  },
  {
    key: 'pm_ismilestone',
    label: 'Is Milestone',
    required: false,
    type: 'boolean',
    matches: ['is milestone', 'milestone', 'ismilestone', 'milestone?'],
  },
  {
    key: 'pm_tasklevel',
    label: 'Task Level',
    required: false,
    type: 'number',
    matches: ['task level', 'level', 'tasklevel', 'wbs level'],
  },
  {
    key: 'pm_wbsnumber',
    label: 'WBS Number',
    required: false,
    type: 'string',
    matches: ['wbs number', 'wbs', 'wbsnumber', 'hierarchy number'],
  },
]

interface ExcelImportDialogProps {
  open: boolean
  onClose: () => void
  importType: 'budgets' | 'tasks'
  onImport: (rows: any[], onProgress: (current: number, total: number) => void) => Promise<{ successCount: number; failedCount: number; errors: string[] }>
  title: string
}

export const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({
  open,
  onClose,
  importType,
  onImport,
  title,
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const schema = importType === 'budgets' ? BUDGETS_SCHEMA : TASKS_SCHEMA

  // State machine: 'upload' -> 'mapping' -> 'preview' -> 'importing' -> 'complete'
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload')
  const [fileName, setFileName] = useState<string>('')
  const [rawData, setRawData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}) // TargetSchemaKey -> CSVHeaderName
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Progress state
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [resultSummary, setResultSummary] = useState<{ successCount: number; failedCount: number; errors: string[] } | null>(null)

  // Reset dialog state when opening/closing
  useEffect(() => {
    if (open) {
      setStep('upload')
      setFileName('')
      setRawData([])
      setHeaders([])
      setColumnMapping({})
      setParsedRows([])
      setValidationErrors({})
      setErrorMessage(null)
      setResultSummary(null)
    }
  }, [open])

  // Simple, robust CSV Parser handling quotes and commas
  const parseCsv = (text: string): string[][] => {
    const lines = text.split(/\r\n|\n/)
    const result: string[][] = []
    for (const line of lines) {
      if (!line.trim()) continue
      const row: string[] = []
      let inQuotes = false
      let current = ''
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      row.push(current.trim())
      result.push(row.map(cell => cell.replace(/^"(.*)"$/, '$1').replace(/""/g, '"')))
    }
    return result
  }

  // Handle template download
  const handleDownloadTemplate = () => {
    const headerRow = schema.map((s) => `"${s.label}"`).join(',')
    const sampleRow = schema.map((s) => {
      if (s.key === 'pm_plannedstartdate' || s.key === 'pm_plannedenddate') return '"2026-07-01"'
      if (s.key === 'pm_budgetlinename') return '"Cloud Infrastructure Q3"'
      if (s.key === 'pm_unitcosteur') return '15000'
      if (s.key === 'pm_quantity') return '2'
      if (s.key === 'pm_percentcomplete') return '0'
      if (s.key === 'pm_ismilestone') return 'FALSE'
      if (s.key === 'pm_costcategory') return '"Staff"'
      if (s.key === 'pm_expencecatagory') return '"CapEx"'
      if (s.key === 'pm_costinglevelcode') return '"Fixed Cost"'
      if (s.key === 'pm_notes') return '"Monthly cloud hosting costs"'
      if (s.key === 'pm_portfolioname') return '"Digital Transformation"'
      if (s.key === 'pm_programmename') return '"Cloud Migration"'
      if (s.key === 'pm_projectname') return '"Project Alpha"'
      if (s.key === 'pm_fundingsourcename') return '"Corporate Budget 2026"'
      return `"${s.label} Sample"`
    }).join(',')
    
    const csvContent = `${headerRow}\n${sampleRow}`
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `PPM_Import_Template_${importType === 'budgets' ? 'Budgets' : 'Schedule'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const processFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const parsed = parseCsv(text)
        if (parsed.length < 2) {
          setErrorMessage('The uploaded CSV file is empty or missing data rows.')
          return
        }
        const fileHeaders = parsed[0]
        setHeaders(fileHeaders)
        setRawData(parsed.slice(1))

        // Auto mapping
        const autoMaps: Record<string, string> = {}
        schema.forEach((field) => {
          const match = fileHeaders.find((h) => {
            const normalizedHeader = h.toLowerCase().trim()
            return field.matches.some((m) => normalizedHeader === m || normalizedHeader.includes(m))
          })
          if (match) {
            autoMaps[field.key] = match
          }
        })
        setColumnMapping(autoMaps)
        setStep('mapping')
      } catch (err) {
        setErrorMessage('Failed to parse the CSV file. Please ensure it is in correct CSV format.')
      }
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleMappingChange = (fieldKey: string, csvHeader: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [fieldKey]: csvHeader,
    }))
  }

  const handleProceedToPreview = () => {
    // Generate actual rows and validate them
    const newParsedRows: any[] = []
    const newValidationErrors: Record<number, string[]> = {}

    rawData.forEach((row, rowIndex) => {
      const parsedRow: Record<string, any> = {}
      const rowErrors: string[] = []

      schema.forEach((field) => {
        const csvHeader = columnMapping[field.key]
        const csvHeaderIndex = headers.indexOf(csvHeader)
        const rawValue = csvHeaderIndex !== -1 ? row[csvHeaderIndex]?.trim() : ''

        if (field.required && (!rawValue || rawValue === '')) {
          rowErrors.push(`"${field.label}" is a required field.`)
          return
        }

        if (!rawValue) {
          parsedRow[field.key] = null
          return
        }

        // Type conversion & validation
        if (field.type === 'number') {
          const num = Number(rawValue.replace(/[^0-9.-]/g, ''))
          if (isNaN(num)) {
            rowErrors.push(`"${field.label}" must be a valid number.`)
          } else {
            parsedRow[field.key] = num
          }
        } else if (field.type === 'date') {
          const date = new Date(rawValue)
          if (isNaN(date.getTime())) {
            rowErrors.push(`"${field.label}" must be a valid date (YYYY-MM-DD).`)
          } else {
            parsedRow[field.key] = date.toISOString().split('T')[0]
          }
        } else if (field.type === 'boolean') {
          const valLower = rawValue.toLowerCase()
          parsedRow[field.key] = valLower === 'true' || valLower === 'yes' || valLower === '1'
        } else if (field.type === 'options' && field.options) {
          const matchedOpt = field.options.find(
            (o) =>
              o.label.toLowerCase() === rawValue.toLowerCase() ||
              String(o.value) === rawValue
          )
          if (matchedOpt === undefined) {
            rowErrors.push(
              `"${field.label}" must be one of: ${field.options.map((o) => o.label).join(', ')}.`
            )
          } else {
            parsedRow[field.key] = matchedOpt.value
          }
        } else {
          parsedRow[field.key] = rawValue
        }
      })

      newParsedRows.push(parsedRow)
      if (rowErrors.length > 0) {
        newValidationErrors[rowIndex] = rowErrors
      }
    })

    setParsedRows(newParsedRows)
    setValidationErrors(newValidationErrors)
    setStep('preview')
  }

  const handleStartImport = async () => {
    setStep('importing')
    setImportTotal(parsedRows.length)
    setImportProgress(0)

    try {
      const summary = await onImport(parsedRows, (current, total) => {
        setImportProgress(current)
      })
      setResultSummary(summary)
      setStep('complete')
    } catch (err) {
      setErrorMessage('A critical error occurred during the import process.')
      setStep('preview')
    }
  }

  const totalErrors = Object.keys(validationErrors).length

  return (
    <Dialog
      open={open}
      onClose={step === 'importing' ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {step !== 'importing' && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        
        {/* Step progress summary */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: step === 'upload' ? 'primary.main' : 'text.disabled' }}>1. Upload</Typography>
          <Typography variant="caption" color="text.disabled">/</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: step === 'mapping' ? 'primary.main' : 'text.disabled' }}>2. Map Fields</Typography>
          <Typography variant="caption" color="text.disabled">/</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: step === 'preview' ? 'primary.main' : 'text.disabled' }}>3. Preview & Validate</Typography>
          <Typography variant="caption" color="text.disabled">/</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: step === 'importing' ? 'primary.main' : 'text.disabled' }}>4. Import</Typography>
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* ── STEP 1: UPLOAD ────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                borderRadius: 2.5,
                p: 5,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: isDark ? 'rgba(37,99,235,0.04)' : 'rgba(37,99,235,0.02)',
                },
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleFileChange}
              />
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Drag and drop your CSV file here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to browse from your computer
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Only standard CSV format files are supported.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Download Template</Typography>
                <Typography variant="caption" color="text.secondary">Need a starter template? Download our pre-formatted CSV file.</Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                sx={{ borderRadius: 1.5 }}
              >
                Download
              </Button>
            </Box>
          </Box>
        )}

        {/* ── STEP 2: FIELD MAPPING ─────────────────────────────────────────── */}
        {step === 'mapping' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Map the columns of your CSV file to the system data fields. We've auto-mapped columns we recognized.
            </Alert>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Header Mapping: {fileName}
            </Typography>

            <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Destination Field</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>CSV Source Column</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schema.map((field) => {
                    const isRequired = field.required
                    const selectedHeader = columnMapping[field.key] || ''
                    return (
                      <TableRow key={field.key} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {field.label} {isRequired && <span style={{ color: theme.palette.error.main }}>*</span>}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                            {field.type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedHeader}
                              onChange={(e) => handleMappingChange(field.key, e.target.value)}
                              displayEmpty
                              sx={{ borderRadius: 1.5 }}
                            >
                              <MenuItem value="">
                                <em>Do not import / Ignore</em>
                              </MenuItem>
                              {headers.map((h) => (
                                <MenuItem key={h} value={h}>
                                  {h}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* ── STEP 3: PREVIEW & VALIDATION ──────────────────────────────────── */}
        {step === 'preview' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Dry-Run Verification Grid ({parsedRows.length} rows loaded)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Please review files for compliance. Rows highlighted in red have validation errors and will be skipped.
                </Typography>
              </Box>
              {totalErrors > 0 && (
                <Alert severity="warning" sx={{ py: 0.25, px: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {totalErrors} row(s) contain validation errors and cannot be imported.
                  </Typography>
                </Alert>
              )}
            </Box>

            <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5, maxHeight: 350, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 60 }} align="center">Status</TableCell>
                    {schema.map((field) => (
                      <TableCell key={field.key} sx={{ fontWeight: 700 }}>
                        {field.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.map((row, index) => {
                    const errors = validationErrors[index]
                    const hasError = errors && errors.length > 0
                    return (
                      <TableRow key={index} hover sx={{ bgcolor: hasError ? alpha(theme.palette.error.main, 0.05) : 'inherit' }}>
                        <TableCell align="center">
                          {hasError ? (
                            <Tooltip title={errors.join(' | ')} placement="top">
                              <ErrorIcon color="error" sx={{ fontSize: 18, cursor: 'help' }} />
                            </Tooltip>
                          ) : (
                            <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                          )}
                        </TableCell>
                        {schema.map((field) => {
                          const val = row[field.key]
                          let displayVal = val === null || val === undefined ? '—' : String(val)

                          // Option mappings
                          if (field.type === 'options' && field.options && val !== null) {
                            const opt = field.options.find((o) => o.value === val)
                            displayVal = opt ? opt.label : String(val)
                          }
                          // Boolean mapping
                          if (field.type === 'boolean') {
                            displayVal = val ? 'Yes' : 'No'
                          }

                          return (
                            <TableCell key={field.key}>
                              <Typography variant="body2" color={hasError && field.required && !val ? 'error.main' : 'text.primary'}>
                                {displayVal}
                              </Typography>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* ── STEP 4: IMPORTING PROGRESS ────────────────────────────────────── */}
        {step === 'importing' && (
          <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <CircularProgress size={48} thickness={4.5} />
            <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Uploading items to Dataverse...
              </Typography>
              <LinearProgress variant="determinate" value={(importProgress / importTotal) * 100} sx={{ height: 6, borderRadius: 3, mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Processed {importProgress} of {importTotal} records.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ── STEP 5: COMPLETED ─────────────────────────────────────────────── */}
        {step === 'complete' && resultSummary && (
          <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Import Completed Successfully!</Typography>
              <Typography variant="body2" color="text.secondary">
                Created <strong>{resultSummary.successCount}</strong> records. Failed: <strong>{resultSummary.failedCount}</strong>.
              </Typography>
            </Box>

            {resultSummary.errors.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, width: '100%', bgcolor: alpha(theme.palette.error.main, 0.02), borderColor: 'error.light', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WarningIcon sx={{ fontSize: 16 }} /> API Write Errors Summary
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: 'auto', textAlign: 'left' }}>
                  {resultSummary.errors.map((err, i) => (
                    <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontFamily: 'monospace' }}>
                      • {err}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        )}

      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        {step === 'upload' && (
          <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1.5 }}>Cancel</Button>
        )}

        {step === 'mapping' && (
          <>
            <Button
              variant="outlined"
              onClick={() => setStep('upload')}
              startIcon={<SettingsBackupRestoreIcon />}
              sx={{ borderRadius: 1.5 }}
            >
              Re-upload File
            </Button>
            <Button
              variant="contained"
              onClick={handleProceedToPreview}
              disabled={schema.filter(s => s.required).some(s => !columnMapping[s.key])}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5 }}
            >
              Map & Validate Columns
            </Button>
          </>
        )}

        {step === 'preview' && (
          <>
            <Button variant="outlined" onClick={() => setStep('mapping')} sx={{ borderRadius: 1.5 }}>Back to Mapping</Button>
            <Button
              variant="contained"
              onClick={handleStartImport}
              disabled={parsedRows.length === 0 || parsedRows.length === totalErrors}
              sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, borderRadius: 1.5 }}
            >
              Import {parsedRows.length - totalErrors} Valid Rows
            </Button>
          </>
        )}

        {step === 'complete' && (
          <Button variant="contained" onClick={onClose} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5 }}>
            Close Dialog
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
