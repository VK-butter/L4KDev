# Feature Specification: Green Sales Dashboard Mock App

**Feature Branch**: `001-mock-dashboard-app`  
**Created**: 2025-11-10  
**Status**: Complete  
**Input**: User description: "Using the existing GitHub repository Sale-Dashboard-prototype-Embeded (https://github.com/VK-butter/Sale-Dashboard-prototype-Embeded.git) as the starting point, build a fully functional mock web application for dashboards. Requirements: Add a green-themed UI. Include a login page (user authentication) that leads to the main dashboard. Include a persistent top navigation bar and a left sidebar for chart/dashboard navigation. Implement a Sales Order Analysis Dashboard with mock data (orders, revenue, categories, dates) with interactive filtering and drill-down. Integrate embedding placeholders/components for external dashboards: e.g., Apache Superset (iframe), NocoDB API charts. Structure the backend to simulate a future connection to PostgreSQL via SSH tunnel, though for now use local mock data. Provide modular code (front-end, back-end, data layer, embedding module) and annotate where the GitHub project's existing files are extended or replaced."

## User Scenarios & Testing *(mandatory)*

## Current Progress (2025-11-17)

- Authenticated shell delivered: login page, session guard, protected routes, role-aware Admin menu.
- Admin user management: add/edit/deactivate/reactivate with audit log; UI wired to backend admin APIs.
- Sales analytics workspace: date filters, KPI board, revenue-by-category bar, revenue trend, drill-down table with pagination; interactive category drill and status filters.
- Embeds playground: Superset iframe placeholder plus inline NocoDB share views rendered inside the app (no redirects) with notes on when to switch to API/webhook integrations; SSH tunnel helper UI.
- Backend implemented: Express server, session middleware, mock data layer, analytics routes (`/api/analytics/orders/raw`, `/raw/summary`, `/raw/status`), admin routes, auth routes.
- Environment & deployment: `.env` instructions synced with `quickstart.md`; production-ready Dockerfiles, compose stack, environment templates, and the `deployment/` checklist + host runbook now cover end-to-end rollout.
- Testing: lint + unit + Playwright E2E all passing per tasks log.

Open items
- Optional: persist targets for price/quantity via backend store.
- Optional: CSV streaming endpoint for large exports.

### User Story 1 - Authenticate into dashboard shell (Priority: P1)

A business analyst opens the mock app, signs in with provided demo credentials on a green-themed login page, and lands on the primary dashboard layout that reuses the upstream repo but with persistent top nav and left sidebar.

**Why this priority**: No other dashboard action is possible until the analyst can authenticate and reach the home view, so it unlocks all downstream work.

**Independent Test**: Launch the app with a clean session, submit valid credentials, and verify redirect to the dashboard layout with brand-compliant UI.

**Acceptance Scenarios**:

1. **Given** the analyst is on the login page, **When** they submit valid mock credentials, **Then** they see the dashboard shell with the global nav and sidebar rendered in the new green theme.
2. **Given** the analyst enters invalid credentials, **When** the login request is processed, **Then** an inline error is shown without leaving the page and no session is created.

---

### User Story 2 - Manage user accounts from admin menu (Priority: P2)

A user admin signs in, opens an “Admin” dropdown that sits in the top navigation bar, and creates, edits, or disables dashboard accounts through modal forms tied to the mock data layer.

**Why this priority**: Admin tooling is mandatory to provision demo users and validates the new top-bar menu requirement.

**Independent Test**: Log in with admin credentials, open the admin menu, perform add/edit/deactivate operations, and confirm the mock account list updates immediately without affecting non-admin UI.

**Acceptance Scenarios**:

1. **Given** a user admin is authenticated, **When** they open the top-bar Admin menu and choose “Add Account,” **Then** a modal collects username/role/password and the mock directory reflects the new account.
2. **Given** the admin selects an existing account in the admin menu, **When** they deactivate it, **Then** the account is marked inactive in the mock store and the user can no longer log in.

---

### User Story 3 - Explore sales order analysis (Priority: P3)

An analyst uses the Sales Order Analysis Dashboard to view mock metrics (orders, revenue, product categories, dates), applies filters, and drills down to record-level context without reloading the whole page.

**Why this priority**: Demonstrates the dashboard’s analytical value and validates the mock data layer and filtering interactions expected in production.

**Independent Test**: With a seeded dataset, interact with filters (date range, category, order status) and confirm visualizations update plus drill-down panes show synchronized record details.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded with mock data, **When** the analyst adjusts a date range filter, **Then** all KPI cards and charts recalc within 1 second using the filtered subset.
2. **Given** a bar in the revenue-by-category chart is selected, **When** drill-down is triggered, **Then** a detail panel lists the underlying mock orders for that category with pagination.

---

### User Story 4 - Preview embedded external dashboards (Priority: P4)

An integrations engineer selects an “Embedded Sources” tab to preview inline (non-redirecting) NocoDB dashboards plus the Superset placeholder, ensuring the layout hosts external BI assets inside the shell while documenting how to swap in API/webhook-driven experiences later.

**Why this priority**: Confirms the application can host external BI assets and documents integration points without requiring live services now.

**Independent Test**: Toggle to each embedding module, verify the placeholder iframe/API component renders with mock content and includes developer notes about swapping in live endpoints.

**Acceptance Scenarios**:

1. **Given** the analyst navigates to the Superset embed card, **When** the placeholder loads, **Then** it displays a mock iframe plus a caption describing how to configure the future Superset URL and SSH-tunneled credentials.
2. **Given** the analyst opens the NocoDB tile that points at a share link, **When** the embed tab becomes active, **Then** the table renders inline via iframe within the dashboard instead of redirecting to a new tab and clearly states the governing share URL.
3. **Given** the analyst switches to a NocoDB tab configured for API-driven charts, **When** the mock service responds, **Then** the card shows retry/error messaging plus notes comparing iframe embeds vs. REST/webhook integrations for future work.

---

### Edge Cases

- What happens when mock data services return zero orders? Dashboard must show “No data” states instead of breaking charts and filters.
- How does system handle embed timeouts? Embedding module should display retry messaging and log failures without blocking core dashboard use.
- How does the UI respond when a non-admin tries to access the Admin menu? It should hide the menu or display an authorization error without exposing account data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a branded green-themed UI applied consistently to login, navigation chrome, widgets, and typography tokens.
- **FR-002**: System MUST authenticate users against a mock credential store (e.g., JSON or in-memory service) and gate dashboard access behind it.
- **FR-003**: Users MUST be able to log out, clearing the mock session and returning to the login page.
- **FR-004**: Dashboard layout MUST include a persistent top navigation bar (logo, user menu, breadcrumbs) and a collapsible left sidebar listing chart/drill-down destinations.
- **FR-004a**: Top navigation bar MUST expose an Admin menu only for authorized user-admin roles and keep it hidden/disabled for standard analysts.
- **FR-004b**: Admin menu MUST provide entry points to add, edit, and deactivate user accounts via modal or dedicated views that talk to the mock account store.
- **FR-005**: Sales Order Analysis Dashboard MUST surface KPIs (total orders, revenue, average order value) plus at least two interactive charts fed by mock orders, categories, and date attributes.
- **FR-006**: Filters (date ranges, category, order status) MUST update visualizations and drill-down tables without full page reloads, using client-side state or mocked API endpoints.
- **FR-007**: Drill-down interactions MUST reveal order-level details (order id, customer, revenue, category, date) within 1 second for the selected data subset.
- **FR-008**: Embedding module MUST expose placeholders/components for Apache Superset (iframe container) and NocoDB (mock API chart) and clearly annotate how to replace placeholders with live endpoints later.
- **FR-009**: Backend layer MUST be organized to simulate a PostgreSQL-over-SSH connection (e.g., config objects, connection service stubs) even though it currently serves local mock data.
- **FR-010**: Codebase MUST remain modular with separate folders/modules for front-end shell, back-end services, data layer/mocks, and embedding adapters, matching or extending Sale-Dashboard-prototype-Embeded structure.
- **FR-011**: Updated or replaced files originating from the GitHub starter repo MUST include inline comments or README notes documenting what changed and why.
- **FR-012**: System MUST include automated or documented manual test steps for each user story so QA can validate without real external systems.
- **FR-013**: External NocoDB experiences MUST render inline within the application (iframe or API-driven component) rather than redirecting users away, and documentation MUST compare when to prefer iframe shares, REST polling, or webhooks for change notifications.

### NocoDB Integration Approach

- **Inline iframe (default)**: Use NocoDB's shared view URL directly inside the embed module. Pros: no backend work, reflects all filtering done in NocoDB, zero redirect. Cons: limited styling, requires public or tokenized shares—rotate links if leaked.
- **REST API**: Authenticate with a Personal Access Token and call `/api/v2/tables/{table}/records` (or views) from the backend, then render React components with that data. Pros: full UX control, can blend datasets, enforce RBAC. Cons: must secure tokens, handle pagination/caching, slightly higher latency.
- **Webhooks/Automations**: Configure NocoDB automations to POST into the backend when tables change. Pros: event-driven updates, good for syncing into warehouses. Cons: requires public webhook endpoint and replay handling.

Decision: For this mock, iframe embedding keeps tables visible inside the dashboard immediately, while docs highlight how/when to escalate to API or webhook-based integrations so future engineers can choose the right method.

**Environment**: Backend needs `NOCODB_BASE_URL` (hosted instance) and `NOCODB_API_TOKEN` (PAT with read access) so it can proxy REST calls without exposing secrets to the browser.

### Key Entities *(include if feature involves data)*

- **User Session**: Represents authenticated state (username, role, token expiry) used to guard dashboard routes and personalize the UI.
- **Sales Order**: Mock transactional record containing order id, date, customer segment, category, quantity, revenue, margin, and status; feeds KPIs, charts, and drill-down tables.
- **User Account**: Represents dashboard users (username, role, status, last login) that administrative users manage through the top-bar Admin menu.
- **Embedding Target**: Metadata describing external dashboard placeholders (source type, placeholder URL or mock payload, instructions for real endpoint, status) managed by the embedding module.

### Assumptions

- Mock authentication will rely on fixed credential pairs (analyst, user admin) stored in config; multi-user lifecycle beyond mock CRUD is out of scope.
- Mock sales data can be regenerated locally from JSON/CSV fixtures without persistence requirements.
- External embedding will use static placeholder URLs/data until actual Superset/NocoDB endpoints are available.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Demo users reach the dashboard shell from the login page in ≤2 steps and under 5 seconds on a laptop dev environment.
- **SC-002**: Applying any single filter on the Sales Order Analysis Dashboard refreshes KPIs/charts in ≤1 second for datasets up to 5,000 mock orders.
- **SC-003**: Drill-down panels show the correct subset of orders with 100% accuracy across at least three test filter combinations.
- **SC-004**: Admin menu operations (add, edit, deactivate) complete in ≤3 clicks each and reflect in the mock user directory instantly for ≥3 test accounts.
- **SC-005**: Embedding placeholders clearly document integration steps so that a new engineer can wire a real Superset or NocoDB target in ≤1 hour using the provided annotations.
