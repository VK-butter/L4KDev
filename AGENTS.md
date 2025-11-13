# L4KDev Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-13

## Active Technologies

- TypeScript 5.x (React 18 frontend) + Node.js 20 (Express backend) + React 18, Vite, React Router, TailwindCSS (theming), Recharts (data viz), Axios, Node/Express, express-session, Zod for validation (001-mock-dashboard-app)

## Project Structure

```text
frontend/   # React 18 + Vite + Tailwind + Recharts
backend/    # Node 20 + Express + session + Zod + pg scaffold
shared/     # Shared types/config
specs/      # SpecKit feature docs (spec/plan/tasks/checklist/contracts)
```

## Commands

- `pnpm dev` — run all workspaces in dev
- `pnpm lint` — lint all workspaces
- `pnpm test` — unit tests across workspaces
- `pnpm test:e2e` — Playwright E2E (frontend)

## Code Style

TypeScript 5.x (React 18 frontend) + Node.js 20 (Express backend): Follow standard conventions

## Recent Changes

- 001-mock-dashboard-app: Frontend (React 18/Vite/Tailwind/Recharts) and Backend (Express/Session/Zod/pg scaffold) implemented with shared types; Auth shell, Admin user management, Sales analytics dashboard, and Embeds playground delivered; lint/unit/E2E passing; SpecKit docs (spec/plan/tasks) updated.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
