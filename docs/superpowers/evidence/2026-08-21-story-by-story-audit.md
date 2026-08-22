# Misfits 501 — Story-by-Story Delivery Audit

**Started:** 21 August 2026  
**Current branch:** `feat/configurable-match-scoring`  
**Current base:** `main` at `b8d42ea479fd6afc5c754d444704693e85477f55`  
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

The historical ADM-024/025 implementation remains real evidence for the older contract, but the club approved a broader rules model on 22 August 2026. Their audit state is therefore reopened to `PARTIAL` until the expanded Best-of/draw/scoring acceptance criteria are implemented and reverified.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-019 | VERIFIED | Season-scoped creation persists stable league identity and supports multiple leagues per season. | competition routes + admin UI; GREEN `32527554443`. |
| ADM-020 | VERIFIED | Rename/update preserves league ID and attached history. | competition league DB/routes; GREEN `32527554443`. |
| ADM-021 | VERIFIED | Explicit hierarchy is persisted/sorted and duplicate positions are rejected. | `story-admin-league-structure.test.ts`; GREEN `32527554443`. |
| ADM-022 | VERIFIED | Capacity persists, assignments/invites enforce it, lowering below active membership is rejected, and admin overview shows count/capacity. | league routes + `admin-league-summary.test.tsx`; GREEN `32527554443`. |
| ADM-023 | VERIFIED | Positive `matchesPerPair` persists and fixture generation uses it exactly. | fixture/domain tests; GREEN `32527554443`. |
| ADM-024 | VERIFIED | Authoritative `maxLegs` is persisted per league, derives the winning target, preserves legacy decisive formats, validates even exhausted draws, and is visible/editable as Best-of rather than a second target-legs authority. | Initial RED `ef185521543cd7db715601493fcebdb433502d07` / `32555046374`; Best-of RED `191d8163c9d66cbb5cbf849bf7857449d205e04f` / `32555425552`; persistence RED `7520b4460ab6fe85b7e35fde97fe1597ea1dd629` / `32555672236`; admin UI RED `9f3eacd089f50c772e43c93d1f96a1c1d712cd84` / `32560656189`; player/public RED `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f` / `32560958867`; final UI GREEN `32561215701`. |
| ADM-025 | VERIFIED | Win/draw/loss points are persisted and cloned per league, confirmed wins/draws/losses award configured values, consequential scoring changes lock after competition history exists, and the full scoring contract is editable and visible in admin/player/public views. | Initial RED `ef185521543cd7db715601493fcebdb433502d07` / `32555046374`; persistence/rule-lock RED `7520b4460ab6fe85b7e35fde97fe1597ea1dd629` / `32555672236`; standings RED `2b199e852e20904d5728116a3d90410e8ae247df` / `32559458511`; admin UI RED `9f3eacd089f50c772e43c93d1f96a1c1d712cd84` / `32560656189`; player/public RED `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f` / `32560958867`; final UI GREEN `32561215701`. |
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

## Chunk 3 — fixture generation and management — MERGED

Merged via PR #13 to `main` as `b1b68d215180951b016f6638a68dedc48a46eed1`. Exact final head `3e6a92a0933685cd7e0d9e4c08b5cd78094a0f19`; final gate `32528766451` passed Wrangler types, TypeScript, **196/196 tests across 48 files**, and production build.

The audit found one genuine fixture-state integrity gap. RED run `32528138189` isolated ADM-058: a fixture in `CONFIRMED` state could be sent directly to `OUTSTANDING` through the generic admin restore endpoint. Commit `de2be81ba4d0ef6cd8f19384486107e5ecfcd480` now permits void only from `OUTSTANDING`, restore only from `VOID`, and prevents either operation from contradicting an active result.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-046 | VERIFIED | Round-robin generation produces every unordered pair exactly the configured repeat count, no self-pairs, and canonical formula counts. | fixture/domain tests; GREEN `32528766451`. |
| ADM-047 | VERIFIED | Preview returns season, league, active player count, repeat count, expected count and pairings without writes. | fixture tests; GREEN `32528766451`. |
| ADM-048 | VERIFIED | Commit assigns stable IDs and complete season/league/player references using safe D1 persistence. | competition DB + schema tests; GREEN `32528766451`. |
| ADM-049 | VERIFIED | Repeated commit is idempotent and D1 uniqueness protects equivalent meeting retries. | fixture + schema regressions; GREEN `32528766451`. |
| ADM-050 | VERIFIED | Scheduling is deterministic, odd rosters produce byes and no player appears twice in one round. | domain tests; GREEN `32528766451`. |
| ADM-051 | VERIFIED | Multiple meetings have distinct fixture/round/meeting identity and one result settles one fixture. | repeated-meeting + schema tests; GREEN `32528766451`. |
| ADM-052 | VERIFIED | Complete league fixture list identifies players, round, meeting and current state. | route/UI tests; GREEN `32528766451`. |
| ADM-053 | VERIFIED | Persisted state filters cover outstanding, pending, disputed, confirmed and void without hiding disputes. | route/UI tests; GREEN `32528766451`. |
| ADM-054 | VERIFIED | Outstanding counts derive from fixture records, excluding completed/void as designed. | season health + UI tests; GREEN `32528766451`. |
| ADM-055 | VERIFIED | Pre-play reset/regeneration safely rebuilds from changed roster and rules. | regeneration tests; GREEN `32528766451`. |
| ADM-056 | VERIFIED | Any protected result/played state blocks destructive regeneration. | reset regressions; GREEN `32528766451`. |
| ADM-057 | VERIFIED | Admin voiding preserves fixture history and audit while rejecting active-result contradiction. | route/DB/UI tests; GREEN `32528766451`. |
| ADM-058 | VERIFIED | Audit found unsafe restore. Restore now requires `VOID`, rejects contradictory result state, restores `OUTSTANDING`, clears void timestamp and audits. | RED `32528138189`; GREEN `32528766451`. |
| ADM-059 | VERIFIED | Generation validates active eligible membership and blocks suspended/inactive/invalid roster writes. | roster + fixture tests; GREEN `32528766451`. |

## Chunk 4 — results, disputes and standings integrity — VERIFIED THROUGH ADM-070

PR #14 established fixture-first admin result settlement, reconstructable result audit state and season+league-scoped confirmed-only standings. Code-head run `32531189939` passed Wrangler types, TypeScript, **199/199 tests across 50 files**, and the production build. PR #15 then fixed the post-merge Results-tab integration defects and landed on `main` before the scoring redesign began.

| Story | Audit state | Evidence / gap | Fix / CI |
|---|---|---|---|
| ADM-060 | VERIFIED | Fixture-backed ordinary/admin results retain a single `fixtureId`, validate fixture participants and reject duplicate settlement through the existing fixture-result authority. | `fixture-results.test.ts`, result route regressions; GREEN `32531189939`. |
| ADM-061 | VERIFIED | Admin Results workspace selects an outstanding fixture; participants come from that fixture; validated legs/averages are posted fixture-first and settle the official fixture result. | `admin-results-workflow.test.tsx`, fixture result routes; GREEN `32531189939`. |
| ADM-062 | VERIFIED | Pending queue exposes fixture identity, submitter, opponent, score, averages and age/status context. | `admin-results-workflow.test.tsx`; GREEN `32531189939`. |
| ADM-063 | VERIFIED | Disputed queue keeps dispute note and fixture context visible, provides admin resolution action, and disputed records remain excluded from standings. | admin workflow + standings/result tests; GREEN `32531189939`. |
| ADM-064 | VERIFIED | Authorised admin can resolve an unresolved result to CONFIRMED; fixture state synchronises and confirmed result contributes once. Mutation is audited. | admin workflow + fixture result/update tests; GREEN `32531189939`. |
| ADM-065 | VERIFIED | Correction workflow revalidates legs/averages/participants/state and preserves fixture participant integrity before synchronisation. | `admin-results-workflow.test.tsx`, admin result/fixture safeguards; GREEN `32531189939`. |
| ADM-066 | VERIFIED | Result deletion is explicit and confirmed in UI, soft-deletes the official match, records audit, restores linked fixture to OUTSTANDING where safe, and removes its derived standings contribution. | admin workflow + delete/fixture sync tests; GREEN `32531189939`. |
| ADM-067 | VERIFIED | Admin update audit records corrected score/averages plus status, dispute state, confirmer and confirmation timestamp; delete retains reconstructable before state. | `admin-result-integrity.test.ts`; GREEN `32531189939`. |
| ADM-068 | VERIFIED | Standings remain computed from confirmed result records only; pending/disputed never contribute, and corrections/deletions change derived totals rather than editing totals directly. | result/standings tests + integrity regression; GREEN `32531189939`. |
| ADM-069 | VERIFIED | Once fixtures exist, standings query joins confirmed matches to fixtures and requires fixture league plus fixture season to match the selected league record, excluding free-floating/cross-season contamination. | `admin-result-integrity.test.ts`; GREEN `32531189939`. |
| ADM-070 | VERIFIED | Competitive standings use Points → total legs won → head-to-head points; two-player direct meetings and 3+ tied-group mini-tables are covered; unresolved equality shares rank; username/player ID are display-only; promotion/relegation consumes authoritative rank and blocks a shared-rank boundary rather than guessing. | Definitive standings RED `2b199e852e20904d5728116a3d90410e8ae247df` / `32559458511`; standings GREEN `32560372522`; promotion authority RED `7b5874829dc09ce4d2eecbc8ff0f620a671ec1dc` / `32560471929`; promotion GREEN `32560541080`; story release test `tests/release/story-adm-070.test.ts`; visible rule GREEN `32561215701`. |

## Current execution checkpoint — PR #17

- Implementation branch: `feat/configurable-match-scoring` from docs/design merge `b8d42ea479fd6afc5c754d444704693e85477f55`.
- Draft PR: #17, `feat: configurable Best-of scoring and head-to-head standings`.
- First RED commit: `ef185521543cd7db715601493fcebdb433502d07`.
- RED CI run `32555046374`: Wrangler types and TypeScript passed; **200 existing tests passed**; exactly the three new configurable-scoring contract tests failed because `maxLegs`/draw/loss fields and migration 0005 do not yet exist. Build was correctly skipped after test failure.
- No production scoring implementation existed at this RED checkpoint.
- Next: implement the minimal scoring schema/domain GREEN, then continue the committed plan in order.

## Configurable scoring re-audit — PR #17

ADM-024, ADM-025 and ADM-070 were deliberately reopened when the club approved Best-of even formats, draw scoring and the sporting tie-break order. They are now re-verified against the expanded acceptance criteria rather than inheriting their earlier decisive-match evidence.

| Task | RED evidence | GREEN evidence |
|---|---|---|
| Shared schema/scoring contract | `ef185521543cd7db715601493fcebdb433502d07`, CI `32555046374` | CI `32555367533` |
| Best-of result validation | `191d8163c9d66cbb5cbf849bf7857449d205e04f`, CI `32555425552` | CI `32555506609` |
| Persistence / API / rule locks | `7520b4460ab6fe85b7e35fde97fe1597ea1dd629`, CI `32555672236` | CI `32559244717` |
| W/D/L standings + head-to-head | `2b199e852e20904d5728116a3d90410e8ae247df`, CI `32559458511` | CI `32560372522` |
| Promotion uses authoritative rank | `7b5874829dc09ce4d2eecbc8ff0f620a671ec1dc`, CI `32560471929` | CI `32560541080` |
| Admin Match & table rules UI | `9f3eacd089f50c772e43c93d1f96a1c1d712cd84`, CI `32560656189` | CI `32560845059` |
| Player/public scoring presentation | `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f`, CI `32560958867` | CI `32561215701` — **238/238 tests across 57 files**, Wrangler types, TypeScript and production build |

The production release remains separately gated: migration `0005_configurable_match_scoring.sql` must be explicitly applied to production D1 before PR #17 can be merged and deployed. Story verification here means the implementation and automated acceptance evidence are complete; it does not claim the schema change is already live in production.
