import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  Skeleton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Card,
  CardContent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import { createInitiative, fetchInitiatives, convertInitiativeToProject } from '../../services/dataverseService'
import type { InitiativeModel } from '../../models/dataverse'

const statusFilterConfig: Record<number, { label: string; color: 'success' | 'info' | 'warning' }> = {
  0: { label: 'Approved', color: 'success' },
  1: { label: 'Under Review', color: 'info' },
  2: { label: 'Deferred', color: 'warning' },
}

// Pipeline status badge for initiative cards
const pipelineStatusLabel = (status?: string | number): { label: string; color: 'success' | 'info' | 'warning' } => {
  const s = status?.toString()
  if (s === '0') return { label: 'Approved', color: 'success' }
  if (s === '1') return { label: 'Under Review', color: 'info' }
  if (s === '2') return { label: 'Deferred', color: 'warning' }
  return { label: 'Unknown', color: 'info' }
}

export default function PipelinePage() {
  const [initiatives, setInitiatives] = useState<InitiativeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newInitiative, setNewInitiative] = useState<Partial<InitiativeModel>>({ pm_name: '', pm_businesscase: '', pm_estimatedcost: 0 })
  const [showNewModal, setShowNewModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<number>(1) // 1 = UnderReview
  const [kpis, setKpis] = useState({ total: 0, pipelineValue: 0, avgPriority: 0 })
  const [isCreating, setIsCreating] = useState(false)

  async function load(status?: number) {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchInitiatives(status)
      setInitiatives(list)
      // KPIs: compute overall pipeline metrics (call all initiatives)
      const all = await fetchInitiatives()
      const pipelineValue = all.reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)
      const avgPriority = all.length ? Math.round((all.reduce((s, i) => s + ((i as any).pm_priorityscore ?? 0), 0) / all.length) * 10) / 10 : 0
      setKpis({ total: all.length, pipelineValue, avgPriority })
    } catch {
      setError('Unable to load pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleCreate = async () => {
    setError(null)
    if (!newInitiative.pm_name) {
      setError('Initiative name is required.')
      return
    }
    setIsCreating(true)
    try {
      await createInitiative({
        pm_initiativename: newInitiative.pm_name,
        pm_businesscasedescription: newInitiative.pm_businesscase,
        pm_estimatedcosteur: newInitiative.pm_estimatedcost,
      } as any)
      setNewInitiative({ pm_name: '', pm_businesscase: '', pm_estimatedcost: 0 })
      setShowNewModal(false)
      await load(statusFilter)
    } catch {
      setError('Unable to create initiative.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleConvert = async (initiative: InitiativeModel) => {
    try {
      const pid = await convertInitiativeToProject(initiative)
      if (pid) {
        await load(statusFilter)
        setError(null)
      } else {
        setError('Initiative conversion failed.')
      }
    } catch {
      setError('Initiative conversion error.')
    }
  }

  const kpiCards = [
    { title: 'Total Initiatives', value: kpis.total, icon: <TrendingUpIcon />, color: '#0ea5e9' },
    { title: 'Pipeline Value', value: `€${kpis.pipelineValue.toLocaleString()}`, icon: <CurrencyExchangeIcon />, color: '#22c55e' },
    { title: 'Avg Priority Score', value: kpis.avgPriority, icon: <PriorityHighIcon />, color: '#f59e0b' },
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Pipeline</Typography>
          <Typography variant="body2" color="text.secondary">Pre-project initiative pipeline with business case and estimated investment.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowNewModal(true)}>
          New Initiative
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {kpi.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {loading ? <Skeleton width={100} /> : kpi.value}
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

      {/* Filter & List */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Pipeline Initiatives</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {Object.entries(statusFilterConfig).map(([code, cfg]) => {
              const codeNum = Number(code)
              return (
                <Chip
                  key={code}
                  label={cfg.label}
                  color={statusFilter === codeNum ? cfg.color : 'default'}
                  variant={statusFilter === codeNum ? 'filled' : 'outlined'}
                  onClick={() => setStatusFilter(codeNum)}
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
              )
            })}
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Box>
        ) : initiatives.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {initiatives.map((initiative) => (
              <Paper
                key={initiative.pm_initiativeid}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {initiative.pm_name ?? 'Untitled initiative'}
                    </Typography>
                    {initiative.pm_portfolioname && (
                      <Typography variant="caption" color="text.secondary">
                        Portfolio: {initiative.pm_portfolioname}
                      </Typography>
                    )}
                  </Box>
                  {(() => {
                    const stat = pipelineStatusLabel(initiative.pm_pipelinestatus)
                    return <Chip label={stat.label} color={stat.color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  })()}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {initiative.pm_businesscase ?? 'Business case not provided.'}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 1.5 }}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Priority</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{(initiative as any).pm_priorityscore ?? '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Strategic</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{(initiative as any).pm_strategicalignmentscore ?? '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Est. Cost</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {initiative.pm_estimatedcost ? `€${initiative.pm_estimatedcost.toLocaleString()}` : 'TBC'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Est. Benefits</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {initiative.pm_estimatedbenefits ? `€${initiative.pm_estimatedbenefits.toLocaleString()}` : '—'}
                    </Typography>
                  </Grid>
                </Grid>

                {(initiative as any).pm_pipelinestatus === 0 && (
                  <Button variant="contained" size="small" onClick={() => handleConvert(initiative)}>
                    Convert to Project
                  </Button>
                )}
              </Paper>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            No initiatives found for this filter.
          </Typography>
        )}
      </Paper>

      {/* New Initiative Dialog */}
      <Dialog open={showNewModal} onClose={() => setShowNewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Initiative</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Submit a new idea to the pipeline for executive review.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Initiative name"
                value={newInitiative.pm_name ?? ''}
                onChange={(e) => setNewInitiative((prev) => ({ ...prev, pm_name: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Business case"
                value={newInitiative.pm_businesscase ?? ''}
                onChange={(e) => setNewInitiative((prev) => ({ ...prev, pm_businesscase: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Estimated cost (€)"
                value={newInitiative.pm_estimatedcost ?? 0}
                onChange={(e) => setNewInitiative((prev) => ({ ...prev, pm_estimatedcost: Number(e.target.value) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewModal(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={isCreating}>
            {isCreating ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
