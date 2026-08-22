# Misfits 501 Configurable Match Scoring Design

**Status:** Approved design awaiting written-spec review  
**Date:** 22 August 2026  
**Repository:** `wilfgrainger/misfits`  
**Base:** `main` at `39490132c2f8aecef880bdfb138b2006c9e12734`  
**Authority:** This design records the club-approved scoring and tie-break decisions that unblock ADM-070 and supersede older assumptions that league matches must be decisive first-to-N contests with win-only points.

## 1. Purpose

Misfits 501 must support both traditional odd-leg darts matches and even maximum-leg formats that can end in a draw.

The league rules must remain simple for an administrator to understand and must be enforced from one server-side source of truth across result entry, standings, promotion/relegation and player/public display.

The approved model is one configurable league ruleset rather than separate league types.

## 2. Approved competition rules

Each league has the following scoring configuration:

- **Best of / maximum legs** (`maxLegs`).
- **Points for a win** (`pointsPerWin`).
- **Points for a draw** (`pointsPerDraw`).
- **Points for a loss** (`pointsPerLoss`).
- Existing **matches per pair** remains independently configurable.

All four scoring values are league-scoped and persisted.

Example league:

```text
Best of 6
Win: 3 points
Draw: 1 point
Loss: 0 points
```

This is intentionally not represented as separate `FIRST_TO` and `DRAW_ENABLED` league modes. Draw capability follows naturally from the maximum-leg count.

## 3. Match completion semantics

For a configured maximum of `N` legs:

```text
legsToWin = floor(N / 2) + 1
```

A match ends immediately when either player reaches `legsToWin`.

If `N` is even and all `N` legs have been played without either player reaching `legsToWin`, the only valid remaining score is an equal draw of `N / 2` legs each.

Examples:

| Format | Winning target | Valid examples | Draw possible? |
|---|---:|---|---|
| Best of 5 | 3 | 3-0, 3-1, 3-2 | No |
| Best of 6 | 4 | 4-0, 4-1, 4-2, 3-3 | Yes |
| Best of 7 | 4 | 4-0 through 4-3 | No |
| Best of 10 | 6 | 6-0 through 6-4, 5-5 | Yes |

For Best of 6, `3-2` is incomplete and invalid, while `4-3` exceeds the maximum and is invalid.

The result validator must therefore distinguish three states:

1. valid decisive win;
2. valid draw;
3. invalid/incomplete score.

The browser may mirror the rule for usability, but the Worker is authoritative.

## 4. Points allocation

Confirmed results award standings points according to the league configuration.

For each confirmed match:

- winner receives `pointsPerWin`;
- loser receives `pointsPerLoss`;
- for a draw, both players receive `pointsPerDraw`.

Pending, disputed, void or deleted results do not affect standings.

The point values are configurable non-negative integers. The product does not hard-code football scoring, although `3 / 1 / 0` is a supported and intended configuration.

Changing any consequential scoring rule after fixtures or results exist remains protected by the existing league-rule integrity workflow. Historic competition meaning must never silently change.

## 5. Approved standings tie-break order

The club-approved competitive ordering is:

1. **League points** descending.
2. **Total legs won** descending.
3. **Head-to-head** among the players still tied.

Leg difference and three-dart average are not competitive tie-breakers under this approved rule.

### 5.1 Two-player head-to-head

When exactly two players remain tied after league points and total legs won, compare only confirmed league matches played between those two players.

Head-to-head comparison uses the same league scoring configuration:

- head-to-head win points;
- head-to-head draw points;
- head-to-head loss points.

If the pair played multiple configured meetings, aggregate all of those confirmed meetings.

If the head-to-head points are still equal, the players remain genuinely tied.

### 5.2 Three-or-more-player head-to-head

When three or more players remain tied after league points and total legs won, construct a mini-table containing only confirmed matches played between members of that tied group.

Order the mini-table by head-to-head points earned within that group.

If the mini-table does not fully separate the players, any unresolved subset remains genuinely tied. Do not recursively introduce unapproved criteria such as overall average, alphabetical username or leg difference.

## 6. Genuine ties and deterministic display

A genuine tie is allowed to remain a genuine tie.

The standings API must distinguish **competitive rank** from **presentation order**.

Players equal on every approved competitive criterion receive the same competitive rank. A stable non-competitive key such as username and then player ID may be used only to make JSON/UI output deterministic. That presentation ordering must never be used to decide promotion, relegation, prizes or another competitive outcome.

Example:

```text
1  Alice   18 pts  31 legs
2  Bob     15 pts  28 legs
2  Carol   15 pts  28 legs   <- head-to-head unresolved
4  Dave    12 pts  24 legs
```

Promotion/relegation finalisation must continue to block when a genuine tie crosses a movement boundary. The administrator must resolve the competition outcome deliberately rather than the software silently choosing a player.

## 7. Data model evolution

The current code stores `target_legs`, whose meaning is the number of legs a winner must reach. That cannot directly represent the approved Best-of-6 draw-capable rule.

Introduce an authoritative maximum-leg field, conceptually:

```text
max_legs INTEGER NOT NULL
points_per_win INTEGER NOT NULL
points_per_draw INTEGER NOT NULL
points_per_loss INTEGER NOT NULL
```

`target_legs` becomes legacy compatibility data and must not remain a second independently editable source of truth.

The domain derives `legsToWin` from `max_legs`.

### 7.1 Existing-league migration

Preserve the meaning of every existing decisive format.

For an existing league with legacy `target_legs = T`:

```text
max_legs = (T * 2) - 1
```

Therefore:

- legacy first-to-3 becomes Best of 5;
- legacy first-to-4 becomes Best of 7;
- existing result validity is preserved.

Existing `points_per_win` is preserved exactly.

New draw/loss point columns default to values that preserve existing behavior:

```text
points_per_draw = 0
points_per_loss = 0
```

No existing result, fixture, membership or standing history is rewritten merely to perform the schema migration.

## 8. API and domain contract

League create/edit contracts evolve from `targetLegs` to the clearer `maxLegs` concept and expose all scoring values.

Conceptually:

```ts
interface CompetitionLeagueRules {
  maxLegs: number;
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
  matchesPerPair: number;
}
```

A temporary compatibility reader may understand legacy `targetLegs` while migrations and clients move together, but new writes use the new rules model.

The result validator receives the league rules rather than a naked target-leg integer.

The standings calculator receives confirmed matches plus the complete scoring rules so that points and head-to-head are derived consistently from the same inputs.

## 9. Admin experience

League create/edit UI presents a compact **Match & table rules** section:

- Best of / maximum legs.
- Points for win.
- Points for draw.
- Points for loss.
- Matches per player pair.

For an even maximum-leg value, the UI explains the possible draw, for example:

```text
Best of 6: first to 4 wins; 3-3 is a draw.
```

For an odd value:

```text
Best of 5: first to 3 wins; no draw is possible.
```

The interface should display the derived winning target rather than asking the administrator to configure both maximum legs and legs-to-win.

Consequential-rule protection remains visible when a league already owns fixtures/results.

## 10. Player and public experience

League rules should be explainable without reading documentation.

Recommended compact display:

```text
Best of 6 · Win 3 · Draw 1 · Loss 0
Table: Points → Legs won → Head-to-head
```

Result-entry controls must allow the correct draw score for an even format and reject impossible or incomplete scores with useful feedback.

Standings should visibly communicate equal competitive ranks when a genuine tie remains.

## 11. Promotion and relegation impact

The promotion projection currently treats a collection of older metrics as competitive equality. That definition must be replaced by the approved standings rule.

Promotion/relegation consumes the competitive rank/tie information produced by standings rather than reimplementing tie logic independently.

A movement boundary that cuts through a genuine tied rank is an ambiguity and blocks finalisation until an administrator deliberately resolves it through the existing controlled promotion workflow.

This preserves the invariant that promotion/relegation never silently guesses an unresolved tie.

## 12. Canonical backlog amendments

The implementation plan must apply these changes to `docs/superpowers/specs/2026-08-21-user-stories.md` before production code is changed:

### ADM-024

Replace the legacy legs-to-win wording with:

> As an administrator, I want to configure the maximum legs / Best-of format for a league so that both traditional decisive matches and even draw-capable formats are supported.

Acceptance must cover persisted maximum legs, derived winning target, even-format draws, server-side result validation and player-visible rules.

### ADM-025

Expand the scoring story to:

> As an administrator, I want to configure points for a win, draw and loss so that each league can use its intended standings scoring system.

Acceptance must cover persisted league-scoped values, confirmed-only point awards, draw scoring and consequential-rule protection after competition begins.

### ADM-070

Remove the product gate. Record the approved order:

> Points → total legs won → head-to-head.

Acceptance must cover two-player head-to-head, three-or-more-player mini-tables, same-rank genuine ties, deterministic presentation and promotion-boundary ambiguity.

ADM-070 is **APPROVED / READY FOR TDD**, not delivered, until implementation and verification evidence exist.

## 13. Testing strategy

Implementation follows strict RED → GREEN → refactor discipline.

Required focused tests include:

### Match validation

- Best of 5 accepts `3-0`, `3-1`, `3-2`.
- Best of 5 rejects draws and incomplete results.
- Best of 6 accepts `4-0`, `4-1`, `4-2`, `3-3`.
- Best of 6 rejects `3-2`, `4-3` and scores exceeding the maximum.
- Derived winning target is deterministic for odd and even values.

### Points

- configured win points are awarded to the winner;
- configured loss points are awarded to the loser;
- configured draw points are awarded to both players;
- unconfirmed results award nothing.

### Standings

- points outrank every other criterion;
- when points tie, total legs won decides position;
- when both tie, two-player head-to-head decides position;
- multiple meetings aggregate correctly;
- 3+ tied players use a head-to-head mini-table;
- unresolved competitive equality gives the same rank;
- deterministic display order does not change competitive rank.

### Promotion/relegation

- a resolved head-to-head tie can safely determine a movement position;
- a genuine tied rank crossing a promotion boundary is blocked;
- a genuine tied rank crossing a relegation boundary is blocked.

### Migration/API/UI

- legacy target-leg configuration migrates to equivalent odd Best-of values;
- league create/edit round-trips all scoring fields;
- admin and player/public views explain the configured rules correctly;
- existing odd-format regression coverage remains green.

## 14. Scope boundaries

This design does not add:

- bonus points;
- per-leg league points;
- handicaps;
- tournament/knockout scoring;
- sudden-death legs after an even-format draw;
- average, leg difference or username as competitive tie-breakers;
- configurable arbitrary tie-break chains.

Those require separate product decisions.

## 15. Implementation sequencing

After written-spec review, create a detailed Superpowers implementation plan. The plan should sequence work so that rule authority exists before dependent UI changes:

1. Canonical backlog and evidence-doc amendments.
2. D1 migration and league-rule domain model.
3. RED/GREEN result validation for odd/even formats.
4. RED/GREEN configurable win/draw/loss points.
5. RED/GREEN standings and head-to-head ranking.
6. Promotion/relegation tie integration.
7. Admin create/edit UI.
8. Player/public rule and standings presentation.
9. Full Wrangler type generation, TypeScript, complete Vitest suite and production build.
10. PR review, remediation if required, merge and main/deploy verification.

No later user story may be claimed complete merely because this design has been approved. Story states advance only with implementation evidence and fresh verification.