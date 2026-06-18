import { useMemo } from 'react'
import { Box, Paper, Typography, Skeleton, Divider } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import type { InitiativeModel } from '@/types/dataverse'

const PIPELINE_STAGES: Record<number, { label: string; color: string }> = {
  1: { label: 'Under Review', color: 'warning.main' },
  2: { label: 'Deferred', color: 'primary.main' },
  0: { label: 'Approved', color: 'success.main' },
  3: { label: 'Rejected', color: 'error.main' },
  4: { label: 'Converted', color: 'secondary.main' },
}

interface PipelineStageSummaryProps {
  initiatives: InitiativeModel[]
  loading: boolean
  sx?: SxProps<Theme>
}

export const PipelineStageSummary = ({ initiatives, loading, sx }: PipelineStageSummaryProps) => {
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
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 12px 20px rgba(0,0,0,0.5)'
            : '0 8px 16px rgba(99,102,241,0.06)',
        },
        ...sx
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        Pipeline Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Initiative pipeline stage distribution.
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" sx={{ flexGrow: 1, minHeight: 180 }} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
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
                    borderRadius: 1.5,
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
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
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
