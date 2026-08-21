import { describe, expect, it } from 'vitest';
import { hashInviteToken, joinLeagueByInvite } from '../../src/server/db/invites';

const now = new Date('2026-08-21T16:20:00.000Z');
type Membership = { league_id: string; season_id: string | null; user_id: string; active: number; joined_at: string };

class MemoryD1 {
  invites = new Map<string, { id: string; league_id: string; token_hash: string; created_by: string; expires_at: string | null; uses: number; revoked_at: string | null; created_at: string }>();
  leagues = new Map<string, Record<string, unknown>>();
  users = new Map<string, Record<string, unknown>>();
  memberships = new Map<string, Membership>();

  prepare(sql: string) {
    return { bind: (...values: unknown[]) => ({ run: async () => this.run(sql, values), first: async <T>() => this.first<T>(sql, values), all: async <T>() => this.all<T>(sql, values) }) };
  }
  private key(leagueId: string, userId: string) { return `${leagueId}:${userId}`; }
  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT OR IGNORE INTO league_players') && sql.includes('season_id')) {
      const [leagueId, userId, joinedAt, seasonId] = values as [string, string, string, string];
      this.memberships.set(this.key(leagueId, userId), { league_id: leagueId, season_id: seasonId, user_id: userId, active: 1, joined_at: joinedAt });
    } else if (sql.includes('UPDATE league_invites SET uses')) {
      const invite = this.invites.get(String(values[0])); if (invite) invite.uses += 1;
    }
    return { success: true, meta: { changes: 1 } };
  }
  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM league_invites WHERE token_hash')) return ([...this.invites.values()].find((invite) => invite.token_hash === String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues WHERE id')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM users WHERE id')) return (this.users.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const membership = this.memberships.get(this.key(String(values[0]), String(values[1])));
      const user = membership && this.users.get(membership.user_id);
      return membership ? ({ ...membership, username: user?.username ?? null, profile_image_url: null } as T) : null;
    }
    if (sql.includes('SELECT league_id FROM league_players WHERE season_id')) {
      const [seasonId, userId] = values as string[];
      return ([...this.memberships.values()].find((row) => row.season_id === seasonId && row.user_id === userId && row.active === 1) ?? null) as T;
    }
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) {
      const leagueId = String(values[0]);
      return { count: [...this.memberships.values()].filter((row) => row.league_id === leagueId && row.active === 1).length } as T;
    }
    return null;
  }
  private async all<T>(): Promise<{ results: T[] }> { return { results: [] }; }
}

async function setup() {
  const db = new MemoryD1();
  db.users.set('p1', { id: 'p1', username: 'Player', status: 'ACTIVE' });
  for (const [id, position] of [['l1', 1], ['l2', 2]] as const) db.leagues.set(id, { id, season_id: 's1', name: id, slug: id, season_name: '2026/27', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin', max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: position, promotion_places: 0, relegation_places: 0 });
  const token = 'join-me';
  const hash = await hashInviteToken(token);
  db.invites.set('invite', { id: 'invite', league_id: 'l2', token_hash: hash, created_by: 'admin', expires_at: null, uses: 0, revoked_at: null, created_at: now.toISOString() });
  return { db, token };
}

describe('season-aware invitations', () => {
  it('does not let an invite create a second active league placement in the same season', async () => {
    const { db, token } = await setup();
    db.memberships.set('l1:p1', { league_id: 'l1', season_id: 's1', user_id: 'p1', active: 1, joined_at: now.toISOString() });
    await expect(joinLeagueByInvite(db as never, 'p1', token, now)).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 409 });
    expect(db.memberships.has('l2:p1')).toBe(false);
  });

  it('writes the season mapping when a player joins the target league', async () => {
    const { db, token } = await setup();
    await joinLeagueByInvite(db as never, 'p1', token, now);
    expect(db.memberships.get('l2:p1')).toMatchObject({ league_id: 'l2', season_id: 's1', user_id: 'p1', active: 1 });
    expect(db.invites.get('invite')?.uses).toBe(1);
  });
});
