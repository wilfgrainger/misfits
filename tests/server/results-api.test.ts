import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/index';
import type { Env } from '../../src/server/env';
import { issueSession } from '../../src/server/auth/session';
import { createTestDb, insertUser } from '../helpers/d1';

function testEnv(db: D1Database): Env {
  return {
    DB: db,
    ASSETS: {} as Fetcher,
    GOOGLE_CLIENT_ID: 'x',
    GOOGLE_CLIENT_SECRET: 'x',
    APP_ORIGIN: 'https://misfits.test',
  };
}

async function setup() {
  const { db, sqlite } = createTestDb();
  insertUser(sqlite, { id: 'alice', googleSub: 'ga', email: 'alice@example.test', username: 'Alice' });
  insertUser(sqlite, { id: 'bob', googleSub: 'gb', email: 'bob@example.test', username: 'Bob' });
  insertUser(sqlite, { id: 'cara', googleSub: 'gc', email: 'cara@example.test', username: 'Cara' });
  const join = sqlite.prepare('INSERT INTO league_players (league_id, user_id, active, joined_at) VALUES (?, ?, ?, ?)');
  for (const id of ['alice', 'bob', 'cara']) join.run('misfits-501', id, 1, '2026-08-19T12:00:00.000Z');
  const sessions = {
    alice: (await issueSession(db, 'alice')).token,
    bob: (await issueSession(db, 'bob')).token,
    cara: (await issueSession(db, 'cara')).token,
  };
  return { db, sqlite, sessions, app: createApp(), env: testEnv(db) };
}

function mutation(token: string, body?: unknown): RequestInit {
  return {
    method: 'POST',
    headers: {
      Cookie: `misfits_session=${token}`,
      Origin: 'https://misfits.test',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

describe('player result workflow', () => {
  it('submits a valid result involving the authenticated player as PENDING', async () => {
    const { app, env, sessions, sqlite } = await setup();
    const response = await app.request('/api/results', mutation(sessions.alice, {
      opponentId: 'bob', myLegs: 3, opponentLegs: 1,
    }), env);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ result: { status: 'PENDING', playerAId: 'alice', playerBId: 'bob' } });
    expect(sqlite.prepare('SELECT submitted_by, status FROM matches').get()).toMatchObject({ submitted_by: 'alice', status: 'PENDING' });
  });

  it('rejects invalid scores, inactive opponents, inactive membership, closed leagues and suspended users', async () => {
    const invalid = await setup();
    let response = await invalid.app.request('/api/results', mutation(invalid.sessions.alice, {
      opponentId: 'bob', myLegs: 2, opponentLegs: 1,
    }), invalid.env);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_RESULT' } });

    const inactiveOpponent = await setup();
    inactiveOpponent.sqlite.prepare("UPDATE league_players SET active=0 WHERE user_id='bob'").run();
    response = await inactiveOpponent.app.request('/api/results', mutation(inactiveOpponent.sessions.alice, {
      opponentId: 'bob', myLegs: 3, opponentLegs: 1,
    }), inactiveOpponent.env);
    expect(await response.json()).toMatchObject({ error: { code: 'OPPONENT_UNAVAILABLE' } });

    const inactiveActor = await setup();
    inactiveActor.sqlite.prepare("UPDATE league_players SET active=0 WHERE user_id='alice'").run();
    response = await inactiveActor.app.request('/api/results', mutation(inactiveActor.sessions.alice, {
      opponentId: 'bob', myLegs: 3, opponentLegs: 1,
    }), inactiveActor.env);
    expect(response.status).toBe(403);

    const closed = await setup();
    closed.sqlite.prepare("UPDATE leagues SET status='CLOSED'").run();
    response = await closed.app.request('/api/results', mutation(closed.sessions.alice, {
      opponentId: 'bob', myLegs: 3, opponentLegs: 1,
    }), closed.env);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'LEAGUE_CLOSED' } });

    const suspended = await setup();
    suspended.sqlite.prepare("UPDATE users SET status='SUSPENDED' WHERE id='alice'").run();
    response = await suspended.app.request('/api/results', mutation(suspended.sessions.alice, {
      opponentId: 'bob', myLegs: 3, opponentLegs: 1,
    }), suspended.env);
    expect(response.status).toBe(403);
  });

  it('does not count a pending result in public standings', async () => {
    const { app, env, sessions } = await setup();
    await app.request('/api/results', mutation(sessions.alice, { opponentId: 'bob', myLegs: 3, opponentLegs: 1 }), env);
    const league = await app.request('/api/public/league', {}, env);
    const body = await league.json() as any;
    expect(body.standings.find((row: any) => row.userId === 'alice')).toMatchObject({ played: 0, points: 0 });
  });

  it('allows only the opposing player to confirm and then updates standings', async () => {
    const { app, env, sessions } = await setup();
    const created = await app.request('/api/results', mutation(sessions.alice, { opponentId: 'bob', myLegs: 3, opponentLegs: 1 }), env);
    const id = ((await created.json()) as any).result.id as string;

    expect((await app.request(`/api/results/${id}/confirm`, mutation(sessions.alice), env)).status).toBe(403);
    expect((await app.request(`/api/results/${id}/confirm`, mutation(sessions.cara), env)).status).toBe(403);

    const confirmed = await app.request(`/api/results/${id}/confirm`, mutation(sessions.bob), env);
    expect(confirmed.status).toBe(200);
    expect(await confirmed.json()).toMatchObject({ result: { status: 'CONFIRMED' } });

    const league = await app.request('/api/public/league', {}, env);
    const body = await league.json() as any;
    expect(body.standings.find((row: any) => row.userId === 'alice')).toMatchObject({ played: 1, won: 1, points: 2 });
    expect((await app.request(`/api/results/${id}/confirm`, mutation(sessions.bob), env)).status).toBe(409);
  });

  it('allows the opponent to dispute and disputed results do not affect standings', async () => {
    const { app, env, sessions } = await setup();
    const created = await app.request('/api/results', mutation(sessions.alice, { opponentId: 'bob', myLegs: 3, opponentLegs: 2 }), env);
    const id = ((await created.json()) as any).result.id as string;
    const disputed = await app.request(`/api/results/${id}/dispute`, mutation(sessions.bob, { note: 'Score was 3-1' }), env);
    expect(disputed.status).toBe(200);
    expect(await disputed.json()).toMatchObject({ result: { status: 'DISPUTED', disputeNote: 'Score was 3-1' } });
    const league = await app.request('/api/public/league', {}, env);
    const body = await league.json() as any;
    expect(body.standings.find((row: any) => row.userId === 'alice')).toMatchObject({ played: 0, points: 0 });
  });

  it('lists only active opponents and the current player match history', async () => {
    const { app, env, sessions, sqlite } = await setup();
    sqlite.prepare("UPDATE league_players SET active=0 WHERE user_id='cara'").run();
    await app.request('/api/results', mutation(sessions.alice, { opponentId: 'bob', myLegs: 3, opponentLegs: 0 }), env);
    const headers = { Cookie: `misfits_session=${sessions.alice}` };
    const opponents = await app.request('/api/me/opponents', { headers }, env);
    expect(((await opponents.json()) as any).opponents.map((p: any) => p.username)).toEqual(['Bob']);
    const history = await app.request('/api/me/results', { headers }, env);
    expect(((await history.json()) as any).results).toHaveLength(1);
  });
});
