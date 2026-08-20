import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createProfileRoutes } from '../../src/server/routes/profile';

type User = {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  profile_image_url: string | null;
  darts_counter_url: string | null;
  created_at: string;
  last_login_at: string;
};

type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();

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
    if (sql.includes('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.includes('UPDATE users SET username = ?, darts_counter_url = ?')) {
      const [username, dartsCounterUrl, userId] = values as [string, string | null, string];
      const user = this.users.get(userId)!;
      user.username = username;
      user.darts_counter_url = dartsCounterUrl;
    }
    return { success: true };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    return null;
  }
}

const now = new Date('2026-08-20T12:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  db.users.set('player-1', {
    id: 'player-1', google_sub: 'google-1', email: 'player@example.com', username: 'Player',
    role: 'PLAYER', status: 'ACTIVE', profile_image_url: 'https://lh3.googleusercontent.com/avatar', darts_counter_url: null,
    created_at: now.toISOString(), last_login_at: now.toISOString(),
  });
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, routes: createProfileRoutes({ now: () => now }) };
}

describe('profile routes', () => {
  it('lets the signed-in user read and update only their own profile', async () => {
    const { db, env, routes } = setup();
    const session = await issueSession(db as never, 'player-1', now);
    const cookie = `misfits_session=${session.token}`;

    const read = await routes.fetch(new Request('https://misfits.test/api/me/profile', { headers: { Cookie: cookie } }), env, {} as never);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ profile: { username: 'Player', profileImageUrl: 'https://lh3.googleusercontent.com/avatar' } });

    const update = await routes.fetch(new Request('https://misfits.test/api/me/profile', {
      method: 'PATCH',
      headers: { Cookie: cookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  Player   One ', dartsCounterUrl: 'https://darts.example/wilf' }),
    }), env, {} as never);
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({ profile: { username: 'Player One', dartsCounterUrl: 'https://darts.example/wilf' } });
    expect(db.users.get('player-1')).toMatchObject({ username: 'Player One', darts_counter_url: 'https://darts.example/wilf' });
  });

  it('rejects an unsafe profile link', async () => {
    const { env, routes, db } = setup();
    const session = await issueSession(db as never, 'player-1', now);
    const response = await routes.fetch(new Request('https://misfits.test/api/me/profile', {
      method: 'PATCH',
      headers: { Cookie: `misfits_session=${session.token}`, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ dartsCounterUrl: 'javascript:alert(1)' }),
    }), env, {} as never);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'PROFILE_INVALID' } });
  });
});
