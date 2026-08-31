import { describe, expect, it } from 'vitest';
import { submitFixtureResult } from '../../src/server/db/fixture-results';

type League = {
  id: string;
  name: string;
  slug: string;
  season_name: string;
  season_id: string;
  status: 'OPEN';
  max_legs: number;
  target_legs: number;
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  max_players: number;
  matches_per_pair: number;
  visibility: 'PRIVATE';
  hierarchy_position: number;
  promotion_places: number;
  relegation_places: number;
  created_at: string;
  updated_at: string;
  created_by: string;
};

type Fixture = {
  id: string;
  season_id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  pair_key: string;
  round: number;
  meeting_number: number;
  status: 'OUTSTANDING' | 'PENDING_CONFIRMATION';
  created_at: string;
  updated_at: string;
  voided_at: string | null;
};

type Match = {
  id: string;
  fixture_id: string;
  league_id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_legs: number;
  player_b_legs: number;
  player_a_average: number;
  player_b_average: number;
  submitted_by: string;
  status: 'PENDING';
  confirmed_by: null;
  dispute_note: null;
  created_at: string;
  updated_at: string;
  confirmed_at: null;
  deleted_at: null;
};

class MemoryD1 {
  league: League;
  fixture: Fixture;
  matches = new Map<string, Match>();

  constructor() {
    const at = '2026-08-22T06:05:00.000Z';
    this.league = {
      id: 'l1', name: 'Premier', slug: 'premier', season_name: '2026/27', season_id: 's1', status: 'OPEN',
      max_legs: 6, target_legs: 4, points_per_win: 3, points_per_draw: 1, points_per_loss: 0,
      max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 0, relegation_places: 0,
      created_at: at, updated_at: at, created_by: 'admin',
    };
    this.fixture = {
      id: 'f1', season_id: 's1', league_id: 'l1', player_a_id: 'a', player_b_id: 'b', pair_key: 'a:b',
      round: 1, meeting_number: 1, status: 'OUTSTANDING', created_at: at, updated_at: at, voided_at: null,
    };
  }

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO matches') && sql.includes('fixture_id')) {
      const [id, fixtureId, leagueId, playerAId, playerBId, aLegs, bLegs, aAverage, bAverage, submittedBy, createdAt, updatedAt] = values as [string, string, string, string, string, number, number, number, number, string, string, string];
      this.matches.set(id, {
        id, fixture_id: fixtureId, league_id: leagueId, player_a_id: playerAId, player_b_id: playerBId,
        player_a_legs: aLegs, player_b_legs: bLegs, player_a_average: aAverage, player_b_average: bAverage,
        submitted_by: submittedBy, status: 'PENDING', confirmed_by: null, dispute_note: null,
        created_at: createdAt, updated_at: updatedAt, confirmed_at: null, deleted_at: null,
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE fixtures SET status = 'PENDING_CONFIRMATION'")) {
      this.fixture.status = 'PENDING_CONFIRMATION';
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM leagues WHERE id = ?')) return this.league as T;
    if (sql.includes('FROM fixtures f') && sql.includes('WHERE f.id = ?')) {
      const activeResult = [...this.matches.values()].find((match) => match.fixture_id === this.fixture.id);
      return { ...this.fixture, player_a_username: 'A', player_b_username: 'B', result_id: activeResult?.id ?? null } as T;
    }
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      return { league_id: 'l1', season_id: 's1', user_id: String(values[1]), active: 1, joined_at: this.fixture.created_at, username: String(values[1]).toUpperCase(), profile_image_url: null } as T;
    }
    if (sql.includes('FROM matches') && sql.includes('WHERE matches.id = ?')) {
      const match = this.matches.get(String(values[0]));
      return match ? { ...match, player_a_username: 'A', player_b_username: 'B' } as T : null;
    }
    return null;
  }

  private async all<T>(): Promise<{ results: T[] }> {
    return { results: [] };
  }
}

const now = new Date('2026-08-22T06:05:00.000Z');

function input(playerALegs: number, playerBLegs: number) {
  return { fixtureId: 'f1', playerALegs, playerBLegs, playerAAverage: 51.2, playerBAverage: 48.7 };
}

describe('fixture result Best-of rules', () => {
  it('accepts the exhausted 3-3 draw in Best of 6', async () => {
    const db = new MemoryD1();
    const result = await submitFixtureResult(db as never, 'a', 'l1', input(3, 3), now);
    expect(result).toMatchObject({ player_a_legs: 3, player_b_legs: 3, status: 'PENDING' });
  });

  it.each([[3, 2], [4, 3]])('rejects incomplete or impossible Best of 6 score %i-%i', async (a, b) => {
    const db = new MemoryD1();
    await expect(submitFixtureResult(db as never, 'a', 'l1', input(a, b), now)).rejects.toMatchObject({ status: 400 });
    expect(db.matches.size).toBe(0);
  });
});