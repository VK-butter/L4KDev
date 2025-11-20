# Embedding Module

This folder contains placeholder components for embedding external BI surfaces (Superset, NocoDB, etc.).

- `EmbedSwitcher.tsx` fetches metadata from `/api/analytics/embeds`, renders available targets as tabs, and mounts the correct child component.
- `IframeEmbed.tsx` wraps an iframe with integration notes about how to point to a live external dashboard (Superset, NocoDB, etc.).
- `NocoDbTableEmbed.tsx` talks to the backend proxy, which in turn calls the NocoDB REST API with a PAT, and renders the returned records inside a scrollable table.

**Swap instructions**

1. Update `shared/config/embeds.ts` with the real endpoints/notes (iframe URL or API endpoint plus auth requirements).
2. For iframe-based embeds (Superset, NocoDB dashboards, etc.), ensure the host is reachable from the browser (SSH tunnel or reverse proxy) and CSP headers allow framing.
3. For API-driven embeds, ensure the backend proxy holds the credentials (e.g., `NOCODB_API_TOKEN`) and expose a lightweight endpoint like `/api/analytics/embeds/nocodb/:id/records` so the front end never touches secrets.
4. Add any additional embed targets to `embeddingTargets`—the front-end switcher will pick them up automatically.
