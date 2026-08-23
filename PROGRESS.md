# Misfits 501 Progress

**Updated:** 23 August 2026  
**Current branch:** `feat/private-club-entry`  
**Draft PR:** #172 `feat: make Misfits private and invite-approved`  
**Current focus:** Production D1 migration gate  
**Verified through:** Tasks 1–7 — private club entry, admin admission, final member navigation and UI/simplification review  
**Latest verified code SHA:** `e7d61767d588c9e318125f0bae211d8a0c0c779f`  
**Latest verified code CI:** run #796 — Wrangler types, TypeScript, Impeccable source detector, 62 test files / 257 tests and production build GREEN; deploy skipped  
**Production migration approval:** RECEIVED from user on 23 August 2026  

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

## Private Club Entry — Tasks 1–7 COMPLETE

The release contract is now implemented on the feature branch:

- Misfits is private: anonymous users see no league, season, player, standings or result data.
- A brand-new person must arrive through a valid club invite before Google sign-in may create a membership request.
- Normal homepage Google sign-in is only for existing known users.
- New invited users become `PENDING`; they do not become club members or league players automatically.
- A club admin must `APPROVE` or `REJECT` each pending request in Club access.
- Club approval is permanent Misfits membership.
- Season/league assignment remains separate in `league_players`.
- Approved but unassigned members may browse private club leagues/standings/results but cannot participate as competitors.
- Pending and rejected users remain outside all club-data surfaces.
- Primary app navigation is exactly `League · Record · Results · More`; Admin lives under More for admins.
- Normal interaction accent is Misfits red; green is semantic OPEN/success/confirmed/winner state only.

### Task 1 — migration and permanent membership model: COMPLETE

- Added additive `migrations/0006_private_club_membership.sql`.
- Added `users.club_status` with `PENDING / APPROVED / REJECTED`.
- Added hashed `club_invites` table.
- Existing admins/master admin/active league members backfill to APPROVED; other historical users remain PENDING.
- Existing leagues harden to PRIVATE.
- Migration has **not** yet been applied to production.

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
- `listClubLeagues` is the club read authority; legacy public-read authority was retired.

### Task 4 — admin-controlled club admission: COMPLETE

- Admin user records expose permanent `clubStatus` and `createdAt`.
- Admins approve/reject pending members without creating league placement.
- ADMIN role cannot be granted unless membership is APPROVED; master/last-admin protections remain intact.
- Club-wide invite create/list/revoke uses the permanent `club_invites` authority.
- Raw invite token is exposed only when created; token hashes are never exposed.
- Admission and role changes are audited.
- Legacy league-scoped invite runtime routes and player self-enrolment were retired.
- Season members own placement only, not club admission.

### Task 5 — private entry states: COMPLETE

- App does not request club leagues before authentication/membership is resolved.
- Signed-out shell exposes no club data.
- `/join/:token` carries the invite only through Google admission, then clears session storage and the raw URL.
- PENDING and REJECTED users remain locked outside the club application.
- APPROVED users missing a nickname enter onboarding before club data loads.
- Vitest 4 rejected-Promise setup noise was fixed by making rejection mocks lazy rather than pre-rejected.

### Task 6 — final member navigation: COMPLETE

- Primary navigation is exactly `League · Record · Results · More`.
- Fixture selection lives inside Record, not as a primary tab.
- More contains Players, Profile, Admin for admins, and Sign out.
- Approved unassigned members can browse a league but cannot record results.
- Retired `Season admin / Club table` top-level switcher is gone.
- Admin league selection remains separate from the player workspace.
- Zero-league approved users retain the same four-item member navigation.
- An approved admin with zero leagues can open More → Admin and create the first league.

### Task 7 — design, Impeccable and simplification: COMPLETE

- `DESIGN.md` is now the private-club visual authority and documents admission states, exact navigation, red/green colour semantics, responsive widths and accessibility rules.
- `member-experience.css` and `private-club.css` implement Misfits red for normal interaction while preserving green for semantic positive state.
- Safe-area-aware mobile navigation, 44px member targets, focus-visible treatment and reduced-motion behavior are present.
- Repo-local Impeccable detector is now a named CI gate.
- CI #794 correctly rejected one stereotyped side-tab stripe in Club access; the stripe was removed rather than suppressing the detector.
- Impeccable is GREEN in CI #796.
- Retired client `joinInvite()` was deleted; retired `src/server/db/invites.ts` is absent.
- Cave Pony simplicity result: no new runtime/service/framework; one permanent membership authority (`users.club_status`), one admission-invite authority (`club_invites`), one participation authority (`league_players`), one member navigation owner and no legacy self-enrolment runtime path.
- Rendered/manual pixel screenshot acceptance was not performed in this tool session; automated behavior, accessibility-oriented structure, responsive CSS and source-quality gates are recorded instead.

## Verification evidence

Latest code gate before this handoff update:

- SHA `e7d61767d588c9e318125f0bae211d8a0c0c779f`
- CI #796
- Wrangler generated types: GREEN
- TypeScript client + Worker: GREEN
- Impeccable source detector: GREEN
- Vitest: **62/62 files, 257/257 tests**
- Vite production build: GREEN
- production deploy job: SKIPPED on PR, as intended

A fresh CI run is required on the final documentation head before migration/merge.

## PRODUCTION D1 GATE — APPROVED, NOT YET EXECUTED

The user explicitly approved the production gate on 23 August 2026.

`0006_private_club_membership.sql` is still **unapplied remotely** at this checkpoint.

Repository-supported remote command:

```bash
npm run db:migrate:remote
# -> wrangler d1 migrations apply misfits --remote
```

Required post-migration verification:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Record real command/output evidence in `docs/operations/evidence/2026-08-22-d1-migration-0006.md` without secrets or raw invite tokens.

### Current operational constraint

The repository has only `.github/workflows/ci.yml`; there is no manual migration workflow/dispatch. CI intentionally does **not** run D1 migrations automatically. The current connected tool set can operate GitHub but does not expose an authenticated Cloudflare/Wrangler shell or Cloudflare connector capable of executing the approved remote migration.

Therefore **do not merge PR #172 or trigger the main deployment until migration 0006 has actually succeeded and its remote schema verification has been captured**. Do not add an automatic migration to CI merely to bypass this gate.

## After remote migration succeeds

1. Create `docs/operations/evidence/2026-08-22-d1-migration-0006.md` with actual migration/verification evidence.
2. Re-run/refetch the exact PR head gate if the evidence commit changes the head.
3. Mark PR #172 ready if still draft and merge to `main`.
4. Verify main CI and Cloudflare Worker deployment are GREEN.
5. Perform a production health/auth/privacy smoke check without exposing club data.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs or additional runtime.
- Do not edit applied migrations.
- Do not automate remote D1 migration.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before APPROVED club membership is verified by the Worker.
- Keep all 33 parked functional stories open until separately revalidated.
