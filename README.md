# Green Sales Dashboard

Modular React + Node monorepo with a green-themed UI, authenticated shell, admin tooling, analytics workspace, and external embedding playground. All data and integrations are mocked locally so the experience can be demoed offline while preserving a clean hand-off path to Superset/NocoDB + PostgreSQL over SSH.

## Architecture

```
. (pnpm workspace)
├── backend/               # Node 20 + Express 4 API (port 4000)
│   ├── src/api/           # auth, admin, analytics, embed, integrations routes
│   ├── src/services/      # auth, admin CRUD, analytics queries, embed registry, NocoDB client
│   ├── src/data/mocks/    # JSON fixtures + seed script (5k+ orders)
│   ├── src/db/            # PostgreSQL connection pool (pg)
│   ├── src/middleware/    # session middleware + requireAuth/requireRole guards
│   └── tsconfig.json
├── frontend/              # React 18 + Vite + TailwindCSS + Recharts (port 5173)
│   ├── src/components/    # layout, analytics widgets, admin panel, embeds
│   ├── src/hooks/         # session context + URL-based filter state (useSearchParams)
│   ├── src/pages/         # Dashboard, Login, Sales, SKU, Integrations, NocoDB pages
│   ├── src/services/      # Axios API client (apiClient, analyticsApi, skuApi, etc.)
│   └── tests/e2e/         # Playwright journeys (auth/admin/analytics/embeds)
├── shared/                # Shared TypeScript types + embed metadata config
└── specs/001-mock-dashboard-app/
    ├── spec.md            # Feature specification
    ├── plan.md / tasks.md # Planning + task tracker
    ├── data-model.md      # Data model reference
    ├── quickstart.md      # Step-by-step setup guide
    └── checklist.md       # Manual regression guide
```

Key technologies: TypeScript 5.x, React 18, Vite, TailwindCSS, Recharts, Axios, Express, express-session, Zod, Playwright, Vitest, PNPM workspaces.

## Getting Started

```bash
# Install deps for all workspaces
npx pnpm install

# Generate/update mock datasets (orders, users, embeds, audit log)
npx pnpm --filter ./backend run seed:mocks

# Start dev servers (two terminals)
npx pnpm --filter ./backend run dev    # http://localhost:4000
npx pnpm --filter ./frontend run dev   # http://localhost:5173

# Demo credentials
#   Analyst: analyst@example.com / Analyst!123
#   Admin:   admin@example.com   / Admin!123
```

See `specs/001-mock-dashboard-app/quickstart.md` for full setup details. Copy `backend/.env.example` and configure:

```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=sales_warehouse
PGUSER=<db-user>
PGPASSWORD=<db-pass>
NOCODB_BASE_URL=https://db.learningforkidz.com
NOCODB_API_TOKEN=<token>
```

## Workspace Commands

| Command | Description |
|---------|-------------|
| `npx pnpm dev` | Run `dev` in all workspaces (use individual filters in practice). |
| `npx pnpm build` | Build all packages (shared → backend + frontend). |
| `npx pnpm lint` | ESLint across all workspaces. |
| `npx pnpm test` | Unit tests via Vitest (backend + frontend). |
| `npx pnpm test:e2e` | Playwright e2e journeys (auth, admin, analytics, embeds). |
| `npx pnpm --filter ./backend run seed:mocks` | Regenerate mock sales/orders data. |

## Frontend Pages

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public |
| `/` | Dashboard Home | Protected |
| `/dashboards/sales` | Sales Order Analysis | Protected |
| `/dashboards/product-sku` | Product SKU Dashboard | Protected |
| `/integrations` | Integrations Config | Protected |
| `/nocodb` | NocoDB Master Page | Protected |

## API Endpoints

### Auth
- `POST /api/auth/login` — login with username/password
- `POST /api/auth/logout` — end session
- `GET /api/auth/session` — get current session

### Admin (admin role required)
- `GET /api/admin/users` — list users
- `POST /api/admin/users` — create user
- `PATCH /api/admin/users/:id` — update user
- `POST /api/admin/users/:id/deactivate` — deactivate user
- `POST /api/admin/users/:id/reactivate` — reactivate user
- `GET /api/admin/audit` — audit log

### Analytics
- `GET /api/analytics/orders/summary` — KPI totals
- `GET /api/analytics/orders/by-category` — revenue by category
- `GET /api/analytics/orders/timeseries` — daily trend data
- `GET /api/analytics/orders/drilldown` — paginated order details
- `GET /api/analytics/orders/raw` — raw PostgreSQL table rows
- `GET /api/analytics/orders/raw/summary` — count, revenue, quantity totals
- `GET /api/analytics/orders/raw/status` — status breakdown
- `GET /api/analytics/sku/raw` — SKU table data (current/previous)
- `GET /api/analytics/sku/monthly-comparison` — year-over-year SKU comparison

### Integrations
- `GET /api/integrations/status` — DB connection + table info
- `GET/POST /api/integrations/config` — Superset/NocoDB settings

## Database

**PostgreSQL** (`sales_warehouse`) accessed via SSH tunnel.

Schema `l4k_model` tables:
- `joinsales_orderline` — primary sales order line data
- `"SKU_dataCurrent"` — current year product SKU data
- `"SKU_dataPrevious"` — previous year SKU data (YoY comparison)

Column mapping is auto-detected at runtime and can be overridden via env vars:
```
RAW_DATE_COLUMN=Order Date
RAW_STATUS_COLUMN=...
RAW_REVENUE_COLUMN=...
RAW_QUANTITY_COLUMN=...
```

### SSH Tunnel

```bash
ssh -N -L 5432:127.0.0.1:5432 dbtunnel@49.0.67.25
```

Keep this terminal running while developing with live data. The tunnel forwards PostgreSQL to `127.0.0.1:5432` locally.

## Testing & QA

```bash
# Unit tests (Vitest)
npx pnpm test

# Install Playwright browsers (one-time)
npx pnpm --filter frontend exec playwright install chromium

# E2E tests
npx pnpm test:e2e
```

E2E test journeys cover: authentication, admin user management, analytics filters/charts, and embed panels.

Manual regression steps are tracked in `specs/001-mock-dashboard-app/checklist.md`.

## Integrations

- **NocoDB** — table data via API proxy at `/api/analytics/embeds/nocodb/:id/records`. Configure `NOCODB_BASE_URL` and `NOCODB_API_TOKEN` in `backend/.env`.
- **Superset** — dashboard iframes. Configure via `/integrations` page (stored in-memory).
- **PostgreSQL** — raw data preview via SSH tunnel (see above).

### Custom Integration Icons

Place icon files in `frontend/public/custom-icons/`:
- `pg.webp` — PostgreSQL icon
- `nocodb.png` — NocoDB icon

If missing, the UI falls back to text badges.

## Notes

- The embed module fails gracefully — Superset iframes and NocoDB placeholder charts surface integration notes and retry messaging so engineers can swap real endpoints easily.
- Mock data falls back automatically when PostgreSQL is unavailable.
- Build artifacts (`backend/dist/`, `frontend/dist/`, `shared/dist/`) are excluded from version control via `.gitignore`.
