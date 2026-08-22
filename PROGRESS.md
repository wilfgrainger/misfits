# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `main`  
**Current focus:** full canonical user-story validation and next implementation handoff  
**Latest production feature release:** PR #17 `feat: configurable Best-of scoring and head-to-head standings`  
**Production merge SHA:** `3185019780f9560917dd22bb9326c342662ba420`

## Authority

- Product truth: `PRODUCT.md`.
- Strategic/platform guardrail: `VISION.md`.
- UI authority: `DESIGN.md` and the repo-local Impeccable skill.
- Canonical story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`.
- Prior detailed delivery audit through ADM-070: `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`.
- **Current full 150-story validation authority:** `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`.
- Approved scoring design: `docs/superpowers/specs/2026-08-22-configurable-match-scoring-design.md`.
- Production migration evidence: `docs/operations/evidence/2026-08-22-d1-migration-0005.md`.

## Full user-story validation checkpoint

All **150 canonical stories** have now been re-evaluated against current `main`, implementation paths and available focused/relevant automated evidence.

| Audience | Total | VERIFIED | PARTIAL | MISSING |
|---|---:|---:|---:|---:|
| Admin | 88 | 82 | 5 | 1 |
| Player | 55 | 29 | 7 | 19 |
| Public | 7 | 6 | 0 | 1 |
| **Total** | **150** | **117** | **12** | **21** |

**Current verified completion: 117 / 150 = 78%.**

Do **not** claim 150/150 complete. Historical `DELIVERED` labels in the canonical catalogue are not evidence where the 22 August validation ledger differs.

### PARTIAL stories

- Admin: `ADM-075`, `ADM-081`, `ADM-084`, `ADM-087`, `ADM-088`.
- Player: `PLY-009`, `PLY-012`, `PLY-016`, `PLY-022`, `PLY-037`, `PLY-038`, `PLY-050`.

### MISSING stories

- Admin: `ADM-083`.
- Player: `PLY-014`, `PLY-023`, `PLY-024`, `PLY-026`, `PLY-027`, `PLY-028`, `PLY-029`, `PLY-030`, `PLY-031`, `PLY-032`, `PLY-033`, `PLY-034`, `PLY-035`, `PLY-036`, `PLY-039`, `PLY-040`, `PLY-052`, `PLY-053`, `PLY-055`.
- Public: `PUB-005`.

## Most important audit finding: player fixtures are not player-accessible

This is the main reason the player completion number is much lower than the historical catalogue implied.

Current client path:

```text
PlayerLeague
  -> ApiClient.fixtures(leagueId)
  -> GET /api/admin/competition/leagues/:leagueId/fixtures
```

Current server authority:

```text
routes.use('/api/admin/*', requireUser, requireAdmin)
```

Therefore a normal `PLAYER` receives **403** when the player workspace tries to load fixtures. `PlayerLeague` currently catches that failure and substitutes `{ fixtures: [] }`, so the defect is visually disguised as “no fixtures”.

Consequences include the incomplete fixture-first cluster `PLY-026` through `PLY-040`:

- players cannot see their real fixtures or league fixtures;
- outstanding/pending/disputed/completed/void fixture UX is not usable by normal players;
- played/remaining and league-progress counts do not exist;
- the fixture-first result button cannot be reached by a normal player;
- the legacy free-form `Add result` opponent selector still appears even though the server correctly rejects arbitrary result creation once persisted fixtures exist;
- the submitting player's own PENDING result is not rendered because the current pending filter only selects opponent-submitted results.

Do not weaken the admin route guard. The repair should introduce permission-safe player/public read contracts with league visibility/membership checks, then make the player result flow truly fixture-first.

## Other important incomplete areas

### Player standings and movement

- `PLY-022`: backend tie rules/shared ranks are correct, but player UI does not surface promotion-boundary ambiguity.
- `PLY-023` / `PLY-024`: promotion/relegation zones are not shown in player standings.
- `PLY-052` / `PLY-053`: player has no provisional vs approved movement surface.
- `PLY-055`: no explicit next-season placement-pending/unassigned state.

### Player context/history

- `PLY-012`: default league selection is ordered OPEN/updated/name rather than by explicit season `is_current`, so current-season preference is not guaranteed.
- `PLY-014`: signed-in players cannot browse other PUBLIC leagues; signed-in workspace shows only `myLeagues`.
- `PLY-016`: visible rules omit meetings-per-pair and do not consistently show the derived winning target outside result entry.
- `PLY-050`: old table/results are reachable through historical league tabs, but complete historic fixture context is not.

### Admin

- `ADM-075`: projection is labelled provisional/final, but `promotion.ambiguities` is not rendered in admin UI.
- `ADM-081`: fixture generation validates one league's roster, not the whole-season rule that all active competitors are assigned before fixtures are committed anywhere.
- `ADM-083`: `seasonHealth()` computes unassigned/outstanding/pending/dispute counts but is not exposed by route/UI.
- `ADM-084`: confirmation coverage/focus management is incomplete; fixture void/restore is direct.
- `ADM-087` / `ADM-088`: repo Impeccable review still records sub-44px mobile controls and desktop behaving like a widened mobile composition.

### Public

- `PUB-005`: public league view has standings/results/share but no permission-safe public fixtures API or fixture rendering.

## Positive corrections from the audit

The audit also found stale pessimistic labels. Most notably:

- `PLY-020` is now **VERIFIED** after PR #17: the player table exposes position, player, played, W-D-L, total legs won, average and points, plus the published tie-break explanation.
- Best-of/draw scoring work remains fully verified for `ADM-024`, `ADM-025` and `ADM-070`.

## Recommended implementation sequence

### Chunk 5A — P0 fixture-first player repair

Start here.

1. Add an authenticated player fixture read using membership/admin permission, without exposing private leagues.
2. Add PUBLIC fixture read only for PUBLIC leagues for `PUB-005`.
3. Change player Fixtures UX to separate **My Fixtures** from **League Fixtures**.
4. Surface outstanding, pending, disputed, confirmed and void state with result context where applicable.
5. Add player played/remaining and league played/total/outstanding counts.
6. Remove/disable the legacy free-form opponent result path when persisted fixtures exist; result entry must start from an outstanding fixture.
7. Show the submitting player's own pending result.
8. TDD-close `PLY-026`–`PLY-040` as appropriate, then re-audit dependent stories.

### Chunk 5B — P0 competition lifecycle safety

- Close `ADM-081` with whole-season placement readiness before fixture commit.
- Close `ADM-084` with complete destructive-action confirmation and accessible focus behavior.

### Chunk 5C — standings/movement UX

Close `PLY-022`, `PLY-023`, `PLY-024`, `PLY-052`, `PLY-053`, `PLY-055` and admin ambiguity display `ADM-075`.

### Chunk 5D — operational/responsive polish

Wire `ADM-083`, resolve player context/history gaps, then perform explicit mobile/desktop acceptance work for `ADM-087`/`ADM-088`.

## Fresh verification after the audit

The production `main` workflow was freshly re-run after the story validation rather than relying only on historical green evidence.

Workflow run: `32563097678` (re-run attempt of the production merge workflow).

Fresh jobs:

- `verify` job `97010521272`: **success**.
- Wrangler types: **success**.
- TypeScript: **success**.
- Full Vitest suite: **success**.
- Production build: **success**.
- dependent `Deploy Worker` job `97010599029`: **success**.

This means the baseline is technically green while 33 story acceptances remain incomplete. The missing/partial verdict is therefore a product/acceptance audit result, not a failing-build result.

## PR #17 / production release checkpoint

PR #17 remains fully merged/deployed. Do not reopen it unless a new regression is found.

- Final feature head: `a0d88bb48a16e160d564524938b8e725412ec129`.
- Final PR CI: `32562994388`.
- Production merge: `3185019780f9560917dd22bb9326c342662ba420`.
- Production D1 migration 0005 was applied and verified before merge.
- Main production deployment is green.

## Next-agent instruction

1. Start from current `main`.
2. Read `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md` before trusting any old story status label.
3. Treat canonical `docs/superpowers/specs/2026-08-21-user-stories.md` as story wording/acceptance authority, but use the 22 August validation ledger as current completion state.
4. Start with **Chunk 5A**, the fixture-first player repair.
5. Use Superpowers brainstorming/design gate for any behaviour change, then RED → GREEN TDD.
6. Update the validation ledger, canonical status where appropriate, and this `PROGRESS.md` at every durable checkpoint.
7. Never mark a story VERIFIED from a catalogue label alone.
8. Keep remote D1 migrations explicit and separate from ordinary Worker deployment.
