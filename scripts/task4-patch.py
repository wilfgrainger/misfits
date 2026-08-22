from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count} matches, found {actual} for {old[:100]!r}")
    file.write_text(text.replace(old, new))


# Canonical competition records expose the new persisted scoring fields.
replace(
    "src/server/db/competition.ts",
    "  points_per_win: number;\n  target_legs: number;",
    "  max_legs: number;\n  points_per_win: number;\n  points_per_draw: number;\n  points_per_loss: number;\n  target_legs: number;",
)
replace(
    "src/server/db/competition.ts",
    "`SELECT id, name, slug, season_name, season_id, status, points_per_win, target_legs,\n",
    "`SELECT id, name, slug, season_name, season_id, status, max_legs, points_per_win, points_per_draw, points_per_loss, target_legs,\n",
    2,
)

# Season-scoped league writes persist the full scoring contract.
replace(
    "src/server/db/competition-leagues.ts",
    "id, name, slug, season_name, season_id, status, points_per_win, target_legs,\n          created_at, updated_at, created_by, max_players, matches_per_pair, visibility,",
    "id, name, slug, season_name, season_id, status, points_per_win, points_per_draw, points_per_loss, max_legs, target_legs,\n          created_at, updated_at, created_by, max_players, matches_per_pair, visibility,",
)
replace(
    "src/server/db/competition-leagues.ts",
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
)
replace(
    "src/server/db/competition-leagues.ts",
    "        input.pointsPerWin,\n        input.targetLegs,",
    "        input.pointsPerWin,\n        input.pointsPerDraw,\n        input.pointsPerLoss,\n        input.maxLegs,\n        input.targetLegs,",
    2,
)
replace(
    "src/server/db/competition-leagues.ts",
    "      before.matches_per_pair !== input.matchesPerPair ||\n      before.points_per_win !== input.pointsPerWin ||\n      before.target_legs !== input.targetLegs ||",
    "      before.matches_per_pair !== input.matchesPerPair ||\n      before.max_legs !== input.maxLegs ||\n      before.points_per_win !== input.pointsPerWin ||\n      before.points_per_draw !== input.pointsPerDraw ||\n      before.points_per_loss !== input.pointsPerLoss ||\n      before.target_legs !== input.targetLegs ||",
)
replace(
    "src/server/db/competition-leagues.ts",
    "          name = ?, slug = ?, points_per_win = ?, target_legs = ?, max_players = ?, matches_per_pair = ?,\n          visibility = ?, hierarchy_position = ?, promotion_places = ?, relegation_places = ?, updated_at = ?",
    "          name = ?, slug = ?, points_per_win = ?, points_per_draw = ?, points_per_loss = ?, max_legs = ?, target_legs = ?, max_players = ?, matches_per_pair = ?,\n          visibility = ?, hierarchy_position = ?, promotion_places = ?, relegation_places = ?, updated_at = ?",
)

# Structural cloning copies authoritative scoring fields.
replace(
    "src/server/db/season-lifecycle.ts",
    "      matchesPerPair: sourceLeague.matches_per_pair,\n      pointsPerWin: sourceLeague.points_per_win,\n      targetLegs: sourceLeague.target_legs,",
    "      matchesPerPair: sourceLeague.matches_per_pair,\n      maxLegs: sourceLeague.max_legs,\n      pointsPerWin: sourceLeague.points_per_win,\n      pointsPerDraw: sourceLeague.points_per_draw,\n      pointsPerLoss: sourceLeague.points_per_loss,\n      targetLegs: sourceLeague.target_legs,",
)

# Persisted-row adapter provides a safe legacy fallback while max_legs is authoritative after migration.
Path("src/server/db/scoring-rules.ts").write_text(
    """import { maxLegsFromLegacyTarget, type LeagueScoringRules } from '../domain/scoring';

export interface PersistedLeagueScoring {
  target_legs: number;
  max_legs?: number | null;
  points_per_win: number;
  points_per_draw?: number | null;
  points_per_loss?: number | null;
}

export function scoringRulesForLeague(league: PersistedLeagueScoring): LeagueScoringRules {
  return {
    maxLegs: Number.isInteger(league.max_legs) ? Number(league.max_legs) : maxLegsFromLegacyTarget(league.target_legs),
    pointsPerWin: Number(league.points_per_win),
    pointsPerDraw: Number(league.points_per_draw ?? 0),
    pointsPerLoss: Number(league.points_per_loss ?? 0),
  };
}
"""
)

# Fixture-backed results use authoritative Best-of validation.
replace(
    "src/server/db/fixture-results.ts",
    "import { getMembership } from './leagues';",
    "import { getMembership } from './leagues';\nimport { scoringRulesForLeague } from './scoring-rules';",
)
replace(
    "src/server/db/fixture-results.ts",
    "function resultFromFixtureInput(fixture: FixtureRecord, input: unknown, targetLegs: number): ResultInput {",
    "function resultFromFixtureInput(fixture: FixtureRecord, input: unknown, rules: ReturnType<typeof scoringRulesForLeague>): ResultInput {",
)
replace("src/server/db/fixture-results.ts", "  }, targetLegs);", "  }, rules);")
replace(
    "src/server/db/fixture-results.ts",
    "  const result = resultFromFixtureInput(fixture, input, league.target_legs);",
    "  const result = resultFromFixtureInput(fixture, input, scoringRulesForLeague(league));",
    2,
)

# Legacy/free-form result paths use the same scoring contract.
replace(
    "src/server/db/results.ts",
    "import { getLeagueById, getMembership, listLeagueMembers } from './leagues';",
    "import { getLeagueById, getMembership, listLeagueMembers } from './leagues';\nimport { scoringRulesForLeague } from './scoring-rules';",
)
replace(
    "src/server/db/results.ts",
    "async function validateAndNormalize(input: unknown, targetLegs: number): Promise<ResultInput> {\n  const validation = validatePlayerResult(input, targetLegs);",
    "async function validateAndNormalize(input: unknown, rules: ReturnType<typeof scoringRulesForLeague>): Promise<ResultInput> {\n  const validation = validatePlayerResult(input, rules);",
)
replace(
    "src/server/db/results.ts",
    "validateAndNormalize(input, league.target_legs)",
    "validateAndNormalize(input, scoringRulesForLeague(league))",
    3,
)

# Legacy league CRUD persists and exposes the same fields.
replace(
    "src/server/db/leagues.ts",
    "  points_per_win: number;\n  target_legs: number;",
    "  max_legs: number;\n  points_per_win: number;\n  points_per_draw: number;\n  points_per_loss: number;\n  target_legs: number;",
)
replace(
    "src/server/db/leagues.ts",
    "status, points_per_win, target_legs,",
    "status, max_legs, points_per_win, points_per_draw, points_per_loss, target_legs,",
    4,
)
replace(
    "src/server/db/leagues.ts",
    "leagues.points_per_win, leagues.target_legs,",
    "leagues.max_legs, leagues.points_per_win, leagues.points_per_draw, leagues.points_per_loss, leagues.target_legs,",
)
replace(
    "src/server/db/leagues.ts",
    "`INSERT INTO leagues (id, name, slug, season_name, status, points_per_win, target_legs,\n                          created_at, updated_at, created_by, max_players, matches_per_pair, visibility)\n     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
    "`INSERT INTO leagues (id, name, slug, season_name, status, points_per_win, points_per_draw, points_per_loss, max_legs, target_legs,\n                          created_at, updated_at, created_by, max_players, matches_per_pair, visibility)\n     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
)
replace(
    "src/server/db/leagues.ts",
    ").bind(id, input.name, input.slug, input.seasonName, input.status, input.pointsPerWin, input.targetLegs, timestamp, timestamp, actorUserId, input.maxPlayers, input.matchesPerPair, input.visibility).run();",
    ").bind(id, input.name, input.slug, input.seasonName, input.status, input.pointsPerWin, input.pointsPerDraw, input.pointsPerLoss, input.maxLegs, input.targetLegs, timestamp, timestamp, actorUserId, input.maxPlayers, input.matchesPerPair, input.visibility).run();",
)
replace(
    "src/server/db/leagues.ts",
    "    const scoringRulesChanged =\n      before.points_per_win !== input.pointsPerWin ||\n      before.target_legs !== input.targetLegs ||\n      before.matches_per_pair !== input.matchesPerPair;",
    "    const scoringRulesChanged =\n      (before.max_legs ?? ((before.target_legs * 2) - 1)) !== input.maxLegs ||\n      before.points_per_win !== input.pointsPerWin ||\n      (before.points_per_draw ?? 0) !== input.pointsPerDraw ||\n      (before.points_per_loss ?? 0) !== input.pointsPerLoss ||\n      before.target_legs !== input.targetLegs ||\n      before.matches_per_pair !== input.matchesPerPair;",
)
replace(
    "src/server/db/leagues.ts",
    "        SET name = ?, slug = ?, season_name = ?, status = ?, points_per_win = ?, target_legs = ?,\n            max_players = ?, matches_per_pair = ?, visibility = ?, updated_at = ?",
    "        SET name = ?, slug = ?, season_name = ?, status = ?, points_per_win = ?, points_per_draw = ?, points_per_loss = ?, max_legs = ?, target_legs = ?,\n            max_players = ?, matches_per_pair = ?, visibility = ?, updated_at = ?",
)
replace(
    "src/server/db/leagues.ts",
    ").bind(input.name, input.slug, input.seasonName, input.status, input.pointsPerWin, input.targetLegs, input.maxPlayers, input.matchesPerPair, input.visibility, timestamp, leagueId, leagueId, input.maxPlayers).run();",
    ").bind(input.name, input.slug, input.seasonName, input.status, input.pointsPerWin, input.pointsPerDraw, input.pointsPerLoss, input.maxLegs, input.targetLegs, input.maxPlayers, input.matchesPerPair, input.visibility, timestamp, leagueId, leagueId, input.maxPlayers).run();",
)

# API contracts expose Best-of plus win/draw/loss points while retaining targetLegs compatibility.
replace(
    "src/server/routes/leagues.ts",
    "    pointsPerWin: league.points_per_win,\n    targetLegs: league.target_legs,",
    "    maxLegs: league.max_legs ?? ((league.target_legs * 2) - 1),\n    pointsPerWin: league.points_per_win,\n    pointsPerDraw: league.points_per_draw ?? 0,\n    pointsPerLoss: league.points_per_loss ?? 0,\n    targetLegs: league.target_legs,",
)
replace(
    "src/server/routes/admin-leagues.ts",
    "    pointsPerWin: league.points_per_win,\n    targetLegs: league.target_legs,",
    "    maxLegs: league.max_legs ?? ((league.target_legs * 2) - 1),\n    pointsPerWin: league.points_per_win,\n    pointsPerDraw: league.points_per_draw ?? 0,\n    pointsPerLoss: league.points_per_loss ?? 0,\n    targetLegs: league.target_legs,",
)
replace(
    "src/server/routes/admin-leagues.ts",
    "      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,\n      targetLegs: body?.targetLegs ?? current.target_legs,",
    "      maxLegs: body?.maxLegs ?? (body?.targetLegs === undefined ? current.max_legs : undefined),\n      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,\n      pointsPerDraw: body?.pointsPerDraw ?? current.points_per_draw,\n      pointsPerLoss: body?.pointsPerLoss ?? current.points_per_loss,\n      targetLegs: body?.targetLegs ?? current.target_legs,",
)
replace(
    "src/server/routes/competition.ts",
    "      matchesPerPair: body?.matchesPerPair ?? current.matches_per_pair,\n      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,\n      targetLegs: body?.targetLegs ?? current.target_legs,",
    "      matchesPerPair: body?.matchesPerPair ?? current.matches_per_pair,\n      maxLegs: body?.maxLegs ?? (body?.targetLegs === undefined ? current.max_legs : undefined),\n      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,\n      pointsPerDraw: body?.pointsPerDraw ?? current.points_per_draw,\n      pointsPerLoss: body?.pointsPerLoss ?? current.points_per_loss,\n      targetLegs: body?.targetLegs ?? current.target_legs,",
)
