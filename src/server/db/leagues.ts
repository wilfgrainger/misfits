import { AppError } from '../errors';
import type { AuthUser } from '../auth/session';
import type { LeagueInput, LeagueStatus, LeagueVisibility } from '../domain/league';

export interface LeagueRecord {
  id: string;
  name: string;
  slug: string;
  season_name: string;
  status: LeagueStatus;
  points_per_win: number;
  target_legs: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  max_players: number;
  matches_per_pair: number;
  visibility: LeagueVisibility;
}

export interface LeagueMemberRecord {
  league_id: string;
  user_id: string;
  active: number;
  joined_at: string;
  username: string | null;
  profile_image_url: string | null;
}

export async function listPublicLeagues(db: D1Database): Promise<LeagueRecord[]> {
  const result = await db.prepare(
    `SELECT id, name, slug, season_name, status, points_per_win, target_legs,
            created_at, updated_at, created_by, max_players, matches_per_pair, visibility
       FROM leagues WHERE visibility = 'PUBLIC'
       ORDER BY status = 'OPEN' DESC, updated_at DESC, name ASC`,
  ).all<LeagueRecord>();
  return result.results;
}

export async function listUserLeagues(db: D1Database, userId: string): Promise<LeagueRecord[]> {
  const result = await db.prepare(
    `SELECT leagues.id, leagues.name, leagues.slug, leagues.season_name, leagues.status,
            leagues.points_per_win, leagues.target_legs, leagues.created_at, leagues.updated_at,
            leagues.created_by, leagues.max_players, leagues.matches_per_pair, leagues.visibility
       FROM leagues LEFT JOIN league_players ON league_players.league_id = leagues.id
      WHERE (leagues.created_by = ? OR (league_players.user_id = ? AND league_players.active = 1))
      GROUP BY leagues.id
      ORDER BY leagues.status = 'OPEN' DESC, leagues.updated_at DESC, leagues.name ASC`,
  ).bind(userId, userId).all<LeagueRecord>();
  return result.results;
}

export async function listManagedLeagues(db: D1Database, userId: string, isMasterAdmin: boolean): Promise<LeagueRecord[]> {
  const statement = isMasterAdmin
    ? db.prepare(
      `SELECT id, name, slug, season_name, status, points_per_win, target_legs,
              created_at, updated_at, created_by, max_players, matches_per_pair, visibility
         FROM leagues ORDER BY status = 'OPEN' DESC, updated_at DESC, name ASC`,
    )
    : db.prepare(
      `SELECT id, name, slug, season_name, status, points_per_win, target_legs,
              created_at, updated_at, created_by, max_players, matches_per_pair, visibility
         FROM leagues WHERE created_by = ?
         ORDER BY status = 'OPEN' DESC, updated_at DESC, name ASC`,
    ).bind(userId);
  const result = await statement.all<LeagueRecord>();
  return result.results;
}

export async function getLeagueByIdOrSlug(db: D1Database, key: string): Promise<LeagueRecord | null> {
  return (await db.prepare(
    `SELECT id, name, slug, season_name, status, points_per_win, target_legs,
            created_at, updated_at, created_by, max_players, matches_per_pair, visibility
       FROM leagues WHERE id = ? OR slug = ?`,
  ).bind(key, key).first<LeagueRecord>()) ?? null;
}

export async function getLeagueById(db: D1Database, id: string): Promise<LeagueRecord | null> {
  return (await db.prepare(
    `SELECT id, name, slug, season_name, status, points_per_win, target_legs,
            created_at, updated_at, created_by, max_players, matches_per_pair, visibility
       FROM leagues WHERE id = ?`,
  ).bind(id).first<LeagueRecord>()) ?? null;
}

export async function getMembership(db: D1Database, leagueId: string, userId: string): Promise<LeagueMemberRecord | null> {
  return (await db.prepare(
    `SELECT league_players.league_id, league_players.user_id, league_players.active,
            league_players.joined_at, users.username, users.profile_image_url
       FROM league_players JOIN users ON users.id = league_players.user_id
      WHERE league_players.league_id = ? AND league_players.user_id = ?`,
  ).bind(leagueId, userId).first<LeagueMemberRecord>()) ?? null;
}

export async function listLeagueMembers(db: D1Database, leagueId: string): Promise<LeagueMemberRecord[]> {
  const result = await db.prepare(
    `SELECT league_players.league_id, league_players.user_id, league_players.active,
            league_players.joined_at, users.username, users.profile_image_url
       FROM league_players JOIN users ON users.id = league_players.user_id
      WHERE league_players.league_id = ? ORDER BY users.username COLLATE NOCASE ASC`,
  ).bind(leagueId).all<LeagueMemberRecord>();
  return result.results;
}

export async function countActiveMembers(db: D1Database, leagueId: string): Promise<number> {
  const row = await db.prepare(
    'SELECT COUNT(*) AS count FROM league_players WHERE league_id = ? AND active = 1',
  ).bind(leagueId).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function getManagedLeague(db: D1Database, user: Pick<AuthUser, 'id' | 'isMasterAdmin'>, leagueId: string): Promise<LeagueRecord> {
  const league = await getLeagueById(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (!user.isMasterAdmin && league.created_by !== user.id) {
    throw new AppError('FORBIDDEN', 'You do not manage this league', 403);
  }
  return league;
}

export async function canViewLeague(db: D1Database, league: LeagueRecord, user?: Pick<AuthUser, 'id' | 'isMasterAdmin'>): Promise<boolean> {
  if (league.visibility !== 'PRIVATE') return true;
  if (!user) return false;
  if (user.isMasterAdmin || league.created_by === user.id) return true;
  const membership = await getMembership(db, league.id, user.id);
  return membership?.active === 1;
}

export async function createLeague(db: D1Database, actorUserId: string, input: LeagueInput, now = new Date()): Promise<LeagueRecord> {
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.prepare(
    `INSERT INTO leagues (id, name, slug, season_name, status, points_per_win, target_legs,
                          created_at, updated_at, created_by, max_players, matches_per_pair, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, input.name, input.slug, input.seasonName, input.status, input.pointsPerWin, input.targetLegs, timestamp, timestamp, actorUserId, input.maxPlayers, input.matchesPerPair, input.visibility).run();
  await db.prepare(
    'INSERT OR IGNORE INTO league_players (league_id, user_id, active, joined_at) VALUES (?, ?, 1, ?)',
  ).bind(id, actorUserId, timestamp).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'LEAGUE_CREATED', 'LEAGUE', ?, NULL, ?, ?)`,
  ).bind(actorUserId, id, JSON.stringify(input), timestamp).run();
  const league = await getLeagueById(db, id);
  if (!league) throw new Error('League could not be loaded after creation');
  return league;
}

export async function updateLeague(db: D1Database, actorUserId: string, leagueId: string, input: LeagueInput, now = new Date()): Promise<LeagueRecord> {
  const before = await getLeagueById(db, leagueId);
  if (!before) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (input.maxPlayers < await countActiveMembers(db, leagueId)) throw new AppError('LEAGUE_FULL', 'Capacity cannot be lower than the active member count', 409);
  const timestamp = now.toISOString();
  await db.prepare(
    `UPDATE leagues
        SET name = ?, slug = ?, season_name = ?, status = ?, points_per_win = ?, target_legs = ?,
            max_players = ?, matches_per_pair = ?, visibility = ?, updated_at = ?
      WHERE id = ?`,
  ).bind(input.name, input.slug, input.seasonName, input.status, input.pointsPerWin, input.targetLegs, input.maxPlayers, input.matchesPerPair, input.visibility, timestamp, leagueId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'LEAGUE_UPDATED', 'LEAGUE', ?, ?, ?, ?)`,
  ).bind(actorUserId, leagueId, JSON.stringify(before), JSON.stringify(input), timestamp).run();
  const after = await getLeagueById(db, leagueId);
  if (!after) throw new Error('League could not be loaded after update');
  return after;
}

export async function setMembershipActive(db: D1Database, actorUserId: string, leagueId: string, userId: string, active: boolean, now = new Date()): Promise<LeagueMemberRecord> {
  const before = await getMembership(db, leagueId, userId);
  if (!before) throw new AppError('VALIDATION_ERROR', 'League member was not found', 404);
  if (active && before.active !== 1) {
    const league = await getLeagueById(db, leagueId);
    if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
    const reactivated = await db.prepare(
      `UPDATE league_players SET active = 1
        WHERE league_id = ? AND user_id = ? AND active = 0
          AND (SELECT COUNT(*) FROM league_players WHERE league_id = ? AND active = 1) < ?`,
    ).bind(leagueId, userId, leagueId, league.max_players).run();
    if (reactivated.meta.changes !== 1) throw new AppError('LEAGUE_FULL', 'This league has reached its player limit', 409);
  } else {
    await db.prepare('UPDATE league_players SET active = ? WHERE league_id = ? AND user_id = ?')
      .bind(active ? 1 : 0, leagueId, userId).run();
  }
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'LEAGUE_MEMBER_UPDATED', 'LEAGUE_MEMBER', ?, ?, ?, ?)`,
  ).bind(actorUserId, `${leagueId}:${userId}`, JSON.stringify({ active: before.active === 1 }), JSON.stringify({ active }), now.toISOString()).run();
  const after = await getMembership(db, leagueId, userId);
  if (!after) throw new Error('League member could not be loaded after update');
  return after;
}
