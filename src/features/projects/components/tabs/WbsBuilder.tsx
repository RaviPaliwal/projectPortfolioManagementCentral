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
  Checkbox,
  ListItemText,
  OutlinedInput,
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import SaveIcon from '@mui/icons-material/Save'
import WarningIcon from '@mui/icons-material/Warning'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import SettingsIcon from '@mui/icons-material/Settings'

import { updateProjectTask, normalizeLookupId } from '@/services'
import type { ProjectTaskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface WbsBuilderProps {
  tasks: ProjectTaskModel[]
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRefresh: (type?: string) => void
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
  const [needsReset, setNeedsReset] = useState(false)

  const [activeTaskIndex, setActiveTaskIndex] = useState<number | null>(null)
  const [dependencyDialogTasks, setDependencyDialogTasks] = useState<any[]>([])
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false)

  const handleOpenDependencyDialog = (index: number) => {
    const task = localTasks[index]
    const values = task.predecessorIds || (task._pm_predecessortask_value ? [task._pm_predecessortask_value] : [])
    const deps = task.dependencies || []
    
    // Build a helper list of predecessor tasks with their current lag/type
    const dialogTasks = values.map(predId => {
      const predTask = localTasks.find(t => t.pm_projecttaskid === predId)
      const existingDep = deps.find(d => d.predecessorId === predId)
      return {
        predecessorId: predId,
        wbs: predTask?.pm_wbsnumber || '',
        name: predTask?.pm_taskname || 'Unnamed Task',
        lagDays: existingDep?.lagDays ?? 0,
        dependencyType: existingDep?.dependencyType ?? 1,
      }
    })
    
    setActiveTaskIndex(index)
    setDependencyDialogTasks(dialogTasks)
    setDependencyDialogOpen(true)
  }

  const handleSaveDependencySettings = () => {
    if (activeTaskIndex === null) return
    const list = [...localTasks]
    const task = list[activeTaskIndex]
    
    // Save mapped dependencies
    const updatedDeps = dependencyDialogTasks.map(d => ({
      predecessorId: d.predecessorId,
      lagDays: Number(d.lagDays) || 0,
      dependencyType: Number(d.dependencyType) || 1,
    }))
    
    list[activeTaskIndex] = {
      ...task,
      dependencies: updatedDeps,
      predecessorIds: updatedDeps.map(d => d.predecessorId),
      _pm_predecessortask_value: updatedDeps[0]?.predecessorId || undefined,
    }
    
    setLocalTasks(list)
    setDependencyDialogOpen(false)
    setActiveTaskIndex(null)
  }
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Load initial tasks or merge updates without losing unsaved WBS layout structure
  useEffect(() => {
    const normalizedTasks = tasks.map(t => ({
      ...t,
      pm_projecttaskid: normalizeLookupId(t.pm_projecttaskid),
      pm_parenttaskid: normalizeLookupId(t.pm_parenttaskid),
      _pm_predecessortask_value: normalizeLookupId(t._pm_predecessortask_value),
      predecessorIds: t.predecessorIds?.map(id => normalizeLookupId(id)!).filter(Boolean) || (t._pm_predecessortask_value ? [normalizeLookupId(t._pm_predecessortask_value)!] : []),
      dependencies: t.dependencies?.map(d => ({
        ...d,
        predecessorId: normalizeLookupId(d.predecessorId)!,
      }))
    }))

    if (localTasks.length === 0 || needsReset) {
      const sorted = [...normalizedTasks].sort((a, b) => {
        if (!a.pm_wbsnumber && b.pm_wbsnumber) return 1
        if (a.pm_wbsnumber && !b.pm_wbsnumber) return -1
        if (!a.pm_wbsnumber && !b.pm_wbsnumber) {
          const dateA = a.pm_plannedstartdate ? new Date(a.pm_plannedstartdate).getTime() : 0
          const dateB = b.pm_plannedstartdate ? new Date(b.pm_plannedstartdate).getTime() : 0
          return dateA - dateB
        }
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
      if (needsReset) {
        setNeedsReset(false)
      }
    } else {
      const taskMap = new Map<string, ProjectTaskModel>()
      normalizedTasks.forEach(t => {
        if (t.pm_projecttaskid) taskMap.set(t.pm_projecttaskid, t)
      })

      const merged = localTasks.map(localTask => {
        const fresh = localTask.pm_projecttaskid ? taskMap.get(localTask.pm_projecttaskid) : null
        if (fresh) {
          return {
            ...localTask,
            // Update non-WBS details from database
            pm_taskname: fresh.pm_taskname,
            pm_plannedstartdate: fresh.pm_plannedstartdate,
            pm_plannedenddate: fresh.pm_plannedenddate,
            pm_actualstartdate: fresh.pm_actualstartdate,
            pm_actualenddate: fresh.pm_actualenddate,
            pm_percentcomplete: fresh.pm_percentcomplete,
            pm_taskstatus: fresh.pm_taskstatus,
            pm_assignedresource: fresh.pm_assignedresource,
            _pm_project_value: fresh._pm_project_value,
            predecessorIds: fresh.predecessorIds,
            _pm_predecessortask_value: fresh._pm_predecessortask_value,
            dependencies: fresh.dependencies,
          }
        }
        return localTask
      })

      const existingIds = new Set(localTasks.map(t => t.pm_projecttaskid).filter(Boolean) as string[])
      const newTasks = normalizedTasks.filter(t => t.pm_projecttaskid && !existingIds.has(t.pm_projecttaskid))
      if (newTasks.length > 0) {
        setLocalTasks(recalculateWbs([...merged, ...newTasks]))
      } else {
        setLocalTasks(merged)
      }
    }
  }, [tasks, needsReset])

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

  // Update Predecessors
  const handlePredecessorsChange = (index: number, predIds: string[]) => {
    const list = [...localTasks]
    list[index] = { 
      ...list[index], 
      predecessorIds: predIds, 
      _pm_predecessortask_value: predIds[0] || undefined 
    }
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
      const origPreds = orig.predecessorIds || (orig._pm_predecessortask_value ? [orig._pm_predecessortask_value] : [])
      const localPreds = t.predecessorIds || (t._pm_predecessortask_value ? [t._pm_predecessortask_value] : [])
      const predChanged = JSON.stringify([...origPreds].sort()) !== JSON.stringify([...localPreds].sort())
      
      const origDeps = orig.dependencies || []
      const localDeps = t.dependencies || []
      const mapDepKey = (d: any) => `${d.predecessorId}-${d.lagDays || 0}-${d.dependencyType || 1}`
      const origDepKeys = origDeps.map(mapDepKey).sort()
      const localDepKeys = localDeps.map(mapDepKey).sort()
      const depDetailsChanged = JSON.stringify(origDepKeys) !== JSON.stringify(localDepKeys)

      const parentChanged = t.pm_parenttaskid !== orig.pm_parenttaskid
      const critChanged = !!t.pm_oncriticalpath !== !!orig.pm_oncriticalpath

      if (wbsChanged || levelChanged || predChanged || depDetailsChanged || parentChanged || critChanged) {
        changes.push(t)
      }
    })
    return changes
  }, [localTasks, tasks])

  // Check if there are any conflicts in the local tasks list
  const hasConflicts = useMemo(() => {
    return localTasks.some((task, index) => {
      const level = task.pm_tasklevel || 1
      const start = task.pm_plannedstartdate ? new Date(task.pm_plannedstartdate) : null
      const end = task.pm_plannedenddate ? new Date(task.pm_plannedenddate) : null

      // 1. Parent task conflict
      if (task.pm_parenttaskid) {
        const parent = localTasks.find(t => t.pm_projecttaskid === task.pm_parenttaskid)
        if (parent) {
          const pStart = parent.pm_plannedstartdate ? new Date(parent.pm_plannedstartdate) : null
          const pEnd = parent.pm_plannedenddate ? new Date(parent.pm_plannedenddate) : null
          if ((start && pStart && start < pStart) || (end && pEnd && end > pEnd)) {
            return true
          }
        }
      }

      // 2. Predecessor conflict
      const preds = task.predecessorIds || (task._pm_predecessortask_value ? [task._pm_predecessortask_value] : [])
      for (const predId of preds) {
        const predecessor = localTasks.find(t => t.pm_projecttaskid === predId)
        if (predecessor) {
          const predEnd = predecessor.pm_plannedenddate ? new Date(predecessor.pm_plannedenddate) : null
          if (start && predEnd && start < predEnd) {
            return true
          }
        }
      }

      // 3. Same-level sibling conflict
      let prevSibling: ProjectTaskModel | null = null
      for (let i = index - 1; i >= 0; i--) {
        const t = localTasks[i]
        if (t.pm_tasklevel === level && t.pm_parenttaskid === task.pm_parenttaskid) {
          prevSibling = t
          break
        }
      }
      if (prevSibling) {
        const prevStart = prevSibling.pm_plannedstartdate ? new Date(prevSibling.pm_plannedstartdate) : null
        if (start && prevStart && start < prevStart) {
          return true
        }
      }

      return false
    })
  }, [localTasks])

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
          predecessorIds: task.predecessorIds || [],
          dependencyDetails: task.dependencies?.map(d => ({
            predecessorId: d.predecessorId,
            lagDays: d.lagDays,
            dependencyType: d.dependencyType,
          })) || [],
          _pm_project_value: task._pm_project_value,
          pm_oncriticalpath: task.pm_oncriticalpath,
        } as any)
      } catch (err) {
        console.error(`Failed to save task ${task.pm_taskname}:`, err)
        errCount++
      }
      setSaveProgress(Math.round(((i + 1) / changedTasks.length) * 100))
    }

    setSaving(false)
    if (errCount === 0) {
      onSuccess(`Saved WBS structure changes successfully (${changedTasks.length} tasks updated).`)
      setNeedsReset(true)
      onRefresh('task')
    } else {
      onError(`WBS structure saved with ${errCount} failures. Please reload and try again.`)
      setNeedsReset(true)
      onRefresh('task')
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Manage hierarchy, sequence order, and predecessor links. Unsaved changes are highlighted in bold/yellow.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {(changedTasks.length > 0 || hasConflicts) && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: hasConflicts ? 'error.main' : 'warning.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WarningIcon sx={{ fontSize: 16 }} />{' '}
              {hasConflicts ? 'Fix validation errors before saving' : `${changedTasks.length} unsaved changes`}
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
            const start = task.pm_plannedstartdate ? new Date(task.pm_plannedstartdate) : null
            const end = task.pm_plannedenddate ? new Date(task.pm_plannedenddate) : null

            if (task.pm_parenttaskid) {
              const parent = localTasks.find(t => t.pm_projecttaskid === task.pm_parenttaskid)
              if (parent) {
                const pStart = parent.pm_plannedstartdate ? new Date(parent.pm_plannedstartdate) : null
                const pEnd = parent.pm_plannedenddate ? new Date(parent.pm_plannedenddate) : null

                if (start && pStart && start < pStart) {
                  dateConflictMessage = `Start date (${start.toLocaleDateString()}) falls before parent task start date (${pStart.toLocaleDateString()}: ${parent.pm_taskname || 'Parent'})`
                } else if (end && pEnd && end > pEnd) {
                  dateConflictMessage = `End date (${end.toLocaleDateString()}) falls after parent task end date (${pEnd.toLocaleDateString()}: ${parent.pm_taskname || 'Parent'})`
                }
              }
            }

            // Predecessor timeline validation
            if (!dateConflictMessage) {
              const preds = task.predecessorIds || (task._pm_predecessortask_value ? [task._pm_predecessortask_value] : [])
              for (const predId of preds) {
                if (dateConflictMessage) break
                const predecessor = localTasks.find(t => t.pm_projecttaskid === predId)
                if (predecessor) {
                  const predEnd = predecessor.pm_plannedenddate ? new Date(predecessor.pm_plannedenddate) : null
                  if (start && predEnd && start < predEnd) {
                    dateConflictMessage = `Dependency conflict: Starts (${start.toLocaleDateString()}) before predecessor finishes (${predEnd.toLocaleDateString()}: ${predecessor.pm_taskname || 'Predecessor'})`
                  }
                }
              }
            }

            // Same-level task sequencing timeline validation
            if (!dateConflictMessage) {
              let prevSibling: ProjectTaskModel | null = null
              for (let i = index - 1; i >= 0; i--) {
                const t = localTasks[i]
                if (t.pm_tasklevel === level && t.pm_parenttaskid === task.pm_parenttaskid) {
                  prevSibling = t
                  break
                }
              }
              if (prevSibling) {
                const prevStart = prevSibling.pm_plannedstartdate ? new Date(prevSibling.pm_plannedstartdate) : null
                if (start && prevStart && start < prevStart) {
                  dateConflictMessage = `Sequence conflict: Scheduled to start (${start.toLocaleDateString()}) before previous sibling task starts (${prevStart.toLocaleDateString()}: ${prevSibling.pm_taskname || 'Sibling'})`
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        id={`wbs-predecessors-${index}`}
                        multiple
                        inputProps={{ 'aria-label': 'Predecessor Tasks' }}
                        value={task.predecessorIds || (task._pm_predecessortask_value ? [task._pm_predecessortask_value] : [])}
                        onChange={(e) => handlePredecessorsChange(index, e.target.value as string[])}
                        input={<OutlinedInput size="small" sx={{ borderRadius: 1.15, fontSize: fontSizes.xs }} />}
                        renderValue={(selected) => {
                          const selectedList = selected as string[]
                          if (selectedList.length === 0) return '— None —'
                          return selectedList.map(id => {
                            const opt = predecessorOptions.find(t => t.pm_projecttaskid === id)
                            return opt ? opt.pm_wbsnumber : ''
                          }).filter(Boolean).join(', ')
                        }}
                        sx={{ borderRadius: 1.15, fontSize: fontSizes.xs }}
                      >
                        {predecessorOptions.map(opt => {
                          const values = task.predecessorIds || (task._pm_predecessortask_value ? [task._pm_predecessortask_value] : [])
                          const isChecked = values.includes(opt.pm_projecttaskid!)
                          return (
                            <MenuItem key={opt.pm_projecttaskid} value={opt.pm_projecttaskid} sx={{ fontSize: fontSizes.xs }}>
                              <Checkbox size="small" checked={isChecked} />
                              <ListItemText primary={`${opt.pm_wbsnumber} ${opt.pm_taskname}`} slotProps={{ primary: { sx: { fontSize: fontSizes.xs } } }} />
                            </MenuItem>
                          )
                        })}
                      </Select>
                    </FormControl>
                    {(task.predecessorIds || (task._pm_predecessortask_value ? [task._pm_predecessortask_value] : [])).length > 0 && (
                      <Tooltip title="Configure Lag & Dependency Type">
                        <IconButton size="small" onClick={() => handleOpenDependencyDialog(index)}>
                          <SettingsIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
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

      <MuiDialog 
        open={dependencyDialogOpen} 
        onClose={() => setDependencyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 1.5 }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 600 }}>
          Dependency Settings
        </DialogTitle>
        <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {dependencyDialogTasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No predecessors selected.</Typography>
          ) : (
            dependencyDialogTasks.map((dep, dIdx) => (
              <Box key={dep.predecessorId} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Predecessor: {dep.wbs} {dep.name}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <FormControl size="small" fullWidth>
                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 500 }}>Dependency Type</Typography>
                    <Select
                      value={dep.dependencyType}
                      onChange={(e) => {
                        const copy = [...dependencyDialogTasks]
                        copy[dIdx].dependencyType = Number(e.target.value)
                        setDependencyDialogTasks(copy)
                      }}
                      sx={{ borderRadius: 1.15 }}
                    >
                      <MenuItem value={1}>Finish-to-Start (FS)</MenuItem>
                      <MenuItem value={2}>Start-to-Start (SS)</MenuItem>
                      <MenuItem value={3}>Finish-to-Finish (FF)</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 500 }}>Lag Days</Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={dep.lagDays}
                      onChange={(e) => {
                        const copy = [...dependencyDialogTasks]
                        copy[dIdx].lagDays = e.target.value
                        setDependencyDialogTasks(copy)
                      }}
                      slotProps={{ htmlInput: { min: -100, max: 100 } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.15 } }}
                    />
                  </FormControl>
                </Box>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDependencyDialogOpen(false)} variant="outlined" sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button onClick={handleSaveDependencySettings} variant="contained" sx={{ borderRadius: 1.15 }}>
            Save
          </Button>
        </DialogActions>
      </MuiDialog>
    </Box>
  )
}
