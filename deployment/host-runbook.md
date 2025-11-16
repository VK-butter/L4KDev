# Host Runbook (Internal Docker)

This is the step-by-step guide for the person who deploys and operates the app on an internal Linux/Windows server. No prior knowledge of the codebase is required—only standard Docker skills.

---

## 1. Before you start

Make sure you have:

1. Docker Engine 24.x or newer and the `docker compose` plugin.
2. Access to the git repository (or a tarball of the repo). The recommended install path is `/opt/l4kdev-sale-dashboard`, but any writable directory works.
3. Two config files provided by engineering (never create from scratch):
   - `deployment/.env`
   - `deployment/env/backend.env`

These files contain port mappings and secrets. Store them securely.

---

## 2. First-time installation

```bash
sudo mkdir -p /opt/l4kdev-sale-dashboard
sudo chown $USER /opt/l4kdev-sale-dashboard
cd /opt/l4kdev-sale-dashboard
git clone <repo-url> .
cd deployment
# place the provided .env + env/backend.env files here
docker compose up --build -d
```

After the command finishes:

- Run `docker compose ps` – both `backend` and `frontend` should show `running (healthy)`.
- API health check: `curl http://localhost:${API_PORT}/api/health` → expect `{"status":"ok"}`.
- UI check: open `http://<host>:$WEB_PORT` in a browser on the internal network.

What the compose stack does:
- `backend` builds the Express API, includes mock JSON data, and listens on internal port `4000` (exposed externally as `${API_PORT}` from `.env`).
- `frontend` runs an Nginx container that serves the Vite build on internal port `8080` (mapped to `${WEB_PORT}`).

---

## 3. Deploying an updated release

When engineering sends a new git tag/branch:

```bash
cd /opt/l4kdev-sale-dashboard
git fetch --all --tags
git checkout <release-tag-or-branch>
git pull --ff-only
cd deployment
docker compose up --build -d
docker image prune -f   # optional, cleans old layers
```

If engineering provides pre-built images in a registry, run `docker compose pull` before `up` so you reuse those builds.

---

## 4. Day-to-day operations

Common commands (run inside `deployment/`):

| Need | Command | Notes |
|------|---------|-------|
| See container status | `docker compose ps` | Health column must be `healthy`. |
| Tail logs | `docker compose logs -f backend frontend` | Use Ctrl+C to stop watching. |
| Restart everything | `docker compose restart backend frontend` | Safe; keeps volumes. |
| Stop the stack | `docker compose down` | Use during maintenance windows. |
| Shell inside backend | `docker compose exec backend sh` | Exit with `exit`. |
| Refresh demo data | `docker compose exec backend node dist/data/mocks/seedOrders.js` | Only needed if marketing wants new mock orders/users. |

---

## 5. Networking & security checklist

- Keep the host behind the corporate firewall. Only expose `${WEB_PORT}` and `${API_PORT}` to the internal network segments that need access.
- If your users access the UI through HTTPS, terminate TLS either with a reverse proxy in front of Docker or by placing the host behind an HTTPS load balancer.
- `env/backend.env` stores secrets (session key, DB credentials). Rotate these periodically and supply updates via secure channels only.
- Connecting to a real PostgreSQL database? Ensure outbound firewall rules allow the DB host/tunnel, and grant the DB user the minimum required permissions.

---

## 6. Optional persistence

By default, mock data lives inside the container filesystem; removing the container also removes data. To keep the JSON fixtures across restarts:

1. Edit `deployment/docker-compose.yml` → `backend` service:
   ```yaml
   volumes:
     - backend_data:/app/backend/dist/data/mocks/files
   ```
2. Add the volume definition to the end of the file:
   ```yaml
   volumes:
     backend_data:
   ```
3. Seed the volume once:
   ```bash
   docker compose run --rm backend node dist/data/mocks/seedOrders.js
   ```

---

## 7. Troubleshooting / incident recovery

1. **Collect logs**: `docker compose logs --tail=200 backend frontend`.
2. **Health check**: `curl http://localhost:${API_PORT}/api/health`.
   - If it fails, restart just the backend: `docker compose restart backend`.
3. **Rebuild** if config or env files changed: `docker compose up --build -d backend`.
4. **Roll back** to the previous tag if the new release is broken:
   ```bash
   cd /opt/l4kdev-sale-dashboard
   git checkout vX.Y.Z
   cd deployment
   docker compose up --build -d
   ```
5. Escalate to engineering with:
   - Logs from step 1.
   - Output of `docker compose ps`.
   - Exact git commit or tag (`git rev-parse HEAD`).
