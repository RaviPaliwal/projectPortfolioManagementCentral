import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Grid,
  Typography,
  Button,
  Alert,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  IconButton,
  Switch
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DateRangeIcon from '@mui/icons-material/DateRange'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import UpcomingIcon from '@mui/icons-material/Upcoming'
import LoopIcon from '@mui/icons-material/Loop'
import AddCardIcon from '@mui/icons-material/AddCard'

import { PageHeader, Breadcrumbs } from '@/components/common'
import type { TabKey } from '@/components/layout/PrimaryShell'
import type { FinancialPeriodModel } from '@/types/dataverse'
import { fetchFinancialPeriods, seedFiscalPeriods } from '@/services'
import { formatDate } from '@/utils/formatters'
import { Pm_fiscalperiodsService } from '@/generated'

interface FiscalPeriodsPageProps {
  onNavigate: (tab: TabKey) => void
}

export default function FiscalPeriodsPage({ onNavigate }: FiscalPeriodsPageProps) {
  const theme = useTheme()
  const [fiscalPeriods, setFiscalPeriods] = useState<FinancialPeriodModel[]>([])
  const [fiscalPeriodsLoading, setFiscalPeriodsLoading] = useState(false)
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(new Date().getFullYear())
  const [selectedSeedYear, setSelectedSeedYear] = useState<number>(new Date().getFullYear())
  const [seedStartDate, setSeedStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`)
  const [seedingPeriods, setSeedingPeriods] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null)
  const [updatingPeriodId, setUpdatingPeriodId] = useState<string | null>(null)

  const handleToggleCurrentPeriod = async (periodId: string, currentVal?: boolean) => {
    if (currentVal) return // Prevent disabling the current period directly; they must select another period to make it current
    setUpdatingPeriodId(periodId)
    try {
      const selectedPeriod = fiscalPeriods.find(p => p.pm_fiscalperiodid === periodId)
      if (!selectedPeriod) return

      const targetYear = selectedPeriod.pm_fiscalyear
      const targetNumber = selectedPeriod.pm_periodnumber || 0

      // Get all loaded periods for this fiscal year
      const yearPeriods = fiscalPeriods.filter(p => p.pm_fiscalyear === targetYear)

      // Update all periods of this year to maintain correct closed/current states
      const updatePromises = yearPeriods.map(async (p) => {
        if (!p.pm_fiscalperiodid) return

        let shouldUpdate = false
        const updatePayload: Partial<FinancialPeriodModel> = {}

        // 1. Current status
        const isCurrent = p.pm_fiscalperiodid === periodId
        if (p.pm_iscurrentperiod !== isCurrent) {
          updatePayload.pm_iscurrentperiod = isCurrent
          shouldUpdate = true
        }

        // 2. Closed status for previous periods (all periods prior to targetNumber must be closed)
        const isPrior = (p.pm_periodnumber || 0) < targetNumber
        const expectedClosed = isPrior ? true : (isCurrent ? false : p.pm_isclosed)

        if (p.pm_isclosed !== expectedClosed) {
          updatePayload.pm_isclosed = expectedClosed
          shouldUpdate = true
        }

        if (shouldUpdate) {
          await Pm_fiscalperiodsService.update(p.pm_fiscalperiodid, updatePayload as any)
        }
      })

      await Promise.all(updatePromises)
      await loadFiscalPeriods()
    } catch (err) {
      console.error('[FiscalPeriodsPage] Failed to switch current period:', err)
    } finally {
      setUpdatingPeriodId(null)
    }
  }

  // Determine period status icon and text purely from database fields
  const getPeriodStatusElement = (period: FinancialPeriodModel) => {
    if (period.pm_iscurrentperiod) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
          <CheckCircleIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Active</Typography>
        </Box>
      )
    } else if (period.pm_isclosed) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <CancelIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Closed</Typography>
        </Box>
      )
    } else {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main' }}>
          <UpcomingIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Upcoming</Typography>
        </Box>
      )
    }
  }

  // Load fiscal periods
  const loadFiscalPeriods = async () => {
    setFiscalPeriodsLoading(true)
    try {
      const periods = await fetchFinancialPeriods()
      setFiscalPeriods(periods)
    } catch (err) {
      console.error('[FiscalPeriodsPage] Failed to fetch fiscal periods:', err)
    } finally {
      setFiscalPeriodsLoading(false)
    }
  }

  useEffect(() => {
    loadFiscalPeriods()
  }, [])

  const handleSeedPeriods = async () => {
    setSeedingPeriods(true)
    setSeedError(null)
    setSeedSuccess(null)
    try {
      const result = await seedFiscalPeriods(selectedSeedYear, seedStartDate)
      if (result) {
        setSeedSuccess(`Successfully seeded 13 fiscal periods for FY ${selectedSeedYear}.`)
        await loadFiscalPeriods()
      } else {
        setSeedError(`Failed to seed fiscal periods for FY ${selectedSeedYear}.`)
      }
    } catch (err: any) {
      setSeedError(err.message || 'An error occurred during seeding.')
    } finally {
      setSeedingPeriods(false)
    }
  }

  // Helper to format date strings cleanly
  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const datePart = dateStr.split('T')[0]
      const [year, month, day] = datePart.split('-')
      if (!year || !month || !day) return datePart
      return `${day}-${month}-${year}`
    } catch {
      return dateStr.split('T')[0]
    }
  }

  // Filter periods for display
  const yearPeriods = useMemo(() => {
    return fiscalPeriods
      .filter(p => p.pm_fiscalyear === selectedFiscalYear)
      .sort((a, b) => (a.pm_periodnumber || 0) - (b.pm_periodnumber || 0))
  }, [fiscalPeriods, selectedFiscalYear])

  const isConfigured = yearPeriods.length === 13

  return (
    <Box>
      <Breadcrumbs 
        items={[
          { label: 'System Configurations', path: 'configurations' },
          { label: 'Fiscal Periods' }
        ]} 
        onNavigate={(path) => onNavigate(path as TabKey)} 
      />

      <PageHeader 
        title="Fiscal Period Configurations" 
        subtitle="Manage and view the annual operational fiscal schedules used for budget mapping and timesheet tracking."
        actionElement={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => onNavigate('configurations')}
            sx={{ px: 2.5, fontWeight: 600 }}
          >
            Back to Configurations
          </Button>
        }
      />

      <Grid container spacing={3.5} sx={{ mt: 1.5 }}>
        {/* Left Section: List & Filter */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 1.5, 
              border: `1.5px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '16px' }}>
                Year-Wise Operational Periods
              </Typography>
              
              {/* Year Selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Select Year:</Typography>
                <select
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${theme.palette.divider}`,
                    background: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {Array.from(new Set([
                    new Date().getFullYear() - 2,
                    new Date().getFullYear() - 1,
                    new Date().getFullYear(),
                    new Date().getFullYear() + 1,
                    new Date().getFullYear() + 2,
                    ...fiscalPeriods.map(p => p.pm_fiscalyear).filter(Boolean) as number[]
                  ])).sort((a, b) => b - a).map(y => (
                    <option key={y} value={y}>FY {y}</option>
                  ))}
                </select>
              </Box>
            </Box>

            {fiscalPeriodsLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 6, alignItems: 'center' }}>
                <LoopIcon color="primary" sx={{ animation: 'spin 2s linear infinite', fontSize: 40 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Loading periods...</Typography>
              </Box>
            ) : (
              <Box>
                {!isConfigured && (
                  <Alert severity="warning" sx={{ mb: 3.5, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      13 Operational Periods Required
                    </Typography>
                    We found {yearPeriods.length} periods configured for FY {selectedFiscalYear}. The budgeting and resource allocation modules require exactly 13 operational periods (28 days each) per fiscal year. Use the seeding panel to correct this.
                  </Alert>
                )}

                {yearPeriods.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                    <Table size="medium">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Period No.</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Current Period</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {yearPeriods.map((period) => (
                          <TableRow key={period.pm_fiscalperiodid} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{period.pm_periodnumber}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{period.pm_periodname}</TableCell>
                            <TableCell>{formatDate(period.pm_startdate)}</TableCell>
                            <TableCell>{formatDate(period.pm_enddate)}</TableCell>
                            <TableCell>
                              {getPeriodStatusElement(period)}
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={!!period.pm_iscurrentperiod}
                                disabled={updatingPeriodId !== null}
                                onChange={() => handleToggleCurrentPeriod(period.pm_fiscalperiodid!, period.pm_iscurrentperiod)}
                                color="primary"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 1.5, bgcolor: 'background.default' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      No operational fiscal periods are configured for FY {selectedFiscalYear}.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Section: Seeding & Administration */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 1.5, 
              border: `1.5px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AddCardIcon color="primary" sx={{ fontSize: 24 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '16px' }}>
                Seed 13-Period Calendar
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.6 }}>
              Seed a standard 13-period annual operational schedule (28 days per period, 364 operational days). This matches strict budgeting requirements.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Fiscal Year
                </Typography>
                <select
                  value={selectedSeedYear}
                  onChange={(e) => {
                    const yr = Number(e.target.value)
                    setSelectedSeedYear(yr)
                    setSeedStartDate(`${yr}-01-01`)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1.5px solid ${theme.palette.divider}`,
                    background: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {[
                    new Date().getFullYear(),
                    new Date().getFullYear() + 1,
                    new Date().getFullYear() + 2
                  ].map(y => (
                    <option key={y} value={y}>FY {y}</option>
                  ))}
                </select>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Start Date
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={seedStartDate}
                  onChange={(e) => setSeedStartDate(e.target.value)}
                  slotProps={{
                    input: {
                      sx: { borderRadius: 2, height: 42, fontWeight: 600 }
                    }
                  }}
                />
              </Box>

              {seedError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {seedError}
                </Alert>
              )}

              {seedSuccess && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  {seedSuccess}
                </Alert>
              )}

              <Button
                variant="contained"
                fullWidth
                onClick={handleSeedPeriods}
                disabled={seedingPeriods}
                sx={{ mt: 1, py: 1.25, fontWeight: 700, borderRadius: 2, fontSize: '14px' }}
                startIcon={seedingPeriods ? <LoopIcon sx={{ animation: 'spin 2s linear infinite' }} /> : null}
              >
                {seedingPeriods ? 'Generating operational periods...' : `Seed FY ${selectedSeedYear} Periods`}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
