# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `refactor/test-suite-simplification`  
**Current focus:** Release 1.5 Cave Pony test-suite simplification, final verification  
**Production/main baseline:** Release 1 UX Compression merged as `aed8df57e4342c341af3405ba031d94c95379f2d`

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

Open distribution: Admin 6, Player 26, Public 1. Release 1 and Release 1.5 do not close them.

## Release 1 — UX Compression — MERGED

PR #168 merged to `main` as `aed8df57e4342c341af3405ba031d94c95379f2d`.

Final PR-head gate `32586862564` passed `npm ci`, Wrangler types, both TypeScript projects, full Vitest and production build. Impeccable deterministic scan returned 0 findings.

Delivered player/public/admin UX compression, direct canonical Results composition, dead UI/dependency cleanup, documentation authority alignment and removal of the duplicate parent Results request. No D1/schema/API architecture change was introduced.

## Release 1.5 — Cave Pony test-suite simplification

User explicitly approved this follow-up because the repository was paying too much process/test tax for small UI changes.

### Audit conclusion

The focused `tests/domain/` and `tests/server/` suites are the integrity spine and are intentionally retained. They protect scoring, standings, promotion, authentication, authorization, persistence and route contracts.

The avoidable weight was concentrated in client UI archaeology, story-number duplication and a brittle CI meta-test.

### Changes

Deleted as duplicate or historical-structure coverage:
- `tests/client/weekly-ledger-structure.test.tsx` — public happy-path and semantic standings coverage already owned by `public-league.test.tsx` + `standings-table.test.tsx`.
- `tests/client/repository-contract.test.ts` — asserted docs/CSS strings, deleted filenames and unused package history rather than user/runtime behaviour.
- `tests/client/player-result-rules.test.tsx` — navigation reachability remains in `player-app.test.tsx`; blank score behaviour remains in `player-scoring-rules.test.tsx` and league-switch coverage.
- `tests/release/story-adm-070.test.ts` — weaker duplicate of the promotion rank-authority cases already in `tests/domain/competition.test.ts`.

Simplified:
- `tests/release/deploy-workflow.test.ts` now asserts the real safety contract (verification required, deploy main-only, pinned Cloudflare action/secrets, no remote migration) without requiring CI to contain exactly two jobs.
- `AGENTS.md` now requires focused proof during development and one fresh full repository gate before review/merge, rather than repeatedly retriggering full CI after every small edit/checkpoint.
- Story-number tests must not be added when another suite already owns the same acceptance contract.
- Tests must not assert that a deleted filename stays deleted or that CI has an exact job count.

### Cave Pony boundary

No production code changed in Release 1.5. No domain/server security, permission, schema, migration or persistence test has been removed. The goal is less brittle proof, not less assurance.

**Next:** create the Release 1.5 PR from this branch, run one authoritative full repository gate, merge only if green, then verify the combined `main` release/deploy once.

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
- Use focused tests while implementing; run one full fresh gate before integration.
- Merge only a freshly verified PR head.
