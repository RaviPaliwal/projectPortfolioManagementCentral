const fs = require("fs");
const path = require("path");
const outPath = path.join(process.cwd(), "src", "features", "timesheets", "components", "TimesheetApprovalTaskModal.tsx");
const content = fs.readFileSync("/tmp/modal_content.txt", "utf-8");
fs.writeFileSync(outPath, content, "utf-8");
console.log("Written to:", outPath);