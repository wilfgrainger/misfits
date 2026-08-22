# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `spec/ux-compression`  
**Draft PR:** #168  
**Current focus:** Release 1 UX Compression, Task 2 public experience  
**Production baseline:** `main` at `5d8e351ad4995305eb8970427846f2b821366a98`; PR #17 scoring release remains deployed

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- UI: `DESIGN.md` + repo-local Impeccable skill
- Approved Release 1 design: `docs/superpowers/specs/2026-08-22-ux-compression-design.md`
- Release 1 implementation plan: `docs/superpowers/plans/2026-08-22-ux-compression.md`
- Canonical story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Current 150-story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues: operational story open/closed state

## Parked stories

All 150 stories have GitHub issues. Release 1 must not close the incomplete ones.

| Audience | Total | Verified/closed | Incomplete/open |
|---|---:|---:|---:|
| Admin | 88 | 82 | 6 |
| Player | 55 | 29 | 26 |
| Public | 7 | 6 | 1 |
| **Total** | **150** | **117** | **33** |

Incomplete = **12 PARTIAL + 21 MISSING**. The 33 remain parked until later releases.

Open Admin: `ADM-075`, `ADM-081`, `ADM-083`, `ADM-084`, `ADM-087`, `ADM-088`.

Open Player: `PLY-009`, `PLY-012`, `PLY-014`, `PLY-016`, `PLY-022`, `PLY-023`, `PLY-024`, `PLY-026`, `PLY-027`, `PLY-028`, `PLY-029`, `PLY-030`, `PLY-031`, `PLY-032`, `PLY-033`, `PLY-034`, `PLY-035`, `PLY-036`, `PLY-037`, `PLY-038`, `PLY-039`, `PLY-040`, `PLY-050`, `PLY-052`, `PLY-053`, `PLY-055`.

Open Public: `PUB-005`.

## Release 1 execution

Superpowers state: design **APPROVED**; plan **WRITTEN**; execution is inline `executing-plans` with RED → GREEN TDD. Impeccable is the UI handoff authority; Cave Pony is the final simplicity/user audit.

### Task 1 — Player chrome, navigation and safe result defaults — GREEN

Delivered:

- member workspace now reuses scrollable `content-tabs` / `content-tab` navigation;
- shared content-tab minimum touch height raised from 42px to 44px;
- all six existing member destinations remain reachable; `Add result` remains because fixture-first stories are parked;
- result leg scores start blank and reset blank after successful submission or league change;
- recoverable failures continue to preserve entered values because the catch path does not reset form state;
- removed redundant signed-in account heading/role/incorrect `myLeagues.length` “season(s)” badge;
- retained meaningful selected competition context (`Current season: <league> · <season> · <state> · <visibility>`).

RED evidence:

- CI `32582699248`: Wrangler/typecheck passed; **238 existing tests passed, exactly 2 new tests failed** on old segmented navigation and prefilled score.
- CI `32582988576`: after the first GREEN slice, **240 tests passed, exactly 1 new test failed** on the redundant account badge/heading.

GREEN evidence:

- clean CI `32583252880`: Wrangler types **PASS**, client+Worker TypeScript **PASS**, **241/241 tests PASS**, production build **PASS**, PR deploy correctly skipped.

Relevant commits include:

- RED player contract `04d32996860145556faeb74779844606302efa3d`
- player GREEN `5a12e71ee6557b7953221cab7b0f514dbe21839d`
- compact-shell RED `56d1f2f3d3259397fc13093c4fc51d0474d6edc9`
- compact-shell GREEN `e25000233921f17028831a2697026486684d6164`

### Task 2 — Public experience — NEXT

RED-test then deliver:

- distinguish public API failure from a genuine zero-public-league state;
- visible error + Retry for failed public league-list load;
- keep selected-league detail failures visible;
- change league-specific action copy from `Share season` to `Share league`;
- compress signed-out intro only where it brings the table forward without hiding Google sign-in.

No API/schema change.

### Tasks 3–7

3. Integrate `AdminResultsWorkflow` directly into the canonical admin desk; remove portal/event-query shim.  
4. Use actual fixture player names in admin result entry; progressively disclose infrequent Season/League actions.  
5. Prove/remove dead `AdminLeagueDesk`, `react-router-dom`, `zod` where safe.  
6. Align story/vision authority and update handoff.  
7. Impeccable review, Cave Pony final audit, full repository verification, PR finish/merge.

## Next five releases

1. **UX Compression** (current): reduce friction without closing parked stories.
2. **Fixture-First Player Experience**: permission-safe player/public fixture reads, My/League Fixtures, progress/status, fixture-first entry, correct fixed-A/B score mapping, own pending result. Expected impact: much of `PLY-026`–`PLY-040` + `PUB-005`.
3. **Standings, Movement & Season Context**: movement zones/ambiguity/provisional-v-final, explicit current season, public league browsing, full rule context.
4. **Admin Competition Readiness & Safety**: whole-season readiness, `seasonHealth()`, operational counts, accessible destructive actions.
5. **History, Responsive Acceptance & Final Story Closure**: historic fixture context, viewport/touch acceptance, revalidate all 150 issues and close only fully evidenced stories.

## Parked root cause for Release 2

Current player fixture path is invalid for normal players:

```text
PlayerLeague
  -> ApiClient.fixtures(leagueId)
  -> GET /api/admin/competition/leagues/:leagueId/fixtures
  -> /api/admin/* requires ADMIN
```

A normal PLAYER receives 403 and the client currently swallows that into an empty fixture list. **Do not weaken the admin guard.** Release 2 adds a permission-safe read contract.

Also before fixture-first entry becomes reachable: `Your/Their` inputs must be mapped correctly to the fixture's fixed Player A/B order to avoid the latent Player-B score reversal.

## Baseline / release guardrails

- No D1/schema change is planned for Release 1.
- No new router, state framework, component library, backend service or Cloudflare product.
- Preserve Worker authentication/authorization, same-origin mutation checks, competition invariants and accessibility.
- Fresh production-main baseline before Release 1: workflow `32563097678`, verify/build/deploy all success.

## Next-agent instruction

1. Continue PR #168 from Task 2.
2. Read the approved design and plan before edits.
3. Keep the 33 incomplete story issues open throughout Release 1.
4. Use RED → GREEN for each behavior change; checkpoint this file after durable tasks.
5. Do not make the parked fixture flow more reachable during UX compression.
6. Run repo-local Impeccable before UI handoff, then Cave Pony final audit.
7. Merge only a freshly verified final PR head.
