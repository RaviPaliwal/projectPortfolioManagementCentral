# Risk & Issue Collaboration Module — UI Mockup Specification

> **Purpose:** This document describes every screen, component, interaction, validation rule, and responsive behaviour needed for the Risk & Issue Collaboration Module. The target audience is an AI or designer creating high-fidelity UI mockups (Figma, HTML/CSS prototypes, or React component designs).

---

## Table of Contents

1. [Design System Reference](#1-design-system-reference)
2. [User Personas & Access Levels](#2-user-personas--access-levels)
3. [Screen 1: Team Member Workspace (Dashboard)](#3-screen-1-team-member-workspace-dashboard)
4. [Screen 2: Log New Issue Form](#4-screen-2-log-new-issue-form)
5. [Screen 3: Report New Risk Form](#5-screen-3-report-new-risk-form)
6. [Screen 4: My Mitigation Actions List](#6-screen-4-my-mitigation-actions-list)
7. [Screen 5: Update Mitigation Action Form](#7-screen-5-update-mitigation-action-form)
8. [Screen 6: Issue / Risk Detail with Comments](#8-screen-6-issue--risk-detail-with-comments)
9. [Mobile Variants](#9-mobile-variants)
10. [Validation Rules Matrix](#10-validation-rules-matrix)
11. [Interaction & Micro-Animation Spec](#11-interaction--micro-animation-spec)
12. [Accessibility Requirements](#12-accessibility-requirements)

---

## 1. Design System Reference

The mockup must be consistent with the existing Power Apps PPM application design system:

### Colour Palette

| Token | Hex (Light) | Hex (Dark) | Usage |
|-------|-------------|------------|-------|
| Primary | `#0ea5e9` | `#38bdf8` | Buttons, links, active states |
| Secondary | `#8b5cf6` | `#a78bfa` | Charts, accents |
| Success | `#22c55e` | `#4ade80` | Green RAG, resolved status |
| Warning | `#f59e0b` | `#fbbf24` | Amber RAG, medium priority |
| Error | `#ef4444` | `#f87171` | Red RAG, high risk, critical |
| Surface | `#ffffff` | `#1e293b` | Cards, dialogs |
| Background | `#f8fafc` | `#0f172a` | Page background |
| Text Primary | `#0f172a` | `#f8fafc` | Body text |
| Text Secondary | `#64748b` | `#94a3b8` | Labels, captions |
| Divider | `#e2e8f0` | `#334155` | Borders, dividers |

### Typography

- **Font Family:** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif` (body), `'Outfit', system-ui, sans-serif` (headings)
- **Scale:** xs (0.75rem), sm (0.8125rem), base (0.875rem), smMd (0.9375rem), lg (1rem), xl (1.125rem), 2xl (1.25rem), 3xl (1.5rem), 4xl (1.875rem)
- **Button text:** `textTransform: none`, `fontWeight: 600`, `borderRadius: 1.155 * 12`

### Spacing & Shape

- **Border radius:** `5` (theme base), `1.155 * 12` for cards/buttons/dialogs ≈ 14px
- **Card shadows:** Light `0 1px 2px rgba(0,0,0,0.05)`, dark `0 1px 2px rgba(0,0,0,0.2)`
- **Padding:** Standard card padding `16px`, table cells `px: 20px, py: 10px`

### Existing Components (Available)

These MUI-based components already exist and should inform the mockup:

| Component | Location | Notes |
|-----------|----------|-------|
| `DynamicFormDialog` | `@/components/common` | Renders forms from `FormField[]` array — supports text, select, multiline, date, user-select types |
| `DetailDrawer` | `@/components/common` | Slide-in drawer with tabs, header actions, subtitle chips |
| `PageHeader` | `@/components/common` | Title + subtitle + action buttons row |
| `KpiCardRow` | `@/components/common` | Row of metric cards with icon, label, value, subtitle |
| `SearchFilterBar` | `@/components/common` | Search input + dropdown filters row |
| `TableShell` | `@/components/common` | Loading/empty/error states wrapper for tables |
| `StatusTag` | `@/components/common` | Coloured pill badge for statuses |
| `ConfirmDialog` | `@/components/common` | Simple yes/no confirmation modal |
| `MetricTile` | `@/components/common` | Single metric card with label, value, colour |
| `EmptyState` | `@/components/common` | Empty state with icon, title, description, CTA |
| `TaskLink` | `@/components/common` | Clickable chip that opens a task |

---

## 2. User Personas & Access Levels

The mockup must clearly differentiate between **two distinct views**:

### Persona A: Team Member

| Attribute | Value |
|-----------|-------|
| Can do | Create issues, report risks, update own mitigation actions |
| Can view | Only risks/issues from projects where they are an active resource |
| Cannot do | Edit risk scores (probability/impact), financial exposure fields, delete any record |
| Primary device | Mobile (in the field) + Desktop (office) |
| Motivation | Quick data entry, status updates, photo evidence upload |

### Persona B: Project Manager

| Attribute | Value |
|-----------|-------|
| Can do | Full CRUD on risks, issues, mitigation actions |
| Can view | Full project risk register |
| Primary device | Desktop |
| Motivation | Triage incoming reports, assign mitigation, update risk scores |

---

## 3. Screen 1: Team Member Workspace (Dashboard)

### Purpose
The landing view for Team Members when they navigate to the Risks & Issues tab. Replaces the current full risk register with a personalised workspace.

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  🛡️ My Risk Workspace                          [Log Issue] [Report Risk] │
│  Track and update risks & issues assigned to you              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │My Issues │  │My Actions │  │Open Risks│  │Resolved  │     │
│  │   12     │  │     5     │  │     3    │  │Last Week │     │
│  │  Active  │  │  Due soon │  │  High     │  │    8     │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
├─────────────────────────────────────────────────────────────┤
│  ┌─ "My Assigned Issues" ────────────────────────────────┐  │
│  │ 🔍 Search issues...                          Filter ▼  │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ ● Red    Equipment failure on Site B    PM-2026-03 │ │  │
│  │ │         Technical · Due: 12 Jun · Owner: Me    ↗️  │ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ ● Amber  Vendor delay - Material shortage PM-2026-04 │ │  │
│  │ │         Vendor · Due: 20 Jun · Owner: Me       ↗️  │ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ ● Green  Staff training schedule conflict PM-2026-05 │ │  │
│  │ │         Operational · Owner: Me               ↗️  │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  │ [View All My Issues →]                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ "My Mitigation Actions" ─────────────────────────────┐  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ 📋 Install safety barriers                   Due:  │ │  │
│  │ │   Status: ● In Progress  Progress: ████░░ 60%      │ │  │
│  │ │   Risk: Scaffolding collapse risk            [Update]│ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ 📋 Conduct soil test                       Due: 25 │ │  │
│  │ │   Status: ○ Pending   Progress: ██░░░░ 20%         │ │  │
│  │ │   Risk: Foundation instability risk         [Update]│ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  │ [View All Mitigation Actions →]                        │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Header area:** Title + subtitle + two CTA buttons ("Log Issue" / "Report Risk") with distinct iconography
2. **KPI row:** 4 compact stat cards:
   - My Issues (count + "Active" label)
   - My Actions (count + "Due soon" if any overdue/urgent)
   - Open Risks (count + severity summary)
   - Resolved (count + "Last Week" timeframe)
3. **"My Assigned Issues" list:** Compact card list (not a full table). Each card shows:
   - RAG colour dot (Red/Amber/Green)
   - Issue title (bold)
   - Category chip + due date + owner badge
   - Click → opens Issue Detail (Screen 6)
4. **"My Mitigation Actions" list:** Similar card list. Each card shows:
   - Action title
   - Status badge (Pending = outlined, In Progress = filled amber, Completed = filled green)
   - Progress bar (percentage)
   - Parent risk name (subtle)
   - "Update" button → opens Update Mitigation Action Form (Screen 5)

### States

| State | Behaviour |
|-------|-----------|
| **Loading** | Skeleton cards (3 per list) with pulse animation |
| **Empty (no issues)** | Illustrative empty state: "No issues assigned to you" + "Log your first issue" CTA |
| **Empty (no actions)** | "No mitigation actions assigned" + "Issues that need action will appear here" |
| **Error** | Inline alert banner: "Unable to load your workspace. [Retry]" |
| **All items completed** | Celebration state: "All caught up! 🎉 Nothing requires your attention." |

---

## 4. Screen 2: Log New Issue Form

### Purpose
A streamlined form for Team Members to report a problem from the field. Must be **mobile-first**.

### Dialog Layout (Desktop & Mobile)

```
┌───────────────────────────────────────────────┐
│  🐞 Report New Issue                   [✕ Close] │
├───────────────────────────────────────────────┤
│  ⚠️ All fields marked * are required          │
│                                               │
│  Issue Title *                                │
│  ┌─────────────────────────────────────────┐  │
│  │ e.g. Equipment failure on Site B        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Category *                                   │
│  ┌─────────────────────────────────────────┐  │
│  │ ▼ Select category                       │  │
│  │  ├ Operational                          │  │
│  │  ├ Technical                            │  │
│  │  ├ Vendor                               │  │
│  │  └ Safety                               │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Description *                                │
│  ┌─────────────────────────────────────────┐  │
│  │ Describe what happened and the impact   │  │
│  │ ...                                     │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│  0/2000 characters                            │
│                                               │
│  Attachments (Optional)                       │
│  ┌─────────────────────────────────────────┐  │
│  │  📎 Drop files here or click to browse  │  │
│  │  ┌─────┐ ┌─────┐                       │  │
│  │  │ 📷  │ │ 📄  │                       │  │
│  │  │Photo│ │Doc  │                       │  │
│  │  └─────┘ └─────┘                       │  │
│  │  Supported: .jpg, .png, .pdf (max 10MB)│  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  [Cancel]              [Submit Issue 🐞]      │
└───────────────────────────────────────────────┘
```

### Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Issue Title | Text input (single line) | ✅ | Max 200 chars, trimmed | Placeholder: "e.g. Equipment failure on Site B" |
| Category | Select dropdown | ✅ | Must select one | Options: Operational, Technical, Vendor, Safety |
| Description | Textarea (multiline, 5 rows min) | ✅ | 20-2000 chars | Char counter below; placeholder: "Describe what happened and the immediate impact" |
| Attachments | File drop zone + button | ❌ | Max 5 files, each ≤ 10MB | Accepted: .jpg, .png, .pdf; shows thumbnails after upload |

### Mobile Layout

```
┌──────────────────────┐
│  🐞 New Issue   [✕] │
├──────────────────────┤
│  Title *             │
│  ┌────────────────┐  │
│  │ Equipment fail │  │
│  └────────────────┘  │
│                      │
│  Category *          │
│  ┌────────────────┐  │
│  │ ▼ Technical    │  │
│  └────────────────┘  │
│                      │
│  Description *       │
│  ┌────────────────┐  │
│  │ The conveyor   │  │
│  │ belt stopped…  │  │
│  │                │  │
│  └────────────────┘  │
│                      │
│  Attachments         │
│  ┌────────────────┐  │
│  │ 📸 Take Photo  │  │
│  │ 📁 Upload File │  │
│  └────────────────┘  │
│                      │
│  [Cancel]            │
│  [Submit 🐞]         │
└──────────────────────┘
```

### Validation Behaviour

| Scenario | Visual feedback |
|----------|-----------------|
| Submit without title | Red border on title field + "Issue title is required" error text below |
| Submit without category | Red border on dropdown + "Please select a category" |
| Submit with short description | Red border + "Description must be at least 20 characters" |
| File exceeds 10MB | Toast error: "File too large. Maximum size is 10MB" |
| 5 files already attached | Upload button disabled + "Maximum 5 files attached" |
| Success | Brief success toast → auto-close dialog → return to workspace with new issue appearing |

---

## 5. Screen 3: Report New Risk Form

### Purpose
A form for Team Members to flag a potential future threat. Simpler than the PM's full risk form — only exposes threat-level fields.

### Fields (Full Dialog)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Risk Title | Text | ✅ | "e.g. Risk of supply chain disruption due to port strike" |
| Category | Select | ✅ | Same 4 options: Operational, Technical, Vendor, Safety |
| Description | Textarea | ✅ | 20-2000 chars, char counter |
| Potential Impact | Select | ✅ | Low / Medium / High / Critical (simplified — no numeric matrix) |
| Attachments | File drop zone | ❌ | Same as Issue form |

> **Important:** The Team Member's risk form does NOT include Probability/Impact score matrix, residual scores, financial exposure, or response strategy. Those are Project Manager fields only.

### Post-Submission Behaviour

1. Form submits to `pm_risks` table with status = "Open" and `pm_riskstatus` = "Identified"
2. System auto-generates reference: `RISK-{YYYY}-{NNNNN}` (e.g. `RISK-2026-00042`)
3. Success toast: "Risk reported. A Project Manager will review and assign a score." ✅
4. PM receives a notification (future: Teams Adaptive Card)

---

## 6. Screen 4: My Mitigation Actions List

### Purpose
A full list view of all mitigation actions assigned to the current Team Member, with filtering and sorting.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  📋 My Mitigation Actions                      [Back]     │
├────────────────────────────────────────────────────────────┤
│  🔍 Search actions...           Status: [All ▼] [Sort ▼]  │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ○ Pending    Install safety barriers                │  │
│  │   Due: 25 Jun 2026  ·  Risk: Scaffolding collapse   │  │
│  │   Progress: ░░░░░░░░░░ 0%                    [Update]│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ● In Progress  Conduct soil compaction test         │  │
│  │   Due: 18 Jun 2026  ·  Risk: Foundation instability │  │
│  │   Progress: ██████░░░░ 60%                   [Update]│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ✅ Completed   Install warning signs                 │  │
│  │   Completed: 10 Jun 2026  ·  Risk: Site access risk │  │
│  │   Progress: ██████████ 100%                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Showing 12 of 42 actions                        [1] [2]…  │
└─────────────────────────────────────────────────────────────┘
```

### Filters

| Filter | Type | Options |
|--------|------|---------|
| Status | Dropdown | All, Pending, Active (In Progress), Completed |
| Risk | Dropdown | All, or specific risk name |
| Due date | Date range | Custom range picker |
| Search | Text | Searches action title + description + parent risk name |

### States

| State | Behaviour |
|-------|-----------|
| Loading | 4 skeleton cards |
| Empty | "No mitigation actions assigned to you" + "When a PM assigns you a mitigation task, it will appear here." |
| All completed | Subtle "All actions completed! 🎉" banner above the list (but still shows completed items) |

---

## 7. Screen 5: Update Mitigation Action Form

### Purpose
A form for Team Members to update the status of a mitigation action assigned to them. Only the **action owner** can update.

### Dialog Layout

```
┌────────────────────────────────────────────────┐
│  📋 Update Mitigation Action          [✕ Close] │
├────────────────────────────────────────────────┤
│  ┌─ Parent Risk Context (Read-Only) ─────────┐ │
│  │  Risk: Scaffolding collapse on Site A      │ │
│  │  Current Score: 12 (HIGH)                  │ │
│  │  Target Score: 4 (LOW)                     │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Action: Install safety barriers                 │
│  Owner: John Smith (You)                         │
│  Due Date: 25 Jun 2026                           │
│                                                  │
│  ── Update Fields ──                             │
│                                                  │
│  Action Status *                                 │
│  ┌──────────────────────────────────────────┐    │
│  │ ● In Progress                            │    │
│  │ ○ Pending                                │    │
│  │ ○ Completed                              │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Progress %                                      │
│  ┌──────────────────────────────────────────┐    │
│  │ ████████░░░░░░░░░░░░  40%                │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Progress Notes                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Installed 3 of 5 barriers. Waiting for   │    │
│  │ concrete to cure before installing the   │    │
│  │ remaining two.                           │    │
│  └──────────────────────────────────────────┘    │
│  0/2000 characters                               │
│                                                  │
│  Date Completed (only if Status = Completed)     │
│  ┌──────────────────────────────────────────┐    │
│  │ 📅 22 Jun 2026                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  [Cancel]          [Save Update ✅]               │
└────────────────────────────────────────────────┘
```

### Field Behaviour

| Field | Type | Required | Conditional Logic |
|-------|------|----------|-------------------|
| Action Status | Radio group | ✅ | Options: Pending, In Progress, Completed |
| Progress % | Slider + number | ❌ (auto) | 0-100% step 5; auto-sets to 100% when Completed |
| Progress Notes | Textarea | ❌ | Shown always; 2000 char limit |
| Date Completed | Date picker | ✅ if status=Completed | Hidden unless Completed selected; defaults to today |

### Read-Only Context Block

Shows at top of form:

- Parent risk **title**
- Current probability/impact **score** (numeric) with colour badge
- Target residual **score** (numeric) with colour badge
- Visual arrow: `12 (HIGH) → 4 (LOW)`

### Validation

| Scenario | Behaviour |
|----------|-----------|
| Submit without status change | "No changes detected. Nothing to save." |
| Status = Completed, no date | Red highlight on Date Completed + "Completion date is required" |
| Status = Completed, progress < 100% | Warning: "Progress is under 100%. Mark as complete anyway?" (confirmation) |
| Not the assigned owner | The Update button is hidden entirely (they see a read-only view) |

---

## 8. Screen 6: Issue / Risk Detail with Comments

### Purpose
A detail view for any issue or risk record, featuring a threaded comment section for real-time collaboration.

### Layout (Drawer or Full Page)

```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]    🐞 Equipment failure on Site B        [✕ Close]│
├─────────────────────────────────────────────────────────────┤
│  RAG: ● Red    Category: Technical    Ref: ISS-2026-0042    │
│  Status: In Progress    Priority: Critical    Escalated: 🚩 │
├─────────────────────────────────────────────────────────────┤
│ ┌─Tab: Overview──Tab: Comments (3)──Tab: Attachments (2)─┐  │
│ │                                                         │  │
│ │ ── TAB: OVERVIEW ──                                     │  │
│ │ Description:                                            │  │
│ │ The main conveyor belt at Site B stopped due to...      │  │
│ │                                                         │  │
│ │ Details:                                                │  │
│ │ Raised: 10 Jun 2026 by John Smith                       │  │
│ │ Target Resolution: 25 Jun 2026                          │  │
│ │ Owner: John Smith (Me)                                  │  │
│ │ Linked Risk: RISK-2026-0012                             │  │
│ │                                                         │  │
│ │ ── TAB: COMMENTS ──                                     │  │
│ │ ┌──────────────────────────────────────────────────┐    │
│ │ │ 👤 John Smith    Today 14:32                     │    │
│ │ │ The belt stopped. Maintenance team notified.     │    │
│ │ │ 📎 photo_2026-06-16.jpg                          │    │
│ │ ├──────────────────────────────────────────────────┤    │
│ │ │ 👤 Sarah (PM)    Today 15:10                     │    │
│ │ │ ⭐ Assigned to you. Please inspect motor unit.  │    │
│ │ │ Can you share the error code?                    │    │
│ │ ├──────────────────────────────────────────────────┤    │
│ │ │ 👤 John Smith    Today 15:45                     │    │
│ │ │ Error code: E-4032. Photo attached.              │    │
│ │ │ 📎 error_code.jpg                                │    │
│ │ └──────────────────────────────────────────────────┘    │
│ │                                                         │
│ │ ┌─ Write a comment... ──────────────────────────────┐   │
│ │ │ The error code is E-4032. Will investigate...     │   │
│ │ │ [📎 Attach]                              [Send ➤] │   │
│ │ └──────────────────────────────────────────────────┘   │
│ │                                                         │
│ │ ── TAB: ATTACHMENTS ──                                  │
│ │ ┌────┐ ┌────┐ ┌────┐                                   │
│ │ │📷  │ │📷  │ │📄  │                                   │
│ │ │photo│ │error│ │report                                │
│ │ │.jpg │ │.jpg │ │.pdf                                  │
│ │ └────┘ └────┘ └────┘                                   │
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Comments Section Behaviour

| Feature | Detail |
|---------|--------|
| Thread view | Chronological with avatar, name, timestamp, message body |
| File attachment in comment | Inline thumbnail/images in the comment bubble |
| @mentions | Typing `@` opens a user picker; mentions highlighted in blue |
| New comment indicator | A subtle blue dot on the Comments tab badge when new comments exist |
| Auto-scroll | Scrolls to bottom when new comment is added |
| Empty state | "No comments yet. Be the first to share an update." |

### Write Comment Bar

- Fixed at bottom of the tab
- Multi-line input (expands up to 4 lines)
- Paperclip button for file attachment
- Send button (disabled when input is empty)
- Enter to send, Shift+Enter for newline

---

## 9. Mobile Variants

All screens must have a mobile variant (< 768px wide). Key differences:

### Navigation Changes
- Top app bar replaces sidebar
- Back button is always visible
- Bottom sheet instead of dialogs where possible

### Layout Changes

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Workspace | 2-column lists | Single-column stacked |
| Log Issue form | Dialog (modal) | Full-screen page or bottom sheet |
| Mitigation Actions list | Card list | Same, but full-width cards |
| Update Action form | Dialog | Bottom sheet (draggable) |
| Detail view | Drawer sliding from right | Full-screen page with back button |

### Mobile-Specific Controls

- **Take Photo** button (opens native camera) in addition to file upload
- **Voice input** icon on text fields (uses device speech-to-text)
- **Pull-to-refresh** on the workspace page
- **Swipe to complete** on mitigation action cards (swipe right = mark as complete)

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom sheets |
| Tablet | 640-1024px | 2-column grid hybrid, dialogs |
| Desktop | > 1024px | Full multi-column, drawers |

---

## 10. Validation Rules Matrix

### Issue Validation

| Rule | Error Message | Implementation |
|------|---------------|----------------|
| Title cannot be empty | "Issue title is required" | `required` on input, red border + helper text |
| Title max 200 chars | "Title must be under 200 characters" | `maxLength` validation |
| Category must be selected | "Please select a category" | `required` validation on select |
| Description 20-2000 chars | "Description must be between 20 and 2000 characters" | `minLength` + `maxLength` |
| File max 10MB each | "File too large. Maximum size is 10MB" | File size check on upload |
| Max 5 files | "Maximum 5 files allowed" | File count check |

### Risk Validation

| Rule | Error Message | Implementation |
|------|---------------|----------------|
| Title cannot be empty | "Risk title is required" | Same pattern as issue |
| Category must be selected | "Please select a risk category" | Same pattern as issue |
| Description 20-2000 chars | "Description must be between 20 and 2000 characters" | Same pattern as issue |
| Potential impact required | "Please select the potential impact level" | Same pattern |

### Mitigation Action Update Validation

| Rule | Error Message | Implementation |
|------|---------------|----------------|
| Status must be selected | "Please select an action status" | Radio group validation |
| Completion date required if Completed | "Completion date is required when marking as complete" | Conditional validation |
| Progress notes max 2000 chars | "Progress notes must be under 2000 characters" | `maxLength` |
| Only owner can update | "You can only update actions assigned to you" | Backend check, button hidden on frontend |

### Security Validation (Backend Enforcement)

| Rule | Enforcement |
|------|-------------|
| Team Member cannot delete | Delete button hidden for Team Member persona |
| Team Member cannot edit risk scores | Probability/impact/residual/strategy fields hidden from Team Member form |
| Team Member cannot edit financial exposure | Financial exposure fields hidden |
| Team Member can only see own project items | API filter: `_pm_project_value in [user's project IDs from Access Teams]` |
| Team Member can only update own mitigation actions | API filter: `pm_actionowner eq [current user]` |

---

## 11. Interaction & Micro-Animation Spec

### Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Dialog open | Scale up + fade in (opacity 0→1, scale 0.95→1) | 200ms | ease-out |
| Dialog close | Scale down + fade out | 150ms | ease-in |
| Drawer slide-in | Slide from right (translateX 100%→0) | 250ms | ease-out |
| Drawer slide-out | Slide to right | 200ms | ease-in |
| Tab switch | Fade cross (old fades out, new fades in) | 150ms | ease |
| Card hover | Slight lift (box-shadow increase, translateY -2px) | 150ms | ease-out |
| Status change | Scale pulse on the badge (scale 1→1.15→1) | 300ms | ease-in-out |
| Comment send | Comment bubble slides up from bottom | 200ms | ease-out |
| File upload | Progress bar fills + checkmark appears | 800ms | linear |
| Error state | Shake on the form field (translateX ±4px 3 times) | 400ms | ease |

### Micro-interactions

| Trigger | Effect |
|---------|--------|
| Hover on CTA buttons | Background darkens by 10%, no text colour change |
| Click "Update" on action card | Button shows loading spinner while form dialog opens |
| Filter dropdown open | Smooth expand with 150ms ease-out |
| Empty state appearance | Icon fades in, then text fades in (staggered 100ms) |
| Progress slider drag | Tooltip shows current percentage value |
| Send comment | Button shows brief spinner, then comment appears instantly |
| Mark as complete | Brief confetti burst (optional, toggleable) |

---

## 12. Accessibility Requirements

### WCAG 2.1 AA Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| **Colour contrast** | All text: ≥ 4.5:1 ratio; large text (≥18px bold / ≥24px): ≥ 3:1 |
| **Focus indicators** | Every interactive element has visible `:focus-visible` outline (2px, primary colour, 2px offset) |
| **Screen reader labels** | All icons use `aria-label`; form fields have associated `<label>` or `aria-labelledby`; status badges have `aria-label="Status: Red"` |
| **Keyboard navigation** | All actions reachable via Tab; dialogs trap focus; Escape closes dialogs; Enter submits forms |
| **Error announcements** | Inline errors use `aria-live="polite"` region; form-level errors announced by `role="alert"` |
| **Touch targets** | All interactive elements minimum 44x44px on mobile |
| **Reduced motion** | Respect `prefers-reduced-motion: reduce` — disable all animations, use instant transitions |
| **Heading hierarchy** | Single `<h1>` per page, `<h2>` for sections, `<h3>` for cards |
| **Landmarks** | Use `<nav>`, `<main>`, `<aside>`, `role="search"` appropriately |
| **Zoom** | No loss of functionality at 200% zoom |

### Screen Reader Announcements

| Action | Announcement |
|--------|-------------|
| Issue created | "New issue created successfully. Reference ISS-2026-0042." |
| Action updated | "Mitigation action updated to In Progress. Progress 60 percent." |
| Error on form | "Error: Issue title is required. Fix before submitting." |
| File uploaded | "Photo_001.jpg uploaded. 2 of 5 files attached." |
| Comment sent | "Comment sent. 3 comments on this issue." |
| Status badge | "Risk status: Red. High risk." |

---

## Appendix A: Data Mapping (for AI reference)

| Dataverse Table | Key Fields | Used In |
|-----------------|------------|---------|
| `pm_issue` | `pm_issuetitle`, `pm_issuecategory`, `pm_issuedescription`, `pm_issuestatus`, `pm_ragstatus`, `pm_prioritylevel`, `pm_issueowner`, `_pm_project_value` | Issue forms, workspace list, detail view |
| `pm_risk` | `pm_risktitle`, `pm_riskcategory`, `pm_riskdescription`, `pm_inherentprobability`, `pm_inherentimpact`, `pm_riskstatus`, `_pm_project_value` | Risk forms, workspace list, detail view (PM only: scores) |
| `pm_riskmitigationaction` | `pm_actiontitle`, `pm_actiondescription`, `pm_actionowner`, `pm_status`, `pm_duedate`, `pm_completiondate`, `pm_notes`, `_pm_risk_value` | Mitigation action forms, workspace list, detail view |
| `pm_changelogentry` | (existing model — could be repurposed for comments) | Comments thread |
| `systemuser` | `systemuserid`, `fullname`, `domainname` | User context, comment authorship |
| `teammembership` | `systemuserid`, `teamid` | Access Team isolation |

## Appendix B: Category Option Values

### Risk Categories (for Team Member form)

```json
[
  { "value": "5", "label": "Operational" },
  { "value": "6", "label": "Technical" },
  { "value": "7", "label": "Vendor" },
  { "value": "8", "label": "Safety" }
]
```
> Note: These are **new** option set values (5-8) to avoid conflicting with existing PM-facing categories (0-4: Resource, Financial, Legal, Technical, External).

### Issue Categories (Team Member facing)

```json
[
  { "value": "0", "label": "Operational" },
  { "value": "1", "label": "Technical" },
  { "value": "2", "label": "Vendor" },
  { "value": "3", "label": "Safety" }
]
```
> Note: Same set for both risks and issues — consistency across the module.

### Mitigation Action Status

```json
[
  { "value": "2", "label": "Pending" },
  { "value": "1", "label": "In Progress" },   // existing "InProgress"
  { "value": "0", "label": "Completed" }       // existing "Complete"
]
```
> Note: Maps closely to existing values but adds "Pending" (value 2) as a new option set value.
