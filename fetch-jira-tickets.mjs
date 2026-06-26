import { chromium } from 'playwright';
import * as fs from 'fs';

const logFile = './JIRA_TICKETS_LOG.md';

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
  await page.waitForSelector('button:has-text("Create")', { timeout: 180000 }).catch(() => {
    console.log('Create button not found, continuing...');
  });
  await page.waitForTimeout(3000);

  const md = await page.evaluate(async () => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;right:20px;background:#172B4D;color:white;padding:20px;z-index:999999;border-radius:8px;font-family:sans-serif;width:500px;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
    document.body.appendChild(el);
    const status = (m) => { el.innerHTML = `<h3>Jira Ticket Log</h3>${m}`; };

    async function tryFetch(url, opts) {
      try {
        const res = await fetch(url, opts);
        console.log(`  ${opts?.method||'GET'} ${url} => ${res.status}`);
        if (res.ok) return { ok: true, data: await res.json() };
        let t = ''; try { t = await res.text(); } catch(e) {}
        return { ok: false, status: res.status, text: t.slice(0,200) };
      } catch (e) { return { ok: false, error: e.message }; }
    }

    status('<p>Fetching all PPM sub-tasks (parent=J2-14)...</p>');

    let allIssues = [];
    const pageSize = 100;
    let startAt = 0;
    const fields = ['summary','status','priority','assignee','created','issuetype'];

    while (true) {
      const jql = 'project = "J2" and parent = "J2-14" order by created ASC';
      let r = await tryFetch('/rest/api/3/search/jql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql, maxResults: pageSize, startAt, fields })
      });
      if (!r.ok) {
        r = await tryFetch(`/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${pageSize}&fields=${fields.join(',')}`);
      }
      if (!r.ok || !r.data?.issues?.length) break;
      allIssues.push(...r.data.issues);
      console.log(`  => page ${Math.floor(startAt/pageSize)+1}: ${r.data.issues.length} (total: ${allIssues.length})`);
      if (r.data.issues.length < pageSize) break;
      startAt += pageSize;
    }

    status(`<p>Done. ${allIssues.length} tickets. Generating report...</p>`);

    const now = new Date().toISOString().split('T')[0];
    const doneNames = ['done','completed','closed'];
    const inProgNames = ['in progress','in review','in development','in testing'];
    const done = allIssues.filter(i => doneNames.includes((i.fields.status?.name||'').toLowerCase()));
    const inProg = allIssues.filter(i => inProgNames.includes((i.fields.status?.name||'').toLowerCase()));
    const todo = allIssues.filter(i => !doneNames.includes((i.fields.status?.name||'').toLowerCase()) && !inProgNames.includes((i.fields.status?.name||'').toLowerCase()));

    let md = `# Jira Ticket Log \u2014 Project Portfolio Management (J2)\n\n`;
    md += `> **Epic**: J2-14 \u2014 Power Platform PPM Solution\n`;
    md += `> **Generated**: ${now}\n`;
    md += `> **Total Tickets**: ${allIssues.length}\n\n`;
    md += `---\n\n## Summary\n\n| Status | Count |\n|--------|-------|\n`;
    md += `| Done | ${done.length} |\n| In Progress | ${inProg.length} |\n| To Do | ${todo.length} |\n| **Total** | **${allIssues.length}** |\n\n---\n\n`;
    md += `## All Tickets\n\n| # | Key | Type | Summary | Status | Priority | Assignee | Created |\n`;
    md += `|---|-----|------|---------|--------|----------|----------|---------|\n`;

    allIssues.sort((a,b) => a.key.localeCompare(b.key)).forEach((i, idx) => {
      md += `| ${idx+1} | ${i.key} | ${i.fields.issuetype?.name||'Task'} | ${(i.fields.summary||'').replace(/\|/g,'\\|')} | ${i.fields.status?.name||'Unknown'} | ${i.fields.priority?.name||'\u2014'} | ${i.fields.assignee?.displayName||'Unassigned'} | ${(i.fields.created||'').split('T')[0]} |\n`;
    });

    md += `\n---\n> *End of log*\n`;

    el.innerHTML = `<h3>Jira Ticket Log</h3><p>Done! ${allIssues.length} tickets logged.</p>`;
    return md;
  });

  if (md) {
    fs.writeFileSync(logFile, md, 'utf-8');
    const count = (md.match(/\| J2-\d+ \|/g) || []).length;
    console.log(`\nSaved ${logFile} (${md.length} bytes, ${count} tickets)`);
  } else {
    console.log('\nNo data returned.');
  }

  console.log('Keeping browser open 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})();
