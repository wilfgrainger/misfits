import { AppError } from '../errors';
import {
  generateRoundRobinFixtures,
  pairKey,
  type FixtureStatus,
  type SeasonInput,
  type SeasonStatus,
} from '../domain/competition';

export interface SeasonRecord {
  id: string;
  name: string;
  status: SeasonStatus;
  is_current: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface CompetitionLeagueRecord {
  id: string;
  name: string;
  slug: string;
  season_name: string;
  season_id: string | null;
  status: 'OPEN' | 'CLOSED';
  max_legs: number;
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  target_legs: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  max_players: number;
  matches_per_pair: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  hierarchy_position: number;
  promotion_places: number;
  relegation_places: number;
}

export interface CompetitionMembershipRecord {
  league_id: string;
  season_id: string | null;
  user_id: string;
  active: number;
  joined_at: string;
  username: string | null;
  profile_image_url: string | null;
  email?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export interface FixtureRecord {
  id: string;
  season_id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  pair_key: string;
  round: number;
  meeting_number: number;
  status: FixtureStatus;
  created_at: string;
  updated_at: string;
  voided_at: string | null;
  player_a_username?: string | null;
  player_b_username?: string | null;
  result_id?: string | null;
}

export interface FixturePreview {
  seasonId: string;
  leagueId: string;
  playerCount: number;
  matchesPerPair: number;
  expectedFixtureCount: number;
  fixtures: Array<{ playerAId: string; playerBId: string; round: number; meetingNumber: number }>;
}

export interface SeasonHealth {
  unassignedPlayers: number;
  outstandingFixtures: number;
  pendingConfirmations: number;
  disputes: number;
}

function timestamp(now = new Date()): string {
  return now.toISOString();
}

export async function listSeasons(db: D1Database): Promise<SeasonRecord[]> {
  const result = await db.prepare(
    `SELECT id, name, status, is_current, created_at, updated_at, closed_at
       FROM seasons
      ORDER BY is_current DESC,
               CASE status WHEN 'OPEN' THEN 0 WHEN 'DRAFT' THEN 1 ELSE 2 END,
               updated_at DESC, name DESC`,
  ).all<SeasonRecord>();
  return result.results;
}

export async function getSeason(db: D1Database, seasonId: string): Promise<SeasonRecord | null> {
  return (await db.prepare(
    `SELECT id, name, status, is_current, created_at, updated_at, closed_at
       FROM seasons WHERE id = ?`,
  ).bind(seasonId).first<SeasonRecord>()) ?? null;
}

export async function createSeason(db: D1Database, actorUserId: string, input: SeasonInput, now = new Date()): Promise<SeasonRecord> {
  const id = crypto.randomUUID();
  const at = timestamp(now);
  const statements: D1PreparedStatement[] = [];
  if (input.isCurrent) statements.push(db.prepare('UPDATE seasons SET is_current = 0 WHERE is_current = 1'));
  statements.push(db.prepare(
    `INSERT INTO seasons (id, name, status, is_current, created_at, updated_at, closed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, input.name, input.status, input.isCurrent ? 1 : 0, at, at, input.status === 'CLOSED' ? at : null));
  statements.push(db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'SEASON_CREATED', 'SEASON', ?, NULL, ?, ?)`,
  ).bind(actorUserId, id, JSON.stringify(input), at));
  await db.batch(statements);
  const created = await getSeason(db, id);
  if (!created) throw new Error('Season could not be loaded after creation');
  return created;
}

export async function seasonHasCompetitionData(db: D1Database, seasonId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM leagues WHERE season_id = ?) +
       (SELECT COUNT(*) FROM fixtures WHERE season_id = ?) AS count`,
  ).bind(seasonId, seasonId).first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
}

export async function updateSeason(db: D1Database, actorUserId: string, seasonId: string, input: SeasonInput, now = new Date()): Promise<SeasonRecord> {
  const before = await getSeason(db, seasonId);
  if (!before) throw new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404);
  if (before.status === 'CLOSED' && input.status === 'DRAFT') throw new AppError('VALIDATION_ERROR', 'A closed season cannot return to draft', 409);
  const at = timestamp(now);
  const statements: D1PreparedStatement[] = [];
  if (input.isCurrent) statements.push(db.prepare('UPDATE seasons SET is_current = 0 WHERE is_current = 1 AND id <> ?').bind(seasonId));
  statements.push(db.prepare(
    `UPDATE seasons
        SET name = ?, status = ?, is_current = ?, updated_at = ?,
            closed_at = CASE WHEN ? = 'CLOSED' THEN COALESCE(closed_at, ?) ELSE NULL END
      WHERE id = ?`,
  ).bind(input.name, input.status, input.isCurrent ? 1 : 0, at, input.status, at, seasonId));
  statements.push(db.prepare(
    `UPDATE leagues SET season_name = ?, status = CASE WHEN ? = 'CLOSED' THEN 'CLOSED' ELSE status END, updated_at = ?
      WHERE season_id = ?`,
  ).bind(input.name, input.status, at, seasonId));
  statements.push(db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'SEASON_UPDATED', 'SEASON', ?, ?, ?, ?)`,
  ).bind(actorUserId, seasonId, JSON.stringify(before), JSON.stringify(input), at));
  await db.batch(statements);
  const saved = await getSeason(db, seasonId);
  if (!saved) throw new Error('Season could not be loaded after update');
  return saved;
}

export async function deleteEmptyDraftSeason(db: D1Database, actorUserId: string, seasonId: string, now = new Date()): Promise<void> {
  const season = await getSeason(db, seasonId);
  if (!season) throw new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404);
  if (season.status !== 'DRAFT') throw new AppError('VALIDATION_ERROR', 'Only a draft season can be deleted', 409);
  if (await seasonHasCompetitionData(db, seasonId)) throw new AppError('VALIDATION_ERROR', 'This season already contains competition data', 409);
  const at = timestamp(now);
  await db.batch([
    db.prepare('DELETE FROM seasons WHERE id = ? AND status = \'DRAFT\'').bind(seasonId),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, 'SEASON_DELETED', 'SEASON', ?, ?, NULL, ?)`,
    ).bind(actorUserId, seasonId, JSON.stringify(season), at),
  ]);
}

export async function listSeasonLeagues(db: D1Database, seasonId: string): Promise<CompetitionLeagueRecord[]> {
  const result = await db.prepare(
    `SELECT id, name, slug, season_name, season_id, status, max_legs, points_per_win, points_per_draw, points_per_loss, target_legs,
            created_at, updated_at, created_by, max_players, matches_per_pair, visibility,
            hierarchy_position, promotion_places, relegation_places
       FROM leagues WHERE season_id = ?
      ORDER BY hierarchy_position ASC, name COLLATE NOCASE ASC`,
  ).bind(seasonId).all<CompetitionLeagueRecord>();
  return result.results;
}

export async function getCompetitionLeague(db: D1Database, leagueId: string): Promise<CompetitionLeagueRecord | null> {
  return (await db.prepare(
    `SELECT id, name, slug, season_name, season_id, status, max_legs, points_per_win, points_per_draw, points_per_loss, target_legs,
            created_at, updated_at, created_by, max_players, matches_per_pair, visibility,
            hierarchy_position, promotion_places, relegation_places
       FROM leagues WHERE id = ?`,
  ).bind(leagueId).first<CompetitionLeagueRecord>()) ?? null;
}

export async function leagueHasFixturesOrResults(db: D1Database, leagueId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM fixtures WHERE league_id = ?) +
      (SELECT COUNT(*) FROM matches WHERE league_id = ? AND deleted_at IS NULL) AS count`,
  ).bind(leagueId, leagueId).first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
}

export async function listCompetitionMemberships(db: D1Database, leagueId: string): Promise<CompetitionMembershipRecord[]> {
  const result = await db.prepare(
    `SELECT lp.league_id, lp.season_id, lp.user_id, lp.active, lp.joined_at,
            u.username, u.profile_image_url, u.email, u.status
       FROM league_players lp
       JOIN users u ON u.id = lp.user_id
      WHERE lp.league_id = ?
      ORDER BY lp.active DESC, u.username COLLATE NOCASE ASC`,
  ).bind(leagueId).all<CompetitionMembershipRecord>();
  return result.results;
}

export async function listUnassignedUsers(db: D1Database, seasonId: string): Promise<Array<{ id: string; username: string | null; email: string; status: string }>> {
  const result = await db.prepare(
    `SELECT u.id, u.username, u.email, u.status
       FROM users u
      WHERE u.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM league_players lp
           WHERE lp.user_id = u.id AND lp.season_id = ? AND lp.active = 1
        )
      ORDER BY u.username COLLATE NOCASE ASC, u.email COLLATE NOCASE ASC`,
  ).bind(seasonId).all<{ id: string; username: string | null; email: string; status: string }>();
  return result.results;
}

export async function assignUserToLeague(db: D1Database, actorUserId: string, seasonId: string, leagueId: string, userId: string, now = new Date()): Promise<void> {
  const league = await getCompetitionLeague(db, leagueId);
  if (!league || league.season_id !== seasonId) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found in this season', 404);
  if (await leagueHasFixturesOrResults(db, leagueId)) throw new AppError('VALIDATION_ERROR', 'League membership is locked after fixtures or results exist', 409);
  const user = await db.prepare('SELECT id, status FROM users WHERE id = ?').bind(userId).first<{ id: string; status: string }>();
  if (!user || user.status !== 'ACTIVE') throw new AppError('VALIDATION_ERROR', 'Only an active club account can be assigned', 409);
  const capacity = await db.prepare('SELECT COUNT(*) AS count FROM league_players WHERE league_id = ? AND active = 1').bind(leagueId).first<{ count: number }>();
  if (Number(capacity?.count ?? 0) >= league.max_players) throw new AppError('LEAGUE_FULL', 'This league has reached its player limit', 409);
  const existing = await db.prepare('SELECT league_id FROM league_players WHERE season_id = ? AND user_id = ? AND active = 1').bind(seasonId, userId).first<{ league_id: string }>();
  if (existing && existing.league_id !== leagueId) throw new AppError('VALIDATION_ERROR', 'This player is already assigned to another league in this season', 409);
  const at = timestamp(now);
  await db.batch([
    db.prepare(
      `INSERT INTO league_players (league_id, user_id, active, joined_at, season_id)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(league_id, user_id) DO UPDATE SET active = 1, season_id = excluded.season_id`,
    ).bind(leagueId, userId, at, seasonId),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, 'LEAGUE_MEMBER_ASSIGNED', 'LEAGUE_MEMBER', ?, NULL, ?, ?)`,
    ).bind(actorUserId, `${seasonId}:${leagueId}:${userId}`, JSON.stringify({ seasonId, leagueId, userId, active: true }), at),
  ]);
}

export async function moveUserBetweenLeagues(db: D1Database, actorUserId: string, seasonId: string, fromLeagueId: string, toLeagueId: string, userId: string, now = new Date()): Promise<void> {
  if (fromLeagueId === toLeagueId) return;
  if (await leagueHasFixturesOrResults(db, fromLeagueId) || await leagueHasFixturesOrResults(db, toLeagueId)) {
    throw new AppError('VALIDATION_ERROR', 'Player placement is locked after fixtures or results exist', 409);
  }
  const toLeague = await getCompetitionLeague(db, toLeagueId);
  if (!toLeague || toLeague.season_id !== seasonId) throw new AppError('LEAGUE_NOT_FOUND', 'Target league was not found in this season', 404);
  const existing = await db.prepare('SELECT active FROM league_players WHERE league_id = ? AND user_id = ? AND season_id = ?').bind(fromLeagueId, userId, seasonId).first<{ active: number }>();
  if (!existing?.active) throw new AppError('VALIDATION_ERROR', 'Source league membership was not found', 404);
  const count = await db.prepare('SELECT COUNT(*) AS count FROM league_players WHERE league_id = ? AND active = 1').bind(toLeagueId).first<{ count: number }>();
  if (Number(count?.count ?? 0) >= toLeague.max_players) throw new AppError('LEAGUE_FULL', 'Target league has reached its player limit', 409);
  const at = timestamp(now);
  await db.batch([
    db.prepare('UPDATE league_players SET active = 0 WHERE league_id = ? AND user_id = ? AND season_id = ?').bind(fromLeagueId, userId, seasonId),
    db.prepare(
      `INSERT INTO league_players (league_id, user_id, active, joined_at, season_id)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(league_id, user_id) DO UPDATE SET active = 1, season_id = excluded.season_id`,
    ).bind(toLeagueId, userId, at, seasonId),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, 'LEAGUE_MEMBER_MOVED', 'LEAGUE_MEMBER', ?, ?, ?, ?)`,
    ).bind(actorUserId, `${seasonId}:${userId}`, JSON.stringify({ leagueId: fromLeagueId }), JSON.stringify({ leagueId: toLeagueId }), at),
  ]);
}

export async function previewLeagueFixtures(db: D1Database, leagueId: string): Promise<FixturePreview> {
  const league = await getCompetitionLeague(db, leagueId);
  if (!league?.season_id) throw new AppError('VALIDATION_ERROR', 'League is not attached to a season', 409);
  const members = await db.prepare(
    `SELECT lp.user_id
       FROM league_players lp JOIN users u ON u.id = lp.user_id
      WHERE lp.league_id = ? AND lp.season_id = ? AND lp.active = 1 AND u.status = 'ACTIVE'
      ORDER BY lp.user_id ASC`,
  ).bind(leagueId, league.season_id).all<{ user_id: string }>();
  if (members.results.length < 2) throw new AppError('VALIDATION_ERROR', 'At least two active league members are required', 409);
  const allActive = await db.prepare('SELECT COUNT(*) AS count FROM league_players WHERE league_id = ? AND active = 1').bind(leagueId).first<{ count: number }>();
  if (Number(allActive?.count ?? 0) !== members.results.length) throw new AppError('VALIDATION_ERROR', 'Resolve suspended or invalid league members before generating fixtures', 409);
  const fixtures = generateRoundRobinFixtures(members.results.map((row) => row.user_id), league.matches_per_pair);
  return {
    seasonId: league.season_id,
    leagueId,
    playerCount: members.results.length,
    matchesPerPair: league.matches_per_pair,
    expectedFixtureCount: fixtures.length,
    fixtures,
  };
}

export async function commitLeagueFixtures(db: D1Database, actorUserId: string, leagueId: string, now = new Date()): Promise<FixtureRecord[]> {
  const existing = await db.prepare('SELECT COUNT(*) AS count FROM fixtures WHERE league_id = ?').bind(leagueId).first<{ count: number }>();
  if (Number(existing?.count ?? 0) > 0) return listFixtures(db, leagueId);
  const preview = await previewLeagueFixtures(db, leagueId);
  const at = timestamp(now);
  const statements = preview.fixtures.map((fixture) => db.prepare(
    `INSERT INTO fixtures (id, season_id, league_id, player_a_id, player_b_id, pair_key, round, meeting_number, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OUTSTANDING', ?, ?)`,
  ).bind(crypto.randomUUID(), preview.seasonId, leagueId, fixture.playerAId, fixture.playerBId, pairKey(fixture.playerAId, fixture.playerBId), fixture.round, fixture.meetingNumber, at, at));
  statements.push(db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'FIXTURES_GENERATED', 'LEAGUE', ?, NULL, ?, ?)`,
  ).bind(actorUserId, leagueId, JSON.stringify({ fixtureCount: preview.expectedFixtureCount, matchesPerPair: preview.matchesPerPair }), at));
  await db.batch(statements);
  return listFixtures(db, leagueId);
}

export async function listFixtures(db: D1Database, leagueId: string, status?: FixtureStatus): Promise<FixtureRecord[]> {
  const result = await db.prepare(
    `SELECT f.id, f.season_id, f.league_id, f.player_a_id, f.player_b_id, f.pair_key,
            f.round, f.meeting_number, f.status, f.created_at, f.updated_at, f.voided_at,
            a.username AS player_a_username, b.username AS player_b_username,
            m.id AS result_id
       FROM fixtures f
       JOIN users a ON a.id = f.player_a_id
       JOIN users b ON b.id = f.player_b_id
       LEFT JOIN matches m ON m.fixture_id = f.id AND m.deleted_at IS NULL
      WHERE f.league_id = ? AND (? IS NULL OR f.status = ?)
      ORDER BY f.round ASC, f.meeting_number ASC, a.username COLLATE NOCASE ASC, b.username COLLATE NOCASE ASC`,
  ).bind(leagueId, status ?? null, status ?? null).all<FixtureRecord>();
  return result.results;
}

export async function getFixture(db: D1Database, fixtureId: string): Promise<FixtureRecord | null> {
  return (await db.prepare(
    `SELECT f.id, f.season_id, f.league_id, f.player_a_id, f.player_b_id, f.pair_key,
            f.round, f.meeting_number, f.status, f.created_at, f.updated_at, f.voided_at,
            a.username AS player_a_username, b.username AS player_b_username,
            m.id AS result_id
       FROM fixtures f
       JOIN users a ON a.id = f.player_a_id
       JOIN users b ON b.id = f.player_b_id
       LEFT JOIN matches m ON m.fixture_id = f.id AND m.deleted_at IS NULL
      WHERE f.id = ?`,
  ).bind(fixtureId).first<FixtureRecord>()) ?? null;
}

export async function setFixtureStatus(db: D1Database, actorUserId: string, fixtureId: string, nextStatus: FixtureStatus, now = new Date()): Promise<FixtureRecord> {
  const before = await getFixture(db, fixtureId);
  if (!before) throw new AppError('VALIDATION_ERROR', 'Fixture was not found', 404);
  if (nextStatus === 'VOID') {
    if (before.status !== 'OUTSTANDING') throw new AppError('VALIDATION_ERROR', 'Only an outstanding fixture can be voided', 409);
    if (before.result_id) throw new AppError('VALIDATION_ERROR', 'A fixture with an active result cannot be voided', 409);
  }
  if (nextStatus === 'OUTSTANDING') {
    if (before.status !== 'VOID') throw new AppError('VALIDATION_ERROR', 'Only a void fixture can be restored', 409);
    if (before.result_id) throw new AppError('VALIDATION_ERROR', 'A fixture with an active result cannot be restored', 409);
  }
  const at = timestamp(now);
  await db.batch([
    db.prepare(
      `UPDATE fixtures SET status = ?, updated_at = ?, voided_at = CASE WHEN ? = 'VOID' THEN ? ELSE NULL END WHERE id = ?`,
    ).bind(nextStatus, at, nextStatus, at, fixtureId),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, 'FIXTURE_STATUS_CHANGED', 'FIXTURE', ?, ?, ?, ?)`,
    ).bind(actorUserId, fixtureId, JSON.stringify({ status: before.status }), JSON.stringify({ status: nextStatus }), at),
  ]);
  const saved = await getFixture(db, fixtureId);
  if (!saved) throw new Error('Fixture could not be loaded after update');
  return saved;
}

export async function deleteUnplayedFixtures(db: D1Database, actorUserId: string, leagueId: string, now = new Date()): Promise<void> {
  const protectedRow = await db.prepare(
    `SELECT COUNT(*) AS count FROM fixtures f
      WHERE f.league_id = ? AND (f.status <> 'OUTSTANDING' OR EXISTS (SELECT 1 FROM matches m WHERE m.fixture_id = f.id AND m.deleted_at IS NULL))`,
  ).bind(leagueId).first<{ count: number }>();
  if (Number(protectedRow?.count ?? 0) > 0) throw new AppError('VALIDATION_ERROR', 'Fixtures cannot be regenerated after play has started', 409);
  const at = timestamp(now);
  await db.batch([
    db.prepare('DELETE FROM fixtures WHERE league_id = ?').bind(leagueId),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, 'FIXTURES_RESET', 'LEAGUE', ?, NULL, NULL, ?)`,
    ).bind(actorUserId, leagueId, at),
  ]);
}

export async function seasonHealth(db: D1Database, seasonId: string): Promise<SeasonHealth> {
  const row = await db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM users u WHERE u.status = 'ACTIVE' AND NOT EXISTS (
        SELECT 1 FROM league_players lp WHERE lp.user_id = u.id AND lp.season_id = ? AND lp.active = 1
      )) AS unassigned_players,
      (SELECT COUNT(*) FROM fixtures WHERE season_id = ? AND status = 'OUTSTANDING') AS outstanding_fixtures,
      (SELECT COUNT(*) FROM fixtures WHERE season_id = ? AND status = 'PENDING_CONFIRMATION') AS pending_confirmations,
      (SELECT COUNT(*) FROM fixtures WHERE season_id = ? AND status = 'DISPUTED') AS disputes`,
  ).bind(seasonId, seasonId, seasonId, seasonId).first<{
    unassigned_players: number;
    outstanding_fixtures: number;
    pending_confirmations: number;
    disputes: number;
  }>();
  return {
    unassignedPlayers: Number(row?.unassigned_players ?? 0),
    outstandingFixtures: Number(row?.outstanding_fixtures ?? 0),
    pendingConfirmations: Number(row?.pending_confirmations ?? 0),
    disputes: Number(row?.disputes ?? 0),
  };
}
