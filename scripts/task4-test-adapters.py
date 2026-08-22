from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count} matches, found {actual} for {old[:120]!r}")
    file.write_text(text.replace(old, new))


# Legacy league-route D1 fake: decode migration-0005 create/update bind order.
replace(
    'tests/server/league-routes.test.ts',
    "  points_per_win: number;\n  target_legs: number;",
    "  max_legs: number;\n  points_per_win: number;\n  points_per_draw: number;\n  points_per_loss: number;\n  target_legs: number;",
)
replace(
    'tests/server/league-routes.test.ts',
    "      const [id, name, slug, seasonName, status, pointsPerWin, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, 'OPEN' | 'CLOSED', number, number, string, string, string, number, number, 'PUBLIC' | 'PRIVATE'];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility: visibility ?? 'PUBLIC' });",
    "      const [id, name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, 'OPEN' | 'CLOSED', number, number, number, number, number, string, string, string, number, number, 'PUBLIC' | 'PRIVATE'];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility: visibility ?? 'PUBLIC' });",
)
replace(
    'tests/server/league-routes.test.ts',
    "      const [name, slug, seasonName, status, pointsPerWin, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id] = values as [string, string, string, 'OPEN' | 'CLOSED', number, number, number, number, 'PUBLIC' | 'PRIVATE', string, string];\n      if (sql.includes('SELECT COUNT(*) FROM league_players')) {\n        const activeCount = [...this.memberships].filter((key) => key.startsWith(`${String(values[11])}:`)).length;\n        if (activeCount > Number(values[6])) return { success: true, meta: { changes: 0 } };\n      }\n      const league = this.leagues.get(id)!;\n      Object.assign(league, { name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility: visibility ?? 'PUBLIC', updated_at: updatedAt });",
    "      const [name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id, countLeagueId, capacity] = values as [string, string, string, 'OPEN' | 'CLOSED', number, number, number, number, number, number, number, 'PUBLIC' | 'PRIVATE', string, string, string, number];\n      if (sql.includes('SELECT COUNT(*) FROM league_players')) {\n        const activeCount = [...this.memberships].filter((key) => key.startsWith(`${countLeagueId}:`)).length;\n        if (activeCount > capacity) return { success: true, meta: { changes: 0 } };\n      }\n      const league = this.leagues.get(id)!;\n      Object.assign(league, { name, slug, season_name: seasonName, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility: visibility ?? 'PUBLIC', updated_at: updatedAt });",
)

# End-to-end authenticated flow D1 fake uses the same legacy league CRUD SQL.
replace(
    'tests/server/authenticated-league-flow.test.ts',
    "  points_per_win: number;\n  target_legs: number;",
    "  max_legs: number;\n  points_per_win: number;\n  points_per_draw: number;\n  points_per_loss: number;\n  target_legs: number;",
)
replace(
    'tests/server/authenticated-league-flow.test.ts',
    "      const [id, name, slug, seasonName, status, pointsPerWin, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, League['status'], number, number, string, string, string, number, number, League['visibility']];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility });",
    "      const [id, name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, League['status'], number, number, number, number, number, string, string, string, number, number, League['visibility']];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility });",
)
replace(
    'tests/server/authenticated-league-flow.test.ts',
    "      const [name, slug, seasonName, status, pointsPerWin, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id] = values as [string, string, string, string, League['status'], number, number, number, League['visibility'], string, string];\n      const league = this.leagues.get(id)!;\n      const activeCount = [...this.memberships.values()].filter((member) => member.league_id === id && member.active === 1).length;\n      if (activeCount > maxPlayers) return { success: true, meta: { changes: 0 } };\n      Object.assign(league, { name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility, updated_at: updatedAt });",
    "      const [name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id] = values as [string, string, string, League['status'], number, number, number, number, number, number, number, League['visibility'], string, string];\n      const league = this.leagues.get(id)!;\n      const activeCount = [...this.memberships.values()].filter((member) => member.league_id === id && member.active === 1).length;\n      if (activeCount > maxPlayers) return { success: true, meta: { changes: 0 } };\n      Object.assign(league, { name, slug, season_name: seasonName, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility, updated_at: updatedAt });",
)

# Season competition route D1 fake: update season-scoped league bind decoding.
replace(
    'tests/server/competition-routes.test.ts',
    "  points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string | null;",
    "  max_legs: number; points_per_win: number; points_per_draw: number; points_per_loss: number; target_legs: number; created_at: string; updated_at: string; created_by: string | null;",
)
replace(
    'tests/server/competition-routes.test.ts',
    "      const [id, name, slug, seasonName, seasonId, status, points, legs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, 'OPEN' | 'CLOSED', number, number, string, string, string, number, number, 'PUBLIC' | 'PRIVATE', number, number, number];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, points_per_win: points, target_legs: legs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });",
    "      const [id, name, slug, seasonName, seasonId, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, 'OPEN' | 'CLOSED', number, number, number, number, number, string, string, string, number, number, 'PUBLIC' | 'PRIVATE', number, number, number];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });",
)
replace(
    'tests/server/competition-routes.test.ts',
    "      const [name, slug, points, legs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt, id] = values as [string, string, number, number, number, number, 'PUBLIC' | 'PRIVATE', number, number, number, string, string];\n      const league = this.leagues.get(id)!;\n      Object.assign(league, { name, slug, points_per_win: points, target_legs: legs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });",
    "      const [name, slug, win, draw, loss, maxLegs, targetLegs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt, id] = values as [string, string, number, number, number, number, number, number, number, 'PUBLIC' | 'PRIVATE', number, number, number, string, string];\n      const league = this.leagues.get(id)!;\n      Object.assign(league, { name, slug, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });",
)

# Focused league-structure audit fake follows the same season-scoped SQL.
replace(
    'tests/release/story-admin-league-structure.test.ts',
    "  points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string | null;",
    "  max_legs: number; points_per_win: number; points_per_draw: number; points_per_loss: number; target_legs: number; created_at: string; updated_at: string; created_by: string | null;",
)
replace(
    'tests/release/story-admin-league-structure.test.ts',
    "      const [id, name, slug, seasonName, seasonId, status, points, legs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, League['status'], number, number, string, string, string, number, number, League['visibility'], number, number, number];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, points_per_win: points, target_legs: legs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });",
    "      const [id, name, slug, seasonName, seasonId, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, League['status'], number, number, number, number, number, string, string, string, number, number, League['visibility'], number, number, number];\n      this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });",
)
replace(
    'tests/release/story-admin-league-structure.test.ts',
    "      const [name, slug, points, legs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt, id] = values as [string, string, number, number, number, number, League['visibility'], number, number, number, string, string];\n      const league = this.leagues.get(id)!;\n      Object.assign(league, { name, slug, points_per_win: points, target_legs: legs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });",
    "      const [name, slug, win, draw, loss, maxLegs, targetLegs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt, id] = values as [string, string, number, number, number, number, number, number, number, League['visibility'], number, number, number, string, string];\n      const league = this.leagues.get(id)!;\n      Object.assign(league, { name, slug, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });",
)
