# Misfits 501 Progress

**Updated:** 23 August 2026  
**Current branch:** `feat/private-club-entry`  
**PR:** #172 `feat: make Misfits private and invite-approved`  
**Current focus:** Run the approved manual production D1 migration, capture evidence, then merge/deploy PR #172  
**Private-club implementation:** Tasks 1–7 COMPLETE  
**Last fully verified feature head before this handoff refresh:** `fd2f2bb0180d03828131bd700e48d5c6582cabff`  
**Last fully verified feature CI:** #800 GREEN  
**Production migration approval:** RECEIVED from user on 23 August 2026  
**Production migration:** NOT YET EXECUTED  
**PR #172 merged/deployed:** NO  

## Restart here

A local or connected agent taking over should read, in order:

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

## Private-club implementation evidence

The final application-code checkpoint was `ad0e16a45a1fccda466c52285700a2b7317e85f1` with CI #797:

- Wrangler types GREEN;
- client + Worker TypeScript GREEN;
- Impeccable source detector GREEN with zero findings;
- Vitest **62/62 files, 257/257 tests** GREEN;
- Vite production build GREEN;
- deploy skipped on PR, as intended.

The later handoff/documentation head `fd2f2bb0180d03828131bd700e48d5c6582cabff` also passed full CI #800. No application code or migration SQL changed between those checkpoints.

## CI blocker investigation is closed

Do not reopen the old red-CI diagnosis without new failing evidence. It was resolved as a combination of:

- deliberate RED Task 5 tests;
- stale tests describing the retired public/admin/navigation contract;
- Vitest 4 unhandled-rejection noise from pre-created rejected Promises;
- one genuine zero-league admin navigation gap.

The stale tests and harness issue were corrected without weakening the product contract. The zero-league admin gap was fixed and covered. Do not weaken membership guards, `isParticipant`, or the four-tab navigation to satisfy historical assumptions.

## Production D1 migration 0006

Migration:

`migrations/0006_private_club_membership.sql`

It adds:

- `users.club_status` with `PENDING / APPROVED / REJECTED`;
- `club_invites` with hashed invite-token authority;
- deterministic approval backfill for existing admins/master admin/active league players;
- PRIVATE visibility for existing leagues.

The user has explicitly approved this production migration. It is still **NOT EXECUTED**.

### Preferred execution path: GitHub Actions

An ops-only migration controller was added independently and is now on `main`:

- ops PR: #173 `ops: add manual production D1 migration gate`;
- merged main SHA: `c58718b11cb89e0b04d62c0d11965ede5ba77ee4`;
- workflow: `.github/workflows/manual-d1-migration.yml`;
- ops TDD RED: CI #801 failed exactly because the workflow file was absent;
- ops GREEN: CI #805 passed the full current-main gate after implementation.

The workflow is **manual `workflow_dispatch` only**. It cannot run from push, PR, merge, schedule or timer. It requires:

```text
migration_sha = fd2f2bb0180d03828131bd700e48d5c6582cabff
confirmation  = APPLY-D1
```

The immutable SHA is intentional. Do not replace it with a branch name for this release.

The workflow then:

1. validates the confirmation and 40-character SHA;
2. checks out that exact feature SHA;
3. runs `npm ci`, Wrangler types, TypeScript, full Vitest, production build and `git diff --check`;
4. checks the existing Cloudflare GitHub secrets are present;
5. lists pending remote D1 migrations;
6. runs `npm run db:migrate:remote`;
7. verifies the production D1 schema/state;
8. **does not deploy Worker/application code**.

Normal application deployment remains owned by the existing `main` deployment job after PR #172 is merged.

### Cloudflare token caveat

The existing `CLOUDFLARE_API_TOKEN` is known to support Worker deployment, but its exact permission scope cannot be inspected here. The migration workflow requires D1 administration permission. If the token lacks D1 Edit, the workflow should fail safely at the first remote D1 command. Do not broaden or rotate credentials silently; follow the secret/permission approval rules in `AGENTS.md`.

### Local fallback

If GitHub Actions cannot be used, an authenticated local Wrangler session may still execute:

```bash
npm ci
npm run db:migrate:remote
```

The GitHub Actions path is preferred because it gives durable, auditable execution logs and immutable-source verification.

## Required post-migration verification

The migration workflow executes these checks automatically; a local fallback must run the same queries:

```sql
PRAGMA table_info(users);
SELECT name FROM sqlite_master WHERE type='table' AND name='club_invites';
SELECT club_status, COUNT(*) FROM users GROUP BY club_status;
SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility;
```

Verify:

- `users.club_status` exists;
- `club_invites` exists;
- the club-status distribution is plausible under the approved backfill;
- existing leagues are PRIVATE;
- no secret, credential or raw invite token is recorded.

Capture the actual execution/run details and non-secret output in:

`docs/operations/evidence/2026-08-22-d1-migration-0006.md`

## Exact next sequence

1. In GitHub Actions, open **Manual production D1 migration** on `main`.
2. Run it with exact `migration_sha` `fd2f2bb0180d03828131bd700e48d5c6582cabff` and confirmation `APPLY-D1`.
3. If it fails before migration because of Cloudflare token permissions, stop and address only the minimum required D1 permission. Do not merge #172.
4. If it succeeds, capture run ID/link plus the non-secret D1 verification output in the evidence document.
5. Re-fetch PR #172. If docs/evidence changed its head, require a fresh green PR CI on that exact head.
6. Resolve any merge-base drift from main without changing the approved application contract.
7. Mark PR #172 ready if still draft.
8. Merge PR #172 only after migration evidence is good and exact-head CI is green.
9. Verify the `main` CI and Cloudflare Worker deploy complete successfully.
10. Smoke-test production health/auth/privacy behavior without exposing private club data.
11. Perform rendered mobile acceptance when browser tooling is available; otherwise record it as pending rather than inventing evidence.
12. Update this file with migration run, merge SHA, deploy run and acceptance result.

## Current PR state note

At the start of this handoff refresh, PR #172 was still open, draft and unmerged. GitHub temporarily reported it non-mergeable after `main` moved for ops PR #173. The feature branch is being synchronized at the documentation/guardrail level; do not interpret mergeability as release approval. Migration evidence still comes first.

## Guardrails

- Cloudflare free tier only: existing Worker + static assets + D1.
- No KV, R2, Durable Objects, Queues, scheduled jobs, background polling or additional application runtime.
- Do not edit applied migrations.
- Remote D1 migration may run only after explicit approval, through the manual workflow or authenticated local Wrangler.
- Never trigger remote D1 migration automatically from push, pull request, merge, schedule or timer.
- Preserve same-origin protection, admin/master-admin protection, auditability and competition invariants.
- No private club data may be exposed before Worker-verified `APPROVED` membership.
- Club approval must never imply season/league participation.
- Keep all **33 parked functional stories** open until separately revalidated.
