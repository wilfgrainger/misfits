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
