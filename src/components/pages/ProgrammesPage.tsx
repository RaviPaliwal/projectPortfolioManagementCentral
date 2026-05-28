import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { fetchPortfolioHierarchy } from '../../services/dataverseService'
import { StatusChip } from '../common'
import type { ProgrammeModel } from '../../models/dataverse'

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const hierarchy = await fetchPortfolioHierarchy()
        if (isMounted) setProgrammes(hierarchy.programmes)
      } catch {
        if (isMounted) setError('Unable to load programmes.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const programmeGroups = useMemo(() => {
    return programmes.reduce<Record<string, ProgrammeModel[]>>((acc, programme) => {
      const key = programme.pm_portfolioname ?? 'No portfolio'
      acc[key] = acc[key] ?? []
      acc[key].push(programme)
      return acc
    }, {})
  }, [programmes])

  const totalProgrammes = programmes.length
  const portfolioCount = Object.keys(programmeGroups).length

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Programmes</Typography>
        <Typography variant="body2" color="text.secondary">Programme-level view, grouped by portfolio and annotated with phase / RAG status.</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary KPIs */}
      {!loading && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[
            { title: 'Total Programmes', value: totalProgrammes, icon: <AccountTreeIcon />, color: '#0ea5e9' },
            { title: 'Portfolios', value: portfolioCount, icon: <FolderOpenIcon />, color: '#22c55e' },
          ].map((kpi, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
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
            </Grid>
          ))}
        </Grid>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(programmeGroups).map(([portfolioName, programmesInPortfolio]) => (
            <Paper key={portfolioName} sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                {portfolioName}
              </Typography>
              <Grid container spacing={2}>
                {programmesInPortfolio.map((programme) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={programme.pm_programmeid}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'secondary.main', boxShadow: 1 },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {programme.pm_programmename ?? 'Untitled programme'}
                        </Typography>
                        <StatusChip status={programme.pm_ragstatus} type="rag" />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <StatusChip status={programme.pm_programmephase} type="prog_phase" />
                        <Chip
                          label={programme.pm_startdate ?? 'No start date'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {programme.pm_portfolioname ?? '—'}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}
