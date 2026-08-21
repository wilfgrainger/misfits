# Misfits 501

Misfits 501 is a private-club-first, mobile darts league application for one club. Its direction is a luxury, pristine Misfits 501 club UI; it is not a white-label league product. DartCounter remains the scoring surface: this application records league data and does not become a live scorer.

The application runs entirely on Cloudflare's free-tier-capable stack: one Worker serves the Hono API and Vite/React static assets, and one D1 database stores club data. Google Identity Services is the only sign-in method.

## Product direction

For enduring intent, read [`PRODUCT.md`](PRODUCT.md), then [`VISION.md`](VISION.md). For agent and contributor workflow, start with [`AGENTS.md`](AGENTS.md), then check the current handoff in [`PROGRESS.md`](PROGRESS.md). Historical specifications remain decision records, not binding product authority.

In summary:

- Misfits 501 is the only club and the product identity.
- Google Identity Services is the only sign-in method; Worker-side checks protect accounts and mutations.
- One Worker, static assets, and one D1 database are the free-tier-capable core path. Secrets stay in Wrangler configuration or `.dev.vars`, never source.
- The current foundation slice preserves the existing club identity, Google-authenticated application boundary, D1-backed league data, and Worker-side security/privacy contract.
- The service must remain within Cloudflare's no-cost allowances for normal club usage; no paid dependency is part of the core path.

Membership requests, fixtures, archive presentation, player bios, configured social links, and richer statistics are gated follow-on work. They need the club owner’s open decisions on public visibility/location/time zone; official WhatsApp and social URLs; match night/day, season length, format, postponement window, and tie-breaks; bio/photo privacy; and whether any DartCounter integration is desired. Do not represent those capabilities as implemented until the v4-gated work is delivered.

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

### Automatic deployment after merge

`.github/workflows/ci.yml` keeps pull requests and non-production pushes on verification only. A push to `main`—including the push created by merging a pull request—runs the same verification job and then deploys the Worker with Wrangler after verification succeeds. The deploy uses the official Cloudflare Wrangler action and preserves dashboard-managed variables with `--keep-vars`.

Add these repository Actions secrets before merging a deployable change:

- `CLOUDFLARE_API_TOKEN` — a narrowly scoped Cloudflare API token that can deploy Workers for this account.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account containing the `darts-501` Worker and `misfits` D1 database.

The workflow does not apply remote D1 migrations automatically. For a schema-dependent change, apply and verify its additive migration first, then merge the code so the main-branch deployment remains safe and repeatable. See the [Cloudflare free-tier runbook](docs/operations/cloudflare-free-tier-runbook.md) for the release boundary.

Configure production values with Wrangler secrets. `MASTER_ADMIN_EMAIL` identifies the first master administrator; `BOOTSTRAP_ADMIN_EMAIL` is retained as a compatibility fallback. Administrators may then enable other administrators from the People controls. Keep administrator email configuration private.

The free-tier guardrails are architectural: no object storage, scheduled polling, or paid service is required on the core path; writes are user-driven; and DartCounter remains external. Before a Wrangler deployment, record measured usage separately from Cloudflare's published limits using the [free-tier runbook](docs/operations/cloudflare-free-tier-runbook.md).

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
