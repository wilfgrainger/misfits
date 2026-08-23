# Manual D1 Migration Release Contract

This ops-only change removes the need for an authenticated local shell while preserving the migration-before-code safety boundary.

## Contract

- The D1 migration workflow is `workflow_dispatch` only. It never runs on push, pull request, merge, schedule or timer.
- The operator must provide the exact 40-character Git commit SHA containing the approved additive migration and type `APPLY-D1` before the migration job is eligible to run. Branch names are deliberately rejected so the reviewed migration source cannot move between approval and execution.
- The job targets the GitHub `production` environment so repository owners may add environment approval/protection rules without changing workflow code.
- The selected immutable SHA must pass install, Wrangler types, TypeScript, full tests, production build and `git diff --check` before the remote database is touched.
- Cloudflare credentials come only from existing GitHub secrets.
- The workflow lists pending production migrations, then applies them using the repository's existing `db:migrate:remote` script.
- The workflow immediately verifies the permanent membership column, club-invite table, membership-state counts and league visibility.
- The workflow never deploys Worker/application code. Production application deployment remains owned by the existing `main` deployment job after the feature PR is merged.
- Automatic remote D1 migration on push, pull request, merge, schedule or timer remains prohibited.

## Current private-club release

For PR #172, the current handoff head is `fd2f2bb0180d03828131bd700e48d5c6582cabff`. Use that exact SHA only after PR #172's full gate remains green and production migration approval is still valid. That approval has already been recorded in the feature-branch handoff.

After migration verification succeeds:

1. capture the workflow output in `docs/operations/evidence/2026-08-22-d1-migration-0006.md` on PR #172;
2. re-run/refetch the PR gate if that evidence commit changes the head;
3. merge PR #172;
4. let the existing `main` workflow deploy the Worker;
5. perform the production privacy/auth smoke check.
