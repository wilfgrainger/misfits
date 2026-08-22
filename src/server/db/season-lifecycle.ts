import { AppError } from '../errors';
import type { SeasonInput } from '../domain/competition';
import { createSeason, getSeason, listSeasonLeagues, updateSeason, type CompetitionLeagueRecord, type SeasonRecord } from './competition';
import { createSeasonLeague } from './competition-leagues';

export async function assertSeasonReadyToOpen(db: D1Database, seasonId: string): Promise<void> {
  const leagues = await listSeasonLeagues(db, seasonId);
  if (leagues.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Add at least one league before opening this season', 409);
  }

  for (const league of leagues) {
    const roster = await db.prepare(
      `SELECT COUNT(*) AS count
         FROM league_players lp
         JOIN users u ON u.id = lp.user_id
        WHERE lp.league_id = ?
          AND lp.season_id = ?
          AND lp.active = 1
          AND u.status = 'ACTIVE'`,
    ).bind(league.id, seasonId).first<{ count: number }>();
    if (Number(roster?.count ?? 0) < 2) {
      throw new AppError('VALIDATION_ERROR', `${league.name} needs at least two active players before the season can open`, 409);
    }
  }
}

export async function updateSeasonLifecycle(
  db: D1Database,
  actorUserId: string,
  seasonId: string,
  input: SeasonInput,
  now = new Date(),
): Promise<SeasonRecord> {
  const before = await getSeason(db, seasonId);
  if (!before) throw new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404);
  if (before.status === 'CLOSED' && input.status !== 'CLOSED') {
    throw new AppError('VALIDATION_ERROR', 'A closed season is historical and cannot be reopened', 409);
  }
  if (before.status !== 'OPEN' && input.status === 'OPEN') {
    await assertSeasonReadyToOpen(db, seasonId);
  }

  const saved = await updateSeason(db, actorUserId, seasonId, input, now);
  if (input.status === 'OPEN') {
    await db.prepare(`UPDATE leagues SET status = 'OPEN', updated_at = ? WHERE season_id = ?`).bind(now.toISOString(), seasonId).run();
  }
  return saved;
}

export async function cloneSeasonStructure(
  db: D1Database,
  actorUserId: string,
  sourceSeasonId: string,
  targetName: string,
  now = new Date(),
): Promise<{ season: SeasonRecord; leagues: CompetitionLeagueRecord[] }> {
  const source = await getSeason(db, sourceSeasonId);
  if (!source) throw new AppError('LEAGUE_NOT_FOUND', 'Source season was not found', 404);
  const sourceLeagues = await listSeasonLeagues(db, sourceSeasonId);
  if (sourceLeagues.length === 0) throw new AppError('VALIDATION_ERROR', 'Source season has no league structure to copy', 409);

  const season = await createSeason(db, actorUserId, { name: targetName, status: 'DRAFT', isCurrent: false }, now);
  const suffix = season.id.replace(/-/g, '').slice(0, 8).toLowerCase();
  const leagues: CompetitionLeagueRecord[] = [];
  for (const sourceLeague of sourceLeagues) {
    leagues.push(await createSeasonLeague(db, actorUserId, season.id, {
      name: sourceLeague.name,
      slug: `${sourceLeague.slug}-${suffix}`,
      maxPlayers: sourceLeague.max_players,
      matchesPerPair: sourceLeague.matches_per_pair,
      pointsPerWin: sourceLeague.points_per_win,
      targetLegs: sourceLeague.target_legs,
      visibility: sourceLeague.visibility,
      hierarchyPosition: sourceLeague.hierarchy_position,
      promotionPlaces: sourceLeague.promotion_places,
      relegationPlaces: sourceLeague.relegation_places,
    } as never, now));
  }

  return { season, leagues };
}
