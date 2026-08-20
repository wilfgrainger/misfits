# White-Label Leagues v3 Verification

**Date:** 20 August 2026  
**Release commits:** `4714cbe` (`feat: white-label leagues with owner access`), `6ebfc48` (`fix: polish white-label app shell assets`), `ad3789d` (`feat: add shareable public league links`), `36565f1` (`fix: make league sharing resilient on desktop`), `b335c61` (`fix: harden league result workflows`), `b5762b7` (`fix: enforce pair limits across legacy match ordering`), `7df995d` (`fix: keep league workspace state synchronized`), `60b7504` (`fix: clear stale master access on sign-in`), `6c69679` (`fix: make league capacity limits atomic`), `b153c59` (`fix: make invite joins idempotent under races`), `e22ae06` (`fix: harden league capacity and profile safety`), `9a411b6` (`docs: record profile safety contract`), `ad223b9` (`refactor: remove legacy misfits auth naming`), `9be431e` (`docs: reconcile latest browser auth evidence`), `2ea7daa` (`fix: revoke legacy sessions during auth transition`), `34cb130` (`test: add authenticated league lifecycle coverage`), `51b65f9` (`fix: enforce nickname onboarding at write boundaries`), `9431691` (`docs: reconcile current browser evidence`), `1bc45d2` (`fix: select league after invite join`), `dad1afd` (`fix: make result resolution race safe`), `c68c7a5` (`docs: reconcile white-label verification plan`), `cf7b031` (`fix: report invite copy status accurately`), `ff75d4e` (`fix: synchronize multi-league workspace selection`), `4727902` (`fix: hydrate selected league settings`), `1e324f5` (`fix: prevent stale league workspace responses`), `ca4ebea` (`test: stabilize league switch race fixture`), `4ed5c6a` (`docs: pin latest deployed worker`), `0cc3c78` (`fix: refresh Google identity before master promotion`)<br>
**Cloudflare Worker version:** `eb492d5a-d7c0-4e5d-aaa5-987801f4ad4d`<br>
**Live origin:** `https://darts.graingers.agency`

## Design and source reconciliation

- v1 remains historical single-league documentation.
- v2 remains the previous multi-league implementation/evidence record.
- `docs/superpowers/specs/2026-08-20-white-label-leagues-v3-design.md` and its plan are the current authority for white-label behavior, league ownership, master administration and visibility.
- The product shell no longer uses the Misfits artwork or Misfits-specific title/copy. Misfits 501 remains a valid seeded league record.

## Objective coverage audit

The original product brief is covered as follows:

- **Google-authenticated identity:** the official Google Identity Services button posts a verified credential to the Worker, which creates an opaque application session keyed by Google's stable `sub`. The configured `wjgrainger@gmail.com` account is active `ADMIN` and `is_master_admin = 1` in production. Successful account selection is not live-observed in the isolated browser because it has no Google session.
- **League administration:** any named active user can create a league; its `created_by` owner can edit rules, visibility, members, invites and administrative result records; the master administrator can manage all leagues and global People controls. Route tests cover owner isolation and master access; the mobile render covers the create/manage workspaces.
- **Player results and averages:** the player route accepts only a result involving the session user, requires both players' averages, validates decisive leg scores and pair limits, and leaves the result pending for the opponent. Confirmation/dispute and confirmed-only standings are covered by the authenticated lifecycle and result suites.
- **Simple profiles:** Google picture persistence, nickname onboarding/uniqueness and self-owned Darts Counter profile links are covered by auth/profile tests and the profile client. Arbitrary image uploads are intentionally excluded.
- **Invites and league size:** owners create hashed invite links; joining rechecks identity, nickname, expiry, revocation, open state, capacity and idempotency. `max_players` and `matches_per_pair` are configurable per league and guarded at the database write boundary.
- **Scope boundary:** this release contains leagues only. Tournaments, teams, fixtures and promotion/relegation remain deferred in the current v3 design.

## Automated verification

- `npm test`: 25 test files, 101 tests passed.
- `npm run typecheck`: passed for client and Worker TypeScript projects.
- `npm run build`: passed; Vite generated the production assets.
- `git diff --check`: passed.
- `npm run db:migrate:local`: passed; no migrations were pending after `0003_white_label_access.sql`.
- `npx wrangler deploy --dry-run`: passed; Worker, D1 and static asset bindings resolved.
- Local D1 `EXPLAIN QUERY PLAN` checks passed for the guarded pair-limit insert, active-membership capacity insert, membership reactivation update, capacity edit and administrator pair-correction update; the expected pair and league-active indexes were selected.
- The generic install manifest references `/brand/league-board.svg`; the public icon and manifest both returned `200` after deployment.
- The production CSP now permits Google GIS inline styles under `style-src` while keeping inline scripts disallowed.
- The production Worker now has an explicit `MASTER_ADMIN_EMAIL` secret in addition to the Google client and bootstrap secrets.
- New sign-ins issue generic `league_board_session` and `league_board_oauth_state` cookies; legacy Misfits-named cookies remain readable and are expired during logout/callback to avoid breaking existing sessions during the white-label transition.

Focused v3 coverage proves the additive master-admin/visibility schema, configured master identity promotion, ordinary-user isolation, owner-only league management, master access to all leagues, automatic owner membership, private public-read filtering, private member reads, generic shell copy, visibility controls and People-panel gating. Post-release coverage now also proves draw rejection, slug-based public standings/results, league-switch form reset, closed-league result-entry gating, repeat-limit enforcement when legacy matches use reversed player ordering, one People row per user across multiple memberships, master-account protection, owner workspace synchronization after create/edit, selecting the league returned by a successful invite join, atomic pair/capacity limits, capacity-safe membership reactivation, idempotent invite joins when a membership insert loses a concurrent race, rejection of administrator corrections into a full player pair, capacity-edit rejection, official DartCounter host validation, non-cacheable API errors, nickname onboarding enforcement at league-creation and player-result mutation boundaries, concurrent confirmation/dispute resolution guards, truthful invite clipboard failure feedback and revocation of both generic and legacy sessions when both cookies are present, and latest-response guards for rapid member/admin league switching. Google auth regression coverage also clears stale master access when an existing Google identity no longer matches the configured master email. Existing Google credential handling, opaque sessions, profiles, strict DartCounter HTTPS links, invite hashing/join/capacity, player-only results, per-game averages, confirmation/dispute, standings and admin result controls remain green in the same suite.

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
- `GET /api/public/leagues/misfits-501/standings`: `200`; the stable league slug resolves to the public standings resource.
- `GET /api/public/leagues/misfits-501/results`: `200`; the stable league slug resolves to the public results resource.
- Unauthenticated `GET /api/admin/leagues`: `401`.
- Unauthenticated `GET /api/admin/players`: `401`.
- `POST /api/auth/google` with a deliberately invalid credential: `401`; this verifies the rejection boundary, not a successful Google session.
- `GET https://darts-501.zerobytemode.workers.dev/`: `404`; the workers.dev hostname remains inactive.
- The checks above were rerun after deployment of Worker version `eb492d5a-d7c0-4e5d-aaa5-987801f4ad4d`; the custom domain served the generic app, health endpoint, manifest/icon and public slug resources with `200`, while the unauthenticated admin route and invalid Google credential returned `401`.
- The deployed bundle `index-uKqaSbbZ.js` contains the current `Your leagues` admin workspace copy and race-safe workspace build; the live custom domain also returned `no-store` for the home document and authenticated admin rejection.
- The compatibility-only `/auth/google` authorization-code entrypoint returned `503` because no client secret is configured; the normal official GIS button path remains the supported login flow and requires only the public client ID plus server-side GIS credential verification.
- Live unauthenticated admin/profile errors, hidden private-league reads and invalid Google credentials returned `Cache-Control: no-store`.
- During the temporary private fixture, anonymous requests to the private directory/detail/players/standings/results paths returned `404` with `LEAGUE_NOT_FOUND`, while the public directory continued to return only the seeded public league.

## Browser observation

- Playwright at a current `390x844` viewport on Worker `eb492d5a-d7c0-4e5d-aaa5-987801f4ad4d` showed the generic `LB` mark, `DARTS / LEAGUES`, `Leagues, properly settled.`, the public league card and the official Google button without visible overlap or horizontal clipping. The fresh mobile screenshot was `output/playwright/live-390-v3-signed-out.png`; that artifact is local and intentionally untracked.
- The mocked signed-in admin mobile render showed the new `Your leagues`, `Create a league` and `Manage Misfits 501` headings, visible labels for all create/settings fields and populated selected-league settings after the league list loaded. The full-page `390px` capture showed no horizontal overflow or overlapping sections; the focused regression and full suite both passed.
- Clicking the official Google button on the latest deployment opened a Google Accounts tab with `origin=https://darts.graingers.agency`; the isolated browser then showed Google's email-or-phone sign-in screen and had no account session available to complete the credential step.
- At `390x844`, the public deep link rendered without visible overlap or horizontal clipping; a local Playwright screenshot was captured for the check.
- Clicking `Share league` on the public deep link opened the desktop browser share flow. Chromium returned `AbortError: Share failed` when the native share target was dismissed/unavailable, and the client then attempted clipboard fallback for the stable URL `https://darts.graingers.agency/league/misfits-501`.
- The Playwright context denied clipboard permission, so that automated session displayed the browser permission error after fallback. The fallback behavior is covered by the passing `share.test.ts` regression and the signed-in league-desk test; this is a browser-harness permission boundary, not an API or routing failure.
- The isolated browser had no Google account session, so it could not complete account selection or exercise a signed-in owner/member flow. That remains a live-auth proof boundary, not a claim of failure.
- The final local audit reran `npm test` (25 files / 101 tests), `npm run typecheck`, `npm run build` and `git diff --check`; all passed. The live custom domain served Worker version `eb492d5a-d7c0-4e5d-aaa5-987801f4ad4d`, and remote D1 still showed the configured master account and seeded public league.
- After the CSP update, Playwright reported three console errors: the expected unauthenticated `/api/me` request plus Cloudflare-injected inline script and analytics-script policy messages. The earlier Google GIS inline-style CSP errors are gone. The visual surface and GIS click path still worked; this release does not claim a clean console because the Cloudflare-injected messages remain platform-level noise.

## Remaining proof boundary

Source, automated tests, migration, deployment and anonymous live filtering are verified. A real signed-in Google browser session is still required to live-observe master/owner league creation, private invite join, profile editing, player result submission and opponent confirmation end to end.
