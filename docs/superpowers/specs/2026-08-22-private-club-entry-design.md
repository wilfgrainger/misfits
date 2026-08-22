# Private Club Entry, Approval and App Shell Design

**Status:** Approved product direction, awaiting written-spec review  
**Date:** 22 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Branch:** `feat/private-club-entry`

## Goal

Make Misfits 501 a genuinely private club app.

Only people who have received a valid Misfits invite, authenticated with Google, and then been approved by a club administrator may see club data. Club approval is permanent club membership. Season and league assignment remain separate competition administration.

The release also simplifies the app entry/navigation model and replaces the generic emerald interaction accent with the red from the Misfits logo.

## Product model

Three concepts must remain separate:

1. **Google identity** — proves who the person is.
2. **Club membership** — determines whether the person belongs to Misfits and may see private club data.
3. **Season/league placement** — determines where an approved club member competes for a particular season.

Club approval does not automatically assign a user to any season or league.

Approved but currently unassigned club members may browse the private club app, standings and results, but cannot record or confirm competition activity that requires league participation.

## User/account state

Continue to use `users` as the permanent person/account record. Do not add a second club-members table for this one-club product.

### Existing account status

`users.status` retains its existing security/operational meaning:

- `ACTIVE`
- `SUSPENDED`

Suspended accounts cannot authenticate into the app regardless of club status.

### New club status

Add `users.club_status` with exactly:

- `PENDING`
- `APPROVED`
- `REJECTED`

This field owns permanent Misfits membership state.

Admin and master-admin accounts must always be treated as approved club members.

### Migration of existing users

The additive migration must preserve current legitimate access without accidentally approving historical Google-only accounts.

Set `club_status = 'APPROVED'` for users who are either:

- an admin/master admin; or
- already have at least one active `league_players` membership.

All other existing users become `PENDING` unless there is stronger existing evidence that they are already club members.

No existing league placement is changed by this migration.

## Club invites

Create a dedicated club-level invite mechanism. Do not reuse league placement as club admission.

A club invite proves only that a person was invited to request membership.

Recommended additive table:

`club_invites`

Fields:

- `id`
- `token_hash`
- `created_by`
- `expires_at`
- `uses`
- `revoked_at`
- `created_at`

Tokens are stored hashed, following the existing league-invite pattern.

The admin may create, revoke and optionally expire club invite links.

A valid club invite does **not**:

- approve the user;
- create league membership;
- reveal club data.

It only authorizes an unknown Google identity to create a `PENDING` membership request.

## Authentication and admission flow

### Normal homepage

The normal homepage is private-club entry only.

Signed-out UI:

- full-screen dark splash;
- supplied Misfits logo;
- `Misfits Darts Club`;
- one primary action: `Sign in with Google`;
- no league, player, season, standings, results or other private club data.

A Google identity that already belongs to an `APPROVED` club member may sign in normally.

A Google identity unknown to the database must **not** create an account from the normal homepage. Return an explicit `INVITE_REQUIRED` response and keep the person outside the club.

A known `PENDING` or `REJECTED` user may authenticate only into their restricted entry-state screen and must not receive club data.

### Invite link

A valid `/join/<token>` link may be used by an unknown Google identity.

Flow:

1. Browser retains the invite token while Google authentication completes.
2. Worker validates the invite token.
3. If the Google identity does not already exist, create the user with `club_status = 'PENDING'`.
4. Do not create any league membership.
5. Issue a normal secure session so the user can see their restricted pending state.
6. The pending session must fail all club-data authorization guards.

If the token is invalid, expired or revoked, do not create a user/request.

If an existing approved member follows an invite, authentication should simply return them to the club app; no duplicate request is created.

### Pending member screen

A pending user sees only:

- Misfits logo;
- `Membership request sent`;
- `Waiting for a club admin to approve you`;
- `Sign out`.

Do not show:

- league names;
- standings;
- results;
- season metadata;
- member names;
- Google profile details;
- admin data.

Do not add background polling. A later reload/sign-in naturally observes any approval change.

### Rejected state

A rejected user remains outside the club and sees only the entry visual world plus a clear membership rejection message and Sign out.

Rejected status must not be bypassable by repeating normal Google sign-in.

## Authorization boundary

Privacy must be enforced by the Worker, never merely hidden in React.

Add a reusable `requireClubMember` guard after `requireUser`.

The guard allows only `club_status = 'APPROVED'`.

Club-data routes must require an approved club member, including all current endpoints that expose:

- leagues;
- league details;
- player/member lists;
- standings;
- results;
- season details;
- fixtures where member reads are later supported;
- profiles of other members;
- admin data.

The existing `/api/public/*` route names may remain temporarily to avoid unrelated route churn, but their behavior must no longer be public. They must require authenticated approved club membership and return private/no-store caching.

No league or result endpoint may continue to leak data solely because `leagues.visibility = 'PUBLIC'`.

As defense in depth, the migration should set existing Misfits league visibility to `PRIVATE`. New club-managed leagues should default to private in product behavior.

### Participation authorization

`requireClubMember` grants **club visibility**, not permission to compete.

Recording, confirming, disputing or other league-specific competition actions must continue to require the existing appropriate league/player authorization.

An approved but unassigned member can browse but cannot act as a competitor.

## Session model

Pending/rejected users may hold a secure session so the app can render their restricted membership state.

Therefore session resolution must distinguish:

- authenticated account;
- approved club member.

Do not make `resolveSession()` itself discard pending users solely because they are not approved. `requireClubMember` owns club admission.

Suspended accounts remain blocked at session resolution as today.

The authenticated user payload must expose `clubStatus` so the client can render the correct shell without guessing.

## Admin approval workflow

The existing `Club access` admin area becomes the club-admission authority.

### Pending requests

Show pending membership requests with enough information for an administrator to make the decision, primarily:

- email;
- request/created date;
- status.

Actions:

- `Approve`
- `Reject`

Approval changes `club_status` to `APPROVED`.

Rejection changes `club_status` to `REJECTED`.

Both actions must write audit-log entries.

### Approved members

The members section shows permanent approved club members separately from season assignment.

It may show:

- email/username;
- player/admin role;
- ACTIVE/SUSPENDED account state;
- current league placement as context only.

Do not imply that approval and league assignment are the same operation.

### Existing safety rules

Preserve:

- master-admin protection;
- last-active-admin protection;
- same-origin protection;
- existing role/suspension authority;
- auditability.

## Onboarding/nickname

A newly invited pending user does not need to choose a player nickname before admin approval.

After approval, if `username` is still null, the next app entry takes the user through the existing nickname onboarding before normal member participation.

Nickname selection does not itself grant club membership.

## App entry experience

### Approved returning member

When a remembered session resolves to an approved member:

1. show the same Misfits splash immediately;
2. keep it visible for approximately 0.8–1.0 seconds total;
3. fade the logo/splash into the app shell;
4. reveal the app content underneath.

Respect `prefers-reduced-motion`: use an immediate or near-immediate transition rather than animated fading.

The splash must not delay actual authorization checks or reveal club data before membership has been confirmed.

### Signed out

The splash remains as the sign-in screen rather than revealing the app underneath.

### Invite context

When a valid invite URL is being used, the signed-out splash may add one small line:

`You've been invited to join Misfits`

This line must not reveal league/season/member data.

## Signed-in information architecture

Remove the confusing top-level `Season admin / Club table` mode switch from the normal app shell.

Use one primary mobile navigation model:

`League · Record · Results · More`

### League

The main club/competition view. Approved members can browse even when unassigned.

### Record

Competition result entry.

If the approved user is not currently assigned to a league, the action must not pretend to be available. Hide or disable it with a concise explanation such as:

`Not assigned to a league this season`.

### Results

Private club results view.

### More

Contains:

- Players
- Profile
- Admin, only for users with admin capability
- Sign out

Admin opens the admin workbench from this single app shell. The admin workbench may keep its own local task tabs where useful, but it is no longer a separate top-level app mode.

## Brand correction

The primary club interaction accent changes from emerald green to the red used by the supplied Misfits logo.

Red owns normal brand interaction, including:

- selected navigation;
- normal focus treatment;
- primary club actions;
- active non-status accents.

Green is retained only where it communicates genuinely positive state, such as:

- `OPEN`;
- confirmed;
- success;
- healthy/positive status.

Danger/destructive actions must remain visually distinguishable from ordinary brand-red actions through tone, labeling, iconography and context. Do not rely on color alone.

Update `DESIGN.md` during implementation so this becomes durable standing authority.

## Data migration

Create exactly one new additive migration after `0005_configurable_match_scoring.sql`.

The migration owns:

- `users.club_status`;
- `club_invites`;
- required indexes;
- deterministic backfill of existing club approval;
- defense-in-depth update of existing league visibility to `PRIVATE`.

Do not edit any previously applied migration.

CI must continue not to apply remote D1 migrations automatically.

Because application code will depend on the new column/table, production rollout requires the normal guarded sequence:

1. verify migration locally/tests;
2. explicitly apply and verify the remote additive migration;
3. only then deploy code that depends on it.

## Error states

Use explicit errors rather than silent fallbacks:

- `INVITE_REQUIRED` — unknown identity used normal sign-in;
- `INVITE_INVALID` / `INVITE_EXPIRED` / `INVITE_REVOKED` — invite cannot create a request;
- `MEMBERSHIP_PENDING` where an approved-only action is attempted by a pending member;
- `MEMBERSHIP_REJECTED` where appropriate;
- existing `UNAUTHENTICATED`, `FORBIDDEN` and suspension behavior remain available.

Do not leak whether private leagues, players or results exist through anonymous error detail.

## Security acceptance

The release is not complete unless server tests demonstrate all of the following:

- anonymous league-list access is denied;
- anonymous standings/results access is denied;
- unknown Google identity on the normal homepage cannot create a user/request;
- unknown Google identity with a valid club invite becomes PENDING only;
- pending member cannot read any club data;
- rejected member cannot read any club data;
- approved unassigned member can read private club data;
- approved unassigned member cannot submit a league result without valid league participation;
- approved assigned player retains normal player behavior;
- admin approval enables club access without assigning a league;
- league assignment remains independently managed;
- suspension still blocks access;
- admin/master-admin protections remain intact.

## Client acceptance

Material UI acceptance includes:

- signed-out splash contains only logo, club name and Google sign-in;
- invite splash adds only the invite-context line;
- pending screen contains only the approved pending-state content and Sign out;
- approved remembered session shows the brief splash then enters the app;
- no private club data flashes before authorization resolves;
- primary navigation is `League · Record · Results · More`;
- Admin appears only under More for admins;
- approved unassigned members get a clear non-participation state rather than a dead end;
- Misfits red replaces green as the normal interaction accent;
- green remains semantic success/status;
- 320 / 375 / 390 / 412 / 768 / 960+ responsive acceptance remains intact;
- Impeccable reviews the final rendered/source UI;
- one full repository gate passes before merge.

## Cloudflare boundary

Remain entirely within the existing Cloudflare free-tier architecture:

- one Worker;
- static assets;
- one D1 database.

Do not add Workers KV, R2, Durable Objects, Queues, scheduled jobs, another runtime or paid Cloudflare service.

## Non-goals

This release does not:

- implement the parked fixture-first backend work;
- change scoring or standings rules;
- redesign promotion/relegation logic;
- change the 150-story functional denominator merely because access is tightened;
- create multi-club tenancy;
- add a second membership subsystem/table for permanent club membership;
- add background approval polling;
- add non-Google authentication.

## Simplicity decision

Use the existing `users` record for permanent club membership, the existing `league_players` record for season/league participation, and a small dedicated `club_invites` table for admission tokens.

This avoids both failure modes:

- overloading league membership to mean club membership; and
- creating a redundant `club_members` domain for a one-club product.

The desired authority is therefore:

`Google identity → users.club_status → league_players`

or, in product language:

`Who are you? → Are you in Misfits? → Where are you playing this season?`
