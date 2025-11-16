# Deployment Toolkit

This folder contains everything needed to ship the Sale Dashboard mock app to an internal Docker host.

## Contents

| File/Folder | Description |
|-------------|-------------|
| `docker-compose.yml` | Orchestrates the backend (Express) and frontend (React build served by Nginx). |
| `.env.example` | Template for compose-level variables such as exposed ports and API URL used at build time. |
| `env/backend.env.example` | Template for backend runtime environment (session secret, DB credentials, etc.). |
| `nginx/frontend.conf` | SPA-ready Nginx config used inside the frontend image. |
| `../backend/Dockerfile` | Builds the backend service using pnpm workspaces. |
| `../frontend/Dockerfile` | Builds the frontend bundle and serves it over Nginx. |
| `checklist.md` | Engineer-facing deployment checklist (pre-flight, build, smoke tests). |
| `host-runbook.md` | Operator guide for running/upgrading containers on the target host. |

## Quick Start

```bash
cd deployment
cp .env.example .env
cp env/backend.env.example env/backend.env
# Edit .env and env/backend.env with real values
docker compose up --build -d
```

After the stack becomes healthy:

1. Hit `http://<host>:8080` for the UI (or the port set in `.env`).
2. Validate API health via `curl http://<host>:4000/api/health`.
3. Follow `smoke tests` listed in `checklist.md`.

For production-like hardening (secrets rotation, HTTPS termination, data persistence, monitoring), see `host-runbook.md`.
