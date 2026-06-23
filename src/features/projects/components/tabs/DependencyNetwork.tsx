import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tooltip,
  Alert,
  useTheme,
  IconButton,
} from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import FlagIcon from '@mui/icons-material/Flag'
import type { ProjectTaskModel, ProjectMilestoneModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface DependencyNetworkProps {
  tasks: ProjectTaskModel[]
  milestones?: ProjectMilestoneModel[]
}

interface SwimlaneGroup {
  id: string
  name: string
  wbs: string
  tasks: VisualTask[]
  height: number
}

interface VisualTask {
  task: ProjectTaskModel
  id: string
  name: string
  wbs?: string
  startDate: Date
  endDate: Date
  progress: number
  status: string
  predecessorId?: string
  onCriticalPath: boolean
  isBlocked: boolean
  isCycle: boolean
  blockingReason?: string
  left: number // percent
  width: number // percent
  trackIndex: number // vertical index within swimlane to prevent overlap
}

interface VisualMilestone {
  milestone: ProjectMilestoneModel
  id: string
  name: string
  date: Date
  left: number // percent
  rag?: string
  status?: string
}

export const DependencyNetwork: React.FC<DependencyNetworkProps> = ({ tasks, milestones = [] }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Zoom factor
  const [zoom, setZoom] = useState(100)

  // Robust boolean checker for Dataverse option/string formats
  const isCritical = (v: any): boolean => {
    if (v === undefined || v === null) return false
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v === 1
    const s = String(v).toLowerCase().trim()
    return s === 'true' || s === '1' || s === 'yes'
  }

  const graphData = useMemo(() => {
    if (tasks.length === 0) return { swimlanes: [], minDate: new Date(), maxDate: new Date(), cycles: [], conflicts: [], nodesMap: new Map(), laneTops: new Map(), totalHeight: 0, visualMilestones: [] }

    const idMap = new Map<string, ProjectTaskModel>()
    tasks.forEach(t => {
      if (t.pm_projecttaskid) idMap.set(t.pm_projecttaskid, t)
    })

    // 1. Cycle Detection (Circular loops)
    const adj = new Map<string, string[]>()
    tasks.forEach(t => {
      const tid = t.pm_projecttaskid!
      const predId = t._pm_predecessortask_value
      if (predId && idMap.has(predId)) {
        if (!adj.has(predId)) adj.set(predId, [])
        adj.get(predId)!.push(tid)
      }
    })

    const cycles = new Set<string>()
    const visited = new Map<string, 'visiting' | 'visited'>()

    const detectCycles = (u: string) => {
      visited.set(u, 'visiting')
      const neighbors = adj.get(u) || []
      for (const v of neighbors) {
        if (visited.get(v) === 'visiting') {
          cycles.add(u)
          cycles.add(v)
        } else if (!visited.has(v)) {
          detectCycles(v)
        }
      }
      visited.set(u, 'visited')
    }

    tasks.forEach(t => {
      if (t.pm_projecttaskid && !visited.has(t.pm_projecttaskid)) {
        detectCycles(t.pm_projecttaskid)
      }
    })

    // 2. Timeline calculations
    let minTime = Infinity
    let maxTime = -Infinity

    tasks.forEach(t => {
      if (t.pm_plannedstartdate) {
        const d = new Date(t.pm_plannedstartdate).getTime()
        if (d < minTime) minTime = d
      }
      if (t.pm_plannedenddate) {
        const d = new Date(t.pm_plannedenddate).getTime()
        if (d > maxTime) maxTime = d
      }
    })

    milestones.forEach(m => {
      if (m.pm_planneddate) {
        const d = new Date(m.pm_planneddate).getTime()
        if (d < minTime) minTime = d
        if (d > maxTime) maxTime = d
      }
    })

    if (minTime === Infinity || maxTime === -Infinity) {
      const now = new Date().getTime()
      minTime = now
      maxTime = now + 30 * 24 * 60 * 60 * 1000
    }

    const oneDay = 24 * 60 * 60 * 1000
    const minDate = new Date(minTime - 7 * oneDay)
    const maxDate = new Date(maxTime + 14 * oneDay)
    const totalDuration = maxDate.getTime() - minDate.getTime()

    // 3. Map Milestones
    const visualMilestones: VisualMilestone[] = milestones
      .filter(m => m.pm_planneddate)
      .map(m => {
        const date = new Date(m.pm_planneddate!)
        const leftPercent = ((date.getTime() - minDate.getTime()) / totalDuration) * 100
        return {
          milestone: m,
          id: m.pm_projectmilestoneid!,
          name: m.pm_milestonename ?? 'Milestone',
          date,
          left: leftPercent,
          rag: String(m.pm_ragstatus),
          status: String(m.pm_status),
        }
      })

    // 4. Find WBS parent summaries for swimlanes
    const getTopLevelWbs = (wbs?: string): string => {
      if (!wbs) return 'Other'
      return wbs.split('.')[0]
    }

    const swimlaneNames = new Map<string, string>()
    tasks.forEach(t => {
      if (t.pm_wbsnumber && !t.pm_wbsnumber.includes('.')) {
        swimlaneNames.set(t.pm_wbsnumber, t.pm_taskname || `Phase ${t.pm_wbsnumber}`)
      }
    })

    const laneTasksMap = new Map<string, ProjectTaskModel[]>()
    tasks.forEach(t => {
      if (t.pm_tasklevel && t.pm_tasklevel === 1 && tasks.some(other => other.pm_wbsnumber?.startsWith(t.pm_wbsnumber + '.'))) {
        return
      }
      const wbsPrefix = getTopLevelWbs(t.pm_wbsnumber)
      if (!laneTasksMap.has(wbsPrefix)) laneTasksMap.set(wbsPrefix, [])
      laneTasksMap.get(wbsPrefix)!.push(t)
    })

    const conflicts: string[] = []
    const nodesMap = new Map<string, VisualTask>()
    const swimlanes: SwimlaneGroup[] = []

    // 5. Build lanes
    Array.from(laneTasksMap.keys()).sort().forEach(wbsPrefix => {
      const laneTasks = laneTasksMap.get(wbsPrefix) || []
      const visualTasks: VisualTask[] = []

      const rawVisuals = laneTasks.map(t => {
        const start = t.pm_plannedstartdate ? new Date(t.pm_plannedstartdate) : minDate
        const end = t.pm_plannedenddate ? new Date(t.pm_plannedenddate) : start

        const leftPercent = ((start.getTime() - minDate.getTime()) / totalDuration) * 100
        const widthPercent = Math.max(2, ((end.getTime() - start.getTime()) / totalDuration) * 100)

        let isBlocked = false
        let reason = ''
        const predId = t._pm_predecessortask_value

        if (predId && idMap.has(predId)) {
          const pred = idMap.get(predId)!
          if (t.pm_plannedstartdate && pred.pm_plannedenddate) {
            const sStart = new Date(t.pm_plannedstartdate)
            const pEnd = new Date(pred.pm_plannedenddate)
            if (sStart < pEnd) {
              isBlocked = true
              reason = `Blocked: Starts (${sStart.toLocaleDateString()}) before predecessor completes (${pEnd.toLocaleDateString()})`
              conflicts.push(`"${t.pm_taskname}" overlaps with predecessor "${pred.pm_taskname}"`)
            }
          }
          if (String(pred.pm_taskstatus) !== '0' && new Date(t.pm_plannedstartdate!) < new Date()) {
            isBlocked = true
            reason = reason || 'Predecessor incomplete (planned start date passed)'
          }
        }

        return {
          task: t,
          id: t.pm_projecttaskid!,
          name: t.pm_taskname ?? 'Unnamed Task',
          wbs: t.pm_wbsnumber,
          startDate: start,
          endDate: end,
          progress: t.pm_percentcomplete ?? 0,
          status: String(t.pm_taskstatus),
          predecessorId: t._pm_predecessortask_value,
          onCriticalPath: isCritical(t.pm_oncriticalpath),
          isBlocked,
          isCycle: cycles.has(t.pm_projecttaskid!),
          blockingReason: reason,
          left: leftPercent,
          width: widthPercent,
          trackIndex: 0,
        }
      })

      rawVisuals.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

      const tracks: number[] = []
      rawVisuals.forEach(vt => {
        let assigned = false
        for (let i = 0; i < tracks.length; i++) {
          if (vt.startDate.getTime() >= tracks[i]) {
            vt.trackIndex = i
            tracks[i] = vt.endDate.getTime()
            assigned = true
            break
          }
        }
        if (!assigned) {
          vt.trackIndex = tracks.length
          tracks.push(vt.endDate.getTime())
        }
        visualTasks.push(vt)
        nodesMap.set(vt.id, vt)
      })

      const trackCount = Math.max(tracks.length, 1)
      const laneHeight = trackCount * 52 + 20

      swimlanes.push({
        id: wbsPrefix,
        name: swimlaneNames.get(wbsPrefix) || (wbsPrefix === 'Other' ? 'General Tasks' : `Phase ${wbsPrefix}`),
        wbs: wbsPrefix,
        tasks: visualTasks,
        height: laneHeight,
      })
    })

    // 6. Calculate cumulative top offsets mathematically for connection lines
    let currentTop = 44 // 44px for the timeline header

    // Add space for Milestones lane if there are milestones
    const hasMilestones = visualMilestones.length > 0
    const milestoneLaneHeight = 60
    const milestoneLaneTop = currentTop

    if (hasMilestones) {
      currentTop += milestoneLaneHeight
    }

    const laneTops = new Map<string, number>()
    swimlanes.forEach(lane => {
      laneTops.set(lane.id, currentTop)
      currentTop += lane.height
    })

    return {
      swimlanes,
      minDate,
      maxDate,
      cycles: Array.from(cycles).map(id => idMap.get(id)?.pm_taskname || id),
      conflicts,
      nodesMap,
      laneTops,
      totalHeight: currentTop,
      visualMilestones,
      milestoneLaneTop,
      hasMilestones
    }
  }, [tasks, milestones])

  const timelineMarkers = useMemo(() => {
    const markers: Date[] = []
    const start = graphData.minDate.getTime()
    const end = graphData.maxDate.getTime()
    const diff = end - start
    const days = diff / (24 * 60 * 60 * 1000)

    let stepDays = 7
    if (days > 120) stepDays = 30
    if (days > 360) stepDays = 90

    let current = new Date(graphData.minDate)
    while (current <= graphData.maxDate) {
      markers.push(new Date(current))
      current.setDate(current.getDate() + stepDays)
    }
    return markers
  }, [graphData.minDate, graphData.maxDate])

  const handleZoomIn = () => setZoom(z => Math.min(300, z + 20))
  const handleZoomOut = () => setZoom(z => Math.max(60, z - 20))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Interactive swimlane view showing tasks and milestones grouped by project phases.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 60}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'center' }}>
            {zoom}%
          </Typography>
          <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 300}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Warnings */}
      {graphData.cycles.length > 0 && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ borderRadius: 1.15 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Circular Predecessor Loop Detected!</Typography>
          <Typography variant="caption">
            The following tasks create a deadlock loop: <strong>{graphData.cycles.join(', ')}</strong>.
          </Typography>
        </Alert>
      )}

      {/* Diagram container */}
      <Box
        sx={{
          overflowX: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          bgcolor: isDark ? '#0f172a' : '#f8fafc',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: `${(zoom / 100) * 1200 + 200}px`,
            minWidth: '100%',
            position: 'relative',
            height: `${graphData.totalHeight}px`
          }}
        >
          {/* Header Row */}
          <Box sx={{ display: 'flex', borderBottom: 2, borderColor: 'divider', height: 44, bgcolor: isDark ? '#1e293b' : '#f1f5f9', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 }}>
            <Box sx={{ width: 160, borderRight: 2, borderColor: 'divider', display: 'flex', alignItems: 'center', px: 2, flexShrink: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Phases
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative', height: '100%' }}>
              {timelineMarkers.map((date, idx) => {
                const percent = ((date.getTime() - graphData.minDate.getTime()) / (graphData.maxDate.getTime() - graphData.minDate.getTime())) * 100
                return (
                  <Box
                    key={idx}
                    sx={{
                      position: 'absolute',
                      left: `${percent}%`,
                      top: 0,
                      bottom: 0,
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Typography>
                    <Box sx={{ width: 1, height: 6, bgcolor: 'divider', mt: 0.25 }} />
                  </Box>
                )
              })}
            </Box>
          </Box>

          {/* Milestones Swimlane */}
          {graphData.hasMilestones && (
            <Box
              sx={{
                display: 'flex',
                height: 60,
                borderBottom: 2,
                borderColor: 'divider',
                position: 'absolute',
                top: 44,
                left: 0,
                right: 0,
                zIndex: 3
              }}
            >
              <Box
                sx={{
                  width: 160,
                  borderRight: 2,
                  borderColor: 'divider',
                  bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  px: 2,
                  flexShrink: 0
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FlagIcon sx={{ fontSize: 14 }} /> Project Milestones
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1, position: 'relative', height: '100%' }}>
                {graphData.visualMilestones.map(m => (
                  <Tooltip
                    key={m.id}
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>{m.name}</Typography>
                        <Typography variant="caption">Date: {m.date.toLocaleDateString()}</Typography>
                      </Box>
                    }
                    arrow
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${m.left}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        zIndex: 4,
                        transition: 'transform 0.1s',
                        '&:hover': { transform: 'translate(-50%, -55%) scale(1.1)' }
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          border: '2.5px solid white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 700, mt: 0.5, whiteSpace: 'nowrap', bgcolor: isDark ? '#0f172a' : '#f8fafc', px: 0.5, borderRadius: 0.5 }}>
                        {m.name}
                      </Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}

          {/* Swimlanes Body */}
          <Box sx={{ position: 'absolute', top: graphData.hasMilestones ? 104 : 44, left: 0, right: 0, bottom: 0 }}>
            {graphData.swimlanes.map(lane => (
              <Box
                key={lane.id}
                sx={{
                  display: 'flex',
                  height: lane.height,
                  borderBottom: 1,
                  borderColor: 'divider',
                  position: 'relative'
                }}
              >
                <Box
                  sx={{
                    width: 160,
                    borderRight: 2,
                    borderColor: 'divider',
                    bgcolor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: 2,
                    zIndex: 2,
                    flexShrink: 0
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', display: 'block' }}>
                    {lane.wbs}. {lane.name}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                    {lane.tasks.length} subtasks
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, position: 'relative', height: '100%' }}>
                  {/* Grid Lines */}
                  {timelineMarkers.map((date, idx) => {
                    const percent = ((date.getTime() - graphData.minDate.getTime()) / (graphData.maxDate.getTime() - graphData.minDate.getTime())) * 100
                    return (
                      <Box
                        key={idx}
                        sx={{
                          position: 'absolute',
                          left: `${percent}%`,
                          top: 0,
                          bottom: 0,
                          width: 1,
                          borderLeft: '1px dashed',
                          borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          pointerEvents: 'none'
                        }}
                      />
                    )
                  })}

                  {/* Tasks */}
                  {lane.tasks.map(node => {
                    const isComplete = node.status === '0'

                    let bgCol = isDark ? '#1e293b' : '#ffffff'
                    let borderCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    let textCol = 'text.primary'

                    if (node.onCriticalPath) {
                      bgCol = isDark ? '#7f1d1d' : '#fee2e2'
                      borderCol = '#ef4444'
                      textCol = isDark ? '#fee2e2' : '#991b1b'
                    } else if (isComplete) {
                      bgCol = isDark ? '#064e3b' : '#d1fae5'
                      borderCol = '#10b981'
                      textCol = isDark ? '#d1fae5' : '#065f46'
                    } else if (node.predecessorId) {
                      bgCol = isDark ? '#1e3a8a' : '#dbeafe'
                      borderCol = '#3b82f6'
                      textCol = isDark ? '#dbeafe' : '#1e40af'
                    }

                    return (
                      <Tooltip
                        key={node.id}
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
                              {node.name}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              Start: {node.startDate.toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              Finish: {node.endDate.toLocaleDateString()}
                            </Typography>
                            {node.blockingReason && (
                              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                                ⚠ {node.blockingReason}
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                      >
                        <Paper
                          id={`dependency-card-${node.id}`}
                          sx={{
                            position: 'absolute',
                            left: `${node.left}%`,
                            top: `${node.trackIndex * 46 + 10}px`,
                            width: `${node.width}%`,
                            minWidth: '130px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            borderRadius: 2,
                            bgcolor: bgCol,
                            border: '1.5px solid',
                            borderColor: borderCol,
                            boxShadow: 2,
                            zIndex: 3,
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                            '&:hover': {
                              transform: 'scale(1.02)',
                              boxShadow: 4,
                            }
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: textCol,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontSize: '0.68rem',
                              flexGrow: 1,
                              mr: 1
                            }}
                          >
                            {node.wbs ? `${node.wbs} ` : ''}{node.name}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            {node.isBlocked && <WarningIcon sx={{ fontSize: 13, color: '#f59e0b' }} />}
                            {node.isCycle && <ErrorIcon sx={{ fontSize: 13, color: '#ef4444' }} />}
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8, color: textCol, fontWeight: 800 }}>
                              {node.progress}%
                            </Typography>
                          </Box>
                        </Paper>
                      </Tooltip>
                    )
                  })}
                </Box>
              </Box>
            ))}
          </Box>

          {/* SVG Connection Lines Layer (Mathematically computed coordinates in pixels) */}
          {(() => {
            const timelineWidth = (zoom / 100) * 1200 + 40
            return (
              <svg
                width={timelineWidth}
                height={graphData.totalHeight}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 160, // offset by the left swimlane header width
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3b82f6" />
                  </marker>
                  <marker id="arrow-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ef4444" />
                  </marker>
                  <marker id="arrow-blocked" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
                  </marker>
                </defs>
                {Array.from(graphData.nodesMap.values()).map(node => {
                  if (!node.predecessorId) return null

                  const predNode = graphData.nodesMap.get(node.predecessorId)
                  if (!predNode) return null

                  // 1. Find tasks in their respective swimlanes
                  const predLaneId = predNode.wbs ? predNode.wbs.split('.')[0] : 'Other'
                  const succLaneId = node.wbs ? node.wbs.split('.')[0] : 'Other'

                  const predLaneTop = graphData.laneTops.get(predLaneId)
                  const succLaneTop = graphData.laneTops.get(succLaneId)

                  if (predLaneTop === undefined || succLaneTop === undefined) return null

                  // 2. Compute exact coordinates mathematically in pixels
                  const startXPercent = predNode.left + predNode.width
                  const endXPercent = node.left

                  const startX = (startXPercent / 100) * timelineWidth
                  const endX = (endXPercent / 100) * timelineWidth

                  // Y coordinates in absolute pixels (accumulated lane heights)
                  const startY = predLaneTop + predNode.trackIndex * 46 + 10 + 17
                  const endY = succLaneTop + node.trackIndex * 46 + 10 + 17

                  const strokeColor = node.isCycle
                    ? '#ef4444'
                    : node.isBlocked
                      ? '#f59e0b'
                      : node.onCriticalPath
                        ? '#ef4444'
                        : '#3b82f6'

                  const markerId = node.isCycle || node.onCriticalPath
                    ? 'arrow-critical'
                    : node.isBlocked
                      ? 'arrow-blocked'
                      : 'arrow'

                  const isDashed = node.isBlocked || node.isCycle

                  // Render elbow connectors using unitless absolute pixel paths
                  return (
                    <g key={`arrow-${predNode.id}-${node.id}`}>
                      <path
                        d={`M ${startX} ${startY} C ${startX + (endX - startX) / 2} ${startY}, ${startX + (endX - startX) / 2} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={node.onCriticalPath || isDashed ? 2 : 1.25}
                        strokeDasharray={isDashed ? '4,3' : 'none'}
                        opacity={0.7}
                        markerEnd={`url(#${markerId})`}
                      />
                    </g>
                  )
                })}
              </svg>
            )
          })()}

        </Box>
      </Box>

      {/* Legend Block */}
      <Box sx={{ display: 'flex', gap: 2.5, px: 1.5, py: 1, border: 1, borderColor: 'divider', borderRadius: 1.15, flexWrap: 'wrap', bgcolor: isDark ? 'transparent' : '#ffffff' }}>
        {[
          { c: '#ef4444', l: 'Critical Path / Prototype' },
          { c: '#3b82f6', l: 'Standard Dependency / Integration' },
          { c: '#10b981', l: 'Completed Task' },
          { c: '#f59e0b', l: 'Blocked / Scheduling Conflict', isDashed: true },
        ].map((x, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 16,
                height: 4,
                bgcolor: x.isDashed ? 'transparent' : x.c,
                borderTop: x.isDashed ? `2px dashed ${x.c}` : 'none'
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {x.l}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
