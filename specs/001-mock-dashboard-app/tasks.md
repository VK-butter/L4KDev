# Tasks: Green Sales Dashboard Mock App

**Input**: Design documents from `/specs/001-mock-dashboard-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish workspace structure, package manifests, and shared tooling referenced by all user stories.

- [x] T001 Update root `pnpm-workspace.yaml` to register `frontend`, `backend`, and `shared` packages so installs run recursively.
- [x] T002 Add repo-level scripts (`dev`, `test`, `lint`) to `package.json` for orchestrating multi-workspace commands.
- [x] T003 [P] Create `frontend/package.json` with Vite + React 18 + TailwindCSS + Recharts dependencies and base scripts.
- [x] T004 [P] Create `backend/package.json` with Express, ts-node-dev, express-session, and Zod dependencies plus build/test scripts.
- [x] T005 Scaffold `shared/tsconfig.json` and `shared/types/index.ts` exporting base interfaces referenced by both apps.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that every story relies on (theming, layout shell, mock data loader, server skeleton, config).

- [x] T006 Define green design tokens and Tailwind config in `frontend/tailwind.config.ts` + `frontend/src/theme/tokens.ts`.
- [x] T007 [P] Build layout shell scaffolding (`frontend/src/components/layout/AppShell.tsx`) with persistent top nav + sidebar placeholders.
- [x] T008 [P] Stand up Express server entry (`backend/src/server.ts`) with CORS, JSON parsing, logging, and error middleware.
- [x] T009 Implement mock data loader utilities in `backend/src/data/mocks/index.ts` to read/write JSON fixtures (orders, users, embeds, audit log).
- [x] T010 Add session + role middleware in `backend/src/middleware/session.ts` consuming express-session and shared types.
- [x] T011 Configure shared router + query clients in `frontend/src/services/apiClient.ts` with Axios defaults pointing to backend proxy.
- [x] T012 Document environment variables and dev scripts in `specs/001-mock-dashboard-app/quickstart.md` (extend existing instructions with new env keys).

**Checkpoint**: Foundation ready—user story implementation can now begin.

---

## Phase 3: User Story 1 - Authenticate into dashboard shell (Priority: P1) 🎯 MVP

**Goal**: Deliver the green-themed login experience, mock authentication, session persistence, and guarded dashboard shell.

**Independent Test**: Using Playwright, start from a cold browser, submit valid admin/analyst credentials on `/login`, and verify redirect into the AppShell with nav + sidebar rendered. Invalid credentials keep the user on `/login` with inline errors.

### Implementation & Validation

- [x] T013 [P] [US1] Add Playwright journey for login + redirect in `frontend/tests/e2e/auth.spec.ts`.
- [x] T014 [US1] Implement mock credential repository in `backend/src/services/auth/mockAuthService.ts` seeded from `backend/src/data/mocks/users.json`.
- [x] T015 [US1] Build auth routes + controllers in `backend/src/api/auth/routes.ts` (login, logout, session probe) wired to session middleware.
- [x] T016 [US1] Create `frontend/src/pages/LoginPage.tsx` with form validation, inline errors, and green-themed visuals.
- [x] T017 [US1] Implement `frontend/src/hooks/useSession.ts` + `frontend/src/routes/ProtectedRoute.tsx` to gate dashboard routes based on role.
- [x] T018 [US1] Flesh out `frontend/src/components/layout/AppShell.tsx` top nav + sidebar with real content placeholders and user menu (depends on T016, T017).
- [x] T019 [US1] Document manual test steps for US1 in `specs/001-mock-dashboard-app/quickstart.md` under a new “Auth Verification” section.

**Checkpoint**: Authenticated shell works end-to-end; analysts can reach dashboard skeleton independently.

---

## Phase 4: User Story 2 - Manage user accounts from admin menu (Priority: P2)

**Goal**: Allow user-admins to manage accounts via the top-bar Admin menu, including add/edit/deactivate plus audit logging.

**Independent Test**: Log in as admin, open the Admin dropdown, add a new analyst, edit its display name, deactivate it, and confirm the account disappears from login while audit log records each action.

### Implementation & Validation

- [x] T020 [P] [US2] Add Playwright admin CRUD scenario in `frontend/tests/e2e/admin-menu.spec.ts` covering add/edit/deactivate flows.
- [x] T021 [US2] Implement admin service in `backend/src/services/admin/userDirectoryService.ts` with CRUD over `backend/src/data/mocks/users.json`.
- [x] T022 [US2] Expose admin API routes (`backend/src/api/admin/routes.ts`) for list/create/update/deactivate/reactivate + audit feed per contracts.
- [x] T023 [US2] Extend `frontend/src/components/layout/TopNav.tsx` to render Admin dropdown only for `role === 'admin'`.
- [x] T024 [US2] Build admin modals/panels in `frontend/src/components/admin/UserManagementPanel.tsx` + `UserModal.tsx` with form validation and optimistic updates.
- [x] T025 [US2] Persist audit entries through `backend/src/services/admin/auditLogService.ts` writing to `backend/src/data/mocks/audit-log.json`.
- [x] T026 [US2] Update manual test checklist (`specs/001-mock-dashboard-app/quickstart.md`) with admin menu validation steps.

**Checkpoint**: Admin menu fully manages mock accounts; analysts remain unaffected.

---

## Phase 5: User Story 3 - Explore sales order analysis (Priority: P3)

**Goal**: Provide KPI cards, interactive charts, filters, and drill-down panels backed by mock sales data and analytics endpoints.

**Independent Test**: With seeded mock data, adjust date range/category/status filters and verify KPIs + charts refresh within 1s; select a chart bar to open drill-down showing matching orders with pagination and “no data” state when filters empty.

### Implementation & Validation

- [x] T027 [P] [US3] Add Playwright scenario for filter + drill-down coverage in `frontend/tests/e2e/analytics.spec.ts`.
- [x] T028 [US3] Expand mock data generator (`backend/src/data/mocks/seedOrders.ts`) to produce ≥5k orders with diverse categories/statuses.
- [x] T029 [US3] Implement analytics querying logic in `backend/src/services/analytics/salesQueryService.ts` (summary, category breakdown, timeseries, drilldown).
- [x] T030 [US3] Wire analytics API routes (`backend/src/api/analytics/ordersRoutes.ts`) per contracts, including pagination + validation.
- [x] T031 [US3] Create filter state store + hooks in `frontend/src/hooks/useSalesFilters.ts` with URL sync and default ranges.
- [x] T032 [US3] Build KPI + chart components (`frontend/src/components/analytics/KpiBoard.tsx`, `RevenueByCategoryChart.tsx`, `RevenueTrendChart.tsx`) using Recharts.
- [x] T033 [US3] Implement drill-down table + empty states in `frontend/src/components/analytics/OrderDrilldownPanel.tsx`.
- [x] T034 [US3] Update `frontend/src/components/analytics/NoDataState.tsx` and integrate across dashboard views per edge-case requirement.
- [x] T035 [US3] Document QA steps for filters/drilldowns in `specs/001-mock-dashboard-app/quickstart.md`.

**Checkpoint**: Sales analytics experience is functional, testable, and independent.

---

## Phase 6: User Story 4 - Preview embedded external dashboards (Priority: P4)

**Goal**: Display Superset and NocoDB placeholder embeds with retry/error handling and integration notes so future live endpoints can be swapped in.

**Independent Test**: Toggle between embed tabs, confirm Superset iframe loads placeholder URL with instructions, NocoDB card renders mock API data, and both show retry messaging on forced failures.

### Implementation & Validation

- [x] T036 [P] [US4] Create Playwright coverage for embed toggles + error fallbacks in `frontend/tests/e2e/embeds.spec.ts`.
- [x] T037 [US4] Define embed metadata config in `shared/config/embeds.ts` plus loader in `backend/src/services/embeds/embedRegistry.ts`.
- [x] T038 [US4] Add backend endpoint `backend/src/api/analytics/embedRoutes.ts` that serves embed metadata/status.
- [x] T039 [US4] Build Superset iframe wrapper `frontend/src/components/embeds/SupersetEmbed.tsx` with caption + SSH/URL instructions.
- [x] T040 [US4] Build NocoDB card `frontend/src/components/embeds/NocoDbPlaceholder.tsx` that fetches mock API data and renders a chart via Recharts.
- [x] T041 [US4] Implement resilient embedding module controller `frontend/src/components/embeds/EmbedSwitcher.tsx` handling timeouts + retry messaging.
- [x] T042 [US4] Update developer notes in `frontend/src/components/embeds/README.md` documenting swap steps per SC-005.

**Checkpoint**: Embedding placeholders operate independently with clear documentation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, QA scripts, and hardening across stories.

- [ ] T043 Refresh root `README.md` with architecture diagram, workspace commands, and pointers to quickstart/tests.
- [ ] T044 Add `specs/001-mock-dashboard-app/checklist.md` summarizing manual regression steps per user story.
- [ ] T045 [P] Run `pnpm lint && pnpm test && pnpm test:e2e` and capture results in `specs/001-mock-dashboard-app/tasks.md` status log.
- [ ] T046 [P] Perform accessibility + responsiveness pass in `frontend/src/components/` ensuring nav/sidebar/admin UI meet basic WCAG contrast.
- [ ] T047 Review logging + error handling in `backend/src/middleware/` to ensure embed failures don’t crash core flows.
- [ ] T048 Validate quickstart instructions end-to-end (fresh clone → pnpm install → seed mocks → dev servers) and update any gaps.

---

## Dependencies & Execution Order

1. **Phase 1 Setup** → must finish before foundational work; T001 precedes parallel T003/T004.
2. **Phase 2 Foundational** → depends on Phase 1; T006–T012 unblock all user stories.
3. **User Stories (Phases 3–6)** → each depends on Phase 2 completion but can proceed in priority order or parallel once foundation is ready:
   - US1 (Auth shell) precedes others logically because admin/analytics views require authenticated routing.
   - US2 depends on US1 session/role infrastructure but can start once those tasks land.
   - US3 depends on analytics API scaffolding (T029/T030) yet is otherwise independent of US2.
   - US4 shares embed metadata config from foundation but does not rely on analytics or admin completion.
4. **Phase 7 Polish** → runs after desired user stories reach checkpoints.

---

## Parallel Opportunities

- Setup: T003 and T004 can run concurrently once T001 is merged.
- Foundational: T007 (layout) and T008 (server) can proceed in parallel; T011 (API client) can run alongside T009 (mock loader).
- US1: T014 (auth service) and T016 (login page) can progress simultaneously, converging at T017.
- US2: Frontend admin UI (T023–T024) can run in parallel with backend services (T021–T022) followed by integration.
- US3: Chart components (T032) and drill-down panel (T033) are parallelizable once analytics endpoints (T029–T030) exist.
- US4: Superset and NocoDB components (T039–T040) can be built concurrently referencing shared config (T037).
- Polish: T045 (test suite) and T046 (accessibility) touch different areas, so they can run side-by-side.

---

## Implementation Strategy

1. **MVP (US1 only)**  
   - Complete Phases 1–2, finish US1 tasks (T013–T019), and validate login + dashboard shell as the first demo slice.

2. **Incremental Delivery**  
   - US2 adds admin CRUD; deliver once T020–T026 pass tests.  
   - US3 layers analytics interactions; release after T027–T035.  
   - US4 finishes embedding placeholders; ship once T036–T042 succeed.

3. **Parallel Team Execution**  
   - Developer A: Foundations + US1.  
   - Developer B: US2 admin experience.  
   - Developer C: US3 analytics + US4 embeds (after foundational APIs ready).

Each story stays independently testable, enabling demos or releases after every phase.
\n---\n## Test Run Log � 2025-11-11 11:32:50\n- Lint: PASS\n- Unit tests: PASS (backend 1 file, frontend 1 file; shared none)\n- E2E: PARTIAL � 1 passed, 4 failed\n  - Passed: Authentication rejects invalid credentials\n  - Failed:\n    - Admin menu account management (stuck on /login after valid sign-in)\n    - Sales analytics dashboard (stuck on /login after valid sign-in)\n    - Authentication allows user admin to log in (stuck on /login)\n    - Embedding module (stuck on /login after valid sign-in)\n  - Notes: Likely auth/session handshake issue during E2E. Investigate cookie/session persistence or login flow redirect timing under Playwright.
\n---\n## Test Run Log � 2025-11-11 11:45:27\n- Lint: PASS\n- Unit tests: PASS (backend 1 file, frontend 1 file; shared none)\n- E2E: PASS � 5/5 passing after fixes\n  - Fixes applied:\n    - Guard against stale session refresh overriding login (frontend/src/hooks/useSession.tsx)\n    - Make category selection robust to Recharts click targets + add container click (frontend/src/components/analytics/RevenueByCategoryChart.tsx)\n    - Ensure a default selected category after data loads (frontend/src/pages/DashboardHome.tsx)
\n---\n## Phase 7 Status � 2025-11-11 11:48:21\n- T043: Completed (README validated)\n- T044: Completed (checklist present and validated)\n- T045: Completed (lint, unit, e2e all pass)\n- T046: Pending (accessibility/responsiveness pass)\n- T047: Completed (middleware + embed error handling reviewed)\n- T048: Completed (quickstart validated end-to-end)
\n---\n## Phase 7 Status � 2025-11-11 11:53:40\n- T043: Completed (README validated)\n- T044: Completed (checklist present and validated)\n- T045: Completed (lint, unit, e2e all pass)\n- T046: Completed (accessibility/responsiveness pass across nav, sidebar, charts, admin UI, embeds)\n  - Added landmarks, aria labels, focus-visible outlines, alerts/status regions, and keyboard-friendly controls.\n- T047: Completed (middleware + embed error handling reviewed)\n- T048: Completed (quickstart validated end-to-end)
