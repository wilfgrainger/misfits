import { describe, expect, it, vi } from 'vitest';
import { createAuthRoutes } from '../../src/server/routes/auth';
import type { GoogleIdentity } from '../../src/server/auth/google';
import { issueSession } from '../../src/server/auth/session';

type User = {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  is_master_admin: number;
  created_at: string;
  last_login_at: string;
};

type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  leaguePlayers = new Set<string>();
  nextId = 1;

  prepare(sql: string) {
    const prepared = {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
    };
    return prepared;
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, googleSub, email, createdAt, lastLoginAt] = values as string[];
      if ([...this.users.values()].some((user) => user.google_sub === googleSub)) {
        throw new Error('UNIQUE constraint failed: users.google_sub');
      }
      this.users.set(id, { id, google_sub: googleSub, email, username: null, role: 'PLAYER', status: 'ACTIVE', is_master_admin: 0, created_at: createdAt, last_login_at: lastLoginAt });
    } else if (sql.startsWith('UPDATE users SET email')) {
      const [email, lastLoginAt, id] = values as string[];
      const user = this.users.get(id)!;
      user.email = email;
      user.last_login_at = lastLoginAt;
    } else if (sql.includes('is_master_admin = 1')) {
      const user = this.users.get(String(values[0]))!;
      user.role = 'ADMIN';
      user.is_master_admin = 1;
    } else if (sql.includes('SET is_master_admin = 0')) {
      this.users.get(String(values[0]))!.is_master_admin = 0;
    } else if (sql.includes("UPDATE users SET role = 'ADMIN'")) {
      this.users.get(String(values[0]))!.role = 'ADMIN';
    } else if (sql.startsWith('UPDATE users SET profile_image_url')) {
      (this.users.get(String(values[1])) as User & { profile_image_url?: string }).profile_image_url = String(values[0]);
    } else if (sql.startsWith('UPDATE users SET username')) {
      const [username, lastLoginAt, id] = values as string[];
      if ([...this.users.values()].some((user) => user.id !== id && user.username?.toLowerCase() === username.toLowerCase())) {
        throw new Error('UNIQUE constraint failed: users.username');
      }
      const user = this.users.get(id)!;
      user.username = username;
      user.last_login_at = lastLoginAt;
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
    if (sql.includes('COUNT(*)')) return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN').length } as T;
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM users WHERE google_sub')) {
      return ([...this.users.values()].find((user) => user.google_sub === String(values[0])) ?? null) as T;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    return null;
  }
}

function setup() {
  const db = new MemoryD1();
  const state = 'state-for-test';
  let identity: GoogleIdentity = { sub: 'google-1', email: 'admin@example.com', emailVerified: true };
  const exchange = vi.fn(async () => identity);
  const verifyCredential = vi.fn(async () => identity);
  const routes = createAuthRoutes({
    exchange,
    verifyCredential,
    state: () => state,
    now: () => new Date('2026-08-20T12:00:00.000Z'),
  });
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
  const cookie = response.headers.get('set-cookie') ?? '';
  return cookie.match(/league_board_session=([^;]+)/)?.[1] ?? '';
}

describe('Google auth routes', () => {
  it('accepts a Google Identity Services credential through the same-origin API', async () => {
    const { routes, env, verifyCredential, db } = setup();
    const response = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-123456' }),
    }), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(response.status).toBe(200);
    expect(verifyCredential).toHaveBeenCalledWith('google-id-token-123456', 'client-id');
    expect([...db.users.values()][0].role).toBe('ADMIN');
    expect([...db.users.values()][0].is_master_admin).toBe(1);
    expect(response.headers.get('set-cookie')).toContain('league_board_session=');
    expect(await response.json()).toMatchObject({ requiresOnboarding: true, user: { role: 'ADMIN', isMasterAdmin: true } });
  });

  it('persists the verified Google profile picture in the local account', async () => {
    const { routes, env, setIdentity } = setup();
    setIdentity({ sub: 'google-picture', email: 'picture@example.com', emailVerified: true, picture: 'https://lh3.googleusercontent.com/picture' });
    const response = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-123456' }),
    }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { profileImageUrl: 'https://lh3.googleusercontent.com/picture' } });
  });

  it('removes stale master access when an existing Google identity no longer matches the configured master email', async () => {
    const { routes, env, setIdentity, db } = setup();
    const firstSignIn = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-123456' }),
    }), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(firstSignIn.status).toBe(200);
    expect([...db.users.values()][0]).toMatchObject({ role: 'ADMIN', is_master_admin: 1 });

    setIdentity({ sub: 'google-1', email: 'changed@example.com', emailVerified: true });
    const secondSignIn = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-123456' }),
    }), { ...env, GOOGLE_CLIENT_SECRET: '' }, {} as never);
    expect(secondSignIn.status).toBe(200);
    expect([...db.users.values()][0]).toMatchObject({ role: 'ADMIN', is_master_admin: 0 });
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
    const response = await routes.fetch(new Request('https://misfits.test/auth/google'), {
      ...env,
      GOOGLE_CLIENT_SECRET: '',
    }, {} as never);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ error: { code: 'CONFIGURATION_ERROR' } });
  });

  it('creates OAuth state and refuses a callback with the wrong state without exchanging', async () => {
    const { routes, env, state, exchange } = setup();
    const start = await routes.fetch(new Request('https://misfits.test/auth/google'), env, {} as never);
    expect(start.status).toBe(302);
    expect(start.headers.get('location')).toContain('response_type=code');
    expect(start.headers.get('set-cookie')).toContain('league_board_oauth_state=');
    const stateCookie = start.headers.get('set-cookie')!;

    const callback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=wrong&code=code`, {
      headers: { Cookie: stateCookie },
    }), env, {} as never);
    expect(callback.status).toBe(400);
    expect(exchange).not.toHaveBeenCalled();
    expect(await callback.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(state).toBe('state-for-test');
  });

  it('signs in, bootstraps the first admin, completes onboarding, and logs out', async () => {
    const { routes, env, state, db, setIdentity } = setup();
    const callback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=${state}&code=code`, {
      headers: { Cookie: `misfits_oauth_state=${state}` },
    }), env, {} as never);
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toBe('/onboarding');
    const session = sessionFrom(callback);
    expect(session).not.toBe('');
    expect([...db.users.values()][0].role).toBe('ADMIN');

    const meBefore = await routes.fetch(new Request('https://misfits.test/api/me', {
      headers: { Cookie: `misfits_session=${session}` },
    }), env, {} as never);
    expect(await meBefore.json()).toMatchObject({ requiresOnboarding: true, user: { role: 'ADMIN' } });

    const onboarding = await routes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${session}`, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  Dart   Admin  ' }),
    }), env, {} as never);
    expect(onboarding.status).toBe(200);
    expect(await onboarding.json()).toMatchObject({ requiresOnboarding: false, user: { username: 'Dart Admin' } });
    expect(db.leaguePlayers.has([...db.users.keys()][0])).toBe(false);

    setIdentity({ sub: 'google-2', email: 'second@example.com', emailVerified: true });
    const secondCallback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=${state}&code=second-code`, {
      headers: { Cookie: `misfits_oauth_state=${state}` },
    }), env, {} as never);
    const secondSession = sessionFrom(secondCallback);
    expect([...db.users.values()].find((user) => user.google_sub === 'google-2')).toMatchObject({ role: 'PLAYER', is_master_admin: 0 });

    const duplicate = await routes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${secondSession}`, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dart admin' }),
    }), env, {} as never);
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: 'USERNAME_UNAVAILABLE' } });

    const logout = await routes.fetch(new Request('https://misfits.test/auth/logout', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${session}`, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(logout.status).toBe(200);
    const meAfter = await routes.fetch(new Request('https://misfits.test/api/me', {
      headers: { Cookie: `misfits_session=${session}` },
    }), env, {} as never);
    expect(meAfter.status).toBe(401);
  });

  it('rejects a cross-origin username mutation', async () => {
    const { routes, env, state } = setup();
    const callback = await routes.fetch(new Request(`https://misfits.test/auth/google/callback?state=${state}&code=code`, {
      headers: { Cookie: `misfits_oauth_state=${state}` },
    }), env, {} as never);
    const session = sessionFrom(callback);
    const response = await routes.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${session}`, Origin: 'https://evil.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Player One' }),
    }), env, {} as never);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('revokes both generic and legacy sessions when both cookies are present', async () => {
    const { routes, env, db } = setup();
    const signedIn = await routes.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'google-id-token-123456' }),
    }), env, {} as never);
    const genericSession = sessionFrom(signedIn);
    const userId = [...db.users.keys()][0];
    const legacySession = await issueSession(db as never, userId, new Date('2026-08-20T12:00:00.000Z'));

    const logout = await routes.fetch(new Request('https://misfits.test/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `league_board_session=${genericSession}; misfits_session=${legacySession.token}`,
        Origin: 'https://misfits.test',
      },
    }), env, {} as never);
    expect(logout.status).toBe(200);

    const genericAfter = await routes.fetch(new Request('https://misfits.test/api/me', {
      headers: { Cookie: `league_board_session=${genericSession}` },
    }), env, {} as never);
    const legacyAfter = await routes.fetch(new Request('https://misfits.test/api/me', {
      headers: { Cookie: `misfits_session=${legacySession.token}` },
    }), env, {} as never);
    expect(genericAfter.status).toBe(401);
    expect(legacyAfter.status).toBe(401);
  });
});
