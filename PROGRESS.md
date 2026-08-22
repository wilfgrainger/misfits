# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `spec/ux-compression`  
**PR:** #168  
**Current focus:** Release 1 UX Compression final verification and merge  
**Production baseline:** `main` at `5d8e351ad4995305eb8970427846f2b821366a98`; PR #17 scoring release remains deployed

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- UI: `DESIGN.md` + repo-local Impeccable skill
- Release 1 design: `docs/superpowers/specs/2026-08-22-ux-compression-design.md`
- Release 1 plan: `docs/superpowers/plans/2026-08-22-ux-compression.md`
- Story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Latest story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues own operational open/closed story state.

## Parked stories

**117/150 stories are verified/closed. 33 remain deliberately parked and open: 12 PARTIAL + 21 MISSING.** Release 1 does not close them.

Open distribution: Admin 6, Player 26, Public 1.

## Release 1 UX Compression

Design **APPROVED** and implementation executed with Superpowers RED → GREEN discipline.

Delivered:
- player member navigation is horizontally scrollable with 44px touch targets;
- signed-in duplicate identity/season-count chrome removed while useful season/league context remains;
- player result scores start/reset blank instead of pre-filling a win;
- public league-list failure, genuine-empty state and Retry are explicit; sharing says `Share league`;
- admin Results is composed directly in the canonical competition desk, with no portal/DOM-query bridge;
- official fixture result fields use actual player names;
- infrequent Season/League setup and destructive controls use native progressive disclosure;
- dead `AdminLeagueDesk` production surface removed;
- direct unused `react-router-dom` and `zod` app dependencies removed with npm-generated lockfile alignment;
- `VISION.md`, `DESIGN.md` and the canonical story catalogue now agree on current fixture/product authority;
- duplicate parent Results API loading removed, leaving `AdminResultsWorkflow` as the single Results lifecycle owner;
- obsolete tests coupled to the deleted `AdminLeagueDesk` UI removed while canonical admin suites remain.

Key evidence:
- Task 1 GREEN CI `32583252880`, 241/241 tests + typecheck/build PASS.
- Task 2 GREEN CI `32583582127`, 244/244 tests + typecheck/build PASS.
- Task 3 GREEN CI `32584789691`, 244/244 tests + typecheck/build PASS.
- Task 4 RED `32584898196`, exactly two intended failures; GREEN `32585326632` full gate PASS.
- Task 5 RED `32585394285`, exactly one intended dead-surface contract failure.
- Impeccable deterministic scan on `src/client`: **0 findings**.
- Cave Pony final review found one duplicate Results request; RED evidence showed two GETs where one was required. Clean head `08b2b558e5c5a15961637acbaada28ce5b8d5ccc` removes that duplicate and stale legacy-admin tests.

**Final gate:** this checkpoint commit intentionally triggers the ordinary two-job repository CI on the clean branch head. Do not merge until Wrangler types, both TypeScript projects, full Vitest and production build all pass.

## Next step after Release 1

### Release 1.5 — Cave Pony test-suite simplification

The user explicitly approved a follow-up simplification pass on testing before further feature work.

Goal: reduce test tax without weakening confidence.

Cave Pony principles for the test suite:
- test durable user/domain contracts, not superseded component structure;
- one authoritative test per behaviour wherever practical;
- delete duplicate assertions across old UI generations;
- prefer focused domain/API tests for invariants and a small number of end-to-end component journeys;
- keep deployment/security/schema guardrails strong;
- avoid creating CI jobs for ordinary review tools;
- document which suites are smoke, contract, domain and journey coverage.

Release 1.5 must start from merged `main`, audit the test tree, propose deletions/consolidations with evidence, then run the complete remaining suite before merge.

## Next planned product releases

1. **Fixture-First Player Experience**: permission-safe fixture reads, My/League Fixtures, progress/status, fixture-first entry, fixed-A/B score mapping, own pending result.
2. **Standings, Movement & Season Context**: zones/ambiguity/provisional-v-final movement, explicit current season, public league browsing, full rule context.
3. **Admin Competition Readiness & Safety**: whole-season readiness, `seasonHealth()`, operational counts, accessible destructive actions.
4. **History, Responsive Acceptance & Final Story Closure**: historic fixture context, viewport/touch acceptance, revalidate all 150 issues and close only fully evidenced stories.

## Parked Release 2 root cause

Normal players cannot currently read fixtures because `PlayerLeague -> ApiClient.fixtures()` calls `/api/admin/competition/leagues/:id/fixtures`, which requires ADMIN, and the client swallows the 403 into an empty fixture list. Do not weaken the admin guard in Release 1. A future fixture-first release adds a permission-safe read contract.

Before that flow becomes reachable, `Your/Their` scores must map correctly to fixed fixture Player A/B ordering to avoid the latent Player-B reversal.

## Guardrails

- No D1/schema/API architecture changes were introduced by Release 1.
- No new router, state framework, component library, backend service or Cloudflare product.
- Preserve Worker authorization, same-origin security, competition invariants and accessibility.
- All 33 incomplete story issues stay open until separately revalidated.
- Merge only a freshly verified final PR head.
