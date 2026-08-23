import { describe, expect, it } from 'vitest';
import { issueSession } from '../../src/server/auth/session';
import { createCompetitionRoutes } from '../../src/server/routes/competition';

type User = { id: string; username: string; role: 'PLAYER' | 'ADMIN'; status: 'ACTIVE'; club_status: 'APPROVED'; is_master_admin: number };
type Session = { token_hash: string; user_id: string; created_at: string; expires_at: string };
type Season = { id: string; name: string; status: 'DRAFT' | 'OPEN' | 'CLOSED'; is_current: number; created_at: string; updated_at: string; closed_at: string | null };
type League = { id: string; season_id: string; name: string; slug: string; season_name: string; status: 'OPEN' | 'CLOSED'; points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string; max_players: number; matches_per_pair: number; visibility: 'PRIVATE'; hierarchy_position: number; promotion_places: number; relegation_places: number };
type Membership = { league_id: string; season_id: string; user_id: string; active: number; joined_at: string };
type Match = { id: string; league_id: string; player_a_id: string; player_b_id: string; player_a_legs: number; player_b_legs: number; player_a_average: number; player_b_average: number; submitted_by: string; status: 'PENDING' | 'CONFIRMED' | 'DISPUTED'; confirmed_by: string | null; dispute_note: string | null; created_at: string; updated_at: string; confirmed_at: string | null; deleted_at: string | null };
type Fixture = { id: string; season_id: string; league_id: string; status: 'OUTSTANDING' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED' | 'VOID' };
type Movement = { id: string; from_season_id: string; to_season_id: string; user_id: string; from_league_id: string; to_league_id: string; from_position: number; kind: 'PROMOTED' | 'RELEGATED' | 'MANUAL'; status: 'PROPOSED' | 'APPROVED' | 'APPLIED'; reason: string | null; decided_by: string | null; created_at: string; updated_at: string };

class MemoryD1 {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();
  memberships = new Map<string, Membership>();
  matches = new Map<string, Match>();
  fixtures = new Map<string, Fixture>();
  movements = new Map<string, Movement>();
  audits: Array<{ action: string; entityId: string | null; after: unknown }> = [];

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      run: async () => this.run(sql, []),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO sessions')) {
      const [token_hash, user_id, created_at, expires_at] = values as string[];
      this.sessions.set(token_hash, { token_hash, user_id, created_at, expires_at });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes('INSERT INTO season_movements')) {
      const [id, fromSeasonId, toSeasonId, userId, fromLeagueId, toLeagueId, fromPosition, kind, createdAt, updatedAt] = values as [string, string, string, string, string, string, number, Movement['kind'], string, string];
      const existing = [...this.movements.values()].find((row) => row.from_season_id === fromSeasonId && row.user_id === userId);
      if (existing?.status === 'APPLIED') return { success: true, meta: { changes: 0 } };
      const row: Movement = {
        id: existing?.id ?? id,
        from_season_id: fromSeasonId,
        to_season_id: toSeasonId,
        user_id: userId,
        from_league_id: fromLeagueId,
        to_league_id: toLeagueId,
        from_position: fromPosition,
        kind,
        status: 'PROPOSED',
        reason: existing?.reason ?? null,
        decided_by: existing?.decided_by ?? null,
        created_at: existing?.created_at ?? createdAt,
        updated_at: updatedAt,
      };
      this.movements.set(row.id, row);
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes('UPDATE season_movements') && sql.includes("kind = 'MANUAL'")) {
      const [toLeagueId, reason, decidedBy, updatedAt, fromSeasonId, userId] = values as string[];
      const row = [...this.movements.values()].find((entry) => entry.from_season_id === fromSeasonId && entry.user_id === userId);
      if (!row || row.status === 'APPLIED') return { success: true, meta: { changes: 0 } };
      row.to_league_id = toLeagueId;
      row.kind = 'MANUAL';
      row.reason = reason;
      row.decided_by = decidedBy;
      row.updated_at = updatedAt;
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes('INSERT INTO league_players')) {
      const [leagueId, userId, joinedAt, seasonId] = values as string[];
      const existingInSeason = [...this.memberships.values()].find((row) => row.season_id === seasonId && row.user_id === userId && row.active === 1);
      if (existingInSeason && existingInSeason.league_id !== leagueId) throw new Error('UNIQUE constraint failed: league_players.season_id, league_players.user_id');
      const key = `${leagueId}:${userId}`;
      this.memberships.set(key, { league_id: leagueId, user_id: userId, active: 1, joined_at: this.memberships.get(key)?.joined_at ?? joinedAt, season_id: seasonId });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes('UPDATE season_movements') && sql.includes("status = 'APPLIED'")) {
      const [decidedBy, updatedAt, fromSeasonId, toSeasonId] = values as string[];
      let changes = 0;
      for (const row of this.movements.values()) {
        if (row.from_season_id === fromSeasonId && row.to_season_id === toSeasonId && row.status !== 'APPLIED') {
          row.status = 'APPLIED';
          row.decided_by = decidedBy;
          row.updated_at = updatedAt;
          changes += 1;
        }
      }
      return { success: true, meta: { changes } };
    }

    if (sql.includes('INSERT INTO audit_log')) {
      const action = /VALUES \(\?, '([^']+)'/.exec(sql)?.[1] ?? 'UNKNOWN';
      const entityId = values.length > 1 ? String(values[1]) : null;
      const afterRaw = values.find((value, index) => index >= 2 && typeof value === 'string' && (String(value).startsWith('{') || String(value).startsWith('[')));
      this.audits.push({ action, entityId, after: afterRaw ? JSON.parse(String(afterRaw)) : null });
      return { success: true, meta: { changes: 1 } };
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

    if (sql.includes('FROM seasons') && sql.includes('WHERE id = ?')) return (this.seasons.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues WHERE id = ?')) return (this.leagues.get(String(values[0])) ?? null) as T;

    if (sql.includes('COUNT(*) AS count') && sql.includes('FROM fixtures') && sql.includes('season_id = ?')) {
      const seasonId = String(values[0]);
      const count = [...this.fixtures.values()].filter((row) => row.season_id === seasonId && ['OUTSTANDING', 'PENDING_CONFIRMATION', 'DISPUTED'].includes(row.status)).length;
      return { count } as T;
    }

    if (sql.includes('COUNT(*) AS count') && sql.includes('FROM matches') && sql.includes('leagues.season_id')) {
      const seasonId = String(values[0]);
      const leagueIds = new Set([...this.leagues.values()].filter((row) => row.season_id === seasonId).map((row) => row.id));
      const count = [...this.matches.values()].filter((row) => leagueIds.has(row.league_id) && row.deleted_at === null && row.status !== 'CONFIRMED').length;
      return { count } as T;
    }

    if (sql.includes('FROM season_movements') && sql.includes('from_season_id = ?') && sql.includes('user_id = ?')) {
      return ([...this.movements.values()].find((row) => row.from_season_id === String(values[0]) && row.user_id === String(values[1])) ?? null) as T;
    }

    if (sql.includes('FROM league_players') && sql.includes('season_id = ?') && sql.includes('user_id = ?') && sql.includes('active = 1')) {
      return ([...this.memberships.values()].find((row) => row.season_id === String(values[0]) && row.user_id === String(values[1]) && row.active === 1) ?? null) as T;
    }

    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues WHERE season_id = ?')) {
      const rows = [...this.leagues.values()].filter((row) => row.season_id === String(values[0])).sort((a, b) => a.hierarchy_position - b.hierarchy_position);
      return { results: rows as T[] };
    }

    if (sql.includes('FROM league_players JOIN users') && sql.includes('league_players.league_id = ?')) {
      const leagueId = String(values[0]);
      const rows = [...this.memberships.values()].filter((row) => row.league_id === leagueId).map((row) => ({ ...row, username: this.users.get(row.user_id)?.username ?? null, profile_image_url: null }));
      return { results: rows as T[] };
    }

    if (sql.includes('FROM matches') && sql.includes("matches.status = 'CONFIRMED'")) {
      const leagueId = String(values[0]);
      const rows = [...this.matches.values()].filter((row) => row.league_id === leagueId && row.deleted_at === null && row.status === 'CONFIRMED').map((row) => ({ ...row, player_a_username: this.users.get(row.player_a_id)?.username ?? null, player_b_username: this.users.get(row.player_b_id)?.username ?? null }));
      return { results: rows as T[] };
    }

    if (sql.includes('FROM league_players lp') && sql.includes('JOIN leagues l') && sql.includes('lp.season_id = ?')) {
      const seasonId = String(values[0]);
      const rows = [...this.memberships.values()].filter((row) => row.season_id === seasonId && row.active === 1).map((row) => ({ ...row, hierarchy_position: this.leagues.get(row.league_id)?.hierarchy_position ?? 0 }));
      return { results: rows as T[] };
    }

    if (sql.includes('FROM season_movements') && sql.includes('from_season_id = ?')) {
      const fromSeasonId = String(values[0]);
      const toSeasonId = values[1] === undefined ? undefined : String(values[1]);
      const rows = [...this.movements.values()].filter((row) => row.from_season_id === fromSeasonId && (toSeasonId === undefined || row.to_season_id === toSeasonId));
      return { results: rows as T[] };
    }

    if (sql.includes('FROM league_players') && sql.includes('season_id = ?') && sql.includes('active = 1')) {
      const rows = [...this.memberships.values()].filter((row) => row.season_id === String(values[0]) && row.active === 1);
      return { results: rows as T[] };
    }

    return { results: [] };
  }
}

const now = new Date('2026-08-21T17:30:00.000Z');

function addLeague(db: MemoryD1, seasonId: string, id: string, hierarchyPosition: number, maxPlayers = 8) {
  const season = db.seasons.get(seasonId)!;
  db.leagues.set(id, {
    id,
    season_id: seasonId,
    name: hierarchyPosition === 1 ? 'Premier' : `Division ${hierarchyPosition - 1}`,
    slug: `${seasonId}-${id}`,
    season_name: season.name,
    status: season.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    points_per_win: 2,
    target_legs: 3,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    created_by: 'admin',
    max_players: maxPlayers,
    matches_per_pair: 1,
    visibility: 'PRIVATE',
    hierarchy_position: hierarchyPosition,
    promotion_places: 1,
    relegation_places: 1,
  });
}

function addPlayer(db: MemoryD1, leagueId: string, seasonId: string, userId: string) {
  db.users.set(userId, { id: userId, username: userId.toUpperCase(), role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 0 });
  db.memberships.set(`${leagueId}:${userId}`, { league_id: leagueId, season_id: seasonId, user_id: userId, active: 1, joined_at: now.toISOString() });
}

function addClearTable(db: MemoryD1, leagueId: string, prefix: string) {
  const players = [`${prefix}1`, `${prefix}2`, `${prefix}3`];
  for (const id of players) addPlayer(db, leagueId, 's1', id);
  const results: Array<[string, string, number, number]> = [[players[0], players[1], 3, 0], [players[0], players[2], 3, 0], [players[1], players[2], 3, 0]];
  results.forEach(([a, b, aLegs, bLegs], index) => {
    const id = `${leagueId}-m${index + 1}`;
    db.matches.set(id, { id, league_id: leagueId, player_a_id: a, player_b_id: b, player_a_legs: aLegs, player_b_legs: bLegs, player_a_average: 60 - index, player_b_average: 50 - index, submitted_by: a, status: 'CONFIRMED', confirmed_by: b, dispute_note: null, created_at: now.toISOString(), updated_at: now.toISOString(), confirmed_at: now.toISOString(), deleted_at: null });
  });
}

function setup() {
  const db = new MemoryD1();
  db.users.set('admin', { id: 'admin', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED', is_master_admin: 1 });
  db.seasons.set('s1', { id: 's1', name: '2026/27', status: 'CLOSED', is_current: 1, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: now.toISOString() });
  db.seasons.set('s2', { id: 's2', name: '2027/28', status: 'DRAFT', is_current: 0, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: null });
  for (let position = 1; position <= 3; position += 1) {
    addLeague(db, 's1', `l${position}`, position);
    addLeague(db, 's2', `n${position}`, position);
  }
  addClearTable(db, 'l1', 'p');
  addClearTable(db, 'l2', 'd');
  addClearTable(db, 'l3', 'b');
  const env = { DB: db as never, ASSETS: {} as never, APP_ORIGIN: 'https://misfits.test' };
  return { db, env, routes: createCompetitionRoutes({ now: () => now }) };
}

async function cookieFor(db: MemoryD1) {
  const session = await issueSession(db as never, 'admin', now);
  return `misfits_session=${session.token}`;
}

function mutation(cookie: string, body?: unknown, method = 'POST') {
  return {
    method,
    headers: { Cookie: cookie, Origin: 'https://misfits.test', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

async function createProposal(db: MemoryD1, env: ReturnType<typeof setup>['env'], routes: ReturnType<typeof createCompetitionRoutes>, cookie: string) {
  return routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/proposal', mutation(cookie, { toSeasonId: 's2' })), env, {} as never);
}

describe('promotion, relegation and next-season placement', () => {
  it('projects only valid adjacent movements and gives the top/bottom divisions safe edges', async () => {
    const { db, env, routes } = setup();
    const cookie = await cookieFor(db);
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/preview', { headers: { Cookie: cookie } }), env, {} as never);
    expect(response.status).toBe(200);
    const payload = await response.json() as { preview: { provisional: boolean; ambiguities: unknown[]; movements: Movement[] } };
    expect(payload.preview.provisional).toBe(false);
    expect(payload.preview.ambiguities).toEqual([]);
    expect(payload.preview.movements.map((row) => [row.user_id ?? (row as unknown as { userId: string }).userId, row.from_league_id ?? (row as unknown as { fromLeagueId: string }).fromLeagueId, row.to_league_id ?? (row as unknown as { toLeagueId: string }).toLeagueId, row.kind]).sort()).toEqual([
      ['b1', 'l3', 'l2', 'PROMOTED'],
      ['d1', 'l2', 'l1', 'PROMOTED'],
      ['d3', 'l2', 'l3', 'RELEGATED'],
      ['p3', 'l1', 'l2', 'RELEGATED'],
    ].sort());
  });

  it('blocks final proposal when a movement boundary is unresolved by the competitive tie-break metrics', async () => {
    const { db, env, routes } = setup();
    for (const [id, match] of [...db.matches.entries()]) if (match.league_id === 'l2') db.matches.delete(id);
    const cookie = await cookieFor(db);
    const response = await createProposal(db, env, routes, cookie);
    expect(response.status).toBe(409);
    const body = await response.json() as { error: { message: string } };
    expect(body.error.message).toMatch(/tie/i);
    expect(db.movements.size).toBe(0);
  });

  it('blocks final proposal while the closed season still has unresolved fixture or result state', async () => {
    const { db, env, routes } = setup();
    db.fixtures.set('fx1', { id: 'fx1', season_id: 's1', league_id: 'l1', status: 'DISPUTED' });
    const cookie = await cookieFor(db);
    const response = await createProposal(db, env, routes, cookie);
    expect(response.status).toBe(409);
    expect((await response.json() as { error: { message: string } }).error.message).toMatch(/unresolved/i);
    expect(db.movements.size).toBe(0);
  });

  it('allows an audited explicit override before application', async () => {
    const { db, env, routes } = setup();
    const cookie = await cookieFor(db);
    expect((await createProposal(db, env, routes, cookie)).status).toBe(201);
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/d1', mutation(cookie, { toLeagueId: 'n2', reason: 'Keep in Division 1 after committee review' }, 'PATCH')), env, {} as never);
    expect(response.status).toBe(200);
    const row = (await response.json() as { movement: Movement }).movement;
    expect(row.to_league_id).toBe('n2');
    expect(row.kind).toBe('MANUAL');
    expect(row.reason).toMatch(/committee review/i);
    expect(db.audits.some((entry) => entry.action === 'PROMOTION_OVERRIDE')).toBe(true);
  });

  it('applies every source competitor exactly once, respects overrides, and is idempotent', async () => {
    const { db, env, routes } = setup();
    const cookie = await cookieFor(db);
    expect((await createProposal(db, env, routes, cookie)).status).toBe(201);
    const overridden = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/d1', mutation(cookie, { toLeagueId: 'n2', reason: 'Hold for one season' }, 'PATCH')), env, {} as never);
    expect(overridden.status).toBe(200);

    const first = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/apply', mutation(cookie, { toSeasonId: 's2' })), env, {} as never);
    expect(first.status).toBe(200);
    const firstPayload = await first.json() as { placements: Array<{ userId: string; leagueId: string }> };
    expect(firstPayload.placements).toHaveLength(9);
    expect(new Set(firstPayload.placements.map((row) => row.userId)).size).toBe(9);
    expect(firstPayload.placements.find((row) => row.userId === 'd1')?.leagueId).toBe('n2');
    expect(firstPayload.placements.find((row) => row.userId === 'p3')?.leagueId).toBe('n2');
    expect(firstPayload.placements.find((row) => row.userId === 'b1')?.leagueId).toBe('n2');

    const sourceBefore = [...db.memberships.values()].filter((row) => row.season_id === 's1').map((row) => `${row.league_id}:${row.user_id}:${row.active}`).sort();
    const second = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/apply', mutation(cookie, { toSeasonId: 's2' })), env, {} as never);
    expect(second.status).toBe(200);
    const secondPayload = await second.json() as { placements: Array<{ userId: string; leagueId: string }> };
    expect(secondPayload.placements).toEqual(firstPayload.placements);
    expect([...db.memberships.values()].filter((row) => row.season_id === 's2' && row.active === 1)).toHaveLength(9);
    expect([...db.memberships.values()].filter((row) => row.season_id === 's1').map((row) => `${row.league_id}:${row.user_id}:${row.active}`).sort()).toEqual(sourceBefore);
    expect([...db.movements.values()].every((row) => row.status === 'APPLIED')).toBe(true);
  });

  it('revalidates target capacity rather than partially applying a rollover', async () => {
    const { db, env, routes } = setup();
    db.leagues.get('n2')!.max_players = 1;
    const cookie = await cookieFor(db);
    expect((await createProposal(db, env, routes, cookie)).status).toBe(201);
    const response = await routes.fetch(new Request('https://misfits.test/api/admin/seasons/s1/promotion/apply', mutation(cookie, { toSeasonId: 's2' })), env, {} as never);
    expect(response.status).toBe(409);
    expect((await response.json() as { error: { message: string } }).error.message).toMatch(/capacity/i);
    expect([...db.memberships.values()].filter((row) => row.season_id === 's2')).toHaveLength(0);
    expect([...db.movements.values()].every((row) => row.status === 'PROPOSED')).toBe(true);
  });
});