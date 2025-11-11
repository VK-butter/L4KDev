# Phase 0 Research — Green Sales Dashboard Mock App

## Decision 1: Stack alignment with Sale-Dashboard prototype
- **Decision**: Use React 18 + Vite + TypeScript on the frontend and Node 20 + Express on the backend, sharing types via a small `shared/` workspace.
- **Rationale**: Mirrors the existing GitHub prototype (React/Node), allows fast iteration with Vite dev server, and keeps server logic flexible for future PostgreSQL integration.
- **Alternatives considered**: 
  - Next.js full-stack: unnecessary SSR/ISR overhead for a mock dashboard.
  - Pure static SPA with mock JSON: would complicate future backend swap and admin CRUD requirements.

## Decision 2: Theming and UI composition
- **Decision**: Adopt TailwindCSS tokens plus CSS variables for the green theme and reuse Recharts for KPI/visual components.
- **Rationale**: Tailwind accelerates applying the mandated green palette across login/nav/sidebar; Recharts is lightweight, works well with mock data, and supports drill-down interactions.
- **Alternatives considered**:
  - Material UI: heavier overrides to reach the desired branding.
  - D3-only custom charts: higher build cost without clear benefit for a mock.

## Decision 3: Mock data + future PostgreSQL abstraction
- **Decision**: Store mock orders, users, and embedding metadata in JSON fixtures read through repository classes that imitate PostgreSQL-over-SSH services.
- **Rationale**: Satisfies FR-009 by keeping connection stubs/configs ready while allowing fast iteration without a live DB.
- **Alternatives considered**:
  - Spinning up a local Postgres container: unnecessary operational overhead.
  - Hardcoding data inside components: would block later data-source swap and admin CRUD.

## Decision 4: Admin menu + user management UX
- **Decision**: Surface an Admin dropdown in the top nav for user-admin roles only, backed by modal forms and service calls that mutate the mock user store.
- **Rationale**: Meets the new requirement without introducing extra routing complexity, keeps admin interactions scoped, and ensures analysts never see admin options.
- **Alternatives considered**:
  - Separate admin page: adds navigation complexity for a small feature set.
  - Command-line seeding only: prevents demonstration of admin workflows.

## Decision 5: External embedding placeholders
- **Decision**: Provide an iframe wrapper component for Superset and a fetch-driven card for NocoDB mock API responses, both with retry/error states and documentation banners.
- **Rationale**: Demonstrates integration points, satisfies SC-005, and ensures failure isolation per edge cases.
- **Alternatives considered**:
  - Static screenshots: insufficient to prove layout integration.
  - Full integration with live services: not possible without credentials/tunnels.
