import { useEffect, useState, useMemo, useCallback, type ReactElement } from 'react'
import {
  Box,
  Alert,
  Chip,
  useTheme,
  Typography,
  Tabs,
  Tab,
  alpha,
  Avatar,
  Grid,
  Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ScheduleIcon from '@mui/icons-material/Schedule'
import EditNoteIcon from '@mui/icons-material/EditNote'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'

import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchTimesheets,
  resolveResourceIdForSystemUser,
  createTimesheet,
  updateTimesheetStatus,
  fetchTimesheetEntries,
  createTimesheetEntry,
  deleteTimesheetEntry,
  deleteTimesheet,
  fetchResources,
  fetchAllocatedProjectsForResource,
  startWorkflowForEntity,
  recalculateTimesheetHours,
  checkTimesheetOverlap,
} from '@/services'
import type { TimesheetModel, TimesheetEntryModel, ResourceModel } from '@/types/dataverse'
import {
  PageHeader,
  TabPanel,
  ExportButton,
  KpiCardRow,
  StatusTag,
  WorkflowMilestone,
  Button,
  ConfirmDialog,
  Breadcrumbs,
} from '@/components/common'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { formatDate } from '@/utils/formatters'
import { TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS } from '@/constants/mappings'
import { useUser } from '@/context/UserContext'
import type { ExportColumn } from '@/utils/exportUtils'

// Sub-components
import {
  TimesheetGrid,
  TimesheetEntryList,
  TimesheetFormDialog,
  TimesheetEntryFormDialog,
  TimesheetStatusControls,
} from '../components'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const timesheetExportColumns: ExportColumn[] = [
  { key: 'pm_name', label: 'Period' },
  { key: 'pm_ownername', label: 'Owner' },
  { key: 'pm_statusname', label: 'Status' },
  { key: 'pm_totalhours', label: 'Total Hours', format: (v: any) => (v != null ? String(v) : '') },
  { key: 'pm_submitteddate', label: 'Submitted Date' },
  { key: 'pm_approveddate', label: 'Approved Date' },
  { key: 'pm_approvername', label: 'Approver' },
]

const STATUS_ICONS: Record<string, ReactElement> = {
  '0': <CheckCircleIcon sx={{ fontSize: 16 }} />,
  '1': <SendIcon sx={{ fontSize: 16 }} />,
  '2': <CancelIcon sx={{ fontSize: 16 }} />,
  '3': <EditNoteIcon sx={{ fontSize: 16 }} />,
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TimesheetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const { allowed: canCreate } = useAuthorization('TIMESHEETS', 'create')
  const { allowed: canEdit } = useAuthorization('TIMESHEETS', 'update')
  const { allowed: canDelete } = useAuthorization('TIMESHEETS', 'delete')

  // Data state
  const [timesheets, setTimesheets] = useState<TimesheetModel[]>([])
  const [resources, setResources] = useState<ResourceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Detail side panel
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetModel | null>(null)
  const [entries, setEntries] = useState<TimesheetEntryModel[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [detailTab, setDetailTab] = useState(0)
  const [allocatedProjects, setAllocatedProjects] = useState<{ id: string; name: string }[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [draftMode, setDraftMode] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [approvalRefreshTrigger, setApprovalRefreshTrigger] = useState(0)
  const { currentUser, currentUserPersona } = useUser()

  const existingEntryDates = useMemo(
    () => entries.map((e) => e.pm_workdate?.split('T')[0] ?? '').filter(Boolean),
    [entries]
  )

  // â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const isTeamMember = currentUserPersona === 'TeamMember'
      let timesheetList: TimesheetModel[] = []
      if (isTeamMember && currentUser?.systemuserid) {
        const resourceId = await resolveResourceIdForSystemUser(currentUser.systemuserid)
        timesheetList = resourceId ? await fetchTimesheets(resourceId) : []
      } else {
        timesheetList = await fetchTimesheets()
      }
      const res = await fetchResources()
      setTimesheets(timesheetList)
      setResources(res)
    } catch (err) {
      console.error('[TimesheetsPage] loadData error:', err)
      setError('Unable to load timesheet data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, currentUserPersona])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!showAddEntry || !selectedTimesheet?._pm_resource_value) {
      setAllocatedProjects([])
      return
    }
    const resourceId = selectedTimesheet._pm_resource_value
    setProjectsLoading(true)
    fetchAllocatedProjectsForResource(resourceId)
      .then(setAllocatedProjects)
      .catch(() => setAllocatedProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [showAddEntry, selectedTimesheet?._pm_resource_value])

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRowClick = useCallback(async (timesheet: TimesheetModel) => {
    setSelectedTimesheet(timesheet)
    setEntriesLoading(true)
    setError(null)
    if (timesheet.pm_timesheetid) {
      try {
        const entryList = await fetchTimesheetEntries(timesheet.pm_timesheetid)
        setEntries(entryList)
      } catch {
        setEntries([])
      }
    }
    setEntriesLoading(false)
  }, [])

  const handleDeleteTimesheet = async () => {
    if (!selectedTimesheet?.pm_timesheetid) return
    setDeleteLoading(true)
    setError(null)
    try {
      await deleteTimesheet(selectedTimesheet.pm_timesheetid)
      setSuccessMsg('Timesheet deleted.')
      setDeleteConfirmOpen(false)
      handleCloseDetail()
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete timesheet.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCloseDetail = useCallback(() => {
    setSelectedTimesheet(null)
    setEntries([])
    setDetailTab(0)
  }, [])

  const handleAllStepsCompleted = useCallback(async (info: { outcome: string; approverName?: string; decisionDate?: string }) => {
    if (!selectedTimesheet?.pm_timesheetid) return
    setApprovalRefreshTrigger((t) => t + 1)
    const timesheetId = selectedTimesheet.pm_timesheetid
    const approver = info.approverName || currentUser?.fullname || 'System'
    try {
      if (info.outcome === 'approved') {
        await updateTimesheetStatus(timesheetId, 0, undefined, approver)
      } else if (info.outcome === 'rejected') {
        await updateTimesheetStatus(timesheetId, 2, { pm_rejectionreason: 'Rejected via approval workflow' }, approver)
      }
    } catch (err) {
      console.error('[TimesheetsPage] Failed to update status after task completion:', err)
    }
    const updated = await fetchTimesheets()
    setTimesheets(updated)
    if (selectedTimesheet?.pm_timesheetid) {
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
    }
  }, [selectedTimesheet?.pm_timesheetid, currentUser?.fullname])

  const handleCreateTimesheet = async (formData: any) => {
    setError(null)
    setOverlapError(null)
    setActionLoading(true)
    try {
      const resourceId = formData._pm_resource_value
      if (resourceId) {
        const overlap = await checkTimesheetOverlap(
          resourceId,
          formData.pm_periodstartdate,
          formData.pm_periodenddate
        )
        if (overlap.overlaps) {
          const periodStr = overlap.pm_periodstartdate && overlap.pm_periodenddate
            ? ` (${overlap.pm_periodstartdate} to ${overlap.pm_periodenddate})`
            : ''
          setOverlapError(
            `Date range overlaps with "${overlap.timesheetName || 'existing timesheet'}"${periodStr}. Please adjust the dates.`
          )
          setActionLoading(false)
          return
        }
      }
      const periodKey = formData.pm_periodstartdate.substring(0, 7)
      const resource = resources.find((r) => r.pm_resourceid === formData._pm_resource_value)
      const ownerName = resource?.pm_fullname || currentUser?.fullname || 'Unnamed'
      const payload: any = {
        pm_timesheetname: `${ownerName} - ${periodKey}`,
        ownerid: currentUser?.systemuserid,
        owneridtype: 'systemuser',
        pm_periodstartdate: formData.pm_periodstartdate,
        pm_periodenddate: formData.pm_periodenddate,
        pm_reportingperiod: periodKey,
        _pm_resource_value: formData._pm_resource_value || undefined,
      }
      await createTimesheet(payload)
      setSuccessMsg(draftMode ? 'Draft timesheet created.' : 'Timesheet created successfully.')
      setShowCreateModal(false)
      setDraftMode(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to create timesheet.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: number, extra?: any) => {
    if (!selectedTimesheet?.pm_timesheetid) return
    setActionLoading(true)
    try {
      await updateTimesheetStatus(selectedTimesheet.pm_timesheetid, newStatus, extra, currentUser?.fullname)
      setSuccessMsg('Timesheet status updated.')

      // If submitting, trigger the initiateworkflow Power Automate flow
      if (newStatus === 1) {
        try {
          await startWorkflowForEntity(
            'default-template',
            selectedTimesheet.pm_timesheetid,
            MODULE_NAMES.TIMESHEETS.value,
            currentUser?.fullname ?? 'System'
          )
          setSuccessMsg('Timesheet submitted for approval!')
        } catch (wfErr) {
          console.error('[TimesheetsPage] Failed to start workflow:', wfErr)
        }
      }

      const updated = await fetchTimesheets()
      setTimesheets(updated)
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to update timesheet status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddEntry = async (entryForm: any) => {
    if (!selectedTimesheet?.pm_timesheetid) return
    setError(null)
    setActionLoading(true)
    try {
      await createTimesheetEntry({
        pm_timesheetid: selectedTimesheet.pm_timesheetid,
        pm_hoursworked: entryForm.pm_hoursworked,
        pm_workdate: entryForm.pm_workdate,
        pm_worknotes: entryForm.pm_worknotes || undefined,
        pm_ischargeable: entryForm.pm_ischargeable,
        _pm_project_value: entryForm._pm_project_value || undefined,
      })
      setSuccessMsg('Entry added.')
      setShowAddEntry(false)
      const totals = await recalculateTimesheetHours(selectedTimesheet.pm_timesheetid)
      const entryList = await fetchTimesheetEntries(selectedTimesheet.pm_timesheetid)
      setEntries(entryList)
      if (totals && selectedTimesheet.pm_timesheetid) {
        setSelectedTimesheet((prev) => prev ? { ...prev, ...totals } : null)
        setTimesheets((prev) => prev.map((ts) =>
          ts.pm_timesheetid === selectedTimesheet.pm_timesheetid ? { ...ts, ...totals } : ts
        ))
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to add entry.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    setActionLoading(true)
    try {
      await deleteTimesheetEntry(entryId)
      setSuccessMsg('Entry removed.')
      setEntries((prev) => prev.filter((e) => e.pm_timesheetentryid !== entryId))
      if (selectedTimesheet?.pm_timesheetid) {
        const totals = await recalculateTimesheetHours(selectedTimesheet.pm_timesheetid)
        if (totals) {
          setSelectedTimesheet((prev) => prev ? { ...prev, ...totals } : null)
          setTimesheets((prev) => prev.map((ts) =>
            ts.pm_timesheetid === selectedTimesheet.pm_timesheetid ? { ...ts, ...totals } : ts
          ))
        }
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete entry.')
    } finally {
      setActionLoading(false)
    }
  }

  // â”€â”€ KPI Ribbon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ——————————————————————————————————————————————————————————
  const kpiData = useMemo(() => {
    const total = timesheets.length
    const pending = timesheets.filter((t) => String(t.pm_timesheetstatus) === '1').length
    const drafts = timesheets.filter((t) => String(t.pm_timesheetstatus) === '3').length
    const approved = timesheets.filter((t) => String(t.pm_timesheetstatus) === '0').length
    const rejected = timesheets.filter((t) => String(t.pm_timesheetstatus) === '2').length
    const totalHours = timesheets.reduce((s, t) => s + (t.pm_totalhours ?? 0), 0)

    return [
      {
        label: 'Total Timesheets',
        value: total,
        subtitle: 'All active timesheets',
        icon: <EventNoteIcon />,
        color: 'primary.main',
      },
      {
        label: 'Pending Approval',
        value: pending,
        subtitle: `${pending > 0 ? `${((pending / (total || 1)) * 100).toFixed(0)}% of total` : 'No submissions'}`,
        icon: <ScheduleIcon />,
        color: 'warning.main',
      },
      {
        label: 'Approved',
        value: approved,
        subtitle: 'Finalized entries',
        icon: <CheckCircleIcon />,
        color: 'success.main',
      },
      {
        label: 'Rejected',
        value: rejected,
        subtitle: 'Requires correction',
        icon: <CancelIcon />,
        color: 'error.main',
      },
      {
        label: 'Drafts',
        value: drafts,
        subtitle: `${drafts > 0 ? `${drafts} timesheet${drafts !== 1 ? 's' : ''}` : 'All submitted'}`,
        icon: <EditNoteIcon />,
        color: 'secondary.main',
      },
      {
        label: 'Hours Logged',
        value: `${totalHours.toLocaleString()}h`,
        subtitle: `Across ${approved} approved`,
        icon: <AccessTimeIcon />,
        color: 'success.main',
      },
    ]
  }, [timesheets])

  const currentStatus = String(selectedTimesheet?.pm_timesheetstatus ?? '')
  const isDraft = currentStatus === '3'

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* Main Content conditionally rendered */}
      {selectedTimesheet ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, mb: 3 }}>
          <Breadcrumbs
            items={[
              { label: 'Timesheets', path: 'list' },
              { label: selectedTimesheet.pm_timesheetname ?? 'Detail' }
            ]}
            onNavigate={() => setSelectedTimesheet(null)}
          />
          <PageHeader
            title={selectedTimesheet.pm_timesheetname ?? 'Timesheet Detail'}
            subtitle={
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
                <StatusTag
                  icon={STATUS_ICONS[currentStatus]}
                  label={TIMESHEET_STATUS_LABELS[currentStatus] ?? 'Unknown'}
                  color={TIMESHEET_STATUS_COLORS[currentStatus] ?? 'default'}
                  size="small"
                  variant={currentStatus === '2' ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="body2" color="text.secondary">
                  <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                  {selectedTimesheet.pm_ownername || '—'}
                </Typography>
              </Box>
            }
            actionElement={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimesheetStatusControls
                  status={currentStatus}
                  onStatusUpdate={handleStatusUpdate}
                  approvalDate={selectedTimesheet.pm_approvaldate}
                  rejectionReason={selectedTimesheet.pm_rejectionreason}
                  loading={actionLoading}
                  entriesCount={entries.length}
                />
                {canDelete && (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={actionLoading || deleteLoading}
                    sx={{ minWidth: 0, px: 1.5, borderRadius: 1.5 }}
                  >
                    Delete
                  </Button>
                )}
              </Box>
            }
          />

          {/* KPI Ribbon */}
          <Grid container spacing={2.5} sx={{ mb: 1 }}>
            {[
              {
                label: "Total Hours Logged",
                value: `${selectedTimesheet.pm_totalhours ?? 0}h`,
                subtitle: "Total logged time",
                icon: <AccessTimeIcon />,
                color: theme.palette.primary.main
              },
              {
                label: "Chargeable Hours",
                value: `${selectedTimesheet.pm_totalchargeablehours ?? 0}h`,
                subtitle: "Billing/Chargeable hours",
                icon: <CheckCircleIcon />,
                color: theme.palette.success.main
              },
              {
                label: "Non-Chargeable Hours",
                value: `${selectedTimesheet.pm_totalnonchargeablehours ?? 0}h`,
                subtitle: "Internal/Non-chargeable",
                icon: <CancelIcon />,
                color: theme.palette.error.main
              },
              {
                label: "Reporting Period",
                value: selectedTimesheet.pm_reportingperiod || '—',
                subtitle: "Target calendar period",
                icon: <EventNoteIcon />,
                color: theme.palette.secondary.main
              }
            ].map((kpi, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    height: '100%',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: isDark ? 'background.paper' : '#fff',
                    border: `1px solid ${alpha(kpi.color, 0.15)}`,
                    boxShadow: isDark
                      ? `0 8px 30px ${alpha(kpi.color, 0.05)}`
                      : `0 8px 30px ${alpha(kpi.color, 0.03)}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${alpha(kpi.color, 0.12)}`,
                      borderColor: kpi.color,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '0.68rem',
                      }}
                    >
                      {kpi.label}
                    </Typography>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: alpha(kpi.color, 0.1),
                        color: kpi.color,
                        border: `1px solid ${alpha(kpi.color, 0.2)}`,
                        '& .MuiSvgIcon-root': { fontSize: 18 }
                      }}
                    >
                      {kpi.icon}
                    </Avatar>
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      color: isDark ? '#fff' : '#0f172a',
                      fontFamily: '"Outfit", sans-serif',
                      mb: 0.5,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}
                  >
                    {kpi.value}
                  </Typography>

                  {kpi.subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>
                      {kpi.subtitle}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '4px',
                      background: `linear-gradient(90deg, ${kpi.color}, ${alpha(kpi.color, 0.3)})`,
                    }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)}>
                <Tab label="Entries" />
                <Tab label="Details" />
                <Tab label="Approval" />
                <Tab label="Tasks" />
              </Tabs>
            </Box>

            <TabPanel value={detailTab} index={0} pt={0}>
              <TimesheetEntryList
                entries={entries}
                loading={entriesLoading}
                isDraft={isDraft}
                onAddEntry={() => setShowAddEntry(true)}
                onDeleteEntry={handleDeleteEntry}
                actionLoading={actionLoading}
              />
            </TabPanel>

            <TabPanel value={detailTab} index={1} pt={0}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 1 }}>
                <DetailField label="Owner" value={selectedTimesheet.pm_ownername || selectedTimesheet.pm_resourcename} />
                <DetailField label="Reporting Period" value={selectedTimesheet.pm_reportingperiod} />
                <DetailField label="Period Start" value={formatDate(selectedTimesheet.pm_periodstartdate)} />
                <DetailField label="Period End" value={formatDate(selectedTimesheet.pm_periodenddate)} />
                <DetailField label="Submitted By" value={selectedTimesheet.pm_submittedby} />
                <DetailField label="Submitted Date" value={formatDate(selectedTimesheet.pm_submissiondate)} />
                <DetailField label="Approved By" value={selectedTimesheet.pm_approvedby} />
                <DetailField label="Approved Date" value={formatDate(selectedTimesheet.pm_approvaldate)} />
              </Box>
            </TabPanel>

            <TabPanel value={detailTab} index={2} pt={0}>
              <Box sx={{ p: 1 }}>
                {selectedTimesheet.pm_timesheetid ? (
                  <WorkflowMilestone
                    moduleName={MODULE_NAMES.TIMESHEETS.value}
                    entityId={selectedTimesheet.pm_timesheetid}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No timesheet selected.
                  </Typography>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={detailTab} index={3} pt={0}>
              {selectedTimesheet.pm_timesheetid && (
                <EntityApprovalTasks
                  entityId={selectedTimesheet.pm_timesheetid}
                  moduleName={MODULE_NAMES.TIMESHEETS.value}
                  entityLabel="Timesheet"
                  tabValue={detailTab}
                  index={3}
                  refreshTrigger={approvalRefreshTrigger}
                  onAllStepsCompleted={handleAllStepsCompleted}
                />
              )}
            </TabPanel>
          </Box>
        </Box>
      ) : (
        <>
          <PageHeader
            title="Timesheets"
            subtitle="Track and manage time entries — create timesheets, log hours, and manage the approval workflow."
            actionElement={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ExportButton filename="timesheets.csv" columns={timesheetExportColumns} data={timesheets} />
                {canCreate && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => { setDraftMode(true); setShowCreateModal(true); setOverlapError(null) }}
                    disabled={actionLoading || loading}
                  >
                    New Entry
                  </Button>
                )}
              </Box>
            }
          />

          {/* KPI Ribbon — Standardized Row */}
          {!loading && (
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {kpiData.map((kpi, idx) => {
                const themeColor = kpi.color === 'primary.main' ? theme.palette.primary.main
                                : kpi.color === 'success.main' ? theme.palette.success.main
                                : kpi.color === 'warning.main' ? theme.palette.warning.main
                                : kpi.color === 'error.main' ? theme.palette.error.main
                                : kpi.color === 'secondary.main' ? theme.palette.secondary.main
                                : theme.palette.primary.main;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={idx}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: '20px',
                        position: 'relative',
                        overflow: 'hidden',
                        bgcolor: isDark ? 'background.paper' : '#fff',
                        border: `1px solid ${alpha(themeColor, 0.15)}`,
                        boxShadow: isDark
                          ? `0 8px 30px ${alpha(themeColor, 0.05)}`
                          : `0 8px 30px ${alpha(themeColor, 0.03)}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 12px 40px ${alpha(themeColor, 0.12)}`,
                          borderColor: themeColor,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontSize: '0.68rem',
                          }}
                        >
                          {kpi.label}
                        </Typography>
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: alpha(themeColor, 0.1),
                            color: themeColor,
                            border: `1px solid ${alpha(themeColor, 0.2)}`,
                            '& .MuiSvgIcon-root': { fontSize: 18 }
                          }}
                        >
                          {kpi.icon}
                        </Avatar>
                      </Box>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: isDark ? '#fff' : '#0f172a',
                          fontFamily: '"Outfit", sans-serif',
                          mb: 0.5,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                      >
                        {kpi.value}
                      </Typography>

                      {kpi.subtitle && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>
                          {kpi.subtitle}
                        </Typography>
                      )}

                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          height: '4px',
                          background: `linear-gradient(90deg, ${themeColor}, ${alpha(themeColor, 0.3)})`,
                        }}
                      />
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          )}

          {/* Main Grid */}
          <TimesheetGrid
            timesheets={timesheets}
            loading={loading}
            onRowClick={handleRowClick}
            selectedTimesheetId={undefined}
            onCreateFirst={() => setShowCreateModal(true)}
          />
        </>
      )}

      {/* Modals */}
      <TimesheetFormDialog
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setDraftMode(false); setOverlapError(null) }}
        onSubmit={handleCreateTimesheet}
        resources={resources}
        loading={actionLoading}
        draftMode={draftMode}
        overlapError={overlapError}
      />

      <TimesheetEntryFormDialog
        open={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        onSubmit={handleAddEntry}
        timesheetName={selectedTimesheet?.pm_timesheetname}
        loading={actionLoading}
        allocatedProjects={allocatedProjects}
        projectsLoading={projectsLoading}
        existingEntryDates={existingEntryDates}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTimesheet}
        title="Delete Timesheet?"
        message={`Are you sure you want to delete "${selectedTimesheet?.pm_timesheetname}"? All time entries in this timesheet will also be deleted. This action cannot be undone.`}
        loading={deleteLoading}
      />
    </Box>
  )
}

function DetailField({ label, value }: { label: string; value: string | undefined }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.25, fontSize: '0.825rem' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

