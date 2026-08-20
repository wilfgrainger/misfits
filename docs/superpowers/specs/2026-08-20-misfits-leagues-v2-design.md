# Misfits Leagues v2 Design

**Status:** Superseding design for implementation  
**Date:** 20 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Target:** Cloudflare Worker, D1, React, Google Identity Services

## 1. Purpose

Misfits is a mobile-first club darts league application. The existing v1 design and implementation established the visual language, Google-only identity, opaque application sessions, and a first admin account. This document supersedes the v1 product assumptions that limited the application to one league and deferred player profiles.

The homepage remains the application itself: a player should be able to see leagues, standings, results and the next useful action without passing through a marketing page. The supplied Misfits 501 artwork remains the brand asset and the interface should continue to feel like a focused mobile app rather than a desktop administration site.

## 2. v2 scope

### Included

- Multiple concurrent leagues.
- League creation and editing by an authenticated administrator.
- League capacity, season label, open/closed state, target legs, points per win and repeat games per player pair.
- Admin-created invite links that allow a Google-authenticated player to join a specific league.
- Public league list, league standings, confirmed results and active player list.
- Google-only sign-in using the official Google Identity Services button.
- Server-side identity verification by Google's stable `sub` claim and an opaque Misfits session cookie.
- A simple player profile containing the Google profile picture, a unique nickname and an optional Darts Counter profile link.
- Player result submission only when the signed-in player is one of the two players in the result.
- Per-player three-dart average on every submitted game.
- Opponent confirmation or dispute for player-submitted results.
- Derived standings from confirmed results only.
- Admin result confirmation, correction, deletion and manual entry.
- Admin player access and administrator role management.
- Audit records for league, invite, membership, result, role and access mutations.
- Mobile-first authenticated app shell with clear player and admin workspaces.

### Explicitly excluded

- Local passwords, magic links or any second authentication system.
- Tournaments, knockouts, teams or doubles.
- Promotion and relegation automation.
- Fixtures or scheduled match calendars. The league configuration controls how many recorded games a pair may play; players record the games they actually play.
- Payments, messaging, notifications, handicaps and advanced statistics.
- Arbitrary image uploads. The displayed picture is the verified Google profile picture; adding image storage is a separate product decision.

## 3. Architecture

Keep one deployable Cloudflare Worker application:

1. React + TypeScript SPA served from Worker static assets.
2. Hono routes for the API and current Google auth endpoints.
3. D1 for users, sessions, leagues, memberships, invites, results and audit records.
4. Framework-independent domain functions for validation, pairing limits and standings.

The browser may provide convenience validation and hide controls, but all identity, membership, capacity, pairing and role decisions are made by the Worker. D1 stores only hashes of invite tokens and session tokens, never the raw secrets.

## 4. Identity and profile

### Google sign-in

The sign-in surface uses the official Google Identity Services `renderButton` flow already shipped in the application. The browser posts the returned credential to `POST /api/auth/google`. The Worker verifies the credential against the configured Google client id and accepted Google issuers, then upserts the user by Google `sub`.

The application does not trust a browser-supplied email, role or user id. A verified Google identity creates or updates the local user and receives an opaque, HttpOnly, Secure, SameSite=Lax session cookie. No Google refresh token is needed.

The existing redirect callback remains available only for compatibility with the earlier Google client configuration. The normal UI must use the official button and credential endpoint.

### First sign-in and nickname

New Google users choose a unique nickname before joining a league or recording a result. The existing `users.username` column remains the database/API field for compatibility; the UI labels it **Nickname**. It keeps the existing 3-24 character normalization and reserved-name rules.

The verified Google picture claim is stored as `profile_image_url` and displayed as the profile avatar. A later Google sign-in may refresh that URL. The player can edit their nickname and an optional `darts_counter_url`; the picture is not an arbitrary user-controlled upload.

`darts_counter_url`, when present, must be an HTTPS URL. The server stores the normalized URL and renders it as an external link with safe text content; the initial release does not assume a single Darts Counter hostname.

## 5. Roles and authorization

Roles remain `PLAYER` and `ADMIN`.

- Any active authenticated user may read private data for leagues they joined and manage their own profile.
- A player may join a league only through a valid invite token and only while the invite, league and capacity allow it.
- A player may create a result only if their session user is `player_a_id` or `player_b_id`.
- A player may confirm or dispute only the other player's pending submission; they cannot confirm their own submission.
- A player cannot create, edit, close, delete or configure leagues, issue invites, change memberships, manage results for unrelated players, promote administrators or suspend accounts.
- An active administrator may create and edit leagues, issue/revoke invites, manage league membership, manage all results, and manage user roles/statuses.

Every protected route resolves the session user and checks active status. Every admin route checks `role = ADMIN` on the server.

The existing bootstrap rule remains: while no admin exists, the verified email matching `BOOTSTRAP_ADMIN_EMAIL` becomes the first admin. Once an admin exists, the rule grants no further privileges.

## 6. League model

Each league is a separate season/workspace:

- `name`: display name.
- `slug`: unique URL-safe identifier.
- `season_name`: display season label.
- `max_players`: inclusive active-member capacity.
- `matches_per_pair`: maximum recorded games between the same two active members during this league season; default `1`.
- `points_per_win`: standings points awarded to the winner; default `2`.
- `target_legs`: legs the winner must reach for normal player submissions; default `3`.
- `status`: `OPEN` or `CLOSED`.
- `created_by`: administrator who created the league.

The first migration preserves the existing `misfits-501` league and gives it a documented default capacity. An admin can edit it through the same league settings flow as any other league.

Players do not need a fixture row for every possible pairing. When a result is submitted, the server counts non-deleted `PENDING`, `CONFIRMED` and `DISPUTED` games for the unordered pair. A new result is rejected once that count reaches `matches_per_pair`. Deleting a result releases the slot. This supports one game per pair by default and smaller leagues that need a different repeat count without prematurely building a scheduling system.

## 7. Invite model

An administrator creates an invite for a league. The Worker generates a high-entropy opaque token, stores only its SHA-256 hash, and returns a one-time display URL:

`https://darts.graingers.agency/join/<token>`

The invite record contains the league, creator, optional expiry, usage count, and revocation timestamp. A valid invite may be used by an authenticated Google user with a nickname. Joining is idempotent for an existing member and is rejected when the league is closed, the invite is revoked/expired, or active capacity is full.

The client preserves a pending invite path through Google sign-in and attempts the join after the session is established. The API revalidates the token and all league rules; the URL itself never grants membership.

## 8. Result model and workflow

A result contains:

- league and two distinct active members;
- each player's legs;
- each player's three-dart average, rounded to two decimal places;
- the submitting player;
- `PENDING`, `CONFIRMED` or `DISPUTED` status;
- confirmation/dispute metadata.

Normal player flow:

1. The player selects an active opponent from a league they joined.
2. The player enters both leg scores and both averages.
3. The Worker confirms that the session user is one of the two players, both players are active members, the league is open, the scores are a decisive valid result, and the pair has not reached its configured limit.
4. The result is stored as `PENDING` with the session user as submitter.
5. The opponent can confirm or dispute it.
6. A confirmed result contributes to standings; a pending or disputed result does not.

Player submissions must include averages for both players. Averages are finite numbers from `0` through `200`, stored at two decimal places. The normal player flow does not allow a user to submit a game for two other players or alter a confirmed result.

Admin flow:

- confirm a pending result;
- resolve a dispute;
- correct players, legs or averages;
- enter a historical result directly as confirmed;
- delete a result.

Every admin result mutation records an audit event containing the relevant before/after values.

## 9. Standings and public views

Only confirmed results contribute. For each active league member derive:

- played, won, lost;
- legs for, legs against, leg difference;
- points;
- average across the player's submitted/recorded confirmed games.

Order by points descending, leg difference descending, legs for descending, average descending, nickname ascending. Public results show both player averages; public league pages never expose email addresses or invite tokens.

Public API reads are league-scoped by slug or id. The UI can show several leagues and a selected league without assuming `misfits-501`.

## 10. API boundaries

The exact route names may be refined while preserving these responsibilities:

### Public

- `GET /api/public/leagues`
- `GET /api/public/leagues/:slug`
- `GET /api/public/leagues/:leagueId/standings`
- `GET /api/public/leagues/:leagueId/results`
- `GET /api/public/leagues/:leagueId/players`

### Authenticated player

- `GET /api/me`
- `GET /api/me/profile`
- `PATCH /api/me/profile`
- `POST /api/me/username` for first-login compatibility
- `POST /api/invites/:token/join`
- `GET /api/me/leagues`
- `POST /api/leagues/:leagueId/results`
- `POST /api/results/:resultId/confirm`
- `POST /api/results/:resultId/dispute`
- `GET /api/me/results`

### Admin

- `GET /api/admin/leagues`
- `POST /api/admin/leagues`
- `PATCH /api/admin/leagues/:leagueId`
- `POST /api/admin/leagues/:leagueId/invites`
- `POST /api/admin/invites/:inviteId/revoke`
- `GET /api/admin/leagues/:leagueId/members`
- `PATCH /api/admin/leagues/:leagueId/members/:userId`
- `GET /api/admin/leagues/:leagueId/results`
- `POST /api/admin/leagues/:leagueId/results`
- `PATCH /api/admin/results/:resultId`
- `DELETE /api/admin/results/:resultId`
- existing player role/status routes, generalized to all leagues

All write routes enforce same-origin requests and return the existing stable JSON error shape.

## 11. Mobile application behavior

The existing Misfits app shell is retained. Add compact, touch-friendly routes/views:

- league switcher and league summary;
- standings, results and players tabs;
- add-result form with opponent, legs and averages;
- pending confirmations/disputes;
- profile editor with avatar, nickname and Darts Counter link;
- admin league editor, invite link action, member list and result queue.

Use the existing black/dirty-cream/red/green language and supplied artwork. Keep dense data crisp, keep primary controls reachable with a thumb, and do not make desktop tables the primary interaction model.

## 12. Security and privacy

- Google client secrets remain Worker secrets and never enter the repository.
- D1 queries use prepared statements.
- Session and invite tokens are stored hashed.
- Same-origin checks protect all state-changing routes.
- Suspended users cannot mutate data.
- Closed leagues reject normal player result submissions and joins.
- User-facing reads expose nickname and picture but not email, Google subject, session material or invite hashes.
- External profile links are HTTPS and host-validated.
- User text is rendered as text, never trusted HTML.
- Admin and result mutations are audited.

## 13. Testing and acceptance

Automated tests must cover:

- Google identity upsert and first-admin bootstrap;
- profile validation and ownership;
- league creation/editing authorization;
- invite hashing, expiry, revocation, idempotent joining and capacity;
- player-only self-involved result submission;
- pair repeat limits;
- average validation and rounding;
- confirm/dispute permissions;
- confirmed-only standings and average aggregation;
- admin correction/deletion and audit records;
- public league scoping and private-field redaction;
- mobile client rendering of league/player/admin states.

The v2 release is accepted only when local typecheck, tests and production build pass, the D1 migration applies cleanly, the deployed custom domain serves the new build, and a real Google-authenticated user can join a league through an invite, edit their profile, record a self-involved result, and see the expected pending/confirmed standings behavior. A clean browser with no Google account may verify the GIS popup but cannot substitute for the real account test.

## 14. Deferred work

Tournaments, promotion/relegation, fixture calendars, notifications, image uploads, teams, handicaps and advanced statistics remain deliberately outside this release.
