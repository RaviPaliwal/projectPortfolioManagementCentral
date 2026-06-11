const fs = require("fs");
const content = fs.readFileSync(/dev/stdin, "utf-8");
fs.writeFileSync("src/features/budgets/components/BudgetLineApprovalStepTaskModal.tsx", content, "utf-8");
console.log("Written successfully");