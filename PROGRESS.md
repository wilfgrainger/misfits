# Misfits 501 Progress

**Updated:** 22 August 2026
**Current branch:** `spec/configurable-match-scoring-v2`
**Current base:** `main` at `39490132c2f8aecef880bdfb138b2006c9e12734`
**Current scope:** approved configurable match-scoring design and implementation plan; close documentation PR #16, then execute on a fresh implementation branch

## Authority

- Product truth: `PRODUCT.md`.
- Strategic/platform guardrail: `VISION.md`.
- UI authority: `DESIGN.md` and the repo-local Impeccable skill.
- Canonical backlog: `docs/superpowers/specs/2026-08-21-user-stories.md`.
- Approved scoring design: `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`.
- Approved implementation plan: `docs/superpowers/plans/2026-08-22-configurable-match-scoring.md`.
- Story-level evidence: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`.
- Delivery authority: Superpowers with approved brainstorming/design, writing-plans, TDD, systematic debugging and verification-before-completion.

## Completed audited chunks

- **Chunk 1, ADM-001–ADM-018:** PR #11 merged as `c2fd8599615b1687b5746b49ddd86cfd50263225`; final gate `32523295692` green.
- **Chunk 2, ADM-019–ADM-045:** PR #12 merged as `e1c3957c06d78da782fe865f1015c2898c9a01c9`; final gate `32527554443` green with 191/191 tests.
- **Chunk 3, ADM-046–ADM-059:** PR #13 merged as `b1b68d215180951b016f6638a68dedc48a46eed1`; exact final head `3e6a92a0933685cd7e0d9e4c08b5cd78094a0f19`; final gate `32528766451` green with 196/196 tests across 48 files, Wrangler types, TypeScript and production build.
- **Chunk 4, ADM-060–ADM-069:** PR #14 merged as `eb6d566a01ce86ac6580bdf28b707d1b68739cda`; exact final head `55045b2d203d8677e28bcd450fe4da6373e37a10`; final gate `32531365934` green with Wrangler types, TypeScript, full Vitest suite and production build.

Chunk 4 established fixture-bound official result settlement, pending/disputed result administration, correction/deletion integrity, reconstructable result audit history and confirmed-only season+league-scoped standings.

## Post-merge Chunk 4 review fix — PR #15

PR #15 is merged into `main` at `39490132c2f8aecef880bdfb138b2006c9e12734`.

It fixed the two post-merge PR #14 admin-results integration findings:

1. leaving the Results tab could restore a React-controlled legacy results panel to visible state;
2. the new official-results workflow sat outside the desktop admin grid.

TDD evidence retained from that fix:

- **RED commit:** `33502201efd1e0ebf30ddbafb130af7b67511e88`.
- **RED gate:** `32553585310` — exactly the new regression test failed while 199 existing tests passed.
- **GREEN commit:** `ba26ffa7660dfbf021c9c4a2039789b95bd859f4`.
- **GREEN gate:** `32553662981` — **200/200 tests across 51 files**, Wrangler types, TypeScript and production build all passed.

## ADM-070 product decision — resolved, not implemented

The club-approved competitive standings order is:

1. **League points**.
2. **Total legs won**.
3. **Head-to-head**.

For two tied players, head-to-head uses points earned in confirmed matches against each other. For three or more tied players, use a mini-table containing only confirmed matches among the tied group. If the approved criteria still cannot separate players, they retain the same competitive rank.

A stable username/player-id order may be used only for deterministic display and must never decide promotion/relegation.

ADM-070 is no longer product-gated. It remains **not delivered** until RED/GREEN implementation and verification evidence exist.

## Approved league match/scoring evolution

The league rules model now approved is:

```text
Best of / maximum legs
Points for win
Points for draw
Points for loss
Matches per pair
```

Example:

```text
Best of 6
Win 3
Draw 1
Loss 0
```

Rules:

- `legsToWin = floor(maxLegs / 2) + 1`.
- Best of 6 ends at `4-0`, `4-1` or `4-2`; `3-3` is a draw.
- Best of 5 remains decisive first-to-3.
- Existing legacy `target_legs = T` migrates to `max_legs = (T * 2) - 1` so existing competition meaning is preserved.
- `target_legs` may remain only as compatibility data derived from the authoritative `max_legs` value.

## Approved implementation plan

The user explicitly approved the written design and said `go`. Superpowers `writing-plans` has produced:

`docs/superpowers/plans/2026-08-22-configurable-match-scoring.md`

Execution order is:

1. Amend canonical ADM-024, ADM-025 and ADM-070 story/audit truth.
2. Add D1 scoring migration and shared scoring contract.
3. TDD odd/even result validation.
4. Persist/expose all scoring rules and lock consequential edits.
5. TDD configurable points plus approved standings/head-to-head rank.
6. Make promotion/relegation consume authoritative shared rank.
7. Update admin Match & table rules UI.
8. Update player/public result and standings presentation.
9. Complete story re-audit and full PR verification/review.
10. Satisfy production D1 migration gate, then merge and verify main deploy.

## Production migration guardrail

The current release test intentionally requires the normal `main` Worker deployment **not** to apply remote D1 migrations automatically. Preserve that safety boundary.

`migrations/0005_configurable_match_scoring.sql` will be additive and safe for the old Worker, but production D1 must receive it through an authorised explicit remote-migration process **before** code that selects the new columns is merged/deployed.

Do not silently weaken `tests/release/deploy-workflow.test.ts` merely to make deployment convenient.

## Current Superpowers state

- Brainstorming/design gate: **APPROVED**.
- Written design review: **APPROVED**.
- Implementation plan: **COMMITTED**.
- Production implementation: **NOT STARTED** on this documentation branch.
- Next execution skill: `superpowers:executing-plans` (inline execution, inferred from the user's `go`).

## Superseded delivery line

- PR #9 is closed, not merged, and retired.
- `feat/master-user-stories-100` and `feat/master-user-stories-100-5652729088464527970` remain stale/non-authoritative.
- Do not resume those branches.
- The empty `spec/configurable-match-scoring` branch was superseded by `spec/configurable-match-scoring-v2`; do not use the empty branch.

## Resume instructions

1. Finish documentation PR #16 only after its PR-head verification is green.
2. Merge PR #16, verify the resulting `main` commit, then create a fresh implementation branch from that exact main SHA.
3. Invoke `superpowers:executing-plans` and execute `docs/superpowers/plans/2026-08-22-configurable-match-scoring.md` task-by-task.
4. For every production behavior change, add focused RED evidence first and observe the expected failure before GREEN code.
5. Keep this file, the master stories and story audit current at durable checkpoints.
6. Do not merge/deploy the final schema-dependent implementation until production migration 0005 is explicitly confirmed applied.

## Known operational constraint

The chat container cannot resolve GitHub DNS. GitHub repository actions and GitHub Actions are the execution/verification environment.
