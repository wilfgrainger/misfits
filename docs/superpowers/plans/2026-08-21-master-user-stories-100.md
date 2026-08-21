# Misfits 501 150-Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver and verify the canonical 150-story Misfits 501 functional backlog in `docs/superpowers/specs/2026-08-21-user-stories.md` without weakening the one-club, DartCounter-as-scorer, Google-authenticated, Cloudflare-free-tier architecture.

**Architecture:** Normalize competition state around explicit `seasons`, season-scoped `leagues`, season+league memberships, persisted generated `fixtures`, and fixture-settling `matches`. Preserve the existing Worker authorization/session/audit boundaries and adapt current APIs/UI incrementally so historic data remains valid. Promotion/relegation produces reviewed next-season memberships rather than mutating history.

**Tech Stack:** TypeScript, React 19, Hono, Cloudflare Worker, D1, Vitest, Vite, Google Identity Services.

**Spec:** `docs/superpowers/specs/2026-08-21-user-stories.md`

## Global Constraints

- Misfits 501 remains one private club, not multi-tenant or white-label.
- DartCounter remains the live scoring surface; this application records and settles competition data.
- Google Identity Services remains the sole sign-in method.
- Core runtime remains one Worker, static assets and one D1 database; no paid dependency, queue, R2, Durable Object, scheduled job or background polling.
- D1 migrations are additive only. Existing applied migrations are never edited.
- Every protected mutation is authorized by the Worker and keeps same-origin checks.
- Every material admin mutation remains auditable.
- A story is marked DELIVERED only with implementation plus focused test evidence; CI/build evidence is recorded at epic/final gates.
- Production deployment is a final release gate after the complete PR is verified and merged; intermediate story commits are not deployed individually.

---

### Task 1: Competition schema and compatibility layer

**Files:**
- Create: `migrations/0004_seasons_fixtures_promotion.sql`
- Create: `src/server/domain/competition.ts`
- Create: `src/server/db/competition.ts`
- Modify: `src/server/db/leagues.ts`
- Test: `tests/domain/competition.test.ts`
- Test: `tests/server/schema.test.ts`

**Interfaces:**
- Produces `SeasonRecord`, `CompetitionLeagueRecord`, `FixtureRecord`, `PromotionProposal`, `generateRoundRobinFixtures(players, repeats)` and season/fixture persistence helpers used by later tasks.
- Existing league ids remain usable; migration backfills one season per existing `season_name` and connects existing leagues to it.

- [ ] Write failing domain tests for round-robin count, no self-pairing, deterministic rounds, repeat meetings and promotion-zone calculation.
- [ ] Add additive schema for seasons, `leagues.season_id`, hierarchy/promotion fields, fixture table, result fixture linkage and migration-safe indexes.
- [ ] Implement pure competition domain functions until domain tests pass.
- [ ] Implement D1 read/write compatibility helpers and backfill assumptions.
- [ ] Run focused domain/schema tests in CI and record evidence.

### Task 2: Season and league administration APIs

**Files:**
- Create: `src/server/routes/competition.ts`
- Modify: `src/server/index.ts`
- Modify: `src/server/routes/admin-leagues.ts`
- Modify: `src/server/domain/league.ts`
- Test: `tests/server/competition-routes.test.ts`

**Interfaces:**
- Admin season CRUD-lite endpoints: list/create/update state/delete-empty.
- Season league endpoints: list/create/update/order/delete-empty.
- API returns explicit `seasonId`, hierarchy position and promotion/relegation configuration.

- [ ] Write failing route tests for authorization, create/edit/open/close, empty-delete guards and hierarchy updates.
- [ ] Implement minimal season/league route handlers with same-origin/admin guards.
- [ ] Add destructive-change guards when fixtures/results exist.
- [ ] Run focused tests, then full typecheck/build CI gate.

### Task 3: League membership and season-aware invites

**Files:**
- Modify: `src/server/db/leagues.ts`
- Modify: `src/server/db/invites.ts`
- Modify: `src/server/routes/admin-leagues.ts`
- Modify: `src/server/routes/auth.ts`
- Test: `tests/server/competition-membership.test.ts`

**Interfaces:**
- Membership uniqueness is season-aware; active competing placement is unique per user/season.
- Invites resolve to exact season+league and remain idempotent/capacity-safe.

- [ ] Write failing tests for assign/move/unassigned list, duplicate-placement rejection, capacity races, targeted invite join and historical membership preservation.
- [ ] Implement assignment/move/deactivate/reactivate helpers and protected move guard once fixtures exist.
- [ ] Update invite join flow to return season+league context.
- [ ] Run focused tests and full server test suite.

### Task 4: Fixture generation engine and APIs

**Files:**
- Modify: `src/server/db/competition.ts`
- Modify: `src/server/routes/competition.ts`
- Test: `tests/server/fixtures.test.ts`

**Interfaces:**
- `previewFixtures(leagueId)` returns deterministic candidate fixtures without mutation.
- `commitFixtures(leagueId)` is idempotent and persists stable fixture ids.
- Fixture states: `OUTSTANDING | PENDING_CONFIRMATION | CONFIRMED | DISPUTED | VOID`.

- [ ] Write failing tests for 8/10/12-player counts, odd-player byes, repeat meetings, duplicate commit prevention and invalid roster blocking.
- [ ] Implement preview and persistence helpers.
- [ ] Implement admin fixture list/filter/void/restore/regenerate-before-play routes.
- [ ] Verify no regeneration after protected results exist.
- [ ] Run focused tests and build.

### Task 5: Fixture-based result settlement

**Files:**
- Modify: `src/server/db/results.ts`
- Modify: `src/server/routes/results.ts`
- Modify: `src/server/routes/admin-leagues.ts`
- Test: `tests/server/fixture-results.test.ts`

**Interfaces:**
- Player submission accepts `fixtureId` plus score/averages; opponent is derived from fixture.
- Confirmation/dispute changes fixture state transactionally with result state.
- Admin correction/delete returns fixture to the correct state and standings are recomputed from confirmed results.

- [ ] Write failing tests for participant authorization, duplicate fixture settlement, self-confirm rejection, confirmed-only standings and delete/correction reversal.
- [ ] Implement fixture-result validation and state transitions.
- [ ] Preserve legacy result reads while making fixture linkage authoritative for new league play.
- [ ] Run focused and existing result tests; improve compatibility until both pass.

### Task 6: Promotion, relegation and next-season placement

**Files:**
- Modify: `src/server/domain/competition.ts`
- Modify: `src/server/db/competition.ts`
- Modify: `src/server/routes/competition.ts`
- Test: `tests/server/promotion.test.ts`

**Interfaces:**
- Projection uses current standings and configured adjacent hierarchy.
- Final proposal requires closed season and no unresolved result state.
- Admin-approved application creates new-season memberships idempotently; optional overrides are auditable.

- [ ] Write failing tests for top/bottom zones, highest/lowest division zero movement, unresolved tie blocking, override, idempotent apply and history preservation.
- [ ] Implement projection/proposal/apply domain and persistence logic.
- [ ] Implement admin preview/override/apply routes.
- [ ] Run focused tests and full server suite.

### Task 7: Client API contracts

**Files:**
- Modify: `src/client/api.ts`
- Test: `tests/client/api.test.ts`

**Interfaces:**
- Add `SeasonSummary`, expanded `LeagueSummary`, `FixtureSummary`, `PromotionProjection`, membership placement/admin health models.
- Add season, league structure, memberships, fixture and promotion API methods.

- [ ] Add failing client contract tests for every new endpoint shape.
- [ ] Implement typed API methods and backward-compatible parsing where needed.
- [ ] Run client API tests and typecheck.

### Task 8: Administrator experience

**Files:**
- Modify: `src/client/components/AdminLeagueDesk.tsx`
- Create: `src/client/components/AdminCompetitionDesk.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/admin-competition.test.tsx`

**Interfaces:**
- Admin navigation becomes Season / Leagues / Members & invites / Fixtures / Results / Promotion / Club access.
- Supports season creation/state, league structure/order/rules, player assignment/move, fixture preview/commit, fixture health, promotion proposal/apply.

- [ ] Write failing UI tests for each admin workflow and accessibility contract.
- [ ] Implement task-oriented panels without weakening current result/invite/account operations.
- [ ] Ensure 320px/390px/mobile and deliberate desktop rail semantics remain supported.
- [ ] Run focused UI tests, client suite, typecheck and build.

### Task 9: Player fixture-first experience

**Files:**
- Modify: `src/client/components/PlayerLeague.tsx`
- Create: `src/client/components/FixtureList.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/player-fixtures.test.tsx`

**Interfaces:**
- Player navigation: Table / Fixtures / Results / Players / Profile.
- Result entry starts from an outstanding fixture; submitted pending and disputed fixtures remain visible.

- [ ] Write failing UI tests for season+league context, fixture filters, outstanding entry, submitted pending, opponent review, dispute and history state.
- [ ] Replace arbitrary opponent result form with fixture-context result form while preserving score/average validation.
- [ ] Add played/remaining and league progress indicators.
- [ ] Run focused tests and full client suite.

### Task 10: Public season/league view

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/LeagueTabs.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/public-competition.test.tsx`

**Interfaces:**
- Public context selects public season then league; private resources remain unavailable.
- Public standings/results remain confirmed-only; public fixtures are exposed only for PUBLIC leagues.

- [ ] Write failing tests for public selection, direct links, private non-disclosure and optional public fixtures.
- [ ] Implement the minimum UI/API integration.
- [ ] Run public/client tests, accessibility contracts and build.

### Task 11: Canonical story delivery ledger

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Create: `tests/release/user-story-ledger.test.ts`

**Interfaces:**
- Every ADM/PLY/PUB story receives delivery status and evidence references.
- Ledger test fails if any story is missing an evidence marker or remains `MISSING`, `PARTIAL`, `GATED` or `CURRENT/PARTIAL` at release-ready state.

- [ ] Add `Delivery` and `Evidence` information to every story while preserving the story/acceptance/state format.
- [ ] Add release test that parses all 150 ids, requires uniqueness and requires `DELIVERED` for the release gate.
- [ ] Map focused test files/identifiers to every story or cohesive story group.
- [ ] Run ledger test and fix every uncovered story rather than weakening the parser.

### Task 12: Full verification, review and PR

**Files:**
- Modify as findings require.
- Update: `PROGRESS.md`

- [ ] Run `npm run typecheck` in CI.
- [ ] Run `npm test` in CI and require zero failures.
- [ ] Run `npm run build` in CI.
- [ ] Run Wrangler types/dry-run where the workflow/environment permits.
- [ ] Review diff against all 150 stories and competition invariants.
- [ ] Apply Superpowers verification-before-completion.
- [ ] Apply Cave Pony simplicity/security review where available and action findings.
- [ ] Open one PR from `feat/master-user-stories-100` to `main` with story counts and verification evidence.
- [ ] Do not claim production deployment until the required additive remote D1 migration is applied and the merged-main deployment is observed successfully.
