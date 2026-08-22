# Configurable Match Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver league-scoped Best-of match formats, configurable win/draw/loss points, and the approved standings order `Points → total legs won → head-to-head`, while preserving existing competition history and promotion/relegation safety.

**Architecture:** Keep one authoritative scoring-rules model shared by result validation and standings. Persist additive league scoring columns in D1, retain `target_legs` only as compatibility data derived from `max_legs`, and make standings the sole authority for competitive rank so promotion/relegation does not reimplement tie rules. Existing Worker/API/UI boundaries remain intact.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, D1, React, Vitest, Testing Library, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`

## Global Constraints

- Follow strict RED → observe intended failure → minimal GREEN → focused re-run → full verification.
- No production code is written before its focused failing test exists and has failed for the expected reason.
- Existing `target_legs = T` migrates to `max_legs = (T * 2) - 1`.
- `max_legs` is authoritative after migration. `target_legs` may remain populated only as a compatibility mirror derived as `floor(max_legs / 2) + 1`.
- Points for win, draw and loss are non-negative integers. Keep the existing bounded club-scale validation, using `0..100` for each points value and `1..40` for `maxLegs`.
- Best of 6 accepts `4-0`, `4-1`, `4-2`, `3-3`; it rejects `3-2`, `4-3` and scores beyond six total legs.
- Competitive order is only points, total legs won, head-to-head points. Leg difference, average, username and player ID never decide competition position.
- Genuine unresolved ties receive the same competitive rank. Stable username/player-ID order is presentation-only.
- Promotion/relegation consumes standings rank and blocks a movement boundary that crosses a shared rank.
- The existing production deploy deliberately does **not** apply remote D1 migrations (`tests/release/deploy-workflow.test.ts`). Do not weaken that guardrail silently. The additive production migration is a separate release prerequisite before merging/deploying code that selects the new columns.
- Keep `PROGRESS.md`, the canonical stories and story audit current at durable checkpoints.

---

## Task 1: Amend the canonical stories and audit before production code

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Modify: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`
- Modify: `PROGRESS.md`

- [ ] Replace ADM-024 with the approved Best-of / maximum-leg story. Acceptance must require persisted `maxLegs`, derived winning target, even-format draws, authoritative server validation and player-visible rules. Mark it `PARTIAL · P0` because the legacy first-to implementation no longer satisfies the expanded story.
- [ ] Replace ADM-025 with configurable win/draw/loss scoring. Acceptance must require persisted league-scoped values, confirmed-only awards, draw scoring and consequential-rule locking. Mark it `PARTIAL · P0`.
- [ ] Remove ADM-070's product gate and record `Points → total legs won → head-to-head`, two-player aggregation, 3+ mini-table, shared-rank genuine ties, deterministic display and promotion-boundary ambiguity. Mark implementation state `MISSING · P0` until RED/GREEN evidence exists.
- [ ] In the audit, preserve the historical evidence for the old ADM-024/025 behavior but reclassify them `PARTIAL` under the superseding acceptance criteria. Reclassify ADM-070 from `GATED` to `MISSING / APPROVED FOR TDD`.
- [ ] Update `PROGRESS.md` to point to this implementation plan and record execution start.
- [ ] Commit documentation checkpoint.

---

## Task 2: Add the scoring schema and one domain rules contract

**Files:**
- Create: `migrations/0005_configurable_match_scoring.sql`
- Create: `src/server/domain/scoring.ts`
- Modify: `src/server/domain/league.ts`
- Modify: `src/server/domain/competition.ts`
- Modify: `tests/domain/league.test.ts`
- Modify: `tests/domain/competition.test.ts`
- Create: `tests/release/scoring-migration.test.ts`

### RED

- [ ] Add focused tests requiring `maxLegs`, `pointsPerWin`, `pointsPerDraw`, `pointsPerLoss`, non-negative point validation, even values such as 6, and the legacy migration formula.
- [ ] Add migration evidence test that reads `0005_configurable_match_scoring.sql` and asserts additive columns plus `max_legs = (target_legs * 2) - 1` backfill.
- [ ] Commit the tests only and observe CI fail because the new contract/migration is absent.

### GREEN

- [ ] Add `src/server/domain/scoring.ts` with the shared contract:

```ts
export interface LeagueScoringRules {
  maxLegs: number;
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
}

export function legsToWin(maxLegs: number): number {
  return Math.floor(maxLegs / 2) + 1;
}
```

- [ ] Add migration columns safely for populated D1 tables:

```sql
ALTER TABLE leagues ADD COLUMN max_legs INTEGER NOT NULL DEFAULT 5 CHECK(max_legs BETWEEN 1 AND 40);
ALTER TABLE leagues ADD COLUMN points_per_draw INTEGER NOT NULL DEFAULT 0 CHECK(points_per_draw BETWEEN 0 AND 100);
ALTER TABLE leagues ADD COLUMN points_per_loss INTEGER NOT NULL DEFAULT 0 CHECK(points_per_loss BETWEEN 0 AND 100);
UPDATE leagues SET max_legs = (target_legs * 2) - 1;
```

- [ ] Replace new input contracts from editable `targetLegs` to `maxLegs`, `pointsPerWin`, `pointsPerDraw`, `pointsPerLoss` in both legacy league and season-scoped competition validators.
- [ ] Keep defaults behavior-preserving: Best of 5, win 2, draw 0, loss 0.
- [ ] Re-run focused domain/release tests and then the complete suite.
- [ ] Commit minimal GREEN.

---

## Task 3: Make result validation understand odd and even Best-of formats

**Files:**
- Modify: `src/server/domain/result.ts`
- Modify: `tests/domain/result.test.ts`

### RED

- [ ] Replace target-leg-only test inputs with `LeagueScoringRules`.
- [ ] Add the exact matrix:
  - Best of 5 accepts `3-0`, `3-1`, `3-2`.
  - Best of 5 rejects `2-2`, `3-3`, `2-1`.
  - Best of 6 accepts `4-0`, `4-1`, `4-2`, `3-3`.
  - Best of 6 rejects `3-2`, `4-3`, `4-4` and totals over 6.
  - Averages remain finite, bounded and rounded exactly as today.
- [ ] Commit RED and observe the focused test fail because draws/max-leg semantics are missing.

### GREEN

- [ ] Change `validatePlayerResult` to receive scoring rules, derive the target with `legsToWin`, and accept either a legal decisive result or the sole legal even-format draw.

Representative predicate:

```ts
const target = legsToWin(rules.maxLegs);
const total = playerALegs + playerBLegs;
const draw = rules.maxLegs % 2 === 0
  && playerALegs === rules.maxLegs / 2
  && playerBLegs === rules.maxLegs / 2;
const decisive = total <= rules.maxLegs && (
  (playerALegs === target && playerBLegs < target) ||
  (playerBLegs === target && playerALegs < target)
);
```

- [ ] Preserve all player/average validation and canonical pair behavior.
- [ ] Re-run focused test and full suite.
- [ ] Commit GREEN.

---

## Task 4: Persist and expose the complete league rules everywhere

**Files:**
- Modify: `src/server/db/leagues.ts`
- Modify: `src/server/db/competition.ts`
- Modify: `src/server/db/competition-leagues.ts`
- Modify: `src/server/db/season-lifecycle.ts`
- Modify: `src/server/routes/leagues.ts`
- Modify: `src/server/routes/admin-leagues.ts`
- Modify: `src/server/routes/competition.ts`
- Modify: `src/server/db/results.ts`
- Modify: `src/server/db/fixture-results.ts`
- Modify: relevant MemoryD1 league shapes in `tests/server/*.test.ts`
- Modify: `tests/server/league-routes.test.ts`
- Modify: `tests/server/competition-routes.test.ts`
- Modify: `tests/server/fixture-results.test.ts`
- Modify: `tests/release/story-adm-030.test.ts`

### RED

- [ ] Add API round-trip tests proving create/edit/read/season-clone preserve `maxLegs`, win/draw/loss points.
- [ ] Add server integration tests proving Best-of-6 fixture results accept `3-3` and reject `3-2`/`4-3`.
- [ ] Extend rule-lock test so changing any of `maxLegs`, win/draw/loss points or matches-per-pair after fixtures/results exist is rejected.
- [ ] Commit RED and observe expected failures against old `target_legs` paths.

### GREEN

- [ ] Extend both `LeagueRecord` and `CompetitionLeagueRecord` queries with `max_legs`, `points_per_draw`, `points_per_loss`.
- [ ] On writes, persist new fields and keep `target_legs = legsToWin(maxLegs)` only as a compatibility mirror, never an independent input.
- [ ] Update season cloning to copy all approved scoring values.
- [ ] Update public/admin serialization to emit `maxLegs`, `pointsPerWin`, `pointsPerDraw`, `pointsPerLoss`.
- [ ] Pass the full rules object into ordinary and fixture-backed result validation.
- [ ] Re-run focused server tests, then full suite.
- [ ] Commit GREEN.

---

## Task 5: Award configurable points and implement the approved table order

**Files:**
- Modify: `src/server/domain/standings.ts`
- Modify: `tests/domain/standings.test.ts`
- Modify: `src/server/db/results.ts`

### RED

- [ ] Write focused standings tests before production changes:
  - win/draw/loss point values are all used;
  - draw increments `played` and `drawn`, but neither `won` nor `lost`;
  - points outrank every other statistic;
  - equal points are ordered by `legsFor` only;
  - equal points + legs use aggregated two-player head-to-head points;
  - 3+ equal players use a mini-table of matches inside the tied group;
  - a partially resolved mini-table gives remaining equal players the same rank;
  - input order changes do not change competitive ranks;
  - username/player ID only makes returned order deterministic.
- [ ] Commit RED and observe failures from the legacy leg-difference/average order.

### GREEN

- [ ] Add `drawn` to `StandingRow` while retaining `legDifference` and `average` as display/statistical values only.
- [ ] Aggregate overall points using the league scoring rules.
- [ ] Group rows by identical overall `(points, legsFor)`.
- [ ] For each tied group, calculate head-to-head points from confirmed matches whose two players are both in that group. This naturally implements the two-player case and the 3+ mini-table with one algorithm.
- [ ] Sort by competitive tuple `(points desc, legsFor desc, headToHeadPoints desc)`, then username/player ID strictly for deterministic presentation.
- [ ] Assign standard competition ranks from the competitive tuple, e.g. `1, 2, 2, 4`.
- [ ] Do not recursively add new tie-breakers when head-to-head points remain equal.
- [ ] Update `getLeagueStandings` to pass full scoring rules.
- [ ] Re-run focused test, server standings coverage and full suite.
- [ ] Commit GREEN.

---

## Task 6: Make promotion/relegation consume authoritative competitive rank

**Files:**
- Modify: `src/server/domain/competition.ts`
- Modify: `src/server/db/promotion.ts`
- Modify: `tests/domain/competition.test.ts`
- Modify: `tests/server/promotion.test.ts`
- Create or modify: `tests/release/story-adm-070.test.ts`

### RED

- [ ] Add tests where head-to-head separates a promotion boundary safely.
- [ ] Add tests where equal approved criteria produce the same standing rank and block promotion/relegation when that shared rank crosses the movement boundary.
- [ ] Add a regression proving average/leg difference/username cannot resolve the movement ambiguity.
- [ ] Commit RED and observe failure because `sameCompetitiveRank` still compares legacy metrics.

### GREEN

- [ ] Make `StandingPosition.position` / standings rank the competitive authority.
- [ ] Replace duplicated metric equality with shared-rank equality:

```ts
function sameCompetitiveRank(left: StandingPosition, right: StandingPosition): boolean {
  return left.position === right.position;
}
```

- [ ] Make `tiedUserIds` collect all rows at that rank.
- [ ] Keep existing finalisation block when an ambiguity exists.
- [ ] Re-run focused promotion tests, ADM-070 release test and full suite.
- [ ] Commit GREEN.

---

## Task 7: Update the admin Match & table rules experience

**Files:**
- Modify: `src/client/api.ts`
- Modify: `src/client/components/AdminCompetitionDeskV2.tsx`
- Modify: `src/client/components/AdminLeagueDesk.tsx` only where required by active types/legacy route compatibility
- Modify: `tests/client/api.test.ts`
- Modify: `tests/client/admin-competition.test.tsx`
- Modify: `tests/client/app-league-create.test.tsx` where shared league types require it

### RED

- [ ] Add an admin UI test that selects/creates a league with Best of 6, Win 3, Draw 1, Loss 0 and asserts the request body exactly.
- [ ] Assert derived explanatory copy: `Best of 6: first to 4 wins; 3-3 is a draw.`
- [ ] Assert an odd example explains no draw.
- [ ] Commit RED and observe failure because the client exposes target legs/win-only scoring.

### GREEN

- [ ] Change `LeagueSummary` and API normalisation to `maxLegs`, win/draw/loss points.
- [ ] Present one compact **Match & table rules** section with Best of, points for win, draw, loss, and matches per pair.
- [ ] Derive explanation from `maxLegs`; do not expose a second editable legs-to-win control.
- [ ] Preserve existing rule-lock error handling.
- [ ] Re-run focused client tests and full suite.
- [ ] Commit GREEN.

---

## Task 8: Update player/public result and standings presentation

**Files:**
- Modify: `src/client/components/PlayerLeague.tsx`
- Modify: `src/client/components/StandingsTable.tsx`
- Create: `tests/client/player-scoring-rules.test.tsx`
- Modify other focused player/public tests only where shared API fixtures require new fields

### RED

- [ ] Render a Best-of-6 league and assert the visible rule summary:
  - `Best of 6 · Win 3 · Draw 1 · Loss 0`
  - `Table: Points → Legs won → Head-to-head`
- [ ] Assert result entry permits the derived target 4 and draw score 3-3, not an old `targetLegs` label.
- [ ] Assert confirmed 3-3 renders `Draw`, not a false winner.
- [ ] Assert standings show W-D-L, total legs won and shared rank when supplied.
- [ ] Commit RED and observe expected UI failures.

### GREEN

- [ ] Derive `legsToWin = floor(maxLegs / 2) + 1` client-side only for display/input ergonomics; the Worker remains authoritative.
- [ ] Make draw rendering explicit in result rows.
- [ ] Reset score defaults using the derived winning target.
- [ ] Update standings columns to expose `D`/W-D-L and legs won so the approved tie-break is explainable.
- [ ] Show compact rules/tie-break text near the table/result form.
- [ ] Re-run focused client tests and full suite.
- [ ] Commit GREEN.

---

## Task 9: Re-audit ADM-024, ADM-025 and ADM-070 and perform the complete PR gate

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Modify: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`
- Modify: `PROGRESS.md`

- [ ] Run fresh complete verification equivalent to CI:

```bash
npx wrangler types
npm run typecheck
npm test
npm run build
```

- [ ] Mark ADM-024, ADM-025 and ADM-070 `DELIVERED`/`VERIFIED` only if all acceptance criteria have focused evidence and the complete gate is green.
- [ ] Record exact RED commits/runs and final GREEN run IDs in the audit and `PROGRESS.md`.
- [ ] Request Codex review on the implementation PR and address substantive findings with systematic debugging + TDD.
- [ ] Re-run the complete PR-head gate after the final review/doc commit.

---

## Task 10: Production migration gate, merge and deploy verification

**Files:**
- Migration: `migrations/0005_configurable_match_scoring.sql`
- Existing release guardrail: `.github/workflows/ci.yml`, `tests/release/deploy-workflow.test.ts`

- [ ] **Do not merge the implementation code until production D1 has received migration 0005.** The current deployment workflow intentionally refuses to run remote migrations automatically.
- [ ] Apply the additive migration through the repository's authorised explicit remote-migration process. Required command semantics:

```bash
wrangler d1 migrations apply <production-db> --remote
```

- [ ] Verify the migration completed successfully before merging code that selects `max_legs`, `points_per_draw` and `points_per_loss`.
- [ ] Merge only the exact verified PR head.
- [ ] Verify the resulting `main` Actions run: verify job green and `Deploy Worker` green.
- [ ] Perform a production smoke check of league read/admin rule read and standings after deploy if an authorised production access path is available.
- [ ] Update `PROGRESS.md` with merge SHA, main CI/deploy run and any externally required migration evidence.

## Plan self-review

- Every approved spec requirement is mapped to a task and focused test.
- Existing decisive formats retain meaning through `target_legs -> max_legs` migration.
- Draws are represented in validation, points, standings and UI rather than as a special league mode.
- Head-to-head exists once in standings and is not reimplemented by promotion.
- Same-rank unresolved ties preserve the promotion/relegation safety invariant.
- No automatic remote D1 migration is introduced contrary to the current release guardrail.
- No `TBD`, placeholder behavior or unapproved fourth competitive tie-breaker remains.
