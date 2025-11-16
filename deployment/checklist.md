# Deployment Checklist

Follow these steps whenever you push a new version to the internal Docker host. Each section is short and sequential so you always know what to do next.

---

## 1. Pre-flight (local workspace)

Goal: make sure the code you are about to deploy is healthy.

- [ ] Update to the latest code and confirm no uncommitted files:
  ```bash
  git pull --rebase
  git status
  ```
- [ ] Install dependencies so all workspaces are in sync: `pnpm install`.
- [ ] Run the quality gate:
  - `pnpm lint` – TypeScript + ESLint across frontend/backend.
  - `pnpm test` – Vitest unit tests.
  - `pnpm test:e2e` – Playwright journeys (run at least before major releases).
- [ ] Refresh demo fixtures if marketing/demo data changed:
  ```bash
  pnpm --filter ./backend run seed:mocks
  ```
- [ ] If you introduced new environment variables, update:
  - `backend/.env.example` (for developers)
  - `deployment/env/backend.env.example` (for operators)

---

## 2. Prepare deployment configs

Goal: create the exact `.env` files that Docker Compose will read.

1. Compose-level variables (ports + frontend build-time API URL):
   ```bash
   cd deployment
   cp .env.example .env
   ```
   Fill in:
   - `WEB_PORT` – external port for the React app (default `8080`).
   - `API_PORT` – external port for the API (default `4000`).
   - `VITE_API_BASE_URL` – URL baked into the frontend bundle (usually `http://backend:4000` when both services run on the same Docker network).

2. Backend runtime secrets:
   ```bash
   cp env/backend.env.example env/backend.env
   ```
   Edit the new file and provide:
   - `SESSION_SECRET` – long random string; rotate per release if possible.
   - `FRONTEND_ORIGIN` – browser origin of the SPA (e.g., `http://dashboard.internal:8080`).
   - Database settings (`PG*`) if hitting a real Postgres instance.

3. If you expect extra infrastructure (e.g., Postgres, Redis), extend `deployment/docker-compose.yml` before continuing.

---

## 3. Local Docker rehearsal (strongly recommended)

Goal: prove the compose stack builds and runs before involving the production host.

```bash
cd deployment
docker compose up --build
```

- Wait until logs show `API server ready...` and the health check passes.
- Visit `http://localhost:<WEB_PORT>` (default `8080`) to verify the UI.
- Run the smoke tests listed in section 5.
- Shut everything down: `Ctrl+C` then `docker compose down`.

---

## 4. Hand-off to the hosting team

- [ ] Tag the release so the host knows exactly what commit to deploy:
  ```bash
  git tag v0.x.y
  git push origin v0.x.y
  ```
- [ ] Send the filled-in `.env` and `env/backend.env` files through your secure channel (never check them into git).
- [ ] Share the `deployment/host-runbook.md` link plus any special notes (e.g., maintenance window, DB tunnel requirements).

---

## 5. Smoke tests (run after the host deploys)

Goal: ensure the build works end-to-end. Run these in order:

1. `curl http(s)://<host>:<API_PORT>/api/health` → expect `{"status":"ok"}`.
2. Log in as Analyst (`analyst@example.com / Analyst!123`) and confirm the dashboard renders metrics + charts.
3. Log in as Admin (`admin@example.com / Admin!123`) and open **Admin → User Management** (list loads, CRUD mock buttons respond).
4. Open **Embeds** tab and toggle between Superset/NocoDB tiles (no console errors).
5. Refresh the page to confirm the session cookie survives and the user stays logged in.

Record any failures and stop the rollout if a critical step fails.

---

## 6. Post-deploy wrap-up

- [ ] Watch logs for at least 5 minutes:
  ```bash
  docker compose logs -f backend frontend
  ```
- [ ] Update your deployment log (date, git tag, who deployed, summary of smoke results).
- [ ] Create follow-up tickets for any issues uncovered during smoke testing or operator feedback.
