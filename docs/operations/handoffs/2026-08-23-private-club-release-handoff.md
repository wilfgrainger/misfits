# Private Club Release Handoff

**Date:** 23 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Feature branch:** `feat/private-club-entry`  
**PR:** #172 `feat: make Misfits private and invite-approved`  
**Base:** `main`  
**Last fully verified feature code/ops head before migration evidence:** `b35c08e5a1c4f429405188e03fd860151e1f8019`  
**Last fully verified feature CI before migration evidence:** #813 GREEN  
**Production D1 migration approval:** RECEIVED  
**Production migration:** EXECUTED AND VERIFIED  
**Migration run:** `32633942454`  
**Migration evidence commit:** `5ada69d8c1b528c095046bbf112fffc956b03f25`  
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

## Production D1 migration 0006 is complete

The approved migration was executed through the repository's manual production D1 controller:

`https://github.com/wilfgrainger/misfits/actions/runs/32633942454`

Run facts verified from the actual GitHub Actions logs:

- event: `workflow_dispatch` from `main`;
- workflow conclusion: success;
- approved immutable migration SHA checked out exactly: `fd2f2bb0180d03828131bd700e48d5c6582cabff`;
- pre-migration gate passed Wrangler types, both TypeScript projects, 62/62 test files / 257/257 tests, production build and `git diff --check`;
- pending migrations before apply contained only `0006_private_club_membership.sql`;
- Wrangler applied `0006_private_club_membership.sql` successfully;
- remote `users.club_status` exists as `TEXT NOT NULL` with default `PENDING`;
- remote `club_invites` table exists;
- grouped club state is `APPROVED = 1`, `PENDING = 1`;
- grouped league visibility is `PRIVATE = 1`.

No raw invite token or production credential was copied into the repository evidence.

The durable evidence record is:

`docs/operations/evidence/2026-08-22-d1-migration-0006.md`

Migration 0006 is therefore no longer a release blocker.

## Production D1 authority: GitHub Actions

The controller used for migration 0006 came from PR #173 on `main`. PR #172 promotes that same workflow into the durable **Production D1 management** workflow for future production migrations. It remains manual-only, uses an immutable source SHA plus typed confirmation, lists pending migrations before and after apply, runs generic D1 health/schema checks, and never deploys application code.

There is no local production fallback. Authenticated local Wrangler must not be used to bypass the GitHub Actions production D1 path.

## Remaining release sequence

1. Wait for the fresh PR CI triggered by the migration-evidence/handoff documentation commits.
2. Re-fetch the newest exact PR head and require green CI on that exact SHA.
3. Confirm PR #172 remains mergeable and mark ready if still draft.
4. Merge PR #172 using the verified exact head.
5. Verify `main` CI and the existing Cloudflare Worker deploy complete successfully.
6. Smoke-test production health/auth/privacy behavior without exposing private club data.
7. Perform rendered mobile acceptance when browser tooling exists. If unavailable, record it as pending rather than inventing evidence.
8. Record merge SHA, deploy run and smoke/acceptance state in the durable release record.

## Guardrails that survive handoff

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs, background polling or another application runtime.
- Never edit an already-applied migration.
- Production D1 migration requires explicit approval and GitHub Actions `workflow_dispatch` through `.github/workflows/manual-d1-migration.yml`.
- Never use local Wrangler as a production migration alternative.
- Never trigger D1 migration automatically from push, PR, merge, schedule or timer.
- Preserve same-origin protection, admin/master-admin protections, auditability and competition invariants.
- No club data before Worker-verified `APPROVED` membership.
- Club approval never implies league participation.
- Keep the **33 parked functional stories** open until separately revalidated.

## Next release

After the private-club release is safely in production, return to the parked functional backlog. Do not silently fold those stories into this release.
