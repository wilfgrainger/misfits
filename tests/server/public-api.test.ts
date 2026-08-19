import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/index';
import type { Env } from '../../src/server/env';
import { createTestDb, insertUser } from '../helpers/d1';

function seedPublicLeague() {
  const { db, sqlite } = createTestDb();
  insertUser(sqlite, { id: 'alpha', googleSub: 'ga', email: 'alpha@private.test', username: 'Alpha' });
  insertUser(sqlite, { id: 'bravo', googleSub: 'gb', email: 'bravo@private.test', username: 'Bravo' });
  insertUser(sqlite, { id: 'retired', googleSub: 'gr', email: 'retired@private.test', username: 'Retired' });
  const join = sqlite.prepare('INSERT INTO league_players (league_id, user_id, active, joined_at) VALUES (?, ?, ?, ?)');
  join.run('misfits-501', 'alpha', 1, '2026-08-01T00:00:00.000Z');
  join.run('misfits-501', 'bravo', 1, '2026-08-01T00:00:00.000Z');
  join.run('misfits-501', 'retired', 0, '2026-08-01T00:00:00.000Z');
  const match = sqlite.prepare(`
    INSERT INTO matches (
      id, league_id, player_a_id, player_b_id, player_a_legs, player_b_legs,
      submitted_by, status, confirmed_by, created_at, updated_at, confirmed_at
    ) VALUES (?, 'misfits-501', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  match.run('confirmed-old', 'alpha', 'bravo', 3, 1, 'alpha', 'CONFIRMED', 'bravo', '2026-08-10T20:00:00.000Z', '2026-08-10T20:05:00.000Z', '2026-08-10T20:05:00.000Z');
  match.run('confirmed-new', 'bravo', 'alpha', 3, 2, 'bravo', 'CONFIRMED', 'alpha', '2026-08-12T20:00:00.000Z', '2026-08-12T20:05:00.000Z', '2026-08-12T20:05:00.000Z');
  match.run('pending', 'bravo', 'alpha', 3, 0, 'bravo', 'PENDING', null, '2026-08-13T20:00:00.000Z', '2026-08-13T20:00:00.000Z', null);
  match.run('disputed', 'alpha', 'bravo', 3, 0, 'alpha', 'DISPUTED', null, '2026-08-14T20:00:00.000Z', '2026-08-14T20:01:00.000Z', null);
  return { db, sqlite };
}

function env(db: D1Database): Env {
  return {
    DB: db,
    ASSETS: {} as Fetcher,
    GOOGLE_CLIENT_ID: 'x',
    GOOGLE_CLIENT_SECRET: 'x',
    APP_ORIGIN: 'https://misfits.test',
  };
}

describe('public league API', () => {
  it('returns standings calculated only from confirmed matches', async () => {
    const { db } = seedPublicLeague();
    const response = await createApp().request('/api/public/league', {}, env(db));
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.league).toMatchObject({ name: 'Misfits 501', seasonName: '2026', status: 'OPEN', targetLegs: 3 });
    expect(body.standings.map((row: any) => row.username)).toEqual(['Alpha', 'Bravo']);
    expect(body.standings[0]).toMatchObject({ username: 'Alpha', played: 2, won: 1, lost: 1, legDifference: 1, points: 2 });
    expect(JSON.stringify(body)).not.toContain('@private.test');
  });

  it('returns confirmed results only, newest first', async () => {
    const { db } = seedPublicLeague();
    const response = await createApp().request('/api/public/results?limit=50', {}, env(db));
    const body = await response.json() as any;
    expect(body.results.map((result: any) => result.id)).toEqual(['confirmed-new', 'confirmed-old']);
    expect(body.results.every((result: any) => result.status === 'CONFIRMED')).toBe(true);
    expect(JSON.stringify(body)).not.toContain('@private.test');
  });

  it('returns only active league players and never private identity fields', async () => {
    const { db } = seedPublicLeague();
    const response = await createApp().request('/api/public/players', {}, env(db));
    const body = await response.json() as any;
    expect(body.players.map((player: any) => player.username)).toEqual(['Alpha', 'Bravo']);
    expect(JSON.stringify(body)).not.toContain('retired@private.test');
    expect(JSON.stringify(body)).not.toContain('google_sub');
  });
});
