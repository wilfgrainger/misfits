import { AppError } from '../errors';
import { canonicalPair, validatePlayerResult, type ResultInput } from '../domain/result';
import { calculateStandings, type StandingRow } from '../domain/standings';
import { countActiveMembers, getLeagueById, getMembership, listLeagueMembers } from './leagues';
import { getUserById } from './users';

export type MatchStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';

export interface ResultRecord {
  id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_legs: number;
  player_b_legs: number;
  player_a_average: number;
  player_b_average: number;
  submitted_by: string;
  status: MatchStatus;
  confirmed_by: string | null;
  dispute_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  deleted_at: string | null;
  player_a_username?: string | null;
  player_b_username?: string | null;
}

function normalizeResult(result: ResultRecord): ResultRecord {
  const playerAAverage = Number(result.player_a_average);
  const playerBAverage = Number(result.player_b_average);
  return {
    ...result,
    player_a_average: Number.isFinite(playerAAverage) ? playerAAverage : 0,
    player_b_average: Number.isFinite(playerBAverage) ? playerBAverage : 0,
  };
}

function publicResult(result: ResultRecord) {
  return {
    id: result.id,
    leagueId: result.league_id,
    playerAId: result.player_a_id,
    playerBId: result.player_b_id,
    playerAUsername: result.player_a_username ?? null,
    playerBUsername: result.player_b_username ?? null,
    playerALegs: result.player_a_legs,
    playerBLegs: result.player_b_legs,
    playerAAverage: result.player_a_average,
    playerBAverage: result.player_b_average,
    submittedBy: result.submitted_by,
    status: result.status,
    confirmedBy: result.confirmed_by,
    disputeNote: result.dispute_note,
    createdAt: result.created_at,
    confirmedAt: result.confirmed_at,
  };
}

export function serializeResult(result: ResultRecord) {
  return publicResult(result);
}

export async function getResultById(db: D1Database, resultId: string): Promise<ResultRecord | null> {
  const result = await db.prepare(
    `SELECT matches.id, matches.league_id, matches.player_a_id, matches.player_b_id,
            matches.player_a_legs, matches.player_b_legs, matches.player_a_average, matches.player_b_average,
            matches.submitted_by, matches.status, matches.confirmed_by, matches.dispute_note,
            matches.created_at, matches.updated_at, matches.confirmed_at, matches.deleted_at,
            a.username AS player_a_username, b.username AS player_b_username
       FROM matches
       JOIN users a ON a.id = matches.player_a_id
       JOIN users b ON b.id = matches.player_b_id
      WHERE matches.id = ?`,
  ).bind(resultId).first<ResultRecord>();
  return result ? normalizeResult(result) : null;
}

async function listResults(db: D1Database, leagueId: string, status?: MatchStatus, playerId?: string): Promise<ResultRecord[]> {
  const statusClause = status ? ` AND matches.status = '${status}'` : '';
  const playerClause = playerId ? ' AND (matches.player_a_id = ? OR matches.player_b_id = ? OR matches.submitted_by = ?)' : '';
  const values = playerId ? [leagueId, playerId, playerId, playerId] : [leagueId];
  const result = await db.prepare(
    `SELECT matches.id, matches.league_id, matches.player_a_id, matches.player_b_id,
            matches.player_a_legs, matches.player_b_legs, matches.player_a_average, matches.player_b_average,
            matches.submitted_by, matches.status, matches.confirmed_by, matches.dispute_note,
            matches.created_at, matches.updated_at, matches.confirmed_at, matches.deleted_at,
            a.username AS player_a_username, b.username AS player_b_username
       FROM matches
       JOIN users a ON a.id = matches.player_a_id
       JOIN users b ON b.id = matches.player_b_id
      WHERE matches.league_id = ? AND matches.deleted_at IS NULL${statusClause}${playerClause}
      ORDER BY matches.created_at DESC`,
  ).bind(...values).all<ResultRecord>();
  return result.results.map(normalizeResult);
}

async function countPairResults(db: D1Database, leagueId: string, playerAId: string, playerBId: string): Promise<number> {
  const [a, b] = canonicalPair(playerAId, playerBId);
  const row = await db.prepare(
    `SELECT COUNT(*) AS count FROM matches
      WHERE league_id = ? AND player_a_id = ? AND player_b_id = ?
        AND deleted_at IS NULL AND status IN ('PENDING', 'CONFIRMED', 'DISPUTED')`,
  ).bind(leagueId, a, b).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

async function requireActiveMember(db: D1Database, leagueId: string, userId: string): Promise<void> {
  const member = await getMembership(db, leagueId, userId);
  if (!member || member.active !== 1) throw new AppError('FORBIDDEN', 'Both players must be active members of this league', 403);
}

function normalizedResult(input: ResultInput): ResultInput {
  if (input.playerAId < input.playerBId) return input;
  return {
    playerAId: input.playerBId,
    playerBId: input.playerAId,
    playerALegs: input.playerBLegs,
    playerBLegs: input.playerALegs,
    playerAAverage: input.playerBAverage,
    playerBAverage: input.playerAAverage,
  };
}

async function validateAndNormalize(input: unknown, targetLegs: number): Promise<ResultInput> {
  const validation = validatePlayerResult(input, targetLegs);
  if (!validation.ok) throw new AppError('INVALID_RESULT', `Result details are invalid: ${validation.reason}`, 400);
  return normalizedResult(validation.value);
}

export async function submitPlayerResult(db: D1Database, sessionUserId: string, leagueId: string, input: unknown, now = new Date()): Promise<ResultRecord> {
  const league = await getLeagueById(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (league.status !== 'OPEN') throw new AppError('LEAGUE_CLOSED', 'This league is closed', 409);
  const result = await validateAndNormalize(input, league.target_legs);
  if (sessionUserId !== result.playerAId && sessionUserId !== result.playerBId) throw new AppError('FORBIDDEN', 'You can only record a result involving you', 403);
  await requireActiveMember(db, leagueId, result.playerAId);
  await requireActiveMember(db, leagueId, result.playerBId);
  if (await countPairResults(db, leagueId, result.playerAId, result.playerBId) >= league.matches_per_pair) throw new AppError('PAIR_LIMIT_REACHED', 'These players have reached the game limit for this league', 409);
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.prepare(
    `INSERT INTO matches (id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
                          player_a_average, player_b_average, submitted_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
  ).bind(id, leagueId, result.playerAId, result.playerBId, result.playerALegs, result.playerBLegs, result.playerAAverage, result.playerBAverage, sessionUserId, timestamp, timestamp).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'RESULT_SUBMITTED', 'MATCH', ?, NULL, ?, ?)`,
  ).bind(sessionUserId, id, JSON.stringify(result), timestamp).run();
  const saved = await getResultById(db, id);
  if (!saved) throw new Error('Result could not be loaded after submission');
  return saved;
}

async function requireResolvingOpponent(db: D1Database, result: ResultRecord, userId: string): Promise<void> {
  if (result.status !== 'PENDING') throw new AppError('RESULT_ALREADY_RESOLVED', 'This result has already been resolved', 409);
  if (result.submitted_by === userId || (result.player_a_id !== userId && result.player_b_id !== userId)) throw new AppError('FORBIDDEN', 'Only the opposing player can resolve this result', 403);
  await requireActiveMember(db, result.league_id, userId);
}

export async function confirmResult(db: D1Database, userId: string, resultId: string, now = new Date()): Promise<ResultRecord> {
  const result = await getResultById(db, resultId);
  if (!result || result.deleted_at) throw new AppError('VALIDATION_ERROR', 'Result was not found', 404);
  await requireResolvingOpponent(db, result, userId);
  const timestamp = now.toISOString();
  await db.prepare("UPDATE matches SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = ?, updated_at = ? WHERE id = ?")
    .bind(userId, timestamp, timestamp, resultId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'RESULT_CONFIRMED', 'MATCH', ?, ?, ?, ?)`,
  ).bind(userId, resultId, JSON.stringify({ status: result.status }), JSON.stringify({ status: 'CONFIRMED' }), timestamp).run();
  const saved = await getResultById(db, resultId);
  if (!saved) throw new Error('Result could not be loaded after confirmation');
  return saved;
}

export async function disputeResult(db: D1Database, userId: string, resultId: string, note: string, now = new Date()): Promise<ResultRecord> {
  const result = await getResultById(db, resultId);
  if (!result || result.deleted_at) throw new AppError('VALIDATION_ERROR', 'Result was not found', 404);
  await requireResolvingOpponent(db, result, userId);
  const trimmed = note.trim();
  if (!trimmed || trimmed.length > 240) throw new AppError('INVALID_RESULT', 'A short dispute note is required', 400);
  const timestamp = now.toISOString();
  await db.prepare("UPDATE matches SET status = 'DISPUTED', dispute_note = ?, updated_at = ? WHERE id = ?")
    .bind(trimmed, timestamp, resultId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'RESULT_DISPUTED', 'MATCH', ?, ?, ?, ?)`,
  ).bind(userId, resultId, JSON.stringify({ status: result.status }), JSON.stringify({ status: 'DISPUTED', note: trimmed }), timestamp).run();
  const saved = await getResultById(db, resultId);
  if (!saved) throw new Error('Result could not be loaded after dispute');
  return saved;
}

export async function createAdminResult(db: D1Database, adminUserId: string, leagueId: string, input: unknown, now = new Date()): Promise<ResultRecord> {
  const league = await getLeagueById(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  const result = await validateAndNormalize(input, league.target_legs);
  await requireActiveMember(db, leagueId, result.playerAId);
  await requireActiveMember(db, leagueId, result.playerBId);
  if (await countPairResults(db, leagueId, result.playerAId, result.playerBId) >= league.matches_per_pair) throw new AppError('PAIR_LIMIT_REACHED', 'These players have reached the game limit for this league', 409);
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.prepare(
    `INSERT INTO matches (id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
                          player_a_average, player_b_average, submitted_by, status, confirmed_by, created_at, updated_at, confirmed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)`,
  ).bind(id, leagueId, result.playerAId, result.playerBId, result.playerALegs, result.playerBLegs, result.playerAAverage, result.playerBAverage, adminUserId, adminUserId, timestamp, timestamp, timestamp).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'RESULT_CREATED_BY_ADMIN', 'MATCH', ?, NULL, ?, ?)`,
  ).bind(adminUserId, id, JSON.stringify(result), timestamp).run();
  const saved = await getResultById(db, id);
  if (!saved) throw new Error('Result could not be loaded after admin entry');
  return saved;
}

export async function updateAdminResult(db: D1Database, adminUserId: string, resultId: string, input: unknown, now = new Date()): Promise<ResultRecord> {
  const existing = await getResultById(db, resultId);
  if (!existing || existing.deleted_at) throw new AppError('VALIDATION_ERROR', 'Result was not found', 404);
  const league = await getLeagueById(db, existing.league_id);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  const result = await validateAndNormalize(input, league.target_legs);
  await requireActiveMember(db, league.id, result.playerAId);
  await requireActiveMember(db, league.id, result.playerBId);
  const [existingA, existingB] = canonicalPair(existing.player_a_id, existing.player_b_id);
  const [nextA, nextB] = canonicalPair(result.playerAId, result.playerBId);
  if (existingA !== nextA || existingB !== nextB) {
    if (await countPairResults(db, league.id, result.playerAId, result.playerBId) >= league.matches_per_pair) throw new AppError('PAIR_LIMIT_REACHED', 'These players have reached the game limit for this league', 409);
  }
  const status = (input as { status?: unknown })?.status;
  const nextStatus: MatchStatus = status === 'PENDING' || status === 'DISPUTED' || status === 'CONFIRMED' ? status : existing.status;
  const timestamp = now.toISOString();
  await db.prepare(
    `UPDATE matches SET player_a_id = ?, player_b_id = ?, player_a_legs = ?, player_b_legs = ?,
            player_a_average = ?, player_b_average = ?, status = ?, dispute_note = ?, updated_at = ?,
            confirmed_by = CASE WHEN ? = 'CONFIRMED' THEN ? ELSE NULL END,
            confirmed_at = CASE WHEN ? = 'CONFIRMED' THEN ? ELSE NULL END
      WHERE id = ?`,
  ).bind(result.playerAId, result.playerBId, result.playerALegs, result.playerBLegs, result.playerAAverage, result.playerBAverage, nextStatus, (input as { disputeNote?: string }).disputeNote ?? null, timestamp, nextStatus, adminUserId, nextStatus, timestamp, resultId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'RESULT_UPDATED_BY_ADMIN', 'MATCH', ?, ?, ?, ?)`,
  ).bind(adminUserId, resultId, JSON.stringify(existing), JSON.stringify(result), timestamp).run();
  const saved = await getResultById(db, resultId);
  if (!saved) throw new Error('Result could not be loaded after admin update');
  return saved;
}

export async function deleteAdminResult(db: D1Database, adminUserId: string, resultId: string, now = new Date()): Promise<void> {
  const existing = await getResultById(db, resultId);
  if (!existing || existing.deleted_at) throw new AppError('VALIDATION_ERROR', 'Result was not found', 404);
  const timestamp = now.toISOString();
  await db.prepare('UPDATE matches SET deleted_at = ?, updated_at = ? WHERE id = ?').bind(timestamp, timestamp, resultId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'RESULT_DELETED_BY_ADMIN', 'MATCH', ?, ?, NULL, ?)`,
  ).bind(adminUserId, resultId, JSON.stringify(existing), timestamp).run();
}

export async function getPublicResults(db: D1Database, leagueId: string): Promise<ResultRecord[]> {
  return listResults(db, leagueId, 'CONFIRMED');
}

export async function getPlayerResults(db: D1Database, userId: string): Promise<ResultRecord[]> {
  const result = await db.prepare(
    `SELECT matches.id, matches.league_id, matches.player_a_id, matches.player_b_id,
            matches.player_a_legs, matches.player_b_legs, matches.player_a_average, matches.player_b_average,
            matches.submitted_by, matches.status, matches.confirmed_by, matches.dispute_note,
            matches.created_at, matches.updated_at, matches.confirmed_at, matches.deleted_at,
            a.username AS player_a_username, b.username AS player_b_username
       FROM matches
       JOIN users a ON a.id = matches.player_a_id
       JOIN users b ON b.id = matches.player_b_id
      WHERE matches.deleted_at IS NULL
        AND (matches.player_a_id = ? OR matches.player_b_id = ? OR matches.submitted_by = ?)
      ORDER BY matches.created_at DESC`,
  ).bind(userId, userId, userId).all<ResultRecord>();
  return result.results.map(normalizeResult);
}

export async function getAdminResults(db: D1Database, leagueId: string): Promise<ResultRecord[]> {
  return listResults(db, leagueId);
}

export async function getLeagueStandings(db: D1Database, leagueId: string): Promise<StandingRow[]> {
  const league = await getLeagueById(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  const members = (await listLeagueMembers(db, leagueId)).filter((member) => member.active === 1 && member.username);
  const results = await getPublicResults(db, leagueId);
  return calculateStandings(members.map((member) => ({ id: member.user_id, username: member.username! })), results.map((result) => ({ playerAId: result.player_a_id, playerBId: result.player_b_id, playerALegs: result.player_a_legs, playerBLegs: result.player_b_legs, playerAAverage: result.player_a_average, playerBAverage: result.player_b_average })), league.points_per_win);
}

export { publicResult };
