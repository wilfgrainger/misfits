import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createResultRoutes } from '../../src/server/routes/results';
import { createAdminLeagueRoutes } from '../../src/server/routes/admin-leagues';

type User = {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  is_master_admin: number;
  profile_image_url: string | null;
  darts_counter_url: string | null;
  created_at: string;
  last_login_at: string;
};
type League = { id: string; name: string; slug: string; season_name: string; status: 'OPEN' | 'CLOSED'; points_per_win: number; target_legs: number; max_players: number; matches_per_pair: number; created_at: string; updated_at: string; created_by: string; visibility?: 'PUBLIC' | 'PRIVATE' };
type Match = {
  id: string; league_id: string; player_a_id: string; player_b_id: string; player_a_legs: number; player_b_legs: number; player_a_average: number | null; player_b_average: number | null; submitted_by: string; status: 'PENDING' | 'CONFIRMED' | 'DISPUTED'; confirmed_by: string | null; dispute_note: string | null; created_at: string; updated_at: string; confirmed_at: string | null; deleted_at: string | null;
};
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  leagues = new Map<string, League>();
  memberships = new Set<string>();
  matches = new Map<string, Match>();
  sessions = new Map<string, Session>();
  audits: unknown[] = [];

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.includes('INSERT INTO matches')) {
      if (sql.includes("'CONFIRMED'")) {
        const [id, leagueId, playerAId, playerBId, playerALegs, playerBLegs, playerAAverage, playerBAverage, submittedBy, confirmedBy, createdAt, updatedAt, confirmedAt] = values as [string, string, string, string, number, number, number, number, string, string, string, string, string];
        this.matches.set(id, { id, league_id: leagueId, player_a_id: playerAId, player_b_id: playerBId, player_a_legs: playerALegs, player_b_legs: playerBLegs, player_a_average: playerAAverage, player_b_average: playerBAverage, submitted_by: submittedBy, status: 'CONFIRMED', confirmed_by: confirmedBy, dispute_note: null, created_at: createdAt, updated_at: updatedAt, confirmed_at: confirmedAt, deleted_at: null });
      } else {
        const [id, leagueId, playerAId, playerBId, playerALegs, playerBLegs, playerAAverage, playerBAverage, submittedBy, createdAt, updatedAt] = values as [string, string, string, string, number, number, number, number, string, string, string,];
        this.matches.set(id, { id, league_id: leagueId, player_a_id: playerAId, player_b_id: playerBId, player_a_legs: playerALegs, player_b_legs: playerBLegs, player_a_average: playerAAverage, player_b_average: playerBAverage, submitted_by: submittedBy, status: 'PENDING', confirmed_by: null, dispute_note: null, created_at: createdAt, updated_at: updatedAt, confirmed_at: null, deleted_at: null });
      }
    } else if (sql.includes("SET status = 'CONFIRMED'")) {
      const [confirmedBy, _confirmedAt, timestamp, id] = values as [string, string, string, string];
      Object.assign(this.matches.get(id)!, { status: 'CONFIRMED', confirmed_by: confirmedBy, updated_at: timestamp, confirmed_at: timestamp });
    } else if (sql.includes("SET status = 'DISPUTED'")) {
      const [note, timestamp, id] = values as [string, string, string];
      Object.assign(this.matches.get(id)!, { status: 'DISPUTED', dispute_note: note, updated_at: timestamp });
    } else if (sql.includes('SET player_a_id = ?')) {
      const [playerAId, playerBId, playerALegs, playerBLegs, playerAAverage, playerBAverage, status, note, updatedAt, _statusForConfirmed, confirmedBy, _statusForConfirmedAt, confirmedAt, id] = values as [string, string, number, number, number, number, Match['status'], string | null, string, string, string, string, string, string];
      const keepConfirmation = sql.includes('ELSE confirmed_by');
      Object.assign(this.matches.get(id)!, {
        player_a_id: playerAId,
        player_b_id: playerBId,
        player_a_legs: playerALegs,
        player_b_legs: playerBLegs,
        player_a_average: playerAAverage,
        player_b_average: playerBAverage,
        status,
        dispute_note: note,
        updated_at: updatedAt,
        confirmed_by: status === 'CONFIRMED' ? confirmedBy : (keepConfirmation ? this.matches.get(id)!.confirmed_by : null),
        confirmed_at: status === 'CONFIRMED' ? confirmedAt : (keepConfirmation ? this.matches.get(id)!.confirmed_at : null),
      });
    } else if (sql.includes('SET deleted_at = ?')) {
      const [deletedAt, updatedAt, id] = values as [string, string, string];
      Object.assign(this.matches.get(id)!, { deleted_at: deletedAt, updated_at: updatedAt });
    } else if (sql.includes('INSERT INTO audit_log')) {
      this.audits.push(values);
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM leagues')) return ([...this.leagues.values()].find((league) => league.id === String(values[0]) || league.slug === String(values[0])) ?? null) as T;
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const key = `${String(values[0])}:${String(values[1])}`;
      if (!this.memberships.has(key)) return null;
      const user = this.users.get(String(values[1]))!;
      return { league_id: values[0], user_id: values[1], active: 1, joined_at: now.toISOString(), username: user.username, profile_image_url: user.profile_image_url } as T;
    }
    if (sql.includes('SELECT 1 AS member')) return this.memberships.has(`${String(values[0])}:${String(values[1])}`) ? ({ member: 1 } as T) : null;
    if (sql.includes('COUNT(*)') && sql.includes('matches')) {
      return { count: [...this.matches.values()].filter((match) => match.league_id === String(values[0]) && match.player_a_id === String(values[1]) && match.player_b_id === String(values[2]) && !match.deleted_at && ['PENDING', 'CONFIRMED', 'DISPUTED'].includes(match.status)).length } as T;
    }
    if (sql.includes('FROM matches') && (sql.includes('WHERE id = ?') || sql.includes('WHERE matches.id = ?'))) return (this.matches.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const leagueId = String(values[0]);
      return { results: [...this.memberships].filter((key) => key.startsWith(`${leagueId}:`)).map((key) => {
        const userId = key.split(':')[1];
        const user = this.users.get(userId)!;
        return { league_id: leagueId, user_id: userId, active: 1, joined_at: '2026-08-20T12:00:00.000Z', username: user.username, profile_image_url: user.profile_image_url };
      }) as T[] };
    }
    if (sql.includes('FROM matches')) {
      const privateHistory = sql.includes('WHERE matches.player_a_id = ?');
      const leagueId = privateHistory ? null : String(values[0]);
      const playerId = privateHistory ? String(values[0]) : null;
      const includeDeleted = !sql.includes('matches.deleted_at IS NULL');
      return { results: [...this.matches.values()].filter((match) => (privateHistory ? (match.player_a_id === playerId || match.player_b_id === playerId || match.submitted_by === playerId) : match.league_id === leagueId) && (includeDeleted || !match.deleted_at) && (sql.includes("status = 'CONFIRMED'") ? match.status === 'CONFIRMED' : true)).map((match) => ({ ...match, player_a_username: this.users.get(match.player_a_id)?.username, player_b_username: this.users.get(match.player_b_id)?.username })) as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-20T12:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  db.users.set('admin-1', { id: 'admin-1', google_sub: 'g-admin-1', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', is_master_admin: 1, profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  for (const [id, username, role] of [['player-a', 'Alpha', 'PLAYER'], ['player-b', 'Bravo', 'PLAYER'], ['player-c', 'Charlie', 'PLAYER']] as const) {
    db.users.set(id, { id, google_sub: `g-${id}`, email: `${id}@example.com`, username, role, status: 'ACTIVE', is_master_admin: 0, profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
    db.memberships.add(`league-1:${id}`);
  }
  db.leagues.set('league-1', { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', season_name: '2026', status: 'OPEN', points_per_win: 2, target_legs: 3, max_players: 8, matches_per_pair: 1, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'player-a' });
  db.leagues.set('private-1', { id: 'private-1', name: 'Private Tuesday', slug: 'private-tuesday', season_name: '2026', status: 'OPEN', points_per_win: 2, target_legs: 3, max_players: 8, matches_per_pair: 1, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'player-a', visibility: 'PRIVATE' });
  db.memberships.add('private-1:player-a');
  db.memberships.add('league-1:admin-1');
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, routes: createResultRoutes({ now: () => now }), adminRoutes: createAdminLeagueRoutes({ now: () => now }) };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `misfits_session=${session.token}`;
}

function resultBody(playerAId: string, playerBId: string) {
  return JSON.stringify({ playerAId, playerBId, playerALegs: 3, playerBLegs: 1, playerAAverage: 51.236, playerBAverage: 47.1 });
}

describe('result routes', () => {
  it('hides private standings and results from anonymous requests but allows members', async () => {
    const { db, env, routes } = setup();
    const anonymousStandings = await routes.fetch(new Request('https://misfits.test/api/public/leagues/private-1/standings'), env, {} as never);
    expect(anonymousStandings.status).toBe(404);
    const anonymousResults = await routes.fetch(new Request('https://misfits.test/api/public/leagues/private-1/results'), env, {} as never);
    expect(anonymousResults.status).toBe(404);

    const member = await cookieFor(db, 'player-a');
    const memberStandings = await routes.fetch(new Request('https://misfits.test/api/public/leagues/private-1/standings', { headers: { Cookie: member } }), env, {} as never);
    expect(memberStandings.status).toBe(200);
    const memberResults = await routes.fetch(new Request('https://misfits.test/api/public/leagues/private-1/results', { headers: { Cookie: member } }), env, {} as never);
    expect(memberResults.status).toBe(200);
  });

  it('resolves public standings and results by league slug', async () => {
    const { env, routes } = setup();
    const standings = await routes.fetch(new Request('https://misfits.test/api/public/leagues/misfits-501/standings'), env, {} as never);
    const results = await routes.fetch(new Request('https://misfits.test/api/public/leagues/misfits-501/results'), env, {} as never);
    expect(standings.status).toBe(200);
    expect(results.status).toBe(200);
  });

  it('allows only a self-involved player to submit, and only the opponent to confirm', async () => {
    const { db, env, routes } = setup();
    const playerA = await cookieFor(db, 'player-a');
    const otherPlayer = await cookieFor(db, 'player-c');
    const notTheirResult = await routes.fetch(new Request('https://misfits.test/api/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: otherPlayer, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-b'),
    }), env, {} as never);
    expect(notTheirResult.status).toBe(403);

    const submitted = await routes.fetch(new Request('https://misfits.test/api/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: playerA, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-b'),
    }), env, {} as never);
    expect(submitted.status).toBe(201);
    expect(await submitted.json()).toMatchObject({ result: { status: 'PENDING', playerAAverage: 51.24, playerBAverage: 47.1 } });
    const resultId = [...db.matches.keys()][0];

    const selfConfirm = await routes.fetch(new Request(`https://misfits.test/api/results/${resultId}/confirm`, {
      method: 'POST', headers: { Cookie: playerA, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(selfConfirm.status).toBe(403);

    const playerB = await cookieFor(db, 'player-b');
    const confirmed = await routes.fetch(new Request(`https://misfits.test/api/results/${resultId}/confirm`, {
      method: 'POST', headers: { Cookie: playerB, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(confirmed.status).toBe(200);
    expect(await confirmed.json()).toMatchObject({ result: { status: 'CONFIRMED' } });
  });

  it('keeps disputes out of standings and enforces the configured pair limit', async () => {
    const { db, env, routes } = setup();
    const playerA = await cookieFor(db, 'player-a');
    const playerB = await cookieFor(db, 'player-b');
    const first = await routes.fetch(new Request('https://misfits.test/api/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: playerA, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-b'),
    }), env, {} as never);
    const firstId = [...db.matches.keys()][0];
    await routes.fetch(new Request(`https://misfits.test/api/results/${firstId}/confirm`, { method: 'POST', headers: { Cookie: playerB, Origin: 'https://misfits.test' } }), env, {} as never);
    expect(first.status).toBe(201);

    const duplicate = await routes.fetch(new Request('https://misfits.test/api/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: playerA, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-b', 'player-a'),
    }), env, {} as never);
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: 'PAIR_LIMIT_REACHED' } });

    const playerC = await cookieFor(db, 'player-c');
    const disputed = await routes.fetch(new Request('https://misfits.test/api/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: playerA, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-c'),
    }), env, {} as never);
    const disputedId = [...db.matches.keys()].find((id) => id !== firstId)!;
    const dispute = await routes.fetch(new Request(`https://misfits.test/api/results/${disputedId}/dispute`, {
      method: 'POST', headers: { Cookie: playerC, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'Score needs checking' }),
    }), env, {} as never);
    expect(disputed.status).toBe(201);
    expect(dispute.status).toBe(200);

    const standings = await routes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/standings'), env, {} as never);
    expect(standings.status).toBe(200);
    const body = await standings.json() as { standings: Array<{ playerId: string; played: number; points: number }> };
    expect(body.standings.find((row) => row.playerId === 'player-a')).toMatchObject({ played: 1, points: 2 });
    expect(body.standings.find((row) => row.playerId === 'player-c')).toMatchObject({ played: 0, points: 0 });
  });

  it('normalizes legacy confirmed results whose averages predate the averages columns', async () => {
    const { db, env, routes } = setup();
    db.matches.set('legacy-match', {
      id: 'legacy-match', league_id: 'league-1', player_a_id: 'player-a', player_b_id: 'player-b',
      player_a_legs: 3, player_b_legs: 1, player_a_average: null, player_b_average: null,
      submitted_by: 'player-a', status: 'CONFIRMED', confirmed_by: 'admin-1', dispute_note: null,
      created_at: now.toISOString(), updated_at: now.toISOString(), confirmed_at: now.toISOString(), deleted_at: null,
    });

    const publicResults = await routes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/results'), env, {} as never);
    expect(publicResults.status).toBe(200);
    expect(await publicResults.json()).toMatchObject({ results: [{ playerAAverage: 0, playerBAverage: 0 }] });

    const standings = await routes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/standings'), env, {} as never);
    expect(standings.status).toBe(200);
    const standingsBody = await standings.json() as { standings: Array<{ playerId: string; average: number }> };
    expect(standingsBody.standings.find((row) => row.playerId === 'player-a')).toMatchObject({ average: 0 });
  });

  it('lets an administrator enter, correct and delete a result with audit history', async () => {
    const { db, env, adminRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const created = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-c'),
    }), env, {} as never);
    expect(created.status).toBe(201);
    const resultId = [...db.matches.keys()][0];
    const corrected = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/results/${resultId}`, {
      method: 'PATCH', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...JSON.parse(resultBody('player-a', 'player-c')), playerBLegs: 2, status: 'CONFIRMED' }),
    }), env, {} as never);
    expect(corrected.status).toBe(200);
    expect(await corrected.json()).toMatchObject({ result: { playerBLegs: 2, status: 'CONFIRMED' } });
    const deleted = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/results/${resultId}`, {
      method: 'DELETE', headers: { Cookie: adminCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(deleted.status).toBe(200);
    expect(db.matches.get(resultId)?.deleted_at).toBe(now.toISOString());
    expect(db.audits.length).toBeGreaterThanOrEqual(3);
  });

  it('does not expose deleted results through the private player history', async () => {
    const { db, env, routes, adminRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const created = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-b'),
    }), env, {} as never);
    expect(created.status).toBe(201);
    const resultId = [...db.matches.keys()][0];
    const deleted = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/results/${resultId}`, {
      method: 'DELETE', headers: { Cookie: adminCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(deleted.status).toBe(200);

    const playerCookie = await cookieFor(db, 'player-a');
    const response = await routes.fetch(new Request('https://misfits.test/api/me/results', {
      headers: { Cookie: playerCookie },
    }), env, {} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
  });

  it('clears confirmation metadata when an administrator reopens a result', async () => {
    const { db, env, adminRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const created = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/results', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: resultBody('player-a', 'player-c'),
    }), env, {} as never);
    expect(created.status).toBe(201);
    const resultId = [...db.matches.keys()][0];
    const reopened = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/results/${resultId}`, {
      method: 'PATCH', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...JSON.parse(resultBody('player-a', 'player-c')), status: 'PENDING' }),
    }), env, {} as never);
    expect(reopened.status).toBe(200);
    expect(await reopened.json()).toMatchObject({ result: { status: 'PENDING', confirmedBy: null, confirmedAt: null } });
  });
});
