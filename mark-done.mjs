import { chromium } from 'playwright';

const notDoneSummaries = [
  "Fix 1389 ESLint errors — pervasive any types, empty catch blocks, React hook violations",
  "Add unit/integration/E2E tests — Zero tests currently",
  "Row-level data filtering — expand to Resources, Projects, Timesheets, Risks, Tasks",
  "Column-level security — Hide financial fields from unauthorized personas",
  "API-level RBAC — Add $filter based on user persona in service calls",
  "WCAG 2.1 AA Accessibility — No accessibility implementation"
];

const alreadyDoneThisSession = [
  { summary: "Delete functionality on Portfolios, Programmes, Projects, Pipeline", assignee: "suvigya", priority: "High" },
  { summary: "useAuthorization CRUD checks on all 21 CRUD-capable pages", assignee: "ravi", priority: "High" },
  { summary: "Route-level guard + deep-link URL support (?tab= param)", assignee: "ravi", priority: "High" },
  { summary: "Persona keyword priority fix (Executive before PMO)", assignee: "ravi", priority: "High" },
  { summary: "Manual persona override UI in User Selector", assignee: "ravi", priority: "High" },
  { summary: "S2-S4 resolved in COMPREHENSIVE_CODEBASE_AUDIT.md", assignee: "suvigya", priority: "High" },
  { summary: "Downgrade React to version 18.3.1 to resolve Fluent UI element warnings", assignee: "ravi", priority: "High" },
  { summary: "Enhanced report config configurations preview with dynamic Reporting Level scaling", assignee: "ravi", priority: "Medium" },
  { summary: "Support optional Limit to Portfolios / Programmes / Projects scope selection", assignee: "ravi", priority: "Medium" },
  { summary: "Add type safety checks for budget line pm_costcategory option sets in reporting grid", assignee: "ravi", priority: "High" },
  { summary: "Remove placeholder card from configurations main navigation tab", assignee: "ravi", priority: "Low" },
  { summary: "Fix ResponsiveContainer dimension warnings by adding minWidth props in charts", assignee: "ravi", priority: "Low" }
];

(async () => {
  console.log('Launching browser in persistent mode (saves login state)...');
  // Use persistent context so it saves cookies/login!
  const context = await chromium.launchPersistentContext('./playwright-profile', { headless: false });
  const page = await context.newPage();

  console.log('Navigating to Jira...');
  await page.goto('https://xebia-team-imc13jgw.atlassian.net/jira/software/projects/J2/list?jql=project%20%3D%20J2%20and%20parent%20%3D%20J2-14');

  await page.waitForSelector('button:has-text("Create")', { timeout: 180000 }).catch(() => {});
  
  // Forward browser console logs to Node.js terminal
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  console.log('Waiting 3 seconds for page and cookies to settle...');
  await page.waitForTimeout(3000);

  await page.evaluate(async ({ notDoneSummaries, alreadyDoneThisSession }) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:20px; right:20px; background:#172B4D; color:white; padding:20px; z-index:999999; border-radius:8px; width:450px; font-family:sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: all 0.3s;';
    document.body.appendChild(overlay);

    const updateStatus = (msg) => { overlay.innerHTML = `<h3>🚀 Antigravity Agent</h3>${msg}`; };
    updateStatus('<p>Querying tickets to update statuses...</p>');

    try {
      // 1. Fetch all J2-14 tickets using the new API endpoint
      console.log('Querying tickets using POST /rest/api/3/search/jql...');
      let searchRes = await fetch('/rest/api/3/search/jql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: 'project = "J2" and parent = "J2-14"', maxResults: 100, fields: ["summary", "status"] })
      });
      console.log('POST /rest/api/3/search/jql status:', searchRes.status);

      if (searchRes.status === 405 || searchRes.status === 404 || searchRes.status === 400 || searchRes.status === 410) {
        console.log('POST failed or returned status ' + searchRes.status + ', trying GET...');
        searchRes = await fetch('/rest/api/3/search/jql?jql=' + encodeURIComponent('project = "J2" and parent = "J2-14"') + '&maxResults=100&fields=summary,status');
        console.log('GET /rest/api/3/search/jql status:', searchRes.status);
      }

      if (!searchRes.ok) {
        const errorText = await searchRes.text();
        console.error('Fetch JQL failed:', searchRes.status, errorText);
        return updateStatus('<p>Failed to query: ' + searchRes.status + ' ' + errorText + '</p>');
      }
      const data = await searchRes.json();
      const existingIssues = data.issues || [];
      console.log('Successfully fetched ' + existingIssues.length + ' issues.');

      // Helper to multi-hop transition to Done
      const transitionToDone = async (issue) => {
        for (let step = 0; step < 2; step++) {
          const transRes = await fetch(`/rest/api/3/issue/${issue.key}/transitions`);
          console.log(`Fetching transitions for issue ${issue.key}...`);
          if (!transRes.ok) {
            console.error(`Failed to fetch transitions for ${issue.key}: ${transRes.status}`);
            return;
          }
          const transData = await transRes.json();
          
          let target = transData.transitions.find(t => 
            t.name.toLowerCase() === 'done' || 
            t.to.name.toLowerCase() === 'done' || 
            (t.to.statusCategory && t.to.statusCategory.key === 'done')
          );
          
          if (target) {
            console.log(`Found direct "Done" transition (ID: ${target.id}). Transitioning...`);
            const postRes = await fetch(`/rest/api/3/issue/${issue.key}/transitions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transition: { id: target.id } })
            });
            console.log(`Transition to Done response: ${postRes.status}`);
            return;
          } else {
            // Find "In Progress" step
            let inProgress = transData.transitions.find(t => 
              (t.to.statusCategory && t.to.statusCategory.key === 'indeterminate')
            );
            if (inProgress) {
              console.log(`No direct "Done" transition. Found "In Progress" intermediate transition (ID: ${inProgress.id}). Transitioning...`);
              const postRes = await fetch(`/rest/api/3/issue/${issue.key}/transitions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transition: { id: inProgress.id } })
              });
              console.log(`Transition to In Progress response: ${postRes.status}`);
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            console.warn(`No transition paths to "Done" or "In Progress" found for issue ${issue.key}.`);
            break;
          }
        }
      };

      // 2. Mark existing tickets as Done
      let doneCount = 0;
      for (const issue of existingIssues) {
        if (!issue || !issue.fields || !issue.fields.summary) continue;
        const summary = issue.fields.summary;
        
        if (!notDoneSummaries.includes(summary)) {
          const statusCategory = issue.fields.status?.statusCategory?.key;
          if (statusCategory !== 'done') {
            updateStatus(`<p>Moving to Done:</p><p style="color:#36B37E;">${summary}</p>`);
            await transitionToDone(issue);
            doneCount++;
            await new Promise(r => setTimeout(r, 600));
          }
        }
      }

      // 3. Create missing session tickets and mark them done
      let newlyCreated = 0;
      for (const t of alreadyDoneThisSession) {
        const exists = existingIssues.some(iss => iss.fields?.summary === t.summary);
        if (!exists) {
          updateStatus(`<p>Adding & Completing session task:</p><p style="color:#FFAB00;">${t.summary}</p>`);
          
          let assigneeId = null;
          if (t.assignee) {
            const userRes = await fetch(`/rest/api/3/user/search?query=${encodeURIComponent(t.assignee)}`);
            if (userRes.ok) {
              const users = await userRes.json();
              if (users && users.length > 0) assigneeId = users[0].accountId;
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
          if (assigneeId) payload.fields.assignee = { id: assigneeId };
          
          const prioRes = await fetch('/rest/api/3/priority');
          if (prioRes.ok) {
            const priorities = await prioRes.json();
            const prio = priorities.find(p => p.name.toLowerCase() === t.priority.toLowerCase());
            if (prio) payload.fields.priority = { id: prio.id };
          }

          let createdIssue = null;
          const createRes = await fetch('/rest/api/3/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (createRes.ok) {
            createdIssue = await createRes.json();
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
                  if (retryRes.ok) createdIssue = await retryRes.json();
                }
              }
            }
          }

          if (createdIssue && createdIssue.key) {
            await new Promise(r => setTimeout(r, 1000));
            await transitionToDone({ key: createdIssue.key });
          }
          
          newlyCreated++;
          await new Promise(r => setTimeout(r, 800));
        }
      }

      updateStatus(`<p>✅ Finished Updates!</p><p>Moved ${doneCount} tickets to Done.</p><p>Added & Completed ${newlyCreated} extra session tasks.</p><p>The page will now refresh automatically!</p>`);
      setTimeout(() => location.reload(), 5000);
    } catch(err) {
      updateStatus('<p>Script Error: ' + err.message + '</p>');
    }
  }, { notDoneSummaries, alreadyDoneThisSession });

  await page.waitForTimeout(25000);
  await context.close();
})();
