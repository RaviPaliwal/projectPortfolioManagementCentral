# PPM Accelerator

**Project Portfolio Management Central** is a React + TypeScript + Vite application built as a Power Apps Code App accelerator for portfolio, programme, and project management.

This repository contains a modern client shell that integrates with Microsoft Power Apps / Dataverse entities and Power Automate workflows, delivering a scalable PPM experience for planning, reporting, resourcing, and governance.

## Key Capabilities

- Portfolio, programme, and project management
- Pipeline / initiatives tracking
- Resource allocation and timesheets
- Budgets, cashflow, and funding sources
- Gate reviews, benefits tracking, and approval workflows
- Risk, issue, and change request management
- Tasks, calendar, and strategic roster views
- Financial reports, configurations, and activity logs

## Architecture

- `src/app/App.tsx` — app shell, theme provider, user context, route guard, and tab-based layout
- `src/app/routes.tsx` — page map for all product modules
- `src/components/layout/PrimaryShell.tsx` — main navigation shell and menu tabs
- `src/context/UserContext.tsx` — Power Apps user/role resolution, persona caching, and runtime context
- `src/services/` — service layer for Dataverse entities and mapped domain models
- `power.config.json` — Power Apps Code App metadata, connection references, and Dataverse entity mappings

## Modules and Pages

The application includes the following feature modules:

- Dashboard
- Portfolios
- Programmes
- Projects
- Pipeline (Initiatives)
- Resources
- Timesheets
- Budgets
- Gate Reviews
- Benefits
- Risks
- Issues
- Change Requests
- Cashflow
- Tasks
- Funding Sources
- Skills
- Workflows
- Holidays
- Status Snapshots
- Calendar
- Strategic Roster
- Activity Log
- Financial Reports
- Configurations

## Getting Started

### Prerequisites

- Node.js 20+ (or compatible modern Node.js runtime)
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the local development site at the address shown by Vite.

### Build for production

```bash
npm run build
```

### Lint the project

```bash
npm run lint
```

## Power Apps / Dataverse Integration

This project is configured to work inside a Power Apps Code App environment and references Dataverse entities through generated services.

- `power.config.json` contains app metadata, connection references, and entity mappings for Power Apps.
- `src/services/` maps generated Dataverse models to application domain models.
- `src/constants/moduleNames.ts` and `src/constants/permissions.ts` manage module entity names and persona-based feature permissions.

## TypeScript and Vite Configuration

- `tsconfig.app.json` includes strict type checking and path aliasing for `@/*`
- `package.json` uses `vite` for development and build
- `@microsoft/power-apps-vite` is installed for Power Apps Code App compatibility

## Notes

- The UI uses Material UI (`@mui/material`) for components and theming.
- The app loads fonts locally with `@fontsource` packages for CSP-friendly font delivery.
- `src/app/App.tsx` supports deep linking with `?tab=<module>`
- `src/components/common/RouteGuard/RouteGuard.tsx` restricts access based on user persona and permissions.

## Repository structure

- `src/app/` — root application entry, routes, and app shell
- `src/components/` — reusable UI components and layout
- `src/context/` — authentication and user persona context
- `src/features/` — feature modules and page implementations
- `src/services/` — backend integration and data mapping
- `src/constants/` — module metadata, permissions, and shared definitions
- `src/styles/` — theme and design tokens
- `src/utils/` — helper utilities and navigation helpers

## Useful commands

- `npm run dev` — start development server
- `npm run build` — build a production bundle
- `npm run lint` — run ESLint against the project

## License

Add project license details here if required.
