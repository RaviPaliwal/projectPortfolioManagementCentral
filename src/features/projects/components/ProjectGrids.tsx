import React, { useCallback, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  LinearProgress,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { SearchFilterBar, TableFooter, TableShell, ExportButton, StatusTag } from '@/components/common'
import type { ProjectModel } from '@/types/dataverse'
import { RAG_COLORS, RAG_LABELS, PHASE_COLORS, phaseLabel, currency, projectExportColumns } from '../constants'

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

interface ProjectGridsProps {
  projects: ProjectModel[]
  loading: boolean
  onRowClick: (project: ProjectModel) => void
  onAddProject: () => void
  onEditProject: (project: ProjectModel) => void
}

export const ProjectGrids: React.FC<ProjectGridsProps> = ({
  projects,
  loading,
  onRowClick,
  onAddProject,
  onEditProject
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [sort, setSort] = useState<SortState>({ field: 'pm_projectname', direction: 'asc' })

  const handleSort = useCallback((field: string) => {
    setSort((prev) => prev.field === field
      ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' }
    )
  }, [])

  const filteredProjects = useMemo(() => {
    let list = [...projects]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) =>
        (p.pm_projectname?.toLowerCase() ?? '').includes(q) ||
        (p.pm_projectmanagername?.toLowerCase() ?? '').includes(q) ||
        (p.pm_projectcode?.toLowerCase() ?? '').includes(q) ||
        (p.pm_businessunit?.toLowerCase() ?? '').includes(q)
      )
    }

    // Phase filter
    if (phaseFilter) {
      list = list.filter((p) => String(p.pm_projectphase) === phaseFilter)
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      const field = sort.field
      const dir = sort.direction === 'asc' ? 1 : -1

      if (field === 'pm_projectname') {
        cmp = (a.pm_projectname ?? '').localeCompare(b.pm_projectname ?? '')
      } else if (field === 'pm_projectphase') {
        cmp = (phaseLabel(a.pm_projectphase) ?? '').localeCompare(phaseLabel(b.pm_projectphase) ?? '')
      } else if (field === 'pm_projectmanager') {
        cmp = (a.pm_projectmanagername ?? '').localeCompare(b.pm_projectmanagername ?? '')
      } else if (field === 'pm_ragstatus') {
        cmp = (String(a.pm_ragstatus) ?? '').localeCompare(String(b.pm_ragstatus) ?? '')
      } else if (field === 'pm_percentcomplete') {
        cmp = ((a.pm_percentcomplete ?? 0) - (b.pm_percentcomplete ?? 0))
      } else if (field === 'pm_plannedenddate') {
        cmp = (a.pm_plannedenddate ?? '').localeCompare(b.pm_plannedenddate ?? '')
      }
      return cmp * dir
    })

    return list
  }, [projects, searchQuery, phaseFilter, sort])

  const paginatedProjects = useMemo(
    () => filteredProjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredProjects, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handlePhaseFilterChange = useCallback((value: string) => { setPhaseFilter(value); setPage(0) }, [])

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <TableSortLabel
      active={sort.field === field}
      direction={sort.field === field ? sort.direction : 'asc'}
      onClick={() => handleSort(field)}
      sx={{ fontWeight: 700, color: 'inherit', '&.Mui-active': { color: 'inherit' } }}
    >
      {label}
    </TableSortLabel>
  )

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search projects..."
        filterValue={phaseFilter}
        onFilterChange={handlePhaseFilterChange}
        filterLabel="Filter by Phase"
        filterOptions={[
          { value: '', label: 'All Phases' },
          { value: '1', label: 'Planning' },
          { value: '0', label: 'Execution' },
          { value: '2', label: 'Closure' },
        ]}
        onClear={() => { setSearchQuery(''); setPhaseFilter(''); setPage(0) }}
      />

      <TableShell
        loading={loading}
        empty={filteredProjects.length === 0}
        emptyIcon={<AccountTreeIcon />}
        emptyTitle={searchQuery || phaseFilter ? 'No projects match your search criteria.' : 'No projects found.'}
        emptyAction={!searchQuery && !phaseFilter ? (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddProject}>
            Create your first project
          </Button>
        ) : undefined}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              {[
                { field: 'pm_projectname', label: 'Project Name' },
                { field: 'pm_projectphase', label: 'Phase' },
                { field: 'pm_projectmanager', label: 'Project Manager' },
                { field: 'pm_ragstatus', label: 'Overall RAG' },
                { field: 'pm_percentcomplete', label: '% Complete' },
                { field: 'pm_plannedenddate', label: 'Target End Date' },
              ].map((col) => (
                <TableCell
                  key={col.field}
                  sx={{
                    fontWeight: 700,
                    bgcolor: isDark ? 'background.paper' : 'background.default',
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    px: 2.5,
                    py: 1.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <SortHeader field={col.field} label={col.label} />
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, py: 1.5 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProjects.map((project, idx) => (
              <TableRow
                key={project.pm_projectid}
                hover
                onClick={() => onRowClick(project)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: idx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent',
                  '& td': { borderBottom: '1px solid #efefef', py: 1.5, px: 2.5 },
                  '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)' },
                  transition: 'background-color 0.15s',
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.pm_projectname}</Typography>
                  {project.pm_projectcode && (
                    <Typography variant="caption" color="text.secondary">{project.pm_projectcode}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <StatusTag 
                    label={phaseLabel(project.pm_projectphase)} 
                    color={PHASE_COLORS[String(project.pm_projectphase)] ?? 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{project.pm_projectmanagername ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: RAG_COLORS[String(project.pm_ragstatus)] ?? '#6b7280',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {RAG_LABELS[String(project.pm_ragstatus)] ?? '—'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={project.pm_percentcomplete ?? 0}
                      sx={{
                        width: 64,
                        height: 6,
                        borderRadius: 1.5,
                        bgcolor: theme.palette.action.hover,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: (project.pm_percentcomplete ?? 0) >= 100 ? 'success.main' : '#3b82f6',
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32 }}>
                      {project.pm_percentcomplete ?? 0}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {project.pm_plannedenddate
                      ? new Date(project.pm_plannedenddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit Project">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditProject(project)
                      }}
                      sx={{ color: 'primary.main' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filteredProjects.length > 0 && (
        <TableFooter
          filteredCount={filteredProjects.length}
          totalCount={projects.length}
          itemLabel="project"
          totals={[
            { label: 'Total budget', value: currency(filteredProjects.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)) },
          ]}
        />
      )}
      {!loading && filteredProjects.length > 0 && (
        <TablePagination
          component="div"
          count={filteredProjects.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
        />
      )}
    </Paper>
  )
}
