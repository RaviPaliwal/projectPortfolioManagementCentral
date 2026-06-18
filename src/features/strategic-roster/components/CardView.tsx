import React from 'react'
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import type { PortfolioModel, ProgrammeModel } from '@/types/dataverse'
import { currencyFormatter } from '@/utils/formatters'
import { normalizeLookupId } from '@/services'

const RAG_COLORS: Record<string, string> = {
  '0': '#22c55e',
  '1': '#f59e0b',
  '2': '#ef4444',
}

const RAG_LABELS: Record<string, string> = {
  '0': 'Green',
  '1': 'Amber',
  '2': 'Red',
}

interface CardViewProps {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: any[]
  onItemClick?: (id: string, type: string, name: string) => void
}

const RagDot: React.FC<{ status?: string }> = ({ status }) => {
  const color = RAG_COLORS[status ?? ''] || '#94a3b8'
  const label = RAG_LABELS[status ?? ''] || 'Unknown'
  return (
    <Tooltip title={`Status: ${label}`}>
      <Box
        sx={{
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: color, flexShrink: 0, cursor: 'help',
        }}
      />
    </Tooltip>
  )
}

const CardView: React.FC<CardViewProps> = ({ portfolios, programmes, projects, onItemClick }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (portfolios.length === 0) {
    return (
      <Box sx={{ p: 8, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
          No portfolios found.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 2.5, p: 3 }}>
      {portfolios.map(port => {
        const normalizedPortId = normalizeLookupId(port.pm_portfolioid)
        const portProgrammes = programmes.filter(pr =>
          normalizeLookupId(pr._pm_portfolio_value) === normalizedPortId
        )
        const totalBudget = port.pm_approvedbudgeteur ?? 0
        const totalActual = port.pm_actualspendeur ?? 0
        const spendPct = totalBudget > 0 ? Math.min(100, (totalActual / totalBudget) * 100) : 0

        return (
          <Paper
            key={port.pm_portfolioid}
            elevation={0}
            variant="outlined"
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              transition: 'all 0.2s',
              cursor: onItemClick ? 'pointer' : 'default',
              '&:hover': { borderColor: 'primary.main', boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}` },
            }}
            onClick={() => onItemClick?.(port.pm_portfolioid!, 'portfolio', port.pm_portfolioname!)}
          >
            {/* Portfolio Header */}
            <Box sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BusinessIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {port.pm_portfolioname}
                  </Typography>
                  <RagDot status={port.pm_ragstatus?.toString()} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {currencyFormatter.format(totalBudget)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    · {portProgrammes.length} programme{portProgrammes.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                {/* Budget utilization bar */}
                <Box sx={{ mt: 1, width: '100%', height: 3, bgcolor: alpha(theme.palette.divider, 0.6), borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{
                    width: `${spendPct}%`, height: '100%',
                    bgcolor: spendPct > 95 ? 'error.main' : spendPct > 80 ? 'warning.main' : 'success.main',
                    borderRadius: 2, transition: 'width 0.3s',
                  }} />
                </Box>
              </Box>
            </Box>

            {/* Programmes */}
            <Box sx={{ px: 2.5, pb: 2, maxHeight: 320, overflowY: 'auto' }}>
              {portProgrammes.length === 0 ? (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 1.5 }}>
                  No programmes linked
                </Typography>
              ) : (
                portProgrammes.map(prog => {
                  const normalizedProgId = normalizeLookupId(prog.pm_programmeid)
                  const progProjectCount = projects.filter(pj =>
                    normalizeLookupId(pj._pm_programme_value) === normalizedProgId
                  ).length

                  return (
                    <Paper
                      key={prog.pm_programmeid}
                      variant="outlined"
                      sx={{
                        p: 1.5, mb: 1, borderRadius: 2,
                        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.5) : alpha(theme.palette.grey[50], 0.5),
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        cursor: onItemClick ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.04) },
                        '&:last-child': { mb: 0 },
                      }}
                      onClick={(e) => { e.stopPropagation(); onItemClick?.(prog.pm_programmeid!, 'programme', prog.pm_programmename!) }}
                    >
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.secondary.main, 0.1),
                        color: 'secondary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <AccountTreeIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prog.pm_programmename}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                          <RagDot status={prog.pm_ragstatus?.toString()} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {currencyFormatter.format(prog.pm_budgeteur ?? 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            · {progProjectCount} project{progProjectCount !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  )
                })
              )}
            </Box>
          </Paper>
        )
      })}
    </Box>
  )
}

export default CardView
