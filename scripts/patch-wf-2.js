const fs = require('fs');
let c = fs.readFileSync('src/features/workflows/pages/WorkflowsPage.tsx', 'utf8');
let changed = false;

// Tab content for Step Configuration
if (!c.includes('STEP 3: Step Config')) {
  const before = '{/* Create/Edit Dialog */}';
  if (c.includes(before)) {
    const tab = fs.readFileSync('scripts/step-config-tab.txt', 'utf8');
    c = c.replace(before, tab + '\n      ' + before);
    changed = true;
    console.log('Added step config tab');
  }
}

// Step template dialogs
if (!c.includes('Step Template Create')) {
  const before2 = '{/* Delete Confirmation */}';
  if (c.includes(before2)) {
    const dlg = fs.readFileSync('scripts/step-dialogs.txt', 'utf8');
    c = c.replace(before2, dlg + '\n      ' + before2);
    changed = true;
    console.log('Added step dialogs');
  }
}

if (changed) {
  fs.writeFileSync('src/features/workflows/pages/WorkflowsPage.tsx', c, 'utf8');
  console.log('File updated, length:', c.length);
} else {
  console.log('No changes needed or markers not found');
}
