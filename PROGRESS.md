# Misfits 501 Progress

**Updated:** 28 August 2026
**Current branch:** `codex/mobile-admin-sharp-v2`
**Base integrated:** `origin/main` at `72fa336`
**Pull request:** #189
**Current focus:** Mobile admin sharpness pass is locally complete, browser-verified and handed off in PR #189; remote CI is pending.
**Backend/schema/infra change:** none
**Production D1 migration required:** NO

## 28 August 2026 mobile-admin sharpness pass

`main` was re-audited after PRs #187 and #188. The release was healthy, but the 550px authenticated capture still presented seven equally weighted task buttons as a large dashboard keypad, including an orphan full-width final row. That navigator consumed the first useful viewport, amplified nested card borders, and pushed the primary save action below the fold.

This branch keeps the existing seven tasks and desktop tab semantics while replacing the phone-only button wall with one labelled native task switcher. Mobile panels now use separators instead of nested cards, count/current metadata is quieter, refresh becomes a compact secondary control, and season/league save actions sit in a safe-area-aware sticky action band. No admin capability, API, authorization rule, route, dependency, schema, or D1 behavior changes.

Behavioral coverage proves that the task switcher contains all seven jobs and can reach Club access. Responsive source coverage proves that the switcher replaces the rail at 680px and below, preserves the rail above that boundary, and keeps hidden task panels hidden.

Rendered authenticated-state testing used the real React application with isolated browser API responses at **320, 390, 550, 680, 681, 768 and 1024px**. At every width, `document.documentElement.scrollWidth` equalled the viewport width. The switcher rendered through 680px and the rail returned at 681px. The 390px switcher reached Club access, hid Season, and showed only the selected access workspace. The 550px season view kept the labelled task control, two-column season fields, normal 17.6px checkbox and visible Save season action in the first viewport. Browser console errors: **0**.

Fresh local gate: Wrangler types GREEN; client and Worker TypeScript GREEN; **77 test files / 328 tests GREEN**; production Vite build GREEN; `git diff --check` GREEN. Final independent review found no Critical or Important issue; its one minor desktop Save-width finding was fixed and browser-verified at 1024px. Commit `baa90fb` was pushed and PR #189 opened; remote CI remains pending.

## 28 August 2026 mobile-admin visual maintenance

The signed-in admin workspace now has its own bounded, safe-area-aware content frame, matching the member experience rather than relying on page-level clipping. On phones, long action labels, member email addresses and inputs reflow inside the available column; action groups stack deliberately and admin form grids become one column at 400px and below. At 680px and below, the seven-task rail becomes an always-visible two-column task grid, with Club access spanning the final row, so no admin destination requires horizontal dragging.

Admin task panels use restrained bordered product surfaces, improving task separation without adding routes, state, dependencies or changing any membership, competition or result behaviour. Short fields now retain their natural height beside the taller rule panel on desktop.

Rendered evidence used installed Chromium at **320, 360, 375, 390, 412, 430, 768 and 1024px**. A stress harness used production CSS and the real admin class structure with long player names, email addresses, action labels, invite URL and date input. At every width `document.documentElement.scrollWidth` equalled the viewport width: **0px page-level horizontal overflow**. The 320px mobile render and 1024px desktop render were manually inspected. A follow-up DevTools capture at 320px verified all seven task buttons in the non-scrolling grid, with 320px document width and a 286px rail scroll width inside a 288px rail.

Verification: focused responsive contract GREEN; client + Worker TypeScript GREEN; production Vite build GREEN; **77 test files / 327 tests GREEN**. Independent Cave Pony re-review approved the CSS-only grid with existing tab semantics intact.

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
| `0b520ba` | deployed and live-verified | Completion-audit follow-through: enforced the shared radius scale, removed routine member gradients and nested More/rules cards, and classified reset/void fixture actions as destructive without changing their protected workflows. |

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
| complete | **Completion-audit follow-through.** | All eight recommendations now have direct source or rendered evidence: shared radius tokens plus a no-large-one-off regression contract; stronger edge/text tokens; routine gradients removed; primary/secondary/danger contracts; refined tracking; compact labelled admin ledger/forms; flattened More and embedded rules surfaces; and a live 10px admission card. Cave Pony retained the existing seven-job admin component with no dependency or abstraction. Fresh gate: Wrangler types, both TypeScript projects, 77 files / 326 tests, production build, detector, deploy dry-run, and diff check passed. Commit `0b520ba` deployed as Worker version `eee5da65-f953-4798-96d7-8eb467c8a28f`. |
| complete | **PR #186 base integration.** | Merge commit `fe7093f` integrates `origin/main` at `1ec406f`; retained the generated favicon assets and metadata while preserving the superseding V2 threshold, responsive contract, and privacy boundaries. Local gate: 77 files / 326 tests, both TypeScript projects, Wrangler types, build, diff check, and conflict-marker scan passed. GitHub Actions run `33156070229` passed `verify`; Deploy Worker was skipped for the pull request. GitHub reports PR #186 `MERGEABLE` / `CLEAN` at head `fe7093f`. |

## Evidence already reported by completed task implementations

- Task 2 report: 77 files / 319 tests, TypeScript, Wrangler types, production build, emitted V2 HTML-comment grep, detector `[]`, and diff checks passed.
- Task 3 report: 77 files / 320 tests, client/Worker TypeScript, production build, detector `[]`, and diff checks passed.
- Task 4 review: `git diff --check c9c903c..bf61697` was clean; `public-app-ux`, `standings-table`, and `player-app` passed (3 files / 17 tests).
- Rendered acceptance used the local Worker with its local D1 at 390×844 and 1440×900. The anonymous entrance displayed only the private-club promise and Google sign-in, with no member, fixture, result, or table data mounted.
- Google Identity Services sizing now uses the actual sign-in slot, not its padded parent card; its supported logo alignment is `center`. The source regression test proves the narrower slot wins. The live Google sign-in journey was not performed.
- The deployed custom domain `https://darts.graingers.agency/` served the new `index-BRH1UTI9.js` and `index-B8ZTN2TB.css` asset hashes, returned the V2 direction contract, and rendered the signed-out 390px entrance with the Google mark and label centred. `https://darts.graingers.agency/api/health` returned `{"ok":true}`.
- The quality-pass deployment serves `index-GF72nVFt.js` and `index-Bal_ro4S.css`. The live 390px entrance retains readable copy and the centred Google control over a large subdued club seal; root and `/api/health` both returned HTTP 200. Authenticated member/admin browser acceptance remains covered by component contracts and supplied capture review, not a live signed-in journey.
- The premium-crispness deployment serves `index-C9qElwDu.js` and `index-DrrYaqFv.css`. The live 390px entrance has zero page-level overflow, a centred 293px Google control inside its 335px admission card, readable copy, and no mounted protected club data. Authenticated member/admin acceptance remains component-contract and supplied-capture evidence rather than a live signed-in journey.
- The completion-audit deployment serves `index-CfnfpWh6.js` and `index-CX8aLSeI.css`. Live production at 390×844 reports a 10px admission-card radius, zero horizontal overflow, a centred 293px Google control inside the 335px card, no alerts, and no anonymous protected-data mount. Root and `/api/health` both returned HTTP 200.

These are local task, browser, and production checks. They do not establish a live Google journey, CI, a push, or a pull request.

## Handoff files and operating discipline

- Design: `docs/superpowers/specs/2026-08-27-premium-club-v2-design.md`
- Plan: `docs/superpowers/plans/2026-08-27-premium-club-v2.md`
- SDD ledger/reports/packages: `.superpowers/sdd/2026-08-27-premium-club-v2/`
- Use explicit staging paths; do not use `git add -A`, reset, or overwrite unrelated files.
- The latest production Worker recorded here was deployed from committed source `0b520ba`. PR #186 exists, but its integrated head, CI, merge, and any later deployment remain separate evidence gates.
- No schema, migration, Cloudflare service, dependency, API, authorization, or data-visibility change is included.

## Next action

Review PR #186 and choose whether to merge it. This conflict-resolution job does not merge or deploy.

## Historical evidence

- `docs/operations/2026-08-24-issue-and-release-status.md` — PR #180 issue and release evidence.
- `docs/superpowers/evidence/2026-08-21-misfits-impeccable-ui-review.md` — the review that recorded the landing promise now restored.
- `docs/operations/manual-d1-release-design.md` — production D1 migration contract.
- `docs/operations/cloudflare-free-tier-runbook.md` — release preflight and provider-limit review.

This file contains current handoff truth only; dated release narratives and historical decisions remain in the linked evidence and design records.
