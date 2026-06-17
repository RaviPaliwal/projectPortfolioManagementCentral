# Security & Persona Implementation — Detailed Gap Analysis

> **Source Documents:** `excel_requirements_output.txt` (ITT Response Matrix), `src/constants/permissions.ts`, `src/context/UserContext.tsx`, `src/components/layout/PrimaryShell.tsx`

---

## 1. Requirement Coverage Summary

| ITT Ref | Requirement | Current Status | Severity |
|---------|-------------|----------------|----------|
| FR-UAS-01 | Security roles for CRUD operations | Partial — tab-level only, no CRUD | **Critical** |
| FR-UAS-02 | Workflow governance & PMO monitoring | Partial — workflow modals exist, no audit dashboard | **High** |
| FR-UAS-03 | Entra ID SSO & identity governance | Partial — reads Xrm context, no direct Entra integration | Medium |
| FR-UAS-04 | Comprehensive audit trails | **Missing** — no audit system in custom code | **High** |
| NFR-DM-03 | Column-level + row-level security | **Missing** — only IssuesPage has row filtering | **High** |
| NFR-DM-06 | API RBAC enforcement | **Missing** — all service calls return full data | **Critical** |
| NFR-INT-16 | Entra ID groups for dynamic role assignment | Partial — Dataverse teams read, not Entra groups | Medium |

---

## 2. Persona Definition Gaps

### 2.1 Current Personas (Hardcoded)

| Persona | Tabs | Match Keywords |
|---------|------|----------------|
| SystemAdministrator | All 22 | admin, sysadmin, administrator |
| PortfolioExecutive | 10 strategic | executive, sponsor, director, vp, chief, president |
| PMO | 12 governance | pmo, governance, compliance, audit |
| ProjectManager | 10 delivery | project manager, programme manager, delivery, pm, lead, scrum master |
| FinancialController | 6 finance | financial, commercial, controller, finance, accountant, budget |
| Planner | 4 tabs | planner, scheduler, planning |
| TeamMember | 6 tabs | default fallback |

### 2.2 Persona Gaps

| # | Gap | Detail | Severity |
|---|-----|--------|----------|
| **P1** | **Hardcoded — not configurable** | FR-UAS-01 requires admin-configurable roles. Current personas are TypeScript constants with no admin UI. | **Critical** |
| **P2** | **No direct user assignment** | Admins cannot manually Add/Remove people from personas. Assignment relies entirely on fragile keyword matching of job titles, team names, and role names. | **Critical** |
| **P3** | **Keyword priority conflicts** | Resolution order: Admin > PMO > Executive > PM > Finance > Planner > TeamMember. A "PMO Director" matches PMO before Executive. No manual override. | **High** |
| **P4** | **No record-level scoping** | TeamMember should see only items from assigned projects. Only IssuesPage implements this. | **Critical** |
| **P5** | **Planner scope narrow** | 4 tabs only. ITT Schedule & Programme Management likely needs resources/timesheets/pipeline. | Medium |

---

## 3. Action-Level Security Gaps (FR-UAS-01)

### 3.1 Current State

- **Tab visibility**: Enforced in PrimaryShell — tabs filtered, unauthorized tabs redirect
- **Route-level guard**: Not present — URL deep-links bypass tab filtering
- **Action-level (Create/Edit/Delete)**: Not implemented anywhere
- **Data-level (API filtering)**: Not implemented (except IssuesPage)

### 3.2 Pages Needing Action Controls

| Page | Entities | Current | Required |
|------|----------|---------|----------|
| PortfoliosPage | Portfolios | No controls | Exec/PMO: CRUD; others: Read-only |
| ProgrammesPage | Programmes | No controls | PMO/PM: CRUD; others: Read-only |
| ProjectsPage | Projects | No controls | PM: CRUD; TM: view assigned |
| PipelinePage | Initiatives | No controls | PMO/Exec: CRUD; others: view |
| ResourcesPage | Resources | No controls | PM/PMO: manage; TM: view own |
| BudgetsPage | Budgets | No controls | FinController: CRUD; others: Read-only |
| RisksPage | Risks | No controls | PM: CRUD; TM: own only |
| IssuesPage | Issues | TM filtered | PM: full; TM: own |
| TimesheetsPage | Timesheets | No controls | TM: own; PM: team approval |
| GateReviewsPage | Gate Reviews | No controls | PMO/PM: manage |
| CashflowPage | Cashflow | No controls | FinController: CRUD |
| ChangeRequestsPage | Change Requests | No controls | PM: create; PMO/Exec: approve |
| WorkflowsPage | Workflows | No controls | SysAdmin/PMO: manage |

### 3.3 Proposed Authorization Hook

```typescript
type CrudAction = 'create' | 'read' | 'update' | 'delete'

function useAuthorization(module: string, action: CrudAction): { allowed: boolean }
```

Default permission matrix:

| Module | Create | Edit | Delete | View All |
|--------|--------|------|--------|----------|
| PORTFOLIOS | Exec, PMO, SA | Exec, PMO, SA | SA only | All |
| PROGRAMMES | PMO, PM, SA | PMO, PM, SA | SA only | All |
| PROJECTS | PM, PMO, SA | PM, PMO, SA | SA only | All |
| PIPELINE | PMO, Exec, SA | PMO, Exec, SA | SA only | All |
| RESOURCES | PM, PMO, SA | PM, PMO, SA | SA only | All |
| BUDGETS | FinCtrl, SA | FinCtrl, SA | SA only | All |
| RISKS | PM, TM(own), SA | PM, SA | SA only | All |
| ISSUES | All | Owner, PM, SA | SA only | All (scoped) |
| TIMESHEETS | TM(own), SA | TM(draft), SA | SA only | PM: team, TM: own |
| GATES | PMO, PM, SA | PMO, PM, SA | SA only | All |
| CASHFLOW | FinCtrl, SA | FinCtrl, SA | SA only | All |
| CHANGEREQS | PM, TM, SA | PM, SA | SA only | All |
| WORKFLOWS | SA, PMO | SA, PMO | SA only | All |
| FUNDING | FinCtrl, SA | FinCtrl, SA | SA only | All |

---

## 4. Data-Level Security Gaps (NFR-DM-03, NFR-DM-06)

### 4.1 Current State

- **Row-level**: Only IssuesPage implements persona-based filtering
- **Column-level**: Not implemented — financial/personal data visible to all
- **API-level RBAC**: Not implemented

### 4.2 Pages Needing Row-Level Filtering

| Page | Filter Rule |
|------|-------------|
| ProjectsPage | TM: only assigned projects |
| ResourcesPage | TM: only own resource |
| TimesheetsPage | TM: own; PM: direct reports |
| RisksPage | TM: risks from assigned projects |
| TasksPage | TM: assigned; PM: team |

### 4.3 Sensitive Fields Needing Column-Level Protection

| Entity | Sensitive Field | Hide From |
|--------|----------------|-----------|
| pm_project | pm_approvedbudgeteur | TM, Planner |
| pm_project | pm_actualcosteur | TM, Planner |
| pm_project | pm_contingencyamount | TM, Planner |
| pm_resource | pm_salarycostrate | All except FinCtrl, SA |
| pm_resource | pm_dailyrate | TM |
| pm_risk | pm_financialexposureamount | TM |
| pm_initiative | pm_estimatedcost | TM |
| pm_initiative | pm_estimatedbenefits | TM |

---

## 5. Audit Trail Gaps (FR-UAS-04)

### 5.1 Current State

- No audit trail system in custom code
- Dataverse has built-in auditing but no custom viewer UI
- No before/after change comparison display

### 5.2 What Needs Auditing

| Event | Entity | Data to Capture |
|-------|--------|-----------------|
| Create | Project, Programme, Portfolio | Who, When, Fields |
| Update | Budget, Risk score, Funding | Who, When, Old/New values |
| Status change | Gate Review, Approval | Who, When, Decision, Notes |
| Delete | Any entity | Who, When, What (soft delete) |

---

## 6. Recommended Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Create useAuthorization hook with CRUD checks | 3 days | **Critical** |
| **P0** | Add persona-based data filtering to service calls | 5 days | **Critical** |
| **P0** | Build admin UI for Add/Remove People from Personas | 5 days | **Critical** |
| **P1** | Create audit trail capture + viewer UI | 4 days | High |
| **P1** | Add route-level guard in App.tsx | 1 day | High |
| **P1** | Column-level field hiding for sensitive data | 3 days | High |
| **P2** | Entra ID group membership query | 2 days | Medium |
| **P3** | Configurable persona definitions via admin UI | 8 days | Low |

---

## 7. Files to Create/Modify

| File | Change |
|------|--------|
| `src/hooks/useAuthorization.ts` | **NEW** — Authorization hook for CRUD checks |
| `src/constants/permissions.ts` | Add CRUD permission matrix alongside tabs |
| `src/context/UserContext.tsx` | Expose personas + admin assignment override |
| All feature pages | Add useAuthorizati
