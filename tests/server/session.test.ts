import { describe, expect, it } from 'vitest';
import { hashSessionToken, issueSession, resolveSession, revokeSession, sessionCookie } from '../../src/server/auth/session';
import { createTestDb, insertUser } from '../helpers/d1';

describe('application sessions', () => {
  it('stores only a deterministic SHA-256 hash of the opaque token', async () => {
    const { db, sqlite } = createTestDb();
    insertUser(sqlite);
    const issued = await issueSession(db, 'user-1', new Date('2026-08-19T12:00:00.000Z'));
    const row = sqlite.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };

    expect(issued.token).not.toBe(row.token_hash);
    expect(row.token_hash).toBe(await hashSessionToken(issued.token));
    expect(await hashSessionToken('same-token')).toBe(await hashSessionToken('same-token'));
  });

  it('resolves an active session and rejects it after expiry', async () => {
    const { db, sqlite } = createTestDb();
    insertUser(sqlite, { username: 'Wilf' });
    const issued = await issueSession(db, 'user-1', new Date('2026-08-19T12:00:00.000Z'));

    await expect(resolveSession(db, issued.token, new Date('2026-08-20T12:00:00.000Z'))).resolves.toMatchObject({
      id: 'user-1', username: 'Wilf', role: 'PLAYER', status: 'ACTIVE',
    });
    await expect(resolveSession(db, issued.token, new Date('2026-09-19T12:00:01.000Z'))).resolves.toBeNull();
  });

  it('cannot resolve a revoked session', async () => {
    const { db, sqlite } = createTestDb();
    insertUser(sqlite);
    const issued = await issueSession(db, 'user-1', new Date('2026-08-19T12:00:00.000Z'));
    await revokeSession(db, issued.token);
    await expect(resolveSession(db, issued.token, new Date('2026-08-19T12:01:00.000Z'))).resolves.toBeNull();
  });

  it('uses secure browser cookie attributes', () => {
    const cookie = sessionCookie('abc', 2_592_000);
    expect(cookie).toContain('misfits_session=abc');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=2592000');
  });
});
