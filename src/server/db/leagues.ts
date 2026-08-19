import type { PublicPlayerDto } from '../../shared/api';
import type { StandingPlayer } from '../domain/standings';

export interface LeagueRecord {
  id: string;
  name: string;
  slug: string;
  season_name: string;
  status: 'OPEN' | 'CLOSED';
  points_per_win: number;
  target_legs: number;
  created_at: string;
  updated_at: string;
}

export async function getLeague(db: D1Database, id = 'misfits-501'): Promise<LeagueRecord> {
  const league = await db.prepare('SELECT * FROM leagues WHERE id = ?').bind(id).first<LeagueRecord>();
  if (!league) throw new Error(`League ${id} not found`);
  return league;
}

export async function listActiveLeaguePlayers(
  db: D1Database,
  leagueId = 'misfits-501',
): Promise<StandingPlayer[]> {
  const rows = await db.prepare(`
    SELECT u.id AS userId, u.username AS username
    FROM league_players lp
    JOIN users u ON u.id = lp.user_id
    WHERE lp.league_id = ? AND lp.active = 1 AND u.status = 'ACTIVE' AND u.username IS NOT NULL
    ORDER BY u.username COLLATE NOCASE ASC
  `).bind(leagueId).all<StandingPlayer>();
  return rows.results;
}

export async function listPublicPlayers(
  db: D1Database,
  leagueId = 'misfits-501',
): Promise<PublicPlayerDto[]> {
  const rows = await db.prepare(`
    SELECT u.id AS id, u.username AS username
    FROM league_players lp
    JOIN users u ON u.id = lp.user_id
    WHERE lp.league_id = ? AND lp.active = 1 AND u.status = 'ACTIVE' AND u.username IS NOT NULL
    ORDER BY u.username COLLATE NOCASE ASC
  `).bind(leagueId).all<PublicPlayerDto>();
  return rows.results;
}
