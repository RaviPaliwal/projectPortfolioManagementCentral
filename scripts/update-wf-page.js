const fs = require('fs');
let c = fs.readFileSync('src/features/workflows/pages/WorkflowsPage.tsx', 'utf8');

if (!c.includes('fetchWorkflowStepTemplates')) {
  c = c.replace(
    "import {\n  fetchWorkflows, createWorkflow, updateWorkflow, deleteWorkflow,\n  fetchWorkflowInstances, fetchWorkflowApprovalSteps, deleteWorkflowInstance,\n} from '@/lib/dataverseClient'",
    "import {\n  fetchWorkflows, createWorkflow, updateWorkflow, deleteWorkflow,\n  fetchWorkflowInstances, fetchWorkflowApprovalSteps, deleteWorkflowInstance,\n  fetchWorkflowStepTemplates, createWorkflowStepTemplate, updateWorkflowStepTemplate, deleteWorkflowStepTemplate,\n} from '@/lib/dataverseClient'"
  );
  console.log('Added step template imports');
}

if (!c.includes('WorkflowStepTemplateModel')) {
  c = c.replace(
    "import type { WorkflowModel, WorkflowInstanceModel, WorkflowApprovalStepModel } from '@/types/dataverse'",
    "import type { WorkflowModel, WorkflowInstanceModel, WorkflowApprovalStepModel, WorkflowStepTemplateModel } from '@/types/dataverse'"
  );
  console.log('Added type import');
}

if (!c.includes('DragIndicatorIcon')) {
  c = c.replace(
    "import PowerIcon from '@mui/icons-material/Power'\nimport PowerOffIcon from '@mui/icons-material/PowerOff'",
    "import PowerIcon from '@mui/icons-material/Power'\nimport PowerOffIcon from '@mui/icons-material/PowerOff'\nimport DragIndicatorIcon from '@mui/icons-material/DragIndicator'\nimport GroupIcon from '@mui/icons-material/Group'\nimport PersonIcon from '@mui/icons-material/Person'\nimport TimerIcon from '@mui/icons-material/Timer'"
  );
  console.log('Added icon imports');
}

if (!c.includes('const [stepTemplates, setStepTemplates]')) {
  c = c.replace(
    "const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'workflow' | 'instance' } | null>(null)",
    "const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'workflow' | 'instance' } | null>(null)\n  const [stepTemplates, setStepTemplates] = useState<WorkflowStepTemplateModel[]>([])\n  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)\n  const [showStepForm, setShowStepForm] = useState(false)\n  const [editingStep, setEditingStep] = useState<WorkflowStepTemplateModel | null>(null)\n  const [stepFormData, setStepFormData] = useState({\n    pm_workflowname: '', pm_steporder: 1, pm_assignetype: 0, pm_assigneeid: '',\n    pm_displayname: '', pm_description: '', pm_sladays: 5, pm_allowdelegation: false,\n    pm_approvalrequired: true, pm_isparallel: false, pm_conditionsjson: '', pm_module: '',\n  })\n  const [deleteStepConfirm, setDeleteStepConfirm] = useState<string | null>(null)"
  );
  console.log('Added state');
}

if (!c.includes('setStepTemplates(stList)')) {
  c = c.replace(
    "      const [wfList, instList] = await Promise.all([fetchWorkflows(), fetchWorkflowInstances()])\n      setWorkflows(wfList)\n      setInstances(instList)",
    "      const [wfList, instList, stList] = await Promise.all([fetchWorkflows(), fetchWorkflowInstances(), fetchWorkflowStepTemplates()])\n      setWorkflows(wfList)\n      setInstances(instList)\n      setStepTemplates(stList)"
  );
  console.log('Added data loading');
}

if (!c.includes("'Step Templates'")) {
  c = c.replace(
    "      { label: 'Completed Instances', value: completedInsts, subtitle: 'Successfully finished', icon: <CheckCircleIcon />, color: '#0ea5e9' },",
    "      { label: 'Completed Instances', value: completedInsts, subtitle: 'Successfully finished', icon: <CheckCircleIcon />, color: '#0ea5e9' },\n      { label: 'Step Templates', value: stepTemplates.length, subtitle: 'Configured steps', icon: <SettingsIcon />, color: '#8b5cf6' },"
  );
  c = c.replace("}, [workflows, instances])", "}, [workflows, instances, stepTemplates])");
  console.log('Added KPI');
}

if (!c.includes('openCreateStep')) {
  const h = "\n  const openCreateStep = useCallback((workflowId: string) => {\n    setEditingStep(null)\n    setStepFormData({ pm_workflowname: '', pm_steporder: (stepTemplates.filter((s) => s.pm_module === workflowId).length) + 1, pm_assignetype: 0, pm_assigneeid: '', pm_displayname: '', pm_description: '', pm_sladays: 5, pm_allowdelegation: false, pm_approvalrequired: true, pm_isparallel: false, pm_conditionsjson: '', pm_module: workflowId })\n    setShowStepForm(true)\n  }, [stepTemplates])\n\n  const openEditStep = useCallback((step: WorkflowStepTemplateModel) => {\n    setEditingStep(step)\n    setStepFormData({ pm_workflowname: step.pm_workflowname ?? '', pm_steporder: step.pm_steporder ?? 1, pm_assignetype: Number(step.pm_assignetype) || 0, pm_assigneeid: step.pm_assigneeid ?? '', pm_displayname: step.pm_displayname ?? '', pm_description: step.pm_description ?? '', pm_sladays: step.pm_sladays ?? 5, pm_allowdelegation: step.pm_allowdelegation ?? false, pm_approvalrequired: step.pm_approvalrequired ?? true, pm_isparallel: step.pm_isparallel ?? false, pm_conditionsjson: step.pm_conditionsjson ?? '', pm_module: step.pm_module ?? '' })\n    setShowStepForm(true)\n  }, [])\n\n  const handleSaveStep = async () => {\n    if (!stepFormData.pm_workflowname.trim()) { setError('Step name is required.'); return }\n    setError(null); setActionLoading(true)\n    try {\n      if (editingStep?.pm_workflowsteptemplateid) { await updateWorkflowStepTemplate(editingStep.pm_workflowsteptemplateid, stepFormData as any); setSuccessMsg('Step updated.') }\n      else { await createWorkflowStepTemplate(stepFormData as any); setSuccessMsg('Step created.') }\n      setShowStepForm(false); setTimeout(() => setSuccessMsg(null), 3000); await loadData()\n    } catch { setError('Unable to save step.') } finally { setActionLoading(false) }\n  }\n\n  const handleDeleteStep = async () => {\n    if (!deleteStepConfirm) return; setActionLoading(true)\n    try { await deleteWorkflowStepTemplate(deleteStepConfirm); setSuccessMsg('Step deleted.'); setDeleteStepConfirm(null); setTimeout(() => setSuccessMsg(null), 3000); await loadData() }\n    catch { setError('Unable to delete step.') } finally { setActionLoading(false) }\n  }\n";
  c = c.replace('const renderTableHeader =', h + '  const renderTableHeader =');
  console.log('Added handlers');
}

if (!c.includes('Step Configuration')) {
  c = c.replace(
    '<Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Approval Steps" />',
    '<Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Approval Steps" />\n        <Tab icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Step Configuration" />'
  );
  console.log('Added tab');
}

fs.writeFileSync('src/features/workflows/pages/WorkflowsPage.tsx', c, 'utf8');
console.log('Phase 1 done, length:', c.length);
