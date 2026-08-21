import { describe, expect, it } from 'vitest';
import { sessionCookie, resolveSession } from '../../src/server/auth/session';
import { updateAdminPlayer } from '../../src/server/db/admin';

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

class GovernanceD1 {
  users = new Map<string, User>();
  audit: Array<{ actor: string; target: string; before: string; after: string }> = [];
  membershipHistory = new Set<string>();
  resultHistory = new Set<string>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => this.first<T>(sql, values),
        run: async () => this.run(sql, values),
      }),
    };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      return {
        id: 'suspended-1', username: 'Suspended', role: 'PLAYER', status: 'SUSPENDED', is_master_admin: 0,
        token_hash: String(values[0]), user_id: 'suspended-1', created_at: '2026-08-01T00:00:00.000Z', expires_at: '2026-09-01T00:00:00.000Z',
      } as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes("role = 'ADMIN'") && sql.includes("status = 'ACTIVE'")) {
      return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN' && user.status === 'ACTIVE').length } as T;
    }
    if (sql.includes('FROM users WHERE id')) {
      return (this.users.get(String(values[0])) ?? null) as T | null;
    }
    return null;
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('UPDATE users SET role = ?, status = ?')) {
      const [role, status, id] = values as ['PLAYER' | 'ADMIN', 'ACTIVE' | 'SUSPENDED', string];
      const user = this.users.get(id)!;
      user.role = role;
      user.status = status;
    }
    if (sql.includes('INSERT INTO audit_log')) {
      const [actor, target, before, after] = values as string[];
      this.audit.push({ actor, target, before, after });
    }
    return { success: true };
  }
}

function user(id: string, role: User['role'], status: User['status'], master = 0): User {
  return {
    id, google_sub: `google-${id}`, email: `${id}@example.com`, username: id,
    role, status, is_master_admin: master,
    created_at: '2026-08-01T00:00:00.000Z', last_login_at: '2026-08-01T00:00:00.000Z',
  };
}

describe('ADM-002 secure persistent session', () => {
  it('uses an opaque secure cookie and refuses a suspended user even with an otherwise resolvable session', async () => {
    const cookie = sessionCookie('opaque-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Max-Age=\d+/);

    const db = new GovernanceD1();
    expect(await resolveSession(db as never, 'opaque-token', new Date('2026-08-20T12:00:00.000Z'))).toBeNull();
  });
});

describe('ADM-006 to ADM-008 account lifecycle', () => {
  it('demotes a non-protected administrator through the durable server model', async () => {
    const db = new GovernanceD1();
    db.users.set('actor', user('actor', 'ADMIN', 'ACTIVE', 1));
    db.users.set('target', user('target', 'ADMIN', 'ACTIVE'));

    const updated = await updateAdminPlayer(db as never, 'actor', 'target', { role: 'PLAYER' }, new Date('2026-08-21T12:00:00.000Z'));
    expect(updated).toMatchObject({ id: 'target', role: 'PLAYER', status: 'ACTIVE' });
    expect(db.audit).toHaveLength(1);
  });

  it('suspends and reactivates the same account without deleting competition history', async () => {
    const db = new GovernanceD1();
    db.users.set('actor', user('actor', 'ADMIN', 'ACTIVE', 1));
    db.users.set('target', user('target', 'PLAYER', 'ACTIVE'));
    db.membershipHistory.add('season-2026:league-1:target');
    db.resultHistory.add('result-1:target');

    const suspended = await updateAdminPlayer(db as never, 'actor', 'target', { status: 'SUSPENDED' }, new Date('2026-08-21T12:00:00.000Z'));
    expect(suspended).toMatchObject({ id: 'target', status: 'SUSPENDED' });
    expect(db.membershipHistory).toContain('season-2026:league-1:target');
    expect(db.resultHistory).toContain('result-1:target');

    const reactivated = await updateAdminPlayer(db as never, 'actor', 'target', { status: 'ACTIVE' }, new Date('2026-08-21T12:05:00.000Z'));
    expect(reactivated).toMatchObject({ id: 'target', status: 'ACTIVE' });
    expect(db.users.size).toBe(2);
    expect(db.membershipHistory).toContain('season-2026:league-1:target');
    expect(db.resultHistory).toContain('result-1:target');
  });
});
