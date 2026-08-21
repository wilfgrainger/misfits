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
  is_master_admin: number;
  created_at: string;
  last_login_at: string;
};
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class DirectoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql),
      }),
      all: async <T>() => this.all<T>(sql),
    };
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.startsWith('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    }
    return { success: true };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const account = session && this.users.get(session.user_id);
      if (!session || !account || session.expires_at <= String(values[1])) return null;
      return { ...account, ...session } as T;
    }
    return null;
  }

  private async all<T>(sql: string): Promise<{ results: T[] }> {
    if (sql.includes('FROM users')) return { results: [...this.users.values()].map((account) => ({ ...account, league_active: 0 })) as T[] };
    return { results: [] };
  }
}

describe('ADM-009 protected administrator directory contract', () => {
  it('tells the admin UI which account is the protected master administrator', async () => {
    const db = new DirectoryD1();
    db.users.set('master', {
      id: 'master', google_sub: 'google-master', email: 'master@example.com', username: 'Master', role: 'ADMIN', status: 'ACTIVE', is_master_admin: 1,
      created_at: '2026-08-01T00:00:00.000Z', last_login_at: '2026-08-20T00:00:00.000Z',
    });
    db.users.set('admin', {
      id: 'admin', google_sub: 'google-admin', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', is_master_admin: 0,
      created_at: '2026-08-02T00:00:00.000Z', last_login_at: '2026-08-20T00:00:00.000Z',
    });
    const session = await issueSession(db as never, 'admin', new Date('2026-08-21T12:00:00.000Z'));
    const routes = createAdminRoutes({ now: () => new Date('2026-08-21T12:00:00.000Z') });

    const response = await routes.fetch(new Request('https://misfits.test/api/admin/players', {
      headers: { Cookie: `misfits_session=${session.token}` },
    }), { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' }, {} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      players: expect.arrayContaining([
        expect.objectContaining({ id: 'master', role: 'ADMIN', isMasterAdmin: true }),
        expect.objectContaining({ id: 'admin', role: 'ADMIN', isMasterAdmin: false }),
      ]),
    });
  });
});
