import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/server/index';
import type { Env } from '../../src/server/env';
import type { GoogleClient, GoogleIdentity } from '../../src/server/auth/google';
import { issueSession } from '../../src/server/auth/session';
import { createTestDb, insertUser } from '../helpers/d1';

function fakeGoogle(identity: GoogleIdentity) {
  return {
    buildAuthorizationUrl: vi.fn((state: string) => `https://accounts.google.test/auth?state=${state}`),
    exchangeCode: vi.fn(async () => identity),
  } satisfies GoogleClient;
}

function testEnv(db: D1Database, extra: Partial<Env> = {}): Env {
  return {
    DB: db,
    ASSETS: {} as Fetcher,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    APP_ORIGIN: 'https://misfits.test',
    ...extra,
  };
}

function sessionCookieFrom(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  const match = header.match(/misfits_session=([^;,]+)/);
  if (!match) throw new Error(`No session cookie in ${header}`);
  return `misfits_session=${match[1]}`;
}

describe('Google-only authentication', () => {
  it('creates OAuth state and redirects to Google', async () => {
    const { db } = createTestDb();
    const google = fakeGoogle({ sub: 'g1', email: 'player@example.test', emailVerified: true });
    const app = createApp({ googleClient: google, stateFactory: () => 'state-123' });
    const response = await app.request('/auth/google', {}, testEnv(db));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://accounts.google.test/auth?state=state-123');
    expect(response.headers.get('set-cookie')).toContain('misfits_oauth_state=state-123');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('rejects an OAuth callback with the wrong state before exchange', async () => {
    const { db } = createTestDb();
    const google = fakeGoogle({ sub: 'g1', email: 'player@example.test', emailVerified: true });
    const app = createApp({ googleClient: google });
    const response = await app.request('/auth/google/callback?code=abc&state=wrong', {
      headers: { Cookie: 'misfits_oauth_state=expected' },
    }, testEnv(db));

    expect(response.status).toBe(400);
    expect(google.exchangeCode).not.toHaveBeenCalled();
  });

  it('rejects an unverified Google email', async () => {
    const { db } = createTestDb();
    const google = fakeGoogle({ sub: 'g1', email: 'player@example.test', emailVerified: false });
    const app = createApp({ googleClient: google });
    const response = await app.request('/auth/google/callback?code=abc&state=state', {
      headers: { Cookie: 'misfits_oauth_state=state' },
    }, testEnv(db));

    expect(response.status).toBe(403);
  });

  it('creates a new PLAYER by Google sub, issues a session, and requires onboarding', async () => {
    const { db, sqlite } = createTestDb();
    const google = fakeGoogle({ sub: 'google-new', email: 'new@example.test', emailVerified: true });
    const app = createApp({ googleClient: google });
    const callback = await app.request('/auth/google/callback?code=abc&state=state', {
      headers: { Cookie: 'misfits_oauth_state=state' },
    }, testEnv(db));

    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toBe('/onboarding');
    expect(sqlite.prepare('SELECT google_sub, role, username FROM users').get()).toMatchObject({
      google_sub: 'google-new', role: 'PLAYER', username: null,
    });

    const me = await app.request('/api/me', {
      headers: { Cookie: sessionCookieFrom(callback) },
    }, testEnv(db));
    expect(await me.json()).toMatchObject({
      user: { email: 'new@example.test', role: 'PLAYER', username: null },
      requiresOnboarding: true,
    });
  });

  it('stores a normalized unique username and joins the league', async () => {
    const { db, sqlite } = createTestDb();
    insertUser(sqlite, { username: null });
    const issued = await issueSession(db, 'user-1', new Date('2026-08-19T12:00:00.000Z'));
    const app = createApp();
    const response = await app.request('/api/me/username', {
      method: 'POST',
      headers: {
        Cookie: `misfits_session=${issued.token}`,
        Origin: 'https://misfits.test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: '  Wilf   The Dart  ' }),
    }, testEnv(db));

    expect(response.status).toBe(200);
    expect(sqlite.prepare('SELECT username FROM users WHERE id = ?').get('user-1')).toMatchObject({ username: 'Wilf The Dart' });
    expect(sqlite.prepare('SELECT active FROM league_players WHERE user_id = ?').get('user-1')).toMatchObject({ active: 1 });
  });

  it('maps case-insensitive username collisions to USERNAME_UNAVAILABLE', async () => {
    const { db, sqlite } = createTestDb();
    insertUser(sqlite, { id: 'user-1', googleSub: 'g1', username: 'Wilf' });
    insertUser(sqlite, { id: 'user-2', googleSub: 'g2', email: 'two@example.test', username: null });
    const issued = await issueSession(db, 'user-2');
    const app = createApp();
    const response = await app.request('/api/me/username', {
      method: 'POST',
      headers: {
        Cookie: `misfits_session=${issued.token}`,
        Origin: 'https://misfits.test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'wilf' }),
    }, testEnv(db));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'USERNAME_UNAVAILABLE' } });
  });

  it('bootstraps only the first administrator', async () => {
    const { db, sqlite } = createTestDb();
    const firstGoogle = fakeGoogle({ sub: 'g-admin', email: 'ADMIN@example.test', emailVerified: true });
    const firstApp = createApp({ googleClient: firstGoogle });
    await firstApp.request('/auth/google/callback?code=abc&state=state', {
      headers: { Cookie: 'misfits_oauth_state=state' },
    }, testEnv(db, { BOOTSTRAP_ADMIN_EMAIL: 'admin@example.test' }));
    expect(sqlite.prepare("SELECT role FROM users WHERE google_sub='g-admin'").get()).toMatchObject({ role: 'ADMIN' });

    const secondGoogle = fakeGoogle({ sub: 'g-second', email: 'admin@example.test', emailVerified: true });
    const secondApp = createApp({ googleClient: secondGoogle });
    await secondApp.request('/auth/google/callback?code=def&state=state', {
      headers: { Cookie: 'misfits_oauth_state=state' },
    }, testEnv(db, { BOOTSTRAP_ADMIN_EMAIL: 'admin@example.test' }));
    expect(sqlite.prepare("SELECT role FROM users WHERE google_sub='g-second'").get()).toMatchObject({ role: 'PLAYER' });
  });

  it('revokes the session on logout', async () => {
    const { db, sqlite } = createTestDb();
    insertUser(sqlite);
    const issued = await issueSession(db, 'user-1');
    const app = createApp();
    const response = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `misfits_session=${issued.token}`, Origin: 'https://misfits.test' },
    }, testEnv(db));
    expect(response.status).toBe(204);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toMatchObject({ n: 0 });
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
