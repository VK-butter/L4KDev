# Quickstart — Green Sales Dashboard Mock App

1. **Install prerequisites**
   - Node.js 20.x
   - PNPM 9.x (preferred) or npm 10

2. **Bootstrap workspaces**
   ```bash
   pnpm install --recursive
   ```
   This installs deps in `frontend/`, `backend/`, and `shared/`.

3. **Seed mock data**
   ```bash
   pnpm --filter backend run seed:mocks
   ```
   Generates JSON fixtures for sales orders, user accounts (analyst + admin), embedding targets, and audit logs.

4. **Start development servers**
   ```bash
   pnpm --filter backend run dev   # exposes http://localhost:4000
   pnpm --filter frontend run dev  # exposes http://localhost:5173
   ```
   Frontend dev server proxies `/api/*` to the backend.

5. **PostgreSQL via SSH tunnel (optional live data)**
   1. Open a tunnel:
      ```
      ssh -N -L 5432:127.0.0.1:5432 <user>@<host>
      ```
   2. Create `backend/.env`:
      ```
      PGHOST=127.0.0.1
      PGPORT=5432
      PGDATABASE=sales_warehouse
      PGUSER=<db-user>
      PGPASSWORD=<db-pass>
      RAW_DATE_COLUMN=Order Date
      # optional if auto-detect fails
      # RAW_STATUS_COLUMN=...
      # RAW_REVENUE_COLUMN=...
      # RAW_QUANTITY_COLUMN=...
      ```
   3. Restart backend.

6. **Sales page**
   - Navigate to `/dashboards/sales` from the sidebar (“Sale order line”).
   - Use calendar pickers (Daily = yesterday→today; YTD = Jan 1→today; All = clear).
   - Export all filtered rows (CSV) from the table header.
   - Status donut (Saled vs Cancel): click labels to filter the table.

5. **Demo credentials**
   - Analyst: `analyst@example.com / Analyst!123`
   - User Admin: `admin@example.com / Admin!123`

7. **Testing**
   ```bash
   pnpm test                     # runs workspace unit tests (Vitest)
   pnpm --filter frontend exec playwright install chromium   # one-time browser install
   pnpm test:e2e                 # executes Playwright flows (auth, admin, analytics, embeds)
   ```

8. **Embedding configuration**
   - Update `shared/config/embeds.ts` to point Superset iframe to the eventual SSH-tunneled URL.
   - Update `backend/src/services/embeds/nocodb.ts` with the real API base when available.

9. **Environment variables**
   - Create `backend/.env` with:
     ```
     PORT=4000
     SESSION_SECRET=replace-me
     FRONTEND_ORIGIN=http://localhost:5173
     ```
   - Create `frontend/.env` with:
     ```
     VITE_API_BASE_URL=http://localhost:4000
     FRONTEND_PORT=5173
   ```
   - Restart dev servers after editing env files to ensure session + proxy configs reload.

9. **Manual verification – User Story 1**
   1. Start backend (`pnpm --filter backend run dev`) and frontend (`pnpm --filter frontend run dev`).
   2. Visit `http://localhost:5173/login`.
   3. Sign in with `admin@example.com / Admin!123` and confirm redirect to `/` shows the dashboard shell, nav, and sidebar.
   4. Click the `Logout` button in the top-right corner and ensure you return to `/login`.
   5. Attempt to log in with an invalid password and confirm an inline error appears while the route stays on `/login`.

10. **Manual verification – User Story 2**
    1. Log in as the admin account and click the `Admin Menu` button in the top navigation.
    2. In the side panel, click `Add account`, enter a unique email + display name, and save—confirm the new account appears in the list with `active` status.
    3. Click `Edit` for the new account, change the display name, and verify the list updates.
    4. Click `Deactivate` for the same account and confirm its status pill switches to `inactive`.
    5. Close the admin panel and confirm analysts do not see the `Admin Menu` button.

11. **Manual verification – User Story 3**
    1. Log in as either analyst or admin and confirm the KPI board, revenue-by-category chart, trend chart, and drill-down table render with data (use default date range).
    2. Adjust the date range inputs (e.g., limit to the last 14 days) and observe KPIs, charts, and drill-down results update within 1s.
    3. Toggle the status checkboxes (e.g., enable only `Fulfilled`) and verify charts refresh and drill-down records reflect only the selected status.
    4. Click a bar in the Revenue by Category chart to drill into that category; ensure the drill-down panel shows the category chip and only orders from that category, then clear the drill-down.
    5. Use the pagination controls in the drill-down panel to move between pages and confirm results change accordingly.

12. **Manual verification – User Story 4**
    1. Scroll to “Embedding Playground” on the dashboard and confirm the Superset and NocoDB tabs appear.
    2. Select the Superset tab and ensure the iframe renders plus the integration note describing SSH-tunnel configuration.
    3. Select the NocoDB tab and confirm the mock chart loads; if you disable the backend endpoint, verify the UI surfaces an error message without breaking the page.
    4. Review `frontend/src/components/embeds/README.md` and confirm it explains how to replace placeholders with real endpoints.
