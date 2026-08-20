# Misfits Leagues v2 Verification

**Date:** 20 August 2026  
**Release commit:** `25b64e21a77c96ee5a4c7356a40fcaa719efaec3` (`feat: complete admin league controls`)
**Cloudflare Worker version:** `a9ae2cef-21d3-400a-b3cf-1666e3aa1707`
**Live origin:** `https://darts.graingers.agency`

## Source and automated verification

- `npm test`: 17 test files, 64 tests passed.
- `npm run typecheck`: passed for client and Worker TypeScript projects.
- `npm run build`: passed with Vite production assets generated.
- `git diff --check`: passed.
- `npm run db:migrate:local`: migrations `0001_initial.sql` and `0002_leagues_profiles_invites.sql` applied successfully.
- Production D1 migration: `0002_leagues_profiles_invites.sql` applied successfully.

Focused coverage includes Google picture persistence, profile ownership/validation, league create/edit authorization including target legs and points per win, invite hashing/join/capacity/revocation and metadata redaction, player-only result submission, average rounding, legacy result average normalization, pair limits, confirmation/dispute transitions, confirmed-only standings, admin result correction/deletion/audit records, private-history filtering for deleted results, clearing stale confirmation metadata, clipboard-independent invite creation, public league-player redaction, admin historical-result controls, admin result editing with explicit delete confirmation, client API paths, invite management and mobile player/admin rendering.

## Production observations

- `GET https://darts.graingers.agency/`: `200`, title `Misfits 501`.
- `GET /api/health`: `200`, `{"ok":true}`.
- `GET /api/public/leagues`: `200`, seeded `Misfits 501`, open, capacity `32`, games per pair `1`.
- `GET /api/public/leagues/misfits-501/players`: `200`, active player list returned without email addresses or other private fields.
- `GET /api/public/leagues/misfits-501/standings`: `200`, current active player is visible with zero games.
- `GET /api/public/leagues/misfits-501/results`: `200`, empty result list.
- Unauthenticated `GET /api/admin/leagues`: `401`.
- Unauthenticated `GET /api/admin/leagues/misfits-501/invites`: `401` for the new admin invite-management route.
- Unauthenticated invite join: `401`.
- `https://darts-501.zerobytemode.workers.dev/`: `404`; the workers.dev namespace is not an active public route.
- The official Google button rendered on the live custom origin. Clicking it opened a Google Accounts sign-in tab whose request included `origin=https://darts.graingers.agency`.
- A 390x844 live screenshot was checked after deployment. The brand header, public table, result columns and Google sign-in control fit without horizontal clipping or overlap; the browser reported `document.documentElement.scrollWidth === document.documentElement.clientWidth === 390`.
- After the admin-control deployment, `GET /api/health`, the public league list, the redacted player endpoint, the seeded standings/results endpoints, both unauthenticated admin guards, and the legacy workers.dev hostname were rechecked; the public endpoints returned `200`, the admin guards returned `401`, and the legacy hostname returned `404`.

## Proof boundary

The clean Playwright browser had no Google account session, so it could verify the live Google button and origin but could not complete account selection. The current remote D1 state confirms the existing bootstrap account is `wjgrainger@gmail.com` with role `ADMIN`; a real signed-in browser still needs to exercise the new invite join, profile edit, result submission and opponent confirmation flow before those player-facing production behaviors can be marked live-observed.
