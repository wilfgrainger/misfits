import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { GoogleIdentity } from '../../src/server/auth/google';
import type { AuthAppEnv } from '../../src/server/auth/guards';
import { createAuthRoutes } from '../../src/server/routes/auth';
import { createProfileRoutes } from '../../src/server/routes/profile';
import { createLeagueRoutes } from '../../src/server/routes/leagues';
import { createAdminLeagueRoutes } from '../../src/server/routes/admin-leagues';
import { createResultRoutes } from '../../src/server/routes/results';

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
  max_legs: number;
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  target_legs: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  max_players: number;
  matches_per_pair: number;
  visibility: 'PUBLIC' | 'PRIVATE';
};

type Membership = { league_id: string; user_id: string; active: number; joined_at: string };
type Invite = { id: string; league_id: string; token_hash: string; created_by: string; expires_at: string | null; uses: number; revoked_at: string | null; created_at: string };
type Match = { id: string; league_id: string; player_a_id: string; player_b_id: string; player_a_legs: number; player_b_legs: number; player_a_average: number; player_b_average: number; submitted_by: string; status: 'PENDING' | 'CONFIRMED' | 'DISPUTED'; confirmed_by: string | null; dispute_note: string | null; created_at: string; updated_at: string; confirmed_at: string | null; deleted_at: string | null };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };

class FlowD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  leagues = new Map<string, League>();
  memberships = new Map<string, Membership>();
  invites = new Map<string, Invite>();
  matches = new Map<string, Match>();
  audits: string[] = [];

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
    if (sql.startsWith('INSERT INTO users')) {
      const [id, googleSub, email, createdAt, lastLoginAt] = values as string[];
      this.users.set(id, { id, google_sub: googleSub, email, username: null, role: 'PLAYER', status: 'ACTIVE', is_master_admin: 0, profile_image_url: null, darts_counter_url: null, created_at: createdAt, last_login_at: lastLoginAt });
    } else if (sql.startsWith('UPDATE users SET email')) {
      const [email, lastLoginAt, id] = values as string[];
      const user = this.users.get(id)!;
      user.email = email;
      user.last_login_at = lastLoginAt;
    } else if (sql.startsWith('UPDATE users SET profile_image_url')) {
      this.users.get(String(values[1]))!.profile_image_url = String(values[0]);
    } else if (sql.includes("UPDATE users SET role = 'ADMIN', is_master_admin = 1")) {
      const user = this.users.get(String(values[0]))!;
      user.role = 'ADMIN';
      user.is_master_admin = 1;
    } else if (sql.startsWith('UPDATE users SET username = ?, darts_counter_url')) {
      const [username, dartsCounterUrl, id] = values as [string, string | null, string];
      const user = this.users.get(id)!;
      user.username = username;
      user.darts_counter_url = dartsCounterUrl;
    } else if (sql.startsWith('UPDATE users SET username')) {
      const [username, lastLoginAt, id] = values as string[];
      const user = this.users.get(id)!;
      user.username = username;
      user.last_login_at = lastLoginAt;
    } else if (sql.startsWith('INSERT INTO sessions')) {
      const [tokenHash, userId, createdAt, expiresAt] = values as string[];
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, created_at: createdAt, expires_at: expiresAt });
    } else if (sql.startsWith('DELETE FROM sessions')) {
      this.sessions.delete(String(values[0]));
    } else if (sql.startsWith('INSERT INTO leagues')) {
      const [id, name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, matchesPerPair, visibility] = values as [string, string, string, string, League['status'], number, number, number, number, number, string, string, string, number, number, League['visibility']];
      this.leagues.set(id, { id, name, slug, season_name: seasonName, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility });
    } else if (sql.startsWith('UPDATE leagues')) {
      const [name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt, id] = values as [string, string, string, League['status'], number, number, number, number, number, number, number, League['visibility'], string, string];
      const league = this.leagues.get(id)!;
      const activeCount = [...this.memberships.values()].filter((member) => member.league_id === id && member.active === 1).length;
      if (activeCount > maxPlayers) return { success: true, meta: { changes: 0 } };
      Object.assign(league, { name, slug, season_name: seasonName, status, max_legs: maxLegs, points_per_win: win, points_per_draw: draw, points_per_loss: loss, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility, updated_at: updatedAt });
    } else if (sql.startsWith('INSERT OR IGNORE INTO league_players')) {
      const leagueId = String(values[0]);
      const userId = String(values[1]);
      const joinedAt = String(values[2]);
      if (sql.includes('SELECT ?, ?, 1, ?')) {
        const maxPlayers = Number(values[4]);
        const activeCount = [...this.memberships.values()].filter((member) => member.league_id === String(values[3]) && member.active === 1).length;
        if (activeCount >= maxPlayers) return { success: true, meta: { changes: 0 } };
      }
      const key = `${leagueId}:${userId}`;
      if (!this.memberships.has(key)) this.memberships.set(key, { league_id: leagueId, user_id: userId, active: 1, joined_at: joinedAt });
      return { success: true, meta: { changes: 1 } };
    } else if (sql.startsWith('INSERT INTO league_invites')) {
      const [id, leagueId, tokenHash, createdBy, expiresAt, createdAt] = values as [string, string, string, string, string | null, string];
      this.invites.set(id, { id, league_id: leagueId, token_hash: tokenHash, created_by: createdBy, expires_at: expiresAt, uses: 0, revoked_at: null, created_at: createdAt });
    } else if (sql.startsWith('UPDATE league_invites SET uses')) {
      this.invites.get(String(values[0]))!.uses += 1;
    } else if (sql.startsWith('UPDATE league_invites SET revoked_at')) {
      this.invites.get(String(values[1]))!.revoked_at = String(values[0]);
    } else if (sql.startsWith('UPDATE league_players SET active = 1')) {
      const [leagueId, userId] = values as [string, string];
      this.memberships.get(`${leagueId}:${userId}`)!.active = 1;
    } else if (sql.startsWith('UPDATE league_players SET active')) {
      const [active, leagueId, userId] = values as [number, string, string];
      this.memberships.get(`${leagueId}:${userId}`)!.active = active;
    } else if (sql.startsWith('INSERT INTO matches')) {
      const [id, leagueId, playerAId, playerBId, playerALegs, playerBLegs, playerAAverage, playerBAverage, submittedBy] = values as [string, string, string, string, number, number, number, number, string];
      const league = this.leagues.get(leagueId)!;
      const pairCount = [...this.matches.values()].filter((match) => match.league_id === leagueId && !match.deleted_at && ['PENDING', 'CONFIRMED', 'DISPUTED'].includes(match.status) && ((match.player_a_id === playerAId && match.player_b_id === playerBId) || (match.player_a_id === playerBId && match.player_b_id === playerAId))).length;
      if (pairCount >= league.matches_per_pair) return { success: true, meta: { changes: 0 } };
      const timestamp = String(values[9]);
      this.matches.set(id, { id, league_id: leagueId, player_a_id: playerAId, player_b_id: playerBId, player_a_legs: playerALegs, player_b_legs: playerBLegs, player_a_average: playerAAverage, player_b_average: playerBAverage, submitted_by: submittedBy, status: sql.includes('status, confirmed_by') ? 'CONFIRMED' : 'PENDING', confirmed_by: null, dispute_note: null, created_at: timestamp, updated_at: timestamp, confirmed_at: null, deleted_at: null });
    } else if (sql.startsWith("UPDATE matches SET status = 'CONFIRMED'")) {
      const result = this.matches.get(String(values[3]))!;
      result.status = 'CONFIRMED';
      result.confirmed_by = String(values[0]);
      result.confirmed_at = String(values[1]);
      result.updated_at = String(values[2]);
    } else if (sql.startsWith('INSERT INTO audit_log')) {
      const action = sql.match(/VALUES \(\?, '([^']+)'/)?.[1];
      if (action) this.audits.push(action);
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('COUNT(*) AS count') && sql.includes("role = 'ADMIN'")) return { count: [...this.users.values()].filter((user) => user.role === 'ADMIN').length } as T;
    if (sql.includes('FROM sessions') && sql.includes('JOIN users')) {
      const session = this.sessions.get(String(values[0]));
      const user = session && this.users.get(session.user_id);
      if (!session || !user || session.expires_at <= String(values[1])) return null;
      return { ...user, ...session } as T;
    }
    if (sql.includes('FROM users WHERE google_sub')) return ([...this.users.values()].find((user) => user.google_sub === String(values[0])) ?? null) as T;
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ? OR slug = ?')) return ([...this.leagues.values()].find((league) => league.id === String(values[0]) || league.slug === String(values[1])) ?? null) as T;
    if (sql.includes('FROM leagues') && sql.includes('WHERE id = ?')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const member = this.memberships.get(`${String(values[0])}:${String(values[1])}`);
      if (!member) return null;
      const user = this.users.get(member.user_id)!;
      return { ...member, username: user.username, profile_image_url: user.profile_image_url } as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) return { count: [...this.memberships.values()].filter((member) => member.league_id === String(values[0]) && member.active === 1).length } as T;
    if (sql.includes('FROM league_invites')) return ([...this.invites.values()].find((invite) => invite.id === String(values[0]) || invite.token_hash === String(values[0])) ?? null) as T;
    if (sql.includes('FROM matches') && sql.includes('JOIN users')) {
      const match = this.matches.get(String(values[0]));
      if (!match) return null;
      return { ...match, player_a_username: this.users.get(match.player_a_id)?.username, player_b_username: this.users.get(match.player_b_id)?.username } as T;
    }
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues')) {
      const userId = String(values[0]);
      const leagues = [...this.leagues.values()].filter((league) => {
        if (sql.includes('WHERE created_by = ?')) return league.created_by === userId;
        if (sql.includes('LEFT JOIN league_players')) return league.created_by === userId || this.memberships.get(`${league.id}:${userId}`)?.active === 1;
        return true;
      });
      return { results: leagues as T[] };
    }
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      return { results: [...this.memberships.values()].map((member) => ({ ...member, username: this.users.get(member.user_id)?.username, profile_image_url: this.users.get(member.user_id)?.profile_image_url })) as T[] };
    }
    if (sql.includes('FROM league_invites')) return { results: [...this.invites.values()] as T[] };
    if (sql.includes('FROM matches')) {
      const leagueId = String(values[0]);
      const results = [...this.matches.values()].filter((match) => match.league_id === leagueId && !match.deleted_at && (!sql.includes("status = 'CONFIRMED'") || match.status === 'CONFIRMED')).map((match) => ({ ...match, player_a_username: this.users.get(match.player_a_id)?.username, player_b_username: this.users.get(match.player_b_id)?.username }));
      return { results: results as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-20T12:00:00.000Z');

function cookieFrom(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').match(/league_board_session=([^;]+)/)?.[1] ?? '';
}

describe('authenticated league lifecycle', () => {
  it('runs Google sign-in through onboarding, ownership, invite join and result confirmation', async () => {
    const db = new FlowD1();
    const identities = new Map<string, GoogleIdentity>([
      ['owner-token-credential-123456789', { sub: 'google-owner', email: 'master@example.com', emailVerified: true, picture: 'https://lh3.googleusercontent.com/owner' }],
      ['player-token-credential-123456789', { sub: 'google-player', email: 'player@example.com', emailVerified: true, picture: 'https://lh3.googleusercontent.com/player' }],
    ]);
    const env = { DB: db as never, ASSETS: {} as never, GOOGLE_CLIENT_ID: 'client-id', APP_ORIGIN: 'https://misfits.test', MASTER_ADMIN_EMAIL: 'master@example.com' };
    const app = new Hono<AuthAppEnv>();
    app.route('/', createAuthRoutes({ verifyCredential: async (credential) => identities.get(credential)!, now: () => now }));
    app.route('/', createProfileRoutes());
    app.route('/', createLeagueRoutes({ now: () => now }));
    app.route('/', createAdminLeagueRoutes({ now: () => now }));
    app.route('/', createResultRoutes({ now: () => now }));

    const signIn = async (credential: string) => app.fetch(new Request('https://misfits.test/api/auth/google', {
      method: 'POST', headers: { Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
    }), env, {} as never);
    const ownerSignIn = await signIn('owner-token-credential-123456789');
    expect(ownerSignIn.status).toBe(200);
    expect((await ownerSignIn.json()) as { requiresOnboarding: boolean }).toMatchObject({ requiresOnboarding: true });
    const ownerCookie = `league_board_session=${cookieFrom(ownerSignIn)}`;

    const unnamedOwnerCreate = await app.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Blocked 501', seasonName: '2026' }),
    }), env, {} as never);
    expect(unnamedOwnerCreate.status).toBe(400);
    expect(await unnamedOwnerCreate.json()).toMatchObject({ error: { code: 'PROFILE_INVALID' } });

    const ownerOnboarding = await app.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'Owner' }),
    }), env, {} as never);
    expect(ownerOnboarding.status).toBe(200);

    const profile = await app.fetch(new Request('https://misfits.test/api/me/profile', {
      method: 'PATCH', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'Owner', dartsCounterUrl: 'https://dartcounter.net/owner' }),
    }), env, {} as never);
    expect(profile.status).toBe(200);
    expect(await profile.json()).toMatchObject({ profile: { username: 'Owner', profileImageUrl: 'https://lh3.googleusercontent.com/owner', dartsCounterUrl: 'https://dartcounter.net/owner' } });

    const create = await app.fetch(new Request('https://misfits.test/api/admin/leagues', {
      method: 'POST', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Tuesday 501', seasonName: '2026', maxPlayers: 4, matchesPerPair: 1, targetLegs: 3, pointsPerWin: 2, visibility: 'PRIVATE' }),
    }), env, {} as never);
    expect(create.status).toBe(201);
    const created = await create.json() as { league: { id: string; slug: string; createdBy: string; visibility: string } };
    expect(created.league).toMatchObject({ slug: 'tuesday-501', createdBy: [...db.users.values()][0].id, visibility: 'PRIVATE' });

    const edit = await app.fetch(new Request(`https://misfits.test/api/admin/leagues/${created.league.id}`, {
      method: 'PATCH', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Tuesday 501 Updated' }),
    }), env, {} as never);
    expect(edit.status).toBe(200);

    const inviteResponse = await app.fetch(new Request(`https://misfits.test/api/admin/leagues/${created.league.id}/invites`, {
      method: 'POST', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: '{}',
    }), env, {} as never);
    expect(inviteResponse.status).toBe(201);
    const inviteUrl = ((await inviteResponse.json()) as { invite: { url: string } }).invite.url;
    const inviteToken = inviteUrl.split('/').at(-1)!;

    const playerSignIn = await signIn('player-token-credential-123456789');
    const playerCookie = `league_board_session=${cookieFrom(playerSignIn)}`;
    const unnamedPlayerResult = await app.fetch(new Request(`https://misfits.test/api/leagues/${created.league.id}/results`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ playerAId: [...db.users.values()][0].id, playerBId: [...db.users.values()][1].id, playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5 }),
    }), env, {} as never);
    expect(unnamedPlayerResult.status).toBe(400);
    expect(await unnamedPlayerResult.json()).toMatchObject({ error: { code: 'PROFILE_INVALID' } });

    const playerOnboarding = await app.fetch(new Request('https://misfits.test/api/me/username', {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'Player' }),
    }), env, {} as never);
    expect(playerOnboarding.status).toBe(200);

    const joined = await app.fetch(new Request(`https://misfits.test/api/invites/${inviteToken}/join`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(joined.status).toBe(200);

    const playerCannotEdit = await app.fetch(new Request(`https://misfits.test/api/admin/leagues/${created.league.id}`, {
      method: 'PATCH', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Not owner' }),
    }), env, {} as never);
    expect(playerCannotEdit.status).toBe(403);

    const playerCannotEnterAdminResult = await app.fetch(new Request(`https://misfits.test/api/admin/leagues/${created.league.id}/results`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ playerAId: [...db.users.values()][0].id, playerBId: [...db.users.values()][1].id, playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5 }),
    }), env, {} as never);
    expect(playerCannotEnterAdminResult.status).toBe(403);

    const submitted = await app.fetch(new Request(`https://misfits.test/api/leagues/${created.league.id}/results`, {
      method: 'POST', headers: { Cookie: ownerCookie, Origin: 'https://misfits.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ playerAId: [...db.users.values()][0].id, playerBId: [...db.users.values()][1].id, playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5 }),
    }), env, {} as never);
    expect(submitted.status).toBe(201);
    const resultId = ((await submitted.json()) as { result: { id: string; status: string } }).result.id;

    const confirmed = await app.fetch(new Request(`https://misfits.test/api/results/${resultId}/confirm`, {
      method: 'POST', headers: { Cookie: playerCookie, Origin: 'https://misfits.test' },
    }), env, {} as never);
    expect(confirmed.status).toBe(200);
    const confirmedBody = await confirmed.json() as { result: { status: string; playerAAverage: number; playerBAverage: number } };
    expect(confirmedBody.result.status).toBe('CONFIRMED');
    expect([confirmedBody.result.playerAAverage, confirmedBody.result.playerBAverage].sort()).toEqual([55.5, 61.2]);

    const standings = await app.fetch(new Request(`https://misfits.test/api/public/leagues/${created.league.id}/standings`, { headers: { Cookie: playerCookie } }), env, {} as never);
    expect(standings.status).toBe(200);
    expect(await standings.json()).toMatchObject({ standings: expect.arrayContaining([expect.objectContaining({ username: 'Owner', played: 1, won: 1, average: 61.2 }), expect.objectContaining({ username: 'Player', played: 1, lost: 1, average: 55.5 })]) });
  });
});
