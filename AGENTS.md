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

## Key Architecture Facts
- `pm_timesheetstatus` option set: `0=Approved`, `1=Submitted`, `2=Rejected`, `3=Draft`.
- `FORM_DIALOG_DECISION_EVENT = 'form:decision-complete'` dispatched by modals after decision; parent pages listen and refresh.
- Workflow instances can target either gate reviews (`pm_projectgatereview`) or initiatives (`pm_initiative`), distinguished by the `entityType` field on the workflow instance.
- `ApprovalStepTaskModal.tsx` contains wrapper components (`ApprovalStepResolver`) that resolve `approvalStepId` → entity ID → pass to modal.
