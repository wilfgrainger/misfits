# Misfits 501 Agent Contract

## Product authority

Use this hierarchy when requirements conflict:

1. `docs/superpowers/specs/2026-08-20-misfits-501-club-v4-design.md` — binding product authority.
2. `docs/superpowers/plans/2026-08-20-misfits-501-club-foundation.md` — approved implementation sequencing.
3. This file — repository operating rules.
4. Historical v1–v3 designs, plans, and evidence — context only; they must not restore retired product direction.

Misfits 501 is one private club, not a white-label platform. Do not add tenancy, player-created league ownership, or generic “League Board” language. The target experience is a luxury, pristine Misfits 501 club UI: mobile-first, accessible, legible, restrained, and unmistakably club-specific. Preserve the supplied brand artwork without destructive cropping.

## Platform boundaries

- Keep the core path to one Cloudflare Worker serving static assets and one D1 database. Do not require paid Cloudflare services, queues, object storage, scheduled work, or background polling.
- Google Identity Services is the only sign-in method. Verify Google identity server-side; never treat browser state as authorization.
- Keep secrets in Wrangler configuration or `.dev.vars`; never commit secrets or add them to source, client bundles, logs, fixtures, or documentation.
- DartCounter is the scoring surface. This application records league data and must not become a live darts scorer.
- Preserve Worker-side authentication and authorization, same-origin checks for mutations, audit records, API compatibility, privacy, and accessibility.

## Delivery workflow

Follow Cave Pony: make the smallest honest change, reuse current helpers, avoid speculative schema or runtime features, and prove each behavior change with the smallest decisive test. Start with a failing focused test for behavior changes, implement only enough to pass it, then run the relevant regression checks. Documentation changes must distinguish implemented behavior from gated follow-on work.

For D1 changes, add an additive migration; do not rewrite, delete, or mutate an already-applied migration. Keep migrations compatible with deployed code during rollout, apply remote migrations before dependent deploys, and do not introduce a table merely for a possible future feature.

Before handing off a change, run the applicable focused tests and then:

```bash
npm run typecheck
npm test
npm run build
npx wrangler types
npx wrangler deploy --dry-run
git diff --check
git status --short
```

Before a production Wrangler deployment, follow `docs/operations/cloudflare-free-tier-runbook.md`.
