import { useEffect, useState, useMemo, useCallback, type ReactElement } from 'react'
import {
  Box,
  Alert,
  Chip,
  useTheme,
  Typography,
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
  DetailDrawer,
  TabPanel,
  ExportButton,
  KpiCardRow,
  StatusTag,
  WorkflowMilestone,
  Button,
  ConfirmDialog,
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
  const { currentUser } = useUser()

  const existingEntryDates = useMemo(
    () => entries.map((e) => e.pm_workdate?.split('T')[0] ?? '').filter(Boolean),
    [entries]
  )

  // â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, res] = await Promise.all([fetchTimesheets(), fetchResources()])
      setTimesheets(list)
      setResources(res)
    } catch (err) {
      console.error('[TimesheetsPage] loadData error:', err)
      setError('Unable to load timesheet data.')
    } finally {
      setLoading(false)
    }
  }, [])

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
      <PageHeader
        title="Timesheets"
        subtitle="Track and manage time entries â€” create timesheets, log hours, and manage the approval workflow."
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

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* KPI Ribbon â€” Standardized Row */}
      {!loading && (
        <KpiCardRow items={kpiData} loading={loading} />
      )}

      {/* Main Grid */}
      <TimesheetGrid
        timesheets={timesheets}
        loading={loading}
        onRowClick={handleRowClick}
        selectedTimesheetId={selectedTimesheet?.pm_timesheetid}
        onCreateFirst={() => setShowCreateModal(true)}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        open={!!selectedTimesheet}
        onClose={handleCloseDetail}
        icon={<EventNoteIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        title={selectedTimesheet?.pm_timesheetname ?? ''}
        subtitle={
          selectedTimesheet && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
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
                {selectedTimesheet.pm_ownername || 'â€”'}
              </Typography>
            </Box>
          )
        }
        headerActions={
          selectedTimesheet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimesheetStatusControls
                status={currentStatus}
                onStatusUpdate={handleStatusUpdate}
                approvalDate={selectedTimesheet.pm_approvaldate}
                rejectionReason={selectedTimesheet.pm_rejectionreason}
                loading={actionLoading}
              />
              {canDelete && (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={actionLoading || deleteLoading}
                  sx={{ minWidth: 0, px: 1.5 }}
                >
                  Delete
                </Button>
              )}
            </Box>
          )
        }
        tabs={[{ label: 'Entries', count: entries.length }, { label: 'Details' }, { label: 'Approval' }, { label: 'Tasks' }]}
        tabValue={detailTab}
        onTabChange={(value) => setDetailTab(value)}
      >
        {selectedTimesheet && (
          <>
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
          </>
        )}
      </DetailDrawer>

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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || 'â€”'}</Typography>
    </Box>
  )
}

