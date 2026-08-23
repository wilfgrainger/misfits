import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createSeasonMembershipRoutes } from '../../src/server/routes/season-memberships';

type Season = { id: string; name: string; status: 'DRAFT' | 'OPEN' | 'CLOSED'; is_current: number; created_at: string; updated_at: string; closed_at: string | null };
type League = { id: string; season_id: string; name: string; slug: string; season_name: string; status: 'OPEN' | 'CLOSED'; points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string; max_players: number; matches_per_pair: number; visibility: 'PUBLIC' | 'PRIVATE'; hierarchy_position: number; promotion_places: number; relegation_places: number };
type Membership = { league_id: string; season_id: string; user_id: string; active: number; joined_at: string };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class BaselineD1 {
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();
  memberships = new Map<string, Membership>();
  sessions = new Map<string, Session>();
  users = new Map([['admin', { id: 'admin', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 1 }]]);

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  }

  private key(leagueId: string, userId: string) { return `${leagueId}:${userId}`; }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [token_hash, user_id, created_at, expires_at] = values as string[];
      this.sessions.set(token_hash, { token_hash, user_id, created_at, expires_at });
    } else if (sql.includes('INSERT INTO league_players') && sql.includes('ON CONFLICT')) {
      const [leagueId, userId, joinedAt, seasonId] = values as [string, string, string, string];
      this.memberships.set(this.key(leagueId, userId), { league_id: leagueId, season_id: seasonId, user_id: userId, active: 1, joined_at: joinedAt });
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
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues WHERE season_id')) {
      return { results: [...this.leagues.values()].filter((league) => league.season_id === String(values[0])).sort((a, b) => a.hierarchy_position - b.hierarchy_position) as T[] };
    }
    if (sql.includes('FROM league_players lp') && sql.includes('JOIN leagues l')) {
      const seasonId = String(values[0]);
      return { results: [...this.memberships.values()].filter((row) => row.season_id === seasonId && row.active === 1).map((row) => ({ ...row, hierarchy_position: this.leagues.get(row.league_id)?.hierarchy_position ?? 0 })) as T[] };
    }
    if (sql.includes('FROM league_players') && sql.includes('WHERE season_id = ?') && !sql.includes('JOIN')) {
      const seasonId = String(values[0]);
      return { results: [...this.memberships.values()].filter((row) => row.season_id === seasonId && row.active === 1) as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-21T20:50:00.000Z');

function league(id: string, seasonId: string, position: number, name: string): League {
  return {
    id, season_id: seasonId, name, slug: id, season_name: seasonId === 's1' ? '2026/27' : '2027/28', status: 'CLOSED',
    points_per_win: 2, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin', max_players: 8,
    matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: position, promotion_places: position === 1 ? 0 : 1, relegation_places: position === 1 ? 1 : 0,
  };
}

describe('ADM-039 copy previous-season placements as a draft baseline', () => {
  it('copies reviewed source placements by hierarchy into a draft target season while leaving source history immutable', async () => {
    const db = new BaselineD1();
    db.seasons.set('s1', { id: 's1', name: '2026/27', status: 'CLOSED', is_current: 0, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: now.toISOString() });
    db.seasons.set('s2', { id: 's2', name: '2027/28', status: 'DRAFT', is_current: 0, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: null });
    db.leagues.set('l1', league('l1', 's1', 1, 'Premier'));
    db.leagues.set('l2', league('l2', 's1', 2, 'Division One'));
    db.leagues.set('n1', league('n1', 's2', 1, 'Premier'));
    db.leagues.set('n2', league('n2', 's2', 2, 'Division One'));
    db.memberships.set('l1:u1', { league_id: 'l1', season_id: 's1', user_id: 'u1', active: 1, joined_at: now.toISOString() });
    db.memberships.set('l2:u2', { league_id: 'l2', season_id: 's1', user_id: 'u2', active: 1, joined_at: now.toISOString() });

    const session = await issueSession(db as never, 'admin', now);
    const routes = createSeasonMembershipRoutes({ now: () => now });
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/members/copy', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${session.token}`, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ toSeasonId: 's2' }),
    }), { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' }, {} as never);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ placements: [
      { userId: 'u1', leagueId: 'n1' },
      { userId: 'u2', leagueId: 'n2' },
    ] });
    expect(db.memberships.get('l1:u1')).toMatchObject({ season_id: 's1', active: 1 });
    expect(db.memberships.get('l2:u2')).toMatchObject({ season_id: 's1', active: 1 });
    expect(db.memberships.get('n1:u1')).toMatchObject({ season_id: 's2', active: 1 });
    expect(db.memberships.get('n2:u2')).toMatchObject({ season_id: 's2', active: 1 });
  });
});
