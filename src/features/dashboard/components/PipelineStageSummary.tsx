import { useMemo } from 'react'
import { Box, Paper, Typography, Skeleton, Divider } from '@mui/material'
import type { InitiativeModel } from '@/types/dataverse'

const PIPELINE_STAGES: Record<number, { label: string; color: string }> = {
  1: { label: 'Under Review', color: '#f59e0b' },
  2: { label: 'Screening', color: '#0ea5e9' },
  0: { label: 'Approved', color: '#22c55e' },
  3: { label: 'Rejected', color: '#ef4444' },
}

interface PipelineStageSummaryProps {
  initiatives: InitiativeModel[]
  loading: boolean
}

export const PipelineStageSummary = ({ initiatives, loading }: PipelineStageSummaryProps) => {
  const pipelineStages = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const init of initiatives) {
      const stage = typeof init.pm_pipelinestatus === 'number' ? init.pm_pipelinestatus : Number(init.pm_pipelinestatus)
      if (!isNaN(stage)) counts[stage] = (counts[stage] ?? 0) + 1
    }
    return Object.entries(PIPELINE_STAGES).map(([key, info]) => ({
      key: Number(key),
      label: info.label,
      color: info.color,
      count: counts[Number(key)] ?? 0,
    }))
  }, [initiatives])

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Pipeline Overview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Initiative pipeline stage distribution.
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={180} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {pipelineStages.map((stage) => (
            <Box key={stage.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: stage.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                {stage.label}
              </Typography>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: `${stage.color}18`,
                  minWidth: 32,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: stage.color, fontSize: '0.85rem' }}
                >
                  {stage.count}
                </Typography>
              </Box>
            </Box>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
              {pipelineStages.reduce((s, st) => s + st.count, 0)}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  )
}

export default PipelineStageSummary
