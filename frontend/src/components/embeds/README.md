# Embedding Module

This folder contains placeholder components for embedding external BI surfaces (Superset, NocoDB, etc.).

- `EmbedSwitcher.tsx` fetches metadata from `/api/analytics/embeds`, renders available targets as tabs, and mounts the correct child component.
- `SupersetEmbed.tsx` wraps an iframe with integration notes about how to point to the eventual SSH-tunneled Superset host.
- `NocoDbPlaceholder.tsx` fetches mock chart data from the backend placeholder endpoint and renders a simple chart, demonstrating how real API data would flow.

**Swap instructions**

1. Update `shared/config/embeds.ts` with the real endpoints/notes (Superset iframe URL, NocoDB REST endpoint, auth requirements).
2. For Superset, ensure the iframe host is reachable from the browser (usually via SSH tunnel + reverse proxy). Adjust CSP headers if required.
3. For NocoDB, replace `embedApi.nocodbPlaceholder()` with a secure API call that injects the necessary headers/tokens. Update the chart data mapping to match the real schema.
4. Add any additional embed targets to `embeddingTargets`—the front-end switcher will pick them up automatically.
