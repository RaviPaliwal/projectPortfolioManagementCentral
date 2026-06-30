import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// 1. Safe vanilla CSV parser
function parseCSV(csvContent) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField);
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentLine.push(currentField);
        currentField = '';
        if (currentLine.some(x => x !== '')) {
          lines.push(currentLine);
        }
        currentLine = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    if (currentLine.some(x => x !== '')) {
      lines.push(currentLine);
    }
  }
  return lines;
}

// 2. Read and parse Jira.csv
const csvPath = path.resolve('Jira.csv');
if (!fs.existsSync(csvPath)) {
  console.error(`Jira.csv not found at ${csvPath}`);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(csvContent);

if (rows.length < 2) {
  console.error('No tickets found in Jira.csv');
  process.exit(1);
}

const headers = rows[0].map(h => h.trim());
const getIndex = (name) => headers.indexOf(name);

const idxSummary = getIndex('Summary');
const idxKey = getIndex('Issue key');
const idxType = getIndex('Issue Type');
const idxStatus = getIndex('Status');
const idxPriority = getIndex('Priority');
const idxAssignee = getIndex('Assignee');
const idxParentKey = getIndex('Parent key');

if (idxSummary === -1 || idxStatus === -1) {
  console.error('CSV missing required headers (Summary, Status)');
  process.exit(1);
}

// Map rows to clean ticket objects
const tickets = rows.slice(1).map(row => {
  return {
    summary: row[idxSummary] || '',
    key: idxKey !== -1 ? row[idxKey] || '' : '',
    type: idxType !== -1 ? row[idxType] || 'Task' : 'Task',
    status: row[idxStatus] || 'To Do',
    priority: idxPriority !== -1 ? row[idxPriority] || 'Medium' : 'Medium',
    assignee: idxAssignee !== -1 ? row[idxAssignee] || '' : '',
    parentKey: idxParentKey !== -1 ? row[idxParentKey] || '' : '',
  };
}).filter(t => t.summary.trim() !== '');

console.log(`Parsed ${tickets.length} tickets from Jira.csv`);

// 3. Playwright browser automation
(async () => {
  console.log('Launching browser in visible mode...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Jira...');
  await page.goto('https://xebia-team-imc13jgw.atlassian.net/jira/software/projects/J2/list?jql=project%20%3D%20J2%20and%20parent%20%3D%20J2-14');

  console.log('Waiting up to 3 minutes for you to log in. Please ensure the "Create" button is visible at the top...');
  await page.waitForSelector('button:has-text("Create")', { timeout: 180000 }).catch(() => console.log('Timeout waiting for Create button'));

  console.log('Injecting ticket synchronization script...');

  await page.evaluate(async (tickets) => {
    // Inject floating overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:20px; right:20px; background:#172B4D; color:white; padding:20px; z-index:999999; border-radius:8px; font-family:sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5); width: 450px; max-height: 80vh; overflow-y: auto;';
    document.body.appendChild(overlay);

    const updateOverlay = (title, sub, detail, footer) => {
      overlay.textContent = '';
      
      const h3 = document.createElement('h3');
      h3.textContent = title;
      overlay.appendChild(h3);

      if (sub) {
        const p1 = document.createElement('p');
        p1.textContent = sub;
        overlay.appendChild(p1);
      }

      if (detail) {
        const p2 = document.createElement('p');
        p2.style.color = '#00C7E6';
        p2.style.fontWeight = '600';
        p2.textContent = detail;
        overlay.appendChild(p2);
      }

      if (footer) {
        const p3 = document.createElement('p');
        const small = document.createElement('small');
        small.textContent = footer;
        p3.appendChild(small);
        overlay.appendChild(p3);
      }
    };

    // Fetch and cache user account IDs
    const userCache = {};
    const getAssigneeId = async (name) => {
      if (!name) return null;
      if (userCache[name]) return userCache[name];
      try {
        const res = await fetch(`/rest/api/3/user/search?query=${encodeURIComponent(name)}`);
        if (res.ok) {
          const users = await res.json();
          if (users && users.length > 0) {
            userCache[name] = users[0].accountId;
            return users[0].accountId;
          }
        }
      } catch (e) {
        console.error('Error finding user:', name, e);
      }
      return null;
    };

    // Fetch and cache priorities
    const prioritiesMap = {};
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
      updateOverlay(
        '🚀 Jira Sync Tool',
        `Syncing ticket ${i + 1} of ${tickets.length}...`,
        `[${t.key || 'NEW'}] ${t.summary}`,
        `Status: ${t.status} | Priority: ${t.priority} | Assignee: ${t.assignee || 'None'}`
      );

      try {
        let issueKey = t.key;
        let currentStatus = null;

        // 1. Verify if issue exists (either by key or summary search)
        if (issueKey) {
          const checkRes = await fetch(`/rest/api/3/issue/${issueKey}`);
          if (checkRes.ok) {
            const issueData = await checkRes.json();
            if (issueData) {
              currentStatus = issueData.fields.status.name.toLowerCase();
            }
          } else {
            issueKey = null; // Key invalid or missing, search by summary instead
          }
        }

        if (!issueKey) {
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
              }
            }
          }
        }

        const targetAssigneeId = await getAssigneeId(t.assignee);

        // 2. Create issue if not found
        if (!issueKey) {
          const payload = {
            fields: {
              project: { key: "J2" },
              summary: t.summary,
              issuetype: { name: t.type || "Task" }
            }
          };

          if (t.parentKey) {
            payload.fields.parent = { key: t.parentKey };
          } else {
            payload.fields.parent = { key: "J2-14" };
          }

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
            console.log(`Created new ticket: ${issueKey}`);
          } else {
            const errData = await createRes.json();
            if (errData.errors && errData.errors.parent) {
              delete payload.fields.parent;
              // Fallback for Epic Link field if parent fails
              const fieldsRes = await fetch('/rest/api/3/field');
              if (fieldsRes.ok) {
                const allFields = await fieldsRes.json();
                const epicLinkField = allFields.find(f => f.name === 'Epic Link');
                if (epicLinkField) {
                  payload.fields[epicLinkField.id] = t.parentKey || 'J2-14';
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
        } else {
          // 2b. Update existing ticket assignee or priority if needed
          const updatePayload = { fields: {} };
          if (targetAssigneeId) {
            updatePayload.fields.assignee = { id: targetAssigneeId };
          }
          const prioId = prioritiesMap[t.priority.toLowerCase()];
          if (prioId) {
            updatePayload.fields.priority = { id: prioId };
          }

          if (Object.keys(updatePayload.fields).length > 0) {
            await fetch(`/rest/api/3/issue/${issueKey}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            });
          }
        }

        // 3. Update transition status if target status differs from current status
        const targetStatusClean = t.status.toLowerCase();
        if (issueKey && currentStatus && currentStatus !== targetStatusClean) {
          const transRes = await fetch(`/rest/api/3/issue/${issueKey}/transitions`);
          if (transRes.ok) {
            const transData = await transRes.json();
            const targetTransition = transData.transitions.find(tr =>
              tr.name.toLowerCase() === targetStatusClean ||
              tr.to.name.toLowerCase() === targetStatusClean ||
              tr.to.statusCategory.name.toLowerCase() === targetStatusClean
            );

            if (targetTransition) {
              await fetch(`/rest/api/3/issue/${issueKey}/transitions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transition: { id: targetTransition.id }
                })
              });
              console.log(`Transitioned issue ${issueKey} to status: ${t.status}`);
            }
          }
        }

        await new Promise(r => setTimeout(r, 450));
      } catch (e) {
        console.error('Exception syncing', t.summary, e);
      }
    }

    updateOverlay(
      '🚀 Jira Sync Tool',
      `All ${tickets.length} tickets synchronized successfully!`,
      'Done!',
      'Please refresh the page to see updates.'
    );
    setTimeout(() => overlay.remove(), 12000);
  }, tickets);

  console.log('Finished updating tickets! Keeping browser open for 15 seconds to review...');
  await page.waitForTimeout(15000);
  await browser.close();
})();
