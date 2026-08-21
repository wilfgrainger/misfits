import { AppError } from '../errors';
import { validatePlayerResult, type ResultInput } from '../domain/result';
import { getFixture, getCompetitionLeague, type FixtureRecord } from './competition';
import { getMembership } from './leagues';

export type FixtureMatchStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';

export interface FixtureResultRecord {
  id: string;
  fixture_id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_legs: number;
  player_b_legs: number;
  player_a_average: number;
  player_b_average: number;
  submitted_by: string;
  status: FixtureMatchStatus;
  confirmed_by: string | null;
  dispute_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  deleted_at: string | null;
  player_a_username?: string | null;
  player_b_username?: string | null;
}

function resultFromFixtureInput(fixture: FixtureRecord, input: unknown, targetLegs: number): ResultInput {
  if (!input || typeof input !== 'object') throw new AppError('INVALID_RESULT', 'Fixture result details are invalid: INPUT', 400);
  const value = input as Record<string, unknown>;
  const validation = validatePlayerResult({
    playerAId: fixture.player_a_id,
    playerBId: fixture.player_b_id,
    playerALegs: value.playerALegs,
    playerBLegs: value.playerBLegs,
    playerAAverage: value.playerAAverage,
    playerBAverage: value.playerBAverage,
  }, targetLegs);
  if (!validation.ok) throw new AppError('INVALID_RESULT', `Fixture result details are invalid: ${validation.reason}`, 400);
  return validation.value;
}

async function requireFixtureMembers(db: D1Database, fixture: FixtureRecord): Promise<void> {
  const [a, b] = await Promise.all([
    getMembership(db, fixture.league_id, fixture.player_a_id),
    getMembership(db, fixture.league_id, fixture.player_b_id),
  ]);
  if (a?.active !== 1 || b?.active !== 1) throw new AppError('FORBIDDEN', 'Both fixture players must be active members of this league', 403);
}

export async function leagueHasPersistedFixtures(db: D1Database, leagueId: string): Promise<boolean> {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM fixtures WHERE league_id = ?').bind(leagueId).first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
}

export async function getFixtureResultById(db: D1Database, resultId: string): Promise<FixtureResultRecord | null> {
  return (await db.prepare(
    `SELECT matches.id, matches.fixture_id, matches.league_id, matches.player_a_id, matches.player_b_id,
            matches.player_a_legs, matches.player_b_legs, matches.player_a_average, matches.player_b_average,
            matches.submitted_by, matches.status, matches.confirmed_by, matches.dispute_note, matches.created_at,
            matches.updated_at, matches.confirmed_at, matches.deleted_at,
            a.username AS player_a_username, b.username AS player_b_username
       FROM matches
       JOIN users a ON a.id = matches.player_a_id
       JOIN users b ON b.id = matches.player_b_id
      WHERE matches.id = ? AND matches.fixture_id IS NOT NULL`,
  ).bind(resultId).first<FixtureResultRecord>()) ?? null;
}

export async function fixtureIdForResult(db: D1Database, resultId: string): Promise<string | null> {
  const row = await db.prepare('SELECT fixture_id FROM matches WHERE id = ?').bind(resultId).first<{ fixture_id: string | null }>();
  return row?.fixture_id ?? null;
}

export async function submitFixtureResult(
  db: D1Database,
  sessionUserId: string,
  leagueId: string,
  input: unknown,
  now = new Date(),
): Promise<FixtureResultRecord> {
  const value = input as { fixtureId?: unknown } | null;
  if (typeof value?.fixtureId !== 'string' || !value.fixtureId) throw new AppError('INVALID_RESULT', 'An outstanding fixture is required', 400);
  const league = await getCompetitionLeague(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (league.status !== 'OPEN') throw new AppError('LEAGUE_CLOSED', 'This league is closed', 409);
  const fixture = await getFixture(db, value.fixtureId);
  if (!fixture || fixture.league_id !== leagueId) throw new AppError('INVALID_RESULT', 'Fixture was not found in this league', 404);
  if (fixture.status !== 'OUTSTANDING' || fixture.result_id) throw new AppError('RESULT_ALREADY_RESOLVED', 'This fixture already has a result in progress or settled', 409);
  if (sessionUserId !== fixture.player_a_id && sessionUserId !== fixture.player_b_id) throw new AppError('FORBIDDEN', 'You can only record one of your own fixtures', 403);
  await requireFixtureMembers(db, fixture);
  const result = resultFromFixtureInput(fixture, input, league.target_legs);
  const id = crypto.randomUUID();
  const at = now.toISOString();
  const inserted = await db.prepare(
    `INSERT INTO matches (
      id, fixture_id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
      player_a_average, player_b_average, submitted_by, status, created_at, updated_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?
     WHERE EXISTS (SELECT 1 FROM fixtures WHERE id = ? AND league_id = ? AND status = 'OUTSTANDING')
       AND NOT EXISTS (SELECT 1 FROM matches WHERE fixture_id = ? AND deleted_at IS NULL)`,
  ).bind(id, fixture.id, leagueId, result.playerAId, result.playerBId, result.playerALegs, result.playerBLegs, result.playerAAverage, result.playerBAverage, sessionUserId, at, at, fixture.id, leagueId, fixture.id).run();
  if (inserted.meta.changes !== 1) throw new AppError('RESULT_ALREADY_RESOLVED', 'This fixture already has a result in progress or settled', 409);
  await db.prepare("UPDATE fixtures SET status = 'PENDING_CONFIRMATION', updated_at = ? WHERE id = ?").bind(at, fixture.id).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'FIXTURE_RESULT_SUBMITTED', 'MATCH', ?, NULL, ?, ?)`,
  ).bind(sessionUserId, id, JSON.stringify({ fixtureId: fixture.id, leagueId, ...result }), at).run();
  const saved = await getFixtureResultById(db, id);
  if (!saved) throw new Error('Fixture result could not be loaded after submission');
  return saved;
}

export async function createAdminFixtureResult(
  db: D1Database,
  adminUserId: string,
  leagueId: string,
  input: unknown,
  now = new Date(),
): Promise<FixtureResultRecord> {
  const value = input as { fixtureId?: unknown } | null;
  if (typeof value?.fixtureId !== 'string' || !value.fixtureId) throw new AppError('INVALID_RESULT', 'An outstanding fixture is required', 400);
  const league = await getCompetitionLeague(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  const fixture = await getFixture(db, value.fixtureId);
  if (!fixture || fixture.league_id !== leagueId) throw new AppError('INVALID_RESULT', 'Fixture was not found in this league', 404);
  if (fixture.status !== 'OUTSTANDING' || fixture.result_id) throw new AppError('RESULT_ALREADY_RESOLVED', 'This fixture is already settled or awaiting settlement', 409);
  await requireFixtureMembers(db, fixture);
  const result = resultFromFixtureInput(fixture, input, league.target_legs);
  const id = crypto.randomUUID();
  const at = now.toISOString();
  const inserted = await db.prepare(
    `INSERT INTO matches (
      id, fixture_id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
      player_a_average, player_b_average, submitted_by, status, confirmed_by, created_at, updated_at, confirmed_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?
     WHERE EXISTS (SELECT 1 FROM fixtures WHERE id = ? AND league_id = ? AND status = 'OUTSTANDING')
       AND NOT EXISTS (SELECT 1 FROM matches WHERE fixture_id = ? AND deleted_at IS NULL)`,
  ).bind(id, fixture.id, leagueId, result.playerAId, result.playerBId, result.playerALegs, result.playerBLegs, result.playerAAverage, result.playerBAverage, adminUserId, adminUserId, at, at, at, fixture.id, leagueId, fixture.id).run();
  if (inserted.meta.changes !== 1) throw new AppError('RESULT_ALREADY_RESOLVED', 'This fixture is already settled or awaiting settlement', 409);
  await db.prepare("UPDATE fixtures SET status = 'CONFIRMED', updated_at = ? WHERE id = ?").bind(at, fixture.id).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'FIXTURE_RESULT_CREATED_BY_ADMIN', 'MATCH', ?, NULL, ?, ?)`,
  ).bind(adminUserId, id, JSON.stringify({ fixtureId: fixture.id, leagueId, ...result }), at).run();
  const saved = await getFixtureResultById(db, id);
  if (!saved) throw new Error('Fixture result could not be loaded after admin entry');
  return saved;
}

export async function syncFixtureForResult(db: D1Database, resultId: string, now = new Date()): Promise<void> {
  const row = await db.prepare(
    'SELECT fixture_id, status, deleted_at FROM matches WHERE id = ?',
  ).bind(resultId).first<{ fixture_id: string | null; status: FixtureMatchStatus; deleted_at: string | null }>();
  if (!row?.fixture_id) return;
  const fixtureStatus = row.deleted_at
    ? 'OUTSTANDING'
    : row.status === 'CONFIRMED'
      ? 'CONFIRMED'
      : row.status === 'DISPUTED'
        ? 'DISPUTED'
        : 'PENDING_CONFIRMATION';
  await db.prepare(`UPDATE fixtures SET status = '${fixtureStatus}', updated_at = ? WHERE id = ?`).bind(now.toISOString(), row.fixture_id).run();
}

export async function assertAdminUpdateMatchesFixture(db: D1Database, resultId: string, input: unknown): Promise<void> {
  const fixtureId = await fixtureIdForResult(db, resultId);
  if (!fixtureId || !input || typeof input !== 'object') return;
  const fixture = await getFixture(db, fixtureId);
  if (!fixture) throw new AppError('INVALID_RESULT', 'The linked fixture was not found', 409);
  const value = input as Record<string, unknown>;
  if (value.playerAId === undefined && value.playerBId === undefined) return;
  const submitted = new Set([String(value.playerAId ?? fixture.player_a_id), String(value.playerBId ?? fixture.player_b_id)]);
  const expected = new Set([fixture.player_a_id, fixture.player_b_id]);
  if (submitted.size !== expected.size || [...submitted].some((id) => !expected.has(id))) {
    throw new AppError('INVALID_RESULT', 'A fixture result cannot be reassigned to different players; delete it and correct the fixture instead', 409);
  }
}
