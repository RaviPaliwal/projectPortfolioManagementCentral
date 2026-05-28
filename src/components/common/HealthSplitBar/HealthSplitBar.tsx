import { Box, Typography, useTheme } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import { fontSizes } from '../../../styles'

export interface HealthSplitBarProps {
  green: number
  amber: number
  red: number
  /** Optional compact mode for embedding in tables or tight spaces */
  compact?: boolean
  /** Additional MUI Box sx styles */
  sx?: Record<string, any>
}

export const HealthSplitBar: React.FC<HealthSplitBarProps> = ({ green, amber, red, compact = false, sx }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const total = green + amber + red || 1
  const gPct = ((green / total) * 100).toFixed(0)
  const aPct = ((amber / total) * 100).toFixed(0)
  const rPct = ((red / total) * 100).toFixed(0)

  const barSegments = [
    { value: (green / total) * 100, color: '#22c55e' },
    { value: (amber / total) * 100, color: '#f59e0b' },
    { value: (red / total) * 100, color: '#ef4444' },
  ]

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 13, color: '#22c55e' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#22c55e', fontSize: fontSizes.xs }}>{green}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <WarningAmberIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#f59e0b', fontSize: fontSizes.xs }}>{amber}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ErrorIcon sx={{ fontSize: 13, color: '#ef4444' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#ef4444', fontSize: fontSizes.xs }}>{red}</Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            bgcolor: isDark ? '#334155' : '#e2e8f0',
            minWidth: 60,
          }}
        >
          {barSegments.map((seg, i) => (
            <Box
              key={i}
              sx={{
                width: `${seg.value}%`,
                bgcolor: seg.color,
                transition: 'width 0.6s ease',
              }}
            />
          ))}
        </Box>
      </Box>
    )
  }

  const metricBlocks = [
    {
      label: 'Green',
      count: green,
      pct: gPct,
      color: '#22c55e',
      bg: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
      border: isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.15)',
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Amber',
      count: amber,
      pct: aPct,
      color: '#f59e0b',
      bg: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
      border: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)',
      icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Red',
      count: red,
      pct: rPct,
      color: '#ef4444',
      bg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
      border: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)',
      icon: <ErrorIcon sx={{ fontSize: 20 }} />,
    },
  ]

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        bgcolor: isDark ? '#0f172a' : '#ffffff',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.06)',
        },
        ...sx,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)',
            color: '#22c55e',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: fontSizes.smMd }}>
          Overall Health
        </Typography>
        <Typography
          variant="caption"
          sx={{
            ml: 'auto',
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: fontSizes.xs,
          }}
        >
          {total} {total === 1 ? 'item' : 'items'}
        </Typography>
      </Box>

      {/* Metric blocks */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
          }}
        >
          {metricBlocks.map((block) => (
            <Box
              key={block.label}
              sx={{
                borderRadius: 1.5,
                bgcolor: block.bg,
                border: `1px solid ${block.border}`,
                p: 1.5,
                textAlign: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 2px 8px ${block.color}22`,
                },
              }}
            >
              <Box sx={{ color: block.color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>
                {block.icon}
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontSize: fontSizes['2xl'],
                  color: block.color,
                  lineHeight: 1.2,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {block.count}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: block.color,
                  fontSize: fontSizes.xs,
                  opacity: 0.85,
                }}
              >
                {block.pct}%
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Segmented bar */}
      <Box sx={{ px: 2.5, pb: 2.25 }}>
        <Box
          sx={{
            width: '100%',
            height: 10,
            borderRadius: 5,
            overflow: 'hidden',
            display: 'flex',
            bgcolor: isDark ? '#1e293b' : '#f1f5f9',
            boxShadow: `inset 0 1px 2px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          {barSegments.map((seg, i) => (
            <Box
              key={i}
              sx={{
                width: `${seg.value}%`,
                bgcolor: seg.color,
                transition: 'width 0.6s ease',
                '&:first-of-type': { borderRadius: '5px 0 0 5px' },
                '&:last-of-type': { borderRadius: '0 5px 5px 0' },
              }}
            />
          ))}
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          {metricBlocks.map((block) => (
            <Box key={block.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: block.color }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: fontSizes.xs,
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {block.count} {block.label.toLowerCase()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default HealthSplitBar
