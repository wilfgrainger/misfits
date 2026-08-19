import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/index';
import type { Env } from '../../src/server/env';
import { issueSession } from '../../src/server/auth/session';
import { createTestDb, insertUser } from '../helpers/d1';

async function setupAdmin() {
  const { db, sqlite } = createTestDb();
  insertUser(sqlite, { id: 'admin', googleSub: 'g-admin', email: 'boss@example.test', username: 'Boss', role: 'ADMIN' });
  insertUser(sqlite, { id: 'alice', googleSub: 'ga', email: 'alice@example.test', username: 'Alice' });
  insertUser(sqlite, { id: 'bob', googleSub: 'gb', email: 'bob@example.test', username: 'Bob' });
  const join = sqlite.prepare('INSERT INTO league_players (league_id, user_id, active, joined_at) VALUES (?, ?, 1, ?)');
  join.run('misfits-501', 'alice', '2026-08-19T12:00:00.000Z');
  join.run('misfits-501', 'bob', '2026-08-19T12:00:00.000Z');
  const adminToken = (await issueSession(db, 'admin')).token;
  const playerToken = (await issueSession(db, 'alice')).token;
  const env: Env = {
    DB: db,
    ASSETS: {} as Fetcher,
    GOOGLE_CLIENT_ID: 'x',
    GOOGLE_CLIENT_SECRET: 'x',
    APP_ORIGIN: 'https://misfits.test',
  };
  return { db, sqlite, adminToken, playerToken, env, app: createApp() };
}

function auth(token: string): HeadersInit {
  return { Cookie: `misfits_session=${token}` };
}

function mutation(token: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      Cookie: `misfits_session=${token}`,
      Origin: 'https://misfits.test',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

describe('admin API', () => {
  it('enforces authentication and ADMIN role server-side', async () => {
    const { app, env, playerToken, adminToken } = await setupAdmin();
    expect((await app.request('/api/admin/summary', {}, env)).status).toBe(401);
    expect((await app.request('/api/admin/summary', { headers: auth(playerToken) }, env)).status).toBe(403);
    expect((await app.request('/api/admin/summary', { headers: auth(adminToken) }, env)).status).toBe(200);
  });

  it('lists admin-only player details including email and membership state', async () => {
    const { app, env, adminToken } = await setupAdmin();
    const response = await app.request('/api/admin/players', { headers: auth(adminToken) }, env);
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.players.find((player: any) => player.id === 'alice')).toMatchObject({
      email: 'alice@example.test', role: 'PLAYER', status: 'ACTIVE', leagueActive: true,
    });
  });

  it('audits a player mutation with before and after state', async () => {
    const { app, env, adminToken, sqlite } = await setupAdmin();
    const response = await app.request('/api/admin/players/alice', mutation(adminToken, 'PATCH', {
      status: 'SUSPENDED', leagueActive: false,
    }), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ player: { status: 'SUSPENDED', leagueActive: false } });
    const audit = sqlite.prepare('SELECT actor_user_id, action, entity_id, before_json, after_json FROM audit_log').get() as any;
    expect(audit).toMatchObject({ actor_user_id: 'admin', action: 'player.updated', entity_id: 'alice' });
    expect(JSON.parse(audit.before_json)).toMatchObject({ status: 'ACTIVE', leagueActive: true });
    expect(JSON.parse(audit.after_json)).toMatchObject({ status: 'SUSPENDED', leagueActive: false });
  });

  it('prevents demoting or suspending the final active administrator', async () => {
    const { app, env, adminToken } = await setupAdmin();
    let response = await app.request('/api/admin/players/admin', mutation(adminToken, 'PATCH', { role: 'PLAYER' }), env);
    expect(response.status).toBe(409);
    response = await app.request('/api/admin/players/admin', mutation(adminToken, 'PATCH', { status: 'SUSPENDED' }), env);
    expect(response.status).toBe(409);
  });

  it('applies username rules to admin renames', async () => {
    const { app, env, adminToken } = await setupAdmin();
    let response = await app.request('/api/admin/players/alice', mutation(adminToken, 'PATCH', { username: 'admin' }), env);
    expect(response.status).toBe(400);
    response = await app.request('/api/admin/players/bob', mutation(adminToken, 'PATCH', { username: 'alice' }), env);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'USERNAME_UNAVAILABLE' } });
  });

  it('creates only valid manual confirmed results and audits them', async () => {
    const { app, env, adminToken, sqlite } = await setupAdmin();
    let response = await app.request('/api/admin/results', mutation(adminToken, 'POST', {
      playerAId: 'alice', playerBId: 'bob', playerALegs: 2, playerBLegs: 1,
    }), env);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_RESULT' } });

    response = await app.request('/api/admin/results', mutation(adminToken, 'POST', {
      playerAId: 'alice', playerBId: 'bob', playerALegs: 3, playerBLegs: 1,
    }), env);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ result: { status: 'CONFIRMED', playerALegs: 3, playerBLegs: 1 } });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='result.created'").get()).toMatchObject({ n: 1 });
  });

  it('corrects a confirmed result and public standings recalculate from source data', async () => {
    const { app, env, adminToken } = await setupAdmin();
    const created = await app.request('/api/admin/results', mutation(adminToken, 'POST', {
      playerAId: 'alice', playerBId: 'bob', playerALegs: 3, playerBLegs: 0,
    }), env);
    const id = ((await created.json()) as any).result.id;
    const corrected = await app.request(`/api/admin/results/${id}`, mutation(adminToken, 'PATCH', {
      playerALegs: 1, playerBLegs: 3, status: 'CONFIRMED',
    }), env);
    expect(corrected.status).toBe(200);

    const league = await app.request('/api/public/league', {}, env);
    const standings = ((await league.json()) as any).standings;
    expect(standings.find((row: any) => row.userId === 'bob')).toMatchObject({ won: 1, points: 2, legDifference: 2 });
  });

  it('deleting a confirmed result removes it from standings and appends an audit record', async () => {
    const { app, env, adminToken, sqlite } = await setupAdmin();
    const created = await app.request('/api/admin/results', mutation(adminToken, 'POST', {
      playerAId: 'alice', playerBId: 'bob', playerALegs: 3, playerBLegs: 2,
    }), env);
    const id = ((await created.json()) as any).result.id;
    const deleted = await app.request(`/api/admin/results/${id}`, mutation(adminToken, 'DELETE'), env);
    expect(deleted.status).toBe(204);
    const league = await app.request('/api/public/league', {}, env);
    const standings = ((await league.json()) as any).standings;
    expect(standings.find((row: any) => row.userId === 'alice')).toMatchObject({ played: 0, points: 0 });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='result.deleted'").get()).toMatchObject({ n: 1 });
  });

  it('updates league settings with validation and audit history is newest first', async () => {
    const { app, env, adminToken } = await setupAdmin();
    let response = await app.request('/api/admin/league', mutation(adminToken, 'PATCH', {
      seasonName: '2026 Autumn', status: 'CLOSED', pointsPerWin: 3, targetLegs: 5,
    }), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ league: { season_name: '2026 Autumn', status: 'CLOSED', points_per_win: 3, target_legs: 5 } });

    response = await app.request('/api/admin/audit?limit=100', { headers: auth(adminToken) }, env);
    const body = await response.json() as any;
    expect(body.audit[0]).toMatchObject({ action: 'league.updated', actorUserId: 'admin' });
  });
});
