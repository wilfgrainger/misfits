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
4. For a D1 migration, verify it is additive, then dispatch the manual **Production D1 management** workflow with the immutable migration commit SHA and `APPLY-D1` before code that depends on it is merged.
5. Run:

```bash
npm run typecheck
npm test
npm run build
npx wrangler types
npx wrangler deploy --dry-run
```

6. After the PR verification gate and any required D1-management run are green, merge to `main`. CI deploys with dashboard-managed variables preserved; do not run a production deploy from a local shell.

7. After CI reports the deployment complete, smoke-test Google Identity sign-in at the authorized production origin and confirm public responses disclose no private member data.

## Automatic main-branch deployment

`.github/workflows/ci.yml` deploys the Worker after a push to `main` only when its verification job has passed. This includes the push GitHub creates when a pull request is merged. The workflow uses the official [`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action) and runs `wrangler deploy --keep-vars` against the production `wrangler.jsonc` configuration.

Configure these GitHub Actions repository secrets before relying on the merge path:

- `CLOUDFLARE_API_TOKEN`: narrowly scoped to deploy Workers in the target Cloudflare account.
- `CLOUDFLARE_ACCOUNT_ID`: the account containing the `darts-501` Worker and `misfits` D1 database.

The deployment workflow intentionally does not run `wrangler d1 migrations apply --remote`. The manual D1-management workflow applies and verifies an additive migration before dependent code is merged; this keeps schema rollout explicit and prevents a code deployment from racing an unreviewed database mutation. A missing deployment secret fails the deploy job with an explicit error rather than silently leaving production unchanged.

## Escalation

Pause the release if actual measurements approach a published allowance, a new feature needs a paid dependency, or Cloudflare's published terms differ from the assumptions above. Choose a smaller club-scale design or obtain an explicit product decision; do not silently add infrastructure.
