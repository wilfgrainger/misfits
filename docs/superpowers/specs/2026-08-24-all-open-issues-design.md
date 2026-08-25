# Misfits 501 Open-Issue Closure Design

## Status

Approved for implementation by the user's explicit `FIX ALL ISSUES - APPROVED GO` instruction on 2026-08-24.

## Goal

Close the currently open Misfits backlog as one coherent club-season workflow. The system must make season placement trustworthy before fixtures exist, make fixture-first play available to ordinary approved members, keep suspended accounts fail-closed and understandable, expose movement and history without inventing placements, and provide a safe public fixture view only for leagues explicitly marked `PUBLIC`.

The implementation stays within the existing Misfits architecture:

- one private Misfits club, not a generic or white-label SaaS product;
- Google authentication and Worker-enforced authorization;
- existing D1 tables and indexes only; no schema migration is needed;
- historical seasons remain immutable records;
- admin and member APIs remain separate, with member responses filtered to the caller's scope;
- source, local tests, deployment, and live observation remain separate proof claims.

## Issue-to-change mapping

| Issues | Closure slice |
| --- | --- |
| #98 | Whole-season placement readiness before any fixture preview or commit, including unassigned, invalid-status, duplicate, and wrong-season placements. Admin health exposes the blocking counts. |
| #105 | First-class desktop admin workbench: persistent task rail, content workspace, wider form grids, and the same semantic tab model as mobile. |
| #114 | Suspended sessions remain rejected by protected APIs, while `/api/me` returns a privacy-safe `ACCOUNT_SUSPENDED` 403 so the client can explain the state and offer sign out. |
| #121 | Player-visible rules include best-of, derived winning target, matches per opponent, and W/D/L points in every league workspace. |
| #127–129, #157–160 | Member-scoped movement endpoint and standings movement surface for provisional zones, tied boundaries, approved outcomes, and explicit next-season pending state. No all-player private movement payload is exposed. |
| #131–144 | Member-scoped all-fixture and my-fixture reads, linked result summaries, counters, state/action explanations, and fixture-first result entry. The arbitrary-opponent UI path is removed. |
| #155 | Historical leagues are grouped and labelled as past seasons; existing league detail, results, and new fixture reads use the selected season only. |
| #165 | Anonymous public fixture endpoint and `/league/:slug` view are available only for `PUBLIC` leagues and return names, schedule state, and confirmed score summaries without account identifiers or private member fields. |

## Server design

### Season readiness

Add a read-only readiness calculation in the competition database layer. It counts, for a season:

1. active approved club members without exactly one active placement;
2. active placements whose user is suspended, pending, rejected, or missing;
3. users with more than one active placement in the season;
4. existing fixture state counts.

`previewLeagueFixtures` and `commitLeagueFixtures` call this calculation before generating or returning fixtures. An existing fixture set does not bypass the readiness check: an administrator must be shown a corrected blocking state rather than receive a misleading successful commit response. Placement mutations and membership reactivation also reject inactive or non-approved accounts. Baseline-copy and promotion-application paths copy only eligible current members and fail with a clear validation error if the target would be incomplete.

The health response adds `invalidPlayers`, `duplicatePlacements`, and `readyForFixtures`. Existing fields remain compatible. No client-provided health value is trusted for enforcement; the server repeats the check at the mutation boundary.

### Suspension handling

Keep `resolveSession` and `requireUser` fail-closed for suspended accounts. Add a narrowly scoped request-status lookup used only by `/api/me`. A valid suspended session receives:

```json
{
  "error": {
    "code": "ACCOUNT_SUSPENDED",
    "message": "This account is suspended. Contact a club administrator."
  }
}
```

Protected data and mutation routes continue to return unauthenticated or forbidden responses and never load club data for the suspended account.

### Member fixture reads

Add authenticated, approved-member routes:

- `GET /api/leagues/:leagueId/fixtures` — all fixtures for a league, without admin-only access;
- `GET /api/me/leagues/:leagueId/fixtures` — only fixtures involving the current user.

Both verify the league exists and the caller is an approved club member. The response contains only the existing fixture fields plus the linked active match summary: result id/status, leg scores, averages, submitter, and dispute note. The current user's own endpoint is used for record actions and counters; the league endpoint supports the complete fixture browser.

Add anonymous `GET /api/public/leagues/:key/fixtures`. It resolves by id or slug, rejects private leagues with the same privacy-safe not-found response, and returns names, round/meeting, state, and confirmed result summary only. It omits user ids, emails, profile images, submitter ids, and pending/dispute private notes.

### Member movement reads

Add `GET /api/me/leagues/:leagueId/movement`. It resolves the league's season, computes the existing promotion projection, and returns only the caller's current source placement and movement record/projection. It includes safe boundary metadata (boundary, position, and whether the caller is tied) rather than exposing other players' identities. A confirmed `APPLIED` movement includes the target season/league identifiers and names. No active target placement returns an explicit `PENDING` state; it is not converted into an invitation or fabricated league.

### League metadata

Extend the legacy league read model to include the already-migrated season and movement fields (`season_id`, hierarchy position, promotion places, and relegation places). This keeps member, admin, and public league payloads consistent and enables the movement/history UI without a second lookup.

## Client design

### App entry

Add a suspended view that contains no club data and clearly says the account is suspended, how to contact an administrator, and how to sign out. A `ACCOUNT_SUSPENDED` response from `/api/me` or Google sign-in maps to this state.

Wire `/league/:slug` before the private shell. The public view requests the public league payload and public fixtures endpoint; it renders only successful `PUBLIC` data, a clear unavailable/private state otherwise, and a sign-in entry link. Existing signed-out privacy tests remain valid for private league links.

### Player competition workspace

The workspace loads standings, confirmed results, league detail, personal results, all member fixtures, personal fixtures, and caller movement as separate scoped requests. Fixture read failure is visible rather than silently converted to an empty schedule.

The table shows a rules card in embedded and full views, movement-zone legend/labels, provisional status, tie-boundary warning, and confirmed/pending next-season state. Past seasons are grouped separately from current competitions in the league browser.

The fixture browser shows totals and state counters, highlights the current user's rows, includes round and meeting identity, and renders result score/averages, pending action, dispute note, or void consequences according to state. Record opens only an outstanding fixture involving the current user. There is no arbitrary-opponent form in the player workflow.

### Admin desktop

At desktop widths the admin surface becomes a two-column workbench with a sticky task rail and a content panel. At mobile widths the existing horizontal/stacked task navigation remains. The same roles, `aria-selected`, keyboard navigation, and focus behavior are preserved.

Fixture controls use the health readiness state: the blocking reason/counts is visible and commit is disabled while the season is not ready. Refreshing roster, assignment, reset, or fixture generation refreshes the health response.

## Error and privacy boundaries

- Server guards remain authoritative; client disabled buttons are usability only.
- Public data is limited to leagues explicitly marked `PUBLIC` and confirmed results.
- Member data is limited to an approved club member and the requested league; personal movement and fixtures are caller-filtered.
- Suspended users never receive club league, fixture, result, or movement data.
- Historical data is read-only and labelled by its own season; no current-season response is mixed into an archive view.
- Existing free-form result API support may remain for legacy records at the server boundary for backward compatibility, but the normal member UI always requires a persisted outstanding fixture. Fixture-backed leagues reject non-fixture submissions as they already do.

## Verification strategy

For each behavior change, add or extend a focused test first, run it to observe the intended failure, implement the smallest server/client change, then run it to green. The final gate is:

```text
npm test
npm run typecheck
npm run build
npx wrangler types --check
node .agents/skills/impeccable/scripts/detect.mjs --json src/client
git diff --check
```

No live deployment or issue closure is claimed by this source/automated gate alone. If the branch is published, the final handoff will state the exact commit/PR and separately state deployment and live-observation evidence.
