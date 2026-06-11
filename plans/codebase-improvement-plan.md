# Codebase Quality & Reusability Improvement Plan

## 1. Executive Summary
The project has reached a level of complexity where manual boilerplate and inconsistent typing are slowing down development. This plan outlines a phased approach to transition the codebase from "Feature-Heavy" (duplicated logic) to "Framework-Light" (reusable logic).

---

## 2. Identified Weaknesses (Poor Code Points)

### A. Repetitive State Management (Boilerplate)
- **Problem:** Every feature page (e.g., `BenefitsPage.tsx`, `ProjectsPage.tsx`) manually manages loading, error, success, and dialog visibility states.
- **Impact:** High risk of "divergent evolution" where one page handles errors differently than another.
- **Example:** `ProjectsPage.tsx` has ~473 lines, much of which is just toggling boolean flags for 8 different dialogs.

### B. Type Erosion (`any` Usage)
- **Problem:** Over 100 instances of `: any` found in critical paths (services, form data, props).
- **Impact:** TypeScript cannot catch runtime errors, especially during Dataverse schema changes.
- **Location:** Predominantly in `unwrapList`, `aggregateFinancials`, and Form Dialog props.

### C. Inconsistent Component Standards
- **Problem:** Direct imports of `@mui/material/Button` instead of the project's `@/components/common/Button`.
- **Impact:** Global design changes (like `borderRadius` adjustments in `theme.ts`) might not apply consistently across the app.

### D. Fragile Form Handling
- **Problem:** Form state is managed via unstructured objects and manual `onChange` handlers for every field.
- **Impact:** No centralized validation; easy to miss required fields or send incorrect types (string vs number) to Dataverse.

---

## 3. Proposed Reusable Components & Hooks

| Type | Name | Purpose |
| :--- | :--- | :--- |
| **Hook** | `useAsync<T>` | Standardizes loading/error/data states for any API call. |
| **Hook** | `useCrud<T>` | Extension of `useAsync` specifically for List, Create, Update, Delete cycles. |
| **Component** | `DataTable<T>` | A high-level wrapper around `TableShell` that handles sorting, searching, and pagination automatically via `useDataGrid`. |
| **Component** | `ConfirmDialog` | A standard "Delete" or "Cancel Changes" confirmation modal. |
| **Component** | `FormGroup` | A layout component to standardize 2-column form grids with labels and help text. |

---

## 4. Detailed Implementation Plan

### Phase 1: Foundation (Core Hooks)
1.  **Create `src/hooks/useAsync.ts`**: A base hook for handling any promise with state.
2.  **Create `src/hooks/useCrud.ts`**: A specialized hook that takes a service object and manages the lifecycle of a resource.
3.  **Refactor `src/services/common.ts`**: Replace `any` in `unwrapList` and `unwrapSingle` with proper generics and type guards.

### Phase 2: Component Standardization
1.  **Create `src/components/common/ConfirmDialog`**: Standardize the delete confirmation UI used in Cashflow, Benefits, and Projects.
2.  **Build `src/components/common/DataTable/DataTable.tsx`**: 
    *   Integrate `useDataGrid` logic directly.
    *   Accept `columns` configuration.
    *   Include built-in search and export buttons.
3.  **Enforce Component Usage**: Use a lint rule or manual audit to ensure `@/components/common` is used instead of raw MUI for Buttons and Chips.

### Phase 3: Feature Refactoring (Proof of Concept)
1.  **Refactor `BenefitsPage.tsx`**: 
    *   Replace manual `useState` flags with `useCrud`.
    *   Replace manual table logic with the new `DataTable`.
    *   Target reduction: ~600 lines down to ~250 lines.
2.  **Apply patterns to `CashflowPage.tsx` and `BudgetsPage.tsx`**.

### Phase 4: Type Safety & Validation
1.  **Schema Cleanup**: Audit `src/types/dataverse.ts` and ensure all models extend a base `DataverseEntity` type.
2.  **Form Validation**: Integrate a lightweight validation layer (like `zod` or simple internal validators) into the `FormDialog` component.

---

## 5. Verification & Testing
- **Unit Tests**: Add tests for `useCrud` to ensure it handles network failures and optimistic updates correctly.
- **Visual Regression**: Ensure that the new `DataTable` matches the exact styling of the current manual tables.
- **Type Check**: Run `tsc --noEmit` to ensure no new type errors are introduced during the refactor.

---

## 6. Migration Strategy
- **Co-existence**: The new `DataTable` and `useCrud` will be added alongside existing code.
- **Incremental Migration**: Features will be migrated one-by-one, starting with simpler modules (Holidays, Skills) before moving to complex ones (Projects).
