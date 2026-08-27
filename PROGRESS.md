# Misfits 501 Progress

**Updated:** 27 August 2026
**Current branch:** `codex/premium-club-v2`
**Base:** `56603ee8304955618bed870c93ad41253669ce4d` — `fix: plainer landing copy and a real favicon.ico`
**Current focus:** Premium Club V2 final release gate and Cloudflare deployment, requested by the owner, without widening product scope.
**Backend/schema/infra change:** none
**Production D1 migration required:** NO

## Current approved execution

Read, in order:

1. `AGENTS.md`
2. this `PROGRESS.md`
3. `PRODUCT.md`
4. `VISION.md`
5. `DESIGN.md`
6. affected client code, tests and `public/` assets

This branch is a presentation-led redesign of the existing Misfits 501 private-club product. It must preserve the existing admission, Google identity, result, fixture, table, public-share, and administration behaviour.

## What is committed on this branch

| Commit | Status | Scope |
| --- | --- | --- |
| `3a8ec5e` | committed | Approved Premium Club V2 design specification. |
| `576346b` | committed | Task-by-task implementation plan, including V2 visual-contract correction. |
| `ef7d413` | reviewed clean | Privacy, promise, club-first navigation, and public-record regression contracts. |
| `70aa56a` | reviewed clean | Static private-club threshold: no timed curtain, admission card, fixed promise, emitted V2 direction contract, and retained access boundaries. |
| `c9c903c` | reviewed clean | Club record-book member shell: Home grouping, Record hook, desktop composition, and unchanged four-destination member navigation. |
| `bf61697` | reviewed clean | Public fixture, table, fixture/result, and admin scorebook presentation. The deferred Task 4 review completed clean against `c9c903c..bf61697`; no Critical or Important finding. |
| `ac18b00` | reviewed locally | Responsive safeguards: safe-area entry spacing, supplied Google-control containment, minimum navigation clearance, and focus/reduced-motion coverage. |

### Product truth that must not change

- Misfits 501 is one private darts club, not a multi-club product or generic league SaaS.
- Anonymous, pending, rejected, and suspended visitors must never mount member, league, standings, fixture, or result data.
- Google Identity Services remains the only sign-in method. Do not weaken Worker authorization or change invite/session behaviour.
- The only global approved-member destinations are `Home`, `Record`, `Leagues`, and `More`. `Table`, `Fixtures`, and `Results` are local competition tabs.
- DartCounter scores; Misfits records and settles outcomes. Do not add live scoring, social/member marketing, payments, teams, tournaments, or public member data.
- Use the supplied club art intact; do not use it behind text. No external font, dependency, Cloudflare service, migration, route, or API belongs in this release.

## Release sequence

Work in this exact isolated checkout, not the original dirty checkout:

`C:\Users\wilf6\dev\misfits\.worktrees\premium-club-v2`

| Status | Job | Evidence recorded |
| --- | --- | --- |
| complete | **Deferred Task 4 review.** Reviewed `c9c903c..bf61697` read-only. | Clean diff; public app, standings, and player focused suites: 17 tests passed. |
| complete | **Responsive, focus, and motion safeguards.** | Safe-area/sizing source safeguards committed in `ac18b00`; focused entry and responsive suite passed. |
| complete | **Bounded rendered finish.** | Signed-out private root captured at 390×844 and 1440×900 in `.impeccable/review/`; one correction pass fixed supplied Google-control sizing and true centring. |
| complete | **Deferred minor review debt.** | Direction-comment contract tightened; motion-test title corrected; desktop ratio/mobile source order/selected `aria-current` are explicit; no product route directly mounts non-embedded `PlayerLeague`. |
| in progress | **Fresh release gate and deployment.** | Run current types, tests, build, detector, configuration check, dry-run, final diff check; commit the exact release candidate, deploy the Worker, then verify the live root and health endpoint. |

## Evidence already reported by completed task implementations

- Task 2 report: 77 files / 319 tests, TypeScript, Wrangler types, production build, emitted V2 HTML-comment grep, detector `[]`, and diff checks passed.
- Task 3 report: 77 files / 320 tests, client/Worker TypeScript, production build, detector `[]`, and diff checks passed.
- Task 4 review: `git diff --check c9c903c..bf61697` was clean; `public-app-ux`, `standings-table`, and `player-app` passed (3 files / 17 tests).
- Rendered acceptance used the local Worker with its local D1 at 390×844 and 1440×900. The anonymous entrance displayed only the private-club promise and Google sign-in, with no member, fixture, result, or table data mounted.
- Google Identity Services sizing now uses the actual sign-in slot, not its padded parent card; its supported logo alignment is `center`. The source regression test proves the narrower slot wins. The live Google sign-in journey was not performed.

These are local task and browser results, not a substitute for the final fresh release gate. They do not establish a live Google journey, CI, a push, a pull request, a deployment, or production health.

## Handoff files and operating discipline

- Design: `docs/superpowers/specs/2026-08-27-premium-club-v2-design.md`
- Plan: `docs/superpowers/plans/2026-08-27-premium-club-v2.md`
- SDD ledger/reports/packages: `.superpowers/sdd/2026-08-27-premium-club-v2/`
- Use explicit staging paths; do not use `git add -A`, reset, or overwrite unrelated files.
- The V2 source branch is local only. A production Worker deployment has been requested by the owner; no push, PR, CI, merge, D1 mutation, or deployment has yet been performed.
- No schema, migration, Cloudflare service, dependency, API, authorization, or data-visibility change is included.

## Next action

Run the fresh release gate, commit only the exact V2 source/tests/visual evidence/ledger paths, deploy the Worker without a D1 operation, and verify the public root plus `/api/health` against the custom domain. Do not call the V2 complete until those live checks are recorded.

## Historical evidence

- `docs/operations/2026-08-24-issue-and-release-status.md` — PR #180 issue and release evidence.
- `docs/superpowers/evidence/2026-08-21-misfits-impeccable-ui-review.md` — the review that recorded the landing promise now restored.
- `docs/operations/manual-d1-release-design.md` — production D1 migration contract.
- `docs/operations/cloudflare-free-tier-runbook.md` — release preflight and provider-limit review.

This file contains current handoff truth only; dated release narratives and historical decisions remain in the linked evidence and design records.
