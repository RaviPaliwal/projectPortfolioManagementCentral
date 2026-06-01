# PPM Central Application — Implementation Plan

> **Based on:** PPM Vendor Response Sheet (tender requirements)
> **Module:** Project Portfolio Management (PPM)
> **Updated:** May 30, 2026

---

## ✅ Fully Implemented Pages

| Module | Page | Features | Status |
|--------|------|----------|--------|
| Dashboard | DashboardPage | KPI cards, RAG distribution chart, budget vs actual, resource utilization charts | ✅ |
| Portfolios | PortfoliosPage | CRUD, detail drawer, confirmation dialogs | ✅ |
| Programmes | ProgrammesPage | List, detail drawer (risks, issues, projects), create with confirmation | ✅ |
| Projects | ProjectsPage | List with phases, detail drawer with tabs (Tasks, Milestones, Risks, Issues) | ✅ |
| Pipeline | PipelinePage (Initiatives) | Status management, create modal, filtered view | ✅ |
| Resources | ResourcesPage | Full CRUD, search/filter, detail view, assignments | ✅ |
| Timesheets | TimesheetsPage | Full CRUD, timesheet entries, approval workflow, status tracking | ✅ |
| Budgets | BudgetsPage | Full CRUD, KPI cards, variance analysis, category filtering, detail drawer | ✅ |
| Gate Reviews | GateReviewsPage | Full CRUD, KPI cards, outcomes tracking, conditions & documents | ✅ |
| Benefits | BenefitsPage | Full CRUD, KPI cards, performance measures, target vs actual tracking | ✅ |
| Schedule | SchedulePage | WBS hierarchy, task dependencies, milestones, progress tracking | ✅ |
| Issues | IssuesPage | Full CRUD, KPI cards, filters, resolution tracking | ✅ |
| Risks | RisksPage | Heatmap matrix, severity charts, mitigation actions, scoring | ✅ |
| **Change Requests** | ChangeRequestsPage | Full CRUD, KPI cards, cost/schedule impact tracking, lifecycle display | ✅ |
| **Cashflow** | CashflowPage | Full CRUD, KPI cards, inflow/outflow tracking, category/type filtering, net cash flow | ✅ |
| **Approval Requests** | ApprovalRequestsPage | Full CRUD, KPI cards, stage/entity/priority filters, decision tracking | ✅ |
| Debug | DebugDataPage | Generic query tool for all entities | ✅ |

---

## 📋 Already Built — No Further Action Needed

All 15 feature pages listed above are fully implemented with:
- ✅ Search & filter functionality
- ✅ Sortable tables with pagination
- ✅ KPI summary cards
- ✅ Detail side drawer with tabs
- ✅ Create/Edit dialog with form validation
- ✅ Delete confirmation dialog
- ✅ Success/error alert notifications
- ✅ Integration with Dataverse data services

---

## 📋 Additional Features That Could Be Added

These were mentioned in the requirements but don't have existing Dataverse service stubs:

| Feature | Notes |
|---------|-------|
| Funding Sources | CRUD for funding sources — `Pm_fundingsourcesService` exists |
| Skills Catalog | Skill definitions and resource-skill mapping — `Pm_skillsService` exists |
| Holiday Calendar | Public holiday management — `Pm_holidaiesService` exists |
| Workflow Automation | Workflow templates, steps, instances — `Pm_workflowsService`, `Pm_workflowinstancesService` exist |
| Approval Requests | Pending approvals across entity types — services exist |
| Reporting & Analytics | Trend charts, KPI scorecards, exports — new development |

---

## 📐 Architecture & Patterns

Each page follows the established pattern:
- `src/features/{module}/pages/{Module}Page.tsx` — Main page component
- Data services imported from `@/lib/dataverseClient`
- Models imported from `@/types/dataverse`
- Common components from `@/components/common`
- Routes registered in `src/app/routes.tsx`
- Navigation tabs in `src/components/layout/PrimaryShell.tsx`
