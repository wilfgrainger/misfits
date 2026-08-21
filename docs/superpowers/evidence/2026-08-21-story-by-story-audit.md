# Misfits 501 — Story-by-Story Delivery Audit

**Started:** 21 August 2026
**Current branch:** `feat/story-audit-chunk-2-leagues-memberships`
**Current base:** `main` at `c2fd8599615b1687b5746b49ddd86cfd50263225`
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
- `PROGRESS.md` on the original baseline was stale and is not accepted as story-level proof.
- The planned `tests/release/user-story-ledger.test.ts` was absent, so the original 150-story delivery labels were not a release gate.

## Chunk 1 — governance and season lifecycle — MERGED

Merged to `main` as `c2fd8599615b1687b5746b49ddd86cfd50263225` via PR #11. Final PR-head gate `32523295692` passed Wrangler types, TypeScript, the complete Vitest suite and production build.

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
| ADM-010 | VERIFIED | Season creation generates a fresh stable ID and starts as DRAFT; it does not copy fixtures/results and leaves prior seasons untouched. Direct creation as OPEN is rejected so preparation cannot be bypassed. | `competition-routes.test.ts`; GREEN run `32523186190`. |
| ADM-011 | VERIFIED | Season name/current metadata persists through the stable season ID; invalid input is rejected by `validateSeasonInput`; league/history references remain attached by ID. | `competition-routes.test.ts`; GREEN run `32523186190`. |
| ADM-012 | VERIFIED | DRAFT/OPEN/CLOSED is persisted and backend-enforced. League status follows lifecycle transitions; player result submission paths reject closed leagues. | `season-lifecycle.ts`, `results.ts`, `fixture-results.ts`; GREEN run `32523186190`. |
| ADM-013 | VERIFIED | Audit found a real opening defect: an unprepared DRAFT season returned 200 and its leagues remained CLOSED. RED run `32521461832` isolated this. Opening now requires at least one league and at least two active players in every league, then opens prepared leagues. | `season-lifecycle.ts` + `competition-routes.test.ts`; GREEN run `32523186190`. |
| ADM-014 | VERIFIED | Closing marks season and leagues CLOSED. Both free-form and fixture-first normal player submissions check league OPEN status and are blocked; admin result correction/entry paths remain available. | `results.ts`, `fixture-results.ts`, lifecycle regression test; GREEN run `32523186190`. |
| ADM-015 | VERIFIED | Close operations update status/timestamps only; no leagues, memberships, fixtures or results are deleted, and closed records remain queryable. | `competition.ts` + lifecycle regression test; GREEN run `32523186190`. |
| ADM-016 | VERIFIED | `is_current` is explicit persistent state. Setting one season current clears the flag from other seasons, and client selection defaults to `isCurrent` rather than inferring from a name. | `createSeason`/`updateSeason`, `AdminCompetitionDesk`; GREEN run `32523186190`. |
| ADM-017 | VERIFIED | Only an empty DRAFT season can be deleted; any league/fixture competition data blocks deletion. The admin UI exposes an explicit confirmation flow. | `deleteEmptyDraftSeason`, `competition-routes.test.ts`, `AdminCompetitionDesk`; GREEN run `32523186190`. |
| ADM-018 | VERIFIED | Audit found no previous-season structural clone operation. RED run `32521461832` proved the endpoint was absent; RED run `32522707299` proved the admin control was absent. The new clone creates a fresh DRAFT season and fresh league IDs/slugs, copies structure/rules only, and copies no memberships/results/fixtures/invites. The Season workspace now exposes the operation. | `season-lifecycle.ts`, clone route, `season-clone.ts`, `admin-season-clone.test.tsx`; GREEN run `32523186190`. |

## Chunk 2 — leagues, memberships and invitations — VERIFIED / READY TO MERGE

PR #12 is based on merged Chunk 1 commit `c2fd8599615b1687b5746b49ddd86cfd50263225`. Final audited head is `678482dbdf6ddd8e8a6c1a3d110d911500699a17`. PR-head CI run `32527260941` passed Wrangler types, TypeScript, all **191/191 tests across 48 files**, and the Vite production build. `Deploy Worker` was skipped because this is a pull-request run.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-019 | VERIFIED | Season-scoped league creation persists stable league IDs and permits multiple leagues per season; server and unified admin UI both exercise creation. | `competition-routes.test.ts`, `admin-competition.test.tsx`; GREEN `32527260941`. |
| ADM-020 | VERIFIED | League updates preserve the league ID and therefore existing membership/fixture/result references while changing display metadata. | `src/server/db/competition-leagues.ts`, league/admin route regression coverage; GREEN `32527260941`. |
| ADM-021 | VERIFIED | Hierarchy position is persisted and sorted explicitly. Audit strengthened duplicate-position protection so divisional order cannot become ambiguous. | `story-admin-league-structure.test.ts`, `AdminCompetitionDeskV2.tsx`; GREEN `32527260941`. |
| ADM-022 | VERIFIED | Capacity persists, assignments/invites enforce it, lowering capacity below active membership is rejected, and the admin summary shows active count versus maximum. | `league-routes.test.ts`, `admin-league-summary.test.tsx`; GREEN `32527260941`. |
| ADM-023 | VERIFIED | Positive `matchesPerPair` persists and the fixture engine creates separately identifiable repeated pair meetings according to that value. | `fixtures.test.ts`, `admin-competition.test.tsx`; GREEN `32527260941`. |
| ADM-024 | VERIFIED | `targetLegs` persists and result-domain / fixture-result validation rejects scores that do not satisfy the league format. | `result.test.ts`, `fixture-results.test.ts`, admin league editing coverage; GREEN `32527260941`. |
| ADM-025 | VERIFIED | `pointsPerWin` persists, standings award points from confirmed results, and consequential scoring-rule edits are protected once competition history exists. | `standings.test.ts`, `story-adm-030.test.ts`; GREEN `32527260941`. |
| ADM-026 | VERIFIED | PUBLIC leagues are anonymously readable, PRIVATE reads require permitted session context, and public responses omit private identity data. | `league-routes.test.ts`, `public-league.test.tsx`; GREEN `32527260941`. |
| ADM-027 | VERIFIED | Stable league routes identify the intended competition; existing share coverage provides native/clipboard behaviour while private league reads remain protected. | `share.test.ts`, `public-league.test.tsx`, privacy route tests; GREEN `32527260941`. |
| ADM-028 | VERIFIED | Audit exposed a false-ready race: JavaScript `every()` treated an empty league array as complete, briefly rendering an accessible empty league list. The final fix requires at least one loaded league plus membership summaries before exposing the ordered overview. | `admin-league-summary.test.tsx`, `admin-competition.test.tsx`; fix `678482dbd`; GREEN `32527260941`. |
| ADM-029 | VERIFIED | Empty-league deletion is server guarded against protected competition data and the admin desk requires explicit confirmation. | competition deletion route coverage + `AdminCompetitionDeskV2.tsx`; GREEN `32527260941`. |
| ADM-030 | VERIFIED | Audit added focused protection for consequential rule changes after fixtures/results exist; historic scoring meaning cannot be silently rewritten. | `story-adm-030.test.ts`; GREEN `32527260941`. |
| ADM-031 | VERIFIED | Assignment writes explicit player + season + league placement and validates active account/capacity. | `competition-membership.test.ts`, `admin-competition.test.tsx`; GREEN `32527260941`. |
| ADM-032 | VERIFIED | Season-scoped rosters expose each member's active/inactive state and active count against league capacity. | `admin-membership-invites.test.tsx`, competition member API; GREEN `32527260941`. |
| ADM-033 | VERIFIED | Unassigned players are derived from active club accounts without current-season placement and can be assigned directly from the admin desk. | `admin-competition.test.tsx`, season-unassigned route; GREEN `32527260941`. |
| ADM-034 | VERIFIED | Backend same-season membership invariants prevent a player occupying multiple competing leagues; the audit added direct safety coverage. | `story-membership-safety.test.ts`, membership DB logic; GREEN `32527260941`. |
| ADM-035 | VERIFIED | Pre-fixture movement replaces the source placement with the target placement, checks capacity, and does not leave duplicate membership. | `competition-membership.test.ts`, `admin-competition.test.tsx`; GREEN `32527260941`. |
| ADM-036 | VERIFIED | Once protected fixture/result state exists, silent league movement is refused so competition records cannot become contradictory. | membership route/domain regressions; GREEN `32527260941`. |
| ADM-037 | VERIFIED | Deactivation marks the existing membership inactive rather than deleting history; historic records survive and inactive members lose normal competition eligibility. | `league-routes.test.ts`, `admin-membership-invites.test.tsx`; GREEN `32527260941`. |
| ADM-038 | VERIFIED | Reactivation reuses the same membership, rejects invalid capacity state, and treats a concurrent reactivation race idempotently rather than duplicating data/audit. | `league-routes.test.ts`, membership UI coverage; GREEN `32527260941`. |
| ADM-039 | VERIFIED | Audit added a deliberate reviewed baseline-copy operation from the prior season into a selected DRAFT season; source history remains unchanged and target placements can then be adjusted. | `story-adm-039.test.ts`, `membership-baseline.ts`, `admin-membership-invites.test.tsx`; GREEN `32527260941`. |
| ADM-040 | VERIFIED | Invites are scoped to the intended competition placement, the raw secret is returned only at creation, token persistence is hashed, and acceptance checks capacity/status. | `season-invite.test.ts`, `league-routes.test.ts`; GREEN `32527260941`. |
| ADM-041 | VERIFIED | Newly created secret URLs remain visible and the admin desk uses native share with clipboard fallback; failure does not require re-exposing token material from a listing API. | `src/client/invite-share.ts`, `admin-membership-invites.test.tsx`; GREEN `32527260941`. |
| ADM-042 | VERIFIED | Admin invite history exposes usage, expiry and revocation state without exposing token hashes/secrets. | `league-routes.test.ts`, `admin-membership-invites.test.tsx`; GREEN `32527260941`. |
| ADM-043 | VERIFIED | Explicit server-side revocation makes the link unusable while preserving already-valid memberships; the UI exposes the action. | `league-routes.test.ts`, admin invite UI; GREEN `32527260941`. |
| ADM-044 | VERIFIED | Reusing an accepted valid link recognises existing membership and does not duplicate rows, consume capacity again or double-write join audit. | `league-routes.test.ts`, `season-invite.test.ts`; GREEN `32527260941`. |
| ADM-045 | VERIFIED | Capacity checks are enforced on invite acceptance and membership mutation; race regressions prove duplicate/concurrent insertion loss is handled idempotently without partial duplicate membership. | `league-routes.test.ts`, membership DB paths; GREEN `32527260941`. |

## Resume instruction

Merge PR #12 to `main` only while its head remains `678482dbdf6ddd8e8a6c1a3d110d911500699a17` and the final gate remains green. After merge, start Chunk 3 from fresh `main` at ADM-046. Do not resume the obsolete `feat/master-user-stories-100` / PR #9 delivery line; it has been superseded by this audited chunk model.
