# Misfits 501 Progress

**Updated:** 23 August 2026  
**Current branch:** `feat/private-club-entry`  
**PR:** #172 `feat: make Misfits private and invite-approved`  
**Current focus:** Fresh exact-head CI after recording verified migration 0006 evidence, then ready → merge → deploy → live smoke  
**Private-club implementation:** Tasks 1–7 COMPLETE  
**Last fully verified code/ops head:** `b35c08e5a1c4f429405188e03fd860151e1f8019`  
**Last fully verified CI before migration evidence:** #813 GREEN  
**Production migration approval:** RECEIVED from user on 23 August 2026  
**Production migration:** EXECUTED AND VERIFIED via GitHub Actions run `32633942454`  
**Migration evidence commit:** `5ada69d8c1b528c095046bbf112fffc956b03f25`  
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

The production migration workflow itself reran the approved immutable migration source `fd2f2bb0180d03828131bd700e48d5c6582cabff` before touching D1 and passed Wrangler types, TypeScript, 62/62 test files / 257/257 tests, production build and `git diff --check`.

The documentation-only migration-evidence checkpoint now requires one final exact-head PR CI before merge. Do not claim that gate until it runs on the newest branch head.

## Production D1 migration 0006

Migration:

`migrations/0006_private_club_membership.sql`

**Status: EXECUTED AND VERIFIED.**

GitHub Actions run:

`https://github.com/wilfgrainger/misfits/actions/runs/32633942454`

Verified facts from the actual production run:

- workflow event was manual `workflow_dispatch` from `main`;
- approved migration SHA checked out exactly: `fd2f2bb0180d03828131bd700e48d5c6582cabff`;
- only pending migration before apply was `0006_private_club_membership.sql`;
- Wrangler applied migration 0006 successfully;
- `users.club_status` exists as `TEXT NOT NULL` with default `PENDING`;
- `club_invites` exists;
- grouped membership state is `APPROVED = 1`, `PENDING = 1`;
- grouped league visibility is `PRIVATE = 1`;
- no raw invite token or production credential was recorded in repo evidence.

Durable non-secret evidence is in:

`docs/operations/evidence/2026-08-22-d1-migration-0006.md`

## Production D1 authority: GitHub Actions only

The controller used for migration 0006 is already on `main` from ops PR #173. PR #172 upgrades the same workflow into the durable **Production D1 management** job for future production D1 migrations:

- manual `workflow_dispatch` only;
- immutable source SHA plus typed confirmation;
- one existing Worker/D1 architecture only;
- pending migrations listed before and after apply;
- generic `PRAGMA quick_check` and schema inspection after apply;
- no arbitrary SQL input;
- no automatic push/PR/merge/schedule trigger;
- no Worker deploy command.

There is no local production migration fallback. Authenticated local Wrangler is for development/non-production use only and must not bypass this GitHub Actions path.

## Current release gate

Migration 0006 is no longer the blocker. The remaining gate is a **fresh green CI run on the newest exact PR head containing the recorded production evidence**.

After that green run:

1. Re-fetch PR #172 and confirm mergeability/head SHA.
2. Mark ready if still draft.
3. Merge PR #172 using the verified exact head.
4. Verify the new `main` CI and Cloudflare Worker deployment.
5. Smoke-test production health/auth/privacy behavior without exposing private club data.
6. Perform rendered mobile acceptance when browser tooling is available; otherwise record it as pending rather than inventing evidence.
7. Record merge/deploy/smoke evidence in the durable release handoff.

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
