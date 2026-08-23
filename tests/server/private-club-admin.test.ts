import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createAdminRoutes } from '../../src/server/routes/admin';

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
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type ClubInvite = { id: string; token_hash: string; created_by: string; expires_at: string | null; uses: number; revoked_at: string | null; created_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  memberships = new Set<string>();
  clubInvites = new Map<string, ClubInvite>();
  audits: Array<{ action: string; entityId: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }> = [];

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
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.includes('UPDATE users SET role = ?, status = ?, club_status = ?')) {
      const [role, status, clubStatus, id] = values as [User['role'], User['status'], ClubStatus, string];
      Object.assign(this.users.get(id)!, { role, status, club_status: clubStatus });
    } else if (sql.includes('UPDATE users SET role = ?, status = ?')) {
      const [role, status, id] = values as [User['role'], User['status'], string];
      Object.assign(this.users.get(id)!, { role, status });
    } else if (sql.includes('INSERT INTO club_invites')) {
      const [id, tokenHash, createdBy, expiresAt, createdAt] = values as [string, string, string, string | null, string];
      this.clubInvites.set(id, { id, token_hash: tokenHash, created_by: createdBy, expires_at: expiresAt, uses: 0, revoked_at: null, created_at: createdAt });
    } else if (sql.includes('UPDATE club_invites SET revoked_at')) {
      const [revokedAt, id] = values as [string, string];
      const invite = this.clubInvites.get(id);
      if (invite) invite.revoked_at = revokedAt;
    } else if (sql.includes('INSERT INTO audit_log')) {
      const action = /VALUES \(\?, '([^']+)'/.exec(sql)?.[1] ?? 'UNKNOWN';
      const entityId = String(values[1]);
      const jsonValues = values.filter((value) => typeof value === 'string' && value.startsWith('{')) as string[];
      const before = jsonValues[0] ? JSON.parse(jsonValues[0]) as Record<string, unknown> : null;
      const after = jsonValues[1] ? JSON.parse(jsonValues[1]) as Record<string, unknown> : null;
      this.audits.push({ action, entityId, before, after });
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
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    if (sql.includes('COUNT(*)') && sql.includes("role = 'ADMIN'")) {
      return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN' && user.status === 'ACTIVE').length } as T;
    }
    if (sql.includes('FROM club_invites') && sql.includes('WHERE id = ?')) return (this.clubInvites.get(String(values[0])) ?? null) as T;
    return null;
  }

  private async all<T>(sql: string, _values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM users')) {
      return { results: [...this.users.values()].map((user) => ({
        ...user,
        league_active: [...this.memberships].some((key) => key.endsWith(`:${user.id}`)) ? 1 : 0,
      })) as T[] };
    }
    if (sql.includes('FROM club_invites')) return { results: [...this.clubInvites.values()] as T[] };
    return { results: [] };
  }
}

const now = new Date('2026-08-22T22:10:00.000Z');

function setup() {
  const db = new MemoryD1();
  const base = { profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() };
  db.users.set('admin', { id: 'admin', google_sub: 'google-admin', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 1, ...base });
  db.users.set('pending', { id: 'pending', google_sub: 'google-pending', email: 'pending@example.com', username: null, role: 'PLAYER', status: 'ACTIVE', club_status: 'PENDING', is_master_admin: 0, ...base });
  db.users.set('member', { id: 'member', google_sub: 'google-member', email: 'member@example.com', username: 'Member', role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0, ...base });
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, routes: createAdminRoutes({ now: () => now }) };
}

async function adminCookie(db: MemoryD1) {
  const session = await issueSession(db as never, 'admin', now);
  return `league_board_session=${session.token}`;
}

function mutation(cookie: string, body?: unknown, method = 'POST') {
  return {
    method,
    headers: { Cookie: cookie, Origin: 'https://misfits.test', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

describe('admin-controlled club admission', () => {
  it('lists permanent club membership state and request date', async () => {
    const { db, env, routes } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players', { headers: { Cookie: await adminCookie(db) } }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ players: expect.arrayContaining([
      expect.objectContaining({ id: 'pending', email: 'pending@example.com', clubStatus: 'PENDING', createdAt: now.toISOString() }),
    ]) });
  });

  it('approves or rejects a pending member without assigning a league and audits the decision', async () => {
    const approved = setup();
    const approvedResponse = await approved.routes.fetch(new Request('https://misfits.test/api/admin/players/pending', mutation(await adminCookie(approved.db), { clubStatus: 'APPROVED' }, 'PATCH')), approved.env, {} as never);
    expect(approvedResponse.status).toBe(200);
    expect(approved.db.users.get('pending')?.club_status).toBe('APPROVED');
    expect(approved.db.memberships.size).toBe(0);
    expect(approved.db.audits.at(-1)).toMatchObject({ action: 'ADMIN_PLAYER_UPDATED', after: expect.objectContaining({ clubStatus: 'APPROVED' }) });

    const rejected = setup();
    const rejectedResponse = await rejected.routes.fetch(new Request('https://misfits.test/api/admin/players/pending', mutation(await adminCookie(rejected.db), { clubStatus: 'REJECTED' }, 'PATCH')), rejected.env, {} as never);
    expect(rejectedResponse.status).toBe(200);
    expect(rejected.db.users.get('pending')?.club_status).toBe('REJECTED');
    expect(rejected.db.memberships.size).toBe(0);
  });

  it('does not allow ADMIN role unless the resulting club status is approved', async () => {
    const { db, env, routes } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/pending', mutation(await adminCookie(db), { role: 'ADMIN' }, 'PATCH')), env, {} as never);
    expect(response.status).toBe(409);
    expect(db.users.get('pending')).toMatchObject({ role: 'PLAYER', club_status: 'PENDING' });
  });

  it('creates, lists and revokes club invitations without any league id or token hash exposure', async () => {
    const { db, env, routes } = setup();
    const cookie = await adminCookie(db);
    const created = await routes.fetch(new Request('https://misfits.test/api/admin/club-invites', mutation(cookie, { expiresAt: '2026-09-01T12:00:00.000Z' })), env, {} as never);
    expect(created.status).toBe(201);
    const createdBody = await created.json() as { invite: Record<string, unknown> };
    expect(createdBody.invite).toMatchObject({ expiresAt: '2026-09-01T12:00:00.000Z' });
    expect(createdBody.invite.url).toMatch(/^https:\/\/misfits\.test\/join\//);
    expect(createdBody.invite).not.toHaveProperty('leagueId');
    expect(createdBody.invite).not.toHaveProperty('tokenHash');

    const listed = await routes.fetch(new Request('https://misfits.test/api/admin/club-invites', { headers: { Cookie: cookie } }), env, {} as never);
    expect(listed.status).toBe(200);
    const listBody = await listed.json() as { invites: Array<Record<string, unknown>> };
    expect(listBody.invites).toHaveLength(1);
    expect(listBody.invites[0]).not.toHaveProperty('leagueId');
    expect(listBody.invites[0]).not.toHaveProperty('tokenHash');

    const id = String(createdBody.invite.id);
    const revoked = await routes.fetch(new Request(`https://misfits.test/api/admin/club-invites/${id}/revoke`, mutation(cookie)), env, {} as never);
    expect(revoked.status).toBe(200);
    expect(db.clubInvites.get(id)?.revoked_at).toBe(now.toISOString());
  });

  it('protects an approved administrator from being made pending or rejected', async () => {
    const { db, env, routes } = setup();
    for (const clubStatus of ['PENDING', 'REJECTED'] as const) {
      const response = await routes.fetch(new Request('https://misfits.test/api/admin/players/admin', mutation(await adminCookie(db), { clubStatus }, 'PATCH')), env, {} as never);
      expect(response.status).toBe(409);
      expect(db.users.get('admin')?.club_status).toBe('APPROVED');
    }
  });
});
