import React, { useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import FolderIcon from '@mui/icons-material/Folder'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import { currencyFormatter } from '@/utils/formatters'
import { normalizeLookupId } from '@/services'

const RAG_LABELS: Record<string, string> = {
  '0': 'Low',
  '1': 'Medium',
  '2': 'High',
}

const RAG_COLORS: Record<string, string> = {
  '0': '#22c55e',
  '1': '#f59e0b',
  '2': '#ef4444',
}

interface FlatRow {
  id: string
  name: string
  type: 'Portfolio' | 'Programme' | 'Project'
  parentName?: string
  ragStatus?: string
  allottedBudget: number
  allocatedBudget: number
  actual: number
  startDate?: string
  endDate?: string
  level: number
}

interface TableViewProps {
  portfolios: PortfolioModel[]
  programmes: ProgrammeModel[]
  projects: ProjectModel[]
  onItemClick?: (id: string, type: string, name: string) => void
}

type SortKey = 'name' | 'type' | 'rag' | 'allottedBudget' | 'allocatedBudget' | 'actual' | 'startDate' | 'endDate'

const TableView: React.FC<TableViewProps> = ({ portfolios, programmes, projects, onItemClick }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const rows: FlatRow[] = useMemo(() => {
    const result: FlatRow[] = []

    for (const port of portfolios) {
      const normalizedPortId = normalizeLookupId(port.pm_portfolioid)
      result.push({
        id: port.pm_portfolioid!,
        name: port.pm_portfolioname!,
        type: 'Portfolio',
        ragStatus: port.pm_ragstatus?.toString(),
        allottedBudget: port.pm_approvedbudgeteur ?? 0,
        allocatedBudget: 0,
        actual: port.pm_actualspendeur ?? 0,
        startDate: port.pm_startdate,
        endDate: port.pm_enddate,
        level: 0,
      })

      const portProgrammes = programmes.filter(pr =>
        normalizeLookupId(pr._pm_portfolio_value) === normalizedPortId
      )
      // Compute portfolio-level allocated budget (sum of programme budgets)
      const portAllocated = portProgrammes.reduce((sum, p) => sum + (p.pm_budgeteur ?? 0), 0)
      if (portAllocated > 0) result[result.length - 1].allocatedBudget = portAllocated

      for (const prog of portProgrammes) {
        const normalizedProgId = normalizeLookupId(prog.pm_programmeid)
        result.push({
          id: prog.pm_programmeid!,
          name: prog.pm_programmename!,
          type: 'Programme',
          parentName: port.pm_portfolioname,
          ragStatus: prog.pm_ragstatus?.toString(),
          allottedBudget: prog.pm_budgeteur ?? 0,
          allocatedBudget: 0,
          actual: prog.pm_actualspendeur ?? 0,
          startDate: prog.pm_startdate,
          endDate: prog.pm_enddate,
          level: 1,
        })

        const progProjects = projects.filter(pj =>
          normalizeLookupId(pj._pm_programme_value) === normalizedProgId
        )
        // Compute programme-level allocated budget (sum of project budgets)
        const progAllocated = progProjects.reduce((sum, p) => sum + (p.pm_approvedbudgeteur ?? 0), 0)
        if (progAllocated > 0) result[result.length - 1].allocatedBudget = progAllocated

        for (const proj of progProjects) {
          result.push({
            id: proj.pm_projectid!,
            name: proj.pm_projectname!,
            type: 'Project',
            parentName: prog.pm_programmename,
            ragStatus: proj.pm_ragstatus?.toString(),
            allottedBudget: proj.pm_approvedbudgeteur ?? 0,
            allocatedBudget: 0,
            actual: proj.pm_actualcosteur ?? 0,
            startDate: proj.pm_plannedstartdate,
            endDate: proj.pm_plannedenddate,
            level: 2,
          })
        }
      }
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'type': cmp = a.type.localeCompare(b.type); break
        case 'rag': cmp = (a.ragStatus ?? '').localeCompare(b.ragStatus ?? ''); break
        case 'allottedBudget': cmp = a.allottedBudget - b.allottedBudget; break
        case 'allocatedBudget': cmp = a.allocatedBudget - b.allocatedBudget; break
        case 'actual': cmp = a.actual - b.actual; break
        case 'startDate': cmp = (a.startDate ?? '').localeCompare(b.startDate ?? ''); break
        case 'endDate': cmp = (a.endDate ?? '').localeCompare(b.endDate ?? ''); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [portfolios, programmes, projects, sortKey, sortDir])

  const getIcon = (type: string) => {
    if (type === 'Portfolio') return <BusinessIcon sx={{ fontSize: 18, color: 'primary.main' }} />
    if (type === 'Programme') return <AccountTreeIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
    return <FolderIcon sx={{ fontSize: 18, color: 'info.main' }} />
  }

  const sortLabel = (key: SortKey, label: string) => (
    <TableSortLabel
      active={sortKey === key}
      direction={sortKey === key ? sortDir : 'asc'}
      onClick={() => handleSort(key)}
      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569', whiteSpace: 'nowrap' }}
    >
      {label}
    </TableSortLabel>
  )

  return (
    <TableContainer sx={{ maxHeight: 'calc(100vh - 480px)', borderRadius: 0 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5, minWidth: 300 }}>
              {sortLabel('name', 'Name')}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('type', 'Type')}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              Parent
            </TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('rag', 'RAG')}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('allottedBudget', 'Allotted')}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('allocatedBudget', 'Allocated')}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('actual', 'Actual')}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('startDate', 'Start')}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', px: 2.5, py: 1.5 }}>
              {sortLabel('endDate', 'End')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                <Typography color="text.secondary">No data to display.</Typography>
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => (
            <TableRow
              key={row.id}
              hover
              onClick={() => onItemClick?.(row.id, row.type.toLowerCase(), row.name)}
              sx={{
                cursor: onItemClick ? 'pointer' : 'default',
                bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                '& td': { px: 2.5, py: 1.25 },
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: row.level * 3 }}>
                  {getIcon(row.type)}
                  <Typography variant="body2" sx={{ fontWeight: row.level === 0 ? 700 : row.level === 1 ? 600 : 500 }}>
                    {row.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{row.type}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">{row.parentName || '—'}</Typography>
              </TableCell>
              <TableCell>
                {row.ragStatus ? (
                  <Tooltip title={`RAG status: ${RAG_LABELS[row.ragStatus] || 'Unknown'}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS[row.ragStatus] || '#94a3b8' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{RAG_LABELS[row.ragStatus] || '—'}</Typography>
                    </Box>
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.disabled">—</Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <Tooltip title={`Allotted budget: ${currencyFormatter.format(row.allottedBudget)}`}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, cursor: 'help' }}>
                    {currencyFormatter.format(row.allottedBudget)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title={row.allocatedBudget > 0 ? `Allocated budget: ${currencyFormatter.format(row.allocatedBudget)}` : 'No budget allocated'}>
                  <Typography variant="body2" sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    cursor: 'help',
                    color: row.allocatedBudget > row.allottedBudget ? 'error.main' : row.allocatedBudget > 0 && row.allocatedBudget < row.allottedBudget ? 'warning.main' : 'text.secondary',
                  }}>
                    {row.allocatedBudget > 0 ? currencyFormatter.format(row.allocatedBudget) : '—'}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title={`Actual spend: ${currencyFormatter.format(row.actual)}`}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', cursor: 'help' }}>
                    {currencyFormatter.format(row.actual)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {row.endDate ? new Date(row.endDate).toLocaleDateString() : '—'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default TableView
