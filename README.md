# Green Sales Dashboard Mock App

Modular React + Node monorepo that re-imagines the Sale-Dashboard-prototype-Embeded repo with a green-themed UI, authenticated shell, admin tooling, analytics workspace, and external embedding playground. All data and integrations are mocked locally so the experience can be demoed offline while preserving a clean hand-off path to Superset/NocoDB + PostgreSQL over SSH.

## Architecture

```
. (pnpm workspace)
├── backend/               # Node 20 + Express API
│   ├── src/api/           # auth, admin, analytics, embed routes
│   ├── src/services/      # auth, admin CRUD, analytics queries, embed registry
│   ├── src/data/mocks/    # JSON fixtures + seed script (5k+ orders)
│   └── tsconfig.json
├── frontend/              # React 18 + Vite + Tailwind + Recharts
│   ├── src/components/    # layout, analytics widgets, embeds
│   ├── src/hooks/         # session + analytics filter state
│   ├── src/pages/         # Dashboard shell + login
│   └── tests/e2e/         # Playwright journeys (auth/admin/analytics/embeds)
├── shared/                # Shared TypeScript types + embed metadata config
└── specs/001-mock-dashboard-app/
    ├── spec.md            # Feature specification
    ├── plan.md / tasks.md # Planning + task tracker
    ├── research.md
    ├── data-model.md / quickstart.md
    └── checklist.md       # Manual regression guide
```

Key technologies: TypeScript 5.x, React 18, Vite, TailwindCSS, Recharts, Zustand (state), Axios, Express, express-session, Zod, Playwright, Vitest, PNPM workspaces.

## Getting Started

```bash
# Install deps for all workspaces
pnpm install --recursive

# Generate/update mock datasets (orders, users, embeds, audit log)
pnpm --filter backend run seed:mocks

# Start dev servers (two terminals)
pnpm --filter backend run dev    # http://localhost:4000
pnpm --filter frontend run dev   # http://localhost:5173

# Demo credentials
#   Analyst: analyst@example.com / Analyst!123
#   Admin:   admin@example.com   / Admin!123
```

Environment defaults are documented in `specs/001-mock-dashboard-app/quickstart.md`. Copy `.env.example` files (if present) or set:

```
backend/.env:  PORT=4000, SESSION_SECRET=replace-me, FRONTEND_ORIGIN=http://localhost:5173
frontend/.env: VITE_API_BASE_URL=http://localhost:4000, FRONTEND_PORT=5173
```

## Workspace Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run `dev` in each workspace (use individual filters in practice). |
| `pnpm lint` | ESLint (backend + frontend). |
| `pnpm test` | Unit tests (Vitest). |
| `pnpm test:e2e` | Playwright journeys (auth, admin, analytics, embeds). |
| `pnpm --filter backend run seed:mocks` | Regenerate mock sales/orders data. |

## Testing & QA

- Automated coverage lives under `frontend/tests/e2e/*.spec.ts` and can be executed via `pnpm test:e2e` (ensure `pnpm --filter sale-dashboard-frontend exec playwright install` ran once).
- Manual regression steps per user story (auth shell, admin menu, analytics filters, embeddings) are tracked in `specs/001-mock-dashboard-app/checklist.md` and summarized in `quickstart.md`.
- Task/plan/spec artifacts for `/speckit.*` workflows live in `specs/001-mock-dashboard-app/`.

## Notes

- All modifications to the upstream Sale-Dashboard prototype are documented inline (see comments/READMEs inside `frontend/src/components/` and `backend/src/services/`).
- The embed module intentionally fails gracefully—Superset iframes and NocoDB placeholder charts surface integration notes plus retry messaging so engineers can swap real endpoints quickly.
