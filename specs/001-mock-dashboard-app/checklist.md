# Manual Regression Checklist — Green Sales Dashboard Mock App

Run through these flows before tagging a release. All steps assume a clean `pnpm install --recursive`, `pnpm --filter backend run dev`, and `pnpm --filter frontend run dev`.

## User Story 1 – Authenticated Dashboard Shell

- [ ] Visit `/login`, sign in as `admin@example.com / Admin!123`, and confirm redirect to `/`.
- [ ] From `/`, click `Logout` and verify you return to `/login`.
- [ ] Submit invalid credentials and ensure an inline error appears without leaving `/login`.

## User Story 2 – Admin Menu & Account Management

- [ ] While logged in as the admin user, click `Admin Menu` → `Add account`, create a unique analyst, and verify it appears with `active` status.
- [ ] Edit the newly-created user’s display name and confirm the table updates immediately.
- [ ] Deactivate the user; attempt to log in with that account and confirm access is blocked. Reactivate and retest (optional).
- [ ] Log in as `analyst@example.com` and ensure the Admin menu button is not visible.

## User Story 3 – Sales Order Analytics

- [ ] With default dates, ensure KPI board, Revenue-by-category, Revenue trend, and drill-down table all render data.
- [ ] Change the date range to a 14-day window; confirm all widgets refresh within ~1 s.
- [ ] Toggle status filters (e.g., Fulfilled only) and verify KPIs/charts/drill-down reflect the new subset.
- [ ] Click a bar in the category chart to drill down; confirm the chip appears atop the drill-down table and only matching orders display. Clear the drill-down.
- [ ] Page forward/backward through drill-down results and confirm pagination updates.

## User Story 4 – External Embeds

- [ ] Scroll to the “Embedding Playground” section and confirm Superset + NocoDB tabs render.
- [ ] Select the Superset tab; ensure iframe loads and integration notes describe SSH-tunnel steps.
- [ ] Select the NocoDB tab; confirm the mock chart loads. Simulate a failure (stop backend or hit network dev tools) and verify the component surfaces an error message without crashing the page.

## Cross-Cutting

- [ ] `pnpm lint`, `pnpm test`, and `pnpm test:e2e` all succeed locally.
- [ ] `pnpm --filter backend run seed:mocks` regenerates mock orders without errors.
