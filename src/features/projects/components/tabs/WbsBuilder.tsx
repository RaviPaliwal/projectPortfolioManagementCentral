import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  FormControl,
  Select,
  MenuItem,
  Switch,
  CircularProgress,
  LinearProgress,
  Tooltip,
  useTheme,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import SaveIcon from '@mui/icons-material/Save'
import WarningIcon from '@mui/icons-material/Warning'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'

import { updateProjectTask } from '@/services'
import type { ProjectTaskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface WbsBuilderProps {
  tasks: ProjectTaskModel[]
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRefresh: () => void
  onEditTask?: (task: ProjectTaskModel) => void
}

const recalculateWbs = (list: ProjectTaskModel[]): ProjectTaskModel[] => {
  const counts: number[] = []
  const lastTaskAtLevel: Record<number, string | undefined> = {}
  
  return list.map(t => {
    const lvl = t.pm_tasklevel || 1
    while (counts.length < lvl) counts.push(0)
    while (counts.length > lvl) counts.pop()
    counts[lvl - 1]++

    const parentId = lvl > 1 ? lastTaskAtLevel[lvl - 1] : undefined
    if (t.pm_projecttaskid) {
      lastTaskAtLevel[lvl] = t.pm_projecttaskid
    }

    return { 
      ...t, 
      pm_wbsnumber: counts.join('.'),
      pm_parenttaskid: parentId
    }
  })
}

export const WbsBuilder: React.FC<WbsBuilderProps> = ({ tasks, onSuccess, onError, onRefresh, onEditTask }) => {
  const theme = useTheme()
  const [localTasks, setLocalTasks] = useState<ProjectTaskModel[]>([])
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Load initial tasks sorted in WBS sequence
  useEffect(() => {
    const sorted = [...tasks].sort((a, b) => {
      // Put tasks without WBS numbers at the bottom
      if (!a.pm_wbsnumber && b.pm_wbsnumber) return 1
      if (a.pm_wbsnumber && !b.pm_wbsnumber) return -1
      if (!a.pm_wbsnumber && !b.pm_wbsnumber) {
        const dateA = a.pm_plannedstartdate ? new Date(a.pm_plannedstartdate).getTime() : 0
        const dateB = b.pm_plannedstartdate ? new Date(b.pm_plannedstartdate).getTime() : 0
        return dateA - dateB
      }

      // Sort by WBS numbers naturally
      const aParts = (a.pm_wbsnumber || '').split('.').map(Number)
      const bParts = (b.pm_wbsnumber || '').split('.').map(Number)
      const maxLen = Math.max(aParts.length, bParts.length)
      for (let i = 0; i < maxLen; i++) {
        const aVal = aParts[i] || 0
        const bVal = bParts[i] || 0
        if (aVal !== bVal) return aVal - bVal
      }
      return 0
    })
    setLocalTasks(sorted)
  }, [tasks])

  // HTML5 Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const list = [...localTasks]
    const [removed] = list.splice(draggedIndex, 1)
    list.splice(targetIndex, 0, removed)
    setLocalTasks(recalculateWbs(list))
    setDraggedIndex(null)
  }

  // Move task up in order
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const list = [...localTasks]
    const temp = list[index]
    list[index] = list[index - 1]
    list[index - 1] = temp
    setLocalTasks(recalculateWbs(list))
  }

  // Move task down in order
  const handleMoveDown = (index: number) => {
    if (index === localTasks.length - 1) return
    const list = [...localTasks]
    const temp = list[index]
    list[index] = list[index + 1]
    list[index + 1] = temp
    setLocalTasks(recalculateWbs(list))
  }

  // Decrease level (Outdent)
  const handleOutdent = (index: number) => {
    const list = [...localTasks]
    const task = list[index]
    const currentLvl = task.pm_tasklevel || 1
    if (currentLvl <= 1) return
    list[index] = { ...task, pm_tasklevel: currentLvl - 1 }
    setLocalTasks(recalculateWbs(list))
  }

  // Increase level (Indent)
  const handleIndent = (index: number) => {
    const list = [...localTasks]
    // Cannot indent first task
    if (index === 0) return
    const prevTask = list[index - 1]
    const currentLvl = list[index].pm_tasklevel || 1
    // Cannot indent more than 1 level deeper than predecessor
    if (currentLvl > (prevTask.pm_tasklevel || 1)) return
    list[index] = { ...list[index], pm_tasklevel: currentLvl + 1 }
    setLocalTasks(recalculateWbs(list))
  }

  // Toggle Critical Path
  const handleToggleCriticalPath = (index: number, val: boolean) => {
    const list = [...localTasks]
    list[index] = { ...list[index], pm_oncriticalpath: val }
    setLocalTasks(list)
  }

  // Update Predecessor
  const handlePredecessorChange = (index: number, predId: string) => {
    const list = [...localTasks]
    list[index] = { ...list[index], _pm_predecessortask_value: predId || undefined }
    setLocalTasks(list)
  }

  // Find changed tasks
  const changedTasks = useMemo(() => {
    const originalMap = new Map<string, ProjectTaskModel>()
    tasks.forEach(t => {
      if (t.pm_projecttaskid) originalMap.set(t.pm_projecttaskid, t)
    })

    const changes: ProjectTaskModel[] = []
    localTasks.forEach(t => {
      if (!t.pm_projecttaskid) return
      const orig = originalMap.get(t.pm_projecttaskid)
      if (!orig) return

      const wbsChanged = t.pm_wbsnumber !== orig.pm_wbsnumber
      const levelChanged = t.pm_tasklevel !== orig.pm_tasklevel
      const predChanged = t._pm_predecessortask_value !== orig._pm_predecessortask_value
      const parentChanged = t.pm_parenttaskid !== orig.pm_parenttaskid
      const critChanged = !!t.pm_oncriticalpath !== !!orig.pm_oncriticalpath

      if (wbsChanged || levelChanged || predChanged || parentChanged || critChanged) {
        changes.push(t)
      }
    })
    return changes
  }, [localTasks, tasks])

  // Save changes to Dataverse
  const handleSave = async () => {
    if (changedTasks.length === 0) {
      onSuccess('No WBS changes to save.')
      return
    }

    setSaving(true)
    setSaveProgress(0)
    let errCount = 0

    for (let i = 0; i < changedTasks.length; i++) {
      const task = changedTasks[i]
      try {
        await updateProjectTask(task.pm_projecttaskid!, {
          pm_wbsnumber: task.pm_wbsnumber,
          pm_tasklevel: task.pm_tasklevel,
          pm_parenttaskid: task.pm_parenttaskid || undefined,
          _pm_predecessortask_value: task._pm_predecessortask_value || undefined,
          pm_oncriticalpath: task.pm_oncriticalpath,
        })
      } catch (err) {
        console.error(`Failed to save task ${task.pm_taskname}:`, err)
        errCount++
      }
      setSaveProgress(Math.round(((i + 1) / changedTasks.length) * 100))
    }

    setSaving(false)
    if (errCount === 0) {
      onSuccess(`Saved WBS structure changes successfully (${changedTasks.length} tasks updated).`)
      onRefresh()
    } else {
      onError(`WBS structure saved with ${errCount} failures. Please reload and try again.`)
      onRefresh()
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Manage hierarchy, sequence order, and predecessor links. Unsaved changes are highlighted in bold/yellow.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {changedTasks.length > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WarningIcon sx={{ fontSize: 16 }} /> {changedTasks.length} unsaved changes
            </Typography>
          )}
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            disabled={changedTasks.length === 0 || saving}
            onClick={handleSave}
            sx={{ borderRadius: 1.15 }}
          >
            {saving ? 'Saving...' : 'Save WBS Structure'}
          </Button>
        </Box>
      </Box>

      {saving && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" value={saveProgress} sx={{ height: 6, borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
            Saving: {saveProgress}%
          </Typography>
        </Box>
      )}

      <Table size="small">
        <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'background.default' }}>
          <TableRow>
            <TableCell sx={{ width: 40 }} />
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, width: 80 }}>WBS Code</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs }}>Task Name</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, width: 140 }} align="center">Hierarchy Adjust</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, width: 100 }} align="center">Sequence</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, width: 220 }}>Predecessor (Dependency)</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, width: 120 }} align="center">Critical Path</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: fontSizes.xs, width: 80 }} align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {localTasks.map((task, index) => {
            const level = task.pm_tasklevel || 1
            const isFirst = index === 0
            const isLast = index === localTasks.length - 1
            const origTask = tasks.find(t => t.pm_projecttaskid === task.pm_projecttaskid)
            const isModified = origTask && (
              task.pm_wbsnumber !== origTask.pm_wbsnumber ||
              task.pm_tasklevel !== origTask.pm_tasklevel ||
              task._pm_predecessortask_value !== origTask._pm_predecessortask_value ||
              task.pm_parenttaskid !== origTask.pm_parenttaskid ||
              !!task.pm_oncriticalpath !== !!origTask.pm_oncriticalpath
            )

            // Find parent task date range conflict
            let dateConflictMessage: string | null = null
            if (task.pm_parenttaskid) {
              const parent = localTasks.find(t => t.pm_projecttaskid === task.pm_parenttaskid)
              if (parent) {
                const start = task.pm_plannedstartdate ? new Date(task.pm_plannedstartdate) : null
                const end = task.pm_plannedenddate ? new Date(task.pm_plannedenddate) : null
                const pStart = parent.pm_plannedstartdate ? new Date(parent.pm_plannedstartdate) : null
                const pEnd = parent.pm_plannedenddate ? new Date(parent.pm_plannedenddate) : null

                if (start && pStart && start < pStart) {
                  dateConflictMessage = `Start date (${start.toLocaleDateString()}) falls before parent task start date (${pStart.toLocaleDateString()}: ${parent.pm_taskname || 'Parent'})`
                } else if (end && pEnd && end > pEnd) {
                  dateConflictMessage = `End date (${end.toLocaleDateString()}) falls after parent task end date (${pEnd.toLocaleDateString()}: ${parent.pm_taskname || 'Parent'})`
                }
              }
            }

            // Options for predecessors (exclude self)
            const predecessorOptions = localTasks.filter(t => t.pm_projecttaskid !== task.pm_projecttaskid)

            return (
              <TableRow
                key={task.pm_projecttaskid}
                hover
                draggable={!saving}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                sx={{
                  bgcolor: dateConflictMessage
                    ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)')
                    : task.pm_oncriticalpath 
                    ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)')
                    : isModified
                    ? (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.02)')
                    : 'transparent',
                  '&:last-child td': { border: 0 },
                  borderLeft: dateConflictMessage
                    ? '3px solid #ef4444'
                    : isModified 
                    ? '3px solid #f59e0b' 
                    : 'none',
                  opacity: draggedIndex === index ? 0.4 : 1,
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <TableCell sx={{ width: 40, p: 0, textAlign: 'center' }}>
                  <Tooltip title="Drag to reorder">
                    <DragIndicatorIcon sx={{ color: 'action.disabled', fontSize: 18, cursor: 'grab', verticalAlign: 'middle' }} />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: isModified ? 800 : 500, fontFamily: 'monospace' }}>
                  {task.pm_wbsnumber}
                </TableCell>
                <TableCell sx={{ pl: level * 3, fontWeight: isModified ? 800 : 500 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {level > 1 && (
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'action.disabled', opacity: 0.5 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: level === 1 ? 700 : 500 }}>
                      {task.pm_taskname}
                    </Typography>
                    {dateConflictMessage && (
                      <Tooltip title={dateConflictMessage}>
                        <WarningIcon sx={{ color: 'error.main', fontSize: 16, cursor: 'help' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                    <Tooltip title="Outdent (⬅️)">
                      <IconButton size="small" onClick={() => handleOutdent(index)} disabled={level <= 1}>
                        <ArrowBackIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Indent (➡️)">
                      <IconButton size="small" onClick={() => handleIndent(index)} disabled={isFirst || level > (localTasks[index - 1].pm_tasklevel || 1)}>
                        <ArrowForwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                    <Tooltip title="Move Up (⬆️)">
                      <IconButton size="small" onClick={() => handleMoveUp(index)} disabled={isFirst}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Move Down (⬇️)">
                      <IconButton size="small" onClick={() => handleMoveDown(index)} disabled={isLast}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={task._pm_predecessortask_value || ''}
                      onChange={(e) => handlePredecessorChange(index, e.target.value as string)}
                      sx={{ borderRadius: 1.15, fontSize: fontSizes.xs }}
                      displayEmpty
                    >
                      <MenuItem value="">— None —</MenuItem>
                      {predecessorOptions.map(opt => (
                        <MenuItem key={opt.pm_projecttaskid} value={opt.pm_projecttaskid} sx={{ fontSize: fontSizes.xs }}>
                          {opt.pm_wbsnumber} {opt.pm_taskname}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="center">
                  <Switch
                    size="small"
                    color="error"
                    checked={!!task.pm_oncriticalpath}
                    onChange={(e) => handleToggleCriticalPath(index, e.target.checked)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit Task dates/details">
                    <IconButton
                      size="small"
                      onClick={() => onEditTask?.(task)}
                      sx={{ border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}
