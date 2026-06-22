import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Alert,
  Typography,
  Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BugReportIcon from '@mui/icons-material/BugReport'
import { PageHeader, Button } from '@/components/common'
import { useUser } from '@/context/UserContext'
import { fetchIssuesForSystemUser, fetchAllRisks, fetchMitigationActions, createIssueFull, createRiskFull, fetchIssueComments, createIssueComment, fetchProjectsForSystemUser, fetchResources } from '@/services'
import { Pm_programmesService } from '@/generated'
import type { IssueModel, RiskModel, RiskMitigationActionModel } from '@/types/dataverse'
import type { IssueComment } from '@/services/annotation.service'
import type { IssueFormData, ProjectOption, ProgrammeOption, RiskOption, ResourceOption } from '../components/LogIssueDialog'
import { unwrapList } from '@/services/common'
import {
  WorkspaceKPIs,
  AssignedIssuesList,
  MitigationActionsList,
  LogIssueDialog,
  ReportRiskDialog,
  UpdateActionDialog,
  IssueDetailDialog,
} from '../components'

export default function TeamWorkspacePage() {
  const { currentUser } = useUser()

  // ── Data State ──────────────────────────────────────────────────────────
  const [issues, setIssues] = useState<IssueModel[]>([])
  const [risks, setRisks] = useState<RiskModel[]>([])
  const [mitigationActions, setMitigationActions] = useState<RiskMitigationActionModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // ── Project & Programme State ───────────────────────────────────────────
  const [myProjects, setMyProjects] = useState<ProjectOption[]>([])
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  // ── Resource State ──────────────────────────────────────────────────────
  const [resources, setResources] = useState<ResourceOption[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)

  // ── Comment State ───────────────────────────────────────────────────────
  const [issueComments, setIssueComments] = useState<IssueComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  // ── Dialog State ────────────────────────────────────────────────────────
  const [logIssueOpen, setLogIssueOpen] = useState(false)
  const [reportRiskOpen, setReportRiskOpen] = useState(false)
  const [updateActionOpen, setUpdateActionOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<RiskMitigationActionModel | null>(null)
  const [issueDetailOpen, setIssueDetailOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<IssueModel | null>(null)

  // ── Derived data ────────────────────────────────────────────────────────
  const currentUserName = currentUser?.fullname || ''

  // All issues are already filtered to the current user via server-side _pm_issueowner_value lookup
  const myIssues = issues

  const myActions = useMemo(() => {
    if (!currentUserName) return mitigationActions
    return mitigationActions.filter(action => {
      const owner = (action.pm_actionowner || '').toLowerCase()
      return owner === currentUserName.toLowerCase()
    })
  }, [mitigationActions, currentUserName])

  // Map risk IDs to titles for UpdateActionDialog
  const riskTitlesMap = useMemo(() => {
    const map: Record<string, string> = {}
    risks.forEach(r => {
      if (r.pm_riskid) map[r.pm_riskid] = r.pm_risktitle || 'Untitled Risk'
    })
    return map
  }, [risks])

  // Resolve display names from lookup fields
  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    myProjects.forEach(p => { map[p.id.toLowerCase()] = p.name })
    return map
  }, [myProjects])

  const resourceNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    resources.forEach(r => { map[r.id.toLowerCase()] = r.name })
    return map
  }, [resources])

  // Risk options for the LogIssueDialog linked risk picker (filtered by project)
  const riskOptions = useMemo((): RiskOption[] => {
    return risks
      .filter(r => r.pm_riskid && r.pm_risktitle)
      .map(r => ({
        id: r.pm_riskid!,
        title: r.pm_risktitle!,
        projectId: r._pm_project_value,
      }))
  }, [risks])

  // ── Fetch projects for the current user ─────────────────────────────────
  const loadUserProjects = useCallback(async () => {
    if (!currentUser?.systemuserid) return
    setProjectsLoading(true)
    try {
      // Fetch raw project records for this system user
      const rawProjects = await fetchProjectsForSystemUser(currentUser.systemuserid)

      // Fetch all programmes for name resolution
      const progResult = await Pm_programmesService.getAll({
        select: ['pm_programmeid', 'pm_programmename'],
        filter: 'statecode eq 0',
        top: 500,
      })
      const progList = unwrapList<any>(progResult)
      const programmeMap = new Map<string, string>()
      const programmeOptions: ProgrammeOption[] = []
      for (const p of progList) {
        if (p.pm_programmeid && p.pm_programmename) {
          programmeMap.set(p.pm_programmeid, p.pm_programmename)
          programmeOptions.push({ id: p.pm_programmeid, name: p.pm_programmename })
        }
      }
      setProgrammes(programmeOptions)

      // Map to project options
      const options: ProjectOption[] = rawProjects.map(p => ({
        id: p.pm_projectid,
        name: p.pm_projectname || 'Untitled Project',
        code: p.pm_projectcode || undefined,
        programmeId: p._pm_programme_value ? p._pm_programme_value : undefined,
        programmeName: p._pm_programme_value ? programmeMap.get(p._pm_programme_value) : undefined,
      }))
      setMyProjects(options)
    } catch (err) {
      console.error('[TeamWorkspacePage] loadUserProjects error:', err)
      setError('Unable to load your assigned projects. Some features may be limited.')
    } finally {
      setProjectsLoading(false)
    }
  }, [currentUser?.systemuserid])

  // ── Load Data ───────────────────────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fetchedIssues, fetchedRisks] = await Promise.all([
        currentUser?.systemuserid
          ? fetchIssuesForSystemUser(currentUser.systemuserid)
          : Promise.resolve([] as IssueModel[]),
        fetchAllRisks(),
      ])

      setIssues(fetchedIssues || [])
      setRisks(fetchedRisks || [])

      // Fetch mitigation actions for all risks
      if (fetchedRisks && fetchedRisks.length > 0) {
        await refreshMitigationActions(fetchedRisks)
      }
    } catch (err) {
      console.error('[TeamWorkspacePage] load error:', err)
      setError('Unable to load workspace data.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch resources for the owner lookup ────────────────────────────
  const loadResources = useCallback(async () => {
    setResourcesLoading(true)
    try {
      const fetched = await fetchResources()
      const options: ResourceOption[] = (fetched || [])
        .filter(r => r.pm_resourceid && r.pm_fullname)
        .map(r => ({ id: r.pm_resourceid!, name: r.pm_fullname! }))
      setResources(options)
    } catch (err) {
      console.error('[TeamWorkspacePage] loadResources error:', err)
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
    loadUserProjects()
    loadResources()
  }, [loadAllData, loadUserProjects, loadResources])

  // ── Shared Helpers ───────────────────────────────────────────────────────
  const refreshMitigationActions = useCallback(async (riskList: RiskModel[]) => {
    const allActions: RiskMitigationActionModel[] = []
    const actionPromises = riskList.map(risk =>
      risk.pm_riskid
        ? fetchMitigationActions(risk.pm_riskid).catch(() => [])
        : Promise.resolve([] as RiskMitigationActionModel[])
    )
    const actionResults = await Promise.all(actionPromises)
    actionResults.forEach(actions => {
      allActions.push(...actions)
    })
    setMitigationActions(allActions)
  }, [])

  // ── Toast Helper ────────────────────────────────────────────────────────
  const showToast = (message: string) => {
    setToastMessage(message)
    setToastOpen(true)
    setTimeout(() => setToastOpen(false), 3000)
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleLogIssue = async (data: IssueFormData) => {
    const payload = {
      ...data,
      pm_issueowner: data.pm_issueowner || currentUserName,
      pm_dateraised: data.pm_dateraised || new Date().toISOString().split('T')[0],
      pm_issuestatus: '0', // Open
    }
    try {
      const created = await createIssueFull(payload)
      if (created) {
        setIssues(prev => [...prev, created])
        showToast('Issue logged successfully')
      } else {
        console.warn('[TeamWorkspacePage] createIssueFull returned null')
      }
    } catch (err) {
      console.error('[TeamWorkspacePage] handleLogIssue error:', err)
      throw err
    }
  }

  const handleReportRisk = async (data: { pm_risktitle: string; pm_riskcategory: string; pm_riskdescription: string }) => {
    // Resolve the resource ID linked to the current system user
    let riskOwnerValue: string | undefined
    if (currentUser?.systemuserid) {
      try {
        const { fetchResourceBySystemUserId } = await import('@/services')
        const resource = await fetchResourceBySystemUserId(currentUser.systemuserid)
        if (resource?.pm_resourceid) {
          riskOwnerValue = resource.pm_resourceid
        }
      } catch (e) {
        console.error('[TeamWorkspacePage] Failed to resolve resource for risk owner:', e)
      }
    }
    const payload = {
      ...data,
      _pm_riskowner_value: riskOwnerValue,
      pm_riskstatus: '1', // Open
    }
    const created = await createRiskFull(payload)
    if (created) {
      setRisks(prev => [...prev, created])
      showToast('Risk reported successfully')
    }
  }

  const handleUpdateAction = async (data: { pm_status: string; pm_notes: string; pm_completiondate?: string; pm_effectiveness?: string }) => {
    if (!selectedAction?.pm_riskmitigationactionid) return
    try {
      const { Pm_riskmitigationactionsService } = await import('@/generated')
      const payload: Record<string, any> = {
        pm_status: Number(data.pm_status),
        pm_notes: data.pm_notes,
      }
      if (data.pm_completiondate) {
        payload.pm_completiondate = data.pm_completiondate
      }
      if (data.pm_effectiveness) {
        payload.pm_effectiveness = Number(data.pm_effectiveness)
      }
      await Pm_riskmitigationactionsService.update(selectedAction.pm_riskmitigationactionid, payload as any)

      // Reload actions
      await refreshMitigationActions(risks)

      showToast('Action updated successfully')
    } catch {
      setError('Unable to update action.')
    }
  }

  const handleOpenUpdateAction = (action: RiskMitigationActionModel) => {
    setSelectedAction(action)
    setUpdateActionOpen(true)
  }

  const handleViewIssue = (issue: IssueModel) => {
    setSelectedIssue(issue)
    setIssueDetailOpen(true)

    // Fetch comments for this issue
    if (issue.pm_issueid) {
      setCommentsLoading(true)
      fetchIssueComments(issue.pm_issueid)
        .then(comments => setIssueComments(comments))
        .catch(() => setIssueComments([]))
        .finally(() => setCommentsLoading(false))
    }
  }

  const handleAddComment = async (issueId: string, text: string) => {
    const comment = await createIssueComment(issueId, text, currentUser?.fullname)
    if (comment) {
      setIssueComments(prev => [...prev, comment])
      showToast('Comment added')
    } else {
      setError('Failed to save comment. Please try again.')
    }
  }

  // Reset comments when closing the dialog
  const handleCloseIssueDetail = () => {
    setIssueDetailOpen(false)
    setSelectedIssue(null)
    setIssueComments([])
  }

  return (
    <Box>
      {/* Alert Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Page Header */}
      <PageHeader
        title="My Workspace"
        subtitle="Your assigned issues, mitigation actions, and risk reporting hub"
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<WarningAmberIcon />}
              onClick={() => setReportRiskOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Report Risk
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setLogIssueOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Log Issue
            </Button>
          </Box>
        }
      />

      {/* KPIs */}
      <WorkspaceKPIs
        issues={myIssues}
        actions={myActions}
        loading={loading}
      />

      {/* Main Content Grid */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <AssignedIssuesList
          issues={myIssues}
          loading={loading}
          onLogIssue={() => setLogIssueOpen(true)}
          onViewIssue={handleViewIssue}
          projectNameMap={projectNameMap}
          resourceNameMap={resourceNameMap}
        />
        <MitigationActionsList
          actions={myActions}
          loading={loading}
          onUpdateAction={handleOpenUpdateAction}
        />
      </Box>

      {/* Dialogs */}
      <LogIssueDialog
        open={logIssueOpen}
        onClose={() => setLogIssueOpen(false)}
        onSubmit={handleLogIssue}
        projects={myProjects}
        programmes={programmes}
        projectsLoading={projectsLoading}
        risks={riskOptions}
        resources={resources}
        resourcesLoading={resourcesLoading}
        currentUserName={currentUserName}
      />

      <ReportRiskDialog
        open={reportRiskOpen}
        onClose={() => setReportRiskOpen(false)}
        onSubmit={handleReportRisk}
      />

      <UpdateActionDialog
        open={updateActionOpen}
        action={selectedAction}
        riskTitle={selectedAction?._pm_risk_value ? riskTitlesMap[selectedAction._pm_risk_value] : undefined}
        onClose={() => { setUpdateActionOpen(false); setSelectedAction(null) }}
        onSubmit={handleUpdateAction}
      />

      <IssueDetailDialog
        open={issueDetailOpen}
        issue={selectedIssue}
        comments={issueComments}
        commentsLoading={commentsLoading}
        onClose={handleCloseIssueDetail}
        onAddComment={handleAddComment}
        projectNameMap={projectNameMap}
        resourceNameMap={resourceNameMap}
      />

      {/* Toast */}
      <Snackbar
        open={toastOpen}
        message={toastMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            fontWeight: 600,
          },
        }}
      />
    </Box>
  )
}
