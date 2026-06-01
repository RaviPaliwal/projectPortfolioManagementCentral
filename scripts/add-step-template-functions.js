const fs = require('fs');
let c = fs.readFileSync('src/lib/dataverseClient.ts', 'utf8');

// 1. Add Pm_workflowsteptemplatesService to service imports
if (!c.includes('Pm_workflowsteptemplatesService')) {
  c = c.replace(
    'Pm_workflowapprovalstepsService,\n} from',
    'Pm_workflowapprovalstepsService,\n  Pm_workflowsteptemplatesService,\n} from'
  );
  console.log('Added Pm_workflowsteptemplatesService import');
}

// 2. Add Pm_workflowsteptemplates type import
if (!c.includes("import type { Pm_workflowsteptemplates }")) {
  c = c.replace(
    "import type { Pm_workflowapprovalsteps } from '../generated/models/Pm_workflowapprovalstepsModel'",
    "import type { Pm_workflowapprovalsteps } from '../generated/models/Pm_workflowapprovalstepsModel'\nimport type { Pm_workflowsteptemplates } from '../generated/models/Pm_workflowsteptemplatesModel'"
  );
  console.log('Added Pm_workflowsteptemplates type import');
}

// 3. Add WorkflowStepTemplateModel to the type import block
if (!c.includes('WorkflowStepTemplateModel')) {
  c = c.replace(
    'WorkflowApprovalStepModel,\n  ChangeRequestModel,',
    'WorkflowApprovalStepModel,\n  WorkflowStepTemplateModel,\n  ChangeRequestModel,'
  );
  console.log('Added WorkflowStepTemplateModel type');
}

// 4. Add CRUD functions before fetchWorkflowInstances
const marker = 'export async function fetchWorkflowInstances';
if (!c.includes('fetchWorkflowStepTemplates') && c.includes(marker)) {
  const fns = [
    '',
    '// ── Workflow Step Template Functions ────────────────────────────────────',
    '',
    'const mapWorkflowStepTemplate = (item: Pm_workflowsteptemplates): WorkflowStepTemplateModel => ({',
    '  pm_workflowsteptemplateid: item.pm_workflowsteptemplateid,',
    '  pm_workflowname: item.pm_workflowname,',
    '  pm_steporder: item.pm_steporder,',
    '  pm_assignetype: (item as any).pm_assignetype,',
    '  pm_assignetypename: (item as any).pm_assignetypename,',
    '  pm_assigneeid: item.pm_assigneeid,',
    '  pm_displayname: item.pm_displayname,',
    '  pm_description: item.pm_description,',
    '  pm_sladays: item.pm_sladays,',
    '  pm_allowdelegation: item.pm_allowdelegation,',
    '  pm_approvalrequired: item.pm_approvalrequired,',
    '  pm_isparallel: item.pm_isparallel,',
    '  pm_conditionsjson: item.pm_conditionsjson,',
    '  pm_status: (item as any).pm_status,',
    '  pm_statusname: (item as any).pm_statusname,',
    '  pm_statusreason: item.pm_statusreason,',
    '  pm_module: item.pm_module,',
    '  statecode: (item as any).statecode,',
    '})',
    '',
    'export async function fetchWorkflowStepTemplates(workflowId?: string): Promise<WorkflowStepTemplateModel[]> {',
    "  const options: any = {",
    "    select: ['pm_workflowsteptemplateid', 'pm_workflowname', 'pm_steporder', 'pm_assignetype', 'pm_assignetypename', 'pm_assigneeid', 'pm_displayname', 'pm_description', 'pm_sladays', 'pm_allowdelegation', 'pm_approvalrequired', 'pm_isparallel', 'pm_conditionsjson', 'pm_status', 'pm_statusname', 'pm_statusreason', 'pm_module'],",
    "    orderBy: ['pm_steporder asc'],",
    "    top: 200,",
    "  }",
    "  if (workflowId) {",
    "    options.filter = \"pm_module eq '\" + workflowId + \"'\"",
    "  }",
    "  const result = await Pm_workflowsteptemplatesService.getAll(options)",
    "  try { console.debug('[dataverseService] fetchWorkflowStepTemplates result:', result) } catch (e) {}",
    "  return unwrapList<Pm_workflowsteptemplates>(result).map(mapWorkflowStepTemplate)",
    '}',
    '',
    'export async function createWorkflowStepTemplate(payload: Partial<WorkflowStepTemplateModel>): Promise<WorkflowStepTemplateModel | null> {',
    '  const cleanPayload: Record<string, any> = {}',
    '  for (const [key, value] of Object.entries(payload)) {',
    "    if (value !== undefined && value !== null && key !== 'pm_workflowsteptemplateid') {",
    '      cleanPayload[key] = value',
    '    }',
    '  }',
    '  const defaults: Record<string, any> = {',
    '    statecode: 0,',
    '    statuscode: 1,',
    '    pm_status: 1,',
    '  }',
    '  const result = await Pm_workflowsteptemplatesService.create({ ...defaults, ...cleanPayload } as any)',
    "  try { console.debug('[dataverseService] createWorkflowStepTemplate payload/result:', cleanPayload, result) } catch (e) {}",
    '  const item = unwrapSingle<Pm_workflowsteptemplates>(result)',
    '  return item ? mapWorkflowStepTemplate(item) : null',
    '}',
    '',
    'export async function updateWorkflowStepTemplate(id: string, changes: Partial<WorkflowStepTemplateModel>): Promise<WorkflowStepTemplateModel | null> {',
    '  const cleanPayload: Record<string, any> = {}',
    '  for (const [key, value] of Object.entries(changes)) {',
    "    if (value !== undefined && value !== null && key !== 'pm_workflowsteptemplateid') {",
    '      cleanPayload[key] = value',
    '    }',
    '  }',
    '  const result = await Pm_workflowsteptemplatesService.update(id, cleanPayload as any)',
    "  try { console.debug('[dataverseService] updateWorkflowStepTemplate id/changes/result:', id, cleanPayload, result) } catch (e) {}",
    '  const item = unwrapSingle<Pm_workflowsteptemplates>(result)',
    '  return item ? mapWorkflowStepTemplate(item) : null',
    '}',
    '',
    'export async function deleteWorkflowStepTemplate(id: string): Promise<void> {',
    "  try { console.debug('[dataverseService] deleteWorkflowStepTemplate id:', id) } catch (e) {}",
    '  await Pm_workflowsteptemplatesService.delete(id)',
    '}',
    '',
  ].join('\n');
  c = c.replace(marker, fns + marker);
  console.log('Added step template CRUD functions');
}

fs.writeFileSync('src/lib/dataverseClient.ts', c, 'utf8');
console.log('File written successfully, length:', c.length);
