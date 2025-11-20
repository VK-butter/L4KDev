---

description: "Implementation plan for exposing live NocoDB embeds inside the dashboard shell"
---

# Tasks: NOCODB MASTER EMBEDS

**Input**: Product brief (user request), existing mock dashboard implementation under `/specs/001-mock-dashboard-app/`
**Prerequisites**: No schema changes required. Ensure local `.env` still points frontend proxy to backend dev server.

**Tests**: Manual verification on the dashboard home is sufficient (tabs render, iframe loads). Automated tests not requested.

## Phase 1: User Story 1 – Embed NocoDB tables inside dashboard (Priority: P1)

**Goal**: Replace placeholder Superset/NocoDB targets with the four real LearningForKidz NocoDB dashboards so analysts can switch between them without leaving the app.

**Independent Test**: Log in, scroll to “Embedding Playground”, toggle through each tab, and confirm the iframe loads the correct NocoDB dashboard URL without console errors.

- [ ] T001 [US1] Update embed configuration `shared/config/embeds.ts` (+compiled JS mirrors) to define four iframe targets that map to the provided NocoDB URLs and descriptions.
- [ ] T002 [US1] Rename `frontend/src/components/embeds/SupersetEmbed.tsx` to a reusable `IframeEmbed` component with generic integration notes and conditional helper text.
- [ ] T003 [US1] Point `frontend/src/components/embeds/EmbedSwitcher.tsx` at `IframeEmbed`, ensuring iframe targets render while `NocoDbPlaceholder` remains available for future API-driven charts.
- [ ] T004 [US1] Smoke test dashboard home to verify tabs show the expected Thai/English labels plus live content (no caching or CSP errors).

## Phase 2: User Story 2 – Surface NOCODB MASTER links in sidebar (Priority: P1)

**Goal**: Update the left sidebar so analysts can quickly jump to each hosted table in a new tab, matching the in-app tab names.

**Independent Test**: From the authenticated shell, confirm the “NOCODB MASTER” section replaces “Embeds”, shows four links, and each opens the correct dashboard URL in a separate browser tab.

- [ ] T005 [US2] Refactor `frontend/src/components/layout/Sidebar.tsx` nav data so groups accept metadata (`to`, `href`), rename the group to “NOCODB MASTER”, and add the four external links.
- [ ] T006 [US2] Style external links with the same affordances as existing nav items plus `target="_blank"` + `rel="noreferrer"` and readable aria labels.
- [ ] T007 [US2] Manual check: click every sidebar link to ensure Windows/macOS browsers launch a new tab pointing at the LearningForKidz dashboard.

## Phase 3: Polish & Documentation

- [ ] T008 [P] Update onboarding notes (if needed) to clarify that embed URLs come from the maintained NocoDB workspace and can be rotated without code changes.
- [ ] T009 [P] Capture any issues or follow-ups (e.g., CSP restrictions, need for auth tokens) in `/specs/001-mock-dashboard-app/plan.md` or a new tracking note.
