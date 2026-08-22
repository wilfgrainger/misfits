# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `spec/ux-compression`  
**Current focus:** Cave Pony UX compression design, written-spec approval gate  
**Latest production feature release:** PR #17 `feat: configurable Best-of scoring and head-to-head standings`  
**Production merge SHA:** `3185019780f9560917dd22bb9326c342662ba420`

## Current UX compression checkpoint

The user has explicitly parked the **33 incomplete canonical stories** and approved a separate Cave Pony user-experience compression pass.

The approved in-chat direction is written at:

- `docs/superpowers/specs/2026-08-22-ux-compression-design.md`

Current Superpowers gate:

- architectural path selected because the work changes player navigation hierarchy and removes an admin composition layer;
- in-chat Cave Pony compression direction approved by the user;
- design branch: `spec/ux-compression`;
- draft design PR: #168;
- **no production implementation may start until the written spec is explicitly approved**;
- after written-spec approval, invoke Superpowers `writing-plans`, then execute RED → GREEN TDD.

### UX compression scope

- keep the current Misfits ledger visual language;
- reduce repeated signed-in player chrome;
- use mobile-safe scrollable 44px member navigation;
- remove dangerous prefilled result scores;
- add explicit public load failure + retry and correct `Share league` wording;
- integrate `AdminResultsWorkflow` directly into the canonical admin desk and remove the portal/event-query shim;
- label admin result fields with actual fixture player names;
- use minimal progressive disclosure for secondary admin actions;
- prove and remove dead UI/dependencies (`AdminLeagueDesk`, `react-router-dom`, `zod`) only where truly unused;
- align story/document authority without rewriting historical evidence.

### Explicit non-goal

Do **not** implement or close the 33 parked story issues as part of this release. In particular, do not add player/public fixture APIs, promotion/relegation player surfaces or season health under the guise of UI polish.

## User-story issue mirror

All 150 canonical user stories now have GitHub issues.

- 117 VERIFIED stories are closed as completed.
- 33 incomplete stories remain open: 12 PARTIAL + 21 MISSING.
- Open distribution: 6 Admin + 26 Player + 1 Public.

Operational rule going forward:

- canonical story Markdown owns ID, wording, acceptance criteria and priority;
- GitHub issue state owns operational open/closed tracking;
- dated validation documents are evidence snapshots;
- `PROGRESS.md` summarises current handoff truth.

## Full user-story validation checkpoint

All **150 canonical stories** were re-evaluated against current `main`, implementation paths and available focused/relevant automated evidence before this UX pass.

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

## Most important parked product finding: player fixtures are not player-accessible

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

Therefore a normal `PLAYER` receives **403** when the player workspace tries to load fixtures. `PlayerLeague` catches that failure and substitutes `{ fixtures: [] }`.

This remains parked. Do not weaken the admin route guard. Future repair should introduce permission-safe player/public reads with league visibility/membership checks, then make result entry fixture-first.

The Cave Pony UX audit also identified a latent score-order issue for that future flow: `PlayerLeague` labels fixture inputs as `Your legs / Their legs`, while the server persists fixed fixture Player A / Player B ordering. Before player fixtures become reachable, client input must be mapped to fixture participant order.

## Fresh baseline verification before UX design

The production `main` workflow was freshly re-run after the story validation.

Workflow run: `32563097678`.

Fresh jobs:

- `verify`: **success**;
- Wrangler types: **success**;
- TypeScript: **success**;
- full Vitest suite: **success**;
- production build: **success**;
- dependent `Deploy Worker`: **success**.

The baseline is technically green while 33 story acceptances remain parked.

## PR #17 / production release checkpoint

PR #17 remains fully merged/deployed. Do not reopen it unless a new regression is found.

- Final feature head: `a0d88bb48a16e160d564524938b8e725412ec129`.
- Final PR CI: `32562994388`.
- Production merge: `3185019780f9560917dd22bb9326c342662ba420`.
- Production D1 migration 0005 was applied and verified before merge.
- Main production deployment is green.

## Next-agent instruction

1. Continue from `spec/ux-compression` while the written-spec review gate is active.
2. Read `docs/superpowers/specs/2026-08-22-ux-compression-design.md`.
3. Do not implement production code until the user explicitly approves the written spec.
4. After approval, invoke Superpowers `writing-plans` and create a detailed implementation plan.
5. Use RED → GREEN TDD for all behavior changes.
6. Keep the 33 incomplete story issues parked and open unless the user separately resumes them.
7. For every UI change, use the repo-local Impeccable authority before handoff.
8. Finish with a Cave Pony audit: each material finding actioned, deferred with trigger, or rejected with evidence.
9. Update `PROGRESS.md` at every durable checkpoint.
10. Never weaken Worker authorization, D1 invariants or existing accessibility guarantees in the name of simplification.
