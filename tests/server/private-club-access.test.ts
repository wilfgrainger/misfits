import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { requireAdmin, type AuthAppEnv } from '../../src/server/auth/guards';
import { publicUser } from '../../src/server/db/users';
import { createAuthRoutes } from '../../src/server/routes/auth';
import { createLeagueRoutes } from '../../src/server/routes/leagues';
import { createProfileRoutes } from '../../src/server/routes/profile';
import { createResultRoutes } from '../../src/server/routes/results';

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
  created_by: string;
  max_players: number;
  matches_per_pair: number;
  visibility: 'PUBLIC' | 'PRIVATE';
};
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  leagues = new Map<string, League>();
  sessions = new Map<string, Session>();

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
    }
    if (sql.includes('UPDATE users SET username = ?')) {
      const [username, lastLoginAt, userId] = values as [string, string, string];
      const user = this.users.get(userId);
      if (user) Object.assign(user, { username, last_login_at: lastLoginAt });
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
    if (sql.includes('FROM users WHERE id = ?') || (sql.includes('FROM users') && sql.includes('WHERE id = ?'))) {
      return (this.users.get(String(values[0])) ?? null) as T;
    }
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ? OR slug = ?')) {
      return ([...this.leagues.values()].find((league) => league.id === String(values[0]) || league.slug === String(values[1])) ?? null) as T;
    }
    return null;
  }

  private async all<T>(sql: string, _values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues')) {
      const leagues = [...this.leagues.values()].filter((league) => !sql.includes("visibility = 'PUBLIC'") || league.visibility === 'PUBLIC');
      return { results: leagues as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-22T21:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  const addUser = (id: string, clubStatus: ClubStatus, role: 'PLAYER' | 'ADMIN' = 'PLAYER') => {
    db.users.set(id, {
      id,
      google_sub: `google-${id}`,
      email: `${id}@example.com`,
      username: id,
      role,
      status: 'ACTIVE',
      club_status: clubStatus,
      is_master_admin: 0,
      profile_image_url: null,
      darts_counter_url: null,
      created_at: now.toISOString(),
      last_login_at: now.toISOString(),
    });
  };
  addUser('pending', 'PENDING');
  addUser('rejected', 'REJECTED');
  addUser('approved', 'APPROVED');
  addUser('pending-admin', 'PENDING', 'ADMIN');
  db.leagues.set('public-league', {
    id: 'public-league', name: 'Public legacy', slug: 'public-legacy', season_name: '2026', status: 'OPEN', max_legs: 5,
    points_per_win: 2, points_per_draw: 0, points_per_loss: 0, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(),
    created_by: 'approved', max_players: 8, matches_per_pair: 1, visibility: 'PUBLIC',
  });
  db.leagues.set('private-league', {
    id: 'private-league', name: 'Private club league', slug: 'private-club', season_name: '2026', status: 'OPEN', max_legs: 5,
    points_per_win: 2, points_per_draw: 0, points_per_loss: 0, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(),
    created_by: 'approved', max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE',
  });
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return {
    db,
    env,
    leagueRoutes: createLeagueRoutes({ now: () => now }),
    resultRoutes: createResultRoutes({ now: () => now }),
    profileRoutes: createProfileRoutes({ now: () => now }),
    authRoutes: createAuthRoutes({ now: () => now }),
  };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `league_board_session=${session.token}`;
}

async function errorCode(response: Response) {
  const body = await response.json() as { error?: { code?: string } };
  return body.error?.code;
}

describe('private club membership contract', () => {
  it('exposes permanent club membership state separately from account status', () => {
    const user = publicUser({
      id: 'user-1',
      username: null,
      role: 'PLAYER',
      status: 'ACTIVE',
      club_status: 'PENDING',
      profile_image_url: null,
      darts_counter_url: null,
      is_master_admin: 0,
    } as never);

    expect(user).toMatchObject({
      id: 'user-1',
      status: 'ACTIVE',
      clubStatus: 'PENDING',
    });
  });

  it('denies anonymous club league reads', async () => {
    const { env, leagueRoutes } = setup();
    const response = await leagueRoutes.fetch(new Request('https://misfits.test/api/public/leagues'), env, {} as never);
    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe('UNAUTHENTICATED');
  });

  it('returns membership-specific errors for pending and rejected club reads', async () => {
    const { db, env, leagueRoutes } = setup();
    const pending = await leagueRoutes.fetch(new Request('https://misfits.test/api/public/leagues', { headers: { Cookie: await cookieFor(db, 'pending') } }), env, {} as never);
    const rejected = await leagueRoutes.fetch(new Request('https://misfits.test/api/public/leagues', { headers: { Cookie: await cookieFor(db, 'rejected') } }), env, {} as never);
    expect(pending.status).toBe(403);
    expect(await errorCode(pending)).toBe('MEMBERSHIP_PENDING');
    expect(rejected.status).toBe(403);
    expect(await errorCode(rejected)).toBe('MEMBERSHIP_REJECTED');
  });

  it('lets an approved unassigned member browse every club league with private caching', async () => {
    const { db, env, leagueRoutes } = setup();
    const cookie = await cookieFor(db, 'approved');
    const response = await leagueRoutes.fetch(new Request('https://misfits.test/api/public/leagues', { headers: { Cookie: cookie } }), env, {} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await response.json() as { leagues: Array<{ id: string }> };
    expect(body.leagues.map((league) => league.id).sort()).toEqual(['private-league', 'public-league']);

    const detail = await leagueRoutes.fetch(new Request('https://misfits.test/api/public/leagues/private-league', { headers: { Cookie: cookie } }), env, {} as never);
    expect(detail.status).toBe(200);
    expect(detail.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('blocks pending members from personal results, profile and nickname routes', async () => {
    const { db, env, resultRoutes, profileRoutes, authRoutes } = setup();
    const cookie = await cookieFor(db, 'pending');
    const results = await resultRoutes.fetch(new Request('https://misfits.test/api/me/results', { headers: { Cookie: cookie } }), env, {} as never);
    const profile = await profileRoutes.fetch(new Request('https://misfits.test/api/me/profile', { headers: { Cookie: cookie } }), env, {} as never);
    const nickname = await authRoutes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'WaitingPlayer' }),
    }), env, {} as never);
    expect(results.status).toBe(403);
    expect(await errorCode(results)).toBe('MEMBERSHIP_PENDING');
    expect(profile.status).toBe(403);
    expect(await errorCode(profile)).toBe('MEMBERSHIP_PENDING');
    expect(nickname.status).toBe(403);
    expect(await errorCode(nickname)).toBe('MEMBERSHIP_PENDING');
  });

  it('does not let an unapproved ADMIN role bypass club admission', async () => {
    const app = new Hono<AuthAppEnv>();
    app.use('*', async (c, next) => {
      c.set('user', { id: 'pending-admin', username: 'Pending admin', role: 'ADMIN', status: 'ACTIVE', clubStatus: 'PENDING', isMasterAdmin: false });
      return next();
    });
    app.get('/admin-only', requireAdmin, (c) => c.json({ ok: true }));
    const response = await app.request('/admin-only');
    expect(response.status).toBe(403);
  });
});
