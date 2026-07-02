import { chromium } from 'playwright';
import * as fs from 'fs';

const logFile = './JIRA_TICKETS_LOG.md';

// === ANALYSIS: Tickets that are To Do but actually Done ===
const markDone = [];

// === NEW tickets for completed work missing from Jira ===
const newTickets = [
  { summary: 'Dashboard Task Widget UI enhancements: remove GUIDs, remove rounded corners, linear progress bar, color coding', priority: 'Medium' },
  { summary: 'Risk Page Mitigation Tag style fix', priority: 'Low' },
  { summary: 'Configurations/UI: Hide Funding Source tile, format Database confidence value to percentage, remove GUIDs', priority: 'Medium' },
  { summary: 'Resource Summary Page enhancements: rename Assignments to Allocations, remove Tasks/Approval tabs, remove Supplier field, add Detailed Allocations Analysis with KPI cards', priority: 'High' }
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to Jira...');
  console.log('Please log in when the browser opens. Waiting up to 3 minutes...');
  await page.goto('https://xebia-team-imc13jgw.atlassian.net/jira/software/projects/J2/list');
  await page.waitForSelector('button:has-text("Create")', { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const result = await page.evaluate(async ({ markDone, newTickets }) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;right:20px;background:#172B4D;color:white;padding:20px;z-index:999999;border-radius:8px;font-family:sans-serif;width:550px;box-shadow:0 4px 12px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;';
    document.body.appendChild(el);
    const status = (m) => { el.innerHTML = `<h3>Jira PPM Sync</h3>${m}`; };

    async function tf(url, opts) {
      try {
        const res = await fetch(url, opts);
        if (res.ok) return { ok: true, data: await res.json() };
        let t = ''; try { t = await res.text(); } catch(e) {}
        return { ok: false, status: res.status, text: t.slice(0,300) };
      } catch (e) { return { ok: false, error: e.message }; }
    }

    // 1. Resolve Ravi's account ID
    status('<p>Resolving assignee...</p>');
    let raviId = null;
    const userRes = await tf(`/rest/api/3/user/search?query=${encodeURIComponent('Ravi Paliwal')}`);
    if (userRes.ok && userRes.data?.length) raviId = userRes.data[0].accountId;
    console.log(`Ravi accountId: ${raviId}`);

    // 2. Fetch all PPM sub-tasks
    status('<p>Fetching current PPM tickets...</p>');
    let allIssues = [];
    let startAt = 0;
    const fields = ['summary','status','priority','assignee','created'];
    while (true) {
      const r = await tf('/rest/api/3/search/jql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: 'project = "J2" and parent = "J2-14" order by created ASC', maxResults: 100, startAt, fields })
      });
      if (!r.ok || !r.data?.issues?.length) break;
      allIssues.push(...r.data.issues);
      if (r.data.issues.length < 100) break;
      startAt += 100;
    }
    console.log(`Fetched ${allIssues.length} PPM tickets`);

    // 3. Build lookup by key
    const issueMap = {};
    for (const i of allIssues) issueMap[i.key] = i;

    // 4. Multi-hop transition to Done
    async function transitionToDone(key) {
      // First fetch available transitions
      let tr = await tf(`/rest/api/3/issue/${key}/transitions`);
      if (!tr.ok) return false;
      let trans = tr.data.transitions || [];
      // Find a path to Done
      let doneT = trans.find(t => t.to?.statusCategory?.key === 'done' || t.name.toLowerCase() === 'done');
      if (!doneT) {
        // Try In Progress intermediate
        let ipT = trans.find(t => t.to?.statusCategory?.key === 'indeterminate');
        if (ipT) {
          await tf(`/rest/api/3/issue/${key}/transitions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transition: { id: ipT.id } })
          });
          await new Promise(r => setTimeout(r, 1000));
          tr = await tf(`/rest/api/3/issue/${key}/transitions`);
          if (!tr.ok) return false;
          trans = tr.data.transitions || [];
          doneT = trans.find(t => t.to?.statusCategory?.key === 'done' || t.name.toLowerCase() === 'done');
        }
      }
      if (!doneT) return false;
      const r2 = await tf(`/rest/api/3/issue/${key}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition: { id: doneT.id } })
      });
      return r2.ok;
    }

    // 5. Mark existing tickets as Done
    let doneCount = 0;
    for (const key of markDone) {
      const issue = issueMap[key];
      if (!issue) { console.log(`${key} not found, skipping`); continue; }
      const currentStatus = (issue.fields.status?.name || '').toLowerCase();
      if (currentStatus === 'done' || currentStatus === 'completed') {
        console.log(`${key} already Done`);
        continue;
      }
      status(`<p>Marking ${key} as Done...</p>`);
      const ok = await transitionToDone(key);
      if (ok) { doneCount++; console.log(`${key} -> Done`); }
      else console.log(`Failed to transition ${key}`);
      await new Promise(r => setTimeout(r, 600));
    }

    // 6. Create missing tickets
    let createdCount = 0;
    for (const t of newTickets) {
      status(`<p>Creating: ${t.summary.slice(0,60)}...</p>`);

      // Check if already exists
      const exists = allIssues.some(i => i.fields.summary === t.summary);
      if (exists) { console.log(`Already exists: ${t.summary.slice(0,50)}`); continue; }

      // Create
      const payload = {
        fields: {
          project: { key: 'J2' },
          summary: t.summary,
          issuetype: { name: 'Task' },
          parent: { key: 'J2-14' }
        }
      };
      if (raviId) payload.fields.assignee = { id: raviId };

      // Get priority ID
      const prioRes = await tf('/rest/api/3/priority');
      if (prioRes.ok) {
        const p = prioRes.data.find(p => p.name.toLowerCase() === t.priority.toLowerCase());
        if (p) payload.fields.priority = { id: p.id };
      }

      let cr = await tf('/rest/api/3/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!cr.ok) {
        // Maybe Epic Link needed
        const errData = cr.data || cr.text;
        if (cr.status === 400) {
          delete payload.fields.parent;
          const fRes = await tf('/rest/api/3/field');
          if (fRes.ok) {
            const ef = fRes.data.find(f => f.name === 'Epic Link');
            if (ef) {
              payload.fields[ef.id] = 'J2-14';
              cr = await tf('/rest/api/3/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
            }
          }
        }
      }

      if (cr.ok && cr.data?.key) {
        const key = cr.data.key;
        console.log(`Created ${key}: ${t.summary.slice(0,50)}`);
        // Mark as Done immediately
        await new Promise(r => setTimeout(r, 1000));
        await transitionToDone(key);
        createdCount++;
      } else {
        console.log(`Failed to create: ${t.summary.slice(0,50)} (${cr.status || cr.error})`);
      }
      await new Promise(r => setTimeout(r, 800));
    }

    // 7. Fetch the updated list for the log
    status('<p>Fetching updated ticket list...</p>');
    let finalIssues = [];
    let sa = 0;
    while (true) {
      const r = await tf('/rest/api/3/search/jql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: 'project = "J2" and parent = "J2-14" order by created ASC', maxResults: 100, startAt: sa, fields: ['summary','status','priority','assignee','created','issuetype'] })
      });
      if (!r.ok || !r.data?.issues?.length) break;
      finalIssues.push(...r.data.issues);
      if (r.data.issues.length < 100) break;
      sa += 100;
    }

    const now = new Date().toISOString().split('T')[0];
    const doneNames = ['done','completed','closed'];
    const inProgNames = ['in progress','in review','in development','in testing'];
    const done = finalIssues.filter(i => doneNames.includes((i.fields.status?.name||'').toLowerCase()));
    const inProg = finalIssues.filter(i => inProgNames.includes((i.fields.status?.name||'').toLowerCase()));
    const todo = finalIssues.filter(i => !doneNames.includes((i.fields.status?.name||'').toLowerCase()) && !inProgNames.includes((i.fields.status?.name||'').toLowerCase()));

    let md = `# Jira Ticket Log \u2014 PPM (J2-14)\n\n`;
    md += `> **Generated**: ${now}\n> **Total**: ${finalIssues.length}\n\n---\n\n`;
    md += `## Summary\n\n| Status | Count |\n|--------|-------|\n`;
    md += `| Done | ${done.length} |\n| In Progress | ${inProg.length} |\n| To Do | ${todo.length} |\n| **Total** | **${finalIssues.length}** |\n\n---\n\n`;
    md += `## Sync Results\n\n- Marked Done: ${doneCount} tickets\n- Created & Done: ${createdCount} new tickets\n\n---\n\n`;

    md += `## All Tickets\n\n| # | Key | Summary | Status | Priority | Assignee |\n|---|-----|---------|--------|----------|----------|\n`;
    finalIssues.sort((a,b) => a.key.localeCompare(b.key)).forEach((i, idx) => {
      md += `| ${idx+1} | ${i.key} | ${(i.fields.summary||'').replace(/\|/g,'\\|')} | ${i.fields.status?.name||'Unknown'} | ${i.fields.priority?.name||'\u2014'} | ${i.fields.assignee?.displayName||'Unassigned'} |\n`;
    });
    md += `\n---\n> *End of log*\n`;

    status(`<p>Done! ${doneCount} marked Done, ${createdCount} created.</p>`);
    window.__result = JSON.stringify({ md, doneCount, createdCount });
    return { md, doneCount, createdCount };
  }, { markDone, newTickets });

  if (result?.md) {
    fs.writeFileSync(logFile, result.md, 'utf-8');
    console.log(`\n=== RESULTS ===`);
    console.log(`Marked Done: ${result.doneCount}`);
    console.log(`Created & Done: ${result.createdCount}`);
    console.log(`Log saved: ${logFile}`);
  }

  console.log('Keeping browser open 15s...');
  await page.waitForTimeout(15000);
  await browser.close();
})();
