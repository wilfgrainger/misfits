import { describe, expect, it, vi } from 'vitest';
import { createAuthRoutes } from '../../src/server/routes/auth';
import type { GoogleIdentity } from '../../src/server/auth/google';

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

type Invite = {
  id: string;
  token_hash: string;
  created_by: string;
  expires_at: string | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
};

type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

class MemoryD1 {
  users = new Map<string, User>();
  invites = new Map<string, Invite>();
  sessions = new Map<string, Session>();
  insertedLeaguePlayers = 0;

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => ({ results: (await this.all<T>(sql, values)) }),
      }),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => ({ results: (await this.all<T>(sql, [])) }),
    };
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, googleSub, email, createdAt, lastLoginAt] = values as string[];
      this.users.set(id, {
        id,
        google_sub: googleSub,
        email,
        username: null,
        role: 'PLAYER',
        status: 'ACTIVE',
        club_status: 'PENDING',
        is_master_admin: 0,
        profile_image_url: null,
        darts_counter_url: null,
        created_at: createdAt,
        last_login_at: lastLoginAt,
      });
    } else if (sql.startsWith('UPDATE users SET email')) {
      const [email, lastLoginAt, id] = values as string[];
      const user = this.users.get(id)!;
      user.email = email;
      user.last_login_at = lastLoginAt;
    } else if (sql.startsWith('UPDATE users SET profile_image_url')) {
      this.users.get(String(values[1]))!.profile_image_url = String(values[0]);
    } else if (sql.includes("role = 'ADMIN'") && sql.includes("club_status = 'APPROVED'")) {
      const user = this.users.get(String(values[0]))!;
      user.role = 'ADMIN';
      user.club_status = 'APPROVED';
      if (sql.includes('is_master_admin = 1')) user.is_master_admin = 1;
    } else if (sql.includes('SET is_master_admin = 0')) {
      this.users.get(String(values[0]))!.is_master_admin = 0;
    } else if (sql.startsWith('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.startsWith('UPDATE club_invites SET uses')) {
      const invite = this.invites.get(String(values[0]));
      if (invite) invite.uses += 1;
    } else if (sql.startsWith('INSERT OR IGNORE INTO league_players')) {
      this.insertedLeaguePlayers += 1;
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM users WHERE google_sub')) {
      return ([...this.users.values()].find((user) => user.google_sub === String(values[0])) ?? null) as T | null;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T | null;
    if (sql.includes('COUNT(*)') && sql.includes("role = 'ADMIN'")) {
      return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN').length } as T;
    }
    if (sql.includes('FROM club_invites') && sql.includes('token_hash = ?')) {
      return ([...this.invites.values()].find((invite) => invite.token_hash === String(values[0])) ?? null) as T | null;
    }
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    return null;
  }

  private async all<T>(_sql: string, _values: unknown[]): Promise<T[]> {
    return [];
  }
}

function existingUser(overrides: Partial<User> = {}): User {
  return {
    id: 'existing-user',
    google_sub: 'google-existing',
    email: 'member@example.com',
    username: 'Member',
    role: 'PLAYER',
    status: 'ACTIVE',
    club_status: 'APPROVED',
    is_master_admin: 0,
    profile_image_url: null,
    darts_counter_url: null,
    created_at: '2026-08-01T00:00:00.000Z',
    last_login_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function setup(initialIdentity: GoogleIdentity = { sub: 'google-new', email: 'new@example.com', emailVerified: true }) {
  const db = new MemoryD1();
  let identity = initialIdentity;
  const verifyCredential = vi.fn(async () => identity);
  const exchange = vi.fn(async () => identity);
  const routes = createAuthRoutes({
    verifyCredential,
    exchange,
    state: () => 'state',
    now: () => new Date('2026-08-22T20:00:00.000Z'),
  });
  const env = {
    DB: db as never,
    ASSETS: {} as never,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    APP_ORIGIN: 'https://misfits.test',
    BOOTSTRAP_ADMIN_EMAIL: '',
    MASTER_ADMIN_EMAIL: '',
  };
  return { db, routes, env, setIdentity: (next: GoogleIdentity) => { identity = next; } };
}

function gisRequest(body: Record<string, unknown>) {
  return new Request('https://misfits.test/api/auth/google', {
    method: 'POST',
    headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('private club admission', () => {
  it('does not create an unknown Google user without a club invite', async () => {
    const { db, routes, env } = setup();
    const response = await routes.fetch(gisRequest({ credential: 'google-id-token-123456' }), env, {} as never);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'INVITE_REQUIRED' } });
    expect(db.users.size).toBe(0);
  });

  it('creates an unknown invited Google user as pending without league placement', async () => {
    const { db, routes, env } = setup();
    const token = 'valid-club-invite';
    db.invites.set('invite-1', {
      id: 'invite-1',
      token_hash: await hashToken(token),
      created_by: 'admin-1',
      expires_at: null,
      uses: 0,
      revoked_at: null,
      created_at: '2026-08-22T19:00:00.000Z',
    });

    const response = await routes.fetch(gisRequest({ credential: 'google-id-token-123456', inviteToken: token }), env, {} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { clubStatus: 'PENDING' } });
    expect([...db.users.values()]).toHaveLength(1);
    expect([...db.users.values()][0].club_status).toBe('PENDING');
    expect(db.invites.get('invite-1')?.uses).toBe(1);
    expect(db.insertedLeaguePlayers).toBe(0);
  });

  it('does not create a user for an invalid club invite', async () => {
    const { db, routes, env } = setup();
    const response = await routes.fetch(gisRequest({ credential: 'google-id-token-123456', inviteToken: 'invalid' }), env, {} as never);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'INVITE_INVALID' } });
    expect(db.users.size).toBe(0);
  });

  it('keeps an existing rejected member rejected even when another invite is supplied', async () => {
    const { db, routes, env } = setup({ sub: 'google-existing', email: 'member@example.com', emailVerified: true });
    db.users.set('existing-user', existingUser({ club_status: 'REJECTED' }));

    const response = await routes.fetch(gisRequest({ credential: 'google-id-token-123456', inviteToken: 'irrelevant' }), env, {} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { clubStatus: 'REJECTED' } });
    expect(db.users.get('existing-user')?.club_status).toBe('REJECTED');
  });

  it('does not let the OAuth callback create an unknown ordinary account', async () => {
    const { db, routes, env } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/auth/google/callback?state=state&code=code', {
      headers: { Cookie: 'league_board_oauth_state=state' },
    }), env, {} as never);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/?auth=invite-required');
    expect(db.users.size).toBe(0);
  });
});
