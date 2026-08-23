# Private Club Release Handoff

**Date:** 23 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Feature branch:** `feat/private-club-entry`  
**PR:** #172 `feat: make Misfits private and invite-approved`  
**Base:** `main`  
**Last fully verified feature handoff SHA before ops-policy refresh:** `b35c08e5a1c4f429405188e03fd860151e1f8019`  
**Last fully verified feature CI:** #813 GREEN  
**Production D1 migration approval:** RECEIVED  
**Production migration:** NOT YET EXECUTED  
**PR #172 merged/deployed:** NO

## Start here

Read in this order:

1. `AGENTS.md`
2. `PROGRESS.md`
3. this handoff
4. `docs/operations/evidence/2026-08-22-d1-migration-0006.md`
5. `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`
6. `docs/superpowers/plans/2026-08-22-private-club-entry.md`
7. `DESIGN.md`

Do not reconstruct product truth from old public-site tests or historical UI behavior when these authorities disagree.

## Release implementation is complete

Tasks 1–7 are implemented and verified. The contract is:

- anonymous visitors see no league, season, member, player, standings or result data;
- unknown Google identities require a valid club invite before account creation;
- invited new users become `PENDING` only;
- admins permanently approve/reject club membership;
- `users.club_status` is permanent club-membership authority;
- `club_invites` is club-admission invite authority;
- `league_players` stays independent season/league participation authority;
- approved unassigned members may browse but cannot record;
- pending/rejected members remain outside club-data surfaces;
- primary member navigation is exactly `League · Record · Results · More`;
- fixture selection lives inside Record;
- More contains Players, Profile, Admin for admins, and Sign out;
- zero-league approved admins can reach More → Admin and create the first league;
- normal interaction accent is Misfits red;
- green is positive semantic state only;
- legacy league self-enrolment/invite runtime is retired;
- dead client `joinInvite()` and retired invite DB runtime are removed;
- existing Worker + static assets + D1 remains the runtime architecture.

## Verification already established

Application code checkpoint `ad0e16a45a1fccda466c52285700a2b7317e85f1` passed CI #797 with Wrangler types, both TypeScript projects, Impeccable zero findings, 62/62 test files and 257/257 tests, production Vite build, and no PR deploy.

The earlier handoff head `fd2f2bb0180d03828131bd700e48d5c6582cabff` passed full CI #800.

The D1-management durability change used fresh TDD:

- RED commit `13296817e0ef5af3e5345e54de9de0d18369bce2`, CI #812: exactly the new management-workflow contract failed;
- GREEN commit `b35c08e5a1c4f429405188e03fd860151e1f8019`, CI #813: 63/63 test files, 258/258 tests, Wrangler types, TypeScript, Impeccable and production build all passed; deploy skipped on PR.

## Old CI investigation is closed

Do not reopen it unless a new failure gives new evidence. The earlier red period combined deliberate TDD RED tests, stale old-contract tests, a Vitest rejected-Promise harness issue, and one genuine zero-league admin navigation gap. All are resolved.

Do not weaken membership guards, `isParticipant`, or the four-tab navigation to accommodate old assumptions.

## The remaining production boundary

The user has explicitly approved:

`migrations/0006_private_club_membership.sql`

It is still **not applied remotely**.

### Production D1 authority: GitHub Actions

The controller needed for migration 0006 is already on `main`:

- PR #173: `ops: add manual production D1 migration gate`;
- main merge SHA: `c58718b11cb89e0b04d62c0d11965ede5ba77ee4`;
- workflow: `.github/workflows/manual-d1-migration.yml`;
- current main display name: `Manual production D1 migration`;
- RED evidence: CI #801;
- GREEN evidence: CI #805.

For this release, invoke it from GitHub Actions on `main` with:

```text
migration_sha = fd2f2bb0180d03828131bd700e48d5c6582cabff
confirmation  = APPLY-D1
```

The fixed SHA is intentional: it is immutable, already verified by CI #800, and the workflow reruns the full gate on that exact source before touching production D1.

PR #172 promotes the same file into the durable **Production D1 management** workflow for future production migrations. It remains manual-only, lists pending migrations before and after apply, runs generic D1 health/schema checks, and never deploys application code.

There is no local production fallback. Authenticated local Wrangler must not be used to bypass the GitHub Actions production D1 path.

### Cloudflare token caveat

The existing GitHub secrets support Worker deployment, but their exact API-token permission scope cannot be inspected here. If D1 write/edit permission is absent, the workflow should fail safely at its first remote D1 command.

If that happens:

1. do not merge #172;
2. do not create a broad/global Cloudflare credential;
3. adjust only the minimum permission needed for D1 administration under the repository's secret/permission rules;
4. rerun the same immutable migration SHA through GitHub Actions.

## Required D1 verification

The current-main workflow automatically verifies migration 0006 with:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Confirm:

- `users.club_status` exists;
- `club_invites` exists;
- existing admins/master admin and active league members were backfilled consistently with the migration design;
- grouped status counts are plausible;
- existing leagues are PRIVATE;
- logs/evidence contain no secrets or raw invite tokens.

Write the real run ID/link and non-secret output summary to:

`docs/operations/evidence/2026-08-22-d1-migration-0006.md`

## After migration succeeds

1. Update the migration evidence document with actual results.
2. Re-fetch PR #172 and its current head.
3. Require fresh green CI on that exact head after the evidence update.
4. Confirm PR #172 is mergeable and mark ready if still draft.
5. Merge PR #172 only after remote migration verification is clean.
6. Verify `main` CI and the existing Cloudflare Worker deploy complete successfully.
7. Smoke-test production health/auth/privacy behavior without exposing private club data.
8. Perform rendered mobile acceptance when browser tooling exists. If unavailable, record it as pending.
9. Update `PROGRESS.md` with migration run, merge SHA, deployment run and acceptance state.

## Guardrails that survive handoff

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs, background polling or another application runtime.
- Never edit an already-applied migration.
- Production D1 migration requires explicit approval and GitHub Actions `workflow_dispatch` through `.github/workflows/manual-d1-migration.yml`.
- Never use local Wrangler as a production migration alternative.
- Never trigger D1 migration automatically from push, PR, merge, schedule or timer.
- Do not merge/deploy code reading `club_status` before migration 0006 succeeds remotely.
- Preserve same-origin protection, admin/master-admin protections, auditability and competition invariants.
- No club data before Worker-verified `APPROVED` membership.
- Club approval never implies league participation.
- Keep the **33 parked functional stories** open until separately revalidated.

## Next release

After the private-club release is safely in production, return to the parked functional backlog. Do not silently fold those stories into this release.
