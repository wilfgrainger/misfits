import { describe, expect, it } from 'vitest';
import { setMembershipActive } from '../../src/server/db/leagues';

type Membership = { league_id: string; season_id: string | null; user_id: string; active: number; joined_at: string; username: string | null; profile_image_url: string | null };

type League = {
  id: string; name: string; slug: string; season_name: string; status: 'OPEN' | 'CLOSED'; points_per_win: number; target_legs: number;
  created_at: string; updated_at: string; created_by: string | null; max_players: number; matches_per_pair: number; visibility: 'PUBLIC' | 'PRIVATE';
};

class MembershipD1 {
  memberships = new Map<string, Membership>();
  leagues = new Map<string, League>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => this.first<T>(sql, values),
        run: async () => this.run(sql, values),
      }),
    };
  }

  private key(leagueId: string, userId: string) { return `${leagueId}:${userId}`; }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM league_players JOIN users')) {
      return (this.memberships.get(this.key(String(values[0]), String(values[1]))) ?? null) as T;
    }
    if (sql.includes('FROM leagues WHERE id')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('SELECT league_id FROM league_players WHERE season_id')) {
      const [seasonId, userId] = values as string[];
      return ([...this.memberships.values()].find((row) => row.season_id === seasonId && row.user_id === userId && row.active === 1) ?? null) as T;
    }
    return null;
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('UPDATE league_players SET active = 1')) {
      const [leagueId, userId] = values as string[];
      const row = this.memberships.get(this.key(leagueId, userId));
      if (row) row.active = 1;
    }
    return { success: true, meta: { changes: 1 } };
  }
}

function league(id: string): League {
  return {
    id, name: id, slug: id, season_name: '2026/27', status: 'OPEN', points_per_win: 2, target_legs: 3,
    created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', created_by: 'admin',
    max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE',
  };
}

describe('ADM-034 / ADM-038 membership reactivation invariant', () => {
  it('refuses to reactivate an old league membership when the player already has another active league in that season', async () => {
    const db = new MembershipD1();
    db.leagues.set('l1', league('l1'));
    db.memberships.set('l1:u1', { league_id: 'l1', season_id: 's1', user_id: 'u1', active: 0, joined_at: '2026-08-01T00:00:00.000Z', username: 'Alpha', profile_image_url: null });
    db.memberships.set('l2:u1', { league_id: 'l2', season_id: 's1', user_id: 'u1', active: 1, joined_at: '2026-08-02T00:00:00.000Z', username: 'Alpha', profile_image_url: null });

    await expect(setMembershipActive(db as never, 'admin', 'l1', 'u1', true, new Date('2026-08-21T20:45:00.000Z')))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 409 });
    expect(db.memberships.get('l1:u1')?.active).toBe(0);
    expect(db.memberships.get('l2:u1')?.active).toBe(1);
  });
});
