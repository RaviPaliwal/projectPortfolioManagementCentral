import React, { useMemo, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { DataverseTable, StatusChip, type Column } from '@/components/common'
import type { ProjectModel } from '@/types/dataverse'
import { currency } from '../constants'

interface ProjectGridsProps {
  projects: ProjectModel[]
  loading: boolean
  onRowClick: (project: ProjectModel) => void
  onAddProject: () => void
  onEditProject: (project: ProjectModel) => void
  onDeleteProject?: (project: ProjectModel) => void
  canEdit?: boolean
  canDelete?: boolean
}

export const ProjectGrids: React.FC<ProjectGridsProps> = ({
  projects,
  loading,
  onRowClick,
  onAddProject,
  onEditProject,
  onDeleteProject,
  canEdit = false,
  canDelete = false
}) => {
  const [phaseFilter, setPhaseFilter] = useState('')

  const columns: Column<ProjectModel>[] = useMemo(() => [
    {
      key: 'pm_projectname',
      label: 'Project Name',
      format: (val: any, project: ProjectModel) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{val}</Typography>
          {project.pm_projectcode && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{project.pm_projectcode}</Typography>
          )}
        </Box>
      )
    },
    {
      key: 'pm_projectphase',
      label: 'Phase',
      format: (val: any) => <StatusChip status={val} type="phase" size="small" />
    },
    {
      key: 'pm_projectmanagername',
      label: 'Project Manager',
      format: (val: any) => <Typography variant="body2" color="text.secondary">{val || '—'}</Typography>
    },
    {
      key: 'pm_ragstatus',
      label: 'Overall RAG',
      format: (val: any) => <StatusChip status={val} type="rag" size="small" />
    },
    {
      key: 'pm_percentcomplete',
      label: '% Complete',
      format: (val: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={val ?? 0}
            sx={{
              width: 64,
              height: 6,
              '& .MuiLinearProgress-bar': {
                bgcolor: (val ?? 0) >= 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32, fontFamily: 'monospace' }}>
            {val ?? 0}%
          </Typography>
        </Box>
      )
    },
    {
      key: 'pm_plannedenddate',
      label: 'Target End Date',
      format: (val: any) => (
        <Typography variant="body2" color="text.secondary">
          {val ? new Date(val).toLocaleDateString('en-GB') : '—'}
        </Typography>
      )
    }
  ], [])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (phaseFilter && String(p.pm_projectphase) !== phaseFilter) return false
      return true
    })
  }, [projects, phaseFilter])

  const totals = useMemo(() => [
    { label: 'Total budget', value: currency(filteredProjects.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0)) }
  ], [filteredProjects])

  const actions = useCallback((project: ProjectModel) => (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
      {canEdit && (
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
      )}
      {canDelete && (
        <Tooltip title="Delete Project">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation()
              onDeleteProject?.(project)
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  ), [canEdit, canDelete, onEditProject, onDeleteProject])

  return (
    <DataverseTable
      data={filteredProjects}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search projects..."
      searchFields={['pm_projectname', 'pm_projectmanagername', 'pm_projectcode', 'pm_businessunit']}
      emptyIcon={<AccountTreeIcon />}
      emptyTitle="No projects found"
      onRowClick={onRowClick}
      actions={actions}
      exportFileName="projects_register"
      itemLabel="project"
      totals={totals}
      extraFilters={
        <TextField
          select
          size="small"
          label="Filter by Phase"
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        >
          <option value="">All Phases</option>
          <option value="1">Planning</option>
          <option value="0">Execution</option>
          <option value="2">Closure</option>
        </TextField>
      }
      onClearFilters={() => setPhaseFilter('')}
    />
  )
}
