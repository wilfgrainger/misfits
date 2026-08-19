import type { ConfirmedMatch } from '../domain/standings';
import type { PublicResultDto } from '../../shared/api';

interface PublicMatchRow {
  id: string;
  playerAId: string;
  playerAUsername: string;
  playerALegs: number;
  playerBId: string;
  playerBUsername: string;
  playerBLegs: number;
  createdAt: string;
  confirmedAt: string | null;
}

export interface MatchRecord {
  id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_legs: number;
  player_b_legs: number;
  submitted_by: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED';
  confirmed_by: string | null;
  dispute_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
}

export interface PlayerResultDto {
  id: string;
  status: MatchRecord['status'];
  playerAId: string;
  playerAUsername: string;
  playerALegs: number;
  playerBId: string;
  playerBUsername: string;
  playerBLegs: number;
  submittedBy: string;
  confirmedBy: string | null;
  disputeNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
}

interface PlayerResultRow {
  id: string;
  status: MatchRecord['status'];
  playerAId: string;
  playerAUsername: string;
  playerALegs: number;
  playerBId: string;
  playerBUsername: string;
  playerBLegs: number;
  submittedBy: string;
  confirmedBy: string | null;
  disputeNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
}

const PLAYER_RESULT_SELECT = `
  SELECT
    m.id AS id,
    m.status AS status,
    m.player_a_id AS playerAId,
    a.username AS playerAUsername,
    m.player_a_legs AS playerALegs,
    m.player_b_id AS playerBId,
    b.username AS playerBUsername,
    m.player_b_legs AS playerBLegs,
    m.submitted_by AS submittedBy,
    m.confirmed_by AS confirmedBy,
    m.dispute_note AS disputeNote,
    m.created_at AS createdAt,
    m.updated_at AS updatedAt,
    m.confirmed_at AS confirmedAt
  FROM matches m
  JOIN users a ON a.id = m.player_a_id
  JOIN users b ON b.id = m.player_b_id
`;

export async function listConfirmedMatches(
  db: D1Database,
  leagueId = 'misfits-501',
  limit = 50,
): Promise<PublicResultDto[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const rows = await db.prepare(`
    SELECT
      m.id AS id,
      m.player_a_id AS playerAId,
      a.username AS playerAUsername,
      m.player_a_legs AS playerALegs,
      m.player_b_id AS playerBId,
      b.username AS playerBUsername,
      m.player_b_legs AS playerBLegs,
      m.created_at AS createdAt,
      m.confirmed_at AS confirmedAt
    FROM matches m
    JOIN users a ON a.id = m.player_a_id
    JOIN users b ON b.id = m.player_b_id
    WHERE m.league_id = ? AND m.status = 'CONFIRMED'
    ORDER BY COALESCE(m.confirmed_at, m.updated_at, m.created_at) DESC, m.id DESC
    LIMIT ?
  `).bind(leagueId, safeLimit).all<PublicMatchRow>();

  return rows.results.map((row) => ({
    id: row.id,
    status: 'CONFIRMED' as const,
    playerA: { id: row.playerAId, username: row.playerAUsername, legs: row.playerALegs },
    playerB: { id: row.playerBId, username: row.playerBUsername, legs: row.playerBLegs },
    createdAt: row.createdAt,
    confirmedAt: row.confirmedAt,
  }));
}

export async function listConfirmedMatchesForStandings(
  db: D1Database,
  leagueId = 'misfits-501',
): Promise<ConfirmedMatch[]> {
  const rows = await db.prepare(`
    SELECT
      player_a_id AS playerAId,
      player_b_id AS playerBId,
      player_a_legs AS playerALegs,
      player_b_legs AS playerBLegs
    FROM matches
    WHERE league_id = ? AND status = 'CONFIRMED'
  `).bind(leagueId).all<ConfirmedMatch>();
  return rows.results;
}

export function getMatchById(db: D1Database, id: string): Promise<MatchRecord | null> {
  return db.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first<MatchRecord>();
}

export async function getPlayerResultById(db: D1Database, id: string): Promise<PlayerResultDto | null> {
  return db.prepare(`${PLAYER_RESULT_SELECT} WHERE m.id = ?`).bind(id).first<PlayerResultRow>();
}

export async function createPendingMatch(
  db: D1Database,
  input: {
    id: string;
    leagueId: string;
    actorId: string;
    opponentId: string;
    actorLegs: number;
    opponentLegs: number;
    now: string;
  },
): Promise<void> {
  await db.prepare(`
    INSERT INTO matches (
      id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
      submitted_by, status, confirmed_by, dispute_note, created_at, updated_at, confirmed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL, ?, ?, NULL)
  `).bind(
    input.id,
    input.leagueId,
    input.actorId,
    input.opponentId,
    input.actorLegs,
    input.opponentLegs,
    input.actorId,
    input.now,
    input.now,
  ).run();
}

export async function resolvePendingMatch(
  db: D1Database,
  input: {
    id: string;
    opponentId: string;
    status: 'CONFIRMED' | 'DISPUTED';
    note: string | null;
    now: string;
  },
): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE matches
    SET status = ?, confirmed_by = ?, confirmed_at = ?, dispute_note = ?, updated_at = ?
    WHERE id = ? AND status = 'PENDING' AND player_b_id = ?
  `).bind(
    input.status,
    input.opponentId,
    input.status === 'CONFIRMED' ? input.now : null,
    input.note,
    input.now,
    input.id,
    input.opponentId,
  ).run();
  return Number(result.meta.changes ?? 0) === 1;
}

export async function listUserMatches(
  db: D1Database,
  userId: string,
  leagueId = 'misfits-501',
): Promise<PlayerResultDto[]> {
  const rows = await db.prepare(`
    ${PLAYER_RESULT_SELECT}
    WHERE m.league_id = ? AND (m.player_a_id = ? OR m.player_b_id = ?)
    ORDER BY m.created_at DESC, m.id DESC
  `).bind(leagueId, userId, userId).all<PlayerResultRow>();
  return rows.results;
}

export async function listAllResults(
  db: D1Database,
  leagueId = 'misfits-501',
): Promise<PlayerResultDto[]> {
  const rows = await db.prepare(`
    ${PLAYER_RESULT_SELECT}
    WHERE m.league_id = ?
    ORDER BY m.created_at DESC, m.id DESC
  `).bind(leagueId).all<PlayerResultRow>();
  return rows.results;
}

export function prepareConfirmedMatchInsert(
  db: D1Database,
  input: {
    id: string;
    leagueId: string;
    playerAId: string;
    playerBId: string;
    playerALegs: number;
    playerBLegs: number;
    adminId: string;
    now: string;
  },
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO matches (
      id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
      submitted_by, status, confirmed_by, dispute_note, created_at, updated_at, confirmed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, NULL, ?, ?, ?)
  `).bind(
    input.id,
    input.leagueId,
    input.playerAId,
    input.playerBId,
    input.playerALegs,
    input.playerBLegs,
    input.adminId,
    input.adminId,
    input.now,
    input.now,
    input.now,
  );
}

export function prepareMatchUpdate(
  db: D1Database,
  match: MatchRecord,
): D1PreparedStatement {
  return db.prepare(`
    UPDATE matches SET
      player_a_legs = ?, player_b_legs = ?, status = ?, confirmed_by = ?,
      dispute_note = ?, updated_at = ?, confirmed_at = ?
    WHERE id = ?
  `).bind(
    match.player_a_legs,
    match.player_b_legs,
    match.status,
    match.confirmed_by,
    match.dispute_note,
    match.updated_at,
    match.confirmed_at,
    match.id,
  );
}

export function prepareMatchDelete(db: D1Database, id: string): D1PreparedStatement {
  return db.prepare('DELETE FROM matches WHERE id = ?').bind(id);
}
