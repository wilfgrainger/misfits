# Private Club Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Misfits 501 a genuinely private, invite-only, admin-approved club while simplifying the entry experience and signed-in navigation.

**Architecture:** Keep one permanent `users` record per Google identity and add `club_status` for permanent club admission. Keep `league_players` as the independent season/league participation authority. Add one hashed `club_invites` table, enforce `APPROVED` membership at Worker route guards, then render the splash/pending/private app shell from explicit server state.

**Tech Stack:** React + TypeScript client, Hono Cloudflare Worker, Cloudflare D1, Vitest, existing Google Identity Services integration, existing CSS/SVG icon system.

**Spec:** `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`

## Global Constraints

- Cloudflare free tier services only: existing Worker, static assets and one D1 database.
- Do not add KV, R2, Durable Objects, Queues, scheduled jobs, another runtime or paid Cloudflare service.
- Google Identity Services remains the only authentication method.
- Worker authorization is authoritative; React must never be the privacy boundary.
- `users.status` remains `ACTIVE | SUSPENDED`; new permanent club admission is `PENDING | APPROVED | REJECTED`.
- Club approval and season/league assignment remain separate operations.
- Approved but unassigned members may browse club leagues, standings and results but may not perform competition actions requiring league participation.
- Existing admins/master admin remain approved and protected.
- Do not edit migrations `0001`–`0005`; add exactly one additive migration `0006_private_club_membership.sql`.
- CI must not apply remote D1 migrations automatically.
- Do not apply the remote D1 migration until the explicit production-migration approval gate in Task 8.
- The ordinary interaction accent becomes Misfits-logo red; green is semantic success/open/confirmed only.
- Signed-out UI reveals no league, season, standings, results, player or member data.
- Pending/rejected sessions may exist but must fail all club-data authorization checks.
- Keep the parked fixture-first release out of scope.

---

## File Structure

### New files

- `migrations/0006_private_club_membership.sql` — adds `users.club_status`, creates `club_invites`, backfills legitimate existing club members, and sets existing leagues private.
- `src/server/db/club-invites.ts` — club-invite creation, lookup, validation, revocation and usage accounting.
- `tests/server/private-club-access.test.ts` — end-to-end Worker authorization and admission contract.
- `tests/client/private-club-entry.test.tsx` — splash, pending/rejected, no-data-flash and invite-entry client contract.

### Existing files to modify

- `src/server/db/users.ts` — `ClubStatus`, user record/public payload, lookup-only sign-in path, invite-authorized pending creation, approval updates.
- `src/server/auth/session.ts` — expose `clubStatus` in `AuthUser`; preserve pending/rejected sessions while still blocking suspended accounts.
- `src/server/auth/guards.ts` — add `requireClubMember`.
- `src/server/db/leagues.ts` — club-wide league listing for approved members; remove league-assignment-as-read-authority from club reads.
- `src/server/routes/auth.ts` — normal sign-in cannot create unknown users; invite sign-in can create pending users; explicit membership responses.
- `src/server/routes/leagues.ts` — all club reads require approved membership; league join invite route no longer self-enrols users.
- `src/server/routes/results.ts` — standings/results reads require approved membership and private caching.
- `src/server/routes/admin.ts` — pending/member approval and rejection plus club-invite administration.
- `src/client/api.ts` — `clubStatus`, error code, club invite/admin methods, club-wide private league read.
- `src/client/App.tsx` — private splash, invite context, pending/rejected state, approved-session transition, unified app shell.
- `src/client/components/PlayerLeague.tsx` — support approved-but-unassigned browsing/navigation and one primary `League · Record · Results · More` model.
- `src/client/components/AdminCompetitionDeskV2.tsx` — `Club access` becomes admission authority; old league invites removed from member admission flow.
- `src/client/mobile-experience.css` — splash and red brand tokens.
- `src/client/member-experience.css` — unified signed-in navigation and More/Admin treatment.
- `DESIGN.md` — private-entry and red-accent standing authority.
- `PROGRESS.md` — release evidence/handoff state.
- Existing focused tests under `tests/server/` and `tests/client/` where contracts already have a clear owner.

---

### Task 1: Add permanent club membership state and migration

**Files:**
- Create: `migrations/0006_private_club_membership.sql`
- Modify: `src/server/db/users.ts`
- Modify: `src/server/auth/session.ts`
- Test: `tests/server/private-club-access.test.ts`
- Test: existing auth/session tests under `tests/server/`

**Interfaces:**
- Produces: `type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED'`
- Produces: `UserRecord.club_status: ClubStatus`
- Produces: `PublicUserSummary.clubStatus: ClubStatus`
- Produces: `AuthUser.clubStatus: ClubStatus`
- Produces: migration table `club_invites(id, token_hash, created_by, expires_at, uses, revoked_at, created_at)`

- [ ] **Step 1: Write the failing migration/account-state test**

Add assertions that the post-migration schema supports `club_status`, that legitimate existing admins/active league members become approved, other historical users become pending, and existing leagues become private.

```ts
expect(admin.club_status).toBe('APPROVED');
expect(existingLeaguePlayer.club_status).toBe('APPROVED');
expect(googleOnlyUser.club_status).toBe('PENDING');
expect(league.visibility).toBe('PRIVATE');
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts
```

Expected: failure because `club_status` and `club_invites` do not exist.

- [ ] **Step 3: Add migration `0006_private_club_membership.sql`**

Use an additive column and deterministic backfill:

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

- [ ] **Step 4: Extend user/session types without changing suspension semantics**

In `src/server/db/users.ts`:

```ts
export type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
```

Add `club_status` to `UserRecord`, add `clubStatus` to `PublicUserSummary`, and map it in `publicUser()`.

In `src/server/auth/session.ts`, include `users.club_status` in the session query and return:

```ts
return {
  id: row.id,
  username: row.username,
  role: row.role,
  status: row.status,
  clubStatus: row.club_status,
  isMasterAdmin: row.is_master_admin === 1,
};
```

Keep this rule unchanged:

```ts
if (!row || row.status !== 'ACTIVE') return null;
```

Do not reject pending/rejected users at session resolution.

- [ ] **Step 5: Run focused auth/session/migration tests**

Run:

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/auth.test.ts tests/server/session.test.ts
```

If exact existing filenames differ, select the existing auth/session owners rather than creating duplicate contract tests.

- [ ] **Step 6: Commit Task 1**

```bash
git add migrations/0006_private_club_membership.sql src/server/db/users.ts src/server/auth/session.ts tests/server/private-club-access.test.ts tests/server
git commit -m "feat: add permanent club membership state"
```

---

### Task 2: Add club invites and invite-authorized pending account creation

**Files:**
- Create: `src/server/db/club-invites.ts`
- Modify: `src/server/db/users.ts`
- Modify: `src/server/routes/auth.ts`
- Modify: `src/client/api.ts`
- Test: `tests/server/private-club-access.test.ts`
- Test: existing auth route tests

**Interfaces:**
- Produces: `validateClubInvite(db, token, now): Promise<ClubInviteRecord>`
- Produces: `createClubInvite(db, actorUserId, now, expiresAt): Promise<{ invite: ClubInviteRecord; token: string }>`
- Produces: `revokeClubInvite(db, actorUserId, inviteId, now): Promise<void>`
- Produces: `getExistingGoogleUser(db, identity): Promise<UserRecord | null>` via existing Google-sub lookup/update behavior
- Produces: `createPendingInvitedUser(db, identity, now): Promise<UserRecord>`
- Changes: `POST /api/auth/google` accepts optional `inviteToken` in its JSON body

- [ ] **Step 1: Write failing admission tests**

Cover these exact cases:

```ts
it('does not create an unknown Google user without a club invite');
it('creates an unknown invited Google user as PENDING only');
it('does not create a user for an invalid, expired or revoked invite');
it('signs an existing approved member in without requiring an invite');
it('returns an existing pending/rejected member to their restricted state');
```

Verify an unknown normal sign-in returns an error code `INVITE_REQUIRED` and leaves `users` unchanged.

- [ ] **Step 2: Run focused admission tests and confirm RED**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts
```

- [ ] **Step 3: Implement `src/server/db/club-invites.ts`**

Follow the existing league-invite token pattern: 32 random bytes, base64url token, SHA-256 hash stored in D1.

Required validation order:

```ts
if (!invite) throw new AppError('INVITE_INVALID', 'That invitation is not valid', 404);
if (invite.revoked_at) throw new AppError('INVITE_REVOKED', 'That invitation has been revoked', 409);
if (invite.expires_at && invite.expires_at <= now.toISOString()) {
  throw new AppError('INVITE_EXPIRED', 'That invitation has expired', 409);
}
```

Club invite use never inserts into `league_players`.

- [ ] **Step 4: Split user sign-in creation from existing-user refresh**

Refactor `upsertGoogleUser` responsibilities so normal sign-in cannot silently create an account. Preserve email/picture/last-login refresh for existing users.

Use explicit functions such as:

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

Master/bootstrap admin handling remains an explicit approved exception, not a generic unknown-user path.

- [ ] **Step 5: Make auth route admission explicit**

`POST /api/auth/google` body becomes:

```ts
{ credential: string; inviteToken?: string }
```

Flow:

```ts
const existing = await getUserByGoogleSub(db, identity.sub);
if (existing) {
  user = await refreshGoogleUser(...);
} else if (isConfiguredBootstrapOrMaster(identity.email)) {
  user = await createConfiguredAdminUser(...);
} else if (inviteToken) {
  await validateClubInvite(db, inviteToken, now());
  user = await createPendingInvitedUser(db, identity, now());
  await consumeClubInvite(db, inviteToken);
} else {
  throw new AppError('INVITE_REQUIRED', 'A Misfits invitation is required', 403);
}
```

Issue a secure session for existing approved/pending/rejected users and for newly-created pending users.

- [ ] **Step 6: Preserve machine-readable error codes in `ApiClientError`**

Change the response parser to read both code and message:

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

and throw with `payload?.error?.code`.

Change sign-in signature to:

```ts
signIn(credential: string, inviteToken?: string): Promise<AuthPayload>
```

- [ ] **Step 7: Run focused admission/API tests**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/client/api.test.ts
```

Expected: all admission cases pass; no league membership is created.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/server/db/club-invites.ts src/server/db/users.ts src/server/routes/auth.ts src/client/api.ts tests/server/private-club-access.test.ts tests/client/api.test.ts
git commit -m "feat: require club invite for new accounts"
```

---

### Task 3: Enforce approved club membership on every club-data read

**Files:**
- Modify: `src/server/auth/guards.ts`
- Modify: `src/server/db/leagues.ts`
- Modify: `src/server/routes/leagues.ts`
- Modify: `src/server/routes/results.ts`
- Modify: other route modules found to expose club/season/member data without admin-only protection
- Test: `tests/server/private-club-access.test.ts`
- Test: `tests/server/league-routes.test.ts`
- Test: `tests/server/result-routes.test.ts`

**Interfaces:**
- Produces: `requireClubMember: MiddlewareHandler<AuthAppEnv>`
- Produces: `listClubLeagues(db): Promise<LeagueRecord[]>`
- Club-data reads require `requireUser, requireClubMember`

- [ ] **Step 1: Write failing privacy tests before changing guards**

Prove:

```ts
expect(await anonymous('/api/public/leagues')).toHaveStatus(401);
expect(await pending('/api/public/leagues')).toHaveStatus(403);
expect(await rejected('/api/public/leagues')).toHaveStatus(403);
expect(await approvedUnassigned('/api/public/leagues')).toHaveStatus(200);
expect(await approvedUnassigned('/api/public/leagues/misfits-501/standings')).toHaveStatus(200);
expect(await approvedUnassigned('/api/public/leagues/misfits-501/results')).toHaveStatus(200);
```

Also assert cache headers are `private, no-store`.

- [ ] **Step 2: Run focused privacy tests and confirm RED**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/league-routes.test.ts tests/server/result-routes.test.ts
```

- [ ] **Step 3: Add `requireClubMember`**

In `src/server/auth/guards.ts`:

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

- [ ] **Step 4: Make club reads club-wide, not league-membership-wide**

Add:

```ts
export async function listClubLeagues(db: D1Database): Promise<LeagueRecord[]> {
  // same ordering as managed leagues, no visibility filter
}
```

For approved reads, stop using `canViewLeague()` as a league-membership gate. Approval owns read access; `league_players` owns competition participation only.

Keep `canViewLeague()` only where legacy internal code still genuinely needs it, or simplify/remove it if no caller remains after the route change.

- [ ] **Step 5: Guard league and result reads**

The existing `/api/public/*` paths may remain for this release but must be protected:

```ts
routes.get('/api/public/leagues', requireUser, requireClubMember, ...);
routes.get('/api/public/leagues/:key', requireUser, requireClubMember, ...);
routes.get('/api/public/leagues/:key/players', requireUser, requireClubMember, ...);
routes.get('/api/public/leagues/:leagueId/standings', requireUser, requireClubMember, ...);
routes.get('/api/public/leagues/:leagueId/results', requireUser, requireClubMember, ...);
```

Always return:

```http
Cache-Control: private, no-store
```

- [ ] **Step 6: Audit other non-admin club-data GET routes**

Search route modules for unauthenticated reads and add `requireClubMember` wherever data exposes club users, seasons, fixtures, standings or results. Do not weaken existing admin guards.

- [ ] **Step 7: Preserve participation checks**

Add/retain a test proving an approved unassigned member can browse but cannot submit a result:

```ts
expect(await approvedUnassigned.post('/api/leagues/misfits-501/results', validResult)).toHaveStatus(403);
```

Use the existing result-domain membership error rather than duplicating it in `requireClubMember`.

- [ ] **Step 8: Run privacy/league/result tests**

```bash
./node_modules/.bin/vitest run tests/server/private-club-access.test.ts tests/server/league-routes.test.ts tests/server/result-routes.test.ts
```

- [ ] **Step 9: Commit Task 3**

```bash
git add src/server/auth/guards.ts src/server/db/leagues.ts src/server/routes tests/server
git commit -m "feat: enforce private club data access"
```

---

### Task 4: Turn Club access into the admission authority

**Files:**
- Modify: `src/server/db/admin.ts`
- Modify: `src/server/routes/admin.ts`
- Modify: `src/server/db/club-invites.ts`
- Modify: `src/client/api.ts`
- Modify: `src/client/components/AdminCompetitionDeskV2.tsx`
- Test: existing admin route tests
- Test: existing admin client tests

**Interfaces:**
- Extends: `AdminPlayer` with `clubStatus` and `createdAt`
- Extends: `AdminPlayerChanges` with `clubStatus?: ClubStatus`
- Produces: `AdminClubInvite`
- Produces: `GET /api/admin/club-invites`
- Produces: `POST /api/admin/club-invites`
- Produces: `POST /api/admin/club-invites/:id/revoke`

- [ ] **Step 1: Write failing admin admission tests**

Prove:

```ts
it('lists pending club requests separately from approved members');
it('admin approval changes clubStatus without assigning a league');
it('admin rejection changes clubStatus and remains unauthorised');
it('approval and rejection write audit entries');
it('creates and revokes club invite links without league membership');
```

- [ ] **Step 2: Run focused admin tests and confirm RED**

```bash
./node_modules/.bin/vitest run tests/server/admin-routes.test.ts tests/client/admin-competition-desk.test.tsx
```

Use the actual existing admin test filenames if named differently.

- [ ] **Step 3: Extend admin DB update contract**

`AdminPlayerChanges` becomes:

```ts
export interface AdminPlayerChanges {
  role?: UserRole;
  status?: UserStatus;
  clubStatus?: ClubStatus;
}
```

Persist `club_status` in the same audited update. Preserve last-admin/master-admin protections. Prevent an admin/master-admin from being transitioned away from approved club status.

Audit before/after JSON must include `clubStatus`.

- [ ] **Step 4: Add club-invite admin routes**

Use admin-only routes protected by existing `requireUser, requireAdmin`, with same-origin on writes.

Return raw invite token only at creation time so the UI can copy/share the URL; list endpoints return metadata only, never historical raw tokens.

- [ ] **Step 5: Update client API types/methods**

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

and methods:

```ts
adminClubInvites()
createAdminClubInvite(expiresAt?: string | null)
revokeAdminClubInvite(id: string)
```

- [ ] **Step 6: Rebuild the `Club access` task in `AdminCompetitionDeskV2.tsx`**

Render two clear sections:

```text
Pending requests
  email · requested date · Approve · Reject

Members
  username/email · Player/Admin · Active/Suspended · current league context
```

Place club invite creation/revocation in `Club access`, not `Members & invites`.

Rename the season task label `Members & invites` to `Season members` and remove club-admission semantics from it. Existing league invite controls must not remain as a way for a player to self-assign into competition.

- [ ] **Step 7: Run admin server/client tests**

```bash
./node_modules/.bin/vitest run tests/server tests/client
```

Use focused admin filters during development; this broader command is acceptable once the coherent admin batch is complete.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/server/db/admin.ts src/server/db/club-invites.ts src/server/routes/admin.ts src/client/api.ts src/client/components/AdminCompetitionDeskV2.tsx tests
git commit -m "feat: add admin club approval workflow"
```

---

### Task 5: Build the private splash, invite and pending/rejected entry states

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/api.ts`
- Modify: `src/client/mobile-experience.css`
- Test: `tests/client/private-club-entry.test.tsx`
- Test: `tests/client/public-league.test.tsx`
- Test: `tests/client/app-ux-compression.test.tsx`

**Interfaces:**
- Client `ViewState` must distinguish at least: loading/splash, signed-out, pending, rejected, onboarding, signed-in.
- `AuthPayload.user.clubStatus` is authoritative.
- Invite token is read from `/join/:token` and sent only with Google authentication.

- [ ] **Step 1: Replace the old public-first tests with failing private-entry tests**

Assert signed-out DOM contains:

```text
Misfits Darts Club
Sign in with Google
```

and does **not** contain league/season/standings/results copy.

Assert invite entry contains only the additional line:

```text
You've been invited to join Misfits
```

Assert pending contains exactly the approved state content plus Sign out.

- [ ] **Step 2: Run client entry tests and confirm RED**

```bash
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/public-league.test.tsx tests/client/app-ux-compression.test.tsx
```

- [ ] **Step 3: Remove anonymous public data loading from `App.tsx`**

Do not call league APIs until `api.me()` proves `clubStatus === 'APPROVED'`.

The initial render must be a privacy-safe splash, not the league app.

- [ ] **Step 4: Route Google sign-in through membership state**

When calling:

```ts
api.signIn(credential, inviteToken ?? undefined)
```

map the returned `clubStatus`:

```ts
PENDING -> pending screen
REJECTED -> rejected screen
APPROVED + username null -> onboarding
APPROVED + username present -> signed-in
```

An `INVITE_REQUIRED` error on normal sign-in renders a concise invite-required message without exposing data.

- [ ] **Step 5: Implement approved returning-member splash timing**

The splash should remain visible approximately 800–1000ms total from initial mount when an approved remembered session resolves quickly. Authorization must finish before app content mounts.

Use CSS opacity/transform only; no new animation library.

For reduced motion, remove the fade/delay beyond what is needed for auth resolution.

- [ ] **Step 6: Implement pending/rejected screens**

Pending screen:

```text
[Misfits logo]
Membership request sent
Waiting for a club admin to approve you
Sign out
```

Rejected screen uses a clear rejection message and Sign out. Do not show Google profile data.

- [ ] **Step 7: Add splash/private-entry CSS**

Use full viewport dark composition, supplied logo intact, centered club identity, 44px+ Google/sign-out targets, safe-area padding, and no dead-scroll space.

- [ ] **Step 8: Run entry/auth client tests**

```bash
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/api.test.ts tests/client/account-profile.test.tsx
```

- [ ] **Step 9: Commit Task 5**

```bash
git add src/client/App.tsx src/client/api.ts src/client/mobile-experience.css tests/client
git commit -m "feat: add private Misfits entry experience"
```

---

### Task 6: Unify navigation and support approved unassigned members

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/PlayerLeague.tsx`
- Modify: `src/client/member-experience.css`
- Modify: `src/client/api.ts`
- Test: `tests/client/player-app.test.tsx`
- Test: `tests/client/player-scoring-rules.test.tsx`
- Test: `tests/client/private-club-entry.test.tsx`

**Interfaces:**
- Primary signed-in navigation: `League · Record · Results · More`
- `More`: Players, Profile, Admin only for admins, Sign out
- Club-wide league browse uses approved-member league list, not only `/api/me/leagues` participation list
- Participation state still comes from `/api/me/leagues`

- [ ] **Step 1: Write failing navigation/unassigned-member tests**

Prove:

```ts
expect(nav).toHaveTextContent('League');
expect(nav).toHaveTextContent('Record');
expect(nav).toHaveTextContent('Results');
expect(nav).toHaveTextContent('More');
expect(screen.queryByText('Season admin')).not.toBeInTheDocument();
expect(screen.queryByText('Club table')).not.toBeInTheDocument();
```

For an approved unassigned member, prove league/standings can render and result entry cannot be submitted.

- [ ] **Step 2: Run navigation tests and confirm RED**

```bash
./node_modules/.bin/vitest run tests/client/player-app.test.tsx tests/client/private-club-entry.test.tsx
```

- [ ] **Step 3: Load two separate league concepts after approval**

In `App.tsx` keep:

```ts
clubLeagues: LeagueSummary[]       // browseable by all approved members
myLeagues: LeagueSummary[]         // active participation only
```

Use the protected club league endpoint for `clubLeagues` and `/api/me/leagues` for `myLeagues`.

Selection defaults to the user's active league when possible; otherwise the first current/open club league.

- [ ] **Step 4: Remove top-level admin/player mode switch**

Delete the `Season admin / Club table` segmented switch from the app shell.

Open admin workbench only from `More` for admin users.

- [ ] **Step 5: Make Record participation-aware**

If selected league is not in `myLeagues`, Record must not expose a working result form. Render concise state:

```text
Not assigned to a league this season
```

Do not infer participation from club approval.

- [ ] **Step 6: Preserve existing player result behavior for assigned members**

Keep existing submission/confirmation/dispute contracts unchanged except for the navigation entry point.

Do not implement fixture-first behavior in this release.

- [ ] **Step 7: Run player navigation/result tests**

```bash
./node_modules/.bin/vitest run tests/client/player-app.test.tsx tests/client/player-scoring-rules.test.tsx tests/client/account-profile.test.tsx
```

- [ ] **Step 8: Commit Task 6**

```bash
git add src/client/App.tsx src/client/components/PlayerLeague.tsx src/client/member-experience.css src/client/api.ts tests/client
git commit -m "feat: simplify private club navigation"
```

---

### Task 7: Correct brand accent and run Impeccable/Cave Pony review

**Files:**
- Modify: `src/client/mobile-experience.css`
- Modify: `src/client/member-experience.css`
- Modify: `DESIGN.md`
- Modify: focused UI tests only where they assert semantic classes/copy

**Interfaces:**
- Normal brand interaction token: Misfits logo red
- Green: semantic open/confirmed/success only

- [ ] **Step 1: Update standing design authority before final polish**

Change `DESIGN.md` from green-led normal navigation to red-led club interaction and document private splash as the only signed-out surface.

Keep green explicitly semantic.

- [ ] **Step 2: Replace normal green interaction usage with a red brand token**

Define one primary token in `mobile-experience.css`, sampled/derived consistently from the supplied club artwork rather than scattering hard-coded reds.

Apply it to normal selected navigation, focus-visible, primary club actions and active non-status accents.

Keep green classes for OPEN/confirmed/success states.

- [ ] **Step 3: Run repo-local Impeccable detection/audit**

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
```

Then review the changed entry shell/navigation against `.agents/skills/impeccable/SKILL.md` and its audit/craft-floor guidance. Action material findings in one coherent batch.

- [ ] **Step 4: Perform Cave Pony simplicity review**

Confirm the implementation still uses:

```text
users.club_status
club_invites
league_players
existing Worker + D1
existing React state
```

Reject proposals for a second membership table, router/state framework, polling service, new Cloudflare service or UI dependency unless a concrete requirement proves necessary.

- [ ] **Step 5: Run focused UI/server regression set**

```bash
./node_modules/.bin/vitest run tests/client/private-club-entry.test.tsx tests/client/player-app.test.tsx tests/server/private-club-access.test.ts
```

- [ ] **Step 6: Commit Task 7**

```bash
git add DESIGN.md src/client/mobile-experience.css src/client/member-experience.css tests
git commit -m "style: align Misfits private app branding"
```

---

### Task 8: Full gate, remote migration approval, release and handoff

**Files:**
- Modify: `PROGRESS.md`
- Create after remote migration: `docs/operations/evidence/2026-08-22-d1-migration-0006.md`
- PR metadata only after verification

**Interfaces:**
- Required local/repository gate: Wrangler types, both TypeScript projects, full Vitest suite, production build, `git diff --check`
- Required production sequence: remote migration first, verified, then code deployment

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

- [ ] **Step 2: Open/update the PR and wait for PR CI**

PR body must call out:

- privacy boundary change;
- additive migration `0006`;
- club approval vs league placement separation;
- anonymous data closure;
- splash/navigation/brand changes;
- Impeccable and Cave Pony review results;
- full local/repository evidence.

- [ ] **Step 3: STOP for explicit remote D1 migration approval**

This is a production data/schema operation and `AGENTS.md` requires explicit approval.

Ask the user to approve applying `0006_private_club_membership.sql` to the production D1 database. Do not deploy code depending on `club_status` before this step succeeds.

- [ ] **Step 4: Apply the approved remote additive migration**

Use the existing Wrangler/D1 operational pattern documented in `docs/operations/` for database `misfits` / binding `DB`.

After applying, verify at minimum:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Record actual command/output evidence in `docs/operations/evidence/2026-08-22-d1-migration-0006.md`. Never include secrets or invite tokens.

- [ ] **Step 5: Re-run the fresh full repository gate if code changed after CI**

Run the exact Step 1 command sequence if any implementation changed after the prior green gate.

- [ ] **Step 6: Merge only after migration verification and green PR gate**

Normal `main` push workflow may deploy after verify. Do not add observer workflows merely to obtain a run ID.

- [ ] **Step 7: Perform rendered production acceptance**

On a phone-width rendered production view verify:

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

If browser tooling is unavailable, explicitly request a production screenshot from the user and do not falsely claim rendered acceptance.

- [ ] **Step 8: Update `PROGRESS.md` at the handoff**

Record:

- PR number and merge SHA;
- migration evidence path;
- final green CI/run evidence available in the harness;
- rendered acceptance status;
- the 33 parked functional stories remain parked;
- Fixture-First Player Experience remains the next functional product release after this privacy/UI correction.

- [ ] **Step 9: Commit final evidence/docs if needed**

```bash
git add PROGRESS.md docs/operations/evidence/2026-08-22-d1-migration-0006.md
git commit -m "docs: record private club release evidence"
```

Use `[skip ci]` only if this final commit is documentation-only and the already-verified code SHA remains unchanged.

---

## Plan Self-Review

### Spec coverage

The plan explicitly covers:

- permanent club membership state;
- club invite creation/validation/revocation;
- unknown-user invite requirement;
- pending/rejected restricted sessions;
- approved-only Worker read authorization;
- approved-but-unassigned browsing;
- independent league participation;
- admin approval/rejection/audit;
- removal of invite-driven league self-assignment;
- private splash and remembered-session transition;
- no private-data flash;
- unified `League · Record · Results · More` navigation;
- admin under More;
- red brand correction with green semantic-only;
- additive D1 migration/backfill/private visibility;
- remote migration safety gate;
- Impeccable review;
- Cave Pony simplicity review;
- full verification and rendered acceptance.

### Type consistency

The plan uses these canonical names throughout:

```ts
type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
UserRecord.club_status
PublicUserSummary.clubStatus
AuthUser.clubStatus
requireClubMember
AdminPlayerChanges.clubStatus
```

No second permanent membership model is introduced.
