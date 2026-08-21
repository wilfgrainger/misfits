# Misfits 501 Progress

**Updated:** 21 August 2026, 16:58 BST  
**Current branch:** `feat/master-user-stories-100`  
**Pull request:** `#9` — `feat: deliver master Misfits 501 user-story backlog` — **DRAFT**  
**Base:** `main` at `8f5e7d712c332944b5b73fc58f51d9df199f964c`

## Authority

- Product truth: `PRODUCT.md`.
- Strategic/platform guardrail: `VISION.md`.
- UI authority: `DESIGN.md` and the repo-local Impeccable skill.
- Canonical functional backlog: `docs/superpowers/specs/2026-08-21-user-stories.md` — **150 stories: 88 Admin, 55 Player, 7 Public**.
- Active implementation plan: `docs/superpowers/plans/2026-08-21-master-user-stories-100.md`.
- Delivery authority: Superpowers. Simplicity/review gate: Cave Pony.

## Current delivery goal

Deliver **100% of the canonical 150-story backlog** through one draft PR, using story/epic-level TDD and preserving the one-club architecture:

`Season → League → League Membership → persisted Fixture → Result settlement → Standings → Promotion/Relegation → Next Season`

The PR must remain draft until all 150 stories have implementation + evidence and the release ledger test proves none remain `MISSING`, `PARTIAL`, `GATED`, or `CURRENT/PARTIAL`.

## Non-negotiable boundaries

- Misfits 501 remains one club, not white-label or multi-tenant.
- DartCounter remains the live scorer; Misfits records and settles club competition data.
- Google Identity Services remains the only sign-in method.
- Core runtime remains one Cloudflare Worker, static assets and one D1 database.
- No paid Cloudflare service, queue, R2, Durable Object, scheduled job or background polling.
- D1 migrations are additive only. Never edit already-applied migrations.
- Worker-side auth, authorization, same-origin mutation checks, privacy and audit requirements remain intact.
- Production deploy occurs only after the complete PR is verified, required remote additive migration is manually applied, and the merged `main` deployment is observed.

## Execution status

### Task 0 — Branch, PR and plan — COMPLETE

- Created branch `feat/master-user-stories-100` from `main`.
- Opened draft PR **#9**.
- Added Superpowers implementation plan: `docs/superpowers/plans/2026-08-21-master-user-stories-100.md`.
- PR completion gate explicitly requires 88/88 Admin + 55/55 Player + 7/7 Public stories delivered with evidence.

### Task 1 — Competition schema/domain spine — IN PROGRESS

#### Red evidence

Commit `8971e846cadde0d5a26525b4125ae844cbecbfac` added `tests/domain/competition.test.ts` before the implementation existed.

GitHub Actions run `32500303728` failed at `npm test` exactly as expected:

- existing suite: **127 tests passed**;
- new competition suite: failed to import missing `src/server/domain/competition`;
- build was skipped after the deliberate red failure.

This is the recorded TDD RED checkpoint.

#### Green implementation added

- `src/server/domain/competition.ts`
  - `SeasonStatus` / `FixtureStatus`;
  - season validation;
  - deterministic circle-method round-robin generation;
  - odd-player bye handling;
  - repeated-meeting numbering;
  - no-self-pairing / unique-player validation;
  - promotion/relegation zone calculation;
  - promotion movement calculation helpers.
- `migrations/0004_seasons_fixtures_promotion.sql`
  - additive `seasons` table;
  - backfill from current `leagues.season_name`;
  - `leagues.season_id`, hierarchy, promotion/relegation settings;
  - season-aware `league_players` mapping + active uniqueness index;
  - persisted `fixtures` with round, meeting number and lifecycle state;
  - optional `matches.fixture_id` + one-active-result-per-fixture uniqueness;
  - `season_movements` audit/history structure.
- `src/server/db/competition.ts`
  - season persistence helpers;
  - season league reads;
  - explicit league membership assignment/movement helpers;
  - unassigned-player query;
  - fixture preview/commit/list/status/reset helpers;
  - season health query.
- `tests/server/schema.test.ts` extended to verify migration 0004 remains additive and contains the required competition structures.

#### Green evidence

Latest checkpoint commit: `9091d31625c1051d6f8e9fe2ea8494e9cb1df35c`.

GitHub Actions run `32500530742`: **SUCCESS**.

Verified steps:

- `npm ci` — success;
- `npx wrangler types` — success;
- `npm run typecheck` — success;
- `npm test` — success;
- `npm run build` — success;
- production deploy — correctly **skipped** because this is not `main`.

### Story ledger status

No story is being prematurely marked `DELIVERED` merely because the domain/schema foundation exists. Story-level status in `docs/superpowers/specs/2026-08-21-user-stories.md` changes only when the full acceptance behaviour for that story is implemented and evidenced.

Task 1 currently establishes prerequisites/invariants for stories including season identity, league hierarchy, explicit season+league membership, persisted fixtures and promotion/relegation, but API/UI acceptance is still unfinished.

## Exact next actions

1. Finish Task 1 by adding focused persistence/schema integration coverage where D1 test harness allows it.
2. Task 2: implement season + season-scoped league administration APIs with failing route tests first.
3. Task 3: implement season-aware membership assignment/move and invite join behaviour with red/green tests.
4. Task 4: expose fixture preview/commit/list/void/regeneration APIs and prove fixture counts/idempotency.
5. Task 5: convert normal result submission from arbitrary opponent selection to fixture settlement while preserving legacy reads during migration.
6. Task 6: implement projection/review/override/apply promotion and relegation flow.
7. Tasks 7–10: typed client API, Admin UI, Player fixture-first UI, Public league/fixture view.
8. Task 11: update every story in `2026-08-21-user-stories.md` with `DELIVERED` + evidence and add a release parser test that requires exactly 150 unique delivered stories.
9. Task 12: full verification, Superpowers completion review, Cave Pony review, PR readiness, manual remote D1 migration, merge, observe production deployment and smoke-test production.

## Resume instructions for a new agent

If this session dies, do **not** restart discovery from scratch.

1. Checkout/read branch `feat/master-user-stories-100` and PR #9.
2. Read in this order:
   - `AGENTS.md`
   - `PRODUCT.md`
   - `VISION.md`
   - `docs/superpowers/specs/2026-08-21-user-stories.md`
   - `docs/superpowers/plans/2026-08-21-master-user-stories-100.md`
   - this `PROGRESS.md`
3. Use Superpowers `executing-plans` + TDD + verification-before-completion.
4. Start at **Task 2 unless Task 1 has acquired a new failing CI checkpoint after this update**.
5. Never mark stories complete from inference. Require implementation and test evidence.
6. Keep this file updated after every meaningful red/green/CI checkpoint.
7. Keep `docs/superpowers/specs/2026-08-21-user-stories.md` updated at story level whenever a story moves to `DELIVERED`.

## Known operational constraint

This chat environment could not clone GitHub into the local container because external GitHub DNS/network access failed. GitHub repository tools and GitHub Actions are therefore being used as the isolated execution/verification environment. Do not claim local command evidence that was not actually run.
