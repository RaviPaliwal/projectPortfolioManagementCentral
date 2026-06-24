import { chromium } from 'playwright';

const tickets = [
  // CORE MODULES - Completed (Original Assignees)
  { summary: "Portfolio Management — CRUD + DetailDrawer + health snapshots + financial rollup", assignee: "suvigya", priority: "High", done: true },
  { summary: "Programme Management — CRUD + child project budget aggregation", assignee: "suvigya", priority: "High", done: true },
  { summary: "Project Management — CRUD + 360° view + Gantt chart + milestones + tasks", assignee: "suvigya", priority: "High", done: true },
  { summary: "Pipeline/Opportunity Lifecycle — Initiative CRUD + scoring + approval workflow", assignee: "suvigya", priority: "High", done: true },
  { summary: "Resource Management — CRUD + allocations + capacity validation + skill search", assignee: "suvigya", priority: "High", done: true },
  { summary: "Gate Review Workflow — CRUD + readiness checklists + approval steps", assignee: "suvigya", priority: "High", done: true },
  { summary: "Benefits Tracking — CRUD + performance measures + realisation tracking", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "Change Request Workflow — CRUD + impact assessment + approval flow", assignee: "suvigya", priority: "High", done: true },
  { summary: "Skills Management — CRUD + resource skill mapping", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "Workflow Engine — Step templates, routing rules, Power Automate triggers", assignee: "suvigya", priority: "High", done: true },
  { summary: "Status Snapshots — 13-period RAG status reporting with snapshots", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "Strategic Roster — Headcount planning / strategic workforce visualization", assignee: "suvigya", priority: "Medium", done: true },
  
  // Ravi's completed tickets
  { summary: "Timesheet Recording & Approval — Entry-based timesheets + status workflow + overlap validation", assignee: "ravi", priority: "High", done: true },
  { summary: "Budget Line Management — CRUD + funding source linkage", assignee: "ravi", priority: "High", done: true },
  { summary: "Risk Management — CRUD + risk assessment + mitigation actions", assignee: "ravi", priority: "High", done: true },
  { summary: "Issue Management — CRUD + owner-based row-level filtering", assignee: "ravi", priority: "High", done: true },
  { summary: "Cashflow Management — CRUD + financial calendar entries", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Funding Source Management — CRUD", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Workflow Tasks — Read-only approval step tasks view", assignee: "ravi", priority: "Medium", done: true },
  
  // SECURITY & AUTH - Completed
  { summary: "Persona Resolution System — 7 personas: keyword matching against job title, team names, security roles", assignee: "ravi", priority: "High", done: true },
  { summary: "CRUD Permission Matrix — Per-module per-action persona-based access control", assignee: "ravi", priority: "High", done: true },
  { summary: "Route Guard — Tab-level access validation in PrimaryShell + deep-link URL protection", assignee: "ravi", priority: "High", done: true },
  { summary: "User Context & Role Resolution — Fetches users, teams, memberships; resolves personas", assignee: "ravi", priority: "High", done: true },
  { summary: "User Selector — Avatar chip + popover with user switching, persona display, active indicator", assignee: "ravi", priority: "Medium", done: true },
  
  // WORKFLOW & INTEGRATIONS - Completed
  { summary: "Approval Workflow Engine — Multi-step approval flows, 17 task modals, FORM_DIALOG_DECISION_EVENT", assignee: "suvigya", priority: "High", done: true },
  { summary: "Outlook Calendar Integration — CreateOutlookEventService + GetOutlookEventsService", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "Calendar View — Integrated calendar display with Outlook events, local event creation", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "Document Upload & Management — Document CRUD, binary upload, EntityDocumentsTab", assignee: "suvigya", priority: "Medium", done: true },
  
  // FINANCIAL ENGINE - Completed
  { summary: "Financial Rollup Engine — Portfolio-level budget aggregation, programme budget consolidation", assignee: "ravi", priority: "High", done: true },
  { summary: "Financial KPI Dashboard — Budget vs actual, cashflow projections, funding utilization", assignee: "ravi", priority: "Medium", done: true },
  
  // NEW EVM & TOTALS ROW - Completed (Ravi)
  { summary: "EVM Financial KPIs — Implement EV, CPI, EAC, CV metrics in financials tab", assignee: "ravi", priority: "High", done: true },
  { summary: "Financial Layout Customization — Move totals cards to budget lines grid footer row", assignee: "ravi", priority: "Medium", done: true },

  // AUDIT & COMPLIANCE - Completed
  { summary: "Audit Trail / Activity Log — changelog.service.ts writes audit entries on all CRUD operations", assignee: "ravi", priority: "High", done: true },
  { summary: "Changelog Service — Audit logging with session ID from Xrm context, entity-level change tracking", assignee: "ravi", priority: "Medium", done: true },
  
  // UI / COMMON COMPONENTS - Completed
  { summary: "Common Component Library — 34 reusable components (DataverseTable, DetailDrawer, etc.)", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "Custom Hooks — useAuthorization, useDataGrid, useDataverseAsync, useDataverseCrud", assignee: "suvigya", priority: "Medium", done: true },

  // ADDITIONAL IMPLEMENTED MODULES & FEATURES - Completed (Ravi)
  { summary: "Holidays Management — CRUD operations, seed dialog, calendar view, details panel, table search/filter", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Configurations Tile Navigation — Navigation tiles routing to Teams, Skills, Holidays, Resources, and Workflows", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Agent Insights Service — Automated analytics insight generation service layer", assignee: "ravi", priority: "Low", done: true },

  // SPECIFIC BUG FIXES - Completed (Ravi)
  { summary: "Bug Fix: Timesheet Approval Status Reverting to Draft (Corrected status option set values)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Task List Refresh Failure (Dispatched FORM_DIALOG_DECISION_EVENT to trigger parent reload)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Tasks Visibility Glitch (Matched both userId GUID and username string against assignee names)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Tab Switch Flash (Maintained loading state until UserContext resolves completely)", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Bug Fix: Financial Review Task empty view (Resolved entity type to fetch project initiative data instead of gate review)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Status Snapshot grid silent loading (Removed non-existent fields from OData select query)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Status Snapshot create ODataException (Formatted ownerid using systemusers bind path format)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Programme budget child project rollup aggregation correction", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Bug Fix: Resource allocation availability calculation and warnings overlap logic in Dialog", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Timesheet grid hours race condition (Returned computed totals from recalculate endpoint to state)", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: Timesheet Submitted By / Approved By fields mapping and column selection in service", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Bug Fix: New timesheet creation period validation, resource selection enforcement, and future limit checks", assignee: "ravi", priority: "High", done: true },
  { summary: "Bug Fix: useDataGrid React hook violation (Stable memoization of search fields and filter functions, H8)", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Bug Fix: Silent error swallowing in services (Added console.error logs and error propagation to all 25+ services, H9)", assignee: "ravi", priority: "High", done: true },

  // CRITICAL GAPS - Remaining/Pending
  { summary: "Fix 1389 ESLint errors — pervasive any types, empty catch blocks, React hook violations", assignee: "suvigya", priority: "Medium", done: false },
  { summary: "Add unit/integration/E2E tests — Zero tests currently", assignee: "ravi", priority: "High", done: false },
  { summary: "Row-level data filtering — expand to Resources, Projects, Timesheets, Risks, Tasks", assignee: "ravi", priority: "High", done: false },
  { summary: "Column-level security — Hide financial fields from unauthorized personas", assignee: "suvigya", priority: "Medium", done: true },
  { summary: "API-level RBAC — Add $filter based on user persona in service calls", assignee: "suvigya", priority: "High", done: false },
  { summary: "WCAG 2.1 AA Accessibility — No accessibility implementation", assignee: "ravi", priority: "High", done: false }
];

(async () => {
  console.log('Launching browser in visible mode...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Jira...');
  await page.goto('https://xebia-team-imc13jgw.atlassian.net/jira/software/projects/J2/list?jql=project%20%3D%20J2%20and%20parent%20%3D%20J2-14');

  console.log('Waiting up to 3 minutes for you to log in. Please ensure the "Create" button is visible at the top...');
  await page.waitForSelector('button:has-text("Create")', { timeout: 180000 }).catch(() => console.log('Timeout waiting for Create button'));

  console.log('Injecting ticket creation & status sync script...');
  
  await page.evaluate(async (tickets) => {
    // Inject floating overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:20px; right:20px; background:#172B4D; color:white; padding:20px; z-index:999999; border-radius:8px; font-family:sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5); width: 400px; transition: all 0.3s; max-height: 80vh; overflow-y: auto;';
    document.body.appendChild(overlay);

    // Resolve Account IDs for both users
    let raviId = null;
    let suvigyaId = null;
    
    try {
      const userRes = await fetch(`/rest/api/3/user/search?query=${encodeURIComponent("Ravi Paliwal")}`);
      if (userRes.ok) {
        const users = await userRes.json();
        if (users && users.length > 0) {
          raviId = users[0].accountId;
        }
      }
    } catch(e) {
      console.error('Error finding user Ravi:', e);
    }

    try {
      const userRes = await fetch(`/rest/api/3/user/search?query=${encodeURIComponent("suvigya")}`);
      if (userRes.ok) {
        const users = await userRes.json();
        if (users && users.length > 0) {
          suvigyaId = users[0].accountId;
        }
      }
    } catch(e) {
      console.error('Error finding user Suvigya:', e);
    }

    // Cache priorities
    let prioritiesMap = {};
    try {
      const prioRes = await fetch('/rest/api/3/priority');
      if (prioRes.ok) {
        const priorities = await prioRes.json();
        priorities.forEach(p => {
          prioritiesMap[p.name.toLowerCase()] = p.id;
        });
      }
    } catch (e) {
      console.error('Error fetching priorities:', e);
    }

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const targetAssigneeId = t.assignee === 'ravi' ? raviId : suvigyaId;
      overlay.innerHTML = `<h3>🚀 Antigravity Sync</h3><p>Syncing ticket <b>${i+1}</b> of ${tickets.length}...</p><p style="color:#00C7E6;">${t.summary}</p><p><small>Assignee: ${t.assignee} | Done: ${t.done ? '✅ Yes' : '❌ No'}</small></p>`;

      try {
        // 1. Search if the issue already exists
        let issueKey = null;
        let currentStatus = null;
        const escapedSummary = t.summary.replace(/"/g, '\\"');
        const searchJql = `project = "J2" and summary ~ "\\"${escapedSummary}\\""`;
        const searchRes = await fetch(`/rest/api/3/search?jql=${encodeURIComponent(searchJql)}`);
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.issues && searchData.issues.length > 0) {
            const exactMatch = searchData.issues.find(issue => issue.fields.summary === t.summary);
            if (exactMatch) {
              issueKey = exactMatch.key;
              currentStatus = exactMatch.fields.status.name.toLowerCase();
              console.log(`Found existing ticket: ${issueKey} with status: ${currentStatus}`);
            }
          }
        }

        // 2. Create issue if not found
        if (!issueKey) {
          const payload = {
            fields: {
              project: { key: "J2" },
              summary: t.summary,
              issuetype: { name: "Task" },
              parent: { key: "J2-14" }
            }
          };

          if (targetAssigneeId) {
            payload.fields.assignee = { id: targetAssigneeId };
          }
          
          const prioId = prioritiesMap[t.priority.toLowerCase()];
          if (prioId) {
            payload.fields.priority = { id: prioId };
          }

          const createRes = await fetch('/rest/api/3/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (createRes.ok) {
            const newIssue = await createRes.json();
            issueKey = newIssue.key;
            console.log(`Created new ticket: ${issueKey} assigned to ${t.assignee}`);
          } else {
            const errData = await createRes.json();
            if (errData.errors && errData.errors.parent) {
              delete payload.fields.parent;
              const fieldsRes = await fetch('/rest/api/3/field');
              if (fieldsRes.ok) {
                const allFields = await fieldsRes.json();
                const epicLinkField = allFields.find(f => f.name === 'Epic Link');
                if (epicLinkField) {
                  payload.fields[epicLinkField.id] = 'J2-14';
                  const retryRes = await fetch('/rest/api/3/issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  if (retryRes.ok) {
                    const newIssue = await retryRes.json();
                    issueKey = newIssue.key;
                    console.log(`Created new ticket (Epic link): ${issueKey}`);
                  }
                }
              }
            }
          }
        }

        // 3. Transition if status needs to be updated to Done (Only if it's completed and not already done)
        if (issueKey && t.done && currentStatus !== 'done') {
          const transRes = await fetch(`/rest/api/3/issue/${issueKey}/transitions`);
          if (transRes.ok) {
            const transData = await transRes.json();
            const doneTransition = transData.transitions.find(tr => 
              tr.name.toLowerCase() === 'done' || 
              tr.to.name.toLowerCase() === 'done' || 
              tr.to.statusCategory.name.toLowerCase() === 'done'
            );

            if (doneTransition) {
              await fetch(`/rest/api/3/issue/${issueKey}/transitions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transition: { id: doneTransition.id }
                })
              });
              console.log(`Transitioned issue ${issueKey} to Done`);
            }
          }
        }

        await new Promise(r => setTimeout(r, 600));
      } catch(e) {
        console.error('Exception syncing', t.summary, e);
      }
    }
    
    overlay.innerHTML = `<h3>🚀 Antigravity Sync</h3><p>✅ All ${tickets.length} tickets synchronized!</p><p>Please refresh the page to see updates.</p>`;
    setTimeout(() => overlay.remove(), 10000);
  }, tickets);

  console.log('Finished updating tickets! Keeping browser open for 15 seconds to review...');
  await page.waitForTimeout(15000);
  await browser.close();
})();
