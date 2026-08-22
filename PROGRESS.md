# Misfits 501 Progress

**Updated:** 22 August 2026  
**Current branch:** `feat/private-club-entry`  
**Draft PR:** #172 `feat: make Misfits private and invite-approved`  
**Current focus:** Task 4 — admin-controlled club admission and retirement of league self-invites  
**Verified through:** Task 3 — approved-member privacy boundary  
**Latest verified code SHA:** `bc78bafe918622e19391803312bb50368b887750`  
**Latest verified CI:** run #756 — Wrangler types, TypeScript, full tests and production build GREEN; deploy skipped

## Authority

- Product: `PRODUCT.md`
- Vision/platform guardrail: `VISION.md`
- Standing UI authority: `DESIGN.md`
- Private-club entry design: `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`
- Private-club implementation plan: `docs/superpowers/plans/2026-08-22-private-club-entry.md`
- Mobile Experience Reset design: `docs/superpowers/specs/2026-08-22-mobile-experience-reset-design.md`
- Mobile experience acceptance stories: `docs/superpowers/specs/2026-08-22-mobile-experience-stories.md`
- Functional story wording/acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Latest functional story evidence: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- GitHub issues own operational functional story open/closed state.
- `AGENTS.md` owns durable delivery/test/verification policy.

## Functional backlog remains parked

**117/150 functional stories are verified/closed. 33 remain deliberately parked and open: 12 PARTIAL + 21 MISSING.**

The private-club release does not close parked stories merely by changing access/UI.

## Private Club Entry — ACTIVE IMPLEMENTATION

User-approved product decisions remain authoritative:

- Misfits is private: anonymous users see no league, season, player, standings or result data.
- A brand-new person must arrive through a valid club invite before Google sign-in may create a membership request.
- Normal homepage Google sign-in is only for existing known users.
- New invited users become `PENDING`; they do not become club members or league players automatically.
- A club admin must `APPROVE` or `REJECT` each pending request in Club access.
- Club approval is permanent Misfits membership.
- Season/league assignment remains separate in `league_players`.
- Approved but unassigned members may browse private club leagues/standings/results but cannot participate as competitors.
- Pending users see only the private membership-pending experience.
- Primary app navigation becomes `League · Record · Results · More`; Admin moves under More for admins.
- Normal interaction accent changes from emerald to the Misfits red; green becomes semantic success/status only.

### Task 1 — migration and permanent membership model: COMPLETE

- Added additive `migrations/0006_private_club_membership.sql`.
- Added `users.club_status` with `PENDING / APPROVED / REJECTED`.
- Added hashed `club_invites` table.
- Existing admins/master admin/active league members backfill to APPROVED; other historical users remain PENDING.
- Existing leagues harden to PRIVATE.
- Migration has **not** been applied to production.

### Task 2 — invite-only admission and authentication: COMPLETE

- Unknown Google identities cannot register from normal sign-in.
- Valid club invite creates a PENDING user only and consumes club-invite usage.
- Invalid/expired/revoked invitations are rejected.
- REJECTED membership cannot be reset by another invite.
- Suspended accounts cannot authenticate.
- OAuth callback no longer creates unknown users.
- Client auth payload carries machine-readable membership state/errors.
- Task 2 security tests were GREEN before Task 3 began.

### Task 3 — approved-member privacy boundary: COMPLETE

TDD evidence:

- Test-only SHA `3ff83031944280beafab0cf0993adf7f0f8a07dc` produced CI #753 RED only on the new Task 3 assertions; 243 existing tests passed.
- Initial implementation made the new Task 3 security tests GREEN; stale legacy fixtures were then corrected to model migration-0006 users as APPROVED rather than weakening the guard.
- CI #755 passed Wrangler types, TypeScript, full tests and production build.
- Architectural cleanup SHA `bc78bafe918622e19391803312bb50368b887750` removed legacy `listPublicLeagues`/`canViewLeague` read authority and introduced `listClubLeagues`.
- CI #756 passed Wrangler types, TypeScript, full tests and production build. Deployment was skipped.

Current server contract:

- anonymous protected club reads → 401 `UNAUTHENTICATED`;
- PENDING → 403 `MEMBERSHIP_PENDING`;
- REJECTED → 403 `MEMBERSHIP_REJECTED`;
- APPROVED members, even if unassigned, may browse all club leagues/standings/results;
- successful protected reads use `Cache-Control: private, no-store`;
- profile, nickname, personal results and result mutations require APPROVED membership;
- `/api/me` remains available to pending/rejected sessions so clients can discover restricted state;
- `requireAdmin` requires both `clubStatus === APPROVED` and role ADMIN;
- league placement remains participation authority, not read authority.

## Next action — Task 4

Follow `docs/superpowers/plans/2026-08-22-private-club-entry.md` Task 4 with RED/GREEN tests:

1. Extend admin user records/updates with `clubStatus` and `createdAt`.
2. Approve/reject pending members without creating `league_players` rows; audit the change.
3. Prevent ADMIN role unless resulting club status is APPROVED; protect existing/master admins from pending/rejected state.
4. Add admin club-invite list/create/revoke endpoints using the existing `club_invites` table.
5. Retire legacy league-scoped invite runtime endpoints and `/api/invites/:token/join`; delete runtime `src/server/db/invites.ts` only when no caller remains.
6. Replace client league-invite API/UI with Club access admission controls; keep Season members focused on league placement.
7. Run the targeted Task 4 suite and full CI gate.

After Task 4 continue Tasks 5–7: private splash/membership states, simplified `League · Record · Results · More` navigation, red brand treatment, Impeccable/Cave Pony review and fixes.

## PRODUCTION D1 HARD STOP

`0006_private_club_membership.sql` has **not** been applied remotely.

Do not apply migration `0006`, deploy code that depends on it to production, or merge PR #172 until Tasks 1–7 and the final repository gate are complete and the user gives explicit approval at the production D1 migration gate.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs or additional runtime.
- Do not edit applied migrations.
- Do not automate remote D1 migration.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before `APPROVED` club membership is verified by the Worker.
- Keep all 33 parked functional stories open until separately revalidated.
