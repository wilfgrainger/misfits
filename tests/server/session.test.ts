import { describe, expect, it } from 'vitest';
import {
  hashSessionToken,
  issueSession,
  resolveSession,
  revokeSession,
} from '../../src/server/auth/session';

function fakeDatabase() {
  const sessions = new Map<string, Record<string, string>>();
  const users = new Map([
    ['user-1', { id: 'user-1', username: null, role: 'PLAYER', status: 'ACTIVE' }],
  ]);

  return {
    sessions,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              if (sql.startsWith('INSERT INTO sessions')) {
                sessions.set(String(values[0]), {
                  token_hash: String(values[0]),
                  user_id: String(values[1]),
                  created_at: String(values[2]),
                  expires_at: String(values[3]),
                });
              }
              if (sql.startsWith('DELETE FROM sessions')) sessions.delete(String(values[0]));
              return { success: true };
            },
            async first<T>() {
              if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
                const session = sessions.get(String(values[0]));
                const user = session && users.get(session.user_id);
                if (!session || !user || session.expires_at <= String(values[1])) return null as T;
                return { ...user, ...session } as T;
              }
              return null as T;
            },
          };
        },
      };
    },
  } as never;
}

describe('opaque sessions', () => {
  it('hashes deterministically without storing the raw token', async () => {
    const first = await hashSessionToken('token');
    expect(first).toBe(await hashSessionToken('token'));
    expect(first).not.toBe('token');
  });

  it('issues, resolves, expires, and revokes a session', async () => {
    const db = fakeDatabase();
    const now = new Date('2026-08-20T12:00:00.000Z');
    const issued = await issueSession(db, 'user-1', now);

    expect(issued.token).not.toBe(issued.tokenHash);
    expect(await resolveSession(db, issued.token, now)).toMatchObject({ id: 'user-1' });
    expect(await resolveSession(db, issued.token, new Date('2026-09-20T12:00:00.000Z'))).toBeNull();

    await revokeSession(db, issued.token);
    expect(await resolveSession(db, issued.token, now)).toBeNull();
  });
});
