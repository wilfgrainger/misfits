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

Task 1 is complete. The master catalogue and story audit now reflect the approved Best-of/draw/tie rules rather than the superseded decisive-only model. ADM-024 and ADM-025 are reopened until the new behavior is fully evidenced, and ADM-070 is no longer product-gated but remains undelivered until its standings implementation is GREEN.

## TDD delivery checkpoint

### Task 2 — schema + shared scoring contract — GREEN

- Migration: `migrations/0005_configurable_match_scoring.sql`.
- Shared contract: `src/server/domain/scoring.ts`.
- Compatible validators accept `maxLegs`, win/draw/loss points and derive `targetLegs`.
- Initial TypeScript seam in season cloning was root-caused and fixed without weakening the contract.
- GREEN CI: `32555367533` passed Wrangler types, TypeScript, complete tests and production build.

### Task 3 — Best-of result validation — GREEN

- Focused RED CI `32555425552`: 206 assertions passed and exactly 9 score-rule assertions failed.
- `validatePlayerResult` now supports odd decisive formats plus even exhausted draws.
- Best of 6 accepts `4-0`, `4-1`, `4-2`, `3-3`; rejects incomplete/impossible states such as `3-2`, `4-3`, `4-4`, `5-1`.
- GREEN CI: `32555506609` passed Wrangler types, TypeScript, complete tests and production build.

### Task 4 — persistence/API/rule-lock integration — GREEN candidate, final gate running

Focused RED CI `32555672236` preserved **218 passing tests** and isolated exactly **7 intended failures**:

1. scoring fields were not persisted/round-tripped;
2. season clone reconstructed legacy target legs instead of copying the full scoring contract;
3. fixture settlement still validated through numeric `target_legs`;
4. maxLegs/draw/loss changes were not locked after competition history existed.

Production candidate commit: `68324c44f92b000e9d43c76adb84b2e781f98ab6`.

It now:

- persists and reads `max_legs`, `points_per_win`, `points_per_draw`, `points_per_loss`;
- copies the complete scoring rules when cloning season structure;
- validates fixture-backed and compatibility result paths through one persisted scoring adapter;
- locks every result-interpreting scoring rule once fixtures/results exist;
- exposes Best-of plus win/draw/loss values through public/admin league contracts while retaining `targetLegs` compatibility.

A temporary Actions-assisted patch mechanism was used only because the chat container cannot resolve GitHub. It self-removed from the production candidate commit. The bot-authored commit itself did not receive a normal verification job, so this documentation checkpoint intentionally triggers a standard PR CI run over the exact candidate before Task 4 can be called GREEN.

## Next execution steps

1. Require a fully green normal CI gate on the Task 4 candidate plus this checkpoint.
2. If failures are limited to old in-memory D1 fakes misreading the new bind order, update only those test adapters and re-run the complete gate.
3. Once Task 4 is GREEN, start Task 5 with focused RED tests for configurable W/D/L standings points and the approved two-way / mini-table head-to-head ranking.
4. Keep username/player ID out of competitive rank decisions.
5. Then make promotion/relegation consume the shared authoritative rank before UI work.
6. Keep this file, the master catalogue and audit current at durable checkpoints.

## Production migration guardrail

The normal `main` Worker deployment intentionally does **not** apply remote D1 migrations automatically. Preserve that boundary.

Before schema-dependent implementation is merged/deployed, production D1 must explicitly receive `migrations/0005_configurable_match_scoring.sql` through the authorised remote-migration process. Do not weaken `tests/release/deploy-workflow.test.ts` to bypass this gate.

## Known operational constraint

The chat container cannot resolve GitHub DNS. The isolated remote branch plus GitHub Actions are the execution/verification environment.
