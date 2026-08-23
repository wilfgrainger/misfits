# Private Club Release Handoff

**Date:** 23 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Branch:** `feat/private-club-entry`  
**Draft PR:** #172 `feat: make Misfits private and invite-approved`  
**Base:** `main`  
**Last fully verified code SHA:** `ad0e16a45a1fccda466c52285700a2b7317e85f1`  
**Last fully verified CI:** #797  
**Production D1 migration approval:** RECEIVED from user  
**Production migration:** NOT YET EXECUTED  
**PR merged/deployed:** NO

## Start here

A local agent taking over this release should read, in order:

1. `AGENTS.md`
2. `PROGRESS.md`
3. `docs/superpowers/specs/2026-08-22-private-club-entry-design.md`
4. `docs/superpowers/plans/2026-08-22-private-club-entry.md`
5. `DESIGN.md`
6. this handoff
7. `docs/operations/evidence/2026-08-22-d1-migration-0006.md`

Do not reconstruct product decisions from old tests or historical public-site behavior when these authorities disagree with them.

## What is complete

Tasks 1–7 of the private-club release are implemented.

The implemented contract is:

- anonymous visitors see no league, season, player, standings or result data;
- unknown Google identities require a valid club invite before an account can be created;
- invited new users become `PENDING` only;
- admins permanently `APPROVE` or `REJECT` club membership;
- `users.club_status` is permanent club-membership authority;
- `club_invites` is club-admission invite authority;
- `league_players` remains independent season/league participation authority;
- approved unassigned members may browse private club competition data but cannot record results;
- pending/rejected users remain outside the club app;
- primary member navigation is exactly `League · Record · Results · More`;
- fixture selection lives inside Record;
- More contains Players, Profile, Admin for admins, and Sign out;
- zero-league approved admins can still reach More → Admin and create the first league;
- normal interaction accent is Misfits red;
- green is positive semantic state only;
- legacy player self-enrolment and league-scoped invite runtime paths are retired;
- dead client `joinInvite()` and retired server invite DB runtime are removed;
- no new Cloudflare service, router, state framework or runtime was introduced.

## Final verified gate

CI #797 passed on code SHA `ad0e16a45a1fccda466c52285700a2b7317e85f1`:

- `npm ci` GREEN;
- `npx wrangler types` GREEN;
- TypeScript client + Worker GREEN;
- repo-local Impeccable source detector GREEN with `[]` findings;
- Vitest **62/62 files, 257/257 tests** GREEN;
- production Vite build GREEN;
- Worker deploy skipped on PR, as intended.

The PR was still open, draft, mergeable and unmerged at that checkpoint.

## CI blocker diagnosis already resolved

Do not reopen the old CI investigation unless a new failure supplies new evidence.

The earlier red period combined:

1. deliberately introduced RED Task 5 tests;
2. stale tests asserting the retired `Season admin / Club table` UI and old Fixtures navigation;
3. a Vitest 4 harness issue where already-rejected Promises created in `beforeEach` were reported as unhandled even though private-entry assertions passed;
4. one real application gap where a zero-league admin had no route to Admin.

The harness issue was fixed by creating rejection Promises lazily when the mocked API method is consumed. The stale tests were rewritten to the approved product contract. The zero-league admin product gap was fixed and covered by tests.

Do not weaken `isParticipant`, private membership guards or the four-tab navigation to accommodate old test assumptions.

## The one remaining production boundary

The user explicitly approved applying migration `migrations/0006_private_club_membership.sql` and proceeding with the production gate.

The migration is still not applied remotely.

From an authenticated local checkout of `feat/private-club-entry`:

```bash
npm ci
npm run db:migrate:remote
```

The repository command expands to:

```bash
wrangler d1 migrations apply misfits --remote
```

Do not merge PR #172 before this succeeds.

## Required remote verification

After migration, execute against the production `misfits` D1 database:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Verify specifically:

- `users.club_status` exists;
- `club_invites` exists;
- existing admins/master admin and active league players were backfilled to `APPROVED` as designed;
- no unexpected club-status distribution is present;
- existing leagues are `PRIVATE`;
- no secret, Google credential or raw invite token appears in captured evidence.

Record the real command/output summary in `docs/operations/evidence/2026-08-22-d1-migration-0006.md`.

## After migration succeeds

1. Update the migration evidence document with actual results.
2. Run the full repository gate if anything except evidence/docs changed.
3. Ensure PR #172 still points at the expected head and is mergeable.
4. Mark the PR ready for review if still draft.
5. Merge PR #172 to `main` only after the remote schema verification is good.
6. Verify the main CI/deploy workflow completes successfully.
7. Smoke-test production health/auth/privacy behavior.
8. Perform rendered mobile acceptance if browser tooling is available. If it is not, record that screenshot/manual pixel acceptance remains pending rather than inventing evidence.
9. Update `PROGRESS.md` with migration evidence, merge SHA, deployment run and production acceptance result.

## Full repository gate

Use the plan-authority gate when a fresh local verification is needed:

```bash
npx wrangler types
./node_modules/.bin/tsc -p tsconfig.client.json --noEmit
./node_modules/.bin/tsc -p tsconfig.worker.json --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
git diff --check
```

The GitHub PR CI also runs the repo-local Impeccable detector.

## Guardrails that must survive handoff

- Cloudflare free tier only: existing Worker + static assets + D1.
- Do not add KV, R2, Durable Objects, Queues, scheduled jobs or additional runtime for this release.
- Do not edit previously applied migrations.
- Do not automate remote D1 migration into ordinary CI merely to avoid the manual production gate.
- Do not merge/deploy code reading `club_status` before migration 0006 has succeeded remotely.
- Preserve same-origin protection, admin/master-admin protections, auditability and competition invariants.
- No private club data may be exposed before Worker-verified `APPROVED` membership.
- Club approval must never imply league participation.
- Keep the 33 parked functional stories open until separately revalidated.

## Next release after this one

Once this private-club release is safely in production, return to the parked functional backlog rather than silently absorbing it into this release. `PROGRESS.md` remains the restart authority for the exact next functional priority.
