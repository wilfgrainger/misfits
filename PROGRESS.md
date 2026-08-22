# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `main`  
**Latest production feature release:** PR #17 `feat: configurable Best-of scoring and head-to-head standings`  
**Production merge SHA:** `3185019780f9560917dd22bb9326c342662ba420`

## Authority

- Product truth: `PRODUCT.md`.
- Strategic/platform guardrail: `VISION.md`.
- UI authority: `DESIGN.md` and the repo-local Impeccable skill.
- Canonical backlog: `docs/superpowers/specs/2026-08-21-user-stories.md`.
- Story-level evidence: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`.
- Approved scoring design: `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`.
- Approved implementation plan: `docs/superpowers/plans/2026-08-22-configurable-match-scoring.md`.
- Production migration evidence: `docs/operations/evidence/2026-08-22-d1-migration-0005.md`.

## Durable release checkpoint

PR #17 is **merged and deployed**. No PR #17 release action remains pending.

Final verified feature head:

- Head SHA: `a0d88bb48a16e160d564524938b8e725412ec129`.
- Final PR CI: `32562994388`.
- Wrangler types: passed.
- TypeScript: passed.
- Full Vitest suite: passed.
- Production build: passed.

Production integration:

- Merge SHA: `3185019780f9560917dd22bb9326c342662ba420`.
- Main CI run: `32563097678`.
- Main `verify` job: **success**.
- Main `Deploy Worker` job: **success**.
- Production Worker target remains `https://darts.graingers.agency`.

## Configurable match-scoring rules now delivered

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
- Best of 6 terminates at `4-0`, `4-1`, `4-2`, or exhausted `3-3` draw.
- Best of 5 remains decisive first-to-3.
- Existing legacy `target_legs = T` maps to `max_legs = (T * 2) - 1`.
- `target_legs` remains a compatibility mirror, not the editable authority.
- Standings order is **Points → total legs won → head-to-head points**.
- Two-player head-to-head aggregates confirmed meetings between the pair.
- Three-or-more tied players use a mini-table of confirmed matches inside the tied group.
- Players still equal after approved competitive criteria share rank.
- Username/player ID may stabilise display only and never becomes a sporting tie-break.
- Promotion/relegation consumes authoritative standings rank and blocks when a shared rank crosses a movement boundary.

Canonical story state for this release:

- ADM-024: **DELIVERED · P0 / VERIFIED**.
- ADM-025: **DELIVERED · P0 / VERIFIED**.
- ADM-070: **DELIVERED · P0 / VERIFIED**.

## TDD evidence for PR #17

- Task 2 schema/scoring contract: GREEN `32555367533`.
- Task 3 Best-of validation: RED `32555425552`, GREEN `32555506609`.
- Task 4 persistence/API/rule locks: RED `32555672236`, GREEN `32559244717` with 225 tests.
- Task 5 standings/head-to-head: RED `32559458511`, GREEN `32560372522` with 230 tests.
- Task 6 promotion rank authority: RED `32560471929`, GREEN `32560541080` with 234 tests.
- Task 7 admin scoring UI: RED `32560656189`, GREEN `32560845059` with 236 tests.
- Task 8 player/public rules: RED `32560958867`, GREEN `32561215701` with 238 tests.
- Task 9 canonical re-audit: clean full gate `32561427365` with 238 tests.
- Post-review cleanup: `3e05ca2be95bb1762b04d00cfd7617bda5a27987`; GREEN `32562784439`.
- Exact final PR-head gate: `32562994388`.

## Review record

A fresh `@codex review` was requested before integration. Codex did **not** return a code review because the account's Codex code-review usage limit had been reached. Do not reinterpret that as Codex approval.

A focused fallback review inspected the migration, scoring/result/standings domains, promotion rank authority, persistence and route compatibility, and admin/player/public presentation. It found one transitional `as never` cast in season cloning. Commit `3e05ca2be95bb1762b04d00cfd7617bda5a27987` removed it, followed by a complete green verification run. No Critical or Important fallback-review defect remained known at merge.

## Production D1 migration — complete

Migration `migrations/0005_configurable_match_scoring.sql` was applied before schema-dependent code was merged.

Production identity:

- Binding: `DB`.
- Database: `misfits`.
- Database ID: `9702b993-f0b7-479b-9679-7e32a1c35214`.

Verification:

- Evidence workflow: `32562916750`.
- Evidence commit: `8553ad63cc52e8afdb552e2bf82365de4c5af3ca`.
- No unapplied migrations remained after verification.
- Remote schema probe successfully selected `max_legs`, `points_per_draw`, and `points_per_loss`.
- The one-shot migration workflow was removed after use.
- Normal `main` Worker deployment remains migration-free by design. Preserve this boundary for future migrations.

## Production smoke note

A post-deploy automated smoke was attempted from a GitHub-hosted runner. Cloudflare's browser challenge intercepted both `/api/health` and `/api/public/leagues` before the requests reached the Worker and returned its `Just a moment...` 403 challenge page.

Treat this as an **automation limitation**, not an application failure. The main Worker deployment job itself is verified successful. A browser/session-capable smoke can be used later if production behaviour needs another independent runtime check.

## Previous audited delivery chunks

- ADM-001–ADM-018: PR #11, merge `c2fd8599615b1687b5746b49ddd86cfd50263225`, final gate `32523295692`.
- ADM-019–ADM-045: PR #12, merge `e1c3957c06d78da782fe865f1015c2898c9a01c9`, final gate `32527554443`.
- ADM-046–ADM-059: PR #13, merge `b1b68d215180951b016f6638a68dedc48a46eed1`, final gate `32528766451`.
- ADM-060–ADM-069: PR #14, merge `eb6d566a01ce86ac6580bdf28b707d1b68739cda`, final gate `32531365934`.
- Results-tab integration fix: PR #15, merge `39490132c2f8aecef880bdfb138b2006c9e12734`, GREEN `32553662981`.
- Scoring design/plan: PR #16, merge `b8d42ea479fd6afc5c754d444704693e85477f55`.

## Next-agent instruction

Do **not** reopen PR #17 release work unless new evidence identifies a defect. Start from `main`, read the canonical user-story catalogue and story-by-story audit, and continue with the next story/audit chunk that is not yet VERIFIED. Preserve strict RED → GREEN TDD, update this file at durable checkpoints, and keep production migrations explicit rather than coupling them to Worker deploys.

## Operational constraint

The chat container used during this release could not resolve GitHub DNS. GitHub Actions and the connected GitHub API were therefore the authoritative execution/verification environment.
