import { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Tooltip,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import VideocamIcon from '@mui/icons-material/Videocam'
import CloseIcon from '@mui/icons-material/Close'
import EventIcon from '@mui/icons-material/Event'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import { useUser } from '@/context/UserContext'
import {
  Pm_resourcesService,
  Pm_resourceallocationsService,
  Pm_projecttasksService,
  Pm_projectsService,
  GetOutlookEventsService,
  CreateOutlookEventService,
} from '@/generated'
import { unwrapList, normalizeLookupId, parseDataverseError } from '@/services'

interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM (24h format)
  endTime: string // HH:MM (24h format)
  description?: string
  meetingUrl?: string
  calendarId: string // 'work' | 'team' | 'finance' | 'milestones'
  color: string
}

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'current-1',
    title: 'PMO Weekly Review',
    date: '2026-06-17',
    startTime: '09:00',
    endTime: '10:00',
    description: 'Alignment meeting on portfolio milestones and health indicators.',
    calendarId: 'work',
    color: '#93c5fd',
  },
  {
    id: 'current-2',
    title: 'Budget Status Sync',
    date: '2026-06-17',
    startTime: '09:30',
    endTime: '10:30',
    description: 'Reviewing current quarter project forecasts and actuals.',
    calendarId: 'finance',
    color: '#5eead4',
  },
  {
    id: 'current-3',
    title: 'Client Portfolio Demo',
    date: '2026-06-17',
    startTime: '11:00',
    endTime: '12:00',
    description: 'Demonstrating PPM Central dashboard configurations to the main client stakeholder.',
    calendarId: 'milestones',
    color: '#fdba74',
  },
  {
    id: 'current-4',
    title: 'Sprint Planning',
    date: '2026-06-18',
    startTime: '10:00',
    endTime: '11:30',
    description: 'Planning upcoming release deliverables and developer assignments.',
    calendarId: 'milestones',
    color: '#fdba74',
  },
  // Outlook events with meeting URL (visible in current week)
  {
    id: 'outlook-join-1',
    title: 'Partner Architecture Sync',
    date: '2026-06-17',
    startTime: '14:00',
    endTime: '15:00',
    description: 'Regular sync with partnership technical contacts.',
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/19:outlook-demo1',
    calendarId: 'outlook',
    color: '#7dd3fc',
  },
  {
    id: 'outlook-join-2',
    title: 'Product Feedback Session',
    date: '2026-06-18',
    startTime: '15:00',
    endTime: '16:30',
    description: 'Reviewing user research and comments on the calendar view.',
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/19:outlook-demo2',
    calendarId: 'outlook',
    color: '#7dd3fc',
  },
  {
    id: '1',
    title: 'PMO Weekly Review',
    date: '2026-06-22',
    startTime: '10:00',
    endTime: '11:30',
    description: 'Alignment meeting on portfolio milestones and health indicators.',
    calendarId: 'work',
    color: '#93c5fd',
  },
  {
    id: '2',
    title: 'Budget Status Sync',
    date: '2026-06-23',
    startTime: '14:00',
    endTime: '15:30',
    description: 'Reviewing current quarter project forecasts and actuals.',
    calendarId: 'finance',
    color: '#5eead4',
  },
  {
    id: '3',
    title: 'Sprint Planning',
    date: '2026-06-24',
    startTime: '09:00',
    endTime: '10:30',
    description: 'Planning upcoming release deliverables and developer assignments.',
    calendarId: 'milestones',
    color: '#fdba74',
  },
  {
    id: '4',
    title: 'Client Portfolio Demo',
    date: '2026-06-25',
    startTime: '11:00',
    endTime: '12:00',
    description: 'Demonstrating PPM Central dashboard configurations to the main client stakeholder.',
    calendarId: 'milestones',
    color: '#fdba74',
  },
  {
    id: '5',
    title: 'Casual Team Social',
    date: '2026-06-26',
    startTime: '16:00',
    endTime: '17:00',
    description: 'Weekly team cool-down and casual updates.',
    calendarId: 'milestones',
    color: '#fdba74',
  },
]

const CALENDAR_TYPES = [
  { id: 'work', label: 'Work Calendar', color: '#93c5fd' },
  { id: 'finance', label: 'Project Milestone', color: '#5eead4' },
  { id: 'milestones', label: 'Project Task Deadline', color: '#fdba74' },
  { id: 'outlook', label: 'Outlook Events', color: '#7dd3fc' },
]

export default function CalendarPage() {
  const theme = useTheme()

  // Base calendar state
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'workweek' | 'week' | 'month'>('week')

  // Custom local events & remote Dataverse events
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [remoteEvents, setRemoteEvents] = useState<CalendarEvent[]>([])

  const { currentUser } = useUser()
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)

  // Loading & sync state for Outlook event creation
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // Sidebar controls
  const [activeCalendars, setActiveCalendars] = useState<Record<string, boolean>>({
    work: true,
    finance: true,
    milestones: true,
    outlook: true,
  })

  // Date helper formatting
  const formatDateString = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Load calendar tasks/allocations from Dataverse
  useEffect(() => {
    if (!currentUser?.systemuserid) {
      setRemoteEvents([])
      return
    }

    const loadData = async () => {
      setLoadingRemote(true)
      setRemoteError(null)
      try {
        const cleanUserId = normalizeLookupId(currentUser.systemuserid)
        if (!cleanUserId) return

        // Helper to match names flexibly (handles Ravi Paliwal vs Ravi Palliwal, extra spaces, case insensitivity, etc.)
        const matchNamesFlexibly = (n1: string, n2: string): boolean => {
          if (!n1 || !n2) return false
          const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '').replace(/ll/g, 'l')
          const c1 = clean(n1)
          const c2 = clean(n2)
          return c1 === c2 || c1.includes(c2) || c2.includes(c1)
        }

        // 1. Fetch all resources to find the one matching the current user
        const resourcesResult = await Pm_resourcesService.getAll({
          select: ['pm_resourceid', '_pm_systemuser_value', 'pm_fullname', 'pm_dailyworkcapacity'] as any,
          top: 500
        })

        if (resourcesResult && 'success' in resourcesResult && !resourcesResult.success) {
          throw new Error(`Resources query failed: ${parseDataverseError(resourcesResult)}`)
        }

        const resources = unwrapList<any>(resourcesResult)
        let currentResource = resources.find(
          r => normalizeLookupId(r._pm_systemuser_value) === cleanUserId
        )
        // Fallback: match by full name if the system user GUID mapping is empty/unset
        if (!currentResource) {
          currentResource = resources.find(
            r => matchNamesFlexibly(r.pm_fullname || '', currentUser.fullname || '')
          )
        }

        let resourceId: string | null = null
        if (currentResource) {
          resourceId = currentResource.pm_resourceid || null
        } else {
          console.warn('[CalendarPage] No resource record found for system user:', currentUser.fullname)
        }

        // 2. Fetch allocations, tasks, and projects in parallel (all active)
        const [allocationsResult, tasksResult, projectsResult] = await Promise.all([
          Pm_resourceallocationsService.getAll({
            select: [
              'pm_resourceallocationid',
              'pm_allocatedhours',
              'pm_allocationpercentage',
              'pm_assignmentrole',
              'pm_assignmentstatus',
              'pm_startdate',
              'pm_enddate',
              '_pm_project_value',
              '_pm_projecttask_value',
              '_pm_resource_value'
            ],
            top: 1000
          }),
          Pm_projecttasksService.getAll({
            select: [
              'pm_projecttaskid',
              'pm_taskname',
              'pm_plannedstartdate',
              'pm_plannedenddate',
              'pm_taskstatus',
              '_pm_project_value',
              'pm_percentcomplete'
            ] as any,
            top: 1000
          }),
          Pm_projectsService.getAll({
            select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', 'pm_plannedstartdate'],
            top: 500
          })
        ])

        if (allocationsResult && 'success' in allocationsResult && !allocationsResult.success) {
          throw new Error(`Allocations query failed: ${parseDataverseError(allocationsResult)}`)
        }
        if (tasksResult && 'success' in tasksResult && !tasksResult.success) {
          throw new Error(`Tasks query failed: ${parseDataverseError(tasksResult)}`)
        }
        if (projectsResult && 'success' in projectsResult && !projectsResult.success) {
          throw new Error(`Projects query failed: ${parseDataverseError(projectsResult)}`)
        }

        const allocations = unwrapList<any>(allocationsResult)
        const tasks = unwrapList<any>(tasksResult)
        const projects = unwrapList<any>(projectsResult)

        // Map project ID to project name and planned start date
        const projectMap = new Map<string, string>()
        const projectStartDateMap = new Map<string, string>()
        for (const p of projects) {
          const cleanPid = normalizeLookupId(p.pm_projectid)
          if (cleanPid) {
            if (p.pm_projectname) {
              projectMap.set(cleanPid, p.pm_projectname.trim())
            }
            if (p.pm_plannedstartdate) {
              projectStartDateMap.set(cleanPid, p.pm_plannedstartdate.split('T')[0])
            }
          }
        }

        const newMappedEvents: CalendarEvent[] = []

        // Helper to parse date without timezone issues
        const parseDateOnly = (dateStr: string) => {
          const d = new Date(dateStr)
          return new Date(d.getFullYear(), d.getMonth(), d.getDate())
        }

        // Filter allocations in-memory for the current user (by resource GUID or by name)
        const userAllocations = allocations.filter(alloc => {
          const cleanAssignedId = normalizeLookupId(alloc._pm_resource_value)
          const isIdMatch = resourceId && cleanAssignedId === resourceId

          const formattedValue = alloc['_pm_resource_value@OData.Community.Display.V1.FormattedValue']
          const assignedName = alloc.pm_resourcename || formattedValue || ''
          const isNameMatch = matchNamesFlexibly(assignedName, currentUser.fullname || '')

          return isIdMatch || isNameMatch
        })

        // Collect assigned project IDs from allocations
        const assignedProjectIds = new Set(
          userAllocations.map(a => normalizeLookupId(a._pm_project_value)).filter(Boolean) as string[]
        )

        // Collect assigned project task IDs from allocations
        const assignedProjectTaskIds = new Set(
          userAllocations.map(a => normalizeLookupId(a._pm_projecttask_value)).filter(Boolean) as string[]
        )

        // Show Project itself on its planned start date for projects the user is allocated to
        for (const projectId of assignedProjectIds) {
          const projName = projectMap.get(projectId) || 'Project'
          const plannedStart = projectStartDateMap.get(projectId)
          if (plannedStart) {
            newMappedEvents.push({
              id: `project-start-${projectId}-${plannedStart}`,
              title: `\u{1F680} Project Start: ${projName}`,
              date: plannedStart,
              startTime: '09:00',
              endTime: '11:00',
              calendarId: 'milestones', // Project Deadlines (orange)
              color: '#fdba74',
              description: `Planned start date of project: ${projName}`
            })
          }
        }

        // Map Allocations: Spanning allocation start and end dates with Project Name as title
        for (const alloc of userAllocations) {
          let startDateStr = alloc.pm_startdate
          let endDateStr = alloc.pm_enddate

          const projId = normalizeLookupId(alloc._pm_project_value)
          const projName = projId ? projectMap.get(projId) || 'Project' : 'Project'

          // Date Fallback: If allocation start/end dates are empty, read them from the linked project task
          const taskId = normalizeLookupId(alloc._pm_projecttask_value)
          if ((!startDateStr || !endDateStr) && taskId) {
            const linkedTask = tasks.find(t => normalizeLookupId(t.pm_projecttaskid) === taskId)
            if (linkedTask) {
              startDateStr = linkedTask.pm_plannedstartdate
              endDateStr = linkedTask.pm_plannedenddate
            }
          }

          if (!startDateStr || !endDateStr) continue

          const start = parseDateOnly(startDateStr)
          const end = parseDateOnly(endDateStr)

          // Allocation daily hours mapping based on percentage (dividing weekly hours by 40)
          const pct = alloc.pm_allocationpercentage || (alloc.pm_allocatedhours ? Math.round((alloc.pm_allocatedhours / 40) * 100) : 100)
          const dailyHours = Math.max(1, Math.round(8 * (pct / 100)))
          const endHour = 9 + dailyHours
          const startTimeStr = '09:00'
          const endTimeStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`

          // Show only on the last date (end date)
          const dateStr = formatDateString(end)
          newMappedEvents.push({
            id: `alloc-${alloc.pm_resourceallocationid}-${dateStr}`,
            title: projName, // Show Project Name on that date
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            calendarId: 'work', // Work Calendar (blue)
            color: '#93c5fd',
            description: `Project: ${projName}\nAllocated hours: ${alloc.pm_allocatedhours ?? '\u2014'}h/week as ${alloc.pm_assignmentrole || 'Team Member'}.\nAllocation percentage: ${pct}%.`
          })
        }

        // Filter tasks in-memory: Must be explicitly allocated to the user via Resource Allocation project task lookup
        const userTasks = tasks.filter(task => {
          const taskId = normalizeLookupId(task.pm_projecttaskid)
          return taskId && assignedProjectTaskIds.has(taskId)
        })

        // Map Tasks (showing only on their planned start dates)
        for (const task of userTasks) {
          if (!task.pm_plannedstartdate) continue
          const rawDate = task.pm_plannedstartdate
          const taskStartDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0]
          if (!taskStartDate) continue

          const projId = normalizeLookupId(task._pm_project_value)
          const projName = projId ? projectMap.get(projId) || '' : ''
          const labelSuffix = projName ? ` (${projName})` : ''

          const isMilestone = !!task.pm_ismilestone
          const categoryId = isMilestone ? 'finance' : 'milestones'
          const color = isMilestone ? '#5eead4' : '#fdba74' // Teal for milestones, Orange for task deadlines

          // Place tasks at 14:00 - 16:00 to avoid overlapping allocations in the morning
          const startTimeStr = '14:00'
          const endTimeStr = '16:00'

          newMappedEvents.push({
            id: `task-${task.pm_projecttaskid}-${taskStartDate}`,
            title: `${isMilestone ? '\u25C6 Milestone' : 'Task'}: ${task.pm_taskname}${labelSuffix}`,
            date: taskStartDate,
            startTime: startTimeStr,
            endTime: endTimeStr,
            calendarId: categoryId,
            color: color,
            description: `Project Task: ${task.pm_taskname}\nStart Date: ${taskStartDate}\nCompletion: ${task.pm_percentcomplete ?? 0}%\nStatus: ${task.pm_taskstatusname || task.pm_taskstatus || 'Active'}`
          })
        }

        // 3. Fetch Outlook events from the Power Automate flow
        let outlookEvents: CalendarEvent[] = []
        try {
          const flowStart = '2026-06-01T00:00:00Z'
          const flowEnd = '2026-07-31T23:59:59Z'

          const outlookResult = await GetOutlookEventsService.Run({
            text: flowStart,
            text_1: flowEnd
          })

          if (outlookResult && outlookResult.success && outlookResult.data?.event_json) {
            const parsed = JSON.parse(outlookResult.data.event_json)
            console.log('[CalendarPage] Raw Outlook Events from flow:', parsed)

            const eventObjects: any[] = []

            // Helper to recursively flatten and parse events
            const extractEvents = (val: any) => {
              if (Array.isArray(val)) {
                val.forEach(item => extractEvents(item))
              } else if (val && typeof val === 'object') {
                eventObjects.push(val)
              } else if (typeof val === 'string') {
                try {
                  const p = JSON.parse(val)
                  extractEvents(p)
                } catch (e) {
                  try {
                    const fn = new Function(`return ${val}`)
                    extractEvents(fn())
                  } catch (err) {
                    // Check if it's a key-value format string like "id: '...', subject: '...'"
                    if (val.includes('subject:') || val.includes('startdate:')) {
                      const getField = (fieldName: string) => {
                        const regex = new RegExp(`(?:^|,|\\\\s)${fieldName}:\\\\s*['\\"]?([^'\\"]+?)['\\"]?(?:,\\\\s*\\w+\\s*:|\\s*$)`, 'i')
                        const match = val.match(regex)
                        return match ? match[1].trim() : ''
                      }
                      const getBodyField = () => {
                        const regex = /(?:^|,|\\s)body:\\s*['\\"]?([\\s\\S]+?)(?:['\\"]?$)/i
                        const match = val.match(regex)
                        return match ? match[1].trim() : ''
                      }
                      eventObjects.push({
                        id: getField('id'),
                        subject: getField('subject'),
                        startdate: getField('startdate') || getField('start'),
                        enddate: getField('enddate') || getField('end'),
                        body: getBodyField() || getField('body'),
                        location: getField('location'),
                        onlinemeetingurl: getField('onlinemeetingurl')
                      })
                    }
                  }
                }
              }
            }

            extractEvents(parsed)

            // Helper to strip HTML tags for clean description rendering
            const stripHtml = (htmlStr: string): string => {
              if (!htmlStr) return ''
              if (!htmlStr.includes('<') && !htmlStr.includes('>')) return htmlStr
              try {
                const doc = new DOMParser().parseFromString(htmlStr, 'text/html')
                return doc.body.textContent || doc.body.innerText || ''
              } catch (e) {
                return htmlStr.replace(/<[^>]*>/g, '')
              }
            }

            outlookEvents = eventObjects.map((item: any, index: number) => {
              // Prioritize fields with timezone offsets first, then fallbacks (supporting startdate/enddate)
              const startIso = item.startWithTimeZone || item.start || item.Start || item.startdate || item.startDate || item.startDateTime?.dateTime || item.dueDateTime?.dateTime || item.createdDateTime || new Date().toISOString()
              const endIso = item.endWithTimeZone || item.end || item.End || item.enddate || item.endDate || item.endDateTime?.dateTime || item.dueDateTime?.dateTime || startIso

              // Helper to safely parse dates and handle 7-digit fractional seconds (Safari compatibility)
              const parseOutlookDate = (isoStr: string) => {
                let sanitized = isoStr.replace(/\.(\d{3})\d+/, '.$1')
                if (sanitized.includes('T') && !sanitized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(sanitized)) {
                  sanitized += 'Z'
                }
                return new Date(sanitized)
              }

              const startDateObj = parseOutlookDate(startIso)
              let endDateObj = parseOutlookDate(endIso)

              // Default task/event duration to 1 hour if start time equals end time
              if (startDateObj.getTime() === endDateObj.getTime()) {
                endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000)
              }

              const dateStr = formatDateString(startDateObj)

              const startHour = String(startDateObj.getHours()).padStart(2, '0')
              const startMin = String(startDateObj.getMinutes()).padStart(2, '0')
              const endHour = String(endDateObj.getHours()).padStart(2, '0')
              const endMin = String(endDateObj.getMinutes()).padStart(2, '0')

              const isTask = !!(item.dueDateTime || item.createdDateTime || item.status)

              // Fetch description/body content and clean HTML tags if needed
              const rawDesc = item.description || item.Description || item.body || item.Body || (isTask ? 'Imported Outlook Task' : 'Imported Outlook Event')
              let cleanDesc = typeof rawDesc === 'string' ? stripHtml(rawDesc).trim() : ''

              // Extract meeting URL from various possible field names
              const rawMeetingUrl = item.onlineMeetingUrl || item.OnlineMeetingUrl ||
                item.onlinemeetingurl || item.onlineMeeting?.joinUrl ||
                item.joinUrl || item.meetingUrl || item.webLink || ''
              let meetingUrl = rawMeetingUrl && rawMeetingUrl.startsWith('http') ? rawMeetingUrl : undefined

              // Extract meeting URL from description if not already set
              if (!meetingUrl && cleanDesc) {
                const teamsMatch = cleanDesc.match(/https:\/\/[^\s"'<>]*(?:teams\.microsoft\.com|teams\.live\.com)[^\s"'<>]+/i)
                if (teamsMatch) {
                  meetingUrl = teamsMatch[0]
                }
              }

              // Strip the Teams meeting footer details from description (Microsoft Teams meeting, Join, Meeting ID, Passcode)
              if (cleanDesc) {
                const markers = [
                  /________________________________________________________________________________/i,
                  /Microsoft Teams meeting/i,
                  /Join on your computer/i,
                  /Join Microsoft Teams Meeting/i,
                  /Join:\s*https:\/\/teams\.microsoft\.com/i
                ]
                for (const marker of markers) {
                  const matchIndex = cleanDesc.search(marker)
                  if (matchIndex !== -1) {
                    cleanDesc = cleanDesc.substring(0, matchIndex).trim()
                    break
                  }
                }
              }

              return {
                id: `outlook-${item.id || index}`,
                title: item.subject || item.Subject || (isTask ? 'Outlook Task' : 'Outlook Event'),
                date: dateStr,
                startTime: `${startHour}:${startMin}`,
                endTime: `${endHour}:${endMin}`,
                calendarId: 'outlook',
                color: '#7dd3fc',
                description: cleanDesc,
                ...(meetingUrl ? { meetingUrl } : {}),
              }
            })
            console.log('[CalendarPage] Mapped Outlook Events:', outlookEvents)
          } else {
            console.warn('[CalendarPage] Flow returned unsuccessful result or empty event_json:', outlookResult)
            throw new Error('Flow result unsuccessful')
          }
        } catch (flowErr) {
          console.warn('[CalendarPage] Could not load Outlook events from flow:', flowErr)
          outlookEvents = []
        }

        newMappedEvents.push(...outlookEvents)

        setRemoteEvents(newMappedEvents)

        // Focused on actual system date (currentDate is initialized to new Date() and does not auto-shift)
      } catch (err: any) {
        console.error('[CalendarPage] load error:', err)
        setRemoteError(err.message || 'Unable to retrieve allocations and tasks.')
      } finally {
        setLoadingRemote(false)
      }
    }

    loadData()
  }, [currentUser, reloadTick])

  // Modal & Popup dialog states
  const [isNewEventOpen, setIsNewEventOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // New Event Form State
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('2026-06-22')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('10:00')
  const [newDescription, setNewDescription] = useState('')

  // Hours to show in hourly grid (8:00 to 20:00)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8)

  // Mini-Calendar logic for sidebar
  const miniCalDate = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate])

  const miniCalDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()

    const days: Array<{ dayNum: number | null; dateObj: Date | null }> = []
    // Pad previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateObj: null })
    }
    // Present month days
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        dayNum: i,
        dateObj: new Date(year, month, i),
      })
    }
    return days
  }, [currentDate])

  const handleMiniCalDayClick = (dateObj: Date | null) => {
    if (dateObj) {
      setCurrentDate(dateObj)
    }
  }

  // Calculate start of current week/period
  const currentWeekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to start on Monday
    startOfWeek.setDate(diff)

    const days: Date[] = []
    const count = viewMode === 'workweek' ? 5 : 7
    for (let i = 0; i < count; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }, [currentDate, viewMode])

  // Navigation Logic
  const handleNext = () => {
    const nextDate = new Date(currentDate)
    if (viewMode === 'day') {
      nextDate.setDate(currentDate.getDate() + 1)
    } else if (viewMode === 'workweek' || viewMode === 'week') {
      nextDate.setDate(currentDate.getDate() + 7)
    } else {
      nextDate.setMonth(currentDate.getMonth() + 1)
    }
    setCurrentDate(nextDate)
  }

  const handlePrev = () => {
    const prevDate = new Date(currentDate)
    if (viewMode === 'day') {
      prevDate.setDate(currentDate.getDate() - 1)
    } else if (viewMode === 'workweek' || viewMode === 'week') {
      prevDate.setDate(currentDate.getDate() - 7)
    } else {
      prevDate.setMonth(currentDate.getMonth() - 1)
    }
    setCurrentDate(prevDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Combine local and remote events
  const combinedEvents = useMemo(() => {
    return [...remoteEvents, ...events]
  }, [remoteEvents, events])

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return combinedEvents.filter((e) => activeCalendars[e.calendarId])
  }, [combinedEvents, activeCalendars])

  // Get active range label
  const rangeLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    const firstDay = currentWeekDays[0]
    const lastDay = currentWeekDays[currentWeekDays.length - 1]
    if (!firstDay || !lastDay) return ''

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    if (firstDay.getFullYear() !== lastDay.getFullYear()) {
      return `${firstDay.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
    }
    return `${firstDay.toLocaleDateString('en-US', options)} - ${lastDay.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
  }, [currentDate, viewMode, currentWeekDays])

  // Open Event Dialog for a specific slot
  const handleCellClick = (dateStr: string, hourStr: number) => {
    setNewDate(dateStr)
    const formattedHour = hourStr < 10 ? `0${hourStr}:00` : `${hourStr}:00`
    const formattedEndHour = hourStr + 1 < 10 ? `0${hourStr + 1}:00` : `${hourStr + 1}:00`
    setNewStartTime(formattedHour)
    setNewEndTime(formattedEndHour)
    setNewTitle('')
    setNewDescription('')
    setIsNewEventOpen(true)
  }

  // Add Event Form Submission — always creates an Outlook event
  const handleCreateEvent = async () => {
    if (!newTitle.trim()) return
    setCreatingEvent(true)
    setCreateError(null)
    try {
      const startDateTime = `${newDate}T${newStartTime}:00`
      const endDateTime = `${newDate}T${newEndTime}:00`

      const result = await CreateOutlookEventService.Run({
        text: newTitle,
        text_1: startDateTime,
        text_2: endDateTime,
        text_3: newDescription,
      })

      if (result && result.success) {
        setReloadTick((prev) => prev + 1)
        setIsNewEventOpen(false)
      } else {
        const errMsg = result?.error
          ? (typeof result.error === 'string' ? result.error : (result.error as any).message || JSON.stringify(result.error))
          : 'Failed to create event in Outlook'
        throw new Error(errMsg)
      }
    } catch (err: any) {
      console.error('[CalendarPage] Error creating Outlook event:', err)
      setCreateError(err.message || 'Failed to create event in Outlook.')
    } finally {
      setCreatingEvent(false)
    }
  }

  // Delete Event
  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setSelectedEvent(null)
  }

  // Open meeting URL in a new tab
  const handleJoinMeeting = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Utility to darken a hex color by a given amount (0-255)
  const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, (num >> 16) - amount)
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount)
    const b = Math.max(0, (num & 0x0000FF) - amount)
    return `rgb(${r}, ${g}, ${b})`
  }

  // ─── Overlap-aware event layout engine ──────────────────────────────────────
  // Groups events into overlapping clusters, assigns each to a column using a
  // greedy algorithm, and returns pixel-perfect absolute positions per event.
  interface EventLayout {
    top: string
    height: string
    left: string
    width: string
    isOverlapping: boolean
  }

  const getEventLayouts = (eventList: CalendarEvent[]): Map<string, EventLayout> => {
    const result = new Map<string, EventLayout>()
    if (eventList.length === 0) return result

    // Helper: minutes from 8 AM
    const toMin = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return (h - 8) * 60 + m
    }

    // Sort by start time (ascending), then by duration (longest first)
    const sorted = [...eventList].sort((a, b) => {
      const aS = toMin(a.startTime)
      const bS = toMin(b.startTime)
      if (aS !== bS) return aS - bS
      return toMin(b.endTime) - toMin(a.endTime)
    })

    let i = 0
    while (i < sorted.length) {
      // Find the group of overlapping events
      const group: CalendarEvent[] = [sorted[i]]
      let groupEnd = toMin(sorted[i].endTime)
      let j = i + 1
      while (j < sorted.length) {
        const currStart = toMin(sorted[j].startTime)
        if (currStart < groupEnd) {
          group.push(sorted[j])
          groupEnd = Math.max(groupEnd, toMin(sorted[j].endTime))
          j++
        } else {
          break
        }
      }

      // Greedy column assignment within the group
      const columns: string[][] = []         // each inner array = column of event IDs
      const colEndTimes: number[] = []       // end time of the last event in each column

      for (const evt of group) {
        const evtStart = toMin(evt.startTime)
        const evtEnd = toMin(evt.endTime)

        let placed = false
        for (let col = 0; col < colEndTimes.length; col++) {
          if (colEndTimes[col] <= evtStart) {
            columns[col].push(evt.id)
            colEndTimes[col] = evtEnd
            placed = true
            break
          }
        }

        if (!placed) {
          columns.push([evt.id])
          colEndTimes.push(evtEnd)
        }
      }

      // Compute absolute positions for every event in the group
      const totalCols = columns.length
      const isOverlapping = totalCols > 1

      for (let col = 0; col < totalCols; col++) {
        for (const evtId of columns[col]) {
          const evt = group.find(e => e.id === evtId)!
          const evtStart = toMin(evt.startTime)
          const evtEnd = toMin(evt.endTime)

          if (isOverlapping) {
            const colWidth = 100 / totalCols
            result.set(evtId, {
              top: `${Math.max(0, evtStart)}px`,
              height: `${Math.max(8, evtEnd - evtStart)}px`,
              left: `${col * colWidth + 0.5}%`,
              width: `${colWidth - 1}%`,
              isOverlapping: true,
            })
          } else {
            result.set(evtId, {
              top: `${Math.max(0, evtStart)}px`,
              height: `${Math.max(8, evtEnd - evtStart)}px`,
              left: '4px',
              width: 'calc(100% - 8px)',
              isOverlapping: false,
            })
          }
        }
      }

      i = j // advance past the group
    }

    return result
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 120px)', mt: 1 }}>
      {/* ─── LEFT SIDEBAR PANEL ─── */}
      <Box sx={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Title */}
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          Calendar
        </Typography>

        {/* Mini Calendar View */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Typography>
            <Box>
              <IconButton size="small" onClick={() => {
                const prev = new Date(currentDate)
                prev.setMonth(currentDate.getMonth() - 1)
                setCurrentDate(prev)
              }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => {
                const next = new Date(currentDate)
                next.setMonth(currentDate.getMonth() + 1)
                setCurrentDate(next)
              }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, textAlign: 'center', mb: 1 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Typography key={idx} variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem' }}>
                {day}
              </Typography>
            ))}
            {miniCalDays.map((item, idx) => {
              const isSelected = item.dateObj && formatDateString(item.dateObj) === formatDateString(currentDate)
              const isToday = item.dateObj && formatDateString(item.dateObj) === formatDateString(new Date())
              return (
                <Box
                  key={idx}
                  onClick={() => handleMiniCalDayClick(item.dateObj)}
                  sx={{
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    cursor: item.dayNum ? 'pointer' : 'default',
                    fontSize: '0.75rem',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                    color: isSelected
                      ? 'primary.contrastText'
                      : isToday
                        ? 'primary.main'
                        : item.dayNum
                          ? 'text.primary'
                          : 'text.disabled',
                    border: isToday && !isSelected ? `1px solid ${theme.palette.primary.main}` : 'none',
                    '&:hover': {
                      bgcolor: item.dayNum && !isSelected ? 'action.hover' : undefined,
                    },
                  }}
                >
                  {item.dayNum}
                </Box>
              )
            })}
          </Box>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewTitle('')
              setNewDescription('')
              setNewDate(formatDateString(currentDate))
              setCreateError(null)
              setIsNewEventOpen(true)
            }}
            sx={{ mt: 1.5, textTransform: 'none', borderRadius: 1.5 }}
          >
            Add calendar
          </Button>
        </Paper>

        {/* Calendar Selection Checkboxes */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            flexGrow: 1,
            overflow: 'auto',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            My calendars
          </Typography>
          <FormGroup>
            {CALENDAR_TYPES.map((type) => (
              <FormControlLabel
                key={type.id}
                control={
                  <Checkbox
                    size="small"
                    checked={activeCalendars[type.id]}
                    onChange={(e) =>
                      setActiveCalendars((prev) => ({ ...prev, [type.id]: e.target.checked }))
                    }
                    sx={{
                      color: type.color,
                      '&.Mui-checked': {
                        color: type.color,
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.825rem' }}>
                    {type.label}
                  </Typography>
                }
                sx={{ mb: 0.5 }}
              />
            ))}
          </FormGroup>
        </Paper>
      </Box>

      {/* ─── MAIN CALENDAR PANEL ─── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: remoteError ? 1.5 : 0 }}>
        {remoteError && (
          <Alert severity="error" onClose={() => setRemoteError(null)}>
            {remoteError}
          </Alert>
        )}
        {/* Header Toolbar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: '12px 12px 0 0',
            border: `1px solid ${theme.palette.divider}`,
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {/* Navigation Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleToday}
              sx={{ textTransform: 'none', borderRadius: 1.5 }}
            >
              Today
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton size="small" onClick={handlePrev}>
                <ChevronLeftIcon />
              </IconButton>
              <IconButton size="small" onClick={handleNext}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, ml: 1, minWidth: 200 }}>
              {rangeLabel}
            </Typography>
          </Box>

          {/* Action and Selector Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              size="small"
              sx={{ minWidth: 120, borderRadius: 1.5, fontSize: '0.825rem' }}
            >
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="workweek">Work week</MenuItem>
              <MenuItem value="week">Week</MenuItem>
            </Select>

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setNewTitle('')
                setNewDescription('')
                setNewDate(formatDateString(currentDate))
                setIsNewEventOpen(true)
              }}
              sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600 }}
            >
              New event
            </Button>
          </Box>
        </Paper>

        {/* Calendar Interactive Grid */}
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            borderRadius: '0 0 12px 12px',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {loadingRemote && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(1px)',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          {/* Day Column Headers */}
          <Box
            sx={{
              display: 'flex',
              borderBottom: `1px solid ${theme.palette.divider}`,
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 3,
            }}
          >
            {/* Time Slot Header Spacer */}
            <Box sx={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}` }} />

            {/* Header Columns */}
            {currentWeekDays.map((day, colIdx) => {
              const isToday = formatDateString(day) === formatDateString(new Date())
              return (
                <Box
                  key={colIdx}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    textAlign: 'center',
                    borderRight: colIdx < currentWeekDays.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                    bgcolor: isToday ? 'action.selected' : 'transparent',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: isToday ? 'primary.main' : 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: isToday ? 'primary.main' : 'text.primary',
                      mt: -0.5,
                    }}
                  >
                    {day.getDate()}
                  </Typography>
                </Box>
              )
            })}
          </Box>

          {/* Grid Rows Container */}
          <Box sx={{ display: 'flex', flexGrow: 1, position: 'relative', minHeight: 650 }}>
            {/* Hours Labels Column */}
            <Box sx={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}` }}>
              {hours.map((hour) => (
                <Box
                  key={hour}
                  sx={{
                    height: 60,
                    pr: 1,
                    pt: 0.5,
                    textAlign: 'right',
                    borderBottom: `1px dashed ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Daily Grid Columns */}
            {currentWeekDays.map((day, colIdx) => {
              const dateStr = formatDateString(day)
              // Filter events that fall on this day
              const dayEvents = filteredEvents.filter((e) => e.date === dateStr)

              return (
                <Box
                  key={colIdx}
                  sx={{
                    flex: 1,
                    position: 'relative',
                    borderRight: colIdx < currentWeekDays.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  }}
                >
                  {/* Grid Rows Background with alternating colors for visual distinction */}
                  {hours.map((hour) => {
                    const isEvenHour = hour % 2 === 0
                    return (
                      <Box
                        key={hour}
                        onClick={() => handleCellClick(dateStr, hour)}
                        sx={{
                          height: 60,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          bgcolor: isEvenHour
                            ? theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.02)'
                            : 'transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      />
                    )
                  })}

                  {/* Absolute Events — with column-aware overlap layout */}
                  {(() => {
                    const layouts = getEventLayouts(dayEvents)
                    return dayEvents.map((event) => {
                      const layout = layouts.get(event.id)
                      if (!layout) return null
                      const isShort = parseInt(layout.height || '60') <= 30
                      const darkerShade = darkenColor(event.color, 50)

                      return (
                        <Tooltip key={event.id} title={`${event.startTime} - ${event.endTime}: ${event.title}`} arrow>
                          <Box
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEvent(event)
                            }}
                            sx={{
                              position: 'absolute',
                              top: layout.top,
                              height: layout.height,
                              left: layout.left,
                              width: layout.width,
                              zIndex: 2,
                              bgcolor: event.color,
                              color: '#0f172a',
                              borderRadius: '6px',
                              p: isShort ? '2px 6px' : '5px 8px',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: isShort ? 'center' : 'flex-start',
                              borderLeft: `4px solid ${layout.isOverlapping ? darkerShade : 'rgba(15, 23, 42, 0.2)'}`,
                              borderTop: layout.isOverlapping ? `2px solid ${darkerShade}` : 'none',
                              borderBottom: layout.isOverlapping ? `2px solid ${darkerShade}` : 'none',
                              boxShadow: layout.isOverlapping ? '0 1px 3px rgba(0,0,0,0.12)' : '0 2px 4px rgba(0,0,0,0.06)',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                filter: 'brightness(0.96) contrast(1.05)',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              },
                            }}
                          >
                            {isShort ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'inherit' }}>
                                  {event.title}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                                  <Typography variant="caption" sx={{ opacity: 0.75, fontSize: '0.625rem', whiteSpace: 'nowrap', color: 'inherit' }}>
                                    {event.startTime}
                                  </Typography>
                                  {event.calendarId === 'outlook' && event.meetingUrl && (
                                    <VideocamIcon
                                      sx={{ fontSize: '0.625rem', opacity: 0.7 }}
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        handleJoinMeeting(event.meetingUrl!)
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            ) : (
                              <>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.725rem', lineHeight: 1.15, mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}>
                                  {event.title}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Typography variant="caption" sx={{ opacity: 0.75, fontSize: '0.625rem', display: 'block', color: 'inherit' }}>
                                    {event.startTime} - {event.endTime}
                                  </Typography>
                                  {event.calendarId === 'outlook' && event.meetingUrl && (
                                    <VideocamIcon
                                      sx={{ fontSize: '0.75rem', opacity: 0.7, flexShrink: 0 }}
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        handleJoinMeeting(event.meetingUrl!)
                                      }}
                                    />
                                  )}
                                </Box>
                              </>
                            )}
                          </Box>
                        </Tooltip>
                      )
                    })
                  })()}
                </Box>
              )
            })}
          </Box>
        </Paper>
      </Box>

      {/* ─── NEW EVENT DIALOG ─── */}
      <Dialog
        open={isNewEventOpen}
        onClose={(_, reason) => {
          if (creatingEvent) return
          setIsNewEventOpen(false)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon color="primary" /> New Calendar Event
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {createError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {createError}
              </Alert>
            )}
            <TextField
              label="Event Title"
              fullWidth
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Project Delivery Sync"
              disabled={creatingEvent}
            />
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={creatingEvent}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Time"
                type="time"
                fullWidth
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={creatingEvent}
              />
              <TextField
                label="End Time"
                type="time"
                fullWidth
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={creatingEvent}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#7dd3fc', display: 'inline-block' }} />
              Event will appear under <strong>Outlook Events</strong>
            </Typography>
            <TextField
              label="Description / Notes"
              multiline
              rows={3}
              fullWidth
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              disabled={creatingEvent}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsNewEventOpen(false)} disabled={creatingEvent} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateEvent}
            disabled={creatingEvent || !newTitle.trim()}
            sx={{ textTransform: 'none', minWidth: 100 }}
          >
            {creatingEvent ? <CircularProgress size={20} color="inherit" /> : 'Save Event'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── EVENT DETAILS DIALOG ─── */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth={
          selectedEvent?.description
            ? selectedEvent.description.length > 500
              ? 'md'
              : selectedEvent.description.length > 150
                ? 'sm'
                : 'xs'
            : 'xs'
        }
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle
              sx={{
                bgcolor: selectedEvent.color,
                color: 'white',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon />
                <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                  Event Details
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedEvent(null)} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    TITLE
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedEvent.title}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      DATE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <EventIcon fontSize="inherit" color="action" /> {selectedEvent.date}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      TIME
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <AccessTimeIcon fontSize="inherit" color="action" /> {selectedEvent.startTime} - {selectedEvent.endTime}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    CALENDAR CATEGORY
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Box sx={{ w: 12, h: 12, borderRadius: '50%', bgcolor: selectedEvent.color, width: 12, height: 12 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {CALENDAR_TYPES.find((t) => t.id === selectedEvent.calendarId)?.label || selectedEvent.calendarId}
                    </Typography>
                  </Box>
                </Box>

                {/* Join Meeting Section */}
                {selectedEvent.calendarId === 'outlook' && selectedEvent.meetingUrl && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <VideocamIcon fontSize="inherit" color="primary" />
                      ONLINE MEETING
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      startIcon={<OpenInNewIcon />}
                      onClick={() => handleJoinMeeting(selectedEvent.meetingUrl!)}
                      sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600 }}
                    >
                      Join Meeting
                    </Button>
                  </Box>
                )}

                {selectedEvent.description && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      NOTES / DESCRIPTION
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {selectedEvent.description}
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setSelectedEvent(null)} sx={{ textTransform: 'none' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

    </Box>
  )
}
