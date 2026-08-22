# Misfits 501 Progress

**Updated:** 22 August 2026
**Current branch:** `feat/configurable-match-scoring`
**Current base:** `main` at `b8d42ea479fd6afc5c754d444704693e85477f55`
**Current PR:** #17 `feat: configurable Best-of scoring and head-to-head standings`
**Current scope:** final PR review/release gate for the approved configurable match-scoring plan

## Authority

- Product truth: `PRODUCT.md`.
- Strategic/platform guardrail: `VISION.md`.
- UI authority: `DESIGN.md` and the repo-local Impeccable skill.
- Canonical backlog: `docs/superpowers/specs/2026-08-21-user-stories.md`.
- Approved scoring design: `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`.
- Approved implementation plan: `docs/superpowers/plans/2026-08-22-configurable-match-scoring.md`.
- Story-level evidence: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`.
- Delivery authority: Superpowers executing-plans + TDD + systematic debugging + verification-before-completion.

## Completed audited chunks

- **Chunk 1, ADM-001–ADM-018:** PR #11 merged as `c2fd8599615b1687b5746b49ddd86cfd50263225`; final gate `32523295692` green.
- **Chunk 2, ADM-019–ADM-045:** PR #12 merged as `e1c3957c06d78da782fe865f1015c2898c9a01c9`; final gate `32527554443` green with 191/191 tests.
- **Chunk 3, ADM-046–ADM-059:** PR #13 merged as `b1b68d215180951b016f6638a68dedc48a46eed1`; final gate `32528766451` green with 196/196 tests.
- **Chunk 4, ADM-060–ADM-069:** PR #14 merged as `eb6d566a01ce86ac6580bdf28b707d1b68739cda`; final gate `32531365934` green.
- **Post-merge Results UI fix:** PR #15 merged into main at `39490132c2f8aecef880bdfb138b2006c9e12734`; GREEN gate `32553662981` with 200/200 tests.
- **Scoring design/plan:** PR #16 merged as `b8d42ea479fd6afc5c754d444704693e85477f55`.

## Approved scoring model

Each league owns:

```text
Best of / maximum legs
Points for win
Points for draw
Points for loss
Matches per pair
```

Rules:

- `legsToWin = floor(maxLegs / 2) + 1`.
- Best of 6 ends at `4-0`, `4-1`, `4-2`, or exhausted `3-3`.
- Best of 5 remains decisive first-to-3.
- Existing `target_legs = T` migrates to `max_legs = (T * 2) - 1`.
- `target_legs` remains a derived compatibility mirror only.
- Competitive standings order is **Points → total legs won → head-to-head**.
- Two-player head-to-head aggregates confirmed meetings between the pair.
- Three-or-more tied players use a mini-table of confirmed matches inside the tied group.
- Still-equal players share competitive rank; username/player ID may stabilise display only.
- Promotion/relegation blocks if a shared rank crosses a movement boundary.

## PR #17 TDD evidence

### Task 2 — schema + shared scoring contract — GREEN

- RED commit `ef185521543cd7db715601493fcebdb433502d07`, CI `32555046374`.
- Migration: `migrations/0005_configurable_match_scoring.sql`.
- Shared contract: `src/server/domain/scoring.ts`.
- GREEN CI `32555367533`.

### Task 3 — Best-of result validation — GREEN

- RED commit `191d8163c9d66cbb5cbf849bf7857449d205e04f`, CI `32555425552`: 206 passed / 9 intended failures.
- Best of 6 accepts `4-0`, `4-1`, `4-2`, `3-3`; rejects incomplete/impossible states.
- GREEN CI `32555506609`.

### Task 4 — persistence/API/rule locks — GREEN

- RED commit `7520b4460ab6fe85b7e35fde97fe1597ea1dd629`, CI `32555672236`: 218 passed / 7 intended failures.
- Full scoring contract persists, clones, round-trips, drives fixture/result validation and locks after competition history exists.
- Final GREEN CI `32559244717`: **225/225 tests across 54 files**, Wrangler types, TypeScript and production build.

### Task 5 — standings + head-to-head — GREEN

- RED commit `2b199e852e20904d5728116a3d90410e8ae247df`, CI `32559458511`: 224 passed / exactly 6 intended failures.
- W-D-L points, total legs won, two-player H2H, 3+ mini-table and shared ranks implemented.
- Leg difference/average are presentation only; username/player ID are display-only.
- GREEN CI `32560372522`: **230/230 tests**, Wrangler types, TypeScript and production build.

### Task 6 — promotion rank authority — GREEN

- RED commit `7b5874829dc09ce4d2eecbc8ff0f620a671ec1dc`, CI `32560471929`: 230 passed / exactly 4 intended failures.
- Promotion/relegation now consumes authoritative standings rank only and blocks shared-rank movement boundaries.
- GREEN CI `32560541080`: **234/234 tests across 55 files**, Wrangler types, TypeScript and production build.

### Task 7 — admin Match & table rules — GREEN

- RED commit `9f3eacd089f50c772e43c93d1f96a1c1d712cd84`, CI `32560656189`: 234 passed / exactly 2 intended failures.
- Admin edits Best-of, matches per pair and W/D/L points; writes never send editable `targetLegs`.
- Derived copy explains even and odd formats, including Best of 6 first-to-4 / 3-3 draw.
- GREEN CI `32560845059`: **236/236 tests across 56 files**, Wrangler types, TypeScript and production build.

### Task 8 — player/public rules and draws — GREEN

- RED commit `05d32241ed5990bb92b5bd128a44b6c9fc4f4a7f`, CI `32560958867`: 235 passed / exactly 3 intended failures.
- Member and public surfaces now show `Best of N · Win X · Draw Y · Loss Z` and `Table: Points → Legs won → Head-to-head`.
- Confirmed equal scores display `Draw`, result-entry help follows Best-of rules, standings show W-D-L and total legs won.
- First candidate left one obsolete historical W-L assertion; only that test contract was aligned.
- Final GREEN CI `32561215701`: **238/238 tests across 57 files**, Wrangler types, TypeScript and production build.

### Task 9 — canonical re-audit — COMPLETE, clean PR gate pending

- Canonical master now marks ADM-024, ADM-025 and ADM-070 **DELIVERED · P0**.
- Story audit marks all three **VERIFIED** with exact RED/GREEN evidence.
- `tests/release/story-adm-070.test.ts` pins promotion-boundary rank authority.
- Temporary audit staging run `32561337615` had **237/238 passing**; the sole failure was the release guardrail detecting the temporary `task9_docs` workflow job. The audit helper restored the canonical two-job workflow and self-removed successfully.
- Current durable branch head before this checkpoint: `615d01180314fe33087280d0b83fb1c840c50e3a`.

## Release gates remaining

1. This checkpoint must receive a clean ordinary CI run: Wrangler types, TypeScript, **238/238 tests**, production build.
2. Request Codex review on PR #17 and address any substantive findings with focused RED → GREEN evidence.
3. Run a fresh final PR-head CI after review changes, if any.
4. **Production D1 migration `0005_configurable_match_scoring.sql` must be explicitly applied and evidenced before merge.** The ordinary Worker deployment intentionally does not run migrations.
5. Only after the migration gate is satisfied may PR #17 be merged; then verify the `main` CI and production Worker deployment.

## Production migration guardrail

Do not merge schema-dependent code before production D1 has received `migrations/0005_configurable_match_scoring.sql` through the authorised remote-migration process. Do not add migration execution to the normal Worker deploy and do not weaken `tests/release/deploy-workflow.test.ts`.

## Known operational constraint

The chat container cannot resolve GitHub DNS. The isolated remote branch plus GitHub Actions are the execution/verification environment.
