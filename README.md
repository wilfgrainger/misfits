# Misfits 501

Misfits 501 is a mobile-first club darts league application built for one simple job: show the league, record results, and keep administration painless.

Players sign in with Google, choose one unique Misfits username, and never create a local password. Public visitors can see standings, confirmed results and active players. League players can submit results; the opponent confirms or disputes them. Administrators can manage players, correct results, change league settings and review an audit trail.

## Stack

- React + TypeScript + Vite
- Cloudflare Workers + Static Assets
- Hono Worker API
- Cloudflare D1
- Google OpenID Connect authorization-code sign-in
- Vitest + Testing Library

The frontend and API deploy as one Cloudflare Worker application. Confirmed matches are the source of truth for standings; standings are recalculated rather than stored as mutable totals.

## Local setup

Requirements: Node.js 22+ and a Cloudflare account for D1/deployment work.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Edit `.dev.vars` with a Google OAuth web client:

```dotenv
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
APP_ORIGIN="http://localhost:5173"
BOOTSTRAP_ADMIN_EMAIL="your-google-email@example.com"
```

Do not commit `.dev.vars`. It is ignored by Git.

For local Google sign-in, register this exact authorized redirect URI on the Google OAuth web client:

```text
http://localhost:5173/auth/google/callback
```

Google requires the callback supplied by the application to match an authorized redirect URI exactly.

## Development commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run db:migrate:local
```

The first migration creates `users`, `sessions`, `leagues`, `league_players`, `matches` and `audit_log`, then seeds the v1 `Misfits 501` league.

## Account model

There is no local password database. Google supplies identity; Misfits stores Google's stable subject identifier (`sub`), the verified email address as private account metadata, an internal UUID, and the public league username.

The browser receives an opaque application session token in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. D1 stores only the SHA-256 hash of that token.

The first successful login whose verified Google email matches `BOOTSTRAP_ADMIN_EMAIL` becomes `ADMIN`, but only while no administrator already exists. Once the first admin is established, remove the bootstrap value from production. Future administrators should be promoted from the admin portal.

## Result workflow

A player can submit only a result involving themselves and another active league player. The result starts as `PENDING`. Only the opponent can normally confirm or dispute it. Only `CONFIRMED` results contribute to standings.

Administrators can enter a confirmed result directly, correct an existing score/status, resolve disputes and delete bad entries. Administrative result, player and league mutations append audit records.

## Production deployment

### 1. Create D1

Authenticate Wrangler, then create the database:

```bash
npx wrangler login
npx wrangler d1 create misfits
```

Copy the returned D1 database UUID into `wrangler.jsonc`, replacing:

```text
00000000-0000-0000-0000-000000000000
```

Apply the production migration:

```bash
npm run db:migrate:remote
```

### 2. Configure Google OAuth

Create a Google OAuth **Web application** client. For a production origin such as `https://darts.example.com`, register this exact authorized redirect URI:

```text
https://darts.example.com/auth/google/callback
```

Set the four Worker bindings. Using Worker secrets for all four keeps deployment configuration out of the repository and ensures Wrangler deployments preserve them:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put APP_ORIGIN
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL
```

`APP_ORIGIN` must be only the application origin, for example `https://darts.example.com`, with no path.

### 3. Verify and deploy

```bash
npm run typecheck
npm test
npm run build
npm run deploy
```

Then check:

1. `/` renders the public league table.
2. `/results` and `/players` work while signed out.
3. Google sign-in returns to `/auth/google/callback` successfully.
4. A first-time player is forced through username onboarding.
5. A player can submit a result and the opponent can confirm it.
6. The confirmed result immediately affects the public standings.
7. `/admin` is rejected for a normal player and works for an administrator.

After the first administrator has successfully signed in, remove `BOOTSTRAP_ADMIN_EMAIL`:

```bash
npx wrangler secret delete BOOTSTRAP_ADMIN_EMAIL
```

## Rollback

Worker code can be rolled back to a prior deployed version with:

```bash
npx wrangler rollback
```

A Worker rollback does **not** roll back D1 data or migrations. Treat database migrations as forward-moving changes and review data compatibility before rolling application code back.

## Security notes

- Admin authorization is enforced in the Worker, not just by hidden navigation.
- OAuth state is checked before exchanging an authorization code.
- Google ID tokens are signature/audience/issuer validated and require a verified email.
- State-changing APIs require the application origin.
- D1 operations use prepared statements.
- Raw session tokens are never persisted.
- Public APIs expose league usernames and results, not player email addresses or Google identifiers.
- Suspended players cannot submit or confirm results.
- Closed leagues reject normal player result submission.

## CI

GitHub Actions runs TypeScript typechecking, the Vitest suite and the production Vite build on pushes and pull requests.

## Product scope

v1 intentionally contains one league and excludes teams, tournaments, payments, messaging, handicaps, notifications and advanced statistics. The point is a small trustworthy league system, not a darts ERP.

The approved architecture and implementation plan live under `docs/superpowers/`.
