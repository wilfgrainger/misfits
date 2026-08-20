# White-Label Leagues v3 Implementation Plan

> **Status:** Implemented, deployed and post-release hardened. The only open acceptance item is a real signed-in Google browser run, which requires an available authenticated browser session.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Convert the Misfits-specific multi-league app into a white-label league platform with league owners, a configured master administrator and public/private sharing.

**Architecture:** Preserve the single Cloudflare Worker, Hono API, React SPA and D1 database. Add one additive migration, carry master-admin state through sessions, centralize league ownership checks, filter private public reads at the route boundary, and reuse the existing league-control workspace for all authenticated users.

**Tech Stack:** TypeScript, React 19, Vite, Hono, Cloudflare D1, Wrangler, Vitest, Testing Library, Google Identity Services.

**Spec:** `docs/superpowers/specs/2026-08-20-white-label-leagues-v3-design.md`

## Global constraints

- Google remains the only login method.
- `leagues.created_by` remains the owner field; do not add a redundant ownership table.
- Only `is_master_admin` grants cross-league/global people control.
- Every state-changing request keeps same-origin protection.
- Public endpoints never disclose private leagues to anonymous callers.
- Do not stage `.codex-remote-attachments/`, `.playwright-cli/`, logs or generated output.

## Tasks

### Task 1: Lock schema, identity and ownership contracts

**Files:** `migrations/0003_white_label_access.sql`, `src/server/env.ts`, `src/server/db/users.ts`, `src/server/auth/session.ts`, `src/server/auth/guards.ts`, `src/server/routes/auth.ts`, `tests/server/schema.test.ts`, `tests/server/auth-routes.test.ts`

- [x] Add failing migration and auth assertions for `is_master_admin`, `visibility`, master-email promotion and ordinary-user isolation.
- [x] Run the focused tests and confirm they fail for the missing fields/behavior.
- [x] Add the migration and propagate `isMasterAdmin` through public user payloads and sessions.
- [x] Grant master status only to the configured verified email, preserving first-admin bootstrap compatibility.
- [x] Add a master-admin guard and a league-manager authorization helper.
- [x] Run focused tests and commit the identity/schema slice.

### Task 2: Add league ownership and public/private enforcement

**Files:** `src/server/domain/league.ts`, `src/server/db/leagues.ts`, `src/server/db/invites.ts`, `src/server/db/results.ts`, `src/server/routes/leagues.ts`, `src/server/routes/results.ts`, `src/server/routes/admin-leagues.ts`, `src/server/routes/admin.ts`, tests under `tests/server`

- [x] Add failing route tests for player-created leagues, owner-only edits/invites/members/results, master access, private filtering and authorized private reads.
- [x] Run the focused tests and confirm the existing global-admin-only/public-leak behavior fails them.
- [x] Add visibility validation/serialization, owned-league listing, automatic owner membership and private-read checks.
- [x] Replace global `requireAdmin` on league operations with active-session plus ownership/master checks.
- [x] Restrict people/role routes to master administrators and protect result-id operations by resolving their league.
- [x] Run server tests, typecheck and build; commit the API slice.

### Task 3: White-label the application workspace

**Files:** `src/client/api.ts`, `src/client/App.tsx`, `src/client/components/AdminLeagueDesk.tsx`, `src/client/styles.css`, `index.html`, `public/manifest.webmanifest`, client tests, `README.md`

- [x] Add failing client assertions for generic shell copy, ordinary-user league control and visibility controls.
- [x] Run the focused client tests and confirm they fail.
- [x] Render the league-control workspace for every signed-in user; load People only for the master admin.
- [x] Add Public/Private fields to create/edit forms and typed API responses.
- [x] Remove Misfits-specific shell metadata and copy while retaining Misfits as a valid league fixture.
- [x] Add stable public league deep links and a native-share/clipboard fallback.
- [x] Run client tests, typecheck, build and mobile render checks; commit the client slice.

### Task 4: Reconcile docs, migrate, deploy and verify

**Files:** `README.md`, v3 evidence file, current docs links, production D1/Worker

- [x] Update README and v2 status references so the white-label v3 design is the current authority.
- [x] Run local migration and the full test/typecheck/build/diff gate.
- [x] Apply the migration remotely, explicitly mark `wjgrainger@gmail.com` as master in the existing production account, and deploy.
- [x] Verify anonymous public filtering, authenticated guards and the custom domain live.
- [ ] Recheck the real Google browser path when a signed-in browser session is available; record the proof boundary honestly.
- [x] Commit evidence, push, refetch remote refs and record exact release SHA/version.

### Task 5: Post-release correctness hardening

**Files:** `src/server/domain/result.ts`, `src/server/routes/results.ts`, `src/client/components/PlayerLeague.tsx`, focused domain/route/client tests

- [x] Add failing coverage for decisive target-leg scores and reject draw scores such as `3-3`.
- [x] Make public standings and result endpoints resolve both league IDs and stable league slugs.
- [x] Reset opponent, leg and average entry state when a player switches leagues.
- [x] Make player result entry visibly unavailable while a league is closed.
- [x] Count legacy matches stored in either player order toward the repeat limit.
- [x] Run the focused tests, full gate and production deployment checks.

## Verification gate

```text
npm test
npm run typecheck
npm run build
git diff --check
npm run db:migrate:local
```

Live claims must name the observed URL, response and deployment version separately from source/test evidence.
