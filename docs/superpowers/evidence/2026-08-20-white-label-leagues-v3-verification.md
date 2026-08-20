# White-Label Leagues v3 Verification

**Date:** 20 August 2026  
**Release commits:** `4714cbe` (`feat: white-label leagues with owner access`), `6ebfc48` (`fix: polish white-label app shell assets`), `ad3789d` (`feat: add shareable public league links`), `36565f1` (`fix: make league sharing resilient on desktop`)<br>
**Cloudflare Worker version:** `fc707011-8bb8-4a07-a13f-75925b34cdb6`<br>
**Live origin:** `https://darts.graingers.agency`

## Design and source reconciliation

- v1 remains historical single-league documentation.
- v2 remains the previous multi-league implementation/evidence record.
- `docs/superpowers/specs/2026-08-20-white-label-leagues-v3-design.md` and its plan are the current authority for white-label behavior, league ownership, master administration and visibility.
- The product shell no longer uses the Misfits artwork or Misfits-specific title/copy. Misfits 501 remains a valid seeded league record.

## Automated verification

- `npm test`: 22 test files, 76 tests passed.
- `npm run typecheck`: passed for client and Worker TypeScript projects.
- `npm run build`: passed; Vite generated the production assets.
- `git diff --check`: passed.
- `npm run db:migrate:local`: passed; no migrations were pending after `0003_white_label_access.sql`.
- `npx wrangler deploy --dry-run`: passed; Worker, D1 and static asset bindings resolved.
- The generic install manifest references `/brand/league-board.svg`; the public icon and manifest both returned `200` after deployment.
- The production CSP now permits Google GIS inline styles under `style-src` while keeping inline scripts disallowed.
- The production Worker now has an explicit `MASTER_ADMIN_EMAIL` secret in addition to the Google client and bootstrap secrets.

Focused v3 coverage proves the additive master-admin/visibility schema, configured master identity promotion, ordinary-user isolation, owner-only league management, master access to all leagues, automatic owner membership, private public-read filtering, private member reads, generic shell copy, visibility controls and People-panel gating. Existing Google credential handling, opaque sessions, profiles, invite hashing/join/capacity, player-only results, per-game averages, confirmation/dispute, standings and admin result controls remain green in the same suite.

## Production migration and account state

- `0003_white_label_access.sql` applied remotely to D1 database `misfits`.
- Remote D1 query verified the existing account `wjgrainger@gmail.com` as `role = 'ADMIN'` and `is_master_admin = 1`.
- The temporary live privacy fixture `codex-v3-private-check` was inserted only for endpoint verification and then deleted; a follow-up query returned no row.

## Live HTTP observations

- `GET https://darts.graingers.agency/`: `200`, document title `League Board`.
- `GET https://darts.graingers.agency/league/misfits-501`: `200`; the public deep link selected Misfits 501 directly.
- `GET /manifest.webmanifest`: `200`, generic League Board icon present.
- `GET /brand/league-board.svg`: `200`, `image/svg+xml`.
- `GET /api/health`: `200`, `{"ok":true}`.
- `GET /api/public/leagues`: `200`; the seeded Misfits league is present with `visibility: "PUBLIC"`.
- `GET /api/public/leagues/misfits-501`: `200`; public league metadata and redacted players returned.
- Unauthenticated `GET /api/admin/leagues`: `401`.
- Unauthenticated `GET /api/admin/players`: `401`.
- `GET https://darts-501.zerobytemode.workers.dev/`: `404`; the workers.dev hostname remains inactive.
- During the temporary private fixture, anonymous requests to the private directory/detail/players/standings/results paths returned `404` with `LEAGUE_NOT_FOUND`, while the public directory continued to return only the seeded public league.

## Browser observation

- Playwright at a `390x844` viewport showed the generic `LB` mark, `DARTS / LEAGUES`, `Leagues, properly settled.`, the public league card and the official Google button without visible overlap or horizontal clipping.
- Clicking the official Google button opened a Google Accounts tab with `origin=https://darts.graingers.agency`.
- At `390x844`, the public deep link rendered without visible overlap or horizontal clipping; a local Playwright screenshot was captured for the check.
- Clicking `Share league` on the public deep link opened the desktop browser share flow. Chromium returned `AbortError: Share failed` when the native share target was dismissed/unavailable, and the client then attempted clipboard fallback for the stable URL `https://darts.graingers.agency/league/misfits-501`.
- The Playwright context denied clipboard permission, so that automated session displayed the browser permission error after fallback. The fallback behavior is covered by the passing `share.test.ts` regression and the signed-in league-desk test; this is a browser-harness permission boundary, not an API or routing failure.
- The isolated browser had no Google account session, so it could not complete account selection or exercise a signed-in owner/member flow. That remains a live-auth proof boundary, not a claim of failure.
- After the CSP update, Playwright reported three console errors: the expected unauthenticated `/api/me` request plus Cloudflare-injected inline script and analytics-script policy messages. The earlier Google GIS inline-style CSP errors are gone. The visual surface and GIS click path still worked; this release does not claim a clean console because the Cloudflare-injected messages remain platform-level noise.

## Remaining proof boundary

Source, automated tests, migration, deployment and anonymous live filtering are verified. A real signed-in Google browser session is still required to live-observe master/owner league creation, private invite join, profile editing, player result submission and opponent confirmation end to end.
