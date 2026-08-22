# Misfits 501 Progress

**Updated:** 22 August 2026
**Current branch:** `feat/configurable-match-scoring`
**Current base:** `main` at `b8d42ea479fd6afc5c754d444704693e85477f55`
**Current PR:** #17 `feat: configurable Best-of scoring and head-to-head standings`
**Current scope:** execute the approved configurable match-scoring plan under strict RED → GREEN TDD

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
- **Scoring design/plan:** PR #16 merged as `b8d42ea479fd6afc5c754d444704693e85477f55`; docs PR-head gate `32554850181` passed Wrangler types, TypeScript, full tests and production build.

## Approved scoring model

Each league will own:

```text
Best of / maximum legs
Points for win
Points for draw
Points for loss
Matches per pair
```

Rules:

- `legsToWin = floor(maxLegs / 2) + 1`.
- Best of 6 ends at `4-0`, `4-1`, `4-2`, or the exhausted `3-3` draw.
- Best of 5 remains decisive first-to-3.
- Existing `target_legs = T` migrates to `max_legs = (T * 2) - 1`.
- During the migration, `target_legs` may remain only as a derived compatibility mirror, never a second editable authority.
- Competitive standings order is **Points → total legs won → head-to-head**.
- Two-player head-to-head aggregates confirmed meetings between the pair.
- Three-or-more tied players use a mini-table of confirmed matches within the tied group.
- Still-equal players share competitive rank. Username/player ID can stabilise presentation only.
- Promotion/relegation must block if a shared rank crosses a movement boundary.

## Canonical ledger checkpoint

Task 1 of the implementation plan is complete:

- ADM-024 reopened as **PARTIAL · P0** for Best-of/max-leg support.
- ADM-025 reopened as **PARTIAL · P0** for configurable win/draw/loss points.
- ADM-070 product gate removed and story marked **MISSING · P0** until implementation evidence exists.
- Player stories PLY-016, PLY-020, PLY-022 and PLY-037 were aligned so the canonical backlog no longer claims ties are invalid or the old rule set is complete.
- The story audit preserves historical evidence while clearly reopening the superseded acceptance criteria.

## Current TDD checkpoint

First RED contract commit: `ef185521543cd7db715601493fcebdb433502d07`.

RED CI run `32555046374`:

- Wrangler types: PASS.
- TypeScript: PASS.
- Existing behavior: **200 tests passed**.
- New scoring contract: exactly **3 tests failed**.
- Failure 1: validators ignore `maxLegs`, `pointsPerDraw` and `pointsPerLoss` and still return legacy `targetLegs` only.
- Failure 2: negative draw points are currently ignored rather than rejected.
- Failure 3: `migrations/0005_configurable_match_scoring.sql` does not exist.
- Production build skipped because the intentional RED test gate failed.

No production scoring implementation existed at this RED checkpoint.

## Next execution steps

1. Complete Task 2 GREEN: additive migration + shared scoring rules contract + compatible validators.
2. Preserve `targetLegs` temporarily as a derived compatibility mirror so intermediate commits stay buildable; Best of 6 derives `targetLegs = 4`.
3. Run focused/full verification before starting Task 3.
4. Continue Task 3 onward in the committed implementation plan, adding and observing RED before each production behavior change.
5. Keep this file, the master catalogue and audit current at durable checkpoints.

## Production migration guardrail

The normal `main` Worker deployment intentionally does **not** apply remote D1 migrations automatically. Preserve that boundary.

Before schema-dependent implementation is merged/deployed, production D1 must explicitly receive `migrations/0005_configurable_match_scoring.sql` through the authorised remote-migration process. Do not weaken `tests/release/deploy-workflow.test.ts` to bypass this gate.

## Known operational constraint

The chat container cannot resolve GitHub DNS. The isolated remote branch plus GitHub Actions are the execution/verification environment.
