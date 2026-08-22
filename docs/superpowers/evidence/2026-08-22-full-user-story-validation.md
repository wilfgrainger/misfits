# Misfits 501 — Full 150-Story Validation

**Date:** 22 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Validated baseline:** `main` after PR #17 scoring release  
**Canonical story definitions:** `docs/superpowers/specs/2026-08-21-user-stories.md`  
**Prior detailed admin audit:** `docs/superpowers/evidence/2026-08-21-story-by-story-audit.md`

## Verdict

This is an evidence audit, not a restatement of the catalogue's historical `DELIVERED` labels.

| Audience | Total | VERIFIED | PARTIAL | MISSING |
|---|---:|---:|---:|---:|
| Admin | 88 | 82 | 5 | 1 |
| Player | 55 | 29 | 7 | 19 |
| Public | 7 | 6 | 0 | 1 |
| **Total** | **150** | **117** | **12** | **21** |

**Verified completion: 117 / 150 = 78%.**

Definitions:

- **VERIFIED**: full acceptance criteria are supported by current implementation plus focused or clearly relevant automated evidence.
- **PARTIAL**: material implementation exists, but one or more acceptance criteria are not satisfied.
- **MISSING**: the end-user behaviour is absent or unreachable in the intended role/workflow.
- Historical catalogue `DELIVERED` labels are implementation-intent labels and must not be used as proof where this audit differs.

## Highest-impact findings

1. **Player fixture authority mismatch.** `PlayerLeague` calls `ApiClient.fixtures()`, which uses `/api/admin/competition/leagues/:leagueId/fixtures`. `createCompetitionRoutes()` applies `requireUser, requireAdmin` to `/api/admin/*`. A normal player therefore receives 403; the client catches it and displays an empty fixture list. This blocks a large fixture-first story cluster.
2. **Legacy free-form player result UI remains.** The server correctly requires an outstanding fixture once persisted fixtures exist, but the player UI still offers an `Add result` opponent selector when no fixture is selected.
3. **Player promotion/relegation presentation is absent.** The backend/admin projection engine is strong, but player standings do not show promotion/relegation zones, ambiguity, projected movement, approved movement, or pending next-season placement.
4. **Admin season health is calculated but not surfaced.** `seasonHealth()` exists in the DB layer but has no route/client consumer.
5. **Whole-season readiness is not enforced before fixture commitment.** A league validates its own roster, but fixture generation does not block because active club competitors elsewhere in that season remain unassigned.
6. **Responsive acceptance is not fully evidenced.** The repo's own Impeccable review records sub-44px touch targets and an underdeveloped desktop composition.
7. **One positive catalogue correction:** PLY-020 is now fully satisfied by PR #17 and should no longer be treated as PARTIAL.

## Administrator stories

| Story | Validation | Evidence / gap |
|---|---|---|
| ADM-001 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-002 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-003 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-004 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-005 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-006 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-007 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-008 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-009 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-010 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-011 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-012 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-013 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-014 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-015 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-016 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-017 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-018 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-019 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-020 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-021 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-022 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-023 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-024 | **VERIFIED** | Inherited from the existing story-by-story audit, reverified under PR #17 against the expanded Best-of contract. |
| ADM-025 | **VERIFIED** | Inherited from the existing story-by-story audit, reverified under PR #17 against configurable win/draw/loss scoring. |
| ADM-026 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-027 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-028 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-029 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-030 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-031 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-032 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-033 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-034 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-035 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-036 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-037 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-038 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-039 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-040 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-041 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-042 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-043 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-044 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-045 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-046 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-047 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-048 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-049 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-050 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-051 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-052 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-053 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-054 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-055 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-056 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-057 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-058 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-059 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-060 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-061 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-062 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-063 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-064 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-065 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-066 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-067 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-068 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-069 | **VERIFIED** | Inherited from the existing story-by-story audit, which records focused implementation/test evidence through ADM-070. |
| ADM-070 | **VERIFIED** | Inherited from the existing story-by-story audit, reverified under PR #17 for Points → legs won → head-to-head and shared-rank promotion safety. |
| ADM-071 | **VERIFIED** | Rule/format/frequency changes are server-locked once fixture/result history exists; PR #17 expanded the protected scoring contract. |
| ADM-072 | **VERIFIED** | Promotion-place count is persisted, validated against movement overlap, editable in admin UI, and exercised by promotion tests. |
| ADM-073 | **VERIFIED** | Relegation-place count is persisted, validated against movement overlap, editable in admin UI, and exercised by promotion tests. |
| ADM-074 | **VERIFIED** | Promotion engine derives adjacent destinations from explicit league hierarchy; top/bottom edge cases are covered. |
| ADM-075 | **PARTIAL** | Projection and provisional/final status are implemented, but the admin UI does not render `promotion.ambiguities`, so an unresolved movement-boundary tie is not fully surfaced. |
| ADM-076 | **VERIFIED** | Final proposal requires closed/final-eligible state and blocks unresolved fixture/result state and unresolved movement-boundary ties. |
| ADM-077 | **VERIFIED** | Admin can create and inspect a proposal before apply; no next-season membership write occurs at preview/proposal time. |
| ADM-078 | **VERIFIED** | Admin override requires destination and reason; server audits the override and revalidates on apply. |
| ADM-079 | **VERIFIED** | Apply creates next-season memberships idempotently, respects overrides/capacity, and preserves source-season memberships. |
| ADM-080 | **VERIFIED** | Normal season assignment tooling can place active new/returning players into a selected draft season/league with capacity/uniqueness enforcement. |
| ADM-081 | **PARTIAL** | Roster and unassigned views exist, but fixture generation validates only the selected league. It does not enforce the whole-season invariant that every active competitor is assigned before any league commits fixtures. |
| ADM-082 | **VERIFIED** | Source memberships and movement records remain queryable; apply does not rewrite previous-season membership and override/application state is retained. |
| ADM-083 | **MISSING** | A `seasonHealth()` DB helper computes all required counts, but no route/client surface consumes it, so the promised concise health view does not exist. |
| ADM-084 | **PARTIAL** | Many destructive actions use custom confirmation, but fixture void/restore is direct and the generic confirmation dialog has no demonstrated focus trap/restoration; acceptance is incomplete. |
| ADM-085 | **VERIFIED** | Stable AppError/server validation messages are surfaced by admin forms without discarding the surrounding workspace. |
| ADM-086 | **VERIFIED** | Client request guards/selection checks and server authority prevent stale selection/browser state from becoming competition truth. |
| ADM-087 | **PARTIAL** | Mobile-first layout exists, but the repo's Impeccable review found several 36–42px controls below the intended 44px touch floor and precision issues in mobile navigation. |
| ADM-088 | **PARTIAL** | Desktop is functional, but the Impeccable review explicitly found it remains a widened mobile composition rather than the intended first-class desktop control room. |

## Player stories

| Story | Validation | Evidence / gap |
|---|---|---|
| PLY-001 | **VERIFIED** | Google sign-in is verified server-side and represented by the player auth flow. |
| PLY-002 | **VERIFIED** | Invite token is preserved across sign-in/onboarding via session storage and consumed after authentication. |
| PLY-003 | **VERIFIED** | Nickname onboarding persists server-side before normal club use. |
| PLY-004 | **VERIFIED** | Invite acceptance is season/league scoped, capacity/status checked, and idempotent. |
| PLY-005 | **VERIFIED** | Logout revokes/clears authenticated state and returns the UI to signed-out mode. |
| PLY-006 | **VERIFIED** | Profile nickname edits persist and result/standings ownership remains ID-based. |
| PLY-007 | **VERIFIED** | DartCounter profile URL validation/storage/rendering is covered by profile domain/route/UI tests. |
| PLY-008 | **VERIFIED** | Verified Google profile image is carried into user/player presentation with fallback initials. |
| PLY-009 | **PARTIAL** | Server sessions fail closed for suspended users, but the client falls back to a generic signed-out state rather than clearly explaining suspension. |
| PLY-010 | **VERIFIED** | Membership-derived league list exposes current and historical season-labelled placements. |
| PLY-011 | **VERIFIED** | League tabs/account context show season and league together from persisted membership. |
| PLY-012 | **PARTIAL** | Default selection is simply the first `listUserLeagues()` row, ordered OPEN/updated/name; it does not join/use the explicit season `is_current` flag, so current-season preference is not guaranteed. |
| PLY-013 | **VERIFIED** | League switching reloads league data and request/race guards prevent stale responses replacing the latest selection. |
| PLY-014 | **MISSING** | While signed in, the member workspace only lists `myLeagues`; there is no UI to browse other public leagues in the current season. |
| PLY-015 | **VERIFIED** | Private league reads use server `canViewLeague` membership/admin checks; guessed IDs/slugs do not bypass them. |
| PLY-016 | **PARTIAL** | Player sees Best-of and W/D/L scoring plus tie-break text, but the rule summary omits meetings-per-pair and does not consistently show the derived winning target outside result entry. |
| PLY-017 | **VERIFIED** | Closed status is visible and normal result entry is disabled; backend also enforces competition state. |
| PLY-018 | **VERIFIED** | Standings are derived from confirmed results scoped to selected league/season. |
| PLY-019 | **VERIFIED** | Standings table applies an accessible current-player row highlight. |
| PLY-020 | **VERIFIED** | PR #17 now shows position/player/P/W-D-L/legs/average/points and the published tie-break explanation; prior PARTIAL label is stale. |
| PLY-021 | **VERIFIED** | Pending/disputed results do not contribute; confirmation/correction/deletion recompute derived standings. |
| PLY-022 | **PARTIAL** | Backend/shared-rank logic and published Points → Legs won → H2H text are correct, but player UI does not surface movement-boundary ambiguity because it has no promotion projection surface. |
| PLY-023 | **MISSING** | Player standings do not render configured promotion zones/labels. |
| PLY-024 | **MISSING** | Player standings do not render configured relegation zones/labels. |
| PLY-025 | **VERIFIED** | Player roster is league-scoped, active-only, and identifies the signed-in player. |
| PLY-026 | **MISSING** | Normal players cannot load fixtures: `PlayerLeague` calls an `/api/admin/.../fixtures` endpoint protected by `requireAdmin`; the 403 is swallowed into an empty list. |
| PLY-027 | **MISSING** | Same admin-only fixture endpoint prevents a normal player from seeing outstanding fixtures. |
| PLY-028 | **MISSING** | Fixture rows would only show status/round/meeting; normal players cannot load them and completed rows do not show the linked official score/averages. |
| PLY-029 | **MISSING** | Normal players cannot load pending-confirmation fixture state; row UI also lacks result summary/who-must-act context. |
| PLY-030 | **MISSING** | Normal players cannot load disputed fixtures; row UI lacks dispute context. |
| PLY-031 | **MISSING** | The only fixture-list API used by the client is admin-only, so a normal player cannot follow all league fixtures. |
| PLY-032 | **MISSING** | No player played/remaining fixture counters exist, and fixtures cannot be loaded by a normal player. |
| PLY-033 | **MISSING** | No player league-progress played/total/outstanding summary exists, and fixtures cannot be loaded by a normal player. |
| PLY-034 | **MISSING** | Round/meeting labels exist in dormant row rendering, but normal players cannot access the fixture list, so repeated meetings are not actually distinguishable in player use. |
| PLY-035 | **MISSING** | VOID rendering exists in dormant fixture rows, but the normal player cannot access the fixture list. |
| PLY-036 | **MISSING** | The intended fixture-first button exists only after fixture data loads, which fails for normal players; the UI still exposes a legacy free-form Add result path. |
| PLY-037 | **PARTIAL** | Best-of validation and 3-3 draw rules are correct server-side and explained in the form, but the official player fixture-entry path is unreachable because fixtures cannot be loaded. |
| PLY-038 | **PARTIAL** | Average validation/storage is implemented on fixture results, but the normal player cannot reach fixture-linked submission from the UI. |
| PLY-039 | **MISSING** | Client can submit `fixtureId` only after selecting a fixture; normal players cannot load/select fixtures, so fixture result submission is not usable. |
| PLY-040 | **MISSING** | `pending` is filtered to PENDING results submitted by the opponent; the submitting player's own pending result is not rendered. |
| PLY-041 | **VERIFIED** | Opponent-side pending results are surfaced with confirm/dispute actions. |
| PLY-042 | **VERIFIED** | Eligible opponent confirmation updates result/fixture and standings exactly once. |
| PLY-043 | **VERIFIED** | Eligible opponent can dispute; disputed state is excluded from standings. |
| PLY-044 | **VERIFIED** | Dispute dialog requires a bounded note, stores it safely and exposes it to appropriate workflows. |
| PLY-045 | **VERIFIED** | Confirmed/admin-resolved results are reloaded from official result data and show final score/averages. |
| PLY-046 | **VERIFIED** | Backend fixture/result state prevents duplicate settlement. |
| PLY-047 | **VERIFIED** | Backend verifies the session user is an eligible fixture participant. |
| PLY-048 | **VERIFIED** | Closed league and inactive membership are enforced server-side; closed state also disables normal result entry in UI. |
| PLY-049 | **VERIFIED** | Recoverable submission errors set an error without clearing the entered form state or creating a duplicate result. |
| PLY-050 | **PARTIAL** | Historic season-labelled league tabs can show old table/results, but fixture history is inaccessible to normal players and there is no dedicated complete historical-season view. |
| PLY-051 | **VERIFIED** | Historical league membership remains season-scoped and is not rewritten by later movement. |
| PLY-052 | **MISSING** | No player-facing provisional promotion/relegation projection exists. |
| PLY-053 | **MISSING** | No player-facing surface distinguishes an approved end-of-season movement from a provisional projection. |
| PLY-054 | **VERIFIED** | Applied next-season membership is created separately while old memberships remain; member league tabs can show the new and old placements. |
| PLY-055 | **MISSING** | There is no explicit next-season placement pending/unassigned player state; the generic no-league copy talks about opening an invite. |

## Public visitor stories

| Story | Validation | Evidence / gap |
|---|---|---|
| PUB-001 | **VERIFIED** | Signed-out app exposes deliberately public competition without requiring authentication. |
| PUB-002 | **VERIFIED** | Public league tabs carry season labels and stable deep links select the intended public league. |
| PUB-003 | **VERIFIED** | Public standings use the same confirmed-only league-scoped standings API and table. |
| PUB-004 | **VERIFIED** | Public latest-results surface uses confirmed public results and exposes only competition-safe score/average identity. |
| PUB-005 | **MISSING** | No public fixture endpoint/view is wired; `PublicLeagueView` loads league detail, standings and results only. |
| PUB-006 | **VERIFIED** | Stable public league deep link and clipboard/native share fallback are tested. |
| PUB-007 | **VERIFIED** | Private league reads use `canViewLeague`; unauthenticated guessed routes fail without returning protected league data. |

## Incomplete story set

### PARTIAL

ADM-075, ADM-081, ADM-084, ADM-087, ADM-088, PLY-009, PLY-012, PLY-016, PLY-022, PLY-037, PLY-038, PLY-050

### MISSING

ADM-083, PLY-014, PLY-023, PLY-024, PLY-026, PLY-027, PLY-028, PLY-029, PLY-030, PLY-031, PLY-032, PLY-033, PLY-034, PLY-035, PLY-036, PLY-039, PLY-040, PLY-052, PLY-053, PLY-055, PUB-005

## Recommended next implementation order

1. **P0 player fixture-first repair:** create permission-safe player/public fixture reads, remove the unusable free-form result path when fixtures exist, then close PLY-026/027/029/030/034/036/037/039 and dependent fixture stories.
2. **P0 lifecycle/admin integrity:** enforce whole-season placement readiness before fixture commit (ADM-081) and complete destructive-action confirmation/accessibility (ADM-084).
3. **Player standings/movement:** surface promotion/relegation zones, tie ambiguity and movement states (PLY-022/023/024/052/053/055).
4. **Player context/history:** current-season defaulting, public-league browsing, full rule summary, own pending results and historical fixtures.
5. **Admin operational polish:** wire season health (ADM-083), ambiguity display (ADM-075), then close mobile/desktop acceptance (ADM-087/088).
6. **Public fixtures:** implement permission-safe PUBLIC fixture read/render for PUB-005.

## Handoff rule

Until the incomplete set above is implemented and re-tested, **do not claim 150/150 story completion**. The next agent should use this validation file plus `PROGRESS.md` as the current completion authority, while the canonical story file remains the authority for story wording and acceptance criteria.
