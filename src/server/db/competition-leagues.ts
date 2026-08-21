import { AppError } from '../errors';
import type { CompetitionLeagueInput } from '../domain/competition';
import { getCompetitionLeague, getSeason, leagueHasFixturesOrResults, type CompetitionLeagueRecord } from './competition';

export async function createSeasonLeague(
  db: D1Database,
  actorUserId: string,
  seasonId: string,
  input: CompetitionLeagueInput,
  now = new Date(),
): Promise<CompetitionLeagueRecord> {
  const season = await getSeason(db, seasonId);
  if (!season) throw new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404);
  if (season.status === 'CLOSED') throw new AppError('LEAGUE_CLOSED', 'A closed season cannot accept a new league', 409);
  const id = crypto.randomUUID();
  const at = now.toISOString();
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO leagues (
          id, name, slug, season_name, season_id, status, points_per_win, target_legs,
          created_at, updated_at, created_by, max_players, matches_per_pair, visibility,
          hierarchy_position, promotion_places, relegation_places
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        input.name,
        input.slug,
        season.name,
        seasonId,
        season.status === 'OPEN' ? 'OPEN' : 'CLOSED',
        input.pointsPerWin,
        input.targetLegs,
        at,
        at,
        actorUserId,
        input.maxPlayers,
        input.matchesPerPair,
        input.visibility,
        input.hierarchyPosition,
        input.promotionPlaces,
        input.relegationPlaces,
      ),
      db.prepare(
        `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
         VALUES (?, 'SEASON_LEAGUE_CREATED', 'LEAGUE', ?, NULL, ?, ?)`,
      ).bind(actorUserId, id, JSON.stringify({ seasonId, ...input }), at),
    ]);
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      throw new AppError('VALIDATION_ERROR', 'League slug or hierarchy position conflicts with existing competition data', 409);
    }
    throw error;
  }
  const league = await getCompetitionLeague(db, id);
  if (!league) throw new Error('League could not be loaded after creation');
  return league;
}

export async function updateSeasonLeague(
  db: D1Database,
  actorUserId: string,
  leagueId: string,
  input: CompetitionLeagueInput,
  now = new Date(),
): Promise<CompetitionLeagueRecord> {
  const before = await getCompetitionLeague(db, leagueId);
  if (!before) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (await leagueHasFixturesOrResults(db, leagueId)) {
    const competitionChanged =
      before.matches_per_pair !== input.matchesPerPair ||
      before.points_per_win !== input.pointsPerWin ||
      before.target_legs !== input.targetLegs ||
      before.hierarchy_position !== input.hierarchyPosition ||
      before.promotion_places !== input.promotionPlaces ||
      before.relegation_places !== input.relegationPlaces;
    if (competitionChanged) throw new AppError('VALIDATION_ERROR', 'Competition rules and hierarchy are locked after fixtures or results exist', 409);
  }
  const activeCount = await db.prepare('SELECT COUNT(*) AS count FROM league_players WHERE league_id = ? AND active = 1').bind(leagueId).first<{ count: number }>();
  if (Number(activeCount?.count ?? 0) > input.maxPlayers) throw new AppError('LEAGUE_FULL', 'Capacity cannot be lower than the active member count', 409);
  const at = now.toISOString();
  try {
    await db.batch([
      db.prepare(
        `UPDATE leagues SET
          name = ?, slug = ?, points_per_win = ?, target_legs = ?, max_players = ?, matches_per_pair = ?,
          visibility = ?, hierarchy_position = ?, promotion_places = ?, relegation_places = ?, updated_at = ?
         WHERE id = ?`,
      ).bind(
        input.name,
        input.slug,
        input.pointsPerWin,
        input.targetLegs,
        input.maxPlayers,
        input.matchesPerPair,
        input.visibility,
        input.hierarchyPosition,
        input.promotionPlaces,
        input.relegationPlaces,
        at,
        leagueId,
      ),
      db.prepare(
        `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
         VALUES (?, 'SEASON_LEAGUE_UPDATED', 'LEAGUE', ?, ?, ?, ?)`,
      ).bind(actorUserId, leagueId, JSON.stringify(before), JSON.stringify(input), at),
    ]);
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      throw new AppError('VALIDATION_ERROR', 'League slug or hierarchy position conflicts with existing competition data', 409);
    }
    throw error;
  }
  const saved = await getCompetitionLeague(db, leagueId);
  if (!saved) throw new Error('League could not be loaded after update');
  return saved;
}

export async function deleteEmptySeasonLeague(db: D1Database, actorUserId: string, leagueId: string, now = new Date()): Promise<void> {
  const league = await getCompetitionLeague(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (await leagueHasFixturesOrResults(db, leagueId)) throw new AppError('VALIDATION_ERROR', 'League already contains competition data', 409);
  const memberCount = await db.prepare('SELECT COUNT(*) AS count FROM league_players WHERE league_id = ?').bind(leagueId).first<{ count: number }>();
  if (Number(memberCount?.count ?? 0) > 0) throw new AppError('VALIDATION_ERROR', 'Remove league memberships before deleting this league', 409);
  const at = now.toISOString();
  await db.batch([
    db.prepare('DELETE FROM leagues WHERE id = ?').bind(leagueId),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, 'SEASON_LEAGUE_DELETED', 'LEAGUE', ?, ?, NULL, ?)`,
    ).bind(actorUserId, leagueId, JSON.stringify(league), at),
  ]);
}
