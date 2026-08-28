import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createLeagueRoutes } from '../../src/server/routes/leagues';

type User = { id: string; username: string; role: 'PLAYER' | 'ADMIN'; status: 'ACTIVE'; club_status: 'APPROVED'; is_master_admin: number };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type Season = { id: string; name: string; status: 'OPEN' | 'CLOSED'; is_current: number; created_at: string; updated_at: string; closed_at: string | null };
type League = {
  id: string; name: string; slug: string; season_name: string; season_id: string; status: 'OPEN' | 'CLOSED';
  max_legs: number; points_per_win: number; points_per_draw: number; points_per_loss: number; target_legs: number;
  created_at: string; updated_at: string; created_by: string; max_players: number; matches_per_pair: number;
  visibility: 'PRIVATE'; hierarchy_position: number; promotion_places: number; relegation_places: number;
};
type Membership = { league_id: string; season_id: string; user_id: string; active: number; joined_at: string };
type Movement = {
  id: string; from_season_id: string; to_season_id: string; user_id: string; from_league_id: string; to_league_id: string;
  from_position: number; kind: 'PROMOTED'; status: 'PROPOSED'; reason: string | null; decided_by: string | null; created_at: string; updated_at: string;
};

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();
  memberships: Membership[] = [];
  movements: Movement[] = [];

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      run: async () => this.run(sql, []),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [token_hash, user_id, created_at, expires_at] = values as string[];
      this.sessions.set(token_hash, { token_hash, user_id, created_at, expires_at });
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM seasons') && sql.includes('WHERE id = ?')) return (this.seasons.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ? OR slug = ?')) {
      return ([...this.leagues.values()].find((league) => league.id === String(values[0]) || league.slug === String(values[1])) ?? null) as T;
    }
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ?')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('COUNT(*) AS count') && sql.includes('FROM fixtures') && sql.includes('season_id = ?')) return { count: 0 } as T;
    if (sql.includes('COUNT(*) AS count') && sql.includes('FROM matches') && sql.includes('leagues.season_id')) return { count: 0 } as T;
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM seasons') && !sql.includes('WHERE')) return { results: [...this.seasons.values()].sort((left, right) => right.is_current - left.is_current) as T[] };
    if (sql.includes('FROM leagues') && sql.includes('WHERE season_id = ?')) {
      return { results: [...this.leagues.values()].filter((league) => league.season_id === String(values[0])) as T[] };
    }
    if (sql.includes('FROM league_players') && sql.includes('WHERE user_id = ?') && !sql.includes('season_id = ?')) {
      return { results: this.memberships.filter((row) => row.user_id === String(values[0])) as T[] };
    }
    if (sql.includes('FROM season_movements') && sql.includes('WHERE user_id = ?')) {
      return { results: this.movements.filter((row) => row.user_id === String(values[0])) as T[] };
    }
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      return { results: this.memberships.filter((row) => row.league_id === String(values[0])).map((row) => ({
        ...row,
        username: this.users.get(row.user_id)?.username ?? null,
        profile_image_url: null,
        role: this.users.get(row.user_id)?.role,
        status: this.users.get(row.user_id)?.status,
        club_status: this.users.get(row.user_id)?.club_status,
      })) as T[] };
    }
    if (sql.includes('FROM matches')) return { results: [] };
    if (sql.includes('FROM league_players') && sql.includes('season_id = ?') && sql.includes('active = 1')) {
      return { results: this.memberships.filter((row) => row.user_id === String(values[0]) && row.season_id === String(values[1]) && row.active === 1).map((row) => ({ league_id: row.league_id })) as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-24T12:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  db.users.set('player', { id: 'player', username: 'Player', role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0 });
  db.seasons.set('old', { id: 'old', name: '2025/26', status: 'CLOSED', is_current: 0, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: now.toISOString() });
  db.seasons.set('current', { id: 'current', name: '2026/27', status: 'OPEN', is_current: 1, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: null });
  db.leagues.set('old-premier', { id: 'old-premier', name: 'Premier', slug: 'old-premier', season_name: '2025/26', season_id: 'old', status: 'CLOSED', max_legs: 6, points_per_win: 3, points_per_draw: 1, points_per_loss: 0, target_legs: 4, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'player', max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 1, relegation_places: 0 });
  db.leagues.set('current-premier', { id: 'current-premier', name: 'Premier', slug: 'current-premier', season_name: '2026/27', season_id: 'current', status: 'OPEN', max_legs: 6, points_per_win: 3, points_per_draw: 1, points_per_loss: 0, target_legs: 4, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'player', max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 1, relegation_places: 0 });
  db.memberships.push(
    { league_id: 'old-premier', season_id: 'old', user_id: 'player', active: 1, joined_at: now.toISOString() },
    { league_id: 'current-premier', season_id: 'current', user_id: 'player', active: 1, joined_at: now.toISOString() },
  );
  db.movements.push({ id: 'movement-1', from_season_id: 'old', to_season_id: 'current', user_id: 'player', from_league_id: 'old-premier', to_league_id: 'current-premier', from_position: 1, kind: 'PROMOTED', status: 'PROPOSED', reason: null, decided_by: null, created_at: now.toISOString(), updated_at: now.toISOString() });
  return { db, env: { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' }, routes: createLeagueRoutes() };
}

describe('member season history routes', () => {
  it('returns season-linked league history and named movement without private account fields', async () => {
    const { db, env, routes } = setup();
    const session = await issueSession(db as never, 'player', now);
    const response = await routes.fetch(new Request('https://misfits.test/api/me/seasons', { headers: { Cookie: `misfits_session=${session.token}` } }), env, {} as never);

    expect(response.status).toBe(200);
    const body = await response.json() as { seasons: Array<{ season: { id: string }; leagues: Array<{ id: string }>; placedLeagueIds: string[] }>; movements: Array<{ toLeagueName: string | null; toSeasonName: string | null }> };
    expect(body.seasons.map((entry) => entry.season.id)).toEqual(['current', 'old']);
    expect(body.seasons[1]?.placedLeagueIds).toEqual(['old-premier']);
    expect(body.movements).toEqual([expect.objectContaining({ toLeagueName: 'Premier', toSeasonName: '2026/27' })]);
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('returns the signed-in player movement state and keeps the movement scoped to that player', async () => {
    const { db, env, routes } = setup();
    const session = await issueSession(db as never, 'player', now);
    const response = await routes.fetch(new Request('https://misfits.test/api/me/seasons/old/movement', { headers: { Cookie: `misfits_session=${session.token}` } }), env, {} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      seasonId: 'old',
      state: 'PROPOSED',
      provisional: false,
      movement: { userId: 'player', fromLeagueName: 'Premier', toLeagueName: 'Premier', toSeasonName: '2026/27' },
    });
  });
});
