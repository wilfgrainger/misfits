# Misfits Leagues v2 Verification

**Date:** 20 August 2026  
**Release commit:** `42653357c6cdb20529ce1b339a84d088a8628ac3`
**Cloudflare Worker version:** `99cf9d6f-615d-4c6d-9d0a-d37d2c52c55a`
**Live origin:** `https://darts.graingers.agency`

## Source and automated verification

- `npm test`: 17 test files, 58 tests passed.
- `npm run typecheck`: passed for client and Worker TypeScript projects.
- `npm run build`: passed with Vite production assets generated.
- `git diff --check`: passed.
- `npm run db:migrate:local`: migrations `0001_initial.sql` and `0002_leagues_profiles_invites.sql` applied successfully.
- Production D1 migration: `0002_leagues_profiles_invites.sql` applied successfully.

Focused coverage includes Google picture persistence, profile ownership/validation, league create/edit authorization, invite hashing/join/capacity/revocation, player-only result submission, average rounding, legacy result average normalization, pair limits, confirmation/dispute transitions, confirmed-only standings, admin result correction/deletion/audit records, clipboard-independent invite creation, client API paths and mobile player/admin rendering.

## Production observations

- `GET https://darts.graingers.agency/`: `200`, title `Misfits 501`.
- `GET /api/health`: `200`, `{"ok":true}`.
- `GET /api/public/leagues`: `200`, seeded `Misfits 501`, open, capacity `32`, games per pair `1`.
- `GET /api/public/leagues/misfits-501/standings`: `200`, current active player is visible with zero games.
- `GET /api/public/leagues/misfits-501/results`: `200`, empty result list.
- Unauthenticated `GET /api/admin/leagues`: `401`.
- Unauthenticated invite join: `401`.
- `https://darts-501.zerobytemode.workers.dev/`: `404`; the workers.dev namespace is not an active public route.
- The official Google button rendered on the live custom origin. Clicking it opened a Google Accounts sign-in tab whose request included `origin=https://darts.graingers.agency`.
- A 390x844 live screenshot was checked after deployment. The brand header, public table, result columns and Google sign-in control fit without horizontal clipping or overlap; the browser reported `document.documentElement.scrollWidth === document.documentElement.clientWidth === 390`.
- After the final server hardening deployment, `GET /api/health`, the public league list, and the seeded standings endpoint were rechecked and returned `200`.

## Proof boundary

The clean Playwright browser had no Google account session, so it could verify the live Google button and origin but could not complete account selection. The current remote D1 state confirms the existing bootstrap account is `wjgrainger@gmail.com` with role `ADMIN`; a real signed-in browser still needs to exercise the new invite join, profile edit, result submission and opponent confirmation flow before those player-facing production behaviors can be marked live-observed.
