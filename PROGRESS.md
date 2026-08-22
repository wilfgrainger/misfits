# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `chore/pragmatic-delivery-policy`  
**Current focus:** Pragmatic delivery-policy cleanup; 33 incomplete stories remain parked  
**Main baseline:** Releases 1 and 1.5 complete

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- UI: `DESIGN.md` + repo-local Impeccable skill
- Story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Latest story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues own operational story open/closed state.
- `AGENTS.md` owns the durable delivery/test/verification policy.

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

Final PR-head CI `32587464954` passed `npm ci`, Wrangler types, both TypeScript projects, **231/231 tests across 57 files**, and production build. Vitest runtime was 20.43s.

Simplification:
- removed duplicate/history-coupled client and release tests;
- kept all focused domain/server authentication, authorization, persistence, schema, scoring, standings and promotion coverage;
- deployment tests now assert safety rather than an exact CI shape;
- focused proof is used during implementation, with one fresh full repository gate before merge.

Release 1.5 changed no production code.

## Pragmatic delivery policy

This policy cleanup keeps the safety boundaries but removes unnecessary ceremony.

- Routine bounded changes do not require a written spec/plan or repeated approvals.
- Superpowers is required for architectural, multi-step or high-risk work, or when explicitly requested.
- An approved release/design plan authorizes its in-scope implementation tasks unless assumptions or scope materially change.
- Impeccable is required for material UI/interaction changes, not every copy/CSS/test correction.
- Cave Pony formal review is required for meaningful simplification/refactor/architecture work, not every routine PR.
- `PROGRESS.md` is updated at meaningful release/handoff checkpoints, not after every test or tiny task.
- Feature branches verify through `pull_request`; `push` CI is limited to `main`, avoiding duplicate branch verification.
- One fresh full repository gate remains required before merge.
- Auth, authorization, secrets, migrations, destructive data operations and production-data integrity remain strong guardrails.

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
- Use the risk-proportionate policy in `AGENTS.md`; do not recreate micro-CI loops.
