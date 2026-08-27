# Misfits 501 Progress

**Updated:** 27 August 2026
**Current release:** `main` at `a3a34250a78c6978630fdd3981917583a6ed508b`
**PR #183:** merged at 2026-08-27T08:16:47Z; front-page logo reveal and copy update
**Current focus:** post-deploy front-page handoff complete
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

This branch finishes the shipped website rather than adding product scope.

### Already merged — club member workflows (PR #181)

- Active approved administrators are included in assigned competition rosters and standings.
- Club bootstrap is hardened against stale responses after logout, unmount or competing loads.
- Admin result dialogs have Escape handling, focus containment, initial focus, visible close controls and focus restoration.
- Pending opponent-result reviews surface on the member Home screen and route to the relevant Results workspace.
- Competition tab/tabpanel associations are stable, with responsive touch-target and modal polish.

### Completed website completion audit

Each item was captured with a failing test before its fix.

1. **The landing promise was revised.** The earlier completion release restored "Club darts, properly settled." to the public shell and metadata. PR #183 deliberately removed that slogan from user-facing UI and metadata, leaving the club identity, private-members-club context and existing admission copy intact.
2. **There was no favicon.** Because asset not-found handling is `single-page-application`, `/favicon.ico` answered `200 text/html` with the app shell instead of an icon. `public/brand/misfits-501-mark.svg` is a restrained `DESIGN.md`-palette bullseye, wired as `rel="icon"`, with the supplied club artwork as `apple-touch-icon`.
3. **The install manifest had one 1254px JPEG icon.** A maskable SVG entry now prevents the club mark being cropped on a phone home screen.
4. **There was no `robots.txt`.** A private members club now says so explicitly, reinforced by `<meta name="robots" content="noindex, nofollow">`.
5. **There was no no-JavaScript fallback.** A `<noscript>` block now explains the club. Its first implementation would have rendered invisible, because no colour was declared and the built stylesheet paints a dark ground without JavaScript; a contrast-guarded `noscript` rule fixes that and a test holds it at WCAG AA against both dark grounds.
6. **Shared club links had no preview.** The product shares `/join/:token` invitations and `/league/:slug` tables, so privacy-safe Open Graph and Twitter card metadata now render club identity and the promise, and no member data.
7. **The retired white-label "League Board" mark was still deployed.** `public/brand/league-board.svg` is removed; `AGENTS.md` forbids restoring that identity.
8. **`DESIGN.md` requires a responsive audit at 320/360/375/390/412/430/768/1024 and no test enforced it.** `tests/client/responsive-widths.test.ts` proves every required width lands in a declared band, that phone/tablet/desktop bands exist, that no layout is pinned wider than 320px, that page-level horizontal overflow is prevented, and that fixed member navigation respects the bottom safe area.
9. **A deliberately public table had no address.** An admin could set league visibility to `PUBLIC`, `PublicLeagueView` served `/league/:slug`, and `shareLeague()` was fully tested — but nothing connected them, so the approved "publicly chosen club table" was unreachable in practice. The admin league edit form now shows the public address with an open link and a share/copy control, using the existing helper. No endpoint, dependency or migration was added.
10. **The public share copy invited a join.** A read-only public table said "Join the X league.", which contradicts the `DESIGN.md` ban on self-service join UI. It now reads "See the X table." with the title "X — Misfits 501".
11. **Read failures had no recovery action.** Public fixtures, member competition data, member Players/history and the admin read surfaces announced errors but left users stranded. A shared accessible `LoadFailure` surface now offers contextual retry for those reads; mutation failures remain separate so a retry never repeats a write.
12. **The front page had no authored entrance sequence, and its slogan no longer fit the club.** The supplied Misfits 501 artwork now arrives large and centered, scales/fades as a decorative one-shot intro, then hands off to the existing private sign-in content. The normal heading is `Misfits 501`; `Club darts, properly settled.` is removed from user-facing UI, document metadata, manifest and no-JavaScript copy. Reduced-motion users receive the content immediately.

## Current verification

Front-page release gate before merge on exact PR head `4b8b3ec`:

- `npx wrangler types`: GREEN.
- `npm run typecheck`: GREEN.
- Impeccable source detector for `src/client`: `[]`.
- `vitest run`: **77 test files / 316 tests GREEN**.
- `npm run build`: GREEN.
- `git diff --check`: clean.
- User-facing source/public phrase audit: no `properly settled` occurrences.

Post-merge GitHub Actions run `33053338107` succeeded for exact main SHA `a3a34250a78c6978630fdd3981917583a6ed508b`:

- Verify job `98453926131`: GREEN — Wrangler types, TypeScript, Impeccable, tests and build.
- Deploy Worker job `98454111140`: GREEN — credentials check and Cloudflare deploy.

Privacy-safe production smoke checks after deployment:

- `/`: `200 text/html`; `Misfits 501 — Private club darts.` present, intro JS/CSS assets live, retired slogan absent.
- `/brand/misfits-501.jpg`: `200 image/jpeg`.
- `/manifest.webmanifest`: `200 application/manifest+json`; retired slogan absent.
- `/robots.txt`: `200 text/plain`; `Disallow: /` present.
- `/api/health`: `200 application/json`; `{"ok":true}`.
- Signed-out `/api/me`: `401 application/json`; `UNAUTHENTICATED`, with no email/username/leagues/results fields.

This evidence covers source, contract, CI, deployment and privacy-safe production health. It does not claim an authenticated Google journey or rendered-device pixel review.

## Current blockers and decisions

- No production blocker remains for this release. The code-only front-page deployment succeeded; no D1 migration was needed.
- The supplied artwork remains intact and is used as a decorative intro; no private data is present in the animation or public shell.
- `robots.txt` disallows all crawling, including deliberately public table paths. That follows the private-members-club positioning; reverse it only if the club decides a public table should be discoverable by search.
- No schema, migration, Cloudflare service, dependency or authorization change is included.
- An authenticated Google journey and rendered mobile/desktop visual walkthrough remain intentionally unclaimed because the post-deploy check used no credentials or browser surface.

## Next action

Monitor normal club use and provider measurements. Any future change should begin from deployed `main` commit `a3a34250` and preserve the private-club, free-tier and Worker authorization boundaries.

## Historical evidence

- `docs/operations/2026-08-24-issue-and-release-status.md` — PR #180 issue and release evidence.
- `docs/superpowers/evidence/2026-08-21-misfits-impeccable-ui-review.md` — the review that recorded the landing promise now restored.
- `docs/operations/manual-d1-release-design.md` — production D1 migration contract.
- `docs/operations/cloudflare-free-tier-runbook.md` — release preflight and provider-limit review.

This file contains current handoff truth only; dated release narratives and historical decisions remain in the linked evidence and design records.
