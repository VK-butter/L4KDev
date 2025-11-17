# Implementation Plan: Green Sales Dashboard Mock App

**Branch**: `001-mock-dashboard-app` | **Date**: 2025-11-10 | **Spec**: `specs/001-mock-dashboard-app/spec.md`
**Input**: Feature specification from `/specs/001-mock-dashboard-app/spec.md`

## Summary

Build a green-themed mock web application that reuses the Sale-Dashboard-prototype-Embeded structure while adding authenticated access, an admin-only account management menu in the top bar, a modular sales analytics workspace with interactive filters/drill downs, and embed placeholders for Apache Superset and NocoDB, all backed by a mock data/service layer that simulates a future PostgreSQL-over-SSH connection.

## Current Progress (2025-11-17)

- Backend
  - Express server with session middleware, mock data loader, and Zod validation where applicable.
  - Analytics endpoints: `/api/analytics/orders/raw`, `/api/analytics/orders/raw/summary`, `/api/analytics/orders/raw/status`.
  - Auth and Admin APIs: login/logout/session probe; user CRUD + audit log over mock store.
  - `pg` pool scaffolded for future SSH/Postgres; env-driven config documented.
- Frontend
  - App shell with top nav + sidebar; protected routing and session hooks.
  - Sales dashboard with date filters, KPIs, charts (Recharts), and drill-down table.
  - Admin UI (panels/modals) with form validation and optimistic updates.
  - Embeds (Superset iframe, NocoDB placeholder) + SSH helper; error handling UX.
- Deployment/Docs
  - Production Dockerfiles for backend/frontend, `deployment/docker-compose.yml`, env templates, operator checklist, and host runbook ready for hand-off.
  - Quickstart instructions updated to mirror `.env` requirements; plan/spec/tasks/checklist aligned.
- Tests
  - Lint + unit + Playwright E2E passing; latest results captured in `tasks.md`.

Next
- Optional: persist price/quantity targets in backend store (admin-editable).
- Optional: CSV streaming endpoint for large exports.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18 frontend) + Node.js 20 (Express backend)  
**Primary Dependencies**: React 18, Vite, React Router, TailwindCSS (theming), Recharts (data viz), Axios, Node/Express, express-session, Zod for validation  
**Storage**: In-memory JSON/TS fixtures persisted via lightweight local files now, structured to mimic PostgreSQL repositories later  
**Testing**: Vitest + React Testing Library for UI, Jest for backend services, Playwright smoke journeys for auth/admin/filters  
**Target Platform**: Modern Chromium/Firefox/Safari browsers + Node 20 server on developer laptops  
**Project Type**: Web (separate frontend + backend workspaces with shared types)  
**Performance Goals**: Dashboard filter + drill-down responses ≤1s for 5k mock orders; login-to-dashboard in ≤5s end-to-end; admin CRUD within 3 clicks  
**Constraints**: No real network dependencies; embed components must fail gracefully; role-aware menu must never expose admin controls to analysts  
**Scale/Scope**: Single demo environment with ≤10 mock users, <10 charts, and modular packages ready for future integration

## Constitution Check

The constitution file is still the scaffolded template with no ratified principles, so there are currently **no enforceable constraints** to validate against. Gate passes with the note that we must revisit once the project defines real principles. Post–Phase 1 (after research, data model, contracts, and agent-context updates) there remain no stated principles, so the gate continues to pass unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-mock-dashboard-app/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── auth/
│   │   ├── admin/
│   │   └── analytics/
│   ├── data/
│   │   ├── mocks/
│   │   └── repositories/
│   ├── services/
│   └── middleware/
├── tests/
│   ├── unit/
│   └── integration/
└── package.json

frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── analytics/
│   │   └── embeds/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   └── theme/
├── tests/
│   ├── unit/
│   └── e2e/
└── package.json

shared/
├── types/
└── config/
```

**Structure Decision**: Adopt a two-project layout (frontend + backend) plus a shared workspace for types/config so that UI, services, and mock data evolve independently while retaining alignment with the upstream Sale-Dashboard repo organization.

## Complexity Tracking

_None — no constitution-defined limits to justify yet._
