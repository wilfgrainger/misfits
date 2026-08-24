import { describe, expect, it, vi } from 'vitest';
import { createAuthRoutes } from '../../src/server/routes/auth';
import type { GoogleIdentity } from '../../src/server/auth/google';
import { issueSession } from '../../src/server/auth/session';

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

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
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

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  leaguePlayers = new Set<string>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
    };
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, googleSub, email, createdAt, lastLoginAt] = values as string[];
      if ([...this.users.values()].some((candidate) => candidate.google_sub === googleSub)) throw new Error('UNIQUE constraint failed: users.google_sub');
      this.users.set(id, user({ id, google_sub: googleSub, email, username: null, club_status: 'PENDING', created_at: createdAt, last_login_at: lastLoginAt }));
    } else if (sql.startsWith('UPDATE users SET email')) {
      const [email, lastLoginAt, id] = values as string[];
      const current = this.users.get(id)!;
      current.email = email;
      current.last_login_at = lastLoginAt;
    } else if (sql.includes('is_master_admin = 1')) {
      const current = this.users.get(String(values[0]))!;
      current.role = 'ADMIN';
      current.is_master_admin = 1;
      current.club_status = 'APPROVED';
    } else if (sql.includes('SET is_master_admin = 0')) {
      this.users.get(String(values[0]))!.is_master_admin = 0;
    } else if (sql.includes("UPDATE users SET role = 'ADMIN'")) {
      const current = this.users.get(String(values[0]))!;
      current.role = 'ADMIN';
      current.club_status = 'APPROVED';
    } else if (sql.startsWith('UPDATE users SET profile_image_url')) {
      this.users.get(String(values[1]))!.profile_image_url = String(values[0]);
    } else if (sql.startsWith('UPDATE users SET username')) {
      const [username, lastLoginAt, id] = values as string[];
      if ([...this.users.values()].some((candidate) => candidate.id !== id && candidate.username?.toLowerCase() === username.toLowerCase())) {
        throw new Error('UNIQUE constraint failed: users.username');
      }
      const current = this.users.get(id)!;
      current.username = username;
      current.last_login_at = lastLoginAt;
    } else if (sql.startsWith('INSERT OR IGNORE INTO league_players')) {
      this.leaguePlayers.add(String(values[0]));
    } else if (sql.startsWith('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.startsWith('DELETE FROM sessions')) {
      this.sessions.delete(String(values[0]));
    }
    return { success: true };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('COUNT(*)')) return { count: [...this.users.values()].filter((candidate) => candidate.role === 'ADMIN').length } as T;
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const current = session && this.users.get(session.user_id);
      if (!session || !current || session.expires_at <= String(values[1])) return null;
      return { ...current, ...session } as T;
    }
    if (sql.includes('FROM users WHERE google_sub')) {
      return ([...this.users.values()].find((candidate) => candidate.google_sub === String(values[0])) ?? null) as T | null;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T | null;
    return null;
  }
}

function setup() {
  const db = new MemoryD1();
  const state = 'state-for-test';
  let identity: GoogleIdentity = { sub: 'google-1', email: 'admin@example.com', emailVerified: true };
  const exchange = vi.fn(async () => identity);
  const verifyCredential = vi.fn(async () => identity);
  const routes = createAuthRoutes({ exchange, verifyCredential, state: () => state, now: () => new Date('2026-08-20T12:00:00.000Z') });
  const env = {
    DB: db as never,
    ASSETS: {} as never,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    APP_ORIGIN: 'https://misfits.test',
    BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
  };
  return { db, routes, env, state, exchange, verifyCredential, setIdentity: (next: GoogleIdentity) => { identity = next; } };
}

function sessionFrom(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').match(/league_board_session=([^;]+)/)?.[1] ?? '';
}

function gis(credential = 'google-id-token-123456') {
  return new Request('https://misfits.test/api/auth/google', {
    method: 'POST',
    headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
}

describe('Google auth routes', () => {
  it('accepts the configured admin through Google Identity Services', async () => {
    const { routes, env, verifyCredential, db } = setup();
    const response = await routes.fetch(gis(), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(response.status).toBe(200);
    expect(verifyCredential).toHaveBeenCalledWith('google-id-token-123456', 'client-id');
    expect([...db.users.values()][0]).toMatchObject({ role: 'ADMIN', is_master_admin: 1, club_status: 'APPROVED' });
    expect(response.headers.get('set-cookie')).toContain('league_board_session=');
    expect(await response.json()).toMatchObject({ requiresOnboarding: true, user: { role: 'ADMIN', clubStatus: 'APPROVED', isMasterAdmin: true } });
  });

  it('refreshes the Google profile picture for an existing approved member', async () => {
    const { routes, env, setIdentity, db } = setup();
    db.users.set('picture-user', user({ id: 'picture-user', google_sub: 'google-picture', email: 'picture@example.com' }));
    setIdentity({ sub: 'google-picture', email: 'picture@example.com', emailVerified: true, picture: 'https://lh3.googleusercontent.com/picture' });
    const response = await routes.fetch(gis(), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { clubStatus: 'APPROVED', profileImageUrl: 'https://lh3.googleusercontent.com/picture' } });
  });

  it('removes stale master access when the configured master email no longer matches', async () => {
    const { routes, env, setIdentity, db } = setup();
    const first = await routes.fetch(gis(), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(first.status).toBe(200);
    setIdentity({ sub: 'google-1', email: 'changed@example.com', emailVerified: true });
    const second = await routes.fetch(gis(), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(second.status).toBe(200);
    expect([...db.users.values()][0]).toMatchObject({ role: 'ADMIN', is_master_admin: 0, club_status: 'APPROVED' });
  });

  it('promotes an existing approved identity when its verified email becomes the configured master email', async () => {
    const { routes, env, setIdentity, db } = setup();
    db.users.set('existing-user', user({ id: 'existing-user', google_sub: 'google-existing', email: 'ordinary@example.com' }));
    setIdentity({ sub: 'google-existing', email: 'ordinary@example.com', emailVerified: true });
    const first = await routes.fetch(gis(), { ...env, MASTER_ADMIN_EMAIL: 'master@example.com' }, {} as never);
    expect(first.status).toBe(200);
    expect(db.users.get('existing-user')).toMatchObject({ role: 'PLAYER', is_master_admin: 0, club_status: 'APPROVED' });

    setIdentity({ sub: 'google-existing', email: 'master@example.com', emailVerified: true });
    const second = await routes.fetch(gis(), { ...env, MASTER_ADMIN_EMAIL: 'master@example.com' }, {} as never);
    expect(second.status).toBe(200);
    expect(db.users.get('existing-user')).toMatchObject({ role: 'ADMIN', is_master_admin: 1, club_status: 'APPROVED', email: 'master@example.com' });
  });

  it('rejects a Google Identity Services credential from another origin', async () => {
    const { routes, env, verifyCredential } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-123456' }),
    }), env, {} as never);
    expect(response.status).toBe(403);
    expect(verifyCredential).not.toHaveBeenCalled();
  });

  it('fails closed when Google production configuration is absent', async () => {
    const { routes, env } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/auth/google'), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ error: { code: 'CONFIGURATION_ERROR' } });
  });

  it('creates OAuth state and refuses a callback with the wrong state without exchanging', async () => {
    const { routes, env, state, exchange } = setup();
    const start = await routes.fetch(new Request('https://misfits.test/auth/google'), env, {} as never);
    expect(start.status).toBe(302);
    const stateCookie = start.headers.get('set-cookie')!;
    const callback = await routes.fetch(new Request('https://misfits.test/auth/google/callback?state=wrong&code=code', { headers: { Cookie: stateCookie } }), env, {} as never);
    expect(callback.status).toBe(400);
    expect(exchange).not.toHaveBeenCalled();
    expect(await callback.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(state).toBe('state-for-test');
  });

  it('bootstraps the configured admin, completes onboarding, signs in an existing member, and logs out', async () => {
    const { routes, env, state, db, setIdentity } = setup();
    const callback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=${state}&code=code`, { headers: { Cookie: `misfits_oauth_state=${state}` } }), env, {} as never);
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toBe('/onboarding');
    const session = sessionFrom(callback);
    expect(session).not.toBe('');

    const meBefore = await routes.fetch(new Request('https://misfits.test/api/me', { headers: { Cookie: `misfits_session=${session}` } }), env, {} as never);
    expect(await meBefore.json()).toMatchObject({ requiresOnboarding: true, user: { role: 'ADMIN', clubStatus: 'APPROVED' } });

    const onboarding = await routes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${session}`, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  Dart   Admin  ' }),
    }), env, {} as never);
    expect(onboarding.status).toBe(200);
    expect(await onboarding.json()).toMatchObject({ requiresOnboarding: false, user: { username: 'Dart Admin' } });
    expect(db.leaguePlayers.size).toBe(0);

    db.users.set('second-user', user({ id: 'second-user', google_sub: 'google-2', email: 'second@example.com', username: null }));
    setIdentity({ sub: 'google-2', email: 'second@example.com', emailVerified: true });
    const secondCallback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=${state}&code=second-code`, { headers: { Cookie: `misfits_oauth_state=${state}` } }), env, {} as never);
    expect(secondCallback.status).toBe(302);
    expect(secondCallback.headers.get('location')).toBe('/onboarding');
    const secondSession = sessionFrom(secondCallback);

    const duplicate = await routes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${secondSession}`, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dart admin' }),
    }), env, {} as never);
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: 'USERNAME_UNAVAILABLE' } });

    const logout = await routes.fetch(new Request('https://misfits.test/auth/logout', {
      method: 'POST', headers: { Cookie: `misfits_session=${session}`, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(logout.status).toBe(200);
    const meAfter = await routes.fetch(new Request('https://misfits.test/api/me', { headers: { Cookie: `misfits_session=${session}` } }), env, {} as never);
    expect(meAfter.status).toBe(401);
  });

  it('rejects a cross-origin username mutation', async () => {
    const { routes, env, state } = setup();
    const callback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=${state}&code=code`, { headers: { Cookie: `misfits_oauth_state=${state}` } }), env, {} as never);
    const session = sessionFrom(callback);
    const response = await routes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${session}`, Origin: 'https://evil.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Player One' }),
    }), env, {} as never);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('explains a suspended session at the bootstrap boundary without returning club data', async () => {
    const { routes, env, db } = setup();
    db.users.set('suspended-user', user({ id: 'suspended-user', google_sub: 'google-suspended', status: 'SUSPENDED' }));
    const issued = await issueSession(db as never, 'suspended-user', new Date('2026-08-20T12:00:00.000Z'));
    const response = await routes.fetch(new Request('https://misfits.test/api/me', { headers: { Cookie: `misfits_session=${issued.token}` } }), env, {} as never);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended. Contact a club administrator.' } });
  });

  it('revokes both generic and legacy sessions when both cookies are present', async () => {
    const { routes, env, db } = setup();
    const signedIn = await routes.fetch(gis(), env, {} as never);
    const genericSession = sessionFrom(signedIn);
    const userId = [...db.users.keys()][0];
    const legacySession = await issueSession(db as never, userId, new Date('2026-08-20T12:00:00.000Z'));

    const logout = await routes.fetch(new Request('https://misfits.test/auth/logout', {
      method: 'POST',
      headers: { Cookie: `league_board_session=${genericSession}; misfits_session=${legacySession.token}`, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(logout.status).toBe(200);

    const genericAfter = await routes.fetch(new Request('https://misfits.test/api/me', { headers: { Cookie: `league_board_session=${genericSession}` } }), env, {} as never);
    const legacyAfter = await routes.fetch(new Request('https://misfits.test/api/me', { headers: { Cookie: `misfits_session=${legacySession.token}` } }), env, {} as never);
    expect(genericAfter.status).toBe(401);
    expect(legacyAfter.status).toBe(401);
  });
});
