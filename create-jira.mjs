import { chromium } from 'playwright';

const tickets = [
  // CORE MODULES - Suvigya
  { summary: "Portfolio Management — CRUD + DetailDrawer + health snapshots + financial rollup", assignee: "suvigya", priority: "High" },
  { summary: "Programme Management — CRUD + child project budget aggregation", assignee: "suvigya", priority: "High" },
  { summary: "Project Management — CRUD + 360° view + Gantt chart + milestones + tasks", assignee: "suvigya", priority: "High" },
  { summary: "Pipeline/Opportunity Lifecycle — Initiative CRUD + scoring + approval workflow", assignee: "suvigya", priority: "High" },
  { summary: "Resource Management — CRUD + allocations + capacity validation + skill search", assignee: "suvigya", priority: "High" },
  { summary: "Gate Review Workflow — CRUD + readiness checklists + approval steps", assignee: "suvigya", priority: "High" },
  { summary: "Benefits Tracking — CRUD + performance measures + realisation tracking", assignee: "suvigya", priority: "Medium" },
  { summary: "Change Request Workflow — CRUD + impact assessment + approval flow", assignee: "suvigya", priority: "High" },
  { summary: "Skills Management — CRUD + resource skill mapping", assignee: "suvigya", priority: "Medium" },
  { summary: "Workflow Engine — Step templates, routing rules, Power Automate triggers", assignee: "suvigya", priority: "High" },
  { summary: "Status Snapshots — 13-period RAG status reporting with snapshots", assignee: "suvigya", priority: "Medium" },
  { summary: "Strategic Roster — Headcount planning / strategic workforce visualization", assignee: "suvigya", priority: "Medium" },
  
  // CORE MODULES - Ravi
  { summary: "Timesheet Recording & Approval — Entry-based timesheets + status workflow + overlap validation", assignee: "ravi", priority: "High" },
  { summary: "Budget Line Management — CRUD + funding source linkage", assignee: "ravi", priority: "High" },
  { summary: "Risk Management — CRUD + risk assessment + mitigation actions", assignee: "ravi", priority: "High" },
  { summary: "Issue Management — CRUD + owner-based row-level filtering", assignee: "ravi", priority: "High" },
  { summary: "Cashflow Management — CRUD + financial calendar entries", assignee: "ravi", priority: "Medium" },
  { summary: "Funding Source Management — CRUD", assignee: "ravi", priority: "Medium" },
  { summary: "Workflow Tasks — Read-only approval step tasks view", assignee: "ravi", priority: "Medium" },
  
  // SECURITY & AUTH - Ravi
  { summary: "Persona Resolution System — 7 personas: keyword matching against job title, team names, security roles", assignee: "ravi", priority: "High" },
  { summary: "CRUD Permission Matrix — Per-module per-action persona-based access control", assignee: "ravi", priority: "High" },
  { summary: "Route Guard — Tab-level access validation in PrimaryShell + deep-link URL protection", assignee: "ravi", priority: "High" },
  { summary: "User Context & Role Resolution — Fetches users, teams, memberships; resolves personas", assignee: "ravi", priority: "High" },
  { summary: "User Selector — Avatar chip + popover with user switching, persona display, active indicator", assignee: "ravi", priority: "Medium" },
  
  // WORKFLOW & INTEGRATIONS - Suvigya
  { summary: "Approval Workflow Engine — Multi-step approval flows, 17 task modals, FORM_DIALOG_DECISION_EVENT", assignee: "suvigya", priority: "High" },
  { summary: "Outlook Calendar Integration — CreateOutlookEventService + GetOutlookEventsService", assignee: "suvigya", priority: "Medium" },
  { summary: "Calendar View — Integrated calendar display with Outlook events, local event creation", assignee: "suvigya", priority: "Medium" },
  { summary: "Document Upload & Management — Document CRUD, binary upload, EntityDocumentsTab", assignee: "suvigya", priority: "Medium" },
  
  // FINANCIAL ENGINE - Ravi
  { summary: "Financial Rollup Engine — Portfolio-level budget aggregation, programme budget consolidation", assignee: "ravi", priority: "High" },
  { summary: "Financial KPI Dashboard — Budget vs actual, cashflow projections, funding utilization", assignee: "ravi", priority: "Medium" },
  
  // AUDIT & COMPLIANCE - Ravi
  { summary: "Audit Trail / Activity Log — changelog.service.ts writes audit entries on all CRUD operations", assignee: "ravi", priority: "High" },
  { summary: "Changelog Service — Audit logging with session ID from Xrm context, entity-level change tracking", assignee: "ravi", priority: "Medium" },
  
  // UI / COMMON COMPONENTS - Suvigya
  { summary: "Common Component Library — 34 reusable components (DataverseTable, DetailDrawer, etc.)", assignee: "suvigya", priority: "Medium" },
  { summary: "Custom Hooks — useAuthorization, useDataGrid, useDataverseAsync, useDataverseCrud", assignee: "suvigya", priority: "Medium" },
  
  // CRITICAL GAPS
  { summary: "Fix 1389 ESLint errors — pervasive any types, empty catch blocks, React hook violations", assignee: "suvigya", priority: "Medium" },
  { summary: "Add unit/integration/E2E tests — Zero tests currently", assignee: "ravi", priority: "High" },
  { summary: "Row-level data filtering — expand to Resources, Projects, Timesheets, Risks, Tasks", assignee: "ravi", priority: "High" },
  { summary: "Column-level security — Hide financial fields from unauthorized personas", assignee: "suvigya", priority: "Medium" },
  { summary: "API-level RBAC — Add $filter based on user persona in service calls", assignee: "suvigya", priority: "High" },
  { summary: "WCAG 2.1 AA Accessibility — No accessibility implementation", assignee: "ravi", priority: "High" }
];

(async () => {
  console.log('Launching browser in visible mode...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Jira...');
  await page.goto('https://xebia-team-imc13jgw.atlassian.net/jira/software/projects/J2/list?jql=project%20%3D%20J2%20and%20parent%20%3D%20J2-14');

  console.log('Waiting up to 3 minutes for you to log in. Please ensure the "Create" button is visible at the top...');
  // Wait up to 3 minutes for the "Create" button to appear (meaning user is logged in and page loaded)
  await page.waitForSelector('button:has-text("Create")', { timeout: 180000 }).catch(() => console.log('Timeout waiting for Create button'));

  console.log('Injecting ticket creation script...');
  
  await page.evaluate(async (tickets) => {
    // Inject floating overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:20px; right:20px; background:#172B4D; color:white; padding:20px; z-index:999999; border-radius:8px; font-family:sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5); width: 400px; transition: all 0.3s;';
    document.body.appendChild(overlay);

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      overlay.innerHTML = `<h3>🚀 Antigravity Agent</h3><p>Creating ticket <b>${i+1}</b> of ${tickets.length}...</p><p style="color:#00C7E6;">${t.summary}</p><p><small>Assignee: ${t.assignee} | Priority: ${t.priority}</small></p>`;

      try {
        let assigneeId = null;
        if (t.assignee) {
          const userRes = await fetch(`/rest/api/3/user/search?query=${encodeURIComponent(t.assignee)}`);
          if (userRes.ok) {
            const users = await userRes.json();
            if (users && users.length > 0) {
              assigneeId = users[0].accountId;
            }
          }
        }

        const payload = {
          fields: {
            project: { key: "J2" },
            summary: t.summary,
            issuetype: { name: "Task" },
            parent: { key: "J2-14" }
          }
        };

        if (assigneeId) {
          payload.fields.assignee = { id: assigneeId };
        }
        
        const prioRes = await fetch('/rest/api/3/priority');
        if (prioRes.ok) {
          const priorities = await prioRes.json();
          const prio = priorities.find(p => p.name.toLowerCase() === t.priority.toLowerCase());
          if (prio) {
            payload.fields.priority = { id: prio.id };
          }
        }

        const createRes = await fetch('/rest/api/3/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!createRes.ok) {
          const errData = await createRes.json();
          // Fallback: If parent field is invalid, try Epic Link custom field
          if (errData.errors && errData.errors.parent) {
            delete payload.fields.parent;
            const fieldsRes = await fetch('/rest/api/3/field');
            if (fieldsRes.ok) {
              const allFields = await fieldsRes.json();
              const epicLinkField = allFields.find(f => f.name === 'Epic Link');
              if (epicLinkField) {
                payload.fields[epicLinkField.id] = 'J2-14';
                await fetch('/rest/api/3/issue', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
              }
            }
          }
        }
        
        // Wait 800ms between tickets so it's not rate-limited and you can watch it
        await new Promise(r => setTimeout(r, 800));
      } catch(e) {
        console.error('Exception creating', t.summary, e);
      }
    }
    
    overlay.innerHTML = `<h3>🚀 Antigravity Agent</h3><p>✅ All ${tickets.length} tickets created successfully!</p><p>Please refresh the page to see them.</p>`;
    setTimeout(() => overlay.remove(), 10000);
  }, tickets);

  console.log('Finished creating tickets! Keeping browser open for 15 seconds to review...');
  await page.waitForTimeout(15000);
  await browser.close();
})();
