# PPM Central Application — Implementation Plan

> Generated: May 29, 2026
> Based on tender requirements (Ref: 9860) and Dataverse table design spec

---

## ✅ Already Implemented

| Module | Pages | Status |
|--------|-------|--------|
| Dashboard | DashboardPage — KPI cards, RAG distribution chart, budget vs actual, resource utilization charts | ✅ Done |
| Portfolios | PortfoliosPage — CRUD, detail drawer, confirmation dialogs | ✅ Done |
| Programmes | ProgrammesPage — List, detail drawer (risks, issues, projects), create with confirmation | ✅ Done |
| Projects | ProjectsPage — List with phases, detail drawer with tabs (Tasks, Milestones, Risks, Issues) | ✅ Done |
| Pipeline (Initiatives) | PipelinePage — Status management (Under Review / Approved / Rejected / Converted), create modal | ✅ Done |
| Tasks | Inside Project detail drawer — CRUD operations | ✅ Done |
| Milestones | Inside Project detail drawer — CRUD operations | ✅ Done |
| Risks | Inside Programme detail drawer — Create risks linked to projects | ✅ Done |
| Issues | Inside Programme detail drawer — Create issues linked to projects | ✅ Done |
| Resource Data Layer | Data services, seed data functions, chart data queries for resources/allocations/timesheets/entries | ✅ Data layer only |
| Debug | DebugDataPage — Generic query tool for all entities | ✅ Done |

---

## 📋 Phased Implementation Plan

---

### Phase 1 — Core Enhancements (2–3 weeks)

#### 1.1 Initiative Creation Improvements
- [ ] Link initiative to Programme when creating
- [ ] Default status: "Under Review"
- [ ] Better UI/UX for create initiative modal (sections, icons, field organization)
- [ ] Confirmation success dialog after initiative creation

#### 1.2 Resource List Page
- [ ] Page with table of all resources (name, type, role, department, capacity, status)
- [ ] Search & filter (by type, department, status)
- [ ] Create / Edit resource dialog
- [ ] Resource detail view showing assignments

#### 1.3 Timesheet Management Page
- [ ] Timesheet list (period, owner, status, total hours)
- [ ] Create / submit timesheet
- [ ] Timesheet entry logging (project, task, date, hours, chargeable)
- [ ] Timesheet approval workflow (submit → approve/reject)

#### 1.4 Budget Tracking Page
- [ ] Budget list per project/programme/portfolio
- [ ] Cost categories (Staff, Contractors, Licences, Infrastructure, etc.)
- [ ] Budget vs Actual variance display
- [ ] Create / Edit budget lines

---

### Phase 2 — Governance & Controls (2–3 weeks)

#### 2.1 Gate Review Page
- [ ] Schedule gate reviews (Gate 0–5) linked to projects/programmes
- [ ] Track review outcomes (Approved / Conditional / Rejected)
- [ ] Document & condition tracking

#### 2.2 Approval Requests Page
- [ ] Approval request list across entity types
- [ ] Approve / Reject / Delegate actions
- [ ] Priority & SLA date tracking

#### 2.3 Change Request Management Page
- [ ] Change requests (Scope / Schedule / Cost / Resource changes)
- [ ] Change lifecycle: Draft → Submitted → Under Review → Approved/Rejected
- [ ] Schedule impact (days) & cost impact (EUR) tracking
- [ ] Baseline update flag

#### 2.4 Benefits Register Page
- [ ] Benefits list (Financial / Non-Financial / Strategic)
- [ ] Target vs Actual value tracking
- [ ] Benefit measures per reporting period
- [ ] Benefits realization status (Planned / On Track / Realised etc.)

---

### Phase 3 — Advanced Features (3–4 weeks)

#### 3.1 Schedule Management — WBS & Gantt
- [ ] WBS task hierarchy (levels 0–10, parent-child)
- [ ] Task dependencies (predecessor → successor with lag/lead)
- [ ] Baseline (planned) vs actual dates
- [ ] Gantt chart visualization
- [ ] Critical path identification

#### 3.2 Capacity Planning & Resource Allocation
- [ ] Resource allocation calendar view
- [ ] Capacity vs allocation heatmap (already has data layer)
- [ ] Drag-and-drop assignment
- [ ] Allocation % and monthly capacity tracking

#### 3.3 Reporting & Analytics
- [ ] RAG Snapshot history — trend chart over time
- [ ] KPI Scorecard — target vs actual with RAG thresholds
- [ ] Period-based reporting (monthly/quarterly)
- [ ] Export to Excel/PDF

#### 3.4 Workflow Automation
- [ ] Workflow template configuration
- [ ] Approval step setup (approver order, conditions)
- [ ] Workflow instance tracking
- [ ] Email notifications on status changes

---

### Phase 4 — Polish & Integration (1–2 weeks)

#### 4.1 Remaining Pages
- [ ] Cashflow page (inflow/outflow per period)
- [ ] Funding Sources page
- [ ] Skills catalog & Resource-Skill mapping
- [ ] Public Holiday calendar
- [ ] Audit Log viewer

#### 4.2 Cross-Cutting Improvements
- [ ] Dark mode refinements
- [ ] Responsive layout improvements
- [ ] Loading skeletons & empty states
- [ ] Error handling improvements
- [ ] Data export (CSV/Excel) on list pages

---

## 🧭 Key Design Principles

| Principle | Guideline |
|-----------|-----------|
| **Prefix** | All custom tables use `pm_` prefix |
| **Currency** | Always use Currency data type with EUR |
| **Soft Delete** | Use `pm_isactive` / `statecode` — never hard delete |
| **Dates** | Date-Only for business dates, DateTime for audit timestamps |
| **Choices** | Use Global Option Sets where shared (RAG, Status, Phase) |
| **Lookups** | Always use OData bind syntax for creation |
| **Alias Fields** | Never include lookup alias fields in `getAll()` select lists — resolve separately |

---

## 📐 Page Template Structure

For each new page, follow this pattern:

```
src/components/pages/
  NewModulePage.tsx          — Main page component
  NewModuleDetailDrawer.tsx  — (optional) Detail side drawer
  NewModuleCreateDialog.tsx  — (optional) Create/Edit dialog

src/services/dataverseService.ts
  fetchNewModuleData()       — Data fetching functions
  createNewModuleItem()      — Create helper
  updateNewModuleItem()      — Update helper
  deleteNewModuleItem()      — Delete helper
```

---

*This plan will be updated as features are completed.*
