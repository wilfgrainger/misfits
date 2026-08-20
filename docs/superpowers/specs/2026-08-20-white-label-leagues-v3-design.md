# White-Label Leagues v3 Design

> **Status:** Current design for the next release. This supersedes the v2 assumption that only global administrators can create leagues and that the shared shell is Misfits-branded.

**Date:** 20 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Target:** Cloudflare Worker, D1, React, Google Identity Services

## 1. Purpose

The application is a reusable league-management product. It must not present Misfits as the product brand. Misfits 501 remains a league record that can be managed like any other league, while each authenticated user can create and manage leagues they own.

The homepage remains the working application: public leagues, standings and results are immediately useful without a marketing page. Google remains the only authentication method.

## 2. Scope

### Included

- Generic white-label application shell and document metadata.
- Any active Google-authenticated user may create a league.
- The creating user owns that league and may edit its settings, membership, invites and results.
- `wjgrainger@gmail.com` is the configured master administrator of all leagues and global people/role controls.
- Public and private league visibility.
- Public leagues appear in the directory and public read endpoints.
- Private leagues are omitted from anonymous directory/detail/players/standings/results reads.
- Private league owners, active members and the master administrator can read private league data after authentication.
- Existing invite-link flow remains the sharing mechanism for private and public leagues.
- Existing Google profile, nickname, Darts Counter link, player-only result entry, per-game averages, confirmation/dispute and league configuration behavior remains in scope.

### Explicitly excluded

- Tournaments, teams, promotion/relegation and fixtures.
- A second authentication method.
- Global administrator powers for ordinary league owners.
- Arbitrary profile-image uploads.

## 3. Authorization model

Keep the existing `PLAYER`/`ADMIN` role values for compatibility. Add an independent `is_master_admin` flag to the user record.

- Any active authenticated user can create a league.
- `leagues.created_by` is the owner and source of truth for league management.
- A league owner or master administrator can use the existing `/api/admin/leagues/*` operations for that league.
- A normal user cannot manage another user's league, even if they are a member.
- Only a master administrator can list or mutate global people, roles and account status.
- The master email is read from `MASTER_ADMIN_EMAIL`, falling back to the existing `BOOTSTRAP_ADMIN_EMAIL` so the current production configuration continues to work.
- A verified sign-in matching the configured master email is marked `ADMIN` and `is_master_admin = 1`.

The browser may hide controls for convenience, but every route rechecks the session, active status and ownership on the Worker.

## 4. Data model

Migration `0003_white_label_access.sql` adds:

- `users.is_master_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_master_admin IN (0, 1))`.
- `leagues.visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK(visibility IN ('PUBLIC', 'PRIVATE'))`.

The existing `leagues.created_by` column is used as the league owner. New league creators are automatically active members so they can see and operate their league immediately.

## 5. API behavior

Existing endpoint names remain stable:

- `GET /api/admin/leagues` returns all leagues for the master administrator and only owned leagues for other users.
- `POST /api/admin/leagues` requires an active session, not global admin role.
- League edit, invite, member and league-result routes require ownership or master-admin access.
- Result-id edit/delete routes resolve the result's league before authorizing it.
- `/api/admin/players` and its mutation route require master-admin access.
- `GET /api/me/leagues` returns active memberships plus owned leagues.
- Public league reads allow a private league only when the request has an authenticated owner, active member or master-admin session; otherwise they return the existing not-found shape.
- Public list filtering never returns private leagues.

The public JSON includes `visibility` but never emails, invite token hashes or other private account fields.

## 6. Client behavior

- The shared shell uses generic copy such as “League board” and “Darts / leagues”; Misfits artwork is not used as the global shell identity.
- A signed-in user always sees the league-control workspace, including the create-league form.
- The master administrator additionally sees the global People panel.
- League creation and editing include a Public/Private control.
- Public league sharing uses its normal league URL; private sharing uses the generated invite URL.
- The existing mobile-first layout remains the primary interaction model.

## 7. Testing and acceptance

Automated tests must prove:

- The migration contains the master-admin and visibility fields.
- The configured master sign-in is marked master-admin, while ordinary users are not.
- A player can create and manage an owned league.
- A player cannot manage another user's league or global people.
- The master administrator can manage all leagues and people.
- Private leagues are hidden from anonymous public reads and visible to authorized sessions.
- Visibility is preserved through create/edit responses and client forms.
- Existing Google auth, profile, invite, result, average, confirmation/dispute, standings and mobile behavior remains green.

Live verification must distinguish source/tests/build/deployment from an actual signed-in Google browser flow.
