import { AppError } from '../errors';
import { getSeason, listSeasonLeagues, type CompetitionLeagueRecord } from './competition';

interface SourcePlacement {
  league_id: string;
  season_id: string;
  user_id: string;
  active: number;
  joined_at: string;
  hierarchy_position: number;
}

interface TargetPlacement {
  league_id: string;
  season_id: string;
  user_id: string;
  active: number;
  joined_at: string;
}

export interface DraftPlacement {
  userId: string;
  leagueId: string;
}

function byHierarchy(leagues: CompetitionLeagueRecord[]): Map<number, CompetitionLeagueRecord> {
  return new Map(leagues.map((league) => [league.hierarchy_position, league]));
}

export async function copySeasonMembershipBaseline(
  db: D1Database,
  actorUserId: string,
  fromSeasonId: string,
  toSeasonId: string,
  now = new Date(),
): Promise<DraftPlacement[]> {
  if (fromSeasonId === toSeasonId) throw new AppError('VALIDATION_ERROR', 'Draft target season must differ from the source season', 409);
  const sourceSeason = await getSeason(db, fromSeasonId);
  const targetSeason = await getSeason(db, toSeasonId);
  if (!sourceSeason || !targetSeason) throw new AppError('LEAGUE_NOT_FOUND', 'Source or target season was not found', 404);
  if (targetSeason.status !== 'DRAFT') throw new AppError('VALIDATION_ERROR', 'Baseline placements can only be copied into a draft season', 409);

  const sourceLeagues = await listSeasonLeagues(db, fromSeasonId);
  const targetLeagues = await listSeasonLeagues(db, toSeasonId);
  if (sourceLeagues.length === 0 || targetLeagues.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Both seasons need league structure before placements can be copied', 409);
  }
  const targetByHierarchy = byHierarchy(targetLeagues);
  for (const sourceLeague of sourceLeagues) {
    if (!targetByHierarchy.has(sourceLeague.hierarchy_position)) {
      throw new AppError('VALIDATION_ERROR', `Target season is missing hierarchy position ${sourceLeague.hierarchy_position}`, 409);
    }
  }

  const source = await db.prepare(
    `SELECT lp.league_id, lp.season_id, lp.user_id, lp.active, lp.joined_at, l.hierarchy_position
       FROM league_players lp
       JOIN leagues l ON l.id = lp.league_id
       JOIN users u ON u.id = lp.user_id
      WHERE lp.season_id = ? AND lp.active = 1
        AND u.status = 'ACTIVE' AND u.club_status = 'APPROVED' AND u.role = 'PLAYER'
      ORDER BY l.hierarchy_position, lp.user_id`,
  ).bind(fromSeasonId).all<SourcePlacement>();

  const placements: DraftPlacement[] = source.results.map((membership) => {
    const targetLeague = targetByHierarchy.get(membership.hierarchy_position);
    if (!targetLeague) throw new AppError('VALIDATION_ERROR', 'Every source placement must map to one target league', 409);
    return { userId: membership.user_id, leagueId: targetLeague.id };
  });

  const existing = await db.prepare(
    `SELECT league_id, season_id, user_id, active, joined_at
       FROM league_players
      WHERE season_id = ? AND active = 1`,
  ).bind(toSeasonId).all<TargetPlacement>();
  const desiredByUser = new Map(placements.map((placement) => [placement.userId, placement.leagueId]));
  for (const row of existing.results) {
    const desired = desiredByUser.get(row.user_id);
    if (desired && desired !== row.league_id) {
      throw new AppError('VALIDATION_ERROR', 'A player already has a different active placement in the draft season', 409);
    }
  }

  const targetById = new Map(targetLeagues.map((league) => [league.id, league]));
  const sourceUsers = new Set(placements.map((placement) => placement.userId));
  const occupancy = new Map<string, number>();
  for (const placement of placements) occupancy.set(placement.leagueId, (occupancy.get(placement.leagueId) ?? 0) + 1);
  for (const row of existing.results) {
    if (sourceUsers.has(row.user_id)) continue;
    occupancy.set(row.league_id, (occupancy.get(row.league_id) ?? 0) + 1);
  }
  for (const [leagueId, count] of occupancy) {
    const league = targetById.get(leagueId);
    if (!league) throw new AppError('VALIDATION_ERROR', 'Draft placement points outside the target season', 409);
    if (count > league.max_players) throw new AppError('LEAGUE_FULL', `Target league capacity would be exceeded for ${league.name}`, 409);
  }

  const at = now.toISOString();
  const statements: D1PreparedStatement[] = placements.map((placement) => db.prepare(
    `INSERT INTO league_players (league_id, user_id, active, joined_at, season_id)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(league_id, user_id) DO UPDATE SET active = 1, season_id = excluded.season_id`,
  ).bind(placement.leagueId, placement.userId, at, toSeasonId));
  statements.push(db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'SEASON_MEMBERSHIP_BASELINE_COPIED', 'SEASON', ?, NULL, ?, ?)`,
  ).bind(actorUserId, toSeasonId, JSON.stringify({ fromSeasonId, toSeasonId, placements }), at));
  await db.batch(statements);
  return placements.sort((left, right) => left.userId.localeCompare(right.userId));
}
