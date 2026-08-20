# Misfits Leagues v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the working Misfits Google-authenticated app into a mobile-first multi-league platform where admins configure leagues and invites, players manage simple profiles and record only their own results with per-player averages, and standings derive from confirmed games.

**Architecture:** Keep the existing single Cloudflare Worker, Hono API, React/Vite SPA and D1 database. Add a non-destructive D1 migration, framework-independent league/result/profile/invite domain modules, league-scoped API routes, and compact mobile views inside the existing Misfits app shell. Preserve the official Google Identity Services button, server-side credential verification and opaque session cookies.

**Tech Stack:** TypeScript, React 19, Vite, Hono, Cloudflare D1, Wrangler, Vitest, Testing Library, Google Identity Services.

**Spec:** `docs/superpowers/specs/2026-08-20-misfits-leagues-v2-design.md`

## Global Constraints

- Google remains the only login method; do not add passwords, magic links or local credentials.
- A normal player result mutation must prove the session user is one of the two players in the result.
- Only `CONFIRMED` results contribute to standings.
- Every write route enforces the existing same-origin protection and every admin route enforces server-side `ADMIN` authorization.
- Store session and invite token hashes only; never store raw tokens in D1 or source control.
- Preserve the supplied `public/brand/misfits-501.jpg` asset and the current mobile app shell.
- Do not stage `.codex-remote-attachments/` or `.playwright-cli/`.
- Use prepared D1 statements and stable `AppError` JSON responses.
- Each task ends with focused tests before moving to the next task.

---

## File Map

Create the following focused modules:

- `migrations/0002_leagues_profiles_invites.sql` - additive D1 schema for profile fields, league configuration, invite hashes and result averages.
- `src/server/domain/profile.ts` - nickname/profile-link normalization and validation.
- `src/server/domain/league.ts` - league payload validation, slug normalization and capacity/repeat rules.
- `src/server/domain/result.ts` - score/average validation, canonical player pairs and result input types.
- `src/server/domain/standings.ts` - pure confirmed-result aggregation and deterministic ordering.
- `src/server/db/profile.ts` - user profile reads and self-owned updates.
- `src/server/db/leagues.ts` - public/admin league reads, creation, edits, membership and invite-facing queries.
- `src/server/db/invites.ts` - token hashing, creation, validation, joining and revocation.
- `src/server/db/results.ts` - player result workflow, admin result mutations and standings inputs.
- `src/server/routes/leagues.ts` - public and authenticated league/membership/result routes.
- `src/server/routes/profile.ts` - authenticated profile routes.
- `src/server/routes/admin-leagues.ts` - league, invite, membership and admin result routes.
- `src/client/components/LeagueTabs.tsx` - mobile league navigation and scoped content.
- `src/client/components/ProfilePanel.tsx` - profile display and editor.
- `src/client/components/PlayerLeague.tsx` - player league dashboard, result form and confirmations.
- `src/client/components/AdminLeagueDesk.tsx` - admin league editor, invite action, members and result queue.

Modify the following existing boundaries:

- `migrations/0001_initial.sql` only if a compatibility constraint requires it; prefer the new migration so existing D1 rows remain intact.
- `src/server/auth/google.ts` to carry the verified Google `picture` claim.
- `src/server/db/users.ts` to persist the picture and stop onboarding from assuming a single league.
- `src/server/db/admin.ts` to remove the hard-coded `misfits-501` membership join.
- `src/server/routes/auth.ts` and `src/server/routes/admin.ts` to return profile data and mount generalized route modules.
- `src/server/index.ts` to mount public, player and admin league routes.
- `src/server/errors.ts` to add stable invite, capacity, league, profile and result-conflict codes.
- `src/client/api.ts` to expose typed league, profile, invite, result and admin calls.
- `src/client/App.tsx` to retain auth/onboarding while delegating signed-in screens to focused components.
- `src/client/styles.css` to style league tabs, forms, result rows, invite controls, avatars and admin panels at mobile-first widths.
- `tests/server/schema.test.ts`, `tests/server/auth-routes.test.ts`, `tests/server/admin-routes.test.ts` and client tests to preserve existing behavior while adding the new contracts.

---

### Task 1: Lock the data model and pure domain rules

**Files:**
- Create: `migrations/0002_leagues_profiles_invites.sql`
- Create: `src/server/domain/profile.ts`
- Create: `src/server/domain/league.ts`
- Create: `src/server/domain/result.ts`
- Create: `src/server/domain/standings.ts`
- Modify: `src/server/errors.ts`
- Test: `tests/domain/profile.test.ts`, `tests/domain/league.test.ts`, `tests/domain/result.test.ts`, `tests/domain/standings.test.ts`, `tests/server/schema.test.ts`

**Interfaces:**
- `validateProfileInput(input: { username?: unknown; dartsCounterUrl?: unknown }): { ok: true; value: { username: string; dartsCounterUrl: string | null } } | { ok: false; reason: string }`
- `validateLeagueInput(input: unknown, mode: 'create' | 'edit'): LeagueInput`
- `validatePlayerResult(input: unknown, targetLegs: number): ResultInput`
- `canonicalPair(playerAId: string, playerBId: string): readonly [string, string]`
- `calculateStandings(players: StandingPlayerInput[], matches: ConfirmedMatchInput[], pointsPerWin: number): StandingRow[]`

- [ ] **Step 1: Write failing domain tests** for nickname trimming, HTTPS profile links, league capacity/repeat limits, decisive scores, average rounding/range, canonical pairs, confirmed-only standings and tie-breaking.
- [ ] **Step 2: Run focused tests and verify they fail** with missing module/function errors.
- [ ] **Step 3: Add the additive migration.** Add `profile_image_url` and `darts_counter_url` to `users`; add `created_by`, `max_players` and `matches_per_pair` to `leagues`; add `player_a_average`, `player_b_average` and `deleted_at` to `matches`; create `league_invites` with a unique token hash, expiry, usage and revocation fields; add indices for invite lookup and pair/result queries. Backfill the existing league with `max_players = 32`, `matches_per_pair = 1`, and its current admin as `created_by` when available without deleting or rewriting users.
- [ ] **Step 4: Implement the pure validation and standings modules** with no D1 or Hono imports. Round averages to two decimals, reject NaN/infinity/out-of-range values, accept only decisive results where the winner reaches `targetLegs`, and aggregate only non-deleted confirmed results.
- [ ] **Step 5: Run the focused domain and migration tests** and verify they pass.
- [ ] **Step 6: Run `npm run typecheck`** and fix only type errors introduced by these modules.
- [ ] **Step 7: Commit** with `git add migrations/0002_leagues_profiles_invites.sql src/server/domain src/server/errors.ts tests/domain tests/server/schema.test.ts` and `git commit -m "feat: add league and result domain model"`.

### Task 2: Implement profiles and generalize Google onboarding

**Files:**
- Modify: `src/server/auth/google.ts`, `src/server/db/users.ts`, `src/server/routes/auth.ts`, `src/server/index.ts`
- Create: `src/server/db/profile.ts`, `src/server/routes/profile.ts`
- Test: `tests/server/profile-routes.test.ts`, `tests/server/auth-routes.test.ts`, `tests/server/google.test.ts`

**Interfaces:**
- Extend `GoogleIdentity` with `picture?: string` and retain verified `sub`, email and email verification checks.
- `getProfile(db: D1Database, userId: string): Promise<ProfileRecord | null>`
- `updateProfile(db: D1Database, userId: string, input: ProfileInput, now: Date): Promise<UserRecord>`
- `createProfileRoutes(): Hono<AuthAppEnv>` with `GET /api/me/profile` and same-origin `PATCH /api/me/profile`.

- [ ] **Step 1: Add failing tests** proving a verified Google picture is persisted, a user can read/update only their own profile, invalid links are rejected, and existing username onboarding no longer inserts a hard-coded `misfits-501` membership.
- [ ] **Step 2: Run the focused server tests** and confirm the new expectations fail.
- [ ] **Step 3: Extend Google identity verification** to accept the optional verified `picture` claim and persist it only from the verified token. Keep the current official GIS credential route and bootstrap-admin behavior unchanged.
- [ ] **Step 4: Implement profile DB/route functions** using the existing username validation and profile domain module. Return public-safe user summaries with picture and Darts Counter URL, never Google subject or email from public league routes.
- [ ] **Step 5: Update auth payloads** so `/api/me`, `/api/auth/google` and username onboarding return the profile fields needed by the app and no longer auto-join a fixed league.
- [ ] **Step 6: Run auth, Google and profile tests plus `npm run typecheck`** and verify the existing 29-test baseline remains green with the new tests.
- [ ] **Step 7: Commit** with `git add src/server/auth/google.ts src/server/db/users.ts src/server/db/profile.ts src/server/routes/auth.ts src/server/routes/profile.ts src/server/index.ts tests/server` and `git commit -m "feat: add Google-backed player profiles"`.

### Task 3: Build league, membership and invite services

**Files:**
- Create: `src/server/db/leagues.ts`, `src/server/db/invites.ts`, `src/server/routes/leagues.ts`
- Create: `src/server/routes/admin-leagues.ts`
- Modify: `src/server/db/admin.ts`, `src/server/routes/admin.ts`, `src/server/index.ts`
- Test: `tests/server/league-routes.test.ts`, `tests/server/invite-routes.test.ts`, `tests/server/admin-league-routes.test.ts`

**Interfaces:**
- `listPublicLeagues(db): Promise<PublicLeagueSummary[]>`
- `getLeagueByIdOrSlug(db, key): Promise<LeagueRecord | null>`
- `createLeague(db, actorUserId, input, now): Promise<LeagueRecord>`
- `updateLeague(db, actorUserId, leagueId, input, now): Promise<LeagueRecord>`
- `createInvite(db, actorUserId, leagueId, now): Promise<{ invite: InviteRecord; token: string }>`
- `joinLeagueByInvite(db, userId, token, now): Promise<MembershipRecord>`
- `revokeInvite(db, actorUserId, inviteId, now): Promise<void>`

- [ ] **Step 1: Write failing route tests** for public league scoping, admin create/edit authorization, slug uniqueness, capacity, invite creation without raw-token persistence, valid join, expired/revoked invite, idempotent rejoin and full-league rejection.
- [ ] **Step 2: Run the route tests** and confirm they fail before route modules exist.
- [ ] **Step 3: Implement league DB functions** for multiple league rows, public-safe summaries, active memberships and admin audit events. Remove `misfits-501` assumptions from admin player listings.
- [ ] **Step 4: Implement invite generation and joining** with 32 random bytes, SHA-256 token hashing, URL-safe raw token return, and transactional capacity/member checks. Joining must require an active session user with a nickname and must not reveal whether an unrelated token exists beyond the safe error response.
- [ ] **Step 5: Mount public/player/admin league routes** with exact same-origin and role guards. Add `GET /api/me/leagues`, `POST /api/invites/:token/join`, public league reads, admin league CRUD, admin invite create/revoke and member list/update.
- [ ] **Step 6: Run focused route tests, `npm run typecheck` and local D1 migration** using `npm run db:migrate:local`; verify the seeded league remains available and migration is additive.
- [ ] **Step 7: Commit** with `git add src/server/db/leagues.ts src/server/db/invites.ts src/server/routes/leagues.ts src/server/routes/admin-leagues.ts src/server/db/admin.ts src/server/routes/admin.ts src/server/index.ts tests/server` and `git commit -m "feat: add multi-league membership and invites"`.

### Task 4: Implement result submission, confirmation and standings API

**Files:**
- Create: `src/server/db/results.ts`
- Modify: `src/server/routes/leagues.ts`, `src/server/routes/admin-leagues.ts`, `src/server/index.ts`
- Test: `tests/server/result-routes.test.ts`, `tests/server/standings-routes.test.ts`

**Interfaces:**
- `submitPlayerResult(db, sessionUserId, leagueId, input, now): Promise<ResultRecord>`
- `confirmResult(db, userId, resultId, now): Promise<ResultRecord>`
- `disputeResult(db, userId, resultId, note, now): Promise<ResultRecord>`
- `createAdminResult(db, adminUserId, leagueId, input, now): Promise<ResultRecord>`
- `updateAdminResult(db, adminUserId, resultId, input, now): Promise<ResultRecord>`
- `deleteAdminResult(db, adminUserId, resultId, now): Promise<void>`
- `getLeagueStandings(db, leagueId): Promise<StandingRow[]>`

- [ ] **Step 1: Write failing API tests** for self-involved submissions, rejection of results between two other players, active membership, closed leagues, pair repeat limits, averages, opponent-only confirmation/dispute, confirmed-only standings, admin correction/deletion and audit events.
- [ ] **Step 2: Run the focused tests** and confirm they fail.
- [ ] **Step 3: Implement player submission** with a transaction or D1 batch that reads league config/membership, canonicalizes pair order, counts non-deleted pair results, validates scores/averages and inserts `PENDING`.
- [ ] **Step 4: Implement confirmation/dispute transitions** so only the opposing active member may resolve a player submission and resolved rows cannot be resolved twice. Preserve dispute notes and timestamps.
- [ ] **Step 5: Implement admin result operations** for manual confirmed entry, correction and deletion. Every mutation writes an audit row with before/after JSON and never accepts a browser-supplied actor id.
- [ ] **Step 6: Implement public standings/results/player queries** from active membership plus confirmed results. Include per-game averages and aggregate averages, exclude deleted rows and redact private fields.
- [ ] **Step 7: Run result/standings tests, all existing tests, `npm run typecheck` and `npm run build`**; verify no route still hard-codes one league.
- [ ] **Step 8: Commit** with `git add src/server/db/results.ts src/server/routes/leagues.ts src/server/routes/admin-leagues.ts src/server/index.ts tests/server` and `git commit -m "feat: add league result workflow and standings"`.

### Task 5: Add typed client API and mobile player experience

**Files:**
- Create: `src/client/components/LeagueTabs.tsx`, `src/client/components/ProfilePanel.tsx`, `src/client/components/PlayerLeague.tsx`
- Modify: `src/client/api.ts`, `src/client/App.tsx`, `src/client/styles.css`
- Test: `tests/client/api.test.ts`, `tests/client/player-app.test.ts`

**Interfaces:**
- Extend `UserSummary` with `profileImageUrl` and `dartsCounterUrl`.
- Add `LeagueSummary`, `LeagueDetail`, `StandingRow`, `ResultSummary`, `ProfilePayload`, `InviteJoinPayload` and typed admin league/result records to `src/client/api.ts`.
- Add `ApiClient.profile()`, `updateProfile()`, `leagues()`, `publicLeague()`, `standings()`, `results()`, `joinInvite()`, `myLeagues()`, `submitResult()`, `confirmResult()`, `disputeResult()`.
- `PlayerLeague` receives the authenticated user, selected league, and callbacks for refresh/logout; it renders the standings/results/player tabs, add-result form, pending confirmations and profile panel.

- [ ] **Step 1: Add failing client tests** for typed request paths/bodies and rendering a signed-in player’s league table, average fields, profile controls and own-result form.
- [ ] **Step 2: Run client tests** and confirm the new expectations fail.
- [ ] **Step 3: Add API client methods and response types** with consistent error handling, credentials and JSON content types.
- [ ] **Step 4: Split the signed-in `App.tsx` content** into focused components while retaining the current GIS button mounting, loading, onboarding, logout and admin role gate.
- [ ] **Step 5: Add league selection and invite join handling.** Preserve `/join/<token>` through Google sign-in with session storage, call the authenticated join endpoint once, and select the joined league.
- [ ] **Step 6: Build the player flows** for standings, result entry with both averages, pending confirmations/disputes, public result rows and profile editing. Keep submitted form values after recoverable errors.
- [ ] **Step 7: Update mobile CSS** for bottom/segmented league navigation, stable form controls, avatars, result rows, loading/error states and accessible focus styles at 320px through desktop widths.
- [ ] **Step 8: Run client tests, `npm run typecheck` and `npm run build`** and inspect a 390x844 render for overflow and overlapping content.
- [ ] **Step 9: Commit** with `git add src/client tests/client` and `git commit -m "feat: add mobile player league workspace"`.

### Task 6: Add the admin league workspace

**Files:**
- Create: `src/client/components/AdminLeagueDesk.tsx`
- Modify: `src/client/App.tsx`, `src/client/api.ts`, `src/client/styles.css`
- Test: `tests/client/admin-app.test.ts`

**Interfaces:**
- Add `ApiClient.adminLeagues()`, `createAdminLeague()`, `updateAdminLeague()`, `createInvite()`, `revokeInvite()`, `adminMembers()`, `updateMember()`, `adminResults()`, `createAdminResult()`, `updateAdminResult()`, `deleteAdminResult()`.
- `AdminLeagueDesk` receives the current user and selected league; it emits a league-selection callback and renders only server-authorized admin operations.

- [ ] **Step 1: Add failing UI tests** for creating/editing a league, showing capacity and repeat-game settings, generating a copyable invite link, listing members, showing pending/disputed results and keeping the existing admin role/status controls.
- [ ] **Step 2: Run the admin client test** and confirm it fails.
- [ ] **Step 3: Add typed admin API methods** and wire loading/error/action states without trusting client role flags for authorization.
- [ ] **Step 4: Implement the admin desk** with compact forms for league name, season, capacity, repeat count, target legs, points and open/closed state; show invite link only after the server returns it.
- [ ] **Step 5: Add member/result management** including activate/deactivate membership, confirm/resolve/correct/delete/manual-entry actions, with explicit result state labels rather than color alone.
- [ ] **Step 6: Run client tests, `npm run typecheck`, `npm run build` and `git diff --check`**; verify the admin UI stays usable at mobile width.
- [ ] **Step 7: Commit** with `git add src/client tests/client` and `git commit -m "feat: add admin league workspace"`.

### Task 7: Reconcile documentation and production configuration

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-08-19-misfits-501-v1-design.md`, `docs/superpowers/plans/2026-08-19-misfits-501-v1.md`
- Test: `npm run db:migrate:local`, `wrangler deploy --dry-run` or the installed Wrangler validation equivalent

- [ ] **Step 1: Update the old v1 docs with a short superseded notice** linking to the v2 spec and explain that the old one-league plan is historical rather than silently marking its incomplete checklist complete.
- [ ] **Step 2: Document the actual GIS credential flow** and production names `APP_ORIGIN`, `GOOGLE_CLIENT_ID`, `BOOTSTRAP_ADMIN_EMAIL`, D1 binding and custom domain without recording secret values.
- [ ] **Step 3: Document invite use, league capacity/repeat settings, player-only result submission, averages and profile behavior.** State that tournaments and promotion/relegation are not in this release.
- [ ] **Step 4: Run local migration and Wrangler configuration validation** and verify the production callback/custom-domain notes match the deployed config.
- [ ] **Step 5: Commit** with `git add README.md docs/superpowers/specs/2026-08-19-misfits-501-v1-design.md docs/superpowers/plans/2026-08-19-misfits-501-v1.md` and `git commit -m "docs: define Misfits multi-league release"`.

### Task 8: Deploy and verify the real Google-authenticated workflow

**Files:**
- Modify: generated build output only through `npm run build`; do not commit `dist/` unless the repository already tracks it.
- Evidence: `docs/superpowers/evidence/2026-08-20-misfits-leagues-v2-verification.md`

- [ ] **Step 1: Run the full local gate**: `npm test`, `npm run typecheck`, `npm run build`, `git diff --check` and `npm run db:migrate:local`.
- [ ] **Step 2: Apply the additive migration to the production D1 database** with `npm run db:migrate:remote`; query the league count, admin count, and migration tables without exposing secrets.
- [ ] **Step 3: Deploy the Worker** with `npm run deploy` and capture the deployed version id and exact commit SHA separately.
- [ ] **Step 4: Verify anonymous production reads** at `https://darts.graingers.agency/`, `/api/health`, `/api/public/leagues` and a seeded league endpoint. Confirm the old `zerobytemode.workers.dev` hostname is not an active public route.
- [ ] **Step 5: Use the real signed-in Google browser session** to edit the admin profile, create/edit a test league, generate an invite, open the invite in a clean/second browser, complete Google sign-in, join the league, submit a self-involved result with both averages, confirm it as the opponent, and verify the standings/public result update.
- [ ] **Step 6: Attempt the forbidden paths** with a normal player: create/edit league, issue invite, submit a result between two other players, confirm their own submission and access another league’s admin data. Verify each is rejected server-side.
- [ ] **Step 7: Capture desktop and 390x844 mobile screenshots plus API responses** in the evidence file, distinguishing source/tests/build/deploy/live observations.
- [ ] **Step 8: Fetch remote refs and verify the pushed branch** points to the exact release commit. Do not stage generated browser artifacts.
- [ ] **Step 9: Commit the evidence file** with `git add docs/superpowers/evidence/2026-08-20-misfits-leagues-v2-verification.md` and `git commit -m "docs: record live league verification"`.

---

## Self-review against the v2 specification

- **Google-only identity:** Tasks 2, 5 and 8 preserve the official GIS credential route, verified Google `sub`, bootstrap admin and real-browser acceptance.
- **Profile picture, nickname and Darts Counter link:** Tasks 1, 2 and 5 add schema, server validation, persistence and mobile editing; arbitrary uploads remain excluded by the spec.
- **Multiple leagues and admin create/edit:** Tasks 1, 3 and 6 add schema, service, routes, UI and authorization.
- **Capacity and invite links:** Tasks 1, 3, 6 and 8 cover constraints, hashed tokens, joining, UI copy action and live proof.
- **One game per pair by default with amendments:** Tasks 1 and 4 define and enforce `matches_per_pair` using non-deleted result rows.
- **Players only record their own results:** Task 4 has explicit negative API tests and session-derived actor enforcement; Task 5 exposes only the self-involved form.
- **Per-game averages:** Tasks 1, 4 and 5 cover validation, storage, result display and standings aggregate.
- **Confirmation/dispute and derived standings:** Task 4 covers state transitions and confirmed-only aggregation.
- **Admin result/player/audit controls:** Tasks 3, 4 and 6 cover server routes, UI and audit records.
- **Mobile app behavior:** Tasks 5 and 6 preserve and extend the existing app shell, with mobile render verification.
- **Security/privacy:** Tasks 1-4 enforce hashing, prepared statements, same-origin, role/status/membership checks and public redaction.
- **Production proof:** Tasks 7 and 8 separate migration, build, deployment, live Google auth and browser evidence.

Placeholder scan: complete; every task has concrete files, interfaces, tests and verification commands. Type names and method names are defined in the task interfaces before use.
