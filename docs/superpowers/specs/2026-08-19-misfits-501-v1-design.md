# Misfits 501 v1 Design

**Status:** Approved design captured for implementation planning  
**Date:** 19 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Target:** Cloudflare Free tier + Google identity

## 1. Purpose

Misfits 501 is a mobile-first club darts league application. The first release deliberately supports one league and one simple player identity model.

The product should feel like a polished sports application wearing the supplied Misfits 501 pub-poster artwork: black, dirty cream, blood red, muted dartboard green, distressed display treatments, and otherwise clean modern interaction design.

The homepage is the league itself, not a marketing page.

## 2. v1 scope

### Included

- Supplied Misfits 501 logo and visual theme.
- Mobile-first responsive web application.
- Public league table.
- Public results list.
- Public player list.
- Google-only sign-in.
- Mandatory unique Misfits username after first Google sign-in.
- No local passwords.
- One league and one active season.
- Authenticated player dashboard.
- Player result submission.
- Opponent result confirmation or dispute.
- Automatic standings from confirmed results.
- Admin portal under `/admin`.
- Admin player management.
- Admin result confirmation, correction and deletion.
- Admin manual result entry.
- Admin role promotion/demotion.
- League open/close control.
- Audit log for privileged and result-changing actions.

### Explicitly excluded from v1

- Local username/password authentication.
- Password reset flows.
- Multiple simultaneous leagues.
- Team competitions.
- Tournaments or knockouts.
- Payments.
- Messaging.
- Handicap systems.
- Advanced player statistics.
- Social profiles.
- Notifications.

## 3. Chosen architecture

Use one Cloudflare Worker application containing:

1. A React + TypeScript single-page frontend built with Vite.
2. A small TypeScript Worker API.
3. Static asset delivery through Cloudflare Workers Static Assets.
4. D1 as the application database.
5. Google OpenID Connect authorization-code login.

A small router such as Hono may be used for the Worker API, but business logic must remain framework-independent and separated into focused modules.

This approach is preferred over a separate Pages frontend plus Worker API because v1 gains nothing from operating two deployable units. A single Worker gives one origin, simple cookies, no CORS surface, one deployment and straightforward local development.

A full-stack meta-framework is intentionally avoided in v1. The application is small enough that it would add convention and runtime surface without solving a current problem.

## 4. Application boundaries

### Frontend

Responsibilities:

- Route-level UI.
- Public league views.
- Authenticated player flows.
- Admin UI.
- Form validation for user experience.
- Accessible loading, success and error states.

The frontend must not contain security decisions. Admin visibility in the UI is convenience only; authorization is always enforced by the Worker.

### Worker API

Responsibilities:

- Google OAuth/OpenID Connect flow.
- Session management.
- Authorization.
- Input validation.
- League/result/player mutations.
- Standings queries.
- Audit logging.

### D1

Responsibilities:

- Durable user identity metadata.
- Sessions.
- League membership.
- Match/result state.
- Audit records.

## 5. Authentication and onboarding

### Login model

The user sees only:

`Sign in with Google` -> Google -> Misfits username -> league

There is no Misfits password.

The Google email address is not the primary identity key. Store Google's stable subject identifier (`sub`) and use an internal UUID as the application user id.

### First sign-in

1. User selects **Sign in with Google**.
2. Worker creates a cryptographically random OAuth `state` value in a short-lived HttpOnly cookie.
3. Browser is redirected to Google requesting only the minimum identity scopes required for sign-in.
4. Google redirects to `/auth/google/callback` with an authorization code.
5. Worker verifies `state` before exchanging the code.
6. Worker validates the returned identity and requires a verified email.
7. Existing user is found by Google `sub`, or a new incomplete user row is created.
8. Worker creates an application session and redirects the user away from the callback URL immediately.
9. If the account has no username, the only authenticated destination is `/onboarding`.
10. User chooses a unique username.
11. Username is saved and normal application access begins.

### Username rules

- Required before league participation.
- Case-insensitively unique.
- 3-24 characters.
- Letters, numbers, spaces, `_` and `-` allowed.
- Leading/trailing whitespace removed.
- Repeated internal whitespace collapsed.
- Reserved names such as `admin`, `administrator`, `misfits` and obvious impersonation variants are rejected.
- Admin may rename a user through the admin portal.

### Sessions

Use opaque random session tokens.

- Browser cookie contains only the raw random token.
- D1 stores only a SHA-256 hash of the token.
- Cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`.
- Session has an explicit expiry and may be revoked server-side.
- Logout deletes the session row and expires the cookie.
- Authentication endpoints and write APIs must not be cached.

No Google refresh token is required because the app only needs sign-in identity, not continuing Google API access.

### CSRF and origin protection

- OAuth callback must validate `state` before token exchange.
- All state-changing application endpoints accept non-GET methods only.
- Worker rejects write requests whose `Origin` does not match the application origin.
- No permissive CORS policy is enabled.

## 6. Roles and authorization

Roles:

- `PLAYER`
- `ADMIN`

Every protected Worker route resolves the session to a user before executing business logic.

Every admin route additionally enforces `role = ADMIN` server-side.

Hiding admin navigation from players is not considered an authorization control.

### Initial admin bootstrap

A `BOOTSTRAP_ADMIN_EMAIL` deployment variable identifies the intended first administrator.

When no admin exists yet, a successfully authenticated user with that verified email may be promoted to `ADMIN`. Once an admin exists, the bootstrap path no longer grants privileges. The variable can then be removed from production configuration.

Future admins are promoted by an existing admin.

## 7. Data model

### `users`

- `id TEXT PRIMARY KEY`
- `google_sub TEXT NOT NULL UNIQUE`
- `email TEXT NOT NULL`
- `username TEXT UNIQUE COLLATE NOCASE`
- `role TEXT NOT NULL CHECK(role IN ('PLAYER','ADMIN'))`
- `status TEXT NOT NULL CHECK(status IN ('ACTIVE','SUSPENDED'))`
- `created_at TEXT NOT NULL`
- `last_login_at TEXT NOT NULL`

`username` is nullable only during first-login onboarding.

### `sessions`

- `token_hash TEXT PRIMARY KEY`
- `user_id TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `expires_at TEXT NOT NULL`
- foreign key to `users`

### `leagues`

v1 creates one league row but keeps the schema future-safe.

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `slug TEXT NOT NULL UNIQUE`
- `season_name TEXT NOT NULL`
- `status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED'))`
- `points_per_win INTEGER NOT NULL DEFAULT 2`
- `target_legs INTEGER NOT NULL DEFAULT 3`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `league_players`

- `league_id TEXT NOT NULL`
- `user_id TEXT NOT NULL`
- `active INTEGER NOT NULL DEFAULT 1`
- `joined_at TEXT NOT NULL`
- composite primary key `(league_id, user_id)`

### `matches`

- `id TEXT PRIMARY KEY`
- `league_id TEXT NOT NULL`
- `player_a_id TEXT NOT NULL`
- `player_b_id TEXT NOT NULL`
- `player_a_legs INTEGER NOT NULL`
- `player_b_legs INTEGER NOT NULL`
- `submitted_by TEXT NOT NULL`
- `status TEXT NOT NULL CHECK(status IN ('PENDING','CONFIRMED','DISPUTED'))`
- `confirmed_by TEXT`
- `dispute_note TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `confirmed_at TEXT`

Application validation guarantees:

- players differ;
- both players belong to the league and are active at submission time;
- scores are non-negative integers;
- draws are not accepted;
- normal player submission requires the winner to reach the league `target_legs` value;
- the submitter is one of the two players;
- only the opposing player can perform the normal confirmation action;
- admins may enter or correct results directly, with an audit record.

### `audit_log`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `actor_user_id TEXT`
- `action TEXT NOT NULL`
- `entity_type TEXT NOT NULL`
- `entity_id TEXT`
- `before_json TEXT`
- `after_json TEXT`
- `created_at TEXT NOT NULL`

Audit records are append-only from application code.

## 8. Result workflow

### Player-submitted result

1. Player opens **Add result**.
2. They select an active opponent.
3. They enter the result.
4. API validates league membership, score and submitter participation.
5. Match is saved as `PENDING`.
6. Opponent sees the pending match on their dashboard.
7. Opponent chooses **Confirm** or **Dispute**.
8. Confirm moves the match to `CONFIRMED` and it immediately affects public standings.
9. Dispute moves the match to `DISPUTED` and removes it from standings until an admin resolves it.

### Admin result handling

An admin can:

- confirm a pending result;
- correct a result;
- resolve a dispute;
- enter a historical/manual result directly;
- delete a result.

Every such mutation writes an audit event.

## 9. Standings

Only `CONFIRMED` matches contribute.

For every active league player calculate:

- Played.
- Won.
- Lost.
- Legs for.
- Legs against.
- Leg difference.
- Points = wins x `points_per_win`.

v1 ordering is:

1. Points descending.
2. Leg difference descending.
3. Legs for descending.
4. Username ascending.

Standings are derived from confirmed matches rather than stored as mutable totals. This avoids drift and makes result corrections deterministic.

## 10. Routes

### Public UI

- `/` - league table + latest results.
- `/results` - confirmed results.
- `/players` - league players.

### Authentication/onboarding UI

- `/login`
- `/onboarding`

### Player UI

- `/me`
- `/results/new`
- `/my-results`

### Admin UI

- `/admin`
- `/admin/league`
- `/admin/players`
- `/admin/results`
- `/admin/audit`
- `/admin/settings`

### API groups

- `/api/public/*`
- `/api/me/*`
- `/api/results/*`
- `/api/admin/*`
- `/auth/google`
- `/auth/google/callback`
- `/auth/logout`

Exact endpoint names may be refined during implementation while preserving these boundaries.

## 11. Visual design

The supplied Misfits 501 logo is the hero brand asset and must be committed into the repository as an optimized web asset.

### Palette

- Background: near-black.
- Primary text: dirty cream/bone.
- Accent: deep darts red.
- Secondary accent: restrained dartboard green.
- Surfaces: charcoal, not pure black-on-black.

### Typography

- Distressed display face only for major brand headings where legibility remains strong.
- Clean condensed/sans-serif face for tables, forms and body copy.
- Avoid using distressed effects for dense data.

### UI character

- Strong circular/dartboard geometry used sparingly.
- Cream keylines and subtle worn texture may decorate hero/card edges.
- Data tables and forms remain crisp.
- Red communicates selection, action and brand emphasis, not every border.
- Green is secondary and must not compete with red.

### Homepage hierarchy

1. Compact logo/brand header.
2. League name and current season/status.
3. League table immediately visible.
4. Latest results.
5. Sign-in/player action where relevant.

No generic marketing hero sits between the user and league information.

## 12. Accessibility and responsive behavior

- Core flows must be keyboard operable.
- Visible focus states.
- Semantic forms and tables.
- Text contrast must meet WCAG AA for normal UI text.
- Do not encode result state by colour alone.
- Minimum comfortable tap targets on mobile.
- League table may use a compact mobile presentation but must not hide rank, player, played, wins/losses, difference or points.
- Respect reduced-motion preferences.

## 13. Error handling

API errors use a consistent JSON structure with a stable machine code and human-safe message.

Expected errors include:

- unauthenticated;
- forbidden;
- username unavailable;
- invalid result;
- opponent unavailable;
- result already resolved;
- league closed;
- session expired.

Unexpected server errors return a generic message and must not expose stack traces, secrets, Google responses or SQL details to the browser.

The UI keeps the user's entered form values after a recoverable validation failure.

## 14. Security controls

- Google secrets are Worker secrets, never repository values.
- D1 queries use parameterized prepared statements.
- Validate all mutation payloads in the Worker even when the browser has already validated them.
- Admin checks occur server-side on every admin API route.
- Session token hashes, not raw session tokens, are persisted.
- OAuth `state` is mandatory.
- Write operations enforce same-origin requests.
- Login and authenticated API responses use suitable no-store cache headers.
- User-provided text is rendered as text, never trusted HTML.
- Audit privileged mutations.
- Suspended users cannot submit or confirm results.
- Closed leagues reject normal player result submissions.

## 15. Testing strategy

### Unit tests

- Username normalization and validation.
- Match score validation.
- Standings calculation and tie-breaking.
- Role guards.
- Session token hashing/expiry helpers.
- Audit event creation inputs.

### Worker/API tests

Use local/simulated D1 where practical.

Test:

- first-login onboarding path;
- session-required endpoints;
- player cannot call admin APIs;
- player cannot submit a match for two other players;
- player cannot confirm their own submission;
- suspended user cannot mutate results;
- closed league rejects normal submissions;
- pending result does not affect standings;
- confirmed result does affect standings;
- disputed result does not affect standings;
- admin corrections recalculate standings;
- admin mutation produces audit record.

Google's external token endpoint should be mocked in automated tests. Do not make CI depend on a real Google account.

### Frontend tests

Cover the highest-value flows rather than every decorative component:

- username onboarding;
- submit result;
- confirm/dispute result;
- admin edit result;
- public standings rendering.

### Build checks

- TypeScript typecheck.
- Unit/API test suite.
- Production build.
- Wrangler configuration validation where available.

## 16. Deployment model

Production deploys one Cloudflare Worker application plus its D1 binding and static assets.

Required production configuration includes:

- D1 database binding.
- Google client id.
- Google client secret as a secret.
- Application origin/base URL.
- Initial bootstrap admin email until first admin exists.

The Google OAuth client must register the exact production callback URI.

Local development uses Wrangler's local Worker runtime and local D1 simulation. Development Google OAuth may use a separate OAuth client/callback configuration so production credentials are not needed for ordinary development.

No paid Cloudflare service is required by the v1 architecture.

## 17. Repository shape

Target structure:

```text
misfits/
  docs/
    superpowers/
      specs/
  migrations/
  public/
    brand/
  src/
    client/
      components/
      pages/
      styles/
    server/
      auth/
      db/
      domain/
      routes/
    shared/
  tests/
  package.json
  tsconfig.json
  vite.config.ts
  wrangler.jsonc
  README.md
```

Keep domain rules out of route handlers and React components. The standings calculation, result-state transitions and authorization decisions should have small testable modules.

## 18. Acceptance criteria

v1 is complete when:

1. An unauthenticated visitor can view league standings, confirmed results and players.
2. A new user can sign in only through Google and is forced to choose a unique Misfits username before participating.
3. No local password exists anywhere in the product or database.
4. A league player can submit a valid result involving themselves.
5. The opponent can confirm or dispute that result.
6. Only confirmed results affect the league table.
7. Standings recalculate correctly after confirmations and admin corrections.
8. A normal player cannot access or invoke admin functionality.
9. An admin can manage players, league state and results.
10. Relevant privileged/result mutations create audit records.
11. The site uses the supplied Misfits 501 artwork and agreed black/cream/red/green visual language.
12. The main player flows work comfortably on a phone.
13. The application builds and runs locally with Cloudflare tooling and D1 simulation.
14. Production deployment needs no paid Cloudflare product.

## 19. Deferred decisions

These are explicitly deferred until they become real requirements:

- multiple leagues/seasons active at once;
- head-to-head tie-breakers;
- fixtures/scheduling;
- player avatars;
- email notifications;
- push notifications;
- advanced match statistics;
- alternate scoring systems;
- native mobile applications.

They must not complicate the v1 implementation pre-emptively.
