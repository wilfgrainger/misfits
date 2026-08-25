import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createCompetitionRoutes } from '../../src/server/routes/competition';

type User = { id: string; username: string | null; email: string; role: 'PLAYER' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED'; club_status: 'PENDING' | 'APPROVED' | 'REJECTED'; is_master_admin: number; profile_image_url: string | null };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type Season = { id: string; name: string; status: 'DRAFT' | 'OPEN' | 'CLOSED'; is_current: number; created_at: string; updated_at: string; closed_at: string | null };
type League = { id: string; season_id: string; name: string; slug: string; season_name: string; status: 'OPEN' | 'CLOSED'; points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string; max_players: number; matches_per_pair: number; visibility: 'PUBLIC' | 'PRIVATE'; hierarchy_position: number; promotion_places: number; relegation_places: number };
type Membership = { league_id: string; season_id: string; user_id: string; active: number; joined_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();
  memberships = new Map<string, Membership>();
  fixtureLeagues = new Set<string>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({ run: async () => this.run(sql, values), first: async <T>() => this.first<T>(sql, values), all: async <T>() => this.all<T>(sql, values) }),
      run: async () => this.run(sql, []), first: async <T>() => this.first<T>(sql, []), all: async <T>() => this.all<T>(sql, []),
    };
  }
  async batch(statements: Array<{ run: () => Promise<unknown> }>) { for (const statement of statements) await statement.run(); return []; }

  private key(leagueId: string, userId: string) { return `${leagueId}:${userId}`; }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [token_hash, user_id, created_at, expires_at] = values as string[];
      this.sessions.set(token_hash, { token_hash, user_id, created_at, expires_at });
    } else if (sql.includes('INSERT INTO league_players') && sql.includes('ON CONFLICT')) {
      const [leagueId, userId, joinedAt, seasonId] = values as [string, string, string, string];
      this.memberships.set(this.key(leagueId, userId), { league_id: leagueId, season_id: seasonId, user_id: userId, active: 1, joined_at: joinedAt });
    } else if (sql.includes('UPDATE league_players SET active = 0')) {
      const [leagueId, userId, seasonId] = values as string[];
      const row = this.memberships.get(this.key(leagueId, userId));
      if (row?.season_id === seasonId) row.active = 0;
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0])); const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM seasons WHERE id')) return (this.seasons.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues WHERE id')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM users') && (sql.includes('WHERE id') || sql.includes('WHERE u.id'))) {
      const user = this.users.get(String(values[0]));
      if (!user || (sql.includes("status = 'ACTIVE'") && user.status !== 'ACTIVE') || (sql.includes("club_status = 'APPROVED'") && user.club_status !== 'APPROVED') || (sql.includes("role = 'PLAYER'") && user.role !== 'PLAYER')) return null;
      return user as T;
    }
    if (sql.includes('SELECT league_id FROM league_players WHERE season_id')) {
      const [seasonId, userId] = values as string[];
      return ([...this.memberships.values()].find((row) => row.season_id === seasonId && row.user_id === userId && row.active === 1) ?? null) as T;
    }
    if (sql.includes('SELECT active FROM league_players')) {
      const [leagueId, userId, seasonId] = values as string[];
      return (this.memberships.get(this.key(leagueId, userId))?.season_id === seasonId ? { active: this.memberships.get(this.key(leagueId, userId))!.active } : null) as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('fixtures') && sql.includes('matches')) return { count: this.fixtureLeagues.has(String(values[0])) ? 1 : 0 } as T;
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) {
      const leagueId = String(values[0]);
      return { count: [...this.memberships.values()].filter((row) => row.league_id === leagueId && row.active === 1).length } as T;
    }
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM users u') && sql.includes('NOT EXISTS')) {
      const seasonId = String(values[0]);
      const requiresApprovedClub = sql.includes("u.club_status = 'APPROVED'");
      const requiresPlayerRole = sql.includes("u.role = 'PLAYER'");
      return { results: [...this.users.values()].filter((user) => user.status === 'ACTIVE' && (!requiresApprovedClub || user.club_status === 'APPROVED') && (!requiresPlayerRole || user.role === 'PLAYER') && ![...this.memberships.values()].some((row) => row.user_id === user.id && row.season_id === seasonId && row.active === 1)).map((user) => ({ id: user.id, username: user.username, email: user.email, status: user.status })) as T[] };
    }
    if (sql.includes('FROM league_players lp') && sql.includes('JOIN users')) {
      const leagueId = String(values[0]);
      return { results: [...this.memberships.values()].filter((row) => row.league_id === leagueId).map((row) => ({ ...row, username: this.users.get(row.user_id)?.username ?? null, profile_image_url: null, email: this.users.get(row.user_id)?.email, status: this.users.get(row.user_id)?.status })) as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-21T16:10:00.000Z');
function setup() {
  const db = new MemoryD1();
  db.users.set('admin', { id: 'admin', username: 'Admin', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 1, profile_image_url: null });
  db.users.set('p1', { id: 'p1', username: 'One', email: 'one@example.com', role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0, profile_image_url: null });
  db.seasons.set('s1', { id: 's1', name: '2026/27', status: 'OPEN', is_current: 1, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: null });
  for (const [id, name, position] of [['l1', 'Premier', 1], ['l2', 'Division One', 2]] as const) db.leagues.set(id, { id, season_id: 's1', name, slug: id, season_name: '2026/27', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin', max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: position, promotion_places: position === 1 ? 0 : 2, relegation_places: position === 1 ? 2 : 0 });
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, routes: createCompetitionRoutes({ now: () => now }) };
}
async function cookieFor(db: MemoryD1) { const session = await issueSession(db as never, 'admin', now); return `misfits_session=${session.token}`; }
function mutation(cookie: string, body: unknown) { return { method: 'POST', headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }

describe('season-aware membership administration', () => {
  it('lists unassigned users and assigns a player exactly once in a season', async () => {
    const { db, env, routes } = setup(); const cookie = await cookieFor(db);
    const before = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/unassigned', { headers: { Cookie: cookie } }), env, {} as never);
    expect((await before.json() as { users: Array<{ id: string }> }).users.map((user) => user.id)).toContain('p1');

    const assign = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/members/p1/assign', mutation(cookie, { leagueId: 'l1' })), env, {} as never);
    expect(assign.status).toBe(200);
    expect(db.memberships.get('l1:p1')).toMatchObject({ season_id: 's1', active: 1 });

    const duplicate = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/members/p1/assign', mutation(cookie, { leagueId: 'l2' })), env, {} as never);
    expect(duplicate.status).toBe(409);
  });

  it('excludes pending and rejected club accounts from season placement', async () => {
    const { db, env, routes } = setup(); const cookie = await cookieFor(db);
    for (const [id, club_status] of [['pending', 'PENDING'], ['rejected', 'REJECTED']] as const) {
      db.users.set(id, { id, username: id, email: `${id}@example.com`, role: 'PLAYER', status: 'ACTIVE', club_status, is_master_admin: 0, profile_image_url: null });
    }

    const before = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/unassigned', { headers: { Cookie: cookie } }), env, {} as never);
    const users = (await before.json() as { users: Array<{ id: string }> }).users;
    expect(users.map((user) => user.id)).toEqual(['p1']);

    for (const userId of ['pending', 'rejected']) {
      const response = await routes.fetch(new Request(`https://misfits.test/api/admin/seasons/s1/members/${userId}/assign`, mutation(cookie, { leagueId: 'l1' })), env, {} as never);
      expect(response.status).toBe(409);
    }
  });

  it('does not allow an administrator to become a season competitor', async () => {
    const { db, env, routes } = setup(); const cookie = await cookieFor(db);
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/members/admin/assign', mutation(cookie, { leagueId: 'l1' })), env, {} as never);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('shows a player with only an inactive placement as unassigned', async () => {
    const { db, env, routes } = setup(); const cookie = await cookieFor(db);
    db.memberships.set('l1:p1', { league_id: 'l1', season_id: 's1', user_id: 'p1', active: 0, joined_at: now.toISOString() });
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/unassigned', { headers: { Cookie: cookie } }), env, {} as never);
    expect((await response.json() as { users: Array<{ id: string }> }).users.map((user) => user.id)).toContain('p1');
  });

  it('moves a player between divisions before fixtures exist and preserves one active placement', async () => {
    const { db, env, routes } = setup(); const cookie = await cookieFor(db);
    db.memberships.set('l1:p1', { league_id: 'l1', season_id: 's1', user_id: 'p1', active: 1, joined_at: now.toISOString() });
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/members/p1/move', mutation(cookie, { fromLeagueId: 'l1', toLeagueId: 'l2' })), env, {} as never);
    expect(response.status).toBe(200);
    expect(db.memberships.get('l1:p1')?.active).toBe(0);
    expect(db.memberships.get('l2:p1')?.active).toBe(1);
  });

  it('blocks a move after fixtures exist', async () => {
    const { db, env, routes } = setup(); const cookie = await cookieFor(db);
    db.memberships.set('l1:p1', { league_id: 'l1', season_id: 's1', user_id: 'p1', active: 1, joined_at: now.toISOString() });
    db.fixtureLeagues.add('l1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/members/p1/move', mutation(cookie, { fromLeagueId: 'l1', toLeagueId: 'l2' })), env, {} as never);
    expect(response.status).toBe(409);
  });
});
