# Misfits 501 Progress

**Updated:** 28 August 2026
**Current branch:** `codex/premium-club-v2`
**Base:** `56603ee8304955618bed870c93ad41253669ce4d` — `fix: plainer landing copy and a real favicon.ico`
**Current focus:** Premium crispness and admin simplicity pass deployed and live-verified; source handoff remains on the local release branch.
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
| `343a70d` | deployed and live-verified | Quality pass: large subdued admission seal, approved-member entry handoff, deliberate admin desk framing, separated task controls, and mobile action-row spacing. |
| `984ea84` | deployed and live-verified | Premium crispness pass: shared sharper geometry and edges, restrained depth, clearer action hierarchy, compact admin health ledger, preserved labelled admin jobs, and strengthened signed-in test timing. |

### Product truth that must not change

- Misfits 501 is one private darts club, not a multi-club product or generic league SaaS.
- Anonymous, pending, rejected, and suspended visitors must never mount member, league, standings, fixture, or result data.
- Google Identity Services remains the only sign-in method. Do not weaken Worker authorization or change invite/session behaviour.
- The only global approved-member destinations are `Home`, `Record`, `Leagues`, and `More`. `Table`, `Fixtures`, and `Results` are local competition tabs.
- DartCounter scores; Misfits records and settles outcomes. Do not add live scoring, social/member marketing, payments, teams, tournaments, or public member data.
- Use the supplied club art intact. The authorised admission-screen exception is a very low-contrast seal watermark behind clear space only; it must never compromise copy contrast. No external font, dependency, Cloudflare service, migration, route, or API belongs in this release.

## Release sequence

Work in this exact isolated checkout, not the original dirty checkout:

`C:\Users\wilf6\dev\misfits\.worktrees\premium-club-v2`

| Status | Job | Evidence recorded |
| --- | --- | --- |
| complete | **Deferred Task 4 review.** Reviewed `c9c903c..bf61697` read-only. | Clean diff; public app, standings, and player focused suites: 17 tests passed. |
| complete | **Responsive, focus, and motion safeguards.** | Safe-area/sizing source safeguards committed in `ac18b00`; focused entry and responsive suite passed. |
| complete | **Bounded rendered finish.** | Signed-out private root captured at 390×844 and 1440×900 in `.impeccable/review/`; one correction pass fixed supplied Google-control sizing and true centring. |
| complete | **Deferred minor review debt.** | Direction-comment contract tightened; motion-test title corrected; desktop ratio/mobile source order/selected `aria-current` are explicit; no product route directly mounts non-embedded `PlayerLeague`. |
| complete | **Fresh release gate, deployment, and live check.** | `wrangler types`, client/Worker typecheck, 77-file/323-test Vitest run, production build, detector `[]`, dry-run, and diff check passed. Commit `90e4e6f` deployed as Worker version `e568ce96-0012-419c-8ce3-41f8c8fcadc6`; live root and `/api/health` returned HTTP 200. |
| complete | **Quality-pass release and live check.** | `wrangler types`, client/Worker typecheck, 77-file/324-test Vitest run, production build, detector `[]`, dry-run, and diff check passed. Commit `343a70d` deployed as Worker version `9ebfffc3-f4e4-4589-a7cb-41073ba1d24e`; the live 390px admission screen was inspected. |
| complete | **Premium crispness and admin simplicity pass.** | Cave Pony review kept the existing admin component and every explicit job, removed nested rules/metric-card chrome, separated destructive actions, and introduced one shared control/surface/dialog radius scale. Fresh gate: Wrangler types, both TypeScript projects, 77 files / 324 tests, production build, detector, deploy dry-run, and diff check passed. Commit `984ea84` deployed as Worker version `98426cf9-ba36-4c56-9332-29cadc594eb8`; live root and `/api/health` returned HTTP 200 and the 390px entrance was inspected. No API, auth, schema, D1, route, or dependency change. |

## Evidence already reported by completed task implementations

- Task 2 report: 77 files / 319 tests, TypeScript, Wrangler types, production build, emitted V2 HTML-comment grep, detector `[]`, and diff checks passed.
- Task 3 report: 77 files / 320 tests, client/Worker TypeScript, production build, detector `[]`, and diff checks passed.
- Task 4 review: `git diff --check c9c903c..bf61697` was clean; `public-app-ux`, `standings-table`, and `player-app` passed (3 files / 17 tests).
- Rendered acceptance used the local Worker with its local D1 at 390×844 and 1440×900. The anonymous entrance displayed only the private-club promise and Google sign-in, with no member, fixture, result, or table data mounted.
- Google Identity Services sizing now uses the actual sign-in slot, not its padded parent card; its supported logo alignment is `center`. The source regression test proves the narrower slot wins. The live Google sign-in journey was not performed.
- The deployed custom domain `https://darts.graingers.agency/` served the new `index-BRH1UTI9.js` and `index-B8ZTN2TB.css` asset hashes, returned the V2 direction contract, and rendered the signed-out 390px entrance with the Google mark and label centred. `https://darts.graingers.agency/api/health` returned `{"ok":true}`.
- The quality-pass deployment serves `index-GF72nVFt.js` and `index-Bal_ro4S.css`. The live 390px entrance retains readable copy and the centred Google control over a large subdued club seal; root and `/api/health` both returned HTTP 200. Authenticated member/admin browser acceptance remains covered by component contracts and supplied capture review, not a live signed-in journey.
- The premium-crispness deployment serves `index-C9qElwDu.js` and `index-DrrYaqFv.css`. The live 390px entrance has zero page-level overflow, a centred 293px Google control inside its 335px admission card, readable copy, and no mounted protected club data. Authenticated member/admin acceptance remains component-contract and supplied-capture evidence rather than a live signed-in journey.

These are local task, browser, and production checks. They do not establish a live Google journey, CI, a push, or a pull request.

## Handoff files and operating discipline

- Design: `docs/superpowers/specs/2026-08-27-premium-club-v2-design.md`
- Plan: `docs/superpowers/plans/2026-08-27-premium-club-v2.md`
- SDD ledger/reports/packages: `.superpowers/sdd/2026-08-27-premium-club-v2/`
- Use explicit staging paths; do not use `git add -A`, reset, or overwrite unrelated files.
- The V2 source branch is local only. The latest production Worker was deployed from committed source `984ea84`; no push, PR, CI, merge, or D1 mutation was performed.
- No schema, migration, Cloudflare service, dependency, API, authorization, or data-visibility change is included.

## Next action

The requested crispness pass is complete. If a source-hosted review is wanted next, push `codex/premium-club-v2` and open a PR as a separate, explicitly verified handoff; production is already serving runtime commit `984ea84`.

## Historical evidence

- `docs/operations/2026-08-24-issue-and-release-status.md` — PR #180 issue and release evidence.
- `docs/superpowers/evidence/2026-08-21-misfits-impeccable-ui-review.md` — the review that recorded the landing promise now restored.
- `docs/operations/manual-d1-release-design.md` — production D1 migration contract.
- `docs/operations/cloudflare-free-tier-runbook.md` — release preflight and provider-limit review.

This file contains current handoff truth only; dated release narratives and historical decisions remain in the linked evidence and design records.
