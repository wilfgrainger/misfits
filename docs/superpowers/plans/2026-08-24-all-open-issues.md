# Misfits 501 Open-Issue Closure Plan

> **For the implementer:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` when splitting independent implementation tasks, and use `superpowers:verification-before-completion` before any completion or PR claim. Follow the repository's TDD rule for every behavior change.

**Goal:** Close all 26 currently open Misfits issues in one verified private-club workflow, without a schema migration or weakening server authorization.

**Architecture:** Keep the existing Hono + D1 + React architecture. Add season readiness and caller-scoped fixture/movement query functions beside the existing competition and league DB modules. Add explicit member/public routes. Extend the existing normalized API models and render the new states in `PlayerLeague`, `MemberApp`, `AdminCompetitionDeskV2`, and the app entry. Use CSS media queries for the desktop admin workbench. Preserve legacy result data and existing protected admin routes.

**Design record:** `docs/superpowers/specs/2026-08-24-all-open-issues-design.md`

## Phase 1: establish the change ledger and contract tests

### Task 1: record the approved scope and clean baseline

**Files:**
- Create: `docs/superpowers/specs/2026-08-24-all-open-issues-design.md`
- Create: `docs/superpowers/plans/2026-08-24-all-open-issues.md`
- Update: `PROGRESS.md` only when release/handoff truth changes

**Steps:**

1. Confirm worktree is `C:\Users\wilf6\dev\misfits\.worktrees\fix-open-issues` on `codex/fix-open-issues`, based on `origin/main`.
2. Preserve the unrelated dirty main worktree and do not edit or stage its untracked agent file.
3. Keep the design and this plan tracked before implementation.
4. Run the focused baseline already recorded: `npm test`, `npm run typecheck`, `npm run build`, `npx wrangler types`, `npx wrangler types --check`, Impeccable detector, and `git diff --check`.

### Task 2: add failing contract tests for the cross-cutting API shape

**Files:**
- Update: `tests/server/competition-membership.test.ts`
- Update: `tests/server/competition-routes.test.ts`
- Update: `tests/server/auth-routes.test.ts`
- Update: `tests/server/session.test.ts`
- Update: `tests/server/league-routes.test.ts`
- Update: `tests/client/api.test.ts`

**Steps:**

1. Add tests that expect the new health fields, member fixture routes, public fixture privacy, movement payload, and `ACCOUNT_SUSPENDED` `/api/me` response.
2. Run only the affected tests and observe the expected failures before changing production code:

   ```powershell
   ./node_modules/.bin/vitest run tests/server/competition-membership.test.ts tests/server/competition-routes.test.ts tests/server/auth-routes.test.ts tests/server/session.test.ts tests/server/league-routes.test.ts tests/client/api.test.ts
   ```

3. Keep fixture result test fixtures explicit so existing tests do not accidentally pass through missing fields.

## Phase 2: enforce whole-season placement integrity (#98)

### Task 3: implement season readiness as a server-owned invariant

**Files:**
- Update: `src/server/db/competition.ts`
- Update: `src/server/db/membership-baseline.ts`
- Update: `src/server/db/season-lifecycle.ts`
- Update: `src/server/db/promotion.ts`
- Update: `src/server/db/leagues.ts`

**Steps:**

1. Add typed readiness data containing `unassignedPlayers`, `invalidPlayers`, `duplicatePlacements`, and `readyForFixtures`.
2. Count only active approved club users as required placements. Count active placements outside that eligibility set as invalid. Count users with more than one active placement in the season as duplicates.
3. Reuse one readiness query/function from season health, fixture preview, and fixture commit.
4. Make `previewLeagueFixtures` reject any non-ready season before generating a selected league schedule; keep its selected-league active-member and minimum-two checks.
5. Make `commitLeagueFixtures` run the preview/readiness check before the existing-fixture return path.
6. Add club-status checks to `moveUserBetweenLeagues` and `setMembershipActive` reactivation. Preserve historical inactive rows but never create an ineligible active placement.
7. Make baseline copy reject or skip ineligible source rows with an explicit validation error rather than producing an incomplete draft. Make promotion source placement selection use active, eligible users and make apply reject an ineligible destination participant.
8. Make season-open validation require `ACTIVE` and `APPROVED` members.
9. Run the focused server tests and confirm the new tests pass while the baseline membership/lifecycle tests remain green.

### Task 4: expose readiness in the admin API and admin desk

**Files:**
- Update: `src/client/api.ts`
- Update: `src/client/components/AdminCompetitionDeskV2.tsx`
- Update: `tests/client/admin-competition.test.tsx`

**Steps:**

1. Normalize the new health fields with backwards-safe defaults.
2. Add a visible “Fixture generation blocked” panel when `readyForFixtures` is false, naming unassigned, invalid, and duplicate counts.
3. Disable commit until the selected season is ready; leave preview available so the admin can see the same server reason.
4. Refresh season health after assignments, moves, membership status changes, reset, and commit.
5. Run the focused admin component test and `git diff --check`.

## Phase 3: suspension state and desktop administration (#114, #105)

### Task 5: make suspended sessions understandable without reopening access

**Files:**
- Update: `src/server/auth/session.ts`
- Update: `src/server/routes/auth.ts`
- Update: `src/client/App.tsx`
- Update: `tests/server/session.test.ts`
- Update: `tests/server/auth-routes.test.ts`
- Update: `tests/client/private-club-entry.test.tsx`

**Steps:**

1. Add a request-status resolver that can identify a valid, unexpired suspended session without returning an authenticated `AuthUser` to protected middleware.
2. Make `/api/me` return the `ACCOUNT_SUSPENDED` 403 error for that status before `requireUser`; retain 401 for missing/expired/invalid sessions.
3. Add a privacy-safe `suspended` app state with contact-admin copy and sign out. Handle the same code from Google sign-in.
4. Assert a suspended user cannot access protected member/admin routes and that the client never requests club league data in the suspended state.
5. Run focused server and client tests.

### Task 6: give the admin a deliberate desktop control room

**Files:**
- Update: `src/client/components/AdminCompetitionDeskV2.tsx`
- Update: `src/client/styles.css`
- Update: `src/client/club-app.css`
- Update: `tests/client/admin-competition.test.tsx`
- Update: `tests/client/admin-touch-targets.test.ts`

**Steps:**

1. Add explicit desktop workbench/rail/content class names and a descriptive desktop heading while retaining the existing tablist roles and keyboard behavior.
2. At `min-width: 1024px`, render a two-column grid with a sticky rail, readable content max width, and multi-column admin form groups. Keep mobile layout stacked/scrollable with unchanged button semantics.
3. Add a client contract test for rail labels, selected tab, content panel, and desktop class hooks. Keep touch-target/static CSS tests green.
4. Run the Impeccable detector against `src/client`; correct any new high-confidence findings before continuing.

## Phase 4: fixture-first member workflow and scoring rules (#121, #131–#144)

### Task 7: extend league/fixture data with linked result summaries

**Files:**
- Update: `src/server/db/leagues.ts`
- Update: `src/server/db/competition.ts`
- Update: `src/server/routes/leagues.ts`
- Update: `src/server/routes/results.ts` only if route composition is required
- Update: `src/client/api.ts`
- Update: `tests/server/league-routes.test.ts`
- Update: `tests/server/fixtures.test.ts`
- Update: `tests/client/api.test.ts`

**Steps:**

1. Extend `LeagueRecord` queries with season/movement fields already present in D1.
2. Extend fixture selection with the active linked match's result status, scores, averages, submitter, confirmation timestamp, and dispute note.
3. Add `listMemberFixtures` and `listMyFixtures` helpers that first verify league membership scope in the route layer and filter personal rows in SQL.
4. Add member routes for all league fixtures and caller fixtures, preserving `Cache-Control: private, no-store`.
5. Add the anonymous public fixture route as a separate branch that only permits `visibility = 'PUBLIC'` and serializes safe fields.
6. Change `ApiClient.fixtures` to the member route, add `myFixtures` and `publicFixtures`, and normalize linked fields.
7. Run focused route/fixture/API tests and verify 403/404 privacy boundaries.

### Task 8: make the player workspace fixture-first

**Files:**
- Update: `src/client/components/PlayerLeague.tsx`
- Update: `src/client/components/MemberApp.tsx`
- Update: `src/client/scoring.ts`
- Update: `src/client/components/StandingsTable.tsx`
- Update: `src/client/club-app.css`
- Update: `src/client/member-experience.css`
- Update: `tests/client/player-app.test.tsx`
- Update: `tests/client/club-first-record.test.tsx`
- Update: `tests/client/player-scoring-rules.test.tsx`

**Steps:**

1. Load all member fixtures and the current user's fixtures through their scoped endpoints. Surface fixture-read errors; do not turn a 403 into an empty schedule.
2. Remove the normal player free-form opponent selector. Record renders a fixture picker or a clear “no fixtures published/outstanding” state, and submit always supplies `fixtureId`.
3. Add fixture counters for total, played, outstanding, pending confirmation, disputed, and void. Use persisted state rather than inferred result lists.
4. Render round/meeting identity, score/averages for completed fixtures, submitter/next action for pending, dispute note for disputed, and no-entry consequence for void.
5. Add a record action only on the caller's outstanding fixtures; completed/pending/disputed/void rows cannot be resubmitted.
6. Expand `leagueScoringSummary` with `first to`, matches per opponent, and points for win/draw/loss. Show it in embedded and full workspaces.
7. Run focused component tests, then full client tests.

## Phase 5: movement, history, and public fixtures (#127–#129, #155, #157–#160, #165)

### Task 9: add caller-scoped movement and visible placement state

**Files:**
- Update: `src/server/db/promotion.ts`
- Update: `src/server/routes/leagues.ts`
- Update: `src/client/api.ts`
- Update: `src/client/components/PlayerLeague.tsx`
- Update: `src/client/components/StandingsTable.tsx`
- Update: `src/client/components/MemberApp.tsx`
- Update: `src/client/club-app.css`
- Update: `tests/server/promotion.test.ts`
- Update: `tests/server/league-routes.test.ts`
- Update: `tests/client/player-app.test.tsx`

**Steps:**

1. Add a DB helper that computes the current league's season projection but serializes only the caller's source placement, caller movement, target names, and safe boundary flags.
2. Add `GET /api/me/leagues/:leagueId/movement` behind approved-member authentication. Return `PENDING` when no target placement has been approved/applied, `PROJECTED` for provisional movement, and `CONFIRMED` for an applied movement.
3. Add movement zone labels to the standings surface using league promotion/relegation places. Add provisional language and a tie-boundary warning when the caller is at an ambiguous boundary.
4. Show confirmed next-season destination with target season and league. Show “Next-season placement pending” without inventing a destination.
5. Assert the endpoint cannot expose another player's movement or work for a non-member/suspended caller.
6. Run focused movement and UI tests.

### Task 10: separate current competitions from historical seasons

**Files:**
- Update: `src/client/components/MemberApp.tsx`
- Update: `src/client/member-experience.css`
- Update: `tests/client/member-navigation.test.tsx`

**Steps:**

1. Group `clubLeagues` by `seasonName`/status and render current/open competitions separately from “Past seasons”.
2. Label archive rows and keep the selected league's own season name in the workspace heading.
3. Ensure the historical workspace uses the selected league id for standings, results, fixtures, and movement; no current league data is reused.
4. Run navigation tests and confirm existing member entry behavior remains private.

### Task 11: wire the public league fixture view safely

**Files:**
- Create: `src/client/components/PublicLeague.tsx`
- Update: `src/client/App.tsx`
- Update: `src/client/api.ts`
- Update: `src/client/styles.css`
- Update: `src/client/mobile-experience.css`
- Update: `tests/client/public-app-ux.test.tsx`
- Update: `tests/server/league-routes.test.ts`

**Steps:**

1. Use `publicLeagueKey` to detect `/league/:slug` before authenticated club bootstrap.
2. Render a public shell that requests the league and public fixtures only. Show league name, season, rules, schedule states, and confirmed score/averages; never render account ids, emails, submitter, pending notes, or private leagues.
3. Show a clear “This league is not public”/not found state and a link back to private member sign-in when the route is unavailable.
4. Keep the signed-out private deep-link test green for a private league-shaped route by making the public API response the deciding authority.
5. Run focused public client/server tests.

## Phase 6: documentation, full verification, and handoff

### Task 12: reconcile progress and release evidence

**Files:**
- Update: `PROGRESS.md`
- Update: `docs/operations/2026-08-24-issue-and-release-status.md` only if its claims are changed by this branch

**Steps:**

1. Record the implemented issue slices, exact local commit SHA, and remaining proof boundaries. Do not claim deployment or live browser acceptance from local tests.
2. Add no issue-closing language until the branch is reviewed and the target deployment is observed.

### Task 13: run the complete verification gate

Run each command freshly from the isolated worktree and retain the output:

```powershell
npm test
npm run typecheck
npm run build
npx wrangler types --check
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
git diff --check
```

Also inspect `git status --short`, `git diff --stat`, and the final issue-to-test mapping. If any gate fails, use `superpowers:systematic-debugging` before changing code and rerun the affected test first.

### Task 14: commit and protected-branch handoff

1. Stage only the isolated worktree's intended files; never stage unrelated main-worktree files.
2. Create coherent commits with test evidence in the messages.
3. Push `codex/fix-open-issues` and create a PR against `main` if remote access is available.
4. Report the exact commit/PR, local verification, and separate deployment/live-observation status. Do not self-merge around branch protection or close issues without the required approving review.
