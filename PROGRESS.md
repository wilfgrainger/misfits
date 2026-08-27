# Misfits 501 Progress

**Updated:** 27 August 2026
**Current branch:** `codex/release-website-polish`
**Base:** `main` at `fb4064763a726d94cc335906770a3de241b210e2` (PR #180 merged as `fe5b2a380ff5a99aaadeadacf3285309dcd6d38a`)
**Current focus:** website completion release — club member workflow polish plus the shipped-surface gaps found in a full website audit
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

This branch finishes the shipped website rather than adding product scope. It carries two batches.

### Batch 1 — club member workflows (already committed as `654f221`)

- Active approved administrators are included in assigned competition rosters and standings.
- Club bootstrap is hardened against stale responses after logout, unmount or competing loads.
- Admin result dialogs have Escape handling, focus containment, initial focus, visible close controls and focus restoration.
- Pending opponent-result reviews surface on the member Home screen and route to the relevant Results workspace.
- Competition tab/tabpanel associations are stable, with responsive touch-target and modal polish.

### Batch 2 — website completion audit

Each item was captured with a failing test before its fix.

1. **The declared landing promise was missing.** `PRODUCT.md` and `VISION.md` name "Club darts, properly settled." as the fixed promise, and the 21 August Impeccable review recorded it on the landing surface. It had since disappeared from the entire client. It is now on the signed-out and invited entrances, the document title, the meta description and the install manifest.
2. **There was no favicon.** Because asset not-found handling is `single-page-application`, `/favicon.ico` answered `200 text/html` with the app shell instead of an icon. `public/brand/misfits-501-mark.svg` is a restrained `DESIGN.md`-palette bullseye, wired as `rel="icon"`, with the supplied club artwork as `apple-touch-icon`.
3. **The install manifest had one 1254px JPEG icon.** A maskable SVG entry now prevents the club mark being cropped on a phone home screen.
4. **There was no `robots.txt`.** A private members club now says so explicitly, reinforced by `<meta name="robots" content="noindex, nofollow">`.
5. **There was no no-JavaScript fallback.** A `<noscript>` block now explains the club. Its first implementation would have rendered invisible, because no colour was declared and the built stylesheet paints a dark ground without JavaScript; a contrast-guarded `noscript` rule fixes that and a test holds it at WCAG AA against both dark grounds.
6. **Shared club links had no preview.** The product shares `/join/:token` invitations and `/league/:slug` tables, so privacy-safe Open Graph and Twitter card metadata now render club identity and the promise, and no member data.
7. **The retired white-label "League Board" mark was still deployed.** `public/brand/league-board.svg` is removed; `AGENTS.md` forbids restoring that identity.
8. **`DESIGN.md` requires a responsive audit at 320/360/375/390/412/430/768/1024 and no test enforced it.** `tests/client/responsive-widths.test.ts` proves every required width lands in a declared band, that phone/tablet/desktop bands exist, that no layout is pinned wider than 320px, that page-level horizontal overflow is prevented, and that fixed member navigation respects the bottom safe area.
9. **A deliberately public table had no address.** An admin could set league visibility to `PUBLIC`, `PublicLeagueView` served `/league/:slug`, and `shareLeague()` was fully tested — but nothing connected them, so the approved "publicly chosen club table" was unreachable in practice. The admin league edit form now shows the public address with an open link and a share/copy control, using the existing helper. No endpoint, dependency or migration was added.
10. **The public share copy invited a join.** A read-only public table said "Join the X league.", which contradicts the `DESIGN.md` ban on self-service join UI. It now reads "See the X table." with the title "X — Misfits 501".

## Current verification

Fresh local gate on the working tree, run with a Linux-native `node_modules`:

- `npx wrangler types`: GREEN.
- `npm run typecheck` (client and Worker TypeScript): GREEN.
- Impeccable source detector for `src/client`: `[]`.
- `vitest run`: **75 test files / 311 tests GREEN**, up from the 73/296 baseline on `654f221`.
- `npm run build`: GREEN.
- `git diff --check` and `git diff --cached --check`: clean.

This is source, contract and local-gate evidence. It is not a deployment, production-health, signed-in Google journey or rendered-device acceptance claim.

## Current blockers and decisions

- **Merge and deploy are blocked in this environment.** The `gh` CLI is installed but unauthenticated (`You are not logged into any GitHub hosts`), so the pull request cannot be opened, reviewed or merged, and the production deploy cannot be triggered from here. `gh auth login` or a `GH_TOKEN` is required.
- The `main` working checkout at `/mnt/c/Users/wilf6/dev/misfits` reports 411 modified files purely from CRLF/LF translation on the Windows mount. It is unsafe for commits. Use the `/tmp/misfits-release` worktree.
- `robots.txt` disallows all crawling, including the deliberately public table paths. That follows the private-members-club positioning; reverse it only if the club decides a public table should be discoverable by search.
- `og:image` and `og:url` name the production origin directly, matching the existing `APP_ORIGIN` in `wrangler.jsonc`.
- No schema, migration, Cloudflare service, dependency or authorization change is included.

## Next action

Authenticate GitHub, open the pull request for `codex/release-website-polish`, require a fresh exact-head `CI / verify` run, merge on review, then verify the `main` deploy and smoke-test production `/`, `/favicon.ico`, `/robots.txt` and `/api/health`.

## Historical evidence

- `docs/operations/2026-08-24-issue-and-release-status.md` — PR #180 issue and release evidence.
- `docs/superpowers/evidence/2026-08-21-misfits-impeccable-ui-review.md` — the review that recorded the landing promise now restored.
- `docs/operations/manual-d1-release-design.md` — production D1 migration contract.
- `docs/operations/cloudflare-free-tier-runbook.md` — release preflight and provider-limit review.

This file contains current handoff truth only; dated release narratives and historical decisions remain in the linked evidence and design records.
