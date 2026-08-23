# Misfits 501 Progress

**Updated:** 23 August 2026  
**Current branch:** `feat/private-club-entry`  
**PR:** #172 `feat: make Misfits private and invite-approved`  
**Current focus:** Dispatch approved production D1 migration 0006 through GitHub Actions, capture evidence, then merge/deploy PR #172  
**Private-club implementation:** Tasks 1–7 COMPLETE  
**Last fully verified code/ops head:** `b35c08e5a1c4f429405188e03fd860151e1f8019`  
**Last fully verified CI:** #813 GREEN  
**Current branch head after policy/handoff docs:** `a146ce249bacda8d9624b17db6aabfc0e7c1c07e` plus this checkpoint commit  
**Production migration approval:** RECEIVED from user on 23 August 2026  
**Production migration:** NOT YET EXECUTED  
**PR #172 merged/deployed:** NO  

## Restart here

Read, in order:

1. `AGENTS.md`
2. this `PROGRESS.md`
3. `docs/operations/handoffs/2026-08-23-private-club-release-handoff.md`
4. `docs/operations/evidence/2026-08-22-d1-migration-0006.md`
5. `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`
6. `docs/superpowers/plans/2026-08-22-private-club-entry.md`
7. `DESIGN.md`

**Execution-state authority:** this file plus the dated handoff. The implementation plan is historical delivery structure; unchecked boxes there do not mean Tasks 1–7 are unfinished.

## What is complete

The approved private-club release contract is implemented:

- anonymous users see no league, season, member, player, standings or result data;
- unknown Google identities require a valid club invite before account creation;
- invited new users become `PENDING`, never automatic league participants;
- admins permanently `APPROVE` or `REJECT` club membership;
- `users.club_status` is permanent club-membership authority;
- `club_invites` is admission-invite authority;
- `league_players` remains independent season/league participation authority;
- approved but unassigned members may browse private club competition data but cannot record results;
- pending/rejected members remain outside all club-data surfaces;
- primary member navigation is exactly `League · Record · Results · More`;
- fixture selection lives inside Record;
- More contains Players, Profile, Admin for admins, and Sign out;
- zero-league approved admins can still reach More → Admin and create the first league;
- normal interaction accent is Misfits red; green is semantic positive state only;
- legacy player self-enrolment and league-scoped invite runtime paths are retired;
- dead client `joinInvite()` and retired server invite DB runtime are removed;
- no additional Cloudflare service, application runtime, router or state framework was introduced.

## Verification evidence

Application code checkpoint `ad0e16a45a1fccda466c52285700a2b7317e85f1` passed CI #797 with Wrangler types, both TypeScript projects, Impeccable zero findings, 62/62 test files and 257/257 tests, production Vite build, and PR deploy skipped.

The earlier feature handoff `fd2f2bb0180d03828131bd700e48d5c6582cabff` passed CI #800.

The durable D1-management update used RED → GREEN TDD:

- RED commit `13296817e0ef5af3e5345e54de9de0d18369bce2`, CI #812: exactly the new production D1 management contract failed; 62 existing test files / 257 tests remained green; deploy skipped.
- GREEN commit `b35c08e5a1c4f429405188e03fd860151e1f8019`, CI #813: Wrangler types, both TypeScript projects, Impeccable, **63/63 test files and 258/258 tests**, production build all GREEN; deploy skipped.

The current documentation-only policy/handoff commits still require one final exact-head CI before merge. Do not claim that gate until it runs.

## Production D1 migration 0006

Migration:

`migrations/0006_private_club_membership.sql`

It adds:

- `users.club_status` with `PENDING / APPROVED / REJECTED`;
- `club_invites` with hashed invite-token authority;
- deterministic approval backfill for existing admins/master admin/active league players;
- PRIVATE visibility for existing leagues.

The user has explicitly approved this production migration. It is still **NOT EXECUTED**.

## Production D1 authority: GitHub Actions only

The controller required for migration 0006 is already on `main`:

- ops PR #173 `ops: add manual production D1 migration gate`;
- main SHA `c58718b11cb89e0b04d62c0d11965ede5ba77ee4`;
- workflow `.github/workflows/manual-d1-migration.yml`;
- current main display name `Manual production D1 migration`;
- ops RED CI #801;
- ops GREEN CI #805.

For migration 0006, run it on `main` with:

```text
migration_sha = fd2f2bb0180d03828131bd700e48d5c6582cabff
confirmation  = APPLY-D1
```

It validates the request, checks out the immutable SHA, runs the full code gate, checks Cloudflare credentials, lists pending D1 migrations, applies `npm run db:migrate:remote`, verifies the migration-specific production state, and never deploys Worker/application code.

PR #172 upgrades the same workflow into the durable **Production D1 management** job for all future production D1 migrations:

- still manual `workflow_dispatch` only;
- immutable source SHA plus typed confirmation;
- one existing Worker/D1 architecture only;
- pending migrations listed before and after apply;
- generic `PRAGMA quick_check` and schema inspection after apply;
- no arbitrary SQL input;
- no automatic push/PR/merge/schedule trigger;
- no Worker deploy command.

There is no local production migration fallback. Authenticated local Wrangler is for development/non-production use only and must not bypass this GitHub Actions path.

## Current execution blocker

The GitHub connection available in the current ChatGPT session can read/write repository content, inspect Actions, review PRs and merge, but it does not expose GitHub's `workflow_dispatch` operation. That tool limitation is **not** a reason to add a weaker trigger or bypass the production D1 gate.

Therefore migration 0006 remains pending until the existing manual workflow is dispatched from GitHub Actions by an authorized workflow dispatcher. Once dispatched, the run can be inspected and the remaining release can continue from its evidence.

## Required migration-0006 verification

The current-main workflow runs:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Verify:

- `users.club_status` exists;
- `club_invites` exists;
- club-status grouped counts are plausible under the approved backfill;
- existing leagues are PRIVATE;
- no secret, credential or raw invite token is recorded.

Capture the actual run and non-secret output in:

`docs/operations/evidence/2026-08-22-d1-migration-0006.md`

## Exact next sequence

1. In GitHub Actions on `main`, run **Manual production D1 migration** with exact SHA `fd2f2bb0180d03828131bd700e48d5c6582cabff` and confirmation `APPLY-D1`.
2. If it fails before migration because of Cloudflare token permissions, stop and address only the minimum required D1 permission. Do not merge #172.
3. If it succeeds, capture run ID/link and non-secret D1 verification output in the evidence document.
4. Require fresh green PR CI on the resulting exact PR head.
5. Confirm PR #172 is mergeable and mark ready if still draft.
6. Merge PR #172 only after migration evidence is good and exact-head CI is green.
7. Verify the `main` CI and Cloudflare Worker deploy complete successfully.
8. Smoke-test production health/auth/privacy behavior without exposing private club data.
9. Perform rendered mobile acceptance when browser tooling is available; otherwise record it as pending rather than inventing evidence.
10. Update this file with migration run, merge SHA, deploy run and acceptance result.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs, background polling or additional application runtime.
- Do not edit applied migrations.
- Production D1 mutation requires explicit approval and the GitHub Actions production D1 management workflow.
- Never use local Wrangler as a production migration alternative.
- Never trigger remote D1 migration automatically from push, pull request, merge, schedule or timer.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before Worker-verified `APPROVED` membership.
- Club approval must never imply season/league participation.
- Keep all **33 parked functional stories** open until separately revalidated.
