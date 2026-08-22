# Misfits 501 Progress

**Updated:** 22 August 2026
**Current branch:** `spec/configurable-match-scoring-v2`
**Current base:** `main` at `39490132c2f8aecef880bdfb138b2006c9e12734`
**Current scope:** written-spec review for configurable Best-of match scoring and the now-approved ADM-070 tie-break rule

## Authority

- Product truth: `PRODUCT.md`.
- Strategic/platform guardrail: `VISION.md`.
- UI authority: `DESIGN.md` and the repo-local Impeccable skill.
- Canonical backlog: `docs/superpowers/specs/2026-08-21-user-stories.md`.
- Approved scoring design: `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`.
- Story-level evidence: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`.
- Delivery authority: Superpowers with brainstorming/design approval, TDD, systematic debugging and verification-before-completion.

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

The club has now approved the competitive standings tie-break order:

1. **League points**.
2. **Total legs won**.
3. **Head-to-head**.

For two tied players, head-to-head uses points earned in confirmed matches against each other. For three or more tied players, use a mini-table containing only confirmed matches among the tied group. If the approved criteria still cannot separate players, they retain the same competitive rank.

A stable username/player-id order may be used only for deterministic display and must never decide promotion/relegation.

ADM-070 is therefore no longer product-gated. It remains **not delivered** until RED/GREEN implementation and verification evidence exist.

## Approved league match/scoring evolution

The approved design also expands league configuration so a league can use even Best-of formats and configurable draw/loss points.

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
- Win, draw and loss points are configurable per league.
- Existing legacy `target_legs = T` migrates to `max_legs = (T * 2) - 1` so existing competition meaning is preserved.

The full approved design is `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`.

## Current Superpowers gate

The design has been approved conversationally and committed, but Superpowers requires review of the written spec before implementation planning begins.

Do not write production code for these rules until the written spec is approved.

After written-spec approval, the next step is to invoke the Superpowers writing-plans workflow. The implementation plan must update the canonical master stories first, specifically ADM-024, ADM-025 and ADM-070, before changing production code.

## Superseded delivery line

- PR #9 is closed, not merged, and retired.
- `feat/master-user-stories-100` and `feat/master-user-stories-100-5652729088464527970` remain stale/non-authoritative.
- Do not resume those branches.
- The empty `spec/configurable-match-scoring` branch was superseded by `spec/configurable-match-scoring-v2`; do not use the empty branch.

## Resume instructions

1. Review `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md` with the user.
2. Once the written spec is explicitly approved, invoke `writing-plans` and create the implementation plan.
3. First implementation task: amend the canonical master user stories and story audit for ADM-024, ADM-025 and ADM-070.
4. Continue strict story-order delivery with focused evidence, RED for real gaps, minimal GREEN and fresh complete verification.
5. Keep this file, the master stories and the audit current at every durable checkpoint.

## Known operational constraint

The chat container cannot resolve GitHub DNS. GitHub repository actions and GitHub Actions are the execution/verification environment.
