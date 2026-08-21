# Misfits 501 — Story-by-Story Delivery Audit

**Started:** 21 August 2026
**Branch:** `feat/story-by-story-audit-fix`
**Base:** `main` at `f4b5eaaba9a43db1aed7e39f54f26d9c38084af6`
**Authority:** `docs/superpowers/specs/2026-08-21-user-stories.md`
**Method:** Superpowers executing-plans + TDD + verification-before-completion.

## Purpose

Re-audit every canonical user story in ID order against merged source code and focused automated evidence. A story is only `VERIFIED` when its complete acceptance criteria are supported by implementation and focused tests. A catalogue label of `DELIVERED` is not accepted as evidence by itself.

When a story fails or has weak evidence:

1. record the gap here;
2. add or strengthen a focused failing test first;
3. implement the smallest fix;
4. obtain GREEN CI evidence;
5. only then mark the story VERIFIED and align the master catalogue.

## Verification states

- `NOT REVIEWED` — not yet inspected in this audit.
- `VERIFIED` — implementation + focused automated evidence satisfy the full story.
- `PARTIAL` — some behaviour exists but acceptance criteria are incomplete.
- `MISSING` — required behaviour is not implemented.
- `GATED` — explicit product decision is still required.
- `BLOCKED` — verification cannot proceed due to an external dependency.

## Baseline inherited from merged PR #10

- Merge commit: `f4b5eaaba9a43db1aed7e39f54f26d9c38084af6`.
- PR verification run `32516031892`: Wrangler types, TypeScript, 171/171 tests across 37 files, and Vite production build passed.
- That run was a pull-request run; `Deploy Worker` was skipped.
- `migrations/0004_seasons_fixtures_promotion.sql` exists in `main`; remote production application is not assumed by this audit without evidence.
- `PROGRESS.md` on `main` is stale: it still references draft PR #9 and obsolete resume instructions after PR #10 merged.
- The planned `tests/release/user-story-ledger.test.ts` is absent, so the existing 150-story delivery labels are not a release gate.

## Chunk 1 — governance and season lifecycle

Full verification gate: run `32523186190` passed Wrangler types, TypeScript, the complete Vitest suite and the production build.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-001 | VERIFIED | `src/server/auth/google.ts`, `src/server/routes/auth.ts`, Worker-side auth guards, existing Google/auth route tests, plus `tests/release/story-adm-001.test.ts` proving invalid Google identity fails closed before D1 access. | GREEN run `32520314235`. |
| ADM-002 | VERIFIED | Opaque random session token, SHA-256 hash persistence, HttpOnly/Secure/SameSite cookie, expiry/revocation, and ACTIVE-user enforcement in `src/server/auth/session.ts`; existing `session.test.ts` plus `story-admin-governance.test.ts`. | GREEN run `32521180737`. |
| ADM-003 | VERIFIED | Admin/player mode switch is client-only view state while Worker authorization remains server-side; `app-league-create.test.tsx` proves Season Admin ↔ Club table switching preserves independent player/admin selection without new login. | GREEN run `32521180737`. |
| ADM-004 | VERIFIED | `GET /api/admin/players` is protected by `requireUser` + `requireAdmin`; `admin-routes.test.ts` proves player denial and admin directory access. Public routes do not expose email. | GREEN run `32521180737`. |
| ADM-005 | VERIFIED | Authorised PLAYER→ADMIN mutation via `updateAdminPlayer`, audited server-side; focused existing admin-route promotion test. | GREEN run `32521180737`. |
| ADM-006 | VERIFIED | Authorised non-protected ADMIN→PLAYER mutation with active-admin recovery invariant; `story-admin-governance.test.ts` directly exercises demotion and audit. | GREEN run `32521180737`. |
| ADM-007 | VERIFIED | Suspension is a status mutation, not deletion; suspended sessions fail resolution and sentinel competition history survives in focused governance test. | GREEN run `32521180737`. |
| ADM-008 | VERIFIED | Reactivation reuses the same account record and preserves sentinel membership/result history in focused governance test. | GREEN run `32521180737`. |
| ADM-009 | VERIFIED | Audit found a real UI/API gap: the directory omitted `isMasterAdmin`, so destructive controls were offered even though the DB correctly rejected them. RED run `32520800451` isolated the two failures. Directory payload and UI now expose/label the protected master and remove destructive controls. | GREEN run `32521180737`; `story-adm-009-server.test.ts` + `admin-access-protection.test.tsx`. |
| ADM-010 | VERIFIED | Season creation generates a fresh stable ID and starts as DRAFT; it does not copy fixtures/results and leaves prior seasons untouched. Direct creation as OPEN is now rejected so preparation cannot be bypassed. | `competition-routes.test.ts`; GREEN run `32523186190`. |
| ADM-011 | VERIFIED | Season name/current metadata persists through the stable season ID; invalid input is rejected by `validateSeasonInput`; league/history references remain attached by ID. | `competition-routes.test.ts`; GREEN run `32523186190`. |
| ADM-012 | VERIFIED | DRAFT/OPEN/CLOSED is persisted and backend-enforced. League status follows lifecycle transitions; player result submission paths reject closed leagues. | `season-lifecycle.ts`, `results.ts`, `fixture-results.ts`; GREEN run `32523186190`. |
| ADM-013 | VERIFIED | Audit found a real opening defect: an unprepared DRAFT season returned 200 and its leagues remained CLOSED. RED run `32521461832` isolated this. Opening now requires at least one league and at least two active players in every league, then opens prepared leagues. | `season-lifecycle.ts` + `competition-routes.test.ts`; GREEN run `32523186190`. |
| ADM-014 | VERIFIED | Closing marks season and leagues CLOSED. Both free-form and fixture-first normal player submissions check league OPEN status and are blocked; admin result correction/entry paths remain available. | `results.ts`, `fixture-results.ts`, lifecycle regression test; GREEN run `32523186190`. |
| ADM-015 | VERIFIED | Close operations update status/timestamps only; no leagues, memberships, fixtures or results are deleted, and closed records remain queryable. | `competition.ts` + lifecycle regression test; GREEN run `32523186190`. |
| ADM-016 | VERIFIED | `is_current` is explicit persistent state. Setting one season current clears the flag from other seasons, and client selection defaults to `isCurrent` rather than inferring from a name. | `createSeason`/`updateSeason`, `AdminCompetitionDesk`; GREEN run `32523186190`. |
| ADM-017 | VERIFIED | Only an empty DRAFT season can be deleted; any league/fixture competition data blocks deletion. The admin UI exposes an explicit confirmation flow. | `deleteEmptyDraftSeason`, `competition-routes.test.ts`, `AdminCompetitionDesk`; GREEN run `32523186190`. |
| ADM-018 | VERIFIED | Audit found no previous-season structural clone operation. RED run `32521461832` proved the endpoint was absent; RED run `32522707299` proved the admin control was absent. The new clone creates a fresh DRAFT season and fresh league IDs/slugs, copies structure/rules only, and copies no memberships/results/fixtures/invites. The Season workspace now exposes the operation. | `season-lifecycle.ts`, clone route, `season-clone.ts`, `admin-season-clone.test.tsx`; GREEN run `32523186190`. |
| ADM-019 | NOT REVIEWED | Next story and start of Chunk 2. | — |

## Resume instruction

Chunk 1 ends at ADM-018. After it is merged to `main`, create the next branch from fresh `main` and continue strictly from ADM-019. Do not skip ahead because the broad suite is green. Update this file after every story-level RED/GREEN checkpoint.
