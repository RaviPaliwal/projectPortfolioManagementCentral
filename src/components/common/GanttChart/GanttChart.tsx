import { useMemo, useRef, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import FitScreenIcon from '@mui/icons-material/FitScreen'

export interface GanttTaskData {
  id: string
  name: string
  wbs?: string
  startDate: string
  endDate: string
  percentComplete: number
  isMilestone?: boolean
  onCriticalPath?: boolean
  level?: number
  status?: string
  predecessorId?: string
  lagDays?: number
}

export interface GanttMilestoneData {
  id: string
  name: string
  date: string
  status?: string
}

export interface GanttChartProps {
  tasks: GanttTaskData[]
  milestones?: GanttMilestoneData[]
  onTaskClick?: (taskId: string) => void
  height?: number | string
}

const ROW_HEIGHT = 38
const BAR_HEIGHT = 24
const HEADER_HEIGHT = 62
const NAME_WIDTH = 240
const PADDING_DAYS = 14
const MIN_DAY_WIDTH = 10
const MAX_DAY_WIDTH = 60
const DEFAULT_DAY_WIDTH = 24

const getDaysBetween = (start: Date, end: Date): number => {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const formatMonth = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const getMonday = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

const getTaskColor = (task: GanttTaskData, isDark: boolean): string => {
  if (task.isMilestone) return '#f59e0b'
  if (task.onCriticalPath) return '#ef4444'
  if (String(task.status) === '0') return '#22c55e'
  return isDark ? '#60a5fa' : '#3b82f6'
}

const getStatusLabel = (status?: string): string => {
  if (String(status) === '0') return 'Complete'
  if (String(status) === '1') return 'In Progress'
  return 'Pending'
}

export default function GanttChart({ tasks, milestones, onTaskClick, height }: GanttChartProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  const allItems = useMemo(() => {
    const items = [...tasks]
    if (milestones) {
      for (const ms of milestones) {
        if (!items.some((t) => t.id === ms.id)) {
          items.push({
            id: ms.id, name: ms.name, startDate: ms.date, endDate: ms.date,
            percentComplete: String(ms.status) === '2' ? 100 : 0,
            isMilestone: true, level: 1, status: ms.status,
          })
        }
      }
    }
    return items
  }, [tasks, milestones])

  const { startDate, endDate, totalDays } = useMemo(() => {
    if (allItems.length === 0) {
      const now = new Date()
      return { startDate: addDays(now, -30), endDate: addDays(now, 30), totalDays: 60 }
    }
    let minDate: Date | null = null
    let maxDate: Date | null = null
    for (const item of allItems) {
      if (!item.startDate) continue
      const s = new Date(item.startDate)
      const e = item.endDate ? new Date(item.endDate) : new Date(item.startDate)
      if (!minDate || s < minDate) minDate = s
      if (!maxDate || e > maxDate) maxDate = e
    }
    if (!minDate || !maxDate) {
      const now = new Date()
      return { startDate: addDays(now, -30), endDate: addDays(now, 30), totalDays: 60 }
    }
    const st = addDays(minDate, -PADDING_DAYS)
    const en = addDays(maxDate, PADDING_DAYS)
    return { startDate: st, endDate: en, totalDays: getDaysBetween(st, en) }
  }, [allItems])

  const monthMarkers = useMemo(() => {
    const markers: Array<{ x: number; label: string; width: number }> = []
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (current <= endDate) {
      const monthStart = new Date(current)
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1)
      const monthEnd = nextMonth > endDate ? addDays(endDate, 1) : nextMonth
      markers.push({
        x: getDaysBetween(startDate, monthStart) * dayWidth,
        label: formatMonth(monthStart),
        width: getDaysBetween(monthStart, monthEnd) * dayWidth,
      })
      current = nextMonth
    }
    return markers
  }, [startDate, endDate, dayWidth])

  const weekMarkers = useMemo(() => {
    const markers: Array<{ x: number; day: number }> = []
    let current = getMonday(startDate)
    while (current <= endDate) {
      markers.push({ x: getDaysBetween(startDate, current) * dayWidth, day: current.getDate() })
      current = addDays(current, 7)
    }
    return markers
  }, [startDate, endDate, dayWidth])

  const todayX = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return getDaysBetween(startDate, today) * dayWidth
  }, [startDate, dayWidth])

  const itemPositions = useMemo(() => {
    return allItems.map((item, index) => ({ y: HEADER_HEIGHT + index * ROW_HEIGHT, item }))
  }, [allItems])

  const itemById = useMemo(() => {
    const map = new Map<string, GanttTaskData>()
    for (const item of allItems) map.set(item.id, item)
    return map
  }, [allItems])

  const svgWidth = totalDays * dayWidth + 20
  const totalHeight = HEADER_HEIGHT + allItems.length * ROW_HEIGHT + 20

  const handleZoomIn = useCallback(() => setDayWidth((p) => Math.min(MAX_DAY_WIDTH, p + 4)), [])
  const handleZoomOut = useCallback(() => setDayWidth((p) => Math.max(MIN_DAY_WIDTH, p - 4)), [])
  const handleZoomToFit = useCallback(() => {
    if (scrollRef.current && totalDays > 0) {
      const cw = scrollRef.current.clientWidth - NAME_WIDTH - 80
      setDayWidth(Math.max(MIN_DAY_WIDTH, Math.min(MAX_DAY_WIDTH, Math.floor(cw / totalDays))))
    }
  }, [totalDays])

  const dependencyArrows = useMemo(() => {
    const arrows: Array<{ path: string; isCritical: boolean }> = []
    for (const item of allItems) {
      if (!item.predecessorId) continue
      const pred = itemById.get(item.predecessorId)
      if (!pred) continue
      const predPos = itemPositions.find((p) => p.item.id === pred.id)
      const itemPos = itemPositions.find((p) => p.item.id === item.id)
      if (!predPos || !itemPos) continue
      const pX = getDaysBetween(startDate, new Date(pred.endDate)) * dayWidth
      const pY = predPos.y + ROW_HEIGHT / 2
      const iX = getDaysBetween(startDate, new Date(item.startDate)) * dayWidth + (item.lagDays ?? 0) * dayWidth
      const iY = itemPos.y + ROW_HEIGHT / 2
      const mX = (pX + iX) / 2
      arrows.push({
        path: `M ${pX} ${pY} L ${mX} ${pY} L ${mX} ${iY} L ${iX} ${iY}`,
        isCritical: !!(pred.onCriticalPath || item.onCriticalPath),
      })
    }
    return arrows
  }, [allItems, itemById, itemPositions, startDate, dayWidth])

  const getTaskBar = (item: GanttTaskData, y: number) => {
    const startX = getDaysBetween(startDate, new Date(item.startDate)) * dayWidth
    const endX = item.isMilestone ? startX : getDaysBetween(startDate, new Date(item.endDate)) * dayWidth
    const w = Math.max(item.isMilestone ? 14 : 4, endX - startX)
    return { x: startX, y: y + (ROW_HEIGHT - BAR_HEIGHT) / 2, width: w }
  }

  const ArrowHead = ({ path, isCritical }: { path: string; isCritical: boolean }) => {
    const parts = path.split(' ')
    const lx = parseFloat(parts[parts.length - 3])
    const ly = parseFloat(parts[parts.length - 1])
    const fill = isCritical ? '#ef4444' : isDark ? '#94a3b8' : '#64748b'
    return <polygon points={`${lx - 4},${ly - 3} ${lx},${ly} ${lx - 4},${ly + 3}`} fill={fill} opacity={0.6} />
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* Zoom controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', px: 1 }}>
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn} disabled={dayWidth >= MAX_DAY_WIDTH}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut} disabled={dayWidth <= MIN_DAY_WIDTH}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to Screen">
          <IconButton size="small" onClick={handleZoomToFit}>
            <FitScreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, minWidth: 48, textAlign: 'right' }}>
          {dayWidth}px/d
        </Typography>
      </Box>

      {/* Scrollable container */}
      <Box
        ref={scrollRef}
        sx={{
          overflow: 'auto',
          border: 1, borderColor: 'divider', borderRadius: 1.15,
          bgcolor: isDark ? '#0f172a' : '#ffffff',
          height: height ?? 480,
        }}
      >
        <Box sx={{ display: 'flex', minHeight: totalHeight, position: 'relative' }}>
          {/* Name column (sticky left) */}
          <Box sx={{
            width: NAME_WIDTH, flexShrink: 0,
            borderRight: 1, borderColor: 'divider',
            bgcolor: isDark ? '#1e293b' : '#f8fafc',
            position: 'sticky', left: 0, zIndex: 10,
          }}>
            <Box sx={{
              height: HEADER_HEIGHT, display: 'flex', alignItems: 'flex-end',
              px: 1.5, pb: 1.5, borderBottom: 2, borderColor: 'divider',
            }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                Task Name
              </Typography>
            </Box>
            {itemPositions.map(({ y, item }) => (
              <Box
                key={item.id}
                onMouseEnter={() => setHoveredTaskId(item.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                onClick={() => onTaskClick?.(item.id)}
                sx={{
                  position: 'absolute', top: y, left: 0, right: 0, height: ROW_HEIGHT,
                  display: 'flex', alignItems: 'center', px: 1.5, gap: 1,
                  cursor: onTaskClick ? 'pointer' : 'default',
                  bgcolor: hoveredTaskId === item.id
                    ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)')
                    : 'transparent',
                  transition: 'background-color 0.1s',
                  borderBottom: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                }}
              >
                {item.level && item.level > 1 && (
                  <Box sx={{ width: 3, height: 20, borderRadius: 1.15, bgcolor: getTaskColor(item, isDark), flexShrink: 0, opacity: 0.5 }} />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: item.level && item.level <= 1 ? 700 : 500,
                      fontSize: item.level && item.level <= 1 ? '0.78rem' : '0.72rem',
                      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: String(item.status) === '0' ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {item.wbs ? `${item.wbs} ` : ''}{item.name}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                    {item.isMilestone ? '⚑ Milestone' : `${getStatusLabel(item.status)} · ${item.percentComplete}%`}
                  </Typography>
                </Box>
                {item.onCriticalPath && !item.isMilestone && (
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#ef4444', flexShrink: 0 }} title="Critical Path" />
                )}
              </Box>
            ))}
          </Box>

          {/* SVG Timeline */}
          <svg width={svgWidth} height={totalHeight} style={{ display: 'block', minWidth: svgWidth }}>
            {/* Month alternating backgrounds */}
            {monthMarkers.map((m, i) => (
              <rect key={`mb-${i}`} x={m.x} y={0} width={m.width} height={totalHeight}
                fill={i % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent'} />
            ))}

            {/* Week grid lines */}
            {weekMarkers.map((w, i) => (
              <line key={`wl-${i}`} x1={w.x} y1={HEADER_HEIGHT} x2={w.x} y2={totalHeight}
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth={1} />
            ))}

            {/* Month header with week day numbers */}
            {monthMarkers.map((m, i) => (
              <g key={`mh-${i}`}>
                <rect x={m.x} y={0} width={m.width} height={HEADER_HEIGHT} fill="transparent" />
                <text x={m.x + 8} y={22} fill={theme.palette.text.secondary} fontSize={11} fontWeight={700} fontFamily="inherit">
                  {m.label}
                </text>
                {weekMarkers.filter((w) => w.x >= m.x && w.x < m.x + m.width).map((w, wi) => (
                  <text key={`d-${wi}`} x={w.x + 3} y={46} fill={theme.palette.text.disabled} fontSize={9} fontFamily="inherit">
                    {w.day}
                  </text>
                ))}
              </g>
            ))}

            {/* Header bottom line */}
            <line x1={0} y1={HEADER_HEIGHT} x2={svgWidth} y2={HEADER_HEIGHT} stroke={theme.palette.divider} strokeWidth={2} />

            {/* Row stripes */}
            {itemPositions.map(({ y }, i) => (
              <rect key={`rb-${i}`} x={0} y={y} width={svgWidth} height={ROW_HEIGHT}
                fill={i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)')} />
            ))}

            {/* Row hover highlights */}
            {itemPositions.map(({ y, item }) => hoveredTaskId === item.id && (
              <rect key={`rh-${item.id}`} x={0} y={y} width={svgWidth} height={ROW_HEIGHT}
                fill={isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.03)'} />
            ))}

            {/* Dependency arrows */}
            {dependencyArrows.map((arrow, i) => (
              <g key={`da-${i}`}>
                <path d={arrow.path} fill="none"
                  stroke={arrow.isCritical ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b')}
                  strokeWidth={1.5}
                  strokeDasharray={arrow.isCritical ? 'none' : '5,3'} opacity={0.6} />
                <ArrowHead path={arrow.path} isCritical={arrow.isCritical} />
              </g>
            ))}

            {/* Task bars and milestones */}
            {itemPositions.map(({ y, item }) => {
              const { x: bx, y: by, width: bw } = getTaskBar(item, y)
              const bc = getTaskColor(item, isDark)

              if (item.isMilestone) {
                const cx = bx
                const cy = by + BAR_HEIGHT / 2
                return (
                  <polygon key={`ms-${item.id}`}
                    points={`${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`}
                    fill={bc} stroke={isDark ? '#1e293b' : '#fff'} strokeWidth={1.5}
                    style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                    onClick={() => onTaskClick?.(item.id)}>
                    <title>{item.name}</title>
                  </polygon>
                )
              }

              const pw = bw * (item.percentComplete / 100)
              const isOver = String(item.status) !== '0' && !!item.endDate && new Date(item.endDate) < new Date()

              return (
                <g key={`tk-${item.id}`}>
                  {/* Bar background */}
                  <rect x={bx} y={by} width={bw} height={BAR_HEIGHT} rx={4} ry={4}
                    fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                    style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                    onClick={() => onTaskClick?.(item.id)} />
                  {/* Progress fill */}
                  {pw > 0 && (
                    <rect x={bx} y={by} width={Math.max(4, pw)} height={BAR_HEIGHT} rx={4} ry={4}
                      fill={bc} opacity={item.onCriticalPath ? 0.9 : 0.85}
                      style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                      onClick={() => onTaskClick?.(item.id)} />
                  )}
                  {/* Percentage label */}
                  <text x={bx + 6} y={by + BAR_HEIGHT / 2 + 1}
                    fill={isDark ? '#f1f5f9' : '#fff'} fontSize={10} fontWeight={600}
                    dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                    {item.percentComplete > 25 ? `${item.percentComplete}%` : ''}
                  </text>
                  {/* Overdue indicator */}
                  {isOver && (
                    <line x1={bx + bw + 2} y1={by} x2={bx + bw + 2} y2={by + BAR_HEIGHT}
                      stroke="#ef4444" strokeWidth={3} strokeLinecap="round" />
                  )}
                </g>
              )
            })}

            {/* Today marker */}
            {todayX > 0 && todayX < svgWidth && (
              <line x1={todayX} y1={0} x2={todayX} y2={totalHeight}
                stroke="#ef4444" strokeWidth={2} strokeDasharray="6,3" opacity={0.7}>
                <title>Today</title>
              </line>
            )}
          </svg>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, px: 1, flexWrap: 'wrap' }}>
        {[
          { c: '#3b82f6', l: 'Task', t: 'bar' },
          { c: '#f59e0b', l: 'Milestone', t: 'dia' },
          { c: '#ef4444', l: 'Critical Path', t: 'bar' },
          { c: '#64748b', l: 'Dependency', t: 'dash' },
          { c: '#ef4444', l: 'Today', t: 'dash2' },
          { c: '#22c55e', l: 'Complete', t: 'bar' },
        ].map((x) => (
          <Box key={x.l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {x.t === 'bar' && <Box sx={{ width: 14, height: 4, borderRadius: 1.15, bgcolor: x.c }} />}
            {x.t === 'dia' && (
              <Box sx={{
                width: 0, height: 0,
                borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                borderBottom: `8px solid ${x.c}`,
              }} />
            )}
            {x.t === 'dash' && <Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${x.c}`, opacity: 0.6 }} />}
            {x.t === 'dash2' && <Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${x.c}`, opacity: 0.7 }} />}
            <Typography variant="caption" color="text.secondary">{x.l}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
