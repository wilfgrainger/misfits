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
  is_master_admin: number;
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
  visibility: 'PUBLIC' | 'PRIVATE';
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
  inactiveMemberships = new Set<string>();
  delayMembershipInsert = false;
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
      const [id, name, slug, seasonName, status, pointsPerWin, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, 'OPEN' | 'CLOSED', number, number, string, string, string, number, number, 'PUBLIC' | 'PRIVATE'];
      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility: visibility ?? 'PUBLIC' });
    } else if (sql.includes('UPDATE leagues')) {
      const [name, slug, seasonName, status, pointsPerWin, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id] = values as [string, string, string, 'OPEN' | 'CLOSED', number, number, number, number, 'PUBLIC' | 'PRIVATE', string, string];
      const league = this.leagues.get(id)!;
      Object.assign(league, { name, slug, season_name: seasonName, status, points_per_win: pointsPerWin, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility: visibility ?? 'PUBLIC', updated_at: updatedAt });
    } else if (sql.includes('INSERT INTO league_invites')) {
      const [id, leagueId, tokenHash, createdBy, expiresAt, createdAt] = values as [string, string, string, string, string | null, string];
      this.invites.set(id, { id, league_id: leagueId, token_hash: tokenHash, created_by: createdBy, expires_at: expiresAt, uses: 0, revoked_at: null, created_at: createdAt });
    } else if (sql.includes('INSERT OR IGNORE INTO league_players') || sql.includes('INSERT INTO league_players')) {
      const leagueId = String(values[0]);
      const userId = String(values[1]);
      if (sql.includes('SELECT ?, ?, 1, ?')) {
        const maxPlayers = Number(values[4]);
        const activeCount = [...this.memberships].filter((key) => key.startsWith(`${String(values[3])}:`)).length;
        if (activeCount >= maxPlayers) return { success: true, meta: { changes: 0 } };
      }
      if (this.delayMembershipInsert) await new Promise((resolve) => setTimeout(resolve, 0));
      const key = `${leagueId}:${userId}`;
      if (this.memberships.has(key)) {
        if (sql.includes('INSERT OR IGNORE INTO league_players')) return { success: true, meta: { changes: 0 } };
        throw new Error('UNIQUE constraint failed: league_players.league_id, league_players.user_id');
      }
      this.memberships.add(key);
      this.inactiveMemberships.delete(key);
    } else if (sql.includes('UPDATE league_invites SET uses')) {
      this.invites.get(String(values[0]))!.uses += 1;
    } else if (sql.includes('UPDATE league_invites SET revoked_at')) {
      this.invites.get(String(values[1]))!.revoked_at = String(values[0]);
    } else if (sql.includes('UPDATE league_players SET active = 1')) {
      const [leagueId, userId, countLeagueId, maxPlayers] = values as [string, string, string, number];
      const activeCount = [...this.memberships].filter((key) => key.startsWith(`${countLeagueId}:`)).length;
      if (activeCount >= maxPlayers) return { success: true, meta: { changes: 0 } };
      this.memberships.add(`${leagueId}:${userId}`);
      this.inactiveMemberships.delete(`${leagueId}:${userId}`);
    } else if (sql.includes('UPDATE league_players SET active')) {
      const [active, leagueId, userId] = values as [number, string, string];
      const key = `${leagueId}:${userId}`;
      if (active === 1) {
        this.memberships.add(key);
        this.inactiveMemberships.delete(key);
      } else {
        this.memberships.delete(key);
        this.inactiveMemberships.add(key);
      }
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
      if (!this.memberships.has(key) && !this.inactiveMemberships.has(key)) return null;
      const [leagueId, userId] = key.split(':');
      const user = this.users.get(userId)!;
      return { league_id: leagueId, user_id: userId, active: this.memberships.has(key) ? 1 : 0, joined_at: now.toISOString(), username: user.username, profile_image_url: user.profile_image_url } as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) {
      return { count: [...this.memberships].filter((key) => key.startsWith(`${String(values[0])}:`)).length } as T;
    }
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues')) {
      const leagues = [...this.leagues.values()].filter((league) =>
        (!sql.includes("visibility = 'PUBLIC'") || league.visibility === 'PUBLIC') &&
        (!sql.includes('WHERE created_by = ?') || league.created_by === String(values[0]))
      );
      return { results: leagues as T[] };
    }
    if (sql.includes('FROM league_invites')) return { results: [...this.invites.values()] as T[] };
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
  db.users.set('admin-1', { id: 'admin-1', google_sub: 'g-admin', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', is_master_admin: 1, profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  db.users.set('player-1', { id: 'player-1', google_sub: 'g-player', email: 'player@example.com', username: 'Player', role: 'PLAYER', status: 'ACTIVE', is_master_admin: 0, profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  db.users.set('player-2', { id: 'player-2', google_sub: 'g-player-2', email: 'player2@example.com', username: 'Player Two', role: 'PLAYER', status: 'ACTIVE', is_master_admin: 0, profile_image_url: null, darts_counter_url: null, created_at: now.toISOString(), last_login_at: now.toISOString() });
  db.leagues.set('league-1', { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', season_name: '2026', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin-1', max_players: 2, matches_per_pair: 1, visibility: 'PUBLIC' });
  db.leagues.set('league-private', { id: 'league-private', name: 'Private Tuesday', slug: 'private-tuesday', season_name: '2026', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'player-2', max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE' });
  db.memberships.add('league-1:admin-1');
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, publicRoutes: createLeagueRoutes({ now: () => now }), adminRoutes: createAdminLeagueRoutes({ now: () => now }) };
}

async function cookieFor(db: MemoryD1, userId: string) {
  const session = await issueSession(db as never, userId, now);
  return `misfits_session=${session.token}`;
}

describe('league and invite routes', () => {
  it('allows any signed-in user to create a league and limits management to its owner', async () => {
    const { db, env, adminRoutes } = setup();
    const playerCookie = await cookieFor(db, 'player-1');
    const response = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tuesday 501', seasonName: '2026', maxPlayers: 8, visibility: 'PRIVATE' }),
    }), env, {} as never);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ league: { slug: 'tuesday-501', maxPlayers: 8, matchesPerPair: 1, visibility: 'PRIVATE', createdBy: 'player-1' } });

    const adminCookie = await cookieFor(db, 'admin-1');
    const forbidden = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-private', {
      method: 'PATCH', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Should not change' }),
    }), env, {} as never);
    expect(forbidden.status).toBe(403);

    const createdId = [...db.leagues.values()].find((league) => league.slug === 'tuesday-501')!.id;
    const edited = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/leagues/${createdId}`, {
      method: 'PATCH', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPlayers: 12, matchesPerPair: 2, targetLegs: 5, pointsPerWin: 3, status: 'CLOSED' }),
    }), env, {} as never);
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ league: { maxPlayers: 12, matchesPerPair: 2, targetLegs: 5, pointsPerWin: 3, status: 'CLOSED' } });

    const ownerLeagues = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', { headers: { Cookie: playerCookie } }), env, {} as never);
    expect(await ownerLeagues.json()).toMatchObject({ leagues: [{ id: createdId }] });

    const allLeagues = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues', { headers: { Cookie: adminCookie } }), env, {} as never);
    expect((await allLeagues.json() as { leagues: unknown[] }).leagues.length).toBe(3);

    const ownerInvite = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/leagues/${createdId}/invites`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    expect(ownerInvite.status).toBe(201);

    const otherOwnerInvite = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-private/invites', {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    expect(otherOwnerInvite.status).toBe(403);
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

    const deactivated = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/members/player-1', {
      method: 'PATCH', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false }),
    }), env, {} as never);
    expect(deactivated.status).toBe(200);
    expect(db.memberships.has('league-1:player-1')).toBe(false);

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
    const joinedAtCapacity = await publicRoutes.fetch(new Request(`https://misfits.test/api/invites/${secondToken}/join`, {
      method: 'POST', headers: { Cookie: playerTwoCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(joinedAtCapacity.status).toBe(200);

    const reactivatedAtCapacity = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/members/player-1', {
      method: 'PATCH', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }),
    }), env, {} as never);
    expect(reactivatedAtCapacity.status).toBe(409);
    expect(await reactivatedAtCapacity.json()).toMatchObject({ error: { code: 'LEAGUE_FULL' } });
    expect(db.memberships.has('league-1:player-1')).toBe(false);
  });

  it('treats concurrent joins by the same user as one idempotent membership', async () => {
    const { db, env, adminRoutes, publicRoutes } = setup();
    db.delayMembershipInsert = true;
    const adminCookie = await cookieFor(db, 'admin-1');
    const inviteResponse = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    const token = ((await inviteResponse.json()) as { invite: { url: string } }).invite.url.split('/').at(-1)!;
    const playerCookie = await cookieFor(db, 'player-1');
    const responses = await Promise.all([1, 2].map(() => publicRoutes.fetch(new Request(`https://misfits.test/api/invites/${token}/join`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test' },
    }), env, {} as never)));

    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    expect([...db.invites.values()][0].uses).toBe(1);
    expect(db.audits.filter((audit) => audit.action === 'LEAGUE_JOINED')).toHaveLength(1);
  });

  it('lists invite status and usage without exposing token hashes', async () => {
    const { db, env, adminRoutes } = setup();
    const adminCookie = await cookieFor(db, 'admin-1');
    const created = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    expect(created.status).toBe(201);
    const inviteId = [...db.invites.values()][0].id;

    const listed = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', {
      headers: { Cookie: adminCookie },
    }), env, {} as never);
    expect(listed.status).toBe(200);
    const body = await listed.json() as { invites: Array<Record<string, unknown>> };
    expect(body.invites).toMatchObject([{ id: inviteId, leagueId: 'league-1', uses: 0, revokedAt: null }]);
    expect(body.invites[0]).not.toHaveProperty('tokenHash');

    const revoked = await adminRoutes.fetch(new Request(`https://misfits.test/api/admin/invites/${inviteId}/revoke`, {
      method: 'POST', headers: { Cookie: adminCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(revoked.status).toBe(200);
    const afterRevoke = await adminRoutes.fetch(new Request('https://misfits.test/api/admin/leagues/league-1/invites', {
      headers: { Cookie: adminCookie },
    }), env, {} as never);
    expect(await afterRevoke.json()).toMatchObject({ invites: [{ id: inviteId, revokedAt: now.toISOString() }] });
  });

  it('lists public leagues without email addresses', async () => {
    const { env, publicRoutes } = setup();
    const response = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues'), env, {} as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { leagues: Array<Record<string, unknown>> };
    expect(body.leagues).toHaveLength(1);
    expect(body.leagues[0]).toMatchObject({ slug: 'misfits-501', maxPlayers: 2, visibility: 'PUBLIC' });
    expect(body.leagues[0]).not.toHaveProperty('email');
  });

  it('lists active public league players without private fields', async () => {
    const { env, publicRoutes } = setup();
    const response = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/league-1/players'), env, {} as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { players: Array<Record<string, unknown>> };
    expect(body.players).toEqual([{ id: 'admin-1', username: 'Admin', profileImageUrl: null }]);
    expect(body.players[0]).not.toHaveProperty('email');
  });

  it('keeps private league reads behind an owner or member session', async () => {
    const { db, env, publicRoutes } = setup();
    const anonymous = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/private-tuesday'), env, {} as never);
    expect(anonymous.status).toBe(404);

    const ownerCookie = await cookieFor(db, 'player-2');
    const owner = await publicRoutes.fetch(new Request('https://misfits.test/api/public/leagues/private-tuesday', { headers: { Cookie: ownerCookie } }), env, {} as never);
    expect(owner.status).toBe(200);
    expect(await owner.json()).toMatchObject({ league: { visibility: 'PRIVATE', slug: 'private-tuesday' } });
  });
});
