# Misfits 501

Misfits 501 is a private-club-first, mobile darts league application for one club. It gives members a polished home for weekly leagues, standings, results and player profiles while DartCounter remains the exclusive scoring surface and WhatsApp remains the club conversation. It is not a white-label league product.

The application runs entirely on Cloudflare's free-tier-capable stack: one Worker serves the Hono API and Vite/React static assets, and one D1 database stores club data. Google Identity Services is the only sign-in method.

## Product contract

The current direction is defined in [`docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md`](docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md). In summary:

- Misfits 501 is the only club and the product identity.
- People arrive through a shared club or league invite, sign in with Google, and access only their own account.
- Administrators approve league participation, run weekly seasons, maintain results, and can promote additional administrators. The initial master administrator is configured out of band.
- Members can view current and previous leagues, click player cards from tables, and maintain a photo, nickname, bio and DartCounter link.
- Games are played and scored in DartCounter (camera scoring supported; Omni optional). This site records the resulting league data rather than recreating a darts scorer.
- WhatsApp and configured social links connect members to club conversation.
- The service must remain within Cloudflare's no-cost allowances for normal club usage; no paid dependency is part of the core path.

The existing code already provides Google sign-in, invite joins, league membership, public league views, configurable league rules, player result submission, confirmation/dispute, averages, standings, profiles, administrative result correction, and role controls. Join requests, bios, clickable public player cards, configured socials, scheduling/fixtures, richer statistics and a dedicated archive presentation are the next product increments recorded in the v4 plan.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev:worker
```

The local Worker runs at `http://localhost:8787`. Add that exact origin to the Google OAuth web client's **Authorized JavaScript origins**.

Set local-only values in `.dev.vars` (never commit it):

```text
GOOGLE_CLIENT_ID=...
APP_ORIGIN=http://localhost:8787
BOOTSTRAP_ADMIN_EMAIL=...
MASTER_ADMIN_EMAIL=...
```

`VITE_GOOGLE_CLIENT_ID` is a public browser identifier. The Worker still verifies every Google ID token server-side, requires a verified email, and associates accounts with Google's stable `sub` value.

## Production and Cloudflare

The production Worker is configured in `wrangler.jsonc`. Apply D1 migrations before deploying code that depends on them:

```bash
npm run db:migrate:remote
npm run build
npx wrangler deploy --keep-vars
```

Configure production values with Wrangler secrets. `MASTER_ADMIN_EMAIL` identifies the first master administrator; `BOOTSTRAP_ADMIN_EMAIL` is retained as a compatibility fallback. Administrators may then enable other administrators from the People controls. Keep administrator email configuration private.

The free-tier guardrails are architectural: no object storage is required for Google profile photos, no scheduled polling is required, public reads can be cached, writes are user-driven, and DartCounter/WhatsApp remain external links rather than replicated services. Usage must still be monitored against Cloudflare's current published limits before growth or new background work.

## Security and privacy

- Google sign-in is always required for member actions.
- Session cookies are opaque, secure and HTTP-only; mutation routes enforce same-origin requests.
- Raw session tokens, invite tokens, Google subjects and member emails are never returned by public league APIs.
- Invite tokens are hashed in D1.
- A player can submit only a game involving their own account; the opponent confirms or disputes it.
- Only confirmed results affect standings.
- Profile links accept HTTPS URLs on the official `dartcounter.net` host.
- Administrative authority is enforced by the Worker, never only by hidden browser controls.

## Verification

```bash
npm run typecheck
npm test
npm run build
npx wrangler types
npm run db:migrate:local
npx wrangler deploy --dry-run
```

A real Google sign-in smoke test still requires the deployed origin to be authorized in Google Cloud Console.
