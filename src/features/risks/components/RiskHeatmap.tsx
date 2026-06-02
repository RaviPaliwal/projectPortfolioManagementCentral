import { useMemo } from 'react'
import { Paper, Typography, Box, useTheme } from '@mui/material'
import Plot from 'react-plotly.js'
import type { RiskModel } from '@/types/dataverse'
import {
  probNumeric,
  impactNumeric,
  getScoreLabel,
} from '../constants'

interface RiskHeatmapProps {
  risks: RiskModel[]
}

export const RiskHeatmap = ({ risks }: RiskHeatmapProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const heatmapData = useMemo(() => {
    const probOrder = ['Likely (4)', 'Possible (3)', 'Unlikely (2)', 'Rare (1)']
    const impactOrder = ['Mod (1)', 'Maj (2)', 'Cat (3)']

    const grid: Record<string, { count: number; riskTitles: string[] }> = {}
    for (const r of risks) {
      const p = probNumeric(r.pm_inherentprobability)
      const i = impactNumeric(r.pm_inherentimpact)
      if (p > 0 && i > 0) {
        const key = `${p}x${i}`
        if (!grid[key]) grid[key] = { count: 0, riskTitles: [] }
        grid[key].count++
        if (r.pm_risktitle) grid[key].riskTitles.push(r.pm_risktitle)
      }
    }

    const z = probOrder.map((row) => {
      const prob = Number(row.match(/\((\d+)\)/)?.[1] ?? 0)
      return impactOrder.map((col) => {
        const impact = Number(col.match(/\((\d+)\)/)?.[1] ?? 0)
        return grid[`${prob}x${impact}`]?.count ?? 0
      })
    })

    const hovertext = probOrder.map((row) => {
      const prob = Number(row.match(/\((\d+)\)/)?.[1] ?? 0)
      return impactOrder.map((col) => {
        const impact = Number(col.match(/\((\d+)\)/)?.[1] ?? 0)
        const cell = grid[`${prob}x${impact}`]
        const score = prob * impact
        const severity = getScoreLabel(score)
        let h = `<b>Score: ${score} — ${severity}</b><br>`
        h += `Probability: ${row.split('(')[0].trim()}<br>`
        h += `Impact: ${col.split('(')[0].trim()}<br>`
        h += `<b>Risk Count: ${cell?.count ?? 0}</b><br>`
        if (cell?.riskTitles.length) {
          h += `<br><b>Risks in this cell:</b><br>`
          h += cell.riskTitles.slice(0, 3).map(t => `• ${t}`).join('<br>')
          if (cell.riskTitles.length > 3) h += `<br>… +${cell.riskTitles.length - 3} more`
        }
        return h
      })
    })

    return { x: impactOrder, y: probOrder, z, hovertext }
  }, [risks])

  return (
    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Inherent Risk Heatmap
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Probability × Impact matrix showing risk distribution. Cells are color-coded by severity; intensity reflects risk count.
      </Typography>
      <Box sx={{ height: 340 }}>
        <Plot
          data={[
            {
              z: heatmapData.z,
              x: heatmapData.x,
              y: heatmapData.y,
              hovertemplate: '%{y} × %{x}<br><b>Risks: %{z}</b><extra></extra>',
              type: 'heatmap',
              colorscale: [
                [0, '#dbeafe'],
                [0.33, '#22c55e'],
                [0.66, '#f59e0b'],
                [1, '#ef4444'],
              ],
              showscale: true,
              colorbar: {
                title: { text: 'Risk count' },
                titleside: 'right',
                tickfont: { size: 14, color: isDark ? '#cbd5e1' : '#475569' },
              },
            },
          ] as any}
          layout={{
            autosize: true,
            margin: { t: 30, r: 30, b: 60, l: 90 },
            xaxis: {
              title: { text: 'Impact →' },
              tickfont: { size: 11, color: isDark ? '#cbd5e1' : '#475569' },
              titlefont: { size: 12, color: isDark ? '#cbd5e1' : '#475569' },
            },
            yaxis: {
              title: { text: 'Probability →' },
              autorange: 'reversed',
              automargin: true,
              tickfont: { size: 11, color: isDark ? '#cbd5e1' : '#475569' },
              titlefont: { size: 12, color: isDark ? '#cbd5e1' : '#475569' },
            },
            annotations: heatmapData.z.flatMap((row, i) =>
              row.map((val, j) => ({
                x: j,
                y: i,
                xref: 'x',
                yref: 'y',
                text: val > 0 ? String(val) : '',
                showarrow: false,
                font: {
                  size: val > 0 ? 16 : 0,
                  color: val >= 5 ? '#ffffff' : isDark ? '#e2e8f0' : '#1e293b',
                },
                bgcolor: val > 0 ? 'transparent' : 'transparent',
                borderpad: 0,
                bordercolor: "transparent",
                borderwidth: 0,
              }))
            ),
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDark ? '#0f172a' : '#ffffff',
            font: { color: isDark ? '#cbd5e1' : '#475569', family: 'inherit' },
          } as any}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </Box>
    </Paper>
  )
}
