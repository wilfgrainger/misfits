# Cloudflare Free-tier Runbook

## Purpose and boundary

Misfits 501's core path is one Cloudflare Worker serving static assets and one D1 database. It does not require queues, R2/object storage, scheduled jobs, paid analytics, email delivery, or background polling. This runbook is the release check before a Wrangler deployment; it does not promise that any provider allowance is permanent.

## Provider limits versus club measurements

Provider limits are published externally and can change. Consult the official pages immediately before release:

- [Workers platform limits](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 platform limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Workers pricing and plan allowances](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing and plan allowances](https://developers.cloudflare.com/d1/platform/pricing/)

Current measured usage is a separate record. No baseline has been recorded by this documentation foundation, so “within free-tier” is not evidence of measured headroom. Record the actual dashboard values and the provider-page review date for the release being considered; do not copy provider caps into the measurement column.

| Resource | Current measured usage | Provider limit / allowance | Release decision |
| --- | --- | --- | --- |
| Worker requests | Record dashboard value | Verify at official Workers links | Confirm normal club traffic has headroom |
| Worker CPU time | Record dashboard value | Verify at official Workers limits | Investigate unexpected CPU growth |
| D1 rows read | Record dashboard value | Verify at official D1 links | Confirm public reads remain efficient |
| D1 rows written | Record dashboard value | Verify at official D1 links | Confirm writes remain user-driven |
| D1 storage | Record dashboard value | Verify at official D1 links | Confirm capacity before migration |

## Pre-deploy checklist

1. Record the release date, deployment identifier, dashboard measurements, and the date the official limits pages were reviewed.
2. Confirm the change still uses only the Worker, static assets, and D1 on the core path.
3. Confirm no source, migration, or configuration change adds a queue, object store, scheduled trigger, paid service, background polling, or a secret in source.
4. For a D1 migration, verify it is additive and run remote migrations before code that depends on it.
5. Run:

```bash
npm run typecheck
npm test
npm run build
npx wrangler types
npx wrangler deploy --dry-run
```

6. Deploy with existing secrets preserved:

```bash
npx wrangler deploy --keep-vars
```

7. After deployment, smoke-test Google Identity sign-in at the authorized production origin and confirm public responses disclose no private member data.

## Escalation

Pause the release if actual measurements approach a published allowance, a new feature needs a paid dependency, or Cloudflare's published terms differ from the assumptions above. Choose a smaller club-scale design or obtain an explicit product decision; do not silently add infrastructure.
