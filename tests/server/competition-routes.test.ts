import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createCompetitionRoutes } from '../../src/server/routes/competition';

type User = { id: string; username: string | null; role: 'PLAYER' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED'; is_master_admin: number };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type Season = { id: string; name: string; status: 'DRAFT' | 'OPEN' | 'CLOSED'; is_current: number; created_at: string; updated_at: string; closed_at: string | null };
type League = {
  id: string; name: string; slug: string; season_name: string; season_id: string | null; status: 'OPEN' | 'CLOSED';
  points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string | null;
  max_players: number; matches_per_pair: number; visibility: 'PUBLIC' | 'PRIVATE'; hierarchy_position: number;
  promotion_places: number; relegation_places: number;
};

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();
  audits: string[] = [];

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

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [token_hash, user_id, created_at, expires_at] = values as string[];
      this.sessions.set(token_hash, { token_hash, user_id, created_at, expires_at });
    } else if (sql.includes('UPDATE seasons SET is_current = 0')) {
      for (const season of this.seasons.values()) season.is_current = 0;
    } else if (sql.includes('INSERT INTO seasons')) {
      const [id, name, status, isCurrent, createdAt, updatedAt, closedAt] = values as [string, string, Season['status'], number, string, string, string | null];
      this.seasons.set(id, { id, name, status, is_current: isCurrent, created_at: createdAt, updated_at: updatedAt, closed_at: closedAt });
    } else if (sql.includes('UPDATE seasons') && sql.includes('SET name')) {
      const [name, status, isCurrent, updatedAt, closeStatus, closeAt, id] = values as [string, Season['status'], number, string, string, string, string];
      const season = this.seasons.get(id)!;
      season.name = name; season.status = status; season.is_current = isCurrent; season.updated_at = updatedAt;
      season.closed_at = closeStatus === 'CLOSED' ? season.closed_at ?? closeAt : null;
    } else if (sql.startsWith('DELETE FROM seasons')) {
      this.seasons.delete(String(values[0]));
    } else if (sql.includes('INSERT INTO leagues')) {
      const [id, name, slug, seasonName, seasonId, status, points, legs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, 'OPEN' | 'CLOSED', number, number, string, string, string, number, number, 'PUBLIC' | 'PRIVATE', number, number, number];
      this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, points_per_win: points, target_legs: legs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });
    } else if (sql.includes('UPDATE leagues') && sql.includes('hierarchy_position')) {
      const [name, slug, points, legs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt, id] = values as [string, string, number, number, number, number, 'PUBLIC' | 'PRIVATE', number, number, number, string, string];
      const league = this.leagues.get(id)!;
      Object.assign(league, { name, slug, points_per_win: points, target_legs: legs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });
    } else if (sql.includes('UPDATE leagues SET season_name')) {
      const [seasonName, seasonStatus, updatedAt, seasonId] = values as [string, string, string, string];
      for (const league of this.leagues.values()) if (league.season_id === seasonId) { league.season_name = seasonName; if (seasonStatus === 'CLOSED') league.status = 'CLOSED'; league.updated_at = updatedAt; }
    } else if (sql.includes('INSERT INTO audit_log')) {
      this.audits.push(sql.match(/'([A-Z_]+)'/)?.[1] ?? 'AUDIT');
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
    if (sql.includes('FROM seasons WHERE id')) return (this.seasons.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues WHERE id')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('COUNT(*)') && sql.includes('FROM leagues') && sql.includes('FROM fixtures')) {
      const count = [...this.leagues.values()].filter((league) => league.season_id === String(values[0])).length;
      return { count } as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('fixtures') && sql.includes('matches')) return { count: 0 } as T;
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM seasons')) return { results: [...this.seasons.values()] as T[] };
    if (sql.includes('FROM leagues WHERE season_id')) {
      return { results: [...this.leagues.values()].filter((league) => league.season_id === String(values[0])).sort((a, b) => a.hierarchy_position - b.hierarchy_position) as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-21T16:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  db.users.set('admin', { id: 'admin', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', is_master_admin: 1 });
  db.users.set('player', { id: 'player', username: 'Player', role: 'PLAYER', status: 'ACTIVE', is_master_admin: 0 });
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, routes: createCompetitionRoutes({ now: () => now }) };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `misfits_session=${session.token}`;
}

function mutation(cookie: string, body: unknown, method = 'POST') {
  return { method, headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

describe('competition administration routes', () => {
  it('reserves season creation for administrators', async () => {
    const { db, env, routes } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons', mutation(await cookieFor(db, 'player'), { name: '2026/27', status: 'DRAFT', isCurrent: true })), env, {} as never);
    expect(response.status).toBe(403);
  });

  it('creates, lists, opens and closes an explicit season', async () => {
    const { db, env, routes } = setup();
    const cookie = await cookieFor(db, 'admin');
    const create = await routes.fetch(new Request('https://misfits.test/api/admin/seasons', mutation(cookie, { name: '2026/27', status: 'DRAFT', isCurrent: true })), env, {} as never);
    expect(create.status).toBe(201);
    const created = (await create.json() as { season: Season }).season;
    expect(created).toMatchObject({ name: '2026/27', status: 'DRAFT', is_current: 1 });

    const list = await routes.fetch(new Request('https://misfits.test/api/admin/seasons', { headers: { Cookie: cookie } }), env, {} as never);
    expect((await list.json() as { seasons: Season[] }).seasons.map((season) => season.id)).toContain(created.id);

    const opened = await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/${created.id}`, mutation(cookie, { name: '2026/27', status: 'OPEN', isCurrent: true }, 'PATCH')), env, {} as never);
    expect((await opened.json() as { season: Season }).season.status).toBe('OPEN');
    const closed = await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/${created.id}`, mutation(cookie, { name: '2026/27', status: 'CLOSED', isCurrent: false }, 'PATCH')), env, {} as never);
    expect((await closed.json() as { season: Season }).season.status).toBe('CLOSED');
  });

  it('creates ordered leagues inside a season and persists promotion/relegation settings', async () => {
    const { db, env, routes } = setup();
    const cookie = await cookieFor(db, 'admin');
    const seasonResponse = await routes.fetch(new Request('https://misfits.test/api/admin/seasons', mutation(cookie, { name: '2026/27', status: 'DRAFT', isCurrent: true })), env, {} as never);
    const season = (await seasonResponse.json() as { season: Season }).season;

    const leagueResponse = await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/${season.id}/leagues`, mutation(cookie, {
      name: 'Premier League', slug: 'premier', maxPlayers: 10, matchesPerPair: 2, pointsPerWin: 2, targetLegs: 3,
      visibility: 'PUBLIC', hierarchyPosition: 1, promotionPlaces: 0, relegationPlaces: 2,
    })), env, {} as never);
    expect(leagueResponse.status).toBe(201);
    const league = (await leagueResponse.json() as { league: League }).league;
    expect(league).toMatchObject({ season_id: season.id, hierarchy_position: 1, promotion_places: 0, relegation_places: 2, matches_per_pair: 2 });

    const list = await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/${season.id}/leagues`, { headers: { Cookie: cookie } }), env, {} as never);
    expect((await list.json() as { leagues: League[] }).leagues).toHaveLength(1);
  });

  it('does not allow an empty-season delete once a league exists', async () => {
    const { db, env, routes } = setup();
    const cookie = await cookieFor(db, 'admin');
    const seasonResponse = await routes.fetch(new Request('https://misfits.test/api/admin/seasons', mutation(cookie, { name: '2026/27', status: 'DRAFT', isCurrent: false })), env, {} as never);
    const season = (await seasonResponse.json() as { season: Season }).season;
    await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/${season.id}/leagues`, mutation(cookie, { name: 'Premier', maxPlayers: 8, matchesPerPair: 1, pointsPerWin: 2, targetLegs: 3, visibility: 'PRIVATE', hierarchyPosition: 1, promotionPlaces: 0, relegationPlaces: 0 })), env, {} as never);
    const response = await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/${season.id}`, { method: 'DELETE', headers: { Cookie: cookie, Origin: 'https://misfits.test' } }), env, {} as never);
    expect(response.status).toBe(409);
  });
});
