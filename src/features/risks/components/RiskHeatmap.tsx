import { useMemo, useState } from 'react'
import { Paper, Typography, Box, useTheme, Tooltip } from '@mui/material'
import type { RiskModel } from '@/types/dataverse'
import {
  probNumeric,
  impactNumeric,
  getScoreColor,
  getScoreLabel,
} from '../constants'

interface RiskHeatmapProps {
  risks: RiskModel[]
}

// ─── Axis Configuration ────────────────────────────────────────────────

const PROB_LEVELS = [
  { label: 'Rare', value: 1, key: '3' },
  { label: 'Unlikely', value: 2, key: '2' },
  { label: 'Possible', value: 3, key: '0' },
  { label: 'Likely', value: 4, key: '1' },
]

const IMPACT_LEVELS = [
  { label: 'Moderate', value: 1, key: '1' },
  { label: 'Major', value: 2, key: '0' },
  { label: 'Catastrophic', value: 3, key: '2' },
]

interface CellData {
  count: number
  score: number
  severity: string
  riskTitles: string[]
}

export const RiskHeatmap = ({ risks }: RiskHeatmapProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  // ── Build the grid ──────────────────────────────────────────────────
  const grid = useMemo(() => {
    const cells: Record<string, CellData> = {}
    for (const r of risks) {
      const p = probNumeric(r.pm_inherentprobability)
      const i = impactNumeric(r.pm_inherentimpact)
      if (p > 0 && i > 0) {
        const key = `${p}x${i}`
        if (!cells[key]) {
          cells[key] = {
            count: 0,
            score: p * i,
            severity: getScoreLabel(p * i),
            riskTitles: [],
          }
        }
        cells[key].count++
        if (r.pm_risktitle) cells[key].riskTitles.push(r.pm_risktitle)
      }
    }
    return cells
  }, [risks])

  const getCell = (probVal: number, impactVal: number): CellData => {
    const key = `${probVal}x${impactVal}`
    return grid[key] ?? { count: 0, score: probVal * impactVal, severity: getScoreLabel(probVal * impactVal), riskTitles: [] }
  }

  // ── Color helpers ───────────────────────────────────────────────────
  const getCellBg = (cell: CellData, isHovered: boolean): string => {
    if (cell.count === 0) return isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'
    const baseColor = getScoreColor(cell.score)
    // Intensity based on count (capped at 5)
    const intensity = Math.min(cell.count / 5, 1)
    const alpha = isHovered ? 0.85 : 0.4 + intensity * 0.45
    // Parse hex to rgba
    const r = parseInt(baseColor.slice(1, 3), 16)
    const g = parseInt(baseColor.slice(3, 5), 16)
    const b = parseInt(baseColor.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const getTextColor = (cell: CellData): string => {
    if (cell.count === 0) return isDark ? '#475569' : '#94a3b8'
    // Use white text for high scores, dark for low
    if (cell.score >= 8 || cell.count >= 4) return '#ffffff'
    return isDark ? '#e2e8f0' : '#0f172a'
  }

  const maxCount = useMemo(() => Math.max(...Object.values(grid).map(c => c.count), 1), [grid])

  // ── Legend items ────────────────────────────────────────────────────
  const legendItems = [
    { label: 'Low (1-3)', color: '#22c55e' },
    { label: 'Medium (4-7)', color: '#f59e0b' },
    { label: 'High (8-12)', color: '#ef4444' },
  ]

  return (
    <Paper sx={{ p: 3, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Inherent Risk Heatmap
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Probability × Impact matrix showing risk distribution. Cells are color-coded by severity; intensity reflects risk count.
      </Typography>

      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        {/* ── Header row (Impact columns) ──────────────────────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 320 }}>
          {/* Corner + Impact label row */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            {/* Corner spacer */}
            <Box sx={{ width: 100, minWidth: 100, pr: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.65rem', letterSpacing: 0.5 }}>
                Probability ↓
              </Typography>
            </Box>
            {/* Impact column headers */}
            <Box sx={{ flex: 1, display: 'flex' }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Moderate</Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Major</Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Catastrophic</Typography>
              </Box>
            </Box>
            {/* Legend spacer */}
            <Box sx={{ width: 80, pl: 2, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6rem' }}>
                Impact →
              </Typography>
            </Box>
          </Box>

          {/* ── Data rows ──────────────────────────────────────── */}
          {PROB_LEVELS.map((prob, rowIdx) => (
            <Box key={prob.key} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              {/* Row label */}
              <Box sx={{ width: 100, minWidth: 100, pr: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', color: isDark ? '#cbd5e1' : '#334155' }}>
                  {prob.label}
                </Typography>
              </Box>

              {/* Cells */}
              <Box sx={{ flex: 1, display: 'flex', gap: 0.5 }}>
                {IMPACT_LEVELS.map((impact, colIdx) => {
                  const cell = getCell(prob.value, impact.value)
                  const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx
                  const bg = getCellBg(cell, isHovered)
                  const textColor = getTextColor(cell)
                  const score = cell.count > 0 ? cell.score : prob.value * impact.value

                  return (
                    <Tooltip
                      key={impact.key}
                      title={
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                            Score: {score} — {getScoreLabel(score)}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Probability: {prob.label} × Impact: {impact.label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 0.5 }}>
                            Risk Count: {cell.count}
                          </Typography>
                          {cell.riskTitles.length > 0 && (
                            <Box sx={{ mt: 0.5, borderTop: '1px solid rgba(255,255,255,0.2)', pt: 0.5 }}>
                              {cell.riskTitles.slice(0, 4).map((t, i) => (
                                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.6rem' }}>
                                  • {t}
                                </Typography>
                              ))}
                              {cell.riskTitles.length > 4 && (
                                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', opacity: 0.7, mt: 0.25 }}>
                                  +{cell.riskTitles.length - 4} more
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                      arrow
                      placement="top"
                      enterDelay={200}
                    >
                      <Box
                        onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                        onMouseLeave={() => setHoveredCell(null)}
                        sx={{
                          flex: 1,
                          height: 52,
                          borderRadius: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: bg,
                          cursor: cell.count > 0 ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isHovered ? `0 4px 12px rgba(0,0,0,0.15)` : 'none',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          position: 'relative',
                          overflow: 'hidden',
                          '&::after': cell.count > 0 && maxCount > 0 ? {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            bgcolor: getScoreColor(cell.score),
                            opacity: 0.6,
                            transition: 'opacity 0.15s',
                          } : {},
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            fontSize: cell.count > 0 ? '1.05rem' : '0.75rem',
                            lineHeight: 1,
                            color: textColor,
                            transition: 'color 0.15s',
                          }}
                        >
                          {cell.count > 0 ? cell.count : '—'}
                        </Typography>
                        {cell.count > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.55rem',
                              lineHeight: 1.2,
                              mt: 0.25,
                              color: textColor,
                              opacity: 0.75,
                            }}
                          >
                            {cell.severity}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  )
                })}
              </Box>

              {/* Severity score label for the row */}
              <Box sx={{ width: 80, pl: 2, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: isDark ? '#64748b' : '#94a3b8' }}>
                  {IMPACT_LEVELS.map((impact, i) => {
                    const cell = getCell(prob.value, impact.value)
                    return cell.score > 0 ? `${prob.value * impact.value}` : ''
                  }).filter(Boolean).join(' / ')}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
          Severity:
        </Typography>
        {legendItems.map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: item.color, opacity: 0.7 }} />
            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#475569' }}>
              {item.label}
            </Typography>
          </Box>
        ))}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
          Hover cells for details
        </Typography>
      </Box>
    </Paper>
  )
}
