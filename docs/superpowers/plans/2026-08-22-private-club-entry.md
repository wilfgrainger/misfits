# Private Club Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Misfits 501 a genuinely private, invite-only, admin-approved club while simplifying entry, navigation and brand language.

**Architecture:** Keep one permanent `users` record per Google identity and add `club_status` for permanent club admission. Keep `league_players` as the independent season/league participation authority. Add one hashed `club_invites` table, enforce `APPROVED` membership at Worker guards, retire legacy self-service league invites, then render the splash/pending/private app shell from explicit server state.

**Tech Stack:** React + TypeScript client, Hono Cloudflare Worker, Cloudflare D1, Vitest, Google Identity Services, existing CSS/SVG icon system.

**Spec:** `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`

## Global Constraints

- Cloudflare free tier services only: existing Worker, static assets and one D1 database.
- Do not add KV, R2, Durable Objects, Queues, scheduled jobs, another runtime or paid Cloudflare service.
- Google Identity Services remains the only authentication method.
- Worker authorization is authoritative; React must never be the privacy boundary.
- `users.status` remains `ACTIVE | SUSPENDED`; permanent club admission is `PENDING | APPROVED | REJECTED`.
- Club approval and season/league assignment remain separate operations.
- Approved but unassigned members may browse club leagues, standings and results but may not perform competition actions requiring league participation.
- Existing admins/master admin remain approved and protected.
- Do not edit migrations `0001`–`0005`; add exactly one additive migration `0006_private_club_membership.sql`.
- CI must not apply remote D1 migrations automatically.
- Do not apply the remote D1 migration until the explicit production-migration approval gate in Task 8.
- The ordinary interaction accent becomes Misfits-logo red; green is semantic success/open/confirmed only.
- Signed-out UI reveals no league, season, standings, results, player or member data.
- Pending/rejected sessions may exist but must fail all club-data authorization checks.
- `/api/me` remains available to authenticated pending/rejected users so the client can render their restricted state. Nickname/profile/club-data routes do not.
- Legacy `league_invites` data may remain in historical schema, but its server/client self-service join flow is retired in this release.
- Keep the parked fixture-first release out of scope.

---

## File Structure

### New files

- `migrations/0006_private_club_membership.sql` — `users.club_status`, `club_invites`, deterministic backfill, private league visibility.
- `src/server/db/club-invites.ts` — create/list/validate/consume/revoke club invitation tokens.
- `tests/server/private-club-access.test.ts` — Worker privacy/admission contract.
- `tests/client/private-club-entry.test.tsx` — splash, invite, pending/rejected and no-data-flash contract.

### Existing files to modify or remove

- `src/server/errors.ts` — add `INVITE_REQUIRED`, `MEMBERSHIP_PENDING`, `MEMBERSHIP_REJECTED`.
- `src/server/db/users.ts` — `ClubStatus`, public/session payload support, explicit existing-user refresh and invited pending creation.
- `src/server/auth/session.ts` — expose `clubStatus`; keep suspended-account rejection only at session resolution.
- `src/server/auth/guards.ts` — add `requireClubMember`; admin guard also requires approved membership.
- `src/server/db/leagues.ts` — protected club-wide league listing; read visibility is no longer active league membership.
- `src/server/routes/auth.ts` — normal GIS and OAuth callback cannot create unknown users; invite-authorized GIS creation; approved-only nickname setup.
- `src/server/routes/leagues.ts` — protected league reads; remove `/api/invites/:token/join` self-enrolment.
- `src/server/routes/results.ts` — protected standings/results/member-result routes.
- `src/server/routes/profile.ts` — approved-only profile read/update.
- `src/server/routes/admin.ts` — club approval/rejection and club-invite management.
- `src/server/routes/admin-leagues.ts` — remove legacy league-invite create/list/revoke endpoints and imports.
- Delete: `src/server/db/invites.ts` once no runtime caller remains.
- `src/client/api.ts` — `clubStatus`, API error code, club invitation/admin methods, remove league-invite join methods.
- `src/client/App.tsx` — private splash, invite context, pending/rejected state, approved-session transition, unified shell; remove anonymous public view and legacy invite join.
- `src/client/components/PlayerLeague.tsx` — participation-aware `League · Record · Results · More` navigation.
- `src/client/components/AdminCompetitionDeskV2.tsx` — Club access owns admission/invites; season membership no longer owns invite admission.
- `src/client/mobile-experience.css` — splash and red brand tokens.
- `src/client/member-experience.css` — unified navigation/More/Admin treatment.
- `DESIGN.md` and `PROGRESS.md` — durable UI/release authority and handoff evidence.

---

### Task 1: Add permanent club membership state and migration

**Files:**
- Create: `migrations/0006_private_club_membership.sql`
- Modify: `src/server/db/users.ts`
- Modify: `src/server/auth/session.ts`
- Modify: `src/server/errors.ts`
- Modify: `tests/server/schema.test.ts`
- Create: `tests/server/private-club-access.test.ts`
- Modify: `tests/server/auth-routes.test.ts`

**Interfaces:**
- Produces: `type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED'`
- Produces: `UserRecord.club_status: ClubStatus`
- Produces: `PublicUserSummary.clubStatus: ClubStatus`
- Produces: `AuthUser.clubStatus: ClubStatus`
- Produces error codes: `INVITE_REQUIRED | MEMBERSHIP_PENDING | MEMBERSHIP_REJECTED`

- [ ] **Step 1: Write failing schema/account-state tests**

In `tests/server/schema.test.ts`, assert migration `0006` exists and contains `club_status`, `club_invites`, the approval backfill, and private visibility update. In `tests/server/private-club-access.test.ts`, create representative existing admin, active league member and Google-only users, apply schema/migrations using the existing D1 test harness, then assert:

```ts
expect(admin.club_status).toBe('APPROVED');
expect(existingLeaguePlayer.club_status).toBe('APPROVED');
expect(googleOnlyUser.club_status).toBe('PENDING');
expect(league.visibility).toBe('PRIVATE');
```

- [ ] **Step 2: Run RED tests**

```bash
./node_modules/.bin/vitest run tests/server/schema.test.ts tests/server/private-club-access.test.ts
```

Expected: failure because migration `0006`, `club_status`, and `club_invites` do not exist.

- [ ] **Step 3: Add `0006_private_club_membership.sql`**

```sql
ALTER TABLE users ADD COLUMN club_status TEXT NOT NULL DEFAULT 'PENDING'
  CHECK(club_status IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE TABLE IF NOT EXISTS club_invites (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT,
  uses INTEGER NOT NULL DEFAULT 0 CHECK(uses >= 0),
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_invites_created
  ON club_invites(created_at DESC);

UPDATE users
SET club_status = 'APPROVED'
WHERE role = 'ADMIN'
   OR is_master_admin = 1
   OR EXISTS (
     SELECT 1 FROM league_players
      WHERE league_players.user_id = users.id
        AND league_players.active = 1
   );

UPDATE leagues SET visibility = 'PRIVATE';
```

- [ ] **Step 4: Extend user/session/error types**

In `src/server/db/users.ts`:

```ts
export type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
```

Add `club_status` to `UserRecord`; add `clubStatus` to `PublicUserSummary`; map it in `publicUser()`.

In `src/server/auth/session.ts`, add `clubStatus` to `AuthUser`, select `users.club_status`, and return it. Keep suspended account behavior:

```ts
if (!row || row.status !== 'ACTIVE') return null;
```

Do not reject pending/rejected membership here.

In `src/server/errors.ts`, extend `ApiErrorCode` with the three new codes.

- [ ] **Step 5: Run GREEN focused tests**

```bash
./node_modules/.bin/vitest run tests/server/schema.test.ts tests/server/private-club-access.test.ts tests/server/auth-routes.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add migrations/0006_private_club_membership.sql src/server/db/users.ts src/server/auth/session.ts src/server/errors.ts tests/server/schema.test.ts tests/server/private-club-access.test.ts tests/server/auth-routes.test.ts
git commit -m "feat: add permanent club membership state"
```

---

### Task 2: Add club invites and close unknown-user auth creation

**Files:**
- Create: `src/server/db/club-invites.ts`
- Modify: `src/server/db/users.ts`
- Modify: `src/server/routes/auth.ts`
- Modify: `src/client/api.ts`
- Modify: `tests/server/private-club-access.test.ts`
- Modify: `tests/server/auth-routes.test.ts`
- Modify: `tests/client/api.test.ts`

**Interfaces:**
- Produces: `ClubInviteRecord`
- Produces: `createClubInvite(db, actorUserId, now, expiresAt)`
- Produces: `listClubInvites(db)`
- Produces: `validateClubInvite(db, token, now)`
- Produces: `consumeClubInvite(db, inviteId)`
- Produces: `revokeClubInvite(db, actorUserId, inviteId, now)`
- Produces: `refreshGoogleUser(db, user, identity, now)`
- Produces: `createPendingInvitedUser(db, identity, now)`
- Changes: `POST /api/auth/google` JSON to `{ credential: string; inviteToken?: string }`

- [ ] **Step 1: Write RED admission tests**

Add exact cases:

```ts
it('does not create an unknown Google user without a club invite');
it('creates an unknown invited Google user as PENDING only');
it('does not create a user for an invalid club invite');
it('does not create a user for an expired club invite');
it('does not create a user for a revoked club invite');
it('signs an existing approved member in without requiring an invite');
it('keeps an existing pending member pending on later sign-in');
it('keeps an existing rejected member rejected even when another invite token is supplied');
it('does not authenticate a suspended account');
it('OAuth callback does not create an unknown user');
```

For unknown normal sign-in, assert `403`, error code `INVITE_REQUIRED`, and no new `users` row.

- [ ] **Step 2: Run RED admission tests**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/auth-routes.test.ts
```

- [ ] **Step 3: Implement hashed club invite storage**

Follow the existing cryptographic pattern: 32 random bytes, base64url token, SHA-256 token hash in D1. Validation order:

```ts
if (!invite) throw new AppError('INVITE_INVALID', 'That invitation is not valid', 404);
if (invite.revoked_at) throw new AppError('INVITE_REVOKED', 'That invitation has been revoked', 409);
if (invite.expires_at && invite.expires_at <= now.toISOString()) {
  throw new AppError('INVITE_EXPIRED', 'That invitation has expired', 409);
}
```

Increment `uses` only when a new pending user is created. Never insert into `league_players`.

- [ ] **Step 4: Split existing-user refresh from account creation**

Replace generic unknown-user upsert behavior with explicit functions:

```ts
export async function refreshGoogleUser(
  db: D1Database,
  user: UserRecord,
  identity: GoogleIdentity,
  now = new Date(),
): Promise<UserRecord>;

export async function createPendingInvitedUser(
  db: D1Database,
  identity: GoogleIdentity,
  now = new Date(),
): Promise<UserRecord>;
```

Configured master/bootstrap admin email remains the only unknown-user exception and must be created as `APPROVED` + `ADMIN`.

- [ ] **Step 5: Make GIS sign-in admission-aware**

Order is significant:

```ts
const existing = await getUserByGoogleSub(db, identity.sub);

if (existing) {
  // Existing PENDING/REJECTED state is preserved; invite cannot reset it.
  user = await refreshGoogleUser(db, existing, identity, now());
} else if (isConfiguredMasterOrBootstrap(identity.email)) {
  user = await createConfiguredAdminUser(...);
} else if (inviteToken) {
  const invite = await validateClubInvite(db, inviteToken, now());
  user = await createPendingInvitedUser(db, identity, now());
  await consumeClubInvite(db, invite.id);
} else {
  throw new AppError('INVITE_REQUIRED', 'A Misfits invitation is required', 403);
}

if (user.status !== 'ACTIVE') {
  throw new AppError('FORBIDDEN', 'This account is suspended', 403);
}
```

Preserve `AppError` codes rather than collapsing them to generic validation errors.

- [ ] **Step 6: Close the OAuth callback back door**

`GET /auth/google/callback` may refresh/sign in an existing account or configured master/bootstrap admin, but it must not create an ordinary unknown account. Unknown OAuth callback identity returns the private entry flow with invite-required failure; club-invite account creation is supported only by the GIS credential flow that can carry `inviteToken`.

- [ ] **Step 7: Preserve API error codes client-side**

In `src/client/api.ts`:

```ts
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}
```

Parse `{ error: { code, message } }`. Change:

```ts
signIn(credential: string, inviteToken?: string): Promise<AuthPayload>
```

and include `inviteToken` only when present.

- [ ] **Step 8: Run GREEN admission/API tests**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/auth-routes.test.ts tests/client/api.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/server/db/club-invites.ts src/server/db/users.ts src/server/routes/auth.ts src/client/api.ts tests/server/private-club-access.test.ts tests/server/auth-routes.test.ts tests/client/api.test.ts
git commit -m "feat: require club invite for new accounts"
```

---

### Task 3: Enforce approved membership across all club/member routes

**Files:**
- Modify: `src/server/auth/guards.ts`
- Modify: `src/server/db/leagues.ts`
- Modify: `src/server/routes/auth.ts`
- Modify: `src/server/routes/leagues.ts`
- Modify: `src/server/routes/results.ts`
- Modify: `src/server/routes/profile.ts`
- Modify: `tests/server/private-club-access.test.ts`
- Modify: `tests/server/league-routes.test.ts`
- Modify: `tests/server/result-routes.test.ts`
- Modify: `tests/server/auth-routes.test.ts`
- Modify: existing profile route tests in `tests/server/` if their assertions change

**Interfaces:**
- Produces: `requireClubMember: MiddlewareHandler<AuthAppEnv>`
- Produces: `listClubLeagues(db): Promise<LeagueRecord[]>`

- [ ] **Step 1: Write RED privacy tests**

Prove all of these:

```ts
anonymous GET /api/public/leagues -> 401
pending GET /api/public/leagues -> 403 MEMBERSHIP_PENDING
rejected GET /api/public/leagues -> 403 MEMBERSHIP_REJECTED
approved unassigned GET /api/public/leagues -> 200
approved unassigned GET standings/results/players -> 200
pending GET /api/me/results -> 403
pending GET/PATCH /api/me/profile -> 403
pending POST /api/me/username -> 403
approved unassigned result submission -> denied by league participation rule
```

Assert every successful club-data read uses `Cache-Control: private, no-store`.

- [ ] **Step 2: Run RED privacy tests**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/league-routes.test.ts tests/server/result-routes.test.ts tests/server/auth-routes.test.ts
```

- [ ] **Step 3: Add `requireClubMember`**

```ts
export const requireClubMember: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = c.get('user');
  if (user?.clubStatus === 'PENDING') {
    return jsonError(c, new AppError('MEMBERSHIP_PENDING', 'Club approval is still pending', 403));
  }
  if (user?.clubStatus === 'REJECTED') {
    return jsonError(c, new AppError('MEMBERSHIP_REJECTED', 'Club membership was not approved', 403));
  }
  if (!user || user.clubStatus !== 'APPROVED') {
    return jsonError(c, new AppError('FORBIDDEN', 'Club membership is required', 403));
  }
  return next();
};
```

Make `requireAdmin` also require `clubStatus === 'APPROVED'` in addition to role, providing defense in depth for the admin-always-approved invariant.

- [ ] **Step 4: Create approved-member club league listing**

Replace `listPublicLeagues()` with `listClubLeagues()` that returns all club-managed leagues in the existing open/recent/name ordering. Do not filter on league visibility and do not join `league_players`.

`listUserLeagues()` remains participation-only.

- [ ] **Step 5: Guard exact league/result/profile routes**

Apply `requireUser, requireClubMember` to:

```text
GET  /api/public/leagues
GET  /api/public/leagues/:key
GET  /api/public/leagues/:key/players
GET  /api/me/leagues
GET  /api/public/leagues/:leagueId/standings
GET  /api/public/leagues/:leagueId/results
GET  /api/me/results
POST /api/leagues/:leagueId/results
POST /api/results/:resultId/confirm
POST /api/results/:resultId/dispute
POST /api/me/username
GET  /api/me/profile
PATCH /api/me/profile
```

Do not add `requireClubMember` to `/api/me`, because pending/rejected clients need that endpoint to discover their restricted state.

- [ ] **Step 6: Remove league-membership-as-read-authority**

`canViewLeague()` must no longer allow/deny the protected club browsing routes based on `league_players`. Remove it if no runtime caller remains after route changes. Approved club membership owns reads; league membership owns participation only.

- [ ] **Step 7: Run GREEN privacy tests**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/league-routes.test.ts tests/server/result-routes.test.ts tests/server/auth-routes.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/server/auth/guards.ts src/server/db/leagues.ts src/server/routes/auth.ts src/server/routes/leagues.ts src/server/routes/results.ts src/server/routes/profile.ts tests/server
git commit -m "feat: enforce approved club access"
```

---

### Task 4: Replace league self-invites with admin-controlled club admission

**Files:**
- Modify: `src/server/db/admin.ts`
- Modify: `src/server/routes/admin.ts`
- Modify: `src/server/routes/admin-leagues.ts`
- Delete: `src/server/db/invites.ts`
- Modify: `src/client/api.ts`
- Modify: `src/client/components/AdminCompetitionDeskV2.tsx`
- Modify: `tests/server/admin-routes.test.ts`
- Modify: `tests/server/season-invite.test.ts`
- Modify: `tests/server/league-routes.test.ts`
- Modify: `tests/client/admin-access-protection.test.tsx`
- Modify: `tests/client/admin-membership-invites.test.tsx`
- Modify: `tests/client/admin-competition.test.tsx`

**Interfaces:**
- Extends: `AdminPlayer` with `clubStatus` and `createdAt`
- Extends: `AdminPlayerChanges` with `clubStatus?: ClubStatus`
- Produces: `AdminClubInvite`
- Produces: `GET /api/admin/club-invites`
- Produces: `POST /api/admin/club-invites`
- Produces: `POST /api/admin/club-invites/:id/revoke`
- Removes runtime routes: league invite list/create/revoke and `/api/invites/:token/join`

- [ ] **Step 1: Write RED admin/admission tests**

Prove:

```ts
it('lists pending club requests with request date');
it('approves a pending member without creating league_players');
it('rejects a pending member without creating league_players');
it('audits approval and rejection');
it('does not allow ADMIN role unless clubStatus is APPROVED');
it('creates a club invite without a league id');
it('revokes a club invite');
it('does not expose legacy league invite creation or self-join routes');
```

- [ ] **Step 2: Run RED admin/invite tests**

```bash
./node_modules/.bin/vitest run tests/server/admin-routes.test.ts tests/server/season-invite.test.ts tests/server/league-routes.test.ts tests/client/admin-access-protection.test.tsx tests/client/admin-membership-invites.test.tsx tests/client/admin-competition.test.tsx
```

- [ ] **Step 3: Extend admin user update authority**

```ts
export interface AdminPlayerChanges {
  role?: UserRole;
  status?: UserStatus;
  clubStatus?: ClubStatus;
}
```

Persist role/status/club_status in one audited update. Include `clubStatus` in before/after JSON. Preserve master-admin and last-active-admin protections. Reject `role: 'ADMIN'` unless resulting club status is `APPROVED`. Reject attempts to make an existing admin/master admin pending/rejected.

- [ ] **Step 4: Add club invite admin endpoints**

All endpoints use `requireUser, requireAdmin`; writes also use `requireSameOrigin`.

Create returns raw token URL only once:

```json
{
  "invite": {
    "id": "...",
    "expiresAt": null,
    "url": "https://darts.graingers.agency/join/<raw-token>"
  }
}
```

List returns metadata only, never raw token/hash.

- [ ] **Step 5: Retire legacy league invite runtime code**

Remove these routes from `src/server/routes/admin-leagues.ts`:

```text
GET  /api/admin/leagues/:id/invites
POST /api/admin/leagues/:id/invites
POST /api/admin/invites/:id/revoke
```

Remove `/api/invites/:token/join` from `src/server/routes/leagues.ts`.

Delete `src/server/db/invites.ts` when no runtime import remains. Keep the historical `league_invites` table in old migrations untouched.

- [ ] **Step 6: Update client API**

Remove old `AdminInvite`, `adminInvites`, `createInvite`, `revokeInvite`, and `joinInvite` client methods when no caller remains.

Add:

```ts
export interface AdminClubInvite {
  id: string;
  expiresAt: string | null;
  uses: number;
  revokedAt: string | null;
  createdAt: string;
}
```

and:

```ts
adminClubInvites()
createAdminClubInvite(expiresAt?: string | null)
revokeAdminClubInvite(id: string)
```

- [ ] **Step 7: Rebuild `Club access` UI**

In `AdminCompetitionDeskV2.tsx`, `Club access` renders:

```text
Pending requests
  email · requested date · Approve · Reject

Members
  username/email · Player/Admin · Active/Suspended · league placement context

Club invitation
  Create invite · optional expiry · active/revoked invite metadata
```

Rename task label `Members & invites` to `Season members`. Remove league-invite state/actions from that task; it remains season placement only.

- [ ] **Step 8: Run GREEN admin/invite tests**

```bash
./node_modules/.bin/vitest run tests/server/admin-routes.test.ts tests/server/season-invite.test.ts tests/server/league-routes.test.ts tests/client/admin-access-protection.test.tsx tests/client/admin-membership-invites.test.tsx tests/client/admin-competition.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add src/server/db/admin.ts src/server/db/club-invites.ts src/server/routes/admin.ts src/server/routes/admin-leagues.ts src/server/routes/leagues.ts src/client/api.ts src/client/components/AdminCompetitionDeskV2.tsx tests
git rm src/server/db/invites.ts
git commit -m "feat: add admin-controlled club admission"
```

---

### Task 5: Build the private splash and membership entry states

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/api.ts`
- Modify: `src/client/mobile-experience.css`
- Create: `tests/client/private-club-entry.test.tsx`
- Modify: `tests/client/public-league.test.tsx`
- Modify: `tests/client/app-ux-compression.test.tsx`
- Modify: `tests/client/account-profile.test.tsx`

**Interfaces:**
- `ViewState`: loading/splash, signed-out, pending, rejected, onboarding, signed-in.
- `AuthPayload.user.clubStatus` is authoritative.
- Invite token from `/join/:token` is sent only during GIS sign-in for unknown-user admission.

- [ ] **Step 1: Write RED private-entry tests**

Signed-out DOM must contain only club identity/sign-in content and must not contain league data. Invite entry adds only:

```text
You've been invited to join Misfits
```

Pending contains:

```text
Membership request sent
Waiting for a club admin to approve you
Sign out
```

Rejected contains rejection copy + Sign out only. Add an assertion that league API mocks are not called before approved membership resolves.

- [ ] **Step 2: Run RED client tests**

```bash
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/public-league.test.tsx tests/client/app-ux-compression.test.tsx tests/client/account-profile.test.tsx
```

- [ ] **Step 3: Remove anonymous public composition/data loading**

Delete `PublicLeagueView` and signed-out league loading from `App.tsx`. Do not call league/standings/results APIs until `/api/me` returns `clubStatus: 'APPROVED'`.

The initial frame is always the privacy-safe Misfits splash.

- [ ] **Step 4: Reuse `/join/:token` strictly as club admission context**

Store the token under one club-specific session-storage key, for example:

```ts
misfits_pending_club_invite
```

Delete `league_pending_invite`, `misfits_pending_invite`, `joinPendingInvite()` and any call to the removed `joinInvite` API.

On successful invited sign-in, clear the token and `history.replaceState({}, '', '/')` so the raw admission token does not linger in the address bar/history view.

- [ ] **Step 5: Map auth state explicitly**

```ts
PENDING -> pending screen
REJECTED -> rejected screen
APPROVED + username === null -> onboarding
APPROVED + username !== null -> signed-in
```

Normal unknown account error `INVITE_REQUIRED` stays on signed-out splash with concise invite-required copy.

Invalid/expired/revoked invite errors stay outside the app and reveal no club data.

- [ ] **Step 6: Add remembered-session splash transition**

For an approved remembered session, keep splash visible about 800–1000ms total from mount, then fade into the app. Authorization must finish before app content mounts.

Under `prefers-reduced-motion`, remove the decorative delay/fade and transition immediately once authorization resolves.

- [ ] **Step 7: Add splash CSS**

Use full viewport near-black composition, supplied logo intact, club name, 44px+ targets, safe-area padding, no horizontal overflow and no decorative data leakage.

- [ ] **Step 8: Run GREEN entry tests**

```bash
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/public-league.test.tsx tests/client/app-ux-compression.test.tsx tests/client/account-profile.test.tsx tests/client/api.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/client/App.tsx src/client/api.ts src/client/mobile-experience.css tests/client
git commit -m "feat: add private Misfits entry experience"
```

---

### Task 6: Unify signed-in navigation and approved-unassigned browsing

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/PlayerLeague.tsx`
- Modify: `src/client/member-experience.css`
- Modify: `src/client/api.ts`
- Modify: `tests/client/player-app.test.tsx`
- Modify: `tests/client/player-scoring-rules.test.tsx`
- Modify: `tests/client/account-profile.test.tsx`
- Modify: `tests/client/private-club-entry.test.tsx`

**Interfaces:**
- Primary navigation: `League · Record · Results · More`
- More: Players, Profile, Admin only for admins, Sign out.
- `clubLeagues` is browse scope; `myLeagues` is participation scope.

- [ ] **Step 1: Write RED navigation/unassigned tests**

```ts
expect(nav).toHaveTextContent('League');
expect(nav).toHaveTextContent('Record');
expect(nav).toHaveTextContent('Results');
expect(nav).toHaveTextContent('More');
expect(screen.queryByText('Season admin')).not.toBeInTheDocument();
expect(screen.queryByText('Club table')).not.toBeInTheDocument();
```

For approved unassigned users, prove club league/standings/results render while result entry says:

```text
Not assigned to a league this season
```

and no submission form is available.

- [ ] **Step 2: Run RED navigation tests**

```bash
./node_modules/.bin/vitest run tests/client/player-app.test.tsx tests/client/private-club-entry.test.tsx
```

- [ ] **Step 3: Load browse and participation scopes separately**

After approval:

```ts
clubLeagues: LeagueSummary[]; // protected club list for every approved member
myLeagues: LeagueSummary[];   // /api/me/leagues, active competition participation
```

Prefer the active user league for selection; otherwise select the first open/current club league.

- [ ] **Step 4: Remove the top-level admin/player switch**

Delete `Season admin / Club table` mode from `App.tsx`. Admin workbench opens from More only for `role === 'ADMIN'`.

- [ ] **Step 5: Make Record participation-aware**

If selected league is absent from `myLeagues`, render the non-participation state and do not mount result entry controls. Club approval never implies competitor rights.

- [ ] **Step 6: Preserve existing assigned-player behavior**

Existing result submit/confirm/dispute contracts remain unchanged. Do not implement fixture-first behavior in this release.

- [ ] **Step 7: Run GREEN player tests**

```bash
./node_modules/.bin/vitest run tests/client/player-app.test.tsx tests/client/player-scoring-rules.test.tsx tests/client/account-profile.test.tsx tests/client/private-club-entry.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/client/App.tsx src/client/components/PlayerLeague.tsx src/client/member-experience.css src/client/api.ts tests/client
git commit -m "feat: simplify private club navigation"
```

---

### Task 7: Correct the brand accent and complete UI/simplicity review

**Files:**
- Modify: `src/client/mobile-experience.css`
- Modify: `src/client/member-experience.css`
- Modify: `DESIGN.md`
- Modify focused UI tests only when semantic copy/classes intentionally change.

**Interfaces:**
- Normal interaction accent: Misfits-logo red.
- Green: OPEN/confirmed/success/positive state only.

- [ ] **Step 1: Update `DESIGN.md` authority**

Document private splash as the only signed-out surface, admin-approved membership as the entry boundary, unified navigation, and red-led interaction palette. Remove the standing rule that normal navigation is green-led.

- [ ] **Step 2: Replace normal green interaction usage**

Define one red brand token derived consistently from the supplied Misfits artwork and apply it to selected navigation, focus-visible, primary club actions and active non-status accents. Do not recolor the supplied logo image itself.

Keep green for semantic OPEN/confirmed/success states. Destructive red must remain distinguishable through labeling, iconography, tone and context rather than color alone.

- [ ] **Step 3: Run repo-local Impeccable review**

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
```

Read/apply `.agents/skills/impeccable/SKILL.md`, `reference/audit.md` and `reference/craft-floor.md` to the changed entry/nav surfaces. Fix material findings in one coherent batch.

- [ ] **Step 4: Run Cave Pony simplicity gate**

The accepted architecture must still be exactly:

```text
users.club_status
club_invites
league_players
existing Worker + D1
existing React state
```

Reject a second club-membership table, polling, new router/state framework, UI dependency or Cloudflare service unless a concrete failing requirement proves it necessary.

- [ ] **Step 5: Run focused UI/privacy regression**

```bash
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/player-app.test.tsx tests/server/private-club-access.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md src/client/mobile-experience.css src/client/member-experience.css tests
git commit -m "style: align Misfits private app branding"
```

---

### Task 8: Full gate, production migration gate, merge and rendered acceptance

**Files:**
- Modify: `PROGRESS.md`
- Create after migration: `docs/operations/evidence/2026-08-22-d1-migration-0006.md`

**Interfaces:**
- Full code gate: Wrangler types, both TypeScript projects, full Vitest, production build, diff check.
- Production sequence: remote migration verified before code depending on `club_status` deploys.

- [ ] **Step 1: Run one fresh full repository gate**

```bash
npx wrangler types
./node_modules/.bin/tsc -p tsconfig.client.json --noEmit
./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
git diff --check
```

Do not claim completion if any command fails.

- [ ] **Step 2: Open/update PR and wait for PR CI**

PR body records privacy boundary change, migration `0006`, club approval vs league placement, closure of anonymous/legacy invite paths, splash/navigation/brand changes, Impeccable findings, Cave Pony result and fresh gate evidence.

- [ ] **Step 3: STOP for explicit remote D1 migration approval**

`AGENTS.md` requires explicit user approval for remote D1 migration. Ask before applying `0006_private_club_membership.sql`. Do not merge/deploy application code that reads `club_status` before migration succeeds.

- [ ] **Step 4: Apply and verify the approved remote migration**

Use the repo's existing Wrangler/D1 operational pattern for database `misfits` / binding `DB`. Verify:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Record actual commands/results in `docs/operations/evidence/2026-08-22-d1-migration-0006.md`. Never record secrets, raw invite tokens or Google credentials.

- [ ] **Step 5: Re-run the full gate if code changed after the previous green SHA**

Use the exact Step 1 command sequence.

- [ ] **Step 6: Merge after verified migration + green PR gate**

Use the existing `main` workflow. Do not add temporary observer workflows merely to obtain a deploy run ID.

- [ ] **Step 7: Perform rendered production acceptance**

Verify at phone width:

```text
signed out -> logo + Misfits Darts Club + Google only
invite -> same + invite context only
pending -> request sent + waiting + Sign out only
approved -> brief splash -> private app
nav -> League · Record · Results · More
admin -> Admin only under More
normal accent -> Misfits red
green -> semantic status only
no private data flash before auth
no horizontal overflow at 320–412px
```

If rendered browser tooling is unavailable, request a production screenshot and state that rendered acceptance remains pending rather than claiming it passed.

- [ ] **Step 8: Update `PROGRESS.md`**

Record PR/merge SHA, migration evidence path, fresh gate/CI evidence, rendered acceptance status, preservation of the parked functional backlog, and Fixture-First Player Experience as the next functional release.

- [ ] **Step 9: Commit final evidence/docs when needed**

```bash
git add PROGRESS.md docs/operations/evidence/2026-08-22-d1-migration-0006.md
git commit -m "docs: record private club release evidence"
```

Use `[skip ci]` only for a documentation-only final checkpoint where the already-verified code SHA is unchanged.

---

## Plan Self-Review

### Spec coverage

Every approved requirement has an owning task: permanent club approval, club invite proof, normal-sign-in invite requirement, pending/rejected state, OAuth back-door closure, Worker privacy enforcement, approved-unassigned browsing, independent league participation, admin approval/rejection/audit, retirement of self-service league invites, splash/no-data-flash, unified navigation, red brand correction, additive migration, production migration gate, Impeccable, Cave Pony, full verification and rendered acceptance.

### Placeholder scan

The implementation tasks name concrete files, endpoints, error codes, types, commands and acceptance assertions. There are no deferred implementation placeholders.

### Type consistency

Canonical names used throughout:

```ts
type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
UserRecord.club_status
PublicUserSummary.clubStatus
AuthUser.clubStatus
requireClubMember
AdminPlayerChanges.clubStatus
AdminClubInvite
```

No second permanent club-membership domain is introduced.
