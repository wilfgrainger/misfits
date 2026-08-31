import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createAdminRoutes } from '../../src/server/routes/admin';

type User = {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  club_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_master_admin: number;
  created_at: string;
  last_login_at: string;
};

type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type Audit = { actor_user_id: string; action: string; entity_type: string; entity_id: string; before_json: string; after_json: string };

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  leaguePlayers = new Set<string>();
  audit: Audit[] = [];
  failAuditWrites = false;

  prepare(sql: string) {
    const prepared = {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
    return prepared;
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    const usersBefore = new Map([...this.users].map(([id, user]) => [id, { ...user }]));
    const auditBefore = this.audit.map((entry) => ({ ...entry }));
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    } catch (error) {
      this.users = usersBefore;
      this.audit = auditBefore;
      throw error;
    }
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.includes('UPDATE users SET role = ?, status = ?, club_status = ?')) {
      const [role, status, clubStatus, id, removingActiveAdmin] = values as ['PLAYER' | 'ADMIN', 'ACTIVE' | 'SUSPENDED', User['club_status'], string, number];
      if (removingActiveAdmin === 1) {
        const hasOtherAdmin = [...this.users.values()].some((user) => user.id !== id && user.role === 'ADMIN' && user.status === 'ACTIVE' && user.club_status === 'APPROVED');
        if (!hasOtherAdmin) return { success: true, meta: { changes: 0 } };
      }
      const user = this.users.get(id)!;
      user.role = role;
      user.status = status;
      user.club_status = clubStatus;
      return { success: true, meta: { changes: 1 } };
    } else if (sql.includes('UPDATE users SET role = ?, status = ?')) {
      const [role, status, id] = values as ['PLAYER' | 'ADMIN', 'ACTIVE' | 'SUSPENDED', string];
      const user = this.users.get(id)!;
      user.role = role;
      user.status = status;
    } else if (sql.includes('INSERT INTO audit_log')) {
      if (this.failAuditWrites) throw new Error('audit unavailable');
      const [actorUserId, entityId, beforeJson, afterJson] = values as string[];
      this.audit.push({ actor_user_id: actorUserId, action: 'ADMIN_PLAYER_UPDATED', entity_type: 'USER', entity_id: entityId, before_json: beforeJson, after_json: afterJson });
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
    if (sql.includes('COUNT(*)') && sql.includes("role = 'ADMIN'") && sql.includes("status = 'ACTIVE'")) {
      return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN' && user.status === 'ACTIVE' && user.club_status === 'APPROVED').length } as T;
    }
    if (sql.includes('FROM users WHERE id')) {
      const user = this.users.get(String(values[0]));
      return (user ? { ...user } : null) as T;
    }
    return null;
  }

  private async all<T>(sql: string): Promise<{ results: T[] }> {
    if (sql.includes('FROM users')) {
      const rows = [...this.users.values()].flatMap((user) => {
        const memberships = [...this.leaguePlayers].filter((key) => key === user.id || key.endsWith(`:${user.id}`));
        if (sql.includes('LEFT JOIN league_players')) {
          return (memberships.length > 0 ? memberships : [null]).map(() => ({ ...user, league_active: memberships.length > 0 ? 1 : 0 }));
        }
        return [{ ...user, league_active: memberships.length > 0 ? 1 : 0 }];
      });
      return { results: rows as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-20T12:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  db.users.set('admin-1', {
    id: 'admin-1', google_sub: 'google-admin', email: 'admin@example.com', username: 'Admin',
    role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', created_at: now.toISOString(), last_login_at: now.toISOString(),
    is_master_admin: 1,
  });
  db.users.set('player-1', {
    id: 'player-1', google_sub: 'google-player', email: 'player@example.com', username: 'Player',
    role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', created_at: now.toISOString(), last_login_at: now.toISOString(),
    is_master_admin: 0,
  });
  db.leaguePlayers.add('player-1');
  const routes = createAdminRoutes({ now: () => now });
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, routes, env };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `misfits_session=${session.token}`;
}

describe('admin routes', () => {
  it('requires an active administrator and lists users with league state', async () => {
    const { db, routes, env } = setup();
    const unauthenticated = await routes.fetch(new Request('https://misfits.test/api/admin/players'), env, {} as never);
    expect(unauthenticated.status).toBe(401);

    const playerCookie = await cookieFor(db, 'player-1');
    const player = await routes.fetch(new Request('https://misfits.test/api/admin/players', { headers: { Cookie: playerCookie } }), env, {} as never);
    expect(player.status).toBe(403);

    const adminCookie = await cookieFor(db, 'admin-1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players', { headers: { Cookie: adminCookie } }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      players: [
        { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE', leagueActive: false },
        { id: 'player-1', email: 'player@example.com', role: 'PLAYER', status: 'ACTIVE', leagueActive: true },
      ],
    });
  });

  it('lists each user once when they belong to multiple leagues', async () => {
    const { db, routes, env } = setup();
    db.leaguePlayers.add('league-1:player-1');
    db.leaguePlayers.add('league-2:player-1');
    const cookie = await cookieFor(db, 'admin-1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players', { headers: { Cookie: cookie } }), env, {} as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { players: Array<{ id: string }> };
    expect(body.players.filter((player) => player.id === 'player-1')).toHaveLength(1);
  });

  it('lets an administrator promote a player and records the change', async () => {
    const { db, routes, env } = setup();
    const cookie = await cookieFor(db, 'admin-1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/player-1', {
      method: 'PATCH',
      headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' }),
    }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ player: { id: 'player-1', role: 'ADMIN', status: 'ACTIVE', leagueActive: true } });
    expect(db.audit).toHaveLength(1);
    expect(db.audit[0]).toMatchObject({ actor_user_id: 'admin-1', action: 'ADMIN_PLAYER_UPDATED', entity_type: 'USER', entity_id: 'player-1' });
    expect(JSON.parse(db.audit[0].before_json)).toMatchObject({ role: 'PLAYER' });
    expect(JSON.parse(db.audit[0].after_json)).toMatchObject({ role: 'ADMIN' });
  });

  it('rolls back an administrator change when its audit write fails', async () => {
    const { db, routes, env } = setup();
    db.failAuditWrites = true;
    const cookie = await cookieFor(db, 'admin-1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/player-1', {
      method: 'PATCH',
      headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' }),
    }), env, {} as never);
    expect(response.status).toBe(400);
    expect(db.users.get('player-1')).toMatchObject({ role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED' });
    expect(db.audit).toHaveLength(0);
  });

  it('prevents removing or suspending the last active administrator', async () => {
    const { db, routes, env } = setup();
    const cookie = await cookieFor(db, 'admin-1');
    for (const body of [{ role: 'PLAYER' }, { status: 'SUSPENDED' }]) {
      const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/admin-1', {
        method: 'PATCH',
        headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }), env, {} as never);
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: { code: 'LAST_ADMIN_PROTECTED' } });
    }
    expect(db.audit).toHaveLength(0);
  });

  it('protects the master administrator even when another administrator exists', async () => {
    const { db, routes, env } = setup();
    db.users.set('admin-2', {
      id: 'admin-2', google_sub: 'google-admin-2', email: 'admin2@example.com', username: 'Admin Two',
      role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', created_at: now.toISOString(), last_login_at: now.toISOString(), is_master_admin: 0,
    });
    const cookie = await cookieFor(db, 'admin-1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/admin-1', {
      method: 'PATCH',
      headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'PLAYER' }),
    }), env, {} as never);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'MASTER_ADMIN_PROTECTED' } });
    expect(db.users.get('admin-1')).toMatchObject({ role: 'ADMIN', status: 'ACTIVE', is_master_admin: 1 });
    expect(db.audit).toHaveLength(0);
  });

  it('rejects state-changing admin requests from another origin', async () => {
    const { db, routes, env } = setup();
    const cookie = await cookieFor(db, 'admin-1');
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/player-1', {
      method: 'PATCH',
      headers: { Cookie: cookie, Origin: 'https://evil.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' }),
    }), env, {} as never);
    expect(response.status).toBe(403);
    expect(db.users.get('player-1')?.role).toBe('PLAYER');
  });
});