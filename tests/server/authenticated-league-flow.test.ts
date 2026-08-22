import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { GoogleIdentity } from '../../src/server/auth/google';
import type { AuthAppEnv } from '../../src/server/auth/guards';
import { createAuthRoutes } from '../../src/server/routes/auth';

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

class FlowD1 {
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
    } else if (sql.includes('is_master_admin = 1')) {
      const user = this.users.get(String(values[0]))!;
      user.role = 'ADMIN';
      user.is_master_admin = 1;
      user.club_status = 'APPROVED';
    } else if (sql.includes('SET is_master_admin = 0')) {
      this.users.get(String(values[0]))!.is_master_admin = 0;
    } else if (sql.includes("UPDATE users SET role = 'ADMIN'")) {
      const user = this.users.get(String(values[0]))!;
      user.role = 'ADMIN';
      user.club_status = 'APPROVED';
    } else if (sql.startsWith('UPDATE users SET username')) {
      const [username, lastLoginAt, id] = values as string[];
      const user = this.users.get(id)!;
      user.username = username;
      user.last_login_at = lastLoginAt;
    } else if (sql.startsWith('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('COUNT(*) AS count') && sql.includes("role = 'ADMIN'")) {
      return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN').length } as T;
    }
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM users WHERE google_sub')) {
      return ([...this.users.values()].find((user) => user.google_sub === String(values[0])) ?? null) as T | null;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T | null;
    return null;
  }
}

function cookieFrom(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').match(/league_board_session=([^;]+)/)?.[1] ?? '';
}

describe('authenticated private club lifecycle', () => {
  it('admits the configured admin and an existing approved member without conflating their competition placement', async () => {
    const db = new FlowD1();
    db.users.set('player-1', {
      id: 'player-1',
      google_sub: 'google-player',
      email: 'player@example.com',
      username: 'Player',
      role: 'PLAYER',
      status: 'ACTIVE',
      club_status: 'APPROVED',
      is_master_admin: 0,
      profile_image_url: null,
      darts_counter_url: null,
      created_at: '2026-08-01T00:00:00.000Z',
      last_login_at: '2026-08-01T00:00:00.000Z',
    });

    const identities = new Map<string, GoogleIdentity>([
      ['owner-token-credential-123456789', { sub: 'google-owner', email: 'master@example.com', emailVerified: true }],
      ['player-token-credential-123456789', { sub: 'google-player', email: 'player@example.com', emailVerified: true }],
    ]);
    const env = { DB: db as never, ASSETS: {} as never, GOOGLE_CLIENT_ID: 'client-id', APP_ORIGIN: 'https://misfits.test', MASTER_ADMIN_EMAIL: 'master@example.com' };
    const app = new Hono<AuthAppEnv>();
    app.route('/', createAuthRoutes({
      verifyCredential: async (credential) => identities.get(credential)!,
      now: () => new Date('2026-08-20T12:00:00.000Z'),
    }));

    const signIn = (credential: string) => app.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST',
      headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    }), env, {} as never);

    const ownerSignIn = await signIn('owner-token-credential-123456789');
    expect(ownerSignIn.status).toBe(200);
    expect(await ownerSignIn.json()).toMatchObject({
      requiresOnboarding: true,
      user: { role: 'ADMIN', clubStatus: 'APPROVED', isMasterAdmin: true },
    });
    expect(cookieFrom(ownerSignIn)).not.toBe('');

    const playerSignIn = await signIn('player-token-credential-123456789');
    expect(playerSignIn.status).toBe(200);
    expect(await playerSignIn.json()).toMatchObject({
      requiresOnboarding: false,
      user: { id: 'player-1', role: 'PLAYER', clubStatus: 'APPROVED' },
    });
    expect(cookieFrom(playerSignIn)).not.toBe('');
  });
});
