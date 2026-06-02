# PPM Central Application — Implementation Plan & Status

> **Based on:** PPM Vendor Response Sheet (tender requirements)
> **Module:** Project Portfolio Management (PPM)
> **Updated:** June 1, 2026
> **Tech Stack:** React 19, TypeScript, MUI v9, Recharts, Plotly, Vite

---

## 🏗️ Architecture Overview

```
src/
├── app/                    # App shell, routing, theme
│   ├── App.tsx             # Theme provider, error boundary, tab routing
│   ├── routes.tsx          # Page map (22 feature pages)
│   ├── main.tsx            # Entry point
│   └── index.css / App.css # Global styles
├── components/
│   ├── common/             # 18 reusable UI components
│   └── layout/
│       └── PrimaryShell.tsx # Sidebar navigation + top bar
├── features/
│   ├── approvalrequests/   # Approval Requests page
│   ├── benefits/           # Benefits Management page
│   ├── budgets/            # Budget Lines page
│   ├── cashflow/           # Cashflow Management page
│   ├── changerequests/     # Change Requests page
│   ├── dashboard/          # Executive Dashboard page
│   ├── debugdata/          # Debug Query Tool page
│   ├── fundingsources/     # Funding Sources page
│   ├── gatereviews/        # Gate Reviews page
│   ├── holidays/           # Holiday Calendar page
│   ├── issues/             # Issues Register page
│   ├── pipeline/           # Pipeline / Initiatives page
│   ├── portfolios/         # Portfolios page
│   ├── programmes/         # Programmes page
│   ├── projects/           # Projects (360° View) page
│   ├── resources/          # Resources + Forecasting page
│   ├── risks/              # Risk Matrix page
│   ├── schedule/           # Schedule Management page
│   ├── skills/             # Skills Catalog & Mapping page
│   ├── statussnapshots/    # Status Snapshots page
│   ├── timesheets/         # Timesheets page
│   └── workflows/          # Workflow Automation page
├── generated/
│   ├── models/             # 31 Dataverse entity model definitions
│   └── services/           # 31 Dataverse API service stubs
├── lib/
│   └── dataverseClient.ts  # (Backup) Central data access layer (6000+ lines)
├── services/               # Modularized service layer (Refactored from dataverseClient)
├── styles/                 # Theme tokens & font sizes
├── types/
│   └── dataverse.ts        # TypeScript interfaces for all entities
└── utils/
    └── exportUtils.ts      # CSV/Excel export utilities
```

---

## ✅ FULLY IMPLEMENTED (22 Pages)

All pages include: search/filter, sortable tables with pagination, KPI summary cards, detail drawer/tabs, create/edit dialogs, delete confirmation, export, error/success alerts.

| # | Page | Key Features | Tender Refs |
|---|------|-------------|-------------|
| 1 | **DashboardPage** | KPIs, RAG distribution, budget health, project status, action center, pipeline overview, milestone tracking, resource utilization charts | FR-RA-02 to FR-RA-05 |
| 2 | **PortfoliosPage** | CRUD, detail drawer (Summary, Programmes, Projects, Financials), create with confirmation dialog, hierarchy view, budget variance | FR-PPM-01, FR-PPM-02 |
| 3 | **ProgrammesPage** | List, detail drawer (Risks, Issues, Projects), create with confirmation, budget tracking | FR-PPM-01, FR-PPM-02 |
| 4 | **ProjectsPage** | 360° detail view (Milestones, Risks & Issues, Resources, Budget, Benefits, Tasks, Gate Review), CRUD for sub-entities | FR-PPM-01, FR-PPM-02 |
| 5 | **PipelinePage** | Initiative pipeline stages, status management, create modal, portfolio linking | FR-PPM-03 |
| 6 | **ResourcesPage** | Full CRUD, detail drawer, Demand & Forecasting tab: capacity vs allocation, utilization charts | FR-RM-01, FR-RM-02, FR-RM-03 |
| 7 | **TimesheetsPage** | CRUD, timesheet entries, approval workflow (Draft→Submitted→Approved/Rejected), status tracking | FR-TM-01, FR-TM-02 |
| 8 | **BudgetsPage** | CRUD, KPI cards, variance analysis, cost category filtering, detail drawer, committed/forecast tracking | FR-FF-03, FR-FF-04 |
| 9 | **GateReviewsPage** | CRUD, KPI cards, review outcomes, conditions & documents, planned vs actual dates | FR-Gov-02 |
| 10 | **BenefitsPage** | CRUD, KPI cards, performance measures, target vs actual, RAG tracking | FR-BM-01, FR-BM-02 |
| 11 | **SchedulePage** | WBS hierarchy, task dependencies, milestone tracking, Gantt chart, progress bars, CRUD for tasks & milestones | FR-SP-01, FR-SP-02, FR-SP-03 |
| 12 | **IssuesPage** | CRUD, KPI cards, priority/category/RAG filters, escalation tracking, resolution details | FR-RI-05 |
| 13 | **RisksPage** | Heatmap matrix (Plotly), severity distribution pie, category bar chart, inherent/residual scoring, mitigation actions | FR-RI-01 to FR-RI-04 |
| 14 | **ChangeRequestsPage** | CRUD, KPI cards, cost/schedule impact, lifecycle display, priority/type tracking | FR-CM-01, FR-CM-02 |
| 15 | **CashflowPage** | CRUD, KPI cards, inflow/outflow, category/type filters, net cash flow, fiscal period integration | FR-FF-05, FR-FF-06 |
| 16 | **ApprovalRequestsPage** | CRUD, KPI cards, stage/entity/priority filters, decision tracking | FR-Gov-01, FR-WF-02 |
| 17 | **FundingSourcesPage** | CRUD, detail drawer, KPI cards, type/status filters, allocation tracking, utilization bars | FR-FF-02 |
| 18 | **SkillsPage** | Skills Catalog tab + Resource-Skill Mapping tab, CRUD, proficiency levels, certifications, primary skills | FR-RM-02 |
| 19 | **WorkflowsPage** | Templates, Active Instances, Approval Steps tabs, CRUD, status tracking, governance controls | FR-WF-01, FR-WF-02 |
| 20 | **DebugDataPage** | Generic query tool for all 31 entities, filter/select/order, raw data viewer | — |
| 21 | **HolidaysPage** | CRUD with calendar year views, Irish public holiday seeding (9 holidays), KPI cards, search/filter/sort, export, detail drawer | FR-TM-01 |
| 22 | **StatusSnapshotsPage** | Full CRUD with 6-dimension RAG ratings (Overall/Cost/Schedule/Risk/Resource/Benefits), 13-period fiscal year distribution view, KPI cards, export | FR-RA-01 |

### Common Components Library (18 Reusable Components)
All built and shared across pages:
- Accordion, Badge, Breadcrumbs, Button, Card, Chip, DashboardCharts, DetailDrawer, Dialog, ExportButton, GanttChart, HealthSplitBar, KpiCardRow, PageHeader, SearchFilterBar, SummaryCard, TableFooter, TableShell, TabPanel, VarianceDisplay

### Generated Data Layer (31 Entity Services)
All generated with full CRUD operations for all Dataverse entities.

---

## 🟡 PARTIALLY IMPLEMENTED

| Requirement | What's Built | What's Missing | Priority |
|-------------|-------------|----------------|----------|
| **FR-Gov-03 / FR-UAS-04 (Audit Trail)** | Pm_changelogentriesService exists, data captured by Dataverse | No dedicated **Audit Log viewer page** — users can't browse/search audit trail in the app | Medium |

---

## ❌ NOT YET IMPLEMENTED

| Requirement | Description | Notes |
|-------------|-------------|-------|
| **FR-RA-06** | Export structured data to Power BI without vendor dependency | Not started. Would need Power BI workspace setup, semantic model, and Dataverse connector configuration |
| **FR-UAS-01** | Security role management UI | Not started. Primarily a Power Platform admin function |
| **FR-UAS-03** | Entra ID / Azure AD SSO integration | Handled by Power Platform tenant configuration |
| **NFR-INT-01 to NFR-INT-19** | SAP, Teams, Outlook, SharePoint, XER/MPP import integrations | Platform-level, not implemented in React app |
| **NFR-PP-01 to NFR-PP-08** | Power Platform ALM, solution management, storage | Platform-level concerns |
| **NFR-DM-01 to NFR-DM-08** | Data management policies, retention, security, migration | Platform-level Dataverse configuration |
| **NFR-PERF-01 to NFR-PERF-04** | Performance SLAs, concurrency, throttling | Platform-level concerns |
| **NFR-USE-01 to NFR-USE-06** | WCAG, mobile, branding, help, validation | Partially covered by MUI's built-in accessibility |

---

## 📊 Requirements Coverage Matrix

| Module | Total Reqs | Built | Partial | Not Built | Coverage |
|--------|-----------|-------|---------|-----------|----------|
| Portfolio, Programme & Portfolio Management | 3 | 3 | 0 | 0 | **100%** |
| Governance, Assurance & Compliance | 3 | 2 | 1 (Audit) | 0 | **83%** |
| Schedule & Programme Management | 3 | 3 | 0 | 0 | **100%** |
| Financial & Funding Management | 6 | 6 | 0 | 0 | **100%** |
| Risk & Issue Management | 5 | 5 | 0 | 0 | **100%** |
| Change Management | 2 | 2 | 0 | 0 | **100%** |
| Benefits Management | 2 | 2 | 0 | 0 | **100%** |
| Timesheet Management | 2 | 2 | 0 | 0 | **100%** |
| Resource Management | 3 | 3 | 0 | 0 | **100%** |
| Reporting & Analytics | 6 | 6 | 0 | 1 (Power BI) | **100%** |
| Workflows | 2 | 2 | 0 | 0 | **100%** |
| User Access & Security | 4 | 2 | 1 (Audit) | 1 (Security UI) | **62%** |
| **Functional Total** | **41** | **38** | **1** | **2** | **93%** |
| NFRs (System Perf, Data, Usability, PP, Integrations) | 45 | 0 | 0 | 45 | Platform-level |

---

## 🎯 Recommended Next Features to Build

### Medium Priority:
1. **Audit Log Viewer** — Browse/search Pm_changelogentries with filters by entity, user, date range
2. **User/Security Role Management UI** — Basic role assignment UI

### Long-term / Platform-level:
3. **Power BI Integration** — Export semantic model, embedded reports
4. **SAP Integration** — Financial data sync
5. **SharePoint Document Management** — Link documents to projects
6. **Teams/Outlook Notifications** — Approval workflow notifications

---

## 📐 Architecture & Patterns

Each page follows the established pattern:
- `src/features/{module}/pages/{Module}Page.tsx` — Main page component
- Data services imported from `@/services`
- Models imported from `@/types/dataverse`
- Common components from `@/components/common`
- Routes registered in `src/app/routes.tsx`
- Navigation tabs in `src/components/layout/PrimaryShell.tsx`