# Misfits 501

Misfits 501 is a mobile-first club darts league application. The backend is a Cloudflare Worker with a D1 database; the frontend is built by Vite and served as Worker static assets.

## Local development

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev:worker
```

The local Worker runs at `http://localhost:8787`. The local Google OAuth client must allow this exact callback URI:

```text
http://localhost:8787/auth/google/callback
```

Set the local values in `.dev.vars`. That file is ignored and must never be committed:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_ORIGIN=http://localhost:8787
BOOTSTRAP_ADMIN_EMAIL=...
```

The browser client is built separately with `npm run dev`, but backend routes and D1 bindings are exercised through `npm run dev:worker`.

## Google sign-in setup

In Google Cloud Console:

1. Create or select a project and configure the OAuth consent screen.
2. Create an OAuth client with application type **Web application**.
3. Add the exact authorized redirect URI for each environment:
   - Local: `http://localhost:8787/auth/google/callback`
   - Production: `<APP_ORIGIN>/auth/google/callback`
4. Put the generated client ID and client secret in the environment configuration, never in source control.

The Worker uses Google's authorization-code flow with `openid email`, validates the OAuth state cookie, exchanges the code server-side, verifies the ID token against Google's JWKS, requires a verified email, and keys the application account by Google's stable `sub` claim rather than email.

## Cloudflare setup

The production D1 database has been provisioned in the `WEUR` region as `misfits` with ID `9702b993-f0b7-479b-9679-7e32a1c35214`. That ID is committed in `wrangler.jsonc`; no application code depends on it.

The initial migration has been applied remotely and seeds the `Misfits 501` league. To inspect the remote database:

```powershell
npx wrangler d1 execute misfits --remote --command "SELECT id,name,status,target_legs FROM leagues;"
npx wrangler d1 migrations list misfits --remote
```

Before the first deployment, configure the production environment values. `APP_ORIGIN` must be the final HTTPS origin and must match the Google redirect URI exactly:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL
```

`APP_ORIGIN` is committed as the current Worker origin in `wrangler.jsonc`. Keep externally managed variables when deploying:

```powershell
npm run build
npx wrangler deploy --keep-vars
```

The first verified Google account whose email matches `BOOTSTRAP_ADMIN_EMAIL` becomes an administrator only while no administrator exists. Remove or rotate that bootstrap value after handover.

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

`wrangler deploy --dry-run` validates the Worker bundle and bindings without publishing a deployment. A real deploy and live Google callback still require the final `APP_ORIGIN` and Google OAuth configuration above.
