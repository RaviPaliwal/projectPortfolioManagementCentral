import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Chip,
  Card,
  CardContent,
  useTheme,
} from '@mui/material'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import FlagIcon from '@mui/icons-material/Flag'
import { fetchPortfolioHierarchy } from '../../services/dataverseService'
import { StatusChip } from '../common'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function PortfoliosPage() {
  const theme = useTheme()
  const [hierarchy, setHierarchy] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] }>({ portfolios: [], programmes: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const data = await fetchPortfolioHierarchy()
        if (isMounted) setHierarchy(data)
      } catch {
        if (isMounted) setError('Unable to load portfolio hierarchy.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const programmesByPortfolio = useMemo(() => {
    const map: Record<string, ProgrammeModel[]> = {}
    for (const prog of hierarchy.programmes) {
      const key = prog._pm_portfolio_value ?? 'orphan'
      if (!map[key]) map[key] = []
      map[key].push(prog)
    }
    return map
  }, [hierarchy.programmes])

  const projectsByProgramme = useMemo(() => {
    const map: Record<string, ProjectModel[]> = {}
    for (const proj of hierarchy.projects) {
      const key = proj._pm_programme_value ?? 'orphan'
      if (!map[key]) map[key] = []
      map[key].push(proj)
    }
    return map
  }, [hierarchy.projects])

  // Compute portfolio-level metrics
  const portfolioMetrics = useMemo(() => {
    const totalBudget = hierarchy.portfolios.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)
    const totalSpend = hierarchy.portfolios.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0)
    return { totalBudget, totalSpend, portfolioCount: hierarchy.portfolios.length, programmeCount: hierarchy.programmes.length, projectCount: hierarchy.projects.length }
  }, [hierarchy])

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Portfolio Hierarchy</Typography>
        <Typography variant="body2" color="text.secondary">Browse portfolios and the programmes / projects that belong to them.</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary KPIs — single row */}
      {!loading && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {[
            { title: 'Portfolios', value: portfolioMetrics.portfolioCount, icon: <AccountTreeIcon />, color: '#0ea5e9' },
            { title: 'Programmes', value: portfolioMetrics.programmeCount, icon: <FolderOpenIcon />, color: '#22c55e' },
            { title: 'Projects', value: portfolioMetrics.projectCount, icon: <FlagIcon />, color: '#8b5cf6' },
            { title: 'Total Budget', value: currencyFormatter.format(portfolioMetrics.totalBudget), icon: <AccountBalanceWalletIcon />, color: '#22c55e' },
            { title: 'Total Spend', value: currencyFormatter.format(portfolioMetrics.totalSpend), icon: <TrendingDownIcon />, color: '#f59e0b' },
          ].map((kpi, idx) => (
            <Box key={idx} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 0' } }}>
              <Card sx={{ position: 'relative', overflow: 'visible' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                        {kpi.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {kpi.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${kpi.color}15`,
                        color: kpi.color,
                      }}
                    >
                      {kpi.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={200} />)}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hierarchy.portfolios.map((portfolio) => {
            const progList = programmesByPortfolio[portfolio.pm_portfolioid ?? ''] ?? []
            const progProjectCount = progList.reduce((s, prog) => s + (projectsByProgramme[prog.pm_programmeid ?? ''] ?? []).length, 0)

            return (
              <Paper key={portfolio.pm_portfolioid} sx={{ overflow: 'hidden' }}>
                {/* Portfolio header */}
                <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{portfolio.pm_portfolioname ?? 'Unnamed portfolio'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {portfolio.pm_startdate ?? 'No start date'} → {portfolio.pm_enddate ?? 'No end date'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {portfolio.pm_approvedbudgeteur !== undefined && (
                        <Typography variant="caption" color="text.secondary">Budget: {currencyFormatter.format(portfolio.pm_approvedbudgeteur)}</Typography>
                      )}
                      {portfolio.pm_actualspendeur !== undefined && (
                        <Typography variant="caption" color="text.secondary">Spend: {currencyFormatter.format(portfolio.pm_actualspendeur)}</Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <StatusChip status={portfolio.pm_ragstatus} type="rag" />
                    <Chip label={`${progList.length} programmes · ${progProjectCount} projects`} size="small" variant="outlined" />
                  </Box>
                </Box>

                {/* Programmes */}
                {progList.length > 0 && (
                  <Box sx={{ px: 2.5, pb: 2.5 }}>
                    {progList.map((programme) => {
                      const projectList = projectsByProgramme[programme.pm_programmeid ?? ''] ?? []
                      return (
                        <Accordion key={programme.pm_programmeid} sx={{ mb: 1, '&:before': { display: 'none' } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{programme.pm_programmename ?? 'Untitled programme'}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <StatusChip status={programme.pm_programmephase} type="prog_phase" />
                                <StatusChip status={programme.pm_ragstatus} type="rag" />
                                <Chip label={`${projectList.length} projects`} size="small" variant="outlined" />
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {projectList.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {projectList.map((project) => (
                                  <Box
                                    key={project.pm_projectid}
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      p: 1.5,
                                      bgcolor: theme.palette.action.hover,
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_projectname}</Typography>
                                      <Typography variant="caption" color="text.secondary">{project.pm_projectcode ?? '—'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                                      <StatusChip status={project.pm_projectphase} type="phase" />
                                      <StatusChip status={project.pm_ragstatus} type="rag" />
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No projects in this programme.</Typography>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
                  </Box>
                )}
              </Paper>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
