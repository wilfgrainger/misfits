# Misfits 501 Progress

**Updated:** 23 August 2026  
**Current branch:** `feat/private-club-entry`  
**Draft PR:** #172 `feat: make Misfits private and invite-approved`  
**Current focus:** Task 7 — final UI/design/simplification/release review  
**Verified through:** Task 6 — private entry plus final member navigation  
**Latest verified code SHA:** `b4aec58467c1d59e316b73016f1ab5d38a72e52e`  
**Latest verified CI:** run #789 — Wrangler types, TypeScript, 62 test files / 257 tests, and production build GREEN; deploy skipped

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

## Private Club Entry — Tasks 1–6 verified

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
- Primary app navigation is exactly `League · Record · Results · More`; Admin lives under More for admins.
- Normal interaction accent is Misfits red; green is semantic success/status only.

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

### Task 3 — approved-member privacy boundary: COMPLETE

- Anonymous protected club reads return 401 `UNAUTHENTICATED`.
- PENDING returns 403 `MEMBERSHIP_PENDING`.
- REJECTED returns 403 `MEMBERSHIP_REJECTED`.
- APPROVED members, including unassigned members, may browse club leagues/standings/results.
- Protected reads use `Cache-Control: private, no-store`.
- Profile, nickname, personal results and result mutations require APPROVED membership.
- `requireAdmin` requires both APPROVED membership and ADMIN role.
- League placement remains participation authority, not read authority.
- Architectural cleanup introduced `listClubLeagues` as the club read authority and retired legacy public-read authority.
- CI #756 passed Wrangler types, TypeScript, full tests and production build.

### Task 4 — admin-controlled club admission: COMPLETE

- Admin user records expose permanent `clubStatus` and `createdAt`.
- Admins approve/reject pending members without creating league placement.
- ADMIN role cannot be granted unless membership is APPROVED; master/last-admin protections remain intact.
- Club-wide invite create/list/revoke uses the permanent `club_invites` authority.
- Raw invite token is exposed only when created; token hashes are never exposed.
- Admission and role changes are audited.
- Legacy league self-join and league-scoped invite runtime routes were retired.
- Season members now own placement only, not club admission.
- Verified implementation SHA `80bd855c23540dda65cf1992f962bb30c5b072ed`; CI #759 GREEN.

### Task 5 — private entry states: COMPLETE

- TDD RED contract began at `6cbc95226002a5bb64c0bd64d61d1ad7f7773a31`.
- App does not request club leagues before authentication/membership is resolved.
- Signed-out shell exposes no club data.
- Normal Google sign-in cannot admit an unknown user without an invite.
- `/join/:token` keeps the token only through Google admission, then clears session storage and the raw URL.
- PENDING and REJECTED users remain locked outside the club application.
- APPROVED users missing a nickname enter onboarding.
- Private-entry tests are GREEN in CI #789.

### Task 6 — final member navigation: COMPLETE

- Primary navigation is exactly `League · Record · Results · More`.
- Fixture selection lives inside Record, not as a primary tab.
- More contains Players, Profile, Admin for admins, and Sign out.
- Approved unassigned members can browse a league but cannot record results.
- Retired `Season admin / Club table` top-level switcher is gone.
- Admin league selection remains separate from the player workspace.
- A genuine zero-league edge case was fixed: an approved admin can still open More → Admin and create the first league.
- Zero-league approved users now retain the same four-item member navigation through `EmptyMemberWorkspace`.
- Member navigation and account/admin-access tests are GREEN in CI #789.

## CI blocker diagnosis — RESOLVED

The long-running red CI was not one product defect and must not be treated as such.

Evidence:

- CI #768 at `e2380233542c6997dfe1ae223464093b7029bdcc` was GREEN before Task 5 RED tests were introduced.
- CI #769 at `6cbc95226002a5bb64c0bd64d61d1ad7f7773a31` went RED deliberately when the Task 5 contract tests were added.
- Later red runs predated Task 6, proving the four-tab navigation implementation was not the origin.
- `tests/client/app-league-create.test.tsx` still asserted the retired `Season admin / Club table` switcher and an obsolete entry state. Those tests were rewritten around the approved private-club UI while preserving the useful league/admin invariants.
- Vitest 4.1.11 reported already-rejected Promises created during `beforeEach` in `private-club-entry.test.tsx` as unhandled rejections even though all six private-entry assertions passed. The mocks now create rejection Promises lazily when `me()` / `signIn()` consume them, removing the harness false signal without weakening product behavior.
- CI #787 exposed three additional test-only `ReferenceError` failures from omitted hoisted fixture destructuring; those were corrected without changing production behavior.
- CI #789 at code SHA `b4aec58467c1d59e316b73016f1ab5d38a72e52e` is the confirming gate: **62/62 test files and 257/257 tests passed**, with Wrangler types, TypeScript and production Vite build also GREEN. Deploy was skipped.

The only genuine application defect uncovered during this diagnosis was the zero-league admin navigation gap described in Task 6; it is fixed and covered by tests.

## Next action — Task 7

Finish the release without changing the approved product contract:

1. Update `DESIGN.md` to describe the private signed-out shell, pending/rejected states, fixed four-item navigation, Misfits red interaction accent, semantic-only green, and Club access hierarchy.
2. Apply the repo-local Impeccable audit/polish/adapt/colorize/clarify/harden/normalize/typeset guidance where relevant.
3. Run a Cave Pony simplification review: one invite authority, one membership authority, no dead public surface, no duplicate navigation, no unnecessary infrastructure or prop-drilled file forest.
4. Check 360/390/430px mobile layouts and desktop ≥1024px for safe areas, overflow, tap targets, focus/keyboard behavior, empty/loading/error states and Club access readability.
5. Run the final full CI gate and record exact evidence here.
6. Recheck PR #172 draft/mergeability state. Do not merge at this stage.

## PRODUCTION D1 HARD STOP

`0006_private_club_membership.sql` has **not** been applied remotely.

Do not apply migration `0006`, deploy code that depends on it to production, or merge PR #172 until Task 7 and the final repository gate are complete and the user gives explicit approval at the production D1 migration gate.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs or additional runtime.
- Do not edit applied migrations.
- Do not automate remote D1 migration.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before APPROVED club membership is verified by the Worker.
- Keep all 33 parked functional stories open until separately revalidated.
