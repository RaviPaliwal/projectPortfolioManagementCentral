import { useState, useMemo, useEffect, useCallback } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import WarningIcon from "@mui/icons-material/Warning";
import CommentIcon from "@mui/icons-material/Comment";
import SendIcon from "@mui/icons-material/Send";
import DateRangeIcon from "@mui/icons-material/DateRange";
import { useTheme, Box, Avatar as MuiAvatar, Typography, CircularProgress, Alert, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@mui/material";
import {
  fetchResourceBySystemUserId,
  fetchResourceTimesheets,
  fetchTimesheetEntries,
  fetchHolidays,
  fetchAllocatedProjectsForResource,
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
  deleteTimesheet,
  updateTimesheetStatus,
  recalculateTimesheetHours,
  startWorkflowForEntity,
  createTimesheet,
  checkTimesheetOverlap
} from "@/services";
import { useUser } from "@/context/UserContext";
import type { TimesheetModel, TimesheetEntryModel, ResourceModel } from "@/types/dataverse";
import { MODULE_NAMES } from "@/constants/moduleNames";
import { PageHeader, Button, StatusTag, LedgerCalendar } from "@/components/common";
import type { CalendarEntry } from "@/components/common/LedgerCalendar/LedgerCalendar";
import { TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS, STATUS_COLORS_SEMANTIC } from "@/constants/mappings";
/* =======================================================================
   CONSTANTS
   ======================================================================= */
const ACTIVITY_TYPES = [
  { id: 'chargeable', label: 'Chargeable', color: 'var(--charge)', bg: 'var(--charge-soft)' },
  { id: 'admin', label: 'Admin', color: 'var(--admin)', bg: 'var(--admin-soft)' },
  { id: 'leave', label: 'Leave', color: 'var(--leave)', bg: 'var(--leave-soft)' },
  { id: 'sick', label: 'Sick', color: 'var(--sick)', bg: 'var(--sick-soft)' },
];
/* =======================================================================
   HELPER FUNCTIONS
   ======================================================================= */
function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}
function isEditable(status: number) {
  return status === 2 || status === 3;
}
function mapActivityToEntryFields(activity: string) {
  switch (activity) {
    case 'chargeable': return { pm_ischargeable: true, pm_nonchargeablereason: undefined };
    case 'leave': return { pm_ischargeable: false, pm_nonchargeablereason: '100000001' };
    case 'sick': return { pm_ischargeable: false, pm_nonchargeablereason: '100000002' };
    default: return { pm_ischargeable: false, pm_nonchargeablereason: '100000000' };
  }
}
export function formatDateShort(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr || "";
    return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
  } catch (err) {
    return dateStr || "";
  }
}
function getTimesheetPeriodLabel(ts: TimesheetModel) {
  if (!ts.pm_periodstartdate || !ts.pm_periodenddate) return ts.pm_timesheetname || "";
  try {
    const s = new Date(ts.pm_periodstartdate.split('T')[0] + "T00:00:00");
    const e = new Date(ts.pm_periodenddate.split('T')[0] + "T00:00:00");
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${s.toLocaleDateString("en-IE", options)} – ${e.toLocaleDateString("en-IE", options)}`;
  } catch (err) {
    return ts.pm_timesheetname || "";
  }
}
/* =======================================================================
   SUB-COMPONENTS
   ======================================================================= */
function StatusFlap({ status }: { status: number }) {
  const label = (TIMESHEET_STATUS_LABELS as any)[status] || 'Draft';
  const colorKey = (TIMESHEET_STATUS_COLORS as any)[status] || 'default';
  const color = STATUS_COLORS_SEMANTIC[colorKey as keyof typeof STATUS_COLORS_SEMANTIC] || '#64748b';
  return (
    <span className="ts-flap" style={{ background: color }}>
      {label}
    </span>
  );
}
function ActivityChip({ id }: { id: string }) {
  const a = ACTIVITY_TYPES.find(t => t.id === id) || ACTIVITY_TYPES[1];
  return (
    <span className="ts-chip" style={{ background: a.bg, color: a.color }}>
      <span className="ts-dot" style={{ background: a.color }} />
      {a.label}
    </span>
  );
}
/* -------------------------------------------------------------------
   AddEntryDialog
   ------------------------------------------------------------------- */
interface AddEntryDialogProps {
  period: TimesheetModel;
  entries: any[];
  projects: { id: string; name: string }[];
  holidays: any[];
  initialData: any;
  dailyCapacity: number;
  onClose: () => void;
  onSave: (form: any) => Promise<void>;
}
function AddEntryDialog({
  period,
  entries,
  projects,
  holidays,
  initialData,
  dailyCapacity,
  onClose,
  onSave,
}: AddEntryDialogProps) {
  const [form, setForm] = useState({
    id: initialData?.id || null,
    dates: initialData?.dates || [],
    activity: initialData?.activity || 'chargeable',
    projectId: initialData?.projectId || '',
    hours: initialData?.hours || dailyCapacity,
    comment: initialData?.comment || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!form.id;
  const handleSubmit = async () => {
    if (form.dates.length === 0) { setError('Please select at least one date.'); return; }
    if (!form.hours || form.hours <= 0) { setError('Please enter valid hours.'); return; }
    if (form.activity === 'chargeable' && !form.projectId) { setError('Please select a project for chargeable time.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch {
      setError('Failed to save entry. Please try again.');
      setSaving(false);
    }
  };
  return (
    <div className="ts-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ts-dialog">
        <div className="ts-dialog-head">
          <h2>{isEdit ? 'Edit Entry' : 'Log Time'}</h2>
          <button className="ts-iconbtn" onClick={onClose}><CloseIcon sx={{ fontSize: 18 }} /></button>
        </div>
        <div className="ts-dialog-body">
          {/* Selected date pills */}
          {form.dates.length > 0 && (
            <div className="ts-field">
              <label>Selected Dates ({form.dates.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {form.dates.map((d: string) => (
                  <span key={d} className="ts-chip" style={{ background: 'var(--charge-soft)', color: 'var(--charge)' }}>
                    {formatDateShort(d)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Activity type */}
          <div className="ts-field">
            <label>Activity Type</label>
            <div className="ts-segmented">
              {ACTIVITY_TYPES.map(a => (
                <button
                  key={a.id}
                  className={cls('ts-segment', form.activity === a.id && 'ts-segment-active')}
                  style={form.activity === a.id ? { borderColor: a.color, color: a.color, fontWeight: 700 } : {}}
                  onClick={() => setForm(f => ({ ...f, activity: a.id }))}
                >
                  <span className="ts-dot" style={{ background: a.color }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          {/* Project selector — shown only for chargeable */}
          {form.activity === 'chargeable' && (
            <div className="ts-field">
              <label>Project</label>
              <select
                className="ts-select"
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
              >
                <option value="">— Select project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Hours */}
          <div className="ts-field">
            <label>Hours per day</label>
            <input
              type="number"
              className="ts-input"
              min={0.5}
              max={24}
              step={0.5}
              value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          {/* Comment */}
          <div className="ts-field">
            <label>Notes (optional)</label>
            <textarea
              className="ts-textarea"
              rows={2}
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="Add a note..."
            />
          </div>
          {error && (
            <div className="ts-error">
              <WarningIcon sx={{ fontSize: 14 }} />
              {error}
            </div>
          )}
        </div>
        <div className="ts-dialog-foot">
          <button className="ts-btn ts-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ts-btn ts-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving
              ? 'Saving…'
              : isEdit
                ? 'Save Changes'
                : `Log ${form.dates.length > 1 ? form.dates.length + ' entries' : 'Entry'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
/* =======================================================================
   MAIN COMPONENT
   ======================================================================= */
const TeamMemberTimesheetPage = () => {
  const { currentUser } = useUser();
  const theme = useTheme();
  /* ---- state ---- */
  const [timesheets, setTimesheets] = useState<TimesheetModel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimesheetEntryModel[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<ResourceModel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [creating, setCreating] = useState(false);
  /* ---- derived ---- */
  const selectedTimesheet = useMemo(
    () => timesheets.find(t => t.pm_timesheetid === selectedId) ?? null,
    [timesheets, selectedId],
  );
  const uiEntries = useMemo(() =>
    entries.map(e => {
      let activity = 'admin';
      if (e.pm_ischargeable) activity = 'chargeable';
      else if (String(e.pm_nonchargeablereason) === '100000001') activity = 'leave';
      else if (String(e.pm_nonchargeablereason) === '100000002') activity = 'sick';
      const project = projects.find(p => p.id === e._pm_project_value);
      return {
        id: e.pm_timesheetentryid,
        date: e.pm_workdate?.split('T')[0] || '',
        activity,
        projectName: project?.name || '',
        hours: e.pm_hoursworked || 0,
        comment: e.pm_worknotes || '',
        isReadOnly: false,
        type: activity,
      };
    }),
    [entries, projects],
  );
  const loggedDateSet = useMemo(
    () => new Set(entries.map(e => e.pm_workdate?.split('T')[0]).filter(Boolean) as string[]),
    [entries],
  );
  const totalLogged = useMemo(
    () => uiEntries.reduce((s, e) => s + e.hours, 0),
    [uiEntries],
  );
  const targetHours = useMemo(() => {
    if (!selectedTimesheet?.pm_periodstartdate || !selectedTimesheet?.pm_periodenddate) return 160;
    const start = new Date(selectedTimesheet.pm_periodstartdate.split('T')[0] + 'T00:00:00');
    const end = new Date(selectedTimesheet.pm_periodenddate.split('T')[0] + 'T00:00:00');
    const holidayDates = new Set(holidays.map((h: any) => h.pm_holidaydate?.split('T')[0]));
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      const iso = cur.toISOString().split('T')[0];
      if (day !== 0 && day !== 6 && !holidayDates.has(iso)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count * (resource?.pm_dailyworkcapacity || 8);
  }, [selectedTimesheet, holidays, resource]);
  /* ---- data loading ---- */
  const loadData = useCallback(async (rid: string) => {
    try {
      const [tsList, hList, pList] = await Promise.all([
        fetchResourceTimesheets(rid),
        fetchHolidays(new Date().getFullYear()),
        fetchAllocatedProjectsForResource(rid),
      ]);
      setTimesheets(tsList);
      setHolidays(hList);
      setProjects(pList);
      if (tsList.length > 0) {
        setSelectedId(prev => prev ?? tsList[0].pm_timesheetid!);
      }
    } catch (err) {
      console.error("Failed to load timesheet data:", err);
    }
  }, []);
  // Load entries when selected timesheet changes
  useEffect(() => {
    if (!selectedId) return;
    fetchTimesheetEntries(selectedId).then(setEntries);
    setSelectedDates([]);
  }, [selectedId]);
  // Load basic data
  useEffect(() => {
    async function init() {
      if (!currentUser?.systemuserid) return;
      setLoading(true);
      try {
        const res = await fetchResourceBySystemUserId(currentUser.systemuserid);
        if (res?.pm_resourceid) {
          setResource(res);
          await loadData(res.pm_resourceid);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [currentUser?.systemuserid, loadData]);
  // Load entries when selected timesheet changes (second effect — ensures sync after create/delete)
  useEffect(() => {
    if (selectedId) {
      fetchTimesheetEntries(selectedId).then(setEntries);
      setSelectedDates([]); // clear selected dates on period change
    }
  }, [selectedId]);
  /* ---- handlers ---- */
  const handleOpenCreate = () => {
    setCreateForm({ month: new Date().getMonth(), year: new Date().getFullYear() });
    setCreateDialogOpen(true);
  };
  const handleCreateTimesheet = async () => {
    if (!resource?.pm_resourceid) return;
    setCreating(true);
    try {
      const start = new Date(createForm.year, createForm.month, 1);
      const end = new Date(createForm.year, createForm.month + 1, 0);
      const overlap = await checkTimesheetOverlap(resource.pm_resourceid, start.toISOString(), end.toISOString());
      if (overlap.overlaps) {
        alert(`A timesheet already exists for this period: ${overlap.timesheetName}`);
        return;
      }
      const periodName = start.toLocaleString('en-IE', { month: 'long', year: 'numeric' });
      const newTs = await createTimesheet({
        pm_timesheetname: `Timesheet - ${periodName}`,
        pm_periodstartdate: start.toISOString(),
        pm_periodenddate: end.toISOString(),
        _pm_resource_value: resource.pm_resourceid,
        ownerid: currentUser?.systemuserid,
      });
      await loadData(resource.pm_resourceid);
      if (newTs?.pm_timesheetid) setSelectedId(newTs.pm_timesheetid);
      setCreateDialogOpen(false);
    } catch {
      alert("Failed to create timesheet. Please try again.");
    } finally {
      setCreating(false);
    }
  };
  const handleSaveEntry = async (form: any) => {
    if (!selectedId || !resource?.pm_resourceid) return;
    setActionLoading(true);
    try {
      const fields = mapActivityToEntryFields(form.activity);
      const payloadBase = {
        pm_hoursworked: form.hours,
        pm_worknotes: form.comment,
        pm_ischargeable: fields.pm_ischargeable,
        pm_nonchargeablereason: fields.pm_nonchargeablereason || undefined,
        _pm_project_value: form.activity === 'chargeable' ? form.projectId : undefined,
      };
      if (form.id) {
        await updateTimesheetEntry(form.id, { ...payloadBase, pm_workdate: form.dates[0] });
      } else {
        const newDates = (form.dates as string[]).filter(d => !loggedDateSet.has(d));
        if (newDates.length === 0) return;
        await Promise.all(
          newDates.map((date: string) =>
            createTimesheetEntry({ ...payloadBase, pm_workdate: date, pm_timesheetid: selectedId })
          )
        );
      }
      await recalculateTimesheetHours(selectedId);
      const [newEntries, newTsList] = await Promise.all([
        fetchTimesheetEntries(selectedId),
        fetchResourceTimesheets(resource.pm_resourceid),
      ]);
      setEntries(newEntries);
      setTimesheets(newTsList);
      setDialogOpen(false);
      setEditingEntry(null);
      setSelectedDates([]);
    } catch (err) {
      console.error("Failed to save entry:", err);
    } finally {
      setActionLoading(false);
    }
  };
  const handleOpenAdd = () => {
    const filtered = selectedDates.filter(d => !loggedDateSet.has(d));
    if (filtered.length === 0) return;
    setEditingEntry({ dates: filtered });
    setDialogOpen(true);
  };
  const handleOpenEdit = (entry: any) => {
    setEditingEntry({
      id: entry.id,
      dates: [entry.date],
      activity: entry.activity,
      projectId: entries.find(e => e.pm_timesheetentryid === entry.id)?._pm_project_value || "",
      hours: entry.hours,
      comment: entry.comment,
    });
    setDialogOpen(true);
  };
  const handleRemoveEntry = async (id: string) => {
    if (!selectedId || !resource?.pm_resourceid) return;
    if (!confirm("Remove this entry?")) return;
    setActionLoading(true);
    try {
      await deleteTimesheetEntry(id);
      await recalculateTimesheetHours(selectedId);
      const [newEntries, newTsList] = await Promise.all([
        fetchTimesheetEntries(selectedId),
        fetchResourceTimesheets(resource.pm_resourceid),
      ]);
      setEntries(newEntries);
      setTimesheets(newTsList);
    } finally {
      setActionLoading(false);
    }
  };
  const handleDeleteTimesheet = async () => {
    if (!selectedId || !resource?.pm_resourceid) return;
    if (!confirm("Are you sure you want to delete this timesheet? All entries logged under it will be permanently lost.")) return;
    setActionLoading(true);
    try {
      await deleteTimesheet(selectedId);
      const tsList = await fetchResourceTimesheets(resource.pm_resourceid);
      setTimesheets(tsList);
      if (tsList.length > 0) {
        setSelectedId(tsList[0].pm_timesheetid!);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error("Failed to delete timesheet:", err);
      alert("Failed to delete timesheet. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };
  const handleSubmit = async () => {
    if (!selectedId || !resource?.pm_resourceid) return;
    setActionLoading(true);
    try {
      await updateTimesheetStatus(selectedId, 1);
      await startWorkflowForEntity('default-template', selectedId, MODULE_NAMES.TIMESHEETS.value, currentUser?.fullname ?? 'System');
      const tsList = await fetchResourceTimesheets(resource.pm_resourceid);
      setTimesheets(tsList);
    } catch (err) {
      console.error("Failed to submit timesheet:", err);
      alert("Failed to submit timesheet. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };
  /* ---- render guards ---- */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!resource) {
    return <Alert severity="warning">No resource profile found for your account. Please contact your administrator.</Alert>;
  }
  const editable = selectedTimesheet ? isEditable(Number(selectedTimesheet.pm_timesheetstatus)) : false;
  return (
    <div className="ts-app">
      <style>{generateCSS(theme)}</style>
      <PageHeader
        title="My Timesheets"
        subtitle={resource.pm_positiontitle || "Team Member"}
        action={{
          label: 'New Timesheet',
          icon: <AddIcon />,
          onClick: handleOpenCreate,
          disabled: creating,
        }}
      />
      <div className="ts-shell">
        {timesheets.length > 0 && (
          <div className="ts-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p className="ts-sidebar-label" style={{ margin: 0 }}>Recent periods</p>
            </div>
            {timesheets.map((p) => (
              <button
                key={p.pm_timesheetid}
                className={cls("ts-period-row", p.pm_timesheetid === selectedId && "ts-period-row-active")}
                onClick={() => setSelectedId(p.pm_timesheetid!)}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="ts-period-label" title={p.pm_timesheetname}>{getTimesheetPeriodLabel(p)}</p>
                  <p className="ts-mono ts-period-hours">{p.pm_totalhours || 0}h logged</p>
                </div>
                <StatusFlap status={Number(p.pm_timesheetstatus)} />
              </button>
            ))}
          </div>
        )}
        {selectedTimesheet ? (
          <div className="ts-detail">
            <div className="ts-detail-head">
              <div>
                <h1>{getTimesheetPeriodLabel(selectedTimesheet)}</h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {editable && (
                  <IconButton
                    color="error"
                    size="small"
                    disabled={actionLoading}
                    onClick={handleDeleteTimesheet}
                    title="Delete Timesheet"
                    sx={{
                      border: '1px solid',
                      borderColor: 'error.main',
                      p: 0.5,
                      '&:hover': { bgcolor: 'error.lighter' },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
                {!editable && (
                  <span className="ts-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--line)', padding: '4px 8px', borderRadius: '4px' }}>
                    <LockIcon sx={{ fontSize: 14 }} /> Read Only
                  </span>
                )}
                <StatusFlap status={Number(selectedTimesheet.pm_timesheetstatus)} />
              </div>
            </div>
            <div className="ts-gauge-wrap">
              <div className="ts-gauge-track">
                <div className="ts-gauge-fill" style={{ width: Math.min(100, (totalLogged / targetHours) * 100) + "%", background: "var(--charge)" }} />
              </div>
              <div className="ts-gauge-labels">
                <span className="ts-mono">{totalLogged}h logged</span>
                <span className="ts-muted">target {targetHours}h</span>
              </div>
            </div>
            <LedgerCalendar
              year={new Date(selectedTimesheet.pm_periodstartdate!).getFullYear()}
              month={new Date(selectedTimesheet.pm_periodstartdate!).getMonth()}
              entries={uiEntries}
              interactive={true}
              selectedDates={selectedDates}
              onSelectDate={(dateStr: string) => {
                const isHoliday = holidays.some((h: any) => h.pm_holidaydate.split('T')[0] === dateStr);
                if (isHoliday) return;
                const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (dateStr > today.toISOString().split('T')[0]) return;
                if (loggedDateSet.has(dateStr)) return;
                setSelectedDates(prev => {
                  if (prev.includes(dateStr)) return prev.filter(d => d !== dateStr);
                  return [...prev, dateStr].sort();
                });
              }}
              onDoubleClickDate={(dateStr: string) => {
                const isHoliday = holidays.some((h: any) => h.pm_holidaydate.split('T')[0] === dateStr);
                if (isHoliday) return;
                const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (dateStr > today.toISOString().split('T')[0]) return;
                if (loggedDateSet.has(dateStr)) return;

                // On double click, we just open for this specific date
                setEditingEntry({ dates: [dateStr] });
                setDialogOpen(true);
              }}
              holidays={holidays}
            />
            <div className="ts-entry-list">
              <div className="ts-entry-list-head">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span>Entries</span>
                  {editable && selectedDates.length === 0 && (
                    <span className="ts-hint" style={{ fontWeight: 400, marginLeft: '12px', marginTop: 0, color: 'var(--ink-soft)' }}>
                      👆 Select one or more days on the calendar to log time
                    </span>
                  )}
                  {editable && selectedDates.length > 0 && (
                    <span className="ts-hint" style={{ fontWeight: 600, marginLeft: '12px', marginTop: 0, color: 'var(--charge)' }}>
                      ✓ {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                {editable && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAdd}
                    disabled={selectedDates.length === 0}
                  >
                    Add entry
                  </Button>
                )}
              </div>
              {uiEntries.map((e: any) => (
                <div key={e.id} className="ts-entry-row">
                  <span className="ts-mono ts-entry-date">{formatDateShort(e.date)}</span>
                  <ActivityChip id={e.activity} />
                  <span className="ts-entry-project">{e.projectName || "—"}</span>
                  <span className="ts-mono ts-entry-hours">{e.hours}h</span>
                  {e.comment
                    ? <span title={e.comment} className="ts-entry-comment" style={{ display: 'inline-flex', alignItems: 'center' }}><CommentIcon sx={{ fontSize: 14 }} /></span>
                    : <span />}
                  {editable && !e.isReadOnly ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="ts-iconbtn" onClick={() => handleOpenEdit(e)}><EditIcon sx={{ fontSize: 14 }} /></button>
                      <button className="ts-iconbtn" onClick={() => handleRemoveEntry(e.id)}><DeleteIcon sx={{ fontSize: 14 }} /></button>
                    </div>
                  ) : <span />}
                </div>
              ))}
            </div>
            {editable && (
              <div className="ts-submit-row">
                <Button
                  variant="contained"
                  color="primary"
                  disabled={actionLoading}
                  onClick={handleSubmit}
                  startIcon={<SendIcon />}
                >
                  Submit for approval
                </Button>
              </div>
            )}
          </div>
        ) : timesheets.length === 0 ? (
          <div className="ts-detail ts-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '400px' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 16px rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                mx: 'auto'
              }}
            >
              <DateRangeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary', width: '100%', textAlign: 'center' }}>
              No Timesheets Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mb: 3.5, lineHeight: 1.6, mx: 'auto', textAlign: 'center' }}>
              It looks like you haven't created any timesheet periods. Start tracking your working hours by creating a new timesheet.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenCreate}
                startIcon={<AddIcon />}
                sx={{
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
                }}
              >
                Start First Timesheet
              </Button>
            </Box>
          </div>
        ) : (
          <div className="ts-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Select a timesheet to view details</Typography>
          </div>
        )}
      </div>
      {dialogOpen && selectedTimesheet && (
        <AddEntryDialog
          period={selectedTimesheet}
          entries={uiEntries}
          projects={projects}
          holidays={holidays}
          initialData={editingEntry}
          dailyCapacity={resource.pm_dailyworkcapacity || 8}
          onClose={() => setDialogOpen(false)}
          onSave={handleSaveEntry}
        />
      )}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Start New Timesheet Period</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Month"
              value={createForm.month}
              onChange={(e) => setCreateForm({ ...createForm, month: Number(e.target.value) })}
              fullWidth
              size="small"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i} value={i}>{new Date(2000, i, 1).toLocaleString('en-IE', { month: 'long' })}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="text" color="inherit" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreateTimesheet} disabled={creating}>
            {creating ? "Creating..." : "Create Timesheet"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
export default TeamMemberTimesheetPage;
function generateCSS(theme: any) {
  const mode = theme.palette.mode;
  return `
.ts-app{
  --paper:${theme.palette.background.default}; --surface:${theme.palette.background.paper}; 
  --ink:${theme.palette.text.primary}; --ink-soft:${theme.palette.text.secondary}; --line:${theme.palette.divider};
  --charge:${theme.palette.success.main}; --charge-soft:${theme.palette.success.light}33;
  --admin:${theme.palette.grey[500]}; --admin-soft:${theme.palette.grey[200]}33;
  --leave:${theme.palette.warning.main}; --leave-soft:${theme.palette.warning.light}33;
  --sick:${theme.palette.error.main}; --sick-soft:${theme.palette.error.light}33;
  --alert:${theme.palette.error.main}; --alert-soft:${theme.palette.error.light}33;
  font-family:${theme.typography.fontFamily}; color:var(--ink); background:transparent;
  border-radius:14px; padding:0; width:100%;
}
.ts-app *{box-sizing:border-box;}
.ts-mono{font-family:ui-monospace,monospace;}
.ts-muted{color:var(--ink-soft); font-size:13px;}
.ts-shell{display:flex; gap:18px; align-items:flex-start; margin-top:24px;}
.ts-sidebar{width:260px; flex-shrink:0; display:flex; flex-direction:column; gap:6px;}
.ts-sidebar-label{font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); margin:0 4px 4px;}
.ts-period-row{display:flex; justify-content:space-between; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:10px 12px; cursor:pointer; text-align:left; color:var(--ink); min-height: 58px;}
.ts-period-row-active{border-color:${theme.palette.primary.main}; box-shadow:0 0 0 1px ${theme.palette.primary.main};}
.ts-period-label{font-size:13.5px; font-weight:600; margin:0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.ts-period-hours{font-size:11.5px; color:var(--ink-soft); margin:2px 0 0;}
.ts-flap{display:inline-flex; align-items:center; font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#fff; padding:4px 9px; border-radius:5px; white-space:nowrap;}
.ts-detail{flex:1; min-width:0; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px;}
.ts-empty-state{display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; min-height:420px; padding:40px 20px;}
.ts-detail-head{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;}
.ts-serial{font-size:11px; color:var(--ink-soft); margin:0 0 2px;}
.ts-detail-head h1{font-size:24px; font-weight:700; margin:0;}
.ts-gauge-wrap{margin:14px 0 16px;}
.ts-gauge-track{height:10px; border-radius:6px; background:${mode === 'light' ? '#eee' : '#333'}; overflow:hidden;}
.ts-gauge-fill{height:100%; border-radius:6px;}
.ts-gauge-labels{display:flex; justify-content:space-between; margin-top:6px; font-size:12px;}
.ts-dot{width:7px; height:7px; border-radius:50%; display:inline-block;}
.ts-entry-list-head{display:flex; justify-content:space-between; align-items:center; margin:16px 0 10px; font-size:13px; font-weight:700;}
.ts-entry-row{display:grid; grid-template-columns:100px 140px 1fr 50px 24px 60px; align-items:center; gap:10px; padding:8px 4px; border-bottom:1px solid var(--line); font-size:13px;}
.ts-entry-date{color:var(--ink-soft);}
.ts-entry-project{color:var(--ink);}
.ts-entry-hours{text-align:right; font-weight:700;}
.ts-entry-comment{color:var(--ink-soft);}
.ts-chip{display:inline-flex; align-items:center; justify-content:center; gap:5px; font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:20px;}
.ts-hint{font-size:11.5px; color:var(--ink-soft); margin:5px 0 0;}
.ts-submit-row{display:flex; align-items:center; gap:10px; margin-top:16px;}
.ts-btn{display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; padding:9px 14px; border-radius:8px; border:1px solid var(--line); background:var(--surface); cursor:pointer; color:var(--ink);}
.ts-btn:disabled{opacity:.45; cursor:not-allowed;}
.ts-btn-primary{background:${theme.palette.primary.main}; border-color:${theme.palette.primary.main}; color:#fff;}
.ts-btn-ghost{background:transparent;}
.ts-btn-small{padding:6px 10px; font-size:12px;}
.ts-iconbtn{background:transparent; border:none; color:var(--ink-soft); cursor:pointer; padding:4px; border-radius:6px; display:flex;}
.ts-overlay{position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:flex-start; justify-content:center; z-index:9999; padding:40px 20px; overflow-y:auto;}
.ts-dialog{background:var(--surface); border-radius:14px; width:650px; display:flex; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,.2); margin-bottom:40px;}
.ts-dialog-head{display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid var(--line);}
.ts-dialog-head h2{font-size:17px; font-weight:700; margin:0;}
.ts-dialog-body{padding:16px 18px; display:flex; flex-direction:column; gap:16px;}
.ts-dialog-foot{display:flex; justify-content:flex-end; gap:8px; padding:14px 18px; border-top:1px solid var(--line);}
.ts-field label{display:block; font-size:12.5px; font-weight:700; margin-bottom:6px;}
.ts-select, .ts-input, .ts-textarea{width:100%; border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:13px; background:var(--surface); color:var(--ink);}
.ts-error{display:flex; align-items:flex-start; gap:5px; color:var(--alert); font-size:12px; margin:6px 0 0;}
.ts-segmented{display:flex; flex-wrap:wrap; gap:6px;}
.ts-segment{display:flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:20px; padding:6px 11px; font-size:12.5px; background:var(--surface); cursor:pointer; color:var(--ink);}
.ts-segment-active{font-weight:700;}
@media (max-width:760px){
  .ts-shell{flex-direction:column;}
  .ts-sidebar{width:100%; flex-direction:row; overflow-x:auto;}
}
  `;
}
