# Manual D1 Migration Release Contract

This ops-only change removes the need for an authenticated local shell while preserving the migration-before-code safety boundary.

## Contract

- The D1 migration workflow is `workflow_dispatch` only. It never runs on push, pull request, merge, schedule or timer.
- The operator must provide the exact repository ref containing the additive migration and type `APPLY-D1` before the migration job is eligible to run.
- The job targets the GitHub `production` environment so repository owners may add environment approval/protection rules without changing workflow code.
- The selected ref must pass install, Wrangler types, TypeScript, full tests and production build before the remote database is touched.
- Cloudflare credentials come only from existing GitHub secrets.
- The workflow applies pending D1 migrations using the repository's existing `db:migrate:remote` script.
- The workflow immediately verifies the permanent membership column, club-invite table, membership-state counts and league visibility.
- The workflow never deploys Worker/application code. Production application deployment remains owned by the existing `main` deployment job after the feature PR is merged.
- Automatic remote D1 migration on push/merge remains prohibited.

## Current private-club release

For PR #172, use migration ref `feat/private-club-entry` only after its full PR gate is green and the production migration has explicit user approval. That approval has already been recorded in the feature branch handoff. After migration verification succeeds, record the output on PR #172, merge PR #172, and let the existing `main` workflow deploy the Worker.
