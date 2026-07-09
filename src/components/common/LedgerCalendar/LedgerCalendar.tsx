import React from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import EventNoteIcon from '@mui/icons-material/EventNote'
import FlagIcon from '@mui/icons-material/Flag'

export interface CalendarEntry {
  date: string
  hours: number
  projectName?: string
  comment?: string
  type: string
}

export interface LedgerCalendarProps {
  year?: number
  month?: number
  startDate?: string
  endDate?: string
  entries: CalendarEntry[]
  interactive?: boolean
  selectedDates?: string[]
  onSelectDate?: (date: string) => void
  onDoubleClickDate?: (date: string) => void
  holidays?: Array<{ pm_holidaydate: string; pm_holidayname?: string }>
  dailyCapacity?: number
  hideLegend?: boolean
  colorMap?: Record<string, string>
}

const DEFAULT_COLORS: Record<string, string> = {
  chargeable: '#217C35',
  admin: '#6b7280',
  leave: '#f59e0b',
  sick: '#ef4444',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ')
}

export const LedgerCalendar: React.FC<LedgerCalendarProps> = ({
  year,
  month,
  startDate,
  endDate,
  entries,
  interactive = false,
  selectedDates = [],
  onSelectDate,
  onDoubleClickDate,
  holidays = [],
  hideLegend = false,
  colorMap = DEFAULT_COLORS,
}) => {
  const theme = useTheme()
  const todayStr = new Date().toISOString().split('T')[0]

  const holidayMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const h of holidays) {
      const d = h.pm_holidaydate?.split('T')[0]
      if (d) {
        map.set(d, h.pm_holidayname || 'Public Holiday')
      }
    }
    return map
  }, [holidays])

  let daysInMonth: number
  let startDow: number
  let calYear: number
  let calMonth: number

  if (year != null && month != null) {
    calYear = year
    calMonth = month
    const firstDay = new Date(year, month, 1)
    daysInMonth = new Date(year, month + 1, 0).getDate()
    startDow = firstDay.getDay()
  } else if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    calYear = start.getFullYear()
    calMonth = start.getMonth()
    daysInMonth = end.getDate()
    startDow = start.getDay()
  } else {
    const now = new Date()
    calYear = now.getFullYear()
    calMonth = now.getMonth()
    const firstDay = new Date(calYear, calMonth, 1)
    daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    startDow = firstDay.getDay()
  }

  const byDate = new Map<string, CalendarEntry[]>()
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, [])
    byDate.get(e.date)!.push(e)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getColor = (type: string) => colorMap[type] || colorMap['admin']

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5, mb: 0.5 }}>
        {DAYS.map((d) => (
          <Typography
            key={d}
            variant="caption"
            sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', pb: 0.3 }}
          >
            {d}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {cells.map((day, idx) => {
          if (!day) return <Box key={`blank-${idx}`} sx={{ borderRadius: 1, minHeight: 56 }} />

          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dow = (startDow + day - 1) % 7
          const isWeekend = dow === 0 || dow === 6
          const holidayName = holidayMap.get(dateStr)
          const isHoliday = !!holidayName
          const isToday = dateStr === todayStr
          const isSelected = selectedDates.includes(dateStr)
          const dayEntries = byDate.get(dateStr) || []
          const total = dayEntries.reduce((s, e) => s + e.hours, 0)
          const tooltipLines: string[] = []
          if (isHoliday) {
            tooltipLines.push(`Holiday: ${holidayName}`)
          }
          for (const e of dayEntries) {
            let line = `${e.hours}h ${e.type}`
            if (e.projectName) line += ` \u2022 ${e.projectName}`
            if (e.comment) line += ` \u2014 ${e.comment}`
            tooltipLines.push(line)
          }

          return (
            <Box
              key={dateStr}
              onClick={() => interactive && onSelectDate?.(dateStr)}
              onDoubleClick={() => interactive && onDoubleClickDate?.(dateStr)}
              title={tooltipLines.length > 0 ? tooltipLines.join('\n') : undefined}
              sx={{
                position: 'relative',
                borderRadius: 1,
                minHeight: 56,
                p: 0.5,
                border: isHoliday ? `1px dashed ${colorMap['leave']}` : '1px solid transparent',
                bgcolor: isSelected
                  ? `${theme.palette.primary.main}`
                  : isWeekend
                    ? 'action.hover'
                    : 'action.selected',
                opacity: isWeekend ? 0.8 : 1,
                cursor: interactive ? 'pointer' : 'default',
                boxShadow: isToday ? `inset 0 0 0 1.5px ${theme.palette.primary.main}` : undefined,
                color: isSelected ? '#fff' : 'text.primary',
                transition: 'background-color 0.15s',
                '&:hover': interactive ? { bgcolor: isSelected ? 'primary.dark' : 'action.focus' } : undefined,
              }}
            >
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: isSelected ? 'inherit' : 'text.secondary', fontWeight: 600 }}>
                {day}
              </Typography>
              {isHoliday && <FlagIcon sx={{ position: 'absolute', top: 2, right: 2, fontSize: 11, color: colorMap['leave'] }} />}
              {isHoliday && (
                <Typography
                  variant="caption"
                  title={holidayName}
                  sx={{
                    fontSize: '0.58rem',
                    display: 'block',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isSelected ? 'inherit' : 'warning.main',
                    fontWeight: 700,
                    mt: 0.5,
                    maxWidth: '100%',
                  }}
                >
                  {holidayName}
                </Typography>
              )}
              {dayEntries.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', height: 4, borderRadius: 0.5, overflow: 'hidden', mt: 1.5, mb: 0.3 }}>
                    {dayEntries.map((e, i) => (
                      <Box
                        key={i}
                        sx={{ flex: e.hours, bgcolor: getColor(e.type), borderRadius: 0.3 }}
                      />
                    ))}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.63rem', display: 'block', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: isSelected ? 'inherit' : 'text.primary', mb: 0.2 }}
                  >
                    {total}h
                  </Typography>
                  {dayEntries.map((e, i) => (
                    <Typography
                      key={i}
                      variant="caption"
                      title={e.projectName || ''}
                      sx={{
                        fontSize: '0.6rem', display: 'block', lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: isSelected ? 'inherit' : 'text.secondary',
                        maxWidth: '100%',
                      }}
                    >
                      {e.projectName || ''}
                    </Typography>
                  ))}
                </>
              )}
            </Box>
          )
        })}
      </Box>
      {!hideLegend && (
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mt: 2 }}>
          {Object.entries(DEFAULT_COLORS).map(([id, color]) => (
            <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
              <Typography color="text.secondary" sx={{ fontSize: '0.825rem', fontWeight: 600 }}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default LedgerCalendar