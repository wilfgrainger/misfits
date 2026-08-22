# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `main`  
**Current focus:** Releases 1 and 1.5 complete; 33 incomplete stories remain parked  
**Main:** `2ddcd678aac8cb256056a7abc6e369f6b7fbba73` plus this documentation-only checkpoint

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- UI: `DESIGN.md` + repo-local Impeccable skill
- Story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Latest story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues own operational story open/closed state.
- `AGENTS.md` owns the durable test/verification policy.

## Parked stories

**117/150 stories are verified/closed. 33 remain deliberately parked and open: 12 PARTIAL + 21 MISSING.**

Open distribution: Admin 6, Player 26, Public 1.

## Release 1 — UX Compression — COMPLETE

PR #168 merged to `main` as `aed8df57e4342c341af3405ba031d94c95379f2d`.

Final PR-head CI `32586862564` passed `npm ci`, Wrangler types, both TypeScript projects, full Vitest and production build. Impeccable deterministic scan returned 0 findings.

Delivered:
- mobile member navigation with 44px scrollable targets;
- blank consequential result-score defaults;
- compressed signed-in identity/context chrome;
- explicit public failure/empty/Retry states and `Share league` wording;
- one canonical admin Results composition with no portal/DOM-query bridge;
- actual fixture player names in official result fields;
- progressive disclosure for secondary Season/League setup and destructive actions;
- dead `AdminLeagueDesk` and unused direct client dependencies removed;
- duplicate parent Results API load removed;
- VISION/DESIGN/story-authority wording aligned.

No D1/schema/API architecture change was introduced.

## Release 1.5 — Cave Pony test-suite simplification — COMPLETE

PR #169 merged to `main` as `2ddcd678aac8cb256056a7abc6e369f6b7fbba73`.

Final PR-head CI `32587464954` passed:
- `npm ci`;
- Wrangler types;
- both TypeScript projects;
- **231/231 tests across 57 files**;
- production build.

Vitest runtime was 20.43s.

Simplification:
- removed duplicated `weekly-ledger-structure` coverage;
- removed repository-history/CSS/deleted-filename contract tests;
- removed duplicate player UX-compression test file while retaining the behaviours in canonical player suites;
- removed duplicate ADM-070 release coverage because the stronger rank-authority tests live in `tests/domain/competition.test.ts`;
- kept the deployment test but changed it to assert safety rather than an exact CI job count;
- kept all focused domain/server authentication, authorization, persistence, schema, scoring, standings and promotion coverage;
- `AGENTS.md` now requires focused tests during implementation and one fresh full repository gate before merge, rather than full CI after every small edit/checkpoint.

Release 1.5 changed no production code.

### Operational verification note

The connected GitHub tool available in this session exposes PR-triggered workflow runs but not the push-triggered `main` run, so the final `main` Deploy Worker job could not be independently queried here without adding more observer infrastructure. We deliberately did not add that machinery. Release 1.5 is test/docs-only; its verified production build contains the same application code merged in Release 1.

Do not claim a specific `main` deploy run ID unless a future session can actually read it.

## Test ownership policy

- `tests/domain/`: pure competition/validation invariants.
- `tests/server/`: auth, permissions, persistence and API behaviour.
- `tests/client/`: user journeys and presentation behaviour.
- `tests/release/`: deployment/schema/operational guardrails not already owned elsewhere.

During implementation, run the smallest focused proof. Batch coherent low-risk changes. Run one fresh full repository gate before review/merge. Expand proof for security, permissions, migrations, destructive operations or data-loss risk.

Do not add a story-number test when another suite already proves the same contract. Do not test repository history such as deleted filenames or an exact count of CI jobs.

## Next planned product releases

1. **Fixture-First Player Experience**: permission-safe fixture reads, My/League Fixtures, progress/status, fixture-first entry, fixed-A/B score mapping, own pending result.
2. **Standings, Movement & Season Context**: zones/ambiguity/provisional-v-final movement, explicit current season, public league browsing, full rule context.
3. **Admin Competition Readiness & Safety**: whole-season readiness, `seasonHealth()`, operational counts, accessible destructive actions.
4. **History, Responsive Acceptance & Final Story Closure**: historic fixture context, viewport/touch acceptance, revalidate all 150 issues and close only fully evidenced stories.

## Parked fixture root cause

Normal players still cannot read fixtures because `PlayerLeague -> ApiClient.fixtures()` calls `/api/admin/competition/leagues/:id/fixtures`, which requires ADMIN, and the client swallows the 403 into an empty fixture list. Do not weaken the admin guard. The future fixture-first release adds a permission-safe read contract and must also map `Your/Their` scores correctly onto fixed fixture Player A/B ordering.

## Guardrails

- Keep all 33 incomplete story issues open until separately revalidated.
- Preserve Worker authorization, same-origin security, competition invariants, auditability and accessibility.
- No new router, state framework, component library, backend service or Cloudflare product without a real requirement.
- Use the simplified verification policy above; do not recreate micro-CI loops.
