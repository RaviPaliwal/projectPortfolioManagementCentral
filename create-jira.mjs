import { chromium } from 'playwright';

const tickets = [
  { summary: "Add exponential backoff retry logic and fallback cache to UserContext to prevent Dataverse API glitches", assignee: "ravi", priority: "High", done: true },
  { summary: "Security-gate localStorage persona overrides to prevent privilege escalation in production builds", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Enrich React PageErrorBoundary to display component stack traces in development mode", assignee: "ravi", priority: "Medium", done: true },
  { summary: "Add OData action success validation to Holidays, Change Requests, and Risks saving/seeding/deleting", assignee: "ravi", priority: "High", done: true },
  { summary: "Persist strategic roster layout mode selection in localStorage across component tab switches", assignee: "ravi", priority: "Low", done: true },
  { summary: "Implement Gate Review transition checklists and auto-trigger workflow chains on auto-submission", assignee: "ravi", priority: "High", done: true }
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
    } catch (e) {
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
    } catch (e) {
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
      overlay.innerHTML = `<h3>🚀 Antigravity Sync</h3><p>Syncing ticket <b>${i + 1}</b> of ${tickets.length}...</p><p style="color:#00C7E6;">${t.summary}</p><p><small>Assignee: ${t.assignee} | Done: ${t.done ? '✅ Yes' : '❌ No'}</small></p>`;

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
      } catch (e) {
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
