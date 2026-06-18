import React from 'react'
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderIcon from '@mui/icons-material/Folder'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
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
  projects: ProjectModel[]
  onItemClick?: (id: string, type: string, name: string) => void
}

const RagBadge: React.FC<{ status?: string; size?: 'small' | 'medium' }> = ({ status, size = 'small' }) => {
  const color = RAG_COLORS[status ?? ''] || '#94a3b8'
  const label = RAG_LABELS[status ?? ''] || 'Unknown'
  return (
    <Tooltip title={`RAG: ${label}`}>
      <Box
        sx={{
          width: size === 'small' ? 8 : 10,
          height: size === 'small' ? 8 : 10,
          borderRadius: '50%',
          bgcolor: color,
          boxShadow: `0 0 6px ${alpha(color, 0.5)}`,
          flexShrink: 0,
          cursor: 'help',
        }}
      />
    </Tooltip>
  )
}

const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = pct > 95 ? 'error.main' : pct > 80 ? 'warning.main' : 'success.main'
  return (
    <Tooltip title={`Spend: ${pct.toFixed(0)}% (${currencyFormatter.format(value)} of ${currencyFormatter.format(max)})`}>
      <Box sx={{ width: '100%', height: 4, bgcolor: 'divider', borderRadius: 2, overflow: 'hidden', mt: 0.5, cursor: 'help' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </Box>
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
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 3, p: 3 }}>
      {portfolios.map(port => {
        const normalizedPortId = normalizeLookupId(port.pm_portfolioid)
        const portProgrammes = programmes.filter(pr =>
          normalizeLookupId(pr._pm_portfolio_value) === normalizedPortId
        )

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
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                <BusinessIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{port.pm_portfolioname}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                  <RagBadge status={port.pm_ragstatus?.toString()} />
                  <Tooltip title="Allotted budget">
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontFamily: 'monospace', cursor: 'help' }}>
                      A: {currencyFormatter.format(port.pm_approvedbudgeteur ?? 0)}
                    </Typography>
                  </Tooltip>
                  {(() => {
                    const allocated = portProgrammes.reduce((s, pr) => s + (pr.pm_budgeteur ?? 0), 0)
                    if (!allocated) return null
                    return (
                      <Tooltip title={`Allocated budget: ${currencyFormatter.format(allocated)} (sum of programme budgets)`}>
                        <Typography variant="caption" color={allocated > (port.pm_approvedbudgeteur || 0) ? 'error.main' : 'warning.main'} sx={{ fontWeight: 600, fontFamily: 'monospace', bgcolor: alpha(allocated > (port.pm_approvedbudgeteur || 0) ? '#ef4444' : '#f59e0b', 0.08), px: 0.75, py: 0.25, borderRadius: 0.75, cursor: 'help' }}>
                          Al: {currencyFormatter.format(allocated)}
                        </Typography>
                      </Tooltip>
                    )
                  })()}
                  <Tooltip title={`${portProgrammes.length} programme${portProgrammes.length !== 1 ? 's' : ''} under this portfolio`}>
                    <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                      {portProgrammes.length} prog{portProgrammes.length !== 1 ? 's' : ''}
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>
            </Box>

            {/* Programmes List */}
            <Box sx={{ p: 2 }}>
              {portProgrammes.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
                  No programmes linked
                </Typography>
              )}                {portProgrammes.map(prog => {
                const normalizedProgId = normalizeLookupId(prog.pm_programmeid)
                const progProjects = projects.filter(pj =>
                  normalizeLookupId(pj._pm_programme_value) === normalizedProgId
                )

                return (
                  <Box key={prog.pm_programmeid} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.5) : alpha(theme.palette.grey[50], 0.5),
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        cursor: onItemClick ? 'pointer' : 'default',
                        '&:hover': { borderColor: 'secondary.main' },
                      }}
                      onClick={(e) => { e.stopPropagation(); onItemClick?.(prog.pm_programmeid!, 'programme', prog.pm_programmename!) }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AccountTreeIcon sx={{ fontSize: 18, color: 'secondary.main', opacity: 0.7 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                            {prog.pm_programmename}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <RagBadge status={prog.pm_ragstatus?.toString()} />
                            <Tooltip title="Allotted budget">
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontFamily: 'monospace', cursor: 'help' }}>
                                A: {currencyFormatter.format(prog.pm_budgeteur ?? 0)}
                              </Typography>
                            </Tooltip>
                            {(() => {
                              const allocated = progProjects.reduce((s, pj) => s + (pj.pm_approvedbudgeteur ?? 0), 0)
                              if (!allocated) return null
                              return (
                                <Tooltip title={`Allocated budget: ${currencyFormatter.format(allocated)} (sum of project budgets)`}>
                                  <Typography variant="caption" color={allocated > (prog.pm_budgeteur || 0) ? 'error.main' : 'warning.main'} sx={{ fontWeight: 600, fontFamily: 'monospace', bgcolor: alpha(allocated > (prog.pm_budgeteur || 0) ? '#ef4444' : '#f59e0b', 0.08), px: 0.75, py: 0.25, borderRadius: 0.75, cursor: 'help' }}>
                                    Al: {currencyFormatter.format(allocated)}
                                  </Typography>
                                </Tooltip>
                              )
                            })()}
                            <Tooltip title={`${progProjects.length} project${progProjects.length !== 1 ? 's' : ''} under this programme`}>
                              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                                {progProjects.length} proj{progProjects.length !== 1 ? 's' : ''}
                              </Typography>
                            </Tooltip>
                          </Box>
                        </Box>
                        <ProgressBar value={prog.pm_actualspendeur ?? 0} max={prog.pm_budgeteur ?? 0} />
                      </Box>

                      {/* Nested Projects */}
                      {progProjects.length > 0 && (
                        <Box sx={{ mt: 1, ml: 3.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {progProjects.map(proj => (
                            <Box
                              key={proj.pm_projectid}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1,
                                borderRadius: 1, cursor: onItemClick ? 'pointer' : 'default',
                                '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.06) },
                              }}
                              onClick={(e) => { e.stopPropagation(); onItemClick?.(proj.pm_projectid!, 'project', proj.pm_projectname!) }}
                            >
                              <Tooltip title="Project">
                              <FolderIcon sx={{ fontSize: 14, color: 'info.main', opacity: 0.6, cursor: 'help' }} />
                            </Tooltip>
                              <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                                {proj.pm_projectname}
                              </Typography>
                              <RagBadge status={proj.pm_ragstatus?.toString()} size="small" />
                              <Tooltip title="Project budget">
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', cursor: 'help' }}>
                                  {currencyFormatter.format(proj.pm_approvedbudgeteur ?? 0)}
                                </Typography>
                              </Tooltip>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Box>
                )
              })}
            </Box>
          </Paper>
        )
      })}
    </Box>
  )
}

export default CardView
