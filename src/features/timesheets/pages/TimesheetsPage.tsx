import { useEffect, useState, useMemo, useCallback, type ReactElement } from 'react'
import {
  Box,
  Alert,
  Chip,
  useTheme,
  Button,
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

import {
  fetchTimesheets,
  createTimesheet,
  updateTimesheetStatus,
  fetchTimesheetEntries,
  createTimesheetEntry,
  deleteTimesheetEntry,
  fetchResources,
  startWorkflowForEntity,
  fetchWorkflows,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

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
  const { currentUser } = useUser()

  // ── Data Loading ──────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  const handleCloseDetail = useCallback(() => {
    setSelectedTimesheet(null)
    setEntries([])
    setDetailTab(0)
  }, [])

  const handleCreateTimesheet = async (formData: any) => {
    setError(null)
    setActionLoading(true)
    try {
      const periodKey = formData.pm_periodstartdate.substring(0, 7)
      const resource = resources.find((r) => r.pm_resourceid === formData._pm_resource_value)
      const ownerName = formData.pm_ownername || resource?.pm_fullname || 'Unnamed'
      const payload: any = {
        pm_timesheetname: `${ownerName} - ${periodKey}`,
        pm_ownername: ownerName,
        pm_periodstartdate: formData.pm_periodstartdate,
        pm_periodenddate: formData.pm_periodenddate,
        pm_reportingperiod: periodKey,
        _pm_resource_value: formData._pm_resource_value || undefined,
      }
      await createTimesheet(payload)
      setSuccessMsg('Timesheet created successfully.')
      setShowCreateModal(false)
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
      await updateTimesheetStatus(selectedTimesheet.pm_timesheetid, newStatus, extra)
      setSuccessMsg('Timesheet status updated.')

      // If submitting, trigger the timesheet approval workflow
      if (newStatus === 1) {
        try {
          const workflows = await fetchWorkflows()
          const tsWorkflow = workflows.find(
            (wf) => (wf.pm_workflowstatus === 0 || wf.pm_workflowstatus === '0') && (
              wf.pm_module?.toLowerCase() === 'timesheets' ||
              (wf.pm_workflowname ?? '').toLowerCase().includes('timesheet')
            )
          )
          if (tsWorkflow?.pm_workflowid) {
            await startWorkflowForEntity(
              tsWorkflow.pm_workflowid,
              selectedTimesheet.pm_timesheetid,
              MODULE_NAMES.TIMESHEETS.value,
              currentUser?.fullname ?? 'System'
            )
            setSuccessMsg('Timesheet submitted for approval!')
          } else {
            console.warn('[TimesheetsPage] No active workflow template found for Timesheets')
          }
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
      const entryList = await fetchTimesheetEntries(selectedTimesheet.pm_timesheetid)
      setEntries(entryList)
      const updated = await fetchTimesheets()
      setTimesheets(updated)
      const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
      if (refreshed) setSelectedTimesheet(refreshed)
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
        const updated = await fetchTimesheets()
        setTimesheets(updated)
        const refreshed = updated.find((t) => t.pm_timesheetid === selectedTimesheet.pm_timesheetid)
        if (refreshed) setSelectedTimesheet(refreshed)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete entry.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── KPI Ribbon ─────────────────────────────────────────────────────────────
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
        subtitle="Track and manage time entries — create timesheets, log hours, and manage the approval workflow."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton filename="timesheets.csv" columns={timesheetExportColumns} data={timesheets} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
              New Timesheet
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* KPI Ribbon — Standardized Row */}
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
                {selectedTimesheet.pm_ownername || '—'}
              </Typography>
            </Box>
          )
        }
        headerActions={
          selectedTimesheet && (
            <TimesheetStatusControls
              status={currentStatus}
              onStatusUpdate={handleStatusUpdate}
              approvalDate={selectedTimesheet.pm_approvaldate}
              rejectionReason={selectedTimesheet.pm_rejectionreason}
              loading={actionLoading}
            />
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
                />
              )}
            </TabPanel>
          </>
        )}
      </DetailDrawer>

      {/* Modals */}
      <TimesheetFormDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTimesheet}
        resources={resources}
        loading={actionLoading}
      />

      <TimesheetEntryFormDialog
        open={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        onSubmit={handleAddEntry}
        timesheetName={selectedTimesheet?.pm_timesheetname}
        loading={actionLoading}
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
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  )
}
