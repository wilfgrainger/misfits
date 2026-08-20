# Misfits 501

Misfits 501 is a mobile-first club darts league application. The backend is a Cloudflare Worker with a D1 database; the frontend is built by Vite and served as Worker static assets.

The current release supports multiple leagues, admin-created invite links, simple Google-backed player profiles, player-only result entry, per-player three-dart averages and confirmed-result standings. Tournaments, teams and promotion/relegation are intentionally outside this release.

## Local development

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev:worker
```

The local Worker runs at `http://localhost:8787`. The browser uses Google Identity Services, so add the exact local browser origin you use to the OAuth client's **Authorized JavaScript origins** if you need to exercise local Google sign-in:

```text
http://localhost:8787
```

Set the local values in `.dev.vars`. That file is ignored and must never be committed:

```text
GOOGLE_CLIENT_ID=...
APP_ORIGIN=http://localhost:5173
BOOTSTRAP_ADMIN_EMAIL=...
```

The public browser client ID is configured in `VITE_GOOGLE_CLIENT_ID`. Google client IDs are identifiers, not secrets; the Worker still verifies the returned Google ID token server-side.

## Google sign-in setup

In Google Cloud Console:

1. Create or select a project and configure the OAuth consent screen.
2. Create or use an OAuth client with application type **Web application**.
3. Add these exact **Authorized JavaScript origins**:
   - Local: `http://localhost:8787` when using `npm run dev:worker`
   - Production: `https://darts.graingers.agency`
4. Put the public client ID in `VITE_GOOGLE_CLIENT_ID` and the Worker `GOOGLE_CLIENT_ID` secret. No client secret is required for this Google Identity Services flow.

The browser loads the official Google Identity Services button, receives an ID-token credential, and posts it to `/api/auth/google`. The Worker verifies the token against Google's JWKS, requires a verified email, and keys the application account by Google's stable `sub` claim rather than email. The legacy `/auth/google/callback` path is retained only for compatibility with the earlier OAuth client configuration; the normal UI does not use it.

## Cloudflare setup

The production Worker is `darts-501` at `https://darts.graingers.agency`. Its `workers.dev` route is disabled; the Worker is exposed through the custom domain only. The production D1 database has been provisioned in the `WEUR` region as `misfits` with ID `9702b993-f0b7-479b-9679-7e32a1c35214`. That ID is committed in `wrangler.jsonc`; no application code depends on it.

The migrations seed and extend the `Misfits 501` league without deleting existing users or results. Apply new migrations before deploying code that depends on them. To inspect the remote database:

```powershell
npx wrangler d1 execute misfits --remote --command "SELECT id,name,status,target_legs FROM leagues;"
npx wrangler d1 migrations list misfits --remote
npm run db:migrate:remote
```

Before the first deployment, configure the production Worker values:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL
```

`APP_ORIGIN` and the public browser client ID are committed in `wrangler.jsonc`. Keep externally managed variables when deploying:

```powershell
npm run build
npx wrangler deploy --keep-vars
```

The first verified Google account whose email matches `BOOTSTRAP_ADMIN_EMAIL` becomes an administrator only while no administrator exists. Remove or rotate that bootstrap value after handover.

## Product workflows

- Admins create or edit leagues, set capacity, games-per-pair, target legs and points per win, issue or revoke invite links, manage members and manage results.
- A player joins a league through an invite link after Google sign-in. Joining is checked again by the Worker for expiry, revocation, capacity and league state.
- A player can submit only a game involving their own account. Both player averages are required. The other player confirms or disputes the result.
- Only confirmed results affect standings. Averages are stored per game and shown on result rows and standings.
- The player profile uses the verified Google picture, a unique nickname and an optional HTTPS Darts Counter profile link.

Raw session tokens, invite tokens, Google subjects and email addresses are not public league data. Invite tokens are hashed before D1 storage.

## Verification

```powershell
npm run typecheck
npm test
npm run build
npx wrangler types
npm run db:migrate:local
npx wrangler d1 execute misfits --local --command "SELECT id,name,status,target_legs FROM leagues;"
npx wrangler deploy --dry-run
```

`wrangler deploy --dry-run` validates the Worker bundle and bindings without publishing a deployment. A live sign-in test requires the production JavaScript origin above to be present in the Google OAuth client.
