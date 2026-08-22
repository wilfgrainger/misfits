# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `spec/ux-compression`  
**Current focus:** approved Cave Pony UX compression, implementation planning complete  
**Draft PR:** #168 `docs: define Cave Pony UX compression release`  
**Latest production feature release:** PR #17 `feat: configurable Best-of scoring and head-to-head standings`  
**Production merge SHA:** `3185019780f9560917dd22bb9326c342662ba420`

## Current gate

The user explicitly approved the written UX compression design on 22 August 2026.

Authorities:

- Design: `docs/superpowers/specs/2026-08-22-ux-compression-design.md`
- Implementation plan: `docs/superpowers/plans/2026-08-22-ux-compression.md`
- Canonical story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Current 150-story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues: operational open/closed story state

Superpowers state:

- brainstorming/design gate: **APPROVED**;
- implementation plan: **WRITTEN**;
- next execution mode: inline `executing-plans` with RED → GREEN TDD;
- UI authority before handoff: repo-local Impeccable;
- final simplicity gate: Cave Pony audit.

## Parked user stories

All 150 canonical stories have GitHub issues.

| Audience | Total | Verified/closed | Incomplete/open |
|---|---:|---:|---:|
| Admin | 88 | 82 | 6 |
| Player | 55 | 29 | 26 |
| Public | 7 | 6 | 1 |
| **Total** | **150** | **117** | **33** |

The 33 open stories remain deliberately parked during the UX compression release. Do not close them because adjacent UI improves.

Incomplete state remains 12 PARTIAL + 21 MISSING.

### Open Admin

`ADM-075`, `ADM-081`, `ADM-083`, `ADM-084`, `ADM-087`, `ADM-088`.

### Open Player

`PLY-009`, `PLY-012`, `PLY-014`, `PLY-016`, `PLY-022`, `PLY-023`, `PLY-024`, `PLY-026`, `PLY-027`, `PLY-028`, `PLY-029`, `PLY-030`, `PLY-031`, `PLY-032`, `PLY-033`, `PLY-034`, `PLY-035`, `PLY-036`, `PLY-037`, `PLY-038`, `PLY-039`, `PLY-040`, `PLY-050`, `PLY-052`, `PLY-053`, `PLY-055`.

### Open Public

`PUB-005`.

## Next five planned releases

### Release 1 — UX Compression

**Goal:** make the existing Misfits experience faster, calmer and safer without reopening the 33 parked stories.

Scope:

- compress repeated signed-in player chrome;
- mobile-safe 44px scrollable member navigation;
- blank result-score defaults;
- explicit public load error + Retry;
- `Share league` wording;
- integrate admin Results directly, deleting the portal/event-query shim;
- use actual player names in admin result entry;
- progressively disclose infrequent admin create/copy/delete actions;
- prove/remove dead `AdminLeagueDesk`, `react-router-dom`, `zod` where safe;
- align story/product documentation authority;
- Impeccable review + Cave Pony final audit.

No schema/API changes.

### Release 2 — Fixture-First Player Experience

**Goal:** repair the largest shared root cause behind the parked player stories.

Expected scope:

- permission-safe authenticated player fixture reads;
- permission-safe public fixture reads for PUBLIC leagues;
- My Fixtures vs League Fixtures;
- outstanding/pending/disputed/confirmed/void states;
- played/remaining and league progress counts;
- result entry starts from an outstanding fixture;
- remove the free-form opponent path when persisted fixtures exist;
- map `Your/Their` score input correctly to fixed fixture Player A/B order;
- show submitter's own pending result.

Expected story impact: much of `PLY-026`–`PLY-040` plus `PUB-005`.

### Release 3 — Standings, Movement & Season Context

**Goal:** make promotion/relegation and season context understandable to players without changing the already-correct competition engine.

Expected scope:

- promotion/relegation zones in standings;
- tie-boundary ambiguity shown rather than hidden;
- provisional movement vs confirmed next-season placement;
- placement-pending/unassigned state;
- current-season selection uses explicit `is_current` authority;
- signed-in browsing of other public leagues;
- complete rule context, including meetings per pair.

Expected story impact: `PLY-012`, `PLY-014`, `PLY-016`, `PLY-022`, `PLY-023`, `PLY-024`, `PLY-052`, `PLY-053`, `PLY-055`, plus admin ambiguity display `ADM-075`.

### Release 4 — Admin Competition Readiness & Safety

**Goal:** turn existing admin backend capability into a clearer whole-season operating cockpit.

Expected scope:

- whole-season placement readiness before fixture commit;
- expose `seasonHealth()` through a focused admin surface;
- outstanding/pending/disputed/unassigned readiness summary;
- complete accessible confirmation/focus handling for destructive fixture operations;
- resolve remaining admin acceptance gaps without adding infrastructure.

Expected story impact: `ADM-081`, `ADM-083`, `ADM-084`.

### Release 5 — History, Responsive Acceptance & Final Story Closure

**Goal:** finish the product rather than add another subsystem.

Expected scope:

- complete previous-season fixture/history context;
- close remaining player acceptance gaps (`PLY-009`, `PLY-037`, `PLY-038`, `PLY-050` as applicable after revalidation);
- explicit 320/375/768/desktop acceptance pass;
- mobile touch-target and desktop composition proof;
- fresh validation of all 150 GitHub story issues;
- comment evidence on every still-open issue;
- close only stories whose full acceptance criteria pass;
- final Impeccable + Cave Pony review.

Expected story impact: remaining `ADM-087`, `ADM-088` and residual player gaps, with a target of 150/150 only if evidence genuinely supports it.

## Release-order rationale

1. **Compress first** so new work lands into the right UX rather than preserving old clutter.
2. **Fix fixtures second** because one authority defect causes the largest group of open player stories.
3. **Expose movement third** because the underlying engine is already correct; this is mostly user visibility/context.
4. **Harden admin readiness fourth** once player weekly flow is coherent.
5. **Finish history/responsive acceptance last** and then revalidate the entire story set once, rather than repeatedly reopening the same audit.

## Known parked root cause

Player fixtures are currently not player-accessible:

```text
PlayerLeague
  -> ApiClient.fixtures(leagueId)
  -> GET /api/admin/competition/leagues/:leagueId/fixtures
  -> /api/admin/* requires ADMIN
```

A normal PLAYER receives 403 and the client currently swallows that into an empty fixture list. Do not weaken the admin guard. Release 2 must add a permission-safe player read contract.

The same future flow has a latent score-order risk: the UI currently thinks in `Your legs / Their legs`, while the server stores fixed fixture Player A/B order. Release 2 must map those correctly before fixture-first entry is enabled.

## Baseline verification

Fresh production-main verification before the UX pass:

- workflow `32563097678`;
- Wrangler types: success;
- TypeScript: success;
- full Vitest suite: success;
- production build: success;
- Deploy Worker: success.

## Next-agent instruction

1. Continue from `spec/ux-compression` and PR #168.
2. Read the approved UX design and implementation plan above.
3. Use Superpowers `executing-plans` for Release 1.
4. Follow RED → GREEN task-by-task; checkpoint `PROGRESS.md` after durable steps.
5. Keep all 33 incomplete story issues open throughout Release 1.
6. Use Impeccable for changed UI surfaces before handoff.
7. Finish with Cave Pony audit and full repository verification.
8. Do not add schema, dependencies, services or abstractions unless the approved release explicitly requires them and simpler options fail.
