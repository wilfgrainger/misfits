# Manual D1 Migration Release Contract

This ops-only change removes the need for an authenticated local shell while preserving the migration-before-code safety boundary.

## Contract

- The D1 migration workflow is `workflow_dispatch` only. It never runs on push, pull request, merge, schedule or timer.
- The operator must provide the exact 40-character Git commit SHA containing the approved additive migration and type `APPLY-D1` before the migration job is eligible to run. Branch names are deliberately rejected so the reviewed migration source cannot move between approval and execution.
- The job targets the GitHub `production` environment so repository owners may add environment approval/protection rules without changing workflow code.
- The selected immutable SHA must pass install, Wrangler types, TypeScript, full tests and a production build before the remote database is touched.
- Cloudflare credentials come only from existing GitHub secrets.
- The workflow lists pending production migrations, then applies them directly through Wrangler inside the Actions-only workflow.
- The workflow immediately runs `PRAGMA quick_check` and lists non-SQLite schema objects for generic integrity and schema verification.
- The workflow never deploys Worker/application code. Production application deployment remains owned by the existing `main` deployment job after the feature PR is merged.
- Automatic remote D1 migration on push, pull request, merge, schedule or timer remains prohibited.

## Historical private-club release

PR #172 merged at `b7a5296665dbbe54eed6572e505ed02404731188`. Its additive migration `0006_private_club_membership.sql` was applied and verified through GitHub Actions run `32633942454`. The former `fd2f2bb0180d03828131bd700e48d5c6582cabff` handoff head and procedural checklist are pre-merge evidence, not a live release instruction. `PROGRESS.md` is the current release-status authority.
