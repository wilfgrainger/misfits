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
- **Scoring design/plan:** PR #16 merged as `b8d42ea479fd6afc5c754d444704693e85477f55`; PR-head gate passed Wrangler types, TypeScript, full tests and production build.

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
- Promotion/relegation must block if a shared rank crosses a movement boundary.

## Canonical ledger checkpoint

Task 1 is complete. The master catalogue and story audit now reflect the approved Best-of/draw/tie rules rather than the superseded decisive-only model. ADM-024 and ADM-025 remain reopened until the complete UI/evidence slice is delivered. ADM-070 now has GREEN standings and promotion-rank behavior but remains open until visible explanation and final story audit are complete.

## TDD delivery checkpoint

### Task 2 — schema + shared scoring contract — GREEN

- Migration: `migrations/0005_configurable_match_scoring.sql`.
- Shared contract: `src/server/domain/scoring.ts`.
- Compatible validators accept `maxLegs`, win/draw/loss points and derive `targetLegs`.
- GREEN CI: `32555367533` passed Wrangler types, TypeScript, complete tests and production build.

### Task 3 — Best-of result validation — GREEN

- Focused RED CI `32555425552`: 206 assertions passed and exactly 9 score-rule assertions failed.
- Best of 6 accepts `4-0`, `4-1`, `4-2`, `3-3`; rejects incomplete/impossible states such as `3-2`, `4-3`, `4-4`, `5-1`.
- GREEN CI: `32555506609` passed Wrangler types, TypeScript, complete tests and production build.

### Task 4 — persistence/API/rule-lock integration — GREEN

- Focused RED CI `32555672236`: 218 passing tests plus exactly 7 intended failures.
- Full scoring contract is persisted, cloned, exposed, used for result validation and locked after competition history exists.
- Final GREEN CI `32559244717`: Wrangler types, TypeScript, **225/225 tests across 54 files**, production build.

### Task 5 — configurable standings + approved tie-breaks — GREEN

- Definitive RED CI `32559458511`: **224 passing / exactly 6 intended standings failures** after strengthening the head-to-head cases against accidental legacy-sort agreement.
- Standings now record W-D-L, apply configurable win/draw/loss points, order by points then total legs won, use two-player or tied-group head-to-head points, and assign genuine shared ranks.
- Leg difference and average remain presentation statistics only; username/player ID are stable display order only.
- `getLeagueStandings()` passes the complete persisted scoring contract.
- Final GREEN CI `32560372522`: Wrangler types, TypeScript, **230/230 tests**, production build.

### Task 6 — promotion/relegation rank authority — GREEN

- RED CI `32560471929` preserved **230 passing tests** and produced exactly **4 intended failures** across domain and ADM-070 release evidence.
- RED proved both failure directions:
  - already-separated authoritative ranks were incorrectly reopened when legacy raw metrics matched;
  - genuine shared ranks were incorrectly split when leg difference/average differed.
- `sameCompetitiveRank()` now compares standings `position` only.
- `tiedUserIds` therefore collects every competitor sharing the authoritative boundary rank.
- Existing proposal/finalisation blocking behavior remains unchanged and now consumes standings rank rather than reimplementing tie rules.
- GREEN CI `32560541080`: Wrangler types, TypeScript, **234/234 tests across 55 files**, production build.

## Next execution steps

1. Start Task 7 with RED client/API tests for Best of 6, Win 3, Draw 1, Loss 0 and exact request payloads.
2. Replace editable target-legs UI with one compact **Match & table rules** section and derived explanatory text.
3. Complete Task 8 player/public rule/result/standings presentation with explicit draws, W-D-L and visible tie-break explanation.
4. Re-audit ADM-024, ADM-025 and ADM-070 under Task 9, then run the complete PR/Codex/release gate.
5. Keep this file, the master catalogue and audit current at durable checkpoints.

## Production migration guardrail

The normal `main` Worker deployment intentionally does **not** apply remote D1 migrations automatically. Preserve that boundary.

Before schema-dependent implementation is merged/deployed, production D1 must explicitly receive `migrations/0005_configurable_match_scoring.sql` through the authorised remote-migration process. Do not weaken `tests/release/deploy-workflow.test.ts` to bypass this gate.

## Known operational constraint

The chat container cannot resolve GitHub DNS. The isolated remote branch plus GitHub Actions are the execution/verification environment.
