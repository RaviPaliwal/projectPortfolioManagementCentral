import React, { useState } from 'react'
import {
  Box,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Avatar,
  Collapse,
  Tooltip,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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

interface TreeViewProps {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
  onItemClick?: (id: string, type: string, name: string) => void
}

const TreeItemRow: React.FC<{
  icon: React.ReactNode
  name: string
  ragStatus?: string
  budget: number
  allocatedBudget?: number
  level: number
  hasChildren: boolean
  expanded?: boolean
  onToggle?: () => void
  onClick?: () => void
}> = ({ icon, name, ragStatus, budget, allocatedBudget, level, hasChildren, expanded, onToggle, onClick }) => {
  const theme = useTheme()
  const ragColor = RAG_COLORS[ragStatus ?? ''] || theme.palette.divider

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      minHeight: 56,
      transition: 'background-color 0.15s',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
      pl: level * 3 + 1,
      pr: 2,
    }} onClick={onClick}>
      <Box sx={{ width: 36, display: 'flex', justifyContent: 'center', mr: 1 }}>
        {hasChildren ? (
          <Tooltip title={expanded ? 'Collapse section' : 'Expand section'}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle?.() }} sx={{ color: 'text.secondary' }}>
              {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        ) : (
          <Box sx={{ width: 36 }} />
        )}
      </Box>
      <Avatar
        sx={{
          width: 34, height: 34,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          color: 'text.secondary',
          mr: 1.5,
          fontSize: 18,
        }}
      >
        {icon}
      </Avatar>
      <Typography variant="body1" sx={{
        flex: 1,
        fontWeight: level === 0 ? 700 : level === 1 ? 600 : 500,
        fontSize: level === 0 ? '1.05rem' : '0.95rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 2, flexShrink: 0 }}>
        <Tooltip title={`Allotted budget: ${currencyFormatter.format(budget)}`}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary', minWidth: 100, textAlign: 'right', cursor: 'help' }}>
            {currencyFormatter.format(budget)}
          </Typography>
        </Tooltip>
        {allocatedBudget !== undefined && allocatedBudget > 0 && (
          <Tooltip title={`Allocated budget: ${currencyFormatter.format(allocatedBudget)} (sum of sub-items)`}>
            <Typography variant="body2" sx={{
              fontFamily: 'monospace',
              fontWeight: 600,
              fontSize: '0.78rem',
              color: allocatedBudget > budget ? 'error.main' : 'warning.main',
              bgcolor: alpha(allocatedBudget > budget ? '#ef4444' : '#f59e0b', 0.08),
              px: 1,
              py: 0.35,
              borderRadius: 0.75,
              whiteSpace: 'nowrap',
              cursor: 'help',
            }}>
              {currencyFormatter.format(allocatedBudget)} alloc
            </Typography>
          </Tooltip>
        )}
        <Tooltip title={`RAG: ${ragStatus === '0' ? 'Low' : ragStatus === '1' ? 'Medium' : ragStatus === '2' ? 'High' : 'Unknown'}`}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ragColor, boxShadow: `0 0 6px ${ragColor}`, flexShrink: 0, cursor: 'help' }} />
        </Tooltip>
      </Box>
    </Box>
  )
}

const TreeView: React.FC<TreeViewProps> = ({ portfolios, programmes, projects, onItemClick }) => {
  const theme = useTheme()
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(() => new Set(portfolios.map(p => p.pm_portfolioid!)))
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(() => new Set(programmes.map(p => p.pm_programmeid!)))

  const togglePortfolio = (id: string) => {
    setExpandedPortfolios(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleProgramme = (id: string) => {
    setExpandedProgrammes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

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
    <Box sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.5)}`, borderRadius: 2, overflow: 'hidden' }}>
      {portfolios.map(port => {
        const normalizedPortId = normalizeLookupId(port.pm_portfolioid)
        const portProgrammes = programmes.filter(pr => normalizeLookupId(pr._pm_portfolio_value) === normalizedPortId)
        const isPortExpanded = expandedPortfolios.has(port.pm_portfolioid!)

        return (
          <Box key={port.pm_portfolioid}>
            <TreeItemRow
              icon={<BusinessIcon sx={{ fontSize: 16 }} />}
              name={port.pm_portfolioname!}
              ragStatus={port.pm_ragstatus?.toString()}
              budget={port.pm_approvedbudgeteur ?? 0}
              allocatedBudget={portProgrammes.reduce((s, pr) => s + (pr.pm_budgeteur ?? 0), 0) || undefined}
              level={0}
              hasChildren={portProgrammes.length > 0}
              expanded={isPortExpanded}
              onToggle={() => togglePortfolio(port.pm_portfolioid!)}
              onClick={() => onItemClick?.(port.pm_portfolioid!, 'portfolio', port.pm_portfolioname!)}
            />
            <Collapse in={isPortExpanded}>
              {portProgrammes.map(prog => {
                const normalizedProgId = normalizeLookupId(prog.pm_programmeid)
                const progProjects = projects.filter(pj => normalizeLookupId(pj._pm_programme_value) === normalizedProgId)
                const isProgExpanded = expandedProgrammes.has(prog.pm_programmeid!)

                return (
                  <Box key={prog.pm_programmeid}>
                    <TreeItemRow
                      icon={<AccountTreeIcon sx={{ fontSize: 16 }} />}
                      name={prog.pm_programmename!}
                      ragStatus={prog.pm_ragstatus?.toString()}
                      budget={prog.pm_budgeteur ?? 0}
                      allocatedBudget={progProjects.reduce((s, pj) => s + (pj.pm_approvedbudgeteur ?? 0), 0) || undefined}
                      level={1}
                      hasChildren={progProjects.length > 0}
                      expanded={isProgExpanded}
                      onToggle={() => toggleProgramme(prog.pm_programmeid!)}
                      onClick={() => onItemClick?.(prog.pm_programmeid!, 'programme', prog.pm_programmename!)}
                    />
                    <Collapse in={isProgExpanded}>
                      {progProjects.map(proj => (
                        <TreeItemRow
                          key={proj.pm_projectid}
                          icon={<FolderIcon sx={{ fontSize: 16 }} />}
                          name={proj.pm_projectname!}
                          ragStatus={proj.pm_ragstatus?.toString()}
                          budget={proj.pm_approvedbudgeteur ?? 0}
                          level={2}
                          hasChildren={false}
                          onClick={() => onItemClick?.(proj.pm_projectid!, 'project', proj.pm_projectname!)}
                        />
                      ))}
                    </Collapse>
                  </Box>
                )
              })}
            </Collapse>
          </Box>
        )
      })}
    </Box>
  )
}

export default TreeView
