import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createLeagueRoutes } from '../../src/server/routes/leagues';
import { createAdminLeagueRoutes } from '../../src/server/routes/admin-leagues';

type User = {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  profile_image_url: string | null;
  darts_counter_url: string | null;
  created_at: string;
  last_login_at: string;
};
type League = {
  id: string;
  name: string;
  slug: string;
  season_name: string;
  status: 'OPEN' | 'CLOSED';
  points_per_win: number;
  target_legs: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  max_players: number;
  matches_per_pair: number;
};
type Invite = {
  id: string;
  league_id: string;
  token_hash: string;
  created_by: string;
  expires_at: string | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
};
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  leagues = new Map<string, League>();
  invites = new Map<string, Invite>();
  memberships = new Set<string>();
  sessions = new Map<string, Session>();
  audits: Array<{ action: string; entityId: string }> = [];

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
    } else if (sql.includes('INSERT INTO leagues')) {
      const [id, name, slug, seasonName, status, pointsPerWin, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair] = values as [string, string, string, string, 'OPEN' | 'CLOSED', number, number, string, string, string, number, number];
      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair });
    } else if (sql.includes('UPDATE leagues')) {
      const [name, slug, seasonName, status, pointsPerWin, targetLegs, maxPlayers, matchesPerPair, updatedAt, id] = values as [string, string, string, 'OPEN' | 'CLOSED', number, number, number, number, string, string];
      const league = this.leagues.get(id)!;
      Object.assign(league, { name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, updated_at: updatedAt });
    } else if (sql.includes('INSERT INTO league_invites')) {
      const [id, leagueId, tokenHash, createdBy, expiresAt, createdAt] = values as [string, string, string, string, string | null, string];
      this.invites.set(id, { id, league_id: leagueId, token_hash: tokenHash, created_by: createdBy, expires_at: expiresAt, uses: 0, revoked_at: null, created_at: createdAt });
    } else if (sql.includes('INSERT OR IGNORE INTO league_players') || sql.includes('INSERT INTO league_players')) {
      this.memberships.add(`${String(values[0])}:${String(values[1])}`);
    } else if (sql.includes('UPDATE league_invites SET uses')) {
      this.invites.get(String(values[0]))!.uses += 1;
    } else if (sql.includes('UPDATE league_invites SET revoked_at')) {
      this.invites.get(String(values[1]))!.revoked_at = String(values[0]);
    } else if (sql.includes('UPDATE league_players SET active')) {
      const [active, leagueId, userId] = values as [number, string, string];
      const key = `${leagueId}:${userId}`;
      if (active === 1) this.memberships.add(key);
      else this.memberships.delete(key);
    } else if (sql.includes('INSERT INTO audit_log')) {
      this.audits.push({ action: String(values[1]), entityId: String(values[3]) });
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
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ? OR slug = ?')) {
      return ([...this.leagues.values()].find((league) => league.id === String(values[0]) || league.slug === String(values[1])) ?? null) as T;
    }
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ?')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM league_invites')) return ([...this.invites.values()].find((invite) => invite.token_hash === String(values[0]) || invite.id === String(values[0])) ?? null) as T;
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const key = `${String(values[0])}:${String(values[1])}`;
      if (!this.memberships.has(key)) return null;
      const [leagueId, userId] = key.split(':');
      const user = this.users.get(userId)!;
      return { league_id: leagueId, user_id: userId, active: 1, joined_at: now.toISOString(), username: user.username, profile_image_url: user.profile_image_url } as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) {
      return { count: [...this.memberships].filter((key) => key.startsWith(`${String(values[0])}:`)).length } as T;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    return null;
  }

  private async all<T>(sql: string, _values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues')) return { results: [...this.leagues.values()] as T[] };
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      return {
        results: [...this.memberships].map((key) => {
          const [leagueId, userId] = key.split(':');
          const user = this.users.get(userId)!;
          return { league_id: leagueId, user_id: userId, active: 1, joined_at: '2026-08-20T12:00:00.000Z', username: user.username, profile_image_url: user.profile_image_url };
        }) as T[],
      };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-20T12:00:00.000Z');

function setup() {
  const db = new MemoryD1();
  db.users.set('admin-1', { id: 'admin-1', google_sub: 'g-admin', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  db.users.set('player-1', { id: 'player-1', google_sub: 'g-player', email: 'player@example.com', username: 'Player', role: 'PLAYER', status: 'ACTIVE', profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  db.users.set('player-2', { id: 'player-2', google_sub: 'g-player-2', email: 'player2@example.com', username: 'Player Two', role: 'PLAYER', status: 'ACTIVE', profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  db.leagues.set('league-1', { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', season_name: '2026', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin-1', max_players: 2, matches_per_pair: 1 });
  db.memberships.add('league-1:admin-1');
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, publicRoutes: createLeagueRoutes({ now: () => now }), adminRoutes: createAdminLeagueRoutes({ now: () => now }) };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `misfits_session=${session.token}`;
}

describe('league and invite routes', () => {
  it('allows an admin to create a league and rejects a player', async () => {
    const { db, env, adminRoutes } = setup();
    const playerCookie = await cookieFor(db, 'player-1');
    const forbidden = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tuesday 501', seasonName: '2026', maxPlayers: 8 }),
    }), env, {} as never);
    expect(forbidden.status).toBe(403);

    const adminCookie = await cookieFor(db, 'admin-1');
    const response = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tuesday 501', seasonName: '2026', maxPlayers: 8 }),
    }), env, {} as never);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ league: { slug: 'tuesday-501', maxPlayers: 8, matchesPerPair: 1 } });

    const createdId = [...db.leagues.values()].find((league) => league.slug === 'tuesday-501')!.id;
    const edited = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/leagues/${createdId}`, {
      method: 'PATCH', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPlayers: 12, matchesPerPair: 2, status: 'CLOSED' }),
    }), env, {} as never);
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ league: { maxPlayers: 12, matchesPerPair: 2, status: 'CLOSED' } });
  });

  it('creates a hashed invite, joins idempotently, enforces capacity and supports revocation', async () => {
    const { db, env, adminRoutes, publicRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const inviteResponse = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    expect(inviteResponse.status).toBe(201);
    const inviteUrl = (await inviteResponse.json() as { invite: { url: string } }).invite.url;
    const token = inviteUrl.split('/').at(-1)!;
    expect([...db.invites.values()][0].token_hash).not.toBe(token);

    const playerCookie = await cookieFor(db, 'player-1');
    const joined = await publicRoutes.fetch(new Request(`https://misfits.test/api/invites/${token}/join`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(joined.status).toBe(200);
    expect(db.memberships.has('league-1:player-1')).toBe(true);

    const joinedAgain = await publicRoutes.fetch(new Request(`https://misfits.test/api/invites/${token}/join`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(joinedAgain.status).toBe(200);

    const inviteId = [...db.invites.values()][0].id;
    const revoked = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/invites/${inviteId}/revoke`, {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(revoked.status).toBe(200);

    const revokedJoin = await publicRoutes.fetch(new Request(`https://misfits.test/api/invites/${token}/join`, {
      method: 'POST', headers: { Cookie: await cookieFor(db, 'player-2'), Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(revokedJoin.status).toBe(409);
    expect(await revokedJoin.json()).toMatchObject({ error: { code: 'INVITE_REVOKED' } });

    const secondInviteResponse = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    const secondToken = ((await secondInviteResponse.json()) as { invite: { url: string } }).invite.url.split('/').at(-1)!;
    const playerTwoCookie = await cookieFor(db, 'player-2');
    const full = await publicRoutes.fetch(new Request(`https://misfits.test/api/invites/${secondToken}/join`, {
      method: 'POST', headers: { Cookie: playerTwoCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ error: { code: 'LEAGUE_FULL' } });
  });

  it('lists public leagues without email addresses', async () => {
    const { env, publicRoutes } = setup();
    const response = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues'), env, {} as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { leagues: Array<Record<string, unknown>> };
    expect(body.leagues[0]).toMatchObject({ slug: 'misfits-501', maxPlayers: 2 });
    expect(body.leagues[0]).not.toHaveProperty('email');
  });
});
