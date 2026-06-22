# COMPREHENSIVE CODEBASE AUDIT REPORT

> **Project**: Project Portfolio Management (PPM) Central  
> **Audit Date**: 22 June 2026  
> **Codebase**: 269 source files across `src/`  
> **Framework**: React 19 + TypeScript 5.9 + Vite 7 + MUI 9  
> **Target Platform**: Microsoft Power Platform / Dataverse

---

## TABLE OF CONTENTS

1. [EXECUTIVE SUMMARY](#1-executive-summary)
2. [PROJECT OVERVIEW](#2-project-overview)
3. [BUILD & TOOLING AUDIT](#3-build--tooling-audit)
4. [ARCHITECTURAL ANALYSIS](#4-architectural-analysis)
5. [FEATURE MODULE AUDIT](#5-feature-module-audit)
6. [SERVICES LAYER AUDIT](#6-services-layer-audit)
7. [SECURITY & PERSONA AUDIT](#7-security--persona-audit)
8. [HOOKS & UTILITIES AUDIT](#8-hooks--utilities-audit)
9. [COMMON COMPONENTS AUDIT](#9-common-components-audit)
10. [GENERATED SDK AUDIT](#10-generated-sdk-audit)
11. [DATA MODEL & TYPES AUDIT](#11-data-model--types-audit)
12. [INTEGRATION GAPS](#12-integration-gaps)
13. [ITT REQUIREMENT COVERAGE MATRIX](#13-itt-requirement-coverage-matrix)
14. [PRIORITIZED FINDINGS](#14-prioritized-findings)
15. [RECOMMENDATIONS](#15-recommendations)

---

## 1. EXECUTIVE SUMMARY

### Overall Assessment: **MVP-READY WITH SIGNIFICANT GAPS**

The codebase implements a **feature-rich Project Portfolio Management** front-end application built on React 19 with MUI 9, targeting Microsoft Dataverse via the Power Apps SDK. It has **24 registered feature modules**, a **custom workflow approval engine**, **34 reusable common components**, **25 custom services**, and **42 auto-generated SDK models/services**.

### Key Strengths

| Area | Assessment |
|------|-----------|
| **Architecture** | Well-structured: feature modules, service layer, generated SDK boundary, event-driven modals |
| **Workflow Engine** | Comprehensive: multi-step approval flows, 17 form registrations, Power Automate integration |
| **UI Consistency** | MUI-based with reusable components (KpiCardRow, SearchFilterBar, TableShell, DetailDrawer) |
| **Build** | Build succeeds cleanly with `tsc -b && vite build` in 18.5s |
| **Feature Coverage** | All major PPM domains covered: portfolios, programmes, projects, pipeline, resources, timesheets, budgets, gate reviews, benefits, risks, issues, change requests, cashflow, funding sources, workflows, status snapshots |

### Critical Weaknesses

| Area | Assessment |
|------|-----------|
| **Code Quality (Linting)** | **1389 ESLint errors** — dominated by `@typescript-eslint/no-explicit-any` (~95% of errors) |
| **Security/Auth** | CRUD-level enforcement is now adopted across all CRUD-capable pages (21/21); 8 read-only pages exempt |
| **Integrations** | **0 of 19 integration requirements implemented** — SAP, P6, SharePoint, Teams, Power BI all missing |
| **Testing** | **Zero tests** — no unit, integration, or E2E tests configured |
| **Accessibility** | WCAG 2.1 AA **not addressed** |
| **Form Validation** | No centralized validation framework — manual per-field checks |
| **Accessibility** | No in-app help, tooltips, or contextual guidance |
| **Row/Column Security** | Only IssuesPage implements persona-based row filtering |

---

## 2. PROJECT OVERVIEW

### 2.1 Project Identity

| Field | Value |
|-------|-------|
| **App Name** | Project Portfolio Management Central |
| **App ID** | `91951220-8a65-422c-9810-d19d4496d6be` |
| **Environment ID** | `b13877a6-5201-e4ef-8d74-878957333982` |
| **Region** | Production |
| **Entry Point** | `src/app/main.tsx` |
| **Build Output** | `dist/` |

### 2.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | ^19.2.0 |
| **Language** | TypeScript | ~5.9.3 |
| **Build** | Vite | ^7.2.4 |
| **UI Library** | MUI (Material UI) | ^9.0.1 |
| **Charting** | Recharts | ^3.8.1 |
| **Dataverse SDK** | @microsoft/power-apps | ^1.0.3 |
| **Power Apps Vite Plugin** | @microsoft/power-apps-vite | ^1.0.2 |
| **Emotion (CSS-in-JS)** | @emotion/react, @emotion/styled | ^11.14.x |
| **Icons** | @mui/icons-material | ^9.0.1 |
| **Linting** | ESLint | ^9.39.1 |
| **AI Tools** | opencode-ai | ^1.17.8 |

### 2.3 Codebase Statistics

| Metric | Count |
|--------|-------|
| **Total source files** | 269 |
| **Feature modules** | 24 (all registered) |
| **Feature pages** | 27 |
| **Feature components** | 65 |
| **Common components** | 33 + 2 layout |
| **Custom hooks** | 4 |
| **Hand-written services** | 25 |
| **Generated models** | 42 |
| **Generated services** | 42 |
| **Constants files** | 9 |
| **Utility files** | 4 |
| **Context providers** | 1 |
| **Type definition files** | 1 |
| **Style/theme files** | 3 |

---

## 3. BUILD & TOOLING AUDIT

### 3.1 Build Result: ✅ PASS

| Metric | Result |
|--------|--------|
| **TypeScript compilation** | Passes with `tsc -b` |
| **Vite build** | Succeeds (18.5s) |
| **Output chunks** | 19 chunks |
| **Total bundle size** | ~2.3 MB (uncompressed) |
| **Largest chunk** | `index-fyFEyolz.js` at 1,041 KB (main app code) |
| **Chunk splitting** | mui-vendor (417 KB), vendor (435 KB), recharts-vendor (267 KB) |

### 3.2 Lint Result: ❌ FAIL — 1389 Errors, 13 Warnings

**Error Categories:**

| Error Type | Count | Severity |
|-----------|-------|----------|
| `@typescript-eslint/no-explicit-any` | ~1300 | **Massive** — pervasive `any` types |
| `no-empty` (empty catch blocks) | ~80 | High — silent error swallowing |
| `@typescript-eslint/no-unused-vars` | ~50 | Medium |
| `react-hooks/refs` (refs in render) | 3 | High — actual React bug |
| `no-useless-catch` | 1 | Low |
| `prefer-const` | 2 | Low |

**Files with most lint errors:**

| File | Errors | Primary Issue |
|------|--------|---------------|
| `src/services/workflow.service.ts` | ~45 | `any` types everywhere |
| `src/services/finance.service.ts` | ~45 | `any` types |  
| `src/services/governance.service.ts` | ~30 | `any` types |
| `src/services/project.service.ts` | ~45 | `any` types |
| `src/services/risk-issue.service.ts` | ~40 | `any` types |

### 3.3 Testing: ❌ NOT CONFIGURED

| Requirement | Status |
|------------|--------|
| Unit test framework | Not configured |
| Integration tests | Not configured |
| E2E tests | Playwright MCP tool configured but zero tests written |
| Test runner | Not in package.json |

### 3.4 TypeScript Configuration

| Setting | Value | Assessment |
|---------|-------|-----------|
| `strict` | `true` | ✅ Good |
| `noImplicitAny` | `false` | ⚠️ Allows implicit any — root cause of lint errors |
| `noUnusedLocals` | `false` | ⚠️ Allows unused variables |
| `noUnusedParameters` | `false` | ⚠️ Allows unused params |
| `erasableSyntaxOnly` | `true` | ✅ Good for Power Apps |
| `target` | ES2022 | ✅ Modern |
| `jsx` | react-jsx | ✅ Standard |

---

## 4. ARCHITECTURAL ANALYSIS

### 4.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Power Platform Host                        │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PrimaryShell (Tab Navigation)                        │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   RouteGuard (Tab-level Auth Check)              │  │   │
│  │  │   ┌───────────────────────────────────────────┐  │  │   │
│  │  │   │   24 Feature Modules (pages/)              │  │  │   │
│  │  │   │   ┌─────────┐ ┌─────────┐ ┌───────────┐  │  │  │   │
│  │  │   │   │Portfolio│ │Projects │ │Workflows  │  │  │  │   │
│  │  │   │   │Programme│ │Pipeline │ │Budgets    │  │  │  │   │
│  │  │   │   │Resources│ │Risks    │ │Timesheets │  │  │  │   │
│  │  │   │   │Issues   │ │Benefits │ │+ 12 more  │  │  │  │   │
│  │  │   │   └─────────┘ └─────────┘ └───────────┘  │  │  │   │
│  │  │   └───────────────────────────────────────────┘  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   Event System (form:open-dialog / decision-complete)│ │
│  │  │   ┌──────────┐  ┌───────────┐  ┌─────────────┐ │  │   │
│  │  │   │FormDialog│  │DecisionBox│  │17 Task Modals│ │  │   │
│  │  │   └──────────┘  └───────────┘  └─────────────┘ │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   Services Layer (25 hand-written services)     │  │   │
│  │  │   ┌───────────────────────────────────────────┐ │  │   │
│  │  │   │  Business Logic + Audit + Lookup Resolution│ │  │   │
│  │  │   └───────────────────────────────────────────┘ │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   Generated SDK (42 models + 42 services)        │  │   │
│  │  │   ┌───────────────────────────────────────────┐ │  │   │
│  │  │   │  @microsoft/power-apps CRUD Wrappers      │ │  │   │
│  │  │   └───────────────────────────────────────────┘ │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │   Microsoft Dataverse (pm_* entities)            │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Architectural Patterns

| Pattern | Description | Usage |
|---------|-------------|-------|
| **Tab-based SPA** | PrimaryShell renders tabs based on persona, RouteGuard checks access | All pages |
| **Event-Driven Modals** | `form:open-dialog` / `form:decision-complete` custom events | Task modal system |
| **Service Layer Decoupling** | Pages call service files, not generated SDK directly | All CRUD |
| **Feature Module Pattern** | Each domain self-contained in `features/<name>/` | All modules |
| **Generated Code Boundary** | `generated/` never edited; services/ wraps with business logic | SDK boundary |
| **Persona Resolution** | UserContext resolves persona via keyword matching | Auth throughout |
| **Audit Logging Pattern** | Most service operations write to `pm_changelogentries` | 15+ services |

### 4.3 Navigation Flow

```
User opens app
  → main.tsx renders App.tsx
    → UserContextProvider fetches users/teams/roles
      → Resolves persona for current user
        → PrimaryShell renders filtered tabs
          → RouteGuard checks tab access
            → Selected page renders
              → User interacts (CRUD, workflows, etc.)
                → FormDialog listens for modal events
                  → Task modals dispatched via event system
                    → Decisions dispatch form:decision-complete
                      → Parent pages refresh
```

### 4.4 Data Flow

```
User Action (click, form submit)
  → Page component handler
    → Authorization check (useAuthorization)
      → Service function call
        → Audit log write (changelog.service)
          → Generated SDK CRUD
            → Dataverse API (via @microsoft/power-apps)
              → Response unwrapping (unwrapList/unwrapSingle)
                → State update (useDataverseAsync/useDataverseCrud)
                  → UI re-render
```

---

## 5. FEATURE MODULE AUDIT

### 5.1 Module Registration Status

| # | Module | Registered? | Tab Visible? | Lines | Has CRUD? | Has Loading/Error/Empty? | Auth Checks? | Assessment |
|---|--------|------------|-------------|-------|-----------|------------------------|-------------|------------|
| 1 | Dashboard | ✅ | ✅ | 336 | Read-only | ✅ Full | ❌ None (read-only) | **Complete** |
| 2 | Portfolios | ✅ | ✅ | 636 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 3 | Programmes | ✅ | ✅ | 879 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 4 | Projects | ✅ | ✅ | 663 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 5 | Pipeline | ✅ | ✅ | 1311 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 6 | Resources | ✅ | Hidden | 1690 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 7 | Timesheets | ✅ | ✅ | 599/839 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 8 | Budgets | ✅ | ✅ | 908 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 9 | Gate Reviews | ✅ | ✅ | 479 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 10 | Benefits | ✅ | ✅ | 510 | Full CRUD | 🟡 Partial | ✅ C/U/D | **Good** |
| 11 | Risks | ✅ | ✅ | 388 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 12 | Issues | ✅ | ✅ | 777 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 13 | Change Requests | ✅ | ✅ | 1072 | Full CRUD | ✅ Full | ✅ C/U/D | **Large file** |
| 14 | Cashflow | ✅ | ✅ | 267 | Full CRUD | 🟡 Partial (no loading) | ✅ C/U/D | **Minor gaps** |
| 15 | Tasks | ✅ | ✅ | 391 | Read-only | ✅ Full | ❌ None (read-only) | **Good** |
| 16 | Funding Sources | ✅ | ✅ | 1062 | Full CRUD | ✅ Full | ✅ C/U/D | **Large file** |
| 17 | Skills | ✅ | Hidden | 902 | Full CRUD | ✅ Full | ✅ C/U/D | **Complete** |
| 18 | Workflows | ✅ | Hidden | 457 | Full CRUD | ✅ Full | ✅ | **Complete** |
| 19 | Status Snapshots | ✅ | ✅ | 1001 | Full CRUD | ✅ Full | ✅ | **Complete** |
| 20 | Strategic Roster | ✅ | ✅ | 923 | Read-only | ✅ Full | ❌ None (read-only) | **Visual tool** |
| 21 | Holidays | ✅ | Hidden | 334 | Full CRUD | ✅ Full | ✅ | **Complete** |
| 22 | Team Admin | ✅ | Hidden | 359 | C,R,U,D (team members) | ✅ Full | ✅ C/D | **Good** |
| 23 | Configurations | ✅ | ✅ | 169 | None (launcher) | N/A | ❌ None (hub page) | **Hub page** |
| 24 | Calendar | ✅ | ✅ | 1602 | Read + Create events | 🟡 Partial | ❌ None (local/Outlook only) | **Monolithic** |
| 25 | Activity Log | ✅ | ✅ | 761 | Read-only | ✅ Full | ❌ None (read-only) | **Good** |

### 5.2 Page Size Distribution

| Size Range | Files | Modules |
|-----------|-------|---------|
| < 300 lines | 3 | Cashflow, Configurations |
| 300-500 lines | 5 | Dashboard, Gate Reviews, Tasks, TeamAdmin, Risks |
| 500-800 lines | 7 | Portfolios, Projects, Benefits, Timesheets, ActivityLog, Issues, Workflows |
| 800-1100 lines | 5 | Programmes, Budgets, Skills, StatusSnapshots, StrategicRoster |
| 1000+ lines | 4 | Pipeline (1311), ChangeRequests (1072), FundingSources (1062), Calendar (1602) |

### 5.3 Common Patterns Across Modules

**Consistent patterns observed:**
- ✅ `PageHeader` with title/subtitle/action button
- ✅ `KpiCardRow` for key metrics
- ✅ `SearchFilterBar` for filtering
- ✅ `TableShell` with loading/empty states
- ✅ `DetailDrawer` for drill-down
- ✅ `ConfirmDialog` for destructive actions
- ✅ `useAuthorization` for button visibility (all 21 CRUD-capable pages)
- ✅ `FORM_DIALOG_DECISION_EVENT` for cross-module refresh
- ✅ Deep-link navigation via `sessionStorage` (projects, risks, issues)

**Inconsistent patterns:**
- ⚠️ Some pages use inlined forms (ChangeRequests, FundingSources) vs extracted components
- ⚠️ Some pages check `result.success`; others rely on try/catch
- ⚠️ Delete confirmations vary (some use ConfirmDialog, others Alert dialogs)
- ⚠️ Benefits, Cashflow lack `DetailDrawer` drill-down
---

## 6. SERVICES LAYER AUDIT

### 6.1 Hand-written Services (25 files)

| # | Service | Lines | CRUD | Audit Logging | Error Handling | Notes |
|---|---------|-------|------|--------------|---------------|-------|
| 1 | `common.ts` | ~200 | Utilities only | N/A | N/A | unwrapList, unwrapSingle, parseDataverseError |
| 2 | `agent-insights.service.ts` | ~60 | Read | ❌ | ✅ catch + return [] | |
| 3 | `annotation.service.ts` | ~80 | C,R (comments) | ❌ | 🟡 catch + return [] | Uses raw fetch, not SDK |
| 4 | `approval.service.ts` | ~100 | Full CRUD | ❌ | ✅ catch + re-throw | |
| 5 | `change-request.service.ts` | ~300 | Full CRUD | ✅ writes changelog | 🟡 empty catch blocks | Lookup name resolution |
| 6 | `changelog.service.ts` | ~250 | Write only | N/A (is audit) | 🟡 empty catch blocks | Session ID from URL/Xrm |
| 7 | `chart.service.ts` | ~300 | Read only | ❌ | 🟡 catch + return [] | Chart data aggregation |
| 8 | `dashboard.service.ts` | ~200 | Read only | ❌ | 🟡 catch + return [] | Parallel queries |
| 9 | `document.service.ts` | ~200 | C,R,D | ✅ writes changelog | 🟡 empty catch blocks | Binary upload support |
| 10 | `finance.service.ts` | ~1000 | Full CRUD | ❌ | 🟡 mixed patterns | Budgets, Funding, Cashflow + recalculation |
| 11 | `governance-readiness.service.ts` | ~100 | Read only | ❌ | ❌ no error handling | Gate readiness checklists |
| 12 | `governance.service.ts` | ~500 | Full CRUD | ✅ writes changelog | 🟡 empty catch blocks | Gate reviews + Benefits |
| 13 | `holiday.service.ts` | ~30 | Read | ❌ | ❌ | Simple wrapper |
| 14 | `initiative.service.ts` | ~300 | Full CRUD | ✅ writes changelog | 🟡 empty catch blocks | Pipeline management |
| 15 | `portfolio.service.ts` | ~300 | C,R,U (no D) | ✅ writes changelog | 🟡 empty catch blocks | Financial rollup |
| 16 | `programme.service.ts` | ~300 | Full CRUD | ✅ writes changelog | 🟡 empty catch blocks | Detail with child entities |
| 17 | `project.service.ts` | ~1000 | Full CRUD | ❌ | 🟡 empty catch blocks | Schedule, tasks, milestones |
| 18 | `resource.service.ts` | ~500 | Full CRUD | ✅ writes changelog | 🟡 empty catch blocks | Resource + allocation management |
| 19 | `risk-issue.service.ts` | ~700 | Full CRUD | ❌ | 🟡 empty catch blocks | Risk, issue, mitigation actions |
| 20 | `skill.service.ts` | ~350 | Full CRUD | ✅ writes changelog | 🟡 empty catch blocks | Skills + resource skills |
| 21 | `task-resolver.service.ts` | ~250 | Read + resolve | ❌ | 🟡 empty catch blocks | Workflow step -> entity resolution |
| 22 | `team.service.ts` | ~150 | R + manage member | ❌ | 🟡 catch + return [] | Flow-based team management |
| 23 | `timesheet.service.ts` | ~400 | Full CRUD | ✅ on status change | 🟡 empty catch blocks | Overlap check, recalculation |
| 24 | `workflow.service.ts` | ~700 | Full CRUD | ❌ | 🟡 empty catch blocks | Power Automate integration |
| 25 | `index.ts` | ~30 | Barrel export | N/A | N/A | |

### 6.2 Service Layer Issues

**Critical:** 
- **Inconsistent error handling** — some services check `result.success`, others rely on try/catch with empty blocks, some return `[]` silently masking failures
- **No RBAC enforcement** — all service calls return full dataset; no row/column filtering
- **No request validation** — services trust caller-supplied data

**Moderate:**
- Audit logging is inconsistent — about half of services write changelogs
- No standardized response type (sometimes `T[]`, sometimes `T | null`, sometimes raw SDK result)
- Some services use `any` extensively (~95% of lint errors originate in services)

### 6.3 Generated SDK Audit

**Generated Models**: 42 files, one per Dataverse entity. All standard auto-generated TypeScript interfaces.

**Generated Services**: 42 files, each with `create`, `update`, `delete`, `get`, `getAll`, `getMetadata` static methods.

**Entities Covered:**

| Category | Entities |
|----------|----------|
| **Core** | pm_portfolio, pm_programme, pm_project, pm_initiative |
| **Financial** | pm_budgetline, pm_fundingsource, pm_cashflowentry, pm_fiscalperiod |
| **Resources** | pm_resource, pm_resourceallocation, pm_resourceskill, pm_skill |
| **Risks** | pm_risk, pm_riskmitigationaction |
| **Issues** | pm_issue |
| **Timesheets** | pm_timesheet, pm_timesheetentry |
| **Governance** | pm_projectgatereview, pm_projectstatussnapshot |
| **Benefits** | pm_benefit, pm_performancemeasure |
| **Change** | pm_changerequest, pm_changerequestimpact |
| **Workflow** | pm_workflow, pm_workflowinstance, pm_workflowapprovalstep, pm_workflowsteptemplate |
| **Documents** | pm_document |
| **Holidays** | pm_holiday |
| **System** | systemuser, team, teammembership |
| **Other** | pm_agentinsight, pm_changelogentry, pm_projecttask, pm_projectmilestone, pm_projectapprovalrequest |
| **Actions** | InitiateWorkflow, WorkflowRoutingHandler, ManageTeams, CreateOutlookEvent, GetOutlookEvents |

---

## 7. SECURITY & PERSONA AUDIT

### 7.1 Current Persona System (7 Hardcoded Personas)

| Persona | Resolution Method | Tabs Accessible | Match Keywords |
|---------|------------------|----------------|----------------|
| **SystemAdministrator** | Keyword match | All 24 | admin, sysadmin, administrator |
| **PortfolioExecutive** | Keyword match | 10 strategic | executive, sponsor, director, vp, chief, president |
| **PMO** | Keyword match | 12 governance | pmo, governance, compliance, audit |
| **ProjectManager** | Keyword match | 10 delivery | project manager, programme manager, delivery, pm, lead, scrum master |
| **FinancialController** | Keyword match | 6 finance | financial, commercial, controller, finance, accountant, budget |
| **Planner** | Keyword match | 4 tabs | planner, scheduler, planning |
| **TeamMember** | Default fallback | 6 tabs | (any user not matching above) |

### 7.2 Tab Permission Matrix

| Tab | SA | Exec | PMO | PM | Fin | Planner | TM |
|-----|----|------|-----|----|-----|---------|----|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portfolios | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Programmes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pipeline | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Timesheets | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Budgets | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Gate Reviews | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Benefits | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Risks | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Issues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change Requests | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cashflow | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Funding Sources | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Status Snapshots | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Activity Log | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Strategic Roster | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Calendar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resources | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Workflows | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Skills | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Team Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Holidays | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurations | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 7.3 Security Gaps (Critical)

| # | Gap | Impact | ITT Reference |
|---|-----|--------|---------------|
| **S1** | ~~No CRUD action-level enforcement at page level — `useAuthorization` hook exists but many pages don't use it fully~~ | ✅ **RESOLVED** — All 21 CRUD-capable pages now enforce useAuthorization for create/update/delete | FR-UAS-01 |
| **S2** | ~~No route-level guard — URL deep-links bypass tab filtering~~ | ✅ **RESOLVED** — URL params synced to activeTab; navigate events validated against persona permissions; RouteGuard secures all tabs | FR-UAS-01 |
| **S3** | ~~Fragile persona resolution via keyword matching~~ | ✅ **RESOLVED** — Keyword priority reordered (Executive before PMO); manual persona overrides via `localStorage` | FR-UAS-01 |
| **S4** | ~~No admin UI for persona assignment~~ | ✅ **RESOLVED** — Persona override via UserSelector popover (Edit icon per user, cycles through personas); overrides stored in localStorage with `ppm_persona_override:` prefix | FR-UAS-01 |
| **S5** | No row-level data filtering (except IssuesPage) | Users see data they shouldn't | NFR-DM-03 |
| **S6** | No column-level security for sensitive financial fields | Financial data visible to all | NFR-DM-03 |
| **S7** | No API-level RBAC — all service calls return full data | Data leakage via API | NFR-DM-06 |
| **S8** | No audit trail viewer UI | Auditors cannot review changes | FR-UAS-04 |
| **S9** | No Entra ID group integration | Dynamic role assignment absent | NFR-INT-16 |

### 7.4 Persona Resolution (FIXED)

**Resolution order (refined):**
```
Admin > Executive > PMO > PM > Finance > Planner > TeamMember
```

**Fix for "PMO Director" conflict:**
- ✅ Keyword priority ORDER changed: `director`, `executive`, `sponsor`, `vp`, `chief`, `president` checked BEFORE `pmo`, `governance`, `compliance`, `audit`
- ✅ Manual persona overrides via `localStorage` (key: `ppm_persona_override:<userId>`) — accessible from the UserSelector popover's Edit icon on each user row

**Override resolution order:**
1. ❓ Manual override exists? → Use override
2. 🔍 Keyword match by priority → Resolve persona
3. 🔁 Fallback → TeamMember

---

## 8. HOOKS & UTILITIES AUDIT

### 8.1 Custom Hooks (4 total)

| Hook | Purpose | Quality | Issues |
|------|---------|---------|--------|
| `useAuthorization` | Permission checking | 🟡 Good concept, incomplete adoption | Not used on all pages |
| `useDataGrid` | Client-side search/sort/pagination | ⚠️ **Has active React lint errors** | Ref access during render violation (3 errors) |
| `useDataverseAsync` | Standardized async operations | ✅ Good | None significant |
| `useDataverseCrud` | CRUD state management | 🟡 Partial coverage | `TBase` unused; heavy `any` usage |

### 8.2 Utilities (4 files)

| File | Purpose | Quality |
|------|---------|---------|
| `formDialogEvents.ts` | Modal event system (open/decision) | ✅ Clean, well-designed |
| `formatters.ts` | Date/number formatting | ✅ Good |
| `exportUtils.ts` | CSV export | ⚠️ Heavy `any` usage |
| `navigation.ts` | Navigation helpers | ✅ Good |

### 8.3 Context Providers (1)

| Provider | Purpose | Quality | Issues |
|----------|---------|---------|--------|
| `UserContext` | User, persona, role, team resolution | ✅ Comprehensive | Heavy on first load (parallel fetches users, teams, memberships, roles); fragile keyword matching |

---

## 9. COMMON COMPONENTS AUDIT

### 9.1 All 33 Common Components

| Component | Purpose | Quality | Used By |
|-----------|---------|---------|---------|
| Accordion | Expandable sections | ✅ | |
| ActionIcon | Icon button | ✅ | |
| Badge | Status badge | ✅ | Multiple |
| Breadcrumbs | Navigation breadcrumbs | ✅ | Portfolios, etc. |
| Button | Styled button | ✅ | Universal |
| Card | Content card | ✅ | |
| ConfirmDialog | Confirmation modal | ✅ | All modules |
| DashboardCharts | Chart utilities | ✅ | Dashboard |
| DataverseTable | Reusable data table | ✅ | All modules |
| DecisionBox | Approve/reject/defer | ✅ | Workflows |
| DetailDrawer | Slide-out detail panel | ✅ | Most modules |
| Dialog | Base dialog | ✅ | |
| DocumentPreviewDialog | File preview | ✅ | Pipeline, Projects |
| DynamicFormDialog | Dynamic form | ✅ | (Wrapper) |
| EmptyState | Empty state placeholder | ✅ | Tables |
| EntityDocumentsTab | Document list per entity | ✅ | Portfolios |
| ExportButton | CSV/Excel export | ✅ | |
| FormDialog | Modal form container | ✅ | Task modals |
| GanttChart | Schedule visualization | ✅ | Projects |
| HealthSplitBar | RAG health bar | ✅ | Portfolios |
| KpiCardRow | KPI metrics row | ✅ | All modules |
| LedgerCalendar | Financial calendar | ✅ | |
| MetricTile | Single metric tile | ✅ | |
| MyTasksWidget | User's tasks widget | ✅ | Dashboard |
| PageHeader | Page header with actions | ✅ | All modules |
| RouteGuard | Tab-level access guard | ✅ | App shell |
| SearchFilterBar | Search + filters | ✅ | Most modules |
| StatusProgressBar | Progress indicator | ✅ | |
| StatusTag | Status chip | ✅ | |
| SummaryCard | Summary info card | ✅ | |
| TableFooter | Table pagination footer | ✅ | All tables |
| TableHeader | Table column header | ✅ | |
| TableShell | Table wrapper | ✅ | All tables |
| TabPanel | Tab content panel | ✅ | |
| TaskLink | Workflow task link | ✅ | |
| VarianceDisplay | Budget variance | ✅ | |
| WorkflowMilestone | Workflow stage indicator | ✅ | |

### 9.2 Component Quality Assessment

**Strengths:** Consistent MUI-based implementation with loading/error/empty states built into `DataverseTable` and `TableShell`.

**Weaknesses:**
- No dedicated `DataTable` component (planned but not created)
- No `FormGroup` layout component (planned but not created)
- No standardized `useAsync` hook (planned but not created)
- No centralized form validation
- No loading skeleton components for granular loading states
- No accessible component variants (aria-labels, keyboard navigation)

---

## 10. GENERATED SDK AUDIT

### 10.1 Model Completeness

| Entity | Model Exists | Service Exists | Used in Feature Pages | Notes |
|--------|-------------|---------------|----------------------|-------|
| pm_portfolio | ✅ | ✅ | ✅ Portfolios | |
| pm_programme | ✅ | ✅ | ✅ Programmes | |
| pm_project | ✅ | ✅ | ✅ Projects | |
| pm_initiative | ✅ | ✅ | ✅ Pipeline | |
| pm_resource | ✅ | ✅ | ✅ Resources | |
| pm_resourceallocation | ✅ | ✅ | ✅ Resources | |
| pm_timesheet | ✅ | ✅ | ✅ Timesheets | |
| pm_timesheetentry | ✅ | ✅ | ✅ Timesheets | |
| pm_budgetline | ✅ | ✅ | ✅ Budgets | |
| pm_fundingsource | ✅ | ✅ | ✅ Funding Sources | |
| pm_cashflowentry | ✅ | ✅ | ✅ Cashflow | |
| pm_risk | ✅ | ✅ | ✅ Risks | |
| pm_riskmitigationaction | ✅ | ✅ | ✅ Risks | |
| pm_issue | ✅ | ✅ | ✅ Issues | |
| pm_changerequest | ✅ | ✅ | ✅ Change Requests | |
| pm_changerequestimpact | ✅ | ✅ | ✅ Change Requests | |
| pm_benefit | ✅ | ✅ | ✅ Benefits | |
| pm_performancemeasure | ✅ | ✅ | ✅ Benefits | |
| pm_projectgatereview | ✅ | ✅ | ✅ Gate Reviews | |
| pm_projectstatussnapshot | ✅ | ✅ | ✅ Status Snapshots | |
| pm_skill | ✅ | ✅ | ✅ Skills | |
| pm_resourceskill | ✅ | ✅ | ✅ Skills | |
| pm_projecttask | ✅ | ✅ | ✅ Projects (Schedule) | |
| pm_projectmilestone | ✅ | ✅ | ✅ Projects | |
| pm_holiday | ✅ | ✅ | ✅ Holidays | |
| pm_fiscalperiod | ✅ | ✅ | ✅ Financials | |
| pm_document | ✅ | ✅ | ✅ Documents | |
| pm_changelogentry | ✅ | ✅ | ✅ Activity Log | |
| pm_workflow | ✅ | ✅ | ✅ Workflows | |
| pm_workflowinstance | ✅ | ✅ | ✅ Workflows | |
| pm_workflowapprovalstep | ✅ | ✅ | ✅ Workflows/Tasks | |
| pm_workflowsteptemplate | ✅ | ✅ | ✅ Workflows | |
| pm_agentinsight | ✅ | ✅ | ⚠️ Dashboard | |
| pm_projectapprovalrequest | ✅ | ✅ | ✅ Tasks | |
| systemuser | ✅ | ✅ | ✅ UserContext | |
| team | ✅ | ✅ | ✅ Team Admin | |
| teammembership | ✅ | ✅ | ✅ UserContext | |

---

## 11. DATA MODEL & TYPES AUDIT

### 11.1 Type Definitions (`src/types/dataverse.ts`)

All business entities defined as TypeScript interfaces. Key types:

- `PortfolioModel`, `ProgrammeModel`, `ProjectModel`, `InitiativeModel`
- `RiskModel`, `IssueModel`, `RiskMitigationActionModel`
- `ResourceModel`, `ResourceAllocationModel`
- `TimesheetModel`, `TimesheetEntryModel`
- `BudgetLineModel`, `FundingSourceModel`, `CashflowEntryModel`
- `GateReviewModel`, `BenefitModel`, `PerformanceMeasureModel`
- `FinancialPeriodModel`, `ChangeRequestModel`, `ApprovalRequestModel`
- `SkillModel`, `ResourceSkillModel`
- `ProjectTaskModel`, `ProjectMilestoneModel`
- `ProjectStatusSnapshotModel`, `HolidayModel`
- `WorkflowModel`, `WorkflowInstanceModel`, `WorkflowStepTemplateModel`, `WorkflowApprovalStepModel`

### 11.2 Type Quality

**Issues:**
- One `any` type in the file itself (line 566)
- Many feature pages and services use inferred types rather than explicitly typed interfaces
- No Zod or validation schemas for runtime type checking
- Generated model properties use `any` for some field types (option set values)

---

## 12. INTEGRATION GAPS

### 12.1 All Integration Requirements Are MISSING

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| NFR-INT-01 | SAP FI/CO extraction (costs, commitments, POs) | 🔴 **Missing** | Not implemented |
| NFR-INT-02 | SAP WBS/cost centre mapping | 🔴 **Missing** | Not implemented |
| NFR-INT-03 | Middleware integration platform | 🔴 **Missing** | Not implemented |
| NFR-INT-04 | Error handling/retry/alerting | 🔴 **Missing** | Not implemented |
| NFR-INT-05 | Integration documentation | 🔴 **Missing** | Not delivered |
| NFR-INT-06 | SAP ECC → S/4HANA migration support | 🔴 **Missing** | Not implemented |
| NFR-INT-07 | Excel upload as SAP interim | 🔴 **Missing** | Not implemented |
| NFR-INT-08 | P6/MS Project import/export (XER, MPP, XML) | 🔴 **Missing** | Not implemented |
| NFR-INT-09 | Schedule data validation on import | 🔴 **Missing** | Not implemented |
| NFR-INT-10 | WBS/milestone/baseline preservation | 🔴 **Missing** | Not implemented |
| NFR-INT-11 | Scheduled/event-triggered sync | 🔴 **Missing** | Not implemented |
| NFR-INT-12 | Excel upload for schedule (interim) | 🔴 **Missing** | Not implemented |
| NFR-INT-13 | Microsoft Teams integration | 🔴 **Missing** | Power Automate flows exist; no custom UI |
| NFR-INT-14 | SharePoint document management | 🔴 **Missing** | EntityDocumentsTab exists but no SharePoint sync |
| NFR-INT-15 | Outlook integration | 🔴 **Missing** | Flow for Outlook events exists |
| NFR-INT-16 | Entra ID dynamic role assignment | 🔴 **Missing** | Not implemented |
| NFR-INT-17 | Power BI Dataverse connector exposure | 🔴 **Missing** | Not delivered |
| NFR-INT-18 | Baseline Power BI dataset model | 🔴 **Missing** | Not delivered |
| NFR-INT-19 | Embedded Power BI with RLSS | 🔴 **Missing** | Not implemented |

### 12.2 Existing Integration Foundation

Some foundational code exists:
- `InitiateWorkflowService` / `WorkflowRoutingHandlerService` — Power Automate triggers
- `CreateOutlookEventService` / `GetOutlookEventsService` — Outlook integration flows
- `ManageTeamsService` — Team management flow
- `EntityDocumentsTab` — Document listing UI
- `DocumentPreviewDialog` — File preview

These are Power Automate flows triggered from the app, not custom integrations.

---

## 13. ITT REQUIREMENT COVERAGE MATRIX

### 13.1 Functional Requirements

| ID | Description | Status | Coverage |
|----|-------------|--------|----------|
| FR-PPM-01 | Create/manage Projects, Programmes, Portfolios | ✅ Full | 100% |
| FR-PPM-02 | Metadata management | 🟡 Partial | 70% (no admin-configurable UI) |
| FR-PPM-03 | Pipeline/opportunity lifecycle | ✅ Full | 100% |
| FR-Gov-01 | Project creation workflow | ✅ Full | 100% |
| FR-Gov-02 | Gate review workflows | ✅ Full | 100% |
| FR-Gov-03 | Audit logs | 🔴 Missing | 30% (changelog entries written, no viewer UI) |
| FR-SP-01 | Create/manage project schedules | 🟡 Partial | 60% (GanttChart exists, no WBS, critical path, dependencies) |
| FR-SP-02 | Monitor project schedules | 🟡 Partial | 50% (visualization exists, no PERT, critical path, PDF export) |
| FR-SP-03 | Programme/portfolio schedule management | 🟡 Partial | 40% (no master schedule view, cross-project dependencies) |
| FR-FF-01 | Financial calendar | ✅ Full | 100% |
| FR-FF-02 | Funding source management | ✅ Full | 100% |
| FR-FF-03 | Budget management | ✅ Full | 100% |
| FR-FF-04 | Forecast management | 🟡 Partial | 40% (no multi-scenario, accuracy tracking) |
| FR-FF-05 | Cashflow management | ✅ Full | 100% |
| FR-FF-06 | Financial KPI monitoring | 🟡 Partial | 50% (basic metrics, no CPI/BAC/EAC) |
| FR-RI-01 | Risk capture | ✅ Full | 100% |
| FR-RI-02 | Risk assessment | ✅ Full | 100% |
| FR-RI-03 | Risk management | ✅ Full | 100% |
| FR-RI-04 | Risk monitoring | ✅ Full | 100% |
| FR-RI-05 | Issues management | ✅ Full | 100% |
| FR-CM-01 | Change capture/assessment | ✅ Full | 100% |
| FR-CM-02 | Change approval workflow | ✅ Full | 100% |
| FR-BM-01 | Benefits identification/planning | ✅ Full | 100% |
| FR-BM-02 | Benefits realisation tracking | ✅ Full | 100% |
| FR-TM-01 | Time recording | ✅ Full | 100% |
| FR-TM-02 | Time approval | ✅ Full | 100% |
| FR-RM-01 | Resource configuration | 🟡 Partial | 70% (no non-labour assets) |
| FR-RM-02 | Skill-based resource search | ✅ Full | 100% |
| FR-RM-03 | Resource allocation/approval | ✅ Full | 100% |
| FR-RA-01 | Status snapshots (13 periods) | ✅ Full | 100% |
| FR-RA-02 | Out-of-box dashboards | 🟡 Partial | 60% (limited drill-down) |
| FR-RA-03 | Financial reports | 🟡 Partial | 40% (no configurable reports) |
| FR-RA-04 | Schedule reports | 🔴 Missing | 10% |
| FR-RA-05 | Risk/issue reports | 🟡 Partial | 50% |
| FR-RA-06 | Data extraction to Power BI | 🔴 Missing | 0% |
| FR-WF-01 | Configurable workflows | ✅ Full | 100% |
| FR-WF-02 | Workflow governance | 🟡 Partial | 70% (no PMO audit dashboard) |
| FR-UAS-01 | Configurable security roles | 🔴 Missing | 20% (hardcoded personas only) |
| FR-UAS-02 | Workflow governance auditing | 🟡 Partial | 50% |
| FR-UAS-03 | Entra ID/SSO integration | 🟡 Partial | 40% (reads Xrm context only) |
| FR-UAS-04 | Audit trails | 🔴 Missing | 30% |

### 13.2 Non-Functional Requirements

| ID | Description | Status |
|----|-------------|--------|
| NFR-PERF-01 | Dashboard < 3s load | ⚠️ Not tested |
| NFR-PERF-02 | Concurrent user support | ✅ Dataverse handles |
| NFR-PERF-03 | Flow SLA < 2 min | ✅ Power Automate handles |
| NFR-PERF-04 | API throttling/retry | ⚠️ Not implemented in custom code |
| NFR-DM-01 | Data in IE Power Platform | ✅ Architecture decision |
| NFR-DM-02 | Data retention / GDPR | ⚠️ Not addressed in custom code |
| NFR-DM-03 | Column-level + row-level security | 🔴 **Missing** |
| NFR-DM-04 | Data dictionary / ER model | 🔴 **Missing** (not delivered) |
| NFR-DM-05 | Data archiving/purging | 🔴 **Missing** |
| NFR-DM-06 | API RBAC enforcement | 🔴 **Missing** |
| NFR-DM-07 | DLP policy compliance | ✅ By design |
| NFR-DM-08 | Data migration toolkit | 🔴 **Missing** |
| NFR-USE-01 | WCAG 2.1 AA accessibility | 🔴 **Missing** |
| NFR-USE-02 | Browser + mobile support | 🟡 Partial (no mobile build) |
| NFR-USE-03 | Contextual help/tooltips | 🔴 **Missing** |
| NFR-USE-04 | Inline validation + error messages | 🟡 Partial (manual per field) |
| NFR-USE-05 | IE branding configuration | 🟡 Partial (theme exists, no admin UI) |
| NFR-USE-06 | Consistent navigation | ✅ Good |
| NFR-PP-01 to 08 | Power Platform ALM | ✅ Best practices followed |

### 13.3 Overall Coverage

| Category | Total Reqs | ✅ Full | 🟡 Partial | 🔴 Missing | Coverage % |
|----------|-----------|---------|------------|------------|------------|
| Functional (ITT) | 41 | 21 | 15 | 5 | 69% |
| Non-Functional (codebase level) | 15 | 3 | 4 | 8 | 33% |
| Integrations | 19 | 0 | 0 | 19 | 0% |
| **TOTAL** | **75** | **24** | **19** | **32** | **44%** |

---

## 14. PRIORITIZED FINDINGS

### 🔴 CRITICAL (Must Fix Before Full Deployment)

| # | Finding | Category | Impact | Effort |
|---|---------|----------|--------|--------|
| C1 | **1389 ESLint errors** — massive `any` usage, empty catch blocks, React hook violations | Code Quality | Maintainability, bugs | 2-3 weeks |
| C2 | **Zero test coverage** — no unit, integration, or E2E tests | Quality Assurance | Regression risk | 4-6 weeks |
| C3 | ~~No CRUD-level security enforcement — most pages have action buttons visible to all~~ | ✅ **RESOLVED** — All 21 CRUD-capable pages now enforce useAuthorization | Security | 1-2 weeks |
| C4 | **No row-level data filtering** — users see all data (except IssuesPage) | Security | Data leakage | 1 week |
| C5 | **No column-level security** — financial fields visible to all users | Security | Confidentiality | 2-3 days |
| C6 | **No API-level RBAC** — service calls return full datasets | Security | Data leakage | 1-2 weeks |
| C7 | ~~Fragile persona resolution — keyword-based, conflicts, no admin override~~ | ✅ **RESOLVED** — Keyword priority fixed (Executive before PMO); admin override via UserSelector popover | Security | 1 week |
| C8 | **Missing delete on core entities** — Portfolios, Programmes, Projects, Pipeline | Functional Gap | Cannot remove data | 2-3 days |
| C9 | **No audit trail viewer UI** — changelog entries written but no UI to review | Compliance | Audit failure | 1 week |

### 🟡 HIGH (Should Fix for MVP)

| # | Finding | Category | Impact | Effort |
|---|---------|----------|--------|--------|
| H1 | **No forecast management** — no multi-scenario, accuracy tracking, comparison | Functional Gap | ITT misses | 2-3 weeks |
| H2 | **Limited schedule management** — no WBS builder, critical path, dependencies | Functional Gap | Planning gaps | 3-4 weeks |
| H3 | **No schedule/programme roll-up** — no master schedule, cross-project deps | Functional Gap | Portfolio view | 2-3 weeks |
| H4 | **No configurable financial reports** — basic display only | Functional Gap | Reporting | 2 weeks |
| H5 | **No configurable reports of any kind** — schedule, risk, financial | Functional Gap | Reporting | 3-4 weeks |
| H6 | **No Power BI dataset or extraction** — FR-RA-06 unmet | Functional Gap | Analytics | 1-2 weeks |
| H7 | **Inconsistent form validation** — no centralized validation framework | UX Quality | Data quality | 1-2 weeks |
| H8 | **`useDataGrid` React hook violation** — refs accessed during render | Bug | Potential rendering issues | 1 day |
| H9 | **Silent error swallowing** — empty catch blocks in 80+ locations | Reliability | Hidden failures | 1 week |
| H10 | **No WCAG 2.1 AA accessibility** | Compliance | Legal risk | 4-6 weeks |

### 🔵 MEDIUM (Should Fix Post-MVP)

| # | Finding | Category | Impact | Effort |
|---|---------|----------|--------|--------|
| M1 | No Contextual help/tooltips | UX | Adoption | 2 weeks |
| M2 | Monolithic files (Calendar 1602, ChangeRequests 1072, FundingSources 1062) | Maintainability | Code quality | 1 week |
| M3 | No mobile build configuration | Access | Field workers | 1 week |
| M4 | No data migration toolkit | Deployment | Data loading | 2-3 weeks |
| M5 | No data archiving/purging | Data Mgmt | Storage | 1-2 weeks |
| M6 | Missing document management (SharePoint integration) | Functional | Document mgmt | 3-4 weeks |
| M7 | No in-app notification center | UX | User awareness | 2-3 weeks |
| M8 | No route-level guard — URL deep-links bypass tabs | Security | Access control | 1 day |
| M9 | ~100+ `any` types in services | Code Quality | Type safety | 2-3 weeks |
| M10 | No React Compiler optimization enabled | Performance | Rendering | 1 day |
| M11 | Inconsistent audit logging — only half of services log | Compliance | Traceability | 1 week |
| M12 | Inlined forms in ChangeRequests/FundingSources (1000+ lines) | Maintainability | Refactoring | 2-3 days |

### 🟢 LOW (Future Enhancements)

| # | Finding | Category | Impact | Effort |
|---|---------|----------|--------|--------|
| L1 | SAP ERP integration | Integration | Financial sync | 6-8 weeks |
| L2 | P6 / MS Project import/export | Integration | Schedule sync | 4-6 weeks |
| L3 | Power BI embedded reports | Integration | Analytics | 3-4 weeks |
| L4 | Teams deep integration | Integration | Collaboration | 2-3 weeks |
| L5 | SharePoint document sync | Integration | Document mgmt | 3-4 weeks |
| L6 | Outlook calendar sync | Integration | Calendar | 2-3 weeks |
| L7 | Entra ID group-based role assignment | Integration | Security | 1-2 weeks |
| L8 | Admin-configurable personas and metadata | Enhancement | Flexibility | 4-6 weeks |
| L9 | Non-labour asset management | Enhancement | Resource mgmt | 2-3 weeks |
| L10 | Role-based resource planning (generic roles before named) | Enhancement | Planning | 1-2 weeks |
| L11 | Benefits roll-up aggregation | Enhancement | Reporting | 1 week |
| L12 | Scenario planning / what-if simulations | Enhancement | Strategic | 3-4 weeks |

---

## 15. RECOMMENDATIONS

### 15.1 Immediate Actions (Pre-MVP)

| Order | Action | Target | Rationale |
|-------|--------|--------|-----------|
| 1 | Fix `noImplicitAny` in tsconfig + refactor all `any` types | Codebase-wide | Eliminates >1300 lint errors instantly |
| 2 | Add delete functionality to Portfolios, Programmes, Projects, Pipeline | 4 feature modules | Completes CRUD for all core entities |
| 3 | ~~Implement `useAuthorization` CRUD checks on ALL pages~~ | ✅ **COMPLETED** — All 21 CRUD-capable pages now enforce useAuthorization | Closes FR-UAS-01 gap |
| 4 | ~~Fix fragile persona resolution + add manual override (S3+S4)~~ | ✅ **COMPLETED** — Keyword priority fixed; localStorage-based overrides via UserSelector popover | Closes FR-UAS-01 |
| 5 | Add row-level filtering to Resources, Projects, Timesheets, Risks, Tasks | 5 feature modules | Closes NFR-DM-03 partially |
| 6 | Fix `useDataGrid` React ref violation | hooks/ | Prevents potential render bugs |
| 7 | Add centralized form validation (zod or similar) | Common utility | Improves data quality |

### 15.2 Pre-Production Requirements

| Order | Action | Target | Rationale |
|-------|--------|--------|-----------|
| 7 | Implement audit trail viewer UI | ActivityLog enhancement | Closes FR-UAS-04 |
| 8 | Add route-level guard in App.tsx | App shell | Closes URL bypass gap |
| 9 | Add column-level field hiding for sensitive data | Service layer | Closes NFR-DM-03 |
| 10 | Set up Jest/Vitest + write unit tests for services | Testing | Minimum testing baseline |
| 11 | Configure accessibility audit + fix WCAG violations | All components | Legal compliance |

### 15.3 MVP Enhancement Recommendations

| Order | Action | Target | Rationale |
|-------|--------|--------|-----------|
| 12 | Implement Excel upload for financial data | finance.service | Closes NFR-INT-07 |
| 13 | Implement Excel upload for schedule data | project.service | Closes NFR-INT-12 |
| 14 | Provide baseline Power BI dataset | New deliverable | Closes NFR-INT-18 |
| 15 | Add contextual help/tooltips | Common component | Closes NFR-USE-03 |
| 16 | Implement configurable reports (financial/schedule/risk) | New reporting module | Closes FR-RA-03/04/05 |

### 15.4 Long-Term Roadmap

| Quarter | Focus | Key Deliverables |
|---------|-------|------------------|
| **Q3 2026** | Security & Quality | Close all Critical/High issues, add tests, WCAG audit |
| **Q4 2026** | Basic Integrations | Excel upload/export, Power BI dataset, Teams notifications |
| **Q1 2027** | Advanced Integrations | SAP ERP, P6/MS Project, SharePoint, Entra ID groups |
| **Q2 2027** | Enhancement Phase | Admin-configurable personas/metadata, scenario planning, mobile app |

---

*End of Comprehensive Codebase Audit Report*
