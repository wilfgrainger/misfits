import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createLeagueRoutes } from '../../src/server/routes/leagues';
import { createAdminLeagueRoutes } from '../../src/server/routes/admin-leagues';

type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type User = {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  club_status: ClubStatus;
  is_master_admin: number;
  profile_image_url: string | null;
  darts_counter_url: string | null;
  created_at: string;
  last_login_at: string;
};
type League = {
  id: string;
  name: string;
  slug: string;
  season_name: string;
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
};
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  leagues = new Map<string, League>();
  memberships = new Set<string>();
  inactiveMemberships = new Set<string>();
  forceMembershipReactivationRace = false;
  sessions = new Map<string, Session>();
  audits: Array<{ action: string; entityId: string }> = [];

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.includes('INSERT INTO leagues')) {
      const [id, name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, League['status'], number, number, number, number, number, string, string, string, number, number, League['visibility']];
      this.leagues.set(id, {
        id, name, slug, season_name: seasonName, status, max_legs: maxLegs,
        points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs,
        created_at: createdAt, updated_at: updatedAt, created_by: createdBy,
        max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility,
      });
    } else if (sql.includes('UPDATE leagues')) {
      const [name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id, countLeagueId, capacity] = values as [string, string, string, League['status'], number, number, number, number, number, number, number, League['visibility'], string, string, string, number];
      const activeCount = [...this.memberships].filter((key) => key.startsWith(`${countLeagueId}:`)).length;
      if (activeCount > capacity) return { success: true, meta: { changes: 0 } };
      Object.assign(this.leagues.get(id)!, {
        name, slug, season_name: seasonName, status, points_per_win: win, points_per_draw: draw,
        points_per_loss: loss, max_legs: maxLegs, target_legs: targetLegs, max_players: maxPlayers,
        matches_per_pair: matchesPerPair, visibility, updated_at: updatedAt,
      });
    } else if (sql.includes('INSERT OR IGNORE INTO league_players') || sql.includes('INSERT INTO league_players')) {
      const leagueId = String(values[0]);
      const userId = String(values[1]);
      this.memberships.add(`${leagueId}:${userId}`);
      this.inactiveMemberships.delete(`${leagueId}:${userId}`);
    } else if (sql.includes('UPDATE league_players SET active = 1')) {
      const [leagueId, userId, countLeagueId, maxPlayers] = values as [string, string, string, number];
      if (this.forceMembershipReactivationRace) {
        this.forceMembershipReactivationRace = false;
        this.memberships.add(`${leagueId}:${userId}`);
        this.inactiveMemberships.delete(`${leagueId}:${userId}`);
        return { success: true, meta: { changes: 0 } };
      }
      const activeCount = [...this.memberships].filter((key) => key.startsWith(`${countLeagueId}:`)).length;
      if (activeCount >= maxPlayers) return { success: true, meta: { changes: 0 } };
      this.memberships.add(`${leagueId}:${userId}`);
      this.inactiveMemberships.delete(`${leagueId}:${userId}`);
    } else if (sql.includes('UPDATE league_players SET active')) {
      const [active, leagueId, userId] = values as [number, string, string];
      const key = `${leagueId}:${userId}`;
      if (active === 1) {
        this.memberships.add(key);
        this.inactiveMemberships.delete(key);
      } else {
        this.memberships.delete(key);
        this.inactiveMemberships.add(key);
      }
    } else if (sql.includes('INSERT INTO audit_log')) {
      const action = sql.match(/VALUES \(\?, '([^']+)'/)?.[1] ?? String(values[1]);
      this.audits.push({ action, entityId: String(values[1]) });
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
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ? OR slug = ?')) {
      return ([...this.leagues.values()].find((league) => league.id === String(values[0]) || league.slug === String(values[1])) ?? null) as T;
    }
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ?')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const key = `${String(values[0])}:${String(values[1])}`;
      if (!this.memberships.has(key) && !this.inactiveMemberships.has(key)) return null;
      const [leagueId, userId] = key.split(':');
      const user = this.users.get(userId)!;
      return {
        league_id: leagueId, season_id: null, user_id: userId,
        active: this.memberships.has(key) ? 1 : 0, joined_at: now.toISOString(),
        username: user.username, profile_image_url: user.profile_image_url,
      } as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) {
      return { count: [...this.memberships].filter((key) => key.startsWith(`${String(values[0])}:`)).length } as T;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues')) {
      const rows = [...this.leagues.values()].filter((league) => {
        if (!sql.includes('JOIN league_players')) return true;
        return this.memberships.has(`${league.id}:${String(values[0])}`);
      });
      return { results: rows as T[] };
    }
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const leagueId = String(values[0]);
      return {
        results: [...this.memberships]
          .filter((key) => key.startsWith(`${leagueId}:`))
          .map((key) => {
            const userId = key.split(':')[1];
            const user = this.users.get(userId)!;
            return {
              league_id: leagueId, season_id: null, user_id: userId, active: 1,
              joined_at: now.toISOString(), username: user.username, profile_image_url: user.profile_image_url,
            };
          }) as T[],
      };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-20T12:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  const base = { profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() };
  db.users.set('admin-1', { id: 'admin-1', google_sub: 'g-admin', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 1, ...base });
  db.users.set('player-1', { id: 'player-1', google_sub: 'g-player', email: 'player@example.com', username: 'Player', role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0, ...base });
  db.users.set('player-2', { id: 'player-2', google_sub: 'g-player-2', email: 'player2@example.com', username: 'Player Two', role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0, ...base });
  db.leagues.set('league-1', {
    id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', season_name: '2026', status: 'OPEN',
    max_legs: 5, points_per_win: 2, points_per_draw: 0, points_per_loss: 0, target_legs: 3,
    created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin-1',
    max_players: 2, matches_per_pair: 1, visibility: 'PRIVATE',
  });
  db.leagues.set('league-private', {
    id: 'league-private', name: 'Private Tuesday', slug: 'private-tuesday', season_name: '2026', status: 'OPEN',
    max_legs: 5, points_per_win: 2, points_per_draw: 0, points_per_loss: 0, target_legs: 3,
    created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'player-2',
    max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE',
  });
  db.memberships.add('league-1:admin-1');
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, publicRoutes: createLeagueRoutes(), adminRoutes: createAdminLeagueRoutes({ now: () => now }) };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `misfits_session=${session.token}`;
}

describe('private club league routes', () => {
  it('creates omitted visibility as private and exposes it only after approved authentication', async () => {
    const { db, env, adminRoutes, publicRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const created = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST',
      headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Friday Club', seasonName: '2027', maxPlayers: 8, matchesPerPair: 1, targetLegs: 3, pointsPerWin: 2 }),
    }), env, {} as never);
    expect(created.status).toBe(201);
    const body = await created.json() as { league: { id: string; visibility: string } };
    expect(body.league.visibility).toBe('PRIVATE');
    expect(db.leagues.get(body.league.id)?.visibility).toBe('PRIVATE');

    expect((await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues'), env, {} as never)).status).toBe(401);
    const clubList = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues', { headers: { Cookie: adminCookie } }), env, {} as never);
    expect(clubList.status).toBe(200);
    expect((await clubList.json() as { leagues: Array<{ id: string }> }).leagues.map((league) => league.id)).toContain(body.league.id);
  });

  it('reserves league management for approved club administrators', async () => {
    const { db, env, adminRoutes } = setup();
    const playerCookie = await cookieFor(db, 'player-1');
    const adminCookie = await cookieFor(db, 'admin-1');

    const createAsPlayer = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tuesday 501', seasonName: '2026', maxPlayers: 8 }),
    }), env, {} as never);
    expect(createAsPlayer.status).toBe(403);

    const edited = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-private', {
      method: 'PATCH', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPlayers: 12, matchesPerPair: 2, maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0, status: 'CLOSED' }),
    }), env, {} as never);
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ league: { maxPlayers: 12, matchesPerPair: 2, maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, status: 'CLOSED' } });

    const listed = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', { headers: { Cookie: adminCookie } }), env, {} as never);
    expect(listed.status).toBe(200);
    expect((await listed.json() as { leagues: unknown[] }).leagues).toHaveLength(2);
  });

  it('lists personal leagues by active participation only', async () => {
    const { db, env, publicRoutes } = setup();
    db.inactiveMemberships.add('league-private:player-2');
    const response = await publicRoutes.fetch(new Request('https://misfits.test/api/me/leagues', { headers: { Cookie: await cookieFor(db, 'player-2') } }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ leagues: [] });
  });

  it('does not reduce a league below its active member count', async () => {
    const { db, env, adminRoutes } = setup();
    db.memberships.add('league-1:player-1');
    db.memberships.add('league-1:player-2');
    const response = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1', {
      method: 'PATCH', headers: { Cookie: await cookieFor(db, 'admin-1'), Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPlayers: 2 }),
    }), env, {} as never);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'LEAGUE_FULL' } });
  });

  it('treats a member reactivation that loses a concurrent race as idempotent', async () => {
    const { db, env, adminRoutes } = setup();
    db.inactiveMemberships.add('league-1:player-1');
    db.forceMembershipReactivationRace = true;
    const response = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/members/player-1', {
      method: 'PATCH', headers: { Cookie: await cookieFor(db, 'admin-1'), Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ member: { userId: 'player-1', active: true } });
  });

  it('does not expose retired league invite creation, listing, revocation or self-join routes', async () => {
    const { db, env, adminRoutes, publicRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const playerCookie = await cookieFor(db, 'player-1');
    const requests = [
      adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', { method: 'GET', headers: { Cookie: adminCookie } }), env, {} as never),
      adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', { method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test' } }), env, {} as never),
      adminRoutes.fetch(new Request('https://misfits.test/api/admin/invites/legacy/revoke', { method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test' } }), env, {} as never),
      publicRoutes.fetch(new Request('https://misfits.test/api/invites/legacy-token/join', { method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test' } }), env, {} as never),
    ];
    for (const response of await Promise.all(requests)) expect(response.status).toBe(404);
  });

  it('lists every club league for an approved member, including unassigned members', async () => {
    const { db, env, publicRoutes } = setup();
    const response = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues', { headers: { Cookie: await cookieFor(db, 'player-1') } }), env, {} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.json() as { leagues: Array<Record<string, unknown>> };
    expect(body.leagues).toHaveLength(2);
    expect(body.leagues).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: 'misfits-501', visibility: 'PRIVATE' }),
      expect.objectContaining({ slug: 'private-tuesday', visibility: 'PRIVATE' }),
    ]));
    expect(body.leagues.every((league) => !Object.hasOwn(league, 'email'))).toBe(true);
  });

  it('lists active league players without private account fields', async () => {
    const { db, env, publicRoutes } = setup();
    const response = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/players', { headers: { Cookie: await cookieFor(db, 'player-1') } }), env, {} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.json() as { players: Array<Record<string, unknown>> };
    expect(body.players).toEqual([{ id: 'admin-1', username: 'Admin', profileImageUrl: null }]);
    expect(body.players[0]).not.toHaveProperty('email');
  });

  it('denies anonymous reads while approved unassigned members can browse private league detail', async () => {
    const { db, env, publicRoutes } = setup();
    const anonymous = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/private-tuesday'), env, {} as never);
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get('cache-control')).toBe('no-store');

    const approved = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/private-tuesday', { headers: { Cookie: await cookieFor(db, 'player-1') } }), env, {} as never);
    expect(approved.status).toBe(200);
    expect(approved.headers.get('cache-control')).toBe('private, no-store');
    expect(await approved.json()).toMatchObject({ league: { visibility: 'PRIVATE', slug: 'private-tuesday' } });
  });

  it('allows approved members to read fixture schedules without using admin routes', async () => {
    const { db, env, publicRoutes } = setup();
    const anonymous = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/fixtures'), env, {} as never);
    expect(anonymous.status).toBe(401);

    const approved = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/fixtures', {
      headers: { Cookie: await cookieFor(db, 'player-1') },
    }), env, {} as never);
    expect(approved.status).toBe(200);
    expect(approved.headers.get('cache-control')).toBe('private, no-store');
    expect(await approved.json()).toEqual({ fixtures: [] });
  });
});
