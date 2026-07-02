# AGENTS.md — Project Portfolio Mgmt

## Issues Fixed

### 1. Timesheet Approval Status Reverting to Draft
- **Root Cause**: `TimesheetApprovalTaskModal.onBeforeDecision` called `updateTimesheetStatus(timesheetId, status)` but passed `0` for both Approved and Rejected.
- **Fix**: Pass correct statuses: `0` (Approved) or `2` (Rejected).

### 2. Task List Not Refreshing After Decision
- **Root Cause**: Modal closed without notifying parent pages to reload.
- **Fix**: Added `FORM_DIALOG_DECISION_EVENT` + `dispatchFormDialogDecision` utility. Both `TimesheetApprovalTaskModal` and `FinancialReviewTaskModal` dispatch `form:decision-complete`. `PendingApprovalsPage` and `TasksPage` listen with `useRef`-based `useEffect` and call `loadApprovals()` / `loadData()`.

### 3. Tasks Not Visible to User
- **Root Cause**: `fetchPendingWorkflowApprovals` compared `userId` (GUID) against `pm_approvername` / `pm_assigneedisplayname` (display name fields), causing zero matches.
- **Fix**: Added `userName` parameter; matches **both** `userId` (GUID) and `userName` (display name) against approval/assignee name fields.

### 4. "No User Selected" Glitch on Tab Switch
- **Root Cause**: Early-return guard in `PendingApprovalsPage` and `TasksPage` called `setLoading(false)`, causing a flash of "No user selected" text before `UserContext` resolved.
- **Fix**: Removed `setLoading(false)` from early-return guards; component stays loading until user context is available.

### 5. Financial Review Task Shows No Data (Initiative Entity)
- **Root Cause**: `FinancialReviewTaskModal` always called `fetchGateReviewById(entityId)`, but the workflow instance entity type is `"Pipeline"` (initiative `pm_initiative`), not a gate review.
- **Fix**:
  - Added `resolveEntityInfoFromApprovalStep()` to `task-resolver.service.ts` — returns `{ entityId, entityType, entityName }`.
  - Updated `ApprovalStepResolver` + `FinancialReviewTaskModalWrapper` to pass `entityType` to the modal.
  - `FinancialReviewTaskModal` now detects `entityType === 'Pipeline'` and fetches initiative data via `fetchInitiativeById(id)`, displaying estimated cost/benefits, priority score, and strategic alignment. Gate review logic is unchanged.

### 6. Status Snapshot `loadData` Failing Silently (No Data in Grid)
- **Root Cause**: `$select` in `StatusSnapshotsPage.loadData` included `pm_projectname`, `pm_portfoliolookupname`, and `pm_programmenamename` — fields that don't exist as selectable properties on the `pm_projectstatussnapshot` entity in Dataverse. The generated TypeScript model incorrectly includes these as properties. The API returns HTTP 400, which was silently caught by the generic catch handler, leaving the grid empty.
- **Fix**: Removed the three invalid fields from `$select`. Added `result.success` check and console logging for future debugging. `mapSnapshot` already handles undefined values for these optional fields.
- **File**: `StatusSnapshotsPage.tsx:256-269`

### 7. Snapshot Create Fails with ODataException (ownerid Format)
- **Root Cause**: `handleSave` sent `ownerid` as a raw GUID string, but Dataverse requires lookup field format `/systemusers(GUID)` via `ownerid@odata.bind`.
- **Fix**: Changed to `'ownerid@odata.bind': currentUser?.systemuserid ? \`/systemusers(${currentUser.systemuserid})\` : undefined`. Also added `result.success` check for create/update since `createRecordAsync`/`updateRecordAsync` return `IOperationResult` with `success: boolean` and do NOT throw on API failure.
- **File**: `StatusSnapshotsPage.tsx:433-466`

### 8. Programme Budget Wrongly Aggregating from Child Projects
- **Root Cause**: `portfolio.service.ts:120-133` aggregated `pm_approvedbudgeteur` from child projects into the programme's `pm_budgeteur`.
- **Fix**: Removed the aggregation code. Programme budget now uses its own `pm_budgeteur` field directly.

### 9. Resource Allocation: Available Hours Validation
- **Feature**: `ResourceDialog` now calculates and displays available hours before submission.
- **Implementation**:
  - Converted from `DynamicFormDialog` to a fully custom dialog with `useEffect` + `useMemo` for reactive availability computation.
  - On resource selection → fetches `fetchResourceById(resourceId)` (to get `pm_dailyworkcapacity`) and `fetchResourceAllocations(resourceId)` (to get all existing allocations).
  - Computes working days (Mon–Fri) between start/end dates via `countWorkingDays()`.
  - `totalCapacity = dailyCapacity × workingDays`
  - `overlappingHours` = sum of `pm_allocatedhours` for allocations overlapping the date range (excludes current allocation in edit mode via `initialData.pm_resourceallocationid`).
  - `availableHours = max(0, totalCapacity - overlappingHours)`
  - Shows a **Resource Availability** paper card with breakdown; **Insufficient Availability** `Alert` when `pm_allocatedhours > availableHours`; submit button disabled until valid.
- **File**: `ProjectSubFormDialogs.tsx:147-387`

### 10. Timesheet Grid Hours vs Entry Sum Mismatch (J2-133)
- **Root Cause**: `recalculateTimesheetHours` wrote updated totals to Dataverse, but subsequent `fetchTimesheets()` read stale data due to Dataverse write-read propagation delay, causing the grid to display incorrect `pm_totalhours`.
- **Fix**: `recalculateTimesheetHours` now returns the computed `{ pm_totalhours, pm_totalchargeablehours, pm_totalnonchargeablehours }`. Callers (`TimesheetsPage.handleAddEntry`, `handleDeleteEntry`, `TeamMemberTimesheetPage.handleSaveEntry`, `handleRemoveEntry`) apply these values directly to local state via `setSelectedTimesheet`/`setTimesheets` instead of re-fetching from Dataverse, eliminating the race condition.

### 11. Submitted By / Approved By Fields (J2-134)
- **Root Cause 1**: `TimesheetApprovalTaskModal.onBeforeDecision` passed `undefined` as `currentUserName`, causing `pm_approvedby` to always be `"System"`.
- **Fix 1**: Imported `useUser` in `TimesheetApprovalTaskModal`; passes `currentUser?.fullname ?? 'System'` to `updateTimesheetStatus`. Also fixed `TeamMemberTimesheetPage.handleSubmit` to pass `currentUser?.fullname`.
- **Root Cause 2**: `fetchTimesheets()` in `timesheet.service.ts` did not select `pm_submittedby` or `pm_approvedby` fields, so the list/detail views never displayed them.
- **Fix 2**: Added `pm_submittedby` and `pm_approvedby` to the `$select` fields in `fetchTimesheets()`.

### 12. New Timesheet Dialog Validation (J2-136)
- **Root Cause**: `TimesheetFormDialog` allowed timesheet creation without a resource selected ("None (enter name manually)" option), had no period duration validation, and no feedback on period length.
- **Fix**: Removed the "None" option; resource selection is now required. Added `periodDurationDays` computation with display (`CalendarMonthIcon` + day count). Added validation: max 370-day period limit, start date no more than 12 months in the future. All validation errors block the submit button.


## Work Log (Jira J2-14 � Power Platform PPM Solution)

### Week of June 17�19, 2026

#### Wed, June 17
- **J2-52 / J2-54 / J2-56 / J2-57 / J2-58**: Portfolios, Programmes, Projects pages with CRUD, detail drawers, document support, initiative conversion, and Gantt chart integration
- **J2-78 / J2-79 / J2-80**: Holidays Calendar CRUD page, Team/User Management page, CSV/Excel export utility
- **J2-72 / J2-73**: Timesheets page (approval workflow, entries grid, reporting periods) + Workflows page (templates, instances, steps)
- **J2-60 / J2-61 / J2-62**: GanttChart, VarianceDisplay, HealthSplitBar, Button, Dialog, TableShell, TableFooter components
- **J2-70**: Benefits page with performance measures, RAG tracking, form dialogs
- **J2-63**: Risks page with heatmap matrix, severity distribution, mitigation actions
- **J2-64**: Issues page with CRUD, escalation, persona-based row filtering, priority filters
- **J2-51**: Dashboard page with KPI cards, budget health, active projects, pipeline stage summary, approval tasks, PortfolioHealthSnapshot widget
- **J2-71**: Remaining common components � DashboardCharts, DetailDrawer, ExportButton, SummaryCard, TabPanel, Accordion, Breadcrumbs
- CalendarPage with Dataverse task allocation integration and Outlook event creation flow

#### Thu, June 18
- **J2-50 / J2-49**: Route mapping across all 24 modules + Primary shell layout with sidebar/top bar + RouteGuard access control
- **J2-48**: UserContext provider � resolves user, persona, team, role via parallel queries (systemusers, teams, teammemberships)
- **J2-53 / J2-54 / J2-55**: Programmes page (list/detail/risk-issue tabs) + Projects page (360 view with 7 sub-entity tabs) + Pipeline/Initiatives page (stages, approval workflows, ConvertToProjectDialog)
- **J2-52**: Portfolio page (CRUD, detail drawer, hierarchy) with HealthSplitBar and Programme budget validation
- **J2-65**: Change Requests page (cost/schedule impact, lifecycle, form dialogs with approval step modals)
- **J2-66**: Gate Reviews page (review outcomes, conditions, 360 view, BoardDecision/PmoReadiness/FinancialReview task modals)
- Core services: portfolio.service.ts, programme.service.ts, project.service.ts, initiative.service.ts, finance.service.ts, workflow.service.ts, risk-issue.service.ts, governance.service.ts, resource.service.ts, timesheet.service.ts
- Build fixes and schema definitions for budget lines, funding sources, change log entries
- **J2-132**: Timesheet � Workflow Integration & Core Backend Fixes (approval step modals, status sync)

#### Fri, June 19
- **J2-71**: DynamicFormDialog component for entity-agnostic form rendering + FormDialog event system
- **J2-65 / J2-67 / J2-77**: BudgetLineApprovalTaskModal, FinancialReviewTaskModal, ApprovalStepResolver, FundingSource approval modals, 17 task modal wrappers
- Schema definitions and generated models for budget lines, funding sources, cashflow entries, fiscal periods
- **J2-44 / J2-45 / J2-46 / J2-47**: Completed remaining scaffolding � project setup verified with full build pass (tsc -b + vite build, 18.5s)

#### Sat�Sun, June 20�21 � Weekend � No work

### Mon, June 22 (Today)
- **J2-78**: Holidays page � CRUD operations, seed dialog, calendar view, detail panel, table with search/filter
- **J2-57**: Cashflow page � inflow/outflow tracking, fiscal period integration, entry form, detail drawer
- **J2-64**: Issues page enhancements � full CRUD, escalation workflow, filtering, approval step task modals
- **J2-47**: Core entity CRUD service modules finalized (project, programme, risk, issue, workflow, timesheet, resource, holiday, cashflow, funding source, budget, benefit, gate review, status snapshot services)
- **Document Management**: EntityDocumentsTab reusable component (drag-and-drop upload, 32MB limit, file-type color coding), DocumentPreviewDialog (inline images, PDF, text), document.service.ts (upload/download/delete with audit logging) � fully integrated into Portfolios, Programmes, Projects pages
- **Security / RBAC**: permissions.ts defines 7 personas x 26 tabs + CRUD matrix for 21 modules; RouteGuard component wraps all pages (prevents unauthorized content flash); useAuthorization hook for runtime permission checks; persona override via localStorage for admin testing
- **Audit Trail**: ActivityLogPage with KPI cards, search/filter by entity/module/action/user, detail inspector (before/after mutation, session context, IP, copy-to-clipboard); changelog.service.ts writes audit entries with smart session ID resolution across 18 entity types
- **Skills Management**: SkillsPage with Skills Catalog and Resource-Skill Mapping tabs, KPI cards, search/filter, DynamicFormDialog-based CRUD for both entities, proficiency levels (Beginner-Expert) with color coding, certification tracking
- **Strategic Roster**: 4 view modes (Timeline Gantt, Cards, Table, Tree), portfolio hierarchy fetch, RAG/budget/year filters, KPI cards (strategic count, AUM, delivery completion), month-scale timeline bars with color-coded entity types, collapsible rows
- **J2-44 / J2-45 / J2-46 / J2-47**: Completed remaining scaffolding  project setup verified with full build pass (tsc -b + vite build, 18.5s)

#### SatSun, June 2021  Weekend  No work

### Mon, June 22 (Today)
- **J2-78**: Holidays page  CRUD operations, seed dialog, calendar view, detail panel, table with search/filter
- **J2-57**: Cashflow page  inflow/outflow tracking, fiscal period integration, entry form, detail drawer
- **J2-64**: Issues page enhancements  full CRUD, escalation workflow, filtering, approval step task modals
- **J2-47**: Core entity CRUD service modules finalized (project, programme, risk, issue, workflow, timesheet, resource, holiday, cashflow, funding source, budget, benefit, gate review, status snapshot services)
- **Document Management**: EntityDocumentsTab reusable component (drag-and-drop upload, 32MB limit, file-type color coding), DocumentPreviewDialog (inline images, PDF, text), document.service.ts (upload/download/delete with audit logging)  fully integrated into Portfolios, Programmes, Projects pages
- **Security / RBAC**: permissions.ts defines 7 personas x 26 tabs + CRUD matrix for 21 modules; RouteGuard component wraps all pages (prevents unauthorized content flash); useAuthorization hook for runtime permission checks; persona override via localStorage for admin testing
- **Audit Trail**: ActivityLogPage with KPI cards, search/filter by entity/module/action/user, detail inspector (before/after mutation, session context, IP, copy-to-clipboard); changelog.service.ts writes audit entries with smart session ID resolution across 18 entity types
- **Skills Management**: SkillsPage with Skills Catalog and Resource-Skill Mapping tabs, KPI cards, search/filter, DynamicFormDialog-based CRUD for both entities, proficiency levels (Beginner-Expert) with color coding, certification tracking
- **Strategic Roster**: 4 view modes (Timeline Gantt, Cards, Table, Tree), portfolio hierarchy fetch, RAG/budget/year filters, KPI cards (strategic count, AUM, delivery completion), month-scale timeline bars with color-coded entity types, collapsible rows
- **Configurations Page**: Navigation hub with 5 tile cards (Workflows, Teams & Users, Skills & Mapping, Holiday Calendar, Resources) redirecting to feature pages via onNavigate callback; hover animations, grid layout
- **CalendarPage**: Dataverse task allocation integration, Outlook event creation flow
- **Agent Insights Service**: Agent-based analytics service layer
- Code cleanup: Removed console logging from RiskIssueSetupTaskModal, removed unused AI-generated helper files, removed unused module files, unnecessary logs
- Comprehensive Codebase Audit generated (COMPREHENSIVE_CODEBASE_AUDIT.md)  269 source files, 26 routes, 24 modules, 25 services, 42 generated SDK models, 33+ common components, 1389 lint errors identified, 75 ITT requirements mapped (44% coverage)
- **Jira sync**: Updated J2-65/66/67/74/75/76/77/157 from IN PROGRESS -> DONE (tickets had code complete but status not updated). Also updated backlog tickets J2-81, J2-83, J2-158, J2-159, J2-160 from TO DO -> DONE.
- **J2-133**: Timesheet Grid Hours vs Entry Sum Mismatch — Fixed read-after-write race condition by returning computed totals from `recalculateTimesheetHours` and applying locally
- **J2-134**: Timesheet Submitted By / Approved By Fields — Fixed "System" as approver name by passing `currentUser?.fullname` in modals; added missing `$select` fields for list/detail display
- **J2-136**: Timesheet New Timesheet Dialog Validation — Made resource selection required, added period duration display, max 370-day limit, future date validation

### Fri, June 26
- **UserContext Robustness & Caching**: Added exponential backoff retry logic (up to 3 retries) and sessionStorage backup cache fallback to prevent transient Dataverse API failures (P3).
- **Persona Override Security**: Gated the `localStorage` persona override helper behind development environment checks, securing the production build from privilege escalation bypasses (P8).
- **React Error Boundary Enrichment**: Configured the React `PageErrorBoundary` to capture and display complete component stack traces during `DEV` mode for rapid error diagnostics (P5).
- **Service Operation Validation (P4)**: Added `result.success` checks and manual error throwing constraints on Holiday Seeding, Change Request updates/creates, and Risk modifications to eliminate silent operation crashes.
- **Strategic Roster display mode persistence**: Configured `viewMode` persistence using `localStorage` to save the active Gantt/Card/Table/Tree layout state when switching views.
- **Gate Review Auto-Submission & Workflow Triggering**:
  * Implemented `evaluateGateTransitionPrerequisites` to validate metadata readiness checklists across three Gate Boundaries.
  * Added `autoSubmitGateReviewRequest` to auto-generate a pending Gate Review request on project update when all readiness metrics qualify.
  * Integrated automatic active "Gate Reviews" workflow triggering to launch Power Automate approval chains on auto-submission.

### Mon–Tue, June 29–30
- **Timesheet Notification Debugging & Fixes**: Fixed timesheet cloud flow triggering by dynamically resolving the submitting user's `systemuserid` from their associated Resource details (`_pm_systemuser_value`) when Dataverse OData returns empty `ownerid` payloads.
- **Workflow Approvals Notification Fallbacks**: Added name-based fallback search (`sendNotificationToUserName`) inside the step assignment flow to query the `systemusers` table using `pm_assigneedisplayname`/`pm_approvername` in case `ownerid` metadata is missing during step creation.
- **Change Request Notification Routing**: Added Teams notifications for Project Managers when change requests transition to "Under Review", and Outlook email alerts for the creators upon approval or rejection.
- **Issue Escalation Alerting**: Configured high-priority Teams alerts to notify project managers immediately when a project issue's escalation status transitions to `true`.
- **Database Schema Validation Fixes**: Resolved HTTP 400 validation error crashes by restricting the UI issue category selections to accepted OData picklist options (`0` -> Dependency, `1` -> Technical) across all page and dialog components.
- **Issue Detail Drawer Enhancements**: Added an "Escalate Issue" button in the drawer header and rendered the "Resolution Details" status card directly in the Overview tab for immediate visibility.
- **WCAG 2.1/2.2 AA Accessibility Compliance (J2-271)**: Implemented ARIA roles, navigation landmarks, language specifications, screen-reader labels (`aria-label`, `aria-current`), and semantic HTML wrapping to establish WCAG accessibility standards.


## Key Architecture Facts
- `pm_timesheetstatus` option set: `0=Approved`, `1=Submitted`, `2=Rejected`, `3=Draft`.
- `FORM_DIALOG_DECISION_EVENT = 'form:decision-complete'` dispatched by modals after decision; parent pages listen and refresh.
- Workflow instances can target either gate reviews (`pm_projectgatereview`) or initiatives (`pm_initiative`), distinguished by the `entityType` field on the workflow instance.
- `ApprovalStepTaskModal.tsx` contains wrapper components (`ApprovalStepResolver`) that resolve `approvalStepId` → entity ID → pass to modal.

### Thu, July 2
- **Dashboard Task Widget**: Removed RAW GUIDs; updated inner card to remove rounded corners, replaced completion percentage with a linear progress bar, added color coding for percentages, and ensured it fits in one row without scrolling.
- **Risk Page**: Fixed the Mitigation Tag style to match other tags.
- **Configurations / UI**: Hid the Funding Source tile/tab. Fixed Database confidence value display to show as a 0-100% percentage and removed GUIDs.
- **Resource Summary Page**:
  - Cleaned up navigation by removing the "Tasks" and "Approval" tabs.
  - Renamed "Assignments" tab and terminology to "Allocations".
  - Removed the "Supplier" field from the Resource Details section.
  - Injected a "Detailed Allocations Analysis" section into the Allocations tab containing rich KPI cards (Total Hours Allocated and Average Allocation %) with linear progress bars.
