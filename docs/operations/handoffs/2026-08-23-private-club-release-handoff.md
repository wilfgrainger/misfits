# Private Club Release Handoff

**Date:** 23 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Feature branch:** `feat/private-club-entry`  
**PR:** #172 `feat: make Misfits private and invite-approved`  
**Base:** `main`  
**Last fully verified feature handoff SHA before this refresh:** `fd2f2bb0180d03828131bd700e48d5c6582cabff`  
**Last fully verified feature CI:** #800  
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

Application code checkpoint `ad0e16a45a1fccda466c52285700a2b7317e85f1` passed CI #797:

- Wrangler types GREEN;
- TypeScript client + Worker GREEN;
- Impeccable `[]` findings;
- Vitest **62/62 files, 257/257 tests** GREEN;
- production Vite build GREEN;
- deploy skipped on PR.

The later documentation/handoff head `fd2f2bb0180d03828131bd700e48d5c6582cabff` passed full CI #800. No application code or migration SQL changed between these two checkpoints.

## Old CI investigation is closed

Do not reopen it unless a new failure gives new evidence. The earlier red period combined deliberate TDD RED tests, stale old-contract tests, a Vitest rejected-Promise harness issue, and one genuine zero-league admin navigation gap. All are resolved.

Do not weaken membership guards, `isParticipant`, or the four-tab navigation to accommodate old assumptions.

## The remaining production boundary

The user has explicitly approved migration:

`migrations/0006_private_club_membership.sql`

It is still **not applied remotely**.

### New preferred path: manual GitHub Actions migration

An independent ops change has already reached `main`:

- PR #173: `ops: add manual production D1 migration gate`;
- main merge SHA: `c58718b11cb89e0b04d62c0d11965ede5ba77ee4`;
- workflow: `.github/workflows/manual-d1-migration.yml`;
- RED evidence: CI #801 failed exactly because the workflow did not yet exist;
- GREEN evidence: CI #805 passed after implementation.

This workflow is deliberately **manual only**. It never runs from push, pull request, merge, schedule or timer, and it contains no Worker deploy command.

For this release, invoke it from GitHub Actions on `main` with:

```text
migration_sha = fd2f2bb0180d03828131bd700e48d5c6582cabff
confirmation  = APPLY-D1
```

Why the SHA is fixed:

- it is an immutable feature commit already fully verified by CI #800;
- the workflow rejects branch names/moving refs;
- it runs the full code gate again on that exact SHA before touching production D1.

The workflow then lists pending migrations, applies the repository's existing `npm run db:migrate:remote`, and runs the required remote verification queries.

### Cloudflare token caveat

The existing GitHub secrets are already sufficient for Worker deployment, but their exact API-token permission scope is not inspectable from this chat. D1 administration requires D1 write/edit capability. If the token lacks it, the workflow should fail safely at the first D1 remote command before migration.

If that happens:

1. do not merge #172;
2. do not create a broad/global Cloudflare credential;
3. adjust only the minimum Cloudflare token permission needed for D1 administration, following the explicit secret/permission approval rules;
4. rerun the same immutable migration SHA.

### Local fallback

If necessary, an authenticated local checkout may still run:

```bash
npm ci
npm run db:migrate:remote
```

The GitHub workflow is preferred because it provides durable logs and immutable-source verification.

## Required D1 verification

Whether GitHub Actions or local Wrangler is used, verify:

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
3. Because evidence/docs will change the head, require fresh green CI on that exact head.
4. Resolve any merge-base drift from the ops change on `main` without changing the approved application contract.
5. Confirm PR #172 is mergeable and mark ready if still draft.
6. Merge PR #172 only after remote migration verification is clean.
7. Verify `main` CI and the existing Cloudflare Worker deploy complete successfully.
8. Smoke-test production health/auth/privacy behavior without exposing private club data.
9. Perform rendered mobile acceptance when browser tooling exists. If unavailable, record it as pending.
10. Update `PROGRESS.md` with migration run, merge SHA, deployment run and acceptance state.

## Guardrails that survive handoff

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs, background polling or another application runtime.
- Never edit an already-applied migration.
- Remote D1 migration requires explicit approval and may use the manual workflow or authenticated local Wrangler.
- Never trigger D1 migration automatically from push, PR, merge, schedule or timer.
- Do not merge/deploy code reading `club_status` before migration 0006 succeeds remotely.
- Preserve same-origin protection, admin/master-admin protections, auditability and competition invariants.
- No club data before Worker-verified `APPROVED` membership.
- Club approval never implies league participation.
- Keep the **33 parked functional stories** open until separately revalidated.

## Next release

After the private-club release is safely in production, return to the parked functional backlog. Do not silently fold those stories into this release.
