# Misfits 501 — Story-by-Story Delivery Audit

**Started:** 21 August 2026  
**Current branch:** `feat/story-audit-chunk-3-fixtures`  
**Current base:** `main` at `e1c3957c06d78da782fe865f1015c2898c9a01c9`  
**Authority:** `docs/superpowers/specs/2026-08-21-user-stories.md`  
**Method:** Superpowers executing-plans + TDD + systematic-debugging + verification-before-completion.

## Purpose

Re-audit every canonical user story in ID order against source code and focused automated evidence. A story is only `VERIFIED` when its complete acceptance criteria are supported by implementation and focused tests. A catalogue label of `DELIVERED` is not accepted as evidence by itself.

When a story fails or has weak evidence:

1. record the gap here;
2. add or strengthen focused failing evidence first when behaviour is missing;
3. implement the smallest correct fix;
4. obtain GREEN CI evidence;
5. only then mark the story VERIFIED.

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
- That was a pull-request run, so `Deploy Worker` was skipped.
- `migrations/0004_seasons_fixtures_promotion.sql` exists in `main`; remote production migration application is not assumed without evidence.
- The original 150-story `DELIVERED` labels are catalogue state, not release proof.

## Chunk 1 — governance and season lifecycle — MERGED

Merged via PR #11 to `main` as `c2fd8599615b1687b5746b49ddd86cfd50263225`. Final PR-head gate `32523295692` passed Wrangler types, TypeScript, the complete Vitest suite and production build.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-001 | VERIFIED | Worker verifies Google identity and protected routes never trust browser role state. Focused invalid-identity test fails closed before D1 access. | `story-adm-001.test.ts`; GREEN `32520314235`. |
| ADM-002 | VERIFIED | Opaque random session token, SHA-256 persistence, secure cookie, expiry/revocation and ACTIVE-user enforcement. | `session.test.ts`, governance tests; GREEN `32521180737`. |
| ADM-003 | VERIFIED | Admin/player mode is presentation state only; server authority remains unchanged and independent selections survive mode switches. | `app-league-create.test.tsx`; GREEN `32521180737`. |
| ADM-004 | VERIFIED | Account directory is admin-only and public APIs omit private identity fields. | `admin-routes.test.ts`; GREEN `32521180737`. |
| ADM-005 | VERIFIED | Authorised PLAYER→ADMIN promotion persists server-side. | admin route tests; GREEN `32521180737`. |
| ADM-006 | VERIFIED | Non-protected ADMIN→PLAYER demotion preserves recovery authority. | `story-admin-governance.test.ts`; GREEN `32521180737`. |
| ADM-007 | VERIFIED | Suspension removes protected access without deleting membership/result history. | governance tests; GREEN `32521180737`. |
| ADM-008 | VERIFIED | Reactivation reuses the account and preserves historical records. | governance tests; GREEN `32521180737`. |
| ADM-009 | VERIFIED | Audit found UI/API master-admin protection gap. Directory now exposes the protection marker and destructive controls are removed while backend invariants remain authoritative. | RED `32520800451`; GREEN `32521180737`; `story-adm-009-server.test.ts`, `admin-access-protection.test.tsx`. |
| ADM-010 | VERIFIED | Season creation uses a fresh stable ID, starts DRAFT and does not copy results/fixtures. | `competition-routes.test.ts`; GREEN `32523186190`. |
| ADM-011 | VERIFIED | Season metadata updates preserve stable identity and attached competition history. | competition route tests; GREEN `32523186190`. |
| ADM-012 | VERIFIED | DRAFT/OPEN/CLOSED is persistent and backend enforced. | lifecycle/result tests; GREEN `32523186190`. |
| ADM-013 | VERIFIED | Audit found unprepared season opening defect. Opening now requires at least one league and two active players in every league and opens prepared leagues. | RED `32521461832`; GREEN `32523186190`. |
| ADM-014 | VERIFIED | Closing blocks ordinary new results while preserving controlled admin correction. | result/lifecycle tests; GREEN `32523186190`. |
| ADM-015 | VERIFIED | Closing never deletes leagues, memberships, fixtures or results. | lifecycle regression; GREEN `32523186190`. |
| ADM-016 | VERIFIED | Explicit `is_current` state, one current season, UI defaults to it rather than inferring from names. | competition DB + admin desk; GREEN `32523186190`. |
| ADM-017 | VERIFIED | Only an empty DRAFT can be deleted and UI requires confirmation. | deletion route + admin UI; GREEN `32523186190`. |
| ADM-018 | VERIFIED | Audit found missing structural clone. Clone now creates fresh DRAFT season and league identities, copying structure/rules only. | RED `32521461832` + `32522707299`; GREEN `32523186190`. |

## Chunk 2 — leagues, memberships and invitations — MERGED

Merged via PR #12 to `main` as `e1c3957c06d78da782fe865f1015c2898c9a01c9`. Exact final PR head was `8979543a09119909eefde3424abe459b0a4721d8`. Final PR-head CI run `32527554443` passed Wrangler types, TypeScript, **191/191 tests across 48 files**, and production build.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-019 | VERIFIED | Season-scoped creation persists stable league identity and supports multiple leagues per season. | competition routes + admin UI; GREEN `32527554443`. |
| ADM-020 | VERIFIED | Rename/update preserves league ID and attached history. | competition league DB/routes; GREEN `32527554443`. |
| ADM-021 | VERIFIED | Explicit hierarchy is persisted/sorted and duplicate positions are rejected. | `story-admin-league-structure.test.ts`; GREEN `32527554443`. |
| ADM-022 | VERIFIED | Capacity persists, assignments/invites enforce it, lowering below active membership is rejected, and admin overview shows count/capacity. | league routes + `admin-league-summary.test.tsx`; GREEN `32527554443`. |
| ADM-023 | VERIFIED | Positive `matchesPerPair` persists and fixture generation uses it exactly. | fixture/domain tests; GREEN `32527554443`. |
| ADM-024 | VERIFIED | `targetLegs` persists and decisive result validation follows it. | result tests; GREEN `32527554443`. |
| ADM-025 | VERIFIED | `pointsPerWin` drives confirmed-result standings and consequential scoring changes are protected after play begins. | standings + `story-adm-030.test.ts`; GREEN `32527554443`. |
| ADM-026 | VERIFIED | PUBLIC is anonymous-readable; PRIVATE requires permitted context; private identity fields do not leak. | league/public tests; GREEN `32527554443`. |
| ADM-027 | VERIFIED | Stable league link resolves intended competition; sharing fallback works; private reads remain protected. | share/public tests; GREEN `32527554443`. |
| ADM-028 | VERIFIED | Audit exposed false-ready UI state because `every()` is true for an empty array. Overview now becomes accessible only after leagues and all membership summaries load. | fix `678482dbd`; league-summary tests; GREEN final `32527554443`. |
| ADM-029 | VERIFIED | Empty league deletion is protected against competition history and explicitly confirmed in UI. | route/UI coverage; GREEN `32527554443`. |
| ADM-030 | VERIFIED | Consequential league rule edits are blocked once protected fixture/result history exists. | `story-adm-030.test.ts`; GREEN `32527554443`. |
| ADM-031 | VERIFIED | Assignment persists player + season + league and validates account/capacity. | membership tests; GREEN `32527554443`. |
| ADM-032 | VERIFIED | League/season roster shows active/inactive state and capacity comparison. | membership admin UI tests; GREEN `32527554443`. |
| ADM-033 | VERIFIED | Unassigned list derives active accounts lacking current-season active placement and exposes assignment. | admin competition tests; GREEN `32527554443`. |
| ADM-034 | VERIFIED | Backend invariant prevents multiple active competing leagues for one player in a season. | `story-membership-safety.test.ts`; GREEN `32527554443`. |
| ADM-035 | VERIFIED | Pre-fixture move deactivates source, activates target, enforces capacity and leaves no duplicate. | membership tests; GREEN `32527554443`. |
| ADM-036 | VERIFIED | Membership moves are locked after protected fixtures/results exist. | membership DB/route regression; GREEN `32527554443`. |
| ADM-037 | VERIFIED | Membership deactivation preserves history and removes ordinary eligibility. | league routes + admin membership UI; GREEN `32527554443`. |
| ADM-038 | VERIFIED | Reactivation reuses the membership, enforces capacity and handles a concurrent reactivation race idempotently. | league route regressions; GREEN `32527554443`. |
| ADM-039 | VERIFIED | Reviewed baseline copy writes placements into a selected DRAFT season without changing source history. | `story-adm-039.test.ts`, baseline/UI tests; GREEN `32527554443`. |
| ADM-040 | VERIFIED | Invite is scoped to competition placement; raw secret returned only at creation and persisted hashed; acceptance validates status/capacity. | season/league invite tests; GREEN `32527554443`. |
| ADM-041 | VERIFIED | New secret URL remains visible and native share/clipboard fallback works. | `invite-share.ts`, UI tests; GREEN `32527554443`. |
| ADM-042 | VERIFIED | Invite history exposes usage/expiry/revocation without token material. | league route + UI tests; GREEN `32527554443`. |
| ADM-043 | VERIFIED | Revocation prevents future joins while preserving existing membership. | invite route/UI tests; GREEN `32527554443`. |
| ADM-044 | VERIFIED | Reusing an accepted invite is idempotent and does not double-consume capacity/audit. | invite race tests; GREEN `32527554443`. |
| ADM-045 | VERIFIED | Capacity survives concurrent join/insert races without partial duplicate membership. | league route race regressions; GREEN `32527554443`. |

## Chunk 3 — fixture generation and management — VERIFIED / READY FOR FINAL DOC RE-GATE

PR #13 is based on merged Chunk 2 commit `e1c3957c06d78da782fe865f1015c2898c9a01c9`. The strongest pre-documentation evidence head is `58d066ba1279b6d37e2defe73c337a27ec65c35a`. CI run `32528529664` passed Wrangler types, TypeScript, **196/196 tests across 48 files**, and the Vite production build.

The audit found one genuine fixture-state integrity gap. RED run `32528138189` isolated ADM-058: a fixture in `CONFIRMED` state could be sent directly to `OUTSTANDING` through the generic admin restore endpoint. Commit `de2be81ba4d0ef6cd8f19384486107e5ecfcd480` now permits void only from `OUTSTANDING`, restore only from `VOID`, and prevents either operation from contradicting an active result. The immediate fix gate `32528291927` passed 194/194 tests. Additional evidence then raised the suite to 196/196 in `32528529664`.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-046 | VERIFIED | `generateRoundRobinFixtures` produces every unordered pair exactly the configured repeat count, no self-pairs, and canonical 8/10/12-player formula counts. | `competition.test.ts`, persisted fixture tests; GREEN `32528529664`. |
| ADM-047 | VERIFIED | Preview returns season, league, active player count, repeat count, expected fixture count and pairings while leaving fixture storage unchanged. Suspended-account mismatch fails before writes. | strengthened `fixtures.test.ts`; GREEN `32528529664`. |
| ADM-048 | VERIFIED | Commit assigns stable UUID fixture IDs and season/league/player references using a D1 batch. Schema constraints make equivalent partial/duplicate schedules fail safely rather than coexist. | `competition.ts`, migration v4, schema/fixture tests; GREEN `32528529664`. |
| ADM-049 | VERIFIED | Repeated commit returns the existing schedule and stable IDs. D1 additionally enforces `UNIQUE(league_id, pair_key, meeting_number)`, protecting retry/concurrency races. | fixture idempotency + schema regression; GREEN `32528529664`. |
| ADM-050 | VERIFIED | Circle scheduling is deterministic for identical input; odd rosters produce byes and no player appears more than once in a round. | strengthened `competition.test.ts`; GREEN `32528529664`. |
| ADM-051 | VERIFIED | Multiple meetings have distinct fixture IDs, meeting numbers and rounds while preserving pair identity; matches have one-active-result-per-fixture uniqueness. | repeated-meeting fixture test + v4 schema; GREEN `32528529664`. |
| ADM-052 | VERIFIED | Persisted fixture list is league-scoped and returns player names, round, meeting and state for the complete schedule. | fixture route tests + admin fixture UI; GREEN `32528529664`. |
| ADM-053 | VERIFIED | Backend status filter reads persisted `OUTSTANDING`, `PENDING_CONFIRMATION`, `DISPUTED`, `CONFIRMED` and `VOID` rows; admin UI exposes operational counts/filters without dropping disputed fixtures. | strengthened state-filter test + `admin-competition.test.tsx`; GREEN `32528529664`. |
| ADM-054 | VERIFIED | Outstanding count is derived from persisted fixture status; completed and void fixtures are excluded. Admin fixture health visibly surfaces the count. | `seasonHealth`, admin fixture health test; GREEN `32528529664`. |
| ADM-055 | VERIFIED | Reset succeeds only while the schedule is entirely unplayed. Audit evidence resets six fixtures, changes the active roster, regenerates, and receives the new three-fixture schedule with fresh IDs and no withdrawn player. | strengthened regeneration test; GREEN `32528529664`. |
| ADM-056 | VERIFIED | Reset query rejects any non-OUTSTANDING fixture and independently rejects any active result link, covering pending/disputed/confirmed competition history. | `deleteUnplayedFixtures` + protected-reset regression; GREEN `32528529664`. |
| ADM-057 | VERIFIED | Fixture voiding is admin-only, same-origin protected, persists `VOID`/timestamp, keeps the fixture historically present and writes `FIXTURE_STATUS_CHANGED` audit. Active-result fixtures cannot be voided. | competition route/DB + fixture/UI tests; GREEN `32528529664`. |
| ADM-058 | VERIFIED | Audit found unsafe generic restore. Restore now requires current state `VOID`, rejects active-result contradiction, returns to `OUTSTANDING`, clears `voided_at` and is audited. | RED `32528138189`; fix `de2be81ba`; GREEN `32528291927` and `32528529664`. |
| ADM-059 | VERIFIED | Generation uses active memberships joined to ACTIVE accounts, checks the full active-membership count, rejects fewer than two valid players or suspended/invalid active memberships, and writes nothing on preview failure. Same-season membership uniqueness prevents duplicate active placement upstream. | suspended-roster/no-write test + membership/schema invariants; GREEN `32528529664`. |

## Resume instruction

1. Run the complete PR #13 CI gate on the latest documentation head, not merely the earlier code/evidence head.
2. Merge PR #13 only if Wrangler types, TypeScript, all tests and production build remain green and the expected head SHA has not moved.
3. After merge, branch the next audited chunk from fresh `main` at ADM-060.
4. Do not resume PR #9 or either `feat/master-user-stories-100*` branch; those lines are retired and non-authoritative.
