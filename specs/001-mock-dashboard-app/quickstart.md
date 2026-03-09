# Quickstart — Green Sales Dashboard

## Prerequisites

- Node.js 20.x
- pnpm 9.x (`npm install -g pnpm` or use `npx pnpm`)

## 1. Install Dependencies

```bash
npx pnpm install
```

Installs deps across `frontend/`, `backend/`, and `shared/` workspaces.

## 2. Seed Mock Data

```bash
npx pnpm --filter backend run seed:mocks
```

Generates JSON fixtures for sales orders, user accounts (analyst + admin), embedding targets, and audit logs in `backend/src/data/mocks/files/`.

## 3. Configure Environment

Create `backend/.env`:

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

Create `frontend/.env` (optional):

```
VITE_API_BASE_URL=http://localhost:4000
```

## 4. Start Development Servers

```bash
# Terminal 1
npx pnpm --filter backend run dev    # http://localhost:4000

# Terminal 2
npx pnpm --filter frontend run dev   # http://localhost:5173
```

Frontend dev server proxies all `/api/*` requests to the backend.

## 5. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Analyst | `analyst@example.com` | `Analyst!123` |
| Admin | `admin@example.com` | `Admin!123` |

## 6. PostgreSQL via SSH Tunnel (Live Data)

The database is hosted remotely and requires an SSH tunnel:

```bash
ssh -N -L 5432:127.0.0.1:5432 dbtunnel@49.0.67.25
```

Keep this terminal running while using live data. Configure the `PG*` env vars in `backend/.env` and restart the backend.

Optional column mapping overrides (if auto-detection fails):

```
RAW_DATE_COLUMN=Order Date
RAW_STATUS_COLUMN=status
RAW_REVENUE_COLUMN=revenue
RAW_QUANTITY_COLUMN=quantity
RAW_MAX_PAGE_SIZE=1000
```

## 7. Testing

```bash
# Unit tests (Vitest)
npx pnpm test

# Install Playwright browsers (one-time)
npx pnpm --filter frontend exec playwright install chromium

# E2E tests
npx pnpm test:e2e
```

## 8. Embedding Configuration

Update `shared/config/embeds.ts` to add/remove embed targets (Superset iframe metadata, NocoDB view IDs, project/table slugs, and default limits).

NocoDB credentials go in `backend/.env` (`NOCODB_BASE_URL`, `NOCODB_API_TOKEN`). The backend proxy at `/api/analytics/embeds/nocodb/:id/records` handles all REST calls so the browser never sees secrets.

## 9. Manual Verification

### Auth Shell
1. Visit `http://localhost:5173/login`.
2. Sign in with `admin@example.com / Admin!123` — confirm redirect to `/`.
3. Click `Logout` — confirm redirect back to `/login`.
4. Try invalid password — confirm inline error on `/login`.

### Admin Panel
1. Log in as admin, click `Admin Menu` in the top nav.
2. Click `Add account`, fill in email + display name, save — confirm new account appears as `active`.
3. Click `Edit`, change display name — confirm list updates.
4. Click `Deactivate` — confirm status changes to `inactive`.
5. Confirm analysts do not see the `Admin Menu` button.

### Analytics
1. Log in as analyst or admin, confirm KPI board, revenue chart, trend chart, and drilldown table render.
2. Adjust date range — confirm all data refreshes within 1s.
3. Toggle status checkboxes — confirm charts and drilldown update.
4. Click a bar in the Revenue by Category chart — confirm drilldown filters to that category.
5. Use pagination in the drilldown panel — confirm rows change.

### Embeds
1. Navigate to the Embedding Playground.
2. Select NocoDB tabs — confirm inline tables load via the backend proxy.
3. Confirm errors surface inline without crashing the page.
